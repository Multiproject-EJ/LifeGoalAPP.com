import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type {
  Island3DQuality,
  Island3DQualityProfile,
  Island5LandmarkDefinition,
} from './island5ThreePilotContract';
import { ISLAND_5_LANDMARKS } from './island5ThreePilotContract';
import {
  applyIslandConstructionAuthoring,
  type IslandConstructionFactoryOptions,
} from './IslandConstructionAuthoring';
import { createIsland14RoyalCathedralV7 } from './Island14RoyalCathedralV7';
import { createIsland14SatelliteLandmarkV2 } from './Island14SatelliteLandmarksV2';
import { createIsland14HoneyWorldPresentationV2 } from './Island14HoneyWorldPresentationV2';

type BuildLevel = 0 | 1 | 2 | 3;

export const ISLAND_14_HONEYCOMB_WORLD_NAME = 'Honeycomb Kingdom';

export const ISLAND_14_HONEYCOMB_LANDMARK_LABELS = {
  boss: 'Royal Honeycomb Palace',
  hatchery: "Queen's Nursery Hatchery",
  habit: 'Pollinator Yard',
  wisdom: 'Hive Archives',
  event: 'Nectar Trials Pavilion',
} as const;

export interface Island14HoneycombMaterials {
  honeyRock: THREE.MeshStandardMaterial;
  honeyRockShadow: THREE.MeshStandardMaterial;
  waxCream: THREE.MeshStandardMaterial;
  warmGold: THREE.MeshStandardMaterial;
  paleGold: THREE.MeshStandardMaterial;
  darkBronze: THREE.MeshStandardMaterial;
  royalPurple: THREE.MeshPhysicalMaterial;
  honeyGlass: THREE.MeshPhysicalMaterial;
  honeyLiquid: THREE.MeshPhysicalMaterial;
  honeyHighlight: THREE.MeshPhysicalMaterial;
  warmWindow: THREE.MeshStandardMaterial;
  leaf: THREE.MeshStandardMaterial;
  leafLight: THREE.MeshStandardMaterial;
  petalPink: THREE.MeshStandardMaterial;
  petalCream: THREE.MeshStandardMaterial;
  petalPurple: THREE.MeshStandardMaterial;
  cloud: THREE.MeshStandardMaterial;
  beeBlack: THREE.MeshStandardMaterial;
  wing: THREE.MeshPhysicalMaterial;
}

export interface Island14HoneycombAmbienceRuntime {
  root: THREE.Group;
  animate: (elapsed: number) => void;
  setGreatHoneyfallStage?: (stage: number, replay?: boolean) => void;
  updateView?: (cameraPosition: THREE.Vector3, cameraTarget?: THREE.Vector3) => void;
}

/** Read-only canonical mission state consumed by the Three.js presentation. */
export interface Island14GreatHoneyfallPresentation {
  activatedReservoirs: 0 | 1 | 2 | 3 | 4;
  constructionSequence?: number;
}

export const ISLAND_14_GREAT_HONEYFALL_MISSION_ID = 'great-honeyfall-coronation';
export const ISLAND_14_GREAT_HONEYFALL_MAX_STAGE = 4;

function markStage<T extends THREE.Object3D>(object: T, stage: 1 | 2 | 3 | 4 | 5): T {
  object.userData.constructionStage = stage;
  return object;
}

function setMeshPresentation(mesh: THREE.Mesh, name: string, stage: 1 | 2 | 3 | 4 | 5) {
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  markStage(mesh, stage);
  return mesh;
}

function box(
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
  name: string,
  stage: 1 | 2 | 3 | 4 | 5,
) {
  return setMeshPresentation(new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material), name, stage);
}

function cylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  material: THREE.Material,
  name: string,
  stage: 1 | 2 | 3 | 4 | 5,
  segments = 12,
) {
  return setMeshPresentation(
    new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material),
    name,
    stage,
  );
}

function sphere(
  radius: number,
  material: THREE.Material,
  name: string,
  stage: 1 | 2 | 3 | 4 | 5,
  segments = 16,
) {
  return setMeshPresentation(
    new THREE.Mesh(new THREE.SphereGeometry(radius, segments, Math.max(8, Math.round(segments * 0.65))), material),
    name,
    stage,
  );
}

function cone(
  radius: number,
  height: number,
  material: THREE.Material,
  name: string,
  stage: 1 | 2 | 3 | 4 | 5,
  segments = 8,
) {
  return setMeshPresentation(new THREE.Mesh(new THREE.ConeGeometry(radius, height, segments), material), name, stage);
}

function torus(
  radius: number,
  tube: number,
  material: THREE.Material,
  name: string,
  stage: 1 | 2 | 3 | 4 | 5,
  radialSegments = 8,
  tubularSegments = 24,
) {
  return setMeshPresentation(
    new THREE.Mesh(new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments), material),
    name,
    stage,
  );
}

function capsule(
  radius: number,
  length: number,
  material: THREE.Material,
  name: string,
  stage: 1 | 2 | 3 | 4 | 5,
  capSegments = 5,
  radialSegments = 10,
) {
  return setMeshPresentation(
    new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, capSegments, radialSegments), material),
    name,
    stage,
  );
}

function createHexFrame(
  radius: number,
  depth: number,
  bar: number,
  material: THREE.Material,
  name: string,
  stage: 1 | 2 | 3 | 4 | 5,
) {
  const group = markStage(new THREE.Group(), stage);
  group.name = name;
  for (let index = 0; index < 6; index += 1) {
    const angle = index / 6 * Math.PI * 2;
    const edge = box(radius, bar, depth, material, `${name}_EDGE_${index + 1}`, stage);
    edge.position.set(Math.cos(angle) * radius * 0.86, Math.sin(angle) * radius * 0.86, 0);
    edge.rotation.z = angle + Math.PI / 2;
    group.add(edge);
  }
  return group;
}

function createFlatHexRingGeometry(outerRadius: number, innerRadius: number, depth: number) {
  const shape = new THREE.Shape();
  for (let index = 0; index < 6; index += 1) {
    const angle = Math.PI / 6 + index / 6 * Math.PI * 2;
    const x = Math.cos(angle) * outerRadius;
    const y = Math.sin(angle) * outerRadius;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const hole = new THREE.Path();
  for (let index = 5; index >= 0; index -= 1) {
    const angle = Math.PI / 6 + index / 6 * Math.PI * 2;
    const x = Math.cos(angle) * innerRadius;
    const y = Math.sin(angle) * innerRadius;
    if (index === 5) hole.moveTo(x, y);
    else hole.lineTo(x, y);
  }
  hole.closePath();
  shape.holes.push(hole);
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: depth * 0.28,
    bevelThickness: depth * 0.18,
    curveSegments: 2,
  });
}

function addHexCellBand(
  root: THREE.Group,
  options: {
    prefix: string;
    radius: number;
    y: number;
    count: number;
    cellRadius: number;
    material: THREE.Material;
    insetMaterial: THREE.Material;
    stage: 1 | 2 | 3 | 4 | 5;
    centerX?: number;
    centerZ?: number;
  },
) {
  for (let index = 0; index < options.count; index += 1) {
    const angle = index / options.count * Math.PI * 2;
    const cell = createHexFrame(
      options.cellRadius,
      0.055,
      0.035,
      options.material,
      `${options.prefix}_CELL_${index + 1}`,
      options.stage,
    );
    cell.position.set(
      (options.centerX ?? 0) + Math.cos(angle) * options.radius,
      options.y,
      (options.centerZ ?? 0) + Math.sin(angle) * options.radius,
    );
    cell.rotation.y = -angle + Math.PI / 2;
    const inset = cylinder(
      options.cellRadius * 0.7,
      options.cellRadius * 0.7,
      0.035,
      options.insetMaterial,
      `${options.prefix}_CELL_${index + 1}_GLOW`,
      options.stage,
      6,
    );
    inset.rotation.x = Math.PI / 2;
    inset.position.z = 0.015;
    cell.add(inset);
    root.add(cell);
  }
}

function addBeeCrest(
  root: THREE.Group,
  prefix: string,
  position: readonly [number, number, number],
  scale: number,
  materials: Island14HoneycombMaterials,
  stage: 1 | 2 | 3 | 4 | 5,
) {
  const crest = markStage(new THREE.Group(), stage);
  crest.name = `${prefix}_BEE_CREST`;
  crest.position.set(...position);
  crest.scale.setScalar(scale);
  const thorax = sphere(0.16, materials.warmGold, `${prefix}_BEE_THORAX`, stage, 12);
  thorax.scale.set(1, 1.25, 0.62);
  const abdomen = sphere(0.19, materials.warmGold, `${prefix}_BEE_ABDOMEN`, stage, 12);
  abdomen.position.y = -0.26;
  abdomen.scale.set(0.92, 1.35, 0.68);
  for (let stripeIndex = 0; stripeIndex < 2; stripeIndex += 1) {
    const stripe = torus(0.15, 0.035, materials.beeBlack, `${prefix}_BEE_STRIPE_${stripeIndex + 1}`, stage, 6, 18);
    stripe.rotation.x = Math.PI / 2;
    stripe.position.y = -0.18 - stripeIndex * 0.12;
    stripe.scale.z = 0.65;
    crest.add(stripe);
  }
  const head = sphere(0.12, materials.darkBronze, `${prefix}_BEE_HEAD`, stage, 12);
  head.position.y = 0.22;
  const leftWing = sphere(0.17, materials.wing, `${prefix}_BEE_WING_LEFT`, stage, 12);
  leftWing.position.set(-0.2, 0.03, -0.02);
  leftWing.scale.set(1.5, 0.65, 0.18);
  leftWing.rotation.z = -0.5;
  const rightWing = leftWing.clone();
  rightWing.name = `${prefix}_BEE_WING_RIGHT`;
  rightWing.position.x = 0.2;
  rightWing.rotation.z = 0.5;
  crest.add(thorax, abdomen, head, leftWing, rightWing);
  root.add(crest);
  return crest;
}

function addFlower(
  root: THREE.Group,
  prefix: string,
  x: number,
  y: number,
  z: number,
  scale: number,
  petalMaterial: THREE.Material,
  materials: Island14HoneycombMaterials,
) {
  const flower = new THREE.Group();
  flower.name = prefix;
  flower.position.set(x, y, z);
  flower.scale.setScalar(scale);
  const stem = cylinder(0.025, 0.035, 0.5, materials.leaf, `${prefix}_STEM`, 5, 7);
  stem.position.y = 0.25;
  flower.add(stem);
  const leafLeft = sphere(0.14, materials.leaf, `${prefix}_LEAF_LEFT`, 5, 7);
  leafLeft.position.set(-0.12, 0.25, 0);
  leafLeft.scale.set(1.35, 0.36, 0.52);
  leafLeft.rotation.z = -0.42;
  const leafRight = leafLeft.clone();
  leafRight.name = `${prefix}_LEAF_RIGHT`;
  leafRight.position.x = 0.12;
  leafRight.rotation.z = 0.42;
  flower.add(leafLeft, leafRight);
  for (let index = 0; index < 7; index += 1) {
    const angle = index / 7 * Math.PI * 2;
    const petal = sphere(0.12, petalMaterial, `${prefix}_PETAL_${index + 1}`, 5, 9);
    petal.scale.set(0.72, 1.5, 0.36);
    petal.position.set(Math.cos(angle) * 0.19, 0.58 + Math.sin(angle) * 0.19, 0);
    petal.rotation.z = -angle;
    flower.add(petal);
  }
  const center = sphere(0.105, materials.warmGold, `${prefix}_CENTER`, 5, 10);
  center.position.y = 0.58;
  center.scale.z = 0.45;
  flower.add(center);
  root.add(flower);
}

function addTieredStairs(
  root: THREE.Group,
  prefix: string,
  width: number,
  depth: number,
  steps: number,
  material: THREE.Material,
  stage: 1 | 2 | 3 | 4 | 5,
) {
  for (let index = 0; index < steps; index += 1) {
    const step = box(
      width - index * width * 0.08,
      0.1,
      depth / steps + 0.06,
      material,
      `${prefix}_STEP_${index + 1}`,
      stage,
    );
    step.position.set(0, 0.05 + index * 0.1, 0.58 + index * depth / steps);
    root.add(step);
  }
}

function addArchedDoor(
  root: THREE.Group,
  prefix: string,
  y: number,
  z: number,
  scale: number,
  materials: Island14HoneycombMaterials,
  stage: 1 | 2 | 3 | 4 | 5,
) {
  const frame = torus(0.32 * scale, 0.075 * scale, materials.paleGold, `${prefix}_DOOR_FRAME`, stage, 8, 24);
  frame.scale.y = 1.3;
  frame.position.set(0, y, z);
  const door = box(0.48 * scale, 0.65 * scale, 0.07, materials.royalPurple, `${prefix}_ROYAL_DOOR`, stage);
  door.position.set(0, y - 0.09 * scale, z + 0.015);
  root.add(frame, door);
}

