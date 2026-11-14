import {campaign,whatsappUrl} from './config.js?v=cines-20261114-r03-final';
const $=s=>document.querySelector(s),host=$('#experience'),iframe=$('#studio'),panel=$('#panel'),visited=new Set();
let enterStarted=0,scene=null,studio=null,state='loading',missionIndex=null,token=0,entered=false,impactCount=0,lastSceneMode='',audioContext=null,audioNodes=[];
const iconPaths=[
 '<path d="M2 7q3-4 6 0t6 0t6 0M2 13q3-4 6 0t6 0t6 0M2 19q3-4 6 0t6 0t6 0"/>',
 '<path d="m12 2 9 5v10l-9 5-9-5V7Zm-9 5 9 5 9-5M12 12v10M7 4l9 5"/>',
 '<path d="M2 8h14v10H2ZM16 14h5l2 3M2 18h21"/><circle cx="6" cy="19" r="2"/><circle cx="16" cy="19" r="2"/>',
 '<path d="m2 19 7-14 4 7 3-5 6 12M7 19l4-5 3 5"/>',
 '<rect x="2" y="4" width="20" height="12" rx="2"/><path d="M5 8h6M5 11h9M9 21h6M12 16v5"/>'
];
const icon=i=>`<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[i]}</svg>`;
const events=[];
function log(type,detail={}){events.push({type,detail,at:performance.now()});if(events.length>150)events.shift();}
function setState(value){state=value;host.dataset.state=value;$('#mission-count').textContent=value==='mission'?`${String(missionIndex+1).padStart(2,'0')} / 05`:'';$('#skip').hidden=value!=='intro';$('#loading-card').hidden=value!=='loading';panel.hidden=['loading','intro','scan'].includes(value);$('#scene-status').textContent=value==='scan'?'ESCANEANDO VEHÍCULO':value==='menu'?'THE ALL-TERRAIN PICKUP':'';if(value!=='intro')$('#curtain').style.opacity=0;log('state',{value});}
function stopAudio(){for(const node of audioNodes.splice(0))try{node.stop();}catch{} }
function audioStart(){try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume().catch(()=>{});const o=audioContext.createOscillator(),g=audioContext.createGain();o.type='sine';o.frequency.setValueAtTime(58,audioContext.currentTime);o.frequency.exponentialRampToValueAtTime(35,audioContext.currentTime+1.5);g.gain.setValueAtTime(.025,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+2);o.connect(g).connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+2);audioNodes.push(o);}catch{log('audio-unavailable');}}
function impact(){impactCount++;log('impact');try{if(audioContext){const buffer=audioContext.createBuffer(1,audioContext.sampleRate*.3,audioContext.sampleRate),a=buffer.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*Math.exp(-i/(a.length/6));const source=audioContext.createBufferSource(),filter=audioContext.createBiquadFilter(),gain=audioContext.createGain();filter.type='lowpass';filter.frequency.value=350;gain.gain.value=.18;source.buffer=buffer;source.connect(filter).connect(gain).connect(audioContext.destination);source.start();audioNodes.push(source);}}
 catch{}try{navigator.vibrate?.(70);}catch{} }
