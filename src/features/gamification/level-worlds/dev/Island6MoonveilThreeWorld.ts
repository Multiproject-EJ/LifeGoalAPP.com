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
import { compactStaticGeometry } from './CrownCitadelThreeModel';

export const ISLAND_6_MOONVEIL_WORLD_NAME = 'Moonveil Nexus';
type BuildLevel = 0 | 1 | 2 | 3;

export const ISLAND_6_MOONVEIL_LANDMARK_LABELS = {
  boss: "Noctyra's Moon Gate",
  hatchery: 'Moon-Nest Conservatory',
  habit: 'Constellation Court',
  wisdom: 'Midnight Archive',
  event: 'Violet Rift Observatory',
} as const;

export interface Island6MoonveilMaterials {
  basalt: THREE.MeshStandardMaterial;
  basaltShade: THREE.MeshStandardMaterial;
  indigo: THREE.MeshPhysicalMaterial;
  indigoLight: THREE.MeshPhysicalMaterial;
  gold: THREE.MeshStandardMaterial;
  cyan: THREE.MeshPhysicalMaterial;
  violet: THREE.MeshPhysicalMaterial;
  portal: THREE.MeshBasicMaterial;
  amber: THREE.MeshStandardMaterial;
  warmGlass: THREE.MeshBasicMaterial;
  wood: THREE.MeshStandardMaterial;
  parchment: THREE.MeshStandardMaterial;
  egg: THREE.MeshPhysicalMaterial;
  nest: THREE.MeshStandardMaterial;
  foliage: THREE.MeshStandardMaterial;
  foliageLight: THREE.MeshStandardMaterial;
  moss: THREE.MeshStandardMaterial;
  nightFlower: THREE.MeshPhysicalMaterial;
  voidMist: THREE.MeshBasicMaterial;
}

export interface Island6MoonveilAmbienceRuntime {
  root: THREE.Group;
  animate: (elapsed: number) => void;
  updateView?: (cameraPosition: THREE.Vector3) => void;
}

const segmentCount = (quality: Island3DQuality) => quality === 'high' ? 24 : quality === 'medium' ? 16 : 10;
const detailScale = (quality: Island3DQuality) => quality === 'high' ? 1 : quality === 'medium' ? 0.62 : 0.34;

/**
 * The live route occupies a radial annulus. Moonveil scenery is authored on
 * either side of this protected band so the 36 real tiles stay visually clean
 * and their canonical reward projections remain the only objects above them.
 */
export const ISLAND_6_ROUTE_CLEARANCE_INNER_RADIUS = ISLAND_3D_ROUTE_RADIUS - ISLAND_3D_TILE_RADIAL_DEPTH / 2 - 0.25;
export const ISLAND_6_ROUTE_CLEARANCE_OUTER_RADIUS = ISLAND_3D_ROUTE_RADIUS + ISLAND_3D_TILE_RADIAL_DEPTH / 2 + 0.25;

export function isIsland6RouteCorridorClear(x: number, z: number, footprintRadius = 0): boolean {
  const distance = Math.hypot(x, z);
  const safeFootprint = Math.max(0, footprintRadius);
  return distance + safeFootprint <= ISLAND_6_ROUTE_CLEARANCE_INNER_RADIUS
    || distance - safeFootprint >= ISLAND_6_ROUTE_CLEARANCE_OUTER_RADIUS;
}

function resolveMoonveilDistrictPosition(position: readonly [number, number, number]): readonly [number, number, number] {
  if (Math.abs(position[0]) < 0.01 && Math.abs(position[2]) < 0.01) return position;
  // Phone composition is deliberately taller than the shared square template:
  // Moonveil reads as a constellation of districts suspended along a vertical
  // axis, while the canonical 36-tile route remains untouched at the centre.
  return [position[0] * 0.68, position[1], position[2] * 1.55];
}

function box(width: number, height: number, depth: number, material: THREE.Material) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
}

function cylinder(radiusTop: number, radiusBottom: number, height: number, material: THREE.Material, segments = 16) {
  return new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
}

function markShadows(root: THREE.Object3D, enabled: boolean) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = enabled;
    child.receiveShadow = true;
  });
}

function createPatternTexture(size: number, pattern: 'basalt' | 'indigo' | 'gold') {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const hash = ((x * 73 + y * 97 + x * y * 13) % 43) - 21;
      let value = 150 + hash;
      if (pattern === 'basalt') {
        const strata = (x + Math.round(Math.sin(y * 0.16) * 7)) % 29 < 3;
        value = strata ? 76 : 142 + Math.round(hash * 0.72);
      } else if (pattern === 'indigo') {
        const seam = x % 31 < 2 || y % 23 < 2;
        value = seam ? 96 : 176 + Math.round(hash * 0.42);
      } else {
        const brushed = (x + y * 3) % 17 < 2;
        value = brushed ? 184 : 224 + Math.round(hash * 0.25);
      }
      data[index] = THREE.MathUtils.clamp(value, 24, 245);
      data[index + 1] = THREE.MathUtils.clamp(value, 24, 245);
      data[index + 2] = THREE.MathUtils.clamp(value, 24, 245);
      data[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(pattern === 'basalt' ? 3 : 4, pattern === 'basalt' ? 3 : 4);
  texture.needsUpdate = true;
  return texture;
}

function createReliefTexture(size: number, pattern: 'basalt' | 'indigo' | 'gold') {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const grain = ((x * 37 + y * 61 + x * y * 7) % 31) - 15;
      let value = 128 + grain;
      if (pattern === 'basalt') {
        const fracture = (x + Math.round(Math.sin(y * 0.14) * 9)) % 27 < 2;
        value = fracture ? 68 : 137 + Math.round(grain * 0.58);
      } else if (pattern === 'indigo') {
        const panelSeam = x % 31 < 2 || y % 23 < 2;
        value = panelSeam ? 82 : 142 + Math.round(grain * 0.3);
      } else {
        const brushedGroove = (x * 2 + y * 5) % 19 < 2;
        value = brushedGroove ? 104 : 146 + Math.round(grain * 0.22);
      }
      const clamped = THREE.MathUtils.clamp(value, 24, 232);
      data[index] = clamped;
      data[index + 1] = clamped;
      data[index + 2] = clamped;
      data[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(pattern === 'basalt' ? 3 : 4, pattern === 'basalt' ? 3 : 4);
  texture.needsUpdate = true;
  return texture;
}

export function createIsland6MoonveilMaterials(): Island6MoonveilMaterials {
  const basaltMap = createPatternTexture(128, 'basalt');
  const indigoMap = createPatternTexture(96, 'indigo');
  const goldMap = createPatternTexture(64, 'gold');
  const basaltRelief = createReliefTexture(128, 'basalt');
  const indigoRelief = createReliefTexture(96, 'indigo');
  const goldRelief = createReliefTexture(64, 'gold');
  return {
    basalt: new THREE.MeshStandardMaterial({ color: 0x3c437e, map: basaltMap, bumpMap: basaltRelief, bumpScale: 0.06, roughness: 0.8, metalness: 0.04, emissive: 0x20235f, emissiveIntensity: 0.58 }),
    basaltShade: new THREE.MeshStandardMaterial({ color: 0x303766, map: basaltMap, bumpMap: basaltRelief, bumpScale: 0.075, roughness: 0.88, metalness: 0.03, emissive: 0x302069, emissiveIntensity: 0.72 }),
    indigo: new THREE.MeshPhysicalMaterial({ color: 0x4652a9, map: indigoMap, bumpMap: indigoRelief, bumpScale: 0.026, roughness: 0.36, metalness: 0.14, clearcoat: 0.5, clearcoatRoughness: 0.22, emissive: 0x27358e, emissiveIntensity: 0.7 }),
    indigoLight: new THREE.MeshPhysicalMaterial({ color: 0x6877df, map: indigoMap, bumpMap: indigoRelief, bumpScale: 0.018, roughness: 0.27, metalness: 0.18, clearcoat: 0.64, clearcoatRoughness: 0.16, emissive: 0x3448c2, emissiveIntensity: 0.82 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xf8c966, map: goldMap, bumpMap: goldRelief, bumpScale: 0.012, roughness: 0.22, metalness: 0.86, emissive: 0xa55b12, emissiveIntensity: 0.62 }),
    cyan: new THREE.MeshPhysicalMaterial({ color: 0x5be2ff, roughness: 0.06, metalness: 0.02, transparent: true, opacity: 0.86, transmission: 0.18, thickness: 0.35, clearcoat: 1, emissive: 0x168fd0, emissiveIntensity: 1.18, depthWrite: false, side: THREE.DoubleSide }),
    violet: new THREE.MeshPhysicalMaterial({ color: 0x8f5bff, roughness: 0.08, metalness: 0.03, transparent: true, opacity: 0.88, transmission: 0.16, thickness: 0.42, clearcoat: 1, emissive: 0x5a20cf, emissiveIntensity: 1.22, depthWrite: false, side: THREE.DoubleSide }),
    portal: new THREE.MeshBasicMaterial({ color: 0xc47bff, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    amber: new THREE.MeshStandardMaterial({ color: 0xffe3a0, roughness: 0.11, emissive: 0xff7414, emissiveIntensity: 3.35 }),
    warmGlass: new THREE.MeshBasicMaterial({ color: 0xffb52f, transparent: true, opacity: 0.98, toneMapped: false, depthWrite: false }),
    wood: new THREE.MeshStandardMaterial({ color: 0x6f432e, roughness: 0.82, emissive: 0x260f18, emissiveIntensity: 0.12 }),
    parchment: new THREE.MeshStandardMaterial({ color: 0xe8d5a8, roughness: 0.86, emissive: 0x4a2d13, emissiveIntensity: 0.14, side: THREE.DoubleSide }),
    egg: new THREE.MeshPhysicalMaterial({ color: 0xbdeeff, roughness: 0.14, clearcoat: 0.82, clearcoatRoughness: 0.12, emissive: 0x337bc2, emissiveIntensity: 0.44 }),
    nest: new THREE.MeshStandardMaterial({ color: 0x79553b, roughness: 0.9 }),
    foliage: new THREE.MeshStandardMaterial({ color: 0x247275, roughness: 0.82, emissive: 0x134c55, emissiveIntensity: 0.48 }),
    foliageLight: new THREE.MeshStandardMaterial({ color: 0x4d9ba0, roughness: 0.74, emissive: 0x276f80, emissiveIntensity: 0.58 }),
    moss: new THREE.MeshStandardMaterial({ color: 0x286557, roughness: 0.92, emissive: 0x174a45, emissiveIntensity: 0.48 }),
    nightFlower: new THREE.MeshPhysicalMaterial({ color: 0xbca1ff, roughness: 0.16, clearcoat: 0.72, emissive: 0x672ed4, emissiveIntensity: 1.25 }),
    voidMist: new THREE.MeshBasicMaterial({ color: 0x5928b8, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }),
  };
}

function addRing(root: THREE.Group, radius: number, tube: number, y: number, material: THREE.Material, segments: number, vertical = false) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, segments), material);
  if (!vertical) ring.rotation.x = Math.PI / 2;
  ring.position.y = y;
  root.add(ring);
  return ring;
}

function addCrystal(root: THREE.Group, x: number, y: number, z: number, size: number, material: THREE.Material, rotation = 0) {
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(size, 0), material);
  crystal.position.set(x, y, z);
  crystal.rotation.y = rotation;
  crystal.rotation.z = Math.sin(rotation * 1.7) * 0.14;
  crystal.scale.set(0.72, 1.55, 0.76);
  root.add(crystal);
  return crystal;
}

function addLantern(root: THREE.Group, x: number, y: number, z: number, materials: Island6MoonveilMaterials, scale = 1) {
  const base = cylinder(0.075 * scale, 0.09 * scale, 0.12 * scale, materials.gold, 8);
  base.position.set(x, y, z);
  const glow = new THREE.Mesh(new THREE.OctahedronGeometry(0.095 * scale), materials.amber);
  glow.position.set(x, y + 0.15 * scale, z);
  glow.scale.y = 1.25;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.09 * scale, 0.12 * scale, 6), materials.gold);
  cap.position.set(x, y + 0.29 * scale, z);
  root.add(base, glow, cap);
}

function addStarFinial(root: THREE.Group, x: number, y: number, z: number, materials: Island6MoonveilMaterials, scale = 1) {
  const vertical = box(0.06 * scale, 0.34 * scale, 0.055 * scale, materials.gold);
  const horizontal = box(0.25 * scale, 0.06 * scale, 0.055 * scale, materials.gold);
  vertical.position.set(x, y, z);
  horizontal.position.set(x, y, z);
  horizontal.rotation.z = Math.PI / 4;
  vertical.rotation.z = Math.PI / 4;
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.07 * scale), materials.amber);
  core.position.set(x, y, z);
  root.add(vertical, horizontal, core);
}

function addPlinth(root: THREE.Group, radius: number, materials: Island6MoonveilMaterials, quality: Island3DQuality, y = 0.18) {
  const segments = segmentCount(quality);
  const base = cylinder(radius, radius + 0.14, 0.25, materials.basaltShade, segments);
  base.position.y = y;
  const deck = cylinder(radius * 0.94, radius, 0.12, materials.indigo, segments);
  deck.position.y = y + 0.19;
  root.add(base, deck);
  addRing(root, radius * 0.84, 0.045, y + 0.27, materials.gold, segments * 2);
}

function addFrontStairs(root: THREE.Group, width: number, depth: number, materials: Island6MoonveilMaterials, count = 4) {
  for (let index = 0; index < count; index += 1) {
    const stair = box(width + index * 0.13, 0.075, depth, index === 0 ? materials.gold : materials.basalt);
    stair.position.set(0, 0.49 - index * 0.055, 1.05 + index * depth * 0.72);
    root.add(stair);
  }
}

function addDome(root: THREE.Group, x: number, y: number, z: number, radius: number, materials: Island6MoonveilMaterials, quality: Island3DQuality, bright = false) {
  const segments = segmentCount(quality);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(radius, segments, Math.max(8, Math.round(segments / 2)), 0, Math.PI * 2, 0, Math.PI / 2), bright ? materials.indigoLight : materials.indigo);
  dome.position.set(x, y, z);
  dome.scale.y = 0.8;
  root.add(dome);
  const band = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.84, 0.045, 6, segments * 2), materials.gold);
  band.rotation.x = Math.PI / 2;
  band.position.set(x, y + 0.02, z);
  root.add(band);
  const ribCount = quality === 'high' ? 8 : quality === 'medium' ? 6 : 4;
  for (let index = 0; index < ribCount; index += 1) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.9, 0.022, 5, Math.max(10, segments), Math.PI), materials.gold);
    rib.position.set(x, y, z);
    rib.rotation.set(0, index / ribCount * Math.PI, Math.PI / 2);
    root.add(rib);
  }
  const latitudeCount = quality === 'high' ? 2 : quality === 'medium' ? 1 : 0;
  for (let index = 0; index < latitudeCount; index += 1) {
    const progress = index === 0 ? 0.34 : 0.62;
    const latitudeRadius = radius * Math.sqrt(1 - progress * progress) * 0.92;
    const latitude = new THREE.Mesh(
      new THREE.TorusGeometry(latitudeRadius, radius * 0.018, 5, segments * 2),
      index === 0 ? materials.gold : materials.indigoLight,
    );
    latitude.rotation.x = Math.PI / 2;
    latitude.position.set(x, y + radius * progress * 0.8, z);
    root.add(latitude);
  }
}