function addHiveDome(
  root: THREE.Group,
  prefix: string,
  radius: number,
  y: number,
  materials: Island14HoneycombMaterials,
  stage: 1 | 2 | 3 | 4 | 5,
  x = 0,
  z = 0,
) {
  const startIndex = root.children.length;
  const dome = sphere(radius, materials.warmGold, `${prefix}_HIVE_DOME`, stage, 20);
  dome.scale.y = 0.82;
  dome.position.y = y;
  root.add(dome);
  for (let ringIndex = 0; ringIndex < 3; ringIndex += 1) {
    const ring = torus(
      radius * (0.88 - ringIndex * 0.13),
      radius * 0.035,
      materials.paleGold,
      `${prefix}_DOME_RING_${ringIndex + 1}`,
      stage,
      7,
      28,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y + radius * (0.33 - ringIndex * 0.28);
    root.add(ring);
  }
  const finial = sphere(radius * 0.13, materials.honeyGlass, `${prefix}_DOME_FINIAL`, stage, 10);
  finial.position.y = y + radius * 0.9;
  root.add(finial);
  root.children.slice(startIndex).forEach((child) => {
    child.position.x += x;
    child.position.z += z;
  });
}

function createHoneycombPatternTexture() {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  const cellWidth = 32;
  const cellHeight = 27.72;
  const radius = 14.2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let nearestMetric = Number.POSITIVE_INFINITY;
      let nearestCell = 0;
      const rowGuess = Math.round(y / cellHeight);
      for (let row = rowGuess - 1; row <= rowGuess + 1; row += 1) {
        const stagger = (row & 1) * cellWidth * 0.5;
        const columnGuess = Math.round((x - stagger) / cellWidth);
        for (let column = columnGuess - 1; column <= columnGuess + 1; column += 1) {
          const centerX = column * cellWidth + stagger;
          const centerY = row * cellHeight;
          const dx = Math.abs(x - centerX);
          const dy = Math.abs(y - centerY);
          const metric = Math.max(dx * 0.8660254 + dy * 0.5, dy);
          if (metric < nearestMetric) {
            nearestMetric = metric;
            nearestCell = Math.abs(row * 7 + column * 11);
          }
        }
      }
      const borderDistance = Math.abs(nearestMetric - radius);
      const isBorder = borderDistance < 1.55;
      const fill = isBorder ? 0.5 : 0.96 - (nearestCell % 4) * 0.025;
      const offset = (y * size + x) * 4;
      data[offset] = Math.round(255 * fill);
      data[offset + 1] = Math.round(255 * fill);
      data[offset + 2] = Math.round(255 * fill);
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.name = 'ISLAND_14_HONEYCOMB_PATTERN';
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3.4, 3.4);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export function createIsland14HoneycombMaterials(): Island14HoneycombMaterials {
  const honeycombPattern = createHoneycombPatternTexture();
  const leaf = new THREE.MeshStandardMaterial({ color: 0x405f1e, roughness: 0.74 });
  const waxCream = new THREE.MeshStandardMaterial({
    color: 0xf0b854,
    roughness: 0.52,
    metalness: 0.03,
    emissive: 0x6f3505,
    emissiveIntensity: 0.06,
  });
  const honeyHighlight = new THREE.MeshPhysicalMaterial({
    color: 0xfff2ad,
    roughness: 0.025,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.01,
    transparent: true,
    opacity: 0.76,
    emissive: 0xff971b,
    emissiveIntensity: 0.72,
    depthWrite: false,
  });
  return {
    honeyRock: new THREE.MeshStandardMaterial({ color: 0xd97a16, map: honeycombPattern, bumpMap: honeycombPattern, bumpScale: 0.09, roughness: 0.5, metalness: 0.02, flatShading: true, emissive: 0x4d1900, emissiveIntensity: 0.08 }),
    honeyRockShadow: new THREE.MeshStandardMaterial({ color: 0x5c2710, roughness: 0.88, metalness: 0.01, flatShading: true }),
    waxCream: Object.assign(waxCream, { map: honeycombPattern, bumpMap: honeycombPattern, bumpScale: 0.055 }),
    warmGold: new THREE.MeshStandardMaterial({ color: 0xf4a817, map: honeycombPattern, bumpMap: honeycombPattern, bumpScale: 0.075, roughness: 0.21, metalness: 0.76, emissive: 0x6b2800, emissiveIntensity: 0.14 }),
    paleGold: new THREE.MeshStandardMaterial({ color: 0xffc84b, bumpMap: honeycombPattern, bumpScale: 0.045, roughness: 0.15, metalness: 0.68, emissive: 0x7f3d00, emissiveIntensity: 0.12 }),
    darkBronze: new THREE.MeshStandardMaterial({ color: 0x321406, roughness: 0.42, metalness: 0.67 }),
    royalPurple: new THREE.MeshPhysicalMaterial({ color: 0x31004f, roughness: 0.18, metalness: 0.42, clearcoat: 0.95, clearcoatRoughness: 0.12 }),
    honeyGlass: new THREE.MeshPhysicalMaterial({
      color: 0xe97802,
      roughness: 0.055,
      metalness: 0,
      transmission: 0.2,
      thickness: 2.65,
      ior: 1.46,
      attenuationColor: new THREE.Color(0xff5f00),
      attenuationDistance: 1.45,
      clearcoat: 1,
      clearcoatRoughness: 0.022,
      transparent: true,
      opacity: 0.98,
      specularIntensity: 1,
      emissive: 0x8f2700,
      emissiveIntensity: 0.24,
      envMapIntensity: 1.55,
      side: THREE.DoubleSide,
    }),
    honeyLiquid: new THREE.MeshPhysicalMaterial({
      color: 0xffa00a,
      roughness: 0.035,
      metalness: 0,
      transmission: 0.26,
      thickness: 2.8,
      ior: 1.48,
      attenuationColor: new THREE.Color(0xff7200),
      attenuationDistance: 3.2,
      clearcoat: 1,
      clearcoatRoughness: 0.015,
      transparent: true,
      opacity: 0.95,
      specularIntensity: 1,
      specularColor: new THREE.Color(0xffffd6),
      emissive: 0xa62b00,
      emissiveIntensity: 0.18,
      envMapIntensity: 1.85,
      side: THREE.DoubleSide,
    }),
    honeyHighlight,
    warmWindow: new THREE.MeshStandardMaterial({ color: 0xffc65a, roughness: 0.17, metalness: 0.1, emissive: 0xff7a08, emissiveIntensity: 0.72 }),
    leaf,
    leafLight: leaf,
    petalPink: new THREE.MeshStandardMaterial({ color: 0xf38ab4, roughness: 0.62 }),
    petalCream: new THREE.MeshStandardMaterial({ color: 0xfff2c7, roughness: 0.68 }),
    petalPurple: new THREE.MeshStandardMaterial({ color: 0x8f4ccc, roughness: 0.56 }),
    cloud: new THREE.MeshStandardMaterial({ color: 0xfff4d8, roughness: 0.94, transparent: true, opacity: 0.84, depthWrite: false }),
    beeBlack: new THREE.MeshStandardMaterial({ color: 0x1b120c, roughness: 0.48 }),
    wing: new THREE.MeshPhysicalMaterial({ color: 0xd9f4ff, roughness: 0.12, transmission: 0.3, transparent: true, opacity: 0.62, depthWrite: false }),
  };
}

export function createIsland14HoneycombBackdrop() {
  const width = 256;
  const height = 512;
  const data = new Uint8Array(width * height * 4);
  const zenith = new THREE.Color(0x075a9f);
  const upperSky = new THREE.Color(0x1696d2);
  const horizon = new THREE.Color(0x9addf2);
  const cloudLight = new THREE.Color(0xfff8df);
  const cloudWarm = new THREE.Color(0xffcf7c);
  const scratch = new THREE.Color();
  const cloudLobes = [
    [0.08, 0.56, 0.12, 0.055, 0.92], [0.19, 0.53, 0.16, 0.07, 0.78],
    [0.33, 0.62, 0.12, 0.045, 0.58], [0.68, 0.55, 0.17, 0.072, 0.88],
    [0.82, 0.51, 0.13, 0.058, 0.9], [0.96, 0.6, 0.17, 0.07, 0.68],
    [0.46, 0.72, 0.2, 0.045, 0.36],
  ] as const;
  for (let y = 0; y < height; y += 1) {
    const v = y / (height - 1);
    const base = scratch.copy(zenith)
      .lerp(upperSky, THREE.MathUtils.smoothstep(v, 0.02, 0.36))
      .lerp(horizon, THREE.MathUtils.smoothstep(v, 0.38, 0.96));
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const u = x / (width - 1);
      let cloudMask = 0;
      for (const [cx, cy, rx, ry, strength] of cloudLobes) {
        const wrappedDx = Math.min(Math.abs(u - cx), 1 - Math.abs(u - cx));
        const dx = wrappedDx / rx;
        const dy = (v - cy) / ry;
        cloudMask += Math.exp(-(dx * dx + dy * dy) * 2.15) * strength;
      }
      const scallop = 0.84 + 0.16 * Math.sin(u * 91 + v * 27) * Math.sin(u * 43 - v * 61);
      cloudMask = THREE.MathUtils.clamp((cloudMask - 0.16) * 1.28 * scallop, 0, 0.94);
      const sunDistance = Math.hypot((u - 0.72) * 1.1, (v - 0.27) * 1.9);
      const sunGlow = THREE.MathUtils.clamp(1 - sunDistance / 0.28, 0, 1);
      const horizonHaze = THREE.MathUtils.smoothstep(v, 0.7, 1) * 0.3;
      const color = new THREE.Color(base.r, base.g, base.b)
        .lerp(cloudWarm, cloudMask * 0.22)
        .lerp(cloudLight, cloudMask * 0.82)
        .lerp(cloudWarm, sunGlow * 0.24)
        .lerp(horizon, horizonHaze);
      data[offset] = Math.round(color.r * 255);
      data[offset + 1] = Math.round(color.g * 255);
      data[offset + 2] = Math.round(color.b * 255);
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = true;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createHatchery(level: 1 | 2 | 3, materials: Island14HoneycombMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_14_QUEENS_NURSERY';
  const foundation = cylinder(1.22, 1.38, 0.28, materials.honeyRock, 'ISLAND_14_HATCHERY_FOUNDATION', 1, 12);
  foundation.position.y = 0.14;
  root.add(foundation);
  addTieredStairs(root, 'ISLAND_14_HATCHERY', 0.8, 0.64, 4, materials.paleGold, 1);
  const shell = sphere(0.78, materials.warmGold, 'ISLAND_14_HATCHERY_EGG_SHELL', 2, 20);
  shell.position.y = 1.0;
  shell.scale.set(0.82, 1.34, 0.8);
  root.add(shell);
  addHexCellBand(root, { prefix: 'ISLAND_14_HATCHERY', radius: 0.66, y: 1.0, count: 6, cellRadius: 0.18, material: materials.paleGold, insetMaterial: materials.honeyGlass, stage: 2 });
  addArchedDoor(root, 'ISLAND_14_HATCHERY', 0.75, 0.72, 0.75, materials, 2);
  if (level >= 2) {
    for (const side of [-1, 1]) {
      const brood = sphere(0.48, materials.warmGold, `ISLAND_14_HATCHERY_BROOD_WING_${side}`, 3, 16);
      brood.position.set(side * 0.76, 0.62, -0.04);
      brood.scale.set(1, 0.76, 0.82);
      root.add(brood);
      addHexCellBand(root, { prefix: `ISLAND_14_HATCHERY_WING_${side}`, radius: 0.42, y: 0.64, count: 4, cellRadius: 0.13, material: materials.paleGold, insetMaterial: materials.warmWindow, stage: 4 });
    }
    const crownRing = torus(0.5, 0.07, materials.paleGold, 'ISLAND_14_HATCHERY_CROWN_RING', 3, 8, 30);
    crownRing.rotation.x = Math.PI / 2;
    crownRing.position.y = 1.72;
    root.add(crownRing);
  }
  if (level >= 3) {
    const crown = cone(0.38, 0.62, materials.royalPurple, 'ISLAND_14_HATCHERY_ROYAL_CROWN', 5, 6);
    crown.position.y = 2.0;
    root.add(crown);
    addBeeCrest(root, 'ISLAND_14_HATCHERY', [0, 2.37, 0], 0.62, materials, 5);
    addFlower(root, 'ISLAND_14_HATCHERY_FLOWER_LEFT', -1.0, 0.18, 0.6, 0.62, materials.petalPink, materials);
    addFlower(root, 'ISLAND_14_HATCHERY_FLOWER_RIGHT', 1.0, 0.18, 0.55, 0.62, materials.petalCream, materials);
  }
  return root;
}

function createPollinatorYard(level: 1 | 2 | 3, materials: Island14HoneycombMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_14_POLLINATOR_YARD';
  const court = cylinder(1.45, 1.58, 0.24, materials.honeyRock, 'ISLAND_14_HABIT_HEX_COURT', 1, 12);
  court.position.y = 0.12;
  root.add(court);
  const pathRing = torus(1.02, 0.11, materials.paleGold, 'ISLAND_14_HABIT_PATH_RING', 1, 8, 30);
  pathRing.rotation.x = Math.PI / 2;
  pathRing.position.y = 0.28;
  root.add(pathRing);
  for (let index = 0; index < 6; index += 1) {
    const angle = index / 6 * Math.PI * 2;
    const planter = cylinder(0.35, 0.4, 0.26, materials.warmGold, `ISLAND_14_HABIT_CELL_PLANTER_${index + 1}`, 2, 6);
    planter.position.set(Math.cos(angle) * 0.82, 0.34, Math.sin(angle) * 0.82);
    root.add(planter);
    const petal = index % 3 === 0 ? materials.petalPurple : index % 2 ? materials.petalPink : materials.petalCream;
    addFlower(root, `ISLAND_14_HABIT_FLOWER_${index + 1}`, Math.cos(angle) * 0.82, 0.47, Math.sin(angle) * 0.82, 0.54, petal, materials);
  }
  const totem = cylinder(0.22, 0.3, 1.28, materials.darkBronze, 'ISLAND_14_HABIT_BEE_TOTEM', 2, 8);
  totem.position.y = 0.92;
  root.add(totem);
  addBeeCrest(root, 'ISLAND_14_HABIT', [0, 1.72, 0], 0.72, materials, 4);
  if (level >= 2) {
    for (let index = 0; index < 6; index += 1) {
      const angle = index / 6 * Math.PI * 2;
      const post = cylinder(0.055, 0.075, 1.15, materials.paleGold, `ISLAND_14_HABIT_PERGOLA_POST_${index + 1}`, 3, 8);
      post.position.set(Math.cos(angle) * 1.2, 0.86, Math.sin(angle) * 1.2);
      root.add(post);
    }
    const canopy = torus(1.2, 0.07, materials.warmGold, 'ISLAND_14_HABIT_PERGOLA_RING', 3, 8, 36);
    canopy.rotation.x = Math.PI / 2;
    canopy.position.y = 1.42;
    root.add(canopy);
  }
  if (level >= 3) {
    const halo = createHexFrame(0.72, 0.08, 0.07, materials.paleGold, 'ISLAND_14_HABIT_DISCIPLINE_HALO', 5);
    halo.position.set(0, 2.02, 0);
    root.add(halo);
    for (let index = 0; index < 6; index += 1) {
      const lantern = sphere(0.11, materials.honeyGlass, `ISLAND_14_HABIT_LANTERN_${index + 1}`, 5, 10);
      const angle = index / 6 * Math.PI * 2;
      lantern.position.set(Math.cos(angle) * 1.2, 1.42, Math.sin(angle) * 1.2);
      root.add(lantern);
    }
  }
  return root;
}

function createNectarTrials(level: 1 | 2 | 3, materials: Island14HoneycombMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_14_NECTAR_TRIALS';
  const plinth = cylinder(1.42, 1.55, 0.3, materials.honeyRock, 'ISLAND_14_NECTAR_TRIALS_PLINTH', 1, 12);
  plinth.position.y = 0.15;
  root.add(plinth);
  const arena = cylinder(1.05, 1.15, 0.24, materials.paleGold, 'ISLAND_14_NECTAR_TRIALS_ARENA', 2, 12);
  arena.position.y = 0.38;
  root.add(arena);
  for (let index = 0; index < 6; index += 1) {
    const angle = index / 6 * Math.PI * 2;
    const column = cylinder(0.09, 0.12, 1.12, materials.warmGold, `ISLAND_14_NECTAR_COLUMN_${index + 1}`, 2, 8);
    column.position.set(Math.cos(angle) * 1.06, 1.0, Math.sin(angle) * 1.06);
    root.add(column);
  }
  const challengeCore = sphere(0.3, materials.honeyGlass, 'ISLAND_14_NECTAR_CHALLENGE_CORE', 4, 14);
  challengeCore.position.y = 0.92;
  root.add(challengeCore);
  const hammerLeft = box(0.16, 0.72, 0.16, materials.darkBronze, 'ISLAND_14_NECTAR_HAMMER_LEFT_HANDLE', 4);
  hammerLeft.position.set(-0.3, 1.12, 0);
  hammerLeft.rotation.z = -0.55;
  const hammerLeftHead = box(0.48, 0.22, 0.22, materials.paleGold, 'ISLAND_14_NECTAR_HAMMER_LEFT_HEAD', 4);
  hammerLeftHead.position.set(-0.49, 1.44, 0);
  hammerLeftHead.rotation.z = -0.55;
  const hammerRight = hammerLeft.clone();
  hammerRight.name = 'ISLAND_14_NECTAR_HAMMER_RIGHT_HANDLE';
  hammerRight.position.x = 0.3;
  hammerRight.rotation.z = 0.55;
  const hammerRightHead = hammerLeftHead.clone();
  hammerRightHead.name = 'ISLAND_14_NECTAR_HAMMER_RIGHT_HEAD';
  hammerRightHead.position.x = 0.49;
  hammerRightHead.rotation.z = 0.55;
  root.add(hammerLeft, hammerLeftHead, hammerRight, hammerRightHead);
  if (level >= 2) {
    const canopy = cone(1.28, 0.58, materials.royalPurple, 'ISLAND_14_NECTAR_CANOPY', 3, 6);
    canopy.position.y = 1.72;
    root.add(canopy);
    const crownRing = torus(0.55, 0.06, materials.paleGold, 'ISLAND_14_NECTAR_CANOPY_RING', 3, 8, 28);
    crownRing.rotation.x = Math.PI / 2;
    crownRing.position.y = 1.94;
    root.add(crownRing);
  }
  if (level >= 3) {
    for (let index = 0; index < 3; index += 1) {
      const banner = box(0.28, 0.62, 0.04, materials.royalPurple, `ISLAND_14_NECTAR_BANNER_${index + 1}`, 5);
      const angle = index / 3 * Math.PI * 2 + Math.PI / 6;
      banner.position.set(Math.cos(angle) * 1.12, 1.45, Math.sin(angle) * 1.12);
      banner.rotation.y = -angle + Math.PI / 2;
      root.add(banner);
    }
    addBeeCrest(root, 'ISLAND_14_NECTAR_TRIALS', [0, 2.23, 0], 0.58, materials, 5);
  }
  return root;
}

function createHiveArchives(level: 1 | 2 | 3, materials: Island14HoneycombMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_14_HIVE_ARCHIVES';
  const plinth = cylinder(1.22, 1.38, 0.28, materials.honeyRock, 'ISLAND_14_ARCHIVES_FOUNDATION', 1, 12);
  plinth.position.y = 0.14;
  root.add(plinth);
  const hall = cylinder(0.86, 0.96, 1.25, materials.warmGold, 'ISLAND_14_ARCHIVES_READING_HALL', 2, 6);
  hall.position.y = 0.9;
  root.add(hall);
  addArchedDoor(root, 'ISLAND_14_ARCHIVES', 0.62, 0.87, 0.88, materials, 2);
  addHexCellBand(root, { prefix: 'ISLAND_14_ARCHIVES_LOWER', radius: 0.87, y: 0.98, count: 6, cellRadius: 0.17, material: materials.paleGold, insetMaterial: materials.warmWindow, stage: 3 });
  const bookA = box(0.52, 0.08, 0.32, materials.royalPurple, 'ISLAND_14_ARCHIVES_OPEN_BOOK_LEFT', 4);
  bookA.position.set(-0.24, 0.48, 0.98);
  bookA.rotation.z = -0.16;
  const bookB = bookA.clone();
  bookB.name = 'ISLAND_14_ARCHIVES_OPEN_BOOK_RIGHT';
  bookB.position.x = 0.24;
  bookB.rotation.z = 0.16;
  root.add(bookA, bookB);
  if (level >= 2) {
    const tower = cylinder(0.62, 0.76, 1.18, materials.warmGold, 'ISLAND_14_ARCHIVES_UPPER_TOWER', 3, 6);
    tower.position.y = 1.95;
    root.add(tower);
    addHexCellBand(root, { prefix: 'ISLAND_14_ARCHIVES_UPPER', radius: 0.64, y: 2.02, count: 6, cellRadius: 0.14, material: materials.paleGold, insetMaterial: materials.royalPurple, stage: 4 });
    addHiveDome(root, 'ISLAND_14_ARCHIVES', 0.7, 2.62, materials, 3);
  }
  if (level >= 3) {
    const crown = createHexFrame(0.5, 0.08, 0.055, materials.paleGold, 'ISLAND_14_ARCHIVES_WISDOM_CROWN', 5);
    crown.position.y = 3.18;
    root.add(crown);
    addBeeCrest(root, 'ISLAND_14_ARCHIVES', [0, 3.38, 0], 0.46, materials, 5);
    for (const side of [-1, 1]) {
      const readingPod = cylinder(0.34, 0.4, 0.6, materials.warmGold, `ISLAND_14_ARCHIVES_READING_POD_${side}`, 5, 6);
      readingPod.position.set(side * 0.9, 0.52, -0.08);
      root.add(readingPod);
    }
  }
  return root;
}

function createRoyalPalace(level: 1 | 2 | 3, materials: Island14HoneycombMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_14_ROYAL_HONEYCOMB_PALACE';
  const facadeWidth = 3.38;
  const footprintDepth = 2.58;

  const facetedMass = (
    name: string,
    width: number,
    depth: number,
    height: number,
    baseY: number,
    topScale: number,
    material: THREE.Material,
    stage: 1 | 2 | 3 | 4 | 5,
    x = 0,
    z = 0,
    segments: 6 | 8 | 12 = 8,
  ) => {
    const mesh = setMeshPresentation(
      new THREE.Mesh(new THREE.CylinderGeometry(topScale, 1, height, segments, 1, false), material),
      name,
      stage,
    );
    mesh.scale.set(width / 2, 1, depth / 2);
    mesh.position.set(x, baseY + height / 2, z);
    root.add(mesh);
    return mesh;
  };

  const addExtrudedPolygon = (
    prefix: string,
    points: THREE.Vector2[],
    depth: number,
    material: THREE.Material,
    stage: 1 | 2 | 3 | 4 | 5,
    position: readonly [number, number, number],
    rotationY = 0,
    holes: THREE.Vector2[][] = [],
  ) => {
    const shape = new THREE.Shape(points);
    holes.forEach((holePoints) => {
      const hole = new THREE.Path(holePoints);
      shape.holes.push(hole);
    });
    const mesh = setMeshPresentation(
      new THREE.Mesh(new THREE.ExtrudeGeometry(shape, {
        depth,
        steps: 1,
        bevelEnabled: false,
        curveSegments: 1,
      }), material),
      prefix,
      stage,
    );
    mesh.position.set(...position);
    mesh.rotation.y = rotationY;
    root.add(mesh);
    return mesh;
  };

  const regularPolygon = (radius: number, sides: number, rotation = Math.PI / 6) => (
    Array.from({ length: sides }, (_, index) => {
      const angle = rotation + index / sides * Math.PI * 2;
      return new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius);
    })
  );

  const pointedArch = (width: number, height: number, springY: number, baseY = 0) => [
    new THREE.Vector2(-width / 2, baseY),
    new THREE.Vector2(width / 2, baseY),
    new THREE.Vector2(width / 2, springY),
    new THREE.Vector2(width * 0.34, springY + (height - springY) * 0.24),
    new THREE.Vector2(0, height),
    new THREE.Vector2(-width * 0.34, springY + (height - springY) * 0.24),
    new THREE.Vector2(-width / 2, springY),
  ];

  const addHexTube = (
    prefix: string,
    position: readonly [number, number, number],
    radius: number,
    depth: number,
    rotationY: number,
    stage: 1 | 2 | 3 | 4 | 5,
    insetMaterial: THREE.Material = materials.darkBronze,
    innerRatio = 0.65,
  ) => {
    const outer = regularPolygon(radius, 6, Math.PI / 6);
    const inner = regularPolygon(radius * innerRatio, 6, Math.PI / 6).reverse();
    addExtrudedPolygon(`${prefix}_STRUCTURAL_TUBE`, outer, depth, materials.paleGold, stage, position, rotationY, [inner]);
    const backingPosition: [number, number, number] = [position[0], position[1], position[2]];
    if (Math.abs(rotationY) < 0.01) backingPosition[2] -= 0.005;
    else backingPosition[0] -= Math.sign(rotationY) * 0.005;
    addExtrudedPolygon(
      `${prefix}_OCCUPIED_RECESS`,
      regularPolygon(radius * Math.max(0.32, innerRatio - 0.03), 6, Math.PI / 6),
      Math.max(0.035, depth * 0.42),
      insetMaterial,
      stage,
      backingPosition,
      rotationY,
    );
  };

  const addBeamBetween = (
    prefix: string,
    start: THREE.Vector3,
    end: THREE.Vector3,
    radius: number,
    material: THREE.Material,
    stage: 1 | 2 | 3 | 4 | 5,
    segments = 6,
  ) => {
    const direction = end.clone().sub(start);
    const beam = cylinder(radius, radius, direction.length(), material, prefix, stage, segments);
    beam.position.copy(start).add(end).multiplyScalar(0.5);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    root.add(beam);
    return beam;
  };

  const addCageRoof = (
    prefix: string,
    x: number,
    baseY: number,
    z: number,
    radius: number,
    rise: number,
    stage: 1 | 2 | 3 | 4 | 5,
    sides = 8,
  ) => {
    const core = cone(radius, rise, materials.honeyGlass, `${prefix}_FACETED_AMBER_CORE`, stage, sides);
    core.position.set(x, baseY + rise / 2, z);
    core.scale.z = 0.94;
    root.add(core);
    const collar = torus(radius * 0.94, Math.max(0.026, radius * 0.065), materials.paleGold, `${prefix}_STRUCTURAL_EAVE`, stage, 6, sides * 3);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(x, baseY, z);
    root.add(collar);
    for (let index = 0; index < sides; index += 1) {
      const angle = index / sides * Math.PI * 2;
      addBeamBetween(
        `${prefix}_CAGE_RIB_${index + 1}`,
        new THREE.Vector3(x + Math.cos(angle) * radius * 0.9, baseY + 0.015, z + Math.sin(angle) * radius * 0.84),
        new THREE.Vector3(x, baseY + rise * 0.94, z),
        Math.max(0.018, radius * 0.045),
        materials.paleGold,
        stage,
      );
    }
  };

  const addHoneyDrip = (
    prefix: string,
    x: number,
    y: number,
    z: number,
    length: number,
    face: 'front' | 'rear' | 'left' | 'right',
  ) => {
    const fillet = sphere(0.11, materials.honeyLiquid, `${prefix}_UPPER_FILLET`, 5, 12);
    fillet.scale.set(face === 'front' || face === 'rear' ? 1.45 : 0.58, 0.36, face === 'front' || face === 'rear' ? 0.58 : 1.45);
    fillet.position.set(x, y, z);
    const stream = cylinder(0.052, 0.025, length, materials.honeyLiquid, `${prefix}_TAPERING_STREAM`, 5, 8);
    stream.position.set(x, y - length / 2 - 0.015, z);
    const drop = sphere(0.07, materials.honeyLiquid, `${prefix}_TERMINAL_DROP`, 5, 10);
    drop.scale.set(0.82, 1.35, 0.82);
    drop.position.set(x, y - length - 0.075, z);
    root.add(fillet, stream, drop);
  };

  const court = cylinder(2.12, 2.34, 0.34, materials.honeyRock, 'ISLAND_14_PALACE_ROYAL_COURT', 1, 12);
  court.position.y = 0.17;
  const courtCap = cylinder(2.02, 2.12, 0.14, materials.waxCream, 'ISLAND_14_PALACE_WAX_COURT_CAP', 1, 12);
  courtCap.position.y = 0.39;
  root.add(court, courtCap);
  addTieredStairs(root, 'ISLAND_14_PALACE', 1.72, 1.38, 8, materials.paleGold, 1);

  // A front-led, stepped cathedral mass replaces the retired cross-plan fort.
  // Every tier is closed, extruded and buried into its neighbours.
  const plinth = box(3.30, 0.24, 2.46, materials.honeyRock, 'ISLAND_14_PALACE_INTEGRATED_PLINTH', 2);
  plinth.position.y = 0.58;
  root.add(plinth);
  facetedMass('ISLAND_14_PALACE_LOWER_CATHEDRAL_BODY', 2.82, 2.36, 1.12, 0.60, 0.91, materials.waxCream, 2, 0, -0.04, 8);
  facetedMass('ISLAND_14_PALACE_LEFT_STEPPED_SHOULDER', 0.92, 1.72, 0.92, 0.63, 0.82, materials.warmGold, 2, -1.23, 0.03, 8);
  facetedMass('ISLAND_14_PALACE_RIGHT_STEPPED_SHOULDER', 0.92, 1.72, 0.92, 0.63, 0.82, materials.warmGold, 2, 1.23, 0.03, 8);
  const frontEave = box(3.00, 0.09, 0.12, materials.paleGold, 'ISLAND_14_PALACE_CONTINUOUS_FRONT_EAVE', 2);
  frontEave.position.set(0, 1.67, 1.00);
  const rearEave = frontEave.clone();
  rearEave.name = 'ISLAND_14_PALACE_CONTINUOUS_REAR_EAVE';
  rearEave.position.z = -1.08;
  const leftEave = box(0.12, 0.09, 2.14, materials.paleGold, 'ISLAND_14_PALACE_CONTINUOUS_LEFT_EAVE', 2);
  leftEave.position.set(-1.45, 1.67, -0.04);
  const rightEave = leftEave.clone();
  rightEave.name = 'ISLAND_14_PALACE_CONTINUOUS_RIGHT_EAVE';
  rightEave.position.x = 1.45;
  root.add(frontEave, rearEave, leftEave, rightEave);

  // Deep structural honey arch: a 0.32-deep jamb/gable tunnel, dark inner
  // reveal, and broad double doors seated behind the front return.
  const outerArch = pointedArch(1.10, 1.44, 0.78);
  const innerArch = pointedArch(0.80, 1.18, 0.70, 0.10).reverse();
  addExtrudedPolygon(
    'ISLAND_14_PALACE_ROYAL_HONEY_ARCH_REVEAL_TUNNEL',
    outerArch,
    0.32,
    materials.paleGold,
    2,
    [0, 0.58, 1.10],
    0,
    [innerArch],
  );
  addExtrudedPolygon(
    'ISLAND_14_PALACE_ROYAL_HONEY_ARCH_DEEP_RECESS',
    pointedArch(0.78, 1.16, 0.68, 0.11),
    0.105,
    materials.darkBronze,
    2,
    [0, 0.58, 1.125],
  );
  addExtrudedPolygon(
    'ISLAND_14_PALACE_ROYAL_PURPLE_DOUBLE_DOOR',
    pointedArch(0.48, 0.75, 0.51),
    0.09,
    materials.royalPurple,
    2,
    [0, 0.64, 1.235],
  );
  const doorSeam = box(0.025, 0.66, 0.055, materials.paleGold, 'ISLAND_14_PALACE_ROYAL_DOOR_CENTER_SEAM', 2);
  doorSeam.position.set(0, 0.99, 1.34);
  const handleLeft = sphere(0.045, materials.honeyHighlight, 'ISLAND_14_PALACE_ROYAL_DOOR_HANDLE_LEFT', 2, 8);
  handleLeft.position.set(-0.085, 0.94, 1.375);
  const handleRight = handleLeft.clone();
  handleRight.name = 'ISLAND_14_PALACE_ROYAL_DOOR_HANDLE_RIGHT';
  handleRight.position.x = 0.085;
  root.add(doorSeam, handleLeft, handleRight);
  addBeeCrest(root, 'ISLAND_14_PALACE_ROYAL_DOOR', [0, 1.20, 1.39], 0.27, materials, 2);

  // Four closed, occupied honey-cell pods define the lower facade. The outer
  // pair anchors the footprint while the raised inner pair frames the portal.
  const frontPods = [
    [-1.30, 0.61, 0.83, 'OUTER_LEFT'],
    [-0.76, 1.15, 0.81, 'INNER_LEFT'],
    [0.76, 1.15, 0.81, 'INNER_RIGHT'],
    [1.30, 0.61, 0.83, 'OUTER_RIGHT'],
  ] as const;
  frontPods.forEach(([x, baseY, z, label], index) => {
    facetedMass(`ISLAND_14_PALACE_FRONT_OCCUPIED_POD_${label}_BODY`, 0.74, 0.72, 0.58, baseY, 0.86, index % 2 ? materials.waxCream : materials.warmGold, 2, x, z, 6);
    addHexTube(`ISLAND_14_PALACE_FRONT_OCCUPIED_POD_${label}`, [x, baseY + 0.27, 1.18], 0.19, 0.11, 0, 2, materials.darkBronze);
    addCageRoof(`ISLAND_14_PALACE_FRONT_OCCUPIED_POD_${label}_ROOF`, x, baseY + 0.58, z, 0.37, 0.24, 2, 6);
  });

  // Continuous corner ribs and real buttresses keep the exoskeleton attached
  // through every oblique, instead of floating on a front facade.
  const buttressSites = [
    [-1.54, 0.92], [1.54, 0.92], [-1.54, -0.94], [1.54, -0.94],
    [-0.80, 1.10], [0.80, 1.10], [-0.78, -1.16], [0.78, -1.16],
  ] as const;
  buttressSites.forEach(([x, z], index) => {
    facetedMass(`ISLAND_14_PALACE_CONTINUOUS_WRAP_BUTTRESS_${index + 1}`, 0.22, 0.30, 0.82, 0.55, 0.48, materials.warmGold, 2, x, z, 6);
  });

  if (level >= 2) {
    facetedMass('ISLAND_14_PALACE_MIDDLE_CATHEDRAL_TIER', 2.18, 1.86, 0.82, 1.54, 0.86, materials.warmGold, 3, 0, -0.10, 8);
    facetedMass('ISLAND_14_PALACE_UPPER_CATHEDRAL_TIER', 1.54, 1.42, 0.66, 2.28, 0.82, materials.waxCream, 3, 0, -0.10, 8);
    addExtrudedPolygon(
      'ISLAND_14_PALACE_INTEGRATED_FRONT_GABLE',
      pointedArch(1.20, 1.10, 0.52),
      0.40,
      materials.waxCream,
      3,
      [0, 1.55, 1.02],
    );
    const gableFrontZ = 1.435;
    const gableRibPoints = [
      [new THREE.Vector3(-0.59, 1.58, gableFrontZ), new THREE.Vector3(-0.59, 2.07, gableFrontZ)],
      [new THREE.Vector3(-0.59, 2.07, gableFrontZ), new THREE.Vector3(-0.40, 2.22, gableFrontZ)],
      [new THREE.Vector3(-0.40, 2.22, gableFrontZ), new THREE.Vector3(0, 2.64, gableFrontZ)],
      [new THREE.Vector3(0.59, 1.58, gableFrontZ), new THREE.Vector3(0.59, 2.07, gableFrontZ)],
      [new THREE.Vector3(0.59, 2.07, gableFrontZ), new THREE.Vector3(0.40, 2.22, gableFrontZ)],
      [new THREE.Vector3(0.40, 2.22, gableFrontZ), new THREE.Vector3(0, 2.64, gableFrontZ)],
    ] as const;
    gableRibPoints.forEach(([start, end], index) => {
      addBeamBetween(`ISLAND_14_PALACE_ATTACHED_GABLE_RIB_${index + 1}`, start, end, 0.027, materials.paleGold, 3, 6);
    });
    [-1.42, 1.42].forEach((x, index) => {
      addBeamBetween(
        `ISLAND_14_PALACE_FRONT_CORNER_EXOSKELETON_RIB_${index + 1}`,
        new THREE.Vector3(x, 0.68, 1.04),
        new THREE.Vector3(x * 0.92, 1.68, 1.01),
        0.035,
        materials.paleGold,
        3,
      );
    });

    // Seven recessed hex tubes form a rose cluster embedded in the gable.
    // There is deliberately no circular frame, plate or backplane.
    const roseCenters: Array<[number, number]> = [[0, 0]];
    for (let index = 0; index < 6; index += 1) {
      const angle = index / 6 * Math.PI * 2;
      roseCenters.push([Math.cos(angle) * 0.25, Math.sin(angle) * 0.25]);
    }
    roseCenters.forEach(([x, y], index) => {
      addHexTube(`ISLAND_14_PALACE_EMBEDDED_ROSE_CELL_${index + 1}`, [x, 2.12 + y, 1.40], 0.15, 0.085, 0, 3, index === 0 ? materials.honeyGlass : materials.darkBronze, 0.50);
    });

    // Side cells turn the honeycomb civic language around both front corners.
    [-1, 1].forEach((side) => {
      [-0.58, 0.02, 0.62].forEach((z, index) => {
        addHexTube(
          `ISLAND_14_PALACE_${side > 0 ? 'RIGHT' : 'LEFT'}_SIDE_CELL_${index + 1}`,
          [side * 1.47, 1.18 + (index % 2) * 0.16, z],
          0.16,
          0.10,
          side > 0 ? Math.PI / 2 : -Math.PI / 2,
          3,
        );
      });
    });

    // Quiet rear apse and service cells author the back without competing with
    // the royal front.
    facetedMass('ISLAND_14_PALACE_QUIET_REAR_APSE_BODY', 1.34, 0.66, 0.78, 0.60, 0.76, materials.waxCream, 3, 0, -1.15, 8);
    addCageRoof('ISLAND_14_PALACE_QUIET_REAR_APSE_ROOF', 0, 1.38, -1.15, 0.54, 0.24, 3, 8);
    [-0.34, 0.34].forEach((x, index) => {
      addHexTube(`ISLAND_14_PALACE_REAR_APSE_CELL_${index + 1}`, [x, 1.00, -1.38], 0.15, 0.09, Math.PI, 3);
    });

    const satelliteSites = [
      [-1.02, 0.38, 1.60, 0.72, 'FRONT_LEFT'],
      [1.02, 0.38, 1.60, 0.72, 'FRONT_RIGHT'],
      [-0.98, -0.63, 1.50, 0.62, 'REAR_LEFT'],
      [0.98, -0.63, 1.50, 0.62, 'REAR_RIGHT'],
    ] as const;
    satelliteSites.forEach(([x, z, baseY, height, label], index) => {
      facetedMass(`ISLAND_14_PALACE_POLYGONAL_LANTERN_${label}_BODY`, 0.58, 0.58, height, baseY, 0.80, index % 2 ? materials.waxCream : materials.warmGold, 4, x, z, 8);
      [0, Math.PI / 2].forEach((rotationY, faceIndex) => {
        const offset = rotationY === 0 ? [x, baseY + height * 0.54, z + 0.30] : [x + 0.30, baseY + height * 0.54, z];
        addHexTube(`ISLAND_14_PALACE_POLYGONAL_LANTERN_${label}_CELL_${faceIndex + 1}`, offset as [number, number, number], 0.125, 0.075, rotationY, 4, materials.warmWindow);
      });
      addCageRoof(`ISLAND_14_PALACE_POLYGONAL_LANTERN_${label}_ROOF`, x, baseY + height, z, 0.32, 0.25, 4, 8);
    });

    facetedMass('ISLAND_14_PALACE_HERO_POLYGONAL_DRUM', 1.10, 1.06, 0.52, 2.82, 0.90, materials.warmGold, 4, 0, -0.10, 8);
    [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((rotationY, index) => {
      const positions: Array<[number, number, number]> = [[0, 3.08, 0.45], [0.55, 3.08, -0.10], [0, 3.08, -0.65], [-0.55, 3.08, -0.10]];
      addHexTube(`ISLAND_14_PALACE_HERO_DRUM_CELL_${index + 1}`, positions[index], 0.145, 0.08, rotationY, 4, materials.honeyGlass);
    });
    addCageRoof('ISLAND_14_PALACE_HERO_HONEYCOMB_CAGE_ROOF', 0, 3.34, -0.10, 0.52, 0.35, 4, 8);
    const heroFinial = cone(0.08, 0.18, materials.paleGold, 'ISLAND_14_PALACE_HERO_FINIAL', 4, 8);
    heroFinial.position.set(0, 3.84, -0.10);
    root.add(heroFinial);
  }

  if (level >= 3) {
    // Each honey run begins with an attached fillet, narrows into a stream and
    // finishes in a weighty teardrop. This avoids the detached lamp-post read.
    [
      [-1.26, 1.65, 1.12, 0.29, 'front'], [0.98, 1.65, 1.12, 0.23, 'front'],
      [-1.59, 1.63, 0.28, 0.22, 'left'], [1.59, 1.63, -0.40, 0.30, 'right'],
      [-0.48, 1.63, -1.16, 0.19, 'rear'], [0.62, 1.63, -1.16, 0.25, 'rear'],
    ].forEach(([x, y, z, length, face], index) => addHoneyDrip(
      `ISLAND_14_PALACE_VISCOUS_HONEY_RUN_${index + 1}`,
      x as number,
      y as number,
      z as number,
      length as number,
      face as 'front' | 'rear' | 'left' | 'right',
    ));
    const crownHalo = torus(0.22, 0.04, materials.paleGold, 'ISLAND_14_PALACE_CROWN_HALO', 5, 7, 24);
    crownHalo.rotation.x = Math.PI / 2;
    crownHalo.position.set(0, 3.76, -0.10);
    root.add(crownHalo);
  }

  root.userData.integratedHoneycombCathedral = {
    constructionFamily: 'threejs-integrated-extruded-honeycomb-exoskeleton-cathedral',
    facadeWidth,
    footprintDepth,
    footprintDepthRatio: footprintDepth / facadeWidth,
    totalHeight: level >= 2 ? 3.93 : 2.18,
    totalHeightRatio: (level >= 2 ? 3.93 : 2.18) / facadeWidth,
    outerDoorWidth: 1.10,
    royalRevealDepth: 0.32,
    purpleDoorWidth: 0.48,
    purpleDoorWidthHeightRatio: 0.64,
    embeddedRoseWidth: 0.82,
    doorRoseRatio: 1.10 / 0.82,
    frontDominantBayCount: 4,
    quadrantSatelliteCount: 4,
    runtimeProjectionCount: 0,
    smoothDomeCount: 0,
    facadeCardCount: 0,
    honeyDripConstruction: 'upper-fillet+tapering-stream+terminal-drop',
    authoredElevations: ['front', 'left', 'right', 'rear'],
  };
  root.userData.sculptRuntime = {
    parts: root.children.map((part, index) => ({ id: `palace-part-${index + 1}`, object: part, role: 'landmark' })),
  };
  return root;
}

/**
 * Sixth Palace family: rounded overlapping hive volumes and a connected jewel
 * tracery system. This is intentionally independent from the retired faceted
 * keep above; the board dispatches only this factory.
 */
function createRoundedJewelHivePalace(level: 1 | 2 | 3, materials: Island14HoneycombMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_14_ROUNDED_JEWEL_HIVE_CATHEDRAL';
  const facadeWidth = 3.38;
  const footprintDepth = 2.58;

  const ellipsoid = (
    name: string,
    radii: readonly [number, number, number],
    position: readonly [number, number, number],
    material: THREE.Material,
    stage: 1 | 2 | 3 | 4 | 5,
    segments = 18,
  ) => {
    const mesh = setMeshPresentation(
      new THREE.Mesh(new THREE.SphereGeometry(1, segments, Math.max(10, Math.round(segments * 0.7))), material),
      name,
      stage,
    );
    mesh.scale.set(...radii);
    mesh.position.set(...position);
    root.add(mesh);
    return mesh;
  };

  const roundedLantern = (
    name: string,
    radius: number,
    length: number,
    scale: readonly [number, number, number],
    position: readonly [number, number, number],
    material: THREE.Material,
    stage: 1 | 2 | 3 | 4 | 5,
  ) => {
    const mesh = setMeshPresentation(
      new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 7, 16), material),
      name,
      stage,
    );
    mesh.scale.set(...scale);
    mesh.position.set(...position);
    root.add(mesh);
    return mesh;
  };

  const regularPolygon = (radius: number, sides: number, rotation = Math.PI / 6) => (
    Array.from({ length: sides }, (_, index) => {
      const angle = rotation + index / sides * Math.PI * 2;
      return new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius);
    })
  );

  const honeyArch = (width: number, height: number, springY: number, baseY = 0) => [
    new THREE.Vector2(-width / 2, baseY),
    new THREE.Vector2(width / 2, baseY),
    new THREE.Vector2(width / 2, springY),
    new THREE.Vector2(width * 0.42, springY + (height - springY) * 0.34),
    new THREE.Vector2(width * 0.20, springY + (height - springY) * 0.76),
    new THREE.Vector2(0, height),
    new THREE.Vector2(-width * 0.20, springY + (height - springY) * 0.76),
    new THREE.Vector2(-width * 0.42, springY + (height - springY) * 0.34),
    new THREE.Vector2(-width / 2, springY),
  ];

  const addExtrudedPolygon = (
    name: string,
    points: THREE.Vector2[],
    depth: number,
    material: THREE.Material,
    stage: 1 | 2 | 3 | 4 | 5,
    position: readonly [number, number, number],
    rotationY = 0,
    holes: THREE.Vector2[][] = [],
  ) => {
    const shape = new THREE.Shape(points);
    holes.forEach((holePoints) => shape.holes.push(new THREE.Path(holePoints)));
    const mesh = setMeshPresentation(
      new THREE.Mesh(new THREE.ExtrudeGeometry(shape, {
        depth,
        steps: 1,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: Math.min(0.025, depth * 0.18),
        bevelThickness: Math.min(0.02, depth * 0.16),
        curveSegments: 2,
      }), material),
      name,
      stage,
    );
    mesh.position.set(...position);
    mesh.rotation.y = rotationY;
    root.add(mesh);
    return mesh;
  };

  const addBeamBetween = (
    name: string,
    start: THREE.Vector3,
    end: THREE.Vector3,
    radius: number,
    material: THREE.Material,
    stage: 1 | 2 | 3 | 4 | 5,
  ) => {
    const direction = end.clone().sub(start);
    const beam = cylinder(radius, radius, direction.length(), material, name, stage, 8);
    beam.position.copy(start).add(end).multiplyScalar(0.5);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    root.add(beam);
    return beam;
  };

  const addJewelCell = (
    prefix: string,
    position: readonly [number, number, number],
    radius: number,
    rotationY: number,
    stage: 1 | 2 | 3 | 4 | 5,
    depth = 0.12,
    occupied = true,
  ) => {
    const outer = regularPolygon(radius, 6);
    const inner = regularPolygon(radius * 0.60, 6).reverse();
    addExtrudedPolygon(`${prefix}_THICK_GOLD_TRACERY`, outer, depth, materials.paleGold, stage, position, rotationY, [inner]);
    const recessPosition: [number, number, number] = [...position];
    if (Math.abs(rotationY) < 0.01 || Math.abs(Math.abs(rotationY) - Math.PI) < 0.01) recessPosition[2] -= Math.cos(rotationY) * 0.004;
    else recessPosition[0] -= Math.sign(rotationY) * 0.004;
    addExtrudedPolygon(
      `${prefix}_OCCUPIED_BRONZE_RECESS`,
      regularPolygon(radius * 0.56, 6),
      depth * 0.48,
      occupied ? materials.darkBronze : materials.warmGold,
      stage,
      recessPosition,
      rotationY,
    );
    const jewelPosition: [number, number, number] = [...position];
    if (Math.abs(rotationY) < 0.01 || Math.abs(Math.abs(rotationY) - Math.PI) < 0.01) jewelPosition[2] += Math.cos(rotationY) * depth * 0.62;
    else jewelPosition[0] += Math.sign(rotationY) * depth * 0.62;
    addExtrudedPolygon(
      `${prefix}_AMBER_JEWEL_GLAZING`,
      regularPolygon(radius * 0.35, 6),
      0.035,
      materials.honeyGlass,
      stage,
      jewelPosition,
      rotationY,
    );
  };

  const createScallopedCupolaGeometry = (radius: number, height: number, segments = 12) => {
    const rings = [
      [0, 1.00],
      [height * 0.12, 1.08],
      [height * 0.38, 0.90],
      [height * 0.67, 0.58],
      [height * 0.86, 0.27],
    ] as const;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    rings.forEach(([y, radiusFactor], ringIndex) => {
      for (let index = 0; index < segments; index += 1) {
        const angle = index / segments * Math.PI * 2;
        const scallop = ringIndex < 2 && index % 2 === 1 ? 0.92 : 1;
        positions.push(Math.cos(angle) * radius * radiusFactor * scallop, y, Math.sin(angle) * radius * radiusFactor * scallop * 0.94);
        uvs.push(index / segments, y / height);
      }
    });
    const apexIndex = positions.length / 3;
    positions.push(0, height, 0);
    uvs.push(0.5, 1);
    const bottomCenterIndex = positions.length / 3;
    positions.push(0, 0, 0);
    uvs.push(0.5, 0);
    for (let ringIndex = 0; ringIndex < rings.length - 1; ringIndex += 1) {
      for (let index = 0; index < segments; index += 1) {
        const next = (index + 1) % segments;
        const a = ringIndex * segments + index;
        const b = ringIndex * segments + next;
        const c = (ringIndex + 1) * segments + next;
        const d = (ringIndex + 1) * segments + index;
        indices.push(a, b, d, b, c, d);
      }
    }
    const finalRingStart = (rings.length - 1) * segments;
    for (let index = 0; index < segments; index += 1) {
      const next = (index + 1) % segments;
      indices.push(finalRingStart + index, finalRingStart + next, apexIndex);
      indices.push(bottomCenterIndex, next, index);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  };

  const addScallopedCupola = (
    prefix: string,
    position: readonly [number, number, number],
    radius: number,
    height: number,
    stage: 1 | 2 | 3 | 4 | 5,
    ribCount = 6,
  ) => {
    const core = setMeshPresentation(
      new THREE.Mesh(createScallopedCupolaGeometry(radius, height, 12), materials.honeyGlass),
      `${prefix}_SCALLOPED_AMBER_CORE`,
      stage,
    );
    core.position.set(...position);
    root.add(core);
    const eave = torus(radius * 1.04, Math.max(0.026, radius * 0.065), materials.paleGold, `${prefix}_SCALLOPED_GOLD_EAVE`, stage, 8, 36);
    eave.rotation.x = Math.PI / 2;
    eave.scale.z = 0.94;
    eave.position.set(...position);
    root.add(eave);
    const ringFractions = [0, 0.12, 0.38, 0.67, 0.86, 1];
    const ringRadius = [1, 1.08, 0.90, 0.58, 0.27, 0];
    for (let ribIndex = 0; ribIndex < ribCount; ribIndex += 1) {
      const angle = ribIndex / ribCount * Math.PI * 2;
      for (let segmentIndex = 0; segmentIndex < ringFractions.length - 1; segmentIndex += 1) {
        const start = new THREE.Vector3(
          position[0] + Math.cos(angle) * radius * ringRadius[segmentIndex],
          position[1] + height * ringFractions[segmentIndex],
          position[2] + Math.sin(angle) * radius * ringRadius[segmentIndex] * 0.94,
        );
        const end = new THREE.Vector3(
          position[0] + Math.cos(angle) * radius * ringRadius[segmentIndex + 1],
          position[1] + height * ringFractions[segmentIndex + 1],
          position[2] + Math.sin(angle) * radius * ringRadius[segmentIndex + 1] * 0.94,
        );
        addBeamBetween(`${prefix}_EXTERNAL_CAGE_RIB_${ribIndex + 1}_${segmentIndex + 1}`, start, end, Math.max(0.016, radius * 0.038), materials.paleGold, stage);
      }
    }
  };

  const addHoneyCurtain = (
    prefix: string,
    position: readonly [number, number, number],
    width: number,
    length: number,
    face: 'front' | 'rear' | 'left' | 'right',
  ) => {
    const frontFacing = face === 'front' || face === 'rear';
    const outward = face === 'front' ? 1 : face === 'rear' ? -1 : face === 'right' ? 1 : -1;
    const rotationY = face === 'front' ? 0 : face === 'rear' ? Math.PI : face === 'right' ? Math.PI / 2 : -Math.PI / 2;
    const curtainPosition: [number, number, number] = [...position];
    if (frontFacing) curtainPosition[2] += outward * 0.035;
    else curtainPosition[0] += outward * 0.035;

    // The upper lip is buried into the adjacent eave, so this reads as honey
    // flowing over architecture rather than a suspended lamp or ornament.
    const shelf = setMeshPresentation(
      new THREE.Mesh(new THREE.BoxGeometry(width * 1.08, 0.11, 0.18), materials.honeyLiquid),
      `${prefix}_WELDED_EAVE_FILLET`,
      5,
    );
    shelf.rotation.y = rotationY;
    shelf.position.set(...curtainPosition);
    root.add(shelf);

    const curtain = addExtrudedPolygon(
      `${prefix}_BROAD_SCALLOPED_VISCOUS_CURTAIN`,
      [
        new THREE.Vector2(-width * 0.52, 0.03),
        new THREE.Vector2(width * 0.52, 0.03),
        new THREE.Vector2(width * 0.52, -length * 0.25),
        new THREE.Vector2(width * 0.40, -length * 0.39),
        new THREE.Vector2(width * 0.27, -length * 0.56),
        new THREE.Vector2(width * 0.12, -length * 0.44),
        new THREE.Vector2(-width * 0.02, -length * 0.72),
        new THREE.Vector2(-width * 0.16, -length * 0.52),
        new THREE.Vector2(-width * 0.30, -length * 0.86),
        new THREE.Vector2(-width * 0.43, -length * 0.49),
        new THREE.Vector2(-width * 0.52, -length * 0.28),
      ],
      0.13,
      materials.honeyLiquid,
      5,
      [curtainPosition[0], curtainPosition[1] - 0.01, curtainPosition[2]],
      rotationY,
    );

    // Two closed tongues overlap the curtain's low scallops. Their upper ends
    // are deliberately embedded in the broad sheet and the terminal drops are
    // embedded in the tongues, producing one continuous viscous silhouette.
    const tongueOffsets = [-0.29, 0.04];
    tongueOffsets.forEach((offset, index) => {
      const tongueLength = length * (index === 0 ? 0.48 : 0.35);
      const tongueWidth = width * (index === 0 ? 0.15 : 0.13);
      const tongue = addExtrudedPolygon(
        `${prefix}_WELDED_VISCOUS_TONGUE_${index + 1}`,
        [
          new THREE.Vector2(-tongueWidth, 0.08),
          new THREE.Vector2(tongueWidth, 0.08),
          new THREE.Vector2(tongueWidth * 0.82, -tongueLength * 0.72),
          new THREE.Vector2(0, -tongueLength),
          new THREE.Vector2(-tongueWidth * 0.82, -tongueLength * 0.72),
        ],
        0.135,
        materials.honeyLiquid,
        5,
        [curtainPosition[0], curtainPosition[1] - length * (index === 0 ? 0.48 : 0.43), curtainPosition[2]],
        rotationY,
      );
      if (frontFacing) tongue.position.x += offset * width;
      else tongue.position.z -= Math.sin(rotationY) * offset * width;
      const localDropX = offset * width;
      const dropPosition: [number, number, number] = [
        curtainPosition[0] + (frontFacing ? localDropX : 0),
        curtainPosition[1] - length * (index === 0 ? 1.00 : 0.82),
        curtainPosition[2] + (frontFacing ? 0 : -Math.sin(rotationY) * localDropX),
      ];
      ellipsoid(
        `${prefix}_WELDED_WEIGHTED_DROP_${index + 1}`,
        [0.052, 0.082, 0.052],
        dropPosition,
        materials.honeyLiquid,
        5,
        12,
      );
    });

    const highlightPosition: [number, number, number] = [curtainPosition[0], curtainPosition[1] - length * 0.15, curtainPosition[2]];
    if (frontFacing) highlightPosition[2] += outward * 0.145;
    else highlightPosition[0] += outward * 0.145;
    ellipsoid(
      `${prefix}_CURTAIN_CONVEX_SPECULAR_HIGHLIGHT`,
      frontFacing ? [width * 0.28, 0.026, 0.025] : [0.025, 0.026, width * 0.28],
      highlightPosition,
      materials.honeyHighlight,
      5,
      12,
    );
    curtain.userData.attachedHoneyAssembly = 'welded-eave+scalloped-curtain+overlapping-tongues+embedded-drops';
    return shelf;
  };

  // A — rounded inhabited macro hive.
  const court = cylinder(2.12, 2.34, 0.34, materials.honeyRock, 'ISLAND_14_JEWEL_HIVE_ROYAL_COURT', 1, 16);
  court.position.y = 0.17;
  const courtCap = cylinder(2.02, 2.12, 0.14, materials.waxCream, 'ISLAND_14_JEWEL_HIVE_WAX_COURT_CAP', 1, 16);
  courtCap.position.y = 0.39;
  root.add(court, courtCap);
  addTieredStairs(root, 'ISLAND_14_JEWEL_HIVE', 1.72, 1.38, 8, materials.paleGold, 1);
  ellipsoid('ISLAND_14_JEWEL_HIVE_ROUNDED_NAVE', [1.32, 1.18, 1.08], [0, 1.35, -0.08], materials.waxCream, 2, 22);
  ellipsoid('ISLAND_14_JEWEL_HIVE_LEFT_CATHEDRAL_SHOULDER', [0.92, 0.82, 0.88], [-0.90, 1.15, -0.02], materials.warmGold, 2, 20);
  ellipsoid('ISLAND_14_JEWEL_HIVE_RIGHT_CATHEDRAL_SHOULDER', [0.92, 0.82, 0.88], [0.90, 1.15, -0.02], materials.warmGold, 2, 20);
  roundedLantern('ISLAND_14_JEWEL_HIVE_ELEGANT_CENTRAL_LANTERN', 0.58, 1.44, [1, 1, 0.92], [0, 2.05, -0.12], materials.warmGold, 2);

  // B — deep closed royal portal, inset purple doors, and a readable crest.
  addExtrudedPolygon(
    'ISLAND_14_JEWEL_HIVE_DEEP_ROYAL_HONEY_ARCH_TUNNEL',
    honeyArch(1.10, 1.46, 0.79),
    0.38,
    materials.paleGold,
    2,
    [0, 0.55, 0.98],
    0,
    [honeyArch(0.80, 1.20, 0.70, 0.10).reverse()],
  );
  addExtrudedPolygon(
    'ISLAND_14_JEWEL_HIVE_ROYAL_PORTAL_WARM_REVEAL',
    honeyArch(0.78, 1.17, 0.68, 0.11),
    0.11,
    materials.darkBronze,
    2,
    [0, 0.55, 1.00],
  );
  addExtrudedPolygon(
    'ISLAND_14_JEWEL_HIVE_BROAD_PURPLE_DOUBLE_DOORS',
    honeyArch(0.48, 0.76, 0.50),
    0.10,
    materials.royalPurple,
    2,
    [0, 0.64, 1.15],
  );
  const doorSeam = box(0.026, 0.67, 0.055, materials.paleGold, 'ISLAND_14_JEWEL_HIVE_DOOR_SEAM', 2);
  doorSeam.position.set(0, 0.99, 1.27);
  const handleLeft = sphere(0.045, materials.honeyHighlight, 'ISLAND_14_JEWEL_HIVE_DOOR_HANDLE_LEFT', 2, 8);
  handleLeft.position.set(-0.085, 0.94, 1.30);
  const handleRight = handleLeft.clone();
  handleRight.name = 'ISLAND_14_JEWEL_HIVE_DOOR_HANDLE_RIGHT';
  handleRight.position.x = 0.085;
  root.add(doorSeam, handleLeft, handleRight);
  addBeeCrest(root, 'ISLAND_14_JEWEL_HIVE_ROYAL_DOOR', [0, 1.20, 1.33], 0.28, materials, 2);

  // C — four countable rounded inhabited front bays.
  const frontBays = [
    [-1.24, 0.88, 0.72, 0.38, 0.58, 'LOWER_LEFT'],
    [-0.72, 1.54, 0.70, 0.38, 0.50, 'UPPER_LEFT'],
    [0.72, 1.54, 0.70, 0.38, 0.50, 'UPPER_RIGHT'],
    [1.24, 0.88, 0.72, 0.38, 0.58, 'LOWER_RIGHT'],
  ] as const;
  frontBays.forEach(([x, y, z, radiusX, radiusY, label], index) => {
    ellipsoid(`ISLAND_14_JEWEL_HIVE_FRONT_BAY_${label}_ROUNDED_BODY`, [radiusX, radiusY, 0.36], [x, y, z], index % 2 ? materials.waxCream : materials.warmGold, 2, 18);
    addJewelCell(`ISLAND_14_JEWEL_HIVE_FRONT_BAY_${label}`, [x, y, 1.055], 0.20, 0, 2, 0.13, true);
  });

  if (level >= 2) {
    // D — connected thick tracery, diagonal braces and side coverage.
    const lowerBand = torus(1.24, 0.045, materials.paleGold, 'ISLAND_14_JEWEL_HIVE_CONTINUOUS_LOWER_TRACERY_BAND', 3, 8, 48);
    lowerBand.rotation.x = Math.PI / 2;
    lowerBand.scale.z = 0.88;
    lowerBand.position.set(0, 1.38, -0.06);
    const upperBand = torus(0.62, 0.042, materials.paleGold, 'ISLAND_14_JEWEL_HIVE_CONTINUOUS_LANTERN_TRACERY_BAND', 3, 8, 40);
    upperBand.rotation.x = Math.PI / 2;
    upperBand.scale.z = 0.92;
    upperBand.position.set(0, 2.35, -0.12);
    root.add(lowerBand, upperBand);
    const frontBracePairs = [
      [new THREE.Vector3(-1.42, 0.62, 0.78), new THREE.Vector3(-0.82, 2.35, 0.47)],
      [new THREE.Vector3(1.42, 0.62, 0.78), new THREE.Vector3(0.82, 2.35, 0.47)],
      [new THREE.Vector3(-1.38, 1.55, 0.78), new THREE.Vector3(-0.30, 2.95, 0.47)],
      [new THREE.Vector3(1.38, 1.55, 0.78), new THREE.Vector3(0.30, 2.95, 0.47)],
      [new THREE.Vector3(-0.82, 0.58, 0.99), new THREE.Vector3(-0.82, 2.42, 0.47)],
      [new THREE.Vector3(0.82, 0.58, 0.99), new THREE.Vector3(0.82, 2.42, 0.47)],
    ] as const;
    frontBracePairs.forEach(([start, end], index) => addBeamBetween(`ISLAND_14_JEWEL_HIVE_CONNECTED_FRONT_BRACE_${index + 1}`, start, end, 0.035, materials.paleGold, 3));

    const frontCellSites = [
      [-1.35, 1.55], [-1.08, 2.08], [-0.52, 2.42],
      [0, 2.63], [0.52, 2.42], [1.08, 2.08], [1.35, 1.55],
    ] as const;
    frontCellSites.forEach(([x, y], index) => {
      const z = 0.70 - Math.min(0.22, Math.abs(x) * 0.12);
      addJewelCell(`ISLAND_14_JEWEL_HIVE_FRONT_TRACERY_CELL_${index + 1}`, [x, y, z], index === 3 ? 0.19 : 0.16, 0, 3, 0.105, index % 2 === 0);
    });
    [-1, 1].forEach((side) => {
      const sideX = side * 1.31;
      const sideSites = [
        [0.58, 1.03], [-0.02, 1.42], [-0.60, 1.02],
        [0.42, 1.88], [-0.22, 2.16], [-0.72, 1.78],
      ] as const;
      sideSites.forEach(([z, y], index) => addJewelCell(
        `ISLAND_14_JEWEL_HIVE_${side > 0 ? 'RIGHT' : 'LEFT'}_WRAP_CELL_${index + 1}`,
        [sideX, y, z],
        0.155,
        side > 0 ? Math.PI / 2 : -Math.PI / 2,
        3,
        0.105,
        true,
      ));
      [-0.65, 0.05, 0.65].forEach((z, index) => addBeamBetween(
        `ISLAND_14_JEWEL_HIVE_${side > 0 ? 'RIGHT' : 'LEFT'}_VERTICAL_HONEY_CHANNEL_${index + 1}`,
        new THREE.Vector3(sideX, 0.62, z),
        new THREE.Vector3(side * 0.92, 2.48, z * 0.60),
        0.032,
        materials.warmGold,
        3,
      ));
    });

    // E — scalloped cage cupolas with unequal hierarchy.
    frontBays.forEach(([x, y, z, radiusX, radiusY, label], index) => {
      addScallopedCupola(
        `ISLAND_14_JEWEL_HIVE_FRONT_BAY_${label}_CUPOLA`,
        [x, y + radiusY * 0.83, z],
        index === 0 || index === 3 ? radiusX * 0.94 : radiusX * 0.83,
        index === 0 || index === 3 ? 0.30 : 0.25,
        4,
        6,
      );
    });
    addScallopedCupola('ISLAND_14_JEWEL_HIVE_HERO_CROWN', [0, 3.20, -0.12], 0.62, 0.53, 4, 8);
    const finialStem = cylinder(0.055, 0.075, 0.22, materials.paleGold, 'ISLAND_14_JEWEL_HIVE_HERO_FINIAL_STEM', 4, 8);
    finialStem.position.set(0, 3.76, -0.12);
    const finialJewel = sphere(0.095, materials.honeyGlass, 'ISLAND_14_JEWEL_HIVE_HERO_FINIAL_JEWEL', 4, 12);
    finialJewel.position.set(0, 3.88, -0.12);
    root.add(finialStem, finialJewel);

    // F — royal shield, amber glazing and dense phone-readable filigree.
    addExtrudedPolygon('ISLAND_14_JEWEL_HIVE_PURPLE_ROYAL_SHIELD', regularPolygon(0.23, 6), 0.10, materials.royalPurple, 4, [0, 1.83, 1.06]);
    addBeeCrest(root, 'ISLAND_14_JEWEL_HIVE_ROYAL_SHIELD', [0, 1.83, 1.18], 0.20, materials, 4);
    [1.75, 2.10, 2.92].forEach((y, index) => {
      const band = torus(0.58 - index * 0.035, 0.035, index === 1 ? materials.darkBronze : materials.paleGold, `ISLAND_14_JEWEL_HIVE_LANTERN_FILIGREE_BAND_${index + 1}`, 4, 8, 36);
      band.rotation.x = Math.PI / 2;
      band.scale.z = 0.92;
      band.position.set(0, y, -0.12);
      root.add(band);
    });

    // H — rounded rear apse, service portal, wrapped cells and channels.
    ellipsoid('ISLAND_14_JEWEL_HIVE_AUTHORED_REAR_APSE', [0.68, 0.64, 0.46], [0, 1.02, -1.00], materials.waxCream, 4, 18);
    addExtrudedPolygon('ISLAND_14_JEWEL_HIVE_REAR_SERVICE_RECESS', honeyArch(0.54, 0.76, 0.48), 0.13, materials.darkBronze, 4, [0, 0.62, -1.36], Math.PI);
    addExtrudedPolygon('ISLAND_14_JEWEL_HIVE_REAR_SERVICE_AMBER_DOOR', honeyArch(0.30, 0.52, 0.34), 0.07, materials.warmGold, 4, [0, 0.68, -1.43], Math.PI);
    [-0.42, 0.42].forEach((x, index) => addJewelCell(`ISLAND_14_JEWEL_HIVE_REAR_APSE_CELL_${index + 1}`, [x, 1.24, -1.37], 0.16, Math.PI, 4, 0.10, true));
    [-0.76, 0, 0.76].forEach((x, index) => addBeamBetween(
      `ISLAND_14_JEWEL_HIVE_REAR_HONEY_CHANNEL_${index + 1}`,
      new THREE.Vector3(x, 0.62, -1.10),
      new THREE.Vector3(x * 0.66, 2.32, -0.72),
      0.032,
      materials.warmGold,
      4,
    ));
  }

  if (level >= 3) {
    // G — broad attached shelves, sagging curtains, strands and weighted drops.
    addHoneyCurtain('ISLAND_14_JEWEL_HIVE_HERO_FRONT_HONEY_CURTAIN', [-0.92, 1.48, 1.03], 0.58, 0.52, 'front');
    addHoneyCurtain('ISLAND_14_JEWEL_HIVE_FRONT_RIGHT_HONEY_CURTAIN', [1.16, 1.33, 0.98], 0.46, 0.42, 'front');
    addHoneyCurtain('ISLAND_14_JEWEL_HIVE_LEFT_SIDE_HONEY_CURTAIN', [-1.31, 1.54, 0.12], 0.50, 0.45, 'left');
    addHoneyCurtain('ISLAND_14_JEWEL_HIVE_RIGHT_SIDE_HONEY_CURTAIN', [1.31, 1.68, -0.34], 0.52, 0.48, 'right');
    addHoneyCurtain('ISLAND_14_JEWEL_HIVE_REAR_HONEY_CURTAIN', [0.42, 1.46, -1.08], 0.48, 0.40, 'rear');
    const crownHalo = torus(0.22, 0.04, materials.paleGold, 'ISLAND_14_PALACE_CROWN_HALO', 5, 8, 28);
    crownHalo.rotation.x = Math.PI / 2;
    crownHalo.position.set(0, 3.90, -0.12);
    root.add(crownHalo);
  }

  root.userData.roundedJewelHiveCathedral = {
    constructionFamily: 'threejs-rounded-layered-jewel-hive-cathedral',
    subassemblyOrder: ['A-rounded-macro', 'B-deep-portal', 'C-four-front-bays', 'D-continuous-tracery', 'E-scalloped-cupolas', 'F-glazing-filigree', 'G-attached-honey', 'H-authored-rear'],
    facadeWidth,
    footprintDepth,
    footprintDepthRatio: footprintDepth / facadeWidth,
    totalHeight: level >= 2 ? 3.98 : 3.35,
    totalHeightRatio: (level >= 2 ? 3.98 : 3.35) / facadeWidth,
    outerDoorWidth: 1.10,
    purpleDoorWidth: 0.48,
    embeddedRoseWidth: 0.80,
    frontDominantBayCount: 4,
    frontExoskeletonCoverage: 0.72,
    sideExoskeletonCoverage: 0.48,
    scallopedCupolaCount: level >= 2 ? 5 : 0,
    simpleConeRoofCount: 0,
    smoothOnionRoofCount: 0,
    honeyCurtainCount: level >= 3 ? 5 : 0,
    honeyAssembly: 'attached-shelf+sagging-curtain+tapering-strands+convex-highlight+weighted-teardrops',
    runtimeProjectionCount: 0,
    facadeCardCount: 0,
    authoredElevations: ['front', 'left', 'right', 'rear'],
  };
  root.userData.sculptRuntime = {
    parts: root.children.map((part, index) => ({ id: `rounded-jewel-hive-part-${index + 1}`, object: part, role: 'landmark' })),
  };
  return root;
}

export function buildIsland14HoneycombLandmark(
  definition: Island5LandmarkDefinition,
  level: BuildLevel,
  _quality: Island3DQuality,
  materials: Island14HoneycombMaterials,
  options: IslandConstructionFactoryOptions = {},
) {
  if (level === 0) {
    const plot = new THREE.Group();
    plot.name = `ISLAND_14_${definition.id.toUpperCase()}_FOUNDATION_PLOT`;
    plot.position.set(...definition.position);
    const foundation = cylinder(
      definition.id === 'boss' ? 1.72 : 1.18,
      definition.id === 'boss' ? 1.88 : 1.32,
      0.22,
      materials.honeyRock,
      `ISLAND_14_${definition.id.toUpperCase()}_LEVEL_ZERO_FOUNDATION`,
      1,
      12,
    );
    foundation.position.y = 0.11;
    const hexOutline = torus(
      definition.id === 'boss' ? 1.25 : 0.86,
      0.055,
      materials.paleGold,
      `ISLAND_14_${definition.id.toUpperCase()}_LEVEL_ZERO_HEX_OUTLINE`,
      1,
      6,
      24,
    );
    hexOutline.rotation.x = Math.PI / 2;
    hexOutline.position.y = 0.24;
    plot.add(foundation, hexOutline);
    plot.userData.landmarkId = definition.id;
    plot.userData.buildLevel = 0;
    plot.userData.sculptRuntime = {
      clickable: true,
      explodable: true,
      sockets: { focus: `ISLAND_14_${definition.id.toUpperCase()}_FOCUS_SOCKET` },
      colliders: [{ id: `island-014-${definition.id}`, type: 'cylinder', isTrigger: true }],
    };
    return plot;
  }
  const resolvedLevel = Math.max(1, level) as 1 | 2 | 3;
  const architecture = definition.id === 'boss'
    ? createIsland14RoyalCathedralV7(resolvedLevel, materials)
    : createIsland14SatelliteLandmarkV2(definition.id, resolvedLevel, materials);
  if (definition.id === 'boss' && !options.constructionPreview) {
    // The authored palace remains fully expanded in construction previews so
    // semantic reveal stages and contact zones stay inspectable. Completed
    // runtime instances are merged by material + stage, preserving the same
    // solid geometry while keeping the true-360 shell under its draw budget.
    batchCompletedHoneycombLandmark(architecture);
  } else if (_quality !== 'high' && !options.constructionPreview) {
    batchCompletedHoneycombLandmark(architecture);
  }
  architecture.position.set(...definition.position);
  if (definition.id === 'boss') {
    // V7 is authored taller and broader than the retired mound family. Keep
    // the source's royal vertical authority without overwhelming the route or
    // forcing the crown outside the portrait safe frame.
    architecture.scale.set(1.12, 1.36, 1.12);
  }
  else {
    // The four satellite plots use the shared canonical gameplay anchors, but
    // their authored building volumes can sit slightly farther toward the rim.
    // This preserves every tile/stop coordinate while preventing the palace
    // from swallowing the Nursery and Pollinator silhouettes in oblique views.
    const outward = new THREE.Vector2(definition.position[0], definition.position[2]).normalize();
    const outwardOffset = definition.id === 'habit'
      ? 0.90
      : definition.id === 'hatchery'
        ? 0.70
        : definition.id === 'event'
          ? 0.18
          : 0.12;
    architecture.position.x += outward.x * outwardOffset;
    architecture.position.z += outward.y * outwardOffset;
    if (definition.id === 'hatchery') {
      // At the required 045° review orbit the top-left satellite lies almost
      // exactly on the palace sight-line.  A bounded tangential presentation
      // shift exposes the Nursery's lower egg, door and brood pod while the
      // canonical landmark anchor, stop position and board geometry remain
      // untouched.
      architecture.position.z += 0.90;
      architecture.userData.phoneReadabilityOffset = [0, 0, 0.90];
    }
    const completedScale = definition.id === 'habit'
      ? 0.98
      : definition.id === 'hatchery'
        ? 1.12
        : definition.id === 'wisdom'
          ? 1.06
          : definition.id === 'event'
            ? 1.08
            : 0.98;
    architecture.scale.setScalar(options.constructionPreview ? 1 : completedScale);
  }
  if (definition.id !== 'boss') architecture.rotation.y = Math.atan2(-definition.position[0], -definition.position[2]);
  architecture.userData.landmarkId = definition.id;
  architecture.userData.buildLevel = level;
  architecture.userData.constructionPreview = options.constructionPreview ?? null;
  if (options.constructionPreview === 'target') {
    applyIslandConstructionAuthoring({
      root: architecture,
      worldSourceNumber: 14,
      landmarkId: definition.id,
      quality: _quality,
      includeTemporaryRig: true,
    });
  }
  architecture.userData.sculptRuntime = {
    ...(architecture.userData.sculptRuntime ?? {}),
    clickable: true,
    explodable: true,
    sockets: { focus: `ISLAND_14_${definition.id.toUpperCase()}_FOCUS_SOCKET` },
    colliders: [{ id: `island-014-${definition.id}`, type: 'cylinder', isTrigger: true }],
  };
  const focus = new THREE.Object3D();
  focus.name = `ISLAND_14_${definition.id.toUpperCase()}_FOCUS_SOCKET`;
  focus.position.y = definition.id === 'boss' ? 2.5 : 1.35;
  architecture.add(focus);
  return architecture;
}

function createFloatingTerrainPlate(
  radius: number,
  depth: number,
  materials: Island14HoneycombMaterials,
  name: string,
  segments = 12,
) {
  const root = new THREE.Group();
  root.name = name;
  const crown = cylinder(radius * 0.98, radius, 0.48, materials.honeyRock, `${name}_CROWN`, 1, segments);
  crown.position.y = -0.04;
  const rim = cylinder(radius, radius * 0.98, 0.2, materials.warmGold, `${name}_GOLD_RIM`, 1, segments);
  rim.position.y = 0.27;
  const waxCap = cylinder(radius * 0.94, radius * 0.98, 0.12, materials.waxCream, `${name}_WAX_TERRACE_CAP`, 1, segments);
  waxCap.position.y = 0.42;
  const isHeroIsland = radius > 4;
  const underside = cylinder(
    radius * (isHeroIsland ? 0.86 : 0.72),
    radius * (isHeroIsland ? 0.42 : 0.18),
    depth,
    materials.honeyRockShadow,
    `${name}_UNDERSIDE`,
    1,
    segments,
  );
  underside.position.y = -depth * 0.5 - 0.22;
  root.add(crown, rim, waxCap, underside);

  if (isHeroIsland) {
    const upperCliff = cylinder(radius * 0.93, radius * 0.74, depth * 0.34, materials.honeyRock, `${name}_UPPER_AMBER_CLIFF`, 1, segments);
    upperCliff.position.y = -depth * 0.18 - 0.18;
    const middleCliff = cylinder(radius * 0.75, radius * 0.56, depth * 0.34, materials.honeyRockShadow, `${name}_MIDDLE_HONEY_CLIFF`, 1, segments);
    middleCliff.position.y = -depth * 0.5 - 0.18;
    const lowerCliff = cylinder(radius * 0.57, radius * 0.36, depth * 0.32, materials.honeyRockShadow, `${name}_LOWER_HONEY_CLIFF`, 1, segments);
    lowerCliff.position.y = -depth * 0.82 - 0.18;
    root.add(upperCliff, middleCliff, lowerCliff);

    // Broad irregular foreground buttresses turn the old tapered cone into the
    // source's portrait-filling, fractured honey-rock kingdom.
    for (let index = 0; index < 13; index += 1) {
      const angle = THREE.MathUtils.lerp(0.18, Math.PI - 0.18, index / 12);
      const buttress = cylinder(
        radius * (0.13 + index % 3 * 0.014),
        radius * (0.1 + index % 4 * 0.012),
        2.2 + index % 4 * 0.48,
        index % 3 === 0 ? materials.honeyRock : materials.honeyRockShadow,
        `${name}_FOREGROUND_BUTTRESS_${index + 1}`,
        1,
        6,
      );
      const reach = radius * (0.68 + index % 2 * 0.07);
      buttress.position.set(
        Math.cos(angle) * reach,
        -1.55 - index % 3 * 0.52,
        Math.sin(angle) * reach,
      );
      buttress.rotation.z = Math.cos(angle) * 0.16;
      root.add(buttress);
    }
  }

  // Broken amber shelves produce the source's fractured honey-rock silhouette.
  // Their uneven sizes and depths keep the island from reading as one lathed disc.
  const ledgeCount = Math.max(8, Math.min(14, segments));
  for (let index = 0; index < ledgeCount; index += 1) {
    const angle = index / ledgeCount * Math.PI * 2 + (index % 3) * 0.055;
    const ledgeRadius = radius * (0.13 + (index % 4) * 0.012);
    const ledge = cylinder(
      ledgeRadius,
      ledgeRadius * 1.12,
      0.28 + (index % 3) * 0.09,
      index % 3 === 0 ? materials.warmGold : materials.honeyRock,
      `${name}_FRACTURED_LEDGE_${index + 1}`,
      1,
      6,
    );
    ledge.position.set(
      Math.cos(angle) * radius * (0.91 + (index % 2) * 0.025),
      0.02 - (index % 3) * 0.08,
      Math.sin(angle) * radius * (0.91 + (index % 2) * 0.025),
    );
    root.add(ledge);
  }

  if (radius > 4) {
    // Phone-readable honeycomb masonry along the hero-facing cliff. These are
    // intentionally much larger than facade micro-cells.
    for (let index = 0; index < 9; index += 1) {
      const angle = THREE.MathUtils.lerp(0.28, Math.PI - 0.28, index / 8);
      const plaqueRadius = 0.48 + (index % 3) * 0.055;
      const plaque = createHexFrame(plaqueRadius, 0.12, 0.09, materials.paleGold, `${name}_CLIFF_HONEYCOMB_${index + 1}`, 5);
      plaque.position.set(Math.cos(angle) * radius * 0.91, -0.62 - (index % 3) * 0.42, Math.sin(angle) * radius * 0.91);
      plaque.rotation.y = -angle + Math.PI / 2;
      const inset = cylinder(
        plaqueRadius * 0.69,
        plaqueRadius * 0.69,
        0.1,
        index % 3 === 0 ? materials.honeyGlass : materials.darkBronze,
        `${name}_CLIFF_HONEYCOMB_INSET_${index + 1}`,
        5,
        6,
      );
      inset.rotation.x = Math.PI / 2;
      inset.position.z = 0.035;
      plaque.add(inset);
      root.add(plaque);
    }
  }
  return root;
}

function addHoneyfall(
  root: THREE.Group,
  prefix: string,
  angle: number,
  radius: number,
  width: number,
  height: number,
  materials: Island14HoneycombMaterials,
  animated: THREE.Mesh[],
) {
  const fallWidth = Math.max(1.08, width * 1.88);
  const radialX = Math.cos(angle);
  const radialZ = Math.sin(angle);
  const tangentX = -radialZ;
  const tangentZ = radialX;
  const ribbons: THREE.Mesh[] = [];

  // A broad irregular sheet carries the "delicious goo" read; the animated
  // capsules layered over it supply rounded depth and a gentle living pulse.
  const gooShape = new THREE.Shape();
  gooShape.moveTo(-fallWidth * 0.52, 0);
  gooShape.lineTo(fallWidth * 0.52, 0);
  gooShape.bezierCurveTo(fallWidth * 0.42, -height * 0.16, fallWidth * 0.58, -height * 0.28, fallWidth * 0.38, -height * 0.42);
  gooShape.bezierCurveTo(fallWidth * 0.27, -height * 0.58, fallWidth * 0.48, -height * 0.72, fallWidth * 0.24, -height * 0.9);
  gooShape.bezierCurveTo(fallWidth * 0.16, -height * 1.03, -fallWidth * 0.08, -height * 1.07, -fallWidth * 0.22, -height * 0.93);
  gooShape.bezierCurveTo(-fallWidth * 0.42, -height * 0.76, -fallWidth * 0.25, -height * 0.58, -fallWidth * 0.44, -height * 0.43);
  gooShape.bezierCurveTo(-fallWidth * 0.6, -height * 0.28, -fallWidth * 0.4, -height * 0.14, -fallWidth * 0.52, 0);
  const gooSheet = setMeshPresentation(new THREE.Mesh(
    new THREE.ExtrudeGeometry(gooShape, {
      depth: 0.18,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.055,
      bevelThickness: 0.055,
      curveSegments: 8,
    }),
    materials.honeyLiquid,
  ), `${prefix}_GOOEY_SHEET`, 5);
  gooSheet.position.set(radialX * (radius - 0.04), 0.34, radialZ * (radius - 0.04));
  gooSheet.rotation.y = -angle + Math.PI / 2;
  gooSheet.castShadow = false;
  gooSheet.renderOrder = 5;
  root.add(gooSheet);

  // The translucent surface needs an opaque amber body immediately behind it.
  // Without this candy-like core the sheet reads as flat orange card against
  // the bright sky instead of thick, edible honey.
  const gooCore = setMeshPresentation(
    new THREE.Mesh(gooSheet.geometry.clone(), materials.honeyGlass),
    `${prefix}_DEEP_AMBER_CORE`,
    5,
  );
  gooCore.position.set(radialX * (radius - 0.115), 0.31, radialZ * (radius - 0.115));
  gooCore.rotation.copy(gooSheet.rotation);
  gooCore.scale.set(0.95, 0.985, 0.72);
  gooCore.castShadow = false;
  gooCore.renderOrder = 4;
  root.add(gooCore);

  const glintShape = new THREE.Shape();
  glintShape.moveTo(-fallWidth * 0.16, -height * 0.08);
  glintShape.bezierCurveTo(-fallWidth * 0.05, -height * 0.28, -fallWidth * 0.13, -height * 0.5, -fallWidth * 0.02, -height * 0.72);
  glintShape.bezierCurveTo(fallWidth * 0.03, -height * 0.78, fallWidth * 0.1, -height * 0.72, fallWidth * 0.06, -height * 0.62);
  glintShape.bezierCurveTo(-fallWidth * 0.03, -height * 0.4, fallWidth * 0.06, -height * 0.22, -fallWidth * 0.04, -height * 0.06);
  glintShape.closePath();
  const sheetGlint = setMeshPresentation(
    new THREE.Mesh(new THREE.ShapeGeometry(glintShape, 8), materials.honeyHighlight),
    `${prefix}_SHEET_GLINT`,
    5,
  );
  sheetGlint.position.set(radialX * (radius + 0.075), 0.34, radialZ * (radius + 0.075));
  sheetGlint.rotation.y = -angle + Math.PI / 2;
  sheetGlint.castShadow = false;
  sheetGlint.renderOrder = 6;
  root.add(sheetGlint);

  // Slim curved highlight folds and trapped bubbles create meso/micro
  // frequency bands while remaining batchable with the static ambience.
  for (let foldIndex = 0; foldIndex < 3; foldIndex += 1) {
    const lateral = (foldIndex - 1) * fallWidth * 0.27;
    const foldPoints = [
      new THREE.Vector3(
        radialX * (radius + 0.085) + tangentX * lateral,
        0.22,
        radialZ * (radius + 0.085) + tangentZ * lateral,
      ),
      new THREE.Vector3(
        radialX * (radius + 0.09) + tangentX * (lateral + fallWidth * 0.035),
        -height * 0.34,
        radialZ * (radius + 0.09) + tangentZ * (lateral + fallWidth * 0.035),
      ),
      new THREE.Vector3(
        radialX * (radius + 0.08) + tangentX * (lateral - fallWidth * 0.025),
        -height * (0.72 + foldIndex * 0.055),
        radialZ * (radius + 0.08) + tangentZ * (lateral - fallWidth * 0.025),
      ),
    ];
    const fold = setMeshPresentation(
      new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(foldPoints), 14, 0.032 + foldIndex * 0.006, 6, false),
        materials.honeyHighlight,
      ),
      `${prefix}_VISCOUS_FOLD_${foldIndex + 1}`,
      5,
    );
    fold.castShadow = false;
    root.add(fold);
  }
  for (let bubbleIndex = 0; bubbleIndex < 4; bubbleIndex += 1) {
    const lateral = (bubbleIndex - 1.5) * fallWidth * 0.2;
    const bubble = sphere(
      0.045 + (bubbleIndex % 2) * 0.018,
      materials.honeyHighlight,
      `${prefix}_TRAPPED_BUBBLE_${bubbleIndex + 1}`,
      5,
      8,
    );
    bubble.position.set(
      radialX * (radius + 0.11) + tangentX * lateral,
      -height * (0.2 + bubbleIndex * 0.16),
      radialZ * (radius + 0.11) + tangentZ * lateral,
    );
    bubble.scale.y = 1.35 + bubbleIndex * 0.08;
    bubble.castShadow = false;
    root.add(bubble);
  }

  [-0.3, 0, 0.3].forEach((lateralRatio, ribbonIndex) => {
    const ribbonRadius = fallWidth * (ribbonIndex === 1 ? 0.28 : 0.2);
    const ribbonHeight = height * (ribbonIndex === 1 ? 1 : 0.88 + ribbonIndex * 0.045);
    const fall = capsule(
      ribbonRadius,
      Math.max(0.2, ribbonHeight - ribbonRadius * 2),
      materials.honeyLiquid,
      `${prefix}_RIBBON_${ribbonIndex + 1}`,
      5,
      5,
      10,
    );
    const lateral = lateralRatio * fallWidth;
    fall.position.set(
      radialX * radius + tangentX * lateral,
      -ribbonHeight * 0.5 + 0.22 - ribbonIndex * 0.06,
      radialZ * radius + tangentZ * lateral,
    );
    fall.scale.z = 0.42;
    fall.castShadow = false;
    ribbons.push(fall);
    animated.push(fall);
    root.add(fall);
  });
  ribbons[1].name = `${prefix}_FALL`;

  const topPool = sphere(fallWidth * 0.62, materials.honeyLiquid, `${prefix}_POOLED_LIP`, 5, 18);
  topPool.position.set(radialX * (radius - 0.12), 0.34, radialZ * (radius - 0.12));
  topPool.scale.set(1, 0.2, 0.52);
  topPool.rotation.y = -angle;
  root.add(topPool);

  // Bulbous overhang lobes break the cliff edge into a heavy, edible lip.
  for (let lipIndex = 0; lipIndex < 5; lipIndex += 1) {
    const lip = sphere(
      fallWidth * (0.105 + (lipIndex % 2) * 0.022),
      materials.honeyLiquid,
      `${prefix}_OVERHANG_LOBE_${lipIndex + 1}`,
      5,
      12,
    );
    const lateral = (lipIndex - 2) * fallWidth * 0.21;
    lip.position.set(
      radialX * (radius + 0.03) + tangentX * lateral,
      0.21 - (lipIndex % 2) * 0.07,
      radialZ * (radius + 0.03) + tangentZ * lateral,
    );
    lip.scale.set(1.18, 0.78 + (lipIndex % 3) * 0.14, 0.62);
    root.add(lip);
  }

  const highlight = capsule(0.11, Math.max(0.18, height * 0.82), materials.honeyHighlight, `${prefix}_GLISTEN`, 5, 4, 8);
  highlight.position.set(
    radialX * (radius + 0.035) + tangentX * -fallWidth * 0.12,
    -height * 0.35 + 0.25,
    radialZ * (radius + 0.035) + tangentZ * -fallWidth * 0.12,
  );
  highlight.scale.z = 0.26;
  highlight.castShadow = false;
  highlight.userData.honeyGlintBaseY = highlight.position.y;
  highlight.userData.honeyGlintHeight = height * 0.56;
  highlight.userData.honeyGlintPhase = angle;
  animated.push(highlight);
  root.add(highlight);

  const innerGlint = capsule(0.065, Math.max(0.16, height * 0.44), materials.honeyHighlight, `${prefix}_INTERNAL_GLINT`, 5, 4, 8);
  innerGlint.position.set(
    radialX * (radius + 0.06) + tangentX * fallWidth * 0.17,
    -height * 0.28 + 0.18,
    radialZ * (radius + 0.06) + tangentZ * fallWidth * 0.17,
  );
  innerGlint.scale.z = 0.18;
  innerGlint.castShadow = false;
  innerGlint.userData.honeyGlintBaseY = innerGlint.position.y;
  innerGlint.userData.honeyGlintHeight = height * 0.68;
  innerGlint.userData.honeyGlintPhase = angle + 0.47;
  animated.push(innerGlint);
  root.add(innerGlint);

  for (let dropIndex = 0; dropIndex < 4; dropIndex += 1) {
    const drop = sphere(0.18 + (dropIndex % 2) * 0.065, materials.honeyLiquid, `${prefix}_DROP_${dropIndex + 1}`, 5, 12);
    const lateral = (dropIndex - 1.5) * fallWidth * 0.22;
    drop.position.set(
      radialX * radius + tangentX * lateral,
      -height + 0.08 - (dropIndex % 3) * 0.19,
      radialZ * radius + tangentZ * lateral,
    );
    drop.scale.set(0.94, 1.9 + dropIndex * 0.16, 0.72);
    root.add(drop);
  }
}

