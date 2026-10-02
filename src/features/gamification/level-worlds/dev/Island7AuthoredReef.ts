import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Island3DQuality } from './island5ThreePilotContract';

export const ISLAND7_REEF_REVISION = 'worker-reef-v002';

/** Self-contained local GLB. Each call owns its resources, so renderer
 * disposal never invalidates another scene or a cached source model. */
export async function loadIsland7ReefShelf(quality: Island3DQuality, signal?: AbortSignal) {
  const url = `/assets/islands/island-007/v2/${ISLAND7_REEF_REVISION}/reef-shelf-${quality}.glb`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Reef model unavailable (${response.status})`);
  const gltf = await new GLTFLoader().parseAsync(await response.arrayBuffer(), '/assets/islands/island-007/v2/');
  gltf.scene.name = 'ISLAND_7_AUTHORED_REEF_SHELF';
  gltf.scene.userData.partId = 'representative-reef-shelf';
  gltf.scene.userData.sourceRevision = ISLAND7_REEF_REVISION;
  gltf.scene.userData.sculptRuntime = {
    clickable: false, explodable: true, presentationOnly: true,
    sockets: { crown: [0, 0, 0] }, source: 'blender-authored-glb',
    destructionGroups: [{ id: 'reef-shelf', breakable: false }],
  };
  return gltf.scene;
}

export function disposeIsland7Reef(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    if (node instanceof THREE.InstancedMesh) node.dispose();
    geometries.add(node.geometry);
    (Array.isArray(node.material) ? node.material : [node.material]).forEach(material => materials.add(material));
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => {
    for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    material.dispose();
  });
  textures.forEach(texture => texture.dispose());
}
