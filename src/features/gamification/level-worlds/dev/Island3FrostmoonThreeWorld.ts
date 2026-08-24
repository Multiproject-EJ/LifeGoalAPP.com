import * as THREE from 'three';
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
import {
  createFrostwellIceworks,
  type FrostwellIceworksPresentation,
} from './FrostwellIceworksThreeModel';

export const ISLAND_3_FROSTMOON_WORLD_NAME = 'Frostmoon Haven';
type BuildLevel = 0 | 1 | 2 | 3;

export const ISLAND_3_FROSTMOON_LANDMARK_LABELS = {
  boss: 'Aurora Keep',
  hatchery: 'Snowfeather Roost',
  habit: 'Hearthguard Yard',
  wisdom: 'Frostfire Archive',
  event: 'Moonwell Observatory',
} as const;

export interface Island3FrostmoonMaterials {
  snow: THREE.MeshStandardMaterial;
  snowShadow: THREE.MeshStandardMaterial;
  frostRock: THREE.MeshStandardMaterial;
  frostRockDark: THREE.MeshStandardMaterial;
  timber: THREE.MeshStandardMaterial;
  timberDark: THREE.MeshStandardMaterial;
  indigo: THREE.MeshPhysicalMaterial;
  indigoLight: THREE.MeshPhysicalMaterial;
  brass: THREE.MeshStandardMaterial;
  crystal: THREE.MeshPhysicalMaterial;
  ice: THREE.MeshPhysicalMaterial;
  windowGlow: THREE.MeshStandardMaterial;
  pine: THREE.MeshStandardMaterial;
  pineDark: THREE.MeshStandardMaterial;
  paper: THREE.MeshStandardMaterial;
  egg: THREE.MeshPhysicalMaterial;
  eggSpot: THREE.MeshStandardMaterial;
  banner: THREE.MeshStandardMaterial;
  smoke: THREE.MeshStandardMaterial;
}

export interface Island3FrostmoonAmbienceRuntime {
  root: THREE.Group;
  animate: (elapsed: number) => void;
  updateView?: (cameraPosition: THREE.Vector3) => void;
  updateSignatureMission?: (presentation: FrostwellIceworksPresentation) => void;
}

const segmentsFor = (quality: Island3DQuality) => quality === 'high' ? 22 : quality === 'medium' ? 15 : 9;
const detailFor = (quality: Island3DQuality) => quality === 'high' ? 1 : quality === 'medium' ? 0.62 : 0.34;

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

function createPatternTexture(size: number, pattern: 'snow' | 'stone' | 'wood' | 'roof') {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const noise = ((x * 71 + y * 113 + x * y) % 37) - 18;
      let value = 232 + Math.round(noise * 0.16);
      if (pattern === 'snow') {
        const sparkle = (x * 5 + y * 7) % 47 === 0;
        value = sparkle ? 255 : 236 + Math.round(noise * 0.11);
      } else if (pattern === 'stone') {
        const course = Math.floor(y / 15);
        const mortar = y % 15 < 2 || (x + (course % 2) * 16) % 32 < 2;
        value = mortar ? 132 : 210 + Math.round(noise * 0.26);
      } else if (pattern === 'wood') {
        const grain = (x + Math.round(Math.sin(y * 0.15) * 5)) % 18 < 2;
        value = grain ? 112 : 202 + Math.round(noise * 0.36);
      } else {
        const diagonal = (x + y) % 21 < 2 || (x - y + size * 3) % 21 < 2;
        value = diagonal ? 150 : 222 + Math.round(noise * 0.18);
      }
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(pattern === 'wood' ? 3 : 4, pattern === 'wood' ? 2 : 4);
  texture.needsUpdate = true;
  return texture;
}

export function createIsland3FrostmoonMaterials(): Island3FrostmoonMaterials {
  const snowMap = createPatternTexture(96, 'snow');
  const stoneMap = createPatternTexture(128, 'stone');
  const woodMap = createPatternTexture(128, 'wood');
  const roofMap = createPatternTexture(96, 'roof');
  return {
    snow: new THREE.MeshStandardMaterial({ color: 0xeaf4ff, map: snowMap, roughness: 0.8, metalness: 0 }),
    snowShadow: new THREE.MeshStandardMaterial({ color: 0xbccce6, map: snowMap, roughness: 0.9 }),
    frostRock: new THREE.MeshStandardMaterial({ color: 0x8a9ab3, map: stoneMap, roughness: 0.92 }),
    frostRockDark: new THREE.MeshStandardMaterial({ color: 0x5b6579, map: stoneMap, roughness: 0.96 }),
    timber: new THREE.MeshStandardMaterial({ color: 0x835a42, map: woodMap, roughness: 0.82 }),
    timberDark: new THREE.MeshStandardMaterial({ color: 0x4a332d, map: woodMap, roughness: 0.9 }),
    indigo: new THREE.MeshPhysicalMaterial({ color: 0x354f9f, map: roofMap, roughness: 0.44, metalness: 0.04, clearcoat: 0.42, clearcoatRoughness: 0.24 }),
    indigoLight: new THREE.MeshPhysicalMaterial({ color: 0x6079cc, map: roofMap, roughness: 0.35, metalness: 0.05, clearcoat: 0.54, clearcoatRoughness: 0.18 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xd5a94b, roughness: 0.34, metalness: 0.76, emissive: 0x4f2c08, emissiveIntensity: 0.12 }),
    crystal: new THREE.MeshPhysicalMaterial({ color: 0x965ef0, roughness: 0.06, transparent: true, opacity: 0.86, transmission: 0.22, thickness: 0.54, clearcoat: 1, emissive: 0x4c18ad, emissiveIntensity: 0.9, depthWrite: false }),
    ice: new THREE.MeshPhysicalMaterial({ color: 0x79ddf5, roughness: 0.06, transparent: true, opacity: 0.78, transmission: 0.28, thickness: 0.28, clearcoat: 1, clearcoatRoughness: 0.06, emissive: 0x155f8e, emissiveIntensity: 0.2, depthWrite: false, side: THREE.DoubleSide }),
    windowGlow: new THREE.MeshStandardMaterial({ color: 0xffcf7a, roughness: 0.28, emissive: 0xff8f2d, emissiveIntensity: 1.45 }),
    pine: new THREE.MeshStandardMaterial({ color: 0x355c57, roughness: 0.9 }),
    pineDark: new THREE.MeshStandardMaterial({ color: 0x203d42, roughness: 0.94 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xe7d4a5, roughness: 0.9, side: THREE.DoubleSide }),
    egg: new THREE.MeshPhysicalMaterial({ color: 0xdce8ff, roughness: 0.24, clearcoat: 0.64, clearcoatRoughness: 0.16 }),
    eggSpot: new THREE.MeshStandardMaterial({ color: 0x8d6ad6, roughness: 0.38, emissive: 0x3f247a, emissiveIntensity: 0.14 }),
    banner: new THREE.MeshStandardMaterial({ color: 0x49358c, roughness: 0.56, side: THREE.DoubleSide }),
    smoke: new THREE.MeshStandardMaterial({ color: 0xcbd3e2, roughness: 1, transparent: true, opacity: 0.34, depthWrite: false }),
  };
}

