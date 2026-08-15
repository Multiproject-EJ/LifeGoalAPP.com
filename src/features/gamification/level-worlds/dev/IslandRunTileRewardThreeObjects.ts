import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { IslandTileMapEntry, IslandTileType } from '../services/islandBoardTileMap';
import type { Island3DQuality, Island5TileTransform } from './island5ThreePilotContract';
import { compactStaticGeometry } from './CrownCitadelThreeModel';

export interface IslandRunTileRewardThreeRuntime {
  root: THREE.Group;
  animate: (elapsed: number, tokenIndex: number) => void;
}

function compactRewardToVertexColorMesh(root: THREE.Group, material: THREE.MeshStandardMaterial, name: string) {
  root.updateMatrixWorld(true);
  const inverseRoot = root.matrixWorld.clone().invert();
  const geometries: THREE.BufferGeometry[] = [];
  const sourceGeometries: THREE.BufferGeometry[] = [];
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const clonedGeometry = child.geometry.clone();
    const geometry = clonedGeometry.index ? clonedGeometry.toNonIndexed() : clonedGeometry;
    if (geometry !== clonedGeometry) clonedGeometry.dispose();
    geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverseRoot, child.matrixWorld));
    for (const attributeName of Object.keys(geometry.attributes)) {
      if (attributeName !== 'position' && attributeName !== 'normal') geometry.deleteAttribute(attributeName);
    }
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    const meshMaterial = Array.isArray(child.material) ? child.material[0] : child.material;
    const color = 'color' in meshMaterial && meshMaterial.color instanceof THREE.Color
      ? meshMaterial.color
      : new THREE.Color(0xffffff);
    const colors = new Float32Array(geometry.getAttribute('position').count * 3);
    for (let index = 0; index < colors.length; index += 3) {
      colors[index] = color.r;
      colors[index + 1] = color.g;
      colors[index + 2] = color.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometries.push(geometry);
    sourceGeometries.push(child.geometry);
  });
  const merged = geometries.length ? mergeGeometries(geometries, false) : null;
  geometries.forEach((geometry) => geometry.dispose());
  if (!merged) return;
  sourceGeometries.forEach((geometry) => geometry.dispose());
  root.clear();
  const mesh = new THREE.Mesh(merged, material);
  mesh.name = name;
  root.add(mesh);
}

export type IslandRunTileRewardObjectKind =
  | 'golden_event_ticket'
  | 'essence_crystal'
  | 'universal_reward_token'
  | 'treasure_chest'
  | 'hazard_rift'
  | 'encounter_scroll'
  | 'caretaker_card'
  | 'build_rush_hammer'
  | 'traffic_beacon'
  | 'frostwell_drill'
  | 'rootheart_power_component'
  | 'active_landmark_door';

export function resolveIslandRunTileRewardObjectKind(
  entry: Pick<IslandTileMapEntry, 'tileType' | 'isActiveDoorCluster' | 'signatureMissionKind'>,
): IslandRunTileRewardObjectKind | null {
  if (entry.signatureMissionKind === 'frostwell_drill') return 'frostwell_drill';
  if (entry.signatureMissionKind === 'rootheart_power_component') return 'rootheart_power_component';
  if (entry.tileType === 'free_ticket') return 'golden_event_ticket';
  if (entry.tileType === 'currency') return 'essence_crystal';
  if (entry.tileType === 'micro') return 'universal_reward_token';
  if (entry.tileType === 'chest') return 'treasure_chest';
  if (entry.tileType === 'hazard') return 'hazard_rift';
  if (entry.tileType === 'encounter') return 'encounter_scroll';
  if (entry.tileType === 'card') return 'caretaker_card';
  if (entry.tileType === 'build_discount') return 'build_rush_hammer';
  if (entry.tileType === 'traffic_light') return 'traffic_beacon';
  if (entry.tileType === 'landmark_door' && entry.isActiveDoorCluster) return 'active_landmark_door';
  return null;
}

type RewardVisualEntry = {
  root: THREE.Group;
  tileIndex: number;
  tileType: IslandTileType;
  baseY: number;
  phase: number;
  baseScale: number;
  spinRate: number;
};

