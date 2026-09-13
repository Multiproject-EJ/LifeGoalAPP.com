import * as THREE from 'three';

export interface MoonwellThermalPresentation {
  heated: boolean;
  running: boolean;
  sequence: number;
  /** Development evidence only; never changes canonical restoration. */
  previewProgress?: number;
}
export const MOONWELL_THAW_SECONDS = 10;
export function resolveMoonwellThawFrame(progress: number) {
  const t = THREE.MathUtils.clamp(progress, 0, 1);
  return { progress: t, phase: t < 0.45 ? 'Melting the deep ice' : t < 0.78 ? 'Warming the moonwell' : t < 1 ? 'First bubbles rising' : 'Moonwell restored' };
}

/** Animates authored basin nodes only; geometry and canonical state have other owners. */
export function createMoonwellThermalAnimator(root: THREE.Object3D) {
  const parts: { node: THREE.Object3D; role: string; position: THREE.Vector3; scale: THREE.Vector3; material?: THREE.Material | THREE.Material[]; owned: THREE.Material[] }[] = [];
  root.traverse(node => {
    const role = node.userData.moonwellThermalRole;
    if (typeof role !== 'string') return;
    const material = node instanceof THREE.Mesh ? node.material : undefined;
    const owned = material ? (Array.isArray(material) ? material : [material]).map(m => m.clone()) : [];
    if (node instanceof THREE.Mesh && material) node.material = Array.isArray(material) ? owned : owned[0];
    parts.push({ node, role, position: node.position.clone(), scale: node.scale.clone(), material, owned });
  });
  let sequence = -1;
  let startedAt = 0;
  return {
    update(presentation: MoonwellThermalPresentation, elapsed: number, reduced: boolean) {
      if (presentation.sequence !== sequence) { sequence = presentation.sequence; startedAt = elapsed; }
      const progress = presentation.previewProgress ?? (presentation.running && !reduced
        ? THREE.MathUtils.clamp((elapsed - startedAt) / MOONWELL_THAW_SECONDS, 0, 1)
        : presentation.heated ? 1 : 0);
      parts.forEach(({ node, role, position, scale, owned }, index) => {
        node.position.copy(position); node.scale.copy(scale);
        if (role === 'ice') {
          const melt = THREE.MathUtils.smoothstep(progress, (index % 5) * 0.04, 0.72);
          node.visible = melt < 0.995;
          // Lose thickness first; keep readable ice rafts through the middle
          // of the thaw instead of making their visible area vanish early.
          const remaining = Math.max(0.01, 1 - melt);
          const radius = Math.sqrt(remaining);
          node.scale.set(scale.x * radius, scale.y * remaining, scale.z * radius);
          node.position.y -= melt * 0.04;
        } else if (role === 'water') {
          node.visible = progress > 0.04;
          owned.forEach(material => {
            if (material instanceof THREE.MeshStandardMaterial) {
              material.color.set(0x6793aa).lerp(new THREE.Color(0x78ccc0), progress);
              material.roughness = 0.24;
            }
          });
        } else if (role === 'heater') {
          owned.forEach(material => {
            if (material instanceof THREE.MeshStandardMaterial) material.emissiveIntensity = progress * 1.4;
          });
        } else if (role === 'bubble' || role === 'steam') {
          node.visible = !reduced && progress > 0.75;
          const cycle = (elapsed * (role === 'steam' ? 0.28 : 0.65) + index * 0.21) % 1;
          const heat = THREE.MathUtils.smoothstep(progress, 0.75, 1);
          node.position.y += cycle * (role === 'steam' ? 0.55 : 0.09);
          node.scale.multiplyScalar(role === 'steam' ? 0.6 + cycle * 0.65 : 0.4 + Math.sin(cycle * Math.PI) * 0.7);
          owned.forEach(material => { material.transparent = true; material.depthWrite = false; material.opacity = heat * (1 - cycle) * (role === 'steam' ? 0.22 : 0.55); });
        }
      });
      return resolveMoonwellThawFrame(progress);
    },
    dispose() {
      parts.forEach(({ node, material, owned }) => { if (node instanceof THREE.Mesh && material) node.material = material; owned.forEach(m => m.dispose()); });
    },
  };
}
