import * as THREE from 'three';

/** Thin-film nacre for shell architecture. Owned by its landmark; no textures,
 * extra geometry, lighting objects or animation state. */
export function applyIsland7NacreV2(material: THREE.MeshPhysicalMaterial, strength = 0.38) {
  material.iridescence = strength;
  material.iridescenceIOR = 1.32;
  material.iridescenceThicknessRange = [180, 420];
  material.clearcoat = 0.72;
  material.clearcoatRoughness = 0.20;
  material.roughness = Math.min(material.roughness, 0.32);
  material.userData.island7Finish = 'shell-nacre';
  return material;
}