interface RewardMaterials {
  midnight: THREE.MeshPhysicalMaterial;
  gold: THREE.MeshPhysicalMaterial;
  goldGlow: THREE.MeshBasicMaterial;
  violet: THREE.MeshPhysicalMaterial;
  cyan: THREE.MeshPhysicalMaterial;
  amber: THREE.MeshStandardMaterial;
  parchment: THREE.MeshStandardMaterial;
  hazard: THREE.MeshPhysicalMaterial;
  green: THREE.MeshPhysicalMaterial;
}

const qualitySegments = (quality: Island3DQuality) => quality === 'high' ? 16 : quality === 'medium' ? 12 : 8;

function createMaterials(): RewardMaterials {
  return {
    midnight: new THREE.MeshPhysicalMaterial({
      color: 0x14183a,
      roughness: 0.3,
      metalness: 0.2,
      clearcoat: 0.7,
      clearcoatRoughness: 0.18,
      emissive: 0x111a55,
      emissiveIntensity: 0.48,
    }),
    gold: new THREE.MeshPhysicalMaterial({
      color: 0xffcf68,
      roughness: 0.2,
      metalness: 0.9,
      clearcoat: 0.55,
      clearcoatRoughness: 0.12,
      emissive: 0x9b4d0a,
      emissiveIntensity: 0.75,
    }),
    goldGlow: new THREE.MeshBasicMaterial({
      color: 0xffd97d,
      transparent: true,
      opacity: 0.46,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    violet: new THREE.MeshPhysicalMaterial({
      color: 0xaa63ff,
      roughness: 0.07,
      metalness: 0.04,
      clearcoat: 1,
      transmission: 0,
      transparent: true,
      opacity: 0.94,
      emissive: 0x6f25e8,
      emissiveIntensity: 1.7,
    }),
    cyan: new THREE.MeshPhysicalMaterial({
      color: 0x67e8ff,
      roughness: 0.06,
      metalness: 0.04,
      clearcoat: 1,
      transmission: 0,
      transparent: true,
      opacity: 0.94,
      emissive: 0x168bdc,
      emissiveIntensity: 1.65,
    }),
    amber: new THREE.MeshStandardMaterial({
      color: 0xffca63,
      roughness: 0.22,
      metalness: 0.1,
      emissive: 0xff7b13,
      emissiveIntensity: 1.35,
    }),
    parchment: new THREE.MeshStandardMaterial({ color: 0xf5dfad, roughness: 0.78, emissive: 0x5f3514, emissiveIntensity: 0.18 }),
    hazard: new THREE.MeshPhysicalMaterial({ color: 0xff4e77, roughness: 0.12, clearcoat: 0.8, emissive: 0xb4002f, emissiveIntensity: 1.35 }),
    green: new THREE.MeshPhysicalMaterial({ color: 0x58f4a6, roughness: 0.16, clearcoat: 0.78, emissive: 0x098a62, emissiveIntensity: 1.18 }),
  };
}

function createStarGeometry(outerRadius: number, innerRadius: number, depth: number) {
  const shape = new THREE.Shape();
  for (let point = 0; point < 10; point += 1) {
    const angle = -Math.PI / 2 + point / 10 * Math.PI * 2;
    const radius = point % 2 === 0 ? outerRadius : innerRadius;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (point === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 1, bevelSize: depth * 0.35, bevelThickness: depth * 0.25 });
  geometry.center();
  return geometry;
}

function createTicket(materials: RewardMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_RUN_TILE_OBJECT_GOLDEN_EVENT_TICKET';
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.28, 0.055, 2, 2, 1), materials.gold);
  const inset = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.065), materials.midnight);
  inset.position.z = 0.02;
  const star = new THREE.Mesh(createStarGeometry(0.09, 0.038, 0.025), materials.gold);
  star.position.z = 0.075;
  const notchGeometry = new THREE.TorusGeometry(0.072, 0.018, 5, qualitySegments(quality), Math.PI);
  [-1, 1].forEach((side) => {
    const notch = new THREE.Mesh(notchGeometry, materials.goldGlow);
    notch.position.x = side * 0.225;
    notch.rotation.z = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    notch.position.z = 0.05;
    root.add(notch);
  });
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.26, 0.34, qualitySegments(quality) * 2), materials.goldGlow);
  halo.position.z = -0.035;
  root.add(halo, body, inset, star);
  root.rotation.x = -0.14;
  return root;
}

