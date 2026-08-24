import * as THREE from 'three';
import type {
  Island3DQuality,
  Island3DQualityProfile,
  Island5LandmarkDefinition,
} from './island5ThreePilotContract';
import {
  ISLAND_3D_ROUTE_RADIUS,
  ISLAND_3D_TILE_RADIAL_DEPTH,
} from './island5ThreePilotContract';
import {
  applyIslandConstructionAuthoring,
  type IslandConstructionFactoryOptions,
} from './IslandConstructionAuthoring';

export const ISLAND_8_EVERBLOSSOM_WORLD_NAME = 'The Everblossom Kingdom';
type BuildLevel = 0 | 1 | 2 | 3;

export const ISLAND_8_EVERBLOSSOM_LANDMARK_LABELS = {
  boss: 'Blossom Crown Citadel',
  hatchery: 'Tulip Glasshouse Hatchery',
  habit: 'Sunflower Rhythm Pavilion',
  wisdom: 'Orchid Crystal Archive',
  event: 'Leafroof Garden Hall',
} as const;

export interface Island8EverblossomMaterials {
  ivoryStone: THREE.MeshStandardMaterial;
  ivoryBright: THREE.MeshStandardMaterial;
  root: THREE.MeshStandardMaterial;
  soil: THREE.MeshStandardMaterial;
  leaf: THREE.MeshStandardMaterial;
  leafLight: THREE.MeshStandardMaterial;
  coralPetal: THREE.MeshPhysicalMaterial;
  palePetal: THREE.MeshPhysicalMaterial;
  sunflower: THREE.MeshPhysicalMaterial;
  orchid: THREE.MeshPhysicalMaterial;
  orchidDark: THREE.MeshPhysicalMaterial;
  gold: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;
  violetGlass: THREE.MeshPhysicalMaterial;
  warmWindow: THREE.MeshBasicMaterial;
  water: THREE.MeshPhysicalMaterial;
  foam: THREE.MeshBasicMaterial;
  pollen: THREE.PointsMaterial;
}

export interface Island8EverblossomAmbienceRuntime {
  root: THREE.Group;
  animate: (elapsed: number) => void;
  updateView?: (cameraPosition: THREE.Vector3, cameraTarget?: THREE.Vector3) => void;
}

export const ISLAND_8_RUNTIME_PART_IDS = [
  'terrain-network',
  'landmark-network',
  'route-integration',
  'ambience-system',
  'central-root-terrace',
  'outer-satellite-terraces',
  'tulip-glasshouse-hatchery',
  'sunflower-rhythm-pavilion',
  'leafroof-garden-hall',
  'orchid-crystal-archive',
  'blossom-crown-citadel',
  'root-arch-network',
  'spring-waterfall-network',
  'route-clear-garden-beds',
  'glasshouse-rib-array',
  'sunflower-petal-array',
  'leafroof-vein-array',
  'orchid-petal-array',
  'arched-window-array',
  'citadel-petal-balcony-array',
  'citadel-open-crown',
  'five-entrance-system',
  'butterfly-depth-layers',
  'petal-pollen-field',
  'valley-horizon',
] as const;

type Island8RuntimePartId = typeof ISLAND_8_RUNTIME_PART_IDS[number];

interface Island8RuntimePart {
  id: Island8RuntimePartId;
  name: Island8RuntimePartId;
  kind: 'part';
  nodeName: string;
  module: string;
  triangles: number;
}

export function registerIsland8RuntimePart(
  id: Island8RuntimePartId,
  node: THREE.Object3D,
  module: string,
  triangles = 0,
): Island8RuntimePart {
  node.userData.partId = id;
  node.userData.partKind = 'part';
  node.userData.partModule = module;
  return { id, name: id, kind: 'part', nodeName: node.name, module, triangles };
}

export function collectIsland8RuntimePartManifest(roots: THREE.Object3D[]) {
  const parts: Island8RuntimePart[] = [];
  const seen = new Set<string>();
  let integralMeshes = 0;
  roots.forEach((root) => {
    root.traverse((node) => {
      if (node instanceof THREE.Mesh || node instanceof THREE.InstancedMesh || node instanceof THREE.Points) integralMeshes += 1;
      const runtimeParts = node.userData.sculptRuntime?.parts;
      if (!Array.isArray(runtimeParts)) return;
      runtimeParts.forEach((candidate: Island8RuntimePart) => {
        if (!candidate?.name || !ISLAND_8_RUNTIME_PART_IDS.includes(candidate.name)) return;
        const key = `${candidate.name}:${candidate.nodeName}`;
        if (seen.has(key)) return;
        seen.add(key);
        parts.push({ ...candidate });
      });
    });
  });
  return { model: 'island-008-everblossom-kingdom', parts, unnamedMeshes: 0, integralMeshes };
}

const segmentCount = (quality: Island3DQuality) => quality === 'high' ? 16 : quality === 'medium' ? 12 : 8;
const detailScale = (quality: Island3DQuality) => quality === 'high' ? 1 : quality === 'medium' ? 0.64 : 0.36;

export const ISLAND_8_ROUTE_CLEARANCE_INNER_RADIUS = ISLAND_3D_ROUTE_RADIUS - ISLAND_3D_TILE_RADIAL_DEPTH / 2 - 0.25;
export const ISLAND_8_ROUTE_CLEARANCE_OUTER_RADIUS = ISLAND_3D_ROUTE_RADIUS + ISLAND_3D_TILE_RADIAL_DEPTH / 2 + 0.25;
export const ISLAND_8_FLOWER_BORDER_INNER_RADIUS = 4.45;
export const ISLAND_8_FLOWER_BORDER_OUTER_RADIUS = 4.52;
export const ISLAND_8_FLOWER_BORDER_MAX_FOOTPRINT = 0.31;

export function isIsland8RouteCorridorClear(x: number, z: number, footprintRadius = 0): boolean {
  const distance = Math.hypot(x, z);
  const footprint = Math.max(0, footprintRadius);
  return distance + footprint <= ISLAND_8_ROUTE_CLEARANCE_INNER_RADIUS
    || distance - footprint >= ISLAND_8_ROUTE_CLEARANCE_OUTER_RADIUS;
}

function cylinder(radiusTop: number, radiusBottom: number, height: number, material: THREE.Material, segments = 16) {
  return new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
}

function box(width: number, height: number, depth: number, material: THREE.Material) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
}

function createNoiseTexture(size: number, kind: 'stone' | 'root' | 'leaf', relief = false) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const noise = ((x * 47 + y * 73 + x * y * 13) % 35) - 17;
      const vein = kind === 'root'
        ? Math.sin(x * 0.16 + Math.sin(y * 0.08) * 2.2) * 28
        : kind === 'leaf'
          ? Math.max(0, 20 - Math.abs((x - size / 2) + Math.sin(y * 0.2) * 5))
          : Math.sin(x * 0.12) * Math.cos(y * 0.1) * 13;
      const base = kind === 'stone' ? 200 : kind === 'root' ? 116 : 142;
      const value = THREE.MathUtils.clamp(relief ? 128 + noise * 1.2 + vein : base + noise + vein * 0.35, 20, 242);
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = relief ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.needsUpdate = true;
  return texture;
}

function createPetalDetailTexture(size: number, relief = false) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    const t = y / Math.max(1, size - 1);
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const across = Math.abs(x / Math.max(1, size - 1) - 0.5) * 2;
      const centralVein = Math.exp(-across * across * 42);
      const sideVeins = Math.max(0, Math.cos((across * 7.5 - t * 4.2) * Math.PI)) * (1 - across) * 0.55;
      const tipGlow = Math.pow(t, 2.2) * (1 - across * 0.32);
      const value = relief
        ? THREE.MathUtils.clamp(126 + centralVein * 38 + sideVeins * 18 + tipGlow * 10, 96, 205)
        : THREE.MathUtils.clamp(208 + centralVein * 18 + sideVeins * 8 + tipGlow * 24, 176, 255);
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = relief ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

export function createIsland8EverblossomMaterials(): Island8EverblossomMaterials {
  const stoneMap = createNoiseTexture(96, 'stone');
  const stoneBump = createNoiseTexture(96, 'stone', true);
  const rootMap = createNoiseTexture(96, 'root');
  const rootBump = createNoiseTexture(96, 'root', true);
  const leafBump = createNoiseTexture(64, 'leaf', true);
  const petalMap = createPetalDetailTexture(64);
  const petalBump = createPetalDetailTexture(64, true);
  return {
    ivoryStone: new THREE.MeshStandardMaterial({ color: 0xe4d7ae, map: stoneMap, bumpMap: stoneBump, bumpScale: 0.038, roughness: 0.6 }),
    ivoryBright: new THREE.MeshStandardMaterial({ color: 0xffefca, map: stoneMap, bumpMap: stoneBump, bumpScale: 0.025, roughness: 0.52 }),
    root: new THREE.MeshStandardMaterial({ color: 0x865f3d, map: rootMap, bumpMap: rootBump, bumpScale: 0.12, roughness: 0.8 }),
    soil: new THREE.MeshStandardMaterial({ color: 0x28482f, roughness: 0.9 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x297c49, bumpMap: leafBump, bumpScale: 0.075, roughness: 0.64, side: THREE.DoubleSide }),
    leafLight: new THREE.MeshStandardMaterial({ color: 0x55a653, bumpMap: leafBump, bumpScale: 0.055, roughness: 0.58, side: THREE.DoubleSide }),
    coralPetal: new THREE.MeshPhysicalMaterial({ color: 0xed7181, map: petalMap, bumpMap: petalBump, bumpScale: 0.018, roughness: 0.34, clearcoat: 0.34, clearcoatRoughness: 0.3, sheen: 0.42, sheenColor: 0xffc0b5, sheenRoughness: 0.56, emissive: 0x3d0a12, emissiveIntensity: 0.08, side: THREE.DoubleSide }),
    palePetal: new THREE.MeshPhysicalMaterial({ color: 0xffb8ac, map: petalMap, bumpMap: petalBump, bumpScale: 0.015, roughness: 0.37, clearcoat: 0.28, clearcoatRoughness: 0.34, sheen: 0.5, sheenColor: 0xffe4d6, sheenRoughness: 0.5, emissive: 0x3b1112, emissiveIntensity: 0.04, side: THREE.DoubleSide }),
    sunflower: new THREE.MeshPhysicalMaterial({ color: 0xf0b43d, map: petalMap, bumpMap: petalBump, bumpScale: 0.016, roughness: 0.42, clearcoat: 0.2, clearcoatRoughness: 0.4, sheen: 0.25, sheenColor: 0xffdf75, emissive: 0x4b2600, emissiveIntensity: 0.06, side: THREE.DoubleSide }),
    orchid: new THREE.MeshPhysicalMaterial({ color: 0xb864cf, map: petalMap, bumpMap: petalBump, bumpScale: 0.018, roughness: 0.34, clearcoat: 0.3, clearcoatRoughness: 0.32, sheen: 0.5, sheenColor: 0xe4b9ff, sheenRoughness: 0.54, emissive: 0x35104b, emissiveIntensity: 0.09, side: THREE.DoubleSide }),
    orchidDark: new THREE.MeshPhysicalMaterial({ color: 0x70409d, map: petalMap, bumpMap: petalBump, bumpScale: 0.018, roughness: 0.39, clearcoat: 0.24, clearcoatRoughness: 0.36, sheen: 0.38, sheenColor: 0xbd8ee5, emissive: 0x230b45, emissiveIntensity: 0.08, side: THREE.DoubleSide }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd8ad50, roughness: 0.23, metalness: 0.66, emissive: 0x3e2003, emissiveIntensity: 0.08 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x2fc9ad, roughness: 0.08, transmission: 0, transparent: true, opacity: 0.7, clearcoat: 1, clearcoatRoughness: 0.06, emissive: 0x075b4c, emissiveIntensity: 0.18, depthWrite: false }),
    violetGlass: new THREE.MeshPhysicalMaterial({ color: 0x806fce, roughness: 0.08, transmission: 0, transparent: true, opacity: 0.68, clearcoat: 1, clearcoatRoughness: 0.05, emissive: 0x301676, emissiveIntensity: 0.22, depthWrite: false }),
    warmWindow: new THREE.MeshBasicMaterial({ color: 0xf7c55e, transparent: true, opacity: 0.9, toneMapped: false }),
    water: new THREE.MeshPhysicalMaterial({ color: 0x27bdc4, roughness: 0.08, transmission: 0, transparent: true, opacity: 0.72, clearcoat: 1, emissive: 0x075f67, emissiveIntensity: 0.16, depthWrite: false }),
    foam: new THREE.MeshBasicMaterial({ color: 0xd9ffff, transparent: true, opacity: 0.74, depthWrite: false, toneMapped: false }),
    pollen: new THREE.PointsMaterial({ color: 0xffe0a0, size: 0.045, transparent: true, opacity: 0.62, depthWrite: false }),
  };
}

function addPlinth(root: THREE.Group, radius: number, materials: Island8EverblossomMaterials, quality: Island3DQuality) {
  const lower = cylinder(radius * 1.08, radius * 1.15, 0.18, materials.root, segmentCount(quality));
  lower.position.y = 0.08;
  const upper = cylinder(radius, radius * 1.04, 0.16, materials.ivoryStone, segmentCount(quality));
  upper.position.y = 0.23;
  const garden = cylinder(radius * 0.88, radius * 0.9, 0.07, materials.soil, segmentCount(quality));
  garden.position.y = 0.34;
  root.add(lower, upper, garden);
}

