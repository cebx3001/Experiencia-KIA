// PlayCanvas 2.23.1 imports KHR clearcoatFactor with a legacy 0.25 multiplier.
// Its current shader already evaluates the dielectric 0.04 Fresnel term.
// Restore the declared glTF coating strength without replacing any exported maps.
export function applyDeclaredCoating(container, manifest, pc, device){
 const declarations=new Map(manifest.materials.map(m=>[m.name,m]));
 const changes=[];
 const ltc=pc.ShaderChunks.get(device).get('ltcPS');
 const coatFresnel='getLTCLightSpecFres(ccLTCUV, vec3(clearcoatSpecularity))';
 if(!ltc?.includes(coatFresnel))throw Error('Unsupported LTC shader; audit the engine update.');
 const correctedLtc=ltc.replace(coatFresnel,'getLTCLightSpecFres(ccLTCUV, vec3(0.04)) * clearcoatSpecularity');
 for(const asset of container.materials){
  const material=asset.resource, source=declarations.get(material.name);
  const coat=source?.extensions?.KHR_materials_clearcoat;
  if(!coat)continue;
  const declared=coat.clearcoatFactor??0;
  const imported=material.clearCoat;
  material.clearCoat=declared;
  material.getShaderChunks().set('ltcPS',correctedLtc);material.shaderChunksVersion='2.23';
  material.update();
  changes.push({material:material.name,imported,declared,ltcCoatF0:.04,baseNormal:material.normalMap?.name,coatNormal:material.clearCoatNormalMap?.name});
 }
 return changes;
}

// The LTC path resets litArgs_specularity to 1 after evaluating reflected light.
// Dynamic refraction then receives that accumulator value as dielectric F0.
// Reconstruct F0 from the source IOR for these non-metallic glass materials.
export function applyGlassOptics(container, declarations, pc, device){
 const byName=new Map(declarations.map(d=>[d.material,d]));const changes=[];
 const original=pc.ShaderChunks.get(device).get('refractionDynamicPS');
 const marker='vec3 fresnel = vec3(1.0) -';
 if(!original?.includes(marker))throw Error('Unsupported refraction shader; audit the engine update.');
 const corrected=original.replace(marker,`#ifdef AREA_LIGHTS
 specularity = vec3(pow((1.0-refractionIndex)/(1.0+refractionIndex),2.0));
 #endif
 ${marker}`);
 for(const asset of container.materials){const m=asset.resource,d=byName.get(m.name);if(!d)continue;
  m.getShaderChunks().set('refractionDynamicPS',corrected);m.shaderChunksVersion='2.23';
  m.update();changes.push({material:m.name,sourceIOR:d.ior,normalIncidenceF0:Math.pow((d.ior-1)/(d.ior+1),2),transmission:m.refraction,mode:'physical tinted transmission; restore dielectric F0 in LTC refraction'});
 }
 return changes;
}
