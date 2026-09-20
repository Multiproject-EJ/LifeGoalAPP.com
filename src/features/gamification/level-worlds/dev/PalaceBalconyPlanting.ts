import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Island3DQuality } from './island5ThreePilotContract';

/** Representative supported bay, not an independently scaled palace replacement.
 * Coordinates are palace-local, before its existing .24 plinth lift. */
export const PALACE_PLANTING_BAY = Object.freeze({
  radius: 1.565, angle: .34, bottom: 1.50, soil: 1.605, maxY: 1.86,
  width: .38, depth: .13, supportOverlap: .02,
});

/** Curved, closed leaf/petal lamina; not a sphere or a camera-facing card. */
function lamina(length: number, width: number, cup: number) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(-width, length * .25, -width * .75, length * .78, 0, length);
  shape.bezierCurveTo(width * .75, length * .78, width, length * .25, 0, 0);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .004, bevelEnabled: false, curveSegments: 4 });
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const t = positions.getY(i) / length;
    positions.setZ(i, positions.getZ(i) + cup * t * t);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function createPalaceBalconyPlanting(quality: Island3DQuality, stone: THREE.Material) {
  const root = new THREE.Group();
  root.name = 'palace-planting-prototype';
  root.rotation.y = PALACE_PLANTING_BAY.angle;
  root.userData = { partId: root.name, landmarkId: 'boss', prototype: true,
    attachment: { parentSocket: 'supported-balcony-top', contactType: 'overlap', overlap: .02 },
    sculptRuntime: { clickable: true, explodable: true, destructionGroups: ['palace-planters', 'palace-planting'] } };
  const planter = new THREE.Group(); planter.name = 'palace-planters'; root.add(planter);
  const planting = new THREE.Group(); planting.name = 'palace-planting'; root.add(planting);
  const botanical = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .78 });
  const soil = new THREE.MeshStandardMaterial({ color: 0x443528, roughness: 1 });
  const buckets: Record<string, THREE.BufferGeometry[]> = { trough: [], soil: [], foliage: [], flowers: [] };
  const pose = new THREE.Object3D();
  const push = (bucket: keyof typeof buckets, geometry: THREE.BufferGeometry, x: number, y: number, z: number,
    rotation: [number, number, number] = [0, 0, 0], scale: [number, number, number] = [1, 1, 1], color?: number) => {
    const copy = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    pose.position.set(x, y, z); pose.rotation.set(...rotation); pose.scale.set(...scale); pose.updateMatrix();
    copy.applyMatrix4(pose.matrix);
    // Proof views share one material. Keep the attribute schema identical so
    // the existing runtime compactor can retain every planting/support mesh.
    {
      const c = new THREE.Color(color ?? 0xffffff), count = copy.getAttribute('position').count;
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) colors.set([c.r, c.g, c.b], i * 3);
      copy.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    buckets[bucket].push(copy);
  };
  const box = new THREE.BoxGeometry(1, 1, 1);
  const r = PALACE_PLANTING_BAY.radius;
  // Five touching panels form a real open trough; soil lies inside the rim.
  push('trough', box, 0, 1.515, r, [0, 0, 0], [.38, .03, .13]);
  for (const side of [-1, 1]) {
    push('trough', box, 0, 1.565, r + side * .055, [0, 0, 0], [.38, .11, .02]);
    push('trough', box, side * .18, 1.565, r, [0, 0, 0], [.02, .11, .13]);
  }
  push('soil', box, 0, 1.59, r, [0, 0, 0], [.34, .03, .09]);
  const leaf = lamina(.105, .032, .033);
  const petal = lamina(.043, .020, .012);
  const stem = new THREE.CylinderGeometry(.004, .005, 1, 5);
  const centre = new THREE.SphereGeometry(.009, 8, 5);
  const count = quality === 'low' ? 5 : 7;
  const greens = [0x24643b, 0x3f8e49, 0x74a34f];
  const petals = [0xef7295, 0xffc0c3, 0xffe7bf, 0xe88b68, 0xd55784];
  for (let i = 0; i < count; i++) {
    const x = -.135 + .27 * i / (count - 1);
    const z = r + (i % 2 ? .027 : -.026);
    const height = .190 + (i % 3) * .017;
    const base = 1.59, top = base + height;
    push('foliage', stem, x, base + height / 2, z, [0, 0, 0], [1, height, 1], greens[0]);
    for (const side of [-1, 1]) {
      push('foliage', leaf, x, base + .075, z, [-.45, side * .35, side * .95], [1.1, 1.1, 1.1], greens[(i + (side > 0 ? 1 : 0)) % 3]);
      push('foliage', leaf, x, top - .035, z, [.2, side * .5, side * .95], [1, 1, 1], greens[(i + 1) % 3]);
    }
    // Face gently outward/upward; every petal root embeds in its centre.
    const flowerPose = new THREE.Object3D();
    flowerPose.position.set(x, top, z); flowerPose.rotation.x = -.6; flowerPose.updateMatrix();
    for (let j = 0; j < 5; j++) {
      const p = petal.clone().applyMatrix4(new THREE.Matrix4().makeRotationZ(j * Math.PI * 2 / 5));
      p.applyMatrix4(flowerPose.matrix);
      push('flowers', p, 0, 0, 0, [0, 0, 0], [1, 1, 1], petals[i % petals.length]);
      p.dispose();
    }
    push('flowers', centre, x, top, z + .005, [0, 0, 0], [1, 1, 1], 0xf4c85c);
  }
  for (const [key, material, stage, parent] of [
    ['trough', stone, 4, planter], ['soil', soil, 4, planter],
    ['foliage', botanical, 5, planting], ['flowers', botanical, 5, planting],
  ] as const) {
    const geometry = mergeGeometries(buckets[key], false);
    if (!geometry) throw new Error('Palace planting geometry could not be merged: ' + key);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'PALACE_GARDEN_BAY_' + key.toUpperCase();
    mesh.userData = { landmarkId: 'boss', partId: parent.name, constructionStage: stage, explodeWithParent: true };
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
    buckets[key].forEach(g => g.dispose());
  }
  [box, leaf, petal, stem, centre].forEach(g => g.dispose());
  return root;
}
