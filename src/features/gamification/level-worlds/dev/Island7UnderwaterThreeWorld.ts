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

export const ISLAND_7_UNDERWATER_WORLD_NAME = 'Abyssal Pearl Kingdom';
type BuildLevel = 0 | 1 | 2 | 3;

export const ISLAND_7_UNDERWATER_LANDMARK_LABELS = {
  boss: 'Pearl Throne Palace',
  hatchery: 'Nautilus Hatchery Grotto',
  habit: 'Living Reef Sanctuary',
  wisdom: 'Tidemind Archive',
  event: 'Compass Current Portal',
} as const;

export interface Island7UnderwaterMaterials {
  oceanStone: THREE.MeshStandardMaterial;
  deepStone: THREE.MeshStandardMaterial;
  sand: THREE.MeshStandardMaterial;
  pearl: THREE.MeshPhysicalMaterial;
  shell: THREE.MeshPhysicalMaterial;
  turquoise: THREE.MeshPhysicalMaterial;
  gold: THREE.MeshStandardMaterial;
  warmWindow: THREE.MeshBasicMaterial;
  coralPink: THREE.MeshStandardMaterial;
  coralViolet: THREE.MeshStandardMaterial;
  coralGold: THREE.MeshStandardMaterial;
  kelp: THREE.MeshStandardMaterial;
  kelpLight: THREE.MeshStandardMaterial;
  crystal: THREE.MeshPhysicalMaterial;
  violetCrystal: THREE.MeshPhysicalMaterial;
  portal: THREE.MeshBasicMaterial;
  egg: THREE.MeshPhysicalMaterial;
  nest: THREE.MeshStandardMaterial;
  book: THREE.MeshStandardMaterial;
  caustic: THREE.MeshBasicMaterial;
  bubble: THREE.MeshPhysicalMaterial;
}

export interface Island7UnderwaterAmbienceRuntime {
  root: THREE.Group;
  animate: (elapsed: number) => void;
  updateView?: (cameraPosition: THREE.Vector3) => void;
}

const segmentCount = (quality: Island3DQuality) => quality === 'high' ? 24 : quality === 'medium' ? 16 : 10;
const detailScale = (quality: Island3DQuality) => quality === 'high' ? 1 : quality === 'medium' ? 0.62 : 0.34;

export const ISLAND_7_ROUTE_CLEARANCE_INNER_RADIUS = ISLAND_3D_ROUTE_RADIUS - ISLAND_3D_TILE_RADIAL_DEPTH / 2 - 0.25;
export const ISLAND_7_ROUTE_CLEARANCE_OUTER_RADIUS = ISLAND_3D_ROUTE_RADIUS + ISLAND_3D_TILE_RADIAL_DEPTH / 2 + 0.25;

export function isIsland7RouteCorridorClear(x: number, z: number, footprintRadius = 0): boolean {
  const distance = Math.hypot(x, z);
  const footprint = Math.max(0, footprintRadius);
  return distance + footprint <= ISLAND_7_ROUTE_CLEARANCE_INNER_RADIUS
    || distance - footprint >= ISLAND_7_ROUTE_CLEARANCE_OUTER_RADIUS;
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

function createTexture(size: number, kind: 'stone' | 'shell' | 'gold' | 'sand', relief = false) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const noise = ((x * 43 + y * 71 + x * y * 11) % 31) - 15;
      const ripple = Math.sin(x * 0.14 + Math.sin(y * 0.09) * 2.7);
      let value = 150 + noise;
      if (kind === 'stone') value = 128 + noise + ripple * 16 + (((x + y * 2) % 37 < 2) ? -42 : 0);
      if (kind === 'shell') value = 185 + noise * 0.35 + Math.sin(Math.atan2(y - size / 2, x - size / 2) * 12) * 18;
      if (kind === 'gold') value = 205 + noise * 0.32 + ((x + y * 3) % 19 < 2 ? -24 : 0);
      if (kind === 'sand') value = 170 + noise * 0.72 + (Math.sin(x * 0.2) + Math.cos(y * 0.17)) * 5;
      if (relief) value = 128 + (value - 150) * 1.4;
      const clamped = THREE.MathUtils.clamp(value, 18, 242);
      data[offset] = clamped;
      data[offset + 1] = clamped;
      data[offset + 2] = clamped;
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = relief ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === 'stone' ? 3 : 4, kind === 'stone' ? 3 : 4);
  texture.needsUpdate = true;
  return texture;
}

export function createIsland7UnderwaterMaterials(): Island7UnderwaterMaterials {
  const stoneMap = createTexture(128, 'stone');
  const stoneRelief = createTexture(128, 'stone', true);
  const shellMap = createTexture(96, 'shell');
  const shellRelief = createTexture(96, 'shell', true);
  const goldMap = createTexture(64, 'gold');
  const goldRelief = createTexture(64, 'gold', true);
  const sandMap = createTexture(96, 'sand');
  const sandRelief = createTexture(96, 'sand', true);
  return {
    oceanStone: new THREE.MeshStandardMaterial({ color: 0x266676, map: stoneMap, bumpMap: stoneRelief, bumpScale: 0.085, roughness: 0.78, metalness: 0.04 }),
    deepStone: new THREE.MeshStandardMaterial({ color: 0x103847, map: stoneMap, bumpMap: stoneRelief, bumpScale: 0.11, roughness: 0.88, metalness: 0.03, emissive: 0x032735, emissiveIntensity: 0.18 }),
    sand: new THREE.MeshStandardMaterial({ color: 0xa8c9b6, map: sandMap, bumpMap: sandRelief, bumpScale: 0.035, roughness: 0.86, emissive: 0x06323c, emissiveIntensity: 0.06 }),
    pearl: new THREE.MeshPhysicalMaterial({ color: 0xe6fbff, map: shellMap, bumpMap: shellRelief, bumpScale: 0.012, roughness: 0.13, clearcoat: 1, clearcoatRoughness: 0.08, iridescence: 0.82, iridescenceIOR: 1.28, iridescenceThicknessRange: [120, 410], emissive: 0x167e9a, emissiveIntensity: 0.3 }),
    shell: new THREE.MeshPhysicalMaterial({ color: 0xd7eee8, map: shellMap, bumpMap: shellRelief, bumpScale: 0.018, roughness: 0.27, clearcoat: 0.72, clearcoatRoughness: 0.2, iridescence: 0.35, iridescenceIOR: 1.22, emissive: 0x063b49, emissiveIntensity: 0.12 }),
    turquoise: new THREE.MeshPhysicalMaterial({ color: 0x078e9f, roughness: 0.21, metalness: 0.12, clearcoat: 0.8, clearcoatRoughness: 0.14, emissive: 0x035d70, emissiveIntensity: 0.38 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xf5bd46, map: goldMap, bumpMap: goldRelief, bumpScale: 0.012, roughness: 0.22, metalness: 0.9, emissive: 0x8a4606, emissiveIntensity: 0.38 }),
    warmWindow: new THREE.MeshBasicMaterial({ color: 0xffa52b, transparent: true, opacity: 1, toneMapped: false, depthWrite: false }),
    coralPink: new THREE.MeshStandardMaterial({ color: 0xf16e9c, roughness: 0.58, emissive: 0x5b153d, emissiveIntensity: 0.22 }),
    coralViolet: new THREE.MeshStandardMaterial({ color: 0xa75fd0, roughness: 0.53, emissive: 0x48126a, emissiveIntensity: 0.26 }),
    coralGold: new THREE.MeshStandardMaterial({ color: 0xf0aa62, roughness: 0.62, emissive: 0x63300e, emissiveIntensity: 0.18 }),
    kelp: new THREE.MeshStandardMaterial({ color: 0x176651, roughness: 0.7, side: THREE.DoubleSide }),
    kelpLight: new THREE.MeshStandardMaterial({ color: 0x52a65e, roughness: 0.64, emissive: 0x123f32, emissiveIntensity: 0.18, side: THREE.DoubleSide }),
    crystal: new THREE.MeshPhysicalMaterial({ color: 0x5df4ee, roughness: 0.05, transmission: 0.2, thickness: 0.35, transparent: true, opacity: 0.82, clearcoat: 1, emissive: 0x0a8ca7, emissiveIntensity: 1.1, depthWrite: false }),
    violetCrystal: new THREE.MeshPhysicalMaterial({ color: 0xa266ff, roughness: 0.05, transmission: 0.18, thickness: 0.38, transparent: true, opacity: 0.84, clearcoat: 1, emissive: 0x4d1cca, emissiveIntensity: 1.08, depthWrite: false }),
    portal: new THREE.MeshBasicMaterial({ color: 0x8d7dff, transparent: true, opacity: 0.76, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }),
    egg: new THREE.MeshPhysicalMaterial({ color: 0xdff6e9, roughness: 0.16, clearcoat: 0.9, clearcoatRoughness: 0.1, iridescence: 0.65, emissive: 0x206b91, emissiveIntensity: 0.3 }),
    nest: new THREE.MeshStandardMaterial({ color: 0x9b7652, roughness: 0.92 }),
    book: new THREE.MeshStandardMaterial({ color: 0x79514a, roughness: 0.68, emissive: 0x24120d, emissiveIntensity: 0.1 }),
    caustic: new THREE.MeshBasicMaterial({ color: 0xbaffff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }),
    bubble: new THREE.MeshPhysicalMaterial({ color: 0xcfffff, roughness: 0.03, transmission: 0.35, transparent: true, opacity: 0.32, clearcoat: 1, depthWrite: false }),
  };
}

