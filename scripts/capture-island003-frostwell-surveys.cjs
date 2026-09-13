const {chromium}=require('/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const out=process.argv[2];if(!out||fs.existsSync(out))throw Error('Use a new evidence folder');fs.mkdirSync(out,{recursive:true});
const files=['FrostwellIceworksThreeModel.ts','Island3SnowTreeGeometry.ts','Island3FrozenWorldThreeModel.ts','Island3FrostmoonThreeWorld.ts','Island5ThreePilot.tsx'];
const snap=()=>Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync('src/features/gamification/level-worlds/dev/'+f)).digest('hex')]));
(async()=>{let browser;const report={scope:'Local development phone viewport; surface/deep facility side and rear geometry sanity, no physical-device acceptance.',sourceStart:snap(),records:[],errors:[]};try{
browser=await chromium.launch({headless:true,executablePath:'/Users/ejmac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'});
const p=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});p.on('pageerror',e=>report.errors.push(String(e)));
for(const view of ['left','right','rear']){
await p.goto('http://127.0.0.1:53303/dev/island-template-kit?island=3&mode=3d&level=3&island3Ambience=day&frostwellBuilt=1&focus=frostwell&frostwellCutawayView='+view+'&island3dEvidence=1',{waitUntil:'domcontentloaded',timeout:180000});
await p.locator('canvas').first().waitFor({timeout:180000});await p.getByLabel('Focus a landmark').selectOption('frostwell',{force:true});await p.waitForTimeout(3000);const preset=await p.locator('[data-camera-preset]').getAttribute('data-camera-preset');if(preset!=='frostwell')throw Error('Expected applied Frostwell inspection camera, got '+preset);const file=view+'.png';await p.screenshot({path:path.join(out,file),timeout:120000});
report.records.push({view,file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(out,file))).digest('hex'),dataset:await p.locator('canvas').first().evaluate(c=>({...c.dataset}))});
}
}catch(e){report.errors.push(e.stack||String(e))}finally{if(browser)await browser.close();report.sourceEnd=snap();report.sourceStable=JSON.stringify(report.sourceStart)===JSON.stringify(report.sourceEnd);fs.writeFileSync(path.join(out,'capture.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({errors:report.errors,sourceStable:report.sourceStable}));if(report.errors.length||!report.sourceStable)process.exitCode=1}})();
