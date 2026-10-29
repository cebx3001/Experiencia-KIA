import * as pc from './vendor/playcanvas.mjs';
import {applyDeclaredCoating,applyGlassOptics} from './material-adapter.js';

const $=s=>document.querySelector(s), V=(x=0,y=0,z=0)=>new pc.Vec3(x,y,z);
const canvas=$('#canvas'), host=$('main');
const debug=window.__tasmanMaster={status:'loading',engine:pc.version,errors:[],materials:[],doors:{},paint:'arena'};
const app=new pc.Application(canvas,{graphicsDeviceOptions:{alpha:false,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true}});
app.graphicsDevice.maxPixelRatio=Math.min(devicePixelRatio,1.75);
app.setCanvasResolution(pc.RESOLUTION_AUTO);app.setCanvasFillMode(pc.FILLMODE_NONE);
app.scene.ambientLight=new pc.Color(0,0,0);app.scene.exposure=.5;app.scene.skyboxIntensity=.45;
app.scene.fog.type=pc.FOG_NONE;app.scene.fog.color=new pc.Color(.1517,.1641,.1828);app.scene.fog.start=18;app.scene.fog.end=55;
const camera=new pc.Entity('Inspection camera');
camera.addComponent('camera',{fov:36,nearClip:.025,farClip:100,clearColor:new pc.Color(.02,.023,.028)});
camera.camera.toneMapping=pc.TONEMAP_ACES;
camera.camera.layers=camera.camera.layers.filter(id=>id!==pc.LAYERID_SKYBOX);
app.root.addChild(camera);
const frame=new pc.CameraFrame(app,camera.camera);
frame.rendering.toneMapping=pc.TONEMAP_ACES;
frame.rendering.sceneColorMap=true;
frame.rendering.sceneDepthMap=true;
frame.taa.enabled=true;
frame.ssao.type=pc.SSAOTYPE_LIGHTING;
frame.ssao.samples=24;frame.ssao.intensity=.9;frame.ssao.radius=.45;frame.ssao.power=1.6;
frame.bloom.intensity=.025;frame.bloom.threshold=4;
frame.vignette.intensity=.16;frame.vignette.inner=.65;
frame.update();
function light(name,color,intensity,rotation,shadow){const e=new pc.Entity(name);e.addComponent('light',{type:'directional',color:new pc.Color(...color),intensity,castShadows:!!shadow,shadowResolution:4096,shadowDistance:18,shadowBias:.005,normalOffsetBias:.005,shadowType:pc.SHADOW_PCF5_32F});e.setEulerAngles(...rotation);app.root.addChild(e);return e;}
const shadowKey=light('Shadow key',[1,.98,.95],.6,[42,-40,0],true);
shadowKey.light.mask=1;
const areaLights=[];
function refreshAreaShadows(){for(const e of areaLights)e.light.shadowUpdateMode=pc.SHADOWUPDATE_THISFRAME;}
function area(name,position,aim,width,height,intensity,color){const e=new pc.Entity(name);e.addComponent('light',{type:'spot',shape:pc.LIGHTSHAPE_RECT,color:new pc.Color(...color),intensity,range:22,innerConeAngle:45,outerConeAngle:70,castShadows:true,mask:1,shadowResolution:2048,shadowBias:.08,normalOffsetBias:.03,shadowType:pc.SHADOW_PCF3_32F,shadowUpdateMode:pc.SHADOWUPDATE_THISFRAME,falloffMode:pc.LIGHTFALLOFF_INVERSESQUARED});e.setPosition(...position);e.lookAt(V(...aim));e.rotateLocal(90,0,0);e.setLocalScale(width,1,height);app.root.addChild(e);areaLights.push(e);
 // The floor uses the same luminaire without a punctual hard shadow; its soft
 // contact occlusion is ray-baked from the full vehicle, not a hand-painted oval.
 const ground=e.clone();ground.name=name+' / ground';ground.light.castShadows=false;ground.light.mask=2;app.root.addChild(ground);
 return e;}