function addRing(root: THREE.Group, radius: number, tube: number, y: number, material: THREE.Material, quality: Island3DQuality, vertical = false) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, segmentCount(quality) * 2), material);
  ring.rotation.x = vertical ? 0 : Math.PI / 2;
  ring.position.y = y;
  root.add(ring);
  return ring;
}

function addStairs(root: THREE.Group, width: number, depth: number, materials: Island7UnderwaterMaterials, count = 4) {
  for (let index = 0; index < count; index += 1) {
    const step = box(width - index * 0.08, 0.09, depth / count + 0.04, materials.shell);
    step.position.set(0, 0.12 + index * 0.07, 0.72 + index * depth / count);
    root.add(step);
  }
}

function addPlinth(root: THREE.Group, radius: number, materials: Island7UnderwaterMaterials, quality: Island3DQuality, y = 0.14) {
  const segments = segmentCount(quality);
  const lower = cylinder(radius * 1.06, radius * 1.12, 0.18, materials.oceanStone, segments);
  lower.position.y = y;
  const upper = cylinder(radius, radius * 1.03, 0.16, materials.sand, segments);
  upper.position.y = y + 0.16;
  root.add(lower, upper);
  addRing(root, radius * 0.9, 0.025, y + 0.25, materials.gold, quality);
}

function addPearlFinial(root: THREE.Group, x: number, y: number, z: number, scale: number, materials: Island7UnderwaterMaterials, quality: Island3DQuality) {
  const stem = cylinder(0.025 * scale, 0.04 * scale, 0.22 * scale, materials.gold, 8);
  stem.position.set(x, y, z);
  const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.085 * scale, segmentCount(quality), Math.max(6, segmentCount(quality) / 2)), materials.pearl);
  pearl.position.set(x, y + 0.15 * scale, z);
  root.add(stem, pearl);
}

function addArchedWindow(root: THREE.Group, x: number, y: number, z: number, scale: number, materials: Island7UnderwaterMaterials, rotationY = 0) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotationY;
  const window = box(0.16 * scale, 0.28 * scale, 0.025, materials.warmWindow);
  window.position.z = 0.035;
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.085 * scale, 0.018 * scale, 5, 12, Math.PI), materials.gold);
  arch.rotation.z = Math.PI;
  arch.position.y = 0.14 * scale;
  const sill = box(0.22 * scale, 0.025 * scale, 0.05, materials.gold);
  sill.position.y = -0.145 * scale;
  group.add(window, arch, sill);
  root.add(group);
}

function createShellRoof(radius: number, height: number, materials: Island7UnderwaterMaterials, quality: Island3DQuality) {
  const group = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(radius, segmentCount(quality), Math.max(7, segmentCount(quality) / 2), 0, Math.PI * 2, 0, Math.PI / 2), materials.turquoise);
  dome.scale.y = height / radius;
  group.add(dome);
  const ribCount = quality === 'high' ? 12 : quality === 'medium' ? 8 : 5;
  for (let index = 0; index < ribCount; index += 1) {
    const angle = index / ribCount * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.66, 0.018, 5, 14, Math.PI / 2), materials.gold);
    rib.rotation.y = angle;
    rib.rotation.z = Math.PI / 2;
    rib.position.y = radius * 0.08;
    group.add(rib);
  }
  return group;
}

function createOnionSpire(
  radius: number,
  height: number,
  materials: Island7UnderwaterMaterials,
  quality: Island3DQuality,
  material: THREE.Material = materials.turquoise,
) {
  const root = new THREE.Group();
  const points = [
    new THREE.Vector2(radius * 0.16, 0),
    new THREE.Vector2(radius * 0.72, height * 0.11),
    new THREE.Vector2(radius, height * 0.33),
    new THREE.Vector2(radius * 0.78, height * 0.58),
    new THREE.Vector2(radius * 0.28, height * 0.86),
    new THREE.Vector2(0.02, height),
  ];
  root.add(new THREE.Mesh(new THREE.LatheGeometry(points, segmentCount(quality)), material));
  const ribCount = quality === 'high' ? 10 : quality === 'medium' ? 7 : 5;
  for (let index = 0; index < ribCount; index += 1) {
    const angle = index / ribCount * Math.PI * 2;
    const rib = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.56, radius * 0.026, 4, 12, Math.PI * 0.75),
      materials.gold,
    );
    rib.rotation.set(Math.PI / 2, angle, Math.PI * 0.13);
    rib.position.y = height * 0.3;
    root.add(rib);
  }
  addRing(root, radius * 0.72, radius * 0.035, height * 0.1, materials.gold, quality);
  return root;
}

function createPalaceTower(
  radius: number,
  height: number,
  materials: Island7UnderwaterMaterials,
  quality: Island3DQuality,
  bodyMaterial: THREE.Material,
) {
  const root = new THREE.Group();
  const base = cylinder(radius * 1.14, radius * 1.28, 0.16, materials.oceanStone, segmentCount(quality));
  base.position.y = 0.08;
  const body = cylinder(radius, radius * 1.06, height, bodyMaterial, segmentCount(quality));
  body.position.y = 0.16 + height / 2;
  root.add(base, body);
  addRing(root, radius * 1.02, radius * 0.075, 0.16 + height * 0.58, materials.gold, quality);
  addRing(root, radius * 1.08, radius * 0.09, 0.16 + height, materials.gold, quality);
  const spire = createOnionSpire(radius * 1.34, height * 0.78, materials, quality, materials.turquoise);
  spire.position.y = 0.16 + height;
  root.add(spire);
  addPearlFinial(root, 0, 0.16 + height * 1.82, 0, 0.9, materials, quality);
  return root;
}

const ISLAND_7_ANIMATED_LANDMARK_PARTS = new Set([
  'ISLAND_7_BUBBLE_WHEEL',
  'ISLAND_7_ARCHIVE_ARMILLARY',
  'ISLAND_7_PORTAL_SURFACE',
  'ISLAND_7_COMPASS_ROSE',
  'ISLAND_7_PALACE_PEARL_CORE',
]);

/** Merge decorative architecture into material batches while preserving the
 * few named parts that move at runtime. The outer root remains the canonical
 * interaction target, so this changes rendering cost without changing play.
 */
function compactUnderwaterLandmark(root: THREE.Group, landmarkId: string) {
  const animatedParts: THREE.Object3D[] = [];
  root.traverse((object) => {
    if (ISLAND_7_ANIMATED_LANDMARK_PARTS.has(object.name)) animatedParts.push(object);
  });
  const animatedEscrow = new THREE.Group();
  root.updateMatrixWorld(true);
  animatedParts.forEach((object) => animatedEscrow.attach(object));
  compactStaticGeometry(root, `ISLAND7_${landmarkId.toUpperCase()}_ARCHITECTURE`);
  root.updateMatrixWorld(true);
  animatedParts.forEach((object) => root.attach(object));
}

function addCrystal(root: THREE.Group, x: number, y: number, z: number, size: number, material: THREE.Material, rotation = 0) {
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(size, 0), material);
  crystal.position.set(x, y, z);
  crystal.scale.y = 1.75;
  crystal.rotation.y = rotation;
  root.add(crystal);
  return crystal;
}

