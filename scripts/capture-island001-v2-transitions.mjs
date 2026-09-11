import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const prefix=process.argv[2], ids=process.argv.slice(3);
if(!/^[a-z0-9-]+$/.test(prefix)||ids.some(id=>!['hatchery','habit','wisdom','event'].includes(id)))throw Error('Provide immutable prefix and landmark IDs');
const browser=await chromium.launch({headless:true,executablePath:'/Users/ejmac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.stack));
 for(const id of ids)for(const from of [0,1,2])for(const stage of [0,1,2,3,4,5]){
  const name=`${prefix}-${id}-l${from+1}-s${stage}`;
  await page.goto(`http://127.0.0.1:53282/island001-assembly-review.html?mode=${id}&capture=${name}&level=${from+1}&buildFrom=${from}&buildProgress=${stage/5}`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.getByRole('button',{name:'Save capture',exact:true}).click({timeout:60000});
  await page.getByRole('button',{name:'Capture saved',exact:true}).waitFor();
 }
 if(errors.length)throw Error(errors.join('\n'));
 console.log(JSON.stringify({prefix,ids,frames:ids.length*18,canonicalDelta:true,errors,browser:browser.version()}));
}finally{await browser.close();}