function addWarmArchedWindow(
  root: THREE.Group,
  x: number,
  y: number,
  z: number,
  rotationY: number,
  scale: number,
  materials: Island6MoonveilMaterials,
  quality: Island3DQuality,
) {
  const windowRoot = new THREE.Group();
  windowRoot.position.set(x, y, z);
  windowRoot.rotation.y = rotationY;
  windowRoot.scale.setScalar(1.56);
  const pane = box(0.16 * scale, 0.28 * scale, 0.038 * scale, materials.warmGlass);
  const left = box(0.035 * scale, 0.31 * scale, 0.055 * scale, materials.gold);
  const right = left.clone();
  left.position.x = -0.095 * scale;
  right.position.x = 0.095 * scale;
  const sill = box(0.235 * scale, 0.035 * scale, 0.06 * scale, materials.gold);
  sill.position.y = -0.165 * scale;
  const arch = new THREE.Mesh(
    new THREE.TorusGeometry(0.095 * scale, 0.022 * scale, 5, quality === 'high' ? 18 : 12, Math.PI),
    materials.gold,
  );
  arch.rotation.z = 0;
  arch.position.y = 0.14 * scale;
  const mullion = box(0.018 * scale, 0.26 * scale, 0.062 * scale, materials.gold);
  mullion.position.z = 0.012 * scale;
  windowRoot.add(pane, left, right, sill, arch, mullion);
  root.add(windowRoot);
}

function addBalustrade(
  root: THREE.Group,
  radius: number,
  y: number,
  materials: Island6MoonveilMaterials,
  quality: Island3DQuality,
  openingAngle = Math.PI / 2,
) {
  const postCount = quality === 'high' ? 18 : quality === 'medium' ? 12 : 8;
  for (let index = 0; index < postCount; index += 1) {
    const angle = index / postCount * Math.PI * 2;
    const distanceFromEntrance = Math.abs(Math.atan2(Math.sin(angle - openingAngle), Math.cos(angle - openingAngle)));
    if (distanceFromEntrance < 0.34) continue;
    const post = cylinder(0.035, 0.045, 0.34, index % 4 === 0 ? materials.gold : materials.basalt, 7);
    post.position.set(Math.sin(angle) * radius, y + 0.17, Math.cos(angle) * radius);
    root.add(post);
    if (index % 4 === 0) addStarFinial(root, post.position.x, y + 0.43, post.position.z, materials, 0.3);
  }
  const rail = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.025, 5, postCount * 2), materials.gold);
  rail.rotation.x = Math.PI / 2;
  rail.position.y = y + 0.33;
  root.add(rail);
}

function addStarPaving(
  root: THREE.Group,
  radius: number,
  y: number,
  materials: Island6MoonveilMaterials,
  quality: Island3DQuality,
  count = 8,
) {
  const resolvedCount = quality === 'low' ? Math.min(4, count) : count;
  for (let index = 0; index < resolvedCount; index += 1) {
    const angle = index / resolvedCount * Math.PI * 2 + Math.PI / resolvedCount;
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), index % 3 === 0 ? materials.cyan : materials.gold);
    star.position.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
    star.scale.set(1.3, 0.12, 0.58);
    star.rotation.y = -angle;
    root.add(star);
  }
}

function addCelestialBanner(
  root: THREE.Group,
  x: number,
  y: number,
  z: number,
  rotationY: number,
  materials: Island6MoonveilMaterials,
  scale = 1,
) {
  const bannerRoot = new THREE.Group();
  bannerRoot.position.set(x, y, z);
  bannerRoot.rotation.y = rotationY;
  const pole = cylinder(0.028 * scale, 0.035 * scale, 0.78 * scale, materials.gold, 7);
  pole.position.y = 0.36 * scale;
  const cloth = box(0.34 * scale, 0.42 * scale, 0.018 * scale, materials.indigoLight);
  cloth.position.set(0.2 * scale, 0.42 * scale, 0);
  cloth.rotation.z = -0.08;
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.072 * scale, 0), materials.gold);
  star.position.set(0.2 * scale, 0.43 * scale, 0.02 * scale);
  star.scale.set(1, 0.18, 0.62);
  bannerRoot.add(pole, cloth, star);
  root.add(bannerRoot);
}

function addMoonveilGrandEntrance(
  root: THREE.Group,
  materials: Island6MoonveilMaterials,
  quality: Island3DQuality,
) {
  const segments = segmentCount(quality);
  const facade = box(1.54, 0.92, 0.34, materials.indigo);
  facade.position.set(0, 0.98, 0.64);
  root.add(facade);
  const doorway = box(0.48, 0.64, 0.055, materials.warmGlass);
  doorway.position.set(0, 0.86, 0.825);
  const doorFrame = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.055, 6, segments, Math.PI), materials.gold);
  doorFrame.position.set(0, 1.17, 0.858);
  const lintel = box(0.72, 0.08, 0.09, materials.gold);
  lintel.position.set(0, 1.16, 0.855);
  root.add(doorway, doorFrame, lintel);
  [-1, 1].forEach((side) => {
    const tower = cylinder(0.18, 0.23, 1.1, materials.indigoLight, segments);
    tower.position.set(side * 0.76, 1.12, 0.65);
    root.add(tower);
    addDome(root, side * 0.76, 1.66, 0.65, 0.23, materials, quality, true);
    addWarmArchedWindow(root, side * 0.76, 1.08, 0.84, 0, 0.68, materials, quality);
    addStarFinial(root, side * 0.76, 2.02, 0.65, materials, 0.46);
    const wing = box(0.58, 0.56, 0.28, materials.basalt);
    wing.position.set(side * 1.04, 0.8, 0.48);
    root.add(wing);
    addWarmArchedWindow(root, side * 1.04, 0.82, 0.63, 0, 0.58, materials, quality);
    addLantern(root, side * 0.43, 0.56, 1.03, materials, 0.76);
  });
  addCelestialBanner(root, -1.22, 0.55, 0.34, 0.06, materials, 0.72);
  addCelestialBanner(root, 1.22, 0.55, 0.34, -0.06, materials, 0.72);
}

function addMoonveilRearGallery(
  root: THREE.Group,
  materials: Island6MoonveilMaterials,
  quality: Island3DQuality,
) {
  // Bottom-half districts face the board, so the shared overview sees their
  // rear elevations. Give that camera-facing side a real inhabited gallery
  // instead of exposing a blank dome shell.
  const gallery = box(1.72, 0.72, 0.28, materials.indigo);
  gallery.position.set(0, 0.98, -1.02);
  const cornice = box(1.86, 0.08, 0.34, materials.gold);
  cornice.position.set(0, 1.37, -1.02);
  root.add(gallery, cornice);
  [-0.56, 0, 0.56].forEach((x, index) => {
    addWarmArchedWindow(root, x, 0.99, -1.18, Math.PI, index === 1 ? 0.86 : 0.72, materials, quality);
  });
  [-0.82, 0.82].forEach((x) => {
    const turret = cylinder(0.14, 0.18, 0.82, materials.indigoLight, segmentCount(quality));
    turret.position.set(x, 1.06, -1.02);
    root.add(turret);
    addStarFinial(root, x, 1.58, -1.02, materials, 0.48);
  });
  addCrescent(root, 0, 1.65, -1.06, 0.2, materials, Math.PI);
}

function addWarmCrownLights(
  root: THREE.Group,
  radius: number,
  y: number,
  count: number,
  materials: Island6MoonveilMaterials,
  quality: Island3DQuality,
) {
  const resolvedCount = quality === 'low' ? Math.min(6, count) : quality === 'medium' ? Math.min(10, count) : count;
  for (let index = 0; index < resolvedCount; index += 1) {
    const angle = index / resolvedCount * Math.PI * 2 + Math.PI / resolvedCount;
    const post = cylinder(0.022, 0.03, 0.16, materials.gold, 6);
    post.position.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
    const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.068, 0), materials.warmGlass);
    flame.position.set(post.position.x, y + 0.12, post.position.z);
    flame.scale.set(0.8, 1.45, 0.8);
    root.add(post, flame);
  }
}

function addMoonling(
  root: THREE.Group,
  x: number,
  y: number,
  z: number,
  scale: number,
  materials: Island6MoonveilMaterials,
  quality: Island3DQuality,
) {
  const creature = new THREE.Group();
  creature.name = 'ISLAND_6_MOONLING';
  creature.position.set(x, y, z);
  creature.scale.setScalar(scale);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, segmentCount(quality), 8), materials.egg);
  body.scale.set(0.9, 1.08, 0.86);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, segmentCount(quality), 8), materials.egg);
  head.position.y = 0.19;
  const earA = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.14, 5), materials.violet);
  const earB = earA.clone();
  earA.position.set(-0.085, 0.32, 0);
  earB.position.set(0.085, 0.32, 0);
  earA.rotation.z = 0.3;
  earB.rotation.z = -0.3;
  const eyeA = new THREE.Mesh(new THREE.SphereGeometry(0.027, 7, 5), materials.cyan);
  const eyeB = eyeA.clone();
  eyeA.position.set(-0.048, 0.21, 0.112);
  eyeB.position.set(0.048, 0.21, 0.112);
  creature.add(body, head, earA, earB, eyeA, eyeB);
  root.add(creature);
}

function addCrescent(root: THREE.Group, x: number, y: number, z: number, radius: number, materials: Island6MoonveilMaterials, rotationY = 0) {
  const crescent = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.TorusGeometry(radius, radius * 0.15, 7, 30, Math.PI * 1.58), materials.gold);
  outer.rotation.z = Math.PI * 0.21;
  const inner = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.74, radius * 0.07, 6, 26, Math.PI * 1.48), materials.indigoLight);
  inner.rotation.z = Math.PI * 0.22;
  crescent.add(outer, inner);
  crescent.position.set(x, y, z);
  crescent.rotation.y = rotationY;
  root.add(crescent);
  return crescent;
}

function addMoonEgg(root: THREE.Group, x: number, y: number, z: number, size: number, materials: Island6MoonveilMaterials, quality: Island3DQuality) {
  const nest = new THREE.Mesh(new THREE.TorusGeometry(size * 0.78, size * 0.22, 5, quality === 'low' ? 12 : 20), materials.nest);
  nest.rotation.x = Math.PI / 2;
  nest.position.set(x, y, z);
  const egg = new THREE.Mesh(new THREE.SphereGeometry(size * 0.5, segmentCount(quality), 10), materials.egg);
  egg.scale.set(0.82, 1.25, 0.82);
  egg.position.set(x, y + size * 0.36, z);
  root.add(nest, egg);
  if (quality !== 'low') {
    const spotCount = quality === 'high' ? 5 : 3;
    for (let index = 0; index < spotCount; index += 1) {
      const angle = index / spotCount * Math.PI * 2;
      const spot = new THREE.Mesh(new THREE.SphereGeometry(size * 0.07, 6, 4), materials.violet);
      spot.position.set(x + Math.cos(angle) * size * 0.35, y + size * (0.3 + (index % 2) * 0.22), z + Math.sin(angle) * size * 0.35);
      root.add(spot);
    }
  }
}

function createMoonNest(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island6MoonveilMaterials) {
  const group = new THREE.Group();
  group.name = `ISLAND_6_MOON_NEST_L${level}`;
  const segments = segmentCount(quality);
  addPlinth(group, level === 3 ? 1.4 : 1.28, materials, quality);
  const hallRadius = 0.5 + level * 0.1;
  const hallHeight = 0.5 + level * 0.18;
  const hall = cylinder(hallRadius * 0.94, hallRadius, hallHeight, materials.indigo, segments);
  hall.position.set(0, 0.52 + hallHeight / 2, -0.2);
  group.add(hall);
  addDome(group, 0, hall.position.y + hallHeight / 2 - 0.02, -0.2, hallRadius * 1.04, materials, quality, level === 3);
  const windowCount = quality === 'low' ? 4 : 8;
  for (let index = 0; index < windowCount; index += 1) {
    const angle = index / windowCount * Math.PI * 2;
    addWarmArchedWindow(
      group,
      Math.sin(angle) * (hallRadius + 0.026),
      0.79,
      -0.2 + Math.cos(angle) * (hallRadius + 0.026),
      angle,
      index % 2 === 0 ? 0.78 : 0.62,
      materials,
      quality,
    );
  }
  const nestPositions: Array<[number, number]> = level === 1 ? [[0, 0.88]] : level === 2 ? [[-0.62, 0.7], [0.62, 0.7]] : [[-0.72, 0.62], [0.72, 0.62], [0, 1.0]];
  nestPositions.forEach(([x, z], index) => addMoonEgg(group, x, 0.62 + (index === 2 ? 0.08 : 0), z, level === 1 ? 0.48 : 0.42, materials, quality));
  addFrontStairs(group, 0.72, 0.2, materials, 4);
  if (level >= 2) {
    [-1, 1].forEach((side) => {
      const tower = cylinder(0.18, 0.22, 0.74 + level * 0.08, materials.indigo, segments);
      tower.position.set(side * 0.82, 0.92, -0.18);
      group.add(tower);
      addCrystal(group, side * 0.82, 1.42 + level * 0.08, -0.18, 0.12, materials.cyan, side);
    });
  }
  if (level === 3) {
    [-1, 1].forEach((side) => {
      const annex = cylinder(0.36, 0.42, 0.62, materials.indigo, segments);
      annex.position.set(side * 0.92, 0.83, 0.22);
      group.add(annex);
      addDome(group, side * 0.92, 1.13, 0.22, 0.41, materials, quality, true);
      addWarmArchedWindow(group, side * 1.31, 0.88, 0.22, side * Math.PI / 2, 0.72, materials, quality);
      addMoonling(group, side * 0.7, 0.86, 0.68, 0.82, materials, quality);
    });
    const orrery = new THREE.Group();
    addRing(orrery, 0.31, 0.025, 0, materials.gold, 26, true);
    addRing(orrery, 0.23, 0.02, 0, materials.cyan, 22, true).rotation.y = Math.PI / 2;
    const moon = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), materials.egg);
    orrery.add(moon);
    orrery.position.set(0, 2.12, -0.18);
    orrery.rotation.x = 0.2;
    group.add(orrery);
    addCrescent(group, 0, 2.58, -0.18, 0.24, materials);
    [-1.08, 1.08].forEach((x) => addLantern(group, x, 0.58, 0.84, materials, 0.86));
    addBalustrade(group, 1.23, 0.5, materials, quality);
    addStarPaving(group, 0.94, 0.555, materials, quality, 10);
    addCelestialBanner(group, -1.13, 0.55, -0.62, 0.12, materials, 0.76);
    addCelestialBanner(group, 1.13, 0.55, -0.62, -0.12, materials, 0.76);
    addMoonling(group, 0.18, 0.82, 0.94, 0.88, materials, quality);
  }
  return group;
}

function addTrainingTarget(root: THREE.Group, x: number, z: number, materials: Island6MoonveilMaterials, quality: Island3DQuality, scale = 1) {
  const post = cylinder(0.055 * scale, 0.075 * scale, 0.72 * scale, materials.wood, 8);
  post.position.set(x, 0.83, z);
  const disc = cylinder(0.26 * scale, 0.26 * scale, 0.06, materials.indigoLight, segmentCount(quality));
  disc.rotation.x = Math.PI / 2;
  disc.position.set(x, 1.06, z + 0.02);
  const bull = cylinder(0.09 * scale, 0.09 * scale, 0.07, materials.amber, 12);
  bull.rotation.x = Math.PI / 2;
  bull.position.set(x, 1.06, z + 0.055);
  root.add(post, disc, bull);
}