function createNautilusHatchery(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island7UnderwaterMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_7_NAUTILUS_HATCHERY';
  addPlinth(root, 1.05 + level * 0.08, materials, quality);
  addStairs(root, 0.78, 0.62, materials, level + 2);
  const shellRoot = new THREE.Group();
  shellRoot.position.set(0, 0.78, -0.24);
  shellRoot.rotation.set(-0.06, 0, -0.12);
  const shellBack = cylinder(0.69 + level * 0.07, 0.74 + level * 0.07, 0.28, materials.shell, segmentCount(quality) * 2);
  shellBack.rotation.x = Math.PI / 2;
  shellBack.position.set(0, 0.08, -0.12);
  shellRoot.add(shellBack);
  const loops = level === 1 ? 3 : level === 2 ? 5 : 7;
  for (let index = loops; index >= 1; index -= 1) {
    const radius = 0.17 + index * 0.095;
    const torus = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.075 + index * 0.012, 7, segmentCount(quality) * 2, Math.PI * 1.62), materials.shell);
    torus.rotation.z = -0.68;
    torus.position.set(-0.05 + index * 0.025, index * 0.025, 0);
    shellRoot.add(torus);
  }
  const shellLip = new THREE.Mesh(new THREE.TorusGeometry(0.68 + level * 0.07, 0.08, 7, segmentCount(quality) * 2, Math.PI * 1.72), materials.gold);
  shellLip.rotation.z = -0.68;
  shellLip.position.z = 0.035;
  shellRoot.add(shellLip);
  root.add(shellRoot);

  const shellChamber = new THREE.Mesh(
    new THREE.SphereGeometry(0.62 + level * 0.055, segmentCount(quality), Math.max(8, segmentCount(quality) / 2), 0, Math.PI, 0, Math.PI),
    materials.shell,
  );
  shellChamber.scale.set(1, 1.08, 0.34);
  shellChamber.position.set(0, 0.83, -0.14);
  shellChamber.rotation.y = Math.PI / 2;
  root.add(shellChamber);
  const chamberGlow = new THREE.Mesh(
    new THREE.CircleGeometry(0.43 + level * 0.035, segmentCount(quality)),
    materials.warmWindow,
  );
  chamberGlow.position.set(0, 0.82, 0.035);
  root.add(chamberGlow);

  const nest = new THREE.Mesh(new THREE.TorusGeometry(0.44 + level * 0.05, 0.11, 7, segmentCount(quality) * 2), materials.nest);
  nest.rotation.x = Math.PI / 2;
  nest.position.set(0, 0.58, 0.12);
  root.add(nest);
  const eggCount = level === 1 ? 2 : level === 2 ? 4 : 7;
  for (let index = 0; index < eggCount; index += 1) {
    const angle = index / Math.max(1, eggCount) * Math.PI * 2;
    const egg = new THREE.Mesh(new THREE.SphereGeometry(0.11 + index % 2 * 0.016, segmentCount(quality), 8), materials.egg.clone());
    egg.scale.y = 1.28;
    egg.position.set(Math.cos(angle) * (index === 0 ? 0 : 0.24), 0.71 + (index % 3) * 0.035, 0.12 + Math.sin(angle) * 0.16);
    (egg.material as THREE.MeshPhysicalMaterial).color.offsetHSL(index * 0.025, 0, 0);
    root.add(egg);
  }
  if (level >= 2) {
    [-0.72, 0.72].forEach((x) => {
      const column = cylinder(0.08, 0.1, 0.62 + level * 0.1, materials.turquoise, 10);
      column.position.set(x, 0.58, 0.26);
      root.add(column);
      addPearlFinial(root, x, 1.03 + level * 0.1, 0.26, 0.85, materials, quality);
    });
  }
  if (level === 3) {
    addRing(root, 0.95, 0.035, 0.34, materials.gold, quality);
    const shellHalo = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.035, 6, 24, Math.PI * 1.72), materials.gold);
    shellHalo.position.set(0, 0.8, -0.08);
    shellHalo.rotation.set(0, Math.PI / 2, -0.68);
    root.add(shellHalo);
    for (let index = 0; index < 5; index += 1) addCrystal(root, -0.78 + index * 0.39, 0.46, -0.5 + Math.abs(index - 2) * 0.08, 0.08, index % 2 ? materials.violetCrystal : materials.crystal, index);
    for (let index = 0; index < 6; index += 1) {
      const angle = index / 6 * Math.PI * 2;
      const pearlColumn = cylinder(0.045, 0.065, 0.46, materials.turquoise, 8);
      pearlColumn.position.set(Math.cos(angle) * 0.82, 0.5, Math.sin(angle) * 0.68);
      root.add(pearlColumn);
      addPearlFinial(root, pearlColumn.position.x, 0.78, pearlColumn.position.z, 0.56, materials, quality);
    }
  }
  return root;
}

function createHabitSanctuary(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island7UnderwaterMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_7_LIVING_REEF_SANCTUARY';
  addPlinth(root, 1.05 + level * 0.08, materials, quality);
  addStairs(root, 0.82, 0.64, materials, level + 2);
  const columns = level === 1 ? 4 : level === 2 ? 6 : 8;
  for (let index = 0; index < columns; index += 1) {
    const angle = index / columns * Math.PI * 2;
    const column = cylinder(0.075, 0.11, 0.68 + level * 0.16, index % 2 ? materials.shell : materials.turquoise, 10);
    column.position.set(Math.cos(angle) * 0.7, 0.69 + level * 0.08, Math.sin(angle) * 0.58);
    root.add(column);
    addPearlFinial(root, column.position.x, column.position.y + column.geometry.parameters.height / 2 + 0.06, column.position.z, 0.72, materials, quality);
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.026, 5, 12, Math.PI),
      materials.gold,
    );
    arch.position.set(Math.cos(angle) * 0.57, 1.05 + level * 0.1, Math.sin(angle) * 0.48);
    arch.rotation.set(0, -angle + Math.PI / 2, Math.PI);
    root.add(arch);
  }
  const sanctuaryCore = cylinder(0.48, 0.56, 0.72 + level * 0.12, materials.turquoise, segmentCount(quality));
  sanctuaryCore.position.y = 0.67 + level * 0.06;
  root.add(sanctuaryCore);
  const sanctuaryWindows = quality === 'high' ? 8 : quality === 'medium' ? 6 : 4;
  for (let index = 0; index < sanctuaryWindows; index += 1) {
    const angle = index / sanctuaryWindows * Math.PI * 2;
    addArchedWindow(root, Math.cos(angle) * 0.51, 0.76 + level * 0.06, Math.sin(angle) * 0.51, 0.72, materials, -angle + Math.PI / 2);
  }
  const glassCrown = new THREE.Mesh(
    new THREE.SphereGeometry(0.7 + level * 0.04, segmentCount(quality), Math.max(8, segmentCount(quality) / 2), 0, Math.PI * 2, 0, Math.PI / 2),
    materials.crystal,
  );
  glassCrown.scale.y = 1.22;
  glassCrown.position.y = 1.28 + level * 0.13;
  root.add(glassCrown);
  const ribCount = quality === 'high' ? 8 : quality === 'medium' ? 6 : 4;
  for (let index = 0; index < ribCount; index += 1) {
    const angle = index / ribCount * Math.PI * 2;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(angle) * 0.67, 1.27 + level * 0.13, Math.sin(angle) * 0.67),
      new THREE.Vector3(Math.cos(angle) * 0.48, 1.72 + level * 0.14, Math.sin(angle) * 0.48),
      new THREE.Vector3(0, 2.12 + level * 0.12, 0),
    ]);
    root.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.025, 5, false), materials.gold));
  }
  addRing(root, 0.69 + level * 0.04, 0.035, 1.27 + level * 0.13, materials.gold, quality);
  if (level === 3) {
    const crown = createOnionSpire(0.24, 0.66, materials, quality, materials.shell);
    crown.position.y = 1.98 + level * 0.12;
    root.add(crown);
    addPearlFinial(root, 0, 2.76, 0, 0.75, materials, quality);
    for (let index = 0; index < 6; index += 1) {
      const angle = index / 6 * Math.PI * 2;
      addCrystal(root, Math.cos(angle) * 0.92, 0.44, Math.sin(angle) * 0.76, 0.075, index % 2 ? materials.coralPink : materials.crystal, angle);
    }
  }
  if (level >= 2) {
    const wheel = new THREE.Group();
    wheel.name = 'ISLAND_7_BUBBLE_WHEEL';
    addRing(wheel, 0.3, 0.025, 0, materials.gold, quality, true);
    for (let index = 0; index < 6; index += 1) {
      const spoke = box(0.025, 0.24, 0.025, materials.gold);
      spoke.rotation.z = index / 6 * Math.PI * 2;
      wheel.add(spoke);
    }
    wheel.position.set(0.82, 0.75, 0.05);
    wheel.rotation.y = Math.PI / 2;
    root.add(wheel);
  }
  const kelpCount = Math.round((5 + level * 3) * detailScale(quality));
  for (let index = 0; index < kelpCount; index += 1) {
    const angle = index / Math.max(1, kelpCount) * Math.PI * 2 + 0.3;
    const height = 0.42 + (index % 4) * 0.12;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(Math.sin(index) * 0.06, height * 0.45, 0),
      new THREE.Vector3(Math.cos(index * 1.7) * 0.11, height, 0),
    ]);
    const kelp = new THREE.Mesh(new THREE.TubeGeometry(curve, 6, 0.025 + index % 2 * 0.009, 5, false), index % 3 ? materials.kelp : materials.kelpLight);
    kelp.name = 'ISLAND_7_SWAY_KELP';
    kelp.position.set(Math.cos(angle) * 0.95, 0.28, Math.sin(angle) * 0.8);
    kelp.userData.phase = index * 0.71;
    root.add(kelp);
  }
  return root;
}

