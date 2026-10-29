import * as pc from './vendor/playcanvas.mjs';

// The probe captures the empty, independently designed studio, including its
// neutral floor. Analytic LTC emitters provide direct light; SH retains only
// indirect radiance so their diffuse contribution is not counted twice.
export function createStudioLighting(app, config, load){
 const lights=[],groundLights=[],accents=[], materials=new Set();let environment='cinematic';
 function placePanel(entity,panel){
  const target=new pc.Vec3(...panel.aim_m),direction=new pc.Vec3(...panel.position_m).sub(target).normalize();
  entity.setPosition(...panel.position_m);
  // lookAt's default up vector is singular for a vertical target. Select an
  // orthogonal up vector so a ceiling source actually emits down along -Y.
  entity.lookAt(target,Math.abs(direction.y)>.999?pc.Vec3.FORWARD:pc.Vec3.UP);
  entity.rotateLocal(90,0,0);entity.setLocalScale(panel.width_m,1,panel.height_m);
 }

 for(const panel of config.panels){
  const e=new pc.Entity(panel.name);
  e.addComponent('light',{
   affectSpecularity:config.direct_specular??true,
   type:'spot',shape:pc.LIGHTSHAPE_RECT,color:new pc.Color(...panel.tint),
   intensity:panel.linear_radiance*config.direct_scale,range:28,
   innerConeAngle:40,outerConeAngle:70,mask:1,castShadows:panel.cast_shadows,
   shadowResolution:1024,shadowType:pc.SHADOW_VSM_32F,
   vsmBlurSize:25,vsmBlurMode:pc.BLUR_GAUSSIAN,vsmBias:.0025,
   shadowBias:.06,normalOffsetBias:.015,shadowUpdateMode:pc.SHADOWUPDATE_THISFRAME,
   falloffMode:pc.LIGHTFALLOFF_INVERSESQUARED
  });
  placePanel(e,panel);
  app.root.addChild(e);lights.push(e);
  // Soft ground contact is baked from the actual vehicle geometry. Separate
  // floor lighting avoids overlapping punctual shadows from the LTC proxies.
  const ground=e.clone();ground.name=panel.name+' / ground';
  ground.light.mask=2;ground.light.castShadows=false;app.root.addChild(ground);groundLights.push(ground);
 }
 // These reflection banks are not present in the inherited HDR. Keep their
 // direct specular contribution; inherited source values are retained, with
 // the vertical aiming correction applied above.
 for(const panel of config.accents??[]){
  const e=new pc.Entity(panel.name);
  e.addComponent('light',{type:'spot',shape:pc.LIGHTSHAPE_RECT,color:new pc.Color(1,1,1),
   intensity:panel.intensity*(config.accent_strength??1),range:panel.range_m??16,innerConeAngle:50,outerConeAngle:80,
   mask:panel.mask,castShadows:false,affectSpecularity:true,falloffMode:pc.LIGHTFALLOFF_INVERSESQUARED});
  placePanel(e,panel);app.root.addChild(e);accents.push({entity:e,panel});
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
  setAccentStrength(strength){for(const {entity,panel} of accents)entity.light.intensity=panel.intensity*strength;},
  setAccentPanels(panels){for(const {entity,panel} of accents){const value=panels.find(p=>p.name===panel.name);if(!value)continue;Object.assign(panel,value);placePanel(entity,panel);entity.light.intensity=panel.intensity;}},
  bindMeshes(root){root.forEach(e=>{if(e.render)for(const mi of e.render.meshInstances)if(mi.material.name==='MI_Tasman_Master_Wheel_Metal_SK_KiaTasman_Master')mi.mask|=4;});},
  bindMaterials(container){for(const a of container.materials)materials.add(a.resource);configureMaterials();},
  refreshShadows(){for(const e of lights)e.light.shadowUpdateMode=pc.SHADOWUPDATE_THISFRAME;},
  async setEnvironment(name){
   let atlas;
   if(name==='cinematic'&&config.environment_cache){
    const c=config.environment_cache;
    const meta=await(await fetch('assets/'+c.metadata)).json();
    if(meta.engine!==pc.version||meta.width!==1024||meta.height!==1024||meta.type!=='rgbp')
     throw Error('Studio atlas metadata does not match the pinned rendering pipeline.');
    const response=await fetch('assets/'+c.data);if(!response.ok)throw Error('Studio atlas HTTP '+response.status);
    const bytes=new Uint8Array(await response.arrayBuffer());
    if(bytes.byteLength!==meta.byte_length||bytes.byteLength!==1024*1024*4)throw Error('Incomplete studio atlas.');
    if(globalThis.crypto?.subtle){
     const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
     if(hash!==meta.sha256)throw Error('Studio atlas checksum mismatch.');
    }
    // Exact RGBP GPU bytes from the original 1024/1024 prefilter, not a
    // smaller HDR or an 8-bit photographic approximation. Readback/upload
    // orientation and all 4,194,304 bytes were verified on the GPU.
    atlas=new pc.Texture(app.graphicsDevice,{name:'Original studio / full-resolution GGX',
     width:1024,height:1024,format:pc.PIXELFORMAT_RGBA8,type:pc.TEXTURETYPE_RGBP,
     projection:pc.TEXTUREPROJECTION_EQUIRECT,flipY:false,mipmaps:false,
     addressU:pc.ADDRESS_CLAMP_TO_EDGE,addressV:pc.ADDRESS_CLAMP_TO_EDGE,levels:[bytes]});
   }else{
    const file=name==='photo'?'studio-small-09-4k.hdr':'studio.hdr';
    const hdr=await load('assets/'+file,'texture');
    const source=pc.EnvLighting.generateLightingSource(hdr.resource,{size:1024});
    atlas=pc.EnvLighting.generateAtlas(source,{size:1024});source.destroy();
    hdr.unload();app.assets.remove(hdr);
   }
   const previous=app.scene.envAtlas;app.scene.envAtlas=atlas;previous?.destroy();environment=name;
   for(const e of [...lights,...groundLights,...accents.map(a=>a.entity)])e.enabled=name==='cinematic';
   if(name==='cinematic')for(const e of lights)e.light.shadowUpdateMode=pc.SHADOWUPDATE_THISFRAME;
   app.scene.skyboxIntensity=name==='cinematic'?config.reflection_intensity:.45;
   configureMaterials();
  }
 };
}