function addGreatHoneyfallRopeCascade(
  root: THREE.Group,
  prefix: string,
  angle: number,
  radius: number,
  width: number,
  height: number,
  materials: Island14HoneycombMaterials,
  animated: THREE.Mesh[],
) {
  const radialX = Math.cos(angle);
  const radialZ = Math.sin(angle);
  const tangentX = -radialZ;
  const tangentZ = radialX;
  const place = (lateral: number, radialOffset: number, y: number) => new THREE.Vector3(
    radialX * (radius + radialOffset) + tangentX * lateral,
    y,
    radialZ * (radius + radialOffset) + tangentZ * lateral,
  );

  // Each rope emerges from its own small cliff-edge outlet. Avoiding one
  // shared cap prevents a mushroom/fountain silhouette at phone scale.
  const cliffRockSpecs = [
    { lateral: -0.28, y: -0.16, radius: 0.29, scaleY: 1.55 },
    { lateral: 0.28, y: -0.23, radius: 0.32, scaleY: 1.42 },
    { lateral: -0.33, y: -0.43, radius: 0.27, scaleY: 1.48 },
    { lateral: 0.34, y: -0.5, radius: 0.3, scaleY: 1.36 },
    { lateral: -0.26, y: -0.7, radius: 0.25, scaleY: 1.4 },
    { lateral: 0.25, y: -0.76, radius: 0.28, scaleY: 1.34 },
  ] as const;
  cliffRockSpecs.forEach((spec, rockIndex) => {
    const rock = sphere(
      width * spec.radius,
      rockIndex % 3 === 0 ? materials.honeyRock : materials.honeyRockShadow,
      `${prefix}_ATTACHED_CLIFF_ROCK_${rockIndex + 1}`,
      4,
      7,
    );
    rock.position.copy(place(width * spec.lateral, -0.18, height * spec.y));
    rock.scale.set(0.68 + rockIndex % 2 * 0.08, spec.scaleY, 0.56);
    root.add(rock);
  });

  const streamSpecs = [
    { lateral: -0.47, length: 0.62, radius: 0.11, bend: -0.08 },
    { lateral: -0.27, length: 0.84, radius: 0.16, bend: 0.07 },
    { lateral: -0.04, length: 1, radius: 0.23, bend: -0.05 },
    { lateral: 0.22, length: 0.76, radius: 0.15, bend: 0.09 },
    { lateral: 0.43, length: 0.55, radius: 0.1, bend: -0.06 },
  ] as const;

  streamSpecs.forEach((spec, streamIndex) => {
    const lateral = spec.lateral * width;
    const streamHeight = height * spec.length;
    const points = [
      place(lateral, 0.01, 0.25 - streamIndex % 2 * 0.045),
      place(lateral + spec.bend * width, 0.12, -streamHeight * 0.22),
      place(lateral - spec.bend * width * 0.55, 0.18, -streamHeight * 0.58),
      place(lateral + spec.bend * width * 0.3, 0.2, -streamHeight + 0.18),
    ];
    const stream = setMeshPresentation(
      new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, width * spec.radius, 10, false),
        materials.honeyLiquid,
      ),
      `${prefix}_CURVED_STREAM_${streamIndex + 1}`,
      5,
    );
    stream.castShadow = false;
    stream.renderOrder = 5;
    root.add(stream);

    const outlet = sphere(
      width * (spec.radius * 1.16),
      materials.honeyLiquid,
      `${prefix}_OUTLET_LOBE_${streamIndex + 1}`,
      5,
      12,
    );
    outlet.position.copy(points[0]);
    outlet.scale.set(1.12, 0.68 + streamIndex % 2 * 0.16, 0.7);
    root.add(outlet);

    const terminalDrop = sphere(
      width * (spec.radius * 0.72),
      materials.honeyLiquid,
      `${prefix}_TERMINAL_DROP_${streamIndex + 1}`,
      5,
      10,
    );
    terminalDrop.position.copy(points[3]);
    terminalDrop.position.y -= width * spec.radius * 0.68;
    terminalDrop.scale.set(0.76, 1.45 + streamIndex % 3 * 0.24, 0.72);
    root.add(terminalDrop);
  });

  // Two narrow moving highlights create long edible glints without becoming
  // opaque structural rods in the CPU silhouette proof.
  [-0.17, 0.1].forEach((lateralRatio, glintIndex) => {
    const glint = capsule(
      0.035 + glintIndex * 0.008,
      height * (0.42 + glintIndex * 0.08),
      materials.honeyHighlight,
      `${prefix}_${glintIndex === 0 ? 'GLISTEN' : 'INTERNAL_GLINT'}_${glintIndex + 1}`,
      5,
      4,
      8,
    );
    glint.position.copy(place(width * lateralRatio, 0.225, -height * (0.27 + glintIndex * 0.08)));
    glint.scale.z = 0.18;
    glint.castShadow = false;
    glint.renderOrder = 6;
    glint.userData.honeyGlintBaseY = glint.position.y;
    glint.userData.honeyGlintHeight = height * 0.46;
    glint.userData.honeyGlintPhase = angle + glintIndex * 0.61;
    animated.push(glint);
    root.add(glint);
  });

  // The longest ropes land in three overlapping, unequal meniscus lobes; the
  // combined footprint is deliberately asymmetric rather than a round basin.
  [
    { lateral: -0.22, radial: 0.12, scaleX: 0.72, scaleZ: 0.42 },
    { lateral: 0.02, radial: 0.2, scaleX: 0.88, scaleZ: 0.5 },
    { lateral: 0.3, radial: 0.14, scaleX: 0.58, scaleZ: 0.36 },
  ].forEach((poolSpec, poolIndex) => {
    const pool = sphere(width * 0.48, materials.honeyLiquid, `${prefix}_LANDING_MENISCUS_${poolIndex + 1}`, 5, 14);
    pool.position.copy(place(width * poolSpec.lateral, poolSpec.radial, -height + 0.1 + poolIndex * 0.035));
    pool.scale.set(poolSpec.scaleX * 1.28, 0.075, poolSpec.scaleZ * 1.18);
    pool.rotation.y = -angle + poolIndex * 0.17;
    root.add(pool);
  });

  for (let sparkleIndex = 0; sparkleIndex < 7; sparkleIndex += 1) {
    const sparkle = sphere(
      0.035 + sparkleIndex % 2 * 0.012,
      materials.honeyHighlight,
      `${prefix}_TRAPPED_LIGHT_${sparkleIndex + 1}`,
      5,
      6,
    );
    const spec = streamSpecs[sparkleIndex % streamSpecs.length];
    sparkle.position.copy(place(
      width * spec.lateral + (sparkleIndex % 2 ? 0.035 : -0.025),
      0.245,
      -height * (0.13 + sparkleIndex * 0.095),
    ));
    sparkle.scale.y = 1.45;
    sparkle.castShadow = false;
    sparkle.renderOrder = 7;
    root.add(sparkle);
  }
}