function createWisdomArchive(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island7UnderwaterMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_7_TIDEMIND_ARCHIVE';
  addPlinth(root, 1.06 + level * 0.08, materials, quality);
  addStairs(root, 0.82, 0.66, materials, level + 2);
  const body = cylinder(0.72 + level * 0.06, 0.82 + level * 0.07, 0.72 + level * 0.12, materials.turquoise, segmentCount(quality));
  body.position.y = 0.72 + level * 0.06;
  root.add(body);
  const archiveEntrance = new THREE.Group();
  archiveEntrance.name = 'ISLAND_7_ARCHIVE_ENTRANCE';
  const archiveDoor = box(0.48, 0.72 + level * 0.08, 0.08, materials.warmWindow);
  archiveDoor.position.set(0, 0.71 + level * 0.06, 0.8 + level * 0.07);
  const archiveArch = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.05, 6, 18, Math.PI), materials.gold);
  archiveArch.position.set(0, 1.02 + level * 0.1, 0.84 + level * 0.07);
  archiveArch.rotation.z = Math.PI;
  archiveEntrance.add(archiveDoor, archiveArch);
  for (const x of [-0.37, 0.37]) {
    const entranceColumn = cylinder(0.05, 0.07, 0.75 + level * 0.08, materials.shell, 8);
    entranceColumn.position.set(x, 0.72 + level * 0.06, 0.83 + level * 0.07);
    archiveEntrance.add(entranceColumn);
  }
  root.add(archiveEntrance);
  addRing(root, 0.76 + level * 0.065, 0.035, 0.55, materials.gold, quality);
  addRing(root, 0.75 + level * 0.065, 0.04, 1.02 + level * 0.09, materials.gold, quality);
  const archiveFacets = quality === 'high' ? 12 : quality === 'medium' ? 8 : 6;
  for (let index = 0; index < archiveFacets; index += 1) {
    const angle = index / archiveFacets * Math.PI * 2;
    const rib = box(0.055, 0.66 + level * 0.11, 0.05, materials.gold);
    rib.position.set(Math.cos(angle) * (0.73 + level * 0.065), 0.72 + level * 0.06, Math.sin(angle) * (0.73 + level * 0.065));
    rib.rotation.y = -angle + Math.PI / 2;
    root.add(rib);
    addArchedWindow(root, Math.cos(angle + Math.PI / archiveFacets) * (0.735 + level * 0.065), 0.77 + level * 0.06, Math.sin(angle + Math.PI / archiveFacets) * (0.735 + level * 0.065), 0.58, materials, -(angle + Math.PI / archiveFacets) + Math.PI / 2);
  }
  const shelfCount = Math.round((6 + level * 3) * detailScale(quality));
  for (let index = 0; index < shelfCount; index += 1) {
    const angle = index / Math.max(1, shelfCount) * Math.PI * 1.5 + Math.PI * 0.75;
    const shelf = box(0.28, 0.38 + level * 0.08, 0.08, materials.book);
    shelf.position.set(Math.cos(angle) * 0.69, 0.7, Math.sin(angle) * 0.69);
    shelf.rotation.y = -angle + Math.PI / 2;
    root.add(shelf);
    for (let row = 0; row < (quality === 'high' ? 3 : 2); row += 1) {
      const book = box(0.19, 0.035, 0.04, row % 2 ? materials.coralViolet : materials.gold);
      book.position.set(shelf.position.x, 0.58 + row * 0.11, shelf.position.z);
      book.rotation.y = shelf.rotation.y;
      root.add(book);
    }
  }
  const dome = createOnionSpire(0.64 + level * 0.055, 0.82 + level * 0.16, materials, quality, materials.shell);
  dome.position.y = 1.08 + level * 0.13;
  root.add(dome);
  if (level === 3) {
    const archiveSpire = createOnionSpire(0.22, 0.58, materials, quality, materials.turquoise);
    archiveSpire.position.y = 1.68 + level * 0.12;
    root.add(archiveSpire);
    addPearlFinial(root, 0, 2.32, 0, 0.72, materials, quality);
  }
  if (level >= 2) {
    const globe = new THREE.Group();
    globe.name = 'ISLAND_7_ARCHIVE_ARMILLARY';
    addRing(globe, 0.22, 0.018, 0, materials.gold, quality, true);
    const second = addRing(globe, 0.22, 0.018, 0, materials.gold, quality, true);
    second.rotation.y = Math.PI / 2;
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 7), materials.crystal);
    globe.add(core);
    globe.position.set(-0.54, 0.58, 0.65);
    root.add(globe);
  }
  const desk = box(0.55, 0.1, 0.34, materials.book);
  desk.position.set(0, 0.48, 0.76);
  const openBook = box(0.44, 0.025, 0.28, materials.sand);
  openBook.position.set(0, 0.55, 0.76);
  root.add(desk, openBook);
  if (level === 3) {
    for (const x of [-0.74, 0.74]) {
      const turret = createPalaceTower(0.13, 0.6, materials, quality, materials.turquoise);
      turret.position.set(x, 0.35, 0.08);
      root.add(turret);
    }
    for (let index = 0; index < 4; index += 1) {
      const angle = index / 4 * Math.PI * 2 + Math.PI / 4;
      const balcony = cylinder(0.18, 0.22, 0.08, materials.gold, 10);
      balcony.position.set(Math.cos(angle) * 0.88, 0.88, Math.sin(angle) * 0.88);
      root.add(balcony);
      addPearlFinial(root, balcony.position.x, 1.04, balcony.position.z, 0.58, materials, quality);
    }
  }
  return root;
}

function createCompassPortal(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island7UnderwaterMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_7_COMPASS_CURRENT_PORTAL';
  addPlinth(root, 1.05 + level * 0.08, materials, quality);
  addStairs(root, 0.84, 0.66, materials, level + 2);
  const archRadius = 0.68 + level * 0.13;
  const arch = new THREE.Mesh(new THREE.TorusGeometry(archRadius, 0.1 + level * 0.015, 8, segmentCount(quality) * 2, Math.PI), materials.gold);
  arch.rotation.z = Math.PI;
  arch.position.y = 1.02 + level * 0.16;
  root.add(arch);
  [-archRadius, archRadius].forEach((x) => {
    const pillar = cylinder(0.12, 0.17, 1.05 + level * 0.17, materials.turquoise, 10);
    pillar.position.set(x, 0.72 + level * 0.1, 0);
    root.add(pillar);
    addPearlFinial(root, x, 1.3 + level * 0.19, 0, 0.84, materials, quality);
  });
  if (level === 3) {
    const outerArch = new THREE.Mesh(new THREE.TorusGeometry(archRadius * 1.17, 0.045, 6, segmentCount(quality) * 2, Math.PI), materials.shell);
    outerArch.rotation.z = Math.PI;
    outerArch.position.y = 1.02 + level * 0.16;
    root.add(outerArch);
    for (const x of [-archRadius * 1.17, archRadius * 1.17]) {
      const outerPillar = cylinder(0.075, 0.105, 1.12 + level * 0.17, materials.shell, 10);
      outerPillar.position.set(x, 0.75 + level * 0.1, 0.03);
      root.add(outerPillar);
    }
  }
  const portal = new THREE.Mesh(new THREE.CircleGeometry(archRadius * 0.88, segmentCount(quality) * 2, 0, Math.PI), materials.portal.clone());
  portal.name = 'ISLAND_7_PORTAL_SURFACE';
  portal.position.y = 1.02 + level * 0.16;
  portal.rotation.z = Math.PI;
  portal.userData.baseOpacity = 0.64;
  root.add(portal);
  const vortexRing = new THREE.Mesh(new THREE.TorusGeometry(archRadius * 0.7, 0.035, 6, segmentCount(quality) * 2), materials.violetCrystal);
  vortexRing.name = 'ISLAND_7_PORTAL_VORTEX_RING';
  vortexRing.position.set(0, 1.02 + level * 0.16, 0.025);
  root.add(vortexRing);
  const compass = new THREE.Group();
  compass.name = 'ISLAND_7_COMPASS_ROSE';
  addRing(compass, 0.38 + level * 0.04, 0.025, 0, materials.gold, quality);
  for (let index = 0; index < 8; index += 1) {
    const needle = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.36, 3), index % 2 ? materials.crystal : materials.gold);
    needle.rotation.z = -index / 8 * Math.PI * 2;
    needle.position.set(Math.cos(index / 8 * Math.PI * 2) * 0.18, 0.02, Math.sin(index / 8 * Math.PI * 2) * 0.18);
    compass.add(needle);
  }
  compass.position.set(0, 0.39, 0.68);
  root.add(compass);
  if (level === 3) {
    for (let index = 0; index < 6; index += 1) {
      const angle = index / 6 * Math.PI * 2;
      addCrystal(root, Math.cos(angle) * 0.92, 0.46, Math.sin(angle) * 0.76, 0.1, index % 2 ? materials.violetCrystal : materials.crystal, angle);
    }
    for (const x of [-1.12, 1.12]) {
      const tower = createPalaceTower(0.14, 0.75, materials, quality, materials.turquoise);
      tower.position.set(x, 0.36, 0.04);
      root.add(tower);
    }
  }
  return root;
}

