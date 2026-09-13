import * as THREE from 'three';
import { compactStaticGeometry } from './CrownCitadelThreeModel';

/** Preserve authored geometry while batching the reversible enclosure apart
 * from the furniture and permanent floor. Construction sources stay untouched. */
export function compactFrostfireArchiveForInspection(building: THREE.Group) {
  const enclosure = new THREE.Group();
  enclosure.name = 'ISLAND_3_FROSTFIRE_INSPECTION_ENCLOSURE';
  enclosure.userData.archiveInspectionHide = true;
  const selected: THREE.Object3D[] = [];
  building.traverse((part) => {
    if (!part.userData.archiveInspectionHide) return;
    let ancestor = part.parent;
    while (ancestor && ancestor !== building) {
      if (ancestor.userData.archiveInspectionHide) return;
      ancestor = ancestor.parent;
    }
    selected.push(part);
  });
  building.add(enclosure);
  building.updateMatrixWorld(true);
  for (const part of selected) enclosure.attach(part);
  compactStaticGeometry(enclosure, 'ISLAND3_FROSTFIRE_INSPECTION_ENCLOSURE');
  compactStaticGeometry(building, 'ISLAND3_FROSTFIRE_PERMANENT_ROOM', (mesh) => {
    let ancestor: THREE.Object3D | null = mesh;
    while (ancestor && ancestor !== building) {
      if (ancestor === enclosure) return false;
      ancestor = ancestor.parent;
    }
    return true;
  });
  return enclosure;
}
