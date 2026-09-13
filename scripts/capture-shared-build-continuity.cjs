const { chromium } = require(process.env.ISLAND_PLAYWRIGHT || '/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const {createHash} = require('node:crypto');
const sources=['Island5ThreePilot.tsx','IslandTemplateKitPage.tsx','IslandConstructionCommissioningFx.ts','Island3FrostmoonThreeWorld.ts','Island3FrozenWorldThreeModel.ts','Island3FrostfireInspectionGeometry.ts','Island3MoonwellThermalPresentation.ts'];
const snapshot=()=>Object.fromEntries(sources.map(name=>[name,createHash('sha256').update(fs.readFileSync(`src/features/gamification/level-worlds/dev/${name}`)).digest('hex')]));
const phoneSnapshot=()=>Object.fromEntries(['LevelWorlds.css','components/IslandMissionBriefingModal.tsx','services/islandRunMissionTracker.ts'].map(name=>[name,createHash('sha256').update(fs.readFileSync(`src/features/gamification/level-worlds/${name}`)).digest('hex')]));
(async()=>{
 const folder=process.argv[2]; assert(folder && !fs.existsSync(folder),'Supply a new output directory');fs.mkdirSync(folder,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.ISLAND_CHROME || '/Users/ejmac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',headless:true});
 const records=[],errors=[]; let completed=false,failure=null;
 try {
  const allIsland3=process.argv.includes('--island3-all');
  // Keep one dev-preview context warm across the 15 local level fixtures.
  const reusablePage=allIsland3?await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1}):null;
  const cases=allIsland3?['boss','wisdom','hatchery','habit','mystery'].flatMap(landmark=>[0,1,2].map(level=>[3,landmark,390,844,false,level])):[[3,'boss',390,844,false],[3,'wisdom',390,844,false],[1,'hatchery',390,844,false],[2,'habit',390,844,true],[15,'wisdom',390,844,false],[3,'boss',1280,800,false]].filter(item=>!process.argv.includes('--desktop-only') || item[2]===1280).slice(0,process.argv.includes('--phone-only')?0:process.argv.includes('--first')?1:6);
  for(const [island,landmark,width,height,reduced,level=2] of cases){
   const start=snapshot(); const name=`${island}-${landmark}-L${level+1}-${width}${reduced?'-reduced':''}`;
   const page=reusablePage??await browser.newPage({viewport:{width,height},deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference'});
   page.setDefaultTimeout(120000);
   page.on('framenavigated',frame=>{if(frame===page.mainFrame())console.log('NAV',name,frame.url());});
   page.on('pageerror',error=>errors.push(`${name}: ${error}`));
   page.on('console',msg=>{if(msg.type()==='error')console.log('CONSOLE',msg.text().slice(0,900));});
   await page.goto(`http://127.0.0.1:53303/dev/island-template-kit?island=${island}&mode=3d&level=${level}&construction=1&working=1&constructionProgress=1&landmark=${landmark}&cameraAuthoring=1&reduced=${reduced?1:0}`);
   await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.constructionEvidence,null,{timeout:180000});
   await page.waitForTimeout(1000);
   const read=async()=>{if(!await page.locator('canvas').count()){await page.screenshot({path:path.join(folder,'failure.png')});console.log('BODY',await page.locator('body').innerText());}return page.locator('canvas').first().evaluate(c=>({pose:JSON.parse(c.dataset.cameraAuthoringPose),model:JSON.parse(c.dataset.constructionEvidence),pulse:Number(c.dataset.constructionCommissioningScale),framing:c.dataset.constructionFraming,phase:c.dataset.constructionCrewPhase,ground:JSON.parse(c.dataset.constructionLandmarkGrounding)}));};
   const states={working:await read()};
   const click=async label=>{try {await page.getByRole('button',{name:label,exact:true,includeHidden:true}).dispatchEvent('click');}catch(error){await page.screenshot({path:path.join(folder,`${name}-failure.png`)});fs.writeFileSync(path.join(folder,`${name}-failure.txt`),await page.locator('body').innerText());throw error;}};
   await click('Construction review');const samples=[];
   for(let n=0;n<10;n++){await page.waitForTimeout(110);samples.push(await read());}
   states.review=await read();
   await page.getByRole('button',{name:'Hide overlays for evidence',exact:true,includeHidden:true}).dispatchEvent('click');
   await page.screenshot({path:path.join(folder,`${name}-review.png`)});
   await click('Construction celebration');await page.waitForTimeout(1250);states.celebration=await read();
   await page.screenshot({path:path.join(folder,`${name}-celebration.png`)});
   await click('Construction closed');await page.waitForTimeout(100);await click('Build Wisdom immediately');
   await page.waitForFunction(()=>JSON.parse(document.querySelector('canvas')?.dataset.cameraAuthoringPose??'{}').preset==='wisdom',null,{timeout:5000});
   states.reopen=await read();
   assert(states.reopen.pose.preset==='wisdom',`${name} immediate reopen must frame new target`);
   for(const state of [...samples,states.review,states.celebration]){
    assert.equal(state.model.sourceVisible,false,`${name} board source stays hidden`);
    assert.equal(state.model.previewVisible,true,`${name} preview persists`);
    assert.equal(state.model.stageY,0,`${name} building grounded`);
    assert(state.pulse>=.98&&state.pulse<=1.04,`${name} bounded single pulse`);
    if(reduced)assert.equal(state.pulse,1,`${name} reduced motion stationary`);
    assert.equal(state.ground.verticalError,0,`${name} source and preview foundation align`);
   }
   const widthOf=s=>s.model.projectedMax[0]-s.model.projectedMin[0];
   const ratio=widthOf(states.celebration)/widthOf(states.review);
   assert(Math.abs(ratio-1)<.025,`${name} finale size continuity: ${ratio}`);
   assert.deepEqual(snapshot(),start,'Source changed during evidence capture');
   records.push({name,states,samples,finaleWidthRatio:ratio,sourceHashes:start});console.log('PASS',name,ratio);if(!reusablePage)await page.close();
  }
  if(reusablePage)await reusablePage.close();
  for(const [width,height] of [[390,844],[360,640],[844,390]]){
   const sourceHashes=phoneSnapshot();
   const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(String(e)));
   page.setDefaultTimeout(120000);
   await page.goto('http://127.0.0.1:53303/docs/gauntlets/island-003-v2/qa/mission-phone-preview.html');
   await page.getByRole('list',{name:'Mission objectives'}).waitFor({timeout:120000});
   await page.waitForFunction(()=>document.querySelector('.island-mission-tracker')?.getAttribute('data-phase')==='open' && getComputedStyle(document.querySelector('.island-mission-tracker__phone-screen')).opacity==='1');
   await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
   await page.screenshot({path:path.join(folder,`mission-phone-${width}x${height}.png`)});
   const layout=await page.locator('.island-mission-tracker__checklist li').evaluateAll(rows=>rows.map(row=>{const r=row.getBoundingClientRect();return {text:row.textContent,top:r.top,bottom:r.bottom,left:r.left,right:r.right}}));
   assert.equal(layout.length,3);
   const screen=page.locator('.island-mission-tracker__phone-screen');
   for(const row of await page.locator('.island-mission-tracker__checklist li').all()) {
    await row.scrollIntoViewIfNeeded();
    const [box,screenBox]=await Promise.all([row.boundingBox(),screen.boundingBox()]);
    assert(box.y>=screenBox.y-1 && box.y+box.height<=screenBox.y+screenBox.height+1,'Each objective is reachable inside the device screen');
    assert(await row.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Objective content must not overflow its row');
   }
   const last=await page.locator('.island-mission-tracker__checklist li').last().boundingBox();
   const footer=await page.locator('.island-mission-tracker__overall').boundingBox();
   assert(last.y+last.height<=footer.y+1,'Activities must not overlap the progress footer');
   for(const label of await page.locator('.island-mission-tracker__objective-copy > strong').all()) {
    assert(await label.evaluate(el=>el.scrollWidth<=el.clientWidth+1 && el.scrollHeight<=el.clientHeight+1),'Objective label must be fully readable');
   }
   await page.locator('.island-mission-tracker__overall').scrollIntoViewIfNeeded();
   const [visibleFooter,visibleScreen]=await Promise.all([page.locator('.island-mission-tracker__overall').boundingBox(),screen.boundingBox()]);
   assert(visibleFooter.y>=visibleScreen.y-1 && visibleFooter.y+visibleFooter.height<=visibleScreen.y+visibleScreen.height+1,'Overall progress is reachable inside the phone');
   const scroll=await screen.evaluate(el=>({top:el.scrollTop,height:el.clientHeight,total:el.scrollHeight}));
   await page.screenshot({path:path.join(folder,`mission-phone-${width}x${height}-scrolled.png`)});
   assert.deepEqual(phoneSnapshot(),sourceHashes,'Phone source changed during capture');
   records.push({name:`mission-phone-${width}x${height}`,layout,scroll,sourceHashes});await page.close();
  }
  assert.deepEqual(errors,[],'No browser errors');
  completed=true;
 } catch(error) {failure=String(error);throw error;} finally {fs.writeFileSync(path.join(folder,'capture.json'),JSON.stringify({status:completed?'pass':'incomplete',failure,records,errors},null,2));await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
