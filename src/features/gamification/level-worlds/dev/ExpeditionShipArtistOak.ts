import * as THREE from 'three';
import low from '../../../../../.img2threejs/expedition-ship/interior-production-2026-09-09-artist-oak/julius-adaptation/artist-oak-low-v002-repaired.json';
import high from '../../../../../.img2threejs/expedition-ship/interior-production-2026-09-09-artist-oak/julius-adaptation/artist-oak-high-v002-repaired.json';
import cc0Low from '../../../../../.img2threejs/expedition-ship/interior-production-2026-09-09-artist-oak/polyhaven-adaptation/polyhaven-oak-low-v002.json';
import cc0High from '../../../../../.img2threejs/expedition-ship/interior-production-2026-09-09-artist-oak/polyhaven-adaptation/polyhaven-oak-high-v002.json';
import {HOLLOW_OAK, type OakCirculationDimensions} from './ExpeditionShipHollowOak';

export const ARTIST_OAK_CIRCULATION: OakCirculationDimensions = Object.freeze({
  ...HOLLOW_OAK, innerX: .16, innerZ: .16, outerX: .275, outerZ: .275,
  stairInner: .04, stairOuter: .14, steps: 144, turns: 4,
  deckX: .72, deckZ: .48, railHeight: .066, railRadius: .0025, treadDepth: .006,
});

/** Opt-in source adaptation, not an accepted production tree.
 * Mesh assets derive from Julius Krischan Makowka's Old oak tree, CC-BY-SA3.0.
 * Full source, modification and license record stays with the separate asset.
 */
export function createArtistOakGeometry(ultra: boolean, source: 'julius'|'polyhaven'='julius') {
  const data = source==='polyhaven'?(ultra?cc0High:cc0Low):(ultra ? high : low);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
  geometry.setIndex(data.indices);
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  geometry.userData = {source: data.source, license: data.license, productionApproved: false};
  return geometry;
}
