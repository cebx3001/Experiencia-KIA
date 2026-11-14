import assert from 'node:assert/strict';
import * as pc from '../studio/vendor/playcanvas.mjs';
import {createDropPreview} from '../studio/drop.js';
// Exercise the actual pinned engine projection/cache with a conservative product
// AABB; geometry correctness is independently checked on the decoded GLB.
const results=[];
for(const [width,height] of [[390,844],[360,740],[390,492],[844,390]]){
 globalThis.window={frameElement:null};globalThis.document={querySelector:()=>({clientWidth:width,clientHeight:height})};
 const node=new pc.GraphNode('Inspection camera'),internal=new pc.Camera({width,height});internal.node=node;
 const component=Object.create(pc.CameraComponent.prototype);Object.assign(component,new pc.EventHandler());component._camera=internal;component.system={app:{graphicsDevice:{clientRect:{width,height}}}};node.camera=component;
 component.aspectRatio=width/height;component.fov=59;component.nearClip=.025;component.farClip=60;
 node.setPosition(.42,1.48,-.12);node.lookAt(new pc.Vec3(.08,1.25,1));component.onAppPrerender();component.worldToScreen(new pc.Vec3(0,1,0)); // Cache the interior view.
 const model=new pc.GraphNode('vehicle');model.render={meshInstances:[{aabb:new pc.BoundingBox(new pc.Vec3(0,1.05,0),new pc.Vec3(1.1,1.1,2.8))}]};
 for(const [i,name] of ['Kia.wheel.fr.l.001','Kia.wheel.fr.r.001','Kia.wheel.bk.l.001','Kia.wheel.bk.r.001'].entries()){const w=new pc.GraphNode(name);w.setPosition(i%2?.811:-.811,.405,i<2?1.635:-1.635);w.findComponents=()=>[{}, {}, {}];model.addChild(w);}
 let update,impacts=0;
 const app={root:{findByName:()=>node},resizeCanvas(){},on(event,fn){if(event==='update')update=fn;},once(){}};
 const setOrbit=({azimuth,elevation,distance,target})=>{component.horizontalFov=true;component.fov=37;node.setPosition(target[0]+distance*Math.sin(azimuth)*Math.cos(elevation),target[1]+distance*Math.sin(elevation),target[2]+distance*Math.cos(azimuth)*Math.cos(elevation));node.lookAt(new pc.Vec3(...target));};
 const drop=createDropPreview({app,model,setOrbit,lighting:{refreshShadows(){}},controls:false,autoPlay:false,manualClock:()=>true,onImpact:()=>impacts++});
 for(let repeat=0;repeat<2;repeat++){node.setPosition(.42,1.48,-.12);node.lookAt(new pc.Vec3(.08,1.25,1));component.onAppPrerender();component.worldToScreen(new pc.Vec3(0,1,0));drop.replay();const s=drop.getState();assert.ok(s.startProjection.every(p=>p[1]<-24&&p[2]>0));assert.ok(s.initialHeight>1.15);drop.seek(8);assert.equal(drop.getState().y,0);}
 drop.replay();for(let frame=0;frame<12;frame++)update(1/3);assert.equal(impacts,1,'one contact at 3 FPS');assert.equal(drop.getState().running,false);assert.equal(drop.getState().y,0);
 results.push({width,height,initialHeight:drop.getState().initialHeight,passed:true});
}
console.log(JSON.stringify({passed:true,camera:'PlayCanvas 2.23.1, including cached interior view',results},null,2));
