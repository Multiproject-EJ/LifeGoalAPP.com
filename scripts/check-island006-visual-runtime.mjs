import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)('/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'/Users/ejmac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',headless:true});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5186/island-016-fishing-interaction-lab.html?view=overview&weatherTime=4',{waitUntil:'networkidle'});
 const result=await page.evaluate(async()=>{
  const m=await import('/src/features/gamification/level-worlds/dev/Island22FishermansVillageThreeWorld.ts');
  const c=await import('/src/features/gamification/level-worlds/dev/island5ThreePilotContract.ts');
  const factories=await import('/src/features/gamification/level-worlds/dev/Island22PremiumLandmarkFamilies.ts');
  const checks=[];const resources=new Set();
  for(const quality of ['low','medium','high']){
   const materials=m.createIsland22FishermansVillageMaterials();
   for(const level of [1,2,3])for(const def of [...c.ISLAND_5_LANDMARKS,{id:'market'},{id:'cottage-01'},{id:'cottage-02'},{id:'cottage-03'},...[4,5,7,8,9,10,11,12].map(n=>({id:'cottage-'+String(n).padStart(2,'0')}))]){
    if(def.id.startsWith('cottage-') && level!==3)continue;
    const secondary=Number(def.id.slice(8))-1;
    const root=def.id.startsWith('cottage-')&&[3,4,6,7,8,9,10,11].includes(secondary)?m.createIsland22SecondaryCottage(secondary,quality,materials):def.id==='cottage-03'?m.createIsland22SmokehouseCottage(quality,materials):def.id==='cottage-02'?m.createIsland22NetMenderCottage(quality,materials):def.id==='cottage-01'?m.createIsland22NorthCottage(quality,materials):def.id==='market'?factories.createIsland22PremiumFishMarketHall({level,quality,materials}):m.buildIsland22FishermansVillageLandmark(def,level,quality,materials);let vertices=0,triangles=0,draws=0;
    root.updateMatrixWorld(true);root.traverse(o=>{
     if(!o.matrixWorld.elements.every(Number.isFinite))throw Error(`Invalid transform ${def.id} L${level}`);
     const p=o.geometry?.attributes.position;if(p){vertices+=p.count;triangles+=(o.geometry.index?.count??p.count)/3;draws++;for(const n of p.array)if(!Number.isFinite(n))throw Error(`Invalid geometry ${o.name}`);resources.add(o.geometry);}
    });
    if(vertices===0)throw Error(`Empty landmark ${def.id}`);checks.push({landmark:def.id,level,quality,vertices,triangles,draws});
   }
   Object.values(materials).forEach(v=>{if(v?.dispose)resources.add(v)});
  }
  resources.forEach(r=>r.dispose());return {checks,passed:checks.length,scope:'All five authored landmarks plus fish market at L1/L2/L3 and eleven decorative cottages, all at low/medium/high: finite, nonempty geometry and transforms. Visual acceptance remains screenshot-based.'};
 });
 writeFileSync(process.argv[2] || 'docs/gauntlets/island-006-v2/runtime-validation.json',JSON.stringify(result,null,2));console.log(`${result.passed} landmark level/tier checks passed`);
}finally{await browser.close()}