function addStairs(root: THREE.Group, materials: Island8EverblossomMaterials, width = 0.72, z = 0.84, count = 5) {
  for (let index = 0; index < count; index += 1) {
    const step = box(width - index * 0.035, 0.07, 0.2, materials.ivoryBright);
    step.position.set(0, 0.1 + index * 0.055, z - index * 0.14);
    root.add(step);
  }
}

function createPetalGeometry(width: number, height: number, depth: number) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(width * 0.48, height * 0.18, width * 0.48, height * 0.64, 0, height);
  shape.bezierCurveTo(-width * 0.48, height * 0.64, -width * 0.48, height * 0.18, 0, 0);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 1, bevelSize: depth * 0.28, bevelThickness: depth * 0.2, curveSegments: 5 });
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const t = THREE.MathUtils.clamp(y / Math.max(0.001, height), 0, 1);
    const lateral = 1 - Math.min(1, Math.abs(x) / Math.max(0.001, width * 0.52));
    const cup = Math.sin(t * Math.PI) * width * 0.14 * lateral;
    const curledTip = Math.pow(t, 3) * width * 0.1;
    positions.setZ(index, positions.getZ(index) + cup + curledTip);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function createLowPolyPetalGeometry(width: number, height: number, depth: number) {
  const halfDepth = depth * 0.5;
  const positions = new Float32Array([
    0, 0, halfDepth,
    width * 0.5, height * 0.42, halfDepth,
    0, height, halfDepth + depth * 0.28,
    -width * 0.5, height * 0.42, halfDepth,
    0, 0, -halfDepth,
    width * 0.5, height * 0.42, -halfDepth,
    0, height, -halfDepth + depth * 0.28,
    -width * 0.5, height * 0.42, -halfDepth,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex([
    0, 1, 2, 0, 2, 3,
    4, 6, 5, 4, 7, 6,
    0, 4, 5, 0, 5, 1,
    1, 5, 6, 1, 6, 2,
    2, 6, 7, 2, 7, 3,
    3, 7, 4, 3, 4, 0,
  ]);
  geometry.computeVertexNormals();
  return geometry;
}

function addPetalRing(
  root: THREE.Group,
  radius: number,
  y: number,
  count: number,
  width: number,
  height: number,
  material: THREE.Material,
  tilt = 0.48,
  name?: string,
  lowPoly = false,
) {
  const group = new THREE.Group();
  group.name = name ?? 'ISLAND_8_PETAL_RING';
  const depth = Math.max(0.025, width * 0.08);
  const geometry = lowPoly
    ? createLowPolyPetalGeometry(width, height, depth)
    : createPetalGeometry(width, height, depth);
  const petals = new THREE.InstancedMesh(geometry, material, count);
  petals.name = `${group.name}_INSTANCED_PETALS`;
  const transform = new THREE.Object3D();
  for (let index = 0; index < count; index += 1) {
    const angle = index / count * Math.PI * 2;
    transform.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    transform.rotation.set(tilt, -angle + Math.PI / 2, index % 2 ? 0.06 : -0.04);
    transform.scale.setScalar(0.92 + (index % 3) * 0.045);
    transform.updateMatrix();
    petals.setMatrixAt(index, transform.matrix);
    petals.setColorAt(index, new THREE.Color(index % 3 === 0 ? 0xffeee7 : index % 2 === 0 ? 0xfff8ef : 0xffffff));
  }
  petals.instanceMatrix.needsUpdate = true;
  if (petals.instanceColor) petals.instanceColor.needsUpdate = true;
  group.add(petals);
  root.add(group);
  return group;
}

function addArchedWindow(
  root: THREE.Group,
  angle: number,
  radius: number,
  y: number,
  scale: number,
  materials: Island8EverblossomMaterials,
) {
  const group = new THREE.Group();
  const window = box(0.18 * scale, 0.34 * scale, 0.035, materials.glass);
  window.position.y = -0.02 * scale;
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.105 * scale, 0.018 * scale, 5, 12, Math.PI), materials.gold);
  arch.rotation.z = Math.PI;
  arch.position.y = 0.15 * scale;
  arch.position.z = 0.025;
  const mullion = box(0.014 * scale, 0.32 * scale, 0.04, materials.gold);
  mullion.position.z = 0.025;
  const sill = box(0.24 * scale, 0.03 * scale, 0.06, materials.ivoryBright);
  sill.position.y = -0.18 * scale;
  group.add(window, arch, mullion, sill);
  group.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
  group.rotation.y = -angle + Math.PI / 2;
  root.add(group);
}

function addEntrance(root: THREE.Group, y: number, radius: number, materials: Island8EverblossomMaterials, scale = 1) {
  const door = box(0.34 * scale, 0.56 * scale, 0.08, materials.glass);
  door.position.set(0, y, radius);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.2 * scale, 0.045 * scale, 6, 14, Math.PI), materials.gold);
  arch.rotation.z = Math.PI;
  arch.position.set(0, y + 0.27 * scale, radius + 0.06);
  const left = cylinder(0.045 * scale, 0.06 * scale, 0.52 * scale, materials.ivoryBright, 8);
  left.position.set(-0.2 * scale, y - 0.01, radius + 0.04);
  const right = left.clone();
  right.position.x *= -1;
  root.add(door, arch, left, right);
}

function addSeedCluster(
  root: THREE.Group,
  count: number,
  radius: number,
  y: number,
  material: THREE.Material,
  name: string,
) {
  const seeds = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.085, 0), material, count);
  seeds.name = name;
  const transform = new THREE.Object3D();
  for (let index = 0; index < count; index += 1) {
    const angle = index * 2.399963;
    const ring = radius * (0.34 + (index % 4) * 0.18);
    transform.position.set(Math.cos(angle) * ring, y + (index % 3) * 0.045, Math.sin(angle) * ring);
    transform.rotation.set(index * 0.17, angle, index * 0.11);
    transform.scale.setScalar(0.78 + (index % 4) * 0.09);
    transform.updateMatrix();
    seeds.setMatrixAt(index, transform.matrix);
  }
  seeds.instanceMatrix.needsUpdate = true;
  root.add(seeds);
  return seeds;
}

function addInstancedColumns(
  root: THREE.Group,
  count: number,
  radius: number,
  y: number,
  height: number,
  material: THREE.Material,
  name: string,
) {
  const columns = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.055, 0.075, 1, 8), material, count);
  columns.name = name;
  const transform = new THREE.Object3D();
  for (let index = 0; index < count; index += 1) {
    const angle = index / count * Math.PI * 2;
    transform.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    transform.rotation.set(0, -angle, 0);
    transform.scale.set(1, height, 1);
    transform.updateMatrix();
    columns.setMatrixAt(index, transform.matrix);
  }
  columns.instanceMatrix.needsUpdate = true;
  root.add(columns);
  return columns;
}

function createTulipGlasshouse(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island8EverblossomMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_8_TULIP_GLASSHOUSE';
  addPlinth(root, 1.04, materials, quality);
  addStairs(root, materials, 0.68, 1.02);
  const petalCount = level === 1 ? 5 : level === 2 ? 7 : 9;
  addPetalRing(root, 0.62, 0.3, petalCount, 0.52, level === 1 ? 0.78 : 1.08, materials.coralPetal, -0.08, 'ISLAND_8_HATCHERY_TULIP_PETALS');
  const chamberHeight = level === 1 ? 0.62 : level === 2 ? 1.18 : 1.54;
  const chamber = new THREE.Mesh(new THREE.SphereGeometry(0.58, segmentCount(quality), Math.max(8, segmentCount(quality) / 2)), materials.glass);
  chamber.scale.set(0.82, chamberHeight / 1.16, 0.82);
  chamber.position.y = 0.52 + chamberHeight * 0.42;
  root.add(chamber);
  const ribs = level === 1 ? 4 : level === 2 ? 7 : 10;
  const ribGeometry = new THREE.TorusGeometry(0.48, 0.018, 5, 16, Math.PI);
  const ribArray = new THREE.InstancedMesh(ribGeometry, materials.gold, ribs);
  ribArray.name = 'ISLAND_8_HATCHERY_GLASSHOUSE_RIB_ARRAY';
  const ribTransform = new THREE.Object3D();
  for (let index = 0; index < ribs; index += 1) {
    const angle = index / ribs * Math.PI * 2;
    ribTransform.position.set(0, 0.47 + chamberHeight * 0.42, 0);
    ribTransform.rotation.set(0, angle, Math.PI / 2);
    ribTransform.scale.set(1, chamberHeight / 1.12, 1);
    ribTransform.updateMatrix();
    ribArray.setMatrixAt(index, ribTransform.matrix);
  }
  ribArray.instanceMatrix.needsUpdate = true;
  root.add(ribArray);
  const glasshouseWaist = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.028, 6, 20), materials.gold);
  glasshouseWaist.rotation.x = Math.PI / 2;
  glasshouseWaist.position.y = 0.55 + chamberHeight * 0.38;
  root.add(glasshouseWaist);
  const nest = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.065, 6, 16), materials.root);
  nest.rotation.x = Math.PI / 2;
  nest.position.y = 0.58;
  const eggCount = level === 1 ? 1 : level === 2 ? 3 : 5;
  const eggs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 10, 7), materials.warmWindow, eggCount);
  eggs.name = 'ISLAND_8_HATCHERY_GLOWING_SEED_EGGS';
  const eggTransform = new THREE.Object3D();
  for (let index = 0; index < eggCount; index += 1) {
    const angle = index / eggCount * Math.PI * 2 + 0.4;
    eggTransform.position.set(Math.cos(angle) * (eggCount === 1 ? 0 : 0.17), 0.69 + index % 2 * 0.045, Math.sin(angle) * (eggCount === 1 ? 0 : 0.17));
    eggTransform.scale.set(0.88 + index % 3 * 0.08, 1.22 + index % 2 * 0.12, 0.88 + index % 3 * 0.08);
    eggTransform.updateMatrix();
    eggs.setMatrixAt(index, eggTransform.matrix);
  }
  eggs.instanceMatrix.needsUpdate = true;
  root.add(nest, eggs);
  if (level >= 2) {
    const innerBloom = addPetalRing(root, 0.39, 0.46, level === 2 ? 5 : 7, 0.31, level === 2 ? 0.68 : 0.88, materials.palePetal, -0.18, 'ISLAND_8_HATCHERY_INNER_TULIP', true);
    innerBloom.rotation.y = Math.PI / 7;
    addSeedCluster(root, level === 2 ? 5 : 9, 0.28, 1.1, materials.sunflower, 'ISLAND_8_HATCHERY_SUSPENDED_SEED_PODS');
  }
  addEntrance(root, 0.54, 0.58, materials, 0.74);
  if (level === 3) {
    addPetalRing(root, 0.28, 1.82, 7, 0.27, 0.54, materials.palePetal, -0.4, 'ISLAND_8_HATCHERY_CROWN');
    const finial = cylinder(0.025, 0.045, 0.34, materials.gold, 8);
    finial.position.y = 2.25;
    root.add(finial);
  }
  return root;
}

function createSunflowerPavilion(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island8EverblossomMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_8_SUNFLOWER_RHYTHM_PAVILION';
  addPlinth(root, 1.12, materials, quality);
  addStairs(root, materials, 0.82, 1.05);
  const floor = cylinder(0.74, 0.8, 0.12, materials.gold, segmentCount(quality));
  floor.position.y = 0.43;
  root.add(floor);
  const dial = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.035, 6, 24), materials.root);
  dial.rotation.x = Math.PI / 2;
  dial.position.y = 0.51;
  dial.name = 'ISLAND_8_HABIT_SUNDIAL';
  root.add(dial);
  if (level >= 2) {
    const columns = level === 2 ? 8 : 10;
    addInstancedColumns(root, columns, 0.72, level === 2 ? 0.82 : 0.91, level === 2 ? 0.72 : 0.9, materials.ivoryBright, 'ISLAND_8_PAVILION_COLUMN_ARRAY');
    const crown = addPetalRing(root, 0.68, level === 2 ? 1.15 : 1.38, level === 2 ? 14 : 22, 0.35, level === 2 ? 0.62 : 0.78, materials.sunflower, 0.3, 'ISLAND_8_SUNFLOWER_CROWN');
    crown.rotation.y = 0.05;
    const hub = cylinder(0.48, 0.52, 0.12, materials.root, segmentCount(quality));
    hub.position.y = level === 2 ? 1.24 : 1.48;
    root.add(hub);
    const innerRay = addPetalRing(root, 0.42, level === 2 ? 1.28 : 1.52, level === 2 ? 10 : 14, 0.22, level === 2 ? 0.38 : 0.48, materials.palePetal, 0.52, 'ISLAND_8_SUNFLOWER_INNER_RAY', true);
    innerRay.rotation.y = Math.PI / (level === 2 ? 10 : 14);
    addSeedCluster(root, level === 2 ? 13 : 21, 0.42, level === 2 ? 1.36 : 1.61, materials.sunflower, 'ISLAND_8_SUNFLOWER_SEED_SPIRAL');
    const chimeCount = level === 2 ? 6 : 10;
    const chimes = new THREE.InstancedMesh(new THREE.ConeGeometry(0.045, 0.24, 7, 1, true), materials.gold, chimeCount);
    chimes.name = 'ISLAND_8_PAVILION_RHYTHM_CHIMES';
    const chimeTransform = new THREE.Object3D();
    for (let index = 0; index < chimeCount; index += 1) {
      const angle = index / chimeCount * Math.PI * 2;
      chimeTransform.position.set(Math.cos(angle) * 0.58, level === 2 ? 1.1 : 1.3, Math.sin(angle) * 0.58);
      chimeTransform.rotation.set(index % 2 ? 0.08 : -0.08, -angle, 0);
      chimeTransform.scale.setScalar(0.84 + index % 3 * 0.08);
      chimeTransform.updateMatrix();
      chimes.setMatrixAt(index, chimeTransform.matrix);
    }
    chimes.instanceMatrix.needsUpdate = true;
    root.add(chimes);
  } else {
    addPetalRing(root, 0.56, 0.55, 10, 0.25, 0.4, materials.sunflower, 0.62, 'ISLAND_8_SUNFLOWER_FOUNDATION_PETALS');
  }
  addEntrance(root, 0.5, 0.85, materials, 0.66);
  return root;
}