function presentation(){setState('presentation');panel.innerHTML='<h1 class="brand-title">KIA TASMAN</h1><p class="description">La pickup todoterreno. · 2.2 Turbodiésel · 4×4</p><button class="primary" id="features">VER FEATURES　›</button>';$('#features').onclick=menu;}
function menu(){++token;scene.menu();missionIndex=null;setState('menu');panel.innerHTML='<h2 class="menu-title">¿Qué quieres explorar?</h2><div class="grid">'+campaign.missions.map((m,i)=>`<button class="feature" data-mission="${i}"><b aria-hidden="true">${icon(i)}</b><small>${String(i+1).padStart(2,'0')}</small><span>${m.name.toUpperCase()}</span></button>`).join('')+'</div>';panel.querySelectorAll('[data-mission]').forEach(b=>b.onclick=()=>showMission(Number(b.dataset.mission)));}
async function showMission(index){
 if(!scene||index<0||index>=5)return;const current=++token;missionIndex=index;setState('mission');const m=campaign.missions[index];
 panel.innerHTML=`<p class="eyebrow">MISIÓN ${String(index+1).padStart(2,'0')} · ${m.eyebrow}</p><h2 class="value">${m.value} <small>${m.unit}</small></h2><p class="description">${m.description}</p><div class="chips">${m.chips.map(c=>`<span class="chip">${c}</span>`).join('')}</div><nav><button class="back" id="back" aria-label="Volver al menú">‹</button><div class="dots" aria-label="Misión ${index+1} de 5">${campaign.missions.map((_,i)=>`<span class="dot ${i===index?'active':''}"></span>`).join('')}</div><button id="next">${index===4?'FINALIZAR':'SIGUIENTE'}　›</button></nav>`;
 $('#back').onclick=menu;$('#next').onclick=()=>index===4?closing():showMission(index+1);
 log('mission-start',{index});const complete=await scene.mission(index);if(current!==token||!complete)return;visited.add(index);log('mission-complete',{index});
}
function closing(){++token;missionIndex=null;scene.closing();setState('closing');const url=whatsappUrl();panel.innerHTML=`<p class="eyebrow">MISIONES COMPLETADAS ${visited.size}/5</p><h2 class="closing-title">Ahora siéntela<br>en el camino.</h2><p class="description">Agenda tu test drive de la Kia Tasman por WhatsApp.<br>Un asesor te escribe hoy.</p>${url?`<a class="cta" href="${url}" target="_blank" rel="noopener">◉　AGENDAR TEST DRIVE</a>`:'<span class="cta" role="link" aria-disabled="true">AGENDAR TEST DRIVE</span><p class="pending">El contacto oficial de la campaña está por confirmar.</p>'}<div class="secondary-row"><button id="explore-again">VOLVER A EXPLORAR</button><a href="${campaign.kiaUrl}" target="_blank" rel="noopener">KIA ECUADOR　↗</a></div>`;$('#explore-again').onclick=menu;log('closing',{completed:visited.size});}
function skip(){if(state!=='intro')return;++token;stopAudio();scene.skipIntro();scene.scan();setState('scan');log('skip-intro');}
function enter(){if(!scene||entered)return;entered=true;audioStart();setState('intro');enterStarted=performance.now();$('#curtain').style.opacity=.999;scene.startIntro();log('enter');if(matchMedia('(prefers-reduced-motion: reduce)').matches)skip();}
$('#enter').onclick=enter;$('#skip').onclick=skip;
let readyResolve,readyReject;const ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});
for(const key of ['perf','slow'])if(new URLSearchParams(location.search).has(key))iframe.src+='&'+key+'=1';
let started=performance.now();
const loading=setInterval(()=>{
 try{
  const d=iframe.contentWindow?.__tasmanMaster;
  if(d?.status==='error')throw Error(d.errors.join('\n'));
  const progress=d?.loadProgress;
  if(progress?.phase==='download'){const percent=progress.total?Math.floor(progress.loaded/progress.total*100):null;$('#progress').textContent=percent===null?`${Math.round(progress.loaded/1e6)} MB`:`${percent}%`;$('.loader-ring').style.setProperty('--progress',`${percent??0}%`);$('#loading-status').textContent=percent===null?'Descargando modelo 3D…':`Descargando modelo 3D · ${(progress.loaded/1e6).toFixed(1)} de ${(progress.total/1e6).toFixed(1)} MB`;}
  else if(progress?.phase==='render'){$('#progress').textContent='100%';$('#loading-status').textContent='Modelo descargado · preparando luces y render…';}
  if(d?.campaign&&d.vehicleFrameReady){studio=d;scene=d.campaign;scene.onImpact(impact);clearInterval(loading);$('#progress').textContent='100%';$('#loading-status').textContent='Estudio listo';$('#enter').disabled=false;readyResolve();log('ready',{asset:d.asset,profile:d.performance.profile.name});}
  if(performance.now()-started>300000)throw Error('La carga está tardando demasiado. Comprueba la conexión y vuelve a abrir la experiencia.');
 }catch(e){clearInterval(loading);$('#load-error').hidden=false;$('#load-error').textContent=e.message;$('#loading-status').textContent='No se pudo preparar el estudio';log('error',{message:e.message});readyReject(e);}
},100);
setInterval(()=>{
 if(!scene)return;const s=scene.getState();
 if(state==='intro'){
  const elapsed=(performance.now()-enterStarted)/1000;$('#curtain').style.opacity=elapsed<.6?.999:Math.max(0,.999-(elapsed-.6)/.3);
  if(s.drop.contact&&!s.drop.running&&s.drop.t>=3.9){scene.skipIntro();scene.scan();setState('scan');}
 }else if(state==='scan'&&s.age>=4.2){scene.menu();presentation();}
 const anchors=$('#anchors');if(state==='mission'&&s.anchors.length){
  while(anchors.childElementCount>s.anchors.length)anchors.lastElementChild.remove();
  s.anchors.forEach((a,i)=>{let node=anchors.children[i];if(!node){node=document.createElement('span');node.className='callout';anchors.append(node);}if(node.textContent!==a.text)node.textContent=a.text;const p=scene.project(a.point),w=iframe.clientWidth,h=iframe.clientHeight;node.hidden=p.z<=0;node.style.left=`${Math.max(70,Math.min(w-70,p.x))}px`;node.style.top=`${Math.max(70,Math.min(h-20,p.y-15))}px`;});
 }else if(anchors.childElementCount)anchors.replaceChildren();
 lastSceneMode=s.mode;
},100);
let hiddenAt=0;
document.addEventListener('visibilitychange',()=>{if(document.hidden){hiddenAt=performance.now();stopAudio();audioContext?.suspend();}else{if(hiddenAt&&state==='intro')enterStarted+=performance.now()-hiddenAt;hiddenAt=0;if(entered)audioContext?.resume().catch(()=>{});}});
if(campaign.brandFontUrl){const font=new FontFace('Kia Signature',`url(${campaign.brandFontUrl})`);font.load().then(f=>document.fonts.add(f)).catch(()=>log('brand-font-unavailable'));}
window.__tasmanExperience={ready,enter,replayIntro:()=>{entered=false;enter();},skipIntro:skip,menu,showMission,closing,get studio(){return studio;},get scene(){return scene;},getState:()=>({state,missionIndex,completed:[...visited],impactCount,events:[...events],scene:scene?.getState(),release:campaign.release}),whatsappUrl};