function createGableGeometry(width: number, height: number, depth: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(0, height);
  shape.lineTo(width / 2, 0);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.035, bevelSegments: 1 });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function addFoundation(group: THREE.Group, radius: number, materials: Island3FrostmoonMaterials, quality: Island3DQuality, y = 0.15) {
  const rock = cylinder(radius, radius + 0.16, 0.28, materials.frostRock, segmentsFor(quality));
  rock.position.y = y;
  const snow = cylinder(radius * 0.94, radius, 0.11, materials.snow, segmentsFor(quality));
  snow.position.y = y + 0.2;
  group.add(rock, snow);
}

function addTimberFrame(group: THREE.Group, width: number, height: number, depth: number, baseY: number, materials: Island3FrostmoonMaterials) {
  const wall = box(width, height, depth, materials.timber);
  wall.position.y = baseY + height / 2;
  group.add(wall);
  [-1, 1].forEach((side) => {
    const post = box(0.12, height + 0.1, depth + 0.05, materials.timberDark);
    post.position.set(side * (width / 2 - 0.08), baseY + height / 2, 0);
    group.add(post);
  });
  const topBeam = box(width + 0.08, 0.12, depth + 0.08, materials.timber);
  topBeam.position.y = baseY + height - 0.06;
  group.add(topBeam);
  const crossA = box(width * 0.9, 0.08, 0.07, materials.timber);
  crossA.position.set(0, baseY + height * 0.52, depth / 2 + 0.04);
  crossA.rotation.z = 0.55;
  const crossB = crossA.clone();
  crossB.rotation.z = -0.55;
  group.add(crossA, crossB);
}

function addGableRoof(group: THREE.Group, width: number, height: number, depth: number, y: number, materials: Island3FrostmoonMaterials, quality: Island3DQuality, snow = true) {
  const roof = new THREE.Mesh(createGableGeometry(width, height, depth), quality === 'high' ? materials.indigoLight : materials.indigo);
  roof.position.y = y;
  group.add(roof);
  if (snow) {
    const slopeAngle = Math.atan2(height, width / 2);
    const slopeLength = Math.hypot(width / 2, height) * 0.78;
    [-1, 1].forEach((side) => {
      const cap = box(slopeLength, 0.06, depth * 1.035, materials.snow);
      cap.position.set(side * width * 0.24, y + height * 0.54 + 0.035, 0);
      cap.rotation.z = side < 0 ? slopeAngle : -slopeAngle;
      group.add(cap);
    });
  }
  const ridge = cylinder(0.045, 0.045, depth * 1.08, materials.brass, 7);
  ridge.position.set(0, y + height + 0.08, 0);
  ridge.rotation.x = Math.PI / 2;
  group.add(ridge);
}

function addWindow(group: THREE.Group, x: number, y: number, z: number, rotationY: number, materials: Island3FrostmoonMaterials, scale = 1) {
  const windowRoot = new THREE.Group();
  windowRoot.position.set(x, y, z);
  windowRoot.rotation.y = rotationY;
  const frame = box(0.34 * scale, 0.48 * scale, 0.07, materials.brass);
  const glow = box(0.24 * scale, 0.36 * scale, 0.075, materials.windowGlow);
  glow.position.z = 0.012;
  windowRoot.add(frame, glow);
  group.add(windowRoot);
}

function addLantern(group: THREE.Group, x: number, y: number, z: number, materials: Island3FrostmoonMaterials, scale = 1) {
  const post = cylinder(0.025 * scale, 0.03 * scale, 0.62 * scale, materials.brass, 6);
  post.position.set(x, y - 0.18 * scale, z);
  const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.11 * scale), materials.windowGlow);
  lamp.position.set(x, y + 0.15 * scale, z);
  group.add(post, lamp);
}

function addBanner(group: THREE.Group, x: number, y: number, z: number, rotationY: number, materials: Island3FrostmoonMaterials) {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = rotationY;
  const pole = cylinder(0.025, 0.03, 0.92, materials.brass, 6);
  pole.position.y = 0.46;
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.52), materials.banner);
  cloth.position.set(0.2, 0.46, 0);
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.055), materials.brass);
  star.position.set(0.2, 0.5, 0.02);
  root.add(pole, cloth, star);
  group.add(root);
}

function addIcicles(group: THREE.Group, width: number, y: number, z: number, materials: Island3FrostmoonMaterials, quality: Island3DQuality) {
  const count = quality === 'high' ? 9 : quality === 'medium' ? 6 : 3;
  for (let index = 0; index < count; index += 1) {
    const icicle = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.14 + index % 3 * 0.06, 5), materials.ice);
    icicle.position.set(-width / 2 + (index + 0.5) / count * width, y - index % 2 * 0.025, z);
    icicle.rotation.x = Math.PI;
    group.add(icicle);
  }
}

function addEggNest(group: THREE.Group, level: 1 | 2 | 3, materials: Island3FrostmoonMaterials, quality: Island3DQuality) {
  const rings = level === 1 ? 3 : level === 2 ? 5 : 7;
  for (let index = 0; index < rings; index += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5 + index * 0.04, 0.055, 5, quality === 'low' ? 14 : 22), materials.timber);
    ring.rotation.x = Math.PI / 2 + (index % 2 ? 0.08 : -0.06);
    ring.rotation.z = index * 0.58;
    ring.position.y = 0.7 + index * 0.02;
    group.add(ring);
  }
  const count = level;
  for (let index = 0; index < count; index += 1) {
    const angle = index / count * Math.PI * 2 + 0.3;
    const egg = new THREE.Mesh(new THREE.SphereGeometry(0.2 + level * 0.018, segmentsFor(quality), 9), materials.egg);
    egg.scale.y = 1.35;
    egg.position.set(Math.cos(angle) * 0.25, 0.95, Math.sin(angle) * 0.2);
    group.add(egg);
    const spot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 4), materials.eggSpot);
    spot.scale.z = 0.2;
    spot.position.set(egg.position.x + 0.1, 0.99, egg.position.z + 0.17);
    group.add(spot);
  }
}