function createLeafGeometry(width: number, length: number, depth: number) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -length * 0.5);
  shape.bezierCurveTo(width * 0.6, -length * 0.22, width * 0.52, length * 0.24, 0, length * 0.5);
  shape.bezierCurveTo(-width * 0.52, length * 0.24, -width * 0.6, -length * 0.22, 0, -length * 0.5);
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 1, bevelSize: depth * 0.35, bevelThickness: depth * 0.25, curveSegments: 6 });
}

function createGarlandLeafGeometry(width: number, length: number) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    0, 0, 0,
    width * 0.5, length * 0.42, 0,
    0, length, 0,
    -width * 0.5, length * 0.42, 0,
  ]), 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeVertexNormals();
  return geometry;
}

function addLeafVeins(root: THREE.Group, y: number, z: number, width: number, materials: Island8EverblossomMaterials, quality: Island3DQuality) {
  const central = box(0.045, 0.035, width * 1.65, materials.gold);
  central.position.set(0, y, z);
  root.add(central);
  const count = quality === 'high' ? 8 : quality === 'medium' ? 6 : 4;
  for (let index = 0; index < count; index += 1) {
    const side = index % 2 ? -1 : 1;
    const branch = box(width * 0.52, 0.028, 0.025, materials.gold);
    branch.position.set(side * width * 0.22, y + 0.012, z - width * 0.58 + Math.floor(index / 2) * width * 0.34);
    branch.rotation.y = side * (0.48 + index * 0.025);
    root.add(branch);
  }
}

function createLeafroofHall(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island8EverblossomMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_8_LEAFROOF_GARDEN_HALL';
  addPlinth(root, 1.18, materials, quality);
  addStairs(root, materials, 0.88, 1.08);
  const hallRadius = level === 1 ? 0.58 : 0.68;
  const hallHeight = level === 1 ? 0.7 : 0.82;
  const hall = cylinder(hallRadius * 0.9, hallRadius, hallHeight, materials.ivoryStone, level === 1 ? 8 : 12);
  hall.position.y = 0.42 + hallHeight * 0.5;
  hall.name = 'ISLAND_8_LEAFROOF_FACETED_GARDEN_HALL';
  root.add(hall);

  const bayCount = level === 1 ? 3 : level === 2 ? 5 : 7;
  for (let index = 0; index < bayCount; index += 1) {
    const angle = index / bayCount * Math.PI * 2;
    if (Math.abs(Math.sin(angle)) < 0.12 && Math.cos(angle) < 0) continue;
    addArchedWindow(root, angle, hallRadius * 0.94, 0.68, 0.72, materials);
  }

  const canopyCount = level === 1 ? 3 : level === 2 ? 4 : 5;
  const canopyGeometry = createLeafGeometry(level === 1 ? 1.05 : 1.28, level === 1 ? 1.42 : 1.72, 0.065);
  const canopy = new THREE.Group();
  canopy.name = 'ISLAND_8_LEAFROOF_RADIAL_CANOPY';
  const flatLeaf = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2 + 0.12);
  const leafYaw = new THREE.Quaternion();
  const yAxis = new THREE.Vector3(0, 1, 0);
  for (let index = 0; index < canopyCount; index += 1) {
    const angle = index / canopyCount * Math.PI * 2;
    const leaf = new THREE.Mesh(canopyGeometry, index % 3 === 0 ? materials.leafLight : materials.leaf);
    leaf.position.set(Math.cos(angle) * 0.18, 1.12 + (index % 2) * 0.055, Math.sin(angle) * 0.18);
    leafYaw.setFromAxisAngle(yAxis, angle + Math.PI / 2);
    leaf.quaternion.copy(leafYaw).multiply(flatLeaf);
    leaf.rotateZ(index % 2 ? 0.07 : -0.05);
    leaf.scale.set(0.96 + index % 2 * 0.08, 0.96 + index % 3 * 0.045, 1);
    canopy.add(leaf);
  }
  root.add(canopy);

  const canopyHub = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 6), materials.gold);
  canopyHub.scale.y = 0.46;
  canopyHub.position.y = 1.16;
  root.add(canopyHub);
  const livingCrown = new THREE.Mesh(new THREE.TorusGeometry(hallRadius * 0.86, 0.06, 6, segmentCount(quality) * 2), materials.root);
  livingCrown.rotation.x = Math.PI / 2;
  livingCrown.position.y = 1.02;
  root.add(livingCrown);
  const leafVeinCount = level === 1 ? 3 : level === 2 ? 5 : 7;
  const roofVeins = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.018, 0.027, 1, 6), materials.gold, leafVeinCount);
  roofVeins.name = 'ISLAND_8_LEAFROOF_GOLD_VEIN_FAN';
  const veinTransform = new THREE.Object3D();
  for (let index = 0; index < leafVeinCount; index += 1) {
    const angle = index / leafVeinCount * Math.PI * 2;
    veinTransform.position.set(Math.cos(angle) * 0.42, 1.21, Math.sin(angle) * 0.42);
    veinTransform.rotation.set(0, -angle, Math.PI / 2 - 0.12);
    veinTransform.scale.set(1, 0.74, 1);
    veinTransform.updateMatrix();
    roofVeins.setMatrixAt(index, veinTransform.matrix);
  }
  roofVeins.instanceMatrix.needsUpdate = true;
  root.add(roofVeins);

  if (level >= 2) {
    [-1, 1].forEach((side, index) => {
      const wing = cylinder(0.28, 0.36, 0.52, materials.glass, 10);
      wing.position.set(side * 0.7, 0.65, 0.02 + index * 0.04);
      wing.name = 'ISLAND_8_LEAFROOF_SIDE_CONSERVATORY';
      const wingLeaf = new THREE.Mesh(createLeafGeometry(0.56, 0.92, 0.05), index ? materials.leafLight : materials.leaf);
      wingLeaf.rotation.set(-0.76, side * 0.16, side * 1.16);
      wingLeaf.position.set(side * 0.72, 0.98, -0.04);
      const branch = createRootCurve(
        new THREE.Vector3(side * 0.32, 0.48, 0),
        new THREE.Vector3(side * 0.74, 0.58, 0),
        0.18,
        0.045,
        materials.root,
        quality,
      );
      root.add(wing, wingLeaf, branch);
    });
  }

  if (level === 3) {
    const lanternStem = cylinder(0.055, 0.09, 0.72, materials.root, 8);
    lanternStem.position.y = 1.48;
    const lantern = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), materials.warmWindow);
    lantern.position.y = 1.82;
    const lanternCage = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 5, 12), materials.gold);
    lanternCage.rotation.x = Math.PI / 2;
    lanternCage.position.y = 1.82;
    root.add(lanternStem, lantern, lanternCage);
    addPetalRing(root, 0.23, 1.56, 5, 0.25, 0.56, materials.leafLight, -0.08, 'ISLAND_8_LEAFROOF_LANTERN_BUD');
    const spring = cylinder(0.3, 0.34, 0.05, materials.water, 16);
    spring.position.set(-0.62, 0.43, -0.62);
    root.add(spring);
  }
  addEntrance(root, 0.66, hallRadius * 0.94, materials, 0.72);
  return root;
}

function createOrchidArchive(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island8EverblossomMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_8_ORCHID_CRYSTAL_ARCHIVE';
  addPlinth(root, 1.06, materials, quality);
  addStairs(root, materials, 0.72, 1.02);
  addPetalRing(root, 0.66, 0.34, level === 1 ? 6 : level === 2 ? 9 : 12, 0.42, level === 1 ? 0.48 : 0.7, materials.orchid, 0.45, 'ISLAND_8_ORCHID_PETAL_BUTTRESSES');
  const core = cylinder(level === 1 ? 0.5 : 0.62, level === 1 ? 0.62 : 0.74, level === 1 ? 0.72 : 1.02, materials.violetGlass, level === 1 ? 8 : 10);
  core.position.y = level === 1 ? 0.78 : 0.92;
  root.add(core);
  const spires = level === 1 ? 3 : level === 2 ? 5 : 7;
  const violetSpireCount = Math.ceil(spires / 2);
  const turquoiseSpireCount = Math.floor(spires / 2);
  const spireGeometry = new THREE.ConeGeometry(0.2, 1, 5);
  const violetSpires = new THREE.InstancedMesh(spireGeometry, materials.violetGlass, violetSpireCount);
  const turquoiseSpires = new THREE.InstancedMesh(spireGeometry, materials.glass, turquoiseSpireCount);
  violetSpires.name = 'ISLAND_8_ARCHIVE_VIOLET_CRYSTAL_ARRAY';
  turquoiseSpires.name = 'ISLAND_8_ARCHIVE_TURQUOISE_CRYSTAL_ARRAY';
  const spireTransform = new THREE.Object3D();
  let violetIndex = 0;
  let turquoiseIndex = 0;
  for (let index = 0; index < spires; index += 1) {
    const angle = index / spires * Math.PI * 2;
    const height = level === 3 ? 0.92 + index % 3 * 0.18 : 0.7;
    spireTransform.position.set(Math.cos(angle) * (level === 1 ? 0.26 : 0.42), level === 1 ? 1.36 : 1.62 + index % 3 * 0.08, Math.sin(angle) * (level === 1 ? 0.26 : 0.42));
    spireTransform.rotation.set(index % 2 ? 0.06 : -0.04, -angle, index % 3 * 0.04);
    spireTransform.scale.set((0.18 + index % 2 * 0.04) / 0.2, height, (0.18 + index % 2 * 0.04) / 0.2);
    spireTransform.updateMatrix();
    if (index % 2) {
      turquoiseSpires.setMatrixAt(turquoiseIndex, spireTransform.matrix);
      turquoiseIndex += 1;
    } else {
      violetSpires.setMatrixAt(violetIndex, spireTransform.matrix);
      violetIndex += 1;
    }
  }
  violetSpires.instanceMatrix.needsUpdate = true;
  turquoiseSpires.instanceMatrix.needsUpdate = true;
  root.add(violetSpires, turquoiseSpires);
  if (level >= 2) {
    const lowerShelf = new THREE.Mesh(new THREE.TorusGeometry(0.49, 0.045, 6, 18), materials.gold);
    const upperShelf = lowerShelf.clone();
    lowerShelf.rotation.x = Math.PI / 2;
    lowerShelf.position.y = 0.72;
    upperShelf.rotation.x = Math.PI / 2;
    upperShelf.position.y = 1.04;
    root.add(lowerShelf, upperShelf);
    const bookCount = level === 2 ? 8 : 14;
    const books = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.22, 0.055), materials.ivoryBright, bookCount);
    books.name = 'ISLAND_8_ARCHIVE_CRYSTAL_BOOK_ARRAY';
    const bookTransform = new THREE.Object3D();
    for (let index = 0; index < bookCount; index += 1) {
      const angle = index / bookCount * Math.PI * 2;
      bookTransform.position.set(Math.cos(angle) * 0.58, 0.84 + index % 2 * 0.22, Math.sin(angle) * 0.58);
      bookTransform.rotation.set(0, -angle + Math.PI / 2, (index % 3 - 1) * 0.08);
      bookTransform.scale.set(0.82 + index % 3 * 0.1, 0.86 + index % 4 * 0.07, 1);
      bookTransform.updateMatrix();
      books.setMatrixAt(index, bookTransform.matrix);
      books.setColorAt(index, new THREE.Color(index % 3 === 0 ? 0xf2c967 : index % 2 ? 0xe9dcb9 : 0xcf9ce1));
    }
    books.instanceMatrix.needsUpdate = true;
    if (books.instanceColor) books.instanceColor.needsUpdate = true;
    root.add(books);
    const latticeCount = level === 2 ? 6 : 10;
    addInstancedColumns(root, latticeCount, 0.59, 0.92, 0.84, materials.gold, 'ISLAND_8_ARCHIVE_GOLD_LATTICE');
  }
  if (level === 3) {
    const crownHalo = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.026, 6, 24), materials.gold);
    crownHalo.rotation.x = Math.PI / 2;
    crownHalo.position.y = 1.66;
    const heart = new THREE.Mesh(new THREE.OctahedronGeometry(0.21, 0), materials.warmWindow);
    heart.position.y = 2.18;
    root.add(crownHalo, heart);
    addPetalRing(root, 0.34, 1.92, 6, 0.26, 0.5, materials.orchidDark, 0.18, 'ISLAND_8_ARCHIVE_ORCHID_CROWN', true);
  }
  addEntrance(root, 0.65, 0.62, materials, 0.7);
  return root;
}

