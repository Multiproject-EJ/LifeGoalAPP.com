import {createRequire} from 'node:module';
import {mkdirSync,existsSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);const {chromium}=require('/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=process.argv[2];if(!out||existsSync(out))throw Error('Supply NEW output directory');mkdirSync(out,{recursive:true});
const files=['dev/Island5ThreePilot.tsx','dev/SunshoreCreatureCelebrationSmoke.ts','dev/Island5SunshoreV2Archipelago.ts','dev/Island5SunshoreV2Landscape.ts','dev/IslandTemplateKitPage.css','services/islandRunCreatureCelebration.ts','components/IslandRunBoardPrototype.tsx'];
const hashes=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync('src/features/gamification/level-worlds/'+f)).digest('hex')]));
const result={sourceStart:hashes(),errors:[],captures:[]};
const browser=await chromium.launch({headless:true,executablePath:'/Users/ejmac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:2});page.on('pageerror',e=>result.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
 const url='http://127.0.0.1:5185/dev/island-template-kit?island=5&mode=3d&level=3&island3dQuality=high&island3dEvidence=1&island3dEvidencePreset=overview&island3dEvidenceDistanceScale=1';
 const canvas=page.locator('canvas[aria-label^="Interactive 3D"]').first();
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});await canvas.waitFor({state:'visible',timeout:90000});await page.waitForTimeout(2000);
 await canvas.screenshot({path:out+'/shore-and-test-button.png'});
 await page.evaluate(()=>{window.__celebrationPhases=[];window.__celebrationTimer=setInterval(()=>{const c=document.querySelector('canvas[aria-label^="Interactive 3D"]');if(c)window.__celebrationPhases.push({...c.dataset});},50);});
 await page.getByRole('button',{name:'Test creature celebration',exact:true}).click();
 for(const [name,phase]of [['spin','spin'],['pop','pop-up'],['landing','bounce'],['exit','roll-out']]) {
  await page.waitForFunction(p=>document.querySelector('canvas[aria-label^="Interactive 3D"]')?.dataset.creatureCelebrationPhase===p,phase,{timeout:12000});
  if(phase==='pop-up')await page.waitForTimeout(420);
  await canvas.screenshot({path:`${out}/${name}.png`});result.captures.push({name,dataset:await canvas.evaluate(c=>({...c.dataset}))});
 }
 await page.waitForFunction(()=>document.querySelector('canvas[aria-label^="Interactive 3D"]')?.dataset.creatureCelebrationPhase==='idle',null,{timeout:12000});
 result.timeline=await page.evaluate(()=>{clearInterval(window.__celebrationTimer);return window.__celebrationPhases.map(d=>({phase:d.creatureCelebrationPhase,seconds:d.creatureCelebrationSeconds,position:d.creatureCelebrationPosition,smoke:d.creatureCelebrationSmoke}));});
 await canvas.screenshot({path:out+'/normal-resumed.png'});
 const required=['roll-in','spin','pop-up','fall','bounce','roll-out','idle'];for(const p of required)if(!result.timeline.some(x=>x.phase===p))result.errors.push('Missing phase '+p);
 result.final=await canvas.evaluate(c=>({...c.dataset}));if(result.final.creatureCelebrationSmoke!=='false')result.errors.push('Smoke remained after completion');
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});await canvas.waitFor({state:'visible',timeout:90000});await page.waitForTimeout(1500);
 const before=await canvas.getAttribute('data-creature-celebration-position');await page.getByRole('button',{name:'Test creature celebration',exact:true}).click();await page.waitForTimeout(350);
 result.reduced=await canvas.evaluate(c=>({...c.dataset}));if(result.reduced.creatureCelebrationPosition!==before||result.reduced.creatureCelebrationSmoke!=='false')result.errors.push('Reduced motion moved creature or emitted smoke');
 await page.waitForTimeout(1200);result.reducedFinished=await canvas.getAttribute('data-creature-celebration-phase');if(result.reducedFinished!=='idle')result.errors.push('Reduced motion did not complete');
 await canvas.screenshot({path:out+'/reduced-motion.png'});
} catch(e){result.errors.push(String(e));}finally{
 await browser.close();result.sourceEnd=hashes();result.stableSource=JSON.stringify(result.sourceStart)===JSON.stringify(result.sourceEnd);if(!result.stableSource)result.errors.push('Source changed');writeFileSync(out+'/capture.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({out,errors:result.errors,stableSource:result.stableSource,phases:[...new Set(result.timeline?.map(x=>x.phase)??[])]}));if(result.errors.length)process.exitCode=1;
}
