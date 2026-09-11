import * as THREE from 'three';
import type {
  Island3DQuality,
  Island3DQualityProfile,
  Island5LandmarkDefinition,
} from './island5ThreePilotContract';
import { addCelestialV2Gardens, addCelestialV2Waterways, createCelestialDockingBridge } from './Island2CelestialV2Landscape';
import { createCelestialTree } from './Island2CelestialV2Botany';
import { createCelestialV2Gate, CELESTIAL_GATE_FOOTPRINT_RADIUS } from './Island2CelestialV2Gate';
import { createCelestialV2Archive } from './Island2CelestialV2Archive';
import { createCelestialV2ResolveCourt } from './Island2CelestialV2ResolveCourt';
import { batchCelestialStatic, batchCelestialPlantInstances } from './Island2CelestialV2Batch';
import { createCelestialV2Palace } from './Island2CelestialV2Landmarks';
import { createCelestialSkyRoot } from './Island2CelestialV2Terrain';
import { createCelestialV2Cloudnest } from './Island2CelestialV2Cloudnest';
import {
  applyIslandConstructionAuthoring,
  type IslandConstructionFactoryOptions,
} from './IslandConstructionAuthoring';

export const ISLAND_2_CELESTIAL_WORLD_NAME = 'Celestial Sky Kingdom';
type BuildLevel = 0 | 1 | 2 | 3;

export const ISLAND_2_CELESTIAL_LANDMARK_LABELS = {
  boss: 'Solspire Palace',
  hatchery: 'Cloudnest Conservatory',
  habit: 'Winged Resolve Court',
  wisdom: 'Skybound Archive',
  event: 'Astral Gate',
} as const;

export interface Island2CelestialMaterials {
  ivory: THREE.MeshStandardMaterial;
  ivoryShade: THREE.MeshStandardMaterial;
  cliff: THREE.MeshStandardMaterial;
  grass: THREE.MeshStandardMaterial;
  grassLight: THREE.MeshStandardMaterial;
  sapphire: THREE.MeshPhysicalMaterial;
  sapphireLight: THREE.MeshPhysicalMaterial;
  gold: THREE.MeshStandardMaterial;
  crystal: THREE.MeshPhysicalMaterial;
  cyanCrystal: THREE.MeshPhysicalMaterial;
  water: THREE.MeshPhysicalMaterial;
  cloud: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  paper: THREE.MeshStandardMaterial;
  egg: THREE.MeshPhysicalMaterial;
  eggSpot: THREE.MeshStandardMaterial;
  banner: THREE.MeshStandardMaterial;
  flower: THREE.MeshStandardMaterial;
  warmGlow: THREE.MeshStandardMaterial;
  conservatoryGlass: THREE.MeshPhysicalMaterial;
  bark: THREE.MeshStandardMaterial;
  foliageDark: THREE.MeshStandardMaterial;
  foliageMid: THREE.MeshStandardMaterial;
  foliageLight: THREE.MeshStandardMaterial;
  blossomWhite: THREE.MeshStandardMaterial;
  blossomLilac: THREE.MeshStandardMaterial;
}

export interface Island2CelestialAmbienceRuntime {
  root: THREE.Group;
  animate: (elapsed: number) => void;
  updateView?: (cameraPosition: THREE.Vector3) => void;
  registerRedockingLandmark?: (landmarkId: Island5LandmarkDefinition['id'], root: THREE.Object3D) => void;
  updateRedocking?: (presentation: Island2CelestialRedockingPresentation, immediate?: boolean) => void;
  consumeShadowUpdate?: () => boolean;
}

export interface Island2CelestialRedockingPresentation {
  completedRolls: number;
  targetRolls: number;
  dockedPlatformCount: number;
}

const CELESTIAL_REDOCKING_PLATFORM_IDS = Object.freeze([
  'hatchery', 'habit', 'wisdom', 'event',
] as const satisfies readonly Island5LandmarkDefinition['id'][]);
const CELESTIAL_REDOCKING_ROLLS_PER_PLATFORM = 5;
const CELESTIAL_REDOCKING_START_OFFSET = 2.75;

const segmentsFor = (quality: Island3DQuality) => quality === 'high' ? 24 : quality === 'medium' ? 16 : 10;
const detailFor = (quality: Island3DQuality) => quality === 'high' ? 1 : quality === 'medium' ? 0.64 : 0.36;

function cylinder(radiusTop: number, radiusBottom: number, height: number, material: THREE.Material, segments = 16) {
  return new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
}

function box(width: number, height: number, depth: number, material: THREE.Material) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
}

function markShadows(root: THREE.Object3D, enabled: boolean) {
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const surfaces = Array.isArray(child.material) ? child.material : [child.material];
      // Clear glass and water must not cast the shadow of an opaque wall.
      child.castShadow = enabled && !surfaces.some(material => material.transparent && !material.depthWrite);
      child.receiveShadow = true;
    }
  });
}

function createPatternTexture(size: number, pattern: 'stone' | 'roof' | 'cliff') {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const noise = ((x * 47 + y * 83 + x * y * 3) % 31) - 15;
      let value = 230 + Math.round(noise * 0.18);
      if (pattern === 'stone') {
        const course = Math.floor(y / 16);
        const mortar = y % 16 < 2 || (x + (course % 2) * 18) % 36 < 2;
        value = mortar ? 232 : 247 + Math.round(noise * 0.07);
      } else if (pattern === 'roof') {
        const seam = x % 24 < 1;
        value = seam ? 236 : 244 + Math.round(noise * 0.06);
      } else {
        value = 240 + Math.round(noise * 0.24);
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
  texture.repeat.set(pattern === 'stone' ? 3 : 4, pattern === 'stone' ? 3 : 4);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export function createIsland2CelestialMaterials(): Island2CelestialMaterials {
  const stoneMap = createPatternTexture(128, 'stone');
  const roofMap = createPatternTexture(96, 'roof');
  const cliffMap = createPatternTexture(128, 'cliff');
  return {
    conservatoryGlass: new THREE.MeshPhysicalMaterial({ color: 0xc0e7ed, roughness: .2, metalness: .02, transparent: true, opacity: .19, depthWrite: false, clearcoat: .7, side: THREE.FrontSide }),
    bark: new THREE.MeshStandardMaterial({ color: 0x66533e, roughness: .95 }),
    foliageDark: new THREE.MeshStandardMaterial({ color: 0x2f563b, roughness: .88 }),
    foliageMid: new THREE.MeshStandardMaterial({ color: 0x537945, roughness: .86 }),
    foliageLight: new THREE.MeshStandardMaterial({ color: 0x88a650, roughness: .84 }),
    blossomWhite: new THREE.MeshStandardMaterial({ color: 0xf5edda, roughness: .8 }),
    blossomLilac: new THREE.MeshStandardMaterial({ color: 0xa694ca, roughness: .8 }),
    ivory: new THREE.MeshStandardMaterial({ color: 0xf5f0dd, map: stoneMap, roughness: 0.64, metalness: 0 }),
    ivoryShade: new THREE.MeshStandardMaterial({ color: 0xc9d3d5, map: stoneMap, roughness: 0.78, metalness: 0 }),
    cliff: new THREE.MeshStandardMaterial({ color: 0x9b9e91, map: cliffMap, roughness: 0.92, metalness: 0, emissive: 0x1d2f45, emissiveIntensity: 0.08 }),
    grass: new THREE.MeshStandardMaterial({ color: 0x4f8055, roughness: 0.9 }),
    grassLight: new THREE.MeshStandardMaterial({ color: 0x86ad63, roughness: 0.86 }),
    sapphire: new THREE.MeshPhysicalMaterial({ color: 0x255aa8, map: roofMap, roughness: 0.38, metalness: 0.08, clearcoat: 0.48, clearcoatRoughness: 0.22 }),
    sapphireLight: new THREE.MeshPhysicalMaterial({ color: 0x3d82d2, map: roofMap, roughness: 0.3, metalness: 0.1, clearcoat: 0.62, clearcoatRoughness: 0.16 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xe6b84e, roughness: 0.28, metalness: 0.8, emissive: 0x4b2a05, emissiveIntensity: 0.12 }),
    crystal: new THREE.MeshPhysicalMaterial({ color: 0x8d62e8, roughness: 0.06, metalness: 0.10, transmission: 0, thickness: 0.5, clearcoat: 1, emissive: 0x4b20b9, emissiveIntensity: 0.64 }),
    cyanCrystal: new THREE.MeshPhysicalMaterial({ color: 0x73dff7, roughness: 0.05, metalness: 0.08, transmission: 0, thickness: 0.38, clearcoat: 1, emissive: 0x167fa6, emissiveIntensity: 0.56 }),
    water: new THREE.MeshPhysicalMaterial({ color: 0x75e5ff, roughness: 0.05, transparent: true, opacity: 0.7, transmission: 0, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide }),
    cloud: new THREE.MeshStandardMaterial({ color: 0xf4f5ef, roughness: 0.96, fog: false }),
    wood: new THREE.MeshStandardMaterial({ color: 0xb88952, roughness: 0.82 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xf4e6bd, roughness: 0.9, side: THREE.DoubleSide }),
    egg: new THREE.MeshPhysicalMaterial({ color: 0xe7f1ff, roughness: 0.2, clearcoat: 0.76, clearcoatRoughness: 0.14 }),
    eggSpot: new THREE.MeshStandardMaterial({ color: 0x78a8ea, roughness: 0.4, emissive: 0x1e4f95, emissiveIntensity: 0.1 }),
    banner: new THREE.MeshStandardMaterial({ color: 0x1f55a0, roughness: 0.54, side: THREE.DoubleSide }),
    flower: new THREE.MeshStandardMaterial({ color: 0xf2a7cd, roughness: 0.68, emissive: 0x55162f, emissiveIntensity: 0.08 }),
    warmGlow: new THREE.MeshStandardMaterial({ color: 0xffe29a, roughness: 0.34, emissive: 0xd88722, emissiveIntensity: 1.2 }),
  };
}

function addPlinth(group: THREE.Group, radius: number, materials: Island2CelestialMaterials, quality: Island3DQuality, y = 0.18) {
  const base = cylinder(radius, radius + 0.16, 0.26, materials.ivoryShade, segmentsFor(quality));
  base.position.y = y;
  const top = cylinder(radius * 0.92, radius, 0.12, materials.ivory, segmentsFor(quality));
  top.position.y = y + 0.19;
  const band = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.84, 0.045, 6, segmentsFor(quality) * 2), materials.gold);
  band.rotation.x = Math.PI / 2;
  band.position.y = y + 0.27;
  group.add(base, top, band);
}

