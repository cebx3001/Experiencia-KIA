// KIA: annotations live ONLY in the collapsible UI — no floating markers.
// Each selection drives an authored camera pose on the existing real GLB.
const DETAILS={
 front_fascia:{title:"Faro LED delantero",description:"Faros Full LED con luces diurnas DRL y direccionales LED, según equipamiento.",anchor:"headlight_front_left",angle:-18,closeDistance:.86,elevation:.08,fov:30},
 wheel_front_left:{title:"Ruedas todoterreno",description:"Aros de aluminio de 17 pulgadas para conducción dentro y fuera del camino, según versión.",anchor:"wheel_front_left",angle:-90,closeDistance:1.75,elevation:.09},
 hood:{title:"Capó",description:null,anchor:"hood",angle:15,closeDistance:2.50,elevation:.55},
 windshield:{title:"Parabrisas",description:null,anchor:"windshield",angle:8,closeDistance:2.28,elevation:.34},
 cargo_bed:{title:"Caja de carga",description:"Rieles ajustables con ganchos de sujeción. Capacidad útil anunciada de hasta 1,2 toneladas, según versión.",anchor:"cargo_bed",angle:165,closeDistance:2.60,elevation:.63,lookOffset:[0,-.12,-.35]},
 exhaust:{title:"Escape",description:null,anchor:"rear_bumper_and_lights",angle:-155,closeDistance:1.60,elevation:-.19,lookOffset:[-.55,-.45,-.18]},
 tailgate:{title:"Compuerta trasera",description:null,anchor:"tailgate",angle:180,closeDistance:2.00,elevation:.06},
 rear_bumper_and_lights:{title:"Luces posteriores",description:"Iluminación LED posterior y escalones integrados en las esquinas del parachoques para acceder a la caja, según versión.",anchor:"rear_bumper_and_lights",angle:180,closeDistance:2.12,elevation:.13,lookOffset:[0,.25,0]},
 door_front_left:{title:"Puertas",description:null,anchor:"door_front_left",angle:-90,closeDistance:2.20,elevation:.12},
 interior:{title:"Acceso a la cabina",description:null,interior:true},
 display:{title:"Pantalla panorámica",description:"Pantalla panorámica integrada con dos módulos de 12,3 pulgadas y un panel de climatización de 5 pulgadas, según versión.",interior:true},
 infotainment:{title:"Infoentretenimiento",description:"Controles texturizados con respuesta táctil para manejar las funciones principales del infoentretenimiento.",interior:true},
 seats:{title:"Asiento delantero",description:"Los asientos delanteros eléctricos permiten ajustar la posición para personalizar el soporte y la comodidad, según versión.",interior:true},
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
   if(item.description){
     const title=document.createElement("strong");
     title.textContent=item.title;
     const description=document.createElement("p");
     description.textContent=item.description;
     const close=document.createElement("button");
     close.type="button";
     close.textContent="×";
     close.setAttribute("aria-label","Cerrar anotación");
     // X hides only the writing: leave camera, doors and carousel untouched.
     close.addEventListener("click",()=>{detail.hidden=true;});
     detail.append(title,description,close);
     detail.hidden=false;
   }else{
     // Do not fill the information area with an explanation of a camera move.
     detail.hidden=true;
   }
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
