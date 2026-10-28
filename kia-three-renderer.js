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
  let baseRadius=7,animationId=0,cameraOverride=null,cabinOpen=false;
  // Four independent door pivots are preserved in the original GLB.
  // Mirrored doors swing in opposite directions around their own hinges.
  const doorDefinitions=[
    {name:"door_front_left",open:65},
    {name:"door_rear_left",open:65},
    {name:"door_front_right",open:-65},
    {name:"door_rear_right",open:-65}
  ];
  const doors=[];
  const easing=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
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
      if(cameraOverride){
        camera.position.copy(cameraOverride.position);
        camera.lookAt(cameraOverride.lookAt);
      }else{
        camera.position.set(
          target.x+radius*Math.sin(azimuth)*cos,
          target.y+radius*Math.sin(inclination),
          target.z+radius*Math.cos(azimuth)*cos
        );
        camera.lookAt(target);
      }
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
  function tweenCamera({point,angle,radiusFactor=1,duration=920,endInclination=.16}){
    if(cameraOverride)exitCabin(false);
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
      const eased=easing(t);
      target.copy(from.point).lerp(endPoint,eased);
      azimuth=from.angle+deltaAngle*eased;
      radius=THREE.MathUtils.lerp(from.radius,endRadius,eased);
      inclination=THREE.MathUtils.lerp(from.inclination,endInclination,eased);
      requestRender();
      if(t<1)requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  function setAngle(degrees){
    cancelCameraAnimation();
    if(cameraOverride)exitCabin(false);
    azimuth=degrees*Math.PI/180;
    requestRender();
  }
  function setPose(pose){
    const positions={
      threequarter:{angle:35,inclination:.18},
      side:{angle:90,inclination:.13},
      front:{angle:0,inclination:.08},
      rear:{angle:180,inclination:.11},
      top:{angle:35,inclination:1.37}
    };
    const selected=positions[pose]||positions.threequarter;
    tweenCamera({point:defaultTarget,angle:selected.angle,radiusFactor:1,endInclination:selected.inclination,duration:900});
  }
  let doorAnimationToken=0;
  function setDoorOpen(open,duration=850){
    if(!doors.length)return false;
    const source=doors.map(door=>door.node.rotation.y);
    const destinations=doors.map(door=>door.closed+(open?door.open:0)*Math.PI/180);
    const start=performance.now(),token=++doorAnimationToken;
    function frame(now){
      if(token!==doorAnimationToken)return;
      const t=clamp((now-start)/duration,0,1),e=easing(t);
      for(let index=0;index<doors.length;index++){
        doors[index].node.rotation.y=THREE.MathUtils.lerp(source[index],destinations[index],e);
      }
      requestRender();
      if(t<1)requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return doors.length===4;
  }
  function exitCabin(animate=true){
    if(!cameraOverride&&!cabinOpen)return;
    cabinOpen=false;
    setDoorOpen(false,800);
    if(!animate){
      cameraOverride=null;
      target.copy(defaultTarget);
      return;
    }
    const currentPos=camera.position.clone(),currentLook=(cameraOverride?.lookAt||target).clone();
    const endPos=defaultTarget.clone().add(new THREE.Vector3(Math.sin(azimuth)*baseRadius,.18*baseRadius,Math.cos(azimuth)*baseRadius));
    const endLook=defaultTarget.clone();
    const token=++animationId,start=performance.now();
    function frame(now){
      if(token!==animationId)return;
      const t=clamp((now-start)/850,0,1),e=easing(t);
      cameraOverride={
        position:currentPos.clone().lerp(endPos,e),
        lookAt:currentLook.clone().lerp(endLook,e)
      };
      requestRender();
      if(t<1)requestAnimationFrame(frame);
      else{cameraOverride=null;target.copy(defaultTarget);radius=baseRadius;inclination=.18;requestRender();}
    }
    requestAnimationFrame(frame);
  }
  function enterCabin(detail="interior"){
    if(!model)return;
    cancelCameraAnimation();
    const wasCabin=cabinOpen;
    cabinOpen=true;
    setDoorOpen(true,850);
    model.updateMatrixWorld(true);
    // Source geometry is +Y up, +Z forward and -X is driver's side.
    const cabinPos=model.localToWorld(new THREE.Vector3(-.45,1.48,.34));
    const outside=model.localToWorld(new THREE.Vector3(-1.66,1.48,.52));
    const targets={
      interior:[-.02,1.48,1.48],
      display:[-.14,1.49,1.33],
      infotainment:[.12,1.34,1.28],
      wireless:[.08,1.18,1.05],
      seats:[-.4,1.17,-.42],
      ambient:[.23,1.43,.95],
      walkin:[.46,1.18,-.20],
      xtrek:[.22,1.23,1.10],
      rock:[.22,1.23,1.10]
    };
    const entryLook=model.localToWorld(new THREE.Vector3(...(targets[detail]||targets.interior)));
    const beginning=camera.position.clone();
    const initialLook=(cameraOverride?.lookAt||target).clone();
    const token=++animationId,start=performance.now();
    function frame(now){
      if(token!==animationId)return;
      const t=clamp((now-start)/(wasCabin?650:1720),0,1);
      let position,look;
      if(wasCabin){
        const e=easing(t);
        position=beginning.clone().lerp(cabinPos,e);
        look=initialLook.clone().lerp(entryLook,e);
      }else if(t<.45){
        const e=easing(t/.45);
        position=beginning.clone().lerp(outside,e);
        look=initialLook.clone().lerp(model.localToWorld(new THREE.Vector3(-.4,1.38,.5)),e);
      }else{
        const e=easing((t-.45)/.55);
        position=outside.clone().lerp(cabinPos,e);
        look=model.localToWorld(new THREE.Vector3(-.4,1.38,.5)).lerp(entryLook,e);
      }
      cameraOverride={position,lookAt:look};
      requestRender();
      if(t<1)requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  // Actual close-up camera: unlike the former zoom factor, it can move
  // closer than the orbit's 3 m safety clamp without changing field of view.
  function focusOnPart(position,options={}){
    if(!options.closeDistance){
      const point=defaultTarget.clone().lerp(position,.72);
      tweenCamera({point,angle:options.angle??35,radiusFactor:options.radiusFactor??.88,duration:options.duration??920});
      return;
    }
    const angle=(options.angle??35)*Math.PI/180;
    const elevation=options.elevation??.18;
    const distance=options.closeDistance;
    const lookAt=position.clone();
    const offset=options.lookOffset||[0,0,0];
    lookAt.add(new THREE.Vector3(...offset));
    const direction=new THREE.Vector3(
      Math.sin(angle)*Math.cos(elevation),
      Math.sin(elevation),
      Math.cos(angle)*Math.cos(elevation)
    );
    const goal=lookAt.clone().addScaledVector(direction,distance);
    const source=camera.position.clone();
    const sourceLook=(cameraOverride?.lookAt||target).clone();
    if(cabinOpen){ cabinOpen=false;setDoorOpen(false,750); }
    const token=++animationId,begin=performance.now();
    function frame(now){
      if(token!==animationId)return;
      const t=clamp((now-begin)/(options.duration??950),0,1),e=easing(t);
      cameraOverride={
        position:source.clone().lerp(goal,e),
        lookAt:sourceLook.clone().lerp(lookAt,e)
      };
      requestRender();
      if(t<1)requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  function resetView(degrees=35){
    if(cabinOpen)exitCabin(true);
    else tweenCamera({point:defaultTarget,angle:degrees,radiusFactor:1,duration:820});
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
    if(cameraOverride){
      cameraOverride=null;
      target.copy(defaultTarget);
    }
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
  // Do not tint the entire atlas: Car also contains dark trim and glass.
  // Keep the original texture, normals and physical specular properties.
  // Only warm Tan Beige paint texels in exterior panels are recolored.
  const paintPalette={
    arena:"#ad9271",
    gris:"#4e5961",
    negro:"#10151a",
    verde:"#65736b"
  };
  const paintUniform={value:new THREE.Color(paintPalette.arena)};
  const paintMixUniform={value:0};
  const paintedExterior=new Set([
    "body_details","cabin_body","hood","cargo_bed_sides","tailgate",
    "door_front_left","door_front_right","door_rear_left","door_rear_right"
  ]);
  let paintMeshCount=0;
  let paintShaderMaterial=null;
  model.traverse(object=>{
    if(!object.isMesh)return;
    const parentName=object.parent?.name||"";
    const eligible=[...paintedExterior].some(name=>
      object.name===name||object.name.startsWith(name+"_")||parentName===name);
    if(!eligible)return;
    const source=object.material;
    const paintOne=material=>{
      if(!material||material.name!=="Car"||!material.map)return material;
      if(!paintShaderMaterial){
        const painted=material.clone();
        painted.name="Car · paint-only shader";
        painted.onBeforeCompile=shader=>{
          shader.uniforms.kiaPaintTarget=paintUniform;
          shader.uniforms.kiaPaintBlend=paintMixUniform;
          shader.fragmentShader=shader.fragmentShader.replace(
            "#include <common>",
            "#include <common>\\nuniform vec3 kiaPaintTarget;\\nuniform float kiaPaintBlend;"
          );
          shader.fragmentShader=shader.fragmentShader.replace(
            "#include <map_fragment>",
            `#include <map_fragment>
            // Source baseColor map uses an original warm Tan Beige paint.
            // Greenish, neutral, nearly black, red and transparent texels
            // do NOT receive a color transformation.
            vec3 kiaSource=diffuseColor.rgb;
            float kiaWarmMask=
              smoothstep(0.008,0.045,kiaSource.r-kiaSource.g)*
              smoothstep(0.006,0.032,kiaSource.g-kiaSource.b);
            float kiaLuma=dot(kiaSource,vec3(0.2126,0.7152,0.0722));
            kiaWarmMask*=smoothstep(0.035,0.105,kiaLuma);
            float kiaShade=clamp(kiaLuma/0.33,0.26,1.60);
            diffuseColor.rgb=mix(
              kiaSource,
              kiaPaintTarget*kiaShade,
              kiaPaintBlend*kiaWarmMask
            );`
          );
        };
        painted.customProgramCacheKey=()=>"kia-paint-selective-v2";
        painted.needsUpdate=true;
        paintShaderMaterial=painted;
      }
      paintMeshCount++;
      return paintShaderMaterial;
    };
    object.material=Array.isArray(source)?source.map(paintOne):paintOne(source);
  });
  debug.paintMeshCount=paintMeshCount;
  debug.paintMode="warm-texel-selective-PBR";
  debug.paintApplied="arena";
  function setPaintColor(name){
    if(!Object.hasOwn(paintPalette,name))return false;
    paintUniform.value.set(paintPalette[name]);
    paintMixUniform.value=name==="arena"?0:1;
    debug.paintApplied=name;
    requestRender();
    return paintMeshCount>0;
  }

  scene.add(model);
  for(const definition of doorDefinitions){
    const node=model.getObjectByName(definition.name);
    if(node)doors.push({name:definition.name,node,open:definition.open,closed:node.rotation.y});
  }
  debug.doorAvailable=doors.length===4;
  debug.doorName=doors.map(item=>item.name).join(", ");
  debug.doorNames=doors.map(item=>item.name);
  debug.getDoorDegrees=()=>doors.find(item=>item.name==="door_front_left")
    ? (doors.find(item=>item.name==="door_front_left").node.rotation.y-doors.find(item=>item.name==="door_front_left").closed)*180/Math.PI : null;
  debug.getAllDoorDegrees=()=>Object.fromEntries(doors.map(item=>[item.name,
    (item.node.rotation.y-item.closed)*180/Math.PI]));
  debug.isInCabin=()=>cabinOpen;
  debug.modelAnimations=gltf.animations?.map(a=>a.name)||[];
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
    setAngle,setPose,enterCabin,exitCabin,focusOnPart,resetView,setPaintColor,getFeatureAnchor,projectPoint,requestRender,
    addFrameListener:listener=>{frameListeners.add(listener);requestRender();return ()=>frameListeners.delete(listener);},
    getCameraPosition:()=>camera.position.toArray(),
    getRadius:()=>radius,
    getModel:()=>model
  };
}
