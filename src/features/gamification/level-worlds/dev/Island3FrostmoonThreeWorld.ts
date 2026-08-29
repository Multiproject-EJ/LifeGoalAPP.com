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
import { createFrostmoonSeafoodTrade } from './FrostmoonSeafoodTradeThreeModel';

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
  getSignatureMissionCameraPose?: () => { position: THREE.Vector3; target: THREE.Vector3 } | null;
  setSignatureMissionCinematicActive?: (active: boolean) => void;
}

export type Island3FrostmoonAmbiencePhase = 'day' | 'blizzard' | 'dusk' | 'night';

export interface Island3FrostmoonAmbienceState {
  progress: number;
  phase: Island3FrostmoonAmbiencePhase;
  blizzard: number;
  dusk: number;
  night: number;
  hearth: number;
}

const FROSTMOON_AMBIENCE_CYCLE_SECONDS = 480;

const frostmoonPreviewProgress: Record<Island3FrostmoonAmbiencePhase, number> = {
  day: 0.18,
  blizzard: 0.585,
  dusk: 0.7,
  night: 0.87,
};

/**
 * Presentation-only ambience clock. It never owns or derives gameplay state.
 * The final 3% softly returns to day so a long-running preview can loop without
 * a one-frame lighting cut.
 */
export function resolveIsland3FrostmoonAmbienceState(
  elapsedSeconds: number,
  forcedPhase?: Island3FrostmoonAmbiencePhase | null,
): Island3FrostmoonAmbienceState {
  const wrappedSeconds = ((elapsedSeconds % FROSTMOON_AMBIENCE_CYCLE_SECONDS)
    + FROSTMOON_AMBIENCE_CYCLE_SECONDS) % FROSTMOON_AMBIENCE_CYCLE_SECONDS;
  const progress = forcedPhase
    ? frostmoonPreviewProgress[forcedPhase]
    : wrappedSeconds / FROSTMOON_AMBIENCE_CYCLE_SECONDS;
  const loopReturn = THREE.MathUtils.smoothstep(progress, 0.97, 1);
  const blizzardRise = THREE.MathUtils.smoothstep(progress, 0.54, 0.565);
  const blizzardFall = 1 - THREE.MathUtils.smoothstep(progress, 0.62, 0.655);
  const blizzard = blizzardRise * blizzardFall * (1 - loopReturn);
  const dusk = THREE.MathUtils.smoothstep(progress, 0.61, 0.73)
    * (1 - THREE.MathUtils.smoothstep(progress, 0.82, 0.9))
    * (1 - loopReturn);
  const night = THREE.MathUtils.smoothstep(progress, 0.72, 0.83) * (1 - loopReturn);
  const hearth = THREE.MathUtils.clamp(
    THREE.MathUtils.smoothstep(progress, 0.56, 0.76) * (1 - loopReturn) + blizzard * 0.3,
    0,
    1,
  );
  const phase: Island3FrostmoonAmbiencePhase = blizzard > 0.34
    ? 'blizzard'
    : night > 0.64
      ? 'night'
      : dusk > 0.18
        ? 'dusk'
        : 'day';
  return { progress, phase, blizzard, dusk, night, hearth };
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
    frostRock: new THREE.MeshStandardMaterial({ color: 0x78828d, map: stoneMap, roughness: 0.92 }),
    frostRockDark: new THREE.MeshStandardMaterial({ color: 0x3d454f, map: stoneMap, roughness: 0.96 }),
    timber: new THREE.MeshStandardMaterial({ color: 0x603c2b, map: woodMap, roughness: 0.84 }),
    timberDark: new THREE.MeshStandardMaterial({ color: 0x2f211d, map: woodMap, roughness: 0.92 }),
    // Keep the legacy property names because Frostwell shares this material
    // contract, but the authored Island 003 roof family is now raw copper.
    indigo: new THREE.MeshPhysicalMaterial({ color: 0x6f3825, map: roofMap, roughness: 0.46, metalness: 0.7, clearcoat: 0.28, clearcoatRoughness: 0.3 }),
    indigoLight: new THREE.MeshPhysicalMaterial({ color: 0xa95f38, map: roofMap, roughness: 0.38, metalness: 0.76, clearcoat: 0.38, clearcoatRoughness: 0.24 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc88942, roughness: 0.36, metalness: 0.78, emissive: 0x4f2c08, emissiveIntensity: 0.08 }),
    crystal: new THREE.MeshPhysicalMaterial({ color: 0x965ef0, roughness: 0.06, transparent: true, opacity: 0.86, transmission: 0.22, thickness: 0.54, clearcoat: 1, emissive: 0x4c18ad, emissiveIntensity: 0.9, depthWrite: false }),
    ice: new THREE.MeshPhysicalMaterial({ color: 0x79ddf5, roughness: 0.06, transparent: true, opacity: 0.78, transmission: 0.28, thickness: 0.28, clearcoat: 1, clearcoatRoughness: 0.06, emissive: 0x155f8e, emissiveIntensity: 0.2, depthWrite: false, side: THREE.DoubleSide }),
    windowGlow: new THREE.MeshStandardMaterial({ color: 0xffd48a, roughness: 0.28, emissive: 0xff8a2a, emissiveIntensity: 0.42 }),
    pine: new THREE.MeshStandardMaterial({ color: 0x355c57, roughness: 0.9 }),
    pineDark: new THREE.MeshStandardMaterial({ color: 0x203d42, roughness: 0.94 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xe7d4a5, roughness: 0.9, side: THREE.DoubleSide }),
    egg: new THREE.MeshPhysicalMaterial({ color: 0xf6e6c7, roughness: 0.42, clearcoat: 0.28, clearcoatRoughness: 0.32 }),
    eggSpot: new THREE.MeshStandardMaterial({ color: 0x8f6572, roughness: 0.52, emissive: 0x351f24, emissiveIntensity: 0.05 }),
    banner: new THREE.MeshStandardMaterial({ color: 0x612f35, roughness: 0.6, side: THREE.DoubleSide }),
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

function createSnowfeatherPart(name: string) {
  const part = new THREE.Group();
  part.name = name;
  part.userData.sculptPartId = name;
  part.userData.explodeWithParent = false;
  return part;
}

function addSnowfeatherDiamondWindow(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  rotationY: number,
  materials: Island3FrostmoonMaterials,
  scale = 1,
) {
  const windowRoot = createSnowfeatherPart('ISLAND_3_SNOWFEATHER_DIAMOND_WINDOW');
  windowRoot.position.set(x, y, z);
  windowRoot.rotation.y = rotationY;
  const frame = box(0.32 * scale, 0.44 * scale, 0.07, materials.timberDark);
  const glow = box(0.22 * scale, 0.34 * scale, 0.076, materials.windowGlow);
  glow.position.z = 0.012;
  [-1, 1].forEach((direction) => {
    const mullion = box(0.035 * scale, 0.38 * scale, 0.085, materials.brass);
    mullion.position.z = 0.02;
    mullion.rotation.z = direction * 0.56;
    windowRoot.add(mullion);
  });
  windowRoot.add(frame, glow);
  group.add(windowRoot);
}

function addSnowfeatherNestBay(
  group: THREE.Group,
  side: -1 | 1,
  level: 1 | 2 | 3,
  quality: Island3DQuality,
  materials: Island3FrostmoonMaterials,
) {
  const bay = createSnowfeatherPart(`ISLAND_3_SNOWFEATHER_HEATED_NEST_BAY_${side < 0 ? 'LEFT' : 'RIGHT'}`);
  bay.position.set(side * (level === 1 ? 0.62 : 0.82), 0, level === 1 ? 0.04 : 0.62);
  const plinth = box(level === 1 ? 0.74 : 0.8, 0.22, level === 1 ? 0.7 : 0.76, materials.frostRockDark);
  plinth.position.y = 0.47;
  bay.add(plinth);
  const ringCount = quality === 'low' ? 3 : level === 1 ? 4 : 6;
  for (let index = 0; index < ringCount; index += 1) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.27 + index * 0.022, 0.035, 5, quality === 'high' ? 20 : 13),
      index % 2 ? materials.timber : materials.timberDark,
    );
    ring.rotation.x = Math.PI / 2 + (index % 2 ? 0.075 : -0.055);
    ring.rotation.z = index * 0.7;
    ring.position.y = 0.62 + index * 0.018;
    bay.add(ring);
  }
  const egg = new THREE.Mesh(new THREE.SphereGeometry(level === 1 ? 0.19 : 0.24, segmentsFor(quality), quality === 'low' ? 7 : 11), materials.egg);
  egg.name = `ISLAND_3_SNOWFEATHER_EGG_${side < 0 ? 'LEFT' : 'RIGHT'}`;
  egg.scale.y = 1.42;
  egg.position.y = level === 1 ? 0.78 : 0.86;
  bay.add(egg);
  const spotCount = quality === 'high' ? 5 : quality === 'medium' ? 3 : 2;
  for (let index = 0; index < spotCount; index += 1) {
    const angle = index / spotCount * Math.PI * 2 + side * 0.35;
    const spot = new THREE.Mesh(new THREE.SphereGeometry(0.035 + index % 2 * 0.012, 6, 4), materials.eggSpot);
    spot.scale.z = 0.2;
    spot.position.set(Math.cos(angle) * 0.17, egg.position.y + (index % 3 - 1) * 0.08, Math.sin(angle) * 0.19 + 0.17);
    bay.add(spot);
  }
  if (level === 3) {
    const hood = cylinder(0.29, 0.39, 0.24, materials.indigoLight, quality === 'low' ? 8 : 14);
    hood.name = `ISLAND_3_SNOWFEATHER_INCUBATION_HOOD_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    hood.position.y = 1.25;
    bay.add(hood);
    const heaterBand = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.045, 5, quality === 'low' ? 12 : 22), materials.brass);
    heaterBand.rotation.x = Math.PI / 2;
    heaterBand.position.y = 1.12;
    bay.add(heaterBand);
    const apertureCount = quality === 'low' ? 4 : 8;
    for (let index = 0; index < apertureCount; index += 1) {
      const angle = index / apertureCount * Math.PI * 2;
      const aperture = box(0.04, 0.07, 0.025, materials.windowGlow);
      aperture.position.set(Math.cos(angle) * 0.34, 1.12, Math.sin(angle) * 0.34);
      aperture.rotation.y = -angle;
      bay.add(aperture);
    }
  }
  group.add(bay);
}

function addSnowfeatherCrown(group: THREE.Group, quality: Island3DQuality, materials: Island3FrostmoonMaterials) {
  const crown = createSnowfeatherPart('ISLAND_3_SNOWFEATHER_FEATHER_CROWN');
  crown.position.set(0, 2.03, 0.64);
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.02);
  shape.bezierCurveTo(-0.28, 0.28, -0.31, 0.72, 0, 1.04);
  shape.bezierCurveTo(0.31, 0.72, 0.28, 0.28, 0, 0.02);
  const feather = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelSize: 0.018,
      bevelThickness: 0.018,
      bevelSegments: quality === 'high' ? 2 : 1,
    }),
    materials.indigoLight,
  );
  feather.geometry.translate(0, 0, -0.06);
  crown.add(feather);
  const shaft = box(0.055, 0.88, 0.15, materials.brass);
  shaft.position.y = 0.43;
  // Lift the vein above the feather face so it survives the small gameplay camera.
  shaft.position.z = 0.08;
  shaft.rotation.z = -0.05;
  crown.add(shaft);
  const barbCount = quality === 'low' ? 3 : quality === 'medium' ? 4 : 5;
  for (let index = 0; index < barbCount; index += 1) {
    const y = 0.2 + index * 0.15;
    const width = 0.14 - index * 0.012;
    [-1, 1].forEach((side) => {
      const barb = box(width, 0.028, 0.13, materials.brass);
      barb.position.set(side * (0.07 + width * 0.25), y, 0.08);
      barb.rotation.z = side * (0.52 - index * 0.035);
      crown.add(barb);
    });
  }
  group.add(crown);
}

function addSnowfeatherEntrance(group: THREE.Group, level: 2 | 3, materials: Island3FrostmoonMaterials) {
  const entrance = createSnowfeatherPart('ISLAND_3_SNOWFEATHER_WIDE_ENTRY');
  const frontZ = 0.69;
  const door = box(level === 3 ? 0.5 : 0.42, 0.82, 0.09, materials.timberDark);
  door.position.set(0, 0.93, frontZ);
  const glow = box(level === 3 ? 0.34 : 0.28, 0.64, 0.095, materials.windowGlow);
  glow.position.set(0, 0.94, frontZ + 0.012);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(level === 3 ? 0.37 : 0.31, 0.055, 6, qualityArcSegments(level)), materials.brass);
  arch.scale.y = 1.16;
  arch.position.set(0, 1.05, frontZ + 0.04);
  entrance.add(door, glow, arch);
  const stepCount = level === 3 ? 3 : 2;
  for (let index = 0; index < stepCount; index += 1) {
    const step = box(0.72 + index * 0.14, 0.1, 0.22, materials.frostRockDark);
    step.position.set(0, 0.43 - index * 0.06, 0.76 + index * 0.15);
    entrance.add(step);
  }
  [-1, 1].forEach((side) => addLantern(entrance, side * 0.42, 0.98, frontZ + 0.08, materials, level === 3 ? 0.72 : 0.58));
  group.add(entrance);
}

function qualityArcSegments(level: 2 | 3) {
  return level === 3 ? 24 : 16;
}

function createSnowfeatherRoost(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island3FrostmoonMaterials) {
  const group = new THREE.Group();
  group.name = `ISLAND_3_SNOWFEATHER_ROOST_L${level}`;
  group.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    representativeSlice: 'snowfeather-roost-l3-v002',
    parts: ['foundation', 'lodge-shell', 'roof-shell', 'entrance', 'incubation-bays', 'feather-crown', 'chimney', 'rear-service'],
  };
  const foundation = createFrostfirePart('ISLAND_3_FROSTFIRE_CIRCULAR_FROST_STONE_FOUNDATION');
  addFoundation(foundation, 1.42, materials, quality);
  group.add(foundation);

  const foundationFrame = createSnowfeatherPart('ISLAND_3_SNOWFEATHER_FOUNDATION_FRAME');
  [-1, 1].forEach((side) => {
    const sideBeam = box(0.12, level === 1 ? 0.5 : 0.72, 1.54, materials.timberDark);
    sideBeam.position.set(side * 0.92, level === 1 ? 0.68 : 0.8, -0.02);
    foundationFrame.add(sideBeam);
  });
  const rearBeam = box(1.92, level === 1 ? 0.18 : 0.28, 0.14, materials.timberDark);
  rearBeam.position.set(0, level === 1 ? 0.49 : 0.56, -0.72);
  foundationFrame.add(rearBeam);
  group.add(foundationFrame);

  if (level === 1) {
    addSnowfeatherNestBay(group, -1, level, quality, materials);
    addSnowfeatherNestBay(group, 1, level, quality, materials);
    const threshold = box(0.66, 0.12, 0.34, materials.frostRockDark);
    threshold.position.set(0, 0.45, 0.74);
    group.add(threshold);
    return group;
  }

  const lodge = createSnowfeatherPart('ISLAND_3_SNOWFEATHER_MAIN_LODGE');
  addTimberFrame(lodge, 1.68, 1.08, 1.26, 0.44, materials);
  group.add(lodge);

  const roof = createSnowfeatherPart('ISLAND_3_SNOWFEATHER_FLARED_COPPER_ROOF');
  addGableRoof(roof, 2.08, level === 3 ? 0.78 : 0.68, 1.58, 1.52, materials, quality, false);
  [-1, 1].forEach((side) => {
    const flaredEave = box(0.46, 0.075, 1.7, materials.indigoLight);
    flaredEave.position.set(side * 0.94, 1.69, 0);
    flaredEave.rotation.z = side * 0.22;
    roof.add(flaredEave);
  });
  const courseCount = quality === 'low' ? 2 : quality === 'medium' ? 3 : 4;
  for (let index = 0; index < courseCount; index += 1) {
    const progress = (index + 1) / (courseCount + 1);
    [-1, 1].forEach((side) => {
      const course = box(0.64, 0.035, 1.62, index % 2 ? materials.indigo : materials.indigoLight);
      course.position.set(side * (0.18 + progress * 0.55), 1.62 + (1 - progress) * (level === 3 ? 0.58 : 0.5), 0);
      course.rotation.z = side * -0.59;
      roof.add(course);
    });
  }
  group.add(roof);

  addSnowfeatherEntrance(group, level, materials);
  addSnowfeatherNestBay(group, -1, level, quality, materials);
  addSnowfeatherNestBay(group, 1, level, quality, materials);
  addSnowfeatherDiamondWindow(group, -0.86, 1.03, -0.06, -Math.PI / 2, materials, 0.78);
  addSnowfeatherDiamondWindow(group, 0.86, 1.03, -0.06, Math.PI / 2, materials, 0.78);

  if (level === 3) {
    addSnowfeatherCrown(group, quality, materials);
    const chimney = createSnowfeatherPart('ISLAND_3_SNOWFEATHER_CHIMNEY');
    const stack = box(0.3, 0.86, 0.32, materials.frostRockDark);
    stack.position.set(0.58, 2.01, -0.34);
    const lowerBand = box(0.38, 0.09, 0.4, materials.brass);
    lowerBand.position.set(0.58, 2.26, -0.34);
    const cap = box(0.42, 0.12, 0.44, materials.indigoLight);
    cap.position.set(0.58, 2.5, -0.34);
    chimney.add(stack, lowerBand, cap);
    group.add(chimney);

    const rearService = createSnowfeatherPart('ISLAND_3_SNOWFEATHER_REAR_SERVICE_HATCH');
    const rearDoor = box(0.64, 0.68, 0.08, materials.timberDark);
    rearDoor.position.set(0, 0.91, -0.67);
    rearService.add(rearDoor);
    [-1, 1].forEach((direction) => {
      const brace = box(0.055, 0.72, 0.09, materials.brass);
      brace.position.set(direction * 0.15, 0.91, -0.72);
      brace.rotation.z = direction * 0.52;
      rearService.add(brace);
    });
    group.add(rearService);
    addSnowfeatherDiamondWindow(group, -0.55, 1.02, -0.67, Math.PI, materials, 0.66);
    addSnowfeatherDiamondWindow(group, 0.55, 1.02, -0.67, Math.PI, materials, 0.66);
    addIcicles(group, 1.86, 1.62, 0.82, materials, quality);
  }
  return group;
}

function createHearthguardPart(name: string) {
  const part = new THREE.Group();
  part.name = name;
  part.userData.sculptPartId = name;
  part.userData.explodeWithParent = false;
  return part;
}

function addHearthguardBeam(
  group: THREE.Group,
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  name?: string,
) {
  const direction = end.clone().sub(start);
  const beam = cylinder(radius, radius, direction.length() + 0.035, material, 7);
  if (name) beam.name = name;
  beam.position.copy(start).add(end).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  group.add(beam);
  return beam;
}

function addHearthguardGate(
  group: THREE.Group,
  level: 1 | 2 | 3,
  quality: Island3DQuality,
  materials: Island3FrostmoonMaterials,
) {
  const gate = createHearthguardPart('ISLAND_3_HEARTHGUARD_FRONT_GATE');
  const frontZ = 1.17;
  const postHeight = level === 1 ? 0.78 : level === 2 ? 1.08 : 1.3;
  [-1, 1].forEach((side) => {
    const foot = box(0.26, 0.2, 0.3, materials.frostRockDark);
    foot.position.set(side * 0.48, 0.52, frontZ);
    const post = box(0.17, postHeight, 0.17, materials.timberDark);
    post.position.set(side * 0.48, 0.57 + postHeight / 2, frontZ);
    const cap = box(0.23, 0.12, 0.23, materials.indigoLight);
    cap.position.set(side * 0.48, 0.6 + postHeight, frontZ);
    const footPlate = box(0.23, 0.08, 0.2, materials.brass);
    footPlate.position.set(side * 0.48, 0.67, frontZ + 0.1);
    gate.add(foot, post, cap, footPlate);
  });
  if (level >= 2) {
    [-1, 1].forEach((side) => {
      const lintel = box(0.68, 0.13, 0.19, materials.timberDark);
      lintel.position.set(side * 0.25, level === 3 ? 1.78 : 1.46, frontZ);
      lintel.rotation.z = side * -0.38;
      gate.add(lintel);
    });
  }
  if (level === 3) {
    const crown = createHearthguardPart('ISLAND_3_HEARTHGUARD_FEATHER_CROWN');
    crown.position.set(0, 1.66, frontZ + 0.03);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(-0.3, 0.18, -0.31, 0.46, 0, 0.76);
    shape.bezierCurveTo(0.31, 0.46, 0.3, 0.18, 0, 0);
    const feather = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, {
      depth: 0.1,
      bevelEnabled: true,
      bevelSize: 0.014,
      bevelThickness: 0.014,
      bevelSegments: quality === 'high' ? 2 : 1,
    }), materials.indigoLight);
    feather.geometry.translate(0, 0, -0.05);
    crown.add(feather);
    const shaft = box(0.038, 0.57, 0.13, materials.brass);
    shaft.position.set(0, 0.28, 0.07);
    crown.add(shaft);
    const barbCount = quality === 'low' ? 3 : 4;
    for (let index = 0; index < barbCount; index += 1) {
      const y = 0.16 + index * 0.12;
      const width = 0.11 - index * 0.012;
      [-1, 1].forEach((side) => {
        const barb = box(width, 0.024, 0.11, materials.brass);
        barb.position.set(side * (0.06 + width * 0.24), y, 0.07);
        barb.rotation.z = side * (0.48 - index * 0.04);
        crown.add(barb);
      });
    }
    gate.add(crown);
    [-1, 1].forEach((side) => addLantern(gate, side * 0.67, 1.3, frontZ + 0.02, materials, 0.6));
  }
  const thresholdCount = level === 1 ? 1 : 2;
  for (let index = 0; index < thresholdCount; index += 1) {
    const threshold = box(0.72 + index * 0.18, 0.1, 0.22, materials.frostRockDark);
    threshold.position.set(0, 0.45 - index * 0.035, 1.12 + index * 0.13);
    gate.add(threshold);
  }
  group.add(gate);
}

function addHearthguardPerimeter(
  group: THREE.Group,
  level: 1 | 2 | 3,
  quality: Island3DQuality,
  materials: Island3FrostmoonMaterials,
) {
  const perimeter = createHearthguardPart('ISLAND_3_HEARTHGUARD_PERIMETER_SYSTEM');
  const postCount = level === 1 ? 6 : level === 2 ? 10 : quality === 'low' ? 10 : 14;
  const positions: Array<THREE.Vector3 | null> = [];
  for (let index = 0; index < postCount; index += 1) {
    const angle = index / postCount * Math.PI * 2;
    const x = Math.cos(angle) * 1.42;
    const z = Math.sin(angle) * 1.17;
    const gateGap = z > 0.84 && Math.abs(x) < 0.68;
    if (gateGap) {
      positions.push(null);
      continue;
    }
    const point = new THREE.Vector3(x, 0.78, z);
    positions.push(point);
    const post = box(0.12, level === 3 ? 0.66 : 0.52, 0.12, materials.timberDark);
    post.position.copy(point);
    const cap = cylinder(0.075, 0.09, 0.08, materials.indigoLight, 8);
    cap.position.set(x, point.y + (level === 3 ? 0.36 : 0.29), z);
    const snow = cylinder(0.07, 0.1, 0.06, materials.snow, 8);
    snow.position.set(x, cap.position.y + 0.065, z);
    perimeter.add(post, cap, snow);
  }
  if (level >= 2) {
    positions.forEach((start, index) => {
      const end = positions[(index + 1) % positions.length];
      if (!start || !end) return;
      addHearthguardBeam(
        perimeter,
        start.clone().setY(level === 3 ? 0.83 : 0.78),
        end.clone().setY(level === 3 ? 0.83 : 0.78),
        level === 3 ? 0.035 : 0.03,
        level === 3 ? materials.timber : materials.timberDark,
        'ISLAND_3_HEARTHGUARD_FENCE_RAIL',
      );
    });
  }
  group.add(perimeter);
}

function addHearthguardClimbingFrame(
  group: THREE.Group,
  level: 2 | 3,
  quality: Island3DQuality,
  materials: Island3FrostmoonMaterials,
) {
  const rig = createHearthguardPart('ISLAND_3_HEARTHGUARD_CLIMBING_FRAME');
  const centerX = -0.82;
  const centerZ = -0.58;
  const width = level === 3 ? 0.66 : 0.52;
  const depth = level === 3 ? 0.4 : 0.28;
  const height = level === 3 ? 1.24 : 1.08;
  const corners: Array<[number, number]> = level === 3
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : [[-1, 0], [1, 0]];
  corners.forEach(([sx, sz]) => {
    const x = centerX + sx * width / 2;
    const z = centerZ + sz * depth / 2;
    const foot = box(0.18, 0.14, 0.18, materials.frostRockDark);
    foot.position.set(x, 0.5, z);
    const post = box(0.13, height, 0.13, materials.timberDark);
    post.position.set(x, 0.57 + height / 2, z);
    const cap = box(0.17, 0.09, 0.17, materials.indigoLight);
    cap.position.set(x, 0.6 + height, z);
    rig.add(foot, post, cap);
  });
  const topY = 0.58 + height;
  addHearthguardBeam(rig, new THREE.Vector3(centerX - width / 2, topY, centerZ + depth / 2), new THREE.Vector3(centerX + width / 2, topY, centerZ + depth / 2), 0.065, materials.timberDark);
  if (level === 3) {
    addHearthguardBeam(rig, new THREE.Vector3(centerX - width / 2, topY, centerZ - depth / 2), new THREE.Vector3(centerX + width / 2, topY, centerZ - depth / 2), 0.065, materials.timberDark);
    [-1, 1].forEach((side) => addHearthguardBeam(rig, new THREE.Vector3(centerX + side * width / 2, topY, centerZ - depth / 2), new THREE.Vector3(centerX + side * width / 2, topY, centerZ + depth / 2), 0.055, materials.timber));
    [-1, 1].forEach((side) => {
      const x = centerX + side * 0.2;
      addHearthguardBeam(rig, new THREE.Vector3(x, topY - 0.03, centerZ + depth / 2), new THREE.Vector3(x, topY - 0.42, centerZ + depth / 2), 0.018, materials.timber);
      const ringRoot = createHearthguardPart(`ISLAND_3_HEARTHGUARD_RING_${side < 0 ? 'LEFT' : 'RIGHT'}`);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.026, 5, quality === 'high' ? 18 : 12), materials.brass);
      ring.position.set(x, topY - 0.53, centerZ + depth / 2);
      ringRoot.add(ring);
      rig.add(ringRoot);
    });
    addHearthguardBeam(rig, new THREE.Vector3(centerX - width / 2, 0.9, centerZ - depth / 2), new THREE.Vector3(centerX + width / 2, 0.9, centerZ - depth / 2), 0.045, materials.timber);
  }
  group.add(rig);
}

function addHearthguardShieldTargets(
  group: THREE.Group,
  level: 1 | 2 | 3,
  quality: Island3DQuality,
  materials: Island3FrostmoonMaterials,
) {
  const targets = createHearthguardPart('ISLAND_3_HEARTHGUARD_SHIELD_TARGET_SYSTEM');
  const targetXs = level === 1 ? [-0.72] : level === 2 ? [-0.94, -0.58] : [-1, -0.62];
  targetXs.forEach((x, index) => {
    const z = -0.02 + index * 0.12;
    const foot = cylinder(0.13, 0.17, 0.12, materials.frostRockDark, 8);
    foot.position.set(x, 0.51, z);
    const post = cylinder(0.065, 0.08, level === 1 ? 0.62 : 0.78, materials.timberDark, 7);
    post.position.set(x, level === 1 ? 0.79 : 0.87, z);
    const shield = cylinder(0.25, 0.25, 0.08, index % 2 ? materials.indigo : materials.timber, quality === 'low' ? 10 : 16);
    shield.name = `ISLAND_3_HEARTHGUARD_TARGET_${index + 1}`;
    shield.position.set(x, level === 1 ? 0.98 : 1.08, z + 0.03);
    shield.rotation.x = Math.PI / 2;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.035, 5, quality === 'high' ? 20 : 13), materials.brass);
    rim.position.set(x, shield.position.y, z + 0.08);
    const boss = cylinder(0.075, 0.095, 0.09, materials.brass, 10);
    boss.position.set(x, shield.position.y, z + 0.1);
    boss.rotation.x = Math.PI / 2;
    targets.add(foot, post, shield, rim, boss);
  });
  group.add(targets);
}

function addHearthguardRecoveryHut(
  group: THREE.Group,
  level: 2 | 3,
  quality: Island3DQuality,
  materials: Island3FrostmoonMaterials,
) {
  const hut = createHearthguardPart('ISLAND_3_HEARTHGUARD_RECOVERY_HUT');
  const centerX = 0.82;
  const centerZ = -0.64;
  const width = level === 3 ? 0.9 : 0.72;
  const depth = level === 3 ? 0.72 : 0.58;
  const postHeight = level === 3 ? 0.92 : 0.68;
  const rearWall = box(width * 0.86, postHeight * 0.82, 0.12, materials.timberDark);
  rearWall.position.set(centerX, 0.62 + postHeight * 0.42, centerZ - depth / 2);
  hut.add(rearWall);
  [-1, 1].forEach((side) => {
    [-1, 1].forEach((frontBack) => {
      const post = box(0.12, postHeight, 0.12, materials.timberDark);
      post.position.set(centerX + side * width / 2, 0.58 + postHeight / 2, centerZ + frontBack * depth / 2);
      hut.add(post);
    });
  });
  const roofRoot = createHearthguardPart('ISLAND_3_HEARTHGUARD_RECOVERY_HUT_ROOF');
  roofRoot.position.set(centerX, 0, centerZ);
  addGableRoof(roofRoot, width * 1.28, level === 3 ? 0.48 : 0.38, depth * 1.32, 0.55 + postHeight, materials, quality);
  [-1, 1].forEach((side) => {
    const snowStrip = box(width * 0.4, 0.055, depth * 0.96, materials.snow);
    snowStrip.position.set(side * width * 0.23, 0.7 + postHeight, 0);
    snowStrip.rotation.z = side * -0.5;
    roofRoot.add(snowStrip);
  });
  hut.add(roofRoot);
  const bench = box(width * 0.68, 0.12, 0.24, materials.timber);
  bench.position.set(centerX, 0.64, centerZ - 0.2);
  hut.add(bench);
  if (level === 3) {
    const hearth = createHearthguardPart('ISLAND_3_HEARTHGUARD_RECOVERY_HEARTH');
    const bowl = cylinder(0.18, 0.24, 0.16, materials.brass, 10);
    bowl.position.set(centerX, 0.64, centerZ + 0.18);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.28, 7), materials.windowGlow);
    flame.name = 'ISLAND_3_HEARTHGUARD_HEARTH_FLAME';
    flame.position.set(centerX, 0.84, centerZ + 0.18);
    hearth.add(bowl, flame);
    addLantern(hearth, centerX, 1.12, centerZ - depth / 2 + 0.08, materials, 0.6);
    hut.add(hearth);
    const service = createHearthguardPart('ISLAND_3_HEARTHGUARD_REAR_SERVICE_DRESSING');
    const chimney = box(0.2, 0.88, 0.22, materials.frostRockDark);
    chimney.position.set(centerX + width * 0.32, 1.23, centerZ - depth * 0.36);
    const chimneyCap = box(0.29, 0.1, 0.3, materials.indigoLight);
    chimneyCap.position.set(chimney.position.x, 1.69, chimney.position.z);
    service.add(chimney, chimneyCap);
    for (let index = 0; index < 4; index += 1) {
      const log = cylinder(0.055, 0.055, 0.34, materials.timber, 7);
      log.position.set(centerX - 0.28 + index * 0.08, 0.6 + (index % 2) * 0.07, centerZ - depth * 0.64);
      log.rotation.z = Math.PI / 2;
      service.add(log);
    }
    const barrel = cylinder(0.13, 0.16, 0.34, materials.timber, 10);
    barrel.position.set(centerX + 0.28, 0.64, centerZ - depth * 0.68);
    service.add(barrel);
    hut.add(service);
  }
  group.add(hut);
}

function createHearthguardYard(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island3FrostmoonMaterials) {
  const group = new THREE.Group();
  group.name = `ISLAND_3_HEARTHGUARD_YARD_L${level}`;
  group.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    representativeSlice: 'hearthguard-yard-l3-v002',
    parts: ['court-surface', 'front-gate', 'feather-crown', 'perimeter-system', 'climbing-frame', 'shield-target-system', 'recovery-hut', 'recovery-hearth', 'rear-service-dressing'],
  };
  addFoundation(group, 1.45, materials, quality);
  const court = createHearthguardPart('ISLAND_3_HEARTHGUARD_OPEN_COURT');
  const courtSurface = cylinder(1.32, 1.39, 0.09, level === 1 ? materials.frostRock : materials.snowShadow, quality === 'low' ? 12 : 20);
  courtSurface.scale.z = 0.86;
  courtSurface.position.y = 0.49;
  court.add(courtSurface);
  const openCourtInset = cylinder(level === 3 ? 1.08 : 0.94, level === 3 ? 1.12 : 0.98, 0.045, materials.snow, quality === 'low' ? 12 : 20);
  openCourtInset.scale.z = 0.82;
  openCourtInset.position.y = 0.555;
  court.add(openCourtInset);
  group.add(court);
  addHearthguardGate(group, level, quality, materials);
  addHearthguardPerimeter(group, level, quality, materials);
  addHearthguardShieldTargets(group, level, quality, materials);
  if (level >= 2) {
    const operationalLevel: 2 | 3 = level === 2 ? 2 : 3;
    addHearthguardClimbingFrame(group, operationalLevel, quality, materials);
    addHearthguardRecoveryHut(group, operationalLevel, quality, materials);
  }
  if (level === 3) {
    const civic = createHearthguardPart('ISLAND_3_HEARTHGUARD_BANNER_AND_LANTERNS');
    addBanner(civic, -1.06, 0.68, 0.22, 0, materials);
    group.add(civic);
  }
  return group;
}

function createMoonwellPart(name: string) {
  const part = new THREE.Group();
  part.name = name;
  part.userData.sculptPartId = name;
  part.userData.explodeWithParent = false;
  return part;
}

function addMoonwellArch(
  parent: THREE.Group,
  angle: number,
  height: number,
  quality: Island3DQuality,
  materials: Island3FrostmoonMaterials,
  cladInCopper: boolean,
) {
  const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
  const tangent = new THREE.Vector3(-direction.z, 0, direction.x);
  const start = direction.clone().multiplyScalar(-1.08).setY(0.53);
  const end = direction.clone().multiplyScalar(1.08).setY(0.53);
  const curve = new THREE.QuadraticBezierCurve3(start, new THREE.Vector3(0, height, 0), end);
  const rib = new THREE.Mesh(
    new THREE.TubeGeometry(curve, quality === 'high' ? 24 : 16, 0.09, quality === 'low' ? 5 : 7, false),
    materials.timberDark,
  );
  rib.name = 'ISLAND_3_MOONWELL_RADIAL_TIMBER_RIB';
  parent.add(rib);
  [-1, 1].forEach((side) => {
    const foot = box(0.24, 0.2, 0.24, materials.frostRock);
    foot.position.copy(side < 0 ? start : end).setY(0.51);
    foot.rotation.y = -angle;
    parent.add(foot);
  });
  if (!cladInCopper) return;
  const copperCurve = new THREE.QuadraticBezierCurve3(
    start.clone().addScaledVector(tangent, 0.055).setY(0.55),
    new THREE.Vector3(0, height + 0.025, 0).addScaledVector(tangent, 0.055),
    end.clone().addScaledVector(tangent, 0.055).setY(0.55),
  );
  const cladding = new THREE.Mesh(
    new THREE.TubeGeometry(copperCurve, quality === 'high' ? 24 : 16, 0.038, 6, false),
    materials.indigoLight,
  );
  cladding.name = 'ISLAND_3_MOONWELL_COPPER_RIB_PLATE';
  parent.add(cladding);
  const fastenerCount = quality === 'low' ? 3 : 5;
  for (let index = 1; index <= fastenerCount; index += 1) {
    const point = copperCurve.getPoint(index / (fastenerCount + 1));
    const fastener = new THREE.Mesh(new THREE.SphereGeometry(0.045, 7, 5), materials.brass);
    fastener.position.copy(point).addScaledVector(tangent, 0.025);
    parent.add(fastener);
  }
}

function createMoonwellObservatory(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island3FrostmoonMaterials) {
  const group = new THREE.Group();
  group.name = `ISLAND_3_MOONWELL_OBSERVATORY_L${level}`;
  group.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    representativeSlice: 'moonwell-basin-rib-armillary-axis-v001',
    parts: ['circular-foundation', 'moonwell-basin', 'ice-water-and-moon-disc', 'front-stair-and-entry', 'entry-lantern-system', 'radial-timber-frame', 'copper-rib-cladding', 'crown-hub-and-finial', 'armillary-primary-rings', 'armillary-axis-and-counterweights', 'brass-telescope-and-tripod', 'rear-chart-cabinet', 'rear-service-door', 'service-vent-and-tools'],
  };

  const foundation = createMoonwellPart('ISLAND_3_MOONWELL_CIRCULAR_FOUNDATION');
  addFoundation(foundation, 1.48, materials, quality);
  const jointCount = quality === 'low' ? 10 : 16;
  for (let index = 0; index < jointCount; index += 1) {
    const angle = index / jointCount * Math.PI * 2;
    const joint = box(0.035, 0.12, 0.22, materials.snowShadow);
    joint.position.set(Math.cos(angle) * 1.47, 0.29, Math.sin(angle) * 1.47);
    joint.rotation.y = -angle;
    foundation.add(joint);
  }
  group.add(foundation);

  const basin = createMoonwellPart('ISLAND_3_MOONWELL_BASIN');
  const basinBase = cylinder(0.86, 0.96, 0.23, materials.frostRockDark, segmentsFor(quality));
  basinBase.position.y = 0.48;
  const basinCurb = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.15, quality === 'low' ? 6 : 8, segmentsFor(quality)), materials.frostRock);
  basinCurb.position.y = 0.63;
  basinCurb.rotation.x = Math.PI / 2;
  const copperRim = new THREE.Mesh(new THREE.TorusGeometry(0.67, 0.035, 6, segmentsFor(quality)), materials.indigoLight);
  copperRim.name = 'ISLAND_3_MOONWELL_BASIN_COPPER_RIM';
  copperRim.position.y = 0.655;
  copperRim.rotation.x = Math.PI / 2;
  basin.add(basinBase, basinCurb, copperRim);
  group.add(basin);

  const water = createMoonwellPart('ISLAND_3_MOONWELL_ICE_WATER_AND_MOON_DISC');
  const iceWater = cylinder(0.63, 0.63, 0.035, materials.ice, segmentsFor(quality));
  iceWater.name = 'ISLAND_3_MOONWELL_ICE_WATER';
  iceWater.position.y = 0.65;
  const moonDisc = cylinder(level === 1 ? 0.23 : 0.3, level === 1 ? 0.23 : 0.3, 0.018, materials.ice, segmentsFor(quality));
  moonDisc.name = 'ISLAND_3_MOONWELL_MOON_DISC';
  moonDisc.position.set(0.05, 0.675, -0.04);
  water.add(iceWater, moonDisc);
  group.add(water);

  const entry = createMoonwellPart('ISLAND_3_MOONWELL_FRONT_STAIR_AND_ENTRY');
  const stairCount = level === 1 ? 2 : 3;
  for (let index = 0; index < stairCount; index += 1) {
    const step = box(0.9 + index * 0.18, 0.12, 0.32, index === 0 ? materials.frostRockDark : materials.frostRock);
    step.position.set(0, 0.31 + index * 0.065, 1.33 - index * 0.22);
    entry.add(step);
  }
  if (level === 3) {
    [-1, 1].forEach((side) => {
      const cheek = box(0.08, 0.25, 0.72, materials.indigoLight);
      cheek.position.set(side * 0.56, 0.42, 1.12);
      cheek.rotation.x = -0.15;
      entry.add(cheek);
    });
  }
  group.add(entry);

  if (level >= 2) {
    const frame = createMoonwellPart('ISLAND_3_MOONWELL_RADIAL_TIMBER_FRAME');
    const ribAngles = level === 2 ? [0, Math.PI / 2] : [0, Math.PI / 3, Math.PI * 2 / 3];
    ribAngles.forEach((angle) => addMoonwellArch(frame, angle, level === 3 ? 2.18 : 1.82, quality, materials, false));
    group.add(frame);

    if (level === 3) {
      const cladding = createMoonwellPart('ISLAND_3_MOONWELL_COPPER_RIB_CLADDING');
      ribAngles.forEach((angle) => addMoonwellArch(cladding, angle, 2.18, quality, materials, true));
      cladding.children.filter((child) => child.name !== 'ISLAND_3_MOONWELL_COPPER_RIB_PLATE').forEach((child) => {
        if (child instanceof THREE.Mesh && child.material === materials.timberDark) child.visible = false;
        if (child instanceof THREE.Mesh && child.material === materials.frostRockDark) child.visible = false;
      });
      group.add(cladding);
    }

    const telescope = createMoonwellPart('ISLAND_3_MOONWELL_BRASS_TELESCOPE_AND_TRIPOD');
    const hinge = new THREE.Vector3(-0.82, 1.04, 0.12);
    const feet = [new THREE.Vector3(-1.13, 0.47, 0.36), new THREE.Vector3(-0.58, 0.47, 0.45), new THREE.Vector3(-0.78, 0.47, -0.3)];
    feet.forEach((foot) => addHearthguardBeam(telescope, hinge, foot, 0.035, materials.timberDark));
    const barrelStart = new THREE.Vector3(-1.08, 0.88, 0.25);
    const barrelEnd = new THREE.Vector3(-0.46, 1.48, -0.08);
    addHearthguardBeam(telescope, barrelStart, barrelEnd, 0.095, materials.brass, 'ISLAND_3_MOONWELL_TELESCOPE_BARREL');
    const hingeBoss = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 7), materials.indigoLight);
    hingeBoss.name = 'ISLAND_3_MOONWELL_TELESCOPE_HINGE';
    hingeBoss.position.copy(hinge);
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 7), materials.ice);
    lens.name = 'ISLAND_3_MOONWELL_TELESCOPE_LENS';
    lens.position.copy(barrelEnd);
    telescope.add(hingeBoss, lens);
    group.add(telescope);

    const chart = createMoonwellPart('ISLAND_3_MOONWELL_REAR_CHART_CABINET');
    const cabinet = box(0.58, level === 3 ? 0.58 : 0.48, 0.2, materials.timberDark);
    cabinet.position.set(0.72, level === 3 ? 0.74 : 0.69, -1.02);
    const chartPanel = box(0.43, level === 3 ? 0.34 : 0.28, 0.035, materials.paper);
    chartPanel.name = 'ISLAND_3_MOONWELL_CHART_PANEL';
    chartPanel.position.set(0.72, level === 3 ? 0.76 : 0.71, -0.91);
    chart.add(cabinet, chartPanel);
    const spokeCount = quality === 'low' ? 4 : 6;
    for (let index = 0; index < spokeCount; index += 1) {
      const angle = index / spokeCount * Math.PI * 2;
      const spoke = box(0.02, 0.2, 0.035, materials.brass);
      spoke.position.set(0.72 + Math.cos(angle) * 0.1, chartPanel.position.y + Math.sin(angle) * 0.075, -0.88);
      spoke.rotation.z = -angle;
      chart.add(spoke);
    }
    group.add(chart);
  }

  if (level === 3) {
    const crown = createMoonwellPart('ISLAND_3_MOONWELL_CROWN_HUB_AND_FINIAL');
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 7), materials.indigoLight);
    hub.position.y = 2.13;
    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.38, 8), materials.brass);
    finial.position.y = 2.38;
    crown.add(hub, finial);
    group.add(crown);

    const rings = createMoonwellPart('ISLAND_3_MOONWELL_ARMILLARY_PRIMARY_RINGS');
    rings.position.set(0.08, 1.42, 0.02);
    const ringSpecs: Array<[number, number, number, number]> = [
      [0.49, 0.54, 0.12, -0.34],
      [0.39, 1.02, 0.48, 0.16],
      [0.29, 0.28, 1.12, 0.58],
    ];
    ringSpecs.forEach(([radius, x, y, z], index) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, index === 0 ? 0.045 : 0.033, 7, quality === 'low' ? 18 : 28), index === 1 ? materials.indigoLight : materials.brass);
      ring.name = `ISLAND_3_MOONWELL_ARMILLARY_RING_${index + 1}`;
      ring.rotation.set(x, y, z);
      rings.add(ring);
    });
    group.add(rings);

    const axis = createMoonwellPart('ISLAND_3_MOONWELL_ARMILLARY_AXIS_AND_COUNTERWEIGHTS');
    const axisStart = new THREE.Vector3(-0.36, 0.95, 0.28);
    const axisEnd = new THREE.Vector3(0.5, 1.9, -0.24);
    addHearthguardBeam(axis, axisStart, axisEnd, 0.04, materials.brass, 'ISLAND_3_MOONWELL_ARMILLARY_SPINDLE');
    [axisStart, axisEnd].forEach((point, index) => {
      const collar = new THREE.Mesh(new THREE.SphereGeometry(index ? 0.1 : 0.12, 9, 6), materials.indigoLight);
      collar.name = `ISLAND_3_MOONWELL_COUNTERWEIGHT_${index + 1}`;
      collar.position.copy(point);
      axis.add(collar);
    });
    group.add(axis);

    const lanterns = createMoonwellPart('ISLAND_3_MOONWELL_ENTRY_LANTERN_SYSTEM');
    [-1, 1].forEach((side) => addLantern(lanterns, side * 0.7, 0.96, 1.28, materials, 1.02));
    if (quality !== 'low') {
      const entryGlow = new THREE.PointLight(0xffa34c, quality === 'high' ? 1.15 : 0.78, 2.65, 1.8);
      entryGlow.name = 'ISLAND_3_MOONWELL_ENTRY_WARM_LIGHT';
      entryGlow.position.set(0, 1.02, 1.15);
      lanterns.add(entryGlow);
    }
    group.add(lanterns);

    const serviceDoor = createMoonwellPart('ISLAND_3_MOONWELL_REAR_SERVICE_DOOR');
    const door = box(0.42, 0.48, 0.11, materials.timber);
    door.position.set(-0.58, 0.68, -1.08);
    serviceDoor.add(door);
    [-1, 1].forEach((direction) => {
      const brace = box(0.05, 0.42, 0.14, materials.indigoLight);
      brace.position.set(-0.58 + direction * 0.09, 0.68, -1.02);
      brace.rotation.z = direction * 0.52;
      serviceDoor.add(brace);
    });
    const latch = box(0.2, 0.055, 0.16, materials.brass);
    latch.position.set(-0.47, 0.68, -1);
    serviceDoor.add(latch);
    group.add(serviceDoor);

    const service = createMoonwellPart('ISLAND_3_MOONWELL_SERVICE_VENT_AND_TOOLS');
    const vent = cylinder(0.095, 0.12, 0.55, materials.indigoLight, 8);
    vent.position.set(0.98, 0.83, -0.88);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.16, 8), materials.snow);
    cap.position.set(0.98, 1.18, -0.88);
    const shelf = box(0.5, 0.08, 0.24, materials.timber);
    shelf.position.set(0.55, 0.49, -1.16);
    service.add(vent, cap, shelf);
    [-1, 1].forEach((side) => addHearthguardBeam(service, new THREE.Vector3(0.55 + side * 0.15, 0.51, -1.17), new THREE.Vector3(0.55 + side * 0.06, 0.87, -1.17), 0.025, materials.brass));
    group.add(service);
  }
  return group;
}

function createFrostfirePart(name: string) {
  const part = new THREE.Group();
  part.name = name;
  part.userData.sculptPartId = name;
  part.userData.explodeWithParent = false;
  return part;
}

function addFrostfireWindow(
  parent: THREE.Group,
  name: string,
  x: number,
  y: number,
  z: number,
  rotationY: number,
  materials: Island3FrostmoonMaterials,
  scale = 1,
) {
  const windowRoot = createFrostfirePart(name);
  windowRoot.position.set(x, y, z);
  windowRoot.rotation.y = rotationY;
  const recess = box(0.4 * scale, 0.56 * scale, 0.07, materials.timberDark);
  const glow = box(0.31 * scale, 0.45 * scale, 0.085, materials.windowGlow);
  glow.position.z = 0.018;
  windowRoot.add(recess, glow);
  [-1, 1].forEach((direction) => {
    const muntin = box(0.035, 0.52 * scale, 0.105, materials.indigoLight);
    muntin.position.z = 0.04;
    muntin.rotation.z = direction * 0.52;
    windowRoot.add(muntin);
  });
  const sill = box(0.46 * scale, 0.075, 0.14, materials.frostRockDark);
  sill.position.set(0, -0.32 * scale, 0.04);
  windowRoot.add(sill);
  parent.add(windowRoot);
  return windowRoot;
}

function addFrostfireOpenBook(
  parent: THREE.Group,
  name: string,
  x: number,
  y: number,
  z: number,
  scale: number,
  materials: Island3FrostmoonMaterials,
  copper = false,
) {
  const root = createFrostfirePart(name);
  root.position.set(x, y, z);
  [-1, 1].forEach((side) => {
    if (copper) {
      const pageShape = new THREE.Shape();
      pageShape.moveTo(0, -0.18);
      pageShape.lineTo(side * 0.36, -0.1);
      pageShape.lineTo(side * 0.34, 0.2);
      pageShape.lineTo(side * 0.03, 0.12);
      pageShape.closePath();
      const page = new THREE.Mesh(new THREE.ExtrudeGeometry(pageShape, {
        depth: 0.07,
        bevelEnabled: true,
        bevelSize: 0.016,
        bevelThickness: 0.016,
        bevelSegments: 1,
      }), materials.brass);
      page.scale.setScalar(scale);
      page.geometry.translate(0, 0, -0.035);
      root.add(page);
    } else {
      const page = box(0.32 * scale, 0.34 * scale, 0.06 * scale, materials.paper);
      page.position.set(side * 0.15 * scale, 0, 0);
      page.rotation.z = side * -0.17;
      page.rotation.y = side * 0.07;
      root.add(page);
    }
    for (let index = 0; index < 3; index += 1) {
      const line = box(0.2 * scale, 0.018 * scale, 0.075 * scale, copper ? materials.indigoLight : materials.timber);
      line.position.set(side * 0.17 * scale, (-0.07 + index * 0.075) * scale, 0.045 * scale);
      line.rotation.z = side * (copper ? 0.11 : -0.17);
      root.add(line);
    }
  });
  const spine = box(0.055 * scale, 0.38 * scale, 0.09 * scale, materials.brass);
  spine.position.z = 0.035 * scale;
  root.add(spine);
  parent.add(root);
  return root;
}

function createFrostfireArchive(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island3FrostmoonMaterials) {
  const group = new THREE.Group();
  group.name = `ISLAND_3_FROSTFIRE_ARCHIVE_L${level}`;
  group.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    representativeSlice: 'frostfire-archive-l3-v001',
    parts: ['foundation', 'octagonal-shell', 'buttress-system', 'entry', 'reading-windows', 'reading-alcove', 'archive-shelves', 'radial-copper-roof', 'book-crest', 'frostfire-stack', 'rear-furnace', 'rear-document-chests', 'rear-tools-and-logs', 'roof-finish'],
    sockets: {
      doorHinge: 'ISLAND_3_FROSTFIRE_ARCHIVE_MAIN_DOOR',
      frostfireFx: 'ISLAND_3_FROSTFIRE_STACK_FLAME',
      furnaceFx: 'ISLAND_3_FROSTFIRE_REAR_FURNACE_GLOW',
    },
  };
  addFoundation(group, 1.42, materials, quality);

  const shellRadius = level === 1 ? 0.78 : level === 2 ? 0.88 : 0.96;
  const shellHeight = level === 1 ? 0.68 : level === 2 ? 0.84 : 0.98;
  const shellBaseY = 0.42;
  const shellTopY = shellBaseY + shellHeight;
  const shell = createFrostfirePart('ISLAND_3_FROSTFIRE_OCTAGONAL_STONE_AND_TIMBER_SHELL');
  const stoneCourse = cylinder(shellRadius + 0.04, shellRadius + 0.1, 0.38, materials.frostRockDark, 8);
  stoneCourse.position.y = shellBaseY + 0.19;
  stoneCourse.rotation.y = Math.PI / 8;
  const timberWall = cylinder(shellRadius, shellRadius + 0.035, shellHeight - 0.22, materials.timberDark, 8);
  timberWall.position.y = shellBaseY + 0.2 + (shellHeight - 0.22) / 2;
  timberWall.rotation.y = Math.PI / 8;
  const copperWallBand = cylinder(shellRadius + 0.025, shellRadius + 0.025, 0.075, materials.indigoLight, 8);
  copperWallBand.position.y = shellTopY - 0.08;
  copperWallBand.rotation.y = Math.PI / 8;
  shell.add(stoneCourse, timberWall, copperWallBand);
  group.add(shell);

  const buttresses = createFrostfirePart('ISLAND_3_FROSTFIRE_DARK_TIMBER_BUTTRESS_SYSTEM');
  const buttressCount = level === 1 ? 4 : 8;
  for (let index = 0; index < buttressCount; index += 1) {
    const angle = index / buttressCount * Math.PI * 2 + Math.PI / 8;
    const low = new THREE.Vector3(Math.cos(angle) * (shellRadius + 0.19), 0.48, Math.sin(angle) * (shellRadius + 0.19));
    const high = new THREE.Vector3(Math.cos(angle) * (shellRadius + 0.05), shellTopY - 0.04, Math.sin(angle) * (shellRadius + 0.05));
    addHearthguardBeam(buttresses, low, high, level === 3 ? 0.075 : 0.065, materials.timberDark);
    const foot = box(0.2, 0.24, 0.2, materials.frostRockDark);
    foot.position.copy(low);
    foot.position.y = 0.53;
    foot.rotation.y = -angle;
    const bracket = box(0.15, 0.07, 0.18, materials.indigoLight);
    bracket.position.copy(low).lerp(high, 0.58);
    bracket.rotation.y = -angle;
    buttresses.add(foot, bracket);
  }
  group.add(buttresses);

  const entry = createFrostfirePart('ISLAND_3_FROSTFIRE_FRONT_STAIR_AND_ARCHIVE_DOOR');
  const stepCount = level === 1 ? 2 : level === 2 ? 3 : 4;
  for (let index = 0; index < stepCount; index += 1) {
    const step = box(0.64 + index * 0.14, 0.1, 0.23, index % 2 ? materials.frostRock : materials.frostRockDark);
    step.position.set(0, 0.46 - index * 0.055, shellRadius + 0.13 + index * 0.13);
    entry.add(step);
  }
  const door = box(level === 3 ? 0.48 : 0.4, level === 3 ? 0.68 : 0.58, 0.1, materials.timber);
  door.name = 'ISLAND_3_FROSTFIRE_ARCHIVE_MAIN_DOOR';
  door.position.set(0, 0.78, shellRadius + 0.045);
  const doorFrame = new THREE.Mesh(new THREE.TorusGeometry(level === 3 ? 0.33 : 0.28, 0.055, 6, quality === 'high' ? 24 : 16), materials.indigoLight);
  doorFrame.position.set(0, 0.89, shellRadius + 0.1);
  doorFrame.scale.y = 1.12;
  entry.add(door, doorFrame);
  [-1, 1].forEach((side) => {
    const hinge = box(0.17, 0.045, 0.13, materials.brass);
    hinge.position.set(side * 0.14, 0.69 + (side + 1) * 0.08, shellRadius + 0.11);
    entry.add(hinge);
  });
  if (level >= 2) [-1, 1].forEach((side) => addLantern(entry, side * 0.38, 0.92, shellRadius + 0.14, materials, level === 3 ? 0.72 : 0.58));
  if (level === 3 && quality === 'high') {
    const entryLight = new THREE.PointLight(0xffa45c, 0.68, 2.25, 1.9);
    entryLight.name = 'ISLAND_3_FROSTFIRE_ARCHIVE_ENTRY_WARM_LIGHT';
    entryLight.position.set(0, 1.36, shellRadius + 0.64);
    entry.add(entryLight);
  }
  group.add(entry);

  const crestScale = level === 1 ? 0.75 : level === 2 ? 0.98 : 1.28;
  addFrostfireOpenBook(group, 'ISLAND_3_FROSTFIRE_OPEN_BOOK_CREST', 0, shellTopY + 0.11, shellRadius + 0.2, crestScale, materials, true);

  const roof = createFrostfirePart('ISLAND_3_FROSTFIRE_LOW_RADIAL_COPPER_ROOF');
  const roofHeight = level === 1 ? 0.3 : level === 2 ? 0.37 : 0.43;
  const roofBottomRadius = shellRadius + 0.2;
  const roofTopRadius = level === 1 ? 0.29 : level === 2 ? 0.34 : 0.39;
  const roofBody = new THREE.Mesh(new THREE.CylinderGeometry(roofTopRadius, roofBottomRadius, roofHeight, 8), materials.indigoLight);
  roofBody.name = 'ISLAND_3_FROSTFIRE_RADIAL_COPPER_ROOF_BODY';
  roofBody.position.y = shellTopY + roofHeight / 2 - 0.02;
  roofBody.rotation.y = Math.PI / 8;
  roof.add(roofBody);
  const eave = new THREE.Mesh(new THREE.TorusGeometry(roofBottomRadius * 0.88, 0.055, 6, 8), materials.timberDark);
  eave.rotation.x = Math.PI / 2;
  eave.rotation.z = Math.PI / 8;
  eave.position.y = shellTopY - 0.01;
  roof.add(eave);
  group.add(roof);

  if (level >= 2) {
    const windows = createFrostfirePart('ISLAND_3_FROSTFIRE_READING_WINDOW_SYSTEM');
    addFrostfireWindow(windows, 'ISLAND_3_FROSTFIRE_READING_WINDOW_LEFT', -shellRadius - 0.035, 0.89, 0.08, -Math.PI / 2, materials, level === 3 ? 1 : 0.82);
    addFrostfireWindow(windows, 'ISLAND_3_FROSTFIRE_READING_WINDOW_RIGHT', shellRadius + 0.035, 0.89, 0.08, Math.PI / 2, materials, level === 3 ? 1 : 0.82);
    group.add(windows);

    const alcove = createFrostfirePart('ISLAND_3_FROSTFIRE_EXTERIOR_READING_ALCOVE');
    const alcoveX = -0.78;
    const canopy = box(0.72, 0.1, 0.43, materials.indigoLight);
    canopy.position.set(alcoveX, level === 3 ? 1.33 : 1.2, shellRadius + 0.2);
    canopy.rotation.x = -0.08;
    alcove.add(canopy);
    [-1, 1].forEach((side) => {
      const post = box(0.075, level === 3 ? 0.76 : 0.61, 0.075, materials.timberDark);
      post.position.set(alcoveX + side * 0.32, level === 3 ? 0.88 : 0.81, shellRadius + 0.33);
      alcove.add(post);
    });
    const counter = box(0.7, 0.1, 0.28, materials.timber);
    counter.position.set(alcoveX, 0.61, shellRadius + 0.32);
    alcove.add(counter);
    group.add(alcove);

    const shelves = createFrostfirePart('ISLAND_3_FROSTFIRE_ARCHIVE_SHELVES_BOOKS_AND_CHARTS');
    const rows = level === 3 ? 3 : 2;
    const bookCount = quality === 'low' ? 4 : level === 3 ? 7 : 5;
    for (let row = 0; row < rows; row += 1) {
      const shelf = box(0.58, 0.055, 0.12, materials.timber);
      shelf.position.set(-0.78, 0.74 + row * 0.19, shellRadius + 0.18);
      shelves.add(shelf);
      for (let index = 0; index < bookCount; index += 1) {
        const book = box(0.055 + index % 2 * 0.018, 0.12 + (index + row) % 3 * 0.025, 0.08, (index + row) % 3 === 0 ? materials.banner : index % 2 ? materials.paper : materials.timber);
        book.position.set(-1.02 + index * (0.48 / Math.max(1, bookCount - 1)), 0.84 + row * 0.19, shellRadius + 0.24);
        book.rotation.z = index % 3 === 0 ? 0.08 : 0;
        shelves.add(book);
      }
    }
    if (level === 3) {
      addFrostfireOpenBook(shelves, 'ISLAND_3_FROSTFIRE_READING_DESK_OPEN_BOOK', -0.78, 0.69, shellRadius + 0.46, 0.58, materials);
      for (let index = 0; index < 3; index += 1) {
        const chart = cylinder(0.025, 0.025, 0.28, materials.paper, 6);
        chart.position.set(-0.98 + index * 0.1, 1.23, shellRadius + 0.22);
        chart.rotation.z = Math.PI / 2;
        shelves.add(chart);
      }
    }
    group.add(shelves);
  }

  const roofFinish = createFrostfirePart('ISLAND_3_FROSTFIRE_ROOF_RIBS_BRACKETS_SNOW_SEAMS_AND_ICICLES');
  const ribCount = level === 1 ? 4 : 8;
  for (let index = 0; index < ribCount; index += 1) {
    const angle = index / ribCount * Math.PI * 2 + Math.PI / 8;
    const start = new THREE.Vector3(Math.cos(angle) * (roofBottomRadius - 0.03), shellTopY + 0.04, Math.sin(angle) * (roofBottomRadius - 0.03));
    const end = new THREE.Vector3(Math.cos(angle) * roofTopRadius, shellTopY + roofHeight - 0.02, Math.sin(angle) * roofTopRadius);
    addHearthguardBeam(roofFinish, start, end, level === 3 ? 0.035 : 0.028, materials.brass);
    if (level === 3 && index % 2 === 0) {
      const snowStart = start.clone();
      const snowEnd = end.clone();
      snowStart.y += 0.055;
      snowEnd.y += 0.055;
      addHearthguardBeam(roofFinish, snowStart, snowEnd, 0.026, materials.snow);
    }
  }
  if (level === 3) addIcicles(roofFinish, 1.36, shellTopY - 0.03, roofBottomRadius * 0.78, materials, quality);
  group.add(roofFinish);

  const stack = createFrostfirePart(level === 3 ? 'ISLAND_3_FROSTFIRE_OPEN_LANTERN_STACK' : 'ISLAND_3_FROSTFIRE_CAPPED_CHIMNEY');
  const curbY = shellTopY + roofHeight - 0.01;
  const curb = cylinder(roofTopRadius * 0.9, roofTopRadius, 0.18, materials.indigoLight, 8);
  curb.position.y = curbY;
  stack.add(curb);
  if (level === 3) {
    const cageBottomY = curbY + 0.08;
    const cageTopY = cageBottomY + 0.54;
    for (let index = 0; index < 6; index += 1) {
      const angle = index / 6 * Math.PI * 2;
      const post = box(0.055, 0.54, 0.055, materials.timberDark);
      post.position.set(Math.cos(angle) * 0.25, cageBottomY + 0.27, Math.sin(angle) * 0.25);
      stack.add(post);
    }
    [cageBottomY, cageTopY].forEach((y) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.04, 6, 18), materials.brass);
      ring.position.y = y;
      ring.rotation.x = Math.PI / 2;
      stack.add(ring);
    });
    const flameRoot = createFrostfirePart('ISLAND_3_FROSTFIRE_STACK_FLAME');
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 7), materials.windowGlow);
    flame.position.y = cageBottomY + 0.26;
    const flameCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.105), materials.windowGlow);
    flameCore.position.y = cageBottomY + 0.19;
    flameRoot.add(flame, flameCore);
    const cap = cylinder(0.31, 0.31, 0.11, materials.indigoLight, 8);
    cap.position.y = cageTopY + 0.06;
    stack.add(flameRoot, cap);
    if (quality === 'high') {
      const light = new THREE.PointLight(0xffa348, 1.25, 3.1, 1.8);
      light.name = 'ISLAND_3_FROSTFIRE_STACK_WARM_LIGHT';
      light.position.y = cageBottomY + 0.28;
      stack.add(light);
    }
  } else {
    const chimney = cylinder(0.13, 0.17, level === 2 ? 0.42 : 0.28, materials.timberDark, 8);
    chimney.position.y = curbY + (level === 2 ? 0.26 : 0.19);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.16, 8), materials.indigoLight);
    cap.position.y = chimney.position.y + (level === 2 ? 0.28 : 0.21);
    stack.add(chimney, cap);
  }
  group.add(stack);

  if (level === 3) {
    const furnace = createFrostfirePart('ISLAND_3_FROSTFIRE_REAR_FURNACE_AND_CAPPED_FLUE');
    const furnaceBody = box(0.54, 0.55, 0.13, materials.frostRockDark);
    furnaceBody.position.set(0, 0.74, -shellRadius - 0.055);
    const furnaceGlow = box(0.28, 0.3, 0.15, materials.windowGlow);
    furnaceGlow.name = 'ISLAND_3_FROSTFIRE_REAR_FURNACE_GLOW';
    furnaceGlow.position.set(0, 0.73, -shellRadius - 0.13);
    const furnaceArch = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.045, 6, 20), materials.indigoLight);
    furnaceArch.position.set(0, 0.78, -shellRadius - 0.15);
    const flue = cylinder(0.075, 0.095, 0.72, materials.indigoLight, 8);
    flue.position.set(0.27, 1.39, -shellRadius + 0.02);
    const flueCap = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.13, 8), materials.snow);
    flueCap.position.set(0.27, 1.81, -shellRadius + 0.02);
    furnace.add(furnaceBody, furnaceGlow, furnaceArch, flue, flueCap);
    if (quality === 'high') {
      const light = new THREE.PointLight(0xff8a3c, 0.72, 1.8, 1.8);
      light.position.set(0, 0.74, -shellRadius - 0.38);
      furnace.add(light);
    }
    group.add(furnace);

    const chests = createFrostfirePart('ISLAND_3_FROSTFIRE_REAR_DOCUMENT_CHESTS');
    for (let index = 0; index < 2; index += 1) {
      const chest = box(0.44 - index * 0.05, 0.22, 0.28, materials.timber);
      chest.position.set(-0.62, 0.57 + index * 0.22, -shellRadius - 0.12);
      const strap = box(0.05, 0.24, 0.3, materials.brass);
      strap.position.set(-0.62, chest.position.y, -shellRadius - 0.13);
      chests.add(chest, strap);
    }
    const indexPlate = box(0.18, 0.07, 0.31, materials.brass);
    indexPlate.position.set(-0.62, 0.79, -shellRadius - 0.13);
    chests.add(indexPlate);
    group.add(chests);

    const service = createFrostfirePart('ISLAND_3_FROSTFIRE_REAR_TOOLS_AND_SPLIT_LOGS');
    for (let index = 0; index < 5; index += 1) {
      const log = cylinder(0.045, 0.055, 0.28, materials.timber, 7);
      log.position.set(0.58 + (index % 3) * 0.1, 0.54 + Math.floor(index / 3) * 0.09, -shellRadius - 0.14);
      log.rotation.z = Math.PI / 2;
      service.add(log);
    }
    [-1, 1].forEach((side) => {
      addHearthguardBeam(service, new THREE.Vector3(0.58 + side * 0.13, 0.52, -shellRadius - 0.17), new THREE.Vector3(0.48 + side * 0.13, 1.17, -shellRadius - 0.17), 0.022, materials.brass);
      const blade = box(0.14, 0.17, 0.045, materials.frostRock);
      blade.position.set(0.48 + side * 0.13, 0.48, -shellRadius - 0.17);
      blade.rotation.z = side * 0.12;
      service.add(blade);
    });
    group.add(service);
  }
  return group;
}

function createAuroraKeepPart(name: string) {
  const part = new THREE.Group();
  part.name = name;
  part.userData.sculptPartId = name;
  part.userData.explodeWithParent = false;
  return part;
}

function addAuroraKeepStoneCourses(
  group: THREE.Group,
  x: number,
  z: number,
  radius: number,
  baseY: number,
  height: number,
  materials: Island3FrostmoonMaterials,
  quality: Island3DQuality,
) {
  const courseCount = quality === 'high' ? 4 : quality === 'medium' ? 3 : 2;
  for (let index = 1; index < courseCount; index += 1) {
    const course = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 1.004, 0.014, 4, segmentsFor(quality)),
      materials.frostRock,
    );
    course.rotation.x = Math.PI / 2;
    course.position.set(x, baseY + height * index / courseCount, z);
    group.add(course);
  }
}

function addAuroraKeepTower(
  group: THREE.Group,
  name: string,
  x: number,
  z: number,
  baseY: number,
  scale: number,
  materials: Island3FrostmoonMaterials,
  quality: Island3DQuality,
  restored: boolean,
) {
  const part = createAuroraKeepPart(name);
  const radius = 0.4 * scale;
  const height = 1.12 * scale;
  const tower = cylinder(radius * 0.94, radius, height, materials.frostRockDark, segmentsFor(quality));
  tower.position.set(x, baseY + height / 2, z);
  const foot = cylinder(radius * 1.08, radius * 1.12, 0.12 * scale, materials.frostRock, segmentsFor(quality));
  foot.position.set(x, baseY + 0.06 * scale, z);
  const timberCrown = cylinder(radius * 1.03, radius * 1.03, 0.13 * scale, materials.timberDark, segmentsFor(quality));
  timberCrown.position.set(x, baseY + height - 0.06 * scale, z);
  part.add(tower, foot, timberCrown);
  addAuroraKeepStoneCourses(part, x, z, radius, baseY, height, materials, quality);
  addWindow(part, x, baseY + height * 0.56, z + radius + 0.018, 0, materials, 0.58 * scale);
  if (restored) {
    addWindow(part, x + radius + 0.018, baseY + height * 0.42, z, Math.PI / 2, materials, 0.45 * scale);
  }
  group.add(part);

  const roofPart = createAuroraKeepPart(`${name}_COPPER_CONICAL_ROOF`);
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(radius * 1.34, 0.62 * scale, segmentsFor(quality)),
    quality === 'high' ? materials.indigoLight : materials.indigo,
  );
  roof.position.set(x, baseY + height + 0.28 * scale, z);
  const snowCap = new THREE.Mesh(
    new THREE.ConeGeometry(radius * 1.03, 0.34 * scale, segmentsFor(quality)),
    materials.snow,
  );
  snowCap.position.set(x, baseY + height + 0.43 * scale, z);
  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.055 * scale, 0.16 * scale, 7), materials.brass);
  finial.position.set(x, baseY + height + 0.66 * scale, z);
  roofPart.add(roof, snowCap, finial);
  group.add(roofPart);
}

function addAuroraKeepRoofRibs(
  group: THREE.Group,
  width: number,
  height: number,
  depth: number,
  y: number,
  materials: Island3FrostmoonMaterials,
  quality: Island3DQuality,
) {
  const ribCount = quality === 'high' ? 5 : quality === 'medium' ? 4 : 3;
  const slopeAngle = Math.atan2(height, width / 2);
  const slopeLength = Math.hypot(width / 2, height) * 0.79;
  for (let index = 0; index < ribCount; index += 1) {
    const z = -depth * 0.42 + index / Math.max(1, ribCount - 1) * depth * 0.84;
    [-1, 1].forEach((side) => {
      const rib = box(slopeLength, 0.028, 0.035, materials.brass);
      rib.position.set(side * width * 0.24, y + height * 0.54 + 0.064, z);
      rib.rotation.z = side < 0 ? slopeAngle : -slopeAngle;
      group.add(rib);
    });
  }
}

function addAuroraKeepSignalRing(
  group: THREE.Group,
  name: string,
  y: number,
  z: number,
  scale: number,
  materials: Island3FrostmoonMaterials,
  quality: Island3DQuality,
) {
  const signal = createAuroraKeepPart(name);
  signal.position.set(0, y, z);
  signal.userData.presentationMotion = 'slow-mechanical-ring';
  signal.userData.phase = z * 2.4;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.21 * scale, 0.035 * scale, 6, quality === 'low' ? 16 : 26),
    materials.brass,
  );
  ring.name = `${name}_ROTATION_SOCKET`;
  const hub = cylinder(0.035 * scale, 0.035 * scale, 0.16 * scale, materials.brass, 7);
  hub.rotation.z = Math.PI / 2;
  const supportLeft = box(0.035 * scale, 0.42 * scale, 0.045 * scale, materials.timberDark);
  supportLeft.position.set(-0.105 * scale, -0.28 * scale, 0);
  const supportRight = supportLeft.clone();
  supportRight.position.x *= -1;
  const cradle = box(0.3 * scale, 0.05 * scale, 0.07 * scale, materials.indigo);
  cradle.position.y = -0.08 * scale;
  const warmNode = new THREE.Mesh(new THREE.SphereGeometry(0.035 * scale, 8, 6), materials.windowGlow);
  warmNode.position.y = 0.21 * scale;
  signal.add(ring, hub, supportLeft, supportRight, cradle, warmNode);
  group.add(signal);
}

function createAuroraKeep(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island3FrostmoonMaterials) {
  const group = new THREE.Group();
  group.name = `ISLAND_3_AURORA_KEEP_L${level}`;
  group.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    hierarchy: 'island-003-aurora-keep-l3',
    sockets: {
      mainDoor: 'ISLAND_3_AURORA_KEEP_HEAVY_MAIN_DOOR',
      shipmentPickup: 'ISLAND_3_AURORA_KEEP_FUTURE_SHIPMENT_PICKUP',
      ringMotion: 'ISLAND_3_AURORA_KEEP_SIGNAL_RING',
    },
  };

  const foundation = createAuroraKeepPart('ISLAND_3_AURORA_KEEP_RAISED_FROST_STONE_FOUNDATION');
  addFoundation(foundation, 1.86, materials, quality, 0.16);
  const entryApron = box(1.18, 0.16, 0.56, materials.frostRock);
  entryApron.position.set(0, 0.34, 1.48);
  foundation.add(entryApron);
  group.add(foundation);

  const hall = createAuroraKeepPart('ISLAND_3_AURORA_KEEP_CENTRAL_GREAT_HALL_SHELL');
  const upperHeight = level === 1 ? 0.76 : level === 2 ? 0.94 : 1.08;
  const stoneHall = box(1.78, 0.58, 1.18, materials.frostRockDark);
  stoneHall.position.y = 0.7;
  const plasterHall = box(1.62, upperHeight, 1.08, materials.paper);
  plasterHall.position.y = 0.99 + upperHeight / 2;
  hall.add(stoneHall, plasterHall);
  [-1, 1].forEach((side) => {
    const post = box(0.15, upperHeight + 0.68, 1.18, materials.timberDark);
    post.position.set(side * 0.76, 0.74 + upperHeight / 2, 0);
    hall.add(post);
  });
  const sill = box(1.68, 0.13, 1.16, materials.timberDark);
  sill.position.y = 1.03;
  const topBeam = box(1.82, 0.14, 1.17, materials.timberDark);
  topBeam.position.y = 0.99 + upperHeight - 0.05;
  hall.add(sill, topBeam);
  if (level === 3) {
    const rearTrussA = box(1.04, 0.085, 0.075, materials.timberDark);
    rearTrussA.position.set(0, 1.48, -0.575);
    rearTrussA.rotation.z = 0.48;
    const rearTrussB = rearTrussA.clone();
    rearTrussB.rotation.z = -0.48;
    const rearCentrePost = box(0.11, 0.72, 0.075, materials.timberDark);
    rearCentrePost.position.set(0, 1.45, -0.58);
    hall.add(rearTrussA, rearTrussB, rearCentrePost);
    addWindow(hall, -0.36, 1.38, -0.59, Math.PI, materials, 0.52);
    addWindow(hall, 0.36, 1.38, -0.59, Math.PI, materials, 0.52);
  }
  group.add(hall);

  const roof = createAuroraKeepPart('ISLAND_3_AURORA_KEEP_MAIN_SNOW_COPPER_GABLE_ROOF');
  const roofBaseY = 0.99 + upperHeight - 0.02;
  const roofHeight = level === 1 ? 0.7 : level === 2 ? 0.82 : 0.94;
  addGableRoof(roof, 2.14, roofHeight, 1.46, roofBaseY, materials, quality);
  if (level >= 2) addAuroraKeepRoofRibs(roof, 2.14, roofHeight, 1.46, roofBaseY, materials, quality);
  group.add(roof);

  const gatehouse = createAuroraKeepPart('ISLAND_3_AURORA_KEEP_FRONT_GATEHOUSE_AND_HEAVY_DOOR');
  const gateWall = box(level === 1 ? 0.74 : 0.84, 0.7, 0.62, materials.frostRockDark);
  gateWall.position.set(0, 0.77, 0.84);
  const door = box(level === 1 ? 0.38 : 0.44, 0.62, 0.08, materials.timberDark);
  door.name = 'ISLAND_3_AURORA_KEEP_HEAVY_MAIN_DOOR';
  door.position.set(0, 0.73, 1.185);
  const doorBand = box(level === 1 ? 0.42 : 0.48, 0.07, 0.09, materials.brass);
  doorBand.position.set(0, 0.74, 1.195);
  gatehouse.add(gateWall, door, doorBand);
  const gatehouseRoof = new THREE.Group();
  gatehouseRoof.position.z = 0.84;
  addGableRoof(gatehouseRoof, level === 1 ? 0.86 : 0.98, 0.42, 0.72, 1.08, materials, quality);
  gatehouse.add(gatehouseRoof);
  [-1, 1].forEach((side) => addLantern(gatehouse, side * 0.36, 0.88, 1.2, materials, 0.64));
  group.add(gatehouse);

  if (level >= 2) {
    const gallery = createAuroraKeepPart('ISLAND_3_AURORA_KEEP_UPPER_WATCH_GALLERY_AND_WINDOW_GRID');
    const galleryFloor = box(1.55, 0.12, 0.42, materials.timberDark);
    galleryFloor.position.set(0, 1.32, 0.73);
    gallery.add(galleryFloor);
    for (let index = -2; index <= 2; index += 1) {
      const x = index * 0.27;
      const pane = box(0.2, 0.34, 0.06, materials.windowGlow);
      pane.position.set(x, 1.58, 0.765);
      const mullion = box(0.045, 0.45, 0.08, materials.timberDark);
      mullion.position.set(x - 0.125, 1.57, 0.775);
      gallery.add(pane, mullion);
    }
    const galleryTop = box(1.58, 0.1, 0.12, materials.timberDark);
    galleryTop.position.set(0, 1.82, 0.77);
    gallery.add(galleryTop);
    [-1, 1].forEach((side) => {
      const brace = box(0.09, 0.5, 0.09, materials.timberDark);
      brace.position.set(side * 0.64, 1.28, 0.77);
      brace.rotation.z = side * 0.42;
      gallery.add(brace);
    });
    group.add(gallery);
  }

  const towerBaseY = 0.4;
  addAuroraKeepTower(
    group,
    'ISLAND_3_AURORA_KEEP_LEFT_ROUND_GUARD_TOWER',
    -1.03,
    0.54,
    towerBaseY,
    level === 1 ? 0.86 : 1,
    materials,
    quality,
    level === 3,
  );
  if (level >= 2) {
    addAuroraKeepTower(
      group,
      'ISLAND_3_AURORA_KEEP_RIGHT_ROUND_GUARD_TOWER',
      1.03,
      0.54,
      towerBaseY,
      1,
      materials,
      quality,
      level === 3,
    );
  }

  if (level >= 2) {
    [-1, 1].forEach((side) => {
      const wing = createAuroraKeepPart(side < 0
        ? 'ISLAND_3_AURORA_KEEP_LEFT_RESIDENTIAL_WING'
        : 'ISLAND_3_AURORA_KEEP_RIGHT_RESIDENTIAL_WING');
      wing.position.set(side * 1.36, 0, -0.2);
      const wingWall = box(0.86, level === 3 ? 0.86 : 0.72, 1.02, materials.paper);
      wingWall.position.y = 0.79;
      wing.add(wingWall);
      [-1, 1].forEach((postSide) => {
        const post = box(0.1, level === 3 ? 0.94 : 0.8, 1.06, materials.timberDark);
        post.position.set(postSide * 0.38, 0.79, 0);
        wing.add(post);
      });
      addGableRoof(wing, 1.05, level === 3 ? 0.52 : 0.44, 1.18, level === 3 ? 1.18 : 1.08, materials, quality);
      addWindow(wing, 0, 0.82, 0.53, 0, materials, 0.62);
      if (level === 3) addWindow(wing, side * 0.44, 0.82, 0, side * Math.PI / 2, materials, 0.5);
      group.add(wing);
    });
  }

  if (level === 3) {
    const rear = createAuroraKeepPart('ISLAND_3_AURORA_KEEP_REAR_SERVICE_WING_AND_LOADING_DOOR');
    const rearWall = box(1.02, 0.82, 0.72, materials.paper);
    rearWall.position.set(0, 0.78, -0.86);
    const rearBeam = box(1.1, 0.12, 0.78, materials.timberDark);
    rearBeam.position.set(0, 1.12, -0.86);
    const serviceDoor = box(0.4, 0.62, 0.08, materials.timberDark);
    serviceDoor.position.set(0, 0.72, -1.25);
    const serviceBraceA = box(0.34, 0.045, 0.09, materials.brass);
    serviceBraceA.position.set(0, 0.72, -1.3);
    serviceBraceA.rotation.z = 0.68;
    const serviceBraceB = serviceBraceA.clone();
    serviceBraceB.rotation.z = -0.68;
    rear.add(rearWall, rearBeam, serviceDoor, serviceBraceA, serviceBraceB);
    const rearRoof = new THREE.Group();
    rearRoof.position.z = -0.86;
    addGableRoof(rearRoof, 1.16, 0.48, 0.86, 1.12, materials, quality);
    rear.add(rearRoof);
    addWindow(rear, -0.36, 0.84, -1.26, Math.PI, materials, 0.5);
    group.add(rear);

    const chimneys = createAuroraKeepPart('ISLAND_3_AURORA_KEEP_CHIMNEYS_CAPS_AND_SMOKE_SOCKETS');
    [[-1.36, -0.46], [1.34, -0.42], [0.42, -1.02]].forEach(([x, z], index) => {
      const chimney = box(0.21, index === 2 ? 0.78 : 0.66, 0.22, materials.frostRockDark);
      chimney.position.set(x, index === 2 ? 1.62 : 1.5, z);
      const cap = box(0.3, 0.09, 0.31, materials.indigoLight);
      cap.position.set(x, chimney.position.y + (index === 2 ? 0.43 : 0.37), z);
      cap.name = `ISLAND_3_AURORA_KEEP_SMOKE_SOCKET_${index + 1}`;
      chimneys.add(chimney, cap);
    });
    group.add(chimneys);

    const roofFinish = createAuroraKeepPart('ISLAND_3_AURORA_KEEP_SNOW_LOAD_ICICLE_AND_ROOF_SEAM_SYSTEM');
    addIcicles(roofFinish, 1.5, 1.12, 1.23, materials, quality);
    group.add(roofFinish);

    const rearDressing = createAuroraKeepPart('ISLAND_3_AURORA_KEEP_REAR_CRATES_FIREWOOD_TOOLS_AND_GUARD_RACK');
    const shipmentSocket = new THREE.Group();
    shipmentSocket.name = 'ISLAND_3_AURORA_KEEP_FUTURE_SHIPMENT_PICKUP';
    shipmentSocket.position.set(0, 0.4, -1.4);
    rearDressing.add(shipmentSocket);
    [-0.48, -0.2, 0.2].forEach((x, index) => {
      const crate = box(0.25, 0.2, 0.24, materials.timber);
      crate.position.set(x, 0.5 + (index === 1 ? 0.18 : 0), -1.34);
      const strap = box(0.04, 0.21, 0.25, materials.brass);
      strap.position.copy(crate.position);
      rearDressing.add(crate, strap);
    });
    for (let index = 0; index < 5; index += 1) {
      const log = cylinder(0.04, 0.05, 0.26, materials.timber, 7);
      log.position.set(0.48 + index % 2 * 0.09, 0.48 + Math.floor(index / 2) * 0.08, -1.28);
      log.rotation.z = Math.PI / 2;
      rearDressing.add(log);
    }
    [-1, 1].forEach((side) => {
      const rack = box(0.035, 0.62, 0.035, materials.brass);
      rack.position.set(0.7 + side * 0.12, 0.76, -1.28);
      rearDressing.add(rack);
    });
    group.add(rearDressing);
  }

  if (level >= 2) {
    const rings = createAuroraKeepPart('ISLAND_3_AURORA_KEEP_RIDGE_RING_BEACON_SYSTEM');
    addAuroraKeepSignalRing(rings, 'ISLAND_3_AURORA_KEEP_SIGNAL_RING_1', roofBaseY + roofHeight + 0.33, -0.34, 1, materials, quality);
    if (level === 3) {
      addAuroraKeepSignalRing(rings, 'ISLAND_3_AURORA_KEEP_SIGNAL_RING_2', roofBaseY + roofHeight + 0.26, 0.42, 0.82, materials, quality);
    }
    group.add(rings);
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
    const scale = options.constructionPreview
      ? (definition.id === 'boss' ? 1.2 : 1.12)
      : definition.id === 'boss'
        ? (resolved === 3 ? 1.2 : resolved === 2 ? 1.1 : 1.03)
        : (resolved === 3 ? 1.12 : resolved === 2 ? 1.06 : 1);
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
    // Aurora Keep remains a named explodable hierarchy. The other landmarks
    // keep their compact material batches for phone draw-call control unless
    // construction preview needs their authored parts intact.
    if (!options.constructionPreview && definition.id !== 'boss') {
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

  const previewPhaseParam = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('island3Ambience')
    : null;
  const forcedPreviewPhase = previewPhaseParam === 'day'
    || previewPhaseParam === 'blizzard'
    || previewPhaseParam === 'dusk'
    || previewPhaseParam === 'night'
    ? previewPhaseParam
    : null;
  const hemisphere = scene.children.find((child): child is THREE.HemisphereLight => child instanceof THREE.HemisphereLight);
  const sunlight = scene.children.find((child): child is THREE.DirectionalLight => child instanceof THREE.DirectionalLight);
  const moonlight = new THREE.DirectionalLight(0x88a9e6, 0);
  moonlight.name = 'ISLAND_3_FROSTMOON_MOONLIGHT';
  moonlight.position.set(11, 14, -12);
  root.add(moonlight);

  const daySkyColor = new THREE.Color(0xc7d9ee);
  const stormSkyColor = new THREE.Color(0x777b83);
  const duskSkyColor = new THREE.Color(0x8d6270);
  const nightSkyColor = new THREE.Color(0x0a1c35);
  const dayFogColor = new THREE.Color(0xdbe5f3);
  const stormFogColor = new THREE.Color(0xaeb3bb);
  const duskFogColor = new THREE.Color(0x826c78);
  const nightFogColor = new THREE.Color(0x162c49);
  const nightHemisphereColor = new THREE.Color(0x7189b9);
  const nightGroundColor = new THREE.Color(0x121a28);
  const stormSunColor = new THREE.Color(0xe0d9d2);
  const duskSunColor = new THREE.Color(0xffaa72);
  const nightSunColor = new THREE.Color(0x7895ca);
  const stormOceanColor = new THREE.Color(0x667985);
  const nightOceanColor = new THREE.Color(0x132c49);
  const skyScratch = new THREE.Color();
  const fogScratch = new THREE.Color();

  const starCount = quality === 'high' ? 96 : quality === 'medium' ? 58 : 28;
  const starPositions = new Float32Array(starCount * 3);
  for (let index = 0; index < starCount; index += 1) {
    const angle = index * 2.399963;
    const radius = 28 + index % 5 * 1.8;
    starPositions[index * 3] = Math.cos(angle) * radius;
    starPositions[index * 3 + 1] = 9 + (index % 17) * 0.82;
    starPositions[index * 3 + 2] = -20 - Math.abs(Math.sin(angle)) * 10;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMaterial = new THREE.PointsMaterial({
    color: 0xe8f1ff,
    size: quality === 'low' ? 0.12 : 0.09,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  stars.name = 'ISLAND_3_STARRY_NIGHT_SKY';
  root.add(stars);

  const moonMaterial = new THREE.MeshBasicMaterial({
    color: 0xe9f1ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
  });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1.18, quality === 'low' ? 10 : 18, 10), moonMaterial);
  moon.name = 'ISLAND_3_ORDINARY_WINTER_MOON';
  moon.position.set(-15, 18, -27);
  root.add(moon);

  const frostwellIceworks = createFrostwellIceworks(quality, materials);
  root.add(frostwellIceworks.root);
  const seafoodTrade = createFrostmoonSeafoodTrade(quality, materials);
  root.add(seafoodTrade.root);

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
  const snowSeedPositions = snowPositions.slice();
  const snowGeometry = new THREE.BufferGeometry();
  snowGeometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
  const snowMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: quality === 'low' ? 0.08 : 0.065, transparent: true, opacity: 0.12, depthWrite: false });
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
      puff.userData.baseX = puff.position.x;
      puff.userData.baseY = puff.position.y;
      puff.userData.phase = sourceIndex * 1.4 + index * 0.5;
      root.add(puff);
      smokePuffs.push(puff);
    }
  });

  // Place the light just outside each inward-facing facade so it reads as
  // contained window/door spill instead of an invisible bulb inside solid wall
  // geometry. The central Keep faces the overview camera along positive Z.
  const hearthLightSources: Array<[number, number]> = [
    [0, 1.48],
    ...satellites.map(([x, z]): [number, number] => [x * 0.82, z * 0.82]),
  ];
  const hearthLightCount = quality === 'high' ? hearthLightSources.length : quality === 'medium' ? 3 : 2;
  const hearthLights = hearthLightSources.slice(0, hearthLightCount).map(([x, z], index) => {
    const light = new THREE.PointLight(0xff9b45, 0, quality === 'high' ? 6.2 : 4.8, 1.62);
    light.name = `ISLAND_3_CONTAINED_HEARTH_LIGHT_${index + 1}`;
    light.position.set(x, 1.42, z);
    root.add(light);
    return light;
  });

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
  const surfaceObjects = root.children.filter((child) => child !== frostwellIceworks.root);
  const surfaceVisibility = new Map(surfaceObjects.map((child) => [child, child.visible]));
  const surroundingSceneVisibility = new Map<THREE.Object3D, boolean>();
  const waterVisibility = ocean.visible;
  let signatureMissionCinematicActive = false;
  return {
    root,
    updateSignatureMission: (presentation) => {
      frostwellIceworks.setPresentation(presentation);
      // Canonical Frostwell completion is read-only here. The trade runtime
      // owns only the visual departure and never writes mission progress.
      seafoodTrade.setFishingActive(presentation.built);
    },
    getSignatureMissionCameraPose: frostwellIceworks.getCutawayCameraPose,
    setSignatureMissionCinematicActive: (active) => {
      frostwellIceworks.setInspectionActive(active);
      if (signatureMissionCinematicActive === active) return;
      signatureMissionCinematicActive = active;
      surfaceObjects.forEach((child) => {
        child.visible = active ? false : (surfaceVisibility.get(child) ?? true);
      });
      if (active) {
        scene.children.forEach((child) => {
          if (child === root || child instanceof THREE.Light) return;
          surroundingSceneVisibility.set(child, child.visible);
          child.visible = false;
        });
      } else {
        surroundingSceneVisibility.forEach((visible, child) => { child.visible = visible; });
        surroundingSceneVisibility.clear();
      }
      ocean.visible = active ? false : waterVisibility;
    },
    animate: (elapsed) => {
      frostwellIceworks.animate(elapsed);
      const ambience = resolveIsland3FrostmoonAmbienceState(elapsed, forcedPreviewPhase);
      seafoodTrade.animate(elapsed, ambience.blizzard);
      skyScratch.copy(daySkyColor)
        .lerp(stormSkyColor, ambience.blizzard)
        .lerp(duskSkyColor, ambience.dusk)
        .lerp(nightSkyColor, ambience.night);
      if (scene.background instanceof THREE.Color) scene.background.copy(skyScratch);
      if (scene.fog instanceof THREE.FogExp2) {
        fogScratch.copy(dayFogColor)
          .lerp(stormFogColor, ambience.blizzard)
          .lerp(duskFogColor, ambience.dusk)
          .lerp(nightFogColor, ambience.night);
        scene.fog.color.copy(fogScratch);
        scene.fog.density = 0.0068 + ambience.blizzard * 0.011 + ambience.night * 0.0012;
      }
      if (hemisphere) {
        hemisphere.color.copy(daySkyColor)
          .lerp(stormSkyColor, ambience.blizzard * 0.78)
          .lerp(nightHemisphereColor, ambience.night);
        hemisphere.groundColor.set(0x47546e).lerp(nightGroundColor, ambience.night);
        hemisphere.intensity = THREE.MathUtils.lerp(1.55, 0.94, ambience.night)
          * THREE.MathUtils.lerp(1, 0.72, ambience.blizzard);
      }
      if (sunlight) {
        sunlight.color.set(0xffe5c4)
          .lerp(stormSunColor, ambience.blizzard)
          .lerp(duskSunColor, ambience.dusk)
          .lerp(nightSunColor, ambience.night);
        sunlight.intensity = THREE.MathUtils.lerp(2.65, 0.42, ambience.night)
          * THREE.MathUtils.lerp(1, 0.48, ambience.blizzard);
        sunlight.position.set(
          THREE.MathUtils.lerp(-9, 7, Math.max(ambience.dusk, ambience.night)),
          THREE.MathUtils.lerp(15, 3.8, Math.max(ambience.dusk, ambience.night)),
          10,
        );
      }
      moonlight.intensity = ambience.night * 2.82 + ambience.dusk * 0.24;
      starMaterial.opacity = ambience.night * 0.86;
      moonMaterial.opacity = ambience.night * 0.96;
      materials.windowGlow.emissiveIntensity = THREE.MathUtils.lerp(0.42, 3.8, ambience.hearth);
      materials.brass.emissiveIntensity = THREE.MathUtils.lerp(0.08, 0.22, ambience.hearth);
      oceanMaterial.color.set(0x87cfe6)
        .lerp(stormOceanColor, ambience.blizzard)
        .lerp(nightOceanColor, ambience.night);
      hearthLights.forEach((light, index) => {
        light.intensity = ambience.hearth * (quality === 'high' ? 3.25 : 2.1)
          * (0.92 + Math.sin(elapsed * 2.4 + index * 1.7) * 0.08);
      });

      const positions = snowGeometry.getAttribute('position') as THREE.BufferAttribute;
      for (let index = 0; index < snowCount; index += 1) {
        const seedX = snowSeedPositions[index * 3];
        const seedY = snowSeedPositions[index * 3 + 1];
        const seedZ = snowSeedPositions[index * 3 + 2];
        const fallDistance = elapsed * (0.16 + ambience.blizzard * 1.24 + index % 5 * 0.006);
        const y = 0.5 + ((seedY - 0.5 - fallDistance) % 8.2 + 8.2) % 8.2;
        positions.setY(index, y);
        positions.setX(index, seedX + Math.sin(elapsed * 0.72 + index) * (0.03 + ambience.blizzard * 0.42));
        positions.setZ(index, seedZ + Math.cos(elapsed * 0.42 + index * 0.7) * ambience.blizzard * 0.16);
      }
      positions.needsUpdate = true;
      snowMaterial.opacity = THREE.MathUtils.clamp(
        0.08 + ambience.blizzard * 0.67 + ambience.dusk * 0.08 + ambience.night * 0.05,
        0,
        0.96,
      );
      snowMaterial.size = (quality === 'low' ? 0.08 : 0.065) * (1 + ambience.blizzard * 0.75);
      smokePuffs.forEach((puff, index) => {
        puff.position.y = puff.userData.baseY + (elapsed * 0.11 + index * 0.1) % 1.2;
        puff.position.x = puff.userData.baseX
          + Math.sin(elapsed * 0.3 + puff.userData.phase) * (0.05 + ambience.blizzard * 0.12);
        const life = (elapsed * 0.11 + index * 0.1) % 1.2;
        puff.material.opacity = (0.04 + ambience.hearth * 0.34) * (1 - life / 1.2);
      });
      pines.forEach((pine) => {
        pine.rotation.z = Math.sin(elapsed * (0.35 + ambience.blizzard * 0.9) + pine.userData.phase)
          * (0.008 + ambience.blizzard * 0.038);
      });
      iceChannels.forEach((channel, index) => { channel.material.opacity = 0.7 + Math.sin(elapsed * 0.8 + channel.userData.phase + index) * 0.06; });
      frozenPools.forEach((pool, index) => {
        if (!Array.isArray(pool.material)) {
          pool.material.opacity = 0.7 + Math.sin(elapsed * 0.62 + pool.userData.phase + index) * 0.055;
        }
      });
      hares.forEach((hare, index) => {
        hare.visible = ambience.blizzard < 0.46;
        const angle = elapsed * (0.055 + index * 0.006) + hare.userData.phase;
        const radius = 5.7 + index % 2 * 0.24;
        hare.position.set(Math.cos(angle) * radius, 0.62 + Math.max(0, Math.sin(elapsed * 3.2 + index)) * 0.07, Math.sin(angle) * radius);
        hare.rotation.y = -angle;
      });
      ravens.forEach((raven, index) => {
        raven.visible = ambience.blizzard < 0.58 && ambience.night < 0.82;
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