function addColumn(group: THREE.Group, x: number, z: number, height: number, materials: Island2CelestialMaterials, quality: Island3DQuality) {
  const foot = cylinder(0.12, 0.15, 0.12, materials.gold, 8);
  foot.position.set(x, 0.5, z);
  const shaft = cylinder(0.075, 0.1, height, materials.ivory, segmentsFor(quality));
  shaft.position.set(x, 0.56 + height / 2, z);
  const capital = cylinder(0.14, 0.1, 0.12, materials.gold, 8);
  capital.position.set(x, 0.62 + height, z);
  group.add(foot, shaft, capital);
}

function addSpire(group: THREE.Group, x: number, z: number, baseY: number, scale: number, materials: Island2CelestialMaterials, quality: Island3DQuality, light = false) {
  const tower = cylinder(0.2 * scale, 0.25 * scale, 0.72 * scale, materials.ivory, segmentsFor(quality));
  tower.position.set(x, baseY + 0.36 * scale, z);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.3 * scale, 0.64 * scale, segmentsFor(quality)), light ? materials.sapphireLight : materials.sapphire);
  roof.position.set(x, baseY + 1.02 * scale, z);
  const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.09 * scale), materials.gold);
  finial.position.set(x, baseY + 1.4 * scale, z);
  finial.scale.y = 1.8;
  group.add(tower, roof, finial);
}

function addArch(group: THREE.Group, width: number, y: number, z: number, materials: Island2CelestialMaterials, rotationY = 0) {
  const archRoot = new THREE.Group();
  archRoot.position.set(0, y, z);
  archRoot.rotation.y = rotationY;
  [-width / 2, width / 2].forEach((x) => {
    const pier = box(0.16, 0.85, 0.22, materials.ivory);
    pier.position.set(x, 0.42, 0);
    archRoot.add(pier);
  });
  const arch = new THREE.Mesh(new THREE.TorusGeometry(width / 2, 0.085, 7, 20, Math.PI), materials.gold);
  arch.position.y = 0.82;
  arch.rotation.z = Math.PI;
  archRoot.add(arch);
  group.add(archRoot);
}

function addWindowBand(group: THREE.Group, radius: number, y: number, count: number, materials: Island2CelestialMaterials, quality: Island3DQuality) {
  for (let index = 0; index < count; index += 1) {
    const angle = index / count * Math.PI * 2;
    const window = box(0.17, 0.34, 0.035, materials.cyanCrystal);
    window.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    window.rotation.y = -angle + Math.PI / 2;
    group.add(window);
    if (quality === 'high') {
      const crest = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 4), materials.gold);
      crest.position.set(Math.cos(angle) * radius, y + 0.23, Math.sin(angle) * radius);
      group.add(crest);
    }
  }
}

function addBanner(group: THREE.Group, x: number, y: number, z: number, rotationY: number, materials: Island2CelestialMaterials) {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = rotationY;
  const pole = cylinder(0.025, 0.03, 0.9, materials.gold, 6);
  pole.position.y = 0.45;
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.5), materials.banner);
  cloth.position.set(0.19, 0.48, 0);
  const sigil = new THREE.Mesh(new THREE.OctahedronGeometry(0.055), materials.gold);
  sigil.position.set(0.19, 0.5, 0.02);
  root.add(pole, cloth, sigil);
  group.add(root);
}

function addStairs(group: THREE.Group, direction: number, width: number, materials: Island2CelestialMaterials, level: 1 | 2 | 3) {
  const count = level === 1 ? 2 : level === 2 ? 3 : 4;
  for (let index = 0; index < count; index += 1) {
    const step = box(width + index * 0.08, 0.1, 0.24, index % 2 ? materials.ivoryShade : materials.ivory);
    step.position.set(0, 0.4 + index * 0.08, direction * (1.1 + index * 0.22));
    group.add(step);
  }
}

function addNestAndEggs(group: THREE.Group, level: 1 | 2 | 3, materials: Island2CelestialMaterials, quality: Island3DQuality) {
  const ringCount = level === 1 ? 3 : level === 2 ? 5 : 7;
  for (let index = 0; index < ringCount; index += 1) {
    const nest = new THREE.Mesh(new THREE.TorusGeometry(0.52 + index * 0.045, 0.055, 5, quality === 'low' ? 14 : 24), materials.wood);
    nest.rotation.x = Math.PI / 2 + (index % 2 ? 0.08 : -0.06);
    nest.rotation.z = index * 0.6;
    nest.position.y = 0.67 + index * 0.02;
    group.add(nest);
  }
  const eggCount = level;
  for (let index = 0; index < eggCount; index += 1) {
    const angle = index / Math.max(1, eggCount) * Math.PI * 2 + 0.4;
    const egg = new THREE.Mesh(new THREE.SphereGeometry(0.22 + level * 0.015, segmentsFor(quality), 10), materials.egg);
    egg.scale.y = 1.35;
    egg.position.set(Math.cos(angle) * 0.27, 0.94, Math.sin(angle) * 0.22);
    group.add(egg);
    const spotCount = quality === 'high' ? 4 : 2;
    for (let spotIndex = 0; spotIndex < spotCount; spotIndex += 1) {
      const spot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), materials.eggSpot);
      spot.scale.z = 0.25;
      spot.position.set(egg.position.x + (spotIndex % 2 ? 0.13 : -0.12), 0.93 + spotIndex * 0.07, egg.position.z + 0.18);
      group.add(spot);
    }
  }
}

function createCloudnest(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island2CelestialMaterials) {
  const group = new THREE.Group();
  group.name = `ISLAND_2_CLOUDNEST_L${level}`;
  addPlinth(group, 1.38, materials, quality);
  addNestAndEggs(group, level, materials, quality);
  const columnCount = level === 1 ? 3 : level === 2 ? 5 : 7;
  for (let index = 0; index < columnCount; index += 1) {
    const angle = index / columnCount * Math.PI * 2;
    addColumn(group, Math.cos(angle) * 0.93, Math.sin(angle) * 0.93, level === 1 ? 0.72 : 1.08, materials, quality);
  }
  if (level >= 2) {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.14, segmentsFor(quality), 10, 0, Math.PI * 2, 0, Math.PI / 2), materials.ivory);
    dome.position.y = 1.66;
    dome.scale.y = 0.78;
    group.add(dome);
    const ribs = level === 3 ? 10 : 6;
    for (let index = 0; index < ribs; index += 1) {
      const angle = index / ribs * Math.PI * 2;
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.027, 4, 18, Math.PI / 2), materials.gold);
      rib.position.y = 1.66;
      rib.rotation.set(0, angle, Math.PI / 2);
      group.add(rib);
    }
    addArch(group, 0.52, 0.72, 0.93, materials);
  }
  if (level === 3) {
    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 6, 24), materials.gold);
    crown.rotation.x = Math.PI / 2;
    crown.position.y = 2.52;
    const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), materials.gold);
    finial.position.y = 2.82;
    finial.scale.y = 1.7;
    group.add(crown, finial);
    [-1, 1].forEach((side) => addSpire(group, side * 0.98, 0, 0.45, 0.62, materials, quality, true));
    const displayNest = new THREE.Group();
    displayNest.position.set(0, 0.02, 1.04);
    for (let index = 0; index < 5; index += 1) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.38 + index * 0.035, 0.045, 5, quality === 'low' ? 14 : 22), materials.wood);
      ring.rotation.x = Math.PI / 2 + (index % 2 ? 0.08 : -0.06);
      ring.rotation.z = index * 0.64;
      ring.position.y = 0.48 + index * 0.02;
      displayNest.add(ring);
    }
    const displayEgg = new THREE.Mesh(new THREE.SphereGeometry(0.24, segmentsFor(quality), 10), materials.egg);
    displayEgg.scale.y = 1.35;
    displayEgg.position.y = 0.73;
    displayNest.add(displayEgg);
    group.add(displayNest);
  }
  return group;
}

function addTrainingFigure(group: THREE.Group, x: number, z: number, materials: Island2CelestialMaterials, quality: Island3DQuality, phase: number) {
  const body = cylinder(0.13, 0.16, 0.4, materials.ivory, segmentsFor(quality));
  body.position.set(x, 0.83, z);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, segmentsFor(quality), 8), materials.ivory);
  head.position.set(x, 1.14, z);
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.2, 6), materials.sapphire);
  crown.position.set(x, 1.36, z);
  const weight = cylinder(0.08, 0.08, 0.72, materials.gold, 8);
  weight.position.set(x, 0.98, z);
  weight.rotation.z = phase % 2 ? 0.85 : -0.85;
  group.add(body, head, crown, weight);
}

