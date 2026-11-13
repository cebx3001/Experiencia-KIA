// Phase 1: a rigid chassis drop with four wheel contacts and damped suspension.
// Artistic motion simulation; not an engineering vehicle dynamics model.
export function createDropPreview({app,model,setOrbit,lighting}){
 const names=['Kia.wheel.fr.l.001','Kia.wheel.fr.r.001','Kia.wheel.bk.l.001','Kia.wheel.bk.r.001'];
 const wheels=names.map(name=>{const entity=model.findByName(name);if(!entity)throw Error('Missing wheel assembly: '+name);return {entity,base:entity.getPosition().clone()};});
 const base=model.getLocalPosition().clone();
 const audit=wheels.map(w=>({name:w.entity.name,world:w.base.toArray(),meshes:w.entity.findComponents('render').length}));
 if(wheels.some(w=>!w.entity.findComponents('render').length))throw Error('Wheel assembly contains no geometry');
 const front=wheels.slice(0,2),rear=wheels.slice(2),frontZ=(front[0].base.z+front[1].base.z)/2,rearZ=(rear[0].base.z+rear[1].base.z)/2;
 if(Math.abs(frontZ-rearZ)<1||Math.abs(front[0].base.x-front[1].base.x)<1)throw Error('Unexpected model axes / wheelbase');
 let y=1.15,v=0,t=0,running=false,contact=false;
 const dt=1/240;
 function reset(){y=1.15;v=0;t=0;contact=false;}
 function integrate(){
  if(!contact){v-=9.81*dt;y+=v*dt;if(y<=0)contact=true;}
  else{v+=(-190*y-15*v)*dt;y+=v*dt;}
  t+=dt;
  if(t>2.6){y=0;v=0;running=false;}
 }
 function pose(){
  model.setLocalPosition(base.x,base.y+y,base.z);
  // World-space Y avoids relying on the imported wheel pivots' rotated axes.
  // Tires travel with the vehicle in free fall; stay on the floor during compression.
  const wheelLift=contact?Math.max(0,y-.075):Math.max(0,y);
  for(const w of wheels)w.entity.setPosition(w.base.x,w.base.y+wheelLift,w.base.z);
  lighting.refreshShadows();
 }
 function seek(seconds){reset();while(t+dt<=Math.min(2.7,Math.max(0,seconds)))integrate();pose();}
 function reframe(){const host=document.querySelector('main'),aspect=host.clientWidth/host.clientHeight;setOrbit({azimuth:-.74,elevation:.14,distance:10.7*Math.max(1,aspect/1.3),target:[0,1.35,0]});}
 function replay(){reset();running=true;reframe();pose();}
 const observer=new ResizeObserver(reframe);observer.observe(document.querySelector('main'));
 app.once('destroy',()=>observer.disconnect());
 const panel=document.createElement('section');panel.className='drop-panel';panel.innerHTML='<p>FASE 1 · EN VALIDACIÓN</p><h2>Caída de la Tasman</h2><button type="button" id="drop-replay">Repetir caída</button><label><input type="checkbox" id="drop-slow"> Cámara lenta ×0,25</label><p>Caída · compresión de suspensión · rebote</p><a href="captures/drop/slow-motion.mp4" target="_blank" rel="noopener">Ver clip en cámara lenta</a>';
 document.body.classList.add('drop-preview');
 document.querySelector('main').append(panel);
 const slow=panel.querySelector('input');
 let rate=1,accumulator=0;
 slow.onchange=()=>{rate=slow.checked?.25:1;};
 app.on('update',delta=>{
  if(!running)return;
  accumulator+=Math.min(delta,1/15)*rate;
  while(accumulator>=dt){integrate();accumulator-=dt;}
  pose();
 });
 function play(){replay();accumulator=0;}
 panel.querySelector('button').onclick=play;
 function sample(seconds){seek(seconds);running=false;}
 play();
 return {replay:play,seek:sample,audit,axes:{up:'+Y',front:frontZ>rearZ?'+Z':'-Z',frontZ,rearZ},getState:()=>({t,y,v,contact,running})};
}
