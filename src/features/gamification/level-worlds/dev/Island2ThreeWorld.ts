import { createSunshoreBirds } from './Island5SunshoreV2Birds';
import { createSunshoreArchipelago } from './Island5SunshoreV2Archipelago';
import * as THREE from 'three';
import { createSunshoreV2HabitLodge, createSunshoreV2EggGrotto, createSunshoreV2StarArchive, createSunshoreV2Oracle } from './Island5SunshoreV2Architecture';
import { createSunshoreV2Palm, createSunshoreV2PlantCluster } from './Island5SunshoreV2Botany';
import { createSunshoreSeaLife } from './Island5SunshoreV2SeaLife';
import { configureSunshoreV2Water } from './Island5SunshoreV2Water';
import { createSunshoreV2Landscape, sunshoreCoastRadius } from './Island5SunshoreV2Landscape';
import { ISLAND_5_CAMERA_PRESETS } from './island5ThreePilotContract';
import type {
  Island3DQuality,
  Island3DQualityProfile,
  Island5LandmarkDefinition,
} from './island5ThreePilotContract';
import { compactStaticGeometry } from './CrownCitadelThreeModel';
import {
  applyIslandConstructionAuthoring,
  type IslandConstructionFactoryOptions,
} from './IslandConstructionAuthoring';

export const ISLAND_2_WORLD_ID = 2 as const;
export const ISLAND_2_WORLD_NAME = 'Sunshore Atoll';
type BuildLevel = 0 | 1 | 2 | 3;

export const ISLAND_2_LANDMARK_LABELS = {
  boss: 'Sunwheel Arena',
  hatchery: 'Egg Grotto Hatchery',
  habit: 'Open-Air Habit Lodge',
  wisdom: 'Star Archive Library',
  event: 'Tideglass Oracle',
} as const;

export interface Island2WorldMaterials {
  teak: THREE.MeshStandardMaterial;
  teakDark: THREE.MeshStandardMaterial;
  thatch: THREE.MeshStandardMaterial;
  rope: THREE.MeshStandardMaterial;
  sand: THREE.MeshStandardMaterial;
  rock: THREE.MeshStandardMaterial;
  rockShade: THREE.MeshStandardMaterial;
  garden: THREE.MeshStandardMaterial;
  leaf: THREE.MeshStandardMaterial;
  leafLight: THREE.MeshStandardMaterial;
  leafDark: THREE.MeshStandardMaterial;
  flowerCoral: THREE.MeshStandardMaterial;
  flowerPink: THREE.MeshStandardMaterial;
  oceanCloth: THREE.MeshStandardMaterial;
  mangoGold: THREE.MeshStandardMaterial;
  lagoonGlass: THREE.MeshPhysicalMaterial;
  crystal: THREE.MeshPhysicalMaterial;
  egg: THREE.MeshPhysicalMaterial;
  eggSpot: THREE.MeshStandardMaterial;
  magicTeal: THREE.MeshStandardMaterial;
  magicViolet: THREE.MeshStandardMaterial;
  paper: THREE.MeshStandardMaterial;
  ink: THREE.MeshStandardMaterial;
  foam: THREE.MeshBasicMaterial;
}

export interface Island2AmbienceRuntime {
  root: THREE.Group;
  animate: (elapsed: number) => void;
  updateView?: (cameraPosition: THREE.Vector3) => void;
}

const segmentsFor = (quality: Island3DQuality) => quality === 'high' ? 20 : quality === 'medium' ? 14 : 9;
const detailFor = (quality: Island3DQuality) => quality === 'high' ? 1 : quality === 'medium' ? 0.66 : 0.38;

function markShadows(root: THREE.Object3D, enabled: boolean) {
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = enabled;
      child.receiveShadow = true;
    }
  });
}

function cylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  material: THREE.Material,
  segments = 16,
) {
  return new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
}

function box(width: number, height: number, depth: number, material: THREE.Material) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
}