function createConstellationCourt(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island6MoonveilMaterials) {
  const group = new THREE.Group();
  group.name = `ISLAND_6_CONSTELLATION_COURT_L${level}`;
  addPlinth(group, level === 3 ? 1.45 : 1.3, materials, quality);
  const floor = cylinder(1.12, 1.18, 0.12, materials.indigo, segmentCount(quality));
  floor.position.y = 0.46;
  group.add(floor);
  addRing(group, 0.76, 0.035, 0.53, materials.gold, 34);
  const targetCount = level === 1 ? 2 : level === 2 ? 3 : 4;
  for (let index = 0; index < targetCount; index += 1) {
    const angle = (-0.72 + index / Math.max(1, targetCount - 1) * 1.44);
    addTrainingTarget(group, Math.sin(angle) * 0.72, -0.18 + Math.cos(angle) * 0.72, materials, quality, 0.82);
  }
  if (level >= 2) {
    const postCount = level === 3 ? 6 : 4;
    for (let index = 0; index < postCount; index += 1) {
      const angle = index / postCount * Math.PI * 2 + Math.PI / postCount;
      const post = cylinder(0.075, 0.09, 1.22, materials.gold, 8);
      post.position.set(Math.sin(angle) * 1.02, 1.02, Math.cos(angle) * 1.02);
      group.add(post);
      addStarFinial(group, post.position.x, 1.72, post.position.z, materials, 0.62);
    }
    if (level === 2) {
      const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(1.18, 0.52, postCount, 1, true),
        materials.indigoLight,
      );
      canopy.position.y = 1.64;
      canopy.scale.y = 0.58;
      group.add(canopy);
    } else {
      // L3 becomes an open-air celestial exercise court. The former full
      // translucent cone read as a giant plain silo in landmark focus, hiding
      // the training equipment and warm interior life.
      addRing(group, 1.08, 0.055, 1.58, materials.gold, 42);
      addRing(group, 0.78, 0.035, 1.86, materials.cyan, 34);
      for (let index = 0; index < postCount; index += 1) {
        const angle = index / postCount * Math.PI * 2 + Math.PI / postCount;
        const crownBeam = box(0.045, 0.045, 0.72, index % 2 ? materials.gold : materials.indigoLight);
        crownBeam.position.set(Math.sin(angle) * 0.72, 1.72, Math.cos(angle) * 0.72);
        crownBeam.rotation.y = angle;
        crownBeam.rotation.x = -0.34;
        group.add(crownBeam);
        addLantern(group, Math.sin(angle) * 1.0, 1.52, Math.cos(angle) * 1.0, materials, 0.45);
      }
    }
    const rearHall = box(0.92 + level * 0.12, 0.7 + level * 0.12, 0.46, materials.indigo);
    rearHall.position.set(0, 0.9, -0.82);
    group.add(rearHall);
    addWarmArchedWindow(group, 0, 0.96, -1.065, Math.PI, 1.1, materials, quality);
    [-0.38, 0.38].forEach((x) => addWarmArchedWindow(group, x, 0.93, -1.06, Math.PI, 0.66, materials, quality));
  }
  if (level === 3) {
    const armillary = new THREE.Group();
    [0.52, 0.41, 0.3].forEach((radius, index) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.025, 5, 30), index === 1 ? materials.cyan : materials.gold);
      ring.rotation.set(index * 0.72, index * 0.92, index * 0.38);
      armillary.add(ring);
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 9), materials.violet);
    armillary.add(core);
    armillary.position.set(0, 2.25, -0.05);
    armillary.name = 'ISLAND_6_SPINNER';
    group.add(armillary);
    const weights = [-0.58, 0.58];
    weights.forEach((x) => {
      const handle = box(0.5, 0.09, 0.09, materials.gold);
      const endA = cylinder(0.12, 0.12, 0.15, materials.basalt, 10);
      const endB = endA.clone();
      handle.position.set(x, 0.64, 0.72);
      endA.rotation.z = Math.PI / 2;
      endB.rotation.z = Math.PI / 2;
      endA.position.set(x - 0.29, 0.64, 0.72);
      endB.position.set(x + 0.29, 0.64, 0.72);
      group.add(handle, endA, endB);
    });
    addBalustrade(group, 1.27, 0.5, materials, quality);
    addStarPaving(group, 0.98, 0.555, materials, quality, 12);
    addCelestialBanner(group, -1.15, 0.52, -0.58, 0.08, materials, 0.82);
    addCelestialBanner(group, 1.15, 0.52, -0.58, -0.08, materials, 0.82);
    const observatory = cylinder(0.34, 0.39, 0.7, materials.indigo, segmentCount(quality));
    observatory.position.set(0.76, 0.89, -0.52);
    group.add(observatory);
    addDome(group, 0.76, 1.24, -0.52, 0.4, materials, quality, true);
    addWarmArchedWindow(group, 1.13, 0.9, -0.52, Math.PI / 2, 0.72, materials, quality);
  }
  addFrontStairs(group, 0.86, 0.2, materials, 4);
  return group;
}

function addBookshelf(root: THREE.Group, angle: number, radius: number, materials: Island6MoonveilMaterials, quality: Island3DQuality, level: number) {
  const shelf = box(0.66, 1.0 + level * 0.12, 0.18, materials.wood);
  shelf.position.set(Math.sin(angle) * radius, 1.12, Math.cos(angle) * radius);
  shelf.rotation.y = angle;
  root.add(shelf);
  const rows = quality === 'low' ? 2 : 4;
  const booksPerRow = quality === 'high' ? 6 : 4;
  for (let row = 0; row < rows; row += 1) {
    for (let index = 0; index < booksPerRow; index += 1) {
      const book = box(0.045, 0.13 + (index % 2) * 0.03, 0.05, index % 3 === 0 ? materials.gold : index % 2 ? materials.indigoLight : materials.violet);
      const localX = (index - (booksPerRow - 1) / 2) * 0.075;
      book.position.set(shelf.position.x + Math.cos(angle) * localX, 0.78 + row * 0.21, shelf.position.z - Math.sin(angle) * localX);
      book.rotation.y = angle;
      root.add(book);
    }
  }
}

function createMidnightArchive(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island6MoonveilMaterials) {
  const group = new THREE.Group();
  group.name = `ISLAND_6_MIDNIGHT_ARCHIVE_L${level}`;
  addPlinth(group, level === 3 ? 1.46 : 1.31, materials, quality);
  const hallRadius = 0.72 + level * 0.08;
  const hall = cylinder(hallRadius * 0.95, hallRadius, 0.8 + level * 0.14, materials.indigo, segmentCount(quality));
  hall.position.set(0, 1.0, -0.15);
  group.add(hall);
  addRing(group, hallRadius * 1.01, 0.035, 0.64, materials.gold, segmentCount(quality));
  addRing(group, hallRadius * 1.01, 0.028, 1.43, materials.gold, segmentCount(quality));
  const facadeCount = quality === 'low' ? 6 : 10;
  for (let index = 0; index < facadeCount; index += 1) {
    const angle = index / facadeCount * Math.PI * 2;
    const radius = hallRadius + 0.014;
    const pilaster = box(0.055, 0.76 + level * 0.08, 0.045, materials.gold);
    pilaster.position.set(Math.sin(angle) * radius, 1.02, -0.15 + Math.cos(angle) * radius);
    pilaster.rotation.y = angle;
    group.add(pilaster);
    if (index % 2 === 0) {
      addWarmArchedWindow(
        group,
        Math.sin(angle) * (radius + 0.026),
        1.12,
        -0.15 + Math.cos(angle) * (radius + 0.026),
        angle,
        level === 3 ? 0.72 : 0.58,
        materials,
        quality,
      );
    }
  }
  const shelfCount = level === 1 ? 2 : level === 2 ? 4 : 6;
  for (let index = 0; index < shelfCount; index += 1) {
    const angle = Math.PI * 0.58 + index / Math.max(1, shelfCount - 1) * Math.PI * 0.84;
    addBookshelf(group, angle, hallRadius * 0.88, materials, quality, level);
  }
  addDome(group, 0, 1.52 + level * 0.12, -0.15, hallRadius * 1.02, materials, quality, level === 3);
  const bookStand = box(0.68, 0.1, 0.48, materials.gold);
  bookStand.position.set(0, 0.88, 0.72);
  bookStand.rotation.x = -0.16;
  group.add(bookStand);
  const pageLeft = box(0.31, 0.025, 0.42, materials.parchment);
  const pageRight = pageLeft.clone();
  pageLeft.position.set(-0.17, 0.97, 0.72);
  pageRight.position.set(0.17, 0.97, 0.72);
  pageLeft.rotation.z = 0.1;
  pageRight.rotation.z = -0.1;
  group.add(pageLeft, pageRight);
  const rearGallery = box(0.94, 0.14, 0.46, materials.gold);
  rearGallery.position.set(0, 0.78, -0.9);
  const rearShelf = box(0.82, 0.52, 0.16, materials.wood);
  rearShelf.position.set(0, 1.06, -1.0);
  const rearMoon = new THREE.Mesh(new THREE.SphereGeometry(0.16, segmentCount(quality), 8), materials.cyan);
  rearMoon.position.set(0, 1.28, -1.11);
  group.add(rearGallery, rearShelf, rearMoon);
  if (quality !== 'low') {
    for (let index = 0; index < 5; index += 1) {
      const rearBook = box(0.075, 0.23 + index % 2 * 0.05, 0.055, index % 2 ? materials.violet : materials.parchment);
      rearBook.position.set((index - 2) * 0.13, 1.02, -1.1);
      group.add(rearBook);
    }
  }
  if (quality !== 'low') {
    const lineCount = quality === 'high' ? 5 : 3;
    for (let index = 0; index < lineCount; index += 1) {
      [-1, 1].forEach((side) => {
        const line = box(0.2, 0.01, 0.012, index % 2 ? materials.gold : materials.indigoLight);
        line.position.set(side * 0.17, 0.995 + index * 0.002, 0.58 + index * 0.065);
        group.add(line);
      });
    }
  }
  if (level >= 2) {
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.24 + level * 0.04, segmentCount(quality), 10), materials.cyan);
    globe.position.set(-0.72, 1.02, 0.48);
    group.add(globe);
    addRing(group, 0.34 + level * 0.03, 0.022, 1.02, materials.gold, 28, true).position.set(-0.72, 1.02, 0.48);
  }
  if (level === 3) {
    [-1, 1].forEach((side) => {
      const tower = cylinder(0.22, 0.27, 1.18, materials.indigo, segmentCount(quality));
      tower.position.set(side * 0.92, 1.12, -0.18);
      group.add(tower);
      addDome(group, side * 0.92, 1.71, -0.18, 0.27, materials, quality, true);
    });
    const telescope = new THREE.Group();
    const tube = cylinder(0.09, 0.13, 0.86, materials.indigoLight, 12);
    tube.rotation.z = Math.PI / 2;
    const lens = cylinder(0.14, 0.14, 0.08, materials.cyan, 14);
    lens.rotation.z = Math.PI / 2;
    lens.position.x = 0.45;
    telescope.add(tube, lens);
    telescope.position.set(0.55, 2.18, -0.28);
    telescope.rotation.z = 0.18;
    group.add(telescope);
    addCrescent(group, 0, 2.5, -0.15, 0.22, materials);
    addBalustrade(group, 1.28, 0.5, materials, quality);
    addStarPaving(group, 1.0, 0.555, materials, quality, 12);
    addCelestialBanner(group, -1.18, 0.5, -0.66, 0.12, materials, 0.86);
    addCelestialBanner(group, 1.18, 0.5, -0.66, -0.12, materials, 0.86);
    const sunCrest = new THREE.Mesh(new THREE.IcosahedronGeometry(0.19, 1), materials.amber);
    sunCrest.position.set(0, 2.22, 0.52);
    sunCrest.scale.z = 0.32;
    group.add(sunCrest);
  }
  addFrontStairs(group, 0.82, 0.2, materials, 4);
  return group;
}

function addRiftPylon(root: THREE.Group, x: number, z: number, height: number, materials: Island6MoonveilMaterials, quality: Island3DQuality) {
  const plinth = cylinder(0.18, 0.24, 0.34, materials.basalt, segmentCount(quality));
  plinth.position.set(x, 0.67, z);
  const shaft = box(0.21, height, 0.21, materials.indigo);
  shaft.position.set(x, 0.84 + height / 2, z);
  root.add(plinth, shaft);
  addCrystal(root, x, 0.9 + height + 0.12, z, 0.14, materials.violet, x + z);
}

function createVioletRift(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island6MoonveilMaterials) {
  const group = new THREE.Group();
  group.name = `ISLAND_6_VIOLET_RIFT_L${level}`;
  addPlinth(group, level === 3 ? 1.48 : 1.3, materials, quality);
  const well = cylinder(0.58 + level * 0.08, 0.66 + level * 0.08, 0.26, materials.basalt, segmentCount(quality));
  well.position.y = 0.58;
  group.add(well);
  addRing(group, 0.48 + level * 0.08, 0.045, 0.72, materials.gold, 34);
  const portalPool = new THREE.Mesh(new THREE.CircleGeometry(0.45 + level * 0.08, segmentCount(quality) * 2), materials.portal.clone());
  portalPool.rotation.x = -Math.PI / 2;
  portalPool.position.y = 0.725;
  portalPool.name = 'ISLAND_6_PORTAL_SURFACE';
  group.add(portalPool);
  const pylonCount = level === 1 ? 2 : level === 2 ? 4 : 6;
  for (let index = 0; index < pylonCount; index += 1) {
    const angle = index / pylonCount * Math.PI * 2 + 0.34;
    addRiftPylon(group, Math.sin(angle) * 0.9, Math.cos(angle) * 0.9, 0.45 + level * 0.12, materials, quality);
  }
  if (level >= 2) {
    const verticalPortal = new THREE.Mesh(new THREE.CircleGeometry(level === 3 ? 0.72 : 0.54, segmentCount(quality) * 2), materials.portal.clone());
    verticalPortal.position.set(0, level === 3 ? 1.62 : 1.42, -0.34);
    verticalPortal.name = 'ISLAND_6_PORTAL_SURFACE';
    group.add(verticalPortal);
    const gateRing = new THREE.Mesh(new THREE.TorusGeometry(level === 3 ? 0.8 : 0.61, 0.08, 7, 36), materials.gold);
    gateRing.position.copy(verticalPortal.position);
    group.add(gateRing);
    addCrescent(group, 0, verticalPortal.position.y + 0.02, -0.34, level === 3 ? 0.98 : 0.76, materials);
    const lab = box(level === 3 ? 1.08 : 0.82, level === 3 ? 0.82 : 0.62, 0.5, materials.indigo);
    lab.position.set(0, 0.92, 0.76);
    group.add(lab);
    addWarmArchedWindow(group, 0, 0.98, 1.02, 0, level === 3 ? 1.15 : 0.86, materials, quality);
  }
  if (level === 3) {
    const runes = new THREE.Group();
    runes.name = 'ISLAND_6_SPINNER';
    const runeCount = quality === 'high' ? 18 : quality === 'medium' ? 12 : 8;
    for (let index = 0; index < runeCount; index += 1) {
      const angle = index / runeCount * Math.PI * 2;
      const rune = new THREE.Mesh(new THREE.OctahedronGeometry(0.055), index % 3 === 0 ? materials.cyan : materials.violet);
      rune.position.set(Math.cos(angle) * 1.02, Math.sin(angle) * 1.02, 0);
      rune.scale.set(0.55, 1.15, 0.45);
      runes.add(rune);
    }
    runes.position.set(0, 1.62, -0.32);
    group.add(runes);
    [-1, 1].forEach((side) => addLantern(group, side * 1.18, 0.62, 0.78, materials, 0.82));
    addBalustrade(group, 1.3, 0.5, materials, quality);
    addStarPaving(group, 1.0, 0.555, materials, quality, 10);
    addCelestialBanner(group, -1.18, 0.52, -0.7, 0.08, materials, 0.78);
    addCelestialBanner(group, 1.18, 0.52, -0.7, -0.08, materials, 0.78);
    const envelopeTable = box(0.56, 0.08, 0.38, materials.gold);
    envelopeTable.position.set(0, 0.73, 1.08);
    const envelope = box(0.34, 0.025, 0.21, materials.parchment);
    envelope.position.set(0, 0.79, 1.08);
    envelope.rotation.y = 0.08;
    group.add(envelopeTable, envelope);
  }
  addFrontStairs(group, 0.88, 0.2, materials, 4);
  return group;
}

