const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
 for(const viewport of [{width:1280,height:800},{width:390,height:844}]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/?quality=mobile',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__kiaViewerStatus?.loaded,null,{timeout:240000});
  await page.waitForTimeout(1600);
  const baseline=await page.evaluate(()=>{const v=__kiaIntegratedViewer,p=v.camera.getPosition();return {radius:Math.hypot(p.x,p.z),models:v.meshCount,profile:v.studio.performance.profile.name};});
  if(baseline.radius>23||baseline.models<10)throw Error('Vehicle hidden outside studio: '+JSON.stringify(baseline));
  for(const category of ['cameras','colors','exterior','interior']){await page.locator(`button[data-category="${category}"]`).click();await page.locator('#carouselNext').click();await page.locator('#carouselSelected').click();}
  await page.evaluate(()=>{const v=__kiaIntegratedViewer;for(const color of ['arena','gris','negro','verde']){v.setPaintColor(color);const materials=new Set();v.model.forEach(e=>e.render?.meshInstances.forEach(mi=>{if(/Premium_Paint|MI_Tasman_AGT|MI_Tasman_ABP|MI_Tasman_CGE/.test(mi.material.name))materials.add(mi.material.name);}));if(materials.size!==1)throw Error('Incomplete paint coverage '+color);}v.setDoorsOpen(true);});
  await page.waitForTimeout(1200);const doors=await page.evaluate(()=>__kiaIntegratedViewer.studio.getDoorAngles());if(!Object.values(doors).every(a=>Math.abs(a)>64.9))throw Error('Doors failed');
  await page.screenshot({path:`diagnostics/integrated-${viewport.width}.png`});if(errors.length)throw Error(errors.join('\n'));await page.close();
 }
 await browser.close();console.log('Integrated studio and original controls passed');
})().catch(e=>{console.error(e);process.exit(1);});
