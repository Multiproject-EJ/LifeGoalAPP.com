import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type {
  Island3DQuality,
  Island3DQualityProfile,
  Island5LandmarkDefinition,
} from './island5ThreePilotContract';
import {
  ISLAND_3D_ROUTE_RADIUS,
  ISLAND_3D_TILE_RADIAL_DEPTH,
} from './island5ThreePilotContract';

export const ISLAND_10_ROOTHEART_WORLD_NAME = 'Rootheart Canopy City';
type BuildLevel = 0 | 1 | 2 | 3;

export const ISLAND_10_ROOTHEART_LANDMARK_LABELS = {
  boss: 'Rootheart Arena',
  hatchery: 'Acorn Cradle Hatchery',
  habit: 'Canopy Rhythm Lodge',
  wisdom: 'Spiralwood Library',
  event: 'Firefly Pulley Workshop',
} as const;

export interface Island10RootheartMaterials {
  bark: THREE.MeshStandardMaterial;
  barkLight: THREE.MeshStandardMaterial;
  timber: THREE.MeshStandardMaterial;
  timberDark: THREE.MeshStandardMaterial;
  bamboo: THREE.MeshStandardMaterial;
  rope: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  leaf: THREE.MeshStandardMaterial;
  leafLight: THREE.MeshStandardMaterial;
  seedShell: THREE.MeshPhysicalMaterial;
  sapglass: THREE.MeshPhysicalMaterial;
  lantern: THREE.MeshStandardMaterial;
  arenaFloor: THREE.MeshStandardMaterial;
  builderCloth: THREE.MeshStandardMaterial;
  waterMist: THREE.MeshPhysicalMaterial;
  firefly: THREE.PointsMaterial;
}

export interface Island10RootheartAmbienceRuntime {
  root: THREE.Group;
  animate: (elapsed: number) => void;
  updateView?: (cameraPosition: THREE.Vector3, cameraTarget?: THREE.Vector3) => void;
  updatePowerworksStage?: (presentation: Island10RootheartPowerworksPresentation) => void;
}

export interface Island10RootheartPowerworksPresentation {
  buildStage: 0 | 1 | 2 | 3;
  /** Optional 0..1 easing value while a newly funded stage assembles. */
  transitionProgress?: number;
  /** Monotonic local sequence used only to animate a newly funded stage. */
  constructionSequence?: number;
}

export const ISLAND_10_RUNTIME_PART_IDS = [
  'trunk-network',
  'primary-trunk-rear',
  'primary-trunk-left',
  'primary-trunk-right',
  'three-tree-frame',
  'board-underframe',
  'board-brace-array',
  'rootheart-arena',
  'arena-floor',
  'landmark-network',
  'route-integration',
  'ambient-canopy',
  'inhabitant-network',
  'ambience-system',
  'branch-support-network',
  'rope-railing-network',
  'bridge-network',
  'arena-root-braces',
  'arena-pylon-array',
  'hidden-guardian-socket',
  'acorn-cradle-hatchery',
  'acorn-hatchery',
  'canopy-rhythm-lodge',
  'rhythm-lodge',
  'spiralwood-library',
  'spiral-library',
  'firefly-pulley-workshop',
  'pulley-workshop',
  'hatchery-seed-shell',
  'hatchery-suspension-lines',
  'hatchery-nursery-pod-array',
  'rhythm-resonator-fan',
  'rhythm-drum-array',
  'library-helical-balcony',
  'library-archive-band-array',
  'library-observation-armillary',
  'workshop-crane-and-cargo',
  'workshop-waterwheel',
  'workshop-sapglass-vessels',
  'lantern-depth-array',
  'lantern-network',
  'hanging-garden-network',
  'waterfall-depth-layer',
  'builder-network',
  'bird-messenger-array',
  'firefly-pollen-field',
  'particle-field',
  'rootheart-powerworks',
  'powerworks-water-gate-array',
  'powerworks-heartwheel',
  'powerworks-transmission-array',
  'powerworks-heartlight-dynamo',
  'powerworks-capacitor-bank',
  'powerworks-cable-network',
  'powerworks-powered-light-network',
] as const;

type Island10RuntimePartId = typeof ISLAND_10_RUNTIME_PART_IDS[number];
interface Island10RuntimePart {
  id: Island10RuntimePartId;
  name: Island10RuntimePartId;
  kind: 'part';
  nodeName: string;
  module: string;
  triangles: number;
}

export function registerIsland10RuntimePart(
  id: Island10RuntimePartId,
  node: THREE.Object3D,
  module: string,
  triangles = 0,
): Island10RuntimePart {
  node.userData.partId = id;
  node.userData.partKind = 'part';
  node.userData.partModule = module;
  return { id, name: id, kind: 'part', nodeName: node.name, module, triangles };
}

export function collectIsland10RuntimePartManifest(roots: THREE.Object3D[]) {
  const parts: Island10RuntimePart[] = [];
  const seen = new Set<string>();
  let integralMeshes = 0;
  roots.forEach((root) => root.traverse((node) => {
    if (node instanceof THREE.Mesh || node instanceof THREE.InstancedMesh || node instanceof THREE.Points) integralMeshes += 1;
    const runtimeParts = node.userData.sculptRuntime?.parts;
    if (!Array.isArray(runtimeParts)) return;
    runtimeParts.forEach((candidate: Island10RuntimePart) => {
      if (!candidate?.name || !ISLAND_10_RUNTIME_PART_IDS.includes(candidate.name)) return;
      const key = `${candidate.name}:${candidate.nodeName}`;
      if (seen.has(key)) return;
      seen.add(key);
      parts.push({ ...candidate });
    });
  }));
  return { model: 'island-010-rootheart-canopy-city', parts, unnamedMeshes: 0, integralMeshes };
}

// Island 010 spends its budget on visible construction layers rather than
// perfectly round hidden cylinders. Twelve sides remain smooth at the locked
// phone camera and reserve geometry for the staged Powerworks engine.
const radialSegments = (quality: Island3DQuality) => quality === 'low' ? 9 : 12;
const qualityAmount = (quality: Island3DQuality, high: number, medium: number, low: number) => quality === 'high' ? high : quality === 'medium' ? medium : low;
export const ISLAND_10_ROUTE_CLEARANCE_INNER_RADIUS = ISLAND_3D_ROUTE_RADIUS - ISLAND_3D_TILE_RADIAL_DEPTH / 2 - 0.24;
export const ISLAND_10_ROUTE_CLEARANCE_OUTER_RADIUS = ISLAND_3D_ROUTE_RADIUS + ISLAND_3D_TILE_RADIAL_DEPTH / 2 + 0.24;

export function isIsland10RouteCorridorClear(x: number, z: number, footprintRadius = 0): boolean {
  const distance = Math.hypot(x, z);
  const footprint = Math.max(0, footprintRadius);
  return distance + footprint <= ISLAND_10_ROUTE_CLEARANCE_INNER_RADIUS
    || distance - footprint >= ISLAND_10_ROUTE_CLEARANCE_OUTER_RADIUS;
}

function cylinder(radiusTop: number, radiusBottom: number, height: number, material: THREE.Material, segments = 16) {
  return new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
}

function box(width: number, height: number, depth: number, material: THREE.Material) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
}

function sphere(radius: number, material: THREE.Material, segments = 12) {
  return new THREE.Mesh(new THREE.SphereGeometry(radius, segments, Math.max(6, Math.round(segments * 0.7))), material);
}

function torus(radius: number, tube: number, material: THREE.Material, segments = 36) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 7, segments), material);
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

function tubeBetween(start: THREE.Vector3, end: THREE.Vector3, radius: number, material: THREE.Material, segments = 7) {
  const direction = end.clone().sub(start);
  const mesh = cylinder(radius, radius * 0.92, direction.length(), material, segments);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

function curveTube(points: THREE.Vector3[], radius: number, material: THREE.Material, quality: Island3DQuality, tubularSegments = 24) {
  return new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.round(tubularSegments * (quality === 'high' ? 0.9 : quality === 'medium' ? 0.72 : 0.5)), radius, quality === 'low' ? 5 : quality === 'medium' ? 7 : 6, false),
    material,
  );
}

function createWoodTexture(size: number, kind: 'bark' | 'timber' | 'bamboo', relief = false) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const ridge = kind === 'bark'
        ? Math.sin(x * 0.32 + Math.sin(y * 0.08) * 2.2) * 28
        : kind === 'bamboo'
          ? (y % 30 < 3 ? -26 : Math.sin(x * 0.16) * 7)
          : Math.sin(x * 0.13 + y * 0.025) * 13;
      const knot = ((x * 17 + y * 31 + Math.floor(y / 9) * 7) % 23) - 11;
      const value = THREE.MathUtils.clamp((relief ? 128 : 206) + ridge + knot, 24, 244);
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = relief ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === 'bark' ? 3 : 5, kind === 'bark' ? 8 : 5);
  texture.needsUpdate = true;
  return texture;
}

function createLeafTexture(size: number, relief = false) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const u = x / Math.max(1, size - 1);
      const v = y / Math.max(1, size - 1);
      const midrib = Math.exp(-Math.abs(u - 0.5) * 54);
      const veinPhase = Math.abs((v * 8.5) % 1 - 0.5);
      const sideVeins = Math.exp(-veinPhase * 18) * Math.pow(Math.abs(u - 0.5) * 2, 0.7);
      const dapple = Math.sin((u * 21) + Math.sin(v * 13) * 1.8) * 7
        + Math.sin((v * 29) - u * 9) * 4;
      const value = THREE.MathUtils.clamp(
        (relief ? 126 : 190) + midrib * (relief ? 52 : 24) + sideVeins * (relief ? 30 : 13) + dapple,
        24,
        248,
      );
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = relief ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.5, 2.2);
  texture.needsUpdate = true;
  return texture;
}

function sculptCanopyCluster(geometry: THREE.BufferGeometry, seed: number) {
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const bounds = new THREE.Box3().setFromBufferAttribute(position);
  const size = bounds.getSize(new THREE.Vector3());
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const nx = x / Math.max(0.001, size.x * 0.5);
    const endTaper = 0.5 + 0.5 * Math.pow(Math.max(0, 1 - Math.abs(nx)), 0.42);
    const foldedY = y * (0.67 + Math.sin((nx + seed) * 2.4) * 0.08) * endTaper;
    const foldedZ = z * (0.82 + Math.cos((nx * 2.1) - seed) * 0.08) * endTaper;
    position.setXYZ(
      index,
      x * (1.28 + Math.sin(seed * 1.7) * 0.08),
      foldedY + Math.sin(nx * Math.PI) * size.y * 0.055,
      foldedZ + Math.sin((nx + seed) * Math.PI) * size.z * 0.045,
    );
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}

export function createIsland10RootheartMaterials(): Island10RootheartMaterials {
  const barkMap = createWoodTexture(128, 'bark');
  const barkBump = createWoodTexture(128, 'bark', true);
  const timberMap = createWoodTexture(128, 'timber');
  const timberBump = createWoodTexture(128, 'timber', true);
  const bambooMap = createWoodTexture(96, 'bamboo');
  const leafMap = createLeafTexture(96);
  const leafBump = createLeafTexture(96, true);
  return {
    bark: new THREE.MeshStandardMaterial({ color: 0x4b2f1c, map: barkMap, bumpMap: barkBump, bumpScale: 0.16, roughness: 0.91 }),
    barkLight: new THREE.MeshStandardMaterial({ color: 0x765033, map: barkMap, bumpMap: barkBump, bumpScale: 0.1, roughness: 0.86 }),
    timber: new THREE.MeshStandardMaterial({ color: 0xbc7836, map: timberMap, bumpMap: timberBump, bumpScale: 0.07, roughness: 0.64 }),
    timberDark: new THREE.MeshStandardMaterial({ color: 0x56331d, map: timberMap, bumpMap: timberBump, bumpScale: 0.04, roughness: 0.82 }),
    bamboo: new THREE.MeshStandardMaterial({ color: 0xb98a3d, map: bambooMap, roughness: 0.62 }),
    rope: new THREE.MeshStandardMaterial({ color: 0x9b7748, roughness: 0.96 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xce8c39, roughness: 0.3, metalness: 0.78 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x285f31, map: leafMap, bumpMap: leafBump, bumpScale: 0.055, roughness: 0.74, side: THREE.DoubleSide }),
    leafLight: new THREE.MeshStandardMaterial({ color: 0x86a84b, map: leafMap, bumpMap: leafBump, bumpScale: 0.048, roughness: 0.64, side: THREE.DoubleSide }),
    seedShell: new THREE.MeshPhysicalMaterial({ color: 0xb98342, roughness: 0.46, clearcoat: 0.3, clearcoatRoughness: 0.28, side: THREE.DoubleSide }),
    sapglass: new THREE.MeshPhysicalMaterial({ color: 0x7fdc6c, emissive: 0x2f7a2b, emissiveIntensity: 0.46, roughness: 0.12, transmission: 0.2, thickness: 0.34, transparent: true, opacity: 0.88, clearcoat: 0.9 }),
    lantern: new THREE.MeshStandardMaterial({ color: 0xffb94e, emissive: 0xff721d, emissiveIntensity: 1.05, roughness: 0.26 }),
    arenaFloor: new THREE.MeshStandardMaterial({ color: 0x4a2b1b, map: timberMap, bumpMap: timberBump, bumpScale: 0.04, roughness: 0.8 }),
    builderCloth: new THREE.MeshStandardMaterial({ color: 0x2d746c, roughness: 0.88 }),
    waterMist: new THREE.MeshPhysicalMaterial({ color: 0xc1eee5, emissive: 0x2d776f, emissiveIntensity: 0.1, roughness: 0.08, transmission: 0.28, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide }),
    firefly: new THREE.PointsMaterial({ color: 0xffd365, size: 0.07, transparent: true, opacity: 0.78, depthWrite: false, sizeAttenuation: true }),
  };
}

function markShadows(root: THREE.Object3D, enabled: boolean) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = enabled;
    child.receiveShadow = true;
  });
}

function mergeStaticMeshesByMaterial(root: THREE.Group) {
  const buckets = new Map<string, { material: THREE.Material; entries: Array<{ geometry: THREE.BufferGeometry; object: THREE.Mesh }> }>();
  root.updateMatrixWorld(true);
  const inverseRoot = root.matrixWorld.clone().invert();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh) return;
    let ancestor: THREE.Object3D | null = object;
    let keepSeparate = false;
    while (ancestor && ancestor !== root) {
      if (ancestor.userData.keepSeparate) { keepSeparate = true; break; }
      ancestor = ancestor.parent;
    }
    if (object.children.length > 0 || keepSeparate || Array.isArray(object.material) || object.material.transparent) return;
    const cloned = object.geometry.clone();
    const geometry = cloned.index ? cloned.toNonIndexed() : cloned;
    if (geometry !== cloned) cloned.dispose();
    geometry.applyMatrix4(inverseRoot.clone().multiply(object.matrixWorld));
    const attributes = geometry.attributes as Record<string, THREE.BufferAttribute | THREE.InterleavedBufferAttribute>;
    const signature = Object.entries(attributes)
      .map(([name, attribute]) => `${name}:${attribute.itemSize}:${attribute.normalized ? 1 : 0}`)
      .sort()
      .join('|');
    const key = `${object.material.uuid}:${signature}`;
    const bucket: { material: THREE.Material; entries: Array<{ geometry: THREE.BufferGeometry; object: THREE.Mesh }> } = buckets.get(key)
      ?? { material: object.material, entries: [] };
    bucket.entries.push({ geometry, object });
    buckets.set(key, bucket);
  });
  let batchIndex = 0;
  buckets.forEach(({ material, entries }) => {
    if (entries.length < 2) {
      entries.forEach(({ geometry }) => geometry.dispose());
      return;
    }
    const geometries = entries.map(({ geometry }) => geometry);
    const merged = mergeGeometries(geometries, false);
    geometries.forEach((geometry) => geometry.dispose());
    if (!merged) return;
    entries.forEach(({ object }) => { object.visible = false; });
    const batch = new THREE.Mesh(merged, material);
    batch.name = `ISLAND_10_STATIC_MATERIAL_BATCH_${batchIndex += 1}`;
    batch.receiveShadow = true;
    root.add(batch);
  });
}

function addPlatform(root: THREE.Group, radius: number, materials: Island10RootheartMaterials, quality: Island3DQuality) {
  const floor = cylinder(radius, radius * 1.03, 0.2, materials.timber, radialSegments(quality));
  floor.position.y = 0.12;
  root.add(floor);
  const collar = torus(radius * 0.96, 0.065, materials.rope, radialSegments(quality) * 2);
  collar.position.y = 0.23;
  root.add(collar);
  return floor;
}

function createLeafBlade(
  width: number,
  height: number,
  material: THREE.Material,
  quality: Island3DQuality,
) {
  const shape = new THREE.Shape();
  shape.moveTo(0, height * 0.54);
  shape.bezierCurveTo(width * 0.48, height * 0.3, width * 0.52, -height * 0.18, 0, -height * 0.5);
  shape.bezierCurveTo(-width * 0.52, -height * 0.18, -width * 0.48, height * 0.3, 0, height * 0.54);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: quality === 'low' ? 0.025 : 0.04,
    bevelEnabled: true,
    bevelSegments: quality === 'high' ? 2 : 1,
    bevelSize: quality === 'low' ? 0.012 : 0.02,
    bevelThickness: quality === 'low' ? 0.012 : 0.018,
    curveSegments: quality === 'high' ? 8 : quality === 'medium' ? 6 : 4,
  });
  geometry.center();
  return new THREE.Mesh(geometry, material);
}