function createPearlPalace(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island7UnderwaterMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_7_PEARL_THRONE_PALACE';
  addPlinth(root, 1.38 + level * 0.11, materials, quality, 0.13);
  addStairs(root, 0.95 + level * 0.08, 0.82, materials, level + 3);
  const base = cylinder(0.83 + level * 0.08, 1.02 + level * 0.08, 0.82 + level * 0.18, materials.turquoise, segmentCount(quality));
  base.position.y = 0.74 + level * 0.08;
  root.add(base);
  const baseGoldBands = level === 3 ? 3 : 2;
  for (let band = 0; band < baseGoldBands; band += 1) {
    addRing(root, 0.89 + level * 0.075, 0.028, 0.48 + band * 0.31, materials.gold, quality);
  }
  const facadePanels = quality === 'high' ? 12 : quality === 'medium' ? 8 : 6;
  for (let index = 0; index < facadePanels; index += 1) {
    const angle = index / facadePanels * Math.PI * 2;
    const panel = box(0.16, 0.62 + level * 0.08, 0.065, index % 2 ? materials.shell : materials.gold);
    panel.position.set(Math.cos(angle) * (0.87 + level * 0.075), 0.72 + level * 0.08, Math.sin(angle) * (0.87 + level * 0.075));
    panel.rotation.y = -angle + Math.PI / 2;
    root.add(panel);
  }
  const windowCount = quality === 'high' ? 10 : quality === 'medium' ? 7 : 4;
  for (let index = 0; index < windowCount; index += 1) {
    const angle = index / windowCount * Math.PI * 2;
    addArchedWindow(root, Math.cos(angle) * (0.86 + level * 0.07), 0.78 + level * 0.1, Math.sin(angle) * (0.86 + level * 0.07), 0.9, materials, -angle + Math.PI / 2);
  }
  const roof = createOnionSpire(0.72 + level * 0.065, 1.08 + level * 0.25, materials, quality, materials.shell);
  roof.position.y = 1.08 + level * 0.18;
  root.add(roof);
  const entrance = new THREE.Group();
  entrance.name = 'ISLAND_7_PALACE_ENTRANCE';
  const doorway = box(0.42 + level * 0.035, 0.62 + level * 0.08, 0.08, materials.warmWindow);
  doorway.position.set(0, 0.74 + level * 0.06, 0.95 + level * 0.08);
  const entranceArch = new THREE.Mesh(
    new THREE.TorusGeometry(0.25 + level * 0.018, 0.045, 6, segmentCount(quality), Math.PI),
    materials.gold,
  );
  entranceArch.position.set(0, 1.01 + level * 0.1, 1.02 + level * 0.08);
  entranceArch.rotation.z = Math.PI;
  entrance.add(doorway, entranceArch);
  for (const x of [-0.34, 0.34]) {
    const doorColumn = cylinder(0.045, 0.065, 0.62 + level * 0.08, materials.gold, 8);
    doorColumn.position.set(x, 0.72 + level * 0.06, 1.01 + level * 0.08);
    entrance.add(doorColumn);
  }
  root.add(entrance);
  const towerCount = level === 1 ? 2 : level === 2 ? 4 : 5;
  for (let index = 0; index < towerCount; index += 1) {
    const angle = index / towerCount * Math.PI * 2 + Math.PI / 4;
    const radius = level === 1 ? 0.68 : 0.92 + level * 0.04;
    const height = 0.72 + level * 0.18 + (index === 0 && level === 3 ? 0.18 : 0);
    const tower = createPalaceTower(0.19, height, materials, quality, index % 2 ? materials.shell : materials.turquoise);
    tower.position.set(Math.cos(angle) * radius, 0.46, Math.sin(angle) * radius);
    root.add(tower);
  }
  const pearlSize = 0.16 + level * 0.055;
  const pearlMaterial = materials.pearl.clone();
  pearlMaterial.map = null;
  pearlMaterial.bumpMap = null;
  pearlMaterial.emissiveIntensity = 0.55;
  const pearl = new THREE.Mesh(new THREE.SphereGeometry(pearlSize, segmentCount(quality), Math.max(8, segmentCount(quality) / 2)), pearlMaterial);
  pearl.name = 'ISLAND_7_PALACE_PEARL_CORE';
  pearl.position.set(0, 1.28 + level * 0.25, 0.89);
  pearl.userData.baseScale = 1;
  root.add(pearl);
  if (level >= 2) {
    const crown = new THREE.Group();
    crown.name = 'ISLAND_7_PALACE_CROWN';
    addRing(crown, 0.34 + level * 0.04, 0.025, 0, materials.gold, quality, true);
    crown.position.set(0, 1.87 + level * 0.25, 0);
    root.add(crown);
  }
  if (level === 3) {
    for (let index = 0; index < 6; index += 1) {
      const angle = index / 6 * Math.PI * 2;
      const buttress = box(0.15, 0.82, 0.18, materials.gold);
      buttress.position.set(Math.cos(angle) * 0.94, 0.76, Math.sin(angle) * 0.94);
      buttress.rotation.y = -angle;
      root.add(buttress);
    }
    for (let index = 0; index < 8; index += 1) {
      const angle = index / 8 * Math.PI * 2;
      addCrystal(root, Math.cos(angle) * 1.25, 0.46, Math.sin(angle) * 1.12, 0.075, index % 2 ? materials.crystal : materials.violetCrystal, angle);
    }
  }
  return root;
}

export function buildIsland7UnderwaterLandmark(
  definition: Island5LandmarkDefinition,
  level: BuildLevel,
  quality: Island3DQuality,
  materials: Island7UnderwaterMaterials,
) {
  const root = new THREE.Group();
  root.name = `ISLAND_7_UNDERWATER_${definition.id.toUpperCase()}_ROOT`;
  root.position.set(...definition.position);
  root.userData.sculptRuntime = { clickable: true, explodable: true, world: 'island-007-underwater' };
  if (level === 0) {
    addPlinth(root, definition.id === 'boss' ? 1.45 : 1.08, materials, quality);
  } else {
    const resolved = level as 1 | 2 | 3;
    const building = definition.id === 'hatchery'
      ? createNautilusHatchery(resolved, quality, materials)
      : definition.id === 'habit'
        ? createHabitSanctuary(resolved, quality, materials)
        : definition.id === 'wisdom'
          ? createWisdomArchive(resolved, quality, materials)
          : definition.id === 'event'
            ? createCompassPortal(resolved, quality, materials)
            : createPearlPalace(resolved, quality, materials);
    if (definition.id !== 'boss') building.rotation.y = Math.atan2(-definition.position[0], -definition.position[2]);
    building.scale.setScalar(definition.id === 'boss' ? (resolved === 3 ? 1.34 : resolved === 2 ? 1.14 : 1) : (resolved === 3 ? 1.34 : resolved === 2 ? 1.16 : 1));
    compactUnderwaterLandmark(building, definition.id);
    root.add(building);
    if (quality === 'high' && definition.id === 'boss') {
      const warmCore = new THREE.PointLight(0xffad51, 5.4, 5.2, 2);
      warmCore.name = 'ISLAND_7_LANDMARK_WARM_CORE';
      warmCore.position.set(0, 1.5, 0.3);
      root.add(warmCore);
    }
  }
  root.traverse((child) => { child.userData.landmarkId = definition.id; });
  // One hero shadow anchors the central palace. The four satellites keep
  // baked material depth and receive that lighting without each replaying the
  // whole architectural draw list into the shadow map.
  markShadows(root, quality === 'high' && definition.id === 'boss');
  return root;
}

function createSeabedShelf(radius: number, depth: number, materials: Island7UnderwaterMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  const segments = segmentCount(quality) * 2;
  const top = cylinder(radius, radius * 1.035, 0.28, materials.sand, segments);
  top.position.y = 0.12;
  const rim = cylinder(radius * 1.03, radius * 1.08, 0.3, materials.oceanStone, segments);
  rim.position.y = -0.12;
  const rockRoot = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.42, radius * 1.07, depth, segments, 3, false), materials.deepStone);
  rockRoot.position.y = -depth / 2 - 0.24;
  root.add(top, rim, rockRoot);
  const cragCount = Math.max(7, Math.round(segmentCount(quality) * 0.72));
  for (let index = 0; index < cragCount; index += 1) {
    const angle = index / cragCount * Math.PI * 2;
    const width = 0.36 + index % 4 * 0.11;
    const height = depth * (0.42 + index % 5 * 0.075);
    const crag = new THREE.Mesh(new THREE.DodecahedronGeometry(width, 0), materials.deepStone);
    crag.scale.set(1, height / width, 0.75 + index % 3 * 0.13);
    crag.position.set(Math.cos(angle) * radius * 0.88, -0.48 - height * 0.42, Math.sin(angle) * radius * 0.88);
    crag.rotation.set(index * 0.08, -angle, index % 2 ? 0.15 : -0.12);
    root.add(crag);
    if (index % 3 === 0) {
      const ledge = cylinder(width * 0.58, width * 0.72, 0.12, materials.oceanStone, 8);
      ledge.position.set(Math.cos(angle) * radius * 0.94, -0.34 - (index % 2) * 0.46, Math.sin(angle) * radius * 0.94);
      root.add(ledge);
    }
  }
  return root;
}

function addCoralCluster(root: THREE.Group, x: number, y: number, z: number, scale: number, seed: number, materials: Island7UnderwaterMaterials, quality: Island3DQuality) {
  const group = new THREE.Group();
  group.name = 'ISLAND_7_CORAL_CLUSTER';
  group.position.set(x, y, z);
  group.rotation.y = seed * 0.73;
  const material = seed % 3 < 1 ? materials.coralPink : seed % 3 < 2 ? materials.coralViolet : materials.coralGold;
  const branchCount = quality === 'high' ? 6 : quality === 'medium' ? 4 : 3;
  for (let index = 0; index < branchCount; index += 1) {
    const angle = index / branchCount * Math.PI * 2 + seed;
    const height = scale * (0.42 + (index % 3) * 0.13);
    const branch = cylinder(scale * 0.035, scale * 0.07, height, material, 6);
    branch.position.set(Math.cos(angle) * scale * 0.13, height / 2, Math.sin(angle) * scale * 0.13);
    branch.rotation.z = Math.cos(angle) * 0.28;
    branch.rotation.x = Math.sin(angle) * 0.22;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(scale * 0.075, 7, 5), material);
    tip.position.set(branch.position.x + Math.cos(angle) * scale * 0.08, height, branch.position.z + Math.sin(angle) * scale * 0.08);
    group.add(branch, tip);
  }
  root.add(group);
  return group;
}

function addSeaFan(root: THREE.Group, x: number, y: number, z: number, scale: number, seed: number, materials: Island7UnderwaterMaterials, quality: Island3DQuality) {
  const group = new THREE.Group();
  group.name = 'ISLAND_7_SEA_FAN';
  group.position.set(x, y, z);
  group.rotation.y = seed;
  const branches = quality === 'high' ? 9 : quality === 'medium' ? 6 : 4;
  for (let index = 0; index < branches; index += 1) {
    const t = (index / Math.max(1, branches - 1) - 0.5) * 0.8;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(t * scale * 0.35, scale * 0.28, 0),
      new THREE.Vector3(t * scale * 0.72, scale * (0.55 + Math.cos(t * 2) * 0.16), 0),
    ]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 6, scale * 0.012, 4, false), index % 2 ? materials.coralViolet : materials.coralPink));
  }
  root.add(group);
  return group;
}

