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
 arena:{label:"ARENA · TAN BEIGE (TAM)",rgb:[.68,.57,.43]},
 gris:{label:"INTERSTELLAR GRAY (AGT)",rgb:[.30,.35,.38]},
 negro:{label:"AURORA BLACK PEARL (ABP)",rgb:[.055,.075,.085]},
 verde:{label:"CITYSCAPE GREEN (CGE)",rgb:[.40,.46,.42]}
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
 $("experience").classList.toggle("is-mission-mode",mission);
 $("stage").classList.toggle("kia-annotation-mode-hidden",mission);
 if(mission&&state.annotations?.selected)state.annotations.dismiss({reset:false});
 // The cinematic challenges always show the vehicle closed; restoring
 // the vehicle view respects the Interior menu's expanded state.
 if(mission)state.viewer?.setDoorsOpen(false);
 else state.viewer?.setDoorsOpen(state.carousel?.category==="interior" && !$("kiaFeatureCarousel").hidden);
 $("vehicleCopy").hidden=mission;$("missionCopy").hidden=!mission;
 $("missionSelector").hidden=!mission;
 $("kiaFeatureCarousel").classList.toggle("is-disabled",mission);
 if(mission)$("featureDetail").hidden=true;
 $("sectionIndex").textContent=mission?"02 / PRUEBAS":"01 / VEHÍCULO";
 $("stepName").textContent=mission?"SELECCIONA TU MISIÓN":"EXPLORA EL VEHÍCULO";
 $("primaryLabel").textContent=mission?"START / INICIAR PRUEBA":"EXPLORAR PRUEBAS";
 $("secondaryButton").textContent=mission?"VOLVER AL VEHÍCULO":"VER CARACTERÍSTICAS +";
 document.querySelector(".frame-index").innerHTML=mission?'02 <em>/</em> 02':'01 <em>/</em> 02';
 if(mission)renderLevel();
 // Background photographs are retired; mode changes only editorial text and controls.
}
function renderLevel(){
 const item=levels[state.level];
 // No environment / scene CSS is applied when selecting a challenge.
 // The floating 3D Kia remains the sole visual subject.
 $("missionNumber").textContent="MISIÓN "+String(state.level+1).padStart(2,"0")+" / 04";
 $("missionTitle").innerHTML=item.title;
 $("missionDesc").textContent=item.desc;
 $("missionTech").textContent=item.tech;
 const previous=levels[(state.level+levels.length-1)%levels.length];
 const following=levels[(state.level+1)%levels.length];
 $("selectorName").textContent=item.name;
 $("missionCounter").textContent=String(state.level+1).padStart(2,"0")+" / "+String(levels.length).padStart(2,"0");
 $("missionPeekPrev").textContent=previous.name;
 $("missionPeekNext").textContent=following.name;
 $("missionPeekPrev").setAttribute("aria-label","Anterior: "+previous.name);
 $("missionPeekNext").setAttribute("aria-label","Siguiente: "+following.name);
 const windowElement=$("missionCarouselWindow");
 windowElement.classList.remove("carousel-updated");
 void windowElement.offsetWidth;
 windowElement.classList.add("carousel-updated");
 // Color exploration does not alter the predefined sand-color cinematic videos.
}
function setLevel(index){state.level=(index+levels.length)%levels.length;renderLevel();}
$("primaryButton").addEventListener("click",()=>state.mode==="vehicle"?setMode("mission"):openDialog("missionModal",levels[state.level].name));
$("secondaryButton").addEventListener("click",()=>{
 if(state.mode==="mission")setMode("vehicle");
 else state.carousel?.choose("exterior");
});
$("prevMission").addEventListener("click",()=>setLevel(state.level-1));
$("nextMission").addEventListener("click",()=>setLevel(state.level+1));
$("missionPeekPrev").addEventListener("click",()=>setLevel(state.level-1));
$("missionPeekNext").addEventListener("click",()=>setLevel(state.level+1));
$("selectorName").addEventListener("click",()=>openDialog("missionModal",levels[state.level].name));
// Swipe in the same direction as the exterior/color carousel.
let missionDragX=null;
$("missionCarouselWindow").addEventListener("pointerdown",event=>{
 if(event.pointerType==="mouse"&&event.button!==0)return;
 missionDragX=event.clientX;
});
$("missionCarouselWindow").addEventListener("pointerup",event=>{
 if(missionDragX===null)return;
 const dx=event.clientX-missionDragX;missionDragX=null;
 if(Math.abs(dx)>25)setLevel(state.level+(dx<0?1:-1));
});
$("missionCarouselWindow").addEventListener("pointercancel",()=>{missionDragX=null;});
$("modalClose").addEventListener("click",()=>closeDialog("infoModal"));
$("missionModalClose").addEventListener("click",()=>closeDialog("missionModal"));
for(const id of ["infoModal","missionModal"]){$(id).addEventListener("click",e=>{if(e.target===$(id))closeDialog(id);});}
document.addEventListener("keydown",e=>{
 if(e.key==="Escape"){closeDialog("infoModal");closeDialog("missionModal");}
 if(state.mode==="mission"){if(e.key==="ArrowLeft")setLevel(state.level-1);if(e.key==="ArrowRight")setLevel(state.level+1);}
});
// Interactive controls are managed by the game-style horizontal carousel.
async function initVehicle(){
 const canvas=$("carCanvas"),stage=$("stage");
 const assetUrl=new URLSearchParams(location.search).get("model")==="original"
  ? "./assets/kia-tasman.glb" : "./assets/kia-tasman-quality.glb";
 try{
  showModelStatus("CARGANDO KIA TASMAN 3D");
  const {mountKiaPlayCanvas}=await import("./kia-playcanvas-renderer.js?v=20261028-alpha-only-v7");
  const viewer=await mountKiaPlayCanvas({
   canvas,host:stage,assetUrl,initialAngle:state.angle,
   onAngleChange:degrees=>{state.angle=degrees;}
  });
  state.viewer=viewer;
  recolorModel();
  try{
   const {mountKiaAnnotations}=await import("./kia-annotations.js?v=20261028-studio-v1");
   state.annotations=mountKiaAnnotations({host:stage,viewer});
   const {mountKiaCarousel}=await import("./kia-carousel.js?v=20261028-overview-v17");
   state.carousel=mountKiaCarousel({
     viewer,
     annotations:state.annotations,
     colors,
     onColorChange:key=>{state.color=key;recolorModel();}
   });
  }catch(annotationError){
   console.warn("Kia annotations unavailable; vehicle remains interactive",annotationError);
  }
  state.app=viewer;
  state.model=viewer.model;
  state.camera=viewer.camera;
  state.ready=true;
  window.__kiaViewerStatus={
   loaded:true,engine:"playcanvas",asset:assetUrl,meshCount:viewer.meshCount,
   texturesBound:viewer.texturesBound,getCamera:viewer.getCameraPosition,
   status:window.__kiaPlayCanvasViewer
  };
  hideModelStatus();
  // The carousel itself presents navigation; no redundant instruction line.
 }catch(error){
  console.error("Kia PlayCanvas viewer initialization failed",error);
  window.__kiaViewerStatus={loaded:false,engine:"playcanvas",error:String(error)};
  showModelStatus("NO SE PUDO CARGAR EL MODELO 3D");
 }
}
function moveCamera(){
 if(!state.viewer)return;
 if(state.annotations?.selected)state.annotations.dismiss({reset:false});
 state.viewer.resetView(state.angle);
}
// Selective warm-paint shader recolors body panels without tinting
// cabin glass, tyres, trim or the source PBR reflections.
function recolorModel(){
  if(state.viewer)state.viewer.setPaintColor(state.color);
}
initVehicle();

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
   try{contextLost=state.viewer?.app?.graphicsDevice?.gl?.isContextLost?.()??null;}catch{}
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
    drawCalls:state.viewer?.app?.stats?.drawCalls?.total??null,
    errors:errors.slice(-5)
   };
   panel.textContent=JSON.stringify(snapshot,null,2);
  }
  requestAnimationFrame(probe);
 };
 requestAnimationFrame(probe);
}
