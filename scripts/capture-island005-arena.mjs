import {createRequire} from 'node:module';
import {mkdirSync,existsSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),{chromium}=require('/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=process.argv[2];if(!out||existsSync(out))throw Error('Supply NEW output directory');mkdirSync(out,{recursive:true});
const files=['Island2ThreeWorld.ts','Island5ThreePilot.tsx','SunshoreArenaRetraction.ts'];
const hashes=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync('src/features/gamification/level-worlds/dev/'+f)).digest('hex')]));
const result={sourceStart:hashes(),errors:[],states:[]};
const browser=await chromium.launch({headless:true,executablePath:'/Users/ejmac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:2});page.on('pageerror',e=>result.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
 const url='http://127.0.0.1:5185/dev/island-template-kit?island=5&mode=3d&level=3&island3dQuality=high&island3dEvidence=1&island3dEvidencePreset=overview&island3dEvidenceDistanceScale=1';
 const canvas=page.locator('canvas[aria-label^="Interactive 3D"]').first();
 const waitPose=async predicate=>page.waitForFunction(predicate,null,{timeout:90000});
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});await canvas.waitFor({state:'visible',timeout:120000});
 await waitPose(()=>JSON.parse(document.querySelector('canvas[aria-label^="Interactive 3D"]')?.dataset.sunshoreArenaCrown||'{}').amount===0);
 await canvas.screenshot({path:out+'/open.png'});
 await page.evaluate(()=>{window.__arena=[];window.__arenaTimer=setInterval(()=>{const c=document.querySelector('canvas[aria-label^="Interactive 3D"]');if(c?.dataset.sunshoreArenaCrown)window.__arena.push(JSON.parse(c.dataset.sunshoreArenaCrown));},40);});
 await page.getByRole('button',{name:'Test arena rise + return',exact:true}).click();
 await waitPose(()=>JSON.parse(document.querySelector('canvas[aria-label^="Interactive 3D"]')?.dataset.sunshoreArenaCrown||'{}').amount===1);
 await canvas.screenshot({path:out+'/raised.png'});
 await waitPose(()=>{const p=JSON.parse(document.querySelector('canvas[aria-label^="Interactive 3D"]')?.dataset.sunshoreArenaCrown||'{}');return p.amount===0&&!p.active;});
 await canvas.screenshot({path:out+'/returned.png'});
 result.states=await page.evaluate(()=>{clearInterval(window.__arenaTimer);return window.__arena;});
 if(!result.states.some(p=>p.amount>0&&p.amount<1))result.errors.push('No intermediate motion observed');
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});await canvas.waitFor({state:'visible',timeout:120000});
 await page.getByRole('button',{name:'Test arena rise + return',exact:true}).click();
 await waitPose(()=>JSON.parse(document.querySelector('canvas[aria-label^="Interactive 3D"]')?.dataset.sunshoreArenaCrown||'{}').amount===1);
 result.reduced=await canvas.getAttribute('data-sunshore-arena-crown');
 await waitPose(()=>JSON.parse(document.querySelector('canvas[aria-label^="Interactive 3D"]')?.dataset.sunshoreArenaCrown||'{}').amount===0);
} catch(e){result.errors.push(String(e));} finally {
 await browser.close();result.sourceEnd=hashes();result.stableSource=JSON.stringify(result.sourceStart)===JSON.stringify(result.sourceEnd);if(!result.stableSource)result.errors.push('Source changed');writeFileSync(out+'/capture.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({out,errors:result.errors,stableSource:result.stableSource,samples:result.states.length}));if(result.errors.length)process.exitCode=1;
}
