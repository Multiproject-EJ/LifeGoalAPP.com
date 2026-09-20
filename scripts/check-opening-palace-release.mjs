import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createServer } from 'vite';

// Exercise the actual production-selected factory without DOM or preview flags.
process.env.NODE_ENV = 'production';
const server = await createServer({ appType: 'custom', configFile: false, mode: 'production',
  cacheDir: '.tmp-palace-release-vite-cache', optimizeDeps: { noDiscovery: true, include: [] },
  logLevel: 'error', server: { middlewareMode: true, hmr: false } });
let checks = 0;
const check = (name, run) => { run(); checks++; console.log('PASS', name); };
try {
  const base = '/src/features/gamification/level-worlds/dev/';
  const { buildLandmark, createPilotMaterials, compactOpeningPalaceParts } = await server.ssrLoadModule(base + 'Island5ThreePilot.tsx');
  const { ISLAND_5_LANDMARKS } = await server.ssrLoadModule(base + 'island5ThreePilotContract.ts');
  const { prepareIslandConstructionLevelDelta } = await server.ssrLoadModule(base + 'IslandConstructionLevelDelta.ts');
  const materials = createPilotMaterials('low', 4);
  const build = (landmark, level, preview, world = 4) => {
    const root = buildLandmark(landmark, level, 'low', materials, world,
      preview ? { constructionPreview: preview } : {});
    root.position.set(0, 0, 0);
    root.updateWorldMatrix(true, true);
    return root;
  };
  for (const landmark of ISLAND_5_LANDMARKS) {
    for (const level of [0, 1, 2, 3]) {
      check(`${landmark.id} L${level}: production selection and no temporary dressing`, () => {
        const root = build(landmark, level);
        assert.equal(Boolean(root.getObjectByName('OPENING_PALACE')), landmark.id === 'boss' && level > 0);
        root.traverse(node => assert.ok(!node.userData.constructionTemporary));
      });
    }
    for (const level of [0, 1, 2]) {
      check(`${landmark.id} L${level}->L${level + 1}: additive construction and commissioning`, () => {
        const current = build(landmark, level, 'current');
        const target = build(landmark, level + 1, 'target');
        const funded = [];
        current.traverse(node => {
          if (node instanceof THREE.Mesh) funded.push({ node, matrix: node.matrixWorld.clone(),
            visible: node.visible, materials: (Array.isArray(node.material) ? node.material : [node.material])
              .map(material => ({ material, opacity: material.opacity })) });
        });
        if (landmark.id === 'boss') {
          const palace = target.getObjectByName('OPENING_PALACE');
          let permanentCount = 0;
          palace.traverse(node => { if (node instanceof THREE.Mesh && !node.userData.constructionTemporary) permanentCount++; });
          assert.equal(Object.values(palace.userData.authoredConstruction.stageCounts).reduce((a, b) => a + b, 0), permanentCount);
        }
        const delta = prepareIslandConstructionLevelDelta({ currentRoot: current, targetRoot: target });
        if (landmark.id === 'boss') assert.equal(delta.retainedMeshCount, funded.length, 'all paid-for meshes retained');
        else if (level > 0) assert.ok(delta.retainedMeshCount > 0);
        for (const stage of [1, 2, 3, 4, 5]) {
          assert.ok(delta.stageCounts[stage] > 0);
          if (landmark.id === 'boss') assert.ok(delta.revealParts.some(p => !p.temporary && p.stage === stage), `permanent stage ${stage}`);
        }
        const temporary = delta.revealParts.filter(p => p.temporary);
        assert.equal(temporary.length, 5);
        for (const progress of [0, .2, .5, .8, 1]) {
          delta.applyProgress(progress, { working: false });
          assert.ok(temporary.every(p => !p.mesh.visible));
          delta.applyProgress(progress, { working: true });
          if (progress === 0 || progress === 1) assert.ok(temporary.every(p => !p.mesh.visible));
        }
        assert.ok(delta.revealParts.filter(p => !p.temporary).every(p => p.mesh.visible));
        delta.applyCommissioningScale(1.08);
        delta.applyCommissioningScale(1.08, true);
        for (const part of delta.revealParts.filter(p => !p.temporary)) assert.ok(part.mesh.scale.equals(part.baseScale));
        current.updateWorldMatrix(true, true);
        for (const state of funded) {
          assert.ok(state.node.matrixWorld.equals(state.matrix));
          assert.equal(state.node.visible, state.visible);
          for (const { material, opacity } of state.materials) assert.equal(material.opacity, opacity);
        }
        if (landmark.id === 'boss' && level > 0) {
          const palace = current.getObjectByName('OPENING_PALACE');
          const boundsBefore = new THREE.Box3().setFromObject(palace, true);
          const inventory = () => {
            let meshes = 0, triangles = 0;
            palace.traverse(node => { if (node instanceof THREE.Mesh) {
              meshes++; triangles += (node.geometry.index?.count ?? node.geometry.attributes.position.count) / 3;
            } });
            return { meshes, triangles };
          };
          const before = inventory();
          compactOpeningPalaceParts(palace);
          const after = inventory();
          const boundsAfter = new THREE.Box3().setFromObject(palace, true);
          assert.equal(after.triangles, before.triangles, 'funded batching must not lose surfaces');
          assert.ok(after.meshes < before.meshes / 2, 'funded batching must materially reduce draw calls');
          assert.ok(boundsBefore.min.distanceTo(boundsAfter.min) < 1e-5);
          assert.ok(boundsBefore.max.distanceTo(boundsAfter.max) < 1e-5);
          console.log('FUNDED_BATCHES', level, before, after);
        }
      });
    }
  }
  check('other source worlds retain their boss factory', () => {
    const boss = ISLAND_5_LANDMARKS.find(l => l.id === 'boss');
    for (const world of [2, 5]) assert.ok(!build(boss, 3, undefined, world).getObjectByName('OPENING_PALACE'));
  });
  if (process.argv.includes('--contracts')) {
    const { island5ThreePilotContractTests } = await server.ssrLoadModule('/src/features/gamification/level-worlds/services/__tests__/island5ThreePilotContract.test.ts');
    const contract = island5ThreePilotContractTests.find(test => test.name.startsWith('requires authored five-stage landmark construction across'));
    assert.ok(contract, 'existing cross-world construction regression must be present');
    await contract.run();
    checks++;
    console.log('PASS', contract.name);
  }
  console.log(`${checks} production palace release checks passed`);
} finally { await server.close(); }
