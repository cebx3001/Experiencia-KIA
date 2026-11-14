import {Quat,Vec3} from './vendor/playcanvas.mjs';
import {rigidTracks} from './r03-tracks.js?v=cines-20261114-r03';
export {rigidTracks};
export function sampleRigid(track,time){const f=Math.max(0,Math.min(track.frames.length-1,time/rigidTracks.dt)),i=Math.floor(f),j=Math.min(track.frames.length-1,i+1),u=f-i;return track.frames[i].map((a,k)=>{const b=track.frames[j][k];if(!a||!b)return a;const q=new Quat().slerp(new Quat(...a.slice(3)),new Quat(...b.slice(3)),u);return [...a.slice(0,3).map((v,n)=>v+(b[n]-v)*u),q.x,q.y,q.z,q.w];});}
export function applyChassis(node,body){const q=new Quat(...body.slice(3)),r=q.transformVector(new Vec3(0,1.1,0));node.setLocalPosition(body[0]-r.x,body[1]-r.y,body[2]-r.z);node.setLocalRotation(q);}
