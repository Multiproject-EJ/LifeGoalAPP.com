const { chromium } = require('/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), cp = require('node:child_process');
const repository = path.resolve(__dirname, '..'), output = path.resolve(process.argv[2] || '');
if (!process.argv[2] || fs.existsSync(output)) throw Error('Provide a new evidence directory');
const origin = new URL(process.env.ISLAND002_CAPTURE_ORIGIN || 'http://127.0.0.1:4177');
if (!['127.0.0.1','localhost'].includes(origin.hostname)) throw Error('Local release build required');
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
function snapshot() {
 const files=cp.execFileSync('git',['ls-files','--cached','--others','--exclude-standard','--','src/features/gamification/level-worlds/dev/*Celestial*','src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx','src/features/gamification/level-worlds/dev/Island1AnimatedBatches.ts','src/features/gamification/level-worlds/dev/IslandTemplateKitPage.tsx'],{cwd:repository,encoding:'utf8'}).trim().split('\n').sort();
 return {head:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:repository,encoding:'utf8'}).trim(),sources:Object.fromEntries(files.map(f=>[f,hash(fs.readFileSync(path.join(repository,f)))]))};
}
fs.mkdirSync(output,{recursive:true});
const report={scope:'Actual optimized Island002 pilot, desktop Chromium responsive and reduced-motion spot checks; not physical-device proof.',sourceStart:snapshot(),records:[],errors:[]};
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Users/ejmac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'});
 try {
  for(const spec of [{name:'short-phone',width:375,height:667},{name:'wide-phone',width:430,height:932},{name:'desktop',width:1440,height:1000},{name:'reduced-motion',width:390,height:844,reduce:true},{name:'level-one',width:390,height:844,level:1},{name:'level-two',width:390,height:844,level:2},{name:'undocked',width:390,height:844,rolls:0}]) {
   const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},deviceScaleFactor:2,reducedMotion:spec.reduce?'reduce':'no-preference'});
   const page=await context.newPage();page.on('pageerror',e=>report.errors.push(String(e)));
   const url=new URL(`/dev/island-template-kit?island=2&mode=3d&level=${spec.level||3}&redockingRolls=${spec.rolls??20}`,origin);
   await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:60000});
   await page.getByLabel('Focus a landmark').waitFor({timeout:120000});
   await page.locator('.island-5-three-pilot__topline select').selectOption('high');
   await page.getByRole('button',{name:'Overview',exact:true}).click();await page.waitForTimeout(2000);
   const canvas=page.locator('canvas').first();
   const record={...spec,url:page.url(),metrics:await page.getByLabel('3D renderer performance',{exact:true}).innerText(),canvas:await canvas.evaluate(c=>({width:c.width,height:c.height,rect:{x:c.getBoundingClientRect().x,y:c.getBoundingClientRect().y,width:c.getBoundingClientRect().width,height:c.getBoundingClientRect().height},dataset:{...c.dataset}}))};
   await page.getByRole('button',{name:'Hide overlays for evidence',exact:true}).click();await page.waitForTimeout(100);
   record.file=spec.name+'.png';await page.screenshot({path:path.join(output,record.file),timeout:60000});record.sha256=hash(fs.readFileSync(path.join(output,record.file)));report.records.push(record);console.log(record.file);await context.close();
  }
 } catch(e){report.errors.push(e.stack||String(e));}
 finally {await browser.close();report.sourceEnd=snapshot();report.sourceStable=JSON.stringify(report.sourceStart)===JSON.stringify(report.sourceEnd);if(!report.sourceStable)report.errors.push('Source changed during capture');report.status=report.errors.length?'failed':'captured-unreviewed';fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(report,null,2)+'\n');if(report.errors.length){console.error(report.errors);process.exitCode=1;}}
})().catch(e=>{console.error(e);process.exitCode=1});
