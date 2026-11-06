export function chooseQuality(){
 const forced=new URLSearchParams(location.search).get('quality');
 const mobile=matchMedia('(pointer:coarse)').matches||/Android|iPhone|iPad/i.test(navigator.userAgent);
 const memory=navigator.deviceMemory??4,cores=navigator.hardwareConcurrency??4;
 let name=mobile||memory<=4?'mobile':'balanced';
 if(!mobile&&memory>=8&&cores>=8){const c=document.createElement('canvas'),gl=c.getContext('webgl2');if(gl){const e=gl.getExtension('WEBGL_debug_renderer_info'),r=e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'';if(/NVIDIA|Radeon RX|Apple M[234]/i.test(r))name='high';gl.getExtension('WEBGL_lose_context')?.loseContext();}}
 if(['mobile','balanced','high','master'].includes(forced))name=forced;
 return {name,file:{mobile:'kia-tasman-mobile.glb',balanced:'kia-tasman-balanced.glb',high:'kia-tasman-web.glb',master:location.hostname.endsWith('github.io')?'kia-tasman-web.glb':'kia-tasman-master.glb'}[name],pixelRatio:Math.min(devicePixelRatio,name==='mobile'?1:name==='balanced'?1.25:1.75),samples:name==='mobile'?8:name==='balanced'?12:24,shadow:name==='mobile'?512:1024,reflection:name==='mobile'?.18:name==='balanced'?.25:.35};
}
export function monitorQuality(app,frame,profile){
 const history=[];let elapsed=0,count=0,slow=0,lastChange=performance.now();
 app.on('update',dt=>{if(document.hidden||dt>.5)return;elapsed+=dt;count++;if(elapsed<3)return;const ms=elapsed/count*1000;history.push({ms,ratio:app.graphicsDevice.maxPixelRatio});if(history.length>20)history.shift();slow=ms>40?slow+1:0;
  if(slow>=2&&performance.now()-lastChange>10000&&app.graphicsDevice.maxPixelRatio>.6){app.graphicsDevice.maxPixelRatio=Math.max(.6,app.graphicsDevice.maxPixelRatio*.85);app.resizeCanvas(app.graphicsDevice.canvas.clientWidth,app.graphicsDevice.canvas.clientHeight);lastChange=performance.now();slow=0;}elapsed=0;count=0;
 });
 const visibility=()=>{app.timeScale=document.hidden?0:1;};document.addEventListener('visibilitychange',visibility);
 return {profile,history};
}
