import * as THREE from 'three';
import type {
  Island3DQuality,
  Island3DQualityProfile,
  Island5LandmarkDefinition,
} from './island5ThreePilotContract';
import { compactStaticGeometry } from './CrownCitadelThreeModel';

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
}

export interface Island2CelestialAmbienceRuntime {
  root: THREE.Group;
  animate: (elapsed: number) => void;
  updateView?: (cameraPosition: THREE.Vector3) => void;
}

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
      child.castShadow = enabled;
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
        value = mortar ? 185 : 242 + Math.round(noise * 0.1);
      } else if (pattern === 'roof') {
        const seam = (x + y) % 19 < 2 || (x - y + size * 4) % 19 < 2;
        value = seam ? 170 : 230 + Math.round(noise * 0.16);
      } else {
        const vertical = (x + Math.round(Math.sin(y * 0.12) * 5)) % 21 < 3;
        value = vertical ? 150 : 210 + Math.round(noise * 0.35);
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
  texture.needsUpdate = true;
  return texture;
}

export function createIsland2CelestialMaterials(): Island2CelestialMaterials {
  const stoneMap = createPatternTexture(128, 'stone');
  const roofMap = createPatternTexture(96, 'roof');
  const cliffMap = createPatternTexture(128, 'cliff');
  return {
    ivory: new THREE.MeshStandardMaterial({ color: 0xf5f0dd, map: stoneMap, roughness: 0.64, metalness: 0 }),
    ivoryShade: new THREE.MeshStandardMaterial({ color: 0xc9d3d5, map: stoneMap, roughness: 0.78, metalness: 0 }),
    cliff: new THREE.MeshStandardMaterial({ color: 0x66768b, map: cliffMap, roughness: 0.92, metalness: 0 }),
    grass: new THREE.MeshStandardMaterial({ color: 0x6fa45d, roughness: 0.9 }),
    grassLight: new THREE.MeshStandardMaterial({ color: 0x9acb72, roughness: 0.86 }),
    sapphire: new THREE.MeshPhysicalMaterial({ color: 0x255aa8, map: roofMap, roughness: 0.38, metalness: 0.08, clearcoat: 0.48, clearcoatRoughness: 0.22 }),
    sapphireLight: new THREE.MeshPhysicalMaterial({ color: 0x3d82d2, map: roofMap, roughness: 0.3, metalness: 0.1, clearcoat: 0.62, clearcoatRoughness: 0.16 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xe6b84e, roughness: 0.28, metalness: 0.8, emissive: 0x4b2a05, emissiveIntensity: 0.12 }),
    crystal: new THREE.MeshPhysicalMaterial({ color: 0x8d62e8, roughness: 0.06, metalness: 0.02, transparent: true, opacity: 0.86, transmission: 0.22, thickness: 0.5, clearcoat: 1, emissive: 0x4b20b9, emissiveIntensity: 0.82, depthWrite: false }),
    cyanCrystal: new THREE.MeshPhysicalMaterial({ color: 0x73dff7, roughness: 0.05, metalness: 0.01, transparent: true, opacity: 0.82, transmission: 0.28, thickness: 0.38, clearcoat: 1, emissive: 0x167fa6, emissiveIntensity: 0.68, depthWrite: false }),
    water: new THREE.MeshPhysicalMaterial({ color: 0x75e5ff, roughness: 0.05, transparent: true, opacity: 0.7, transmission: 0.18, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide }),
    cloud: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, transparent: true, opacity: 0.88, depthWrite: false, fog: false }),
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
  const hallWidth = 1.2 + level * 0.18;
  const hallHeight = 0.58 + level * 0.24;
  const hallDepth = 0.88 + level * 0.08;
  const hall = box(hallWidth, hallHeight, hallDepth, materials.ivory);
  hall.position.y = 0.46 + hallHeight / 2;
  const backBand = box(hallWidth + 0.12, 0.11, hallDepth + 0.08, materials.gold);
  backBand.position.y = 0.46 + hallHeight - 0.1;
  group.add(hall, backBand);
  addArch(group, level === 3 ? 0.76 : 0.62, 0.46, hallDepth / 2 + 0.08, materials);
  addArch(group, level === 3 ? 0.76 : 0.62, 0.46, -hallDepth / 2 - 0.08, materials, Math.PI);
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
  const roof = new THREE.Mesh(new THREE.ConeGeometry(hallWidth * 0.62, 0.48 + level * 0.1, 4), level === 3 ? materials.sapphireLight : materials.sapphire);
  roof.position.y = 0.46 + hallHeight + 0.21;
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = hallDepth / hallWidth;
  group.add(roof);
  if (level >= 2) {
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.24 + level * 0.03, segmentsFor(quality), 10), materials.cyanCrystal);
    globe.position.set(-0.58, 0.72, hallDepth / 2 + 0.44);
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.025, 5, 20), materials.gold);
    orbit.position.copy(globe.position);
    orbit.rotation.x = 0.7;
    group.add(globe, orbit);
  }
  if (level === 3) {
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
  addPlinth(group, level === 3 ? 2.08 : 1.9, materials, quality, 0.16);
  const baseY = 0.46;
  const hallWidth = 1.2 + level * 0.25;
  const hallDepth = 0.96 + level * 0.18;
  const hallHeight = 0.68 + level * 0.28;
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
    new THREE.ConeGeometry(hallWidth * 0.62, 0.42 + level * 0.09, 4),
    level === 3 ? materials.sapphireLight : materials.sapphire,
  );
  palaceRoof.position.y = baseY + hallHeight + 0.18;
  palaceRoof.rotation.y = Math.PI / 4;
  palaceRoof.scale.z = hallDepth / hallWidth;
  group.add(palaceRoof);

  const facadePilasters = level === 3 ? 5 : level === 2 ? 4 : 3;
  for (let index = 0; index < facadePilasters; index += 1) {
    const x = -hallWidth * 0.43 + index / Math.max(1, facadePilasters - 1) * hallWidth * 0.86;
    const pilaster = box(0.08, hallHeight * 0.82, 0.07, materials.gold);
    pilaster.position.set(x, baseY + hallHeight * 0.49, hallDepth / 2 + 0.055);
    const capital = box(0.16, 0.07, 0.11, materials.gold);
    capital.position.set(x, baseY + hallHeight * 0.9, hallDepth / 2 + 0.06);
    group.add(pilaster, capital);
  }
  const royalDoor = box(level === 3 ? 0.42 : 0.34, level === 3 ? 0.7 : 0.58, 0.06, materials.sapphire);
  royalDoor.position.set(0, baseY + royalDoor.geometry.parameters.height / 2, hallDepth / 2 + 0.07);
  group.add(royalDoor);

  const windowRows = level === 3 ? 2 : 1;
  for (let row = 0; row < windowRows; row += 1) {
    const count = level === 1 ? 3 : level === 2 ? 4 : 5;
    for (let index = 0; index < count; index += 1) {
      const x = -hallWidth * 0.36 + index / Math.max(1, count - 1) * hallWidth * 0.72;
      const window = box(0.13, 0.26, 0.045, materials.cyanCrystal);
      window.position.set(x, baseY + 0.38 + row * 0.38, hallDepth / 2 + 0.03);
      const lintel = box(0.2, 0.045, 0.06, materials.gold);
      lintel.position.set(x, window.position.y + 0.16, hallDepth / 2 + 0.035);
      group.add(window, lintel);
    }
  }

  const towerRadius = 0.38 + level * 0.07;
  const towerHeight = 0.58 + level * 0.2;
  const tower = cylinder(towerRadius, towerRadius + 0.07, towerHeight, materials.ivory, segmentsFor(quality));
  const hallTop = baseY + hallHeight;
  tower.position.y = hallTop + towerHeight / 2 - 0.04;
  group.add(tower);
  addWindowBand(group, towerRadius + 0.012, hallTop + towerHeight * 0.5, level === 1 ? 4 : level === 2 ? 6 : 8, materials, quality);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(towerRadius * 1.15, segmentsFor(quality), 10, 0, Math.PI * 2, 0, Math.PI / 2),
    level === 3 ? materials.sapphireLight : materials.sapphire,
  );
  dome.position.y = hallTop + towerHeight - 0.05;
  dome.scale.y = 0.8;
  const domeRing = new THREE.Mesh(new THREE.TorusGeometry(towerRadius * 0.86, 0.045, 6, 28), materials.gold);
  domeRing.rotation.x = Math.PI / 2;
  domeRing.position.y = dome.position.y + 0.04;
  const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.12 + level * 0.02), level === 3 ? materials.warmGlow : materials.gold);
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
  }

  const towerPositions: Array<[number, number]> = level === 1
    ? [[-0.86, 0.2], [0.86, 0.2]]
    : level === 2
      ? [[-1.18, -0.56], [1.18, -0.56], [-1.18, 0.56], [1.18, 0.56]]
      : [[-1.48, -0.72], [1.48, -0.72], [-1.48, 0.72], [1.48, 0.72], [-0.72, -1.0], [0.72, -1.0]];
  towerPositions.forEach(([x, z], index) => {
    addSpire(group, x, z, 0.42, level === 3 && index < 4 ? 0.96 : 0.76, materials, quality, index % 2 === 0);
  });

  addStairs(group, 1, level === 3 ? 1.08 : 0.86, materials, level);
  addArch(group, level === 3 ? 0.82 : 0.64, 0.44, hallDepth / 2 + 0.12, materials);
  if (level === 3) {
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
      ? createCloudnest(resolved, quality, materials)
      : definition.id === 'habit'
        ? createResolveCourt(resolved, quality, materials)
        : definition.id === 'wisdom'
          ? createSkyArchive(resolved, quality, materials)
          : definition.id === 'event'
            ? createAstralGate(resolved, quality, materials)
            : createSolspirePalace(resolved, quality, materials);
    if (definition.id !== 'boss') building.rotation.y = Math.atan2(-definition.position[0], -definition.position[2]);
    const scale = definition.id === 'boss'
      ? (resolved === 3 ? 1.2 : resolved === 2 ? 1.1 : 1.03)
      : (resolved === 3 ? 1.12 : resolved === 2 ? 1.06 : 1);
    building.scale.setScalar(scale);
    compactStaticGeometry(building, `ISLAND2_CELESTIAL_${definition.id.toUpperCase()}_L${resolved}`);
    root.add(building);
  }
  root.traverse((child) => { child.userData.landmarkId = definition.id; });
  markShadows(root, quality !== 'low');
  return root;
}