function createFlyingBee(materials: Island14HoneycombMaterials, index: number) {
  const root = new THREE.Group();
  root.name = `ISLAND_14_FLYING_BEE_${index + 1}`;
  const body = sphere(0.11, materials.warmGold, `${root.name}_BODY`, 5, 10);
  body.scale.set(1.45, 0.9, 0.9);
  body.rotation.z = Math.PI / 2;
  const stripe = torus(0.085, 0.022, materials.beeBlack, `${root.name}_STRIPE`, 5, 6, 14);
  stripe.rotation.y = Math.PI / 2;
  const wingLeft = sphere(0.095, materials.wing, `${root.name}_WING_LEFT`, 5, 8);
  wingLeft.position.set(-0.06, 0.1, -0.05);
  wingLeft.scale.set(1.4, 0.36, 0.18);
  const wingRight = wingLeft.clone();
  wingRight.name = `${root.name}_WING_RIGHT`;
  wingRight.position.z = 0.05;
  root.add(body, stripe, wingLeft, wingRight);
  root.scale.setScalar(2.75 + index % 3 * 0.22);
  root.userData.wings = [wingLeft, wingRight];
  return root;
}

function createGreatHoneyfallCoronation(
  materials: Island14HoneycombMaterials,
  initialStage: number,
  replayOnLoad: boolean,
) {
  const root = new THREE.Group();
  root.name = 'ISLAND_14_GREAT_HONEYFALL_CORONATION';
  // Stage the spectacle in the palace forecourt. Centering it inside the keep
  // let the depth buffer hide the helix/core, especially from the portrait
  // gameplay camera; this offset preserves the royal alignment while keeping
  // the payoff visibly in front of the architecture.
  root.position.z = 1.35;
  const reservoirs: THREE.Group[] = [];
  const activationHalos: THREE.Mesh[] = [];
  const conduits: THREE.Mesh[] = [];
  const skyChannels: THREE.Mesh[] = [];
  const skyCurves: THREE.CatmullRomCurve3[] = [];
  const coronationAmber = new THREE.MeshPhysicalMaterial({
    color: 0xffb000,
    roughness: 0.025,
    metalness: 0,
    transmission: 0.22,
    thickness: 1.5,
    ior: 1.44,
    clearcoat: 1,
    clearcoatRoughness: 0.01,
    transparent: true,
    opacity: 0.92,
    emissive: 0xff5a00,
    emissiveIntensity: 1.35,
  });
  const coronationLight = new THREE.MeshBasicMaterial({
    color: 0xffd978,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const crownValves = new THREE.Group();
  crownValves.name = 'ISLAND_14_HONEYFALL_CROWN_VALVES';

  for (let index = 0; index < ISLAND_14_GREAT_HONEYFALL_MAX_STAGE; index += 1) {
    const angle = index / ISLAND_14_GREAT_HONEYFALL_MAX_STAGE * Math.PI * 2 + Math.PI / 4;
    const reservoir = new THREE.Group();
    reservoir.name = `ISLAND_14_ROYAL_NECTAR_RESERVOIR_${index + 1}`;
    reservoir.position.set(Math.cos(angle) * 3.18, 0.48, Math.sin(angle) * 3.18);
    const bowl = cylinder(0.38, 0.5, 0.38, materials.darkBronze, `${reservoir.name}_BOWL`, 5, 8);
    const rim = torus(0.4, 0.075, materials.paleGold, `${reservoir.name}_RIM`, 5, 7, 24);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.2;
    const nectar = sphere(0.32, materials.honeyGlass, `${reservoir.name}_NECTAR`, 5, 12);
    nectar.position.y = 0.2;
    nectar.scale.y = 0.24;
    const crest = createHexFrame(0.25, 0.07, 0.05, materials.paleGold, `${reservoir.name}_CELL`, 5);
    crest.position.set(0, 0.75, 0);
    const activationHalo = torus(0.58, 0.045, coronationLight, `${reservoir.name}_COMMISSIONING_HALO`, 5, 6, 32);
    activationHalo.rotation.x = Math.PI / 2;
    activationHalo.position.y = 0.24;
    activationHalo.castShadow = false;
    activationHalos.push(activationHalo);
    reservoir.add(bowl, rim, nectar, crest, activationHalo);
    reservoirs.push(reservoir);
    root.add(reservoir);

    const points: THREE.Vector3[] = [];
    for (let pointIndex = 0; pointIndex <= 12; pointIndex += 1) {
      const t = pointIndex / 12;
      const radius = THREE.MathUtils.lerp(3.0, 0.78, t);
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        0.58 + Math.sin(t * Math.PI) * 0.18,
        Math.sin(angle) * radius,
      ));
    }
    const conduit = setMeshPresentation(
      new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, 0.045, 7, false),
        materials.honeyGlass,
      ),
      `ISLAND_14_ROYAL_NECTAR_CONDUIT_${index + 1}`,
      5,
    );
    conduit.castShadow = false;
    conduits.push(conduit);
    root.add(conduit);

    // Once charged, each reservoir throws a large luminous stream into the
    // palace crown. The high, contrasting arcs make the mission readable in a
    // phone-sized overview instead of disappearing among the gold masonry.
    const skyPoints = [
      new THREE.Vector3(Math.cos(angle) * 2.92, 0.82, Math.sin(angle) * 2.92),
      new THREE.Vector3(Math.cos(angle) * 2.42, 2.05, Math.sin(angle) * 2.42),
      new THREE.Vector3(Math.cos(angle) * 1.48, 3.92, Math.sin(angle) * 1.48),
      new THREE.Vector3(Math.cos(angle) * 0.48, 6.32, Math.sin(angle) * 0.48),
    ];
    const skyCurve = new THREE.CatmullRomCurve3(skyPoints);
    const skyChannel = setMeshPresentation(
      new THREE.Mesh(
        new THREE.TubeGeometry(skyCurve, 36, 0.042, 8, false),
        coronationAmber,
      ),
      `ISLAND_14_CORONATION_SKY_CHANNEL_${index + 1}`,
      5,
    );
    skyChannel.castShadow = false;
    skyCurves.push(skyCurve);
    skyChannels.push(skyChannel);
    root.add(skyChannel);
  }

  const flowBeadsPerChannel = 7;
  const flowBeadCount = ISLAND_14_GREAT_HONEYFALL_MAX_STAGE * flowBeadsPerChannel;
  const flowBeads = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.105, 10, 7),
    coronationAmber,
    flowBeadCount,
  );
  flowBeads.name = 'ISLAND_14_CORONATION_TRAVELLING_NECTAR';
  flowBeads.castShadow = false;
  root.add(flowBeads);

  const missionCellCount = 24;
  const missionHexNetwork = new THREE.InstancedMesh(
    createFlatHexRingGeometry(0.2, 0.145, 0.035),
    coronationLight,
    missionCellCount,
  );
  missionHexNetwork.name = 'ISLAND_14_CORONATION_HEX_NETWORK';
  missionHexNetwork.castShadow = false;
  root.add(missionHexNetwork);

  const honeyburstCount = 32;
  const honeyburst = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.11, 9, 6),
    coronationAmber,
    honeyburstCount,
  );
  honeyburst.name = 'ISLAND_14_CORONATION_ROYAL_HONEYBURST';
  honeyburst.castShadow = false;
  root.add(honeyburst);

  const missionBloomCount = 32;
  const missionBlooms = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(0.13, 0),
    materials.petalCream,
    missionBloomCount,
  );
  missionBlooms.name = 'ISLAND_14_CORONATION_GARDEN_BLOOM';
  missionBlooms.castShadow = false;
  root.add(missionBlooms);

  for (let index = 0; index < 6; index += 1) {
    const angle = index / 6 * Math.PI * 2;
    const valve = createHexFrame(0.28, 0.08, 0.055, materials.paleGold, `ISLAND_14_HONEYFALL_CROWN_VALVE_${index + 1}`, 5);
    valve.position.set(Math.cos(angle) * 0.82, 5.7, Math.sin(angle) * 0.82);
    valve.rotation.y = -angle + Math.PI / 2;
    crownValves.add(valve);
  }
  root.add(crownValves);

  const helixPoints: THREE.Vector3[] = [];
  for (let index = 0; index <= 72; index += 1) {
    const t = index / 72;
    const angle = t * Math.PI * 5.4;
    const radius = THREE.MathUtils.lerp(0.22, 0.54, Math.sin(t * Math.PI));
    helixPoints.push(new THREE.Vector3(Math.cos(angle) * radius, 5.62 + t * 1.48, Math.sin(angle) * radius));
  }
  const liquidHelix = setMeshPresentation(
    new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helixPoints), 96, 0.12, 10, false),
      coronationAmber,
    ),
    'ISLAND_14_CORONATION_LIQUID_HONEY_HELIX',
    5,
  );
  liquidHelix.castShadow = false;
  root.add(liquidHelix);

  const coronationCore = sphere(0.46, coronationLight, 'ISLAND_14_CORONATION_NECTAR_SUN', 5, 18);
  coronationCore.position.y = 6.72;
  coronationCore.castShadow = false;
  root.add(coronationCore);

  const lightCrown = new THREE.Group();
  lightCrown.name = 'ISLAND_14_CORONATION_HEX_LIGHT_CROWN';
  for (let index = 0; index < 12; index += 1) {
    const angle = index / 12 * Math.PI * 2;
    const heightBand = index % 3;
    const cell = createHexFrame(
      0.18 + heightBand * 0.035,
      0.045,
      0.038,
      coronationLight,
      `ISLAND_14_CORONATION_HEX_LIGHT_${index + 1}`,
      5,
    );
    const radius = 0.72 + heightBand * 0.16;
    cell.position.set(Math.cos(angle) * radius, 6.62 + heightBand * 0.25, Math.sin(angle) * radius);
    cell.rotation.y = -angle + Math.PI / 2;
    lightCrown.add(cell);
  }
  root.add(lightCrown);

  const waveGeometry = new THREE.TorusGeometry(1, 0.035, 7, 48);
  const honeycombWave = new THREE.InstancedMesh(waveGeometry, coronationAmber, 3);
  honeycombWave.name = 'ISLAND_14_CORONATION_HONEYCOMB_LIGHT_WAVE';
  honeycombWave.rotation.x = Math.PI / 2;
  honeycombWave.position.y = 0.58;
  honeycombWave.castShadow = false;
  root.add(honeycombWave);

  const swarmCount = 18;
  const swarm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.085, 8, 6), materials.warmGold, swarmCount);
  swarm.name = 'ISLAND_14_CORONATION_LIVING_BEE_CROWN';
  swarm.castShadow = false;
  root.add(swarm);

  let stage = THREE.MathUtils.clamp(Math.floor(initialStage), 0, ISLAND_14_GREAT_HONEYFALL_MAX_STAGE);
  let replayStartedAt: number | null = replayOnLoad ? 0 : null;
  let currentBlend = stage / ISLAND_14_GREAT_HONEYFALL_MAX_STAGE;
  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const flatQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  const identityQuaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const hiddenPosition = new THREE.Vector3(0, -30, 0);

  const setStage = (nextStage: number, replay = false) => {
    stage = THREE.MathUtils.clamp(Math.floor(nextStage), 0, ISLAND_14_GREAT_HONEYFALL_MAX_STAGE);
    replayStartedAt = replay ? 0 : null;
  };

  const animate = (elapsed: number) => {
    if (replayStartedAt === 0) replayStartedAt = elapsed;
    const replayProgress = replayStartedAt === null
      ? 0
      : THREE.MathUtils.clamp((elapsed - replayStartedAt) / 8.2, 0, 1);
    const replayBlend = reducedMotion ? (replayStartedAt === null ? 0 : 1) : THREE.MathUtils.smoothstep(replayProgress, 0.08, 0.9);
    const targetBlend = stage / ISLAND_14_GREAT_HONEYFALL_MAX_STAGE;
    currentBlend = replayStartedAt === null ? targetBlend : replayBlend * targetBlend;
    reservoirs.forEach((reservoir, index) => {
      const localProgress = THREE.MathUtils.clamp(
        currentBlend * ISLAND_14_GREAT_HONEYFALL_MAX_STAGE - index,
        0,
        1,
      );
      const active = localProgress >= 0.72;
      const nectar = reservoir.getObjectByName(`${reservoir.name}_NECTAR`);
      if (nectar) {
        nectar.visible = active;
        nectar.scale.y = active ? 0.24 + Math.sin(elapsed * 1.7 + index) * 0.035 : 0.01;
      }
      const popRise = THREE.MathUtils.smoothstep(localProgress, 0.04, 0.62);
      const popSettle = THREE.MathUtils.smoothstep(localProgress, 0.62, 1);
      const popScale = reducedMotion ? 1 : 0.84 + popRise * 0.29 - popSettle * 0.13;
      reservoir.scale.setScalar(popScale);
      reservoir.rotation.y = reducedMotion ? 0 : Math.sin(elapsed * 0.32 + index) * 0.05;
      activationHalos[index].visible = !reducedMotion && localProgress > 0.08 && localProgress < 0.98;
      activationHalos[index].scale.setScalar(0.72 + popRise * 1.5);
      activationHalos[index].rotation.z = reducedMotion ? 0 : elapsed * 1.8 + index;
      conduits[index].visible = active;
      skyChannels[index].visible = active;
      skyChannels[index].scale.setScalar(active ? 0.88 + currentBlend * 0.12 : 0.001);
    });

    for (let channelIndex = 0; channelIndex < ISLAND_14_GREAT_HONEYFALL_MAX_STAGE; channelIndex += 1) {
      const localProgress = THREE.MathUtils.clamp(
        currentBlend * ISLAND_14_GREAT_HONEYFALL_MAX_STAGE - channelIndex,
        0,
        1,
      );
      for (let beadIndex = 0; beadIndex < flowBeadsPerChannel; beadIndex += 1) {
        const instanceIndex = channelIndex * flowBeadsPerChannel + beadIndex;
        if (localProgress < 0.72) {
          scale.setScalar(0.001);
          matrix.compose(hiddenPosition, identityQuaternion, scale);
        } else {
          const travel = reducedMotion
            ? beadIndex / flowBeadsPerChannel
            : (elapsed * 0.19 + beadIndex / flowBeadsPerChannel + channelIndex * 0.13) % 1;
          const position = skyCurves[channelIndex].getPointAt(travel);
          const beadPulse = 0.72 + Math.sin(elapsed * 3.2 + beadIndex) * (reducedMotion ? 0 : 0.18);
          scale.setScalar(beadPulse);
          matrix.compose(position, identityQuaternion, scale);
        }
        flowBeads.setMatrixAt(instanceIndex, matrix);
      }
    }
    flowBeads.instanceMatrix.needsUpdate = true;

    for (let index = 0; index < missionCellCount; index += 1) {
      const sector = Math.floor(index / 6);
      const localIndex = index % 6;
      const localProgress = THREE.MathUtils.clamp(
        currentBlend * ISLAND_14_GREAT_HONEYFALL_MAX_STAGE - sector,
        0,
        1,
      );
      const baseAngle = sector / ISLAND_14_GREAT_HONEYFALL_MAX_STAGE * Math.PI * 2 + Math.PI / 4;
      const angle = baseAngle + (localIndex - 2.5) * 0.115;
      const radius = 1.58 + (localIndex % 3) * 0.43;
      const position = new THREE.Vector3(Math.cos(angle) * radius, 0.545, Math.sin(angle) * radius);
      const cellScale = localProgress <= 0 ? 0.001 : 0.72 + localProgress * 0.28;
      scale.setScalar(cellScale);
      matrix.compose(position, flatQuaternion, scale);
      missionHexNetwork.setMatrixAt(index, matrix);
    }
    missionHexNetwork.instanceMatrix.needsUpdate = true;

    for (let index = 0; index < missionBloomCount; index += 1) {
      const sector = index % ISLAND_14_GREAT_HONEYFALL_MAX_STAGE;
      const localProgress = THREE.MathUtils.clamp(
        currentBlend * ISLAND_14_GREAT_HONEYFALL_MAX_STAGE - sector,
        0,
        1,
      );
      const angle = index / missionBloomCount * Math.PI * 2 + sector * 0.08;
      const radius = 2.45 + index % 4 * 0.54;
      const position = new THREE.Vector3(
        Math.cos(angle) * radius,
        0.6 + (reducedMotion ? 0 : Math.sin(elapsed * 1.7 + index) * 0.045),
        Math.sin(angle) * radius,
      );
      const bloomScale = localProgress <= 0 ? 0.001 : 0.32 + THREE.MathUtils.smoothstep(localProgress, 0.08, 0.72) * 0.9;
      scale.set(bloomScale * 1.2, bloomScale * 0.72, bloomScale * 1.2);
      quaternion.setFromEuler(new THREE.Euler(0, elapsed * (reducedMotion ? 0 : 0.22) + angle, 0));
      matrix.compose(position, quaternion, scale);
      missionBlooms.setMatrixAt(index, matrix);
    }
    missionBlooms.instanceMatrix.needsUpdate = true;
    const coronationActive = currentBlend >= 0.86;
    crownValves.visible = coronationActive;
    crownValves.rotation.y = reducedMotion ? 0 : elapsed * 0.22;
    liquidHelix.visible = coronationActive;
    const helixReveal = coronationActive
      ? THREE.MathUtils.smoothstep(currentBlend, 0.86, 1)
      : 0;
    liquidHelix.scale.set(0.82 + helixReveal * 0.18, Math.max(0.025, helixReveal), 0.82 + helixReveal * 0.18);
    liquidHelix.rotation.y = reducedMotion ? 0 : elapsed * 0.16;
    coronationCore.visible = coronationActive;
    const corePulse = reducedMotion ? 1 : 1 + Math.sin(elapsed * 4.4) * 0.14;
    coronationCore.scale.setScalar(Math.max(0.02, helixReveal) * corePulse);
    lightCrown.visible = coronationActive;
    lightCrown.rotation.y = reducedMotion ? 0 : -elapsed * 0.28;
    lightCrown.scale.setScalar(Math.max(0.02, helixReveal));
    honeycombWave.visible = coronationActive;
    for (let index = 0; index < 3; index += 1) {
      const wavePhase = reducedMotion ? 1 : (replayProgress * 1.9 - index * 0.25 + 1) % 1;
      const waveScale = coronationActive ? 0.9 + wavePhase * 3.15 : 0.001;
      scale.setScalar(waveScale);
      matrix.compose(new THREE.Vector3(0, 0, 0), quaternion, scale);
      honeycombWave.setMatrixAt(index, matrix);
    }
    honeycombWave.instanceMatrix.needsUpdate = true;
    honeyburst.visible = coronationActive;
    for (let index = 0; index < honeyburstCount; index += 1) {
      const travel = reducedMotion ? 0.56 : (elapsed * 0.12 + index / honeyburstCount) % 1;
      const angle = index / honeyburstCount * Math.PI * 2 + (reducedMotion ? 0 : elapsed * 0.11);
      const radius = 0.42 + travel * 2.6;
      const position = new THREE.Vector3(
        Math.cos(angle) * radius,
        6.55 + Math.sin(travel * Math.PI) * 1.72 - travel * 0.52,
        Math.sin(angle) * radius,
      );
      const dropScale = coronationActive ? (0.46 + (index % 4) * 0.12) * Math.max(0.04, helixReveal) : 0.001;
      scale.set(dropScale * 0.72, dropScale * 1.65, dropScale * 0.72);
      matrix.compose(position, identityQuaternion, scale);
      honeyburst.setMatrixAt(index, matrix);
    }
    honeyburst.instanceMatrix.needsUpdate = true;
    swarm.visible = coronationActive;
    for (let index = 0; index < swarmCount; index += 1) {
      const angle = index / swarmCount * Math.PI * 2 + (reducedMotion ? 0 : elapsed * (0.32 + index % 3 * 0.025));
      const crownRadius = 1.2 + Math.sin(index * 2.4) * 0.18;
      const position = new THREE.Vector3(
        Math.cos(angle) * crownRadius,
        7.18 + Math.sin(angle * 3 + elapsed) * (reducedMotion ? 0 : 0.16),
        Math.sin(angle) * crownRadius,
      );
      scale.setScalar(0.82 + (index % 3) * 0.12);
      matrix.compose(position, quaternion, scale);
      swarm.setMatrixAt(index, matrix);
    }
    swarm.instanceMatrix.needsUpdate = true;
  };

  root.userData.missionId = ISLAND_14_GREAT_HONEYFALL_MISSION_ID;
  root.userData.sculptRuntime = {
    parts: [
      ...reservoirs.map((object, index) => ({ id: `nectar-reservoir-${index + 1}`, object, role: 'mission-infrastructure' })),
      { id: 'palace-conduits', object: root, role: 'mission-infrastructure' },
      { id: 'coronation-liquid-helix', object: liquidHelix, role: 'mission-spectacle' },
      { id: 'coronation-sky-channels', object: root, role: 'mission-spectacle' },
      { id: 'coronation-nectar-sun', object: coronationCore, role: 'mission-spectacle' },
      { id: 'coronation-hex-light-crown', object: lightCrown, role: 'mission-spectacle' },
      { id: 'honeycomb-light-wave', object: honeycombWave, role: 'mission-spectacle' },
      { id: 'travelling-royal-nectar', object: flowBeads, role: 'mission-spectacle' },
      { id: 'coronation-hex-network', object: missionHexNetwork, role: 'mission-spectacle' },
      { id: 'coronation-garden-bloom', object: missionBlooms, role: 'mission-spectacle' },
      { id: 'coronation-royal-honeyburst', object: honeyburst, role: 'mission-spectacle' },
      { id: 'living-bee-crown', object: swarm, role: 'mission-spectacle' },
    ],
  };

  return { root, animate, setStage, getBlend: () => currentBlend };
}

