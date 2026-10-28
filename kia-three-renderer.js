import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

// Same renderer and lighting as the independently tested Kia 3D viewer.
// The production interface owns the HTML canvas and the camera controls.
export async function mountKiaThree({canvas,host,assetUrl,initialAngle=35,onAngleChange=()=>{}}){
  if(!canvas||!host)throw new Error("3D canvas unavailable");
  canvas.hidden=false;
  canvas.style.visibility="hidden";
  const renderer=new THREE.WebGLRenderer({
    canvas,alpha:true,antialias:false,powerPreference:"high-performance",
    preserveDrawingBuffer:false
  });
  renderer.setClearColor(0x000000,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));

  const scene=new THREE.Scene();
  scene.background=null;
  const camera=new THREE.PerspectiveCamera(42,1,0.08,300);
  scene.add(new THREE.HemisphereLight(0xffffff,0x424952,2.0));
  const key=new THREE.DirectionalLight(0xffffff,2.1);
  key.position.set(3,7,5);
  scene.add(key);
  const fill=new THREE.DirectionalLight(0xdceaff,0.75);
  fill.position.set(-4,3,-4);
  scene.add(fill);

  let azimuth=initialAngle*Math.PI/180, inclination=.18, radius=7, model=null;
  const target=new THREE.Vector3(0,1,0);
  const defaultTarget=new THREE.Vector3(0,1,0);
  let baseRadius=7,animationId=0;
  const frameListeners=new Set();
  let frameRequested=false,lastWidth=0,lastHeight=0;
  const pointers=new Map();
  let previousPinch=0;
  const debug=window.__kiaThreeViewer={engine:"three",status:"loading",asset:assetUrl,meshCount:0,opaqueCorrected:[],error:null};
  function requestRender(){
    if(frameRequested)return;
    frameRequested=true;
    requestAnimationFrame(()=>{
      frameRequested=false;
      const width=Math.max(1,Math.round(host.clientWidth));
      const height=Math.max(1,Math.round(host.clientHeight));
      if(width!==lastWidth||height!==lastHeight){
        lastWidth=width;lastHeight=height;
        renderer.setSize(width,height,false);
        camera.aspect=width/height;
        camera.updateProjectionMatrix();
      }
      const cos=Math.cos(inclination);
      camera.position.set(
        target.x+radius*Math.sin(azimuth)*cos,
        target.y+radius*Math.sin(inclination),
        target.z+radius*Math.cos(azimuth)*cos
      );
      camera.lookAt(target);
      renderer.render(scene,camera);
      for(const listener of frameListeners)listener(camera,width,height);
    });
  }
  const observer=new ResizeObserver(requestRender);
  observer.observe(host);
  window.addEventListener("resize",requestRender);
  window.addEventListener("orientationchange",requestRender);
  canvas.addEventListener("webglcontextrestored",requestRender);

  const cancelCameraAnimation=()=>{animationId++;};
  function tweenCamera({point,angle,radiusFactor=1,duration=920}){
    cancelCameraAnimation();
    const token=animationId;
    const from={point:target.clone(),angle:azimuth,radius,inclination};
    const endPoint=point.clone();
    const endAngle=angle*Math.PI/180;
    const deltaAngle=Math.atan2(Math.sin(endAngle-azimuth),Math.cos(endAngle-azimuth));
    const endRadius=THREE.MathUtils.clamp(baseRadius*radiusFactor,3,25);
    const start=performance.now();
    function tick(now){
      if(token!==animationId)return;
      const t=THREE.MathUtils.clamp((now-start)/duration,0,1);
      const eased=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
      target.copy(from.point).lerp(endPoint,eased);
      azimuth=from.angle+deltaAngle*eased;
      radius=THREE.MathUtils.lerp(from.radius,endRadius,eased);
      inclination=THREE.MathUtils.lerp(from.inclination,.16,eased);
      requestRender();
      if(t<1)requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  function setAngle(degrees){
    cancelCameraAnimation();
    azimuth=degrees*Math.PI/180;
    requestRender();
  }
  function focusOnPart(position,options={}){
    const point=defaultTarget.clone().lerp(position,.72);
    tweenCamera({point,angle:options.angle??35,radiusFactor:options.radiusFactor??.88,duration:options.duration??920});
  }
  function resetView(degrees=35){
    tweenCamera({point:defaultTarget,angle:degrees,radiusFactor:1,duration:820});
  }
  function getFeatureAnchor(id){
    if(!model)return null;
    const all=[];
    model.traverse(object=>{
      if(!object.isMesh)return;
      const name=object.name||"";
      if(name===id||name===id+"_mesh"||name===id+"_geometry"||name.startsWith(id+"_")){
        all.push(object);
      }
    });
    if(!all.length)return null;
    const box=new THREE.Box3().makeEmpty();
    for(const object of all)box.union(new THREE.Box3().setFromObject(object));
    if(box.isEmpty())return null;
    const point=box.getCenter(new THREE.Vector3());
    const size=box.getSize(new THREE.Vector3());
    if(id==="front_fascia")point.z+=size.z*.22;
    if(id==="interior")point.y+=size.y*.15;
    if(id==="cargo_bed")point.y+=size.y*.3;
    return point;
  }
  function projectPoint(point){
    const projected=point.clone().project(camera);
    return {x:(projected.x+1)*.5*lastWidth,y:(1-projected.y)*.5*lastHeight,
      visible:projected.z>=-1&&projected.z<=1&&lastWidth>0&&lastHeight>0};
  }
  const clamp=THREE.MathUtils.clamp;
  canvas.addEventListener("pointerdown",event=>{
    cancelCameraAnimation();
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove",event=>{
    const old=pointers.get(event.pointerId);
    if(!old)return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size===1){
      // The existing mobile presentation rotates its full layout by 90 degrees
      // when a phone is held in portrait: convert touch delta to local axes.
      const portrait=window.matchMedia("(orientation:portrait)").matches;
      const dx=portrait?event.clientY-old.y:event.clientX-old.x;
      const dy=portrait?old.x-event.clientX:event.clientY-old.y;
      azimuth+=dx*.009;
      inclination=clamp(inclination+dy*.004,-.26,.48);
      requestRender();
      onAngleChange(azimuth*180/Math.PI);
    }else if(pointers.size===2){
      const pair=[...pointers.values()];
      const distance=Math.hypot(pair[0].x-pair[1].x,pair[0].y-pair[1].y);
      if(previousPinch>0){
        radius=clamp(radius*previousPinch/Math.max(1,distance),3.5,25);
        requestRender();
      }
      previousPinch=distance;
    }
  });
  for(const type of ["pointerup","pointercancel","lostpointercapture"]){
    canvas.addEventListener(type,event=>{
      pointers.delete(event.pointerId);
      if(pointers.size<2)previousPinch=0;
    });
  }
  canvas.addEventListener("wheel",event=>{
    event.preventDefault();
    radius=clamp(radius*(event.deltaY>0?1.09:.91),3.5,25);
    requestRender();
  },{passive:false});

  requestRender();
  const decoder=new DRACOLoader();
  decoder.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
  const loader=new GLTFLoader();
  loader.setDRACOLoader(decoder);
  const gltf=await new Promise((resolve,reject)=>loader.load(assetUrl,resolve,undefined,reject));
  model=gltf.scene;

  // VERIFIED FIX: The exported GLB marks both complete body and interior
  // as alphaMode BLEND. This makes solid doors/panels vanish as viewing order
  // changes. Treat those materials as OPAQUE; no geometry or texture edits.
  const corrected=new Set();
  model.traverse(object=>{
    if(!object.isMesh)return;
    for(const mat of Array.isArray(object.material)?object.material:[object.material]){
      if(!mat||corrected.has(mat))continue;
      if(mat.name!=="Car"&&mat.name!=="Interior")continue;
      corrected.add(mat);
      debug.opaqueCorrected.push(mat.name);
      mat.transparent=false;
      mat.opacity=1;
      mat.alphaTest=0;
      mat.depthWrite=true;
      mat.depthTest=true;
      mat.needsUpdate=true;
    }
  });
  scene.add(model);
  const bounds=new THREE.Box3().setFromObject(model);
  const size=bounds.getSize(new THREE.Vector3());
  target.copy(bounds.getCenter(new THREE.Vector3()));
  defaultTarget.copy(target);
  const verticalFov=camera.fov*Math.PI/180;
  const aspect=Math.max(.2,host.clientWidth/Math.max(1,host.clientHeight));
  const horizontalFov=2*Math.atan(Math.tan(verticalFov/2)*aspect);
  const effectiveWidth=Math.hypot(size.x,size.z);
  radius=Math.max(size.y/(2*Math.tan(verticalFov/2)),effectiveWidth/(2*Math.tan(horizontalFov/2)))*1.15;
  radius=clamp(radius,4,23);
  baseRadius=radius;

  let meshCount=0,texturesBound=0;
  const uniqueTextures=new Set();
  model.traverse(object=>{
    if(!object.isMesh)return;
    meshCount++;
    for(const mat of Array.isArray(object.material)?object.material:[object.material]){
      if(!mat)continue;
      for(const key of ["map","normalMap","metalnessMap","roughnessMap","emissiveMap"]){
        if(mat[key])uniqueTextures.add(mat[key]);
      }
      if(mat.map)texturesBound++;
    }
  });
  debug.meshCount=meshCount;
  debug.texturesBound=texturesBound;
  debug.textureObjects=uniqueTextures.size;
  debug.status="loaded";
  requestRender();
  canvas.style.visibility="visible";
  decoder.dispose();
  return {
    engine:"three",model,camera,renderer,scene,meshCount,texturesBound,
    setAngle,resetView,focusOnPart,getFeatureAnchor,projectPoint,requestRender,
    addFrameListener:listener=>{frameListeners.add(listener);requestRender();return ()=>frameListeners.delete(listener);},
    getCameraPosition:()=>camera.position.toArray(),
    getRadius:()=>radius,
    getModel:()=>model
  };
}