function addKelpBlade(root: THREE.Group, x: number, y: number, z: number, height: number, seed: number, materials: Island7UnderwaterMaterials) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(Math.sin(seed) * 0.08, height * 0.34, 0),
    new THREE.Vector3(Math.cos(seed * 1.8) * 0.14, height * 0.68, 0),
    new THREE.Vector3(Math.sin(seed * 2.2) * 0.18, height, 0),
  ]);
  const blade = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.025, 5, false), seed % 2 ? materials.kelp : materials.kelpLight);
  blade.name = 'ISLAND_7_SWAY_KELP';
  blade.position.set(x, y, z);
  blade.rotation.y = seed;
  blade.userData.phase = seed;
  root.add(blade);
  return blade;
}

function createFish(scale: number, color: number, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_7_FISH';
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.36, metalness: 0.08, emissive: color, emissiveIntensity: 0.08 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(scale, segmentCount(quality), Math.max(6, segmentCount(quality) / 2)), material);
  body.scale.set(1.6, 0.62, 0.78);
  root.add(body);
  const tailPivot = new THREE.Group();
  tailPivot.name = 'ISLAND_7_FISH_TAIL';
  tailPivot.position.x = -scale * 1.55;
  const tail = new THREE.Mesh(new THREE.ConeGeometry(scale * 0.52, scale * 0.9, 3), material);
  tail.rotation.z = -Math.PI / 2;
  tail.position.x = -scale * 0.35;
  tailPivot.add(tail);
  root.add(tailPivot);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(scale * 0.28, scale * 0.5, 3), material);
  fin.position.y = scale * 0.46;
  root.add(fin);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(scale * 0.1, 7, 5), new THREE.MeshBasicMaterial({ color: 0x07131b }));
  eye.position.set(scale * 1.3, scale * 0.12, scale * 0.52);
  root.add(eye);
  root.userData.tailPivot = tailPivot;
  return root;
}

function createFishSchools(quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_7_FISH_SCHOOLS';
  const schools: THREE.Group[] = [];
  const fish: THREE.Group[] = [];
  const perSchool = quality === 'high' ? 14 : quality === 'medium' ? 9 : 5;
  const palettes = [0x6de5ed, 0xf3b668, 0x9e8cff];
  for (let schoolIndex = 0; schoolIndex < 3; schoolIndex += 1) {
    const school = new THREE.Group();
    school.name = `ISLAND_7_FISH_SCHOOL_${schoolIndex + 1}`;
    const radius = 7.5 + schoolIndex * 3.8;
    school.userData.radius = radius;
    school.userData.speed = 0.065 + schoolIndex * 0.017;
    school.userData.phase = schoolIndex * 2.2;
    for (let index = 0; index < perSchool; index += 1) {
      const swimmer = createFish(0.08 + schoolIndex * 0.025 + index % 3 * 0.009, palettes[schoolIndex], quality);
      swimmer.position.set((index % 5) * 0.35, Math.floor(index / 5) * 0.22 + Math.sin(index) * 0.08, (index % 3) * 0.22);
      swimmer.userData.phase = index * 0.7 + schoolIndex;
      school.add(swimmer);
      fish.push(swimmer);
    }
    // The school moves as one shoal at gameplay scale. Batch its bodies, fins,
    // tails and eyes by material to keep the population rich at one draw-call
    // budget instead of paying four calls per tiny fish.
    compactStaticGeometry(school, `ISLAND7_FISH_SCHOOL_${schoolIndex + 1}`);
    root.add(school);
    schools.push(school);
  }
  return { root, schools, fish };
}

function createJellyfish(scale: number, materials: Island7UnderwaterMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_7_JELLYFISH';
  const bell = new THREE.Mesh(new THREE.SphereGeometry(scale, segmentCount(quality), 8, 0, Math.PI * 2, 0, Math.PI / 2), materials.violetCrystal.clone());
  bell.scale.y = 0.65;
  root.add(bell);
  const tentacles = quality === 'high' ? 6 : quality === 'medium' ? 4 : 3;
  for (let index = 0; index < tentacles; index += 1) {
    const angle = index / tentacles * Math.PI * 2;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(angle) * scale * 0.42, -scale * 0.12, Math.sin(angle) * scale * 0.42),
      new THREE.Vector3(Math.cos(angle + 0.4) * scale * 0.5, -scale * 0.85, Math.sin(angle + 0.4) * scale * 0.5),
      new THREE.Vector3(Math.cos(angle - 0.3) * scale * 0.3, -scale * 1.65, Math.sin(angle - 0.3) * scale * 0.3),
    ]);
    root.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 6, scale * 0.025, 4, false), materials.portal));
  }
  root.userData.bell = bell;
  return root;
}

function createSubmarine(materials: Island7UnderwaterMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_7_FANTASY_SUBMARINE';
  root.userData.sculptRuntime = { clickable: true, explodable: true, world: 'island-007-underwater', role: 'ambient-submarine' };
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 1.4, 6, segmentCount(quality)), materials.gold);
  hull.rotation.z = Math.PI / 2;
  root.add(hull);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.3, segmentCount(quality), 8, 0, Math.PI * 2, 0, Math.PI / 2), materials.crystal);
  dome.position.set(0.12, 0.28, 0);
  root.add(dome);
  for (let index = -2; index <= 2; index += 1) {
    const porthole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 10), materials.crystal);
    porthole.rotation.x = Math.PI / 2;
    porthole.position.set(index * 0.28, 0.02, 0.31);
    root.add(porthole);
  }
  const propeller = new THREE.Group();
  propeller.name = 'ISLAND_7_SUBMARINE_PROPELLER';
  propeller.position.x = -1.03;
  for (let index = 0; index < 4; index += 1) {
    const blade = box(0.05, 0.42, 0.1, materials.gold);
    blade.rotation.x = index / 4 * Math.PI * 2;
    propeller.add(blade);
  }
  root.add(propeller);
  if (quality === 'high') {
    const light = new THREE.SpotLight(0x9fffff, 4.2, 11, Math.PI / 9, 0.65, 1.5);
    light.position.set(1, 0, 0);
    light.target.position.set(7, -1, 0);
    root.add(light, light.target);
  }
  root.userData.propeller = propeller;
  return root;
}

function createManta(materials: Island7UnderwaterMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_7_MANTA';
  const shape = new THREE.Shape();
  shape.moveTo(0.9, 0);
  shape.bezierCurveTo(0.35, 0.2, 0.18, 0.58, 0, 0.3);
  shape.bezierCurveTo(-0.18, 0.58, -0.35, 0.2, -0.9, 0);
  shape.bezierCurveTo(-0.38, -0.12, -0.18, -0.26, 0, -0.18);
  shape.bezierCurveTo(0.18, -0.26, 0.38, -0.12, 0.9, 0);
  const body = new THREE.Mesh(new THREE.ShapeGeometry(shape, 8), materials.deepStone);
  body.rotation.x = -Math.PI / 2;
  root.add(body);
  const tailCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0.18), new THREE.Vector3(0, 0, 0.8), new THREE.Vector3(0.1, 0, 1.5)]);
  root.add(new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 8, 0.025, 5, false), materials.deepStone));
  return root;
}

function createLightShaft(materials: Island7UnderwaterMaterials, quality: Island3DQuality, index: number) {
  const geometry = new THREE.ConeGeometry(0.42 + index % 3 * 0.16, 12 + index % 4, quality === 'high' ? 12 : 7, 1, true);
  geometry.translate(0, -geometry.parameters.height / 2, 0);
  const material = materials.caustic.clone();
  material.opacity = quality === 'high' ? 0.032 : quality === 'medium' ? 0.024 : 0.016;
  const shaft = new THREE.Mesh(geometry, material);
  shaft.name = 'ISLAND_7_SURFACE_LIGHT_SHAFT';
  shaft.rotation.z = 0.09 + index % 2 * 0.04;
  shaft.userData.phase = index * 0.73;
  shaft.userData.baseOpacity = material.opacity;
  return shaft;
}

function createCausticRings(materials: Island7UnderwaterMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_7_CAUSTIC_FIELD';
  const count = quality === 'high' ? 38 : quality === 'medium' ? 24 : 12;
  for (let index = 0; index < count; index += 1) {
    const angle = index * 2.399963;
    const radius = 0.7 + (index % 9) * 0.72;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26 + index % 5 * 0.065, 0.016, 4, 14), materials.caustic);
    ring.rotation.x = Math.PI / 2;
    ring.scale.y = 0.42 + index % 3 * 0.13;
    ring.position.set(Math.cos(angle) * radius, 0.32, Math.sin(angle) * radius);
    ring.userData.phase = index * 0.41;
    root.add(ring);
  }
  compactStaticGeometry(root, 'ISLAND7_CAUSTIC_FIELD');
  return root;
}

