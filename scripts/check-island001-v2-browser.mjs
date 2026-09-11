import { createRequire } from 'node:module';
import { writeFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url), {chromium}=require('/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const prefix=process.argv[2];if(!/^[a-z0-9-]+$/.test(prefix??''))throw Error('Provide immutable evidence prefix');
const output=`docs/gauntlets/island-001-v2/qa/reviews/${prefix}-browser.json`;if(existsSync(output))throw Error('Evidence exists');
const browser=await chromium.launch({headless:true,executablePath:'/Users/ejmac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'});
const result={browser:browser.version(),scope:'Actual full pilot at phone viewport; functional browser evidence, not physical phone.',checks:[],errors:[]};
try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});page.on('pageerror',e=>result.errors.push(e.stack));page.on('console',m=>{if(m.type()==='error' && /THREE|WebGL|INVALID_OPERATION|shader/i.test(m.text()))result.errors.push(m.text());});
 await page.goto('http://127.0.0.1:53282/dev/island-template-kit?island=1&mode=3d&level=3&assemblyCharges=10',{waitUntil:'domcontentloaded',timeout:60000});
 const selector='canvas[aria-label="Interactive 3D Assembly Crater island"]',canvas=page.locator(selector);
 await page.locator(`${selector}[data-assembly-construction-phase="complete"]`).waitFor({timeout:60000});
 result.inventory=JSON.parse(await canvas.getAttribute('data-island001-scene-performance-inventory'));
 const controls=page.getByTestId('assembly-crater-preview-controls');
 for(let replay=1;replay<=2;replay++){
  // Workbench controls intentionally hide below 760px; trigger through their
  // visible desktop UI, then exercise the running sequence at phone size.
  await page.setViewportSize({width:1440,height:1080});
  await controls.getByRole('button',{name:'Play 3 + 5 + 2',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await page.locator(`${selector}[data-assembly-construction-phase="building"]`).waitFor({timeout:22000});
  await page.locator(`${selector}[data-assembly-construction-phase="complete"]`).waitFor({timeout:20000});
  assert.equal(await canvas.getAttribute('data-assembly-construction-progress'),'1.000');result.checks.push(`replay-${replay}-completed`);
 }
 await page.getByRole('button',{name:'Overview',exact:true}).click({timeout:20000});
 for(const id of ['hatchery','habit','wisdom','event','boss']){
  await page.getByLabel('Focus a landmark').selectOption(id);result.checks.push(`focus-${id}`);
 }
 await page.setViewportSize({width:844,height:390});await page.setViewportSize({width:390,height:844});
 result.checks.push('focused-resize-landscape-and-portrait');
 await page.getByRole('button',{name:'Hide overlays for evidence',exact:true}).click();
 await canvas.screenshot({path:`docs/gauntlets/island-001-v2/qa/raw/${prefix}-full-pilot-hall-phone.png`});
 await page.close();
 const reduced=await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:1,reducedMotion:'reduce'});reduced.on('pageerror',e=>result.errors.push(e.stack));reduced.on('console',m=>{if(m.type()==='error' && /THREE|WebGL|INVALID_OPERATION|shader/i.test(m.text()))result.errors.push(m.text());});
 await reduced.goto('http://127.0.0.1:53282/dev/island-template-kit?island=1&mode=3d&level=3&assemblyCharges=0',{waitUntil:'domcontentloaded',timeout:60000});
 const reducedCanvas=reduced.locator(selector),reducedControls=reduced.getByTestId('assembly-crater-preview-controls');
 await reduced.locator(`${selector}[data-assembly-construction-phase="excavating"]`).waitFor({timeout:60000});
 for(let i=0;i<3;i++)await reducedControls.getByRole('button',{name:'Blast next',exact:true}).click();
 await reduced.setViewportSize({width:390,height:844});
 await reduced.locator(`${selector}[data-assembly-construction-phase="complete"]`).waitFor({timeout:5000});
 assert.equal(await reducedCanvas.getAttribute('data-assembly-blast-camera-shake'),'0.000');
 result.checks.push('reduced-motion-immediate-completion-without-camera-shake');
 assert.equal(result.errors.length,0);
}catch(error){result.failure=error.stack;process.exitCode=1;}
finally{writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));await browser.close();}
