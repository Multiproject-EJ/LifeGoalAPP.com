import * as THREE from 'three';
import type {
  Island3DQuality,
  Island3DQualityProfile,
  Island5LandmarkDefinition,
} from './island5ThreePilotContract';
import { compactStaticGeometry } from './CrownCitadelThreeModel';

export const ISLAND_1_WORLD_ID = 1 as const;
export const ISLAND_1_WORLD_NAME = 'First Light Kingdom';
type BuildLevel = 0 | 1 | 2 | 3;

export const ISLAND_1_LANDMARK_LABELS = {
  boss: 'Aureon’s Sun Court',
  hatchery: 'Lantern Hatchery',
  habit: 'Rhythm Tree Sanctuary',
  wisdom: 'Sava’s Star Archive',
  event: 'Echo Lens Observatory',
} as const;

export interface Island1WorldMaterials {
  ivory: THREE.MeshStandardMaterial;
  ivoryShade: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
  sapphire: THREE.MeshPhysicalMaterial;
  cyanGlass: THREE.MeshPhysicalMaterial;
  opal: THREE.MeshPhysicalMaterial;
  warmGlow: THREE.MeshStandardMaterial;
  navy: THREE.MeshStandardMaterial;
  crystal: THREE.MeshStandardMaterial;
  bark: THREE.MeshStandardMaterial;
  leaf: THREE.MeshStandardMaterial;
  leafLight: THREE.MeshStandardMaterial;
  leafDark: THREE.MeshStandardMaterial;
  moonstone: THREE.MeshPhysicalMaterial;
  celestial: THREE.MeshPhysicalMaterial;
}

export interface Island1AmbienceRuntime {
  root: THREE.Group;
  animate: (elapsed: number) => void;
  updateView?: (cameraPosition: THREE.Vector3) => void;
}

export interface Island1CloudLayoutEntry {
  angle: number;
  radius: number;
  centerY: number;
  scale: number;
  minimumY: number;
  driftDirection: -1 | 1;
}

export interface Island1MountainLayoutEntry {
  angle: number;
  radius: number;
  height: number;
  width: number;
  shoulderSide: -1 | 1;
}

export interface Island1AmbienceLifeBudget {
  cascadeCount: number;
  shorelineWaveCount: number;
  dawnMoteCount: number;
  skiffCount: number;
}

// First Light's buildings and canonical route remain at the shared board Y,
// while the sea sits lower so the kingdom can read as a tall, ocean-rooted
// archipelago rather than a thin plate or a levitating island.
export const ISLAND_1_OCEAN_SURFACE_Y = -2.65;
export const ISLAND_1_CLOUD_MINIMUM_Y = 13.5;
const ISLAND_1_CLOUD_LOCAL_LOWER_EXTENT = 1.08;
const ISLAND_1_CLOUD_VERTICAL_DRIFT = 0.16;

export function getIsland1AmbienceLifeBudget(quality: Island3DQuality): Island1AmbienceLifeBudget {
  return quality === 'high'
    ? { cascadeCount: 14, shorelineWaveCount: 5, dawnMoteCount: 30, skiffCount: 3 }
    : quality === 'medium'
      ? { cascadeCount: 10, shorelineWaveCount: 3, dawnMoteCount: 16, skiffCount: 2 }
      : { cascadeCount: 6, shorelineWaveCount: 1, dawnMoteCount: 0, skiffCount: 1 };
}

export function buildIsland1CloudLayout(quality: Island3DQuality): Island1CloudLayoutEntry[] {
  const count = quality === 'high' ? 8 : quality === 'medium' ? 6 : 4;
  return Array.from({ length: count }, (_, index) => {
    const angle = index / count * Math.PI * 2 + 0.31;
    // Keep the entire 360-degree cloud belt beyond the maximum board-camera
    // orbit. This prevents a side-on orbit from passing through a cloud while
    // the increased scale preserves a soft, distant silhouette.
    const radius = 92 + (index % 3) * 7;
    const scale = 0.72 + (index % 4) * 0.055;
    const centerY = 16.2 + (index % 3) * 4.4;
    return {
      angle,
      radius,
      centerY,
      scale,
      minimumY: centerY - ISLAND_1_CLOUD_LOCAL_LOWER_EXTENT * scale - ISLAND_1_CLOUD_VERTICAL_DRIFT,
      driftDirection: index % 2 === 0 ? 1 : -1,
    };
  });
}

export function buildIsland1MountainLayout(quality: Island3DQuality): Island1MountainLayoutEntry[] {
  const count = quality === 'high' ? 8 : quality === 'medium' ? 6 : 4;
  return Array.from({ length: count }, (_, index) => ({
    angle: index / count * Math.PI * 2 + 0.12,
    // A restrained archipelago reads as far scenery from the seven-unit board
    // while remaining well inside the normal overview orbit (about 41 units).
    // That prevents camera-path intersections and keeps every peak in the sea.
    radius: 20 + (index % 3) * 3.2,
    height: 1.08 + (index % 4) * 0.18,
    width: 0.82 + (index % 3) * 0.13,
    shoulderSide: index % 2 === 0 ? 1 : -1,
  }));
}

const radialSegmentsFor = (quality: Island3DQuality) => quality === 'high' ? 24 : quality === 'medium' ? 16 : 10;

function cylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  segments: number,
  material: THREE.Material,
) {
  return new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
}

function shadow(object: THREE.Object3D, cast = true) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = cast;
      child.receiveShadow = true;
    }
  });
}

function createFirstLightPatternTexture(size: number, pattern: 'stone' | 'roof' | 'bark' | 'leaf') {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const hash = ((x * 73 + y * 151 + (x * y) % 97) % 29) - 14;
      let value = 224 + hash;
      if (pattern === 'stone') {
        const course = Math.floor(y / 18);
        const seamX = (x + (course % 2) * 18) % 36;
        const mortar = y % 18 < 2 || seamX < 2;
        value = mortar ? 218 : 246 + Math.round(hash * 0.05);
      } else if (pattern === 'roof') {
        const diagonal = ((x + y) % 22 < 2) || ((x - y + size * 3) % 22 < 2);
        value = diagonal ? 202 : 240 + Math.round(hash * 0.08);
      } else if (pattern === 'bark') {
        const groove = (x + Math.round(Math.sin(y * 0.18) * 4)) % 17 < 3;
        value = groove ? 148 : 218 + Math.round(hash * 0.42);
      } else {
        const vein = (x * 3 + y * 5) % 31 < 2;
        value = vein ? 188 : 230 + Math.round(hash * 0.32);
      }
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(pattern === 'stone' ? 3 : pattern === 'roof' ? 4 : 2, pattern === 'stone' ? 3 : pattern === 'roof' ? 4 : 2);
  texture.needsUpdate = true;
  return texture;
}

export function createIsland1WorldMaterials(): Island1WorldMaterials {
  const stoneMap = createFirstLightPatternTexture(128, 'stone');
  const roofMap = createFirstLightPatternTexture(128, 'roof');
  const barkMap = createFirstLightPatternTexture(96, 'bark');
  const leafMap = createFirstLightPatternTexture(64, 'leaf');
  return {
    ivory: new THREE.MeshStandardMaterial({ color: 0xf4ead7, map: stoneMap, roughness: 0.57, metalness: 0.025 }),
    ivoryShade: new THREE.MeshStandardMaterial({ color: 0xcbbca4, map: stoneMap, roughness: 0.76, metalness: 0.015 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xe3ad45, roughness: 0.26, metalness: 0.76, emissive: 0x6b3a05, emissiveIntensity: 0.12 }),
    sapphire: new THREE.MeshPhysicalMaterial({ color: 0x1f4d93, map: roofMap, roughness: 0.17, metalness: 0.08, clearcoat: 0.8, clearcoatRoughness: 0.12 }),
    cyanGlass: new THREE.MeshPhysicalMaterial({ color: 0x6fdcff, roughness: 0.08, metalness: 0.02, transparent: true, opacity: 0.84, transmission: 0.24, thickness: 0.3, emissive: 0x1775a5, emissiveIntensity: 0.68 }),
    opal: new THREE.MeshPhysicalMaterial({ color: 0xcce6ff, roughness: 0.1, metalness: 0.08, transparent: true, opacity: 0.78, transmission: 0.34, thickness: 0.82, clearcoat: 1, clearcoatRoughness: 0.06, iridescence: 0.92, iridescenceIOR: 1.34, iridescenceThicknessRange: [120, 560], emissive: 0x6f9ed9, emissiveIntensity: 0.28, depthWrite: false }),
    warmGlow: new THREE.MeshStandardMaterial({ color: 0xffd782, roughness: 0.2, emissive: 0xff9d2c, emissiveIntensity: 1.15, side: THREE.DoubleSide }),
    navy: new THREE.MeshStandardMaterial({ color: 0x152b63, roughness: 0.35, metalness: 0.1, side: THREE.DoubleSide }),
    crystal: new THREE.MeshStandardMaterial({ color: 0x30bff6, roughness: 0.12, metalness: 0.12, emissive: 0x087fc8, emissiveIntensity: 1.05, side: THREE.DoubleSide }),
    bark: new THREE.MeshStandardMaterial({ color: 0x75563a, map: barkMap, roughness: 0.91, metalness: 0 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x6ea257, map: leafMap, roughness: 0.76, metalness: 0, emissive: 0x214a2e, emissiveIntensity: 0.12 }),
    leafLight: new THREE.MeshStandardMaterial({ color: 0x9ebc55, map: leafMap, roughness: 0.73, metalness: 0, emissive: 0x4c5b18, emissiveIntensity: 0.16 }),
    leafDark: new THREE.MeshStandardMaterial({ color: 0x3f7047, map: leafMap, roughness: 0.8, metalness: 0, emissive: 0x173920, emissiveIntensity: 0.1 }),
    moonstone: new THREE.MeshPhysicalMaterial({ color: 0xa7c7ef, roughness: 0.18, metalness: 0.16, clearcoat: 0.7, clearcoatRoughness: 0.14, emissive: 0x284b99, emissiveIntensity: 0.28 }),
    celestial: new THREE.MeshPhysicalMaterial({ color: 0x276fdb, roughness: 0.07, metalness: 0.08, transparent: true, opacity: 0.82, transmission: 0.12, thickness: 0.66, clearcoat: 1, clearcoatRoughness: 0.05, emissive: 0x123f9a, emissiveIntensity: 0.72, depthWrite: false }),
  };
}

function addRing(group: THREE.Group, radius: number, tube: number, y: number, material: THREE.Material, segments: number) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, segments), material);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = y;
  group.add(ring);
  return ring;
}

function addCrystal(group: THREE.Group, position: readonly [number, number, number], size: number, material: THREE.Material) {
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(size, 0), material);
  crystal.position.set(...position);
  crystal.scale.y = 1.45;
  group.add(crystal);
  return crystal;
}

function createPointedPanelGeometry(width: number, height: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -height / 2);
  shape.lineTo(width / 2, -height / 2);
  shape.lineTo(width / 2, height * 0.17);
  shape.quadraticCurveTo(width * 0.38, height * 0.36, 0, height / 2);
  shape.quadraticCurveTo(-width * 0.38, height * 0.36, -width / 2, height * 0.17);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function addPointedWindow(
  group: THREE.Group,
  radius: number,
  angle: number,
  y: number,
  material: THREE.Material,
  gold: THREE.Material,
  scale = 1,
) {
  const x = Math.sin(angle) * radius;
  const z = Math.cos(angle) * radius;
  const panel = new THREE.Mesh(createPointedPanelGeometry(0.17 * scale, 0.38 * scale), material);
  panel.position.set(x, y, z);
  panel.rotation.y = angle;
  const crown = new THREE.Mesh(new THREE.TorusGeometry(0.09 * scale, 0.014 * scale, 4, 10, Math.PI), gold);
  crown.position.set(Math.sin(angle) * (radius + 0.014), y + 0.075 * scale, Math.cos(angle) * (radius + 0.014));
  crown.rotation.y = angle;
  const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.018 * scale, 0.3 * scale, 0.018 * scale), gold);
  mullion.position.set(Math.sin(angle) * (radius + 0.018), y - 0.025 * scale, Math.cos(angle) * (radius + 0.018));
  mullion.rotation.y = angle;
  group.add(panel, crown, mullion);
}

function addDomeRibs(
  group: THREE.Group,
  radius: number,
  baseY: number,
  count: number,
  material: THREE.Material,
  quality: Island3DQuality,
) {
  const tubeSegments = quality === 'high' ? 18 : quality === 'medium' ? 12 : 8;
  for (let index = 0; index < count; index += 1) {
    const angle = index / count * Math.PI * 2;
    const direction = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
    const curve = new THREE.QuadraticBezierCurve3(
      direction.clone().multiplyScalar(radius).setY(baseY + 0.04),
      direction.clone().multiplyScalar(radius * 0.82).setY(baseY + radius * 0.78),
      new THREE.Vector3(0, baseY + radius, 0),
    );
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, tubeSegments, Math.max(0.018, radius * 0.025), 5, false), material));
  }
}

function addStarFinial(group: THREE.Group, y: number, materials: Island1WorldMaterials) {
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), materials.warmGlow);
  core.position.y = y;
  group.add(core);
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2;
    const ray = new THREE.Mesh(new THREE.ConeGeometry(0.035, index % 2 === 0 ? 0.34 : 0.23, 4), materials.gold);
    const depth = index % 2 === 0 ? 0.045 : -0.045;
    ray.position.set(Math.cos(angle) * 0.18, y + Math.sin(angle) * 0.18, depth);
    ray.rotation.z = -angle + Math.PI / 2;
    ray.rotation.y = index % 2 === 0 ? 0.18 : -0.18;
    group.add(ray);
  }
  const crossRay = new THREE.Mesh(new THREE.OctahedronGeometry(0.19), materials.gold);
  crossRay.position.y = y;
  crossRay.scale.set(0.32, 1.5, 0.32);
  crossRay.rotation.y = Math.PI / 4;
  group.add(crossRay);
}

function addGothicButtress(
  group: THREE.Group,
  radius: number,
  angle: number,
  baseY: number,
  height: number,
  materials: Island1WorldMaterials,
  segments: number,
) {
  const x = Math.sin(angle) * radius;
  const z = Math.cos(angle) * radius;
  const root = new THREE.Group();
  root.position.set(x, baseY, z);
  root.rotation.y = angle;
  const pier = new THREE.Mesh(new THREE.BoxGeometry(0.115, height, 0.19), materials.ivoryShade);
  pier.position.y = height / 2;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.27, Math.max(5, Math.floor(segments / 2))), materials.sapphire);
  cap.position.y = height + 0.13;
  const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.045), materials.crystal);
  jewel.position.y = height + 0.3;
  root.add(pier, cap, jewel);
  group.add(root);
}

function addEggCradleRib(
  group: THREE.Group,
  x: number,
  z: number,
  angle: number,
  materials: Island1WorldMaterials,
  quality: Island3DQuality,
) {
  const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
  const start = new THREE.Vector3(x, 1.5, z).addScaledVector(direction, 0.31);
  const control = new THREE.Vector3(x, 1.86, z).addScaledVector(direction, 0.43);
  const end = new THREE.Vector3(x, 2.08, z).addScaledVector(direction, 0.24);
  const curve = new THREE.QuadraticBezierCurve3(start, control, end);
  const rib = new THREE.Mesh(
    new THREE.TubeGeometry(curve, quality === 'high' ? 12 : 8, 0.034, 5, false),
    materials.gold,
  );
  group.add(rib);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 4), materials.gold);
  tip.position.copy(end).add(new THREE.Vector3(0, 0.08, 0));
  group.add(tip);
}

function addTurret(
  group: THREE.Group,
  x: number,
  z: number,
  height: number,
  radius: number,
  materials: Island1WorldMaterials,
  segments: number,
) {
  const base = cylinder(radius * 1.18, radius * 1.28, 0.18, segments, materials.ivoryShade);
  base.position.set(x, 0.47, z);
  const body = cylinder(radius, radius * 1.05, height, segments, materials.ivory);
  body.position.set(x, 0.58 + height / 2, z);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(radius * 1.2, radius * 2.25, segments), materials.sapphire);
  roof.position.set(x, 0.58 + height + radius * 1.1, z);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.02, radius * 0.09, 5, segments), materials.gold);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(x, 0.58 + height, z);
  group.add(base, body, collar, roof);
  addCrystal(group, [x, 0.64 + height + radius * 2.24, z], radius * 0.18, materials.warmGlow);
}

function addBeamBetween(
  group: THREE.Group,
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  segments = 5,
) {
  const direction = end.clone().sub(start);
  const length = direction.length();
  const beam = cylinder(radius, radius, length, segments, material);
  beam.position.copy(start).add(end).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  group.add(beam);
  return beam;
}