function createSnowfeatherRoost(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island3FrostmoonMaterials) {
  const group = new THREE.Group();
  group.name = `ISLAND_3_SNOWFEATHER_ROOST_L${level}`;
  addFoundation(group, 1.42, materials, quality);
  addEggNest(group, level, materials, quality);
  if (level >= 2) {
    addTimberFrame(group, 1.55, 1.12, 1.22, 0.46, materials);
    addGableRoof(group, 1.92, 0.72, 1.5, 1.58, materials, quality);
    addWindow(group, 0, 1.08, 0.65, 0, materials, 0.86);
    addIcicles(group, 1.7, 1.58, 0.78, materials, quality);
  } else {
    [-0.72, 0.72].forEach((x) => {
      const post = box(0.12, 0.82, 0.12, materials.timberDark);
      post.position.set(x, 0.85, -0.45);
      group.add(post);
    });
  }
  if (level === 3) {
    const chimney = box(0.28, 0.86, 0.3, materials.frostRockDark);
    chimney.position.set(0.55, 2.03, -0.2);
    group.add(chimney);
    [-1, 1].forEach((side) => {
      const dormer = new THREE.Group();
      addGableRoof(dormer, 0.68, 0.42, 0.62, 1.56, materials, quality);
      dormer.position.x = side * 0.52;
      group.add(dormer);
      addLantern(group, side * 1.06, 0.92, 0.65, materials, 0.8);
    });
    [-1, 1].forEach((direction) => {
      const displayNest = new THREE.Group();
      displayNest.position.set(0, 0, direction * 1.08);
      for (let index = 0; index < 5; index += 1) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36 + index * 0.035, 0.045, 5, quality === 'low' ? 14 : 22), materials.timber);
        ring.rotation.x = Math.PI / 2 + (index % 2 ? 0.07 : -0.06);
        ring.rotation.z = index * 0.62;
        ring.position.y = 0.5 + index * 0.02;
        displayNest.add(ring);
      }
      const egg = new THREE.Mesh(new THREE.SphereGeometry(0.22, segmentsFor(quality), 9), materials.egg);
      egg.scale.y = 1.34;
      egg.position.y = 0.75;
      displayNest.add(egg);
      group.add(displayNest);
    });
  }
  return group;
}

function addTrainingDummy(group: THREE.Group, x: number, z: number, materials: Island3FrostmoonMaterials, quality: Island3DQuality, phase: number) {
  const base = cylinder(0.14, 0.18, 0.12, materials.frostRockDark, 8);
  base.position.set(x, 0.52, z);
  const body = cylinder(0.11, 0.14, 0.58, materials.timber, segmentsFor(quality));
  body.position.set(x, 0.85, z);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, segmentsFor(quality), 8), materials.timber);
  head.position.set(x, 1.22, z);
  const arm = cylinder(0.045, 0.045, 0.62, materials.timberDark, 6);
  arm.position.set(x, 1.02, z);
  arm.rotation.z = phase % 2 ? 0.35 : -0.35;
  group.add(base, body, head, arm);
}

function createHearthguardYard(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island3FrostmoonMaterials) {
  const group = new THREE.Group();
  group.name = `ISLAND_3_HEARTHGUARD_YARD_L${level}`;
  addFoundation(group, 1.44, materials, quality);
  const dummyCount = level === 1 ? 2 : level === 2 ? 3 : 4;
  for (let index = 0; index < dummyCount; index += 1) {
    const angle = index / dummyCount * Math.PI * 2 + 0.3;
    addTrainingDummy(group, Math.cos(angle) * 0.72, Math.sin(angle) * 0.72, materials, quality, index);
  }
  const fencePosts = level === 1 ? 6 : level === 2 ? 10 : 14;
  for (let index = 0; index < fencePosts; index += 1) {
    const angle = index / fencePosts * Math.PI * 2;
    if (Math.abs(Math.sin(angle)) < 0.22 && Math.cos(angle) > 0) continue;
    const post = box(0.11, level === 3 ? 0.82 : 0.62, 0.11, materials.timberDark);
    post.position.set(Math.cos(angle) * 1.18, 0.64, Math.sin(angle) * 1.18);
    post.rotation.y = -angle;
    group.add(post);
    if (level === 3 && index % 3 === 0) addLantern(group, Math.cos(angle) * 1.18, 1.02, Math.sin(angle) * 1.18, materials, 0.65);
  }
  if (level >= 2) {
    const hut = new THREE.Group();
    hut.position.set(0, 0, -0.86);
    addTimberFrame(hut, 0.9, 0.84, 0.62, 0.44, materials);
    addGableRoof(hut, 1.08, 0.44, 0.78, 1.24, materials, quality);
    group.add(hut);
  }
  if (level === 3) {
    [-1, 1].forEach((side) => addBanner(group, side * 1.08, 0.62, 0.42, side > 0 ? Math.PI : 0, materials));
    const brazier = cylinder(0.24, 0.32, 0.22, materials.brass, 10);
    brazier.position.set(0, 0.61, 0.92);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.36, 7), materials.windowGlow);
    flame.position.set(0, 0.9, 0.92);
    group.add(brazier, flame);
  }
  return group;
}