function addFloatingShelf(root: THREE.Group, x: number, z: number, radius: number, depth: number, materials: Island2CelestialMaterials, quality: Island3DQuality, seed: number) {
  const segments = segmentsFor(quality);
  const crown = cylinder(radius, radius * 1.03, 0.12, materials.grass, segments);
  crown.position.set(x, 0.3, z);
  crown.scale.z = 0.88;
  const rim = cylinder(radius * 1.02, radius * 1.08, 0.18, materials.ivoryShade, segments);
  rim.position.set(x, 0.18, z);
  rim.scale.z = 0.9;
  const underside = new THREE.Mesh(new THREE.ConeGeometry(radius * 1.07, depth, segments), materials.cliff);
  underside.position.set(x, -depth / 2 + 0.08, z);
  underside.rotation.x = Math.PI;
  underside.scale.z = 0.9;
  underside.rotation.y = seed * 0.17;
  root.add(crown, rim, underside);
  const shardCount = quality === 'high' ? 7 : quality === 'medium' ? 4 : 2;
  for (let index = 0; index < shardCount; index += 1) {
    const angle = index / shardCount * Math.PI * 2 + seed;
    const shard = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.12, depth * (0.28 + index % 3 * 0.06), 5), materials.cliff);
    shard.position.set(x + Math.cos(angle) * radius * 0.72, -depth * 0.52, z + Math.sin(angle) * radius * 0.64);
    shard.rotation.x = Math.PI;
    root.add(shard);
  }
}