function createTropicalPatternTexture(size: number, pattern: 'wood' | 'thatch' | 'stone' | 'leaf' | 'grass') {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const hash = ((x * 73 + y * 151 + (x * y) % 97) % 31) - 15;
      let value: number;
      if (pattern === 'wood') {
        const grain = Math.sin(x * .56 + Math.sin(y * .055) * 1.5);
        value = Math.round(229 + grain * 9 + hash * .13);
      } else if (pattern === 'thatch') {
        const strand = (x * 3 + y) % 13 < 3;
        value = (y % 22 < 2 ? 214 : strand ? 220 : 240) + Math.round(hash * .18 + Math.sin(y * .75 + x * .09) * 2);
      } else if (pattern === 'stone') {
        // Limestone has mineral mottling, never the V1 masonry-grid texture.
        value = Math.round(232 + Math.sin(x * .071 + Math.cos(y * .081)) * 8 + hash * .19);
      } else if (pattern === 'grass') {
        const u = x / size * Math.PI * 2, v = y / size * Math.PI * 2;
        value = Math.round(232 + 8 * Math.sin(u * 3 + Math.sin(v * 2)) * Math.cos(v * 3) + 3 * Math.sin(u * 9 + v * 7));
      } else {
        const vein = Math.abs(y - size / 2) < 2;
        value = vein ? 223 : 241 + Math.round(hash * .07);
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
  texture.repeat.set(pattern === 'wood' ? 3 : pattern === 'thatch' ? 4 : 2, pattern === 'wood' ? 2 : 3);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** Height is authored separately in linear space; color grain is not a height map. */
function createSunshoreHeightTexture(pattern: 'wood' | 'thatch' | 'stone') {
  const size = 256, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size * Math.PI * 2, v = y / size * Math.PI * 2;
    const height = pattern === 'wood'
      ? 128 + 25 * Math.sin(u * 19 + Math.sin(v * 2) * .7) + 9 * Math.sin(u * 43 + v)
      : pattern === 'thatch'
        ? 135 + 42 * Math.pow(Math.sin(u * 31 + Math.sin(v * 3) * .3), 6) + 8 * Math.sin(v * 17 + u)
        : 128 + 17 * Math.sin(u * 5 + Math.sin(v * 4)) * Math.cos(v * 7) + 5 * Math.sin(u * 23 + v * 19);
    const i = (y * size + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = Math.round(height); data[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.NoColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(pattern === 'wood' ? 3 : pattern === 'thatch' ? 4 : 2, pattern === 'wood' ? 2 : 3);
  texture.generateMipmaps = true; texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter; texture.needsUpdate = true; return texture;
}

export function createIsland2WorldMaterials(): Island2WorldMaterials {
  const wood = createTropicalPatternTexture(128, 'wood');
  const woodHeight = createSunshoreHeightTexture('wood');
  const thatchHeight = createSunshoreHeightTexture('thatch');
  const stoneHeight = createSunshoreHeightTexture('stone');
  const thatch = createTropicalPatternTexture(128, 'thatch');
  const stone = createTropicalPatternTexture(128, 'stone');
  const leaf = createTropicalPatternTexture(64, 'leaf');
  const grass = createTropicalPatternTexture(128, 'grass');
  return {
    teak: new THREE.MeshStandardMaterial({ color: 0x9b643d, map: wood, bumpMap: woodHeight, bumpScale: .008, roughness: 0.72, metalness: 0.01 }),
    teakDark: new THREE.MeshStandardMaterial({ color: 0x593e2a, map: wood, roughness: 0.82, metalness: 0 }),
    thatch: new THREE.MeshStandardMaterial({ color: 0xd7b875, map: thatch, bumpMap: thatchHeight, bumpScale: .012, roughness: 0.94, metalness: 0, side: THREE.DoubleSide }),
    rope: new THREE.MeshStandardMaterial({ color: 0xc28a49, roughness: 0.96, metalness: 0 }),
    sand: new THREE.MeshStandardMaterial({ color: 0xe9d6aa, roughness: 0.97, metalness: 0 }),
    rock: new THREE.MeshStandardMaterial({ color: 0xbcb5a3, map: stone, bumpMap: stoneHeight, bumpScale: .014, roughness: 0.92, metalness: 0 }),
    rockShade: new THREE.MeshStandardMaterial({ color: 0x8c9386, map: stone, roughness: 0.96, metalness: 0 }),
    garden: new THREE.MeshStandardMaterial({ color: 0x65914a, map: grass, roughness: 0.92, metalness: 0 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x447e3e, map: leaf, roughness: 0.78, metalness: 0, side: THREE.DoubleSide }),
    leafLight: new THREE.MeshStandardMaterial({ color: 0x8cab4f, map: leaf, roughness: 0.74, metalness: 0, side: THREE.DoubleSide }),
    leafDark: new THREE.MeshStandardMaterial({ color: 0x2d6545, map: leaf, roughness: 0.84, metalness: 0, side: THREE.DoubleSide }),
    flowerCoral: new THREE.MeshStandardMaterial({ color: 0xf3a17e, roughness: 0.58, emissive: 0x5b160f, emissiveIntensity: 0.12 }),
    flowerPink: new THREE.MeshStandardMaterial({ color: 0xe580a0, roughness: 0.55, emissive: 0x4b102d, emissiveIntensity: 0.14 }),
    oceanCloth: new THREE.MeshStandardMaterial({ color: 0x288d9b, roughness: 0.5, metalness: 0.02, side: THREE.DoubleSide }),
    mangoGold: new THREE.MeshStandardMaterial({ color: 0xd9ae59, roughness: 0.3, metalness: 0.58, emissive: 0x71400b, emissiveIntensity: 0.16 }),
    lagoonGlass: new THREE.MeshPhysicalMaterial({ color: 0x28c8d1, roughness: 0.1, metalness: 0.02, transparent: true, opacity: 0.84, transmission: 0.16, thickness: 0.22, clearcoat: 0.86, clearcoatRoughness: 0.12, depthWrite: false }),
    crystal: new THREE.MeshPhysicalMaterial({ color: 0x65f2ea, roughness: 0.08, metalness: 0.05, transparent: true, opacity: 0.86, transmission: 0.28, thickness: 0.7, clearcoat: 1, clearcoatRoughness: 0.05, emissive: 0x0aa9b7, emissiveIntensity: 0.78 }),
    egg: new THREE.MeshPhysicalMaterial({ color: 0xdff8eb, roughness: 0.2, metalness: 0.02, clearcoat: 0.74, clearcoatRoughness: 0.13 }),
    magicTeal: new THREE.MeshStandardMaterial({ color: 0x65e6d7, emissive: 0x168b83, emissiveIntensity: .65, roughness: .24, metalness: .2 }),
    magicViolet: new THREE.MeshStandardMaterial({ color: 0xbba0ed, emissive: 0x633698, emissiveIntensity: .55, roughness: .27, metalness: .12 }),
    eggSpot: new THREE.MeshStandardMaterial({ color: 0x219f91, roughness: 0.32, emissive: 0x0b504c, emissiveIntensity: 0.16 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xf6dfac, roughness: 0.88, side: THREE.DoubleSide }),
    ink: new THREE.MeshStandardMaterial({ color: 0x183a5a, roughness: 0.56 }),
    foam: new THREE.MeshBasicMaterial({ color: 0xf0ffff, transparent: true, opacity: 0.58, depthWrite: false, side: THREE.DoubleSide }),
  };
}

function addRopeWrap(group: THREE.Group, x: number, y: number, z: number, radius: number, material: THREE.Material) {
  const wrap = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.025, 5, 12), material);
  wrap.rotation.x = Math.PI / 2;
  wrap.position.set(x, y, z);
  group.add(wrap);
}

function addPost(group: THREE.Group, x: number, z: number, height: number, materials: Island2WorldMaterials, quality: Island3DQuality) {
  const post = cylinder(0.09, 0.12, height, materials.teakDark, segmentsFor(quality));
  post.position.set(x, height / 2 + 0.2, z);
  group.add(post);
  addRopeWrap(group, x, height + 0.13, z, 0.115, materials.rope);
}

function addDeck(group: THREE.Group, radius: number, y: number, materials: Island2WorldMaterials, quality: Island3DQuality) {
  const rock = cylinder(radius + 0.16, radius + 0.3, 0.26, materials.rock, segmentsFor(quality));
  rock.position.y = y;
  const deck = cylinder(radius, radius + 0.06, 0.18, materials.teak, segmentsFor(quality));
  deck.position.y = y + 0.18;
  group.add(rock, deck);
  if (quality !== 'low') {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.9, 0.035, 5, 32), materials.rope);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = y + 0.29;
    group.add(rim);
  }
}