function createEssenceCrystal(materials: RewardMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_RUN_TILE_OBJECT_ESSENCE';
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.17, quality === 'high' ? 1 : 0), materials.violet);
  core.scale.set(0.72, 1.35, 0.72);
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.018, 5, qualitySegments(quality) * 2), materials.gold);
  orbit.rotation.x = Math.PI / 2;
  orbit.rotation.z = 0.28;
  const halo = new THREE.Mesh(new THREE.CircleGeometry(0.26, qualitySegments(quality) * 2), materials.goldGlow.clone());
  (halo.material as THREE.MeshBasicMaterial).color.setHex(0x8e63ff);
  (halo.material as THREE.MeshBasicMaterial).opacity = 0.22;
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -0.16;
  root.add(core, orbit, halo);
  return root;
}

function createUniversalRewardToken(materials: RewardMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_RUN_TILE_OBJECT_UNIVERSAL_REWARD_TOKEN';
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.055, qualitySegments(quality) * 2), materials.cyan);
  coin.rotation.x = Math.PI / 2;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.022, 5, qualitySegments(quality) * 2), materials.gold);
  const star = new THREE.Mesh(createStarGeometry(0.1, 0.043, 0.026), materials.gold);
  star.position.z = 0.045;
  root.add(coin, rim, star);
  return root;
}

function createTreasureChest(materials: RewardMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_RUN_TILE_OBJECT_TREASURE_CHEST';
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.2, 0.28), materials.midnight);
  base.position.y = -0.06;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.38, qualitySegments(quality), 1, false, 0, Math.PI), materials.violet);
  lid.rotation.set(0, 0, Math.PI / 2);
  lid.position.y = 0.04;
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.34, 0.31), materials.gold);
  band.position.y = 0.02;
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.045), materials.amber);
  lock.position.set(0, -0.015, 0.165);
  root.add(base, lid, band, lock);
  return root;
}

function createHazardRift(materials: RewardMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_RUN_TILE_OBJECT_HAZARD_RIFT';
  const shardCount = quality === 'low' ? 3 : 5;
  for (let index = 0; index < shardCount; index += 1) {
    const angle = index / shardCount * Math.PI * 2;
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.07 + index % 2 * 0.025, 0.28 + index % 3 * 0.06, 5), materials.hazard);
    shard.position.set(Math.cos(angle) * 0.13, -0.02 + index % 2 * 0.04, Math.sin(angle) * 0.13);
    shard.rotation.z = -Math.cos(angle) * 0.34;
    shard.rotation.x = Math.sin(angle) * 0.34;
    root.add(shard);
  }
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.11, 0.27, qualitySegments(quality) * 2), materials.goldGlow.clone());
  (ring.material as THREE.MeshBasicMaterial).color.setHex(0xff335e);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.17;
  root.add(ring);
  return root;
}

function createEncounterScroll(materials: RewardMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_RUN_TILE_OBJECT_ENCOUNTER_SCROLL';
  const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.025), materials.parchment);
  const topRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.37, qualitySegments(quality)), materials.gold);
  const bottomRoll = topRoll.clone();
  topRoll.rotation.z = Math.PI / 2;
  bottomRoll.rotation.z = Math.PI / 2;
  topRoll.position.y = 0.14;
  bottomRoll.position.y = -0.14;
  const mark = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 5, qualitySegments(quality), Math.PI * 1.55), materials.violet);
  mark.position.z = 0.03;
  mark.rotation.z = -0.2;
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.022, 7, 5), materials.violet);
  dot.position.set(0.035, -0.08, 0.04);
  root.add(sheet, topRoll, bottomRoll, mark, dot);
  root.rotation.x = -0.2;
  return root;
}

function createCaretakerCard(materials: RewardMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_RUN_TILE_OBJECT_CARETAKER_CARD';
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.39, 0.035), materials.midnight);
  const frame = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.018, 5, qualitySegments(quality) * 2), materials.gold);
  frame.scale.y = 1.28;
  frame.position.z = 0.025;
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), materials.violet);
  gem.position.z = 0.07;
  root.add(card, frame, gem);
  root.rotation.x = -0.16;
  return root;
}

