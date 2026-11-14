import * as pc from './vendor/playcanvas.mjs';
// Original procedural assets, CC0. No third-party textures or meshes.
export function surfaceScanner(app,model){
 const bindings=[];
 model.forEach(e=>e.render?.meshInstances.forEach(mi=>{const m=mi.material;if(bindings.includes(m))return;bindings.push(m);const chunks=m.getShaderChunks(),original=chunks.get('emissivePS')||pc.ShaderChunks.get(app.graphicsDevice).get('emissivePS');chunks.set('emissivePS',`uniform float tasmanScan;\n`+original.replace(/void getEmission\(/,'void originalEmission(')+`\nvoid getEmission(){originalEmission();if(tasmanScan>-20.0){float band=exp(-pow((vPositionW.z-tasmanScan)*26.0,2.0));float trail=smoothstep(0.0,0.22,vPositionW.z-tasmanScan)*(1.0-smoothstep(0.22,0.55,vPositionW.z-tasmanScan));float dots=step(0.86,sin(vPositionW.x*145.0)*sin(vPositionW.y*145.0));dEmission+=vec3(0.03,1.1,1.5)*(band+trail*dots*0.4);}}`);m.setParameter('tasmanScan',-100);m.update();}));
 return z=>{for(const m of bindings)m.setParameter('tasmanScan',z);};
}
export function createWater(app,parent){
 const m=new pc.StandardMaterial();m.diffuse.set(.035,.17,.20);m.specular.set(.3,.45,.5);m.metalness=.08;m.useMetalness=true;m.gloss=.78;m.opacity=.36;m.blendType=pc.BLEND_NORMAL;m.depthWrite=false;m.cull=pc.CULLFACE_NONE;m.bumpiness=.6;
 const chunks=m.getShaderChunks();chunks.set('normalMapPS',`uniform float waterTime;void getNormal(){vec2 p=vPositionW.xz;float a=sin(p.x*4.0+p.y*2.0+waterTime*1.8);float b=cos(p.y*6.0-p.x*1.5-waterTime*1.3);dNormalW=abs(dVertexNormalW.y)>0.5?normalize(vec3(a*0.09,1.0,b*0.08)):normalize(dVertexNormalW);}`);
 // Enable the normal chunk with a tiny neutral normal texture; waves stay entirely on GPU.
 const tex=new pc.Texture(app.graphicsDevice,{width:1,height:1,levels:[new Uint8Array([128,128,255,255])],mipmaps:false});m.normalMap=tex;m.setParameter('waterTime',0);m.update();
 const e=new pc.Entity('Water volume · 800mm');e.addComponent('render',{type:'box',castShadows:false,receiveShadows:false});e.render.material=m;parent.addChild(e);e.setLocalScale(4.8,.001,7.8);
 return {entity:e,material:m,update(t){const h=Math.min(.8,t*.32);e.setLocalScale(4.8,Math.max(.001,h),7.8);e.setLocalPosition(0,h/2,0);m.setParameter('waterTime',t);return h;},destroy(){tex.destroy();}};
}
export function rockHeight(x,z){return .12+.12*(z+3)+.085*Math.sin(z*2.7+x*1.5)+.045*Math.cos(x*6-z*3);}
export function createRockTerrain(app,parent){
 const n=40,p=[],uv=[],idx=[];for(let z=0;z<=n;z++)for(let x=0;x<=n;x++){const xx=(x/n-.5)*3.8,zz=(z/n-.5)*8;p.push(xx,rockHeight(xx,zz),zz);uv.push(xx,zz);}
 for(let z=0;z<n;z++)for(let x=0;x<n;x++){const a=z*(n+1)+x;idx.push(a,a+n+1,a+1,a+1,a+n+1,a+n+2);}
 // Close the ramp to the studio floor so it reads as rock volume, not a sheet.
 const edge=[];for(let i=0;i<=n;i++)edge.push(i);for(let i=1;i<=n;i++)edge.push(i*(n+1)+n);for(let i=n-1;i>=0;i--)edge.push(n*(n+1)+i);for(let i=n-1;i>0;i--)edge.push(i*(n+1));
 for(let k=0;k<edge.length;k++){const a=edge[k],b=edge[(k+1)%edge.length],c=p.length/3;p.push(p[a*3],-.03,p[a*3+2],p[b*3],-.03,p[b*3+2]);uv.push(0,0,1,0);idx.push(a,c,b,b,c,c+1);}
 const mesh=pc.createMesh(app.graphicsDevice,p,{normals:pc.calculateNormals(p,idx),uvs:uv,indices:idx});const m=new pc.StandardMaterial();m.diffuse.set(.19,.18,.165);m.gloss=.12;m.useSkybox=true;
 m.getShaderChunks().set('diffusePS',`void getAlbedo(){vec3 p=vPositionW*13.0;float grain=fract(sin(dot(floor(p*6.0),vec3(12.9898,78.233,37.719)))*43758.5453);float strata=sin(p.x+p.y*3.0+sin(p.z*2.0));dAlbedo=vec3(0.055,0.052,0.05)*(0.65+grain*0.4+strata*0.13);}`);m.update();
 const e=new pc.Entity('Static rock ramp');e.addComponent('render',{meshInstances:[new pc.MeshInstance(mesh,m,e)],castShadows:false});parent.addChild(e);for(let i=0;i<10;i++){const rock=new pc.Entity('Roadside boulder '+i);rock.addComponent('render',{type:'sphere',castShadows:false,receiveShadows:true});rock.render.material=m;const x=(i%2?1:-1)*1.62,z=-3.4+Math.floor(i/2)*1.5;rock.setLocalPosition(x,rockHeight(x,z),z);rock.setLocalScale(.65,.25+(i%3)*.12,.8);rock.setLocalEulerAngles(i*13,i*29,i*7);parent.addChild(rock);}return {mesh,material:m};
}
export function buildTrailer(parent,wireBox,lines,ring){
 // Geometry reference: 2.5 × 1.5 m single axle utility trailer layout.
 // Technical reference: https://github.com/johnharveyusa/trailerjoes (reference only; no copied assets)
 wireBox(parent,'Galvanized chassis',[0,.52,-4.8],[1.65,.12,2.5],.18);
 wireBox(parent,'Load bed',[0,.75,-4.8],[1.55,.4,2.45],.08);
 for(const x of [-.82,.82]){wireBox(parent,'Top rail',[x,1,-4.8],[.045,.06,2.5],.28);wireBox(parent,'Mudguard',[x*1.15,.75,-4.9],[.32,.12,.8],.24);}
 lines(parent,'A frame coupling',[0,.42,-2.8,-.75,.52,-3.55,0,.42,-2.8,.75,.52,-3.55,-1,.35,-4.9,1,.35,-4.9],[0,1,2,3,4,5]);
 wireBox(parent,'Coupler',[0,.44,-2.9],[.14,.12,.3],.3);
 for(const x of [-.97,.97])for(const offset of [-.09,0,.09]){const w=ring(parent,'Tire profile',.34,0);w.setLocalEulerAngles(0,0,90);w.setLocalPosition(x+offset,.35,-4.9);}
}
