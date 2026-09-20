import * as THREE from 'three';
import low from '../../../../../.img2threejs/expedition-ship/interior-production-2026-09-08-sculpted-route/inhabited-oak-low-v002.json';
import high from '../../../../../.img2threejs/expedition-ship/interior-production-2026-09-08-sculpted-route/inhabited-oak-high-v002.json';
import {HOLLOW_OAK, type OakCirculationDimensions} from './ExpeditionShipHollowOak';
import subdivisionLow from '../../../../../.img2threejs/expedition-ship/interior-production-2026-09-08-sculpted-route/subdivision-oak-low-v002.json';
import subdivisionHigh from '../../../../../.img2threejs/expedition-ship/interior-production-2026-09-08-sculpted-route/subdivision-oak-high-v002.json';

export const SCULPTED_OAK_CIRCULATION: OakCirculationDimensions = Object.freeze({
  ...HOLLOW_OAK, innerX: .29, innerZ: .28, outerX: .55, outerZ: .395,
  stairInner: .07, stairOuter: .25, steps: 72,
});

/** Offline-authored organic surface. Circulation and ship remain procedural.
 * Synchronous baked data keeps one persistent, immediately available scene graph.
 * This is an opt-in unapproved study, not a production promotion.
 */
export function createSculptedOakGeometry(ultra: boolean, subdivision = false) {
  const asset = subdivision ? (ultra ? subdivisionHigh : subdivisionLow) : ultra ? high : low;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(asset.positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(asset.normals, 3));
  geometry.setIndex(asset.indices);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.userData = {authoring: 'offline-blender', family: subdivision ? 'connected-subdivision' : 'voxel-union', version: 'v002', provenance: asset.provenance};
  return geometry;
}
