import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as THREE from 'three';
const require = createRequire(import.meta.url);
// Resolve Vite's own dependency with either npm or pnpm installation layouts.
const esbuild = createRequire(require.resolve('vite/package.json'))('esbuild');
mkdirSync('tmp', { recursive: true });
await esbuild.build({ stdin: { contents: `export * from './src/features/gamification/level-worlds/dev/Island1AssemblyMarina'; export * from './src/features/gamification/level-worlds/dev/Island1MarinaMarketLayout'; export {createIsland1WorldMaterials} from './src/features/gamification/level-worlds/dev/Island1ThreeWorld';`, resolveDir: process.cwd() }, outfile: 'tmp/island001-market-check.mjs', bundle: true, platform: 'node', format: 'esm', packages: 'external', define: {'import.meta.env':'{}'}, logLevel:'warning' });
const api = await import(pathToFileURL(path.resolve('tmp/island001-market-check.mjs')).href);
const measurements=[];
for(const quality of ['low','medium','high']){
 const runtime=api.createIsland1AssemblyMarina(quality,api.createIsland1WorldMaterials());
 const market=runtime.root.getObjectByName('ISLAND_1_VENETIAN_MARKET');
 runtime.update(1,0);runtime.root.updateMatrixWorld(true);
 assert.equal(runtime.getPresentation().berthCount,220);
 const craft=runtime.root.getObjectByName('MARINA_CRAFT_Ambassador cruiser_0'),m=new THREE.Matrix4(),p=new THREE.Vector3();
 craft.getMatrixAt(0,m);p.setFromMatrixPosition(m);
 assert.ok(Math.abs(p.z-24.2)<.001,'first spacecraft moves out by two berth pitches');
 const arches=market.getObjectByName('MARINA_VENETIAN_STEPPED_ARCHES');
 assert.equal(arches.count,5);
 // Vertical rays must hit the actual staircase at its declared pedestrian height.
 for(const angle of api.MARINA_BRIDGE_ANGLES){
  for(let x=-2.79;x<2.8;x+=.071){
   const point=new THREE.Vector3(x,0,api.MARINA_MARKET_WALK_RADIUS).applyAxisAngle(new THREE.Vector3(0,1,0),angle);
   const ray=new THREE.Raycaster(new THREE.Vector3(point.x,5,point.z),new THREE.Vector3(0,-1,0));
   const hit=ray.intersectObject(arches)[0];assert.ok(hit,'bridge has a connected walkable tread');
   assert.ok(Math.abs(hit.point.y-api.marinaBridgeHeight(x))<.002,'surface contract matches visible tread geometry');
  }
  const hole=api.marinaPolar(14,angle),ray=new THREE.Raycaster(new THREE.Vector3(hole[0],5,hole[2]),new THREE.Vector3(0,-1,0));
  assert.equal(ray.intersectObject(market.getObjectByName('MARINA_MARKET_DECK_SECTORS')).length,0,'canal remains open water');
 }
 // Pedestrian circuits must stay on the deck and clear every authored kiosk/cafe/planter.
 for(const radius of [17.23,17.5,17.77])for(let a=0;a<Math.PI*2;a+=.009){
  const p=api.marinaPolar(radius,a);assert.notEqual(api.marinaMarketSurfaceY(p[0],p[2]),null);
  for(const prop of market.userData.propBounds)assert.ok(Math.hypot(p[0]-prop.x,p[2]-prop.z)>prop.radius+.10,'market walking circuit clears '+prop.kind);
 }
 const delegates=runtime.root.getObjectByName('ISLAND_1_MARINA_ARTICULATED_DELEGATES');
 const routes=delegates.userData.routes;
 assert.ok(routes.slice(0,3).every(r=>r.start>=.325&&r.shipIndex===0),'first delegation waits for deployed ramp');
 assert.ok(routes[0].points.some(p=>p[1]>api.MARINA_WALK_Y+.8),'hero walks over the stepped bridge');
 for(const route of routes)for(let j=1;j<route.points.length;j++){
  const a=new THREE.Vector3(...route.points[j-1]),b=new THREE.Vector3(...route.points[j]);
  for(let f=0;f<1;f+=.1){
   const p=a.clone().lerp(b,f),r=Math.hypot(p.x,p.z);
   if(r<10.05||r>20.75)continue;
   const surface=api.marinaMarketSurfaceY(p.x,p.z);assert.notEqual(surface,null,'arrival route stays out of open canals');
   assert.ok(Math.abs(p.y-surface)<.11,'arrival route follows deck and stair height');
   for(const prop of market.userData.propBounds)assert.ok(Math.hypot(p.x-prop.x,p.z-prop.z)>prop.radius+.07,'delegates clear '+prop.kind);
  }
 }
 const people=market.getObjectByName('MARKET_GUEST_JACKETS');
 const before=people.instanceMatrix.array.slice();runtime.update(1,4);
 assert.notDeepEqual(people.instanceMatrix.array,before,'market guests walk after the arrival film');
 const frozen=people.instanceMatrix.array.slice();runtime.update(1,4);assert.deepEqual(people.instanceMatrix.array,frozen,'repeated frozen clock is stable');
 for(let pass=0;pass<2;pass++){
  runtime.update(0,0);assert.equal(runtime.getPresentation().seatedCount,0);
  runtime.update(.86,20);assert.ok(runtime.getPresentation().seatedCount<runtime.getPresentation().delegateCount);
  runtime.update(1,48);assert.equal(runtime.getPresentation().seatedCount,runtime.getPresentation().delegateCount);
  assert.equal(runtime.getPresentation().meetingState,'in-session');
 }
 let batches=0,triangles=0;
 market.traverse(node=>{
  if(!node.isMesh)return;batches++;
  triangles+=(node.geometry.index?.count??node.geometry.attributes.position.count)/3*(node.isInstancedMesh?node.count:1);
  if(node.isInstancedMesh)assert.ok([...node.instanceMatrix.array].every(Number.isFinite));
 });
 assert.ok(batches<=15,'market stays within the incremental batching budget');
 assert.ok(triangles<=45000,'market stays within the incremental 45k triangle budget');
 measurements.push({quality,batches,triangles,people:market.userData.people,firstEntry:Math.min(...routes.map(r=>r.entryProgress)),lastEntry:Math.max(...routes.map(r=>r.entryProgress))});
}
// An actual reduced-motion media preference freezes ambient walking, even while
// the rest of the runtime continues receiving a changing wall clock.
globalThis.matchMedia=()=>({matches:true});
const reduced=api.createIsland1AssemblyMarina('low',api.createIsland1WorldMaterials());
reduced.update(1,0);
const reducedPeople=reduced.root.getObjectByName('MARKET_GUEST_JACKETS');
const reducedBefore=reducedPeople.instanceMatrix.array.slice();
reduced.update(1,9);assert.deepEqual(reducedPeople.instanceMatrix.array,reducedBefore);
delete globalThis.matchMedia;
writeFileSync('docs/gauntlets/island-001-venetian-marina/evidence/runtime-measurements.json',JSON.stringify(measurements,null,2)+'\n');
console.log('PASS: relocated berths, actual tread raycasts, open canals, collision-free market/arrival paths, ramp timing, replay, seating and animated crowd at all three qualities.');
console.log(JSON.stringify(measurements,null,2));
