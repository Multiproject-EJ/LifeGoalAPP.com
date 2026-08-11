import * as THREE from 'three';
import type {
  Island3DQuality,
  Island3DQualityProfile,
  Island5LandmarkDefinition,
} from './island5ThreePilotContract';
import { compactStaticGeometry } from './CrownCitadelThreeModel';

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

function createTropicalPatternTexture(size: number, pattern: 'wood' | 'thatch' | 'stone' | 'leaf') {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const hash = ((x * 73 + y * 151 + (x * y) % 97) % 31) - 15;
      let value = 220 + hash;
      if (pattern === 'wood') {
        const grain = (x + Math.round(Math.sin(y * 0.16) * 5)) % 17 < 2;
        value = grain ? 145 : 221 + Math.round(hash * 0.34);
      } else if (pattern === 'thatch') {
        const strand = (x * 3 + y) % 13 < 3;
        const fringe = y % 22 < 2;
        value = fringe ? 128 : strand ? 185 : 232 + Math.round(hash * 0.22);
      } else if (pattern === 'stone') {
        const course = Math.floor(y / 16);
        const seamX = (x + (course % 2) * 17) % 34;
        value = y % 16 < 2 || seamX < 2 ? 160 : 225 + Math.round(hash * 0.22);
      } else {
        const vein = (x * 5 + y * 3) % 29 < 2;
        value = vein ? 152 : 228 + Math.round(hash * 0.26);
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
  texture.needsUpdate = true;
  return texture;
}

export function createIsland2WorldMaterials(): Island2WorldMaterials {
  const wood = createTropicalPatternTexture(128, 'wood');
  const thatch = createTropicalPatternTexture(128, 'thatch');
  const stone = createTropicalPatternTexture(128, 'stone');
  const leaf = createTropicalPatternTexture(64, 'leaf');
  return {
    teak: new THREE.MeshStandardMaterial({ color: 0xa7652d, map: wood, roughness: 0.72, metalness: 0.01 }),
    teakDark: new THREE.MeshStandardMaterial({ color: 0x5a321e, map: wood, roughness: 0.82, metalness: 0 }),
    thatch: new THREE.MeshStandardMaterial({ color: 0xe2ad52, map: thatch, roughness: 0.94, metalness: 0, side: THREE.DoubleSide }),
    rope: new THREE.MeshStandardMaterial({ color: 0xc28a49, roughness: 0.96, metalness: 0 }),
    sand: new THREE.MeshStandardMaterial({ color: 0xf5d992, roughness: 0.97, metalness: 0 }),
    rock: new THREE.MeshStandardMaterial({ color: 0xbcae95, map: stone, roughness: 0.92, metalness: 0 }),
    rockShade: new THREE.MeshStandardMaterial({ color: 0x756f68, map: stone, roughness: 0.96, metalness: 0 }),
    garden: new THREE.MeshStandardMaterial({ color: 0x4e9d48, map: leaf, roughness: 0.92, metalness: 0 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x3f8d45, map: leaf, roughness: 0.78, metalness: 0, side: THREE.DoubleSide }),
    leafLight: new THREE.MeshStandardMaterial({ color: 0x83b841, map: leaf, roughness: 0.74, metalness: 0, side: THREE.DoubleSide }),
    leafDark: new THREE.MeshStandardMaterial({ color: 0x24623b, map: leaf, roughness: 0.84, metalness: 0, side: THREE.DoubleSide }),
    flowerCoral: new THREE.MeshStandardMaterial({ color: 0xff735f, roughness: 0.58, emissive: 0x5b160f, emissiveIntensity: 0.12 }),
    flowerPink: new THREE.MeshStandardMaterial({ color: 0xf45aad, roughness: 0.55, emissive: 0x4b102d, emissiveIntensity: 0.14 }),
    oceanCloth: new THREE.MeshStandardMaterial({ color: 0x176ca2, roughness: 0.5, metalness: 0.02, side: THREE.DoubleSide }),
    mangoGold: new THREE.MeshStandardMaterial({ color: 0xf2b840, roughness: 0.3, metalness: 0.58, emissive: 0x71400b, emissiveIntensity: 0.16 }),
    lagoonGlass: new THREE.MeshPhysicalMaterial({ color: 0x28c8d1, roughness: 0.1, metalness: 0.02, transparent: true, opacity: 0.84, transmission: 0.16, thickness: 0.22, clearcoat: 0.86, clearcoatRoughness: 0.12, depthWrite: false }),
    crystal: new THREE.MeshPhysicalMaterial({ color: 0x65f2ea, roughness: 0.08, metalness: 0.05, transparent: true, opacity: 0.86, transmission: 0.28, thickness: 0.7, clearcoat: 1, clearcoatRoughness: 0.05, emissive: 0x0aa9b7, emissiveIntensity: 0.78 }),
    egg: new THREE.MeshPhysicalMaterial({ color: 0xdff8eb, roughness: 0.2, metalness: 0.02, clearcoat: 0.74, clearcoatRoughness: 0.13 }),
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
  const palm = new THREE.Group();
  palm.name = 'ISLAND_2_PALM';
  palm.position.set(x, 0.34, z);
  palm.rotation.y = phase;
  const trunk = cylinder(0.08, 0.15, height, materials.teakDark, segmentsFor(quality));
  trunk.position.y = height / 2;
  trunk.rotation.z = Math.sin(phase) * 0.06;
  palm.add(trunk);
  const frondCount = quality === 'high' ? 9 : quality === 'medium' ? 7 : 5;
  for (let index = 0; index < frondCount; index += 1) {
    const angle = index / frondCount * Math.PI * 2;
    const frond = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.95, 3, 6), index % 3 === 0 ? materials.leafLight : materials.leaf);
    frond.position.set(Math.cos(angle) * 0.44, height + 0.04, Math.sin(angle) * 0.44);
    frond.rotation.z = Math.PI / 2.6;
    frond.rotation.y = -angle;
    frond.scale.set(1, 1, 0.34);
    frond.userData.frondPhase = phase + index;
    palm.add(frond);
  }
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
  const group = new THREE.Group();
  group.name = `ISLAND_2_HATCHERY_L${level}`;
  addDeck(group, 1.18, 0.2, materials, quality);
  const basin = cylinder(0.74, 0.82, 0.16, materials.lagoonGlass, segmentsFor(quality));
  basin.position.y = 0.52;
  group.add(basin);
  const nest = new THREE.Group();
  nest.name = 'ISLAND_2_HATCHERY_WOVEN_NEST';
  nest.position.set(0, 0.63, 0.72);
  const nestRings = level === 1 ? 3 : level === 2 ? 5 : 7;
  for (let index = 0; index < nestRings; index += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.46 + index * 0.035, 0.055, 5, quality === 'low' ? 12 : 20), index % 2 ? materials.rope : materials.teak);
    ring.rotation.x = Math.PI / 2 + (index % 2 ? 0.08 : -0.07);
    ring.rotation.z = index * 0.31;
    ring.position.y = index * 0.035;
    nest.add(ring);
  }
  const egg = new THREE.Mesh(new THREE.SphereGeometry(0.39 + level * 0.055, segmentsFor(quality), segmentsFor(quality)), materials.egg);
  egg.name = 'ISLAND_2_HATCHERY_EGG';
  egg.scale.set(0.82, 1.18, 0.82);
  egg.position.y = 0.62;
  nest.add(egg);
  const spotCount = quality === 'high' ? 12 : quality === 'medium' ? 8 : 4;
  for (let index = 0; index < spotCount; index += 1) {
    const angle = index / spotCount * Math.PI * 2;
    const spot = new THREE.Mesh(new THREE.SphereGeometry(0.075 + (index % 3) * 0.012, 6, 5), materials.eggSpot);
    spot.scale.z = 0.24;
    spot.position.set(Math.sin(angle) * 0.34, 0.45 + Math.sin(index * 1.7) * 0.26, Math.cos(angle) * 0.33);
    spot.lookAt(0, spot.position.y, 0);
    nest.add(spot);
  }
  group.add(nest);
  if (level >= 2) {
    [-0.82, 0.82].forEach((x) => addPost(group, x, -0.42, 1.45, materials, quality));
    addThatchRoof(group, 1.02, 2.02, materials, quality, true, -0.5);
    addBanner(group, 0, 1.46, -0.98, 0, materials);
  }
  if (level === 3) {
    addPalm(group, -1.05, 0.55, 1.42, materials, quality, 0.4);
    addPalm(group, 1.06, 0.6, 1.28, materials, quality, -0.7);
    addFlowerCluster(group, -0.72, 0.92, materials, quality, 0.3);
    addFlowerCluster(group, 0.72, 0.92, materials, quality, 1.1);
  }
  return group;
}