function addCraftedLandmarkDeck(
  root: THREE.Group,
  radius: number,
  y: number,
  materials: Island10RootheartMaterials,
  quality: Island3DQuality,
  options: { posts?: number; lanterns?: number; openFront?: boolean } = {},
) {
  const postCount = options.posts ?? qualityAmount(quality, 14, 11, 8);
  const lanternCount = options.lanterns ?? qualityAmount(quality, 4, 3, 2);
  const skirtTop = torus(radius * 0.99, 0.034, materials.rope, radialSegments(quality) * 3);
  skirtTop.position.y = y + 0.3;
  const skirtBottom = torus(radius * 1.015, 0.045, materials.timberDark, radialSegments(quality) * 3);
  skirtBottom.position.y = y - 0.03;
  root.add(skirtTop, skirtBottom);
  for (let index = 0; index < postCount; index += 1) {
    const angle = index / postCount * Math.PI * 2;
    if (options.openFront && Math.cos(angle) > 0.73) continue;
    const nextAngle = (index + 1) / postCount * Math.PI * 2;
    const post = cylinder(0.02, 0.027, 0.36, index % 3 === 0 ? materials.brass : materials.bamboo, 6);
    post.position.set(Math.sin(angle) * radius, y + 0.15, Math.cos(angle) * radius);
    root.add(post);
    if (index % 2 === 0) {
      root.add(tubeBetween(
        new THREE.Vector3(Math.sin(angle) * radius, y - 0.08, Math.cos(angle) * radius),
        new THREE.Vector3(Math.sin(nextAngle) * radius, y - 0.36, Math.cos(nextAngle) * radius),
        0.018,
        materials.rope,
        5,
      ));
    }
  }
  for (let index = 0; index < lanternCount; index += 1) {
    const angle = (index + 0.5) / lanternCount * Math.PI * 2;
    if (options.openFront && Math.cos(angle) > 0.76) continue;
    const lanternPosition = new THREE.Vector3(
      Math.sin(angle) * radius * 1.04,
      y - 0.26,
      Math.cos(angle) * radius * 1.04,
    );
    root.add(tubeBetween(
      lanternPosition.clone().add(new THREE.Vector3(0, 0.28, 0)),
      lanternPosition.clone().add(new THREE.Vector3(0, 0.1, 0)),
      0.01,
      materials.rope,
      5,
    ));
    addLantern(root, lanternPosition, materials, quality, 0.45);
  }
}

function addRopeLashing(
  root: THREE.Group,
  center: THREE.Vector3,
  radius: number,
  height: number,
  materials: Island10RootheartMaterials,
  quality: Island3DQuality,
) {
  for (const turn of [-1, 1]) {
    const points = Array.from({ length: 7 }, (_, index) => {
      const t = index / 6;
      const angle = turn * t * Math.PI * 2.1;
      return new THREE.Vector3(
        center.x + Math.cos(angle) * radius,
        center.y - height * 0.5 + t * height,
        center.z + Math.sin(angle) * radius,
      );
    });
    root.add(curveTube(points, 0.012, materials.rope, quality, 12));
  }
}

function addLantern(root: THREE.Group, position: THREE.Vector3, materials: Island10RootheartMaterials, quality: Island3DQuality, scale = 1) {
  const frame = cylinder(0.08 * scale, 0.1 * scale, 0.24 * scale, materials.brass, quality === 'low' ? 6 : 8);
  frame.position.copy(position);
  const glow = sphere(0.105 * scale, materials.lantern, quality === 'low' ? 7 : 10);
  glow.position.copy(position);
  root.add(frame, glow);
  return glow;
}

function addWarmWindow(
  root: THREE.Group,
  position: THREE.Vector3,
  materials: Island10RootheartMaterials,
  width = 0.28,
  height = 0.36,
  rotationY = 0,
) {
  const recess = box(width * 1.22, height * 1.2, 0.055, materials.timberDark);
  recess.position.copy(position);
  recess.rotation.y = rotationY;
  const glow = box(width, height, 0.07, materials.lantern);
  glow.position.copy(position).add(new THREE.Vector3(Math.sin(rotationY) * 0.035, 0, Math.cos(rotationY) * 0.035));
  glow.rotation.y = rotationY;
  const lintel = box(width * 1.34, 0.045, 0.1, materials.brass);
  lintel.position.copy(position).add(new THREE.Vector3(0, height * 0.62, 0));
  lintel.rotation.y = rotationY;
  const verticalMullion = box(0.025, height * 0.94, 0.085, materials.timberDark);
  verticalMullion.position.copy(position).add(new THREE.Vector3(Math.sin(rotationY) * 0.075, 0, Math.cos(rotationY) * 0.075));
  verticalMullion.rotation.y = rotationY;
  const horizontalMullion = box(width * 0.92, 0.025, 0.086, materials.timberDark);
  horizontalMullion.position.copy(verticalMullion.position);
  horizontalMullion.rotation.y = rotationY;
  root.add(recess, glow, lintel, verticalMullion, horizontalMullion);
}

function addBuilderAt(
  root: THREE.Group,
  position: THREE.Vector3,
  rotationY: number,
  materials: Island10RootheartMaterials,
  quality: Island3DQuality,
  index: number,
  scale = 0.72,
) {
  const builder = createBuilder(materials, quality, index);
  builder.position.copy(position);
  builder.rotation.y = rotationY;
  builder.scale.setScalar(scale * 1.4);
  root.add(builder);
}

function addWheel(
  root: THREE.Group,
  radius: number,
  position: THREE.Vector3,
  materials: Island10RootheartMaterials,
  name: string,
  spokeCount = 10,
) {
  const wheel = new THREE.Group();
  wheel.name = name;
  wheel.userData.keepSeparate = true;
  wheel.position.copy(position);
  const rim = torus(radius, radius * 0.1, materials.timber, spokeCount * 3);
  rim.rotation.set(0, 0, 0);
  wheel.add(rim);
  for (let index = 0; index < spokeCount; index += 1) {
    const angle = index / spokeCount * Math.PI * 2;
    wheel.add(tubeBetween(
      new THREE.Vector3(),
      new THREE.Vector3(Math.cos(angle) * radius * 0.92, Math.sin(angle) * radius * 0.92, 0),
      radius * 0.045,
      index % 2 ? materials.timberDark : materials.bamboo,
      5,
    ));
  }
  const hub = cylinder(radius * 0.12, radius * 0.12, radius * 0.34, materials.brass, 9);
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);
  mergeStaticMeshesByMaterial(wheel);
  root.add(wheel);
  return wheel;
}

function createWovenHangingPod(
  materials: Island10RootheartMaterials,
  quality: Island3DQuality,
  scale = 1,
) {
  const root = new THREE.Group();
  const shell = sphere(0.34 * scale, materials.seedShell, radialSegments(quality));
  shell.scale.set(0.82, 1.2, 0.82);
  root.add(shell);
  const ribCount = qualityAmount(quality, 8, 6, 4);
  for (let index = 0; index < ribCount; index += 1) {
    const angle = index / ribCount * Math.PI * 2;
    root.add(curveTube([
      new THREE.Vector3(Math.cos(angle) * 0.24 * scale, -0.28 * scale, Math.sin(angle) * 0.24 * scale),
      new THREE.Vector3(Math.cos(angle) * 0.34 * scale, 0, Math.sin(angle) * 0.34 * scale),
      new THREE.Vector3(Math.cos(angle) * 0.2 * scale, 0.38 * scale, Math.sin(angle) * 0.2 * scale),
    ], 0.018 * scale, materials.rope, quality, 10));
  }
  const lowerBand = torus(0.27 * scale, 0.018 * scale, materials.rope, ribCount * 3);
  lowerBand.position.y = -0.18 * scale;
  const upperBand = torus(0.25 * scale, 0.018 * scale, materials.brass, ribCount * 3);
  upperBand.position.y = 0.22 * scale;
  root.add(lowerBand, upperBand);
  return root;
}

function createTrunkBalconyDistrict(
  position: THREE.Vector3,
  trunkIndex: number,
  materials: Island10RootheartMaterials,
  quality: Island3DQuality,
) {
  const root = new THREE.Group();
  root.name = `ISLAND_10_TRUNK_BALCONY_DISTRICT_${trunkIndex + 1}`;
  root.position.copy(position);
  const deckCount = quality === 'low' ? 2 : 3;
  const facing = Math.atan2(-position.x, -position.z);
  for (let level = 0; level < deckCount; level += 1) {
    const y = 0.72 + level * 1.42 + (trunkIndex === 0 ? 0.28 : 0);
    const radius = 1.3 - level * 0.08;
    const deck = cylinder(radius, radius * 1.04, 0.14, level % 2 ? materials.timber : materials.timberDark, radialSegments(quality));
    deck.position.y = y;
    root.add(deck);
    const lowerLashing = torus(radius * 0.96, 0.035, materials.rope, radialSegments(quality) * 3);
    lowerLashing.position.y = y + 0.1;
    const rail = torus(radius * 0.96, 0.03, materials.brass, radialSegments(quality) * 3);
    rail.position.y = y + 0.43;
    root.add(lowerLashing, rail);
    const postCount = qualityAmount(quality, 12, 9, 7);
    for (let index = 0; index < postCount; index += 1) {
      const angle = index / postCount * Math.PI * 2;
      const post = cylinder(0.025, 0.032, 0.38, materials.bamboo, 6);
      post.position.set(Math.cos(angle) * radius * 0.96, y + 0.27, Math.sin(angle) * radius * 0.96);
      root.add(post);
    }
    const nook = box(0.82, 0.62, 0.62, materials.timberDark);
    nook.position.set(Math.sin(facing) * (radius * 0.55), y + 0.38, Math.cos(facing) * (radius * 0.55));
    nook.rotation.y = facing;
    root.add(nook);
    const awning = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.34, 7), level % 2 ? materials.leafLight : materials.leaf);
    awning.position.copy(nook.position).add(new THREE.Vector3(0, 0.52, 0));
    awning.rotation.y = facing + level * 0.22;
    root.add(awning);
    addLantern(root, nook.position.clone().add(new THREE.Vector3(0, 0.12, 0.38)), materials, quality, 0.7);
    const builderAngle = facing + (level % 2 ? -0.82 : 0.82);
    const districtBuilder = createBuilder(materials, quality, trunkIndex * 4 + level);
    districtBuilder.position.set(
      Math.sin(builderAngle) * radius * 0.68,
      y + 0.17,
      Math.cos(builderAngle) * radius * 0.68,
    );
    districtBuilder.rotation.y = builderAngle + Math.PI;
    districtBuilder.scale.multiplyScalar(0.9);
    root.add(districtBuilder);
  }

  const ladderY0 = 0.82;
  const ladderY1 = 0.72 + (deckCount - 1) * 1.42;
  // Keep service ladders on each trunk's outer face. An inward-facing ladder
  // projects as a cage of straight poles through the arena at the hero camera.
  const outward = new THREE.Vector3(position.x, 0, position.z).normalize();
  const tangent = new THREE.Vector3(-outward.z, 0, outward.x);
  const ladderCenter = outward.multiplyScalar(1.04);
  for (const sideOffset of [-0.12, 0.12]) {
    const railPosition = ladderCenter.clone().addScaledVector(tangent, sideOffset);
    root.add(tubeBetween(
      new THREE.Vector3(railPosition.x, ladderY0, railPosition.z),
      new THREE.Vector3(railPosition.x, ladderY1, railPosition.z),
      0.025,
      materials.bamboo,
      6,
    ));
  }
  const rungCount = qualityAmount(quality, 13, 10, 7);
  for (let index = 0; index < rungCount; index += 1) {
    const y = THREE.MathUtils.lerp(ladderY0 + 0.08, ladderY1 - 0.08, rungCount === 1 ? 0.5 : index / (rungCount - 1));
    const rungStart = ladderCenter.clone().addScaledVector(tangent, -0.12);
    const rungEnd = ladderCenter.clone().addScaledVector(tangent, 0.12);
    rungStart.y = y;
    rungEnd.y = y;
    root.add(tubeBetween(rungStart, rungEnd, 0.018, materials.rope, 5));
  }
  return root;
}

function createExteriorSuspensionBridge(
  start: THREE.Vector3,
  end: THREE.Vector3,
  sag: number,
  materials: Island10RootheartMaterials,
  quality: Island3DQuality,
) {
  const root = new THREE.Group();
  const plankCount = qualityAmount(quality, 18, 14, 10);
  const curve = new THREE.QuadraticBezierCurve3(start, start.clone().lerp(end, 0.5).add(new THREE.Vector3(0, -sag, 0)), end);
  for (let index = 0; index < plankCount; index += 1) {
    const t = plankCount === 1 ? 0.5 : index / (plankCount - 1);
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    const plank = box(0.48, 0.08, 0.24, index % 2 ? materials.timber : materials.timberDark);
    plank.position.copy(point);
    plank.rotation.y = Math.atan2(tangent.x, tangent.z) + Math.PI / 2;
    root.add(plank);
  }
  for (const side of [-1, 1]) {
    const railPoints = Array.from({ length: 9 }, (_, index) => {
      const t = index / 8;
      const point = curve.getPoint(t);
      const tangent = curve.getTangent(t).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(side * 0.27);
      return point.add(normal).add(new THREE.Vector3(0, 0.38, 0));
    });
    root.add(curveTube(railPoints, 0.022, materials.rope, quality, 22));
    for (let index = 0; index < 5; index += 1) {
      const t = index / 4;
      const deckPoint = curve.getPoint(t);
      const tangent = curve.getTangent(t).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(side * 0.27);
      root.add(tubeBetween(deckPoint.clone().add(normal), deckPoint.clone().add(normal).add(new THREE.Vector3(0, 0.38, 0)), 0.018, materials.rope, 5));
    }
  }
  return root;
}

