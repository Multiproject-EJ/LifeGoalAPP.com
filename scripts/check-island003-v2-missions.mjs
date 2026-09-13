import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createServer } from 'vite';
const server = await createServer({ appType: 'custom', configFile: false, cacheDir: '.vite-cache/v2-missions', logLevel: 'error', server: {middlewareMode: true, hmr: false} });
try {
  for (const [file, key] of [['islandRunSignatureMissions.test.ts', 'islandRunSignatureMissionTests'], ['islandRunRollAction.test.ts', 'islandRunRollActionTests']]) {
    const suite = await server.ssrLoadModule(`/src/features/gamification/level-worlds/services/__tests__/${file}`);
    for (const test of suite[key].filter(test => /Moonwell|Frostwell/.test(test.name))) { await test.run(); console.log(`PASS ${test.name}`); }
  }
  const { createIsland3FrostmoonMaterials } = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island3FrostmoonThreeWorld.ts');
  const { createFrostwellIceworks } = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/FrostwellIceworksThreeModel.ts');
  const mission = createFrostwellIceworks('low', createIsland3FrostmoonMaterials());
  const bit = mission.root.getObjectByName('FROSTWELL_HELICAL_AUGER_BIT');
  mission.setPresentation({ metersDrilled: 100, built: false, constructionSequence: 0 });
  mission.animate(0);
  const before = bit.position.y;
  for (let i = 1; i <= 20; i++) {
    mission.setPresentation({ metersDrilled: 175, built: false, constructionSequence: 0, drillingActive: true });
    mission.animate(i / 10);
  }
  const midway = bit.position.y;
  mission.animate(5);
  const after = bit.position.y;
  assert(before > midway && midway > after, 'frame updates preserve gradual descent rather than snapping to target');
  mission.setInspectionActive(true);
  const closePose = mission.getCutawayCameraPose();
  mission.setPresentation({ metersDrilled: 500, built: true, constructionSequence: 1, reducedMotion: true });
  const finalPose = mission.getCutawayCameraPose();
  assert(closePose.position.distanceTo(closePose.target) < finalPose.position.distanceTo(finalPose.target), 'live drill camera is closer than completed inspection');
  assert.equal(bit.position.y, 0.1 - 4.88, 'reduced motion settles committed depth immediately');
  console.log('PASS Frostwell repeated updates, close drill POV and reduced-motion settle');
  const { createIslandRigidSurfaceBatches } = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island1AnimatedBatches.ts');
  const scene = new THREE.Scene(); scene.add(mission.root);
  const lamp = mission.root.getObjectByName('FROSTWELL_PROGRESS_LIGHT_1');
  const lampGeometry = lamp.geometry;
  const batches = createIslandRigidSurfaceBatches(scene, [mission.root.name], 'TEST_FROSTWELL_BATCH', 32, mesh => !mesh.name.startsWith('FROSTWELL_PROGRESS_LIGHT_'));
  mission.root.add(batches.root);
  const camera = new THREE.PerspectiveCamera(); camera.position.set(3,1,15);
  batches.sync(camera);
  assert.equal(lamp.geometry, lampGeometry, 'material-swapping progress lamps excluded');
  assert.equal(batches.root.parent, mission.root, 'cinematic visibility owned by mission root');
  mission.root.visible = false; batches.sync(camera);
  assert(batches.root.children.every(mesh => !mesh.visible), 'ancestor hide suppresses all extracted mission surfaces');
  mission.root.visible = true; batches.sync(camera);
  assert(batches.root.children.some(mesh => mesh.visible), 'mission surfaces return after visibility restore');
  batches.dispose();
  console.log('PASS Frostwell batch lamp exclusion and cinematic visibility restoration');

  const rigidScene = new THREE.Scene();
  const movingGroup = new THREE.Group(); movingGroup.name = 'MOVING_TEST_GROUP'; rigidScene.add(movingGroup);
  const rigidMaterial = new THREE.MeshStandardMaterial();
  for (const x of [1, 2]) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(), rigidMaterial); mesh.position.x = x; movingGroup.add(mesh); }
  const rigid = createIslandRigidSurfaceBatches(rigidScene, [movingGroup.name], 'SHARED_FRAME_TEST');
  let traversals = 0;
  const updateWorld = rigidScene.updateMatrixWorld.bind(rigidScene);
  rigidScene.updateMatrixWorld = (...args) => { traversals += 1; return updateWorld(...args); };
  movingGroup.position.x = 4;
  rigidScene.updateMatrixWorld(true);
  rigid.sync(undefined, true);
  const shader = { uniforms: {}, vertexShader: '#include <beginnormal_vertex>\n#include <begin_vertex>' };
  rigid.root.children[0].material.onBeforeCompile(shader);
  assert.equal(traversals, 1, 'current frame reuses one scene traversal');
  assert.equal(shader.uniforms.islandPartMatrices.value[0].elements[12], 5, 'shared update retains moved parent transform');
  assert.equal(shader.uniforms.islandPartMatrices.value[1].elements[12], 6, 'all batch sources use the current frame');
  rigid.sync();
  assert.equal(traversals, 2, 'default callers retain automatic matrix updates');
  rigid.dispose();
  console.log('PASS shared-frame batching preserves motion with one world traversal');

  const { createMoonwellThermalAnimator } = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island3MoonwellThermalPresentation.ts');
  const root = new THREE.Group();
  const shared = new THREE.MeshStandardMaterial({color: 0xaaccff});
  const ice = new THREE.Mesh(new THREE.BoxGeometry(), shared); ice.userData.moonwellThermalRole = 'ice'; root.add(ice);
  const water = new THREE.Mesh(new THREE.CircleGeometry(), shared); water.userData.moonwellThermalRole = 'water'; root.add(water);
  const animator = createMoonwellThermalAnimator(root);
  animator.update({heated:false,running:false,sequence:0},0,false);
  assert(ice.visible && !water.visible, 'old saves begin completely frozen');
  animator.update({heated:true,running:true,sequence:1},1,false);
  const frame = animator.update({heated:true,running:true,sequence:1},6,false);
  assert.equal(frame.progress, .5); assert(ice.scale.x < 1 && water.visible, 'halfway thaw exposes water gradually');
  animator.update({heated:true,running:false,sequence:1},6,false);
  assert(!ice.visible && water.visible, 'skip settles hot state');
  animator.dispose(); assert.equal(water.material, shared, 'owned material clones restored on cleanup');
  console.log('PASS Moonwell frozen, gradual melt, interruption and material cleanup');
} finally { await server.close(); }
