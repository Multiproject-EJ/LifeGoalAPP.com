import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as THREE from 'three';
import { createServer, transformWithEsbuild } from 'vite';

// A focused development check, not a final visual or release acceptance gate.
const trackedSources = [
  'src/features/gamification/level-worlds/dev/Island2CelestialThreeWorld.ts',
  'src/features/gamification/level-worlds/dev/Island2CelestialV2Batch.ts',
  'src/features/gamification/level-worlds/dev/Island2CelestialV2PlantRuntimeBatch.ts',
  'src/features/gamification/level-worlds/dev/Island2CelestialV2Landmarks.ts',
  'src/features/gamification/level-worlds/dev/Island2CelestialV2Terrain.ts',
  'src/features/gamification/level-worlds/dev/Island2CelestialV2Botany.ts',
  'src/features/gamification/level-worlds/dev/Island2CelestialV2Cloudnest.ts',
  'src/features/gamification/level-worlds/dev/Island2CelestialV2ResolveCourt.ts',
  'src/features/gamification/level-worlds/dev/Island2CelestialV2Archive.ts',
  'src/features/gamification/level-worlds/dev/Island2CelestialV2Gate.ts',
  'src/features/gamification/level-worlds/dev/Island2CelestialV2WaterMaterial.ts',
  'src/features/gamification/level-worlds/dev/Island2CelestialV2Landscape.ts',
  'src/features/gamification/level-worlds/dev/Island2CelestialV2Finish.ts',
  'src/features/gamification/level-worlds/dev/IslandConstructionLevelDelta.ts',
  'src/features/gamification/level-worlds/dev/Island1AnimatedBatches.ts',
  'src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx',
  'src/features/gamification/level-worlds/dev/generated/island002-palace-roof.json',
  'scripts/build-island002-palace-blender.py',
  'docs/visual-references/island-002-celestial-v2/002-source.png',
];
const snapshot = () => Object.fromEntries(trackedSources.map(file => [file,
  createHash('sha256').update(readFileSync(file)).digest('hex'),
]));
const sourceStart = snapshot();
console.log('SOURCE_STATE', JSON.stringify({
  head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  sourceHashes: sourceStart,
  acceptance: 'focused development checks only; geometry may be in progress',
}));
const server = await createServer({
  appType: 'custom', configFile: false, logLevel: 'error',
  server: { middlewareMode: true, hmr: false },
});
const testNameFilters = process.argv.slice(2);
const matchesTest = name => !testNameFilters.length || testNameFilters.some(filter => name.includes(filter));
let passed = 0;
let failed = 0;
async function check(name, run) {
  if (!matchesTest(name)) return;
  const originalConsoleError = console.error;
  console.error = (...args) => {
    originalConsoleError(...args);
    if (args.some(value => typeof value === 'string' && value.includes('mergeGeometries() failed'))) originalConsoleError('MERGE_WARNING_ORIGIN', JSON.stringify({ test: name, stack: new Error('geometry merge diagnostic').stack }));
  };
  try { await run(); passed++; console.log('PASS', name); }
  catch (error) { failed++; console.error('FAIL', name, error.stack ?? error); }
  finally { console.error = originalConsoleError; }
}
const closeVector = (a, b, label) => assert.ok(a.distanceTo(b) < 1e-5, `${label}: ${a.toArray()} != ${b.toArray()}`);
function matrixClose(a, b, label) {
  a.elements.forEach((v, i) => assert.ok(Math.abs(v - b.elements[i]) < 1e-8, `${label} matrix[${i}]`));
}
function worldVertices(mesh) {
  const p = mesh.geometry.attributes.position;
  const index = mesh.geometry.index;
  return Array.from({ length: index?.count ?? p.count }, (_, i) =>
    new THREE.Vector3().fromBufferAttribute(p, index ? index.getX(i) : i).applyMatrix4(mesh.matrixWorld));
}

