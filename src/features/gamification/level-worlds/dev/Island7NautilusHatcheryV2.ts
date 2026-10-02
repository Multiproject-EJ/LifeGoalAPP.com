import * as THREE from 'three';
import { applyIsland7NacreV2 } from './Island7NacreV2';
import type { Island3DQuality } from './island5ThreePilotContract';
import { HATCHERY_V004_PARTS } from './Island7NautilusHatcheryV2.packed';

/** Family B/v004: closed Blender-carved shell; naked macro, pending independent QC.
 * Coordinates and persistent funded meshes are identical across all build levels.
 * Macro uses the same bounded asset at every quality; LOD authoring follows approval.
 */
export function createIsland7NautilusHatcheryV2(level: 1 | 2 | 3, _quality: Island3DQuality, neutralMaterial?: THREE.Material, night = 0): THREE.Group {
  const root = new THREE.Group();
  root.name = 'ISLAND_7_NAUTILUS_HATCHERY_V2_V004';
  root.userData.candidate = 'family-b-v004-presentation-study';
  const finishes = new Map<string, THREE.Material>();
  const finish = (name: string) => {
    if (neutralMaterial) return neutralMaterial;
    const key = name.includes('EGG') ? 'egg' : name.includes('GALLERY') ? 'base' : name.includes('CRADLE') ? 'cradle' : 'shell';
    if (!finishes.has(key)) finishes.set(key,new THREE.MeshPhysicalMaterial({
      color: key === 'egg' ? 0xf2efd4 : key === 'base' ? 0x4a898e : key === 'cradle' ? 0xcbaa70 : 0xeadcc6,
      roughness: key === 'egg' ? 0.22 : 0.4, metalness: key === 'cradle' ? 0.4 : 0.12,
      emissive: key === 'egg' ? 0xe7ba76 : 0x142b39, emissiveIntensity: key === 'egg' ? .15 + night * 1.2 : 0.08,
    }));
    const material = finishes.get(key)!;
    if ((key === 'shell' || key === 'egg') && material instanceof THREE.MeshPhysicalMaterial) applyIsland7NacreV2(material, key === 'shell' ? .52 : .28);
    return material;
  };
  for (const part of HATCHERY_V004_PARTS) {
    if (part.level > level) continue;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(part.positions, 3));
    geometry.setIndex(part.indices);
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(part.normals, 3));
    const mesh = new THREE.Mesh(geometry, finish(part.name));
    mesh.name = part.name;
    mesh.userData.constructionLevel = part.level;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  return root;
}