function createMoonGate(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island6MoonveilMaterials) {
  const group = new THREE.Group();
  group.name = `ISLAND_6_MOON_GATE_L${level}`;
  const segments = segmentCount(quality);
  addPlinth(group, level === 3 ? 1.9 : level === 2 ? 1.72 : 1.52, materials, quality, 0.12);
  const floor = cylinder(level === 3 ? 1.62 : level === 2 ? 1.45 : 1.25, level === 3 ? 1.7 : level === 2 ? 1.54 : 1.34, 0.18, materials.indigo, segments);
  floor.position.y = 0.43;
  group.add(floor);
  addRing(group, level === 3 ? 1.34 : level === 2 ? 1.18 : 1.02, 0.048, 0.54, materials.gold, 48);
  addStarPaving(group, level === 3 ? 1.14 : 0.92, 0.535, materials, quality, level === 3 ? 16 : 8);
  if (level >= 2) {
    // The portal belongs to an inhabited sanctuary, rather than hovering as
    // an isolated ring. This warm rear mass remains visible around the portal
    // from the overview and every authored landmark camera.
    const sanctuary = box(level === 3 ? 1.92 : 1.48, level === 3 ? 1.34 : 1.04, 0.76, materials.indigo);
    sanctuary.position.set(0, level === 3 ? 1.22 : 1.06, -0.96);
    group.add(sanctuary);
    addDome(group, 0, level === 3 ? 1.88 : 1.55, -0.96, level === 3 ? 0.86 : 0.68, materials, quality, true);
    [-1, 1].forEach((side) => {
      const towerX = side * (level === 3 ? 1.2 : 0.96);
      const tower = cylinder(level === 3 ? 0.34 : 0.28, level === 3 ? 0.4 : 0.34, level === 3 ? 1.38 : 1.08, materials.indigo, segments);
      tower.position.set(towerX, level === 3 ? 1.22 : 1.08, -0.9);
      group.add(tower);
      addDome(group, towerX, level === 3 ? 1.91 : 1.6, -0.9, level === 3 ? 0.4 : 0.33, materials, quality, true);
      addWarmArchedWindow(group, towerX, level === 3 ? 1.14 : 1.02, -0.49, 0, level === 3 ? 0.88 : 0.7, materials, quality);
      if (level === 3) addStarFinial(group, towerX, 2.45, -0.9, materials, 0.64);
    });
    [-0.6, 0, 0.6].forEach((x) => addWarmArchedWindow(group, x, level === 3 ? 1.22 : 1.08, -0.55, 0, level === 3 ? 0.76 : 0.62, materials, quality));
  }
  const portalRadius = level === 1 ? 0.5 : level === 2 ? 0.76 : 1.02;
  const portalY = level === 1 ? 1.16 : level === 2 ? 1.42 : 1.66;
  const portal = new THREE.Mesh(new THREE.CircleGeometry(portalRadius * 0.82, segments * 2), materials.portal.clone());
  portal.position.set(0, portalY, -0.38);
  portal.name = 'ISLAND_6_PORTAL_SURFACE';
  group.add(portal);
  const ringCount = level;
  const rings = new THREE.Group();
  rings.name = 'ISLAND_6_SPINNER';
  for (let index = 0; index < ringCount; index += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(portalRadius * (0.82 + index * 0.16), 0.055 - index * 0.006, 7, 42), index % 2 ? materials.cyan : materials.gold);
    ring.rotation.set(index * 0.32, index * 0.2, index * 0.14);
    rings.add(ring);
  }
  rings.position.copy(portal.position);
  group.add(rings);
  const pylonCount = level === 1 ? 2 : level === 2 ? 4 : 6;
  for (let index = 0; index < pylonCount; index += 1) {
    const angle = -1.02 + index / Math.max(1, pylonCount - 1) * 2.04;
    const radial = level === 3 ? 1.3 : 1.08;
    addRiftPylon(group, Math.sin(angle) * radial, Math.cos(angle) * radial - 0.32, 0.58 + level * 0.14, materials, quality);
  }
  addCrescent(group, 0, portalY, -0.4, portalRadius * 1.22, materials);
  if (level >= 2) {
    [-1, 1].forEach((side) => addCrescent(group, side * (level === 3 ? 1.18 : 0.94), portalY * 0.82, -0.36, portalRadius * 0.48, materials, side * 0.12));
  }
  if (level === 3) {
    const moons = new THREE.Group();
    moons.name = 'ISLAND_6_ORBITING_MOONS';
    for (let index = 0; index < 3; index += 1) {
      const angle = index / 3 * Math.PI * 2;
      const moon = new THREE.Mesh(new THREE.SphereGeometry(0.11 - index * 0.015, 12, 8), index === 1 ? materials.cyan : materials.egg);
      moon.position.set(Math.cos(angle) * 1.34, Math.sin(angle) * 0.72, 0);
      moons.add(moon);
    }
    moons.position.copy(portal.position);
    group.add(moons);
    addStarFinial(group, 0, 2.9, -0.42, materials, 1.08);
    for (let index = 0; index < 8; index += 1) {
      const angle = index / 8 * Math.PI * 2;
      addCrystal(group, Math.sin(angle) * 1.6, 0.68, Math.cos(angle) * 1.6, 0.11, index % 2 ? materials.violet : materials.cyan, angle);
    }
    addBalustrade(group, 1.58, 0.5, materials, quality, Math.PI);
    [-1, 1].forEach((side) => {
      const shrine = cylinder(0.31, 0.37, 0.84, materials.indigo, segments);
      shrine.position.set(side * 1.24, 0.95, 0.62);
      group.add(shrine);
      addDome(group, side * 1.24, 1.37, 0.62, 0.38, materials, quality, true);
      addWarmArchedWindow(group, side * 1.24, 0.99, 1.0, 0, 0.82, materials, quality);
      addStarFinial(group, side * 1.24, 1.86, 0.62, materials, 0.55);
    });
    addCelestialBanner(group, -1.56, 0.5, -0.72, 0.12, materials, 0.9);
    addCelestialBanner(group, 1.56, 0.5, -0.72, -0.12, materials, 0.9);
  }
  addFrontStairs(group, 1.0, 0.2, materials, 5);
  return group;
}

function createSoftGlowSprite(color: number, opacity: number, scale: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 62);
    gradient.addColorStop(0, 'rgba(255,255,255,0.92)');
    gradient.addColorStop(0.18, 'rgba(255,214,128,0.58)');
    gradient.addColorStop(0.48, 'rgba(158,87,255,0.18)');
    gradient.addColorStop(1, 'rgba(20,8,70,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  }
  const texture: THREE.Texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  }));
  sprite.scale.set(scale, scale, 1);
  return sprite;
}

