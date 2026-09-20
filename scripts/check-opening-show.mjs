import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const THREE = require('three');
const utils = await import('three/addons/utils/BufferGeometryUtils.js');
const base = 'src/features/gamification/level-worlds/';
const load = (file, dependencies = {}) => {
  const js = ts.transpileModule(readFileSync(base + file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', js)(id => dependencies[id] ?? require(id), exports);
  return exports;
};
const presentation = load('services/islandRunOpeningCeremonyPresentation.ts');
const { createOpeningGamesCeremonyThree } = load('dev/OpeningGamesCeremonyThree.ts', {
  '../services/islandRunOpeningCeremonyPresentation': presentation,
  'three/addons/utils/BufferGeometryUtils.js': utils,
});
const harness = load('services/__tests__/testHarness.ts');
const suite = load('services/__tests__/islandRunOpeningCeremonyPresentation.test.ts', {
  '../islandRunOpeningCeremonyPresentation': presentation, './testHarness': harness,
});
let checks = 0;
const check = (name, fn) => { fn(); checks++; console.log('PASS', name); };
for (const test of suite.islandRunOpeningCeremonyPresentationTests) check(test.name, test.run);
const fx = createOpeningGamesCeremonyThree();
const material = new THREE.MeshStandardMaterial({ emissiveIntensity: .3 });
material.userData.openingCeremonyWindow = true;
const palace = new THREE.Group();
palace.add(new THREE.Mesh(new THREE.BoxGeometry(), material));
fx.bindPalace(palace);
check('presentation is invisible before a canonical playback request', () => assert.equal(fx.root.visible, false));
check('show warms tagged windows without mutating their authored baseline', () => {
  fx.update({ active: true, elapsedMs: 6000, reducedMotion: false });
  assert.equal(fx.root.visible, true);
  assert.equal(material.emissiveIntensity, .8);
  assert.equal(fx.root.getObjectByName('OPENING_OFFSHORE_FIREWORKS').visible, true);
});
check('effects stay small and every animated vertex is finite', () => {
  let drawables = 0, triangles = 0;
  fx.root.traverse(node => {
    if (!node.geometry) return;
    drawables++;
    for (const value of node.geometry.attributes.position.array) assert.ok(Number.isFinite(value));
    if (node.isMesh) triangles += (node.geometry.index?.count ?? node.geometry.attributes.position.count) / 3;
  });
  assert.equal(drawables, 3);
  assert.ok(triangles < 500);
});
check('quiet mode has a steady flame and no fireworks', () => {
  fx.update({ active: true, elapsedMs: 500, reducedMotion: true });
  const flame = fx.root.getObjectByName('OPENING_BEACON_FLAME');
  assert.equal(flame.scale.y, 1.8);
  assert.equal(fx.root.getObjectByName('OPENING_OFFSHORE_FIREWORKS').visible, false);
});
check('both offshore bursts fit the canonical portrait overview', () => {
  const camera = new THREE.PerspectiveCamera(42, 390 / 844, .1, 210);
  camera.position.set(0, 25, 33);
  camera.lookAt(0, .15, 0);
  camera.updateMatrixWorld();
  for (const elapsedMs of [5600, 6400, 7800, 9000]) {
    fx.update({ active: true, elapsedMs, reducedMotion: false });
    const positions = fx.root.getObjectByName('OPENING_OFFSHORE_FIREWORKS').geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const point = new THREE.Vector3().fromBufferAttribute(positions, i).project(camera);
      assert.ok(Math.abs(point.x) < .85 && point.y > 0 && point.y < .85, 'burst stays above route, below HUD and within screen sides');
    }
  }
});
check('finish, skip and unmount restore window lighting', () => {
  fx.update(null);
  assert.equal(fx.root.visible, false);
  assert.equal(material.emissiveIntensity, .3);
  fx.update({ active: true, elapsedMs: 12000, reducedMotion: false });
  assert.equal(fx.root.visible, false);
  fx.update({ active: true, elapsedMs: 5000, reducedMotion: false });
  fx.dispose();
  assert.equal(material.emissiveIntensity, .3);
});
check('ceremony supports L0 before a palace has been funded', () => {
  const unbuilt = createOpeningGamesCeremonyThree();
  unbuilt.bindPalace(undefined, [4.36, 0, 3.9]);
  assert.deepEqual(unbuilt.root.getObjectByName('OPENING_BEACON').position.toArray(), [4.36, .704, 3.9]);
  unbuilt.dispose();
});
console.log(`${checks} opening-show checks passed; browser appearance remains a separate gate`);