function createHatchery(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island10RootheartMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_10_ACORN_CRADLE_HATCHERY_ARCHITECTURE';
  const platformRadius = level === 1 ? 0.84 : level === 2 ? 1.0 : 1.12;
  addPlatform(root, platformRadius, materials, quality);
  addCraftedLandmarkDeck(root, platformRadius * 0.96, 0.2, materials, quality, {
    posts: qualityAmount(quality, 15, 12, 9),
    lanterns: level === 1 ? 2 : level === 2 ? 3 : 4,
    openFront: true,
  });
  const cradle = new THREE.Group();
  cradle.name = 'ISLAND_10_HATCHERY_SEED_SHELL';
  const lowerNest = torus(0.68, 0.09, materials.rope, radialSegments(quality) * 3);
  lowerNest.position.y = 0.4;
  cradle.add(lowerNest);
  const sapCore = sphere(level === 1 ? 0.42 : 0.5, materials.sapglass, radialSegments(quality));
  sapCore.scale.set(0.78, 1.2, 0.78);
  sapCore.position.y = level === 1 ? 1.0 : 1.08;
  cradle.add(sapCore);
  const ribCount = qualityAmount(quality, level === 1 ? 8 : 12, level === 1 ? 7 : 9, level === 1 ? 5 : 7);
  for (let index = 0; index < ribCount; index += 1) {
    const angle = index / ribCount * Math.PI * 2;
    cradle.add(curveTube([
      new THREE.Vector3(Math.cos(angle) * 0.45, 0.48, Math.sin(angle) * 0.45),
      new THREE.Vector3(Math.cos(angle) * 0.61, 1.1, Math.sin(angle) * 0.61),
      new THREE.Vector3(Math.cos(angle) * 0.28, 1.72, Math.sin(angle) * 0.28),
    ], index % 3 === 0 ? 0.035 : 0.025, index % 3 === 0 ? materials.brass : materials.rope, quality, 15));
  }
  const crownBand = torus(0.29, 0.045, materials.brass, radialSegments(quality) * 2);
  crownBand.position.y = 1.72;
  cradle.add(crownBand);
  root.add(cradle);

  const entry = new THREE.Group();
  entry.position.z = 0.58;
  addWarmWindow(entry, new THREE.Vector3(0, 0.85, 0), materials, 0.3, 0.42);
  for (const x of [-0.22, 0.22]) {
    const jamb = cylinder(0.035, 0.048, 0.56, materials.brass, 7);
    jamb.position.set(x, 0.82, 0.035);
    entry.add(jamb);
  }
  const lintel = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.036, 6, 16, Math.PI), materials.brass);
  lintel.position.set(0, 1.08, 0.04);
  entry.add(lintel);
  root.add(entry);
  for (let step = 0; step < 4; step += 1) {
    const stair = box(0.44 + step * 0.14, 0.07, 0.19, step % 2 ? materials.timberDark : materials.timber);
    stair.position.set(0, 0.22 + step * 0.055, 0.72 + step * 0.14);
    root.add(stair);
  }
  addLantern(root, new THREE.Vector3(-0.48, 0.62, 0.58), materials, quality, 0.58);
  addLantern(root, new THREE.Vector3(0.48, 0.62, 0.58), materials, quality, 0.58);
  if (level >= 2) {
    const pods = new THREE.Group();
    pods.name = 'ISLAND_10_HATCHERY_NURSERY_PODS';
    const podPositions = level === 2
      ? [new THREE.Vector3(-0.82, 1.14, 0.05), new THREE.Vector3(0.82, 0.9, -0.08)]
      : [new THREE.Vector3(-0.9, 1.28, 0.02), new THREE.Vector3(0.88, 1.02, -0.08), new THREE.Vector3(-0.76, 0.65, -0.35)];
    podPositions.forEach((position, index) => {
      const pod = createWovenHangingPod(materials, quality, 0.42 + index * 0.035);
      pod.position.copy(position);
      pods.add(pod);
      root.add(curveTube([
        position.clone().add(new THREE.Vector3(0, 0.36, 0)),
        new THREE.Vector3(position.x * 0.72, 1.75, position.z * 0.5),
      ], 0.016, materials.rope, quality, 12));
    });
    for (let index = 0; index < qualityAmount(quality, 5, 4, 3); index += 1) {
      const angle = index / qualityAmount(quality, 5, 4, 3) * Math.PI * 2 + 0.45;
      const egg = sphere(0.105 + (index % 2) * 0.02, materials.sapglass, 8);
      egg.scale.y = 1.25;
      egg.position.set(Math.cos(angle) * 0.72, 0.48, Math.sin(angle) * 0.72);
      pods.add(egg);
    }
    root.add(pods);
    const nurseryRail = torus(0.88, 0.028, materials.brass, radialSegments(quality) * 3);
    nurseryRail.position.y = 0.66;
    root.add(nurseryRail);
    for (let index = 0; index < qualityAmount(quality, 10, 8, 6); index += 1) {
      const angle = index / qualityAmount(quality, 10, 8, 6) * Math.PI * 2;
      const post = cylinder(0.018, 0.024, 0.35, materials.bamboo, 6);
      post.position.set(Math.cos(angle) * 0.88, 0.49, Math.sin(angle) * 0.88);
      root.add(post);
    }
    addBuilderAt(root, new THREE.Vector3(-0.58, 0.39, 0.58), 0.4, materials, quality, 31, 0.68);
  }
  if (level >= 3) {
    // Overlapping seed-shell petals turn the simple cage into a crafted acorn
    // nursery while leaving generous openings for the glowing core and door.
    for (let index = 0; index < 8; index += 1) {
      const angle = index / 8 * Math.PI * 2;
      if (Math.cos(angle) > 0.72) continue;
      const shellPetal = sphere(0.34, materials.seedShell, quality === 'low' ? 7 : 10);
      shellPetal.scale.set(0.52, 1.5, 0.18);
      shellPetal.position.set(Math.cos(angle) * 0.49, 1.14 + (index % 2) * 0.08, Math.sin(angle) * 0.49);
      shellPetal.rotation.set(Math.sin(angle) * 0.16, -angle, -Math.cos(angle) * 0.18);
      root.add(shellPetal);
    }
    for (const y of [0.78, 1.28, 1.58]) {
      const wovenBand = torus(0.52 - (y - 0.78) * 0.19, 0.022, y === 1.28 ? materials.brass : materials.rope, radialSegments(quality) * 2);
      wovenBand.position.y = y;
      root.add(wovenBand);
    }
    const crown = cylinder(0.14, 0.36, 0.42, materials.timberDark, radialSegments(quality));
    crown.position.y = 1.9;
    root.add(crown);
    for (const side of [-1, 1]) {
      const leaf = createLeafBlade(0.48, 0.92, side < 0 ? materials.leaf : materials.leafLight, quality);
      leaf.rotation.set(-0.28, side * 0.24, side * 0.58);
      leaf.position.set(side * 0.3, 2.17, -0.02);
      root.add(leaf);
      const vein = tubeBetween(
        new THREE.Vector3(side * 0.15, 1.94, 0.03),
        new THREE.Vector3(side * 0.54, 2.45, -0.04),
        0.014,
        materials.brass,
        5,
      );
      root.add(vein);
    }
    const shellShoulderCount = qualityAmount(quality, 8, 6, 4);
    for (let index = 0; index < shellShoulderCount; index += 1) {
      const angle = index / shellShoulderCount * Math.PI * 2 + 0.2;
      const brace = tubeBetween(
        new THREE.Vector3(Math.cos(angle) * 0.55, 0.52, Math.sin(angle) * 0.55),
        new THREE.Vector3(Math.cos(angle) * 0.76, 0.28, Math.sin(angle) * 0.76),
        0.028,
        index % 2 ? materials.bamboo : materials.timberDark,
        6,
      );
      root.add(brace);
    }
    addRopeLashing(root, new THREE.Vector3(0, 1.81, 0), 0.16, 0.28, materials, quality);
    const pulleyArm = tubeBetween(new THREE.Vector3(-0.1, 1.88, 0), new THREE.Vector3(1.05, 2.16, 0.08), 0.05, materials.bamboo, 7);
    root.add(pulleyArm);
    const pulley = torus(0.13, 0.025, materials.brass, 18);
    pulley.rotation.set(0, 0, Math.PI / 2);
    pulley.position.set(1.0, 2.14, 0.08);
    root.add(pulley);
    root.add(tubeBetween(new THREE.Vector3(1.0, 2.12, 0.08), new THREE.Vector3(1.0, 1.02, 0.08), 0.014, materials.rope, 5));
    const hangingCradle = createWovenHangingPod(materials, quality, 0.48);
    hangingCradle.position.set(1.0, 0.82, 0.08);
    root.add(hangingCradle);
    addBuilderAt(root, new THREE.Vector3(0.62, 0.4, 0.62), -0.5, materials, quality, 32, 0.68);
  }
  return root;
}

function createRhythmLodge(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island10RootheartMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_10_CANOPY_RHYTHM_LODGE_ARCHITECTURE';
  const platformRadius = level === 1 ? 0.9 : level === 2 ? 1.05 : 1.18;
  addPlatform(root, platformRadius, materials, quality);
  addCraftedLandmarkDeck(root, platformRadius * 0.97, 0.21, materials, quality, {
    posts: qualityAmount(quality, 14, 11, 8),
    lanterns: level === 3 ? 4 : 2,
    openFront: true,
  });
  const stage = cylinder(level === 1 ? 0.76 : 0.9, level === 1 ? 0.82 : 0.96, 0.18, materials.timber, radialSegments(quality));
  stage.position.y = 0.38;
  const frontStep = box(level === 1 ? 0.64 : 0.82, 0.12, 0.34, materials.timberDark);
  frontStep.position.set(0, 0.27, 0.72);
  root.add(stage, frontStep);
  const railPoints: THREE.Vector3[] = [];
  const railPostCount = qualityAmount(quality, 9, 7, 5);
  for (let index = 0; index < railPostCount; index += 1) {
    const t = railPostCount === 1 ? 0.5 : index / (railPostCount - 1);
    const angle = THREE.MathUtils.lerp(-1.0, 1.0, t);
    const x = Math.sin(angle) * 0.94;
    const z = -Math.cos(angle) * 0.94;
    const post = cylinder(0.022, 0.028, 0.42, materials.bamboo, 6);
    post.position.set(x, 0.64, z);
    root.add(post);
    railPoints.push(new THREE.Vector3(x, 0.82, z));
  }
  root.add(curveTube(railPoints, 0.024, materials.rope, quality, 20));
  const drumCount = level === 1 ? 3 : level === 2 ? 5 : qualityAmount(quality, 7, 6, 5);
  for (let index = 0; index < drumCount; index += 1) {
    const drum = cylinder(0.14 + (index % 2) * 0.025, 0.17 + (index % 2) * 0.025, 0.3, materials.timberDark, 9);
    drum.rotation.z = Math.PI / 2;
    drum.position.set((index - (drumCount - 1) / 2) * (level === 3 ? 0.25 : 0.29), 0.61 + (index % 2) * 0.05, 0.28);
    root.add(drum);
    const drumBand = torus(0.15 + (index % 2) * 0.025, 0.016, materials.brass, 16);
    drumBand.rotation.z = Math.PI / 2;
    drumBand.position.copy(drum.position).add(new THREE.Vector3(0.14, 0, 0));
    root.add(drumBand);
  }
  for (const x of [-0.55, 0.55]) addLantern(root, new THREE.Vector3(x, 0.72, 0.48), materials, quality, 0.54);
  if (level >= 2) {
    const fan = new THREE.Group();
    fan.name = 'ISLAND_10_RHYTHM_RESONATOR_FAN';
    const count = level === 2 ? qualityAmount(quality, 13, 11, 8) : qualityAmount(quality, 21, 17, 12);
    for (let index = 0; index < count; index += 1) {
      const normalized = count === 1 ? 0.5 : index / (count - 1);
      const angle = THREE.MathUtils.lerp(-1.04, 1.04, normalized);
      const height = 0.76 + Math.sin(normalized * Math.PI) * (level === 3 ? 1.22 : 0.9);
      const tube = cylinder(0.047, 0.06, height, index % 4 === 0 ? materials.brass : materials.bamboo, 8);
      tube.position.set(Math.sin(angle) * (level === 3 ? 0.98 : 0.82), 0.67 + height / 2, -0.31 - Math.cos(angle) * 0.17);
      tube.rotation.z = -angle * 0.3;
      fan.add(tube);
      if (index % 3 === 0) addRopeLashing(fan, tube.position.clone().add(new THREE.Vector3(0, -height * 0.38, 0)), 0.062, 0.18, materials, quality);
      if (level === 3 || index % 2 === 0) {
        const mouth = torus(0.057, 0.012, materials.brass, 12);
        mouth.position.copy(tube.position).add(new THREE.Vector3(0, height / 2, 0));
        mouth.rotation.z = tube.rotation.z;
        fan.add(mouth);
      }
    }
    root.add(fan);
    const chimeBeam = tubeBetween(new THREE.Vector3(-0.72, 1.44, 0), new THREE.Vector3(0.72, 1.44, 0), 0.035, materials.timberDark, 7);
    root.add(chimeBeam);
    const chimeCount = qualityAmount(quality, 7, 5, 4);
    for (let index = 0; index < chimeCount; index += 1) {
      const t = chimeCount === 1 ? 0.5 : index / (chimeCount - 1);
      const x = THREE.MathUtils.lerp(-0.56, 0.56, t);
      const length = 0.24 + Math.sin(t * Math.PI) * 0.22;
      root.add(tubeBetween(
        new THREE.Vector3(x, 1.39, 0.02),
        new THREE.Vector3(x, 1.39 - length, 0.02),
        0.023,
        index % 2 ? materials.brass : materials.bamboo,
        7,
      ));
    }
    const upperDeck = cylinder(0.73, 0.78, 0.12, materials.timberDark, radialSegments(quality));
    upperDeck.position.set(0, 1.23, -0.42);
    root.add(upperDeck);
    addBuilderAt(root, new THREE.Vector3(-0.42, 1.34, -0.28), 0.25, materials, quality, 41, 0.66);
  }
  if (level >= 3) {
    for (const x of [-0.92, 0.92]) root.add(tubeBetween(new THREE.Vector3(x, 0.25, -0.36), new THREE.Vector3(x * 0.76, 1.72, -0.34), 0.055, materials.timberDark, 7));
    for (const side of [-1, 1]) {
      const canopyLeaf = createLeafBlade(0.46, 0.92, side < 0 ? materials.leaf : materials.leafLight, quality);
      canopyLeaf.rotation.set(-0.38, side * 0.1, side * 0.6);
      canopyLeaf.position.set(side * 1.04, 2.14, -0.5);
      root.add(canopyLeaf);
      root.add(tubeBetween(
        new THREE.Vector3(side * 0.82, 1.84, -0.42),
        new THREE.Vector3(side * 1.3, 2.4, -0.53),
        0.013,
        materials.brass,
        5,
      ));
      addLantern(root, new THREE.Vector3(side * 0.88, 0.88, -0.24), materials, quality, 0.58);
    }
    const canopyBeam = curveTube([
      new THREE.Vector3(-1.0, 1.76, -0.42),
      new THREE.Vector3(0, 2.2, -0.5),
      new THREE.Vector3(1.0, 1.76, -0.42),
    ], 0.055, materials.bamboo, quality, 24);
    root.add(canopyBeam);
    // A row of resonator bowls and crossed mallets gives the stage readable
    // musical storytelling even when the tall pipe fan is partly silhouetted.
    for (let index = 0; index < 5; index += 1) {
      const x = THREE.MathUtils.lerp(-0.62, 0.62, index / 4);
      const bowl = cylinder(0.11, 0.16, 0.18, index % 2 ? materials.brass : materials.timberDark, 8);
      bowl.position.set(x, 0.52 + Math.sin(index) * 0.025, 0.47);
      root.add(bowl);
      const rim = torus(0.125, 0.015, materials.brass, 14);
      rim.position.set(x, 0.61 + Math.sin(index) * 0.025, 0.47);
      root.add(rim);
    }
    root.add(tubeBetween(new THREE.Vector3(-0.5, 0.79, 0.58), new THREE.Vector3(0.18, 0.48, 0.6), 0.018, materials.bamboo, 5));
    root.add(tubeBetween(new THREE.Vector3(0.5, 0.79, 0.58), new THREE.Vector3(-0.18, 0.48, 0.6), 0.018, materials.bamboo, 5));
    for (const side of [-1, 1]) {
      const sideDeck = box(0.44, 0.11, 0.58, side < 0 ? materials.timber : materials.timberDark);
      sideDeck.position.set(side * 1.02, 0.72, 0.02);
      sideDeck.rotation.y = side * 0.16;
      root.add(sideDeck);
      const support = tubeBetween(
        new THREE.Vector3(side * 0.9, 0.62, 0.08),
        new THREE.Vector3(side * 0.72, 0.16, -0.08),
        0.035,
        materials.bamboo,
        6,
      );
      root.add(support);
    }
    addBuilderAt(root, new THREE.Vector3(0.42, 1.34, -0.26), -0.25, materials, quality, 42, 0.66);
    addBuilderAt(root, new THREE.Vector3(0.62, 0.45, 0.56), -0.4, materials, quality, 43, 0.68);
  }
  return root;
}

function createSpiralLibrary(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island10RootheartMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_10_SPIRALWOOD_LIBRARY_ARCHITECTURE';
  const platformRadius = level === 1 ? 0.88 : level === 2 ? 1.02 : 1.14;
  addPlatform(root, platformRadius, materials, quality);
  addCraftedLandmarkDeck(root, platformRadius * 0.97, 0.2, materials, quality, {
    posts: qualityAmount(quality, 14, 11, 8),
    lanterns: level === 3 ? 4 : 2,
    openFront: true,
  });
  const towerHeight = level === 1 ? 1.35 : level === 2 ? 1.8 : 2.25;
  const tower = cylinder(0.56, 0.74, towerHeight, materials.barkLight, radialSegments(quality));
  tower.position.y = 0.32 + towerHeight / 2;
  root.add(tower);
  const bandCount = level === 1 ? 2 : level === 2 ? 4 : 6;
  for (let index = 0; index < bandCount; index += 1) {
    const band = torus(0.66 - index * 0.014, 0.042, index % 2 ? materials.brass : materials.timberDark, radialSegments(quality) * 2);
    band.position.y = 0.5 + index * (level === 3 ? 0.33 : 0.31);
    root.add(band);
  }
  const storeyCount = level + 1;
  for (let storey = 0; storey < storeyCount; storey += 1) {
    const y = 0.57 + storey * 0.48;
    addWarmWindow(root, new THREE.Vector3(-0.24, y, 0.59), materials, 0.22, 0.26);
    addWarmWindow(root, new THREE.Vector3(0.24, y + 0.04, 0.59), materials, 0.22, 0.26);
    const archiveShelf = box(0.48, 0.12, 0.07, materials.timberDark);
    archiveShelf.position.set(0, y - 0.19, 0.635);
    root.add(archiveShelf);
    const bookCount = level === 1 ? 3 : level === 2 ? 5 : 7;
    for (let bookIndex = 0; bookIndex < bookCount; bookIndex += 1) {
      const width = 0.045 + (bookIndex % 2) * 0.012;
      const height = 0.12 + (bookIndex % 3) * 0.025;
      const book = box(width, height, 0.055, bookIndex % 3 === 0 ? materials.builderCloth : bookIndex % 3 === 1 ? materials.leafLight : materials.brass);
      book.position.set((bookIndex - (bookCount - 1) / 2) * 0.07, y - 0.09 + height / 2, 0.68);
      book.rotation.z = (bookIndex % 3 - 1) * 0.04;
      root.add(book);
    }
    if (level >= 2) {
      const readingDeck = cylinder(0.71 + (storey % 2) * 0.035, 0.74, 0.065, storey % 2 ? materials.timberDark : materials.timber, radialSegments(quality));
      readingDeck.position.y = y - 0.25;
      root.add(readingDeck);
      const readingRail = torus(0.72, 0.02, storey % 2 ? materials.rope : materials.brass, radialSegments(quality) * 2);
      readingRail.position.y = y - 0.02;
      root.add(readingRail);
      for (let postIndex = 0; postIndex < qualityAmount(quality, 9, 7, 5); postIndex += 1) {
        const angle = postIndex / qualityAmount(quality, 9, 7, 5) * Math.PI * 2;
        if (Math.cos(angle) > 0.72) continue;
        const post = cylinder(0.014, 0.02, 0.24, materials.bamboo, 5);
        post.position.set(Math.sin(angle) * 0.72, y - 0.13, Math.cos(angle) * 0.72);
        root.add(post);
      }
    }
  }
  for (let step = 0; step < 4; step += 1) {
    const stair = box(0.5 + step * 0.11, 0.065, 0.18, step % 2 ? materials.timberDark : materials.timber);
    stair.position.set(0, 0.22 + step * 0.052, 0.73 + step * 0.13);
    root.add(stair);
  }
  if (level >= 2) {
    const helicalPoints = Array.from({ length: 26 }, (_, index) => {
      const t = index / 25;
      const angle = t * Math.PI * (level === 3 ? 3.4 : 2.6);
      return new THREE.Vector3(Math.cos(angle) * 0.78, 0.4 + t * (level === 3 ? 1.75 : 1.35), Math.sin(angle) * 0.78);
    });
    const balcony = curveTube(helicalPoints, 0.085, materials.timber, quality, 44);
    balcony.name = 'ISLAND_10_LIBRARY_HELICAL_BALCONY';
    root.add(balcony);
    const helicalRail = curveTube(helicalPoints.map((point) => point.clone().multiply(new THREE.Vector3(1.08, 1, 1.08)).add(new THREE.Vector3(0, 0.31, 0))), 0.025, materials.brass, quality, 44);
    root.add(helicalRail);
    const treadCount = qualityAmount(quality, level === 3 ? 22 : 15, level === 3 ? 17 : 12, level === 3 ? 12 : 9);
    for (let index = 0; index < treadCount; index += 1) {
      const t = index / Math.max(1, treadCount - 1);
      const angle = t * Math.PI * (level === 3 ? 3.4 : 2.6);
      const tread = box(0.34, 0.045, 0.16, index % 2 ? materials.timber : materials.timberDark);
      tread.position.set(Math.cos(angle) * 0.77, 0.4 + t * (level === 3 ? 1.75 : 1.35), Math.sin(angle) * 0.77);
      tread.rotation.y = -angle;
      root.add(tread);
    }
    for (let index = 0; index < qualityAmount(quality, 12, 9, 7); index += 1) {
      const t = index / Math.max(1, qualityAmount(quality, 12, 9, 7) - 1);
      const angle = t * Math.PI * (level === 3 ? 3.4 : 2.6);
      const y = 0.4 + t * (level === 3 ? 1.75 : 1.35);
      const railPost = cylinder(0.018, 0.024, 0.32, materials.bamboo, 6);
      railPost.position.set(Math.cos(angle) * 0.82, y + 0.18, Math.sin(angle) * 0.82);
      root.add(railPost);
    }
    addLantern(root, new THREE.Vector3(-0.72, 1.1, 0.34), materials, quality, 0.58);
    addBuilderAt(root, new THREE.Vector3(0.58, 0.62, 0.54), -0.5, materials, quality, 51, 0.65);
  }
  if (level >= 3) {
    const armillary = new THREE.Group();
    armillary.name = 'ISLAND_10_LIBRARY_ARMILLARY_PIVOT';
    armillary.userData.keepSeparate = true;
    armillary.position.y = 2.88;
    armillary.add(torus(0.42, 0.035, materials.brass, 32), sphere(0.21, materials.sapglass, 12));
    const second = torus(0.42, 0.035, materials.brass, 32);
    second.rotation.set(0, Math.PI / 2, 0);
    armillary.add(second);
    const third = torus(0.34, 0.025, materials.rope, 28);
    third.rotation.set(Math.PI / 3, 0, Math.PI / 5);
    armillary.add(third);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.5, radialSegments(quality)), materials.leaf);
    roof.position.y = -0.38;
    armillary.add(roof);
    root.add(armillary);
    addBuilderAt(root, new THREE.Vector3(-0.54, 1.72, 0.52), 0.35, materials, quality, 52, 0.62);
    addLantern(root, new THREE.Vector3(0.62, 2.08, 0.34), materials, quality, 0.52);
  }
  return root;
}