function createMoonwellObservatory(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island3FrostmoonMaterials) {
  const group = new THREE.Group();
  group.name = `ISLAND_3_MOONWELL_OBSERVATORY_L${level}`;
  addFoundation(group, 1.42, materials, quality);
  const crystal = new THREE.Mesh(new THREE.SphereGeometry(0.37, segmentsFor(quality), 12), materials.crystal);
  crystal.position.y = 0.93;
  group.add(crystal);
  const orbitCount = level === 1 ? 1 : level === 2 ? 2 : 3;
  for (let index = 0; index < orbitCount; index += 1) {
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(0.42 + index * 0.11, 0.026, 5, 24), materials.brass);
    orbit.position.copy(crystal.position);
    orbit.rotation.set(index * 0.5, index * 0.7, index * 0.4);
    group.add(orbit);
  }
  if (level >= 2) {
    const postCount = 5;
    for (let index = 0; index < postCount; index += 1) {
      const angle = index / postCount * Math.PI * 2;
      const post = box(0.1, 1.58, 0.1, materials.timberDark);
      post.position.set(Math.cos(angle) * 1.05, 1.2, Math.sin(angle) * 1.05);
      post.rotation.z = -Math.cos(angle) * 0.28;
      group.add(post);
    }
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(1.23, 0.92, segmentsFor(quality), 1, true, Math.PI * 0.12, Math.PI * 1.7),
      materials.indigo,
    );
    canopy.position.y = 1.95;
    canopy.rotation.y = Math.PI * 0.15;
    group.add(canopy);
    addIcicles(group, 1.7, 1.58, 0.78, materials, quality);
  }
  if (level === 3) {
    [-1, 1].forEach((side) => {
      const crownPost = box(0.085, 1.34, 0.085, materials.brass);
      crownPost.position.set(side * 0.78, 1.48, -0.74);
      const moonShard = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), materials.crystal);
      moonShard.position.set(side * 0.78, 2.24, -0.74);
      moonShard.scale.y = 1.7;
      group.add(crownPost, moonShard);
    });
    const crownCanopy = new THREE.Mesh(
      new THREE.TorusGeometry(1.02, 0.055, 6, 28, Math.PI * 1.55),
      materials.indigoLight,
    );
    crownCanopy.position.y = 2.17;
    crownCanopy.rotation.set(Math.PI / 2, 0, -0.22);
    group.add(crownCanopy);
    const telescopeTube = cylinder(0.1, 0.13, 0.86, materials.brass, 10);
    telescopeTube.position.set(0.62, 1.28, -0.42);
    telescopeTube.rotation.z = 1.08;
    const lens = cylinder(0.15, 0.15, 0.08, materials.crystal, 12);
    lens.position.set(0.98, 1.45, -0.42);
    lens.rotation.z = 1.08;
    group.add(telescopeTube, lens);
    [-1, 1].forEach((side) => addLantern(group, side * 1.1, 0.92, 0.6, materials, 0.75));
  }
  return group;
}

function createFrostfireArchive(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island3FrostmoonMaterials) {
  const group = new THREE.Group();
  group.name = `ISLAND_3_FROSTFIRE_ARCHIVE_L${level}`;
  addFoundation(group, 1.42, materials, quality);
  const towerRadius = 0.78;
  const towerHeight = 1.15;
  const tower = cylinder(towerRadius, towerRadius + 0.12, towerHeight, materials.timber, segmentsFor(quality));
  tower.position.y = 0.48 + towerHeight / 2;
  group.add(tower);
  const windowCount = 3;
  for (let index = 0; index < windowCount; index += 1) {
    const angle = index / windowCount * Math.PI * 2;
    addWindow(group, Math.cos(angle) * (towerRadius + 0.02), 1.04, Math.sin(angle) * (towerRadius + 0.02), -angle + Math.PI / 2, materials, 0.64);
  }
  const shelfRows = level === 1 ? 1 : level === 2 ? 2 : 3;
  [-1, 1].forEach((direction) => {
    for (let row = 0; row < shelfRows; row += 1) {
      const shelf = box(1.1, 0.08, 0.18, materials.timberDark);
      shelf.position.set(0, 0.68 + row * 0.28, direction * (towerRadius + 0.08));
      group.add(shelf);
      const bookCount = quality === 'low' ? 4 : 7;
      for (let index = 0; index < bookCount; index += 1) {
        const book = box(0.1, 0.17 + index % 2 * 0.04, 0.1, index % 3 === 0 ? materials.banner : materials.paper);
        book.position.set(-0.46 + index * 0.15, 0.8 + row * 0.28, direction * (towerRadius + 0.09));
        group.add(book);
      }
    }
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(towerRadius * 1.08, segmentsFor(quality), 9, 0, Math.PI * 2, 0, Math.PI / 2), materials.indigo);
  dome.position.y = 0.52 + towerHeight;
  dome.scale.y = 0.7;
  group.add(dome);
  const snowCap = new THREE.Mesh(new THREE.SphereGeometry(towerRadius * 0.76, segmentsFor(quality), 9, 0, Math.PI * 2, 0, Math.PI / 2), materials.snow);
  snowCap.position.y = 0.76 + towerHeight;
  snowCap.scale.y = 0.52;
  group.add(snowCap);
  const columnCount = 4;
  for (let index = 0; index < columnCount; index += 1) {
    const angle = index / columnCount * Math.PI * 2;
    const post = box(0.08, towerHeight * 0.82, 0.08, materials.brass);
    post.position.set(Math.cos(angle) * (towerRadius + 0.08), 0.55 + towerHeight * 0.42, Math.sin(angle) * (towerRadius + 0.08));
    group.add(post);
  }
  if (level >= 2) {
    const archiveRing = cylinder(0.57, 0.63, 0.42, materials.frostRockDark, segmentsFor(quality));
    archiveRing.position.y = 1.86;
    const ringRoof = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.46, segmentsFor(quality)), materials.indigoLight);
    ringRoof.position.y = 2.28;
    group.add(archiveRing, ringRoof);
    [-1, 1].forEach((side) => {
      const extraPost = box(0.075, 0.92, 0.075, materials.brass);
      extraPost.position.set(side * 0.64, 1.52, 0);
      group.add(extraPost);
    });
    const table = cylinder(0.4, 0.44, 0.12, materials.timber, 12);
    table.position.set(-0.56, 0.62, 0.7);
    const book = box(0.52, 0.05, 0.36, materials.paper);
    book.position.set(-0.56, 0.7, 0.7);
    group.add(table, book);
  }
  if (level === 3) {
    const crownCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.17), materials.crystal);
    crownCrystal.position.set(0, 2.72, 0);
    crownCrystal.scale.y = 1.8;
    group.add(crownCrystal);
    const telescope = cylinder(0.09, 0.12, 0.92, materials.brass, 10);
    telescope.position.set(0.46, 2.12, 0);
    telescope.rotation.z = 0.95;
    const lens = cylinder(0.15, 0.15, 0.09, materials.crystal, 12);
    lens.position.set(0.82, 2.36, 0);
    lens.rotation.z = 0.95;
    group.add(telescope, lens);
  }
  return group;
}

function addKeepTower(group: THREE.Group, x: number, z: number, baseY: number, scale: number, materials: Island3FrostmoonMaterials, quality: Island3DQuality, light = false) {
  const tower = cylinder(0.28 * scale, 0.34 * scale, 1.12 * scale, materials.frostRockDark, segmentsFor(quality));
  tower.position.set(x, baseY + 0.56 * scale, z);
  addWindow(group, x, baseY + 0.62 * scale, z + 0.3 * scale, 0, materials, 0.55 * scale);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.42 * scale, 0.74 * scale, segmentsFor(quality)), light ? materials.indigoLight : materials.indigo);
  roof.position.set(x, baseY + 1.48 * scale, z);
  const snow = new THREE.Mesh(new THREE.ConeGeometry(0.26 * scale, 0.44 * scale, segmentsFor(quality)), materials.snow);
  snow.position.set(x, baseY + 1.68 * scale, z);
  const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.09 * scale), materials.brass);
  finial.position.set(x, baseY + 1.9 * scale, z);
  finial.scale.y = 1.6;
  group.add(tower, roof, snow, finial);
}