/**
 * The source likeness depends on many small honey cells, petals and terrace
 * pieces. Once placed, the non-interactive ambience does not need one draw call
 * per piece. Landmarks are deliberately excluded from this batch so their
 * authored construction stages can still reveal and pop independently.
 */
function batchStaticHoneycombAmbience(
  root: THREE.Group,
  dynamicRoots: readonly THREE.Object3D[],
) {
  const dynamicObjects = new Set<THREE.Object3D>();
  dynamicRoots.forEach((dynamicRoot) => {
    dynamicRoot.traverse((object) => dynamicObjects.add(object));
  });
  root.updateMatrixWorld(true);
  const inverseRootMatrix = root.matrixWorld.clone().invert();
  const batches = new Map<string, {
    material: THREE.Material;
    sources: THREE.Mesh[];
    geometries: THREE.BufferGeometry[];
    castShadow: boolean;
    receiveShadow: boolean;
  }>();

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || dynamicObjects.has(object) || Array.isArray(object.material)) return;
    const material = object.material;
    const batch = batches.get(material.uuid) ?? {
      material,
      sources: [] as THREE.Mesh[],
      geometries: [] as THREE.BufferGeometry[],
      castShadow: false,
      receiveShadow: false,
    };
    const localMatrix = inverseRootMatrix.clone().multiply(object.matrixWorld);
    const clonedGeometry = object.geometry.clone();
    const geometry = clonedGeometry.index ? clonedGeometry.toNonIndexed() : clonedGeometry;
    if (geometry !== clonedGeometry) clonedGeometry.dispose();
    geometry.applyMatrix4(localMatrix);
    batch.sources.push(object);
    batch.geometries.push(geometry);
    batch.castShadow ||= object.castShadow;
    batch.receiveShadow ||= object.receiveShadow;
    batches.set(material.uuid, batch);
  });

  let batchIndex = 0;
  let sourceMeshCount = 0;
  batches.forEach((batch) => {
    const merged = mergeGeometries(batch.geometries, false);
    batch.geometries.forEach((geometry) => geometry.dispose());
    if (!merged) return;
    batch.sources.forEach((source) => {
      source.parent?.remove(source);
      source.geometry.dispose();
    });
    sourceMeshCount += batch.sources.length;
    const mesh = new THREE.Mesh(merged, batch.material);
    mesh.name = `ISLAND_14_STATIC_AMBIENCE_BATCH_${++batchIndex}`;
    mesh.castShadow = batch.castShadow;
    mesh.receiveShadow = batch.receiveShadow;
    root.add(mesh);
  });
  root.userData.staticBatchMetrics = { batchCount: batchIndex, sourceMeshCount };
}

