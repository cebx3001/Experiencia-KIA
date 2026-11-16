import {WebHaptics} from './vendor/web-haptics/index.mjs';
// Native vibration on Android; WebKit switch workaround is an experimental fallback.
export function createImpactHaptics(){
 const standard=typeof navigator.vibrate==='function';
 const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const switchFallback=!standard&&ios&&'switch'in document.createElement('input');
 const fallback=switchFallback?new WebHaptics({debug:false,showSwitch:false}):null;
 const mode=standard?'vibration-api':switchFallback?'ios-switch-experimental':'unavailable';
 const touch=navigator.maxTouchPoints>0;let lastAttempt=null;
 const activated=()=>navigator.userActivation?.hasBeenActive??false;
 return {
  needsGesture:()=>touch&&mode!=='unavailable'&&!activated(),
  impact(mediaTime){
   if(document.hidden)return false;
   if(standard){
    try{const accepted=navigator.vibrate([90,35,40]);lastAttempt={mediaTime,mode,requestAccepted:accepted===true};return accepted===true}catch{lastAttempt={mediaTime,mode,requestAccepted:false};return false}
   }
   if(fallback){fallback.trigger([55,45,25],{intensity:1});lastAttempt={mediaTime,mode,requestAttempted:true,hardwareConfirmed:false};return true}
   lastAttempt={mediaTime,mode,requestAttempted:false};return false;
  },
  cancel(){if(standard)try{navigator.vibrate(0)}catch{};fallback?.cancel()},
  getState:()=>({mode,userActivated:activated(),lastAttempt,physicalDeviceVerified:false})
 };
}
