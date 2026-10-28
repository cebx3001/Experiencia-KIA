// KIA TASMAN — first-stage selector.
// The real GLB is intentionally loaded only when assets/kia-tasman.glb is available.
const levels = [
  { id:"rocks", name:"ROCK CHALLENGE", title:"ROCK<br>CHALLENGE", desc:"Supera las rocas en modo Rock y desciende con la asistencia X-TREK.", tech:"ROCK MODE · X-TREK", cls:"scene-rocks" },
  { id:"flood", name:"WATER CROSSING", title:"WATER<br>CROSSING", desc:"Cruza un arroyo y descubre la capacidad de vadeo de la Tasman.", tech:"CAPACIDAD DE VADEO · HASTA 800 MM", cls:"scene-flood" },
  { id:"mud", name:"SAND CHALLENGE", title:"SAND<br>CHALLENGE", desc:"Sube y baja dunas mostrando la tracción 4×4 en arena.", tech:"SAND MODE · TRACCIÓN 4×4", cls:"scene-mud" },
  { id:"descent", name:"STORM CHALLENGE", title:"STORM<br>CHALLENGE", desc:"Avanza bajo una tormenta sobre una carretera mojada.", tech:"4A · TRACCIÓN AUTOMÁTICA 4×4", cls:"scene-descent" }
];
// Exterior colors from Kia's official Tasman color catalog; market stock can vary.
const colors = {
 arena:{label:"ARENA",rgb:[.64,.55,.40]},
 blanco:{label:"SNOW WHITE PEARL (SWP)",rgb:[.93,.92,.90]},
 gris:{label:"INTERSTELLAR GRAY (AGT)",rgb:[.28,.32,.34]},
 negro:{label:"AURORA BLACK PEARL (ABP)",rgb:[.035,.045,.055]}
};
const $ = id => document.getElementById(id);
function showModelStatus(message){
 const status=$("modelLoading");if(status){status.hidden=false;status.textContent=message;}
}
function hideModelStatus(){const status=$("modelLoading");if(status)status.hidden=true;}
const state = { mode:"vehicle", level:0, color:"arena", angle:35, ready:false, model:null, app:null, camera:null, pivot:null, radius:8, target:null, dragging:false, pointerX:0, angleDrag:35, materials:new Map() };
const modalInfo={
  rock:{title:"MODO ROCA",body:"El Modo Roca optimiza la tracción en superficies rocosas. En la Tasman X-Pro se selecciona con 4WD 4L."},
  camera:{title:"MONITOR DE VISTA DEL TERRENO",body:"El monitor ayuda a visualizar el área del terreno situada directamente delante del vehículo."},
  wading:{title:"CAPACIDAD DE VADEO",body:"Kia Ecuador comunica una capacidad de vadeo de hasta 800 mm a 7 km/h, bajo las condiciones indicadas por el fabricante."},
  general:{title:"KIA TASMAN 2026",body:"Descubre el diseño y las tecnologías de la Kia Tasman, desde su sistema de conducción todoterreno hasta las capacidades de vadeo y tracción. Las funciones varían según la versión."}
};
function openDialog(id,title,body) {
 const modal=$(id);
 if(id==="infoModal"){$("modalTitle").textContent=title;$("modalBody").textContent=body;}
 if(id==="missionModal")$("missionModalTitle").textContent=title;
 modal.hidden=false;
}
function closeDialog(id){$(id).hidden=true;}
function setMode(mode){
 state.mode=mode;const mission=mode==="mission";
 $("vehicleCopy").hidden=mission;$("missionCopy").hidden=!mission;
 $("missionSelector").hidden=!mission;
 $("sectionIndex").textContent=mission?"02 / PRUEBAS":"01 / VEHÍCULO";
 $("stepName").textContent=mission?"SELECCIONA TU MISIÓN":"EXPLORA EL VEHÍCULO";
 $("primaryLabel").textContent=mission?"START / INICIAR PRUEBA":"EXPLORAR PRUEBAS";
 $("secondaryButton").textContent=mission?"VOLVER AL VEHÍCULO":"VER CARACTERÍSTICAS +";
 document.querySelector(".frame-index").innerHTML=mission?'02 <em>/</em> 02':'01 <em>/</em> 02';
 if(mission)renderLevel();else { const root=$("experience"); levels.forEach(l=>root.classList.remove(l.cls)); root.classList.add("scene-rocks"); }
}
function renderLevel(){
 const item=levels[state.level];
 const experience=$("experience");
 for(const l of levels)experience.classList.remove(l.cls);
 experience.classList.add(item.cls);
 $("missionNumber").textContent="MISIÓN "+String(state.level+1).padStart(2,"0")+" / 04";
 $("missionTitle").innerHTML=item.title;
 $("missionDesc").textContent=item.desc;
 $("missionTech").textContent=item.tech;
 $("selectorName").textContent=String(state.level+1).padStart(2,"0")+" — "+item.name;
 const dots=$("selectorDots"); dots.replaceChildren();
 levels.forEach((l,i)=>{const btn=document.createElement("button");btn.className="selector-dot"+(i===state.level?" is-active":"");btn.setAttribute("aria-label","Ir a misión "+(i+1));btn.addEventListener("click",()=>setLevel(i));dots.appendChild(btn);});
 // Color exploration does not alter the predefined sand-color cinematic videos.
}
function setLevel(index){state.level=(index+levels.length)%levels.length;renderLevel();}
$("primaryButton").addEventListener("click",()=>state.mode==="vehicle"?setMode("mission"):openDialog("missionModal",levels[state.level].name));
$("secondaryButton").addEventListener("click",()=>{
 if(state.mode==="mission")setMode("vehicle");
 else openDialog("infoModal",modalInfo.general.title,modalInfo.general.body);
});
$("prevMission").addEventListener("click",()=>setLevel(state.level-1));
$("nextMission").addEventListener("click",()=>setLevel(state.level+1));
$("modalClose").addEventListener("click",()=>closeDialog("infoModal"));
$("missionModalClose").addEventListener("click",()=>closeDialog("missionModal"));
for(const id of ["infoModal","missionModal"]){$(id).addEventListener("click",e=>{if(e.target===$(id))closeDialog(id);});}
document.addEventListener("keydown",e=>{
 if(e.key==="Escape"){closeDialog("infoModal");closeDialog("missionModal");}
 if(state.mode==="mission"){if(e.key==="ArrowLeft")setLevel(state.level-1);if(e.key==="ArrowRight")setLevel(state.level+1);}
});
// Object-linked hotspots are installed after the actual GLB and semantic manifest load.
document.querySelectorAll(".color-chip").forEach(b=>b.addEventListener("click",()=>{
 state.color=b.dataset.color;
 document.querySelectorAll(".color-chip").forEach(el=>el.classList.toggle("active",el===b));
 $("colorName").textContent=colors[state.color].label;
 recolorModel();
}));
document.querySelectorAll("#cameraButtons button").forEach(b=>b.addEventListener("click",()=>{
 state.angle=Number(b.dataset.angle);document.querySelectorAll("#cameraButtons button").forEach(el=>el.classList.toggle("selected",el===b));
 moveCamera();
}));

