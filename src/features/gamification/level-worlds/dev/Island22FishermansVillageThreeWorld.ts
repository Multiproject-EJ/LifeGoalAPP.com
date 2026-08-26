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
import {
  createIsland22WaterDragonMission,
  type Island22WaterDragonCameraPose,
  type Island22WaterDragonPhase,
  type Island22WaterDragonPresentation,
} from './Island22WaterDragonMission';

export const ISLAND_22_FISHERMANS_VILLAGE_WORLD_NAME = "Fisherman's Village";
type BuildLevel = 0 | 1 | 2 | 3;

export const ISLAND_22_FISHERMANS_VILLAGE_LANDMARK_LABELS = {
  boss: 'Fisherfolk Guild Hall',
  hatchery: 'Net House Hatchery',
  habit: 'Boatwright Habit Yard',
  wisdom: 'Lantern Lighthouse Library',
  event: 'Round Lantern Tavern',
} as const;

// The pond surface sits at y=0.66. The shared board centres default to y=0.34,
// which submerged the real Spark36 blocks beneath the pond/terrace and made
// Fisherman's Village appear to have no playable board. Keep one authored
// presentation offset so tiles, rewards and the token rise together without
// changing any canonical x/z anchor or gameplay index.
export const ISLAND_22_BOARD_PRESENTATION_Y_OFFSET = 0.44;

export const ISLAND_22_ROUTE_CLEARANCE_INNER_RADIUS = ISLAND_3D_ROUTE_RADIUS
  - ISLAND_3D_TILE_RADIAL_DEPTH / 2 - 0.28;
export const ISLAND_22_ROUTE_CLEARANCE_OUTER_RADIUS = ISLAND_3D_ROUTE_RADIUS
  + ISLAND_3D_TILE_RADIAL_DEPTH / 2 + 0.28;

export function isIsland22RouteCorridorClear(x: number, z: number, footprintRadius = 0): boolean {
  const distance = Math.hypot(x, z);
  const footprint = Math.max(0, footprintRadius);
  return distance + footprint <= ISLAND_22_ROUTE_CLEARANCE_INNER_RADIUS
    || distance - footprint >= ISLAND_22_ROUTE_CLEARANCE_OUTER_RADIUS;
}

export interface Island22FishermansVillageMaterials {
  cliff: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
  cobble: THREE.MeshStandardMaterial;
  terrace: THREE.MeshStandardMaterial;
  plaster: THREE.MeshStandardMaterial;
  timber: THREE.MeshStandardMaterial;
  timberDark: THREE.MeshStandardMaterial;
  roof: THREE.MeshStandardMaterial;
  roofWarm: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  window: THREE.MeshStandardMaterial;
  pond: THREE.MeshPhysicalMaterial;
  ocean: THREE.MeshPhysicalMaterial;
  rope: THREE.MeshStandardMaterial;
  foliage: THREE.MeshStandardMaterial;
  foam: THREE.MeshBasicMaterial;
}

export interface Island22FishermansVillageRuntime {
  root: THREE.Group;
  animate: (elapsed: number) => void;
  updateView?: (cameraPosition: THREE.Vector3, cameraTarget?: THREE.Vector3) => void;
  updateWaterDragonMission: (presentation: Island22WaterDragonPresentation) => void;
  getWaterDragonMissionCameraPose: () => Island22WaterDragonCameraPose;
  getWaterDragonMissionPhase: () => Island22WaterDragonPhase;
}

export const ISLAND_22_GUILD_HALL_FORM = {
  sourceAuthority: 'island-022-fishermans-village-candidate-v004',
  frontAxis: '+z',
  footprint: { width: 4.92, depth: 3.37, heightL3: 4.92 },
  apron: { radiusTop: 2.12, radiusBottom: 2.22, depthScale: 0.76, height: 0.18 },
  occupiedShell: { width: 2.85, height: 1.62, depth: 1.94, centerY: 1.05 },
  mansard: {
    level1: [
      { y: 1.78, halfWidth: 1.62, halfDepth: 1.08 },
      { y: 2.04, halfWidth: 1.55, halfDepth: 1.03 },
      { y: 2.58, halfWidth: 1.08, halfDepth: 0.78 },
      { y: 2.92, halfWidth: 0.84, halfDepth: 0.62 },
    ],
    mature: [
      { y: 1.78, halfWidth: 1.72, halfDepth: 1.18 },
      { y: 2.1, halfWidth: 1.62, halfDepth: 1.11 },
      { y: 2.5, halfWidth: 1.4, halfDepth: 0.96 },
      { y: 3.05, halfWidth: 1.1, halfDepth: 0.77 },
      { y: 3.66, halfWidth: 0.77, halfDepth: 0.58 },
      { y: 4.02, halfWidth: 0.64, halfDepth: 0.5 },
    ],
  },
  frontGable: { width: 2.2, baseY: 1.18, peakRise: 1.74, depth: 0.28, frontZ: 1.12 },
  wing: { centerX: 1.62, width: 1.24, bodyHeight: 1.12, depth: 1.62 },
  crown: { deckY: 4.07, width: 1.42, depth: 1.08, finialTopY: 4.92 },
  cameraTarget: [0, 2.04, 0] as const,
  requiredViews: ['source-facing', 'orbit-left', 'orbit-right', 'rear', 'clay'] as const,
  approximation: 'Source-facing geometry is observed; rear/service continuity is secondary inference.',
} as const;

const qualitySegments = (quality: Island3DQuality) => quality === 'high' ? 20 : quality === 'medium' ? 16 : 12;
const qualityScale = (quality: Island3DQuality) => quality === 'high' ? 1 : quality === 'medium' ? 0.7 : 0.45;

function cylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  material: THREE.Material,
  segments = 14,
) {
  return new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
}

function box(width: number, height: number, depth: number, material: THREE.Material) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
}

function setShadow(root: THREE.Object3D, cast = true) {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    node.castShadow = cast;
    node.receiveShadow = true;
  });
}

function markPart(node: THREE.Object3D, partId: string, sockets: Record<string, string> = {}) {
  node.userData.partId = partId;
  node.userData.partKind = 'part';
  node.userData.sculptRuntime = {
    parts: [{ id: partId, name: partId, kind: 'part', nodeName: node.name, module: 'island-022-slice-01', triangles: 0 }],
    clickable: true,
    explodable: true,
    sockets,
    colliders: [{ id: `island-022-${partId}`, type: 'compound', isTrigger: true }],
    destructionGroups: [{ id: partId, breakable: false, partIds: [partId] }],
  };
}

export function createIsland22FishermansVillageMaterials(): Island22FishermansVillageMaterials {
  return {
    cliff: new THREE.MeshStandardMaterial({ color: 0x4f514a, roughness: 0.9, metalness: 0.02 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x7b6e59, roughness: 0.92, metalness: 0.01 }),
    cobble: new THREE.MeshStandardMaterial({ color: 0x91805e, roughness: 0.94, metalness: 0 }),
    terrace: new THREE.MeshStandardMaterial({ color: 0x6f7355, roughness: 0.86, metalness: 0.01 }),
    plaster: new THREE.MeshStandardMaterial({ color: 0xa6784e, roughness: 0.84, metalness: 0 }),
    timber: new THREE.MeshStandardMaterial({ color: 0x80502d, roughness: 0.68 }),
    timberDark: new THREE.MeshStandardMaterial({ color: 0x38261d, roughness: 0.76 }),
    roof: new THREE.MeshStandardMaterial({
      color: 0x526b78,
      roughness: 0.72,
      metalness: 0.035,
      emissive: 0x243846,
      emissiveIntensity: 0.34,
    }),
    roofWarm: new THREE.MeshStandardMaterial({ color: 0x694738, roughness: 0.74, metalness: 0.02 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xb46a31, roughness: 0.3, metalness: 0.72 }),
    window: new THREE.MeshStandardMaterial({
      color: 0xd98a32,
      roughness: 0.24,
      emissive: 0xff6418,
      emissiveIntensity: 0.88,
    }),
    pond: new THREE.MeshPhysicalMaterial({
      color: 0x087789,
      roughness: 0.16,
      metalness: 0.04,
      clearcoat: 0.72,
      clearcoatRoughness: 0.16,
      transparent: true,
      opacity: 0.92,
    }),
    ocean: new THREE.MeshPhysicalMaterial({
      color: 0x176f97,
      roughness: 0.18,
      metalness: 0.03,
      clearcoat: 0.64,
      clearcoatRoughness: 0.2,
      transparent: true,
      opacity: 0.9,
    }),
    rope: new THREE.MeshStandardMaterial({ color: 0xaa8659, roughness: 0.88 }),
    foliage: new THREE.MeshStandardMaterial({ color: 0x435e3c, roughness: 0.9 }),
    foam: new THREE.MeshBasicMaterial({ color: 0xd8f4ee, transparent: true, opacity: 0.42, depthWrite: false }),
  };
}

export function createIsland22FishermansVillageBackdrop() {
  return new THREE.Color(0x79bdd3);
}

function createRoof(width: number, depth: number, height: number, material: THREE.Material) {
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(width, depth) * 0.72, height, 4), material);
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = depth / Math.max(width, depth);
  return roof;
}

function createGabledRoof(
  width: number,
  depth: number,
  material: THREE.Material,
  ridgeMaterial: THREE.Material,
) {
  const root = new THREE.Group();
  const pitch = 0.58;
  const panelWidth = width * 0.64;
  [-1, 1].forEach((side) => {
    const panel = box(panelWidth, 0.14, depth * 1.14, material);
    panel.position.set(side * width * 0.24, width * 0.17, 0);
    panel.rotation.z = side * pitch;
    root.add(panel);
  });
  const ridge = cylinder(0.065, 0.065, depth * 1.2, ridgeMaterial, 8);
  ridge.rotation.x = Math.PI / 2;
  ridge.position.y = width * 0.36;
  root.add(ridge);
  return root;
}

type LoftedRectLevel = Readonly<{
  y: number;
  halfWidth: number;
  halfDepth: number;
}>;

function createLoftedRectGeometry(levels: readonly LoftedRectLevel[]) {
  const positions: number[] = [];
  const indices: number[] = [];
  levels.forEach(({ y, halfWidth, halfDepth }) => {
    positions.push(
      -halfWidth, y, -halfDepth,
      halfWidth, y, -halfDepth,
      halfWidth, y, halfDepth,
      -halfWidth, y, halfDepth,
    );
  });
  for (let ring = 0; ring < levels.length - 1; ring += 1) {
    const lower = ring * 4;
    const upper = lower + 4;
    for (let side = 0; side < 4; side += 1) {
      const next = (side + 1) % 4;
      indices.push(lower + side, lower + next, upper + next, lower + side, upper + next, upper + side);
    }
  }
  const top = (levels.length - 1) * 4;
  indices.push(0, 2, 1, 0, 3, 2, top, top + 1, top + 2, top, top + 2, top + 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createProfileExtrusion(
  profile: readonly (readonly [number, number])[],
  depth: number,
  material: THREE.Material,
  bevelSize = 0,
) {
  const shape = new THREE.Shape();
  profile.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevelSize > 0,
    bevelSegments: bevelSize > 0 ? 2 : 0,
    bevelSize,
    bevelThickness: bevelSize * 0.65,
    curveSegments: 3,
  });
  geometry.translate(0, 0, -depth / 2);
  return new THREE.Mesh(geometry, material);
}