function addThatchRoof(group: THREE.Group, radius: number, y: number, materials: Island2WorldMaterials, quality: Island3DQuality, peaked = true, offsetZ = 0) {
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(radius, peaked ? 0.82 : 0.46, segmentsFor(quality), 1, true),
    materials.thatch,
  );
  roof.position.set(0, y, offsetZ);
  group.add(roof);
  if (quality === 'high') {
    for (let index = 0; index < 16; index += 1) {
      const angle = index / 16 * Math.PI * 2;
      const rib = box(0.026, 0.035, radius * 0.94, materials.rope);
      rib.position.set(Math.sin(angle) * radius * 0.47, y - 0.12, offsetZ + Math.cos(angle) * radius * 0.47);
      rib.rotation.y = angle;
      rib.rotation.z = peaked ? 0.14 : 0.08;
      group.add(rib);
    }
  }
  const cap = cylinder(0.07, 0.11, 0.2, materials.mangoGold, 10);
  cap.position.set(0, y + (peaked ? 0.48 : 0.31), offsetZ);
  group.add(cap);
}

function addGabledThatchRoof(
  group: THREE.Group,
  width: number,
  depth: number,
  y: number,
  materials: Island2WorldMaterials,
  quality: Island3DQuality,
) {
  const roof = new THREE.Group();
  roof.name = 'ISLAND_2_GABLED_THATCH_ROOF';
  roof.position.y = y;
  [-1, 1].forEach((side) => {
    const slope = box(width * 0.57, 0.13, depth, materials.thatch);
    slope.position.x = side * width * 0.245;
    slope.rotation.z = side * 0.34;
    roof.add(slope);
    if (quality === 'high') {
      const fringeCount = 8;
      for (let index = 0; index < fringeCount; index += 1) {
        const fringe = box(0.035, 0.055 + index % 2 * 0.025, depth * 0.9, materials.rope);
        fringe.position.set(side * width * (0.45 + index * 0.008), -0.13, 0);
        fringe.rotation.z = side * 0.16;
        roof.add(fringe);
      }
    }
  });
  const ridge = cylinder(0.055, 0.065, depth * 1.05, materials.rope, 8);
  ridge.rotation.x = Math.PI / 2;
  ridge.position.y = 0.2;
  roof.add(ridge);
  group.add(roof);
}

function addBanner(group: THREE.Group, x: number, y: number, z: number, yaw: number, materials: Island2WorldMaterials) {
  const cloth = box(0.34, 0.5, 0.025, materials.oceanCloth);
  cloth.position.set(x, y, z);
  cloth.rotation.y = yaw;
  const sun = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.018, 5, 12), materials.mangoGold);
  sun.position.set(x, y + 0.04, z + 0.02);
  sun.rotation.y = yaw;
  group.add(cloth, sun);
}

function addPalm(group: THREE.Group, x: number, z: number, height: number, materials: Island2WorldMaterials, quality: Island3DQuality, phase = 0) {
  const palm = createSunshoreV2Palm(x, z, height, materials, quality, phase);
  group.add(palm);
  return palm;
}

function addFlowerCluster(group: THREE.Group, x: number, z: number, materials: Island2WorldMaterials, quality: Island3DQuality, phase = 0) {
  const count = quality === 'high' ? 7 : quality === 'medium' ? 5 : 3;
  const cluster = new THREE.Group();
  cluster.name = 'ISLAND_2_FLOWER_CLUSTER';
  cluster.position.set(x, 0.4, z);
  for (let index = 0; index < count; index += 1) {
    const angle = phase + index / count * Math.PI * 2;
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.085, 6, 5), index % 2 ? materials.flowerPink : materials.flowerCoral);
    petal.scale.set(1.45, 0.42, 0.76);
    petal.position.set(Math.cos(angle) * 0.16, 0.04 + (index % 3) * 0.025, Math.sin(angle) * 0.16);
    cluster.add(petal);
  }
  group.add(cluster);
}

function createEggGrotto(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island2WorldMaterials) {
  return createSunshoreV2EggGrotto(level, quality, materials);
}

function createHabitLodge(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island2WorldMaterials) {
  return createSunshoreV2HabitLodge(level, quality, materials);
}

function createStarArchive(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island2WorldMaterials) {
  return createSunshoreV2StarArchive(level, quality, materials);
}

function createTideglassOracle(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island2WorldMaterials) {
  return createSunshoreV2Oracle(level, quality, materials);
}

export const ISLAND_5_SUNWHEEL_OPENING_PRESENTATION_BASELINE_LEVEL = 2 as const;

function addSunwheelInlay(group: THREE.Group, materials: Island2WorldMaterials, quality: Island3DQuality) {
  const lagoon = cylinder(1.42, 1.48, 0.055, materials.lagoonGlass, segmentsFor(quality));
  lagoon.name = 'ISLAND_5_SUNWHEEL_TIDEGLASS_FLOOR';
  lagoon.position.y = 0.505;
  group.add(lagoon);
  const sun = new THREE.Mesh(new THREE.TorusGeometry(0.51, 0.072, 6, quality === 'high' ? 36 : 24), materials.mangoGold);
  sun.name = 'ISLAND_5_SUNWHEEL_MEDALLION';
  sun.rotation.x = Math.PI / 2;
  sun.position.y = 0.553;
  group.add(sun);
  const rayCount = quality === 'high' ? 16 : quality === 'medium' ? 12 : 8;
  for (let index = 0; index < rayCount; index += 1) {
    const angle = index / rayCount * Math.PI * 2;
    const ray = box(0.075, 0.038, 0.48, materials.mangoGold);
    ray.name = `ISLAND_5_SUNWHEEL_INLAY_RAY_${index + 1}`;
    ray.position.set(Math.sin(angle) * 0.78, 0.557, Math.cos(angle) * 0.78);
    ray.rotation.y = angle;
    group.add(ray);
  }
  const outerTrim = new THREE.Mesh(
    new THREE.TorusGeometry(1.63, 0.045, 6, quality === 'low' ? 32 : 48),
    materials.mangoGold,
  );
  outerTrim.name = 'ISLAND_5_SUNWHEEL_GILDED_TIDE_RING';
  outerTrim.rotation.x = Math.PI / 2;
  outerTrim.position.y = 0.545;
  group.add(outerTrim);
}

function addSunwheelEntryStairs(
  group: THREE.Group,
  angle: number,
  materials: Island2WorldMaterials,
) {
  for (let step = 0; step < 4; step += 1) {
    const distance = 1.8 + step * 0.13;
    const stair = box(0.72 + step * 0.11, 0.07, 0.3, step % 2 ? materials.rockShade : materials.rock);
    stair.name = 'ISLAND_5_SUNWHEEL_REEF_STAIR';
    stair.position.set(Math.sin(angle) * distance, 0.12 + step * 0.065, Math.cos(angle) * distance);
    stair.rotation.y = angle;
    group.add(stair);
  }
}