function createMoonveilNebulaBackdrop(quality: Island3DQuality): THREE.Sprite {
  const size = quality === 'high' ? 1024 : quality === 'medium' ? 768 : 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) return new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, opacity: 0 }));

  const background = context.createRadialGradient(size * 0.52, size * 0.45, size * 0.05, size * 0.5, size * 0.5, size * 0.72);
  background.addColorStop(0, 'rgba(78, 38, 176, 0.78)');
  background.addColorStop(0.3, 'rgba(29, 30, 112, 0.72)');
  background.addColorStop(0.68, 'rgba(8, 12, 50, 0.86)');
  background.addColorStop(1, 'rgba(2, 5, 25, 0)');
  context.fillStyle = background;
  context.fillRect(0, 0, size, size);

  context.globalCompositeOperation = 'screen';
  const armCount = 5;
  const strokeCount = quality === 'high' ? 120 : quality === 'medium' ? 82 : 48;
  for (let stroke = 0; stroke < strokeCount; stroke += 1) {
    const progress = stroke / Math.max(1, strokeCount - 1);
    const arm = stroke % armCount;
    const rotation = arm / armCount * Math.PI * 2 + progress * Math.PI * 3.65;
    const radius = size * (0.045 + progress * 0.39);
    const x = size * 0.52 + Math.cos(rotation) * radius;
    const y = size * 0.47 + Math.sin(rotation) * radius * 0.58;
    const glow = context.createRadialGradient(x, y, 0, x, y, size * (0.018 + progress * 0.045));
    const cyanArm = arm === 1 || arm === 4;
    glow.addColorStop(0, cyanArm ? 'rgba(85, 218, 255, 0.32)' : 'rgba(176, 101, 255, 0.42)');
    glow.addColorStop(0.45, cyanArm ? 'rgba(43, 105, 255, 0.13)' : 'rgba(82, 37, 190, 0.18)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(x, y, size * (0.018 + progress * 0.045), 0, Math.PI * 2);
    context.fill();
  }

  const starCount = quality === 'high' ? 420 : quality === 'medium' ? 280 : 150;
  for (let index = 0; index < starCount; index += 1) {
    const x = ((index * 7919) % 1009) / 1009 * size;
    const y = ((index * 3571 + 127) % 1013) / 1013 * size;
    const radius = index % 37 === 0 ? size * 0.004 : index % 9 === 0 ? size * 0.0022 : size * 0.0009;
    context.fillStyle = index % 5 === 0 ? 'rgba(255, 214, 130, 0.9)' : index % 3 === 0 ? 'rgba(118, 221, 255, 0.86)' : 'rgba(210, 194, 255, 0.78)';
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  const texture: THREE.Texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  new THREE.TextureLoader().load(
    '/assets/islands/island-006/background/moonveil-nebula-sky-portrait-v2.webp',
    (loadedTexture) => {
      loadedTexture.colorSpace = THREE.SRGBColorSpace;
      loadedTexture.wrapS = THREE.ClampToEdgeWrapping;
      loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
      texture.copy(loadedTexture);
      texture.needsUpdate = true;
      loadedTexture.dispose();
    },
  );
  const material = new THREE.SpriteMaterial({
    map: texture,
    color: 0xffffff,
    transparent: true,
    opacity: quality === 'low' ? 0.82 : 0.98,
    blending: THREE.NormalBlending,
    depthWrite: false,
    depthTest: false,
    fog: false,
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.name = 'ISLAND_6_PAINTED_NEBULA_BACKDROP';
  sprite.position.set(6.4, 7.4, -29);
  sprite.scale.set(42, 31, 1);
  sprite.renderOrder = -20;
  return sprite;
}

export function buildIsland6MoonveilLandmark(
  definition: Island5LandmarkDefinition,
  level: BuildLevel,
  quality: Island3DQuality,
  materials: Island6MoonveilMaterials,
) {
  const root = new THREE.Group();
  root.name = `ISLAND_6_MOONVEIL_${definition.id.toUpperCase()}_ROOT`;
  const districtPosition = resolveMoonveilDistrictPosition(definition.position);
  root.position.set(...districtPosition);
  root.userData.sculptRuntime = { clickable: true, explodable: true, world: 'island-006-moonveil' };
  if (level === 0) {
    addPlinth(root, definition.id === 'boss' ? 1.75 : 1.34, materials, quality, 0.12);
  } else {
    const resolved = level as 1 | 2 | 3;
    const building = definition.id === 'hatchery'
      ? createMoonNest(resolved, quality, materials)
      : definition.id === 'habit'
        ? createConstellationCourt(resolved, quality, materials)
        : definition.id === 'wisdom'
          ? createMidnightArchive(resolved, quality, materials)
          : definition.id === 'event'
            ? createVioletRift(resolved, quality, materials)
            : createMoonGate(resolved, quality, materials);
    if (definition.id !== 'boss') building.rotation.y = Math.atan2(-districtPosition[0], -districtPosition[2]);
    const scale = definition.id === 'boss'
      // Moonveil's visual goal is an open, readable astral board. The gate
      // remains the tallest landmark, but it must not swallow the 36-tile
      // route the way a conventional centre castle can.
      ? resolved === 3 ? 1.04 : resolved === 2 ? 1.02 : 0.94
      : resolved === 3 ? 1.38 : resolved === 2 ? 1.14 : 0.98;
    building.scale.setScalar(scale);
    if ((definition.id === 'hatchery' || definition.id === 'wisdom') && resolved === 3) {
      addMoonveilGrandEntrance(building, materials, quality);
    }
    if (definition.id === 'wisdom' && districtPosition[2] > 0 && resolved === 3) {
      addMoonveilRearGallery(building, materials, quality);
    }
    root.add(building);
    const warmCore = new THREE.PointLight(
      0xff9a3d,
      quality === 'high' ? 3.4 + resolved * 2.35 : quality === 'medium' ? 2.2 + resolved * 1.5 : 1.15 + resolved * 0.82,
      definition.id === 'boss' ? 4.8 : 3.6,
      2,
    );
    warmCore.name = 'ISLAND_6_LANDMARK_WARM_CORE_LIGHT';
    warmCore.position.set(0, definition.id === 'boss' ? 1.3 : 1.15, 0.28);
    root.add(warmCore);
    if (resolved >= 2) {
      const halo = createSoftGlowSprite(0xffb04f, resolved === 3 ? 0.5 : 0.28, definition.id === 'boss' ? 3.4 : 2.55);
      halo.name = 'ISLAND_6_LANDMARK_WARM_HALO';
      halo.position.set(0, definition.id === 'boss' ? 1.45 : 1.22, 0.18);
      root.add(halo);
    }
    addWarmCrownLights(
      building,
      definition.id === 'boss' ? 1.66 : 1.18,
      definition.id === 'boss' ? 0.68 : 0.63,
      definition.id === 'boss' ? 18 : 14,
      materials,
      quality,
    );
    // Authoring remains modular, while runtime delivery is batched by shared
    // material. Moving portal pieces are lifted out before the merge so Low
    // really reduces CPU/draw-call pressure without sacrificing the island's
    // essential motion language.
    root.updateMatrixWorld(true);
    const animatedParts: THREE.Object3D[] = [];
    building.traverse((child) => {
      if (
        child.name === 'ISLAND_6_SPINNER'
        || child.name === 'ISLAND_6_ORBITING_MOONS'
        || child.name === 'ISLAND_6_PORTAL_SURFACE'
      ) animatedParts.push(child);
    });
    animatedParts.forEach((part) => root.attach(part));
    compactStaticGeometry(building, `ISLAND6_${definition.id.toUpperCase()}`);
  }
  root.traverse((child) => { child.userData.landmarkId = definition.id; });
  markShadows(root, quality !== 'low');
  return root;
}

function createFloatingShelf(
  x: number,
  z: number,
  radius: number,
  depth: number,
  seed: number,
  materials: Island6MoonveilMaterials,
  quality: Island3DQuality,
) {
  const group = new THREE.Group();
  const isMainShelf = depth > 5;
  group.name = isMainShelf ? 'ISLAND_6_MAIN_FLOATING_SHELF' : 'ISLAND_6_SATELLITE_SHELF';
  group.position.set(x, 0, z);
  const segments = segmentCount(quality);
  const crown = cylinder(radius, radius * 1.025, 0.18, materials.basalt, segments);
  crown.position.y = 0.22;
  crown.scale.z = 0.9 + Math.sin(seed) * 0.025;
  const rim = cylinder(radius * 1.02, radius * 1.08, 0.22, materials.indigo, segments);
  rim.position.y = 0.06;
  rim.scale.z = crown.scale.z;
  const root = new THREE.Mesh(new THREE.ConeGeometry(radius * 1.04, depth, segments), materials.basalt);
  root.position.y = -depth / 2 + 0.02;
  root.rotation.x = Math.PI;
  root.rotation.z = Math.sin(seed * 1.8) * 0.05;
  root.scale.set(0.98 + Math.cos(seed) * 0.02, 1, crown.scale.z * 0.97);
  group.add(crown, rim, root);
  // Layer faceted rock terraces over the long root. They make the underside
  // read as a massive inhabited cliff from phone distance instead of a thin
  // cone wrapped in glowing rings.
  const tierCount = isMainShelf
    ? quality === 'high' ? 5 : quality === 'medium' ? 4 : 3
    : quality === 'high' ? 4 : quality === 'medium' ? 3 : 2;
  for (let index = 0; index < tierCount; index += 1) {
    const progress = (index + 0.38) / tierCount;
    const tierRadiusTop = radius * THREE.MathUtils.lerp(0.88, 0.25, progress);
    const tierRadiusBottom = tierRadiusTop * THREE.MathUtils.lerp(0.9, 0.66, progress);
    const tierHeight = depth * (isMainShelf ? 0.19 : 0.21);
    const tier = cylinder(
      tierRadiusTop,
      tierRadiusBottom,
      tierHeight,
      index % 3 === 1 ? materials.indigo : index % 2 === 0 ? materials.basalt : materials.basaltShade,
      Math.max(8, Math.round(segments * 0.75)),
    );
    tier.position.y = -0.42 - index * depth * (isMainShelf ? 0.16 : 0.18);
    tier.rotation.y = seed * 0.28 + index * 0.31;
    tier.scale.z = crown.scale.z * (0.98 - index * 0.025);
    group.add(tier);
  }
  const outcropCount = quality === 'high'
    ? isMainShelf ? 20 : 12
    : quality === 'medium'
      ? isMainShelf ? 13 : 8
      : isMainShelf ? 8 : 5;
  for (let index = 0; index < outcropCount; index += 1) {
    const progress = 0.14 + ((index * 7) % outcropCount) / outcropCount * 0.7;
    const angle = seed * 1.7 + index / outcropCount * Math.PI * 2;
    const radial = radius * (0.9 - progress * 0.62);
    const size = radius * (0.14 + (index % 4) * 0.02);
    const outcrop = new THREE.Mesh(
      new THREE.DodecahedronGeometry(size, 0),
      index % 4 === 0 ? materials.indigoLight : index % 2 === 0 ? materials.basalt : materials.basaltShade,
    );
    outcrop.position.set(
      Math.cos(angle) * radial,
      -0.35 - progress * depth * 0.9,
      Math.sin(angle) * radial * crown.scale.z,
    );
    outcrop.rotation.set(index * 0.19, angle, seed + index * 0.37);
    outcrop.scale.set(1.28 + index % 3 * 0.18, 1.95 + index % 4 * 0.24, 1.02 + index % 2 * 0.24);
    group.add(outcrop);
  }
  // Offset ledges interrupt the procedural cone silhouette and give the roots
  // the inhabited, eroded cliff rhythm of the painted target. Their moss,
  // crystals and tiny lanterns remain sparse so the tile route stays dominant.
  const ledgeCount = quality === 'high'
    ? isMainShelf ? 13 : 7
    : quality === 'medium'
      ? isMainShelf ? 8 : 5
      : isMainShelf ? 4 : 3;
  for (let index = 0; index < ledgeCount; index += 1) {
    const progress = 0.16 + ((index * 5) % ledgeCount) / Math.max(1, ledgeCount) * 0.58;
    const angle = seed * 0.91 + index / ledgeCount * Math.PI * 2 + (index % 2) * 0.19;
    const radial = radius * (0.88 - progress * 0.48);
    const ledgeWidth = radius * (isMainShelf ? 0.17 : 0.22) * (0.82 + index % 3 * 0.13);
    const ledge = new THREE.Mesh(
      new THREE.DodecahedronGeometry(ledgeWidth, 0),
      index % 3 === 0 ? materials.indigo : materials.basalt,
    );
    ledge.position.set(
      Math.cos(angle) * radial,
      -0.34 - progress * depth * 0.82,
      Math.sin(angle) * radial * crown.scale.z,
    );
    ledge.rotation.set(0.08 + index * 0.03, -angle, index % 2 ? 0.12 : -0.09);
    ledge.scale.set(1.55, 0.34, 1.08);
    group.add(ledge);
    if (quality !== 'low' || index % 2 === 0) {
      const mossPad = cylinder(ledgeWidth * 0.62, ledgeWidth * 0.7, 0.035, materials.moss, 8);
      mossPad.position.copy(ledge.position);
      mossPad.position.y += ledgeWidth * 0.31;
      mossPad.scale.z = 0.68;
      mossPad.rotation.y = -angle;
      group.add(mossPad);
      if (index % 2 === 0) {
        addCrystal(
          group,
          mossPad.position.x,
          mossPad.position.y + 0.11,
          mossPad.position.z,
          Math.max(0.045, ledgeWidth * 0.19),
          index % 4 === 0 ? materials.cyan : materials.violet,
          angle,
        );
      } else if (quality === 'high') {
        addLantern(group, mossPad.position.x, mossPad.position.y + 0.04, mossPad.position.z, materials, 0.34);
      }
    }
  }
  const terrace = cylinder(radius * 0.91, radius * 0.96, 0.14, materials.indigo, segments);
  // Keep the main terrace below the physical route blocks. Its previous top
  // face was coplanar with the tiles and read as false paving/flicker.
  terrace.position.y = isMainShelf ? 0.24 : 0.36;
  terrace.scale.z = crown.scale.z;
  group.add(terrace);
  // Satellite trim is architectural. The same ring on the main shelf crossed
  // directly over the canonical route, so the board intentionally has none.
  if (!isMainShelf) addRing(group, radius * 0.86, 0.042, 0.45, materials.gold, segments * 2);
  if (!isMainShelf) {
    const parapetCount = quality === 'high' ? 14 : quality === 'medium' ? 10 : 7;
    for (let index = 0; index < parapetCount; index += 1) {
      const angle = index / parapetCount * Math.PI * 2 + seed * 0.12;
      const alternatesOpening = index % 4 === 1;
      if (alternatesOpening) continue;
      const parapet = box(0.22, index % 3 === 0 ? 0.34 : 0.25, 0.12, index % 3 === 0 ? materials.gold : materials.basalt);
      parapet.position.set(
        Math.cos(angle) * radius * 0.82,
        0.57 + (index % 3 === 0 ? 0.04 : 0),
        Math.sin(angle) * radius * crown.scale.z * 0.82,
      );
      parapet.rotation.y = -angle;
      group.add(parapet);
    }
  }
  const buttressCount = quality === 'high' ? (isMainShelf ? 24 : 12) : quality === 'medium' ? (isMainShelf ? 16 : 8) : (isMainShelf ? 10 : 6);
  for (let index = 0; index < buttressCount; index += 1) {
    const angle = index / buttressCount * Math.PI * 2 + seed * 0.21;
    const buttress = box(isMainShelf ? 0.13 : 0.1, isMainShelf ? 0.46 : 0.34, 0.18, index % 4 === 0 ? materials.gold : materials.basalt);
    buttress.position.set(Math.cos(angle) * radius * 0.955, 0.18, Math.sin(angle) * radius * crown.scale.z * 0.955);
    buttress.rotation.y = -angle;
    buttress.rotation.z = Math.sin(angle) * 0.06;
    group.add(buttress);
  }
  const toothCount = quality === 'high' ? (isMainShelf ? 24 : 13) : quality === 'medium' ? (isMainShelf ? 16 : 9) : (isMainShelf ? 10 : 6);
  for (let index = 0; index < toothCount; index += 1) {
    const angle = index / toothCount * Math.PI * 2 + seed;
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(radius * (0.08 + index % 3 * 0.012), depth * (0.22 + index % 4 * 0.045), 5), index % 3 === 0 ? materials.indigo : materials.basaltShade);
    tooth.position.set(Math.cos(angle) * radius * (0.62 + index % 2 * 0.08), -depth * (0.24 + index % 3 * 0.05), Math.sin(angle) * radius * crown.scale.z * (0.56 + index % 2 * 0.09));
    tooth.rotation.x = Math.PI;
    tooth.rotation.z = Math.sin(seed + index * 1.2) * 0.12;
    group.add(tooth);
  }
  const bandCount = quality === 'high' ? 2 : 1;
  for (let index = 0; index < bandCount; index += 1) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(radius * (0.82 - index * 0.22), 0.027 + index * 0.006, 5, segments), index % 2 ? materials.violet : materials.indigoLight);
    band.rotation.x = Math.PI / 2;
    band.position.y = -0.5 - index * depth * 0.16;
    band.scale.z = crown.scale.z * (0.96 - index * 0.035);
    group.add(band);
  }
  const veinCount = quality === 'high' ? (radius > 5 ? 9 : 3) : quality === 'medium' ? (radius > 5 ? 6 : 2) : (radius > 5 ? 3 : 1);
  for (let index = 0; index < veinCount; index += 1) {
    const angle = index / veinCount * Math.PI * 2 + seed * 0.63;
    const tangent = angle + Math.PI / 2;
    const startRadius = radius * (0.78 + index % 3 * 0.045);
    const endRadius = radius * (0.28 + index % 2 * 0.1);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(angle) * startRadius, -0.18, Math.sin(angle) * startRadius * crown.scale.z),
      new THREE.Vector3(Math.cos(angle) * radius * 0.62 + Math.cos(tangent) * 0.12, -depth * 0.34, Math.sin(angle) * radius * 0.62 * crown.scale.z + Math.sin(tangent) * 0.12),
      new THREE.Vector3(Math.cos(angle) * endRadius - Math.cos(tangent) * 0.08, -depth * 0.78, Math.sin(angle) * endRadius * crown.scale.z - Math.sin(tangent) * 0.08),
    ]);
    const vein = new THREE.Mesh(
      new THREE.TubeGeometry(curve, quality === 'high' ? 12 : 7, isMainShelf ? 0.028 : 0.02, 4, false),
      index % 4 === 0 ? materials.cyan : materials.violet,
    );
    vein.name = 'ISLAND_6_ROOT_ENERGY_VEIN';
    group.add(vein);
  }
  return group;
}

function createStarField(quality: Island3DQuality, radius: number, count: number, color: number, size: number, seed: number) {
  const resolvedCount = Math.round(count * detailScale(quality));
  const positions = new Float32Array(resolvedCount * 3);
  for (let index = 0; index < resolvedCount; index += 1) {
    const u = ((index * 0.61803398875 + seed * 0.13) % 1);
    const v = ((index * 0.41421356237 + seed * 0.31) % 1);
    const theta = u * Math.PI * 2;
    const phi = Math.acos(THREE.MathUtils.clamp(1 - v * 1.82, -1, 1));
    const jitter = radius * (0.92 + ((index * 37) % 17) / 170);
    positions[index * 3] = Math.sin(phi) * Math.cos(theta) * jitter;
    positions[index * 3 + 1] = Math.cos(phi) * jitter + 9;
    positions[index * 3 + 2] = Math.sin(phi) * Math.sin(theta) * jitter;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.84, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, fog: false });
  const points = new THREE.Points(geometry, material);
  points.name = 'ISLAND_6_PARALLAX_STAR_FIELD';
  return points;
}

function createMoonveilTwinkleLayers(quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_6_DISTANT_TWINKLE_LAYERS';
  const definitions = [
    { radius: 17.5, count: 185, color: 0xffe5a4, size: 0.072, seed: 2.1, opacity: 0.62, rate: 0.72, phase: 0.2 },
    { radius: 21.5, count: 235, color: 0xa9ccff, size: 0.055, seed: 5.7, opacity: 0.5, rate: 0.46, phase: 2.4 },
    { radius: 25, count: 150, color: 0xc693ff, size: 0.085, seed: 8.9, opacity: 0.44, rate: 0.31, phase: 4.3 },
  ];
  definitions.forEach((definition, index) => {
    const layer = createStarField(
      quality,
      definition.radius,
      definition.count,
      definition.color,
      quality === 'low' ? definition.size * 1.35 : definition.size,
      definition.seed,
    );
    layer.name = `ISLAND_6_DISTANT_TWINKLE_LAYER_${index + 1}`;
    layer.position.y = index * 1.2 - 1.4;
    layer.rotation.set(0.05 * index, 0.3 * index, -0.035 * index);
    const material = layer.material as THREE.PointsMaterial;
    material.opacity = definition.opacity;
    layer.userData.baseOpacity = definition.opacity;
    layer.userData.twinkleRate = definition.rate;
    layer.userData.twinklePhase = definition.phase;
    root.add(layer);
  });
  return root;
}