function createResolveCourt(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island2CelestialMaterials) {
  const group = new THREE.Group();
  group.name = `ISLAND_2_RESOLVE_COURT_L${level}`;
  addPlinth(group, 1.42, materials, quality);
  const fountain = cylinder(0.42 + level * 0.07, 0.5 + level * 0.07, 0.22, materials.cyanCrystal, segmentsFor(quality));
  fountain.position.y = 0.55;
  group.add(fountain);
  const compass = new THREE.Mesh(new THREE.RingGeometry(0.55, 1.02, 28), materials.sapphire);
  compass.rotation.x = -Math.PI / 2;
  compass.position.y = 0.48;
  group.add(compass);
  const figures = level === 1 ? 2 : level === 2 ? 3 : 4;
  for (let index = 0; index < figures; index += 1) {
    const angle = index / figures * Math.PI * 2 + Math.PI / 4;
    addTrainingFigure(group, Math.cos(angle) * 0.82, Math.sin(angle) * 0.82, materials, quality, index);
  }
  if (level >= 2) {
    const columnCount = level === 2 ? 4 : 8;
    for (let index = 0; index < columnCount; index += 1) {
      const angle = index / columnCount * Math.PI * 2 + Math.PI / 8;
      if (Math.sin(angle) > 0.72) continue;
      addColumn(group, Math.cos(angle) * 1.06, Math.sin(angle) * 1.06, level === 2 ? 1.18 : 1.46, materials, quality);
    }
    addArch(group, 1.72, 0.54, -0.66, materials);
    const colonnadeRing = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.05, 6, 36), materials.gold);
    colonnadeRing.rotation.x = Math.PI / 2;
    colonnadeRing.position.y = level === 3 ? 2.08 : 1.78;
    group.add(colonnadeRing);
  }
  if (level === 3) {
    const statue = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.56, 5, 10), materials.ivory);
    statue.position.set(0, 1.36, -0.47);
    statue.rotation.z = Math.PI / 2;
    group.add(statue);
    [-1, 1].forEach((side) => {
      const wing = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.72, 5), materials.gold);
      wing.position.set(side * 0.55, 1.58, -0.46);
      wing.rotation.z = side * 1.1;
      wing.scale.z = 0.35;
      group.add(wing);
    });
    [-1.15, 1.15].forEach((x, index) => addBanner(group, x, 0.64, 0.32, index ? Math.PI : 0, materials));
  }
  return group;
}

function createAstralGate(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island2CelestialMaterials) {
  const group = new THREE.Group();
  group.name = `ISLAND_2_ASTRAL_GATE_L${level}`;
  addPlinth(group, 1.38, materials, quality);
  const portalRadius = level === 1 ? 0.46 : level === 2 ? 0.72 : 0.9;
  const arc = level === 1 ? Math.PI : Math.PI * 2;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(portalRadius, 0.09 + level * 0.015, 8, segmentsFor(quality) * 2, arc), materials.gold);
  ring.position.y = 0.72 + portalRadius;
  if (level === 1) ring.rotation.z = Math.PI;
  const field = new THREE.Mesh(new THREE.CircleGeometry(portalRadius * 0.83, segmentsFor(quality) * 2, 0, arc), materials.crystal);
  field.position.set(0, 0.72 + portalRadius, -0.025);
  if (level === 1) field.rotation.z = Math.PI;
  group.add(ring, field);
  const pylons = level === 1 ? 2 : level === 2 ? 4 : 6;
  for (let index = 0; index < pylons; index += 1) {
    const angle = index / pylons * Math.PI * 2;
    addSpire(group, Math.cos(angle) * 1.04, Math.sin(angle) * 0.72, 0.42, level === 3 ? 0.58 : 0.46, materials, quality, index % 2 === 0);
  }
  if (level >= 2) {
    const floorSigil = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.7 + level * 0.08, 24), materials.cyanCrystal);
    floorSigil.rotation.x = -Math.PI / 2;
    floorSigil.position.y = 0.52;
    group.add(floorSigil);
  }
  if (level === 3) {
    const halo = new THREE.Mesh(new THREE.TorusGeometry(1.13, 0.035, 5, 36), materials.crystal);
    halo.position.y = 1.62;
    halo.rotation.z = 0.22;
    group.add(halo);
  }
  return group;
}

function createSkyArchive(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island2CelestialMaterials) {
  const group = new THREE.Group();
  group.name = `ISLAND_2_SKY_ARCHIVE_L${level}`;
  addPlinth(group, 1.4, materials, quality);
  // The funded archive remains physically present between upgrades. Larger
  // levels add annexes, shelves, and a clerestory instead of replacing the
  // whole hall with a differently sized box.
  const hallWidth = 1.38;
  const hallHeight = 0.82;
  const hallDepth = 0.96;
  const hall = box(hallWidth, hallHeight, hallDepth, materials.ivory);
  hall.position.y = 0.46 + hallHeight / 2;
  const backBand = box(hallWidth + 0.12, 0.11, hallDepth + 0.08, materials.gold);
  backBand.position.y = 0.46 + hallHeight - 0.1;
  group.add(hall, backBand);
  addArch(group, 0.62, 0.46, hallDepth / 2 + 0.08, materials);
  addArch(group, 0.62, 0.46, -hallDepth / 2 - 0.08, materials, Math.PI);
  const shelfRows = level === 1 ? 1 : level === 2 ? 2 : 3;
  [-1, 1].forEach((direction) => {
    for (let row = 0; row < shelfRows; row += 1) {
      const shelf = box(hallWidth * 0.72, 0.07, 0.16, materials.wood);
      shelf.position.set(0, 0.65 + row * 0.25, direction * (hallDepth / 2 + 0.09));
      group.add(shelf);
      const bookCount = quality === 'low' ? 4 : 7;
      for (let index = 0; index < bookCount; index += 1) {
        const book = box(0.1, 0.18 + (index % 2) * 0.04, 0.1, index % 3 === 0 ? materials.banner : materials.paper);
        book.position.set(-hallWidth * 0.29 + index * hallWidth * 0.095, 0.77 + row * 0.25, direction * (hallDepth / 2 + 0.1));
        group.add(book);
      }
    }
  });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(hallWidth * 0.62, 0.58, 4), materials.sapphire);
  roof.position.y = 0.46 + hallHeight + 0.21;
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = hallDepth / hallWidth;
  group.add(roof);
  if (level >= 2) {
    [-1, 1].forEach((side) => {
      const annex = box(0.42, 0.58, 0.72, materials.ivoryShade);
      annex.position.set(side * 0.9, 0.75, -0.04);
      const annexRoof = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.36, 4), materials.sapphireLight);
      annexRoof.position.set(side * 0.9, 1.18, -0.04);
      annexRoof.rotation.y = Math.PI / 4;
      annexRoof.scale.z = 0.82;
      group.add(annex, annexRoof);
    });
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.3, segmentsFor(quality), 10), materials.cyanCrystal);
    globe.position.set(-0.58, 0.72, hallDepth / 2 + 0.44);
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.025, 5, 20), materials.gold);
    orbit.position.copy(globe.position);
    orbit.rotation.x = 0.7;
    group.add(globe, orbit);
  }
  if (level === 3) {
    const clerestory = box(0.74, 0.34, 0.58, materials.ivory);
    clerestory.position.set(0, 1.43, 0);
    const clerestoryRoof = new THREE.Mesh(new THREE.ConeGeometry(0.49, 0.42, 4), materials.sapphireLight);
    clerestoryRoof.position.set(0, 1.78, 0);
    clerestoryRoof.rotation.y = Math.PI / 4;
    clerestoryRoof.scale.z = 0.78;
    group.add(clerestory, clerestoryRoof);
    [-1, 1].forEach((side) => addSpire(group, side * 0.92, -0.1, 0.42, 0.72, materials, quality, side > 0));
    const lectern = box(0.46, 0.5, 0.32, materials.wood);
    lectern.position.set(0.45, 0.72, hallDepth / 2 + 0.4);
    lectern.rotation.x = -0.18;
    const openBook = box(0.58, 0.045, 0.4, materials.paper);
    openBook.position.set(0.45, 1.0, hallDepth / 2 + 0.38);
    openBook.rotation.x = -0.18;
    group.add(lectern, openBook);
  }
  return group;
}