function createBubbleField(materials: Island7UnderwaterMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_7_BUBBLE_FIELD';
  const count = quality === 'high' ? 96 : quality === 'medium' ? 58 : 28;
  const geometry = new THREE.SphereGeometry(1, 6, 5);
  const bubbles = new THREE.InstancedMesh(geometry, materials.bubble, count);
  bubbles.name = 'ISLAND_7_BUBBLE_INSTANCES';
  bubbles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const positions: THREE.Vector3[] = [];
  const speeds: number[] = [];
  const phases: number[] = [];
  const scales: number[] = [];
  const matrix = new THREE.Matrix4();
  for (let index = 0; index < count; index += 1) {
    const angle = index * 2.399963;
    const radius = 2.4 + (index % 13) * 0.54;
    const position = new THREE.Vector3(Math.cos(angle) * radius, -1.5 + (index % 17) * 0.5, Math.sin(angle) * radius);
    const scale = 0.025 + index % 4 * 0.012;
    positions.push(position);
    speeds.push(0.2 + index % 7 * 0.055);
    phases.push(index * 0.37);
    scales.push(scale);
    matrix.compose(position, new THREE.Quaternion(), new THREE.Vector3(scale, scale, scale));
    bubbles.setMatrixAt(index, matrix);
  }
  root.add(bubbles);
  return { root, bubbles, positions, speeds, phases, scales };
}