function createCloudCluster(quality: Island3DQuality, materials: Island2CelestialMaterials, seed: number, scale = 1) {
  const group = new THREE.Group();
  const count = quality === 'high' ? 10 : quality === 'medium' ? 7 : 4;
  for (let index = 0; index < count; index += 1) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry((0.42 + index % 3 * 0.15) * scale, quality === 'low' ? 7 : 10, 7), materials.cloud);
    puff.scale.set(1.5, 0.68, 1);
    puff.position.set((index - count / 2) * 0.36 * scale, Math.sin(index * 1.8 + seed) * 0.16 * scale, Math.cos(index * 1.4 + seed) * 0.3 * scale);
    group.add(puff);
  }
  group.userData.phase = seed;
  return group;
}

function addConifer(root: THREE.Group, x: number, z: number, scale: number, materials: Island2CelestialMaterials, quality: Island3DQuality) {
  const trunk = cylinder(0.045 * scale, 0.065 * scale, 0.7 * scale, materials.wood, 6);
  trunk.position.set(x, 0.64 + 0.35 * scale, z);
  root.add(trunk);
  const layers = quality === 'low' ? 2 : 3;
  for (let index = 0; index < layers; index += 1) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry((0.34 - index * 0.06) * scale, 0.55 * scale, quality === 'high' ? 10 : 7), index % 2 ? materials.grassLight : materials.grass);
    cone.position.set(x, 0.98 + index * 0.3 * scale, z);
    root.add(cone);
  }
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

  addFloatingShelf(root, 0, 0, 6.12, 3.8, materials, quality, 0.3);
  const satellites: Array<[number, number]> = [[-4.36, -3.9], [4.36, -3.9], [-4.36, 3.9], [4.36, 3.9]];
  satellites.forEach(([x, z], index) => addFloatingShelf(root, x, z, 2.4, 2.7 + index % 2 * 0.35, materials, quality, index + 1.2));

  const clouds: THREE.Group[] = [];
  const cloudCount = quality === 'high' ? 18 : quality === 'medium' ? 12 : 7;
  for (let index = 0; index < cloudCount; index += 1) {
    const angle = index / cloudCount * Math.PI * 2 + 0.18;
    const radius = 7.3 + (index % 3) * 1.1;
    const cloud = createCloudCluster(quality, materials, index * 1.17, 0.82 + index % 2 * 0.18);
    cloud.name = 'ISLAND_2_CLOUD_FLOOR_CLUSTER';
    cloud.position.set(Math.cos(angle) * radius, -1.25 - (index % 3) * 0.22, Math.sin(angle) * radius);
    cloud.userData.baseY = cloud.position.y;
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
    root.add(cloud);
    clouds.push(cloud);
  }

  const waterfalls: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshPhysicalMaterial>[] = [];
  const waterfallCount = quality === 'high' ? 12 : quality === 'medium' ? 8 : 5;
  for (let index = 0; index < waterfallCount; index += 1) {
    const angle = index / waterfallCount * Math.PI * 2 + 0.09;
    const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(0.18 + index % 3 * 0.05, 2.8 + index % 2 * 0.6), materials.water);
    ribbon.name = 'ISLAND_2_CLOUD_WATERFALL';
    ribbon.position.set(Math.cos(angle) * 6.05, -1.05, Math.sin(angle) * 5.35);
    ribbon.rotation.y = -angle + Math.PI / 2;
    ribbon.userData.phase = index * 0.53;
    root.add(ribbon);
    waterfalls.push(ribbon);
  }

  const treeCount = Math.round(18 * detail);
  for (let index = 0; index < treeCount; index += 1) {
    const angle = index / treeCount * Math.PI * 2 + 0.14;
    const protectedAngles = [-2.41, -0.73, 2.41, 0.73];
    if (protectedAngles.some((entry) => Math.abs(Math.atan2(Math.sin(angle - entry), Math.cos(angle - entry))) < 0.26)) continue;
    const radius = 5.05 + index % 3 * 0.22;
    addConifer(root, Math.cos(angle) * radius, Math.sin(angle) * radius, 0.72 + index % 4 * 0.08, materials, quality);
  }
  const flowerCount = Math.round(48 * detail);
  for (let index = 0; index < flowerCount; index += 1) {
    const angle = index / flowerCount * Math.PI * 2 + 0.21;
    const radius = 4.65 + index % 4 * 0.22;
    const flower = new THREE.Mesh(new THREE.OctahedronGeometry(0.055 + index % 2 * 0.012), index % 3 === 0 ? materials.crystal : materials.flower);
    flower.position.set(Math.cos(angle) * radius, 0.48, Math.sin(angle) * radius);
    flower.scale.y = 0.62;
    root.add(flower);
  }

  addFormalSkyGarden(root, materials, quality);

  const fountainJets: THREE.Mesh[] = [];
  satellites.forEach(([x, z], index) => {
    const length = Math.hypot(x, z);
    const tangentX = -z / length;
    const tangentZ = x / length;
    const side = index % 2 ? -1 : 1;
    fountainJets.push(addSkyFountain(root, x + tangentX * 1.52 * side, z + tangentZ * 1.52 * side, 0.86, materials, quality));
  });

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

  // Formal sky-garden accents keep the board edge from reading as an empty
  // green plate without obscuring the fixed route or landmark approaches.
  const gardenAccentCount = quality === 'high' ? 16 : quality === 'medium' ? 10 : 6;
  for (let index = 0; index < gardenAccentCount; index += 1) {
    const angle = index / gardenAccentCount * Math.PI * 2 + 0.11;
    const radius = index % 2 ? 4.2 : 5.55;
    const pedestal = cylinder(0.11, 0.15, 0.3, materials.ivory, 8);
    pedestal.position.set(Math.cos(angle) * radius, 0.58, Math.sin(angle) * radius);
    const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.11), index % 3 === 0 ? materials.crystal : materials.cyanCrystal);
    jewel.position.set(Math.cos(angle) * radius, 0.88, Math.sin(angle) * radius);
    jewel.scale.y = 1.45;
    root.add(pedestal, jewel);
  }

  const islets: THREE.Group[] = [];
  const isletCount = quality === 'high' ? 7 : quality === 'medium' ? 5 : 3;
  for (let index = 0; index < isletCount; index += 1) {
    const angle = index / isletCount * Math.PI * 2 + 0.5;
    const group = new THREE.Group();
    group.name = 'ISLAND_2_DISTANT_FLOATING_ISLET';
    group.position.set(Math.cos(angle) * (18 + index % 3 * 3), 3.2 + index % 3 * 1.4, Math.sin(angle) * (18 + index % 3 * 3));
    group.userData.baseY = group.position.y;
    group.userData.phase = index * 1.4;
    const cap = cylinder(0.75, 0.82, 0.12, materials.grass, segmentsFor(quality));
    const rock = new THREE.Mesh(new THREE.ConeGeometry(0.82, 1.35, segmentsFor(quality)), materials.cliff);
    rock.rotation.x = Math.PI;
    rock.position.y = -0.72;
    group.add(cap, rock);
    if (quality !== 'low') addSpire(group, 0, 0, 0.05, 0.52, materials, quality, index % 2 === 0);
    root.add(group);
    islets.push(group);
  }

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
  scene.add(root);
  return {
    root,
    animate: (elapsed) => {
      clouds.forEach((cloud, index) => {
        cloud.position.y = cloud.userData.baseY + Math.sin(elapsed * 0.11 + index) * 0.08;
        cloud.rotation.y += (index % 2 ? -1 : 1) * 0.00018;
      });
      waterfalls.forEach((waterfall, index) => {
        waterfall.material.opacity = 0.58 + Math.sin(elapsed * 1.7 + waterfall.userData.phase) * 0.1;
        waterfall.scale.x = 0.94 + Math.sin(elapsed * 1.2 + index) * 0.05;
      });
      islets.forEach((islet, index) => {
        islet.position.y = islet.userData.baseY + Math.sin(elapsed * 0.22 + islet.userData.phase) * 0.12;
        islet.rotation.y = Math.sin(elapsed * 0.08 + index) * 0.025;
      });
      birds.forEach((bird, index) => {
        const angle = elapsed * (0.08 + index * 0.006) + bird.userData.phase;
        const radius = 10.5 + index % 3 * 1.4;
        bird.position.set(Math.cos(angle) * radius, 4.2 + index % 3 * 0.65 + Math.sin(angle * 2) * 0.2, Math.sin(angle) * radius);
        bird.rotation.y = -angle;
        bird.children.forEach((child, childIndex) => { child.rotation.y = Math.sin(elapsed * 4.5 + index) * 0.35 * (childIndex ? -1 : 1); });
      });
      fountainJets.forEach((jet, index) => {
        jet.scale.y = 0.9 + Math.sin(elapsed * 1.5 + jet.userData.phase + index) * 0.12;
        jet.position.y = jet.userData.baseY + Math.sin(elapsed * 1.1 + index) * 0.035;
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
        let y = petalAttribute.getY(index) + 0.0018 + index % 3 * 0.00025;
        if (y > 3.1) y = 0.68 + index % 5 * 0.04;
        petalAttribute.setY(index, y);
        petalAttribute.setX(index, petalAttribute.getX(index) + Math.sin(elapsed * 0.5 + index) * 0.0007);
      }
      petalAttribute.needsUpdate = true;
    },
  };
}
