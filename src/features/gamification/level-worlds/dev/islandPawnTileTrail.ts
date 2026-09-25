import * as THREE from 'three';
import { tileTrailOpacity } from './islandPawnPresentation';

/** At most one reused halo per canonical tile. Materials never touch tile art. */
export function createIslandPawnTileTrail(scene: THREE.Scene, reducedMotion: boolean) {
  const root = new THREE.Group(); root.name = 'PAWN_FADING_TILE_TRAIL'; scene.add(root);
  const geometry = new THREE.RingGeometry(0.22, 0.48, 32);
  const entries = new Map<number, { mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>; at: number; landing: boolean }>();
  return {
    mark(index: number, point: readonly [number, number, number], at: number, landing: boolean) {
      if (reducedMotion && !landing) return;
      let entry = entries.get(index);
      if (!entry) {
        const material = new THREE.MeshBasicMaterial({ color: 0x76eaff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2 });
        const mesh = new THREE.Mesh(geometry, material); mesh.rotation.x = -Math.PI / 2;
        root.add(mesh); entry = { mesh, at, landing }; entries.set(index, entry);
      }
      entry.at = at; entry.landing = landing;
      entry.mesh.position.set(point[0], point[1] + 0.025, point[2]);
      entry.mesh.material.color.setHex(landing ? 0xe3ffff : 0x58ccff);
      entry.mesh.scale.setScalar(landing ? 1.22 : 1);
      entry.mesh.visible = true;
    },
    update(now: number, visible: boolean) {
      root.visible = visible;
      for (const entry of entries.values()) {
        entry.mesh.material.opacity = tileTrailOpacity(now - entry.at, entry.landing, reducedMotion);
        entry.mesh.visible = entry.mesh.material.opacity > 0.002;
      }
    },
    dispose() { scene.remove(root); geometry.dispose(); entries.forEach(entry => entry.mesh.material.dispose()); entries.clear(); },
  };
}
