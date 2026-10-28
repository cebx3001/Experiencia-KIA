// 3D annotations: anchored markers, authored camera views and animated
// on-model detail. Mirrors PlayCanvas annotation interaction, not modal dialogs.
const CONTENT={
  front_fascia:{number:"01",title:"FAROS",description:"Diseño frontal, iluminación y parrilla.",angle:25,zoom:.83},
  wheel_front_left:{number:"02",title:"RUEDAS",description:"Diseño de llantas y neumáticos todoterreno.",angle:-65,zoom:.81},
  interior:{number:"03",title:"CABINA",description:"Asientos, espacio interior y tecnología a bordo.",angle:44,zoom:.84},
  cargo_bed:{number:"04",title:"CAJA DE CARGA",description:"Zona de carga y capacidad de transporte.",angle:145,zoom:.81}
};

export function mountKiaAnnotations({host,viewer,onChange=()=>{}}){
  const overlay=document.createElement("div");
  overlay.className="kia-annotations";
  overlay.setAttribute("aria-label","Anotaciones tridimensionales del vehículo");
  host.appendChild(overlay);
  const markers=new Map();
  for(const [id,data] of Object.entries(CONTENT)){
    const anchor=viewer.getFeatureAnchor(id);
    if(!anchor)continue;
    const button=document.createElement("button");
    button.type="button";
    button.className="kia-annotation-pin";
    button.dataset.feature=id;
    button.setAttribute("aria-label","Explorar "+data.title.toLowerCase());
    button.title=data.title;
    const glyph=document.createElement("span");
    glyph.textContent="+";
    glyph.setAttribute("aria-hidden","true");
    button.appendChild(glyph);
    button.addEventListener("click",event=>{
      event.preventDefault();event.stopPropagation();select(id);
    });
    overlay.appendChild(button);
    markers.set(id,{button,anchor,data});
  }
  const leader=document.createElement("div");
  leader.className="kia-annotation-leader";
  leader.setAttribute("aria-hidden","true");
  overlay.appendChild(leader);

  const detail=document.createElement("section");
  detail.className="kia-annotation-detail";
  detail.setAttribute("aria-label","Detalle seleccionado del vehículo");
  const eyebrow=document.createElement("div");eyebrow.className="kia-annotation-eyebrow";
  const heading=document.createElement("h3");heading.className="kia-annotation-heading";
  const description=document.createElement("p");description.className="kia-annotation-description";
  const close=document.createElement("button");
  close.type="button";close.className="kia-annotation-close";
  close.textContent="×";close.setAttribute("aria-label","Cerrar detalle y mostrar vehículo completo");
  close.addEventListener("click",()=>dismiss());
  detail.append(eyebrow,heading,description,close);
  overlay.appendChild(detail);

  let selected=null,activePoint=null;
  const clamp=(value,min,max)=>Math.min(Math.max(value,min),max);

  function layout(){
    const width=Math.max(1,host.clientWidth);
    const height=Math.max(1,host.clientHeight);
    for(const [id,marker] of markers){
      const screen=viewer.projectPoint(marker.anchor);
      marker.button.style.left=screen.x+"px";
      marker.button.style.top=screen.y+"px";
      const outside=screen.x<16||screen.x>width-16||screen.y<16||screen.y>height-16;
      marker.button.classList.toggle("is-offscreen",!screen.visible||outside);
      marker.button.classList.toggle("is-selected",id===selected);
    }
    if(!selected||!activePoint)return;
    const p=viewer.projectPoint(activePoint);
    const cardWidth=Math.min(206,Math.max(138,width*.37));
    const cardHeight=113;
    const right=p.x<width*.53;
    const boxX=clamp(right?p.x+31:p.x-cardWidth-31,6,Math.max(6,width-cardWidth-6));
    const boxY=clamp(p.y-cardHeight*.48,8,Math.max(8,height-cardHeight-8));
    detail.style.setProperty("--annotation-x",boxX+"px");
    detail.style.setProperty("--annotation-y",boxY+"px");
    detail.style.setProperty("--annotation-width",cardWidth+"px");
    // A thin connector visibly binds the information to the moving 3D point.
    const endX=right?boxX:boxX+cardWidth;
    const endY=boxY+37;
    const dx=endX-p.x,dy=endY-p.y;
    const length=Math.hypot(dx,dy);
    leader.style.left=p.x+"px";
    leader.style.top=p.y+"px";
    leader.style.width=length+"px";
    leader.style.transform="rotate("+Math.atan2(dy,dx)+"rad)";
    const visible=p.visible&&p.x>=-12&&p.x<=width+12&&p.y>=-12&&p.y<=height+12;
    leader.classList.toggle("is-offscreen",!visible);
  }

  function select(id){
    const marker=markers.get(id);
    if(!marker)return false;
    selected=id;
    activePoint=marker.anchor;
    eyebrow.textContent="KIA TASMAN  /  "+marker.data.number;
    heading.textContent=marker.data.title;
    description.textContent=marker.data.description;
    detail.classList.remove("is-open");
    leader.classList.remove("is-open");
    overlay.classList.add("has-selection");
    viewer.focusOnPart(marker.anchor,{angle:marker.data.angle,radiusFactor:marker.data.zoom,duration:960});
    // Display the technical annotation as the camera arrives, rather than
    // opening an unrelated full-screen text modal.
    requestAnimationFrame(()=>{
      detail.classList.add("is-open");
      leader.classList.add("is-open");
      layout();
    });
    onChange(id);
    layout();
    return true;
  }
  function dismiss({reset=true}={}){
    selected=null;activePoint=null;
    overlay.classList.remove("has-selection");
    detail.classList.remove("is-open");
    leader.classList.remove("is-open");
    if(reset)viewer.resetView();
    onChange(null);
    layout();
  }
  const unsubscribe=viewer.addFrameListener(layout);
  layout();
  window.__kiaAnnotations={
    get selected(){return selected},
    available:[...markers.keys()],
    select,dismiss
  };
  return {select,dismiss,get selected(){return selected},available:[...markers.keys()],
    destroy(){unsubscribe();overlay.remove();}};
}