function addScaffoldTower(
  group: THREE.Group,
  x: number,
  z: number,
  width: number,
  height: number,
  materials: Island1WorldMaterials,
  quality: Island3DQuality,
) {
  const scaffold = new THREE.Group();
  scaffold.position.set(x, 0.48, z);
  const half = width / 2;
  const levels = quality === 'low' ? 2 : Math.max(3, Math.round(height / 0.55));
  const corners = [[-half, -half], [half, -half], [half, half], [-half, half]] as const;
  for (const [cornerX, cornerZ] of corners) {
    const pole = cylinder(0.025, 0.032, height, 5, materials.bark);
    pole.position.set(cornerX, height / 2, cornerZ);
    scaffold.add(pole);
  }
  for (let levelIndex = 0; levelIndex <= levels; levelIndex += 1) {
    const y = levelIndex / levels * height;
    for (let side = 0; side < 4; side += 1) {
      const [ax, az] = corners[side];
      const [bx, bz] = corners[(side + 1) % 4];
      addBeamBetween(scaffold, new THREE.Vector3(ax, y, az), new THREE.Vector3(bx, y, bz), 0.022, materials.bark);
    }
    if (levelIndex > 0 && levelIndex < levels) {
      const platform = new THREE.Mesh(new THREE.BoxGeometry(width * 1.14, 0.045, width * 0.38), materials.bark);
      platform.position.set(0, y + 0.025, levelIndex % 2 === 0 ? half * 0.52 : -half * 0.52);
      scaffold.add(platform);
    }
  }
  if (quality !== 'low') {
    addBeamBetween(scaffold, new THREE.Vector3(-half, 0, half), new THREE.Vector3(half, height, half), 0.017, materials.gold);
    addBeamBetween(scaffold, new THREE.Vector3(half, 0, -half), new THREE.Vector3(-half, height, -half), 0.017, materials.gold);
  }
  group.add(scaffold);
  return scaffold;
}

function addConstructionCrane(
  group: THREE.Group,
  x: number,
  z: number,
  height: number,
  rotation: number,
  materials: Island1WorldMaterials,
) {
  const crane = new THREE.Group();
  crane.position.set(x, 0.5, z);
  crane.rotation.y = rotation;
  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.12, height, 0.12), materials.bark);
  mast.position.y = height / 2;
  const boom = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.11, 0.12), materials.gold);
  boom.position.set(0.46, height, 0);
  boom.rotation.z = 0.12;
  const rope = cylinder(0.012, 0.012, 0.72, 5, materials.navy);
  rope.position.set(0.95, height - 0.38, 0);
  const load = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.32), materials.ivoryShade);
  load.position.set(0.95, height - 0.78, 0);
  crane.add(mast, boom, rope, load);
  group.add(crane);
}

function addConstructionSupplies(
  group: THREE.Group,
  angle: number,
  radius: number,
  materials: Island1WorldMaterials,
  quality: Island3DQuality,
) {
  const x = Math.sin(angle) * radius;
  const z = Math.cos(angle) * radius;
  const supplies = new THREE.Group();
  supplies.position.set(x, 0.52, z);
  supplies.rotation.y = angle;
  const beamCount = quality === 'high' ? 5 : 3;
  for (let index = 0; index < beamCount; index += 1) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.07, 0.09), materials.bark);
    beam.position.set((index % 2) * 0.07, 0.04 + Math.floor(index / 2) * 0.075, index % 2 * 0.11);
    supplies.add(beam);
  }
  const stoneCount = quality === 'low' ? 2 : 4;
  for (let index = 0; index < stoneCount; index += 1) {
    const stone = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.13, 0.18), materials.ivoryShade);
    stone.position.set(-0.28 + (index % 2) * 0.19, 0.07 + Math.floor(index / 2) * 0.14, 0.12);
    supplies.add(stone);
  }
  group.add(supplies);
}

function addCircularArcade(
  group: THREE.Group,
  radius: number,
  baseY: number,
  height: number,
  count: number,
  completion: number,
  materials: Island1WorldMaterials,
  quality: Island3DQuality,
) {
  const builtCount = Math.max(4, Math.round(count * completion));
  for (let index = 0; index < builtCount; index += 1) {
    const angle = index / count * Math.PI * 2;
    const column = cylinder(0.045, 0.06, height, 6, materials.ivory);
    column.position.set(Math.sin(angle) * radius, baseY + height / 2, Math.cos(angle) * radius);
    group.add(column);
    if (quality !== 'low' || index % 2 === 0) {
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.18, 6), materials.sapphire);
      cap.position.set(Math.sin(angle) * radius, baseY + height + 0.09, Math.cos(angle) * radius);
      group.add(cap);
    }
    if (index < builtCount - 1) {
      const nextAngle = (index + 1) / count * Math.PI * 2;
      const start = new THREE.Vector3(Math.sin(angle) * radius, baseY + height * 0.72, Math.cos(angle) * radius);
      const end = new THREE.Vector3(Math.sin(nextAngle) * radius, baseY + height * 0.72, Math.cos(nextAngle) * radius);
      const control = start.clone().add(end).multiplyScalar(0.5).setY(baseY + height + 0.13);
      const arch = new THREE.QuadraticBezierCurve3(start, control, end);
      group.add(new THREE.Mesh(new THREE.TubeGeometry(arch, quality === 'high' ? 8 : 5, 0.032, 5, false), materials.ivoryShade));
      if (quality === 'high') {
        group.add(new THREE.Mesh(new THREE.TubeGeometry(arch, 8, 0.012, 4, false), materials.gold));
      }
    }
  }
  const arcSegments = Math.max(12, Math.round(radialSegmentsFor(quality) * completion));
  const crown = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.035, 5, arcSegments, Math.PI * 2 * completion), materials.gold);
  crown.rotation.x = Math.PI / 2;
  crown.rotation.z = -Math.PI / 2;
  crown.position.y = baseY + height;
  group.add(crown);
}

function addBanner(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  rotation: number,
  materials: Island1WorldMaterials,
) {
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.72, 1, 3), materials.navy);
  banner.position.set(x, y, z);
  banner.rotation.y = rotation;
  const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.065), materials.gold);
  crest.position.set(x + Math.sin(rotation) * 0.012, y + 0.02, z + Math.cos(rotation) * 0.012);
  crest.scale.set(0.62, 1.55, 0.25);
  group.add(banner, crest);
}

function addRadialStairs(
  group: THREE.Group,
  angle: number,
  radius: number,
  width: number,
  materials: Island1WorldMaterials,
) {
  for (let step = 0; step < 5; step += 1) {
    const depth = 0.18;
    const stair = new THREE.Mesh(new THREE.BoxGeometry(width + step * 0.08, 0.075, depth), step === 0 ? materials.gold : materials.ivory);
    const distance = radius + step * 0.14;
    stair.position.set(Math.sin(angle) * distance, 0.47 - step * 0.045, Math.cos(angle) * distance);
    stair.rotation.y = angle;
    group.add(stair);
  }
}

function createLanternHatchery(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island1WorldMaterials) {
  const group = new THREE.Group();
  group.name = `ISLAND_1_LANTERN_HATCHERY_L${level}`;
  const segments = radialSegmentsFor(quality);

  const foundation = cylinder(1.42, 1.56, 0.28, segments, materials.ivoryShade);
  foundation.position.y = 0.22;
  const terrace = cylinder(1.28, 1.4, 0.2, segments, materials.ivory);
  terrace.position.y = 0.45;
  group.add(foundation, terrace);
  addRing(group, 1.31, 0.055, 0.54, materials.gold, segments);
  addRing(group, 1.08, 0.035, 0.59, materials.sapphire, segments);

  const drum = cylinder(1.03, 1.13, 0.82, segments, materials.ivory);
  drum.position.y = 0.97;
  group.add(drum);
  const drumRoof = cylinder(1.08, 1.2, 0.17, segments, materials.sapphire);
  drumRoof.position.y = 1.43;
  if (level >= 2) group.add(drumRoof);
  addRing(group, 1.04, 0.055, 1.36, materials.gold, segments);
  addRing(group, 1.13, 0.045, 1.5, materials.gold, segments);
  const bayCount = quality === 'low' ? 8 : 12;
  for (let index = 0; index < bayCount; index += 1) {
    const angle = index / bayCount * Math.PI * 2;
    const windowMaterial = index % 3 === 0 ? materials.warmGlow : materials.crystal;
    addPointedWindow(group, 1.2, angle, 1.0, windowMaterial, materials.gold, 1.04);
    const windowCore = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.4, 0.045), windowMaterial);
    windowCore.position.set(Math.sin(angle) * 1.225, 0.95, Math.cos(angle) * 1.225);
    windowCore.rotation.y = angle;
    group.add(windowCore);
    if (index % (quality === 'low' ? 2 : 1) === 0) {
      addGothicButtress(group, 1.1, angle, 0.56, 0.72, materials, segments);
    }
    if (level === 3 && quality !== 'low') {
      const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.065), index % 2 === 0 ? materials.crystal : materials.gold);
      crest.position.set(Math.sin(angle) * 1.125, 0.72 + (index % 2) * 0.48, Math.cos(angle) * 1.125);
      crest.scale.set(0.62, 1.28, 0.4);
      group.add(crest);
    }
  }
  if (level >= 2 && quality !== 'low') {
    const spindleCount = quality === 'high' ? 20 : 12;
    for (let index = 0; index < spindleCount; index += 1) {
      const angle = index / spindleCount * Math.PI * 2;
      const spindle = cylinder(0.018, 0.025, 0.22, 5, materials.gold);
      spindle.position.set(Math.sin(angle) * 1.13, 1.62, Math.cos(angle) * 1.13);
      group.add(spindle);
    }
    addRing(group, 1.13, 0.024, 1.73, materials.gold, segments);
  }

  const sanctuaryPositions: readonly (readonly [number, number])[] = [
    [-0.68, 0.6], [0.68, 0.6], [-0.92, -0.18], [0.92, -0.18],
  ];
  const eggCount = level === 1 ? 0 : 4;
  sanctuaryPositions.forEach(([x, z], index) => {
    const sanctuaryFoot = cylinder(0.48, 0.54, 0.22, segments, materials.ivoryShade);
    sanctuaryFoot.position.set(x, 0.68, z);
    const sanctuaryPlinth = cylinder(0.43, 0.48, 0.16, segments, materials.ivory);
    sanctuaryPlinth.position.set(x, 0.85, z);
    const sanctuaryDrum = cylinder(0.39, 0.46, 0.42, segments, materials.ivory);
    sanctuaryDrum.position.set(x, 1.3, z);
    const sanctuaryRoof = cylinder(0.34, 0.47, 0.18, segments, level === 2 && index === 3 ? materials.ivoryShade : materials.sapphire);
    sanctuaryRoof.position.set(x, 1.58, z);
    group.add(sanctuaryFoot, sanctuaryPlinth, sanctuaryDrum);
    if (level >= 2 && !(level === 2 && index === 3)) group.add(sanctuaryRoof);
    const footRing = addRing(group, 0.47, 0.025, 0.8, materials.gold, segments);
    footRing.position.x = x;
    footRing.position.z = z;
    const balcony = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 5, segments), materials.gold);
    balcony.rotation.x = Math.PI / 2;
    balcony.position.set(x, 1.66, z);
    group.add(balcony);
    const windowCount = quality === 'low' ? 2 : 4;
    for (let windowIndex = 0; windowIndex < windowCount; windowIndex += 1) {
      const windowAngle = windowIndex / windowCount * Math.PI * 2;
      const window = new THREE.Mesh(createPointedPanelGeometry(0.11, 0.23), windowIndex % 2 === 0 ? materials.crystal : materials.warmGlow);
      window.position.set(x + Math.sin(windowAngle) * 0.402, 1.3, z + Math.cos(windowAngle) * 0.402);
      window.rotation.y = windowAngle;
      group.add(window);
      if (quality !== 'low') {
        const pilaster = cylinder(0.027, 0.035, 0.5, 6, windowIndex % 2 === 0 ? materials.gold : materials.ivoryShade);
        pilaster.position.set(x + Math.sin(windowAngle + Math.PI / 4) * 0.43, 1.3, z + Math.cos(windowAngle + Math.PI / 4) * 0.43);
        group.add(pilaster);
      }
    }
    if (index < eggCount) {
    const eggMaterial = materials.opal.clone();
    const eggTint = index % 2 === 0 ? 0x98dcff : 0xd8b7ff;
    eggMaterial.color.setHex(eggTint);
    eggMaterial.emissive.setHex(index % 2 === 0 ? 0x2a86ce : 0x7546bb);
    eggMaterial.emissiveIntensity = 0.68;
    eggMaterial.opacity = 0.5;
    eggMaterial.roughness = 0.045;
    const egg = new THREE.Mesh(new THREE.SphereGeometry(0.43, segments, Math.max(8, Math.floor(segments * 0.65))), eggMaterial);
    egg.scale.set(0.94, 1.38, 0.94);
    egg.position.set(x, 2.1, z);
    egg.userData.opalPhase = index * 1.7;
    group.add(egg);
    if (quality !== 'low') {
      const innerColor = index % 2 === 0 ? 0x29bfff : 0xb560ff;
      const innerCrystal = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.31, quality === 'high' ? 1 : 0),
        new THREE.MeshStandardMaterial({
          color: innerColor,
          roughness: 0.16,
          transparent: true,
          opacity: 0.94,
          emissive: innerColor,
          emissiveIntensity: 1.15,
        }),
      );
      innerCrystal.position.set(x, 2.09, z);
      innerCrystal.scale.set(0.9, 1.46, 0.9);
      innerCrystal.rotation.set(index * 0.31, index * 0.82, index * 0.19);
      group.add(innerCrystal);
    }
    const prongCount = quality === 'low' ? 4 : 6;
    for (let prong = 0; prong < prongCount; prong += 1) {
      const angle = prong / prongCount * Math.PI * 2;
      if (quality === 'low') {
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.34, 4), materials.gold);
        tip.position.set(x + Math.cos(angle) * 0.37, 1.76, z + Math.sin(angle) * 0.37);
        tip.rotation.z = Math.cos(angle) * 0.3;
        tip.rotation.x = Math.sin(angle) * 0.3;
        group.add(tip);
      } else {
        addEggCradleRib(group, x, z, angle, materials, quality);
      }
    }
    if (level === 3) {
      const eggCrown = new THREE.Mesh(new THREE.OctahedronGeometry(0.075), materials.gold);
      eggCrown.position.set(x, 2.73, z);
      eggCrown.scale.set(0.68, 1.45, 0.68);
      const eggGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.035), materials.warmGlow);
      eggGem.position.set(x, 2.88, z);
      group.add(eggCrown, eggGem);
    }
    } else {
      addDomeRibs(group, 0.4, 1.62, quality === 'low' ? 4 : 6, materials.bark, quality);
    }
  });

  const towerHeight = 1.54 + level * 0.12;
  const tower = cylinder(0.5, 0.59, towerHeight, segments, materials.ivory);
  tower.position.y = 1.16 + towerHeight / 2;
  group.add(tower);
  addRing(group, 0.57, 0.032, 1.58, materials.gold, segments);
  addRing(group, 0.52, 0.027, 2.58, materials.gold, segments);
  const towerWindowCount = quality === 'low' ? 4 : 8;
  for (let index = 0; index < towerWindowCount; index += 1) {
    const angle = index / towerWindowCount * Math.PI * 2;
    const lowerWindowMaterial = index % 2 === 0 ? materials.crystal : materials.warmGlow;
    addPointedWindow(group, 0.6, angle, 2.02, lowerWindowMaterial, materials.gold, 1.28);
    const lowerWindowCore = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.38, 0.035), lowerWindowMaterial);
    lowerWindowCore.position.set(Math.sin(angle) * 0.615, 1.97, Math.cos(angle) * 0.615);
    lowerWindowCore.rotation.y = angle;
    group.add(lowerWindowCore);
    if (level === 3 && quality !== 'low') {
      addPointedWindow(group, 0.535, angle, 2.57, materials.crystal, materials.gold, 0.96);
      const upperWindowCore = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.28, 0.03), materials.crystal);
      upperWindowCore.position.set(Math.sin(angle) * 0.55, 2.53, Math.cos(angle) * 0.55);
      upperWindowCore.rotation.y = angle;
      group.add(upperWindowCore);
    }
  }
  if (level === 3) {
    const heroWindow = new THREE.Mesh(createPointedPanelGeometry(0.27, 0.88), materials.crystal);
    heroWindow.position.set(0, 2.13, 0.625);
    const heroMullion = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.72, 0.028), materials.gold);
    heroMullion.position.set(0, 2.07, 0.642);
    const heroCrown = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), materials.gold);
    heroCrown.position.set(0, 2.63, 0.64);
    heroCrown.scale.set(0.72, 1.42, 0.34);
    group.add(heroWindow, heroMullion, heroCrown);
    for (let index = 0; index < 4; index += 1) {
      const angle = index / 4 * Math.PI * 2 + Math.PI / 4;
      addGothicButtress(group, 0.61, angle, 1.28, 1.32, materials, segments);
    }
  }
  if (level >= 2) {
    const gallery = cylinder(0.56, 0.52, 0.3, segments, materials.ivory);
    gallery.position.y = 2.9;
    group.add(gallery);
    addRing(group, 0.56, 0.03, 2.76, materials.gold, segments);
    addRing(group, 0.55, 0.026, 3.05, materials.gold, segments);
    const columnCount = quality === 'high' ? 8 : 4;
    for (let index = 0; index < columnCount; index += 1) {
      const angle = index / columnCount * Math.PI * 2;
      const column = cylinder(0.035, 0.045, 0.42, 6, materials.gold);
      column.position.set(Math.sin(angle) * 0.51, 2.88, Math.cos(angle) * 0.51);
      group.add(column);
    }
  }

  if (level === 3) {
    for (let index = 0; index < 4; index += 1) {
      const angle = index / 4 * Math.PI * 2;
      addPointedWindow(group, 0.59, angle, 2.55, materials.crystal, materials.gold, 1.82);
      const longWindow = new THREE.Mesh(createPointedPanelGeometry(0.2, 0.76), materials.crystal);
      longWindow.position.set(Math.sin(angle) * 0.608, 2.5, Math.cos(angle) * 0.608);
      longWindow.rotation.y = angle;
      const longWindowCore = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.65, 0.045), materials.crystal);
      longWindowCore.position.set(Math.sin(angle) * 0.63, 2.43, Math.cos(angle) * 0.63);
      longWindowCore.rotation.y = angle;
      group.add(longWindow, longWindowCore);
    }
  }

  const domeRadius = 0.58 + level * 0.018;
  const domeBaseY = 1.16 + towerHeight;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(
      domeRadius,
      segments,
      Math.max(8, Math.floor(segments / 2)),
      level === 2 ? Math.PI * 0.2 : 0,
      level === 2 ? Math.PI * 1.62 : Math.PI * 2,
      0,
      Math.PI / 2,
    ),
    materials.sapphire,
  );
  dome.position.y = domeBaseY;
  if (level >= 2) group.add(dome);
  addRing(group, domeRadius, 0.055, domeBaseY, materials.gold, segments);
  addDomeRibs(group, domeRadius, domeBaseY, quality === 'low' ? 4 : 8, materials.gold, quality);
  if (level === 3 && quality !== 'low') {
    for (let index = 0; index < 4; index += 1) {
      const angle = index / 4 * Math.PI * 2 + Math.PI / 4;
      const x = Math.sin(angle) * 0.59;
      const z = Math.cos(angle) * 0.59;
      const spireBody = cylinder(0.085, 0.11, 0.46, 7, materials.ivory);
      spireBody.position.set(x, domeBaseY - 0.12, z);
      const spireCollar = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.022, 4, 7), materials.gold);
      spireCollar.rotation.x = Math.PI / 2;
      spireCollar.position.set(x, domeBaseY + 0.12, z);
      const spireRoof = new THREE.Mesh(new THREE.ConeGeometry(0.125, 0.42, 7), materials.sapphire);
      spireRoof.position.set(x, domeBaseY + 0.33, z);
      const spireTip = new THREE.Mesh(new THREE.OctahedronGeometry(0.038), materials.warmGlow);
      spireTip.position.set(x, domeBaseY + 0.58, z);
      group.add(spireBody, spireCollar, spireRoof, spireTip);
    }
  }

  const crownBase = cylinder(0.25, 0.34, 0.28, segments, materials.sapphire);
  crownBase.position.y = domeBaseY + domeRadius + 0.12;
  const crownCollar = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 5, segments), materials.gold);
  crownCollar.rotation.x = Math.PI / 2;
  crownCollar.position.y = domeBaseY + domeRadius + 0.25;
  const crownCone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.48, segments), materials.sapphire);
  crownCone.position.y = domeBaseY + domeRadius + 0.48;
  if (level >= 2) group.add(crownBase, crownCollar);
  if (level === 3) group.add(crownCone);
  if (level === 3 && quality !== 'low') {
    for (let index = 0; index < 4; index += 1) {
      const angle = index / 4 * Math.PI * 2;
      const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      const crownCurve = new THREE.QuadraticBezierCurve3(
        direction.clone().multiplyScalar(0.2).setY(domeBaseY + domeRadius + 0.27),
        direction.clone().multiplyScalar(0.15).setY(domeBaseY + domeRadius + 0.55),
        new THREE.Vector3(0, domeBaseY + domeRadius + 0.72, 0),
      );
      group.add(new THREE.Mesh(new THREE.TubeGeometry(crownCurve, 8, 0.018, 4, false), materials.gold));
    }
  }
  if (level === 3) addStarFinial(group, domeBaseY + domeRadius + 0.82, materials);

  const turretCount = level === 1 ? 4 : level === 2 ? 6 : 8;
  for (let index = 0; index < turretCount; index += 1) {
    const angle = index / turretCount * Math.PI * 2;
    const radius = index % 2 === 0 ? 1.17 : 1.28;
    addTurret(group, Math.sin(angle) * radius, Math.cos(angle) * radius, 0.84 + (index % 2) * 0.18, 0.18, materials, Math.max(7, Math.floor(segments * 0.65)));
  }

  if (level === 3) {
    const palaceBayCount = quality === 'low' ? 4 : 8;
    for (let index = 0; index < palaceBayCount; index += 1) {
      const angle = index / palaceBayCount * Math.PI * 2 + Math.PI / palaceBayCount;
      const radius = 1.23;
      const bay = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.5, 0.24), index % 2 === 0 ? materials.ivory : materials.ivoryShade);
      bay.position.set(Math.sin(angle) * radius, 0.88, Math.cos(angle) * radius);
      bay.rotation.y = angle;
      const gable = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.28, 4), materials.sapphire);
      gable.position.set(Math.sin(angle) * radius, 1.27, Math.cos(angle) * radius);
      gable.rotation.y = angle + Math.PI / 4;
      const bayWindow = new THREE.Mesh(createPointedPanelGeometry(0.1, 0.24), index % 3 === 0 ? materials.warmGlow : materials.crystal);
      bayWindow.position.set(Math.sin(angle) * (radius + 0.13), 0.9, Math.cos(angle) * (radius + 0.13));
      bayWindow.rotation.y = angle;
      group.add(bay, gable, bayWindow);
    }
  }

  const entranceHall = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.92, 0.42), materials.ivory);
  entranceHall.position.set(0, 1.02, 1.18);
  const entranceGable = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.56, 4), level === 1 ? materials.ivoryShade : materials.sapphire);
  entranceGable.position.set(0, 1.68, 1.18);
  entranceGable.rotation.y = Math.PI / 4;
  group.add(entranceHall, entranceGable);
  const door = new THREE.Mesh(createPointedPanelGeometry(0.44, 0.68), materials.warmGlow);
  door.position.set(0, 0.98, 1.397);
  const doorArch = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 6, segments, Math.PI), materials.gold);
  doorArch.position.set(0, 1.31, 1.41);
  group.add(door, doorArch);
  for (let step = 0; step < 5; step += 1) {
    const stair = new THREE.Mesh(new THREE.BoxGeometry(0.86 + step * 0.13, 0.075, 0.18), step === 0 ? materials.gold : materials.ivory);
    stair.position.set(0, 0.48 - step * 0.045, 1.28 + step * 0.14);
    group.add(stair);
  }
  addCrystal(group, [-0.5, 0.64, 1.28], 0.08, materials.crystal);
  addCrystal(group, [0.5, 0.64, 1.28], 0.08, materials.crystal);

  if (level === 3 && quality === 'high') {
    for (let index = 0; index < 16; index += 1) {
      const angle = index / 16 * Math.PI * 2;
      const pendant = new THREE.Mesh(new THREE.OctahedronGeometry(index % 2 === 0 ? 0.055 : 0.038), materials.crystal);
      pendant.position.set(Math.sin(angle) * 1.16, 1.45 - (index % 2) * 0.12, Math.cos(angle) * 1.16);
      pendant.scale.y = 1.45;
      group.add(pendant);
    }
  }

  if (level < 3) {
    const scaffoldCount = level === 1 ? 6 : 2;
    for (let index = 0; index < scaffoldCount; index += 1) {
      const angle = index / scaffoldCount * Math.PI * 2 + 0.26;
      addScaffoldTower(group, Math.sin(angle) * 1.08, Math.cos(angle) * 1.08, 0.5, level === 1 ? 2.75 : 2.15, materials, quality);
    }
    addConstructionCrane(group, -1.18, -0.72, level === 1 ? 3.7 : 3.25, 0.25, materials);
    addConstructionSupplies(group, 2.2, 1.28, materials, quality);
    addConstructionSupplies(group, 4.45, 1.28, materials, quality);
  }

  group.scale.setScalar(0.94);
  shadow(group, quality !== 'low');
  return group;
}

