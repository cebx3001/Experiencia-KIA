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
    });
  }
  const observer=new ResizeObserver(requestRender);
  observer.observe(host);
  window.addEventListener("resize",requestRender);
  window.addEventListener("orientationchange",requestRender);
  canvas.addEventListener("webglcontextrestored",requestRender);

  function setAngle(degrees){
    azimuth=degrees*Math.PI/180;
    requestRender();
  }
  const clamp=THREE.MathUtils.clamp;
  canvas.addEventListener("pointerdown",event=>{
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
  const verticalFov=camera.fov*Math.PI/180;
  const aspect=Math.max(.2,host.clientWidth/Math.max(1,host.clientHeight));
  const horizontalFov=2*Math.atan(Math.tan(verticalFov/2)*aspect);
  const effectiveWidth=Math.hypot(size.x,size.z);
  radius=Math.max(size.y/(2*Math.tan(verticalFov/2)),effectiveWidth/(2*Math.tan(horizontalFov/2)))*1.15;
  radius=clamp(radius,4,23);

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
    setAngle,requestRender,
    getCameraPosition:()=>camera.position.toArray(),
    getRadius:()=>radius,
    getModel:()=>model
  };
}
