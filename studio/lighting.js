import * as pc from './vendor/playcanvas.mjs';

// The probe captures the empty, independently designed studio, including its
// neutral floor. Analytic LTC emitters provide direct light; SH retains only
// indirect radiance so their diffuse contribution is not counted twice.
export function createStudioLighting(app, config, load){
 const lights=[], materials=new Set();let environment='cinematic';
 for(const panel of config.panels){
  const e=new pc.Entity(panel.name);
  e.addComponent('light',{
   type:'spot',shape:pc.LIGHTSHAPE_RECT,color:new pc.Color(...panel.tint),
   intensity:panel.linear_radiance*config.direct_scale,range:22,
   innerConeAngle:35,outerConeAngle:55,mask:1,castShadows:panel.cast_shadows,
   shadowResolution:1024,shadowType:pc.SHADOW_VSM_32F,
   vsmBlurSize:25,vsmBlurMode:pc.BLUR_GAUSSIAN,vsmBias:.0025,
   shadowBias:.08,normalOffsetBias:.03,shadowUpdateMode:pc.SHADOWUPDATE_THISFRAME,
   falloffMode:pc.LIGHTFALLOFF_INVERSESQUARED
  });
  e.setPosition(...panel.position_m);e.lookAt(new pc.Vec3(...panel.aim_m));
  e.rotateLocal(90,0,0);e.setLocalScale(panel.width_m,1,panel.height_m);
  app.root.addChild(e);lights.push(e);
  // Soft ground contact is baked from the actual vehicle geometry. Separate
  // floor lighting avoids overlapping punctual shadows from the LTC proxies.
  const ground=e.clone();ground.name=panel.name+' / ground';
  ground.light.mask=2;ground.light.castShadows=false;app.root.addChild(ground);
 }
 const original=pc.ShaderChunks.get(app.graphicsDevice).get('cubeMapProjectPS');
 const originMarker='vec3 envBoxPos = (envBoxMin + envBoxMax) * 0.5;';
 if(!original?.includes(originMarker)||!original.includes('uniform vec3 envBoxMax;'))
  throw Error('Unsupported environment projection shader; audit the engine update.');
 const projected=original.replace('uniform vec3 envBoxMax;',
  'uniform vec3 envBoxMax;\nuniform vec3 studioProbePosition;')
  .replace(originMarker,'vec3 envBoxPos = studioProbePosition;');
 const sh=new Float32Array(config.ambientSH.flat());
 const box=new pc.BoundingBox(new pc.Vec3(...config.projection_center_m),new pc.Vec3(...config.projection_half_extents_m));
 function configureMaterials(){
  for(const m of materials){
   if(environment==='cinematic'){
    m.ambientSH=sh;m.cubeMapProjection=pc.CUBEPROJ_BOX;m.cubeMapProjectionBox=box;
    m.getShaderChunks().set('cubeMapProjectPS',projected);
    m.setParameter('studioProbePosition',new Float32Array(config.probe_origin_m));
   }else{
    m.ambientSH=null;m.cubeMapProjection=pc.CUBEPROJ_NONE;
    m.getShaderChunks().delete('cubeMapProjectPS');m.deleteParameter('studioProbePosition');
   }
   m.update();
  }
 }
 return {
  bindMaterials(container){for(const a of container.materials)materials.add(a.resource);configureMaterials();},
  refreshShadows(){for(const e of lights)e.light.shadowUpdateMode=pc.SHADOWUPDATE_THISFRAME;},
  async setEnvironment(name){
   const file=name==='photo'?'studio-small-09-4k.hdr':'studio.hdr';
   const hdr=await load('assets/'+file,'texture');
   const source=pc.EnvLighting.generateLightingSource(hdr.resource,{size:1024});
   const atlas=pc.EnvLighting.generateAtlas(source,{size:1024}),previous=app.scene.envAtlas;
   app.scene.envAtlas=atlas;source.destroy();previous?.destroy();
   hdr.unload();app.assets.remove(hdr);environment=name;
   app.scene.skyboxIntensity=name==='cinematic'?config.reflection_intensity:.45;
   configureMaterials();
  }
 };
}