function createRhythmTree(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island1WorldMaterials) {
  const group = new THREE.Group();
  group.name = `ISLAND_1_RHYTHM_TREE_SANCTUARY_L${level}`;
  const segments = radialSegmentsFor(quality);
  const terrace = cylinder(1.34, 1.48, 0.28, segments, materials.ivoryShade);
  terrace.position.y = 0.24;
  const court = cylinder(1.2, 1.32, 0.18, segments, materials.ivory);
  court.position.y = 0.46;
  group.add(terrace, court);
  addRing(group, 1.22, 0.05, 0.42, materials.gold, segments);
  addRing(group, 0.66, 0.04, 0.57, materials.sapphire, segments);
  addRadialStairs(group, 0, 1.18, 0.72, materials);

  const arcadeCompletion = level === 1 ? 0.58 : level === 2 ? 0.82 : 1;
  addCircularArcade(group, 1.06, 0.56, 0.7, quality === 'low' ? 10 : 16, arcadeCompletion, materials, quality);
  const towerAngles = [-0.72, 0.72, Math.PI - 0.72, Math.PI + 0.72];
  towerAngles.forEach((angle, index) => {
    addTurret(
      group,
      Math.sin(angle) * 1.14,
      Math.cos(angle) * 1.14,
      0.74 + (index % 2) * 0.12,
      0.16,
      materials,
      Math.max(7, Math.floor(segments * 0.6)),
    );
  });

  const trunkHeight = level === 1 ? 2.05 : level === 2 ? 2.3 : 3.22;
  const trunk = cylinder(level === 3 ? 0.31 : 0.2, level === 3 ? 0.56 : 0.42, trunkHeight, segments, materials.bark);
  trunk.name = level === 3 ? 'ISLAND_1_GLORIOUS_OAK_ANCIENT_TRUNK' : 'ISLAND_1_RHYTHM_TREE_TRUNK';
  trunk.position.y = 0.52 + trunkHeight / 2;
  group.add(trunk);
  const rootCount = level === 3 ? (quality === 'low' ? 10 : 14) : 8;
  for (let rootIndex = 0; rootIndex < rootCount; rootIndex += 1) {
    const angle = rootIndex / rootCount * Math.PI * 2;
    const rootReach = level === 3 ? 0.88 + (rootIndex % 3) * 0.1 : 0.72;
    addBeamBetween(
      group,
      new THREE.Vector3(Math.cos(angle) * (level === 3 ? 0.2 : 0.12), 0.74, Math.sin(angle) * (level === 3 ? 0.2 : 0.12)),
      new THREE.Vector3(Math.cos(angle) * rootReach, 0.55 + (rootIndex % 2) * 0.035, Math.sin(angle) * rootReach),
      level === 3 ? 0.105 + (rootIndex % 3) * 0.012 : 0.085,
      materials.bark,
      7,
    );
  }
  if (level === 3) {
    const buttressCount = quality === 'low' ? 4 : 7;
    for (let index = 0; index < buttressCount; index += 1) {
      const angle = index / buttressCount * Math.PI * 2 + 0.18;
      const buttress = new THREE.Mesh(
        new THREE.ConeGeometry(0.2 + (index % 2) * 0.035, 1.05 + (index % 3) * 0.12, 7),
        materials.bark,
      );
      buttress.position.set(Math.cos(angle) * 0.37, 0.9, Math.sin(angle) * 0.37);
      buttress.rotation.z = Math.cos(angle) * 0.19;
      buttress.rotation.x = -Math.sin(angle) * 0.19;
      group.add(buttress);
    }
    const burlCount = quality === 'high' ? 7 : quality === 'medium' ? 5 : 3;
    for (let index = 0; index < burlCount; index += 1) {
      const angle = index / burlCount * Math.PI * 2 + 0.44;
      const burl = new THREE.Mesh(new THREE.DodecahedronGeometry(0.19 + (index % 3) * 0.025, 1), materials.bark);
      burl.position.set(Math.cos(angle) * 0.37, 1.18 + index * 0.27, Math.sin(angle) * 0.37);
      burl.scale.set(1, 1.35, 0.78);
      group.add(burl);
    }
  }
  for (let vineIndex = 0; vineIndex < 3; vineIndex += 1) {
    const vine = new THREE.Mesh(new THREE.TorusGeometry(0.38 + vineIndex * 0.06, 0.028, 5, segments, Math.PI * 1.55), materials.gold);
    vine.rotation.set(Math.PI / 2, vineIndex * 1.9, vineIndex % 2 === 0 ? 0.28 : -0.24);
    vine.position.y = 1.25 + vineIndex * 0.54;
    group.add(vine);
  }
  const stemCount = quality === 'low' ? 4 : 8;
  for (let stemIndex = 0; stemIndex < stemCount; stemIndex += 1) {
    const angle = stemIndex / stemCount * Math.PI * 2;
    const start = new THREE.Vector3(Math.cos(angle) * 0.38, 0.58, Math.sin(angle) * 0.38);
    const middle = new THREE.Vector3(Math.cos(angle + 0.72) * (0.22 + (stemIndex % 2) * 0.08), 1.5, Math.sin(angle + 0.72) * (0.22 + (stemIndex % 2) * 0.08));
    const end = new THREE.Vector3(Math.cos(angle + 1.28) * 0.19, trunkHeight + 0.24, Math.sin(angle + 1.28) * 0.19);
    const stemCurve = new THREE.CatmullRomCurve3([start, middle, end]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(stemCurve, quality === 'high' ? 14 : 8, stemIndex % 3 === 0 ? 0.095 : 0.072, 7, false), stemIndex % 3 === 0 ? materials.ivoryShade : materials.bark));
  }

  const branchCount = level === 1 ? 7 : level === 2 ? 11 : quality === 'low' ? 12 : 16;
  for (let index = 0; index < branchCount; index += 1) {
    const angle = index / branchCount * Math.PI * 2;
    const start = new THREE.Vector3(Math.cos(angle * 1.7) * (level === 3 ? 0.16 : 0.08), (level === 3 ? 1.5 : 1.28) + (index % 4) * (level === 3 ? 0.34 : 0.26), Math.sin(angle * 1.7) * (level === 3 ? 0.16 : 0.08));
    const reach = level === 3 ? 0.9 + (index % 4) * 0.18 : 0.58 + (index % 4) * 0.17 + level * 0.06;
    const end = new THREE.Vector3(Math.cos(angle) * reach, trunkHeight - 0.12 + (index % 5) * (level === 3 ? 0.21 : 0.17), Math.sin(angle) * reach);
    const curve = new THREE.QuadraticBezierCurve3(start, start.clone().lerp(end, 0.55).add(new THREE.Vector3(0, 0.36, 0)), end);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, quality === 'high' ? 14 : 8, 0.075 - (index % 3) * 0.008, 6, false), materials.bark));
    if (level === 3 && index < (quality === 'low' ? 8 : 12)) {
      const forkDirection = index % 2 === 0 ? -1 : 1;
      const forkEnd = end.clone().add(new THREE.Vector3(
        Math.cos(angle + forkDirection * 0.62) * (0.28 + (index % 3) * 0.07),
        0.12 + (index % 2) * 0.12,
        Math.sin(angle + forkDirection * 0.62) * (0.28 + (index % 3) * 0.07),
      ));
      const forkCurve = new THREE.QuadraticBezierCurve3(
        end.clone().lerp(start, 0.16),
        end.clone().add(new THREE.Vector3(0, 0.16, 0)),
        forkEnd,
      );
      group.add(new THREE.Mesh(new THREE.TubeGeometry(forkCurve, quality === 'high' ? 10 : 6, 0.042, 5, false), materials.bark));
    }
    const clusterCount = level === 3 ? (quality === 'high' ? 2 : 1) : quality === 'high' ? 4 : quality === 'medium' ? 3 : 2;
    for (let leafIndex = 0; leafIndex < clusterCount; leafIndex += 1) {
      const leafAngle = leafIndex / clusterCount * Math.PI * 2 + index * 0.7;
      const leafMaterial = (index + leafIndex) % 5 === 0 ? materials.leafLight : (index + leafIndex) % 4 === 0 ? materials.leafDark : materials.leaf;
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry((level === 3 ? 0.21 : 0.18) + ((index + leafIndex) % 3) * 0.026, 1), leafMaterial);
      crown.position.copy(end).add(new THREE.Vector3(Math.cos(leafAngle) * (level === 3 ? 0.22 : 0.23), (leafIndex % 3 - 1) * (level === 3 ? 0.11 : 0.13), Math.sin(leafAngle) * (level === 3 ? 0.22 : 0.23)));
      crown.rotation.set((index % 3 - 1) * 0.12, angle * 0.37, ((index + leafIndex) % 3 - 1) * 0.16);
      crown.scale.set(level === 3 ? 1.62 : 1.24, level === 3 ? 0.52 : 0.68, level === 3 ? 1.24 : 1.04);
      group.add(crown);
    }
    if (level === 3 || (level === 2 && index % 2 === 0) || (level === 1 && index % 3 === 0)) {
      const droplet = new THREE.Mesh(new THREE.OctahedronGeometry(0.055 + (index % 2) * 0.015), materials.crystal);
      droplet.position.copy(end).add(new THREE.Vector3(0, -0.35, 0));
      droplet.scale.y = 1.5;
      group.add(droplet);
    }
  }

  const crownCenters = [
    [0, trunkHeight + (level === 3 ? 0.88 : 0.72), 0],
    [level === 3 ? -0.7 : -0.38, trunkHeight + (level === 3 ? 0.64 : 0.5), 0.08],
    [level === 3 ? 0.74 : 0.4, trunkHeight + (level === 3 ? 0.59 : 0.45), -0.04],
    [0.05, trunkHeight + (level === 3 ? 0.49 : 0.38), level === 3 ? 0.68 : 0.38],
    [-0.02, trunkHeight + (level === 3 ? 0.44 : 0.34), level === 3 ? -0.72 : -0.42],
  ] as const;
  const visibleCrownCenters = crownCenters.slice(0, level === 1 ? 1 : level === 2 ? 3 : crownCenters.length);
  visibleCrownCenters.forEach(([x, y, z], index) => {
    const crown = new THREE.Mesh(
      new THREE.IcosahedronGeometry((level === 3 ? 0.36 : 0.32) - index * 0.014, 1),
      index % 3 === 0 ? materials.leafLight : index % 2 === 0 ? materials.leafDark : materials.leaf,
    );
    crown.position.set(x, y, z);
    const maturityScale = level === 1 ? 0.66 : level === 2 ? 0.84 : 1;
    crown.rotation.set((index % 3 - 1) * 0.1, index * 0.58, (index % 2 === 0 ? -1 : 1) * 0.12);
    crown.scale.set((level === 3 ? 1.58 : 1.34) * maturityScale, (level === 3 ? 0.58 : 0.68) * maturityScale, (level === 3 ? 1.3 : 1.08) * maturityScale);
    group.add(crown);
  });

  if (level === 3) {
    const lanternCount = quality === 'low' ? 5 : 9;
    for (let index = 0; index < lanternCount; index += 1) {
      const angle = index / lanternCount * Math.PI * 2 + 0.31;
      const radius = 0.82 + (index % 3) * 0.23;
      const hangerTop = new THREE.Vector3(Math.cos(angle) * radius, trunkHeight + 0.18 + (index % 2) * 0.16, Math.sin(angle) * radius);
      const hangerBottom = hangerTop.clone().add(new THREE.Vector3(0, -0.48 - (index % 3) * 0.12, 0));
      addBeamBetween(group, hangerTop, hangerBottom, 0.012, materials.gold, 5);
      const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.065 + (index % 2) * 0.012), materials.warmGlow);
      lantern.position.copy(hangerBottom);
      lantern.scale.set(0.78, 1.35, 0.78);
      group.add(lantern);
    }
    group.userData.heroIdentity = 'glorious-old-giant-oak';
    group.userData.heroHeight = 4.35;
  }

  const heartCount = level === 1 ? 2 : level === 2 ? 4 : 6;
  for (let index = 0; index < heartCount; index += 1) {
    const heart = new THREE.Mesh(new THREE.OctahedronGeometry(index === 0 ? 0.22 : 0.11), materials.crystal);
    heart.position.set(Math.sin(index * 1.9) * 0.24, 1.15 + index * 0.28, Math.cos(index * 1.9) * 0.24);
    heart.scale.y = 1.45;
    group.add(heart);
  }
  const heroHeart = new THREE.Mesh(new THREE.OctahedronGeometry(level === 1 ? 0.14 : level === 2 ? 0.19 : 0.25), materials.crystal);
  heroHeart.position.set(0, 1.62, 0.43);
  heroHeart.scale.set(0.82, 1.55, 0.55);
  const heroHeartFrame = new THREE.Mesh(new THREE.TorusGeometry(level === 1 ? 0.18 : level === 2 ? 0.24 : 0.3, 0.035, 6, segments), materials.gold);
  heroHeartFrame.position.set(0, 1.62, 0.45);
  group.add(heroHeart, heroHeartFrame);
  const sanctuaryWindowCount = quality === 'low' ? 6 : 10;
  for (let index = 0; index < sanctuaryWindowCount; index += 1) {
    const angle = index / sanctuaryWindowCount * Math.PI * 2;
    addPointedWindow(group, 1.255, angle, 0.77, materials.crystal, materials.gold, 0.72);
  }

  if (level < 3) {
    const scaffoldCount = level === 1 ? 4 : 2;
    for (let index = 0; index < scaffoldCount; index += 1) {
      const angle = index / scaffoldCount * Math.PI * 2 + 0.35;
      addScaffoldTower(group, Math.cos(angle) * 0.82, Math.sin(angle) * 0.82, 0.55, level === 1 ? 2.8 : 2.35, materials, quality);
    }
    addConstructionCrane(group, -1.1, -0.62, level === 1 ? 3.2 : 2.8, 0.25, materials);
    addConstructionSupplies(group, 2.2, 1.08, materials, quality);
    addConstructionSupplies(group, 4.6, 1.08, materials, quality);
  } else {
    const gardenCount = quality === 'high' ? 18 : quality === 'medium' ? 12 : 8;
    for (let index = 0; index < gardenCount; index += 1) {
      const angle = index / gardenCount * Math.PI * 2;
      const shrub = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1 + (index % 3) * 0.025, 1), materials.leaf);
      shrub.position.set(Math.sin(angle) * 0.92, 0.62, Math.cos(angle) * 0.92);
      shrub.scale.y = 1.3;
      group.add(shrub);
    }
  }
  group.scale.set(level === 3 ? 0.98 : 0.92, level === 3 ? 1 : 0.92, level === 3 ? 0.98 : 0.92);
  shadow(group, quality !== 'low');
  return group;
}

