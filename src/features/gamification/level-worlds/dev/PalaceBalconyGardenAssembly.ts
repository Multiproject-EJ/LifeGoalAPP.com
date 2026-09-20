import * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';
import { createPalaceBalconyPlanting, PALACE_PLANTING_BAY } from './PalaceBalconyPlanting';

/** Palace-local socket measurements; no change to the approved bay or palace. */
export const PALACE_GARDEN_SOCKETS = Object.freeze([
  ...[-.60, -.34, .34, .60].map((angle, index) => ({
    id: `lower-${index}`, level: 1, angle, radius: 1.565, y: 0, supportTop: 1.52,
  })),
  ...[-.76, -.38, 0, .38, .76].map((angle, index) => ({
    id: `upper-${index}`, level: 2, angle, radius: 1.35, y: 1.33, supportTop: 2.85,
  })),
]);

/** Shared source geometry/materials; construction retains separately named bays.
 * Normal runtime compacts the entire group to three material draws. Repetition
 * still increases drawn triangles, so this is DEV-only until world budgets pass. */
export function createPalaceBalconyGardenAssembly(level: 1 | 2 | 3, quality: Island3DQuality, stone: THREE.Material) {
  const root = new THREE.Group();
  root.name = 'palace-balcony-gardens';
  root.userData = { partId: root.name, landmarkId: 'boss', prototype: true,
    sculptRuntime: { clickable: true, explodable: true, destructionGroups: [] as string[] } };
  const source = createPalaceBalconyPlanting(quality, stone);
  for (const socket of PALACE_GARDEN_SOCKETS) {
    if (level < socket.level) continue;
    const bay = source.clone(true);
    const radialOffset = socket.radius - PALACE_PLANTING_BAY.radius;
    bay.name = `palace-garden-${socket.id}`;
    bay.rotation.y = socket.angle;
    bay.position.set(Math.sin(socket.angle) * radialOffset, socket.y, Math.cos(socket.angle) * radialOffset);
    bay.userData.partId = bay.name;
    // Keep a review socket after normal material compaction lifts the meshes
    // into the assembly root; the named bay transform remains in the hierarchy.
    bay.userData.microscopeLocalCenter = [0, 1.68, PALACE_PLANTING_BAY.radius];
    bay.userData.attachment = { parentSocket: socket.level === 1 ? 'lower-balcony-floor' : 'upper-balcony-floor',
      contactType: 'overlap', overlap: .02, supportTop: socket.supportTop };
    for (const part of bay.children) {
      part.name = `${bay.name}-${part.name}`;
      part.userData.partId = part.name;
      part.traverse(node => {
        if (!(node instanceof THREE.Mesh)) return;
        node.name = `${socket.id}-${node.name}`;
        node.userData.partId = part.name;
      });
    }
    root.userData.sculptRuntime.destructionGroups.push(bay.name);
    root.add(bay);
  }
  return root;
}
