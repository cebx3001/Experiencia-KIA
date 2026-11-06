// Kia Tasman — editorial, game-style selector.
// The right rail chooses a category; ONLY the centered lower carousel
// exposes individual actions. No overlays or card-like descriptions.
export function mountKiaCarousel({viewer,annotations,colors,onColorChange}){
  const $=id=>document.getElementById(id);
  const carousel=$("kiaFeatureCarousel");
  const categoryButtons=[...document.querySelectorAll(".kia-category")];
  const data={
    cameras:{
      label:"CÁMARAS",
      options:[
        {id:"threequarter",label:"3/4 DELANTERA",angle:35},
        {id:"side",label:"LATERAL",angle:90},
        {id:"front",label:"FRONTAL",angle:0},
        {id:"rear",label:"TRASERA",angle:180},
        {id:"top",label:"SUPERIOR",angle:35}
      ]
    },
    colors:{
      label:"COLORES",
      options:[
        {id:"arena",label:"ARENA",description:"Tan Beige"},
        {id:"gris",label:"INTERSTELLAR GRAY"},
        {id:"negro",label:"AURORA BLACK PEARL"},
        {id:"verde",label:"CITYSCAPE GREEN"}
      ]
    },
    exterior:{
      label:"EXTERIOR",
      options:[
        {id:"front_fascia",label:"FAROS LED"},
        {id:"wheel_front_left",label:"RUEDAS 17″"},
        {id:"hood",label:"CAPÓ"},
        {id:"windshield",label:"PARABRISAS"},
        {id:"cargo_bed",label:"CAJA DE CARGA"},
        {id:"tailgate",label:"COMPUERTA"},
        {id:"rear_bumper_and_lights",label:"LUCES TRASERAS"},
        {id:"exhaust",label:"ESCAPE"},
        {id:"door_front_left",label:"PUERTAS"}
      ]
    },
    interior:{
      label:"INTERIOR",
      options:[
        {id:"interior",label:"CABINA"},
        {id:"seats",label:"ASIENTO DELANTERO"},
        {id:"display",label:"PANTALLA"},
        {id:"infotainment",label:"CONTROLES"}
      ]
    }
  };
  const indices={cameras:0,colors:0,exterior:0,interior:0};
  let category="cameras",dragX=null;
  const count=$("carouselCounter"),catLabel=$("carouselCategory");
  const prev=$("carouselPeekPrev"),current=$("carouselSelected"),next=$("carouselPeekNext");
  const viewport=$("carouselWindow");
  function showColorLabel(option){
    const detail=$("featureDetail");
    if(!detail)return;
    detail.replaceChildren();
    // A named paint finish is useful, but don't invent a technical feature.
    // The color name already appears in the carousel, so no duplicate copy.
    detail.hidden=true;
  }
  function render(animate=false){
    const {label,options}=data[category],index=indices[category],length=options.length;
    const before=options[(index-1+length)%length],selected=options[index],after=options[(index+1)%length];
    catLabel.textContent=label;
    count.textContent=String(index+1).padStart(2,"0")+" / "+String(length).padStart(2,"0");
    prev.textContent=before.label;
    current.textContent=selected.label;
    next.textContent=after.label;
    prev.setAttribute("aria-label","Anterior: "+before.label);
    current.setAttribute("aria-label","Seleccionada: "+selected.label);
    next.setAttribute("aria-label","Siguiente: "+after.label);
    carousel.dataset.category=category;
    carousel.dataset.selected=selected.id;
    categoryButtons.forEach(button=>{
      const active=button.dataset.category===category;
      button.classList.toggle("is-active",active);
      button.setAttribute("aria-pressed",String(active));
    });
    if(animate){
      viewport.classList.remove("carousel-updated");
      void viewport.offsetWidth;
      viewport.classList.add("carousel-updated");
    }
  }
  function activate(){
    const option=data[category].options[indices[category]];
    if(category==="cameras"){
      if(annotations?.selected)annotations.dismiss({reset:false});
      viewer.setDoorsOpen(false);
      viewer.setPose(option.id);
      $("featureDetail").hidden=true;
      return;
    }
    if(category==="colors"){
      if(annotations?.selected)annotations.dismiss({reset:false});
      viewer.setDoorsOpen(false);
      onColorChange(option.id);
      showColorLabel(option);
      return;
    }
    if(category==="exterior")viewer.setDoorsOpen(false);
    if(category==="interior")viewer.setDoorsOpen(true);
    annotations?.select(option.id);
  }
  function choose(nextCategory){
    if(!data[nextCategory])return;
    const previousCategory=category;
    category=nextCategory;
    carousel.hidden=false;
    if(nextCategory==="interior"){
      // First, a full exterior shot as all FOUR doors open. No camera entry
      // merely from tapping the category: CABINA is a separate carousel step.
      indices.interior=0;
      if(annotations?.selected)annotations.dismiss({reset:false});
      $("featureDetail").hidden=true;
      viewer.setPose("threequarter");
      viewer.setDoorsOpen(true);
      render(true);
      return;
    }
    // Other categories preview their chosen item on the same bottom carousel.
    if(nextCategory==="colors"&&previousCategory!=="colors")viewer.setPose("threequarter");
    render(true);
    activate();
  }
  function shift(delta){
    const length=data[category].options.length;
    indices[category]=(indices[category]+delta+length)%length;
    render(true);
    activate();
  }
  function goTo(categoryKey,index){
    if(!data[categoryKey])return;
    const alreadyActive=category===categoryKey&&!carousel.hidden;
    indices[categoryKey]=((index%data[categoryKey].options.length)+data[categoryKey].options.length)%data[categoryKey].options.length;
    if(alreadyActive){render(true);activate();}
    else choose(categoryKey);
  }
  categoryButtons.forEach(button=>button.addEventListener("click",()=>choose(button.dataset.category)));
  $("carouselPrev").addEventListener("click",()=>shift(-1));
  $("carouselNext").addEventListener("click",()=>shift(1));
  prev.addEventListener("click",()=>shift(-1));
  next.addEventListener("click",()=>shift(1));
  current.addEventListener("click",()=>activate());
  viewport.addEventListener("pointerdown",event=>{
    if(event.pointerType==="mouse"&&event.button!==0)return;
    dragX=event.clientX;
  });
  viewport.addEventListener("pointerup",event=>{
    if(dragX===null)return;
    const dx=event.clientX-dragX;dragX=null;
    if(Math.abs(dx)>25)shift(dx<0?1:-1);
  });
  viewport.addEventListener("pointercancel",()=>{dragX=null;});
  document.addEventListener("keydown",event=>{
    if(event.key!=="ArrowLeft"&&event.key!=="ArrowRight")return;
    if(carousel.hidden||document.getElementById("experience").classList.contains("is-mission-mode"))return;
    if(["INPUT","TEXTAREA"].includes(document.activeElement?.tagName))return;
    event.preventDefault();
    shift(event.key==="ArrowRight"?1:-1);
  });
  render();
  window.__kiaCarousel={
    get category(){return category;},
    get selected(){return data[category].options[indices[category]].id;},
    get items(){return data[category].options.map(option=>option.id);},
    choose,shift,goTo
  };
  return {choose,shift,goTo,get category(){return category;}};
}
