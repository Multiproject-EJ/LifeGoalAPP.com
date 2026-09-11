import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const require = createRequire(import.meta.url);
const esbuild = require('../node_modules/.pnpm/esbuild@0.21.5/node_modules/esbuild');
const assetPath = path.resolve(process.argv[2] || 'docs/gauntlets/island-001-v2/blender-route/hatchery/family02-correction-b04.glb');
const modelId = process.argv[4] || 'hatchery';
const checkComplete = process.argv.includes('--complete');
mkdirSync('tmp', { recursive: true });
await esbuild.build({
  entryPoints: ['src/features/gamification/level-worlds/dev/Island1V2Assets.ts'],
  outfile: 'tmp/island001-v2-asset-audit.mjs', platform: 'node', format: 'esm',
  bundle: true, packages: 'external', define: { 'import.meta.env': '{}' }, logLevel: 'warning',
});
const THREE = await import('three');
const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
const { instantiateIsland001V2Asset } = await import(pathToFileURL(path.resolve('tmp/island001-v2-asset-audit.mjs')).href);
await esbuild.build({ entryPoints: ['src/features/gamification/level-worlds/dev/IslandConstructionLevelDelta.ts'], outfile: 'tmp/island001-v2-construction-audit.mjs', platform: 'node', format: 'esm', bundle: true, packages: 'external', logLevel: 'warning' });
const { prepareIslandConstructionLevelDelta } = await import(pathToFileURL(path.resolve('tmp/island001-v2-construction-audit.mjs')).href);
const buffer = readFileSync(assetPath);
const source = (await new GLTFLoader().parseAsync(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), '')).scene;
const expected = {
  hatchery: ['hatchery-terraces', 'hatchery-wings', 'hatchery-conservatory', 'hatchery-egg'],
  habit: ['oak-trunk', 'oak-canopy', 'oak-galleries', 'oak-stairs'],
  wisdom: ['archive-wings', 'archive-terraces', 'archive-globe'],
  event: ['observatory-wings', 'observatory-dome', 'observatory-armillary'],
}[modelId];
if (!expected) throw Error(`Unknown model ID ${modelId}`);
for (const name of expected) if (!source.getObjectByName(name)) throw Error(`Missing semantic owner ${name}`);
function inspect(root) {
  root.updateWorldMatrix(true, true);
  let triangles = 0, meshes = 0, radius = 0, invalid = 0;
  const vertex = new THREE.Vector3(), fingerprints = new Map();
  root.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    meshes++;
    const position = node.geometry.getAttribute('position');
    triangles += (node.geometry.index?.count ?? position.count) / 3;
    const values = [];
    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i).applyMatrix4(node.matrixWorld);
      if (![vertex.x, vertex.y, vertex.z].every(Number.isFinite)) invalid++;
      radius = Math.max(radius, Math.hypot(vertex.x, vertex.z));
      values.push(...vertex.toArray().map(n => Math.round(n * 1e6)));
    }
    fingerprints.set(node.name, values.join(','));
  });
  const bounds = new THREE.Box3().setFromObject(root);
  return { meshes, triangles, radius, invalid, min: bounds.min.toArray(), max: bounds.max.toArray(), fingerprints };
}
const levels = [];
const constructionTransitions = [];
const sourceResources = new Set();
source.traverse(node => {
  if (!(node instanceof THREE.Mesh)) return;
  sourceResources.add(node.geometry);
  for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
    sourceResources.add(material);
    for (const value of Object.values(material)) if (value instanceof THREE.Texture) sourceResources.add(value);
  }
});
let sourceDisposals = 0;
sourceResources.forEach(resource => resource.addEventListener('dispose', () => sourceDisposals++));
let previous;
for (const level of [1, 2, 3]) {
  const preview = instantiateIsland001V2Asset(source, level, true);
  const compact = instantiateIsland001V2Asset(source, level, false);
  const original = inspect(preview), batched = inspect(compact);
  if (original.invalid || batched.invalid) throw Error(`Invalid vertices at L${level}`);
  if (original.radius > 1.6001) throw Error(`Footprint exceeded: L${level} radius ${original.radius}`);
  if (original.triangles !== batched.triangles) throw Error(`Batching lost geometry at L${level}: ${original.triangles} -> ${batched.triangles}`);
  for (const field of ['min', 'max']) for (let axis = 0; axis < 3; axis++) {
    if (Math.abs(original[field][axis] - batched[field][axis]) > 1e-4) throw Error(`Batching moved geometry: ${field}/${axis}`);
  }
  if (previous) for (const [name, fingerprint] of previous) {
    if (original.fingerprints.get(name) !== fingerprint) throw Error(`Funded part changed/disappeared at L${level}: ${name}`);
  }
  previous = original.fingerprints;
  for (const name of expected) {
    const sourceOwner = source.getObjectByName(name), instanceOwner = preview.getObjectByName(name);
    if (!instanceOwner || sourceOwner === instanceOwner) throw Error(`Missing/shared owner ${name}`);
  }
  let sourceMesh;
  source.traverse(node => { if (!sourceMesh && node instanceof THREE.Mesh) sourceMesh = node; });
  const clonedMesh = preview.getObjectByName(sourceMesh.name);
  if (clonedMesh?.geometry === sourceMesh.geometry || clonedMesh?.material === sourceMesh.material) throw Error('Cached source resource reused by live clone');
  const { fingerprints, ...stats } = original;
  levels.push({ level, ...stats, batches: batched.meshes });
  if (checkComplete) {
    const currentRoot = level > 1 ? instantiateIsland001V2Asset(source, level - 1, true) : null;
    const targetRoot = instantiateIsland001V2Asset(source, level, true);
    const delta = prepareIslandConstructionLevelDelta({ currentRoot, targetRoot });
    for (const stage of [1,2,3,4,5]) if (!delta.stageCounts[stage]) throw Error(`L${level-1}->L${level} missing construction stage ${stage}`);
    delta.applyProgress(0, { working: false });
    if (delta.revealParts.some(part => part.mesh.visible)) throw Error(`L${level} target visible before reveal`);
    delta.applyProgress(1, { working: false });
    if (delta.revealParts.some(part => !part.temporary && !part.mesh.visible)) throw Error(`L${level} funded reveal incomplete`);
    constructionTransitions.push({ from: level-1, to: level, retained: delta.retainedMeshCount, additive: delta.additiveMeshCount, stages: delta.stageCounts });
  }
  // Exercise the same resource teardown that occurs when leaving the board or
  // replacing a construction preview, then ensure a fresh clone still works.
  for (const root of [preview, compact]) root.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    const owned = [node.geometry, ...(Array.isArray(node.material) ? node.material : [node.material])];
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) owned.push(value);
    }
    for (const resource of owned) {
      if (sourceResources.has(resource)) throw Error(`L${level} teardown would dispose a cached source resource`);
      resource.dispose();
    }
  });
  if (sourceDisposals) throw Error('A live world disposed cached asset resources');
  const remounted = inspect(instantiateIsland001V2Asset(source, level, true));
  if (remounted.triangles !== original.triangles || remounted.invalid) throw Error(`L${level} remount failed`);
}
const result = { asset: assetPath, modelId, bytes: buffer.length, engineeringGate: 'pass', visualApproval: false, cachedSourceSurvivesTeardown: sourceDisposals === 0, levels, constructionTransitions };
console.log(JSON.stringify(result, null, 2));
if (process.argv[3]) writeFileSync(process.argv[3], JSON.stringify(result, null, 2) + '\n');
