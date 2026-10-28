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
 const canvas=$("carCanvas"),stage=$("stage");
 const assetUrl=new URLSearchParams(location.search).get("model")==="original"
  ? "./assets/kia-tasman.glb" : "./assets/kia-tasman-quality.glb";
 try{
  showModelStatus("CARGANDO KIA TASMAN 3D");
  const {mountKiaThree}=await import("./kia-three-renderer.js?v=20261028-three-integrated-v1");
  const viewer=await mountKiaThree({
   canvas,host:stage,assetUrl,initialAngle:state.angle,
   onAngleChange:degrees=>{
    state.angle=degrees;
    document.querySelectorAll("#cameraButtons button").forEach(button=>
     button.classList.toggle("selected",Math.abs(Number(button.dataset.angle)-degrees)<.5));
   }
  });
  state.viewer=viewer;
  state.app=viewer;
  state.model=viewer.model;
  state.camera=viewer.camera;
  state.ready=true;
  window.__kiaViewerStatus={
   loaded:true,engine:"three",asset:assetUrl,meshCount:viewer.meshCount,
   texturesBound:viewer.texturesBound,getCamera:viewer.getCameraPosition,
   status:window.__kiaThreeViewer
  };
  hideModelStatus();
  $("interactionHint").textContent="DESLIZA PARA GIRAR · EXPLORA LAS PIEZAS CON LOS BOTONES";
 }catch(error){
  console.error("Kia Three.js viewer initialization failed",error);
  window.__kiaViewerStatus={loaded:false,engine:"three",error:String(error)};
  showModelStatus("NO SE PUDO CARGAR EL MODELO 3D");
 }
}
function moveCamera(){
 if(state.viewer)state.viewer.setAngle(state.angle);
}
// One shared Car texture atlas includes trim and glass; preserve it exactly.
// The UI color selection remains independent until body panels are separable.
function recolorModel(){ /* material-safe: selection only */ }
initVehicle();

const featureCopy={
 wheel_front_left:"Ruedas de la Tasman. Observa el diseño de las llantas y los neumáticos del vehículo.",
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
const buttonFeatureLabels={
 wheel_front_left:"RUEDAS",
 front_fascia:"FAROS Y FRENTE",
 interior:"CABINA",
 cargo_bed:"CAJA DE CARGA"
};
document.querySelectorAll("[data-feature]").forEach(button=>{
 button.addEventListener("click",()=>{
  const id=button.dataset.feature;
  document.querySelectorAll("[data-feature]").forEach(el=>el.classList.toggle("is-active",el===button));
  // Focus the existing orbit view toward the selected real vehicle part.
  const angle=Number(button.dataset.angle);
  if(Number.isFinite(angle)){
   state.angle=angle;
   document.querySelectorAll("#cameraButtons button").forEach(el=>el.classList.remove("selected"));
   moveCamera();
  }
  openDialog("infoModal",buttonFeatureLabels[id]||"COMPONENTE",featureCopy[id]||"Detalle del vehículo");
 });
});

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
   try{contextLost=state.viewer?.renderer?.getContext?.()?.isContextLost?.()??null;}catch{}
   const snapshot={
    time:new Date().toISOString(),
    status:$("interactionHint")?.textContent,
    loadText:$("modelLoading")?.textContent,
    loadHidden:$("modelLoading")?.hidden,
    ready:state.ready,
    model:!!state.model,
    modelState:window.__kiaViewerStatus?.error||"OK",
    meshes:window.__kiaViewerStatus?.meshCount||0,
    renderer:!!app,
    canvas:{hidden:canvas.hidden,cssDisplay:getComputedStyle(canvas).display,cssVisibility:getComputedStyle(canvas).visibility,width:canvas.width,height:canvas.height,clientWidth:canvas.clientWidth,clientHeight:canvas.clientHeight},
    stage:[stage.clientWidth,stage.clientHeight],
    camera:state.viewer?.getCameraPosition?.()||null,
    contextLost,
    drawCalls:state.viewer?.renderer?.info?.render?.calls??null,
    errors:errors.slice(-5)
   };
   panel.textContent=JSON.stringify(snapshot,null,2);
  }
  requestAnimationFrame(probe);
 };
 requestAnimationFrame(probe);
}
