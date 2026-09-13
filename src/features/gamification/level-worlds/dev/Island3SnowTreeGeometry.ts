import * as THREE from 'three';
import type { Island3FrostmoonMaterials } from './Island3FrostmoonThreeWorld';
import type { Island3DQuality } from './island5ThreePilotContract';

// A closed, spreading bough with a hanging tip. Both snow and needles have
// volume from every angle; shared geometry keeps the moving forest economical.
function boughGeometry(snow: boolean) {
  const outline = snow
    ? [[0, .02], [.32, .1], [.40, .38], [.28, .72], [.07, .95], [-.1, .94], [-.34, .64], [-.35, .22]]
    : [[0, .02], [.32, .1], [.42, .4], [.20, .78], [0, 1], [-.18, .78], [-.38, .48], [-.32, .1]];
  const positions: number[] = [], indices: number[] = [];
  const thickness = snow ? .10 : .065;
  for (const side of [1, -1]) {
    positions.push(0, side === 1 ? .15 : -.035, .38);
    for (const [x, z] of outline) positions.push(x, .10 * Math.sin(z * Math.PI) - .14 * z * z + (side === 1 ? thickness : -thickness * .45), z);
  }
  const count = outline.length + 1;
  for (let i = 1; i < count; i++) {
    const next = i === count - 1 ? 1 : i + 1;
    indices.push(0, next, i, count, i + count, next + count, i, next, i + count, next, next + count, i + count);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}
const needles = boughGeometry(false), snowLoad = boughGeometry(true);
const trunkGeometry = new THREE.CylinderGeometry(.022, .055, 1, 7);

export function createIsland3SnowTree(materials: Island3FrostmoonMaterials, quality: Island3DQuality, height: number, seed: number) {
  const tree = new THREE.Group();
  tree.name = 'ISLAND_3_LAYERED_ALPINE_SNOW_TREE';
  const variant = Math.abs(Math.floor(seed * 13)) % 3;
  tree.userData.treeSpecies = ['silver-spruce', 'windswept-fir', 'young-alpine-fir'][variant];
  const lean = variant === 1 ? .09 : .018;
  const trunk = new THREE.Mesh(trunkGeometry, materials.timberDark);
  trunk.scale.set(height, height, height); trunk.position.set(lean * height * .5, height * .5, 0); trunk.rotation.z = -lean;
  tree.add(trunk);
  const tiers = quality === 'low' || variant === 1 ? 3 : 4;
  const branches = quality === 'low' ? 4 : 5;
  for (let tier = 0; tier < tiers; tier++) {
    const t = tier / (tiers - 1);
    const y = height * (.22 + t * .64 + Math.sin(seed * 2.1 + tier * 1.8) * .025);
    const reach = height * (.34 - t * .255) * (variant === 0 ? .94 : variant === 1 ? 1.10 : .82);
    for (let branch = 0; branch < branches; branch++) {
      const angle = branch / branches * Math.PI * 2 + tier * (.67 + .21 * Math.sin(seed)) + seed;
      const variation = .84 + .18 * Math.sin(branch * 2.3 + tier * 1.7 + seed);
      const bough = new THREE.Mesh(needles, (tier + branch + variant) % 3 ? materials.pineDark : materials.pine);
      bough.position.set(lean * y, y + Math.sin(angle + seed) * height * .044, 0);
      bough.rotation.y = angle;
      bough.scale.set(reach * variation * 1.34, height * .40, reach * variation);
      tree.add(bough);
      // Snow lies on the branch, with exposed green margins and varied loads.
      if ((branch + tier + variant) % 6 !== 0 || tier === tiers - 1) {
        const cap = new THREE.Mesh(snowLoad, materials.snow);
        cap.position.copy(bough.position); cap.position.y += height * .026;
        cap.rotation.copy(bough.rotation);
        cap.scale.copy(bough.scale); cap.scale.x *= .79; cap.scale.z *= .89;
        tree.add(cap);
      }
    }
  }
  // A small irregular crown joins the last whorl rather than a separate spike.
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), materials.pine);
  crown.position.set(lean * height, height * .92, 0); crown.scale.set(height * .055, height * .10, height * .055); tree.add(crown);
  return tree;
}
