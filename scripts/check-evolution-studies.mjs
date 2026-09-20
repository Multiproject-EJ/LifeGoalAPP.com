import fs from 'node:fs';
const {chromium}=await import(process.env.CREATURE_PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CREATURE_CHROME_PATH??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const output='docs/qa/creature-system/progression-eleven-v1';fs.mkdirSync(output,{recursive:true});
const errors=[],failures=[],results=[];
const check=(ok,message)=>{if(!ok)throw new Error(message);};
try{
 for(const width of [1440,700,390,320]){
  const page=await browser.newPage({viewport:{width,height:1100}});
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('response',r=>{if(r.status()>=400)failures.push(r.status()+' '+r.url());});
  await page.goto(process.env.CREATURE_PREVIEW_URL??'http://127.0.0.1:5189/creature-system-lab.html');
  await page.getByRole('button',{name:'Art production',exact:true}).click();
  const review=page.locator('.cs-growth-review');
  const cards=review.locator('.cs-creature-card');
  check(await cards.count()===29,'Twenty-nine existing form slots across eleven families');
  for(const [id,count] of [['mythic-echo-phoenix',3],['common-bloom-mite',2],['rare-cinder-mouse',2],['mythic-celest-pup',2],['mythic-lux-leviathan',3],['common-fern-fox',2],['mythic-dreamroot-ancient',4],['mythic-nightbloom-drake',3],['mythic-prism-warden',4],['mythic-aurora-maned-cat',2],['mythic-cosmos-songbird',2]]){
   const line=review.locator(`[data-family-id="${id}"]`);
   check(await line.locator('.cs-creature-card').count()===count,'No invented forms');
   check(new Set(await line.locator('.cs-family-code').allTextContents()).size===1,'Stable lineage');
  }
  const ready=async()=>{for(const img of await cards.locator('img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(el=>el.decode());}};
  await ready();
  check(await cards.locator('img').evaluateAll(images=>images.every(img=>img.src.endsWith('-card.png'))),'Cinematic default');
  for(const card of await cards.all()){const box=await card.boundingBox();check(Math.abs(box.width/box.height-5/7)<.01,'Card ratio');}
  await review.screenshot({path:`${output}/cinematic-${width}.png`});
  for(let i=0;i<29;i++){
   await cards.nth(i).click();const dialog=page.getByRole('dialog');
   check(await dialog.locator('.cs-batch-pair img').count()===2,'Pair');
   for(const img of await dialog.locator('img').all())await img.evaluate(el=>el.decode());
   check(await dialog.locator('canvas').count()===0,'No claimed model');
   check(await page.evaluate(()=>document.body.style.overflow==='hidden'),'Scroll locked');
   const box=await dialog.boundingBox();check(box.x>=0&&box.x+box.width<=width+1,'Dialog fits');
   await page.keyboard.press('Escape');check(await cards.nth(i).evaluate(el=>el===document.activeElement),'Focus restored');
  }
  await review.getByRole('button',{name:'Clay evolution',exact:true}).click();await ready();
  check(await cards.locator('img').evaluateAll(images=>images.every(img=>img.src.endsWith('-clay.png'))),'All clay pairs resolve');
  await review.screenshot({path:`${output}/clay-${width}.png`});
  await review.getByLabel('Greyscale evolution',{exact:true}).check();
  await review.getByLabel('Hide evolution emotion hints',{exact:true}).check();
  check(await cards.locator('img').first().evaluate(el=>getComputedStyle(el).filter==='grayscale(1)'),'Greyscale');
  check(await cards.locator('.cs-card-tone').first().evaluate(el=>getComputedStyle(el).visibility==='hidden'),'Hidden hints');
  check(await review.locator('.cs-batch-review-note').count()===0,'Growth hints hidden');
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No page overflow');
  results.push({width,families:11,formSlots:29,bothEditions:true,pairDialogs:true,focusAndScroll:true,ratio:true,noOverflow:true});await page.close();
 }
 check(!errors.length&&!failures.length,JSON.stringify({errors,failures}));
 const report={passed:true,results,errors,failures};fs.writeFileSync(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