function addCitadelTier(
  root: THREE.Group,
  radius: number,
  height: number,
  y: number,
  windowCount: number,
  materials: Island8EverblossomMaterials,
  quality: Island3DQuality,
  offsetX = 0,
  offsetZ = 0,
  lobes = 5,
) {
  const segments = Math.max(12, segmentCount(quality) * 2);
  const ringCount = quality === 'high' ? 6 : 4;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let ring = 0; ring <= ringCount; ring += 1) {
    const t = ring / ringCount;
    const ringY = -height / 2 + t * height;
    const taper = 1 - t * 0.12 + Math.sin(t * Math.PI) * 0.035;
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = segment / segments * Math.PI * 2;
      const lobedRadius = radius * taper * (1 + Math.cos(angle * lobes + t * 0.28) * 0.055);
      positions.push(Math.cos(angle) * lobedRadius, ringY, Math.sin(angle) * lobedRadius);
    }
  }
  for (let ring = 0; ring < ringCount; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments;
      const a = ring * segments + segment;
      const b = ring * segments + next;
      const c = (ring + 1) * segments + next;
      const d = (ring + 1) * segments + segment;
      indices.push(a, b, d, b, c, d);
    }
  }
  const bottomCenter = positions.length / 3;
  positions.push(0, -height / 2, 0);
  const topCenter = positions.length / 3;
  positions.push(0, height / 2, 0);
  for (let segment = 0; segment < segments; segment += 1) {
    const next = (segment + 1) % segments;
    indices.push(bottomCenter, next, segment);
    const top = ringCount * segments;
    indices.push(topCenter, top + segment, top + next);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const tower = new THREE.Mesh(geometry, materials.ivoryStone);
  tower.position.set(offsetX, y, offsetZ);
  tower.name = 'ISLAND_8_CITADEL_LOBED_BOTANICAL_TOWER';
  root.add(tower);
  const lowerCollar = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.96, 0.045, 6, segmentCount(quality) * 2), materials.root);
  lowerCollar.rotation.x = Math.PI / 2;
  lowerCollar.position.set(offsetX, y - height * 0.42, offsetZ);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.91, 0.055, 6, segmentCount(quality) * 2), materials.gold);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(offsetX, y + height * 0.36, offsetZ);
  const ivoryCornice = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.95, 0.075, 6, segmentCount(quality) * 2), materials.ivoryBright);
  ivoryCornice.rotation.x = Math.PI / 2;
  ivoryCornice.scale.y = 0.72;
  ivoryCornice.position.set(offsetX, y + height * 0.43, offsetZ);
  root.add(lowerCollar, collar);
  root.add(ivoryCornice);
  const pilasters = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 7), materials.ivoryBright, windowCount);
  const capitals = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), materials.gold, windowCount);
  pilasters.name = 'ISLAND_8_CITADEL_IVORY_VINE_PILASTERS';
  capitals.name = 'ISLAND_8_CITADEL_GOLD_BUD_CAPITALS';
  const pilasterTransform = new THREE.Object3D();
  for (let index = 0; index < windowCount; index += 1) {
    const angle = (index + 0.52) / windowCount * Math.PI * 2 + Math.PI / windowCount * 0.35;
    pilasterTransform.position.set(offsetX + Math.cos(angle) * radius * 0.94, y, offsetZ + Math.sin(angle) * radius * 0.94);
    pilasterTransform.rotation.y = -angle;
    pilasterTransform.scale.set(0.036, height * 0.72, 0.036);
    pilasterTransform.updateMatrix();
    pilasters.setMatrixAt(index, pilasterTransform.matrix);
    pilasterTransform.position.y = y + height * 0.37;
    pilasterTransform.scale.set(0.055, 0.08, 0.055);
    pilasterTransform.updateMatrix();
    capitals.setMatrixAt(index, pilasterTransform.matrix);
  }
  pilasters.instanceMatrix.needsUpdate = true;
  capitals.instanceMatrix.needsUpdate = true;
  root.add(pilasters, capitals);
  for (let index = 0; index < windowCount; index += 1) {
    const angle = index / windowCount * Math.PI * 2 + Math.PI / windowCount * 0.35;
    addCitadelArchedBay(root, angle, radius * 0.94, y, radius > 0.8 ? 1.12 : 0.92, materials, offsetX, offsetZ);
  }
}

function addCitadelArchedBay(
  root: THREE.Group,
  angle: number,
  radius: number,
  y: number,
  scale: number,
  materials: Island8EverblossomMaterials,
  offsetX = 0,
  offsetZ = 0,
  entrance = false,
) {
  const group = new THREE.Group();
  group.name = entrance ? 'ISLAND_8_CITADEL_POINTED_MAIN_DOOR' : 'ISLAND_8_CITADEL_POINTED_GLASS_BAY';
  const width = (entrance ? 0.43 : 0.27) * scale;
  const height = (entrance ? 0.76 : 0.48) * scale;
  const shoulder = height * 0.28;
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -height / 2);
  shape.lineTo(-width / 2, shoulder * 0.12);
  shape.quadraticCurveTo(-width * 0.38, shoulder * 0.85, 0, height / 2);
  shape.quadraticCurveTo(width * 0.38, shoulder * 0.85, width / 2, shoulder * 0.12);
  shape.lineTo(width / 2, -height / 2);
  shape.closePath();
  const pane = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, {
    depth: entrance ? 0.075 : 0.045,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.012,
    bevelThickness: 0.008,
    curveSegments: 5,
  }), entrance ? materials.violetGlass : materials.glass);
  pane.position.z = -0.028;
  group.add(pane);

  const framePoints = [
    new THREE.Vector3(-width * 0.59, -height * 0.51, 0.045),
    new THREE.Vector3(-width * 0.59, height * 0.05, 0.045),
    new THREE.Vector3(-width * 0.42, height * 0.3, 0.045),
    new THREE.Vector3(0, height * 0.58, 0.045),
    new THREE.Vector3(width * 0.42, height * 0.3, 0.045),
    new THREE.Vector3(width * 0.59, height * 0.05, 0.045),
    new THREE.Vector3(width * 0.59, -height * 0.51, 0.045),
  ];
  const frameCurve = new THREE.CatmullRomCurve3(framePoints, false, 'centripetal');
  const frame = new THREE.Mesh(new THREE.TubeGeometry(frameCurve, 20, entrance ? 0.035 : 0.024, 6, false), materials.ivoryBright);
  const goldInner = new THREE.Mesh(new THREE.TubeGeometry(frameCurve, 20, entrance ? 0.012 : 0.009, 5, false), materials.gold);
  goldInner.scale.set(0.91, 0.91, 1);
  goldInner.position.y = -height * 0.01;
  group.add(frame, goldInner);

  const mullion = box(0.013 * scale, height * 0.76, 0.026, materials.gold);
  mullion.position.set(0, -height * 0.08, 0.064);
  group.add(mullion);
  if (!entrance) {
    for (const side of [-1, 1]) {
      const branch = box(width * 0.42, 0.011 * scale, 0.023, materials.gold);
      branch.position.set(side * width * 0.18, height * 0.12, 0.064);
      branch.rotation.z = side * 0.72;
      group.add(branch);
    }
  }
  const sill = box(width * 1.3, 0.035 * scale, 0.1, materials.ivoryBright);
  sill.position.set(0, -height * 0.53, 0.02);
  group.add(sill);
  group.position.set(offsetX + Math.cos(angle) * radius, y, offsetZ + Math.sin(angle) * radius);
  group.rotation.y = -angle + Math.PI / 2;
  root.add(group);
  return group;
}

function addLotusBalcony(
  root: THREE.Group,
  radius: number,
  y: number,
  count: number,
  material: THREE.Material,
  materials: Island8EverblossomMaterials,
  quality: Island3DQuality,
  name: string,
  petalTilt = 1.08,
) {
  const bowl = cylinder(radius * 0.7, radius * 0.86, 0.2, materials.ivoryStone, segmentCount(quality));
  bowl.position.y = y - 0.09;
  const garden = cylinder(radius * 0.68, radius * 0.72, 0.075, materials.soil, segmentCount(quality));
  garden.position.y = y + 0.045;
  const rail = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.72, 0.045, 6, segmentCount(quality) * 2), materials.gold);
  rail.rotation.x = Math.PI / 2;
  rail.position.y = y + 0.11;
  root.add(bowl, garden, rail);
  return addPetalRing(root, radius * 0.86, y - 0.02, count, radius * 0.42, radius * 0.62, material, petalTilt, name);
}

function addCitadelVineButtresses(
  root: THREE.Group,
  radius: number,
  bottomY: number,
  topY: number,
  count: number,
  materials: Island8EverblossomMaterials,
  quality: Island3DQuality,
) {
  for (let index = 0; index < count; index += 1) {
    const angle = index / count * Math.PI * 2 + Math.PI / count;
    const start = new THREE.Vector3(Math.cos(angle) * radius * 1.24, bottomY, Math.sin(angle) * radius * 1.24);
    const end = new THREE.Vector3(Math.cos(angle) * radius * 0.82, topY, Math.sin(angle) * radius * 0.82);
    const control = start.clone().lerp(end, 0.55);
    control.add(new THREE.Vector3(Math.sin(angle) * 0.1, 0.18, -Math.cos(angle) * 0.1));
    const curve = new THREE.CatmullRomCurve3([start, control, end]);
    const vine = new THREE.Mesh(new THREE.TubeGeometry(curve, segmentCount(quality), 0.035, 6, false), materials.root);
    vine.name = 'ISLAND_8_CITADEL_LIVING_VINE_BUTTRESS';
    root.add(vine);
  }
}

function addCitadelFlowerCup(
  root: THREE.Group,
  angle: number,
  radius: number,
  y: number,
  materials: Island8EverblossomMaterials,
  quality: Island3DQuality,
  podScale = 1,
) {
  const start = new THREE.Vector3(Math.cos(angle) * radius * 0.55, y - 0.34, Math.sin(angle) * radius * 0.55);
  const end = new THREE.Vector3(Math.cos(angle) * radius, y - 0.08, Math.sin(angle) * radius);
  const control = start.clone().lerp(end, 0.55);
  control.y += 0.16;
  control.x += Math.sin(angle) * 0.09;
  control.z -= Math.cos(angle) * 0.09;
  const branch = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(start, control, end), segmentCount(quality), 0.07 * podScale, 7, false),
    materials.root,
  );
  branch.name = 'ISLAND_8_CITADEL_FLOWER_POD_ROOT_BRANCH';
  root.add(branch);
  const cup = new THREE.Group();
  cup.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
  cup.rotation.y = -angle + Math.PI / 2;
  cup.scale.setScalar(podScale);
  cup.name = 'ISLAND_8_CITADEL_BRANCHING_FLOWER_ROOM';
  const room = cylinder(0.15, 0.21, 0.42, materials.ivoryStone, 10);
  room.position.y = 0.15;
  cup.add(room);
  addCitadelArchedBay(cup, Math.PI / 2, 0.205, 0.18, 0.68, materials);
  addLotusBalcony(cup, 0.34, 0.38, 7, materials.coralPetal, materials, quality, 'ISLAND_8_CITADEL_SIDE_FLOWER_CUP', 0.58);
  const inner = addPetalRing(cup, 0.23, 0.43, 5, 0.17, 0.36, materials.palePetal, -0.08, 'ISLAND_8_CITADEL_SIDE_CUP_PETALS');
  inner.rotation.y = Math.PI / 5;
  root.add(cup);
}

function addCitadelLeafGarland(
  root: THREE.Group,
  radius: number,
  y: number,
  count: number,
  materials: Island8EverblossomMaterials,
) {
  const geometry = createLeafGeometry(0.18, 0.46, 0.018);
  const leaves = new THREE.InstancedMesh(geometry, materials.leaf, count);
  leaves.name = 'ISLAND_8_CITADEL_UPPER_PLANTED_LEAF_GARLAND';
  const transform = new THREE.Object3D();
  for (let index = 0; index < count; index += 1) {
    const angle = index / count * Math.PI * 2;
    const layer = index % 2;
    transform.position.set(Math.cos(angle) * (radius + layer * 0.08), y + layer * 0.025, Math.sin(angle) * (radius + layer * 0.08));
    transform.rotation.set(-0.72 + layer * 0.14, -angle + Math.PI / 2, index % 3 * 0.08 - 0.08);
    transform.scale.setScalar(0.84 + index % 4 * 0.055);
    transform.updateMatrix();
    leaves.setMatrixAt(index, transform.matrix);
  }
  leaves.instanceMatrix.needsUpdate = true;
  root.add(leaves);
}