function createBeamBetween(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  segments = 7,
) {
  const direction = end.clone().sub(start);
  const beam = cylinder(radius, radius, direction.length(), material, segments);
  beam.position.copy(start).add(end).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return beam;
}

function createArchedPanel(
  width: number,
  height: number,
  depth: number,
  panelMaterial: THREE.Material,
  frameMaterial: THREE.Material,
) {
  const root = new THREE.Group();
  const radius = width / 2;
  const springY = height - radius;
  const profile: Array<readonly [number, number]> = [[-radius, 0], [radius, 0], [radius, springY]];
  for (let step = 0; step <= 8; step += 1) {
    const angle = step * Math.PI / 8;
    profile.push([Math.cos(angle) * radius, springY + Math.sin(angle) * radius]);
  }
  profile.push([-radius, springY]);
  root.add(createProfileExtrusion(profile, depth, panelMaterial, 0.012));

  const left = box(0.07, springY, depth + 0.045, frameMaterial);
  left.position.set(-radius, springY / 2, 0);
  const right = left.clone();
  right.position.x = radius;
  const sill = box(width + 0.1, 0.07, depth + 0.045, frameMaterial);
  sill.position.y = 0;
  root.add(left, right, sill);
  for (let step = 0; step < 8; step += 1) {
    const a = Math.PI - step * Math.PI / 8;
    const b = Math.PI - (step + 1) * Math.PI / 8;
    const start = new THREE.Vector3(Math.cos(a) * radius, springY + Math.sin(a) * radius, 0);
    const end = new THREE.Vector3(Math.cos(b) * radius, springY + Math.sin(b) * radius, 0);
    root.add(createBeamBetween(start, end, 0.045, frameMaterial, 6));
  }
  return root;
}

function addSlateCourseRows(
  root: THREE.Group,
  quality: Island3DQuality,
  material: THREE.Material,
  accentMaterial: THREE.Material,
) {
  const rowCount = quality === 'high' ? 7 : quality === 'medium' ? 6 : 4;
  const tileCount = quality === 'high' ? 21 : quality === 'medium' ? 15 : 9;
  const rows = [
    { y: 2.08, halfWidth: 1.52, z: 1.14 },
    { y: 2.34, halfWidth: 1.43, z: 1.06 },
    { y: 2.62, halfWidth: 1.32, z: 0.98 },
    { y: 2.91, halfWidth: 1.18, z: 0.86 },
    { y: 3.2, halfWidth: 1, z: 0.72 },
    { y: 3.48, halfWidth: 0.83, z: 0.63 },
    { y: 3.73, halfWidth: 0.7, z: 0.55 },
  ].slice(0, rowCount);
  rows.forEach((row, rowIndex) => {
    const usableWidth = row.halfWidth * 2;
    const tileWidth = usableWidth / tileCount;
    for (let tileIndex = 0; tileIndex < tileCount; tileIndex += 1) {
      const offset = rowIndex % 2 === 0 ? 0 : tileWidth * 0.5;
      const x = -row.halfWidth + tileWidth * (tileIndex + 0.5) + offset;
      if (x > row.halfWidth - tileWidth * 0.18) continue;
      const cadence = (tileIndex * 7 + rowIndex * 5) % 5;
      const clearsFrontDormer = row.y >= 2.34 && row.y <= 3.48 && Math.abs(x) < 0.5;
      const tile = box(
        tileWidth * (cadence === 0 ? 0.82 : 0.94),
        cadence === 3 ? 0.105 : 0.082,
        0.028,
        (tileIndex + rowIndex * 3) % 19 === 0 ? accentMaterial : material,
      );
      tile.position.set(
        x,
        row.y + (cadence - 2) * 0.012,
        row.z + 0.03 + (cadence % 2) * 0.009,
      );
      tile.rotation.x = -0.1;
      tile.rotation.z = (cadence - 2) * 0.011;
      if (!clearsFrontDormer) root.add(tile);

      const rearTile = tile.clone();
      rearTile.position.z = -row.z - 0.03 - (cadence % 2) * 0.009;
      rearTile.rotation.x = 0.1;
      rearTile.rotation.z *= -1;
      root.add(rearTile);
    }
  });
}

function createRopeCoil(material: THREE.Material, quality: Island3DQuality) {
  const coil = new THREE.Group();
  const segments = Math.max(8, qualitySegments(quality));
  [0.16, 0.12, 0.08].forEach((radius, index) => {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.018, 5, segments), material);
    loop.position.z = index * 0.012;
    coil.add(loop);
  });
  return coil;
}

function createSlattedFishCrate(
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
) {
  const crate = new THREE.Group();
  const rail = 0.055;
  [-1, 1].forEach((xSide) => [-1, 1].forEach((zSide) => {
    const upright = box(rail, height, rail, material);
    upright.position.set(xSide * width * 0.43, height / 2, zSide * depth * 0.43);
    crate.add(upright);
  }));
  [0.12, 0.26].forEach((y) => {
    const front = box(width, rail, rail, material);
    front.position.set(0, y, depth / 2);
    const rear = front.clone();
    rear.position.z = -depth / 2;
    const left = box(rail, rail, depth, material);
    left.position.set(-width / 2, y, 0);
    const right = left.clone();
    right.position.x = width / 2;
    crate.add(front, rear, left, right);
  });
  const base = box(width * 0.9, rail, depth * 0.9, material);
  base.position.y = rail / 2;
  crate.add(base);
  return crate;
}

function createNetRack(
  material: THREE.Material,
  ropeMaterial: THREE.Material,
) {
  const rack = new THREE.Group();
  [-0.34, 0.34].forEach((x) => {
    const post = box(0.055, 0.72, 0.055, material);
    post.position.set(x, 0.36, 0);
    rack.add(post);
  });
  const crossbar = box(0.78, 0.055, 0.055, material);
  crossbar.position.y = 0.7;
  rack.add(crossbar);
  [-0.22, 0, 0.22].forEach((x) => {
    rack.add(createBeamBetween(
      new THREE.Vector3(x - 0.16, 0.08, 0.025),
      new THREE.Vector3(x + 0.16, 0.66, 0.025),
      0.011,
      ropeMaterial,
      5,
    ));
    rack.add(createBeamBetween(
      new THREE.Vector3(x + 0.16, 0.08, 0.035),
      new THREE.Vector3(x - 0.16, 0.66, 0.035),
      0.011,
      ropeMaterial,
      5,
    ));
  });
  return rack;
}

function createGuildHallPart(partId: string) {
  const part = new THREE.Group();
  part.name = `ISLAND_22_GUILD_HALL_${partId.split('-').join('_').toUpperCase()}`;
  markPart(part, `guild-hall-${partId}`);
  return part;
}

function addFacadeBeam(
  root: THREE.Group,
  start: readonly [number, number],
  end: readonly [number, number],
  z: number,
  material: THREE.Material,
  radius = 0.055,
) {
  root.add(createBeamBetween(
    new THREE.Vector3(start[0], start[1], z),
    new THREE.Vector3(end[0], end[1], z),
    radius,
    material,
  ));
}

function createAuthoredHarborHouse(
  name: string,
  width: number,
  depth: number,
  stories: 1 | 2,
  roofVariant: 'slate' | 'warm',
  materials: Island22FishermansVillageMaterials,
) {
  const root = new THREE.Group();
  root.name = name;
  const bodyHeight = stories === 2 ? 1.72 : 1.18;
  const body = box(width, bodyHeight, depth, materials.plaster);
  body.position.y = bodyHeight / 2;
  root.add(body);

  const roof = createGabledRoof(
    width * 1.12,
    depth,
    roofVariant === 'warm' ? materials.roofWarm : materials.roof,
    materials.brass,
  );
  roof.position.y = bodyHeight + 0.08;
  const roofWidth = width * 1.12;
  const roofMaterial = roofVariant === 'warm' ? materials.roofWarm : materials.roof;
  [-1, 1].forEach((side) => {
    for (let course = 0; course < 4; course += 1) {
      const strip = box(
        roofWidth * 0.2,
        0.035 + (course % 2) * 0.008,
        depth * 1.18,
        course === 3 ? materials.roofWarm : roofMaterial,
      );
      strip.position.set(
        side * roofWidth * (0.1 + course * 0.13),
        roofWidth * (0.34 - course * 0.075) + 0.018,
        0,
      );
      strip.rotation.z = side * 0.58;
      roof.add(strip);
    }
  });
  root.add(roof);

  // Layer real fascia over the gable silhouette. The former flat roof panels
  // had no readable edge hierarchy at phone scale and looked unfinished.
  [-1, 1].forEach((zSide) => {
    const z = zSide * depth * 0.59;
    const peakY = bodyHeight + roofWidth * 0.36 + 0.08;
    const eaveY = bodyHeight + 0.13;
    root.add(
      createBeamBetween(
        new THREE.Vector3(-roofWidth * 0.54, eaveY, z),
        new THREE.Vector3(0, peakY, z),
        0.045,
        materials.timberDark,
        6,
      ),
      createBeamBetween(
        new THREE.Vector3(0, peakY, z),
        new THREE.Vector3(roofWidth * 0.54, eaveY, z),
        0.045,
        materials.timberDark,
        6,
      ),
    );
  });

  const beamThickness = 0.1;
  [-0.42, 0.42].forEach((side) => {
    const upright = box(beamThickness, bodyHeight * 0.92, depth + 0.08, materials.timberDark);
    upright.position.set(side * width, bodyHeight * 0.5, 0);
    root.add(upright);
  });
  for (let floor = 0; floor < stories; floor += 1) {
    const beam = box(width * 1.04, beamThickness, depth + 0.09, materials.timberDark);
    beam.position.y = 0.18 + floor * 0.78;
    root.add(beam);
    [-0.28, 0.28].forEach((xFactor) => {
      const window = box(0.34, 0.38, 0.065, materials.window);
      const windowX = xFactor * width;
      const windowY = 0.58 + floor * 0.76;
      const windowZ = depth / 2 + 0.04;
      window.position.set(windowX, windowY, windowZ);
      root.add(window);
      const mullion = box(0.035, 0.42, 0.028, materials.timberDark);
      mullion.position.set(windowX, windowY, windowZ + 0.05);
      const transom = box(0.38, 0.035, 0.028, materials.timberDark);
      transom.position.set(windowX, windowY, windowZ + 0.052);
      root.add(mullion, transom);
    });
  }
  const door = createArchedPanel(0.48, 0.84, 0.095, materials.timberDark, materials.brass);
  door.position.set(0, 0.02, depth / 2 + 0.065);
  root.add(door);
  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), materials.brass);
  handle.position.set(0.13, 0.4, depth / 2 + 0.13);
  root.add(handle);
  const chimney = box(0.2, 0.82, 0.2, materials.stone);
  chimney.position.set(width * 0.28, bodyHeight + width * 0.44, -depth * 0.15);
  const chimneyCollar = box(0.29, 0.09, 0.29, materials.brass);
  chimneyCollar.position.set(chimney.position.x, chimney.position.y + 0.32, chimney.position.z);
  const chimneyCap = createRoof(0.34, 0.34, 0.16, materials.roofWarm);
  chimneyCap.position.set(chimney.position.x, chimney.position.y + 0.46, chimney.position.z);
  root.add(chimney, chimneyCollar, chimneyCap);

  const signBracket = box(0.46, 0.045, 0.045, materials.timberDark);
  signBracket.position.set(-width * 0.28, bodyHeight * 0.77, depth / 2 + 0.23);
  const signPost = box(0.04, 0.3, 0.04, materials.timberDark);
  signPost.position.set(-width * 0.47, bodyHeight * 0.64, depth / 2 + 0.23);
  const fishSign = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 5), materials.brass);
  fishSign.name = `${name}_HANGING_FISH_SIGN`;
  fishSign.scale.set(1.45, 0.62, 0.24);
  fishSign.position.set(-width * 0.47, bodyHeight * 0.48, depth / 2 + 0.23);
  const fishTail = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.18, 3), materials.brass);
  fishTail.rotation.z = -Math.PI / 2;
  fishTail.position.set(fishSign.position.x - 0.2, fishSign.position.y, fishSign.position.z);
  root.add(signBracket, signPost, fishSign, fishTail);
  setShadow(root);
  return root;
}

