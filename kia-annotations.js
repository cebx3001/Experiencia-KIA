// KIA: annotations live ONLY in the collapsible UI — no floating markers.
// Each selection drives an authored camera pose on the existing real GLB.
const DETAILS={
 front_fascia:{title:"Faros LED",description:"Faros delanteros y firma luminosa de la Tasman.",anchor:"front_fascia",angle:0,zoom:.80},
 wheel_front_left:{title:"Ruedas todoterreno",description:"Llantas de aleación de 17 pulgadas y neumáticos para distintos terrenos, según versión.",anchor:"wheel_front_left",angle:-75,zoom:.76},
 hood:{title:"Capó",description:"Vista del panel delantero y sus líneas de diseño.",anchor:"hood",angle:27,zoom:.81},
 windshield:{title:"Parabrisas",description:"Geometría del parabrisas y la zona de visibilidad del conductor.",anchor:"windshield",angle:20,zoom:.83},
 cargo_bed:{title:"Caja de carga",description:"Área posterior destinada a transportar equipaje y materiales.",anchor:"cargo_bed",angle:145,zoom:.82},
 tailgate:{title:"Compuerta trasera",description:"Portón posterior de acceso a la caja de carga.",anchor:"tailgate",angle:180,zoom:.80},
 rear_bumper_and_lights:{title:"Luces posteriores",description:"Diseño del conjunto de iluminación y parachoques trasero.",anchor:"rear_bumper_and_lights",angle:180,zoom:.78},
 door_front_left:{title:"Puertas",description:"Acceso a la cabina de doble fila; la puerta del conductor puede abrirse para entrar.",anchor:"door_front_left",angle:-80,zoom:.86},
 eld:{title:"Diferencial e-LD",description:"Vista del área del eje trasero. El bloqueo electrónico de diferencial ayuda a mejorar la tracción; el mecanismo no está animado en este modelo.",anchor:"wheel_rear_left",angle:160,zoom:.75},
 interior:{title:"Acceso a la cabina",description:"Apertura de la puerta del conductor y recorrido de entrada al espacio interior.",interior:true},
 display:{title:"Pantalla panorámica",description:"Encuadre del tablero y del conjunto de pantallas panorámicas. Equipamiento según versión.",interior:true},
 infotainment:{title:"Infoentretenimiento",description:"Acercamiento a los controles y la zona central de la consola.",interior:true},
 wireless:{title:"Cargador inalámbrico",description:"Zona de la consola donde se sitúan los cargadores inalámbricos en las versiones equipadas.",interior:true},
 seats:{title:"Asientos eléctricos",description:"Vista de los asientos delanteros; las funciones eléctricas dependen del equipamiento.",interior:true},
 ambient:{title:"Iluminación ambiental",description:"Vista del ambiente de la cabina. El modelo 3D no simula el encendido de las luces.",interior:true},
 walkin:{title:"Passenger walk-in switch",description:"Sistema de acceso para que los pasajeros posteriores ajusten el asiento delantero en versiones equipadas; el interruptor no está separado en el GLB.",interior:true},
 xtrek:{title:"Modo X-TREK",description:"Vista de los mandos de conducción. X-TREK mantiene una velocidad baja y constante fuera del asfalto; la función no se activa en esta demo.",interior:true},
 rock:{title:"Modo Roca",description:"Vista del selector de terreno. En la variante X-Pro se selecciona con 4WD 4L; la simulación no modifica la tracción.",interior:true}
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
   const sourceButton=document.querySelector('.micro-feature[data-feature="'+id+'"]');
   if(sourceButton){
     const panel=sourceButton.closest(".micro-panel");
     if(panel)panel.appendChild(detail); // Keep notes inside the currently open micro-menu.
   }
   detail.replaceChildren();
   const title=document.createElement("strong");
   title.textContent=item.title;
   const description=document.createElement("p");
   description.textContent=item.description;
   const close=document.createElement("button");
   close.type="button";
   close.textContent="×";
   close.setAttribute("aria-label","Cerrar anotación");
   close.addEventListener("click",()=>dismiss());
   detail.append(title,description,close);
   detail.hidden=false;
   if(item.interior) viewer.enterCabin(id);
   else {
     const anchor=viewer.getFeatureAnchor(item.anchor);
     if(anchor)viewer.focusOnPart(anchor,{angle:item.angle,radiusFactor:item.zoom,duration:980});
   }
   onChange(id);
   return true;
 }
 window.__kiaAnnotations={get selected(){return selected},available:Object.keys(DETAILS),select,dismiss,markerCount:0};
 return {select,dismiss,get selected(){return selected},available:Object.keys(DETAILS),
  destroy(){detail.replaceChildren();detail.hidden=true}};
}