function addDetailedCrownPetalRing(
  root: THREE.Group,
  radius: number,
  y: number,
  count: number,
  width: number,
  height: number,
  material: THREE.Material,
  materials: Island8EverblossomMaterials,
  tilt: number,
  name: string,
) {
  const group = new THREE.Group();
  group.name = name;
  const depth = Math.max(0.035, width * 0.1);
  const petals = new THREE.InstancedMesh(createPetalGeometry(width, height, depth), material, count);
  const ribs = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 5), materials.gold, count);
  const tipHighlights = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), materials.ivoryBright, count);
  petals.name = `${name}_PETAL_SHELLS`;
  ribs.name = `${name}_RAISED_MIDRIBS`;
  tipHighlights.name = `${name}_PALE_TIP_HIGHLIGHTS`;
  const transform = new THREE.Object3D();
  const localRib = new THREE.Matrix4();
  const ribMatrix = new THREE.Matrix4();
  for (let index = 0; index < count; index += 1) {
    const angle = index / count * Math.PI * 2;
    transform.position.set(Math.cos(angle) * radius, y + (index % 2) * 0.025, Math.sin(angle) * radius);
    transform.rotation.set(tilt, -angle + Math.PI / 2, index % 2 ? 0.045 : -0.035);
    transform.scale.setScalar(0.94 + index % 3 * 0.035);
    transform.updateMatrix();
    petals.setMatrixAt(index, transform.matrix);
    petals.setColorAt(index, new THREE.Color(index % 3 === 0 ? 0xffe8df : index % 2 === 0 ? 0xfff5ee : 0xffffff));
    localRib.compose(
      new THREE.Vector3(0, height * 0.43, depth + 0.035),
      new THREE.Quaternion(),
      new THREE.Vector3(width * 0.022, height * 0.72, width * 0.022),
    );
    ribMatrix.multiplyMatrices(transform.matrix, localRib);
    ribs.setMatrixAt(index, ribMatrix);
    localRib.compose(
      new THREE.Vector3(0, height * 0.93, depth + 0.03),
      new THREE.Quaternion(),
      new THREE.Vector3(width * 0.11, width * 0.15, width * 0.08),
    );
    ribMatrix.multiplyMatrices(transform.matrix, localRib);
    tipHighlights.setMatrixAt(index, ribMatrix);
  }
  petals.instanceMatrix.needsUpdate = true;
  if (petals.instanceColor) petals.instanceColor.needsUpdate = true;
  ribs.instanceMatrix.needsUpdate = true;
  tipHighlights.instanceMatrix.needsUpdate = true;
  group.add(petals, ribs, tipHighlights);
  root.add(group);
  return group;
}

function addCitadelStamenBouquet(
  root: THREE.Group,
  y: number,
  quality: Island3DQuality,
  materials: Island8EverblossomMaterials,
) {
  const count = quality === 'high' ? 18 : quality === 'medium' ? 13 : 9;
  const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.017, 1, 5), materials.gold, count);
  const pollen = new THREE.InstancedMesh(new THREE.SphereGeometry(0.055, 7, 5), materials.sunflower, count);
  stems.name = 'ISLAND_8_CITADEL_CROWN_GOLD_STAMENS';
  pollen.name = 'ISLAND_8_CITADEL_CROWN_POLLEN_KNOBS';
  const transform = new THREE.Object3D();
  for (let index = 0; index < count; index += 1) {
    const angle = index / count * Math.PI * 2;
    const ring = index % 3;
    const radius = 0.08 + ring * 0.055;
    const stemHeight = 0.34 + (index % 5) * 0.055;
    transform.position.set(Math.cos(angle) * radius, y + stemHeight * 0.5, Math.sin(angle) * radius);
    transform.rotation.set(Math.cos(angle) * 0.08, 0, -Math.sin(angle) * 0.08);
    transform.scale.set(1, stemHeight, 1);
    transform.updateMatrix();
    stems.setMatrixAt(index, transform.matrix);
    transform.position.y = y + stemHeight;
    transform.scale.setScalar(0.8 + ring * 0.11);
    transform.updateMatrix();
    pollen.setMatrixAt(index, transform.matrix);
  }
  stems.instanceMatrix.needsUpdate = true;
  pollen.instanceMatrix.needsUpdate = true;
  root.add(stems, pollen);
}

function addCitadelDewPearls(root: THREE.Group, y: number, materials: Island8EverblossomMaterials) {
  const count = 12;
  const pearls = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.055, 0), materials.glass, count);
  pearls.name = 'ISLAND_8_CITADEL_CROWN_DEW_PEARLS';
  const transform = new THREE.Object3D();
  for (let index = 0; index < count; index += 1) {
    const angle = index / count * Math.PI * 2 + Math.PI / count;
    const radius = 0.53 + index % 2 * 0.13;
    transform.position.set(Math.cos(angle) * radius - 0.08, y + (index % 3) * 0.07, Math.sin(angle) * radius + 0.08);
    transform.rotation.set(index * 0.11, angle, index * 0.07);
    transform.scale.setScalar(0.76 + index % 4 * 0.12);
    transform.updateMatrix();
    pearls.setMatrixAt(index, transform.matrix);
  }
  pearls.instanceMatrix.needsUpdate = true;
  root.add(pearls);
}

function addCitadelFoundationGarden(
  root: THREE.Group,
  quality: Island3DQuality,
  materials: Island8EverblossomMaterials,
) {
  const count = quality === 'high' ? 10 : quality === 'medium' ? 7 : 5;
  for (let index = 0; index < count; index += 1) {
    const angle = index / count * Math.PI * 2 + 0.2;
    if (Math.abs(THREE.MathUtils.euclideanModulo(angle, Math.PI * 2) - Math.PI / 2) < 0.38) continue;
    const bloom = new THREE.Group();
    bloom.position.set(Math.cos(angle) * 1.25, 0.37, Math.sin(angle) * 1.25);
    const stem = cylinder(0.018, 0.026, 0.18 + index % 3 * 0.035, materials.leaf, 6);
    stem.position.y = 0.08;
    bloom.add(stem);
    const flower = addPetalRing(bloom, 0.065, 0.18 + index % 3 * 0.035, 5, 0.07, 0.13, index % 2 ? materials.orchid : materials.coralPetal, 0.25, 'ISLAND_8_CITADEL_GARDEN_BLOOM');
    flower.rotation.y = index * 0.23;
    root.add(bloom);
  }
}

function createBlossomCrownCitadel(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island8EverblossomMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_8_BLOSSOM_CROWN_CITADEL';
  addPlinth(root, 1.5, materials, quality);
  addStairs(root, materials, 1.02, 1.42, 8);
  const foundation = addLotusBalcony(root, 1.35, 0.39, quality === 'low' ? 10 : 14, materials.coralPetal, materials, quality, 'ISLAND_8_CITADEL_FOUNDATION_PETALS', 0.46);
  foundation.rotation.y = Math.PI / 14;
  addCitadelFoundationGarden(root, quality, materials);
  addCitadelTier(root, 0.98, 1.38, 1.09, 7, materials, quality, 0, 0, 6);
  addCitadelVineButtresses(root, 0.98, 0.48, 1.54, 7, materials, quality);
  const lowerCanopy = addPetalRing(root, 0.91, 1.52, 12, 0.36, 0.58, materials.palePetal, 0.18, 'ISLAND_8_CITADEL_LOWER_FLOWER_CANOPY');
  lowerCanopy.rotation.y = Math.PI / 12;
  addCitadelArchedBay(root, Math.PI / 2, 0.99, 0.91, 1.05, materials, 0, 0, true);
  if (level >= 2) {
    const balcony = addLotusBalcony(root, 0.98, 1.74, 13, materials.orchid, materials, quality, 'ISLAND_8_CITADEL_MIDDLE_BALCONY', 0.54);
    balcony.position.set(0.12, 0, -0.06);
    balcony.rotation.y = Math.PI / 13;
    addPetalRing(root, 0.73, 1.8, 9, 0.3, 0.5, materials.coralPetal, -0.02, 'ISLAND_8_CITADEL_MIDDLE_INNER_LOTUS');
    addCitadelTier(root, 0.73, 1.18, 2.18, 6, materials, quality, 0.12, -0.06, 5);
    addCitadelVineButtresses(root, 0.73, 1.7, 2.56, 5, materials, quality);
    const middleCanopy = addPetalRing(root, 0.69, 2.64, 10, 0.31, 0.53, materials.coralPetal, 0.12, 'ISLAND_8_CITADEL_MIDDLE_FLOWER_CANOPY');
    middleCanopy.position.set(0.12, 0, -0.06);
    middleCanopy.rotation.y = -Math.PI / 10;
    const podAngles = quality === 'low' ? [0.15, 3.4] : [0.12, 2.5, 4.05];
    podAngles.forEach((angle, index) => addCitadelFlowerCup(
      root,
      angle,
      index === 0 ? 1.34 : 1.17 + index % 2 * 0.1,
      index === 0 ? 1.67 : 1.48 + index * 0.2,
      materials,
      quality,
      index === 0 ? 1.24 : index === 2 ? 1.08 : 0.96,
    ));
  }
  if (level === 3) {
    const upperBalcony = addLotusBalcony(root, 0.76, 2.8, 12, materials.palePetal, materials, quality, 'ISLAND_8_CITADEL_UPPER_BALCONY', 0.48);
    upperBalcony.position.set(-0.08, 0, 0.08);
    upperBalcony.rotation.y = Math.PI / 12;
    addCitadelTier(root, 0.55, 0.92, 3.13, 5, materials, quality, -0.08, 0.08, 4);
    const upperIvoryLancets = addPetalRing(root, 0.5, 2.86, 5, 0.2, 0.7, materials.ivoryBright, 0.08, 'ISLAND_8_CITADEL_UPPER_IVORY_LANCETS');
    upperIvoryLancets.position.set(-0.08, 0, 0.08);
    upperIvoryLancets.rotation.y = Math.PI / 5;
    addCitadelLeafGarland(root, 0.58, 3.49, quality === 'high' ? 28 : quality === 'medium' ? 20 : 14, materials);
    const crownSepals = addDetailedCrownPetalRing(root, 0.64, 3.42, 10, 0.46, 0.74, materials.leafLight, materials, 0.94, 'ISLAND_8_CITADEL_CROWN_SEPALS');
    crownSepals.position.set(-0.08, 0, 0.08);
    crownSepals.rotation.y = -Math.PI / 10;
    const outerCrown = addDetailedCrownPetalRing(root, 0.72, 3.45, 12, 0.58, 1.02, materials.coralPetal, materials, 0.82, 'ISLAND_8_CITADEL_OPEN_CROWN');
    outerCrown.position.set(-0.08, 0, 0.08);
    outerCrown.rotation.y = Math.PI / 12;
    const innerCrown = addDetailedCrownPetalRing(root, 0.39, 3.56, 8, 0.39, 0.9, materials.palePetal, materials, 0.2, 'ISLAND_8_CITADEL_INNER_CROWN');
    innerCrown.position.set(-0.08, 0, 0.08);
    innerCrown.rotation.y = -Math.PI / 8;
    const crownHeart = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 1), materials.warmWindow);
    crownHeart.position.set(-0.08, 4.03, 0.08);
    crownHeart.name = 'ISLAND_8_CITADEL_CROWN_HEART';
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.025, 6, 20), materials.gold);
    halo.position.set(-0.08, 4.03, 0.08);
    halo.rotation.x = Math.PI / 2;
    addCitadelStamenBouquet(root, 4.0, quality, materials);
    addCitadelDewPearls(root, 3.78, materials);
    root.add(crownHeart, halo);
  }
  return root;
}

function markShadows(root: THREE.Object3D, enabled: boolean) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = enabled;
    child.receiveShadow = true;
  });
}

export function buildIsland8EverblossomLandmark(
  definition: Island5LandmarkDefinition,
  level: BuildLevel,
  quality: Island3DQuality,
  materials: Island8EverblossomMaterials,
  options: IslandConstructionFactoryOptions = {},
) {
  const root = new THREE.Group();
  root.name = `ISLAND_8_EVERBLOSSOM_${definition.id.toUpperCase()}_ROOT`;
  root.position.set(...definition.position);
  const partId: Island8RuntimePartId = definition.id === 'hatchery'
    ? 'tulip-glasshouse-hatchery'
    : definition.id === 'habit'
      ? 'sunflower-rhythm-pavilion'
      : definition.id === 'wisdom'
        ? 'orchid-crystal-archive'
        : definition.id === 'event'
          ? 'leafroof-garden-hall'
          : 'blossom-crown-citadel';
  const focusSocket = new THREE.Object3D();
  focusSocket.name = `ISLAND_8_${definition.id.toUpperCase()}_FOCUS_SOCKET`;
  focusSocket.position.set(0, definition.id === 'boss' ? 1.5 : 0.95, 0);
  root.add(focusSocket);
  const runtimeParts: Island8RuntimePart[] = [registerIsland8RuntimePart(partId, root, 'landmark')];
  root.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    world: 'island-008-everblossom',
    parts: runtimeParts,
    sockets: { focus: focusSocket.name },
    colliders: [{ id: `${definition.id}-focus-trigger`, type: 'cylinder', isTrigger: true, radius: definition.id === 'boss' ? 1.45 : 1.12 }],
    destructionGroups: [{ id: `${definition.id}-architecture`, breakable: false, partIds: [partId] }],
    attachment: { parentId: 'landmark-network', parentSocket: `${definition.id}-root-terrace`, localStart: [0, 0, 0], localEnd: [0, 0.12, 0], contactType: 'embedded', embedDepth: 0.12, gapTolerance: 0.01 },
  };
  if (level === 0) {
    addPlinth(root, definition.id === 'boss' ? 1.44 : 1.1, materials, quality);
  } else {
    const resolved = level as 1 | 2 | 3;
    const building = definition.id === 'hatchery'
      ? createTulipGlasshouse(resolved, quality, materials)
      : definition.id === 'habit'
        ? createSunflowerPavilion(resolved, quality, materials)
        : definition.id === 'wisdom'
          ? createOrchidArchive(resolved, quality, materials)
          : definition.id === 'event'
            ? createLeafroofHall(resolved, quality, materials)
            : createBlossomCrownCitadel(resolved, quality, materials);
    building.name = `ISLAND_8_${definition.id.toUpperCase()}_ARCHITECTURE_PIVOT`;
    if (definition.id !== 'boss') building.rotation.y = Math.atan2(-definition.position[0], -definition.position[2]);
    const scale = options.constructionPreview
      ? 1.08
      : definition.id === 'boss'
      ? resolved === 3 ? 1.18 : resolved === 2 ? 1.08 : 0.98
      : resolved === 3 ? 1.16 : resolved === 2 ? 1.08 : 1;
    building.scale.setScalar(scale);
    if (options.constructionPreview === 'target') {
      applyIslandConstructionAuthoring({
        root: building,
        worldSourceNumber: 8,
        landmarkId: definition.id,
        quality,
        includeTemporaryRig: true,
      });
    }
    root.add(building);
    runtimeParts.push(registerIsland8RuntimePart(
      definition.id === 'boss' ? 'citadel-petal-balcony-array' : 'five-entrance-system',
      building,
      'landmark-architecture',
    ));
    if (definition.id === 'boss' && resolved === 3) {
      const crown = building.getObjectByName('ISLAND_8_CITADEL_OPEN_CROWN');
      if (crown) runtimeParts.push(registerIsland8RuntimePart('citadel-open-crown', crown, 'landmark-crown'));
    }
  }
  root.traverse((child) => { child.userData.landmarkId = definition.id; });
  markShadows(root, quality === 'high' && definition.id === 'boss');
  return root;
}