function createMoonveilStreakTexture(headColor: string, tailColor: string, comet = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = comet ? 160 : 96;
  const context = canvas.getContext('2d');
  if (!context) return new THREE.CanvasTexture(canvas);
  const centreY = canvas.height / 2;
  const gradient = context.createLinearGradient(16, centreY, 478, centreY);
  gradient.addColorStop(0, 'rgba(80, 54, 255, 0)');
  gradient.addColorStop(comet ? 0.34 : 0.52, tailColor);
  gradient.addColorStop(0.92, headColor);
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.lineCap = 'round';
  context.strokeStyle = gradient;
  context.lineWidth = comet ? 24 : 11;
  context.shadowBlur = comet ? 30 : 18;
  context.shadowColor = headColor;
  context.beginPath();
  context.moveTo(22, centreY + (comet ? 20 : 8));
  context.quadraticCurveTo(260, centreY + (comet ? 10 : 4), 466, centreY);
  context.stroke();
  const halo = context.createRadialGradient(456, centreY, 1, 456, centreY, comet ? 46 : 22);
  halo.addColorStop(0, 'rgba(255,255,255,1)');
  halo.addColorStop(0.18, headColor);
  halo.addColorStop(0.56, comet ? 'rgba(170,112,255,.48)' : 'rgba(120,210,255,.32)');
  halo.addColorStop(1, 'rgba(80,54,255,0)');
  context.fillStyle = halo;
  context.beginPath();
  context.arc(456, centreY, comet ? 46 : 22, 0, Math.PI * 2);
  context.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createMoonveilStarflareTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const context = canvas.getContext('2d');
  if (!context) return new THREE.CanvasTexture(canvas);
  const halo = context.createRadialGradient(48, 48, 0, 48, 48, 46);
  halo.addColorStop(0, 'rgba(255,255,255,1)');
  halo.addColorStop(0.1, 'rgba(255,238,184,.92)');
  halo.addColorStop(0.34, 'rgba(165,190,255,.3)');
  halo.addColorStop(1, 'rgba(90,55,255,0)');
  context.fillStyle = halo;
  context.fillRect(0, 0, 96, 96);
  context.globalCompositeOperation = 'screen';
  const ray = context.createLinearGradient(0, 48, 96, 48);
  ray.addColorStop(0, 'rgba(255,255,255,0)');
  ray.addColorStop(0.44, 'rgba(255,236,170,.12)');
  ray.addColorStop(0.5, 'rgba(255,255,255,.95)');
  ray.addColorStop(0.56, 'rgba(255,236,170,.12)');
  ray.addColorStop(1, 'rgba(255,255,255,0)');
  context.strokeStyle = ray;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(3, 48);
  context.lineTo(93, 48);
  context.stroke();
  context.save();
  context.translate(48, 48);
  context.rotate(Math.PI / 2);
  context.translate(-48, -48);
  context.strokeStyle = ray;
  context.lineWidth = 1.4;
  context.beginPath();
  context.moveTo(10, 48);
  context.lineTo(86, 48);
  context.stroke();
  context.restore();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createMoonveilStarflares(quality: Island3DQuality) {
  const group = new THREE.Group();
  group.name = 'ISLAND_6_DISTANT_STARFLARES';
  const count = quality === 'high' ? 18 : quality === 'medium' ? 11 : 6;
  const texture = createMoonveilStarflareTexture();
  for (let index = 0; index < count; index += 1) {
    const color = index % 5 === 0 ? 0xffdc87 : index % 3 === 0 ? 0xc09aff : 0xbcecff;
    const material = new THREE.SpriteMaterial({
      map: texture,
      color,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      fog: false,
      toneMapped: false,
    });
    const star = new THREE.Sprite(material);
    star.name = `ISLAND_6_DISTANT_STARFLARE_${index + 1}`;
    const u = ((index * 0.61803398875 + 0.17) % 1);
    const v = ((index * 0.41421356237 + 0.09) % 1);
    const baseScale = 0.16 + (index % 5) * 0.055;
    star.position.set(
      THREE.MathUtils.lerp(-5.2, 5.2, u),
      // Bias the authored flares toward the open portrait sky. Smaller point
      // stars still wrap the full scene, while these readable twinkles avoid
      // disappearing behind the central island silhouette.
      THREE.MathUtils.lerp(-3.6, 3.8, v),
      -10.5 - index % 4 * 1.65,
    );
    star.scale.set(baseScale, baseScale, 1);
    star.userData.baseScale = baseScale;
    star.userData.phase = index * 1.73;
    star.userData.rate = 0.42 + index % 4 * 0.17;
    group.add(star);
  }
  return group;
}

type MoonveilSkyStreak = {
  sprite: THREE.Sprite;
  period: number;
  duration: number;
  delay: number;
  from: THREE.Vector3;
  to: THREE.Vector3;
  arc: number;
};

function createMoonveilFarSkyEvents(quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_6_FAR_SKY_EVENTS';
  const shootingStars: MoonveilSkyStreak[] = [];
  const shootingStarCount = quality === 'high' ? 3 : quality === 'medium' ? 2 : 1;
  const shootingTexture = createMoonveilStreakTexture('rgba(220,246,255,1)', 'rgba(92,141,255,.04)');
  const definitions = [
    { period: 17.5, duration: 1.45, delay: 2.2, from: [-4.8, 3.35, -10], to: [4.7, 1.05, -10], arc: 0.62, rotation: -0.18 },
    { period: 23, duration: 1.8, delay: 10.4, from: [4.7, 4.1, -12], to: [-4.5, 1.35, -12], arc: 0.78, rotation: Math.PI + 0.16 },
    { period: 31, duration: 2.05, delay: 19.1, from: [-4.3, 4.6, -14], to: [4.8, 1.9, -14], arc: 0.92, rotation: -0.2 },
  ] as const;
  definitions.slice(0, shootingStarCount).forEach((definition, index) => {
    const material = new THREE.SpriteMaterial({
      map: shootingTexture,
      color: index === 1 ? 0xd4b7ff : 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      fog: false,
      toneMapped: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.name = `ISLAND_6_SHOOTING_STAR_${index + 1}`;
    sprite.scale.set(quality === 'low' ? 2.4 : 3.1 + index * 0.3, quality === 'low' ? 0.46 : 0.56, 1);
    sprite.material.rotation = definition.rotation;
    sprite.visible = false;
    root.add(sprite);
    shootingStars.push({
      sprite,
      period: definition.period,
      duration: definition.duration,
      delay: definition.delay,
      from: new THREE.Vector3(...definition.from),
      to: new THREE.Vector3(...definition.to),
      arc: definition.arc,
    });
  });

  const cometMaterial = new THREE.SpriteMaterial({
    map: createMoonveilStreakTexture('rgba(255,247,205,1)', 'rgba(139,72,255,.05)', true),
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    fog: false,
    toneMapped: false,
    rotation: -0.11,
  });
  const comet = new THREE.Sprite(cometMaterial);
  comet.name = 'ISLAND_6_SIGNATURE_COMET';
  comet.scale.set(quality === 'low' ? 3.0 : 3.65, quality === 'low' ? 0.62 : 0.74, 1);
  comet.position.set(-5.2, 7.4, -11);
  comet.visible = false;
  root.add(comet);
  return { root, shootingStars, comet };
}

function createSpiralGalaxy(quality: Island3DQuality) {
  const group = new THREE.Group();
  group.name = 'ISLAND_6_SPIRAL_GALAXY';
  const armCount = 4;
  const pointsPerArm = quality === 'high' ? 170 : quality === 'medium' ? 110 : 64;
  const positions = new Float32Array(armCount * pointsPerArm * 3);
  const colors = new Float32Array(armCount * pointsPerArm * 3);
  const violet = new THREE.Color(0x9f62ff);
  const cyan = new THREE.Color(0x60dfff);
  for (let arm = 0; arm < armCount; arm += 1) {
    for (let index = 0; index < pointsPerArm; index += 1) {
      const offset = (arm * pointsPerArm + index) * 3;
      const progress = index / Math.max(1, pointsPerArm - 1);
      const angle = progress * Math.PI * 4.7 + arm / armCount * Math.PI * 2;
      const radius = 0.28 + progress * 5.4;
      const wobble = Math.sin(index * 12.9898 + arm * 31.17) * (0.05 + progress * 0.16);
      positions[offset] = Math.cos(angle) * radius + Math.cos(angle + Math.PI / 2) * wobble;
      positions[offset + 1] = Math.sin(angle) * radius * 0.54 + Math.sin(angle + Math.PI / 2) * wobble;
      positions[offset + 2] = Math.sin(index * 4.12 + arm) * 0.06;
      const color = progress < 0.34 ? cyan : violet;
      colors[offset] = color.r;
      colors[offset + 1] = color.g;
      colors[offset + 2] = color.b;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({
    size: quality === 'low' ? 0.22 : 0.12,
    transparent: true,
    opacity: 0.08,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
    fog: false,
  }));
  const hazeCount = quality === 'high' ? 360 : quality === 'medium' ? 220 : 110;
  const hazePositions = new Float32Array(hazeCount * 3);
  for (let index = 0; index < hazeCount; index += 1) {
    const u = ((index * 0.61803398875 + 0.17) % 1);
    const v = ((index * 0.41421356237 + 0.43) % 1);
    const radius = Math.sqrt(u) * 5.35;
    const angle = v * Math.PI * 2 + radius * 0.34;
    hazePositions[index * 3] = Math.cos(angle) * radius;
    hazePositions[index * 3 + 1] = Math.sin(angle) * radius * 0.48;
    hazePositions[index * 3 + 2] = -0.05 + Math.sin(index * 7.13) * 0.09;
  }
  const hazeGeometry = new THREE.BufferGeometry();
  hazeGeometry.setAttribute('position', new THREE.BufferAttribute(hazePositions, 3));
  const haze = new THREE.Points(hazeGeometry, new THREE.PointsMaterial({
    color: 0x7137e8,
    size: quality === 'low' ? 0.34 : 0.28,
    transparent: true,
    opacity: 0.035,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
    fog: false,
  }));
  const core = new THREE.Mesh(
    new THREE.CircleGeometry(0.72, quality === 'low' ? 20 : 36),
    new THREE.MeshBasicMaterial({ color: 0x6c35ff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }),
  );
  group.add(haze, points, core);
  // Keep the galaxy inside the shared Overview frustum. The common camera is
  // intentionally immutable across islands, so the backdrop is composed to
  // that camera rather than solved with an Island-006-only camera offset.
  group.position.set(6.8, -2.4, -12.5);
  group.rotation.z = -0.28;
  group.scale.setScalar(1.18);
  return group;
}

function createMoonveilConstellation(quality: Island3DQuality, materials: Island6MoonveilMaterials) {
  const group = new THREE.Group();
  group.name = 'ISLAND_6_GOLD_CONSTELLATION';
  const nodes = [
    new THREE.Vector3(-2.5, -0.4, 0),
    new THREE.Vector3(-1.4, 0.55, 0),
    new THREE.Vector3(-0.25, 0.15, 0),
    new THREE.Vector3(0.82, 1.0, 0),
    new THREE.Vector3(2.18, 0.42, 0),
    new THREE.Vector3(1.25, -0.55, 0),
  ];
  const edges = [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5]] as const;
  edges.forEach(([start, end]) => {
    const geometry = new THREE.BufferGeometry().setFromPoints([nodes[start], nodes[end]]);
    group.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xe8bd68, transparent: true, opacity: 0.58, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
  });
  nodes.forEach((node, index) => {
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(index === 2 ? 0.16 : 0.105, 0), index === 2 ? materials.amber : materials.gold);
    star.position.copy(node);
    group.add(star);
  });
  group.position.set(-7.2, 0.4, -12.8);
  group.scale.setScalar(quality === 'low' ? 0.82 : 1);
  return group;
}

function addEnergyFall(
  root: THREE.Group,
  angle: number,
  radius: number,
  length: number,
  width: number,
  index: number,
  materials: Island6MoonveilMaterials,
  quality: Island3DQuality,
): THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial> {
  const material = (index % 2 ? materials.violet : materials.cyan).clone();
  material.opacity = index % 2 ? 0.4 : 0.46;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius * 0.9;
  const tangent = angle + Math.PI / 2;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(x, 0.34, z),
    new THREE.Vector3(x + Math.cos(tangent) * width * 0.7, -length * 0.28, z + Math.sin(tangent) * width * 0.7),
    new THREE.Vector3(x - Math.cos(tangent) * width * 0.48, -length * 0.62, z - Math.sin(tangent) * width * 0.48),
    new THREE.Vector3(x + Math.cos(tangent) * width * 0.32, -length + 0.08, z + Math.sin(tangent) * width * 0.32),
  ]);
  const ribbon = new THREE.Mesh(
      new THREE.TubeGeometry(curve, quality === 'high' ? 18 : quality === 'medium' ? 12 : 7, width * 0.42, quality === 'high' ? 7 : 5, false),
    material,
  );
  ribbon.name = 'ISLAND_6_ENERGY_FALL';
  ribbon.userData.phase = index * 0.73;
  ribbon.userData.baseOpacity = material.opacity;
  root.add(ribbon);
  const source = new THREE.Mesh(new THREE.TorusGeometry(width * 0.62, 0.04, 5, 18), index % 2 ? materials.violet : materials.cyan);
  source.rotation.x = Math.PI / 2;
  source.position.set(x, 0.34, z);
  root.add(source);
  return ribbon;
}

function createDistantShard(index: number, quality: Island3DQuality, materials: Island6MoonveilMaterials) {
  const group = new THREE.Group();
  group.name = `ISLAND_6_DISTANT_SHARD_${index + 1}`;
  const archetype = index % 6;
  const radius = [0.62, 0.88, 0.74, 1.08, 0.52, 0.82][archetype];
  const depth = [1.8, 2.7, 2.15, 3.2, 1.45, 2.45][archetype];
  const cap = cylinder(radius, radius * 1.04, 0.1, archetype % 2 ? materials.indigo : materials.basalt, segmentCount(quality));
  const rock = new THREE.Mesh(new THREE.ConeGeometry(radius * 1.02, depth, segmentCount(quality)), materials.basaltShade);
  rock.rotation.x = Math.PI;
  rock.position.y = -depth / 2;
  group.add(cap, rock);
  if (archetype === 0) addStarFinial(group, 0, 0.48, 0, materials, 0.56);
  else if (archetype === 1) addCrescent(group, 0, 0.58, 0, 0.3, materials);
  else if (archetype === 2) addDome(group, 0, 0.12, 0, 0.34, materials, quality, true);
  else if (archetype === 3) {
    for (let pylon = 0; pylon < (quality === 'low' ? 2 : 4); pylon += 1) {
      const angle = pylon / 4 * Math.PI * 2;
      addRiftPylon(group, Math.sin(angle) * 0.4, Math.cos(angle) * 0.4, 0.38, materials, quality);
    }
  } else if (archetype === 4) addCrystal(group, 0, 0.35, 0, 0.22, materials.violet, index);
  else addLantern(group, 0, 0.12, 0, materials, 0.8);
  return group;
}

