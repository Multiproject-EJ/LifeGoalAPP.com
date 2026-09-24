import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({configFile:false,appType:'custom',logLevel:'error',server:{middlewareMode:true,hmr:false}});
try {
 const {createIsland2WorldMaterials,buildIsland2Landmark}=await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island2ThreeWorld.ts');
 const {ISLAND_5_LANDMARKS}=await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/island5ThreePilotContract.ts');
 const {createSunshoreArenaRetraction}=await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/SunshoreArenaRetraction.ts');
 for(const quality of ['low','high'])for(const level of [1,2,3]) {
  const root=buildIsland2Landmark(ISLAND_5_LANDMARKS.find(x=>x.id==='boss'),level,quality,createIsland2WorldMaterials());
  const crown=root.getObjectByName('SUNSHORE_RETRACTING_ARENA_CROWN');
  let meshes=0;crown.traverse(o=>{if(o.isMesh)meshes++});assert(meshes>0,'compaction retains movable render geometry');
  const runtime=createSunshoreArenaRetraction(root);const parked=crown.position.y;assert(parked<0);
  assert.equal(runtime.update(0,false,false).heightFraction,.3);
  runtime.update(1,true,false);const halfway=runtime.update(1.9,true,false);assert(halfway.amount>.45&&halfway.amount<.55);
  assert.equal(runtime.update(3,true,false).amount,1);assert(Math.abs(crown.position.y)<1e-9);
  runtime.update(4,false,false);assert(runtime.update(4.75,false,false).amount>.45);
  assert.equal(runtime.update(6,false,false).amount,0);assert.equal(crown.position.y,parked);
  runtime.update(7,true,false);const current=runtime.update(7.6,true,false).amount;
  assert.equal(runtime.update(7.6,false,false).amount,current,'interrupting rise must not jump');
  assert.equal(runtime.update(9.3,false,false).amount,0);
  assert.equal(runtime.update(10,true,true).amount,1,'reduced motion snaps to battle pose');
  assert.equal(runtime.update(11,false,true).amount,0,'reduced motion snaps back');
  console.log(`PASS ${quality} L${level}: retained renderables, rise, sink, reversal, reduced motion`);
 }
} finally {await server.close();}