const floor=new pc.Entity('Matte studio floor');floor.addComponent('render',{type:'plane'});floor.setLocalScale(200,1,200);const fm=new pc.StandardMaterial();fm.diffuse.set(.38,.38,.38);fm.useSkybox=false;fm.gloss=.18;fm.update();floor.render.material=fm;floor.render.castShadows=false;for(const mi of floor.render.meshInstances)mi.mask=2;app.root.addChild(floor);
// A new, continuous 360-degree cyclorama: floor-to-wall cove with no horizon seam.
function createCyclorama(){const positions=[],normals=[],uvs=[],indices=[];const segments=192,rings=26;for(let ring=0;ring<=rings;ring++){const t=Math.min(ring/24,1)*Math.PI/2,r=24+4*Math.sin(t),y=ring<=24?4*(1-Math.cos(t)):4+(ring-24)*6;for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;positions.push(r*Math.sin(a),y,r*Math.cos(a));normals.push(-Math.sin(t)*Math.sin(a),Math.cos(t),-Math.sin(t)*Math.cos(a));uvs.push(i/segments,ring/rings);}}for(let ring=0;ring<rings;ring++)for(let i=0;i<segments;i++){const a=ring*(segments+1)+i,b=a+segments+1;indices.push(a,b,a+1,a+1,b,b+1);}const mesh=pc.createMesh(app.graphicsDevice,positions,{normals,uvs,indices});const material=fm.clone();material.diffuse.set(.008,.008,.008);material.cull=pc.CULLFACE_NONE;material.update();const e=new pc.Entity('Continuous cyclorama');e.addComponent('render',{meshInstances:[new pc.MeshInstance(mesh,material,e)],castShadows:false,receiveShadows:true});app.root.addChild(e);}
createCyclorama();
const load=(url,type)=>new Promise((resolve,reject)=>app.assets.loadFromUrl(url,type,(err,a)=>err?reject(Error(`${url}: ${err}`)):resolve(a)));
pc.dracoInitialize({jsUrl:'vendor/draco_wasm_wrapper.js',wasmUrl:'vendor/draco_decoder.wasm',numWorkers:2,lazyInit:true});
async function setEnvironment(name){
 const file=name==='photo'?'studio-small-09-4k.hdr':'studio.hdr';
 const hdr=await load('assets/'+file,'texture');const source=pc.EnvLighting.generateLightingSource(hdr.resource,{size:1024});
 const atlas=pc.EnvLighting.generateAtlas(source,{size:1024}),previous=app.scene.envAtlas;app.scene.envAtlas=atlas;source.destroy();previous?.destroy();debug.environment=name;
}
const environmentSelect=document.createElement('select');environmentSelect.setAttribute('aria-label','Iluminación del estudio');environmentSelect.innerHTML='<option value="cinematic">Luz cinematográfica</option><option value="photo">Luz fotográfica</option>';$('.settings').prepend(environmentSelect);environmentSelect.onchange=async()=>{environmentSelect.disabled=true;try{await setEnvironment(environmentSelect.value);}finally{environmentSelect.disabled=false;}};
let model,container,rotating=false,doorsOpen=false,mode='orbit',yaw=.68,pitch=.18,distance=10,insideYaw=.42,insidePitch=-.067;
const target=V(0,1,0), doors=new Map(), pointers=new Map();
const paints={arena:{name:'Tan Beige',code:'TAM'},gris:{name:'Interstellar Grey',code:'AGT'},negro:{name:'Aurora Black Pearl',code:'ABP'},verde:{name:'Cityscape Green',code:'CGE'}};
function resize(){app.resizeCanvas(host.clientWidth,host.clientHeight);}
new ResizeObserver(resize).observe(host);resize();
function orbit(){const c=Math.cos(pitch),r=distance*(camera.camera.horizontalFov?1:Math.max(1,.95/(host.clientWidth/host.clientHeight)));camera.setPosition(target.x+r*Math.sin(yaw)*c,target.y+r*Math.sin(pitch),target.z+r*Math.cos(yaw)*c);camera.lookAt(target);}
function setDoor(key,open){const d=doors.get(key);if(!d)return false;d.open=open;d.start=d.angle;d.started=performance.now();d.goal=open?d.sign*65:0;debug.doors[key]=open;document.querySelector(`[data-door="${key}"]`)?.setAttribute('aria-pressed',String(open));return true;}
function setAllDoors(open){doorsOpen=open;for(const key of doors.keys())setDoor(key,open);$('#all-doors').textContent=open?'Cerrar todas':'Abrir todas';}
function setPaint(key){if(!container||!paints[key])return false;const name=paints[key].code;container.resource.applyMaterialVariant(model,name);debug.paint=key;$('#paint-label').innerHTML=`${paints[key].name} <span>${name}</span>`;document.querySelectorAll('[data-paint]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.paint===key)));return true;}
function setView(key){
 mode='orbit';rotating=false;$('#rotate').setAttribute('aria-pressed','false');camera.camera.horizontalFov=true;camera.camera.fov=41.11;
 const views={hero:[-.857,.075,9.9,[0,.95,0]],side:[-Math.PI/2,.045,10,[0,1,-.2]],rear:[Math.PI-.65,.1,10.5,[0,1,-.2]],paint:[.95,.15,2.3,[.75,1.25,.8]],wheel:[.6,.08,2,[.9,.45,1.65]],glass:[.3,.1,3,[0,1.55,.9]],interior:[0,0,1,[0,1.35,.75]]};
 const s=views[key]||views.hero;yaw=s[0];pitch=s[1];distance=s[2];target.set(...s[3]);
 if(key==='interior'){setAllDoors(true);mode='interior';insideYaw=.42;insidePitch=-.067;camera.camera.horizontalFov=false;camera.camera.fov=54;camera.setPosition(-.45,1.44,-.05);camera.lookAt(.1,1.35,1.18);}
 $('.hint').textContent=key==='interior'?'ARRASTRA PARA MIRAR · RUEDA PARA MOVERTE POR EL INTERIOR':'ARRASTRA PARA GIRAR · RUEDA PARA ACERCAR · MAYÚS + ARRASTRAR PARA DESPLAZAR';
 document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===key)));debug.view=key;
}
canvas.addEventListener('pointerdown',e=>{if(e.button!==0&&e.button!==2)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{
 const p=pointers.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(mode==='interior'){
  if(pointers.size===1){insideYaw-=dx*.005;insidePitch=Math.max(-1.1,Math.min(1.1,insidePitch-dy*.004));const pos=camera.getPosition();camera.lookAt(pos.x+Math.sin(insideYaw)*Math.cos(insidePitch),pos.y+Math.sin(insidePitch),pos.z+Math.cos(insideYaw)*Math.cos(insidePitch));}
  return;
 }
 if(pointers.size===2){const a=[...pointers.values()];const now=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(debug.pinch)distance=Math.max(.2,Math.min(22,distance*debug.pinch/now));debug.pinch=now;}
 else if(e.shiftKey||e.buttons===2){const m=camera.getWorldTransform().data;target.add(V(-m[0]*dx+m[4]*dy,-m[1]*dx+m[5]*dy,-m[2]*dx+m[6]*dy).mulScalar(distance*.0012));}
 else{yaw-=dx*.006;pitch=Math.max(-.06,Math.min(1.4,pitch+dy*.004));}
});
for(const t of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(t,e=>{pointers.delete(e.pointerId);debug.pinch=0;});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('wheel',e=>{e.preventDefault();if(mode==='interior'){camera.translateLocal(0,0,e.deltaY*.0005);const p=camera.getPosition();camera.setPosition(pc.math.clamp(p.x,-.7,.7),pc.math.clamp(p.y,.9,1.7),pc.math.clamp(p.z,-.65,1.05));return;}distance=Math.max(.2,Math.min(22,distance*Math.exp(e.deltaY*.001)));},{passive:false});
document.querySelectorAll('[data-paint]').forEach(b=>b.onclick=()=>setPaint(b.dataset.paint));document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));document.querySelectorAll('[data-door]').forEach(b=>b.onclick=()=>{const d=doors.get(b.dataset.door);if(d)setDoor(b.dataset.door,!d.open);});$('#all-doors').onclick=()=>setAllDoors(!doorsOpen);$('#reset').onclick=()=>{setAllDoors(false);setView('hero');};$('#rotate').onclick=()=>{mode='orbit';rotating=!rotating;$('#rotate').setAttribute('aria-pressed',String(rotating));};$('#exposure').oninput=e=>app.scene.exposure=Number(e.target.value);
app.on('update',dt=>{if(rotating)yaw+=dt*.14;if(mode==='orbit')orbit();let moving=false;for(const d of doors.values()){moving ||= Math.abs(d.goal-d.angle)>.01;const t=pc.math.clamp((performance.now()-d.started)/650,0,1);d.angle=pc.math.lerp(d.start,d.goal,1-Math.pow(1-t,3));d.entity.setLocalEulerAngles(d.base.x,d.base.y+d.angle,d.base.z);}if(moving)refreshAreaShadows();});
app.start();
try{
 const luts=await (await fetch('assets/area-light-luts.json')).json();app.setAreaLightLuts(luts.LTC_MAT_1,luts.LTC_MAT_2);app.scene.lighting.areaLightsEnabled=true;app.scene.lighting.shadowAtlasResolution=4096;
 area('Overhead strip',[0,5,0],[0,1,0],8,2,1,[1,.98,.95]);area('Front softbox',[-2,3,6.5],[0,.9,1.2],4,1.5,3.2,[1,1,1]);area('Long side strip',[-6,1.9,-3.5],[0,1,0],10,1.6,2.6,[1,1,1]);area('Rear separation',[3,2,-4],[0,1,-1],2,3,1.2,[.95,.98,1]);
 const groundAo=await load('assets/studio-ground-ao.png','texture');groundAo.resource.addressU=pc.ADDRESS_CLAMP_TO_EDGE;groundAo.resource.addressV=pc.ADDRESS_CLAMP_TO_EDGE;fm.aoMap=groundAo.resource;fm.aoMapChannel='r';fm.aoMapTiling.set(12.5,12.5);fm.aoMapOffset.set(-5.75,-5.75);fm.occludeDirect=true;fm.update();
 const environment=new URLSearchParams(location.search).get('environment')==='photo'?'photo':'cinematic';environmentSelect.value=environment;await setEnvironment(environment);
 const assetFile=new URLSearchParams(location.search).get('quality')==='master'?'kia-tasman-master.glb':'kia-tasman-web.glb';
 container=await load('assets/'+assetFile,'container');
 const materialManifest=await (await fetch('assets/materials.json')).json();debug.coatingAdaptations=applyDeclaredCoating(container.resource,materialManifest,pc,app.graphicsDevice);
 const glassManifest=await (await fetch('assets/glass-adaptations.json')).json();debug.glassAdaptations=applyGlassOptics(container.resource,glassManifest,pc,app.graphicsDevice);
 model=container.resource.instantiateRenderEntity({castShadows:true,receiveShadows:true});app.root.addChild(model);
 refreshAreaShadows();
 for(const key of ['front_left','front_right','rear_left','rear_right']){const entity=model.findByName('door_'+key);if(!entity)throw Error('No se encontró la articulación door_'+key);doors.set(key,{entity,base:entity.getLocalEulerAngles().clone(),angle:0,start:0,started:0,goal:0,open:false,sign:key.endsWith('left')?1:-1});debug.doors[key]=false;}
 const unique=new Map();model.forEach(e=>{if(e.render)for(const mi of e.render.meshInstances){const m=mi.material;unique.set(m.name,{name:m.name,normal:!!m.normalMap,clearcoatNormal:!!m.clearCoatNormalMap,clearcoat:m.clearCoat,transmission:m.refraction,roughness:m.glossInvert?m.gloss:1-m.gloss});}});debug.materials=[...unique.values()];debug.variants=container.resource.getMaterialVariants();
 if(debug.variants.length!==4)throw Error('El GLB debe incluir las cuatro variantes de pintura');
 setView('hero');setPaint('arena');debug.status='ready';$('#loading').hidden=true;
 Object.assign(debug,{app,model,camera,setPaint,setView,setDoor,setAllDoors,getDoorAngles:()=>Object.fromEntries([...doors].map(([k,d])=>[k,d.entity.getLocalEulerAngles().y-d.base.y]))});
}catch(e){debug.status='error';debug.errors.push(String(e));$('#loading').hidden=true;$('#error').hidden=false;$('#error').textContent='No se pudo cargar el estudio.\n'+e.message;console.error(e);}