try {
  const base = '/src/features/gamification/level-worlds/services/__tests__/';
  const suites = [
    ['islandRunSignatureMissions.test.ts', 'islandRunSignatureMissionTests', [
      'Celestial Great Re-Docking advances once per roll and locks platforms at 5, 10, 15, and 20',
      'Celestial Great Re-Docking sanitizes and merges progress monotonically',
    ]],
    ['islandRunMissionTracker.test.ts', 'islandRunMissionTrackerTests', [
      'mission registry aligns every authored production world with its approved header',
      'Celestial tracker keeps the phone compact while showing live platform and landmark progress',
    ]],
    ['island5ThreePilotContract.test.ts', 'island5ThreePilotContractTests', [
      'projects Island 002 re-docking into four presentation-only platforms with tethers, collars, and reduced-motion state',
      'keeps the workbench internal while routing authored actual-3D worlds through the canonical live shell',
      'finishes landmark levels with one bounded pop and reduced-motion-safe sparkle beat',
      // This existing contract covers all five Celestial landmarks at 0->1, 1->2,
      // and 2->3, retained funded geometry, five reveal stages and temporary rigs.
      'requires authored five-stage landmark construction across Islands 002 through 010, 014, 015, 018, 019 and 020',
    ]],
  ];
  for (const [file, exportName, names] of suites) {
    if (!names.some(matchesTest)) continue;
    const module = await server.ssrLoadModule(base + file);
    for (const name of names) {
      await check(name, async () => {
        const test = module[exportName]?.find(candidate => candidate.name === name);
        assert.ok(test, `Required existing test missing: ${file}: ${name}`);
        await test.run();
      });
    }
  }

  await check('Celestial construction reveal synchronizes independent shader opacity clones without mutating source materials', async () => {
    const { prepareIslandConstructionLevelDelta } = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/IslandConstructionLevelDelta.ts');
    const { createCelestialV2Gate } = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island2CelestialV2Gate.ts');
    const { createIsland2CelestialMaterials } = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island2CelestialThreeWorld.ts');
    const palette = createIsland2CelestialMaterials(), gate = createCelestialV2Gate(3, 'low', palette);
    const portal = gate.getObjectByName('GATE_VIOLET_PORTAL_DEPTH_VOLUME');
    assert.ok(portal instanceof THREE.Mesh && portal.material instanceof THREE.ShaderMaterial, 'regression exercises the real Gate vortex material');
    const source = portal.material;
    assert.equal(source.name, 'GATE_DEEP_VIOLET_ASTRAL_VORTEX');
    assert.ok(/uniform\s+float\s+opacity\s*;/.test(source.fragmentShader) && /gl_FragColor\s*=\s*vec4\(color,\s*opacity\)/.test(source.fragmentShader), 'Gate alpha must actually consume the reveal uniform');
    source.opacity = .72; source.uniforms.opacity.value = .72;
    const untouchedSource = { opacity: source.opacity, transparent: source.transparent, depthWrite: source.depthWrite, time: source.uniforms.time.value, uniformOpacity: source.uniforms.opacity.value };
    const stringUniform = new THREE.ShaderMaterial({ uniforms: { opacity: { value: 'authored-opacity' } } });
    const missingUniform = new THREE.ShaderMaterial();
    const roots = [gate], deltas = [];
    try {
      for (let fixtureIndex = 0; fixtureIndex < 2; fixtureIndex++) {
        const root = new THREE.Group(); roots.push(root);
        for (const [name, stage, temporary, material] of [
          ['early-vortex', 1, false, source], ['late-vortex', 5, false, source],
          ['temporary-vortex', 3, true, source], ['mixed-shader-array', 2, false, [source, stringUniform, missingUniform]],
        ]) {
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(.2, .2, .2), material); mesh.name = name;
          mesh.userData.constructionStage = stage; mesh.userData.constructionTemporary = temporary; mesh.position.y = stage * .3; root.add(mesh);
        }
        deltas.push(prepareIslandConstructionLevelDelta({ currentRoot: null, targetRoot: root }));
      }
      const shaderClones = deltas.flatMap(delta => delta.revealParts.flatMap(part => part.materials.filter(material => material.name === source.name)));
      assert.equal(shaderClones.length, 8, 'every staged/temporary/array reference receives its own clone');
      assert.equal(new Set(shaderClones).size, shaderClones.length);
      assert.equal(new Set(shaderClones.map(material => material.uniforms.opacity)).size, shaderClones.length, 'opacity uniform objects do not alias across clones');
      shaderClones.forEach(material => { assert.notEqual(material, source); assert.notEqual(material.uniforms, source.uniforms); assert.equal(material.uniforms.opacity.value, 0, 'initial reveal hides shader pixels'); });
      const verify = delta => delta.revealParts.forEach(part => part.materials.forEach(material => {
        if (material.name === source.name) assert.equal(material.uniforms.opacity.value, material.opacity, `${part.mesh.name}: shader opacity follows material opacity`);
        else if (material.uniforms.opacity) assert.equal(material.uniforms.opacity.value, 'authored-opacity', 'nonnumeric opacity uniforms remain untouched');
        else assert.equal(material.uniforms.opacity, undefined, 'no opacity uniform is manufactured');
      }));
      // Single-material parts are consolidated and renamed into stage batches,
      // even when the stage contains one source mesh. Stage identity survives.
      const early = deltas[0].revealParts.find(part => part.stage === 1 && !part.temporary); assert.ok(early);
      deltas[0].applyProgress(early.threshold, { working: true }); verify(deltas[0]);
      assert.ok(early.materials[0].opacity > 0 && early.materials[0].opacity < .72, 'test observes a partial reveal');
      const fractionalOpacity = early.materials[0].opacity;
      deltas[0].applyProgress(early.threshold, { working: true }); assert.equal(early.materials[0].uniforms.opacity.value, fractionalOpacity, 'same progress is deterministic');
      deltas[1].revealParts.forEach(part => part.materials.filter(material => material.name === source.name).forEach(material => assert.equal(material.uniforms.opacity.value, 0, 'other build remains unrevealed')));
      deltas[0].applyProgress(.8, { working: true }); verify(deltas[0]);
      const temporary = deltas[0].revealParts.find(part => part.temporary); assert.ok(temporary && temporary.materials[0].opacity > 0, 'temporary shader is visible only during construction work');
      deltas[0].applyProgress(.8, { working: false }); verify(deltas[0]); assert.equal(temporary.materials[0].uniforms.opacity.value, 0);
      deltas[1].applyProgress(1); verify(deltas[1]);
      deltas[1].revealParts.filter(part => !part.temporary).forEach(part => part.materials.filter(material => material.name === source.name).forEach(material => assert.equal(material.uniforms.opacity.value, .72, 'completion restores authored opacity')));
      deltas[0].applyProgress(0); verify(deltas[0]);
      assert.deepEqual({ opacity: source.opacity, transparent: source.transparent, depthWrite: source.depthWrite, time: source.uniforms.time.value, uniformOpacity: source.uniforms.opacity.value }, untouchedSource, 'source material is unchanged by independent preview progress/reset');
      assert.equal(stringUniform.uniforms.opacity.value, 'authored-opacity'); assert.equal(missingUniform.uniforms.opacity, undefined);
    } finally {
      const geometries = new Set(), materials = new Set([...Object.values(palette), source, stringUniform, missingUniform]);
      roots.forEach(root => root.traverse(node => { if (node.geometry) geometries.add(node.geometry); if (node.material) (Array.isArray(node.material) ? node.material : [node.material]).forEach(material => materials.add(material)); }));
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
    }
  });

  await check('Celestial instanced route preserves canonical 36 transforms, material identity and landing impacts', async () => {
    const pilot = readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
    const contract = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/island5ThreePilotContract.ts');
    const { TILE_ANCHORS_36 } = await server.ssrLoadModule('/src/features/gamification/level-worlds/services/islandBoardLayout.ts');
    const section = (start, end) => {
      const begin = pilot.indexOf(start), finish = pilot.indexOf(end, begin + start.length);
      assert.ok(begin >= 0 && finish > begin, `live route harness boundaries missing: ${start}`);
      return pilot.slice(begin, finish);
    };
    // Execute the actual local source blocks, not a second implementation of the
    // batching rules. Extraction fails closed if the production boundaries move.
    const geometryCode = section('function createRadialTileGeometry(', 'function createTileBorderMeshGeometry(');
    const creationCode = section('    const sharedTileTransforms = buildIsland5TileTransforms(TILE_ANCHORS_36);', '    const rootheartTileDetails =');
    const impactCode = section('      for (const [tileIndex, impact] of activeTileImpacts) {', '      if (!activeTokenMotion && activeTokenSettle) {');
    const flags = Object.fromEntries([...new Set((creationCode + impactCode).match(/\bis[A-Z]\w*/g))].map(name => [name, name === 'isCelestialSkyKingdom']));
    const context = {
      ...flags, THREE, TILE_ANCHORS_36,
      buildIsland5TileTransforms: contract.buildIsland5TileTransforms,
      buildIsland3DRadialTileMeshData: contract.buildIsland3DRadialTileMeshData,
      getIsland3DTileImpactPose: contract.getIsland3DTileImpactPose,
      ISLAND_3D_TILE_IMPACT_DURATION_MS: contract.ISLAND_3D_TILE_IMPACT_DURATION_MS,
      scene: new THREE.Scene(), sceneUsesRealtimeShadows: false, island19CircuitGBoard: null,
    };
    const source = geometryCode + creationCode + `
      return { tileTransforms, tileMeshes, instancedTileMeshes, tileMaterials, tileGeometry,
        applyImpacts: (activeTileImpacts, now) => { ${impactCode} }
      };`;
    const transformed = await transformWithEsbuild(source, 'island002-route-harness.ts', { loader: 'ts', target: 'es2022' });
    const state = new Function(...Object.keys(context), transformed.code)(...Object.values(context));
    try {
      const canonical = contract.buildIsland5TileTransforms(TILE_ANCHORS_36);
      assert.deepEqual(state.tileTransforms, canonical, 'world2 must use unchanged canonical positions and rotations');
      assert.equal(state.tileMeshes.size, 36); assert.equal(state.instancedTileMeshes.length, 3);
      assert.equal(state.instancedTileMeshes.reduce((sum, mesh) => sum + mesh.count, 0), 36);
      assert.equal(state.tileGeometry.name, 'ISLAND_SHARED_RADIAL_TILE_TRAPEZOID');
      assert.deepEqual(state.tileMaterials.map(material => material.color.getHex()), [0xf6f0dc, 0x7eb5e6, 0xe9c35e]);
      assert.equal(canonical.filter(tile => tile.isKeyTile).length, 6);
      const before = new Map(), assignments = new Set();
      function nearMatrix(actual, expected, label) {
        actual.elements.forEach((value, i) => assert.ok(Math.abs(value - expected.elements[i]) < 1e-6, `${label} matrix[${i}]`));
      }
      for (const tile of canonical) {
        const entry = state.tileMeshes.get(tile.index), materialIndex = tile.isKeyTile ? 2 : tile.index % 2;
        assert.equal(entry.mesh, state.instancedTileMeshes[materialIndex]);
        assert.equal(entry.mesh.material, state.tileMaterials[materialIndex]);
        assert.equal(entry.mesh.geometry, state.tileGeometry);
        assert.equal(entry.mesh.instanceMatrix.usage, THREE.DynamicDrawUsage);
        const assignment = `${materialIndex}/${entry.instanceId}`;
        assert.ok(!assignments.has(assignment), `duplicate instance slot ${assignment}`); assignments.add(assignment);
        const expected = new THREE.Matrix4().compose(new THREE.Vector3(...tile.position), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), tile.rotationYRad), new THREE.Vector3(1, 1, 1));
        const actual = new THREE.Matrix4(); entry.mesh.getMatrixAt(entry.instanceId, actual);
        nearMatrix(actual, expected, `canonical tile ${tile.index}`); before.set(tile.index, actual.clone());
      }
      const selected = [canonical.find(tile => tile.isKeyTile), canonical.find(tile => !tile.isKeyTile)];
      const active = new Map(selected.map(tile => [tile.index, { startedAt: 1000, strength: 1.35 }]));
      const versions = state.instancedTileMeshes.map(mesh => mesh.instanceMatrix.version);
      state.applyImpacts(active, 1076);
      const pose = contract.getIsland3DTileImpactPose(76, 1.35);
      assert.ok(Math.abs(pose.scaleY - 1) > .001 || Math.abs(pose.yOffset) > .001, 'chosen sample must exercise a visible impact');
      for (const tile of canonical) {
        const entry = state.tileMeshes.get(tile.index), actual = new THREE.Matrix4(); entry.mesh.getMatrixAt(entry.instanceId, actual);
        if (active.has(tile.index)) {
          const expected = new THREE.Matrix4().compose(new THREE.Vector3(...tile.position).add(new THREE.Vector3(0, pose.yOffset, 0)), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), tile.rotationYRad), new THREE.Vector3(pose.scaleXZ, pose.scaleY, pose.scaleXZ));
          nearMatrix(actual, expected, `impact tile ${tile.index}`);
          const batchIndex = state.instancedTileMeshes.indexOf(entry.mesh);
          assert.ok(entry.mesh.instanceMatrix.version > versions[batchIndex], 'impact uploads the changed GPU instance buffer');
        } else nearMatrix(actual, before.get(tile.index), `unaffected tile ${tile.index}`);
      }
      state.applyImpacts(active, 1000 + contract.ISLAND_3D_TILE_IMPACT_DURATION_MS);
      assert.equal(active.size, 0, 'completed impacts leave no active entries');
      for (const tile of canonical) {
        const entry = state.tileMeshes.get(tile.index), actual = new THREE.Matrix4(); entry.mesh.getMatrixAt(entry.instanceId, actual);
        nearMatrix(actual, before.get(tile.index), `restored tile ${tile.index}`);
      }
    } finally { state.tileGeometry.dispose(); state.tileMaterials.forEach(material => material.dispose()); }
  });

  await check('Blender palace export has finite geometry, valid triangles and explicit Y-up provenance', () => {
    const packet = JSON.parse(readFileSync('src/features/gamification/level-worlds/dev/generated/island002-palace-roof.json', 'utf8'));
    assert.equal(packet.schemaVersion, 1);
    assert.equal(packet.family, 'blender-continuous-roof-and-keep');
    assert.equal(packet.coordinateSystem, 'Three.js right-handed Y up; palace local +Z arrival');
    assert.equal(packet.sourceSha256, createHash('sha256').update(readFileSync('docs/visual-references/island-002-celestial-v2/002-source.png')).digest('hex'), 'packet must cite the admitted reference bytes');
    assert.match(packet.authoredIn, /^\d+\.\d+/, 'Blender authoring version is required');
    assert.ok(Array.isArray(packet.parts) && packet.parts.length > 0);
    const names = new Set(), extent = new THREE.Box3();
    const materialKeys = new Set(['ivory', 'ivoryShade', 'gold', 'sapphire', 'sapphireLight', 'warmGlow', 'crystal', 'cyanCrystal', 'wood', 'paper', 'grass', 'grassLight', 'water', 'cloud', 'egg', 'eggSpot', 'banner', 'flower', 'cliff', 'cliffLight']);
    for (const part of packet.parts) {
      assert.ok(typeof part.name === 'string' && part.name.startsWith('PALACE_BLENDER_') && !names.has(part.name), `invalid or repeated authored part name: ${part.name}`); names.add(part.name);
      assert.ok([1, 2, 3].includes(part.phase), `${part.name}: funded phase`);
      assert.ok(Number.isInteger(part.stage) && part.stage >= 1 && part.stage <= 5, `${part.name}: construction stage`);
      assert.ok(materialKeys.has(part.material), `${part.name}: material key ${part.material}`);
      for (const key of ['position', 'normal', 'uv', 'index']) assert.ok(Array.isArray(part[key]) && part[key].length > 0 && part[key].every(Number.isFinite), `${part.name}: finite nonempty ${key}`);
      assert.equal(part.position.length % 3, 0); const vertices = part.position.length / 3;
      assert.equal(part.normal.length, part.position.length); assert.equal(part.uv.length, vertices * 2);
      assert.equal(part.index.length % 3, 0);
      assert.ok(part.index.every(index => Number.isInteger(index) && index >= 0 && index < vertices), `${part.name}: index outside vertex buffer`);
      for (let i = 0; i < vertices; i++) {
        const normal = new THREE.Vector3().fromArray(part.normal, i * 3);
        assert.ok(Math.abs(normal.length() - 1) < 1e-5, `${part.name}: normal ${i} must be unit length`);
        extent.expandByPoint(new THREE.Vector3().fromArray(part.position, i * 3));
      }
      for (let i = 0; i < part.index.length; i += 3) {
        const a = new THREE.Vector3().fromArray(part.position, part.index[i] * 3);
        const b = new THREE.Vector3().fromArray(part.position, part.index[i + 1] * 3);
        const c = new THREE.Vector3().fromArray(part.position, part.index[i + 2] * 3);
        const face = b.sub(a).cross(c.sub(a));
        assert.ok(face.lengthSq() > 1e-16, `${part.name}: degenerate triangle ${i / 3}`);
        const normal = new THREE.Vector3().fromArray(part.normal, part.index[i] * 3);
        assert.ok(face.normalize().dot(normal) > .9, `${part.name}: triangle winding contradicts exported normal after coordinate conversion`);
      }
    }
    assert.ok(extent.max.y > 2 && extent.min.y > -.1, 'palace export height must lie above Y-up floor in palace-local units');
  });

  async function verifyFundedFactory(modulePath, exportName) {
    const createLandmark = (await server.ssrLoadModule(modulePath))[exportName];
    const { createIsland2CelestialMaterials } = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island2CelestialThreeWorld.ts');
    const materials = createIsland2CelestialMaterials();
    const roots = [];
    function meshRecords(root) {
      root.updateWorldMatrix(true, true);
      const inverse = root.matrixWorld.clone().invert(), records = new Map();
      root.traverse(mesh => {
        if (!(mesh instanceof THREE.Mesh)) return;
        assert.ok(mesh.name && !records.has(mesh.name), `stable unique landmark mesh name required: ${mesh.name}`);
        const hash = createHash('sha256');
        for (const name of Object.keys(mesh.geometry.attributes).sort()) {
          const attribute = mesh.geometry.attributes[name];
          assert.ok(!attribute.isInterleavedBufferAttribute, 'authored landmark evidence expects explicit vertex buffers');
          hash.update(JSON.stringify({ name, itemSize: attribute.itemSize, normalized: attribute.normalized, type: attribute.array.constructor.name }));
          hash.update(Buffer.from(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength));
        }
        if (mesh.geometry.index) {
          const array = mesh.geometry.index.array;
          hash.update(array.constructor.name); hash.update(Buffer.from(array.buffer, array.byteOffset, array.byteLength));
        }
        if (mesh instanceof THREE.InstancedMesh) {
          hash.update(JSON.stringify({ count: mesh.count }));
          for (const attribute of [mesh.instanceMatrix, mesh.instanceColor].filter(Boolean)) hash.update(Buffer.from(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength));
        }
        hash.update(JSON.stringify(inverse.clone().multiply(mesh.matrixWorld).elements));
        records.set(mesh.name, { mesh, signature: hash.digest('hex') });
      });
      return records;
    }
    try {
      for (const quality of ['low', 'medium', 'high']) {
        const levels = [1, 2, 3].map(level => {
          const root = createLandmark(level, quality, materials); roots.push(root); return meshRecords(root);
        });
        for (let lower = 0; lower < 2; lower++) {
          assert.ok(levels[lower].size > 0 && levels[lower + 1].size > levels[lower].size, `${quality}: each higher level adds authored parts`);
          for (const [name, record] of levels[lower]) {
            const next = levels[lower + 1].get(name); assert.ok(next, `${quality}: funded mesh vanished at L${lower + 2}: ${name}`);
            assert.equal(next.signature, record.signature, `${quality}: funded vertex data or local transform changed: ${name}`);
            assert.notEqual(next.mesh.geometry, record.mesh.geometry, `${quality}: independently built levels share disposable geometry: ${name}`);
            for (const attribute of Object.keys(record.mesh.geometry.attributes)) assert.notEqual(next.mesh.geometry.attributes[attribute].array.buffer, record.mesh.geometry.attributes[attribute].array.buffer, `${quality}: separately built levels share ${attribute} backing buffer: ${name}`);
            if (record.mesh instanceof THREE.InstancedMesh) assert.notEqual(next.mesh.instanceMatrix.array.buffer, record.mesh.instanceMatrix.array.buffer, `${quality}: independently built instance buffers alias: ${name}`);
            if (record.mesh.geometry.index) assert.notEqual(next.mesh.geometry.index.array.buffer, record.mesh.geometry.index.array.buffer, `${quality}: independently built index buffers alias: ${name}`);
          }
        }
        const repeatedRoot = createLandmark(3, quality, materials); roots.push(repeatedRoot); const repeated = meshRecords(repeatedRoot);
        assert.equal(repeated.size, levels[2].size);
        const geometrySet = new Set([...levels[2].values()].map(record => record.mesh.geometry));
        for (const [name, record] of repeated) {
          assert.equal(record.signature, levels[2].get(name)?.signature, `${quality}: deterministic rebuild changed ${name}`);
          assert.ok(!geometrySet.has(record.mesh.geometry), `${quality}: new build reuses existing disposable geometry`);
          const original = levels[2].get(name).mesh.geometry;
          for (const attribute of Object.keys(original.attributes)) assert.notEqual(record.mesh.geometry.attributes[attribute].array.buffer, original.attributes[attribute].array.buffer, `${quality}: repeated L3 build aliases ${attribute} backing buffer: ${name}`);
          if (record.mesh instanceof THREE.InstancedMesh) assert.notEqual(record.mesh.instanceMatrix.array.buffer, levels[2].get(name).mesh.instanceMatrix.array.buffer, `${quality}: repeated L3 instance buffers alias: ${name}`);
          if (original.index) assert.notEqual(record.mesh.geometry.index.array.buffer, original.index.array.buffer, `${quality}: repeated L3 index backing buffer aliases: ${name}`);
        }
      }
    } finally {
      const geometries = new Set(); roots.forEach(root => root.traverse(mesh => { if (mesh instanceof THREE.Mesh) geometries.add(mesh.geometry); }));
      geometries.forEach(geometry => geometry.dispose()); Object.values(materials).forEach(material => material.dispose());
    }
  }
  await check('Blender palace retains exact funded vertex buffers and transforms across levels with independent build ownership', () => verifyFundedFactory('/src/features/gamification/level-worlds/dev/Island2CelestialV2Landmarks.ts', 'createCelestialV2Palace'));
  await check('Cloudnest retains exact funded geometry, instance transforms and independent buffers across levels', () => verifyFundedFactory('/src/features/gamification/level-worlds/dev/Island2CelestialV2Cloudnest.ts', 'createCelestialV2Cloudnest'));
  await check('Resolve Court retains exact funded geometry, instance transforms and independent buffers across levels', () => verifyFundedFactory('/src/features/gamification/level-worlds/dev/Island2CelestialV2ResolveCourt.ts', 'createCelestialV2ResolveCourt'));
  await check('Archive retains exact funded geometry, instance transforms and independent buffers across levels', () => verifyFundedFactory('/src/features/gamification/level-worlds/dev/Island2CelestialV2Archive.ts', 'createCelestialV2Archive'));
  await check('Gate retains exact funded geometry, instance transforms and independent buffers across levels', () => verifyFundedFactory('/src/features/gamification/level-worlds/dev/Island2CelestialV2Gate.ts', 'createCelestialV2Gate'));

  await check('Celestial assembled entrances emerge above meadow while foundations remain grounded at every funded level', async () => {
    const { buildIsland2CelestialLandmark, createIsland2CelestialMaterials } = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island2CelestialThreeWorld.ts');
    const { ISLAND_5_LANDMARKS } = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/island5ThreePilotContract.ts');
    const materials = createIsland2CelestialMaterials(), roots = [], measurements = [];
    const families = {
      boss: [/^PALACE_GRAND_STAIR_\d+$/, 'PALACE_LOWER_COURT', 7],
      hatchery: [/^CLOUDNEST_ENTRANCE_STEP_\d+$/, 'CLOUDNEST_GARDEN_FOUNDATION', 6],
      habit: [/^RESOLVE_ARRIVAL_STEP_\d+$/, 'RESOLVE_LOWER_FOUNDATION', 7],
      wisdom: [/^ARCHIVE_ARRIVAL_STAIR_\d+$/, 'ARCHIVE_FOUNDATION', 6],
      event: [/^GATE_BROAD_ARRIVAL_STAIR_\d+$/, 'GATE_BROAD_FOUNDATION', 6],
    };
    const bounds = (mesh, start = 0, count = mesh.geometry.attributes.position.count) => {
      const position = mesh.geometry.attributes.position;
      let min = Infinity, max = -Infinity;
      for (let vertex = start; vertex < start + count; vertex++) {
        const y = new THREE.Vector3().fromBufferAttribute(position, vertex).applyMatrix4(mesh.matrixWorld).y;
        assert.ok(Number.isFinite(y), 'finite assembled entrance vertices'); min = Math.min(min, y); max = Math.max(max, y);
      }
      return { min, max };
    };
    try {
      for (const quality of ['low', 'medium', 'high']) for (const definition of ISLAND_5_LANDMARKS) {
        let baseline;
        for (const level of [1, 2, 3]) {
          const reference = buildIsland2CelestialLandmark(definition, level, quality, materials, { constructionPreview: 'current' });
          const assembled = buildIsland2CelestialLandmark(definition, level, quality, materials);
          roots.push(reference, assembled); reference.updateWorldMatrix(true, true); assembled.updateWorldMatrix(true, true);
          const [pattern, foundationName, expectedCount] = families[definition.id];
          const stairs = []; reference.traverse(node => { if (node instanceof THREE.Mesh && pattern.test(node.name)) stairs.push(node); });
          assert.equal(stairs.length, expectedCount, `${definition.id}: all named entrance treads present`);
          const pieces = [...stairs, reference.getObjectByName(foundationName)];
          assert.ok(pieces.every(node => node instanceof THREE.Mesh), 'foundation must retain measurable authored geometry');
          const heights = pieces.map(source => {
            const anchor = assembled.getObjectByName(source.name); assert.ok(anchor, `${source.name}: assembled semantic anchor missing`);
            matrixClose(anchor.matrixWorld, source.matrixWorld, `${source.name}: board/preview assembly transforms agree`);
            let measured;
            if (anchor instanceof THREE.Mesh) measured = bounds(anchor);
            else {
              const batch = assembled.getObjectByName(anchor.userData.batchedInto);
              assert.ok(batch instanceof THREE.Mesh && Array.isArray(batch.userData.sourceNames), `${source.name}: actual render batch required`);
              let offset = 0;
              for (const name of batch.userData.sourceNames) {
                if (name === source.name) break;
                const prior = reference.getObjectByName(name);
                assert.ok(prior instanceof THREE.Mesh, `${name}: batch range must map to authored source`);
                offset += prior.geometry.index?.count ?? prior.geometry.attributes.position.count;
              }
              assert.ok(batch.userData.sourceNames.includes(source.name), `${source.name}: render batch mapping missing`);
              measured = bounds(batch, offset, source.geometry.index?.count ?? source.geometry.attributes.position.count);
            }
            const authored = bounds(source);
            assert.ok(Math.abs(measured.min - authored.min) < 1e-6 && Math.abs(measured.max - authored.max) < 1e-6, `${source.name}: rendered vertices and preview heights disagree`);
            return { name: source.name, ...measured };
          });
          const label = `${quality}/${definition.id}/L${level}`, treads = heights.slice(0, -1), foundation = heights.at(-1);
          const lowestBottom = Math.min(...treads.map(step => step.min)), lowestTop = Math.min(...treads.map(step => step.max));
          measurements.push({ label, treadCount: treads.length, lowestBottom, lowestTop, foundation });
          assert.ok(treads.every(step => step.max > .36 + 1e-5), `${label}: a stair tread is buried under meadow .36`);
          assert.ok(lowestBottom >= .36 - 1e-5 && lowestBottom <= .43 + 1e-5, `${label}: lowest stair bottom ${lowestBottom} must meet meadow without >.07 gap`);
          assert.ok(foundation.min < .36 && foundation.max <= lowestBottom + 1e-6, `${label}: foundation must be buried below entrance contact`);
          assert.ok((.36 - foundation.min) / (foundation.max - foundation.min) >= .8, `${label}: at least80% of the foundation must be buried`);
          if (baseline) heights.forEach((height, i) => {
            assert.equal(height.name, baseline[i].name);
            assert.ok(Math.abs(height.min - baseline[i].min) < 1e-6 && Math.abs(height.max - baseline[i].max) < 1e-6, `${label}: funded entrance height changed`);
          });
          baseline = heights;
        }
      }
    } finally {
      console.log('CELESTIAL_ENTRANCE_HEIGHTS', JSON.stringify(measurements));
      const geometries = new Set(); roots.forEach(root => root.traverse(node => { if (node instanceof THREE.Mesh) geometries.add(node.geometry); }));
      geometries.forEach(geometry => geometry.dispose()); Object.values(materials).forEach(material => material.dispose());
    }
  });

  await check('Celestial terrain has finite nondegenerate surfaces below unchanged meadow caps at all qualities', async () => {
    const { createCelestialSkyRoot } = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island2CelestialV2Terrain.ts');
    const { createIsland2CelestialMaterials } = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island2CelestialThreeWorld.ts');
    const materials = createIsland2CelestialMaterials();
    // Actual authored main, four satellite and six distant shape inputs. Geometry
    // assertions read the returned surfaces, not the SDF/column formula.
    const presets = [
      { name: 'main', radius: 6.18, depth: 9.2, seed: .3, top: .36 },
      ...[[2.5, 5.3], [2.32, 4.7], [2.46, 5.5], [2.27, 4.9]].map(([radius, depth], i) => ({ name: `satellite-${i + 1}`, radius, depth, seed: i + 1.2, top: .36 })),
      ...[[.72, 1.42], [1.05, 2.2], [.84, 1.74], [1.22, 2.55], [.62, 1.18], [.94, 1.92]].map(([radius, depth], i) => ({ name: `distant-${i + 1}`, radius, depth, seed: i + .8, top: .06 })),
    ];
    let surfaces = 0, triangles = 0;
    const degenerateTriangles = [];
    try {
      for (const quality of ['low', 'medium', 'high']) for (const preset of presets) {
        const root = createCelestialSkyRoot(preset.radius, preset.depth, preset.seed, quality, materials, preset.top);
        const label = `${quality}/${preset.name}`;
        try {
          assert.equal(root.userData.skyRootTop, preset.top, `${label}: authored cap height metadata`);
          const rock = root.getObjectByName('CELESTIAL_V2_INTERLOCKING_CLIFF_VOLUME');
          const cap = root.getObjectByName('CELESTIAL_V2_ATTACHED_MEADOW_CAP');
          assert.ok(rock instanceof THREE.Mesh && cap instanceof THREE.Mesh, `${label}: separate named cliff/cap geometry`);
          root.updateWorldMatrix(true, true); const inverse = root.matrixWorld.clone().invert();
          for (const [kind, mesh] of [['rock', rock], ['cap', cap]]) {
            const geometry = mesh.geometry, position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
            assert.ok(position && position.count > 0 && normal && normal.count === position.count, `${label}/${kind}: complete vertex and normal arrays`);
            for (const [name, attribute] of Object.entries(geometry.attributes)) assert.ok(Array.from(attribute.array).every(Number.isFinite), `${label}/${kind}: nonfinite ${name}`);
            const matrix = inverse.clone().multiply(mesh.matrixWorld);
            let maxY = -Infinity, minY = Infinity;
            for (let i = 0; i < position.count; i++) {
              const y = new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(matrix).y;
              maxY = Math.max(maxY, y); minY = Math.min(minY, y);
            }
            if (kind === 'rock') {
              assert.ok(maxY <= root.userData.skyRootTop - .05 + 1e-6, `${label}: cliff rises above cap underside, maxY=${maxY}`);
              assert.ok(minY < preset.top - preset.depth * .5, `${label}: extracted root must retain real vertical depth`);
            } else {
              assert.ok(Math.abs(maxY - preset.top) < 1e-6, `${label}: grass cap height changed, maxY=${maxY}`);
              assert.ok(Math.abs(minY - (preset.top - .055)) < 1e-6, `${label}: grass skirt underside moved`);
            }
            const index = geometry.index, count = index?.count ?? position.count;
            assert.equal(count % 3, 0, `${label}/${kind}: complete triangles`);
            for (let i = 0; i < count; i += 3) {
              const ids = [i, i + 1, i + 2].map(offset => index ? index.getX(offset) : offset);
              assert.ok(ids.every(id => Number.isInteger(id) && id >= 0 && id < position.count), `${label}/${kind}: invalid triangle index`);
              const [a, b, c] = ids.map(id => new THREE.Vector3().fromBufferAttribute(position, id));
              const ab = b.clone().sub(a), ac = c.clone().sub(a);
              const areaSquared = ab.clone().cross(ac).lengthSq();
              // Reject collinear/duplicate vertices independently of world scale.
              // A tiny, well-shaped MarchingCubes triangle is not degenerate.
              const collinearityLimit = Number.EPSILON * ab.lengthSq() * ac.lengthSq();
              if (areaSquared <= collinearityLimit) degenerateTriangles.push({ surface: `${label}/${kind}`, triangle: i / 3, areaSquared, collinearityLimit, vertices: [a.toArray(), b.toArray(), c.toArray()] });
              triangles++;
            }
            surfaces++;
          }
        } finally { root.traverse(mesh => { if (mesh instanceof THREE.Mesh) mesh.geometry.dispose(); }); }
      }
      assert.equal(surfaces, 66, 'all 11 presets × 3 quality tiers × cliff/cap surfaces were inspected');
      console.log('TERRAIN_GEOMETRY_CHECK', JSON.stringify({ presets: presets.length, qualities: 3, surfaces, triangles, degenerateTriangles }));
      assert.equal(degenerateTriangles.length, 0, `${degenerateTriangles.length} degenerate terrain triangles; see measured vertex evidence`);
    } finally { Object.values(materials).forEach(material => material.dispose()); }
  });

  const celestial = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island2CelestialThreeWorld.ts');
  const { ISLAND_3D_QUALITY_PROFILES } = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/island5ThreePilotContract.ts');
  const presentation = rolls => ({ completedRolls: rolls, targetRolls: 20, dockedPlatformCount: Math.floor(rolls / 5) });
  const runtimeFixtures = [];
  function fixture(quality = 'low') {
    const scene = new THREE.Scene();
    const materials = celestial.createIsland2CelestialMaterials();
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial()); scene.add(ocean);
    const runtime = celestial.createIsland2CelestialLivingAmbience(scene, ISLAND_3D_QUALITY_PROFILES[quality], materials, ocean);
    const platforms = [1, 2, 3, 4].map(i => runtime.root.getObjectByName(`ISLAND_2_REDOCKING_PLATFORM_${i}`));
    const collars = [1, 2, 3, 4].map(i => runtime.root.getObjectByName(`ISLAND_2_DOCKING_COLLAR_${i}`));
    assert.ok(platforms.every(Boolean) && collars.every(Boolean), 'four named platforms and collars are required');
    const landmarks = ['hatchery', 'habit', 'wisdom', 'event'].map((id, i) => {
      const landmark = new THREE.Group(); landmark.position.set(platforms[i].userData.redockingBaseX, 1.3, platforms[i].userData.redockingBaseZ);
      scene.add(landmark); runtime.registerRedockingLandmark(id, landmark); return landmark;
    });
    const petals = runtime.root.getObjectByName('ISLAND_2_DRIFTING_GARDEN_PETALS');
    assert.ok(petals instanceof THREE.Points, 'named garden petals are required');
    const value = { scene, runtime, platforms, collars, landmarks, petals, materials }; runtimeFixtures.push(value); return value;
  }
  function expectedPlatform(platform, offset) {
    const x = platform.userData.redockingBaseX, z = platform.userData.redockingBaseZ;
    return new THREE.Vector3(x, 0, z).addScaledVector(new THREE.Vector3(x, 0, z).normalize(), offset);
  }
  function assertSnapped(state, rolls) {
    state.platforms.forEach((platform, i) => {
      const offset = 2.75 * (1 - Math.max(0, Math.min(1, (rolls - i * 5) / 5)));
      closeVector(platform.position, expectedPlatform(platform, offset), `roll ${rolls} platform ${i}`);
      closeVector(state.landmarks[i].position, expectedPlatform(platform, offset).setY(1.3), `roll ${rolls} visual landmark ${i}`);
    });
  }
  function assertNoPulse(state, docked) {
    state.collars.forEach((collar, i) => {
      closeVector(collar.scale, new THREE.Vector3(1, 1, 1), `collar ${i} reset scale`);
      assert.ok(Math.abs(collar.material.emissiveIntensity - (i < docked ? .72 : .16)) < 1e-8, `collar ${i} reset emissive`);
      assert.ok(Math.abs(collar.material.opacity - (i < docked ? .82 : .25)) < 1e-8, `collar ${i} reset opacity`);
    });
  }
  try {
    await check('Gate environmental plants keep every rendered vertex and instance outside the landmark clearing', async () => {
      const { CELESTIAL_GATE_FOOTPRINT_RADIUS } = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island2CelestialV2Gate.ts');
      const { addCelestialV2Gardens } = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island2CelestialV2Landscape.ts');
      const batching = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island2CelestialV2Batch.ts');
      const clearing = CELESTIAL_GATE_FOOTPRINT_RADIUS * 1.06 + .085;
      assert.ok(clearing > 1.5, 'clearing must cover the full authored Gate terrace');
      const measurements = [];
      for (const quality of ['low', 'medium', 'high']) {
        const state = fixture(quality); state.runtime.updateRedocking(presentation(20), true); state.scene.updateWorldMatrix(true, true);
        const platform = state.platforms[3], liveGarden = platform.getObjectByName('CELESTIAL_V2_DISTRICT_GARDENS_4.2');
        assert.ok(liveGarden, 'Gate garden remains owned by the fourth docking platform');
        const plantedRoots = liveGarden.children.filter(node => /^(CELESTIAL_TREE_|CELESTIAL_PLANT_)/.test(node.name));
        assert.ok(plantedRoots.length >= 8, 'nonempty tree and shrub/flower coverage');
        for (const plant of plantedRoots) {
          assert.equal(plant.userData.landmarkClearingRadius, clearing, `${quality}/${plant.name}: assembled clearing wiring`);
          const base = plant.getWorldPosition(new THREE.Vector3()).applyMatrix4(platform.matrixWorld.clone().invert());
          assert.ok(Math.abs(base.y - .36) < 1e-6, `${quality}/${plant.name}: scaled plant remains rooted on meadow`);
        }
        // Inspect all real generated botanical surfaces, including vines and
        // separate blossoms, before and after the same platform batching passes.
        // Isolating the garden avoids treating its neighbouring cliff as a plant.
        const owner = new THREE.Group(); owner.name = 'GATE_GARDEN_CLEARANCE_PROBE';
        owner.position.set(3, .2, -4); owner.rotation.y = .37;
        const garden = addCelestialV2Gardens(owner, { role: 'district', radius: 2.27, depth: 4.9, seed: 4.2,
          outward: Math.atan2(platform.userData.redockingBaseZ, platform.userData.redockingBaseX), clearingRadius: clearing }, quality, state.materials);
        assert.equal(garden.children.filter(node => /^(CELESTIAL_TREE_|CELESTIAL_PLANT_)/.test(node.name)).length, plantedRoots.length);
        // These are the assembled renderer's main-garden instances, whose
        // cross-island overlap originally survived the district-only clearing.
        const mainGarden = state.runtime.root.getObjectByName('CELESTIAL_V2_MAIN_GARDENS_0.3');
        assert.ok(mainGarden);
        const mainAnchors = []; mainGarden.traverse(node => { if (node.userData.instanceCount) mainAnchors.push(node); });
        assert.ok(mainAnchors.length > 5, 'inspect real batched main planting, not an empty admission result');
        let mainVertices = 0, mainMinimumRadius = Infinity, mainWorst = '';
        for (const anchor of mainAnchors) {
          const batch = state.runtime.root.getObjectByName(anchor.userData.batchedInto);
          assert.ok(batch instanceof THREE.InstancedMesh, `${anchor.name}: actual botanical batch exists`);
          const position = batch.geometry.getAttribute('position');
          for (let i = anchor.userData.instanceOffset; i < anchor.userData.instanceOffset + anchor.userData.instanceCount; i++) {
            const instance = new THREE.Matrix4(); batch.getMatrixAt(i, instance);
            const matrix = batch.matrixWorld.clone().multiply(instance);
            for (let j = 0; j < position.count; j++) {
              const point = new THREE.Vector3().fromBufferAttribute(position, j).applyMatrix4(matrix);
              assert.ok(point.toArray().every(Number.isFinite)); mainVertices++;
              if (point.y < .5) continue; // raised landing overlap diagnosed at y >= .5
              const radius = Math.hypot(point.x - platform.position.x, point.z - platform.position.z);
              if (radius < mainMinimumRadius) { mainMinimumRadius = radius; mainWorst = anchor.name; }
            }
          }
        }
        measurements.push({ quality, phase: 'assembled-main-above-landing', vertices: mainVertices, minimumRadius: mainMinimumRadius, clearing, worstName: mainWorst });
        assert.ok(mainVertices > 1000);
        assert.ok(mainMinimumRadius >= clearing - 1e-5, `${quality}/${mainWorst}: main planting radius ${mainMinimumRadius} obstructs Gate clearing ${clearing}`);
        const ownedGeometries = new Set();
        const inspect = phase => {
          owner.updateWorldMatrix(true, true); const inverse = owner.matrixWorld.clone().invert();
          let vertices = 0, instances = 0, minimumRadius = Infinity, worstName = '';
          owner.traverse(mesh => {
            if (!(mesh instanceof THREE.Mesh)) return;
            ownedGeometries.add(mesh.geometry);
            const position = mesh.geometry.getAttribute('position'), count = mesh instanceof THREE.InstancedMesh ? mesh.count : 1;
            if (mesh instanceof THREE.InstancedMesh) instances += count;
            for (let instance = 0; instance < count; instance++) {
              const matrix = inverse.clone().multiply(mesh.matrixWorld);
              if (mesh instanceof THREE.InstancedMesh) { const local = new THREE.Matrix4(); mesh.getMatrixAt(instance, local); matrix.multiply(local); }
              for (let i = 0; i < position.count; i++) {
                const point = new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(matrix), radius = Math.hypot(point.x, point.z);
                assert.ok(point.toArray().every(Number.isFinite), `${quality}/${mesh.name}: finite actual vertex`);
                // Hanging cliff vines below the meadow cannot obstruct the terrace.
                if (point.y >= .36 && radius < minimumRadius) { minimumRadius = radius; worstName = mesh.name; }
                vertices++;
              }
            }
          });
          measurements.push({ quality, phase, vertices, instances, minimumRadius, clearing, worstName });
          assert.ok(vertices > 100 && instances > 0, 'actual mesh and instance surfaces inspected');
          assert.ok(minimumRadius >= clearing - 1e-5, `${quality}/${phase}/${worstName}: plant radius ${minimumRadius} intrudes into clearing ${clearing}`);
        };
        try { inspect('authored'); batching.batchCelestialPlantInstances(owner); batching.batchCelestialStatic(owner); inspect('batched'); }
        finally { ownedGeometries.forEach(geometry => geometry.dispose()); }
      }
      console.log('GATE_PLANT_CLEARANCE', JSON.stringify(measurements));
    });

    await check('Celestial landscape retains grounded gardens and five owned connected finite waterways clear of the route', async () => {
      const { addCelestialV2Waterways } = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island2CelestialV2Landscape.ts');
      const { resolveIsland3DRadialTileGeometry } = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/island5ThreePilotContract.ts');
      const outerRadius = resolveIsland3DRadialTileGeometry(36).outerRadius;
      const plots = [{ role: 'main', radius: 6.18, depth: 9.2, seed: .3 },
        ...[[2.5, 5.3], [2.32, 4.7], [2.46, 5.5], [2.27, 4.9]].map(([radius, depth], i) => ({ role: 'district', radius, depth, seed: i + 1.2, outward: Math.atan2(i < 2 ? -3.9 : 3.9, i % 2 ? 4.36 : -4.36) }))];
      const measurements = [], spillCoverageFailures = [];
      for (const quality of ['low', 'medium', 'high']) {
        const state = fixture(quality); state.runtime.updateRedocking(presentation(20), true); state.scene.updateWorldMatrix(true, true);
        const waters = [], gardens = [];
        state.runtime.root.traverse(node => {
          if (/^CELESTIAL_V2_(MAIN|DISTRICT)_WATERWAY_/.test(node.name)) waters.push(node);
          if (/^CELESTIAL_V2_(MAIN|DISTRICT|DISTANT)_GARDENS_/.test(node.name)) gardens.push(node);
          if (node.geometry) for (const [name, attribute] of Object.entries(node.geometry.attributes)) assert.ok(Array.from(attribute.array).every(Number.isFinite), `${quality}/${node.name}: nonfinite ${name}`);
        });
        assert.equal(waters.length, 5, 'one main plus four district waterway ownership groups survive batching');
        assert.equal(new Set(waters.map(water => water.parent)).size, 5, 'each waterway has its own island frame');
        assert.ok(gardens.length >= 5, 'main/district garden hierarchy survives batching');
        let rootedPlants = 0;
        for (const garden of gardens) {
          const top = garden.name.includes('_DISTANT_') ? .06 : .36;
          for (const plant of garden.children.filter(node => /^(CELESTIAL_TREE_|CELESTIAL_PLANT_)/.test(node.name))) {
            assert.ok(plant instanceof THREE.Group, 'semantic plant root survives geometry consolidation');
            const local = plant.getWorldPosition(new THREE.Vector3()).applyMatrix4(garden.parent.matrixWorld.clone().invert());
            assert.ok(Math.abs(local.y - top) < 1e-6, `${quality}/${plant.name}: planted base ${local.y} must touch cap ${top}`); rootedPlants++;
          }
        }
        assert.ok(rootedPlants > 20, 'inspect actual planted roots, not an empty garden');
        for (const plot of plots) {
          const water = waters.find(node => node.name.endsWith(`_WATERWAY_${plot.seed}`)); assert.ok(water);
          assert.equal(water.userData.waterOwner, water.parent.name, 'stored owner matches actual parent');
          if (plot.role === 'district') assert.equal(water.parent, state.platforms[Math.round(plot.seed - 1.2)], 'district water moves with its actual platform');
          const owner = new THREE.Group(); owner.name = water.parent.name; owner.matrixAutoUpdate = false; owner.matrix.copy(water.parent.matrixWorld); owner.matrixWorldNeedsUpdate = true;
          const authored = addCelestialV2Waterways(owner, plot, quality, state.materials); owner.updateWorldMatrix(true, true);
          try {
            assert.deepEqual(water.userData.spillSocket, authored.userData.spillSocket, 'actual and authored spill socket agree');
            const references = authored.children.filter(node => node instanceof THREE.Mesh);
            const vertexCounts = new Map(references.map(mesh => [mesh.name, mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count]));
            const occurrence = new Map();
            const actualVertices = source => {
              const ordinal = occurrence.get(source.name) ?? 0; occurrence.set(source.name, ordinal + 1);
              const anchors = water.children.filter(node => node.name === source.name), anchor = anchors[ordinal]; assert.ok(anchor, 'water semantic anchor retained');
              matrixClose(anchor.matrixWorld, source.matrixWorld, `${water.name}/${source.name}: water authored/assembled transform ${anchor.matrixWorld.elements} vs ${source.matrixWorld.elements}`);
              if (anchor instanceof THREE.Mesh) return worldVertices(anchor);
              const batch = state.runtime.root.getObjectByName(anchor.userData.batchedInto); assert.ok(batch instanceof THREE.Mesh, 'water actual render batch exists');
              let offset = 0, found = false, seen = 0;
              for (const name of batch.userData.sourceNames) {
                if (name === source.name && seen++ === ordinal) { found = true; break; }
                assert.ok(vertexCounts.has(name), `water batch range source known: ${name}`); offset += vertexCounts.get(name);
              }
              assert.ok(found, 'water batch contains the specific stream occurrence');
              return Array.from({ length: vertexCounts.get(source.name) }, (_, i) => new THREE.Vector3().fromBufferAttribute(batch.geometry.attributes.position, offset + i).applyMatrix4(batch.matrixWorld));
            };
            const pool = references.find(node => node.name === 'CELESTIAL_TERRACE_POOL');
            const poolVertices = actualVertices(pool);
            const minPoolRadius = Math.min(...poolVertices.map(point => Math.hypot(point.x, point.z)));
            assert.ok(minPoolRadius > outerRadius, `${quality}/${water.name}: pool intrudes route outer radius${outerRadius}, minimum${minPoolRadius}`);
            const spill = new THREE.Vector3().fromArray(water.userData.spillSocket).applyMatrix4(water.matrixWorld);
            const runnel = references.find(node => node.name === 'CELESTIAL_CONNECTED_SPILL_RUNNEL');
            const runnelActual = actualVertices(runnel), runnelExpected = worldVertices(runnel);
            runnelActual.forEach((point, i) => closeVector(point, runnelExpected[i], 'runnel actual vertices preserve physical source footprint'));
            const topTriangles = [];
            for (let i = 0; i < runnelActual.length; i += 3) {
              const [a, b, c] = runnelActual.slice(i, i + 3);
              if ([a, b, c].every(point => Math.abs(point.y - spill.y) < 1e-6)) topTriangles.push(new THREE.Triangle(a, b, c));
            }
            assert.ok(topTriangles.length > 0, 'runnel exposes measurable top surface triangles');
            const starts = [];
            const lipCoverage = [];
            for (const fall of references.filter(node => node.name === 'CELESTIAL_CONNECTED_VOLUME_WATERFALL')) {
              const actual = actualVertices(fall), expected = worldVertices(fall);
              assert.equal(actual.length, expected.length);
              actual.forEach((point, i) => closeVector(point, expected[i], 'finite volume fall vertex preserved by assembly'));
              // Resolve the two first-row front vertices through the index
              // buffer; changing triangle winding must not change this probe.
              const frontCorners = [0, 1].map(vertex => actual[fall.geometry.index ? Array.from(fall.geometry.index.array).indexOf(vertex) : vertex]);
              assert.ok(frontCorners.every(Boolean), 'first-row front vertices occur in rendered index data');
              const start = frontCorners[0].clone().add(frontCorners[1]).multiplyScalar(.5); starts.push(start);
              assert.ok(Math.abs(start.y - spill.y) < 1e-6, 'fall starts at the physical spill height');
              const coverage = frontCorners.map(point => Math.min(...topTriangles.map(triangle => triangle.closestPointToPoint(point, new THREE.Vector3()).distanceTo(point))));
              lipCoverage.push({ firstRowCorners: frontCorners.map(point => point.toArray()), distancesToRunnel: coverage });
              assert.ok(Math.min(...actual.map(point => point.y)) < spill.y, 'volume fall descends from its source; depth is an authored visual choice');
              const position = fall.geometry.attributes.position;
              assert.ok(new THREE.Vector3().fromBufferAttribute(position, 0).distanceTo(new THREE.Vector3().fromBufferAttribute(position, 3)) > .05, 'fall has real thickness, not a single sheet');
            }
            assert.equal(starts.length, quality === 'low' ? 1 : 3);
            closeVector(starts.reduce((sum, start) => sum.add(start), new THREE.Vector3()).divideScalar(starts.length), spill, 'fall group starts centred on stored spill socket');
            console.log('CELESTIAL_SPILL_COVERAGE', JSON.stringify({ quality, water: water.name, lipCoverage }));
            if (!lipCoverage.every(stream => stream.distancesToRunnel.every(distance => distance <= .035 + 1e-6))) spillCoverageFailures.push({ quality, water: water.name, lipCoverage });
            measurements.push({ quality, water: water.name, minPoolRadius, spill: spill.toArray(), streams: starts.length, rootedPlants });
          } finally {
            const owned = new Set(); authored.traverse(node => { if (node.geometry) node.geometry.dispose(); if (node.material instanceof THREE.ShaderMaterial) owned.add(node.material); }); owned.forEach(material => material.dispose());
          }
        }
      }
      console.log('CELESTIAL_LANDSCAPE_CHECK', JSON.stringify(measurements));
      assert.equal(spillCoverageFailures.length, 0, `first-row corners must contact actual runnel surface within .035 spill collar allowance: ${JSON.stringify(spillCoverageFailures)}`);
    });

    await check('Celestial skybridge endpoints follow actual platform poses during docking at30/60Hz and immediate replay', () => {
      const endpoints = [30, 60].map(fps => {
        const state = fixture(), bridges = [1, 2, 3, 4].map(index => state.runtime.root.getObjectByName(`CELESTIAL_V2_DOCKING_SKYBRIDGE_${index}`));
        assert.ok(bridges.every(Boolean), 'four bridge groups remain independently movable after static batching');
        const mainland = bridges.map(bridge => bridge.position.clone());
        function verify() {
          state.scene.updateWorldMatrix(true, true);
          return bridges.map((bridge, index) => {
            const span = bridge.getObjectByName('CELESTIAL_SKYBRIDGE_EXTENDING_SPAN'); assert.ok(span);
            assert.equal(span.scale.z, bridge.userData.spanLength, 'rendered span and measured length agree');
            const end = new THREE.Vector3(0, 0, 1).applyMatrix4(span.matrixWorld);
            const center = state.platforms[index].getWorldPosition(new THREE.Vector3());
            const direction = center.clone().setY(0).normalize();
            const target = center.clone().addScaledVector(direction, -1.84);
            closeVector(end, target, 'bridge end follows actual district approach socket, not just requested docking progress');
            closeVector(bridge.position, mainland[index], 'mainland bridge anchor stays fixed');
            assert.ok(Number.isFinite(bridge.userData.spanLength) && bridge.userData.spanLength > 0, 'finite positive rendered bridge');
            return end.toArray();
          });
        }
        for (const rolls of [0, 5, 10, 15, 20, 0]) { state.runtime.updateRedocking(presentation(rolls), true); verify(); }
        const samples = []; let elapsed = 0;
        state.runtime.animate(0);
        for (const rolls of [5, 10, 15, 20]) {
          state.runtime.updateRedocking(presentation(rolls));
          for (let frame = 1; frame <= fps; frame++) { state.runtime.animate(elapsed + frame / fps); const ends = verify(); if (frame % (fps / 2) === 0) samples.push(ends); }
          elapsed++;
        }
        state.runtime.updateRedocking(presentation(0), true); verify();
        return samples;
      });
      endpoints[0].forEach((sample, i) => sample.forEach((end, j) => closeVector(new THREE.Vector3().fromArray(end), new THREE.Vector3().fromArray(endpoints[1][i][j]), '30/60Hz bridge endpoint agreement')));
    });

    await check('Celestial material clocks preserve initial values and use deduplicated absolute elapsed time', async () => {
      const { createCelestialFlowMaterial } = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island2CelestialV2WaterMaterial.ts');
      const checkpoints = [30, 60].map(fps => {
        const state = fixture();
        state.runtime.updateRedocking(presentation(20), true);
        const landmark = state.landmarks[0];
        const nested = new THREE.Group(); nested.position.set(.3, .8, -.4); nested.rotation.set(.21, -.34, .13); nested.scale.set(.8, 1.2, 1.1); landmark.add(nested);
        const pool = createCelestialFlowMaterial('pool'), fall = createCelestialFlowMaterial('fall');
        for (const surface of [pool, fall]) {
          assert.ok(surface instanceof THREE.ShaderMaterial);
          assert.equal(surface.userData.celestialClock, true, 'flow factory opts into the clock controller');
          assert.equal(surface.uniforms.time.value, 0, 'factory begins at reduced-motion time0');
        }
        // Observe writes on the shared uniform itself: duplicate registrations or
        // material-array references must not write it more than once per frame.
        let clockValue = 0, writes = 0;
        Object.defineProperty(pool.uniforms.time, 'value', { configurable: true, get: () => clockValue, set: value => { writes++; clockValue = value; } });
        fall.uniforms.time.value = 9.25;
        const alias = new THREE.ShaderMaterial({ uniforms: { time: pool.uniforms.time } }); alias.userData.celestialClock = true;
        const unflagged = new THREE.ShaderMaterial({ uniforms: { time: { value: 7.5 } } });
        const invalid = [Number.NaN, Infinity, '12'].map(value => {
          const surface = new THREE.ShaderMaterial({ uniforms: { time: { value } } }); surface.userData.celestialClock = true; return surface;
        });
        const missing = new THREE.ShaderMaterial(); missing.userData.celestialClock = true;
        const ordinary = new THREE.MeshBasicMaterial(); ordinary.userData.celestialClock = true; ordinary.uniforms = { time: { value: 4.5 } };
        const geometry = new THREE.PlaneGeometry(1, 1);
        const surfaces = [pool, [pool, fall, alias], unflagged, ...invalid, missing, ordinary];
        const meshes = surfaces.map((material, index) => {
          const mesh = new THREE.Mesh(geometry, material); mesh.position.set(index * .2, .15, -.2); mesh.rotation.set(.2, .1, -.1); nested.add(mesh); return mesh;
        });
        state.scene.updateWorldMatrix(true, true);
        const anchors = [state.runtime.root, landmark, nested, ...meshes].map(node => ({ node, matrix: node.matrixWorld.clone(), parent: node.parent }));
        state.runtime.registerRedockingLandmark('hatchery', landmark);
        state.runtime.registerRedockingLandmark('hatchery', landmark);
        assert.equal(writes, 0, 'registration never advances or resets an authored clock');
        assert.equal(pool.uniforms.time.value, 0); assert.equal(fall.uniforms.time.value, 9.25);
        state.runtime.updateRedocking(presentation(0), true);
        state.runtime.updateRedocking(presentation(20), true);
        assert.equal(writes, 0, 'immediate replay/reduced-motion pose updates leave time untouched');
        assert.equal(fall.uniforms.time.value, 9.25, 'nonzero authored initial time is also preserved without animate');
        const samples = [];
        const verify = elapsed => {
          assert.equal(pool.uniforms.time.value, elapsed, 'pool uses exact absolute elapsed');
          assert.equal(fall.uniforms.time.value, elapsed, 'fall uses exact absolute elapsed');
          assert.equal(alias.uniforms.time, pool.uniforms.time, 'uniform alias identity survives registration');
          assert.equal(unflagged.uniforms.time.value, 7.5, 'unflagged shader stays untouched');
          invalid.forEach((surface, index) => assert.ok(Object.is(surface.uniforms.time.value, [Number.NaN, Infinity, '12'][index]), 'invalid clock stays untouched'));
          assert.equal(missing.uniforms.time, undefined, 'missing clock is not manufactured');
          assert.equal(ordinary.uniforms.time.value, 4.5, 'non-shader material stays untouched');
          state.scene.updateWorldMatrix(true, true);
          anchors.forEach(({ node, matrix, parent }) => {
            matrixClose(node.matrixWorld, matrix, 'clock registration preserves stationary root/child transforms');
            assert.equal(node.parent, parent, 'clock registration preserves ownership');
          });
        };
        for (let frame = 0; frame <= 2 * fps; frame++) {
          const elapsed = frame / fps, beforeWrites = writes;
          state.runtime.animate(elapsed);
          assert.equal(writes, beforeWrites + 1, 'shared clock updates exactly once despite repeated references and registration');
          verify(elapsed);
          if (frame % (fps / 2) === 0) {
            state.runtime.animate(elapsed); verify(elapsed);
            assert.equal(writes, beforeWrites + 2, 'repeated timestamp does not accumulate clock time');
            samples.push([pool.uniforms.time.value, fall.uniforms.time.value]);
          }
        }
        return samples;
      });
      assert.deepEqual(checkpoints[0], checkpoints[1], '30Hz and 60Hz clocks agree at every shared elapsed timestamp');
      assert.equal(checkpoints[0].length, 5);
    });

    await check('Celestial immediate presentation updates collars and tethers without an animation frame', () => {
      const state = fixture();
      const tethers = [1, 2, 3, 4].map(index => state.runtime.root.getObjectByName(`ISLAND_2_REDOCKING_TETHER_${index}`));
      assert.ok(tethers.every(Boolean), 'four named tether surfaces required');
      state.runtime.updateRedocking(presentation(20), true);
      assertSnapped(state, 20); assertNoPulse(state, 4);
      tethers.forEach((tether, i) => assert.equal(tether.material.opacity, .88, `hydrated docked tether ${i}`));
      state.runtime.updateRedocking(presentation(0), true);
      assertSnapped(state, 0); assertNoPulse(state, 0);
      tethers.forEach((tether, i) => assert.equal(tether.material.opacity, .52, `replay undocked tether ${i}`));
      // Create a visible pulse, then remove it through an immediate projection;
      // reduced-motion rendering must not need another animate call to be correct.
      state.runtime.updateRedocking(presentation(5)); state.runtime.animate(0);
      assert.ok(state.collars[0].scale.x > 1.1, 'precondition: pulse was visible');
      state.runtime.updateRedocking(presentation(0), true);
      assertNoPulse(state, 0); assertSnapped(state, 0);
      tethers.forEach(tether => assert.equal(tether.material.opacity, .52));
      state.runtime.updateRedocking(presentation(5), true);
      assertNoPulse(state, 1); assertSnapped(state, 5);
      tethers.forEach((tether, i) => assert.equal(tether.material.opacity, i === 0 ? .88 : .52));
    });

    await check('Celestial authored spin is absolute-time deterministic and preserves base orientation and ancestors', () => {
      const checkpoints = [30, 60].map(fps => {
        const state = fixture();
        const parent = new THREE.Group(); parent.position.set(2, 3, -4); parent.rotation.set(.31, -.22, .14); parent.scale.set(1.2, .8, 1.1);
        const localRoot = new THREE.Group(); localRoot.position.set(.4, .5, -.6); localRoot.rotation.set(-.17, .23, .09); parent.add(localRoot); state.scene.add(parent);
        const spins = ['y', 'z'].map((axis, index) => {
          const node = new THREE.Group(); node.position.set(index * .3, .4, .2); node.rotation.set(.21, -.34, .13);
          node.userData.celestialMotion = true; node.userData.celestialSpin = { axis, speed: index ? -.41 : .27 }; localRoot.add(node);
          return { node, axis, speed: node.userData.celestialSpin.speed, base: node.quaternion.clone(), position: node.position.clone(), scale: node.scale.clone() };
        });
        const unflagged = new THREE.Group(); unflagged.rotation.set(.13, .11, -.08); unflagged.userData.celestialSpin = { axis: 'y', speed: 1 }; localRoot.add(unflagged);
        const invalid = new THREE.Group(); invalid.rotation.set(.14, .12, -.07); invalid.userData.celestialMotion = true; invalid.userData.celestialSpin = { axis: 'z', speed: Number.NaN }; localRoot.add(invalid);
        state.scene.updateWorldMatrix(true, true);
        const parentMatrix = parent.matrixWorld.clone(), rootMatrix = localRoot.matrixWorld.clone();
        const unflaggedBase = unflagged.quaternion.clone(), invalidBase = invalid.quaternion.clone();
        state.runtime.registerRedockingLandmark('boss', localRoot);
        const samples = [];
        for (let frame = 0; frame <= 2 * fps; frame++) {
          const elapsed = frame / fps;
          state.runtime.animate(elapsed);
          if (frame % (fps / 2) === 0) {
            spins.forEach(({ node, axis, speed, base, position, scale }) => {
              const turn = new THREE.Quaternion().setFromAxisAngle(axis === 'z' ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0), elapsed * speed);
              const expected = base.clone().multiply(turn);
              assert.ok(node.quaternion.angleTo(expected) < 1e-6, `${axis} spin preserves authored base orientation at ${elapsed}s`);
              closeVector(node.position, position, `${axis} pivot translation`); closeVector(node.scale, scale, `${axis} scale`);
            });
            const beforeRepeatedFrame = spins.map(({ node }) => node.quaternion.clone());
            state.runtime.animate(elapsed);
            spins.forEach(({ node }, i) => assert.ok(node.quaternion.angleTo(beforeRepeatedFrame[i]) < 1e-6, 'same elapsed time must not accumulate another spin'));
            state.scene.updateWorldMatrix(true, true);
            matrixClose(parent.matrixWorld, parentMatrix, 'stationary parent'); matrixClose(localRoot.matrixWorld, rootMatrix, 'stationary mechanism root');
            assert.ok(unflagged.quaternion.angleTo(unflaggedBase) < 1e-6, 'unflagged part cannot enter mechanism controller');
            assert.ok(invalid.quaternion.angleTo(invalidBase) < 1e-6, 'nonfinite speed cannot poison quaternion');
            samples.push(spins.map(({ node }) => node.quaternion.clone()));
          }
        }
        return samples;
      });
      assert.equal(checkpoints[0].length, 5);
      checkpoints[0].forEach((sample, index) => sample.forEach((rotation, axis) => assert.ok(rotation.angleTo(checkpoints[1][index][axis]) < 1e-6, `${axis}: 30/60 FPS mismatch at ${index / 2}s`)));
    });

    await check('Celestial shadow invalidation follows actual docking poses and clears when consumed', () => {
      const state = fixture();
      assert.equal(typeof state.runtime.consumeShadowUpdate, 'function', 'cached shadow renderer needs the invalidation consumer');
      assert.equal(state.runtime.consumeShadowUpdate(), true, 'fresh world needs one shadow render');
      assert.equal(state.runtime.consumeShadowUpdate(), false, 'reading dirty state consumes it');
      state.runtime.updateRedocking(presentation(0), true);
      state.runtime.animate(0);
      assert.equal(state.runtime.consumeShadowUpdate(), false, 'same starting pose does not invalidate shadow cache');
      state.runtime.updateRedocking(presentation(5));
      assert.equal(state.runtime.consumeShadowUpdate(), false, 'changing target alone does not invalidate unmoved casters');
      state.runtime.animate(.05);
      assert.equal(state.runtime.consumeShadowUpdate(), true, 'first physical docking movement invalidates shadow map');
      assert.equal(state.runtime.consumeShadowUpdate(), false, 'docking invalidation is consumed once');
      state.runtime.animate(.05);
      assert.equal(state.runtime.consumeShadowUpdate(), false, 'same elapsed time and pose remain clean');
      state.runtime.animate(.1);
      assert.equal(state.runtime.consumeShadowUpdate(), true, 'next changed pose invalidates again');
      for (let frame = 3; frame <= 80; frame++) {
        state.runtime.animate(frame * .05); state.runtime.consumeShadowUpdate();
      }
      assertSnapped(state, 5);
      state.runtime.animate(4.05);
      assert.equal(state.runtime.consumeShadowUpdate(), false, 'settled docking stops requesting shadow updates');
      state.runtime.updateRedocking(presentation(20), true);
      assert.equal(state.runtime.consumeShadowUpdate(), true, 'reduced-motion snap invalidates changed platform positions');
      assert.equal(state.runtime.consumeShadowUpdate(), false);
      state.runtime.updateRedocking(presentation(20), true);
      assert.equal(state.runtime.consumeShadowUpdate(), false, 'repeating a hydrated stage stays clean');
      state.runtime.updateRedocking(presentation(0), true);
      assert.equal(state.runtime.consumeShadowUpdate(), true, 'replay reset invalidates former docked shadows');
      state.runtime.animate(4.05);
      assertSnapped(state, 0);
      assert.equal(state.runtime.consumeShadowUpdate(), false, 'replay resting frame does not keep cache dirty');
    });
    await check('Celestial docking and petals are elapsed-time deterministic at 30 and 60 FPS', () => {
      const samples = [30, 60].map(fps => {
        const state = fixture(); state.runtime.updateRedocking(presentation(0), true); assertSnapped(state, 0);
        const initialPetals = Array.from(state.petals.geometry.attributes.position.array);
        state.runtime.updateRedocking(presentation(5));
        const checkpoints = [];
        for (let frame = 0; frame <= fps * 2; frame++) {
          state.runtime.animate(frame / fps);
          if (frame > 0 && frame % (fps / 2) === 0) checkpoints.push({
            positions: state.platforms.map(platform => platform.position.clone()),
            landmarks: state.landmarks.map(landmark => landmark.position.clone()),
            petals: Array.from(state.petals.geometry.attributes.position.array),
          });
        }
        assertSnapped(state, 5); return { checkpoints, initialPetals };
      });
      assert.deepEqual(samples[0].initialPetals, samples[1].initialPetals, 'fresh mounts seed identical petal positions');
      assert.equal(samples[0].checkpoints.length, 4);
      samples[0].checkpoints.forEach((a, checkpoint) => {
        const b = samples[1].checkpoints[checkpoint];
        a.positions.forEach((p, i) => closeVector(p, b.positions[i], `${(checkpoint + 1) / 2}s platform ${i}`));
        a.landmarks.forEach((p, i) => closeVector(p, b.landmarks[i], `${(checkpoint + 1) / 2}s landmark ${i}`));
        assert.deepEqual(a.petals, b.petals, `petals at ${(checkpoint + 1) / 2}s must not accumulate per-frame drift`);
      });
    });
    await check('Celestial reduced motion snaps persisted stages and replay clears an active docking pulse', () => {
      const state = fixture();
      state.runtime.updateRedocking(presentation(20), true); assertSnapped(state, 20);
      state.runtime.updateRedocking(presentation(0), true); assertSnapped(state, 0);
      const resetPositions = state.platforms.map(platform => platform.position.clone());
      state.runtime.animate(0); assertNoPulse(state, 0);
      state.runtime.updateRedocking(presentation(5)); state.runtime.animate(0);
      assert.ok(state.collars[0].scale.x > 1.1 && state.collars[0].material.emissiveIntensity > 2, 'precondition: stage advance actually starts a visible pulse');
      // A replay or reduced-motion projection must be clean on its next rendered frame,
      // even if elapsed time has not advanced and the previous pulse was at full strength.
      state.runtime.updateRedocking(presentation(0), true); assertSnapped(state, 0);
      state.runtime.animate(0); assertNoPulse(state, 0);
      state.platforms.forEach((platform, i) => closeVector(platform.position, resetPositions[i], `replay reset ${i}`));
      state.runtime.updateRedocking(presentation(5), true); assertSnapped(state, 5);
      state.runtime.animate(0); assertNoPulse(state, 1);
      state.runtime.updateRedocking(presentation(0)); state.runtime.animate(0); assertNoPulse(state, 0);
      state.runtime.updateRedocking(presentation(0), true); assertSnapped(state, 0);
      state.runtime.updateRedocking(presentation(5)); state.runtime.animate(0);
      assert.ok(state.collars[0].scale.x > 1.1, 'a new replay still creates its own stage celebration');
      state.runtime.updateRedocking(presentation(5), true); state.runtime.animate(0); assertNoPulse(state, 1);
    });
  } finally {
    const geometries = new Set(), materials = new Set();
    for (const state of runtimeFixtures) {
      state.scene.traverse(node => {
        if (node.geometry) geometries.add(node.geometry);
        if (node.material) for (const material of Array.isArray(node.material) ? node.material : [node.material]) materials.add(material);
      });
      Object.values(state.materials).forEach(material => materials.add(material));
    }
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
  }

  const { batchCelestialStatic, batchCelestialPlantInstances } = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island2CelestialV2Batch.ts');
  await check('Plant runtime batching tracks owner motion, instance changes and visibility without mutating source buffers', async () => {
    const { createCelestialPlantRuntimeBatches } = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island2CelestialV2PlantRuntimeBatch.ts');
    const scene = new THREE.Scene(), ambience = new THREE.Group(); ambience.name = 'ISLAND_2_CELESTIAL_LIVING_AMBIENCE'; scene.add(ambience);
    const owners = [0, 1].map(i => {
      const owner = new THREE.Group(); owner.name = `ISLAND_2_REDOCKING_PLATFORM_${i + 1}`;
      owner.position.set(i ? 4.36 : -4.36, .1 * i, -3.9); owner.rotation.set(.1, .2 * i, -.1); ambience.add(owner);
      const parent = new THREE.Group(); parent.position.set(.2, .36, -.3); parent.rotation.set(.12, -.23, .07); parent.scale.set(.8, 1.2, 1.1); owner.add(parent); return { owner, parent };
    });
    const geometry = new THREE.BoxGeometry(.2, .3, .4), material = new THREE.MeshStandardMaterial({ color: 0x669944 });
    const ownedGeometries = new Set([geometry]), ownedMaterials = new Set([material]);
    const make = (parent, name, count, shape = geometry, paint = material) => {
      const mesh = new THREE.InstancedMesh(shape, paint, count); mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.position.set(.13, .2, -.14); mesh.rotation.set(.07, -.11, .09); mesh.scale.set(1.1, .9, .8);
      for (let i = 0; i < count; i++) mesh.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(i * .4, .1, -.2 * i), new THREE.Quaternion().setFromEuler(new THREE.Euler(.1 * i, .3, .2)), new THREE.Vector3(.8, 1.2, .9)));
      parent.add(mesh); ownedGeometries.add(shape); ownedMaterials.add(paint); return mesh;
    };
    const sources = [make(owners[0].parent, 'PLATFORM_A_BOTANICAL_INSTANCES_0', 2), make(owners[1].parent, 'PLATFORM_B_BOTANICAL_INSTANCES_0', 3, geometry.clone())];
    const differentGeometry = geometry.clone(); differentGeometry.attributes.position.setX(0, differentGeometry.attributes.position.getX(0) + .017);
    const distinct = [make(owners[0].parent, 'DISTINCT_SHAPE_BOTANICAL_INSTANCES_0', 1, differentGeometry), make(owners[1].parent, 'DISTINCT_MATERIAL_BOTANICAL_INSTANCES_0', 1, geometry, material.clone()), make(owners[0].parent, 'UNSELECTED_DECORATION', 2)];
    const originals = [...sources, ...distinct].map(mesh => ({ mesh, geometry: mesh.geometry, material: mesh.material, parent: mesh.parent,
      buffers: Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([key, attr]) => [key, Array.from(attr.array)])), index: Array.from(mesh.geometry.index.array), instances: Array.from(mesh.instanceMatrix.array) }));
    const expected = () => {
      scene.updateMatrixWorld(true);
      return sources.flatMap(source => Array.from({ length: source.count }, (_, i) => { const local = new THREE.Matrix4(); source.getMatrixAt(i, local); return source.matrixWorld.clone().multiply(local); }));
    };
    let runtime;
    try {
      const before = expected(); runtime = createCelestialPlantRuntimeBatches(scene); runtime.sync();
      const batches = []; runtime.root.traverse(node => { if (node instanceof THREE.InstancedMesh) batches.push(node); });
      const batch = batches.find(node => node.material === material && node.count === 5);
      assert.ok(batch, 'two identical shapes/materials combine across independent owner frames');
      assert.notEqual(batch.geometry, geometry, 'global renderer owns a geometry copy');
      const inspect = (matrices, hiddenSource = -1) => {
        scene.updateMatrixWorld(true); let offset = 0;
        assert.ok(Array.isArray(batch.userData.sourceRanges), 'global batch exposes actual source ownership ranges');
        assert.equal(batch.count, sources.reduce((count, source, i) => count + (i === hiddenSource ? 0 : source.count), 0));
        sources.forEach((source, sourceIndex) => {
          const range = batch.userData.sourceRanges.find(range => range.name === source.name);
          if (sourceIndex === hiddenSource) { assert.ok(!range || range.count === 0, 'hidden owner has no submitted instances'); offset += source.count; return; }
          assert.ok(range); assert.equal(range.count, source.count);
          for (let i = 0; i < source.count; i++, offset++) {
            const instance = new THREE.Matrix4(); batch.getMatrixAt(range.offset + i, instance); const actual = batch.matrixWorld.clone().multiply(instance);
            actual.elements.forEach((value, j) => assert.ok(Math.abs(value - matrices[offset].elements[j]) < 2e-5, `source ${sourceIndex}/${i} world matrix ${j}`));
            const position = geometry.getAttribute('position');
            for (let vertex = 0; vertex < position.count; vertex++) {
              const point = new THREE.Vector3().fromBufferAttribute(position, vertex);
              assert.ok(point.clone().applyMatrix4(actual).distanceTo(point.applyMatrix4(matrices[offset])) < 2e-5, 'every rendered instance vertex retains authored world pose');
            }
          }
        });
      };
      inspect(before);
      let version = batch.instanceMatrix.version; runtime.sync(); assert.equal(batch.instanceMatrix.version, version, 'static repeated sync does not upload instance matrices');
      owners[1].owner.position.add(new THREE.Vector3(-1.2, .1, .9)); owners[1].owner.rotation.y += .45;
      owners[0].parent.rotation.z -= .23; const moved = expected(); runtime.sync(); inspect(moved);
      assert.ok(batch.instanceMatrix.version > version, 'docking movement updates global plant matrices');
      version = batch.instanceMatrix.version; runtime.sync(); assert.equal(batch.instanceMatrix.version, version);
      owners[0].owner.visible = false; runtime.sync(); inspect(expected(), 0);
      owners[0].owner.visible = true; runtime.sync(); inspect(expected());
      sources[1].setMatrixAt(1, new THREE.Matrix4().compose(new THREE.Vector3(.3, .7, -.8), new THREE.Quaternion().setFromEuler(new THREE.Euler(.2, .4, .1)), new THREE.Vector3(.6, .7, .8))); sources[1].instanceMatrix.needsUpdate = true;
      const updated = expected(); runtime.sync(); inspect(updated);
      version = batch.instanceMatrix.version; runtime.sync(); assert.equal(batch.instanceMatrix.version, version, 'unchanged instance data does not upload again');
      for (const state of originals) {
        assert.equal(state.mesh.parent, state.parent); assert.equal(state.mesh.material, state.material);
        for (const [name, values] of Object.entries(state.buffers)) assert.deepEqual(Array.from(state.geometry.attributes[name].array), values, 'authored vertex buffers unchanged');
        assert.deepEqual(Array.from(state.geometry.index.array), state.index);
        if (state.mesh !== sources[1]) assert.deepEqual(Array.from(state.mesh.instanceMatrix.array), state.instances, 'batching cannot mutate source instance arrays');
      }
      assert.equal(distinct[2].geometry, geometry, 'unselected instances remain native');
      // A different shape or material may have its own batch, but can never
      // contaminate the five compatible source instances validated above.
      assert.equal(batch.count, sources.reduce((count, mesh) => count + mesh.count, 0));
      runtime.dispose(); runtime = undefined;
      originals.forEach(state => assert.equal(state.mesh.geometry, state.geometry, 'dispose restores the exact original geometry object'));
    } finally { runtime?.dispose(); ownedGeometries.forEach(shape => shape.dispose()); ownedMaterials.forEach(paint => paint.dispose()); }
  });

  await check('Rigid batching preserves mechanism transforms through static batching and subsequent motion', async () => {
    const { createIslandRigidSurfaceBatches } = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island1AnimatedBatches.ts');
    const scene = new THREE.Scene(), family = new THREE.Group(); family.name = 'MECHANISM_BATCH_FIXTURE'; family.position.set(2, .7, -1); family.rotation.set(.1, .3, -.2); scene.add(family);
    const material = new THREE.MeshStandardMaterial(), geometry = new THREE.BoxGeometry(.3, .6, .4);
    const fixed = new THREE.Group(); fixed.rotation.set(.2, -.1, .4); fixed.scale.set(.8, 1.3, 1.1); family.add(fixed);
    const mechanism = new THREE.Group(); mechanism.name = 'AUTHORED_MOVING_PIVOT'; mechanism.userData.celestialMotion = true;
    mechanism.userData.celestialSpin = { axis: 'y', speed: .7 }; mechanism.position.set(.8, .9, -.3); mechanism.rotation.set(.3, -.4, .2); family.add(mechanism);
    const base = mechanism.quaternion.clone(), parts = [];
    for (const [parent, prefix] of [[fixed, 'FIXED'], [mechanism, 'MOVING']]) for (let i = 0; i < 2; i++) {
      const mesh = new THREE.Mesh(geometry, material); mesh.name = `${prefix}_${i}`; mesh.position.set(i * .6, .2, -.1); mesh.rotation.set(.1, i * .3, -.1); mesh.scale.set(1, .8, 1.2); parent.add(mesh); parts.push(mesh);
    }
    scene.updateMatrixWorld(true); const familyMatrix = family.matrixWorld.clone(), fixedMatrix = fixed.matrixWorld.clone();
    const before = parts.filter(mesh => mesh.parent === mechanism).map(mesh => ({ mesh, matrix: mesh.matrixWorld.clone() }));
    batchCelestialStatic(family); scene.updateMatrixWorld(true);
    before.forEach(({ mesh, matrix }) => { assert.equal(mesh.parent, mechanism); matrixClose(mesh.matrixWorld, matrix, 'static batching preserves mechanism'); });
    const rigid = createIslandRigidSurfaceBatches(scene, [family.name], 'MECHANISM_RENDER_BATCH');
    try {
      assert.ok(rigid.sourceCount >= 3, 'rigid renderer includes moving controllers and consolidated stationary surface');
      const shaders = rigid.root.children.map(mesh => {
        const shader = { uniforms: {}, vertexShader: '#include <beginnormal_vertex>\n#include <begin_vertex>' };
        mesh.material.onBeforeCompile(shader, {}); return { mesh, matrices: shader.uniforms.islandPartMatrices.value };
      });
      for (const elapsed of [0, .5, 2, 2, 0]) {
        mechanism.quaternion.copy(base).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), elapsed * .7)); rigid.sync();
        matrixClose(family.matrixWorld, familyMatrix, 'mechanism motion leaves family fixed'); matrixClose(fixed.matrixWorld, fixedMatrix, 'mechanism motion leaves stationary ancestor fixed');
        for (const { mesh, matrices } of shaders) mesh.userData.sourceNames.forEach((name, i) => {
          const controller = scene.getObjectByName(name); assert.ok(controller);
          const actual = rigid.root.matrixWorld.clone().multiply(matrices[i]);
          matrixClose(actual, controller.matrixWorld, `${elapsed}s/${name} GPU rigid matrix tracks controller`);
          closeVector(new THREE.Vector3(.15, .3, -.2).applyMatrix4(actual), new THREE.Vector3(.15, .3, -.2).applyMatrix4(controller.matrixWorld), 'animated surface point');
        });
      }
    } finally { rigid.dispose(); const shapes = new Set([geometry]); family.traverse(node => { if (node.geometry) shapes.add(node.geometry); }); shapes.forEach(shape => shape.dispose()); material.dispose(); }
  });

  await check('Rigid shadow index keeps the full visible shell across camera orbits and rebuilds only on visibility changes', async () => {
    const { createIslandRigidSurfaceBatches } = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island1AnimatedBatches.ts');
    const scene = new THREE.Scene(), family = new THREE.Group(); family.name = 'SHADOW_INDEX_FIXTURE'; scene.add(family);
    const material = new THREE.MeshStandardMaterial(), geometry = new THREE.BoxGeometry(.8, 1, .6);
    const sources = [0, 1].map(i => { const mesh = new THREE.Mesh(geometry, material); mesh.name = `SHADOW_BOX_${i}`; mesh.position.set(i * 1.7, .2 * i, -.2); mesh.rotation.y = .23 * i; mesh.castShadow = true; family.add(mesh); return mesh; });
    const original = geometry.toNonIndexed(), rigid = createIslandRigidSurfaceBatches(scene, [family.name], 'SHADOW_INDEX_BATCH');
    const mesh = rigid.root.children[0]; assert.ok(mesh instanceof THREE.Mesh); const camera = new THREE.PerspectiveCamera(); scene.add(camera);
    const shadow = () => {
      const colorIndex = mesh.geometry.index, colorCount = mesh.geometry.drawRange.count;
      mesh.onBeforeShadow(); const index = mesh.geometry.index, count = mesh.geometry.drawRange.count;
      const snapshot = { index, version: index.version, values: Array.from(index.array.slice(0, count)), count };
      mesh.onAfterShadow(); assert.equal(mesh.geometry.index, colorIndex); assert.equal(mesh.geometry.drawRange.count, colorCount); return snapshot;
    };
    const checkColor = () => {
      const expected = [], p = original.attributes.position, normals = original.attributes.normal;
      sources.forEach((source, part) => {
        if (!source.visible || !family.visible) return;
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(source.matrixWorld);
        for (let vertex = 0; vertex < p.count; vertex += 3) {
          const center = new THREE.Vector3(); for (let j = 0; j < 3; j++) center.add(new THREE.Vector3().fromBufferAttribute(p, vertex + j)); center.multiplyScalar(1 / 3).applyMatrix4(source.matrixWorld);
          const normal = new THREE.Vector3().fromBufferAttribute(normals, vertex).applyNormalMatrix(normalMatrix);
          if (normal.dot(camera.position.clone().sub(center)) > 0) expected.push(part * p.count + vertex, part * p.count + vertex + 1, part * p.count + vertex + 2);
        }
      });
      assert.deepEqual(Array.from(mesh.geometry.index.array.slice(0, mesh.geometry.drawRange.count)), expected, 'submitted color triangles are the actual camera-facing cube surfaces');
    };
    try {
      let baseline;
      for (const position of [[5, 3, 7], [-6, 2, -4], [5, 3, 7]]) {
        camera.position.set(...position); rigid.sync(camera); checkColor(); const current = shadow();
        assert.equal(current.count, original.attributes.position.count * 2, 'shadow pass retains both entire shells');
        assert.deepEqual(current.values, Array.from({ length: current.count }, (_, i) => i));
        if (baseline) { assert.equal(current.index, baseline.index); assert.equal(current.version, baseline.version, 'camera-only orbit does not rebuild shadow index'); }
        baseline = current;
      }
      sources[0].visible = false; rigid.sync(camera); checkColor(); const hidden = shadow();
      assert.ok(hidden.version > baseline.version); assert.equal(hidden.count, original.attributes.position.count);
      assert.deepEqual(hidden.values, Array.from({ length: hidden.count }, (_, i) => i + original.attributes.position.count));
      rigid.sync(camera); assert.equal(shadow().version, hidden.version, 'unchanged visibility performs no redundant shadow upload');
      family.visible = false; rigid.sync(camera); checkColor(); assert.equal(shadow().count, 0); assert.equal(mesh.visible, false);
      family.visible = true; sources[0].visible = true; rigid.sync(camera); checkColor(); const restored = shadow();
      assert.equal(restored.count, baseline.count); assert.deepEqual(restored.values, baseline.values); assert.equal(mesh.visible, true);
    } finally { rigid.dispose(); original.dispose(); geometry.dispose(); material.dispose(); }
  });

  await check('Static batching normalizes only standard-material UV copies and preserves authored buffers and transforms', () => {
    const root = new THREE.Group(); root.name = 'UV_COMPATIBILITY_FRAME'; root.position.set(2, -.3, 1); root.rotation.set(.13, .27, -.19);
    const parent = new THREE.Group(); parent.position.set(.3, .6, -.7); parent.rotation.set(.1, -.3, .2); parent.scale.set(.8, 1.2, .9); root.add(parent);
    const standard = new THREE.MeshStandardMaterial({ color: 0x668844 });
    const shader = new THREE.ShaderMaterial({ uniforms: { time: { value: 2.7 } } });
    const noUv = new THREE.BoxGeometry(.4, .6, .8); noUv.deleteAttribute('uv');
    const withUv = new THREE.BoxGeometry(.3, .5, .7);
    const geometries = new Set([noUv, withUv]);
    const add = (name, geometry, material, i) => {
      const mesh = new THREE.Mesh(geometry, material); mesh.name = name; mesh.position.set(i * .6, i * .13, -.2 * i);
      mesh.rotation.set(i * .07, -.1 * i, .04); mesh.scale.set(1 + i * .1, .9, 1.1); mesh.castShadow = true; mesh.receiveShadow = true;
      parent.add(mesh); return mesh;
    };
    const standardSources = [add('STANDARD_WITHOUT_UV', noUv, standard, 0), add('STANDARD_WITH_UV', withUv, standard, 1)];
    const shaderSources = [add('CUSTOM_WITHOUT_UV_A', noUv, shader, 2), add('CUSTOM_WITHOUT_UV_B', noUv, shader, 3)];
    const shaderWithUv = add('CUSTOM_WITH_UV', withUv, shader, 4);
    const sources = [...standardSources, ...shaderSources, shaderWithUv]; root.updateWorldMatrix(true, true);
    const snapshots = sources.map(mesh => ({ mesh, material: mesh.material, geometry: mesh.geometry, matrix: mesh.matrixWorld.clone(), vertices: worldVertices(mesh) }));
    const bufferSnapshot = geometry => JSON.stringify({ attributes: Object.fromEntries(Object.entries(geometry.attributes).map(([key, attr]) => [key, { itemSize: attr.itemSize, normalized: attr.normalized, array: Array.from(attr.array) }])), index: geometry.index ? Array.from(geometry.index.array) : null });
    const originalBuffers = new Map([...geometries].map(geometry => [geometry, bufferSnapshot(geometry)]));
    const materialSnapshots = [standard, shader].map(material => JSON.stringify(material.toJSON()));
    const expectedUv = withUv.toNonIndexed(); geometries.add(expectedUv);
    try {
      batchCelestialStatic(root); root.updateWorldMatrix(true, true);
      const batches = root.children.filter(mesh => mesh instanceof THREE.Mesh); batches.forEach(mesh => geometries.add(mesh.geometry));
      assert.equal(batches.length, 2, 'standard surfaces consolidate despite missing UVs; custom shader layouts remain distinct');
      const standardBatch = batches.find(mesh => mesh.material === standard), shaderBatch = batches.find(mesh => mesh.material === shader);
      assert.ok(standardBatch && shaderBatch);
      assert.deepEqual(standardBatch.userData.sourceNames, standardSources.map(mesh => mesh.name));
      assert.deepEqual(shaderBatch.userData.sourceNames, shaderSources.map(mesh => mesh.name));
      const uv = standardBatch.geometry.getAttribute('uv'), missingCount = noUv.index.count;
      assert.equal(uv.count, standardBatch.geometry.getAttribute('position').count);
      assert.ok(Array.from(uv.array.slice(0, missingCount * 2)).every(value => value === 0), 'missing standard UVs become renderer-default (0,0) only in batch copy');
      assert.deepEqual(Array.from(uv.array.slice(missingCount * 2)), Array.from(expectedUv.getAttribute('uv').array), 'existing standard UVs are preserved');
      assert.equal(shaderBatch.geometry.getAttribute('uv'), undefined, 'custom ShaderMaterial missing UV semantics remain unchanged');
      assert.equal(root.getObjectByName(shaderWithUv.name), shaderWithUv, 'custom mesh with distinct UV layout remains separate');
      for (const [batch, members] of [[standardBatch, standardSources], [shaderBatch, shaderSources]]) {
        const before = members.flatMap(mesh => snapshots.find(state => state.mesh === mesh).vertices), after = worldVertices(batch);
        assert.equal(after.length, before.length); before.forEach((vertex, i) => closeVector(vertex, after[i], `${batch.name} actual triangle vertex ${i}`));
        assert.equal(batch.castShadow, true); assert.equal(batch.receiveShadow, true);
      }
      for (const state of snapshots) {
        assert.equal(state.mesh.geometry, state.geometry); assert.equal(state.mesh.material, state.material);
        matrixClose(root.getObjectByName(state.mesh.name).matrixWorld, state.matrix, `${state.mesh.name} semantic transform`);
      }
      for (const [geometry, before] of originalBuffers) assert.equal(bufferSnapshot(geometry), before, 'authored attributes/index remain byte-for-byte unchanged');
      assert.equal(noUv.getAttribute('uv'), undefined);
      [standard, shader].forEach((material, i) => assert.equal(JSON.stringify(material.toJSON()), materialSnapshots[i], 'authored material remains unchanged'));
    } finally { geometries.forEach(geometry => geometry.dispose()); standard.dispose(); shader.dispose(); }
  });

  await check('Celestial plant batching preserves exact shapes, instance world transforms and motion ownership', () => {
    const scene = new THREE.Scene(), root = new THREE.Group(); root.name = 'TEST_BOTANY_FRAME';
    root.position.set(1.2, -.3, 2.1); root.rotation.set(.17, -.25, .31); root.scale.set(1.2, .8, 1.1); scene.add(root);
    const branches = [0, 1].map(i => {
      const parent = new THREE.Group(); parent.position.set(i ? 1 : -.7, .5 + i, -.3); parent.rotation.set(.2 + i * .1, -.4 + i * .2, .12); parent.scale.set(.8 + i * .4, 1.3, .9); root.add(parent);
      const nested = new THREE.Group(); nested.position.set(.2, -.1, .3); nested.rotation.set(-.09, .21, .17); parent.add(nested); return nested;
    });
    const geometry = new THREE.BoxGeometry(.2, .3, .4), material = new THREE.MeshStandardMaterial({ color: 0x4c8a37 });
    const allSources = [], ownedGeometries = new Set([geometry]), ownedMaterials = new Set([material]);
    function plant(name, parent, count = 2, shape = geometry, paint = material) {
      const mesh = new THREE.InstancedMesh(shape, paint, count); mesh.name = name;
      mesh.position.set(.2, .4, -.1); mesh.rotation.set(.23, -.16, .07); mesh.scale.set(1.1, .7, 1.2);
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.renderOrder = 3; mesh.userData.semanticBed = name;
      for (let i = 0; i < count; i++) mesh.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(i * .31, .12 + i * .07, -.13 * i), new THREE.Quaternion().setFromEuler(new THREE.Euler(.13 * i, .2, -.17)), new THREE.Vector3(1 + i * .1, .8, 1.2)));
      parent.add(mesh); allSources.push(mesh); ownedGeometries.add(shape); ownedMaterials.add(paint); return mesh;
    }
    const first = plant('TREE_1_BRANCH_CROWNS_0', branches[0], 2);
    const second = plant('CELESTIAL_PLANT_FLOWERS_2', branches[1], 3, geometry.clone());
    const child = new THREE.Group(); child.name = 'PLANT_SOCKET'; child.position.set(.1, .2, -.3); first.add(child);
    const differentGeometry = geometry.clone(); differentGeometry.attributes.position.setX(0, differentGeometry.attributes.position.getX(0) + .025);
    const distinctShape = plant('CELESTIAL_PLANT_DISTINCT_SHAPE', root, 2, differentGeometry);
    const distinctMaterial = plant('CELESTIAL_PLANT_DISTINCT_MATERIAL', root, 2, geometry, material.clone());
    const hidden = new THREE.Group(); hidden.visible = false; root.add(hidden);
    const moving = new THREE.Group(); moving.userData.celestialMotion = true; root.add(moving);
    const excluded = new THREE.Group(); root.add(excluded);
    const excludedPlants = [hidden, moving, excluded].flatMap((group, i) => [plant(`CELESTIAL_PLANT_EXCLUDE_${i}_A`, group), plant(`CELESTIAL_PLANT_EXCLUDE_${i}_B`, group)]);
    const colored = [0, 1].map(i => { const mesh = plant(`CELESTIAL_PLANT_COLORED_${i}`, root); mesh.setColorAt(0, new THREE.Color(0xff0000)); return mesh; });
    const unselected = [plant('UNRELATED_INSTANCES_A', root), plant('UNRELATED_INSTANCES_B', root)];
    const shadowVariant = plant('CELESTIAL_PLANT_OTHER_SHADOW', root); shadowVariant.castShadow = false;
    const preserved = [distinctShape, distinctMaterial, ...excludedPlants, ...colored, ...unselected, shadowVariant];
    root.updateWorldMatrix(true, true);
    const sources = [first, second];
    const expected = sources.flatMap(source => Array.from({ length: source.count }, (_, i) => { const instance = new THREE.Matrix4(); source.getMatrixAt(i, instance); return source.matrixWorld.clone().multiply(instance); }));
    const anchors = new Map([...sources, child].map(node => [node.name, node.matrixWorld.clone()]));
    const preservedStates = preserved.map(mesh => ({ mesh, parent: mesh.parent, matrix: mesh.matrixWorld.clone(), instances: Array.from(mesh.instanceMatrix.array), colors: mesh.instanceColor ? Array.from(mesh.instanceColor.array) : null }));
    const shapeHash = shape => {
      const hash = createHash('sha256');
      for (const key of Object.keys(shape.attributes).sort()) { const array = shape.attributes[key].array; hash.update(key); hash.update(Buffer.from(array.buffer, array.byteOffset, array.byteLength)); }
      if (shape.index) { const array = shape.index.array; hash.update(Buffer.from(array.buffer, array.byteOffset, array.byteLength)); }
      return hash.digest('hex');
    };
    const originalShapes = new Map([...ownedGeometries].map(shape => [shape, shapeHash(shape)]));
    try {
      batchCelestialPlantInstances(root, [excluded]); root.updateWorldMatrix(true, true);
      const batches = root.children.filter(node => node instanceof THREE.InstancedMesh && node.name.includes('_BOTANICAL_INSTANCES_'));
      assert.equal(batches.length, 1, 'only identical shapes/materials in this stationary frame consolidate');
      const batch = batches[0]; ownedGeometries.add(batch.geometry);
      assert.equal(batch.count, 5); assert.equal(batch.material, material);
      assert.equal(batch.castShadow, true); assert.equal(batch.receiveShadow, true); assert.equal(batch.renderOrder, 3);
      assert.deepEqual(batch.userData.sourceNames, sources.map(source => source.name));
      assert.notEqual(batch.geometry, geometry); assert.equal(shapeHash(batch.geometry), originalShapes.get(geometry));
      expected.forEach((world, i) => {
        const local = new THREE.Matrix4(); batch.getMatrixAt(i, local); const actual = batch.matrixWorld.clone().multiply(local);
        // Float32 instance buffers introduce bounded roundoff after composing nested transforms.
        world.elements.forEach((value, j) => assert.ok(Math.abs(actual.elements[j] - value) < 1e-6, `instance ${i} world matrix[${j}]`));
        closeVector(new THREE.Vector3(.1, .15, -.2).applyMatrix4(actual), new THREE.Vector3(.1, .15, -.2).applyMatrix4(world), `instance ${i} surface point`);
      });
      for (const [name, matrix] of anchors) { const anchor = root.getObjectByName(name); assert.ok(anchor, `semantic anchor ${name}`); matrixClose(anchor.matrixWorld, matrix, name); }
      sources.forEach((source, i) => {
        const anchor = root.getObjectByName(source.name);
        assert.equal(anchor.userData.semanticBed, source.name); assert.equal(anchor.userData.batchedInto, batch.name);
        assert.equal(anchor.userData.instanceOffset, i ? first.count : 0); assert.equal(anchor.userData.instanceCount, source.count);
      });
      assert.equal(root.getObjectByName('PLANT_SOCKET'), child);
      preservedStates.forEach(({ mesh, parent, matrix, instances, colors }) => {
        assert.equal(mesh.parent, parent, `${mesh.name} stays in its ownership subtree`); assert.equal(root.getObjectByName(mesh.name), mesh);
        matrixClose(mesh.matrixWorld, matrix, mesh.name); assert.deepEqual(Array.from(mesh.instanceMatrix.array), instances);
        assert.deepEqual(mesh.instanceColor ? Array.from(mesh.instanceColor.array) : null, colors);
      });
      for (const [shape, hash] of originalShapes) assert.equal(shapeHash(shape), hash, 'batching cannot mutate authored shape buffers');
      moving.position.x += .7; excluded.rotation.y += .3; root.updateWorldMatrix(true, true);
      assert.notDeepEqual(excludedPlants[2].matrixWorld.elements, preservedStates.find(entry => entry.mesh === excludedPlants[2]).matrix.elements, 'motion-owned plants remain movable');
      assert.equal(root.userData.celestialBotanicalBatches, 1);
    } finally { ownedGeometries.forEach(shape => shape.dispose()); ownedMaterials.forEach(paint => paint.dispose()); }
  });

  await check('Celestial batching preserves rigid transforms, semantic anchors, instances and moving subtrees', () => {
    const scene = new THREE.Scene();
    const root = new THREE.Group(); root.name = 'TEST_CELESTIAL_ROOT';
    root.position.set(3, 2, -4); root.rotation.set(.13, -.42, .08); root.scale.set(1.3, .9, 1.1); scene.add(root);
    const parent = new THREE.Group(); parent.name = 'PALACE_GALLERY';
    parent.position.set(-.5, 1.3, .9); parent.rotation.set(.22, .31, -.16); parent.scale.set(.8, 1.4, 1.1); root.add(parent);
    const material = new THREE.MeshStandardMaterial({ color: 0xd5b674 });
    const geometry = new THREE.BoxGeometry(.3, .5, .7);
    const staticMeshes = [0, 1, 2].map(i => {
      const mesh = new THREE.Mesh(geometry, material); mesh.name = `STATIC_COLUMN_${i}`;
      mesh.position.set(i * .7, i * .2, -.3 * i); mesh.rotation.set(.1 * i, .2 * i, -.07 * i);
      mesh.scale.set(1 + i * .2, 1 - i * .1, 1 + i * .1); mesh.castShadow = true;
      mesh.userData.semanticPart = `column-${i}`; parent.add(mesh); return mesh;
    });
    const socket = new THREE.Group(); socket.name = 'BANNER_SOCKET'; socket.position.set(.1, .3, -.2); staticMeshes[0].add(socket);
    const moving = new THREE.Group(); moving.name = 'MOVING_DISTRICT'; moving.position.set(2, 1, 3); root.add(moving);
    const excludedMeshes = [0, 1].map(i => {
      const mesh = new THREE.Mesh(geometry, material); mesh.position.set(i, .4, -.2); moving.add(mesh); return mesh;
    });
    const motionFlag = new THREE.Group(); motionFlag.userData.celestialMotion = true; root.add(motionFlag);
    const flaggedMesh = new THREE.Mesh(geometry, material); motionFlag.add(flaggedMesh);
    const instances = new THREE.InstancedMesh(geometry, material, 2); instances.name = 'CANOPY_INSTANCES';
    instances.position.set(-2, .5, 1); instances.rotation.y = .53; instances.scale.set(.8, 1.2, .7); parent.add(instances);
    instances.setMatrixAt(0, new THREE.Matrix4().compose(new THREE.Vector3(.2, .3, .4), new THREE.Quaternion().setFromEuler(new THREE.Euler(.1, .2, .3)), new THREE.Vector3(1, .8, 1.3)));
    instances.setMatrixAt(1, new THREE.Matrix4().makeTranslation(-.5, .2, -.8));
    root.updateWorldMatrix(true, true);
    const beforeVertices = staticMeshes.flatMap(worldVertices);
    const beforeAnchors = new Map([...staticMeshes, socket].map(node => [node.name, node.matrixWorld.clone()]));
    const instanceWorld = instances.matrixWorld.clone(); const instanceData = Array.from(instances.instanceMatrix.array);
    const excludedWorld = excludedMeshes.map(mesh => mesh.matrixWorld.clone());
    batchCelestialStatic(root, [moving]); root.updateWorldMatrix(true, true);
    const batches = root.children.filter(node => node instanceof THREE.Mesh && node.name.includes('_STATIC_BATCH_'));
    assert.equal(batches.length, 1, 'three compatible rigid meshes must batch');
    const afterVertices = worldVertices(batches[0]);
    assert.equal(afterVertices.length, beforeVertices.length, 'batch preserves every triangle vertex');
    beforeVertices.forEach((vertex, i) => closeVector(vertex, afterVertices[i], `world vertex ${i}`));
    for (const [name, matrix] of beforeAnchors) {
      const anchor = root.getObjectByName(name); assert.ok(anchor, `semantic anchor ${name} survives`);
      matrixClose(anchor.matrixWorld, matrix, name);
    }
    assert.equal(root.getObjectByName('STATIC_COLUMN_0').userData.semanticPart, 'column-0');
    assert.equal(root.getObjectByName('BANNER_SOCKET'), socket, 'existing child sockets retain identity');
    assert.equal(root.getObjectByName('CANOPY_INSTANCES'), instances, 'InstancedMesh retains identity');
    assert.ok(instances instanceof THREE.InstancedMesh); assert.equal(instances.count, 2);
    assert.deepEqual(Array.from(instances.instanceMatrix.array), instanceData);
    matrixClose(instances.matrixWorld, instanceWorld, 'instance world transform');
    excludedMeshes.forEach((mesh, i) => { assert.equal(mesh.parent, moving); matrixClose(mesh.matrixWorld, excludedWorld[i], 'excluded transform'); });
    assert.equal(flaggedMesh.parent, motionFlag, 'motion-tagged subtree stays native');
    moving.position.x += 2; root.updateWorldMatrix(true, true);
    assert.notDeepEqual(excludedMeshes[0].matrixWorld.elements, excludedWorld[0].elements, 'excluded subtree remains movable');
    assert.equal(root.userData.celestialStaticBatches, 1);
    batches[0].geometry.dispose(); geometry.dispose(); material.dispose();
  });
} finally {
  await server.close();
  const sourceEnd = snapshot();
  const changedDuringRun = trackedSources.filter(file => sourceStart[file] !== sourceEnd[file]);
  console.log('ISLAND002_V2_CHECK', JSON.stringify({ passed, failed, changedDuringRun, sourceHashes: sourceEnd, finalVisualAcceptance: false }));
  if (failed || changedDuringRun.length || passed === 0) process.exitCode = 1;
}