async function initVehicle(){
 const url="./assets/kia-tasman-mobile.glb";
 const manifestUrl="./assets/kia-tasman-components.json";
 // The page works as a menu before the model is uploaded; do not fetch PlayCanvas unnecessarily.
 try{
   const res=await fetch(url,{method:"HEAD",cache:"no-store"});
   if(!res.ok)throw new Error("GLB no disponible: HTTP "+res.status);
 }catch(e){console.warn("No se encontró la Kia Tasman 3D",e);window.__kiaViewerStatus={error:String(e)};hideModelStatus();return;}
 let pc;
 try{
  showModelStatus("INICIANDO VISUALIZADOR 3D");
  pc=await import("https://cdn.jsdelivr.net/npm/playcanvas@2.23.1/build/playcanvas.mjs");
  pc.WasmModule.setConfig("DracoDecoderModule",{
    glueUrl:"https://developer.playcanvas.com/assets/modules/draco/draco.wasm.js",
    wasmUrl:"https://developer.playcanvas.com/assets/modules/draco/draco.wasm.wasm"
  });
  showModelStatus("PREPARANDO VEHÍCULO 3D");
  await Promise.race([
    new Promise((resolve,reject)=>pc.WasmModule.getInstance("DracoDecoderModule",(mod)=>mod?resolve():reject(new Error("Draco decoder unavailable")))),
    new Promise((_,reject)=>setTimeout(()=>reject(new Error("Draco decoder timeout")),25000))
  ]);
}
 catch(e){console.warn("PlayCanvas could not load",e);window.__kiaViewerStatus={error:String(e)};hideModelStatus();return;}
 showModelStatus("CARGANDO KIA TASMAN 3D · 6 MB");
 const canvas=$("carCanvas");
 let app;
 try{
   // WebGL initialization must not occur on an element with display:none.
   canvas.hidden=false;
   canvas.style.visibility="hidden";
   app=new pc.Application(canvas,{graphicsDeviceOptions:{alpha:true,antialias:true,powerPreference:"high-performance"}});
   app.start();
   app.setCanvasFillMode(pc.FILLMODE_NONE);
   app.setCanvasResolution(pc.RESOLUTION_AUTO);
   state.app=app;
   const camera=new pc.Entity("TasmanCamera");
   camera.addComponent("camera",{clearColor:new pc.Color(0,0,0,0),fov:42,nearClip:.05,farClip:500});
   app.root.addChild(camera);state.camera=camera;
   const sun=new pc.Entity("KeyLight");sun.addComponent("light",{type:"directional",color:new pc.Color(1,.94,.87),intensity:2.3,castShadows:true,shadowResolution:1024});
   sun.setEulerAngles(30,135,0);app.root.addChild(sun);
   const fill=new pc.Entity("FillLight");fill.addComponent("light",{type:"directional",color:new pc.Color(.64,.79,1),intensity:1.4});fill.setEulerAngles(-25,-50,0);app.root.addChild(fill);
   app.scene.ambientLight=new pc.Color(.38,.42,.45);
   app.scene.exposure=1.05;
   camera.camera.gammaCorrection=pc.GAMMA_SRGB;
   camera.camera.toneMapping=pc.TONEMAP_ACES;
   app.assets.loadFromUrl(url,"container",(err,asset)=>{
     if(err||!asset){console.error("Could not load Kia GLB",err);hideModelStatus();window.__kiaViewerStatus={error:String(err||"GLB sin asset")};return;}
     let root;
     try{
       root=asset.resource.instantiateRenderEntity({castShadows:false});
       app.root.addChild(root);
     }catch(e){
       console.error("Kia GLB cannot instantiate",e);
       window.__kiaViewerStatus={error:String(e)};
       hideModelStatus();return;
     }
     const meshCount=root.findComponents("render").reduce((n,c)=>n+(c.meshInstances?.length||0),0);
     if(meshCount===0){
       console.error("Kia GLB: no renderable meshes");hideModelStatus();
       window.__kiaViewerStatus={error:"GLB sin mallas"};
       return;
     }
     state.model=root;
     // Semantic manifest: Y-up, meters, origin below midpoint between axles.
     state.target=new pc.Vec3(0,1.05,0);
     state.radius=8.1;
     doResize();
     moveCamera();
     state.ready=true;
     window.__kiaViewerStatus={loaded:true,meshCount,canvas:()=>[canvas.width,canvas.height],cameraTarget:[0,1.05,0],radius:8.1};
     requestAnimationFrame(()=>requestAnimationFrame(()=>{
       doResize();
       canvas.style.visibility="visible";
       
       hideModelStatus();
     }));
     installVehicleAnnotations(pc, app, root, canvas, manifestUrl);
     $("interactionHint").textContent="DESLIZA PARA GIRAR · TOCA + PARA EXPLORAR";
     recolorModel();
   });
   const doResize=()=>{
     if(!state.app)return;
     // Use unrotated landscape dimensions, not transformed screen dimensions.
     const stage=$("stage");
     const w=Math.max(32,Math.round(stage.clientWidth));
     const h=Math.max(32,Math.round(stage.clientHeight));
     if(canvas.width!==w||canvas.height!==h)app.resizeCanvas(w,h);
   };
   new ResizeObserver(doResize).observe($("stage"));
   window.addEventListener("resize",doResize);
   doResize();
   canvas.addEventListener("pointerdown",e=>{state.dragging=true;state.pointerX=e.clientX;canvas.setPointerCapture(e.pointerId)});
   canvas.addEventListener("pointermove",e=>{if(!state.dragging)return;const dx=e.clientX-state.pointerX;state.pointerX=e.clientX;state.angle+=dx*.4;moveCamera();});
   for(const ev of ["pointerup","pointercancel"])canvas.addEventListener(ev,()=>{state.dragging=false;});
 }catch(e){console.error("PlayCanvas scene init failed",e);canvas.hidden=true;hideModelStatus();window.__kiaViewerStatus={error:String(e)};}
}
function moveCamera(){
 if(!state.camera||!state.target)return;
 const a=state.angle*Math.PI/180;
 const r=state.radius;
 state.camera.setPosition(state.target.x+Math.sin(a)*r,state.target.y+r*.26,state.target.z+Math.cos(a)*r);
 state.camera.lookAt(state.target);
}
function recolorModel(){
 if(!state.model||!state.app)return;
 const pc=state.app;
 // Only recognized paint/body material names are colorized; glazing, tyres and chrome are preserved.
 const rgb=colors[state.color].rgb;
 state.model.findComponents("render").forEach(c=>(c.meshInstances||[]).forEach(mi=>{
   const mat=mi.material;
   const names=[];let node=mi.node;
   for(let i=0;node&&i<3;i++,node=node.parent)names.push(node.name||"");
   const name=((mat?.name||"")+" "+names.join(" ")).toLowerCase();
   // Recolor factory paint only, never glass, lighting, rubber, trim or the cabin.
   if(!/(paint|painted|bodypaint|bodywork|carroceria|carrocería|tan.beige|exterior.color|body.color|cabin_body|hood)/.test(name))return;
   if(/glass|window|windshield|tire|tyre|rubber|light|lamp|chrome|metal|trim|interior|seat|wheel|brake|grille|plastic|black/.test((mat?.name||"").toLowerCase()))return;
   if(!state.materials.has(mi)){
     const clone=mat.clone();mi.material=clone;state.materials.set(mi,clone);
   }
   const local=state.materials.get(mi);local.diffuse.set(rgb[0],rgb[1],rgb[2]);local.update();
 }));
}
initVehicle();

