import {playbackClock} from './playback-clock.js';
import {surfaceScanner,createWater,createRockTerrain,rockHeight,buildTrailer} from './campaign-effects.js';
import * as pc from './vendor/playcanvas.mjs';
import {createDropPreview} from './drop.js?v=cines-20261114-r02';

export function createCampaignScene(d){
 const {app,model,camera,lighting}=d,basePosition=model.getLocalPosition().clone(),baseRotation=model.getLocalRotation().clone();
 const rig=new pc.Entity('Campaign vehicle motion',app);app.root.addChild(rig);model.reparent(rig);
 const root=new pc.Entity('Campaign holograms',app);app.root.addChild(root);
 let mode='idle',active=null,age=0,autoOrbit=false,orbitAngle=-.74,transition=null,serial=0,impactListener=()=>{},impactAge=99,scanGroup=null;
 const wheels=['Kia.wheel.fr.l.001','Kia.wheel.fr.r.001','Kia.wheel.bk.l.001','Kia.wheel.bk.r.001'].map(n=>model.findByName(n));
 const clock=playbackClock(()=>d.manualClock),scanSurface=surfaceScanner(app,model),wheelRest=wheels.map(w=>({position:w.getLocalPosition().clone(),rotation:w.getLocalRotation().clone()}));
 const ownedMeshes=[];
 const materials=[];let waterResource=null,lastShadow=-1;

 function material(alpha=.15){const m=new pc.StandardMaterial();m.useLighting=false;m.diffuse.set(.02,.25,.3);m.emissive.set(.025,.5,.6);m.opacity=alpha;m.blendType=pc.BLEND_NORMAL;m.depthWrite=false;m.cull=pc.CULLFACE_NONE;m.update();materials.push(m);return m;}
 function group(name){const e=new pc.Entity(name,app);root.addChild(e);return e;}
 function meshEntity(parent,name,mesh,mat){ownedMeshes.push(mesh);const e=new pc.Entity(name,app);e.addComponent('render',{meshInstances:[new pc.MeshInstance(mesh,mat,e)],castShadows:false,receiveShadows:false});parent.addChild(e);return e;}
 function lines(parent,name,positions,indices){const mesh=new pc.Mesh(app.graphicsDevice);mesh.setPositions(positions);mesh.setIndices(indices);mesh.update(pc.PRIMITIVE_LINES);const m=new pc.StandardMaterial();m.useLighting=false;m.useSkybox=false;m.diffuse.set(0,0,0);m.emissive.set(.04,.8,.95);m.opacity=.85;m.blendType=pc.BLEND_NORMAL;m.depthWrite=false;m.update();materials.push(m);return meshEntity(parent,name,mesh,m);}
 function wireBox(parent,name,position,size,alpha=.08){
  const g=new pc.Entity(name,app);parent.addChild(g);g.setLocalPosition(...position);
  const fill=new pc.Entity(name+' faces',app);fill.addComponent('render',{type:'box',castShadows:false,receiveShadows:false});fill.render.material=material(alpha);fill.setLocalScale(...size);g.addChild(fill);
  const p=[];for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])p.push(x*size[0]/2,y*size[1]/2,z*size[2]/2);
  lines(g,name+' edges',p,[0,1,0,2,0,4,1,3,1,5,2,3,2,6,3,7,4,5,4,6,5,7,6,7]);return g;
 }
 function ring(parent,name,radius,y){const p=[],idx=[];for(let i=0;i<64;i++){const a=i/64*Math.PI*2;p.push(Math.cos(a)*radius,y,Math.sin(a)*radius);idx.push(i,(i+1)%64);}return lines(parent,name,p,idx);}
 function clear(){
  cabinLight.enabled=false;
  waterResource?.destroy();waterResource=null;scanSurface(-100);for(let i=0;i<wheels.length;i++){wheels[i].setLocalPosition(wheelRest[i].position);wheels[i].setLocalRotation(wheelRest[i].rotation);}
  serial++;if(transition){transition.resolve(false);transition=null;}
  for(const child of [...root.children]){child.destroy();}
  for(const mesh of ownedMeshes.splice(0))mesh.destroy();
  for(const m of materials.splice(0))m.destroy();
  if(dustPool)dustPool.enabled=false;
  active=null;scanGroup=null;dust=null;age=0;lastShadow=-1;impactAge=99;autoOrbit=false;
  rig.setLocalPosition(0,0,0);rig.setLocalEulerAngles(0,0,0);model.setLocalRotation(baseRotation);model.setLocalPosition(basePosition);drop.finish();
 }
 function director(pose,duration=.85){
  if(transition)transition.resolve(false);
  const position=camera.getPosition().clone(),fromTarget=position.clone().add(camera.forward.clone().mulScalar(4));
  d.setCameraPose({position:position.toArray(),lookAt:fromTarget.toArray(),fov:camera.camera.fov,interior:!!pose.interior});
  return new Promise(resolve=>{transition={position,target:fromTarget,fromFov:camera.camera.fov,pose,age:0,duration,resolve};});
 }
 const cue=new pc.Entity('Campaign overhead reflector',app);cue.addComponent('light',{type:'spot',shape:pc.LIGHTSHAPE_RECT,intensity:0,range:16,innerConeAngle:20,outerConeAngle:50,castShadows:false,mask:1});cue.setPosition(0,6,0);cue.setLocalScale(2,1,3);app.root.addChild(cue);cue.enabled=true;
 const cabinLight=new pc.Entity('Dashboard soft fill',app);cabinLight.addComponent('light',{type:'omni',range:2.2,intensity:.32,color:new pc.Color(.82,.91,1),castShadows:false});cabinLight.setPosition(0,1.6,.2);app.root.addChild(cabinLight);cabinLight.enabled=false;
 let dust=null,dustTexture=null,dustPool=null;const impactMaterials=[];
 function impact(notify=true){
  if(notify){impactAge=0;impactListener();}
  if(dustPool){dust=dustPool;dust.enabled=true;for(const s of dust.stones){s.e.enabled=true;s.e.render.material.opacity=1;}return;}
  dust=new pc.Entity('Impact dust and stones');app.root.addChild(dust);dustPool=dust;
  if(!dustTexture){const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),gradient=ctx.createRadialGradient(32,32,1,32,32,32);gradient.addColorStop(0,'rgba(198,185,161,.9)');gradient.addColorStop(1,'rgba(174,159,133,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);const pixels=ctx.getImageData(0,0,64,64);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4;pixels.data[i+3]*=.65+.35*Math.sin(x*.42+Math.sin(y*.6))*Math.cos(y*.33+Math.sin(x*.51));}ctx.putImageData(pixels,0,0);dustTexture=new pc.Texture(app.graphicsDevice,{mipmaps:false});dustTexture.setSource(c);}
  dust.puffs=[];dust.stones=[];
  for(let i=0;i<28;i++){
   const side=i%2?1:-1,z=i%3===0?-1.63:1.63;
   const e=new pc.Entity('Soft impact dust '+i,app);e.addComponent('render',{type:'plane',castShadows:false,receiveShadows:false});const m=new pc.StandardMaterial();m.useLighting=false;m.useSkybox=false;m.diffuseMap=dustTexture;m.opacityMap=dustTexture;m.opacityMapChannel='a';m.diffuse.set(1,1,1);m.opacity=.65;m.blendType=pc.BLEND_NORMAL;m.depthWrite=false;m.cull=pc.CULLFACE_NONE;m.update();impactMaterials.push(m);e.render.material=m;dust.addChild(e);dust.puffs.push({e,m,side,z,seed:i/28});
  }
  for(let i=0;i<8;i++){const e=new pc.Entity('Impact stone '+i,app);e.addComponent('render',{type:'box',castShadows:false,receiveShadows:false});const m=new pc.StandardMaterial();m.diffuse.set(.32,.29,.24);m.gloss=.15;m.opacity=0;m.blendType=pc.BLEND_NORMAL;m.depthWrite=false;m.update();impactMaterials.push(m);e.render.material=m;e.setLocalScale(.055,.035,.075);dust.addChild(e);dust.stones.push({e,side:i%2?1:-1,z:i%3===0?-1.63:1.63,seed:i/8});}

 }
 impact(false);for(const p of dust.puffs)p.m.opacity=0;for(const s of dust.stones)s.e.enabled=true;app.on('postrender',function warmImpact(){if(d.vehicleFrameReady){if(impactAge>2){dustPool.enabled=false;dust=null;}app.off('postrender',warmImpact);}});
 app.once('destroy',()=>{dustPool?.destroy();for(const m of impactMaterials)m.destroy();dustTexture?.destroy();});
 const drop=createDropPreview({app,model,setOrbit:d.setOrbit,lighting,controls:false,autoPlay:false,onImpact:impact,manualClock:()=>d.manualClock});
 if(new URLSearchParams(location.search).has('slow')){d.playbackRate=.25;drop.setRate(.25);}
 function setIntro(){clear();mode='intro';cue.enabled=true;cue.light.intensity=0;age=0;drop.replay();}
 function skip(){clear();mode='idle';cue.light.intensity=0;drop.finish();}
 function scan(){clear();mode='scan';scanSurface(-2.9);}
 function menu(){clear();mode='menu';cue.light.intensity=0;d.stage.setEnabled(true);autoOrbit=true;d.setOrbit({azimuth:orbitAngle,elevation:.15,distance:9.7,target:[0,1,0]});}
 const poses=[
  {position:[-11.3,2.8,3.4],lookAt:[0,.9,0],fov:45},
  {position:[-4.5,3.6,-5.5],lookAt:[0,1.18,-1.35],fov:43},
  {position:[-13.5,4.5,-9.5],lookAt:[0,.9,-1.7],fov:43},
  {position:[-6.8,2.7,6.4],lookAt:[0,1.05,0],fov:43},
  {position:[.42,1.48,-.12],lookAt:[.08,1.25,1.0],fov:59,interior:true}
 ];
 async function mission(index){
  clear();mode='mission';cue.light.intensity=0;const ticket=serial;const arrived=await director(poses[index]);if(!arrived||ticket!==serial)return false;
  const g=group('Mission '+(index+1));active={index,group:g,anchors:[],waterLevel:0,boxes:[]};age=0;
  if(index===0){
   waterResource=createWater(app,g);active.water=waterResource.entity;materials.push(waterResource.material);
   lines(g,'800 mm gauge',[-1.15,0,1.1,-1.15,.8,1.1,-1.3,0,1.1,-1,0,1.1,-1.3,.8,1.1,-1,.8,1.1],[0,1,2,3,4,5]);
   active.anchors=[{text:'TOMA DE AIRE · guardafango elevado',point:[-.96,1.35,1.3]}];
  }else if(index===1){
   const positions=[[-.29,1.08,-1.2],[.29,1.08,-1.2],[-.29,1.08,-1.85],[.29,1.08,-1.85],[-.29,1.4,-1.5],[.29,1.4,-1.5]];
   active.boxes=positions.map((p,i)=>({entity:wireBox(g,'Cargo box '+i,p,[.5,.3,.5],.14),position:p,index:i}));
   for(const x of [-.7,.7])lines(g,'Adjustable cargo rail',[x,1.4,-.75,x,1.4,-2.35],[0,1]);
   active.anchors=[{text:'RIELES CON GANCHOS · ajustables',point:[-.73,1.4,-1.9]},{text:'GRADAS LATERALES',point:[-.96,.67,-2]}];
  }else if(index===2){
   buildTrailer(g,wireBox,lines,ring);
   active.hitch=[0,.42,-2.8];active.anchors=[{text:'FRENO DE REMOLQUE · control integrado',point:[0,.42,-2.8]}];
  }else if(index===3){
   active.terrain=createRockTerrain(app,g);ownedMeshes.push(active.terrain.mesh);materials.push(active.terrain.material);active.contacts=wheels.map((w,i)=>ring(g,'Tire support '+i,.24,.008));
   active.anchors=[{text:'e-LD · bloqueo electrónico trasero',point:[-.8,.6,-1.63]},{text:'GROUND VIEW MONITOR',point:[0,.8,2.4]}];
  }else{
   cabinLight.enabled=true;
   const display=wireBox(g,'Panoramic display projection',[.26,1.335,.717],[.83,.17,.008],.04);display.setLocalEulerAngles(6,0,0);
   for(const x of [-.075,.075])wireBox(g,'Wireless charger projection',[x,.968,.61],[.12,.008,.19],.10);
   active.anchors=[{text:'PANTALLA PANORÁMICA',point:[.2,1.42,.716]},{text:'2 CARGADORES INALÁMBRICOS',point:[-.02,.975,.61]},{text:'LFA 2 · FCA 2 · SCC',point:[.6,1.42,.73]}];
  }
  return true;
 }
 function groundHeight(x,z){return rockHeight(x,z);}
 function end(){menu();mode='closing';autoOrbit=false;}
 camera.getPosition();app.graphicsDevice.canvas.addEventListener('pointerdown',()=>{autoOrbit=false;});
 app.on('update',delta=>{
  const dt=clock(delta)*(d.playbackRate??1);age+=dt;impactAge+=dt;
  if(transition){const tr=transition;tr.age+=dt;const u=Math.min(1,tr.age/tr.duration),s=u*u*(3-2*u),p=tr.position.clone().lerp(tr.position,new pc.Vec3(...tr.pose.position),s),q=tr.target.clone().lerp(tr.target,new pc.Vec3(...tr.pose.lookAt),s);d.setCameraPose({position:p.toArray(),lookAt:q.toArray(),fov:pc.math.lerp(tr.fromFov,tr.pose.fov,s),interior:tr.pose.interior});if(u===1){transition=null;tr.resolve(true);}}
  if(mode==='intro'){
   cue.light.intensity=Math.min(1.2,age*2);
   if(impactAge<.45){const f=(1-impactAge/.45)*.045;camera.translateLocal(Math.sin(impactAge*81)*f,Math.sin(impactAge*63)*f,0);}
  }
  if(dust&&impactAge<1.4){
   for(const {e,m,side,z,seed} of dust.puffs){const t=impactAge;e.setLocalPosition(side*(.8+t*(1.4+seed)),.15+t*.28,z+(seed-.5)*t);e.lookAt(camera.getPosition());e.rotateLocal(90,0,0);const scale=.5+t*(1.8+seed);e.setLocalScale(scale,1,scale*.65);m.opacity=Math.max(0,.7*(1-t/1.5));m.update();}
   for(const {e,side,z,seed} of dust.stones){const t=impactAge;e.setLocalPosition(side*(.8+t*(1.2+seed)),Math.max(.035,.04+t*(1.5+seed)-4.905*t*t),z+t*(seed-.5));e.setLocalEulerAngles(t*220,t*160,seed*80);}

  }else if(dust){dust.enabled=false;dust=null;}
  if(mode==='scan')scanSurface(-2.9+Math.min(1,age/2.6)*5.8);
  if(mode==='menu'&&autoOrbit){orbitAngle+=dt*.12;d.setOrbit({azimuth:orbitAngle,elevation:.15,distance:9.7,target:[0,1,0]});}
  if(active?.index===0)active.waterLevel=waterResource.update(age);
  if(active?.index===1)for(const box of active.boxes){const elapsed=Math.max(0,age-box.index*.18),u=Math.min(1,elapsed/.65),landed=Math.max(0,elapsed-.65),h=u<1?1.8*(1-u*u):.035*Math.exp(-landed*8)*Math.abs(Math.sin(landed*18));box.entity.setLocalPosition(box.position[0],box.position[1]+h,box.position[2]);}
  if(active?.index===3&&!active.motionDone){
   const u=Math.min(1,age/6),z=-.8+u*1.6,h=wheels.map((w,i)=>rockHeight(i%2?.81142:-.81142,(i<2?1.635:-1.635)+z));
   const front=(h[0]+h[1])/2,rear=(h[2]+h[3])/2,left=(h[0]+h[2])/2,right=(h[1]+h[3])/2;
   rig.setLocalPosition(0,(front+rear)/2,z);rig.setLocalEulerAngles(Math.atan2(rear-front,3.27)*180/Math.PI,0,Math.atan2(right-left,1.62284)*180/Math.PI);
   for(let i=0;i<wheels.length;i++){const w=wheels[i],p=w.getPosition();w.setPosition(p.x,rockHeight(p.x,p.z)+.4049708,p.z);w.setLocalRotation(wheelRest[i].rotation);w.rotateLocal(u*1.6/.405*180/Math.PI,0,0);active.contacts[i].setLocalPosition(p.x,rockHeight(p.x,p.z)+.008,p.z);}
   if(u===1)active.motionDone=true;
   if(age-lastShadow>.12&&u<=1){lighting.refreshShadows();lastShadow=age;}

  }
 });
 return {startIntro:setIntro,skipIntro:skip,scan,menu,mission,closing:end,drop,onImpact(fn){impactListener=fn;},getState(){return {mode,age,impactAge,importTransform:{position:model.getLocalPosition().toArray(),scale:model.getLocalScale().toArray()},transition:!!transition,mission:active?.index??null,propCount:root.children.length,waterLevel:active?.waterLevel??null,hitch:active?.hitch??null,boxes:active?.boxes.map(b=>b.entity.getPosition().toArray())??[],wheelSupports:active?.index===3?wheels.map(w=>{const p=w.getPosition();return {bottom:p.y-.4049708,terrain:groundHeight(p.x,p.z),x:p.x,z:p.z};}):[],anchors:active?.anchors.map(a=>active.index===3?{...a,point:rig.getWorldTransform().transformPoint(new pc.Vec3(...a.point)).toArray()}:a)??[],drop:drop.getState()};},project(point){const p=camera.camera.worldToScreen(new pc.Vec3(...point));return {x:p.x,y:p.y,z:p.z};}};
}
