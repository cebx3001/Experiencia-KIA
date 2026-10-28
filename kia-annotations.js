// KIA: annotations live ONLY in the collapsible UI — no floating markers.
// Each selection drives an authored camera pose on the existing real GLB.
const DETAILS={
 front_fascia:{title:"Faro LED delantero",description:"Primer plano de un solo faro delantero y su firma luminosa.",anchor:"headlight_front_left",angle:-18,closeDistance:.86,elevation:.08,fov:30},
 wheel_front_left:{title:"Ruedas todoterreno",description:"Primer plano del rin de 17 pulgadas y del neumático todoterreno.",anchor:"wheel_front_left",angle:-90,closeDistance:1.75,elevation:.09},
 hood:{title:"Capó",description:"Acercamiento a la superficie y líneas del capó.",anchor:"hood",angle:15,closeDistance:2.50,elevation:.55},
 windshield:{title:"Parabrisas",description:"Vista cercana del parabrisas completo y sus marcos.",anchor:"windshield",angle:8,closeDistance:2.28,elevation:.34},
 cargo_bed:{title:"Caja de carga",description:"Acercamiento desde arriba al volumen útil de la caja.",anchor:"cargo_bed",angle:165,closeDistance:2.60,elevation:.63,lookOffset:[0,-.12,-.35]},
 exhaust:{title:"Escape",description:"Vista cercana de la zona inferior trasera y la salida de escape.",anchor:"rear_bumper_and_lights",angle:-155,closeDistance:1.60,elevation:-.19,lookOffset:[-.55,-.45,-.18]},
 tailgate:{title:"Compuerta trasera",description:"Primer plano de la compuerta y su acabado exterior.",anchor:"tailgate",angle:180,closeDistance:2.00,elevation:.06},
 rear_bumper_and_lights:{title:"Luces posteriores",description:"Primer plano de los faros traseros y del parachoques.",anchor:"rear_bumper_and_lights",angle:180,closeDistance:2.12,elevation:.13,lookOffset:[0,.25,0]},
 door_front_left:{title:"Puertas",description:"Vista cercana de las puertas y del acceso a la cabina.",anchor:"door_front_left",angle:-90,closeDistance:2.20,elevation:.12},
 interior:{title:"Acceso a la cabina",description:"Apertura sincronizada de las cuatro puertas y recorrido de entrada a la cabina.",interior:true},
 display:{title:"Pantalla panorámica",description:"Primer plano frontal de la pantalla panorámica del tablero. Equipamiento según versión.",interior:true},
 infotainment:{title:"Infoentretenimiento",description:"Acercamiento a los controles y la zona central de la consola.",interior:true},
 seats:{title:"Asiento delantero",description:"Primer plano de un asiento completo: cojín, respaldo y cabecera, visto desde la puerta abierta.",interior:true},
};

export function mountKiaAnnotations({viewer,onChange=()=>{}}){
 const detail=document.getElementById("featureDetail");
 if(!detail)throw new Error("The interface detail panel was not found");
 let selected=null;
 function dismiss({reset=true}={}){
   selected=null;
   detail.hidden=true;
   detail.replaceChildren();
   document.querySelectorAll(".micro-feature").forEach(button=>button.classList.remove("is-active"));
   if(reset)viewer.resetView();
   onChange(null);
 }
 function select(id){
   const item=DETAILS[id];
   if(!item)return false;
   selected=id;
   document.querySelectorAll(".micro-feature").forEach(button=>button.classList.toggle("is-active",button.dataset.feature===id));
   detail.replaceChildren();
   const title=document.createElement("strong");
   title.textContent=item.title;
   const description=document.createElement("p");
   description.textContent=item.description;
   const close=document.createElement("button");
   close.type="button";
   close.textContent="×";
   close.setAttribute("aria-label","Cerrar anotación");
   // X hides only the writing. It must not reset the camera, close doors,
   // collapse the menu, or deselect the active feature.
   close.addEventListener("click",()=>{
     detail.hidden=true;
   });
   detail.append(title,description,close);
   detail.hidden=false;
   if(item.interior) viewer.enterCabin(id);
   else {
     const anchor=viewer.getFeatureAnchor(item.anchor);
     if(anchor)viewer.focusOnPart(anchor,{angle:item.angle,radiusFactor:item.zoom,closeDistance:item.closeDistance,elevation:item.elevation,fov:item.fov,lookOffset:item.lookOffset,duration:980});
   }
   onChange(id);
   return true;
 }
 window.__kiaAnnotations={get selected(){return selected},available:Object.keys(DETAILS),select,dismiss,markerCount:0};
 return {select,dismiss,get selected(){return selected},available:Object.keys(DETAILS),
  destroy(){detail.replaceChildren();detail.hidden=true}};
}