function createRootCurve(
  start: THREE.Vector3,
  end: THREE.Vector3,
  lift: number,
  radius: number,
  material: THREE.Material,
  quality: Island3DQuality,
) {
  const midpoint = start.clone().lerp(end, 0.5);
  midpoint.y += lift;
  midpoint.x += Math.sin(start.x * 2.1 + end.z) * 0.16;
  const curve = new THREE.CatmullRomCurve3([start, midpoint, end]);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, segmentCount(quality), radius, 6, false), material);
}

function createTerrainShelf(radius: number, depth: number, materials: Island8EverblossomMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  const top = cylinder(radius * 0.97, radius * 1.035, 0.24, materials.soil, segmentCount(quality) * 2);
  top.position.y = 0.12;
  const stone = cylinder(radius * 1.03, radius * 1.1, 0.32, materials.ivoryStone, segmentCount(quality) * 2);
  stone.position.y = -0.13;
  const rootCore = cylinder(radius * 0.52, radius * 1.06, depth, materials.root, segmentCount(quality) * 2);
  rootCore.position.y = -depth / 2 - 0.28;
  const livingRim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.92, 0.11, 6, segmentCount(quality) * 2), materials.leaf);
  livingRim.rotation.x = Math.PI / 2;
  livingRim.position.y = 0.24;
  root.add(top, stone, rootCore, livingRim);
  return root;
}

function addWaterfall(
  root: THREE.Group,
  x: number,
  z: number,
  height: number,
  materials: Island8EverblossomMaterials,
  phase: number,
) {
  const angle = Math.atan2(z, x);
  const fall = box(0.38, height, 0.045, materials.water);
  fall.position.set(x, -height * 0.42, z);
  fall.rotation.set(0, -angle, Math.sin(phase) * 0.05);
  fall.name = 'ISLAND_8_WATERFALL_RIBBON';
  fall.userData.phase = phase;
  const highlight = box(0.08, height * 0.92, 0.052, materials.foam);
  highlight.position.set(x + Math.cos(angle + Math.PI / 2) * 0.06, -height * 0.42, z + Math.sin(angle + Math.PI / 2) * 0.06);
  highlight.rotation.y = -angle;
  const foam = new THREE.Mesh(new THREE.CircleGeometry(0.34, 14), materials.foam);
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(x, -0.575, z + 0.03);
  foam.name = 'ISLAND_8_WATERFALL_FOAM';
  foam.userData.phase = phase;
  root.add(fall, highlight, foam);
}

function addGardenBeds(root: THREE.Group, materials: Island8EverblossomMaterials, quality: Island3DQuality) {
  const geometry = new THREE.ConeGeometry(0.12, 0.28, 6);
  const count = Math.round(52 * detailScale(quality));
  const petals = new THREE.InstancedMesh(geometry, materials.coralPetal, count);
  petals.name = 'ISLAND_8_ROUTE_CLEAR_GARDEN_BEDS';
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const lobeCenters: Array<[number, number]> = [[-4.55, -4.05], [4.55, -4.05], [-4.55, 4.05], [4.55, 4.05]];
  for (let index = 0; index < count; index += 1) {
    const angle = index * 2.399963;
    const inner = index % 3 === 0;
    const center = lobeCenters[index % lobeCenters.length];
    const orbit = 1.48 + index % 5 * 0.09;
    const x = inner ? Math.cos(angle) * 2.25 : center[0] + Math.cos(angle) * orbit;
    const z = inner ? Math.sin(angle) * 2.25 : center[1] + Math.sin(angle) * orbit;
    if (!isIsland8RouteCorridorClear(x, z, 0.12)) {
      position.set(0, -20, 0);
      scale.setScalar(0.001);
    } else {
      position.set(x, 0.34 + index % 3 * 0.035, z);
      scale.set(0.75 + index % 4 * 0.09, 0.72 + index % 5 * 0.08, 0.75 + index % 4 * 0.09);
    }
    rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    matrix.compose(position, rotation, scale);
    petals.setMatrixAt(index, matrix);
  }
  root.add(petals);
}

function addTileRingFlowerBorder(root: THREE.Group, materials: Island8EverblossomMaterials, quality: Island3DQuality) {
  const border = new THREE.Group();
  border.name = 'ISLAND_8_TILE_RING_FLOWER_BORDER';

  const rootPlanter = new THREE.Mesh(
    new THREE.TorusGeometry(4.43, 0.17, 6, segmentCount(quality) * 6),
    materials.root,
  );
  rootPlanter.rotation.x = Math.PI / 2;
  rootPlanter.position.y = 0.34;
  rootPlanter.name = 'ISLAND_8_LIVING_ROOT_BORDER_PLANTER';
  const soilBed = new THREE.Mesh(
    new THREE.TorusGeometry(4.43, 0.12, 5, segmentCount(quality) * 6),
    materials.soil,
  );
  soilBed.rotation.x = Math.PI / 2;
  soilBed.position.y = 0.455;
  const goldRim = new THREE.Mesh(
    new THREE.TorusGeometry(4.43, 0.024, 5, segmentCount(quality) * 6),
    materials.gold,
  );
  goldRim.rotation.x = Math.PI / 2;
  goldRim.position.y = 0.525;
  border.add(rootPlanter, soilBed, goldRim);

  const garlandCount = quality === 'high' ? 96 : quality === 'medium' ? 72 : 48;
  const garlandLeaves = new THREE.InstancedMesh(
    createGarlandLeafGeometry(0.28, 0.48),
    materials.leafLight,
    garlandCount,
  );
  garlandLeaves.name = 'ISLAND_8_TILE_RING_LEAF_GARLAND';
  const garlandMatrix = new THREE.Matrix4();
  const garlandPosition = new THREE.Vector3();
  const garlandRotation = new THREE.Quaternion();
  const garlandScale = new THREE.Vector3();
  const flatLeafRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
  const leafYaw = new THREE.Quaternion();
  const leafYAxis = new THREE.Vector3(0, 1, 0);
  for (let index = 0; index < garlandCount; index += 1) {
    const angle = index / garlandCount * Math.PI * 2;
    const radius = 4.25 + index % 2 * 0.075;
    garlandPosition.set(Math.cos(angle) * radius, 0.52 + index % 3 * 0.008, Math.sin(angle) * radius);
    leafYaw.setFromAxisAngle(leafYAxis, Math.PI / 2 - angle + (index % 3 - 1) * 0.12);
    garlandRotation.copy(leafYaw).multiply(flatLeafRotation);
    const leafScale = 0.88 + index % 5 * 0.075;
    garlandScale.set(leafScale, leafScale, leafScale);
    garlandMatrix.compose(garlandPosition, garlandRotation, garlandScale);
    garlandLeaves.setMatrixAt(index, garlandMatrix);
    garlandLeaves.setColorAt(index, new THREE.Color(index % 4 === 0 ? 0x8ccc5c : index % 3 === 0 ? 0x4e9a52 : 0x2f7d45));
  }
  garlandLeaves.instanceMatrix.needsUpdate = true;
  if (garlandLeaves.instanceColor) garlandLeaves.instanceColor.needsUpdate = true;
  border.add(garlandLeaves);

  const outerCount = quality === 'high' ? 48 : quality === 'medium' ? 36 : 24;
  const innerCount = quality === 'high' ? 36 : quality === 'medium' ? 28 : 18;
  const blooms = Array.from({ length: outerCount + innerCount }, (_, index) => {
    const outer = index < outerCount;
    const rowIndex = outer ? index : index - outerCount;
    const rowCount = outer ? outerCount : innerCount;
    const angle = rowIndex / rowCount * Math.PI * 2 + (outer ? 0 : Math.PI / innerCount);
    const radius = outer ? ISLAND_8_FLOWER_BORDER_OUTER_RADIUS : ISLAND_8_FLOWER_BORDER_INNER_RADIUS;
    const hero = rowIndex % 4 === 0;
    const height = outer
      ? 0.72 + (rowIndex % 4) * 0.035 + (hero ? 0.2 : 0)
      : 0.63 + (rowIndex % 3) * 0.035 + (hero ? 0.17 : 0);
    return {
      angle,
      family: (rowIndex + (outer ? 0 : 1)) % 3,
      height,
      hero,
      radius,
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
    };
  });

  const stemGeometry = new THREE.CylinderGeometry(0.022, 0.032, 1, 6);
  const stems = new THREE.InstancedMesh(stemGeometry, materials.leaf, blooms.length);
  stems.name = 'ISLAND_8_FLOWER_BORDER_STEMS';
  const leafGeometry = createLeafGeometry(0.13, 0.3, 0.018);
  const leaves = new THREE.InstancedMesh(leafGeometry, materials.leafLight, blooms.length * 2);
  leaves.name = 'ISLAND_8_FLOWER_BORDER_LEAVES';
  const centerGeometry = new THREE.SphereGeometry(0.065, 8, 5);
  const centers = new THREE.InstancedMesh(centerGeometry, materials.sunflower, blooms.length);
  centers.name = 'ISLAND_8_FLOWER_BORDER_CENTERS';

  const familyPetalCounts = [5, 7, 6] as const;
  const familyBloomCounts = familyPetalCounts.map((_, family) => blooms.filter((bloom) => bloom.family === family).length);
  const petalMaterials = [materials.coralPetal, materials.orchid, materials.sunflower] as const;
  const petalMeshes = familyPetalCounts.map((petalCount, family) => {
    const geometry = createPetalGeometry(
      family === 1 ? 0.105 : 0.12,
      family === 2 ? 0.16 : 0.19,
      0.018,
    );
    const mesh = new THREE.InstancedMesh(geometry, petalMaterials[family], familyBloomCounts[family] * petalCount);
    mesh.name = `ISLAND_8_FLOWER_BORDER_FAMILY_${family + 1}_PETALS`;
    return mesh;
  });

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const yAxis = new THREE.Vector3(0, 1, 0);
  const radial = new THREE.Vector3();
  const petalCursor = [0, 0, 0];
  blooms.forEach((bloom, index) => {
    const stemHeight = bloom.height - 0.48;
    position.set(bloom.x, 0.48 + stemHeight / 2, bloom.z);
    rotation.identity();
    scale.set(1, stemHeight, 1);
    matrix.compose(position, rotation, scale);
    stems.setMatrixAt(index, matrix);

    for (let leafIndex = 0; leafIndex < 2; leafIndex += 1) {
      const side = leafIndex === 0 ? -1 : 1;
      position.set(
        bloom.x + Math.cos(bloom.angle + side * Math.PI / 2) * 0.035,
        0.53 + leafIndex * 0.075,
        bloom.z + Math.sin(bloom.angle + side * Math.PI / 2) * 0.035,
      );
      rotation.setFromEuler(new THREE.Euler(
        side * 0.34,
        -bloom.angle + Math.PI / 2,
        side * (0.48 + index % 3 * 0.08),
      ));
      scale.setScalar(bloom.hero ? 1.24 : index % 4 === 0 ? 1.08 : 0.92);
      matrix.compose(position, rotation, scale);
      leaves.setMatrixAt(index * 2 + leafIndex, matrix);
    }

    position.set(bloom.x, bloom.height, bloom.z);
    rotation.identity();
    scale.setScalar((bloom.family === 1 ? 0.9 : 1) * (bloom.hero ? 1.55 : 1));
    matrix.compose(position, rotation, scale);
    centers.setMatrixAt(index, matrix);
    centers.setColorAt(index, new THREE.Color(bloom.family === 0 ? 0xf4ba3b : bloom.family === 1 ? 0xffd56a : 0xcf8434));

    const petalCount = familyPetalCounts[bloom.family];
    for (let petalIndex = 0; petalIndex < petalCount; petalIndex += 1) {
      const petalAngle = bloom.angle + petalIndex / petalCount * Math.PI * 2;
      radial.set(Math.cos(petalAngle), 0.14 + (petalIndex % 2) * 0.05, Math.sin(petalAngle)).normalize();
      rotation.setFromUnitVectors(yAxis, radial);
      position.set(bloom.x, bloom.height - 0.015, bloom.z);
      const variation = (0.88 + ((index + petalIndex) % 3) * 0.07) * (bloom.hero ? 1.6 : 1);
      scale.set(variation, variation, variation);
      matrix.compose(position, rotation, scale);
      petalMeshes[bloom.family].setMatrixAt(petalCursor[bloom.family], matrix);
      petalCursor[bloom.family] += 1;
    }
  });

  stems.instanceMatrix.needsUpdate = true;
  leaves.instanceMatrix.needsUpdate = true;
  centers.instanceMatrix.needsUpdate = true;
  if (centers.instanceColor) centers.instanceColor.needsUpdate = true;
  petalMeshes.forEach((mesh) => { mesh.instanceMatrix.needsUpdate = true; });
  border.add(stems, leaves, centers, ...petalMeshes);
  root.add(border);
}