function createSolspirePalace(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island2CelestialMaterials) {
  const group = new THREE.Group();
  group.name = `ISLAND_2_SOLSPIRE_PALACE_L${level}`;
  // A construction transition must preserve funded masonry. All core palace
  // dimensions and materials are therefore stable; wings, outer towers, and
  // crown architecture are strictly additive upgrades.
  addPlinth(group, 1.9, materials, quality, 0.16);
  const baseY = 0.46;
  const hallWidth = 1.45;
  const hallDepth = 1.14;
  const hallHeight = 0.96;
  const hall = box(hallWidth, hallHeight, hallDepth, materials.ivory);
  hall.position.y = baseY + hallHeight / 2;
  const lowerBand = box(hallWidth + 0.14, 0.13, hallDepth + 0.14, materials.ivoryShade);
  lowerBand.position.y = baseY + 0.08;
  const crownBand = box(hallWidth + 0.12, 0.1, hallDepth + 0.12, materials.gold);
  crownBand.position.y = baseY + hallHeight - 0.08;
  group.add(hall, lowerBand, crownBand);

  // A broad sapphire roof is deliberately visible from the game camera. The
  // earlier flat white roof made the palace read like a civic block rather
  // than the celestial castle promised by the reference.
  const palaceRoof = new THREE.Mesh(
    new THREE.ConeGeometry(hallWidth * 0.62, 0.51, 4),
    materials.sapphire,
  );
  palaceRoof.position.y = baseY + hallHeight + 0.18;
  palaceRoof.rotation.y = Math.PI / 4;
  palaceRoof.scale.z = hallDepth / hallWidth;
  group.add(palaceRoof);

  const facadePilasters = 3;
  for (let index = 0; index < facadePilasters; index += 1) {
    const x = -hallWidth * 0.43 + index / Math.max(1, facadePilasters - 1) * hallWidth * 0.86;
    const pilaster = box(0.08, hallHeight * 0.82, 0.07, materials.gold);
    pilaster.position.set(x, baseY + hallHeight * 0.49, hallDepth / 2 + 0.055);
    const capital = box(0.16, 0.07, 0.11, materials.gold);
    capital.position.set(x, baseY + hallHeight * 0.9, hallDepth / 2 + 0.06);
    group.add(pilaster, capital);
  }
  const royalDoor = box(0.34, 0.58, 0.06, materials.sapphire);
  royalDoor.position.set(0, baseY + royalDoor.geometry.parameters.height / 2, hallDepth / 2 + 0.07);
  group.add(royalDoor);

  const windowRows = 1;
  for (let row = 0; row < windowRows; row += 1) {
    const count = 3;
    for (let index = 0; index < count; index += 1) {
      const x = -hallWidth * 0.36 + index / Math.max(1, count - 1) * hallWidth * 0.72;
      const window = box(0.13, 0.26, 0.045, materials.cyanCrystal);
      window.position.set(x, baseY + 0.38 + row * 0.38, hallDepth / 2 + 0.03);
      const lintel = box(0.2, 0.045, 0.06, materials.gold);
      lintel.position.set(x, window.position.y + 0.16, hallDepth / 2 + 0.035);
      group.add(window, lintel);
    }
  }

  const towerRadius = 0.45;
  const towerHeight = 0.78;
  const tower = cylinder(towerRadius, towerRadius + 0.07, towerHeight, materials.ivory, segmentsFor(quality));
  const hallTop = baseY + hallHeight;
  tower.position.y = hallTop + towerHeight / 2 - 0.04;
  group.add(tower);
  addWindowBand(group, towerRadius + 0.012, hallTop + towerHeight * 0.5, 4, materials, quality);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(towerRadius * 1.15, segmentsFor(quality), 10, 0, Math.PI * 2, 0, Math.PI / 2),
    materials.sapphire,
  );
  dome.position.y = hallTop + towerHeight - 0.05;
  dome.scale.y = 0.8;
  const domeRing = new THREE.Mesh(new THREE.TorusGeometry(towerRadius * 0.86, 0.045, 6, 28), materials.gold);
  domeRing.rotation.x = Math.PI / 2;
  domeRing.position.y = dome.position.y + 0.04;
  const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), materials.gold);
  lantern.position.y = dome.position.y + towerRadius * 0.88;
  lantern.scale.y = 1.75;
  group.add(dome, domeRing, lantern);

  if (level >= 2) {
    [-1, 1].forEach((side) => {
      const wing = box(0.74, hallHeight * 0.72, hallDepth * 0.82, materials.ivory);
      wing.position.set(side * (hallWidth / 2 + 0.32), baseY + hallHeight * 0.36, -0.06);
      const wingRoof = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.42, 4), side > 0 ? materials.sapphireLight : materials.sapphire);
      wingRoof.position.set(wing.position.x, baseY + hallHeight * 0.76, -0.06);
      wingRoof.rotation.y = Math.PI / 4;
      wingRoof.scale.z = 0.82;
      const wingWindow = box(0.15, 0.27, 0.045, materials.cyanCrystal);
      wingWindow.position.set(wing.position.x, baseY + hallHeight * 0.36, hallDepth * 0.42);
      group.add(wing, wingRoof, wingWindow);
    });
    const balcony = box(hallWidth * 0.72, 0.1, 0.42, materials.ivoryShade);
    balcony.position.set(0, baseY + hallHeight * 0.62, hallDepth / 2 + 0.18);
    group.add(balcony);
    const railY = balcony.position.y + 0.24;
    for (let index = -3; index <= 3; index += 1) {
      const post = box(0.038, 0.38, 0.038, materials.gold);
      post.position.set(index * hallWidth * 0.095, railY, hallDepth / 2 + 0.37);
      group.add(post);
    }
    const rail = box(hallWidth * 0.68, 0.04, 0.04, materials.gold);
    rail.position.set(0, railY + 0.18, hallDepth / 2 + 0.37);
    group.add(rail);

    // Second-phase façade work fills the spaces between the original three
    // pilasters without moving any of them.
    [-hallWidth * 0.215, hallWidth * 0.215].forEach((x) => {
      const pilaster = box(0.065, hallHeight * 0.72, 0.06, materials.gold);
      pilaster.position.set(x, baseY + hallHeight * 0.47, hallDepth / 2 + 0.06);
      group.add(pilaster);
    });
  }

  const fundedTowerPositions: Array<[number, number]> = [[-0.86, 0.2], [0.86, 0.2]];
  fundedTowerPositions.forEach(([x, z], index) => {
    addSpire(group, x, z, 0.42, 0.76, materials, quality, index % 2 === 0);
  });
  if (level >= 2) {
    const wingTowerPositions: Array<[number, number]> = [[-1.18, -0.56], [1.18, -0.56], [-1.18, 0.56], [1.18, 0.56]];
    wingTowerPositions.forEach(([x, z], index) => addSpire(group, x, z, 0.42, 0.76, materials, quality, index % 2 === 0));
  }
  if (level === 3) {
    const crownTowerPositions: Array<[number, number]> = [[-1.48, -0.72], [1.48, -0.72], [-1.48, 0.72], [1.48, 0.72], [-0.72, -1], [0.72, -1]];
    crownTowerPositions.forEach(([x, z], index) => addSpire(group, x, z, 0.42, 0.96, materials, quality, index % 2 === 0));
  }

  addStairs(group, 1, 0.86, materials, 1);
  addArch(group, 0.64, 0.44, hallDepth / 2 + 0.12, materials);
  if (level === 3) {
    const doorSurround = box(0.5, 0.78, 0.035, materials.gold);
    doorSurround.position.set(0, baseY + 0.39, hallDepth / 2 + 0.105);
    const glowingLantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), materials.warmGlow);
    glowingLantern.position.set(0, lantern.position.y + 0.05, 0);
    glowingLantern.scale.y = 1.8;
    group.add(doorSurround, glowingLantern);
    [-1, 1].forEach((side) => {
      const crownTower = cylinder(0.18, 0.22, 0.7, materials.ivory, segmentsFor(quality));
      crownTower.position.set(side * hallWidth * 0.34, hallTop + 0.34, 0);
      const crownRoof = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.55, segmentsFor(quality)), materials.sapphireLight);
      crownRoof.position.set(side * hallWidth * 0.34, hallTop + 0.95, 0);
      const crownFinial = new THREE.Mesh(new THREE.OctahedronGeometry(0.085), materials.gold);
      crownFinial.position.set(side * hallWidth * 0.34, hallTop + 1.3, 0);
      crownFinial.scale.y = 1.7;
      group.add(crownTower, crownRoof, crownFinial);
    });
    for (let index = 0; index < 4; index += 1) {
      const angle = index / 4 * Math.PI * 2;
      addBanner(group, Math.cos(angle) * 1.86, 0.75, Math.sin(angle) * 1.78, -angle, materials);
    }
  }
  return group;
}

export function buildIsland2CelestialLandmark(
  definition: Island5LandmarkDefinition,
  level: BuildLevel,
  quality: Island3DQuality,
  materials: Island2CelestialMaterials,
  options: IslandConstructionFactoryOptions = {},
) {
  const root = new THREE.Group();
  root.name = `ISLAND_2_CELESTIAL_${definition.id.toUpperCase()}_ROOT`;
  root.position.set(...definition.position);
  root.userData.sculptRuntime = { clickable: true, explodable: true, world: 'island-002-celestial' };
  if (level === 0) {
    addPlinth(root, definition.id === 'boss' ? 1.9 : 1.4, materials, quality, 0.1);
  } else {
    const resolved = level as 1 | 2 | 3;
    const building = definition.id === 'hatchery'
      ? createCelestialV2Cloudnest(resolved, quality, materials)
      : definition.id === 'habit'
        ? createCelestialV2ResolveCourt(resolved, quality, materials)
        : definition.id === 'wisdom'
          ? createCelestialV2Archive(resolved, quality, materials)
          : definition.id === 'event'
            ? createCelestialV2Gate(resolved, quality, materials)
            : createCelestialV2Palace(resolved, quality, materials);
    if (definition.id !== 'boss') building.rotation.y = Math.atan2(-definition.position[0], -definition.position[2]);
    // Construction continuity requires one stable object-space scale. Growth
    // comes from additive geometry, never from enlarging every funded mesh.
    const scale = definition.id === 'boss' ? 1.1 : 1.06;
    building.scale.setScalar(scale);
    // The fixed meadow is at .36. Authored stairs start at .12, so this
    // constant collar exposes their treads while burying the foundation.
    // Apply identically to every funded level and construction preview.
    building.position.y = .24;
    if (options.constructionPreview === 'target') {
      applyIslandConstructionAuthoring({
        root: building,
        worldSourceNumber: 2,
        landmarkId: definition.id,
        quality,
        includeTemporaryRig: true,
      });
    }
    // Keep normal board models batched. Preview current/target models retain
    // their semantic meshes so the delta matcher can preserve funded parts.
    if (!options.constructionPreview) {
      // Group by the final shadow state, rather than splitting identical surfaces.
      markShadows(building, quality !== 'low');
      batchCelestialPlantInstances(building);
      // Each mechanism owns one rigid rotating frame. Consolidate its surfaces
      // locally while the parent batch continues to exclude its moving subtree.
      const mechanisms: THREE.Group[] = [];
      building.traverse(node => { if (node instanceof THREE.Group && node.userData.celestialMotion) mechanisms.push(node); });
      for (const mechanism of mechanisms.reverse()) batchCelestialStatic(mechanism);
      batchCelestialStatic(building);
    }
    root.add(building);
  }
  root.traverse((child) => { child.userData.landmarkId = definition.id; });
  markShadows(root, quality !== 'low');
  return root;
}

function addFloatingShelf(root: THREE.Group, x: number, z: number, radius: number, depth: number, materials: Island2CelestialMaterials, quality: Island3DQuality, seed: number) {
  const shelf = createCelestialSkyRoot(radius, depth, seed, quality, materials);
  shelf.position.set(x, 0, z);
  root.add(shelf);
  return shelf;
}

function createCloudCluster(quality: Island3DQuality, materials: Island2CelestialMaterials, seed: number, scale = 1) {
  const group = new THREE.Group();
  const count = quality === 'high' ? 7 : quality === 'medium' ? 6 : 4;
  for (let index = 0; index < count; index += 1) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry((0.58 + index % 3 * 0.17) * scale, quality === 'low' ? 7 : 9, 6), materials.cloud);
    puff.scale.set(1.12, .88 + .12 * Math.sin(index), 1);
    const angle = index * 2.39996 + seed, reach = (.25 + index % 3 * .36) * scale;
    puff.position.set(Math.cos(angle) * reach, (.12 + Math.sin(index * 1.8 + seed) * .22) * scale, Math.sin(angle) * reach * .82);
    group.add(puff);
  }
  group.userData.phase = seed;
  return group;
}

