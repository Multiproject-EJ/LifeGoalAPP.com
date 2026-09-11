import * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';
import type { Island2CelestialMaterials } from './Island2CelestialThreeWorld';

export interface CelestialTreeOptions {
  kind: 'cloud-blossom' | 'windswept';
  seed: number;
  height: number;
  /** Branch-tip radius before the smaller canopy lobes are added. */
  spread: number;
}

export interface CelestialPlantClusterOptions {
  kind: 'fern' | 'shrub' | 'flowers';
  seed: number;
  radius?: number;
  height?: number;
}

function randomSource(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function taperedBranch(points: THREE.Vector3[], startRadius: number, endRadius: number, quality: Island3DQuality) {
  const curve = new THREE.CatmullRomCurve3(points);
  const lengthSegments = quality === 'high' ? 12 : quality === 'medium' ? 9 : 3;
  const radialSegments = quality === 'low' ? 5 : 7;
  const geometry = new THREE.TubeGeometry(curve, lengthSegments, 1, radialSegments, false);
  const positions = geometry.getAttribute('position');
  for (let ring = 0; ring <= lengthSegments; ring += 1) {
    const t = ring / lengthSegments;
    const center = curve.getPointAt(t);
    const radius = THREE.MathUtils.lerp(startRadius, endRadius, Math.pow(t, 0.72));
    for (let side = 0; side <= radialSegments; side += 1) {
      const index = ring * (radialSegments + 1) + side;
      const position = new THREE.Vector3().fromBufferAttribute(positions, index).sub(center).multiplyScalar(radius).add(center);
      positions.setXYZ(index, position.x, position.y, position.z);
    }
  }
  geometry.computeVertexNormals();
  return geometry;
}

function canopyLobe(quality: Island3DQuality) {
  const geometry = quality === 'low' ? new THREE.IcosahedronGeometry(1, 0) : new THREE.SphereGeometry(1, quality === 'high' ? 12 : 9, 7);
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const variation = 1 + 0.085 * Math.sin(x * 8 + z * 3) * Math.cos(y * 7 - z * 5);
    positions.setXYZ(i, x * variation, y * variation, z * variation);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Botanical geometry is deterministic and owned by this one returned tree. */
export function createCelestialTree(options: CelestialTreeOptions, quality: Island3DQuality, materials: Island2CelestialMaterials): THREE.Group {
  const root = new THREE.Group();
  root.name = `CELESTIAL_TREE_${options.kind}_${options.seed}`;
  const random = randomSource(options.seed);
  const height = options.height;
  const spread = options.spread;
  const lean = options.kind === 'windswept' ? spread * 0.24 : spread * 0.035;
  const material = materials.bark;
  const branches: Array<{ points: THREE.Vector3[]; start: number; end: number }> = [];
  branches.push({ points: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(-height * 0.035, height * 0.23, 0.015),
    new THREE.Vector3(height * 0.018 + lean * 0.36, height * 0.49, -0.025), new THREE.Vector3(lean, height * 0.82, 0)],
  start: height * 0.066, end: height * 0.018 });
  for (let i = 0; i < 4; i += 1) {
    const angle = i / 4 * Math.PI * 2 + 0.2;
    branches.push({ points: [new THREE.Vector3(Math.cos(angle) * height * 0.14, 0.015, Math.sin(angle) * height * 0.14),
      new THREE.Vector3(Math.cos(angle) * height * 0.08, height * 0.075, Math.sin(angle) * height * 0.08), new THREE.Vector3(0, height * 0.21, 0)],
    start: height * 0.025, end: height * 0.035 });
  }
  const tips: THREE.Vector3[] = [];
  for (let i = 0; i < 7; i += 1) {
    const angle = i / 7 * Math.PI * 2 + 0.27;
    const radius = spread * (0.64 + random() * 0.27);
    const startHeight = height * (0.30 + (i % 3) * 0.12);
    const tip = new THREE.Vector3(Math.cos(angle) * radius + lean, height * (0.67 + random() * 0.13), Math.sin(angle) * radius);
    const midpoint = new THREE.Vector3(tip.x * 0.53, height * (0.55 + (i % 2) * 0.06), tip.z * 0.50);
    branches.push({ points: [new THREE.Vector3(lean * 0.30, startHeight, 0), midpoint, tip], start: height * 0.039, end: height * 0.011 });
    const fork = tip.clone().add(new THREE.Vector3(Math.cos(angle + 0.9) * spread * 0.22, height * 0.09, Math.sin(angle + 0.9) * spread * 0.22));
    branches.push({ points: [midpoint, midpoint.clone().lerp(fork, 0.62), fork], start: height * 0.021, end: height * 0.008 });
    tips.push(tip, fork);
  }
  branches.forEach((branch, index) => {
    const mesh = new THREE.Mesh(taperedBranch(branch.points, branch.start, branch.end, quality), material);
    mesh.name = `TREE_${options.seed}_ROOTED_BRANCH_${index}`;
    mesh.userData.constructionStage = 2;
    mesh.castShadow = quality === 'high';
    mesh.receiveShadow = true;
    root.add(mesh);
  });
  root.userData.branchSockets = tips.map(tip => tip.toArray());
  const leafMaterials = options.kind === 'cloud-blossom'
    ? [materials.foliageLight, materials.blossomWhite, materials.blossomWhite]
    : [materials.foliageDark, materials.foliageMid, materials.foliageLight];
  const lobesPerTip = quality === 'low' ? 3 : 1;
  const counts = leafMaterials.map((_, materialIndex) => tips.filter((__, i) => i % 3 === materialIndex).length * lobesPerTip);
  const geometry = canopyLobe(quality);
  const matrix = new THREE.Matrix4();
  leafMaterials.forEach((leafMaterial, materialIndex) => {
    const canopy = new THREE.InstancedMesh(geometry, leafMaterial, counts[materialIndex]);
    canopy.name = `TREE_${options.seed}_BRANCH_CROWNS_${materialIndex}`;
    canopy.userData.constructionStage = 4;
    canopy.castShadow = quality === 'high';
    canopy.receiveShadow = true;
    let instance = 0;
    tips.forEach((tip, index) => {
      if (index % 3 !== materialIndex) return;
      const lobeScale = 0.85 + random() * 0.28;
      const scale = new THREE.Vector3(spread * 0.40 * lobeScale, height * (options.kind === 'cloud-blossom' ? 0.13 : 0.095) * lobeScale, spread * 0.34 * lobeScale);
      matrix.compose(tip.clone().add(new THREE.Vector3(0, height * 0.055, 0)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.05, index * 0.73, index % 2 ? 0.07 : -0.06)), scale);
      if (quality === 'low') {
        for (let lobe = 0; lobe < lobesPerTip; lobe++) {
          const angle = lobe * Math.PI * 2 / lobesPerTip + index;
          const at = tip.clone().add(new THREE.Vector3(Math.cos(angle) * scale.x * .36, height * .065 + (lobe % 2) * scale.y * .28, Math.sin(angle) * scale.z * .36));
          matrix.compose(at, new THREE.Quaternion().setFromEuler(new THREE.Euler(.12, angle, .08)), scale.clone().multiplyScalar(.69));
          canopy.setMatrixAt(instance++, matrix);
        }
      } else canopy.setMatrixAt(instance++, matrix);
    });
    canopy.instanceMatrix.needsUpdate = true;
    root.add(canopy);
  });
  return root;
}

