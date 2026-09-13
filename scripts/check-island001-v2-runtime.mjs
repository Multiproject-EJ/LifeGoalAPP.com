import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const esbuild = require('../node_modules/.pnpm/esbuild@0.21.5/node_modules/esbuild');
mkdirSync('tmp', { recursive: true });
await esbuild.build({ entryPoints: ['src/features/gamification/level-worlds/dev/Island1AssemblyCoast.ts'], outfile: 'tmp/island001-coast-check.mjs', bundle: true, platform: 'node', format: 'esm', packages: 'external', logLevel: 'warning' });
const THREE = await import('three');
const { createAssemblyHeroCoast } = await import(pathToFileURL(path.resolve('tmp/island001-coast-check.mjs')).href);
for (const quality of ['low', 'medium', 'high']) {
  const coast = createAssemblyHeroCoast(quality, { moonstone: new THREE.MeshStandardMaterial() });
  for (const elapsed of [-0.1, Number.NaN, 0, 0.01, 1, 3600]) {
    coast.animate(elapsed);
    coast.root.traverse(node => {
      if (!(node instanceof THREE.InstancedMesh)) return;
      assert.ok([...node.instanceMatrix.array].every(Number.isFinite), `${quality}: nonfinite waterfall instance at ${elapsed}`);
    });
  }
  for(const flow of [0,.25,.75,1])for(const draining of [true,false]){
    coast.animate(2,flow,draining);
    const curtain=coast.root.getObjectByName('HERO_CASCADE_WATER_CURTAIN');
    assert.equal(curtain.visible,flow>0);
    assert.ok([...curtain.geometry.attributes.position.array].every(Number.isFinite));
    assert.equal(coast.root.getObjectByName('HERO_CASCADE_FLOW_STREAKS').visible,flow>0);
  }
}
console.log('PASS: waterfall startup, nonfinite input, steady flow and long-session transforms at all qualities.');
await esbuild.build({ stdin: { contents: `export {createIsland1AssemblyCraterRuntime} from './src/features/gamification/level-worlds/dev/Island1AssemblyCraterThreeWorld'; export {createIsland1WorldMaterials} from './src/features/gamification/level-worlds/dev/Island1ThreeWorld';`, resolveDir: process.cwd() }, outfile: 'tmp/island001-sequence-check.mjs', bundle: true, platform: 'node', format: 'esm', packages: 'external', define: {'import.meta.env':'{}'}, logLevel:'warning' });
const { createIsland1AssemblyCraterRuntime, createIsland1WorldMaterials } = await import(pathToFileURL(path.resolve('tmp/island001-sequence-check.mjs')).href);
const scene = new THREE.Scene(), materials = createIsland1WorldMaterials();
const runtime = createIsland1AssemblyCraterRuntime(scene, 'low', materials);
const state = (charges, completed, sequence) => ({chargesDetonated:charges, targetCharges:10, completed, constructionSequence:sequence});
for (const completeAt of [0, 2, 7]) {
  runtime.updateAssemblyCrater(state(0,false,0),true);
  runtime.updateAssemblyCrater(state(8,false,2),true);
  runtime.updateAssemblyCrater(state(10,false,3));
  if (completeAt === 0) runtime.updateAssemblyCrater(state(10,true,3));
  runtime.animate(100);
  if (completeAt > 0) {
    runtime.animate(100+completeAt);
    const before = runtime.root.userData.excavationVisualProgress;
    runtime.updateAssemblyCrater({...state(10,false,3),claimedDynamiteTileIndices:[1,2]});
    assert.equal(runtime.root.userData.excavationVisualProgress,before,'same-sequence tile updates preserve excavation interpolation');
    runtime.updateAssemblyCrater(state(10,true,3));
  }
  const start = 100+Math.max(5.2,completeAt);
  runtime.animate(start+4);
  assert.equal(runtime.root.getObjectByName('ISLAND_1_ASSEMBLY_TWENTY_STAGE_EXCAVATION_VOLUME').visible,false,'excavation funnel clears the emerging hall');
  assert.equal(runtime.root.getObjectByName('ISLAND_001_CARVED_CAVERN_AND_LIMESTONE_RIBS').visible,true,'the excavated cavern supports construction');
  assert.ok(Math.abs(runtime.getConstructionPresentation().progress-.5)<.0001,`late completion at ${completeAt}s starts at the existing blast end`);
  runtime.animate(start+8.1);
  assert.equal(runtime.getConstructionPresentation().completed,true);
}
for (let replay=0;replay<2;replay++) {
  runtime.updateAssemblyCrater(state(0,false,0));
  for (const [sequence,charges] of [[1,3],[2,8],[3,10]]) {
    runtime.updateAssemblyCrater(state(charges,charges===10,sequence));
    runtime.animate(sequence*20);
    assert.equal(runtime.getBlastPresentation().active,true,`replay ${replay}, batch ${sequence} detonates`);
    runtime.animate(sequence*20+13.4);
  }
  assert.equal(runtime.getConstructionPresentation().completed,true);
}
runtime.updateAssemblyCrater(state(0,false,0));
runtime.updateAssemblyCrater(state(3,false,1));runtime.animate(200);
runtime.updateAssemblyCrater(state(0,false,0));
assert.equal(runtime.getBlastPresentation().active,false,'reset clears the active blast immediately');
assert.equal(runtime.root.getObjectByName('ISLAND_1_ASSEMBLY_CRATER_BLAST_DUST_CLOUDS').visible,false);
runtime.updateAssemblyCrater(state(10,true,0),true);
assert.equal(runtime.getConstructionPresentation().progress,1,'reduced-motion and hydrated completion snap to commissioned hall');
const marina = runtime.root.getObjectByName('ISLAND_1_ASSEMBLY_DIPLOMATIC_MARINA');
assert.ok(marina, 'commissioned Assembly creates the diplomatic marina presentation root');
assert.equal(marina.userData.berthCount, 220, 'marina retains more than two hundred deterministic berth sockets');
assert.equal(marina.userData.designFamilyCount, 50, 'fleet exposes fifty design families');
assert.deepEqual(marina.userData.fleetMix, { spacecraft: 0.95, yachts: 0.05 }, 'yachts remain a five-percent minority');
assert.equal(runtime.root.getObjectByName('ISLAND_1_MARINA_220_BERTH_FINGERS').count, 220, 'all berth fingers share one instanced draw');
assert.ok(runtime.root.getObjectByName('ISLAND_1_MARINA_GRAND_ENTRY_HALL'), 'marina includes the large ceremonial entry hall');
assert.ok(runtime.root.getObjectByName('ISLAND_1_MARINA_SOFT_FAR_FLEET') instanceof THREE.Points, 'far arrivals use a soft point-field LOD');
assert.equal(runtime.getMarinaPresentation().completed, true, 'reduced-motion and hydrated completion snap to the finished marina');
assert.equal(runtime.getMarinaPresentation().spacecraftCount, 68, 'low quality preserves the ninety-five percent spacecraft mix');
assert.equal(runtime.getMarinaPresentation().yachtCount, 4, 'low quality caps yachts at five percent');
runtime.setMarinaProgress(0);
assert.equal(runtime.getMarinaPresentation().phase, 'hidden', 'before comparison hides the entire marina');
runtime.animate(300);runtime.replayMarina();runtime.animate(324);
assert.ok(Math.abs(runtime.getMarinaPresentation().progress - .5) < .0001, 'replay drives the forty-eight-second marina sequence');
runtime.animate(348.1);
assert.equal(runtime.getMarinaPresentation().completed, true, 'replay reaches the populated completed state');
assert.equal(runtime.getMarinaPresentation().seatedCount, runtime.getMarinaPresentation().delegateCount, 'all visible delegates reach their assigned chairs');
runtime.setMarinaProgress(.86);
assert.equal(runtime.getMarinaPresentation().phase, 'podium', 'camera reaches the speaker viewpoint before seating completes');
assert.ok(runtime.getMarinaPresentation().seatedCount < runtime.getMarinaPresentation().delegateCount, 'podium view shows seats still filling');
runtime.setMarinaProgress(0);
assert.equal(runtime.getMarinaPresentation().seatedCount, 0, 'rewind resets audience occupancy');
runtime.setMarinaProgress(.26);
assert.equal(runtime.getMarinaPresentation().visibleCraftCount,1,'the first landing is isolated');
assert.equal(runtime.getMarinaPresentation().arrivedCraftCount,0);
runtime.setMarinaProgress(.33);
assert.equal(runtime.getMarinaPresentation().arrivedCraftCount,1,'only the hero has docked at disembarkation');
assert.equal(runtime.getMarinaPresentation().visibleCraftCount,1,'secondary ships wait for the first passenger');
const routeData=runtime.root.getObjectByName('ISLAND_1_MARINA_ARTICULATED_DELEGATES').userData.routes;
assert.equal(routeData.filter(r=>r.start<.36).length,3,'three-person delegation exits before secondary arrivals');
assert.deepEqual(routeData.slice(0,3).map(r=>r.shipIndex),[0,0,0],'delegation shares the first spacecraft');
assert.equal(runtime.root.getObjectByName('ISLAND_1_MARINA_ARTICULATED_DELEGATES').userData.delegation.nation,'Aurelian Tide');
runtime.setMarinaProgress(.475);
assert.equal(runtime.getMarinaPresentation().visibleCraftCount,4,'three secondary ships follow');
runtime.setMarinaProgress(.70);
assert.equal(runtime.getMarinaPresentation().interior,false,'fleet panorama stays outside');
assert.equal(runtime.getMarinaPresentation().arrivedCraftCount,runtime.getMarinaPresentation().craftCount,'entire modeled fleet lands before camera leaves the panorama');
assert.ok(runtime.getMarinaPresentation().cameraPosition[1]>10,'landings are shown from a wide exterior view');
runtime.setMarinaProgress(.78);
assert.equal(runtime.getMarinaPresentation().interior,true);
for(const route of routeData)assert.ok(route.points.some(p=>Math.abs(p[0])<.4&&p[2]===6.65),'every delegate uses the real central entrance');
assert.ok(runtime.root.getObjectByName('MARINA_LOCAL_ARRIVAL_FLASHES'));
assert.ok(runtime.root.getObjectByName('MARINA_LANDING_VAPOUR_PUFFS'));
const coastRoot=runtime.root.getObjectByName('ISLAND_001_HERO_WATERFALL_COAST');
for(let n=0;n<=200;n++){
  runtime.setMarinaProgress(n/200);
  const p=runtime.getMarinaPresentation();
  if(p.enteredCount>0&&p.enteredCount<p.delegateCount)assert.equal(p.waterfallFlow,0,'water stays off while anyone is still entering');
  assert.equal(coastRoot.userData.waterfallFlow,p.waterfallFlow,'scrubbing updates the actual waterfall immediately');
}
assert.equal(runtime.getMarinaPresentation().meetingState,'in-session');
assert.equal(coastRoot.userData.waterfallFlow,1,'waterfall restarts after the final entrance');
runtime.endMarinaMeeting();runtime.animate(349.1);
assert.ok(runtime.getMarinaPresentation().waterfallFlow<1);
runtime.animate(367);
assert.equal(runtime.getMarinaPresentation().waterfallFlow,0,'ending the meeting reopens the entrance');
runtime.setMarinaProgress(.6);
assert.equal(runtime.getMarinaPresentation().meetingState,'admitting','rewind clears the ended meeting');
runtime.replayMarina();
assert.equal(coastRoot.userData.waterfallFlow,1,'replay restores the initial waterfall');
for(const name of ['DELEGATE_FACES','DELEGATE_EYES','DELEGATE_IRISES','DELEGATE_BROWS','DELEGATE_EARS','DELEGATE_SOFT_SMILES','AURELIAN_CEREMONIAL_MANTLES','AURELIAN_OPEN_HIGH_COLLARS','AURELIAN_SUN_DISC_INSIGNIA','AURELIAN_SPLIT_COURT_COATS']){
 const mesh=runtime.root.getObjectByName(name);
 assert.ok(mesh instanceof THREE.InstancedMesh,name+' is batched');
 assert.ok([...mesh.instanceMatrix.array].every(Number.isFinite),name+' matrices are finite');
}
console.log('PASS: entry-aware waterfall drain/restart, meeting release, scrubbing/replay and attached face batches.');
await esbuild.build({entryPoints:['src/features/gamification/level-worlds/dev/Island1V2Terrain.ts'],outfile:'tmp/island001-door-check.mjs',bundle:true,platform:'node',format:'esm',packages:'external',logLevel:'warning'});
const {createIsland001V2Terrain,createAssemblySeaGeometry}=await import(pathToFileURL(path.resolve('tmp/island001-door-check.mjs')).href);
for(const quality of ['low','medium','high']){
 const terrain=createIsland001V2Terrain(quality);terrain.updateMatrixWorld(true);
 for(const x of [-.55,0,.55])for(const y of [-3.2,-2.3,-1.3]){
   const ray=new THREE.Raycaster(new THREE.Vector3(x,y,10),new THREE.Vector3(0,0,-1),0,3.55);
   assert.equal(ray.intersectObjects(terrain.children,true).length,0,quality+' has a real unobstructed waterfall doorway');
 }
}
const seaTest=new THREE.Mesh(createAssemblySeaGeometry(),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
seaTest.rotation.x=-Math.PI/2;seaTest.position.y=-2.65;seaTest.updateMatrixWorld(true);
assert.equal(new THREE.Raycaster(new THREE.Vector3(0,0,7.8),new THREE.Vector3(0,-1,0),0,4).intersectObject(seaTest).length,0,'seawater does not cover the entrance stairs');
console.log('PASS: actual doorway ray clearance at all quality levels and dry entrance stairs.');
console.log('PASS: repeated replay, reset during blast, late completion before/during/after blast, same-sequence updates and reduced motion.');
