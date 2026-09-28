import {createRequire} from 'node:module';
import {mkdirSync,existsSync,writeFileSync,readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require('/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=path.resolve(process.argv[2]);if(existsSync(out))throw Error('Immutable evidence exists');mkdirSync(out,{recursive:true});
const dev='src/features/gamification/level-worlds/dev';
const fingerprint=()=>Object.fromEntries(readdirSync(dev).filter(n=>/^Island(22|6)[A-Z]/.test(n)).sort().map(n=>[n,createHash('sha256').update(readFileSync(path.join(dev,n))).digest('hex')]));
const sourceStart=fingerprint();
const browser=await chromium.launch({headless:true,executablePath:'/Users/ejmac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'});
const errors=[];const captures=[];
const page=await browser.newPage({viewport:{width:900,height:900},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(String(e)));
try{
const cottageId=process.argv.find(a=>a.startsWith('--cottage-id='))?.split('=')[1];
for(const [name,params] of (cottageId ? [0,90,180,270,45,135].map(azimuth=>['cottage-world-azimuth-'+azimuth,{view:cottageId,context:1,azimuth,weatherTime:4,...([45,135].includes(azimuth)?{contextTop:1}:{})}]) : process.argv.includes('--smoke-context') ? [0,90,180,270,45,135].map(azimuth=>['smoke-world-azimuth-'+azimuth,{view:'cottage-03',context:1,azimuth,weatherTime:4,...([45,135].includes(azimuth)?{contextTop:1}:{})}]) : process.argv.includes('--mender-context') ? [0,90,180,270,45,135].map(azimuth=>['mender-world-azimuth-'+azimuth,{view:'cottage-02',context:1,azimuth,weatherTime:4,...([45,135].includes(azimuth)?{contextTop:1}:{})}]) : process.argv.includes('--cottage-context') ? [0,90,180,270,...(process.argv.includes('--clearance')?[45,135]:[])].map(azimuth=>['cottage-world-azimuth-'+azimuth,{view:'cottage-01',context:1,azimuth,weatherTime:4,...(process.argv.includes('--clearance')&&[45,135].includes(azimuth)?{contextTop:1}:{})}]) : process.argv.includes('--market-context') ? [0,90,180,270].map(azimuth=>['market-world-azimuth-'+azimuth,{view:'market',context:1,azimuth,weatherTime:4}]) : process.argv.includes('--guild-context') ? [0,90,180,270].map(azimuth=>['guild-world-azimuth-'+azimuth,{view:'boss',context:1,azimuth,weatherTime:4}]) : process.argv.includes('--lighthouse-context') ? [0,90,180,270].map(azimuth=>['lighthouse-world-azimuth-'+azimuth,{view:'wisdom',context:1,azimuth,weatherTime:4}]) : process.argv.includes('--tavern-context') ? [0,90,180,270].map(azimuth=>['tavern-world-azimuth-'+azimuth,{view:'event',context:1,azimuth,weatherTime:4}]) : [
 ['calm',{view:'overview',weatherTime:4}],['squall',{view:'overview',weatherTime:50}],['clearing',{view:'overview',weatherTime:80}],
 ['guild',{view:'boss',isolate:1,azimuth:30,weatherTime:4}],['lighthouse',{view:'wisdom',isolate:1,weatherTime:4}],
 ['boatwright',{view:'habit',isolate:1,weatherTime:4}],['tavern',{view:'event',isolate:1,weatherTime:4}],['hatchery',{view:'hatchery',isolate:1,weatherTime:4}],
 ['fisherman',{phase:'reeling',landmarks:1,weatherTime:4}],['dragon-erupt',{view:'dragon',dragonTime:7,weatherTime:4}],['dragon-flight',{view:'dragon',dragonTime:12,weatherTime:4}],['dragon-dive',{view:'dragon',dragonTime:18.5,weatherTime:4}],['eruption-8s',{view:'dragon',dragonTime:8.8,weatherTime:4}],['flight-15s',{view:'dragon',dragonTime:15,weatherTime:4}],['dive-20s',{view:'dragon',dragonTime:20.5,weatherTime:4}]
])){
 const url='http://127.0.0.1:5186/island-016-fishing-interaction-lab.html?'+new URLSearchParams(params);
 await page.goto(url,{waitUntil:'networkidle',timeout:120000});await page.waitForTimeout(1200);
 await page.screenshot({path:path.join(out,name+'.png')});captures.push({name,url});
}
}finally{await browser.close();writeFileSync(path.join(out,'capture.json'),JSON.stringify({captures,errors,sourceStart,sourceEnd:fingerprint(),changedDuringCapture:JSON.stringify(sourceStart)!==JSON.stringify(fingerprint()),scope:'Actual world factory and mission in evidence lab; no gameplay board in lab. 900x900, DPR1, medium tier, locked weather/mission phase.'},null,2));console.log(JSON.stringify({captures:captures.length,errors}));}