function addSunwheelCoralCrest(
  group: THREE.Group,
  angle: number,
  radius: number,
  level: BuildLevel,
  materials: Island2WorldMaterials,
  quality: Island3DQuality,
) {
  const root = new THREE.Group();
  root.name = 'ISLAND_5_SUNWHEEL_CORAL_CREST';
  root.position.set(Math.sin(angle) * radius, 0.46, Math.cos(angle) * radius);
  root.rotation.y = angle;
  const petalCount = quality === 'high' ? 5 : 3;
  for (let index = 0; index < petalCount; index += 1) {
    const spread = (index - (petalCount - 1) / 2) * 0.16;
    const petal = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.055, 0.28 + level * 0.035, 3, 6),
      index % 2 ? materials.flowerPink : materials.flowerCoral,
    );
    petal.name = 'ISLAND_5_SUNWHEEL_CORAL_PETAL';
    petal.position.set(spread, 0.15 + Math.abs(spread) * 0.2, 0);
    petal.rotation.z = spread * 1.6;
    root.add(petal);
  }
  group.add(root);
}

function addSunwheelSignalPost(
  group: THREE.Group,
  angle: number,
  level: 1 | 2 | 3,
  materials: Island2WorldMaterials,
  quality: Island3DQuality,
) {
  const radius = 1.68;
  const postRoot = new THREE.Group();
  postRoot.name = `ISLAND_5_SUNWHEEL_SIGNAL_POST_L${level}`;
  postRoot.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
  postRoot.rotation.y = angle;
  const postHeight = level === 1 ? 0.62 : level === 2 ? 1.16 : 1.42;
  const footing = cylinder(0.19, 0.25, 0.22, materials.rockShade, segmentsFor(quality));
  footing.position.y = 0.56;
  const post = cylinder(0.085, 0.12, postHeight, materials.teakDark, segmentsFor(quality));
  post.position.y = 0.64 + postHeight / 2;
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.028, 5, 12), materials.mangoGold);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.78 + postHeight;
  const pearl = new THREE.Mesh(
    new THREE.OctahedronGeometry(level === 1 ? 0.11 : 0.15, quality === 'high' ? 1 : 0),
    level === 1 ? materials.crystal : materials.egg,
  );
  pearl.name = 'ISLAND_5_SUNWHEEL_SIGNAL_PEARL';
  pearl.position.y = 0.94 + postHeight;
  postRoot.add(footing, post, collar, pearl);
  if (level >= 2) {
    [-1, 1].forEach((side) => {
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.52 + level * 0.08, 4), side < 0 ? materials.oceanCloth : materials.leafLight);
      fin.name = 'ISLAND_5_SUNWHEEL_TIDE_FIN';
      fin.scale.z = 0.24;
      fin.position.set(side * 0.19, 0.9 + postHeight * 0.72, 0);
      fin.rotation.z = side * 0.52;
      postRoot.add(fin);
    });
  }
  group.add(postRoot);
}

function addSunwheelCrownArch(
  group: THREE.Group,
  angle: number,
  level: 2 | 3,
  materials: Island2WorldMaterials,
  quality: Island3DQuality,
) {
  const radius = 1.58;
  const archRoot = new THREE.Group();
  archRoot.name = `ISLAND_5_SUNWHEEL_CROWN_ARCH_L${level}`;
  archRoot.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
  archRoot.rotation.y = angle;
  [-0.31, 0.31].forEach((x) => {
    const column = cylinder(0.075, 0.12, level === 3 ? 1.22 : 0.92, materials.teakDark, segmentsFor(quality));
    column.position.set(x, level === 3 ? 1.12 : 0.97, 0);
    archRoot.add(column);
  });
  const arch = new THREE.Mesh(
    new THREE.TorusGeometry(0.31, level === 3 ? 0.07 : 0.055, 6, quality === 'low' ? 14 : 22, Math.PI),
    materials.mangoGold,
  );
  arch.name = 'ISLAND_5_SUNWHEEL_OPEN_CROWN_ARCH';
  arch.position.y = level === 3 ? 1.72 : 1.43;
  arch.rotation.z = Math.PI;
  archRoot.add(arch);
  if (level === 3) {
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.17, quality === 'high' ? 1 : 0), materials.crystal);
    crystal.name = 'ISLAND_5_SUNWHEEL_ARCH_CRYSTAL';
    crystal.position.y = 2.02;
    archRoot.add(crystal);
  }
  group.add(archRoot);
}

/**
 * Island 005 deliberately opens on a presentation-complete arena even while
 * canonical Boss build progress remains Level 0. Funded levels restore new
 * ceremony layers around the open creature airspace instead of replacing the
 * arena or placing a roof over Crown Drifter.
 */
