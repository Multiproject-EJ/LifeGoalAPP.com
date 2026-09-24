import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server = await createServer({ configFile: false, appType: 'custom', logLevel: 'error', server: { middlewareMode: true, hmr: false } });
try {
  const testModule = await server.ssrLoadModule('/src/features/gamification/level-worlds/services/__tests__/island5ThreePilotContract.test.ts');
  for (const prefix of ['gives Island 005', 'requires authored five-stage']) {
    const test = testModule.island5ThreePilotContractTests.find(test => test.name.startsWith(prefix));
    assert(test, `Missing contract: ${prefix}`); await test.run(); console.log(`PASS ${test.name}`);
  }
  const THREE = await server.ssrLoadModule('three');
  const factory = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island2ThreeWorld.ts');
  const {ISLAND_5_LANDMARKS} = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/island5ThreePilotContract.ts');
  const {prepareIslandConstructionLevelDelta} = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/IslandConstructionLevelDelta.ts');
  const materials = factory.createIsland2WorldMaterials();
  for (const quality of ['low','high']) for (const landmark of ISLAND_5_LANDMARKS.filter(x=>x.id!=='boss')) {
    let previous = null;
    for (const level of [1,2,3]) {
      const current = factory.buildIsland2Landmark(landmark, level, quality, materials, {constructionPreview:'current'});
      if (previous) {
        let previousCount=0; previous.traverse(x=>{if(x.isMesh) previousCount++});
        const target = factory.buildIsland2Landmark(landmark,level,quality,materials,{constructionPreview:'target'});
        const delta=prepareIslandConstructionLevelDelta({currentRoot:previous,targetRoot:target});
        assert.equal(delta.retainedMeshCount,previousCount,`${quality} ${landmark.id} L${level} must retain every funded mesh`);
        assert(delta.additiveMeshCount>0,`${landmark.id} L${level} needs additions`);
      }
      const bounds = new THREE.Box3().setFromObject(current);
      assert(bounds.getSize(new THREE.Vector3()).x<5,`${landmark.id} exceeds plot width`);
      previous=current;
    }
  }
  console.log('PASS Sunshore construction retention, growth and landmark envelopes');
} finally { await server.close(); }