function createPulleyWorkshop(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island10RootheartMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_10_FIREFLY_PULLEY_WORKSHOP_ARCHITECTURE';
  const platformRadius = level === 1 ? 0.9 : level === 2 ? 1.06 : 1.2;
  addPlatform(root, platformRadius, materials, quality);
  addCraftedLandmarkDeck(root, platformRadius * 0.97, 0.2, materials, quality, {
    posts: qualityAmount(quality, 14, 11, 8),
    lanterns: level === 3 ? 4 : 2,
    openFront: true,
  });
  const cabinWidth = level === 1 ? 0.88 : level === 2 ? 1.14 : 1.3;
  const cabinHeight = level === 1 ? 0.78 : level === 2 ? 1.05 : 1.22;
  const cabin = box(cabinWidth, cabinHeight, 0.74, materials.timberDark);
  cabin.position.set(-0.18, 0.3 + cabinHeight / 2, -0.12);
  root.add(cabin);
  const beamCount = level === 1 ? 3 : 5;
  for (let index = 0; index < beamCount; index += 1) {
    const x = THREE.MathUtils.lerp(-cabinWidth * 0.42, cabinWidth * 0.42, index / (beamCount - 1));
    const beam = cylinder(0.026, 0.034, cabinHeight * 0.92, index % 2 ? materials.bamboo : materials.brass, 6);
    beam.position.set(x - 0.18, cabin.position.y, 0.27);
    root.add(beam);
  }
  addWarmWindow(root, new THREE.Vector3(-0.2, 0.78, 0.285), materials, level === 1 ? 0.3 : 0.42, level === 1 ? 0.3 : 0.4);
  const smallWheel = addWheel(root, level === 1 ? 0.3 : 0.42, new THREE.Vector3(-0.58, 0.72, 0.5), materials, level === 3 ? 'ISLAND_10_WORKSHOP_WATERWHEEL_PIVOT' : 'ISLAND_10_WORKSHOP_GEAR_PIVOT', level === 1 ? 7 : 9);
  smallWheel.rotation.y = 0.08;
  if (level >= 2) {
    const crane = new THREE.Group();
    crane.name = 'ISLAND_10_WORKSHOP_CRANE_PIVOT';
    crane.position.set(0.38, 1.12, -0.08);
    crane.add(tubeBetween(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.1, level === 3 ? 1.3 : 1.02, 0), 0.06, materials.bamboo, 7));
    crane.add(tubeBetween(new THREE.Vector3(0.06, level === 3 ? 1.12 : 0.88, 0), new THREE.Vector3(-0.92, level === 3 ? 0.92 : 0.72, 0.16), 0.05, materials.bamboo, 7));
    crane.add(tubeBetween(
      new THREE.Vector3(0.06, level === 3 ? 0.36 : 0.28, -0.03),
      new THREE.Vector3(-0.82, level === 3 ? 0.92 : 0.72, 0.13),
      0.026,
      materials.rope,
      5,
    ));
    const cable = tubeBetween(new THREE.Vector3(-0.86, level === 3 ? 0.92 : 0.72, 0.16), new THREE.Vector3(-0.86, 0.08, 0.16), 0.018, materials.rope, 5);
    crane.add(cable);
    const pulley = torus(0.11, 0.022, materials.brass, 18);
    pulley.position.set(-0.84, level === 3 ? 0.9 : 0.7, 0.16);
    pulley.rotation.z = Math.PI / 2;
    crane.add(pulley);
    root.add(crane);
    const cargo = box(0.42, 0.14, 0.36, materials.timber);
    cargo.position.set(-0.48, 0.42, 0.42);
    root.add(cargo);
    addLantern(root, new THREE.Vector3(-0.62, 1.26, 0.3), materials, quality, 0.58);
    addBuilderAt(root, new THREE.Vector3(-0.62, 0.42, 0.52), 0.4, materials, quality, 61, 0.66);
  }
  if (level >= 3) {
    smallWheel.scale.setScalar(1.92);
    smallWheel.position.set(-0.78, 1.12, 0.72);
    const upperTier = cylinder(0.76, 0.82, 0.12, materials.timber, radialSegments(quality));
    upperTier.position.set(-0.18, 1.47, -0.12);
    root.add(upperTier);
    addCraftedLandmarkDeck(root, 0.78, 1.48, materials, quality, {
      posts: qualityAmount(quality, 11, 9, 6),
      lanterns: 2,
      openFront: false,
    });
    for (let pipeIndex = 0; pipeIndex < 3; pipeIndex += 1) {
      const pipe = cylinder(0.055, 0.072, 0.42 + pipeIndex * 0.13, pipeIndex === 1 ? materials.brass : materials.bamboo, 8);
      pipe.position.set(-0.46 + pipeIndex * 0.22, 1.76 + pipeIndex * 0.065, -0.18);
      root.add(pipe);
      const pipeMouth = torus(0.065, 0.012, materials.brass, 12);
      pipeMouth.position.set(pipe.position.x, pipe.position.y + (0.42 + pipeIndex * 0.13) / 2, pipe.position.z);
      root.add(pipeMouth);
      addRopeLashing(root, pipe.position.clone().add(new THREE.Vector3(0, -0.06, 0)), 0.075, 0.2, materials, quality);
    }
    for (let index = 0; index < qualityAmount(quality, 6, 5, 4); index += 1) {
      const jar = sphere(0.11 + (index % 2) * 0.02, materials.sapglass, 9);
      jar.scale.y = 1.2;
      jar.position.set(-0.72 + index * 0.27, 0.38 + (index % 2) * 0.12, 0.54);
      root.add(jar);
    }
    const hangingCargo = createWovenHangingPod(materials, quality, 0.38);
    hangingCargo.position.set(-0.62, 0.72, 0.1);
    root.add(hangingCargo);
    root.add(tubeBetween(new THREE.Vector3(-0.62, 1.92, 0.1), new THREE.Vector3(-0.62, 1.02, 0.1), 0.014, materials.rope, 5));
    const counterweight = cylinder(0.11, 0.14, 0.3, materials.brass, 8);
    counterweight.position.set(0.52, 0.52, -0.22);
    root.add(counterweight);
    root.add(tubeBetween(new THREE.Vector3(0.52, 1.5, -0.22), new THREE.Vector3(0.52, 0.68, -0.22), 0.014, materials.rope, 5));
    addBuilderAt(root, new THREE.Vector3(-0.16, 1.58, 0.12), -0.3, materials, quality, 62, 0.7);
    addLantern(root, new THREE.Vector3(-0.82, 1.42, 0.34), materials, quality, 0.62);
  }
  return root;
}

function createArenaArchitecture(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island10RootheartMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_10_ROOTHEART_ARENA_ARCHITECTURE';
  const medallion = new THREE.Group();
  medallion.name = 'ISLAND_10_ROOTHEART_FLOOR_MEDALLION';
  for (const radius of [0.56, 1.03, 1.52]) {
    const ring = torus(radius, level === 1 ? 0.035 : 0.048, radius === 1.03 ? materials.brass : materials.rope, radialSegments(quality) * 3);
    ring.position.y = 0.015;
    medallion.add(ring);
  }
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2;
    medallion.add(tubeBetween(
      new THREE.Vector3(Math.cos(angle) * 0.58, 0.025, Math.sin(angle) * 0.58),
      new THREE.Vector3(Math.cos(angle) * 1.48, 0.025, Math.sin(angle) * 1.48),
      0.035,
      index % 2 ? materials.bamboo : materials.timber,
      6,
    ));
  }
  root.add(medallion);
  const pylonCount = 4;
  for (let index = 0; index < pylonCount; index += 1) {
    const angle = index / pylonCount * Math.PI * 2 + Math.PI / 4;
    const post = cylinder(0.09, 0.15, 0.42 + level * 0.07, index % 2 ? materials.brass : materials.bamboo, 7);
    post.position.set(Math.cos(angle) * 2.18, 0.23 + level * 0.035, Math.sin(angle) * 2.18);
    root.add(post);
    addLantern(root, new THREE.Vector3(Math.cos(angle) * 2.2, 0.48 + level * 0.05, Math.sin(angle) * 2.2), materials, quality, 0.72);
  }
  if (level >= 2) {
    for (let index = 0; index < 8; index += 1) {
      const angle = index / 8 * Math.PI * 2;
      root.add(curveTube([
        new THREE.Vector3(Math.cos(angle) * 2.34, 0.14, Math.sin(angle) * 2.34),
        new THREE.Vector3(Math.cos(angle + 0.08) * 2.05, 0.3, Math.sin(angle + 0.08) * 2.05),
        new THREE.Vector3(Math.cos(angle + 0.16) * 1.76, 0.17, Math.sin(angle + 0.16) * 1.76),
      ], 0.07, index % 2 ? materials.bark : materials.barkLight, quality, 14));
    }
    for (const side of [-1, 1]) {
      const winch = addWheel(root, 0.28, new THREE.Vector3(side * 1.58, 0.36, 0.28), materials, `ISLAND_10_ARENA_WINCH_${side < 0 ? 'LEFT' : 'RIGHT'}`, 8);
      winch.rotation.y = Math.PI / 2;
    }
    addBuilderAt(root, new THREE.Vector3(-1.18, 0.18, 0.82), 0.6, materials, quality, 71, 0.68);
    addBuilderAt(root, new THREE.Vector3(1.14, 0.18, -0.72), -2.5, materials, quality, 72, 0.68);
  }
  if (level >= 3) {
    const crown = new THREE.Group();
    crown.name = 'ISLAND_10_RESTORED_ROOT_CROWN';
    for (let index = 0; index < 12; index += 1) {
      const angle = index / 12 * Math.PI * 2;
      if (index % 3 === 0) continue;
      const rail = curveTube([
        new THREE.Vector3(Math.cos(angle - 0.085) * 2.31, 0.34, Math.sin(angle - 0.085) * 2.31),
        new THREE.Vector3(Math.cos(angle) * 2.36, 0.5, Math.sin(angle) * 2.36),
        new THREE.Vector3(Math.cos(angle + 0.085) * 2.31, 0.34, Math.sin(angle + 0.085) * 2.31),
      ], 0.035, index % 2 ? materials.brass : materials.rope, quality, 10);
      crown.add(rail);
    }
    root.add(crown);
    const centerHeart = sphere(0.2, materials.sapglass, quality === 'low' ? 8 : 12);
    centerHeart.scale.set(1.2, 0.45, 1.2);
    centerHeart.position.y = 0.08;
    root.add(centerHeart);
    const heartSpiralCount = qualityAmount(quality, 22, 18, 14);
    const heartSpiralPoints = Array.from({ length: heartSpiralCount }, (_, index) => {
      const t = index / Math.max(1, heartSpiralCount - 1);
      const radius = 0.22 + t * 0.92;
      const angle = t * Math.PI * 4.25;
      return new THREE.Vector3(Math.cos(angle) * radius, 0.075, Math.sin(angle) * radius);
    });
    root.add(curveTube(heartSpiralPoints, 0.024, materials.brass, quality, 26));
    const floorPanelCount = qualityAmount(quality, 12, 10, 8);
    for (let index = 0; index < floorPanelCount; index += 1) {
      const angle = index / floorPanelCount * Math.PI * 2;
      const floorPanel = box(0.46, 0.035, 0.2, index % 2 ? materials.timberDark : materials.timber);
      floorPanel.position.set(Math.cos(angle) * 1.72, 0.055, Math.sin(angle) * 1.72);
      floorPanel.rotation.y = -angle;
      root.add(floorPanel);
    }
    for (let index = 0; index < 4; index += 1) {
      const angle = index / 4 * Math.PI * 2 + Math.PI / 4;
      const toolRack = box(0.38, 0.08, 0.18, index % 2 ? materials.timber : materials.bamboo);
      toolRack.position.set(Math.cos(angle) * 1.92, 0.24, Math.sin(angle) * 1.92);
      toolRack.rotation.y = -angle;
      root.add(toolRack);
      const drum = cylinder(0.1, 0.13, 0.24, index % 2 ? materials.timberDark : materials.bamboo, 8);
      drum.position.set(Math.cos(angle + 0.16) * 1.86, 0.16, Math.sin(angle + 0.16) * 1.86);
      root.add(drum);
    }
    addBuilderAt(root, new THREE.Vector3(-0.62, 0.18, -1.4), 2.7, materials, quality, 73, 0.68);
    addBuilderAt(root, new THREE.Vector3(0.72, 0.18, 1.36), -0.4, materials, quality, 74, 0.68);
  }
  return root;
}