export function createIsland5SunwheelArena(level: BuildLevel, quality: Island3DQuality, materials: Island2WorldMaterials) {
  const group = new THREE.Group();
  group.name = level === 0
    ? 'ISLAND_5_SUNWHEEL_ARENA_OPENING_L2_BASELINE'
    : `ISLAND_5_SUNWHEEL_ARENA_RESTORATION_L${level}`;
  group.userData.sculptRuntime = {
    modelId: 'island-005-sunwheel-arena',
    buildLevel: level,
    presentationBaselineLevel: ISLAND_5_SUNWHEEL_OPENING_PRESENTATION_BASELINE_LEVEL,
    clickable: true,
    explodable: true,
    sockets: {
      creatureAirspace: [0, 1.72, 0],
      bossFocus: [0, 0.72, 0],
      entrySouth: [0, 0.25, 2.16],
    },
    colliders: [{ id: 'island-005-sunwheel-arena', type: 'open-compound-ring', isTrigger: true }],
    destructionGroups: [{ id: 'sunwheel-restoration', breakable: false }],
  };
  const reefFoundation = cylinder(2.04, 2.2, 0.28, materials.rockShade, segmentsFor(quality));
  reefFoundation.name = 'ISLAND_5_SUNWHEEL_REEF_FOUNDATION';
  reefFoundation.position.y = 0.2;
  const shellCourse = cylinder(1.92, 2.08, 0.2, materials.rock, segmentsFor(quality));
  shellCourse.name = 'ISLAND_5_SUNWHEEL_CARVED_SHELL_COURSE';
  shellCourse.position.y = 0.36;
  const deck = cylinder(1.78, 1.9, 0.13, materials.teak, segmentsFor(quality));
  deck.name = 'ISLAND_5_SUNWHEEL_TEAK_DECK';
  deck.position.y = 0.46;
  group.add(reefFoundation, shellCourse, deck);
  addSunwheelInlay(group, materials, quality);
  [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((angle) => addSunwheelEntryStairs(group, angle, materials));
  const baselineCrestCount = quality === 'high' ? 12 : quality === 'medium' ? 8 : 6;
  for (let index = 0; index < baselineCrestCount; index += 1) {
    addSunwheelCoralCrest(group, index / baselineCrestCount * Math.PI * 2 + Math.PI / baselineCrestCount, 1.82, level, materials, quality);
  }
  // Eight low pearl markers make the unfunded opening arena feel complete
  // while retaining an unobstructed center and a low phone silhouette.
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2 + Math.PI / 8;
    const marker = cylinder(0.065, 0.09, 0.34, materials.teakDark, 7);
    marker.name = 'ISLAND_5_SUNWHEEL_BASELINE_PEARL_MARKER';
    marker.position.set(Math.sin(angle) * 1.61, 0.71, Math.cos(angle) * 1.61);
    const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), index % 2 ? materials.egg : materials.crystal);
    pearl.name = 'ISLAND_5_SUNWHEEL_BASELINE_PEARL';
    pearl.position.set(Math.sin(angle) * 1.61, 0.91, Math.cos(angle) * 1.61);
    group.add(marker, pearl);
  }
  const crown = new THREE.Group();
  crown.name = 'SUNSHORE_RETRACTING_ARENA_CROWN';
  crown.userData.sunshoreRetractingCrown = true;
  crown.userData.sunshoreRetractionTravel = .7 * ((level === 3 ? 2.755 : level === 2 ? 2.25 : 1.67) - .53);
  group.add(crown);
  if (level >= 1) {
    const fundedLevel = level as 1 | 2 | 3;
    const postCount = quality === 'high' ? 12 : quality === 'medium' ? 8 : 6;
    for (let index = 0; index < postCount; index += 1) {
      addSunwheelSignalPost(crown, index / postCount * Math.PI * 2, fundedLevel, materials, quality);
    }
    const ropeCrown = new THREE.Mesh(new THREE.TorusGeometry(1.68, 0.03, 5, quality === 'low' ? 32 : 52), materials.rope);
    ropeCrown.name = 'ISLAND_5_SUNWHEEL_TIDE_ROPE_CROWN';
    ropeCrown.rotation.x = Math.PI / 2;
    ropeCrown.position.y = level === 1 ? 1.02 : level === 2 ? 1.49 : 1.72;
    crown.add(ropeCrown);
  }
  if (level >= 2) {
    const operationalLevel = level as 2 | 3;
    for (let side = 0; side < 4; side += 1) {
      const angle = side / 4 * Math.PI * 2 + Math.PI / 4;
      addSunwheelCrownArch(crown, angle, operationalLevel, materials, quality);
      addBanner(crown, Math.sin(angle) * 1.58, level === 3 ? 1.45 : 1.17, Math.cos(angle) * 1.58, angle, materials);
    }
  }
  if (level === 3) {
    const halo = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.052, 6, quality === 'low' ? 36 : 60), materials.mangoGold);
    halo.name = 'ISLAND_5_SUNWHEEL_RESTORED_CROWN_HALO';
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 2.17;
    crown.add(halo);
    const crownFinCount = quality === 'high' ? 12 : quality === 'medium' ? 8 : 6;
    for (let index = 0; index < crownFinCount; index += 1) {
      const angle = index / crownFinCount * Math.PI * 2;
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.105, 0.48 + index % 2 * 0.15, 4), index % 2 ? materials.crystal : materials.mangoGold);
      fin.name = 'ISLAND_5_SUNWHEEL_RESTORED_CROWN_FIN';
      fin.position.set(Math.sin(angle) * 1.72, 2.44 + index % 2 * 0.075, Math.cos(angle) * 1.72);
      fin.rotation.y = angle;
      crown.add(fin);
    }
  }
  return group;
}

export function buildIsland2Landmark(
  definition: Island5LandmarkDefinition,
  level: BuildLevel,
  quality: Island3DQuality,
  materials: Island2WorldMaterials,
  options: IslandConstructionFactoryOptions = {},
) {
  const root = new THREE.Group();
  root.name = `ISLAND_2_${definition.id.toUpperCase()}_ROOT`;
  root.position.set(...definition.position);
  if (definition.id === 'boss') {
    const arena = createIsland5SunwheelArena(level, quality, materials);
    if (options.constructionPreview === 'target') {
      applyIslandConstructionAuthoring({
        root: arena,
        worldSourceNumber: 5,
        landmarkId: definition.id,
        quality,
        includeTemporaryRig: true,
      });
    }
    if (!options.constructionPreview) {
      const crown = arena.getObjectByName('SUNSHORE_RETRACTING_ARENA_CROWN');
      if (crown instanceof THREE.Group) compactStaticGeometry(crown, `SUNSHORE_MOVING_CROWN_L${level}`);
      compactStaticGeometry(arena, `ISLAND5_SUNWHEEL_L${level}`, mesh => {
        for (let node: THREE.Object3D | null = mesh; node; node = node.parent) {
          if (node.userData.sunshoreRetractingCrown) return false;
          if (node === arena) break;
        }
        return true;
      });
    }
    root.userData.sculptRuntime = arena.userData.sculptRuntime;
    root.add(arena);
  } else if (level === 0) {
    const foundation = cylinder(1.48, 1.6, 0.18, materials.rock, segmentsFor(quality));
    foundation.position.y = 0.12;
    root.add(foundation);
  } else {
    const resolved = level as 1 | 2 | 3;
    const building = definition.id === 'hatchery'
      ? createEggGrotto(resolved, quality, materials)
      : definition.id === 'habit'
        ? createHabitLodge(resolved, quality, materials)
        : definition.id === 'wisdom'
          ? createStarArchive(resolved, quality, materials)
          : createTideglassOracle(resolved, quality, materials);
    building.rotation.y = Math.atan2(-definition.position[0], -definition.position[2]);
    if (options.constructionPreview === 'target') {
      applyIslandConstructionAuthoring({
        root: building,
        worldSourceNumber: 5,
        landmarkId: definition.id,
        quality,
        includeTemporaryRig: true,
      });
    }
    if (!options.constructionPreview) {
      compactStaticGeometry(building, `ISLAND2_${definition.id.toUpperCase()}_L${resolved}`, mesh => {
        // Articulated ornaments retain their source geometry for the runtime's
        // rigid batching, which follows their animated world transforms.
        for (let node: THREE.Object3D | null = mesh; node; node = node.parent) {
          if (node.userData.sunshoreMagicMotion) return false;
          if (node === building) break;
        }
        return true;
      });
    }
    root.add(building);
  }
  root.traverse((child) => { child.userData.landmarkId = definition.id; });
  markShadows(root, quality !== 'low');
  return root;
}

