const {chromium}=require('playwright'),fs=require('fs');
const assert=(condition,message)=>{if(!condition)throw Error(message)};
(async()=>{
 const browser=await chromium.launch({channel:process.env.TASMAN_CHROMIUM_PATH?undefined:'chrome',executablePath:process.env.TASMAN_CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 const results=[];
 for(const [name,width,height] of [['mobile',390,844],['small-mobile',360,740],['desktop',1280,800]]){
  const mobile=name!=='desktop',page=await browser.newPage({viewport:{width,height},hasTouch:mobile,isMobile:mobile}),errors=[],requests=[];
  page.setDefaultTimeout(25000);console.log(name,'boot');
  page.on('pageerror',error=>errors.push(String(error)));page.on('request',request=>requests.push(request.url()));
  await page.addInitScript(()=>{window.haptics=[];Object.defineProperty(navigator,'vibrate',{value:pattern=>{window.haptics.push({pattern,time:document.querySelector('video')?.currentTime});return true}})});
  await page.goto(process.env.TASMAN_TEST_URL||'http://127.0.0.1:8765/experiencia/');
  await page.waitForFunction(()=>window.__tasmanExperience?.getState().state==='intro');
  assert(!await page.locator('#enter,#replay').count(),'Unexpected entry gate/replay intro');
  assert(!requests.some(url=>/\/(xtrek|vadeo|storm|cargo|trailer|interior)\.mp4/.test(url)),'Feature downloaded before selection');
  await page.click('#sound');
  if(await page.evaluate(()=>document.querySelector('video').muted))await page.click('#sound');
  await page.waitForFunction(()=>document.querySelector('video').currentTime>1.8);
  let haptics=await page.evaluate(()=>window.haptics.filter(x=>Array.isArray(x.pattern)));
  assert(haptics.length===1&&haptics[0].time>=1.46&&haptics[0].time<2.1,'Impact sync '+JSON.stringify(haptics));
  await page.click('#pause');const paused=await page.evaluate(()=>document.querySelector('video').currentTime);await page.waitForTimeout(180);
  assert(Math.abs(await page.evaluate(()=>document.querySelector('video').currentTime)-paused)<.05,'Pause');
  await page.click('#pause');const before=await page.locator('#scene').boundingBox();
  await page.evaluate(()=>document.querySelector('video').currentTime=19.6);
  await page.waitForFunction(()=>window.__tasmanExperience.getState().state==='studio');
  await page.waitForFunction(()=>window.__tasmanExperience.getState().spin?.decodedFrames>=2);
  console.log(name,'handoff');const after=await page.locator('#scene').boundingBox();
  assert(['x','y','width','height'].every(k=>Math.abs(before[k]-after[k])<.1),'Scan/explorer stage jumps');
  assert(await page.locator('#detail').textContent()==='Desliza para girar','Missing swipe hint');
  await page.evaluate(()=>document.fonts.ready);
  const fonts=await page.evaluate(()=>[...document.fonts].filter(font=>font.status==='loaded').map(font=>({family:font.family,weight:font.weight})));
  assert(fonts.some(font=>font.family==='Kia Signature'&&font.weight==='300')&&fonts.some(font=>font.family==='Kia Signature'&&font.weight==='400'),'Actual Kia fonts not loaded');
  const textOnly=await page.evaluate(()=>[...document.querySelectorAll('#campaign button,#campaign a')].filter(e=>e.getClientRects().length).every(e=>{const s=getComputedStyle(e);return parseFloat(s.borderTopWidth)===0&&s.backgroundColor==='rgba(0, 0, 0, 0)'&&s.boxShadow==='none'}));assert(textOnly,'Non-text controls');
  await page.screenshot({path:'/tmp/tasman-r4-studio-'+name+'.png'});
  await page.click('#next');await page.waitForFunction(()=>window.__tasmanExperience.getState().spin.index===46&&window.__tasmanExperience.getState().spin.cameraAtRest);
  await page.click('#reset');await page.waitForFunction(()=>window.__tasmanExperience.getState().spin.index===45&&!window.__tasmanExperience.getState().spin.engaged);
  const canvas=page.locator('#car'),rect=await canvas.boundingBox(),start=await page.evaluate(()=>window.tasmanSpin.getState().displayPosition),samples=[];
  if(mobile){
   const cdp=await page.context().newCDPSession(page),y=rect.y+rect.height*.45;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rect.x+rect.width*.75,y}]});
   for(let i=1;i<=10;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:rect.x+rect.width*(.75-i*.04),y}]});await page.waitForTimeout(20);samples.push(await page.evaluate(()=>window.tasmanSpin.getState().displayPosition))}
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  }else{await page.mouse.move(rect.x+rect.width*.75,rect.y+rect.height*.45);await page.mouse.down();for(let i=1;i<=10;i++){await page.mouse.move(rect.x+rect.width*(.75-i*.04),rect.y+rect.height*.45);await page.waitForTimeout(20);samples.push(await page.evaluate(()=>window.tasmanSpin.getState().displayPosition))}await page.mouse.up()}
  assert(samples.some(n=>Math.abs(n-start)>.1),'Drag did not rotate');assert(samples.some(n=>Math.abs(n-Math.round(n))>.01),'No fractional interpolation');
  await page.waitForFunction(()=>window.tasmanSpin.getState().cameraAtRest);assert(await page.evaluate(()=>window.tasmanSpin.getState().decodedFrames)<=14,'Image cache exceeds limit');
  await page.click('#reset');await page.waitForFunction(()=>!window.tasmanSpin.getState().engaged);
  await page.click('#hotspots [data-detail=lamps]');await page.waitForFunction(()=>window.tasmanSpin.getState().zoom>2.7&&window.tasmanSpin.getState().cameraAtRest);await page.waitForTimeout(180);
  console.log(name,'details');await page.click('#open-menu');await page.waitForFunction(()=>window.__tasmanExperience.getState().state==='menu');assert(await page.locator('#explorer').isVisible(),'Menu lost interactive vehicle');
  await page.screenshot({path:'/tmp/tasman-r4-menu-'+name+'.png',fullPage:true});
  for(let i=0;i<6;i++){console.log(name,'mission',i);
   await page.locator(`[data-mission="${i}"]`).click();await page.waitForFunction(()=>window.__tasmanExperience.getState().state==='mission'&&document.querySelector('video').currentTime>.12);
   const format=await page.evaluate(()=>{const v=document.querySelector('video');return {width:v.videoWidth,height:v.videoHeight,duration:v.duration,muted:v.muted}});
   assert(format.width===720&&format.height===1280&&Math.abs(format.duration-20)<.05&&!format.muted,'Media format/audio '+JSON.stringify(format));
   if(i===2)assert((await page.locator('#panel').textContent()).includes('Control electrónico de estabilidad'),'ESC feature name');
   await page.evaluate(()=>{const v=document.querySelector('video');v.currentTime=19.8;v.playbackRate=4});
   await page.waitForFunction(()=>window.__tasmanExperience.getState().state==='menu');
  }
  await page.click('#finish');const completed=await page.evaluate(()=>window.__tasmanExperience.getState().completed);assert(new Set(completed).size===6,'Completion count');const href=await page.locator('#panel a.primary').getAttribute('href');assert(href.startsWith('https://wa.me/593999157077?'),'Official contact');
  await page.evaluate(()=>{document.querySelector('video').playbackRate=1;window.__tasmanExperience.enter()});await page.click('#skip');await page.waitForTimeout(1700);
  haptics=await page.evaluate(()=>window.haptics.filter(x=>Array.isArray(x.pattern)));assert(haptics.length===1,'Skipped intro vibrated');
  assert(!requests.some(url=>/\.glb|playcanvas|webgl/i.test(url)),'3D engine/model loaded');assert(errors.length===0,errors.join('\n'));
  results.push({name,width,height,autoplayIntro:true,noEntranceGate:true,noReplayIntroButton:true,stableScanStage:true,textOnlyControls:true,fonts,continuousDrag:true,fractionalFrames:true,maxDecodedFrames:14,smoothDetailAndReturn:true,interactiveMenu:true,missionCount:6,allVideoPortrait:true,allDurations20:true,audiblePlaybackEnabled:true,impactHaptics:haptics,skipCancelsImpact:true,pauseResume:true,officialWhatsapp:href,errors,physicalDevice:false});
  await page.close();
 }
 await browser.close();fs.mkdirSync('docs/tasman/evidence',{recursive:true});fs.writeFileSync('docs/tasman/evidence/mobile-browser-review.json',JSON.stringify({passed:true,results},null,2)+'\n');console.log(JSON.stringify(results));
})().catch(error=>{console.error(error);process.exit(1)});