export function buildIsland10RootheartLandmark(
  definition: Island5LandmarkDefinition,
  level: BuildLevel,
  quality: Island3DQuality,
  materials: Island10RootheartMaterials,
) {
  const root = new THREE.Group();
  root.name = `ISLAND_10_ROOTHEART_${definition.id.toUpperCase()}_ROOT`;
  root.position.set(...definition.position);
  const partId: Island10RuntimePartId = definition.id === 'boss'
    ? 'rootheart-arena'
    : definition.id === 'hatchery'
      ? 'acorn-cradle-hatchery'
      : definition.id === 'habit'
        ? 'canopy-rhythm-lodge'
        : definition.id === 'wisdom'
          ? 'spiralwood-library'
          : 'firefly-pulley-workshop';
  const specPartId: Island10RuntimePartId = definition.id === 'boss'
    ? 'rootheart-arena'
    : definition.id === 'hatchery'
      ? 'acorn-hatchery'
      : definition.id === 'habit'
        ? 'rhythm-lodge'
        : definition.id === 'wisdom'
          ? 'spiral-library'
          : 'pulley-workshop';
  const focusSocket = new THREE.Object3D();
  focusSocket.name = `ISLAND_10_${definition.id.toUpperCase()}_FOCUS_SOCKET`;
  focusSocket.position.y = definition.id === 'boss' ? 0.55 : 1.28;
  root.add(focusSocket);
  const runtimeParts = [registerIsland10RuntimePart(partId, root, 'landmark')];
  if (specPartId !== partId) runtimeParts.push(registerIsland10RuntimePart(specPartId, root, 'landmark-spec-alias'));
  root.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    world: 'island-010-rootheart-canopy-city',
    parts: runtimeParts,
    sockets: { focus: focusSocket.name },
    colliders: [{ id: `${definition.id}-focus-trigger`, type: 'cylinder', isTrigger: true, radius: definition.id === 'boss' ? 2.45 : 1.2 }],
    destructionGroups: [{ id: `${definition.id}-architecture`, breakable: false, partIds: [partId] }],
    attachment: { parentId: 'landmark-network', parentSocket: `${definition.id}-branch-platform`, localStart: [0, 0, 0], localEnd: [0, 0.12, 0], contactType: 'embedded-and-lashed', embedDepth: 0.1, gapTolerance: 0.01 },
  };
  if (definition.id === 'boss') {
    const guardianSocket = new THREE.Object3D();
    guardianSocket.name = 'ISLAND_10_HIDDEN_GUARDIAN_SOCKET';
    guardianSocket.visible = false;
    guardianSocket.position.y = 0.22;
    guardianSocket.userData.guardianSelection = 'unresolved';
    guardianSocket.userData.sculptRuntime = { parts: [registerIsland10RuntimePart('hidden-guardian-socket', guardianSocket, 'arena-socket')] };
    root.add(guardianSocket);
  }
  if (level === 0) {
    if (definition.id !== 'boss') addPlatform(root, 0.74, materials, quality);
  } else {
    const resolved = level as 1 | 2 | 3;
    const architecture = definition.id === 'boss'
      ? createArenaArchitecture(resolved, quality, materials)
      : definition.id === 'hatchery'
        ? createHatchery(resolved, quality, materials)
        : definition.id === 'habit'
          ? createRhythmLodge(resolved, quality, materials)
          : definition.id === 'wisdom'
            ? createSpiralLibrary(resolved, quality, materials)
            : createPulleyWorkshop(resolved, quality, materials);
    if (definition.id !== 'boss') {
      const centerFacingRotation = Math.atan2(-definition.position[0], -definition.position[2]);
      architecture.rotation.y = definition.id === 'wisdom' || definition.id === 'event'
        ? centerFacingRotation + Math.PI
        : centerFacingRotation;
    }
    if (definition.id === 'boss') {
      architecture.scale.setScalar(1);
    } else {
      const footprintScale = resolved === 3 ? 1.48 : resolved === 2 ? 1.32 : 1.14;
      const verticalScale = resolved === 3 ? 1.78 : resolved === 2 ? 1.48 : 1.24;
      architecture.scale.set(footprintScale, verticalScale, footprintScale);
    }
    root.add(architecture);
    const detailPart: Island10RuntimePartId = definition.id === 'hatchery'
      ? 'hatchery-seed-shell'
      : definition.id === 'habit'
        ? 'rhythm-resonator-fan'
        : definition.id === 'wisdom'
          ? 'library-helical-balcony'
          : definition.id === 'event'
            ? 'workshop-crane-and-cargo'
            : 'arena-pylon-array';
    runtimeParts.push(registerIsland10RuntimePart(detailPart, architecture, 'landmark-architecture'));
    const additionalParts: Island10RuntimePartId[] = definition.id === 'hatchery'
      ? ['hatchery-suspension-lines', 'hatchery-nursery-pod-array']
      : definition.id === 'habit'
        ? ['rhythm-drum-array']
        : definition.id === 'wisdom'
          ? ['library-archive-band-array', 'library-observation-armillary']
          : definition.id === 'event'
            ? ['workshop-waterwheel', 'workshop-sapglass-vessels']
            : [];
    additionalParts.forEach((id) => runtimeParts.push(registerIsland10RuntimePart(id, architecture, 'landmark-detail')));
  }
  root.traverse((child) => { child.userData.landmarkId = definition.id; });
  mergeStaticMeshesByMaterial(root);
  markShadows(root, quality === 'high');
  return root;
}

function createBuilder(materials: Island10RootheartMaterials, quality: Island3DQuality, index: number) {
  const root = new THREE.Group();
  const body = cylinder(0.09, 0.12, 0.25, materials.builderCloth, 7);
  body.position.y = 0.18;
  const head = sphere(0.11, materials.barkLight, quality === 'low' ? 7 : 9);
  head.scale.set(1.05, 0.9, 0.9);
  head.position.y = 0.38;
  const muzzle = sphere(0.055, materials.seedShell, 7);
  muzzle.position.set(0, 0.35, 0.085);
  const nose = sphere(0.027, materials.timberDark, 6);
  nose.scale.set(1.05, 0.75, 0.7);
  nose.position.set(0, 0.37, 0.132);
  const leftEar = sphere(0.052, materials.bark, 6);
  const rightEar = leftEar.clone();
  leftEar.scale.set(0.72, 1, 0.52);
  rightEar.scale.copy(leftEar.scale);
  leftEar.position.set(-0.08, 0.45, 0);
  rightEar.position.set(0.08, 0.45, 0);
  const leftEye = sphere(0.014, materials.timberDark, 5);
  const rightEye = leftEye.clone();
  leftEye.position.set(-0.038, 0.405, 0.092);
  rightEye.position.set(0.038, 0.405, 0.092);
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 5), materials.bark);
  tail.scale.set(0.45, 1.15, 0.25);
  tail.position.set(0, 0.16, -0.11);
  tail.rotation.z = index % 2 ? 0.18 : -0.18;
  const tool = box(0.018, 0.22, 0.018, materials.brass);
  tool.position.set(index % 2 ? -0.13 : 0.13, 0.24, 0.02);
  tool.rotation.z = index % 2 ? -0.32 : 0.32;
  root.add(body, head, muzzle, nose, leftEar, rightEar, leftEye, rightEye, tail, tool);
  root.scale.setScalar(0.9);
  return root;
}

interface RootheartPowerworksRuntime {
  root: THREE.Group;
  animate: (elapsed: number) => void;
  setStage: (presentation: Island10RootheartPowerworksPresentation) => void;
  lightNodes: THREE.Object3D[];
}

function createMechanicalWheel(options: {
  name: string;
  radius: number;
  depth: number;
  spokeCount: number;
  paddleCount?: number;
  materials: Island10RootheartMaterials;
  quality: Island3DQuality;
  monochrome?: boolean;
}) {
  const pivot = new THREE.Group();
  pivot.name = options.name;
  pivot.userData.keepSeparate = true;
  const segments = qualityAmount(options.quality, 32, 24, 20);
  const timberMaterial = options.monochrome ? options.materials.brass : options.materials.timber;
  const darkTimberMaterial = options.monochrome ? options.materials.brass : options.materials.timberDark;
  for (const z of [-options.depth * 0.42, options.depth * 0.42]) {
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(options.radius, options.radius * 0.075, 6, segments),
      darkTimberMaterial,
    );
    rim.position.z = z;
    pivot.add(rim);
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(options.radius * 1.01, options.radius * 0.022, 5, segments),
      options.materials.brass,
    );
    band.position.z = z + Math.sign(z || 1) * 0.025;
    pivot.add(band);
  }
  for (let index = 0; index < options.spokeCount; index += 1) {
    const angle = index / options.spokeCount * Math.PI * 2;
    const spoke = box(options.radius * 1.62, options.radius * 0.055, options.depth * 0.48, index % 2 ? timberMaterial : darkTimberMaterial);
    spoke.rotation.z = angle;
    pivot.add(spoke);
  }
  const hub = cylinder(options.radius * 0.18, options.radius * 0.22, options.depth * 1.38, options.materials.brass, radialSegments(options.quality));
  hub.rotation.x = Math.PI / 2;
  pivot.add(hub);
  const paddleCount = options.paddleCount ?? 0;
  for (let index = 0; index < paddleCount; index += 1) {
    const angle = index / paddleCount * Math.PI * 2;
    const paddle = box(options.radius * 0.36, options.radius * 0.12, options.depth * 1.18, index % 3 ? timberMaterial : darkTimberMaterial);
    paddle.position.set(Math.cos(angle) * options.radius, Math.sin(angle) * options.radius, 0);
    paddle.rotation.z = angle;
    pivot.add(paddle);
  }
  mergeStaticMeshesByMaterial(pivot);
  pivot.userData.keepSeparate = true;
  return pivot;
}

