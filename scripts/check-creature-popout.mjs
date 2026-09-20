import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.CREATURE_PLAYWRIGHT_MODULE||'/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,timeout:30000});
const deadline=setTimeout(()=>{console.error('Popout QA exceeded 90 seconds');void browser.close();},90000);
console.log('Browser launched');
const evidence='docs/qa/creature-system/popout';
await fs.mkdir(evidence,{recursive:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.CREATURE_PREVIEW_URL||'http://127.0.0.1:5189/creature-system-lab.html');
  console.log('Preview loaded; capturing model');
  const capture=await page.evaluate(async()=>{
    const {createBloomScene}=await import('/src/features/creature-system/BloomBlockout.ts');
    const canvas=document.createElement('canvas');
    const live=createBloomScene(canvas,700);
    const images={poster:canvas.toDataURL('image/png')};
    for(const [name,yaw] of [['front',0],['right',Math.PI/2],['rear',Math.PI],['left',-Math.PI/2]]){
      live.model.root.rotation.y=yaw;live.render();images[name]=canvas.toDataURL('image/png');
    }
    const parts=Object.entries(live.model.meshes).map(([id,mesh])=>({id,name:id,meshNames:[mesh.name],componentId:id}));
    const triangles=live.renderer.info.render.triangles;
    live.dispose();return {images,parts,triangles};
  });
  for(const [name,data] of Object.entries(capture.images)){
    const bytes=Buffer.from(data.split(',')[1],'base64');
    await fs.writeFile(evidence+'/'+name+'.png',bytes);
    if(name==='poster')await fs.writeFile('public/assets/creatures/style-studies/bloom-rounded/model-poster-v1.png',bytes);
  }
  console.log('Model captured');
  await fs.writeFile(evidence+'/parts.json',JSON.stringify({parts:capture.parts},null,2));
  const results=[];
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:1100});
    await page.getByRole('button',{name:'Art production',exact:true}).click();
    await page.getByRole('button',{name:'Open the pop-out card'}).click();
    const family=page.getByRole('dialog');
    await family.getByRole('button',{name:'Try 3D study',exact:true}).click();
    const trigger=family.getByRole('button',{name:'Lift Bloom figure out of card'});
    await trigger.scrollIntoViewIfNeeded();
    await page.screenshot({path:evidence+'/card-'+width+'.png'});
    await trigger.click();
    const pop=page.getByRole('dialog',{name:'Bloom Mite 3D study',exact:true});
    await pop.getByText('Drag to rotate · same pose as the study card',{exact:true}).waitFor();
    await page.screenshot({path:evidence+'/pop-'+width+'.png'});
    const initial=await pop.locator('canvas').evaluate(c=>c.toDataURL());
    await pop.getByRole('button',{name:'Rotate right',exact:true}).click();
    assert.notEqual(await pop.locator('canvas').evaluate(c=>c.toDataURL()),initial);
    await pop.getByRole('button',{name:'Reset card pose',exact:true}).click();
    assert.equal(await pop.locator('canvas').evaluate(c=>c.toDataURL()),initial);
    await page.keyboard.press('Escape');
    assert.equal(await pop.count(),0);
    assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden');
    assert.equal(await trigger.evaluate(e=>e===document.activeElement),true);
    await family.getByRole('button',{name:'Close dialog',exact:true}).click();
    assert.notEqual(await page.evaluate(()=>document.body.style.overflow),'hidden');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    results.push({width,openRotateResetClose:true,focusRestored:true,noOverflow:true});
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'Open the pop-out card'}).click();
  await page.getByRole('button',{name:'Try 3D study',exact:true}).click();
  await page.getByRole('button',{name:'Lift Bloom figure out of card'}).click();
  await page.getByText('Drag to rotate · same pose as the study card',{exact:true}).waitFor();
  assert.equal(await page.locator('.cs-pop-stage').evaluate(e=>e.getAnimations().every(a=>a.effect.getTiming().duration===0)),true);
  await page.getByRole('button',{name:'Return to card',exact:true}).click();
  await page.getByRole('button',{name:'Close dialog',exact:true}).click();
  // Simulate no WebGL before import: retain the poster and usable close control.
  await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...rest){if(type==='webgl'||type==='webgl2'||type==='experimental-webgl')return null;return original.call(this,type,...rest);};});
  await page.reload();
  await page.getByRole('button',{name:'Art production',exact:true}).click();
  await page.getByRole('button',{name:'Open the pop-out card'}).click();
  await page.getByRole('button',{name:'Try 3D study',exact:true}).click();
  await page.getByRole('button',{name:'Lift Bloom figure out of card'}).click();
  await page.getByText('3D is unavailable on this device. Your card image is still available.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Return to card',exact:true}).click();
  assert.deepEqual(errors,[]);
  const report={results,reducedMotion:true,webglFallback:true,pageErrors:errors,triangles:capture.triangles,partCount:capture.parts.length,scope:'Bloom form 2 study edition only; no production approval'};
  await fs.writeFile(evidence+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{clearTimeout(deadline);await browser.close();}