function createHabitLodge(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island2WorldMaterials) {
  const group = new THREE.Group();
  group.name = `ISLAND_2_HABIT_L${level}`;
  addDeck(group, 1.24, 0.2, materials, quality);
  const postHeight = level === 1 ? 0.95 : 1.52;
  [[-0.88, -0.68], [0.88, -0.68], [-0.88, 0.68], [0.88, 0.68]].forEach(([x, z]) => addPost(group, x, z, postHeight, materials, quality));
  const beam = box(1.98, 0.11, 0.13, materials.teakDark);
  beam.position.set(0, postHeight + 0.18, -0.68);
  group.add(beam);
  const bag = cylinder(0.16, 0.22, 0.74, materials.ink, 12);
  bag.name = 'ISLAND_2_HABIT_TRAINING_BAG';
  bag.position.set(0.5, postHeight - 0.33, -0.66);
  const bagRope = cylinder(0.022, 0.022, 0.34, materials.rope, 6);
  bagRope.position.set(0.5, postHeight + 0.01, -0.66);
  group.add(bag, bagRope);
  const bar = cylinder(0.035, 0.035, 0.84, materials.mangoGold, 8);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(-0.32, 0.65, 0.24);
  group.add(bar);
  [-0.38, 0.38].forEach((offset) => {
    const weight = cylinder(0.16, 0.16, 0.1, materials.ink, 10);
    weight.rotation.z = Math.PI / 2;
    weight.position.set(-0.32 + offset, 0.65, 0.24);
    group.add(weight);
  });
  if (level >= 2) addGabledThatchRoof(group, 2.45, 1.55, postHeight + 0.54, materials, quality);
  if (level === 3) {
    const railCount = quality === 'high' ? 12 : 8;
    for (let index = 0; index < railCount; index += 1) {
      const angle = index / railCount * Math.PI * 2;
      if (Math.abs(Math.cos(angle)) < 0.3 && Math.sin(angle) > 0) continue;
      const rail = cylinder(0.025, 0.035, 0.44, materials.teakDark, 6);
      rail.position.set(Math.cos(angle) * 1.07, 0.71, Math.sin(angle) * 1.07);
      group.add(rail);
    }
    addBanner(group, -1.02, 1.55, 0, Math.PI / 2, materials);
    addBanner(group, 1.02, 1.55, 0, -Math.PI / 2, materials);
    addFlowerCluster(group, -1.06, 0.9, materials, quality, 0.2);
  }
  return group;
}