/** Small rooted planting patches for garden beds; no particles or state writes. */
export function createCelestialPlantCluster(options: CelestialPlantClusterOptions, quality: Island3DQuality, materials: Island2CelestialMaterials): THREE.Group {
  const root = new THREE.Group();
  root.name = `CELESTIAL_PLANT_${options.kind}_${options.seed}`;
  const random = randomSource(options.seed);
  const radius = options.radius ?? 0.23;
  const height = options.height ?? 0.20;
  const count = options.kind === 'fern' ? 9 : quality === 'low' ? (options.kind === 'flowers' ? 15 : 12) : 7;
  const geometry = canopyLobe(quality);
  const material = options.kind === 'flowers' ? materials.blossomLilac : options.kind === 'fern' ? materials.foliageLight : materials.foliageMid;
  const leaves = new THREE.InstancedMesh(geometry, material, count);
  leaves.name = `${root.name}_ROOTED_CANOPY`;
  leaves.userData.constructionStage = 5;
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < count; i += 1) {
    const angle = i / count * Math.PI * 2;
    const reach = radius * (0.2 + random() * 0.65);
    const position = new THREE.Vector3(Math.sin(angle) * reach, height * (0.32 + random() * 0.22), Math.cos(angle) * reach);
    const scale = options.kind === 'fern' ? new THREE.Vector3(radius * 0.15, height * 0.18, radius * 0.70)
      : new THREE.Vector3(radius * 0.45, height * 0.45, radius * 0.37);
    matrix.compose(position, new THREE.Quaternion().setFromEuler(new THREE.Euler(options.kind === 'fern' ? -0.35 : 0, angle, 0)), scale);
    leaves.setMatrixAt(i, matrix);
  }
  leaves.instanceMatrix.needsUpdate = true;
  leaves.castShadow = quality === 'high';
  leaves.receiveShadow = true;
  root.add(leaves);
  return root;
}
