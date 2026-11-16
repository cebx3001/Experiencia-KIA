let preloadPromise;
const assetRevision=new URL(import.meta.url).searchParams.get('v');
function asset(path,base){const url=new URL(path,base);if(assetRevision)url.searchParams.set('v',assetRevision);return url}
export function prefetchSpin(base){
 if(preloadPromise||navigator.connection?.saveData||/^(slow-)?2g$/.test(navigator.connection?.effectiveType||''))return preloadPromise;
 const queue=Array.from({length:72},(_,i)=>(45+i)%72);
 const worker=async()=>{while(queue.length&&!document.hidden){const i=queue.shift();try{const response=await fetch(asset(`scan-frames/${String(i).padStart(2,'0')}.webp`,base),{priority:'low',cache:'force-cache'});if(response.ok)await response.arrayBuffer()}catch{}}};
 return preloadPromise=Promise.all([worker(),worker()]);
}
export function initSpin(root=document,base=new URL('.',import.meta.url)){
const canvas=root.querySelector('#car'),ctx=canvas.getContext('2d',{alpha:false}),poster=root.querySelector('#poster'),status=root.querySelector('#loading');
const count=72,maxDecoded=14,cache=new Map(),pending=new Map(),protectedFrames=new Set();let index=45,zoom=1,center={x:.5,y:.5},engaged=false,drawToken=0,pointers=new Map(),pinch=null,last=null,motion=0,viewPosition=45,inertia=0,velocity=0,lastMove=0,displayPosition=45,rendering=false,renderAgain=false,suspended=false;
const wrap=n=>(Math.round(n)%count+count)%count;
function dispose(){while(cache.size>maxDecoded){const [key,image]=cache.entries().next().value;if(key===index||protectedFrames.has(key)){cache.delete(key);cache.set(key,image);continue;}image.close();cache.delete(key)}}
async function frame(n){n=wrap(n);if(cache.has(n)){const image=cache.get(n);cache.delete(n);cache.set(n,image);return image;}if(pending.has(n))return pending.get(n);const work=(async()=>{const response=await fetch(asset(`scan-frames/${String(n).padStart(2,'0')}.webp`,base));if(!response.ok)throw Error('No se pudo cargar esa vista');const image=await createImageBitmap(await response.blob());cache.set(n,image);dispose();return image;})();pending.set(n,work);try{return await work}finally{pending.delete(n)}}
function geometry(){const w=canvas.width,h=canvas.height,base=w/960,z=base*zoom;return {z,x:w/2-center.x*960*z,y:h/2-center.y*540*z}}
function paint(image,next=null,mix=0){ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);const p=geometry();ctx.drawImage(image,p.x,p.y,960*p.z,540*p.z);if(next&&mix>0){ctx.globalAlpha=mix;ctx.drawImage(next,p.x,p.y,960*p.z,540*p.z);ctx.globalAlpha=1;}root.querySelector('#detail').hidden=engaged;}
async function render(){
 if(suspended)return;if(rendering){renderAgain=true;return}rendering=true;const token=drawToken;let failed=false;status.textContent='';
 const difference=(viewPosition-displayPosition+108)%72-36;
 const nextPosition=Math.abs(difference)<.05||matchMedia('(prefers-reduced-motion: reduce)').matches?viewPosition:(displayPosition+Math.max(-1.1,Math.min(1.1,difference*.45))+72)%72;
 const lower=Math.floor(nextPosition),mix=nextPosition-lower;protectedFrames.clear();protectedFrames.add(wrap(lower));protectedFrames.add(wrap(lower+1));
 try{const [image,next]=await Promise.all([frame(wrap(lower)),frame(wrap(lower+1))]);if(token!==drawToken||suspended)return;displayPosition=nextPosition;paint(image,next,mix);if(engaged)poster.hidden=true;
 const direction=Math.sign(difference)||1;for(const delta of [-1,1,-2,2,3*direction,4*direction,5*direction,6*direction])frame(wrap(displayPosition+delta)).catch(()=>{});
 }catch{failed=true;if(token===drawToken&&!suspended){viewPosition=displayPosition;index=wrap(displayPosition);status.textContent='No se pudo cargar la vista. Intenta girar de nuevo.'}}
 finally{rendering=false;const more=Math.abs((viewPosition-displayPosition+108)%72-36)>.01;if(!suspended&&!failed&&(more||renderAgain)){renderAgain=false;requestAnimationFrame(()=>render())}}
}
function stopInertia(){cancelAnimationFrame(inertia);inertia=0;velocity=0}
function dragBy(amount){engage();zoom=1;center={x:.5,y:.5};viewPosition=(viewPosition+amount+7200)%72;index=wrap(viewPosition);render()}
function coast(){if(matchMedia('(prefers-reduced-motion: reduce)').matches||Math.abs(velocity)<.002)return;let time=performance.now();const step=now=>{const dt=Math.min(32,now-time);time=now;velocity*=Math.pow(.87,dt/16.67);dragBy(velocity*dt);if(Math.abs(velocity)>.0008)inertia=requestAnimationFrame(step);else inertia=0};inertia=requestAnimationFrame(step)}
function engage(){suspended=false;engaged=true}
function rotate(amount){stopInertia();++motion;engage();zoom=1;center={x:.5,y:.5};index=wrap(index+amount);viewPosition=index;root.querySelector('#detail').textContent='Desliza para girar';render()}
function setZoom(value){stopInertia();engage();const next=Math.max(1,Math.min(3.5,value));if(next<zoom&&zoom>1){const scale=(next-1)/(zoom-1);center={x:.5+(center.x-.5)*scale,y:.5+(center.y-.5)*scale}}zoom=next;render()}
function reset(){suspended=false;stopInertia();++motion;++drawToken;index=45;viewPosition=45;displayPosition=45;zoom=1;center={x:.5,y:.5};engaged=false;poster.hidden=false;root.querySelector('#detail').hidden=false;root.querySelector('#detail').textContent='Desliza para girar';render()}
// Internal return to the shared master before changing experience; no pose controls.
async function centerCamera(){
 stopInertia();const ticket=++motion;engage();const oldZoom=zoom,oldCenter={...center};
 for(let step=1;step<=12;step++){if(ticket!==motion)return false;const t=step/12,e=t*t*(3-2*t);zoom=oldZoom+(1-oldZoom)*e;center={x:oldCenter.x+(.5-oldCenter.x)*e,y:oldCenter.y+(.5-oldCenter.y)*e};render();await new Promise(r=>setTimeout(r,16))}
 index=45;viewPosition=45;render();const deadline=performance.now()+10000;
 while(Math.abs((45-displayPosition+108)%72-36)>.02){if(ticket!==motion||performance.now()>deadline)return false;await new Promise(r=>setTimeout(r,16))}
 return true;
}
canvas.onpointerdown=e=>{stopInertia();lastMove=performance.now();++motion;canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});last={x:e.clientX,y:e.clientY};pinch=null;};
canvas.onpointermove=e=>{if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);velocity=0;if(pinch)setZoom(zoom*distance/pinch);pinch=distance;return;}pinch=null;const dx=e.clientX-old.x,dy=e.clientY-old.y;if(zoom>1.05){const rect=canvas.getBoundingClientRect(),p=geometry();center.x=Math.max(0,Math.min(1,center.x-dx/rect.width*canvas.width/(960*p.z)));center.y=Math.max(0,Math.min(1,center.y-dy/rect.height*canvas.height/(540*p.z)));engage();render();}else{const now=performance.now(),dt=Math.max(8,now-lastMove);velocity=Math.max(-.045,Math.min(.045,-dx/6.5/dt));lastMove=now;dragBy(-dx/6.5)}};
canvas.addEventListener('pointerup',e=>{pointers.delete(e.pointerId);pinch=null;if(pointers.size===0&&zoom<=1.05)coast()});
for(const name of ['pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>{pointers.delete(e.pointerId);pinch=null;if(name==='pointercancel')stopInertia()});

canvas.onkeydown=e=>{if(['ArrowLeft','ArrowRight','+','-','Home','Escape'].includes(e.key))e.preventDefault();if(e.key==='ArrowLeft')rotate(-1);if(e.key==='ArrowRight')rotate(1);if(e.key==='+')setZoom(zoom+.25);if(e.key==='-')setZoom(zoom-.25);if(e.key==='Home'||e.key==='Escape')centerCamera()};
canvas.addEventListener('wheel',event=>{if(event.ctrlKey){event.preventDefault();setZoom(zoom*Math.exp(-event.deltaY*.01))}},{passive:false});
new ResizeObserver(()=>{const rect=canvas.getBoundingClientRect();const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);const lower=wrap(Math.floor(displayPosition));if(cache.has(lower))paint(cache.get(lower),cache.get(wrap(lower+1)),displayPosition-Math.floor(displayPosition))}).observe(canvas);
window.addEventListener('pagehide',()=>{for(const image of cache.values())image.close();cache.clear()});
window.tasmanSpin={reset,center:centerCamera,stop:()=>{++motion;++drawToken;suspended=true;viewPosition=displayPosition;stopInertia()},getState:()=>({index:wrap(displayPosition),desiredIndex:index,viewPosition,displayPosition,zoom,center:{...center},decodedFrames:cache.size,pendingFrames:pending.size,engaged,isCoasting:!!inertia,cameraAtRest:!inertia&&!rendering&&Math.abs((viewPosition-displayPosition+108)%72-36)<.02})};
reset();

return window.tasmanSpin;
}
if(!document.querySelector('#campaign'))initSpin();
