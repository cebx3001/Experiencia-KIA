import {Vec3} from './vendor/playcanvas.mjs';
// Fixed-step artistic suspension motion about the original static ride height.
export function createDropPreview({app,model,setOrbit,lighting,controls=true,autoPlay=true,onImpact=()=>{}}){
 const names=['Kia.wheel.fr.l.001','Kia.wheel.fr.r.001','Kia.wheel.bk.l.001','Kia.wheel.bk.r.001'];
 const wheels=names.map(name=>{const entity=model.findByName(name);if(!entity)throw Error('Missing wheel assembly '+name);return {entity,base:entity.getPosition().clone()};});
 const base=model.getLocalPosition().clone();let bounds;
 model.forEach(e=>e.render?.meshInstances.forEach(mi=>{if(!bounds)bounds=mi.aabb.clone();else bounds.add(mi.aabb);}));
 const lo=bounds.getMin(),hi=bounds.getMax(),corners=[];
 for(const x of [lo.x,hi.x])for(const y of [lo.y,hi.y])for(const z of [lo.z,hi.z])corners.push(new Vec3(x,y,z));
 const camera=app.root.findByName('Inspection camera');
 const audit=wheels.map(w=>({name:w.entity.name,world:w.base.toArray(),meshes:w.entity.findComponents('render').length}));
 if(audit.some(w=>!w.meshes))throw Error('Incomplete wheel assembly');
 const frontZ=(wheels[0].base.z+wheels[1].base.z)/2,rearZ=(wheels[2].base.z+wheels[3].base.z)/2;
 if(Math.abs(frontZ-rearZ)<1)throw Error('Unexpected model axes');
 let initialHeight=3,y=3,v=0,t=0,running=false,contact=false,impactAt=null,seeking=false,rate=1,accumulator=0,startProjection=[];
 const dt=1/240;
 function reframe(){const host=document.querySelector('main'),frame=window.frameElement,width=frame?.clientWidth||host.clientWidth,height=frame?.clientHeight||host.clientHeight,aspect=width/height;app.resizeCanvas(width,height);camera.camera.aspectRatio=aspect;setOrbit({azimuth:-.74,elevation:.14,distance:10.7*Math.max(1,aspect/1.3),target:[0,1.35,0]});
  // Fit the entire translated world AABB ABOVE the viewport, not just the roof.
  for(initialHeight=3;initialHeight<40;initialHeight+=.25){startProjection=corners.map(p=>camera.camera.worldToScreen(new Vec3(p.x,p.y+initialHeight,p.z)));if(startProjection.every(p=>p.y< -24&&p.z>0))break;}
  if(initialHeight>=40)throw Error('Unable to frame an off-screen drop');
 }
 function reset(){y=initialHeight;v=0;t=0;contact=false;impactAt=null;accumulator=0;}
 function integrate(){
  if(!contact){v-=9.81*dt;y+=v*dt;if(y<=0){contact=true;impactAt=t;const impactVelocity=v;v=Math.max(-5.2,v);if(!seeking)onImpact({time:t,velocity:impactVelocity});}}
  else{v+=(-190*y-15*v)*dt;y+=v*dt;if(y<-.24){y=-.24;v=Math.max(0,-v*.15);}}
  t+=dt;if(impactAt!==null&&t-impactAt>2.2){y=0;v=0;running=false;}
 }
 function pose(){model.setLocalPosition(base.x,base.y+y,base.z);const lift=contact?Math.max(0,y-.075):Math.max(0,y);for(const w of wheels)w.entity.setPosition(w.base.x,w.base.y+lift,w.base.z);lighting.refreshShadows();}
 function replay(){reframe();reset();running=true;pose();}
 function seek(seconds){seeking=true;reset();for(let i=0;i<Math.floor(Math.min(8,Math.max(0,seconds))/dt);i++)integrate();seeking=false;running=false;pose();}
 function finish(){reset();y=0;v=0;contact=true;impactAt=0;running=false;pose();}
 app.on('update',delta=>{if(!running)return;accumulator+=Math.min(delta,1/15)*rate;while(accumulator>=dt){integrate();accumulator-=dt;}pose();});
 if(controls){
  const panel=document.createElement('section');panel.className='drop-panel';panel.innerHTML='<p>LABORATORIO · CAÍDA DESDE FUERA DE CÁMARA</p><h2>Caída de la Tasman</h2><button type="button" id="drop-replay">Repetir caída</button><label><input type="checkbox" id="drop-slow"> Cámara lenta ×0,25</label><a href="../experiencia/">Abrir experiencia completa</a>';
  document.body.classList.add('drop-preview');document.querySelector('main').append(panel);panel.querySelector('button').onclick=replay;panel.querySelector('input').onchange=e=>{rate=e.target.checked?.25:1;};
  const observer=new ResizeObserver(()=>{if(!running){reframe();if(t===0){reset();pose();}}});observer.observe(document.querySelector('main'));app.once('destroy',()=>observer.disconnect());
 }
 reframe();if(autoPlay)replay();else finish();
 return {replay,seek,finish,audit,axes:{up:'+Y',front:'+Z',frontZ,rearZ},getState:()=>({t,y,v,contact,running,initialHeight,impactAt,startProjection:startProjection.map(p=>p.toArray())})};
}
