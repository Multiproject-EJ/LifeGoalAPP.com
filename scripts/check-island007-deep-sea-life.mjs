import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ headless:true, executablePath:'/Users/ejmac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
try {
 const page=await browser.newPage(); await page.goto('http://127.0.0.1:5197/docs/gauntlets/island-007-v2/review/index.html');
 const results=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/.vite/deps/three.js');
  const {createIsland7DeepSeaLifeV2}=await import('/src/features/gamification/level-worlds/dev/Island7DeepSeaLifeV2.ts');
  const {disposeIsland7Reef}=await import('/src/features/gamification/level-worlds/dev/Island7AuthoredReef.ts');
  const rows=[];
  for(const quality of ['high','medium','low']){
   const model=createIsland7DeepSeaLifeV2(quality),body=model.root.children[0],eyes=model.root.children[1];
   model.setNight(0);model.animate(0);if(eyes.material.opacity!==0)throw Error('Day eyes must be off');
   model.setNight(1);let maxStep=0,maxEyeError=0;const before=new THREE.Matrix4(),after=new THREE.Matrix4(),eye=new THREE.Matrix4(),v=new THREE.Vector3(),w=new THREE.Vector3();
   for(let frame=0;frame<600;frame++){
    body.getMatrixAt(0,before);model.animate(frame/60);body.getMatrixAt(0,after);
    v.setFromMatrixPosition(before);w.setFromMatrixPosition(after);maxStep=Math.max(maxStep,v.distanceTo(w));
    for(let i=0;i<body.count;i++){
     body.getMatrixAt(i,after);if(!after.elements.every(Number.isFinite)||after.determinant()<=0)throw Error('Invalid creature pose');
     const inverse=after.clone().invert();
     for(let side=0;side<2;side++){eyes.getMatrixAt(i*2+side,eye);v.setFromMatrixPosition(eye).applyMatrix4(inverse);maxEyeError=Math.max(maxEyeError,v.distanceTo(new THREE.Vector3(1.10,.015,(side?1:-1)*.397)));}
    }
   }
   if(maxStep>.03||maxEyeError>1e-4||eyes.material.opacity<=0)throw Error('Motion or attached eye regression');
   let triangles=0;const geometries=new Set(),materials=new Set();model.root.traverse(n=>{if(n.isMesh){triangles+=(n.geometry.index?.count??n.geometry.attributes.position.count)/3*n.count;geometries.add(n.geometry);materials.add(n.material);}});
   let disposed=0;geometries.forEach(g=>g.addEventListener('dispose',()=>disposed++));materials.forEach(m=>m.addEventListener('dispose',()=>disposed++));disposeIsland7Reef(model.root);
   if(disposed!==geometries.size+materials.size)throw Error('Resource ownership leak');
   rows.push({quality,triangles,drawCalls:2,maxStepAt60FPS:maxStep,maxEyeAttachmentError:maxEyeError,dayEyesOff:true,resourcesDisposed:true});
  } return rows;
 });
 const out='docs/gauntlets/island-007-v2/qa/sea-life-v055';mkdirSync(out,{recursive:true});writeFileSync(out+'/runtime.json',JSON.stringify({status:'pass',scope:'Actual factory, 600 consecutive animation steps, three qualities, attached eyes, day/night and owned resource disposal. Not physical-device or visual approval.',results},null,2)+'\n');console.log(JSON.stringify(results));
}finally{await browser.close();}