export function addBeachShelf(root: THREE.Group, x: number, z: number, radius: number, materials: Island2WorldMaterials, quality: Island3DQuality) {
  const sand = cylinder(radius, radius * 1.06, 0.1, materials.sand, segmentsFor(quality));
  // The beach layer stays below the 0.34 tile-top plane so the canonical
  // route always remains visible and clickable.
  sand.position.set(x, 0.245, z);
  sand.scale.z = 0.78;
  root.add(sand);
  const garden = cylinder(radius * (radius > 4 ? 0.83 : 0.74), radius * (radius > 4 ? 0.85 : 0.77), 0.07, materials.garden, segmentsFor(quality));
  garden.position.set(x, 0.286, z);
  garden.scale.z = radius > 4 ? 0.76 : 0.72;
  root.add(garden);
  const rockCount = quality === 'high' ? 8 : quality === 'medium' ? 5 : 3;
  for (let index = 0; index < rockCount; index += 1) {
    const angle = index / rockCount * Math.PI * 2 + x * 0.17;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2 + (index % 3) * 0.05, 0), index % 2 ? materials.rock : materials.rockShade);
    rock.position.set(x + Math.cos(angle) * radius * 0.86, 0.34, z + Math.sin(angle) * radius * 0.66);
    rock.scale.set(1.2, 0.68 + (index % 2) * 0.2, 0.82);
    root.add(rock);
  }
}

function addWaterfall(root: THREE.Group, angle: number, radius: number, materials: Island2WorldMaterials, quality: Island3DQuality, phase: number) {
  const fall = box(quality === 'high' ? 0.19 : 0.24, 0.88, 0.035, materials.lagoonGlass);
  fall.name = 'ISLAND_2_WATERFALL';
  fall.position.set(Math.cos(angle) * radius, -0.02, Math.sin(angle) * radius);
  fall.rotation.y = -angle + Math.PI / 2;
  fall.userData.flowPhase = phase;
  const foam = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.035, 5, 18, Math.PI), materials.foam);
  foam.name = 'ISLAND_2_WATERFALL_FOAM';
  foam.position.set(Math.cos(angle) * (radius + 0.05), -0.5, Math.sin(angle) * (radius + 0.05));
  foam.rotation.x = Math.PI / 2;
  foam.rotation.z = -angle;
  foam.userData.flowPhase = phase;
  root.add(fall, foam);
}

function createDock(materials: Island2WorldMaterials, quality: Island3DQuality) {
  const dock = new THREE.Group();
  dock.name = 'ISLAND_2_FRONT_DOCK';
  dock.position.set(0, -0.46, 8.55);
  for (let index = 0; index < 14; index += 1) {
    const plank = box(1.18, 0.11, 0.16, materials.teak);
    plank.position.set(0, 0.28, -index * .162);
    dock.add(plank);
  }
  [-0.62, 0.62].forEach((x) => {
    [0, -1.8].forEach((z) => {
      const post = cylinder(0.07, 0.1, 0.86, materials.teakDark, segmentsFor(quality));
      post.position.set(x, 0.05, z);
      dock.add(post);
      addRopeWrap(dock, x, 0.32, z, 0.095, materials.rope);
    });
  });
  const boat = new THREE.Group();
  boat.name = 'ISLAND_2_OUTRIGGER_BOAT';
  boat.position.set(1.28, 0.07, -0.75);
  const outline = new THREE.Shape();
  outline.moveTo(-.82, 0); outline.quadraticCurveTo(-.55, -.22, .5, -.17);
  outline.quadraticCurveTo(.72, -.12, .82, 0); outline.quadraticCurveTo(.55, .22, -.5, .17);
  outline.quadraticCurveTo(-.72, .12, -.82, 0);
  const cockpit = new THREE.Path();
  cockpit.moveTo(-.6, 0); cockpit.quadraticCurveTo(-.36, .11, .44, .09);
  cockpit.lineTo(.62, 0); cockpit.quadraticCurveTo(.36, -.11, -.44, -.09); cockpit.closePath();
  outline.holes.push(cockpit);
  const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(outline, {depth:.16,bevelEnabled:true,bevelSize:.025,bevelThickness:.02,bevelSegments:1,curveSegments:quality==='low'?5:10}), materials.teakDark);
  hull.name = 'SUNSHORE_V2_OPEN_CANOE_HULL'; hull.rotation.x = Math.PI / 2; hull.position.y = .12; boat.add(hull);
  const floor = box(1.12,.035,.17,materials.teak); floor.position.y=-.03; boat.add(floor);
  for (const x of [-.43, 0, .43]) { const seat=box(.075,.04,.31,materials.teak);seat.position.set(x,.09,0);boat.add(seat); }
  const float = new THREE.Mesh(new THREE.CapsuleGeometry(.065,1.12,3,8),materials.teak);
  float.name='SUNSHORE_V2_OUTRIGGER_FLOAT';float.rotation.z=Math.PI/2;float.position.set(0,-.01,.64);boat.add(float);
  for(const x of [-.43,.43]) {const spar=box(.05,.055,.83,materials.teak);spar.position.set(x,.08,.3);boat.add(spar);}
  const mast=cylinder(.022,.028,.86,materials.teakDark,6);mast.position.set(-.1,.51,0);boat.add(mast);
  const rig = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.7,.13,0),new THREE.Vector3(-.1,.94,0),new THREE.Vector3(-.1,.94,0),new THREE.Vector3(.7,.13,0)]);
  boat.add(new THREE.LineSegments(rig,new THREE.LineBasicMaterial({color:0xb99d6b})));
  dock.add(boat);
  return dock;
}