function createMoonveilCelestialCruiser(quality: Island3DQuality, materials: Island6MoonveilMaterials) {
  const orbit = new THREE.Group();
  orbit.name = 'ISLAND_6_CELESTIAL_CRUISER_ORBIT';
  // Anchor a distant flight corridor inside the shared portrait overview.
  // Moving this anchor gently keeps the craft visible without making it orbit
  // behind the island or leave the narrow phone frustum for most of its cycle.
  orbit.position.set(0.65, 2.35, -11.6);
  orbit.userData.basePosition = orbit.position.clone();
  const cruiser = new THREE.Group();
  cruiser.name = 'ISLAND_6_CELESTIAL_CRUISER';
  // Faceted wings, a luminous cockpit, triple exhausts and a celestial nav
  // ring create an unambiguous spacecraft silhouette at phone scale.
  cruiser.position.set(0, 0, 0);
  cruiser.rotation.set(-0.08, -0.2, 0.04);
  cruiser.scale.setScalar(quality === 'low' ? 1.02 : 1.36);

  const hull = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, quality === 'low' ? 12 : 20, quality === 'low' ? 8 : 12),
    materials.indigo,
  );
  hull.name = 'ISLAND_6_CRUISER_HULL';
  hull.scale.set(1.72, 0.48, 0.56);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.92, quality === 'low' ? 8 : 14), materials.gold);
  nose.name = 'ISLAND_6_CRUISER_NOSE';
  nose.position.x = 1.34;
  nose.rotation.z = -Math.PI / 2;
  nose.scale.set(0.72, 1, 0.92);
  const cockpit = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, quality === 'low' ? 12 : 20, quality === 'low' ? 7 : 10),
    materials.cyan,
  );
  cockpit.name = 'ISLAND_6_CRUISER_COCKPIT';
  cockpit.position.set(0.35, 0.3, 0);
  cockpit.scale.set(1.12, 0.52, 0.76);
  const cockpitFrame = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.035, 6, 24, Math.PI), materials.gold);
  cockpitFrame.position.set(0.35, 0.31, 0);
  cockpitFrame.rotation.set(Math.PI / 2, 0, -Math.PI / 2);
  const hullBandA = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 6, 20), materials.gold);
  hullBandA.name = 'ISLAND_6_CRUISER_HULL_BAND';
  hullBandA.position.x = -0.28;
  hullBandA.rotation.y = Math.PI / 2;
  hullBandA.scale.set(1, 0.74, 1);
  const hullBandB = hullBandA.clone();
  hullBandB.position.x = 0.34;
  const keel = box(1.28, 0.09, 0.16, materials.gold);
  keel.name = 'ISLAND_6_CRUISER_GOLD_KEEL';
  keel.position.set(-0.06, -0.31, 0);
  const keelCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), materials.violet);
  keelCrystal.name = 'ISLAND_6_CRUISER_KEEL_CRYSTAL';
  keelCrystal.position.set(0.32, -0.38, 0);
  keelCrystal.scale.set(1.35, 0.72, 0.72);

  const portholeCount = quality === 'low' ? 2 : 4;
  for (let index = 0; index < portholeCount; index += 1) {
    const portholeX = -0.55 + index * (1.08 / Math.max(1, portholeCount - 1));
    [-1, 1].forEach((side) => {
      const frame = cylinder(0.07, 0.07, 0.035, materials.gold, 9);
      frame.name = 'ISLAND_6_CRUISER_PORTHOLE_FRAME';
      frame.position.set(portholeX, 0.03, side * 0.345);
      frame.rotation.x = Math.PI / 2;
      const glass = new THREE.Mesh(new THREE.CircleGeometry(0.045, 10), index % 2 ? materials.cyan : materials.warmGlass);
      glass.name = 'ISLAND_6_CRUISER_PORTHOLE';
      glass.position.set(portholeX, 0.03, side * 0.367);
      if (side < 0) glass.rotation.y = Math.PI;
      cruiser.add(frame, glass);
    });
  }

  const wingGeometry = new THREE.ConeGeometry(0.58, 1.52, 3);
  [-1, 1].forEach((side) => {
    const wing = new THREE.Mesh(wingGeometry, side > 0 ? materials.indigoLight : materials.indigo);
    wing.name = `ISLAND_6_CRUISER_WING_${side > 0 ? 'STARBOARD' : 'PORT'}`;
    wing.position.set(-0.12, -0.04, side * 0.72);
    wing.rotation.set(0, side * Math.PI / 2, -Math.PI / 2);
    wing.scale.set(0.58, 1, 0.16);
    cruiser.add(wing);
    const wingTrim = box(0.84, 0.055, 0.06, materials.gold);
    wingTrim.name = 'ISLAND_6_CRUISER_WING_TRIM';
    wingTrim.position.set(-0.18, 0.02, side * 0.91);
    wingTrim.rotation.y = side * -0.38;
    cruiser.add(wingTrim);
    const wingTipBeacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 0), side > 0 ? materials.cyan : materials.violet);
    wingTipBeacon.name = 'ISLAND_6_CRUISER_WINGTIP_BEACON';
    wingTipBeacon.position.set(-0.22, 0.015, side * 1.08);
    wingTipBeacon.scale.set(0.75, 1.45, 0.75);
    cruiser.add(wingTipBeacon);
  });

  const engineCount = quality === 'low' ? 2 : 3;
  for (let index = 0; index < engineCount; index += 1) {
    const z = engineCount === 2 ? (index === 0 ? -0.42 : 0.42) : (index - 1) * 0.42;
    const engine = new THREE.Group();
    engine.name = 'ISLAND_6_CRUISER_ENGINE';
    engine.position.set(-1.0, -0.02, z);
    engine.userData.phase = index * 1.7;
    const casing = cylinder(0.16, 0.2, 0.48, materials.gold, quality === 'low' ? 8 : 12);
    casing.rotation.z = Math.PI / 2;
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 7), index === 1 ? materials.violet : materials.cyan);
    core.position.x = -0.25;
    core.name = 'ISLAND_6_CRUISER_ENGINE_CORE';
    const exhaust = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.86, 10), index === 1 ? materials.violet : materials.cyan);
    exhaust.position.x = -0.72;
    exhaust.rotation.z = Math.PI / 2;
    exhaust.scale.y = 1.25;
    exhaust.name = 'ISLAND_6_CRUISER_EXHAUST';
    exhaust.userData.explodeWithParent = true;
    engine.add(casing, core, exhaust);
    cruiser.add(engine);
  }

  const dorsalRing = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.045, 6, 28), materials.gold);
  dorsalRing.name = 'ISLAND_6_CRUISER_NAV_RING';
  dorsalRing.position.set(-0.28, 0.58, 0);
  dorsalRing.rotation.y = Math.PI / 2;
  const navCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), materials.violet);
  navCore.name = 'ISLAND_6_CRUISER_NAV_CORE';
  navCore.position.copy(dorsalRing.position);
  const tailFin = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.72, 3), materials.indigoLight);
  tailFin.name = 'ISLAND_6_CRUISER_TAIL_FIN';
  tailFin.position.set(-0.82, 0.5, 0);
  tailFin.rotation.z = Math.PI;
  tailFin.scale.z = 0.26;
  const antenna = cylinder(0.025, 0.035, 0.48, materials.gold, 7);
  antenna.position.set(0.08, 0.73, 0);
  const antennaLight = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), materials.amber);
  antennaLight.position.set(0.08, 0.99, 0);
  [-1, 1].forEach((side) => {
    const navLight = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 5), side > 0 ? materials.cyan : materials.violet);
    navLight.position.set(0.12, 0.05, side * 1.0);
    cruiser.add(navLight);
  });
  const cruiserHalo = createSoftGlowSprite(0x5fdfff, quality === 'low' ? 0.15 : 0.22, quality === 'low' ? 1.9 : 2.6);
  cruiserHalo.name = 'ISLAND_6_CRUISER_AURA';
  cruiserHalo.position.set(-0.18, 0.04, 0.05);
  cruiser.add(cruiserHalo);
  cruiser.add(hull, nose, cockpit, cockpitFrame, hullBandA, hullBandB, keel, keelCrystal, dorsalRing, navCore, tailFin, antenna, antennaLight);
  cruiser.userData.sculptRuntime = { clickable: true, explodable: true, world: 'island-006-moonveil', role: 'ambient-spacecraft' };
  orbit.add(cruiser);
  return orbit;
}

function addNightFoliage(root: THREE.Group, materials: Island6MoonveilMaterials, quality: Island3DQuality) {
  const count = Math.round(38 * detailScale(quality));
  for (let index = 0; index < count; index += 1) {
    const angle = index / count * Math.PI * 2 + 0.17;
    const protectedAngles = [-2.41, -0.73, 2.41, 0.73];
    if (protectedAngles.some((entry) => Math.abs(Math.atan2(Math.sin(angle - entry), Math.cos(angle - entry))) < 0.24)) continue;
    // This is a sanctuary garden inside the route, never route dressing.
    const radius = 2.02 + (index % 5) * 0.09;
    const shrub = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14 + index % 3 * 0.025, quality === 'high' ? 1 : 0), index % 4 === 0 ? materials.foliageLight : materials.foliage);
    shrub.position.set(Math.cos(angle) * radius, 0.54 + index % 2 * 0.03, Math.sin(angle) * radius * 0.92);
    shrub.scale.set(1.3, 0.72, 1.02);
    if (!isIsland6RouteCorridorClear(shrub.position.x, shrub.position.z, 0.24)) continue;
    root.add(shrub);
  }
}

function addSatelliteMoonGarden(
  root: THREE.Group,
  x: number,
  z: number,
  radius: number,
  seed: number,
  materials: Island6MoonveilMaterials,
  quality: Island3DQuality,
) {
  const detail = quality === 'high' ? 18 : quality === 'medium' ? 12 : 7;
  for (let index = 0; index < detail; index += 1) {
    const angle = index / detail * Math.PI * 2 + seed;
    const distance = radius * (0.64 + (index % 4) * 0.065);
    const shrub = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.105 + index % 3 * 0.024, quality === 'high' ? 1 : 0),
      index % 5 === 0 ? materials.foliageLight : index % 3 === 0 ? materials.moss : materials.foliage,
    );
    shrub.position.set(x + Math.cos(angle) * distance, 0.53 + index % 2 * 0.025, z + Math.sin(angle) * distance * 0.9);
    shrub.scale.set(1.28, 0.72, 1.04);
    root.add(shrub);
    if (index % 3 === 0) {
      const flower = new THREE.Mesh(new THREE.OctahedronGeometry(0.038 + index % 2 * 0.008, 0), materials.nightFlower);
      flower.position.set(shrub.position.x, shrub.position.y + 0.13, shrub.position.z);
      flower.rotation.y = angle;
      flower.scale.set(1.05, 0.52, 1.05);
      root.add(flower);
    }
  }

  const crystalCount = quality === 'high' ? 7 : quality === 'medium' ? 5 : 3;
  for (let index = 0; index < crystalCount; index += 1) {
    const angle = seed * 1.7 + index / crystalCount * Math.PI * 2;
    const distance = radius * (0.68 + index % 2 * 0.12);
    addCrystal(
      root,
      x + Math.cos(angle) * distance,
      0.54,
      z + Math.sin(angle) * distance * 0.9,
      0.07 + index % 3 * 0.015,
      index % 2 ? materials.violet : materials.cyan,
      angle,
    );
  }
  const lanternCount = quality === 'high' ? 8 : quality === 'medium' ? 5 : 3;
  for (let index = 0; index < lanternCount; index += 1) {
    const angle = seed * 0.43 + index / lanternCount * Math.PI * 2;
    const distance = radius * 0.78;
    addLantern(
      root,
      x + Math.cos(angle) * distance,
      0.53,
      z + Math.sin(angle) * distance * 0.9,
      materials,
      quality === 'high' ? 0.62 : 0.5,
    );
  }
  const treeCount = quality === 'high' ? 4 : quality === 'medium' ? 3 : 2;
  for (let index = 0; index < treeCount; index += 1) {
    const angle = seed * 0.82 + index / treeCount * Math.PI * 2 + 0.34;
    const distance = radius * (0.56 + index % 2 * 0.13);
    const treeX = x + Math.cos(angle) * distance;
    const treeZ = z + Math.sin(angle) * distance * 0.9;
    const treeHeight = 0.5 + index % 3 * 0.08;
    const trunk = cylinder(0.035, 0.055, treeHeight, materials.wood, 7);
    trunk.position.set(treeX, 0.52 + treeHeight / 2, treeZ);
    root.add(trunk);
    for (let crownIndex = 0; crownIndex < 3; crownIndex += 1) {
      const crown = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.17 - crownIndex * 0.018, quality === 'high' ? 1 : 0),
        crownIndex === 1 ? materials.foliageLight : materials.foliage,
      );
      crown.position.set(
        treeX + (crownIndex - 1) * 0.13,
        0.85 + treeHeight * 0.66 + crownIndex % 2 * 0.08,
        treeZ + Math.sin(angle + crownIndex) * 0.08,
      );
      crown.scale.set(1.3, 0.9, 1.05);
      root.add(crown);
    }
    addStarFinial(root, treeX, 1.25 + treeHeight * 0.45, treeZ, materials, 0.27);
  }
  const districtPylonCount = quality === 'high' ? 6 : quality === 'medium' ? 4 : 3;
  for (let index = 0; index < districtPylonCount; index += 1) {
    const angle = seed * 1.13 + index / districtPylonCount * Math.PI * 2;
    const distance = radius * 0.9;
    const pylonX = x + Math.cos(angle) * distance;
    const pylonZ = z + Math.sin(angle) * distance * 0.9;
    const shaft = box(0.12, 0.58, 0.12, index % 2 ? materials.basalt : materials.indigo);
    shaft.position.set(pylonX, 0.82, pylonZ);
    shaft.rotation.y = -angle;
    root.add(shaft);
    addStarFinial(root, pylonX, 1.22, pylonZ, materials, 0.38);
  }
}

function addAstralBridge(
  root: THREE.Group,
  targetX: number,
  targetZ: number,
  materials: Island6MoonveilMaterials,
  quality: Island3DQuality,
) {
  const angle = Math.atan2(targetX, targetZ);
  const tangentX = Math.cos(angle);
  const tangentZ = -Math.sin(angle);
  const targetRadius = Math.hypot(targetX, targetZ);
  // The first step meets the shelf edge, while posts and rails begin beyond
  // the outer route clearance instead of projecting over a playable tile.
  const bridgeStartRadius = ISLAND_6_ROUTE_CLEARANCE_OUTER_RADIUS + 0.23;
  const bridgeEndRadius = Math.max(bridgeStartRadius + 0.75, targetRadius - 0.72);
  const stepCount = quality === 'low' ? 5 : quality === 'medium' ? 7 : 9;
  for (let index = 0; index < stepCount; index += 1) {
    const progress = index / Math.max(1, stepCount - 1);
    const radius = THREE.MathUtils.lerp(bridgeStartRadius, bridgeEndRadius, progress);
    const stepWidth = 1.22 - progress * 0.1;
    const step = box(stepWidth, 0.13, 0.36, index % 2 ? materials.indigoLight : materials.indigo);
    step.position.set(Math.sin(angle) * radius, 0.5 + progress * 0.035, Math.cos(angle) * radius);
    step.rotation.y = angle;
    root.add(step);
    const goldStepEdge = box(stepWidth * 0.94, 0.035, 0.04, materials.gold);
    goldStepEdge.position.copy(step.position);
    goldStepEdge.position.x += Math.sin(angle) * 0.18;
    goldStepEdge.position.z += Math.cos(angle) * 0.18;
    goldStepEdge.position.y += 0.085;
    goldStepEdge.rotation.y = angle;
    root.add(goldStepEdge);
    if (index === 0 || index === stepCount - 1 || (quality === 'high' && index % 2 === 0)) {
      [-1, 1].forEach((side) => {
        const x = step.position.x + tangentX * side * stepWidth * 0.49;
        const z = step.position.z + tangentZ * side * stepWidth * 0.49;
        const railPost = cylinder(0.045, 0.055, 0.44, materials.gold, 7);
        railPost.position.set(x, 0.76, z);
        root.add(railPost);
        if (index === 0 || index === stepCount - 1) addLantern(root, x, 0.96, z, materials, 0.5);
      });
    }
  }
  const railLength = bridgeEndRadius - bridgeStartRadius + 0.42;
  [-1, 1].forEach((side) => {
    const rail = box(0.055, 0.055, railLength, materials.gold);
    const radius = (bridgeStartRadius + bridgeEndRadius) / 2;
    rail.position.set(
      Math.sin(angle) * radius + tangentX * side * 0.54,
      0.93,
      Math.cos(angle) * radius + tangentZ * side * 0.54,
    );
    rail.rotation.y = angle;
    root.add(rail);
  });
}