function createAuroraKeep(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island3FrostmoonMaterials) {
  const group = new THREE.Group();
  group.name = `ISLAND_3_AURORA_KEEP_L${level}`;
  addFoundation(group, 1.9, materials, quality);
  const coreWidth = 1.45;
  const coreHeight = 1.28;
  const coreDepth = 1.34;
  addTimberFrame(group, coreWidth, coreHeight, coreDepth, 0.44, materials);
  addGableRoof(group, coreWidth * 1.18, 0.7, 1.58, 0.44 + coreHeight, materials, quality);
  addWindow(group, 0, 1.08, 0.74, 0, materials, 0.9);
  const frontZ = 0.7;
  const door = box(0.46, 0.74, 0.08, materials.timberDark);
  door.position.set(0, 0.82, frontZ + 0.045);
  const doorGlow = box(0.24, 0.34, 0.085, materials.windowGlow);
  doorGlow.position.set(0, 0.91, frontZ + 0.052);
  group.add(door, doorGlow);
  if (level >= 2) {
    // Side halls turn the centre from a single alpine lodge into a keep while
    // retaining the warm timber identity visible in the source image.
    [-1, 1].forEach((side) => {
      const wing = new THREE.Group();
      wing.position.set(side * (coreWidth / 2 + 0.42), 0, -0.08);
      addTimberFrame(wing, 0.94, coreHeight * 0.68, 1, 0.44, materials);
      addGableRoof(wing, 1.16, 0.54, 1.16, 0.44 + coreHeight * 0.68, materials, quality);
      addWindow(wing, 0, 1.06, 0.54, 0, materials, 0.68);
      group.add(wing);
    });
  }
  [[-0.72, 0.72], [0.72, 0.72]].forEach(([x, z], index) => addKeepTower(group, x, z, 0.42, 0.7, materials, quality, index === 0));
  if (level >= 2) {
    [[-1.12, -0.66], [1.12, -0.66], [-1.2, 0.32], [1.2, 0.32]].forEach(([x, z], index) => (
      addKeepTower(group, x, z, 0.42, 0.7, materials, quality, index % 3 === 0)
    ));
  }
  if (level >= 2) {
    [-1, 1].forEach((side) => addBanner(group, side * 1.15, 0.62, 0.76, side > 0 ? Math.PI : 0, materials));
    const balcony = box(coreWidth * 0.72, 0.1, 0.48, materials.frostRock);
    balcony.position.set(0, 1.47 + level * 0.08, frontZ + 0.22);
    group.add(balcony);
    const railY = balcony.position.y + 0.25;
    for (let index = -3; index <= 3; index += 1) {
      const post = box(0.045, 0.42, 0.045, materials.brass);
      post.position.set(index * coreWidth * 0.1, railY, frontZ + 0.43);
      group.add(post);
    }
    const rail = box(coreWidth * 0.7, 0.045, 0.045, materials.brass);
    rail.position.set(0, railY + 0.2, frontZ + 0.43);
    group.add(rail);
  }
  if (level === 3) {
    [[-1.48, -0.92], [1.48, -0.92]].forEach(([x, z], index) => (
      addKeepTower(group, x, z, 0.42, 0.92, materials, quality, index === 0)
    ));
    addKeepTower(group, 0, -0.52, 0.82, 1.04, materials, quality, true);
    const auroraCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), materials.crystal);
    auroraCrystal.position.y = 3.34;
    auroraCrystal.scale.y = 1.8;
    group.add(auroraCrystal);
    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.055, 6, 28), materials.brass);
    crown.rotation.x = Math.PI / 2;
    crown.position.y = 3.02;
    group.add(crown);
    const porticoRoof = new THREE.Mesh(new THREE.ConeGeometry(0.68, 0.42, 4), materials.indigoLight);
    porticoRoof.position.set(0, 1.46, frontZ + 0.34);
    porticoRoof.rotation.y = Math.PI / 4;
    porticoRoof.scale.z = 0.62;
    group.add(porticoRoof);
    [-0.46, 0.46].forEach((x) => addLantern(group, x, 1.08, frontZ + 0.6, materials, 0.82));
  }
  return group;
}

export function buildIsland3FrostmoonLandmark(
  definition: Island5LandmarkDefinition,
  level: BuildLevel,
  quality: Island3DQuality,
  materials: Island3FrostmoonMaterials,
  options: IslandConstructionFactoryOptions = {},
) {
  const root = new THREE.Group();
  root.name = `ISLAND_3_FROSTMOON_${definition.id.toUpperCase()}_ROOT`;
  root.position.set(...definition.position);
  root.userData.sculptRuntime = { clickable: true, explodable: true, world: 'island-003-frostmoon' };
  if (level === 0) {
    addFoundation(root, definition.id === 'boss' ? 1.9 : 1.42, materials, quality, 0.1);
  } else {
    const resolved = level as 1 | 2 | 3;
    const building = definition.id === 'hatchery'
      ? createSnowfeatherRoost(resolved, quality, materials)
      : definition.id === 'habit'
        ? createHearthguardYard(resolved, quality, materials)
        : definition.id === 'wisdom'
          ? createFrostfireArchive(resolved, quality, materials)
          : definition.id === 'event'
            ? createMoonwellObservatory(resolved, quality, materials)
            : createAuroraKeep(resolved, quality, materials);
    if (definition.id !== 'boss') building.rotation.y = Math.atan2(-definition.position[0], -definition.position[2]);
    const scale = definition.id === 'boss' ? 1.1 : 1.06;
    building.scale.setScalar(scale);
    if (options.constructionPreview === 'target') {
      applyIslandConstructionAuthoring({
        root: building,
        worldSourceNumber: 3,
        landmarkId: definition.id,
        quality,
        includeTemporaryRig: true,
      });
    }
    if (!options.constructionPreview) {
      compactStaticGeometry(building, `ISLAND3_FROSTMOON_${definition.id.toUpperCase()}_L${resolved}`);
    }
    root.add(building);
  }
  root.traverse((child) => { child.userData.landmarkId = definition.id; });
  markShadows(root, quality !== 'low');
  return root;
}