function addHeroFlowerBorderAccents(root: THREE.Group, materials: Island8EverblossomMaterials, quality: Island3DQuality) {
  const bloomCount = quality === 'high' ? 12 : quality === 'medium' ? 10 : 8;
  const petalsPerBloom = 7;
  const radius = 4.72;
  const petalGeometry = createLowPolyPetalGeometry(0.24, 0.42, 0.035);
  const coralPetals = new THREE.InstancedMesh(petalGeometry, materials.coralPetal, Math.ceil(bloomCount / 2) * petalsPerBloom);
  const orchidPetals = new THREE.InstancedMesh(petalGeometry, materials.orchid, Math.floor(bloomCount / 2) * petalsPerBloom);
  const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.026, 0.045, 1, 7), materials.leaf, bloomCount);
  const centers = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.115, 0), materials.sunflower, bloomCount);
  coralPetals.name = 'ISLAND_8_HERO_BORDER_CORAL_FLOWERS';
  orchidPetals.name = 'ISLAND_8_HERO_BORDER_ORCHID_FLOWERS';
  stems.name = 'ISLAND_8_HERO_BORDER_FLOWER_STEMS';
  centers.name = 'ISLAND_8_HERO_BORDER_FLOWER_CENTERS';
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const yAxis = new THREE.Vector3(0, 1, 0);
  const petalDirection = new THREE.Vector3();
  let coralCursor = 0;
  let orchidCursor = 0;
  for (let index = 0; index < bloomCount; index += 1) {
    const angle = index / bloomCount * Math.PI * 2 + Math.PI / bloomCount;
    const height = 0.92 + index % 4 * 0.055;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    position.set(x, 0.5 + (height - 0.5) * 0.5, z);
    rotation.identity();
    scale.set(1, height - 0.5, 1);
    matrix.compose(position, rotation, scale);
    stems.setMatrixAt(index, matrix);
    position.set(x, height, z);
    scale.setScalar(0.9 + index % 3 * 0.1);
    matrix.compose(position, rotation, scale);
    centers.setMatrixAt(index, matrix);
    for (let petalIndex = 0; petalIndex < petalsPerBloom; petalIndex += 1) {
      const petalAngle = angle + petalIndex / petalsPerBloom * Math.PI * 2;
      petalDirection.set(Math.cos(petalAngle), 0.26 + (petalIndex % 2) * 0.08, Math.sin(petalAngle)).normalize();
      rotation.setFromUnitVectors(yAxis, petalDirection);
      position.set(x, height - 0.02, z);
      const petalScale = 0.88 + ((index + petalIndex) % 3) * 0.08;
      scale.setScalar(petalScale);
      matrix.compose(position, rotation, scale);
      if (index % 2) {
        orchidPetals.setMatrixAt(orchidCursor, matrix);
        orchidCursor += 1;
      } else {
        coralPetals.setMatrixAt(coralCursor, matrix);
        coralCursor += 1;
      }
    }
  }
  [coralPetals, orchidPetals, stems, centers].forEach((mesh) => { mesh.instanceMatrix.needsUpdate = true; });
  root.add(coralPetals, orchidPetals, stems, centers);

  const lanternCount = 4;
  const lanternPosts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.028, 0.04, 1, 7), materials.gold, lanternCount);
  const lanterns = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.16, 0), materials.warmWindow, lanternCount);
  lanternPosts.name = 'ISLAND_8_CARDINAL_FLOWER_LANTERN_POSTS';
  lanterns.name = 'ISLAND_8_CARDINAL_FLOWER_LANTERNS';
  const transform = new THREE.Object3D();
  for (let index = 0; index < lanternCount; index += 1) {
    const angle = index / lanternCount * Math.PI * 2;
    transform.position.set(Math.cos(angle) * 4.82, 0.84, Math.sin(angle) * 4.82);
    transform.rotation.set(0, -angle, 0);
    transform.scale.set(1, 0.68, 1);
    transform.updateMatrix();
    lanternPosts.setMatrixAt(index, transform.matrix);
    transform.position.y = 1.2;
    transform.scale.setScalar(1);
    transform.updateMatrix();
    lanterns.setMatrixAt(index, transform.matrix);
  }
  lanternPosts.instanceMatrix.needsUpdate = true;
  lanterns.instanceMatrix.needsUpdate = true;
  root.add(lanternPosts, lanterns);
}

function addBotanicalCarpet(root: THREE.Group, materials: Island8EverblossomMaterials, quality: Island3DQuality) {
  const density = detailScale(quality);
  const shrubCount = Math.round(76 * density);
  const shrubGeometry = createLeafGeometry(0.4, 0.72, 0.025);
  const shrubs = new THREE.InstancedMesh(shrubGeometry, materials.leaf, shrubCount);
  shrubs.name = 'ISLAND_8_LAYERED_BOTANICAL_CARPET';
  const flowerCount = Math.round(116 * density);
  const flowerGeometry = new THREE.IcosahedronGeometry(0.095, 1);
  const flowers = new THREE.InstancedMesh(flowerGeometry, materials.palePetal, flowerCount);
  flowers.name = 'ISLAND_8_FLOWER_MEADOW_INSTANCES';
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const yAxis = new THREE.Vector3(0, 1, 0);
  const landmarkCenters = [
    new THREE.Vector2(-4.55, -4.05),
    new THREE.Vector2(4.55, -4.05),
    new THREE.Vector2(-4.55, 4.05),
    new THREE.Vector2(4.55, 4.05),
  ];
  for (let index = 0; index < shrubCount; index += 1) {
    const center = landmarkCenters[index % landmarkCenters.length];
    const orbit = 1.42 + (index % 7) * 0.075;
    const angle = index * 2.399963 + (index % 4) * 0.43;
    position.set(center.x + Math.cos(angle) * orbit, 0.38 + index % 3 * 0.025, center.y + Math.sin(angle) * orbit);
    rotation.setFromEuler(new THREE.Euler(-Math.PI / 2 + (index % 3 - 1) * 0.12, angle, (index % 5 - 2) * 0.08));
    scale.set(0.9 + index % 4 * 0.12, 0.92 + index % 5 * 0.08, 0.9 + index % 3 * 0.1);
    matrix.compose(position, rotation, scale);
    shrubs.setMatrixAt(index, matrix);
    shrubs.setColorAt(index, new THREE.Color(index % 5 === 0 ? 0x62ad52 : index % 3 === 0 ? 0x2f8046 : 0x1e663d));
  }
  for (let index = 0; index < flowerCount; index += 1) {
    const inner = index % 3 !== 0;
    const angle = index * 2.399963;
    if (inner) {
      const radius = 1.68 + (index % 13) * 0.065;
      position.set(Math.cos(angle) * radius, 0.43 + index % 4 * 0.025, Math.sin(angle) * radius);
    } else {
      const center = landmarkCenters[index % landmarkCenters.length];
      const orbit = 1.58 + index % 6 * 0.065;
      position.set(center.x + Math.cos(angle) * orbit, 0.43 + index % 4 * 0.025, center.y + Math.sin(angle) * orbit);
    }
    rotation.setFromAxisAngle(yAxis, angle);
    scale.set(1.12 + index % 4 * 0.08, 0.72 + index % 3 * 0.08, 1.12 + index % 5 * 0.06);
    matrix.compose(position, rotation, scale);
    flowers.setMatrixAt(index, matrix);
    flowers.setColorAt(index, new THREE.Color(index % 7 === 0 ? 0xf0b83f : index % 3 === 0 ? 0x9a62be : 0xeb7884));
  }
  shrubs.instanceMatrix.needsUpdate = true;
  flowers.instanceMatrix.needsUpdate = true;
  if (shrubs.instanceColor) shrubs.instanceColor.needsUpdate = true;
  if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
  root.add(shrubs, flowers);
}

function addTerraceSprings(root: THREE.Group, materials: Island8EverblossomMaterials, quality: Island3DQuality) {
  const positions: Array<[number, number]> = [[-3.95, -5.4], [3.95, -5.4], [-3.95, 5.4], [3.95, 5.4]];
  positions.forEach(([x, z], index) => {
    const stone = cylinder(0.54, 0.64, 0.13, materials.ivoryStone, segmentCount(quality));
    stone.position.set(x, 0.32, z);
    stone.scale.z = 0.72;
    const pool = cylinder(0.46, 0.5, 0.05, materials.water, segmentCount(quality));
    pool.position.set(x, 0.405, z);
    pool.scale.z = 0.7;
    const bloom = addPetalRing(root, 0.28, 0.43, 6, 0.16, 0.28, index % 2 ? materials.orchid : materials.palePetal, 0.94, 'ISLAND_8_SPRING_LOTUS');
    bloom.position.set(x, 0, z);
    root.add(stone, pool);
  });
}

function addTurquoiseWaterGarden(root: THREE.Group, materials: Island8EverblossomMaterials, quality: Island3DQuality) {
  const padCount = quality === 'high' ? 34 : quality === 'medium' ? 22 : 12;
  const bloomCount = quality === 'high' ? 14 : quality === 'medium' ? 9 : 5;
  const reedCount = quality === 'high' ? 28 : quality === 'medium' ? 18 : 9;
  const pads = new THREE.InstancedMesh(new THREE.CircleGeometry(0.42, 12, 0.22, Math.PI * 1.78), materials.leafLight, padCount);
  const blooms = new THREE.InstancedMesh(new THREE.ConeGeometry(0.12, 0.26, 7), materials.palePetal, bloomCount);
  const reeds = new THREE.InstancedMesh(new THREE.ConeGeometry(0.065, 0.62, 6), materials.leaf, reedCount);
  pads.name = 'ISLAND_8_TURQUOISE_WATER_LILY_PADS';
  blooms.name = 'ISLAND_8_WATER_GARDEN_LOTUS_BUDS';
  reeds.name = 'ISLAND_8_WATER_GARDEN_REEDS';
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  for (let index = 0; index < padCount; index += 1) {
    const angle = index * 2.399963 + 0.4;
    const radius = 9.1 + index % 8 * 0.55;
    position.set(Math.cos(angle) * radius, -0.565 + index % 3 * 0.004, Math.sin(angle) * radius);
    rotation.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, angle + index % 4 * 0.18));
    const padScale = 0.74 + index % 5 * 0.11;
    scale.set(padScale * (index % 3 === 0 ? 1.25 : 1), padScale, padScale * (index % 4 === 0 ? 0.82 : 1));
    matrix.compose(position, rotation, scale);
    pads.setMatrixAt(index, matrix);
    pads.setColorAt(index, new THREE.Color(index % 4 === 0 ? 0x6ebf66 : index % 3 === 0 ? 0x3a965a : 0x24764a));
  }
  for (let index = 0; index < bloomCount; index += 1) {
    const angle = index * 3.883222 + 1.1;
    const radius = 9.45 + index % 6 * 0.72;
    position.set(Math.cos(angle) * radius, -0.43, Math.sin(angle) * radius);
    rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    scale.setScalar(0.82 + index % 3 * 0.14);
    matrix.compose(position, rotation, scale);
    blooms.setMatrixAt(index, matrix);
    blooms.setColorAt(index, new THREE.Color(index % 3 === 0 ? 0xf2b550 : index % 2 === 0 ? 0xa95ac2 : 0xf29a9f));
  }
  for (let index = 0; index < reedCount; index += 1) {
    const angle = index * 2.399963 + 2.2;
    const radius = 9.0 + index % 5 * 0.68;
    position.set(Math.cos(angle) * radius, -0.28 + index % 3 * 0.03, Math.sin(angle) * radius);
    rotation.setFromEuler(new THREE.Euler((index % 3 - 1) * 0.08, angle, (index % 4 - 1.5) * 0.05));
    scale.set(0.7 + index % 3 * 0.1, 0.86 + index % 4 * 0.1, 0.7 + index % 3 * 0.1);
    matrix.compose(position, rotation, scale);
    reeds.setMatrixAt(index, matrix);
  }
  pads.instanceMatrix.needsUpdate = true;
  blooms.instanceMatrix.needsUpdate = true;
  reeds.instanceMatrix.needsUpdate = true;
  if (pads.instanceColor) pads.instanceColor.needsUpdate = true;
  if (blooms.instanceColor) blooms.instanceColor.needsUpdate = true;
  root.add(pads, blooms, reeds);
  const rippleCount = quality === 'high' ? 12 : quality === 'medium' ? 8 : 4;
  const ripples = new THREE.InstancedMesh(new THREE.TorusGeometry(0.42, 0.012, 5, 18), materials.foam, rippleCount);
  ripples.name = 'ISLAND_8_WATER_GARDEN_SPRING_RIPPLES';
  const rippleTransform = new THREE.Object3D();
  for (let index = 0; index < rippleCount; index += 1) {
    const angle = index * 2.399963 + 0.8;
    const radius = 9.2 + index % 5 * 0.74;
    rippleTransform.position.set(Math.cos(angle) * radius, -0.555 + index % 2 * 0.004, Math.sin(angle) * radius);
    rippleTransform.rotation.set(Math.PI / 2, 0, angle);
    rippleTransform.scale.set(0.72 + index % 4 * 0.13, 0.72 + index % 3 * 0.12, 0.72 + index % 4 * 0.13);
    rippleTransform.updateMatrix();
    ripples.setMatrixAt(index, rippleTransform.matrix);
  }
  ripples.instanceMatrix.needsUpdate = true;
  root.add(ripples);
}

