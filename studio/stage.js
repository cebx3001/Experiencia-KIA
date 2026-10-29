import * as pc from './vendor/playcanvas.mjs';
import {BlurredPlanarReflection} from './vendor/blurred-planar-reflection.mjs';

// The backdrop and finish are studio surfaces. Vehicle material definitions and
// their maps are left intact while the photographic lighting is evaluated.
export function createStudioStage(app,camera,floor,cyclorama,config){
 const settings=config.stage, fm=floor.render.material;
 fm.diffuse.set(...settings.floor_color_srgb);fm.gloss=1-settings.floor_roughness;
 // Retain indirect fill under the vehicle; the baked ratio contains direct light only.
 fm.aoIntensity=.85;fm.emissive.set(.01,.01,.01);
 fm.getShaderChunks().set('emissivePS',`void getEmission(){
  dEmission=vec3(${settings.background_base_radiance}*smoothstep(8.0,24.0,length(vPositionW.xz)));
 }`);fm.update();
 const backdropMaterial=cyclorama.render.meshInstances[0].material;
 backdropMaterial.emissive.set(.01,.01,.01);
 backdropMaterial.getShaderChunks().set('emissivePS',`void getEmission(){
  dEmission=vec3(mix(${settings.background_base_radiance},${settings.background_top_radiance},smoothstep(0.0,9.0,vPositionW.y)));
 }`);backdropMaterial.update();

 const backdrop=new pc.Layer({name:'Studio backdrop'});app.scene.layers.insert(backdrop,0);
 cyclorama.render.layers=[backdrop.id];
 const finishLayer=new pc.Layer({name:'Studio floor finish'});
 const worldOpaque=app.scene.layers.layerList.findIndex((layer,i)=>layer.id===pc.LAYERID_WORLD&&!app.scene.layers.subLayerList[i]);
 // The finish must share scene depth with the vehicle, before the scene-color
 // copy and transparent glass. Adding it after UI would overdraw the body.
 app.scene.layers.insert(finishLayer,worldOpaque+1);
 camera.camera.layers=[...camera.camera.layers,backdrop.id,finishLayer.id];
 const finish=new pc.Entity('Reflective studio finish');
 finish.addComponent('render',{type:'plane',layers:[finishLayer.id],castShadows:false,receiveShadows:false});
 finish.setLocalScale(200,1,200);finish.setPosition(0,.002,0);finish.addComponent('script');app.root.addChild(finish);
 const r=settings.reflection;
 const reflection=finish.script.create(BlurredPlanarReflection,{properties:{
  mainCamera:camera,excludeLayers:[backdrop.id],resolution:r.resolution_scale,
  blurAmount:r.blur_amount,intensity:r.intensity,fadeStrength:r.fade_strength,
  angleFade:r.angle_fade,heightRange:r.height_range_m,
  fadeColor:new pc.Color(0,0,0,0),sceneColorMap:true
 }});
 return {
  setEnabled(enabled){finish.enabled=enabled;},
  getState(){return {enabled:finish.enabled,resolution:reflection.resolution,intensity:reflection.intensity,shadow:'direct area-light irradiance ratio',vehicleMaterialsChanged:false};}
 };
}
