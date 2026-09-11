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
console.log('PASS: repeated replay, reset during blast, late completion before/during/after blast, same-sequence updates and reduced motion.');