export function addInstancedGardenDetails(root: THREE.Group, materials: Island2WorldMaterials, quality: Island3DQuality) {
  const clusterCount = quality === 'high' ? 54 : quality === 'medium' ? 32 : 16;
  const leafGeometry = new THREE.SphereGeometry(0.16, quality === 'high' ? 8 : 6, 5);
  const flowerGeometry = new THREE.SphereGeometry(0.055, 6, 4);
  const leaves = new THREE.InstancedMesh(leafGeometry, materials.leafDark, clusterCount * 3);
  const coralFlowers = new THREE.InstancedMesh(flowerGeometry, materials.flowerCoral, clusterCount * 2);
  const pinkFlowers = new THREE.InstancedMesh(flowerGeometry, materials.flowerPink, clusterCount * 2);
  leaves.name = 'ISLAND_2_INSTANCED_GARDEN_LEAVES';
  coralFlowers.name = 'ISLAND_2_INSTANCED_CORAL_FLOWERS';
  pinkFlowers.name = 'ISLAND_2_INSTANCED_PINK_FLOWERS';
  const dummy = new THREE.Object3D();
  for (let index = 0; index < clusterCount; index += 1) {
    const angle = index / clusterCount * Math.PI * 2 + 0.11;
    const radius = 4.18 + (index % 4) * 0.23;
    const baseX = Math.cos(angle) * radius;
    const baseZ = Math.sin(angle) * radius;
    for (let leafIndex = 0; leafIndex < 3; leafIndex += 1) {
      const leafAngle = angle + leafIndex / 3 * Math.PI * 2;
      dummy.position.set(baseX + Math.cos(leafAngle) * 0.12, 0.43 + leafIndex * 0.025, baseZ + Math.sin(leafAngle) * 0.12);
      dummy.rotation.set(0, leafAngle, (leafIndex - 1) * 0.18);
      dummy.scale.set(1.35, 0.52, 0.76);
      dummy.updateMatrix();
      leaves.setMatrixAt(index * 3 + leafIndex, dummy.matrix);
    }
    for (let flowerIndex = 0; flowerIndex < 2; flowerIndex += 1) {
      const flowerAngle = angle + flowerIndex * Math.PI;
      dummy.position.set(baseX + Math.cos(flowerAngle) * 0.16, 0.54 + flowerIndex * 0.03, baseZ + Math.sin(flowerAngle) * 0.16);
      dummy.rotation.set(0, flowerAngle, 0);
      dummy.scale.set(1.45, 0.55, 1);
      dummy.updateMatrix();
      coralFlowers.setMatrixAt(index * 2 + flowerIndex, dummy.matrix);
      dummy.position.y += 0.035;
      dummy.position.x -= Math.sin(flowerAngle) * 0.07;
      dummy.position.z += Math.cos(flowerAngle) * 0.07;
      dummy.scale.set(1.15, 0.48, 0.86);
      dummy.updateMatrix();
      pinkFlowers.setMatrixAt(index * 2 + flowerIndex, dummy.matrix);
    }
  }
  [leaves, coralFlowers, pinkFlowers].forEach((mesh) => {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = quality !== 'low';
    mesh.receiveShadow = true;
  });
  root.add(leaves, coralFlowers, pinkFlowers);
}

function addTropicalCloudBelt(root: THREE.Group, quality: Island3DQuality) {
  const cloudMaterial = new THREE.MeshBasicMaterial({ color: 0xf6fdff, transparent: true, opacity: 0.72, depthWrite: false });
  const cloudCount = quality === 'high' ? 7 : quality === 'medium' ? 5 : 3;
  for (let index = 0; index < cloudCount; index += 1) {
    const angle = index / cloudCount * Math.PI * 2 + 0.24;
    const cloud = new THREE.Group();
    cloud.name = 'ISLAND_2_CLOUD';
    cloud.position.set(Math.cos(angle) * (31 + index % 2 * 4), 10.5 + index % 3 * 2.2, Math.sin(angle) * (31 + index % 2 * 4));
    cloud.userData.cloudAngle = angle;
    cloud.userData.cloudRadius = 31 + index % 2 * 4;
    const puffCount = quality === 'high' ? 7 : 5;
    for (let puffIndex = 0; puffIndex < puffCount; puffIndex += 1) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.72 + puffIndex % 3 * 0.17, 8, 6), cloudMaterial);
      puff.scale.set(1.5, 0.66, 1);
      puff.position.set((puffIndex - puffCount / 2) * 0.62, Math.sin(puffIndex * 1.8) * 0.18, Math.cos(puffIndex * 1.2) * 0.34);
      cloud.add(puff);
    }
    root.add(cloud);
  }
}

