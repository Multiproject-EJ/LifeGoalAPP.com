import { createServer } from 'vite';
import assert from 'node:assert/strict';
const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false, watch: null }, logLevel: 'error' });
try {
  const path = '/src/features/gamification/level-worlds/';
  const { islandRun3DWorldRoutingTests } = await server.ssrLoadModule(path + 'services/__tests__/islandRun3DWorldRouting.test.ts');
  for (const test of islandRun3DWorldRoutingTests) {
    await test.run();
    console.log('PASS', test.name);
  }
  const THREE = await import('three');
  const { createIsland40PlaceholderWorld, buildIsland40PlaceholderLandmark } = await server.ssrLoadModule(path + 'dev/Island40PlaceholderThreeWorld.ts');
  const { ISLAND_5_LANDMARKS } = await server.ssrLoadModule(path + 'dev/island5ThreePilotContract.ts');
  const scene = new THREE.Scene();
  const world = createIsland40PlaceholderWorld(scene);
  assert.equal(world.root.userData.productionStatus, 'placeholder');
  assert.ok(world.root.getObjectByName('PORTAL_FRAME_INACTIVE'));
  assert.equal(world.root.getObjectByName('ISLAND_3D_OCEAN_SURFACE'), undefined);
  const initial = JSON.stringify(world.root.toJSON());
  world.animate(0); world.animate(120);
  assert.equal(JSON.stringify(world.root.toJSON()), initial, 'static scenery supports reduced motion');
  for (const definition of ISLAND_5_LANDMARKS) {
    let previous = new Map();
    for (const level of [0, 1, 2, 3]) {
      const root = buildIsland40PlaceholderLandmark(definition, level);
      assert.deepEqual(root.position.toArray(), [...definition.position], 'canonical landmark anchors');
      const current = new Map();
      root.traverse(part => {
        assert.equal(part.userData.landmarkId, definition.id);
        if (part.isMesh) current.set(part.name, JSON.stringify({ position: part.position, geometry: part.geometry.parameters }));
      });
      for (const [name, shape] of previous) assert.equal(current.get(name), shape, 'funded geometry retained at next level');
      previous = current;
      const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
      assert.ok(size.x <= (definition.id === 'boss' ? 3.7 : 1.9), 'compact landmark envelope');
      assert.ok(size.y < 2.5, 'no oversized tower over the shared route');
      root.traverse(part => { if (part.isMesh) { part.geometry.dispose(); part.material.dispose(); } });
    }
  }
  console.log('PASS five L0–L3 landmark families, additive growth, canonical anchors, static space setting');
} finally {
  await server.close();
}