/**
 * Completed board landmarks do not need one submission for every honey-cell
 * edge. Batch by both material and authored construction stage so low/medium
 * gameplay keeps the five semantic layers available for inspection. Target
 * previews are never sent through this path; the robot theatre receives the
 * original individual components and station assignments.
 */
function batchCompletedHoneycombLandmark(root: THREE.Group) {
  root.updateMatrixWorld(true);
  const inverseRootMatrix = root.matrixWorld.clone().invert();
  const preservedIdentityMeshes: THREE.Mesh[] = [];
  const batches = new Map<string, {
    material: THREE.Material;
    stage: 1 | 2 | 3 | 4 | 5;
    sources: THREE.Mesh[];
    geometries: THREE.BufferGeometry[];
    castShadow: boolean;
    receiveShadow: boolean;
  }>();

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
    if (object.name === 'ISLAND_14_HATCHERY_EGG_SHELL' || object.name === 'ISLAND_14_PALACE_CROWN_HALO') {
      preservedIdentityMeshes.push(object);
      return;
    }
    const stage = THREE.MathUtils.clamp(Number(object.userData.constructionStage ?? 5), 1, 5) as 1 | 2 | 3 | 4 | 5;
    const key = `${object.material.uuid}:${stage}`;
    const batch = batches.get(key) ?? {
      material: object.material,
      stage,
      sources: [] as THREE.Mesh[],
      geometries: [] as THREE.BufferGeometry[],
      castShadow: false,
      receiveShadow: false,
    };
    const clonedGeometry = object.geometry.clone();
    const geometry = clonedGeometry.index ? clonedGeometry.toNonIndexed() : clonedGeometry;
    if (geometry !== clonedGeometry) clonedGeometry.dispose();
    geometry.applyMatrix4(inverseRootMatrix.clone().multiply(object.matrixWorld));
    batch.sources.push(object);
    batch.geometries.push(geometry);
    batch.castShadow ||= object.castShadow;
    batch.receiveShadow ||= object.receiveShadow;
    batches.set(key, batch);
  });

  const batchParts: Array<{ id: string; object: THREE.Mesh; role: string }> = preservedIdentityMeshes.map((object, index) => ({
    id: `preserved-identity-${index + 1}`,
    object,
    role: 'landmark',
  }));
  batches.forEach((batch, index) => {
    const merged = mergeGeometries(batch.geometries, false);
    batch.geometries.forEach((geometry) => geometry.dispose());
    if (!merged) return;
    batch.sources.forEach((source) => {
      source.parent?.remove(source);
      source.geometry.dispose();
    });
    const mesh = new THREE.Mesh(merged, batch.material);
    mesh.name = `${root.name}_COMPLETED_STAGE_${batch.stage}_BATCH_${index + 1}`;
    mesh.userData.constructionStage = batch.stage;
    mesh.castShadow = batch.castShadow;
    mesh.receiveShadow = batch.receiveShadow;
    root.add(mesh);
    batchParts.push({ id: `completed-stage-${batch.stage}-batch-${index + 1}`, object: mesh, role: 'landmark' });
  });
  root.userData.sculptRuntime = {
    ...(root.userData.sculptRuntime ?? {}),
    parts: batchParts,
  };
  root.userData.completedBatchMetrics = {
    batchCount: batchParts.length,
    sourceMeshCount: Array.from(batches.values()).reduce((sum, batch) => sum + batch.sources.length, 0),
  };
}