export function createIsland6MoonveilLivingAmbience(
  scene: THREE.Scene,
  profile: Island3DQualityProfile,
  materials: Island6MoonveilMaterials,
  ocean: THREE.Mesh,
): Island6MoonveilAmbienceRuntime {
  const root = new THREE.Group();
  root.name = 'ISLAND_6_MOONVEIL_LIVING_AMBIENCE';
  root.userData.sculptRuntime = { clickable: true, explodable: true, world: 'island-006-moonveil' };
  const quality = profile.id;
  ocean.visible = false;

  const staticScenery = new THREE.Group();
  staticScenery.name = 'ISLAND_6_STATIC_SCENERY_AUTHORING_ROOT';
  root.add(staticScenery);
  staticScenery.add(createFloatingShelf(0, 0, 4.18, 6.9, 0.37, materials, quality));
  const satellites: Array<[number, number, number, number, number]> = [
    [-2.96, -6.05, 2.15, 4.35, 1.1],
    [2.96, -6.05, 2.05, 3.78, 2.3],
    [-2.96, 6.05, 2.2, 4.75, 3.4],
    [2.96, 6.05, 2.05, 4.12, 4.6],
  ];
  satellites.forEach(([x, z, radius, depth, seed]) => {
    staticScenery.add(createFloatingShelf(x, z, radius, depth, seed, materials, quality));
    addAstralBridge(staticScenery, x, z, materials, quality);
    addSatelliteMoonGarden(staticScenery, x, z, radius, seed, materials, quality);
    const architecturalGlow = new THREE.PointLight(0xff9738, quality === 'high' ? 10.5 : quality === 'medium' ? 6.5 : 3.2, 6.4, 1.8);
    architecturalGlow.position.set(x, 1.85, z + 0.18);
    root.add(architecturalGlow);
    const warmHalo = createSoftGlowSprite(0xffa13d, quality === 'high' ? 0.34 : quality === 'medium' ? 0.25 : 0.17, radius * 2.35);
    warmHalo.name = 'ISLAND_6_SATELLITE_WARM_HALO';
    warmHalo.position.set(x, 1.2, z + 0.08);
    root.add(warmHalo);
  });

  const sanctuaryCrystalCount = Math.round(22 * detailScale(quality));
  for (let index = 0; index < sanctuaryCrystalCount; index += 1) {
    const angle = index / sanctuaryCrystalCount * Math.PI * 2 + 0.11;
    const bridgeAngles = [-2.41, -0.73, 2.41, 0.73];
    if (bridgeAngles.some((entry) => Math.abs(Math.atan2(Math.sin(angle - entry), Math.cos(angle - entry))) < 0.18)) continue;
    const radius = 2.22 + (index % 3) * 0.08;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius * 0.9;
    const size = 0.07 + index % 3 * 0.012;
    if (!isIsland6RouteCorridorClear(x, z, size * 1.4)) continue;
    addCrystal(staticScenery, x, 0.48 + index % 3 * 0.035, z, size, index % 3 === 0 ? materials.cyan : materials.violet, angle);
  }
  addNightFoliage(staticScenery, materials, quality);
  const sanctuaryLanternCount = quality === 'high' ? 10 : quality === 'medium' ? 7 : 4;
  for (let index = 0; index < sanctuaryLanternCount; index += 1) {
    const angle = index / sanctuaryLanternCount * Math.PI * 2;
    const bridgeAngles = [-2.41, -0.73, 2.41, 0.73];
    if (bridgeAngles.some((entry) => Math.abs(Math.atan2(Math.sin(angle - entry), Math.cos(angle - entry))) < 0.16)) continue;
    const x = Math.cos(angle) * 2.5;
    const z = Math.sin(angle) * 2.34;
    if (!isIsland6RouteCorridorClear(x, z, 0.12)) continue;
    addLantern(staticScenery, x, 0.38, z, materials, 0.58);
  }

  const energyFalls: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>[] = [];
  const fallCount = quality === 'high' ? 10 : quality === 'medium' ? 7 : 4;
  for (let index = 0; index < fallCount; index += 1) {
    const angle = index / fallCount * Math.PI * 2 + 0.29;
    energyFalls.push(addEnergyFall(root, angle, 4.08, 3.8 + index % 3 * 0.72, 0.2 + index % 3 * 0.07, index, materials, quality));
  }
  satellites.forEach(([x, z, radius], satelliteIndex) => {
    const localFalls = new THREE.Group();
    localFalls.name = `ISLAND_6_SATELLITE_ENERGY_FALLS_${satelliteIndex + 1}`;
    localFalls.position.set(x, 0, z);
    root.add(localFalls);
    const localFallCount = quality === 'high' ? 3 : quality === 'medium' ? 2 : 1;
    for (let fallIndex = 0; fallIndex < localFallCount; fallIndex += 1) {
      const angle = satelliteIndex * 1.17 + fallIndex / localFallCount * Math.PI * 2 + 0.38;
      energyFalls.push(addEnergyFall(
        localFalls,
        angle,
        radius * 0.96,
        2.15 + (satelliteIndex + fallIndex) % 3 * 0.44,
        0.12 + fallIndex * 0.035,
        fallCount + satelliteIndex * localFallCount + fallIndex,
        materials,
        quality,
      ));
    }
  });

  const constellation = createMoonveilConstellation(quality, materials);
  root.add(constellation);

  const nebula = new THREE.Group();
  nebula.name = 'ISLAND_6_VIOLET_NEBULA';
  const nebulaCount = Math.round(260 * detailScale(quality));
  const nebulaPositions = new Float32Array(nebulaCount * 3);
  for (let index = 0; index < nebulaCount; index += 1) {
    const t = index / Math.max(1, nebulaCount - 1) * Math.PI * 5.5;
    const radius = 1.2 + index / Math.max(1, nebulaCount - 1) * 9.4;
    nebulaPositions[index * 3] = 7.4 + Math.cos(t) * radius;
    nebulaPositions[index * 3 + 1] = -0.8 + Math.sin(t * 0.38) * 2.4;
    nebulaPositions[index * 3 + 2] = -15 + Math.sin(t) * radius * 0.46;
  }
  const nebulaGeometry = new THREE.BufferGeometry();
  nebulaGeometry.setAttribute('position', new THREE.BufferAttribute(nebulaPositions, 3));
  const nebulaPoints = new THREE.Points(nebulaGeometry, new THREE.PointsMaterial({ color: 0x8e4cff, size: quality === 'low' ? 0.72 : 0.48, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  nebula.add(nebulaPoints);

  const shards: THREE.Group[] = [];
  const shardCount = quality === 'high' ? 12 : quality === 'medium' ? 8 : 5;
  for (let index = 0; index < shardCount; index += 1) {
    const shard = createDistantShard(index, quality, materials);
    const angle = index / shardCount * Math.PI * 2 + 0.38;
    const radius = 10.8 + index % 4 * 2.2;
    shard.position.set(Math.cos(angle) * radius, 1.6 + index % 5 * 1.3, Math.sin(angle) * radius);
    shard.rotation.y = -angle + index * 0.13;
    shard.scale.setScalar(0.5 + index % 4 * 0.12);
    shard.userData.baseY = shard.position.y;
    shard.userData.phase = index * 0.74;
    root.add(shard);
    shards.push(shard);
  }

  const motes = createStarField(quality, 11, 150, 0xbd87ff, quality === 'low' ? 0.12 : 0.075, 7.2);
  motes.name = 'ISLAND_6_LOCAL_VOID_MOTES';
  motes.position.y = -3;
  root.add(motes);

  const distantTwinkles = createMoonveilTwinkleLayers(quality);
  root.add(distantTwinkles);
  const starflares = createMoonveilStarflares(quality);
  root.add(starflares);
  const farSkyEvents = createMoonveilFarSkyEvents(quality);
  root.add(farSkyEvents.root);

  const celestialCruiserOrbit = createMoonveilCelestialCruiser(quality, materials);
  root.add(celestialCruiserOrbit);
  const celestialCruiser = celestialCruiserOrbit.getObjectByName('ISLAND_6_CELESTIAL_CRUISER');

  const moonLight = new THREE.PointLight(0x6b7dff, quality === 'high' ? 18 : quality === 'medium' ? 12 : 7, 34, 2);
  moonLight.position.set(-7, 10, 7);
  const violetRim = new THREE.PointLight(0xa33dff, quality === 'high' ? 13 : 8, 24, 2);
  violetRim.position.set(8, 4, -7);
  const cyanRim = new THREE.PointLight(0x31dfff, quality === 'high' ? 10 : 6, 20, 2);
  cyanRim.position.set(-7, 2, -5);
  const cliffUnderlight = new THREE.PointLight(0x6653ff, quality === 'high' ? 14 : quality === 'medium' ? 9 : 5, 26, 2);
  cliffUnderlight.position.set(0, -3.2, 4.5);
  root.add(moonLight, violetRim, cyanRim, cliffUnderlight);

  // Merge the hundreds of immobile terrace, bridge, garden and cliff meshes
  // into material batches. Animated falls, galaxies, lights and landmark
  // pieces stay independent above this authoring layer.
  compactStaticGeometry(staticScenery, 'ISLAND6_MOONVEIL_SCENERY');

  scene.add(root);
  markShadows(root, quality !== 'low');

  let animatedDetailsCached = false;
  const spinners: THREE.Object3D[] = [];
  const orbitingMoons: THREE.Object3D[] = [];
  const portalSurfaces: THREE.Mesh[] = [];
  const cruiserEngines: THREE.Object3D[] = [];

  const cacheAnimatedDetails = () => {
    if (animatedDetailsCached) return;
    animatedDetailsCached = true;
    scene.traverse((object) => {
      if (object.name === 'ISLAND_6_SPINNER') spinners.push(object);
      if (object.name === 'ISLAND_6_ORBITING_MOONS') orbitingMoons.push(object);
      if (object.name === 'ISLAND_6_PORTAL_SURFACE' && object instanceof THREE.Mesh) portalSurfaces.push(object);
      if (object.name === 'ISLAND_6_CRUISER_ENGINE') cruiserEngines.push(object);
    });
  };

  return {
    root,
    animate: (elapsed) => {
      cacheAnimatedDetails();
      nebula.rotation.y = Math.sin(elapsed * 0.025) * 0.035;
      motes.rotation.y = elapsed * 0.018;
      distantTwinkles.children.forEach((layer, index) => {
        if (!(layer instanceof THREE.Points) || !(layer.material instanceof THREE.PointsMaterial)) return;
        const baseOpacity = Number(layer.userData.baseOpacity ?? 0.5);
        const rate = Number(layer.userData.twinkleRate ?? 0.5);
        const phase = Number(layer.userData.twinklePhase ?? index);
        const primaryPulse = Math.sin(elapsed * rate + phase);
        const sparklePulse = Math.sin(elapsed * (rate * 3.7) + phase * 1.9);
        layer.material.opacity = baseOpacity * (0.74 + primaryPulse * 0.18 + sparklePulse * 0.08);
        layer.rotation.y += (index % 2 ? -1 : 1) * (0.000045 + index * 0.000012);
      });
      starflares.children.forEach((star, index) => {
        if (!(star instanceof THREE.Sprite) || !(star.material instanceof THREE.SpriteMaterial)) return;
        const phase = Number(star.userData.phase ?? index);
        const rate = Number(star.userData.rate ?? 0.5);
        const baseScale = Number(star.userData.baseScale ?? 0.2);
        const normalized = (Math.sin(elapsed * rate + phase) + 1) * 0.5;
        const sparkle = normalized ** 5;
        star.material.opacity = 0.09 + sparkle * 0.78;
        const scale = baseScale * (0.82 + sparkle * 0.5);
        star.scale.set(scale, scale, 1);
      });
      farSkyEvents.shootingStars.forEach((streak) => {
        const localTime = ((elapsed - streak.delay) % streak.period + streak.period) % streak.period;
        const active = elapsed >= streak.delay && localTime < streak.duration;
        streak.sprite.visible = active;
        if (!active) return;
        const progress = THREE.MathUtils.clamp(localTime / streak.duration, 0, 1);
        const eased = progress * progress * (3 - 2 * progress);
        streak.sprite.position.lerpVectors(streak.from, streak.to, eased);
        streak.sprite.position.y += Math.sin(progress * Math.PI) * streak.arc;
        streak.sprite.material.opacity = Math.sin(progress * Math.PI) * 0.9;
      });
      const cometPeriod = 39;
      const cometDuration = 10.5;
      const cometDelay = 5.5;
      const cometTime = ((elapsed - cometDelay) % cometPeriod + cometPeriod) % cometPeriod;
      const cometActive = elapsed >= cometDelay && cometTime < cometDuration;
      farSkyEvents.comet.visible = cometActive;
      if (cometActive) {
        const progress = THREE.MathUtils.clamp(cometTime / cometDuration, 0, 1);
        const eased = progress * progress * (3 - 2 * progress);
        farSkyEvents.comet.position.set(
          THREE.MathUtils.lerp(-5.2, -0.9, eased),
          THREE.MathUtils.lerp(7.4, 5.2, eased) + Math.sin(progress * Math.PI) * 0.42,
          -11,
        );
        farSkyEvents.comet.material.opacity = Math.min(1, Math.sin(progress * Math.PI) * 1.7) * 0.88;
      }
      energyFalls.forEach((fall, index) => {
        const material = fall.material;
        material.opacity = Number(fall.userData.baseOpacity) * (0.82 + Math.sin(elapsed * 1.1 + Number(fall.userData.phase)) * 0.16);
        fall.scale.x = 0.92 + Math.sin(elapsed * 0.82 + index) * 0.08;
      });
      shards.forEach((shard, index) => {
        shard.position.y = Number(shard.userData.baseY) + Math.sin(elapsed * (0.1 + index % 3 * 0.016) + Number(shard.userData.phase)) * 0.22;
        shard.rotation.y += index % 2 ? 0.00042 : -0.00031;
      });
      const cruiserBasePosition = celestialCruiserOrbit.userData.basePosition as THREE.Vector3 | undefined;
      if (cruiserBasePosition) {
        celestialCruiserOrbit.position.set(
          cruiserBasePosition.x + Math.sin(elapsed * 0.075) * 0.7,
          cruiserBasePosition.y + Math.sin(elapsed * 0.27) * 0.18,
          cruiserBasePosition.z + Math.cos(elapsed * 0.075) * 0.38,
        );
      }
      celestialCruiserOrbit.rotation.y = Math.sin(elapsed * 0.09) * 0.16;
      celestialCruiserOrbit.rotation.z = Math.sin(elapsed * 0.16) * 0.022;
      if (celestialCruiser) {
        celestialCruiser.rotation.x = -0.08 + Math.sin(elapsed * 0.21) * 0.035;
      }
      cruiserEngines.forEach((engine, index) => {
        const pulse = 0.9 + Math.sin(elapsed * 4.2 + Number(engine.userData.phase ?? index)) * 0.14;
        engine.scale.set(1, pulse, pulse);
      });
      spinners.forEach((object) => { object.rotation.z = elapsed * 0.18; });
      orbitingMoons.forEach((object) => { object.rotation.z = elapsed * 0.22; });
      portalSurfaces.forEach((object) => {
        object.scale.setScalar(0.985 + Math.sin(elapsed * 1.35 + object.position.x) * 0.022);
      });
      moonLight.intensity = (quality === 'high' ? 18 : quality === 'medium' ? 12 : 7) + Math.sin(elapsed * 0.43) * 1.2;
      violetRim.intensity = (quality === 'high' ? 13 : 8) + Math.sin(elapsed * 0.61 + 1.2) * 0.8;
    },
    updateView: (cameraPosition) => {
      constellation.lookAt(cameraPosition);
    },
  };
}
