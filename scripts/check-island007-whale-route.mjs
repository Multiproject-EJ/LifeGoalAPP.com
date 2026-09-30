import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)('/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,executablePath:'/Users/ejmac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5197/docs/gauntlets/island-007-v2/review/index.html');
 const result=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/.vite/deps/three.js');
  const {createIsland7UnderwaterMaterials,createIsland7UnderwaterLivingAmbience}=await import('/src/features/gamification/level-worlds/dev/Island7UnderwaterThreeWorld.ts');
  const scene=new THREE.Scene(),ocean=new THREE.Mesh();
  const runtime=createIsland7UnderwaterLivingAmbience(scene,{id:'high'},createIsland7UnderwaterMaterials(),ocean,{previewCreatureRoutes:true});
  const whale=scene.getObjectByName('ISLAND_7_WHALE_SILHOUETTE');if(!whale)throw Error('Whale missing');
  const period=Math.PI*2/.016,rows=[],point=new THREE.Vector3();
  for(const spec of [{name:'matched-wide',position:[0,27.525,37.5],target:[0,.45,0],aspect:390/844},{name:'normal-phone',position:[0,25,33],target:[0,.15,0],aspect:376/830}]){
   const camera=new THREE.PerspectiveCamera(42,spec.aspect,.1,500);camera.zoom=1.12;camera.position.fromArray(spec.position);camera.lookAt(...spec.target);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
   let minimumY=1,maximumY=0,visibleSamples=0;
   for(let i=0;i<=720;i++){
    runtime.animate(period*i/720);scene.updateMatrixWorld(true);let visible=false;
    whale.traverse(mesh=>{if(!mesh.isMesh)return;const positions=mesh.geometry.attributes.position;for(let j=0;j<positions.count;j++){point.fromBufferAttribute(positions,j).applyMatrix4(mesh.matrixWorld).project(camera);if(!Number.isFinite(point.x+point.y+point.z))throw Error('Nonfinite route');const x=(point.x+1)/2,y=(1-point.y)/2;if(x>=0&&x<=1&&point.z<1){visible=true;minimumY=Math.min(minimumY,y);maximumY=Math.max(maximumY,y);}}});
    if(visible)visibleSamples++;
   }
   if(minimumY<.065)throw Error(`${spec.name} header intersection: ${minimumY}`);
   rows.push({camera:spec.name,samples:721,visibleSamples,minimumNormalizedY:minimumY,maximumNormalizedY:maximumY,headerGuard:.065});
  }
  runtime.animate(0);const start=whale.position.clone();runtime.animate(period);const finish=whale.position.clone();
  // Vertical breathing has an independent slow phase; X/Z route is exactly closed.
  if(Math.hypot(start.x-finish.x,start.z-finish.z)>1e-8)throw Error('Route seam');
  return{status:'pass',periodSeconds:period,rows,scope:'Actual factory geometry projected through both review and normal phone cameras for one full horizontal loop; no physical-device or artistic anatomy approval.'};
 });
 const out='docs/gauntlets/island-007-v2/qa/whale-route-v056';mkdirSync(out,{recursive:true});writeFileSync(out+'/runtime.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();}
