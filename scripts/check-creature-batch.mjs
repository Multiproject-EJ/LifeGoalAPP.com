import fs from 'node:fs';
const {chromium}=await import(process.env.CREATURE_PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CREATURE_CHROME_PATH??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const output=process.env.CREATURE_BATCH_QA_OUTPUT??'docs/qa/creature-system/batch-ten-v1';fs.mkdirSync(output,{recursive:true});
const errors=[],failures=[],results=[];
const check=(ok,message)=>{if(!ok)throw new Error(message);};
try{
 for(const width of [1440,700,390,320]){
  const page=await browser.newPage({viewport:{width,height:1100}});
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('response',r=>{if(r.status()>=400)failures.push(r.status()+' '+r.url());});
  await page.goto(process.env.CREATURE_PREVIEW_URL??'http://127.0.0.1:5189/creature-system-lab.html');
  await page.getByRole('button',{name:'Art production',exact:true}).click();
  const batch=page.locator('.cs-batch-review');
  check(await batch.locator('.cs-batch-grid .cs-creature-card').count()===10,'Ten new family cards');
  check(await batch.locator('.cs-evolution-grid .cs-creature-card').count()===3,'Three linked Twilight cards');
  check(new Set(await batch.locator('.cs-evolution-grid .cs-family-code').allTextContents()).size===1,'Same family code across evolution');
  check((await batch.locator('.cs-evolution-grid h4').allTextContents()).join(' ').includes('Powerful · actualisation'),'Explicit little/middle/actualised art progression');
  for(const form of [2,3]) check((await batch.locator(`.cs-evolution-grid [data-form="${form}"] img`).getAttribute('src')).includes('twilight-evolution-v2'),'Revised cinematic evolution art');
  const ready=async()=>{
   for(const img of await batch.locator('.cs-creature-card img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(el=>el.decode());}
  };
  await ready();
  for(const card of await batch.locator('.cs-creature-card').all()){const box=await card.boundingBox();check(Math.abs(box.width/box.height-5/7)<.01,'5:7 ratio '+width);}
  check(await batch.locator('.cs-batch-grid img').evaluateAll(images=>images.every(img=>img.src.endsWith('-card.png'))),'Cinematic default');
  await batch.locator('.cs-batch-grid').screenshot({path:`${output}/cinematic-${width}.png`});
  await batch.locator('.cs-batch-evolution').screenshot({path:`${output}/evolution-cinematic-${width}.png`});
  const cards=batch.locator('.cs-creature-card');
  for(const i of width===1440?[...Array(13).keys()]:[0,12]){
   await cards.nth(i).click();
   const dialog=page.getByRole('dialog');
   check(await dialog.locator('.cs-batch-pair img').count()===2,'Pair has both interpretations');
   for(const img of await dialog.locator('img').all())await img.evaluate(el=>el.decode());
   check(await dialog.locator('canvas').count()===0,'No fake model');
   check(await page.evaluate(()=>document.body.style.overflow==='hidden'),'Scroll lock');
   const box=await dialog.boundingBox();check(box.x>=0&&box.x+box.width<=width+1,'Dialog fits');
   await page.keyboard.press('Escape');
   check(await cards.nth(i).evaluate(el=>el===document.activeElement),'Focus returns');
  }
  await batch.getByRole('button',{name:'Clay studies',exact:true}).click();await ready();
  for(const form of [2,3]) check((await batch.locator(`.cs-evolution-grid [data-form="${form}"] img`).getAttribute('src')).includes('twilight-evolution-v2'),'Revised clay evolution art');
  check(await batch.locator('.cs-batch-grid img').evaluateAll(images=>images.every(img=>img.src.endsWith('-clay.png'))),'Clay selection resolves all ten');
  await batch.locator('.cs-batch-grid').screenshot({path:`${output}/clay-${width}.png`});
  await batch.locator('.cs-batch-evolution').screenshot({path:`${output}/evolution-clay-${width}.png`});
  await batch.getByLabel('Greyscale batch',{exact:true}).check();
  await batch.getByLabel('Hide batch emotion hints',{exact:true}).check();
  check(await batch.locator('.cs-card-tone').first().evaluate(el=>getComputedStyle(el).visibility==='hidden'),'Emotion hints hidden');
  check(await batch.locator('.cs-batch-grid img').first().evaluate(el=>getComputedStyle(el).filter==='grayscale(1)'),'Greyscale');
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
  results.push({width,newFamilies:10,twilightForms:3,cinematicAndClay:true,lineage:true,pairDialog:true,focusAndScroll:true,ratio:true,noOverflow:true});
  await page.close();
 }
 check(errors.length===0&&failures.length===0,JSON.stringify({errors,failures}));
 const report={passed:true,results,errors,failures};fs.writeFileSync(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