function createStarArchive(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island1WorldMaterials) {
  const group = new THREE.Group();
  group.name = `ISLAND_1_SAVAS_STAR_ARCHIVE_L${level}`;
  const segments = radialSegmentsFor(quality);
  const foundation = cylinder(1.36, 1.5, 0.3, segments, materials.ivoryShade);
  foundation.position.y = 0.24;
  const court = cylinder(1.23, 1.34, 0.18, segments, materials.ivory);
  court.position.y = 0.46;
  const hall = cylinder(0.88, 0.98, 1.18, segments, materials.ivory);
  hall.position.set(0, 1.07, -0.04);
  group.add(foundation, court, hall);
  addRing(group, 1.24, 0.045, 0.44, materials.gold, segments);
  addRing(group, 0.9, 0.04, 0.68, materials.sapphire, segments);
  addRadialStairs(group, 0, 1.2, 0.7, materials);

  const windowCount = quality === 'low' ? 6 : 10;
  for (let index = 0; index < windowCount; index += 1) {
    const angle = index / windowCount * Math.PI * 2;
    addPointedWindow(group, 0.99, angle, 1.16, index % 3 === 0 ? materials.warmGlow : materials.crystal, materials.gold, 1.05);
  }

  const towerCount = level === 1 ? 4 : 6;
  for (let index = 0; index < towerCount; index += 1) {
    const angle = index / towerCount * Math.PI * 2;
    const radial = index % 2 === 0 ? 1.03 : 0.94;
    addTurret(group, Math.sin(angle) * radial, Math.cos(angle) * radial, 1.05 + (level >= 2 ? 0.18 : 0), 0.18, materials, Math.max(8, Math.floor(segments * 0.7)));
  }

  if (level >= 2) {
    [-1, 1].forEach((side) => {
      const x = side * 0.78;
      const z = -0.06;
      const sideHeight = level === 2 ? 1.38 : 1.72;
      const sideTower = cylinder(0.25, 0.31, sideHeight, segments, materials.ivory);
      sideTower.position.set(x, 0.55 + sideHeight / 2, z);
      const sideDomeY = 0.55 + sideHeight;
      const sideDome = new THREE.Mesh(
        new THREE.SphereGeometry(0.31, segments, Math.max(8, Math.floor(segments / 2)), 0, Math.PI * 2, 0, Math.PI / 2),
        materials.sapphire,
      );
      sideDome.position.set(x, sideDomeY, z);
      group.add(sideTower, sideDome);
      const sideAssembly = new THREE.Group();
      sideAssembly.position.set(x, 0, z);
      addRing(sideAssembly, 0.31, 0.035, sideDomeY, materials.gold, segments);
      addDomeRibs(sideAssembly, 0.31, sideDomeY, quality === 'low' ? 4 : 6, materials.gold, quality);
      for (let windowIndex = 0; windowIndex < (quality === 'low' ? 3 : 6); windowIndex += 1) {
        addPointedWindow(sideAssembly, 0.32, windowIndex / (quality === 'low' ? 3 : 6) * Math.PI * 2, 1.22, materials.crystal, materials.gold, 0.82);
      }
      addCrystal(sideAssembly, [0, sideDomeY + 0.39, 0], 0.055, materials.warmGlow);
      group.add(sideAssembly);
    });
  }

  const centralTower = cylinder(0.43, 0.52, 1.42 + (level - 1) * 0.16, segments, materials.ivory);
  centralTower.position.y = 1.42;
  group.add(centralTower);
  for (let index = 0; index < 6; index += 1) {
    addPointedWindow(group, 0.535, index / 6 * Math.PI * 2, 1.72, materials.crystal, materials.gold, 1.08);
  }

  const book = new THREE.Group();
  const leftPageShape = new THREE.Shape();
  leftPageShape.moveTo(-0.56, -0.34);
  leftPageShape.quadraticCurveTo(-0.26, -0.39, 0, -0.28);
  leftPageShape.lineTo(0, 0.28);
  leftPageShape.quadraticCurveTo(-0.29, 0.19, -0.56, 0.33);
  leftPageShape.closePath();
  const leftPage = new THREE.Mesh(new THREE.ExtrudeGeometry(leftPageShape, { depth: 0.055, bevelEnabled: true, bevelSize: 0.018, bevelThickness: 0.015, bevelSegments: 2 }), materials.ivory);
  leftPage.rotation.z = 0.16;
  leftPage.position.x = -0.02;
  const rightPageShape = new THREE.Shape();
  rightPageShape.moveTo(0, -0.28);
  rightPageShape.quadraticCurveTo(0.26, -0.39, 0.56, -0.34);
  rightPageShape.lineTo(0.56, 0.33);
  rightPageShape.quadraticCurveTo(0.29, 0.19, 0, 0.28);
  rightPageShape.closePath();
  const rightPage = new THREE.Mesh(new THREE.ExtrudeGeometry(rightPageShape, { depth: 0.055, bevelEnabled: true, bevelSize: 0.018, bevelThickness: 0.015, bevelSegments: 2 }), materials.ivory);
  rightPage.rotation.z = -0.16;
  rightPage.position.x = 0.02;
  const binding = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.1), materials.gold);
  for (let lineIndex = 0; lineIndex < (quality === 'low' ? 2 : 5); lineIndex += 1) {
    const leftLine = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.018, 0.012), lineIndex % 2 === 0 ? materials.crystal : materials.gold);
    leftLine.position.set(-0.3, -0.19 + lineIndex * 0.09, 0.078);
    const rightLine = leftLine.clone();
    rightLine.position.x = 0.3;
    book.add(leftLine, rightLine);
  }
  book.position.set(0, 1.92, 1.025);
  book.rotation.x = -0.08;
  book.scale.setScalar(level === 1 ? 0.68 : level === 2 ? 0.9 : 1.08);
  book.add(leftPage, rightPage, binding);
  group.add(book);

  const domeRadius = 0.48;
  const domeY = 2.25;
  if (level === 3) {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(domeRadius, segments, Math.max(8, Math.floor(segments / 2)), 0, Math.PI * 2, 0, Math.PI / 2), materials.sapphire);
    dome.position.y = domeY;
    group.add(dome);
  }
  addDomeRibs(group, domeRadius, domeY, quality === 'low' ? 4 : 8, level === 1 ? materials.bark : materials.gold, quality);
  addRing(group, domeRadius, 0.04, domeY, materials.gold, segments);
  const armillaryCenterY = 2.53;
  const armillaryRingCount = level === 1 ? 2 : level === 2 ? 3 : 5;
  for (let ringIndex = 0; ringIndex < armillaryRingCount; ringIndex += 1) {
    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.55 + (ringIndex % 2) * 0.055, 0.032, 6, segments), materials.gold);
    crown.position.y = armillaryCenterY;
    crown.rotation.x = ringIndex * 0.64;
    crown.rotation.y = ringIndex * 0.77;
    group.add(crown);
  }
  for (let index = 0; index < 7 + level * 2; index += 1) {
    const angle = index / (7 + level * 2) * Math.PI * 2;
    addCrystal(group, [Math.cos(angle) * 0.58, 2.68 + (index % 2) * 0.13, Math.sin(angle) * 0.58], 0.065, materials.crystal);
  }
  if (level === 3) addStarFinial(group, 3.08, materials);

  const archiveDoor = new THREE.Mesh(createPointedPanelGeometry(0.34, 0.68), materials.warmGlow);
  archiveDoor.position.set(0, 0.94, 0.995);
  const archiveDoorFrame = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 6, segments, Math.PI), materials.gold);
  archiveDoorFrame.position.set(0, 1.27, 1.01);
  group.add(archiveDoor, archiveDoorFrame);
  if (level === 3) {
    for (let step = 0; step < 6; step += 1) {
      const stair = new THREE.Mesh(new THREE.BoxGeometry(0.74 + step * 0.11, 0.075, 0.18), step === 0 ? materials.gold : materials.ivory);
      stair.position.set(0, 0.5 - step * 0.045, 1.05 + step * 0.14);
      group.add(stair);
    }
    for (let index = 0; index < 8; index += 1) {
      const angle = index / 8 * Math.PI * 2 + Math.PI / 8;
      const facadeSpire = cylinder(0.045, 0.065, 0.58, 6, materials.ivoryShade);
      facadeSpire.position.set(Math.sin(angle) * 1.01, 1.02, Math.cos(angle) * 1.01);
      const facadeCap = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.24, 6), materials.sapphire);
      facadeCap.position.set(Math.sin(angle) * 1.01, 1.43, Math.cos(angle) * 1.01);
      group.add(facadeSpire, facadeCap);
    }
  }

  const shelfCount = quality === 'high' ? 10 : quality === 'medium' ? 7 : 5;
  for (let index = 0; index < shelfCount; index += 1) {
    const angle = index / shelfCount * Math.PI * 2 + 0.18;
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.48, 0.12), materials.bark);
    shelf.position.set(Math.sin(angle) * 0.82, 0.87, Math.cos(angle) * 0.82);
    shelf.rotation.y = angle;
    group.add(shelf);
    if (quality !== 'low') {
      for (let bookIndex = 0; bookIndex < 4; bookIndex += 1) {
        const volume = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.14 + (bookIndex % 2) * 0.04, 0.08), bookIndex % 2 === 0 ? materials.sapphire : materials.gold);
        volume.position.set(Math.sin(angle) * 0.76, 0.76 + bookIndex * 0.09, Math.cos(angle) * 0.76);
        volume.rotation.y = angle;
        group.add(volume);
      }
    }
  }

  if (level < 3) {
    const scaffoldCount = level === 1 ? 4 : 2;
    for (let index = 0; index < scaffoldCount; index += 1) {
      const angle = index / scaffoldCount * Math.PI * 2 + 0.44;
      addScaffoldTower(group, Math.sin(angle) * 0.92, Math.cos(angle) * 0.92, 0.52, level === 1 ? 2.55 : 2.2, materials, quality);
    }
    addConstructionCrane(group, -1.08, -0.45, 3.15, -0.2, materials);
    addConstructionSupplies(group, 2.15, 1.12, materials, quality);
    addConstructionSupplies(group, 4.82, 1.12, materials, quality);
  } else {
    addBanner(group, -0.78, 1.55, 0.58, 0.55, materials);
    addBanner(group, 0.78, 1.55, 0.58, -0.55, materials);
  }
  group.scale.setScalar(0.9);
  shadow(group, quality !== 'low');
  return group;
}