function addWindows(root: THREE.Group, material: THREE.Material, width: number, y: number, depth: number) {
  const front = box(width, 0.42, 0.06, material);
  front.position.set(0, y, depth / 2 + 0.031);
  front.name = `${root.name}_FRONT_WINDOW`;
  const rear = front.clone();
  rear.position.z = -depth / 2 - 0.031;
  rear.name = `${root.name}_REAR_WINDOW`;
  const left = box(0.06, 0.42, width, material);
  left.position.set(-depth / 2 - 0.031, y, 0);
  left.name = `${root.name}_LEFT_WINDOW`;
  const right = left.clone();
  right.position.x = depth / 2 + 0.031;
  right.name = `${root.name}_RIGHT_WINDOW`;
  root.add(front, rear, left, right);
}

function createLighthouse(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island22FishermansVillageMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_22_LIGHTHOUSE_LIBRARY';
  const towerHeight = 1.45 + level * 0.58;
  const tower = cylinder(0.5, 0.66, towerHeight, materials.cliff, qualitySegments(quality));
  tower.position.y = towerHeight / 2;
  root.add(tower);
  const annexHeight = 0.72 + level * 0.16;
  const annex = box(1.35, annexHeight, 1.1, materials.timber);
  annex.position.set(0.78, annexHeight / 2, 0.18);
  const annexRoof = createRoof(1.6, 1.25, 0.58, materials.roof);
  annexRoof.position.set(0.78, annexHeight + 0.18, 0.18);
  root.add(annex, annexRoof);
  if (level >= 2) {
    const gallery = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 6, qualitySegments(quality)), materials.brass);
    gallery.rotation.x = Math.PI / 2;
    gallery.position.y = towerHeight - 0.2;
    const lamp = cylinder(0.42, 0.42, 0.62, materials.window, qualitySegments(quality));
    lamp.position.y = towerHeight + 0.16;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.5, qualitySegments(quality)), materials.roof);
    cap.position.y = towerHeight + 0.72;
    root.add(gallery, lamp, cap);
  }
  if (level >= 3) {
    const beacon = new THREE.PointLight(0xffbf68, 2.2, 8, 2);
    beacon.position.y = towerHeight + 0.22;
    root.add(beacon);
  }
  addWindows(root, materials.window, 0.34, 0.8, 1.08);
  return root;
}

