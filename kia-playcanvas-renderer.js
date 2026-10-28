import * as pc from "playcanvas";

// KIA TASMAN — native PlayCanvas automotive studio.
// The HTML/CSS interface is unchanged; only the 3D rendering engine is replaced.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const ease=t=>t*t*(3-2*t);
const vec=(x=0,y=0,z=0)=>new pc.Vec3(x,y,z);
const copy=v=>new pc.Vec3(v.x,v.y,v.z);
const interpolate=(a,b,t)=>vec(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,a.z+(b.z-a.z)*t);
const palette={arena:[.72,.61,.47],gris:[.36,.41,.45],negro:[.085,.105,.12],verde:[.42,.49,.43]};

// The reflection environment is deliberately NOT displayed as a photo.
// Four high-contrast softbox shapes provide realistic controlled body reflections.
function makeStudioEnvironment(device) {
  const canvas=document.createElement("canvas");
  canvas.width=1024;canvas.height=512;
  const c=canvas.getContext("2d");
  const grad=c.createLinearGradient(0,0,0,512);
  grad.addColorStop(0,"#c4ccd3");
  grad.addColorStop(.28,"#879199");
  grad.addColorStop(.50,"#414a53");
  grad.addColorStop(.75,"#252e35");
  grad.addColorStop(1,"#788089");
  c.fillStyle=grad;c.fillRect(0,0,1024,512);
  const boxes=[
    [74,112,160,190,1],[360,72,120,260,.91],[678,98,230,145,.88],
    [914,105,86,205,.7],[505,260,95,115,.46]
  ];
  for(const [x,y,w,h,power] of boxes) {
    const glow=c.createRadialGradient(x+w/2,y+h/2,5,x+w/2,y+h/2,Math.max(w,h)*1.16);
    glow.addColorStop(0,"rgba(255,255,255,"+(.38*power)+")");
    glow.addColorStop(1,"rgba(255,255,255,0)");
    c.fillStyle=glow;c.fillRect(x-w,y-h,w*3,h*3);
    c.fillStyle="rgba(240,246,255,"+(.93*power)+")";
    c.fillRect(x,y,w,h);
  }
  const source=new pc.Texture(device,{
    name:"Kia Studio Softboxes",width:1024,height:512,
    format:pc.PIXELFORMAT_RGBA8,mipmaps:true
  });
  source.setSource(canvas);
  const lighting=pc.EnvLighting.generateLightingSource(source);
  const atlas=pc.EnvLighting.generateAtlas(lighting);
  lighting.destroy();
  return {atlas,source};
}

