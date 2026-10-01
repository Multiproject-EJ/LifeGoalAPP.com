const {chromium}=require('/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');const assert=require('node:assert/strict');
const out=process.argv[2]||'docs/gauntlets/island-009-v2/mission/browser-lifecycle-r01';
if(fs.existsSync(out))throw Error('Use a fresh evidence directory');fs.mkdirSync(out,{recursive:true});
const origin='http://127.0.0.1:'+(process.argv[3]||'5599');
const requestedModes=process.argv[4]?.split(',');
const report={scope:'Isolated offline demo Board/Pilot integration; no user browser storage or physical-device claim',cases:[],errors:[]};
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/Users/ejmac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'});
try{for(const mode of ['normal','replay-normal','constructor-failure','replay-constructor-failure','context-loss','reduced-motion'].filter(mode=>!requestedModes||requestedModes.includes(mode))){
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:mode==='reduced-motion'?'reduce':'no-preference',serviceWorkers:'block'});
 await context.route('**/*',r=>{const u=new URL(r.request().url());return ['127.0.0.1','localhost'].includes(u.hostname)||['data:','blob:'].includes(u.protocol)?r.continue():r.abort();});
 const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>report.errors.push({mode,error:String(e)}));
 const result={mode,checks:[]};report.cases.push(result);
 try{
 await page.goto(origin+'/index.html',{timeout:180000});
 await page.evaluate(async()=>{
 const {createDemoSession}=await import('/src/services/demoSession.ts');
 const {readIslandRunGameStateRecord,writeIslandRunGameStateRecord}=await import('/src/features/gamification/level-worlds/services/islandRunGameStateStore.ts');
 const {getIslandRunSignatureMissionKey,resolveStagedRestorationMissionProgress}=await import('/src/features/gamification/level-worlds/services/islandRunSignatureMissions.ts');
 const {getIslandNarrativeDefinition}=await import('/src/features/gamification/level-worlds/narrative/islandNarrativeRegistry.ts');
 const s=createDemoSession(),initial=readIslandRunGameStateRecord(s),key=getIslandRunSignatureMissionKey(0,9);
 const progress=resolveStagedRestorationMissionProgress({ledger:{},cycleIndex:0,islandNumber:9});
 const w=await writeIslandRunGameStateRecord({session:s,client:null,triggerSource:'isolated_island009_browser_qa',record:{...initial,currentIslandNumber:9,cycleIndex:0,firstRunClaimed:true,firstSessionTutorialState:'complete',onboardingDisplayNameLoopCompleted:true,welcomePackClaimed:true,welcomePackRewardBundleClaimed:true,storyPrologueSeen:true,audioEnabled:false,musicEnabled:false,sfxEnabled:false,dicePool:100,essence:1000,islandStartedAtMs:Date.now(),activeStopIndex:4,activeStopType:'boss',bossTrialResolvedIslandNumber:9,completedStopsByIsland:{'9':['hatchery','habit','mystery','wisdom','boss']},stopStatesByIndex:Array.from({length:5},()=>({objectiveComplete:true,buildComplete:true,accessUnlocked:true,completedAtMs:1})),stopBuildStateByIndex:Array.from({length:5},()=>({buildLevel:3,requiredEssence:100,spentEssence:100})),signatureMissionProgressByIsland:{[key]:{...progress,chargesEarned:8,chargesSpent:7,activatedStages:7,lastActivatedStage:7,completedAtMs:null,updatedAtMs:1}},narrativeSeenState:{beats:Object.fromEntries((getIslandNarrativeDefinition(9)?.beats??[]).map(b=>[b.id,Date.now()])),episodes:{}}}});if(!w.ok)throw Error('Fixture write failed');localStorage.setItem(`island_run_landmark_coachmark_seen_${s.user.id}`,'1');
 });
 if(mode.includes('constructor-failure'))await page.addInitScript(()=>{window.__starFailWebgl=true;const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){if(window.__starFailWebgl&&String(kind).startsWith('webgl'))return null;return original.call(this,kind,...args);};});
 await page.goto(origin+'/dev/island-art-preview?islandRunQa=1&island3dQuality=low&disableDiscoveryFog=1',{waitUntil:'domcontentloaded',timeout:180000});
 await page.getByRole('button',{name:/Open Island 009 mission tracker/}).first().waitFor({timeout:180000});
 if(mode.includes('constructor-failure')) await page.getByRole('button',{name:'Retry 3D',exact:true}).waitFor({timeout:180000});
 else await page.waitForFunction(()=>document.querySelector('canvas[data-star-beneath-pose]'),null,{timeout:180000});
 await page.screenshot({path:out+'/'+mode+'-before.png'});
 fs.writeFileSync(out+'/'+mode+'-before.txt',await page.locator('body').innerText());
 await page.getByRole('button',{name:/Open Island 009 mission tracker/}).first().click();
 if(mode.startsWith('replay-')) {
  await page.getByRole('button',{name:/Unfold the Star/}).waitFor();
  await page.evaluate(async()=>{const {createDemoSession}=await import('/src/services/demoSession.ts');const {activateStagedRestorationMissionStage}=await import('/src/features/gamification/level-worlds/services/islandRunSignatureMissionAction.ts');const r=await activateStagedRestorationMissionStage({session:createDemoSession(),client:null,expected:{cycleIndex:0,islandNumber:9,activatedStages:7}});if(r.status!=='ok')throw Error('Replay setup commit failed');});
  if(!mode.includes('constructor-failure')) {
   await page.waitForFunction(()=>{const c=document.querySelector('canvas[data-star-beneath-pose]');const p=c&&JSON.parse(c.dataset.starBeneathPose);return p&&p.stage===8&&!p.active;},null,{timeout:30000});
  }
  await page.getByRole('button',{name:/Replay The Star Beneath/}).click();
 } else await page.getByRole('button',{name:/Unfold the Star/}).click();
 result.checks.push(mode.startsWith('replay-')?'Replay clicked through real mission phone after synchronized canonical completion settled':'Eighth repair clicked through real mission phone');
 if(mode==='normal'||mode==='replay-normal'||mode==='context-loss'){
 await page.waitForFunction(()=>{const c=document.querySelector('canvas[data-star-beneath-pose]');return c&&JSON.parse(c.dataset.starBeneathPose).active;},{timeout:30000});
 assert.equal(await page.getByRole('button',{name:'Finish Island',exact:true}).isVisible(),false,'Finish CTA suppressed during finale');
 result.checks.push('Finish CTA suppressed while canonical eighth repair is playing');
 if(mode==='context-loss')await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-star-beneath-pose]');const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');const extension=gl?.getExtension('WEBGL_lose_context');if(!extension)throw Error('Actual WEBGL_lose_context extension unavailable');extension.loseContext();});
 }
 await page.waitForTimeout(mode==='normal'||mode==='replay-normal'?13000:1800);
 if(!mode.startsWith('replay-')) {
  await page.getByText('Mission complete — The Star Beneath',{exact:true}).waitFor();
  result.checks.push('Completion celebration drains after lifecycle or renderer failure');
 } else {
  assert.equal(await page.getByRole('button',{name:/Replay The Star Beneath/}).isVisible(),false,'replay closes mission phone');
  assert.equal(await page.getByRole('dialog',{name:'Island completion celebration',exact:true}).isVisible() || await page.getByRole('button',{name:'Finish Island',exact:true}).isVisible() || await page.getByRole('button',{name:'Shop',exact:true}).isVisible(),true,'replay releases controller/departure');
  result.checks.push('Replay closes phone and releases controller or departure UI');
 }
 await page.screenshot({path:out+'/'+mode+'-after.png'});
 fs.writeFileSync(out+'/'+mode+'-after.txt',await page.locator('body').innerText());
 result.canonical=await page.evaluate(async()=>{const {createDemoSession}=await import('/src/services/demoSession.ts');const {readIslandRunGameStateRecord}=await import('/src/features/gamification/level-worlds/services/islandRunGameStateStore.ts');const x=readIslandRunGameStateRecord(createDemoSession());return {stage:x.signatureMissionProgressByIsland['0:9'],island:x.currentIslandNumber,dice:x.dicePool,essence:x.essence};});
 assert.equal(result.canonical.stage.activatedStages,8);assert.equal(result.canonical.stage.chargesSpent,8);assert.equal(result.canonical.dice,100);assert.equal(result.canonical.essence,1000);
 result.checks.push('Canonical eighth stage saved once; wallet unchanged');
 if(mode.includes('constructor-failure')) {
  await page.getByRole('button',{name:'Retry 3D',exact:true}).evaluate(b=>b.click());
  await page.waitForTimeout(400);
  assert.equal(await page.getByRole('button',{name:'Retry 3D',exact:true}).isVisible(),true,'failed retry remains recoverable');
  await page.evaluate(()=>window.__starFailWebgl=false);
  await page.getByRole('button',{name:'Retry 3D',exact:true}).evaluate(b=>b.click());
  await page.waitForFunction(()=>{const c=document.querySelector('canvas[data-star-beneath-pose]');return c&&JSON.parse(c.dataset.starBeneathPose)?.stage===8;},null,{timeout:180000});
  assert.equal(await page.evaluate(()=>JSON.parse(document.querySelector('canvas[data-star-beneath-pose]').dataset.starBeneathPose).active),false,'retry loads completion without reacquiring playback');
  result.checks.push('Failed retry then successful retry remains settled');
  await page.screenshot({path:out+'/'+mode+'-retry.png'});
 }
 result.status='passed';
 }catch(e){result.status='failed';result.error=String(e);await page.screenshot({path:out+'/'+mode+'-failure.png'}).catch(()=>{});fs.writeFileSync(out+'/'+mode+'-failure.txt',await page.locator('body').innerText().catch(()=>''));process.exitCode=1;}
 finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));await context.close();}
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