function createStarArchive(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island2WorldMaterials) {
  const group = new THREE.Group();
  group.name = `ISLAND_2_WISDOM_L${level}`;
  addDeck(group, 1.2, 0.2, materials, quality);
  const back = box(1.64, 1.1, 0.18, materials.teakDark);
  back.position.set(0, 1.02, -0.72);
  group.add(back);
  const shelfRows = level === 1 ? 1 : level === 2 ? 2 : 3;
  for (let row = 0; row < shelfRows; row += 1) {
    const shelf = box(1.5, 0.06, 0.3, materials.teak);
    shelf.position.set(0, 0.65 + row * 0.32, -0.55);
    group.add(shelf);
    const bookCount = quality === 'high' ? 10 : quality === 'medium' ? 7 : 5;
    for (let index = 0; index < bookCount; index += 1) {
      const book = box(0.09, 0.21 + (index % 3) * 0.025, 0.16, index % 3 === 0 ? materials.oceanCloth : index % 3 === 1 ? materials.flowerCoral : materials.paper);
      book.position.set(-0.62 + index * (1.24 / Math.max(1, bookCount - 1)), 0.78 + row * 0.32, -0.43);
      book.rotation.z = index % 4 === 0 ? 0.08 : 0;
      group.add(book);
    }
  }
  const table = cylinder(0.42, 0.48, 0.12, materials.teak, 14);
  table.position.set(0, 0.68, 0.38);
  group.add(table);
  const openBook = box(0.48, 0.035, 0.34, materials.paper);
  openBook.position.set(0, 0.76, 0.38);
  openBook.rotation.y = 0.08;
  group.add(openBook);
  if (level >= 2) {
    [-0.86, 0.86].forEach((x) => addPost(group, x, -0.5, 1.42, materials, quality));
    addGabledThatchRoof(group, 2.25, 1.48, 1.96, materials, quality);
  }
  if (level === 3) {
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.18, segmentsFor(quality), 10), materials.crystal);
    globe.position.set(-0.6, 0.98, 0.2);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.018, 5, 16), materials.mangoGold);
    ring.position.copy(globe.position);
    ring.rotation.x = 0.55;
    group.add(globe, ring);
    addBanner(group, 0.98, 1.35, -0.15, -Math.PI / 2, materials);
    addFlowerCluster(group, 0.88, 0.96, materials, quality, 0.7);
  }
  return group;
}