export function createIsland22FisherfolkGuildHall(
  level: 1 | 2 | 3,
  quality: Island3DQuality,
  materials: Island22FishermansVillageMaterials,
) {
  const form = ISLAND_22_GUILD_HALL_FORM;
  const root = new THREE.Group();
  root.name = 'ISLAND_22_FISHERFOLK_GUILD_HALL';

  const apron = createGuildHallPart('coastal-apron');
  const apronMesh = cylinder(form.apron.radiusTop, form.apron.radiusBottom, form.apron.height, materials.stone, qualitySegments(quality));
  apronMesh.scale.z = form.apron.depthScale;
  apronMesh.position.set(0, form.apron.height / 2, 0.12);
  apron.add(apronMesh);
  for (let step = 0; step < 3; step += 1) {
    const stair = box(1.05 + step * 0.28, 0.1, 0.3, materials.cobble);
    stair.position.set(0, 0.16 + step * 0.08, 1.42 - step * 0.22);
    apron.add(stair);
  }
  root.add(apron);

  const shell = createGuildHallPart('occupied-shell');
  const centralBody = box(form.occupiedShell.width, form.occupiedShell.height, form.occupiedShell.depth, materials.plaster);
  centralBody.position.y = form.occupiedShell.centerY;
  const lowerBand = box(3.04, 0.24, 2.08, materials.stone);
  lowerBand.position.y = 0.34;
  shell.add(centralBody, lowerBand);
  root.add(shell);

  const mansard = createGuildHallPart('central-mansard');
  const mansardLevels: LoftedRectLevel[] = level === 1
    ? form.mansard.level1.map((ring) => ({ ...ring }))
    : form.mansard.mature.map((ring) => ({ ...ring }));
  mansard.add(new THREE.Mesh(createLoftedRectGeometry(mansardLevels), materials.roof));
  const lowerRoofBand = box(3.58, 0.12, 2.36, materials.brass);
  lowerRoofBand.position.y = 1.82;
  mansard.add(lowerRoofBand);
  if (level >= 2) {
    [
      [[-1.62, 1.94, 1.13], [-0.64, 4.0, 0.5]],
      [[1.62, 1.94, 1.13], [0.64, 4.0, 0.5]],
      [[-1.62, 1.94, -1.13], [-0.64, 4.0, -0.5]],
      [[1.62, 1.94, -1.13], [0.64, 4.0, -0.5]],
    ].forEach(([start, end]) => mansard.add(createBeamBetween(
      new THREE.Vector3(start[0], start[1], start[2]),
      new THREE.Vector3(end[0], end[1], end[2]),
      0.045,
      materials.brass,
      6,
    )));
    [2.5, 3.08, 3.65].forEach((y, index) => {
      const band = box(2.58 - index * 0.56, 0.04, 0.055, materials.timberDark);
      band.position.set(0, y, 0.92 - index * 0.17);
      mansard.add(band);
      const rearBand = band.clone();
      rearBand.position.z *= -1;
      mansard.add(rearBand);

      const sideDepth = 1.68 - index * 0.31;
      [-1, 1].forEach((side) => {
        const sideBand = box(0.055, 0.04, sideDepth, materials.timberDark);
        sideBand.position.set(side * (1.37 - index * 0.25), y, 0);
        mansard.add(sideBand);
      });
    });
    addSlateCourseRows(mansard, quality, materials.roof, materials.roofWarm);
  }
  root.add(mansard);

  const frontGable = createGuildHallPart('front-gable');
  const frontGableBacking = createProfileExtrusion(
    [[-1.28, 0], [1.28, 0], [0.96, 0.68], [0, 1.96], [-0.96, 0.68]],
    0.22,
    materials.roofWarm,
    0.025,
  );
  frontGableBacking.position.set(0, 1.12, 1.04);
  frontGable.add(frontGableBacking);
  const frontGableMesh = createProfileExtrusion(
    [[-1.1, 0], [1.1, 0], [0.82, 0.58], [0, 1.74], [-0.82, 0.58]],
    0.28,
    materials.plaster,
    0.025,
  );
  frontGableMesh.position.set(0, form.frontGable.baseY, form.frontGable.frontZ);
  frontGable.add(frontGableMesh);
  addFacadeBeam(frontGable, [-1.08, 1.22], [0, 2.9], 1.285, materials.timberDark, 0.07);
  addFacadeBeam(frontGable, [1.08, 1.22], [0, 2.9], 1.285, materials.timberDark, 0.07);
  addFacadeBeam(frontGable, [-1.04, 1.24], [1.04, 1.24], 1.285, materials.timberDark, 0.065);
  root.add(frontGable);

  const entry = createGuildHallPart('entry-depth');
  const pointedEntryBacking = createProfileExtrusion(
    [[-0.76, 0], [0.76, 0], [0.62, 0.82], [0, 1.58], [-0.62, 0.82]],
    0.13,
    materials.stone,
    0.018,
  );
  pointedEntryBacking.position.set(0, 0.23, 1.29);
  entry.add(pointedEntryBacking);
  const portalSurround = createArchedPanel(0.84, 1.18, 0.16, materials.stone, materials.timberDark);
  portalSurround.position.set(0, 0.31, 1.365);
  entry.add(portalSurround);
  const door = createArchedPanel(0.58, 0.98, 0.18, materials.window, materials.timberDark);
  door.position.set(0, 0.34, 1.46);
  entry.add(door);
  const doorKick = box(0.51, 0.39, 0.075, materials.timberDark);
  doorKick.position.set(0, 0.55, 1.565);
  entry.add(doorKick);
  [-0.66, 0.66].forEach((x) => {
    const carvedPier = box(0.16, 1.22, 0.17, materials.stone);
    carvedPier.position.set(x, 0.84, 1.39);
    const pierCap = box(0.25, 0.12, 0.23, materials.brass);
    pierCap.position.set(x, 1.49, 1.4);
    entry.add(carvedPier, pierCap);
  });
  const canopy = createProfileExtrusion([[-0.58, 0], [0.58, 0], [0, 0.42]], 0.58, materials.roofWarm, 0.018);
  canopy.position.set(0, 1.55, 1.52);
  entry.add(canopy);
  root.add(entry);

  const windows = createGuildHallPart('window-apertures');
  [-0.83, 0.83].forEach((x) => {
    const window = createArchedPanel(0.38, 0.58, 0.1, materials.window, materials.timberDark);
    window.position.set(x, 0.88, 1.03);
    windows.add(window);
  });
  if (level >= 2) {
    const dormerSurround = createArchedPanel(0.88, 0.96, 0.12, materials.timberDark, materials.stone);
    dormerSurround.position.set(0, 2.48, 0.92);
    windows.add(dormerSurround);
    const dormerWindow = createArchedPanel(0.62, 0.74, 0.16, materials.window, materials.timberDark);
    dormerWindow.position.set(0, 2.59, 1.015);
    windows.add(dormerWindow);
    const dormerCanopy = createProfileExtrusion([[-0.48, 0], [0.48, 0], [0.14, 0.28], [0, 0.43], [-0.14, 0.28]], 0.34, materials.roofWarm, 0.012);
    dormerCanopy.position.set(0, 3.43, 0.96);
    windows.add(dormerCanopy);
    [-0.13, 0.13].forEach((x) => {
      const mullion = box(0.036, 0.5, 0.07, materials.timberDark);
      mullion.position.set(x, 2.87, 1.11);
      windows.add(mullion);
    });
    const dormerTransom = box(0.58, 0.038, 0.07, materials.timberDark);
    dormerTransom.position.set(0, 2.93, 1.11);
    windows.add(dormerTransom);
    [-0.23, 0, 0.23].forEach((x) => {
      windows.add(createBeamBetween(
        new THREE.Vector3(0, 3.05, 1.115),
        new THREE.Vector3(x, 3.3 - Math.abs(x) * 0.35, 1.115),
        0.018,
        materials.timberDark,
        5,
      ));
    });
  }

  const frontGableWindow = createArchedPanel(0.52, 0.68, 0.12, materials.window, materials.timberDark);
  frontGableWindow.position.set(0, 1.7, 1.43);
  windows.add(frontGableWindow);
  const frontGableCanopy = createProfileExtrusion([[-0.44, 0], [0.44, 0], [0, 0.32]], 0.3, materials.roofWarm, 0.01);
  frontGableCanopy.position.set(0, 2.38, 1.42);
  windows.add(frontGableCanopy);
  const frontGableMullion = box(0.034, 0.46, 0.06, materials.timberDark);
  frontGableMullion.position.set(0, 1.96, 1.52);
  windows.add(frontGableMullion);

  if (level >= 2) {
    const rearRoofDormer = createArchedPanel(0.5, 0.66, 0.12, materials.window, materials.timberDark);
    rearRoofDormer.rotation.y = Math.PI;
    rearRoofDormer.position.set(0.4, 2.63, -0.96);
    windows.add(rearRoofDormer);
    const rearDormerCanopy = createProfileExtrusion([[-0.42, 0], [0.42, 0], [0, 0.34]], 0.32, materials.roofWarm, 0.01);
    rearDormerCanopy.rotation.y = Math.PI;
    rearDormerCanopy.position.set(0.4, 3.27, -0.98);
    windows.add(rearDormerCanopy);
  }
  [-0.9, 0, 0.9].forEach((x) => {
    const rearWindow = createArchedPanel(0.34, 0.5, 0.08, materials.window, materials.timberDark);
    rearWindow.rotation.y = Math.PI;
    rearWindow.position.set(x, 0.88, -1.03);
    windows.add(rearWindow);
  });
  root.add(windows);

  if (level >= 2) {
    const wingRoofs = createGuildHallPart('swept-wing-roofs');
    [-1, 1].forEach((side) => {
      const wingBody = box(form.wing.width, form.wing.bodyHeight, form.wing.depth, materials.timber);
      wingBody.position.set(side * form.wing.centerX, 0.8, 0.03);
      shell.add(wingBody);
      const peakX = side < 0 ? 0.38 : -0.38;
      const wingProfile = [
        [-1.04, 0] as const,
        [-0.94, 0.18] as const,
        [peakX - 0.34, 0.92] as const,
        [peakX, 1.38] as const,
        [peakX + 0.3, 0.9] as const,
        [0.94, 0.18] as const,
        [1.04, 0] as const,
      ];
      const wingRoof = createProfileExtrusion(
        wingProfile,
        2.04,
        materials.roof,
        0.02,
      );
      wingRoof.position.set(side * form.wing.centerX, 1.25, 0.03);
      wingRoofs.add(wingRoof);

      [-1, 1].forEach((frontBack) => {
        const z = 0.03 + frontBack * 1.045;
        for (let pointIndex = 0; pointIndex < wingProfile.length - 1; pointIndex += 1) {
          const start = wingProfile[pointIndex];
          const end = wingProfile[pointIndex + 1];
          wingRoofs.add(createBeamBetween(
            new THREE.Vector3(side * form.wing.centerX + start[0], 1.25 + start[1], z),
            new THREE.Vector3(side * form.wing.centerX + end[0], 1.25 + end[1], z),
            0.032,
            materials.brass,
            6,
          ));
        }
        const outerX = side * (form.wing.centerX + 1.04);
        const curlMid = new THREE.Vector3(outerX + side * 0.18, 1.39, z);
        wingRoofs.add(
          createBeamBetween(new THREE.Vector3(outerX, 1.26, z), curlMid, 0.045, materials.roofWarm, 7),
          createBeamBetween(curlMid, new THREE.Vector3(outerX + side * 0.1, 1.64, z), 0.04, materials.brass, 7),
        );
      });
      const outerEave = box(0.12, 0.13, 2.2, materials.roofWarm);
      outerEave.position.set(side * (form.wing.centerX + 1.02), 1.27, 0.03);
      outerEave.rotation.z = side * -0.15;
      wingRoofs.add(outerEave);

      const ridgeX = side * form.wing.centerX + peakX;
      const ridge = cylinder(0.055, 0.055, 2.18, materials.brass, 8);
      ridge.rotation.x = Math.PI / 2;
      ridge.position.set(ridgeX, 2.63, 0.03);
      wingRoofs.add(ridge);

      [-1.05, 1.05].forEach((z) => {
        const finialStem = cylinder(0.035, 0.045, 0.32, materials.brass, 7);
        finialStem.position.set(ridgeX, 2.76, z);
        const finialTip = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.18, 7), materials.brass);
        finialTip.position.set(ridgeX, 3, z);
        wingRoofs.add(finialStem, finialTip);
      });
    });
    root.add(wingRoofs);

    const sideGables = createGuildHallPart('side-gables');
    [-1, 1].forEach((side) => {
      const gable = createProfileExtrusion([[-0.64, 0], [0.64, 0], [0, 0.9]], 0.2, materials.plaster, 0.02);
      gable.rotation.y = side * Math.PI / 2;
      gable.position.set(side * 2.18, 1.05, 0.03);
      sideGables.add(gable);
      const sideWindow = createArchedPanel(0.34, 0.52, 0.1, materials.window, materials.timberDark);
      sideWindow.rotation.y = side * Math.PI / 2;
      sideWindow.position.set(side * 2.29, 1.32, 0.03);
      sideGables.add(sideWindow);
    });
    root.add(sideGables);

    const facade = createGuildHallPart('facade-structure');
    [-1.44, -0.49, 0.49, 1.44].forEach((x) => {
      const beam = box(0.09, 1.28, 0.09, materials.timberDark);
      beam.position.set(x, 0.98, 1.02);
      facade.add(beam);
    });
    [0.45, 1.18, 1.58].forEach((y) => {
      const beam = box(3.02, 0.09, 0.09, materials.timberDark);
      beam.position.set(0, y, 1.02);
      facade.add(beam);
    });
    addFacadeBeam(facade, [-1.42, 0.48], [-0.52, 1.14], 1.075, materials.timberDark);
    addFacadeBeam(facade, [1.42, 0.48], [0.52, 1.14], 1.075, materials.timberDark);
    root.add(facade);

    const rear = createGuildHallPart('rear-service-elevation');
    const rearDeck = box(1.76, 0.12, 0.62, materials.timber);
    rearDeck.position.set(-0.28, 0.24, -1.28);
    rear.add(rearDeck);
    for (let step = 0; step < 2; step += 1) {
      const rearStep = box(0.8 + step * 0.22, 0.09, 0.24, materials.cobble);
      rearStep.position.set(-0.32, 0.1 + step * 0.07, -1.58 + step * 0.16);
      rear.add(rearStep);
    }
    const loadingBay = box(1.08, 0.88, 0.12, materials.timberDark);
    loadingBay.position.set(-0.55, 0.68, -1.08);
    rear.add(loadingBay);
    const loadingDoor = box(0.84, 0.68, 0.07, materials.timber);
    loadingDoor.position.set(-0.55, 0.68, -1.16);
    rear.add(loadingDoor);
    addFacadeBeam(rear, [-0.94, 0.37], [-0.17, 0.99], -1.22, materials.timberDark, 0.04);
    addFacadeBeam(rear, [-0.17, 0.37], [-0.94, 0.99], -1.22, materials.timberDark, 0.04);
    const rearAwning = createProfileExtrusion([[-0.72, 0], [0.72, 0], [0, 0.38]], 0.52, materials.roofWarm, 0.015);
    rearAwning.rotation.x = Math.PI;
    rearAwning.position.set(-0.55, 1.2, -1.18);
    rear.add(rearAwning);
    const serviceGable = createProfileExtrusion([[-0.66, 0], [0.66, 0], [0, 0.72]], 0.18, materials.plaster, 0.015);
    serviceGable.position.set(0.68, 1.18, -1.12);
    rear.add(serviceGable);
    addFacadeBeam(rear, [0.03, 1.2], [0.68, 1.88], -1.22, materials.timberDark, 0.05);
    addFacadeBeam(rear, [1.33, 1.2], [0.68, 1.88], -1.22, materials.timberDark, 0.05);
    const serviceWindow = createArchedPanel(0.4, 0.58, 0.1, materials.window, materials.timberDark);
    serviceWindow.rotation.y = Math.PI;
    serviceWindow.position.set(0.68, 1.3, -1.24);
    rear.add(serviceWindow);
    [-1.05, 1.3].forEach((x) => {
      const servicePost = cylinder(0.055, 0.065, 0.72, materials.timberDark, 7);
      servicePost.position.set(x, 0.62, -1.47);
      const serviceLantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), materials.window);
      serviceLantern.position.set(x, 1.03, -1.47);
      rear.add(servicePost, serviceLantern);
    });
    root.add(rear);
  }

  if (level >= 3) {
    const crown = createGuildHallPart('roof-crown');
    const crownDeck = box(form.crown.width, 0.16, form.crown.depth, materials.timberDark);
    crownDeck.position.y = form.crown.deckY;
    crown.add(crownDeck);
    const crownDrum = box(1.12, 0.3, 0.78, materials.roofWarm);
    crownDrum.position.y = 4.24;
    const crownCap = box(1.38, 0.11, 1, materials.brass);
    crownCap.position.y = 4.44;
    crown.add(crownDrum, crownCap);
    [-0.58, 0.58].forEach((x) => [-0.42, 0.42].forEach((z) => {
      const finial = cylinder(0.035, 0.055, 0.28, materials.brass, 8);
      finial.position.set(x, 4.58, z);
      const point = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.2, 8), materials.brass);
      point.position.set(x, 4.81, z);
      crown.add(finial, point);
    }));
    root.add(crown);

    const chimney = createGuildHallPart('chimney');
    const stack = box(0.32, 1.08, 0.38, materials.stone);
    stack.position.set(-1.02, 3.53, -0.22);
    stack.rotation.z = -0.05;
    const cap = box(0.46, 0.14, 0.5, materials.brass);
    cap.position.set(-1.02, 4.1, -0.22);
    chimney.add(stack, cap);
    root.add(chimney);

    const terrace = createGuildHallPart('terrace-silhouette');
    [-1.7, 1.7].forEach((x) => {
      const post = cylinder(0.08, 0.1, 0.82, materials.timberDark, 8);
      post.position.set(x, 0.57, 1.22);
      const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), materials.window);
      lantern.position.set(x, 1.08, 1.22);
      terrace.add(post, lantern);
    });
    [-1.45, 1.28].forEach((x, index) => {
      const barrel = cylinder(0.2, 0.22, 0.48, materials.timber, 10);
      barrel.position.set(x, 0.44, index === 0 ? 1.18 : 1.28);
      terrace.add(barrel);
    });
    const crate = box(0.42, 0.38, 0.42, materials.timberDark);
    crate.position.set(1.68, 0.37, -0.72);
    crate.rotation.y = 0.24;
    terrace.add(crate);
    [-0.56, 0.56].forEach((x) => {
      const entryLantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), materials.window);
      entryLantern.position.set(x, 1.34, 1.5);
      const bracket = createBeamBetween(
        new THREE.Vector3(x, 1.34, 1.35),
        new THREE.Vector3(x, 1.34, 1.5),
        0.025,
        materials.brass,
        6,
      );
      terrace.add(entryLantern, bracket);
    });
    const ropeCoil = createRopeCoil(materials.rope, quality);
    ropeCoil.position.set(1.18, 0.84, 1.51);
    ropeCoil.rotation.z = -0.16;
    terrace.add(ropeCoil);

    const netRack = createNetRack(materials.timberDark, materials.rope);
    netRack.position.set(-1.02, 0.22, 1.49);
    netRack.rotation.y = -0.08;
    terrace.add(netRack);

    const fishCrate = createSlattedFishCrate(0.58, 0.34, 0.42, materials.timberDark);
    fishCrate.position.set(1.2, 0.2, 1.44);
    fishCrate.rotation.y = -0.14;
    terrace.add(fishCrate);
    const stackedCrate = createSlattedFishCrate(0.45, 0.29, 0.36, materials.timber);
    stackedCrate.position.set(1.56, 0.2, 1.12);
    stackedCrate.rotation.y = 0.32;
    terrace.add(stackedCrate);

    [-1, 1].forEach((side) => {
      const basket = cylinder(0.18, 0.14, 0.22, materials.rope, 10);
      basket.position.set(side * 1.48, 0.3, 0.92);
      const basketRim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 5, 10), materials.timberDark);
      basketRim.rotation.x = Math.PI / 2;
      basketRim.position.set(side * 1.48, 0.42, 0.92);
      terrace.add(basket, basketRim);
    });

    const hangingSign = box(0.48, 0.28, 0.065, materials.timber);
    hangingSign.position.set(-1.34, 1.45, 1.48);
    hangingSign.rotation.z = -0.05;
    const signBracket = createBeamBetween(
      new THREE.Vector3(-1.34, 1.78, 1.35),
      new THREE.Vector3(-1.34, 1.56, 1.48),
      0.025,
      materials.brass,
      6,
    );
    terrace.add(hangingSign, signBracket);

    const guildCrest = new THREE.Group();
    guildCrest.name = 'ISLAND_22_GUILD_HALL_FISH_CREST';
    const crestBody = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 6), materials.brass);
    crestBody.scale.set(1.35, 0.68, 0.32);
    const crestTail = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.24, 3), materials.brass);
    crestTail.rotation.z = Math.PI / 2;
    crestTail.position.x = -0.26;
    guildCrest.position.set(0, 1.73, 1.57);
    guildCrest.add(crestBody, crestTail);
    terrace.add(guildCrest);
    root.add(terrace);
  }

  const sockets = createGuildHallPart('runtime-sockets');
  sockets.userData.sockets = {
    focus: [0, 1.75, 0],
    entry: [0, 0.25, 1.58],
    build: [0.92, 0.15, 1.36],
  };
  root.add(sockets);
  setShadow(root);
  return root;
}