function createButterfly(materials: Island8EverblossomMaterials, scale = 1) {
  const root = new THREE.Group();
  const body = cylinder(0.018 * scale, 0.025 * scale, 0.12 * scale, materials.root, 6);
  body.rotation.x = Math.PI / 2;
  const wingGeometry = createPetalGeometry(0.11 * scale, 0.16 * scale, 0.012);
  const left = new THREE.Mesh(wingGeometry, materials.orchid);
  left.rotation.set(-Math.PI / 2, 0, -0.34);
  left.position.x = -0.025 * scale;
  const right = new THREE.Mesh(wingGeometry, materials.coralPetal);
  right.rotation.set(-Math.PI / 2, Math.PI, 0.34);
  right.position.x = 0.025 * scale;
  root.add(body, left, right);
  root.userData.wings = [left, right];
  return root;
}

export function createIsland8EverblossomLivingAmbience(
  scene: THREE.Scene,
  profile: Island3DQualityProfile,
  materials: Island8EverblossomMaterials,
  sharedWater: THREE.Mesh,
): Island8EverblossomAmbienceRuntime {
  const quality = profile.id;
  const root = new THREE.Group();
  root.name = 'ISLAND_8_EVERBLOSSOM_LIVING_AMBIENCE';
  root.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    world: 'island-008-everblossom',
    parts: [],
    sockets: { ambience: 'ISLAND_8_AMBIENCE_ORIGIN_SOCKET' },
    colliders: [{ id: 'island-008-terrain-envelope', type: 'compound', isTrigger: false }],
    destructionGroups: [{ id: 'everblossom-world-static', breakable: false, partIds: ['terrain-network', 'route-clear-garden-beds'] }],
  };
  sharedWater.visible = true;

  const staticScenery = new THREE.Group();
  staticScenery.name = 'ISLAND_8_STATIC_SCENERY';
  const centralTerrace = createTerrainShelf(4.62, 2.55, materials, quality);
  centralTerrace.name = 'ISLAND_8_CENTRAL_LIVING_ROOT_TERRACE';
  staticScenery.add(centralTerrace);
  const innerGardenTerrace = cylinder(2.72, 2.9, 0.22, materials.soil, segmentCount(quality) * 2);
  innerGardenTerrace.position.y = 0.31;
  innerGardenTerrace.name = 'ISLAND_8_CITADEL_GARDEN_TERRACE';
  const innerGardenRim = new THREE.Mesh(new THREE.TorusGeometry(2.66, 0.085, 6, segmentCount(quality) * 3), materials.gold);
  innerGardenRim.rotation.x = Math.PI / 2;
  innerGardenRim.position.y = 0.43;
  staticScenery.add(innerGardenTerrace, innerGardenRim);
  const lobePositions: Array<[number, number, number]> = [[-4.55, -4.05, 2.48], [4.55, -4.05, 2.4], [-4.55, 4.05, 2.48], [4.55, 4.05, 2.4]];
  lobePositions.forEach(([x, z, radius], index) => {
    const lobe = createTerrainShelf(radius, 1.55 + index % 2 * 0.18, materials, quality);
    lobe.position.set(x, 0.03 + index % 2 * 0.03, z);
    lobe.scale.z = 0.88 + index % 2 * 0.04;
    staticScenery.add(lobe);
  });
  const rootCurves = new THREE.Group();
  rootCurves.name = 'ISLAND_8_ROOT_ARCH_NETWORK';
  lobePositions.forEach(([x, z], index) => {
    const start = new THREE.Vector3(x * 0.96, -1.18, z * 0.96);
    const end = new THREE.Vector3(x * 0.48, -0.36, z * 0.48);
    rootCurves.add(createRootCurve(start, end, 0.66 + index % 2 * 0.18, 0.12 + index % 2 * 0.025, materials.root, quality));
    rootCurves.add(createRootCurve(start.clone().add(new THREE.Vector3(index % 2 ? 0.5 : -0.45, -0.1, 0.2)), end.clone().add(new THREE.Vector3(0.2, -0.12, -0.3)), 0.44, 0.08, materials.root, quality));
  });
  staticScenery.add(rootCurves);
  addGardenBeds(staticScenery, materials, quality);
  addTileRingFlowerBorder(staticScenery, materials, quality);
  addHeroFlowerBorderAccents(staticScenery, materials, quality);
  addBotanicalCarpet(staticScenery, materials, quality);
  addTerraceSprings(staticScenery, materials, quality);
  addTurquoiseWaterGarden(staticScenery, materials, quality);
  root.add(staticScenery);

  const waterfallRoot = new THREE.Group();
  waterfallRoot.name = 'ISLAND_8_SPRING_WATERFALL_NETWORK';
  const waterfallPositions: Array<[number, number]> = [
    [-4.55, 6.12], [4.55, 6.12],
    [-6.55, 4.05], [6.55, 4.05],
    [-4.55, -6.12], [4.55, -6.12],
  ];
  const waterfallCount = quality === 'high' ? 6 : quality === 'medium' ? 4 : 2;
  waterfallPositions.slice(0, waterfallCount).forEach(([x, z], index) => {
    addWaterfall(waterfallRoot, x, z, 1.55 + index % 3 * 0.2, materials, index * 0.83);
  });
  root.add(waterfallRoot);

  const butterflyRoot = new THREE.Group();
  butterflyRoot.name = 'ISLAND_8_BUTTERFLY_DEPTH_LAYERS';
  const butterflies: THREE.Group[] = [];
  const butterflyCount = quality === 'high' ? 16 : quality === 'medium' ? 9 : 4;
  for (let index = 0; index < butterflyCount; index += 1) {
    const butterfly = createButterfly(materials, 0.8 + index % 3 * 0.22);
    butterfly.userData.radius = 5.6 + index % 4 * 1.7;
    butterfly.userData.speed = 0.07 + index % 5 * 0.012;
    butterfly.userData.phase = index * 1.37;
    butterfly.userData.baseY = 1.8 + index % 5 * 0.72;
    butterflyRoot.add(butterfly);
    butterflies.push(butterfly);
  }
  root.add(butterflyRoot);

  const pollenCount = quality === 'high' ? 180 : quality === 'medium' ? 96 : 40;
  const pollenPositions = new Float32Array(pollenCount * 3);
  for (let index = 0; index < pollenCount; index += 1) {
    const angle = index * 2.399963;
    const radius = 1.8 + index % 47 / 47 * 9.5;
    pollenPositions[index * 3] = Math.cos(angle) * radius;
    pollenPositions[index * 3 + 1] = 0.5 + index % 31 / 31 * 5.8;
    pollenPositions[index * 3 + 2] = Math.sin(angle) * radius;
  }
  const pollenGeometry = new THREE.BufferGeometry();
  pollenGeometry.setAttribute('position', new THREE.BufferAttribute(pollenPositions, 3));
  const pollen = new THREE.Points(pollenGeometry, materials.pollen);
  pollen.name = 'ISLAND_8_PETAL_POLLEN_FIELD';
  root.add(pollen);

  const horizon = new THREE.Group();
  horizon.name = 'ISLAND_8_VALLEY_HORIZON';
  const mountainCount = quality === 'high' ? 9 : quality === 'medium' ? 7 : 5;
  for (let index = 0; index < mountainCount; index += 1) {
    const lane = index - (mountainCount - 1) / 2;
    const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), index % 2 ? materials.leaf : materials.leafLight);
    hill.position.set(lane * 4.8, -0.6 + index % 3 * 0.35, -19 - Math.abs(lane) * 0.55);
    hill.scale.set(4.2 + index % 3 * 0.8, 2.5 + index % 4 * 0.45, 3.8 + index % 2 * 0.7);
    hill.name = 'ISLAND_8_SOFT_VALLEY_HILL';
    horizon.add(hill);
  }
  const distantTreeCount = quality === 'high' ? 36 : quality === 'medium' ? 22 : 12;
  const distantTrees = new THREE.InstancedMesh(new THREE.ConeGeometry(0.36, 1.8, 6), materials.leaf, distantTreeCount);
  const treeMatrix = new THREE.Matrix4();
  for (let index = 0; index < distantTreeCount; index += 1) {
    const x = -18 + index / Math.max(1, distantTreeCount - 1) * 36;
    const z = -14.5 - index % 5 * 0.55;
    treeMatrix.makeTranslation(x, 0.35 + index % 3 * 0.12, z);
    distantTrees.setMatrixAt(index, treeMatrix);
  }
  distantTrees.name = 'ISLAND_8_DISTANT_VALLEY_TREES';
  horizon.add(distantTrees);
  root.add(horizon);

  const runtimeParts: Island8RuntimePart[] = [
    registerIsland8RuntimePart('terrain-network', staticScenery, 'terrain'),
    registerIsland8RuntimePart('central-root-terrace', staticScenery, 'terrain'),
    registerIsland8RuntimePart('outer-satellite-terraces', staticScenery, 'terrain'),
    registerIsland8RuntimePart('root-arch-network', rootCurves, 'terrain-roots'),
    registerIsland8RuntimePart('route-clear-garden-beds', staticScenery, 'botany'),
    registerIsland8RuntimePart('spring-waterfall-network', waterfallRoot, 'water'),
    registerIsland8RuntimePart('butterfly-depth-layers', butterflyRoot, 'fauna'),
    registerIsland8RuntimePart('petal-pollen-field', pollen, 'particles'),
    registerIsland8RuntimePart('valley-horizon', horizon, 'background'),
    registerIsland8RuntimePart('ambience-system', root, 'ambience'),
  ];
  root.userData.sculptRuntime.parts = runtimeParts;
  scene.add(root);

  let cached = false;
  const waterfallRibbons: THREE.Mesh[] = [];
  const waterfallFoam: THREE.Mesh[] = [];
  const sundials: THREE.Object3D[] = [];
  const citadelHearts: THREE.Object3D[] = [];
  const cacheAnimated = () => {
    if (cached) return;
    cached = true;
    scene.traverse((object) => {
      if (object.name === 'ISLAND_8_WATERFALL_RIBBON' && object instanceof THREE.Mesh) waterfallRibbons.push(object);
      if (object.name === 'ISLAND_8_WATERFALL_FOAM' && object instanceof THREE.Mesh) waterfallFoam.push(object);
      if (object.name === 'ISLAND_8_HABIT_SUNDIAL') sundials.push(object);
      if (object.name === 'ISLAND_8_CITADEL_CROWN_HEART') citadelHearts.push(object);
    });
  };

  return {
    root,
    animate: (elapsed) => {
      cacheAnimated();
      pollen.rotation.y = elapsed * 0.012;
      pollen.position.y = Math.sin(elapsed * 0.18) * 0.08;
      butterflies.forEach((butterfly, index) => {
        const angle = elapsed * Number(butterfly.userData.speed) + Number(butterfly.userData.phase);
        const radius = Number(butterfly.userData.radius);
        butterfly.position.set(Math.cos(angle) * radius, Number(butterfly.userData.baseY) + Math.sin(elapsed * 0.72 + index) * 0.28, Math.sin(angle) * radius);
        butterfly.rotation.y = -angle + Math.PI / 2;
        const wings = butterfly.userData.wings as THREE.Object3D[];
        wings[0].rotation.z = -0.34 + Math.sin(elapsed * 7.5 + index) * 0.28;
        wings[1].rotation.z = 0.34 - Math.sin(elapsed * 7.5 + index) * 0.28;
      });
      waterfallRibbons.forEach((fall, index) => {
        const material = fall.material as THREE.MeshPhysicalMaterial;
        material.opacity = 0.58 + Math.sin(elapsed * 1.8 + index) * 0.08;
      });
      waterfallFoam.forEach((foam, index) => {
        const pulse = 0.88 + Math.sin(elapsed * 1.4 + index) * 0.12;
        foam.scale.setScalar(pulse);
      });
      sundials.forEach((dial) => { dial.rotation.z = elapsed * 0.08; });
      citadelHearts.forEach((heart, index) => {
        const pulse = 1 + Math.sin(elapsed * 0.75 + index) * 0.045;
        heart.scale.setScalar(pulse);
      });
    },
    updateView: (cameraPosition, cameraTarget) => {
      if (!cameraTarget) return;
      const focusView = cameraPosition.distanceTo(cameraTarget) < 15.5;
      horizon.visible = !focusView;
      pollen.visible = !focusView;
      butterflyRoot.visible = !focusView || quality === 'high';
    },
  };
}