function createTideglassOracle(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island2WorldMaterials) {
  const group = new THREE.Group();
  group.name = `ISLAND_2_EVENT_L${level}`;
  addDeck(group, 1.2, 0.2, materials, quality);
  const pedestal = cylinder(0.28, 0.38, 0.58, materials.teakDark, segmentsFor(quality));
  pedestal.position.y = 0.77;
  group.add(pedestal);
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.3 + level * 0.035, segmentsFor(quality), segmentsFor(quality)), materials.crystal);
  sphere.name = 'ISLAND_2_ORACLE_CRYSTAL';
  sphere.position.y = 1.21;
  group.add(sphere);
  const ringCount = level === 1 ? 1 : level === 2 ? 2 : 3;
  for (let index = 0; index < ringCount; index += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.38 + index * 0.075, 0.022, 5, 20), materials.mangoGold);
    ring.position.y = 1.21;
    ring.rotation.set(index * 0.62, index * 0.46, index * 0.38);
    ring.name = 'ISLAND_2_ORACLE_RING';
    group.add(ring);
  }
  if (level >= 2) {
    [[-0.88, -0.64], [0.88, -0.64], [-0.88, 0.64], [0.88, 0.64]].forEach(([x, z]) => addPost(group, x, z, 1.48, materials, quality));
    const canopy = cylinder(1.18, 1.3, 0.16, materials.oceanCloth, segmentsFor(quality));
    canopy.position.y = 1.96;
    canopy.scale.z = 0.78;
    group.add(canopy);
  }
  if (level === 3) {
    for (let index = 0; index < 4; index += 1) {
      const angle = index / 4 * Math.PI * 2 + Math.PI / 4;
      const lantern = cylinder(0.08, 0.11, 0.24, materials.mangoGold, 8);
      lantern.position.set(Math.cos(angle) * 0.92, 1.53, Math.sin(angle) * 0.66);
      group.add(lantern);
    }
    const compass = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.045, 5, 18), materials.mangoGold);
    compass.rotation.x = Math.PI / 2;
    compass.position.set(-0.6, 0.72, 0.42);
    group.add(compass);
    addBanner(group, 0, 1.55, -0.76, 0, materials);
  }
  return group;
}