function addLivingSpringCascade(
  root: THREE.Group,
  materials: Island2CelestialMaterials,
  quality: Island3DQuality,
) {
  const cascadeRoot = new THREE.Group();
  cascadeRoot.name = 'ISLAND_2_LIVING_SPRING_CASCADE';
  cascadeRoot.position.set(-0.2, 0, 5.12);
  cascadeRoot.rotation.y = Math.PI;

  const springPool = new THREE.Mesh(new THREE.CircleGeometry(0.68, segmentsFor(quality)), materials.water.clone());
  springPool.name = 'ISLAND_2_SKY_SPRING_POOL';
  springPool.rotation.x = -Math.PI / 2;
  springPool.scale.set(1.35, 1, 0.68);
  springPool.position.set(0, 0.465, 0.34);
  cascadeRoot.add(springPool);

  const poolRim = new THREE.Mesh(new THREE.TorusGeometry(0.69, 0.085, 6, segmentsFor(quality)), materials.ivoryShade);
  poolRim.rotation.x = Math.PI / 2;
  poolRim.scale.set(1.35, 1, 0.68);
  poolRim.position.copy(springPool.position);
  poolRim.position.y -= 0.018;
  cascadeRoot.add(poolRim);

  const runnel = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 1.05, 1, quality === 'high' ? 5 : 2), materials.water.clone());
  runnel.name = 'ISLAND_2_SPRING_RUNNEL';
  runnel.rotation.x = -Math.PI / 2;
  runnel.position.set(0, 0.476, -0.52);
  cascadeRoot.add(runnel);

  const ribbons: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshPhysicalMaterial>[] = [];
  const ribbonCount = quality === 'high' ? 3 : quality === 'medium' ? 2 : 1;
  for (let index = 0; index < ribbonCount; index += 1) {
    const width = index === 0 ? 0.48 : 0.16;
    const fallGeometry = new THREE.PlaneGeometry(width, 5.6 - index * 0.45, 1, quality === 'high' ? 8 : 3);
    const fallPositions = fallGeometry.getAttribute('position') as THREE.BufferAttribute;
    for (let vertexIndex = 0; vertexIndex < fallPositions.count; vertexIndex += 1) {
      const localY = fallPositions.getY(vertexIndex);
      const heightRatio = THREE.MathUtils.clamp(localY / (5.6 - index * 0.45) + 0.5, 0, 1);
      const naturalWidth = 0.7 + heightRatio * 0.3;
      fallPositions.setX(vertexIndex, fallPositions.getX(vertexIndex) * naturalWidth + Math.sin(localY * 2.4 + index) * 0.018);
    }
    fallPositions.needsUpdate = true;
    fallGeometry.computeVertexNormals();
    const fall = new THREE.Mesh(fallGeometry, materials.water.clone());
    fall.name = index === 0 ? 'ISLAND_2_PRINCIPAL_SKY_WATERFALL' : 'ISLAND_2_PRINCIPAL_SKY_WATERFALL_VEIL';
    fall.position.set((index - (ribbonCount - 1) / 2) * 0.23, -2.35 - index * 0.08, -1.02 - index * 0.012);
    fall.userData.phase = 4.2 + index * 0.78;
    cascadeRoot.add(fall);
    ribbons.push(fall);
  }

  const foamCount = quality === 'high' ? 10 : quality === 'medium' ? 7 : 4;
  for (let index = 0; index < foamCount; index += 1) {
    const foam = new THREE.Mesh(new THREE.SphereGeometry(0.09 + index % 3 * 0.025, quality === 'low' ? 5 : 7, 4), materials.cloud);
    foam.name = 'ISLAND_2_SPRING_FOAM';
    foam.scale.set(1.45, 0.42, 0.7);
    foam.position.set((index - foamCount / 2) * 0.14, 0.49 + Math.sin(index) * 0.025, -0.96 + Math.cos(index * 1.4) * 0.08);
    cascadeRoot.add(foam);
  }

  const fernCount = quality === 'high' ? 12 : quality === 'medium' ? 8 : 4;
  for (let index = 0; index < fernCount; index += 1) {
    const side = index % 2 ? -1 : 1;
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.1 + index % 3 * 0.018, 0.36 + index % 2 * 0.06, 5), index % 3 === 0 ? materials.grassLight : materials.grass);
    leaf.name = 'ISLAND_2_SPRING_GREENERY';
    leaf.position.set(side * (0.56 + index % 4 * 0.09), 0.63 + index % 2 * 0.03, -0.22 - Math.floor(index / 4) * 0.28);
    leaf.rotation.z = side * (0.55 + index % 3 * 0.08);
    leaf.rotation.y = index * 0.72;
    cascadeRoot.add(leaf);
  }

  root.add(cascadeRoot);
  return { root: cascadeRoot, springPool, runnel, ribbons };
}

function createCelestialAirship(materials: Island2CelestialMaterials, quality: Island3DQuality) {
  const airship = new THREE.Group();
  airship.name = 'ISLAND_2_CELESTIAL_AIRSHIP';

  const envelope = new THREE.Mesh(new THREE.SphereGeometry(1, segmentsFor(quality), quality === 'low' ? 8 : 12), materials.ivory);
  envelope.name = 'ISLAND_2_AIRSHIP_ENVELOPE';
  envelope.scale.set(1.85, 0.72, 0.72);
  envelope.position.y = 0.75;
  airship.add(envelope);
  const ribCount = quality === 'low' ? 6 : 10;
  for (let rib = 0; rib < ribCount; rib++) {
    const phi = rib / ribCount * Math.PI * 2;
    const points = Array.from({ length: 21 }, (_, i) => {
      const theta = i / 20 * Math.PI;
      return new THREE.Vector3(Math.cos(theta) * 1.855, .75 + Math.sin(theta) * .728 * Math.cos(phi), Math.sin(theta) * .728 * Math.sin(phi));
    });
    const seam = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 20, .009, 5, false), materials.gold);
    seam.name = 'CELESTIAL_AIRSHIP_LONGITUDINAL_RIB'; airship.add(seam);
  }


  const sapphireBand = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.055, 5, segmentsFor(quality)), materials.sapphire);
  sapphireBand.rotation.y = Math.PI / 2;
  sapphireBand.position.y = 0.75;
  sapphireBand.scale.x = 0.96;
  airship.add(sapphireBand);

  const keel = box(1.32, 0.28, 0.42, materials.wood);
  keel.name = 'ISLAND_2_AIRSHIP_GONDOLA';
  keel.position.y = -0.18;
  airship.add(keel);
  for (const side of [-1, 1]) for (let i = 0; i < 5; i++) {
    const cabinWindow = box(.13, .12, .018, materials.sapphire);
    cabinWindow.position.set((i - 2) * .22, -.14, side * .218); airship.add(cabinWindow);
    const sill = box(.15, .015, .025, materials.gold);
    sill.position.set((i - 2) * .22, -.215, side * .22); airship.add(sill);
  }

  const prow = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.58, 6), materials.gold);
  prow.rotation.z = -Math.PI / 2;
  prow.position.set(0.94, -0.13, 0);
  airship.add(prow);

  [-1, 1].forEach((side) => {
    const strut = cylinder(0.025, 0.035, 0.75, materials.gold, 6);
    strut.position.set(side * 0.48, 0.2, 0);
    airship.add(strut);
  });

  const propellers: THREE.Group[] = [];
  [-1, 1].forEach((side) => {
    const propeller = new THREE.Group();
    propeller.name = 'ISLAND_2_AIRSHIP_PROPELLER';
    propeller.position.set(-0.42, -0.14, side * 0.38);
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.07, 7, 5), materials.gold);
    propeller.add(hub);
    const bladeCount = quality === 'low' ? 2 : 4;
    for (let index = 0; index < bladeCount; index += 1) {
      const blade = box(0.055, 0.42, 0.025, materials.sapphireLight);
      blade.position.y = 0.16;
      blade.rotation.z = index / bladeCount * Math.PI * 2;
      propeller.add(blade);
    }
    propeller.rotation.y = Math.PI / 2;
    airship.add(propeller);
    propellers.push(propeller);
  });

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.65, 4), materials.sapphire);
  tail.position.set(-1.62, 0.72, 0);
  tail.rotation.z = Math.PI / 2;
  tail.rotation.y = Math.PI / 4;
  airship.add(tail);

  if (quality !== 'low') {
    const lanternCount = quality === 'high' ? 4 : 2;
    for (let index = 0; index < lanternCount; index += 1) {
      const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), materials.warmGlow);
      lantern.position.set(-0.48 + index * (0.96 / Math.max(1, lanternCount - 1)), -0.38, index % 2 ? -0.18 : 0.18);
      airship.add(lantern);
    }
  }

  airship.scale.setScalar(quality === 'high' ? 0.68 : quality === 'medium' ? 0.6 : 0.52);
  return { root: airship, propellers };
}