function createBuildRushHammer(materials: RewardMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_RUN_TILE_OBJECT_BUILD_RUSH';
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.36, qualitySegments(quality)), materials.gold);
  handle.rotation.z = -0.62;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.13), materials.green);
  head.position.set(-0.1, 0.14, 0);
  head.rotation.z = -0.62;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 5, qualitySegments(quality) * 2), materials.goldGlow.clone());
  (ring.material as THREE.MeshBasicMaterial).color.setHex(0x5dffb0);
  root.add(handle, head, ring);
  return root;
}

function createTrafficBeacon(materials: RewardMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_RUN_TILE_OBJECT_TRAFFIC_BEACON';
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.4, 0.14), materials.midnight);
  [materials.hazard, materials.amber, materials.green].forEach((material, index) => {
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.045, qualitySegments(quality), 7), material);
    light.position.set(0, 0.12 - index * 0.12, 0.08);
    root.add(light);
  });
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.045, 0.18), materials.gold);
  cap.position.y = 0.23;
  root.add(housing, cap);
  return root;
}

function createLandmarkDoorSigil(materials: RewardMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_RUN_TILE_OBJECT_ACTIVE_LANDMARK_DOOR';
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.035, 6, qualitySegments(quality) * 2, Math.PI), materials.gold);
  arch.rotation.z = 0;
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.24, 0.055), materials.gold);
  const right = left.clone();
  left.position.set(-0.19, -0.12, 0);
  right.position.set(0.19, -0.12, 0);
  const portal = new THREE.Mesh(new THREE.CircleGeometry(0.145, qualitySegments(quality) * 2), materials.violet);
  portal.scale.y = 1.28;
  portal.position.y = -0.08;
  portal.position.z = -0.025;
  root.add(portal, arch, left, right);
  return root;
}

function createFrostwellDrillMarker(materials: RewardMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_RUN_TILE_OBJECT_FROSTWELL_DRILL';
  const segments = qualitySegments(quality);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 6, segments), materials.cyan);
  halo.rotation.x = Math.PI / 2;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.34, 7), materials.gold);
  shaft.position.y = 0.04;
  const bit = new THREE.Mesh(new THREE.ConeGeometry(0.105, 0.24, 8), materials.gold);
  bit.position.y = -0.22;
  bit.rotation.z = Math.PI;
  const cross = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.045, 0.045), materials.midnight);
  cross.position.y = 0.18;
  root.add(halo, shaft, bit, cross);
  return root;
}

function createRootheartPowerComponent(materials: RewardMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_RUN_TILE_OBJECT_ROOTHEART_POWER_COMPONENT';
  const segments = qualitySegments(quality);
  const gear = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 6, segments), materials.gold);
  gear.rotation.x = Math.PI / 2;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.09, segments), materials.green);
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2;
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.09), materials.gold);
    tooth.position.set(Math.cos(angle) * 0.19, 0, Math.sin(angle) * 0.19);
    tooth.rotation.y = -angle;
    root.add(tooth);
  }
  const rootCoil = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.018, 5, segments * 2), materials.green);
  rootCoil.rotation.x = Math.PI / 2;
  rootCoil.position.y = -0.045;
  root.add(gear, hub, rootCoil);
  return root;
}

function createVisualForTile(entry: IslandTileMapEntry, materials: RewardMaterials, quality: Island3DQuality) {
  const kind = resolveIslandRunTileRewardObjectKind(entry);
  if (kind === 'frostwell_drill') return createFrostwellDrillMarker(materials, quality);
  if (kind === 'rootheart_power_component') return createRootheartPowerComponent(materials, quality);
  if (kind === 'golden_event_ticket') return createTicket(materials, quality);
  if (kind === 'essence_crystal') return createEssenceCrystal(materials, quality);
  if (kind === 'universal_reward_token') return createUniversalRewardToken(materials, quality);
  if (kind === 'treasure_chest') return createTreasureChest(materials, quality);
  if (kind === 'hazard_rift') return createHazardRift(materials, quality);
  if (kind === 'encounter_scroll') return createEncounterScroll(materials, quality);
  if (kind === 'caretaker_card') return createCaretakerCard(materials, quality);
  if (kind === 'build_rush_hammer') return createBuildRushHammer(materials, quality);
  if (kind === 'traffic_beacon') return createTrafficBeacon(materials, quality);
  if (kind === 'active_landmark_door') return createLandmarkDoorSigil(materials, quality);
  return null;
}