const featureCopy={
 wheel_front_left:"Neumático delantero izquierdo. Observa el perfil de la rueda y su diseño para terrenos exigentes.",
 wheel_front_right:"Neumático delantero derecho. Componente de contacto con la superficie.",
 wheel_rear_left:"Neumático trasero izquierdo. Parte del conjunto de rodamiento y tracción.",
 wheel_rear_right:"Neumático trasero derecho. Parte del conjunto de rodamiento y tracción.",
 front_fascia:"Conjunto frontal: parrilla, faros y parachoques. La iluminación y sus acabados se identifican aquí.",
 windshield:"Parabrisas. Elemento que incorpora los limpiaparabrisas y, según la versión, el sistema de detección de lluvia.",
 cargo_bed:"Caja de carga o paila. Espacio destinado a transportar equipaje y materiales.",
 tailgate:"Compuerta de la paila. Pieza con bisagras de apertura hacia abajo.",
 interior:"Cabina e interior. Explora el espacio, los asientos y la tecnología a bordo.",
 hood:"Capó delantero. Panel de acceso al compartimento del motor.",
 door_front_left:"Puerta delantera izquierda. Acceso a la cabina.",
 door_front_right:"Puerta delantera derecha. Acceso a la cabina.",
 door_rear_left:"Puerta trasera izquierda. Acceso a la segunda fila.",
 door_rear_right:"Puerta trasera derecha. Acceso a la segunda fila.",
 rear_bumper_and_lights:"Conjunto posterior, con luces traseras y parachoques."
};
const annotationPriority=["wheel_front_left","wheel_front_right","wheel_rear_left","wheel_rear_right","front_fascia","windshield","cargo_bed","tailgate","interior","door_front_left","door_front_right","rear_bumper_and_lights"];
function installVehicleAnnotations(pc, app, root, canvas, manifestUrl){
 const host=$("hotspots");
 const stage=$("stage");
 fetch(manifestUrl).then(r=>{if(!r.ok)throw new Error("No se pudo cargar el manifiesto de componentes");return r.json();})
 .then(data=>{
   const byComponent=new Map((data.annotations||[]).map(a=>[a.componentId,a]));
   const components=new Map((data.components||[]).map(c=>[c.id,c]));
   const markers=[];
   host.replaceChildren();
   for(const id of annotationPriority){
     const component=components.get(id),ann=byComponent.get(id);
     if(!component||!ann)continue;
     const btn=document.createElement("button");
     btn.type="button";btn.className="hotspot";btn.textContent="+";
     btn.title=component.label;btn.setAttribute("aria-label","Ver "+component.label);
     btn.addEventListener("click",()=>openDialog("infoModal",component.label,featureCopy[id]||"Explora este componente de la Kia Tasman."));
     host.append(btn);
     const node=root.findByName(ann.node)||root.findByName(ann.parentNode);
     markers.push({btn,ann,node,withMarker:!!(node&&node.name===ann.node)});
   }
   if(!markers.length)return;
   host.hidden=false;
   function update(){
     if(!state.camera||!state.model||state.mode!=="vehicle"){host.style.display="none";return;}
     host.style.display="";
     // Markers use the same unrotated coordinate system as the canvas.
     for(const {btn,ann,node,withMarker} of markers){
       let p;
       if(withMarker){p=node.getPosition();}
       else if(node && Array.isArray(ann.localPosition)){p=node.getWorldTransform().transformPoint(new pc.Vec3(...ann.localPosition));}
       else if(Array.isArray(ann.position)){p=root.getWorldTransform().transformPoint(new pc.Vec3(...ann.position));}
       else {btn.hidden=true;continue;}
       const projected=state.camera.camera.worldToScreen(p);
       const cameraPos=state.camera.getPosition();
       const dir=p.clone().sub(cameraPos);
       const fwd=state.camera.forward;
       const visible=dir.dot(fwd)>0&&projected.x>=0&&projected.x<=canvas.width&&projected.y>=0&&projected.y<=canvas.height;
       btn.hidden=!visible;
       if(visible){
         const sx=(projected.x/canvas.width)*canvas.clientWidth;
         const sy=(projected.y/canvas.height)*canvas.clientHeight;
         btn.style.left=sx+"px";btn.style.top=sy+"px";
       }
     }
   }
   app.on("update",update);update();
 }).catch(e=>console.error("Kia annotations:",e));
}