function createTavern(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island22FishermansVillageMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_22_ROUND_LANTERN_TAVERN';
  const height = 1 + level * 0.42;
  const body = cylinder(0.95 + level * 0.08, 1.08 + level * 0.08, height, materials.timber, qualitySegments(quality));
  body.position.y = height / 2;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.36 + level * 0.1, 0.85 + level * 0.12, qualitySegments(quality)), materials.roof);
  roof.position.y = height + 0.38;
  root.add(body, roof);
  if (level >= 2) {
    const deck = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.08, 6, qualitySegments(quality)), materials.brass);
    deck.rotation.x = Math.PI / 2;
    deck.position.y = 0.78;
    root.add(deck);
  }
  addWindows(root, materials.window, 0.34, 0.78, 1.55);
  return root;
}

function createShipyard(level: 1 | 2 | 3, materials: Island22FishermansVillageMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_22_BOATWRIGHT_HABIT_YARD';
  const shedHeight = 0.7 + level * 0.22;
  const shed = box(1.5 + level * 0.22, shedHeight, 1.25, materials.timberDark);
  shed.position.set(-0.85, shedHeight / 2, 0.35);
  const roof = createRoof(1.9 + level * 0.24, 1.55, 0.68, materials.roof);
  roof.position.set(-0.85, shedHeight + 0.22, 0.35);
  root.add(shed, roof);
  const ribs = 5 + level * 2;
  for (let index = 0; index < ribs; index += 1) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.055, 5, 10, Math.PI), materials.timber);
    rib.rotation.z = Math.PI;
    rib.rotation.y = Math.PI / 2;
    rib.position.set(0.1 + index * 0.18, 0.72, -0.35);
    root.add(rib);
  }
  return root;
}

function createNetHouse(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island22FishermansVillageMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_22_NET_HOUSE_HATCHERY';
  const houseHeight = 0.72 + level * 0.18;
  const house = box(1.35 + level * 0.15, houseHeight, 1.2, materials.timber);
  house.position.set(0.9, houseHeight / 2, 0.25);
  const roof = createRoof(1.7 + level * 0.15, 1.45, 0.62, materials.roof);
  roof.position.set(0.9, houseHeight + 0.2, 0.25);
  root.add(house, roof);
  const netRibs = 4 + Math.round(level * qualityScale(quality) * 2);
  for (let index = 0; index < netRibs; index += 1) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.035, 5, 12, Math.PI), materials.rope);
    rib.rotation.z = Math.PI;
    rib.rotation.y = Math.PI / 2;
    rib.position.set(-1 + index * (1.4 / Math.max(1, netRibs - 1)), 0.58, -0.15);
    root.add(rib);
  }
  return root;
}

const ISLAND_22_LANDMARK_POSITIONS: Record<Island5LandmarkDefinition['id'], readonly [number, number, number]> = {
  wisdom: [-6.35, 0.38, -5.75],
  boss: [6.25, 0.42, -6.25],
  event: [7.15, 0.38, 0.25],
  hatchery: [5.75, 0.35, 6.2],
  habit: [-5.95, 0.35, 6.1],
};

export function buildIsland22FishermansVillageLandmark(
  definition: Island5LandmarkDefinition,
  level: BuildLevel,
  quality: Island3DQuality,
  materials: Island22FishermansVillageMaterials,
) {
  const root = new THREE.Group();
  root.name = `ISLAND_22_${definition.id.toUpperCase()}_LANDMARK_ROOT`;
  const foundation = cylinder(definition.id === 'boss' ? 2.35 : 1.72, definition.id === 'boss' ? 2.55 : 1.9, 0.34, materials.terrace, qualitySegments(quality));
  foundation.position.y = 0.17;
  root.add(foundation);
  if (level > 0) {
    const builtLevel = Math.max(1, level) as 1 | 2 | 3;
    const architecture = definition.id === 'wisdom'
      ? createLighthouse(builtLevel, quality, materials)
      : definition.id === 'boss'
        ? createIsland22FisherfolkGuildHall(builtLevel, quality, materials)
        : definition.id === 'event'
          ? createTavern(builtLevel, quality, materials)
          : definition.id === 'habit'
            ? createShipyard(builtLevel, materials)
            : createNetHouse(builtLevel, quality, materials);
    architecture.position.y = 0.3;
    root.add(architecture);
  }
  root.position.set(...ISLAND_22_LANDMARK_POSITIONS[definition.id]);
  root.rotation.y = Math.atan2(-root.position.x, -root.position.z);
  root.userData.landmarkId = definition.id;
  root.userData.buildLevel = level;
  root.userData.slice = 'slice-01-macro-composition';
  markPart(root, `${definition.id}-landmark`, { focus: `ISLAND_22_${definition.id.toUpperCase()}_FOCUS_SOCKET` });
  setShadow(root);
  return root;
}

function createDock(name: string, x: number, z: number, rotation: number, length: number, materials: Island22FishermansVillageMaterials) {
  const root = new THREE.Group();
  root.name = name;
  root.position.set(x, -0.15, z);
  root.rotation.y = rotation;
  const deck = box(1.15, 0.18, length, materials.timber);
  deck.position.y = 0.42;
  root.add(deck);
  [-0.45, 0.45].forEach((side) => {
    for (let index = 0; index < 4; index += 1) {
      const pile = cylinder(0.075, 0.095, 1.3, materials.timberDark, 8);
      pile.position.set(side, -0.05, -length / 2 + 0.45 + index * ((length - 0.9) / 3));
      root.add(pile);
    }
  });
  setShadow(root, false);
  return root;
}