export function createIsland2LivingAmbience(
  scene: THREE.Scene,
  profile: Island3DQualityProfile,
  materials: Island2WorldMaterials,
  ocean: THREE.Mesh,
): Island2AmbienceRuntime {
  const root = new THREE.Group();
  root.name = 'ISLAND_2_TROPICAL_AMBIENCE';
  const quality = profile.id;
  const detail = detailFor(quality);
  const palms: THREE.Group[] = [];
  const waterfalls: THREE.Object3D[] = [];

  const butterflies: THREE.Group[] = [];
  const seaLife = createSunshoreSeaLife(quality);
  root.add(seaLife.root);

  root.add(createSunshoreV2Landscape(materials, quality));

  const palmCount = quality === 'high' ? 20 : quality === 'medium' ? 14 : 8;
  // Reserve the actual four focus sightlines, including the full frond crown.
  // Angular gaps alone leave foreground palms directly across the lodge bay.
  const focusViews = ISLAND_5_CAMERA_PRESETS.filter(view => ['hatchery', 'habit', 'wisdom', 'event'].includes(view.id));
  const obscuresFocus = (x: number, z: number) => focusViews.some(view => {
    const dx = view.position[0] - view.target[0], dz = view.position[2] - view.target[2];
    const t = ((x - view.target[0]) * dx + (z - view.target[2]) * dz) / (dx * dx + dz * dz);
    if (t < -.12 || t > 1) return false;
    return Math.hypot(x - view.target[0] - t * dx, z - view.target[2] - t * dz) < 1.85;
  });
  let palmIndex = 0;
  for (let attempt = 0; attempt < palmCount * 2 && palmIndex < palmCount; attempt += 1) {
    const angle = attempt / (palmCount * 2) * Math.PI * 2 + 0.17;
    if (Math.abs(angle % (Math.PI * 2) - Math.PI / 2) < .38) continue;
    const radius = sunshoreCoastRadius(angle) * .9;
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
    if (obscuresFocus(x, z)) continue;
    const palm = addPalm(root, Math.cos(angle) * radius, Math.sin(angle) * radius, 1.45 + (palmIndex % 4) * 0.22, materials, quality, angle + palmIndex * 0.27);
    palms.push(palm);
    if (palmIndex % 2 === 0) addFlowerCluster(root, Math.cos(angle) * (radius - 0.34), Math.sin(angle) * (radius - 0.34), materials, quality, angle);
    palmIndex += 1;
  }

  const waterfallCount = quality === 'high' ? 12 : quality === 'medium' ? 8 : 4;
  for (let index = 0; index < waterfallCount; index += 1) {
    const angle = index / waterfallCount * Math.PI * 2 + 0.14;
    addWaterfall(root, angle, 6.05, materials, quality, index * 0.63);
  }
  root.traverse((child) => {
    if (child.name === 'ISLAND_2_WATERFALL' || child.name === 'ISLAND_2_WATERFALL_FOAM') waterfalls.push(child);
  });

  const waveCount = quality === 'high' ? 14 : quality === 'medium' ? 9 : 5;
  for (let index = 0; index < waveCount; index += 1) {
    const angle = index / waveCount * Math.PI * 2;
    const wave = new THREE.Mesh(new THREE.TorusGeometry(6.34 + (index % 3) * 0.12, 0.025, 4, 18, Math.PI / 4), materials.foam);
    wave.name = 'ISLAND_2_SHORE_WAVE';
    wave.rotation.x = Math.PI / 2;
    wave.rotation.z = -angle;
    wave.position.y = -0.51;
    wave.userData.wavePhase = index / waveCount;
    root.add(wave);
  }

  root.add(createDock(materials, quality));
  const archipelago = createSunshoreArchipelago(materials, quality);
  root.add(archipelago);
  const planting = new THREE.Group(); planting.name = 'SUNSHORE_V2_PLANTING';
  const plantCount = quality === 'high' ? 82 : quality === 'medium' ? 56 : 32;
  for (let i = 0; i < plantCount; i++) {
    const angle = i * 2.399963;
    const radius = sunshoreCoastRadius(angle) * (.77 + (i % 3) * .06);
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
    if (Math.hypot(x,z) < 4.2 || (Math.abs(x) < .8 && z > 4.5)) continue;
    if ([[-4.36,-3.9],[4.36,-3.9],[-4.36,3.9],[4.36,3.9]].some(([cx,cz]) => Math.hypot(x-cx,z-cz) < 1.68)) continue;
    // Uneven planted pockets leave quiet grass between taller tropical clusters.
    if (Math.sin(angle * 7 + .6) < -.2) continue;
    const plant = createSunshoreV2PlantCluster(materials, quality, i); plant.position.set(x,.3,z);
    plant.scale.setScalar(.9 + (i % 4) * .15); planting.add(plant);
  }
  compactStaticGeometry(planting, 'SUNSHORE_V2_PLANTING'); root.add(planting);
  addTropicalCloudBelt(root, quality);

  const birds = createSunshoreBirds(materials, quality);
  root.add(birds.root);

  const butterflyCount = quality === 'high' ? 14 : quality === 'medium' ? 8 : 0;
  for (let index = 0; index < butterflyCount; index += 1) {
    const butterfly = new THREE.Group();
    butterfly.name = 'ISLAND_2_BUTTERFLY';
    const left = new THREE.Mesh(new THREE.CircleGeometry(0.06, 6, 0, Math.PI), index % 2 ? materials.flowerPink : materials.flowerCoral);
    const right = left.clone();
    left.position.x = -0.04;
    right.position.x = 0.04;
    butterfly.add(left, right);
    butterfly.userData.left = left;
    butterfly.userData.right = right;
    butterflies.push(butterfly);
    root.add(butterfly);
  }

  markShadows(root, quality !== 'low');
  archipelago.traverse(object => { object.castShadow = false; object.receiveShadow = false; });
  seaLife.root.traverse(object => { object.castShadow = false; object.receiveShadow = false; });
  scene.add(root);

  const animateSea = configureSunshoreV2Water(ocean);
  const oceanPosition = ocean.geometry.getAttribute('position') as THREE.BufferAttribute;
  const oceanBase = Float32Array.from(oceanPosition.array as ArrayLike<number>);
  let lastOceanUpdate = 0;
  return {
    root,
    animate: (elapsed) => {
      animateSea(elapsed);
      palms.forEach((palm, palmIndex) => {
        palm.rotation.z = Math.sin(elapsed * .44 + palmIndex * .7) * .015 * detail;
        palm.rotation.x = Math.cos(elapsed * .37 + palmIndex) * .012 * detail;
      });
      waterfalls.forEach((object, index) => {
        const phase = object.userData.flowPhase as number;
        if (object.name === 'ISLAND_2_WATERFALL') object.scale.y = 0.94 + Math.sin(elapsed * 2.2 + phase) * 0.06;
        else (object as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>).material.opacity = 0.38 + Math.sin(elapsed * 1.7 + phase) * 0.15;
      });
      root.children.forEach((child) => {
        if (child.name !== 'ISLAND_2_SHORE_WAVE') return;
        const phase = ((child.userData.wavePhase as number) + elapsed * 0.07) % 1;
        child.scale.setScalar(0.97 + phase * 0.08);
        (child as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>).material.opacity = Math.sin(phase * Math.PI) * 0.55;
      });
      birds.update(elapsed);
      butterflies.forEach((butterfly, index) => {
        const angle = elapsed * (0.15 + index * 0.002) + index / Math.max(1, butterflyCount) * Math.PI * 2;
        const radius = 4.35 + index % 4 * 0.3;
        butterfly.position.set(Math.cos(angle) * radius, 0.82 + Math.sin(elapsed * 1.5 + index) * 0.2, Math.sin(angle) * radius);
        const flap = Math.sin(elapsed * 8.6 + index) * 0.75;
        (butterfly.userData.left as THREE.Mesh).rotation.y = flap;
        (butterfly.userData.right as THREE.Mesh).rotation.y = -flap;
      });
      seaLife.update(elapsed);
      root.children.forEach((child) => {
        if (child.name !== 'ISLAND_2_CLOUD') return;
        const baseAngle = child.userData.cloudAngle as number;
        const radius = child.userData.cloudRadius as number;
        const angle = baseAngle + elapsed * 0.0035;
        child.position.x = Math.cos(angle) * radius;
        child.position.z = Math.sin(angle) * radius;
      });
      materials.crystal.emissiveIntensity = .28 + Math.sin(elapsed * 1.05) * .08;
      if (elapsed - lastOceanUpdate > 1 / profile.oceanUpdateFps) {
        lastOceanUpdate = elapsed;
        for (let index = 0; index < oceanPosition.count; index += 1) {
          const x = oceanBase[index * 3];
          const y = oceanBase[index * 3 + 1];
          const z = oceanBase[index * 3 + 2];
          oceanPosition.setXYZ(index, x, y, z + Math.sin(x * 0.32 + elapsed * 0.62) * 0.055 + Math.cos(y * 0.26 - elapsed * 0.47) * 0.035);
        }
        oceanPosition.needsUpdate = true;
        ocean.geometry.computeVertexNormals();
      }
    },
  };
}
