// KIA TASMAN — graphics-only presentation controller.
// No 3D engine, scenery, photo assets or environmental layers are loaded.
// Challenge and vehicle options remain selectable for future video integration.
const levels = [
  { id:"rocks", name:"ROCK CHALLENGE", title:"ROCK<br>CHALLENGE", desc:"Supera las rocas en modo Rock y desciende con la asistencia X-TREK.", tech:"ROCK MODE · X-TREK" },
  { id:"flood", name:"WATER CROSSING", title:"WATER<br>CROSSING", desc:"Cruza un arroyo y descubre la capacidad de vadeo de la Tasman.", tech:"CAPACIDAD DE VADEO · HASTA 800 MM" },
  { id:"mud", name:"SAND CHALLENGE", title:"SAND<br>CHALLENGE", desc:"Sube y baja dunas mostrando la tracción 4×4 en arena.", tech:"SAND MODE · TRACCIÓN 4×4" },
  { id:"descent", name:"STORM CHALLENGE", title:"STORM<br>CHALLENGE", desc:"Avanza bajo una tormenta sobre una carretera mojada.", tech:"4A · TRACCIÓN AUTOMÁTICA 4×4" }
];
const colors = {
  arena:{label:"ARENA · TAN BEIGE (TAM)",rgb:[.68,.57,.43]},
  gris:{label:"INTERSTELLAR GRAY (AGT)",rgb:[.30,.35,.38]},
  negro:{label:"AURORA BLACK PEARL (ABP)",rgb:[.055,.075,.085]},
  verde:{label:"CITYSCAPE GREEN (CGE)",rgb:[.40,.46,.42]}
};
const $ = id => document.getElementById(id);
const state = { mode:"vehicle", level:0, category:"cameras", carousel:null };
function openDialog(id,title) {
  if(id==="missionModal")$("missionModalTitle").textContent=title;
  $(id).hidden=false;
}
function closeDialog(id) { $(id).hidden=true; }
function renderLevel() {
  const item=levels[state.level],n=levels.length;
  $("missionNumber").textContent="MISIÓN "+String(state.level+1).padStart(2,"0")+" / "+String(n).padStart(2,"0");
  $("missionTitle").innerHTML=item.title;
  $("missionDesc").textContent=item.desc.toLocaleLowerCase("es");
  $("missionTech").textContent=item.tech;
  $("selectorName").textContent=item.name;
  $("missionCounter").textContent=String(state.level+1).padStart(2,"0")+" / "+String(n).padStart(2,"0");
  const before=levels[(state.level+n-1)%n], after=levels[(state.level+1)%n];
  $("missionPeekPrev").textContent=before.name;
  $("missionPeekNext").textContent=after.name;
  $("missionPeekPrev").setAttribute("aria-label","Anterior: "+before.name);
  $("missionPeekNext").setAttribute("aria-label","Siguiente: "+after.name);
  const windowElement=$("missionCarouselWindow");
  windowElement.classList.remove("carousel-updated");
  void windowElement.offsetWidth;
  windowElement.classList.add("carousel-updated");
  // No scene/background classes are applied. This is a purely editorial selection.
}
function setLevel(index) {
  state.level=(index+levels.length)%levels.length;
  renderLevel();
}
function setMode(mode) {
  state.mode=mode;
  const mission=mode==="mission";
  $("experience").classList.toggle("is-mission-mode",mission);
  $("vehicleCopy").hidden=mission;
  $("missionCopy").hidden=!mission;
  $("missionSelector").hidden=!mission;
  $("kiaFeatureCarousel").classList.toggle("is-disabled",mission);
  $("featureDetail").hidden=true;
  $("sectionIndex").textContent=mission?"02 / PRUEBAS":"01 / VEHÍCULO";
  $("stepName").textContent=mission?"SELECCIONA TU MISIÓN":"EXPLORA EL VEHÍCULO";
  $("primaryLabel").textContent=mission?"START / INICIAR PRUEBA":"EXPLORAR PRUEBAS";
  $("secondaryButton").textContent=mission?"VOLVER AL VEHÍCULO":"VER CARACTERÍSTICAS +";
  document.querySelector(".frame-index").innerHTML=mission?'02 <em>/</em> 02':'01 <em>/</em> 02';
  if(mission)renderLevel();
}
$("primaryButton").addEventListener("click",()=>{
  if(state.mode==="vehicle")setMode("mission");
  else openDialog("missionModal",levels[state.level].name);
});
$("secondaryButton").addEventListener("click",()=>{
  if(state.mode==="mission")setMode("vehicle");
  else state.carousel?.choose("exterior");
});
$("prevMission").addEventListener("click",()=>setLevel(state.level-1));
$("nextMission").addEventListener("click",()=>setLevel(state.level+1));
$("missionPeekPrev").addEventListener("click",()=>setLevel(state.level-1));
$("missionPeekNext").addEventListener("click",()=>setLevel(state.level+1));
$("selectorName").addEventListener("click",()=>openDialog("missionModal",levels[state.level].name));
let dragX=null;
$("missionCarouselWindow").addEventListener("pointerdown",event=>{
  if(event.pointerType==="mouse"&&event.button!==0)return;
  dragX=event.clientX;
});
$("missionCarouselWindow").addEventListener("pointerup",event=>{
  if(dragX===null)return;
  const dx=event.clientX-dragX;
  dragX=null;
  if(Math.abs(dx)>25)setLevel(state.level+(dx<0?1:-1));
});
$("missionCarouselWindow").addEventListener("pointercancel",()=>{dragX=null;});
$("modalClose").addEventListener("click",()=>closeDialog("infoModal"));
$("missionModalClose").addEventListener("click",()=>closeDialog("missionModal"));
["infoModal","missionModal"].forEach(id=>{
  $(id).addEventListener("click",event=>{
    if(event.target===$(id))closeDialog(id);
  });
});
document.addEventListener("keydown",event=>{
  if(event.key==="Escape"){closeDialog("infoModal");closeDialog("missionModal");}
  if(state.mode==="mission"){
    if(event.key==="ArrowLeft")setLevel(state.level-1);
    if(event.key==="ArrowRight")setLevel(state.level+1);
  }
});
// Reuse only the editorial category carousel; the vehicle renderer is not mounted.
const noVehicle={setPose(){},setDoorsOpen(){}};
import("./tasman-nueva-carousel.js?v=2")
  .then(({mountKiaCarousel})=>{
    state.carousel=mountKiaCarousel({
      viewer:noVehicle,annotations:null,colors,onColorChange:()=>{}
    });
  })
  .catch(error=>console.error("Kia graphic carousel unavailable",error));
renderLevel();
window.__kiaUI={
  get mode(){return state.mode;},
  get mission(){return levels[state.level].name;},
  get category(){return state.carousel?.category||"cameras";},
  get backgroundsLoaded(){return 0;}
};