function createDistantSkyIslet(
  index: number,
  quality: Island3DQuality,
  materials: Island2CelestialMaterials,
) {
  const group = new THREE.Group();
  group.name = `ISLAND_2_DISTANT_FLOATING_ISLET_${index + 1}`;
  const archetype = index % 6;
  const radius = [0.72, 1.05, 0.84, 1.22, 0.62, 0.94][archetype];
  const depth = [1.42, 2.2, 1.74, 2.55, 1.18, 1.92][archetype];
  const segmentCount = segmentsFor(quality);
  group.add(createCelestialSkyRoot(radius, depth, index + .8, quality, materials, .06));

  if (archetype === 0) {
    addSpire(group, 0, 0, 0.05, 0.48, materials, quality, true);
  } else if (archetype === 1) {
    addConifer(group, -0.28, 0.08, 0.66, materials, quality, .06);
    addConifer(group, 0.32, -0.18, 0.52, materials, quality, .06);
    if (quality === 'high') addConifer(group, 0.05, 0.34, 0.46, materials, quality, .06);
  } else if (archetype === 2) {
    const observatory = new THREE.Mesh(new THREE.SphereGeometry(0.34, segmentCount, 7, 0, Math.PI * 2, 0, Math.PI / 2), materials.sapphireLight);
    observatory.position.y = 0.18;
    const lens = new THREE.Mesh(new THREE.OctahedronGeometry(0.11), materials.cyanCrystal);
    lens.position.set(0, 0.54, 0);
    group.add(observatory, lens);
  } else if (archetype === 3) {
    const ruins = quality === 'low' ? 2 : 4;
    for (let pillarIndex = 0; pillarIndex < ruins; pillarIndex += 1) {
      const angle = pillarIndex / ruins * Math.PI * 2;
      addColumn(group, Math.cos(angle) * 0.52, Math.sin(angle) * 0.52, 0.62 + pillarIndex % 2 * 0.2, materials, quality);
    }
  } else if (archetype === 4) {
    const beacon = cylinder(0.18, 0.24, 0.66, materials.ivory, segmentCount);
    beacon.position.y = 0.38;
    const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), materials.warmGlow);
    flame.position.y = 0.84;
    group.add(beacon, flame);
  } else {
    const archLeft = box(0.13, 0.76, 0.15, materials.ivory);
    const archRight = archLeft.clone();
    archLeft.position.set(-0.32, 0.4, 0);
    archRight.position.set(0.32, 0.4, 0);
    const archTop = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.055, 5, 14, Math.PI), materials.gold);
    archTop.position.y = 0.72;
    archTop.rotation.z = Math.PI;
    group.add(archLeft, archRight, archTop);
  }

  if (archetype % 2 === 0) addCelestialV2Gardens(group, { role: 'distant', radius, depth, seed: index + .8, topY: .06 }, quality, materials);
  return group;
}

function addConifer(root: THREE.Group, x: number, z: number, scale: number, materials: Island2CelestialMaterials, _quality: Island3DQuality, baseY = .36) {
  const tree = createCelestialTree({ kind: 'windswept', seed: Math.round((x + 3) * 719 + (z + 3) * 251), height: scale, spread: scale * .61 }, 'low', materials);
  tree.position.set(x, baseY, z); tree.rotation.y = x + z; root.add(tree);
}

function addSkyFountain(
  root: THREE.Group,
  x: number,
  z: number,
  scale: number,
  materials: Island2CelestialMaterials,
  quality: Island3DQuality,
) {
  const basin = cylinder(0.42 * scale, 0.5 * scale, 0.18 * scale, materials.ivoryShade, segmentsFor(quality));
  basin.position.set(x, 0.52, z);
  const water = cylinder(0.34 * scale, 0.34 * scale, 0.035 * scale, materials.water, segmentsFor(quality));
  water.position.set(x, 0.63, z);
  const stem = cylinder(0.055 * scale, 0.08 * scale, 0.5 * scale, materials.gold, 8);
  stem.position.set(x, 0.86, z);
  const crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.12 * scale), materials.cyanCrystal);
  crown.position.set(x, 1.18, z);
  crown.scale.y = 1.45;
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.025 * scale, 0.045 * scale, 0.54 * scale, 7, 1, true), materials.water);
  jet.name = 'ISLAND_2_FOUNTAIN_JET';
  jet.position.set(x, 1.45, z);
  jet.userData.baseY = jet.position.y;
  jet.userData.phase = Math.abs(x * 0.7 + z * 0.9);
  root.add(basin, water, stem, crown, jet);
  return jet;
}

function createCelestialOwl(materials: Island2CelestialMaterials, quality: Island3DQuality, phase: number) {
  const owl = new THREE.Group();
  owl.name = 'ISLAND_2_CELESTIAL_OWL';
  owl.scale.setScalar(.62);
  owl.userData.phase = phase;
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.19, segmentsFor(quality), 9), materials.ivory);
  body.scale.set(0.86, 1.18, 0.82);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, segmentsFor(quality), 8), materials.ivory);
  head.position.y = 0.24;
  const brow = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.19, 4), materials.sapphireLight);
  brow.position.set(0, 0.4, -0.01);
  brow.rotation.y = Math.PI / 4;
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.11, 5), materials.gold);
  beak.position.set(0, 0.23, 0.15);
  beak.rotation.x = Math.PI / 2;
  owl.add(body, head, brow, beak);
  [-1, 1].forEach((side) => {
    const wingPivot = new THREE.Group();
    wingPivot.name = side < 0 ? 'leftWing' : 'rightWing';
    wingPivot.position.set(side * 0.14, 0.06, 0);
    const wing = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.46, quality === 'low' ? 5 : 7), materials.sapphire);
    wing.position.x = side * 0.19;
    wing.rotation.z = side * Math.PI / 2;
    wing.scale.z = 0.42;
    wingPivot.add(wing);
    owl.add(wingPivot);
    if (quality !== 'low') {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.027, 6, 4), materials.crystal);
      eye.position.set(side * 0.06, 0.28, 0.14);
      owl.add(eye);
    }
  });
  return owl;
}

function addFormalSkyGarden(
  root: THREE.Group,
  materials: Island2CelestialMaterials,
  quality: Island3DQuality,
) {
  const hedgeCount = quality === 'high' ? 24 : quality === 'medium' ? 16 : 8;
  const hedgeGeometry = new THREE.BoxGeometry(0.48, 0.23, 0.16);
  const hedges = new THREE.InstancedMesh(hedgeGeometry, materials.grassLight, hedgeCount);
  hedges.name = 'ISLAND_2_FORMAL_HEDGE_PARTERRE';
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3(1, 1, 1);
  for (let index = 0; index < hedgeCount; index += 1) {
    const quadrantIndex = index % 6;
    const quadrant = Math.floor(index / 6);
    const angle = quadrant * Math.PI / 2 + (-0.46 + quadrantIndex * 0.184);
    const radius = index % 2 ? 4.48 : 5.18;
    position.set(Math.cos(angle) * radius, 0.58, Math.sin(angle) * radius);
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angle);
    matrix.compose(position, quaternion, scale);
    hedges.setMatrixAt(index, matrix);
  }
  hedges.instanceMatrix.needsUpdate = true;
  root.add(hedges);
}

