import { createServer } from 'vite';

// CPU-side geometry census. This is not a renderer/FPS or device benchmark.
const server = await createServer({ appType: 'custom', configFile: false,
  cacheDir: '.tmp-palace-profile-cache', optimizeDeps: { noDiscovery: true, include: [] },
  logLevel: 'error', server: { middlewareMode: true, hmr: false } });
try {
  const base = '/src/features/gamification/level-worlds/dev/';
  const { buildLandmark, createPilotMaterials } = await server.ssrLoadModule(base + 'Island5ThreePilot.tsx');
  const { ISLAND_5_LANDMARKS } = await server.ssrLoadModule(base + 'island5ThreePilotContract.ts');
  const { createPalaceBalconyGardenAssembly } = await server.ssrLoadModule(base + 'PalaceBalconyGardenAssembly.ts');
  const census = root => {
    const types = {};
    let triangles = 0;
    root.traverse(node => {
      if (!node.isMesh) return;
      const count = (node.geometry.index?.count ?? node.geometry.attributes.position.count) / 3;
      triangles += count;
      const type = node.geometry.type;
      types[type] = (types[type] ?? 0) + count;
    });
    return { triangles, types };
  };
  for (const quality of ['low', 'medium', 'high']) {
    const materials = createPilotMaterials(quality, 4);
    const landmarks = Object.fromEntries(ISLAND_5_LANDMARKS.map(landmark =>
      [landmark.id, census(buildLandmark(landmark, 3, quality, materials, 4))]));
    const garden = census(createPalaceBalconyGardenAssembly(3, quality, materials.limestoneBright));
    console.log(JSON.stringify({ quality, landmarks, garden }));
  }
} finally { await server.close(); }