/* KIA DIAGNOSTIC VIEW: append ?debug=1 to inspect status without developer tools. */
if(new URLSearchParams(location.search).has("debug")){
 const panel=document.createElement("pre");
 panel.setAttribute("aria-label","KIA 3D technical diagnostic");
 Object.assign(panel.style,{position:"fixed",bottom:"0",left:"0",zIndex:"9999",background:"rgba(0,0,0,.92)",color:"#9de89d",fontSize:"12px",lineHeight:"1.4",padding:"10px",margin:"0",maxWidth:"70vw",maxHeight:"60vh",whiteSpace:"pre-wrap",overflow:"auto",pointerEvents:"none"});
 document.body.appendChild(panel);
 const errors=[];
 window.addEventListener("error",e=>errors.push(String(e.message||e.error||"error")));
 window.addEventListener("unhandledrejection",e=>errors.push("rejection: "+String(e.reason||"unknown")));
 let last=0;
 const probe=t=>{
  if(t-last>500){
   last=t;
   const canvas=$("carCanvas"),stage=$("stage");
   const app=state.app;
   let contextLost=null;
   try{contextLost=app?.graphicsDevice?.gl?.isContextLost?.()??null;}catch{}
   const snapshot={
    time:new Date().toISOString(),
    status:$("interactionHint")?.textContent,
    loadText:$("modelLoading")?.textContent,
    loadHidden:$("modelLoading")?.hidden,
    ready:state.ready,
    model:!!state.model,
    modelState:window.__kiaViewerStatus?.error||"OK",
    meshes:state.model?.findComponents("render")?.reduce((n,c)=>n+(c.meshInstances?.length||0),0)||0,
    renderer:!!app,
    canvas:{hidden:canvas.hidden,cssDisplay:getComputedStyle(canvas).display,cssVisibility:getComputedStyle(canvas).visibility,width:canvas.width,height:canvas.height,clientWidth:canvas.clientWidth,clientHeight:canvas.clientHeight},
    stage:[stage.clientWidth,stage.clientHeight],
    camera:state.camera?.getPosition?.().toString?.(),
    contextLost,
    drawCalls:app?.stats?.drawCalls?.total??null,
    errors:errors.slice(-5)
   };
   panel.textContent=JSON.stringify(snapshot,null,2);
  }
  requestAnimationFrame(probe);
 };
 requestAnimationFrame(probe);
}