function createBoat(materials: Island22FishermansVillageMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.SphereGeometry(0.62, qualitySegments(quality), 7, 0, Math.PI * 2, 0, Math.PI / 2), materials.timberDark);
  hull.scale.set(0.75, 0.42, 1.45);
  hull.rotation.x = Math.PI;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.055, 5, qualitySegments(quality)), materials.timber);
  rim.rotation.x = Math.PI / 2;
  rim.scale.z = 1.45;
  const keelFloor = box(0.48, 0.06, 1.08, materials.timber);
  keelFloor.position.y = 0.04;
  root.add(hull, rim, keelFloor);
  [-0.34, 0, 0.34].forEach((z, index) => {
    const seat = box(0.82, 0.07, 0.16, index === 1 ? materials.timberDark : materials.timber);
    seat.position.set(0, 0.2, z);
    root.add(seat);
  });
  const bowPost = cylinder(0.035, 0.045, 0.62, materials.brass, 6);
  bowPost.position.set(0, 0.3, -0.78);
  const sternPost = bowPost.clone();
  sternPost.position.z = 0.78;
  root.add(bowPost, sternPost);
  const portOar = createBeamBetween(
    new THREE.Vector3(-0.1, 0.26, -0.1),
    new THREE.Vector3(-0.92, 0.12, 0.42),
    0.025,
    materials.rope,
    6,
  );
  const starboardOar = createBeamBetween(
    new THREE.Vector3(0.1, 0.26, 0.06),
    new THREE.Vector3(0.92, 0.12, -0.46),
    0.025,
    materials.rope,
    6,
  );
  const portBlade = box(0.16, 0.035, 0.34, materials.timber);
  portBlade.position.set(-0.96, 0.1, 0.46);
  portBlade.rotation.y = 0.4;
  const starboardBlade = portBlade.clone();
  starboardBlade.position.set(0.96, 0.1, -0.5);
  root.add(portOar, starboardOar, portBlade, starboardBlade);
  return root;
}

const ISLAND_22_AUTHORED_CLUSTER_PLACEMENTS = [
  [-3.75, -7.05, 0.12, 1.02, 2], [-1.35, -7.35, -0.06, 0.88, 1], [1.35, -7.3, -0.08, 0.9, 2],
  [4.0, -6.72, -0.32, 0.88, 1], [7.0, -3.3, -1.22, 0.92, 2], [7.18, 2.7, -1.82, 0.88, 1],
  [4.05, 6.8, -2.78, 0.9, 2], [1.35, 7.2, -3.02, 0.82, 1], [-1.65, 7.18, 3.02, 0.86, 2],
  [-4.2, 6.6, 2.66, 0.9, 1], [-7.05, 3.35, 1.88, 0.86, 2], [-7.2, -1.9, 1.32, 0.88, 1],
] as const;

function addAuthoredVillageClusters(
  root: THREE.Group,
  quality: Island3DQuality,
  materials: Island22FishermansVillageMaterials,
) {
  const villageRoot = new THREE.Group();
  villageRoot.name = 'ISLAND_22_AUTHORED_HARBOR_VILLAGE';
  const count = quality === 'low' ? 8 : ISLAND_22_AUTHORED_CLUSTER_PLACEMENTS.length;
  ISLAND_22_AUTHORED_CLUSTER_PLACEMENTS.slice(0, count).forEach(([x, z, yaw, size, stories], index) => {
    const cluster = new THREE.Group();
    cluster.name = `ISLAND_22_AUTHORED_HARBOR_CLUSTER_${index + 1}`;
    cluster.position.set(x, 0.57 + (index % 3) * 0.08, z);
    cluster.rotation.y = yaw;
    cluster.scale.setScalar(size);

    const plinth = cylinder(1.12, 1.28, 0.32, materials.stone, 10);
    plinth.position.y = -0.13;
    plinth.scale.z = 0.76;
    cluster.add(plinth);

    const mainHouse = createAuthoredHarborHouse(
      `${cluster.name}_MAIN_HOUSE`,
      stories === 2 ? 1.55 : 1.42,
      1.22,
      stories as 1 | 2,
      index % 3 === 0 ? 'warm' : 'slate',
      materials,
    );
    cluster.add(mainHouse);

    if (quality !== 'low' && index % 2 === 0) {
      const annex = createAuthoredHarborHouse(
        `${cluster.name}_ANNEX`,
        0.92,
        0.82,
        1,
        index % 4 === 0 ? 'slate' : 'warm',
        materials,
      );
      annex.position.set(index % 4 === 0 ? 1.05 : -1.02, 0.03, 0.18);
      annex.rotation.y = index % 4 === 0 ? -0.2 : 0.18;
      cluster.add(annex);
    }
    villageRoot.add(cluster);
  });
  compactStaticGeometry(villageRoot, 'ISLAND_22_AUTHORED_HARBOR_VILLAGE');
  root.add(villageRoot);
}

function addSteppedHarborTerraces(
  root: THREE.Group,
  quality: Island3DQuality,
  materials: Island22FishermansVillageMaterials,
) {
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  const segmentCount = quality === 'low' ? 18 : 30;
  const retaining = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1.18, 0.5, 0.62),
    materials.stone,
    segmentCount,
  );
  retaining.name = 'ISLAND_22_STEPPED_STONE_RETAINING_RING';
  const upperWalk = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.92, 0.12, 0.58),
    materials.cobble,
    segmentCount,
  );
  upperWalk.name = 'ISLAND_22_INTERLOCKING_COBBLE_BOARDWALK';
  for (let index = 0; index < segmentCount; index += 1) {
    const angle = index / segmentCount * Math.PI * 2 + 0.05;
    const radius = 5.18 + (index % 5 === 0 ? 0.12 : 0);
    quaternion.setFromEuler(new THREE.Euler(0, -angle, 0));
    matrix.compose(
      position.set(Math.cos(angle) * radius, 0.64 + (index % 3) * 0.035, Math.sin(angle) * radius * 1.03),
      quaternion,
      scale,
    );
    retaining.setMatrixAt(index, matrix);
    matrix.compose(
      position.set(Math.cos(angle) * 4.7, 0.91, Math.sin(angle) * 4.7),
      quaternion,
      scale,
    );
    upperWalk.setMatrixAt(index, matrix);
  }
  retaining.instanceMatrix.needsUpdate = true;
  upperWalk.instanceMatrix.needsUpdate = true;
  retaining.receiveShadow = true;
  upperWalk.receiveShadow = true;
  root.add(retaining, upperWalk);

  const stairAngles = [-2.7, -1.98, -0.92, 0.22, 1.02, 2.2];
  const stepsPerStair = quality === 'low' ? 3 : 5;
  const stairSteps = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.88, 0.14, 0.42),
    materials.cobble,
    stairAngles.length * stepsPerStair,
  );
  stairSteps.name = 'ISLAND_22_RADIAL_STONE_STAIRS';
  let stairIndex = 0;
  stairAngles.forEach((angle) => {
    for (let step = 0; step < stepsPerStair; step += 1) {
      const radius = 4.55 + step * 0.3;
      matrix.compose(
        position.set(Math.cos(angle) * radius, 0.86 + step * 0.055, Math.sin(angle) * radius),
        quaternion.setFromEuler(new THREE.Euler(0, -angle + Math.PI / 2, 0)),
        scale,
      );
      stairSteps.setMatrixAt(stairIndex, matrix);
      stairIndex += 1;
    }
  });
  stairSteps.instanceMatrix.needsUpdate = true;
  stairSteps.receiveShadow = true;
  root.add(stairSteps);
}

function addVillageLanternRing(root: THREE.Group, materials: Island22FishermansVillageMaterials) {
  const lanternCount = 14;
  const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045, 0.06, 0.9, 6), materials.timberDark, lanternCount);
  posts.name = 'ISLAND_22_VILLAGE_LANTERN_POSTS';
  const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 8, 6), materials.window, lanternCount);
  lamps.name = 'ISLAND_22_WARM_VILLAGE_LANTERNS';
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  for (let index = 0; index < lanternCount; index += 1) {
    const angle = index / lanternCount * Math.PI * 2 + 0.11;
    const radius = 5.15;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    matrix.compose(new THREE.Vector3(x, 1.03, z), quaternion.identity(), scale);
    posts.setMatrixAt(index, matrix);
    matrix.compose(new THREE.Vector3(x, 1.53, z), quaternion.identity(), scale);
    lamps.setMatrixAt(index, matrix);
  }
  posts.instanceMatrix.needsUpdate = true;
  lamps.instanceMatrix.needsUpdate = true;
  root.add(posts, lamps);
}

function addFisherCrowd(
  root: THREE.Group,
  quality: Island3DQuality,
  materials: Island22FishermansVillageMaterials,
) {
  const fisherCount = Math.max(8, Math.round(15 * qualityScale(quality)));
  const bodies = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.11, 0.16, 0.48, 7), materials.timberDark, fisherCount);
  bodies.name = 'ISLAND_22_FISHER_CROWD_BODIES';
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 8, 6), materials.terrace, fisherCount);
  heads.name = 'ISLAND_22_FISHER_CROWD_HEADS';
  const hats = new THREE.InstancedMesh(new THREE.ConeGeometry(0.21, 0.18, 8), materials.brass, fisherCount);
  hats.name = 'ISLAND_22_FISHER_CROWD_HATS';
  const rods = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.018, 0.024, 1.28, 5), materials.rope, fisherCount);
  rods.name = 'ISLAND_22_FISHING_RODS';
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3(1, 1, 1);
  const quaternion = new THREE.Quaternion();
  for (let index = 0; index < fisherCount; index += 1) {
    const angle = index / fisherCount * Math.PI * 2 + 0.18;
    const radius = 2.52 + (index % 2) * 0.12;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    matrix.compose(position.set(x, 1.04, z), quaternion.identity(), scale);
    bodies.setMatrixAt(index, matrix);
    matrix.compose(position.set(x, 1.36, z), quaternion.identity(), scale);
    heads.setMatrixAt(index, matrix);
    matrix.compose(position.set(x, 1.52, z), quaternion.identity(), scale);
    hats.setMatrixAt(index, matrix);
    quaternion.setFromEuler(new THREE.Euler(Math.sin(angle) * 0.36, 0, Math.cos(angle) * 0.36));
    matrix.compose(position.set(x * 0.92, 1.27, z * 0.92), quaternion, scale);
    rods.setMatrixAt(index, matrix);
  }
  [bodies, heads, hats, rods].forEach((mesh) => {
    mesh.instanceMatrix.needsUpdate = true;
    root.add(mesh);
  });
  return (progress: number, panic: number) => {
    for (let index = 0; index < fisherCount; index += 1) {
      const angle = index / fisherCount * Math.PI * 2 + 0.18;
      const baseRadius = 2.52 + (index % 2) * 0.12;
      const route = index === 0 ? -1.7 : index === 1 ? 7.8 : 3.8 + (index % 4) * 0.8;
      const radius = baseRadius + route * progress;
      const wobble = Math.sin(progress * Math.PI * 10 + index) * panic * 0.12;
      const x = Math.cos(angle + wobble) * radius;
      const z = Math.sin(angle + wobble) * radius;
      const jump = Math.abs(Math.sin(progress * Math.PI * (4 + index % 3))) * panic * 0.22;
      quaternion.setFromEuler(new THREE.Euler(0, -angle + Math.PI / 2, wobble));
      matrix.compose(position.set(x, 1.04 + jump, z), quaternion, scale.setScalar(1));
      bodies.setMatrixAt(index, matrix);
      matrix.compose(position.set(x, 1.36 + jump, z), quaternion, scale);
      heads.setMatrixAt(index, matrix);
      matrix.compose(position.set(x, 1.52 + jump, z), quaternion, scale);
      hats.setMatrixAt(index, matrix);
      matrix.compose(position.set(x * 0.98, 1.22 + jump, z * 0.98), quaternion, scale.setScalar(1 - panic * 0.7));
      rods.setMatrixAt(index, matrix);
    }
    [bodies, heads, hats, rods].forEach((mesh) => { mesh.instanceMatrix.needsUpdate = true; });
  };
}