function createSunwheelArena(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island2WorldMaterials) {
  const group = new THREE.Group();
  group.name = `ISLAND_2_BOSS_L${level}`;
  const foundation = cylinder(1.9, 2.12, 0.26, materials.rock, segmentsFor(quality));
  foundation.position.y = 0.23;
  const deck = cylinder(1.68, 1.82, 0.18, materials.teak, segmentsFor(quality));
  deck.position.y = 0.43;
  const inlay = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.025, 32), materials.oceanCloth);
  inlay.position.y = 0.535;
  group.add(foundation, deck, inlay);
  const sun = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.07, 5, 24), materials.mangoGold);
  sun.rotation.x = Math.PI / 2;
  sun.position.y = 0.565;
  group.add(sun);
  const rayCount = quality === 'high' ? 12 : quality === 'medium' ? 8 : 6;
  for (let index = 0; index < rayCount; index += 1) {
    const angle = index / rayCount * Math.PI * 2;
    const ray = box(0.08, 0.035, 0.42, materials.mangoGold);
    ray.position.set(Math.sin(angle) * 0.7, 0.57, Math.cos(angle) * 0.7);
    ray.rotation.y = angle;
    group.add(ray);
  }
  if (level >= 2) {
    for (let side = 0; side < 4; side += 1) {
      const angle = side / 4 * Math.PI * 2;
      for (let step = 0; step < 3; step += 1) {
        const stair = box(0.8 + step * 0.16, 0.08, 0.28, materials.rock);
        stair.position.set(Math.sin(angle) * (1.8 + step * 0.12), 0.12 + step * 0.08, Math.cos(angle) * (1.8 + step * 0.12));
        stair.rotation.y = angle;
        group.add(stair);
      }
    }
    const postCount = quality === 'high' ? 16 : quality === 'medium' ? 12 : 8;
    for (let index = 0; index < postCount; index += 1) {
      const angle = index / postCount * Math.PI * 2;
      if (index % (postCount / 4) === 0) continue;
      const post = cylinder(0.055, 0.075, 0.58, materials.teakDark, 7);
      post.position.set(Math.cos(angle) * 1.58, 0.81, Math.sin(angle) * 1.58);
      group.add(post);
    }
  }
  if (level === 3) {
    for (let side = 0; side < 4; side += 1) {
      const angle = side / 4 * Math.PI * 2 + Math.PI / 4;
      const arch = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.055, 6, 16, Math.PI), materials.teakDark);
      arch.position.set(Math.cos(angle) * 1.48, 1.35, Math.sin(angle) * 1.48);
      arch.rotation.y = -angle;
      arch.rotation.z = Math.PI;
      group.add(arch);
      addBanner(group, Math.cos(angle) * 1.48, 1.05, Math.sin(angle) * 1.48, -angle, materials);
    }
  }
  return group;
}

export function buildIsland2Landmark(
  definition: Island5LandmarkDefinition,
  level: BuildLevel,
  quality: Island3DQuality,
  materials: Island2WorldMaterials,
) {
  const root = new THREE.Group();
  root.name = `ISLAND_2_${definition.id.toUpperCase()}_ROOT`;
  root.position.set(...definition.position);
  if (level === 0) {
    const foundation = cylinder(definition.id === 'boss' ? 2 : 1.48, definition.id === 'boss' ? 2.12 : 1.6, 0.18, definition.id === 'boss' ? materials.teak : materials.rock, segmentsFor(quality));
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
          : definition.id === 'event'
            ? createTideglassOracle(resolved, quality, materials)
            : createSunwheelArena(resolved, quality, materials);
    if (definition.id !== 'boss') building.rotation.y = Math.atan2(-definition.position[0], -definition.position[2]);
    compactStaticGeometry(building, `ISLAND2_${definition.id.toUpperCase()}_L${resolved}`);
    root.add(building);
  }
  root.traverse((child) => { child.userData.landmarkId = definition.id; });
  markShadows(root, quality !== 'low');
  return root;
}

function addBeachShelf(root: THREE.Group, x: number, z: number, radius: number, materials: Island2WorldMaterials, quality: Island3DQuality) {
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
  for (let index = 0; index < 6; index += 1) {
    const plank = box(1.18, 0.11, 0.42, materials.teak);
    plank.position.set(0, 0.28, -index * 0.38);
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
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 1.05, 4, 10), materials.teakDark);
  hull.rotation.z = Math.PI / 2;
  hull.scale.z = 0.55;
  boat.add(hull);
  const mast = cylinder(0.025, 0.03, 0.9, materials.teakDark, 6);
  mast.position.y = 0.55;
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.68), materials.paper);
  sail.position.set(0.28, 0.62, 0);
  sail.rotation.y = Math.PI / 2;
  boat.add(mast, sail);
  dock.add(boat);
  return dock;
}