export function createIsland14HoneycombLivingAmbience(
  scene: THREE.Scene,
  profile: Island3DQualityProfile,
  materials: Island14HoneycombMaterials,
): Island14HoneycombAmbienceRuntime {
  const root = new THREE.Group();
  root.name = 'ISLAND_14_HONEYCOMB_WORLD';
  root.userData.honeyfallFinishSystem = {
    version: 'gooey-amber-v2',
    deepAmberCore: true,
    curvedHighlightFoldsPerFall: 3,
    trappedBubblesPerFall: 4,
  };
  const animatedFalls: THREE.Mesh[] = [];
  const bees: THREE.Group[] = [];

  const mainTerrain = createFloatingTerrainPlate(6.4, 5.8, materials, 'ISLAND_14_MAIN_HONEY_ISLAND', 12);
  mainTerrain.position.y = -0.15;
  root.add(mainTerrain);

  // Dense planted terraces around the palace are a defining source-image
  // motif. They sit inside and outside the canonical gameplay route so tile
  // readability remains untouched.
  const innerGardenRing = torus(2.62, 0.11, materials.paleGold, 'ISLAND_14_INNER_GARDEN_RING', 5, 8, 48);
  innerGardenRing.rotation.x = Math.PI / 2;
  innerGardenRing.position.y = 0.35;
  root.add(innerGardenRing);
  const royalHoneyChannel = torus(2.28, 0.13, materials.honeyGlass, 'ISLAND_14_ROYAL_HONEY_CHANNEL', 5, 8, 48);
  royalHoneyChannel.rotation.x = Math.PI / 2;
  royalHoneyChannel.position.y = 0.46;
  royalHoneyChannel.scale.z = 0.96;
  royalHoneyChannel.castShadow = false;
  root.add(royalHoneyChannel);
  const outerGardenRing = torus(4.82, 0.13, materials.warmGold, 'ISLAND_14_OUTER_GARDEN_RING', 5, 8, 56);
  outerGardenRing.rotation.x = Math.PI / 2;
  outerGardenRing.position.y = 0.36;
  root.add(outerGardenRing);

  // A dense inhabited skyline around the royal keep is essential to the
  // source: the palace belongs to a bee civilization, not an empty plaza.
  for (let index = 0; index < 10; index += 1) {
    const angle = index / 10 * Math.PI * 2 + Math.PI / 10;
    const cityRadius = index % 2 === 0 ? 3.55 : 3.92;
    const towerRadius = 0.31 + index % 3 * 0.055;
    const towerHeight = 1.1 + index % 4 * 0.24;
    const x = Math.cos(angle) * cityRadius;
    const z = Math.sin(angle) * cityRadius;
    const tower = cylinder(
      towerRadius * 0.8,
      towerRadius,
      towerHeight,
      index % 2 ? materials.warmGold : materials.waxCream,
      `ISLAND_14_INHABITED_HIVE_TOWER_${index + 1}`,
      5,
      8,
    );
    tower.position.set(x, 0.48 + towerHeight * 0.5, z);
    root.add(tower);
    addHiveDome(root, `ISLAND_14_INHABITED_HIVE_TOWER_${index + 1}`, towerRadius * 0.92, 0.55 + towerHeight, materials, 5, x, z);
    const windowCell = createHexFrame(towerRadius * 0.48, 0.06, 0.045, materials.paleGold, `ISLAND_14_INHABITED_HIVE_WINDOW_${index + 1}`, 5);
    windowCell.position.set(x, 0.66 + towerHeight * 0.45, z + Math.sin(angle) * towerRadius * 0.82);
    windowCell.rotation.y = -angle + Math.PI / 2;
    const windowGlow = cylinder(towerRadius * 0.3, towerRadius * 0.3, 0.055, materials.royalPurple, `ISLAND_14_INHABITED_HIVE_WINDOW_GLOW_${index + 1}`, 5, 6);
    windowGlow.rotation.x = Math.PI / 2;
    windowGlow.position.z = 0.02;
    windowCell.add(windowGlow);
    root.add(windowCell);
  }

  for (let index = 0; index < 16; index += 1) {
    const angle = index / 16 * Math.PI * 2;
    const lanternPost = cylinder(0.028, 0.045, 0.58, materials.darkBronze, `ISLAND_14_GARDEN_LANTERN_POST_${index + 1}`, 5, 6);
    lanternPost.position.set(Math.cos(angle) * 2.72, 0.72, Math.sin(angle) * 2.72);
    const lantern = sphere(0.095, materials.honeyHighlight, `ISLAND_14_GARDEN_LANTERN_${index + 1}`, 5, 8);
    lantern.position.set(lanternPost.position.x, 1.04, lanternPost.position.z);
    root.add(lanternPost, lantern);
  }

  const terraceCellCount = profile.id === 'high' ? 30 : profile.id === 'medium' ? 24 : 18;
  for (let index = 0; index < terraceCellCount; index += 1) {
    const angle = index / terraceCellCount * Math.PI * 2;
    const radius = index % 2 ? 4.56 : 4.92;
    const cell = cylinder(
      0.24,
      0.28,
      0.1,
      index % 4 === 0 ? materials.honeyGlass : materials.paleGold,
      `ISLAND_14_GARDEN_HONEY_CELL_${index + 1}`,
      5,
      6,
    );
    cell.position.set(Math.cos(angle) * radius, 0.4, Math.sin(angle) * radius);
    root.add(cell);
  }
  ISLAND_5_LANDMARKS.filter((landmark) => landmark.id !== 'boss').forEach((landmark, index) => {
    const satellite = createFloatingTerrainPlate(2.18, 3.8 + index * 0.18, materials, `ISLAND_14_${landmark.id.toUpperCase()}_SATELLITE`, 10);
    satellite.position.set(landmark.position[0], -0.08, landmark.position[2]);
    root.add(satellite);
    const angle = Math.atan2(landmark.position[2], landmark.position[0]);
    const bridge = box(2.15, 0.18, 0.62, materials.paleGold, `ISLAND_14_${landmark.id.toUpperCase()}_BRIDGE`, 1);
    bridge.position.set(landmark.position[0] * 0.62, 0.35, landmark.position[2] * 0.62);
    bridge.rotation.y = -angle;
    root.add(bridge);
  });

  [0.18, 0.72, 1.35, 2.06, 2.72, 3.48, 4.1, 5.12].forEach((angle, index) => {
    const foregroundFall = index <= 4;
    addHoneyfall(
      root,
      `ISLAND_14_HONEYFALL_${index + 1}`,
      angle,
      6.22,
      foregroundFall ? 1.05 + (index % 2) * 0.14 : 0.72,
      foregroundFall ? 6.15 + (index % 3) * 0.48 : 5.1 + index % 2 * 0.5,
      materials,
      animatedFalls,
    );
  });

  // The goal image is especially lush across its lower, phone-facing edge:
  // large flowers grow from deliberate honeycomb parterres rather than a
  // sparse decorative ring. Keep these beds beyond the canonical route and
  // build them from mergeable scenery so the extra source fidelity does not
  // add one runtime submission per blossom or paving cell.
  const foregroundParterreCount = profile.id === 'high' ? 9 : profile.id === 'medium' ? 7 : 5;
  const raisedHexCellsPerParterre = 7;
  const flowersPerParterre = 3;
  const nectarBeadsPerParterre = 3;
  for (let parterreIndex = 0; parterreIndex < foregroundParterreCount; parterreIndex += 1) {
    const angle = THREE.MathUtils.lerp(0.26, Math.PI - 0.26, parterreIndex / Math.max(1, foregroundParterreCount - 1));
    const radius = 4.78 + parterreIndex % 3 * 0.22;
    const centerX = Math.cos(angle) * radius;
    const centerZ = Math.sin(angle) * radius;
    const tangentX = -Math.sin(angle);
    const tangentZ = Math.cos(angle);
    const radialX = Math.cos(angle);
    const radialZ = Math.sin(angle);

    for (let cellIndex = 0; cellIndex < raisedHexCellsPerParterre; cellIndex += 1) {
      const cellAngle = cellIndex === 0 ? 0 : (cellIndex - 1) / 6 * Math.PI * 2;
      const cellDistance = cellIndex === 0 ? 0 : 0.31;
      const offsetX = Math.cos(cellAngle) * cellDistance;
      const offsetZ = Math.sin(cellAngle) * cellDistance;
      const pavingCell = cylinder(
        0.25,
        0.28,
        0.12 + cellIndex % 2 * 0.035,
        cellIndex % 3 === 0 ? materials.honeyGlass : materials.paleGold,
        `ISLAND_14_FOREGROUND_PARTERRE_${parterreIndex + 1}_HEX_CELL_${cellIndex + 1}`,
        5,
        6,
      );
      pavingCell.position.set(centerX + offsetX, 0.48 + cellIndex % 2 * 0.018, centerZ + offsetZ);
      root.add(pavingCell);
    }

    const parterreMedallion = createHexFrame(
      0.23,
      0.045,
      0.034,
      materials.darkBronze,
      `ISLAND_14_FOREGROUND_PARTERRE_${parterreIndex + 1}_CENTER_MEDALLION`,
      5,
    );
    parterreMedallion.rotation.x = -Math.PI / 2;
    parterreMedallion.position.set(centerX, 0.575, centerZ);
    root.add(parterreMedallion);

    const honeyPool = sphere(
      0.36,
      materials.honeyLiquid,
      `ISLAND_14_FOREGROUND_PARTERRE_${parterreIndex + 1}_HONEY_POOL`,
      5,
      12,
    );
    honeyPool.position.set(centerX - tangentX * 0.22, 0.58, centerZ - tangentZ * 0.22);
    honeyPool.scale.set(1.4, 0.11, 0.82);
    honeyPool.castShadow = false;
    root.add(honeyPool);
    for (let beadIndex = 0; beadIndex < nectarBeadsPerParterre; beadIndex += 1) {
      const bead = sphere(
        0.055 + beadIndex * 0.008,
        beadIndex === 1 ? materials.honeyHighlight : materials.honeyGlass,
        `ISLAND_14_FOREGROUND_PARTERRE_${parterreIndex + 1}_NECTAR_BEAD_${beadIndex + 1}`,
        5,
        9,
      );
      const beadOffset = (beadIndex - 1) * 0.13;
      bead.position.set(
        honeyPool.position.x + tangentX * beadOffset + radialX * 0.05,
        0.615 + beadIndex % 2 * 0.018,
        honeyPool.position.z + tangentZ * beadOffset + radialZ * 0.05,
      );
      bead.scale.y = 0.62;
      bead.castShadow = false;
      root.add(bead);
    }

    const beacon = cylinder(
      0.11,
      0.16,
      0.54,
      parterreIndex % 2 ? materials.waxCream : materials.warmGold,
      `ISLAND_14_FOREGROUND_PARTERRE_${parterreIndex + 1}_HIVE_LANTERN`,
      5,
      8,
    );
    beacon.position.set(centerX + radialX * 0.14, 0.82, centerZ + radialZ * 0.14);
    root.add(beacon);
    addHiveDome(
      root,
      `ISLAND_14_FOREGROUND_PARTERRE_${parterreIndex + 1}_HIVE_LANTERN`,
      0.15,
      1.09,
      materials,
      5,
      beacon.position.x,
      beacon.position.z,
    );

    for (let flowerIndex = 0; flowerIndex < flowersPerParterre; flowerIndex += 1) {
      const flowerSpread = (flowerIndex - 1) * 0.36;
      const flowerPetal = (parterreIndex + flowerIndex) % 3 === 0
        ? materials.petalPurple
        : (parterreIndex + flowerIndex) % 2
          ? materials.petalPink
          : materials.petalCream;
      addFlower(
        root,
        `ISLAND_14_FOREGROUND_PARTERRE_${parterreIndex + 1}_FLOWER_${flowerIndex + 1}`,
        centerX + tangentX * flowerSpread - radialX * (0.18 + flowerIndex % 2 * 0.12),
        0.45,
        centerZ + tangentZ * flowerSpread - radialZ * (0.18 + flowerIndex % 2 * 0.12),
        0.54 + (parterreIndex + flowerIndex) % 4 * 0.04,
        flowerPetal,
        materials,
      );
    }
  }

  const flowerCount = profile.id === 'high' ? 96 : profile.id === 'medium' ? 82 : 70;
  for (let index = 0; index < flowerCount; index += 1) {
    const angle = index / flowerCount * Math.PI * 2 + (index % 5) * 0.11;
    const radius = index % 3 === 0
      ? 2.48 + (index % 2) * 0.22
      : 5.0 + (index % 4) * 0.2;
    const petal = index % 3 === 0 ? materials.petalPurple : index % 2 ? materials.petalPink : materials.petalCream;
    const gardenBed = cylinder(
      index % 3 === 0 ? 0.42 : 0.34,
      index % 3 === 0 ? 0.48 : 0.4,
      0.14,
      index % 2 ? materials.leaf : materials.leafLight,
      `ISLAND_14_GARDEN_BED_${index + 1}`,
      5,
      8,
    );
    gardenBed.position.set(Math.cos(angle) * radius, 0.38, Math.sin(angle) * radius);
    root.add(gardenBed);
    addFlower(
      root,
      `ISLAND_14_GARDEN_FLOWER_${index + 1}`,
      Math.cos(angle) * radius,
      0.36,
      Math.sin(angle) * radius,
      0.48 + index % 4 * 0.06,
      petal,
      materials,
    );
  }
  root.userData.gardenRichnessSystem = {
    version: 'royal-parterre-v4',
    flowerCount: flowerCount + foregroundParterreCount * flowersPerParterre,
    leavesPerFlower: 2,
    minimumBloomScale: 0.48,
    maximumForegroundBloomScale: 0.66,
    maximumGardenBloomScale: 0.66,
    foregroundParterreCount,
    raisedHexCellsPerParterre,
    flowersPerParterre,
    pooledHoneyPerParterre: 1,
    nectarBeadsPerParterre,
    centerMedallionsPerParterre: 1,
  };

  const beeCount = profile.id === 'high' ? 24 : profile.id === 'medium' ? 16 : 12;
  for (let index = 0; index < beeCount; index += 1) {
    const bee = createFlyingBee(materials, index);
    root.add(bee);
    bees.push(bee);
  }

  const cloudCount = profile.id === 'high' ? 14 : profile.id === 'medium' ? 10 : 8;
  for (let index = 0; index < cloudCount; index += 1) {
    const cloud = new THREE.Group();
    cloud.name = `ISLAND_14_CLOUD_BANK_${index + 1}`;
    const angle = index / cloudCount * Math.PI * 2;
    cloud.position.set(Math.cos(angle) * (15 + index % 3 * 2), -1.2 + index % 3 * 1.2, Math.sin(angle) * (15 + index % 3 * 2));
    for (let puffIndex = 0; puffIndex < 4; puffIndex += 1) {
      const puff = sphere(1.2 + puffIndex * 0.18, materials.cloud, `${cloud.name}_PUFF_${puffIndex + 1}`, 5, 12);
      puff.castShadow = false;
      puff.receiveShadow = false;
      puff.position.set((puffIndex - 1.5) * 1.25, puffIndex % 2 * 0.42, 0);
      puff.scale.y = 0.62;
      cloud.add(puff);
    }
    root.add(cloud);
  }

  batchStaticHoneycombAmbience(root, [...animatedFalls, ...bees]);

  // V2 replaces the retired radial/spear world presentation with closed,
  // irregular terrace solids, eight authored inhabited background islets and
  // one architecturally attached reservoir -> fall -> impact -> overflow
  // mission assembly. Add it after static batching so its semantic hierarchy,
  // attachment sockets and true-360 part records remain intact for evidence.
  const honeyWorldV2 = createIsland14HoneyWorldPresentationV2(materials, {
    terraces: { radius: 6.32, sectors: profile.id === 'high' ? 16 : 12, position: [0, -0.08, 0] },
    distantIslets: { scale: profile.id === 'high' ? 0.92 : 0.8 },
    // Keep the mission physically attached to the royal terrace network while
    // preserving the cathedral's front-door axis. The reservoir sits over the
    // front-right cliff and the overflow continues toward the phone-facing
    // lower edge instead of becoming a mushroom-shaped palace crown.
    honeyfall: { position: [2.10, -0.65, 3.65], scale: 0.62 },
  });
  if (honeyWorldV2.honeyfall) {
    honeyWorldV2.honeyfall.root.name = 'ISLAND_14_GREAT_HONEYFALL_RESERVOIR_NETWORK';
    // The reservoir should crown the flow, not resemble a second floating
    // island. Compress and narrow its closed solid while keeping the welded
    // spillway aligned to the full-width fall below.
    honeyWorldV2.honeyfall.reservoir.scale.set(0.78, 0.70, 0.78);
    honeyWorldV2.honeyfall.reservoir.position.y = 1.35;
    // Remove the fountain/platter read from the isolated geometry proof. The
    // crown is compact, the impact basin is broad but irregular, and the side
    // catch pools remain subordinate to the cliff-facing hero sheet.
    honeyWorldV2.honeyfall.root.traverse((object) => {
      if (!object.name) return;
      if (/RESERVOIR_ROCK_PLINTH|SOLID_CROWN_CISTERN/u.test(object.name)) object.scale.multiplyScalar(0.68);
      if (/IMPACT_BASIN_MASONRY/u.test(object.name)) object.scale.multiplyScalar(0.58);
      if (/_(RIGHT|REAR|LEFT)_CATCH_POOL_ROCK_SHELF|_(RIGHT|REAR|LEFT)_WELDED_CATCH_MENISCUS/u.test(object.name)) {
        object.scale.multiplyScalar(0.56);
      }
      if (/LOWER_CATCH_POOL/u.test(object.name)) object.scale.multiplyScalar(0.74);
    });
  }
  root.add(honeyWorldV2.root);

  // The signature mission uses asymmetric curved ropes attached to the
  // phone-facing cliff, with no slab geometry or freestanding fountain base.
  const greatHoneyfallCliff = new THREE.Group();
  greatHoneyfallCliff.name = 'ISLAND_14_GREAT_HONEYFALL_CORONATION';
  greatHoneyfallCliff.userData.presentationRole = 'signature-mission-cliff-honeyfall';
  addGreatHoneyfallRopeCascade(
    greatHoneyfallCliff,
    'ISLAND_14_GREAT_HONEYFALL_CLIFF',
    1.20,
    6.18,
    1.45,
    5.82,
    materials,
    animatedFalls,
  );
  root.add(greatHoneyfallCliff);

  const honeySparkleCount = profile.id === 'high' ? 32 : profile.id === 'medium' ? 24 : 18;
  const honeySparkleGeometry = new THREE.OctahedronGeometry(0.12, 0);
  const honeySparkles = new THREE.InstancedMesh(honeySparkleGeometry, materials.honeyHighlight, honeySparkleCount);
  honeySparkles.name = 'ISLAND_14_GLISTENING_HONEY_SPARKLES';
  honeySparkles.castShadow = false;
  const honeySparkleBases = Array.from({ length: honeySparkleCount }, (_, index) => {
    const angle = THREE.MathUtils.lerp(0.12, Math.PI - 0.12, index / Math.max(1, honeySparkleCount - 1));
    return new THREE.Vector3(
      Math.cos(angle) * (6.32 + index % 3 * 0.06),
      0.18 - index % 7 * 0.72,
      Math.sin(angle) * (6.32 + index % 3 * 0.06),
    );
  });
  const sparkleMatrix = new THREE.Matrix4();
  const sparkleQuaternion = new THREE.Quaternion();
  const sparkleScale = new THREE.Vector3();
  root.add(honeySparkles);

  const missionQuery = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialMissionStage = Number(missionQuery?.get('honeyfallMissionStage') ?? 0);
  const replayMission = missionQuery?.get('honeyfallReplay') === '1';
  const greatHoneyfall = createGreatHoneyfallCoronation(
    materials,
    Number.isFinite(initialMissionStage) ? initialMissionStage : 0,
    replayMission,
  );
  const initialHoneyfallVisible = Number.isFinite(initialMissionStage) && initialMissionStage > 0;
  greatHoneyfallCliff.visible = initialHoneyfallVisible;
  if (honeyWorldV2.honeyfall) honeyWorldV2.honeyfall.root.visible = false;

  // These materials are shared by the planted terraces. Mission progression
  // changes only their presentation response; canonical mission state remains
  // owned by the Island Run action service.
  materials.leaf.emissive.setHex(0x8dbb2a);
  materials.petalPink.emissive.setHex(0xff4f99);
  materials.petalCream.emissive.setHex(0xffc54f);
  materials.petalPurple.emissive.setHex(0x8b28d4);

  scene.add(root);
  return {
    root,
    setGreatHoneyfallStage: (stage, replay = false) => {
      greatHoneyfall.setStage(stage, replay);
      greatHoneyfallCliff.visible = stage > 0;
      if (honeyWorldV2.honeyfall) honeyWorldV2.honeyfall.root.visible = false;
    },
    animate: (elapsed: number) => {
      greatHoneyfall.animate(elapsed);
      const missionBlend = greatHoneyfall.getBlend();
      honeyWorldV2.animate(elapsed, false);
      if (honeyWorldV2.honeyfall) {
        honeyWorldV2.honeyfall.root.visible = false;
      }
      greatHoneyfallCliff.visible = missionBlend > 0.015;
      const finalSurge = THREE.MathUtils.smoothstep(missionBlend, 0.78, 1);
      const honeyfallBoost = 1 + missionBlend * 0.24 + finalSurge * 0.38;
      const gardenGlow = missionBlend * 0.1 + finalSurge * 0.22;
      materials.leaf.emissiveIntensity = gardenGlow;
      materials.petalPink.emissiveIntensity = gardenGlow * 0.78;
      materials.petalCream.emissiveIntensity = gardenGlow * 0.92;
      materials.petalPurple.emissiveIntensity = gardenGlow * 0.86;
      materials.warmWindow.emissiveIntensity = 0.72 + missionBlend * 0.34 + finalSurge * 0.46;
      materials.honeyGlass.emissiveIntensity = 0.3 + missionBlend * 0.22 + finalSurge * 0.28;
      honeySparkleBases.forEach((base, index) => {
        const phase = elapsed * (1.8 + index % 4 * 0.23) + index * 1.71;
        const flash = Math.pow(Math.max(0, Math.sin(phase)), 4);
        const size = 0.18 + missionBlend * 0.12 + flash * (1.35 + finalSurge * 0.65 + index % 3 * 0.22);
        sparkleScale.set(size * 0.52, size * 1.45, size * 0.52);
        sparkleQuaternion.setFromEuler(new THREE.Euler(0, 0, elapsed * 0.75 + index));
        sparkleMatrix.compose(base, sparkleQuaternion, sparkleScale);
        honeySparkles.setMatrixAt(index, sparkleMatrix);
      });
      honeySparkles.instanceMatrix.needsUpdate = true;
      bees.forEach((bee, index) => {
        const speed = 0.16 + index % 4 * 0.022;
        const angle = elapsed * speed + index / Math.max(1, bees.length) * Math.PI * 2;
        const radius = 4.1 + index % 5 * 0.72;
        bee.position.set(Math.cos(angle) * radius, 2.15 + Math.sin(elapsed * 0.9 + index) * 0.38 + index % 3 * 0.45, Math.sin(angle) * radius);
        bee.rotation.y = -angle + Math.PI / 2;
        const wings = bee.userData.wings as THREE.Object3D[];
        wings?.forEach((wing, wingIndex) => { wing.rotation.x = Math.sin(elapsed * 18 + wingIndex * Math.PI) * 0.55; });
      });
      animatedFalls.forEach((fall, index) => {
        if (fall.name.includes('_GLISTEN') || fall.name.includes('_INTERNAL_GLINT')) {
          const baseY = Number(fall.userData.honeyGlintBaseY ?? fall.position.y);
          const travel = Number(fall.userData.honeyGlintHeight ?? 1);
          const phase = Number(fall.userData.honeyGlintPhase ?? 0);
          const flow = (elapsed * 0.17 + phase) % 1;
          fall.position.y = baseY - flow * travel * 0.38;
          const glintPulse = 0.7 + Math.pow(Math.max(0, Math.sin(elapsed * 2.5 + phase * 4)), 3) * 0.65;
          fall.scale.x = glintPulse;
          fall.scale.y = 0.82 + glintPulse * 0.18;
          return;
        }
        const pulse = 1 + Math.sin(elapsed * 1.8 + index * 0.7) * 0.035;
        fall.scale.y = pulse * (1 + finalSurge * 0.16);
        fall.scale.x = honeyfallBoost;
        fall.scale.z = 0.42 * (1 + missionBlend * 0.18 + finalSurge * 0.16);
      });
      materials.honeyLiquid.emissiveIntensity = 0.18 + missionBlend * 0.13 + finalSurge * 0.22
        + Math.sin(elapsed * 1.35) * 0.035;
      materials.honeyHighlight.emissiveIntensity = 0.58 + missionBlend * 0.18 + finalSurge * 0.38
        + (Math.sin(elapsed * 1.55) + 1) * 0.18;
    },
  };
}