export async function mountKiaPlayCanvas({
  canvas,host,assetUrl,initialAngle=35,onAngleChange=()=>{}
}) {
  if(!canvas||!host)throw new Error("Kia 3D canvas not found");
  canvas.hidden=false;
  canvas.style.visibility="hidden";
  const mobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const app=new pc.Application(canvas,{graphicsDeviceOptions:{
    alpha:true,antialias:true,powerPreference:"high-performance",
    preserveDrawingBuffer:false
  }});
  app.graphicsDevice.maxPixelRatio=Math.min(window.devicePixelRatio||1,mobile?1.35:1.75);
  app.setCanvasFillMode(pc.FILLMODE_NONE);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  app.scene.ambientLight=new pc.Color(.20,.22,.24);
  app.scene.exposure=1.0;
  app.scene.skyboxIntensity=1.0;
  app.scene.skybox=null;
  let environment=null;
  try {
    environment=makeStudioEnvironment(app.graphicsDevice);
    app.scene.envAtlas=environment.atlas;
  } catch(error) {
    console.warn("Studio IBL unavailable; using calibrated studio lights",error);
  }

  const camera=new pc.Entity("Kia Studio Camera");
  camera.addComponent("camera",{
    fov:42,nearClip:.06,farClip:300,
    clearColor:new pc.Color(0,0,0,0),
    priority:0
  });
  camera.camera.toneMapping=pc.TONEMAP_ACES; // Plain output until CameraFrame is enabled.
  app.root.addChild(camera);

  function light(name,type,color,intensity,rotation,shadow=false) {
    const entity=new pc.Entity(name);
    entity.addComponent("light",{
      type,color:new pc.Color(...color),intensity,castShadows:shadow,
      shadowResolution:mobile?1024:2048,shadowDistance:24,
      shadowBias:.045,normalOffsetBias:.012,
      shadowType:pc.SHADOW_PCF5_32F
    });
    entity.setEulerAngles(...rotation);
    app.root.addChild(entity);
    return entity;
  }
  const shadowKey=light("Studio key / floor contact","directional",[1,.98,.96],1.35,[42,35,0],true);
  // PCSS is contact-hardening: wheels stay grounded; lifted shadows soften.
  // The engine automatically falls back to PCF on devices without support.
  if(!mobile){
    shadowKey.light.shadowType=pc.SHADOW_PCSS_32F;
    shadowKey.light.penumbraSize=1.7;
    shadowKey.light.penumbraFalloff=1.15;
    shadowKey.light.shadowSamples=16;
    shadowKey.light.shadowBlockerSamples=12;
  }
  light("Subtle blue fill","directional",[.88,.93,1],.35,[28,-120,0]);
  light("Subtle rear rim","directional",[1,.96,.90],.40,[-25,150,0]);
  // The real HDR studio, not extra directionals, provides softbox reflections.

  pc.dracoInitialize({
    jsUrl:"https://www.gstatic.com/draco/versioned/decoders/1.5.7/draco_wasm_wrapper.js",
    wasmUrl:"https://www.gstatic.com/draco/versioned/decoders/1.5.7/draco_decoder.wasm",
    lazyInit:true,numWorkers:2
  });

  let model=null,baseRadius=7,radius=7,azimuth=initialAngle*Math.PI/180;
  let inclination=.18,override=null,token=0,cabinOpen=false,doorsOpened=false;
  let currentPaint="arena",meshCount=0,texturesBound=0;
  const target=vec(0,1,0),defaultTarget=vec(0,1,0);
  const doorMap=[
    ["door_front_left",65],["door_rear_left",65],
    ["door_front_right",-65],["door_rear_right",-65]
  ];
  const doors=[],painted=[],frameListeners=new Set(),pointers=new Map();
  let lastWidth=0,lastHeight=0,pinch=0;
  const debug=window.__kiaPlayCanvasViewer={
    engine:"playcanvas",status:"loading",asset:assetUrl,
    meshCount:0,texturesBound:0,doorsFound:[],materialCorrections:[],
    lighting:"loading Poly Haven Studio Small 08 HDR / PCSS shadow system",
    hdriStatus:"pending",hdriUrl:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr",
    postProcess:"pending",
    paintMode:"texture-preserving PBR tint",error:null
  };

  debug.postProcess=studioCameraFrame?"CameraFrame: HDR / TAA / SSAO / restrained grading":"ACES camera fallback";
  let studioCubemap=null;
  const studioHdrUrl=debug.hdriUrl;
  // Keep the actual photographic environment INVISIBLE. It exists only
  // in reflection and PBR lighting, not as a scenic backdrop.
  app.assets.loadFromUrl(studioHdrUrl,"texture",(error,hdrAsset)=>{
    if(error||!hdrAsset?.resource){
      debug.hdriStatus="fallback-procedural";
      console.warn("Studio Small 08 HDR unavailable; using local softbox fallback",error);
      return;
    }
    try {
      const hdr=hdrAsset.resource;
      studioCubemap=pc.EnvLighting.generateSkyboxCubemap(hdr);
      const lighting=pc.EnvLighting.generateLightingSource(hdr);
      const hdrAtlas=pc.EnvLighting.generateAtlas(lighting);
      lighting.destroy();
      app.scene.envAtlas=hdrAtlas;
      app.scene.skybox=null;
      app.scene.skyboxIntensity=1.0;
      if(environment){ environment.atlas.destroy();environment.source.destroy(); }
      environment={atlas:hdrAtlas,source:hdr};
      // Sharp studio strips on the clear coat; blurred levels on base paint.
      for(const item of painted){
        item.material.envAtlas=hdrAtlas;
        item.material.cubeMap=studioCubemap;
        item.material.update();
      }
      debug.hdriStatus="loaded-hdr";
      debug.lighting="Studio Small 08 1K HDR / prefiltered IBL + PCSS/PCF contact shadows";
    }catch(error){
      debug.hdriStatus="fallback-conversion-failed";
      console.warn("HDR environment conversion failed, using procedural IBL",error);
    }
  });

  function applyCamera() {
    if(override) {
      camera.setPosition(override.position);
      camera.lookAt(override.lookAt);
      camera.camera.fov=override.fov||42;
    } else {
      const c=Math.cos(inclination);
      camera.setPosition(
        target.x+radius*Math.sin(azimuth)*c,
        target.y+radius*Math.sin(inclination),
        target.z+radius*Math.cos(azimuth)*c
      );
      camera.lookAt(target);
      camera.camera.fov=42;
    }
  }
  function resize() {
    const width=Math.max(1,host.clientWidth);
    const height=Math.max(1,host.clientHeight);
    if(width===lastWidth&&height===lastHeight)return;
    lastWidth=width;lastHeight=height;
    app.resizeCanvas(width,height);
  }
  function requestRender(){resize();applyCamera();}
  const observer=new ResizeObserver(resize);
  observer.observe(host);
  window.addEventListener("resize",resize);
  window.addEventListener("orientationchange",resize);
  app.on("update",()=>{resize();applyCamera();});
  app.scene.on("postrender",()=>{
    for(const fn of frameListeners)fn(camera,lastWidth,lastHeight);
  });
  // HDR camera pipeline. The photographic look is a camera/render pipeline,
  // not a pile of directional lights. Keep the existing HTML overlays outside.
  let studioCameraFrame=null;
  try {
    studioCameraFrame=new pc.CameraFrame(app,camera.camera);
    studioCameraFrame.rendering.toneMapping=pc.TONEMAP_ACES;
    studioCameraFrame.rendering.samples=mobile?2:1;
    studioCameraFrame.rendering.renderTargetScale=1;
    studioCameraFrame.taa.enabled=!mobile;
    studioCameraFrame.taa.jitter=.7;
    studioCameraFrame.rendering.sharpness=mobile?0:.18;
    studioCameraFrame.ssao.type=mobile?pc.SSAOTYPE_NONE:pc.SSAOTYPE_COMBINE;
    studioCameraFrame.ssao.intensity=.22;
    studioCameraFrame.ssao.radius=12;
    studioCameraFrame.ssao.power=2.5;
    studioCameraFrame.ssao.samples=12;
    studioCameraFrame.grading.enabled=true;
    studioCameraFrame.grading.contrast=1.045;
    studioCameraFrame.grading.saturation=.99;
    studioCameraFrame.bloom.intensity=mobile?0:.012;
    studioCameraFrame.bloom.threshold=1.2;
    studioCameraFrame.rendering.sceneDepthMap=!mobile;
    studioCameraFrame.enabled=true;
    studioCameraFrame.update();
    camera.camera.toneMapping=pc.TONEMAP_LINEAR;
  }catch(error) {
    console.warn("Kia CameraFrame pipeline unavailable: keeping ACES camera",error);
    try{studioCameraFrame?.destroy();}catch{}
    studioCameraFrame=null;
  }
  app.start();
  resize();

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
      target.copy(defaultTarget);override=null;
    });
  }
  function setAngle(degrees) {
    cancel();cabinOpen=false;azimuth=degrees*Math.PI/180;
  }
  function resetView(degrees=35) {
    cabinOpen=false;
    setDoorsOpen(false);
    const a=degrees*Math.PI/180;
    animateTo(orbitPoint(a,.18,baseRadius,defaultTarget),defaultTarget,42,820,()=>{
      target.copy(defaultTarget);azimuth=a;inclination=.18;
      radius=baseRadius;override=null;
    });
  }
  function animateDoors(open,duration=850) {
    if(!doors.length)return false;
    if(open===doorsOpened)return doors.length===4;
    doorsOpened=open;
    const start=doors.map(d=>d.entity.getLocalEulerAngles().y);
    const dest=doors.map(d=>d.closed+(open?d.open:0));
    const began=performance.now();
    const key=++doorAnimToken;
    function step(now){
      if(key!==doorAnimToken)return;
      const t=clamp((now-began)/duration,0,1),e=ease(t);
      doors.forEach((d,i)=>{
        const a=d.entity.getLocalEulerAngles();
        d.entity.setLocalEulerAngles(a.x,start[i]+(dest[i]-start[i])*e,a.z);
      });
      if(t<1)requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    return doors.length===4;
  }
  let doorAnimToken=0;
  function setDoorsOpen(open,duration=850){return animateDoors(!!open,duration);}
  function world(local){
    return model.getWorldTransform().transformPoint(local);
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
  function setPaintColor(key){
    if(!palette[key])return false;
    currentPaint=key;
    for(const item of painted){
      // Preserve the source diffuse, normal, ORM maps and reflections.
      // Only the explicitly identified body-panel material is altered.
      const mat=item.material,source=item.source;
      if(key==="arena"){
        mat.diffuse.copy(source);
      }else{
        const color=palette[key];
        mat.diffuse.set(color[0],color[1],color[2]);
      }
      mat.update();
    }
    debug.paintApplied=key;
    return painted.length>0;
  }
  canvas.addEventListener("pointerdown",event=>{
    if(event.pointerType==="mouse"&&event.button!==0)return;
    if(override){override=null;target.copy(defaultTarget);}
    token++;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove",event=>{
    const prev=pointers.get(event.pointerId);if(!prev)return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size===1){
      const portrait=matchMedia("(orientation:portrait)").matches;
      const dx=portrait?event.clientY-prev.y:event.clientX-prev.x;
      const dy=portrait?prev.x-event.clientX:event.clientY-prev.y;
      azimuth+=dx*.009;
      inclination=clamp(inclination+dy*.004,-.26,1.42);
      onAngleChange(azimuth*180/Math.PI);
    }else if(pointers.size===2){
      const ps=[...pointers.values()];
      const dist=Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y);
      if(pinch)radius=clamp(radius*pinch/Math.max(1,dist),2,28);
      pinch=dist;
    }
  });
  for(const type of ["pointerup","pointercancel","lostpointercapture"]){
    canvas.addEventListener(type,e=>{pointers.delete(e.pointerId);if(pointers.size<2)pinch=0;});
  }
  canvas.addEventListener("wheel",event=>{
    event.preventDefault();
    token++;override=null;
    radius=clamp(radius*(event.deltaY>0?1.09:.91),2,28);
  },{passive:false});

  try {
    const asset=await new Promise((resolve,reject)=>
      app.assets.loadFromUrl(assetUrl,"container",(error,result)=>
        error?reject(error):resolve(result)));
    model=asset.resource.instantiateRenderEntity({castShadows:true,receiveShadows:true});
    app.root.addChild(model);
    model.forEach(node=>{
      if(!node.render)return;
      for(const mi of node.render.meshInstances){
        meshCount++;mi.castShadow=true;
        const mat=mi.material;
        if(!mat)continue;
        if(mat.diffuseMap)texturesBound++;
        // The original GLB incorrectly flags opaque Car and Interior atlases
        // as alpha-blended; that made doors/bonnet disappear in Three.js.
        if(mat.name==="Car"||mat.name==="Interior"){
          mat.blendType=pc.BLEND_NONE;
          mat.opacity=1;mat.alphaTest=0;mat.depthWrite=true;
          mat.update();
          if(!debug.materialCorrections.includes(mat.name))debug.materialCorrections.push(mat.name);
        }
        const label=(node.name+" "+(node.parent?.name||"")).toLowerCase();
        const isBody=/body_details|cabin_body|hood|cargo_bed_sides|tailgate|door_front_|door_rear_/.test(label);
        if(mat.name==="Car"&&isBody) {
          const paint=mat.clone();
          paint.name="Kia Paint · "+node.name;
          // Preserve the GLB metalness, roughness, normals and maps;
          // add only the physically plausible automotive varnish layer.
          paint.clearCoat=Math.max(.90,paint.clearCoat||0);
          paint.clearCoatGloss=.93;
          if(studioCubemap&&environment){
            paint.envAtlas=environment.atlas;
            paint.cubeMap=studioCubemap;
          }
          paint.update();
          mi.material=paint;
          painted.push({material:paint,source:paint.diffuse.clone()});
        }
      }
    });
    for(const [name,opening] of doorMap){
      const entity=model.findByName(name);
      if(entity)doors.push({entity,open:opening,closed:entity.getLocalEulerAngles().y});
    }
    debug.doorsFound=doors.map(d=>d.entity.name);
    debug.getAllDoorDegrees=()=>Object.fromEntries(doors.map(d=>[d.entity.name,d.entity.getLocalEulerAngles().y-d.closed]));
    // Inspect world-space geometry, not arbitrary export pivots.
    let min=vec(Infinity,Infinity,Infinity),max=vec(-Infinity,-Infinity,-Infinity);
    model.forEach(node=>{
      if(!node.render)return;
      for(const mi of node.render.meshInstances) {
        const a=mi.aabb,low=a.getMin(),high=a.getMax();
        min.x=Math.min(min.x,low.x);min.y=Math.min(min.y,low.y);min.z=Math.min(min.z,low.z);
        max.x=Math.max(max.x,high.x);max.y=Math.max(max.y,high.y);max.z=Math.max(max.z,high.z);
      }
    });
    if(!Number.isFinite(min.x))throw new Error("GLB has no renderable meshes");
    const center=interpolate(min,max,.5);
    defaultTarget.copy(center);target.copy(center);
    const size=vec(max.x-min.x,max.y-min.y,max.z-min.z);
    const vfov=42*Math.PI/180;
    const aspect=Math.max(.2,host.clientWidth/Math.max(1,host.clientHeight));
    const hfov=2*Math.atan(Math.tan(vfov/2)*aspect);
    radius=Math.max(size.y/(2*Math.tan(vfov/2)),Math.hypot(size.x,size.z)/(2*Math.tan(hfov/2)))*1.16;
    baseRadius=radius=clamp(radius,4,24);

    // Infinite neutral cyclorama floor, catching genuine real-time shadows.
    const floor=new pc.Entity("Studio shadow floor");
    const floorMat=new pc.StandardMaterial();
    floorMat.diffuse=new pc.Color(.115,.128,.14);
    floorMat.useMetalness=true;floorMat.metalness=.08;floorMat.gloss=.42;
    floorMat.update();
    floor.addComponent("render",{type:"plane",material:floorMat,receiveShadows:true});
    floor.setLocalScale(Math.max(18,size.x*3),1,Math.max(18,size.z*3));
    floor.setPosition(center.x,min.y-.035,center.z);
    app.root.addChild(floor);
    debug.bounds={min:[min.x,min.y,min.z],max:[max.x,max.y,max.z]};
    debug.meshCount=meshCount;
    debug.texturesBound=texturesBound;
    debug.paintMeshCount=painted.length;
    debug.materialPolicy="original maps/roughness/metalness retained; body clearcoat only";
    debug.status="loaded";
    setPaintColor("arena");
    requestRender();
    canvas.style.visibility="visible";
    return {
      engine:"playcanvas",app,model,camera,
      meshCount,texturesBound,
      setAngle,setPose,setDoorsOpen,enterCabin,exitCabin,focusOnPart,
      resetView,setPaintColor,getFeatureAnchor,projectPoint,requestRender,
      addFrameListener:fn=>{frameListeners.add(fn);return()=>frameListeners.delete(fn);},
      getCameraPosition:()=>{const p=camera.getPosition();return[p.x,p.y,p.z];},
      getRadius:()=>radius,
      getModel:()=>model,
      destroy:()=>{observer.disconnect();studioCameraFrame?.destroy();app.destroy();}
    };
  }catch(error){
    debug.status="failed";debug.error=String(error);
    app.destroy();
    canvas.style.visibility="visible";
    throw error;
  }
}