function addSnowShelf(root: THREE.Group, x: number, z: number, radius: number, materials: Island3FrostmoonMaterials, quality: Island3DQuality, seed: number) {
  const segments = segmentsFor(quality);
  const snow = cylinder(radius, radius * 1.02, 0.14, materials.snow, segments);
  snow.position.set(x, 0.31, z);
  snow.scale.z = 0.86;
  const rock = cylinder(radius * 1.04, radius * 1.08, 0.42, materials.frostRock, segments);
  rock.position.set(x, 0.08, z);
  rock.scale.z = 0.9;
  root.add(snow, rock);
  const cliffCount = quality === 'high' ? 8 : quality === 'medium' ? 5 : 3;
  for (let index = 0; index < cliffCount; index += 1) {
    const angle = index / cliffCount * Math.PI * 2 + seed;
    const cliff = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42 + index % 3 * 0.08, 0), index % 2 ? materials.frostRock : materials.frostRockDark);
    cliff.position.set(x + Math.cos(angle) * radius * 0.88, -0.2 - index % 2 * 0.08, z + Math.sin(angle) * radius * 0.72);
    cliff.scale.set(1.1, 1.55 + index % 3 * 0.22, 0.8);
    root.add(cliff);
  }
}

function addSnowPine(root: THREE.Group, x: number, z: number, scale: number, materials: Island3FrostmoonMaterials, quality: Island3DQuality, phase: number) {
  const group = new THREE.Group();
  group.name = 'ISLAND_3_SNOW_PINE';
  group.position.set(x, 0.36, z);
  group.userData.phase = phase;
  const trunk = cylinder(0.045 * scale, 0.08 * scale, 0.9 * scale, materials.timberDark, 6);
  trunk.position.y = 0.45 * scale;
  group.add(trunk);
  const layers = quality === 'low' ? 3 : 4;
  for (let index = 0; index < layers; index += 1) {
    const radius = (0.42 - index * 0.065) * scale;
    const foliage = new THREE.Mesh(new THREE.ConeGeometry(radius, 0.62 * scale, quality === 'high' ? 10 : 7), index % 2 ? materials.pine : materials.pineDark);
    foliage.position.y = (0.62 + index * 0.32) * scale;
    const snow = new THREE.Mesh(new THREE.ConeGeometry(radius * 1.03, 0.28 * scale, quality === 'high' ? 10 : 7), materials.snow);
    snow.position.y = (0.78 + index * 0.32) * scale;
    group.add(foliage, snow);
  }
  root.add(group);
  return group;
}

function addFrozenPool(
  root: THREE.Group,
  x: number,
  z: number,
  scale: number,
  materials: Island3FrostmoonMaterials,
  quality: Island3DQuality,
) {
  const rim = cylinder(0.52 * scale, 0.6 * scale, 0.12, materials.frostRockDark, segmentsFor(quality));
  rim.position.set(x, 0.48, z);
  const ice = cylinder(0.44 * scale, 0.44 * scale, 0.045, materials.ice, segmentsFor(quality));
  ice.name = 'ISLAND_3_FROZEN_POOL_SURFACE';
  ice.position.set(x, 0.56, z);
  ice.userData.phase = Math.abs(x * 0.4 + z * 0.6);
  root.add(rim, ice);
  if (quality !== 'low') {
    for (let index = 0; index < 3; index += 1) {
      const crack = box(0.42 * scale, 0.015, 0.018, materials.snowShadow);
      crack.position.set(x, 0.588, z);
      crack.rotation.y = index * 1.05 + 0.28;
      root.add(crack);
    }
  }
  return ice;
}

function createSnowHare(materials: Island3FrostmoonMaterials, quality: Island3DQuality, phase: number) {
  const hare = new THREE.Group();
  hare.name = 'ISLAND_3_SNOW_HARE';
  hare.userData.phase = phase;
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, segmentsFor(quality), 8), materials.snow);
  body.scale.set(1.16, 0.74, 0.72);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.13, segmentsFor(quality), 7), materials.snow);
  chest.position.set(0.19, 0.12, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, segmentsFor(quality), 7), materials.snow);
  head.position.set(0.31, 0.24, 0);
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.085, 7, 5), materials.snowShadow);
  tail.position.set(-0.23, 0.08, 0);
  hare.add(body, chest, head, tail);
  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.18, 3, 6), materials.snow);
    ear.position.set(0.32, 0.44, side * 0.045);
    ear.rotation.z = -0.18 + side * 0.08;
    hare.add(ear);
    if (quality !== 'low') {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 4), materials.crystal);
      eye.position.set(0.405, 0.27, side * 0.065);
      hare.add(eye);
    }
  });
  return hare;
}

function createFrostRaven(materials: Island3FrostmoonMaterials, phase: number) {
  const raven = new THREE.Group();
  raven.name = 'ISLAND_3_FROST_RAVEN';
  raven.userData.phase = phase;
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.105, 8, 6), materials.pineDark);
  body.scale.set(1.25, 0.72, 0.7);
  raven.add(body);
  [-1, 1].forEach((side) => {
    const pivot = new THREE.Group();
    pivot.name = side < 0 ? 'leftWing' : 'rightWing';
    pivot.position.x = side * 0.07;
    const wing = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.34, 4), materials.indigo);
    wing.position.x = side * 0.15;
    wing.rotation.z = side * Math.PI / 2;
    wing.scale.z = 0.34;
    pivot.add(wing);
    raven.add(pivot);
  });
  return raven;
}

function addFrostSceneryInstances(
  root: THREE.Group,
  materials: Island3FrostmoonMaterials,
  quality: Island3DQuality,
) {
  const rockCount = quality === 'high' ? 26 : quality === 'medium' ? 16 : 8;
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.18, 0), materials.frostRockDark, rockCount);
  rocks.name = 'ISLAND_3_FROST_ROCK_CLUSTERS';
  const driftCount = quality === 'high' ? 24 : quality === 'medium' ? 14 : 7;
  const drifts = new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, quality === 'low' ? 7 : 10, 6), materials.snow, driftCount);
  drifts.name = 'ISLAND_3_WIND_SCULPTED_SNOWDRIFTS';
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  for (let index = 0; index < rockCount; index += 1) {
    const angle = index / rockCount * Math.PI * 2 + 0.31;
    const radius = 5.42 + index % 3 * 0.22;
    position.set(Math.cos(angle) * radius, 0.47, Math.sin(angle) * radius);
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), index * 0.72);
    scale.set(0.7 + index % 3 * 0.18, 0.9 + index % 4 * 0.17, 0.72 + index % 2 * 0.14);
    matrix.compose(position, quaternion, scale);
    rocks.setMatrixAt(index, matrix);
  }
  for (let index = 0; index < driftCount; index += 1) {
    const angle = index / driftCount * Math.PI * 2 + 0.08;
    const radius = index % 2 ? 4.32 : 5.68;
    position.set(Math.cos(angle) * radius, 0.43, Math.sin(angle) * radius);
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angle);
    scale.set(1.15 + index % 3 * 0.14, 0.28 + index % 2 * 0.06, 0.68);
    matrix.compose(position, quaternion, scale);
    drifts.setMatrixAt(index, matrix);
  }
  rocks.instanceMatrix.needsUpdate = true;
  drifts.instanceMatrix.needsUpdate = true;
  root.add(rocks, drifts);
}