function createEchoObservatory(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island1WorldMaterials) {
  const group = new THREE.Group();
  group.name = `ISLAND_1_ECHO_LENS_OBSERVATORY_L${level}`;
  const segments = radialSegmentsFor(quality);
  const foundation = cylinder(1.35, 1.5, 0.3, segments, materials.ivoryShade);
  foundation.position.y = 0.24;
  const court = cylinder(1.23, 1.34, 0.18, segments, materials.ivory);
  court.position.y = 0.46;
  const drum = cylinder(0.82, 0.94, 1.08, segments, materials.ivory);
  drum.position.set(-0.28, 1.02, -0.28);
  group.add(foundation, court, drum);
  addRing(group, 1.18, 0.045, 0.44, materials.gold, segments);
  addRadialStairs(group, 0, 1.18, 0.7, materials);
  const observatoryWindowCount = quality === 'low' ? 5 : 9;
  const mainHallDetail = new THREE.Group();
  mainHallDetail.position.set(-0.28, 0, -0.28);
  for (let index = 0; index < observatoryWindowCount; index += 1) {
    const angle = index / observatoryWindowCount * Math.PI * 2;
    addPointedWindow(mainHallDetail, 0.955, angle, 1.04, index % 3 === 0 ? materials.warmGlow : materials.crystal, materials.gold, 0.9);
    if (level === 3 && quality !== 'low') {
      addGothicButtress(mainHallDetail, 0.94, angle + Math.PI / observatoryWindowCount, 0.54, 0.92, materials, segments);
    }
  }
  addRing(mainHallDetail, 0.86, 0.045, 1.46, materials.gold, segments);
  group.add(mainHallDetail);

  const domeRadius = 0.74;
  const domeY = 1.56;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(domeRadius, segments, Math.max(8, Math.floor(segments / 2)), 0, Math.PI * 2, 0, Math.PI / 2), materials.sapphire);
  dome.position.set(-0.28, domeY, -0.28);
  if (level >= 2) group.add(dome);
  const domeRibRoot = new THREE.Group();
  domeRibRoot.position.set(-0.28, 0, -0.28);
  addDomeRibs(domeRibRoot, domeRadius, domeY, quality === 'low' ? 4 : 8, level === 1 ? materials.bark : materials.gold, quality);
  group.add(domeRibRoot);

  const globeY = 2.58;
  const globeRadius = level === 1 ? 0.34 : level === 2 ? 0.54 : 0.6;
  const globe = new THREE.Mesh(new THREE.IcosahedronGeometry(globeRadius, quality === 'high' ? 3 : 1), materials.celestial);
  globe.position.set(-0.28, globeY, -0.28);
  globe.userData.armillary = true;
  group.add(globe);
  if (quality !== 'low') {
    const nebulaCore = new THREE.Mesh(new THREE.IcosahedronGeometry(globeRadius * 0.58, 1), materials.crystal);
    nebulaCore.position.copy(globe.position);
    nebulaCore.rotation.set(0.32, 0.78, 0.18);
    group.add(nebulaCore);
    const starCount = quality === 'high' ? 14 : 8;
    for (let index = 0; index < starCount; index += 1) {
      const phi = Math.acos(1 - 2 * (index + 0.5) / starCount);
      const theta = index * 2.399963;
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(index % 3 === 0 ? 0.035 : 0.022), index % 2 === 0 ? materials.warmGlow : materials.crystal);
      star.position.set(
        -0.28 + Math.sin(phi) * Math.cos(theta) * globeRadius * 0.72,
        globeY + Math.cos(phi) * globeRadius * 0.72,
        -0.28 + Math.sin(phi) * Math.sin(theta) * globeRadius * 0.72,
      );
      group.add(star);
    }
  }
  const armillaryCount = level === 1 ? 2 : level === 2 ? 4 : 6;
  for (let index = 0; index < armillaryCount; index += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(globeRadius + 0.1 + (index % 2) * 0.08, 0.025, 5, segments), materials.gold);
    ring.position.set(-0.28, globeY, -0.28);
    ring.rotation.x = index * 0.62;
    ring.rotation.y = index * 0.83;
    ring.userData.armillary = true;
    group.add(ring);
  }
  addCrystal(group, [-0.28, globeY, -0.28], 0.14, materials.crystal);

  const towerPositions = [[-1.02, 0.44], [0.92, 0.15]] as const;
  towerPositions.forEach(([x, z], index) => {
    const towerComplete = level === 3 || (level === 2 && index === 0);
    const towerHeight = towerComplete ? 1.36 + index * 0.18 : level === 1 ? 0.78 + index * 0.1 : 1.06;
    const tower = cylinder(0.28, 0.34, towerHeight, segments, level === 1 ? materials.ivoryShade : materials.ivory);
    tower.position.set(x, 0.54 + towerHeight / 2, z);
    const roof = new THREE.Mesh(new THREE.SphereGeometry(0.3, segments, 8, 0, Math.PI * 2, 0, Math.PI / 2), materials.sapphire);
    roof.position.set(x, 1.9 + index * 0.18, z);
    const barrel = cylinder(0.075, 0.11, 0.68, 8, materials.gold);
    barrel.position.set(x + (index === 0 ? 0.18 : -0.18), 2.08 + index * 0.18, z + 0.18);
    barrel.rotation.z = index === 0 ? -1.04 : 1.04;
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 10), materials.crystal);
    lens.position.copy(barrel.position).add(new THREE.Vector3(index === 0 ? 0.26 : -0.26, 0.32, 0));
    lens.rotation.z = barrel.rotation.z;
    group.add(tower);
    if (towerComplete) group.add(roof, barrel, lens);
    const towerCollar = new THREE.Mesh(new THREE.TorusGeometry(0.285, 0.035, 5, segments), materials.gold);
    towerCollar.rotation.x = Math.PI / 2;
    towerCollar.position.set(x, 1.86 + index * 0.18, z);
    if (towerComplete) group.add(towerCollar);
    for (let windowIndex = 0; windowIndex < 4; windowIndex += 1) {
      const angle = windowIndex / 4 * Math.PI * 2;
      const window = new THREE.Mesh(createPointedPanelGeometry(0.1, towerComplete ? 0.27 : 0.18), towerComplete ? materials.crystal : materials.ivoryShade);
      window.position.set(x + Math.sin(angle) * 0.292, 0.7 + towerHeight * 0.48, z + Math.cos(angle) * 0.292);
      window.rotation.y = angle;
      group.add(window);
    }
    if (!towerComplete) {
      addScaffoldTower(group, x, z, 0.48, towerHeight + 0.48, materials, quality);
    }
  });

  const lensChamber = cylinder(0.46, 0.53, 0.62, segments, materials.ivory);
  lensChamber.position.set(0.38, 0.82, 0.78);
  const lensRoof = new THREE.Mesh(new THREE.SphereGeometry(0.48, segments, 8, 0, Math.PI * 2, 0, Math.PI / 2), materials.sapphire);
  lensRoof.position.set(0.38, 1.12, 0.78);
  const lensCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), materials.crystal);
  lensCrystal.position.set(0.38, 1.66, 0.78);
  group.add(lensChamber);
  if (level >= 2) group.add(lensRoof, lensCrystal);
  const chamberRing = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.035, 5, segments), materials.gold);
  chamberRing.rotation.x = Math.PI / 2;
  chamberRing.position.set(0.38, 1.11, 0.78);
  if (level >= 2) group.add(chamberRing);
  const canopyShape = new THREE.Shape();
  canopyShape.moveTo(-0.52, 0.52);
  canopyShape.quadraticCurveTo(0, 0.62, 0.52, 0.42);
  canopyShape.lineTo(0.46, -0.34);
  canopyShape.quadraticCurveTo(0.2, -0.56, 0, -0.44);
  canopyShape.quadraticCurveTo(-0.2, -0.56, -0.46, -0.34);
  canopyShape.closePath();
  const canopyGeometry = new THREE.ExtrudeGeometry(canopyShape, {
    depth: 0.045,
    bevelEnabled: quality !== 'low',
    bevelSize: 0.018,
    bevelThickness: 0.015,
    bevelSegments: quality === 'high' ? 2 : 1,
  });
  const canopy = new THREE.Mesh(canopyGeometry, materials.sapphire);
  canopy.position.set(0.35, 1.48, 0.52);
  canopy.rotation.z = -0.08;
  const canopyLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.14, 0.05), materials.gold);
  canopyLeft.position.set(-0.17, 1.48, 0.54);
  canopyLeft.rotation.z = -0.08;
  const canopyRight = canopyLeft.clone();
  canopyRight.position.x = 0.87;
  const canopyCrest = new THREE.Mesh(new THREE.OctahedronGeometry(0.11), materials.gold);
  canopyCrest.position.set(0.35, 1.49, 0.59);
  canopyCrest.scale.set(0.74, 1.6, 0.28);
  const canopyStar = new THREE.Mesh(new THREE.OctahedronGeometry(0.055), materials.warmGlow);
  canopyStar.position.set(0.35, 1.5, 0.62);
  if (level >= 2) {
    if (level === 2) {
      canopy.scale.x = 0.58;
      canopy.position.x -= 0.22;
      canopyRight.position.x = 0.44;
    }
    group.add(canopy, canopyLeft, canopyRight);
    if (level === 3) group.add(canopyCrest, canopyStar);
  }

  if (level === 3) {
    const mainDoor = new THREE.Mesh(createPointedPanelGeometry(0.34, 0.64), materials.warmGlow);
    mainDoor.position.set(-0.28, 0.92, 0.675);
    group.add(mainDoor);
    for (let index = 0; index < 6; index += 1) {
      const angle = index / 6 * Math.PI * 2 + Math.PI / 6;
      addTurret(group, Math.sin(angle) * 1.14, Math.cos(angle) * 1.14, 0.58 + (index % 2) * 0.14, 0.12, materials, Math.max(7, Math.floor(segments * 0.55)));
    }
  }

  if (level < 3) {
    const scaffoldCount = level === 1 ? 5 : 2;
    for (let index = 0; index < scaffoldCount; index += 1) {
      const angle = index / scaffoldCount * Math.PI * 2 + 0.18;
      addScaffoldTower(group, Math.sin(angle) * 1.02, Math.cos(angle) * 1.02, 0.5, level === 1 ? 2.35 : 1.92, materials, quality);
    }
    if (level === 1) addConstructionCrane(group, -1.16, -0.72, 3.1, 0.4, materials);
    addConstructionSupplies(group, 2.42, 1.12, materials, quality);
  } else {
    addBanner(group, -0.92, 1.48, 0.66, 0.3, materials);
    addBanner(group, 0.78, 1.48, 0.7, -0.3, materials);
  }
  group.scale.setScalar(0.9);
  shadow(group, quality !== 'low');
  return group;
}

function createSunCourt(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island1WorldMaterials) {
  const group = new THREE.Group();
  group.name = `ISLAND_1_FIRST_LIGHT_SUN_COURT_L${level}`;
  const segments = radialSegmentsFor(quality);
  const foundation = cylinder(1.82, 1.98, 0.32, segments, materials.ivoryShade);
  foundation.position.y = 0.23;
  const court = cylinder(1.68, 1.82, 0.18, segments, materials.ivory);
  court.position.y = 0.47;
  group.add(foundation, court);
  addRing(group, 1.62, 0.06, 0.44, materials.gold, segments);
  addRing(group, 1.26, 0.035, 0.56, materials.sapphire, segments);
  addRing(group, 0.66, 0.025, 0.57, materials.gold, segments);

  const rayCount = quality === 'low' ? 12 : 20;
  for (let index = 0; index < rayCount; index += 1) {
    const angle = index / rayCount * Math.PI * 2;
    if (index % 2 === 0) {
      const blueRay = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.014, 0.7), materials.sapphire);
      blueRay.position.set(Math.sin(angle) * 0.36, 0.568, Math.cos(angle) * 0.36);
      blueRay.rotation.y = angle;
      group.add(blueRay);
    }
    const ray = new THREE.Mesh(new THREE.BoxGeometry(index % 2 === 0 ? 0.055 : 0.035, 0.018, index % 2 === 0 ? 0.72 : 0.54), materials.gold);
    ray.position.set(Math.sin(angle) * (index % 2 === 0 ? 0.36 : 0.27), 0.575, Math.cos(angle) * (index % 2 === 0 ? 0.36 : 0.27));
    ray.rotation.y = angle;
    group.add(ray);
  }
  const sunSocket = cylinder(0.32, 0.38, 0.12, segments, materials.sapphire);
  sunSocket.position.y = 0.61;
  const sunOrb = new THREE.Mesh(new THREE.SphereGeometry(level === 1 ? 0.13 : 0.22, segments, Math.max(8, Math.floor(segments / 2))), level === 1 ? materials.cyanGlass : materials.warmGlow);
  sunOrb.scale.y = 0.42;
  sunOrb.position.y = 0.73;
  const sunWellRing = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.045, 6, segments), materials.gold);
  sunWellRing.rotation.x = Math.PI / 2;
  sunWellRing.position.y = 0.71;
  group.add(sunSocket, sunOrb, sunWellRing);

  if (level === 3) {
    const tableShape = new THREE.Shape();
    tableShape.absarc(0, 0, 0.79, 0, Math.PI * 2, false);
    const tableOpening = new THREE.Path();
    tableOpening.absarc(0, 0, 0.38, 0, Math.PI * 2, true);
    tableShape.holes.push(tableOpening);
    const councilTable = new THREE.Mesh(
      new THREE.ExtrudeGeometry(tableShape, {
        depth: 0.1,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.025,
        bevelThickness: 0.025,
        curveSegments: Math.max(16, segments),
      }),
      materials.bark,
    );
    councilTable.name = 'ISLAND_1_MISSION_COUNCIL_TABLE';
    councilTable.rotation.x = Math.PI / 2;
    councilTable.position.y = 0.88;
    group.add(councilTable);

    const tableInlay = new THREE.Mesh(new THREE.TorusGeometry(0.59, 0.025, 6, segments), materials.gold);
    tableInlay.name = 'ISLAND_1_MISSION_COUNCIL_TABLE_INLAY';
    tableInlay.rotation.x = Math.PI / 2;
    tableInlay.position.y = 0.945;
    group.add(tableInlay);

    const seatCount = 8;
    const seatRadius = 1.11;
    const seatAngles = Array.from({ length: seatCount }, (_, index) => (index / seatCount * Math.PI * 2) + Math.PI / 8);
    seatAngles.forEach((angle, index) => {
      const seatRoot = new THREE.Group();
      seatRoot.name = index === 0 ? 'ISLAND_1_MISSION_PLAYER_SEAT' : `ISLAND_1_MISSION_COUNCIL_SEAT_${index}`;
      seatRoot.position.set(Math.sin(angle) * seatRadius, 0, Math.cos(angle) * seatRadius);
      seatRoot.rotation.y = angle + Math.PI;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.09, 0.28), index === 0 ? materials.sapphire : materials.ivoryShade);
      seat.position.y = 0.76;
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.38, 0.08), index === 0 ? materials.sapphire : materials.ivoryShade);
      back.position.set(0, 0.91, 0.13);
      back.rotation.x = -0.12;
      const crest = new THREE.Mesh(new THREE.OctahedronGeometry(index === 0 ? 0.07 : 0.05), index === 0 ? materials.warmGlow : materials.gold);
      crest.position.set(0, 1.13, 0.13);
      crest.scale.set(1.25, 0.82, 0.42);
      const pedestal = cylinder(0.07, 0.1, 0.2, 6, materials.gold);
      pedestal.position.y = 0.65;
      seatRoot.add(seat, back, crest, pedestal);
      group.add(seatRoot);
    });
    const playerSeatAngle = seatAngles[0];
    group.userData.missionBriefing = {
      tableCenter: [0, 0.91, 0],
      playerSeat: [Math.sin(playerSeatAngle) * seatRadius, 0.76, Math.cos(playerSeatAngle) * seatRadius],
      playerFacing: [0, 0.86, 0],
      cameraPosition: [Math.sin(playerSeatAngle) * 1.46, 1.28, Math.cos(playerSeatAngle) * 1.46],
      cameraTarget: [0, 0.88, 0],
      seatCount,
    };
  }

  for (let entry = 0; entry < 4; entry += 1) addRadialStairs(group, entry / 4 * Math.PI * 2, 1.7, 0.74, materials);

  const pylonCount = level === 1 ? 4 : level === 2 ? 8 : 12;
  for (let index = 0; index < pylonCount; index += 1) {
    const angle = index / pylonCount * Math.PI * 2;
    const cardinal = index % Math.max(1, Math.floor(pylonCount / 4)) === 0;
    const height = level === 1 ? 0.48 : level === 2 ? (cardinal ? 0.72 : 0.58) : (cardinal ? 0.78 : 0.64);
    const base = cylinder(0.09, 0.13, height, 6, materials.ivory);
    base.position.set(Math.sin(angle) * 1.42, 0.56 + height / 2, Math.cos(angle) * 1.42);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.22, 6), materials.gold);
    cap.position.set(Math.sin(angle) * 1.42, 0.57 + height + 0.1, Math.cos(angle) * 1.42);
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), materials.crystal);
    crystal.position.set(Math.sin(angle) * 1.42, 0.59 + height + 0.25, Math.cos(angle) * 1.42);
    crystal.scale.y = 1.45;
    group.add(base, cap, crystal);
  }

  if (level >= 2) {
    addCircularArcade(group, 1.55, 0.58, level === 2 ? 0.42 : 0.64, quality === 'low' ? 12 : 20, level === 2 ? 0.62 : 1, materials, quality);
    const friezeCount = quality === 'high' ? 20 : quality === 'medium' ? 14 : 10;
    const completedFriezeCount = level === 2 ? Math.round(friezeCount * 0.65) : friezeCount;
    for (let index = 0; index < completedFriezeCount; index += 1) {
      const angle = index / friezeCount * Math.PI * 2;
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.035), materials.sapphire);
      panel.position.set(Math.sin(angle) * 1.73, 0.67, Math.cos(angle) * 1.73);
      panel.rotation.y = angle;
      const sun = new THREE.Mesh(new THREE.OctahedronGeometry(0.045), materials.gold);
      sun.position.set(Math.sin(angle) * 1.755, 0.67, Math.cos(angle) * 1.755);
      sun.scale.set(1.45, 1.45, 0.35);
      group.add(panel, sun);
    }
  }
  if (level === 3) {
    for (let archIndex = 0; archIndex < 4; archIndex += 1) {
      const angle = archIndex / 4 * Math.PI * 2;
      const archRoot = new THREE.Group();
      archRoot.position.set(Math.sin(angle) * 1.45, 0, Math.cos(angle) * 1.45);
      archRoot.rotation.y = angle;
      [-0.27, 0.27].forEach((x) => {
        const columnBase = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.22), materials.ivoryShade);
        columnBase.position.set(x, 0.65, 0);
        const column = cylinder(0.07, 0.09, 0.76, 7, materials.ivory);
        column.position.set(x, 1.06, 0);
        const crystalBase = new THREE.Mesh(new THREE.OctahedronGeometry(0.075), materials.crystal);
        crystalBase.position.set(x, 1.49, 0);
        crystalBase.scale.y = 1.3;
        archRoot.add(columnBase, column, crystalBase);
      });
      const arch = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.055, 6, 14, Math.PI), materials.gold);
      arch.position.set(0, 1.42, 0);
      arch.rotation.z = Math.PI;
      const innerArch = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.028, 5, 14, Math.PI), materials.sapphire);
      innerArch.position.set(0, 1.42, 0.006);
      innerArch.rotation.z = Math.PI;
      const archCrest = new THREE.Mesh(new THREE.OctahedronGeometry(0.085), materials.warmGlow);
      archCrest.position.set(0, 1.73, 0);
      archCrest.scale.y = 1.35;
      archRoot.add(arch, innerArch, archCrest);
      group.add(archRoot);
      const tangentOffset = 0.36;
      addBanner(
        group,
        Math.sin(angle) * 1.45 + Math.cos(angle) * tangentOffset,
        1.12,
        Math.cos(angle) * 1.45 - Math.sin(angle) * tangentOffset,
        angle,
        materials,
      );
    }
  }
  shadow(group, quality !== 'low');
  return group;
}

