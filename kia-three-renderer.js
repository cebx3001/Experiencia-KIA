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
      const desiredFov=cameraOverride?.fov??42;
      if(Math.abs(camera.fov-desiredFov)>.005){
        camera.fov=desiredFov;
        camera.updateProjectionMatrix();
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
  let doorIntentOpen=false;
  let doorAudioContext=null;
  let doorNoise=null;
  const doorAudioDebug=debug.doorAudio={openCount:0,closeCount:0,source:"original Web Audio vehicle-door foley",status:"idle"};
  // Self-contained foley: latch, mechanical hinge, and low-frequency closing
  // thump. No external hotlinks, license or mobile network dependency.
  function playDoorSound(open,duration){
    const Context=window.AudioContext||window.webkitAudioContext;
    if(!Context)return;
    try{
      if(!doorAudioContext)doorAudioContext=new Context();
      if(doorAudioContext.state==="suspended")doorAudioContext.resume().catch(()=>{});
      const ctx=doorAudioContext,rate=ctx.sampleRate;
      if(!doorNoise){
        doorNoise=ctx.createBuffer(1,Math.ceil(rate*1.2),rate);
        const samples=doorNoise.getChannelData(0);
        let seed=731453;
        for(let i=0;i<samples.length;i++){
          seed=(Math.imul(seed,1664525)+1013904223)|0;
          samples[i]=((seed>>>0)/2147483648-1)*.82;
        }
      }
      const origin=ctx.currentTime+.012;
      function noise(at,seconds,frequency,peak,cutoff=1400){
        const source=ctx.createBufferSource();
        source.buffer=doorNoise;
        const band=ctx.createBiquadFilter();
        band.type="bandpass";
        band.frequency.value=frequency;
        band.Q.value=Math.max(.4,frequency/cutoff);
        const envelope=ctx.createGain();
        envelope.gain.setValueAtTime(.0001,at);
        envelope.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),at+.011);
        envelope.gain.exponentialRampToValueAtTime(.0001,at+seconds);
        source.connect(band).connect(envelope).connect(ctx.destination);
        source.start(at);
        source.stop(at+seconds+.02);
      }
      function thump(at,frequency,peak){
        const source=ctx.createOscillator();
        source.type="triangle";
        source.frequency.setValueAtTime(frequency*1.55,at);
        source.frequency.exponentialRampToValueAtTime(frequency,at+.085);
        const gain=ctx.createGain();
        gain.gain.setValueAtTime(peak,at);
        gain.gain.exponentialRampToValueAtTime(.0001,at+.17);
        source.connect(gain).connect(ctx.destination);
        source.start(at);source.stop(at+.18);
      }
      if(open){
        noise(origin,.085,1350,.17);
        noise(origin+.085,.52,340,.07,650);
        noise(origin+Math.min(.68,duration/1000*.86),.07,950,.105);
        doorAudioDebug.openCount++;
      }else{
        noise(origin,.30,460,.045);
        const impact=origin+Math.max(.27,duration/1000*.76);
        thump(impact,115,.14);
        noise(impact,.11,1000,.15);
        noise(impact+.015,.06,1700,.09);
        doorAudioDebug.closeCount++;
      }
      doorAudioDebug.status="playing";
    }catch(error){
      doorAudioDebug.status="unavailable";
      console.warn("Door foley is unavailable",error);
    }
  }
  function setDoorOpen(open,duration=850){
    if(!doors.length)return false;
    if(open===doorIntentOpen)return doors.length===4;
    doorIntentOpen=open;
    playDoorSound(open,duration);
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
      seats:[-.4,1.17,-.42]
    };
    // Seat annotation is intentionally viewed FROM OUTSIDE through the open
    // front door: frame the full seats, not just headrests or the dashboard.
    if(detail==="seats"){
      // Full driver's seat, viewed through the opened left door.
      // Move the lens forwards relative to the previous position and aim
      // at the seat cushion/back together, not rear headrests/dashboard.
      const seatPos=model.localToWorld(new THREE.Vector3(-1.64,1.37,.92));
      const seatLook=model.localToWorld(new THREE.Vector3(-.43,1.10,.21));
      const seatInitialFov=camera.fov;
      const from=camera.position.clone(),fromLook=(cameraOverride?.lookAt||target).clone();
      const token=++animationId,start=performance.now();
      function seatFrame(now){
        if(token!==animationId)return;
        const t=clamp((now-start)/1120,0,1),e=easing(t);
        cameraOverride={
          position:from.clone().lerp(seatPos,e),
          lookAt:fromLook.clone().lerp(seatLook,e),
          fov:THREE.MathUtils.lerp(seatInitialFov,49,e)
        };
        requestRender();
        if(t<1)requestAnimationFrame(seatFrame);
      }
      requestAnimationFrame(seatFrame);
      return;
    }
    if(detail==="display"){
      // Direct, nearly frontal cockpit view: whole panoramic display occupies
      // the frame, rather than the former oblique side shot of the dashboard.
      // Approach via the opened driver's door before entering camera space.
      const screenPos=model.localToWorld(new THREE.Vector3(.06,1.34,.30));
      const screenTarget=model.localToWorld(new THREE.Vector3(.06,1.37,1.12));
      const startPos=camera.position.clone();
      const startLook=(cameraOverride?.lookAt||target).clone();
      const initialFov=camera.fov;
      const token=++animationId,start=performance.now();
      const duration=wasCabin?750:1700;
      function screenFrame(now){
        if(token!==animationId)return;
        const t=clamp((now-start)/duration,0,1);
        let position,look;
        if(!wasCabin&&t<.40){
          const e=easing(t/.40);
          position=startPos.clone().lerp(outside,e);
          look=startLook.clone().lerp(model.localToWorld(new THREE.Vector3(-.35,1.35,.75)),e);
        }else{
          const e=easing(wasCabin?t:(t-.40)/.60);
          const entryFrom=wasCabin?startPos:outside;
          const lookFrom=wasCabin?startLook:model.localToWorld(new THREE.Vector3(-.35,1.35,.75));
          position=entryFrom.clone().lerp(screenPos,e);
          look=lookFrom.clone().lerp(screenTarget,e);
        }
        cameraOverride={
          position,
          lookAt:look,
          fov:THREE.MathUtils.lerp(initialFov,38,easing(t))
        };
        requestRender();
        if(t<1)requestAnimationFrame(screenFrame);
      }
      debug.lastCameraDetail="display";
      requestAnimationFrame(screenFrame);
      return;
    }
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
    const initialFov=camera.fov;
    if(cabinOpen){ cabinOpen=false;setDoorOpen(false,750); }
    const token=++animationId,begin=performance.now();
    function frame(now){
      if(token!==animationId)return;
      const t=clamp((now-begin)/(options.duration??950),0,1),e=easing(t);
      cameraOverride={
        position:source.clone().lerp(goal,e),
        lookAt:sourceLook.clone().lerp(lookAt,e),
        fov:THREE.MathUtils.lerp(initialFov,options.fov??42,e)
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
    if(id==="headlight_front_left"){
      // The fascia mesh combines both headlamps and grille. Aim directly at
      // the left lamp in world space, not the full fascia bounding-box center.
      return model.localToWorld(new THREE.Vector3(-.77,1.12,2.43));
    }
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
    "body_details","cabin_body","hood","windshield","cargo_bed_sides","tailgate",
    "door_front_left","door_front_right","door_rear_left","door_rear_right"
  ]);
  let paintMeshCount=0;
  let paintShaderMaterial=null;
  let paintHoodMaterial=null;
  let paintWindshieldMaterial=null;
  model.traverse(object=>{
    if(!object.isMesh)return;
    const parentName=object.parent?.name||"";
    const eligible=[...paintedExterior].some(name=>
      object.name===name||object.name.startsWith(name+"_")||parentName===name);
    if(!eligible)return;
    const source=object.material;
    const isHood=object.name==="hood_mesh"||object.name==="hood"||parentName==="hood";
    const isWindshield=object.name==="windshield_mesh"||object.name==="windshield"||parentName==="windshield";
    const paintOne=material=>{
      if(!material||material.name!=="Car"||!material.map)return material;
      if((isHood&&!paintHoodMaterial)||
         (isWindshield&&!paintWindshieldMaterial)||
         (!isHood&&!isWindshield&&!paintShaderMaterial)){
        const painted=material.clone();
        painted.name="Car · paint-only shader";
        painted.onBeforeCompile=shader=>{
          shader.uniforms.kiaPaintTarget=paintUniform;
          shader.uniforms.kiaPaintBlend=paintMixUniform;
          shader.vertexShader=shader.vertexShader.replace(
            "#include <common>",
            "#include <common>\nvarying vec3 vKiaWorldPos;\nvarying vec3 vKiaWorldNormal;"
          );
          shader.vertexShader=shader.vertexShader.replace(
            "#include <begin_vertex>",
            "#include <begin_vertex>\nvKiaWorldPos=(modelMatrix*vec4(position,1.0)).xyz;\nvKiaWorldNormal=normalize(mat3(modelMatrix)*normal);"
          );
          shader.fragmentShader=shader.fragmentShader.replace(
            "#include <common>",
            "#include <common>\nvarying vec3 vKiaWorldPos;\nvarying vec3 vKiaWorldNormal;\nuniform vec3 kiaPaintTarget;\nuniform float kiaPaintBlend;"
          );
          shader.fragmentShader=shader.fragmentShader.replace(
            "#include <map_fragment>",
            `#include <map_fragment>
            // Source baseColor map uses an original warm Tan Beige paint.
            // Greenish, neutral, nearly black, red and transparent texels
            // do NOT receive a color transformation.
            vec3 kiaSource=diffuseColor.rgb;
            // Actual paint atlas contains near-neutral sand beige: R≈G>B.
            // Detect warm B-deficit rather than requiring a large R-G gap.
            // Gray/black trim has G≈B, red lamps have G≈B.
            float kiaWarmMask=
              smoothstep(-0.028,0.002,kiaSource.r-kiaSource.g)*
              smoothstep(0.024,0.068,kiaSource.g-kiaSource.b)*
              smoothstep(0.055,0.125,kiaSource.g);
            float kiaLuma=dot(kiaSource,vec3(0.2126,0.7152,0.0722));
            // The single hood mesh is a separate paint surface whose
            // baked atlas island is near-neutral, so allow its brighter
            // texels in addition to the warm-sand detection above.
            ${isHood?"kiaWarmMask=max(kiaWarmMask,smoothstep(0.055,0.18,kiaLuma));":""}
            // Raycast confirmed broad bonnet pixels in windshield_mesh
            // (source mesh naming is misleading). Only target its upward
            // horizontal front surface, never the actual window glass.
            float kiaBonnetRegion=
              smoothstep(0.88,1.13,vKiaWorldPos.y)*
              (1.0-smoothstep(1.52,1.76,vKiaWorldPos.y))*
              smoothstep(0.93,1.28,vKiaWorldPos.z)*
              (1.0-smoothstep(2.30,2.58,vKiaWorldPos.z))*
              (1.0-smoothstep(0.78,1.02,abs(vKiaWorldPos.x)))*
              smoothstep(0.18,0.58,abs(vKiaWorldNormal.y));
            ${isWindshield
              ?"kiaWarmMask=kiaBonnetRegion*smoothstep(0.085,0.19,kiaLuma);"
              :"kiaWarmMask=max(kiaWarmMask,kiaBonnetRegion*smoothstep(0.085,0.19,kiaLuma));"}
            float kiaShade=clamp(kiaLuma/0.33,0.26,1.60);
            diffuseColor.rgb=mix(
              kiaSource,
              kiaPaintTarget*kiaShade,
              kiaPaintBlend*kiaWarmMask
            );`
          );
        };
        painted.customProgramCacheKey=()=>isWindshield?"kia-windshield-bonnet-v7":(isHood?"kia-hood-v7":"kia-body-v7");
        painted.needsUpdate=true;
        if(isWindshield)paintWindshieldMaterial=painted;
        else if(isHood)paintHoodMaterial=painted;
        else paintShaderMaterial=painted;
      }
      paintMeshCount++;
      return isWindshield?paintWindshieldMaterial:(isHood?paintHoodMaterial:paintShaderMaterial);
    };
    object.material=Array.isArray(source)?source.map(paintOne):paintOne(source);
  });
  debug.paintMeshCount=paintMeshCount;
  debug.hoodPaintMaterialReady=!!paintHoodMaterial;
  debug.bonnetPaintMaterialReady=!!paintWindshieldMaterial;
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
  // Read-only diagnostic: raycast the visible surface so a hood paint fix
  // can target the actual GLB mesh instead of guessing by node names.
  debug.probeAtNDC=(nx,ny)=>{
    if(!model||!Number.isFinite(nx)||!Number.isFinite(ny))return [];
    const probeRay=new THREE.Raycaster();
    camera.updateMatrixWorld(true);
    model.updateMatrixWorld(true);
    probeRay.setFromCamera(new THREE.Vector2(nx,ny),camera);
    const hits=probeRay.intersectObject(model,true);
    return hits.slice(0,3).map(hit=>({
      mesh:hit.object.name,
      parent:hit.object.parent?.name||null,
      material:Array.isArray(hit.object.material)?hit.object.material.map(m=>m.name):hit.object.material?.name,
      point:hit.point.toArray().map(v=>+v.toFixed(4)),
      uv:hit.uv?.toArray().map(v=>+v.toFixed(4)),
      distance:+hit.distance.toFixed(3),
      faceNormal:hit.face?.normal?.toArray().map(v=>+v.toFixed(4))
    }));
  };
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
