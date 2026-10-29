// NODE_PATH=/path/to/playwright/node_modules node studio/tools/verify-studio.cjs [output-directory]
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
 const output = path.resolve(process.argv[2] || '/tmp/tasman-360');
 fs.mkdirSync(output, {recursive:true});
 const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const report={started:new Date().toISOString(),views:[],checks:[],errors:[],limitations:[
  'Software WebGL on Chromium; not a physical mobile/GPU performance test.',
  'Existing web GLB variant coverage and subtexel UV defects remain; no assertion of their repair.',
  'The closed-door floor bake matches the inherited floor lighting; linked new reflectors do not light the floor. Open-door ground contact remains approximate.'
 ]};
 try {
  const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
  page.setDefaultTimeout(180000);
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(process.env.STUDIO_URL || 'http://127.0.0.1:8765/studio/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>['ready','error'].includes(window.__tasmanMaster?.status),null,{timeout:360000});
  assert.equal(await page.evaluate(()=>__tasmanMaster.status),'ready');
  console.log('Studio ready');
  await page.evaluate(()=>__tasmanMaster.app.autoRender=false);
  async function settle(count=8){for(let i=0;i<count;i++)await page.evaluate(()=>new Promise(resolve=>{const app=__tasmanMaster.app;app.once('postrender',resolve);app.renderNextFrame=true;}));}
  const rig=await page.evaluate(async()=>{const config=await(await fetch('assets/studio-lighting.json')).json();return [...config.panels,...config.accents].map(p=>{const e=__tasmanMaster.app.root.findByName(p.name),v=p.aim_m.map((x,i)=>x-p.position_m[i]),n=Math.hypot(...v),up=e.up.toArray();return {name:p.name,cosine:-up.reduce((s,x,i)=>s+x*v[i]/n,0)};});});
  assert.ok(rig.every(r=>r.cosine>.99999),JSON.stringify(rig));report.sourceDirections=rig;
  report.checks.push('Every source aims at its declared target, including vertical ceiling sources');


  const initial=await page.evaluate(()=>({materials:__tasmanMaster.materials,transform:[...__tasmanMaster.model.getWorldTransform().data],coating:__tasmanMaster.coatingAdaptations,glass:__tasmanMaster.glassAdaptations}));
  await page.addStyleTag({content:'header,.title,aside,footer,.hint{display:none!important}'});
  for(const elevation of [.16,.55]) {
   const angles=elevation===.16?Array.from({length:12},(_,i)=>i*30):[0,90,180,270];
   for(const angle of angles) {
    const distance=elevation===.16?10.7:14;
    await page.evaluate(({angle,elevation,distance})=>__tasmanMaster.setOrbit({azimuth:angle*Math.PI/180,elevation,distance}),{angle,elevation,distance});
    await settle();
    let bounds;
    if(elevation>.5){
     bounds=await page.evaluate(async()=>{
      const pc=await import('./vendor/playcanvas.mjs'),d=__tasmanMaster;let box;
      d.model.forEach(e=>{if(e.render)for(const mi of e.render.meshInstances){if(!box)box=mi.aabb.clone();else box.add(mi.aabb);}});
      const lo=box.getMin(),hi=box.getMax(),points=[];
      for(const x of [lo.x,hi.x])for(const y of [lo.y,hi.y])for(const z of [lo.z,hi.z])points.push(d.camera.camera.worldToScreen(new pc.Vec3(x,y,z)));
      return {minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minY:Math.min(...points.map(p=>p.y)),maxY:Math.max(...points.map(p=>p.y)),depth:Math.min(...points.map(p=>p.z))};
     });
     assert.ok(bounds.minX>0&&bounds.maxX<1280&&bounds.minY>0&&bounds.maxY<800&&bounds.depth>0,'Elevated framing clips the model: '+JSON.stringify(bounds));
    }
    const name=`${elevation===.16?'orbit':'elevated'}-${String(angle).padStart(3,'0')}.png`;
    await page.screenshot({path:path.join(output,name)});
    assert.deepEqual(await page.evaluate(()=>[...__tasmanMaster.model.getWorldTransform().data]),initial.transform,'Vehicle moved during camera orbit');
    report.views.push({angle,elevation,distance,file:name,...(bounds?{bounds}:{})});console.log(name);
   }
  }
  report.checks.push('16 views; model world matrix identical throughout camera orbit');
  await page.evaluate(()=>__tasmanMaster.setView('hero'));await settle();
  await page.screenshot({path:path.join(output,'hero.png')});
  await page.setViewportSize({width:1920,height:1200});await settle();
  await page.screenshot({path:path.join(output,'hero-2k.png')});
  await page.setViewportSize({width:1280,height:800});await settle();
  // Use the actual UI handlers and update loop; no app.off or replacement model.
  await page.evaluate(()=>__tasmanMaster.setView('hero'));
  for(const door of ['front_left','front_right','rear_left','rear_right']) {
   await page.evaluate(door=>__tasmanMaster.setDoor(door,true),door);
   await page.waitForFunction(door=>Math.abs(__tasmanMaster.getDoorAngles()[door])>60,door);
   await page.evaluate(door=>__tasmanMaster.setDoor(door,false),door);
   await page.waitForFunction(door=>Math.abs(__tasmanMaster.getDoorAngles()[door])<1,door);
  }
  report.checks.push('Four doors open/close independently');
  await page.evaluate(()=>__tasmanMaster.setView('interior'));
  await settle();
  assert.equal(await page.evaluate(()=>__tasmanMaster.stage.getState().enabled),false);
  await page.screenshot({path:path.join(output,'interior.png')});
  await page.evaluate(()=>{__tasmanMaster.setAllDoors(false);__tasmanMaster.setView('hero');});
  report.checks.push('Interior and restored exterior cameras');
  for(const paint of ['gris','negro','verde','arena']) assert.equal(await page.evaluate(p=>__tasmanMaster.setPaint(p),paint),true);
  report.checks.push('Paint selector handlers preserved (known incomplete variant coverage remains)');
  await page.evaluate(()=>__tasmanMaster.setEnvironment('photo'));
  assert.equal(await page.evaluate(()=>__tasmanMaster.app.root.findComponents('light').some(l=>l.entity.enabled)),false);
  await settle();await page.screenshot({path:path.join(output,'photo-environment.png')});
  await page.evaluate(()=>__tasmanMaster.setEnvironment('cinematic'));
  assert.equal(await page.evaluate(()=>__tasmanMaster.app.root.findComponents('light').filter(l=>l.entity.enabled).length),23);
  report.checks.push('Photo environment disables analytic rig; studio restores inherited sources and new reflection sources');
  const optical=await page.evaluate(()=>{const rows=new Map();__tasmanMaster.model.forEach(e=>{if(e.render)for(const mi of e.render.meshInstances){const m=mi.material;rows.set(m.name,{name:m.name,clearcoat:m.clearCoat,transmission:m.refraction,roughness:m.glossInvert?m.gloss:1-m.gloss});}});return [...rows.values()];});
  assert.deepEqual(optical,initial.materials.map(({name,clearcoat,transmission,roughness})=>({name,clearcoat,transmission,roughness})));
  report.materials=initial.materials;report.opticalAdapters={coating:initial.coating,glass:initial.glass};
  assert.equal(report.errors.length,0,JSON.stringify(report.errors));
  report.passed=true;
 } catch(e) {report.passed=false;report.failure=String(e);throw e;}
 finally {report.finished=new Date().toISOString();fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