export function createIsland2CelestialLivingAmbience(
  scene: THREE.Scene,
  profile: Island3DQualityProfile,
  materials: Island2CelestialMaterials,
  ocean: THREE.Mesh,
): Island2CelestialAmbienceRuntime {
  const root = new THREE.Group();
  root.name = 'ISLAND_2_CELESTIAL_LIVING_AMBIENCE';
  root.userData.sculptRuntime = { clickable: true, explodable: true, world: 'island-002-celestial' };
  const quality = profile.id;
  const detail = detailFor(quality);
  ocean.visible = false;
  // An inexpensive atmospheric sky stays coherent above and below the island.
  // Directional cloud noise avoids stretching a photographic horizon underfoot.
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(120, 36, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
    uniforms: {
      zenith: { value: new THREE.Color(0x75b3e8) },
      horizon: { value: new THREE.Color(0xd4e8ee) },
      cloudTint: { value: new THREE.Color(0xf2f4ec) },
    },
    vertexShader: `varying vec3 skyDirection;
      void main() { skyDirection = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `varying vec3 skyDirection;
      uniform vec3 zenith; uniform vec3 horizon; uniform vec3 cloudTint;
      float hash(vec3 p) { p = fract(p * .3183099 + vec3(.1,.2,.3)); p *= 17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float noise3(vec3 p) {
        vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }
      void main() {
        vec3 d=normalize(skyDirection);
        vec3 color=mix(horizon,zenith,smoothstep(-1.,.35,d.y));
        vec3 p=d*6. + vec3(2.3,1.7,4.2);
        float cloud=noise3(p)*.57+noise3(p*2.03)*.28+noise3(p*4.09)*.15;
        float coverage=smoothstep(.48,.72,cloud)*(1.-smoothstep(.05,.8,d.y))*.64;
        gl_FragColor=vec4(mix(color,cloudTint,coverage),1.);
        #include <colorspace_fragment>
      }`,
  }));
  skyDome.name = 'ISLAND_2_CELESTIAL_SKY_DOME';
  skyDome.renderOrder = -100;
  root.add(skyDome);

  const mainShelf = addFloatingShelf(root, 0, 0, 6.18, 9.2, materials, quality, 0.3);
  addCelestialV2Gardens(mainShelf, { role: 'main', radius: 6.18, depth: 9.2, seed: .3, landmarkClearings: [{ x: 4.36, z: 3.9, radius: CELESTIAL_GATE_FOOTPRINT_RADIUS * 1.06 + .085 }] }, quality, materials);
  addCelestialV2Waterways(mainShelf, { role: 'main', radius: 6.18, depth: 9.2, seed: .3 }, quality, materials);
  const satellites: Array<[number, number]> = [[-4.36, -3.9], [4.36, -3.9], [-4.36, 3.9], [4.36, 3.9]];
  const satelliteProfiles = [
    { radius: 2.5, depth: 5.3 },
    { radius: 2.32, depth: 4.7 },
    { radius: 2.46, depth: 5.5 },
    { radius: 2.27, depth: 4.9 },
  ];
  const satelliteShelves: THREE.Group[] = [];
  satellites.forEach(([x, z], index) => {
    const satellite = satelliteProfiles[index];
    const shelf = addFloatingShelf(root, x, z, satellite.radius, satellite.depth, materials, quality, index + 1.2);
    shelf.name = `ISLAND_2_REDOCKING_PLATFORM_${index + 1}`;
    shelf.userData.redockingBaseX = x;
    shelf.userData.redockingBaseZ = z;
    satelliteShelves.push(shelf);
    const plot = { role: 'district' as const, ...satellite, seed: index + 1.2, outward: Math.atan2(z, x), clearingRadius: index === 3 ? CELESTIAL_GATE_FOOTPRINT_RADIUS * 1.06 + .085 : undefined };
    addCelestialV2Gardens(shelf, plot, quality, materials);
    addCelestialV2Waterways(shelf, plot, quality, materials);
  });

  const dockingBridges = satellites.map(([x, z], index) => {
    const length = Math.hypot(x, z), bridge = createCelestialDockingBridge(materials, quality);
    bridge.root.name = `CELESTIAL_V2_DOCKING_SKYBRIDGE_${index + 1}`;
    bridge.root.position.set(x / length * 3.9, 0, z / length * 3.9);
    bridge.root.rotation.y = Math.atan2(x, z);
    bridge.setLength(length + CELESTIAL_REDOCKING_START_OFFSET - 1.84 - 3.9);
    root.add(bridge.root); return bridge;
  });

  const redockingLandmarks = new Map<Island5LandmarkDefinition['id'], THREE.Object3D>();
  const landmarkMechanisms: Array<{ node: THREE.Object3D; base: THREE.Quaternion; axis: THREE.Vector3; speed: number }> = [];
  const mechanismRotation = new THREE.Quaternion();
  const presentationClocks = new Set<{ value: number }>();
  const collectPresentationClocks = (owner: THREE.Object3D) => owner.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    const surfaces = Array.isArray(node.material) ? node.material : [node.material];
    for (const surface of surfaces) {
      if (surface instanceof THREE.ShaderMaterial && surface.userData.celestialClock
        && Number.isFinite(surface.uniforms.time?.value)) presentationClocks.add(surface.uniforms.time);
    }
  });
  const targetPlatformOffsets = new Array(CELESTIAL_REDOCKING_PLATFORM_IDS.length)
    .fill(CELESTIAL_REDOCKING_START_OFFSET);
  const currentPlatformOffsets = [...targetPlatformOffsets];
  const collarMaterials: THREE.MeshStandardMaterial[] = [];
  const dockingCollars = satellites.map(([x, z], index) => {
    const material = new THREE.MeshStandardMaterial({
      color: 0xe9c35e,
      emissive: 0x7ccfff,
      emissiveIntensity: 0.18,
      roughness: 0.3,
      metalness: 0.72,
      transparent: true,
      opacity: 0.28,
    });
    const collar = new THREE.Mesh(new THREE.TorusGeometry(1.46, 0.07, 6, 32), material);
    collar.name = `ISLAND_2_DOCKING_COLLAR_${index + 1}`;
    collar.position.set(x, 0.46, z);
    collar.rotation.x = Math.PI / 2;
    root.add(collar);
    collarMaterials.push(material);
    return collar;
  });
  const tetherRuntimes = satellites.map((_, index) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9 * 3), 3));
    const material = new THREE.LineBasicMaterial({
      color: index % 2 === 0 ? 0x6fd9ff : 0xe9c35e,
      transparent: true,
      opacity: 0.68,
    });
    const line = new THREE.Line(geometry, material);
    line.name = `ISLAND_2_REDOCKING_TETHER_${index + 1}`;
    line.frustumCulled = false;
    root.add(line);
    return { geometry, material, line };
  });
  let redockingDockedPlatformCount = 0;
  let redockingPulseIndex = -1;
  let redockingPulse = 0;
  let lastAnimationElapsed: number | null = null;
  let dockingShadowsDirty = true;

  const applyDockingCollarPose = (index: number) => {
    const isDocked = index < redockingDockedPlatformCount;
    const pulse = index === redockingPulseIndex ? redockingPulse : 0;
    collarMaterials[index].opacity = (isDocked ? 0.82 : 0.25) + pulse * 0.18;
    collarMaterials[index].emissiveIntensity = (isDocked ? 0.72 : 0.16) + pulse * 2.2;
    dockingCollars[index].scale.setScalar(1 + pulse * 0.12);
    tetherRuntimes[index].material.opacity = isDocked ? 0.88 : 0.52;
  };

  const applyRedockingPlatformPose = (index: number) => {
    const [baseX, baseZ] = satellites[index];
    const length = Math.hypot(baseX, baseZ) || 1;
    const directionX = baseX / length;
    const directionZ = baseZ / length;
    const offset = currentPlatformOffsets[index];
    dockingBridges[index].setLength(length + offset - 1.84 - 3.9);
    const x = baseX + directionX * offset;
    const z = baseZ + directionZ * offset;
    if (Math.abs(satelliteShelves[index].position.x - x) > 0.00001
      || Math.abs(satelliteShelves[index].position.z - z) > 0.00001) dockingShadowsDirty = true;
    satelliteShelves[index].position.set(x, 0, z);
    const landmarkId = CELESTIAL_REDOCKING_PLATFORM_IDS[index];
    const landmark = redockingLandmarks.get(landmarkId);
    if (landmark) {
      const landmarkBaseX = Number(landmark.userData.redockingBaseX ?? landmark.position.x);
      const landmarkBaseZ = Number(landmark.userData.redockingBaseZ ?? landmark.position.z);
      landmark.position.set(landmarkBaseX + directionX * offset, landmark.position.y, landmarkBaseZ + directionZ * offset);
    }
    const tetherAttribute = tetherRuntimes[index].geometry.getAttribute('position') as THREE.BufferAttribute;
    const innerX = directionX * 4.82;
    const innerZ = directionZ * 4.82;
    const outerX = x - directionX * 1.56;
    const outerZ = z - directionZ * 1.56;
    for (let pointIndex = 0; pointIndex < 9; pointIndex += 1) {
      const progress = pointIndex / 8;
      const sag = Math.sin(progress * Math.PI) * (0.34 + offset * 0.1);
      tetherAttribute.setXYZ(
        pointIndex,
        THREE.MathUtils.lerp(innerX, outerX, progress),
        THREE.MathUtils.lerp(0.42, 0.34, progress) - sag,
        THREE.MathUtils.lerp(innerZ, outerZ, progress),
      );
    }
    tetherAttribute.needsUpdate = true;
  };


  const clouds: THREE.Group[] = [];
  const cloudCount = quality === 'high' ? 18 : quality === 'medium' ? 12 : 7;
  for (let index = 0; index < cloudCount; index += 1) {
    const angle = index / cloudCount * Math.PI * 2 + 0.18;
    const radius = 8.2 + (index % 3) * 1.35;
    const cloud = createCloudCluster(quality, materials, index * 1.17, 0.82 + index % 2 * 0.18);
    cloud.name = 'ISLAND_2_CLOUD_FLOOR_CLUSTER';
    cloud.position.set(Math.cos(angle) * radius, -6.3 - (index % 3) * .9, Math.sin(angle) * radius);
    cloud.userData.baseY = cloud.position.y;
    cloud.userData.orbitRadius = radius;
    cloud.userData.startAngle = angle;
    cloud.userData.driftSpeed = 0.008 + index % 4 * 0.0015;
    cloud.userData.isDistant = false;
    root.add(cloud);
    clouds.push(cloud);
  }
  const distantCloudCount = quality === 'high' ? 8 : quality === 'medium' ? 6 : 4;
  for (let index = 0; index < distantCloudCount; index += 1) {
    const angle = index / distantCloudCount * Math.PI * 2 + 0.44;
    const cloud = createCloudCluster(quality, materials, 20 + index, 1.7);
    cloud.name = 'ISLAND_2_DISTANT_ELEVATED_CLOUD';
    cloud.position.set(Math.cos(angle) * (76 + index % 2 * 8), 14 + index % 3 * 4, Math.sin(angle) * (76 + index % 2 * 8));
    cloud.userData.baseY = cloud.position.y;
    cloud.userData.orbitRadius = 76 + index % 2 * 8;
    cloud.userData.startAngle = angle;
    cloud.userData.driftSpeed = 0.0022 + index % 3 * 0.00045;
    cloud.userData.isDistant = true;
    root.add(cloud);
    clouds.push(cloud);
  }

  const owls: THREE.Group[] = [];
  const owlCount = quality === 'high' ? 5 : quality === 'medium' ? 3 : 1;
  for (let index = 0; index < owlCount; index += 1) {
    const owl = createCelestialOwl(materials, quality, index / owlCount * Math.PI * 2);
    root.add(owl);
    owls.push(owl);
  }

  const petalCount = quality === 'high' ? 72 : quality === 'medium' ? 38 : 16;
  const petalPositions = new Float32Array(petalCount * 3);
  for (let index = 0; index < petalCount; index += 1) {
    const angle = index * 2.39996;
    const radius = 4.3 + (index % 19) / 19 * 1.7;
    petalPositions[index * 3] = Math.cos(angle) * radius;
    petalPositions[index * 3 + 1] = 0.72 + (index % 13) / 13 * 2.2;
    petalPositions[index * 3 + 2] = Math.sin(angle) * radius;
  }
  const petalGeometry = new THREE.BufferGeometry();
  petalGeometry.setAttribute('position', new THREE.BufferAttribute(petalPositions, 3));
  const petalMaterial = new THREE.PointsMaterial({ color: 0xffc6e2, size: quality === 'low' ? 0.065 : 0.052, transparent: true, opacity: 0.72, depthWrite: false });
  const petals = new THREE.Points(petalGeometry, petalMaterial);
  petals.name = 'ISLAND_2_DRIFTING_GARDEN_PETALS';
  root.add(petals);

  const islets: THREE.Group[] = [];
  const isletCount = quality === 'high' ? 7 : quality === 'medium' ? 5 : 3;
  for (let index = 0; index < isletCount; index += 1) {
    const angle = index / isletCount * Math.PI * 2 + 0.42;
    const group = createDistantSkyIslet(index, quality, materials);
    const horizonRadius = 10.7 + index % 4 * 1.9;
    group.position.set(Math.cos(angle) * horizonRadius, 2.8 + (index * 1.35) % 4.6, Math.sin(angle) * horizonRadius);
    group.scale.setScalar(0.72 + index % 3 * 0.08);
    group.userData.baseY = group.position.y;
    group.userData.phase = index * 1.4;
    group.userData.baseRotation = (index - 3) * 0.11;
    group.rotation.y = group.userData.baseRotation;
    root.add(group);
    islets.push(group);
  }

  const airshipRuntime = createCelestialAirship(materials, quality);
  airshipRuntime.root.userData.phase = 1.1;
  root.add(airshipRuntime.root);

  const birds: THREE.Group[] = [];
  const birdCount = quality === 'high' ? 8 : quality === 'medium' ? 5 : 2;
  for (let index = 0; index < birdCount; index += 1) {
    const bird = new THREE.Group();
    bird.name = 'ISLAND_2_SKY_BIRD';
    [-1, 1].forEach((side) => {
      const wing = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.34, 3), materials.ivory);
      wing.position.x = side * 0.14;
      wing.rotation.z = side * Math.PI / 2;
      bird.add(wing);
    });
    bird.userData.phase = index / birdCount * Math.PI * 2;
    root.add(bird);
    birds.push(bird);
  }

  markShadows(root, quality !== 'low');
  if (skyDome) { skyDome.castShadow = false; skyDome.receiveShadow = false; }
  for (const cloud of clouds) {
    cloud.traverse(object => { if (object instanceof THREE.Mesh) object.castShadow = false; });
    batchCelestialStatic(cloud);
  }
  for (const shelf of satelliteShelves) { batchCelestialPlantInstances(shelf); batchCelestialStatic(shelf); }
  for (const islet of islets) { batchCelestialPlantInstances(islet); batchCelestialStatic(islet); }
  for (const propeller of airshipRuntime.propellers) batchCelestialStatic(propeller);
  batchCelestialStatic(airshipRuntime.root, airshipRuntime.propellers);
  batchCelestialPlantInstances(root, [...satelliteShelves, ...islets]);
  batchCelestialStatic(root, [
    ...clouds, ...satelliteShelves, ...islets,
    ...owls, ...birds, ...dockingCollars, ...tetherRuntimes.map(tether => tether.line),
    airshipRuntime.root,
  ]);
  collectPresentationClocks(root);
  scene.add(root);
  const faunaPosition = new THREE.Vector3();
  const fauna = [...owls, ...birds];
  return {
    root,
    updateView: cameraPosition => {
      // Keep fly-bys out of the near-camera volume during landmark close-ups.
      for (const animal of fauna) {
        animal.getWorldPosition(faunaPosition);
        animal.visible = faunaPosition.distanceToSquared(cameraPosition) > 9;
      }
    },
    consumeShadowUpdate: () => {
      const dirty = dockingShadowsDirty;
      dockingShadowsDirty = false;
      return dirty;
    },
    registerRedockingLandmark: (landmarkId, landmarkRoot) => {
      collectPresentationClocks(landmarkRoot);
      landmarkRoot.traverse(node => {
        const spin = node.userData.celestialSpin as { axis?: string; speed?: number } | undefined;
        if (!spin || !node.userData.celestialMotion || !Number.isFinite(spin.speed)) return;
        landmarkMechanisms.push({ node, base: node.quaternion.clone(),
          axis: spin.axis === 'z' ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0),
          speed: THREE.MathUtils.clamp(spin.speed!, -2, 2) });
      });
      const platformIndex = CELESTIAL_REDOCKING_PLATFORM_IDS.indexOf(
        landmarkId as typeof CELESTIAL_REDOCKING_PLATFORM_IDS[number],
      );
      if (platformIndex < 0) return;
      landmarkRoot.userData.redockingBaseX = landmarkRoot.position.x;
      landmarkRoot.userData.redockingBaseZ = landmarkRoot.position.z;
      redockingLandmarks.set(landmarkId, landmarkRoot);
      applyRedockingPlatformPose(platformIndex);
    },
    updateRedocking: (presentation, immediate = false) => {
      const completedRolls = THREE.MathUtils.clamp(
        Math.floor(presentation.completedRolls),
        0,
        Math.max(1, Math.floor(presentation.targetRolls)),
      );
      CELESTIAL_REDOCKING_PLATFORM_IDS.forEach((_, index) => {
        const platformProgress = THREE.MathUtils.clamp(
          (completedRolls - index * CELESTIAL_REDOCKING_ROLLS_PER_PLATFORM)
            / CELESTIAL_REDOCKING_ROLLS_PER_PLATFORM,
          0,
          1,
        );
        targetPlatformOffsets[index] = CELESTIAL_REDOCKING_START_OFFSET * (1 - platformProgress);
        if (immediate) currentPlatformOffsets[index] = targetPlatformOffsets[index];
      });
      const dockedPlatformCount = THREE.MathUtils.clamp(
        Math.floor(presentation.dockedPlatformCount),
        0,
        CELESTIAL_REDOCKING_PLATFORM_IDS.length,
      );
      if (!immediate && dockedPlatformCount > redockingDockedPlatformCount) {
        redockingPulseIndex = dockedPlatformCount - 1;
        redockingPulse = 1;
      }
      if (dockedPlatformCount < redockingDockedPlatformCount || immediate) {
        redockingPulse = 0;
        redockingPulseIndex = -1;
      }
      redockingDockedPlatformCount = dockedPlatformCount;
      if (immediate) {
        CELESTIAL_REDOCKING_PLATFORM_IDS.forEach((_, index) => {
          applyRedockingPlatformPose(index);
          applyDockingCollarPose(index);
        });
      }
    },
    animate: (elapsed) => {
      const delta = lastAnimationElapsed === null ? 0 : THREE.MathUtils.clamp(elapsed - lastAnimationElapsed, 0, 0.1);
      lastAnimationElapsed = elapsed;
      presentationClocks.forEach(clock => { clock.value = elapsed; });
      const dockingEase = 1 - Math.exp(-4 * delta);
      CELESTIAL_REDOCKING_PLATFORM_IDS.forEach((_, index) => {
        currentPlatformOffsets[index] = THREE.MathUtils.lerp(
          currentPlatformOffsets[index],
          targetPlatformOffsets[index],
          dockingEase,
        );
        if (Math.abs(currentPlatformOffsets[index] - targetPlatformOffsets[index]) < 0.003) {
          currentPlatformOffsets[index] = targetPlatformOffsets[index];
        }
        applyRedockingPlatformPose(index);
        applyDockingCollarPose(index);
      });
      landmarkMechanisms.forEach(({ node, base, axis, speed }) => {
        node.quaternion.copy(base).multiply(mechanismRotation.setFromAxisAngle(axis, elapsed * speed));
      });
      redockingPulse = Math.max(0, redockingPulse - delta / 1.2);
      if (redockingPulse <= 0) redockingPulseIndex = -1;
      clouds.forEach((cloud, index) => {
        const driftAngle = cloud.userData.startAngle + elapsed * cloud.userData.driftSpeed;
        const laneRadius = cloud.userData.orbitRadius + Math.sin(elapsed * 0.025 + index) * (cloud.userData.isDistant ? 1.8 : 0.24);
        cloud.position.x = Math.cos(driftAngle) * laneRadius;
        cloud.position.z = Math.sin(driftAngle) * laneRadius;
        cloud.position.y = cloud.userData.baseY + Math.sin(elapsed * (cloud.userData.isDistant ? 0.045 : 0.075) + index) * (cloud.userData.isDistant ? 0.26 : 0.1);
        cloud.rotation.y = -driftAngle * 0.18 + Math.sin(elapsed * 0.018 + index) * 0.04;
      });
      islets.forEach((islet, index) => {
        islet.position.y = islet.userData.baseY + Math.sin(elapsed * 0.22 + islet.userData.phase) * 0.12;
        islet.rotation.y = islet.userData.baseRotation + Math.sin(elapsed * 0.08 + index) * 0.025;
      });
      const airshipTravel = (elapsed * 0.46 + airshipRuntime.root.userData.phase * 3.7) % 16;
      airshipRuntime.root.position.set(
        -8 + airshipTravel,
        8.35 + Math.sin(elapsed * 0.18) * 0.18,
        -7.5,
      );
      airshipRuntime.root.rotation.y = 0;
      airshipRuntime.root.rotation.z = Math.sin(elapsed * 0.22) * 0.025;
      airshipRuntime.propellers.forEach((propeller, index) => {
        propeller.rotation.y = Math.PI / 2;
        propeller.rotation.z = elapsed * (index % 2 ? -8.2 : 8.2);
      });
      birds.forEach((bird, index) => {
        const angle = elapsed * (0.08 + index * 0.006) + bird.userData.phase;
        const radius = 10.5 + index % 3 * 1.4;
        bird.position.set(Math.cos(angle) * radius, 4.2 + index % 3 * 0.65 + Math.sin(angle * 2) * 0.2, Math.sin(angle) * radius);
        bird.rotation.y = -angle;
        bird.children.forEach((child, childIndex) => { child.rotation.y = Math.sin(elapsed * 4.5 + index) * 0.35 * (childIndex ? -1 : 1); });
      });
      owls.forEach((owl, index) => {
        const angle = elapsed * (0.12 + index * 0.008) + owl.userData.phase;
        const radius = 7.1 + index % 2 * 0.7;
        owl.position.set(Math.cos(angle) * radius, 3.05 + index % 3 * 0.42 + Math.sin(angle * 2.2) * 0.18, Math.sin(angle) * radius);
        owl.rotation.y = -angle + Math.PI / 2;
        const flap = Math.sin(elapsed * 5.2 + index) * 0.42;
        const leftWing = owl.getObjectByName('leftWing');
        const rightWing = owl.getObjectByName('rightWing');
        if (leftWing) leftWing.rotation.z = flap;
        if (rightWing) rightWing.rotation.z = -flap;
      });
      const petalAttribute = petalGeometry.getAttribute('position') as THREE.BufferAttribute;
      for (let index = 0; index < petalCount; index += 1) {
        const y = 0.68 + ((elapsed * (0.1 + index % 3 * 0.015) + index * 0.137) % 2.42);
        petalAttribute.setY(index, y);
        petalAttribute.setX(index, Math.cos(index * 2.399) * (4.65 + index % 4 * 0.17) + Math.sin(elapsed * 0.5 + index) * 0.04);
      }
      petalAttribute.needsUpdate = true;
    },
  };
}
