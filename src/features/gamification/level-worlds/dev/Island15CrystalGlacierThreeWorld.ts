import * as THREE from 'three';
import type {
  Island3DQuality,
  Island3DQualityProfile,
  Island5LandmarkDefinition,
} from './island5ThreePilotContract';
import { buildIsland15GlacierTerrainPart } from './island15/Island15GlacierTerrainPart';
import { buildIsland15SingleCitadelBlockoutPart } from './island15/Island15SingleCitadelBlockoutPart';
import type { Island15RoomCutawayRuntime } from './island15/Island15RoomCutawaySystem';
import { ISLAND_15_CRYSTAL_PALACE_NODE_NAMES } from './island15/Island15CrystalPalaceRuntime';
import { compactStaticGeometry } from './CrownCitadelThreeModel';

type BuildLevel = 0 | 1 | 2 | 3;

export const ISLAND_15_CRYSTAL_GLACIER_WORLD_NAME = 'Crystal Glacier Citadel';

export const ISLAND_15_CITADEL_PRESENTATION_MODE = 'unified-procedural-crystal-palace' as const;

export const ISLAND_15_CRYSTAL_GLACIER_ASSET_PATHS = {
  castleOverview: '/assets/islands/island-015-crystal-glacier/crystal-citadel-hero-v4.jpg',
  frostNestFocus: '/assets/islands/island-015-crystal-glacier/frost-nest-focus-v4.jpg',
  iceBastionFocus: '/assets/islands/island-015-crystal-glacier/ice-bastion-focus-v4.jpg',
  auroraObservatoryFocus: '/assets/islands/island-015-crystal-glacier/aurora-observatory-focus-v4.jpg',
  crystalOracleLibraryFocus: '/assets/islands/island-015-crystal-glacier/crystal-oracle-library-focus-v4.jpg',
  frozenThroneFocus: '/assets/islands/island-015-crystal-glacier/frozen-throne-focus-v4.jpg',
} as const;

export const ISLAND_15_CRYSTAL_GLACIER_LANDMARK_LABELS = {
  boss: 'Frozen Throne Keep',
  hatchery: 'Frost Nest',
  habit: 'Ice Bastion',
  wisdom: 'Crystal Oracle Library',
  event: 'Aurora Observatory',
} as const;

export interface Island15CrystalGlacierMaterials {
  snow: THREE.MeshStandardMaterial;
  ice: THREE.MeshPhysicalMaterial;
  deepIce: THREE.MeshPhysicalMaterial;
  crystal: THREE.MeshPhysicalMaterial;
  heroCrystal: THREE.MeshPhysicalMaterial;
  crystalGlow: THREE.MeshPhysicalMaterial;
  violetCrystal: THREE.MeshPhysicalMaterial;
  castle: THREE.MeshStandardMaterial;
  castleShadow: THREE.MeshStandardMaterial;
  silver: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
  warmWindow: THREE.MeshStandardMaterial;
  warmInterior: THREE.MeshStandardMaterial;
  midnight: THREE.MeshStandardMaterial;
  pine: THREE.MeshStandardMaterial;
  pineSnow: THREE.MeshStandardMaterial;
}

export interface Island15CrystalGlacierAmbienceRuntime {
  root: THREE.Group;
  animate: (elapsed: number) => void;
  updateView?: (cameraPosition: THREE.Vector3, cameraTarget?: THREE.Vector3, reducedMotion?: boolean) => void;
}

function createIsland15MasonryMaps() {
  if (typeof document === 'undefined') return undefined;
  const makeCanvas = (kind: 'albedo' | 'height' | 'roughness') => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    if (!context) return undefined;
    context.fillStyle = kind === 'albedo' ? '#aab9c5' : kind === 'height' ? '#808080' : '#d8d8d8';
    context.fillRect(0, 0, 512, 512);
    for (let row = 0; row < 12; row += 1) {
      const y = row * 43;
      const offset = row % 2 ? -18 : 0;
      for (let column = -1; column < 16; column += 1) {
        const x = offset + column * 38;
        const tone = (row * 17 + column * 29 + 512) % 24;
        const face = kind === 'albedo'
          ? `rgb(${164 + tone},${179 + Math.floor(tone * 0.82)},${193 + Math.floor(tone * 0.72)})`
          : kind === 'height'
            ? `rgb(${133 + Math.floor(tone * 0.5)},${133 + Math.floor(tone * 0.5)},${133 + Math.floor(tone * 0.5)})`
            : `rgb(${205 + Math.floor(tone * 0.75)},${205 + Math.floor(tone * 0.75)},${205 + Math.floor(tone * 0.75)})`;
        context.fillStyle = face;
        context.fillRect(x + 2, y + 2, 34, 39);
        context.strokeStyle = kind === 'albedo' ? 'rgba(58,77,94,0.48)' : kind === 'height' ? '#656565' : '#ececec';
        context.lineWidth = 2;
        context.strokeRect(x + 2, y + 2, 34, 39);
      }
    }
    context.strokeStyle = kind === 'albedo' ? 'rgba(79,121,151,0.16)' : kind === 'height' ? '#747474' : '#c2c2c2';
    context.lineWidth = kind === 'height' ? 2 : 1;
    for (let index = 0; index < 36; index += 1) {
      const x = (index * 83 + 21) % 512;
      const y = (index * 47 + 13) % 512;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + 5 + index % 7, y + 9);
      context.lineTo(x + 2, y + 16 + index % 5);
      context.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4.5, 6.5);
    texture.colorSpace = kind === 'albedo' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.needsUpdate = true;
    return texture;
  };
  return { albedo: makeCanvas('albedo'), height: makeCanvas('height'), roughness: makeCanvas('roughness') };
}

export const ISLAND_15_RUNTIME_PART_IDS = [
  'glacier-terrain',
  'glacier-terrain-mass',
  'glacier-undercrystals',
  'castle-connectors',
  'castle-wing-connector-system',
  'shared-interior-circulation',
  'castle-exterior',
  'castle-exterior-shell',
  'castle-tower-crown',
  'single-citadel-blockout',
  'room-cutaway-system',
  'crystal-field',
  'evergreen-field',
  'polar-sky',
  'aurora-system',
  'snow-atmosphere',
  'crystal-sparkles',
  'landmark-network',
  'route-integration',
  'production-crystal-palace',
  'frozen-throne-keep',
  'frost-nest-room',
  'ice-bastion-room',
  'crystal-oracle-library',
  'aurora-observatory',
] as const;

type Island15RuntimePartId = typeof ISLAND_15_RUNTIME_PART_IDS[number];

interface Island15RuntimePart {
  id: Island15RuntimePartId;
  name: Island15RuntimePartId;
  kind: 'part';
  nodeName: string;
  module: string;
  triangles: number;
}

export function registerIsland15RuntimePart(
  id: Island15RuntimePartId,
  node: THREE.Object3D,
  module: string,
  triangles = 0,
): Island15RuntimePart {
  node.userData.partId = id;
  node.userData.partKind = 'part';
  node.userData.partModule = module;
  node.userData.partTriangles = triangles;
  return { id, name: id, kind: 'part', nodeName: node.name, module, triangles };
}

export function collectIsland15RuntimePartManifest(roots: THREE.Object3D[]) {
  const parts: Island15RuntimePart[] = [];
  const seen = new Set<string>();
  roots.forEach((root) => root.traverse((object) => {
    const id = object.userData.partId as Island15RuntimePartId | undefined;
    if (!id || seen.has(id)) return;
    seen.add(id);
    parts.push({
      id,
      name: id,
      kind: 'part',
      nodeName: object.name,
      module: String(object.userData.partModule ?? 'runtime'),
      triangles: Number(object.userData.partTriangles ?? 0),
    });
  }));
  return { schemaVersion: 1, islandNumber: 15, parts };
}

export function createIsland15CrystalGlacierBackdrop(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 1024;
  const context = canvas.getContext('2d');
  if (context) {
    const sky = context.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, '#09162a');
    sky.addColorStop(0.34, '#294760');
    sky.addColorStop(0.68, '#9eb8c7');
    sky.addColorStop(1, '#e6eef1');
    context.fillStyle = sky;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const horizon = context.createRadialGradient(390, 650, 10, 390, 650, 430);
    horizon.addColorStop(0, 'rgba(226,244,247,0.42)');
    horizon.addColorStop(0.55, 'rgba(117,157,177,0.16)');
    horizon.addColorStop(1, 'rgba(10,37,77,0)');
    context.fillStyle = horizon;
    context.fillRect(0, 220, canvas.width, 804);

    context.globalAlpha = 0.22;
    for (let index = 0; index < 90; index += 1) {
      const x = (index * 193) % canvas.width;
      const y = (index * 347) % 620;
      const radius = index % 7 === 0 ? 1.6 : 0.7;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fillStyle = '#eafcff';
      context.fill();
    }
    context.globalAlpha = 1;
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createIsland15CrystalGlacierMaterials(): Island15CrystalGlacierMaterials {
  const masonryMaps = createIsland15MasonryMaps();
  const masonryAlbedo = typeof document === 'undefined'
    ? masonryMaps?.albedo
    : new THREE.TextureLoader().load('/assets/islands/island-015-crystal-glacier/crystal-gothic-masonry-v53.png');
  if (masonryAlbedo) {
    masonryAlbedo.colorSpace = THREE.SRGBColorSpace;
    masonryAlbedo.wrapS = THREE.RepeatWrapping;
    masonryAlbedo.wrapT = THREE.RepeatWrapping;
    masonryAlbedo.repeat.set(1, 1);
    masonryAlbedo.minFilter = THREE.LinearMipmapLinearFilter;
    masonryAlbedo.magFilter = THREE.LinearFilter;
    masonryAlbedo.generateMipmaps = true;
  }
  return {
    snow: new THREE.MeshStandardMaterial({
      color: 0xf1f5f6,
      roughness: 0.82,
      metalness: 0,
    }),
    ice: new THREE.MeshPhysicalMaterial({
      color: 0xb0dce5,
      emissive: 0x163746,
      emissiveIntensity: 0.04,
      roughness: 0.28,
      metalness: 0,
      transmission: 0.16,
      thickness: 0.78,
      ior: 1.31,
      transparent: true,
      opacity: 0.94,
      clearcoat: 0.42,
      clearcoatRoughness: 0.2,
      iridescenceIOR: 1.27,
      attenuationColor: new THREE.Color(0x178fcd),
      attenuationDistance: 2.35,
    }),
    deepIce: new THREE.MeshPhysicalMaterial({
      color: 0x355f78,
      emissive: 0x102c3c,
      emissiveIntensity: 0.04,
      roughness: 0.38,
      metalness: 0.01,
      transmission: 0.05,
      thickness: 1.55,
      ior: 1.34,
      clearcoat: 0.28,
      clearcoatRoughness: 0.22,
      attenuationColor: new THREE.Color(0x073c95),
      attenuationDistance: 1.8,
    }),
    crystal: new THREE.MeshPhysicalMaterial({
      color: 0xb9e8ec,
      emissive: 0x247788,
      emissiveIntensity: 0.18,
      roughness: 0.12,
      metalness: 0,
      transmission: 0.34,
      thickness: 0.7,
      ior: 1.36,
      transparent: true,
      opacity: 0.91,
      clearcoat: 0.62,
      clearcoatRoughness: 0.08,
      iridescence: 0.08,
      iridescenceIOR: 1.32,
      attenuationColor: new THREE.Color(0x28c9f2),
      attenuationDistance: 1.25,
    }),
    heroCrystal: new THREE.MeshPhysicalMaterial({
      color: 0x62b3da,
      emissive: 0x176f9f,
      emissiveIntensity: 0.44,
      roughness: 0.11,
      metalness: 0,
      transmission: 0.22,
      thickness: 1.05,
      ior: 1.38,
      transparent: true,
      opacity: 0.94,
      clearcoat: 0.68,
      clearcoatRoughness: 0.07,
      iridescence: 0.12,
      iridescenceIOR: 1.38,
      attenuationColor: new THREE.Color(0x1b6dff),
      attenuationDistance: 1.4,
      flatShading: true,
    }),
    crystalGlow: new THREE.MeshPhysicalMaterial({
      color: 0x5bc9d6,
      emissive: 0x198da3,
      emissiveIntensity: 0.46,
      roughness: 0.12,
      transmission: 0.18,
      thickness: 0.76,
      ior: 1.36,
      transparent: true,
      opacity: 0.92,
      clearcoat: 0.64,
      clearcoatRoughness: 0.07,
      iridescence: 0.1,
      iridescenceIOR: 1.34,
      attenuationColor: new THREE.Color(0x27aaff),
      attenuationDistance: 0.9,
      flatShading: true,
    }),
    violetCrystal: new THREE.MeshPhysicalMaterial({
      color: 0x9679c8,
      emissive: 0x5b438d,
      emissiveIntensity: 0.42,
      roughness: 0.14,
      metalness: 0,
      transmission: 0.16,
      thickness: 0.8,
      ior: 1.39,
      transparent: true,
      opacity: 0.92,
      clearcoat: 0.6,
      clearcoatRoughness: 0.08,
      iridescence: 0.1,
      iridescenceIOR: 1.42,
      attenuationColor: new THREE.Color(0x5222c9),
      attenuationDistance: 1,
      flatShading: true,
    }),
    castle: new THREE.MeshStandardMaterial({
      color: 0xf0f3f4,
      roughness: 0.64,
      metalness: 0.03,
      ...(masonryMaps ? { map: masonryAlbedo, bumpMap: masonryMaps.height, roughnessMap: masonryMaps.roughness } : {}),
      bumpScale: 0.025,
    }),
    castleShadow: new THREE.MeshStandardMaterial({
      color: 0x98a7b2,
      roughness: 0.78,
      metalness: 0.02,
      ...(masonryMaps ? { map: masonryAlbedo, bumpMap: masonryMaps.height, roughnessMap: masonryMaps.roughness } : {}),
      bumpScale: 0.035,
    }),
    silver: new THREE.MeshStandardMaterial({ color: 0xc5ced4, roughness: 0.36, metalness: 0.58 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xb68a49, roughness: 0.43, metalness: 0.66 }),
    warmWindow: new THREE.MeshPhysicalMaterial({
      color: 0xffd09a,
      emissive: 0xff681f,
      emissiveIntensity: 1.05,
      roughness: 0.3,
      transmission: 0.08,
      thickness: 0.48,
      ior: 1.32,
      transparent: true,
      opacity: 0.92,
      clearcoat: 0.22,
      clearcoatRoughness: 0.18,
    }),
    warmInterior: new THREE.MeshStandardMaterial({ color: 0x6e4938, emissive: 0x4c2116, emissiveIntensity: 0.22, roughness: 0.68, metalness: 0 }),
    midnight: new THREE.MeshStandardMaterial({
      color: 0x1a2b3a,
      roughness: 0.86,
      metalness: 0,
      ...(masonryMaps ? { bumpMap: masonryMaps.height, roughnessMap: masonryMaps.roughness } : {}),
      bumpScale: 0.025,
    }),
    pine: new THREE.MeshStandardMaterial({ color: 0x174e56, roughness: 0.84 }),
    pineSnow: new THREE.MeshStandardMaterial({ color: 0xd9f5f6, roughness: 0.8 }),
  };
}

function addBox(
  parent: THREE.Object3D,
  name: string,
  size: readonly [number, number, number],
  position: readonly [number, number, number],
  material: THREE.Material,
  rotationY = 0,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.y = rotationY;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCrystal(
  parent: THREE.Object3D,
  name: string,
  position: readonly [number, number, number],
  scale: readonly [number, number, number],
  material: THREE.Material,
  sides = 6,
) {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.35, sides), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCrystalCluster(
  parent: THREE.Object3D,
  name: string,
  position: readonly [number, number, number],
  material: THREE.Material,
  scale = 1,
) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(...position);
  [
    [-0.22, 0.42, 0.04, 0.86, -0.22],
    [0.08, 0.66, 0, 1.2, 0.04],
    [0.33, 0.36, 0.08, 0.7, 0.24],
    [0.06, 0.28, 0.28, 0.55, -0.16],
  ].forEach(([x, y, z, height, tilt], index) => {
    const shard = addCrystal(group, `${name}_SHARD_${index + 1}`, [x, y, z], [0.75, height, 0.75], material);
    shard.rotation.z = tilt;
  });
  group.scale.setScalar(scale);
  parent.add(group);
  return group;
}

function addIsland15FacadeFinish(
  parent: THREE.Object3D,
  name: string,
  position: readonly [number, number, number],
  width: number,
  height: number,
  bays: number,
  materials: Island15CrystalGlacierMaterials,
  rotationY = 0,
) {
  const finish = new THREE.Group();
  finish.name = name;
  finish.position.set(...position);
  finish.rotation.y = rotationY;
  finish.userData.island15FacadeFinish = true;
  const bayWidth = width / bays;
  addBox(finish, `${name}_SAPPHIRE_GROUND`, [width, height, 0.08], [0, 0, 0], materials.midnight);
  addBox(finish, `${name}_SILVER_CORNICE_TOP`, [width + 0.14, 0.11, 0.13], [0, height * 0.5 + 0.04, 0.055], materials.silver);
  addBox(finish, `${name}_GOLD_CORNICE_INNER`, [width, 0.055, 0.15], [0, height * 0.5 - 0.08, 0.07], materials.gold);
  addBox(finish, `${name}_SILVER_CORNICE_BASE`, [width + 0.12, 0.1, 0.13], [0, -height * 0.5, 0.055], materials.silver);
  for (let index = 0; index < bays; index += 1) {
    const x = -width * 0.5 + bayWidth * (index + 0.5);
    const glow = index % 3 === 1 ? materials.warmWindow : index % 2 ? materials.violetCrystal : materials.crystalGlow;
    addFramedPointedArchWindow(finish, `${name}_LANCET_${index + 1}`, bayWidth * 0.48, height * 0.58, [x, -height * 0.3, 0.09], materials, glow);
    const boss = new THREE.Mesh(new THREE.OctahedronGeometry(Math.min(0.12, bayWidth * 0.14), 0), index % 2 ? materials.violetCrystal : materials.crystalGlow);
    boss.name = `${name}_FACET_BOSS_${index + 1}`;
    boss.position.set(x, height * 0.34, 0.16);
    boss.scale.y = 1.45;
    finish.add(boss);
    if (index < bays - 1) {
      addBox(finish, `${name}_GOLD_MULLION_${index + 1}`, [0.055, height * 0.86, 0.13], [x + bayWidth * 0.5, -0.02, 0.075], materials.gold);
    }
  }
  parent.add(finish);
  return finish;
}

function addGothicSpire(
  parent: THREE.Object3D,
  name: string,
  position: readonly [number, number, number],
  height: number,
  materials: Island15CrystalGlacierMaterials,
  accent: THREE.Material,
  radius = 0.42,
) {
  const spire = new THREE.Group();
  spire.name = name;
  spire.position.set(...position);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.78, radius, height * 0.48, 8), materials.castleShadow);
  tower.position.y = height * 0.24;
  tower.castShadow = true;
  spire.add(tower);
  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.08, radius * 1.08, 0.12, 8), materials.silver);
  gallery.position.y = height * 0.48;
  spire.add(gallery);
  const crown = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.86, height * 0.52, 6), accent);
  crown.position.y = height * 0.76;
  crown.castShadow = true;
  spire.add(crown);
  const light = new THREE.Mesh(new THREE.OctahedronGeometry(radius * 0.24, 0), accent);
  light.position.set(0, height * 0.31, radius * 0.81);
  light.scale.y = 1.65;
  spire.add(light);
  parent.add(spire);
  return spire;
}

function addFramedPointedArchWindow(
  parent: THREE.Object3D,
  name: string,
  width: number,
  height: number,
  position: readonly [number, number, number],
  materials: Island15CrystalGlacierMaterials,
  glow: THREE.Material,
  rotationY = 0,
) {
  const frame = addPointedArchWindow(parent, `${name}_SILVER_FRAME`, width * 1.24, height * 1.18, position, materials.silver, rotationY);
  const inset: [number, number, number] = [
    position[0] + Math.sin(rotationY) * 0.022,
    position[1] + height * 0.055,
    position[2] + Math.cos(rotationY) * 0.022,
  ];
  const glass = addPointedArchWindow(parent, `${name}_GLASS`, width, height, inset, glow, rotationY);
  return { frame, glass };
}

function addRoomShell(
  root: THREE.Group,
  name: string,
  level: BuildLevel,
  materials: Island15CrystalGlacierMaterials,
  accentMaterial: THREE.Material,
  wallMaterial: THREE.Material = materials.castle,
) {
  const shell = new THREE.Group();
  shell.name = `${name}_CUTAWAY_SHELL`;
  shell.userData.island15Cutaway = true;
  const roomFloor = addBox(shell, `${name}_FLOOR`, [3.18, 0.2, 2.62], [0, 0.1, 0], materials.castleShadow);
  const roomFloorInlay = addBox(shell, `${name}_FLOOR_INLAY`, [2.62, 0.035, 2.18], [0, 0.22, 0.04], materials.ice);
  // Small mobile shadow maps turn the low octagonal equipment above these
  // broad near-horizontal receivers into high-contrast saw teeth. The room
  // walls and equipment still receive/cast depth shadows; keep the floor
  // legible as architecture instead of rendering aliasing as black debris.
  roomFloor.receiveShadow = false;
  roomFloorInlay.receiveShadow = false;
  addBox(shell, `${name}_BACK_WALL`, [3.18, 2.18, 0.22], [0, 1.28, -1.2], wallMaterial);
  addBox(shell, `${name}_LEFT_WALL`, [0.24, 1.82, 2.1], [-1.48, 1.08, -0.18], wallMaterial);
  addBox(shell, `${name}_RIGHT_WALL`, [0.24, 1.82, 2.1], [1.48, 1.08, -0.18], wallMaterial);
  const leftApseReturn = addBox(shell, `${name}_LEFT_APSE_RETURN`, [0.2, 1.96, 0.82], [-1.32, 1.2, -0.92], wallMaterial, -0.22);
  const rightApseReturn = addBox(shell, `${name}_RIGHT_APSE_RETURN`, [0.2, 1.96, 0.82], [1.32, 1.2, -0.92], wallMaterial, 0.22);
  leftApseReturn.receiveShadow = true;
  rightApseReturn.receiveShadow = true;
  addBox(shell, `${name}_BACK_WALL_INNER_GLOW`, [2.68, 1.72, 0.035], [0, 1.22, -1.075], materials.deepIce);
  addBox(shell, `${name}_STONE_DADO`, [2.92, 0.18, 0.14], [0, 0.62, -1.02], materials.silver);
  // A high rear skyglass closes the visual void above the activity without
  // restoring the retired foreground roof webs. It stays on the far wall, so
  // the focused camera keeps an unobstructed walking floor and readable room
  // boundaries while the chamber still feels physically enclosed.
  addFramedPointedArchWindow(
    shell,
    `${name}_UPPER_SKYGLASS_APSE`,
    2.26,
    1.04,
    [0, 1.46, -1.035],
    materials,
    materials.deepIce,
  );
  const skyglassHeart = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), accentMaterial);
  skyglassHeart.name = `${name}_UPPER_SKYGLASS_HEART`;
  skyglassHeart.position.set(0, 2.18, -0.985);
  skyglassHeart.rotation.z = Math.PI * 0.25;
  shell.add(skyglassHeart);
  [-1.16, -0.58, 0.58, 1.16].forEach((x, index) => {
    addBox(shell, `${name}_ENGAGED_APSE_PIER_${index + 1}`, [0.12, 1.74, 0.14], [x, 1.28, -0.96], materials.castleShadow);
  });

  [-0.78, 0, 0.78].forEach((x, index) => {
    addFramedPointedArchWindow(shell, `${name}_BACK_WINDOW_${index + 1}`, 0.38, 0.78, [x, 0.82, -1.045], materials, index === 1 ? materials.warmWindow : accentMaterial);
  });
  const cutawayArch = new THREE.Mesh(new THREE.TorusGeometry(1.47, 0.09, 7, 40, Math.PI), materials.silver);
  cutawayArch.name = `${name}_DOLLHOUSE_PROSCENIUM_ARCH`;
  cutawayArch.position.set(0, 1.34, 1.05);
  cutawayArch.userData.island15OverviewExterior = true;
  shell.add(cutawayArch);
  const leftCutawayPier = addBox(shell, `${name}_DOLLHOUSE_LEFT_PIER`, [0.18, 1.34, 0.18], [-1.47, 0.7, 1.05], materials.silver);
  const rightCutawayPier = addBox(shell, `${name}_DOLLHOUSE_RIGHT_PIER`, [0.18, 1.34, 0.18], [1.47, 0.7, 1.05], materials.silver);
  leftCutawayPier.userData.island15OverviewExterior = true;
  rightCutawayPier.userData.island15OverviewExterior = true;
  const crownBeam = addBox(shell, `${name}_CROWN_BEAM`, [3.42, 0.16, 0.26], [0, 2.38, -1.13], materials.silver);
  crownBeam.userData.island15OverviewExterior = true;
  [-0.72, 0, 0.72].forEach((z, index) => {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(1.43, index === 0 ? 0.018 : 0.026, 6, 36, Math.PI), index % 2 ? accentMaterial : materials.crystalGlow);
    rib.name = `${name}_CRYSTAL_VAULT_RIB_${index + 1}`;
    rib.position.set(0, 1.95, z);
    rib.scale.set(1, 0.62, 1);
    // Focus cameras cross the gallery threshold. Remove the front and middle
    // springings with the roof cassette so they do not become a giant X/V in
    // front of the room's activity; one thin rear rib preserves enclosure.
    rib.userData.island15OverviewExterior = index >= 1;
    shell.add(rib);
  });
  const leftVaultWeb = addBox(shell, `${name}_LEFT_VAULT_WEB`, [1.78, 0.08, 2.2], [-0.7, 2.3, -0.02], materials.castleShadow);
  leftVaultWeb.rotation.z = -0.5;
  leftVaultWeb.castShadow = false;
  leftVaultWeb.userData.island15OverviewExterior = true;
  const rightVaultWeb = addBox(shell, `${name}_RIGHT_VAULT_WEB`, [1.78, 0.08, 2.2], [0.7, 2.3, -0.02], materials.castleShadow);
  rightVaultWeb.rotation.z = 0.5;
  rightVaultWeb.castShadow = false;
  rightVaultWeb.userData.island15OverviewExterior = true;
  const leftTurret = addGothicSpire(shell, `${name}_LEFT_TURRET`, [-1.72, 0.18, -0.94], 2.75, materials, materials.crystalGlow, 0.34);
  const rightTurret = addGothicSpire(shell, `${name}_RIGHT_TURRET`, [1.72, 0.18, -0.94], 2.75, materials, accentMaterial, 0.34);
  const roofCrownCluster = addCrystalCluster(shell, `${name}_ROOF_CROWN_CLUSTER`, [0, 2.34, -1.08], accentMaterial, 0.54);
  leftTurret.userData.island15OverviewExterior = true;
  rightTurret.userData.island15OverviewExterior = true;
  roofCrownCluster.userData.island15OverviewExterior = true;

  // The ordinary board view shows a closed, fully volumetric castle wing.
  // Landmark focus hides only the local +Z facade to reveal the real room behind it.
  // Rear, side and roof construction remain physically present throughout the section view.
  const overviewExterior = new THREE.Group();
  overviewExterior.name = `${name}_OVERVIEW_EXTERIOR`;
  overviewExterior.userData.island15OverviewExterior = true;
  addBox(overviewExterior, `${name}_FRONT_WALL_LEFT`, [1.14, 1.86, 0.24], [-1.02, 1.08, 1.08], wallMaterial);
  addBox(overviewExterior, `${name}_FRONT_WALL_RIGHT`, [1.14, 1.86, 0.24], [1.02, 1.08, 1.08], wallMaterial);
  addBox(overviewExterior, `${name}_FRONT_WALL_CROWN`, [3.18, 0.48, 0.24], [0, 2.04, 1.08], materials.castleShadow);
  addFramedPointedArchWindow(
    overviewExterior,
    `${name}_FRONT_PORTAL`,
    0.76,
    1.46,
    [0, 0.3, 1.205],
    materials,
    materials.warmWindow,
  );
  overviewExterior.children.forEach((object) => {
    object.userData.island15OverviewExterior = true;
  });
  // Exterior skins and lancets keep the wing authored from the least flattering rear/side views.
  addBox(overviewExterior, `${name}_REAR_EXTERIOR_SKIN`, [2.9, 1.86, 0.08], [0, 1.08, -1.34], materials.castleShadow);
  [-0.76, 0, 0.76].forEach((x, index) => {
    addFramedPointedArchWindow(
      overviewExterior,
      `${name}_REAR_EXTERIOR_WINDOW_${index + 1}`,
      0.34,
      0.84,
      [x, 0.76, -1.39],
      materials,
      index === 1 ? materials.warmWindow : accentMaterial,
      Math.PI,
    );
  });
  [-0.42, 0.38].forEach((z, index) => {
    addFramedPointedArchWindow(overviewExterior, `${name}_EAST_EXTERIOR_WINDOW_${index + 1}`, 0.32, 0.72, [1.625, 0.86, z], materials, index ? accentMaterial : materials.crystalGlow, Math.PI * 0.5);
    addFramedPointedArchWindow(overviewExterior, `${name}_WEST_EXTERIOR_WINDOW_${index + 1}`, 0.32, 0.72, [-1.625, 0.86, z], materials, index ? materials.violetCrystal : materials.crystalGlow, -Math.PI * 0.5);
  });
  const rearRose = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), accentMaterial);
  rearRose.name = `${name}_REAR_ROSE_CRYSTAL`;
  rearRose.position.set(0, 1.8, -1.43);
  rearRose.rotation.z = Math.PI * 0.25;
  overviewExterior.add(rearRose);
  [-0.38, 0.38].forEach((z, index) => {
    addBox(overviewExterior, `${name}_EAST_GLOW_RECESS_${index + 1}`, [0.055, 0.68, 0.28], [1.64, 0.86, z], index ? accentMaterial : materials.crystalGlow);
    addBox(overviewExterior, `${name}_WEST_GLOW_RECESS_${index + 1}`, [0.055, 0.68, 0.28], [-1.64, 0.86, z], index ? materials.violetCrystal : materials.crystalGlow);
  });
  [-0.76, 0, 0.76].forEach((x, index) => {
    addBox(overviewExterior, `${name}_REAR_GLOW_RECESS_${index + 1}`, [0.28, 0.66, 0.055], [x, 0.88, -1.445], index === 1 ? materials.warmWindow : accentMaterial);
  });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.28, 1.18, 4), materials.deepIce);
  roof.name = `${name}_CRYSTAL_GABLE_ROOF`;
  roof.position.set(0, 2.78, -0.08);
  roof.rotation.y = Math.PI * 0.25;
  roof.scale.z = 0.72;
  roof.castShadow = true;
  // Generic satellite roofs were authored as one solid cone, so leaving them
  // mounted during a local +Z section hides the room as completely as the
  // façade. Treat the roof and its heart as presentation occluders; the rear
  // and side masonry, turrets and buttresses remain mounted for spatial depth.
  roof.userData.island15OverviewExterior = true;
  overviewExterior.add(roof);
  const roofCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), accentMaterial);
  roofCore.name = `${name}_ROOF_HEART`;
  roofCore.position.set(0, 3.54, -0.08);
  roofCore.scale.y = 1.62;
  roofCore.userData.island15OverviewExterior = true;
  overviewExterior.add(roofCore);
  canonicalizeIsland15StaticMaterials(overviewExterior);
  compactStaticGeometry(overviewExterior, `${name}_OVERVIEW_EXTERIOR`);
  shell.add(overviewExterior);

  if (level >= 3) {
    [-1.42, 1.42].forEach((x, index) => {
      const buttress = addBox(shell, `${name}_GOTHIC_BUTTRESS_${index + 1}`, [0.28, 2.15, 0.58], [x, 1.16, -0.72], materials.midnight);
      buttress.rotation.z = index ? -0.08 : 0.08;
      buttress.userData.island15OverviewExterior = true;
      const crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), index ? materials.violetCrystal : materials.crystalGlow);
      crown.name = `${name}_GOTHIC_CRYSTAL_${index + 1}`;
      crown.position.set(x, 2.52, -0.78);
      crown.scale.y = 1.65;
      crown.userData.island15OverviewExterior = true;
      shell.add(crown);
    });
  }
  root.add(shell);
  return shell;
}

function addFrostNestInterior(root: THREE.Group, level: BuildLevel, materials: Island15CrystalGlacierMaterials) {
  const room = addRoomShell(root, 'ISLAND_15_FROST_NEST', level, materials, materials.violetCrystal, materials.midnight);
  // This room is an intimate Gothic sanctuary, not one of the pale exterior galleries.
  // The generic vault webs read as a giant V across this unusually close mobile
  // cutaway, so Frost Nest keeps the ribs and rear springing but opens the roof
  // above the cradle. The complete roof remains available in the overview shell.
  room.children.forEach((child) => {
    const isFrostVaultWeb = child.name.includes('LEFT_VAULT_WEB')
      || child.name.includes('RIGHT_VAULT_WEB');
    if (
      child.name.includes('DOLLHOUSE_PROSCENIUM_ARCH')
      || child.name.includes('ROOF_CROWN_CLUSTER')
      || isFrostVaultWeb
      || child.name.includes('BACK_WINDOW_')
    ) child.visible = false;
    // Geometry compaction intentionally excludes overview-exterior meshes.
    // Without this semantic flag the hidden generic webs are merged into a
    // visible batch and reappear as a giant chevron in the focused nursery.
    if (isFrostVaultWeb) child.userData.island15OverviewExterior = true;
    if (child.name.includes('CRYSTAL_VAULT_RIB')) {
      child.position.y += 0.18;
      child.scale.y = 0.42;
    }
  });
  addBox(room, 'ISLAND_15_FROST_NEST_DARK_APSE', [2.72, 1.86, 0.12], [0, 1.25, -1.02], materials.midnight);
  addBox(room, 'ISLAND_15_FROST_NEST_LEFT_INNER_WALL', [0.1, 1.58, 1.72], [-1.34, 1.02, -0.22], materials.castleShadow);
  addBox(room, 'ISLAND_15_FROST_NEST_RIGHT_INNER_WALL', [0.1, 1.58, 1.72], [1.34, 1.02, -0.22], materials.castleShadow);
  addFramedPointedArchWindow(room, 'ISLAND_15_FROST_NEST_CATHEDRAL_WINDOW', 0.94, 1.34, [0, 0.52, -0.94], materials, materials.heroCrystal);
  [-0.25, 0, 0.25].forEach((x, index) => {
    const lancetMaterial = index === 1 ? materials.warmWindow : index === 0 ? materials.crystalGlow : materials.violetCrystal;
    const lancet = addPointedArchWindow(room, `ISLAND_15_FROST_NEST_WINDOW_LANCET_${index + 1}`, 0.14, 0.82, [x, 0.76, -0.905], lancetMaterial);
    lancet.scale.set(0.9, 0.9, 0.9);
  });
  const windowHalo = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 7, 36, Math.PI), materials.gold);
  windowHalo.name = 'ISLAND_15_FROST_NEST_WINDOW_GOLDEN_HALO';
  windowHalo.position.set(0, 1.42, -0.89);
  windowHalo.scale.y = 0.66;
  room.add(windowHalo);
  const roseWindow = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), materials.violetCrystal);
  roseWindow.name = 'ISLAND_15_FROST_NEST_ROSE_CRYSTAL';
  roseWindow.position.set(0, 1.76, -0.86);
  roseWindow.rotation.z = Math.PI * 0.25;
  room.add(roseWindow);
  [-1.14, -0.72, 0.72, 1.14].forEach((x, index) => {
    const column = addBox(room, `ISLAND_15_FROST_NEST_APSE_COLUMN_${index + 1}`, [0.11, 1.72, 0.16], [x, 1.08, -0.84], materials.castleShadow);
    column.rotation.z = x < 0 ? -0.025 : 0.025;
    const capital = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), index % 2 ? materials.violetCrystal : materials.crystalGlow);
    capital.name = `ISLAND_15_FROST_NEST_APSE_CAPITAL_${index + 1}`;
    capital.position.set(x, 1.96, -0.82);
    capital.scale.y = 1.35;
    room.add(capital);
  });
  [-0.82, 0, 0.82].forEach((x, index) => {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.98 - Math.abs(x) * 0.08, 0.03, 6, 30, Math.PI), index === 1 ? materials.violetCrystal : materials.silver);
    rib.name = `ISLAND_15_FROST_NEST_GOTHIC_CEILING_RIB_${index + 1}`;
    rib.position.set(0, 1.9, -0.96 + index * 0.32);
    rib.scale.y = 0.38;
    room.add(rib);
  });
  const nestHearth = new THREE.PointLight(0xff8848, 1.18, 3.35, 2);
  nestHearth.name = 'ISLAND_15_FROST_NEST_HEARTH_LIGHT';
  nestHearth.position.set(-0.82, 0.92, -0.28);
  room.add(nestHearth);
  const moonNestLight = new THREE.PointLight(0x77dcff, 0.68, 2.65, 2);
  moonNestLight.name = 'ISLAND_15_FROST_NEST_MOONLIGHT';
  moonNestLight.position.set(0.28, 1.42, 0.56);
  room.add(moonNestLight);

  const nestDais = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.9, 0.13, 16), materials.castleShadow);
  nestDais.name = 'ISLAND_15_FROST_NEST_CRADLE_DAIS';
  nestDais.position.set(0, 0.3, 0.12);
  nestDais.scale.z = 0.82;
  room.add(nestDais);
  const warmthRug = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.055, 7, 36), materials.warmInterior);
  warmthRug.name = 'ISLAND_15_FROST_NEST_WARMTH_RUG';
  warmthRug.position.set(0, 0.385, 0.13);
  warmthRug.rotation.x = Math.PI * 0.5;
  warmthRug.scale.z = 0.78;
  room.add(warmthRug);
  const nestShape = new THREE.Shape();
  for (let index = 0; index < 16; index += 1) {
    const angle = index / 16 * Math.PI * 2;
    const radius = index % 2 ? 0.66 : 0.75;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * 0.82;
    if (index === 0) nestShape.moveTo(x, y);
    else nestShape.lineTo(x, y);
  }
  nestShape.closePath();
  const nest = new THREE.Mesh(new THREE.ExtrudeGeometry(nestShape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.045,
    bevelThickness: 0.04,
    curveSegments: 2,
  }), materials.warmInterior);
  nest.name = 'ISLAND_15_FROST_NEST_CRADLE';
  nest.rotation.x = -Math.PI * 0.5;
  nest.position.set(0, 0.43, 0.12);
  room.add(nest);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.22, 16), materials.deepIce);
  bowl.name = 'ISLAND_15_FROST_NEST_BOWL';
  bowl.position.set(0, 0.51, 0.12);
  bowl.scale.z = 0.84;
  room.add(bowl);
  const cradleRim = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.045, 7, 36), materials.gold);
  cradleRim.name = 'ISLAND_15_FROST_NEST_CRADLE_GOLDEN_RIM';
  cradleRim.position.set(0, 0.63, 0.12);
  cradleRim.rotation.x = Math.PI * 0.5;
  cradleRim.scale.z = 0.82;
  room.add(cradleRim);
  const eggCount = level >= 3 ? 5 : level >= 2 ? 3 : 1;
  const eggLayout = [
    [0, 0.91, -0.14, -0.02, 0.02],
    [-0.35, 0.8, 0.02, 0.06, -0.1],
    [0.35, 0.8, 0.02, -0.05, 0.1],
    [-0.23, 0.72, 0.31, 0.08, -0.12],
    [0.23, 0.72, 0.31, -0.07, 0.12],
  ] as const;
  const eggMaterials = [materials.crystalGlow, materials.warmWindow, materials.heroCrystal, materials.violetCrystal, materials.warmWindow] as const;
  for (let index = 0; index < eggCount; index += 1) {
    const egg = new THREE.Mesh(new THREE.SphereGeometry(index === 0 ? 0.215 : 0.2, 18, 12), eggMaterials[index]);
    egg.name = `ISLAND_15_FROST_NEST_EGG_${index + 1}`;
    egg.scale.set(1 + (index % 2) * 0.06, 1.42 + (index % 3) * 0.05, 1 - (index % 2) * 0.04);
    egg.position.set(eggLayout[index][0], eggLayout[index][1], eggLayout[index][2]);
    egg.rotation.x = eggLayout[index][3];
    egg.rotation.z = eggLayout[index][4];
    egg.userData.island15Animated = `frost-egg-${index}`;
    egg.userData.island15BaseY = egg.position.y;
    egg.userData.island15BaseRotationY = egg.rotation.y;
    egg.castShadow = true;
    const eggBand = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.014, 6, 24), index === 0 ? materials.gold : materials.silver);
    eggBand.name = `ISLAND_15_FROST_NEST_EGG_BAND_${index + 1}`;
    eggBand.position.y = -0.045;
    eggBand.rotation.x = Math.PI * 0.5;
    egg.add(eggBand);
    const eggStar = new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 0), materials.warmWindow);
    eggStar.name = `ISLAND_15_FROST_NEST_EGG_HEART_${index + 1}`;
    eggStar.position.set(0, 0.08, 0.17);
    eggStar.rotation.z = Math.PI * 0.25;
    egg.add(eggStar);
    room.add(egg);
  }
  if (level >= 2) {
    // The hearth sits beside the cradle rather than behind it so a phone-size
    // room focus can read all five eggs and the complete fireplace at once.
    const fireplaceMantle = addIsland15ExtrudedPointedReveal(room, 'ISLAND_15_FROST_NEST_FIREPLACE_MANTLE', 0.82, 1.22, 0.14, [-0.94, 0.36, -0.94], materials.silver);
    addBox(fireplaceMantle, 'ISLAND_15_FROST_NEST_FIREPLACE_MANTLE_LEDGE', [0.94, 0.08, 0.24], [0, 0.92, 0.16], materials.gold);
    addBox(fireplaceMantle, 'ISLAND_15_FROST_NEST_FIREPLACE_LEFT_JAMB', [0.08, 0.7, 0.16], [-0.35, 0.36, 0.14], materials.castleShadow);
    addBox(fireplaceMantle, 'ISLAND_15_FROST_NEST_FIREPLACE_RIGHT_JAMB', [0.08, 0.7, 0.16], [0.35, 0.36, 0.14], materials.castleShadow);
    addIsland15ExtrudedPointedReveal(room, 'ISLAND_15_FROST_NEST_FIREPLACE_FIREBOX', 0.54, 0.78, 0.08, [-0.94, 0.45, -0.75], materials.midnight);
    addBox(room, 'ISLAND_15_FROST_NEST_FIREPLACE_CHIMNEY', [0.54, 0.9, 0.2], [-0.94, 1.62, -0.91], materials.castle);
    const fireplaceFlame = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.42, 6), materials.warmWindow);
    fireplaceFlame.name = 'ISLAND_15_FROST_NEST_FIREPLACE_ORANGE_FLAME';
    fireplaceFlame.position.set(-0.94, 0.68, -0.64);
    fireplaceFlame.rotation.z = -0.18;
    fireplaceFlame.userData.island15Animated = 'frost-flame';
    fireplaceFlame.userData.island15BaseScaleY = fireplaceFlame.scale.y;
    room.add(fireplaceFlame);
    const fireplaceFlameSecond = fireplaceFlame.clone();
    fireplaceFlameSecond.name = 'ISLAND_15_FROST_NEST_FIREPLACE_ORANGE_FLAME_SECONDARY';
    fireplaceFlameSecond.position.set(0.12, -0.02, 0.015);
    fireplaceFlameSecond.scale.set(0.78, 0.82, 0.78);
    fireplaceFlameSecond.rotation.z = 0.22;
    fireplaceFlame.add(fireplaceFlameSecond);
    const ember = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), materials.gold);
    ember.name = 'ISLAND_15_FROST_NEST_FIREPLACE_EMBER';
    ember.position.set(-0.08, -0.16, 0.02);
    ember.scale.set(1.35, 0.5, 0.8);
    fireplaceFlame.add(ember);
    addCrystalCluster(room, 'ISLAND_15_FROST_NEST_HEALING_CRYSTALS', [-1.06, 0.12, 0.48], materials.crystalGlow, 0.38);
    addCrystalCluster(room, 'ISLAND_15_FROST_NEST_WARD_CRYSTALS', [1.04, 0.12, 0.54], materials.crystal, 0.36);
    [
      [-0.72, 0.43, -0.38, -0.22], [0.72, 0.43, -0.38, 0.22],
      [-0.92, 0.38, 0.16, -0.18], [0.92, 0.38, 0.16, 0.18],
    ].forEach(([x, y, z, tilt], index) => {
      const guard = addCrystal(room, `ISLAND_15_FROST_NEST_GUARD_CRYSTAL_${index + 1}`, [x, y, z], [0.22, 0.46, 0.22], index % 2 ? materials.violetCrystal : materials.crystalGlow, 6);
      guard.rotation.z = tilt;
    });
    [-0.72, 0, 0.72].forEach((x, index) => {
      const runeMaterial = index === 1 ? materials.warmWindow : index === 0 ? materials.crystalGlow : materials.violetCrystal;
      const rune = new THREE.Mesh(new THREE.OctahedronGeometry(0.11 + (index === 1 ? 0.04 : 0), 0), runeMaterial);
      rune.name = `ISLAND_15_FROST_NEST_WARMTH_RUNE_${index + 1}`;
      rune.position.set(x, 1.4 + (index === 1 ? 0.14 : 0), -0.97);
      rune.rotation.z = Math.PI * 0.25;
      room.add(rune);
    });
    [0.76, 1.12].forEach((shelfX, sideIndex) => {
      addBox(room, `ISLAND_15_FROST_NEST_CARE_SHELF_${sideIndex + 1}`, [0.3, 0.92, 0.18], [shelfX, 0.74, -0.88], materials.warmInterior);
      for (let row = 0; row < 3; row += 1) {
        addBox(room, `ISLAND_15_FROST_NEST_CARE_SHELF_${sideIndex + 1}_LEDGE_${row + 1}`, [0.33, 0.045, 0.22], [shelfX, 0.43 + row * 0.27, -0.8], row === 2 ? materials.gold : materials.silver);
        const bottle = new THREE.Mesh(new THREE.OctahedronGeometry(0.055 + row * 0.007, 0), (row + sideIndex) % 2 ? materials.violetCrystal : materials.crystalGlow);
        bottle.name = `ISLAND_15_FROST_NEST_CARE_VIAL_${sideIndex + 1}_${row + 1}`;
        bottle.position.set(shelfX - 0.06 + (row % 2) * 0.11, 0.52 + row * 0.27, -0.67);
        room.add(bottle);
      }
    });
    [-1.06, 1.06].forEach((x, index) => {
      const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.28, 8), materials.silver);
      brazier.name = `ISLAND_15_FROST_NEST_BRAZIER_${index + 1}`;
      brazier.position.set(x, 0.35, 0.58);
      room.add(brazier);
      const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), index ? materials.violetCrystal : materials.warmWindow);
      flame.name = `ISLAND_15_FROST_NEST_BRAZIER_FLAME_${index + 1}`;
      flame.position.set(x, 0.58, 0.58);
      flame.scale.y = 1.5;
      room.add(flame);
    });
  }
}

function addIceBastionInterior(root: THREE.Group, level: BuildLevel, materials: Island15CrystalGlacierMaterials) {
  const room = addRoomShell(root, 'ISLAND_15_ICE_BASTION', level, materials, materials.crystalGlow, materials.midnight);
  const addWeaponRod = (
    parent: THREE.Object3D,
    name: string,
    start: THREE.Vector3,
    end: THREE.Vector3,
    radius: number,
    material: THREE.Material,
  ) => {
    const direction = end.clone().sub(start);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 7), material);
    rod.name = name;
    rod.position.copy(start).add(end).multiplyScalar(0.5);
    rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    rod.castShadow = true;
    parent.add(rod);
    return rod;
  };

  const l1 = new THREE.Group();
  l1.name = 'ISLAND_15_ICE_BASTION_INTERIOR_L1_DISCIPLINE_CORE';
  l1.userData.buildStage = 1;
  addBox(l1, 'ISLAND_15_ICE_BASTION_TRAINING_DAIS', [1.5, 0.22, 0.92], [0, 0.25, -0.08], materials.ice);
  const daisCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.78, 0.16, 8), materials.castle);
  daisCrown.name = 'ISLAND_15_ICE_BASTION_RAISED_RUNE_DAIS_CROWN';
  daisCrown.position.set(0, 0.43, -0.08);
  daisCrown.castShadow = true;
  l1.add(daisCrown);
  const floorRune = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.045, 7, 32), materials.crystalGlow);
  floorRune.name = 'ISLAND_15_ICE_BASTION_DAIS_CYAN_RUNE';
  floorRune.position.set(0, 0.53, -0.08);
  floorRune.rotation.x = Math.PI * 0.5;
  l1.add(floorRune);
  for (let index = 0; index < 4; index += 1) {
    const runeBar = addBox(
      l1,
      `ISLAND_15_ICE_BASTION_DAIS_RUNE_BAR_${index + 1}`,
      [0.58, 0.035, 0.055],
      [0, 0.535, -0.08],
      index % 2 ? materials.silver : materials.crystalGlow,
    );
    runeBar.rotation.y = index * Math.PI * 0.25;
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.08, 8, 24), materials.crystalGlow);
  ring.name = 'ISLAND_15_ICE_BASTION_DISCIPLINE_RING';
  ring.position.set(0, 1.28, -1.08);
  ring.castShadow = true;
  ring.userData.island15Animated = 'bastion-discipline-ring';
  l1.add(ring);
  const ringCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.19, 0), materials.warmWindow);
  ringCore.name = 'ISLAND_15_ICE_BASTION_DISCIPLINE_RING_WARM_CORE';
  ringCore.position.set(0, 1.28, -1.05);
  ringCore.rotation.z = Math.PI * 0.25;
  l1.add(ringCore);
  [-0.88, 0.88].forEach((x, index) => {
    const station = new THREE.Group();
    station.name = `ISLAND_15_ICE_BASTION_ENDURANCE_STATION_${index + 1}`;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.18, 8), materials.castleShadow);
    base.name = `${station.name}_OCTAGONAL_BASE`;
    base.position.set(x, 0.31, 0.28);
    station.add(base);
    addBox(station, `${station.name}_PYLON`, [0.16, 1.18, 0.16], [x, 0.88, 0.28], materials.silver);
    [-0.22, 0.22].forEach((offset, barIndex) => {
      const grip = addBox(station, `${station.name}_GRIP_${barIndex + 1}`, [0.46, 0.075, 0.075], [x, 0.82 + offset, 0.28], index ? materials.violetCrystal : materials.crystalGlow);
      grip.rotation.z = index ? -0.08 : 0.08;
    });
    const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), index ? materials.violetCrystal : materials.crystalGlow);
    cap.name = `${station.name}_POWER_CAP`;
    cap.position.set(x, 1.55, 0.28);
    cap.scale.y = 1.4;
    station.add(cap);
    const interactionWheel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 7, 28), index ? materials.violetCrystal : materials.crystalGlow);
    interactionWheel.name = `${station.name}_RESISTANCE_WHEEL`;
    interactionWheel.position.set(x, 1.08, 0.42);
    station.add(interactionWheel);
    const weightCable = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.58, 6), materials.gold);
    weightCable.name = `${station.name}_WEIGHT_CABLE`;
    weightCable.position.set(x, 0.7, 0.43);
    station.add(weightCable);
    const resistanceWeight = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), index ? materials.crystalGlow : materials.violetCrystal);
    resistanceWeight.name = `${station.name}_RESISTANCE_WEIGHT`;
    resistanceWeight.position.set(x, 0.4, 0.43);
    resistanceWeight.scale.y = 1.4;
    resistanceWeight.userData.island15Animated = `bastion-weight-${index}`;
    resistanceWeight.userData.island15BaseY = resistanceWeight.position.y;
    station.add(resistanceWeight);
    l1.add(station);
  });
  [-0.88, 0.88].forEach((x, index) => {
    const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.19, 0.34, 8), materials.silver);
    brazier.name = `ISLAND_15_ICE_BASTION_CONTRAST_BRAZIER_${index + 1}`;
    brazier.position.set(x, 0.4, -0.72);
    l1.add(brazier);
    const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), index ? materials.crystalGlow : materials.warmWindow);
    flame.name = `ISLAND_15_ICE_BASTION_CONTRAST_FLAME_${index + 1}`;
    flame.position.set(x, 0.7, -0.72);
    flame.scale.y = 1.55;
    l1.add(flame);
    const light = new THREE.PointLight(index ? 0x52eaff : 0xff9b58, 0.72, 2.6, 2);
    light.name = `ISLAND_15_ICE_BASTION_CONTRAST_LIGHT_${index + 1}`;
    light.position.set(x, 0.78, -0.58);
    l1.add(light);
  });
  room.add(l1);

  if (level >= 2) {
    const l2 = new THREE.Group();
    l2.name = 'ISLAND_15_ICE_BASTION_INTERIOR_L2_WEAPONS_AND_BANNERS';
    l2.userData.buildStage = 2;
    [-0.82, 0.82].forEach((x, index) => {
      addBox(l2, `ISLAND_15_ICE_BASTION_BANNER_${index + 1}`, [0.42, 0.86, 0.055], [x, 1.25, -1.2], index ? materials.crystalGlow : materials.warmWindow);
      addBox(l2, `ISLAND_15_ICE_BASTION_BANNER_RAIL_${index + 1}`, [0.58, 0.055, 0.08], [x, 1.72, -1.17], materials.gold);
      const spear = addCrystal(l2, `ISLAND_15_ICE_BASTION_SPEAR_${index + 1}`, [x, 0.82, 0.62], [0.18, 0.92, 0.18], materials.silver, 5);
      spear.rotation.z = index ? -0.16 : 0.16;
    });
    const crossedRack = new THREE.Group();
    crossedRack.name = 'ISLAND_15_ICE_BASTION_CROSSED_WEAPON_RACK';
    addBox(crossedRack, 'ISLAND_15_ICE_BASTION_WEAPON_RACK_BACKPLATE', [1.18, 0.82, 0.08], [0, 1.04, -1.18], materials.castleShadow);
    [
      [new THREE.Vector3(-0.42, 0.7, -1.08), new THREE.Vector3(0.42, 1.62, -1.08)],
      [new THREE.Vector3(0.42, 0.7, -1.06), new THREE.Vector3(-0.42, 1.62, -1.06)],
    ].forEach(([start, end], index) => {
      addWeaponRod(crossedRack, `ISLAND_15_ICE_BASTION_CROSSED_WEAPON_SHAFT_${index + 1}`, start, end, 0.035, materials.gold);
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.38, 5), index ? materials.violetCrystal : materials.crystalGlow);
      blade.name = `ISLAND_15_ICE_BASTION_CROSSED_WEAPON_BLADE_${index + 1}`;
      blade.position.copy(end);
      blade.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
      crossedRack.add(blade);
    });
    l2.add(crossedRack);
    [-1.22, 1.22].forEach((x, index) => {
      const target = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.045, 7, 28), index ? materials.warmWindow : materials.crystalGlow);
      target.name = `ISLAND_15_ICE_BASTION_ENDURANCE_TARGET_${index + 1}`;
      target.position.set(x, 1.14, -0.32);
      target.rotation.y = Math.PI * 0.5;
      l2.add(target);
    });
    room.add(l2);
  }
  if (level >= 3) {
    const l3 = new THREE.Group();
    l3.name = 'ISLAND_15_ICE_BASTION_INTERIOR_L3_VICTORY_COMMISSIONING';
    l3.userData.buildStage = 3;
    addCrystalCluster(l3, 'ISLAND_15_ICE_BASTION_VICTORY_CRYSTALS', [-1.02, 0.18, 0.42], materials.crystalGlow, 0.48);
    addBox(l3, 'ISLAND_15_ICE_BASTION_VICTORY_BALCONY', [2.2, 0.22, 0.82], [0, 1.68, -0.78], materials.castleShadow);
    addBox(l3, 'ISLAND_15_ICE_BASTION_VICTORY_BALCONY_RAIL', [2.28, 0.1, 0.1], [0, 2.08, -0.5], materials.silver);
    [-1.05, -0.52, 0, 0.52, 1.05].forEach((x, index) => {
      addBox(l3, `ISLAND_15_ICE_BASTION_VICTORY_BALUSTER_${index + 1}`, [0.055, 0.38, 0.055], [x, 1.9, -0.5], index === 2 ? materials.gold : materials.silver);
    });
    [-0.82, 0.82].forEach((x, index) => {
      addBox(l3, `ISLAND_15_ICE_BASTION_BALCONY_SUPPORT_${index + 1}`, [0.14, 1.02, 0.14], [x, 1.1, -0.82], materials.silver);
    });
    [-0.42, 0, 0.42].forEach((z, index) => {
      addBox(l3, `ISLAND_15_ICE_BASTION_COMMISSIONING_STEP_${index + 1}`, [0.86 + index * 0.26, 0.09, 0.24], [0, 0.28 + index * 0.09, 0.72 - index * 0.25], materials.castle);
    });
    const victoryHalo = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 7, 36), materials.silver);
    victoryHalo.name = 'ISLAND_15_ICE_BASTION_VICTORY_HALO';
    victoryHalo.position.set(0, 1.77, -1.08);
    l3.add(victoryHalo);
    [-0.58, 0.58].forEach((x, index) => {
      const oathCrystal = addCrystal(l3, `ISLAND_15_ICE_BASTION_OATH_CRYSTAL_${index + 1}`, [x, 1.98, -1.12], [0.15, 0.34, 0.15], index ? materials.violetCrystal : materials.crystalGlow, 6);
      oathCrystal.rotation.z = index ? -0.08 : 0.08;
    });
    room.add(l3);
  }
}

function addOracleLibraryInterior(root: THREE.Group, level: BuildLevel, materials: Island15CrystalGlacierMaterials) {
  const room = addRoomShell(root, 'ISLAND_15_ORACLE_LIBRARY', level, materials, materials.crystalGlow, materials.castleShadow);
  const l1 = new THREE.Group();
  l1.name = 'ISLAND_15_ORACLE_LIBRARY_INTERIOR_L1_READING_ARCHIVE';
  l1.userData.buildStage = 1;
  [-1.02, 1.02].forEach((x, side) => {
    addBox(l1, `ISLAND_15_ORACLE_BOOKCASE_${side + 1}`, [0.64, 1.36, 0.28], [x, 0.84, -0.94], materials.warmInterior);
    for (let row = 0; row < 4; row += 1) {
      addBox(l1, row < 3
        ? `ISLAND_15_ORACLE_BOOKCASE_${side + 1}_SHELF_${row + 1}`
        : `ISLAND_15_ORACLE_BOOKCASE_${side + 1}_UPPER_SHELF`, [0.6, 0.055, 0.32], [x, 0.32 + row * 0.34, -0.9], materials.silver);
      for (let book = 0; book < 6; book += 1) {
        const palette = (book + row + side) % 4;
        const bookMaterial = palette === 0
          ? materials.warmWindow
          : palette === 1
            ? materials.crystalGlow
            : palette === 2
              ? materials.violetCrystal
              : materials.gold;
        addBox(
          l1,
          `ISLAND_15_ORACLE_BOOK_SPINE_${side + 1}_${row + 1}_${book + 1}`,
          [0.055 + (book % 2) * 0.018, 0.2 + (book % 3) * 0.035, 0.06],
          [x - 0.235 + book * 0.094, 0.46 + row * 0.34, -0.73],
          bookMaterial,
        );
      }
    }
  });
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.46, 0.58, 8), materials.castleShadow);
  pedestal.name = 'ISLAND_15_ORACLE_PEDESTAL';
  pedestal.position.set(0, 0.42, -0.2);
  pedestal.castShadow = true;
  l1.add(pedestal);
  const pedestalBand = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.04, 7, 30), materials.gold);
  pedestalBand.name = 'ISLAND_15_ORACLE_PEDESTAL_GOLD_MEMORY_BAND';
  pedestalBand.position.set(0, 0.63, -0.2);
  pedestalBand.rotation.x = Math.PI * 0.5;
  l1.add(pedestalBand);
  const oracle = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 14), materials.heroCrystal);
  oracle.name = 'ISLAND_15_ORACLE_HEART';
  oracle.position.set(0, 1.05, -0.2);
  oracle.userData.island15Animated = 'oracle';
  oracle.castShadow = true;
  l1.add(oracle);
  const oracleCore = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), materials.crystalGlow);
  oracleCore.name = 'ISLAND_15_ORACLE_HEART_INNER_LUMEN';
  oracleCore.position.copy(oracle.position);
  l1.add(oracleCore);
  const oracleRim = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.028, 7, 34), materials.violetCrystal);
  oracleRim.name = 'ISLAND_15_ORACLE_HEART_REFRACTION_RIM';
  oracleRim.position.copy(oracle.position);
  oracleRim.rotation.x = Math.PI * 0.5;
  l1.add(oracleRim);
  const oracleInnerLight = new THREE.PointLight(0x5cefff, 1.2, 3.2, 2);
  oracleInnerLight.name = 'ISLAND_15_ORACLE_HEART_INNER_LIGHT';
  oracleInnerLight.position.set(0, 1.12, -0.12);
  l1.add(oracleInnerLight);
  [-0.98, 0.98].forEach((x, index) => {
    const desk = new THREE.Group();
    desk.name = `ISLAND_15_ORACLE_STUDY_DESK_${index + 1}`;
    addBox(desk, `${desk.name}_TOP`, [0.64, 0.09, 0.42], [x, 0.62, 0.46], materials.castle);
    [-0.22, 0.22].forEach((offset, legIndex) => {
      addBox(desk, `${desk.name}_LEG_${legIndex + 1}`, [0.08, 0.48, 0.08], [x + offset, 0.36, 0.46], materials.silver);
    });
    addBox(desk, `${desk.name}_OPEN_SCROLL`, [0.4, 0.025, 0.24], [x, 0.68, 0.46], index ? materials.crystalGlow : materials.warmWindow);
    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.22, 8), materials.gold);
    lampBase.name = `${desk.name}_LAMP_BASE`;
    lampBase.position.set(x + (index ? -0.2 : 0.2), 0.78, 0.43);
    desk.add(lampBase);
    const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), materials.warmWindow);
    lamp.name = `${desk.name}_WARM_LAMP`;
    lamp.position.set(x + (index ? -0.2 : 0.2), 1.0, 0.43);
    lamp.scale.y = 1.35;
    desk.add(lamp);
    const lampLight = new THREE.PointLight(0xffa261, 0.58, 2.2, 2);
    lampLight.name = `${desk.name}_WARM_LIGHT`;
    lampLight.position.set(x + (index ? -0.2 : 0.2), 1.04, 0.34);
    desk.add(lampLight);
    l1.add(desk);
  });
  room.add(l1);

  if (level >= 2) {
    const l2 = new THREE.Group();
    l2.name = 'ISLAND_15_ORACLE_LIBRARY_INTERIOR_L2_MEMORY_ARCHIVE';
    l2.userData.buildStage = 2;
    addBox(l2, 'ISLAND_15_ORACLE_REAR_ARCHIVE_CASE', [2.36, 0.76, 0.24], [0, 1.82, -1.13], materials.warmInterior);
    for (let shelf = 0; shelf < 2; shelf += 1) {
      addBox(l2, `ISLAND_15_ORACLE_REAR_ARCHIVE_SHELF_${shelf + 1}`, [2.25, 0.055, 0.28], [0, 1.56 + shelf * 0.38, -1.09], materials.silver);
      for (let scroll = 0; scroll < 9; scroll += 1) {
        const scrollMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.045, 0.045, 0.2 + (scroll % 3) * 0.035, 7),
          (scroll + shelf) % 3 === 0 ? materials.warmWindow : (scroll + shelf) % 2 ? materials.violetCrystal : materials.crystalGlow,
        );
        scrollMesh.name = `ISLAND_15_ORACLE_ARCHIVE_SCROLL_${shelf + 1}_${scroll + 1}`;
        scrollMesh.position.set(-0.96 + scroll * 0.24, 1.7 + shelf * 0.38, -0.91);
        scrollMesh.rotation.z = Math.PI * 0.5;
        l2.add(scrollMesh);
      }
    }
    const memoryHalo = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.022, 7, 34), materials.silver);
    memoryHalo.name = 'ISLAND_15_ORACLE_MEMORY_HALO_1';
    memoryHalo.position.set(0, 1.05, -0.2);
    memoryHalo.rotation.set(0.08, 0.18, 0);
    memoryHalo.userData.island15Animated = 'oracle-memory-halo-0';
    l2.add(memoryHalo);
    addBox(l2, 'ISLAND_15_ORACLE_ARCHIVE_WALK', [2.42, 0.18, 0.74], [0, 1.4, -0.78], materials.castleShadow);
    addBox(l2, 'ISLAND_15_ORACLE_ARCHIVE_WALK_RAIL', [2.48, 0.075, 0.075], [0, 1.82, -0.38], materials.gold);
    [-1.12, -0.56, 0, 0.56, 1.12].forEach((x, index) => {
      addBox(l2, `ISLAND_15_ORACLE_ARCHIVE_WALK_BALUSTER_${index + 1}`, [0.045, 0.38, 0.045], [x, 1.63, -0.38], materials.silver);
    });
    [-0.92, 0.92].forEach((x, index) => {
      addBox(l2, `ISLAND_15_ORACLE_ARCHIVE_WALK_SUPPORT_${index + 1}`, [0.11, 0.9, 0.11], [x, 0.94, -0.78], materials.silver);
    });
    [-0.52, 0.52].forEach((x, index) => {
      const page = addBox(l2, `ISLAND_15_ORACLE_FLOATING_PAGE_${index + 1}`, [0.3, 0.025, 0.22], [x, 1.25 + index * 0.2, -0.05], index ? materials.crystalGlow : materials.warmWindow);
      page.rotation.set(0.12, index ? -0.32 : 0.32, index ? 0.16 : -0.16);
      page.userData.island15Animated = `oracle-page-${index}`;
      page.userData.island15BaseY = page.position.y;
      page.userData.island15BaseRotationY = page.rotation.y;
    });
    room.add(l2);
  }
  if (level >= 3) {
    const l3 = new THREE.Group();
    l3.name = 'ISLAND_15_ORACLE_LIBRARY_INTERIOR_L3_ORACLE_COMMISSIONING';
    l3.userData.buildStage = 3;
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.035, 6, 28), materials.silver);
    halo.name = 'ISLAND_15_ORACLE_HALO';
    halo.position.set(0, 1.05, -0.2);
    halo.rotation.x = Math.PI * 0.5;
    halo.userData.island15Animated = 'oracle-halo';
    l3.add(halo);
    const crownHalo = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.025, 7, 40), materials.gold);
    crownHalo.name = 'ISLAND_15_ORACLE_CROWN_HALO';
    crownHalo.position.set(0, 1.05, -0.2);
    crownHalo.rotation.set(Math.PI * 0.5, 0, 0);
    crownHalo.userData.island15Animated = 'oracle-crown-halo';
    l3.add(crownHalo);
    const visionPool = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.78, 0.055, 18), materials.heroCrystal);
    visionPool.name = 'ISLAND_15_ORACLE_VISION_POOL';
    visionPool.position.set(0, 0.23, -0.2);
    l3.add(visionPool);
    const poolReflection = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.58, 0.025, 18), materials.crystalGlow);
    poolReflection.name = 'ISLAND_15_ORACLE_VISION_POOL_REFLECTION';
    poolReflection.position.set(0, 0.27, -0.2);
    l3.add(poolReflection);
    [-0.78, 0.78].forEach((x, index) => {
      const memoryCrystal = addCrystal(l3, `ISLAND_15_ORACLE_MEMORY_CRYSTAL_${index + 1}`, [x, 2.3, -1.04], [0.16, 0.34, 0.16], index ? materials.violetCrystal : materials.crystalGlow, 6);
      memoryCrystal.rotation.z = index ? -0.09 : 0.09;
    });
    const oracleLight = new THREE.PointLight(0x72eaff, 0.9, 3.4, 2);
    oracleLight.name = 'ISLAND_15_ORACLE_HEART_LIGHT';
    oracleLight.position.set(0, 1.38, -0.12);
    l3.add(oracleLight);
    room.add(l3);
  }
}

function addAuroraObservatoryInterior(root: THREE.Group, level: BuildLevel, materials: Island15CrystalGlacierMaterials) {
  const room = addRoomShell(root, 'ISLAND_15_AURORA_OBSERVATORY', level, materials, materials.crystalGlow, materials.deepIce);
  const l1 = new THREE.Group();
  l1.name = 'ISLAND_15_AURORA_OBSERVATORY_INTERIOR_L1_ORRERY_CORE';
  l1.userData.buildStage = 1;
  const chartRing = new THREE.Mesh(new THREE.TorusGeometry(1.16, 0.035, 7, 42), materials.silver);
  chartRing.name = 'ISLAND_15_AURORA_OBSERVATORY_STAR_CHART_FLOOR_RING';
  chartRing.position.set(0, 0.205, -0.18);
  chartRing.rotation.x = Math.PI * 0.5;
  l1.add(chartRing);
  for (let index = 0; index < 8; index += 1) {
    const spoke = addBox(
      l1,
      `ISLAND_15_AURORA_OBSERVATORY_STAR_CHART_SPOKE_${index + 1}`,
      [0.94, 0.025, 0.035],
      [0, 0.205, -0.18],
      index % 2 ? materials.violetCrystal : materials.crystalGlow,
    );
    spoke.rotation.y = index * Math.PI * 0.25;
  }
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.96, 0.18, 12), materials.midnight);
  platform.name = 'ISLAND_15_AURORA_OBSERVATORY_PLATFORM';
  platform.position.set(0, 0.3, -0.18);
  platform.castShadow = true;
  l1.add(platform);
  const platformInlay = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.045, 7, 36), materials.gold);
  platformInlay.name = 'ISLAND_15_AURORA_OBSERVATORY_PLATFORM_GOLD_INLAY';
  platformInlay.position.set(0, 0.4, -0.18);
  platformInlay.rotation.x = Math.PI * 0.5;
  l1.add(platformInlay);
  const prism = new THREE.Mesh(new THREE.OctahedronGeometry(0.46, 0), materials.crystalGlow);
  prism.name = 'ISLAND_15_AURORA_OBSERVATORY_PRISM';
  prism.position.set(0, 1.08, -0.18);
  prism.userData.island15Animated = 'prism';
  prism.castShadow = true;
  l1.add(prism);
  for (let index = 0; index < 2; index += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72 + index * 0.18, 0.045, 7, 36), index === 1 ? materials.warmWindow : materials.silver);
    ring.name = `ISLAND_15_AURORA_OBSERVATORY_RING_${index + 1}`;
    ring.position.set(0, 1.08, -0.18);
    ring.rotation.set(Math.PI * (0.22 + index * 0.18), index * 0.52, index * 0.14);
    ring.userData.island15Animated = `observatory-ring-${index}`;
    ring.castShadow = true;
    l1.add(ring);
  }
  const polarAxis = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.92, 7), materials.gold);
  polarAxis.name = 'ISLAND_15_AURORA_OBSERVATORY_POLAR_AXIS';
  polarAxis.position.set(0, 1.08, -0.18);
  polarAxis.rotation.z = Math.PI * 0.31;
  l1.add(polarAxis);
  room.add(l1);

  if (level >= 2) {
    const l2 = new THREE.Group();
    l2.name = 'ISLAND_15_AURORA_OBSERVATORY_INTERIOR_L2_CONSOLES_AND_LIGHT_POOLS';
    l2.userData.buildStage = 2;
    [-1.08, 1.08].forEach((x, index) => {
      const consoleGroup = new THREE.Group();
      consoleGroup.name = `ISLAND_15_AURORA_OBSERVATORY_CALIBRATION_CONSOLE_${index + 1}`;
      addBox(consoleGroup, `${consoleGroup.name}_BASE`, [0.5, 0.58, 0.38], [x, 0.52, 0.28], materials.castleShadow);
      const screen = addBox(consoleGroup, `${consoleGroup.name}_PRISM_SCREEN`, [0.4, 0.34, 0.06], [x, 0.87, 0.19], index ? materials.violetCrystal : materials.crystalGlow);
      screen.rotation.x = -0.28;
      for (let control = 0; control < 3; control += 1) {
        const key = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), control === 1 ? materials.warmWindow : materials.gold);
        key.name = `${consoleGroup.name}_CONTROL_${control + 1}`;
        key.position.set(x - 0.12 + control * 0.12, 0.72, 0.46);
        consoleGroup.add(key);
      }
      l2.add(consoleGroup);
      const pool = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.035, 16), index ? materials.violetCrystal : materials.crystalGlow);
      pool.name = `ISLAND_15_AURORA_OBSERVATORY_COLORED_LIGHT_POOL_${index + 1}`;
      pool.position.set(x, 0.205, -0.58);
      l2.add(pool);
      const poolLight = new THREE.PointLight(index ? 0xa36cff : 0x42eaff, 0.62, 2.5, 2);
      poolLight.name = `ISLAND_15_AURORA_OBSERVATORY_POOL_LIGHT_${index + 1}`;
      poolLight.position.set(x, 0.62, -0.58);
      l2.add(poolLight);
    });
    [-0.78, 0, 0.78].forEach((x, index) => {
      const starNode = new THREE.Mesh(new THREE.OctahedronGeometry(0.12 + (index === 1 ? 0.04 : 0), 0), index === 1 ? materials.warmWindow : index ? materials.violetCrystal : materials.crystalGlow);
      starNode.name = `ISLAND_15_AURORA_OBSERVATORY_REAR_STAR_NODE_${index + 1}`;
      starNode.position.set(x, 1.78 + (index === 1 ? 0.22 : 0), -1.1);
      starNode.rotation.z = Math.PI * 0.25;
      l2.add(starNode);
      const orbit = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.022, 6, 24), materials.silver);
      orbit.name = `ISLAND_15_AURORA_OBSERVATORY_REAR_STAR_ORBIT_${index + 1}`;
      orbit.position.copy(starNode.position);
      orbit.rotation.set(index * 0.24, index * 0.38, 0);
      l2.add(orbit);
    });
    room.add(l2);
  }

  if (level >= 3) {
    const l3 = new THREE.Group();
    l3.name = 'ISLAND_15_AURORA_OBSERVATORY_INTERIOR_L3_AURORA_LENS';
    l3.userData.buildStage = 3;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.04, 7, 42), materials.violetCrystal);
    ring.name = 'ISLAND_15_AURORA_OBSERVATORY_RING_3';
    ring.position.set(0, 1.08, -0.18);
    ring.rotation.set(Math.PI * 0.48, Math.PI * 0.32, Math.PI * 0.18);
    ring.userData.island15Animated = 'observatory-ring-2';
    l3.add(ring);
    const projectorBeam = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.48, 10, 1, true), materials.heroCrystal);
    projectorBeam.name = 'ISLAND_15_AURORA_OBSERVATORY_UPWARD_PROJECTOR_BEAM';
    projectorBeam.position.set(0, 2.78, -0.2);
    projectorBeam.userData.island15Animated = 'observatory-projector-beam';
    l3.add(projectorBeam);
    const lens = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), materials.heroCrystal);
    lens.name = 'ISLAND_15_AURORA_OBSERVATORY_AURORA_LENS';
    lens.position.set(0, 2.12, -0.2);
    lens.scale.y = 1.72;
    lens.userData.island15Animated = 'observatory-lens';
    l3.add(lens);
    const lensCradle = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.04, 7, 34), materials.gold);
    lensCradle.name = 'ISLAND_15_AURORA_OBSERVATORY_LENS_CRADLE';
    lensCradle.position.set(0, 2.12, -0.2);
    lensCradle.rotation.x = Math.PI * 0.5;
    l3.add(lensCradle);
    const skyAperture = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.045, 7, 40), materials.violetCrystal);
    skyAperture.name = 'ISLAND_15_AURORA_OBSERVATORY_SKY_APERTURE';
    skyAperture.position.set(0, 3.34, -0.2);
    skyAperture.rotation.x = Math.PI * 0.5;
    l3.add(skyAperture);
    addBox(l3, 'ISLAND_15_AURORA_OBSERVATORY_SERVICE_WALK', [2.34, 0.2, 0.78], [0, 1.58, -0.76], materials.castleShadow);
    addBox(l3, 'ISLAND_15_AURORA_OBSERVATORY_SERVICE_WALK_RAIL', [2.42, 0.075, 0.075], [0, 1.98, -0.34], materials.gold);
    [-1.08, -0.54, 0, 0.54, 1.08].forEach((x, index) => {
      addBox(l3, `ISLAND_15_AURORA_OBSERVATORY_SERVICE_BALUSTER_${index + 1}`, [0.045, 0.38, 0.045], [x, 1.8, -0.34], index === 2 ? materials.violetCrystal : materials.silver);
    });
    [-0.9, 0.9].forEach((x, index) => {
      addBox(l3, `ISLAND_15_AURORA_OBSERVATORY_SERVICE_SUPPORT_${index + 1}`, [0.12, 0.94, 0.12], [x, 1.1, -0.76], materials.silver);
    });
    const prismLight = new THREE.PointLight(0x5ceeff, 1.05, 3.5, 2);
    prismLight.name = 'ISLAND_15_AURORA_OBSERVATORY_COMMISSIONED_PRISM_LIGHT';
    prismLight.position.set(0, 1.42, -0.05);
    l3.add(prismLight);
    room.add(l3);
  }
}

function addPointedArchWindow(
  parent: THREE.Object3D,
  name: string,
  width: number,
  height: number,
  position: readonly [number, number, number],
  material: THREE.Material,
  rotationY = 0,
) {
  const shape = new THREE.Shape();
  shape.moveTo(-width * 0.5, 0);
  shape.lineTo(-width * 0.5, height * 0.56);
  shape.quadraticCurveTo(-width * 0.42, height * 0.8, 0, height);
  shape.quadraticCurveTo(width * 0.42, height * 0.8, width * 0.5, height * 0.56);
  shape.lineTo(width * 0.5, 0);
  shape.closePath();
  const window = new THREE.Mesh(new THREE.ShapeGeometry(shape, 8), material);
  window.name = name;
  window.position.set(...position);
  window.rotation.y = rotationY;
  parent.add(window);
  return window;
}

function addFrozenThroneKeepV2Retired(root: THREE.Group, level: BuildLevel, materials: Island15CrystalGlacierMaterials) {
  const keep = new THREE.Group();
  keep.name = 'ISLAND_15_FROZEN_THRONE_KEEP';
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.48, 0.42, 8), materials.midnight);
  plinth.name = 'ISLAND_15_KEEP_PLINTH';
  plinth.position.y = 0.21;
  keep.add(plinth);
  const lowerTier = new THREE.Mesh(new THREE.CylinderGeometry(1.72, 2.14, 2.62, 8), materials.castleShadow);
  lowerTier.name = 'ISLAND_15_KEEP_GOTHIC_LOWER_TIER';
  lowerTier.position.set(0, 1.55, -0.12);
  lowerTier.scale.z = 0.88;
  lowerTier.castShadow = true;
  lowerTier.receiveShadow = true;
  keep.add(lowerTier);
  const middleTier = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.6, 2.02, 8), materials.midnight);
  middleTier.name = 'ISLAND_15_KEEP_GOTHIC_MIDDLE_TIER';
  middleTier.position.set(0, 3.72, -0.18);
  middleTier.scale.z = 0.88;
  middleTier.castShadow = true;
  middleTier.receiveShadow = true;
  keep.add(middleTier);
  const crownTier = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 1.05, 1.52, 8), materials.castleShadow);
  crownTier.name = 'ISLAND_15_KEEP_GOTHIC_CROWN_TIER';
  crownTier.position.set(0, 5.42, -0.22);
  crownTier.scale.z = 0.9;
  crownTier.castShadow = true;
  crownTier.receiveShadow = true;
  keep.add(crownTier);
  const lowerBand = new THREE.Mesh(new THREE.CylinderGeometry(1.82, 1.86, 0.18, 8), materials.silver);
  lowerBand.name = 'ISLAND_15_KEEP_LOWER_SILVER_BAND';
  lowerBand.position.set(0, 2.8, -0.12);
  lowerBand.scale.z = 0.9;
  keep.add(lowerBand);
  const middleBand = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.32, 0.16, 8), materials.silver);
  middleBand.name = 'ISLAND_15_KEEP_MIDDLE_SILVER_BAND';
  middleBand.position.set(0, 4.7, -0.18);
  middleBand.scale.z = 0.9;
  keep.add(middleBand);

  const lowerButtressPositions: readonly (readonly [number, number, number])[] = [
    [-1.78, 1.35, 1.28], [1.78, 1.35, 1.28], [-1.78, 1.35, -1.52], [1.78, 1.35, -1.52],
  ];
  lowerButtressPositions.forEach((position, index) => {
    addBox(keep, `ISLAND_15_KEEP_GOTHIC_BUTTRESS_${index + 1}`, [0.38, 2.55, 0.48], position, materials.midnight);
    const buttressCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), index % 2 ? materials.violetCrystal : materials.crystalGlow);
    buttressCrystal.name = `ISLAND_15_KEEP_BUTTRESS_CRYSTAL_${index + 1}`;
    buttressCrystal.position.set(position[0], 3.04, position[2]);
    buttressCrystal.scale.y = 1.8 + (index % 2) * 0.28;
    keep.add(buttressCrystal);
  });

  addPointedArchWindow(keep, 'ISLAND_15_KEEP_GREAT_AMBER_GATE', 1.28, 1.82, [0, 0.42, 1.79], materials.warmWindow);
  const gateKeystone = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), materials.violetCrystal);
  gateKeystone.name = 'ISLAND_15_KEEP_GREAT_GATE_KEYSTONE';
  gateKeystone.position.set(0, 2.5, 1.83);
  gateKeystone.scale.y = 1.35;
  keep.add(gateKeystone);
  [-0.98, 0.98].forEach((x, index) => {
    addPointedArchWindow(keep, `ISLAND_15_KEEP_FRONT_CRYSTAL_WINDOW_${index + 1}`, 0.48, 1.15, [x, 1.18, 1.72], index ? materials.violetCrystal : materials.crystalGlow);
  });
  addPointedArchWindow(keep, 'ISLAND_15_KEEP_MIDDLE_CRYSTAL_WINDOW', 0.72, 1.16, [0, 3.12, 1.13], materials.crystalGlow);
  [-1, 1].forEach((side, sideIndex) => {
    [0.72, 1.72].forEach((y, row) => {
      addPointedArchWindow(
        keep,
        `ISLAND_15_KEEP_SIDE_WINDOW_${sideIndex + 1}_${row + 1}`,
        0.42,
        0.82,
        [side * 1.86, y, -0.3],
        (row + sideIndex) % 2 ? materials.violetCrystal : materials.crystalGlow,
        side > 0 ? Math.PI * 0.5 : -Math.PI * 0.5,
      );
    });
  });

  const masonryCount = 28;
  const masonry = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.14, 0.1), materials.silver, masonryCount);
  masonry.name = 'ISLAND_15_KEEP_FACADE_MASONRY';
  const masonryDummy = new THREE.Object3D();
  for (let index = 0; index < masonryCount; index += 1) {
    if (index < 10) {
      masonryDummy.position.set(-1.48 + index * 0.33, 2.56, 1.88);
    } else if (index < 16) {
      masonryDummy.position.set(-1.62, 0.54 + (index - 10) * 0.34, 1.74);
    } else if (index < 22) {
      masonryDummy.position.set(1.62, 0.54 + (index - 16) * 0.34, 1.74);
    } else {
      masonryDummy.position.set(-1.02 + (index - 22) * 0.41, 4.58, 1.18);
    }
    masonryDummy.scale.set(0.9 + (index % 3) * 0.06, 1, 1);
    masonryDummy.updateMatrix();
    masonry.setMatrixAt(index, masonryDummy.matrix);
  }
  masonry.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  keep.add(masonry);

  const throneSeat = addBox(keep, 'ISLAND_15_FROZEN_THRONE_SEAT', [0.74, 0.56, 0.7], [0, 0.85, -0.58], materials.silver);
  throneSeat.rotation.x = -0.08;
  addBox(keep, 'ISLAND_15_FROZEN_THRONE_BACK', [0.82, 1.42, 0.25], [0, 1.52, -0.82], materials.violetCrystal);
  const crownCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.92, 0), materials.heroCrystal);
  crownCrystal.name = 'ISLAND_15_KEEP_CENTRAL_CATHEDRAL_CRYSTAL';
  crownCrystal.position.set(0, 7.2, -0.22);
  crownCrystal.scale.set(0.88, 1.78, 0.88);
  const crownEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(crownCrystal.geometry),
    new THREE.LineBasicMaterial({ color: 0xb9fbff, transparent: true, opacity: 0.78 }),
  );
  crownEdges.name = 'ISLAND_15_KEEP_CATHEDRAL_CRYSTAL_EDGES';
  crownCrystal.add(crownEdges);
  keep.add(crownCrystal);
  const crownHeart = new THREE.Mesh(new THREE.OctahedronGeometry(0.46, 0), materials.violetCrystal);
  crownHeart.name = 'ISLAND_15_KEEP_VIOLET_CROWN_HEART';
  crownHeart.position.set(0, 6.95, -0.14);
  crownHeart.scale.y = 1.38;
  keep.add(crownHeart);
  if (level >= 2) {
    [-0.72, 0, 0.72].forEach((x, index) => addPointedArchWindow(keep, `ISLAND_15_KEEP_REAR_WINDOW_${index + 1}`, 0.34, 0.74, [x, 1.42, -2.01], index === 1 ? materials.warmWindow : materials.crystalGlow, Math.PI));
  }
  if (level >= 3) {
    addCrystalCluster(keep, 'ISLAND_15_KEEP_CROWN_CRYSTALS_LEFT', [-2.08, 0.26, 0.34], materials.violetCrystal, 0.84);
    addCrystalCluster(keep, 'ISLAND_15_KEEP_CROWN_CRYSTALS_RIGHT', [2.08, 0.26, 0.22], materials.crystalGlow, 0.92);
  }
  root.add(keep);
}

function addFrozenThroneKeepV5Retired(root: THREE.Group, level: BuildLevel, materials: Island15CrystalGlacierMaterials) {
  const keep = new THREE.Group();
  keep.name = 'ISLAND_15_FROZEN_THRONE_KEEP';

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.68, 2.94, 0.46, 12), materials.deepIce);
  plinth.name = 'ISLAND_15_KEEP_CATHEDRAL_PLINTH';
  plinth.position.y = 0.23;
  plinth.receiveShadow = true;
  keep.add(plinth);
  const plinthInlay = new THREE.Mesh(new THREE.CylinderGeometry(2.48, 2.58, 0.09, 12), materials.silver);
  plinthInlay.position.y = 0.49;
  keep.add(plinthInlay);

  // A real stepped arrival makes the front elevation read as a building from grazing angles.
  for (let index = 0; index < 7; index += 1) {
    const progress = index / 6;
    addBox(
      keep,
      `ISLAND_15_KEEP_V3_GRAND_STAIR_${index + 1}`,
      [2.92 - progress * 0.86, 0.12, 0.48],
      [0, 0.12 + index * 0.09, 3.22 - index * 0.32],
      index % 2 ? materials.castle : materials.silver,
    );
  }
  [-1.66, 1.66].forEach((x, index) => {
    const stairRail = addBox(keep, `ISLAND_15_KEEP_V3_STAIR_BALUSTRADE_${index + 1}`, [0.18, 0.82, 2.28], [x, 0.62, 2.72], materials.midnight);
    stairRail.rotation.x = index ? -0.13 : 0.13;
    addCrystal(keep, `ISLAND_15_KEEP_V3_STAIR_LANTERN_${index + 1}`, [x, 1.2, 3.42], [0.22, 0.62, 0.22], index ? materials.violetCrystal : materials.crystalGlow, 6);
  });

  // A broad cruciform cathedral gives the keep the source image's stepped hierarchy.
  addBox(keep, 'ISLAND_15_KEEP_V3_NAVE', [4.38, 2.62, 3.52], [0, 1.82, -0.18], materials.castleShadow);
  addBox(keep, 'ISLAND_15_KEEP_V3_NAVE_ICE_SKIN', [3.86, 2.18, 3.7], [0, 1.92, -0.18], materials.castle);
  addBox(keep, 'ISLAND_15_KEEP_V3_TRANSEPT', [5.22, 1.72, 2.08], [0, 1.5, -0.32], materials.midnight);
  addBox(keep, 'ISLAND_15_KEEP_V3_FRONT_CHAPEL', [2.36, 2.56, 0.92], [0, 1.77, 1.92], materials.castleShadow);
  addBox(keep, 'ISLAND_15_KEEP_V3_FRONT_CHAPEL_TRIM', [1.92, 2.2, 0.18], [0, 1.8, 2.4], materials.castle);

  addBox(keep, 'ISLAND_15_KEEP_V3_CENTRAL_TOWER', [2.72, 2.75, 2.48], [0, 4.28, -0.26], materials.castleShadow);
  addBox(keep, 'ISLAND_15_KEEP_V3_CENTRAL_TOWER_SKIN', [2.24, 2.38, 2.66], [0, 4.35, -0.26], materials.castle);
  addBox(keep, 'ISLAND_15_KEEP_V3_BELFRY', [1.82, 1.75, 1.72], [0, 6.45, -0.26], materials.midnight);
  const belfryGallery = new THREE.Mesh(new THREE.CylinderGeometry(1.34, 1.34, 0.18, 8), materials.silver);
  belfryGallery.position.set(0, 5.62, -0.26);
  keep.add(belfryGallery);

  // Stepped flying buttresses push the mass outward and break the toy-tower silhouette.
  const buttressSpecs: readonly (readonly [number, number, number, number])[] = [
    [-2.18, 1.45, 1.2, 0.12], [2.18, 1.45, 1.2, -0.12],
    [-2.18, 1.45, -1.5, 0.12], [2.18, 1.45, -1.5, -0.12],
    [-1.46, 3.78, 0.65, 0.09], [1.46, 3.78, 0.65, -0.09],
  ];
  buttressSpecs.forEach(([x, y, z, tilt], index) => {
    const pier = addBox(keep, `ISLAND_15_KEEP_V3_BUTTRESS_${index + 1}`, [0.38, index < 4 ? 2.7 : 2.25, 0.62], [x, y, z], materials.midnight);
    pier.rotation.z = tilt;
    addBox(keep, `ISLAND_15_KEEP_V3_BUTTRESS_STEP_${index + 1}`, [0.64, 0.22, 0.82], [x + Math.sign(x) * 0.08, y + (index < 4 ? 1.1 : 0.9), z], materials.silver);
    const finial = new THREE.Mesh(new THREE.OctahedronGeometry(index < 4 ? 0.34 : 0.28, 0), index % 2 ? materials.violetCrystal : materials.crystalGlow);
    finial.name = `ISLAND_15_KEEP_V3_BUTTRESS_FINIAL_${index + 1}`;
    finial.position.set(x + Math.sign(x) * 0.12, y + (index < 4 ? 1.55 : 1.3), z);
    finial.scale.y = 1.8;
    keep.add(finial);
  });

  // Four inhabited corner towers frame the central crystal crown.
  [
    [-2.12, 0.48, 1.28, 4.45, materials.crystalGlow],
    [2.12, 0.48, 1.28, 4.65, materials.violetCrystal],
    [-2.02, 0.48, -1.52, 4.1, materials.violetCrystal],
    [2.02, 0.48, -1.52, 4.28, materials.crystalGlow],
  ].forEach(([x, y, z, height, accent], index) => {
    addGothicSpire(keep, `ISLAND_15_KEEP_V3_CORNER_SPIRE_${index + 1}`, [x as number, y as number, z as number], height as number, materials, accent as THREE.Material, 0.58);
  });

  // Source-matched hero correction: dense lateral chapels and nested turret clusters
  // break the large boxes into an inhabited Gothic skyline at every height band.
  [
    { x: -2.55, accent: materials.crystalGlow, sideRotation: -Math.PI * 0.5 },
    { x: 2.55, accent: materials.violetCrystal, sideRotation: Math.PI * 0.5 },
  ].forEach(({ x, accent, sideRotation }, index) => {
    addBox(keep, `ISLAND_15_KEEP_V5_TRANSEPT_CHAPEL_${index + 1}`, [1.28, 2.16, 1.78], [x, 1.62, 0.2], materials.midnight);
    addBox(keep, `ISLAND_15_KEEP_V5_TRANSEPT_CHAPEL_SKIN_${index + 1}`, [1.06, 1.8, 1.94], [x, 1.66, 0.2], materials.castle);
    const chapelRoof = new THREE.Mesh(new THREE.ConeGeometry(1.02, 1.32, 4), index ? materials.violetCrystal : materials.deepIce);
    chapelRoof.name = `ISLAND_15_KEEP_V5_TRANSEPT_CHAPEL_ROOF_${index + 1}`;
    chapelRoof.position.set(x, 3.18, 0.2);
    chapelRoof.rotation.y = Math.PI * 0.25;
    chapelRoof.scale.z = 0.78;
    chapelRoof.castShadow = true;
    keep.add(chapelRoof);
    addFramedPointedArchWindow(keep, `ISLAND_15_KEEP_V5_TRANSEPT_SIDE_LANCET_${index + 1}`, 0.42, 1.04, [x + Math.sign(x) * 0.56, 1.2, 0.2], materials, accent, sideRotation);
    addFramedPointedArchWindow(keep, `ISLAND_15_KEEP_V5_TRANSEPT_FRONT_LANCET_${index + 1}`, 0.38, 0.94, [x, 1.2, 1.205], materials, index ? materials.warmWindow : materials.crystalGlow);
    addCrystalCluster(keep, `ISLAND_15_KEEP_V5_CHAPEL_CRYSTAL_BED_${index + 1}`, [x, 0.48, 1.28], accent, 0.46);
  });

  [-1.5, 1.5].forEach((x, index) => {
    addGothicSpire(keep, `ISLAND_15_KEEP_V5_PORTAL_TURRET_${index + 1}`, [x, 0.48, 2.02], 3.72 + index * 0.14, materials, index ? materials.violetCrystal : materials.crystalGlow, 0.42);
  });
  [
    [-1.4, 3.12, 0.72, materials.crystalGlow],
    [1.4, 3.12, 0.72, materials.violetCrystal],
    [-1.38, 3.12, -1.1, materials.violetCrystal],
    [1.38, 3.12, -1.1, materials.crystalGlow],
  ].forEach(([x, y, z, accent], index) => {
    addGothicSpire(
      keep,
      `ISLAND_15_KEEP_V5_MID_TURRET_${index + 1}`,
      [x as number, y as number, z as number],
      3.0 + (index % 2) * 0.22,
      materials,
      accent as THREE.Material,
      0.34,
    );
  });
  [
    [-0.86, 5.38, 0.55, materials.crystalGlow],
    [0.86, 5.38, 0.55, materials.violetCrystal],
    [-0.84, 5.38, -1.02, materials.violetCrystal],
    [0.84, 5.38, -1.02, materials.crystalGlow],
  ].forEach(([x, y, z, accent], index) => {
    addGothicSpire(
      keep,
      `ISLAND_15_KEEP_V5_BELFRY_PINNACLE_${index + 1}`,
      [x as number, y as number, z as number],
      2.28 + (index % 2) * 0.18,
      materials,
      accent as THREE.Material,
      0.25,
    );
  });

  [-1.92, -1.28, -0.64, 0, 0.64, 1.28, 1.92].forEach((x, index) => {
    addBox(keep, `ISLAND_15_KEEP_V5_FRONT_GALLERY_MERLON_${index + 1}`, [0.25, 0.34, 0.24], [x, 3.25 + (index % 2) * 0.04, 1.72], index % 2 ? materials.silver : materials.castle);
    addBox(keep, `ISLAND_15_KEEP_V5_REAR_GALLERY_MERLON_${index + 1}`, [0.25, 0.34, 0.24], [x, 3.25 + (index % 2) * 0.04, -2.08], index % 2 ? materials.silver : materials.castle);
  });
  [-1.22, -0.6, 0, 0.6, 1.22].forEach((z, index) => {
    addBox(keep, `ISLAND_15_KEEP_V5_EAST_GALLERY_MERLON_${index + 1}`, [0.24, 0.34, 0.25], [2.28, 3.24 + (index % 2) * 0.04, z], index % 2 ? materials.castle : materials.silver);
    addBox(keep, `ISLAND_15_KEEP_V5_WEST_GALLERY_MERLON_${index + 1}`, [0.24, 0.34, 0.25], [-2.28, 3.24 + (index % 2) * 0.04, z], index % 2 ? materials.castle : materials.silver);
  });

  addFramedPointedArchWindow(keep, 'ISLAND_15_KEEP_V3_GREAT_GATE', 1.12, 1.74, [0, 0.72, 2.51], materials, materials.warmWindow);
  [-0.78, 0.78].forEach((x, index) => {
    addFramedPointedArchWindow(keep, `ISLAND_15_KEEP_V3_FRONT_WINDOW_${index + 1}`, 0.36, 0.92, [x, 1.1, 2.51], materials, index ? materials.violetCrystal : materials.crystalGlow);
  });
  [-0.68, 0, 0.68].forEach((x, index) => {
    addFramedPointedArchWindow(keep, `ISLAND_15_KEEP_V3_TOWER_WINDOW_${index + 1}`, 0.34, 0.92, [x, 3.86, 1.075], materials, index === 1 ? materials.warmWindow : materials.crystalGlow);
    addFramedPointedArchWindow(keep, `ISLAND_15_KEEP_V3_REAR_TOWER_WINDOW_${index + 1}`, 0.34, 0.92, [x, 3.86, -1.605], materials, index === 1 ? materials.warmWindow : materials.violetCrystal, Math.PI);
  });
  addFramedPointedArchWindow(keep, 'ISLAND_15_KEEP_V3_BELFRY_WINDOW', 0.52, 0.98, [0, 6.02, 0.61], materials, materials.violetCrystal);
  addFramedPointedArchWindow(keep, 'ISLAND_15_KEEP_V3_REAR_BELFRY_WINDOW', 0.52, 0.98, [0, 6.02, -1.13], materials, materials.crystalGlow, Math.PI);
  [-0.68, 0.3].forEach((z, index) => {
    addFramedPointedArchWindow(keep, `ISLAND_15_KEEP_V3_EAST_TOWER_WINDOW_${index + 1}`, 0.34, 0.84, [1.145, 3.92, z], materials, index ? materials.violetCrystal : materials.crystalGlow, Math.PI * 0.5);
    addFramedPointedArchWindow(keep, `ISLAND_15_KEEP_V3_WEST_TOWER_WINDOW_${index + 1}`, 0.34, 0.84, [-1.145, 3.92, z], materials, index ? materials.warmWindow : materials.crystalGlow, -Math.PI * 0.5);
  });
  addFramedPointedArchWindow(keep, 'ISLAND_15_KEEP_V3_EAST_BELFRY_WINDOW', 0.38, 0.76, [0.925, 6.02, -0.26], materials, materials.violetCrystal, Math.PI * 0.5);
  addFramedPointedArchWindow(keep, 'ISLAND_15_KEEP_V3_WEST_BELFRY_WINDOW', 0.38, 0.76, [-0.925, 6.02, -0.26], materials, materials.crystalGlow, -Math.PI * 0.5);
  // Layered silver tracery, ledges and gem bosses restore the source's jewel-box density.
  [-1.62, -1.26, 1.26, 1.62].forEach((x, index) => {
    addBox(keep, `ISLAND_15_KEEP_V3_NAVE_TRACERY_RIB_${index + 1}`, [0.11, 2.3, 0.12], [x, 1.76, 2.48], materials.silver);
    const boss = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), index % 2 ? materials.violetCrystal : materials.crystalGlow);
    boss.name = `ISLAND_15_KEEP_V3_NAVE_GEM_BOSS_${index + 1}`;
    boss.position.set(x, 2.86, 2.58);
    boss.rotation.z = Math.PI * 0.25;
    keep.add(boss);
  });
  [-1.03, 1.03].forEach((x, index) => {
    addBox(keep, `ISLAND_15_KEEP_V3_TOWER_TRACERY_RIB_${index + 1}`, [0.12, 2.2, 0.12], [x, 4.34, 1.09], materials.silver);
    addCrystal(keep, `ISLAND_15_KEEP_V3_TOWER_TRACERY_FINIAL_${index + 1}`, [x, 5.62, 1.08], [0.32, 0.58, 0.32], index ? materials.violetCrystal : materials.crystalGlow, 6);
  });
  addBox(keep, 'ISLAND_15_KEEP_V3_TOWER_FRONT_CROWN_BAND', [2.58, 0.16, 0.16], [0, 5.58, 1.09], materials.silver);
  addBox(keep, 'ISLAND_15_KEEP_V3_TOWER_REAR_CROWN_BAND', [2.58, 0.16, 0.16], [0, 5.58, -1.61], materials.silver);
  addBox(keep, 'ISLAND_15_KEEP_V3_TOWER_EAST_CROWN_BAND', [0.16, 0.16, 2.56], [1.15, 5.58, -0.26], materials.silver);
  addBox(keep, 'ISLAND_15_KEEP_V3_TOWER_WEST_CROWN_BAND', [0.16, 0.16, 2.56], [-1.15, 5.58, -0.26], materials.silver);
  [-1.12, -0.58, 0, 0.58, 1.12].forEach((x, index) => {
    const crestGem = new THREE.Mesh(new THREE.OctahedronGeometry(index === 2 ? 0.18 : 0.13, 0), index % 2 ? materials.violetCrystal : materials.crystalGlow);
    crestGem.name = `ISLAND_15_KEEP_V3_FRONT_CREST_GEM_${index + 1}`;
    crestGem.position.set(x, 3.18 + (index === 2 ? 0.2 : 0), 2.55);
    crestGem.scale.y = 1.5;
    keep.add(crestGem);
  });
  addCrystalCluster(keep, 'ISLAND_15_KEEP_V3_ENTRY_CRYSTAL_GARDEN_LEFT', [-1.52, 0.3, 2.74], materials.crystalGlow, 0.48);
  addCrystalCluster(keep, 'ISLAND_15_KEEP_V3_ENTRY_CRYSTAL_GARDEN_RIGHT', [1.52, 0.3, 2.74], materials.violetCrystal, 0.48);
  [-0.8, 0, 0.8].forEach((z, index) => {
    addFramedPointedArchWindow(keep, `ISLAND_15_KEEP_V3_EAST_WINDOW_${index + 1}`, 0.34, 0.88, [2.205, 1.16, z], materials, index === 1 ? materials.warmWindow : materials.crystalGlow, Math.PI * 0.5);
    addFramedPointedArchWindow(keep, `ISLAND_15_KEEP_V3_WEST_WINDOW_${index + 1}`, 0.34, 0.88, [-2.205, 1.16, z], materials, index === 1 ? materials.violetCrystal : materials.crystalGlow, -Math.PI * 0.5);
  });
  [-0.76, 0, 0.76].forEach((x, index) => {
    addFramedPointedArchWindow(keep, `ISLAND_15_KEEP_V3_REAR_WINDOW_${index + 1}`, 0.34, 0.86, [x, 1.16, -2.045], materials, index === 1 ? materials.warmWindow : materials.violetCrystal, Math.PI);
  });
  addFramedPointedArchWindow(keep, 'ISLAND_15_KEEP_V3_REAR_SERVICE_PORTAL', 0.72, 1.34, [0, 0.58, -2.055], materials, materials.deepIce, Math.PI);

  // Layered roof facets create a crystalline cathedral instead of a flat box crown.
  const naveRoof = new THREE.Mesh(new THREE.ConeGeometry(2.72, 1.42, 4), materials.deepIce);
  naveRoof.name = 'ISLAND_15_KEEP_V3_NAVE_CRYSTAL_ROOF';
  naveRoof.position.set(0, 3.7, -0.18);
  naveRoof.rotation.y = Math.PI * 0.25;
  naveRoof.scale.z = 0.76;
  keep.add(naveRoof);
  const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(1.72, 1.62, 4), materials.heroCrystal);
  towerRoof.name = 'ISLAND_15_KEEP_V3_TOWER_CRYSTAL_ROOF';
  towerRoof.position.set(0, 6.0, -0.26);
  towerRoof.rotation.y = Math.PI * 0.25;
  keep.add(towerRoof);

  const centralCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.92, 0), materials.heroCrystal);
  centralCrystal.name = 'ISLAND_15_KEEP_CENTRAL_CATHEDRAL_CRYSTAL';
  centralCrystal.position.set(0, 8.16, -0.26);
  centralCrystal.scale.set(0.9, 1.95, 0.9);
  keep.add(centralCrystal);
  [-0.92, -0.48, 0.48, 0.92].forEach((x, index) => {
    const satellite = new THREE.Mesh(new THREE.OctahedronGeometry(index % 3 === 0 ? 0.34 : 0.28, 0), index % 2 ? materials.violetCrystal : materials.crystalGlow);
    satellite.name = `ISLAND_15_KEEP_V3_CROWN_SATELLITE_${index + 1}`;
    satellite.position.set(x, 7.25 + (index % 2) * 0.24, -0.24 + Math.abs(x) * 0.14);
    satellite.scale.y = 1.8 + (index % 2) * 0.45;
    satellite.rotation.z = x * -0.16;
    keep.add(satellite);
  });
  const crownHalo = new THREE.Mesh(new THREE.TorusGeometry(1.34, 0.075, 8, 48), materials.silver);
  crownHalo.name = 'ISLAND_15_KEEP_V5_CRYSTAL_CROWN_HALO';
  crownHalo.position.set(0, 7.22, -0.26);
  crownHalo.rotation.x = Math.PI * 0.5;
  keep.add(crownHalo);
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2;
    const radius = index % 2 ? 1.3 : 1.1;
    const crownShard = addCrystal(
      keep,
      `ISLAND_15_KEEP_V5_CROWN_RAY_${index + 1}`,
      [Math.cos(angle) * radius, 7.18 + (index % 2) * 0.18, -0.26 + Math.sin(angle) * radius],
      [0.3, 0.76 + (index % 3) * 0.14, 0.3],
      index % 2 ? materials.violetCrystal : materials.crystalGlow,
      6,
    );
    crownShard.rotation.z = Math.cos(angle) * -0.34;
    crownShard.rotation.x = Math.sin(angle) * 0.28;
  }
  [-0.58, 0, 0.58].forEach((x, index) => {
    const belfryBoss = new THREE.Mesh(new THREE.OctahedronGeometry(index === 1 ? 0.2 : 0.14, 0), index === 1 ? materials.heroCrystal : materials.violetCrystal);
    belfryBoss.name = `ISLAND_15_KEEP_V5_BELFRY_GEM_BOSS_${index + 1}`;
    belfryBoss.position.set(x, 6.92 + (index === 1 ? 0.18 : 0), 0.64);
    belfryBoss.scale.y = 1.65;
    keep.add(belfryBoss);
  });
  addCrystalCluster(keep, 'ISLAND_15_KEEP_V3_CROWN_CLUSTER_LEFT', [-1.3, 5.78, -0.18], materials.violetCrystal, 0.64);
  addCrystalCluster(keep, 'ISLAND_15_KEEP_V3_CROWN_CLUSTER_RIGHT', [1.3, 5.78, -0.18], materials.crystalGlow, 0.64);

  // The throne remains a real interior target; warm light leaks through the great portal.
  addBox(keep, 'ISLAND_15_FROZEN_THRONE_SEAT', [0.76, 0.56, 0.72], [0, 0.88, -0.68], materials.silver);
  addBox(keep, 'ISLAND_15_FROZEN_THRONE_BACK', [0.88, 1.52, 0.24], [0, 1.58, -0.9], materials.violetCrystal);
  const heartLight = new THREE.PointLight(0x6fe8ff, 2.4, 7.4, 2);
  heartLight.name = 'ISLAND_15_KEEP_V3_CRYSTAL_HEART_LIGHT';
  heartLight.position.set(0, 5.55, 0.3);
  keep.add(heartLight);
  const hearthLight = new THREE.PointLight(0xff8846, 2.1, 4.8, 2);
  hearthLight.name = 'ISLAND_15_KEEP_V3_HEARTH_LIGHT';
  hearthLight.position.set(0, 1.6, 2.1);
  keep.add(hearthLight);

  root.add(keep);
}

function addFrozenThroneKeepV6Retired(root: THREE.Group, level: BuildLevel, materials: Island15CrystalGlacierMaterials) {
  const keep = new THREE.Group();
  keep.name = 'ISLAND_15_FROZEN_THRONE_KEEP';
  keep.userData.island15ConstructionFamily = 'v6-extruded-gothic';

  const addGabledVolume = (
    name: string,
    width: number,
    wallHeight: number,
    peakHeight: number,
    depth: number,
    position: readonly [number, number, number],
    material: THREE.Material,
  ) => {
    const shape = new THREE.Shape();
    shape.moveTo(-width * 0.5, 0);
    shape.lineTo(width * 0.5, 0);
    shape.lineTo(width * 0.5, wallHeight);
    shape.lineTo(width * 0.22, wallHeight + (peakHeight - wallHeight) * 0.34);
    shape.lineTo(0, peakHeight);
    shape.lineTo(-width * 0.22, wallHeight + (peakHeight - wallHeight) * 0.34);
    shape.lineTo(-width * 0.5, wallHeight);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.09,
      bevelThickness: 0.08,
      curveSegments: 8,
      steps: 1,
    });
    geometry.translate(0, 0, -depth * 0.5);
    const volume = new THREE.Mesh(geometry, material);
    volume.name = name;
    volume.position.set(...position);
    volume.castShadow = true;
    volume.receiveShadow = true;
    keep.add(volume);
    return volume;
  };

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(3.02, 3.28, 0.52, 12), materials.deepIce);
  plinth.name = 'ISLAND_15_KEEP_CATHEDRAL_PLINTH';
  plinth.position.y = 0.26;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  keep.add(plinth);
  const silverPlinth = new THREE.Mesh(new THREE.CylinderGeometry(2.88, 3.02, 0.13, 12), materials.silver);
  silverPlinth.name = 'ISLAND_15_KEEP_V6_SILVER_PLINTH';
  silverPlinth.position.y = 0.57;
  keep.add(silverPlinth);

  for (let index = 0; index < 7; index += 1) {
    const progress = index / 6;
    addBox(keep, `ISLAND_15_KEEP_V3_GRAND_STAIR_${index + 1}`, [3.25 - progress * 1.02, 0.13, 0.48], [0, 0.12 + index * 0.1, 3.48 - index * 0.32], index % 2 ? materials.castle : materials.silver);
  }

  addGabledVolume('ISLAND_15_KEEP_V6_LOWER_CATHEDRAL', 5.35, 2.12, 3.5, 3.78, [0, 0.58, -0.26], materials.castleShadow);
  addGabledVolume('ISLAND_15_KEEP_V6_LOWER_CATHEDRAL_ICE_SKIN', 4.72, 1.82, 3.12, 3.96, [0, 0.72, -0.26], materials.castle);
  addGabledVolume('ISLAND_15_KEEP_V6_FRONT_PORTAL_HALL', 2.62, 1.72, 2.95, 1.18, [0, 0.56, 2.05], materials.midnight);
  addGabledVolume('ISLAND_15_KEEP_V6_FRONT_PORTAL_HALL_SKIN', 2.24, 1.52, 2.68, 1.3, [0, 0.66, 2.12], materials.castle);

  [-2.62, 2.62].forEach((x, index) => {
    addGabledVolume(`ISLAND_15_KEEP_V6_SIDE_CHAPEL_${index + 1}`, 1.42, 1.72, 2.7, 2.1, [x, 0.62, 0.18], materials.midnight);
    addGabledVolume(`ISLAND_15_KEEP_V6_SIDE_CHAPEL_SKIN_${index + 1}`, 1.14, 1.5, 2.42, 2.26, [x, 0.72, 0.18], materials.castle);
  });

  const centralTower = new THREE.Mesh(new THREE.CylinderGeometry(1.16, 1.52, 3.22, 8), materials.castleShadow);
  centralTower.name = 'ISLAND_15_KEEP_V6_TAPERED_CENTRAL_TOWER';
  centralTower.position.set(0, 4.4, -0.26);
  centralTower.castShadow = true;
  keep.add(centralTower);
  const centralTowerSkin = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.32, 2.88, 8), materials.castle);
  centralTowerSkin.name = 'ISLAND_15_KEEP_V6_TAPERED_CENTRAL_TOWER_SKIN';
  centralTowerSkin.position.set(0, 4.48, -0.26);
  keep.add(centralTowerSkin);
  const belfry = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 1.06, 2.1, 8), materials.midnight);
  belfry.name = 'ISLAND_15_KEEP_V6_OCTAGONAL_BELFRY';
  belfry.position.set(0, 6.85, -0.26);
  belfry.castShadow = true;
  keep.add(belfry);

  [
    [-2.18, 0.5, 1.34, 4.6, materials.crystalGlow],
    [2.18, 0.5, 1.34, 4.82, materials.violetCrystal],
    [-2.16, 0.5, -1.52, 4.34, materials.violetCrystal],
    [2.16, 0.5, -1.52, 4.48, materials.crystalGlow],
    [-1.5, 0.5, 2.12, 3.9, materials.crystalGlow],
    [1.5, 0.5, 2.12, 4.02, materials.violetCrystal],
  ].forEach(([x, y, z, height, accent], index) => {
    addGothicSpire(keep, `ISLAND_15_KEEP_V6_LOWER_TURRET_${index + 1}`, [x as number, y as number, z as number], height as number, materials, accent as THREE.Material, index < 4 ? 0.55 : 0.4);
  });
  [
    [-1.32, 2.9, 0.72, materials.crystalGlow],
    [1.32, 2.9, 0.72, materials.violetCrystal],
    [-1.28, 2.9, -1.08, materials.violetCrystal],
    [1.28, 2.9, -1.08, materials.crystalGlow],
  ].forEach(([x, y, z, accent], index) => {
    addGothicSpire(keep, `ISLAND_15_KEEP_V6_MID_CLUSTER_TURRET_${index + 1}`, [x as number, y as number, z as number], 3.25 + (index % 2) * 0.18, materials, accent as THREE.Material, 0.33);
  });
  [
    [-0.82, 5.65, 0.48, materials.crystalGlow],
    [0.82, 5.65, 0.48, materials.violetCrystal],
    [-0.78, 5.65, -0.98, materials.violetCrystal],
    [0.78, 5.65, -0.98, materials.crystalGlow],
  ].forEach(([x, y, z, accent], index) => {
    addGothicSpire(keep, `ISLAND_15_KEEP_V6_UPPER_PINNACLE_${index + 1}`, [x as number, y as number, z as number], 2.55 + (index % 2) * 0.16, materials, accent as THREE.Material, 0.24);
  });

  const galleryLevels = [3.34, 5.92, 7.93] as const;
  galleryLevels.forEach((y, index) => {
    const radius = index === 0 ? 2.45 : index === 1 ? 1.47 : 1.08;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, index === 0 ? 0.18 : 0.14, 8), materials.silver);
    band.name = `ISLAND_15_KEEP_V6_GALLERY_BAND_${index + 1}`;
    band.position.set(0, y, -0.26);
    keep.add(band);
    for (let merlon = 0; merlon < 8; merlon += 1) {
      const angle = merlon / 8 * Math.PI * 2;
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(index === 0 ? 0.14 : 0.11, 0), merlon % 2 ? materials.violetCrystal : materials.crystalGlow);
      gem.name = `ISLAND_15_KEEP_V6_GALLERY_GEM_${index + 1}_${merlon + 1}`;
      gem.position.set(Math.cos(angle) * radius, y + 0.22, -0.26 + Math.sin(angle) * radius);
      gem.scale.y = 1.4;
      keep.add(gem);
    }
  });

  [
    [-2.52, 1.48, 1.18, 0.13], [2.52, 1.48, 1.18, -0.13],
    [-2.52, 1.48, -1.38, 0.13], [2.52, 1.48, -1.38, -0.13],
    [-1.58, 3.94, 0.54, 0.1], [1.58, 3.94, 0.54, -0.1],
    [-1.5, 3.94, -1.0, 0.1], [1.5, 3.94, -1.0, -0.1],
  ].forEach(([x, y, z, tilt], index) => {
    const buttress = addBox(keep, `ISLAND_15_KEEP_V6_FLYING_BUTTRESS_${index + 1}`, [0.28, index < 4 ? 2.55 : 2.02, 0.52], [x, y, z], materials.midnight);
    buttress.rotation.z = tilt;
    const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), index % 2 ? materials.violetCrystal : materials.crystalGlow);
    cap.name = `ISLAND_15_KEEP_V6_BUTTRESS_CAP_${index + 1}`;
    cap.position.set(x + Math.sign(x) * 0.08, y + (index < 4 ? 1.36 : 1.08), z);
    cap.scale.y = 1.7;
    keep.add(cap);
  });

  addIsland15FacadeFinish(keep, 'ISLAND_15_KEEP_V6_FRONT_NAVE_FINISH', [0, 1.72, 1.78], 4.52, 1.46, 5, materials);
  addIsland15FacadeFinish(keep, 'ISLAND_15_KEEP_V6_REAR_NAVE_FINISH', [0, 1.72, -2.31], 4.46, 1.42, 5, materials, Math.PI);
  addIsland15FacadeFinish(keep, 'ISLAND_15_KEEP_V6_FRONT_TOWER_FINISH', [0, 4.48, 1.22], 2.25, 1.76, 3, materials);
  addIsland15FacadeFinish(keep, 'ISLAND_15_KEEP_V6_REAR_TOWER_FINISH', [0, 4.48, -1.73], 2.25, 1.76, 3, materials, Math.PI);
  addIsland15FacadeFinish(keep, 'ISLAND_15_KEEP_V6_EAST_CHAPEL_FINISH', [2.78, 1.6, 0.18], 1.72, 1.38, 2, materials, Math.PI * 0.5);
  addIsland15FacadeFinish(keep, 'ISLAND_15_KEEP_V6_WEST_CHAPEL_FINISH', [-2.78, 1.6, 0.18], 1.72, 1.38, 2, materials, -Math.PI * 0.5);
  addIsland15FacadeFinish(keep, 'ISLAND_15_KEEP_V6_BELFRY_FINISH', [0, 6.85, 0.56], 1.42, 1.24, 2, materials);

  addFramedPointedArchWindow(keep, 'ISLAND_15_KEEP_V6_GREAT_GATE', 1.18, 1.82, [0, 0.74, 2.79], materials, materials.warmWindow);
  [-0.76, 0.76].forEach((x, index) => addFramedPointedArchWindow(keep, `ISLAND_15_KEEP_V6_PORTAL_LANCET_${index + 1}`, 0.32, 0.9, [x, 1.26, 2.79], materials, index ? materials.violetCrystal : materials.crystalGlow));
  [-1.62, -0.82, 0, 0.82, 1.62].forEach((x, index) => addFramedPointedArchWindow(keep, `ISLAND_15_KEEP_V6_NAVE_LANCET_${index + 1}`, 0.3, 0.86, [x, 1.16, 1.755], materials, index === 2 ? materials.warmWindow : index % 2 ? materials.violetCrystal : materials.crystalGlow));
  [-0.72, 0, 0.72].forEach((x, index) => {
    addFramedPointedArchWindow(keep, `ISLAND_15_KEEP_V6_TOWER_LANCET_${index + 1}`, 0.34, 0.94, [x, 3.92, 1.18], materials, index === 1 ? materials.warmWindow : materials.crystalGlow);
    addFramedPointedArchWindow(keep, `ISLAND_15_KEEP_V6_REAR_TOWER_LANCET_${index + 1}`, 0.34, 0.94, [x, 3.92, -1.7], materials, index === 1 ? materials.warmWindow : materials.violetCrystal, Math.PI);
  });
  addFramedPointedArchWindow(keep, 'ISLAND_15_KEEP_V6_BELFRY_LANCET', 0.44, 0.92, [0, 6.42, 0.55], materials, materials.violetCrystal);
  addFramedPointedArchWindow(keep, 'ISLAND_15_KEEP_V6_REAR_BELFRY_LANCET', 0.44, 0.92, [0, 6.42, -1.07], materials, materials.crystalGlow, Math.PI);

  [-0.7, 0, 0.7].forEach((z, index) => {
    addFramedPointedArchWindow(keep, `ISLAND_15_KEEP_V3_EAST_WINDOW_${index + 1}`, 0.34, 0.88, [2.72, 1.2, z], materials, index === 1 ? materials.warmWindow : materials.crystalGlow, Math.PI * 0.5);
    addFramedPointedArchWindow(keep, `ISLAND_15_KEEP_V6_WEST_WINDOW_${index + 1}`, 0.34, 0.88, [-2.72, 1.2, z], materials, index === 1 ? materials.violetCrystal : materials.crystalGlow, -Math.PI * 0.5);
  });
  [-0.78, 0, 0.78].forEach((x, index) => addFramedPointedArchWindow(keep, `ISLAND_15_KEEP_V6_REAR_WINDOW_${index + 1}`, 0.34, 0.86, [x, 1.16, -2.27], materials, index === 1 ? materials.warmWindow : materials.violetCrystal, Math.PI));
  addFramedPointedArchWindow(keep, 'ISLAND_15_KEEP_V3_REAR_SERVICE_PORTAL', 0.76, 1.36, [0, 0.62, -2.29], materials, materials.deepIce, Math.PI);

  const centralCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.84, 1), materials.heroCrystal);
  centralCrystal.name = 'ISLAND_15_KEEP_CENTRAL_CATHEDRAL_CRYSTAL';
  centralCrystal.position.set(0, 9.08, -0.26);
  centralCrystal.scale.set(0.84, 2.15, 0.84);
  centralCrystal.castShadow = true;
  keep.add(centralCrystal);
  for (let index = 0; index < 12; index += 1) {
    const angle = index / 12 * Math.PI * 2;
    const radius = index % 2 ? 1.12 : 1.42;
    const shard = addCrystal(keep, `ISLAND_15_KEEP_V6_CROWN_SHARD_${index + 1}`, [Math.cos(angle) * radius, 8.0 + (index % 3) * 0.24, -0.26 + Math.sin(angle) * radius], [0.3, 0.86 + (index % 3) * 0.2, 0.3], index % 2 ? materials.violetCrystal : materials.crystalGlow, 6);
    shard.rotation.z = Math.cos(angle) * -0.42;
    shard.rotation.x = Math.sin(angle) * 0.32;
  }
  addCrystalCluster(keep, 'ISLAND_15_KEEP_V6_ENTRY_CRYSTALS_LEFT', [-1.5, 0.3, 2.88], materials.crystalGlow, 0.58);
  addCrystalCluster(keep, 'ISLAND_15_KEEP_V6_ENTRY_CRYSTALS_RIGHT', [1.5, 0.3, 2.88], materials.violetCrystal, 0.58);

  const crystalHeartLight = new THREE.PointLight(0x4feaff, 3.4, 9.2, 2);
  crystalHeartLight.name = 'ISLAND_15_KEEP_V6_CRYSTAL_HEART_LIGHT';
  crystalHeartLight.position.set(0, 7.7, 0.1);
  keep.add(crystalHeartLight);
  const gateWarmth = new THREE.PointLight(0xff9854, 2.5, 5.8, 2);
  gateWarmth.name = 'ISLAND_15_KEEP_V6_GATE_WARMTH';
  gateWarmth.position.set(0, 1.42, 2.52);
  keep.add(gateWarmth);

  root.add(keep);
}

function addFrozenThroneKeep(root: THREE.Group, level: BuildLevel, materials: Island15CrystalGlacierMaterials) {
  const keep = new THREE.Group();
  keep.name = 'ISLAND_15_FROZEN_THRONE_KEEP';
  keep.userData.island15ConstructionFamily = 'v7-crystalline-gothic-cathedral';

  const addGabledVolume = (
    name: string,
    width: number,
    wallHeight: number,
    peakHeight: number,
    depth: number,
    position: readonly [number, number, number],
    material: THREE.Material,
    rotationY = 0,
  ) => {
    const shape = new THREE.Shape();
    shape.moveTo(-width * 0.5, 0);
    shape.lineTo(width * 0.5, 0);
    shape.lineTo(width * 0.5, wallHeight);
    shape.lineTo(width * 0.28, wallHeight + (peakHeight - wallHeight) * 0.38);
    shape.lineTo(0, peakHeight);
    shape.lineTo(-width * 0.28, wallHeight + (peakHeight - wallHeight) * 0.38);
    shape.lineTo(-width * 0.5, wallHeight);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.075,
      bevelThickness: 0.075,
      curveSegments: 10,
      steps: 1,
    });
    geometry.translate(0, 0, -depth * 0.5);
    const volume = new THREE.Mesh(geometry, material);
    volume.name = name;
    volume.position.set(...position);
    volume.rotation.y = rotationY;
    volume.castShadow = true;
    volume.receiveShadow = true;
    keep.add(volume);
    return volume;
  };

  const addCrystalTower = (
    name: string,
    x: number,
    z: number,
    baseY: number,
    radius: number,
    shaftHeight: number,
    crownHeight: number,
    accent: THREE.Material,
  ) => {
    const tower = new THREE.Group();
    tower.name = name;
    tower.position.set(x, baseY, z);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.82, radius, shaftHeight, 8), materials.midnight);
    shaft.name = `${name}_FACETED_SAPPHIRE_SHAFT`;
    shaft.position.y = shaftHeight * 0.5;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    tower.add(shaft);
    const innerShaft = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.68, radius * 0.82, shaftHeight * 0.88, 8), materials.castleShadow);
    innerShaft.name = `${name}_MASONRY_INNER_SHAFT`;
    innerShaft.position.y = shaftHeight * 0.5 + 0.04;
    innerShaft.castShadow = true;
    tower.add(innerShaft);
    [0.16, shaftHeight * 0.46, shaftHeight * 0.86].forEach((y, ringIndex) => {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(radius * (ringIndex === 2 ? 1.02 : 1.06), radius * (ringIndex === 2 ? 1.02 : 1.06), ringIndex === 1 ? 0.095 : 0.13, 8), ringIndex === 1 ? materials.gold : materials.silver);
      ring.name = `${name}_CARVED_GALLERY_RING_${ringIndex + 1}`;
      ring.position.y = y;
      tower.add(ring);
    });
    for (let side = 0; side < 8; side += 1) {
      const angle = side / 8 * Math.PI * 2;
      const rib = addBox(tower, `${name}_VERTICAL_TRACERY_RIB_${side + 1}`, [0.065, shaftHeight * 0.75, 0.1], [Math.cos(angle) * radius * 0.86, shaftHeight * 0.5, Math.sin(angle) * radius * 0.86], side % 2 ? materials.gold : materials.silver, -angle);
      rib.rotation.z = Math.cos(angle) * 0.025;
      const boss = new THREE.Mesh(new THREE.OctahedronGeometry(radius * 0.12, 0), side % 2 ? materials.violetCrystal : materials.crystalGlow);
      boss.name = `${name}_GALLERY_CRYSTAL_BOSS_${side + 1}`;
      boss.position.set(Math.cos(angle) * radius * 0.98, shaftHeight * 0.9, Math.sin(angle) * radius * 0.98);
      boss.scale.y = 1.55;
      tower.add(boss);
    }
    const windowY = shaftHeight * 0.43;
    addFramedPointedArchWindow(tower, `${name}_SOUTH_LANCET`, radius * 0.58, shaftHeight * 0.38, [0, windowY - shaftHeight * 0.2, radius * 0.805], materials, accent);
    addFramedPointedArchWindow(tower, `${name}_NORTH_LANCET`, radius * 0.58, shaftHeight * 0.38, [0, windowY - shaftHeight * 0.2, -radius * 0.805], materials, materials.violetCrystal, Math.PI);
    addFramedPointedArchWindow(tower, `${name}_EAST_LANCET`, radius * 0.58, shaftHeight * 0.38, [radius * 0.805, windowY - shaftHeight * 0.2, 0], materials, materials.crystalGlow, Math.PI * 0.5);
    addFramedPointedArchWindow(tower, `${name}_WEST_LANCET`, radius * 0.58, shaftHeight * 0.38, [-radius * 0.805, windowY - shaftHeight * 0.2, 0], materials, accent, -Math.PI * 0.5);
    const crownSocket = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.66, radius * 0.9, 0.42, 8), materials.silver);
    crownSocket.name = `${name}_CRYSTAL_CROWN_SOCKET`;
    crownSocket.position.y = shaftHeight + 0.12;
    tower.add(crownSocket);
    const crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.72, 1), accent);
    crown.name = `${name}_FACETED_CRYSTAL_CROWN`;
    crown.position.y = shaftHeight + crownHeight * 0.48;
    crown.scale.set(radius * 0.72, crownHeight, radius * 0.72);
    crown.castShadow = true;
    tower.add(crown);
    for (let shardIndex = 0; shardIndex < 4; shardIndex += 1) {
      const angle = shardIndex / 4 * Math.PI * 2 + Math.PI * 0.25;
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), shardIndex % 2 ? materials.violetCrystal : materials.crystalGlow);
      shard.name = `${name}_CROWN_SATELLITE_${shardIndex + 1}`;
      shard.position.set(Math.cos(angle) * radius * 0.8, shaftHeight + crownHeight * 0.28, Math.sin(angle) * radius * 0.8);
      shard.scale.set(radius * 0.38, crownHeight * 0.75, radius * 0.38);
      shard.rotation.z = Math.cos(angle) * -0.26;
      shard.rotation.x = Math.sin(angle) * 0.24;
      tower.add(shard);
    }
    keep.add(tower);
    return tower;
  };

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(3.28, 3.62, 0.62, 16), materials.deepIce);
  plinth.name = 'ISLAND_15_KEEP_V7_FACETED_GLACIER_PLINTH';
  plinth.position.y = 0.31;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  keep.add(plinth);
  const processionalRing = new THREE.Mesh(new THREE.CylinderGeometry(3.16, 3.3, 0.16, 16), materials.silver);
  processionalRing.name = 'ISLAND_15_KEEP_V7_PROCESSIONAL_RING';
  processionalRing.position.y = 0.68;
  keep.add(processionalRing);
  const inlayRing = new THREE.Mesh(new THREE.TorusGeometry(2.92, 0.075, 8, 64), materials.crystalGlow);
  inlayRing.name = 'ISLAND_15_KEEP_V7_AURORA_INLAY_RING';
  inlayRing.position.y = 0.79;
  inlayRing.rotation.x = Math.PI * 0.5;
  keep.add(inlayRing);

  for (let index = 0; index < 7; index += 1) {
    const progress = index / 6;
    addBox(keep, `ISLAND_15_KEEP_V3_GRAND_STAIR_${index + 1}`, [3.5 - progress * 1.16, 0.13, 0.5], [0, 0.14 + index * 0.1, 3.8 - index * 0.33], index % 2 ? materials.castle : materials.silver);
  }

  addGabledVolume('ISLAND_15_KEEP_V7_CRUCIFORM_NAVE', 5.8, 2.35, 3.86, 4.2, [0, 0.64, -0.18], materials.midnight);
  addGabledVolume('ISLAND_15_KEEP_V7_CRUCIFORM_NAVE_ICE_RELIEF', 5.22, 2.08, 3.52, 4.34, [0, 0.8, -0.18], materials.castleShadow);
  addGabledVolume('ISLAND_15_KEEP_V7_EAST_TRANSEPT', 3.34, 1.86, 3.06, 2.28, [2.38, 0.72, -0.18], materials.midnight, Math.PI * 0.5);
  addGabledVolume('ISLAND_15_KEEP_V7_WEST_TRANSEPT', 3.34, 1.86, 3.06, 2.28, [-2.38, 0.72, -0.18], materials.midnight, Math.PI * 0.5);
  addGabledVolume('ISLAND_15_KEEP_V7_GREAT_PORTAL_VOLUME', 2.86, 2.05, 3.5, 1.44, [0, 0.66, 2.34], materials.castleShadow);

  addIsland15FacadeFinish(keep, 'ISLAND_15_KEEP_V7_FRONT_NAVE_TRACERY', [0, 1.86, 1.97], 5.08, 1.74, 7, materials);
  addIsland15FacadeFinish(keep, 'ISLAND_15_KEEP_V7_REAR_NAVE_TRACERY', [0, 1.86, -2.33], 5.02, 1.72, 7, materials, Math.PI);
  addIsland15FacadeFinish(keep, 'ISLAND_15_KEEP_V7_EAST_TRANSEPT_TRACERY', [3.62, 1.72, -0.18], 3.08, 1.64, 4, materials, Math.PI * 0.5);
  addIsland15FacadeFinish(keep, 'ISLAND_15_KEEP_V7_WEST_TRANSEPT_TRACERY', [-3.62, 1.72, -0.18], 3.08, 1.64, 4, materials, -Math.PI * 0.5);
  addIsland15FacadeFinish(keep, 'ISLAND_15_KEEP_V7_FRONT_TOWER_TRACERY', [0, 5.18, 0.95], 2.18, 1.82, 3, materials);
  addIsland15FacadeFinish(keep, 'ISLAND_15_KEEP_V7_REAR_TOWER_TRACERY', [0, 5.18, -1.31], 2.18, 1.82, 3, materials, Math.PI);

  addPointedArchWindow(keep, 'ISLAND_15_KEEP_V7_PORTAL_SILVER_ARCHIVOLT', 1.72, 2.42, [0, 0.48, 3.075], materials.silver);
  addPointedArchWindow(keep, 'ISLAND_15_KEEP_V7_PORTAL_GOLD_ARCHIVOLT', 1.5, 2.2, [0, 0.6, 3.09], materials.gold);
  addFramedPointedArchWindow(keep, 'ISLAND_15_KEEP_V7_GREAT_GATE', 1.26, 1.98, [0, 0.72, 3.1], materials, materials.warmWindow);
  addFramedPointedArchWindow(keep, 'ISLAND_15_KEEP_V3_REAR_SERVICE_PORTAL', 0.82, 1.46, [0, 0.66, -2.36], materials, materials.deepIce, Math.PI);
  const roseFrame = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.075, 8, 48), materials.gold);
  roseFrame.name = 'ISLAND_15_KEEP_V7_FRONT_ROSE_TRACERY';
  roseFrame.position.set(0, 2.7, 3.12);
  keep.add(roseFrame);
  const rose = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 1), materials.heroCrystal);
  rose.name = 'ISLAND_15_KEEP_V7_FRONT_ROSE_CRYSTAL';
  rose.position.set(0, 2.7, 3.14);
  rose.rotation.z = Math.PI * 0.25;
  rose.scale.z = 0.28;
  keep.add(rose);

  const cornerTowers = [
    [-2.42, 1.5, materials.crystalGlow], [2.42, 1.5, materials.violetCrystal],
    [-2.4, -1.62, materials.violetCrystal], [2.4, -1.62, materials.crystalGlow],
  ] as const;
  cornerTowers.forEach(([x, z, accent], index) => addCrystalTower(`ISLAND_15_KEEP_V7_CORNER_TOWER_${index + 1}`, x, z, 0.72, 0.61, 3.15 + (index % 2) * 0.16, 1.74 + (index % 2) * 0.14, accent));
  addCrystalTower('ISLAND_15_KEEP_V7_EAST_TRANSEPT_TOWER', 3.02, -0.18, 0.72, 0.54, 3.0, 1.56, materials.crystalGlow);
  addCrystalTower('ISLAND_15_KEEP_V7_WEST_TRANSEPT_TOWER', -3.02, -0.18, 0.72, 0.54, 3.0, 1.56, materials.violetCrystal);
  const centralTower = addCrystalTower('ISLAND_15_KEEP_V7_CENTRAL_CRYSTAL_TOWER', 0, -0.18, 3.16, 1.36, 4.12, 2.72, materials.heroCrystal);
  centralTower.getObjectByName('ISLAND_15_KEEP_V7_CENTRAL_CRYSTAL_TOWER_FACETED_CRYSTAL_CROWN')!.name = 'ISLAND_15_KEEP_CENTRAL_CATHEDRAL_CRYSTAL';

  [3.08, 5.54, 7.24].forEach((y, tierIndex) => {
    const radius = tierIndex === 0 ? 2.26 : tierIndex === 1 ? 1.48 : 1.38;
    const gallery = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.04, tierIndex === 0 ? 0.24 : 0.17, 12), tierIndex === 1 ? materials.gold : materials.silver);
    gallery.name = `ISLAND_15_KEEP_V7_CARVED_TIER_GALLERY_${tierIndex + 1}`;
    gallery.position.set(0, y, -0.18);
    keep.add(gallery);
    for (let bossIndex = 0; bossIndex < 12; bossIndex += 1) {
      const angle = bossIndex / 12 * Math.PI * 2;
      const boss = new THREE.Mesh(new THREE.OctahedronGeometry(tierIndex === 0 ? 0.12 : 0.1, 0), bossIndex % 2 ? materials.violetCrystal : materials.crystalGlow);
      boss.name = `ISLAND_15_KEEP_V7_TIER_${tierIndex + 1}_FACET_BOSS_${bossIndex + 1}`;
      boss.position.set(Math.cos(angle) * radius, y + 0.2, -0.18 + Math.sin(angle) * radius);
      boss.scale.y = 1.6;
      keep.add(boss);
    }
  });

  [
    [-2.84, 1.62, 1.28, 0.17], [2.84, 1.62, 1.28, -0.17],
    [-2.86, 1.62, -1.34, 0.17], [2.86, 1.62, -1.34, -0.17],
    [-1.66, 4.72, 0.64, 0.14], [1.66, 4.72, 0.64, -0.14],
    [-1.64, 4.72, -1.02, 0.14], [1.64, 4.72, -1.02, -0.14],
  ].forEach(([x, y, z, tilt], index) => {
    const pier = addBox(keep, `ISLAND_15_KEEP_V7_FLYING_BUTTRESS_PIER_${index + 1}`, [0.26, index < 4 ? 2.46 : 2.02, 0.34], [x, y, z], materials.castleShadow);
    pier.rotation.z = tilt;
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.26, index < 4 ? 1.12 : 0.86, 4), index % 2 ? materials.violetCrystal : materials.crystalGlow);
    blade.name = `ISLAND_15_KEEP_V7_BUTTRESS_CRYSTAL_BLADE_${index + 1}`;
    blade.position.set(x + Math.sign(x) * 0.08, y + (index < 4 ? 1.7 : 1.35), z);
    blade.rotation.y = Math.PI * 0.25;
    keep.add(blade);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(index < 4 ? 0.82 : 0.58, 0.075, 7, 28, Math.PI * 0.78), materials.silver);
    arch.name = `ISLAND_15_KEEP_V7_FLYING_BUTTRESS_ARCH_${index + 1}`;
    arch.position.set(x - Math.sign(x) * (index < 4 ? 0.58 : 0.4), y + (index < 4 ? 0.48 : 0.34), z);
    arch.rotation.y = Math.PI * 0.5;
    arch.rotation.z = index % 2 ? -0.28 : 0.28;
    keep.add(arch);
  });

  [-0.72, 0, 0.72].forEach((z, index) => {
    addFramedPointedArchWindow(keep, `ISLAND_15_KEEP_V3_EAST_WINDOW_${index + 1}`, 0.34, 0.92, [3.65, 1.18, z], materials, index === 1 ? materials.warmWindow : materials.crystalGlow, Math.PI * 0.5);
    addFramedPointedArchWindow(keep, `ISLAND_15_KEEP_V7_WEST_WINDOW_${index + 1}`, 0.34, 0.92, [-3.65, 1.18, z], materials, index === 1 ? materials.violetCrystal : materials.crystalGlow, -Math.PI * 0.5);
  });
  addCrystalCluster(keep, 'ISLAND_15_KEEP_V7_ENTRY_CRYSTALS_LEFT', [-1.65, 0.44, 3.16], materials.crystalGlow, 0.72);
  addCrystalCluster(keep, 'ISLAND_15_KEEP_V7_ENTRY_CRYSTALS_RIGHT', [1.65, 0.44, 3.16], materials.violetCrystal, 0.72);

  const heartLight = new THREE.PointLight(0x39dcff, 5.2, 11, 2);
  heartLight.name = 'ISLAND_15_KEEP_V7_CRYSTAL_HEART_LIGHT';
  heartLight.position.set(0, 8.25, 0.1);
  keep.add(heartLight);
  const portalWarmth = new THREE.PointLight(0xff9a50, 3.8, 6.2, 2);
  portalWarmth.name = 'ISLAND_15_KEEP_V7_PORTAL_WARMTH';
  portalWarmth.position.set(0, 1.5, 3.0);
  keep.add(portalWarmth);
  const violetFill = new THREE.PointLight(0x794eff, 3.3, 8.4, 2);
  violetFill.name = 'ISLAND_15_KEEP_V7_VIOLET_TRANSEPT_FILL';
  violetFill.position.set(-2.7, 3.2, -0.2);
  keep.add(violetFill);
  [
    [-2.42, 3.88, 1.5, 0x35e9ff],
    [2.42, 3.98, 1.5, 0x9e66ff],
    [-2.4, 3.82, -1.62, 0x8d5eff],
    [2.4, 3.88, -1.62, 0x35e9ff],
  ].forEach(([x, y, z, color], index) => {
    const spill = new THREE.PointLight(color, 1.35, 4.4, 2);
    spill.name = `ISLAND_15_KEEP_V7_TOWER_CRYSTAL_SPILL_${index + 1}`;
    spill.position.set(x, y, z);
    keep.add(spill);
  });

  root.add(keep);
}

function addFrozenThroneInterior(root: THREE.Group, level: BuildLevel, materials: Island15CrystalGlacierMaterials) {
  const chamber = addRoomShell(root, 'ISLAND_15_FROZEN_THRONE_CHAMBER', level, materials, materials.violetCrystal, materials.castleShadow);
  chamber.name = 'ISLAND_15_FROZEN_THRONE_INTERIOR';
  chamber.scale.setScalar(1.34);
  chamber.position.set(0, 0.34, 0.1);
  chamber.userData.island15BossInterior = true;
  chamber.visible = false;
  chamber.traverse((object) => {
    if (object.userData.island15OverviewExterior) object.visible = false;
  });

  addIsland15FacadeFinish(chamber, 'ISLAND_15_FROZEN_THRONE_APSE_FINISH', [0, 1.34, -1.065], 2.72, 1.78, 3, materials);
  addIsland15FacadeFinish(chamber, 'ISLAND_15_FROZEN_THRONE_EAST_FINISH', [1.38, 1.18, -0.28], 1.42, 1.36, 2, materials, Math.PI * 0.5);
  addIsland15FacadeFinish(chamber, 'ISLAND_15_FROZEN_THRONE_WEST_FINISH', [-1.38, 1.18, -0.28], 1.42, 1.36, 2, materials, -Math.PI * 0.5);
  addPointedArchWindow(chamber, 'ISLAND_15_FROZEN_THRONE_APSE_OUTER_ARCH', 1.78, 2.2, [0, 0.28, -1.045], materials.silver);
  addPointedArchWindow(chamber, 'ISLAND_15_FROZEN_THRONE_APSE_DEEP_ARCH', 1.5, 1.98, [0, 0.38, -0.995], materials.midnight);
  addPointedArchWindow(chamber, 'ISLAND_15_FROZEN_THRONE_APSE_AURORA_GLASS', 1.22, 1.72, [0, 0.5, -0.94], materials.castleShadow);
  [-1.18, -0.86, 0.86, 1.18].forEach((x, index) => {
    addBox(chamber, `ISLAND_15_FROZEN_THRONE_APSE_TRACERY_${index + 1}`, [0.1, 1.76, 0.12], [x, 1.22, -0.95], materials.silver);
    const apseGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), index % 2 ? materials.violetCrystal : materials.crystalGlow);
    apseGem.name = `ISLAND_15_FROZEN_THRONE_APSE_GEM_${index + 1}`;
    apseGem.position.set(x, 2.16, -0.9);
    apseGem.scale.y = 1.55;
    chamber.add(apseGem);
  });

  const daisLower = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.48, 0.2, 10), materials.castleShadow);
  daisLower.name = 'ISLAND_15_FROZEN_THRONE_DAIS_LOWER_STEP';
  daisLower.position.set(0, 0.27, -0.34);
  chamber.add(daisLower);
  const dais = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.22, 0.34, 10), materials.deepIce);
  dais.name = 'ISLAND_15_FROZEN_THRONE_DAIS';
  dais.position.set(0, 0.38, -0.46);
  chamber.add(dais);
  const daisStep = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.96, 0.16, 10), materials.silver);
  daisStep.name = 'ISLAND_15_FROZEN_THRONE_DAIS_STEP';
  daisStep.position.set(0, 0.61, -0.38);
  chamber.add(daisStep);
  addBox(chamber, 'ISLAND_15_FROZEN_THRONE_SEAT_3D', [1.08, 0.54, 0.82], [0, 0.88, -0.3], materials.castleShadow);
  addBox(chamber, 'ISLAND_15_FROZEN_THRONE_SEAT_CUSHION', [0.82, 0.14, 0.64], [0, 1.2, -0.16], materials.deepIce);
  addIsland15ExtrudedPointedReveal(chamber, 'ISLAND_15_FROZEN_THRONE_BACK_3D', 1.46, 2.54, 0.28, [0, 0.66, -0.94], materials.castle);
  addIsland15ExtrudedPointedReveal(chamber, 'ISLAND_15_FROZEN_THRONE_BACK_INLAY', 1.08, 2.12, 0.1, [0, 0.84, -0.62], materials.midnight);
  addIsland15ExtrudedPointedReveal(chamber, 'ISLAND_15_FROZEN_THRONE_BACK_CRYSTAL_PANEL', 0.62, 1.54, 0.06, [0, 1.08, -0.48], materials.violetCrystal);
  addPointedArchWindow(chamber, 'ISLAND_15_FROZEN_THRONE_BACK_SILVER_ARCH', 1.12, 1.82, [0, 0.68, -0.55], materials.silver);
  addPointedArchWindow(chamber, 'ISLAND_15_FROZEN_THRONE_BACK_MIDNIGHT_ARCH', 0.92, 1.62, [0, 0.78, -0.5], materials.midnight);
  addPointedArchWindow(chamber, 'ISLAND_15_FROZEN_THRONE_BACK_CRYSTAL_INLAY', 0.62, 1.36, [0, 0.9, -0.44], materials.heroCrystal);
  [-1, 1].forEach((side, index) => {
    const scroll = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.11, 8, 30, Math.PI * 0.72), materials.silver);
    scroll.name = `ISLAND_15_FROZEN_THRONE_SCROLL_ARM_${index + 1}`;
    scroll.position.set(side * 0.78, 1.5, -0.56);
    scroll.rotation.z = side > 0 ? -Math.PI * 0.08 : Math.PI * 0.8;
    scroll.scale.set(0.82, 1.28, 0.72);
    chamber.add(scroll);
  });
  [-0.98, -0.72, -0.46, 0, 0.46, 0.72, 0.98].forEach((x, index) => {
    const normalized = Math.abs(x);
    const fan = addCrystal(
      chamber,
      `ISLAND_15_FROZEN_THRONE_CRYSTAL_FAN_${index + 1}`,
      [x, 1.68 + (1 - normalized) * 0.4, -1.02 + normalized * 0.08],
      [0.26 + (1 - normalized) * 0.08, 1.12 + (1 - normalized) * 1.0, 0.28],
      index % 3 === 1 ? materials.violetCrystal : materials.crystalGlow,
      6,
    );
    fan.rotation.z = -x * 0.34;
  });
  [-0.53, 0.53].forEach((x, index) => {
    addBox(chamber, `ISLAND_15_FROZEN_THRONE_ARM_${index + 1}`, [0.16, 0.62, 0.66], [x, 0.98, -0.48], materials.silver);
    addCrystal(chamber, `ISLAND_15_FROZEN_THRONE_ARM_FINIAL_${index + 1}`, [x, 1.42, -0.47], [0.22, 0.52, 0.22], index ? materials.violetCrystal : materials.crystalGlow, 6);
  });
  [-0.38, 0, 0.38].forEach((x, index) => {
    const apronGem = new THREE.Mesh(new THREE.OctahedronGeometry(index === 1 ? 0.14 : 0.1, 0), index === 1 ? materials.heroCrystal : materials.crystalGlow);
    apronGem.name = `ISLAND_15_FROZEN_THRONE_APRON_GEM_${index + 1}`;
    apronGem.position.set(x, 0.93 + (index === 1 ? 0.08 : 0), 0.16);
    apronGem.scale.y = 1.42;
    chamber.add(apronGem);
  });
  [-0.42, 0, 0.42].forEach((x, index) => {
    const crown = addCrystal(chamber, `ISLAND_15_FROZEN_THRONE_CROWN_BLADE_${index + 1}`, [x, 2.78 + (index === 1 ? 0.16 : 0), -0.88], [0.22, 0.68 + (index === 1 ? 0.2 : 0), 0.22], index === 1 ? materials.heroCrystal : materials.violetCrystal, 6);
    crown.rotation.z = x * -0.38;
  });
  [-0.68, 0.68].forEach((x, index) => {
    const outerBlade = addCrystal(chamber, `ISLAND_15_FROZEN_THRONE_OUTER_CROWN_BLADE_${index + 1}`, [x, 2.46, -0.78], [0.2, 0.78, 0.2], index ? materials.violetCrystal : materials.crystalGlow, 6);
    outerBlade.rotation.z = index ? -0.3 : 0.3;
  });
  const throneHeart = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), materials.crystalGlow);
  throneHeart.name = 'ISLAND_15_FROZEN_THRONE_HEART_GEM';
  throneHeart.position.set(0, 1.72, -0.35);
  throneHeart.scale.y = 1.5;
  chamber.add(throneHeart);
  const crownEngine = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), materials.heroCrystal);
  crownEngine.name = 'ISLAND_15_FROZEN_THRONE_CROWN_ENGINE';
  crownEngine.position.set(0, 3.02, -0.88);
  crownEngine.scale.set(1.12, 1.62, 1.12);
  crownEngine.userData.island15Animated = 'throne-engine';
  chamber.add(crownEngine);
  const crownEngineHalo = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.045, 7, 36), materials.gold);
  crownEngineHalo.name = 'ISLAND_15_FROZEN_THRONE_CROWN_ENGINE_HALO';
  crownEngineHalo.position.copy(crownEngine.position);
  chamber.add(crownEngineHalo);
  const crownEngineLight = new THREE.PointLight(0x78eaff, 1.55, 3.4, 2);
  crownEngineLight.name = 'ISLAND_15_FROZEN_THRONE_CROWN_ENGINE_LIGHT';
  crownEngineLight.position.set(0, 2.92, -0.72);
  chamber.add(crownEngineLight);
  [-1.16, 1.16].forEach((x, index) => {
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 1.92, 8), materials.castle);
    column.name = `ISLAND_15_FROZEN_THRONE_APSE_COLUMN_${index + 1}`;
    column.position.set(x, 1.2, 0.02);
    chamber.add(column);
    const capital = new THREE.Mesh(new THREE.OctahedronGeometry(0.23, 0), index ? materials.violetCrystal : materials.crystalGlow);
    capital.name = `ISLAND_15_FROZEN_THRONE_APSE_CAPITAL_${index + 1}`;
    capital.position.set(x, 2.2, 0.02);
    capital.scale.y = 1.55;
    chamber.add(capital);
    const guardianHalo = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 6, 24), index ? materials.violetCrystal : materials.crystalGlow);
    guardianHalo.name = `ISLAND_15_FROZEN_THRONE_GUARDIAN_HALO_${index + 1}`;
    guardianHalo.position.set(x, 1.52, 0.16);
    chamber.add(guardianHalo);
    const guardianBody = addCrystal(
      chamber,
      `ISLAND_15_FROZEN_THRONE_GUARDIAN_BODY_${index + 1}`,
      [x, 1.02, 0.14],
      [0.28, 0.86, 0.28],
      index ? materials.violetCrystal : materials.crystalGlow,
      6,
    );
    guardianBody.rotation.z = index ? -0.08 : 0.08;
  });
  [-1.03, 1.03].forEach((x, index) => {
    addCrystalCluster(chamber, `ISLAND_15_FROZEN_THRONE_SENTINEL_${index + 1}`, [x, 0.24, -0.42], index ? materials.violetCrystal : materials.crystalGlow, 0.68);
    const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.23, 0.42, 8), materials.silver);
    brazier.name = `ISLAND_15_FROZEN_THRONE_BRAZIER_${index + 1}`;
    brazier.position.set(x, 0.45, 0.54);
    chamber.add(brazier);
    const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), index ? materials.violetCrystal : materials.warmWindow);
    flame.name = `ISLAND_15_FROZEN_THRONE_BRAZIER_FLAME_${index + 1}`;
    flame.position.set(x, 0.8, 0.54);
    flame.scale.y = 1.7;
    chamber.add(flame);
    const shrine = addGothicSpire(
      chamber,
      `ISLAND_15_FROZEN_THRONE_SIDE_SHRINE_${index + 1}`,
      [x, 0.18, 0.12],
      1.62,
      materials,
      index ? materials.violetCrystal : materials.crystalGlow,
      0.2,
    );
    shrine.scale.z = 0.86;
  });
  const aisle = addBox(chamber, 'ISLAND_15_FROZEN_THRONE_AURORA_AISLE', [0.72, 0.045, 1.72], [0, 0.23, 0.36], materials.violetCrystal);
  aisle.rotation.y = 0;
  const throneSigil = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.055, 7, 36), materials.crystalGlow);
  throneSigil.name = 'ISLAND_15_FROZEN_THRONE_FLOOR_SIGIL';
  throneSigil.position.set(0, 0.27, 0.25);
  throneSigil.rotation.x = Math.PI * 0.5;
  chamber.add(throneSigil);
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2;
    const rune = new THREE.Mesh(new THREE.OctahedronGeometry(0.105, 0), index % 2 ? materials.violetCrystal : materials.crystalGlow);
    rune.name = `ISLAND_15_FROZEN_THRONE_FLOOR_RUNE_${index + 1}`;
    rune.position.set(Math.cos(angle) * 0.9, 0.3, 0.25 + Math.sin(angle) * 0.68);
    rune.scale.set(1, 0.28, 1);
    rune.rotation.y = angle;
    chamber.add(rune);
  }
  const innerSigil = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 7, 32), materials.violetCrystal);
  innerSigil.name = 'ISLAND_15_FROZEN_THRONE_INNER_FLOOR_SIGIL';
  innerSigil.position.set(0, 0.285, 0.25);
  innerSigil.rotation.x = Math.PI * 0.5;
  chamber.add(innerSigil);
  [-1.16, -0.78, 0.78, 1.16].forEach((x, index) => {
    const aisleCrystal = addCrystal(chamber, `ISLAND_15_FROZEN_THRONE_AISLE_CRYSTAL_${index + 1}`, [x, 0.48, 0.84 - Math.abs(x) * 0.18], [0.2, 0.58 + (index % 2) * 0.18, 0.2], index % 2 ? materials.violetCrystal : materials.crystalGlow, 6);
    aisleCrystal.rotation.z = x * -0.12;
  });
  const chandelier = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), materials.heroCrystal);
  chandelier.name = 'ISLAND_15_FROZEN_THRONE_CHANDELIER';
  chandelier.position.set(0, 2.66, 0.12);
  chandelier.scale.y = 1.9;
  chandelier.userData.island15Animated = 'throne-chandelier';
  chamber.add(chandelier);
  const throneLight = new THREE.PointLight(0x9d74ff, 3.7, 6.5, 2);
  throneLight.name = 'ISLAND_15_FROZEN_THRONE_INTERIOR_LIGHT';
  throneLight.position.set(0, 1.78, -0.22);
  chamber.add(throneLight);
  const apseLight = new THREE.PointLight(0x42e8ff, 3.25, 5.8, 2);
  apseLight.name = 'ISLAND_15_FROZEN_THRONE_APSE_LIGHT';
  apseLight.position.set(0, 1.74, -0.72);
  chamber.add(apseLight);
  [-1, 1].forEach((side, index) => {
    const warmth = new THREE.PointLight(index ? 0xa26cff : 0xff9c59, 1.7, 3.1, 2);
    warmth.name = `ISLAND_15_FROZEN_THRONE_SIDE_WARMTH_${index + 1}`;
    warmth.position.set(side * 1.02, 0.92, 0.34);
    chamber.add(warmth);
  });
  const throneFootlight = new THREE.PointLight(0x2de8ff, 2.15, 3.8, 2);
  throneFootlight.name = 'ISLAND_15_FROZEN_THRONE_FOOTLIGHT';
  throneFootlight.position.set(0, 0.42, 0.4);
  chamber.add(throneFootlight);
  const throneHearthGlow = new THREE.PointLight(0xff8a4f, 1.55, 3.2, 2);
  throneHearthGlow.name = 'ISLAND_15_FROZEN_THRONE_HEARTH_GLOW';
  throneHearthGlow.position.set(0, 1.12, -0.78);
  chamber.add(throneHearthGlow);
}

type Island15PalaceRoomBuilder = (
  root: THREE.Group,
  level: BuildLevel,
  materials: Island15CrystalGlacierMaterials,
) => void;

function canonicalizeIsland15StaticMaterials(root: THREE.Object3D): void {
  const canonical = new Map<string, THREE.Material>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
    const material = object.material as THREE.Material & {
      color?: THREE.Color;
      emissive?: THREE.Color;
      roughness?: number;
      metalness?: number;
      transmission?: number;
      thickness?: number;
      clearcoat?: number;
      map?: THREE.Texture | null;
      emissiveMap?: THREE.Texture | null;
    };
    const signature = [
      material.type,
      material.color?.getHexString() ?? '',
      material.emissive?.getHexString() ?? '',
      material.roughness ?? '',
      material.metalness ?? '',
      material.transmission ?? '',
      material.thickness ?? '',
      material.clearcoat ?? '',
      material.opacity,
      material.transparent ? 1 : 0,
      material.depthWrite ? 1 : 0,
      material.depthTest ? 1 : 0,
      material.side,
      material.blending,
      material.vertexColors ? 1 : 0,
      material.map?.uuid ?? '',
      material.emissiveMap?.uuid ?? '',
    ].join('|');
    const shared = canonical.get(signature);
    if (shared) object.material = shared;
    else canonical.set(signature, material);
  });
}

function createIsland15GabledPrismGeometry(
  width: number,
  wallHeight: number,
  roofHeight: number,
  depth: number,
) {
  const halfWidth = width * 0.5;
  const halfDepth = depth * 0.5;
  const ridge = wallHeight + roofHeight;
  const positions = new Float32Array([
    -halfWidth, 0, halfDepth,
    halfWidth, 0, halfDepth,
    halfWidth, wallHeight, halfDepth,
    0, ridge, halfDepth,
    -halfWidth, wallHeight, halfDepth,
    -halfWidth, 0, -halfDepth,
    halfWidth, 0, -halfDepth,
    halfWidth, wallHeight, -halfDepth,
    0, ridge, -halfDepth,
    -halfWidth, wallHeight, -halfDepth,
  ]);
  const indices = [
    0, 1, 2, 0, 2, 4, 4, 2, 3,
    7, 6, 5, 9, 7, 5, 8, 7, 9,
    0, 5, 6, 0, 6, 1,
    1, 6, 7, 1, 7, 2,
    2, 7, 8, 2, 8, 3,
    3, 8, 9, 3, 9, 4,
    4, 9, 5, 4, 5, 0,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const uvs = new Float32Array(10 * 2);
  for (let index = 0; index < 10; index += 1) {
    const x = positions[index * 3];
    const y = positions[index * 3 + 1];
    uvs[index * 2] = x / width + 0.5;
    uvs[index * 2 + 1] = y / ridge;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addIsland15GabledMass(
  parent: THREE.Object3D,
  name: string,
  size: readonly [number, number, number, number],
  position: readonly [number, number, number],
  material: THREE.Material,
  rotationY = 0,
) {
  const mass = new THREE.Mesh(createIsland15GabledPrismGeometry(...size), material);
  mass.name = name;
  mass.position.set(...position);
  mass.rotation.y = rotationY;
  mass.castShadow = true;
  mass.receiveShadow = true;
  parent.add(mass);
  return mass;
}

function addIsland15ExtrudedPointedReveal(
  parent: THREE.Object3D,
  name: string,
  width: number,
  height: number,
  depth: number,
  position: readonly [number, number, number],
  material: THREE.Material,
) {
  const shape = new THREE.Shape();
  shape.moveTo(-width * 0.5, 0);
  shape.lineTo(-width * 0.5, height * 0.56);
  shape.quadraticCurveTo(-width * 0.42, height * 0.8, 0, height);
  shape.quadraticCurveTo(width * 0.42, height * 0.8, width * 0.5, height * 0.56);
  shape.lineTo(width * 0.5, 0);
  shape.closePath();
  const reveal = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: Math.min(0.055, width * 0.025),
    bevelThickness: 0.04,
    curveSegments: 8,
  }), material);
  reveal.name = name;
  reveal.position.set(...position);
  reveal.castShadow = true;
  parent.add(reveal);
  return reveal;
}

function addIsland15ArchitecturalBeam(
  parent: THREE.Object3D,
  name: string,
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  radius: number,
  material: THREE.Material,
) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const direction = end.clone().sub(start);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 6), material);
  beam.name = name;
  beam.position.copy(start).add(end).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  beam.castShadow = true;
  parent.add(beam);
  return beam;
}

function addIsland15V58LuminousSpire(
  parent: THREE.Object3D,
  name: string,
  position: readonly [number, number, number],
  crystalHeight: number,
  radius: number,
  crystalMaterial: THREE.Material,
  socketMaterial: THREE.Material,
  collarMaterial: THREE.Material,
) {
  const spire = new THREE.Group();
  spire.name = name;
  spire.position.set(...position);
  spire.userData.island15V58ExteriorOpticalHierarchy = true;
  spire.userData.island15BuildLevelInvariant = true;

  const socket = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.34, radius * 1.58, 0.36, 8),
    socketMaterial,
  );
  socket.name = `${name}_ENGAGED_SOCKET`;
  socket.position.y = 0.18;
  socket.castShadow = true;
  socket.receiveShadow = true;
  spire.add(socket);

  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.48, radius * 1.48, 0.1, 8),
    collarMaterial,
  );
  collar.name = `${name}_SILVER_COLLAR`;
  collar.position.y = 0.38;
  collar.castShadow = true;
  spire.add(collar);

  const bodyHeight = crystalHeight * 0.64;
  const tipHeight = crystalHeight - bodyHeight;
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.78, radius, bodyHeight, 6),
    crystalMaterial,
  );
  body.name = `${name}_FACETED_BODY`;
  body.position.y = 0.43 + bodyHeight * 0.5;
  body.rotation.y = Math.PI / 6;
  body.castShadow = true;
  spire.add(body);

  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(radius * 0.8, tipHeight, 6),
    crystalMaterial,
  );
  tip.name = `${name}_LANCET_TIP`;
  tip.position.y = 0.43 + bodyHeight + tipHeight * 0.5;
  tip.rotation.y = Math.PI / 6;
  tip.castShadow = true;
  spire.add(tip);

  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(radius * 0.52, 0),
    crystalMaterial,
  );
  core.name = `${name}_LUMINOUS_HEART`;
  core.position.y = 0.43 + bodyHeight * 0.62;
  core.scale.y = 1.8;
  core.rotation.y = Math.PI / 4;
  spire.add(core);

  parent.add(spire);
  return spire;
}

/**
 * Builds the permanent interior floor plan between the Boss Hall hub and the
 * four palace wings. The gallery floors are the only circulation geometry
 * allowed to cross the renderer-owned Boss-route annulus, and their top is
 * deliberately held below y=0.25. Raised stairs, jambs and vault ribs begin
 * outside that envelope, so the exact 36-tile circle remains unobstructed.
 */
function addIsland15InteriorCirculationSystem(
  parent: THREE.Object3D,
  materials: Island15CrystalGlacierMaterials,
) {
  const circulation = new THREE.Group();
  circulation.name = 'ISLAND_15_SHARED_INTERIOR_CIRCULATION';
  circulation.userData.island15PermanentInterior = true;
  circulation.userData.island15BuildLevelInvariant = true;
  circulation.userData.island15FloorPlan = {
    hub: 'BOSS',
    protectedAnnulusFloorTop: 0.245,
    rooms: ['HATCHERY', 'HABIT', 'MYSTERY', 'WISDOM'],
  };

  const gallerySpecs: readonly {
    room: 'HATCHERY' | 'HABIT' | 'MYSTERY' | 'WISDOM';
    angle: number;
    accent: THREE.Material;
  }[] = [
    { room: 'HATCHERY', angle: -Math.PI * 0.25, accent: materials.warmWindow },
    { room: 'HABIT', angle: Math.PI * 0.25, accent: materials.crystalGlow },
    { room: 'MYSTERY', angle: Math.PI * 0.75, accent: materials.violetCrystal },
    { room: 'WISDOM', angle: -Math.PI * 0.75, accent: materials.gold },
  ];

  gallerySpecs.forEach(({ room, angle, accent }, galleryIndex) => {
    const gallery = new THREE.Group();
    gallery.name = `ISLAND_15_${room}_HUB_GALLERY`;
    gallery.rotation.y = angle;
    gallery.userData.island15Connects = ['BOSS', room];
    gallery.userData.island15InteriorGallery = true;
    const markFocusOccluder = <T extends THREE.Object3D>(object: T): T => {
      object.userData.island15FocusOccluderForRoom = room;
      return object;
    };

    const floor = addBox(
      gallery,
      `ISLAND_15_${room}_GALLERY_FLOOR`,
      [1.16, 0.14, 1.34],
      [0, 0.175, 4.48],
      materials.castleShadow,
    );
    floor.userData.island15ProtectedAnnulusFloorTop = 0.245;
    floor.userData.island15GameplayCollision = false;
    const floorInlay = addBox(
      gallery,
      `ISLAND_15_${room}_GALLERY_GUIDE_INLAY`,
      [0.16, 0.012, 1.22],
      [0, 0.239, 4.48],
      accent,
    );
    floorInlay.userData.island15ProtectedAnnulusFloorTop = 0.245;
    floorInlay.userData.island15GameplayCollision = false;

    // Three shallow risers begin beyond the route ring and meet the raised
    // floor of the physically embedded wing room instead of faking a doorway.
    [
      { z: 4.33, y: 0.29, height: 0.1, depth: 0.16 },
      { z: 4.49, y: 0.36, height: 0.14, depth: 0.18 },
      { z: 4.67, y: 0.45, height: 0.18, depth: 0.2 },
    ].forEach(({ z, y, height, depth }, stepIndex) => {
      const step = addBox(
        gallery,
        `ISLAND_15_${room}_GALLERY_RISER_${stepIndex + 1}`,
        [0.98 - stepIndex * 0.06, height, depth],
        [0, y, z],
        stepIndex === 1 ? materials.castle : materials.deepIce,
      );
      step.userData.island15OutsideProtectedAnnulus = true;
    });

    // The inner portal is an open, genuinely volumetric frame. Its nearest
    // corner is still beyond the protected annulus even at full beam radius.
    [-0.57, 0.57].forEach((x, sideIndex) => {
      const jamb = addBox(
        gallery,
        `ISLAND_15_${room}_GALLERY_PORTAL_JAMB_${sideIndex + 1}`,
        [0.14, 1.42, 0.16],
        [x, 0.96, 4.39],
        materials.silver,
      );
      jamb.userData.island15OutsideProtectedAnnulus = true;
      const capital = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), accent);
      capital.name = `ISLAND_15_${room}_GALLERY_PORTAL_CAPITAL_${sideIndex + 1}`;
      capital.position.set(x, 1.72, 4.39);
      capital.scale.y = 1.28;
      capital.castShadow = true;
      gallery.add(capital);
    });
    markFocusOccluder(addIsland15ArchitecturalBeam(
      gallery,
      `ISLAND_15_${room}_GALLERY_PORTAL_RIB_LEFT`,
      [-0.58, 1.67, 4.39],
      [0, 2.26, 4.39],
      0.075,
      materials.silver,
    ));
    markFocusOccluder(addIsland15ArchitecturalBeam(
      gallery,
      `ISLAND_15_${room}_GALLERY_PORTAL_RIB_RIGHT`,
      [0.58, 1.67, 4.39],
      [0, 2.26, 4.39],
      0.075,
      materials.silver,
    ));
    const portalHeart = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), accent);
    portalHeart.name = `ISLAND_15_${room}_GALLERY_PORTAL_HEART`;
    portalHeart.position.set(0, 2.11, 4.38);
    portalHeart.scale.y = 1.5;
    portalHeart.castShadow = true;
    markFocusOccluder(portalHeart);
    gallery.add(portalHeart);

    // Short side walls and repeated transverse ribs read as a traversable
    // crystal gallery from both the Boss Hall and the close room cameras.
    [-0.61, 0.61].forEach((x, sideIndex) => {
      const dado = addBox(
        gallery,
        `ISLAND_15_${room}_GALLERY_DADO_${sideIndex + 1}`,
        [0.13, 0.84, 0.72],
        [x, 0.68, 4.75],
        sideIndex === galleryIndex % 2 ? materials.deepIce : materials.castleShadow,
      );
      dado.userData.island15OutsideProtectedAnnulus = true;
      addBox(
        gallery,
        `ISLAND_15_${room}_GALLERY_DADO_INLAY_${sideIndex + 1}`,
        [0.145, 0.36, 0.42],
        [x + (sideIndex ? -0.012 : 0.012), 0.82, 4.76],
        accent,
      );
      markFocusOccluder(addIsland15ArchitecturalBeam(
        gallery,
        `ISLAND_15_${room}_GALLERY_VAULT_SPRING_${sideIndex + 1}`,
        [x, 1.02, 4.46],
        [sideIndex ? 0.2 : -0.2, 1.82, 4.78],
        0.055,
        materials.castle,
      ));
    });
    [4.58, 4.82, 5.02].forEach((z, ribIndex) => {
      markFocusOccluder(addIsland15ArchitecturalBeam(
        gallery,
        `ISLAND_15_${room}_GALLERY_CROSS_RIB_${ribIndex + 1}_LEFT`,
        [-0.61, 1.45, z],
        [0, 2.05, z],
        0.045,
        ribIndex === 1 ? accent : materials.silver,
      ));
      markFocusOccluder(addIsland15ArchitecturalBeam(
        gallery,
        `ISLAND_15_${room}_GALLERY_CROSS_RIB_${ribIndex + 1}_RIGHT`,
        [0.61, 1.45, z],
        [0, 2.05, z],
        0.045,
        ribIndex === 1 ? accent : materials.silver,
      ));
    });

    const threshold = addBox(
      gallery,
      `ISLAND_15_${room}_ROOM_THRESHOLD`,
      [1.08, 0.16, 0.24],
      [0, 0.5, 4.92],
      materials.deepIce,
    );
    threshold.userData.island15PhysicalRoomThreshold = true;
    const thresholdRune = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), accent);
    thresholdRune.name = `ISLAND_15_${room}_THRESHOLD_RUNE`;
    thresholdRune.position.set(0, 0.61, 4.92);
    thresholdRune.scale.set(1.2, 0.22, 1.2);
    thresholdRune.castShadow = true;
    gallery.add(thresholdRune);

    circulation.add(gallery);
  });

  registerIsland15RuntimePart(
    'shared-interior-circulation',
    circulation,
    'Island15CrystalGlacierThreeWorld',
  );
  parent.add(circulation);
  return circulation;
}

function buildIsland15BroadTieredOverviewShell(
  overviewRoof: THREE.Group,
  permanentRear: THREE.Group,
  permanentCrown: THREE.Group,
  southNearWall: THREE.Group,
  materials: Island15CrystalGlacierMaterials,
) {
  const shell = new THREE.Group();
  shell.name = 'ISLAND_15_UNIFIED_PALACE_BROAD_TIERED_SHELL';
  const roofStone = materials.castle.clone();
  roofStone.name = 'ISLAND_15_PALACE_GLACIAL_SAPPHIRE_ROOF_STONE';
  roofStone.color.set(0x244b67);
  roofStone.emissive.set(0x071d2e);
  roofStone.emissiveIntensity = 0.12;
  roofStone.map = null;
  roofStone.bumpMap = null;
  roofStone.roughnessMap = null;
  roofStone.roughness = 0.28;
  roofStone.metalness = 0.16;
  const roofEdge = materials.silver.clone();
  roofEdge.name = 'ISLAND_15_PALACE_FROSTED_ROOF_EDGE';
  roofEdge.color.set(0xbdd9e1);
  roofEdge.roughness = 0.58;

  // A broad inhabited belt encloses the four corner rooms while every low
  // inner face remains outside the protected Boss-route review envelope.
  addBox(shell, 'ISLAND_15_PALACE_WEST_WING', [0.6, 3.0, 7.55], [-4.46, 1.72, -0.02], materials.castle);
  addBox(shell, 'ISLAND_15_PALACE_EAST_WING', [0.6, 3.0, 7.55], [4.46, 1.72, -0.02], materials.castle);
  addBox(shell, 'ISLAND_15_PALACE_SOUTH_WING_WEST', [3.0, 3.0, 0.28], [-2.45, 1.72, 4.42], materials.castle);
  addBox(shell, 'ISLAND_15_PALACE_SOUTH_WING_EAST', [3.0, 3.0, 0.28], [2.45, 1.72, 4.42], materials.castle);

  // Interlocking opaque gabled volumes make the palace read wide and fully
  // three-dimensional before the single restrained crystal crown appears.
  addIsland15GabledMass(shell, 'ISLAND_15_PALACE_MIDDLE_TRANSEPT', [8.55, 1.45, 1.25, 4.35], [0, 3.02, -0.08], materials.castle);
  addIsland15GabledMass(shell, 'ISLAND_15_PALACE_MIDDLE_TRANSEPT_ROOF', [8.58, 0.025, 1.25, 4.39], [0, 4.445, -0.08], roofStone);
  addIsland15GabledMass(shell, 'ISLAND_15_PALACE_MIDDLE_NAVE', [4.65, 1.38, 1.18, 8.12], [0, 3.08, -0.05], materials.castle);
  addIsland15GabledMass(shell, 'ISLAND_15_PALACE_MIDDLE_NAVE_ROOF', [4.69, 0.025, 1.18, 8.16], [0, 4.435, -0.05], roofStone);
  addIsland15GabledMass(shell, 'ISLAND_15_PALACE_UPPER_CLERESTORY', [5.05, 1.25, 1.25, 4.3], [0, 5.0, -0.18], materials.castleShadow);
  addIsland15GabledMass(shell, 'ISLAND_15_PALACE_UPPER_CLERESTORY_ROOF', [5.09, 0.025, 1.25, 4.34], [0, 6.225, -0.18], roofStone);
  addIsland15GabledMass(shell, 'ISLAND_15_PALACE_WEST_CHAPEL_GABLE', [2.5, 0.62, 0.9, 1.35], [-2.78, 3.02, 3.66], materials.castleShadow);
  addIsland15GabledMass(shell, 'ISLAND_15_PALACE_WEST_CHAPEL_ROOF', [2.54, 0.025, 0.9, 1.39], [-2.78, 3.615, 3.66], roofStone);
  addIsland15GabledMass(shell, 'ISLAND_15_PALACE_EAST_CHAPEL_GABLE', [2.5, 0.62, 0.9, 1.35], [2.78, 3.02, 3.66], materials.castleShadow);
  addIsland15GabledMass(shell, 'ISLAND_15_PALACE_EAST_CHAPEL_ROOF', [2.54, 0.025, 0.9, 1.39], [2.78, 3.615, 3.66], roofStone);

  [
    [[-2.325, 4.46, 4.02], [0, 5.64, 4.02]],
    [[2.325, 4.46, 4.02], [0, 5.64, 4.02]],
    [[-4.275, 4.47, 2.12], [0, 5.72, 2.12]],
    [[4.275, 4.47, 2.12], [0, 5.72, 2.12]],
    [[-2.525, 6.25, 1.99], [0, 7.5, 1.99]],
    [[2.525, 6.25, 1.99], [0, 7.5, 1.99]],
  ].forEach(([from, to], index) => {
    addIsland15ArchitecturalBeam(
      shell,
      `ISLAND_15_PALACE_GABLE_EDGE_RIB_${index + 1}`,
      from as [number, number, number],
      to as [number, number, number],
      index < 2 ? 0.075 : 0.06,
      roofEdge,
    );
  });

  [-1.52, -0.76, 0, 0.76, 1.52].forEach((x, index) => {
    addIsland15ExtrudedPointedReveal(shell, `ISLAND_15_UPPER_CLERESTORY_RECESS_${index + 1}`, 0.48, 1.18, 0.1, [x, 5.15, 1.98], materials.midnight);
    addIsland15ExtrudedPointedReveal(shell, `ISLAND_15_UPPER_CLERESTORY_GLASS_${index + 1}`, 0.3, 0.88, 0.06, [x, 5.22, 2.08], index === 2 ? materials.warmWindow : index % 2 ? materials.violetCrystal : materials.crystalGlow);
  });
  [-3.35, -2.72, 2.72, 3.35].forEach((x, index) => {
    addIsland15ExtrudedPointedReveal(shell, `ISLAND_15_TRANSEPT_RECESS_${index + 1}`, 0.42, 1.0, 0.09, [x, 3.28, 2.12], materials.midnight);
    addIsland15ExtrudedPointedReveal(shell, `ISLAND_15_TRANSEPT_GLASS_${index + 1}`, 0.25, 0.72, 0.05, [x, 3.35, 2.21], index % 2 ? materials.violetCrystal : materials.crystalGlow);
  });
  [-2.78, 2.78].forEach((x, index) => {
    addIsland15ExtrudedPointedReveal(shell, `ISLAND_15_CHAPEL_GABLE_RECESS_${index + 1}`, 0.7, 1.24, 0.12, [x, 3.17, 4.3], materials.midnight);
    addIsland15ExtrudedPointedReveal(shell, `ISLAND_15_CHAPEL_GABLE_GLASS_${index + 1}`, 0.42, 0.88, 0.06, [x, 3.24, 4.42], index ? materials.violetCrystal : materials.crystalGlow);
  });
  [-1, 1].forEach((side, index) => {
    const brace = addBox(
      shell,
      `ISLAND_15_PALACE_FLYING_BUTTRESS_${index + 1}`,
      [2.25, 0.2, 0.24],
      [side * 3.18, 4.35, 1.42],
      materials.silver,
    );
    brace.rotation.z = side * -0.52;
  });
  [-2.52, -0.86, 0.86, 2.52].forEach((z, index) => {
    addFramedPointedArchWindow(
      shell,
      `ISLAND_15_EAST_WING_LANCET_${index + 1}`,
      0.46,
      1.22,
      [4.775, 1.42, z],
      materials,
      index % 3 === 1 ? materials.warmWindow : index % 2 ? materials.violetCrystal : materials.crystalGlow,
      Math.PI * 0.5,
    );
    addFramedPointedArchWindow(
      shell,
      `ISLAND_15_WEST_WING_LANCET_${index + 1}`,
      0.46,
      1.22,
      [-4.775, 1.42, z],
      materials,
      index % 3 === 1 ? materials.warmWindow : index % 2 ? materials.crystalGlow : materials.violetCrystal,
      -Math.PI * 0.5,
    );
  });

  // Rear wall survives room cutaways as stepped architecture, not a blank slab.
  addBox(permanentRear, 'ISLAND_15_UNIFIED_PALACE_REAR_LOWER_BELT', [8.1, 2.55, 0.36], [0, 1.48, -4.38], materials.castle);
  addBox(permanentRear, 'ISLAND_15_UNIFIED_PALACE_REAR_CLERESTORY', [6.8, 2.05, 0.38], [0, 3.78, -4.08], materials.castleShadow);
  addIsland15GabledMass(permanentRear, 'ISLAND_15_UNIFIED_PALACE_REAR_GABLE', [5.0, 0.9, 1.0, 0.34], [0, 4.82, -4.02], roofStone);
  [-2.75, -1.38, 0, 1.38, 2.75].forEach((x, index) => {
    addFramedPointedArchWindow(
      permanentRear,
      `ISLAND_15_UNIFIED_PALACE_REAR_LANCET_${index + 1}`,
      0.54,
      1.42,
      [x, 2.86, -3.86],
      materials,
      index === 2 ? materials.warmWindow : index % 2 ? materials.violetCrystal : materials.crystalGlow,
      Math.PI,
    );
  });

  // V58 Quality-Lord bounded rear correction. The earlier lancets were seated
  // on the inner face of the lower rear belt, leaving the actual rear camera
  // with a blank slab. One projecting apse family now continues the palace's
  // Gothic load path around the building and carries its glazing on the true
  // outward (-Z) face. It remains below the existing roof silhouette.
  const rearApse = new THREE.Group();
  rearApse.name = 'ISLAND_15_V58_REAR_GOTHIC_APSE_DEPTH';
  rearApse.userData.island15BuildLevelInvariant = true;
  rearApse.userData.island15ExteriorCorrectionFamily = 'v58-luminous-vertical-hierarchy';
  rearApse.userData.island15RearCorrection = 'projecting-inhabited-apse';
  const rearApseStone = materials.castle.clone();
  rearApseStone.name = 'ISLAND_15_V58_REAR_APSE_GLACIAL_STONE';
  rearApseStone.color.set(0x9ab8c6);
  rearApseStone.emissive.set(0x0b2735);
  rearApseStone.emissiveIntensity = 0.14;
  rearApseStone.roughness = 0.48;
  const rearApseShadow = materials.castleShadow.clone();
  rearApseShadow.name = 'ISLAND_15_V58_REAR_APSE_SAPPHIRE_SHADOW';
  rearApseShadow.color.set(0x56768a);
  rearApseShadow.emissive.set(0x081d2a);
  rearApseShadow.emissiveIntensity = 0.12;
  rearApseShadow.roughness = 0.56;
  const rearApseSilver = materials.silver.clone();
  rearApseSilver.name = 'ISLAND_15_V58_REAR_APSE_FROSTED_SILVER';
  rearApseSilver.color.set(0xd7f0f4);
  rearApseSilver.emissive.set(0x123543);
  rearApseSilver.emissiveIntensity = 0.1;
  rearApseSilver.roughness = 0.28;
  addBox(
    rearApse,
    'ISLAND_15_V58_REAR_APSE_FOUNDATION_COURSE',
    [5.3, 0.34, 0.86],
    [0, 0.42, -4.62],
    rearApseShadow,
  );
  addIsland15GabledMass(
    rearApse,
    'ISLAND_15_V58_REAR_APSE_MAIN_GABLED_VOLUME',
    [4.92, 2.35, 0.95, 0.84],
    [0, 0.48, -4.63],
    rearApseStone,
  );
  addBox(
    rearApse,
    'ISLAND_15_V58_REAR_APSE_SILVER_SILL_COURSE',
    [5.12, 0.14, 0.9],
    [0, 0.72, -4.64],
    rearApseSilver,
  );
  addBox(
    rearApse,
    'ISLAND_15_V58_REAR_APSE_GOLD_SPRING_COURSE',
    [4.84, 0.09, 0.88],
    [0, 2.64, -4.64],
    materials.gold,
  );
  addIsland15GabledMass(
    rearApse,
    'ISLAND_15_V58_REAR_APSE_RAISED_CLERESTORY',
    [3.58, 0.9, 0.72, 0.68],
    [0, 2.83, -4.46],
    rearApseShadow,
  );
  addIsland15GabledMass(
    rearApse,
    'ISLAND_15_V58_REAR_APSE_RAISED_CLERESTORY_ROOF',
    [3.66, 0.05, 0.7, 0.74],
    [0, 4.41, -4.46],
    roofStone,
  );
  addBox(
    rearApse,
    'ISLAND_15_V58_REAR_APSE_CLERESTORY_SILVER_CORNICE',
    [3.78, 0.12, 0.74],
    [0, 3.72, -4.47],
    rearApseSilver,
  );

  const addRearLayeredLancet = (
    name: string,
    x: number,
    baseY: number,
    width: number,
    height: number,
    faceZ: number,
    glow: THREE.Material,
  ) => {
    const recess = addIsland15ExtrudedPointedReveal(
      rearApse,
      `${name}_DEEP_RECESS`,
      width * 1.38,
      height * 1.12,
      0.15,
      [x, baseY, faceZ],
      materials.midnight,
    );
    recess.rotation.y = Math.PI;
    const frame = addIsland15ExtrudedPointedReveal(
      rearApse,
      `${name}_SILVER_FRAME`,
      width * 1.18,
      height * 1.06,
      0.08,
      [x, baseY + 0.04, faceZ - 0.09],
      rearApseSilver,
    );
    frame.rotation.y = Math.PI;
    const glass = addIsland15ExtrudedPointedReveal(
      rearApse,
      `${name}_INHABITED_GLASS`,
      width,
      height,
      0.04,
      [x, baseY + 0.09, faceZ - 0.15],
      glow,
    );
    glass.rotation.y = Math.PI;
  };

  addRearLayeredLancet(
    'ISLAND_15_V58_REAR_APSE_CENTRAL_PORTAL',
    0,
    0.72,
    1.18,
    2.05,
    -5.04,
    materials.warmWindow,
  );
  [
    { x: -1.52, glow: materials.crystalGlow },
    { x: -0.82, glow: materials.violetCrystal },
    { x: 0.82, glow: materials.crystalGlow },
    { x: 1.52, glow: materials.violetCrystal },
  ].forEach(({ x, glow }, index) => {
    addRearLayeredLancet(
      `ISLAND_15_V58_REAR_APSE_LOWER_LANCET_${index + 1}`,
      x,
      1.08,
      0.42,
      1.25,
      -5.045,
      glow,
    );
  });
  [-3.24, 3.24].forEach((x, index) => {
    addRearLayeredLancet(
      `ISLAND_15_V58_REAR_OUTER_BELT_LANCET_${index + 1}`,
      x,
      0.92,
      0.48,
      1.38,
      -4.57,
      index ? materials.violetCrystal : materials.crystalGlow,
    );
  });
  [-1.06, 0, 1.06].forEach((x, index) => {
    addRearLayeredLancet(
      `ISLAND_15_V58_REAR_CLERESTORY_LANCET_${index + 1}`,
      x,
      3.02,
      0.44,
      0.82,
      -4.82,
      index === 1 ? materials.warmWindow : index ? materials.violetCrystal : materials.crystalGlow,
    );
  });

  // Four stepped engaged buttresses make the apse projection physically
  // plausible in both rear three-quarter views instead of a decorated plane.
  [-2.34, -1.96, 1.96, 2.34].forEach((x, index) => {
    const outer = index === 0 || index === 3;
    addBox(
      rearApse,
      `ISLAND_15_V58_REAR_APSE_BUTTRESS_ROOT_${index + 1}`,
      [outer ? 0.34 : 0.24, outer ? 2.78 : 2.38, outer ? 0.58 : 0.46],
      [x, outer ? 1.74 : 1.54, outer ? -4.91 : -5.0],
      outer ? rearApseShadow : rearApseStone,
    );
    addBox(
      rearApse,
      `ISLAND_15_V58_REAR_APSE_BUTTRESS_SHOULDER_${index + 1}`,
      [outer ? 0.52 : 0.4, 0.2, outer ? 0.7 : 0.56],
      [x, outer ? 2.96 : 2.58, outer ? -4.88 : -4.98],
      rearApseSilver,
    );
    const capital = new THREE.Mesh(
      new THREE.OctahedronGeometry(outer ? 0.16 : 0.12, 0),
      index % 2 ? materials.violetCrystal : materials.crystalGlow,
    );
    capital.name = `ISLAND_15_V58_REAR_APSE_BUTTRESS_CAPITAL_${index + 1}`;
    capital.position.set(x, outer ? 3.18 : 2.78, outer ? -4.89 : -4.99);
    capital.scale.y = 1.55;
    capital.castShadow = true;
    rearApse.add(capital);
  });

  const rearRoseFrame = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.065, 8, 28), rearApseSilver);
  rearRoseFrame.name = 'ISLAND_15_V58_REAR_APSE_ROSE_FRAME';
  rearRoseFrame.position.set(0, 4.03, -4.86);
  rearApse.add(rearRoseFrame);
  const rearRoseHeart = new THREE.Mesh(new THREE.OctahedronGeometry(0.25, 1), materials.violetCrystal);
  rearRoseHeart.name = 'ISLAND_15_V58_REAR_APSE_ROSE_HEART';
  rearRoseHeart.position.set(0, 4.03, -4.89);
  rearRoseHeart.rotation.z = Math.PI * 0.25;
  rearRoseHeart.scale.set(0.7, 0.7, 0.24);
  rearApse.add(rearRoseHeart);
  permanentRear.add(rearApse);

  // Three genuinely extruded portal bays replace the old stack of coplanar
  // arch cards. Short returns make their depth readable from orbit cameras.
  const portalSpecs = [
    { x: 0, width: 2.55, height: 3.75, glow: materials.heroCrystal },
    { x: -2.72, width: 1.15, height: 2.5, glow: materials.crystalGlow },
    { x: 2.72, width: 1.15, height: 2.5, glow: materials.violetCrystal },
  ];
  portalSpecs.forEach(({ x, width, height, glow }, index) => {
    addIsland15ExtrudedPointedReveal(southNearWall, `ISLAND_15_SOUTH_PORTAL_${index + 1}_RECESS`, width * 1.24, height * 1.12, 0.34, [x, 0.48, 4.18], materials.midnight);
    addIsland15ExtrudedPointedReveal(southNearWall, `ISLAND_15_SOUTH_PORTAL_${index + 1}_FRAME`, width, height, 0.22, [x, 0.55, 4.4], index === 0 ? roofEdge : materials.silver);
    addIsland15ExtrudedPointedReveal(southNearWall, `ISLAND_15_SOUTH_PORTAL_${index + 1}_GLASS`, width * 0.72, height * 0.78, 0.08, [x, 0.62, 4.58], index === 0 ? materials.castleShadow : glow);
  });
  [-0.52, 0.52].forEach((x, index) => {
    addIsland15ExtrudedPointedReveal(
      southNearWall,
      `ISLAND_15_SOUTH_HERO_PORTAL_DOOR_${index + 1}`,
      0.72,
      2.42,
      0.08,
      [x, 0.72, 4.69],
      index ? materials.violetCrystal : materials.heroCrystal,
    );
  });
  addBox(southNearWall, 'ISLAND_15_SOUTH_HERO_PORTAL_CENTRAL_MULLION', [0.12, 2.72, 0.14], [0, 1.78, 4.75], materials.silver);
  [
    [[-1.48, 3.52, 4.69], [0, 5.18, 4.69]],
    [[1.48, 3.52, 4.69], [0, 5.18, 4.69]],
    [[-1.19, 3.64, 4.73], [0, 4.98, 4.73]],
    [[1.19, 3.64, 4.73], [0, 4.98, 4.73]],
  ].forEach(([from, to], index) => {
    addIsland15ArchitecturalBeam(
      southNearWall,
      `ISLAND_15_SOUTH_HERO_PORTAL_ARCHIVOLT_RIB_${index + 1}`,
      from as [number, number, number],
      to as [number, number, number],
      index < 2 ? 0.065 : 0.045,
      index < 2 ? materials.castleShadow : roofEdge,
    );
  });
  [-0.86, 0.86].forEach((x, index) => {
    addBox(southNearWall, `ISLAND_15_SOUTH_HERO_PORTAL_CARVED_JAMB_${index + 1}`, [0.22, 2.92, 0.34], [x, 1.78, 4.54], materials.castle);
    const jambCrown = addCrystal(southNearWall, `ISLAND_15_SOUTH_HERO_PORTAL_JAMB_CROWN_${index + 1}`, [x, 3.46, 4.56], [0.5, 0.62, 0.5], index ? materials.violetCrystal : materials.crystalGlow, 6);
    jambCrown.rotation.z = index ? -0.06 : 0.06;
  });
  const roseFrame = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.085, 8, 32), materials.silver);
  roseFrame.name = 'ISLAND_15_SOUTH_FACADE_ROSE_FRAME';
  roseFrame.position.set(0, 4.72, 4.61);
  southNearWall.add(roseFrame);
  const roseHeart = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 1), materials.violetCrystal);
  roseHeart.name = 'ISLAND_15_SOUTH_FACADE_ROSE_HEART';
  roseHeart.position.set(0, 4.72, 4.63);
  roseHeart.rotation.z = Math.PI * 0.25;
  roseHeart.scale.set(0.64, 0.64, 0.22);
  southNearWall.add(roseHeart);
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2;
    addIsland15ArchitecturalBeam(
      southNearWall,
      `ISLAND_15_SOUTH_FACADE_ROSE_SPOKE_${index + 1}`,
      [Math.cos(angle) * 0.15, 4.72 + Math.sin(angle) * 0.15, 4.65],
      [Math.cos(angle) * 0.49, 4.72 + Math.sin(angle) * 0.49, 4.65],
      0.025,
      roofEdge,
    );
  }
  addBox(southNearWall, 'ISLAND_15_SOUTH_FACADE_WEST_RETURN', [0.34, 3.15, 0.76], [-4.1, 1.78, 3.88], materials.castleShadow);
  addBox(southNearWall, 'ISLAND_15_SOUTH_FACADE_EAST_RETURN', [0.34, 3.15, 0.76], [4.1, 1.78, 3.88], materials.castleShadow);
  addBox(southNearWall, 'ISLAND_15_PALACE_PROCESSIONAL_STAIR_LOWER', [3.5, 0.18, 0.78], [0, 0.16, 4.9], materials.castle);
  addBox(southNearWall, 'ISLAND_15_PALACE_PROCESSIONAL_STAIR_MIDDLE', [3.0, 0.18, 0.62], [0, 0.28, 4.62], materials.castleShadow);
  addBox(southNearWall, 'ISLAND_15_PALACE_PROCESSIONAL_STAIR_UPPER', [2.55, 0.18, 0.5], [0, 0.4, 4.4], materials.silver);

  const engagedButtressTransforms = [
    [-3.62, 2.08, 4.42, 0], [3.62, 2.08, 4.42, 0],
    [-4.64, 2.12, -2.34, Math.PI * 0.5], [-4.64, 2.12, 1.42, Math.PI * 0.5],
    [4.64, 2.12, -2.34, Math.PI * 0.5], [4.64, 2.12, 1.42, Math.PI * 0.5],
  ] as const;
  const engagedRoots = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.4, 3.72, 0.56),
    materials.castleShadow,
    engagedButtressTransforms.length,
  );
  engagedRoots.name = 'ISLAND_15_PALACE_ENGAGED_BUTTRESS_ROOTS';
  const engagedCaps = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.34, 1.04, 6),
    roofStone,
    engagedButtressTransforms.length,
  );
  engagedCaps.name = 'ISLAND_15_PALACE_ENGAGED_BUTTRESS_CAPS';
  const engagedDummy = new THREE.Object3D();
  engagedButtressTransforms.forEach(([x, y, z, rotationY], index) => {
    engagedDummy.position.set(x, y, z);
    engagedDummy.rotation.y = rotationY;
    engagedDummy.updateMatrix();
    engagedRoots.setMatrixAt(index, engagedDummy.matrix);
    engagedDummy.position.y = 4.34;
    engagedDummy.updateMatrix();
    engagedCaps.setMatrixAt(index, engagedDummy.matrix);
  });
  engagedRoots.castShadow = true;
  engagedCaps.castShadow = true;
  southNearWall.add(engagedRoots, engagedCaps);

  // Four attached stepped buttresses are instanced, keeping silhouette mass
  // while avoiding the old forest of independent cone towers.
  const buttressPositions = [
    [-4.12, 0, -3.62], [4.12, 0, -3.62], [-4.12, 0, 3.62], [4.12, 0, 3.62],
  ] as const;
  const buttressDummy = new THREE.Object3D();
  [
    { name: 'ROOTS', geometry: new THREE.BoxGeometry(0.72, 2.85, 0.82), y: 1.64, material: materials.castleShadow },
    { name: 'SHOULDERS', geometry: new THREE.BoxGeometry(0.56, 1.7, 0.66), y: 3.66, material: materials.castle },
    { name: 'CAPS', geometry: new THREE.ConeGeometry(0.34, 1.18, 6), y: 5.08, material: materials.heroCrystal },
  ].forEach(({ name, geometry, y, material }) => {
    const instances = new THREE.InstancedMesh(geometry, material, buttressPositions.length);
    instances.name = `ISLAND_15_PALACE_ATTACHED_BUTTRESS_${name}`;
    buttressPositions.forEach(([x, , z], index) => {
      buttressDummy.position.set(x, y, z);
      buttressDummy.rotation.y = Math.atan2(x, z);
      buttressDummy.updateMatrix();
      instances.setMatrixAt(index, buttressDummy.matrix);
    });
    instances.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    instances.castShadow = true;
    instances.receiveShadow = true;
    shell.add(instances);
  });

  // V58 bounded correction family: the source silhouette is governed by a
  // luminous crystal hierarchy rather than broad matte roofs. These spires
  // remain physically engaged with the existing buttresses and roof sockets,
  // repeat around the rear as well as the visible front, and never alter the
  // permanent shell or any room/build-stage transform.
  const luminousHierarchy = new THREE.Group();
  luminousHierarchy.name = 'ISLAND_15_V58_LUMINOUS_VERTICAL_CRYSTAL_HIERARCHY';
  luminousHierarchy.userData.island15BuildLevelInvariant = true;
  luminousHierarchy.userData.island15ExteriorCorrectionFamily = 'v58-luminous-vertical-hierarchy';
  const exteriorCyan = materials.crystalGlow.clone();
  exteriorCyan.name = 'ISLAND_15_V58_EXTERIOR_CYAN_CRYSTAL';
  exteriorCyan.color.set(0x78e8ff);
  exteriorCyan.emissive.set(0x19bada);
  exteriorCyan.emissiveIntensity = 0.92;
  exteriorCyan.opacity = 0.97;
  const exteriorViolet = materials.violetCrystal.clone();
  exteriorViolet.name = 'ISLAND_15_V58_EXTERIOR_VIOLET_CRYSTAL';
  exteriorViolet.color.set(0xb28cff);
  exteriorViolet.emissive.set(0x8b42dc);
  exteriorViolet.emissiveIntensity = 0.88;
  exteriorViolet.opacity = 0.97;
  const exteriorHero = materials.heroCrystal.clone();
  exteriorHero.name = 'ISLAND_15_V58_EXTERIOR_HERO_CRYSTAL';
  exteriorHero.color.set(0xa4efff);
  exteriorHero.emissive.set(0x269fd4);
  exteriorHero.emissiveIntensity = 1.02;
  exteriorHero.opacity = 0.98;

  const lowerSpireSpecs: readonly {
    name: string;
    position: readonly [number, number, number];
    height: number;
    radius: number;
    material: THREE.Material;
  }[] = [
    { name: 'FRONT_WEST', position: [-3.62, 3.74, 4.42], height: 2.7, radius: 0.18, material: exteriorCyan },
    { name: 'FRONT_EAST', position: [3.62, 3.74, 4.42], height: 2.7, radius: 0.18, material: exteriorViolet },
    { name: 'WEST_SOUTH', position: [-4.52, 3.38, 1.66], height: 3.0, radius: 0.21, material: exteriorViolet },
    { name: 'WEST_NORTH', position: [-4.52, 3.38, -1.66], height: 3.0, radius: 0.21, material: exteriorCyan },
    { name: 'EAST_SOUTH', position: [4.52, 3.38, 1.66], height: 3.0, radius: 0.21, material: exteriorCyan },
    { name: 'EAST_NORTH', position: [4.52, 3.38, -1.66], height: 3.0, radius: 0.21, material: exteriorViolet },
    { name: 'REAR_WEST', position: [-2.72, 3.28, -4.18], height: 3.08, radius: 0.22, material: exteriorCyan },
    { name: 'REAR_EAST', position: [2.72, 3.28, -4.18], height: 3.08, radius: 0.22, material: exteriorViolet },
  ];
  lowerSpireSpecs.forEach(({ name, position, height, radius, material }) => {
    addIsland15V58LuminousSpire(
      luminousHierarchy,
      `ISLAND_15_V58_${name}_ENGAGED_CRYSTAL`,
      position,
      height,
      radius,
      material,
      materials.castleShadow,
      materials.silver,
    );
  });
  [
    { name: 'UPPER_FRONT_WEST', position: [-2.36, 5.82, 1.72] as const, material: exteriorCyan },
    { name: 'UPPER_FRONT_EAST', position: [2.36, 5.82, 1.72] as const, material: exteriorViolet },
    { name: 'UPPER_REAR_WEST', position: [-2.36, 5.82, -1.98] as const, material: exteriorViolet },
    { name: 'UPPER_REAR_EAST', position: [2.36, 5.82, -1.98] as const, material: exteriorCyan },
  ].forEach(({ name, position, material }) => {
    addIsland15V58LuminousSpire(
      luminousHierarchy,
      `ISLAND_15_V58_${name}_ROOF_CRYSTAL`,
      position,
      2.08,
      0.17,
      material,
      materials.castleShadow,
      roofEdge,
    );
  });
  permanentCrown.add(luminousHierarchy);

  const lantern = new THREE.Group();
  lantern.name = 'ISLAND_15_PALACE_OCCUPIED_CROWN_LANTERN';
  lantern.position.set(0, 7.2, -0.18);
  lantern.scale.set(1.2, 1, 1.2);
  const lanternBody = new THREE.Mesh(new THREE.CylinderGeometry(1.34, 1.5, 1.9, 8), materials.castle);
  lanternBody.name = 'ISLAND_15_PALACE_CROWN_LANTERN_BODY';
  lanternBody.castShadow = true;
  lanternBody.receiveShadow = true;
  lantern.add(lanternBody);
  [-0.96, 0.9].forEach((y, index) => {
    const gallery = new THREE.Mesh(new THREE.CylinderGeometry(1.62 - index * 0.1, 1.62 - index * 0.1, 0.16, 8), index ? materials.gold : materials.silver);
    gallery.name = `ISLAND_15_PALACE_CROWN_LANTERN_GALLERY_${index + 1}`;
    gallery.position.y = y;
    lantern.add(gallery);
  });
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2;
    const x = Math.sin(angle) * 1.4;
    const z = Math.cos(angle) * 1.4;
    addBox(
      lantern,
      `ISLAND_15_CROWN_LANTERN_ENGAGED_PIER_${index + 1}`,
      [0.15, 1.7, 0.2],
      [Math.sin(angle) * 1.47, -0.54, Math.cos(angle) * 1.47],
      materials.silver,
      angle,
    );
    addPointedArchWindow(lantern, `ISLAND_15_CROWN_LANTERN_RECESS_${index + 1}`, 0.5, 1.28, [x, -0.72, z], materials.midnight, angle);
    addPointedArchWindow(
      lantern,
      `ISLAND_15_CROWN_LANTERN_GLASS_${index + 1}`,
      0.25,
      0.72,
      [Math.sin(angle) * 1.43, -0.62, Math.cos(angle) * 1.43],
      index % 3 === 1 ? materials.warmWindow : index % 2 ? materials.violetCrystal : materials.crystalGlow,
      angle,
    );
  }
  const lanternRoof = new THREE.Mesh(new THREE.ConeGeometry(1.58, 1.25, 8), roofStone);
  lanternRoof.name = 'ISLAND_15_PALACE_CROWN_LANTERN_STEEP_ROOF';
  lanternRoof.position.y = 1.12;
  lanternRoof.rotation.y = Math.PI / 8;
  lanternRoof.castShadow = true;
  lantern.add(lanternRoof);
  const upperDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.94, 8), materials.castleShadow);
  upperDrum.name = 'ISLAND_15_PALACE_CROWN_UPPER_OCCUPIED_DRUM';
  upperDrum.position.y = 1.48;
  upperDrum.rotation.y = Math.PI / 8;
  upperDrum.castShadow = true;
  upperDrum.receiveShadow = true;
  lantern.add(upperDrum);
  const upperDrumGallery = new THREE.Mesh(new THREE.CylinderGeometry(0.79, 0.79, 0.12, 8), roofEdge);
  upperDrumGallery.name = 'ISLAND_15_PALACE_CROWN_UPPER_DRUM_GALLERY';
  upperDrumGallery.position.y = 1.92;
  lantern.add(upperDrumGallery);
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2;
    addPointedArchWindow(
      lantern,
      `ISLAND_15_PALACE_CROWN_UPPER_DRUM_WINDOW_${index + 1}`,
      0.22,
      0.54,
      [Math.sin(angle) * 0.69, 1.14, Math.cos(angle) * 0.69],
      index % 3 === 1 ? materials.violetCrystal : materials.crystalGlow,
      angle,
    );
  }
  [0, 1, 2, 3].forEach((index) => {
    const angle = index / 4 * Math.PI * 2 + Math.PI / 4;
    addIsland15ArchitecturalBeam(
      lantern,
      `ISLAND_15_PALACE_CROWN_FLYING_RIB_${index + 1}`,
      [Math.sin(angle) * 1.45, 0.92, Math.cos(angle) * 1.45],
      [Math.sin(angle) * 0.66, 1.82, Math.cos(angle) * 0.66],
      0.045,
      roofEdge,
    );
  });
  const pinnacleGeometry = new THREE.CylinderGeometry(0.15, 0.22, 0.8, 6);
  const pinnacleRoofGeometry = new THREE.ConeGeometry(0.24, 0.7, 6);
  const pinnacleRoots = new THREE.InstancedMesh(pinnacleGeometry, materials.castleShadow, 4);
  pinnacleRoots.name = 'ISLAND_15_PALACE_CROWN_ATTACHED_PINNACLE_ROOTS';
  const pinnacleRoofs = new THREE.InstancedMesh(pinnacleRoofGeometry, roofStone, 4);
  pinnacleRoofs.name = 'ISLAND_15_PALACE_CROWN_ATTACHED_PINNACLE_ROOFS';
  const pinnacleDummy = new THREE.Object3D();
  [0, 1, 2, 3].forEach((index) => {
    const angle = index / 4 * Math.PI * 2 + Math.PI / 4;
    pinnacleDummy.position.set(Math.sin(angle) * 1.52, 0.6, Math.cos(angle) * 1.52);
    pinnacleDummy.updateMatrix();
    pinnacleRoots.setMatrixAt(index, pinnacleDummy.matrix);
    pinnacleDummy.position.y = 1.2;
    pinnacleDummy.updateMatrix();
    pinnacleRoofs.setMatrixAt(index, pinnacleDummy.matrix);
  });
  lantern.add(pinnacleRoots, pinnacleRoofs);
  [
    [0, 1.2, 1.38, 0.76, 0], [0.98, 1.24, 0.98, 0.9, -0.14],
    [1.38, 1.2, 0, 0.76, -0.18], [0.98, 1.24, -0.98, 0.9, -0.14],
    [0, 1.2, -1.38, 0.76, 0], [-0.98, 1.24, -0.98, 0.9, 0.14],
    [-1.38, 1.2, 0, 0.76, 0.18], [-0.98, 1.24, 0.98, 0.9, 0.14],
  ].forEach(([x, y, z, height, tilt], index) => {
    const fan = addCrystal(
      lantern,
      `ISLAND_15_PALACE_CROWN_CRYSTAL_FAN_${index + 1}`,
      [x, y, z],
      [0.52, height, 0.52],
      index % 3 === 1 ? materials.violetCrystal : materials.crystalGlow,
      6,
    );
    fan.rotation.z = tilt;
  });
  const crownPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.84, 0.22, 8), roofEdge);
  crownPedestal.name = 'ISLAND_15_PALACE_CRYSTAL_CROWN_PEDESTAL';
  crownPedestal.position.y = 2.08;
  crownPedestal.rotation.y = Math.PI / 8;
  lantern.add(crownPedestal);
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2 + Math.PI / 8;
    addIsland15V58LuminousSpire(
      lantern,
      `ISLAND_15_V58_CROWN_LOWER_LANCET_${index + 1}`,
      [Math.sin(angle) * 1.52, 0.54 + index % 2 * 0.08, Math.cos(angle) * 1.52],
      index % 2 ? 1.64 : 1.82,
      0.14,
      index % 3 === 1 ? exteriorViolet : exteriorCyan,
      materials.castleShadow,
      roofEdge,
    );
  }
  [
    [0, 2.58, 0, 1.25, 1.03, 0, materials.heroCrystal],
    [-0.46, 2.34, 0.03, 0.9, 0.84, -0.16, materials.crystalGlow],
    [0.46, 2.34, 0.03, 0.9, 0.84, 0.16, materials.violetCrystal],
    [-0.78, 2.03, 0.08, 0.7, 0.64, -0.24, materials.violetCrystal],
    [0.78, 2.03, 0.08, 0.7, 0.64, 0.24, materials.crystalGlow],
  ].forEach(([x, y, z, width, height, tilt, material], index) => {
    const blade = addCrystal(
      lantern,
      `ISLAND_15_PALACE_CRYSTAL_CROWN_BLADE_${index + 1}`,
      [x as number, y as number, z as number],
      [width as number, height as number, width as number],
      material as THREE.Material,
      6,
    );
    blade.rotation.z = tilt as number;
  });
  const crownHeroCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.58, 0), exteriorHero);
  crownHeroCore.name = 'ISLAND_15_V58_CROWN_HERO_CRYSTAL_CORE';
  crownHeroCore.position.set(0, 2.58, 0);
  crownHeroCore.scale.set(1.08, 1.2, 1.08);
  crownHeroCore.rotation.y = Math.PI / 4;
  crownHeroCore.castShadow = true;
  lantern.add(crownHeroCore);
  permanentCrown.add(lantern);

  overviewRoof.add(shell);
}

function buildIsland15V59CrystalLanternCathedral(
  overviewRoof: THREE.Group,
  permanentRear: THREE.Group,
  permanentCrown: THREE.Group,
  southNearWall: THREE.Group,
  materials: Island15CrystalGlacierMaterials,
) {
  const cathedral = new THREE.Group();
  cathedral.name = 'ISLAND_15_V59_CRYSTAL_LANTERN_CATHEDRAL';
  cathedral.userData.island15ExteriorFamily = 'v59-crystal-lantern-cathedral';
  cathedral.userData.island15BuildLevelInvariant = true;
  cathedral.userData.island15OverviewOnly = true;
  cathedral.userData.island15VisibleBroadRoofCount = 0;

  const v59Stone = materials.castleShadow.clone();
  v59Stone.name = 'ISLAND_15_V59_MIDNIGHT_SAPPHIRE_STONE';
  v59Stone.color.set(0x294861);
  v59Stone.emissive.set(0x071b2a);
  v59Stone.emissiveIntensity = 0.16;
  v59Stone.roughness = 0.46;
  v59Stone.metalness = 0.08;
  const v59FaceStone = materials.castle.clone();
  v59FaceStone.name = 'ISLAND_15_V59_GLACIAL_BLUE_FACE_STONE';
  v59FaceStone.color.set(0x7693a6);
  v59FaceStone.emissive.set(0x0a2535);
  v59FaceStone.emissiveIntensity = 0.12;
  v59FaceStone.roughness = 0.42;
  const v59Silver = materials.silver.clone();
  v59Silver.name = 'ISLAND_15_V59_FROSTED_TRACERY_SILVER';
  v59Silver.color.set(0xd3edf3);
  v59Silver.emissive.set(0x123947);
  v59Silver.emissiveIntensity = 0.14;
  v59Silver.roughness = 0.25;
  const v59Gold = materials.gold.clone();
  v59Gold.name = 'ISLAND_15_V59_WARM_TRACERY_GOLD';
  v59Gold.color.set(0xd5a55c);
  v59Gold.emissive.set(0x4b2208);
  v59Gold.emissiveIntensity = 0.2;
  v59Gold.roughness = 0.32;
  const v59Cyan = materials.crystalGlow.clone();
  v59Cyan.name = 'ISLAND_15_V59_LIVING_CYAN_CRYSTAL';
  v59Cyan.color.set(0x77e9ff);
  v59Cyan.emissive.set(0x16b9dc);
  v59Cyan.emissiveIntensity = 0.98;
  v59Cyan.opacity = 0.98;
  const v59Violet = materials.violetCrystal.clone();
  v59Violet.name = 'ISLAND_15_V59_LIVING_VIOLET_CRYSTAL';
  v59Violet.color.set(0xb184ff);
  v59Violet.emissive.set(0x873fd5);
  v59Violet.emissiveIntensity = 0.94;
  v59Violet.opacity = 0.98;
  const v59Hero = materials.heroCrystal.clone();
  v59Hero.name = 'ISLAND_15_V59_HERO_AURORA_CRYSTAL';
  v59Hero.color.set(0xa9f1ff);
  v59Hero.emissive.set(0x219fd8);
  v59Hero.emissiveIntensity = 1.08;
  v59Hero.opacity = 0.99;
  const v59Warm = materials.warmWindow.clone();
  v59Warm.name = 'ISLAND_15_V59_INHABITED_AMBER_GLASS';
  v59Warm.color.set(0xffd6a1);
  v59Warm.emissive.set(0xff711f);
  v59Warm.emissiveIntensity = 1.18;

  const addV59Crystal = (
    parent: THREE.Object3D,
    name: string,
    position: readonly [number, number, number],
    height: number,
    radius: number,
    crystalMaterial: THREE.Material,
  ) => {
    const spire = new THREE.Group();
    spire.name = name;
    spire.position.set(...position);
    spire.userData.island15V59CrystalLanternMember = true;
    const socket = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 1.42, radius * 1.65, 0.28, 8),
      v59Stone,
    );
    socket.name = `${name}_ENGAGED_SOCKET`;
    socket.position.y = 0.14;
    socket.castShadow = true;
    spire.add(socket);
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 1.5, radius * 1.5, 0.09, 8),
      v59Silver,
    );
    collar.name = `${name}_TRACERY_COLLAR`;
    collar.position.y = 0.32;
    spire.add(collar);
    const bodyHeight = height * 0.62;
    const tipHeight = height - bodyHeight;
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.78, radius, bodyHeight, 6),
      crystalMaterial,
    );
    body.name = `${name}_FACETED_SHAFT`;
    body.position.y = 0.38 + bodyHeight * 0.5;
    body.rotation.y = Math.PI / 6;
    body.castShadow = true;
    spire.add(body);
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(radius * 0.8, tipHeight, 6),
      crystalMaterial,
    );
    tip.name = `${name}_LANCET_TIP`;
    tip.position.y = 0.38 + bodyHeight + tipHeight * 0.5;
    tip.rotation.y = Math.PI / 6;
    tip.castShadow = true;
    spire.add(tip);
    parent.add(spire);
    return spire;
  };

  const addV59LayeredWindow = (
    parent: THREE.Object3D,
    name: string,
    angle: number,
    radius: number,
    baseY: number,
    width: number,
    height: number,
    glow: THREE.Material,
  ) => {
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    const recess = addIsland15ExtrudedPointedReveal(
      parent,
      `${name}_DEEP_RECESS`,
      width * 1.38,
      height * 1.12,
      0.13,
      [x, baseY, z],
      materials.midnight,
    );
    recess.rotation.y = angle;
    const frameRadius = radius + 0.075;
    const frame = addIsland15ExtrudedPointedReveal(
      parent,
      `${name}_SILVER_FRAME`,
      width * 1.17,
      height * 1.06,
      0.07,
      [Math.sin(angle) * frameRadius, baseY + 0.035, Math.cos(angle) * frameRadius],
      v59Silver,
    );
    frame.rotation.y = angle;
    const glassRadius = radius + 0.14;
    const glass = addIsland15ExtrudedPointedReveal(
      parent,
      `${name}_INHABITED_GLASS`,
      width,
      height,
      0.035,
      [Math.sin(angle) * glassRadius, baseY + 0.08, Math.cos(angle) * glassRadius],
      glow,
    );
    glass.rotation.y = angle;
  };

  const addV59LanternTier = (
    name: string,
    baseY: number,
    height: number,
    bottomRadius: number,
    topRadius: number,
    bayCount: number,
    crystalEvery: number,
  ) => {
    const tier = new THREE.Group();
    tier.name = name;
    tier.userData.island15V59NestedLanternTier = true;
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(topRadius, bottomRadius, height, bayCount, 1, false),
      v59Stone,
    );
    body.name = `${name}_FACETED_MASS`;
    body.position.y = baseY + height * 0.5;
    body.rotation.y = Math.PI / bayCount;
    body.castShadow = true;
    body.receiveShadow = true;
    tier.add(body);
    const lowerCourse = new THREE.Mesh(
      new THREE.CylinderGeometry(bottomRadius + 0.1, bottomRadius + 0.12, 0.12, bayCount),
      v59Silver,
    );
    lowerCourse.name = `${name}_LOWER_SILVER_COURSE`;
    lowerCourse.position.y = baseY + 0.08;
    tier.add(lowerCourse);
    const goldCourse = new THREE.Mesh(
      new THREE.CylinderGeometry(topRadius + 0.1, topRadius + 0.1, 0.08, bayCount),
      v59Gold,
    );
    goldCourse.name = `${name}_UPPER_GOLD_COURSE`;
    goldCourse.position.y = baseY + height - 0.13;
    tier.add(goldCourse);
    const crownCourse = new THREE.Mesh(
      new THREE.CylinderGeometry(topRadius + 0.16, topRadius + 0.16, 0.13, bayCount),
      v59Silver,
    );
    crownCourse.name = `${name}_CROWN_TRACERY_COURSE`;
    crownCourse.position.y = baseY + height;
    tier.add(crownCourse);

    for (let index = 0; index < bayCount; index += 1) {
      const angle = index / bayCount * Math.PI * 2;
      const windowRadius = THREE.MathUtils.lerp(bottomRadius, topRadius, 0.46) + 0.015;
      const glow = index % 4 === 0 ? v59Warm : index % 2 ? v59Violet : v59Cyan;
      addV59LayeredWindow(
        tier,
        `${name}_LANCET_${index + 1}`,
        angle,
        windowRadius,
        baseY + height * 0.22,
        Math.min(0.5, Math.PI * windowRadius / bayCount * 0.72),
        height * 0.47,
        glow,
      );
      const pierRadius = windowRadius + 0.09;
      addBox(
        tier,
        `${name}_ENGAGED_PIER_${index + 1}`,
        [0.11, height * 0.74, 0.16],
        [Math.sin(angle + Math.PI / bayCount) * pierRadius, baseY + height * 0.5, Math.cos(angle + Math.PI / bayCount) * pierRadius],
        index % 3 === 1 ? v59FaceStone : v59Silver,
        angle + Math.PI / bayCount,
      );
      if (index % crystalEvery === 0) {
        const spireRadius = topRadius + 0.18;
        addV59Crystal(
          tier,
          `${name}_CROWN_CRYSTAL_${index + 1}`,
          [Math.sin(angle) * spireRadius, baseY + height + 0.04, Math.cos(angle) * spireRadius],
          Math.max(0.72, height * 0.58),
          Math.max(0.1, topRadius * 0.065),
          index % 4 ? v59Cyan : v59Violet,
        );
      }
    }
    cathedral.add(tier);
    return tier;
  };

  // The lower palace ring physically encloses the four room volumes. Its low
  // wall faces start outside radius 4.12; all central vertical tiers begin
  // above the protected Boss-route height envelope.
  const lowerRing = new THREE.Group();
  lowerRing.name = 'ISLAND_15_V59_LOWER_CHAPEL_RING';
  lowerRing.userData.island15V59ProtectedAnnulusPolicy = 'outer-walls-only-below-y1.55';
  [
    { name: 'SOUTH_WEST', size: [2.82, 2.3, 0.44] as const, position: [-2.38, 1.4, 4.42] as const },
    { name: 'SOUTH_EAST', size: [2.82, 2.3, 0.44] as const, position: [2.38, 1.4, 4.42] as const },
    { name: 'NORTH_WEST', size: [2.82, 2.3, 0.44] as const, position: [-2.38, 1.4, -4.42] as const },
    { name: 'NORTH_EAST', size: [2.82, 2.3, 0.44] as const, position: [2.38, 1.4, -4.42] as const },
    { name: 'WEST_SOUTH', size: [0.44, 2.3, 2.82] as const, position: [-4.42, 1.4, 2.38] as const },
    { name: 'WEST_NORTH', size: [0.44, 2.3, 2.82] as const, position: [-4.42, 1.4, -2.38] as const },
    { name: 'EAST_SOUTH', size: [0.44, 2.3, 2.82] as const, position: [4.42, 1.4, 2.38] as const },
    { name: 'EAST_NORTH', size: [0.44, 2.3, 2.82] as const, position: [4.42, 1.4, -2.38] as const },
  ].forEach(({ name, size, position }, index) => {
    addBox(
      lowerRing,
      `ISLAND_15_V59_LOWER_RING_${name}_WALL`,
      size,
      position,
      index % 2 ? v59FaceStone : v59Stone,
    );
  });
  const lowerCornice = new THREE.Mesh(new THREE.CylinderGeometry(4.76, 4.76, 0.12, 12), v59Silver);
  lowerCornice.name = 'ISLAND_15_V59_LOWER_RING_SILVER_CORNICE';
  lowerCornice.position.y = 2.54;
  lowerRing.add(lowerCornice);
  cathedral.add(lowerRing);

  const addV59CardinalFacade = (
    parent: THREE.Object3D,
    name: string,
    angle: number,
    major: boolean,
  ) => {
    const facade = new THREE.Group();
    facade.name = name;
    facade.rotation.y = angle;
    facade.userData.island15V59CardinalFacade = true;
    const width = major ? 3.48 : 3.08;
    addIsland15GabledMass(
      facade,
      `${name}_PROJECTING_GABLED_VOLUME`,
      [width, major ? 2.62 : 2.35, major ? 0.9 : 0.76, 0.56],
      [0, 0.28, 4.52],
      v59FaceStone,
    );
    addBox(
      facade,
      `${name}_SILVER_FOUNDATION_COURSE`,
      [width + 0.22, 0.16, 0.54],
      [0, 0.52, 4.52],
      v59Silver,
    );
    addBox(
      facade,
      `${name}_GOLD_SPRING_COURSE`,
      [width + 0.08, 0.09, 0.54],
      [0, major ? 2.73 : 2.46, 4.52],
      v59Gold,
    );
    const portalHeight = major ? 2.45 : 2.05;
    const portalWidth = major ? 1.24 : 0.98;
    const recess = addIsland15ExtrudedPointedReveal(
      facade,
      `${name}_PORTAL_DEEP_RECESS`,
      portalWidth * 1.42,
      portalHeight * 1.12,
      0.18,
      [0, 0.58, 4.79],
      materials.midnight,
    );
    const frame = addIsland15ExtrudedPointedReveal(
      facade,
      `${name}_PORTAL_SILVER_FRAME`,
      portalWidth * 1.2,
      portalHeight * 1.06,
      0.1,
      [0, 0.62, 4.91],
      v59Silver,
    );
    const glass = addIsland15ExtrudedPointedReveal(
      facade,
      `${name}_PORTAL_INHABITED_GLASS`,
      portalWidth,
      portalHeight,
      0.05,
      [0, 0.68, 5.0],
      major ? v59Warm : (angle > 0 ? v59Violet : v59Cyan),
    );
    recess.userData.island15V59PortalDepth = true;
    frame.userData.island15V59PortalDepth = true;
    glass.userData.island15V59PortalDepth = true;
    [-1.08, 1.08].forEach((x, index) => {
      const glow = index ? v59Violet : v59Cyan;
      const flankRecess = addIsland15ExtrudedPointedReveal(
        facade,
        `${name}_FLANK_LANCET_${index + 1}_RECESS`,
        0.58,
        major ? 1.55 : 1.35,
        0.11,
        [x, 0.94, 4.8],
        materials.midnight,
      );
      const flankGlass = addIsland15ExtrudedPointedReveal(
        facade,
        `${name}_FLANK_LANCET_${index + 1}_GLASS`,
        0.38,
        major ? 1.28 : 1.08,
        0.04,
        [x, 1.04, 4.91],
        glow,
      );
      flankRecess.userData.island15V59FacadeLancet = true;
      flankGlass.userData.island15V59FacadeLancet = true;
      addBox(
        facade,
        `${name}_ENGAGED_JAMB_${index + 1}`,
        [0.2, major ? 2.75 : 2.45, 0.36],
        [x * 1.38, major ? 1.66 : 1.5, 4.68],
        v59Silver,
      );
      addV59Crystal(
        facade,
        `${name}_JAMB_CRYSTAL_${index + 1}`,
        [x * 1.38, major ? 3.12 : 2.85, 4.68],
        major ? 1.4 : 1.18,
        0.16,
        glow,
      );
    });
    parent.add(facade);
    return facade;
  };

  addV59CardinalFacade(southNearWall, 'ISLAND_15_V59_SOUTH_GREAT_PORTAL_FACADE', 0, true);
  addV59CardinalFacade(cathedral, 'ISLAND_15_V59_NORTH_APSE_FACADE', Math.PI, true);
  addV59CardinalFacade(cathedral, 'ISLAND_15_V59_EAST_TRANSEPT_FACADE', Math.PI * 0.5, false);
  addV59CardinalFacade(cathedral, 'ISLAND_15_V59_WEST_TRANSEPT_FACADE', -Math.PI * 0.5, false);

  // Eight lower towers establish a consistent radial silhouette. Their stone
  // shafts are occupied architecture, while the crystals act as finials.
  [
    { angle: 0, radius: 4.84, bodyHeight: 3.15, crystalHeight: 1.52 },
    { angle: Math.PI * 0.5, radius: 4.84, bodyHeight: 3.15, crystalHeight: 1.52 },
    { angle: Math.PI, radius: 4.84, bodyHeight: 3.15, crystalHeight: 1.52 },
    { angle: Math.PI * 1.5, radius: 4.84, bodyHeight: 3.15, crystalHeight: 1.52 },
    { angle: Math.PI * 0.25, radius: 5.66, bodyHeight: 2.62, crystalHeight: 1.18 },
    { angle: Math.PI * 0.75, radius: 5.66, bodyHeight: 2.62, crystalHeight: 1.18 },
    { angle: Math.PI * 1.25, radius: 5.66, bodyHeight: 2.62, crystalHeight: 1.18 },
    { angle: Math.PI * 1.75, radius: 5.66, bodyHeight: 2.62, crystalHeight: 1.18 },
  ].forEach(({ angle, radius, bodyHeight, crystalHeight }, index) => {
    const towerRadius = index < 4 ? 0.44 : 0.28;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    const tower = new THREE.Group();
    tower.name = `ISLAND_15_V59_OUTER_BUTTRESS_TOWER_${index + 1}`;
    tower.position.set(x, 0.25, z);
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(towerRadius * 0.82, towerRadius, bodyHeight, 8),
      index % 2 ? v59Stone : v59FaceStone,
    );
    shaft.name = `${tower.name}_OCCUPIED_SHAFT`;
    shaft.position.y = bodyHeight * 0.5;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    tower.add(shaft);
    const gallery = new THREE.Mesh(
      new THREE.CylinderGeometry(towerRadius * 1.12, towerRadius * 1.12, 0.13, 8),
      v59Silver,
    );
    gallery.name = `${tower.name}_GALLERY_CORNICE`;
    gallery.position.y = bodyHeight * 0.72;
    tower.add(gallery);
    const windowCount = index < 4 ? 4 : 2;
    for (let windowIndex = 0; windowIndex < windowCount; windowIndex += 1) {
      const windowAngle = angle + windowIndex / windowCount * Math.PI * 2;
      addV59LayeredWindow(
        tower,
        `${tower.name}_LANCET_${windowIndex + 1}`,
        windowAngle - angle,
        towerRadius + 0.02,
        bodyHeight * 0.32,
        towerRadius * 0.62,
        bodyHeight * 0.34,
        (windowIndex + index) % 3 === 1 ? v59Warm : (windowIndex % 2 ? v59Violet : v59Cyan),
      );
    }
    cathedral.add(tower);
    addV59Crystal(
      cathedral,
      `ISLAND_15_V59_OUTER_TOWER_CRYSTAL_${index + 1}`,
      [x, 0.25 + bodyHeight, z],
      crystalHeight,
      index < 4 ? 0.22 : 0.15,
      index % 3 === 1 ? v59Violet : v59Cyan,
    );
  });

  addV59LanternTier('ISLAND_15_V59_LOWER_NAVE_LANTERN', 1.62, 2.45, 3.65, 3.25, 12, 3);
  const lowerTransition = new THREE.Mesh(
    new THREE.CylinderGeometry(2.86, 3.34, 0.5, 12),
    v59FaceStone,
  );
  lowerTransition.name = 'ISLAND_15_V59_LOWER_NAVE_TO_CLERESTORY_FACETED_TRANSITION';
  lowerTransition.position.y = 4.32;
  lowerTransition.castShadow = true;
  cathedral.add(lowerTransition);
  addV59LanternTier('ISLAND_15_V59_MIDDLE_CLERESTORY_LANTERN', 4.46, 1.8, 2.82, 2.46, 10, 2);
  const middleTransition = new THREE.Mesh(
    new THREE.CylinderGeometry(2.04, 2.54, 0.4, 10),
    v59Stone,
  );
  middleTransition.name = 'ISLAND_15_V59_CLERESTORY_TO_UPPER_LANTERN_FACETED_TRANSITION';
  middleTransition.position.y = 6.44;
  middleTransition.castShadow = true;
  cathedral.add(middleTransition);
  addV59LanternTier('ISLAND_15_V59_UPPER_AURORA_LANTERN', 6.52, 1.42, 2.02, 1.7, 8, 2);
  const upperTransition = new THREE.Mesh(
    new THREE.CylinderGeometry(1.28, 1.76, 0.32, 8),
    v59FaceStone,
  );
  upperTransition.name = 'ISLAND_15_V59_UPPER_LANTERN_TO_CROWN_FACETED_TRANSITION';
  upperTransition.position.y = 8.08;
  upperTransition.castShadow = true;
  cathedral.add(upperTransition);
  addV59LanternTier('ISLAND_15_V59_CROWN_LANTERN', 8.12, 1.08, 1.22, 1.0, 8, 2);

  // The only permanent crown geometry is high above every focused-room POV;
  // the overview-only surrounding lantern tiers disappear with the shell.
  const crownSocket = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.72, 0.22, 8), v59Gold);
  crownSocket.name = 'ISLAND_15_V59_HERO_CRYSTAL_CROWN_SOCKET';
  crownSocket.position.y = 9.16;
  permanentCrown.add(crownSocket);
  addV59Crystal(
    permanentCrown,
    'ISLAND_15_V59_HERO_CRYSTAL_CROWN',
    [0, 9.02, 0],
    1.05,
    0.43,
    v59Hero,
  );
  [-0.62, 0.62].forEach((x, index) => {
    const satellite = addV59Crystal(
      permanentCrown,
      `ISLAND_15_V59_HERO_CROWN_SATELLITE_${index + 1}`,
      [x, 8.92, 0.04],
      0.78,
      0.2,
      index ? v59Violet : v59Cyan,
    );
    satellite.rotation.z = index ? -0.12 : 0.12;
  });

  // Stable semantic rear ownership remains a thin high clerestory datum. The
  // complete rear facade itself lives in the overview-only family so no room
  // focus can be occluded by the new shell.
  const permanentRearDatum = addBox(
    permanentRear,
    'ISLAND_15_V59_PERMANENT_REAR_HIGH_CLERESTORY_DATUM',
    [3.2, 0.16, 0.22],
    [0, 5.72, -4.18],
    v59Silver,
  );
  permanentRearDatum.userData.island15V59AboveFocusedRoomSightline = true;

  // A restrained three-step processional stair completes the south portal.
  [
    { width: 3.5, y: 0.13, z: 5.0 },
    { width: 3.02, y: 0.26, z: 4.74 },
    { width: 2.56, y: 0.39, z: 4.51 },
  ].forEach(({ width, y, z }, index) => {
    addBox(
      southNearWall,
      `ISLAND_15_V59_SOUTH_PROCESSIONAL_STAIR_${index + 1}`,
      [width, 0.18, index === 0 ? 0.7 : 0.5],
      [0, y, z],
      index === 1 ? v59Stone : v59Silver,
    );
  });

  overviewRoof.add(cathedral);
}

function buildIsland15V60GothicCrystalMountain(
  overviewRoof: THREE.Group,
  permanentRear: THREE.Group,
  permanentCrown: THREE.Group,
  southNearWall: THREE.Group,
  materials: Island15CrystalGlacierMaterials,
) {
  const mountain = new THREE.Group();
  mountain.name = 'ISLAND_15_V60_GOTHIC_CRYSTAL_MOUNTAIN';
  mountain.userData.island15ExteriorFamily = 'v60-gothic-crystal-mountain';
  mountain.userData.island15BuildLevelInvariant = true;
  mountain.userData.island15OverviewOnly = true;
  mountain.userData.island15BlockoutPass = 'macro-family-01';
  mountain.userData.island15ForbiddenForms = [
    'circular-stacked-drums',
    'continuous-shelf-bands',
    'crossed-roof-frames',
    'billboard-planes',
  ];

  // V60 deliberately uses a restrained blockout palette. The family must
  // survive naked/macro triage before any finish pass is allowed to decorate
  // its silhouette.
  const v60Stone = materials.castleShadow.clone();
  v60Stone.name = 'ISLAND_15_V60_BLOCKOUT_DEEP_GLACIER_STONE';
  v60Stone.color.set(0x294759);
  v60Stone.emissive.set(0x071722);
  v60Stone.emissiveIntensity = 0.1;
  v60Stone.roughness = 0.5;
  const v60Face = materials.castle.clone();
  v60Face.name = 'ISLAND_15_V60_BLOCKOUT_FROSTED_FACE_STONE';
  v60Face.color.set(0x8ba7b4);
  v60Face.emissive.set(0x0b2834);
  v60Face.emissiveIntensity = 0.1;
  v60Face.roughness = 0.44;
  const v60Trim = materials.silver.clone();
  v60Trim.name = 'ISLAND_15_V60_BLOCKOUT_VERTICAL_SILVER_TRACERY';
  v60Trim.color.set(0xd6eef1);
  v60Trim.emissive.set(0x123542);
  v60Trim.emissiveIntensity = 0.12;
  const v60Warm = materials.warmWindow.clone();
  v60Warm.name = 'ISLAND_15_V60_BLOCKOUT_INHABITED_AMBER_GLASS';
  v60Warm.color.set(0xffd19a);
  v60Warm.emissive.set(0xf56618);
  v60Warm.emissiveIntensity = 1.05;
  const v60Cyan = materials.crystalGlow.clone();
  v60Cyan.name = 'ISLAND_15_V60_BLOCKOUT_CYAN_CRYSTAL';
  v60Cyan.color.set(0x7aeaff);
  v60Cyan.emissive.set(0x16b8dc);
  v60Cyan.emissiveIntensity = 0.92;
  const v60Violet = materials.violetCrystal.clone();
  v60Violet.name = 'ISLAND_15_V60_BLOCKOUT_VIOLET_CRYSTAL';
  v60Violet.color.set(0xb989ff);
  v60Violet.emissive.set(0x7b3bc8);
  v60Violet.emissiveIntensity = 0.9;
  const v60Hero = materials.heroCrystal.clone();
  v60Hero.name = 'ISLAND_15_V60_BLOCKOUT_HERO_AURORA_CRYSTAL';
  v60Hero.color.set(0xb8f4ff);
  v60Hero.emissive.set(0x2ba8d8);
  v60Hero.emissiveIntensity = 1.02;

  const addV60SeatedCrystal = (
    parent: THREE.Object3D,
    name: string,
    position: readonly [number, number, number],
    scale: readonly [number, number, number],
    crystalMaterial: THREE.Material,
    tiltZ = 0,
  ) => {
    const seat = new THREE.Group();
    seat.name = name;
    seat.position.set(...position);
    seat.userData.island15V60MasonrySeatedCrystal = true;
    addBox(
      seat,
      `${name}_SQUARE_MASONRY_SOCKET`,
      [scale[0] * 0.78, 0.2, scale[2] * 0.78],
      [0, 0.1, 0],
      v60Stone,
      Math.PI * 0.25,
    );
    const crystal = addCrystal(
      seat,
      `${name}_FACETED_CRYSTAL`,
      [0, 0.22 + scale[1] * 0.675, 0],
      scale,
      crystalMaterial,
      6,
    );
    crystal.rotation.z = tiltZ;
    parent.add(seat);
    return seat;
  };

  const addV60DeepLancet = (
    parent: THREE.Object3D,
    name: string,
    position: readonly [number, number, number],
    width: number,
    height: number,
    glow: THREE.Material,
  ) => {
    addIsland15ExtrudedPointedReveal(
      parent,
      `${name}_DEEP_SHADOW_RECESS`,
      width * 1.42,
      height * 1.12,
      0.14,
      position,
      materials.midnight,
    );
    addIsland15ExtrudedPointedReveal(
      parent,
      `${name}_THICK_SILVER_FRAME`,
      width * 1.18,
      height * 1.06,
      0.08,
      [position[0], position[1] + 0.04, position[2] + 0.12],
      v60Trim,
    );
    addIsland15ExtrudedPointedReveal(
      parent,
      `${name}_INHABITED_GLASS`,
      width,
      height,
      0.04,
      [position[0], position[1] + 0.09, position[2] + 0.21],
      glow,
    );
  };

  const addV60CardinalFace = (
    parent: THREE.Object3D,
    name: string,
    angle: number,
    radius: number,
    baseY: number,
    width: number,
    wallHeight: number,
    roofHeight: number,
    depth: number,
    windowCount: number,
    majorPortal = false,
  ) => {
    const face = new THREE.Group();
    face.name = name;
    face.rotation.y = angle;
    face.userData.island15V60AngularCardinalFace = true;
    addIsland15GabledMass(
      face,
      `${name}_POINTED_GABLED_MASS`,
      [width, wallHeight, roofHeight, depth],
      [0, baseY, radius],
      v60Face,
    );
    const frontZ = radius + depth * 0.5 + 0.04;
    const bayWidth = width / Math.max(1, windowCount);
    for (let index = 0; index < windowCount; index += 1) {
      const x = -width * 0.5 + bayWidth * (index + 0.5);
      const glow = majorPortal && index === Math.floor(windowCount * 0.5)
        ? v60Warm
        : index % 2 ? v60Violet : v60Cyan;
      addV60DeepLancet(
        face,
        `${name}_LANCET_${index + 1}`,
        [x, baseY + (majorPortal ? 0.44 : 0.62), frontZ],
        majorPortal && index === Math.floor(windowCount * 0.5) ? bayWidth * 0.7 : bayWidth * 0.46,
        majorPortal && index === Math.floor(windowCount * 0.5) ? wallHeight * 0.82 : wallHeight * 0.55,
        glow,
      );
    }
    [-1, 1].forEach((side, index) => {
      const buttressX = side * (width * 0.5 - 0.14);
      addBox(
        face,
        `${name}_ENGAGED_BUTTRESS_${index + 1}`,
        [0.3, wallHeight * 0.92, depth * 0.62],
        [buttressX, baseY + wallHeight * 0.46, radius + depth * 0.18],
        v60Stone,
      );
      addV60SeatedCrystal(
        face,
        `${name}_BUTTRESS_CRYSTAL_${index + 1}`,
        [buttressX, baseY + wallHeight * 0.88, radius + depth * 0.18],
        [0.58, majorPortal ? 0.86 : 0.72, 0.58],
        index ? v60Violet : v60Cyan,
        side * -0.08,
      );
    });
    addV60SeatedCrystal(
      face,
      `${name}_GABLE_HEART_CRYSTAL`,
      [0, baseY + wallHeight + roofHeight * 0.42, radius + depth * 0.22],
      [majorPortal ? 1.12 : 0.94, majorPortal ? 1.04 : 0.86, majorPortal ? 1.12 : 0.94],
      majorPortal ? v60Hero : (angle > 0 ? v60Violet : v60Cyan),
    );
    parent.add(face);
    return face;
  };

  // Four low, genuinely attached cathedral arms enclose the physical wing
  // rooms. Their closest low faces begin at radius 4.23, beyond the protected
  // Boss-route envelope; the joining bridge masses begin above y=1.55.
  const wingSpecs = [
    { name: 'SOUTH_PROCESSIONAL_TRANSEPT', angle: 0, parent: southNearWall, portal: true },
    { name: 'NORTH_CATHEDRAL_APSE', angle: Math.PI, parent: mountain, portal: false },
    { name: 'EAST_CRYSTAL_TRANSEPT', angle: Math.PI * 0.5, parent: mountain, portal: false },
    { name: 'WEST_CRYSTAL_TRANSEPT', angle: -Math.PI * 0.5, parent: mountain, portal: false },
  ] as const;
  wingSpecs.forEach(({ name, angle, parent, portal }) => {
    addV60CardinalFace(
      parent,
      `ISLAND_15_V60_${name}`,
      angle,
      4.5,
      0.28,
      3.7,
      2.45,
      1.45,
      0.54,
      3,
      portal,
    );
    const bridge = new THREE.Group();
    bridge.name = `ISLAND_15_V60_${name}_OCCUPIED_NAVE_BRIDGE`;
    bridge.rotation.y = angle;
    addIsland15GabledMass(
      bridge,
      `${bridge.name}_GABLED_VOLUME`,
      [2.7, 1.45, 0.9, 2.6],
      [0, 1.62, 3.35],
      v60Stone,
    );
    mountain.add(bridge);
  });

  // The lower nave is a square occupied mass with a steep four-sided roof,
  // not a circular tier or a horizontal shelf. The middle tower penetrates
  // the roof so every elevation reads as one coupled cathedral mountain.
  addBox(
    mountain,
    'ISLAND_15_V60_CENTRAL_SQUARE_NAVE_OCCUPIED_MASS',
    [5.3, 2.6, 5.3],
    [0, 2.92, 0],
    v60Face,
  );
  const naveRoof = new THREE.Mesh(new THREE.ConeGeometry(3.75, 1.4, 4), v60Stone);
  naveRoof.name = 'ISLAND_15_V60_CENTRAL_NAVE_STEEP_FOUR_SIDED_ROOF';
  naveRoof.position.y = 4.92;
  naveRoof.rotation.y = Math.PI * 0.25;
  naveRoof.castShadow = true;
  mountain.add(naveRoof);

  addBox(
    mountain,
    'ISLAND_15_V60_MIDDLE_RECTANGULAR_CLERESTORY_TOWER',
    [3.5, 3.0, 3.5],
    [0, 5.52, 0],
    v60Stone,
  );
  const middleRoof = new THREE.Mesh(new THREE.ConeGeometry(2.48, 1.15, 4), v60Face);
  middleRoof.name = 'ISLAND_15_V60_MIDDLE_TOWER_STEEP_ANGULAR_TRANSITION';
  middleRoof.position.y = 7.575;
  middleRoof.rotation.y = Math.PI * 0.25;
  middleRoof.castShadow = true;
  mountain.add(middleRoof);

  addBox(
    mountain,
    'ISLAND_15_V60_UPPER_SQUARE_AURORA_LANTERN_TOWER',
    [2.1, 2.42, 2.1],
    [0, 8.0, 0],
    v60Face,
  );

  // Deep occupied lancets author all four sides of the central vertical
  // hierarchy. Their isolated frames remain vertical and never become a
  // continuous shelf band.
  [
    { angle: 0, name: 'SOUTH' },
    { angle: Math.PI, name: 'NORTH' },
    { angle: Math.PI * 0.5, name: 'EAST' },
    { angle: -Math.PI * 0.5, name: 'WEST' },
  ].forEach(({ angle, name }, faceIndex) => {
    const middleFace = new THREE.Group();
    middleFace.name = `ISLAND_15_V60_MIDDLE_TOWER_${name}_LANTERN_FACE`;
    middleFace.rotation.y = angle;
    [-0.58, 0.58].forEach((x, windowIndex) => {
      addV60DeepLancet(
        middleFace,
        `${middleFace.name}_WINDOW_${windowIndex + 1}`,
        [x, 4.52, 1.76],
        0.56,
        1.82,
        (faceIndex + windowIndex) % 3 === 1 ? v60Warm : (windowIndex ? v60Violet : v60Cyan),
      );
      addBox(
        middleFace,
        `${middleFace.name}_VERTICAL_PIER_${windowIndex + 1}`,
        [0.14, 2.56, 0.2],
        [x + (windowIndex ? 0.42 : -0.42), 5.48, 1.77],
        v60Trim,
      );
    });
    mountain.add(middleFace);

    const upperFace = new THREE.Group();
    upperFace.name = `ISLAND_15_V60_UPPER_LANTERN_${name}_GABLED_FACE`;
    upperFace.rotation.y = angle;
    addIsland15GabledMass(
      upperFace,
      `${upperFace.name}_POINTED_PROJECTION`,
      [1.72, 1.12, 0.94, 0.38],
      [0, 7.0, 1.04],
      v60Stone,
    );
    addV60DeepLancet(
      upperFace,
      `${upperFace.name}_HERO_WINDOW`,
      [0, 7.24, 1.26],
      0.72,
      1.4,
      faceIndex === 0 ? v60Warm : faceIndex % 2 ? v60Violet : v60Cyan,
    );
    mountain.add(upperFace);
  });

  // Eight vertical buttress load paths couple the nave, middle tower, and
  // flank silhouette. Their finials are large seated crystals, not candle
  // repetitions on a rotational ring.
  [
    [-2.62, -2.62], [-2.62, 2.62], [2.62, -2.62], [2.62, 2.62],
  ].forEach(([x, z], index) => {
    addBox(
      mountain,
      `ISLAND_15_V60_NAVE_CORNER_BUTTRESS_${index + 1}`,
      [0.38, 3.22, 0.38],
      [x, 3.23, z],
      index % 2 ? v60Face : v60Stone,
    );
    addV60SeatedCrystal(
      mountain,
      `ISLAND_15_V60_NAVE_CORNER_BUTTRESS_CRYSTAL_${index + 1}`,
      [x, 4.74, z],
      [0.72, 1.0, 0.72],
      index % 2 ? v60Violet : v60Cyan,
      x * 0.025,
    );
  });
  [
    [-1.88, -1.88], [-1.88, 1.88], [1.88, -1.88], [1.88, 1.88],
  ].forEach(([x, z], index) => {
    addBox(
      mountain,
      `ISLAND_15_V60_CLERESTORY_CORNER_BUTTRESS_${index + 1}`,
      [0.32, 3.48, 0.32],
      [x, 5.62, z],
      v60Trim,
    );
    addV60SeatedCrystal(
      mountain,
      `ISLAND_15_V60_CLERESTORY_CORNER_CRYSTAL_${index + 1}`,
      [x, 7.24, z],
      [0.62, 0.86, 0.62],
      index % 2 ? v60Cyan : v60Violet,
      x * 0.035,
    );
  });

  // The masonry crown is an occupied square lantern support. One dominant
  // crystal grows directly from it and clears the wing apex by far more than
  // the locked twelve-percent hierarchy requirement.
  addBox(
    permanentCrown,
    'ISLAND_15_V60_OCCUPIED_SQUARE_CROWN_LANTERN_SUPPORT',
    [1.42, 0.82, 1.42],
    [0, 9.24, 0],
    v60Stone,
  );
  addV60SeatedCrystal(
    permanentCrown,
    'ISLAND_15_V60_DOMINANT_MASONRY_SEATED_CROWN_CRYSTAL',
    [0, 9.29, 0],
    [0.92, 0.69, 0.92],
    v60Hero,
  );
  const permanentRearDatum = addBox(
    permanentRear,
    'ISLAND_15_V60_PERMANENT_REAR_VERTICAL_SPINE_DATUM',
    [0.32, 2.2, 0.34],
    [0, 7.48, -1.94],
    v60Trim,
  );
  permanentRearDatum.userData.island15V60AboveFocusedRoomSightline = true;

  // A compact processional stair anchors the deep south portal without
  // widening the family beyond the locked portrait-safe silhouette.
  [
    { width: 3.4, y: 0.13, z: 5.15, depth: 0.54 },
    { width: 2.92, y: 0.27, z: 4.91, depth: 0.42 },
    { width: 2.46, y: 0.41, z: 4.71, depth: 0.34 },
  ].forEach(({ width, y, z, depth }, index) => {
    addBox(
      southNearWall,
      `ISLAND_15_V60_SOUTH_PROCESSIONAL_STAIR_${index + 1}`,
      [width, 0.18, depth],
      [0, y, z],
      index === 1 ? v60Stone : v60Face,
    );
  });

  overviewRoof.add(mountain);
}

/**
 * Builds Island 015 as one real palace rather than five detached landmarks.
 *
 * The canonical 36-stop route is the floor of the central Boss Hall. Four
 * inhabited corner-wing rooms sit at their real world-space transforms inside
 * the same shell, joined to that hub by permanent physical crystal galleries.
 */
export function createIsland15UnifiedCrystalPalaceAsset(
  materials: Island15CrystalGlacierMaterials,
): THREE.Group {
  const names = ISLAND_15_CRYSTAL_PALACE_NODE_NAMES;
  const root = new THREE.Group();
  root.name = names.root;
  root.position.y = 0;
  root.userData.island15UnifiedPalace = true;
  root.userData.missionTitle = 'The Aurora That Learned to Move';
  root.userData.island15BuildProgressionPolicy = 'interior-room-content-primary';
  // V62 is retained as retired Gauntlet evidence in its isolated module. Keep
  // the strongest playable exterior mounted until a successor clears its own
  // macro gate.
  root.userData.island15ExteriorFamily = 'v58-luminous-gothic-palace';

  const permanentExterior = new THREE.Group();
  permanentExterior.name = names.permanent.exterior;
  const permanentRear = new THREE.Group();
  permanentRear.name = names.permanent.rear;
  const permanentCrown = new THREE.Group();
  permanentCrown.name = names.permanent.crown;
  const overviewRoof = new THREE.Group();
  overviewRoof.name = names.overview.roof;
  const southNearWall = new THREE.Group();
  southNearWall.name = names.overview.southNearWall;
  root.add(permanentExterior, permanentRear, permanentCrown, overviewRoof, southNearWall);

  const palacePlinth = new THREE.Mesh(
    new THREE.CylinderGeometry(5.3, 5.72, 0.5, 12),
    materials.deepIce,
  );
  palacePlinth.name = 'ISLAND_15_UNIFIED_PALACE_FACETED_PLINTH';
  palacePlinth.position.y = -0.18;
  palacePlinth.castShadow = true;
  palacePlinth.receiveShadow = true;
  permanentExterior.add(palacePlinth);
  const floorInlay = new THREE.Mesh(
    new THREE.CylinderGeometry(5.12, 5.22, 0.12, 12),
    materials.silver,
  );
  floorInlay.name = 'ISLAND_15_UNIFIED_PALACE_SILVER_FLOOR_INLAY';
  floorInlay.position.y = 0.12;
  permanentExterior.add(floorInlay);

  buildIsland15BroadTieredOverviewShell(
    overviewRoof,
    permanentRear,
    permanentCrown,
    southNearWall,
    materials,
  );
  addIsland15InteriorCirculationSystem(root, materials);

  const addSemanticStageMarker = (stage: THREE.Group, room: string, level: 2 | 3, accent: THREE.Material) => {
    const marker = new THREE.Mesh(new THREE.OctahedronGeometry(level === 2 ? 0.13 : 0.18, 0), accent);
    marker.name = `ISLAND_15_${room}_CONSTRUCTION_MARKER_L${level}`;
    marker.position.set(level === 2 ? -0.34 : 0.34, 2.48 + level * 0.12, -0.82);
    marker.scale.y = 1.65;
    stage.add(marker);
  };

  const roomSpecs: readonly {
    room: 'HATCHERY' | 'HABIT' | 'MYSTERY' | 'WISDOM';
    builder: Island15PalaceRoomBuilder;
    position: readonly [number, number, number];
    rotationY: number;
    accent: THREE.Material;
  }[] = [
    { room: 'HATCHERY', builder: addFrostNestInterior, position: [-3.48, 0.42, 3.48], rotationY: Math.PI * 0.75, accent: materials.warmWindow },
    { room: 'HABIT', builder: addIceBastionInterior, position: [3.48, 0.42, 3.48], rotationY: -Math.PI * 0.75, accent: materials.crystalGlow },
    { room: 'MYSTERY', builder: addAuroraObservatoryInterior, position: [3.48, 0.42, -3.48], rotationY: -Math.PI * 0.25, accent: materials.violetCrystal },
    { room: 'WISDOM', builder: addOracleLibraryInterior, position: [-3.48, 0.42, -3.48], rotationY: Math.PI * 0.25, accent: materials.gold },
  ];
  const roomVeilMaterial = materials.ice.clone();
  roomVeilMaterial.opacity = 0.16;
  roomVeilMaterial.depthWrite = false;
  const preserveIsland15SemanticMesh = (mesh: THREE.Mesh) => Boolean(
    mesh.userData.island15Animated
    || /(EGG_|FIREPLACE_|THRONE_|ORACLE|ARMILLARY|PRISM|CONSTRUCTION_MARKER|HIT_ANCHOR)/.test(mesh.name),
  );
  const belongsToIsland15OverviewExterior = (mesh: THREE.Mesh, stage: THREE.Group) => {
    let cursor: THREE.Object3D | null = mesh;
    while (cursor && cursor !== stage) {
      if (cursor.userData.island15OverviewExterior === true) return true;
      cursor = cursor.parent;
    }
    return false;
  };

  roomSpecs.forEach(({ room, builder, position, rotationY, accent }) => {
    const roomNames = names.rooms[room];
    const roomRoot = new THREE.Group();
    roomRoot.name = roomNames.root;
    roomRoot.position.set(...position);
    roomRoot.rotation.y = rotationY;
    roomRoot.scale.set(0.5, 0.82, 0.5);
    roomRoot.userData.island15InternalPalaceRoom = true;
    const l1 = new THREE.Group();
    l1.name = roomNames.levels[1];
    builder(l1, 3, materials);
    const l2 = new THREE.Group();
    l2.name = roomNames.levels[2];
    addSemanticStageMarker(l2, room, 2, accent);
    const l3 = new THREE.Group();
    l3.name = roomNames.levels[3];
    addSemanticStageMarker(l3, room, 3, room === 'WISDOM' ? materials.heroCrystal : accent);
    const nestedStages: THREE.Object3D[] = [];
    l1.traverse((object) => {
      if (object !== l1 && (object.userData.buildStage === 2 || object.userData.buildStage === 3)) {
        nestedStages.push(object);
      }
    });
    nestedStages.forEach((stage) => {
      (stage.userData.buildStage === 2 ? l2 : l3).add(stage);
    });
    if (room === 'HATCHERY') {
      const frostRoom = l1.getObjectByName('ISLAND_15_FROST_NEST_CUTAWAY_SHELL');
      const moveFrostPart = (target: THREE.Group, partName: string) => {
        const part = frostRoom?.getObjectByName(partName);
        if (part) target.add(part);
      };
      [2, 3].forEach((egg) => moveFrostPart(l2, `ISLAND_15_FROST_NEST_EGG_${egg}`));
      [4, 5].forEach((egg) => moveFrostPart(l3, `ISLAND_15_FROST_NEST_EGG_${egg}`));
      [
        'ISLAND_15_FROST_NEST_FIREPLACE_FIREBOX',
        'ISLAND_15_FROST_NEST_FIREPLACE_MANTLE',
        'ISLAND_15_FROST_NEST_FIREPLACE_CHIMNEY',
        'ISLAND_15_FROST_NEST_FIREPLACE_ORANGE_FLAME',
      ].forEach((partName) => moveFrostPart(l2, partName));
      const frostL2Parts: THREE.Object3D[] = [];
      const isFrostL2Part = (object: THREE.Object3D | null | undefined) => Boolean(
        object
        && /(HEALING_CRYSTALS|WARD_CRYSTALS|CRYSTAL_GUARD_RING|GUARD_CRYSTAL|WARMTH_RUNE|CARE_SHELF|CARE_VIAL|WARMTH_RUG|BRAZIER|CARE_CUSHION)/.test(object.name),
      );
      frostRoom?.traverse((object) => {
        if (isFrostL2Part(object) && !isFrostL2Part(object.parent)) frostL2Parts.push(object);
      });
      frostL2Parts.forEach((part) => l2.add(part));
    }
    const hitAnchor = new THREE.Group();
    hitAnchor.name = roomNames.hitAnchor;
    hitAnchor.position.set(0, 0.85, 0.1);
    hitAnchor.userData.hitRadius = 1.25;
    const occluders = new THREE.Group();
    occluders.name = roomNames.occluders;
    const roomGlass = addBox(occluders, `${roomNames.occluders}_GLASS`, [3.1, 2.6, 0.08], [0, 1.45, 1.41], materials.ice);
    roomGlass.material = roomVeilMaterial;
    roomRoot.add(l1, l2, l3, hitAnchor, occluders);
    [l1, l2, l3].forEach((stage, stageIndex) => {
      canonicalizeIsland15StaticMaterials(stage);
      compactStaticGeometry(
        stage,
        `ISLAND_15_${room}_L${stageIndex + 1}`,
        (mesh) => !preserveIsland15SemanticMesh(mesh) && !belongsToIsland15OverviewExterior(mesh, stage),
      );
    });
    root.add(roomRoot);
  });

  const bossNames = names.rooms.BOSS;
  const bossRoot = new THREE.Group();
  bossRoot.name = bossNames.root;
  bossRoot.userData.island15InternalPalaceRoom = true;
  const bossL1 = new THREE.Group();
  bossL1.name = bossNames.levels[1];
  const bossFloor = new THREE.Mesh(new THREE.CylinderGeometry(4.02, 4.18, 0.18, 36), materials.castleShadow);
  bossFloor.name = 'ISLAND_15_BOSS_HALL_FLOOR';
  bossFloor.position.y = 0.16;
  bossL1.add(bossFloor);
  // The canonical renderer owns the exact 36 gameplay tiles at radius 3.4.
  // The palace supplies their architectural floor only; it never duplicates
  // gameplay route geometry or progression semantics.
  const bossChoir = new THREE.Group();
  bossChoir.name = 'ISLAND_15_BOSS_HALL_CATHEDRAL_CHOIR';
  // Seat the entire apse just beyond the protected stop annulus. The closest
  // tracery/glass faces remain visually attached to the throne composition,
  // while their collision triangles stay outside the renderer-owned route.
  bossChoir.position.z = -0.2;
  // The entire choir backdrop sits beyond the route ring. It gives the throne
  // a real cathedral apse without putting collision geometry between stops.
  addIsland15GabledMass(
    bossChoir,
    'ISLAND_15_BOSS_HALL_CHOIR_OUTER_GABLE',
    [6.8, 2.72, 1.48, 0.34],
    [0, 0.28, -4.62],
    materials.castleShadow,
  );
  addIsland15GabledMass(
    bossChoir,
    'ISLAND_15_BOSS_HALL_CHOIR_INNER_GABLE',
    [6.24, 2.48, 1.3, 0.18],
    [0, 0.42, -4.4],
    materials.castle,
  );
  addBox(
    bossChoir,
    'ISLAND_15_BOSS_HALL_CHOIR_DADO',
    [6.46, 0.68, 0.24],
    [0, 0.63, -4.25],
    materials.deepIce,
  );
  const centralChoirRecess = addIsland15ExtrudedPointedReveal(
    bossChoir,
    'ISLAND_15_BOSS_HALL_CHOIR_CENTRAL_RECESS',
    2.72,
    3.34,
    0.14,
    [0, 0.72, -4.33],
    materials.midnight,
  );
  centralChoirRecess.receiveShadow = true;
  addIsland15ExtrudedPointedReveal(
    bossChoir,
    'ISLAND_15_BOSS_HALL_CHOIR_CENTRAL_AURORA_GLASS',
    2.28,
    2.94,
    0.08,
    [0, 0.91, -4.17],
    materials.deepIce,
  );
  [-2.24, 2.24].forEach((x, index) => {
    addIsland15ExtrudedPointedReveal(
      bossChoir,
      `ISLAND_15_BOSS_HALL_CHOIR_LANCET_RECESS_${index + 1}`,
      1.14,
      2.52,
      0.12,
      [x, 0.72, -4.31],
      materials.midnight,
    );
    addIsland15ExtrudedPointedReveal(
      bossChoir,
      `ISLAND_15_BOSS_HALL_CHOIR_LANCET_GLASS_${index + 1}`,
      0.78,
      2.14,
      0.07,
      [x, 0.91, -4.16],
      index ? materials.violetCrystal : materials.crystalGlow,
    );
  });
  [-3.08, -1.5, 1.5, 3.08].forEach((x, index) => {
    const choirPier = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.25, index === 0 || index === 3 ? 3.82 : 3.46, 7),
      index === 0 || index === 3 ? materials.castleShadow : materials.silver,
    );
    choirPier.name = `ISLAND_15_BOSS_HALL_CHOIR_ENGAGED_PIER_${index + 1}`;
    choirPier.position.set(x, index === 0 || index === 3 ? 2.16 : 1.98, -4.08);
    choirPier.castShadow = true;
    bossChoir.add(choirPier);
    const pierCrown = new THREE.Mesh(
      new THREE.OctahedronGeometry(index === 0 || index === 3 ? 0.25 : 0.2, 0),
      index % 2 ? materials.violetCrystal : materials.crystalGlow,
    );
    pierCrown.name = `ISLAND_15_BOSS_HALL_CHOIR_PIER_CROWN_${index + 1}`;
    pierCrown.position.set(x, index === 0 || index === 3 ? 4.18 : 3.78, -4.08);
    pierCrown.scale.y = 1.45;
    bossChoir.add(pierCrown);
  });
  const choirRose = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 1), materials.heroCrystal);
  choirRose.name = 'ISLAND_15_BOSS_HALL_CHOIR_AURORA_ROSE';
  choirRose.position.set(0, 2.45, -4.04);
  choirRose.rotation.z = Math.PI * 0.25;
  choirRose.scale.y = 1.12;
  bossChoir.add(choirRose);
  [-0.72, 0, 0.72].forEach((x, index) => {
    const tracery = addBox(
      bossChoir,
      `ISLAND_15_BOSS_HALL_CHOIR_TRACERY_${index + 1}`,
      [0.075, index === 1 ? 2.45 : 2.06, 0.075],
      [x, index === 1 ? 2.03 : 1.83, -4.03],
      materials.silver,
    );
    tracery.rotation.z = x * -0.08;
  });
  bossL1.add(bossChoir);

  const bossColumnGeometry = new THREE.CylinderGeometry(0.11, 0.18, 2.45, 7);
  const bossCapitalGeometry = new THREE.OctahedronGeometry(0.2, 0);
  const bossColumns = new THREE.InstancedMesh(bossColumnGeometry, materials.silver, 12);
  bossColumns.name = 'ISLAND_15_BOSS_HALL_AISLE_COLUMNS';
  const bossCyanCapitals = new THREE.InstancedMesh(bossCapitalGeometry, materials.crystalGlow, 6);
  bossCyanCapitals.name = 'ISLAND_15_BOSS_HALL_CYAN_CAPITALS';
  const bossVioletCapitals = new THREE.InstancedMesh(bossCapitalGeometry, materials.violetCrystal, 6);
  bossVioletCapitals.name = 'ISLAND_15_BOSS_HALL_VIOLET_CAPITALS';
  const bossDummy = new THREE.Object3D();
  let cyanCapitalIndex = 0;
  let violetCapitalIndex = 0;
  for (let index = 0; index < 12; index += 1) {
    const angle = index / 12 * Math.PI * 2;
    bossDummy.position.set(Math.cos(angle) * 4.34, 1.46, Math.sin(angle) * 4.34);
    bossDummy.scale.set(1, 1, 1);
    bossDummy.updateMatrix();
    bossColumns.setMatrixAt(index, bossDummy.matrix);
    bossDummy.position.y = 2.69;
    bossDummy.scale.set(1, 1.45, 1);
    bossDummy.updateMatrix();
    if (index % 2) bossVioletCapitals.setMatrixAt(violetCapitalIndex++, bossDummy.matrix);
    else bossCyanCapitals.setMatrixAt(cyanCapitalIndex++, bossDummy.matrix);
  }
  bossColumns.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  bossCyanCapitals.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  bossVioletCapitals.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  bossL1.add(bossColumns, bossCyanCapitals, bossVioletCapitals);
  const bossL2 = new THREE.Group();
  bossL2.name = bossNames.levels[2];
  [
    [2.82, 0.16, 0.54, 0.34, -0.34],
    [2.52, 0.17, 0.5, 0.45, -0.61],
    [2.24, 0.18, 0.48, 0.56, -0.86],
  ].forEach(([width, height, depth, y, z], index) => {
    addBox(
      bossL2,
      `ISLAND_15_BOSS_HALL_THRONE_APPROACH_STEP_${index + 1}`,
      [width, height, depth],
      [0, y, z],
      index === 1 ? materials.castle : materials.castleShadow,
    );
  });
  const throneDaisLower = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.38, 0.18, 10), materials.castleShadow);
  throneDaisLower.name = 'ISLAND_15_BOSS_HALL_THRONE_DAIS_LOWER';
  throneDaisLower.position.set(0, 0.58, -1.28);
  bossL2.add(throneDaisLower);
  const throneDaisMiddle = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.26, 0.18, 10), materials.castle);
  throneDaisMiddle.name = 'ISLAND_15_BOSS_HALL_THRONE_DAIS_MIDDLE';
  throneDaisMiddle.position.set(0, 0.73, -1.32);
  bossL2.add(throneDaisMiddle);
  const throneDais = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 1.16, 0.24, 10), materials.deepIce);
  throneDais.name = 'ISLAND_15_BOSS_HALL_THRONE_DAIS';
  throneDais.position.set(0, 0.91, -1.39);
  bossL2.add(throneDais);
  addBox(bossL2, 'ISLAND_15_BOSS_HALL_THRONE_SEAT', [1.14, 0.5, 0.82], [0, 1.27, -1.23], materials.deepIce);
  addBox(bossL2, 'ISLAND_15_BOSS_HALL_THRONE_SEAT_CUSHION', [0.94, 0.2, 0.7], [0, 1.56, -1.16], materials.midnight);
  addBox(bossL2, 'ISLAND_15_BOSS_HALL_THRONE_APRON', [1.0, 0.58, 0.18], [0, 1.16, -0.78], materials.castleShadow);
  addIsland15ExtrudedPointedReveal(bossL2, 'ISLAND_15_BOSS_HALL_THRONE_ARCH', 2.08, 3.58, 0.34, [0, 0.86, -1.94], materials.silver);
  addIsland15ExtrudedPointedReveal(bossL2, 'ISLAND_15_BOSS_HALL_THRONE_BACK', 1.72, 3.24, 0.2, [0, 1.01, -1.57], materials.castle);
  addIsland15ExtrudedPointedReveal(bossL2, 'ISLAND_15_BOSS_HALL_THRONE_INLAY', 1.14, 2.7, 0.09, [0, 1.25, -1.31], materials.midnight);
  addIsland15ExtrudedPointedReveal(bossL2, 'ISLAND_15_BOSS_HALL_THRONE_INLAY_GLOW', 0.76, 2.26, 0.05, [0, 1.47, -1.2], materials.deepIce);
  [-0.73, 0.73].forEach((x, index) => {
    const arm = addBox(bossL2, `ISLAND_15_BOSS_HALL_THRONE_ARM_${index + 1}`, [0.28, 0.76, 0.88], [x, 1.35, -1.18], materials.silver);
    arm.rotation.z = index ? -0.12 : 0.12;
    const armGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.17, 0), index ? materials.violetCrystal : materials.crystalGlow);
    armGem.name = `ISLAND_15_BOSS_HALL_THRONE_ARM_GEM_${index + 1}`;
    armGem.position.set(x, 1.82, -1.04);
    armGem.scale.y = 1.45;
    bossL2.add(armGem);
    const armScroll = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.075, 7, 18, Math.PI * 1.45), materials.castle);
    armScroll.name = `ISLAND_15_BOSS_HALL_THRONE_ARM_SCROLL_${index + 1}`;
    armScroll.position.set(x, 1.69, -0.86);
    armScroll.rotation.set(Math.PI * 0.5, 0, index ? Math.PI * 0.18 : Math.PI * 0.82);
    bossL2.add(armScroll);
  });
  [-1.78, 1.78].forEach((x, index) => {
    addBox(bossL2, `ISLAND_15_BOSS_HALL_GUARDIAN_PLINTH_${index + 1}`, [0.64, 0.76, 0.64], [x, 0.73, -1.28], materials.castleShadow);
    addBox(bossL2, `ISLAND_15_BOSS_HALL_GUARDIAN_PLINTH_INLAY_${index + 1}`, [0.54, 0.48, 0.06], [x, 0.76, -0.83], index ? materials.violetCrystal : materials.crystalGlow);
    const lion = new THREE.Group();
    lion.name = `ISLAND_15_BOSS_HALL_GUARDIAN_${index + 1}`;
    lion.position.set(x, 1.02, -1.25);
    const lionBody = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), materials.castle);
    lionBody.name = `${lion.name}_BODY`;
    lionBody.position.set(0, 0.38, -0.08);
    lionBody.scale.set(0.88, 1.18, 1.25);
    lion.add(lionBody);
    const lionChest = new THREE.Mesh(new THREE.SphereGeometry(0.28, 9, 7), materials.silver);
    lionChest.name = `${lion.name}_CHEST`;
    lionChest.position.set(0, 0.49, 0.2);
    lionChest.scale.set(0.92, 1.25, 0.72);
    lion.add(lionChest);
    const lionMane = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34, 0), materials.castleShadow);
    lionMane.name = `${lion.name}_MANE`;
    lionMane.position.set(0, 0.88, 0.24);
    lionMane.scale.set(0.95, 1.08, 0.72);
    lion.add(lionMane);
    const lionFace = new THREE.Mesh(new THREE.SphereGeometry(0.2, 9, 7), materials.castle);
    lionFace.name = `${lion.name}_FACE`;
    lionFace.position.set(0, 0.9, 0.47);
    lionFace.scale.set(0.92, 0.94, 0.72);
    lion.add(lionFace);
    const lionMuzzle = addBox(lion, `${lion.name}_MUZZLE`, [0.24, 0.13, 0.16], [0, 0.84, 0.63], materials.silver);
    lionMuzzle.rotation.x = -0.12;
    [-0.16, 0.16].forEach((legX, legIndex) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.46, 7), materials.castle);
      leg.name = `${lion.name}_FORELEG_${legIndex + 1}`;
      leg.position.set(legX, 0.18, 0.25);
      lion.add(leg);
      addBox(lion, `${lion.name}_PAW_${legIndex + 1}`, [0.2, 0.1, 0.25], [legX, -0.04, 0.34], materials.silver);
      const eye = new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 0), index ? materials.violetCrystal : materials.crystalGlow);
      eye.name = `${lion.name}_EYE_${legIndex + 1}`;
      eye.position.set(legX * 0.48, 0.94, 0.62);
      lion.add(eye);
    });
    [-0.18, 0.18].forEach((earX, earIndex) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 5), materials.castleShadow);
      ear.name = `${lion.name}_EAR_${earIndex + 1}`;
      ear.position.set(earX, 1.13, 0.34);
      ear.rotation.z = earIndex ? -0.42 : 0.42;
      lion.add(ear);
    });
    bossL2.add(lion);
  });
  const bossL3 = new THREE.Group();
  bossL3.name = bossNames.levels[3];
  const throneCrystalFan: readonly [number, number, number, number, number, THREE.Material][] = [
    [-1.9, 2.4, -2.0, 0.82, -0.34, materials.crystalGlow],
    [-1.6, 2.72, -2.05, 1.18, -0.28, materials.violetCrystal],
    [-1.3, 3.02, -2.1, 1.52, -0.24, materials.crystalGlow],
    [-0.98, 3.2, -2.14, 1.68, -0.2, materials.violetCrystal],
    [-0.65, 3.46, -2.18, 2.02, -0.14, materials.crystalGlow],
    [-0.32, 3.62, -2.2, 2.22, -0.08, materials.violetCrystal],
    [0, 3.83, -2.24, 2.58, 0, materials.heroCrystal],
    [0.32, 3.62, -2.2, 2.22, 0.08, materials.crystalGlow],
    [0.65, 3.46, -2.18, 2.02, 0.14, materials.violetCrystal],
    [0.98, 3.2, -2.14, 1.68, 0.2, materials.crystalGlow],
    [1.3, 3.02, -2.1, 1.52, 0.24, materials.violetCrystal],
    [1.6, 2.72, -2.05, 1.18, 0.28, materials.crystalGlow],
    [1.9, 2.4, -2.0, 0.82, 0.34, materials.violetCrystal],
  ];
  throneCrystalFan.forEach(([x, y, z, height, tilt, material], index) => {
    const centerWeight = 1 - Math.abs(x) / 2;
    const crown = addCrystal(
      bossL3,
      `ISLAND_15_BOSS_HALL_CROWN_${index + 1}`,
      [x, y, z],
      [0.54 + centerWeight * 0.22, height, 0.58 + centerWeight * 0.16],
      material,
      6,
    );
    crown.rotation.z = tilt;
  });
  [-1.46, -1.12, -0.78, 0.78, 1.12, 1.46].forEach((x, index) => {
    const foregroundShard = addCrystal(
      bossL3,
      `ISLAND_15_BOSS_HALL_FOREGROUND_CRYSTAL_${index + 1}`,
      [x, 2.16 + (index % 3) * 0.18, -1.66 + Math.abs(x) * 0.08],
      [0.42, 0.7 + (index % 3) * 0.22, 0.44],
      index % 2 ? materials.crystalGlow : materials.violetCrystal,
      6,
    );
    foregroundShard.rotation.z = x * 0.2;
  });
  [-1.04, 1.04].forEach((x, index) => {
    const throneFinial = addCrystal(
      bossL3,
      `ISLAND_15_BOSS_HALL_THRONE_FINIAL_${index + 1}`,
      [x, 3.44, -1.78],
      [0.45, 1.12, 0.46],
      index ? materials.violetCrystal : materials.crystalGlow,
      6,
    );
    throneFinial.rotation.z = index ? -0.15 : 0.15;
  });
  const throneHeart = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), materials.heroCrystal);
  throneHeart.name = 'ISLAND_15_BOSS_HALL_THRONE_HEART';
  throneHeart.position.set(0, 2.56, -1.08);
  throneHeart.scale.y = 1.55;
  throneHeart.userData.island15Animated = 'throne-heart';
  throneHeart.userData.island15BaseScaleY = throneHeart.scale.y;
  bossL3.add(throneHeart);
  const bossHitAnchor = new THREE.Group();
  bossHitAnchor.name = bossNames.hitAnchor;
  bossHitAnchor.position.set(0, 1, 0);
  bossHitAnchor.userData.hitRadius = 1.35;
  const bossOccluders = new THREE.Group();
  bossOccluders.name = bossNames.occluders;
  const bossGlass = addBox(bossOccluders, `${bossNames.occluders}_AURORA_VEIL`, [8.4, 3.1, 0.08], [0, 2.15, 4.24], materials.ice);
  bossGlass.material = roomVeilMaterial;
  bossRoot.add(bossL1, bossL2, bossL3, bossHitAnchor, bossOccluders);
  root.add(bossRoot);

  const hallLight = new THREE.PointLight(0x9ad8e6, 1.08, 8.2, 2);
  hallLight.name = 'ISLAND_15_BOSS_HALL_LIVING_AURORA_LIGHT';
  hallLight.position.set(0, 4.4, 0.4);
  root.add(hallLight);
  const hearthLight = new THREE.PointLight(0xffa56b, 0.92, 4.8, 2);
  hearthLight.name = 'ISLAND_15_BOSS_HALL_THRONE_WARMTH';
  hearthLight.position.set(0, 2.18, -1.38);
  root.add(hearthLight);
  const choirVioletLight = new THREE.PointLight(0x8c68ff, 0.72, 4.6, 2);
  choirVioletLight.name = 'ISLAND_15_BOSS_HALL_CHOIR_VIOLET_LIGHT';
  choirVioletLight.position.set(2.15, 2.55, -3.72);
  root.add(choirVioletLight);
  const choirCyanLight = new THREE.PointLight(0x55e8ff, 0.76, 4.6, 2);
  choirCyanLight.name = 'ISLAND_15_BOSS_HALL_CHOIR_CYAN_LIGHT';
  choirCyanLight.position.set(-2.15, 2.55, -3.72);
  root.add(choirCyanLight);

  // The palace remains authored from hundreds of small Gothic pieces, but
  // each shell layer ships as a material-batched semantic group. Keeping the
  // five named groups intact preserves reversible cutaways while removing the
  // per-window/per-spire draw-call penalty on phone GPUs.
  [
    [permanentExterior, 'PERMANENT_EXTERIOR'],
    [permanentRear, 'PERMANENT_REAR'],
    [permanentCrown, 'PERMANENT_CROWN'],
    [overviewRoof, 'OVERVIEW_ROOF'],
    [southNearWall, 'SOUTH_NEAR_WALL'],
  ].forEach(([group, label]) => {
    canonicalizeIsland15StaticMaterials(group as THREE.Group);
    compactStaticGeometry(
      group as THREE.Group,
      `ISLAND_15_UNIFIED_PALACE_${String(label)}`,
    );
  });

  return root;
}

export function buildIsland15CrystalGlacierLandmark(
  definition: Island5LandmarkDefinition,
  level: BuildLevel,
  _quality: Island3DQuality,
  materials: Island15CrystalGlacierMaterials,
) {
  const root = new THREE.Group();
  root.name = `ISLAND_15_${definition.id.toUpperCase()}_ROOM_ROOT`;
  root.position.set(...definition.position);
  root.userData.landmarkId = definition.id;
  root.userData.island15RoomIdentity = ISLAND_15_CRYSTAL_GLACIER_LANDMARK_LABELS[definition.id];

  if (definition.id === 'boss') {
    const blockout = buildIsland15SingleCitadelBlockoutPart({
      deepIce: materials.deepIce,
      castleShadow: materials.castleShadow,
      silver: materials.silver,
      heroCrystal: materials.heroCrystal,
    });
    root.add(blockout);
    registerIsland15RuntimePart(
      'single-citadel-blockout',
      blockout,
      'island15/Island15SingleCitadelBlockoutPart',
      Number(blockout.userData.triangleCount ?? 0),
    );
    registerIsland15RuntimePart('frozen-throne-keep', root, 'landmarks/frozen-throne');
  } else {
    const runtimePartByLandmark = {
      hatchery: ['frost-nest-room', 'rooms/frost-nest'],
      habit: ['ice-bastion-room', 'rooms/ice-bastion'],
      wisdom: ['crystal-oracle-library', 'rooms/crystal-oracle-library'],
      event: ['aurora-observatory', 'rooms/aurora-observatory'],
    } as const;
    const [partId, module] = runtimePartByLandmark[definition.id];
    registerIsland15RuntimePart(partId, root, module);
    root.userData.island15V4EmbeddedRoomAnchor = true;
    root.userData.renderableLeafCount = 0;
  }

  return root;
}

export function applyIsland15BossRoomFocusVisibility(scene: THREE.Object3D, bossFocused: boolean) {
  [
    'ISLAND_15_CASTLE_EXTERIOR_SHELL_PART',
    'ISLAND_15_CASTLE_ROOFLINE_SPIRE_SYSTEM_V2_PART',
    'ISLAND_15_CASTLE_TOWER_CROWN_PART',
    ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.overview.roof,
    ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.overview.southNearWall,
    ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.permanent.rear,
    ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.permanent.crown,
  ].forEach((name) => {
    const exteriorPart = scene.getObjectByName(name);
    if (exteriorPart) exteriorPart.visible = !bossFocused;
  });
  const throneInterior = scene.getObjectByName('ISLAND_15_FROZEN_THRONE_INTERIOR');
  if (throneInterior) throneInterior.visible = bossFocused;
}

export interface Island15AuroraCurtainComposition {
  centerAngle: number;
  arcSpan: number;
  skyRadius: number;
  baseY: number;
  height: number;
  opacityCeiling: number;
}

export function resolveIsland15AuroraCurtainComposition(index: number, total: number): Island15AuroraCurtainComposition {
  const safeTotal = Math.max(1, total);
  const spacing = Math.PI * 2 / safeTotal;
  const spanMultipliers = [1.72, 1.06, 1.3, 1.1, 1.58, 1.08, 1.26] as const;
  const angleJitter = [0, 0.055, -0.045, 0.035, -0.04, 0.05, -0.025] as const;
  // The Island 015 exterior cameras sit roughly 28 world units from center.
  // Keep every sky curtain beyond them, then raise its middle band above the
  // mountain basin so portrait overview shots see the event rather than
  // clipping through a near-camera ring.
  const radii = [39, 49, 43, 54, 46, 51, 41] as const;
  const baseHeights = [12, 16, 13.5, 18, 11.8, 15, 13] as const;
  const heights = [26, 18, 22, 16, 28, 20, 24] as const;
  const opacityCeilings = [0.26, 0.13, 0.19, 0.115, 0.22, 0.14, 0.18] as const;
  const slot = index % spanMultipliers.length;
  return {
    centerAngle: index / safeTotal * Math.PI * 2 + 0.18 + spacing * angleJitter[slot],
    // Every arc still overlaps its neighbours at full coverage. The irregular
    // spans create two dominant veils plus quieter rays rather than one belt.
    arcSpan: spacing * spanMultipliers[slot],
    skyRadius: radii[slot],
    baseY: baseHeights[slot],
    height: heights[slot],
    opacityCeiling: opacityCeilings[slot],
  };
}

function createAuroraCurtain(index: number, quality: Island3DQuality, total: number) {
  const columns = quality === 'high' ? 48 : quality === 'medium' ? 34 : 24;
  const rows = quality === 'high' ? 12 : 8;
  const geometry = new THREE.PlaneGeometry(1, 1, columns, rows);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
  const composition = resolveIsland15AuroraCurtainComposition(index, total);
  const { centerAngle, arcSpan, skyRadius, baseY, height } = composition;
  for (let vertex = 0; vertex < position.count; vertex += 1) {
    const theta = centerAngle + (uv.getX(vertex) - 0.5) * arcSpan;
    const radialFold = Math.sin(uv.getX(vertex) * Math.PI * 5 + index * 1.7) * 0.42;
    const radius = skyRadius + radialFold;
    position.setXYZ(
      vertex,
      Math.sin(theta) * radius,
      baseY + (uv.getY(vertex) - 0.5) * height,
      Math.cos(theta) * radius,
    );
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uColorA: { value: new THREE.Color(0x39ffd1) },
      uColorB: { value: new THREE.Color(0x7c73ff) },
      uColorC: { value: new THREE.Color(0xff63c8) },
      uPhase: { value: index * 1.37 },
      uForm: { value: index % 3 + 1 },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uPhase;
      uniform float uForm;
      varying vec2 vUv;
      varying float vFold;
      varying float vRibbon;
      void main() {
        vUv = uv;
        vec3 p = position;
        float edge = sin(uv.x * 13.0 + uTime * (0.18 + uForm * 0.03) + uPhase);
        float broad = sin(uv.x * 4.2 - uTime * 0.11 + uPhase * 0.7);
        float braid = sin(uv.x * (7.0 + uForm * 1.7) + uTime * 0.09 - uPhase) * cos(uv.y * 3.14159);
        float crown = sin((uv.x - 0.5) * 3.14159) * sin(uv.x * 5.0 + uPhase);
        float curtainForm = 1.0 - smoothstep(1.15, 1.85, uForm);
        float braidForm = smoothstep(1.15, 1.85, uForm) * (1.0 - smoothstep(2.15, 2.85, uForm));
        float crownForm = smoothstep(2.15, 2.85, uForm);
        float hangingFold = sin(uv.y * 3.14159 + uPhase) * (0.42 + uForm * 0.12);
        float lateralDrift = sin(uv.x * 6.28318 + uTime * 0.075 + uPhase) * 0.28;
        p.x += curtainForm * (hangingFold + lateralDrift)
          + braidForm * (hangingFold * 0.62 + lateralDrift * 1.35)
          + crownForm * (hangingFold * 0.34 + lateralDrift * 0.72);
        p.z += curtainForm * (edge * (0.22 + uv.y * 0.52) + broad * 0.38)
          + braidForm * (braid * 0.64 + edge * 0.18)
          + crownForm * (crown * (0.34 + uv.y * 0.46) + broad * 0.22);
        p.y += curtainForm * (broad * 0.36 + sin(uv.x * 7.0 + uPhase) * 0.18)
          + braidForm * (braid * 0.24 + sin(uv.x * 3.0 + uPhase) * 0.3)
          + crownForm * (abs(crown) * 0.58 + broad * 0.12);
        vFold = 0.5 + 0.5 * mix(edge, braid, braidForm);
        vRibbon = 0.5 + 0.5 * mix(broad, crown, crownForm);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform vec3 uColorC;
      uniform float uTime;
      uniform float uPhase;
      uniform float uForm;
      varying vec2 vUv;
      varying float vFold;
      varying float vRibbon;
      void main() {
        float lower = smoothstep(0.02, 0.25, vUv.y);
        float upper = 1.0 - smoothstep(0.82, 1.0, vUv.y);
        float striation = 0.58 + 0.42 * pow(abs(sin(vUv.x * (22.0 + uForm * 5.0) + uPhase + uTime * 0.08)), 2.0);
        float horizontal = smoothstep(0.0, 0.08, vUv.x) * (1.0 - smoothstep(0.92, 1.0, vUv.x));
        float scallop = 0.78 + 0.22 * sin(vUv.x * 8.0 + uPhase + vUv.y * 2.0);
        float ray = pow(abs(sin(vUv.x * (12.0 + uForm * 3.0) + uPhase)), 4.0);
        float braidedVeil = mix(0.58, 1.0, vRibbon) * mix(0.62, 1.0, ray);
        float drapePathA = 0.52
          + sin(vUv.x * 6.2 + uPhase + uTime * 0.11) * 0.13
          + sin(vUv.x * 2.4 - uPhase * 0.4) * 0.07;
        float drapePathB = drapePathA + 0.18 + sin(vUv.x * 4.1 - uTime * 0.085) * 0.035;
        float drapeBandA = 1.0 - smoothstep(0.065, 0.22, abs(vUv.y - drapePathA));
        float drapeBandB = 1.0 - smoothstep(0.05, 0.18, abs(vUv.y - drapePathB));
        float trailingVeil = (1.0 - smoothstep(drapePathA - 0.04, drapePathA + 0.36, vUv.y))
          * smoothstep(0.04, 0.22, vUv.y)
          * (0.24 + 0.34 * ray);
        float curtainShape = lower * upper
          * max(drapeBandA, drapeBandB * 0.72)
          * mix(0.78, 1.0, vFold);
        curtainShape = max(curtainShape, trailingVeil * 0.34);
        float braidPathA = 0.46 + sin(vUv.x * 7.0 + uPhase + uTime * 0.12) * 0.16;
        float braidPathB = 0.52 + sin(vUv.x * 7.0 + uPhase + 3.14159 + uTime * 0.12) * 0.16;
        float braidShape = max(
          1.0 - smoothstep(0.055, 0.2, abs(vUv.y - braidPathA)),
          1.0 - smoothstep(0.055, 0.2, abs(vUv.y - braidPathB))
        );
        braidShape *= smoothstep(0.04, 0.16, vUv.y) * (1.0 - smoothstep(0.8, 0.98, vUv.y));
        float crownPath = 0.42 + (1.0 - pow(abs(vUv.x - 0.5) * 2.0, 1.5)) * 0.34;
        float crownBand = 1.0 - smoothstep(0.06, 0.24, abs(vUv.y - crownPath));
        float crownShape = max(crownBand, lower * upper * ray * 0.58);
        float curtainForm = 1.0 - smoothstep(1.15, 1.85, uForm);
        float braidForm = smoothstep(1.15, 1.85, uForm) * (1.0 - smoothstep(2.15, 2.85, uForm));
        float crownForm = smoothstep(2.15, 2.85, uForm);
        float formShape = curtainShape * curtainForm + braidShape * braidForm + crownShape * crownForm;
        float verticalRay = pow(abs(sin(vUv.x * (17.0 + uForm * 4.0) + uPhase)), 7.0)
          * smoothstep(0.01, 0.15, vUv.y)
          * (1.0 - smoothstep(0.78, 1.0, vUv.y));
        formShape = max(formShape, verticalRay * (0.32 + curtainForm * 0.22 + crownForm * 0.12));
        float veil = horizontal * scallop * mix(0.7, 1.0, striation)
          * mix(0.78, 1.0, vFold) * mix(0.86, braidedVeil, smoothstep(1.2, 2.8, uForm))
          * formShape;
        float verticalMix = smoothstep(0.08, 0.76, vUv.y + sin(vUv.x * 7.0 + uPhase) * 0.12);
        vec3 color = mix(uColorA, uColorB, verticalMix);
        color = mix(color, uColorC, smoothstep(0.62, 1.0, vUv.y + vRibbon * 0.2) * (0.13 + 0.16 * ray));
        float gapWave = 0.5 + 0.5 * sin(vUv.x * (3.1 + uForm * 0.42) + uPhase * 1.91);
        float darkSkyBreaks = smoothstep(0.24, 0.68, gapWave);
        veil *= mix(0.12, 1.0, darkSkyBreaks);
        gl_FragColor = vec4(color, veil * uOpacity);
      }
    `,
  });
  const curtain = new THREE.Mesh(geometry, material);
  curtain.name = `ISLAND_15_AURORA_CURTAIN_${index + 1}`;
  curtain.frustumCulled = false;
  curtain.visible = false;
  curtain.userData.island15AuroraArc = {
    centerAngle,
    arcSpan,
    skyRadius,
    baseY,
    height,
    opacityCeiling: composition.opacityCeiling,
    coverageDegrees: THREE.MathUtils.radToDeg(arcSpan),
  };
  return { curtain, material };
}

function createAuroraSkyDome(quality: Island3DQuality) {
  const widthSegments = quality === 'high' ? 64 : quality === 'medium' ? 48 : 32;
  const heightSegments = quality === 'high' ? 28 : quality === 'medium' ? 22 : 16;
  // Keep the inside-view shell inside the shared Island Run camera's far
  // plane.  A 96-unit sphere could be clipped away entirely from the authored
  // hero camera even though its material and animation were active.
  const geometry = new THREE.SphereGeometry(58, widthSegments, heightSegments);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    // The camera-relative coverage layer supplies form, not bloom. Normal
    // blending keeps opposed camera angles coherent; the physical curtains and
    // crystal emissive response still provide the additive luminous energy.
    blending: THREE.NormalBlending,
    side: THREE.BackSide,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uColorA: { value: new THREE.Color(0x43ffd0) },
      uColorB: { value: new THREE.Color(0x758cff) },
      uColorC: { value: new THREE.Color(0xf16fd5) },
      uElevationOffset: { value: 0 },
    },
    vertexShader: `
      varying vec3 vSkyDirection;
      void main() {
        vSkyDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform vec3 uColorC;
      uniform float uElevationOffset;
      varying vec3 vSkyDirection;
      void main() {
        const float PI = 3.14159265359;
        vec3 direction = normalize(vSkyDirection);
        float azimuth = atan(direction.x, direction.z) / (2.0 * PI) + 0.5;
        float elevation = clamp(direction.y * 0.5 + 0.5 + uElevationOffset, 0.0, 1.0);
        float drift = uTime * 0.006;
        // The shared Island Run hero camera is elevated and looks down toward
        // the board, so the visible sky window sits around the camera-relative
        // horizon. Build the folds through that window and let the veils climb
        // above it; this keeps them visible without painting over the palace.
        float pathA = 0.46
          + sin(azimuth * 2.0 * PI * 2.15 + drift) * 0.07
          + sin(azimuth * 2.0 * PI * 5.1 - drift * 1.6) * 0.028;
        float pathB = 0.58
          + sin(azimuth * 2.0 * PI * 1.35 - drift * 0.8 + 1.7) * 0.045
          + sin(azimuth * 2.0 * PI * 4.2 + drift) * 0.018;
        float pathC = 0.645
          + sin(azimuth * 2.0 * PI * 1.72 + drift * 0.72 + 4.1) * 0.052
          + sin(azimuth * 2.0 * PI * 6.4 - drift * 1.2) * 0.014;
        // A broad polar canopy keeps the active event continuous across every
        // authored camera. It stays translucent and modulated, so the stronger
        // folded ribbons can still open real dark-sky breathing lanes instead
        // of reading as three disconnected luminous spots.
        float canopyPath = 0.515
          + sin(azimuth * 2.0 * PI * 0.86 - drift * 0.54 + 0.8) * 0.055
          + sin(azimuth * 2.0 * PI * 2.75 + drift * 0.82) * 0.026;
        float ribbonA = 1.0 - smoothstep(0.022, 0.12, abs(elevation - pathA));
        float ribbonB = 1.0 - smoothstep(0.016, 0.082, abs(elevation - pathB));
        float ribbonC = 1.0 - smoothstep(0.012, 0.06, abs(elevation - pathC));
        float canopyRibbon = 1.0 - smoothstep(0.045, 0.205, abs(elevation - canopyPath));
        float downwardVeil = (1.0 - smoothstep(pathA - 0.02, pathA + 0.24, elevation))
          * smoothstep(0.25, pathA, elevation);
        float rayPhase = azimuth * 2.0 * PI * 18.0
          + sin(elevation * 28.0 + drift * 1.7) * 1.45
          + sin(azimuth * 2.0 * PI * 3.0 - drift) * 0.72
          + drift * 2.4;
        float fineRays = pow(abs(sin(rayPhase)), 9.0);
        float hangingWindow = smoothstep(pathA - 0.24, pathA - 0.035, elevation)
          * (1.0 - smoothstep(pathA - 0.028, pathA + 0.018, elevation));
        float hangingRays = hangingWindow
          * pow(0.5 + 0.5 * sin(azimuth * 2.0 * PI * 31.0 + drift * 2.1), 10.0);
        float braidedRays = (1.0 - smoothstep(0.035, 0.12, abs(elevation - pathB)))
          * pow(abs(sin(azimuth * 2.0 * PI * 21.0 - drift * 1.4 + elevation * 18.0)), 8.0);
        float broadBreaks = smoothstep(
          0.24,
          0.72,
          0.5 + 0.5 * sin(azimuth * 2.0 * PI * 3.25 - drift + sin(azimuth * 13.0) * 0.6)
        );
        float secondaryBreaks = smoothstep(
          0.16,
          0.66,
          0.5 + 0.5 * sin(azimuth * 2.0 * PI * 5.7 + 2.1)
        );
        float horizon = smoothstep(0.23, 0.34, elevation);
        float zenith = 1.0 - smoothstep(0.9, 0.995, elevation);
        float shape = ribbonA * 0.86
          + ribbonB * 0.74
          + ribbonC * 0.58
          + hangingRays * 0.66
          + braidedRays * 0.36
          + downwardVeil * (0.08 + fineRays * 0.52) * 0.42;
        float canopyPulse = 0.5 + 0.5 * sin(
          azimuth * 2.0 * PI * 7.4
          + sin(azimuth * 2.0 * PI * 1.6 - drift) * 1.1
          + drift * 0.7
        );
        shape = max(shape, canopyRibbon * (0.2 + canopyPulse * 0.28));
        // Preserve genuine dark sky between folds, while keeping total
        // exposure within a narrow range around all authored azimuths. The
        // earlier wide multipliers made one camera nearly blank and another
        // a solid green flood.
        shape *= horizon * zenith * mix(0.56, 0.94, broadBreaks) * mix(0.72, 1.0, secondaryBreaks);
        float darkLane = 1.0 - smoothstep(
          0.88,
          0.995,
          0.5 + 0.5 * sin(elevation * 45.0 + azimuth * 2.0 * PI * 7.0 - drift * 0.7)
        );
        shape *= mix(0.48, 1.0, darkLane);
        float colorPhase = 0.5 + 0.5 * sin(azimuth * 2.0 * PI * 2.0 + elevation * 5.0 - drift);
        // Give each fold a stable color identity. The previous continuous mix
        // let cyan dominate tone mapping even when the blue and violet paths
        // were geometrically separate.
        float canopyGreen = smoothstep(0.05, 0.62, 0.5 + 0.5 * sin(azimuth * 2.0 * PI * 1.1 + 0.4));
        float canopyViolet = smoothstep(0.68, 0.96, 0.5 + 0.5 * sin(azimuth * 2.0 * PI * 2.35 - 1.1));
        float greenWeight = ribbonA * 0.94 + downwardVeil * (0.16 + fineRays * 0.32)
          + canopyRibbon * mix(0.32, 0.72, canopyGreen);
        float blueWeight = ribbonB * (0.92 + braidedRays * 0.34)
          + hangingRays * smoothstep(0.42, 0.9, colorPhase) * 0.26
          + canopyRibbon * (0.54 - canopyViolet * 0.18);
        float violetPocket = smoothstep(
          0.72,
          0.98,
          0.5 + 0.5 * sin(azimuth * 2.0 * PI * 5.3 + elevation * 12.0 - drift * 0.6)
        );
        float violetWeight = ribbonC * (1.04 + violetPocket * 0.42)
          + ribbonB * violetPocket * 0.18
          + canopyRibbon * canopyViolet * 0.46;
        float colorWeight = max(0.001, greenWeight + blueWeight + violetWeight);
        vec3 color = (
          uColorA * greenWeight
          + uColorB * blueWeight
          + uColorC * violetWeight
        ) / colorWeight;
        color += uColorA * hangingRays * 0.12;
        // Concentrate luminance in the actual folded ribbons. Semi-transparent
        // tails remain visible, but no azimuth is allowed to become a flat
        // green backdrop merely because several veils overlap there.
        float foldedAlpha = pow(min(0.9, shape * 1.16), 1.18);
        gl_FragColor = vec4(color * 1.27, foldedAlpha * uOpacity);
      }
    `,
  });
  const dome = new THREE.Mesh(geometry, material);
  dome.name = 'ISLAND_15_AURORA_360_SKY_DOME';
  dome.frustumCulled = false;
  dome.visible = false;
  dome.renderOrder = -20;
  dome.userData.island15AuroraSkyCoverage = '360-degree-inside-view';
  dome.userData.island15DarkSkyBreaks = true;
  dome.userData.island15SkyDomeRadius = 58;
  dome.userData.island15AuroraForms = ['broad-wave', 'braided-rays', 'violet-pockets'];
  dome.userData.island15AuroraRayStriation = 'hanging-and-braided-separated-folds';
  return { dome, material };
}

export interface Island15AuroraPhase {
  phase: 'absent' | 'local-onset' | 'sky-expansion' | 'full-sky' | 'fade';
  intensity: number;
  coverage: number;
  paletteMix: number;
}

export function resolveIsland15AuroraPhase(elapsed: number): Island15AuroraPhase {
  const cycle = 90;
  const time = ((elapsed % cycle) + cycle) % cycle;
  const paletteMix = time / cycle;
  if (time < 34) return { phase: 'absent', intensity: 0, coverage: 0, paletteMix };
  if (time < 46) {
    const progress = THREE.MathUtils.smoothstep((time - 34) / 12, 0, 1);
    return { phase: 'local-onset', intensity: progress * 0.72, coverage: 0.14 + progress * 0.28, paletteMix };
  }
  if (time < 58) {
    const progress = THREE.MathUtils.smoothstep((time - 46) / 12, 0, 1);
    return { phase: 'sky-expansion', intensity: 0.72 + progress * 0.28, coverage: 0.42 + progress * 0.58, paletteMix };
  }
  if (time < 76) {
    const activeProgress = (time - 58) / 18;
    return { phase: 'full-sky', intensity: 0.96 + Math.sin(activeProgress * Math.PI * 2) * 0.04, coverage: 1, paletteMix };
  }
  const fade = 1 - THREE.MathUtils.smoothstep((time - 76) / 14, 0, 1);
  return { phase: 'fade', intensity: fade, coverage: 0.5 + fade * 0.5, paletteMix };
}

export function resolveIsland15AuroraOpacity(elapsed: number, index: number) {
  const phase = resolveIsland15AuroraPhase(elapsed);
  if (phase.intensity <= 0 || phase.coverage <= 0) return 0;
  const activationStart = Math.min(0.82, index * 0.12);
  const layerActivation = THREE.MathUtils.smoothstep(
    (phase.coverage - activationStart) / Math.max(0.18, 1 - activationStart),
    0,
    1,
  );
  const opacityCeiling = resolveIsland15AuroraCurtainComposition(index, 7).opacityCeiling;
  return Math.min(opacityCeiling, phase.intensity * layerActivation * opacityCeiling);
}

function addCastleConnector(
  root: THREE.Group,
  target: readonly [number, number, number],
  materials: Island15CrystalGlacierMaterials,
  index: number,
) {
  const start = new THREE.Vector3(target[0] * 0.33, 0.52, target[2] * 0.33);
  const end = new THREE.Vector3(target[0] * 0.72, 0.52, target[2] * 0.72);
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  const length = start.distanceTo(end) + 0.9;
  const angle = Math.atan2(end.x - start.x, end.z - start.z);
  const bridge = new THREE.Group();
  bridge.name = `ISLAND_15_CASTLE_WING_CONNECTOR_${index + 1}`;
  bridge.position.copy(midpoint);
  bridge.rotation.y = angle;
  addBox(bridge, `ISLAND_15_CONNECTOR_${index + 1}_DECK`, [1.08, 0.22, length], [0, 0, 0], materials.castleShadow);
  addBox(bridge, `ISLAND_15_CONNECTOR_${index + 1}_LEFT_RAIL`, [0.12, 0.54, length], [-0.52, 0.34, 0], materials.crystal);
  addBox(bridge, `ISLAND_15_CONNECTOR_${index + 1}_RIGHT_RAIL`, [0.12, 0.54, length], [0.52, 0.34, 0], materials.crystal);
  const archCount = 3;
  for (let arch = 0; arch < archCount; arch += 1) {
    const z = THREE.MathUtils.lerp(-length * 0.36, length * 0.36, arch / (archCount - 1));
    addCrystal(bridge, `ISLAND_15_CONNECTOR_${index + 1}_ARCH_LEFT_${arch + 1}`, [-0.55, 0.88, z], [0.25, 0.82, 0.25], materials.crystalGlow, 5).rotation.z = -0.22;
    addCrystal(bridge, `ISLAND_15_CONNECTOR_${index + 1}_ARCH_RIGHT_${arch + 1}`, [0.55, 0.88, z], [0.25, 0.82, 0.25], materials.crystalGlow, 5).rotation.z = 0.22;
  }
  root.add(bridge);
}

function createGlacierPlate(materials: Island15CrystalGlacierMaterials, profile: Island3DQualityProfile) {
  const group = new THREE.Group();
  group.name = 'ISLAND_15_GLACIER_TERRAIN';
  const segments = Math.max(12, profile.terrainSegments);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(7.6, 7.05, 0.82, segments), materials.ice);
  crown.name = 'ISLAND_15_GLACIER_CROWN';
  crown.scale.z = 0.88;
  crown.position.y = -0.16;
  crown.castShadow = true;
  crown.receiveShadow = true;
  const roughenRim = (geometry: THREE.BufferGeometry, strength: number, phase: number) => {
    const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const z = positions.getZ(index);
      const radius = Math.hypot(x, z);
      if (radius < 0.2) continue;
      const angle = Math.atan2(z, x);
      const variation = 1
        + Math.sin(angle * 5 + phase) * strength
        + Math.sin(angle * 9 - phase * 0.7) * strength * 0.56
        + Math.sin(angle * 13 + 1.9) * strength * 0.24;
      positions.setX(index, x * variation);
      positions.setZ(index, z * variation);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  };
  roughenRim(crown.geometry, 0.052, 0.35);
  group.add(crown);
  const snow = new THREE.Mesh(new THREE.CylinderGeometry(7.35, 7.35, 0.2, segments), materials.snow);
  snow.name = 'ISLAND_15_SNOW_CAP';
  snow.scale.z = 0.87;
  snow.position.y = 0.31;
  snow.receiveShadow = true;
  roughenRim(snow.geometry, 0.048, 0.72);
  group.add(snow);
  const under = new THREE.Mesh(new THREE.CylinderGeometry(6.9, 3.2, 3.8, segments), materials.deepIce);
  under.name = 'ISLAND_15_GLACIER_UNDERBODY';
  under.scale.z = 0.82;
  under.position.y = -2.42;
  under.castShadow = true;
  group.add(under);
  for (let index = 0; index < 16; index += 1) {
    const angle = index / 16 * Math.PI * 2;
    const radius = 4.2 + (index % 3) * 0.55;
    const shard = addCrystal(
      group,
      `ISLAND_15_UNDERCRYSTAL_${index + 1}`,
      [Math.cos(angle) * radius, -4.45 - (index % 4) * 0.3, Math.sin(angle) * radius * 0.82],
      [0.95 + (index % 2) * 0.32, 1.6 + (index % 5) * 0.22, 0.95 + (index % 2) * 0.32],
      index % 4 === 0 ? materials.crystalGlow : materials.crystal,
      6,
    );
    shard.rotation.z = Math.sin(angle) * 0.28;
  }
  registerIsland15RuntimePart('glacier-terrain', crown, 'terrain/glacier');
  registerIsland15RuntimePart('glacier-undercrystals', under, 'terrain/undercrystals');
  return group;
}

function addSceneryFields(root: THREE.Group, materials: Island15CrystalGlacierMaterials, profile: Island3DQualityProfile) {
  const treeCount = profile.id === 'high' ? 28 : profile.id === 'medium' ? 20 : 12;
  const treeTrunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.1, 0.7, 5), materials.castleShadow, treeCount);
  const treeCrowns = new THREE.InstancedMesh(new THREE.ConeGeometry(0.34, 1.2, 7), materials.pine, treeCount);
  const treeSnow = new THREE.InstancedMesh(new THREE.ConeGeometry(0.26, 0.62, 7), materials.pineSnow, treeCount);
  treeTrunks.name = 'ISLAND_15_EVERGREEN_TRUNKS';
  treeCrowns.name = 'ISLAND_15_EVERGREEN_CROWNS';
  treeSnow.name = 'ISLAND_15_EVERGREEN_SNOW';
  const dummy = new THREE.Object3D();
  for (let index = 0; index < treeCount; index += 1) {
    const angle = index / treeCount * Math.PI * 2 + Math.sin(index * 2.7) * 0.18;
    const radius = 7.28 + (index % 4) * 0.1;
    const scale = 0.58 + (index % 5) * 0.07;
    dummy.position.set(Math.cos(angle) * radius, 0.54, Math.sin(angle) * radius * 0.86);
    dummy.scale.setScalar(scale);
    dummy.rotation.y = angle;
    dummy.updateMatrix();
    treeTrunks.setMatrixAt(index, dummy.matrix);
    dummy.position.y = 1.24 * scale;
    dummy.updateMatrix();
    treeCrowns.setMatrixAt(index, dummy.matrix);
    dummy.position.y = 1.52 * scale;
    dummy.scale.setScalar(scale * 0.88);
    dummy.updateMatrix();
    treeSnow.setMatrixAt(index, dummy.matrix);
  }
  [treeTrunks, treeCrowns, treeSnow].forEach((mesh) => {
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    root.add(mesh);
  });
  registerIsland15RuntimePart('evergreen-field', treeCrowns, 'scenery/evergreens');

  const crystalCount = profile.id === 'high' ? 18 : profile.id === 'medium' ? 12 : 8;
  const crystals = new THREE.InstancedMesh(new THREE.ConeGeometry(0.2, 1.05, 6), materials.crystalGlow, crystalCount);
  crystals.name = 'ISLAND_15_CRYSTAL_FIELD';
  for (let index = 0; index < crystalCount; index += 1) {
    const angle = index / crystalCount * Math.PI * 2 + 0.4;
    const radius = 7.0 + (index % 3) * 0.18;
    dummy.position.set(Math.cos(angle) * radius, 0.84, Math.sin(angle) * radius * 0.83);
    dummy.scale.set(0.7 + (index % 2) * 0.25, 0.7 + (index % 4) * 0.22, 0.7 + (index % 2) * 0.25);
    dummy.rotation.set(0, angle, Math.sin(index * 1.7) * 0.16);
    dummy.updateMatrix();
    crystals.setMatrixAt(index, dummy.matrix);
  }
  crystals.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  root.add(crystals);
  registerIsland15RuntimePart('crystal-field', crystals, 'scenery/crystals');
}

function createIsland15MountainRidgeGeometry(
  width: number,
  depth: number,
  height: number,
  phase: number,
) {
  const segments = 10;
  const vertices: number[] = [];
  const indices: number[] = [];
  const topIndex = (row: number, column: number) => row * (segments + 1) + column;
  for (let row = 0; row <= segments; row += 1) {
    const v = row / segments;
    const zNormalized = v * 2 - 1;
    for (let column = 0; column <= segments; column += 1) {
      const u = column / segments;
      const xNormalized = u * 2 - 1;
      const edge = Math.max(Math.abs(xNormalized), Math.abs(zNormalized));
      const envelope = 1 - THREE.MathUtils.smoothstep(edge, 0.62, 1);
      // The three authored phases now produce genuinely different crest
      // topologies: a wandering main spine, an offset secondary summit and a
      // phase-specific saddle. Instance transforms add variation after this;
      // they no longer have to disguise one repeated tent silhouette.
      const profileMorph = 0.5 + 0.5 * Math.sin(phase * 2.37);
      const ridgePath = Math.sin(xNormalized * (2.7 + profileMorph * 1.2) + phase) * (0.12 + profileMorph * 0.08)
        + Math.sin(xNormalized * (6.4 + profileMorph * 2.3) - phase * 0.7) * 0.055;
      const secondaryPath = -0.24 + Math.cos(xNormalized * 4.6 - phase * 1.3) * 0.12;
      const mainRidge = Math.exp(-Math.abs(zNormalized - ridgePath) * (2.45 + profileMorph * 0.75));
      const secondaryRidge = Math.exp(-Math.abs(zNormalized - secondaryPath) * 3.6)
        * (0.38 + profileMorph * 0.42);
      const ridgeFalloff = Math.max(mainRidge, secondaryRidge);
      const peakRhythm = 0.74
        + Math.sin((xNormalized + 1) * Math.PI * (1.35 + profileMorph * 0.62) + phase) * 0.17
        + Math.sin((xNormalized + 1) * Math.PI * (3.2 + profileMorph * 1.1) - phase) * 0.085;
      const saddleCenter = Math.sin(phase * 1.71) * 0.34;
      const saddle = 1 - Math.exp(-Math.pow((xNormalized - saddleCenter) / 0.2, 2)) * (0.1 + profileMorph * 0.12);
      const ledge = Math.max(0, Math.sin((zNormalized + 1) * Math.PI * (1.8 + profileMorph) + phase))
        * (0.04 + profileMorph * 0.045);
      const y = height * envelope * Math.max(0.1, peakRhythm) * saddle * (0.28 + ridgeFalloff * 0.72)
        + height * envelope * ledge;
      vertices.push(xNormalized * width * 0.5, y, zNormalized * depth * 0.5);
    }
  }
  for (let row = 0; row < segments; row += 1) {
    for (let column = 0; column < segments; column += 1) {
      const a = topIndex(row, column);
      const b = topIndex(row, column + 1);
      const c = topIndex(row + 1, column);
      const d = topIndex(row + 1, column + 1);
      indices.push(a, c, b, b, c, d);
    }
  }
  const perimeter: number[] = [];
  for (let column = 0; column <= segments; column += 1) perimeter.push(topIndex(0, column));
  for (let row = 1; row <= segments; row += 1) perimeter.push(topIndex(row, segments));
  for (let column = segments - 1; column >= 0; column -= 1) perimeter.push(topIndex(segments, column));
  for (let row = segments - 1; row > 0; row -= 1) perimeter.push(topIndex(row, 0));
  const bottomStart = vertices.length / 3;
  perimeter.forEach((index) => {
    vertices.push(vertices[index * 3], -0.42, vertices[index * 3 + 2]);
  });
  const bottomCenter = vertices.length / 3;
  vertices.push(0, -0.42, 0);
  perimeter.forEach((top, index) => {
    const nextIndex = (index + 1) % perimeter.length;
    const nextTop = perimeter[nextIndex];
    const bottom = bottomStart + index;
    const nextBottom = bottomStart + nextIndex;
    indices.push(top, bottom, nextTop, nextTop, bottom, nextBottom);
    indices.push(bottomCenter, nextBottom, bottom);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.userData.island15MountainFamily = 'irregular-multi-summit-ridge';
  geometry.userData.island15DominantPrimitive = false;
  geometry.userData.island15CrestTopology = `wandering-double-ridge-${phase.toFixed(2)}`;
  return geometry;
}

export function createIsland15CrystalGlacierLivingAmbience(
  scene: THREE.Scene,
  profile: Island3DQualityProfile,
  materials: Island15CrystalGlacierMaterials,
  water: THREE.Mesh,
): Island15CrystalGlacierAmbienceRuntime {
  const root = new THREE.Group();
  root.name = 'ISLAND_15_CRYSTAL_GLACIER_WORLD_ROOT';
  // Headless evidence tabs can throttle requestAnimationFrame, making a
  // wall-clock wait an unreliable way to sample the natural aurora cycle.
  // This selector is presentation-only QA authority: production keeps using
  // the unmodified elapsed-time schedules below, and reduced motion still
  // wins over the evidence sample so it can never force moving light on.
  const auroraEvidencePhase = typeof window === 'undefined'
    ? null
    : new URLSearchParams(window.location.search).get('island15AuroraEvidence');
  const auroraEvidenceOffset = typeof window === 'undefined'
    ? 0
    : Number(new URLSearchParams(window.location.search).get('island15AuroraEvidenceOffset') ?? 0);
  const sparkleEvidencePhase = typeof window === 'undefined'
    ? null
    : new URLSearchParams(window.location.search).get('island15SparkleEvidence');
  root.userData.sculptRuntime = {
    parts: [],
    sockets: {},
    colliders: [{ id: 'island-015-glacier', type: 'convex-hull', isTrigger: false }],
  };
  const glacierTerrain = buildIsland15GlacierTerrainPart(materials, profile);
  const retiredFivePadFoundation = glacierTerrain.getObjectByName(
    'ISLAND_15_CITADEL_MONUMENTAL_GLACIER_FOUNDATION',
  );
  retiredFivePadFoundation?.removeFromParent();
  glacierTerrain.userData.singleCitadelFoundationMode = 'v4-blockout-owned-central-plinth';
  glacierTerrain.userData.retiredFivePadFoundationMounted = false;
  root.add(glacierTerrain);
  registerIsland15RuntimePart(
    'glacier-terrain-mass',
    glacierTerrain,
    'island15/Island15GlacierTerrainPart',
  );
  addSceneryFields(root, materials, profile);

  // Retired V4 illustration retained only as a hidden QA reference during the V5 migration.
  // The live overview and room focuses are exclusively procedural 3D.
  // The retired 2D goal plates are preserved only in Gauntlet evidence. Keep
  // these detached comparison materials inert so the playable world never
  // fetches camera-facing castle art behind the production 3D asset.
  const heroTexture = new THREE.Texture();
  heroTexture.colorSpace = THREE.SRGBColorSpace;
  heroTexture.minFilter = THREE.LinearMipmapLinearFilter;
  heroTexture.magFilter = THREE.LinearFilter;
  const heroMaterial = new THREE.ShaderMaterial({
    name: 'ISLAND_15_CASTLE_HERO_V4_MATERIAL',
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    uniforms: { uMap: { value: heroTexture } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      varying vec2 vUv;
      void main() {
        vec4 sampled = texture2D(uMap, vUv);
        float hi = max(sampled.r, max(sampled.g, sampled.b));
        float lo = min(sampled.r, min(sampled.g, sampled.b));
        float saturation = hi - lo;
        float luma = dot(sampled.rgb, vec3(0.2126, 0.7152, 0.0722));
        float neutralBright = smoothstep(0.72, 0.84, luma) * (1.0 - smoothstep(0.035, 0.085, saturation));
        float alpha = 1.0 - neutralBright;
        if (alpha < 0.08) discard;
        gl_FragColor = vec4(sampled.rgb, alpha);
      }
    `,
  });
  const heroMatte = new THREE.Mesh(new THREE.PlaneGeometry(11.4, 11.4), heroMaterial);
  heroMatte.name = 'ISLAND_15_CASTLE_HERO_V4_OVERVIEW';
  heroMatte.position.set(0, 5.55, 0.18);
  heroMatte.renderOrder = 4;
  heroMatte.frustumCulled = false;
  heroMatte.visible = false;
  heroMatte.onBeforeRender = (_renderer, _scene, camera) => {
    heroMatte.quaternion.copy(camera.quaternion);
  };
  // Retired comparison plane stays detached from the playable scene graph.

  const frostNestTexture = new THREE.Texture();
  frostNestTexture.colorSpace = THREE.SRGBColorSpace;
  frostNestTexture.minFilter = THREE.LinearMipmapLinearFilter;
  frostNestTexture.magFilter = THREE.LinearFilter;
  const frostNestMaterial = new THREE.ShaderMaterial({
    name: 'ISLAND_15_FROST_NEST_V4_MATERIAL',
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
    uniforms: { uMap: { value: frostNestTexture } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      varying vec2 vUv;
      void main() {
        vec4 sampled = texture2D(uMap, vUv);
        float keyDistance = distance(sampled.rgb, vec3(0.0235, 0.0745, 0.1843));
        float keyed = smoothstep(0.085, 0.19, keyDistance);
        float edge = smoothstep(0.015, 0.075, vUv.x)
          * (1.0 - smoothstep(0.925, 0.985, vUv.x))
          * smoothstep(0.012, 0.07, vUv.y)
          * (1.0 - smoothstep(0.93, 0.99, vUv.y));
        float alpha = keyed * edge;
        if (alpha < 0.06) discard;
        gl_FragColor = vec4(sampled.rgb, alpha);
      }
    `,
  });
  const frostNestBackdropMaterial = new THREE.ShaderMaterial({
    name: 'ISLAND_15_FROST_NEST_V4_BACKDROP_MATERIAL',
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: {},
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      void main() {
        float sideFade = smoothstep(0.015, 0.1, vUv.x) * (1.0 - smoothstep(0.9, 0.985, vUv.x));
        float topFade = 1.0 - smoothstep(0.91, 0.995, vUv.y);
        gl_FragColor = vec4(0.0235, 0.0745, 0.1843, sideFade * topFade * 0.97);
      }
    `,
  });
  const frostNestBackdrop = new THREE.Mesh(new THREE.PlaneGeometry(4.72, 6.4), frostNestBackdropMaterial);
  frostNestBackdrop.name = 'ISLAND_15_FROST_NEST_V4_FOCUS_BACKDROP';
  frostNestBackdrop.position.set(-4.36, 0.2, -3.94);
  frostNestBackdrop.renderOrder = 4;
  frostNestBackdrop.frustumCulled = false;
  frostNestBackdrop.visible = false;
  frostNestBackdrop.onBeforeRender = (_renderer, _scene, camera) => {
    frostNestBackdrop.quaternion.copy(camera.quaternion);
  };
  // Retired comparison plane stays detached from the playable scene graph.

  const frostNestMatte = new THREE.Mesh(new THREE.PlaneGeometry(4.12, 4.58), frostNestMaterial);
  frostNestMatte.name = 'ISLAND_15_FROST_NEST_V4_FOCUS';
  frostNestMatte.position.set(-4.36, 1.42, -3.86);
  frostNestMatte.renderOrder = 5;
  frostNestMatte.frustumCulled = false;
  frostNestMatte.visible = false;
  frostNestMatte.onBeforeRender = (_renderer, _scene, camera) => {
    frostNestMatte.quaternion.copy(camera.quaternion);
  };
  // Retired comparison plane stays detached from the playable scene graph.
  const frostNestContactCollar = new THREE.Mesh(new THREE.CylinderGeometry(1.92, 2.02, 0.14, 32), materials.midnight);
  frostNestContactCollar.name = 'ISLAND_15_FROST_NEST_V4_CONTACT_COLLAR';
  frostNestContactCollar.position.set(-4.36, 0.3, -4.48);
  frostNestContactCollar.scale.z = 0.2;
  frostNestContactCollar.visible = false;
  const frostNestContactRim = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.045, 7, 40), materials.silver);
  frostNestContactRim.name = 'ISLAND_15_FROST_NEST_V4_CONTACT_RIM';
  frostNestContactRim.position.set(-4.36, 0.38, -4.48);
  frostNestContactRim.rotation.x = Math.PI * 0.5;
  frostNestContactRim.scale.y = 0.2;
  frostNestContactRim.visible = false;

  const additionalRoomFocusSpecs = [
    {
      id: 'habit',
      asset: ISLAND_15_CRYSTAL_GLACIER_ASSET_PATHS.iceBastionFocus,
      position: [4.36, 1.4, -3.86] as const,
      target: [4.36, -3.9] as const,
      rootName: 'ISLAND_15_HABIT_ROOM_ROOT',
      size: [4.14, 4.58] as const,
    },
    {
      id: 'wisdom',
      asset: ISLAND_15_CRYSTAL_GLACIER_ASSET_PATHS.crystalOracleLibraryFocus,
      position: [-4.36, 1.4, 3.86] as const,
      target: [-4.36, 3.9] as const,
      rootName: 'ISLAND_15_WISDOM_ROOM_ROOT',
      size: [4.14, 4.58] as const,
    },
    {
      id: 'event',
      asset: ISLAND_15_CRYSTAL_GLACIER_ASSET_PATHS.auroraObservatoryFocus,
      position: [4.36, 1.4, 3.86] as const,
      target: [4.36, 3.9] as const,
      rootName: 'ISLAND_15_EVENT_ROOM_ROOT',
      size: [4.14, 4.58] as const,
    },
    {
      id: 'boss',
      asset: ISLAND_15_CRYSTAL_GLACIER_ASSET_PATHS.frozenThroneFocus,
      position: [0, 1.46, 0.08] as const,
      target: [0, 0] as const,
      rootName: 'ISLAND_15_BOSS_ROOM_ROOT',
      size: [6.15, 6.9] as const,
    },
  ] as const;
  const additionalRoomFocusPresentations = additionalRoomFocusSpecs.map((spec) => {
    const texture = new THREE.Texture();
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    const material = frostNestMaterial.clone();
    material.name = `ISLAND_15_${spec.id.toUpperCase()}_V4_FOCUS_MATERIAL`;
    material.uniforms.uMap.value = texture;
    const backdropMaterial = frostNestBackdropMaterial.clone();
    backdropMaterial.name = `ISLAND_15_${spec.id.toUpperCase()}_V4_BACKDROP_MATERIAL`;
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(spec.size[0] + 0.6, spec.size[1] + 1.8), backdropMaterial);
    backdrop.name = `ISLAND_15_${spec.id.toUpperCase()}_V4_FOCUS_BACKDROP`;
    backdrop.position.set(spec.position[0], spec.position[1] - 1.18, spec.position[2] - 0.08);
    backdrop.renderOrder = 4;
    backdrop.frustumCulled = false;
    backdrop.visible = false;
    backdrop.onBeforeRender = (_renderer, _scene, camera) => backdrop.quaternion.copy(camera.quaternion);
    const matte = new THREE.Mesh(new THREE.PlaneGeometry(spec.size[0], spec.size[1]), material);
    matte.name = `ISLAND_15_${spec.id.toUpperCase()}_V4_FOCUS`;
    matte.position.set(spec.position[0], spec.position[1], spec.position[2]);
    matte.renderOrder = 5;
    matte.frustumCulled = false;
    matte.visible = false;
    matte.onBeforeRender = (_renderer, _scene, camera) => matte.quaternion.copy(camera.quaternion);
    return { ...spec, backdrop, matte };
  });

  const mountainClusterCount = profile.id === 'high' ? 24 : profile.id === 'medium' ? 20 : 16;
  const mountainFarMaterial = materials.castle.clone();
  mountainFarMaterial.name = 'ISLAND_15_DISTANCE_HAZE_RIDGE_MATERIAL';
  mountainFarMaterial.color.set(0x9dbccc);
  mountainFarMaterial.roughness = 0.9;
  mountainFarMaterial.bumpScale = 0.012;
  const mountainMidMaterial = materials.deepIce.clone();
  mountainMidMaterial.name = 'ISLAND_15_MID_RIDGE_MATERIAL';
  mountainMidMaterial.color.set(0x4b7189);
  mountainMidMaterial.roughness = 0.54;
  mountainMidMaterial.transmission = 0.025;
  const mountainNearMaterial = materials.ice.clone();
  mountainNearMaterial.name = 'ISLAND_15_NEAR_FOOTHILL_MATERIAL';
  mountainNearMaterial.color.set(0xb7dde2);
  mountainNearMaterial.roughness = 0.46;
  mountainNearMaterial.transmission = 0.09;
  const mountainMainPeaks = new THREE.InstancedMesh(
    createIsland15MountainRidgeGeometry(5.5, 3.5, 8.2, 0.37),
    mountainFarMaterial,
    mountainClusterCount,
  );
  const mountainShoulders = new THREE.InstancedMesh(
    createIsland15MountainRidgeGeometry(4.6, 3.2, 5.7, 1.83),
    mountainMidMaterial,
    mountainClusterCount,
  );
  const mountainFoothills = new THREE.InstancedMesh(
    createIsland15MountainRidgeGeometry(6.8, 4.8, 4.2, 3.16),
    mountainNearMaterial,
    mountainClusterCount,
  );
  mountainMainPeaks.name = 'ISLAND_15_DISTANT_MOUNTAIN_MAIN_PEAKS';
  mountainShoulders.name = 'ISLAND_15_DISTANT_MOUNTAIN_SHOULDERS';
  mountainFoothills.name = 'ISLAND_15_DISTANT_MOUNTAIN_FOOTHILLS';
  const mountainDummy = new THREE.Object3D();
  for (let index = 0; index < mountainClusterCount; index += 1) {
    const ring = index % 2;
    const angle = index / mountainClusterCount * Math.PI * 2
      + 0.13
      + ring * Math.PI / mountainClusterCount
      + Math.sin(index * 4.23 + ring) * 0.11;
    const radius = 22.4
      + ring * 6.1
      + Math.sin(index * 2.17 + 0.6) * 1.7
      + Math.sin(index * 0.71) * 0.85;
    const southGapDistance = Math.abs(Math.atan2(Math.sin(angle - Math.PI * 0.5), Math.cos(angle - Math.PI * 0.5)));
    const quietVistaScale = southGapDistance < 0.38 ? 0.52 : southGapDistance < 0.7 ? 0.76 : 1;
    const heightClass = 0.9
      + Math.sin(index * 1.91 + 0.4) * 0.2
      + Math.sin(index * 0.63 - 0.8) * 0.11;
    const scale = heightClass * quietVistaScale;
    const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const tangent = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle));

    const mainPosition = radial.clone().multiplyScalar(radius + 1.65 + Math.sin(index * 1.19) * 0.8);
    mountainDummy.position.set(mainPosition.x, -4.08 + Math.sin(index * 0.83) * 0.42, mainPosition.z);
    mountainDummy.scale.set(
      scale * (0.84 + (0.5 + 0.5 * Math.sin(index * 2.47)) * 0.28),
      scale,
      scale * (0.82 + (0.5 + 0.5 * Math.cos(index * 1.37)) * 0.24),
    );
    mountainDummy.rotation.y = -angle - Math.PI * 0.5 + Math.sin(index * 1.7) * 0.18;
    mountainDummy.updateMatrix();
    mountainMainPeaks.setMatrixAt(index, mountainDummy.matrix);

    const shoulderDirection = Math.sin(index * 3.17 + 0.4) >= 0 ? 1 : -1;
    const shoulderOffset = 1.65 + Math.abs(Math.sin(index * 1.31)) * 1.45;
    const shoulderPosition = radial.clone().multiplyScalar(radius - 1.05 + Math.cos(index * 1.53) * 0.65)
      .addScaledVector(tangent, shoulderDirection * shoulderOffset);
    mountainDummy.position.set(shoulderPosition.x, -3.46 + Math.cos(index * 1.11) * 0.34, shoulderPosition.z);
    mountainDummy.scale.set(
      scale * (0.96 + (0.5 + 0.5 * Math.sin(index * 1.69)) * 0.24),
      scale * (0.78 + (0.5 + 0.5 * Math.cos(index * 2.09)) * 0.26),
      scale * (0.84 + (0.5 + 0.5 * Math.sin(index * 0.97)) * 0.2),
    );
    mountainDummy.rotation.y = -angle - Math.PI * 0.5 - 0.26 + Math.sin(index * 1.13) * 0.22;
    mountainDummy.updateMatrix();
    mountainShoulders.setMatrixAt(index, mountainDummy.matrix);

    const foothillOffset = 1.1 + Math.abs(Math.cos(index * 1.73)) * 1.3;
    const foothillPosition = radial.clone().multiplyScalar(radius - 4.15 + Math.sin(index * 0.93) * 0.72)
      .addScaledVector(tangent, -shoulderDirection * foothillOffset);
    mountainDummy.position.set(foothillPosition.x, -2.68 + Math.sin(index * 1.43) * 0.28, foothillPosition.z);
    mountainDummy.scale.set(
      scale * (1.02 + (0.5 + 0.5 * Math.cos(index * 1.27)) * 0.34),
      scale * (0.58 + (0.5 + 0.5 * Math.sin(index * 1.79)) * 0.24),
      scale * (0.86 + (0.5 + 0.5 * Math.cos(index * 2.31)) * 0.26),
    );
    mountainDummy.rotation.y = -angle - Math.PI * 0.5 + 0.31 + Math.sin(index * 0.91) * 0.16;
    mountainDummy.updateMatrix();
    mountainFoothills.setMatrixAt(index, mountainDummy.matrix);
  }
  [mountainMainPeaks, mountainShoulders, mountainFoothills].forEach((mountains) => {
    mountains.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mountains.userData.island15MountainRingCount = 2;
    mountains.userData.island15MountainDepthBands = 3;
    mountains.userData.island15MountainClusterCount = mountainClusterCount;
    mountains.userData.island15CalmSouthVista = true;
  });
  // Two staggered rings of three-piece clusters overlap into one mountain
  // basin. The south/front sector stays lower, so the approach remains a
  // deliberate vista rather than an accidental missing-prop gap.
  root.add(mountainFoothills, mountainShoulders, mountainMainPeaks);
  registerIsland15RuntimePart('polar-sky', mountainMainPeaks, 'atmosphere/mountain-basin');

  // The floating terrain reaches roughly Y=-5.24. The previous waterline at
  // -0.8 hid almost all of that mass, flattening the island into a white disc.
  // Seat the ocean just beneath the tip so the glacier reads as a real volume.
  water.position.y = -5.72;
  const waterMaterial = water.material as THREE.MeshPhysicalMaterial;
  waterMaterial.color.set(0x174f78);
  waterMaterial.roughness = 0.16;
  waterMaterial.metalness = 0.12;
  waterMaterial.opacity = 0.9;

  const auroraCount = profile.id === 'low' ? 3 : profile.id === 'medium' ? 5 : 7;
  const auroras = Array.from({ length: auroraCount }, (_, index) => createAuroraCurtain(index, profile.id, auroraCount));
  const auroraSkyDome = createAuroraSkyDome(profile.id);
  auroras.forEach(({ curtain }) => root.add(curtain));
  root.add(auroraSkyDome.dome);
  if (auroras[0]) registerIsland15RuntimePart('aurora-system', auroras[0].curtain, 'atmosphere/aurora');

  // Two tightly ranged, shadow-free architectural lights let the shared
  // jewel materials read as layered crystal instead of flat blue paint. The
  // cold heart is kept above the nave while the warm light belongs only to
  // the great south doorway, preserving a clear route/entry hierarchy.
  const qualityLightScale = profile.id === 'high' ? 1 : profile.id === 'medium' ? 0.78 : 0.56;
  const crystalHeartLight = new THREE.PointLight(0x9ad8e6, 0.9 * qualityLightScale, 7.5, 2);
  crystalHeartLight.name = 'ISLAND_15_WORLD_CRYSTAL_HEART_LIGHT';
  crystalHeartLight.position.set(0, 4.25, -0.15);
  const greatDoorWarmth = new THREE.PointLight(0xffa56b, 1.15 * qualityLightScale, 4.8, 2);
  greatDoorWarmth.name = 'ISLAND_15_WORLD_GREAT_DOOR_WARMTH';
  greatDoorWarmth.position.set(0, 1.3, 2.62);
  const auroraSkyWash = new THREE.HemisphereLight(0x63ffd8, 0x493079, 0);
  auroraSkyWash.name = 'ISLAND_15_AURORA_SKY_WASH';
  const auroraEastBounce = new THREE.PointLight(0x52ffd0, 0, 34, 1.35);
  auroraEastBounce.name = 'ISLAND_15_AURORA_EAST_BOUNCE';
  auroraEastBounce.position.set(13, 10, 5);
  const auroraWestBounce = new THREE.PointLight(0x9574ff, 0, 34, 1.35);
  auroraWestBounce.name = 'ISLAND_15_AURORA_WEST_BOUNCE';
  auroraWestBounce.position.set(-13, 9, -5);
  root.add(crystalHeartLight, greatDoorWarmth, auroraSkyWash, auroraEastBounce, auroraWestBounce);

  const snowCount = profile.id === 'high' ? 180 : profile.id === 'medium' ? 110 : 56;
  const snowPositions = new Float32Array(snowCount * 3);
  for (let index = 0; index < snowCount; index += 1) {
    const theta = index * 2.399963;
    const radius = 1.8 + (index % 31) / 31 * 13;
    snowPositions[index * 3] = Math.cos(theta) * radius;
    snowPositions[index * 3 + 1] = 1 + (index * 37 % 100) / 100 * 10;
    snowPositions[index * 3 + 2] = Math.sin(theta) * radius;
  }
  const snowGeometry = new THREE.BufferGeometry();
  snowGeometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
  const snowMaterial = new THREE.PointsMaterial({ color: 0xe9fbff, size: 0.055, transparent: true, opacity: 0.46, depthWrite: false });
  const snow = new THREE.Points(snowGeometry, snowMaterial);
  snow.name = 'ISLAND_15_DRIFTING_SNOW';
  root.add(snow);
  registerIsland15RuntimePart('snow-atmosphere', snow, 'atmosphere/snow');

  // Crystal glints are an authored world-space layer rather than bloom painted
  // over the whole scene. The first band sits on the glacier crystal field;
  // the second rises through the palace's crystal-tower envelope. Independent
  // phases make the points wink instead of breathing in unison, while the
  // active aurora strengthens and recolors the same glints.
  const sparkleCount = profile.id === 'high' ? 72 : profile.id === 'medium' ? 46 : 28;
  const sparklePositions = new Float32Array(sparkleCount * 3);
  const sparklePhases = new Float32Array(sparkleCount);
  for (let index = 0; index < sparkleCount; index += 1) {
    const outerField = index < Math.floor(sparkleCount * 0.42);
    const theta = index * 2.399963 + (outerField ? 0.34 : 1.08);
    const radius = outerField
      ? 6.82 + (index % 5) * 0.11
      : 2.7 + (index * 7 % 19) / 19 * 3.25;
    sparklePositions[index * 3] = Math.cos(theta) * radius;
    sparklePositions[index * 3 + 1] = outerField
      ? 1.04 + (index % 7) * 0.19
      : 2.55 + (index * 11 % 29) / 29 * 6.15;
    sparklePositions[index * 3 + 2] = Math.sin(theta) * radius * (outerField ? 0.84 : 0.92);
    sparklePhases[index] = index * 1.618034 + (index % 4) * 0.73;
  }
  let sparkleAnchorHash = 2166136261;
  for (let index = 0; index < sparklePositions.length; index += 1) {
    sparkleAnchorHash ^= Math.round(sparklePositions[index] * 1000) + index * 31;
    sparkleAnchorHash = Math.imul(sparkleAnchorHash, 16777619);
  }
  const sparkleAnchorSignature = (sparkleAnchorHash >>> 0).toString(16).padStart(8, '0');
  const sparkleGeometry = new THREE.BufferGeometry();
  sparkleGeometry.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));
  sparkleGeometry.setAttribute('aPhase', new THREE.BufferAttribute(sparklePhases, 1));
  const sparkleMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uAuroraStrength: { value: 0 },
      uOpacity: { value: 0.5 },
    },
    vertexShader: `
      attribute float aPhase;
      uniform float uTime;
      uniform float uAuroraStrength;
      varying float vPulse;
      varying float vHue;
      void main() {
        float wave = 0.5 + 0.5 * sin(uTime * (1.65 + mod(aPhase, 0.83)) + aPhase * 4.1);
        vPulse = pow(wave, 9.0);
        vHue = fract(aPhase * 0.3183099 + uTime * 0.006);
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewPosition;
        float perspective = clamp(18.0 / max(1.0, -viewPosition.z), 0.7, 2.15);
        gl_PointSize = (1.7 + vPulse * 4.1 + uAuroraStrength * 1.15) * perspective;
      }
    `,
    fragmentShader: `
      uniform float uAuroraStrength;
      uniform float uOpacity;
      varying float vPulse;
      varying float vHue;
      void main() {
        vec2 point = gl_PointCoord - 0.5;
        float core = 1.0 - smoothstep(0.045, 0.2, length(point));
        float verticalRay = (1.0 - smoothstep(0.018, 0.095, abs(point.x)))
          * (1.0 - smoothstep(0.12, 0.5, abs(point.y)));
        float horizontalRay = (1.0 - smoothstep(0.018, 0.095, abs(point.y)))
          * (1.0 - smoothstep(0.12, 0.5, abs(point.x)));
        float alpha = max(core, max(verticalRay, horizontalRay) * 0.72)
          * (0.018 + vPulse * 0.982) * uOpacity;
        if (alpha < 0.02) discard;
        vec3 cyan = vec3(0.52, 1.0, 0.96);
        vec3 violet = vec3(0.68, 0.55, 1.0);
        vec3 rose = vec3(1.0, 0.48, 0.88);
        vec3 color = mix(cyan, violet, smoothstep(0.28, 0.66, vHue));
        color = mix(color, rose, smoothstep(0.72, 0.96, vHue) * (0.35 + uAuroraStrength * 0.35));
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });
  const crystalSparkles = new THREE.Points(sparkleGeometry, sparkleMaterial);
  crystalSparkles.name = 'ISLAND_15_CRYSTAL_SPARKLE_FIELD';
  crystalSparkles.frustumCulled = false;
  crystalSparkles.userData.island15CrystalSparkle = 'independent-world-space-glints';
  crystalSparkles.userData.island15SparkleAnchorSpace = 'island-world';
  crystalSparkles.userData.island15SparkleCameraRelative = false;
  crystalSparkles.userData.island15SparkleAnchorSignature = sparkleAnchorSignature;
  root.add(crystalSparkles);
  registerIsland15RuntimePart('crystal-sparkles', crystalSparkles, 'atmosphere/crystal-sparkles');

  const animated = new Map<string, THREE.Object3D>();
  const colorPairs = [
    [new THREE.Color(0x43ffd0), new THREE.Color(0x758cff), new THREE.Color(0xff6bd8)],
    [new THREE.Color(0x44e8ff), new THREE.Color(0xa56cff), new THREE.Color(0xf56fca)],
    [new THREE.Color(0x72ffb7), new THREE.Color(0xed70ff), new THREE.Color(0x5f8cff)],
  ] as const;
  const colorScratchA = new THREE.Color();
  const colorScratchB = new THREE.Color();
  const colorScratchC = new THREE.Color();
  const auroraTint = new THREE.Color();
  const auroraAccent = new THREE.Color();
  const baseMaterialColors = {
    snow: materials.snow.color.clone(),
    ice: materials.ice.color.clone(),
    deepIce: materials.deepIce.color.clone(),
    castle: materials.castle.color.clone(),
    castleShadow: materials.castleShadow.color.clone(),
    crystal: materials.crystal.color.clone(),
    heroCrystal: materials.heroCrystal.color.clone(),
    crystalGlow: materials.crystalGlow.color.clone(),
    violetCrystal: materials.violetCrystal.color.clone(),
    water: waterMaterial.color.clone(),
  };
  const baseMountainColors = {
    far: mountainFarMaterial.color.clone(),
    mid: mountainMidMaterial.color.clone(),
    near: mountainNearMaterial.color.clone(),
  };
  const baseCrystalEmissive = {
    crystal: materials.crystal.emissiveIntensity,
    heroCrystal: materials.heroCrystal.emissiveIntensity,
    crystalGlow: materials.crystalGlow.emissiveIntensity,
    violetCrystal: materials.violetCrystal.emissiveIntensity,
  };
  const roomCutaways = new Map<string, Island15RoomCutawayRuntime>();
  let lastAnimationElapsed = 0;
  let cutawayReducedMotion = false;
  const collectRoomCutaways = () => {
    if (roomCutaways.size >= 4) return;
    scene.traverse((object) => {
      const runtime = object.userData.island15RoomCutawayRuntime as Island15RoomCutawayRuntime | undefined;
      if (runtime) roomCutaways.set(object.uuid, runtime);
    });
  };
  const animate = (elapsed: number) => {
    // Some WebGL hosts can invoke the first frame before their clock has
    // produced a finite elapsed value. Keeping the presentation clock finite
    // prevents the aurora palette lookup from ever indexing with NaN.
    const safeElapsed = Number.isFinite(elapsed) ? elapsed : lastAnimationElapsed;
    const deltaSeconds = THREE.MathUtils.clamp(safeElapsed - lastAnimationElapsed, 0, 0.1);
    lastAnimationElapsed = safeElapsed;
    collectRoomCutaways();
    roomCutaways.forEach((cutaway) => cutaway.update(deltaSeconds, cutawayReducedMotion));
    if (!cutawayReducedMotion) {
      snow.rotation.y = safeElapsed * 0.006;
      snow.position.x = Math.sin(safeElapsed * 0.075) * 0.34;
      const positions = snow.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let index = 0; index < positions.count; index += 1) {
        const base = snowPositions[index * 3 + 1];
        positions.setY(index, ((base - safeElapsed * (0.12 + (index % 7) * 0.008) + 12) % 12));
      }
      positions.needsUpdate = true;
    }

    const auroraTime = auroraEvidencePhase === 'quiet'
      ? 0
      : auroraEvidencePhase === 'local'
        ? 40 + (Number.isFinite(auroraEvidenceOffset) ? auroraEvidenceOffset : 0)
        : auroraEvidencePhase === 'full' || auroraEvidencePhase === 'active'
          ? 65 + (Number.isFinite(auroraEvidenceOffset) ? auroraEvidenceOffset : 0)
          : safeElapsed;
    const auroraPhase = resolveIsland15AuroraPhase(auroraTime);
    let strongestAurora = 0;
    auroras.forEach(({ curtain, material }, index) => {
      const opacity = resolveIsland15AuroraOpacity(auroraTime, index);
      strongestAurora = Math.max(strongestAurora, opacity);
      curtain.visible = opacity > 0.004;
      // Reduced motion freezes deformation, not the natural appearance cycle:
      // the sky still has a genuine long dark interval instead of staying on.
      material.uniforms.uTime.value = cutawayReducedMotion ? index * 4.7 : auroraTime;
      // The schedule value remains deliberately restrained and reaches true
      // zero between events; boost only the rendered additive veil so an
      // active display reads as real northern light at phone scale.
      material.uniforms.uOpacity.value = Math.min(0.16, opacity * 0.8);
      const rawPalettePhase = auroraTime / (48 + index * 13) + index * 0.22;
      const palettePhase = ((rawPalettePhase % colorPairs.length) + colorPairs.length) % colorPairs.length;
      const from = Number.isFinite(palettePhase) ? Math.floor(palettePhase) : 0;
      const to = (from + 1) % colorPairs.length;
      const blend = THREE.MathUtils.smoothstep(palettePhase - from, 0, 1);
      const fromColors = colorPairs[from] ?? colorPairs[0];
      const toColors = colorPairs[to] ?? colorPairs[1];
      material.uniforms.uColorA.value.copy(colorScratchA.copy(fromColors[0]).lerp(toColors[0], blend));
      material.uniforms.uColorB.value.copy(colorScratchB.copy(fromColors[1]).lerp(toColors[1], blend));
      material.uniforms.uColorC.value.copy(colorScratchC.copy(fromColors[2]).lerp(toColors[2], blend));
    });

    const auroraStrength = auroraPhase.intensity * auroraPhase.coverage;
    const sparkleEvidenceTime = sparkleEvidencePhase === 'phase-a'
      ? 11.2
      : sparkleEvidencePhase === 'phase-b'
        ? 12.05
        : null;
    const sparkleTime = cutawayReducedMotion
      ? 12.4
      : sparkleEvidenceTime ?? safeElapsed;
    sparkleMaterial.uniforms.uTime.value = sparkleTime;
    sparkleMaterial.uniforms.uAuroraStrength.value = auroraStrength;
    sparkleMaterial.uniforms.uOpacity.value = 0.48 + auroraStrength * 0.28;
    const sparkleEvidence = {
      requestedPhase: sparkleEvidencePhase,
      sampleTime: sparkleTime,
      anchorSignature: sparkleAnchorSignature,
      anchorSpace: 'island-world',
      cameraRelative: false,
      brightAnchorIndices: sparkleEvidencePhase
        ? Array.from(sparklePhases).flatMap((phase, index) => {
            const phaseRemainder = ((phase % 0.83) + 0.83) % 0.83;
            const wave = 0.5 + 0.5 * Math.sin(sparkleTime * (1.65 + phaseRemainder) + phase * 4.1);
            return Math.pow(wave, 9) > 0.35 ? [index] : [];
          })
        : [],
    };
    crystalSparkles.userData.island15SparkleEvidence = sparkleEvidence;
    if (typeof window !== 'undefined' && sparkleEvidencePhase) {
      (window as Window & { __ISLAND15_AMBIENCE_EVIDENCE__?: typeof sparkleEvidence })
        .__ISLAND15_AMBIENCE_EVIDENCE__ = sparkleEvidence;
    }
    const globalPalette = auroraPhase.paletteMix * colorPairs.length;
    const globalFrom = Math.floor(globalPalette) % colorPairs.length;
    const globalTo = (globalFrom + 1) % colorPairs.length;
    const globalBlend = THREE.MathUtils.smoothstep(globalPalette - Math.floor(globalPalette), 0, 1);
    auroraTint.copy(colorPairs[globalFrom][0]).lerp(colorPairs[globalTo][0], globalBlend);
    auroraAccent.copy(colorPairs[globalFrom][1]).lerp(colorPairs[globalTo][1], globalBlend);
    auroraSkyDome.dome.visible = auroraStrength > 0.004;
    auroraSkyDome.material.uniforms.uTime.value = cutawayReducedMotion ? 0 : auroraTime;
    auroraSkyDome.material.uniforms.uOpacity.value = Math.min(0.9, auroraStrength * 0.88);
    auroraSkyDome.material.uniforms.uColorA.value.copy(auroraTint);
    auroraSkyDome.material.uniforms.uColorB.value.copy(auroraAccent);
    auroraSkyDome.material.uniforms.uColorC.value.copy(
      colorPairs[globalFrom][2],
    ).lerp(colorPairs[globalTo][2], globalBlend);

    // The sky event illuminates the world as one system: horizon snow, water,
    // palace stone and every shared crystal material respond to the same phase.
    // At zero strength each material returns exactly to its authored base color.
    auroraSkyWash.intensity = auroraStrength * qualityLightScale * 1.05;
    auroraSkyWash.color.copy(auroraTint);
    auroraSkyWash.groundColor.copy(auroraAccent).multiplyScalar(0.24);
    auroraEastBounce.intensity = auroraStrength * qualityLightScale * 2.25;
    auroraWestBounce.intensity = auroraStrength * qualityLightScale * 1.85;
    auroraEastBounce.color.copy(auroraTint);
    auroraWestBounce.color.copy(auroraAccent);
    materials.snow.color.copy(baseMaterialColors.snow).lerp(auroraTint, auroraStrength * 0.055);
    materials.ice.color.copy(baseMaterialColors.ice).lerp(auroraTint, auroraStrength * 0.075);
    materials.deepIce.color.copy(baseMaterialColors.deepIce).lerp(auroraAccent, auroraStrength * 0.08);
    materials.castle.color.copy(baseMaterialColors.castle).lerp(auroraTint, auroraStrength * 0.115);
    materials.castleShadow.color.copy(baseMaterialColors.castleShadow).lerp(auroraAccent, auroraStrength * 0.15);
    materials.crystal.color.copy(baseMaterialColors.crystal).lerp(auroraTint, auroraStrength * 0.36);
    materials.heroCrystal.color.copy(baseMaterialColors.heroCrystal).lerp(auroraAccent, auroraStrength * 0.4);
    materials.crystalGlow.color.copy(baseMaterialColors.crystalGlow).lerp(auroraTint, auroraStrength * 0.42);
    materials.violetCrystal.color.copy(baseMaterialColors.violetCrystal).lerp(auroraAccent, auroraStrength * 0.38);
    waterMaterial.color.copy(baseMaterialColors.water).lerp(auroraAccent, auroraStrength * 0.07);
    mountainFarMaterial.color.copy(baseMountainColors.far).lerp(auroraTint, auroraStrength * 0.035);
    mountainMidMaterial.color.copy(baseMountainColors.mid).lerp(auroraAccent, auroraStrength * 0.055);
    mountainNearMaterial.color.copy(baseMountainColors.near).lerp(auroraTint, auroraStrength * 0.07);
    materials.crystal.emissiveIntensity = baseCrystalEmissive.crystal + auroraStrength * 0.48;
    materials.heroCrystal.emissiveIntensity = baseCrystalEmissive.heroCrystal + auroraStrength * 0.72;
    materials.crystalGlow.emissiveIntensity = baseCrystalEmissive.crystalGlow + auroraStrength * 0.82;
    materials.violetCrystal.emissiveIntensity = baseCrystalEmissive.violetCrystal + auroraStrength * 0.68;

    // A subtle breathing response helps luminous architecture feel inhabited;
    // reduced-motion holds the accepted static lighting state. Aurora activity
    // may tint the cold heart, but a fully quiet sky never leaves residual
    // aurora illumination behind.
    const lightPulse = cutawayReducedMotion ? 0 : Math.sin(safeElapsed * 0.42) * 0.04;
    crystalHeartLight.intensity = (0.9 + lightPulse + auroraStrength * 1.4) * qualityLightScale;
    greatDoorWarmth.intensity = (1.15 + (cutawayReducedMotion ? 0 : Math.sin(safeElapsed * 0.31 + 1.2) * 0.06)) * qualityLightScale;
    crystalHeartLight.color.setRGB(
      0.32 + strongestAurora * 0.42,
      0.91 - strongestAurora * 0.08,
      1,
      THREE.SRGBColorSpace,
    ).lerp(auroraTint, auroraStrength * 0.28);

    if (animated.size === 0) {
      scene.traverse((object) => {
        const key = object.userData.island15Animated as string | undefined;
        if (key) animated.set(object.uuid, object);
      });
    }
    const presentationElapsed = cutawayReducedMotion ? 0 : safeElapsed;
    animated.forEach((object) => {
      const key = String(object.userData.island15Animated);
      if (key === 'oracle') {
        object.rotation.y = presentationElapsed * 0.35;
        object.position.y = 0.94 + Math.sin(presentationElapsed * 0.8) * 0.08;
      } else if (key === 'oracle-halo') {
        object.rotation.z = presentationElapsed * 0.18;
      } else if (key === 'oracle-crown-halo') {
        object.rotation.x = Math.PI * 0.5;
        object.rotation.z = -presentationElapsed * 0.12;
      } else if (key.startsWith('oracle-memory-halo-')) {
        object.rotation.y = presentationElapsed * 0.14;
        object.rotation.z = Math.sin(presentationElapsed * 0.21) * 0.12;
      } else if (key.startsWith('oracle-page-')) {
        const pageIndex = Number(key.slice(-1));
        const baseY = Number(object.userData.island15BaseY ?? object.position.y);
        const baseRotationY = Number(object.userData.island15BaseRotationY ?? object.rotation.y);
        object.position.y = baseY + Math.sin(presentationElapsed * 0.72 + pageIndex * 1.7) * 0.055;
        object.rotation.y = baseRotationY + Math.sin(presentationElapsed * 0.31 + pageIndex) * 0.12;
      } else if (key === 'prism') {
        object.rotation.y = presentationElapsed * 0.48;
        object.rotation.x = Math.sin(presentationElapsed * 0.31) * 0.18;
        object.position.y = 1 + Math.sin(presentationElapsed * 0.62) * 0.1;
      } else if (key.startsWith('observatory-ring-')) {
        const ringIndex = Number(key.slice(-1));
        object.rotation.y = presentationElapsed * (0.11 + ringIndex * 0.05);
        object.rotation.z = presentationElapsed * (ringIndex % 2 ? -0.08 : 0.08);
      } else if (key === 'observatory-projector-beam') {
        const pulse = 0.94 + Math.sin(presentationElapsed * 0.52) * 0.06;
        object.scale.set(pulse, 1, pulse);
      } else if (key === 'observatory-lens') {
        object.rotation.y = presentationElapsed * -0.22;
        object.position.y = 2.12 + Math.sin(presentationElapsed * 0.46) * 0.05;
      } else if (key.startsWith('frost-egg-')) {
        const eggIndex = Number(key.slice(-1));
        const baseY = Number(object.userData.island15BaseY ?? object.position.y);
        const baseRotationY = Number(object.userData.island15BaseRotationY ?? object.rotation.y);
        object.position.y = baseY + Math.sin(presentationElapsed * 0.82 + eggIndex * 1.23) * 0.025;
        object.rotation.y = baseRotationY + Math.sin(presentationElapsed * 0.34 + eggIndex) * 0.08;
      } else if (key === 'frost-flame') {
        const baseScaleY = Number(object.userData.island15BaseScaleY ?? 1);
        object.scale.y = baseScaleY * (1 + Math.sin(presentationElapsed * 4.4) * 0.08);
        object.rotation.z = -0.18 + Math.sin(presentationElapsed * 2.7) * 0.055;
      } else if (key === 'bastion-discipline-ring') {
        object.rotation.z = presentationElapsed * 0.16;
      } else if (key.startsWith('bastion-weight-')) {
        const weightIndex = Number(key.slice(-1));
        const baseY = Number(object.userData.island15BaseY ?? object.position.y);
        object.position.y = baseY + Math.sin(presentationElapsed * 0.54 + weightIndex * Math.PI) * 0.045;
      } else if (key === 'throne-engine') {
        object.rotation.y = presentationElapsed * 0.24;
        object.position.y = 3.02 + Math.sin(presentationElapsed * 0.66) * 0.08;
      } else if (key === 'throne-chandelier') {
        object.rotation.y = presentationElapsed * -0.18;
        object.position.y = 2.66 + Math.sin(presentationElapsed * 0.52) * 0.06;
      } else if (key === 'throne-heart') {
        const baseScaleY = Number(object.userData.island15BaseScaleY ?? 1.55);
        object.rotation.y = presentationElapsed * 0.18;
        object.scale.y = baseScaleY * (1 + Math.sin(presentationElapsed * 0.44) * 0.04);
      }
    });
  };

  const evidenceParams = new URLSearchParams(window.location.search);
  const evidenceCutawayOverride = evidenceParams.get('island3dEvidence') === '1'
    ? evidenceParams.get('island15Cutaway')
    : null;
  scene.add(root);
  return {
    root,
    animate,
    updateView: (cameraPosition, cameraTarget, reducedMotion = false) => {
      cutawayReducedMotion = reducedMotion;
      // A sky shell is camera-relative. Keeping its centre on the active
      // authored camera guarantees the same 360-degree overhead coverage for
      // exterior hero shots, room approaches and interior navigation.
      auroraSkyDome.dome.position.copy(cameraPosition);
      // Stabilize the distant shell's authored exposure around camera azimuth:
      // every palace POV receives the same layered fold hierarchy instead of
      // one direction becoming a green wall while another sees almost nothing.
      // The lower physical curtains remain world-anchored, so camera travel
      // retains genuine parallax rather than turning the aurora into a flat HUD.
      const viewHeading = Math.atan2(
        (cameraTarget?.x ?? 0) - cameraPosition.x,
        (cameraTarget?.z ?? 0) - cameraPosition.z,
      );
      const heroHeading = Math.atan2(8.4, -26.2);
      auroraSkyDome.dome.rotation.y = viewHeading - heroHeading;
      const viewDirection = new THREE.Vector3(
        (cameraTarget?.x ?? 0) - cameraPosition.x,
        (cameraTarget?.y ?? 0) - cameraPosition.y,
        (cameraTarget?.z ?? 0) - cameraPosition.z,
      ).normalize();
      const heroDirectionY = (2.16 - 15.7) / Math.hypot(8.4, 2.16 - 15.7, -26.2);
      auroraSkyDome.material.uniforms.uElevationOffset.value = THREE.MathUtils.clamp(
        (heroDirectionY - viewDirection.y) * 0.5,
        -0.22,
        0.22,
      );
      auroraSkyDome.dome.userData.island15AzimuthExposureStabilized = true;
      auroraSkyDome.dome.userData.island15ElevationExposureStabilized = true;
      collectRoomCutaways();
      const frontFacing = cameraPosition.z >= 0;
      root.userData.cutawayFacing = frontFacing ? 'south' : 'north';
      const frostNestCameraDistance = Math.hypot(cameraPosition.x + 4.36, cameraPosition.z + 3.9);
      const frostNestIsNearestRoom = frostNestCameraDistance <= Math.min(
        Math.hypot(cameraPosition.x - 4.36, cameraPosition.z + 3.9),
        Math.hypot(cameraPosition.x + 4.36, cameraPosition.z - 3.9),
        Math.hypot(cameraPosition.x - 4.36, cameraPosition.z - 3.9),
      );
      const naturallyFocusedFrostNest = Boolean(
        cameraTarget && Math.hypot(cameraTarget.x + 4.36, cameraTarget.z + 3.9) < 1.5,
      ) || (cameraPosition.y < 12 && frostNestCameraDistance < 12 && frostNestIsNearestRoom);
      const frostNestFocused = evidenceCutawayOverride === 'open'
        ? naturallyFocusedFrostNest
        : evidenceCutawayOverride === 'closed'
          ? false
          : naturallyFocusedFrostNest;
      const additionalFocusStates = additionalRoomFocusPresentations.map((presentation) => ({
        presentation,
        focused: Boolean(
          cameraTarget
          && Math.hypot(cameraTarget.x - presentation.target[0], cameraTarget.z - presentation.target[1]) < 1.5
          && (presentation.id !== 'boss' || cameraPosition.y < 11),
        ),
      }));
      const bossFocused = additionalFocusStates.some(({ presentation, focused }) => presentation.id === 'boss' && focused);
      const satelliteRoomFocused = frostNestFocused || additionalFocusStates.some(
        ({ presentation, focused }) => presentation.id !== 'boss' && focused,
      );
      // Focus remains a room inside one connected citadel: terrain and circulation
      // never disappear into an empty blue void while a cutaway is open.
      // No camera-facing castle or room art is allowed in the playable presentation.
      heroMatte.visible = false;
      frostNestBackdrop.visible = false;
      frostNestMatte.visible = false;
      frostNestContactCollar.visible = false;
      frostNestContactRim.visible = false;
      applyIsland15BossRoomFocusVisibility(scene, bossFocused);
      [
        'ISLAND_5_CARETAKER_BOARD_LOD',
        'ISLAND_5_CARETAKER_FOOTPLATE',
        'ISLAND_5_CARETAKER_CONTACT_SHADOW',
        'ISLAND_5_CARETAKER_HIT_TARGET',
      ].forEach((name) => {
        const caretakerPresentation = scene.getObjectByName(name);
        if (caretakerPresentation) caretakerPresentation.visible = !bossFocused;
      });
      const setRoomCutawayOpen = (roomRoot: THREE.Object3D | undefined, open: boolean) => {
        const cutaway = roomRoot?.userData.island15RoomCutawayRuntime as Island15RoomCutawayRuntime | undefined;
        cutaway?.setOpen(open, reducedMotion);
      };
      const proceduralFrostNest = scene.getObjectByName('ISLAND_15_HATCHERY_ROOM_ROOT');
      if (proceduralFrostNest) {
        proceduralFrostNest.visible = true;
        // The focus presentation is an evidence-critical architectural state.
        // Apply the two explicitly owned occluders deterministically as well as
        // driving the eased cutaway runtime; this prevents a stale transition
        // frame from presenting a closed façade after the camera has arrived.
        const southFacade = proceduralFrostNest.getObjectByName('FROST_NEST_REMOVABLE_SOUTH_FACADE');
        const frontRoofOccluders = proceduralFrostNest.getObjectByName('FROST_NEST_REMOVABLE_FRONT_ROOF_OCCLUDERS');
        if (southFacade) southFacade.visible = !frostNestFocused;
        if (frontRoofOccluders) frontRoofOccluders.visible = !frostNestFocused;
        proceduralFrostNest.userData.island15CutawayEvidence = {
          open: frostNestFocused,
          southFacadeVisible: southFacade?.visible ?? null,
          frontRoofOccludersVisible: frontRoofOccluders?.visible ?? null,
        };
      }
      setRoomCutawayOpen(proceduralFrostNest, frostNestFocused);
      additionalFocusStates.forEach(({ presentation, focused }) => {
        presentation.backdrop.visible = false;
        presentation.matte.visible = false;
        const proceduralRoom = scene.getObjectByName(presentation.rootName);
        if (proceduralRoom) proceduralRoom.visible = true;
        if (presentation.id !== 'boss') setRoomCutawayOpen(proceduralRoom, focused);
      });
      const glacierTerrain = root.getObjectByName('ISLAND_15_GLACIER_TERRAIN_MASS');
      if (glacierTerrain) glacierTerrain.visible = true;
      [
        'ISLAND_15_EVERGREEN_TRUNKS',
        'ISLAND_15_EVERGREEN_CROWNS',
        'ISLAND_15_EVERGREEN_SNOW',
        'ISLAND_15_CRYSTAL_FIELD',
      ].forEach((name) => {
        const scenery = root.getObjectByName(name);
        // Terrain remains for physical context, but perimeter props are local
        // presentation occluders when a room is opened. Hiding them prevents
        // trees and loose field crystals from masquerading as room equipment.
        if (scenery) scenery.visible = !satelliteRoomFocused;
      });
    },
  };
}
