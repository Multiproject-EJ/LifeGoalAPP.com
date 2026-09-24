import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({configFile:false,appType:'custom',logLevel:'error',server:{middlewareMode:true,hmr:false}});
try {
 const {createIsland2WorldMaterials,buildIsland2Landmark}=await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island2ThreeWorld.ts');
 const {ISLAND_5_LANDMARKS}=await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/island5ThreePilotContract.ts');
 const mod=await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island5SunshoreV2Architecture.ts');
 for(const quality of ['low','high'])for(const factory of ['HabitLodge','EggGrotto','StarArchive','Oracle']) {
  const id={HabitLodge:'habit',EggGrotto:'hatchery',StarArchive:'wisdom',Oracle:'event'}[factory];
  const root=buildIsland2Landmark(ISLAND_5_LANDMARKS.find(x=>x.id===id),3,quality,createIsland2WorldMaterials());const moving=[];
  root.traverse(o=>{if(o.userData.sunshoreMagicMotion)moving.push(o);});assert(moving.length>=1);
  const state=()=>moving.map(o=>({position:o.position.toArray(),rotation:o.rotation.toArray()}));
  const rendered=[];
  for(const object of moving){let count=0;object.traverse(child=>{if(child.isMesh){rendered.push(child);count++;}});assert(count>0,`${factory}: ${object.name} lost its renderable parts during static optimization`);}
  root.updateMatrixWorld(true);const originalMatrices=rendered.map(o=>o.matrixWorld.toArray());
  const original=state(),runtime=mod.createSunshoreLandmarkMagicRuntime([root]);
  runtime.update(17,false);assert.notDeepEqual(state(),original,`${factory} must animate`);
  root.updateMatrixWorld(true);assert.notDeepEqual(rendered.map(o=>o.matrixWorld.toArray()),originalMatrices,'Actual rendered transforms must move');
  const at17=state();runtime.update(400,false);runtime.update(17,false);assert.deepEqual(state(),at17,'Motion must not accumulate across updates');
  runtime.update(500,true);assert.deepEqual(state(),original,'Reduced motion must restore static authored transforms');
  for(const o of moving)assert(o.position.toArray().every(Number.isFinite));
  console.log(`PASS ${quality} ${factory}: ${moving.length} rigid mechanisms; elapsed-time motion and reduced-motion restoration`);
 }
}finally{await server.close();}