function addFishingProps(root: THREE.Group, materials: Island22FishermansVillageMaterials) {
  const propPlacements = [
    [-7.45, -5.0], [-6.85, -5.35], [-5.75, -6.6], [-4.65, -5.95], [-2.0, -6.25],
    [1.25, -6.35], [3.0, -6.1], [5.0, -5.55], [6.45, -4.6], [6.35, 3.65],
    [5.0, 5.6], [2.8, 6.2], [0.3, 6.5], [-2.2, 6.25], [-4.65, 5.55], [-6.25, 4.25],
  ] as const;
  const crates = new THREE.InstancedMesh(new THREE.BoxGeometry(0.38, 0.32, 0.38), materials.timber, propPlacements.length);
  crates.name = 'ISLAND_22_FISHING_CARGO_CRATES';
  const barrels = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.2, 0.46, 8), materials.brass, propPlacements.length);
  barrels.name = 'ISLAND_22_FISHING_BARRELS';
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  propPlacements.forEach(([x, z], index) => {
    matrix.compose(new THREE.Vector3(x, 0.72, z), quaternion.identity(), scale);
    crates.setMatrixAt(index, matrix);
    matrix.compose(new THREE.Vector3(x + 0.38, 0.78, z + (index % 2 ? 0.28 : -0.28)), quaternion.identity(), scale);
    barrels.setMatrixAt(index, matrix);
  });
  crates.instanceMatrix.needsUpdate = true;
  barrels.instanceMatrix.needsUpdate = true;
  root.add(crates, barrels);
}

