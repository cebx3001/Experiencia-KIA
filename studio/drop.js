import {playbackClock} from './playback-clock.js';
import {Vec3,GraphNode} from './vendor/playcanvas.mjs';
import {rigidTracks,sampleRigid,applyChassis} from './rigid-playback.js?v=cines-20261114-r03-final';
// SI-unit rigid-body suspension playback, generated at 240 Hz with Rapier.
export function createDropPreview({app,model,setOrbit,lighting,controls=true,autoPlay=true,onImpact=()=>{},manualClock=()=>false}){
 const names=['Kia.wheel.fr.l.001','Kia.wheel.fr.r.001','Kia.wheel.bk.l.001','Kia.wheel.bk.r.001'];
 const wheels=names.map(name=>{const entity=model.findByName(name);if(!entity)throw Error('Missing wheel '+name);return {entity,base:entity.getPosition().clone(),rotation:entity.getRotation().clone()};});
 let bounds;model.forEach(e=>e.render?.meshInstances.forEach(mi=>{if(!bounds)bounds=mi.aabb.clone();else bounds.add(mi.aabb);}));const lo=bounds.getMin(),hi=bounds.getMax(),corners=[];for(const x of [lo.x,hi.x])for(const y of [lo.y,hi.y])for(const z of [lo.z,hi.z])corners.push(new Vec3(x,y,z));
 const wrapper=new GraphNode('Sprung chassis · physical dynamics');model.parent?.addChild(wrapper);model.reparent(wrapper);
 const camera=app.root.findByName('Inspection camera'),audit=wheels.map(w=>({name:w.entity.name,world:w.base.toArray(),meshes:w.entity.findComponents('render').length})),frontZ=(wheels[0].base.z+wheels[1].base.z)/2,rearZ=(wheels[2].base.z+wheels[3].base.z)/2,initialHeight=rigidTracks.config.dropHeightM;
 const clock=playbackClock(manualClock);let t=0,y=initialHeight,v=0,rate=1,running=false,contact=false,startProjection=[],lastShadow=-1,hero,start,heroFov=37,initialAim=-2;
 const impactAt=rigidTracks.drop.contactTime;
 function cameraPose(time){const f=Math.max(0,Math.min(1,(time-.25)/.8)),u=f*f*(3-2*f);camera.setPosition(hero);camera.camera.fov=12+(heroFov-12)*u;camera.lookAt(new Vec3(0,initialAim+(1.35-initialAim)*u,0));}
 function reframe(){const host=document.querySelector('main'),frame=window.frameElement,width=frame?.clientWidth||host.clientWidth,height=frame?.clientHeight||host.clientHeight,aspect=width/height;app.resizeCanvas(width,height);camera.camera.aspectRatio=aspect;setOrbit({azimuth:-.74,elevation:.14,distance:10.7*Math.max(1,aspect/1.3),target:[0,1.35,0]});hero=camera.getPosition().clone();heroFov=camera.camera.fov;start=hero.clone();for(initialAim=1;initialAim> -60;initialAim-=.5){cameraPose(0);camera.camera.onAppPrerender();startProjection=corners.map(p=>camera.camera.worldToScreen(new Vec3(p.x,p.y+initialHeight-.16,p.z)));if(startProjection.every(p=>p.y< -24&&p.z>0))break;}if(initialAim<=-60)throw Error('Cannot frame physical drop outside camera');}
 function pose(){const frame=sampleRigid(rigidTracks.drop,t);applyChassis(wrapper,frame[0]);y=frame[0][1]-1.1;for(let i=0;i<4;i++){wheels[i].entity.setPosition(...frame[i+1].slice(0,3));wheels[i].entity.setRotation(wheels[i].rotation);}cameraPose(t);if(t-lastShadow>.1){lighting.refreshShadows();lastShadow=t;}}
 function replay(){reframe();t=0;contact=false;running=true;lastShadow=-1;pose();}
 function finish(){running=false;t=0;y=0;v=0;contact=true;wrapper.setLocalPosition(0,0,0);wrapper.setLocalEulerAngles(0,0,0);for(const w of wheels){w.entity.setPosition(w.base);w.entity.setRotation(w.rotation);}lighting.refreshShadows();}
 function seek(seconds){t=Math.max(0,Math.min(4,seconds));contact=t>=impactAt;running=false;pose();if(t>=4)y=0;}
 app.on('update',delta=>{const dt=clock(delta);if(!running)return;const before=contact,oldY=y;t=Math.min(4,t+dt*rate);contact=t>=impactAt;pose();v=dt?((y-oldY)/dt):0;if(!before&&contact)onImpact({time:impactAt,velocity:rigidTracks.drop.impactVelocity});if(t>=4){running=false;y=0;}});
 if(controls){
  const panel=document.createElement('section');panel.className='drop-panel';panel.innerHTML='<p>LABORATORIO · CAÍDA DESDE FUERA DE CÁMARA</p><h2>Caída de la Tasman</h2><button type="button" id="drop-replay">Repetir caída</button><label><input type="checkbox" id="drop-slow"> Cámara lenta ×0,25</label><a href="../experiencia/">Abrir experiencia completa</a>';
  document.body.classList.add('drop-preview');document.querySelector('main').append(panel);panel.querySelector('button').onclick=replay;panel.querySelector('input').onchange=e=>{rate=e.target.checked?.25:1;};
  const observer=new ResizeObserver(()=>{if(!running){reframe();if(t===0){reset();pose();}}});observer.observe(document.querySelector('main'));app.once('destroy',()=>observer.disconnect());
 }
 reframe();if(autoPlay)replay();else finish();
 return {replay,seek,finish,setRate:value=>{rate=value;},audit,axes:{up:'+Y',front:'+Z',frontZ,rearZ},getState:()=>({t,y,v,contact,running,initialHeight,impactAt,physics:rigidTracks.audit,startProjection:startProjection.map(p=>p.toArray())})};
}