function addDistantIslands(root: THREE.Group, materials: Island2WorldMaterials, quality: Island3DQuality) {
  const count = quality === 'high' ? 7 : quality === 'medium' ? 5 : 3;
  for (let index = 0; index < count; index += 1) {
    const angle = index / count * Math.PI * 2 + 0.4;
    const radius = 18 + (index % 3) * 2.8;
    const rock = new THREE.Mesh(new THREE.ConeGeometry(1.1 + (index % 2) * 0.4, 1.4 + (index % 3) * 0.28, 7), materials.rockShade);
    rock.position.set(Math.cos(angle) * radius, -0.05, Math.sin(angle) * radius);
    rock.scale.z = 1.4;
    root.add(rock);
    if (quality !== 'low') addPalm(root, Math.cos(angle) * radius, Math.sin(angle) * radius, 0.8, materials, quality, angle);
  }
}

function addInstancedGardenDetails(root: THREE.Group, materials: Island2WorldMaterials, quality: Island3DQuality) {
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
  const birds: THREE.Group[] = [];
  const butterflies: THREE.Group[] = [];
  const fish: THREE.Group[] = [];
  const turtles: THREE.Group[] = [];

  addBeachShelf(root, 0, 0.12, 6.0, materials, quality);
  [[-4.36, -3.9], [4.36, -3.9], [-4.36, 3.9], [4.36, 3.9]].forEach(([x, z]) => addBeachShelf(root, x, z, 2.42, materials, quality));

  const palmCount = quality === 'high' ? 20 : quality === 'medium' ? 14 : 8;
  const protectedAngles = [-2.41, -0.73, 2.41, 0.73];
  const angularDistance = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  let palmIndex = 0;
  for (let attempt = 0; attempt < palmCount * 4 && palmIndex < palmCount; attempt += 1) {
    const angle = attempt / (palmCount * 1.55) * Math.PI * 2 + 0.17;
    if (protectedAngles.some((protectedAngle) => angularDistance(angle, protectedAngle) < 0.3)) continue;
    const radius = 5.25 + (palmIndex % 4) * 0.28;
    const palm = addPalm(root, Math.cos(angle) * radius, Math.sin(angle) * radius, 1.08 + (palmIndex % 4) * 0.16, materials, quality, angle + palmIndex * 0.27);
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
  addDistantIslands(root, materials, quality);
  addInstancedGardenDetails(root, materials, quality);
  addTropicalCloudBelt(root, quality);

  const birdCount = quality === 'high' ? 9 : quality === 'medium' ? 5 : 2;
  for (let index = 0; index < birdCount; index += 1) {
    const bird = new THREE.Group();
    bird.name = 'ISLAND_2_BIRD';
    const left = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.34, 3), materials.paper);
    const right = left.clone();
    left.position.x = -0.16;
    right.position.x = 0.16;
    left.rotation.z = -Math.PI / 2;
    right.rotation.z = Math.PI / 2;
    bird.add(left, right);
    bird.userData.left = left;
    bird.userData.right = right;
    birds.push(bird);
    root.add(bird);
  }

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

  const fishCount = quality === 'high' ? 18 : quality === 'medium' ? 10 : 4;
  for (let index = 0; index < fishCount; index += 1) {
    const fishRoot = new THREE.Group();
    fishRoot.name = 'ISLAND_2_LAGOON_FISH';
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), index % 2 ? materials.mangoGold : materials.crystal);
    body.scale.set(1.5, 0.5, 0.65);
    fishRoot.add(body);
    fish.push(fishRoot);
    root.add(fishRoot);
  }

  const turtleCount = quality === 'high' ? 3 : quality === 'medium' ? 2 : 1;
  for (let index = 0; index < turtleCount; index += 1) {
    const turtle = new THREE.Group();
    turtle.name = 'ISLAND_2_TURTLE';
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), materials.leafDark);
    shell.scale.set(1.15, 0.38, 0.86);
    turtle.add(shell);
    for (let flipper = 0; flipper < 4; flipper += 1) {
      const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.17, 2, 5), materials.leaf);
      limb.rotation.z = Math.PI / 2;
      limb.rotation.y = flipper * Math.PI / 2;
      limb.position.set(Math.cos(flipper * Math.PI / 2) * 0.18, 0, Math.sin(flipper * Math.PI / 2) * 0.14);
      turtle.add(limb);
    }
    turtles.push(turtle);
    root.add(turtle);
  }

  markShadows(root, quality !== 'low');
  scene.add(root);

  const oceanPosition = ocean.geometry.getAttribute('position') as THREE.BufferAttribute;
  const oceanBase = Float32Array.from(oceanPosition.array as ArrayLike<number>);
  let lastOceanUpdate = 0;
  return {
    root,
    animate: (elapsed) => {
      palms.forEach((palm, palmIndex) => {
        palm.children.forEach((child) => {
          if (child.userData.frondPhase === undefined) return;
          child.rotation.x = Math.sin(elapsed * 0.44 + (child.userData.frondPhase as number)) * 0.055 * detail;
          child.rotation.z += Math.sin(elapsed * 0.31 + palmIndex) * 0.0008 * detail;
        });
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
      birds.forEach((bird, index) => {
        const angle = elapsed * (0.08 + index * 0.003) + index / birdCount * Math.PI * 2;
        bird.position.set(Math.cos(angle) * (8 + index % 3), 3.2 + index % 3 * 0.5, Math.sin(angle) * (8 + index % 3));
        bird.rotation.y = -angle;
        const flap = Math.sin(elapsed * 5.4 + index) * 0.54;
        (bird.userData.left as THREE.Mesh).rotation.y = flap;
        (bird.userData.right as THREE.Mesh).rotation.y = -flap;
      });
      butterflies.forEach((butterfly, index) => {
        const angle = elapsed * (0.15 + index * 0.002) + index / Math.max(1, butterflyCount) * Math.PI * 2;
        const radius = 4.35 + index % 4 * 0.3;
        butterfly.position.set(Math.cos(angle) * radius, 0.82 + Math.sin(elapsed * 1.5 + index) * 0.2, Math.sin(angle) * radius);
        const flap = Math.sin(elapsed * 8.6 + index) * 0.75;
        (butterfly.userData.left as THREE.Mesh).rotation.y = flap;
        (butterfly.userData.right as THREE.Mesh).rotation.y = -flap;
      });
      fish.forEach((fishRoot, index) => {
        const angle = elapsed * (0.17 + index * 0.004) + index / fishCount * Math.PI * 2;
        const radius = 6.8 + index % 5 * 0.72;
        fishRoot.position.set(Math.cos(angle) * radius, -0.48 + Math.sin(elapsed + index) * 0.025, Math.sin(angle) * radius);
        fishRoot.rotation.y = -angle + Math.PI / 2;
      });
      turtles.forEach((turtle, index) => {
        const angle = elapsed * (0.045 + index * 0.006) + index / turtleCount * Math.PI * 2;
        const radius = 9.5 + index * 1.35;
        turtle.position.set(Math.cos(angle) * radius, -0.49 + Math.sin(elapsed * 0.7 + index) * 0.035, Math.sin(angle) * radius);
        turtle.rotation.y = -angle + Math.PI / 2;
        turtle.rotation.z = Math.sin(elapsed * 0.52 + index) * 0.025;
      });
      root.children.forEach((child) => {
        if (child.name !== 'ISLAND_2_CLOUD') return;
        const baseAngle = child.userData.cloudAngle as number;
        const radius = child.userData.cloudRadius as number;
        const angle = baseAngle + elapsed * 0.0035;
        child.position.x = Math.cos(angle) * radius;
        child.position.z = Math.sin(angle) * radius;
      });
      materials.crystal.emissiveIntensity = 0.68 + Math.sin(elapsed * 1.05) * 0.16;
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