export function createIslandRunTileRewardThreeObjects(options: {
  tileMap: readonly IslandTileMapEntry[];
  tileTransforms: readonly Island5TileTransform[];
  quality: Island3DQuality;
  compactCollectibles?: boolean;
}): IslandRunTileRewardThreeRuntime {
  const root = new THREE.Group();
  root.name = 'ISLAND_RUN_CANONICAL_TILE_REWARD_OBJECTS';
  root.userData.sculptRuntime = {
    clickable: false,
    explodable: true,
    presentationOnly: true,
    authority: 'canonical-island-tile-map',
  };
  const materials = createMaterials();
  const compactCollectibleMaterial = options.compactCollectibles
    ? new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.28,
        metalness: 0.3,
        emissive: 0x14124a,
        emissiveIntensity: 0.34,
      })
    : null;
  const transformByIndex = new Map(options.tileTransforms.map((transform) => [transform.index, transform]));
  const entries: RewardVisualEntry[] = [];

  options.tileMap.forEach((tileEntry) => {
    const transform = transformByIndex.get(tileEntry.index);
    if (!transform) return;
    // Low mode keeps the important economy/special objects but omits common
    // reward-progress tokens so the visual tier is materially cheaper.
    if (options.quality === 'low' && tileEntry.tileType === 'micro') return;
    const visual = createVisualForTile(tileEntry, materials, options.quality);
    if (!visual) return;
    // Each collectible still owns its transform for bob, spin and occupancy
    // hiding, but repeated pieces inside it share one batch per material.
    // This is especially important for hazard shards, tickets and scrolls.
    if (compactCollectibleMaterial) {
      compactRewardToVertexColorMesh(visual, compactCollectibleMaterial, `ISLAND_RUN_TILE_REWARD_${tileEntry.index}`);
    } else {
      compactStaticGeometry(visual, `ISLAND_RUN_TILE_REWARD_${tileEntry.index}`);
    }
    const baseY = transform.position[1] + (tileEntry.tileType === 'hazard' ? 0.26 : 0.46);
    const baseScale = tileEntry.signatureMissionKind === 'frostwell_drill'
      ? 1.08
      : tileEntry.signatureMissionKind === 'rootheart_power_component'
        ? 1.04
      : tileEntry.tileType === 'free_ticket'
      ? 1.42
      : tileEntry.tileType === 'landmark_door'
        ? 0.86
        : tileEntry.tileType === 'traffic_light'
          ? 0.76
          : tileEntry.tileType === 'currency'
            ? 0.72
            : tileEntry.tileType === 'micro'
              ? 0.6
              : 0.7;
    visual.position.set(transform.position[0], baseY, transform.position[2]);
    visual.rotation.y = -transform.rotationYRad;
    visual.scale.setScalar(baseScale);
    visual.userData.tileIndex = tileEntry.index;
    visual.userData.tileType = tileEntry.tileType;
    visual.userData.presentationOnly = true;
    root.add(visual);
    entries.push({
      root: visual,
      tileIndex: tileEntry.index,
      tileType: tileEntry.tileType,
      baseY,
      phase: tileEntry.index * 0.71,
      baseScale,
      spinRate: tileEntry.tileType === 'free_ticket' ? 0.52 : tileEntry.tileType === 'currency' ? 0.68 : 0.34,
    });
  });

  if (compactCollectibleMaterial) {
    Object.values(materials).forEach((material) => material.dispose());
  }

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = options.quality === 'high';
    child.receiveShadow = false;
  });

  const update = (elapsed: number, tokenIndex: number) => {
    entries.forEach((entry) => {
      const occupied = entry.tileIndex === tokenIndex;
      const collectScale = occupied ? 0.08 : 1;
      const bob = entry.tileType === 'hazard' ? 0.025 : 0.055;
      entry.root.position.y = entry.baseY + Math.sin(elapsed * 1.55 + entry.phase) * bob;
      entry.root.rotation.y = -((transformByIndex.get(entry.tileIndex)?.rotationYRad) ?? 0) + elapsed * entry.spinRate;
      const pulse = 1 + Math.sin(elapsed * 2.1 + entry.phase) * (entry.tileType === 'free_ticket' ? 0.08 : 0.035);
      entry.root.scale.setScalar(entry.baseScale * collectScale * pulse);
    });
  };
  update(0, -1);

  return { root, animate: update };
}
