import { createTitanAwakeningThree } from './Island17AwakeningThree';
import { sanitizeTitanAwakening } from '../services/island17Awakening';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type {
  Island3DQuality,
  Island3DQualityProfile,
  Island5LandmarkDefinition,
} from './island5ThreePilotContract';
import {
  ISLAND_3D_ROUTE_RADIUS,
  ISLAND_3D_TILE_RADIAL_DEPTH,
} from './island5ThreePilotContract';
import {
  applyIslandConstructionAuthoring,
  type IslandConstructionFactoryOptions,
} from './IslandConstructionAuthoring';
import { compactStaticGeometry } from './CrownCitadelThreeModel';
import { createTitanSpineRestoration } from './Island17SpineRestoration';
import type { IslandStagedRestorationPresentation } from './IslandStagedRestorationThreePresentation';

export const ISLAND_17_TITANS_REST_WORLD_NAME = "Titan's Rest";
const ISLAND_17_PAINTED_BACKPLATE_URL = '/assets/islands/island-017/titans-rest-ui-free-target-v005.png';
const ISLAND_17_TITAN_SKULL_SCULPT_URL = '/assets/islands/island-017/models/titan-skull-boss-v027.glb';
const ISLAND_17_TITAN_RIB_BRIDGE_URL = '/assets/islands/island-017/models/titan-rib-bridge-v007.glb';
const ISLAND_17_BONE_HOLLOW_URL = '/assets/islands/island-017/models/bone-hollow-hatchery-v013.glb';
const ISLAND_17_STRENGTH_ALTAR_URL = '/assets/islands/island-017/models/strength-altar-v007.glb';
const ISLAND_17_COLISEUM_PIT_URL = '/assets/islands/island-017/models/coliseum-pit-v002.glb';
const ISLAND_17_ORACLES_CRANIUM_URL = '/assets/islands/island-017/models/oracles-cranium-v005.glb';
const ISLAND_17_PAINTED_TARGET_SIZE = { width: 853, height: 1844 } as const;
type BuildLevel = 0 | 1 | 2 | 3;
type Island17PaintedPartId = 'boss' | 'hatchery' | 'habit' | 'event' | 'wisdom' | 'rib';

const ISLAND_17_PAINTED_PART_CROPS: Record<Island17PaintedPartId, {
  crop: { x: number; y: number; width: number; height: number };
  position: readonly [number, number, number];
  scale: readonly [number, number, number];
}> = {
  boss: {
    crop: { x: 150, y: 95, width: 560, height: 650 },
    position: [0, 3.0, 0.58],
    scale: [9.0, 10.45, 1],
  },
  hatchery: {
    crop: { x: 0, y: 255, width: 352, height: 585 },
    position: [-0.04, 1.62, 0.08],
    scale: [3.9, 6.48, 1],
  },
  habit: {
    crop: { x: 610, y: 430, width: 243, height: 450 },
    position: [0.02, 1.22, 0.06],
    scale: [3.35, 6.2, 1],
  },
  event: {
    crop: { x: 0, y: 805, width: 360, height: 460 },
    position: [0, 1.12, 0.08],
    scale: [4.55, 5.82, 1],
  },
  wisdom: {
    crop: { x: 588, y: 805, width: 265, height: 495 },
    position: [0.02, 1.18, 0.08],
    scale: [3.75, 7.0, 1],
  },
  rib: {
    crop: { x: 245, y: 760, width: 520, height: 820 },
    position: [0, 0.62, 6.2],
    scale: [5.45, 8.6, 1],
  },
};

export const ISLAND_17_TITANS_REST_LANDMARK_LABELS = {
  boss: 'Titan Skull',
  hatchery: 'Bone Hollow',
  habit: 'Strength Altar',
  wisdom: "Oracle's Cranium",
  event: 'Coliseum Pit',
} as const;

export interface Island17TitansRestMaterials {
  bone: THREE.MeshStandardMaterial;
  agedBone: THREE.MeshStandardMaterial;
  crackedBone: THREE.MeshStandardMaterial;
  limestone: THREE.MeshStandardMaterial;
  darkStone: THREE.MeshStandardMaterial;
  moss: THREE.MeshStandardMaterial;
  vine: THREE.MeshStandardMaterial;
  bronze: THREE.MeshStandardMaterial;
  iron: THREE.MeshStandardMaterial;
  banner: THREE.MeshStandardMaterial;
  torch: THREE.MeshBasicMaterial;
  soulfire: THREE.MeshBasicMaterial;
  soulfireGlass: THREE.MeshPhysicalMaterial;
  shadow: THREE.MeshBasicMaterial;
  mist: THREE.MeshBasicMaterial;
}

export interface Island17TitansRestAmbienceRuntime {
  root: THREE.Group;
  animate: (elapsed: number) => void;
  updateView?: (cameraPosition: THREE.Vector3, cameraTarget?: THREE.Vector3) => void;
  updateStagedRestoration: (presentation: IslandStagedRestorationPresentation, immediate?: boolean) => void;
  missionHitTarget: THREE.Object3D;
}

export const ISLAND_17_RUNTIME_PART_IDS = [
  'floating-cliff',
  'storm-cloud-background',
  'central-soulfire-pit',
  'titan-skull-boss',
  'rib-bridge-spine',
  'bone-hollow-hatchery',
  'strength-altar',
  'coliseum-pit',
  'oracles-cranium',
  'bone-ruin-city',
  'soulfire-network',
  'chain-waterfall-depth',
  'moss-vine-overgrowth',
  'route-integration',
  'landmark-network',
  'ambience-system',
] as const;

type Island17RuntimePartId = typeof ISLAND_17_RUNTIME_PART_IDS[number];

interface Island17RuntimePart {
  id: Island17RuntimePartId;
  name: Island17RuntimePartId;
  kind: 'part';
  nodeName: string;
  module: string;
  triangles: number;
}

export function registerIsland17RuntimePart(
  id: Island17RuntimePartId,
  node: THREE.Object3D,
  module: string,
  triangles = 0,
): Island17RuntimePart {
  node.userData.partId = id;
  node.userData.partKind = 'part';
  node.userData.partModule = module;
  return { id, name: id, kind: 'part', nodeName: node.name, module, triangles };
}

export function collectIsland17RuntimePartManifest(roots: THREE.Object3D[]) {
  const parts: Island17RuntimePart[] = [];
  const seen = new Set<string>();
  let integralMeshes = 0;
  roots.forEach((root) => root.traverse((node) => {
    if (node instanceof THREE.Mesh || node instanceof THREE.InstancedMesh || node instanceof THREE.Points) integralMeshes += 1;
    const runtimeParts = node.userData.sculptRuntime?.parts;
    if (!Array.isArray(runtimeParts)) return;
    runtimeParts.forEach((candidate: Island17RuntimePart) => {
      if (!candidate?.name || !ISLAND_17_RUNTIME_PART_IDS.includes(candidate.name)) return;
      const key = `${candidate.name}:${candidate.nodeName}`;
      if (seen.has(key)) return;
      seen.add(key);
      parts.push({ ...candidate });
    });
  }));
  return { model: 'island-017-titans-rest', parts, unnamedMeshes: 0, integralMeshes };
}

const segments = (quality: Island3DQuality) => quality === 'high' ? 18 : quality === 'medium' ? 14 : 10;
const amount = (quality: Island3DQuality, high: number, medium: number, low: number) => quality === 'high' ? high : quality === 'medium' ? medium : low;

export function compactIsland17StaticGeometry(root: THREE.Group, batchName: string, preserveKeepSeparate = true) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || child instanceof THREE.InstancedMesh) return;
    if (preserveKeepSeparate && child.userData.keepSeparate) return;
    const geometry = child.geometry;
    // Index custom triangle lists so they can share indexed material batches
    // without expanding the vertex buffers of the authored primitives.
    if (!geometry.index) {
      geometry.setIndex(Array.from({ length: geometry.getAttribute('position').count }, (_, index) => index));
    }
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    // Custom rock/tube meshes need UVs too. Never discard authored UVs or
    // vertex colors merely to make material batches compatible.
    if (!geometry.getAttribute('uv')) {
      const positions = geometry.getAttribute('position');
      const normals = geometry.getAttribute('normal');
      const uv = new Float32Array(positions.count * 2);
      for (let index = 0; index < positions.count; index += 1) {
        const nx = Math.abs(normals.getX(index));
        const ny = Math.abs(normals.getY(index));
        const nz = Math.abs(normals.getZ(index));
        uv[index * 2] = nx > ny && nx > nz ? positions.getZ(index) : positions.getX(index);
        uv[index * 2 + 1] = ny > nx && ny > nz ? positions.getZ(index) : positions.getY(index);
      }
      geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    }
  });
  compactStaticGeometry(root, batchName, { preserveKeepSeparate });
}

function canLoadIsland17RuntimeAssets() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  return window.location?.protocol === 'http:' || window.location?.protocol === 'https:';
}

export const ISLAND_17_ROUTE_CLEARANCE_INNER_RADIUS = ISLAND_3D_ROUTE_RADIUS - ISLAND_3D_TILE_RADIAL_DEPTH / 2 - 0.25;
export const ISLAND_17_ROUTE_CLEARANCE_OUTER_RADIUS = ISLAND_3D_ROUTE_RADIUS + ISLAND_3D_TILE_RADIAL_DEPTH / 2 + 0.25;

export function isIsland17RouteCorridorClear(x: number, z: number, footprintRadius = 0): boolean {
  const distance = Math.hypot(x, z);
  const footprint = Math.max(0, footprintRadius);
  return distance + footprint <= ISLAND_17_ROUTE_CLEARANCE_INNER_RADIUS
    || distance - footprint >= ISLAND_17_ROUTE_CLEARANCE_OUTER_RADIUS;
}

function makeNoiseTexture(size: number, kind: 'bone' | 'stone' | 'moss' | 'iron', relief = false) {
  const data = new Uint8Array(size * size * 4);
  const baseByKind: Record<'bone' | 'stone' | 'moss' | 'iron', readonly [number, number, number]> = {
    bone: [232, 226, 209],
    stone: [176, 176, 166],
    moss: [132, 158, 120],
    iron: [154, 156, 168],
  };
  const base = baseByKind[kind];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const longVein = Math.sin(x * 0.055 + Math.sin(y * 0.036) * 2.2) * 12;
      const softGrain = Math.sin((x + y) * 0.09) * 5 + Math.sin((x * 0.031) - (y * 0.073)) * 7;
      const stipple = ((x * 17 + y * 31 + x * y * 3) % 43) - 21;
      const hairline = ((x * 11 + y * 29 + Math.floor(x / 23) * 13) % 149 < 2) ? -32 : 0;
      let value = longVein + softGrain + stipple * 0.34 + hairline;
      if (kind === 'stone') value = softGrain * 1.4 + stipple * 0.45 + hairline * 0.7 - 10;
      if (kind === 'moss') value = Math.sin((x + y) * 0.065) * 18 + stipple * 0.55 + 8;
      if (kind === 'iron') value = stipple * 0.35 + ((x + y * 3) % 97 < 2 ? 18 : 0) - 8;
      if (relief) {
        const clampedRelief = THREE.MathUtils.clamp(128 + value * 1.65, 32, 226);
        data[offset] = clampedRelief;
        data[offset + 1] = clampedRelief;
        data[offset + 2] = clampedRelief;
        data[offset + 3] = 255;
        continue;
      }
      const shade = THREE.MathUtils.clamp(value, -46, 44);
      data[offset] = THREE.MathUtils.clamp(base[0] + shade, 10, 245);
      data[offset + 1] = THREE.MathUtils.clamp(base[1] + shade * 0.82, 10, 245);
      data[offset + 2] = THREE.MathUtils.clamp(base[2] + shade * 0.58, 10, 245);
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = relief ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.repeat.set(kind === 'moss' ? 3.2 : kind === 'bone' ? 1.6 : 2.4, kind === 'bone' ? 2.1 : 2.5);
  texture.needsUpdate = true;
  return texture;
}

export function createIsland17TitansRestMaterials(): Island17TitansRestMaterials {
  const boneMap = makeNoiseTexture(192, 'bone');
  const boneRelief = makeNoiseTexture(128, 'bone', true);
  const stoneMap = makeNoiseTexture(160, 'stone');
  const stoneRelief = makeNoiseTexture(128, 'stone', true);
  const mossMap = makeNoiseTexture(128, 'moss');
  const ironMap = makeNoiseTexture(64, 'iron');
  return {
    bone: new THREE.MeshStandardMaterial({ color: 0xd8c8a3, map: boneMap, bumpMap: boneRelief, bumpScale: 0.048, roughness: 0.86, metalness: 0.02 }),
    agedBone: new THREE.MeshStandardMaterial({ color: 0xb19b78, map: boneMap, bumpMap: boneRelief, bumpScale: 0.07, roughness: 0.92, emissive: 0x100b06, emissiveIntensity: 0.09 }),
    crackedBone: new THREE.MeshStandardMaterial({ color: 0xc6b087, map: boneMap, bumpMap: boneRelief, bumpScale: 0.084, roughness: 0.94, emissive: 0x1f1207, emissiveIntensity: 0.11 }),
    limestone: new THREE.MeshStandardMaterial({ color: 0x665f4e, map: stoneMap, bumpMap: stoneRelief, bumpScale: 0.105, roughness: 0.91 }),
    darkStone: new THREE.MeshStandardMaterial({ color: 0x242631, map: stoneMap, bumpMap: stoneRelief, bumpScale: 0.072, roughness: 0.94, emissive: 0x061927, emissiveIntensity: 0.22 }),
    moss: new THREE.MeshStandardMaterial({ color: 0x182819, map: mossMap, roughness: 0.98, emissive: 0x020b05, emissiveIntensity: 0.08 }),
    vine: new THREE.MeshStandardMaterial({ color: 0x1a2f1d, roughness: 0.86, side: THREE.DoubleSide }),
    bronze: new THREE.MeshStandardMaterial({ color: 0x8f6739, roughness: 0.48, metalness: 0.52, emissive: 0x291105, emissiveIntensity: 0.26 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x252633, map: ironMap, roughness: 0.62, metalness: 0.58 }),
    banner: new THREE.MeshStandardMaterial({ color: 0x5f3a98, roughness: 0.74, emissive: 0x180629, emissiveIntensity: 0.16, side: THREE.DoubleSide }),
    torch: new THREE.MeshBasicMaterial({ color: 0xffa64f, transparent: true, opacity: 0.88, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    soulfire: new THREE.MeshBasicMaterial({ color: 0x18ffe6, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }),
    soulfireGlass: new THREE.MeshPhysicalMaterial({ color: 0x25f4dc, roughness: 0.1, metalness: 0.05, clearcoat: 1, transparent: true, opacity: 0.68, emissive: 0x08dfca, emissiveIntensity: 1.7, depthWrite: false }),
    shadow: new THREE.MeshBasicMaterial({ color: 0x03070c, transparent: true, opacity: 0.78, depthWrite: false }),
    mist: new THREE.MeshBasicMaterial({ color: 0xb9e8f2, transparent: true, opacity: 0.18, depthWrite: false }),
  };
}

function box(width: number, height: number, depth: number, material: THREE.Material) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
}

function cylinder(radiusTop: number, radiusBottom: number, height: number, material: THREE.Material, radialSegments = 12) {
  return new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments), material);
}

function sphere(radius: number, material: THREE.Material, radialSegments = 12) {
  return new THREE.Mesh(new THREE.SphereGeometry(radius, radialSegments, Math.max(6, Math.round(radialSegments * 0.66))), material);
}

function torus(radius: number, tube: number, material: THREE.Material, radialSegments = 28) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, radialSegments), material);
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

function tubeBetween(start: THREE.Vector3, end: THREE.Vector3, radius: number, material: THREE.Material, radialSegments = 6) {
  const direction = end.clone().sub(start);
  const mesh = cylinder(radius, radius * 0.94, direction.length(), material, radialSegments);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

function setCylinderInstanceBetween({
  mesh,
  index,
  start,
  end,
  radius,
  matrix,
  position,
  quaternion,
  scale,
}: {
  mesh: THREE.InstancedMesh;
  index: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
  radius: number;
  matrix: THREE.Matrix4;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
}) {
  const direction = end.clone().sub(start);
  const length = direction.length();
  if (length <= 0.0001) return;
  position.copy(start).add(end).multiplyScalar(0.5);
  quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  scale.set(radius, length, radius * 0.94);
  matrix.compose(position, quaternion, scale);
  mesh.setMatrixAt(index, matrix);
}

function curveTube(points: THREE.Vector3[], radius: number, material: THREE.Material, quality: Island3DQuality, tubularSegments = 20) {
  return new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), amount(quality, tubularSegments, Math.round(tubularSegments * 0.72), Math.round(tubularSegments * 0.52)), radius, quality === 'low' ? 5 : 6, false),
    material,
  );
}

function taperedCurveTube({
  points,
  startRadius,
  endRadius,
  material,
  quality,
  tubularSegments = 24,
  radialSegments = 9,
  belly = 0,
}: {
  points: THREE.Vector3[];
  startRadius: number;
  endRadius: number;
  material: THREE.Material;
  quality: Island3DQuality;
  tubularSegments?: number;
  radialSegments?: number;
  belly?: number;
}) {
  const segmentCount = amount(quality, tubularSegments, Math.round(tubularSegments * 0.72), Math.round(tubularSegments * 0.52));
  const sideCount = quality === 'low' ? Math.max(5, radialSegments - 3) : radialSegments;
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const frames = curve.computeFrenetFrames(segmentCount, false);
  const positions: number[] = [];
  const indices: number[] = [];
  for (let ringIndex = 0; ringIndex <= segmentCount; ringIndex += 1) {
    const t = ringIndex / segmentCount;
    const center = curve.getPointAt(t);
    const radius = THREE.MathUtils.lerp(startRadius, endRadius, t) + Math.sin(Math.PI * t) * belly;
    for (let sideIndex = 0; sideIndex < sideCount; sideIndex += 1) {
      const angle = sideIndex / sideCount * Math.PI * 2;
      const radial = frames.normals[ringIndex].clone().multiplyScalar(Math.cos(angle) * radius)
        .add(frames.binormals[ringIndex].clone().multiplyScalar(Math.sin(angle) * radius));
      positions.push(center.x + radial.x, center.y + radial.y, center.z + radial.z);
    }
  }
  for (let ringIndex = 0; ringIndex < segmentCount; ringIndex += 1) {
    for (let sideIndex = 0; sideIndex < sideCount; sideIndex += 1) {
      const nextSide = (sideIndex + 1) % sideCount;
      const a = ringIndex * sideCount + sideIndex;
      const b = (ringIndex + 1) * sideCount + sideIndex;
      const c = (ringIndex + 1) * sideCount + nextSide;
      const d = ringIndex * sideCount + nextSide;
      indices.push(a, b, d, b, c, d);
    }
  }
  const startCenterIndex = positions.length / 3;
  positions.push(...curve.getPointAt(0).toArray());
  const endCenterIndex = positions.length / 3;
  positions.push(...curve.getPointAt(1).toArray());
  for (let sideIndex = 0; sideIndex < sideCount; sideIndex += 1) {
    const nextSide = (sideIndex + 1) % sideCount;
    indices.push(startCenterIndex, nextSide, sideIndex);
    const endOffset = segmentCount * sideCount;
    indices.push(endCenterIndex, endOffset + sideIndex, endOffset + nextSide);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return new THREE.Mesh(geometry, material);
}

function roundedBridgeSlab(width: number, height: number, depth: number, material: THREE.Material) {
  const radius = Math.min(width, depth) * 0.14;
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2 + radius, -depth / 2);
  shape.lineTo(width / 2 - radius, -depth / 2);
  shape.quadraticCurveTo(width / 2, -depth / 2, width / 2, -depth / 2 + radius);
  shape.lineTo(width / 2, depth / 2 - radius);
  shape.quadraticCurveTo(width / 2, depth / 2, width / 2 - radius, depth / 2);
  shape.lineTo(-width / 2 + radius, depth / 2);
  shape.quadraticCurveTo(-width / 2, depth / 2, -width / 2, depth / 2 - radius);
  shape.lineTo(-width / 2, -depth / 2 + radius);
  shape.quadraticCurveTo(-width / 2, -depth / 2, -width / 2 + radius, -depth / 2);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: Math.min(0.024, height * 0.22),
    bevelThickness: Math.min(0.024, height * 0.22),
    curveSegments: 2,
  });
  geometry.center();
  geometry.rotateX(Math.PI / 2);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

function addPlatform(root: THREE.Group, radius: number, materials: Island17TitansRestMaterials, quality: Island3DQuality) {
  const base = cylinder(radius * 1.08, radius * 1.2, 0.2, materials.darkStone, segments(quality));
  base.position.y = 0.1;
  const top = cylinder(radius, radius * 1.06, 0.16, materials.limestone, segments(quality));
  top.position.y = 0.28;
  const ring = torus(radius * 0.88, 0.026, materials.bronze, segments(quality) * 2);
  ring.position.y = 0.39;
  root.add(base, top, ring);
}

function addSoulfire(root: THREE.Group, position: THREE.Vector3, radius: number, materials: Island17TitansRestMaterials) {
  const flame = new THREE.Mesh(new THREE.OctahedronGeometry(radius), materials.soulfire);
  flame.position.copy(position);
  flame.userData.keepSeparate = true;
  const glow = new THREE.PointLight(0x18f6df, radius * 2.2, 4.8, 2);
  glow.position.copy(position);
  root.add(flame, glow);
  return flame;
}

function addInstancedColumnRing({
  root,
  name,
  count,
  radius,
  radiusJitter = 0,
  y = 0,
  height = 1,
  spread = 0.2,
  material,
  geometry,
  angleOffset = 0,
}: {
  root: THREE.Group;
  name: string;
  count: number;
  radius: number;
  radiusJitter?: number;
  y?: number;
  height?: number;
  spread?: number;
  material: THREE.Material;
  geometry: THREE.BufferGeometry;
  angleOffset?: number;
}) {
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = name;
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  for (let index = 0; index < count; index += 1) {
    const angle = index / count * Math.PI * 2 + angleOffset;
    const radial = radius + (index % 5 - 2) * radiusJitter;
    position.set(Math.cos(angle) * radial, y + (index % 4) * spread, Math.sin(angle) * radial);
    quaternion.setFromEuler(new THREE.Euler(0, -angle + Math.PI / 2, (index % 3 - 1) * 0.13));
    scale.set(0.8 + (index % 4) * 0.18, height * (0.75 + (index % 5) * 0.14), 0.8 + (index % 3) * 0.12);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(index, matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.userData.keepSeparate = true;
  root.add(mesh);
  return mesh;
}

function addToothRow(root: THREE.Group, z: number, y: number, count: number, materials: Island17TitansRestMaterials, quality: Island3DQuality, scale = 1) {
  for (let index = 0; index < count; index += 1) {
    const centered = index - (count - 1) / 2;
    const height = (0.15 + (index % 3) * 0.03) * scale;
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.035 * scale, height, quality === 'low' ? 5 : 7), index % 2 ? materials.agedBone : materials.bone);
    tooth.name = `ISLAND_17_SKULL_UNEVEN_TOOTH_${index + 1}`;
    tooth.position.set(centered * 0.13 * scale, y - Math.abs(centered) * 0.012, z + (index % 2) * 0.014 * scale);
    tooth.rotation.set(Math.PI + (index % 2 ? 0.07 : -0.05), 0, centered * -0.025);
    tooth.scale.x = 0.82 + (index % 4) * 0.08;
    root.add(tooth);
  }
}

function addBanners(root: THREE.Group, materials: Island17TitansRestMaterials, quality: Island3DQuality, radius = 0.75) {
  const bannerCount = quality === 'low' ? 2 : 4;
  for (let index = 0; index < bannerCount; index += 1) {
    const side = index % 2 ? 1 : -1;
    const z = index < 2 ? radius : -radius * 0.6;
    const pole = cylinder(0.018, 0.024, 0.72, materials.iron, 5);
    pole.position.set(side * radius, 0.78, z);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.42), materials.banner);
    cloth.position.set(side * radius, 0.58, z + 0.04);
    cloth.rotation.y = side * 0.28;
    cloth.userData.phase = index * 1.2;
    cloth.userData.keepSeparate = true;
    root.add(pole, cloth);
  }
}

function addBoneArc(root: THREE.Group, radius: number, materials: Island17TitansRestMaterials, quality: Island3DQuality, angle = 0) {
  const rib = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.04, 6, segments(quality) * 2, Math.PI), materials.agedBone);
  rib.name = 'ISLAND_17_BONE_ARC_HALF_RIB';
  rib.position.y = 0.6;
  rib.rotation.set(Math.PI / 2, 0, angle);
  root.add(rib);
}

function addSkullSurfaceScars(skull: THREE.Group, materials: Island17TitansRestMaterials, quality: Island3DQuality, scale: number) {
  const scarCount = amount(quality, 9, 7, 4);
  for (let index = 0; index < scarCount; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const scar = box(
      (0.004 + (index % 3) * 0.002) * scale,
      (0.1 + (index % 4) * 0.032) * scale,
      0.012 * scale,
      index % 3 === 0 ? materials.shadow : materials.agedBone,
    );
    scar.name = `ISLAND_17_SKULL_FACE_SCAR_${index + 1}`;
    scar.position.set(
      side * (0.14 + (index % 5) * 0.052) * scale,
      (1.42 + (index % 4) * 0.074) * scale,
      (0.67 - (index % 3) * 0.01) * scale,
    );
    scar.rotation.z = side * (0.22 + (index % 4) * 0.1);
    skull.add(scar);
  }

  const crownRune = torus(0.33 * scale, 0.012 * scale, materials.bronze, segments(quality) * 2);
  crownRune.name = 'ISLAND_17_SKULL_ENGRAVED_CROWN_RUNE';
  crownRune.position.set(0, 1.78 * scale, 0.43 * scale);
  crownRune.rotation.x = Math.PI * 0.32;
  crownRune.scale.z = 0.5;
  skull.add(crownRune);
  for (let index = 0; index < amount(quality, 7, 5, 3); index += 1) {
    const spoke = box(0.012 * scale, 0.27 * scale, 0.01 * scale, materials.bronze);
    spoke.name = `ISLAND_17_SKULL_CROWN_RUNE_SPOKE_${index + 1}`;
    spoke.position.set(0, 1.78 * scale, 0.44 * scale);
    spoke.rotation.set(Math.PI * 0.32, 0, index / amount(quality, 7, 5, 3) * Math.PI);
    skull.add(spoke);
  }
}

function addTitanScaleSkullSculptDetails(skull: THREE.Group, materials: Island17TitansRestMaterials, quality: Island3DQuality, scale: number) {
  const faceMaskShape = new THREE.Shape();
  faceMaskShape.moveTo(0, 1.34 * scale);
  faceMaskShape.bezierCurveTo(0.27 * scale, 1.38 * scale, 0.52 * scale, 1.29 * scale, 0.61 * scale, 1.13 * scale);
  faceMaskShape.bezierCurveTo(0.65 * scale, 0.91 * scale, 0.55 * scale, 0.72 * scale, 0.4 * scale, 0.58 * scale);
  faceMaskShape.bezierCurveTo(0.26 * scale, 0.43 * scale, 0.12 * scale, 0.34 * scale, 0, 0.31 * scale);
  faceMaskShape.bezierCurveTo(-0.12 * scale, 0.34 * scale, -0.26 * scale, 0.43 * scale, -0.4 * scale, 0.58 * scale);
  faceMaskShape.bezierCurveTo(-0.55 * scale, 0.72 * scale, -0.65 * scale, 0.91 * scale, -0.61 * scale, 1.13 * scale);
  faceMaskShape.bezierCurveTo(-0.52 * scale, 1.29 * scale, -0.27 * scale, 1.38 * scale, 0, 1.34 * scale);
  const leftEyeCutout = new THREE.Path();
  leftEyeCutout.absellipse(-0.26 * scale, 1.04 * scale, 0.18 * scale, 0.12 * scale, 0, Math.PI * 2, true);
  const rightEyeCutout = new THREE.Path();
  rightEyeCutout.absellipse(0.26 * scale, 1.04 * scale, 0.18 * scale, 0.12 * scale, 0, Math.PI * 2, true);
  const noseCutout = new THREE.Path([
    new THREE.Vector2(0, 0.96 * scale),
    new THREE.Vector2(0.105 * scale, 0.77 * scale),
    new THREE.Vector2(0, 0.62 * scale),
    new THREE.Vector2(-0.105 * scale, 0.77 * scale),
  ]);
  const mouthCutout = new THREE.Path();
  mouthCutout.absellipse(0, 0.55 * scale, 0.27 * scale, 0.07 * scale, 0, Math.PI * 2, true);
  faceMaskShape.holes.push(leftEyeCutout, rightEyeCutout, noseCutout, mouthCutout);

  const faceMask = new THREE.Mesh(
    new THREE.ExtrudeGeometry(faceMaskShape, {
      depth: 0.055 * scale,
      bevelEnabled: true,
      bevelSegments: quality === 'low' ? 1 : 2,
      bevelSize: 0.018 * scale,
      bevelThickness: 0.018 * scale,
      curveSegments: quality === 'low' ? 10 : 18,
    }),
    materials.crackedBone,
  );
  faceMask.name = 'ISLAND_17_TITAN_SKULL_EXTRUDED_CONTINUOUS_FACE_MASK';
  faceMask.geometry.computeVertexNormals();
  faceMask.position.set(0, 0, 0.77 * scale);
  faceMask.rotation.x = -0.06;
  faceMask.scale.set(0.96, 1, 1);
  skull.add(faceMask);

  const faceMaskShadow = new THREE.Mesh(
    new THREE.ShapeGeometry(faceMaskShape.holes.map((hole) => {
      const points = hole.getPoints(24);
      return new THREE.Shape(points);
    })),
    materials.shadow,
  );
  faceMaskShadow.name = 'ISLAND_17_TITAN_SKULL_FACE_CUTOUT_DARKNESS';
  faceMaskShadow.position.set(0, 0, 0.765 * scale);
  faceMaskShadow.rotation.copy(faceMask.rotation);
  faceMaskShadow.scale.copy(faceMask.scale);
  faceMaskShadow.userData.keepSeparate = true;
  skull.add(faceMaskShadow);

  [-1, 1].forEach((side) => {
    const socketGlow = sphere(0.06 * scale, materials.soulfireGlass, quality === 'low' ? 8 : 10);
    socketGlow.name = `ISLAND_17_TITAN_SKULL_FORWARD_SOCKET_SOULFIRE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    socketGlow.position.set(side * 0.26 * scale, 1.04 * scale, 0.92 * scale);
    socketGlow.scale.set(1.7, 0.92, 0.38);
    socketGlow.renderOrder = 6;
    socketGlow.userData.keepSeparate = true;
    const socketFlare = new THREE.PointLight(0x18f6df, 0.55 * scale, 1.25 * scale, 2);
    socketFlare.name = `ISLAND_17_TITAN_SKULL_FORWARD_SOCKET_LIGHT_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    socketFlare.position.copy(socketGlow.position);
    skull.add(socketGlow, socketFlare);
  });

  const mouthCutoutGlow = sphere(0.08 * scale, materials.soulfireGlass, quality === 'low' ? 8 : 10);
  mouthCutoutGlow.name = 'ISLAND_17_TITAN_SKULL_FORWARD_MOUTH_CUTOUT_SOULFIRE';
  mouthCutoutGlow.position.set(0, 0.55 * scale, 0.92 * scale);
  mouthCutoutGlow.scale.set(2.6, 0.45, 0.25);
  mouthCutoutGlow.renderOrder = 6;
  mouthCutoutGlow.userData.keepSeparate = true;
  skull.add(mouthCutoutGlow);

  const browOverhang = curveTube([
    new THREE.Vector3(-0.54 * scale, 1.18 * scale, 0.82 * scale),
    new THREE.Vector3(-0.28 * scale, 1.22 * scale, 0.86 * scale),
    new THREE.Vector3(0, 1.21 * scale, 0.88 * scale),
    new THREE.Vector3(0.28 * scale, 1.22 * scale, 0.86 * scale),
    new THREE.Vector3(0.54 * scale, 1.18 * scale, 0.82 * scale),
  ], 0.024 * scale, materials.agedBone, quality, 26);
  browOverhang.name = 'ISLAND_17_TITAN_SKULL_CONTINUOUS_HEAVY_BROW_OVERHANG';
  skull.add(browOverhang);

  const browShadow = curveTube([
    new THREE.Vector3(-0.5 * scale, 1.08 * scale, 0.91 * scale),
    new THREE.Vector3(-0.22 * scale, 1.02 * scale, 0.94 * scale),
    new THREE.Vector3(0, 1.0 * scale, 0.95 * scale),
    new THREE.Vector3(0.22 * scale, 1.02 * scale, 0.94 * scale),
    new THREE.Vector3(0.5 * scale, 1.08 * scale, 0.91 * scale),
  ], 0.018 * scale, materials.shadow, quality, 22);
  browShadow.name = 'ISLAND_17_TITAN_SKULL_PHONE_DARK_BROW_UNDERCUT';
  browShadow.userData.keepSeparate = true;
  skull.add(browShadow);

  [-1, 1].forEach((side) => {
    const upperSocketRim = curveTube([
      new THREE.Vector3(side * 0.09 * scale, 1.1 * scale, 0.94 * scale),
      new THREE.Vector3(side * 0.22 * scale, 1.17 * scale, 0.97 * scale),
      new THREE.Vector3(side * 0.4 * scale, 1.1 * scale, 0.94 * scale),
    ], 0.022 * scale, materials.agedBone, quality, 14);
    upperSocketRim.name = `ISLAND_17_TITAN_SKULL_PHONE_SOCKET_UPPER_RIM_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    const lowerSocketRim = curveTube([
      new THREE.Vector3(side * 0.11 * scale, 0.98 * scale, 0.94 * scale),
      new THREE.Vector3(side * 0.25 * scale, 0.93 * scale, 0.97 * scale),
      new THREE.Vector3(side * 0.39 * scale, 0.98 * scale, 0.94 * scale),
    ], 0.014 * scale, materials.crackedBone, quality, 12);
    lowerSocketRim.name = `ISLAND_17_TITAN_SKULL_PHONE_SOCKET_LOWER_RIM_${side < 0 ? 'LEFT' : 'RIGHT'}`;

    const socketDepthPlate = sphere(0.14 * scale, materials.shadow, quality === 'low' ? 7 : 9);
    socketDepthPlate.name = `ISLAND_17_TITAN_SKULL_PHONE_SOCKET_DEEP_BACKPLATE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    socketDepthPlate.position.set(side * 0.26 * scale, 1.04 * scale, 0.885 * scale);
    socketDepthPlate.scale.set(1.85, 0.86, 0.16);
    socketDepthPlate.userData.keepSeparate = true;

    skull.add(socketDepthPlate, upperSocketRim, lowerSocketRim);
  });

  const crackPaths = [
    [new THREE.Vector3(-0.36, 1.86, 0.68), new THREE.Vector3(-0.25, 1.7, 0.72), new THREE.Vector3(-0.11, 1.55, 0.73)],
    [new THREE.Vector3(0.32, 1.82, 0.68), new THREE.Vector3(0.24, 1.66, 0.72), new THREE.Vector3(0.08, 1.49, 0.74)],
    [new THREE.Vector3(-0.44, 1.5, 0.69), new THREE.Vector3(-0.29, 1.4, 0.74), new THREE.Vector3(-0.12, 1.35, 0.76)],
    [new THREE.Vector3(0.43, 1.48, 0.69), new THREE.Vector3(0.28, 1.38, 0.74), new THREE.Vector3(0.11, 1.34, 0.76)],
    [new THREE.Vector3(-0.08, 1.84, 0.72), new THREE.Vector3(0.02, 1.68, 0.76), new THREE.Vector3(0.0, 1.48, 0.78)],
  ];
  crackPaths.forEach((path, index) => {
    const crack = curveTube(
      path.map((point) => point.clone().multiplyScalar(scale)),
      (index % 2 === 0 ? 0.0028 : 0.0024) * scale,
      index === 4 ? materials.moss : materials.iron,
      quality,
      18,
    );
    crack.name = `ISLAND_17_TITAN_SKULL_EMBEDDED_CRANIUM_CRACK_${index + 1}`;
    crack.userData.keepSeparate = true;
    skull.add(crack);
  });

  const chipCount = amount(quality, 10, 7, 5);
  for (let index = 0; index < chipCount; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const chip = sphere(0.035 * scale, index % 3 ? materials.agedBone : materials.crackedBone, quality === 'low' ? 6 : 8);
    chip.name = `ISLAND_17_TITAN_SKULL_RAISED_BONE_CHIP_${index + 1}`;
    chip.position.set(
      side * (0.12 + (index % 5) * 0.08) * scale,
      (1.44 + (index % 4) * 0.12) * scale,
      (0.72 - (index % 3) * 0.035) * scale,
    );
    chip.scale.set(1.5, 0.38 + (index % 3) * 0.12, 0.24);
    chip.rotation.set(0.1, side * 0.12, side * (0.16 + index * 0.03));
    skull.add(chip);
  }

  const crownPlateCount = amount(quality, 9, 7, 5);
  for (let index = 0; index < crownPlateCount; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const crownPlate = box(
      (0.07 + (index % 3) * 0.018) * scale,
      (0.026 + (index % 2) * 0.009) * scale,
      0.018 * scale,
      index % 3 === 0 ? materials.agedBone : materials.crackedBone,
    );
    crownPlate.name = `ISLAND_17_TITAN_SKULL_PHONE_CHIPPED_CRANIUM_PLATE_${index + 1}`;
    crownPlate.position.set(
      side * (0.07 + (index % 5) * 0.082) * scale,
      (1.58 + (index % 4) * 0.082) * scale,
      (0.79 - (index % 3) * 0.018) * scale,
    );
    crownPlate.rotation.set(0.08, side * 0.22, side * (0.34 + index * 0.06));
    skull.add(crownPlate);
  }

  const phoneCrackWeb = [
    [new THREE.Vector3(-0.16, 1.94, 0.81), new THREE.Vector3(-0.05, 1.76, 0.86), new THREE.Vector3(0.08, 1.58, 0.88)],
    [new THREE.Vector3(0.16, 1.91, 0.8), new THREE.Vector3(0.09, 1.7, 0.86), new THREE.Vector3(0.2, 1.5, 0.88)],
    [new THREE.Vector3(-0.48, 1.34, 0.84), new THREE.Vector3(-0.32, 1.26, 0.91), new THREE.Vector3(-0.14, 1.22, 0.93)],
    [new THREE.Vector3(0.48, 1.34, 0.84), new THREE.Vector3(0.32, 1.26, 0.91), new THREE.Vector3(0.14, 1.22, 0.93)],
    [new THREE.Vector3(-0.08, 0.86, 0.95), new THREE.Vector3(-0.18, 0.73, 0.96), new THREE.Vector3(-0.31, 0.62, 0.9)],
    [new THREE.Vector3(0.08, 0.86, 0.95), new THREE.Vector3(0.18, 0.73, 0.96), new THREE.Vector3(0.31, 0.62, 0.9)],
  ];
  phoneCrackWeb.forEach((path, index) => {
    const crack = curveTube(
      path.map((point) => point.clone().multiplyScalar(scale)),
      (index < 2 ? 0.0046 : 0.0034) * scale,
      index % 3 === 0 ? materials.moss : materials.shadow,
      quality,
      12,
    );
    crack.name = `ISLAND_17_TITAN_SKULL_PHONE_READABLE_CRACK_WEB_${index + 1}`;
    crack.userData.keepSeparate = true;
    skull.add(crack);
  });

  [-1, 1].forEach((side) => {
    const templeBowl = sphere(0.17 * scale, materials.shadow, quality === 'low' ? 8 : 10);
    templeBowl.name = `ISLAND_17_TITAN_SKULL_DEEP_TEMPLE_VOID_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    templeBowl.position.set(side * 0.45 * scale, 1.06 * scale, 0.78 * scale);
    templeBowl.scale.set(0.95, 0.78, 0.18);
    templeBowl.rotation.y = side * 0.45;
    templeBowl.userData.keepSeparate = true;

    const cheekShelf = sphere(0.18 * scale, materials.agedBone, quality === 'low' ? 7 : 9);
    cheekShelf.name = `ISLAND_17_TITAN_SKULL_LAYERED_CHEEK_SHELF_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    cheekShelf.position.set(side * 0.4 * scale, 0.78 * scale, 0.68 * scale);
    cheekShelf.scale.set(1.7, 0.42, 0.36);
    cheekShelf.rotation.set(0.06, side * -0.16, side * -0.26);

    const jawButtress = tubeBetween(
      new THREE.Vector3(side * 0.5 * scale, 0.73 * scale, 0.62 * scale),
      new THREE.Vector3(side * 0.31 * scale, 0.3 * scale, 0.59 * scale),
      0.052 * scale,
      materials.crackedBone,
      quality === 'low' ? 5 : 7,
    );
    jawButtress.name = `ISLAND_17_TITAN_SKULL_HEAVY_JAW_BUTTRESS_${side < 0 ? 'LEFT' : 'RIGHT'}`;

    const mossStripe = curveTube([
      new THREE.Vector3(side * 0.17 * scale, 1.82 * scale, 0.7 * scale),
      new THREE.Vector3(side * 0.22 * scale, 1.56 * scale, 0.72 * scale),
      new THREE.Vector3(side * 0.34 * scale, 1.24 * scale, 0.7 * scale),
      new THREE.Vector3(side * 0.42 * scale, 0.92 * scale, 0.68 * scale),
    ], 0.014 * scale, materials.moss, quality, 16);
    mossStripe.name = `ISLAND_17_TITAN_SKULL_MOSS_FILLED_FACE_CRACK_${side < 0 ? 'LEFT' : 'RIGHT'}`;

    skull.add(templeBowl, cheekShelf, jawButtress, mossStripe);
  });

  [-1, 1].forEach((side) => {
    const sideSocket = sphere(0.12 * scale, materials.shadow, quality === 'low' ? 7 : 9);
    sideSocket.name = `ISLAND_17_TITAN_SKULL_360_SIDE_SOCKET_VOID_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    sideSocket.position.set(side * 0.69 * scale, 1.1 * scale, 0.04 * scale);
    sideSocket.scale.set(0.28, 1.12, 1.78);
    sideSocket.rotation.y = side * Math.PI * 0.5;
    sideSocket.userData.keepSeparate = true;

    const sideEyeGlow = sphere(0.044 * scale, materials.soulfireGlass, quality === 'low' ? 7 : 9);
    sideEyeGlow.name = `ISLAND_17_TITAN_SKULL_360_SIDE_SOCKET_GLOW_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    sideEyeGlow.position.set(side * 0.735 * scale, 1.1 * scale, 0.04 * scale);
    sideEyeGlow.scale.set(0.55, 1.02, 1.48);
    sideEyeGlow.userData.keepSeparate = true;

    const sideJawPlane = curveTube([
      new THREE.Vector3(side * 0.56 * scale, 0.76 * scale, 0.36 * scale),
      new THREE.Vector3(side * 0.68 * scale, 0.64 * scale, 0.02 * scale),
      new THREE.Vector3(side * 0.58 * scale, 0.48 * scale, -0.35 * scale),
    ], 0.042 * scale, materials.agedBone, quality, 16);
    sideJawPlane.name = `ISLAND_17_TITAN_SKULL_360_SIDE_JAW_ARC_${side < 0 ? 'LEFT' : 'RIGHT'}`;

    const sideSeam = curveTube([
      new THREE.Vector3(side * 0.61 * scale, 1.72 * scale, 0.28 * scale),
      new THREE.Vector3(side * 0.68 * scale, 1.42 * scale, -0.04 * scale),
      new THREE.Vector3(side * 0.62 * scale, 1.08 * scale, -0.36 * scale),
    ], 0.006 * scale, materials.shadow, quality, 16);
    sideSeam.name = `ISLAND_17_TITAN_SKULL_360_SIDE_CRANIAL_SEAM_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    sideSeam.userData.keepSeparate = true;

    const sideBrowShelf = curveTube([
      new THREE.Vector3(side * 0.56 * scale, 1.34 * scale, 0.42 * scale),
      new THREE.Vector3(side * 0.73 * scale, 1.25 * scale, 0.02 * scale),
      new THREE.Vector3(side * 0.6 * scale, 1.18 * scale, -0.42 * scale),
    ], 0.034 * scale, materials.crackedBone, quality, 16);
    sideBrowShelf.name = `ISLAND_17_TITAN_SKULL_360_SIDE_HEAVY_BROW_SHELF_${side < 0 ? 'LEFT' : 'RIGHT'}`;

    const sideCheekCut = sphere(0.1 * scale, materials.shadow, quality === 'low' ? 7 : 9);
    sideCheekCut.name = `ISLAND_17_TITAN_SKULL_360_SIDE_CHEEK_HOLLOW_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    sideCheekCut.position.set(side * 0.7 * scale, 0.76 * scale, -0.16 * scale);
    sideCheekCut.scale.set(0.3, 0.72, 1.34);
    sideCheekCut.userData.keepSeparate = true;

    const sideOccipitalVoid = sphere(0.13 * scale, materials.shadow, quality === 'low' ? 7 : 9);
    sideOccipitalVoid.name = `ISLAND_17_TITAN_SKULL_360_SIDE_OCCIPITAL_VOID_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    sideOccipitalVoid.position.set(side * 0.71 * scale, 1.48 * scale, -0.34 * scale);
    sideOccipitalVoid.scale.set(0.28, 0.9, 1.4);
    sideOccipitalVoid.userData.keepSeparate = true;
    const sideOccipitalGlow = sphere(0.046 * scale, materials.soulfireGlass, quality === 'low' ? 7 : 9);
    sideOccipitalGlow.name = `ISLAND_17_TITAN_SKULL_360_SIDE_OCCIPITAL_SOULFIRE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    sideOccipitalGlow.position.set(side * 0.755 * scale, 1.48 * scale, -0.34 * scale);
    sideOccipitalGlow.scale.set(0.48, 0.76, 1.08);
    sideOccipitalGlow.userData.keepSeparate = true;

    const sidePlateCount = amount(quality, 5, 4, 3);
    for (let index = 0; index < sidePlateCount; index += 1) {
      const plate = box(
        (0.055 + (index % 2) * 0.018) * scale,
        (0.028 + (index % 3) * 0.006) * scale,
        (0.16 - (index % 2) * 0.028) * scale,
        index % 3 === 0 ? materials.shadow : materials.crackedBone,
      );
      plate.name = `ISLAND_17_TITAN_SKULL_360_SIDE_CRANIUM_CHIPPED_PLATE_${side < 0 ? 'LEFT' : 'RIGHT'}_${index + 1}`;
      plate.position.set(
        side * 0.72 * scale,
        (1.28 + index * 0.13) * scale,
        (-0.46 + (index % 3) * 0.26) * scale,
      );
      plate.rotation.set(0.16 + index * 0.04, side * 0.72, side * (0.4 - index * 0.08));
      plate.userData.keepSeparate = true;
      skull.add(plate);
    }

    skull.add(sideSocket, sideEyeGlow, sideJawPlane, sideSeam, sideBrowShelf, sideCheekCut, sideOccipitalVoid, sideOccipitalGlow);
  });

  const rearCrackPaths = [
    [new THREE.Vector3(-0.28, 1.78, -0.58), new THREE.Vector3(-0.16, 1.58, -0.7), new THREE.Vector3(-0.02, 1.38, -0.72)],
    [new THREE.Vector3(0.34, 1.72, -0.55), new THREE.Vector3(0.2, 1.52, -0.69), new THREE.Vector3(0.08, 1.22, -0.73)],
    [new THREE.Vector3(-0.46, 1.18, -0.52), new THREE.Vector3(-0.28, 1.06, -0.68), new THREE.Vector3(-0.08, 0.95, -0.7)],
    [new THREE.Vector3(0.46, 1.18, -0.52), new THREE.Vector3(0.28, 1.06, -0.68), new THREE.Vector3(0.08, 0.95, -0.7)],
  ];
  rearCrackPaths.forEach((path, index) => {
    const rearCrack = curveTube(
      path.map((point) => point.clone().multiplyScalar(scale)),
      (index < 2 ? 0.005 : 0.0038) * scale,
      index === 1 ? materials.moss : materials.shadow,
      quality,
      14,
    );
    rearCrack.name = `ISLAND_17_TITAN_SKULL_360_REAR_CRACK_${index + 1}`;
    rearCrack.userData.keepSeparate = true;
    skull.add(rearCrack);
  });

  const rearBrowArc = curveTube([
    new THREE.Vector3(-0.48 * scale, 1.44 * scale, -0.78 * scale),
    new THREE.Vector3(-0.24 * scale, 1.53 * scale, -0.88 * scale),
    new THREE.Vector3(0, 1.56 * scale, -0.91 * scale),
    new THREE.Vector3(0.24 * scale, 1.53 * scale, -0.88 * scale),
    new THREE.Vector3(0.48 * scale, 1.44 * scale, -0.78 * scale),
  ], 0.028 * scale, materials.agedBone, quality, 22);
  rearBrowArc.name = 'ISLAND_17_TITAN_SKULL_360_REAR_HEAVY_BROW_ARC';
  const rearJawShelf = curveTube([
    new THREE.Vector3(-0.4 * scale, 0.96 * scale, -0.78 * scale),
    new THREE.Vector3(-0.2 * scale, 0.88 * scale, -0.88 * scale),
    new THREE.Vector3(0, 0.86 * scale, -0.91 * scale),
    new THREE.Vector3(0.2 * scale, 0.88 * scale, -0.88 * scale),
    new THREE.Vector3(0.4 * scale, 0.96 * scale, -0.78 * scale),
  ], 0.03 * scale, materials.crackedBone, quality, 22);
  rearJawShelf.name = 'ISLAND_17_TITAN_SKULL_360_REAR_JAW_SHELF';
  skull.add(rearBrowArc, rearJawShelf);

  [-1, 1].forEach((side) => {
    const rearSocket = sphere(0.13 * scale, materials.shadow, quality === 'low' ? 7 : 9);
    rearSocket.name = `ISLAND_17_TITAN_SKULL_360_REAR_SOCKET_VOID_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    rearSocket.position.set(side * 0.27 * scale, 1.33 * scale, -0.84 * scale);
    rearSocket.scale.set(1.5, 0.82, 0.2);
    rearSocket.userData.keepSeparate = true;

    const rearSocketGlow = sphere(0.044 * scale, materials.soulfireGlass, quality === 'low' ? 7 : 9);
    rearSocketGlow.name = `ISLAND_17_TITAN_SKULL_360_REAR_SOCKET_GLOW_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    rearSocketGlow.position.set(side * 0.27 * scale, 1.33 * scale, -0.93 * scale);
    rearSocketGlow.scale.set(1.08, 0.72, 0.34);
    rearSocketGlow.userData.keepSeparate = true;

    const rearCheek = sphere(0.12 * scale, materials.agedBone, quality === 'low' ? 7 : 9);
    rearCheek.name = `ISLAND_17_TITAN_SKULL_360_REAR_CHEEK_PLATE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    rearCheek.position.set(side * 0.36 * scale, 1.08 * scale, -0.75 * scale);
    rearCheek.scale.set(1.42, 0.42, 0.28);
    rearCheek.rotation.set(0.04, side * 0.22, side * -0.28);

    const sideTempleRidge = curveTube([
      new THREE.Vector3(side * 0.46 * scale, 1.34 * scale, 0.34 * scale),
      new THREE.Vector3(side * 0.66 * scale, 1.18 * scale, -0.08 * scale),
      new THREE.Vector3(side * 0.48 * scale, 1.02 * scale, -0.58 * scale),
    ], 0.026 * scale, materials.agedBone, quality, 18);
    sideTempleRidge.name = `ISLAND_17_TITAN_SKULL_360_WRAPAROUND_TEMPLE_RIDGE_${side < 0 ? 'LEFT' : 'RIGHT'}`;

    skull.add(rearSocket, rearSocketGlow, rearCheek, sideTempleRidge);
  });

  const rearNasalGouge = box(0.12 * scale, 0.26 * scale, 0.04 * scale, materials.shadow);
  rearNasalGouge.name = 'ISLAND_17_TITAN_SKULL_360_REAR_TRIANGULAR_GOUGE';
  rearNasalGouge.position.set(0, 1.14 * scale, -0.94 * scale);
  rearNasalGouge.rotation.z = Math.PI / 4;
  rearNasalGouge.userData.keepSeparate = true;
  const rearMouthGlow = sphere(0.07 * scale, materials.soulfireGlass, quality === 'low' ? 7 : 9);
  rearMouthGlow.name = 'ISLAND_17_TITAN_SKULL_360_REAR_MOUTH_RIFT_GLOW';
  rearMouthGlow.position.set(0, 0.96 * scale, -0.96 * scale);
  rearMouthGlow.scale.set(2.4, 0.38, 0.24);
  rearMouthGlow.userData.keepSeparate = true;
  const rearFractureCavity = sphere(0.16 * scale, materials.shadow, quality === 'low' ? 7 : 9);
  rearFractureCavity.name = 'ISLAND_17_TITAN_SKULL_360_REAR_OCCIPITAL_FRACTURE_CAVITY';
  rearFractureCavity.position.set(0, 1.55 * scale, -0.88 * scale);
  rearFractureCavity.scale.set(2.4, 0.62, 0.16);
  rearFractureCavity.userData.keepSeparate = true;
  const rearFractureGlow = sphere(0.052 * scale, materials.soulfireGlass, quality === 'low' ? 7 : 9);
  rearFractureGlow.name = 'ISLAND_17_TITAN_SKULL_360_REAR_FRACTURE_SOULFIRE';
  rearFractureGlow.position.set(0, 1.56 * scale, -0.96 * scale);
  rearFractureGlow.scale.set(1.7, 0.34, 0.22);
  rearFractureGlow.userData.keepSeparate = true;
  skull.add(rearNasalGouge, rearMouthGlow, rearFractureCavity, rearFractureGlow);

  for (let index = 0; index < amount(quality, 7, 5, 4); index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const rearChip = sphere(0.028 * scale, index % 2 ? materials.agedBone : materials.crackedBone, quality === 'low' ? 6 : 8);
    rearChip.name = `ISLAND_17_TITAN_SKULL_360_REAR_CHIPPED_PLATE_${index + 1}`;
    rearChip.position.set(
      side * (0.1 + (index % 4) * 0.1) * scale,
      (1.18 + (index % 3) * 0.19) * scale,
      (-0.62 - (index % 2) * 0.04) * scale,
    );
    rearChip.scale.set(1.5, 0.42, 0.24);
    rearChip.rotation.set(0.08, side * -0.2, side * (0.28 + index * 0.04));
    skull.add(rearChip);
  }

  const rearUpperRune = torus(0.105 * scale, 0.0045 * scale, materials.bronze, segments(quality) * 2);
  rearUpperRune.name = 'ISLAND_17_TITAN_SKULL_360_REAR_UPPER_CRANIUM_RUNE';
  rearUpperRune.position.set(-0.18 * scale, 1.76 * scale, -0.28 * scale);
  rearUpperRune.rotation.set(Math.PI * 0.52, 0, 0.08);
  rearUpperRune.scale.set(1.1, 0.62, 1);
  skull.add(rearUpperRune);

  const rearTopRune = torus(0.08 * scale, 0.004 * scale, materials.bronze, segments(quality) * 2);
  rearTopRune.name = 'ISLAND_17_TITAN_SKULL_360_TOP_REAR_RUNE_DISC';
  rearTopRune.position.set(0.2 * scale, 1.9 * scale, -0.2 * scale);
  rearTopRune.rotation.set(Math.PI * 0.47, 0, -0.2);
  rearTopRune.scale.set(1.08, 0.64, 1);
  skull.add(rearTopRune);

  const rearUpperCracks = [
    [new THREE.Vector3(-0.48, 2.04, -0.18), new THREE.Vector3(-0.28, 1.9, -0.28), new THREE.Vector3(-0.06, 1.78, -0.34)],
    [new THREE.Vector3(0.44, 2.0, -0.18), new THREE.Vector3(0.26, 1.86, -0.3), new THREE.Vector3(0.06, 1.72, -0.36)],
    [new THREE.Vector3(-0.36, 1.82, -0.36), new THREE.Vector3(-0.1, 1.74, -0.46), new THREE.Vector3(0.2, 1.68, -0.44)],
    [new THREE.Vector3(0.42, 1.6, -0.42), new THREE.Vector3(0.18, 1.5, -0.52), new THREE.Vector3(-0.06, 1.42, -0.52)],
    [new THREE.Vector3(-0.42, 1.46, -0.42), new THREE.Vector3(-0.24, 1.36, -0.52), new THREE.Vector3(-0.02, 1.28, -0.52)],
  ];
  rearUpperCracks.forEach((path, index) => {
    const rearUpperCrack = curveTube(
      path.map((point) => point.clone().multiplyScalar(scale)),
      (index < 2 ? 0.008 : 0.0055) * scale,
      index === 2 ? materials.moss : materials.shadow,
      quality,
      14,
    );
    rearUpperCrack.name = `ISLAND_17_TITAN_SKULL_360_REAR_UPPER_CRACK_${index + 1}`;
    rearUpperCrack.userData.keepSeparate = true;
    skull.add(rearUpperCrack);
  });

  const rearScarLattice = [
    [-0.18, 1.9, -0.26, 0.09, 0.012, 0.02, -0.34],
    [0.02, 1.86, -0.27, 0.13, 0.011, 0.02, 0.22],
    [0.22, 1.78, -0.3, 0.11, 0.012, 0.02, -0.18],
    [-0.3, 1.72, -0.32, 0.1, 0.011, 0.02, 0.3],
    [0.12, 1.66, -0.34, 0.15, 0.012, 0.02, -0.28],
    [-0.06, 1.58, -0.38, 0.12, 0.01, 0.018, 0.18],
  ] as const;
  rearScarLattice.forEach(([x, y, z, width, height, depth, rot], index) => {
    const scar = box(width * scale, height * scale, depth * scale, index % 2 ? materials.agedBone : materials.shadow);
    scar.name = `ISLAND_17_TITAN_SKULL_360_REAR_SCAR_LATTICE_${index + 1}`;
    scar.position.set(x * scale, y * scale, z * scale);
    scar.rotation.set(0.36, 0, rot);
    scar.userData.keepSeparate = true;
    skull.add(scar);
  });

  for (let index = 0; index < amount(quality, 8, 6, 4); index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const plate = box(
      (0.08 + (index % 3) * 0.02) * scale,
      (0.024 + (index % 2) * 0.012) * scale,
      0.02 * scale,
      index % 3 === 0 ? materials.agedBone : materials.crackedBone,
    );
    plate.name = `ISLAND_17_TITAN_SKULL_360_REAR_UPPER_BONE_PLATE_${index + 1}`;
    plate.position.set(
      side * (0.1 + (index % 4) * 0.095) * scale,
      (1.62 + (index % 4) * 0.105) * scale,
      (-0.32 - (index % 2) * 0.075) * scale,
    );
    plate.rotation.set(0.34, side * -0.24, side * (0.36 + index * 0.07));
    skull.add(plate);
  }

  const rearDeathMaskPlate = sphere(0.22 * scale, materials.shadow, quality === 'low' ? 8 : 10);
  rearDeathMaskPlate.name = 'ISLAND_17_TITAN_SKULL_360_REAR_DEEP_DEATH_MASK_VOID';
  rearDeathMaskPlate.position.set(0, 1.22 * scale, -0.94 * scale);
  rearDeathMaskPlate.scale.set(2.05, 1.26, 0.16);
  rearDeathMaskPlate.userData.keepSeparate = true;
  const rearDeathMaskGlow = sphere(0.086 * scale, materials.soulfireGlass, quality === 'low' ? 7 : 9);
  rearDeathMaskGlow.name = 'ISLAND_17_TITAN_SKULL_360_REAR_DEATH_MASK_SOULFIRE_CORE';
  rearDeathMaskGlow.position.set(0, 1.2 * scale, -1.02 * scale);
  rearDeathMaskGlow.scale.set(1.82, 0.5, 0.18);
  rearDeathMaskGlow.userData.keepSeparate = true;
  skull.add(rearDeathMaskPlate, rearDeathMaskGlow);

  const rearToothCount = amount(quality, 7, 5, 4);
  for (let index = 0; index < rearToothCount; index += 1) {
    const centered = index - Math.floor(rearToothCount / 2);
    const rearTooth = box(0.035 * scale, 0.1 * scale, 0.038 * scale, materials.bone);
    rearTooth.name = `ISLAND_17_TITAN_SKULL_360_REAR_BROKEN_TOOTH_STELA_${index + 1}`;
    rearTooth.position.set(centered * 0.064 * scale, 0.98 * scale, -0.98 * scale);
    rearTooth.rotation.set(0.22, 0, centered * 0.035);
    rearTooth.userData.keepSeparate = true;
    skull.add(rearTooth);
  }

  const rearCraniumBands = [
    [-0.48, 1.9, -0.3, -0.22, 1.72, -0.5],
    [0.5, 1.86, -0.32, 0.18, 1.68, -0.52],
    [-0.4, 1.5, -0.5, -0.08, 1.33, -0.7],
    [0.42, 1.5, -0.5, 0.08, 1.32, -0.7],
  ] as const;
  rearCraniumBands.forEach(([x1, y1, z1, x2, y2, z2], index) => {
    const band = tubeBetween(
      new THREE.Vector3(x1 * scale, y1 * scale, z1 * scale),
      new THREE.Vector3(x2 * scale, y2 * scale, z2 * scale),
      (index < 2 ? 0.024 : 0.018) * scale,
      index % 2 ? materials.agedBone : materials.crackedBone,
      quality === 'low' ? 5 : 7,
    );
    band.name = `ISLAND_17_TITAN_SKULL_360_REAR_RAISED_CRANIUM_BAND_${index + 1}`;
    skull.add(band);
  });

  const rearCraniumRibPaths = [
    [new THREE.Vector3(-0.5, 1.52, -0.72), new THREE.Vector3(-0.24, 1.48, -0.9), new THREE.Vector3(0.02, 1.42, -0.96)],
    [new THREE.Vector3(0.5, 1.52, -0.72), new THREE.Vector3(0.24, 1.48, -0.9), new THREE.Vector3(-0.02, 1.42, -0.96)],
    [new THREE.Vector3(-0.46, 1.22, -0.76), new THREE.Vector3(-0.18, 1.16, -0.94), new THREE.Vector3(0.12, 1.1, -0.96)],
    [new THREE.Vector3(0.46, 1.22, -0.76), new THREE.Vector3(0.18, 1.16, -0.94), new THREE.Vector3(-0.12, 1.1, -0.96)],
  ];
  rearCraniumRibPaths.forEach((path, index) => {
    const rib = curveTube(
      path.map((point) => point.clone().multiplyScalar(scale)),
      0.018 * scale,
      index % 2 ? materials.agedBone : materials.bone,
      quality,
      16,
    );
    rib.name = `ISLAND_17_TITAN_SKULL_360_REAR_OCCIPITAL_RIB_RELIEF_${index + 1}`;
    skull.add(rib);
  });

  const nasalVoidDepth = sphere(0.17 * scale, materials.shadow, quality === 'low' ? 7 : 9);
  nasalVoidDepth.name = 'ISLAND_17_TITAN_SKULL_TALL_TRIANGULAR_NASAL_VOID_CORE';
  nasalVoidDepth.position.set(0, 0.84 * scale, 0.76 * scale);
  nasalVoidDepth.scale.set(0.62, 1.55, 0.25);

  const upperMouthCavern = sphere(0.24 * scale, materials.shadow, quality === 'low' ? 7 : 9);
  upperMouthCavern.name = 'ISLAND_17_TITAN_SKULL_DEEP_UPPER_MOUTH_CAVERN';
  upperMouthCavern.position.set(0, 0.66 * scale, 0.74 * scale);
  upperMouthCavern.scale.set(1.9, 0.45, 0.28);

  const lowerSoulGlow = sphere(0.18 * scale, materials.soulfireGlass, quality === 'low' ? 8 : 10);
  lowerSoulGlow.name = 'ISLAND_17_TITAN_SKULL_JAW_WELL_SOULFIRE_VOLUME';
  lowerSoulGlow.position.set(0, 0.44 * scale, 0.73 * scale);
  lowerSoulGlow.scale.set(1.45, 0.72, 0.42);

  skull.add(nasalVoidDepth, upperMouthCavern, lowerSoulGlow);

  const fangCount = amount(quality, 11, 9, 7);
  for (let index = 0; index < fangCount; index += 1) {
    const centered = index - (fangCount - 1) / 2;
    const fang = new THREE.Mesh(
      new THREE.ConeGeometry((0.021 + (index % 3) * 0.004) * scale, (0.16 + (index % 4) * 0.025) * scale, quality === 'low' ? 5 : 7),
      index % 2 ? materials.bone : materials.agedBone,
    );
    fang.name = `ISLAND_17_TITAN_SKULL_PHONE_UNEVEN_FRONT_FANG_${index + 1}`;
    fang.position.set(centered * 0.062 * scale, (0.73 - Math.abs(centered) * 0.008) * scale, 0.93 * scale);
    fang.rotation.set(Math.PI + 0.04 * (index % 2 ? 1 : -1), 0, centered * -0.026);
    fang.userData.keepSeparate = true;
    skull.add(fang);
  }
}

function createTitanSkullHeadV2(materials: Island17TitansRestMaterials, quality: Island3DQuality, scale: number) {
  const skull = new THREE.Group();
  skull.name = 'ISLAND_17_TITAN_SKULL_V2_ANATOMICAL_ASSEMBLY';

  const cranium = sphere(0.74 * scale, materials.crackedBone, segments(quality));
  cranium.name = 'ISLAND_17_TITAN_SKULL_V2_CRANIAL_VAULT';
  cranium.position.set(0, 1.34 * scale, -0.04 * scale);
  cranium.scale.set(0.84, 0.87, 0.56);

  const frontalBone = sphere(0.56 * scale, materials.agedBone, segments(quality));
  frontalBone.name = 'ISLAND_17_TITAN_SKULL_V2_SLOPED_FRONTAL_BONE';
  frontalBone.position.set(0, 1.22 * scale, 0.31 * scale);
  frontalBone.scale.set(1.02, 0.72, 0.88);
  frontalBone.rotation.x = -0.08;

  const occipitalBone = sphere(0.62 * scale, materials.crackedBone, segments(quality));
  occipitalBone.name = 'ISLAND_17_TITAN_SKULL_V2_OCCIPITAL_VOLUME';
  occipitalBone.position.set(0, 1.34 * scale, -0.26 * scale);
  occipitalBone.scale.set(0.86, 0.75, 0.62);

  const maxilla = sphere(0.32 * scale, materials.agedBone, quality === 'low' ? 9 : 12);
  maxilla.name = 'ISLAND_17_TITAN_SKULL_V2_PROJECTING_MAXILLA';
  maxilla.position.set(0, 0.76 * scale, 0.53 * scale);
  maxilla.scale.set(1.16, 0.72, 0.82);

  const faceShellShape = new THREE.Shape();
  faceShellShape.moveTo(0, 1.48 * scale);
  faceShellShape.bezierCurveTo(0.34 * scale, 1.49 * scale, 0.59 * scale, 1.36 * scale, 0.62 * scale, 1.12 * scale);
  faceShellShape.bezierCurveTo(0.64 * scale, 0.93 * scale, 0.55 * scale, 0.78 * scale, 0.49 * scale, 0.64 * scale);
  faceShellShape.bezierCurveTo(0.48 * scale, 0.4 * scale, 0.4 * scale, 0.14 * scale, 0.18 * scale, 0.04 * scale);
  faceShellShape.bezierCurveTo(0.08 * scale, 0, -0.08 * scale, 0, -0.18 * scale, 0.04 * scale);
  faceShellShape.bezierCurveTo(-0.4 * scale, 0.14 * scale, -0.48 * scale, 0.4 * scale, -0.49 * scale, 0.64 * scale);
  faceShellShape.bezierCurveTo(-0.55 * scale, 0.78 * scale, -0.64 * scale, 0.93 * scale, -0.62 * scale, 1.12 * scale);
  faceShellShape.bezierCurveTo(-0.59 * scale, 1.36 * scale, -0.34 * scale, 1.49 * scale, 0, 1.48 * scale);
  const leftOrbitHole = new THREE.Path();
  leftOrbitHole.absellipse(-0.27 * scale, 1.1 * scale, 0.22 * scale, 0.18 * scale, -0.1, Math.PI * 2, true);
  const rightOrbitHole = new THREE.Path();
  rightOrbitHole.absellipse(0.27 * scale, 1.1 * scale, 0.22 * scale, 0.18 * scale, 0.1, Math.PI * 2, true);
  const noseHole = new THREE.Path([
    new THREE.Vector2(0, 1.04 * scale),
    new THREE.Vector2(0.12 * scale, 0.72 * scale),
    new THREE.Vector2(0, 0.62 * scale),
    new THREE.Vector2(-0.12 * scale, 0.72 * scale),
  ]);
  const mouthHole = new THREE.Path();
  mouthHole.moveTo(-0.31 * scale, 0.62 * scale);
  mouthHole.bezierCurveTo(-0.24 * scale, 0.45 * scale, -0.18 * scale, 0.24 * scale, 0, 0.2 * scale);
  mouthHole.bezierCurveTo(0.18 * scale, 0.24 * scale, 0.24 * scale, 0.45 * scale, 0.31 * scale, 0.62 * scale);
  mouthHole.bezierCurveTo(0.2 * scale, 0.53 * scale, -0.2 * scale, 0.53 * scale, -0.31 * scale, 0.62 * scale);
  faceShellShape.holes.push(leftOrbitHole, rightOrbitHole, noseHole, mouthHole);
  const faceShell = new THREE.Mesh(
    new THREE.ExtrudeGeometry(faceShellShape, {
      depth: 0.25 * scale,
      bevelEnabled: true,
      bevelSegments: quality === 'low' ? 2 : 4,
      bevelSize: 0.055 * scale,
      bevelThickness: 0.07 * scale,
      curveSegments: quality === 'low' ? 12 : 20,
    }),
    materials.crackedBone,
  );
  faceShell.name = 'ISLAND_17_TITAN_SKULL_V4_CONTINUOUS_PERFORATED_FACE_SHELL';
  faceShell.position.set(0, 0, 0.43 * scale);
  faceShell.rotation.x = -0.025;
  faceShell.geometry.computeVertexNormals();

  skull.add(cranium, frontalBone, occipitalBone, maxilla, faceShell);

  [-1, 1].forEach((side) => {
    const templeMass = sphere(0.3 * scale, materials.crackedBone, quality === 'low' ? 8 : 11);
    templeMass.name = `ISLAND_17_TITAN_SKULL_V2_TEMPORAL_MASS_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    templeMass.position.set(side * 0.48 * scale, 1.16 * scale, -0.02 * scale);
    templeMass.scale.set(0.82, 1.03, 1.1);
    templeMass.rotation.y = side * 0.12;

    const sideFacePlate = sphere(0.25 * scale, materials.agedBone, quality === 'low' ? 8 : 10);
    sideFacePlate.name = `ISLAND_17_TITAN_SKULL_V2_LATERAL_FACE_PLATE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    sideFacePlate.position.set(side * 0.5 * scale, 0.94 * scale, 0.24 * scale);
    sideFacePlate.scale.set(0.68, 1.12, 1.18);
    sideFacePlate.rotation.set(-0.12, side * 0.22, side * -0.16);

    const orbitVoid = sphere(0.19 * scale, materials.shadow, quality === 'low' ? 9 : 12);
    orbitVoid.name = `ISLAND_17_TITAN_SKULL_V2_DEEP_ORBIT_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    orbitVoid.position.set(side * 0.27 * scale, 1.12 * scale, 0.68 * scale);
    orbitVoid.scale.set(1.42, 1.13, 0.34);
    orbitVoid.rotation.z = side * -0.1;
    orbitVoid.userData.keepSeparate = true;

    const orbitInner = sphere(0.13 * scale, materials.shadow, quality === 'low' ? 8 : 10);
    orbitInner.name = `ISLAND_17_TITAN_SKULL_V2_ORBIT_DEPTH_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    orbitInner.position.set(side * 0.28 * scale, 1.11 * scale, 0.79 * scale);
    orbitInner.scale.set(1.34, 1.0, 0.3);
    orbitInner.userData.keepSeparate = true;

    const eyeCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.085 * scale, quality === 'high' ? 1 : 0),
      materials.soulfireGlass,
    );
    eyeCore.name = `ISLAND_17_TITAN_SKULL_V2_RECESSED_SOUL_EYE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    eyeCore.position.set(side * 0.285 * scale, 1.1 * scale, 0.845 * scale);
    eyeCore.scale.set(0.92, 1.12, 0.58);
    eyeCore.rotation.z = side * 0.18;
    eyeCore.userData.keepSeparate = true;

    const brow = sphere(0.22 * scale, materials.agedBone, quality === 'low' ? 8 : 11);
    brow.name = `ISLAND_17_TITAN_SKULL_V2_HEAVY_BROW_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    brow.position.set(side * 0.28 * scale, 1.31 * scale, 0.62 * scale);
    brow.scale.set(1.62, 0.42, 0.56);
    brow.rotation.set(-0.08, side * -0.08, side * 0.13);

    const lowerOrbitRim = curveTube([
      new THREE.Vector3(side * 0.08 * scale, 1.03 * scale, 0.76 * scale),
      new THREE.Vector3(side * 0.26 * scale, 0.96 * scale, 0.79 * scale),
      new THREE.Vector3(side * 0.45 * scale, 1.0 * scale, 0.62 * scale),
    ], 0.035 * scale, materials.crackedBone, quality, 18);
    lowerOrbitRim.name = `ISLAND_17_TITAN_SKULL_V2_LOWER_ORBIT_RIM_${side < 0 ? 'LEFT' : 'RIGHT'}`;

    const cheekArch = curveTube([
      new THREE.Vector3(side * 0.43 * scale, 1.02 * scale, 0.58 * scale),
      new THREE.Vector3(side * 0.59 * scale, 0.87 * scale, 0.34 * scale),
      new THREE.Vector3(side * 0.5 * scale, 0.69 * scale, 0.2 * scale),
      new THREE.Vector3(side * 0.34 * scale, 0.62 * scale, 0.48 * scale),
    ], 0.065 * scale, materials.agedBone, quality, 22);
    cheekArch.name = `ISLAND_17_TITAN_SKULL_V2_ZYGOMATIC_ARCH_${side < 0 ? 'LEFT' : 'RIGHT'}`;

    const lateralArch = curveTube([
      new THREE.Vector3(side * 0.46 * scale, 1.03 * scale, 0.48 * scale),
      new THREE.Vector3(side * 0.66 * scale, 1.03 * scale, 0.06 * scale),
      new THREE.Vector3(side * 0.58 * scale, 0.94 * scale, -0.37 * scale),
    ], 0.044 * scale, materials.crackedBone, quality, 20);
    lateralArch.name = `ISLAND_17_TITAN_SKULL_V2_LATERAL_CHEEK_ARCH_${side < 0 ? 'LEFT' : 'RIGHT'}`;

    const temporalVoid = sphere(0.15 * scale, materials.shadow, quality === 'low' ? 8 : 10);
    temporalVoid.name = `ISLAND_17_TITAN_SKULL_V2_TEMPORAL_FOSSA_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    temporalVoid.position.set(side * 0.66 * scale, 1.14 * scale, 0.02 * scale);
    temporalVoid.scale.set(0.2, 1.08, 1.3);
    temporalVoid.userData.keepSeparate = true;

    const sideOrbitVoid = sphere(0.17 * scale, materials.shadow, quality === 'low' ? 8 : 11);
    sideOrbitVoid.name = `ISLAND_17_TITAN_SKULL_V3_SIDE_ORBIT_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    sideOrbitVoid.position.set(side * 0.67 * scale, 1.16 * scale, 0.46 * scale);
    sideOrbitVoid.scale.set(0.19, 1.08, 1.22);
    sideOrbitVoid.userData.keepSeparate = true;

    const sideOrbitGlow = sphere(0.058 * scale, materials.soulfireGlass, quality === 'low' ? 7 : 9);
    sideOrbitGlow.name = `ISLAND_17_TITAN_SKULL_V3_SIDE_ORBIT_SOULFIRE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    sideOrbitGlow.position.set(side * 0.696 * scale, 1.15 * scale, 0.47 * scale);
    sideOrbitGlow.scale.set(0.22, 0.82, 0.82);
    sideOrbitGlow.userData.keepSeparate = true;

    const sideMuzzleRidge = curveTube([
      new THREE.Vector3(side * 0.59 * scale, 1.17 * scale, 0.42 * scale),
      new THREE.Vector3(side * 0.5 * scale, 0.94 * scale, 0.62 * scale),
      new THREE.Vector3(side * 0.36 * scale, 0.7 * scale, 0.72 * scale),
    ], 0.052 * scale, materials.agedBone, quality, 18);
    sideMuzzleRidge.name = `ISLAND_17_TITAN_SKULL_V2_SIDE_MUZZLE_RIDGE_${side < 0 ? 'LEFT' : 'RIGHT'}`;

    const jawRamus = curveTube([
      new THREE.Vector3(side * 0.48 * scale, 0.72 * scale, 0.12 * scale),
      new THREE.Vector3(side * 0.5 * scale, 0.46 * scale, 0.22 * scale),
      new THREE.Vector3(side * 0.36 * scale, 0.25 * scale, 0.4 * scale),
    ], 0.067 * scale, materials.agedBone, quality, 18);
    jawRamus.name = `ISLAND_17_TITAN_SKULL_V2_MANDIBLE_RAMUS_${side < 0 ? 'LEFT' : 'RIGHT'}`;

    const sideJawPlate = sphere(0.27 * scale, materials.agedBone, quality === 'low' ? 8 : 10);
    sideJawPlate.name = `ISLAND_17_TITAN_SKULL_V3_BROAD_MANDIBLE_PLATE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    sideJawPlate.position.set(side * 0.51 * scale, 0.46 * scale, 0.2 * scale);
    sideJawPlate.scale.set(0.42, 1.36, 0.86);
    sideJawPlate.rotation.set(-0.08, side * 0.14, side * -0.08);

    const sideJawVoid = sphere(0.14 * scale, materials.shadow, quality === 'low' ? 7 : 9);
    sideJawVoid.name = `ISLAND_17_TITAN_SKULL_V3_MANDIBLE_NOTCH_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    sideJawVoid.position.set(side * 0.63 * scale, 0.58 * scale, 0.14 * scale);
    sideJawVoid.scale.set(0.2, 0.78, 1.04);
    sideJawVoid.userData.keepSeparate = true;

    skull.add(
      templeMass,
      sideFacePlate,
      orbitVoid,
      orbitInner,
      eyeCore,
      brow,
      lowerOrbitRim,
      cheekArch,
      lateralArch,
      temporalVoid,
      sideOrbitVoid,
      sideOrbitGlow,
      sideMuzzleRidge,
      jawRamus,
      sideJawPlate,
      sideJawVoid,
    );
  });

  const nasalShape = new THREE.Shape();
  nasalShape.moveTo(0, 0.18 * scale);
  nasalShape.lineTo(0.105 * scale, -0.12 * scale);
  nasalShape.lineTo(0, -0.2 * scale);
  nasalShape.lineTo(-0.105 * scale, -0.12 * scale);
  nasalShape.closePath();
  const nasalVoid = new THREE.Mesh(
    new THREE.ExtrudeGeometry(nasalShape, {
      depth: 0.04 * scale,
      bevelEnabled: true,
      bevelSegments: quality === 'low' ? 1 : 2,
      bevelSize: 0.012 * scale,
      bevelThickness: 0.012 * scale,
    }),
    materials.shadow,
  );
  nasalVoid.name = 'ISLAND_17_TITAN_SKULL_V2_TRIANGULAR_NASAL_APERTURE';
  nasalVoid.position.set(0, 0.88 * scale, 0.725 * scale);
  nasalVoid.userData.keepSeparate = true;
  nasalVoid.geometry.computeVertexNormals();

  const nasalBridge = curveTube([
    new THREE.Vector3(0, 1.3 * scale, 0.66 * scale),
    new THREE.Vector3(-0.018 * scale, 1.12 * scale, 0.75 * scale),
    new THREE.Vector3(0, 0.97 * scale, 0.78 * scale),
  ], 0.032 * scale, materials.agedBone, quality, 16);
  nasalBridge.name = 'ISLAND_17_TITAN_SKULL_V2_NASAL_BRIDGE';

  const mouthVoid = sphere(0.2 * scale, materials.shadow, quality === 'low' ? 8 : 11);
  mouthVoid.name = 'ISLAND_17_TITAN_SKULL_V2_DEEP_MOUTH_CAVERN';
  mouthVoid.position.set(0, 0.59 * scale, 0.68 * scale);
  mouthVoid.scale.set(1.72, 0.62, 0.26);
  mouthVoid.userData.keepSeparate = true;

  const mouthSoul = sphere(0.11 * scale, materials.soulfireGlass, quality === 'low' ? 8 : 10);
  mouthSoul.name = 'ISLAND_17_TITAN_SKULL_V2_MOUTH_SOULFIRE_DEPTH';
  mouthSoul.position.set(0, 0.56 * scale, 0.75 * scale);
  mouthSoul.scale.set(1.7, 0.54, 0.2);
  mouthSoul.userData.keepSeparate = true;

  const mandible = curveTube([
    new THREE.Vector3(-0.4 * scale, 0.24 * scale, 0.4 * scale),
    new THREE.Vector3(-0.2 * scale, 0.1 * scale, 0.52 * scale),
    new THREE.Vector3(0, 0.06 * scale, 0.56 * scale),
    new THREE.Vector3(0.2 * scale, 0.1 * scale, 0.52 * scale),
    new THREE.Vector3(0.4 * scale, 0.24 * scale, 0.4 * scale),
  ], 0.078 * scale, materials.agedBone, quality, 28);
  mandible.name = 'ISLAND_17_TITAN_SKULL_V2_U_SHAPED_MANDIBLE';

  const chin = sphere(0.2 * scale, materials.crackedBone, quality === 'low' ? 8 : 10);
  chin.name = 'ISLAND_17_TITAN_SKULL_V2_CHIN_PLATE';
  chin.position.set(0, 0.1 * scale, 0.53 * scale);
  chin.scale.set(1.58, 0.52, 0.68);

  skull.add(nasalVoid, nasalBridge, mouthVoid, mouthSoul, mandible, chin);

  const upperToothCount = amount(quality, 11, 9, 7);
  for (let index = 0; index < upperToothCount; index += 1) {
    if (index === 2) continue;
    const centered = index - (upperToothCount - 1) / 2;
    const tooth = sphere((0.04 + (index % 3) * 0.004) * scale, index % 3 === 0 ? materials.crackedBone : materials.bone, quality === 'low' ? 6 : 8);
    tooth.name = `ISLAND_17_TITAN_SKULL_V2_UPPER_TOOTH_${index + 1}`;
    tooth.position.set(centered * 0.072 * scale, (0.65 - Math.abs(centered) * 0.006 + (index % 3 - 1) * 0.008) * scale, 0.79 * scale);
    tooth.scale.set(0.72, 1.72 + (index % 3) * 0.16, 0.62);
    tooth.rotation.z = centered * -0.018;
    tooth.userData.keepSeparate = true;
    skull.add(tooth);
  }
  const lowerToothCount = amount(quality, 9, 7, 5);
  for (let index = 0; index < lowerToothCount; index += 1) {
    if (index === lowerToothCount - 3) continue;
    const centered = index - (lowerToothCount - 1) / 2;
    const tooth = sphere((0.035 + (index % 2) * 0.004) * scale, index % 2 ? materials.agedBone : materials.bone, quality === 'low' ? 6 : 8);
    tooth.name = `ISLAND_17_TITAN_SKULL_V2_LOWER_TOOTH_${index + 1}`;
    tooth.position.set(centered * 0.073 * scale, (0.29 + (index % 2) * 0.008) * scale, 0.79 * scale);
    tooth.scale.set(0.72, 1.48 + (index % 3) * 0.12, 0.6);
    tooth.userData.keepSeparate = true;
    skull.add(tooth);
  }

  const crownSeal = torus(0.235 * scale, 0.013 * scale, materials.bronze, segments(quality) * 2);
  crownSeal.name = 'ISLAND_17_TITAN_SKULL_V2_ENGRAVED_CROWN_SEAL';
  crownSeal.position.set(0, 1.68 * scale, 0.58 * scale);
  crownSeal.rotation.x = -0.16;
  crownSeal.scale.set(1, 0.82, 0.72);
  skull.add(crownSeal);
  const crownSpokeCount = amount(quality, 8, 6, 5);
  for (let index = 0; index < crownSpokeCount; index += 1) {
    const spoke = box(0.01 * scale, 0.205 * scale, 0.012 * scale, materials.bronze);
    spoke.name = `ISLAND_17_TITAN_SKULL_V2_CROWN_SEAL_SPOKE_${index + 1}`;
    spoke.position.copy(crownSeal.position);
    spoke.rotation.set(crownSeal.rotation.x, 0, index / crownSpokeCount * Math.PI);
    spoke.userData.keepSeparate = true;
    skull.add(spoke);
  }

  const frontPlateLayout = [
    [-0.42, 1.62, 0.5, 0.15, -0.2],
    [-0.16, 1.82, 0.48, 0.17, 0.12],
    [0.22, 1.79, 0.5, 0.16, -0.16],
    [0.46, 1.54, 0.46, 0.14, 0.24],
  ] as const;
  frontPlateLayout.forEach(([x, y, z, radius, rotation], index) => {
    const plate = sphere(radius * scale, index % 2 ? materials.crackedBone : materials.agedBone, quality === 'low' ? 7 : 9);
    plate.name = `ISLAND_17_TITAN_SKULL_V2_RAISED_FRONTAL_PLATE_${index + 1}`;
    plate.position.set(x * scale, y * scale, z * scale);
    plate.scale.set(1.08, 0.34, 0.2);
    plate.rotation.set(-0.14, x * 0.3, rotation);
    skull.add(plate);
  });

  const frontCracks = [
    [new THREE.Vector3(-0.38, 1.86, 0.5), new THREE.Vector3(-0.27, 1.66, 0.62), new THREE.Vector3(-0.13, 1.45, 0.67)],
    [new THREE.Vector3(0.34, 1.9, 0.47), new THREE.Vector3(0.23, 1.67, 0.61), new THREE.Vector3(0.08, 1.48, 0.68)],
    [new THREE.Vector3(-0.48, 1.42, 0.5), new THREE.Vector3(-0.4, 1.28, 0.61), new THREE.Vector3(-0.46, 1.13, 0.59)],
    [new THREE.Vector3(0.5, 1.43, 0.48), new THREE.Vector3(0.4, 1.28, 0.62), new THREE.Vector3(0.47, 1.12, 0.58)],
  ];
  frontCracks.forEach((path, index) => {
    const crack = curveTube(
      path.map((point) => point.clone().multiplyScalar(scale)),
      (index < 2 ? 0.007 : 0.005) * scale,
      index === 2 ? materials.moss : materials.shadow,
      quality,
      16,
    );
    crack.name = `ISLAND_17_TITAN_SKULL_V2_FRONT_FRACTURE_${index + 1}`;
    crack.userData.keepSeparate = true;
    skull.add(crack);
  });

  const rearCavity = sphere(0.18 * scale, materials.shadow, quality === 'low' ? 8 : 10);
  rearCavity.name = 'ISLAND_17_TITAN_SKULL_V2_BROKEN_OCCIPITAL_CAVITY';
  rearCavity.position.set(0.22 * scale, 0.92 * scale, -0.61 * scale);
  rearCavity.scale.set(0.95, 0.66, 0.22);
  rearCavity.rotation.z = -0.24;
  rearCavity.userData.keepSeparate = true;
  const rearCavityGlow = sphere(0.075 * scale, materials.soulfireGlass, quality === 'low' ? 7 : 9);
  rearCavityGlow.name = 'ISLAND_17_TITAN_SKULL_V2_OCCIPITAL_CAVITY_SOULFIRE';
  rearCavityGlow.position.set(0.22 * scale, 0.92 * scale, -0.65 * scale);
  rearCavityGlow.scale.set(0.48, 0.36, 0.16);
  rearCavityGlow.userData.keepSeparate = true;
  skull.add(rearCavity, rearCavityGlow);

  const rearRimAngles = [-1.45, -0.75, 0.02, 0.78, 1.48];
  rearRimAngles.forEach((angle, index) => {
    const shard = new THREE.Mesh(
      new THREE.DodecahedronGeometry((0.075 + (index % 2) * 0.018) * scale, 0),
      index % 2 ? materials.agedBone : materials.crackedBone,
    );
    shard.name = `ISLAND_17_TITAN_SKULL_V2_OCCIPITAL_BREAK_RIM_${index + 1}`;
    shard.position.set(
      (0.22 + Math.cos(angle) * 0.15) * scale,
      (0.92 + Math.sin(angle) * 0.11) * scale,
      -0.59 * scale,
    );
    shard.scale.set(1.18, 0.68, 0.42);
    shard.rotation.set(angle * 0.12, angle * 0.08, angle);
    skull.add(shard);
  });

  const sagittalSuture = curveTube([
    new THREE.Vector3(0, 1.91 * scale, -0.38 * scale),
    new THREE.Vector3(-0.025 * scale, 1.67 * scale, -0.65 * scale),
    new THREE.Vector3(0.02 * scale, 1.4 * scale, -0.72 * scale),
    new THREE.Vector3(-0.015 * scale, 1.13 * scale, -0.68 * scale),
  ], 0.006 * scale, materials.shadow, quality, 20);
  sagittalSuture.name = 'ISLAND_17_TITAN_SKULL_V2_REAR_SAGITTAL_SUTURE';
  sagittalSuture.userData.keepSeparate = true;
  const leftLambdoid = curveTube([
    new THREE.Vector3(0, 1.38 * scale, -0.72 * scale),
    new THREE.Vector3(-0.24 * scale, 1.26 * scale, -0.7 * scale),
    new THREE.Vector3(-0.48 * scale, 1.12 * scale, -0.56 * scale),
  ], 0.007 * scale, materials.shadow, quality, 16);
  leftLambdoid.name = 'ISLAND_17_TITAN_SKULL_V2_REAR_LAMBDOID_SUTURE_LEFT';
  leftLambdoid.userData.keepSeparate = true;
  const rightLambdoid = leftLambdoid.clone();
  rightLambdoid.name = 'ISLAND_17_TITAN_SKULL_V2_REAR_LAMBDOID_SUTURE_RIGHT';
  rightLambdoid.scale.x = -1;
  rightLambdoid.userData.keepSeparate = true;

  const nuchalRidge = curveTube([
    new THREE.Vector3(-0.42 * scale, 0.85 * scale, -0.55 * scale),
    new THREE.Vector3(-0.2 * scale, 0.78 * scale, -0.69 * scale),
    new THREE.Vector3(0, 0.76 * scale, -0.73 * scale),
    new THREE.Vector3(0.2 * scale, 0.78 * scale, -0.69 * scale),
    new THREE.Vector3(0.42 * scale, 0.85 * scale, -0.55 * scale),
  ], 0.035 * scale, materials.agedBone, quality, 22);
  nuchalRidge.name = 'ISLAND_17_TITAN_SKULL_V2_REAR_NUCHAL_RIDGE';
  const foramen = sphere(0.13 * scale, materials.shadow, quality === 'low' ? 7 : 9);
  foramen.name = 'ISLAND_17_TITAN_SKULL_V2_REAR_FORAMEN_MAGNUM';
  foramen.position.set(0, 0.67 * scale, -0.69 * scale);
  foramen.scale.set(1.22, 0.62, 0.24);
  foramen.userData.keepSeparate = true;
  skull.add(sagittalSuture, leftLambdoid, rightLambdoid, nuchalRidge, foramen);

  const rearPlateLayout = [
    [-0.4, 1.66, -0.55, 0.15, -0.18],
    [-0.22, 1.84, -0.46, 0.16, 0.12],
    [0.08, 1.86, -0.49, 0.14, -0.08],
    [0.43, 1.34, -0.57, 0.15, 0.24],
    [-0.46, 1.22, -0.57, 0.13, -0.3],
  ] as const;
  rearPlateLayout.forEach(([x, y, z, radius, rotation], index) => {
    const plate = sphere(radius * scale, index % 2 ? materials.agedBone : materials.crackedBone, quality === 'low' ? 7 : 9);
    plate.name = `ISLAND_17_TITAN_SKULL_V2_RAISED_OCCIPITAL_PLATE_${index + 1}`;
    plate.position.set(x * scale, y * scale, z * scale);
    plate.scale.set(0.96, 0.32, 0.18);
    plate.rotation.set(0.16, x * -0.34, rotation);
    skull.add(plate);
  });

  return skull;
}

function createSkullHead(materials: Island17TitansRestMaterials, quality: Island3DQuality, scale = 1) {
  if (scale >= 0.95) return createTitanSkullHeadV2(materials, quality, scale);
  const skull = new THREE.Group();
  const detailed = scale >= 0.6;
  const titanScale = scale >= 0.95;
  const head = sphere(0.74 * scale, materials.crackedBone, segments(quality));
  head.name = 'ISLAND_17_SKULL_CONTINUOUS_CRANIUM_DOME';
  head.scale.set(titanScale ? 0.9 : 1.02, titanScale ? 0.82 : 1.04, titanScale ? 0.78 : 0.76);
  head.position.y = (titanScale ? 1.2 : 1.12) * scale;
  const leftBrow = titanScale
    ? sphere(0.2 * scale, materials.agedBone, quality === 'low' ? 7 : 9)
    : box(0.46 * scale, 0.09 * scale, 0.18 * scale, materials.agedBone);
  const rightBrow = leftBrow.clone();
  leftBrow.name = 'ISLAND_17_SKULL_LEFT_BROW_RIDGE';
  rightBrow.name = 'ISLAND_17_SKULL_RIGHT_BROW_RIDGE';
  leftBrow.position.set(-0.25 * scale, 1.24 * scale, (titanScale ? 0.67 : 0.57) * scale);
  rightBrow.position.set(0.25 * scale, 1.24 * scale, (titanScale ? 0.67 : 0.57) * scale);
  if (titanScale) {
    leftBrow.scale.set(1.38, 0.5, 0.38);
    rightBrow.scale.copy(leftBrow.scale);
  }
  leftBrow.rotation.set(titanScale ? -0.1 : 0, titanScale ? 0.1 : 0, -0.16);
  rightBrow.rotation.set(titanScale ? -0.1 : 0, titanScale ? -0.1 : 0, 0.16);
  const browCrest = detailed
    ? tubeBetween(
      new THREE.Vector3(-0.58 * scale, 1.31 * scale, (titanScale ? 0.66 : 0.55) * scale),
      new THREE.Vector3(0.58 * scale, 1.31 * scale, (titanScale ? 0.66 : 0.55) * scale),
      0.035 * scale,
      materials.agedBone,
      quality === 'low' ? 5 : 6,
    )
    : null;
  const jaw = titanScale ? sphere(0.34 * scale, materials.agedBone, quality === 'low' ? 8 : 10) : box(0.68 * scale, 0.48 * scale, 0.34 * scale, materials.agedBone);
  jaw.position.set(0, 0.54 * scale, 0.42 * scale);
  jaw.scale.set(titanScale ? 1.28 : 1, titanScale ? 0.82 : 1, titanScale ? 0.64 : 0.78);
  const chin = sphere(0.22 * scale, materials.agedBone, 8);
  chin.name = 'ISLAND_17_SKULL_CHIN_BONE';
  chin.position.set(0, 0.37 * scale, 0.52 * scale);
  chin.scale.set(1.55, 0.58, 0.65);
  const leftEye = sphere((titanScale ? 0.21 : 0.19) * scale, materials.shadow, 8);
  const rightEye = leftEye.clone();
  leftEye.position.set(-0.25 * scale, 1.12 * scale, (titanScale ? 0.73 : 0.63) * scale);
  rightEye.position.set(0.25 * scale, 1.12 * scale, (titanScale ? 0.73 : 0.63) * scale);
  leftEye.scale.set(titanScale ? 1.2 : 1.16, titanScale ? 0.9 : 0.86, 0.2);
  rightEye.scale.copy(leftEye.scale);
  const leftSocketRim = detailed ? torus(0.22 * scale, 0.025 * scale, materials.agedBone, segments(quality)) : null;
  const rightSocketRim = leftSocketRim?.clone() ?? null;
  if (leftSocketRim && rightSocketRim) {
    leftSocketRim.name = 'ISLAND_17_SKULL_LEFT_EYE_RIM';
    rightSocketRim.name = 'ISLAND_17_SKULL_RIGHT_EYE_RIM';
    leftSocketRim.position.set(-0.25 * scale, 1.15 * scale, (titanScale ? 0.72 : 0.61) * scale);
    rightSocketRim.position.set(0.25 * scale, 1.15 * scale, (titanScale ? 0.72 : 0.61) * scale);
    leftSocketRim.rotation.x = Math.PI * 0.04;
    rightSocketRim.rotation.x = Math.PI * 0.04;
    leftSocketRim.scale.set(titanScale ? 1.28 : 1.18, titanScale ? 0.86 : 0.72, 0.28);
    rightSocketRim.scale.copy(leftSocketRim.scale);
  }
  const leftGlow = sphere(0.068 * scale, materials.soulfire, 8);
  const rightGlow = leftGlow.clone();
  leftGlow.position.set(-0.25 * scale, 1.13 * scale, (titanScale ? 0.84 : 0.7) * scale);
  rightGlow.position.set(0.25 * scale, 1.13 * scale, (titanScale ? 0.84 : 0.7) * scale);
  leftGlow.scale.setScalar(titanScale ? 1.25 : 1);
  rightGlow.scale.copy(leftGlow.scale);
  const nose = sphere(0.14 * scale, materials.shadow, 7);
  nose.name = 'ISLAND_17_SKULL_VERTICAL_NOSE_HOLLOW';
  nose.position.set(0, 0.91 * scale, (titanScale ? 0.8 : 0.69) * scale);
  nose.scale.set(titanScale ? 0.74 : 0.58, titanScale ? 1.55 : 1.35, 0.2);
  const noseBridge = detailed
    ? tubeBetween(
      new THREE.Vector3(0, 1.26 * scale, (titanScale ? 0.79 : 0.69) * scale),
      new THREE.Vector3(0, 0.82 * scale, (titanScale ? 0.83 : 0.72) * scale),
      (titanScale ? 0.022 : 0.028) * scale,
      materials.agedBone,
      quality === 'low' ? 5 : 6,
    )
    : null;
  if (noseBridge) noseBridge.name = 'ISLAND_17_SKULL_NASAL_BRIDGE_BONE';
  const mouth = titanScale ? sphere(0.18 * scale, materials.shadow, quality === 'low' ? 7 : 9) : box(0.46 * scale, 0.2 * scale, 0.04 * scale, materials.shadow);
  mouth.position.set(0, 0.64 * scale, (titanScale ? 0.73 : 0.63) * scale);
  if (titanScale) mouth.scale.set(1.7, 0.62, 0.2);
  const mouthGlow = detailed ? sphere(0.09 * scale, materials.soulfire, 8) : null;
  if (mouthGlow) {
    mouthGlow.name = 'ISLAND_17_SKULL_MOUTH_CAVERN_SOULFIRE';
    mouthGlow.position.set(0, 0.56 * scale, (titanScale ? 0.8 : 0.69) * scale);
    mouthGlow.scale.set(titanScale ? 1.6 : 1.25, titanScale ? 0.7 : 0.58, 0.32);
  }
  const leftTempleCrack = detailed ? box(0.012 * scale, 0.42 * scale, 0.01 * scale, materials.shadow) : null;
  const rightTempleCrack = leftTempleCrack?.clone() ?? null;
  if (leftTempleCrack && rightTempleCrack) {
    leftTempleCrack.name = 'ISLAND_17_SKULL_LEFT_TEMPLE_CRACK';
    rightTempleCrack.name = 'ISLAND_17_SKULL_RIGHT_TEMPLE_CRACK';
    leftTempleCrack.position.set(-0.5 * scale, 1.08 * scale, 0.66 * scale);
    rightTempleCrack.position.set(0.5 * scale, 1.08 * scale, 0.66 * scale);
    leftTempleCrack.rotation.z = -0.28;
    rightTempleCrack.rotation.z = 0.28;
  }
  const leftCheek = sphere(0.2 * scale, materials.agedBone, 8);
  const rightCheek = leftCheek.clone();
  leftCheek.name = 'ISLAND_17_SKULL_LEFT_CHEEKBONE';
  rightCheek.name = 'ISLAND_17_SKULL_RIGHT_CHEEKBONE';
  leftCheek.position.set(-0.34 * scale, 0.83 * scale, (titanScale ? 0.68 : 0.58) * scale);
  rightCheek.position.set(0.34 * scale, 0.83 * scale, (titanScale ? 0.68 : 0.58) * scale);
  leftCheek.scale.set(titanScale ? 1.36 : 1.25, titanScale ? 0.64 : 0.55, 0.36);
  rightCheek.scale.copy(leftCheek.scale);
  const leftMandible = detailed
    ? tubeBetween(
      new THREE.Vector3(-0.34 * scale, 0.78 * scale, 0.55 * scale),
      new THREE.Vector3(-0.2 * scale, 0.42 * scale, 0.54 * scale),
      0.045 * scale,
      materials.agedBone,
      quality === 'low' ? 5 : 6,
    )
    : null;
  const rightMandible = detailed
    ? tubeBetween(
      new THREE.Vector3(0.34 * scale, 0.78 * scale, 0.55 * scale),
      new THREE.Vector3(0.2 * scale, 0.42 * scale, 0.54 * scale),
      0.045 * scale,
      materials.agedBone,
      quality === 'low' ? 5 : 6,
    )
    : null;
  skull.add(
    head,
    leftBrow,
    rightBrow,
    jaw,
    chin,
    leftEye,
    rightEye,
    leftGlow,
    rightGlow,
    nose,
    mouth,
    leftCheek,
    rightCheek,
  );
  if (browCrest && !titanScale) skull.add(browCrest);
  if (leftSocketRim && rightSocketRim) skull.add(leftSocketRim, rightSocketRim);
  if (noseBridge && !titanScale) skull.add(noseBridge);
  if (mouthGlow) skull.add(mouthGlow);
  if (leftTempleCrack && rightTempleCrack) skull.add(leftTempleCrack, rightTempleCrack);
  if (leftMandible && rightMandible) skull.add(leftMandible, rightMandible);
  addToothRow(skull, 0.67 * scale, 0.78 * scale, detailed ? 8 : 6, materials, quality, scale * 0.92);
  addToothRow(skull, 0.66 * scale, 0.51 * scale, detailed ? 7 : 5, materials, quality, scale * 0.78);
  if (detailed && !titanScale) addSkullSurfaceScars(skull, materials, quality, scale);
  if (titanScale) addTitanScaleSkullSculptDetails(skull, materials, quality, scale);
  return skull;
}

function addRearNecropolisCrown(root: THREE.Group, materials: Island17TitansRestMaterials, quality: Island3DQuality) {
  const count = amount(quality, 24, 18, 12);
  const towerGeometry = new THREE.CylinderGeometry(0.048, 0.074, 1, 5);
  const towers = new THREE.InstancedMesh(towerGeometry, materials.agedBone, count);
  towers.name = 'ISLAND_17_REAR_NECROPOLIS_BONE_TOWER_RING';
  const lanternCount = Math.ceil(count / 4);
  const lanterns = new THREE.InstancedMesh(new THREE.SphereGeometry(0.065, 6, 4), materials.soulfireGlass, lanternCount);
  lanterns.name = 'ISLAND_17_REAR_NECROPOLIS_SOUL_LANTERN_RING';
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  let lanternIndex = 0;
  for (let index = 0; index < count; index += 1) {
    const t = count === 1 ? 0.5 : index / (count - 1);
    const angle = THREE.MathUtils.lerp(-Math.PI * 0.86, -Math.PI * 0.14, t);
    const radius = 2.42 + (index % 4) * 0.08;
    const towerHeight = 0.58 + (index % 5) * 0.18;
    position.set(Math.cos(angle) * radius, 0.42 + (index % 4) * 0.05, Math.sin(angle) * radius);
    quaternion.setFromEuler(new THREE.Euler(0, 0, (index % 3 - 1) * 0.1));
    scale.set(
      0.72 + (index % 3) * 0.14,
      towerHeight,
      0.74 + (index % 2) * 0.16,
    );
    matrix.compose(position, quaternion, scale);
    towers.setMatrixAt(index, matrix);
    if (index % 4 === 0) {
      position.set(position.x, position.y + 0.42 + (index % 5) * 0.11, position.z);
      quaternion.identity();
      scale.setScalar(1);
      matrix.compose(position, quaternion, scale);
      lanterns.setMatrixAt(lanternIndex, matrix);
      lanternIndex += 1;
    }
  }
  towers.instanceMatrix.needsUpdate = true;
  lanterns.instanceMatrix.needsUpdate = true;
  towers.userData.keepSeparate = true;
  lanterns.userData.keepSeparate = true;
  root.add(towers, lanterns);
}

function createTitanSkull(level: BuildLevel, quality: Island3DQuality, materials: Island17TitansRestMaterials) {
  const root = new THREE.Group();
  if (level >= 3) return root;
  addPlatform(root, 1.35, materials, quality);
  if (level === 0) return root;
  const proceduralSculpture = new THREE.Group();
  proceduralSculpture.name = 'ISLAND_17_TITAN_SKULL_PROCEDURAL_FALLBACK';
  root.add(proceduralSculpture);
  const scale = level === 1 ? 0.38 : level === 2 ? 0.48 : 0.58;
  const skull = createSkullHead(materials, quality, scale);
  skull.name = 'ISLAND_17_TITAN_SKULL_CORE';
  skull.position.y = level === 1 ? 0.08 : 0.12;
  proceduralSculpture.add(skull);
  const crownSeal = torus(0.34 * scale, 0.018 * scale, materials.bronze, segments(quality) * 2);
  crownSeal.name = 'ISLAND_17_TITAN_SKULL_CROWN_SEAL';
  crownSeal.position.set(0, 1.78 * scale, 0.16 * scale);
  crownSeal.rotation.x = Math.PI * 0.18;
  proceduralSculpture.add(crownSeal);
  if (level >= 2) {
    for (let crackIndex = 0; crackIndex < amount(quality, 7, 5, 3); crackIndex += 1) {
      const x = (crackIndex - 3) * 0.11 * scale;
      const crack = box(0.025 * scale, (0.34 + (crackIndex % 2) * 0.18) * scale, 0.016 * scale, materials.shadow);
      crack.position.set(x, (1.65 - crackIndex * 0.035) * scale, (0.62 - Math.abs(x) * 0.12) * scale);
      crack.rotation.z = (crackIndex % 2 ? -1 : 1) * 0.28;
      proceduralSculpture.add(crack);
    }
    for (let index = 0; index < amount(quality, 6, 5, 3); index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const scar = curveTube([
        new THREE.Vector3(side * (0.12 + index * 0.035) * scale, (1.76 - index * 0.035) * scale, 0.69 * scale),
        new THREE.Vector3(side * (0.19 + index * 0.026) * scale, (1.62 - index * 0.025) * scale, 0.72 * scale),
      ], 0.01 * scale, materials.bronze, quality, 5);
      scar.name = `ISLAND_17_TITAN_SKULL_RAISED_FOREHEAD_SCAR_${index + 1}`;
      proceduralSculpture.add(scar);
    }
    addSoulfire(proceduralSculpture, new THREE.Vector3(0, 0.42 * scale, 0.62 * scale), 0.13 * scale, materials);
  }
  if (level >= 3) {
    const halo = torus(0.96 * scale, 0.026 * scale, materials.soulfireGlass, segments(quality) * 2);
    halo.name = 'ISLAND_17_TITAN_SKULL_SOULFIRE_HALO';
    halo.position.y = 0.92 * scale;
    proceduralSculpture.add(halo);
    for (let index = 0; index < 8; index += 1) {
      const angle = index / 8 * Math.PI * 2;
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.085 * scale), index % 2 ? materials.soulfireGlass : materials.bronze);
      shard.position.set(Math.cos(angle) * 0.92 * scale, 1.5 * scale + (index % 2) * 0.18, Math.sin(angle) * 0.62 * scale);
      proceduralSculpture.add(shard);
    }
    for (let index = 0; index < amount(quality, 9, 6, 4); index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const fracture = box(0.006 * scale, (0.13 + (index % 4) * 0.045) * scale, 0.01 * scale, index % 3 === 0 ? materials.moss : materials.iron);
      fracture.name = `ISLAND_17_TITAN_SKULL_DEEP_CRANIUM_FRACTURE_${index + 1}`;
      fracture.position.set(side * (0.08 + index * 0.035) * scale, (1.38 + (index % 5) * 0.1) * scale, (0.76 - (index % 4) * 0.025) * scale);
      fracture.rotation.set(0.05 * (index % 2), side * 0.08, side * (0.22 + index * 0.035));
      fracture.userData.keepSeparate = true;
      proceduralSculpture.add(fracture);
    }
    [-1, 1].forEach((side) => {
      const brokenCheekPlate = box(0.22 * scale, 0.09 * scale, 0.05 * scale, materials.crackedBone);
      brokenCheekPlate.name = `ISLAND_17_TITAN_SKULL_BROKEN_CHEEK_PLATE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      brokenCheekPlate.position.set(side * 0.48 * scale, 0.86 * scale, 0.66 * scale);
      brokenCheekPlate.rotation.set(0.1, side * 0.18, side * 0.28);
      proceduralSculpture.add(brokenCheekPlate);
    });
  }
  return root;
}

function createBoneHollow(level: BuildLevel, quality: Island3DQuality, materials: Island17TitansRestMaterials) {
  const root = new THREE.Group();
  addPlatform(root, 0.78, materials, quality);
  if (level === 0) return root;
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.66, 0.16, segments(quality), 1, true), materials.agedBone);
  bowl.name = 'ISLAND_17_BONE_HOLLOW_BROKEN_STONE_NEST';
  bowl.position.y = 0.46;
  const hollow = cylinder(0.42, 0.36, 0.035, materials.shadow, segments(quality));
  hollow.name = 'ISLAND_17_BONE_HOLLOW_DARK_INTERIOR';
  hollow.position.y = 0.56;
  const rim = torus(0.52, 0.035, materials.crackedBone, segments(quality) * 2);
  rim.name = 'ISLAND_17_BONE_HOLLOW_SPLIT_RIM';
  rim.position.y = 0.58;
  const egg = sphere(0.12, materials.soulfireGlass, segments(quality));
  egg.name = 'ISLAND_17_BONE_HOLLOW_ANCIENT_EGG';
  egg.scale.set(0.45, 0.82, 0.42);
  egg.position.set(0.38, 0.7, -0.28);
  root.add(bowl, hollow, rim, egg);
  for (let index = 0; index < amount(quality, 9, 7, 5); index += 1) {
    const angle = index / amount(quality, 9, 7, 5) * Math.PI * 2 + 0.16;
    const clearsCameraSide = Math.sin(angle) > 0.22;
    const rib = curveTube([
      new THREE.Vector3(Math.cos(angle) * 0.38, 0.54, Math.sin(angle) * 0.3),
      new THREE.Vector3(Math.cos(angle) * 0.55, clearsCameraSide ? 0.54 : 0.78, Math.sin(angle) * 0.42),
      new THREE.Vector3(Math.cos(angle) * 0.46, clearsCameraSide ? 0.58 : 1.02, Math.sin(angle) * 0.36),
    ], clearsCameraSide ? 0.012 : 0.031, materials.bone, quality, 12);
    rib.name = `ISLAND_17_BONE_HOLLOW_RIB_SHELL_${index + 1}`;
    root.add(rib);
  }
  if (level >= 2) {
    for (let index = 0; index < amount(quality, 7, 5, 4); index += 1) {
      addBoneArc(root, 0.42 + index * 0.04, materials, quality, index / 7 * Math.PI);
    }
    for (let index = 0; index < amount(quality, 8, 6, 4); index += 1) {
      const angle = index / amount(quality, 8, 6, 4) * Math.PI * 2;
      const shard = box(0.1 + (index % 3) * 0.035, 0.055, 0.16, index % 2 ? materials.crackedBone : materials.bronze);
      shard.name = `ISLAND_17_BONE_HOLLOW_RIM_SHARD_${index + 1}`;
      shard.position.set(Math.cos(angle) * 0.55, 0.63 + (index % 2) * 0.03, Math.sin(angle) * 0.45);
      shard.rotation.set((index % 2 - 0.5) * 0.24, -angle, (index % 3 - 1) * 0.22);
      root.add(shard);
    }
    const skullShell = createSkullHead(materials, quality, 0.46);
    skullShell.name = 'ISLAND_17_BONE_HOLLOW_SKULL_CAVE_FACADE';
    skullShell.position.set(0, 0.1, -0.5);
    skullShell.rotation.set(-0.08, Math.PI, -0.02);
    skullShell.scale.set(1.12, 1.08, 0.76);
    const caveGlow = box(0.25, 0.42, 0.04, materials.soulfireGlass);
    caveGlow.name = 'ISLAND_17_BONE_HOLLOW_TEAL_CAVE_DOOR_GLOW';
    caveGlow.position.set(0, 0.44, -0.72);
    caveGlow.rotation.x = -0.1;
    caveGlow.userData.keepSeparate = true;
    root.add(skullShell, caveGlow);
    [-1, 1].forEach((side) => {
      const eyeSocket = sphere(0.105, materials.shadow, 8);
      eyeSocket.name = `ISLAND_17_BONE_HOLLOW_VISIBLE_EYE_SOCKET_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      eyeSocket.position.set(side * 0.13, 0.58, -0.76);
      eyeSocket.scale.set(1.1, 0.82, 0.42);
      eyeSocket.userData.keepSeparate = true;
      const eyeGlow = sphere(0.06, materials.soulfire, 6);
      eyeGlow.name = `ISLAND_17_BONE_HOLLOW_VISIBLE_TEAL_EYE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      eyeGlow.position.set(side * 0.13, 0.58, -0.8);
      eyeGlow.userData.keepSeparate = true;
      root.add(eyeSocket, eyeGlow);
    });
    const mouthVoid = box(0.23, 0.32, 0.042, materials.shadow);
    mouthVoid.name = 'ISLAND_17_BONE_HOLLOW_VISIBLE_MOUTH_VOID';
    mouthVoid.position.set(0, 0.39, -0.8);
    mouthVoid.userData.keepSeparate = true;
    const mouthSoulfire = box(0.12, 0.27, 0.045, materials.soulfireGlass);
    mouthSoulfire.name = 'ISLAND_17_BONE_HOLLOW_VISIBLE_MOUTH_SOULFIRE';
    mouthSoulfire.position.set(0, 0.39, -0.83);
    mouthSoulfire.userData.keepSeparate = true;
    root.add(mouthVoid, mouthSoulfire);
    for (let index = 0; index < 5; index += 1) {
      const tooth = box(0.028, 0.16 - Math.abs(index - 2) * 0.018, 0.032, materials.agedBone);
      tooth.name = `ISLAND_17_BONE_HOLLOW_VISIBLE_TOOTH_${index + 1}`;
      tooth.position.set((index - 2) * 0.052, 0.34, 0.318);
      tooth.rotation.z = (index - 2) * 0.035;
      tooth.userData.keepSeparate = true;
      root.add(tooth);
    }
    [-1, 1].forEach((side) => {
      const mirroredEyeSocket = sphere(0.11, materials.shadow, 8);
      mirroredEyeSocket.name = `ISLAND_17_BONE_HOLLOW_CAMERA_SIDE_EYE_SOCKET_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      mirroredEyeSocket.position.set(side * 0.18, 0.72, -0.56);
      mirroredEyeSocket.scale.set(1.08, 0.82, 0.38);
      mirroredEyeSocket.userData.keepSeparate = true;
      const mirroredEyeGlow = sphere(0.048, materials.soulfire, 6);
      mirroredEyeGlow.name = `ISLAND_17_BONE_HOLLOW_CAMERA_SIDE_TEAL_EYE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      mirroredEyeGlow.position.set(side * 0.18, 0.72, -0.6);
      mirroredEyeGlow.userData.keepSeparate = true;
      root.add(mirroredEyeSocket, mirroredEyeGlow);
    });
    const mirroredMouth = box(0.19, 0.3, 0.04, materials.shadow);
    mirroredMouth.name = 'ISLAND_17_BONE_HOLLOW_CAMERA_SIDE_MOUTH_VOID';
    mirroredMouth.position.set(0, 0.46, -0.61);
    mirroredMouth.userData.keepSeparate = true;
    const mirroredMouthGlow = box(0.09, 0.26, 0.043, materials.soulfireGlass);
    mirroredMouthGlow.name = 'ISLAND_17_BONE_HOLLOW_CAMERA_SIDE_MOUTH_SOULFIRE';
    mirroredMouthGlow.position.set(0, 0.47, -0.646);
    mirroredMouthGlow.userData.keepSeparate = true;
    root.add(mirroredMouth, mirroredMouthGlow);
    [-1, 1].forEach((side) => {
      const shellPlate = box(0.2, 0.42, 0.045, materials.crackedBone);
      shellPlate.name = `ISLAND_17_BONE_HOLLOW_CRACKED_SHELL_PLATE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      shellPlate.position.set(side * 0.37, 0.82, -0.2);
      shellPlate.rotation.set(0.18, side * 0.36, side * 0.4);
      shellPlate.visible = false;
      root.add(shellPlate);
    });
    [-1, 1].forEach((side) => {
      for (let index = 0; index < 3; index += 1) {
        const angle = side * (0.62 + index * 0.25);
        const frontClearance = Math.cos(angle) > 0.58;
        if (frontClearance || level >= 3) return;
        const tuskRib = curveTube([
          new THREE.Vector3(Math.sin(angle) * 0.36, 0.58, Math.cos(angle) * 0.34),
          new THREE.Vector3(Math.sin(angle) * 0.62, (frontClearance ? 0.58 : 1.0) + index * 0.04, Math.cos(angle) * 0.52),
          new THREE.Vector3(Math.sin(angle) * 0.5, (frontClearance ? 0.66 : 1.42) + index * 0.05, Math.cos(angle) * 0.42),
        ], frontClearance ? 0.016 : 0.045 - index * 0.004, index % 2 ? materials.agedBone : materials.bone, quality, 16);
        tuskRib.name = `ISLAND_17_BONE_HOLLOW_TALL_PROTECTIVE_TUSK_RIB_${side < 0 ? 'LEFT' : 'RIGHT'}_${index + 1}`;
        root.add(tuskRib);
      }
    });
    for (let index = 0; index < 5; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const eggCrack = box(0.008, 0.13 - index * 0.01, 0.01, index % 3 === 0 ? materials.soulfire : materials.iron);
      eggCrack.name = `ISLAND_17_BONE_HOLLOW_ANCIENT_EGG_CRACK_${index + 1}`;
      eggCrack.position.set(0.08 + side * (0.025 + index * 0.01), 0.86 + index * 0.045, 0.19);
      eggCrack.rotation.z = side * (0.28 + index * 0.08);
      eggCrack.userData.keepSeparate = true;
      root.add(eggCrack);
    }
    const sideDoorPlate = sphere(0.43, materials.crackedBone, 12);
    sideDoorPlate.name = 'ISLAND_17_BONE_HOLLOW_CAMERA_FACING_SKULL_DOOR_PLATE';
    sideDoorPlate.position.set(-0.76, 0.68, -0.36);
    sideDoorPlate.scale.set(0.14, 1.08, 0.78);
    sideDoorPlate.rotation.y = Math.PI / 2;
    const sideDoorBrow = box(0.04, 0.07, 0.42, materials.agedBone);
    sideDoorBrow.name = 'ISLAND_17_BONE_HOLLOW_CAMERA_FACING_HEAVY_BROW_BAR';
    sideDoorBrow.position.set(-0.84, 0.87, -0.36);
    sideDoorBrow.rotation.set(0.06, 0, -0.08);
    const sideDoorJaw = box(0.042, 0.08, 0.34, materials.agedBone);
    sideDoorJaw.name = 'ISLAND_17_BONE_HOLLOW_CAMERA_FACING_BROKEN_JAW_BAR';
    sideDoorJaw.position.set(-0.845, 0.43, -0.36);
    sideDoorJaw.rotation.set(-0.05, 0, 0.08);
    const sideDoorMouth = sphere(0.12, materials.shadow, 10);
    sideDoorMouth.name = 'ISLAND_17_BONE_HOLLOW_CAMERA_FACING_MOUTH_VOID';
    sideDoorMouth.position.set(-0.89, 0.57, -0.36);
    sideDoorMouth.scale.set(0.12, 1.42, 0.9);
    const sideDoorGlow = sphere(0.07, materials.soulfireGlass, 8);
    sideDoorGlow.name = 'ISLAND_17_BONE_HOLLOW_CAMERA_FACING_MOUTH_GLOW';
    sideDoorGlow.position.set(-0.925, 0.57, -0.36);
    sideDoorGlow.scale.set(0.14, 1.05, 0.64);
    sideDoorPlate.visible = false;
    sideDoorBrow.visible = false;
    sideDoorJaw.visible = false;
    sideDoorMouth.visible = false;
    sideDoorGlow.visible = false;
    root.add(sideDoorPlate, sideDoorBrow, sideDoorJaw, sideDoorMouth, sideDoorGlow);
    const nestSkullMask = sphere(0.34, materials.crackedBone, 12);
    nestSkullMask.name = 'ISLAND_17_BONE_HOLLOW_CENTER_READABLE_SKULL_MASK';
    nestSkullMask.position.set(0.04, 0.72, 0.16);
    nestSkullMask.scale.set(1.32, 0.64, 0.18);
    nestSkullMask.rotation.x = -0.62;
    const nestBrow = box(0.62, 0.06, 0.05, materials.agedBone);
    nestBrow.name = 'ISLAND_17_BONE_HOLLOW_CENTER_HEAVY_BROW_RIDGE';
    nestBrow.position.set(0.03, 0.84, 0.29);
    nestBrow.rotation.x = -0.66;
    const nestJaw = box(0.5, 0.055, 0.048, materials.agedBone);
    nestJaw.name = 'ISLAND_17_BONE_HOLLOW_CENTER_BROKEN_JAW_RIDGE';
    nestJaw.position.set(0.03, 0.55, 0.34);
    nestJaw.rotation.x = -0.66;
    root.add(nestSkullMask, nestBrow, nestJaw);
    [-1, 1].forEach((side) => {
      const socket = sphere(0.13, materials.shadow, 10);
      socket.name = `ISLAND_17_BONE_HOLLOW_CENTER_SKULL_SOCKET_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      socket.position.set(side * 0.19 + 0.03, 0.72, 0.36);
      socket.scale.set(1.25, 0.62, 0.2);
      socket.rotation.x = -0.66;
      socket.userData.keepSeparate = true;
      const glow = sphere(0.064, materials.soulfire, 8);
      glow.name = `ISLAND_17_BONE_HOLLOW_CENTER_SOCKET_GLOW_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      glow.position.set(side * 0.19 + 0.03, 0.72, 0.405);
      glow.scale.set(1.18, 0.7, 0.38);
      glow.userData.keepSeparate = true;
      root.add(socket, glow);
    });
    const nestNose = box(0.1, 0.18, 0.05, materials.shadow);
    nestNose.name = 'ISLAND_17_BONE_HOLLOW_CENTER_TRIANGLE_NOSE_VOID';
    nestNose.position.set(0.03, 0.62, 0.41);
    nestNose.rotation.set(-0.66, 0, Math.PI / 4);
    nestNose.userData.keepSeparate = true;
    const nestMouth = box(0.38, 0.085, 0.052, materials.shadow);
    nestMouth.name = 'ISLAND_17_BONE_HOLLOW_CENTER_TOOTHED_MOUTH_VOID';
    nestMouth.position.set(0.03, 0.5, 0.38);
    nestMouth.rotation.x = -0.66;
    nestMouth.userData.keepSeparate = true;
    root.add(nestNose, nestMouth);
    for (let index = 0; index < 6; index += 1) {
      const tooth = box(0.028, 0.1 - Math.abs(index - 2.5) * 0.008, 0.026, materials.bone);
      tooth.name = `ISLAND_17_BONE_HOLLOW_CENTER_READABLE_TOOTH_${index + 1}`;
      tooth.position.set((index - 2.5) * 0.055 + 0.03, 0.48, 0.42);
      tooth.rotation.set(-0.7, 0, (index - 2.5) * 0.025);
      tooth.userData.keepSeparate = true;
      root.add(tooth);
    }
    [-1, 1].forEach((side) => {
      const floorSocket = cylinder(0.13, 0.145, 0.014, materials.soulfireGlass, 12);
      floorSocket.name = `ISLAND_17_BONE_HOLLOW_VISIBLE_FLOOR_SKULL_EYE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      floorSocket.position.set(side * 0.23, 0.66, 0.12);
      floorSocket.scale.set(1.18, 1, 0.72);
      floorSocket.userData.keepSeparate = true;
      const floorSocketRim = torus(0.145, 0.012, materials.agedBone, 18);
      floorSocketRim.name = `ISLAND_17_BONE_HOLLOW_VISIBLE_FLOOR_EYE_BONE_RIM_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      floorSocketRim.position.set(side * 0.23, 0.675, 0.12);
      floorSocketRim.rotation.x = Math.PI / 2;
      floorSocketRim.scale.set(1.18, 0.72, 1);
      root.add(floorSocket, floorSocketRim);
    });
    const floorNose = box(0.09, 0.018, 0.16, materials.agedBone);
    floorNose.name = 'ISLAND_17_BONE_HOLLOW_VISIBLE_FLOOR_TRIANGLE_NOSE_BONE';
    floorNose.position.set(0.02, 0.676, 0.25);
    floorNose.rotation.y = Math.PI / 4;
    const floorMouth = box(0.42, 0.018, 0.09, materials.soulfireGlass);
    floorMouth.name = 'ISLAND_17_BONE_HOLLOW_VISIBLE_FLOOR_TOOTHED_MOUTH_GLOW';
    floorMouth.position.set(0.02, 0.68, 0.38);
    floorMouth.userData.keepSeparate = true;
    root.add(floorNose, floorMouth);
    const raisedCrest = sphere(0.29, materials.crackedBone, 12);
    raisedCrest.name = 'ISLAND_17_BONE_HOLLOW_RAISED_HATCHERY_SKULL_CREST';
    raisedCrest.position.set(0.02, 1.16, 0.24);
    raisedCrest.scale.set(1.28, 0.8, 0.18);
    raisedCrest.rotation.x = -0.55;
    const crestBrow = box(0.54, 0.055, 0.05, materials.agedBone);
    crestBrow.name = 'ISLAND_17_BONE_HOLLOW_RAISED_CREST_BROW';
    crestBrow.position.set(0.02, 1.22, 0.38);
    crestBrow.rotation.x = -0.55;
    const crestNose = box(0.09, 0.16, 0.045, materials.shadow);
    crestNose.name = 'ISLAND_17_BONE_HOLLOW_RAISED_CREST_NOSE_VOID';
    crestNose.position.set(0.02, 1.08, 0.43);
    crestNose.rotation.set(-0.55, 0, Math.PI / 4);
    crestNose.userData.keepSeparate = true;
    const crestMouth = box(0.34, 0.08, 0.045, materials.shadow);
    crestMouth.name = 'ISLAND_17_BONE_HOLLOW_RAISED_CREST_MOUTH_VOID';
    crestMouth.position.set(0.02, 1.0, 0.42);
    crestMouth.rotation.x = -0.55;
    crestMouth.userData.keepSeparate = true;
    root.add(raisedCrest, crestBrow, crestNose, crestMouth);
    [-1, 1].forEach((side) => {
      const crestSocket = sphere(0.108, materials.shadow, 10);
      crestSocket.name = `ISLAND_17_BONE_HOLLOW_RAISED_CREST_SOCKET_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      crestSocket.position.set(side * 0.18 + 0.02, 1.13, 0.44);
      crestSocket.scale.set(1.18, 0.72, 0.26);
      crestSocket.rotation.x = -0.55;
      crestSocket.userData.keepSeparate = true;
      const crestGlow = sphere(0.052, materials.soulfire, 8);
      crestGlow.name = `ISLAND_17_BONE_HOLLOW_RAISED_CREST_EYE_GLOW_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      crestGlow.position.set(side * 0.18 + 0.02, 1.13, 0.48);
      crestGlow.scale.set(1.05, 0.8, 0.5);
      crestGlow.userData.keepSeparate = true;
      root.add(crestSocket, crestGlow);
    });
    const frontGatePlate = sphere(0.3, materials.crackedBone, 12);
    frontGatePlate.name = 'ISLAND_17_BONE_HOLLOW_FRONT_RIM_SKULL_GATE_PLATE';
    frontGatePlate.position.set(0, 0.62, 0.62);
    frontGatePlate.scale.set(1.22, 0.82, 0.16);
    frontGatePlate.rotation.x = -0.18;
    const frontGateBrow = box(0.56, 0.06, 0.05, materials.agedBone);
    frontGateBrow.name = 'ISLAND_17_BONE_HOLLOW_FRONT_RIM_BROW_BAR';
    frontGateBrow.position.set(0, 0.72, 0.73);
    frontGateBrow.rotation.x = -0.2;
    const frontGateMouth = box(0.34, 0.12, 0.05, materials.shadow);
    frontGateMouth.name = 'ISLAND_17_BONE_HOLLOW_FRONT_RIM_MOUTH_VOID';
    frontGateMouth.position.set(0, 0.52, 0.75);
    frontGateMouth.rotation.x = -0.2;
    frontGateMouth.userData.keepSeparate = true;
    const frontGateGlow = box(0.22, 0.075, 0.052, materials.soulfireGlass);
    frontGateGlow.name = 'ISLAND_17_BONE_HOLLOW_FRONT_RIM_MOUTH_GLOW';
    frontGateGlow.position.set(0, 0.52, 0.79);
    frontGateGlow.rotation.x = -0.2;
    frontGateGlow.userData.keepSeparate = true;
    root.add(frontGatePlate, frontGateBrow, frontGateMouth, frontGateGlow);
    [-1, 1].forEach((side) => {
      const gateSocket = sphere(0.102, materials.shadow, 10);
      gateSocket.name = `ISLAND_17_BONE_HOLLOW_FRONT_RIM_SOCKET_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      gateSocket.position.set(side * 0.18, 0.62, 0.78);
      gateSocket.scale.set(1.18, 0.72, 0.28);
      gateSocket.rotation.x = -0.2;
      gateSocket.userData.keepSeparate = true;
      const gateGlow = sphere(0.048, materials.soulfire, 8);
      gateGlow.name = `ISLAND_17_BONE_HOLLOW_FRONT_RIM_SOCKET_GLOW_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      gateGlow.position.set(side * 0.18, 0.62, 0.82);
      gateGlow.scale.set(1.1, 0.8, 0.52);
      gateGlow.userData.keepSeparate = true;
      root.add(gateSocket, gateGlow);
    });
    const exposedOvalBrow = box(0.045, 0.07, 0.5, materials.agedBone);
    exposedOvalBrow.name = 'ISLAND_17_BONE_HOLLOW_EXPOSED_OVAL_BROW_BAR';
    exposedOvalBrow.position.set(-0.99, 0.88, -0.36);
    exposedOvalBrow.rotation.set(0.02, Math.PI / 2, -0.05);
    const exposedOvalMouth = box(0.04, 0.16, 0.34, materials.shadow);
    exposedOvalMouth.name = 'ISLAND_17_BONE_HOLLOW_EXPOSED_OVAL_MOUTH_VOID';
    exposedOvalMouth.position.set(-1.02, 0.6, -0.36);
    exposedOvalMouth.rotation.y = Math.PI / 2;
    exposedOvalMouth.userData.keepSeparate = true;
    const exposedOvalGlow = box(0.043, 0.1, 0.24, materials.soulfireGlass);
    exposedOvalGlow.name = 'ISLAND_17_BONE_HOLLOW_EXPOSED_OVAL_MOUTH_GLOW';
    exposedOvalGlow.position.set(-1.045, 0.6, -0.36);
    exposedOvalGlow.rotation.y = Math.PI / 2;
    exposedOvalGlow.userData.keepSeparate = true;
    exposedOvalBrow.visible = false;
    exposedOvalMouth.visible = false;
    exposedOvalGlow.visible = false;
    root.add(exposedOvalBrow, exposedOvalMouth, exposedOvalGlow);
    [-1, 1].forEach((side) => {
      const exposedSocket = sphere(0.105, materials.shadow, 10);
      exposedSocket.name = `ISLAND_17_BONE_HOLLOW_EXPOSED_OVAL_SOCKET_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      exposedSocket.position.set(-1.035, 0.75, -0.36 + side * 0.16);
      exposedSocket.scale.set(0.16, 0.75, 1.05);
      exposedSocket.userData.keepSeparate = true;
      const exposedGlow = sphere(0.055, materials.soulfire, 8);
      exposedGlow.name = `ISLAND_17_BONE_HOLLOW_EXPOSED_OVAL_EYE_GLOW_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      exposedGlow.position.set(-1.065, 0.75, -0.36 + side * 0.16);
      exposedGlow.scale.set(0.42, 0.85, 1);
      exposedGlow.userData.keepSeparate = true;
      exposedSocket.visible = false;
      exposedGlow.visible = false;
      root.add(exposedSocket, exposedGlow);
    });
    const visibleHatcherySkull = createSkullHead(materials, quality, 0.36);
    visibleHatcherySkull.name = 'ISLAND_17_BONE_HOLLOW_VISIBLE_HATCHERY_SKULL_TOWER';
    visibleHatcherySkull.position.set(-0.42, 0.74, 0.42);
    visibleHatcherySkull.rotation.set(-0.1, Math.PI + 0.28, -0.06);
    visibleHatcherySkull.scale.set(0.98, 1.08, 0.86);
    const visibleHatcheryThroat = box(0.16, 0.32, 0.042, materials.soulfireGlass);
    visibleHatcheryThroat.name = 'ISLAND_17_BONE_HOLLOW_VISIBLE_HATCHERY_SKULL_THROAT_GLOW';
    visibleHatcheryThroat.position.set(-0.42, 1.14, 0.72);
    visibleHatcheryThroat.rotation.y = 0.28;
    visibleHatcheryThroat.userData.keepSeparate = true;
    root.add(visibleHatcherySkull, visibleHatcheryThroat);
    [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((yaw, faceIndex) => {
      const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      const brow = box(0.25, 0.04, 0.03, materials.agedBone);
      brow.name = `ISLAND_17_BONE_HOLLOW_TOWER_ALL_SIDE_BROW_${faceIndex + 1}`;
      brow.position.set(-0.42, 1.28, 0.42).add(forward.clone().multiplyScalar(0.27));
      brow.rotation.y = yaw;
      root.add(brow);
      [-1, 1].forEach((side) => {
        const socket = sphere(0.086, materials.shadow, 8);
        socket.name = `ISLAND_17_BONE_HOLLOW_TOWER_ALL_SIDE_SOCKET_${faceIndex + 1}_${side < 0 ? 'LEFT' : 'RIGHT'}`;
        socket.position
          .set(-0.42, 1.19, 0.42)
          .add(forward.clone().multiplyScalar(0.28))
          .add(right.clone().multiplyScalar(side * 0.105));
        socket.scale.set(1.12, 0.72, 0.24);
        socket.rotation.y = yaw;
        socket.userData.keepSeparate = true;
        const glow = sphere(0.052, materials.soulfire, 6);
        glow.name = `ISLAND_17_BONE_HOLLOW_TOWER_ALL_SIDE_EYE_GLOW_${faceIndex + 1}_${side < 0 ? 'LEFT' : 'RIGHT'}`;
        glow.position.copy(socket.position).add(forward.clone().multiplyScalar(0.036));
        glow.userData.keepSeparate = true;
        root.add(socket, glow);
      });
      const nose = box(0.072, 0.13, 0.03, materials.shadow);
      nose.name = `ISLAND_17_BONE_HOLLOW_TOWER_ALL_SIDE_NOSE_${faceIndex + 1}`;
      nose.position.set(-0.42, 1.08, 0.42).add(forward.clone().multiplyScalar(0.29));
      nose.rotation.set(0, yaw, Math.PI / 4);
      nose.userData.keepSeparate = true;
      const mouth = box(0.28, 0.075, 0.032, materials.shadow);
      mouth.name = `ISLAND_17_BONE_HOLLOW_TOWER_ALL_SIDE_MOUTH_${faceIndex + 1}`;
      mouth.position.set(-0.42, 0.98, 0.42).add(forward.clone().multiplyScalar(0.29));
      mouth.rotation.y = yaw;
      mouth.userData.keepSeparate = true;
      root.add(nose, mouth);
    });
    [-1, 1].forEach((side) => {
      const socket = sphere(0.086, materials.shadow, 10);
      socket.name = `ISLAND_17_BONE_HOLLOW_CAMERA_FACING_SOCKET_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      socket.position.set(-0.895, 0.72, -0.36 + side * 0.145);
      socket.scale.set(0.12, 0.76, 1.05);
      const glow = sphere(0.046, materials.soulfire, 6);
      glow.name = `ISLAND_17_BONE_HOLLOW_CAMERA_FACING_SOCKET_GLOW_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      glow.position.set(-0.93, 0.72, -0.36 + side * 0.145);
      glow.scale.set(0.7, 0.85, 0.85);
      root.add(socket, glow);
    });
    for (let index = 0; index < 5; index += 1) {
      const tooth = box(0.032, 0.13 - Math.abs(index - 2) * 0.016, 0.026, materials.bone);
      tooth.name = `ISLAND_17_BONE_HOLLOW_CAMERA_FACING_TOOTH_${index + 1}`;
      tooth.position.set(-0.932, 0.47, -0.36 + (index - 2) * 0.052);
      tooth.rotation.set(0.04 * (index - 2), 0, 0.02 * (index - 2));
      tooth.userData.keepSeparate = true;
      root.add(tooth);
    }
    [-1, 1].forEach((side) => {
      const cheekChip = box(0.035, 0.13, 0.12, side < 0 ? materials.limestone : materials.crackedBone);
      cheekChip.name = `ISLAND_17_BONE_HOLLOW_CAMERA_FACING_CHEEK_CHIP_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      cheekChip.position.set(-0.89, 0.6, -0.36 + side * 0.26);
      cheekChip.rotation.set(side * 0.16, 0, side * 0.34);
      root.add(cheekChip);
    });
    const phoneFacade = new THREE.Group();
    phoneFacade.name = 'ISLAND_17_BONE_HOLLOW_PHONE_SCALE_SKULL_HATCHERY_GATE';
    phoneFacade.position.set(0.06, 0.02, 0);
    const facadePlate = sphere(0.42, materials.crackedBone, 14);
    facadePlate.name = 'ISLAND_17_BONE_HOLLOW_PHONE_FACADE_CRACKED_SKULL_PLATE';
    facadePlate.position.set(0, 0.88, 0.88);
    facadePlate.scale.set(1.24, 1.08, 0.16);
    facadePlate.rotation.x = -0.18;
    const facadeBrow = box(0.76, 0.08, 0.06, materials.agedBone);
    facadeBrow.name = 'ISLAND_17_BONE_HOLLOW_PHONE_FACADE_HEAVY_BROW';
    facadeBrow.position.set(0, 1.02, 1);
    facadeBrow.rotation.x = -0.18;
    const facadeCheek = box(0.6, 0.07, 0.052, materials.agedBone);
    facadeCheek.name = 'ISLAND_17_BONE_HOLLOW_PHONE_FACADE_CHEEKBONE_BAR';
    facadeCheek.position.set(0, 0.75, 1.03);
    facadeCheek.rotation.x = -0.18;
    const facadeJaw = box(0.54, 0.07, 0.052, materials.agedBone);
    facadeJaw.name = 'ISLAND_17_BONE_HOLLOW_PHONE_FACADE_BROKEN_JAW';
    facadeJaw.position.set(0, 0.54, 1.02);
    facadeJaw.rotation.x = -0.18;
    phoneFacade.add(facadePlate, facadeBrow, facadeCheek, facadeJaw);
    [-1, 1].forEach((side) => {
      const socket = sphere(0.15, materials.shadow, 10);
      socket.name = `ISLAND_17_BONE_HOLLOW_PHONE_FACADE_SOCKET_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      socket.position.set(side * 0.22, 0.86, 1.06);
      socket.scale.set(1.22, 0.76, 0.22);
      socket.rotation.x = -0.18;
      socket.userData.keepSeparate = true;
      const eye = sphere(0.066, materials.soulfire, 8);
      eye.name = `ISLAND_17_BONE_HOLLOW_PHONE_FACADE_TEAL_EYE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      eye.position.set(side * 0.22, 0.86, 1.11);
      eye.scale.set(1.1, 0.82, 0.5);
      eye.userData.keepSeparate = true;
      const cheekChip = box(0.16, 0.09, 0.04, side < 0 ? materials.limestone : materials.agedBone);
      cheekChip.name = `ISLAND_17_BONE_HOLLOW_PHONE_FACADE_CHIPPED_CHEEK_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      cheekChip.position.set(side * 0.33, 0.66, 1.06);
      cheekChip.rotation.set(-0.15, side * 0.18, side * 0.34);
      phoneFacade.add(socket, eye, cheekChip);
    });
    const facadeNose = box(0.13, 0.22, 0.052, materials.shadow);
    facadeNose.name = 'ISLAND_17_BONE_HOLLOW_PHONE_FACADE_TRIANGLE_NOSE_VOID';
    facadeNose.position.set(0, 0.72, 1.11);
    facadeNose.rotation.set(-0.18, 0, Math.PI / 4);
    facadeNose.userData.keepSeparate = true;
    const facadeMouth = box(0.42, 0.16, 0.055, materials.shadow);
    facadeMouth.name = 'ISLAND_17_BONE_HOLLOW_PHONE_FACADE_BLACK_MOUTH';
    facadeMouth.position.set(0, 0.58, 1.09);
    facadeMouth.rotation.x = -0.18;
    facadeMouth.userData.keepSeparate = true;
    const facadeThroatGlow = box(0.22, 0.11, 0.058, materials.soulfireGlass);
    facadeThroatGlow.name = 'ISLAND_17_BONE_HOLLOW_PHONE_FACADE_TEAL_THROAT_GLOW';
    facadeThroatGlow.position.set(0, 0.58, 1.14);
    facadeThroatGlow.rotation.x = -0.18;
    facadeThroatGlow.userData.keepSeparate = true;
    phoneFacade.add(facadeNose, facadeMouth, facadeThroatGlow);
    for (let index = 0; index < 7; index += 1) {
      const centered = index - 3;
      const tooth = box(0.034, 0.16 - Math.abs(centered) * 0.013, 0.035, materials.bone);
      tooth.name = `ISLAND_17_BONE_HOLLOW_PHONE_FACADE_TOOTH_${index + 1}`;
      tooth.position.set(centered * 0.052, 0.48, 1.13);
      tooth.rotation.set(-0.2, 0, centered * 0.025);
      tooth.userData.keepSeparate = true;
      phoneFacade.add(tooth);
    }
    for (let index = 0; index < amount(quality, 8, 6, 4); index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const crack = box(0.012, 0.16 + (index % 3) * 0.06, 0.018, index % 3 === 0 ? materials.shadow : materials.bronze);
      crack.name = `ISLAND_17_BONE_HOLLOW_PHONE_FACADE_VISIBLE_CRACK_${index + 1}`;
      crack.position.set(side * (0.08 + (index % 4) * 0.09), 1.08 - (index % 5) * 0.1, 1.12);
      crack.rotation.set(-0.16, 0, side * (0.22 + index * 0.04));
      crack.userData.keepSeparate = true;
      phoneFacade.add(crack);
    }
    root.add(phoneFacade);
    phoneFacade.visible = false;
    const sideReadGate = new THREE.Group();
    sideReadGate.name = 'ISLAND_17_BONE_HOLLOW_VISIBLE_SIDE_SKULL_GATE';
    const sideGatePlate = sphere(0.48, materials.crackedBone, 14);
    sideGatePlate.name = 'ISLAND_17_BONE_HOLLOW_VISIBLE_SIDE_CRACKED_SKULL_PLATE';
    sideGatePlate.position.set(-1.08, 0.88, 0.06);
    sideGatePlate.scale.set(0.18, 1.06, 1.18);
    sideGatePlate.rotation.y = Math.PI / 2;
    const sideGateBrow = box(0.05, 0.08, 0.82, materials.agedBone);
    sideGateBrow.name = 'ISLAND_17_BONE_HOLLOW_VISIBLE_SIDE_HEAVY_BROW';
    sideGateBrow.position.set(-1.18, 1.02, 0.06);
    const sideGateCheek = box(0.045, 0.07, 0.66, materials.agedBone);
    sideGateCheek.name = 'ISLAND_17_BONE_HOLLOW_VISIBLE_SIDE_CHEEKBONE_BAR';
    sideGateCheek.position.set(-1.2, 0.74, 0.06);
    const sideGateJaw = box(0.045, 0.08, 0.58, materials.agedBone);
    sideGateJaw.name = 'ISLAND_17_BONE_HOLLOW_VISIBLE_SIDE_BROKEN_JAW_BAR';
    sideGateJaw.position.set(-1.2, 0.5, 0.06);
    sideReadGate.add(sideGatePlate, sideGateBrow, sideGateCheek, sideGateJaw);
    [-1, 1].forEach((side) => {
      const socket = sphere(0.16, materials.shadow, 10);
      socket.name = `ISLAND_17_BONE_HOLLOW_VISIBLE_SIDE_SOCKET_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      socket.position.set(-1.23, 0.86, 0.06 + side * 0.24);
      socket.scale.set(0.18, 0.76, 1.14);
      socket.userData.keepSeparate = true;
      const eye = sphere(0.068, materials.soulfire, 8);
      eye.name = `ISLAND_17_BONE_HOLLOW_VISIBLE_SIDE_TEAL_EYE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      eye.position.set(-1.28, 0.86, 0.06 + side * 0.24);
      eye.scale.set(0.42, 0.82, 1.04);
      eye.userData.keepSeparate = true;
      sideReadGate.add(socket, eye);
    });
    const sideGateNose = box(0.052, 0.24, 0.13, materials.shadow);
    sideGateNose.name = 'ISLAND_17_BONE_HOLLOW_VISIBLE_SIDE_TRIANGLE_NOSE_VOID';
    sideGateNose.position.set(-1.28, 0.7, 0.06);
    sideGateNose.rotation.x = Math.PI / 4;
    sideGateNose.userData.keepSeparate = true;
    const sideGateMouth = box(0.055, 0.17, 0.46, materials.shadow);
    sideGateMouth.name = 'ISLAND_17_BONE_HOLLOW_VISIBLE_SIDE_BLACK_MOUTH';
    sideGateMouth.position.set(-1.28, 0.57, 0.06);
    sideGateMouth.userData.keepSeparate = true;
    const sideGateGlow = box(0.058, 0.1, 0.28, materials.soulfireGlass);
    sideGateGlow.name = 'ISLAND_17_BONE_HOLLOW_VISIBLE_SIDE_TEAL_THROAT_GLOW';
    sideGateGlow.position.set(-1.32, 0.57, 0.06);
    sideGateGlow.userData.keepSeparate = true;
    sideReadGate.add(sideGateNose, sideGateMouth, sideGateGlow);
    for (let index = 0; index < 7; index += 1) {
      const centered = index - 3;
      const tooth = box(0.034, 0.15 - Math.abs(centered) * 0.012, 0.032, materials.bone);
      tooth.name = `ISLAND_17_BONE_HOLLOW_VISIBLE_SIDE_TOOTH_${index + 1}`;
      tooth.position.set(-1.33, 0.47, 0.06 + centered * 0.052);
      tooth.rotation.z = centered * 0.03;
      tooth.userData.keepSeparate = true;
      sideReadGate.add(tooth);
    }
    sideReadGate.visible = false;
    root.add(sideReadGate);
    const topReadMask = new THREE.Group();
    topReadMask.name = 'ISLAND_17_BONE_HOLLOW_TOP_DOWN_SKULL_SIGIL';
    topReadMask.position.y = 0.12;
    const topMaskPlate = cylinder(0.34, 0.38, 0.018, materials.crackedBone, segments(quality) * 2);
    topMaskPlate.name = 'ISLAND_17_BONE_HOLLOW_TOP_DOWN_CRACKED_SKULL_DISC';
    topMaskPlate.position.set(0.02, 0.715, 0.16);
    topMaskPlate.scale.set(1.05, 1, 0.72);
    topReadMask.add(topMaskPlate);
    [-1, 1].forEach((side) => {
      const socket = cylinder(0.115, 0.13, 0.022, materials.shadow, 14);
      socket.name = `ISLAND_17_BONE_HOLLOW_TOP_DOWN_DARK_EYE_SOCKET_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      socket.position.set(side * 0.14, 0.735, 0.1);
      socket.scale.set(1.2, 1, 0.74);
      socket.userData.keepSeparate = true;
      const glow = cylinder(0.054, 0.062, 0.026, materials.soulfire, 10);
      glow.name = `ISLAND_17_BONE_HOLLOW_TOP_DOWN_EYE_GLOW_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      glow.position.set(side * 0.14, 0.752, 0.1);
      glow.scale.set(1.1, 1, 0.72);
      glow.userData.keepSeparate = true;
      topReadMask.add(socket, glow);
    });
    const topNose = box(0.12, 0.024, 0.16, materials.shadow);
    topNose.name = 'ISLAND_17_BONE_HOLLOW_TOP_DOWN_TRIANGLE_NOSE_VOID';
    topNose.position.set(0.02, 0.755, 0.26);
    topNose.rotation.y = Math.PI / 4;
    topNose.userData.keepSeparate = true;
    const topMouth = box(0.42, 0.024, 0.09, materials.shadow);
    topMouth.name = 'ISLAND_17_BONE_HOLLOW_TOP_DOWN_BLACK_TOOTHED_MOUTH';
    topMouth.position.set(0.02, 0.758, 0.34);
    topMouth.userData.keepSeparate = true;
    const topMouthGlow = box(0.24, 0.026, 0.052, materials.soulfireGlass);
    topMouthGlow.name = 'ISLAND_17_BONE_HOLLOW_TOP_DOWN_MOUTH_GLOW';
    topMouthGlow.position.set(0.02, 0.778, 0.34);
    topMouthGlow.userData.keepSeparate = true;
    topReadMask.add(topNose, topMouth, topMouthGlow);
    for (let index = 0; index < 8; index += 1) {
      const centered = index - 3.5;
      const tooth = box(0.034, 0.028, 0.12 - Math.abs(centered) * 0.008, materials.bone);
      tooth.name = `ISLAND_17_BONE_HOLLOW_TOP_DOWN_READABLE_TOOTH_${index + 1}`;
      tooth.position.set(centered * 0.042, 0.795, 0.4);
      tooth.userData.keepSeparate = true;
      topReadMask.add(tooth);
    }
    root.add(topReadMask);
    const towerFace = new THREE.Group();
    towerFace.name = 'ISLAND_17_BONE_HOLLOW_RAISED_SKULL_HATCHERY_TOWER_FACE';
    towerFace.position.set(-0.18, 0.18, 0.12);
    const towerColumn = cylinder(0.22, 0.28, 0.58, materials.darkStone, 10);
    towerColumn.name = 'ISLAND_17_BONE_HOLLOW_RAISED_SKULL_TOWER_DARK_THROAT';
    towerColumn.position.set(0.02, 0.92, 0.58);
    towerColumn.scale.z = 0.7;
    const towerPlate = sphere(0.42, materials.crackedBone, 14);
    towerPlate.name = 'ISLAND_17_BONE_HOLLOW_RAISED_SKULL_TOWER_CRACKED_FACE';
    towerPlate.position.set(-0.02, 1.28, 0.86);
    towerPlate.scale.set(1.24, 1.32, 0.24);
    towerPlate.rotation.x = -0.12;
    const towerBrow = box(0.7, 0.08, 0.06, materials.agedBone);
    towerBrow.name = 'ISLAND_17_BONE_HOLLOW_RAISED_SKULL_TOWER_BROW';
    towerBrow.position.set(-0.02, 1.48, 1.0);
    towerBrow.rotation.x = -0.12;
    const towerJaw = box(0.52, 0.08, 0.056, materials.agedBone);
    towerJaw.name = 'ISLAND_17_BONE_HOLLOW_RAISED_SKULL_TOWER_JAW';
    towerJaw.position.set(-0.02, 1.0, 1.0);
    towerJaw.rotation.x = -0.12;
    towerFace.add(towerColumn, towerPlate, towerBrow, towerJaw);
    [-1, 1].forEach((side) => {
      const socket = sphere(0.14, materials.shadow, 10);
      socket.name = `ISLAND_17_BONE_HOLLOW_RAISED_SKULL_TOWER_SOCKET_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      socket.position.set(side * 0.25 - 0.02, 1.28, 1.05);
      socket.scale.set(1.32, 0.8, 0.24);
      socket.rotation.x = -0.12;
      socket.userData.keepSeparate = true;
      const eyeGlow = sphere(0.064, materials.soulfire, 8);
      eyeGlow.name = `ISLAND_17_BONE_HOLLOW_RAISED_SKULL_TOWER_EYE_GLOW_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      eyeGlow.position.set(side * 0.25 - 0.02, 1.28, 1.1);
      eyeGlow.scale.set(1.1, 0.82, 0.5);
      eyeGlow.userData.keepSeparate = true;
      const cheek = box(0.18, 0.08, 0.04, materials.agedBone);
      cheek.name = `ISLAND_17_BONE_HOLLOW_RAISED_SKULL_TOWER_CHEEK_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      cheek.position.set(side * 0.34 - 0.02, 1.12, 1.02);
      cheek.rotation.set(-0.08, side * 0.18, side * 0.3);
      towerFace.add(socket, eyeGlow, cheek);
    });
    const towerNose = box(0.13, 0.22, 0.052, materials.shadow);
    towerNose.name = 'ISLAND_17_BONE_HOLLOW_RAISED_SKULL_TOWER_NOSE_VOID';
    towerNose.position.set(-0.02, 1.12, 1.11);
    towerNose.rotation.set(-0.12, 0, Math.PI / 4);
    towerNose.userData.keepSeparate = true;
    const towerMouth = box(0.4, 0.15, 0.052, materials.shadow);
    towerMouth.name = 'ISLAND_17_BONE_HOLLOW_RAISED_SKULL_TOWER_MOUTH_VOID';
    towerMouth.position.set(-0.02, 0.94, 1.09);
    towerMouth.rotation.x = -0.12;
    towerMouth.userData.keepSeparate = true;
    const towerThroatGlow = box(0.2, 0.1, 0.056, materials.soulfireGlass);
    towerThroatGlow.name = 'ISLAND_17_BONE_HOLLOW_RAISED_SKULL_TOWER_THROAT_GLOW';
    towerThroatGlow.position.set(-0.02, 0.94, 1.14);
    towerThroatGlow.rotation.x = -0.12;
    towerThroatGlow.userData.keepSeparate = true;
    towerFace.add(towerNose, towerMouth, towerThroatGlow);
    for (let index = 0; index < 8; index += 1) {
      const centered = index - 3.5;
      const tooth = box(0.033, 0.15 - Math.abs(centered) * 0.01, 0.034, materials.bone);
      tooth.name = `ISLAND_17_BONE_HOLLOW_RAISED_SKULL_TOWER_TOOTH_${index + 1}`;
      tooth.position.set(centered * 0.052 - 0.02, 0.82, 1.12);
      tooth.rotation.set(-0.14, 0, centered * 0.025);
      tooth.userData.keepSeparate = true;
      towerFace.add(tooth);
    }
    for (let index = 0; index < amount(quality, 7, 5, 4); index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const crack = box(0.012, 0.16 + (index % 3) * 0.05, 0.018, index % 3 === 0 ? materials.shadow : materials.bronze);
      crack.name = `ISLAND_17_BONE_HOLLOW_RAISED_SKULL_TOWER_CRACK_${index + 1}`;
      crack.position.set(side * (0.08 + (index % 4) * 0.09) - 0.02, 1.52 - (index % 5) * 0.1, 1.11);
      crack.rotation.set(-0.1, 0, side * (0.22 + index * 0.045));
      crack.userData.keepSeparate = true;
      towerFace.add(crack);
    }
    root.add(towerFace);
    const highReadMask = new THREE.Group();
    highReadMask.name = 'ISLAND_17_BONE_HOLLOW_HIGH_READ_SKULL_HATCHERY_MASK';
    highReadMask.position.set(0.08, 0.08, 0.18);
    const highPlate = sphere(0.38, materials.crackedBone, 14);
    highPlate.name = 'ISLAND_17_BONE_HOLLOW_HIGH_READ_CRACKED_SKULL_FACE';
    highPlate.position.set(-0.34, 1.62, 0.54);
    highPlate.scale.set(1.18, 1.32, 0.2);
    highPlate.rotation.set(-0.1, 0.08, -0.04);
    const highBrow = box(0.62, 0.075, 0.06, materials.agedBone);
    highBrow.name = 'ISLAND_17_BONE_HOLLOW_HIGH_READ_BROW_BAR';
    highBrow.position.set(-0.34, 1.78, 0.66);
    highBrow.rotation.x = -0.1;
    const highJaw = box(0.48, 0.075, 0.056, materials.agedBone);
    highJaw.name = 'ISLAND_17_BONE_HOLLOW_HIGH_READ_JAW_BAR';
    highJaw.position.set(-0.34, 1.38, 0.66);
    highJaw.rotation.x = -0.1;
    const highThroat = box(0.2, 0.3, 0.05, materials.soulfireGlass);
    highThroat.name = 'ISLAND_17_BONE_HOLLOW_HIGH_READ_TEAL_THROAT';
    highThroat.position.set(-0.34, 1.2, 0.68);
    highThroat.rotation.x = -0.1;
    highThroat.userData.keepSeparate = true;
    highReadMask.add(highPlate, highBrow, highJaw, highThroat);
    [-1, 1].forEach((side) => {
      const socket = sphere(0.13, materials.shadow, 10);
      socket.name = `ISLAND_17_BONE_HOLLOW_HIGH_READ_SOCKET_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      socket.position.set(-0.34 + side * 0.2, 1.62, 0.7);
      socket.scale.set(1.25, 0.8, 0.24);
      socket.rotation.x = -0.1;
      socket.userData.keepSeparate = true;
      const eye = sphere(0.06, materials.soulfire, 8);
      eye.name = `ISLAND_17_BONE_HOLLOW_HIGH_READ_EYE_GLOW_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      eye.position.set(-0.34 + side * 0.2, 1.62, 0.75);
      eye.scale.set(1.08, 0.82, 0.5);
      eye.userData.keepSeparate = true;
      highReadMask.add(socket, eye);
    });
    const highNose = box(0.12, 0.2, 0.05, materials.shadow);
    highNose.name = 'ISLAND_17_BONE_HOLLOW_HIGH_READ_NOSE_VOID';
    highNose.position.set(-0.34, 1.48, 0.76);
    highNose.rotation.set(-0.1, 0, Math.PI / 4);
    highNose.userData.keepSeparate = true;
    const highMouth = box(0.36, 0.14, 0.052, materials.shadow);
    highMouth.name = 'ISLAND_17_BONE_HOLLOW_HIGH_READ_MOUTH_VOID';
    highMouth.position.set(-0.34, 1.34, 0.74);
    highMouth.rotation.x = -0.1;
    highMouth.userData.keepSeparate = true;
    highReadMask.add(highNose, highMouth);
    for (let index = 0; index < 7; index += 1) {
      const centered = index - 3;
      const tooth = box(0.03, 0.13 - Math.abs(centered) * 0.01, 0.032, materials.bone);
      tooth.name = `ISLAND_17_BONE_HOLLOW_HIGH_READ_TOOTH_${index + 1}`;
      tooth.position.set(-0.34 + centered * 0.048, 1.25, 0.76);
      tooth.rotation.set(-0.12, 0, centered * 0.025);
      tooth.userData.keepSeparate = true;
      highReadMask.add(tooth);
    }
    root.add(highReadMask);
    for (let index = 0; index < amount(quality, 7, 5, 4); index += 1) {
      const angle = index / amount(quality, 7, 5, 4) * Math.PI * 2 + 0.28;
      const hatchlingEgg = sphere(0.036 + (index % 2) * 0.012, index % 3 === 0 ? materials.soulfireGlass : materials.agedBone, 8);
      hatchlingEgg.name = `ISLAND_17_BONE_HOLLOW_NEST_EGG_${index + 1}`;
      hatchlingEgg.scale.set(0.72, 1.12, 0.72);
      hatchlingEgg.position.set(Math.cos(angle) * 0.42, 0.68 + (index % 2) * 0.018, Math.sin(angle) * 0.3 - 0.18);
      hatchlingEgg.userData.keepSeparate = true;
      root.add(hatchlingEgg);
    }
    [
      'ISLAND_17_BONE_HOLLOW_ANCIENT_EGG',
      'ISLAND_17_BONE_HOLLOW_RIB_SHELL',
      'ISLAND_17_BONE_HOLLOW_RIM_SHARD',
      'ISLAND_17_BONE_HOLLOW_SKULL_CAVE_FACADE',
      'ISLAND_17_BONE_HOLLOW_TEAL_CAVE_DOOR_GLOW',
      'ISLAND_17_BONE_HOLLOW_VISIBLE_EYE',
      'ISLAND_17_BONE_HOLLOW_VISIBLE_TEAL_EYE',
      'ISLAND_17_BONE_HOLLOW_VISIBLE_MOUTH',
      'ISLAND_17_BONE_HOLLOW_VISIBLE_TOOTH',
      'ISLAND_17_BONE_HOLLOW_CAMERA_SIDE',
      'ISLAND_17_BONE_HOLLOW_CRACKED_SHELL_PLATE',
      'ISLAND_17_BONE_HOLLOW_TALL_PROTECTIVE_TUSK_RIB',
      'ISLAND_17_BONE_HOLLOW_ANCIENT_EGG_CRACK',
      'ISLAND_17_BONE_HOLLOW_CAMERA_FACING',
      'ISLAND_17_BONE_HOLLOW_CENTER',
      'ISLAND_17_BONE_HOLLOW_VISIBLE_FLOOR',
      'ISLAND_17_BONE_HOLLOW_RAISED_CREST',
      'ISLAND_17_BONE_HOLLOW_FRONT_RIM',
      'ISLAND_17_BONE_HOLLOW_EXPOSED_OVAL',
      'ISLAND_17_BONE_HOLLOW_VISIBLE_HATCHERY',
      'ISLAND_17_BONE_HOLLOW_TOWER_ALL_SIDE',
      'ISLAND_17_BONE_HOLLOW_PHONE_FACADE',
      'ISLAND_17_BONE_HOLLOW_VISIBLE_SIDE',
      'ISLAND_17_BONE_HOLLOW_TOP_DOWN',
      'ISLAND_17_BONE_HOLLOW_RAISED_SKULL_TOWER',
      'ISLAND_17_BONE_HOLLOW_RAISED_SKULL_HATCHERY_TOWER_FACE',
      'ISLAND_17_BONE_HOLLOW_HIGH_READ',
      'ISLAND_17_BONE_HOLLOW_NEST_EGG',
      'ISLAND_17_BONE_ARC_HALF_RIB',
    ].forEach((prefix) => {
      root.traverse((child) => {
        if (child.name.startsWith(prefix)) child.visible = false;
      });
    });

    const finalHatchery = new THREE.Group();
    finalHatchery.name = 'ISLAND_17_BONE_HOLLOW_FINAL_READABLE_SKULL_HATCHERY';
    const skullRelief = cylinder(0.42, 0.48, 0.032, materials.crackedBone, segments(quality) * 2);
    skullRelief.name = 'ISLAND_17_BONE_HOLLOW_FINAL_OVAL_SKULL_RELIEF';
    skullRelief.position.set(0, 0.745, 0.03);
    skullRelief.scale.set(1.22, 1, 0.74);
    const jawRelief = box(0.54, 0.034, 0.16, materials.crackedBone);
    jawRelief.name = 'ISLAND_17_BONE_HOLLOW_FINAL_JAW_PLATE';
    jawRelief.position.set(0, 0.775, 0.34);
    const browRelief = box(0.72, 0.04, 0.12, materials.agedBone);
    browRelief.name = 'ISLAND_17_BONE_HOLLOW_FINAL_HEAVY_BROW_BAR';
    browRelief.position.set(0, 0.79, -0.13);
    finalHatchery.add(skullRelief, jawRelief, browRelief);
    [-1, 1].forEach((side) => {
      const socket = cylinder(0.13, 0.145, 0.036, materials.shadow, 14);
      socket.name = `ISLAND_17_BONE_HOLLOW_FINAL_DEEP_SOCKET_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      socket.position.set(side * 0.2, 0.81, -0.02);
      socket.scale.set(1.22, 1, 0.76);
      socket.userData.keepSeparate = true;
      const eye = cylinder(0.062, 0.07, 0.04, materials.soulfire, 10);
      eye.name = `ISLAND_17_BONE_HOLLOW_FINAL_TEAL_EYE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      eye.position.set(side * 0.2, 0.84, -0.02);
      eye.scale.set(1.04, 1, 0.68);
      eye.userData.keepSeparate = true;
      const cheek = box(0.18, 0.032, 0.09, materials.agedBone);
      cheek.name = `ISLAND_17_BONE_HOLLOW_FINAL_CHEEK_CHIP_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      cheek.position.set(side * 0.32, 0.82, 0.18);
      cheek.rotation.y = side * 0.3;
      finalHatchery.add(socket, eye, cheek);
    });
    const noseVoid = box(0.12, 0.038, 0.16, materials.shadow);
    noseVoid.name = 'ISLAND_17_BONE_HOLLOW_FINAL_TRIANGLE_NOSE_VOID';
    noseVoid.position.set(0, 0.84, 0.14);
    noseVoid.rotation.y = Math.PI / 4;
    noseVoid.userData.keepSeparate = true;
    const finalMouthVoid = box(0.42, 0.04, 0.105, materials.shadow);
    finalMouthVoid.name = 'ISLAND_17_BONE_HOLLOW_FINAL_TOOTHED_MOUTH_VOID';
    finalMouthVoid.position.set(0, 0.84, 0.3);
    finalMouthVoid.userData.keepSeparate = true;
    const throatGlow = box(0.23, 0.044, 0.064, materials.soulfireGlass);
    throatGlow.name = 'ISLAND_17_BONE_HOLLOW_FINAL_MOUTH_SOULFIRE';
    throatGlow.position.set(0, 0.872, 0.3);
    throatGlow.userData.keepSeparate = true;
    finalHatchery.add(noseVoid, finalMouthVoid, throatGlow);
    for (let index = 0; index < 7; index += 1) {
      const centered = index - 3;
      const tooth = box(0.032, 0.04, 0.12 - Math.abs(centered) * 0.01, materials.bone);
      tooth.name = `ISLAND_17_BONE_HOLLOW_FINAL_READABLE_TOOTH_${index + 1}`;
      tooth.position.set(centered * 0.05, 0.89, 0.38);
      tooth.userData.keepSeparate = true;
      finalHatchery.add(tooth);
    }
    for (let index = 0; index < 5; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const crack = box(0.009, 0.018, 0.08 + (index % 2) * 0.03, index % 3 === 0 ? materials.shadow : materials.agedBone);
      crack.name = `ISLAND_17_BONE_HOLLOW_FINAL_SKULL_CRACK_${index + 1}`;
      crack.position.set(side * (0.24 + (index % 3) * 0.065), 0.892, -0.2 + (index % 3) * 0.22);
      crack.rotation.y = side * (0.55 + index * 0.07);
      crack.userData.keepSeparate = true;
      finalHatchery.add(crack);
    }
    const rearBrowRelief = box(0.56, 0.034, 0.09, materials.agedBone);
    rearBrowRelief.name = 'ISLAND_17_BONE_HOLLOW_360_REAR_BROW_BAR';
    rearBrowRelief.position.set(0, 0.805, -0.35);
    const rearSkullCap = sphere(0.22, materials.crackedBone, 12);
    rearSkullCap.name = 'ISLAND_17_BONE_HOLLOW_360_RAISED_REAR_SKULL_CAP';
    rearSkullCap.position.set(0, 0.82, -0.4);
    rearSkullCap.scale.set(1.6, 0.44, 0.72);
    const rearMouthVoid = box(0.32, 0.038, 0.072, materials.shadow);
    rearMouthVoid.name = 'ISLAND_17_BONE_HOLLOW_360_REAR_MOUTH_VOID';
    rearMouthVoid.position.set(0, 0.86, -0.47);
    rearMouthVoid.userData.keepSeparate = true;
    const rearMouthGlow = box(0.18, 0.04, 0.045, materials.soulfireGlass);
    rearMouthGlow.name = 'ISLAND_17_BONE_HOLLOW_360_REAR_MOUTH_GLOW';
    rearMouthGlow.position.set(0, 0.895, -0.47);
    rearMouthGlow.userData.keepSeparate = true;
    finalHatchery.add(rearSkullCap, rearBrowRelief, rearMouthVoid, rearMouthGlow);
    [-1, 1].forEach((side) => {
      const rearSocket = cylinder(0.092, 0.102, 0.03, materials.shadow, 12);
      rearSocket.name = `ISLAND_17_BONE_HOLLOW_360_REAR_SOCKET_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      rearSocket.position.set(side * 0.15, 0.84, -0.36);
      rearSocket.scale.set(1.1, 1, 0.72);
      rearSocket.userData.keepSeparate = true;
      const rearEye = cylinder(0.042, 0.048, 0.032, materials.soulfire, 8);
      rearEye.name = `ISLAND_17_BONE_HOLLOW_360_REAR_EYE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      rearEye.position.set(side * 0.15, 0.872, -0.36);
      rearEye.scale.set(0.9, 1, 0.62);
      rearEye.userData.keepSeparate = true;
      const sideRidge = curveTube([
        new THREE.Vector3(side * 0.42, 0.68, -0.32),
        new THREE.Vector3(side * 0.52, 0.86, -0.12),
        new THREE.Vector3(side * 0.42, 0.84, 0.16),
      ], 0.022, materials.agedBone, quality, 12);
      sideRidge.name = `ISLAND_17_BONE_HOLLOW_360_SIDE_CRANIUM_RIDGE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      const sideJawRib = curveTube([
        new THREE.Vector3(side * 0.36, 0.7, -0.34),
        new THREE.Vector3(side * 0.52, 0.78, -0.12),
        new THREE.Vector3(side * 0.36, 0.68, 0.18),
      ], 0.018, materials.bone, quality, 12);
      sideJawRib.name = `ISLAND_17_BONE_HOLLOW_360_SIDE_JAW_RIB_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      finalHatchery.add(rearSocket, rearEye, sideRidge, sideJawRib);
    });
    [-1, 1].forEach((side) => {
      const cradleEgg = sphere(0.062, materials.agedBone, 8);
      cradleEgg.name = `ISLAND_17_BONE_HOLLOW_FINAL_SIDE_EGG_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      cradleEgg.scale.set(0.72, 1.28, 0.72);
      cradleEgg.position.set(side * 0.5, 0.77, -0.22);
      const eggGlow = box(0.012, 0.12, 0.014, materials.soulfire);
      eggGlow.name = `ISLAND_17_BONE_HOLLOW_FINAL_SIDE_EGG_CRACK_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      eggGlow.position.set(side * 0.5, 0.83, -0.18);
      eggGlow.rotation.z = side * 0.3;
      eggGlow.userData.keepSeparate = true;
      finalHatchery.add(cradleEgg, eggGlow);
    });
    [-1, 1].forEach((side) => {
      for (let index = 0; index < 2; index += 1) {
        const rib = curveTube([
          new THREE.Vector3(side * (0.45 + index * 0.06), 0.64, -0.34),
          new THREE.Vector3(side * (0.58 + index * 0.06), 0.84, -0.24),
          new THREE.Vector3(side * (0.48 + index * 0.06), 0.72, -0.04),
        ], 0.018, materials.bone, quality, 14);
        rib.name = `ISLAND_17_BONE_HOLLOW_FINAL_SIDE_RIB_${side < 0 ? 'LEFT' : 'RIGHT'}_${index + 1}`;
        finalHatchery.add(rib);
      }
    });
    const uprightGate = new THREE.Group();
    uprightGate.name = 'ISLAND_17_BONE_HOLLOW_FINAL_UPRIGHT_SKULL_CAVE_GATE';
    const gatePlate = sphere(0.34, materials.crackedBone, 14);
    gatePlate.name = 'ISLAND_17_BONE_HOLLOW_FINAL_GATE_SKULL_FACE';
    gatePlate.position.set(-0.58, 0.9, -0.02);
    gatePlate.scale.set(0.18, 1.14, 1.02);
    gatePlate.rotation.y = Math.PI / 2;
    const gateBrow = box(0.045, 0.064, 0.58, materials.agedBone);
    gateBrow.name = 'ISLAND_17_BONE_HOLLOW_FINAL_GATE_BROW';
    gateBrow.position.set(-0.66, 1.0, -0.02);
    const gateJaw = box(0.045, 0.064, 0.42, materials.agedBone);
    gateJaw.name = 'ISLAND_17_BONE_HOLLOW_FINAL_GATE_JAW';
    gateJaw.position.set(-0.66, 0.62, -0.02);
    uprightGate.add(gatePlate, gateBrow, gateJaw);
    [-1, 1].forEach((side) => {
      const gateSocket = sphere(0.102, materials.shadow, 10);
      gateSocket.name = `ISLAND_17_BONE_HOLLOW_FINAL_GATE_SOCKET_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      gateSocket.position.set(-0.69, 0.84, side * 0.16);
      gateSocket.scale.set(0.22, 0.78, 1.02);
      gateSocket.userData.keepSeparate = true;
      const gateEye = sphere(0.048, materials.soulfire, 8);
      gateEye.name = `ISLAND_17_BONE_HOLLOW_FINAL_GATE_EYE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      gateEye.position.set(-0.73, 0.84, side * 0.16);
      gateEye.scale.set(0.48, 0.84, 0.9);
      gateEye.userData.keepSeparate = true;
      uprightGate.add(gateSocket, gateEye);
    });
    const gateNose = box(0.044, 0.15, 0.11, materials.shadow);
    gateNose.name = 'ISLAND_17_BONE_HOLLOW_FINAL_GATE_NOSE_VOID';
    gateNose.position.set(-0.73, 0.73, 0);
    gateNose.rotation.x = Math.PI / 4;
    gateNose.userData.keepSeparate = true;
    const gateMouth = box(0.047, 0.12, 0.34, materials.shadow);
    gateMouth.name = 'ISLAND_17_BONE_HOLLOW_FINAL_GATE_MOUTH_VOID';
    gateMouth.position.set(-0.73, 0.58, 0);
    gateMouth.userData.keepSeparate = true;
    const gateMouthGlow = box(0.052, 0.07, 0.2, materials.soulfireGlass);
    gateMouthGlow.name = 'ISLAND_17_BONE_HOLLOW_FINAL_GATE_MOUTH_GLOW';
    gateMouthGlow.position.set(-0.77, 0.58, 0);
    gateMouthGlow.userData.keepSeparate = true;
    uprightGate.add(gateNose, gateMouth, gateMouthGlow);
    uprightGate.visible = true;
    const gateCrownShard = box(0.05, 0.22, 0.12, materials.crackedBone);
    gateCrownShard.name = 'ISLAND_17_BONE_HOLLOW_FINAL_GATE_CROWN_SHARD';
    gateCrownShard.position.set(-0.68, 1.22, -0.04);
    gateCrownShard.rotation.set(0.08, 0, -0.18);
    const gateHangingRune = box(0.052, 0.18, 0.028, materials.soulfireGlass);
    gateHangingRune.name = 'ISLAND_17_BONE_HOLLOW_FINAL_GATE_HANGING_TEAL_RUNE';
    gateHangingRune.position.set(-0.78, 1.08, 0.24);
    gateHangingRune.rotation.z = 0.28;
    gateHangingRune.userData.keepSeparate = true;
    uprightGate.add(gateCrownShard, gateHangingRune);
    finalHatchery.add(uprightGate);
    root.add(finalHatchery);
  }
  if (level >= 3) {
    addSoulfire(root, new THREE.Vector3(0, 0.66, -0.36), 0.045, materials);
    const fallback = new THREE.Group();
    fallback.name = 'ISLAND_17_BONE_HOLLOW_PROCEDURAL_FALLBACK';
    [...root.children].forEach((child) => fallback.add(child));
    compactIsland17StaticGeometry(fallback, 'ISLAND_17_BONE_HOLLOW_FALLBACK_STATIC', false);
    root.add(fallback);
    if (canLoadIsland17RuntimeAssets()) {
      root.userData.boneHollowAssetState = 'loading';
      new GLTFLoader().load(
        ISLAND_17_BONE_HOLLOW_URL,
        ({ scene }) => {
          scene.name = 'ISLAND_17_BONE_HOLLOW_BLENDER_V013';
          scene.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            object.castShadow = true;
            object.receiveShadow = false;
            object.frustumCulled = true;
          });
          fallback.visible = false;
          fallback.clear();
          root.remove(fallback);
          root.add(scene);
          root.userData.boneHollowAssetState = 'ready';
          const bounds = new THREE.Box3().setFromObject(scene);
          window.dispatchEvent(new CustomEvent('island17:bone-hollow-ready', {
            detail: {
              asset: scene.name,
              meshCount: scene.getObjectsByProperty('type', 'Mesh').length,
              bounds: {
                min: bounds.min.toArray(),
                max: bounds.max.toArray(),
              },
            },
          }));
        },
        undefined,
        (error) => {
          root.userData.boneHollowAssetState = 'failed';
          root.userData.boneHollowAssetError = error instanceof Error ? error.message : String(error);
          window.dispatchEvent(new CustomEvent('island17:bone-hollow-error', {
            detail: {
              asset: ISLAND_17_BONE_HOLLOW_URL,
              message: root.userData.boneHollowAssetError,
            },
          }));
        },
      );
    }
  }
  return root;
}

export function createIsland17BoneHollowRuntimeStage(
  materials: Island17TitansRestMaterials,
  quality: Island3DQuality = 'high',
) {
  return createBoneHollow(3, quality, materials);
}

function createStrengthAltar(level: BuildLevel, quality: Island3DQuality, materials: Island17TitansRestMaterials) {
  const root = new THREE.Group();
  addPlatform(root, 0.82, materials, quality);
  if (level === 0) return root;
  const squareShrineSlab = box(1.52, 0.14, 1.22, materials.darkStone);
  squareShrineSlab.name = 'ISLAND_17_STRENGTH_ALTAR_SQUARE_CLIFF_SHRINE_SLAB';
  squareShrineSlab.position.y = 0.48;
  const squareShrineTop = box(1.36, 0.045, 1.04, materials.limestone);
  squareShrineTop.name = 'ISLAND_17_STRENGTH_ALTAR_CRACKED_TRAINING_TILE_FIELD';
  squareShrineTop.position.y = 0.575;
  root.add(squareShrineSlab, squareShrineTop);
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const tile = box(0.3, 0.012, 0.24, (row + col) % 2 ? materials.crackedBone : materials.limestone);
      tile.name = `ISLAND_17_STRENGTH_ALTAR_CRACKED_FLOOR_TILE_${row + 1}_${col + 1}`;
      tile.position.set(-0.45 + col * 0.3, 0.606, -0.28 + row * 0.25);
      tile.rotation.y = (row - col) * 0.015;
      root.add(tile);
    }
  }
  const altarBase = box(0.72, 0.22, 0.66, materials.darkStone);
  altarBase.name = 'ISLAND_17_STRENGTH_ALTAR_SQUARE_STONE_DAIS';
  altarBase.position.y = 0.54;
  const altarTop = box(0.54, 0.12, 0.48, materials.limestone);
  altarTop.name = 'ISLAND_17_STRENGTH_ALTAR_RAISED_BONE_ALTAR_TOP';
  altarTop.position.y = 0.72;
  const brazier = cylinder(0.22, 0.3, 0.16, materials.bronze, segments(quality));
  brazier.name = 'ISLAND_17_STRENGTH_ALTAR_TEAL_BRAZIER_BOWL';
  brazier.position.set(0, 0.86, 0.02);
  root.add(altarBase, altarTop, brazier);
  [-1, 1].forEach((side) => {
    const tusk = curveTube([
      new THREE.Vector3(side * 0.36, 0.64, 0.1),
      new THREE.Vector3(side * 0.78, 1.02, 0.17),
      new THREE.Vector3(side * 0.9, 1.5, -0.02),
    ], 0.105, materials.bone, quality, 24);
    tusk.name = `ISLAND_17_STRENGTH_ALTAR_TUSK_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    root.add(tusk);
    const tuskCollar = cylinder(0.135, 0.145, 0.13, materials.bronze, 10);
    tuskCollar.name = `ISLAND_17_STRENGTH_ALTAR_BRONZE_TUSK_COLLAR_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    tuskCollar.position.set(side * 0.5, 0.75, 0.12);
    tuskCollar.rotation.z = Math.PI / 2 + side * 0.18;
    root.add(tuskCollar);
    const rearTusk = curveTube([
      new THREE.Vector3(side * 0.46, 0.55, -0.32),
      new THREE.Vector3(side * 0.78, 0.98, -0.16),
      new THREE.Vector3(side * 0.66, 1.42, -0.38),
    ], 0.062, materials.agedBone, quality, 18);
    rearTusk.name = `ISLAND_17_STRENGTH_ALTAR_REAR_TUSK_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    root.add(rearTusk);
  });
  const altarSoulfire = addSoulfire(root, new THREE.Vector3(0, 1.0, 0.02), 0.115, materials);
  altarSoulfire.name = 'ISLAND_17_STRENGTH_ALTAR_ORIGINAL_SOULFIRE';
  const flameTip = sphere(0.09, materials.soulfire, 8);
  flameTip.name = 'ISLAND_17_STRENGTH_ALTAR_VERTICAL_SOULFIRE_TIP';
  flameTip.position.set(0, 1.17, 0.02);
  flameTip.scale.set(0.74, 1.42, 0.74);
  flameTip.userData.keepSeparate = true;
  const flameHalo = torus(0.28, 0.018, materials.soulfireGlass, segments(quality) * 2);
  flameHalo.name = 'ISLAND_17_STRENGTH_ALTAR_SOULFIRE_ALTAR_HALO';
  flameHalo.position.set(0, 0.99, 0.02);
  root.add(flameTip, flameHalo);
  if (level >= 2) {
    const bronzeRing = torus(0.62, 0.03, materials.bronze, segments(quality) * 2);
    bronzeRing.position.y = 0.52;
    root.add(bronzeRing);
    const railPosts = [
      [-0.66, 0.55, 0.5],
      [-0.24, 0.55, 0.54],
      [0.24, 0.55, 0.54],
      [0.66, 0.55, 0.5],
      [-0.66, 0.55, -0.48],
      [0.66, 0.55, -0.48],
    ] as const;
    railPosts.forEach((position, index) => {
      const post = cylinder(0.035, 0.045, 0.34, index % 2 ? materials.agedBone : materials.bone, 7);
      post.name = `ISLAND_17_STRENGTH_ALTAR_SKULL_RAIL_POST_${index + 1}`;
      post.position.set(position[0], position[1], position[2]);
      const skullKnob = createSkullHead(materials, quality, 0.082);
      skullKnob.name = `ISLAND_17_STRENGTH_ALTAR_RAIL_SKULL_KNOB_${index + 1}`;
      skullKnob.position.set(position[0], position[1] + 0.17, position[2]);
      skullKnob.rotation.y = index < 4 ? 0 : Math.PI;
      root.add(post, skullKnob);
    });
    [-1, 1].forEach((side) => {
      const sideRail = tubeBetween(
        new THREE.Vector3(side * 0.66, 0.69, -0.42),
        new THREE.Vector3(side * 0.66, 0.69, 0.5),
        0.026,
        materials.bronze,
        6,
      );
      sideRail.name = `ISLAND_17_STRENGTH_ALTAR_SIDE_BONE_RAIL_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      root.add(sideRail);
    });
    const frontRail = tubeBetween(
      new THREE.Vector3(-0.62, 0.7, 0.54),
      new THREE.Vector3(0.62, 0.7, 0.54),
      0.026,
      materials.bronze,
      6,
    );
    frontRail.name = 'ISLAND_17_STRENGTH_ALTAR_FRONT_BONE_RAIL';
    root.add(frontRail);
  }
  if (level >= 3) {
    const obeliskCount = amount(quality, 14, 10, 7);
    for (let index = 0; index < obeliskCount; index += 1) {
      const angle = index / obeliskCount * Math.PI * 2 + 0.06;
      const obelisk = cylinder(0.04, 0.075, index % 3 === 0 ? 0.92 : 0.66, index % 2 ? materials.bronze : materials.agedBone, 5);
      obelisk.name = `ISLAND_17_STRENGTH_ALTAR_BONE_OBELISK_${index + 1}`;
      obelisk.position.set(Math.cos(angle) * 0.84, 0.66 + (index % 3) * 0.045, Math.sin(angle) * 0.84);
      obelisk.rotation.z = (index % 4 - 1.5) * 0.045;
      root.add(obelisk);
    }
    [-1, 1].forEach((side) => {
      const grip = tubeBetween(
        new THREE.Vector3(side * 0.14, 0.61, 0.64),
        new THREE.Vector3(side * 0.52, 0.61, 0.64),
        0.042,
        materials.iron,
        quality === 'low' ? 5 : 6,
      );
      grip.name = `ISLAND_17_STRENGTH_ALTAR_BONE_WEIGHT_BAR_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      const weight = cylinder(0.16, 0.16, 0.17, materials.agedBone, 8);
      weight.name = `ISLAND_17_STRENGTH_ALTAR_STACKED_WEIGHT_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      weight.position.set(side * 0.56, 0.61, 0.64);
      weight.rotation.z = Math.PI / 2;
      const outerWeight = cylinder(0.19, 0.19, 0.12, materials.crackedBone, 8);
      outerWeight.name = `ISLAND_17_STRENGTH_ALTAR_OUTER_WEIGHT_PLATE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      outerWeight.position.set(side * 0.7, 0.61, 0.64);
      outerWeight.rotation.z = Math.PI / 2;
      root.add(grip, weight, outerWeight);
    });
    const backCrest = curveTube([
      new THREE.Vector3(-0.74, 0.58, -0.34),
      new THREE.Vector3(0, 1.32, -0.52),
      new THREE.Vector3(0.74, 0.58, -0.34),
    ], 0.065, materials.agedBone, quality, 22);
    backCrest.name = 'ISLAND_17_STRENGTH_ALTAR_REAR_HORN_CREST';
    root.add(backCrest);
    [-1, 1].forEach((side) => {
      const frontRail = tubeBetween(
        new THREE.Vector3(side * 0.3, 0.64, 0.58),
        new THREE.Vector3(side * 0.68, 0.66, 0.58),
        0.028,
        materials.bronze,
        6,
      );
      frontRail.name = `ISLAND_17_STRENGTH_ALTAR_FRONT_BRONZE_RAIL_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      root.add(frontRail);
    });
    const bannerPole = cylinder(0.025, 0.034, 1.28, materials.agedBone, 6);
    bannerPole.name = 'ISLAND_17_STRENGTH_ALTAR_PURPLE_STANDARD_POLE';
    bannerPole.position.set(0.78, 0.92, -0.52);
    const bannerCrossbar = box(0.46, 0.035, 0.035, materials.agedBone);
    bannerCrossbar.name = 'ISLAND_17_STRENGTH_ALTAR_PURPLE_STANDARD_CROSSBAR';
    bannerCrossbar.position.set(0.66, 1.5, -0.52);
    const banner = box(0.28, 0.42, 0.035, materials.banner);
    banner.name = 'ISLAND_17_STRENGTH_ALTAR_PURPLE_TRAINING_BANNER';
    banner.position.set(0.54, 1.25, -0.52);
    banner.rotation.z = -0.04;
    const frontBanner = box(0.34, 0.3, 0.026, materials.banner);
    frontBanner.name = 'ISLAND_17_STRENGTH_ALTAR_FRONT_TORN_PURPLE_TABARD';
    frontBanner.position.set(0, 0.54, 0.63);
    frontBanner.rotation.x = -0.16;
    const stair = box(0.42, 0.08, 0.28, materials.limestone);
    stair.name = 'ISLAND_17_STRENGTH_ALTAR_FRONT_APPROACH_STEP';
    stair.position.set(0, 0.42, 0.73);
    root.add(bannerPole, bannerCrossbar, banner, frontBanner, stair);

    [
      'ISLAND_17_STRENGTH_ALTAR_TUSK_',
      'ISLAND_17_STRENGTH_ALTAR_REAR_TUSK_',
      'ISLAND_17_STRENGTH_ALTAR_BRONZE_TUSK_COLLAR_',
      'ISLAND_17_STRENGTH_ALTAR_SKULL_RAIL_POST_',
      'ISLAND_17_STRENGTH_ALTAR_RAIL_SKULL_KNOB_',
      'ISLAND_17_STRENGTH_ALTAR_SIDE_BONE_RAIL_',
      'ISLAND_17_STRENGTH_ALTAR_FRONT_BONE_RAIL',
      'ISLAND_17_STRENGTH_ALTAR_BONE_OBELISK_',
      'ISLAND_17_STRENGTH_ALTAR_FRONT_BRONZE_RAIL_',
      'ISLAND_17_STRENGTH_ALTAR_PURPLE_STANDARD_',
      'ISLAND_17_STRENGTH_ALTAR_FRONT_TORN_PURPLE_TABARD',
      'ISLAND_17_STRENGTH_ALTAR_REAR_HORN_CREST',
      'ISLAND_17_STRENGTH_ALTAR_ORIGINAL_SOULFIRE',
      'ISLAND_17_STRENGTH_ALTAR_VERTICAL_SOULFIRE_TIP',
      'ISLAND_17_STRENGTH_ALTAR_SOULFIRE_ALTAR_HALO',
      'ISLAND_17_STRENGTH_ALTAR_BONE_WEIGHT_BAR_',
      'ISLAND_17_STRENGTH_ALTAR_STACKED_WEIGHT_',
      'ISLAND_17_STRENGTH_ALTAR_OUTER_WEIGHT_PLATE_',
    ].forEach((prefix) => {
      root.traverse((child) => {
        if (child.name.startsWith(prefix)) child.visible = false;
      });
    });

    const finalStrength = new THREE.Group();
    finalStrength.name = 'ISLAND_17_STRENGTH_ALTAR_FINAL_READABLE_TRAINING_SHRINE';
    const trainingMat = box(1.22, 0.035, 0.86, materials.limestone);
    trainingMat.name = 'ISLAND_17_STRENGTH_ALTAR_FINAL_CRACKED_TRAINING_MAT';
    trainingMat.position.set(0, 0.645, 0.02);
    finalStrength.add(trainingMat);
    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const plate = box(0.32, 0.018, 0.24, (row + col) % 2 ? materials.crackedBone : materials.darkStone);
        plate.name = `ISLAND_17_STRENGTH_ALTAR_FINAL_PHONE_TILE_${row + 1}_${col + 1}`;
        plate.position.set(-0.34 + col * 0.34, 0.675, -0.16 + row * 0.28);
        plate.rotation.y = (col - 1) * 0.035;
        finalStrength.add(plate);
      }
    }
    const finalDais = box(0.58, 0.16, 0.48, materials.darkStone);
    finalDais.name = 'ISLAND_17_STRENGTH_ALTAR_FINAL_LOW_DARK_DAIS';
    finalDais.position.set(0, 0.76, -0.02);
    const finalTop = cylinder(0.25, 0.31, 0.095, materials.bronze, segments(quality));
    finalTop.name = 'ISLAND_17_STRENGTH_ALTAR_FINAL_BRONZE_BRAZIER';
    finalTop.position.set(0, 0.89, -0.02);
    const finalFlame = sphere(0.11, materials.soulfire, 8);
    finalFlame.name = 'ISLAND_17_STRENGTH_ALTAR_FINAL_VERTICAL_SOULFIRE';
    finalFlame.position.set(0, 1.02, -0.02);
    finalFlame.scale.set(0.72, 1.4, 0.72);
    finalFlame.userData.keepSeparate = true;
    const finalHalo = torus(0.24, 0.012, materials.soulfireGlass, segments(quality) * 2);
    finalHalo.name = 'ISLAND_17_STRENGTH_ALTAR_FINAL_HABIT_COMMITMENT_RING';
    finalHalo.position.set(0, 0.955, -0.02);
    finalStrength.add(finalDais, finalTop, finalFlame, finalHalo);
    const frontBarbell = tubeBetween(
      new THREE.Vector3(-0.3, 0.79, 0.31),
      new THREE.Vector3(0.3, 0.79, 0.31),
      0.026,
      materials.iron,
      quality === 'low' ? 5 : 6,
    );
    frontBarbell.name = 'ISLAND_17_STRENGTH_ALTAR_FINAL_FRONT_BARBELL_GRIP';
    finalStrength.add(frontBarbell);
    [-1, 1].forEach((side) => {
      const plateA = cylinder(0.09, 0.09, 0.06, materials.agedBone, 8);
      plateA.name = `ISLAND_17_STRENGTH_ALTAR_FINAL_FRONT_BARBELL_INNER_PLATE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      plateA.position.set(side * 0.36, 0.79, 0.31);
      plateA.rotation.z = Math.PI / 2;
      const plateB = cylinder(0.12, 0.12, 0.072, materials.crackedBone, 8);
      plateB.name = `ISLAND_17_STRENGTH_ALTAR_FINAL_FRONT_BARBELL_OUTER_PLATE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      plateB.position.set(side * 0.44, 0.79, 0.31);
      plateB.rotation.z = Math.PI / 2;
      const bar = tubeBetween(
        new THREE.Vector3(side * 0.18, 0.74, 0.43),
        new THREE.Vector3(side * 0.54, 0.74, 0.43),
        0.035,
        materials.iron,
        quality === 'low' ? 5 : 6,
      );
      bar.name = `ISLAND_17_STRENGTH_ALTAR_FINAL_WEIGHT_BAR_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      const innerPlate = cylinder(0.13, 0.13, 0.11, materials.agedBone, 8);
      innerPlate.name = `ISLAND_17_STRENGTH_ALTAR_FINAL_INNER_WEIGHT_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      innerPlate.position.set(side * 0.56, 0.74, 0.43);
      innerPlate.rotation.z = Math.PI / 2;
      const outerPlate = cylinder(0.17, 0.17, 0.11, materials.crackedBone, 8);
      outerPlate.name = `ISLAND_17_STRENGTH_ALTAR_FINAL_OUTER_WEIGHT_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      outerPlate.position.set(side * 0.68, 0.74, 0.43);
      outerPlate.rotation.z = Math.PI / 2;
      const horn = curveTube([
        new THREE.Vector3(side * 0.34, 0.7, -0.36),
        new THREE.Vector3(side * 0.58, 1.0, -0.34),
        new THREE.Vector3(side * 0.52, 1.24, -0.14),
      ], 0.045, materials.bone, quality, 16);
      horn.name = `ISLAND_17_STRENGTH_ALTAR_FINAL_BACK_HORN_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      finalStrength.add(plateA, plateB, bar, innerPlate, outerPlate, horn);
    });
    for (let index = 0; index < 4; index += 1) {
      const marker = cylinder(0.032, 0.04, 0.34, index % 2 ? materials.bronze : materials.agedBone, 6);
      marker.name = `ISLAND_17_STRENGTH_ALTAR_FINAL_CORNER_MARKER_${index + 1}`;
      marker.position.set(index % 2 ? 0.58 : -0.58, 0.78, index < 2 ? 0.32 : -0.38);
      finalStrength.add(marker);
    }
    root.add(finalStrength);

    const fallback = new THREE.Group();
    fallback.name = 'ISLAND_17_STRENGTH_ALTAR_PROCEDURAL_FALLBACK';
    [...root.children].forEach((child) => fallback.add(child));
    compactIsland17StaticGeometry(fallback, 'ISLAND_17_STRENGTH_ALTAR_FALLBACK_STATIC', false);
    root.add(fallback);
    if (canLoadIsland17RuntimeAssets()) {
      root.userData.strengthAltarAssetState = 'loading';
      new GLTFLoader().load(
        ISLAND_17_STRENGTH_ALTAR_URL,
        ({ scene }) => {
          scene.name = 'ISLAND_17_STRENGTH_ALTAR_BLENDER_V007';
          scene.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            object.castShadow = true;
            object.receiveShadow = false;
            object.frustumCulled = true;
          });
          fallback.visible = false;
          fallback.clear();
          root.remove(fallback);
          root.add(scene);
          root.userData.strengthAltarAssetState = 'ready';
          const bounds = new THREE.Box3().setFromObject(scene);
          window.dispatchEvent(new CustomEvent('island17:strength-altar-ready', {
            detail: {
              asset: scene.name,
              meshCount: scene.getObjectsByProperty('type', 'Mesh').length,
              bounds: {
                min: bounds.min.toArray(),
                max: bounds.max.toArray(),
              },
            },
          }));
        },
        undefined,
        (error) => {
          root.userData.strengthAltarAssetState = 'failed';
          root.userData.strengthAltarAssetError = error instanceof Error ? error.message : String(error);
          window.dispatchEvent(new CustomEvent('island17:strength-altar-error', {
            detail: {
              asset: ISLAND_17_STRENGTH_ALTAR_URL,
              message: root.userData.strengthAltarAssetError,
            },
          }));
        },
      );
    }
  }
  return root;
}

export function createIsland17StrengthAltarRuntimeStage(
  materials: Island17TitansRestMaterials,
  quality: Island3DQuality = 'high',
) {
  return createStrengthAltar(3, quality, materials);
}

function createColiseumPit(level: BuildLevel, quality: Island3DQuality, materials: Island17TitansRestMaterials) {
  const root = new THREE.Group();
  const plinth = new THREE.Group();
  addPlatform(plinth, 0.72, materials, quality);
  plinth.name = 'ISLAND_17_COLISEUM_PIT_FLATTENED_CLIFF_PLINTH';
  plinth.position.y = -0.08;
  plinth.scale.set(1.48, 0.58, 1.12);
  root.add(plinth);
  if (level === 0) return root;
  const disk = cylinder(0.72, 0.78, 0.16, materials.agedBone, segments(quality) * 2);
  disk.name = 'ISLAND_17_COLISEUM_PIT_TRIAL_DISK';
  disk.position.y = 0.36;
  const inner = torus(0.44, 0.035, materials.bronze, segments(quality) * 2);
  inner.position.y = 0.53;
  const lowerBowl = cylinder(0.98, 1.06, 0.22, materials.limestone, segments(quality) * 2);
  lowerBowl.name = 'ISLAND_17_COLISEUM_PIT_STEPPED_OUTER_BOWL';
  lowerBowl.position.y = 0.3;
  const upperRake = cylinder(0.84, 0.98, 0.14, materials.agedBone, segments(quality) * 2);
  upperRake.name = 'ISLAND_17_COLISEUM_PIT_BONE_SEATING_RAKE';
  upperRake.position.y = 0.47;
  const arenaFloor = cylinder(0.46, 0.5, 0.045, materials.limestone, segments(quality) * 2);
  arenaFloor.name = 'ISLAND_17_COLISEUM_PIT_INLAID_ARENA_FLOOR';
  arenaFloor.position.y = 0.57;
  root.add(lowerBowl, disk, upperRake, arenaFloor, inner);
  const floorTileCount = amount(quality, 64, 44, 28);
  const floorTiles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.105, 0.018, 0.15), materials.crackedBone, floorTileCount);
  floorTiles.name = 'ISLAND_17_COLISEUM_PIT_RADIAL_FLOOR_STONES';
  const floorMatrix = new THREE.Matrix4();
  for (let index = 0; index < floorTiles.count; index += 1) {
    const ring = index % 4;
    const ringIndex = Math.floor(index / 4);
    const angle = ringIndex / Math.ceil(floorTiles.count / 4) * Math.PI * 2 + ring * 0.05;
    const radius = 0.17 + ring * 0.105;
    const position = new THREE.Vector3(Math.cos(angle) * radius, 0.61 + (index % 3) * 0.002, Math.sin(angle) * radius);
    const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -angle + Math.PI / 2, (index % 5 - 2) * 0.01));
    const scale = new THREE.Vector3(0.76 + ring * 0.1, 1, 0.66 + (index % 2) * 0.16);
    floorMatrix.compose(position, quaternion, scale);
    floorTiles.setMatrixAt(index, floorMatrix);
  }
  floorTiles.instanceMatrix.needsUpdate = true;
  floorTiles.userData.keepSeparate = true;
  root.add(floorTiles);
  if (level >= 2) {
    const readableWedgeCount = amount(quality, 22, 16, 12);
    for (let index = 0; index < readableWedgeCount; index += 1) {
      const angle = index / readableWedgeCount * Math.PI * 2;
      const wedge = box(0.12, 0.018, index % 3 === 0 ? 0.32 : 0.26, index % 4 === 0 ? materials.bronze : index % 2 === 0 ? materials.agedBone : materials.limestone);
      wedge.name = `ISLAND_17_COLISEUM_PIT_READABLE_ARENA_WEDGE_${index + 1}`;
      wedge.position.set(Math.cos(angle) * 0.28, 0.636 + (index % 2) * 0.004, Math.sin(angle) * 0.28);
      wedge.rotation.y = -angle + Math.PI / 2;
      wedge.userData.keepSeparate = true;
      root.add(wedge);
    }
    [0.24, 0.42, 0.6].forEach((radius, index) => {
      const inlayRing = torus(radius, 0.012 + index * 0.002, index === 1 ? materials.bronze : materials.crackedBone, segments(quality) * 2);
      inlayRing.name = `ISLAND_17_COLISEUM_PIT_CONCENTRIC_FLOOR_INLAY_${index + 1}`;
      inlayRing.position.y = 0.665 + index * 0.006;
      root.add(inlayRing);
    });
    const phoneLip = torus(0.52, 0.018, materials.agedBone, segments(quality) * 2);
    phoneLip.name = 'ISLAND_17_COLISEUM_PIT_PHONE_READABLE_BONE_LIP';
    phoneLip.position.y = 0.69;
    root.add(phoneLip);
    const centerMedallion = cylinder(0.13, 0.14, 0.026, materials.bronze, segments(quality) * 2);
    centerMedallion.name = 'ISLAND_17_COLISEUM_PIT_CENTER_TRIAL_MEDALLION';
    centerMedallion.position.y = 0.7;
    const centerGlow = addSoulfire(root, new THREE.Vector3(0, 0.76, 0), 0.045, materials);
    centerGlow.name = 'ISLAND_17_COLISEUM_PIT_CENTER_SOULFIRE_MARKER';
    root.add(centerMedallion);
    for (let index = 0; index < amount(quality, 9, 7, 5); index += 1) {
      const angle = index / amount(quality, 9, 7, 5) * Math.PI * 2 + 0.08;
      const crack = box(0.01, 0.008, 0.18 + (index % 3) * 0.045, index % 3 === 0 ? materials.shadow : materials.bronze);
      crack.name = `ISLAND_17_COLISEUM_PIT_RADIAL_CRACK_${index + 1}`;
      crack.position.set(Math.cos(angle) * 0.31, 0.676, Math.sin(angle) * 0.31);
      crack.rotation.y = -angle + Math.PI / 2;
      crack.userData.keepSeparate = true;
      root.add(crack);
    }
  }
  if (level >= 2) {
    const rimCount = amount(quality, 36, 28, 20);
    const rimBlocks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.075, 0.2), materials.limestone, rimCount);
    rimBlocks.name = 'ISLAND_17_COLISEUM_PIT_CHIPPED_OUTER_RIM_BLOCKS';
    const rimMatrix = new THREE.Matrix4();
    for (let index = 0; index < rimCount; index += 1) {
      const angle = index / rimCount * Math.PI * 2;
      const radius = 1.02 + (index % 4 === 0 ? 0.055 : 0);
      const position = new THREE.Vector3(Math.cos(angle) * radius, 0.55 + (index % 3) * 0.018, Math.sin(angle) * radius);
      const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler((index % 2) * 0.025, -angle + Math.PI / 2, (index % 5 - 2) * 0.04));
      const scale = new THREE.Vector3(0.78 + (index % 3) * 0.15, 1, 0.82 + (index % 2) * 0.1);
      rimMatrix.compose(position, quaternion, scale);
      rimBlocks.setMatrixAt(index, rimMatrix);
    }
    rimBlocks.instanceMatrix.needsUpdate = true;
    rimBlocks.userData.keepSeparate = true;
    root.add(rimBlocks);
    const terraceCount = amount(quality, 30, 22, 16);
    const terraceBlocks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.19, 0.052, 0.16), materials.agedBone, terraceCount);
    terraceBlocks.name = 'ISLAND_17_COLISEUM_PIT_STEPPED_TERRACE_BLOCKS';
    const terraceMatrix = new THREE.Matrix4();
    for (let index = 0; index < terraceCount; index += 1) {
      const angle = index / terraceCount * Math.PI * 2 + 0.035;
      const row = index % 3;
      const radius = 0.74 + row * 0.11;
      const position = new THREE.Vector3(Math.cos(angle) * radius, 0.64 + row * 0.062 + (index % 2) * 0.014, Math.sin(angle) * radius);
      const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -angle + Math.PI / 2, (index % 4 - 1.5) * 0.035));
      const scale = new THREE.Vector3(0.74 + row * 0.14, 1, 0.9);
      terraceMatrix.compose(position, quaternion, scale);
      terraceBlocks.setMatrixAt(index, terraceMatrix);
    }
    terraceBlocks.instanceMatrix.needsUpdate = true;
    terraceBlocks.userData.keepSeparate = true;
    root.add(terraceBlocks);
    const raisedRail = torus(0.94, 0.028, materials.agedBone, segments(quality) * 2);
    raisedRail.name = 'ISLAND_17_COLISEUM_PIT_RAISED_BONE_GUARD_RAIL';
    raisedRail.position.y = 0.84;
    root.add(raisedRail);
    const bronzeRail = torus(0.86, 0.016, materials.bronze, segments(quality) * 2);
    bronzeRail.name = 'ISLAND_17_COLISEUM_PIT_INNER_BRONZE_GUARD_RAIL';
    bronzeRail.position.y = 0.78;
    root.add(bronzeRail);
    for (let index = 0; index < 8; index += 1) {
      const angle = index / 8 * Math.PI * 2 + 0.04;
      const skullRailPost = createSkullHead(materials, quality, 0.09);
      skullRailPost.name = `ISLAND_17_COLISEUM_PIT_RAIL_SKULL_MARKER_${index + 1}`;
      skullRailPost.position.set(Math.cos(angle) * 0.94, 0.78, Math.sin(angle) * 0.94);
      skullRailPost.rotation.y = -angle + Math.PI;
      root.add(skullRailPost);
    }
    for (let index = 0; index < amount(quality, 10, 8, 6); index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const z = 0.98 - Math.floor(index / 2) * 0.18;
      const chain = tubeBetween(
        new THREE.Vector3(side * (0.94 + (index % 3) * 0.04), 0.34, z),
        new THREE.Vector3(side * (1.0 + (index % 3) * 0.05), -0.42 - (index % 2) * 0.14, z + 0.04),
        0.013,
        index % 3 === 0 ? materials.soulfireGlass : materials.iron,
        5,
      );
      chain.name = `ISLAND_17_COLISEUM_PIT_CLIFF_EDGE_CHAIN_FALL_${index + 1}`;
      chain.userData.keepSeparate = true;
      root.add(chain);
    }
  }
  const postCount = level === 1 ? 4 : level === 2 ? 6 : 8;
  for (let index = 0; index < postCount; index += 1) {
    const angle = index / postCount * Math.PI * 2;
    const post = cylinder(0.04, 0.06, level === 3 ? 0.88 : 0.58, materials.agedBone, 6);
    post.position.set(Math.cos(angle) * 0.82, 0.58, Math.sin(angle) * 0.82);
    root.add(post);
    if (index % 2 === 0) addSoulfire(root, new THREE.Vector3(Math.cos(angle) * 0.82, 1.02, Math.sin(angle) * 0.82), 0.055, materials);
    else {
      const torch = sphere(0.052, materials.torch, 6);
      torch.position.set(Math.cos(angle) * 0.82, 0.98, Math.sin(angle) * 0.82);
      torch.userData.keepSeparate = true;
      root.add(torch);
    }
  }
  if (level >= 3) addBoneArc(root, 0.92, materials, quality, Math.PI / 2);
  if (level >= 3) {
    for (let index = 0; index < 4; index += 1) {
      const angle = index / 4 * Math.PI * 2 + Math.PI / 4;
      const tower = cylinder(0.09, 0.12, 0.58, materials.darkStone, 8);
      tower.name = `ISLAND_17_COLISEUM_PIT_CARDINAL_TORCH_TOWER_${index + 1}`;
      tower.position.set(Math.cos(angle) * 0.92, 0.83, Math.sin(angle) * 0.92);
      const towerCap = cylinder(0.13, 0.14, 0.07, materials.bronze, 8);
      towerCap.name = `ISLAND_17_COLISEUM_PIT_TORCH_TOWER_CAP_${index + 1}`;
      towerCap.position.set(Math.cos(angle) * 0.92, 1.14, Math.sin(angle) * 0.92);
      const towerFlame = sphere(0.082, materials.torch, 8);
      towerFlame.name = `ISLAND_17_COLISEUM_PIT_TOWER_ORANGE_FLAME_${index + 1}`;
      towerFlame.position.set(Math.cos(angle) * 0.92, 1.23, Math.sin(angle) * 0.92);
      towerFlame.scale.set(0.82, 1.35, 0.82);
      towerFlame.userData.keepSeparate = true;
      root.add(tower, towerCap, towerFlame);
    }
    const brokenSeatGeometry = new THREE.BoxGeometry(0.2, 0.055, 0.15);
    const seats = new THREE.InstancedMesh(brokenSeatGeometry, materials.limestone, amount(quality, 42, 32, 22));
    seats.name = 'ISLAND_17_COLISEUM_PIT_BROKEN_SEAT_RING';
    const matrix = new THREE.Matrix4();
    for (let index = 0; index < seats.count; index += 1) {
      const angle = index / seats.count * Math.PI * 2;
      const row = index % 3;
      const position = new THREE.Vector3(Math.cos(angle) * (0.6 + row * 0.1), 0.62 + row * 0.065 + (index % 2) * 0.02, Math.sin(angle) * (0.6 + row * 0.1));
      const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -angle + Math.PI / 2, (index % 3 - 1) * 0.04));
      const scale = new THREE.Vector3(0.84 + (index % 3) * 0.12, 1, 1);
      matrix.compose(position, quaternion, scale);
      seats.setMatrixAt(index, matrix);
    }
    seats.instanceMatrix.needsUpdate = true;
    seats.userData.keepSeparate = true;
    root.add(seats);
    [-1, 1].forEach((side) => {
      const blade = box(0.065, 0.44, 0.03, materials.iron);
      blade.name = `ISLAND_17_COLISEUM_PIT_TRIAL_BLADE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      blade.position.set(side * 0.12, 0.8, 0.08);
      blade.rotation.set(0.08, side * 0.18, side * 0.78);
      const hilt = box(0.24, 0.045, 0.04, materials.bronze);
      hilt.name = `ISLAND_17_COLISEUM_PIT_TRIAL_HILT_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      hilt.position.set(side * 0.22, 0.63, 0.08);
      hilt.rotation.z = side * 0.78;
      root.add(blade, hilt);
    });
    const torchCount = amount(quality, 20, 14, 10);
    const torchPosts = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 0.82, 1, 6), materials.agedBone, torchCount);
    torchPosts.name = 'ISLAND_17_COLISEUM_PIT_TALL_TORCH_POST_RING';
    const torchFlames = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.08, 0), materials.torch, torchCount);
    torchFlames.name = 'ISLAND_17_COLISEUM_PIT_WARM_FLAME_RING';
    const torchMatrix = new THREE.Matrix4();
    const torchPosition = new THREE.Vector3();
    const torchQuaternion = new THREE.Quaternion();
    const torchScale = new THREE.Vector3();
    for (let index = 0; index < torchCount; index += 1) {
      const angle = index / torchCount * Math.PI * 2 + 0.1;
      const radius = 1.06 + (index % 2) * 0.1;
      torchPosition.set(Math.cos(angle) * radius, 0.82 + (index % 3) * 0.035, Math.sin(angle) * radius);
      torchQuaternion.setFromEuler(new THREE.Euler(0, -angle + Math.PI / 2, (index % 4 - 1.5) * 0.04));
      torchScale.set(0.04, 0.82 + (index % 4) * 0.12, 0.04);
      torchMatrix.compose(torchPosition, torchQuaternion, torchScale);
      torchPosts.setMatrixAt(index, torchMatrix);
      torchPosition.y += 0.48 + (index % 4) * 0.06;
      torchScale.setScalar(1.0 + (index % 2) * 0.18);
      torchMatrix.compose(torchPosition, torchQuaternion, torchScale);
      torchFlames.setMatrixAt(index, torchMatrix);
    }
    torchPosts.instanceMatrix.needsUpdate = true;
    torchFlames.instanceMatrix.needsUpdate = true;
    torchPosts.userData.keepSeparate = true;
    torchFlames.userData.keepSeparate = true;
    root.add(torchPosts, torchFlames);
    [-1, 1].forEach((side) => {
      const ribSpan = curveTube([
        new THREE.Vector3(side * 0.68, 0.62, -0.22),
        new THREE.Vector3(side * 1.02, 1.08, 0.08),
        new THREE.Vector3(side * 1.16, 0.56, 0.58),
      ], 0.05, materials.bone, quality, 18);
      ribSpan.name = `ISLAND_17_COLISEUM_PIT_SIDE_RIB_ARCH_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      const skullPost = createSkullHead(materials, quality, 0.22);
      skullPost.name = `ISLAND_17_COLISEUM_PIT_SKULL_GATE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      skullPost.position.set(side * 0.88, 0.28, 0.68);
      skullPost.rotation.y = side * 0.3;
      root.add(ribSpan, skullPost);
    });

    const fallback = new THREE.Group();
    fallback.name = 'ISLAND_17_COLISEUM_PIT_PROCEDURAL_FALLBACK';
    [...root.children].forEach((child) => fallback.add(child));
    compactIsland17StaticGeometry(fallback, 'ISLAND_17_COLISEUM_PIT_FALLBACK_STATIC', false);
    root.add(fallback);
    if (canLoadIsland17RuntimeAssets()) {
      root.userData.coliseumPitAssetState = 'loading';
      new GLTFLoader().load(
        ISLAND_17_COLISEUM_PIT_URL,
        ({ scene }) => {
          scene.name = 'ISLAND_17_COLISEUM_PIT_BLENDER_V002';
          scene.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            object.castShadow = true;
            object.receiveShadow = false;
            object.frustumCulled = true;
          });
          fallback.visible = false;
          fallback.clear();
          root.remove(fallback);
          root.add(scene);
          root.userData.coliseumPitAssetState = 'ready';
          const bounds = new THREE.Box3().setFromObject(scene);
          window.dispatchEvent(new CustomEvent('island17:coliseum-pit-ready', {
            detail: {
              asset: scene.name,
              meshCount: scene.getObjectsByProperty('type', 'Mesh').length,
              bounds: {
                min: bounds.min.toArray(),
                max: bounds.max.toArray(),
              },
            },
          }));
        },
        undefined,
        (error) => {
          root.userData.coliseumPitAssetState = 'failed';
          root.userData.coliseumPitAssetError = error instanceof Error ? error.message : String(error);
          window.dispatchEvent(new CustomEvent('island17:coliseum-pit-error', {
            detail: {
              asset: ISLAND_17_COLISEUM_PIT_URL,
              message: root.userData.coliseumPitAssetError,
            },
          }));
        },
      );
    }
  }
  return root;
}

export function createIsland17ColiseumPitRuntimeStage(
  materials: Island17TitansRestMaterials,
  quality: Island3DQuality = 'high',
) {
  return createColiseumPit(3, quality, materials);
}

function createOraclesCranium(level: BuildLevel, quality: Island3DQuality, materials: Island17TitansRestMaterials) {
  const root = new THREE.Group();
  addPlatform(root, 0.78, materials, quality);
  if (level === 0) return root;
  const skull = createSkullHead(materials, quality, level === 1 ? 0.5 : level === 2 ? 0.72 : 1);
  skull.name = 'ISLAND_17_ORACLES_CRANIUM_SKULL_ARCHIVE';
  skull.position.y = -0.02;
  skull.rotation.y = Math.PI;
  skull.scale.set(0.58, 0.58, 0.52);
  skull.traverse((child) => {
    if (child.name === 'ISLAND_17_SKULL_ENGRAVED_CROWN_RUNE' || child.name.startsWith('ISLAND_17_SKULL_CROWN_RUNE_SPOKE_')) {
      child.visible = false;
    }
  });
  const pedestal = cylinder(0.46, 0.58, 0.28, materials.darkStone, segments(quality) * 2);
  pedestal.name = 'ISLAND_17_ORACLE_CRANIUM_STEPPED_DARK_PEDESTAL';
  pedestal.position.y = 0.42;
  const stair = box(0.42, 0.08, 0.62, materials.limestone);
  stair.name = 'ISLAND_17_ORACLE_CRANIUM_FRONT_STAIR_BLOCK';
  stair.position.set(0, 0.48, 0.52);
  root.add(pedestal, stair, skull);
  if (level >= 2) {
    const tabletCount = amount(quality, 11, 8, 5);
    for (let index = 0; index < tabletCount; index += 1) {
      const angle = index / tabletCount * Math.PI * 2 + 0.08;
      const tablet = box(0.16 + (index % 3) * 0.025, 0.36 + (index % 2) * 0.1, 0.055, index % 2 ? materials.limestone : materials.bronze);
      tablet.name = `ISLAND_17_ORACLE_RUNE_TABLET_${index + 1}`;
      tablet.position.set(Math.cos(angle) * 0.82, 0.6 + (index % 3) * 0.09, Math.sin(angle) * 0.82);
      tablet.rotation.y = -angle + Math.PI / 2;
      root.add(tablet);
    }
  }
  if (level >= 3) {
    root.traverse((child) => {
      if (
        child.name === 'ISLAND_17_ORACLE_CRANIUM_FRONT_STAIR_BLOCK'
        || child.name.startsWith('ISLAND_17_ORACLE_RUNE_TABLET_')
      ) {
        child.visible = false;
      }
    });
    const crown = torus(0.28, 0.012, materials.soulfireGlass, segments(quality) * 2);
    crown.name = 'ISLAND_17_ORACLE_SOULFIRE_CROWN';
    crown.position.set(0, 1.12, -0.08);
    crown.scale.set(0.86, 0.72, 0.86);
    root.add(crown);
    const crownCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), materials.soulfireGlass);
    crownCrystal.name = 'ISLAND_17_ORACLE_FOREHEAD_CROWN_CRYSTAL';
    crownCrystal.position.set(0, 1.12, 0.86);
    crownCrystal.scale.set(0.62, 0.96, 0.58);
    crownCrystal.userData.keepSeparate = true;
    root.add(crownCrystal);
    [-1, 1].forEach((side) => {
      const domeEye = cylinder(0.12, 0.13, 0.014, materials.soulfireGlass, 12);
      domeEye.name = `ISLAND_17_ORACLE_DOME_ENGRAVED_TEAL_EYE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      domeEye.position.set(side * 0.16, 1.23, 0.22);
      domeEye.scale.set(0.72, 1, 0.42);
      domeEye.userData.keepSeparate = true;
      const domeEyeRim = torus(0.13, 0.012, materials.agedBone, 18);
      domeEyeRim.name = `ISLAND_17_ORACLE_DOME_EYE_BONE_RIM_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      domeEyeRim.position.set(side * 0.16, 1.246, 0.22);
      domeEyeRim.rotation.x = Math.PI / 2;
      domeEyeRim.scale.set(0.72, 0.42, 1);
      root.add(domeEye, domeEyeRim);
    });
    const domeNose = box(0.09, 0.014, 0.18, materials.shadow);
    domeNose.name = 'ISLAND_17_ORACLE_DOME_ENGRAVED_NOSE_VOID';
    domeNose.position.set(0, 1.25, 0.32);
    domeNose.rotation.y = Math.PI / 4;
    domeNose.userData.keepSeparate = true;
    const domeMouth = box(0.38, 0.014, 0.075, materials.soulfireGlass);
    domeMouth.name = 'ISLAND_17_ORACLE_DOME_ENGRAVED_MOUTH_GLOW';
    domeMouth.position.set(0, 1.255, 0.4);
    domeMouth.userData.keepSeparate = true;
    root.add(domeNose, domeMouth);
    for (let index = 0; index < amount(quality, 5, 4, 3); index += 1) {
      const rune = box(0.018, 0.18, 0.012, materials.soulfire);
      rune.name = `ISLAND_17_ORACLE_FACE_FLOATING_RUNE_${index + 1}`;
      rune.position.set((index - 2) * 0.09, 1.0 + (index % 2) * 0.12, 0.42);
      rune.rotation.z = (index % 3 - 1) * 0.28;
      root.add(rune);
    }
    [-1, 1].forEach((side) => {
      const eyeSocket = sphere(0.12, materials.shadow, 8);
      eyeSocket.name = `ISLAND_17_ORACLE_CAMERA_SIDE_EYE_SOCKET_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      eyeSocket.position.set(side * 0.2, 0.88, -0.58);
      eyeSocket.scale.set(1.05, 0.78, 0.38);
      eyeSocket.userData.keepSeparate = true;
      const eyeGlow = sphere(0.06, materials.soulfire, 6);
      eyeGlow.name = `ISLAND_17_ORACLE_CAMERA_SIDE_TEAL_EYE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      eyeGlow.position.set(side * 0.2, 0.88, -0.62);
      eyeGlow.userData.keepSeparate = true;
      root.add(eyeSocket, eyeGlow);
    });
    const foreheadRune = box(0.12, 0.2, 0.035, materials.soulfireGlass);
    foreheadRune.name = 'ISLAND_17_ORACLE_CAMERA_SIDE_FOREHEAD_RUNE';
    foreheadRune.position.set(0, 1.12, -0.64);
    foreheadRune.rotation.z = Math.PI / 4;
    foreheadRune.userData.keepSeparate = true;
    const mouthVoid = box(0.22, 0.22, 0.038, materials.shadow);
    mouthVoid.name = 'ISLAND_17_ORACLE_CAMERA_SIDE_MOUTH_VOID';
    mouthVoid.position.set(0, 0.64, -0.62);
    mouthVoid.userData.keepSeparate = true;
    root.add(foreheadRune, mouthVoid);
    const rearCollar = torus(0.34, 0.012, materials.soulfireGlass, segments(quality) * 2);
    rearCollar.name = 'ISLAND_17_ORACLE_360_REAR_CRANIUM_COLLAR';
    rearCollar.position.set(0, 1.1, -0.44);
    rearCollar.scale.set(0.9, 0.58, 0.9);
    root.add(rearCollar);
    const rearFacePlate = sphere(0.24, materials.crackedBone, 12);
    rearFacePlate.name = 'ISLAND_17_ORACLE_360_REAR_RAISED_SKULL_FACE_PLATE';
    rearFacePlate.position.set(0, 0.82, -0.74);
    rearFacePlate.scale.set(1.7, 1.08, 0.22);
    root.add(rearFacePlate);
    [-1, 1].forEach((side) => {
      const rearSocket = sphere(0.105, materials.shadow, 8);
      rearSocket.name = `ISLAND_17_ORACLE_360_REAR_SOCKET_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      rearSocket.position.set(side * 0.17, 0.84, -0.7);
      rearSocket.scale.set(1.05, 0.72, 0.32);
      rearSocket.userData.keepSeparate = true;
      const rearGlow = sphere(0.052, materials.soulfire, 6);
      rearGlow.name = `ISLAND_17_ORACLE_360_REAR_EYE_GLOW_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      rearGlow.position.set(side * 0.17, 0.84, -0.74);
      rearGlow.userData.keepSeparate = true;
      const rearBrow = box(0.22, 0.03, 0.045, materials.agedBone);
      rearBrow.name = `ISLAND_17_ORACLE_360_REAR_HEAVY_BROW_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      rearBrow.position.set(side * 0.17, 0.94, -0.78);
      rearBrow.rotation.z = side * 0.12;
      const sideRune = box(0.028, 0.2, 0.024, materials.soulfireGlass);
      sideRune.name = `ISLAND_17_ORACLE_360_SIDE_RUNE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      sideRune.position.set(side * 0.46, 1.02, -0.08);
      sideRune.rotation.set(0.18, side * 0.5, side * 0.24);
      sideRune.userData.keepSeparate = true;
      const sideCheekRune = box(0.026, 0.13, 0.026, materials.soulfire);
      sideCheekRune.name = `ISLAND_17_ORACLE_360_SIDE_CHEEK_RUNE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      sideCheekRune.position.set(side * 0.5, 0.72, 0.12);
      sideCheekRune.rotation.set(0.08, side * 0.62, side * -0.4);
      sideCheekRune.userData.keepSeparate = true;
      root.add(rearSocket, rearGlow, rearBrow, sideRune, sideCheekRune);
    });
    const rearNoseVoid = box(0.08, 0.13, 0.04, materials.shadow);
    rearNoseVoid.name = 'ISLAND_17_ORACLE_360_REAR_TRIANGLE_NOSE_VOID';
    rearNoseVoid.position.set(0, 0.75, -0.79);
    rearNoseVoid.rotation.z = Math.PI / 4;
    rearNoseVoid.userData.keepSeparate = true;
    const rearMouth = box(0.28, 0.044, 0.048, materials.shadow);
    rearMouth.name = 'ISLAND_17_ORACLE_360_REAR_TOOTHED_MOUTH_VOID';
    rearMouth.position.set(0, 0.62, -0.79);
    rearMouth.userData.keepSeparate = true;
    root.add(rearNoseVoid, rearMouth);
    for (let index = 0; index < amount(quality, 6, 5, 4); index += 1) {
      const centered = index - 2.5;
      const rearTooth = box(0.026, 0.066, 0.034, materials.bone);
      rearTooth.name = `ISLAND_17_ORACLE_360_REAR_ARCHIVE_TOOTH_${index + 1}`;
      rearTooth.position.set(centered * 0.042, 0.59, -0.82);
      rearTooth.rotation.z = centered * 0.02;
      rearTooth.userData.keepSeparate = true;
      root.add(rearTooth);
    }
    for (let index = 0; index < amount(quality, 5, 4, 3); index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const rearCrack = curveTube([
        new THREE.Vector3(side * (0.08 + index * 0.045), 1.18 - (index % 2) * 0.04, -0.48),
        new THREE.Vector3(side * (0.14 + index * 0.038), 1.02 - (index % 3) * 0.055, -0.62),
        new THREE.Vector3(side * (0.2 + index * 0.03), 0.86 - (index % 2) * 0.05, -0.7),
      ], 0.006, index % 2 ? materials.shadow : materials.moss, quality, 10);
      rearCrack.name = `ISLAND_17_ORACLE_360_REAR_CRACK_${index + 1}`;
      rearCrack.userData.keepSeparate = true;
      root.add(rearCrack);
    }
    const frontFacePlate = sphere(0.44, materials.crackedBone, 14);
    frontFacePlate.name = 'ISLAND_17_ORACLE_CAMERA_READABLE_SKULL_FACE_PLATE';
    frontFacePlate.position.set(0, 0.73, 0.98);
    frontFacePlate.scale.set(1.24, 1.08, 0.14);
    frontFacePlate.rotation.x = -0.16;
    root.add(frontFacePlate);
    const frontForeheadRune = box(0.13, 0.22, 0.035, materials.soulfireGlass);
    frontForeheadRune.name = 'ISLAND_17_ORACLE_CAMERA_FACING_FOREHEAD_RUNE';
    frontForeheadRune.position.set(0, 1.02, 1.09);
    frontForeheadRune.rotation.z = Math.PI / 4;
    frontForeheadRune.userData.keepSeparate = true;
    const frontBrow = box(0.66, 0.08, 0.055, materials.agedBone);
    frontBrow.name = 'ISLAND_17_ORACLE_CAMERA_FACING_HEAVY_BROW';
    frontBrow.position.set(0, 0.89, 1.12);
    frontBrow.rotation.x = -0.16;
    root.add(frontForeheadRune, frontBrow);
    [-1, 1].forEach((side) => {
      const socket = sphere(0.17, materials.shadow, 10);
      socket.name = `ISLAND_17_ORACLE_CAMERA_FACING_DEEP_EYE_SOCKET_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      socket.position.set(side * 0.24, 0.76, 1.15);
      socket.scale.set(1.22, 0.72, 0.2);
      socket.rotation.x = -0.16;
      socket.userData.keepSeparate = true;
      const glow = sphere(0.072, materials.soulfire, 8);
      glow.name = `ISLAND_17_ORACLE_CAMERA_FACING_TEAL_EYE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      glow.position.set(side * 0.24, 0.76, 1.2);
      glow.scale.set(1.12, 0.78, 0.5);
      glow.userData.keepSeparate = true;
      const cheek = box(0.2, 0.07, 0.04, materials.agedBone);
      cheek.name = `ISLAND_17_ORACLE_CAMERA_FACING_CHEEKBONE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      cheek.position.set(side * 0.28, 0.62, 1.13);
      cheek.rotation.set(-0.14, side * 0.18, side * 0.3);
      root.add(socket, glow);
      root.add(cheek);
    });
    const frontNose = box(0.11, 0.2, 0.05, materials.shadow);
    frontNose.name = 'ISLAND_17_ORACLE_CAMERA_FACING_NOSE_VOID';
    frontNose.position.set(0, 0.62, 1.2);
    frontNose.rotation.set(-0.16, 0, Math.PI / 4);
    frontNose.userData.keepSeparate = true;
    const frontMouth = box(0.42, 0.17, 0.048, materials.shadow);
    frontMouth.name = 'ISLAND_17_ORACLE_CAMERA_FACING_JAW_VOID';
    frontMouth.position.set(0, 0.49, 1.18);
    frontMouth.rotation.x = -0.16;
    frontMouth.userData.keepSeparate = true;
    root.add(frontNose, frontMouth);
    const jawBridge = box(0.56, 0.065, 0.045, materials.agedBone);
    jawBridge.name = 'ISLAND_17_ORACLE_CAMERA_FACING_LOWER_JAW_BRIDGE';
    jawBridge.position.set(0, 0.39, 1.15);
    jawBridge.rotation.x = -0.16;
    root.add(jawBridge);
    for (let index = 0; index < 9; index += 1) {
      const centered = index - 4;
      const tooth = box(0.034, 0.16 - Math.abs(centered) * 0.01, 0.034, materials.bone);
      tooth.name = `ISLAND_17_ORACLE_CAMERA_FACING_JAW_TOOTH_${index + 1}`;
      tooth.position.set(centered * 0.046, 0.41, 1.21);
      tooth.rotation.set(-0.18, 0, centered * 0.025);
      tooth.userData.keepSeparate = true;
      root.add(tooth);
    }
    for (let index = 0; index < amount(quality, 9, 7, 5); index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const crack = box(0.012, 0.18 + (index % 4) * 0.055, 0.018, index % 3 === 0 ? materials.shadow : materials.bronze);
      crack.name = `ISLAND_17_ORACLE_CAMERA_FACING_VISIBLE_CRACK_${index + 1}`;
      crack.position.set(side * (0.08 + (index % 5) * 0.08), 1.0 - (index % 6) * 0.09, 1.17);
      crack.rotation.set(-0.14, 0, side * (0.2 + index * 0.045));
      crack.userData.keepSeparate = true;
      root.add(crack);
    }
    const jawArchive = torus(0.34, 0.018, materials.bronze, segments(quality));
    jawArchive.name = 'ISLAND_17_ORACLE_JAW_ARCHIVE_RING';
    jawArchive.position.set(0, 0.36, 0.5);
    jawArchive.scale.set(0.62, 0.5, 0.14);
    root.add(jawArchive);

    const fallback = new THREE.Group();
    fallback.name = 'ISLAND_17_ORACLES_CRANIUM_PROCEDURAL_FALLBACK';
    [...root.children].forEach((child) => fallback.add(child));
    compactIsland17StaticGeometry(fallback, 'ISLAND_17_ORACLES_CRANIUM_FALLBACK_STATIC', false);
    root.add(fallback);
    if (canLoadIsland17RuntimeAssets()) {
      root.userData.oraclesCraniumAssetState = 'loading';
      new GLTFLoader().load(
        ISLAND_17_ORACLES_CRANIUM_URL,
        ({ scene }) => {
          scene.name = 'ISLAND_17_ORACLES_CRANIUM_BLENDER_V005';
          scene.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            object.castShadow = true;
            object.receiveShadow = false;
            object.frustumCulled = true;
          });
          fallback.visible = false;
          fallback.clear();
          root.remove(fallback);
          root.add(scene);
          root.userData.oraclesCraniumAssetState = 'ready';
          const bounds = new THREE.Box3().setFromObject(scene);
          window.dispatchEvent(new CustomEvent('island17:oracles-cranium-ready', {
            detail: {
              asset: scene.name,
              meshCount: scene.getObjectsByProperty('type', 'Mesh').length,
              bounds: {
                min: bounds.min.toArray(),
                max: bounds.max.toArray(),
              },
            },
          }));
        },
        undefined,
        (error) => {
          root.userData.oraclesCraniumAssetState = 'failed';
          root.userData.oraclesCraniumAssetError = error instanceof Error ? error.message : String(error);
          window.dispatchEvent(new CustomEvent('island17:oracles-cranium-error', {
            detail: {
              asset: ISLAND_17_ORACLES_CRANIUM_URL,
              message: root.userData.oraclesCraniumAssetError,
            },
          }));
        },
      );
    }
  }
  return root;
}

export function createIsland17OraclesCraniumRuntimeStage(
  materials: Island17TitansRestMaterials,
  quality: Island3DQuality = 'high',
) {
  return createOraclesCranium(3, quality, materials);
}

export function buildIsland17TitansRestLandmark(
  definition: Island5LandmarkDefinition,
  level: BuildLevel,
  quality: Island3DQuality,
  materials: Island17TitansRestMaterials,
  options: IslandConstructionFactoryOptions = {},
) {
  const root = new THREE.Group();
  root.name = `ISLAND_17_TITANS_REST_${definition.id.toUpperCase()}_ROOT`;
  root.position.set(...definition.position);
  const focusSocket = new THREE.Object3D();
  focusSocket.name = `ISLAND_17_${definition.id.toUpperCase()}_FOCUS_SOCKET`;
  focusSocket.position.y = definition.id === 'boss' ? 1.75 : 1.25;
  root.add(focusSocket);
  const partId: Island17RuntimePartId = definition.id === 'boss'
    ? 'titan-skull-boss'
    : definition.id === 'hatchery'
      ? 'bone-hollow-hatchery'
      : definition.id === 'habit'
        ? 'strength-altar'
        : definition.id === 'wisdom'
          ? 'oracles-cranium'
          : 'coliseum-pit';
  const runtimeParts = [registerIsland17RuntimePart(partId, root, 'landmark')];
  root.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    world: 'island-017-titans-rest',
    parts: runtimeParts,
    sockets: { focus: focusSocket.name },
    colliders: [{ id: `${definition.id}-focus-trigger`, type: 'cylinder', isTrigger: true, radius: definition.id === 'boss' ? 2.3 : 1.1 }],
    destructionGroups: [{ id: `${definition.id}-architecture`, breakable: false, partIds: [partId] }],
    attachment: { parentId: 'landmark-network', parentSocket: `${definition.id}-bone-platform`, localStart: [0, 0, 0], localEnd: [0, 0.12, 0], contactType: 'embedded', embedDepth: 0.1, gapTolerance: 0.01 },
  };
  const architecture = definition.id === 'boss'
    ? createTitanSkull(level, quality, materials)
    : definition.id === 'hatchery'
      ? createBoneHollow(level, quality, materials)
      : definition.id === 'habit'
        ? createStrengthAltar(level, quality, materials)
        : definition.id === 'wisdom'
          ? createOraclesCranium(level, quality, materials)
          : createColiseumPit(level, quality, materials);
  if (definition.id !== 'boss') {
    architecture.rotation.y = THREE.MathUtils.clamp(-definition.position[0] * 0.04, -0.18, 0.18);
    const footprintScale = options.constructionPreview ? 1.28 : level === 3 ? 1.44 : level === 2 ? 1.26 : 1.08;
    const verticalScale = options.constructionPreview ? 1.42 : level === 3 ? 1.62 : level === 2 ? 1.35 : 1.12;
    architecture.scale.set(footprintScale, verticalScale, footprintScale);
  } else {
    architecture.position.set(0, -0.08, 0.38);
    architecture.scale.setScalar(options.constructionPreview ? 1 : level === 0 ? 0.72 : 0.64);
  }
  if (options.constructionPreview === 'target') {
    applyIslandConstructionAuthoring({
      root: architecture,
      worldSourceNumber: 17,
      landmarkId: definition.id,
      quality,
      includeTemporaryRig: true,
    });
  }
  root.add(architecture);
  const paintedBillboard = level >= 3 ? maybeCreatePaintedLandmarkBillboard(definition.id) : null;
  if (paintedBillboard) root.add(paintedBillboard);
  root.traverse((child) => { child.userData.landmarkId = definition.id; });
  if (!options.constructionPreview && definition.id !== 'boss' && level < 3) {
    compactIsland17StaticGeometry(architecture, `ISLAND_17_${definition.id.toUpperCase()}_STATIC`);
  }
  markShadows(root, quality === 'high');
  return root;
}

function markShadows(root: THREE.Object3D, enabled: boolean) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = enabled;
    child.receiveShadow = true;
  });
}

function createFloatingCliff(materials: Island17TitansRestMaterials, quality: Island3DQuality, runtimeParts: Island17RuntimePart[]) {
  const root = new THREE.Group();
  root.name = 'ISLAND_17_FLOATING_CLIFF';
  const piercedShelf = (topRadius: number, bottomRadius: number, depth: number, flatten: number, material: THREE.Material) => {
    const shape = new THREE.Shape();
    shape.absellipse(0, 0, topRadius, topRadius * flatten, 0, Math.PI * 2, false, 0);
    const aperture = new THREE.Path();
    aperture.absarc(0, 0, 1.72, 0, Math.PI * 2, true);
    shape.holes.push(aperture);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth, bevelEnabled: false, steps: 1, curveSegments: segments(quality),
    });
    const positions = geometry.getAttribute('position');
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const y = positions.getY(index);
      if (Math.hypot(x, y) < 1.73) continue;
      const taper = 1 + (bottomRadius / topRadius - 1) * positions.getZ(index) / depth;
      positions.setXY(index, x * taper, y * taper);
    }
    geometry.rotateX(Math.PI / 2);
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, material);
  };
  const shelf = piercedShelf(4.92, 5.7, 0.92, 0.88, materials.darkStone);
  shelf.position.y = -0.22;
  const topMoss = piercedShelf(4.46, 4.72, 0.12, 0.82, materials.moss);
  topMoss.position.y = -0.03;
  const innerRuinStone = piercedShelf(2.7, 3.02, 0.07, 0.75, materials.darkStone);
  innerRuinStone.position.y = 0.02;
  const under = new THREE.Mesh(new THREE.ConeGeometry(4.25, 4.35, segments(quality) * 3, 1, true), materials.darkStone);
  under.position.y = -3.315;
  under.rotation.set(0, Math.PI / 9, Math.PI);
  under.scale.z = 0.72;
  root.add(shelf, topMoss, innerRuinStone, under);
  const cragCount = amount(quality, 72, 58, 44);
  const cliffCrags = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 0),
    materials.darkStone,
    cragCount,
  );
  cliffCrags.name = 'ISLAND_17_LAYERED_BASALT_CLIFF_FACE_CRAGS';
  const cragMatrix = new THREE.Matrix4();
  const cragPosition = new THREE.Vector3();
  const cragQuaternion = new THREE.Quaternion();
  const cragScale = new THREE.Vector3();
  for (let index = 0; index < cragCount; index += 1) {
    const layer = index % 5;
    const angle = index * 2.399963229728653 + layer * 0.17;
    const radius = 4.58 - layer * 0.19 + (index % 4) * 0.055;
    cragPosition.set(
      Math.cos(angle) * radius,
      -0.48 - layer * 0.43 - (index % 3) * 0.075,
      Math.sin(angle) * radius * 0.88,
    );
    cragQuaternion.setFromEuler(new THREE.Euler(
      (index % 5 - 2) * 0.12,
      -angle + (index % 4) * 0.1,
      (index % 7 - 3) * 0.075,
    ));
    cragScale.set(
      0.34 + (index % 6) * 0.055,
      0.33 + layer * 0.055 + (index % 4) * 0.045,
      0.26 + (index % 5) * 0.045,
    );
    cragMatrix.compose(cragPosition, cragQuaternion, cragScale);
    cliffCrags.setMatrixAt(index, cragMatrix);
  }
  cliffCrags.instanceMatrix.needsUpdate = true;
  cliffCrags.castShadow = quality === 'high';
  cliffCrags.receiveShadow = true;
  cliffCrags.userData.keepSeparate = true;
  root.add(cliffCrags);
  const mossShelfCount = amount(quality, 34, 24, 16);
  const mossShelves = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(1, 0),
    materials.moss,
    mossShelfCount,
  );
  mossShelves.name = 'ISLAND_17_CLIFF_FACE_MOSSY_BROKEN_SHELVES';
  for (let index = 0; index < mossShelfCount; index += 1) {
    const angle = index / mossShelfCount * Math.PI * 2 + 0.12;
    const radius = 4.64 + (index % 3) * 0.09;
    cragPosition.set(
      Math.cos(angle) * radius,
      -0.3 - (index % 4) * 0.43,
      Math.sin(angle) * radius * 0.88,
    );
    cragQuaternion.setFromEuler(new THREE.Euler(0, -angle, (index % 5 - 2) * 0.06));
    cragScale.set(0.32 + (index % 4) * 0.055, 0.045, 0.18 + (index % 3) * 0.045);
    cragMatrix.compose(cragPosition, cragQuaternion, cragScale);
    mossShelves.setMatrixAt(index, cragMatrix);
  }
  mossShelves.instanceMatrix.needsUpdate = true;
  mossShelves.userData.keepSeparate = true;
  root.add(mossShelves);
  const cliffShardGeometry = new THREE.ConeGeometry(0.18, 1.05, 5);
  addInstancedColumnRing({
    root,
    name: 'ISLAND_17_DARK_CLIFF_TOOTH_RING',
    count: amount(quality, 36, 28, 20),
    radius: 5.08,
    radiusJitter: 0.1,
    y: -1.42,
    height: 1.2,
    spread: 0.16,
    material: materials.darkStone,
    geometry: cliffShardGeometry,
    angleOffset: 0.04,
  });
  const boneSpireGeometry = new THREE.ConeGeometry(0.045, 0.76, 5);
  addInstancedColumnRing({
    root,
    name: 'ISLAND_17_OUTER_BONE_SPIRE_CROWN',
    count: amount(quality, 44, 34, 24),
    radius: 4.42,
    radiusJitter: 0.08,
    y: 0.18,
    height: 0.92,
    spread: 0.1,
    material: materials.agedBone,
    geometry: boneSpireGeometry,
    angleOffset: 0.17,
  });
  const brokenSlabGeometry = new THREE.BoxGeometry(0.42, 0.035, 0.22);
  const brokenSlabs = new THREE.InstancedMesh(brokenSlabGeometry, materials.darkStone, amount(quality, 26, 20, 14));
  brokenSlabs.name = 'ISLAND_17_BROKEN_DARK_STONE_PATCHES';
  const slabMatrix = new THREE.Matrix4();
  for (let index = 0; index < brokenSlabs.count; index += 1) {
    const angle = index / brokenSlabs.count * Math.PI * 2 + 0.09;
    const radius = index % 2 === 0 ? 3.15 : 4.05;
    const position = new THREE.Vector3(Math.cos(angle) * radius, 0.005, Math.sin(angle) * radius);
    const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -angle + (index % 4) * 0.2, 0));
    const scale = new THREE.Vector3(0.72 + (index % 3) * 0.18, 1, 0.8 + (index % 2) * 0.25);
    slabMatrix.compose(position, quaternion, scale);
    brokenSlabs.setMatrixAt(index, slabMatrix);
  }
  brokenSlabs.instanceMatrix.needsUpdate = true;
  root.add(brokenSlabs);
  const parapetGeometry = new THREE.BoxGeometry(0.22, 0.08, 0.07);
  const parapets = new THREE.InstancedMesh(parapetGeometry, materials.agedBone, amount(quality, 72, 54, 36));
  parapets.name = 'ISLAND_17_OUTER_NECROPOLIS_PARAPET_RING';
  const parapetMatrix = new THREE.Matrix4();
  for (let index = 0; index < parapets.count; index += 1) {
    const angle = index / parapets.count * Math.PI * 2 + 0.03;
    const radius = 4.66 + (index % 4) * 0.22;
    const position = new THREE.Vector3(Math.cos(angle) * radius, 0.16 + (index % 3) * 0.035, Math.sin(angle) * radius);
    const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -angle + Math.PI / 2, (index % 5 - 2) * 0.035));
    const scale = new THREE.Vector3(0.72 + (index % 4) * 0.16, 0.8 + (index % 3) * 0.14, 1);
    parapetMatrix.compose(position, quaternion, scale);
    parapets.setMatrixAt(index, parapetMatrix);
  }
  parapets.instanceMatrix.needsUpdate = true;
  parapets.userData.keepSeparate = true;
  root.add(parapets);
  const glyphGeometry = new THREE.OctahedronGeometry(0.045, 0);
  const glyphs = new THREE.InstancedMesh(glyphGeometry, materials.soulfireGlass, amount(quality, 22, 16, 10));
  glyphs.name = 'ISLAND_17_OUTER_NECROPOLIS_SOUL_GLYPHS';
  const glyphMatrix = new THREE.Matrix4();
  for (let index = 0; index < glyphs.count; index += 1) {
    const angle = index / glyphs.count * Math.PI * 2 + 0.18;
    const radius = 4.94 + (index % 3) * 0.18;
    const position = new THREE.Vector3(Math.cos(angle) * radius, 0.42 + (index % 4) * 0.06, Math.sin(angle) * radius);
    const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, angle, Math.PI / 4));
    const scale = new THREE.Vector3(1, 1.35 + (index % 2) * 0.4, 1);
    glyphMatrix.compose(position, quaternion, scale);
    glyphs.setMatrixAt(index, glyphMatrix);
  }
  glyphs.instanceMatrix.needsUpdate = true;
  glyphs.userData.keepSeparate = true;
  root.add(glyphs);
  const markerCount = amount(quality, 24, 16, 10);
  const markerMatrix = new THREE.Matrix4();
  const markerPosition = new THREE.Vector3();
  const markerQuaternion = new THREE.Quaternion();
  const markerScale = new THREE.Vector3();
  const markerStems = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 0.82, 1, 5), materials.agedBone, markerCount);
  markerStems.name = 'ISLAND_17_NECROPOLIS_GRAVE_MARKER_STEMS';
  const markerCrossbars = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), materials.bronze, Math.floor(markerCount * 0.42));
  markerCrossbars.name = 'ISLAND_17_NECROPOLIS_GRAVE_MARKER_CROSSBARS';
  let crossbarIndex = 0;
  for (let index = 0; index < markerCount; index += 1) {
    const angle = index / markerCount * Math.PI * 2 + 0.08;
    const radius = 4.24 + (index % 6) * 0.24;
    if (!isIsland17RouteCorridorClear(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.08)) continue;
    markerPosition.set(Math.cos(angle) * radius, 0.24 + (index % 4) * 0.035, Math.sin(angle) * radius);
    markerQuaternion.setFromEuler(new THREE.Euler((index % 3 - 1) * 0.06, 0, (index % 5 - 2) * 0.08));
    markerScale.set(0.055 + (index % 3) * 0.01, 0.38 + (index % 5) * 0.08, 0.05);
    markerMatrix.compose(markerPosition, markerQuaternion, markerScale);
    markerStems.setMatrixAt(index, markerMatrix);
    if (index % 3 === 0 && crossbarIndex < markerCrossbars.count) {
      markerPosition.y += 0.16 + (index % 4) * 0.025;
      markerQuaternion.setFromEuler(new THREE.Euler(0, -angle + Math.PI / 2, (index % 5 - 2) * 0.06));
      markerScale.set(0.28 + (index % 3) * 0.05, 0.036, 0.034);
      markerMatrix.compose(markerPosition, markerQuaternion, markerScale);
      markerCrossbars.setMatrixAt(crossbarIndex, markerMatrix);
      crossbarIndex += 1;
    }
  }
  while (crossbarIndex < markerCrossbars.count) {
    markerMatrix.compose(new THREE.Vector3(0, -100, 0), new THREE.Quaternion(), new THREE.Vector3(0, 0, 0));
    markerCrossbars.setMatrixAt(crossbarIndex, markerMatrix);
    crossbarIndex += 1;
  }
  markerStems.instanceMatrix.needsUpdate = true;
  markerCrossbars.instanceMatrix.needsUpdate = true;
  markerStems.userData.keepSeparate = true;
  markerCrossbars.userData.keepSeparate = true;
  if (markerCount > 0) root.add(markerStems, markerCrossbars);
  const skullLanternCount = amount(quality, 54, 40, 26);
  const skullLanterns = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 8, 5), materials.crackedBone, skullLanternCount);
  skullLanterns.name = 'ISLAND_17_NECROPOLIS_TINY_SKULL_LANTERNS';
  for (let index = 0; index < skullLanterns.count; index += 1) {
    const angle = index / skullLanterns.count * Math.PI * 2 + 0.2;
    const radius = 4.34 + (index % 5) * 0.24;
    markerPosition.set(Math.cos(angle) * radius, 0.54 + (index % 3) * 0.08, Math.sin(angle) * radius);
    markerQuaternion.setFromEuler(new THREE.Euler(0, -angle + Math.PI, (index % 3 - 1) * 0.07));
    markerScale.set(1.08, 0.82, 0.66);
    markerMatrix.compose(markerPosition, markerQuaternion, markerScale);
    skullLanterns.setMatrixAt(index, markerMatrix);
  }
  skullLanterns.instanceMatrix.needsUpdate = true;
  skullLanterns.userData.keepSeparate = true;
  root.add(skullLanterns);
  const denseTowerCount = amount(quality, 42, 28, 16);
  const denseTowers = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 0.78, 1, 5), materials.agedBone, denseTowerCount);
  denseTowers.name = 'ISLAND_17_DENSE_BONE_CITY_SPIRE_FIELD';
  const denseCaps = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 5), materials.crackedBone, denseTowerCount);
  denseCaps.name = 'ISLAND_17_DENSE_BONE_CITY_SPLINTER_CAPS';
  for (let index = 0; index < denseTowerCount; index += 1) {
    const angle = index * 2.399963229728653 + (index % 7) * 0.035;
    const radius = 4.18 + (index % 9) * 0.18;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (!isIsland17RouteCorridorClear(x, z, 0.13)) {
      markerMatrix.compose(new THREE.Vector3(0, -100, 0), new THREE.Quaternion(), new THREE.Vector3(0, 0, 0));
      denseTowers.setMatrixAt(index, markerMatrix);
      denseCaps.setMatrixAt(index, markerMatrix);
      continue;
    }
    const height = 0.4 + (index % 7) * 0.1;
    markerPosition.set(x, 0.3 + height * 0.48, z);
    markerQuaternion.setFromEuler(new THREE.Euler((index % 3 - 1) * 0.04, -angle + Math.PI / 2, (index % 5 - 2) * 0.055));
    markerScale.set(0.07 + (index % 3) * 0.014, height, 0.065 + (index % 4) * 0.008);
    markerMatrix.compose(markerPosition, markerQuaternion, markerScale);
    denseTowers.setMatrixAt(index, markerMatrix);
    markerPosition.y += height * 0.55 + 0.12;
    markerScale.set(0.07 + (index % 4) * 0.014, 0.18 + (index % 3) * 0.04, 0.07);
    markerMatrix.compose(markerPosition, markerQuaternion, markerScale);
    denseCaps.setMatrixAt(index, markerMatrix);
  }
  denseTowers.instanceMatrix.needsUpdate = true;
  denseCaps.instanceMatrix.needsUpdate = true;
  denseTowers.userData.keepSeparate = true;
  denseCaps.userData.keepSeparate = true;
  if (denseTowerCount > 0) root.add(denseTowers, denseCaps);
  const cavernWindowCount = amount(quality, 30, 22, 14);
  const cavernWindows = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.055, 0), materials.soulfireGlass, cavernWindowCount);
  cavernWindows.name = 'ISLAND_17_CLIFF_FACE_SOUL_CAVERN_WINDOWS';
  for (let index = 0; index < cavernWindows.count; index += 1) {
    const t = index / Math.max(1, cavernWindows.count - 1);
    const angle = THREE.MathUtils.lerp(Math.PI * 0.04, Math.PI * 0.96, t);
    const radius = 4.78 + (index % 4) * 0.16;
    markerPosition.set(Math.cos(angle) * radius, -0.24 - (index % 5) * 0.21, Math.sin(angle) * radius + 0.08);
    markerQuaternion.setFromEuler(new THREE.Euler(0, angle, Math.PI / 4));
    markerScale.set(0.8, 1.45 + (index % 3) * 0.3, 0.8);
    markerMatrix.compose(markerPosition, markerQuaternion, markerScale);
    cavernWindows.setMatrixAt(index, markerMatrix);
  }
  cavernWindows.instanceMatrix.needsUpdate = true;
  cavernWindows.userData.keepSeparate = true;
  root.add(cavernWindows);
  const frontRelicAngles = amount(quality, 18, 12, 8);
  const cliffRelicMatrix = new THREE.Matrix4();
  const cliffRelicPosition = new THREE.Vector3();
  const cliffRelicQuaternion = new THREE.Quaternion();
  const cliffRelicScale = new THREE.Vector3();
  const relicRibs = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 0.9, 1, 5), materials.agedBone, frontRelicAngles);
  relicRibs.name = 'ISLAND_17_FOREGROUND_CLIFF_BONE_RELIQUARY_RIBS';
  for (let index = 0; index < relicRibs.count; index += 1) {
    const t = index / Math.max(1, relicRibs.count - 1);
    const angle = THREE.MathUtils.lerp(Math.PI * 0.08, Math.PI * 0.92, t);
    const radius = 4.92 + (index % 3) * 0.16;
    cliffRelicPosition.set(
      Math.cos(angle) * radius,
      -0.56 - (index % 5) * 0.18,
      Math.sin(angle) * radius,
    );
    cliffRelicQuaternion.setFromEuler(new THREE.Euler((index % 2 ? 0.08 : -0.08), 0, (index % 4 - 1.5) * 0.08));
    cliffRelicScale.set(0.05 + (index % 3) * 0.008, 0.32 + (index % 4) * 0.07, 0.045);
    cliffRelicMatrix.compose(cliffRelicPosition, cliffRelicQuaternion, cliffRelicScale);
    relicRibs.setMatrixAt(index, cliffRelicMatrix);
  }
  relicRibs.instanceMatrix.needsUpdate = true;
  relicRibs.userData.keepSeparate = true;
  if (frontRelicAngles > 0) root.add(relicRibs);
  const soulMarkers = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.04, 0), materials.soulfireGlass, amount(quality, 18, 14, 9));
  soulMarkers.name = 'ISLAND_17_FOREGROUND_CLIFF_SOUL_RELIQUARY_MARKERS';
  for (let index = 0; index < soulMarkers.count; index += 1) {
    const t = index / Math.max(1, soulMarkers.count - 1);
    const angle = THREE.MathUtils.lerp(Math.PI * 0.12, Math.PI * 0.88, t);
    const radius = 4.76 + (index % 2) * 0.22;
    cliffRelicPosition.set(Math.cos(angle) * radius, -0.86 - (index % 4) * 0.26, Math.sin(angle) * radius + 0.02);
    cliffRelicQuaternion.setFromEuler(new THREE.Euler(0, angle, Math.PI / 4));
    cliffRelicScale.setScalar(0.8 + (index % 3) * 0.18);
    cliffRelicMatrix.compose(cliffRelicPosition, cliffRelicQuaternion, cliffRelicScale);
    soulMarkers.setMatrixAt(index, cliffRelicMatrix);
  }
  soulMarkers.instanceMatrix.needsUpdate = true;
  soulMarkers.userData.keepSeparate = true;
  root.add(soulMarkers);
  const lowerLedges = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.06, 0.16), materials.darkStone, amount(quality, 22, 16, 11));
  lowerLedges.name = 'ISLAND_17_FOREGROUND_CLIFF_BROKEN_RELIQUARY_LEDGES';
  for (let index = 0; index < lowerLedges.count; index += 1) {
    const t = index / Math.max(1, lowerLedges.count - 1);
    const angle = THREE.MathUtils.lerp(Math.PI * 0.1, Math.PI * 0.9, t);
    const radius = 5.03 + (index % 3) * 0.1;
    cliffRelicPosition.set(Math.cos(angle) * radius, -0.42 - (index % 6) * 0.23, Math.sin(angle) * radius);
    cliffRelicQuaternion.setFromEuler(new THREE.Euler(0, -angle + Math.PI / 2, (index % 5 - 2) * 0.05));
    cliffRelicScale.set(0.8 + (index % 4) * 0.18, 0.8, 0.62 + (index % 3) * 0.18);
    cliffRelicMatrix.compose(cliffRelicPosition, cliffRelicQuaternion, cliffRelicScale);
    lowerLedges.setMatrixAt(index, cliffRelicMatrix);
  }
  lowerLedges.instanceMatrix.needsUpdate = true;
  lowerLedges.userData.keepSeparate = true;
  root.add(lowerLedges);
  [-1, 1].forEach((side) => {
    const jawRail = curveTube([
      new THREE.Vector3(side * 3.25, -0.42, 5.14),
      new THREE.Vector3(side * 2.55, 0.08, 4.42),
      new THREE.Vector3(side * 1.52, 0.22, 3.66),
    ], 0.105, materials.agedBone, quality, 22);
    jawRail.name = `ISLAND_17_FOREGROUND_GIANT_JAW_RAIL_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    const tusk = curveTube([
      new THREE.Vector3(side * 4.08, -0.84, 4.86),
      new THREE.Vector3(side * 3.72, -0.2, 4.34),
      new THREE.Vector3(side * 3.14, 0.42, 3.88),
    ], 0.08, materials.bone, quality, 20);
    tusk.name = `ISLAND_17_FOREGROUND_UPTHRUST_TUSK_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    const skullPylon = createSkullHead(materials, quality, 0.36);
    skullPylon.name = `ISLAND_17_FOREGROUND_CLIFF_SKULL_PYLON_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    skullPylon.position.set(side * 3.52, -0.22, 4.42);
    skullPylon.rotation.y = side * 0.22;
    root.add(jawRail, tusk, skullPylon);
  });
  const ruinCount = amount(quality, 26, 20, 14);
  for (let index = 0; index < ruinCount; index += 1) {
    const angle = index / ruinCount * Math.PI * 2 + 0.12;
    const radius = 4.78 + (index % 3) * 0.34;
    const column = cylinder(0.05, 0.08, 0.34 + (index % 4) * 0.13, index % 2 ? materials.agedBone : materials.limestone, 5);
    column.position.set(Math.cos(angle) * radius, 0.12, Math.sin(angle) * radius);
    root.add(column);
  }
  root.userData.sculptRuntime = { parts: [registerIsland17RuntimePart('floating-cliff', root, 'terrain')] };
  runtimeParts.push(registerIsland17RuntimePart('moss-vine-overgrowth', topMoss, 'terrain-material'));
  return root;
}

function createSoulfirePit(materials: Island17TitansRestMaterials, quality: Island3DQuality, runtimeParts: Island17RuntimePart[], includeSkull = true) {
  const root = new THREE.Group();
  root.name = 'ISLAND_17_CENTRAL_SOULFIRE_PIT';
  const abyssFloor = cylinder(1.52, 1.35, 0.08, materials.shadow, segments(quality) * 3);
  abyssFloor.name = 'ISLAND_17_CENTRAL_PIT_ABYSS_FLOOR';
  abyssFloor.position.y = -0.78;
  const buriedGlowMaterial = materials.soulfire.clone();
  buriedGlowMaterial.color.setHex(0x0b9d91);
  buriedGlowMaterial.opacity = 0.48;
  const buriedGlow = cylinder(1.08, 0.9, 0.045, buriedGlowMaterial, segments(quality) * 3);
  buriedGlow.name = 'ISLAND_17_CENTRAL_PIT_RECESSED_SOULFIRE';
  buriedGlow.position.y = -0.73;
  const abyssCore = cylinder(0.58, 0.52, 0.025, materials.shadow, segments(quality) * 2);
  abyssCore.name = 'ISLAND_17_CENTRAL_PIT_BLACK_CORE';
  abyssCore.position.y = -0.69;
  const deepHalo = torus(0.78, 0.042, materials.soulfire, segments(quality) * 2);
  deepHalo.name = 'ISLAND_17_CENTRAL_PIT_DEEP_SOUL_HALO';
  deepHalo.position.y = -0.68;
  const collar = torus(2.25, 0.11, materials.bronze, segments(quality) * 3);
  collar.name = 'ISLAND_17_CENTRAL_PIT_OUTER_BRONZE_COLLAR';
  collar.position.y = 0.18;
  const innerLip = torus(1.78, 0.095, materials.darkStone, segments(quality) * 3);
  innerLip.name = 'ISLAND_17_CENTRAL_PIT_INNER_STONE_LIP';
  innerLip.position.y = 0.07;
  root.add(abyssFloor, buriedGlow, abyssCore, deepHalo, collar, innerLip);

  [0.0, -0.22, -0.44, -0.66].forEach((depth, index) => {
    const wallRing = torus(1.72 - index * 0.08, 0.075, index % 2 ? materials.limestone : materials.darkStone, segments(quality) * 2);
    wallRing.name = `ISLAND_17_CENTRAL_PIT_DESCENDING_WALL_RING_${index + 1}`;
    wallRing.position.y = depth;
    wallRing.userData.keepSeparate = true;
    root.add(wallRing);
  });

  const rimSlabCount = amount(quality, 24, 18, 14);
  const rimSlabs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.12, 0.5), materials.agedBone, rimSlabCount);
  rimSlabs.name = 'ISLAND_17_CENTRAL_PIT_RITUAL_RIM_SLABS';
  const rimMatrix = new THREE.Matrix4();
  for (let index = 0; index < rimSlabCount; index += 1) {
    const angle = index / rimSlabCount * Math.PI * 2;
    rimMatrix.compose(
      new THREE.Vector3(Math.cos(angle) * 2.02, 0.13, Math.sin(angle) * 2.02),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -angle, 0)),
      new THREE.Vector3(1, 1, 1),
    );
    rimSlabs.setMatrixAt(index, rimMatrix);
  }
  rimSlabs.instanceMatrix.needsUpdate = true;
  rimSlabs.castShadow = quality === 'high';
  rimSlabs.receiveShadow = true;
  rimSlabs.userData.keepSeparate = true;
  root.add(rimSlabs);

  const wallRibCount = amount(quality, 18, 14, 10);
  const wallRibs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045, 0.06, 0.72, 6), materials.limestone, wallRibCount);
  wallRibs.name = 'ISLAND_17_CENTRAL_PIT_VERTICAL_WALL_RIBS';
  const ribMatrix = new THREE.Matrix4();
  for (let index = 0; index < wallRibCount; index += 1) {
    const angle = index / wallRibCount * Math.PI * 2 + 0.08;
    ribMatrix.compose(
      new THREE.Vector3(Math.cos(angle) * 1.56, -0.34, Math.sin(angle) * 1.56),
      new THREE.Quaternion(),
      new THREE.Vector3(1, 1, 1),
    );
    wallRibs.setMatrixAt(index, ribMatrix);
  }
  wallRibs.instanceMatrix.needsUpdate = true;
  wallRibs.userData.keepSeparate = true;
  root.add(wallRibs);

  for (let index = 0; index < amount(quality, 8, 6, 4); index += 1) {
    const angle = index / amount(quality, 8, 6, 4) * Math.PI * 2 + 0.18;
    const stream = curveTube([
      new THREE.Vector3(Math.cos(angle) * 1.5, 0.02, Math.sin(angle) * 1.5),
      new THREE.Vector3(Math.cos(angle + 0.035) * 1.44, -0.3, Math.sin(angle + 0.035) * 1.44),
      new THREE.Vector3(Math.cos(angle - 0.025) * 1.32, -0.68, Math.sin(angle - 0.025) * 1.32),
    ], 0.022, materials.soulfire, quality, 14);
    stream.name = `ISLAND_17_CENTRAL_PIT_SOUL_STREAM_${index + 1}`;
    stream.userData.keepSeparate = true;
    root.add(stream);
  }
  const plumeCount = amount(quality, 26, 20, 13);
  const plumeMatrix = new THREE.Matrix4();
  const plumePosition = new THREE.Vector3();
  const plumeQuaternion = new THREE.Quaternion();
  const plumeScale = new THREE.Vector3();
  const plume = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.085, 0), materials.soulfireGlass, plumeCount);
  plume.name = 'ISLAND_17_CENTRAL_PIT_RISING_SOUL_PLUME';
  for (let index = 0; index < plume.count; index += 1) {
    const t = index / Math.max(1, plume.count - 1);
    const angle = index * 2.399963229728653;
    const radius = 0.18 + (index % 6) * 0.16;
    plumePosition.set(Math.cos(angle) * radius, -0.48 + t * 1.42, Math.sin(angle) * radius * 0.75);
    plumeQuaternion.setFromEuler(new THREE.Euler(angle * 0.1, angle, Math.PI / 4));
    plumeScale.set(0.7 + (index % 3) * 0.22, 1.25 + (index % 4) * 0.28, 0.7);
    plumeMatrix.compose(plumePosition, plumeQuaternion, plumeScale);
    plume.setMatrixAt(index, plumeMatrix);
  }
  plume.instanceMatrix.needsUpdate = true;
  plume.userData.keepSeparate = true;
  root.add(plume);
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2;
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.11), index % 2 ? materials.soulfireGlass : materials.agedBone);
    shard.position.set(Math.cos(angle) * 1.75, 0.22, Math.sin(angle) * 1.75);
    root.add(shard);
  }
  const light = new THREE.PointLight(0x10d9cd, quality === 'low' ? 1.8 : 2.8, 7, 2);
  light.name = 'ISLAND_17_CENTRAL_SOULFIRE_LIGHT';
  light.position.set(0, 0.65, 0);
  root.add(light);
  addRearNecropolisCrown(root, materials, quality);
  if (includeSkull) {
  const rearSkullScale = quality === 'low' ? 2.0 : quality === 'medium' ? 2.18 : 2.3;
  const rearSkull = createSkullHead(materials, quality, rearSkullScale);
  rearSkull.name = 'ISLAND_17_REAR_TITAN_SKULL_SILHOUETTE';
  rearSkull.position.set(0, -0.46, -2.5);
  rearSkull.rotation.y = Math.PI * 0.015;
  rearSkull.scale.set(1.45, 1.26, 0.92);
  rearSkull.userData.keepSeparate = true;
  compactIsland17StaticGeometry(rearSkull, 'ISLAND_17_REAR_TITAN_SKULL_FALLBACK_STATIC', false);
  root.add(rearSkull);
  if (canLoadIsland17RuntimeAssets()) {
    root.userData.titanSkullAssetState = 'loading';
    new GLTFLoader().load(
      ISLAND_17_TITAN_SKULL_SCULPT_URL,
      ({ scene }) => {
        scene.name = 'ISLAND_17_TITAN_SKULL_BLENDER_SCULPT_V027';
        scene.position.set(0, 2.68, -2.7);
        scene.rotation.set(-0.035, 0.075, -0.018);
        scene.scale.set(1.48, 1.43, 1.38);
        scene.traverse((child) => {
          child.userData.landmarkId = 'boss';
          child.userData.sculptAssetVersion = 'titan-skull-boss-v027';
          if (!(child instanceof THREE.Mesh)) return;
          child.castShadow = quality === 'high';
          child.receiveShadow = false;
          const loadedMaterials = Array.isArray(child.material) ? child.material : [child.material];
          loadedMaterials.forEach((loadedMaterial) => {
            if (!(loadedMaterial instanceof THREE.MeshStandardMaterial)) return;
            [loadedMaterial.map, loadedMaterial.normalMap, loadedMaterial.roughnessMap, loadedMaterial.aoMap].forEach((texture) => {
              if (!texture) return;
              texture.anisotropy = 8;
              texture.minFilter = THREE.LinearMipmapLinearFilter;
              texture.magFilter = THREE.LinearFilter;
              texture.generateMipmaps = true;
              texture.needsUpdate = true;
            });
            if (loadedMaterial.map && !loadedMaterial.bumpMap) {
              const bumpMap = loadedMaterial.map.clone();
              bumpMap.colorSpace = THREE.NoColorSpace;
              bumpMap.needsUpdate = true;
              loadedMaterial.bumpMap = bumpMap;
              loadedMaterial.bumpScale = 0.035;
            }
            loadedMaterial.roughness = Math.max(0.82, loadedMaterial.roughness);
            loadedMaterial.metalness = Math.min(0.04, loadedMaterial.metalness);
            loadedMaterial.envMapIntensity = 0.52;
            loadedMaterial.needsUpdate = true;
          });
        });
        rearSkull.visible = false;
        root.add(scene);
        root.userData.titanSkullAssetState = 'ready';
        const bounds = new THREE.Box3().setFromObject(scene);
        window.dispatchEvent(new CustomEvent('island17:titan-skull-ready', {
          detail: {
            asset: scene.name,
            meshCount: scene.getObjectsByProperty('type', 'Mesh').length,
            bounds: {
              min: bounds.min.toArray(),
              max: bounds.max.toArray(),
            },
          },
        }));
      },
      undefined,
      (error) => {
        root.userData.titanSkullAssetState = 'failed';
        root.userData.titanSkullAssetError = error instanceof Error ? error.message : String(error);
        window.dispatchEvent(new CustomEvent('island17:titan-skull-error', {
          detail: {
            asset: ISLAND_17_TITAN_SKULL_SCULPT_URL,
            message: root.userData.titanSkullAssetError,
          },
        }));
      },
    );
  }
  }
  root.userData.sculptRuntime = { parts: [registerIsland17RuntimePart('central-soulfire-pit', root, 'soulfire')] };
  runtimeParts.push(registerIsland17RuntimePart('soulfire-network', root, 'soulfire'));
  return root;
}

export function createIsland17TitanSkullRuntimeStage(
  materials: Island17TitansRestMaterials,
  quality: Island3DQuality = 'high',
) {
  return createSoulfirePit(materials, quality, []);
}

export function createIsland17ProceduralTitanSkullRuntimeStage(
  materials: Island17TitansRestMaterials,
  quality: Island3DQuality = 'high',
) {
  const root = new THREE.Group();
  root.name = 'ISLAND_17_PROCEDURAL_TITAN_SKULL_QC_STAGE';
  const skull = createSkullHead(materials, quality, 2.3);
  skull.position.set(0, -0.46, -2.5);
  skull.rotation.y = Math.PI * 0.015;
  skull.scale.set(1.45, 1.26, 0.92);
  root.add(skull);
  return root;
}

function createRibBridge(materials: Island17TitansRestMaterials, quality: Island3DQuality, runtimeParts: Island17RuntimePart[]) {
  const root = new THREE.Group();
  root.name = 'ISLAND_17_RIB_BRIDGE_SPINE';
  const restoration = createTitanSpineRestoration(root, [materials.bone, materials.agedBone, materials.crackedBone]);
  root.userData.updateRestoration = restoration.update;
  const missionPulseRings = new THREE.InstancedMesh(
    new THREE.TorusGeometry(0.43, 0.036, 6, 32),
    new THREE.MeshBasicMaterial({ color: 0x23f4dc, transparent: true, opacity: 0.72,
      depthWrite: false, blending: THREE.AdditiveBlending }),
    8,
  );
  missionPulseRings.name = 'ISLAND_17_RIB_MISSION_SPECTRAL_PULSES';
  missionPulseRings.userData.keepSeparate = true;
  missionPulseRings.frustumCulled = false;
  root.add(missionPulseRings);
  const pulseMatrix = new THREE.Matrix4();
  const pulsePosition = new THREE.Vector3();
  const pulseQuaternion = new THREE.Quaternion();
  const pulseScale = new THREE.Vector3();
  const pulseColor = new THREE.Color();
  const missionSoulNodes: THREE.Object3D[] = [];
  const missionChainNodes: THREE.Object3D[] = [];
  const missionMoteCount = amount(quality, 18, 12, 8);
  const missionMotes = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(0.11, 0),
    materials.soulfireGlass,
    missionMoteCount,
  );
  missionMotes.name = 'ISLAND_17_RIB_MISSION_TRAVELLING_SOUL_CURRENT';
  missionMotes.userData.keepSeparate = true;
  root.add(missionMotes);
  const missionMoteMatrix = new THREE.Matrix4();
  const missionMotePosition = new THREE.Vector3();
  const missionMoteQuaternion = new THREE.Quaternion();
  const missionMoteScale = new THREE.Vector3();
  const commissionMaterial = new THREE.MeshBasicMaterial({
    color: 0x62fff0,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const commissionHalos = new THREE.InstancedMesh(
    new THREE.TorusGeometry(0.62, 0.035, 5, 14),
    commissionMaterial,
    2,
  );
  commissionHalos.name = 'ISLAND_17_RIB_MISSION_COMMISSION_SHOCK_HALOS';
  commissionHalos.userData.keepSeparate = true;
  root.add(commissionHalos);
  const commissionShards = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(0.12, 0),
    materials.soulfireGlass,
    8,
  );
  commissionShards.name = 'ISLAND_17_RIB_MISSION_COMMISSION_CROWN_BURST';
  commissionShards.userData.keepSeparate = true;
  root.add(commissionShards);
  const commissionMatrix = new THREE.Matrix4();
  const commissionPosition = new THREE.Vector3();
  const commissionQuaternion = new THREE.Quaternion();
  const commissionScale = new THREE.Vector3();
  root.userData.missionAnimation = {
    id: 'rebuild-the-titans-spine',
    stages: 8,
    layers: ['spectral-waystone-wave', 'travelling-soul-current', 'chain-resonance', 'commission-crown-burst'],
    reducedMotion: 'static-waystone-and-soul-current-glow',
  };
  root.userData.animateMission = (elapsed: number, reducedMotion = false) => {
    const repair = restoration.animate(elapsed, reducedMotion);
    const phase = reducedMotion ? 0.52 : (elapsed * 0.15) % 1;
    const commissionStrength = repair.finale ? repair.burst : 0;
    missionMotes.visible = repair.activatedStages > 0;
    commissionHalos.visible = repair.finale && !reducedMotion;
    commissionShards.visible = repair.finale && !reducedMotion;
    missionPulseRings.visible = repair.activatedStages > 0;
    for (let index = 0; index < 8; index += 1) {
      const station = index / 7;
      const rawDistance = Math.abs(station - phase);
      const distance = Math.min(rawDistance, 1 - rawDistance);
      const strength = reducedMotion ? 0.16 : THREE.MathUtils.smoothstep(0.24 - distance, 0, 0.24);
      const scale = index >= repair.activatedStages ? 0
        : (reducedMotion ? 0.86 : 0.68 + strength * 0.58) * (1 + index * 0.018 / 0.43);
      pulseScale.set(scale, scale * 1.22, scale);
      pulsePosition.set(0, THREE.MathUtils.lerp(0.24, 0.7, station)
        + (reducedMotion ? 0 : Math.sin(elapsed * 2.2 + index * 0.72) * 0.035),
      THREE.MathUtils.lerp(8.9, 4.34, station));
      pulseQuaternion.setFromEuler(new THREE.Euler(Math.PI / 2, 0,
        reducedMotion ? 0 : elapsed * 0.42 * (index % 2 ? -1 : 1)));
      pulseMatrix.compose(pulsePosition, pulseQuaternion, pulseScale);
      missionPulseRings.setMatrixAt(index, pulseMatrix);
      pulseColor.setScalar(reducedMotion ? 0.28 : 0.02 + strength);
      missionPulseRings.setColorAt(index, pulseColor);
    }
    missionPulseRings.instanceMatrix.needsUpdate = true;
    if (missionPulseRings.instanceColor) missionPulseRings.instanceColor.needsUpdate = true;
    for (let index = 0; index < missionMoteCount; index += 1) {
      const staticProgress = index / Math.max(1, missionMoteCount - 1);
      const unboundedProgress = reducedMotion
        ? staticProgress
        : (phase + index / missionMoteCount * 0.42) % 1;
      const progress = unboundedProgress * repair.activatedStages / 8;
      const wake = reducedMotion ? 0 : Math.sin(progress * Math.PI) * 0.16;
      missionMotePosition.set(
        Math.sin(progress * Math.PI * 5 + index * 0.61) * (reducedMotion ? 0.04 : 0.13),
        THREE.MathUtils.lerp(-0.34, 0.68, progress) + wake,
        THREE.MathUtils.lerp(9.02, 4.28, progress),
      );
      missionMoteQuaternion.setFromEuler(new THREE.Euler(
        reducedMotion ? 0 : elapsed * 0.34 + index * 0.15,
        reducedMotion ? 0 : elapsed * 0.52 - index * 0.2,
        Math.PI / 4,
      ));
      const headDistance = Math.min(Math.abs(progress - phase), 1 - Math.abs(progress - phase));
      const headStrength = reducedMotion ? 0.28 : THREE.MathUtils.smoothstep(0.28 - headDistance, 0, 0.28);
      const scale = (reducedMotion ? 0.42 : 0.5) + headStrength * 0.92;
      missionMoteScale.set(scale, scale * (1.2 + headStrength * 0.45), scale);
      missionMoteMatrix.compose(missionMotePosition, missionMoteQuaternion, missionMoteScale);
      missionMotes.setMatrixAt(index, missionMoteMatrix);
    }
    missionMotes.instanceMatrix.needsUpdate = true;
    commissionMaterial.opacity = reducedMotion ? 0.1 : commissionStrength * 0.5;
    for (let index = 0; index < commissionHalos.count; index += 1) {
      const haloScale = reducedMotion
        ? 0.72 + index * 0.18
        : 0.46 + commissionStrength * (0.62 + index * 0.26);
      commissionPosition.set(0, 0.72 + index * 0.045, 4.24);
      commissionQuaternion.setFromEuler(new THREE.Euler(Math.PI / 2, 0, elapsed * (index ? -0.32 : 0.42)));
      commissionScale.setScalar(haloScale);
      commissionMatrix.compose(commissionPosition, commissionQuaternion, commissionScale);
      commissionHalos.setMatrixAt(index, commissionMatrix);
    }
    commissionHalos.instanceMatrix.needsUpdate = true;
    for (let index = 0; index < commissionShards.count; index += 1) {
      const angle = index / commissionShards.count * Math.PI * 2 + (reducedMotion ? 0 : elapsed * 0.18);
      const burstRadius = reducedMotion ? 0.44 : 0.24 + commissionStrength * 0.52;
      commissionPosition.set(
        Math.cos(angle) * burstRadius,
        0.74 + Math.sin(angle * 2) * 0.08 + commissionStrength * 0.12,
        4.24 + Math.sin(angle) * burstRadius,
      );
      commissionQuaternion.setFromEuler(new THREE.Euler(angle * 0.35, -angle, Math.PI / 4));
      const shardScale = reducedMotion ? 0.2 : 0.02 + commissionStrength * (0.38 + (index % 3) * 0.08);
      commissionScale.set(shardScale * 0.72, shardScale * 1.52, shardScale * 0.72);
      commissionMatrix.compose(commissionPosition, commissionQuaternion, commissionScale);
      commissionShards.setMatrixAt(index, commissionMatrix);
    }
    commissionShards.instanceMatrix.needsUpdate = true;
    missionSoulNodes.forEach((node, index) => {
      const baseScale = node.userData.missionBaseScale as THREE.Vector3 | undefined;
      const baseY = Number(node.userData.missionBaseY ?? node.position.y);
      if (!baseScale) return;
      const pulse = reducedMotion ? 1 : 1 + Math.sin(elapsed * 2.6 - index * 0.82) * 0.1;
      node.scale.copy(baseScale).multiplyScalar(pulse);
      node.position.y = baseY + (reducedMotion ? 0 : Math.sin(elapsed * 1.8 - index * 0.55) * 0.022);
      node.rotation.y = Number(node.userData.missionBaseRotationY ?? 0)
        + (reducedMotion ? 0 : Math.sin(elapsed * 0.7 + index) * 0.18);
    });
    missionChainNodes.forEach((node, index) => {
      node.rotation.z = reducedMotion ? 0 : Math.sin(elapsed * 0.9 + index * 0.34) * 0.055;
    });
  };
  const spine = curveTube([
    new THREE.Vector3(0, -0.82, 9.15),
    new THREE.Vector3(0, -0.48, 7.35),
    new THREE.Vector3(0, -0.14, 5.9),
    new THREE.Vector3(0, 0.08, 4.05),
  ], 0.3, materials.agedBone, quality, 34);
  spine.name = 'ISLAND_17_RIB_BRIDGE_CONTINUOUS_SPINAL_CORE';
  root.add(spine);
  const ribCount = 8;
  for (let index = 0; index < ribCount; index += 1) {
    const t = index / Math.max(1, ribCount - 1);
    const z = THREE.MathUtils.lerp(8.72, 4.38, t) + (index % 3 - 1) * 0.035;
    const y = THREE.MathUtils.lerp(-0.58, -0.04, t);
    const width = THREE.MathUtils.lerp(1.9, 0.82, t) + (index % 3 - 1) * 0.045;
    [-1, 1].forEach((side) => {
      const asymmetry = (index % 2 ? 1 : -1) * side * 0.025;
      const rib = taperedCurveTube({
        points: [
          new THREE.Vector3(side * 0.23, y + 0.02, z + 0.08),
          new THREE.Vector3(side * width * 0.5, y + 0.49 + asymmetry, z + 0.03),
          new THREE.Vector3(side * width * 0.92, y + 0.36, z - 0.12),
          new THREE.Vector3(side * width * 1.08, y - 0.12, z - 0.34),
          new THREE.Vector3(side * width * 0.93, y - 0.48, z - 0.52),
        ],
        startRadius: 0.17 - t * 0.03,
        endRadius: 0.105 - t * 0.018,
        belly: 0.025,
        material: index % 3 === 1 ? materials.crackedBone : materials.bone,
        quality,
        tubularSegments: 28,
        radialSegments: 9,
      });
      rib.name = `ISLAND_17_RIB_BRIDGE_TAPERED_ARCH_${index + 1}_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      root.add(rib);

      const ribRoot = sphere(0.2 - t * 0.026, materials.agedBone, 11);
      ribRoot.name = `ISLAND_17_RIB_BRIDGE_RIB_HEAD_${index + 1}_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      ribRoot.position.set(side * 0.25, y + 0.025, z + 0.07);
      ribRoot.scale.set(1.15, 0.86, 1.04);
      root.add(ribRoot);

      const weatherBand = torus(0.145 - t * 0.018, 0.025, materials.agedBone, 12);
      weatherBand.name = `ISLAND_17_RIB_BRIDGE_RIB_WEATHER_BAND_${index + 1}_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      weatherBand.position.set(side * width * 0.97, y + 0.2, z - 0.19);
      weatherBand.rotation.set(Math.PI * 0.47, side * 0.18, 0);
      weatherBand.scale.set(1, 0.9, 0.82);
      root.add(weatherBand);
    });

    const vertebra = sphere(0.31 - t * 0.044, index % 2 ? materials.bone : materials.agedBone, 12);
    vertebra.name = `ISLAND_17_RIB_BRIDGE_RAISED_VERTEBRA_${index + 1}`;
    vertebra.scale.set(1.48, 0.84, 1.16);
    vertebra.position.set(0, y + 0.02, z + 0.02);
    root.add(vertebra);

    const arch = taperedCurveTube({
      points: [
        new THREE.Vector3(-0.3 + t * 0.04, y + 0.06, z - 0.01),
        new THREE.Vector3(-0.2, y + 0.36, z - 0.04),
        new THREE.Vector3(0, y + 0.46, z - 0.07),
        new THREE.Vector3(0.2, y + 0.36, z - 0.04),
        new THREE.Vector3(0.3 - t * 0.04, y + 0.06, z - 0.01),
      ],
      startRadius: 0.09 - t * 0.012,
      endRadius: 0.09 - t * 0.012,
      belly: 0.014,
      material: materials.crackedBone,
      quality,
      tubularSegments: 16,
      radialSegments: 8,
    });
    arch.name = `ISLAND_17_RIB_BRIDGE_NEURAL_ARCH_${index + 1}`;
    root.add(arch);

    const spinousProcess = taperedCurveTube({
      points: [
        new THREE.Vector3(0, y + 0.34, z - 0.03),
        new THREE.Vector3((index % 2 - 0.5) * 0.035, y + 0.51, z - 0.14),
        new THREE.Vector3((index % 3 - 1) * 0.026, y + 0.54, z - 0.34),
      ],
      startRadius: 0.085 - t * 0.01,
      endRadius: 0.045 - t * 0.006,
      material: materials.agedBone,
      quality,
      tubularSegments: 9,
      radialSegments: 7,
    });
    spinousProcess.name = `ISLAND_17_RIB_BRIDGE_SPINOUS_PROCESS_${index + 1}`;
    root.add(spinousProcess);

    const tread = roundedBridgeSlab(0.72 - t * 0.1, 0.13, 0.48 + (index % 2) * 0.035, index % 2 ? materials.crackedBone : materials.agedBone);
    tread.name = `ISLAND_17_RIB_BRIDGE_STERNUM_WALKWAY_SLAB_${index + 1}`;
    tread.position.set((index % 3 - 1) * 0.028, y + 0.43, z - 0.08);
    tread.rotation.set((index % 2 - 0.5) * 0.045, (index % 3 - 1) * 0.035, (index % 4 - 1.5) * 0.018);
    root.add(tread);
    [-1, 1].forEach((side) => {
      const process = taperedCurveTube({
        points: [
          new THREE.Vector3(side * 0.24, y + 0.08, z),
          new THREE.Vector3(side * 0.44, y + 0.17, z - 0.06),
          new THREE.Vector3(side * 0.57, y + 0.1, z - 0.18),
        ],
        startRadius: 0.08 - t * 0.01,
        endRadius: 0.035,
        material: materials.agedBone,
        quality,
        tubularSegments: 8,
        radialSegments: 7,
      });
      process.name = `ISLAND_17_RIB_BRIDGE_VERTEBRAL_PROCESS_${index + 1}_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      root.add(process);
    });
    if (index === 2 || index === 5) addSoulfire(root, new THREE.Vector3(0, y + 0.57, z + 0.04), 0.045, materials);
    if (index === 1 || index === 6) {
      const skullMarker = createSkullHead(materials, quality, 0.13);
      skullMarker.name = `ISLAND_17_RIB_BRIDGE_SIDE_SKULL_RELIC_${index + 1}`;
      skullMarker.position.set(index === 1 ? -0.72 : 0.72, y - 0.03, z - 0.12);
      skullMarker.rotation.y = index === 1 ? 0.45 : -0.45;
      root.add(skullMarker);
    }
  }

  [-1, 1].forEach((side) => {
    const mossRail = curveTube([
      new THREE.Vector3(side * 0.32, -0.34, 8.88),
      new THREE.Vector3(side * 0.37, -0.06, 7.25),
      new THREE.Vector3(side * 0.31, 0.18, 5.78),
      new THREE.Vector3(side * 0.24, 0.43, 4.25),
    ], 0.026, materials.moss, quality, 30);
    mossRail.name = `ISLAND_17_RIB_BRIDGE_MOSS_FILLED_SPINE_SEAM_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    root.add(mossRail);

    const wrist = taperedCurveTube({
      points: [
        new THREE.Vector3(side * 1.72, -0.92, 9.38),
        new THREE.Vector3(side * 1.46, -0.77, 9.1),
        new THREE.Vector3(side * 1.2, -0.63, 8.86),
      ],
      startRadius: 0.14,
      endRadius: 0.1,
      belly: 0.012,
      material: materials.agedBone,
      quality,
      tubularSegments: 12,
      radialSegments: 8,
    });
    wrist.name = `ISLAND_17_RIB_BRIDGE_FOREGROUND_WRIST_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    root.add(wrist);

    const palm = sphere(0.24, materials.agedBone, 11);
    palm.name = `ISLAND_17_RIB_BRIDGE_FOREGROUND_GRASPING_PALM_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    palm.position.set(side * 1.13, -0.6, 8.82);
    palm.scale.set(1.16, 0.54, 0.86);
    palm.rotation.y = side * 0.18;
    root.add(palm);
    for (let finger = 0; finger < 4; finger += 1) {
      const zOffset = (finger - 1.5) * 0.14;
      const knuckles = [
        new THREE.Vector3(side * (1.01 - finger * 0.01), -0.55, 8.78 + zOffset),
        new THREE.Vector3(side * (0.78 - finger * 0.018), -0.44 + finger * 0.008, 8.7 + zOffset * 0.82),
        new THREE.Vector3(side * (0.61 - finger * 0.012), -0.48, 8.59 + zOffset * 0.58),
        new THREE.Vector3(side * (0.51 - finger * 0.008), -0.58, 8.49 + zOffset * 0.42),
      ];
      for (let phalanx = 0; phalanx < knuckles.length - 1; phalanx += 1) {
        const fingerBone = tubeBetween(
          knuckles[phalanx],
          knuckles[phalanx + 1],
          0.052 - finger * 0.003 - phalanx * 0.006,
          finger % 2 ? materials.bone : materials.agedBone,
          8,
        );
        fingerBone.name = `ISLAND_17_RIB_BRIDGE_FOREGROUND_PHALANX_${side < 0 ? 'LEFT' : 'RIGHT'}_${finger + 1}_${phalanx + 1}`;
        root.add(fingerBone);
        const knuckle = sphere(0.061 - finger * 0.002 - phalanx * 0.004, materials.crackedBone, 8);
        knuckle.name = `ISLAND_17_RIB_BRIDGE_FOREGROUND_KNUCKLE_${side < 0 ? 'LEFT' : 'RIGHT'}_${finger + 1}_${phalanx + 1}`;
        knuckle.position.copy(knuckles[phalanx + 1]);
        knuckle.scale.set(1.12, 0.82, 0.92);
        root.add(knuckle);
      }
    }

    const thumb = taperedCurveTube({
      points: [
        new THREE.Vector3(side * 1.08, -0.58, 8.69),
        new THREE.Vector3(side * 0.88, -0.43, 8.54),
        new THREE.Vector3(side * 0.72, -0.5, 8.45),
      ],
      startRadius: 0.065,
      endRadius: 0.043,
      material: materials.agedBone,
      quality,
      tubularSegments: 9,
      radialSegments: 7,
    });
    thumb.name = `ISLAND_17_RIB_BRIDGE_FOREGROUND_THUMB_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    root.add(thumb);
  });
  [-1, 1].forEach((side) => {
    const guardianSkull = createSkullHead(materials, quality, 0.18);
    guardianSkull.name = `ISLAND_17_RIB_BRIDGE_FOREGROUND_GUARDIAN_SKULL_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    guardianSkull.position.set(side * 1.78, -0.86, 9.42);
    guardianSkull.rotation.set(-0.12, side * -0.36, side * 0.05);
    root.add(guardianSkull);
  });
  const fallback = new THREE.Group();
  fallback.name = 'ISLAND_17_RIB_BRIDGE_PROCEDURAL_FALLBACK';
  [...root.children]
    .filter((child) => !child.name.startsWith('ISLAND_17_RIB_MISSION_'))
    .forEach((child) => fallback.add(child));
  root.add(fallback);
  restoration.bind(fallback, ribCount);
  if (canLoadIsland17RuntimeAssets()) {
    root.userData.ribBridgeAssetState = 'loading';
    new GLTFLoader().load(
      ISLAND_17_TITAN_RIB_BRIDGE_URL,
      ({ scene }) => {
        scene.name = 'ISLAND_17_TITAN_RIB_BRIDGE_BLENDER_V007';
        scene.position.set(0, -0.62, 6.66);
        scene.scale.set(0.78, 0.9, 0.94);
        scene.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.castShadow = true;
          object.receiveShadow = false;
          object.frustumCulled = true;
          if (object.name.includes('Waystone') && object.name.includes('faceted_core')) {
            object.userData.keepSeparate = true;
            object.userData.missionBaseScale = object.scale.clone();
            object.userData.missionBaseY = object.position.y;
            object.userData.missionBaseRotationY = object.rotation.y;
            missionSoulNodes.push(object);
          }
          if (object.name.includes('TitanBridge_Chain_')) {
            object.userData.keepSeparate = true;
            missionChainNodes.push(object);
          }
        });
        fallback.visible = false;
        restoration.unbind(fallback);
        fallback.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
        fallback.clear();
        root.remove(fallback);
        root.add(scene);
        restoration.bind(scene);
        root.userData.ribBridgeAssetState = 'ready';
        const bounds = new THREE.Box3().setFromObject(scene);
        window.dispatchEvent(new CustomEvent('island17:rib-bridge-ready', {
          detail: {
            asset: scene.name,
            meshCount: scene.getObjectsByProperty('type', 'Mesh').length,
            bounds: {
              min: bounds.min.toArray(),
              max: bounds.max.toArray(),
            },
          },
        }));
      },
      undefined,
      (error) => {
        root.userData.ribBridgeAssetState = 'failed';
        root.userData.ribBridgeAssetError = error instanceof Error ? error.message : String(error);
        window.dispatchEvent(new CustomEvent('island17:rib-bridge-error', {
          detail: {
            asset: ISLAND_17_TITAN_RIB_BRIDGE_URL,
            message: root.userData.ribBridgeAssetError,
          },
        }));
      },
    );
  }
  root.add(createPaintedPartBillboard('rib'));
  const missionHitTarget = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 1.2, 4.4),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
  );
  missionHitTarget.name = 'ISLAND_17_SPINE_MISSION_HIT_TARGET';
  missionHitTarget.position.set(0, 0.2, 6.9);
  missionHitTarget.userData.keepSeparate = true;
  root.add(missionHitTarget);
  root.userData.sculptRuntime = { parts: [registerIsland17RuntimePart('rib-bridge-spine', root, 'signature-mission')] };
  runtimeParts.push(registerIsland17RuntimePart('rib-bridge-spine', root, 'signature-mission'));
  return root;
}

export function createIsland17RibBridgeRuntimeStage(
  materials: Island17TitansRestMaterials,
  quality: Island3DQuality = 'high',
) {
  return createRibBridge(materials, quality, []);
}

function createChainAndWaterfallDepth(materials: Island17TitansRestMaterials, quality: Island3DQuality, runtimeParts: Island17RuntimePart[]) {
  const root = new THREE.Group();
  root.name = 'ISLAND_17_CHAIN_WATERFALL_DEPTH';
  const streams: THREE.Object3D[] = [];
  const waterfallCount = quality === 'high' ? 5 : 0;
  for (let index = 0; index < waterfallCount; index += 1) {
    const angle = index / waterfallCount * Math.PI * 2 + 0.18;
    const radius = 4.65 + (index % 2) * 0.42;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const water = curveTube([
      new THREE.Vector3(x, -0.1, z),
      new THREE.Vector3(x + Math.sin(index) * 0.08, -1.6, z),
      new THREE.Vector3(x + Math.cos(index) * 0.12, -3.5, z),
    ], 0.05 + (index % 3) * 0.012, materials.soulfire, quality, 16);
    water.name = `ISLAND_17_WATERFALL_STREAM_${index + 1}`;
    water.userData.keepSeparate = true;
    streams.push(water);
    root.add(water);
  }
  const hangingChainCount = amount(quality, 18, 12, 7);
  const foregroundChainCount = amount(quality, 8, 6, 4);
  const hangingLinksPerChain = amount(quality, 15, 12, 9);
  const foregroundLinksPerChain = amount(quality, 22, 17, 12);
  const chainLinkCount = hangingChainCount * hangingLinksPerChain
    + foregroundChainCount * foregroundLinksPerChain;
  const chainMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 0.94, 1, 5), materials.iron, hangingChainCount + foregroundChainCount);
  chainMesh.name = 'ISLAND_17_HANGING_CHAIN_AND_FOREGROUND_CURTAIN_INSTANCES';
  const chainLinks = new THREE.InstancedMesh(
    new THREE.TorusGeometry(0.074, 0.018, 3, 7),
    materials.iron,
    chainLinkCount,
  );
  chainLinks.name = 'ISLAND_17_READABLE_ALTERNATING_CHAIN_LINK_INSTANCES';
  chainLinks.userData.keepSeparate = true;
  const chainMatrix = new THREE.Matrix4();
  const chainPosition = new THREE.Vector3();
  const chainQuaternion = new THREE.Quaternion();
  const chainScale = new THREE.Vector3();
  let chainInstanceIndex = 0;
  let chainLinkIndex = 0;
  const setChainLink = (
    start: THREE.Vector3,
    end: THREE.Vector3,
    linkIndex: number,
    linkCount: number,
    curtainIndex: number,
  ) => {
    const t = linkIndex / Math.max(1, linkCount - 1);
    chainPosition.lerpVectors(start, end, t);
    chainPosition.x += Math.sin(t * Math.PI * 2 + curtainIndex * 0.7) * 0.018;
    chainQuaternion.setFromEuler(new THREE.Euler(
      0,
      linkIndex % 2 === 0 ? 0 : Math.PI / 2,
      (curtainIndex % 3 - 1) * 0.04,
    ));
    chainScale.setScalar(0.9 + (curtainIndex % 3) * 0.06);
    chainMatrix.compose(chainPosition, chainQuaternion, chainScale);
    chainLinks.setMatrixAt(chainLinkIndex, chainMatrix);
    chainLinkIndex += 1;
  };
  for (let index = 0; index < hangingChainCount; index += 1) {
    const angle = index / hangingChainCount * Math.PI * 2 + 0.3;
    const radius = 5.05 + (index % 3) * 0.28;
    const start = new THREE.Vector3(Math.cos(angle) * radius, -0.12, Math.sin(angle) * radius);
    const end = new THREE.Vector3(Math.cos(angle) * radius, -2.5 - (index % 3) * 0.35, Math.sin(angle) * radius);
    setCylinderInstanceBetween({
      mesh: chainMesh,
      index: chainInstanceIndex,
      start,
      end,
      radius: 0.011,
      matrix: chainMatrix,
      position: chainPosition,
      quaternion: chainQuaternion,
      scale: chainScale,
    });
    for (let linkIndex = 0; linkIndex < hangingLinksPerChain; linkIndex += 1) {
      setChainLink(start, end, linkIndex, hangingLinksPerChain, index);
    }
    chainInstanceIndex += 1;
  }
  for (let index = 0; index < foregroundChainCount; index += 1) {
    const x = THREE.MathUtils.lerp(-4.6, 4.6, index / Math.max(1, foregroundChainCount - 1));
    const z = 5.3 + (index % 3) * 0.38;
    const start = new THREE.Vector3(x, -0.1, z);
    const end = new THREE.Vector3(x + (index % 2 ? 0.08 : -0.08), -3.6 - (index % 4) * 0.28, z + 0.08);
    setCylinderInstanceBetween({
      mesh: chainMesh,
      index: chainInstanceIndex,
      start,
      end,
      radius: 0.011,
      matrix: chainMatrix,
      position: chainPosition,
      quaternion: chainQuaternion,
      scale: chainScale,
    });
    for (let linkIndex = 0; linkIndex < foregroundLinksPerChain; linkIndex += 1) {
      setChainLink(start, end, linkIndex, foregroundLinksPerChain, hangingChainCount + index);
    }
    chainInstanceIndex += 1;
    if (index % 2 === 0) {
      const drop = curveTube([
        new THREE.Vector3(x + 0.12, -0.12, z - 0.22),
        new THREE.Vector3(x + 0.06, -1.55, z - 0.18),
        new THREE.Vector3(x - 0.04, -3.85, z - 0.1),
      ], 0.034, materials.mist, quality, 18);
      drop.name = `ISLAND_17_FOREGROUND_WATERFALL_VEIL_${index + 1}`;
      drop.userData.keepSeparate = true;
      streams.push(drop);
      root.add(drop);
    }
  }
  chainMesh.instanceMatrix.needsUpdate = true;
  chainLinks.instanceMatrix.needsUpdate = true;
  if (chainMesh.count > 0) root.add(chainMesh);
  if (chainLinks.count > 0) root.add(chainLinks);
  const isletGeometry = new THREE.ConeGeometry(0.22, 0.72, 6);
  const floatingIslets = new THREE.InstancedMesh(isletGeometry, materials.darkStone, amount(quality, 8, 6, 4));
  floatingIslets.name = 'ISLAND_17_LOW_FLOATING_CHAINED_ISLETS';
  const matrix = new THREE.Matrix4();
  for (let index = 0; index < floatingIslets.count; index += 1) {
    const angle = index / floatingIslets.count * Math.PI * 2 + 0.5;
    const radius = 6.35 + (index % 3) * 0.82;
    const position = new THREE.Vector3(Math.cos(angle) * radius, -3.15 - (index % 3) * 0.42, Math.sin(angle) * radius + 0.9);
    const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, angle, Math.PI));
    const scale = new THREE.Vector3(1.25 + (index % 2) * 0.28, 1.4 + (index % 3) * 0.3, 0.82);
    matrix.compose(position, quaternion, scale);
    floatingIslets.setMatrixAt(index, matrix);
  }
  floatingIslets.instanceMatrix.needsUpdate = true;
  root.add(floatingIslets);
  root.userData.streams = streams;
  root.userData.sculptRuntime = { parts: [registerIsland17RuntimePart('chain-waterfall-depth', root, 'depth')] };
  runtimeParts.push(registerIsland17RuntimePart('chain-waterfall-depth', root, 'depth'));
  return root;
}

function createStormBackground(materials: Island17TitansRestMaterials, quality: Island3DQuality, runtimeParts: Island17RuntimePart[]) {
  const root = new THREE.Group();
  root.name = 'ISLAND_17_STORM_CLOUD_BACKGROUND';
  const stormCloudMaterial = new THREE.MeshBasicMaterial({
    color: 0x4a6174,
    transparent: true,
    opacity: 0.13,
    depthWrite: false,
    toneMapped: false,
  });
  for (let index = 0; index < amount(quality, 10, 5, 3); index += 1) {
    const angle = index / amount(quality, 10, 5, 3) * Math.PI * 2 + 0.16;
    const radius = 7.4 + (index % 4) * 0.62;
    const cloud = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 10, 6),
      stormCloudMaterial,
      5,
    );
    cloud.name = `ISLAND_17_STORM_CLOUD_${index + 1}`;
    cloud.position.set(Math.cos(angle) * radius, 1.05 + (index % 4) * 0.48, Math.sin(angle) * radius - 1.4);
    cloud.scale.setScalar(0.62 + (index % 3) * 0.16);
    const cloudMatrix = new THREE.Matrix4();
    const cloudQuaternion = new THREE.Quaternion();
    [
      [-1.28, -0.06, 0.02, 1.48, 0.34, 0.82],
      [-0.58, 0.08, -0.06, 1.62, 0.46, 0.92],
      [0.12, 0.04, 0.06, 1.78, 0.43, 0.98],
      [0.82, 0.06, -0.02, 1.52, 0.39, 0.84],
      [1.42, -0.07, 0.08, 1.02, 0.29, 0.68],
    ].forEach(([x, y, z, sx, sy, sz], lobeIndex) => {
      cloudQuaternion.setFromEuler(new THREE.Euler(0, lobeIndex * 0.17, (lobeIndex - 2) * 0.035));
      cloudMatrix.compose(
        new THREE.Vector3(x, y, z),
        cloudQuaternion,
        new THREE.Vector3(sx, sy, sz),
      );
      cloud.setMatrixAt(lobeIndex, cloudMatrix);
    });
    cloud.instanceMatrix.needsUpdate = true;
    cloud.userData.phase = index * 0.51;
    cloud.userData.keepSeparate = true;
    root.add(cloud);
  }
  for (let index = 0; index < amount(quality, 5, 4, 3); index += 1) {
    const angle = index / amount(quality, 5, 4, 3) * Math.PI * 2 + 0.55;
    const rock = cylinder(0.32, 0.48, 0.45, materials.darkStone, 7);
    rock.name = `ISLAND_17_DISTANT_FLOATING_ISLET_${index + 1}`;
    rock.position.set(Math.cos(angle) * 8.6, -0.75 + index * 0.15, Math.sin(angle) * 8.6 - 2.8);
    rock.scale.set(1, 1.4, 0.72);
    root.add(rock);
  }
  root.userData.sculptRuntime = { parts: [registerIsland17RuntimePart('storm-cloud-background', root, 'background')] };
  runtimeParts.push(registerIsland17RuntimePart('storm-cloud-background', root, 'background'));
  return root;
}

function shouldLoadPaintedReferences() {
  if (typeof window === 'undefined') return false;
  return (window as Window & { __island17PaintedReferencesEnabled?: boolean }).__island17PaintedReferencesEnabled === true;
}

function createPaintedBackplate() {
  const root = new THREE.Group();
  root.name = 'ISLAND_17_PAINTED_SOURCE_LIKENESS_BACKPLATE';
  if (typeof document === 'undefined' || !shouldLoadPaintedReferences()) return root;
  const texture = new THREE.TextureLoader().load(ISLAND_17_PAINTED_BACKPLATE_URL);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    color: 0xffffff,
    transparent: true,
    opacity: 1,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.name = 'ISLAND_17_PAINTED_SOURCE_LIKENESS_SPRITE';
  sprite.position.set(0, 0.05, 2.3);
  sprite.scale.set(13.0, 22.75, 1);
  sprite.renderOrder = 10000;
  sprite.userData.keepSeparate = true;
  root.add(sprite);
  return root;
}

function createPaintedPartBillboard(partId: Island17PaintedPartId) {
  const root = new THREE.Group();
  root.name = `ISLAND_17_PAINTED_${partId.toUpperCase()}_SOURCE_LIKENESS_BILLBOARD`;
  const definition = ISLAND_17_PAINTED_PART_CROPS[partId];
  root.position.set(...definition.position);
  if (typeof document === 'undefined' || !shouldLoadPaintedReferences()) return root;

  const texture = new THREE.TextureLoader().load(ISLAND_17_PAINTED_BACKPLATE_URL);
  const { crop } = definition;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.offset.set(
    crop.x / ISLAND_17_PAINTED_TARGET_SIZE.width,
    1 - ((crop.y + crop.height) / ISLAND_17_PAINTED_TARGET_SIZE.height),
  );
  texture.repeat.set(
    crop.width / ISLAND_17_PAINTED_TARGET_SIZE.width,
    crop.height / ISLAND_17_PAINTED_TARGET_SIZE.height,
  );
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    color: 0xffffff,
    transparent: true,
    opacity: 1,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.name = `ISLAND_17_PAINTED_${partId.toUpperCase()}_SOURCE_LIKENESS_SPRITE`;
  sprite.scale.set(...definition.scale);
  sprite.renderOrder = 20000;
  sprite.userData.keepSeparate = true;
  sprite.userData.paintedPartId = partId;
  root.add(sprite);
  return root;
}

function maybeCreatePaintedLandmarkBillboard(landmarkId: string) {
  if (!Object.prototype.hasOwnProperty.call(ISLAND_17_PAINTED_PART_CROPS, landmarkId)) return null;
  return createPaintedPartBillboard(landmarkId as Island17PaintedPartId);
}

function createBoneRuinCity(materials: Island17TitansRestMaterials, quality: Island3DQuality, runtimeParts: Island17RuntimePart[]) {
  const root = new THREE.Group();
  root.name = 'ISLAND_17_BONE_RUIN_CITY';
  const clusters = amount(quality, 76, 58, 38);
  for (let index = 0; index < clusters; index += 1) {
    const angle = index / clusters * Math.PI * 2 + 0.07;
    const radius = 4.22 + (index % 7) * 0.19;
    if (!isIsland17RouteCorridorClear(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.14)) continue;
    const ruin = new THREE.Group();
    ruin.position.set(Math.cos(angle) * radius, 0.12, Math.sin(angle) * radius);
    const column = cylinder(0.065, 0.092, 0.48 + (index % 7) * 0.18, index % 2 ? materials.limestone : materials.agedBone, 5);
    column.position.y = 0.24;
    ruin.add(column);
    if (index % 3 === 0) {
      const cap = box(0.34, 0.055, 0.24, materials.bronze);
      cap.position.y = 0.58 + (index % 7) * 0.14;
      ruin.add(cap);
    }
    if (index % 4 === 0) {
      const skull = createSkullHead(materials, quality, 0.22 + (index % 3) * 0.032);
      skull.name = `ISLAND_17_RUIN_CITY_TINY_SKULL_${index + 1}`;
      skull.position.set(0.15, 0.28, -0.08);
      skull.rotation.y = angle + Math.PI;
      ruin.add(skull);
    }
    if (index % 5 === 0) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.034, 5, 10, Math.PI), materials.agedBone);
      arch.name = `ISLAND_17_RUIN_CITY_BONE_ARCH_${index + 1}`;
      arch.position.set(-0.04, 0.62, 0.03);
      arch.rotation.set(Math.PI / 2, 0, angle + Math.PI / 2);
      ruin.add(arch);
    }
    if (index % 6 === 0) {
      const hangingBone = tubeBetween(
        new THREE.Vector3(-0.16, 0.78, 0.02),
        new THREE.Vector3(0.18, 1.08 + (index % 3) * 0.08, -0.02),
        0.032,
        materials.bone,
        quality === 'low' ? 5 : 6,
      );
      hangingBone.name = `ISLAND_17_RUIN_CITY_SUSPENDED_BONE_BEAM_${index + 1}`;
      ruin.add(hangingBone);
    }
    root.add(ruin);
  }
  const vineCount = amount(quality, 34, 25, 16);
  for (let index = 0; index < vineCount; index += 1) {
    const angle = index / vineCount * Math.PI * 2 + 0.4;
    const radius = 5.05;
    root.add(curveTube([
      new THREE.Vector3(Math.cos(angle) * radius, 0.22, Math.sin(angle) * radius),
      new THREE.Vector3(Math.cos(angle + 0.07) * (radius + 0.08), -0.35, Math.sin(angle + 0.07) * (radius + 0.08)),
      new THREE.Vector3(Math.cos(angle + 0.12) * (radius + 0.18), -0.92, Math.sin(angle + 0.12) * (radius + 0.18)),
    ], 0.018, materials.vine, quality, 12));
  }
  root.userData.sculptRuntime = { parts: [registerIsland17RuntimePart('bone-ruin-city', root, 'ruins')] };
  runtimeParts.push(registerIsland17RuntimePart('bone-ruin-city', root, 'ruins'));
  return root;
}

export function createIsland17TitansRestLivingAmbience(
  scene: THREE.Scene,
  profile: Island3DQualityProfile,
  materials: Island17TitansRestMaterials,
  sharedWater: THREE.Mesh,
): Island17TitansRestAmbienceRuntime {
  const quality: Island3DQuality = profile.id;
  sharedWater.visible = false;
  scene.background = new THREE.Color(0x07111d);
  scene.fog = new THREE.FogExp2(0x081625, 0.012);
  const root = new THREE.Group();
  root.name = 'ISLAND_17_TITANS_REST_LIVING_AMBIENCE';
  const runtimeParts: Island17RuntimePart[] = [];
  root.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    world: 'island-017-titans-rest',
    parts: runtimeParts,
    sockets: { ambience: 'ISLAND_17_AMBIENCE_ORIGIN_SOCKET' },
    colliders: [{ id: 'island-017-floating-cliff-envelope', type: 'compound', isTrigger: false }],
    destructionGroups: [{ id: 'titans-rest-static-world', breakable: false, partIds: ['floating-cliff', 'rib-bridge-spine', 'bone-ruin-city'] }],
  };
  const ambienceSocket = new THREE.Object3D();
  ambienceSocket.name = 'ISLAND_17_AMBIENCE_ORIGIN_SOCKET';
  root.add(ambienceSocket);
  const stormBackground = createStormBackground(materials, quality, runtimeParts);
  const paintedBackplate = createPaintedBackplate();
  const cliff = createFloatingCliff(materials, quality, runtimeParts);
  const pit = createSoulfirePit(materials, quality, runtimeParts, false);
  const awakening = createTitanAwakeningThree();
  awakening.root.position.set(0, 2.9, -1.2);
  awakening.root.scale.setScalar(1.4);
  pit.add(awakening.root);
  // The island already has its authored well collar; the inspection inset has its own.
  awakening.root.getObjectByName('TITAN_INSPECTION_WELL_RING')!.visible = false;
  root.userData.disposeAwakening = awakening.dispose;
  // Static hit envelope stays fixed as the skull rises and unfolds.
  const skullHit = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  skullHit.name = 'ISLAND_17_AWAKENING_HIT_TARGET'; skullHit.position.set(0, 2.8, -1.2); pit.add(skullHit);
  let spineStage = 8;
  const ribBridge = createRibBridge(materials, quality, runtimeParts);
  const chainDepth = createChainAndWaterfallDepth(materials, quality, runtimeParts);
  const ruinCity = createBoneRuinCity(materials, quality, runtimeParts);
  const soulfireLights = [
    new THREE.PointLight(0x1bf2de, 1.6, 6, 2),
    new THREE.PointLight(0xffa853, 0.8, 5, 2),
  ];
  soulfireLights[0].position.set(0, 0.8, 0.4);
  soulfireLights[1].position.set(-3.2, 0.9, 3.8);
  const routeUnderlight = torus(ISLAND_3D_ROUTE_RADIUS, 0.025, materials.soulfire, segments(quality) * 4);
  routeUnderlight.name = 'ISLAND_17_ROUTE_SOULFIRE_UNDERLIGHT';
  routeUnderlight.position.y = -0.02;
  routeUnderlight.userData.keepSeparate = true;
  root.add(stormBackground, cliff, pit, ribBridge, chainDepth, ruinCity, routeUnderlight, paintedBackplate, ...soulfireLights);
  runtimeParts.push(registerIsland17RuntimePart('route-integration', routeUnderlight, 'canonical-board-route'));
  runtimeParts.push(registerIsland17RuntimePart('ambience-system', root, 'ambience'));
  [cliff, ribBridge, ruinCity].forEach((group) => {
    compactIsland17StaticGeometry(group, `${group.name}_STATIC`);
    group.userData.keepSeparate = true;
  });
  pit.userData.keepSeparate = true;
  scene.add(root);

  const animate = (elapsed: number) => {
    materials.soulfire.opacity = 0.68 + Math.sin(elapsed * 1.6) * 0.1;
    routeUnderlight.rotation.z = elapsed * 0.025;
    soulfireLights[0].intensity = 1.45 + Math.sin(elapsed * 1.35) * 0.28;
    soulfireLights[1].intensity = 0.74 + Math.sin(elapsed * 1.9 + 0.6) * 0.14;
    chainDepth.children.forEach((child, index) => {
      if (!child.name.startsWith('ISLAND_17_WATERFALL_STREAM_')) return;
      child.position.x = Math.sin(elapsed * 0.42 + index) * 0.035;
      child.scale.y = 1 + Math.sin(elapsed * 1.15 + index * 0.4) * 0.035;
    });
    stormBackground.children.forEach((child, index) => {
      if (!child.name.startsWith('ISLAND_17_STORM_CLOUD_')) return;
      const phase = Number(child.userData.phase ?? 0);
      child.position.x += Math.sin(elapsed * 0.18 + phase) * 0.0008 * (index % 2 ? -1 : 1);
    });
    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || child.material !== materials.banner) return;
      child.rotation.z = Math.sin(elapsed * 1.4 + Number(child.userData.phase ?? 0)) * 0.08;
    });
    const prefersReducedMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const animateRibMission = ribBridge.userData.animateMission as ((time: number, reducedMotion?: boolean) => void) | undefined;
    animateRibMission?.(elapsed, Boolean(prefersReducedMotion));
    awakening.animate(elapsed, Boolean(prefersReducedMotion));
    // Readable hints accumulate without moving the board or route.
    const pitLight = pit.getObjectByName('ISLAND_17_CENTRAL_SOULFIRE_LIGHT') as THREE.PointLight;
    if (pitLight) pitLight.intensity = .3 + spineStage * .22;
  };

  const updateView = (cameraPosition: THREE.Vector3, cameraTarget = new THREE.Vector3()) => {
    ribBridge.visible = true;
    stormBackground.visible = cameraPosition.y > -1;
    const paintedSprite = paintedBackplate.getObjectByName('ISLAND_17_PAINTED_SOURCE_LIKENESS_SPRITE') as THREE.Sprite | undefined;
    if (paintedSprite?.material instanceof THREE.SpriteMaterial) {
      const overviewLike = Math.abs(cameraTarget.x) < 1.2 && cameraTarget.z > 1.2 && cameraTarget.z < 3.8;
      paintedSprite.visible = overviewLike;
      paintedSprite.material.opacity = overviewLike ? 1 : 0;
    }
    const activeAmbiencePaintedPart = Math.abs(cameraTarget.x) < 1.1 && cameraTarget.z > 5.8 ? 'rib' : null;
    root.traverse((node) => {
      if (!node.userData.paintedPartId) return;
      node.visible = activeAmbiencePaintedPart === node.userData.paintedPartId;
    });
  };

  const updateStagedRestoration = (presentation: IslandStagedRestorationPresentation, immediate = false) => {
    ribBridge.userData.updateRestoration(presentation, immediate);
    spineStage = presentation.activatedStages;
    awakening.update(presentation.titanAwakening ?? sanitizeTitanAwakening({ phase: 6 }));
    awakening.root.visible = spineStage >= 8 || (presentation.titanAwakening?.phase ?? 6) >= 2;
  };
  return {
    root, animate, updateView, updateStagedRestoration,
    missionHitTarget: ribBridge.getObjectByName('ISLAND_17_SPINE_MISSION_HIT_TARGET')!,
  };
}
