import * as pc from './vendor/playcanvas.mjs';
import {createDropPreview} from './drop.js?v=cines-20261113';

export function createCampaignScene(d){
 const {app,model,camera,lighting}=d,basePosition=model.getLocalPosition().clone(),baseRotation=model.getLocalRotation().clone();
 const root=new pc.Entity('Campaign holograms',app);app.root.addChild(root);
 let mode='idle',active=null,age=0,autoOrbit=false,orbitAngle=-.74,transition=null,serial=0,impactListener=()=>{},impactAge=99,scanGroup=null;
 const wheels=['Kia.wheel.fr.l.001','Kia.wheel.fr.r.001','Kia.wheel.bk.l.001','Kia.wheel.bk.r.001'].map(n=>model.findByName(n));
 const materials=[];
 function material(alpha=.15){const m=new pc.StandardMaterial();m.useLighting=false;m.diffuse.set(.02,.25,.3);m.emissive.set(.025,.5,.6);m.opacity=alpha;m.blendType=pc.BLEND_NORMAL;m.depthWrite=false;m.cull=pc.CULLFACE_NONE;m.update();materials.push(m);return m;}
 function group(name){const e=new pc.Entity(name,app);root.addChild(e);return e;}
 function meshEntity(parent,name,mesh,mat){const e=new pc.Entity(name,app);e.addComponent('render',{meshInstances:[new pc.MeshInstance(mesh,mat,e)],castShadows:false,receiveShadows:false});parent.addChild(e);return e;}
 function lines(parent,name,positions,indices){const mesh=new pc.Mesh(app.graphicsDevice);mesh.setPositions(positions);mesh.setIndices(indices);mesh.update(pc.PRIMITIVE_LINES);const m=new pc.StandardMaterial();m.useLighting=false;m.useSkybox=false;m.diffuse.set(0,0,0);m.emissive.set(.04,.8,.95);m.opacity=.85;m.blendType=pc.BLEND_NORMAL;m.depthWrite=false;m.update();materials.push(m);return meshEntity(parent,name,mesh,m);}
 function wireBox(parent,name,position,size,alpha=.08){
  const g=new pc.Entity(name,app);parent.addChild(g);g.setLocalPosition(...position);
  const fill=new pc.Entity(name+' faces',app);fill.addComponent('render',{type:'box',castShadows:false,receiveShadows:false});fill.render.material=material(alpha);fill.setLocalScale(...size);g.addChild(fill);
  const p=[];for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])p.push(x*size[0]/2,y*size[1]/2,z*size[2]/2);
  lines(g,name+' edges',p,[0,1,0,2,0,4,1,3,1,5,2,3,2,6,3,7,4,5,4,6,5,7,6,7]);return g;
 }
 function ring(parent,name,radius,y){const p=[],idx=[];for(let i=0;i<64;i++){const a=i/64*Math.PI*2;p.push(Math.cos(a)*radius,y,Math.sin(a)*radius);idx.push(i,(i+1)%64);}return lines(parent,name,p,idx);}
 function clear(){
  serial++;if(transition){transition.resolve(false);transition=null;}
  for(const child of [...root.children]){child.destroy();}
  for(const m of materials.splice(0))m.destroy();
  active=null;scanGroup=null;dust=null;age=0;impactAge=99;autoOrbit=false;
  model.setLocalRotation(baseRotation);model.setLocalPosition(basePosition);drop.finish();
 }
 function director(pose,duration=.85){
  if(transition)transition.resolve(false);
  const position=camera.getPosition().clone(),fromTarget=position.clone().add(camera.forward.clone().mulScalar(4));
  d.setCameraPose({position:position.toArray(),lookAt:fromTarget.toArray(),fov:camera.camera.fov,interior:!!pose.interior});
  return new Promise(resolve=>{transition={position,target:fromTarget,fromFov:camera.camera.fov,pose,age:0,duration,resolve};});
 }
 const cue=new pc.Entity('Campaign overhead reflector',app);cue.addComponent('light',{type:'spot',shape:pc.LIGHTSHAPE_RECT,intensity:0,range:16,innerConeAngle:20,outerConeAngle:50,castShadows:false,mask:1});cue.setPosition(0,6,0);cue.setLocalScale(2,1,3);app.root.addChild(cue);cue.enabled=true;
 let dust=null,dustTexture=null;
 function impact(){
  impactAge=0;impactListener();dust=group('Impact dust and stones');
  if(!dustTexture){const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),gradient=ctx.createRadialGradient(32,32,1,32,32,32);gradient.addColorStop(0,'rgba(174,159,133,.55)');gradient.addColorStop(1,'rgba(174,159,133,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);dustTexture=new pc.Texture(app.graphicsDevice,{mipmaps:false});dustTexture.setSource(c);}
  dust.puffs=[];dust.stones=[];
  for(let i=0;i<12;i++){
   const side=i%2?1:-1,z=i%3===0?-1.63:1.63;
   const e=new pc.Entity('Soft impact dust '+i,app);e.addComponent('render',{type:'plane',castShadows:false,receiveShadows:false});const m=new pc.StandardMaterial();m.useLighting=false;m.useSkybox=false;m.diffuseMap=dustTexture;m.opacityMap=dustTexture;m.opacityMapChannel='a';m.diffuse.set(1,1,1);m.opacity=.3;m.blendType=pc.BLEND_NORMAL;m.depthWrite=false;m.cull=pc.CULLFACE_NONE;m.update();materials.push(m);e.render.material=m;dust.addChild(e);dust.puffs.push({e,m,side,z,seed:i/12});
  }
  for(let i=0;i<8;i++){const e=new pc.Entity('Impact stone '+i,app);e.addComponent('render',{type:'box',castShadows:false,receiveShadows:false});const m=new pc.StandardMaterial();m.diffuse.set(.17,.15,.12);m.gloss=.05;m.update();materials.push(m);e.render.material=m;e.setLocalScale(.055,.035,.075);dust.addChild(e);dust.stones.push({e,side:i%2?1:-1,z:i%3===0?-1.63:1.63,seed:i/8});}
  dust.pulse=ring(dust,'Contact pulse',.9,.025);
 }
 const drop=createDropPreview({app,model,setOrbit:d.setOrbit,lighting,controls:false,autoPlay:false,onImpact:impact});
 function setIntro(){clear();mode='intro';cue.enabled=true;cue.light.intensity=0;age=0;drop.replay();}
 function skip(){clear();mode='idle';cue.light.intensity=0;drop.finish();}
 function scan(){clear();mode='scan';scanGroup=wireBox(root,'Scan slice',[0,.05,0],[2.3,.025,5.8],.04);ring(scanGroup,'Scanning footprint',2.5,0);}
 function menu(){clear();mode='menu';cue.light.intensity=0;d.stage.setEnabled(true);autoOrbit=true;d.setOrbit({azimuth:orbitAngle,elevation:.15,distance:10.2,target:[0,1,0]});}
 const poses=[
  {position:[-7.4,2.15,2.4],lookAt:[0,.9,0],fov:45},
  {position:[-4.5,3.6,-5.5],lookAt:[0,1.18,-1.35],fov:43},
  {position:[-13.5,4.5,-9.5],lookAt:[0,.9,-1.7],fov:43},
  {position:[-6.8,2.7,6.4],lookAt:[0,1.05,0],fov:43},
  {position:[-.45,1.44,-.05],lookAt:[.1,1.18,1.12],fov:59,interior:true}
 ];
 async function mission(index){
  clear();mode='mission';cue.light.intensity=0;const ticket=serial;const arrived=await director(poses[index]);if(!arrived||ticket!==serial)return false;
  const g=group('Mission '+(index+1));active={index,group:g,anchors:[],waterLevel:0,boxes:[]};age=0;
  if(index===0){
   const positions=[],uv=[],indices=[],count=30;
   for(let z=0;z<=count;z++)for(let x=0;x<=count;x++){positions.push((x/count-.5)*4,.8,(z/count-.5)*7);uv.push(x/count,z/count);}
   for(let z=0;z<count;z++)for(let x=0;x<count;x++){const a=z*(count+1)+x;indices.push(a,a+1,a+count+1,a+1,a+count+2,a+count+1);}
   const mesh=pc.createMesh(app.graphicsDevice,positions,{normals:pc.calculateNormals(positions,indices),uvs:uv,indices});active.water=meshEntity(g,'800 mm holographic water',mesh,material(.18));active.waterPositions=positions;
   for(let i=0;i<14;i++){const z=(i/13-.5)*7;lines(g,'Water contour '+i,[-2,.8,z,2,.8,z],[0,1]);}
   lines(g,'800 mm gauge',[-1.15,0,1.1,-1.15,.8,1.1,-1.3,0,1.1,-1,0,1.1,-1.3,.8,1.1,-1,.8,1.1],[0,1,2,3,4,5]);
   active.anchors=[{text:'TOMA DE AIRE · guardafango elevado',point:[-.96,1.35,1.3]}];
  }else if(index===1){
   const positions=[[-.29,1.08,-1.2],[.29,1.08,-1.2],[-.29,1.08,-1.85],[.29,1.08,-1.85],[-.29,1.4,-1.5],[.29,1.4,-1.5]];
   active.boxes=positions.map((p,i)=>({entity:wireBox(g,'Cargo box '+i,p,[.5,.3,.5]),position:p,index:i}));
   for(const x of [-.7,.7])lines(g,'Adjustable cargo rail',[x,1.4,-.75,x,1.4,-2.35],[0,1]);
   active.anchors=[{text:'RIELES CON GANCHOS · ajustables',point:[-.73,1.4,-1.9]},{text:'GRADAS LATERALES',point:[-.96,.67,-2]}];
  }else if(index===2){
   wireBox(g,'Projected trailer',[0,1,-4.7],[1.65,.95,2.4]);
   lines(g,'Trailer tongue and coupling',[0,.42,-2.8,-.7,.42,-3.5,0,.42,-2.8,.7,.42,-3.5],[0,1,2,3]);
   for(const x of [-.9,.9]){const wheel=ring(g,'Trailer wheel',.32,0);wheel.setLocalEulerAngles(0,0,90);wheel.setLocalPosition(x,.36,-4.7);}
   active.hitch=[0,.42,-2.8];active.anchors=[{text:'FRENO DE REMOLQUE · control integrado',point:[0,.42,-2.8]}];
  }else if(index===3){
   const mesh=new pc.Mesh(app.graphicsDevice),positions=[],triangles=[],edges=[],n=10;
   for(let z=0;z<=n;z++)for(let x=0;x<=n;x++)positions.push((x/n-.5)*3.6,0,(z/n-.5)*6);
   for(let z=0;z<n;z++)for(let x=0;x<n;x++){const a=z*(n+1)+x;triangles.push(a,a+1,a+n+1,a+1,a+n+2,a+n+1);edges.push(a,a+1,a,a+n+1,a+1,a+n+1);}
   mesh.setPositions(positions);mesh.setIndices(triangles);mesh.setNormals(pc.calculateNormals(positions,triangles));mesh.update();meshEntity(g,'Faceted holographic terrain',mesh,material(.09));
   const e=lines(g,'Terrain contour',positions,edges);active.terrain={mesh,lineMesh:e.render.meshInstances[0].mesh,positions,triangles};
   active.anchors=[{text:'e-LD · bloqueo electrónico trasero',point:[-.8,.6,-1.63]},{text:'GROUND VIEW MONITOR',point:[0,.8,2.4]}];
  }else{
   wireBox(g,'Panoramic display projection',[0,1.22,1.05],[1.05,.24,.025],.05);
   for(const x of [.02,.2])wireBox(g,'Wireless charger projection',[x,.95,.45],[.14,.02,.22],.12);
   active.anchors=[{text:'PANTALLA PANORÁMICA',point:[-.32,1.28,1.02]},{text:'2 CARGADORES INALÁMBRICOS',point:[.17,.97,.45]},{text:'LFA 2 · FCA 2 · SCC',point:[.35,1.35,1.1]}];
  }
  return true;
 }
 function groundHeight(x,z){const tilt=model.getLocalEulerAngles(),pitch=tilt.x*Math.PI/180,roll=tilt.z*Math.PI/180;return .25-Math.sin(pitch)*z+Math.sin(roll)*x;}
 function end(){menu();mode='closing';autoOrbit=false;}
 camera.getPosition();app.graphicsDevice.canvas.addEventListener('pointerdown',()=>{autoOrbit=false;});
 app.on('update',delta=>{
  const dt=Math.min(delta,1/15);age+=dt;impactAge+=dt;
  if(transition){const tr=transition;tr.age+=dt;const u=Math.min(1,tr.age/tr.duration),s=u*u*(3-2*u),p=tr.position.clone().lerp(tr.position,new pc.Vec3(...tr.pose.position),s),q=tr.target.clone().lerp(tr.target,new pc.Vec3(...tr.pose.lookAt),s);d.setCameraPose({position:p.toArray(),lookAt:q.toArray(),fov:pc.math.lerp(tr.fromFov,tr.pose.fov,s),interior:tr.pose.interior});if(u===1){transition=null;tr.resolve(true);}}
  if(mode==='intro'){
   cue.light.intensity=Math.min(1.2,age*2);
   if(impactAge<.45){const f=(1-impactAge/.45)*.045;camera.translateLocal(Math.sin(impactAge*81)*f,Math.sin(impactAge*63)*f,0);}
  }
  if(dust&&impactAge<1.4){
   for(const {e,m,side,z,seed} of dust.puffs){const t=impactAge;e.setLocalPosition(side*(.8+t*(1.4+seed)),.15+t*.28,z+(seed-.5)*t);e.lookAt(camera.getPosition());e.rotateLocal(90,0,0);const scale=.45+t*(1.3+seed);e.setLocalScale(scale,1,scale*.65);m.opacity=Math.max(0,.32*(1-t/1.3));m.update();}
   for(const {e,side,z,seed} of dust.stones){const t=impactAge;e.setLocalPosition(side*(.8+t*(1.2+seed)),Math.max(.035,.04+t*(1.5+seed)-4.905*t*t),z+t*(seed-.5));e.setLocalEulerAngles(t*220,t*160,seed*80);}
   dust.pulse.setLocalScale(1+impactAge*2,1,1+impactAge*2);
  }else if(dust){dust.enabled=false;dust=null;}
  if(mode==='scan'&&scanGroup)scanGroup.setLocalPosition(0,Math.min(2.3,age*.9),0);
  if(mode==='menu'&&autoOrbit){orbitAngle+=dt*.12;d.setOrbit({azimuth:orbitAngle,elevation:.15,distance:10.2,target:[0,1,0]});}
  if(active?.index===0){active.waterLevel=Math.min(.8,age*.55);active.group.setLocalPosition(0,active.waterLevel-.8,0);for(let i=1;i<active.waterPositions.length;i+=3)active.waterPositions[i]=.8+Math.sin(active.waterPositions[i-1]*3+active.waterPositions[i+1]*2+age*2)*.012;active.water.render.meshInstances[0].mesh.setPositions(active.waterPositions);active.water.render.meshInstances[0].mesh.update();}
  if(active?.index===1)for(const box of active.boxes){const u=Math.max(0,Math.min(1,(age-box.index*.12)/.8)),h=1.8*Math.pow(1-u,3);box.entity.setLocalPosition(box.position[0],box.position[1]+h,box.position[2]);}
  if(active?.index===3){
   const u=Math.min(1,age/1.1),smooth=u*u*(3-2*u);model.setLocalEulerAngles(-4.5*smooth,0,2.5*smooth);model.setLocalPosition(0,.25*smooth,0);
   const terrain=active.terrain;for(let i=0;i<terrain.positions.length;i+=3){const x=terrain.positions[i],z=terrain.positions[i+2];const r=.06*Math.sin(Math.PI*(x+.81142)/1.62284)**2*Math.sin(Math.PI*(z+1.635)/3.27)**2;terrain.positions[i+1]=groundHeight(x,z)*smooth+r*smooth;}
   terrain.mesh.setPositions(terrain.positions);terrain.mesh.setNormals(pc.calculateNormals(terrain.positions,terrain.triangles));terrain.mesh.update();terrain.lineMesh.setPositions(terrain.positions);terrain.lineMesh.update(pc.PRIMITIVE_LINES);lighting.refreshShadows();
  }
 });
 return {startIntro:setIntro,skipIntro:skip,scan,menu,mission,closing:end,drop,onImpact(fn){impactListener=fn;},getState(){return {mode,age,impactAge,transition:!!transition,mission:active?.index??null,propCount:root.children.length,waterLevel:active?.waterLevel??null,hitch:active?.hitch??null,boxes:active?.boxes.map(b=>b.entity.getPosition().toArray())??[],wheelSupports:active?.index===3?wheels.map(w=>{const p=w.getPosition();return {bottom:p.y-.4049708,terrain:groundHeight(p.x,p.z),x:p.x,z:p.z};}):[],anchors:active?.anchors??[],drop:drop.getState()};},project(point){const p=camera.camera.worldToScreen(new pc.Vec3(...point));return {x:p.x,y:p.y,z:p.z};}};
}