export function buildIsland1Landmark(
  definition: Island5LandmarkDefinition,
  level: BuildLevel,
  quality: Island3DQuality,
  materials: Island1WorldMaterials,
) {
  const root = new THREE.Group();
  root.name = `ISLAND_1_${definition.id.toUpperCase()}_ROOT`;
  root.position.set(...definition.position);
  if (level === 0) {
    const foundation = cylinder(
      definition.id === 'boss' ? 2 : 1.48,
      definition.id === 'boss' ? 2.12 : 1.6,
      0.18,
      radialSegmentsFor(quality),
      definition.id === 'boss' ? materials.moonstone : materials.ivoryShade,
    );
    foundation.position.y = 0.12;
    root.add(foundation);
  } else {
    const resolvedLevel = level as 1 | 2 | 3;
    const building = definition.id === 'hatchery'
      ? createLanternHatchery(resolvedLevel, quality, materials)
      : definition.id === 'habit'
        ? createRhythmTree(resolvedLevel, quality, materials)
        : definition.id === 'wisdom'
          ? createStarArchive(resolvedLevel, quality, materials)
          : definition.id === 'event'
            ? createEchoObservatory(resolvedLevel, quality, materials)
            : createSunCourt(resolvedLevel, quality, materials);
    if (definition.id !== 'boss') {
      building.rotation.y = Math.atan2(-definition.position[0], -definition.position[2]);
    }
    compactStaticGeometry(building, `ISLAND1_${definition.id.toUpperCase()}_L${resolvedLevel}`);
    root.add(building);
  }
  root.traverse((child) => { child.userData.landmarkId = definition.id; });
  return root;
}

function createCloudCluster(seed: number, quality: Island3DQuality, material: THREE.Material) {
  const group = new THREE.Group();
  const count = quality === 'high' ? 10 : quality === 'medium' ? 7 : 4;
  for (let index = 0; index < count; index += 1) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.72 + (index % 3) * 0.22, quality === 'low' ? 7 : 10, 7), material);
    puff.scale.set(1.45, 0.72, 1);
    puff.position.set((index - count / 2) * 0.74, Math.sin(index * 1.7 + seed) * 0.24, Math.cos(index * 1.2 + seed) * 0.48);
    group.add(puff);
  }
  group.userData.cloudSeed = seed;
  return group;
}

function addIsland1DistantMountains(root: THREE.Group, quality: Island3DQuality) {
  const mountains = new THREE.Group();
  mountains.name = 'ISLAND_1_DISTANT_MOUNTAIN_RING';
  const ridgeMaterial = new THREE.MeshStandardMaterial({
    color: 0x86aebb,
    roughness: 0.96,
    metalness: 0,
    flatShading: true,
    fog: false,
  });
  const shadowMaterial = new THREE.MeshStandardMaterial({
    color: 0x6f91aa,
    roughness: 0.98,
    metalness: 0,
    flatShading: true,
    fog: false,
  });
  const capMaterial = new THREE.MeshStandardMaterial({
    color: 0xdceff1,
    roughness: 0.88,
    metalness: 0,
    flatShading: true,
    fog: false,
  });
  const beaconMaterial = new THREE.MeshStandardMaterial({
    color: 0x8ae8ff,
    emissive: 0x178ab7,
    emissiveIntensity: 0.48,
    roughness: 0.18,
    metalness: 0.04,
    fog: false,
  });
  const shoreFoamMaterial = new THREE.MeshBasicMaterial({
    color: 0xd7f8ff,
    transparent: true,
    opacity: quality === 'low' ? 0.48 : 0.68,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  const segmentCount = quality === 'high' ? 9 : quality === 'medium' ? 7 : 6;

  buildIsland1MountainLayout(quality).forEach((entry, index) => {
    const cluster = new THREE.Group();
    cluster.name = `ISLAND_1_DISTANT_MOUNTAIN_${index + 1}`;
    cluster.position.set(Math.cos(entry.angle) * entry.radius, 0, Math.sin(entry.angle) * entry.radius);
    cluster.rotation.y = -entry.angle + Math.PI / 2;

    const mainPeak = new THREE.Mesh(
      new THREE.ConeGeometry(entry.width, entry.height, segmentCount),
      index % 2 === 0 ? ridgeMaterial : shadowMaterial,
    );
    mainPeak.position.y = ISLAND_1_OCEAN_SURFACE_Y + entry.height / 2 + 0.08;
    mainPeak.rotation.y = index * 0.41;
    mainPeak.scale.z = 0.72;

    const shoulderHeight = entry.height * (0.58 + (index % 3) * 0.045);
    const shoulderWidth = entry.width * 0.58;
    const shoulder = new THREE.Mesh(
      new THREE.ConeGeometry(shoulderWidth, shoulderHeight, Math.max(5, segmentCount - 1)),
      index % 2 === 0 ? shadowMaterial : ridgeMaterial,
    );
    shoulder.position.set(
      entry.shoulderSide * entry.width * 0.63,
      ISLAND_1_OCEAN_SURFACE_Y + shoulderHeight / 2 + 0.04,
      0.42,
    );
    shoulder.rotation.y = -index * 0.29;
    shoulder.scale.z = 0.76;

    const capHeight = entry.height * 0.22;
    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(entry.width * 0.31, capHeight, segmentCount),
      capMaterial,
    );
    cap.position.y = ISLAND_1_OCEAN_SURFACE_Y + entry.height - capHeight / 2 + 0.08;
    cap.rotation.y = mainPeak.rotation.y;
    cap.scale.z = 0.72;
    const islandShelf = new THREE.Mesh(
      new THREE.CylinderGeometry(entry.width * 1.02, entry.width * 1.18, 0.42, segmentCount),
      index % 2 === 0 ? shadowMaterial : ridgeMaterial,
    );
    islandShelf.position.y = ISLAND_1_OCEAN_SURFACE_Y + 0.12;
    islandShelf.scale.z = 0.68;
    const shoreFoam = new THREE.Mesh(
      new THREE.TorusGeometry(entry.width * 1.13, 0.065, 5, quality === 'low' ? 12 : 18),
      shoreFoamMaterial,
    );
    shoreFoam.position.y = ISLAND_1_OCEAN_SURFACE_Y + 0.025;
    shoreFoam.rotation.x = Math.PI / 2;
    shoreFoam.scale.z = 0.68;
    cluster.add(islandShelf, shoreFoam, mainPeak, shoulder, cap);

    if (quality !== 'low' && index % 3 === 0) {
      const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.18 + entry.height * 0.008), beaconMaterial);
      beacon.position.y = ISLAND_1_OCEAN_SURFACE_Y + entry.height + 0.18;
      beacon.scale.y = 1.4;
      cluster.add(beacon);
    }
    mountains.add(cluster);
  });
  // Keep the eight small clusters separate so the runtime can cull the
  // camera-side hemisphere. That is what prevents a distant peak becoming a
  // foreground corner shape during a 360-degree orbit.
  root.add(mountains);
  return mountains;
}

function createWaterRibbonGeometry(points: readonly THREE.Vector3[], width: number) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => point.clone()), false, 'centripetal');
  const ribbonPoints = curve.getPoints(Math.max(12, (points.length - 1) * 5));
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  ribbonPoints.forEach((point, index) => {
    const previous = ribbonPoints[Math.max(0, index - 1)];
    const next = ribbonPoints[Math.min(ribbonPoints.length - 1, index + 1)];
    const tangent = next.clone().sub(previous).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x);
    if (side.lengthSq() < 0.001) side.set(1, 0, 0);
    side.normalize().multiplyScalar(width * (0.84 + Math.sin(index * 1.7) * 0.16));
    positions.push(
      point.x - side.x, point.y - side.y, point.z - side.z,
      point.x + side.x, point.y + side.y, point.z + side.z,
    );
    const progress = index / Math.max(1, ribbonPoints.length - 1);
    uvs.push(0, progress, 1, progress);
    if (index < ribbonPoints.length - 1) {
      const left = index * 2;
      const right = left + 1;
      indices.push(left, left + 2, right, right, left + 2, right + 2);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function sampleWatercourse(points: readonly THREE.Vector3[], progress: number) {
  const scaled = THREE.MathUtils.clamp(progress, 0, 0.9999) * (points.length - 1);
  const index = Math.floor(scaled);
  return points[index].clone().lerp(points[index + 1], scaled - index);
}

function createFirstLightBird(materials: Island1WorldMaterials, quality: Island3DQuality) {
  const bird = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.08, quality === 'high' ? 8 : 6, 5), materials.ivory);
  body.scale.set(0.7, 0.55, 1.8);
  const wingGeometry = new THREE.PlaneGeometry(0.3, 0.11);
  const leftWing = new THREE.Mesh(wingGeometry, materials.ivory);
  leftWing.position.x = -0.17;
  leftWing.rotation.z = -0.32;
  const rightWing = new THREE.Mesh(wingGeometry, materials.ivory);
  rightWing.position.x = 0.17;
  rightWing.rotation.z = 0.32;
  bird.add(body, leftWing, rightWing);
  bird.userData.leftWing = leftWing;
  bird.userData.rightWing = rightWing;
  return bird;
}

function createFirstLightFish(materials: Island1WorldMaterials, quality: Island3DQuality) {
  const fish = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.13, quality === 'high' ? 10 : 7, 6), materials.cyanGlass);
  body.scale.set(0.58, 0.42, 1.55);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.23, 3), materials.gold);
  tail.position.z = -0.24;
  tail.rotation.x = -Math.PI / 2;
  fish.add(body, tail);
  return fish;
}

function createFirstLightSkiff(
  materials: Island1WorldMaterials,
  quality: Island3DQuality,
  wakeMaterial: THREE.MeshBasicMaterial,
) {
  const skiff = new THREE.Group();
  const hull = new THREE.Mesh(
    new THREE.SphereGeometry(0.31, quality === 'low' ? 8 : 12, 7),
    materials.ivoryShade,
  );
  hull.scale.set(0.72, 0.28, 1.55);
  hull.position.y = 0.03;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.62), materials.ivory);
  deck.position.y = 0.16;
  const mast = cylinder(0.025, 0.032, 0.72, 6, materials.gold);
  mast.position.set(0, 0.5, 0.02);
  const sailMaterial = materials.sapphire.clone();
  sailMaterial.side = THREE.DoubleSide;
  sailMaterial.roughness = 0.26;
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.58), sailMaterial);
  sail.position.set(0.22, 0.53, 0.02);
  sail.rotation.y = -0.08;
  sail.rotation.z = -0.12;
  const rearSail = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.46), sailMaterial);
  rearSail.position.set(-0.14, 0.48, -0.04);
  rearSail.rotation.y = 0.72;
  rearSail.rotation.z = 0.1;
  const sailCrest = new THREE.Mesh(new THREE.CircleGeometry(0.065, 8), materials.gold);
  sailCrest.position.set(0.225, 0.56, 0.035);
  const pennant = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.07), materials.gold);
  pennant.position.set(0.1, 0.88, 0.02);
  const wake = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 1.18), wakeMaterial);
  wake.rotation.x = -Math.PI / 2;
  wake.position.set(0, -0.035, -0.8);
  wake.renderOrder = 2;
  skiff.add(wake, hull, deck, mast, sail, rearSail, sailCrest, pennant);
  return skiff;
}

function addSeaStack(group: THREE.Group, x: number, z: number, scale: number, materials: Island1WorldMaterials, quality: Island3DQuality) {
  const islet = new THREE.Group();
  islet.name = 'ISLAND_1_OCEAN_ROOTED_SEA_STACK';
  islet.position.set(x, 0, z);
  islet.scale.setScalar(scale);
  const segments = radialSegmentsFor(quality);
  const reefFoot = cylinder(1.06, 1.2, 0.46, segments, materials.ivoryShade);
  reefFoot.position.y = ISLAND_1_OCEAN_SURFACE_Y + 0.16;
  const cliff = cylinder(0.72, 0.98, 1.78, segments, materials.ivoryShade);
  cliff.position.y = ISLAND_1_OCEAN_SURFACE_Y + 1.02;
  const gardenShelf = cylinder(0.78, 0.72, 0.2, segments, materials.ivory);
  gardenShelf.position.y = ISLAND_1_OCEAN_SURFACE_Y + 1.93;
  islet.add(reefFoot, cliff, gardenShelf);
  const tower = cylinder(0.18, 0.23, 0.65, 8, materials.ivory);
  tower.position.y = ISLAND_1_OCEAN_SURFACE_Y + 2.34;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.45, 8), materials.sapphire);
  roof.position.y = ISLAND_1_OCEAN_SURFACE_Y + 2.88;
  islet.add(tower, roof);
  const waterfall = new THREE.Mesh(
    new THREE.PlaneGeometry(0.24, 1.68),
    new THREE.MeshBasicMaterial({ color: 0x9deaff, transparent: true, opacity: 0.58, side: THREE.DoubleSide, depthWrite: false }),
  );
  waterfall.position.set(0.54, ISLAND_1_OCEAN_SURFACE_Y + 0.9, 0.12);
  const splash = new THREE.Mesh(
    new THREE.RingGeometry(0.12, 0.34, quality === 'low' ? 10 : 18),
    new THREE.MeshBasicMaterial({ color: 0xe8fdff, transparent: true, opacity: 0.54, side: THREE.DoubleSide, depthWrite: false }),
  );
  splash.rotation.x = -Math.PI / 2;
  splash.position.set(0.54, ISLAND_1_OCEAN_SURFACE_Y + 0.025, 0.12);
  islet.add(waterfall, splash);
  group.add(islet);
  return islet;
}

