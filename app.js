// KIA TASMAN — first-stage selector.
// The real GLB is intentionally loaded only when assets/kia-tasman.glb is available.
const levels = [
  { id:"rocks", name:"ROCK CHALLENGE", title:"ROCK<br>CHALLENGE", desc:"Domina un terreno rocoso y descubre el control todoterreno de la Tasman.", tech:"MODO ROCA · MONITOR DE VISTA DEL TERRENO", cls:"scene-rocks" },
  { id:"flood", name:"FLOOD CROSSING", title:"FLOOD<br>CROSSING", desc:"Atraviesa una zona inundada y descubre su capacidad de vadeo.", tech:"VADEO · HASTA 800 MM A 7 KM/H", cls:"scene-flood" },
  { id:"mud", name:"MUD ESCAPE", title:"MUD<br>ESCAPE", desc:"Explora la tracción y el control sobre un terreno lleno de lodo.", tech:"MODO BARRO · DIFERENCIAL e-LD", cls:"scene-mud" },
  { id:"descent", name:"X-TREK DESCENT", title:"X-TREK<br>DESCENT", desc:"Avanza a baja velocidad por un descenso técnico de montaña.", tech:"MODO X-TREK", cls:"scene-descent" }
];
const colors = {
 arena:{label:"ARENA", rgb:[.61,.53,.40]},
 blanco:{label:"BLANCO",rgb:[.87,.87,.84]},
 gris:{label:"GRIS",rgb:[.34,.39,.41]},
 negro:{label:"NEGRO",rgb:[.055,.083,.11]}
};
const $ = id => document.getElementById(id);
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
 if(mission)renderLevel();else document.querySelectorAll(".scene-rocks,.scene-flood,.scene-mud,.scene-descent").forEach(n=>n.classList.replace("scene-flood","scene-rocks"));
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
document.querySelectorAll(".hotspot").forEach(b=>b.addEventListener("click",()=>{const m=modalInfo[b.dataset.info];openDialog("infoModal",m.title,m.body);}));
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
 const url="./assets/kia-tasman.glb";
 // The page works as a menu before the model is uploaded; do not fetch PlayCanvas unnecessarily.
 try{
   const res=await fetch(url,{method:"HEAD",cache:"no-store"});
   if(!res.ok)return;
 }catch{return;}
 let pc;
 try{pc=await import("https://cdn.jsdelivr.net/npm/playcanvas@2.23.1/build/playcanvas.mjs");}
 catch(e){console.warn("PlayCanvas could not load",e);return;}
 const canvas=$("carCanvas");
 let app;
 try{
   app=new pc.Application(canvas,{graphicsDeviceOptions:{alpha:true,antialias:true,preserveDrawingBuffer:false,powerPreference:"high-performance"}});
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
   app.scene.gammaCorrection=pc.GAMMA_SRGB;
   app.scene.toneMapping=pc.TONEMAP_ACES;
   app.assets.loadFromUrl(url,"container",(err,asset)=>{
     if(err||!asset){console.error("Could not load Kia GLB",err);return;}
     const root=asset.resource.instantiateRenderEntity({castShadows:true});
     app.root.addChild(root);state.model=root;state.ready=true;
     const box=new pc.BoundingBox();
     let has=false;
     root.findComponents("render").forEach(c=>(c.meshInstances||[]).forEach(mi=>{if(mi.aabb){if(!has){box.copy(mi.aabb);has=true;}else box.add(mi.aabb);}}));
     if(has){
       const center=box.center.clone();
       const extent=box.halfExtents;
       root.setPosition(-center.x,-center.y,-center.z);
       const maxSize=Math.max(extent.x,extent.y,extent.z)*2;
       state.radius=Math.max(maxSize*1.65,2.5);
     }
     state.target=new pc.Vec3(0,0,0);
     moveCamera();canvas.hidden=false;$("carFallback").hidden=true;$("hotspots").hidden=false;
     $("interactionHint").textContent="DESLIZA PARA GIRAR · TOCA + PARA EXPLORAR";
     recolorModel();
   });
   const doResize=()=>{
     if(!state.app)return;
     const bounds=canvas.getBoundingClientRect();
     app.resizeCanvas(Math.max(16,Math.round(bounds.width)),Math.max(16,Math.round(bounds.height)));
   };
   new ResizeObserver(doResize).observe(canvas);
   doResize();
   canvas.addEventListener("pointerdown",e=>{state.dragging=true;state.pointerX=e.clientX;canvas.setPointerCapture(e.pointerId)});
   canvas.addEventListener("pointermove",e=>{if(!state.dragging)return;const dx=e.clientX-state.pointerX;state.pointerX=e.clientX;state.angle+=dx*.4;moveCamera();});
   for(const ev of ["pointerup","pointercancel"])canvas.addEventListener(ev,()=>{state.dragging=false;});
 }catch(e){console.error("PlayCanvas scene init failed",e);canvas.hidden=true;}
}
function moveCamera(){
 if(!state.camera||!state.target)return;
 const a=state.angle*Math.PI/180;
 const r=state.radius;
 state.camera.setPosition(Math.sin(a)*r,r*.26,Math.cos(a)*r);
 state.camera.lookAt(state.target);
}
function recolorModel(){
 if(!state.model||!state.app)return;
 const pc=state.app;
 // Only recognized paint/body material names are colorized; glazing, tyres and chrome are preserved.
 const rgb=colors[state.color].rgb;
 state.model.findComponents("render").forEach(c=>(c.meshInstances||[]).forEach(mi=>{
   const mat=mi.material;const name=((mat?.name||"")+" "+(mi.node?.name||"")).toLowerCase();
   if(!/(paint|body|carrocer|exterior|bodywork|doorpaint|painted)/.test(name))return;
   if(!state.materials.has(mi)){
     const clone=mat.clone();mi.material=clone;state.materials.set(mi,clone);
   }
   const local=state.materials.get(mi);local.diffuse.set(rgb[0],rgb[1],rgb[2]);local.update();
 }));
}
initVehicle();
