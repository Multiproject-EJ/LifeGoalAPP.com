import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const {chromium}=require('/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=process.argv[2];if(!out||existsSync(out))throw Error('Supply a NEW evidence directory');mkdirSync(out,{recursive:true});
const files=['Island5SunshoreV2SeaLife.ts','Island5SunshoreV2Water.ts','Island2ThreeWorld.ts','Island5ThreePilot.tsx'];
const hashes=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync('src/features/gamification/level-worlds/dev/'+f)).digest('hex')]));
const result={sourceStart:hashes(),errors:[],captures:[],scope:'Desktop Chromium; not physical-phone performance'};
const browser=await chromium.launch({headless:true,executablePath:'/Users/ejmac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:2});
 page.on('pageerror',e=>result.errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
 const base='http://127.0.0.1:5185/dev/island-template-kit?island=5&mode=3d&level=3&island3dQuality=high';
 const overview=base+'&island3dEvidence=1&island3dEvidencePreset=overview&island3dEvidenceDistanceScale=1';
 const canvas=page.locator('canvas[aria-label^="Interactive 3D"]').first();
 const load=async url=>{await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});await canvas.waitFor({state:'visible',timeout:90000});await page.waitForTimeout(2500);};
 await load(overview);await page.getByRole('button',{name:'Hide overlays for evidence',exact:true}).click({force:true});
 const start=Date.now();
 for(const seconds of (process.argv.includes('--profile-only') ? [] : [0,23,51,83])) {
   await page.waitForTimeout(Math.max(0,start+seconds*1000-Date.now()));
   const name=`ocean-${seconds}s`;await canvas.screenshot({path:`${out}/${name}.png`});
   result.captures.push({name,elapsedWallSeconds:(Date.now()-start)/1000,metrics:await page.getByLabel('3D renderer performance',{exact:true}).innerText()});
 }
 await load(base);await page.getByRole('button',{name:'Run 30s profile',exact:true}).click({force:true});
 await page.getByRole('button',{name:'Run again',exact:true}).waitFor({state:'visible',timeout:55000});
 result.profile=await page.locator('.island-5-three-pilot__profiler').innerText();
 await page.emulateMedia({reducedMotion:'reduce'});await load(overview.replace('Quality=high','Quality=low'));
 await page.getByRole('button',{name:'Hide overlays for evidence',exact:true}).click({force:true});
 await canvas.screenshot({path:`${out}/low-reduced-motion.png`});
 result.lowMetrics=await page.getByLabel('3D renderer performance',{exact:true}).innerText();
} catch(e) {result.errors.push(String(e));} finally {
 await browser.close();result.sourceEnd=hashes();result.stableSource=JSON.stringify(result.sourceStart)===JSON.stringify(result.sourceEnd);
 if(!result.stableSource)result.errors.push('Source changed during capture');
 writeFileSync(`${out}/capture.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(result.errors.length)process.exitCode=1;
}