export function createIsland22FishermansVillageLivingAmbience(
  scene: THREE.Scene,
  qualityProfile: Island3DQualityProfile,
  materials: Island22FishermansVillageMaterials,
  sharedOcean: THREE.Mesh,
): Island22FishermansVillageRuntime {
  const root = new THREE.Group();
  root.name = 'ISLAND_22_FISHERMANS_VILLAGE_WORLD_ROOT';
  scene.add(root);

  sharedOcean.material = materials.ocean;
  sharedOcean.position.y = -0.82;
  sharedOcean.name = 'ISLAND_22_OCEAN_SURFACE';
  root.add(sharedOcean);

  const terrain = cylinder(8.35, 9.2, 1.65, materials.cliff, qualitySegments(qualityProfile.id));
  terrain.name = 'ISLAND_22_TERRAIN_SHELL';
  terrain.position.y = -0.44;
  terrain.scale.z = 1.08;
  root.add(terrain);
  markPart(terrain, 'terrain-shell', {
    pond: 'ISLAND_22_POND_AXIS',
    marketDock: 'ISLAND_22_FISH_MARKET_DOCK_SOCKET',
  });

  const topTerrace = cylinder(7.9, 8.25, 0.5, materials.terrace, qualitySegments(qualityProfile.id));
  topTerrace.name = 'ISLAND_22_TOP_TERRACE';
  topTerrace.position.y = 0.33;
  topTerrace.scale.z = 1.08;
  root.add(topTerrace);
  const middleStoneTerrace = cylinder(7.15, 7.62, 0.34, materials.stone, qualitySegments(qualityProfile.id));
  middleStoneTerrace.name = 'ISLAND_22_MIDDLE_STONE_TERRACE';
  // Keep the terrace cap below the canonical pond and Spark36 surfaces. The
  // earlier 0.57 centre buried both under a flat stone disc in the review shot.
  middleStoneTerrace.position.y = 0.42;
  middleStoneTerrace.scale.z = 1.055;
  root.add(middleStoneTerrace);
  addSteppedHarborTerraces(root, qualityProfile.id, materials);
  addAuthoredVillageClusters(root, qualityProfile.id, materials);
  addVillageLanternRing(root, materials);

  const pondShadow = cylinder(3.42, 3.56, 0.24, materials.timberDark, qualitySegments(qualityProfile.id));
  pondShadow.name = 'ISLAND_22_POND_BOWL';
  pondShadow.position.y = 0.52;
  const pond = new THREE.Mesh(new THREE.CircleGeometry(3.34, qualitySegments(qualityProfile.id) * 2), materials.pond);
  pond.name = 'ISLAND_22_CENTRAL_POND_SURFACE';
  pond.rotation.x = -Math.PI / 2;
  pond.position.y = 0.66;
  pond.renderOrder = 1;
  const depth = new THREE.Mesh(new THREE.CircleGeometry(0.72, 24), materials.pond.clone());
  (depth.material as THREE.MeshPhysicalMaterial).color.setHex(0x043b50);
  (depth.material as THREE.MeshPhysicalMaterial).opacity = 0.74;
  depth.name = 'ISLAND_22_POND_CENTRAL_DEPTH';
  depth.rotation.x = -Math.PI / 2;
  depth.position.y = 0.672;
  depth.renderOrder = 2;
  root.add(pondShadow, pond, depth);
  markPart(pondShadow, 'central-pond-bowl', { vortex: 'ISLAND_22_POND_VORTEX_AXIS' });

  const cliffCount = Math.round(22 * qualityScale(qualityProfile.id));
  const cliffBlocks = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.82, 0),
    materials.cliff,
    cliffCount,
  );
  cliffBlocks.name = 'ISLAND_22_OUTER_CLIFF_STRATA';
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  for (let index = 0; index < cliffCount; index += 1) {
    const angle = index / cliffCount * Math.PI * 2 + 0.11;
    const radius = 8.45 + (index % 3) * 0.32;
    matrix.compose(
      position.set(Math.cos(angle) * radius, -0.35 - (index % 2) * 0.18, Math.sin(angle) * radius * 1.08),
      quaternion.setFromEuler(new THREE.Euler(0, -angle, (index % 3 - 1) * 0.08)),
      scale.set(1.25 + (index % 4) * 0.13, 1.15 + (index % 3) * 0.22, 1.0),
    );
    cliffBlocks.setMatrixAt(index, matrix);
  }
  cliffBlocks.instanceMatrix.needsUpdate = true;
  cliffBlocks.receiveShadow = true;
  root.add(cliffBlocks);

  // A second, smaller rock family breaks the old smooth cylinder silhouette.
  // Keep it instanced: this reads as hand-stacked coastal strata at phone scale
  // while adding one draw call instead of dozens of individual meshes.
  const accentRockCount = qualityProfile.id === 'low' ? 24 : 42;
  const accentRocks = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.46, 0),
    materials.stone,
    accentRockCount,
  );
  accentRocks.name = 'ISLAND_22_SHORELINE_ACCENT_ROCKS';
  for (let index = 0; index < accentRockCount; index += 1) {
    const angle = index / accentRockCount * Math.PI * 2 + 0.04;
    const radius = 8.08 + (index % 4) * 0.27;
    matrix.compose(
      position.set(
        Math.cos(angle) * radius,
        0.06 + (index % 3) * 0.2,
        Math.sin(angle) * radius * 1.08,
      ),
      quaternion.setFromEuler(new THREE.Euler(
        (index % 3 - 1) * 0.16,
        -angle + (index % 5) * 0.18,
        (index % 4 - 1.5) * 0.1,
      )),
      scale.set(
        0.72 + (index % 5) * 0.12,
        0.54 + (index % 4) * 0.12,
        0.62 + (index % 3) * 0.14,
      ),
    );
    accentRocks.setMatrixAt(index, matrix);
  }
  accentRocks.instanceMatrix.needsUpdate = true;
  accentRocks.castShadow = true;
  accentRocks.receiveShadow = true;
  root.add(accentRocks);

  const marketDock = createDock('ISLAND_22_FISH_MARKET_OFFLOAD_DOCK', -8.15, -5.55, -0.78, 5.2, materials);
  const marketApron = box(2.6, 0.2, 2.35, materials.timber);
  marketApron.name = 'ISLAND_22_FISH_MARKET_LOADING_APRON';
  marketApron.position.set(0, 0.48, -1.05);
  marketDock.add(marketApron);
  const marketHall = createAuthoredHarborHouse(
    'ISLAND_22_FISH_MARKET_HALL',
    2.2,
    1.55,
    2,
    'warm',
    materials,
  );
  marketHall.position.set(0, 0.58, -1.22);
  marketDock.add(marketHall);
  const marketAwning = box(2.45, 0.16, 1.52, materials.roof);
  marketAwning.name = 'ISLAND_22_FISH_MARKET_AWNING';
  marketAwning.position.set(0, 1.26, 0.55);
  marketAwning.rotation.x = -0.12;
  marketDock.add(marketAwning);
  const marketPosts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.055, 0.07, 0.9, 6), materials.timberDark, 4);
  marketPosts.name = 'ISLAND_22_FISH_MARKET_AWNING_POSTS';
  const postMatrix = new THREE.Matrix4();
  [[-0.92, 0.05], [0.92, 0.05], [-0.92, 1.0], [0.92, 1.0]].forEach(([x, z], index) => {
    postMatrix.makeTranslation(x, 0.8, z);
    marketPosts.setMatrixAt(index, postMatrix);
  });
  marketPosts.instanceMatrix.needsUpdate = true;
  marketDock.add(marketPosts);
  const marketCrates = new THREE.Group();
  marketCrates.name = 'ISLAND_22_FISH_MARKET_CARGO';
  [[-0.72, 0.62, 0.2], [-0.18, 0.62, 0.38], [0.4, 0.62, 0.18], [0.76, 0.62, 0.68], [-0.55, 0.62, 0.86]].forEach(([x, y, z], index) => {
    const crate = box(0.38, 0.32, 0.38, index % 2 ? materials.timberDark : materials.timber);
    crate.position.set(x, y, z);
    marketCrates.add(crate);
  });
  marketDock.add(marketCrates);
  const marketSign = box(1.2, 0.42, 0.09, materials.brass);
  marketSign.name = 'ISLAND_22_FISH_MARKET_SIGN';
  marketSign.position.set(0, 1.54, 0.52);
  marketDock.add(marketSign);
  const crane = new THREE.Group();
  crane.name = 'ISLAND_22_FISH_MARKET_OFFLOAD_CRANE';
  const craneMast = cylinder(0.09, 0.12, 2.7, materials.timberDark, 8);
  craneMast.position.y = 1.65;
  const craneArm = box(0.14, 0.14, 2.1, materials.timberDark);
  craneArm.position.set(0, 2.82, 0.65);
  craneArm.rotation.x = -0.18;
  const craneHook = cylinder(0.025, 0.025, 1.2, materials.rope, 6);
  craneHook.position.set(0, 2.12, 1.55);
  crane.add(craneMast, craneArm, craneHook);
  crane.position.set(-1.05, 0, 0.7);
  marketDock.add(crane);
  root.add(marketDock);
  markPart(marketDock, 'fish-market-offload-dock', {
    offload: 'ISLAND_22_FISH_MARKET_OFFLOAD_SOCKET',
    onload: 'ISLAND_22_FISH_MARKET_ONLOAD_SOCKET',
  });

  const frontDock = createDock('ISLAND_22_FRONT_DOCK', -1.8, 8.9, 0, 3.8, materials);
  const eastDock = createDock('ISLAND_22_EAST_DOCK', 8.2, 3.8, Math.PI / 2, 3.1, materials);
  const westDock = createDock('ISLAND_22_WEST_DOCK', -8.25, 2.85, -Math.PI / 2, 3.0, materials);
  root.add(frontDock, eastDock, westDock);

  const boats: THREE.Group[] = [];
  const boatPlacements = [
    [-9.1, -0.55, -5.8, -0.6], [-7.35, -0.55, -7.25, 0.5],
    [-3.6, -0.62, 10.0, 0.1], [0.4, -0.62, 10.45, -0.18],
    [8.9, -0.6, 5.7, 1.15], [9.4, -0.62, -1.8, 1.42],
  ] as const;
  boatPlacements.slice(0, Math.max(3, Math.round(boatPlacements.length * qualityScale(qualityProfile.id)))).forEach(([x, y, z, yaw], index) => {
    const boat = createBoat(materials, qualityProfile.id);
    boat.name = `ISLAND_22_FISHING_BOAT_${index + 1}`;
    boat.position.set(x, y, z);
    boat.rotation.y = yaw;
    root.add(boat);
    boats.push(boat);
  });

  const platformCount = qualityProfile.id === 'low' ? 7 : 11;
  const platforms = new THREE.InstancedMesh(new THREE.BoxGeometry(1.15, 0.13, 0.72), materials.timber, platformCount);
  platforms.name = 'ISLAND_22_POND_FISHING_PLATFORMS';
  for (let index = 0; index < platformCount; index += 1) {
    const angle = index / platformCount * Math.PI * 2 + 0.18;
    matrix.compose(
      position.set(Math.cos(angle) * 2.72, 0.76, Math.sin(angle) * 2.72),
      quaternion.setFromEuler(new THREE.Euler(0, -angle + Math.PI / 2, 0)),
      scale.set(1, 1, 1),
    );
    platforms.setMatrixAt(index, matrix);
  }
  platforms.instanceMatrix.needsUpdate = true;
  root.add(platforms);
  const updateFishers = addFisherCrowd(root, qualityProfile.id, materials);
  addFishingProps(root, materials);

  const pondSkiffs: THREE.Group[] = [];
  [[-1.35, -0.6, 0.18], [1.25, -0.85, -0.22], [-0.35, 1.35, 0.5]].forEach(([x, z, yaw], index) => {
    const skiff = createBoat(materials, qualityProfile.id);
    skiff.name = `ISLAND_22_POND_SKIFF_${index + 1}`;
    skiff.scale.setScalar(0.48);
    skiff.position.set(x, 0.76, z);
    skiff.rotation.y = yaw;
    root.add(skiff);
    pondSkiffs.push(skiff);
  });

  const treeCount = Math.max(10, Math.round(28 * qualityScale(qualityProfile.id)));
  const treeLayerCount = treeCount * 3;
  const treeCrowns = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.46, 0.82, 7),
    materials.foliage,
    treeLayerCount,
  );
  treeCrowns.name = 'ISLAND_22_LAYERED_CONIFER_CROWNS';
  const treeTrunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.07, 0.1, 0.72, 6),
    materials.timberDark,
    treeCount,
  );
  treeTrunks.name = 'ISLAND_22_HARDY_CONIFER_TRUNKS';
  for (let index = 0; index < treeCount; index += 1) {
    const angle = index / treeCount * Math.PI * 2 + 0.26;
    const radius = index % 3 === 0 ? 7.42 : index % 2 ? 6.74 : 7.05;
    const treeScale = 0.72 + (index % 5) * 0.08;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius * 1.05;
    matrix.compose(
      position.set(x, 1.12, z),
      quaternion.setFromEuler(new THREE.Euler(0, angle, 0)),
      scale.setScalar(treeScale),
    );
    treeTrunks.setMatrixAt(index, matrix);
    for (let layer = 0; layer < 3; layer += 1) {
      const layerScale = treeScale * (1 - layer * 0.19);
      matrix.compose(
        position.set(x, 1.34 + layer * 0.46 * treeScale, z),
        quaternion.setFromEuler(new THREE.Euler(0, angle + layer * 0.22, 0)),
        scale.set(layerScale * (1.08 - layer * 0.09), layerScale, layerScale),
      );
      treeCrowns.setMatrixAt(index * 3 + layer, matrix);
    }
  }
  treeCrowns.instanceMatrix.needsUpdate = true;
  treeTrunks.instanceMatrix.needsUpdate = true;
  treeCrowns.castShadow = true;
  treeTrunks.castShadow = true;
  root.add(treeTrunks, treeCrowns);

  const reedCount = qualityProfile.id === 'low' ? 24 : 48;
  const shorelineReeds = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.075, 0.52, 5),
    materials.foliage,
    reedCount,
  );
  shorelineReeds.name = 'ISLAND_22_SHORELINE_REED_AND_GRASS_CLUSTERS';
  for (let index = 0; index < reedCount; index += 1) {
    const angle = index / reedCount * Math.PI * 2 + (index % 3) * 0.05;
    const radius = 6.0 + (index % 4) * 0.52;
    matrix.compose(
      position.set(Math.cos(angle) * radius, 0.87, Math.sin(angle) * radius * 1.04),
      quaternion.setFromEuler(new THREE.Euler(0, angle * 1.7, (index % 3 - 1) * 0.16)),
      scale.set(0.7 + (index % 4) * 0.16, 0.76 + (index % 5) * 0.11, 0.7 + (index % 4) * 0.16),
    );
    shorelineReeds.setMatrixAt(index, matrix);
  }
  shorelineReeds.instanceMatrix.needsUpdate = true;
  root.add(shorelineReeds);

  const foam = new THREE.Mesh(new THREE.TorusGeometry(8.9, 0.11, 6, 72), materials.foam);
  foam.name = 'ISLAND_22_SHORE_FOAM_RING';
  foam.rotation.x = Math.PI / 2;
  foam.scale.z = 1.08;
  foam.position.y = -0.72;
  root.add(foam);

  setShadow(root, false);
  root.userData.slice = 'slice-01-macro-composition';
  root.userData.sourceSha256 = 'a631297b2d2c11fcb3939de8ccc5bcdd69c52ab3bd12d40597859fbb6019ae65';
  root.userData.sculptRuntime = {
    parts: [
      { id: 'terrain-shell', name: 'terrain-shell', kind: 'part', nodeName: terrain.name, module: 'island-022-slice-01', triangles: 0 },
      { id: 'central-pond-bowl', name: 'central-pond-bowl', kind: 'part', nodeName: pondShadow.name, module: 'island-022-slice-01', triangles: 0 },
      { id: 'outer-docks-and-piers', name: 'outer-docks-and-piers', kind: 'part', nodeName: frontDock.name, module: 'island-022-slice-01', triangles: 0 },
      { id: 'fishing-boat-flotilla', name: 'fishing-boat-flotilla', kind: 'part', nodeName: boats[0]?.name ?? 'none', module: 'island-022-slice-01', triangles: 0 },
    ],
    clickable: true,
    explodable: true,
    sockets: {
      pondVortex: 'ISLAND_22_POND_VORTEX_AXIS',
      fishMarketOffload: 'ISLAND_22_FISH_MARKET_OFFLOAD_SOCKET',
      fishMarketOnload: 'ISLAND_22_FISH_MARKET_ONLOAD_SOCKET',
      dragonStudyDeferred: 'ISLAND_22_DRAGON_STUDY_NOT_BUILT',
    },
  };

  const waterDragonMission = createIsland22WaterDragonMission({
    parent: root,
    pond,
    depth,
    pondShadow,
    boats,
    pondSkiffs,
    updateFishers,
  });
  let waterDragonPresentation: Island22WaterDragonPresentation = { fishCaughtKg: 0 };

  return {
    root,
    animate: (elapsed) => {
      const motion = Math.sin(elapsed * 0.75);
      pond.position.y = 0.66 + motion * 0.012;
      (depth.material as THREE.MeshPhysicalMaterial).opacity = 0.71 + Math.sin(elapsed * 0.42) * 0.04;
      boats.forEach((boat, index) => {
        boat.rotation.z = Math.sin(elapsed * 0.68 + index) * 0.025;
        boat.position.y = boatPlacements[index][1] + Math.sin(elapsed * 0.74 + index * 0.8) * 0.035;
      });
      pondSkiffs.forEach((skiff, index) => {
        skiff.position.y = 0.76 + Math.sin(elapsed * 0.86 + index * 1.7) * 0.018;
        skiff.rotation.z = Math.sin(elapsed * 0.72 + index) * 0.018;
      });
      (foam.material as THREE.MeshBasicMaterial).opacity = 0.38 + Math.sin(elapsed * 0.52) * 0.06;
      waterDragonMission.update(elapsed, waterDragonPresentation);
    },
    updateWaterDragonMission: (presentation) => {
      waterDragonPresentation = presentation;
      waterDragonMission.update(presentation.previewElapsedSeconds ?? 0, presentation);
    },
    getWaterDragonMissionCameraPose: waterDragonMission.getCameraPose,
    getWaterDragonMissionPhase: waterDragonMission.getPhase,
  };
}