export function createIsland3FrostmoonLivingAmbience(
  scene: THREE.Scene,
  profile: Island3DQualityProfile,
  materials: Island3FrostmoonMaterials,
  ocean: THREE.Mesh,
): Island3FrostmoonAmbienceRuntime {
  const root = new THREE.Group();
  root.name = 'ISLAND_3_FROSTMOON_LIVING_AMBIENCE';
  root.userData.sculptRuntime = { clickable: true, explodable: true, world: 'island-003-frostmoon' };
  const quality = profile.id;
  const detail = detailFor(quality);
  const oceanMaterial = ocean.material as THREE.MeshPhysicalMaterial;
  oceanMaterial.color.setHex(0x87cfe6);
  oceanMaterial.roughness = 0.2;
  oceanMaterial.opacity = 0.88;

  const frostwellIceworks = createFrostwellIceworks(quality, materials);
  root.add(frostwellIceworks.root);

  addSnowShelf(root, 0, 0, 6.1, materials, quality, 0.2);
  const satellites: Array<[number, number]> = [[-4.36, -3.9], [4.36, -3.9], [-4.36, 3.9], [4.36, 3.9]];
  satellites.forEach(([x, z], index) => addSnowShelf(root, x, z, 2.42, materials, quality, index + 0.8));

  const iceChannels: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshPhysicalMaterial>[] = [];
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2 + 0.16;
    const channel = new THREE.Mesh(new THREE.PlaneGeometry(0.24 + index % 3 * 0.07, 2.4 + index % 2 * 0.5), materials.ice);
    channel.name = 'ISLAND_3_FROZEN_CASCADE';
    channel.position.set(Math.cos(angle) * 5.96, -0.52, Math.sin(angle) * 5.34);
    channel.rotation.y = -angle + Math.PI / 2;
    channel.userData.phase = index * 0.73;
    root.add(channel);
    iceChannels.push(channel);
  }

  const pines: THREE.Group[] = [];
  const pineCount = Math.round(30 * detail);
  for (let index = 0; index < pineCount; index += 1) {
    const angle = index / pineCount * Math.PI * 2 + 0.19;
    const protectedAngles = [-2.41, -0.73, 2.41, 0.73];
    if (protectedAngles.some((entry) => Math.abs(Math.atan2(Math.sin(angle - entry), Math.cos(angle - entry))) < 0.27)) continue;
    const radius = 5.0 + index % 4 * 0.25;
    pines.push(addSnowPine(root, Math.cos(angle) * radius, Math.sin(angle) * radius, 0.72 + index % 4 * 0.09, materials, quality, index * 0.7));
  }

  const pathLanternCount = quality === 'high' ? 14 : quality === 'medium' ? 9 : 5;
  for (let index = 0; index < pathLanternCount; index += 1) {
    const angle = index / pathLanternCount * Math.PI * 2 + 0.08;
    const radius = index % 2 ? 4.15 : 5.5;
    addLantern(root, Math.cos(angle) * radius, 0.93, Math.sin(angle) * radius, materials, 0.72);
  }

  const frostCrystalCount = quality === 'high' ? 18 : quality === 'medium' ? 11 : 6;
  for (let index = 0; index < frostCrystalCount; index += 1) {
    const angle = index / frostCrystalCount * Math.PI * 2 + 0.24;
    const radius = 5.36 + index % 3 * 0.2;
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.09 + index % 2 * 0.025), materials.crystal);
    crystal.position.set(Math.cos(angle) * radius, 0.58, Math.sin(angle) * radius);
    crystal.scale.y = 1.7;
    root.add(crystal);
  }

  addFrostSceneryInstances(root, materials, quality);

  const frozenPools: THREE.Mesh[] = [];
  satellites.forEach(([x, z], index) => {
    const length = Math.hypot(x, z);
    const tangentX = -z / length;
    const tangentZ = x / length;
    const side = index % 2 ? -1 : 1;
    frozenPools.push(addFrozenPool(root, x + tangentX * 1.55 * side, z + tangentZ * 1.55 * side, 0.8, materials, quality));
  });

  const hares: THREE.Group[] = [];
  const hareCount = quality === 'high' ? 4 : quality === 'medium' ? 2 : 1;
  for (let index = 0; index < hareCount; index += 1) {
    const hare = createSnowHare(materials, quality, index / hareCount * Math.PI * 2);
    root.add(hare);
    hares.push(hare);
  }

  const ravens: THREE.Group[] = [];
  const ravenCount = quality === 'high' ? 5 : quality === 'medium' ? 3 : 1;
  for (let index = 0; index < ravenCount; index += 1) {
    const raven = createFrostRaven(materials, index / ravenCount * Math.PI * 2);
    root.add(raven);
    ravens.push(raven);
  }

  const snowCount = quality === 'high' ? 150 : quality === 'medium' ? 88 : 42;
  const snowPositions = new Float32Array(snowCount * 3);
  for (let index = 0; index < snowCount; index += 1) {
    const angle = index * 2.39996;
    const radius = 1.5 + (index % 31) / 31 * 10;
    snowPositions[index * 3] = Math.cos(angle) * radius;
    snowPositions[index * 3 + 1] = 1.2 + (index % 23) / 23 * 8;
    snowPositions[index * 3 + 2] = Math.sin(angle) * radius;
  }
  const snowGeometry = new THREE.BufferGeometry();
  snowGeometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
  const snowMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: quality === 'low' ? 0.08 : 0.065, transparent: true, opacity: 0.78, depthWrite: false });
  const snowPoints = new THREE.Points(snowGeometry, snowMaterial);
  snowPoints.name = 'ISLAND_3_FALLING_SNOW';
  root.add(snowPoints);

  const smokePuffs: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>[] = [];
  const smokeSources: Array<[number, number]> = [[-4.36, -3.9], [-4.36, 3.9], [0, 0]];
  smokeSources.forEach(([x, z], sourceIndex) => {
    const puffCount = quality === 'high' ? 5 : quality === 'medium' ? 3 : 2;
    for (let index = 0; index < puffCount; index += 1) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.16 + index * 0.035, 8, 6), materials.smoke);
      puff.name = 'ISLAND_3_CHIMNEY_SMOKE';
      puff.position.set(x + 0.5, 2.2 + index * 0.28, z - 0.2);
      puff.userData.baseY = puff.position.y;
      puff.userData.phase = sourceIndex * 1.4 + index * 0.5;
      root.add(puff);
      smokePuffs.push(puff);
    }
  });

  const auroras: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  const auroraCount = quality === 'high' ? 4 : quality === 'medium' ? 3 : 2;
  for (let index = 0; index < auroraCount; index += 1) {
    const material = new THREE.MeshBasicMaterial({ color: index % 2 ? 0x7a67ee : 0x72e2d1, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(18 + index * 2, 2.4 + index * 0.4, 16, 2), material);
    ribbon.name = 'ISLAND_3_AURORA_RIBBON';
    ribbon.position.set(0, 12 + index * 1.8, -28 - index * 3);
    ribbon.rotation.x = -0.1;
    ribbon.rotation.z = (index - auroraCount / 2) * 0.08;
    ribbon.userData.phase = index * 1.2;
    root.add(ribbon);
    auroras.push(ribbon);
  }

  const distantCount = quality === 'high' ? 7 : quality === 'medium' ? 5 : 3;
  for (let index = 0; index < distantCount; index += 1) {
    const angle = index / distantCount * Math.PI * 2 + 0.48;
    const radius = 23 + index % 3 * 3.5;
    const cluster = new THREE.Group();
    cluster.name = 'ISLAND_3_DISTANT_ALPINE_MOUNTAIN';
    cluster.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    cluster.rotation.y = -angle + index * 0.17;
    const peakHeight = 4.4 + index % 3 * 0.45;
    const peakRadius = 2.35 + index % 2 * 0.32;
    const mountain = new THREE.Mesh(new THREE.ConeGeometry(peakRadius, peakHeight, 8), materials.frostRockDark);
    mountain.position.y = 0.88;
    mountain.scale.z = 0.78;
    const snow = new THREE.Mesh(new THREE.ConeGeometry(peakRadius * 0.62, peakHeight * 0.48, 8), materials.snow);
    snow.position.y = 0.88 + peakHeight * 0.27;
    snow.scale.z = 0.79;
    cluster.add(mountain, snow);
    if (quality !== 'low') {
      [-1, 1].forEach((side) => {
        const shoulderHeight = peakHeight * (0.52 + (side > 0 ? 0.08 : 0));
        const shoulder = new THREE.Mesh(new THREE.ConeGeometry(peakRadius * 0.56, shoulderHeight, 7), materials.frostRock);
        shoulder.position.set(side * peakRadius * 0.72, -0.1, 0.25);
        shoulder.scale.z = 0.72;
        const shoulderSnow = new THREE.Mesh(new THREE.ConeGeometry(peakRadius * 0.32, shoulderHeight * 0.4, 7), materials.snowShadow);
        shoulderSnow.position.set(side * peakRadius * 0.72, shoulderHeight * 0.2, 0.25);
        shoulderSnow.scale.z = 0.73;
        cluster.add(shoulder, shoulderSnow);
      });
    }
    root.add(cluster);
  }

  markShadows(root, quality !== 'low');
  scene.add(root);
  return {
    root,
    updateSignatureMission: frostwellIceworks.setPresentation,
    animate: (elapsed) => {
      frostwellIceworks.animate(elapsed);
      const positions = snowGeometry.getAttribute('position') as THREE.BufferAttribute;
      for (let index = 0; index < snowCount; index += 1) {
        let y = positions.getY(index) - (0.006 + index % 5 * 0.0008);
        if (y < 0.5) y = 8.5 + index % 7 * 0.14;
        positions.setY(index, y);
        positions.setX(index, positions.getX(index) + Math.sin(elapsed * 0.45 + index) * 0.0009);
      }
      positions.needsUpdate = true;
      smokePuffs.forEach((puff, index) => {
        puff.position.y = puff.userData.baseY + (elapsed * 0.11 + index * 0.1) % 1.2;
        puff.position.x += Math.sin(elapsed * 0.3 + puff.userData.phase) * 0.0008;
        const fade = 0.25 + (1 - ((elapsed * 0.11 + index * 0.1) % 1.2) / 1.2) * 0.2;
        puff.material.opacity = fade;
      });
      auroras.forEach((ribbon, index) => {
        ribbon.material.opacity = 0.12 + Math.sin(elapsed * 0.28 + ribbon.userData.phase) * 0.045;
        ribbon.scale.y = 0.94 + Math.sin(elapsed * 0.22 + index) * 0.08;
      });
      pines.forEach((pine, index) => { pine.rotation.z = Math.sin(elapsed * 0.35 + pine.userData.phase) * 0.008; });
      iceChannels.forEach((channel, index) => { channel.material.opacity = 0.7 + Math.sin(elapsed * 0.8 + channel.userData.phase + index) * 0.06; });
      frozenPools.forEach((pool, index) => {
        if (!Array.isArray(pool.material)) {
          pool.material.opacity = 0.7 + Math.sin(elapsed * 0.62 + pool.userData.phase + index) * 0.055;
        }
      });
      hares.forEach((hare, index) => {
        const angle = elapsed * (0.055 + index * 0.006) + hare.userData.phase;
        const radius = 5.7 + index % 2 * 0.24;
        hare.position.set(Math.cos(angle) * radius, 0.62 + Math.max(0, Math.sin(elapsed * 3.2 + index)) * 0.07, Math.sin(angle) * radius);
        hare.rotation.y = -angle;
      });
      ravens.forEach((raven, index) => {
        const angle = elapsed * (0.09 + index * 0.007) + raven.userData.phase;
        const radius = 7.3 + index % 3 * 0.6;
        raven.position.set(Math.cos(angle) * radius, 3.2 + index % 2 * 0.44 + Math.sin(angle * 2) * 0.16, Math.sin(angle) * radius);
        raven.rotation.y = -angle + Math.PI / 2;
        const flap = Math.sin(elapsed * 5.4 + index) * 0.46;
        const leftWing = raven.getObjectByName('leftWing');
        const rightWing = raven.getObjectByName('rightWing');
        if (leftWing) leftWing.rotation.z = flap;
        if (rightWing) rightWing.rotation.z = -flap;
      });
    },
  };
}