function createRootheartPowerworks(
  materials: Island10RootheartMaterials,
  quality: Island3DQuality,
  runtimeParts: Island10RuntimePart[],
): RootheartPowerworksRuntime {
  const root = new THREE.Group();
  root.name = 'ISLAND_10_ROOTHEART_POWERWORKS';
  root.userData.keepSeparate = true;

  const frame = new THREE.Group();
  frame.name = 'ISLAND_10_POWERWORKS_WATER_GATE_ARRAY';
  // The first blockout sat deep behind the suspended underframe. Keep the
  // signature wheel and falling water on the visible waterfall plane so the
  // locked phone overview can actually explain what powers the city.
  const enginePlaneZ = 3.28;
  const framePosts = [-1.62, 1.62];
  framePosts.forEach((x) => {
    const post = cylinder(0.18, 0.25, 4.9, materials.bark, radialSegments(quality));
    post.position.set(x, -3.35, enginePlaneZ);
    frame.add(post);
    const bearing = cylinder(0.38, 0.42, 0.42, materials.brass, radialSegments(quality));
    bearing.rotation.x = Math.PI / 2;
    bearing.position.set(x, -3.35, enginePlaneZ);
    frame.add(bearing);
  });
  for (const y of [-5.4, -1.3]) {
    frame.add(tubeBetween(new THREE.Vector3(-1.75, y, enginePlaneZ), new THREE.Vector3(1.75, y, enginePlaneZ), 0.13, materials.timberDark, 7));
  }
  const sluice = new THREE.Group();
  sluice.name = 'ISLAND_10_POWERWORKS_SLUICE_GATES';
  const gateGeometry = new THREE.BoxGeometry(0.48, 0.62, 0.16);
  const gateInstances = new THREE.InstancedMesh(gateGeometry, materials.brass, 3);
  gateInstances.name = 'ISLAND_10_POWERWORKS_SYNCHRONIZED_SLUICE_GATE_ARRAY';
  const gateDummy = new THREE.Object3D();
  [-0.72, 0, 0.72].forEach((x, index) => {
    gateDummy.position.set(x, -0.54, enginePlaneZ - 0.14);
    gateDummy.updateMatrix();
    gateInstances.setMatrixAt(index, gateDummy.matrix);
    const channel = curveTube([
      new THREE.Vector3(x, -0.68, enginePlaneZ - 0.22),
      new THREE.Vector3(x + 0.06, -1.5, enginePlaneZ - 0.18),
      new THREE.Vector3(x - 0.08, -3.1, enginePlaneZ - 0.12),
      new THREE.Vector3(x, -6.15, enginePlaneZ - 0.08),
    ], 0.1, materials.waterMist, quality, 22);
    sluice.add(channel);
  });
  gateInstances.instanceMatrix.needsUpdate = true;
  sluice.add(gateInstances);
  frame.add(sluice);
  mergeStaticMeshesByMaterial(frame);
  frame.userData.keepSeparate = true;

  const heartwheel = createMechanicalWheel({
    name: 'ISLAND_10_POWERWORKS_HEARTWHEEL_PIVOT',
    radius: 1.82,
    depth: 0.72,
    spokeCount: 10,
    paddleCount: 16,
    materials,
    quality,
  });
  heartwheel.position.set(0, -3.36, enginePlaneZ);

  const transmission = new THREE.Group();
  transmission.name = 'ISLAND_10_POWERWORKS_TRANSMISSION_ARRAY';
  transmission.userData.keepSeparate = true;
  const transferWheel = createMechanicalWheel({
    name: 'ISLAND_10_POWERWORKS_TRANSFER_GEAR_A', radius: 0.68, depth: 0.34,
    spokeCount: 7, materials, quality, monochrome: true,
  });
  transferWheel.position.set(1.76, -2.55, enginePlaneZ + 0.12);
  transferWheel.scale.setScalar(0.92);
  const bevelWheel = createMechanicalWheel({
    name: 'ISLAND_10_POWERWORKS_TRANSFER_GEAR_B', radius: 0.48, depth: 0.28,
    spokeCount: 6, materials, quality, monochrome: true,
  });
  bevelWheel.position.set(1.68, -1.42, 2.78);
  transmission.add(transferWheel, bevelWheel);
  const verticalShaft = new THREE.Group();
  verticalShaft.name = 'ISLAND_10_POWERWORKS_VERTICAL_SHAFT';
  const shaftCore = cylinder(0.11, 0.13, 1.92, materials.brass, radialSegments(quality));
  const shaftKey = box(0.07, 1.72, 0.07, materials.brass);
  shaftKey.position.x = 0.12;
  verticalShaft.add(shaftCore, shaftKey);
  mergeStaticMeshesByMaterial(verticalShaft);
  verticalShaft.userData.keepSeparate = true;
  verticalShaft.position.set(1.68, -0.38, 2.78);
  transmission.add(verticalShaft);
  const governor = new THREE.Group();
  governor.name = 'ISLAND_10_POWERWORKS_FLYWHEEL_GOVERNOR';
  governor.position.set(1.68, 0.34, 2.78);
  const governorRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.045, 6, 24), materials.brass);
  governorRing.rotation.x = Math.PI / 2;
  governor.add(governorRing);
  for (const angle of [0, Math.PI / 2]) {
    const arm = box(0.72, 0.035, 0.04, materials.brass);
    arm.rotation.y = angle;
    governor.add(arm);
  }
  mergeStaticMeshesByMaterial(governor);
  governor.userData.keepSeparate = true;
  transmission.add(governor);

  const dynamo = new THREE.Group();
  dynamo.name = 'ISLAND_10_POWERWORKS_HEARTLIGHT_DYNAMO';
  dynamo.userData.keepSeparate = true;
  const base = cylinder(0.98, 1.1, 0.24, materials.timberDark, radialSegments(quality) * 2);
  base.position.y = -0.04;
  dynamo.add(base);
  const brassRail = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.055, 6, 28), materials.brass);
  brassRail.rotation.x = Math.PI / 2;
  brassRail.position.y = 0.18;
  dynamo.add(brassRail);
  const shell = cylinder(0.72, 0.84, 0.62, materials.timber, radialSegments(quality));
  shell.position.y = 0.24;
  dynamo.add(shell);
  const coreMaterial = materials.lantern.clone();
  coreMaterial.color.set(0xffcf62);
  coreMaterial.emissive.set(0xff7b20);
  coreMaterial.emissiveIntensity = 0;
  const core = sphere(0.32, coreMaterial, quality === 'low' ? 8 : 10);
  core.name = 'ISLAND_10_POWERWORKS_HEART_CORE';
  core.scale.set(1, 1.16, 0.66);
  core.position.set(0, 0.42, 0.58);
  dynamo.add(core);
  const flowerCrown = new THREE.Group();
  flowerCrown.name = 'ISLAND_10_POWERWORKS_FLOWER_CROWN';
  flowerCrown.position.y = 0.7;
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2;
    const leaf = sphere(0.19, index % 2 ? materials.leafLight : materials.leaf, 6);
    leaf.scale.set(1.35, 0.42, 0.72);
    leaf.position.set(Math.cos(angle) * 0.56, 0.03 + (index % 2) * 0.05, Math.sin(angle) * 0.56);
    leaf.rotation.set(0, -angle, angle + Math.PI / 2);
    flowerCrown.add(leaf);
  }
  mergeStaticMeshesByMaterial(flowerCrown);
  flowerCrown.userData.keepSeparate = true;
  dynamo.add(flowerCrown);

  const capacitorBank = new THREE.Group();
  capacitorBank.name = 'ISLAND_10_POWERWORKS_CAPACITOR_BANK';
  const capacitorMaterial = materials.sapglass.clone();
  capacitorMaterial.emissive = new THREE.Color(0xffa53b);
  capacitorMaterial.emissiveIntensity = 0;
  const capacitorGeometry = new THREE.CylinderGeometry(0.12, 0.15, 0.42, radialSegments(quality));
  const capacitorInstances = new THREE.InstancedMesh(capacitorGeometry, capacitorMaterial, 3);
  capacitorInstances.name = 'ISLAND_10_POWERWORKS_SAPGLASS_CAPACITORS';
  const capacitorCollarGeometry = new THREE.TorusGeometry(0.14, 0.025, 5, 12);
  const capacitorCollars = new THREE.InstancedMesh(capacitorCollarGeometry, materials.brass, 3);
  capacitorCollars.name = 'ISLAND_10_POWERWORKS_CAPACITOR_COLLARS';
  const capacitorTransforms: Array<{ position: THREE.Vector3; angle: number }> = [];
  const capacitorDummy = new THREE.Object3D();
  for (let index = 0; index < 3; index += 1) {
    const angle = -0.78 + index * 0.78;
    const position = new THREE.Vector3(Math.sin(angle) * 0.72, 0.36, 0.58 + Math.cos(angle) * 0.22);
    capacitorTransforms.push({ position, angle });
    capacitorDummy.position.copy(position);
    capacitorDummy.rotation.set(0, 0, 0);
    capacitorDummy.scale.setScalar(1);
    capacitorDummy.updateMatrix();
    capacitorInstances.setMatrixAt(index, capacitorDummy.matrix);
    capacitorDummy.position.copy(position).add(new THREE.Vector3(0, 0.2, 0));
    capacitorDummy.rotation.set(Math.PI / 2, 0, 0);
    capacitorDummy.updateMatrix();
    capacitorCollars.setMatrixAt(index, capacitorDummy.matrix);
  }
  capacitorInstances.instanceMatrix.needsUpdate = true;
  capacitorCollars.instanceMatrix.needsUpdate = true;
  capacitorBank.add(capacitorInstances, capacitorCollars);
  dynamo.add(capacitorBank);
  dynamo.position.set(0, 0.04, 0);

  const cableNetwork = new THREE.Group();
  cableNetwork.name = 'ISLAND_10_POWERWORKS_ROOT_CABLE_NETWORK';
  const cablePaths = [
    new THREE.Vector3(-4.35, 0.18, -3.88),
    new THREE.Vector3(4.35, 0.18, -3.88),
    new THREE.Vector3(-4.35, 0.18, 3.88),
    new THREE.Vector3(4.35, 0.18, 3.88),
  ];
  cablePaths.forEach((target, index) => {
    const side = index % 2 ? 1 : -1;
    cableNetwork.add(curveTube([
      new THREE.Vector3(side * 0.64, 0.08, index < 2 ? -0.3 : 0.3),
      target.clone().multiplyScalar(0.52).setY(-0.34),
      target.clone().setY(-0.08),
    ], 0.035, index % 2 ? materials.brass : materials.rope, quality, 18));
  });
  mergeStaticMeshesByMaterial(cableNetwork);
  cableNetwork.userData.keepSeparate = true;

  const pulseCount = 28;
  const pulsePositions = new Float32Array(pulseCount * 3);
  const pulseGeometry = new THREE.BufferGeometry();
  pulseGeometry.setAttribute('position', new THREE.BufferAttribute(pulsePositions, 3));
  const pulseMaterial = new THREE.PointsMaterial({ color: 0xffc95a, size: quality === 'low' ? 0.08 : 0.1, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const pulses = new THREE.Points(pulseGeometry, pulseMaterial);
  pulses.name = 'ISLAND_10_POWERWORKS_TRAVELLING_POWER_PULSES';
  cableNetwork.add(pulses);

  const poweredLights = new THREE.Group();
  poweredLights.name = 'ISLAND_10_POWERWORKS_POWERED_LIGHT_NETWORK';
  const poweredLightCount = 40;
  const poweredLightPositions = new Float32Array(poweredLightCount * 3);
  for (let index = 0; index < poweredLightCount; index += 1) {
    const angle = index / poweredLightCount * Math.PI * 2 + 0.18;
    const radius = 4.35 + (index % 5) * 0.36;
    poweredLightPositions[index * 3] = Math.cos(angle) * radius;
    poweredLightPositions[index * 3 + 1] = 0.28 + (index % 8) * 0.34;
    poweredLightPositions[index * 3 + 2] = Math.sin(angle) * radius;
  }
  const poweredLightGeometry = new THREE.BufferGeometry();
  poweredLightGeometry.setAttribute('position', new THREE.BufferAttribute(poweredLightPositions, 3));
  const poweredLightMaterial = new THREE.PointsMaterial({
    color: 0xffc75f,
    size: quality === 'low' ? 0.18 : 0.22,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const poweredLightField = new THREE.Points(poweredLightGeometry, poweredLightMaterial);
  poweredLightField.name = 'ISLAND_10_POWERWORKS_CITY_LIGHT_FIELD';
  poweredLights.add(poweredLightField);

  root.add(frame, heartwheel, transmission, dynamo, cableNetwork, poweredLights);
  runtimeParts.push(registerIsland10RuntimePart('rootheart-powerworks', root, 'signature-mission'));
  runtimeParts.push(registerIsland10RuntimePart('powerworks-water-gate-array', frame, 'signature-mission'));
  runtimeParts.push(registerIsland10RuntimePart('powerworks-heartwheel', heartwheel, 'signature-mission'));
  runtimeParts.push(registerIsland10RuntimePart('powerworks-transmission-array', transmission, 'signature-mission'));
  runtimeParts.push(registerIsland10RuntimePart('powerworks-heartlight-dynamo', dynamo, 'signature-mission'));
  runtimeParts.push(registerIsland10RuntimePart('powerworks-capacitor-bank', capacitorBank, 'signature-mission'));
  runtimeParts.push(registerIsland10RuntimePart('powerworks-cable-network', cableNetwork, 'signature-mission'));
  runtimeParts.push(registerIsland10RuntimePart('powerworks-powered-light-network', poweredLights, 'signature-mission'));

  let stage: 0 | 1 | 2 | 3 = 0;
  let transitionProgress = 1;
  let constructionSequence = 0;
  let constructionStartedAt = -Infinity;
  const setStage = (presentation: Island10RootheartPowerworksPresentation) => {
    stage = Math.max(0, Math.min(3, Math.floor(presentation.buildStage))) as 0 | 1 | 2 | 3;
    const requestedSequence = Math.max(0, Math.floor(presentation.constructionSequence ?? 0));
    if (requestedSequence > constructionSequence) {
      constructionSequence = requestedSequence;
      constructionStartedAt = typeof performance === 'undefined' ? 0 : performance.now();
    }
    const constructionElapsed = typeof performance === 'undefined' ? 2_000 : performance.now() - constructionStartedAt;
    transitionProgress = presentation.transitionProgress == null && Number.isFinite(constructionStartedAt)
      ? THREE.MathUtils.clamp(constructionElapsed / 1_800, 0, 1)
      : THREE.MathUtils.clamp(presentation.transitionProgress ?? 1, 0, 1);
    frame.visible = stage >= 1;
    heartwheel.visible = stage >= 1;
    transmission.visible = stage >= 2;
    dynamo.visible = stage >= 2;
    cableNetwork.visible = stage >= 3;
    poweredLights.visible = stage >= 3;
    // Reduced-motion rendering skips animate(), so stage application must
    // still leave a complete, warmly powered static city.
    coreMaterial.emissiveIntensity = stage < 2 ? 0 : stage === 2 ? 0.65 : 1.42;
    capacitorMaterial.emissiveIntensity = stage < 2 ? 0 : stage === 2 ? 0.22 : 1.1;
    pulseMaterial.opacity = stage >= 3 ? 0.62 : 0;
    poweredLightMaterial.opacity = stage >= 3 ? 0.72 : 0;
  };
  setStage({ buildStage: 0 });

  const animate = (elapsed: number) => {
    const ramp = 1 - Math.pow(1 - transitionProgress, 3);
    const wheelSpeed = (stage === 1 ? 0.11 : stage === 2 ? 0.2 : stage === 3 ? 0.27 : 0) * ramp;
    heartwheel.rotation.z = elapsed * wheelSpeed;
    transferWheel.rotation.z = -elapsed * wheelSpeed * 2.68;
    bevelWheel.rotation.z = elapsed * wheelSpeed * 3.76;
    verticalShaft.rotation.y = elapsed * wheelSpeed * 4.1;
    governor.rotation.y = -elapsed * wheelSpeed * 5.2;
    coreMaterial.emissiveIntensity = stage < 2 ? 0 : (stage === 2 ? 0.65 : 1.5) + Math.sin(elapsed * 2.1) * 0.08;
    const electricalCycle = (elapsed * 0.18) % 1;
    let capacitorChargeSum = 0;
    capacitorTransforms.forEach(({ position }, index) => {
      const chargeStart = 0.08 + index * 0.12;
      const chargedIn = THREE.MathUtils.smoothstep(electricalCycle, chargeStart, chargeStart + 0.17);
      const discharged = 1 - THREE.MathUtils.smoothstep(electricalCycle, 0.78, 0.94);
      const charged = stage >= 3 ? chargedIn * discharged : 0;
      capacitorChargeSum += charged;
      capacitorDummy.position.copy(position);
      capacitorDummy.rotation.set(0, 0, 0);
      capacitorDummy.scale.set(1 + charged * 0.06, 1 + charged * 0.12, 1 + charged * 0.06);
      capacitorDummy.updateMatrix();
      capacitorInstances.setMatrixAt(index, capacitorDummy.matrix);
    });
    capacitorInstances.instanceMatrix.needsUpdate = true;
    capacitorMaterial.emissiveIntensity = stage === 2 ? 0.22 : 0.35 + capacitorChargeSum / 3 * 1.35;
    if (stage >= 3) {
      const pulseLaunch = THREE.MathUtils.smoothstep(electricalCycle, 0.42, 0.56);
      for (let index = 0; index < pulseCount; index += 1) {
        const branch = index % 4;
        const target = cablePaths[branch];
        const t = (pulseLaunch * 0.82 + index / pulseCount + branch * 0.055) % 1;
        const eased = t * t * (3 - 2 * t);
        pulsePositions[index * 3] = THREE.MathUtils.lerp(0, target.x, eased);
        pulsePositions[index * 3 + 1] = -0.08 - Math.sin(Math.PI * eased) * 0.28;
        pulsePositions[index * 3 + 2] = THREE.MathUtils.lerp(0, target.z, eased);
      }
      (pulseGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      pulseMaterial.opacity = 0.42 + pulseLaunch * 0.5;
      const cityArrival = THREE.MathUtils.smoothstep(electricalCycle, 0.58, 0.9);
      const warmBreath = (Math.sin(elapsed * 0.82) + 1) * 0.5;
      poweredLightMaterial.opacity = 0.62 + cityArrival * 0.18 + warmBreath * 0.12;
      poweredLightMaterial.size = (quality === 'low' ? 0.18 : 0.22) + cityArrival * 0.045 + warmBreath * 0.018;
    } else {
      pulseMaterial.opacity = 0;
      poweredLightMaterial.opacity = 0;
    }
  };

  return { root, animate, setStage, lightNodes: [poweredLightField] };
}

export function createIsland10RootheartLivingAmbience(
  scene: THREE.Scene,
  profile: Island3DQualityProfile,
  materials: Island10RootheartMaterials,
  sharedWater: THREE.Mesh,
): Island10RootheartAmbienceRuntime {
  const requestedQuality = profile.id;
  // The canopy world gets its visual richness from layered silhouettes,
  // practical lights and motion—not invisible cylinder subdivisions. Capping
  // ambience tessellation at Medium keeps the High phone tier inside the same
  // mobile budget while landmarks retain their requested High detail.
  const quality: Island3DQuality = requestedQuality === 'high' ? 'medium' : requestedQuality;
  sharedWater.visible = false;
  const root = new THREE.Group();
  root.name = 'ISLAND_10_ROOTHEART_CANOPY_LIVING_AMBIENCE';
  const runtimeParts: Island10RuntimePart[] = [];
  const movingLifts: THREE.Group[] = [];
  root.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    world: 'island-010-rootheart-canopy-city',
    parts: runtimeParts,
    sockets: { ambience: 'ISLAND_10_AMBIENCE_ORIGIN_SOCKET' },
    colliders: [{ id: 'island-010-canopy-envelope', type: 'compound', isTrigger: false }],
    destructionGroups: [{ id: 'rootheart-world-static', breakable: false, partIds: ['three-tree-frame', 'board-underframe'] }],
  };

  const treeFrame = new THREE.Group();
  treeFrame.name = 'ISLAND_10_THREE_TREE_FRAME';
  const trunkDefinitions = [
    { x: -2.35, z: -6.3, radius: 1.08, height: 13.5, lean: 0.09 },
    { x: -6.4, z: 2.55, radius: 1.05, height: 12.2, lean: 0.1 },
    { x: 6.3, z: 2.8, radius: 1.08, height: 12.6, lean: -0.08 },
  ];
  trunkDefinitions.forEach((definition, trunkIndex) => {
    const trunk = new THREE.Group();
    trunk.name = `ISLAND_10_PRIMARY_TRUNK_${trunkIndex + 1}`;
    for (let segment = 0; segment < 4; segment += 1) {
      const height = definition.height / 4 + 0.16;
      const lowerScale = 1 - segment * 0.13;
      const trunkSegment = cylinder(definition.radius * (lowerScale - 0.08), definition.radius * lowerScale, height, segment % 2 ? materials.barkLight : materials.bark, radialSegments(quality));
      const bendPhase = trunkIndex * 1.73 + segment * 0.92;
      const lateralSway = Math.sin(bendPhase) * 0.11 * segment;
      const depthSway = Math.cos(bendPhase * 0.83) * 0.075 * segment;
      trunkSegment.position.set(
        definition.x + definition.lean * segment * 0.42 + lateralSway,
        -2.15 + segment * (height - 0.09),
        definition.z + depthSway,
      );
      trunkSegment.rotation.set(
        Math.sin(bendPhase * 0.7) * 0.035,
        bendPhase * 0.07,
        definition.lean + Math.cos(bendPhase) * 0.035,
      );
      trunkSegment.scale.set(1 + Math.sin(bendPhase) * 0.045, 1.02, 1 - Math.sin(bendPhase) * 0.035);
      trunk.add(trunkSegment);
    }
    const ridgeCount = qualityAmount(quality, 8, 6, 4);
    for (let ridgeIndex = 0; ridgeIndex < ridgeCount; ridgeIndex += 1) {
      const angle = ridgeIndex / ridgeCount * Math.PI * 2 + trunkIndex * 0.37;
      const ridgeRadius = definition.radius * (0.78 + (ridgeIndex % 2) * 0.08);
      const ridgePoint = (ridgeAngle: number, radius: number, y: number) => new THREE.Vector3(
        definition.x + Math.cos(ridgeAngle) * radius,
        y,
        definition.z + Math.sin(ridgeAngle) * radius,
      );
      trunk.add(curveTube([
        ridgePoint(angle, ridgeRadius, -1.9),
        ridgePoint(angle + 0.12, ridgeRadius * 0.9, 1.1),
        ridgePoint(angle + 0.26, ridgeRadius * 0.68, 4.2),
        ridgePoint(angle + 0.38, ridgeRadius * 0.48, 7.1),
      ], 0.045 + (ridgeIndex % 3) * 0.009, ridgeIndex % 2 ? materials.barkLight : materials.bark, quality, 24));
    }
    for (let buttressIndex = 0; buttressIndex < 5; buttressIndex += 1) {
      const angle = buttressIndex / 5 * Math.PI * 2 + trunkIndex * 0.51;
      const outward = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      const trunkOrigin = new THREE.Vector3(definition.x, 0, definition.z);
      trunk.add(curveTube([
        trunkOrigin.clone().add(outward.clone().multiplyScalar(definition.radius * 0.62)).setY(-0.7),
        trunkOrigin.clone().add(outward.clone().multiplyScalar(definition.radius * 1.2)).setY(-1.55),
        trunkOrigin.clone().add(outward.clone().multiplyScalar(definition.radius * 1.9)).setY(-2.12),
      ], 0.13, materials.bark, quality, 16));
    }
    const trunkPartId: Island10RuntimePartId = trunkIndex === 0 ? 'primary-trunk-rear' : trunkIndex === 1 ? 'primary-trunk-left' : 'primary-trunk-right';
    trunk.userData.sculptRuntime = { parts: [registerIsland10RuntimePart(trunkPartId, trunk, 'trunk')] };
    treeFrame.add(trunk);
  });
  const crownBranchNetwork = new THREE.Group();
  crownBranchNetwork.name = 'ISLAND_10_CROWN_BRANCH_NETWORK';
  const crownBranches = [
    [new THREE.Vector3(-2.2, 4.3, -6.3), new THREE.Vector3(-3.5, 5.3, -5.25), new THREE.Vector3(-5.8, 5.9, -3.1)],
    [new THREE.Vector3(-2.05, 5.2, -6.25), new THREE.Vector3(1.1, 6.15, -5.25), new THREE.Vector3(6.0, 6.5, -2.8)],
    [new THREE.Vector3(-6.35, 3.4, 2.55), new THREE.Vector3(-6.9, 4.8, 0.4), new THREE.Vector3(-6.1, 6.3, -2.6)],
    [new THREE.Vector3(6.25, 3.5, 2.8), new THREE.Vector3(7.0, 5.0, 0.5), new THREE.Vector3(6.2, 6.4, -2.5)],
    [new THREE.Vector3(-6.2, 1.9, 2.5), new THREE.Vector3(-5.9, 2.9, 4.7), new THREE.Vector3(-4.1, 4.1, 6.0)],
    [new THREE.Vector3(6.2, 2.0, 2.75), new THREE.Vector3(5.9, 3.0, 4.9), new THREE.Vector3(4.0, 4.2, 6.1)],
  ];
  crownBranches.forEach((points, index) => {
    const branch = curveTube(points, index < 2 ? 0.48 : 0.38, index % 2 ? materials.bark : materials.barkLight, quality, 30);
    branch.name = `ISLAND_10_CROWN_BRANCH_${index + 1}`;
    crownBranchNetwork.add(branch);
  });
  treeFrame.add(crownBranchNetwork);
  runtimeParts.push(registerIsland10RuntimePart('three-tree-frame', treeFrame, 'world-frame'));
  runtimeParts.push(registerIsland10RuntimePart('trunk-network', treeFrame, 'world-frame'));

  const verticalCity = new THREE.Group();
  verticalCity.name = 'ISLAND_10_VERTICAL_CANOPY_CITY';
  trunkDefinitions.forEach((definition, trunkIndex) => {
    verticalCity.add(createTrunkBalconyDistrict(
      new THREE.Vector3(definition.x, 0, definition.z),
      trunkIndex,
      materials,
      quality,
    ));
  });
  const perimeterBridge = createExteriorSuspensionBridge(
    new THREE.Vector3(-5.55, 2.18, 5.05),
    new THREE.Vector3(5.55, 2.24, 5.15),
    0.72,
    materials,
    quality,
  );
  perimeterBridge.name = 'ISLAND_10_FRONT_PERIMETER_SUSPENSION_BRIDGE';
  verticalCity.add(perimeterBridge);

  const podDefinitions = [
    new THREE.Vector3(-4.8, 5.15, -4.25),
    new THREE.Vector3(4.9, 5.45, -4.05),
    new THREE.Vector3(-7.25, 4.35, 1.1),
    new THREE.Vector3(7.35, 4.65, 1.35),
    new THREE.Vector3(-6.9, 2.8, 4.15),
    new THREE.Vector3(6.95, 3.1, 4.3),
  ];
  podDefinitions.slice(0, qualityAmount(quality, 6, 5, 4)).forEach((position, index) => {
    const pod = createWovenHangingPod(materials, quality, 0.8 + (index % 3) * 0.13);
    pod.name = `ISLAND_10_HANGING_POD_${index + 1}`;
    pod.position.copy(position);
    verticalCity.add(pod);
    const anchor = position.clone().add(new THREE.Vector3(index % 2 ? 0.8 : -0.8, 1.7 + (index % 2) * 0.35, -0.2));
    verticalCity.add(curveTube([position.clone().add(new THREE.Vector3(0, 0.42, 0)), position.clone().lerp(anchor, 0.5).add(new THREE.Vector3(0, -0.18, 0)), anchor], 0.02, materials.rope, quality, 18));
    addLantern(verticalCity, position.clone().add(new THREE.Vector3(0, -0.48, 0)), materials, quality, 0.55);
  });

  [-1, 1].forEach((side, liftIndex) => {
    const liftX = side * 7.35;
    const liftZ = 3.15 + liftIndex * 0.22;
    const frame = new THREE.Group();
    frame.name = `ISLAND_10_CARGO_LIFT_FRAME_${liftIndex + 1}`;
    for (const zOffset of [-0.32, 0.32]) {
      frame.add(tubeBetween(new THREE.Vector3(liftX, -0.6, liftZ + zOffset), new THREE.Vector3(liftX, 5.0, liftZ + zOffset), 0.045, materials.bamboo, 7));
    }
    for (let braceIndex = 0; braceIndex < 5; braceIndex += 1) {
      const y = 0.05 + braceIndex * 1.12;
      frame.add(tubeBetween(new THREE.Vector3(liftX, y, liftZ - 0.32), new THREE.Vector3(liftX, y + 0.5, liftZ + 0.32), 0.024, materials.rope, 5));
    }
    verticalCity.add(frame);

    const lift = new THREE.Group();
    lift.name = `ISLAND_10_MOVING_CARGO_LIFT_${liftIndex + 1}`;
    lift.userData.keepSeparate = true;
    lift.userData.baseY = 0.58 + liftIndex * 0.42;
    lift.userData.phase = liftIndex * Math.PI * 0.72;
    lift.position.set(liftX, Number(lift.userData.baseY), liftZ);
    const basket = box(0.82, 0.12, 0.68, materials.timber);
    lift.add(basket);
    for (const xOffset of [-0.36, 0.36]) {
      for (const zOffset of [-0.28, 0.28]) {
        const post = cylinder(0.025, 0.032, 0.58, materials.bamboo, 6);
        post.position.set(xOffset, 0.32, zOffset);
        lift.add(post);
      }
    }
    const basketRail = torus(0.38, 0.022, materials.rope, 18);
    basketRail.scale.z = 0.78;
    basketRail.position.y = 0.55;
    lift.add(basketRail);
    addLantern(lift, new THREE.Vector3(0, 0.22, 0), materials, quality, 0.5);
    verticalCity.add(lift);
    movingLifts.push(lift);
  });

  // A distant inhabited band gives the phone overview the same "city all the
  // way through the canopy" depth as the selected concept. It stays well
  // behind the canonical route, so these silhouettes enrich the valley
  // without becoming landmark hit targets or board occluders.
  const backVillagePositions = [
    new THREE.Vector3(-7.1, 2.15, -9.0),
    new THREE.Vector3(-3.75, 3.35, -8.72),
    new THREE.Vector3(0, 2.72, -9.08),
    new THREE.Vector3(3.75, 3.48, -8.72),
    new THREE.Vector3(7.1, 2.28, -9.0),
  ];
  backVillagePositions.slice(0, qualityAmount(quality, 5, 5, 4)).forEach((position, index) => {
    const villagePod = new THREE.Group();
    villagePod.position.copy(position);
    const platform = cylinder(0.78, 0.86, 0.14, index % 2 ? materials.timber : materials.timberDark, radialSegments(quality));
    villagePod.add(platform);
    const cabin = box(0.74, 0.66, 0.56, index % 2 ? materials.barkLight : materials.bark);
    cabin.position.set(0, 0.4, 0);
    villagePod.add(cabin);
    const roof = cylinder(0.06, 0.58, 0.48, index % 2 ? materials.leaf : materials.leafLight, radialSegments(quality));
    roof.position.set(0, 0.92, 0);
    villagePod.add(roof);
    addWarmWindow(villagePod, new THREE.Vector3(0, 0.42, 0.3), materials, 0.29, 0.34);
    for (let postIndex = 0; postIndex < 6; postIndex += 1) {
      const angle = postIndex / 6 * Math.PI * 2;
      const post = cylinder(0.016, 0.021, 0.28, materials.bamboo, 5);
      post.position.set(Math.cos(angle) * 0.7, 0.18, Math.sin(angle) * 0.7);
      villagePod.add(post);
    }
    const rail = torus(0.7, 0.02, materials.rope, radialSegments(quality) * 2);
    rail.position.y = 0.32;
    villagePod.add(rail);
    addLantern(villagePod, new THREE.Vector3(index % 2 ? 0.52 : -0.52, 0.26, 0.34), materials, quality, 0.62);
    if (index % 2 === 1) addBuilderAt(villagePod, new THREE.Vector3(-0.28, 0.18, 0.48), 0.25, materials, quality, 120 + index, 0.55);
    verticalCity.add(villagePod);
    verticalCity.add(curveTube([
      position.clone().add(new THREE.Vector3(0, 1.12, 0)),
      position.clone().add(new THREE.Vector3(index % 2 ? 0.4 : -0.4, 2.1, -0.08)),
      position.clone().add(new THREE.Vector3(index % 2 ? 0.82 : -0.82, 3.0, -0.16)),
    ], 0.018, materials.rope, quality, 18));
  });
  for (let index = 0; index < backVillagePositions.length - 1; index += 1) {
    const start = backVillagePositions[index].clone().add(new THREE.Vector3(0.62, 0.04, 0));
    const end = backVillagePositions[index + 1].clone().add(new THREE.Vector3(-0.62, 0.04, 0));
    const bridge = createExteriorSuspensionBridge(start, end, 0.38, materials, quality);
    bridge.name = `ISLAND_10_BACK_VILLAGE_BRIDGE_${index + 1}`;
    verticalCity.add(bridge);
  }
  runtimeParts.push(registerIsland10RuntimePart('ambient-canopy', verticalCity, 'vertical-city'));

  const landmarkSupportCity = new THREE.Group();
  landmarkSupportCity.name = 'ISLAND_10_LANDMARK_SUPPORT_CITY';
  const supportDistricts = [
    new THREE.Vector3(-4.36, 0, -3.9),
    new THREE.Vector3(4.36, 0, -3.9),
    new THREE.Vector3(-4.36, 0, 3.9),
    new THREE.Vector3(4.36, 0, 3.9),
  ];
  supportDistricts.forEach((position, districtIndex) => {
    const supportRoot = new THREE.Group();
    supportRoot.position.copy(position);
    const core = cylinder(0.46, 0.64, 3.35, districtIndex % 2 ? materials.barkLight : materials.bark, radialSegments(quality));
    core.position.y = -1.48;
    supportRoot.add(core);
    for (let tier = 0; tier < 4; tier += 1) {
      const y = -0.58 - tier * 0.88;
      const radius = 1.02 - tier * 0.08;
      const deck = cylinder(radius, radius * 1.05, 0.12, tier % 2 ? materials.timberDark : materials.timber, radialSegments(quality));
      deck.position.y = y;
      supportRoot.add(deck);
      const rail = torus(radius * 0.94, 0.025, materials.brass, radialSegments(quality) * 2);
      rail.position.y = y + 0.31;
      supportRoot.add(rail);
      for (let postIndex = 0; postIndex < 7; postIndex += 1) {
        const angle = postIndex / 7 * Math.PI * 2;
        const post = cylinder(0.018, 0.024, 0.32, materials.bamboo, 5);
        post.position.set(Math.cos(angle) * radius * 0.94, y + 0.17, Math.sin(angle) * radius * 0.94);
        supportRoot.add(post);
      }
      addLantern(supportRoot, new THREE.Vector3(tier ? 0.68 : -0.7, y + 0.26, 0.48), materials, quality, 0.62);
      if (tier === 0 || tier === 2) addBuilderAt(supportRoot, new THREE.Vector3(0.3, y + 0.1, 0.68), -0.4, materials, quality, 90 + districtIndex * 2 + tier, 0.66);
      if (tier >= 2) {
        const cabin = box(0.82, 0.58, 0.62, tier % 2 ? materials.bark : materials.barkLight);
        cabin.position.set(-0.1, y + 0.34, 0);
        supportRoot.add(cabin);
        const roof = cylinder(0.05, 0.58, 0.42, tier % 2 ? materials.leaf : materials.leafLight, radialSegments(quality));
        roof.position.set(-0.1, y + 0.84, 0);
        supportRoot.add(roof);
        addWarmWindow(supportRoot, new THREE.Vector3(-0.1, y + 0.37, 0.325), materials, 0.31, 0.31);
      }
    }
    for (const xOffset of [-0.16, 0.16]) {
      supportRoot.add(tubeBetween(new THREE.Vector3(xOffset, -1.55, 0.58), new THREE.Vector3(xOffset, -0.42, 0.58), 0.022, materials.bamboo, 5));
    }
    for (let rungIndex = 0; rungIndex < 6; rungIndex += 1) {
      const y = -1.42 + rungIndex * 0.19;
      supportRoot.add(tubeBetween(new THREE.Vector3(-0.16, y, 0.58), new THREE.Vector3(0.16, y, 0.58), 0.016, materials.rope, 5));
    }
    landmarkSupportCity.add(supportRoot);
  });
  const lowerFrontBridge = createExteriorSuspensionBridge(
    new THREE.Vector3(-3.72, -1.2, 4.55),
    new THREE.Vector3(3.72, -1.2, 4.55),
    0.52,
    materials,
    quality,
  );
  lowerFrontBridge.name = 'ISLAND_10_LOWER_FRONT_CITY_BRIDGE';
  landmarkSupportCity.add(lowerFrontBridge);
  const deepFrontBridge = createExteriorSuspensionBridge(
    new THREE.Vector3(-3.5, -2.52, 4.55),
    new THREE.Vector3(3.5, -2.52, 4.55),
    0.45,
    materials,
    quality,
  );
  deepFrontBridge.name = 'ISLAND_10_DEEP_FRONT_CITY_BRIDGE';
  landmarkSupportCity.add(deepFrontBridge);

  const branchSupports = new THREE.Group();
  branchSupports.name = 'ISLAND_10_BRANCH_SUPPORT_NETWORK';
  const supportCurves = [
    [new THREE.Vector3(-2.25, 0.2, -5.85), new THREE.Vector3(-2.45, -0.05, -4.55), new THREE.Vector3(-2.6, -0.24, -3.55)],
    [new THREE.Vector3(-2.1, 0.1, -5.78), new THREE.Vector3(0.2, -0.08, -4.45), new THREE.Vector3(2.7, -0.23, -3.45)],
    [new THREE.Vector3(-5.85, 0.15, 2.4), new THREE.Vector3(-4.9, -0.05, 2.65), new THREE.Vector3(-4.15, -0.24, 2.85)],
    [new THREE.Vector3(5.8, 0.2, 2.6), new THREE.Vector3(4.9, -0.04, 2.75), new THREE.Vector3(4.12, -0.24, 2.9)],
    [new THREE.Vector3(-5.9, -0.4, 2.4), new THREE.Vector3(-3.9, -0.72, 0.8), new THREE.Vector3(-2.2, -0.64, 0.2)],
    [new THREE.Vector3(5.9, -0.38, 2.55), new THREE.Vector3(3.8, -0.72, 0.9), new THREE.Vector3(2.15, -0.64, 0.2)],
  ];
  supportCurves.forEach((points, index) => {
    const branch = curveTube(points, index < 4 ? 0.32 : 0.24, index % 2 ? materials.bark : materials.barkLight, quality, 24);
    branchSupports.add(branch);
  });
  const platformAngles = [-2.42, -0.72];
  platformAngles.forEach((angle, index) => {
    const lower = new THREE.Vector3(Math.cos(angle) * 5.65, 0.05, Math.sin(angle) * 5.65);
    const upper = new THREE.Vector3(Math.cos(angle) * 7.35, 5.15 + (index % 2) * 0.5, Math.sin(angle) * 7.35);
    branchSupports.add(curveTube([lower, lower.clone().lerp(upper, 0.5).add(new THREE.Vector3(index % 2 ? 0.32 : -0.32, -0.18, 0)), upper], 0.035, materials.rope, quality, 22));
    branchSupports.add(curveTube([lower.clone().add(new THREE.Vector3(0.22, 0, 0)), lower.clone().lerp(upper, 0.5).add(new THREE.Vector3(index % 2 ? 0.46 : -0.46, -0.1, 0.1)), upper.clone().add(new THREE.Vector3(0.18, 0, 0))], 0.024, materials.rope, quality, 22));
  });
  runtimeParts.push(registerIsland10RuntimePart('branch-support-network', branchSupports, 'world-supports'));

  const underframe = new THREE.Group();
  underframe.name = 'ISLAND_10_SUSPENDED_BOARD_UNDERFRAME';
  const outerBeam = torus(4.02, 0.15, materials.timberDark, radialSegments(quality) * 4);
  outerBeam.position.y = -0.22;
  const innerBeam = torus(2.78, 0.11, materials.timberDark, radialSegments(quality) * 4);
  innerBeam.position.y = -0.24;
  underframe.add(outerBeam, innerBeam);
  for (let index = 0; index < 12; index += 1) {
    const angle = index / 12 * Math.PI * 2;
    const beam = tubeBetween(
      new THREE.Vector3(Math.cos(angle) * 2.72, -0.25, Math.sin(angle) * 2.72),
      new THREE.Vector3(Math.cos(angle) * 4.1, -0.25, Math.sin(angle) * 4.1),
      0.075,
      materials.timber,
      6,
    );
    underframe.add(beam);
  }
  const supportBand = torus(4.38, 0.055, materials.brass, radialSegments(quality) * 4);
  supportBand.position.y = -0.12;
  underframe.add(supportBand);
  runtimeParts.push(registerIsland10RuntimePart('board-underframe', underframe, 'route-support'));
  runtimeParts.push(registerIsland10RuntimePart('board-brace-array', underframe, 'route-support'));

  const arena = new THREE.Group();
  arena.name = 'ISLAND_10_LOW_OPEN_ROOTHEART_ARENA';
  const arenaFloor = cylinder(2.45, 2.5, 0.24, materials.arenaFloor, radialSegments(quality) * 2);
  arenaFloor.position.y = -0.2;
  arena.add(arenaFloor);
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2;
    const brace = curveTube([
      new THREE.Vector3(Math.cos(angle) * 2.48, -0.24, Math.sin(angle) * 2.48),
      new THREE.Vector3(Math.cos(angle) * 2.15, -0.02, Math.sin(angle) * 2.15),
      new THREE.Vector3(Math.cos(angle) * 1.78, -0.18, Math.sin(angle) * 1.78),
    ], 0.07, materials.bark, quality, 12);
    arena.add(brace);
  }
  runtimeParts.push(registerIsland10RuntimePart('rootheart-arena', arena, 'arena-floor'));
  runtimeParts.push(registerIsland10RuntimePart('arena-floor', arena, 'arena-floor'));
  runtimeParts.push(registerIsland10RuntimePart('arena-root-braces', arena, 'arena-support'));

  const exteriorBridges = new THREE.Group();
  exteriorBridges.name = 'ISLAND_10_EXTERIOR_ROPE_RAILING_NETWORK';
  for (let index = 0; index < 4; index += 1) {
    const angleA = index / 4 * Math.PI * 2 + Math.PI / 4;
    const angleB = angleA + 0.45;
    const start = new THREE.Vector3(Math.cos(angleA) * 5.0, 0.15, Math.sin(angleA) * 5.0);
    const end = new THREE.Vector3(Math.cos(angleB) * 5.6, -0.05, Math.sin(angleB) * 5.6);
    exteriorBridges.add(curveTube([start, start.clone().lerp(end, 0.5).add(new THREE.Vector3(0, -0.22, 0)), end], 0.045, materials.rope, quality, 18));
  }
  runtimeParts.push(registerIsland10RuntimePart('rope-railing-network', exteriorBridges, 'exterior-bridges'));
  runtimeParts.push(registerIsland10RuntimePart('bridge-network', exteriorBridges, 'exterior-bridges'));

  const foliage = new THREE.Group();
  foliage.name = 'ISLAND_10_HANGING_GARDEN_NETWORK';
  const foliageCount = qualityAmount(quality, 78, 64, 48);
  for (let index = 0; index < foliageCount; index += 1) {
    const angle = (index * 2.39996) % (Math.PI * 2);
    const radius = 5.1 + (index % 5) * 0.52;
    const cluster = sphere(0.42 + (index % 3) * 0.11, index % 2 ? materials.leaf : materials.leafLight, quality === 'low' ? 6 : 8);
    sculptCanopyCluster(cluster.geometry, index * 0.47 + 0.8);
    cluster.scale.set(1.08, 0.82 + (index % 4) * 0.14, 0.96);
    cluster.rotation.set(
      Math.sin(index * 1.3) * 0.22,
      angle + Math.PI / 2,
      Math.sin(index * 0.73) * 0.5,
    );
    let x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius - 0.9;
    if (Math.abs(x) < 4.35) x = (x < 0 ? -1 : 1) * (4.75 + (index % 4) * 0.36);
    cluster.position.set(x, 1.2 + (index % 7) * 0.86, z);
    if (index < 9) {
      const crownTrunk = trunkDefinitions[Math.floor(index / 3)];
      const crownPetal = index % 3;
      cluster.position.set(
        crownTrunk.x + (crownPetal - 1) * 0.82,
        8.55 + crownPetal * 0.38 + Math.abs(crownTrunk.lean) * 2.2,
        crownTrunk.z + (crownPetal % 2 ? 0.28 : -0.22),
      );
      cluster.scale.multiplyScalar(1.28);
      cluster.rotation.z += (crownPetal - 1) * 0.42;
    }
    foliage.add(cluster);
  }
  const vineCount = qualityAmount(quality, 24, 18, 12);
  for (let index = 0; index < vineCount; index += 1) {
    const angle = index / vineCount * Math.PI * 2 + 0.18;
    const radius = 6.3 + (index % 3) * 0.55;
    const top = new THREE.Vector3(Math.cos(angle) * radius, 5.6 + (index % 4) * 0.45, Math.sin(angle) * radius - 0.55);
    const bottom = new THREE.Vector3(Math.cos(angle + 0.08) * radius, 1.25 + (index % 3) * 0.38, Math.sin(angle + 0.08) * radius - 0.55);
    foliage.add(curveTube([
      top,
      top.clone().lerp(bottom, 0.5).add(new THREE.Vector3(Math.sin(index) * 0.26, -0.18, Math.cos(index) * 0.2)),
      bottom,
    ], 0.018, index % 2 ? materials.leaf : materials.leafLight, quality, 18));
    for (let leafIndex = 0; leafIndex < 3; leafIndex += 1) {
      const t = 0.24 + leafIndex * 0.25;
      const leaf = sphere(0.14 + (leafIndex % 2) * 0.03, leafIndex % 2 ? materials.leafLight : materials.leaf, 6);
      sculptCanopyCluster(leaf.geometry, index * 0.81 + leafIndex * 0.37);
      leaf.scale.set(1.05, 0.42, 0.72);
      leaf.rotation.z = (index % 2 ? -1 : 1) * (0.28 + leafIndex * 0.12);
      leaf.position.copy(top.clone().lerp(bottom, t)).add(new THREE.Vector3((index % 2 ? -1 : 1) * 0.14, 0, 0));
      foliage.add(leaf);
    }
  }
  runtimeParts.push(registerIsland10RuntimePart('hanging-garden-network', foliage, 'foliage'));

  const distantCanopy = new THREE.Group();
  distantCanopy.name = 'ISLAND_10_DISTANT_CANOPY_DEPTH';
  const distantTrunkCount = qualityAmount(quality, 11, 9, 7);
  for (let index = 0; index < distantTrunkCount; index += 1) {
    const normalized = distantTrunkCount === 1 ? 0.5 : index / (distantTrunkCount - 1);
    const x = THREE.MathUtils.lerp(-11.5, 11.5, normalized);
    const z = -10.8 - (index % 3) * 1.3;
    const height = 10.5 + (index % 4) * 1.4;
    const trunk = cylinder(0.38 + (index % 2) * 0.12, 0.58 + (index % 2) * 0.13, height, index % 2 ? materials.bark : materials.barkLight, 7);
    trunk.position.set(x, 1.0 + height / 2, z);
    trunk.rotation.z = Math.sin(index * 1.7) * 0.05;
    distantCanopy.add(trunk);
    for (let clusterIndex = 0; clusterIndex < 3; clusterIndex += 1) {
      const cluster = sphere(1.15 + clusterIndex * 0.2, clusterIndex % 2 ? materials.leafLight : materials.leaf, 7);
      sculptCanopyCluster(cluster.geometry, index * 0.64 + clusterIndex * 0.91);
      cluster.scale.set(1.12, 0.74, 1.02);
      cluster.rotation.set(
        Math.sin(index + clusterIndex) * 0.16,
        Math.PI / 2 + Math.sin(index * 0.7) * 0.42,
        Math.sin(index * 1.2 + clusterIndex) * 0.3,
      );
      cluster.position.set(
        x + (clusterIndex - 1) * 1.05,
        4.35 + clusterIndex * 1.12 + (index % 3) * 0.28,
        z + Math.sin(clusterIndex * 2.1) * 0.7,
      );
      distantCanopy.add(cluster);
    }
    if (index % 2 === 0) {
      addLantern(distantCanopy, new THREE.Vector3(x + 0.55, 3.2 + (index % 3) * 0.42, z + 0.8), materials, quality, 0.7);
      distantCanopy.add(curveTube([
        new THREE.Vector3(x - 0.45, 7.2, z + 0.35),
        new THREE.Vector3(x - 0.18, 4.9, z + 0.55),
        new THREE.Vector3(x - 0.38, 2.5, z + 0.82),
      ], 0.018, materials.rope, quality, 16));
    }
  }

  const lanterns = new THREE.Group();
  lanterns.name = 'ISLAND_10_LANTERN_DEPTH_ARRAY';
  const lanternCount = qualityAmount(quality, 44, 34, 26);
  for (let index = 0; index < lanternCount; index += 1) {
    const angle = index / lanternCount * Math.PI * 2 + 0.2;
    const radius = 4.65 + (index % 4) * 0.5;
    addLantern(lanterns, new THREE.Vector3(Math.cos(angle) * radius, 0.2 + (index % 5) * 0.62, Math.sin(angle) * radius), materials, quality, 0.72 + (index % 3) * 0.12);
  }
  runtimeParts.push(registerIsland10RuntimePart('lantern-depth-array', lanterns, 'warm-practicals'));
  runtimeParts.push(registerIsland10RuntimePart('lantern-network', lanterns, 'warm-practicals'));
  const warmCanopyLights = [
    new THREE.PointLight(0xffaa53, quality === 'low' ? 1.25 : 1.7, 6.5, 2),
    new THREE.PointLight(0xffc66d, quality === 'low' ? 1.1 : 1.55, 6.2, 2),
    new THREE.PointLight(0x8fd77e, quality === 'low' ? 0.65 : 0.9, 7, 2),
  ];
  warmCanopyLights[0].position.set(-4.4, 2.3, -3.6);
  warmCanopyLights[1].position.set(4.5, 2.3, -3.5);
  warmCanopyLights[2].position.set(0, 1.4, 1.2);
  lanterns.add(...warmCanopyLights);

  const waterfall = new THREE.Group();
  waterfall.name = 'ISLAND_10_WATERFALL_DEPTH_LAYER';
  const waterfallStreamCount = qualityAmount(quality, 7, 5, 4);
  for (let index = 0; index < waterfallStreamCount; index += 1) {
    const normalized = waterfallStreamCount === 1 ? 0.5 : index / (waterfallStreamCount - 1);
    const x = THREE.MathUtils.lerp(-1.05, 1.05, normalized);
    const phase = index * 0.73;
    const stream = curveTube([
      new THREE.Vector3(x, 5.35, -8.45 + Math.sin(phase) * 0.08),
      new THREE.Vector3(x + Math.sin(phase + 0.6) * 0.16, 2.25, -8.38),
      new THREE.Vector3(x + Math.sin(phase + 1.2) * 0.22, -0.85, -8.32),
      new THREE.Vector3(x + Math.sin(phase + 1.8) * 0.12, -4.0, -8.28),
    ], 0.1 + (index % 3) * 0.025, materials.waterMist, quality, 32);
    stream.name = `ISLAND_10_WATERFALL_STREAM_${index + 1}`;
    waterfall.add(stream);
  }
  const mist = sphere(1.55, materials.waterMist, 10);
  mist.scale.set(1.3, 0.24, 0.55);
  mist.position.set(0, -3.75, -8.25);
  waterfall.add(mist);
  runtimeParts.push(registerIsland10RuntimePart('waterfall-depth-layer', waterfall, 'depth-atmosphere'));

  const builders = new THREE.Group();
  builders.name = 'ISLAND_10_BUILDER_NETWORK';
  // Inhabitants are an identity system, not optional confetti: preserve a
  // busy, legible workforce even on Low while keeping their geometry coarse.
  const builderCount = qualityAmount(quality, 28, 24, 20);
  for (let index = 0; index < builderCount; index += 1) {
    const angle = index / builderCount * Math.PI * 2 + 0.35;
    const builder = createBuilder(materials, quality, index);
    builder.position.set(Math.cos(angle) * (4.78 + (index % 2) * 0.58), 0.25 + (index % 3) * 0.38, Math.sin(angle) * (4.78 + (index % 2) * 0.58));
    builder.rotation.y = -angle + Math.PI / 2;
    builders.add(builder);
  }
  runtimeParts.push(registerIsland10RuntimePart('builder-network', builders, 'inhabitants'));

  const birdRoot = new THREE.Group();
  birdRoot.name = 'ISLAND_10_BIRD_MESSENGER_ARRAY';
  const birds: THREE.Object3D[] = [];
  for (let index = 0; index < qualityAmount(quality, 7, 4, 2); index += 1) {
    const bird = new THREE.Group();
    bird.userData.keepSeparate = true;
    const body = sphere(0.07, materials.barkLight, 6);
    const leftWing = box(0.2, 0.015, 0.07, materials.leaf);
    const rightWing = leftWing.clone();
    leftWing.position.x = -0.12;
    rightWing.position.x = 0.12;
    bird.add(body, leftWing, rightWing);
    bird.userData.phase = index * 1.37;
    birdRoot.add(bird);
    birds.push(bird);
  }
  runtimeParts.push(registerIsland10RuntimePart('bird-messenger-array', birdRoot, 'inhabitants'));

  const particleCount = qualityAmount(quality, 100, 64, 34);
  const particlePositions = new Float32Array(particleCount * 3);
  for (let index = 0; index < particleCount; index += 1) {
    const angle = index * 2.39996;
    const radius = 2.6 + (index % 17) * 0.31;
    particlePositions[index * 3] = Math.cos(angle) * radius;
    particlePositions[index * 3 + 1] = -0.5 + (index % 23) * 0.27;
    particlePositions[index * 3 + 2] = Math.sin(angle) * radius - 0.8;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particles = new THREE.Points(particleGeometry, materials.firefly);
  particles.name = 'ISLAND_10_FIREFLY_POLLEN_FIELD';
  runtimeParts.push(registerIsland10RuntimePart('firefly-pollen-field', particles, 'particles'));
  runtimeParts.push(registerIsland10RuntimePart('particle-field', particles, 'particles'));

  const powerworks = createRootheartPowerworks(materials, quality, runtimeParts);
  let powerworksPresentation: Island10RootheartPowerworksPresentation = { buildStage: 0, transitionProgress: 1 };
  const updatePowerworksStage = (presentation: Island10RootheartPowerworksPresentation) => {
    powerworksPresentation = {
      buildStage: Math.max(0, Math.min(3, Math.floor(presentation.buildStage))) as 0 | 1 | 2 | 3,
      ...(presentation.transitionProgress == null
        ? {}
        : { transitionProgress: THREE.MathUtils.clamp(presentation.transitionProgress, 0, 1) }),
      constructionSequence: Math.max(0, Math.floor(presentation.constructionSequence ?? 0)),
    };
    powerworks.setStage(powerworksPresentation);
    const nightBlend = powerworksPresentation.buildStage / 3;
    scene.backgroundIntensity = THREE.MathUtils.lerp(1, 0.56, nightBlend);
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.set(0x665f3d).lerp(new THREE.Color(0x132b31), nightBlend);
      scene.fog.density = THREE.MathUtils.lerp(0.0036, 0.0052, nightBlend);
    }
  };
  updatePowerworksStage(powerworksPresentation);

  root.add(treeFrame, verticalCity, landmarkSupportCity, branchSupports, underframe, arena, exteriorBridges, foliage, distantCanopy, lanterns, waterfall, builders, birdRoot, particles, powerworks.root);
  runtimeParts.push(registerIsland10RuntimePart('landmark-network', root, 'world-integration'));
  runtimeParts.push(registerIsland10RuntimePart('route-integration', underframe, 'world-integration'));
  runtimeParts.push(registerIsland10RuntimePart('inhabitant-network', builders, 'inhabitants'));
  runtimeParts.push(registerIsland10RuntimePart('ambience-system', root, 'ambience'));
  trunkDefinitions.forEach((_definition, trunkIndex) => {
    const trunk = treeFrame.getObjectByName(`ISLAND_10_PRIMARY_TRUNK_${trunkIndex + 1}`);
    if (trunk instanceof THREE.Group) {
      mergeStaticMeshesByMaterial(trunk);
      trunk.userData.keepSeparate = true;
    }
  });
  [crownBranchNetwork, verticalCity, landmarkSupportCity, branchSupports, foliage, distantCanopy].forEach((group) => {
    mergeStaticMeshesByMaterial(group);
    group.userData.keepSeparate = true;
  });
  mergeStaticMeshesByMaterial(root);
  markShadows(root, requestedQuality === 'high');
  scene.add(root);

  const animate = (elapsed: number) => {
    const poweredGlow = [0.26, 0.38, 0.86, 1.52][powerworksPresentation.buildStage];
    materials.lantern.emissiveIntensity = poweredGlow + Math.sin(elapsed * 1.35) * (powerworksPresentation.buildStage >= 3 ? 0.09 : 0.025);
    powerworks.animate(elapsed);
    movingLifts.forEach((lift, index) => {
      const baseY = Number(lift.userData.baseY ?? 0.6);
      const phase = Number(lift.userData.phase ?? 0);
      lift.position.y = baseY + (Math.sin(elapsed * 0.38 + phase) + 1) * (0.82 + index * 0.12);
      lift.rotation.y = Math.sin(elapsed * 0.3 + phase) * 0.035;
    });
    birds.forEach((bird, index) => {
      const phase = elapsed * (0.22 + index * 0.012) + Number(bird.userData.phase ?? 0);
      const radius = 5.2 + (index % 3) * 0.6;
      bird.position.set(Math.cos(phase) * radius, 3.6 + Math.sin(phase * 2.1) * 0.35 + index * 0.18, Math.sin(phase) * radius - 0.9);
      bird.rotation.y = -phase;
      bird.children.slice(1).forEach((wing, wingIndex) => { wing.rotation.z = (wingIndex ? -1 : 1) * (0.16 + Math.sin(elapsed * 5.2 + index) * 0.32); });
    });
    particles.rotation.y = elapsed * 0.025;
    const workshopWheel = scene.getObjectByName('ISLAND_10_WORKSHOP_WATERWHEEL_PIVOT');
    if (workshopWheel) workshopWheel.rotation.z = elapsed * 0.32;
    const armillary = scene.getObjectByName('ISLAND_10_LIBRARY_ARMILLARY_PIVOT');
    if (armillary) armillary.rotation.y = elapsed * 0.18;
  };

  const updateView = (cameraPosition: THREE.Vector3, cameraTarget = new THREE.Vector3()) => {
    const isSideInspection = Math.abs(cameraPosition.x - cameraTarget.x) > 8;
    branchSupports.visible = !isSideInspection;
    // Orbit inspection still needs to feel like a living canopy city. Keep
    // the leaf canopy as context, but fade the cross-frame crown branches when
    // their parent sightline trunk fades so no branch can appear detached.
    crownBranchNetwork.visible = !isSideInspection;
    foliage.visible = true;
    const cameraX = cameraPosition.x;
    const cameraZ = cameraPosition.z;
    const targetX = cameraTarget.x;
    const targetZ = cameraTarget.z;
    const segmentX = targetX - cameraX;
    const segmentZ = targetZ - cameraZ;
    const segmentLengthSq = Math.max(0.001, segmentX * segmentX + segmentZ * segmentZ);
    trunkDefinitions.forEach((definition, trunkIndex) => {
      const trunk = treeFrame.getObjectByName(`ISLAND_10_PRIMARY_TRUNK_${trunkIndex + 1}`);
      if (!trunk) return;
      const t = THREE.MathUtils.clamp(
        ((definition.x - cameraX) * segmentX + (definition.z - cameraZ) * segmentZ) / segmentLengthSq,
        0,
        1,
      );
      const closestX = cameraX + segmentX * t;
      const closestZ = cameraZ + segmentZ * t;
      const distanceToSightline = Math.hypot(definition.x - closestX, definition.z - closestZ);
      trunk.visible = !(t > 0.16 && t < 0.94 && distanceToSightline < definition.radius * 1.65);
    });
  };

  return { root, animate, updateView, updatePowerworksStage };
}
