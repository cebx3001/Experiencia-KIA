export function initSpin(root=document,base=new URL('.',import.meta.url)){
const canvas=root.querySelector('#car'),ctx=canvas.getContext('2d',{alpha:false}),poster=root.querySelector('#poster'),status=root.querySelector('#loading'),hotspots=root.querySelector('#hotspots');
const count=72,maxDecoded=14,cache=new Map(),pending=new Map();let index=45,zoom=1,center={x:.5,y:.5},engaged=false,drawToken=0,pointers=new Map(),pinch=null,last=null,motion=0;
const wrap=n=>(Math.round(n)%count+count)%count;
const details={lamps:{index:45,zoom:2.8,x:.80,y:.53,label:'Faros · detalle'},wheels:{index:36,zoom:2.5,x:.80,y:.68,label:'Ruedas · detalle'},bed:{index:27,zoom:1.9,x:.33,y:.48,label:'Paila · detalle'}};
function dispose(){while(cache.size>maxDecoded){const [key,image]=cache.entries().next().value;if(key===index){cache.delete(key);cache.set(key,image);continue;}image.close();cache.delete(key)}}
async function frame(n){n=wrap(n);if(cache.has(n)){const image=cache.get(n);cache.delete(n);cache.set(n,image);return image;}if(pending.has(n))return pending.get(n);const work=(async()=>{const response=await fetch(new URL(`frames/${String(n).padStart(2,'0')}.webp`,base));if(!response.ok)throw Error('No se pudo cargar esa vista');const image=await createImageBitmap(await response.blob());cache.set(n,image);dispose();return image;})();pending.set(n,work);try{return await work}finally{pending.delete(n)}}
function geometry(){const w=canvas.width,h=canvas.height,base=w/960,z=base*zoom;return {z,x:w/2-center.x*960*z,y:h/2-center.y*540*z}}
function paint(image){ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);const p=geometry();ctx.drawImage(image,p.x,p.y,960*p.z,540*p.z);root.querySelector('#zoom').textContent=`${zoom.toFixed(1)}×`;hotspots.hidden=zoom>1.05||index!==45;root.querySelector('#detail').hidden=zoom===1&&engaged;}
async function render(){const token=++drawToken;status.textContent='';try{const image=await frame(index);if(token!==drawToken)return;paint(image);if(engaged)poster.hidden=true;for(const delta of [-1,1,-2,2])frame(wrap(index+delta)).catch(()=>{});}catch{if(token===drawToken)status.textContent='No se pudo cargar la vista. Intenta girar de nuevo.'}}
function engage(){engaged=true;poster.hidden=true}
function rotate(amount){++motion;engage();zoom=1;center={x:.5,y:.5};index=wrap(index+amount);root.querySelector('#detail').textContent='Explora cada detalle';render()}
function setZoom(value){engage();zoom=Math.max(1,Math.min(3.5,value));if(zoom===1)center={x:.5,y:.5};render()}
function reset(){++motion;index=45;zoom=1;center={x:.5,y:.5};engaged=false;poster.hidden=false;hotspots.hidden=false;root.querySelector('#detail').hidden=false;root.querySelector('#detail').textContent='Explora cada detalle';render();for(const b of root.querySelectorAll('[data-detail]'))b.setAttribute('aria-pressed','false')}
async function pose(name){
const presets={perspective:{index:45,zoom:1,x:.5,y:.5,label:'Perspectiva'},profile:{index:36,zoom:1,x:.5,y:.5,label:'Perfil'},rear:{index:18,zoom:1,x:.5,y:.5,label:'Trasera'},paint:{index:45,zoom:2.2,x:.57,y:.46,label:'Pintura · detalle'},...details};const target=presets[name];if(!target)return;const ticket=++motion;engage();zoom=1;center={x:.5,y:.5};let difference=(target.index-index+108)%72-36;
try{while(difference!==0){if(ticket!==motion)return;index=wrap(index+Math.sign(difference));difference-=Math.sign(difference);const image=await frame(index);if(ticket!==motion)return;paint(image);await new Promise(r=>setTimeout(r,22));}
for(let step=1;step<=10;step++){if(ticket!==motion)return;const t=step/10,e=t*t*(3-2*t);zoom=1+(target.zoom-1)*e;center={x:.5+(target.x-.5)*e,y:.5+(target.y-.5)*e};await render();await new Promise(r=>setTimeout(r,14));}root.querySelector('#detail').textContent=target.label;root.querySelector('#detail').hidden=false;for(const b of root.querySelectorAll('[data-detail]'))b.setAttribute('aria-pressed',String(b.dataset.detail===name));}catch{status.textContent='No se pudo cargar el detalle. Intenta de nuevo.'}}
for(const button of root.querySelectorAll('[data-detail]'))button.onclick=()=>pose(button.dataset.detail);
canvas.onpointerdown=e=>{++motion;canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});last={x:e.clientX,y:e.clientY};pinch=null;};
canvas.onpointermove=e=>{if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinch)setZoom(zoom*distance/pinch);pinch=distance;return;}pinch=null;const dx=e.clientX-old.x,dy=e.clientY-old.y;if(zoom>1.05){const rect=canvas.getBoundingClientRect(),p=geometry();center.x=Math.max(0,Math.min(1,center.x-dx/rect.width*canvas.width/(960*p.z)));center.y=Math.max(0,Math.min(1,center.y-dy/rect.height*canvas.height/(540*p.z)));engage();render();}else if(Math.abs(e.clientX-last.x)>=5){const step=Math.trunc((last.x-e.clientX)/5);last={x:last.x-step*5,y:e.clientY};rotate(step)}};
for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>{pointers.delete(e.pointerId);pinch=null});
canvas.onkeydown=e=>{if(['ArrowLeft','ArrowRight','+','-','Home','Escape'].includes(e.key))e.preventDefault();if(e.key==='ArrowLeft')rotate(-1);if(e.key==='ArrowRight')rotate(1);if(e.key==='+')setZoom(zoom+.25);if(e.key==='-')setZoom(zoom-.25);if(e.key==='Home'||e.key==='Escape')reset()};
root.querySelector('#previous').onclick=()=>rotate(-1);root.querySelector('#next').onclick=()=>rotate(1);root.querySelector('#reset').onclick=reset;root.querySelector('#zoom-in').onclick=()=>setZoom(zoom+.4);root.querySelector('#zoom-out').onclick=()=>setZoom(zoom-.4);
new ResizeObserver(()=>{const rect=canvas.getBoundingClientRect();const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);if(cache.has(index))paint(cache.get(index))}).observe(canvas);
window.addEventListener('pagehide',()=>{for(const image of cache.values())image.close();cache.clear()});
window.tasmanSpin={reset,pose,getState:()=>({index,zoom,center:{...center},decodedFrames:cache.size,pendingFrames:pending.size,engaged})};
reset();

return window.tasmanSpin;
}
if(!document.querySelector('#campaign'))initSpin();