function addIsland1CoastalRelief(
  root: THREE.Group,
  profile: Island3DQualityProfile,
  materials: Island1WorldMaterials,
  cliffMaterial: THREE.Material,
) {
  const relief = new THREE.Group();
  relief.name = 'ISLAND_1_HERO_COASTAL_RELIEF';
  const ledgeCount = profile.id === 'high' ? 28 : profile.id === 'medium' ? 18 : 10;
  const ledgeGeometry = new THREE.DodecahedronGeometry(0.38, 0);
  const ledges = new THREE.InstancedMesh(ledgeGeometry, cliffMaterial, ledgeCount);
  ledges.name = 'ISLAND_1_CLIFF_STRATA_LEDGE_ARRAY';
  const greenery = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.2, 0),
    materials.leafDark,
    ledgeCount,
  );
  greenery.name = 'ISLAND_1_CLIFF_GREENERY_SEAM_ARRAY';
  const dummy = new THREE.Object3D();
  for (let index = 0; index < ledgeCount; index += 1) {
    const angle = index / ledgeCount * Math.PI * 2 + Math.sin(index * 2.13) * 0.09;
    const verticalBand = index % 4;
    const radius = 6.48 + verticalBand * 0.18 + Math.sin(index * 1.71) * 0.12;
    const y = 0.05 - verticalBand * 0.44 + Math.sin(index * 1.33) * 0.08;
    dummy.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    dummy.rotation.set(index * 0.17, -angle, index * 0.11);
    dummy.scale.set(1.45 + (index % 3) * 0.24, 0.42 + (index % 2) * 0.12, 0.72);
    dummy.updateMatrix();
    ledges.setMatrixAt(index, dummy.matrix);
    dummy.position.set(Math.cos(angle) * (radius - 0.12), y + 0.24, Math.sin(angle) * (radius - 0.12));
    dummy.rotation.set(0, -angle, 0);
    dummy.scale.set(1.25 + (index % 2) * 0.35, 0.34, 0.7);
    dummy.updateMatrix();
    greenery.setMatrixAt(index, dummy.matrix);
  }
  relief.add(ledges, greenery);

  // Broad vertical buttresses break the generic cylinder into an inhabited,
  // water-eroded cliff crown. Instancing keeps this extra silhouette detail to
  // one draw call at every quality tier.
  const buttressCount = profile.id === 'high' ? 42 : profile.id === 'medium' ? 28 : 16;
  const buttresses = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.46, 0),
    cliffMaterial,
    buttressCount,
  );
  buttresses.name = 'ISLAND_1_ERODED_CLIFF_BUTTRESS_ARRAY';
  for (let index = 0; index < buttressCount; index += 1) {
    const angle = index / buttressCount * Math.PI * 2 + Math.sin(index * 1.91) * 0.075;
    const band = index % 3;
    const radius = 6.52 + Math.sin(index * 2.37) * 0.22 + band * 0.08;
    dummy.position.set(
      Math.cos(angle) * radius,
      -0.42 - band * 0.55 + Math.sin(index * 0.83) * 0.1,
      Math.sin(angle) * radius,
    );
    dummy.rotation.set(index * 0.09, -angle, Math.sin(index * 1.17) * 0.16);
    dummy.scale.set(
      0.74 + (index % 4) * 0.11,
      1.18 + (index % 5) * 0.18,
      0.62 + (index % 3) * 0.12,
    );
    dummy.updateMatrix();
    buttresses.setMatrixAt(index, dummy.matrix);
  }
  relief.add(buttresses);

  const reefRockCount = profile.id === 'high' ? 30 : profile.id === 'medium' ? 20 : 12;
  const reefRocks = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.3, 0),
    cliffMaterial,
    reefRockCount,
  );
  reefRocks.name = 'ISLAND_1_OCEAN_ROOTED_REEF_FOOT_ARRAY';
  for (let index = 0; index < reefRockCount; index += 1) {
    const angle = index / reefRockCount * Math.PI * 2 + Math.sin(index * 2.73) * 0.11;
    const radius = 7.08 + (index % 3) * 0.2;
    dummy.position.set(
      Math.cos(angle) * radius,
      ISLAND_1_OCEAN_SURFACE_Y + 0.12 + (index % 2) * 0.08,
      Math.sin(angle) * radius,
    );
    dummy.rotation.set(index * 0.21, -angle, index * 0.13);
    dummy.scale.set(1.15 + (index % 4) * 0.18, 0.48 + (index % 3) * 0.14, 0.85);
    dummy.updateMatrix();
    reefRocks.setMatrixAt(index, dummy.matrix);
  }
  relief.add(reefRocks);

  const hangingGardenCount = profile.id === 'high' ? 34 : profile.id === 'medium' ? 22 : 12;
  const hangingGardens = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.18, 0),
    materials.leaf,
    hangingGardenCount,
  );
  hangingGardens.name = 'ISLAND_1_HANGING_CLIFF_GARDEN_ARRAY';
  const cliffFlowers = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(0.055, 0),
    materials.warmGlow,
    hangingGardenCount,
  );
  cliffFlowers.name = 'ISLAND_1_HANGING_GARDEN_FLOWER_LIGHTS';
  for (let index = 0; index < hangingGardenCount; index += 1) {
    const angle = index / hangingGardenCount * Math.PI * 2 + 0.14;
    const band = index % 3;
    const radius = 6.66 + band * 0.12;
    const y = -0.18 - band * 0.54 + Math.sin(index * 1.47) * 0.1;
    dummy.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    dummy.rotation.set(0, -angle, index * 0.08);
    dummy.scale.set(1.25 + (index % 2) * 0.28, 0.52 + band * 0.1, 0.72);
    dummy.updateMatrix();
    hangingGardens.setMatrixAt(index, dummy.matrix);
    dummy.position.set(
      Math.cos(angle) * (radius + 0.05),
      y + 0.08,
      Math.sin(angle) * (radius + 0.05),
    );
    dummy.scale.setScalar(index % 4 === 0 ? 1.3 : 0.8);
    dummy.updateMatrix();
    cliffFlowers.setMatrixAt(index, dummy.matrix);
  }
  relief.add(hangingGardens, cliffFlowers);

  const coveLightCount = profile.id === 'high' ? 16 : profile.id === 'medium' ? 10 : 6;
  const coveLights = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.055, 7, 5),
    materials.warmGlow,
    coveLightCount,
  );
  coveLights.name = 'ISLAND_1_INHABITED_CLIFF_COVE_LIGHTS';
  for (let index = 0; index < coveLightCount; index += 1) {
    const angle = index / coveLightCount * Math.PI * 2 + 0.21;
    const radius = 6.68 + (index % 2) * 0.12;
    dummy.position.set(Math.cos(angle) * radius, -0.24 - (index % 3) * 0.36, Math.sin(angle) * radius);
    dummy.scale.set(1.4, 0.72, 0.48);
    dummy.updateMatrix();
    coveLights.setMatrixAt(index, dummy.matrix);
  }
  relief.add(coveLights);
  root.add(relief);
}

