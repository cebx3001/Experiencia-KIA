// Optical detail and native-pixel clarity are independent of post-effect budgets.
export function chooseQuality(){
 const forced=new URLSearchParams(location.search).get('quality');
 const mobile=matchMedia('(pointer:coarse)').matches;
 const memory=navigator.deviceMemory??4;
 let name=mobile||memory<=4?'mobile':'balanced';
 if(['mobile','balanced','high','master'].includes(forced))name=forced;
 return {name,mobile:name==='mobile',file:{mobile:'kia-tasman-cinematic-lod.glb',balanced:'kia-tasman-balanced.glb',high:'kia-tasman-web.glb',master:location.hostname.endsWith('github.io')?'kia-tasman-web.glb':'kia-tasman-master.glb'}[name],pixelRatio:Math.min(devicePixelRatio,name==='high'?1.75:1.5),samples:name==='mobile'?8:12,shadow:name==='mobile'?512:1024,reflection:name==='mobile'?.18:.25};
}
export function monitorQuality(app,frame,profile){
 const history=[],window=[];let last=0,lastChange=0,paused=false;
 const nativeFloor=Math.min(devicePixelRatio,1.25);
 app.on('postrender',()=>{
  if(paused){last=0;window.length=0;return;}
  const now=performance.now();if(last&&!document.hidden){const ms=now-last;if(ms>0&&ms<5000)window.push(ms);}last=now;
  if(window.length<45||now-lastChange<15000)return;
  const p75=[...window].sort((a,b)=>a-b)[Math.floor(window.length*.75)];window.length=0;
  history.push({p75,ratio:app.graphicsDevice.maxPixelRatio});if(history.length>20)history.shift();
  if(p75>45){
   app.graphicsDevice.maxPixelRatio=Math.max(nativeFloor,app.graphicsDevice.maxPixelRatio-.125);
   frame.ssao.samples=6;frame.ssao.scale=.5;if(profile.mobile)frame.rendering.samples=1;frame.update();
   app.resizeCanvas(app.graphicsDevice.canvas.clientWidth,app.graphicsDevice.canvas.clientHeight);
  }else if(p75<19&&app.graphicsDevice.maxPixelRatio<profile.pixelRatio){
   app.graphicsDevice.maxPixelRatio=Math.min(profile.pixelRatio,app.graphicsDevice.maxPixelRatio+.125);
   frame.ssao.samples=profile.samples;frame.ssao.scale=1;frame.update();app.resizeCanvas(app.graphicsDevice.canvas.clientWidth,app.graphicsDevice.canvas.clientHeight);
  }
  lastChange=now;
 });
 document.addEventListener('visibilitychange',()=>{last=0;window.length=0;app.timeScale=document.hidden?0:1;});
 return {setPaused(value){paused=!!value;},profile,history,nativeFloor,antialias:'MSAA; no temporal image history'};
}
