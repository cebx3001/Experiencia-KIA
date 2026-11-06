import * as pc from './studio/vendor/playcanvas.mjs';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),ease=t=>t*t*(3-2*t),vec=(x=0,y=0,z=0)=>new pc.Vec3(x,y,z),copy=v=>vec(v.x,v.y,v.z),interpolate=(a,b,t)=>vec(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,a.z+(b.z-a.z)*t);
// Compatibility adapter: original UI controls the existing studio. Exactly one WebGL application.
export async function mountKiaPlayCanvas({canvas,host,initialAngle=35,onAngleChange=()=>{}}){
 canvas.remove();const iframe=document.createElement('iframe');iframe.title='Estudio dinámico Kia Tasman';iframe.src='./studio/?embed=1'+(new URLSearchParams(location.search).has('quality')?'&quality='+encodeURIComponent(new URLSearchParams(location.search).get('quality')):'');
 Object.assign(iframe.style,{position:'absolute',inset:'0',width:'100%',height:'100%',border:'0',zIndex:'1'});host.prepend(iframe);
 const d=await new Promise((resolve,reject)=>{const started=performance.now();const t=setInterval(()=>{const d=iframe.contentWindow?.__tasmanMaster;if(d?.status==='ready'){clearInterval(t);resolve(d);}else if(d?.status==='error'||performance.now()-started>240000){clearInterval(t);reject(Error(d?.errors?.join()||'Studio loading timeout'));}},100);});
 const {app,model,camera}=d;let baseRadius=10.7,radius=10.7,azimuth=initialAngle*Math.PI/180,inclination=.18,override=null,token=0,cabinOpen=false;
 const defaultTarget=vec(0,1,0),target=copy(defaultTarget),frameListeners=new Set();let lastWidth=host.clientWidth,lastHeight=host.clientHeight;
 function requestRender(){};
 app.on('update',()=>{lastWidth=host.clientWidth;lastHeight=host.clientHeight;if(override){d.setCameraPose({position:[override.position.x,override.position.y,override.position.z],lookAt:[override.lookAt.x,override.lookAt.y,override.lookAt.z],fov:override.fov,interior:cabinOpen});}});
 app.on('postrender',()=>{for(const fn of frameListeners)fn(camera,lastWidth,lastHeight);});
 iframe.contentDocument.querySelector('canvas').addEventListener('pointerdown',()=>{if(override&&cabinOpen){cancel();return;}if(override){const p=camera.getPosition(),look=override.lookAt,diff=p.clone().sub(look);d.setOrbit({azimuth:Math.atan2(diff.x,diff.z),elevation:Math.asin(diff.y/diff.length()),distance:diff.length(),target:[look.x,look.y,look.z]});cancel();}});
  function cancel(){token++;override=null;}
  function animateTo(position,lookAt,fov=42,duration=920,done=null) {
    const id=++token;
    const startPos=copy(camera.getPosition());
    const startLook=copy(override?.lookAt||target);
    const fromFov=camera.camera.fov;
    const endPos=copy(position),endLook=copy(lookAt);
    const began=performance.now();
    function step(now) {
      if(id!==token)return;
      const t=clamp((now-began)/duration,0,1),e=ease(t);
      override={
        position:interpolate(startPos,endPos,e),
        lookAt:interpolate(startLook,endLook,e),
        fov:fromFov+(fov-fromFov)*e
      };
      if(t<1)requestAnimationFrame(step);
      else if(done)done();
    }
    requestAnimationFrame(step);
  }
  function orbitPoint(angle,inc,dist,point) {
    return vec(
      point.x+dist*Math.sin(angle)*Math.cos(inc),
      point.y+dist*Math.sin(inc),
      point.z+dist*Math.cos(angle)*Math.cos(inc)
    );
  }
  function setPose(pose) {
    const positions={
      threequarter:[35,.18],side:[90,.13],front:[0,.08],
      rear:[180,.11],top:[35,1.37]
    };
    const [degrees,inc]=positions[pose]||positions.threequarter;
    const a=degrees*Math.PI/180;
    cabinOpen=false;
    setDoorsOpen(false);
    animateTo(orbitPoint(a,inc,baseRadius,defaultTarget),defaultTarget,42,980,()=>{
      azimuth=a;inclination=inc;radius=baseRadius;
      target.copy(defaultTarget);override=null;d.setOrbit({azimuth:a,elevation:inc,distance:baseRadius,target:[0,1,0]});
    });
  }
  function setAngle(degrees) {
    cancel();cabinOpen=false;azimuth=degrees*Math.PI/180;d.setOrbit({azimuth,elevation:inclination,distance:radius,target:[target.x,target.y,target.z]});
  }
  function resetView(degrees=35) {
    cabinOpen=false;
    setDoorsOpen(false);
    const a=degrees*Math.PI/180;
    animateTo(orbitPoint(a,.18,baseRadius,defaultTarget),defaultTarget,42,820,()=>{
      target.copy(defaultTarget);azimuth=a;inclination=.18;
      radius=baseRadius;override=null;d.setOrbit({azimuth:a,elevation:.18,distance:baseRadius,target:[0,1,0]});
    });
  }
  function setDoorsOpen(open){d.setAllDoors(open);return true;}
  function world(local){
    return copy(local); // Feature coordinates are already normalized GLB meters.
  }
  function enterCabin(detail="interior") {
    if(!model)return;
    cabinOpen=true;
    setDoorsOpen(true);
    const outside=world(vec(-1.66,1.48,.52));
    const inside=world(vec(-.45,1.48,.34));
    const configurations={
      interior:{position:inside,look:world(vec(-.02,1.48,1.48)),fov:42},
      display:{position:world(vec(.06,1.34,.30)),look:world(vec(.06,1.37,1.12)),fov:38},
      infotainment:{position:inside,look:world(vec(.12,1.34,1.28)),fov:38},
      seats:{position:world(vec(-1.45,1.26,.22)),look:world(vec(-.43,1.2,.24)),fov:42}
    };
    const selected=configurations[detail]||configurations.interior;
    const start=copy(camera.getPosition());
    const startLook=copy(override?.lookAt||target);
    const startFov=camera.camera.fov;
    const id=++token;
    const began=performance.now(),duration=detail==="seats"?1050:1650;
    function step(now){
      if(id!==token)return;
      const t=clamp((now-began)/duration,0,1);
      let position,look;
      if(t<.44&&detail!=="seats") {
        const e=ease(t/.44);
        position=interpolate(start,outside,e);
        look=interpolate(startLook,world(vec(-.35,1.38,.75)),e);
      }else{
        const e=ease(detail==="seats"?t:(t-.44)/.56);
        position=interpolate(detail==="seats"?start:outside,selected.position,e);
        look=interpolate(detail==="seats"?startLook:world(vec(-.35,1.38,.75)),selected.look,e);
      }
      override={position,lookAt:look,fov:startFov+(selected.fov-startFov)*ease(t)};
      if(t<1)requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function exitCabin(animate=true){
    cabinOpen=false;setDoorsOpen(false);
    if(animate)resetView();else{cancel();target.copy(defaultTarget);}
  }
  function focusOnPart(position,options={}) {
    if(!position)return;
    cabinOpen=false;setDoorsOpen(false);
    const a=(options.angle??35)*Math.PI/180;
    const elevation=options.elevation??.18;
    const look=copy(position);
    if(options.lookOffset){
      const o=options.lookOffset;
      look.add(vec(o[0],o[1],o[2]));
    }
    const distance=options.closeDistance||baseRadius*(options.radiusFactor||.86);
    const destination=orbitPoint(a,elevation,distance,look);
    animateTo(destination,look,options.fov||42,options.duration||950);
  }
  function getFeatureAnchor(name){
    if(!model)return null;
    if(name==="headlight_front_left")return world(vec(-.77,1.12,2.43));
    const box={min:vec(Infinity,Infinity,Infinity),max:vec(-Infinity,-Infinity,-Infinity)};
    let any=false;
    model.forEach(node=>{
      if(!node.render)return;
      const n=node.name||"";
      const parent=node.parent?.name||"";
      if(!(n===name||n.startsWith(name+"_")||parent===name))return;
      for(const mi of node.render.meshInstances){
        const bounds=mi.aabb,lo=bounds.getMin(),hi=bounds.getMax();
        box.min.x=Math.min(box.min.x,lo.x);box.min.y=Math.min(box.min.y,lo.y);
        box.min.z=Math.min(box.min.z,lo.z);
        box.max.x=Math.max(box.max.x,hi.x);box.max.y=Math.max(box.max.y,hi.y);
        box.max.z=Math.max(box.max.z,hi.z);
        any=true;
      }
    });
    if(!any)return null;
    const middle=interpolate(box.min,box.max,.5);
    if(name==="cargo_bed")middle.y+=(box.max.y-box.min.y)*.3;
    return middle;
  }
  function projectPoint(point){
    const p=camera.camera.worldToScreen(point);
    return {x:p.x,y:p.y,visible:p.x>=0&&p.x<=lastWidth&&p.y>=0&&p.y<=lastHeight};
  }

 const setPaintColor=key=>d.setPaint(key);
 const meshes=[];model.forEach(e=>e.render?.meshInstances.forEach(mi=>meshes.push(mi)));
 const viewer={engine:'playcanvas',app,model,camera,meshCount:meshes.length,texturesBound:meshes.filter(m=>m.material.diffuseMap).length,setAngle,setPose,setDoorsOpen,enterCabin,exitCabin,focusOnPart,resetView,setPaintColor,getFeatureAnchor,projectPoint,requestRender,addFrameListener:fn=>{frameListeners.add(fn);return()=>frameListeners.delete(fn);},getCameraPosition:()=>{const p=camera.getPosition();return[p.x,p.y,p.z];},getRadius:()=>radius,getModel:()=>model,destroy:()=>{app.destroy();iframe.remove();},studio:d};
 window.__kiaPlayCanvasViewer=d;window.__kiaIntegratedViewer=viewer;setPose('threequarter');return viewer;
}