export function createIsland7UnderwaterLivingAmbience(
  scene: THREE.Scene,
  profile: Island3DQualityProfile,
  materials: Island7UnderwaterMaterials,
  ocean: THREE.Mesh,
): Island7UnderwaterAmbienceRuntime {
  const quality = profile.id;
  const root = new THREE.Group();
  root.name = 'ISLAND_7_UNDERWATER_LIVING_AMBIENCE';
  root.userData.sculptRuntime = { clickable: true, explodable: true, world: 'island-007-underwater' };
  ocean.visible = false;

  const staticScenery = new THREE.Group();
  staticScenery.name = 'ISLAND_7_STATIC_SCENERY';
  staticScenery.add(createSeabedShelf(6.55, 2.7, materials, quality));
  root.add(staticScenery);
  const animatedKelp = new THREE.Group();
  animatedKelp.name = 'ISLAND_7_ANIMATED_KELP_GARDEN';
  root.add(animatedKelp);

  const lobePositions: Array<[number, number, number]> = [[-4.55, -4.05, 2.15], [4.55, -4.05, 2.05], [-4.55, 4.05, 2.2], [4.55, 4.05, 2.1]];
  lobePositions.forEach(([x, z, radius], index) => {
    const lobe = createSeabedShelf(radius, 1.55 + index % 2 * 0.3, materials, quality);
    lobe.position.set(x, -0.06, z);
    lobe.scale.z = 0.88 + index % 3 * 0.05;
    staticScenery.add(lobe);
  });

  const heroReefAnchors: Array<[number, number, number, number]> = [
    [-6.2, -4.8, 1.75, 0.2], [-4.9, -6.0, 1.55, 0.7], [6.15, -4.7, 1.8, 1.1], [4.8, -6.05, 1.55, 1.6],
    [-6.15, 4.7, 1.8, 2.1], [-4.75, 6.05, 1.55, 2.6], [6.2, 4.8, 1.75, 3.1], [4.9, 6.0, 1.55, 3.6],
    [-7.2, 0.8, 1.45, 4.1], [7.2, -0.7, 1.5, 4.6], [-1.0, -7.0, 1.4, 5.1], [1.1, 7.0, 1.45, 5.6],
  ];
  heroReefAnchors.forEach(([x, z, scale, seed], index) => {
    const cluster = addCoralCluster(staticScenery, x, 0.26, z, scale, seed, materials, quality);
    cluster.scale.set(1.15, 1.55, 1.15);
    const fan = addSeaFan(staticScenery, x * 0.985, 0.3, z * 0.985, scale * 1.2, seed + 0.5, materials, quality);
    fan.scale.set(1.2, 1.45, 1.2);
    if (index % 2 === 0) {
      const vent = cylinder(0.12, 0.2, 0.3, materials.oceanStone, 8);
      vent.position.set(x * 0.94, 0.43, z * 0.94);
      staticScenery.add(vent);
    }
  });

  const reefCount = Math.round(52 * detailScale(quality));
  const coralGroups: THREE.Group[] = [];
  for (let index = 0; index < reefCount; index += 1) {
    const angle = index / reefCount * Math.PI * 2 + 0.14;
    const radius = index % 3 === 0 ? 6.1 + index % 4 * 0.14 : 2.38 + index % 5 * 0.12;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius * 0.94;
    const scale = 0.6 + index % 5 * 0.1;
    if (!isIsland7RouteCorridorClear(x, z, scale * 0.28)) continue;
    coralGroups.push(addCoralCluster(staticScenery, x, 0.28, z, scale, index + 0.4, materials, quality));
    if (index % 2 === 0) coralGroups.push(addSeaFan(staticScenery, x * 0.96, 0.3, z * 0.96, scale * 0.72, angle, materials, quality));
  }

  const kelpCount = Math.round(36 * detailScale(quality));
  const kelpBlades: THREE.Mesh[] = [];
  for (let index = 0; index < kelpCount; index += 1) {
    const angle = index / kelpCount * Math.PI * 2 + 0.3;
    const radius = 5.75 + index % 4 * 0.23;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (!isIsland7RouteCorridorClear(x, z, 0.16)) continue;
    kelpBlades.push(addKelpBlade(animatedKelp, x, 0.28, z, 0.65 + index % 4 * 0.18, index * 0.61, materials));
  }

  // The optimized environment texture supplies distant cavern depth; nearby
  // coral clusters remain procedural so the foreground responds to camera and
  // light without adding opaque spike silhouettes behind the palace.

  const ruinCount = quality === 'high' ? 15 : quality === 'medium' ? 9 : 5;
  for (let index = 0; index < ruinCount; index += 1) {
    const angle = index / ruinCount * Math.PI * 2 + 0.6;
    const radius = index % 2 ? 2.28 : 6.15;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius * 0.92;
    if (!isIsland7RouteCorridorClear(x, z, 0.16)) continue;
    const fragment = index % 3 === 0
      ? cylinder(0.08, 0.11, 0.32 + index % 4 * 0.09, materials.oceanStone, 8)
      : box(0.18 + index % 3 * 0.06, 0.12, 0.24, materials.oceanStone);
    fragment.position.set(x, 0.42, z);
    fragment.rotation.set(index * 0.07, angle, index % 2 ? 0.18 : -0.12);
    staticScenery.add(fragment);
  }

  const caustics = createCausticRings(materials, quality);
  root.add(caustics);
  const lightShafts: THREE.Mesh[] = [];
  const shaftCount = quality === 'high' ? 9 : quality === 'medium' ? 6 : 3;
  for (let index = 0; index < shaftCount; index += 1) {
    const shaft = createLightShaft(materials, quality, index);
    const angle = index / shaftCount * Math.PI * 2 + 0.2;
    const radius = 2.5 + index % 3 * 3.1;
    shaft.position.set(Math.cos(angle) * radius, 11.5, Math.sin(angle) * radius - 1);
    shaft.userData.baseX = shaft.position.x;
    root.add(shaft);
    lightShafts.push(shaft);
  }

  const { root: bubbleRoot, bubbles, positions: bubblePositions, speeds: bubbleSpeeds, phases: bubblePhases, scales: bubbleScales } = createBubbleField(materials, quality);
  root.add(bubbleRoot);
  const fishSchools = createFishSchools(quality);
  root.add(fishSchools.root);

  const foregroundFish = new THREE.Group();
  foregroundFish.name = 'ISLAND_7_FOREGROUND_FISH';
  const foregroundCount = quality === 'high' ? 8 : quality === 'medium' ? 5 : 3;
  for (let index = 0; index < foregroundCount; index += 1) {
    const swimmer = createFish(0.13 + index % 3 * 0.018, index % 2 ? 0xf4b45c : 0x71e4ef, quality);
    swimmer.position.set(-3.3 + index * 0.86, 1.05 + index % 3 * 0.28, 5.65 + index % 2 * 0.42);
    swimmer.userData.baseX = swimmer.position.x;
    swimmer.userData.baseY = swimmer.position.y;
    swimmer.userData.phase = index * 0.71;
    foregroundFish.add(swimmer);
    fishSchools.fish.push(swimmer);
  }
  root.add(foregroundFish);

  const jellyfish: THREE.Group[] = [];
  const jellyCount = quality === 'high' ? 10 : quality === 'medium' ? 6 : 3;
  for (let index = 0; index < jellyCount; index += 1) {
    const jelly = createJellyfish(0.18 + index % 3 * 0.045, materials, quality);
    const angle = index / jellyCount * Math.PI * 2 + 0.7;
    const radius = 7.8 + index % 3 * 2.6;
    jelly.position.set(Math.cos(angle) * radius, 1.2 + index % 5 * 1.25, Math.sin(angle) * radius);
    jelly.userData.baseY = jelly.position.y;
    jelly.userData.phase = index * 0.83;
    root.add(jelly);
    jellyfish.push(jelly);
  }

  const mantaOrbit = new THREE.Group();
  mantaOrbit.name = 'ISLAND_7_MANTA_ORBIT';
  const manta = createManta(materials);
  manta.scale.setScalar(1.45);
  manta.position.set(0, 6.3, -12.5);
  mantaOrbit.add(manta);
  root.add(mantaOrbit);

  const whale = createManta(materials);
  whale.name = 'ISLAND_7_WHALE_SILHOUETTE';
  whale.scale.set(4.2, 2.1, 3.6);
  whale.position.set(-15, 8.2, -28);
  whale.rotation.y = 0.5;
  root.add(whale);

  const submarineOrbit = new THREE.Group();
  submarineOrbit.name = 'ISLAND_7_SUBMARINE_ORBIT';
  const submarine = createSubmarine(materials, quality);
  submarine.position.set(-10.5, -0.9, 5.5);
  submarine.scale.setScalar(0.9);
  submarineOrbit.add(submarine);
  root.add(submarineOrbit);

  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(44, 44, quality === 'high' ? 32 : quality === 'medium' ? 18 : 8, quality === 'high' ? 32 : quality === 'medium' ? 18 : 8),
    new THREE.MeshPhysicalMaterial({ color: 0x8ef8ff, roughness: 0.08, transparent: true, opacity: 0.22, transmission: 0.24, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }),
  );
  surface.name = 'ISLAND_7_WATER_SURFACE_CEILING';
  surface.rotation.x = Math.PI / 2;
  surface.position.y = 11.8;
  root.add(surface);
  const surfacePositions = surface.geometry.attributes.position as THREE.BufferAttribute;
  const surfaceBasePositions = new Float32Array(surfacePositions.array as ArrayLike<number>);

  const localMotesCount = quality === 'high' ? 260 : quality === 'medium' ? 150 : 72;
  const positions = new Float32Array(localMotesCount * 3);
  for (let index = 0; index < localMotesCount; index += 1) {
    const angle = index * 2.399963;
    const radius = 1.5 + (index % 47) / 47 * 18;
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = -2 + (index % 37) / 37 * 14;
    positions[index * 3 + 2] = Math.sin(angle) * radius;
  }
  const moteGeometry = new THREE.BufferGeometry();
  moteGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const motes = new THREE.Points(moteGeometry, new THREE.PointsMaterial({ color: 0xb9ffff, size: quality === 'low' ? 0.09 : 0.055, transparent: true, opacity: 0.42, depthWrite: false, blending: THREE.AdditiveBlending }));
  motes.name = 'ISLAND_7_WATER_MOTES';
  root.add(motes);

  const cyanFill = new THREE.PointLight(0x43d9ef, quality === 'high' ? 9 : quality === 'medium' ? 5 : 2.5, 26, 2);
  cyanFill.position.set(-8, 8, 8);
  const pearlRim = new THREE.PointLight(0xa8fff1, quality === 'high' ? 10 : 5.5, 20, 2);
  pearlRim.position.set(0, 7, -5);
  root.add(cyanFill, pearlRim);

  compactStaticGeometry(staticScenery, 'ISLAND7_UNDERWATER_SCENERY');
  scene.add(root);
  // Transparent/moving ambience should not participate in shadow maps. The
  // landmarks remain shadow-casting; this keeps the living-water layer cheap.
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = false;
    child.receiveShadow = child.parent === staticScenery;
  });

  let cached = false;
  const wheels: THREE.Object3D[] = [];
  const compasses: THREE.Object3D[] = [];
  const portals: THREE.Mesh[] = [];
  const palacePearls: THREE.Object3D[] = [];
  const armillaries: THREE.Object3D[] = [];
  const cacheAnimated = () => {
    if (cached) return;
    cached = true;
    scene.traverse((object) => {
      if (object.name === 'ISLAND_7_BUBBLE_WHEEL') wheels.push(object);
      if (object.name === 'ISLAND_7_COMPASS_ROSE') compasses.push(object);
      if (object.name === 'ISLAND_7_PORTAL_SURFACE' && object instanceof THREE.Mesh) portals.push(object);
      if (object.name === 'ISLAND_7_PALACE_PEARL_CORE') palacePearls.push(object);
      if (object.name === 'ISLAND_7_ARCHIVE_ARMILLARY') armillaries.push(object);
    });
  };
  const bubbleMatrix = new THREE.Matrix4();
  const bubbleQuaternion = new THREE.Quaternion();
  const bubblePosition = new THREE.Vector3();
  const bubbleScale = new THREE.Vector3();
  let lastSurfaceUpdate = Number.NEGATIVE_INFINITY;
  const surfaceUpdateInterval = quality === 'high' ? 1 / 30 : quality === 'medium' ? 1 / 22 : Number.POSITIVE_INFINITY;

  return {
    root,
    animate: (elapsed) => {
      cacheAnimated();
      motes.rotation.y = elapsed * 0.008;
      caustics.rotation.y = elapsed * 0.018;
      caustics.scale.setScalar(0.94 + Math.sin(elapsed * 0.55) * 0.06);
      lightShafts.forEach((shaft, index) => {
        shaft.position.x = Number(shaft.userData.baseX) + Math.sin(elapsed * 0.12 + index) * 0.12;
        const material = shaft.material as THREE.MeshBasicMaterial;
        material.opacity = Number(shaft.userData.baseOpacity) * (0.76 + Math.sin(elapsed * 0.31 + Number(shaft.userData.phase)) * 0.24);
      });
      for (let index = 0; index < bubblePositions.length; index += 1) {
        const base = bubblePositions[index];
        const phase = bubblePhases[index];
        const rise = (elapsed * bubbleSpeeds[index] + phase) % 8.5;
        const scale = bubbleScales[index];
        bubblePosition.set(base.x + Math.sin(elapsed * 0.7 + phase) * 0.06, base.y + rise, base.z);
        bubbleScale.setScalar(scale);
        bubbleMatrix.compose(bubblePosition, bubbleQuaternion, bubbleScale);
        bubbles.setMatrixAt(index, bubbleMatrix);
      }
      bubbles.instanceMatrix.needsUpdate = true;
      fishSchools.schools.forEach((school, index) => {
        const angle = elapsed * Number(school.userData.speed) + Number(school.userData.phase);
        const radius = Number(school.userData.radius);
        school.position.set(Math.cos(angle) * radius, 2.2 + index * 1.5 + Math.sin(elapsed * 0.17 + index) * 0.5, Math.sin(angle) * radius);
        school.rotation.y = -angle + Math.PI / 2;
      });
      foregroundFish.children.forEach((fish, index) => {
        fish.position.x = Number(fish.userData.baseX) + Math.sin(elapsed * 0.38 + index * 0.7) * 0.55;
        fish.position.y = Number(fish.userData.baseY) + Math.sin(elapsed * 0.72 + index) * 0.05;
      });
      jellyfish.forEach((jelly, index) => {
        const phase = Number(jelly.userData.phase);
        jelly.position.y = Number(jelly.userData.baseY) + Math.sin(elapsed * 0.32 + phase) * 0.38;
        jelly.rotation.y = elapsed * (index % 2 ? 0.08 : -0.06) + phase;
        const pulse = 0.88 + Math.sin(elapsed * 1.05 + phase) * 0.12;
        const bell = jelly.userData.bell as THREE.Object3D | undefined;
        if (bell) bell.scale.set(1 + (1 - pulse) * 0.35, pulse * 0.65, 1 + (1 - pulse) * 0.35);
      });
      mantaOrbit.rotation.y = elapsed * 0.035;
      manta.rotation.z = Math.sin(elapsed * 0.48) * 0.1;
      whale.position.x = -15 + ((elapsed * 0.24) % 34);
      whale.position.y = 8.2 + Math.sin(elapsed * 0.09) * 0.45;
      submarineOrbit.rotation.y = -elapsed * 0.024;
      submarine.position.y = -0.9 + Math.sin(elapsed * 0.22) * 0.26;
      const propeller = submarine.userData.propeller as THREE.Object3D | undefined;
      if (propeller) propeller.rotation.x = elapsed * 4.6;
      if (quality !== 'low' && elapsed - lastSurfaceUpdate >= surfaceUpdateInterval) {
        lastSurfaceUpdate = elapsed;
        for (let index = 0; index < surfacePositions.count; index += 1) {
          const offset = index * 3;
          const x = surfaceBasePositions[offset];
          const y = surfaceBasePositions[offset + 1];
          surfacePositions.setZ(index, Math.sin(x * 0.48 + elapsed * 0.42) * 0.08 + Math.cos(y * 0.36 - elapsed * 0.31) * 0.055);
        }
        surfacePositions.needsUpdate = true;
      }
      kelpBlades.forEach((kelp) => {
        kelp.rotation.z = Math.sin(elapsed * 0.48 + Number(kelp.userData.phase)) * 0.045;
      });
      coralGroups.forEach((coral, index) => { coral.rotation.z = Math.sin(elapsed * 0.22 + index) * 0.008; });
      wheels.forEach((wheel) => { wheel.rotation.z = elapsed * 0.22; });
      compasses.forEach((compass) => { compass.rotation.y = elapsed * 0.18; });
      armillaries.forEach((armillary) => { armillary.rotation.y = elapsed * 0.14; });
      portals.forEach((portal, index) => {
        const material = portal.material as THREE.MeshBasicMaterial;
        material.opacity = Number(portal.userData.baseOpacity ?? 0.64) * (0.82 + Math.sin(elapsed * 1.2 + index) * 0.18);
      });
      palacePearls.forEach((pearl, index) => {
        const pulse = 1 + Math.sin(elapsed * 0.82 + index) * 0.05;
        pearl.scale.setScalar(pulse);
        const material = (pearl as THREE.Mesh).material;
        if (material instanceof THREE.MeshPhysicalMaterial) material.emissiveIntensity = 0.3 + Math.sin(elapsed * 0.82 + index) * 0.1;
      });
    },
    updateView: (cameraPosition) => {
      whale.visible = cameraPosition.distanceTo(whale.position) < 85;
    },
  };
}
