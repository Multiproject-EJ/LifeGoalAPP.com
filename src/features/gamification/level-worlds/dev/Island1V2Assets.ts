import * as THREE from 'three';
import assetManifest from './Island1V2AssetManifest.json';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type Island001V2ModelId = 'hatchery' | 'habit' | 'wisdom' | 'event';
/** Facades share the approved overview orientation; canonical plot centers stay fixed. */
export function getIsland001V2LandmarkYaw(_id: Island001V2ModelId) { return 0; }
// The manifest owns the deployed mapping; content hashes invalidate cached
// revisions while filenames remain stable across visual improvements.
const modelUrls = Object.fromEntries(Object.entries(assetManifest.models).map(([id, asset]) => [
  id, `${asset.url}?v=${asset.sha256.slice(0, 12)}`,
])) as Record<Island001V2ModelId, string>;
const sourceModels = new Map<Island001V2ModelId, THREE.Group>();
let pendingLoad: Promise<void> | undefined;

function batchStaticOwner(owner: THREE.Object3D) {
  owner.updateWorldMatrix(true, true);
  const inverseOwner = owner.matrixWorld.clone().invert();
  const batches = new Map<string, THREE.Mesh[]>();
  owner.traverse(node => {
    if (!(node instanceof THREE.Mesh) || node instanceof THREE.SkinnedMesh || node instanceof THREE.InstancedMesh || Array.isArray(node.material)) return;
    // Different UV/color layouts cannot be merged. Keep each compatible set
    // separate, and never remove source meshes until a merge has succeeded.
    const attributes = (Object.entries(node.geometry.attributes) as Array<[string, THREE.BufferAttribute | THREE.InterleavedBufferAttribute]>).map(([key, value]) => `${key}:${value.itemSize}:${value.normalized}`).sort().join('|');
    const key = `${node.material.uuid}:${node.castShadow}:${attributes}`;
    const members = batches.get(key) ?? [];
    members.push(node); batches.set(key, members);
  });
  let index = 0;
  for (const members of batches.values()) {
    const geometries = members.map(node => {
      const geometry = node.geometry.index ? node.geometry.toNonIndexed() : node.geometry.clone();
      return geometry.applyMatrix4(inverseOwner.clone().multiply(node.matrixWorld));
    });
    const merged = mergeGeometries(geometries, false);
    geometries.forEach(geometry => geometry.dispose());
    if (!merged) continue;
    const batch = new THREE.Mesh(merged, members[0].material);
    batch.name = `${owner.name}-batch-${index++}`;
    batch.castShadow = members[0].castShadow; batch.receiveShadow = true;
    members.forEach(node => { node.removeFromParent(); node.geometry.dispose(); });
    owner.add(batch);
  }
}

export function areIsland001V2AssetsReady() {
  return Object.keys(modelUrls).every(id => sourceModels.has(id as Island001V2ModelId));
}

export function preloadIsland001V2Assets(): Promise<void> {
  if (areIsland001V2AssetsReady()) return Promise.resolve();
  if (pendingLoad) return pendingLoad;
  const loader = new GLTFLoader();
  pendingLoad = Promise.all(Object.entries(modelUrls).map(async ([id, url]) => {
    if (sourceModels.has(id as Island001V2ModelId)) return;
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 20_000);
    try {
      // Our packs are self-contained GLBs. A stalled download must reach the
      // existing retry surface rather than leave first entry waiting forever.
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Island model unavailable (${response.status})`);
      const resourcePath = new URL('.', new URL(url, window.location.href)).href;
      const asset = await loader.parseAsync(await response.arrayBuffer(), resourcePath);
      sourceModels.set(id as Island001V2ModelId, asset.scene);
    } finally { clearTimeout(deadline); }
  })).then(() => undefined).finally(() => { pendingLoad = undefined; });
  return pendingLoad;
}

/** Independent owned resources let renderer teardown leave the cached source intact. */
export function instantiateIsland001V2Asset(source: THREE.Group, level: 1 | 2 | 3, preview = false) {
  const root = source.clone(true);
  const excluded: THREE.Object3D[] = [];
  root.traverse(node => { if (Number(node.userData.buildLevel ?? 1) > level) excluded.push(node); });
  excluded.forEach(node => node.removeFromParent());
  const geometries = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();
  const materials = new Map<THREE.Material, THREE.Material>();
  const textures = new Map<THREE.Texture, THREE.Texture>();
  function cloneMaterial(sourceMaterial: THREE.Material) {
    const cached = materials.get(sourceMaterial);
    if (cached) return cached;
    const copy = sourceMaterial.clone();
    for (const [key, value] of Object.entries(sourceMaterial)) {
      if (!(value instanceof THREE.Texture)) continue;
      let texture = textures.get(value);
      if (!texture) { texture = value.clone(); textures.set(value, texture); }
      (copy as unknown as Record<string, unknown>)[key] = texture;
    }
    materials.set(sourceMaterial, copy);
    return copy;
  }
  root.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    const originalGeometry: THREE.BufferGeometry = node.geometry;
    const geometry = geometries.get(originalGeometry) ?? originalGeometry.clone();
    geometries.set(originalGeometry, geometry);
    node.geometry = geometry;
    node.material = Array.isArray(node.material) ? node.material.map(cloneMaterial) : cloneMaterial(node.material);
    node.castShadow = !(Array.isArray(node.material) ? node.material.some(m => m.transparent) : node.material.transparent);
    node.receiveShadow = true;
  });
  const ownerNames = new Set<string>();
  root.traverse(node => {
    const name = node.userData.semanticOwner;
    if (typeof name === 'string' && root.getObjectByName(name)) ownerNames.add(name);
  });
  if (!preview) {
    for (const name of ownerNames) {
      const owner = root.getObjectByName(name);
      if (!owner) continue;
      // glTF empty nodes are Object3D rather than Group. Preserve that named
      // owner and its transform/extras; batch only its static child meshes.
      batchStaticOwner(owner);
    }
  }
  root.userData.sculptRuntime = { ...root.userData.sculptRuntime, parts: [...ownerNames], constructionPreview: preview, source: 'authored-glb' };
  return root;
}

export function createIsland001V2Asset(id: Island001V2ModelId, level: 1 | 2 | 3, preview = false) {
  const source = sourceModels.get(id);
  return source ? instantiateIsland001V2Asset(source, level, preview) : null;
}