export function createIsland1LivingAmbience(
  scene: THREE.Scene,
  profile: Island3DQualityProfile,
  materials: Island1WorldMaterials,
  ocean: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshPhysicalMaterial>,
  cliffMaterial: THREE.Material,
): Island1AmbienceRuntime {
  const root = new THREE.Group();
  root.name = 'ISLAND_1_LIVING_AMBIENCE';
  const lifeBudget = getIsland1AmbienceLifeBudget(profile.id);
  const cloudMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.94,
    transparent: true,
    opacity: 0.76,
    depthWrite: false,
    fog: false,
  });
  const cloudLayout = buildIsland1CloudLayout(profile.id);
  const clouds = cloudLayout.map((entry, index) => {
    const cloud = createCloudCluster(index * 2.1, profile.id, cloudMaterial);
    cloud.name = `ISLAND_1_ELEVATED_CLOUD_${index + 1}`;
    cloud.position.set(Math.cos(entry.angle) * entry.radius, entry.centerY, Math.sin(entry.angle) * entry.radius);
    cloud.scale.setScalar(entry.scale);
    cloud.rotation.y = -entry.angle;
    cloud.userData.minimumWorldY = entry.minimumY;
    root.add(cloud);
    return cloud;
  });
  const mountains = addIsland1DistantMountains(root, profile.id);

  addIsland1CoastalRelief(root, profile, materials, cliffMaterial);

  const isletCount = profile.id === 'high' ? 6 : profile.id === 'medium' ? 4 : 2;
  const seaStacks: THREE.Group[] = [];
  for (let index = 0; index < isletCount; index += 1) {
    const angle = index / isletCount * Math.PI * 2 + 0.4;
    const seaStack = addSeaStack(root, Math.cos(angle) * (17 + index), Math.sin(angle) * (17 + index), 0.62 + (index % 2) * 0.2, materials, profile.id);
    seaStacks.push(seaStack);
  }

  const cascadeCount = lifeBudget.cascadeCount;
  const waterfallMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x72ddff,
    emissive: 0x1688bd,
    emissiveIntensity: 0.42,
    roughness: 0.08,
    metalness: 0.02,
    transparent: true,
    opacity: profile.id === 'low' ? 0.66 : 0.78,
    transmission: profile.id === 'high' ? 0.12 : 0,
    thickness: 0.12,
    clearcoat: 0.72,
    clearcoatRoughness: 0.08,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const springMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x74dfff,
    roughness: 0.06,
    transparent: true,
    opacity: 0.76,
    transmission: profile.id === 'high' ? 0.18 : 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const foamMaterial = new THREE.MeshBasicMaterial({
    color: 0xf1ffff,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const crestMaterial = new THREE.MeshBasicMaterial({
    color: 0xcaf7ff,
    transparent: true,
    opacity: 0.46,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });
  const springPoolGeometry = new THREE.CircleGeometry(0.42, profile.id === 'low' ? 10 : 18);
  springPoolGeometry.rotateX(-Math.PI / 2);
  const springPools = new THREE.InstancedMesh(springPoolGeometry, springMaterial, cascadeCount);
  springPools.name = 'ISLAND_1_CRYSTAL_SPRING_POOLS';
  const plungeFoamGeometry = new THREE.RingGeometry(0.14, 0.55, profile.id === 'low' ? 10 : 20);
  plungeFoamGeometry.rotateX(-Math.PI / 2);
  const plungeFoam = new THREE.InstancedMesh(plungeFoamGeometry, foamMaterial, cascadeCount);
  plungeFoam.name = 'ISLAND_1_WATERFALL_PLUNGE_FOAM';
  plungeFoam.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const springRippleGeometry = new THREE.RingGeometry(0.15, 0.205, profile.id === 'low' ? 10 : 18);
  springRippleGeometry.rotateX(-Math.PI / 2);
  const springRippleMaterial = new THREE.MeshBasicMaterial({
    color: 0xd8fbff,
    transparent: true,
    opacity: profile.id === 'low' ? 0.34 : 0.5,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const springRipples = new THREE.InstancedMesh(springRippleGeometry, springRippleMaterial, cascadeCount);
  springRipples.name = 'ISLAND_1_SPRING_SOURCE_RIPPLES';
  springRipples.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const springRockCount = cascadeCount * (profile.id === 'high' ? 3 : profile.id === 'medium' ? 2 : 1);
  const springRocks = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.16, profile.id === 'high' ? 1 : 0),
    materials.ivoryShade,
    springRockCount,
  );
  springRocks.name = 'ISLAND_1_SPRINGHEAD_STONES';
  const cascadePoints: THREE.Vector3[][] = [];
  const waterfallRibbons: THREE.Mesh[] = [];
  const waterfallAngles = Array.from({ length: cascadeCount }, (_, index) => (
    -Math.PI + (index / cascadeCount) * Math.PI * 2 + Math.sin(index * 2.17) * 0.075
  ));
  const instanceDummy = new THREE.Object3D();
  let springRockIndex = 0;
  waterfallAngles.forEach((angle, index) => {
    const meander = (index % 2 === 0 ? 1 : -1) * (0.055 + (index % 3) * 0.018);
    const sourceRadius = 4.28 + (index % 3) * 0.16;
    const points = [
      new THREE.Vector3(Math.cos(angle) * sourceRadius, 0.315, Math.sin(angle) * sourceRadius),
      new THREE.Vector3(Math.cos(angle + meander) * 4.82, 0.31, Math.sin(angle + meander) * 4.82),
      new THREE.Vector3(Math.cos(angle - meander * 0.7) * 5.38, 0.292, Math.sin(angle - meander * 0.7) * 5.38),
      new THREE.Vector3(Math.cos(angle) * 5.86, 0.22, Math.sin(angle) * 5.86),
      // The eroded coast widens below the grass shelf. Follow that visible
      // rock profile outward so the fall sits on the cliff face instead of
      // disappearing inside its underwater cylinder.
      new THREE.Vector3(Math.cos(angle) * 6.46, 0.04, Math.sin(angle) * 6.46),
      new THREE.Vector3(Math.cos(angle) * 6.82, -0.5, Math.sin(angle) * 6.82),
      new THREE.Vector3(Math.cos(angle) * 7.08, -1.28, Math.sin(angle) * 7.08),
      new THREE.Vector3(Math.cos(angle) * 7.3, ISLAND_1_OCEAN_SURFACE_Y + 0.04, Math.sin(angle) * 7.3),
    ];
    const ribbon = new THREE.Mesh(
      createWaterRibbonGeometry(points, 0.19 + (index % 3) * 0.035),
      waterfallMaterial,
    );
    const waterfallCrest = new THREE.Mesh(
      createWaterRibbonGeometry(points.slice(3), 0.07 + (index % 2) * 0.012),
      crestMaterial,
    );
    waterfallCrest.name = `ISLAND_1_SPRING_CASCADE_CREST_${String(index + 1).padStart(2, '0')}`;
    waterfallCrest.position.y = 0.012;
    waterfallCrest.renderOrder = 3;
    ribbon.name = `ISLAND_1_SPRING_CASCADE_${String(index + 1).padStart(2, '0')}`;
    ribbon.renderOrder = 2;
    root.add(ribbon, waterfallCrest);
    waterfallRibbons.push(ribbon);
    cascadePoints.push(points);

    instanceDummy.position.copy(points[0]).add(new THREE.Vector3(0, 0.005, 0));
    instanceDummy.rotation.set(0, angle, 0);
    instanceDummy.scale.set(1.15 + (index % 2) * 0.18, 1, 0.72);
    instanceDummy.updateMatrix();
    springPools.setMatrixAt(index, instanceDummy.matrix);

    instanceDummy.position.copy(points[0]).add(new THREE.Vector3(0, 0.012, 0));
    instanceDummy.rotation.set(0, angle, 0);
    instanceDummy.scale.setScalar(1);
    instanceDummy.updateMatrix();
    springRipples.setMatrixAt(index, instanceDummy.matrix);

    instanceDummy.position.copy(points[points.length - 1]).setY(ISLAND_1_OCEAN_SURFACE_Y + 0.035);
    instanceDummy.rotation.set(0, angle, 0);
    instanceDummy.scale.set(1.15, 1, 0.62);
    instanceDummy.updateMatrix();
    plungeFoam.setMatrixAt(index, instanceDummy.matrix);

    const localRockCount = profile.id === 'high' ? 3 : profile.id === 'medium' ? 2 : 1;
    for (let rockIndex = 0; rockIndex < localRockCount; rockIndex += 1) {
      const rockAngle = angle + (rockIndex - (localRockCount - 1) / 2) * 0.12;
      instanceDummy.position.set(
        Math.cos(rockAngle) * (sourceRadius + 0.28),
        0.34,
        Math.sin(rockAngle) * (sourceRadius + 0.28),
      );
      instanceDummy.rotation.set(rockIndex * 0.2, angle, rockIndex * 0.14);
      instanceDummy.scale.set(0.9 + rockIndex * 0.12, 0.52 + (rockIndex % 2) * 0.18, 0.72);
      instanceDummy.updateMatrix();
      springRocks.setMatrixAt(springRockIndex, instanceDummy.matrix);
      springRockIndex += 1;
    }
  });
  root.add(springPools, springRipples, plungeFoam, springRocks);

  const flowHighlightCount = cascadeCount * (profile.id === 'high' ? 3 : 2);
  const flowHighlightPositions = new Float32Array(flowHighlightCount * 3);
  const flowHighlightGeometry = new THREE.BufferGeometry();
  flowHighlightGeometry.setAttribute('position', new THREE.BufferAttribute(flowHighlightPositions, 3));
  const flowHighlights = new THREE.Points(
    flowHighlightGeometry,
    new THREE.PointsMaterial({ color: 0xf6ffff, size: profile.id === 'high' ? 0.13 : 0.1, transparent: true, opacity: 0.8, depthWrite: false }),
  );
  flowHighlights.name = 'ISLAND_1_CASCADE_FLOW_HIGHLIGHTS';
  root.add(flowHighlights);

  const shorelineWaves = Array.from({ length: lifeBudget.shorelineWaveCount }, (_, index) => {
    const arcStart = index / Math.max(1, lifeBudget.shorelineWaveCount) * Math.PI * 2 + 0.18;
    const arcLength = 0.72 + (index % 3) * 0.16;
    const geometry = new THREE.RingGeometry(
      7.12 + (index % 2) * 0.18,
      7.2 + (index % 2) * 0.18,
      profile.id === 'low' ? 28 : 48,
      1,
      arcStart,
      arcLength,
    );
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({
      color: 0xe6fcff,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const wave = new THREE.Mesh(geometry, material);
    wave.name = `ISLAND_1_SHORELINE_WAVE_FRONT_${String(index + 1).padStart(2, '0')}`;
    wave.position.y = ISLAND_1_OCEAN_SURFACE_Y + 0.045;
    wave.renderOrder = 2;
    wave.userData.lifePhase = index / Math.max(1, lifeBudget.shorelineWaveCount);
    root.add(wave);
    return wave;
  });

  const dawnMotePositions = new Float32Array(lifeBudget.dawnMoteCount * 3);
  const dawnMoteLayout = Array.from({ length: lifeBudget.dawnMoteCount }, (_, index) => ({
    angle: index * 2.399963 + (index % 3) * 0.17,
    radius: 3.45 + (index % 7) * 0.31,
    baseY: 0.62 + (index % 5) * 0.14,
    speed: 0.045 + (index % 4) * 0.008,
    phase: index * 0.73,
  }));
  dawnMoteLayout.forEach((mote, index) => {
    dawnMotePositions.set([
      Math.cos(mote.angle) * mote.radius,
      mote.baseY,
      Math.sin(mote.angle) * mote.radius,
    ], index * 3);
  });
  const dawnMoteGeometry = new THREE.BufferGeometry();
  dawnMoteGeometry.setAttribute('position', new THREE.BufferAttribute(dawnMotePositions, 3));
  const dawnMoteMaterial = new THREE.PointsMaterial({
    color: 0xffe7a3,
    size: profile.id === 'high' ? 0.095 : 0.078,
    transparent: true,
    opacity: 0.64,
    depthWrite: false,
  });
  const dawnMotes = new THREE.Points(dawnMoteGeometry, dawnMoteMaterial);
  dawnMotes.name = 'ISLAND_1_DAWN_GARDEN_MOTES';
  if (lifeBudget.dawnMoteCount > 0) root.add(dawnMotes);

  const skiffWakeMaterial = new THREE.MeshBasicMaterial({
    color: 0xe8fcff,
    transparent: true,
    opacity: 0.34,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const skiffs = Array.from({ length: lifeBudget.skiffCount }, (_, index) => {
    const skiff = createFirstLightSkiff(materials, profile.id, skiffWakeMaterial);
    skiff.name = `ISLAND_1_SUN_SKIFF_${index + 1}`;
    skiff.scale.setScalar(profile.id === 'low' ? 1.08 : 1.24 - index * 0.07);
    skiff.userData.lifePhase = index / lifeBudget.skiffCount * Math.PI * 2 + 0.55;
    skiff.userData.lifeRadius = 12.4 + index * 2.4;
    root.add(skiff);
    return skiff;
  });

  const birdCount = profile.id === 'high' ? 10 : profile.id === 'medium' ? 5 : 2;
  const birds = Array.from({ length: birdCount }, (_, index) => {
    const bird = createFirstLightBird(materials, profile.id);
    bird.name = `ISLAND_1_SKYBIRD_${index + 1}`;
    root.add(bird);
    return bird;
  });
  const butterflyCount = profile.id === 'high' ? 12 : profile.id === 'medium' ? 6 : 0;
  const butterflyWingMaterial = new THREE.MeshBasicMaterial({ color: 0x8ceeff, side: THREE.DoubleSide, transparent: true, opacity: 0.84 });
  const butterflies = Array.from({ length: butterflyCount }, (_, index) => {
    const butterfly = new THREE.Group();
    const left = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.075), butterflyWingMaterial);
    const right = left.clone();
    left.position.x = -0.055;
    right.position.x = 0.055;
    butterfly.add(left, right);
    butterfly.userData.leftWing = left;
    butterfly.userData.rightWing = right;
    butterfly.userData.phase = index * 0.77;
    root.add(butterfly);
    return butterfly;
  });
  const fishCount = profile.id === 'high' ? 8 : profile.id === 'medium' ? 4 : 0;
  const lagoonFish = Array.from({ length: fishCount }, (_, index) => {
    const fish = createFirstLightFish(materials, profile.id);
    fish.name = `ISLAND_1_LAGOON_FISH_${index + 1}`;
    root.add(fish);
    return fish;
  });

  const crystalCount = profile.id === 'high' ? 32 : profile.id === 'medium' ? 18 : 10;
  for (let index = 0; index < crystalCount; index += 1) {
    const angle = index / crystalCount * Math.PI * 2 + (index % 3) * 0.07;
    const radius = 5.35 + (index % 2) * 0.32;
    addCrystal(root, [Math.cos(angle) * radius, 0.48 + (index % 3) * 0.05, Math.sin(angle) * radius], 0.055 + (index % 4) * 0.012, materials.crystal);
  }

  const gardenCount = profile.id === 'high' ? 48 : profile.id === 'medium' ? 28 : 14;
  for (let index = 0; index < gardenCount; index += 1) {
    const angle = index / gardenCount * Math.PI * 2;
    const radius = 4.5 + (index % 3) * 0.34;
    const topiary = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16 + (index % 3) * 0.035, 1), materials.leaf);
    topiary.position.set(Math.cos(angle) * radius, 0.45, Math.sin(angle) * radius);
    topiary.scale.y = 1.35;
    root.add(topiary);
  }

  const sparkGeometry = new THREE.BufferGeometry();
  const sparkCount = profile.waterSparkleCount;
  const sparkPositions = new Float32Array(sparkCount * 3);
  for (let index = 0; index < sparkCount; index += 1) {
    const angle = index * 2.399963;
    const radius = 8 + (index % 17) * 1.45;
    sparkPositions.set([Math.cos(angle) * radius, ISLAND_1_OCEAN_SURFACE_Y + 0.04, Math.sin(angle) * radius], index * 3);
  }
  sparkGeometry.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
  const sparkMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: profile.id === 'high' ? 0.12 : 0.09, transparent: true, opacity: 0.74, depthWrite: false });
  const sparkles = new THREE.Points(sparkGeometry, sparkMaterial);
  root.add(sparkles);
  scene.add(root);

  const oceanPositions = ocean.geometry.getAttribute('position') as THREE.BufferAttribute;
  const oceanBase = new Float32Array(oceanPositions.array as ArrayLike<number>);
  let lastOceanUpdate = 0;
  return {
    root,
    updateView: (cameraPosition) => {
      const cameraRadius = Math.hypot(cameraPosition.x, cameraPosition.z);
      if (cameraRadius > 0.001) {
        [...mountains.children, ...seaStacks].forEach((distantScenery) => {
          const sceneryRadius = Math.hypot(distantScenery.position.x, distantScenery.position.z);
          const cameraFacingDot = sceneryRadius > 0.001
            ? (cameraPosition.x * distantScenery.position.x + cameraPosition.z * distantScenery.position.z) / (cameraRadius * sceneryRadius)
            : -1;
          distantScenery.visible = cameraFacingDot < -0.08;
        });
      }
    },
    animate: (elapsed) => {
      clouds.forEach((cloud, index) => {
        const layout = cloudLayout[index];
        const orbitAngle = layout.angle + elapsed * 0.0032 * layout.driftDirection;
        cloud.position.set(
          Math.cos(orbitAngle) * layout.radius,
          layout.centerY + Math.sin(elapsed * 0.12 + index * 1.7) * ISLAND_1_CLOUD_VERTICAL_DRIFT,
          Math.sin(orbitAngle) * layout.radius,
        );
        cloud.rotation.y = -orbitAngle + Math.sin(elapsed * 0.035 + index) * 0.04;
      });
      waterfallMaterial.opacity = (profile.id === 'low' ? 0.62 : 0.72) + Math.sin(elapsed * 1.3) * 0.08;
      springMaterial.opacity = 0.7 + Math.sin(elapsed * 1.05) * 0.08;
      springRippleMaterial.opacity = (profile.id === 'low' ? 0.26 : 0.38) + Math.sin(elapsed * 0.82) * 0.08;
      foamMaterial.opacity = 0.62 + Math.sin(elapsed * 1.8) * 0.12;
      crestMaterial.opacity = 0.4 + Math.sin(elapsed * 1.55) * 0.08;
      waterfallRibbons.forEach((ribbon, index) => {
        ribbon.position.y = Math.sin(elapsed * 1.35 + index * 0.61) * 0.012;
      });
      for (let index = 0; index < cascadeCount; index += 1) {
        const points = cascadePoints[index];
        instanceDummy.position.copy(points[points.length - 1]).setY(ISLAND_1_OCEAN_SURFACE_Y + 0.035 + Math.sin(elapsed * 1.7 + index) * 0.008);
        instanceDummy.rotation.set(0, waterfallAngles[index], 0);
        const foamPulse = 1 + Math.sin(elapsed * 1.9 + index * 0.8) * 0.16;
        instanceDummy.scale.set(1.15 * foamPulse, 1, 0.62 * foamPulse);
        instanceDummy.updateMatrix();
        plungeFoam.setMatrixAt(index, instanceDummy.matrix);

        const ripplePhase = (elapsed * (0.22 + index % 3 * 0.012) + index * 0.137) % 1;
        const rippleScale = 0.72 + ripplePhase * 1.5;
        instanceDummy.position.copy(points[0]).add(new THREE.Vector3(0, 0.014, 0));
        instanceDummy.rotation.set(0, waterfallAngles[index], 0);
        instanceDummy.scale.set(rippleScale, 1, rippleScale * 0.72);
        instanceDummy.updateMatrix();
        springRipples.setMatrixAt(index, instanceDummy.matrix);
      }
      plungeFoam.instanceMatrix.needsUpdate = true;
      springRipples.instanceMatrix.needsUpdate = true;
      const highlightsPerCascade = profile.id === 'high' ? 3 : 2;
      for (let index = 0; index < flowHighlightCount; index += 1) {
        const cascadeIndex = Math.floor(index / highlightsPerCascade);
        const beadIndex = index % highlightsPerCascade;
        const progress = (elapsed * (0.3 + cascadeIndex % 3 * 0.035) + beadIndex / highlightsPerCascade + cascadeIndex * 0.071) % 1;
        const point = sampleWatercourse(cascadePoints[cascadeIndex], progress);
        flowHighlightPositions.set([point.x, point.y + 0.018, point.z], index * 3);
      }
      (flowHighlightGeometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      birds.forEach((bird, index) => {
        const angle = elapsed * (0.085 + index * 0.0025) + index / birdCount * Math.PI * 2;
        const radius = 8.2 + (index % 4) * 0.9;
        bird.position.set(Math.cos(angle) * radius, 3.25 + (index % 3) * 0.5 + Math.sin(elapsed * 0.7 + index) * 0.12, Math.sin(angle) * radius);
        bird.rotation.y = -angle;
        const wing = Math.sin(elapsed * 5.2 + index) * 0.42;
        (bird.userData.leftWing as THREE.Mesh).rotation.z = -0.28 - wing;
        (bird.userData.rightWing as THREE.Mesh).rotation.z = 0.28 + wing;
      });
      butterflies.forEach((butterfly, index) => {
        const phase = butterfly.userData.phase as number;
        const angle = phase + elapsed * (0.16 + (index % 3) * 0.018);
        const radius = 4.1 + (index % 4) * 0.28;
        butterfly.position.set(Math.cos(angle) * radius, 0.72 + Math.sin(elapsed * 1.6 + phase) * 0.18, Math.sin(angle) * radius);
        butterfly.rotation.y = -angle;
        const flap = Math.sin(elapsed * 8.5 + phase) * 0.78;
        (butterfly.userData.leftWing as THREE.Mesh).rotation.y = flap;
        (butterfly.userData.rightWing as THREE.Mesh).rotation.y = -flap;
      });
      lagoonFish.forEach((fish, index) => {
        const angle = elapsed * (0.22 + index * 0.008) + index / fishCount * Math.PI * 2;
        const radius = 0.82 + (index % 3) * 0.34;
        fish.position.set(Math.cos(angle) * radius, 0.285 + Math.sin(elapsed * 1.3 + index) * 0.012, Math.sin(angle) * radius);
        fish.rotation.y = -angle + Math.PI / 2;
      });
      skiffs.forEach((skiff, index) => {
        const angle = (skiff.userData.lifePhase as number) + elapsed * (0.052 + index * 0.004);
        const radius = skiff.userData.lifeRadius as number;
        skiff.position.set(
          Math.cos(angle) * radius,
          ISLAND_1_OCEAN_SURFACE_Y + 0.1 + Math.sin(elapsed * 0.9 + index) * 0.018,
          Math.sin(angle) * radius,
        );
        skiff.rotation.y = -angle;
        skiff.rotation.z = Math.sin(elapsed * 0.72 + index * 1.4) * 0.012;
      });
      skiffWakeMaterial.opacity = 0.28 + Math.sin(elapsed * 0.86) * 0.07;
      shorelineWaves.forEach((wave) => {
        const wavePhase = (elapsed * 0.055 + (wave.userData.lifePhase as number)) % 1;
        const waveScale = 0.98 + wavePhase * 0.075;
        wave.scale.set(waveScale, 1, waveScale);
        (wave.material as THREE.MeshBasicMaterial).opacity = Math.sin(wavePhase * Math.PI) * 0.36;
      });
      dawnMoteLayout.forEach((mote, index) => {
        const angle = mote.angle + elapsed * mote.speed;
        dawnMotePositions.set([
          Math.cos(angle) * mote.radius,
          mote.baseY + Math.sin(elapsed * 0.72 + mote.phase) * 0.13,
          Math.sin(angle) * mote.radius,
        ], index * 3);
      });
      if (lifeBudget.dawnMoteCount > 0) {
        (dawnMoteGeometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
        dawnMoteMaterial.opacity = 0.54 + Math.sin(elapsed * 0.64) * 0.12;
      }
      sparkles.rotation.y = elapsed * 0.008;
      sparkMaterial.opacity = 0.62 + Math.sin(elapsed * 1.05) * 0.16;
      materials.crystal.emissiveIntensity = 0.72 + Math.sin(elapsed * 1.2) * 0.16;
      materials.cyanGlass.emissiveIntensity = 0.58 + Math.sin(elapsed * 0.9 + 0.7) * 0.12;
      materials.warmGlow.emissiveIntensity = 1.04 + Math.sin(elapsed * 0.58 + 0.4) * 0.16;
      materials.leaf.emissiveIntensity = 0.11 + Math.sin(elapsed * 0.34) * 0.025;
      materials.leafLight.emissiveIntensity = 0.15 + Math.sin(elapsed * 0.31 + 1.4) * 0.03;
      materials.leafDark.emissiveIntensity = 0.09 + Math.sin(elapsed * 0.29 + 2.1) * 0.02;
      if (elapsed - lastOceanUpdate > 1 / profile.oceanUpdateFps) {
        lastOceanUpdate = elapsed;
        for (let index = 0; index < oceanPositions.count; index += 1) {
          const x = oceanBase[index * 3];
          const y = oceanBase[index * 3 + 1];
          const z = oceanBase[index * 3 + 2];
          oceanPositions.setXYZ(index, x, y, z + Math.sin(x * 0.31 + elapsed * 0.55) * 0.045 + Math.cos(y * 0.24 - elapsed * 0.42) * 0.03);
        }
        oceanPositions.needsUpdate = true;
        ocean.geometry.computeVertexNormals();
      }
    },
  };
}
