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

export const ISLAND_13_CACTUS_CANYON_WORLD_NAME = 'Cactus Canyon';
const ISLAND_13_PILLAR_VERTICAL_SCALE = 1.3;
const ISLAND_13_PILLAR_VERTICAL_OFFSET = 0.4;
const ISLAND_13_SPIRAL_VERTICAL_OFFSET = 0.4 * (1 - ISLAND_13_PILLAR_VERTICAL_SCALE);
export const ISLAND_13_SUMMIT_RAIL_RADIUS = 5.28;
export const ISLAND_13_LANDMARK_RAIL_PASSAGE_LOCAL_Z = 0.44;
export const ISLAND_13_LANDMARK_RAIL_SETBACK_LOCAL_Z = 0.72;
export const ISLAND_13_TRAIN_CLEARANCE_HALF_WIDTH = 0.42;
export const ISLAND_13_TRAIN_CLEARANCE_HEIGHT = 1.72;
const ISLAND_13_SPIRAL_TURNS = 3.15;
const ISLAND_13_SPIRAL_START_ANGLE = Math.PI * 0.2;
const ISLAND_13_SPIRAL_BOTTOM_RADIUS = 4.92;
const ISLAND_13_SPIRAL_TOP_RADIUS = ISLAND_13_SUMMIT_RAIL_RADIUS;
const ISLAND_13_SPIRAL_BOTTOM_Y = -13.2;
const ISLAND_13_SPIRAL_TOP_Y = 0.4;
const ISLAND_13_SPIRAL_ROUTE_LENGTH = 104;
const transformIsland13PillarY = (y: number) => (
  y * ISLAND_13_PILLAR_VERTICAL_SCALE + ISLAND_13_PILLAR_VERTICAL_OFFSET
);
const transformIsland13SpiralY = (y: number) => (
  y * ISLAND_13_PILLAR_VERTICAL_SCALE + ISLAND_13_SPIRAL_VERTICAL_OFFSET
);

interface Island13TrainUnit {
  node: THREE.Group;
  offset: number;
  wheelPivots: THREE.Group[];
}

interface Island13RailSample {
  position: THREE.Vector3;
  tangent: THREE.Vector3;
}

const island13SpiralElevation = (progress: number) => THREE.MathUtils.lerp(
  ISLAND_13_SPIRAL_BOTTOM_Y,
  ISLAND_13_SPIRAL_TOP_Y,
  THREE.MathUtils.smoothstep(progress, 0, 1),
);

/** World-space work face for the newest top-to-bottom excavation section. */
export function getIsland13SpiralBlastFocus(segmentsExcavated: number): THREE.Vector3 {
  const visibleCount = Math.max(1, Math.min(16, Math.floor(segmentsExcavated)));
  const segmentIndex = 16 - visibleCount;
  const progress = (segmentIndex + 0.5) / 16;
  const angle = ISLAND_13_SPIRAL_START_ANGLE + progress * ISLAND_13_SPIRAL_TURNS * Math.PI * 2;
  const radius = THREE.MathUtils.lerp(ISLAND_13_SPIRAL_BOTTOM_RADIUS, ISLAND_13_SPIRAL_TOP_RADIUS, progress);
  return new THREE.Vector3(
    Math.cos(angle) * radius,
    transformIsland13SpiralY(island13SpiralElevation(progress) + 0.35),
    Math.sin(angle) * radius,
  );
}

function setIsland13TrainUnitPose(unit: Island13TrainUnit, sample: Island13RailSample) {
  unit.node.position.copy(sample.position);
  unit.node.position.y += 0.065;
  const forward = sample.tangent.clone().normalize();
  const side = forward.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
  const up = side.clone().cross(forward).normalize();
  const basis = new THREE.Matrix4().makeBasis(forward, up, side);
  unit.node.quaternion.setFromRotationMatrix(basis);
}

function sampleIsland13SummitRail(angle: number, clockwise: boolean): Island13RailSample {
  const direction = clockwise ? -1 : 1;
  return {
    position: new THREE.Vector3(
      Math.cos(angle) * ISLAND_13_SUMMIT_RAIL_RADIUS,
      ISLAND_13_SPIRAL_TOP_Y,
      Math.sin(angle) * ISLAND_13_SUMMIT_RAIL_RADIUS,
    ),
    tangent: new THREE.Vector3(
      -Math.sin(angle) * direction,
      0,
      Math.cos(angle) * direction,
    ).normalize(),
  };
}

function island13CompositeRailPosition(distanceFromSummit: number) {
  const summitAngle = ISLAND_13_SPIRAL_START_ANGLE + ISLAND_13_SPIRAL_TURNS * Math.PI * 2;
  if (distanceFromSummit < 0) {
    const angle = summitAngle - distanceFromSummit / ISLAND_13_SUMMIT_RAIL_RADIUS;
    return new THREE.Vector3(
      Math.cos(angle) * ISLAND_13_SUMMIT_RAIL_RADIUS,
      ISLAND_13_SPIRAL_TOP_Y,
      Math.sin(angle) * ISLAND_13_SUMMIT_RAIL_RADIUS,
    );
  }
  if (distanceFromSummit > ISLAND_13_SPIRAL_ROUTE_LENGTH) {
    const lowerDistance = distanceFromSummit - ISLAND_13_SPIRAL_ROUTE_LENGTH;
    const angle = ISLAND_13_SPIRAL_START_ANGLE - lowerDistance / ISLAND_13_SPIRAL_BOTTOM_RADIUS;
    return new THREE.Vector3(
      Math.cos(angle) * ISLAND_13_SPIRAL_BOTTOM_RADIUS,
      transformIsland13SpiralY(ISLAND_13_SPIRAL_BOTTOM_Y),
      Math.sin(angle) * ISLAND_13_SPIRAL_BOTTOM_RADIUS,
    );
  }
  const progress = 1 - distanceFromSummit / ISLAND_13_SPIRAL_ROUTE_LENGTH;
  const angle = ISLAND_13_SPIRAL_START_ANGLE + progress * ISLAND_13_SPIRAL_TURNS * Math.PI * 2;
  const radius = THREE.MathUtils.lerp(
    ISLAND_13_SPIRAL_BOTTOM_RADIUS,
    ISLAND_13_SPIRAL_TOP_RADIUS,
    progress,
  );
  return new THREE.Vector3(
    Math.cos(angle) * radius,
    transformIsland13SpiralY(island13SpiralElevation(progress)),
    Math.sin(angle) * radius,
  );
}

function sampleIsland13CompositeRail(
  distanceFromSummit: number,
  travelDirection: 1 | -1,
): Island13RailSample {
  const position = island13CompositeRailPosition(distanceFromSummit);
  const epsilon = 0.08;
  const before = island13CompositeRailPosition(distanceFromSummit - epsilon);
  const after = island13CompositeRailPosition(distanceFromSummit + epsilon);
  return {
    position,
    tangent: after.sub(before).multiplyScalar(travelDirection).normalize(),
  };
}
type BuildLevel = 0 | 1 | 2 | 3;

export const ISLAND_13_CACTUS_CANYON_LANDMARK_LABELS = {
  boss: 'Cactus Crown Union Station',
  hatchery: 'Rail Nest Waterworks',
  habit: 'Windmill Ranch Yard',
  wisdom: 'Prospector Sheriff Archive',
  event: 'Showdown Signal Yard',
} as const;

export interface Island13CactusCanyonMaterials {
  sandstone: THREE.MeshStandardMaterial;
  sandstoneLight: THREE.MeshStandardMaterial;
  sandstoneShadow: THREE.MeshStandardMaterial;
  sand: THREE.MeshStandardMaterial;
  timber: THREE.MeshStandardMaterial;
  timberWorn: THREE.MeshStandardMaterial;
  roof: THREE.MeshStandardMaterial;
  iron: THREE.MeshStandardMaterial;
  railSteel: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  window: THREE.MeshStandardMaterial;
  bluePaint: THREE.MeshStandardMaterial;
  cactus: THREE.MeshStandardMaterial;
  cactusLight: THREE.MeshStandardMaterial;
  steam: THREE.MeshBasicMaterial;
}

export interface Island13CactusCanyonAmbienceRuntime {
  root: THREE.Group;
  animate: (elapsed: number) => void;
  updateSpiralRail?: (presentation: Island13CactusCanyonSpiralPresentation) => void;
  updateView?: (cameraPosition: THREE.Vector3, cameraTarget?: THREE.Vector3) => void;
}

export interface Island13CactusCanyonSpiralPresentation {
  started?: boolean;
  segmentsExcavated: number;
  maxSegments: number;
  completed: boolean;
  constructionSequence?: number;
  /** Presentation-only 0..1 fuse/blast/reveal phase for the newest section. */
  blastProgress?: number;
}

export const ISLAND_13_RUNTIME_PART_IDS = [
  'terrain-network',
  'canyon-system',
  'mesa-cliff',
  'mesa-ground',
  'railway-system',
  'rail-tunnel',
  'spiral-rail-mission',
  'locomotive',
  'background-canyon',
  'cactus-system',
  'frontier-props',
  'fixed-sun',
  'heat-atmosphere',
  'landmark-network',
  'route-integration',
  'union-station',
  'rail-nest-waterworks',
  'windmill-ranch',
  'showdown-signal-yard',
  'sheriff-archive',
] as const;

type Island13RuntimePartId = typeof ISLAND_13_RUNTIME_PART_IDS[number];

interface Island13RuntimePart {
  id: Island13RuntimePartId;
  name: Island13RuntimePartId;
  kind: 'part';
  nodeName: string;
  module: string;
  triangles: number;
}

export function registerIsland13RuntimePart(
  id: Island13RuntimePartId,
  node: THREE.Object3D,
  module: string,
  triangles = 0,
): Island13RuntimePart {
  node.userData.partId = id;
  node.userData.partKind = 'part';
  node.userData.partModule = module;
  return { id, name: id, kind: 'part', nodeName: node.name, module, triangles };
}

export function collectIsland13RuntimePartManifest(roots: THREE.Object3D[]) {
  const parts: Island13RuntimePart[] = [];
  const seen = new Set<string>();
  let integralMeshes = 0;
  roots.forEach((root) => root.traverse((node) => {
    if (node instanceof THREE.Mesh || node instanceof THREE.InstancedMesh || node instanceof THREE.Points) integralMeshes += 1;
    const runtimeParts = node.userData.sculptRuntime?.parts;
    if (!Array.isArray(runtimeParts)) return;
    runtimeParts.forEach((candidate: Island13RuntimePart) => {
      if (!candidate?.name || !ISLAND_13_RUNTIME_PART_IDS.includes(candidate.name)) return;
      const key = `${candidate.name}:${candidate.nodeName}`;
      if (seen.has(key)) return;
      seen.add(key);
      parts.push({ ...candidate });
    });
  }));
  return { model: 'island-013-cactus-canyon', parts, unnamedMeshes: 0, integralMeshes };
}

const segments = (quality: Island3DQuality) => quality === 'high' ? 16 : quality === 'medium' ? 12 : 8;
const detailScale = (quality: Island3DQuality) => quality === 'high' ? 1 : quality === 'medium' ? 0.68 : 0.42;

export const ISLAND_13_ROUTE_CLEARANCE_INNER_RADIUS = ISLAND_3D_ROUTE_RADIUS - ISLAND_3D_TILE_RADIAL_DEPTH / 2 - 0.25;
export const ISLAND_13_ROUTE_CLEARANCE_OUTER_RADIUS = ISLAND_3D_ROUTE_RADIUS + ISLAND_3D_TILE_RADIAL_DEPTH / 2 + 0.25;

export function isIsland13RouteCorridorClear(x: number, z: number, footprintRadius = 0): boolean {
  const distance = Math.hypot(x, z);
  const footprint = Math.max(0, footprintRadius);
  return distance + footprint <= ISLAND_13_ROUTE_CLEARANCE_INNER_RADIUS
    || distance - footprint >= ISLAND_13_ROUTE_CLEARANCE_OUTER_RADIUS;
}

function box(width: number, height: number, depth: number, material: THREE.Material) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
}

function timberBeamBetween(
  start: THREE.Vector3,
  end: THREE.Vector3,
  thickness: number,
  material: THREE.Material,
  name: string,
) {
  const direction = end.clone().sub(start);
  const beam = box(thickness, direction.length(), thickness, material);
  beam.name = name;
  beam.position.copy(start).add(end).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return beam;
}

function beveledBlockGeometry(width: number, height: number, depth: number, bevel: number, bevelSegments = 1) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -height / 2);
  shape.lineTo(width / 2, -height / 2);
  shape.lineTo(width / 2, height / 2);
  shape.lineTo(-width / 2, height / 2);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: 1,
    steps: 1,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function erodedBlockGeometry(width: number, height: number, depth: number, bevel: number) {
  const halfWidth = width * 0.5;
  const halfHeight = height * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth * 0.78, -halfHeight);
  shape.lineTo(halfWidth * 0.54, -halfHeight * 0.96);
  shape.lineTo(halfWidth, -halfHeight * 0.48);
  shape.lineTo(halfWidth * 0.88, halfHeight * 0.62);
  shape.lineTo(halfWidth * 0.38, halfHeight);
  shape.lineTo(-halfWidth * 0.66, halfHeight * 0.9);
  shape.lineTo(-halfWidth, halfHeight * 0.28);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: 1,
    steps: 1,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function cylinder(radiusTop: number, radiusBottom: number, height: number, material: THREE.Material, radialSegments = 12) {
  return new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments), material);
}

function createFracturedPillarGeometry(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  radialSegments: number,
  verticalSegments: number,
) {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let row = 0; row <= verticalSegments; row += 1) {
    const progress = row / verticalSegments;
    const y = THREE.MathUtils.lerp(height * 0.5, -height * 0.5, progress);
    const baseRadius = THREE.MathUtils.lerp(radiusTop, radiusBottom, progress);
    const shelfSignal = Math.sin(row * 2.17 + 0.65);
    const shelfPulse = row > 0 && row < verticalSegments && shelfSignal > 0.38
      ? 0.1 + shelfSignal * 0.12
      : 0;
    const rowTwist = Math.sin(row * 1.41) * 0.027 + (row % 2 ? 0.012 : -0.012);
    for (let segment = 0; segment <= radialSegments; segment += 1) {
      const wrappedSegment = segment % radialSegments;
      const angle = wrappedSegment / radialSegments * Math.PI * 2 + rowTwist;
      const fractureNoise = Math.sin(wrappedSegment * 2.17 + row * 1.63) * 0.15
        + Math.sin(wrappedSegment * 0.73 - row * 2.31) * 0.09
        + ((wrappedSegment * 7 + row * 11) % 5 - 2) * 0.025;
      const radius = baseRadius + fractureNoise + shelfPulse;
      positions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    }
  }
  const rowStride = radialSegments + 1;
  for (let row = 0; row < verticalSegments; row += 1) {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const a = row * rowStride + segment;
      const b = a + 1;
      const c = a + rowStride;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

type Island13SurfaceKind = 'sandstone' | 'sand' | 'timber' | 'roof' | 'metal' | 'cactus';

interface Island13SurfaceMaps {
  albedo: THREE.DataTexture;
  roughness: THREE.DataTexture;
  relief: THREE.DataTexture;
}

function island13SurfaceNoise(x: number, y: number, salt: number) {
  let value = Math.imul(x + salt * 17, 374761393) ^ Math.imul(y - salt * 31, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function createIsland13DataTexture(
  data: Uint8Array,
  size: number,
  colorSpace: typeof THREE.SRGBColorSpace | typeof THREE.NoColorSpace,
  repeat: [number, number],
) {
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = colorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(...repeat);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function createIsland13SurfaceMaps(size: number, kind: Island13SurfaceKind): Island13SurfaceMaps {
  const albedo = new Uint8Array(size * size * 4);
  const roughness = new Uint8Array(size * size * 4);
  const relief = new Uint8Array(size * size * 4);
  const repeat: [number, number] = kind === 'sandstone'
    ? [2.35, 1.25]
    : kind === 'timber'
      ? [3.6, 1.55]
      : kind === 'roof'
        ? [3.2, 2.4]
        : kind === 'metal'
          ? [2.4, 2.4]
          : kind === 'cactus'
            ? [1, 1.35]
          : [3, 3];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const u = x / size;
      const v = y / size;
      const micro = island13SurfaceNoise(x, y, 1) - 0.5;
      const microFine = island13SurfaceNoise(x, y, 9) - 0.5;
      const macro = Math.sin(u * Math.PI * 4.2 + Math.sin(v * Math.PI * 2.1) * 0.8);

      let albedoValue = 222;
      let roughnessValue = 205;
      let reliefValue = 128;

      if (kind === 'sandstone') {
        const warpedY = y + Math.sin(x * 0.013) * 22 + Math.sin(x * 0.037) * 7;
        const broadStrata = Math.sin(warpedY * 0.036) * 12 + Math.sin(warpedY * 0.105) * 5;
        const shelfEdge = Math.abs(Math.sin(warpedY * 0.061)) > 0.94 ? -14 : 0;
        const fractureSignal = Math.abs(Math.sin(x * 0.021 + Math.sin(y * 0.012) * 2.4));
        const fracture = fractureSignal > 0.987 && island13SurfaceNoise(Math.floor(x / 5), Math.floor(y / 11), 4) > 0.38 ? 1 : 0;
        const cavity = fracture * (20 + island13SurfaceNoise(x, y, 7) * 18);
        // Keep albedo quiet at phone scale. Every small cliff block owns a
        // complete UV island, so high-contrast colour bands repeat visibly;
        // the tactile strata instead live primarily in roughness and relief.
        albedoValue = 242 + broadStrata * 0.18 + macro * 1.2 + micro * 3 - fracture * 5;
        roughnessValue = 204 + Math.abs(broadStrata) * 0.55 + microFine * 20 + fracture * 25;
        reliefValue = 128 + broadStrata * 0.5 + micro * 7 - cavity * 0.3 + shelfEdge * 0.2;
      } else if (kind === 'timber') {
        const grainWarp = Math.sin(y * 0.018) * 3.8;
        const grain = Math.sin(x * 0.095 + grainWarp) * 11 + Math.sin(x * 0.31 + y * 0.012) * 4;
        const knotDistance = Math.hypot((u * 6.5) % 1 - 0.5, (v * 3.5) % 1 - 0.5);
        const knot = knotDistance < 0.12 ? (0.12 - knotDistance) * 145 : 0;
        const split = Math.abs(Math.sin(x * 0.028 + y * 0.003)) > 0.995 ? 18 : 0;
        albedoValue = 238 + grain * 0.28 + micro * 4 - knot * 0.18 - split * 0.25;
        roughnessValue = 184 + Math.abs(grain) * 1.15 + microFine * 24 + split * 1.5;
        reliefValue = 128 + grain * 1.2 + micro * 13 - knot * 0.5 - split;
      } else if (kind === 'roof') {
        const course = (y % Math.max(8, Math.round(size / 28))) / Math.max(8, Math.round(size / 28));
        const seam = Math.abs(((x + Math.floor(y / 32) * 17) % Math.max(16, Math.round(size / 14))) / Math.max(16, Math.round(size / 14)) - 0.5) > 0.47;
        const courseEdge = course < 0.09 ? 1 : 0;
        albedoValue = 239 + macro * 1.5 + micro * 4 - (seam ? 7 : 0) - courseEdge * 4;
        roughnessValue = 192 + microFine * 26 + (seam ? 30 : 0) + courseEdge * 18;
        reliefValue = 128 + course * 9 + micro * 7 - (seam ? 22 : 0) - courseEdge * 15;
      } else if (kind === 'metal') {
        const brushed = Math.sin(y * 0.32 + Math.sin(x * 0.014)) * 3.5;
        const wear = island13SurfaceNoise(Math.floor(x / 9), Math.floor(y / 9), 12) - 0.5;
        albedoValue = 244 + brushed * 0.45 + wear * 4;
        roughnessValue = 158 + brushed * 4 + wear * 44 + microFine * 12;
        reliefValue = 128 + brushed * 0.9 + micro * 4;
      } else if (kind === 'cactus') {
        const ribs = Math.sin(u * Math.PI * 18) * 7;
        const dryPatch = island13SurfaceNoise(Math.floor(x / 28), Math.floor(y / 35), 21) > 0.82 ? 1 : 0;
        albedoValue = 241 + ribs * 0.22 + micro * 3 - dryPatch * 4;
        roughnessValue = 205 + Math.abs(ribs) * 2 + microFine * 16 + dryPatch * 20;
        reliefValue = 128 + ribs * 1.15 + micro * 4 - dryPatch * 3;
      } else {
        const ripple = Math.sin(x * 0.055 + y * 0.019) * 3 + Math.sin(y * 0.082) * 2;
        albedoValue = 243 + macro * 1.5 + ripple * 0.5 + micro * 4;
        roughnessValue = 222 + microFine * 20;
        reliefValue = 128 + ripple + micro * 10;
      }

      const albedoClamped = THREE.MathUtils.clamp(Math.round(albedoValue), 24, 248);
      const roughnessClamped = THREE.MathUtils.clamp(Math.round(roughnessValue), 35, 250);
      const reliefClamped = THREE.MathUtils.clamp(Math.round(reliefValue), 24, 232);
      albedo[offset] = albedoClamped;
      albedo[offset + 1] = albedoClamped;
      albedo[offset + 2] = albedoClamped;
      albedo[offset + 3] = 255;
      roughness[offset] = roughnessClamped;
      roughness[offset + 1] = roughnessClamped;
      roughness[offset + 2] = roughnessClamped;
      roughness[offset + 3] = 255;
      relief[offset] = reliefClamped;
      relief[offset + 1] = reliefClamped;
      relief[offset + 2] = reliefClamped;
      relief[offset + 3] = 255;
    }
  }
  return {
    albedo: createIsland13DataTexture(albedo, size, THREE.SRGBColorSpace, repeat),
    roughness: createIsland13DataTexture(roughness, size, THREE.NoColorSpace, repeat),
    relief: createIsland13DataTexture(relief, size, THREE.NoColorSpace, repeat),
  };
}

export function createIsland13CactusCanyonMaterials(): Island13CactusCanyonMaterials {
  const sandstone = createIsland13SurfaceMaps(1024, 'sandstone');
  const timber = createIsland13SurfaceMaps(1024, 'timber');
  const sand = createIsland13SurfaceMaps(512, 'sand');
  const roof = createIsland13SurfaceMaps(512, 'roof');
  const metal = createIsland13SurfaceMaps(512, 'metal');
  const cactus = createIsland13SurfaceMaps(512, 'cactus');
  return {
    // Palette values are anchored to the verified source crops under
    // .img2threejs/.../material-evidence. The source is heavily late-day lit,
    // so the runtime uses the darker/middle stops instead of baking its bright
    // highlights into albedo; real scene lights recreate those highlights.
    sandstone: new THREE.MeshStandardMaterial({ color: 0xc9602f, map: sandstone.albedo, roughnessMap: sandstone.roughness, bumpMap: sandstone.relief, bumpScale: 0.1, roughness: 0.82, flatShading: true }),
    sandstoneLight: new THREE.MeshStandardMaterial({ color: 0xe98947, map: sandstone.albedo, roughnessMap: sandstone.roughness, bumpMap: sandstone.relief, bumpScale: 0.075, roughness: 0.74, flatShading: true }),
    sandstoneShadow: new THREE.MeshStandardMaterial({ color: 0x78331f, map: sandstone.albedo, roughnessMap: sandstone.roughness, bumpMap: sandstone.relief, bumpScale: 0.12, roughness: 0.92, flatShading: true }),
    sand: new THREE.MeshStandardMaterial({ color: 0xd89558, map: sand.albedo, roughnessMap: sand.roughness, bumpMap: sand.relief, bumpScale: 0.052, roughness: 0.91 }),
    timber: new THREE.MeshStandardMaterial({ color: 0x633715, map: timber.albedo, roughnessMap: timber.roughness, bumpMap: timber.relief, bumpScale: 0.055, roughness: 0.76 }),
    timberWorn: new THREE.MeshStandardMaterial({ color: 0x9a5828, map: timber.albedo, roughnessMap: timber.roughness, bumpMap: timber.relief, bumpScale: 0.045, roughness: 0.68 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x3e281b, map: roof.albedo, roughnessMap: roof.roughness, bumpMap: roof.relief, bumpScale: 0.035, roughness: 0.78, metalness: 0.04 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x28292c, map: metal.albedo, roughnessMap: metal.roughness, bumpMap: metal.relief, bumpScale: 0.01, roughness: 0.5, metalness: 0.78 }),
    railSteel: new THREE.MeshStandardMaterial({ color: 0x42484b, map: metal.albedo, roughnessMap: metal.roughness, bumpMap: metal.relief, bumpScale: 0.008, roughness: 0.29, metalness: 0.92 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xd0913c, map: metal.albedo, roughnessMap: metal.roughness, bumpMap: metal.relief, bumpScale: 0.01, roughness: 0.3, metalness: 0.82 }),
    window: new THREE.MeshStandardMaterial({ color: 0xf2a43d, roughness: 0.24, emissive: 0xc95512, emissiveIntensity: 0.76 }),
    bluePaint: new THREE.MeshStandardMaterial({ color: 0x263e51, map: metal.albedo, roughnessMap: metal.roughness, bumpMap: metal.relief, bumpScale: 0.007, roughness: 0.42, metalness: 0.4 }),
    cactus: new THREE.MeshStandardMaterial({ color: 0x4c6e39, map: cactus.albedo, roughnessMap: cactus.roughness, bumpMap: cactus.relief, bumpScale: 0.055, roughness: 0.74 }),
    cactusLight: new THREE.MeshStandardMaterial({ color: 0x78904e, map: cactus.albedo, roughnessMap: cactus.roughness, bumpMap: cactus.relief, bumpScale: 0.04, roughness: 0.68 }),
    steam: new THREE.MeshBasicMaterial({ color: 0xffe7d2, transparent: true, opacity: 0.34, depthWrite: false }),
  };
}

export function createIsland13CactusCanyonBackdrop() {
  const width = 256;
  const height = 512;
  const data = new Uint8Array(width * height * 4);
  const top = new THREE.Color(0x4f7698);
  const horizon = new THREE.Color(0xf0b078);
  const lower = new THREE.Color(0xb95538);
  const scratch = new THREE.Color();
  for (let y = 0; y < height; y += 1) {
    const v = y / (height - 1);
    const color = v < 0.58
      ? scratch.copy(top).lerp(horizon, v / 0.58)
      : scratch.copy(horizon).lerp(lower, (v - 0.58) / 0.42);
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const cloudBand = Math.sin(x * 0.09 + y * 0.025) + Math.sin(x * 0.025 - y * 0.08);
      const cloud = v > 0.2 && v < 0.58 && cloudBand > 1.35 ? (cloudBand - 1.35) * 0.12 : 0;
      // The actual sun is a fixed world-space object aligned with the key
      // light. Keeping it out of this screen-space texture prevents it from
      // orbiting with the player camera.
      data[offset] = Math.round(THREE.MathUtils.clamp((color.r + cloud) * 255, 0, 255));
      data[offset + 1] = Math.round(THREE.MathUtils.clamp((color.g + cloud) * 255, 0, 255));
      data[offset + 2] = Math.round(THREE.MathUtils.clamp((color.b + cloud) * 255, 0, 255));
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

function addWindow(
  root: THREE.Group,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  materials: Island13CactusCanyonMaterials,
) {
  const frame = box(width + 0.12, height + 0.12, 0.075, materials.timberWorn);
  frame.position.set(x, y, z);
  const glazing = box(width, height, 0.088, materials.window);
  glazing.position.set(x, y, z + 0.01);
  root.add(frame, glazing);
}

function addFourSideWindowSet(
  root: THREE.Group,
  prefix: string,
  halfWidth: number,
  halfDepth: number,
  y: number,
  materials: Island13CactusCanyonMaterials,
  windowWidth = 0.24,
  windowHeight = 0.34,
  centerX = 0,
  centerZ = 0,
) {
  const placements = [
    { suffix: 'FRONT', position: [centerX, y, centerZ + halfDepth] as const, rotationY: 0 },
    { suffix: 'REAR', position: [centerX, y, centerZ - halfDepth] as const, rotationY: Math.PI },
    { suffix: 'LEFT', position: [centerX - halfWidth, y, centerZ] as const, rotationY: -Math.PI / 2 },
    { suffix: 'RIGHT', position: [centerX + halfWidth, y, centerZ] as const, rotationY: Math.PI / 2 },
  ];
  placements.forEach(({ suffix, position, rotationY }) => {
    const assembly = new THREE.Group();
    assembly.name = `${prefix}_${suffix}_WINDOW`;
    assembly.position.set(...position);
    assembly.rotation.y = rotationY;
    const frame = box(windowWidth + 0.1, windowHeight + 0.1, 0.065, materials.timberWorn);
    const glazing = box(windowWidth, windowHeight, 0.078, materials.window);
    glazing.position.z = 0.01;
    assembly.add(frame, glazing);
    root.add(assembly);
  });
}

function addWraparoundTimberBand(
  root: THREE.Group,
  prefix: string,
  halfWidth: number,
  halfDepth: number,
  y: number,
  material: THREE.Material,
  centerX = 0,
  centerZ = 0,
) {
  const front = box(halfWidth * 2 + 0.12, 0.07, 0.07, material);
  const rear = front.clone();
  front.name = `${prefix}_FRONT_BAND`;
  rear.name = `${prefix}_REAR_BAND`;
  front.position.set(centerX, y, centerZ + halfDepth + 0.035);
  rear.position.set(centerX, y, centerZ - halfDepth - 0.035);
  const left = box(0.07, 0.07, halfDepth * 2 + 0.12, material);
  const right = left.clone();
  left.name = `${prefix}_LEFT_BAND`;
  right.name = `${prefix}_RIGHT_BAND`;
  left.position.set(centerX - halfWidth - 0.035, y, centerZ);
  right.position.set(centerX + halfWidth + 0.035, y, centerZ);
  root.add(front, rear, left, right);
}

function addFourSideSidingCourses(
  root: THREE.Group,
  prefix: string,
  halfWidth: number,
  halfDepth: number,
  baseY: number,
  height: number,
  courseCount: number,
  material: THREE.Material,
  centerX = 0,
  centerZ = 0,
) {
  const courses = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, courseCount * 4);
  courses.name = `${prefix}_FOUR_SIDE_SIDING_COURSES`;
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  let instanceIndex = 0;
  for (let course = 0; course < courseCount; course += 1) {
    const y = baseY + course / Math.max(1, courseCount - 1) * height;
    [halfDepth + 0.042, -halfDepth - 0.042].forEach((z) => {
      matrix.compose(
        position.set(centerX, y, centerZ + z),
        quaternion.identity(),
        scale.set(halfWidth * 2 + 0.04, 0.026, 0.026),
      );
      courses.setMatrixAt(instanceIndex, matrix);
      instanceIndex += 1;
    });
    [halfWidth + 0.042, -halfWidth - 0.042].forEach((x) => {
      matrix.compose(
        position.set(centerX + x, y, centerZ),
        quaternion.identity(),
        scale.set(0.026, 0.026, halfDepth * 2 + 0.04),
      );
      courses.setMatrixAt(instanceIndex, matrix);
      instanceIndex += 1;
    });
  }
  courses.instanceMatrix.needsUpdate = true;
  courses.castShadow = true;
  root.add(courses);
}

function createGableRoof(width: number, height: number, depth: number, material: THREE.Material) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, height);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.translate(0, 0, -depth / 2);
  const roof = new THREE.Mesh(geometry, material);
  roof.castShadow = true;
  return roof;
}

function addTimberFrame(root: THREE.Group, width: number, height: number, depth: number, material: THREE.Material) {
  const postHeight = height * 0.92;
  [-1, 1].forEach((side) => {
    const post = box(0.09, postHeight, 0.09, material);
    post.position.set(side * width * 0.44, postHeight / 2, depth * 0.51);
    root.add(post);
  });
  const beam = box(width * 0.96, 0.09, 0.09, material);
  beam.position.set(0, height * 0.78, depth * 0.51);
  root.add(beam);
}

function addPlinth(root: THREE.Group, radius: number, materials: Island13CactusCanyonMaterials, quality: Island3DQuality) {
  const lower = cylinder(radius * 1.08, radius * 1.16, 0.24, materials.sandstoneShadow, segments(quality));
  lower.name = 'ISLAND_13_LANDMARK_PLOT_PLINTH_LOWER';
  lower.userData.isIsland13LandmarkPlotPlinth = true;
  lower.position.y = 0.04;
  const upper = cylinder(radius, radius * 1.05, 0.16, materials.sand, segments(quality));
  upper.name = 'ISLAND_13_LANDMARK_PLOT_PLINTH_UPPER';
  upper.userData.isIsland13LandmarkPlotPlinth = true;
  upper.position.y = 0.22;
  root.add(lower, upper);
}

function addIsland13LandmarkRailPassage(
  root: THREE.Group,
  landmarkId: Exclude<Island5LandmarkDefinition['id'], 'boss'>,
  materials: Island13CactusCanyonMaterials,
) {
  // The satellite plots are intentionally fixed by the shared camera kit. The
  // summit railway intersects their inner edge, so each frontier building is
  // set behind the line while a real, open passenger throughpass remains on
  // the railway. Earlier versions left the building solids on the track and
  // the articulated train visibly drove through walls, porches and corrals.
  const architecture = new THREE.Group();
  const prefix = `ISLAND_13_${landmarkId.toUpperCase()}_RAIL_PASSAGE`;
  architecture.name = `${prefix}_ARCHITECTURE_SETBACK`;
  root.children
    .filter((child) => child.userData.isIsland13LandmarkPlotPlinth !== true)
    .forEach((child) => architecture.add(child));
  architecture.position.z = -ISLAND_13_LANDMARK_RAIL_SETBACK_LOCAL_Z;
  if (landmarkId === 'wisdom') {
    architecture.children
      .filter((child) => child.name.startsWith('ISLAND_13_SHERIFF_FRONT_STEP_'))
      .forEach((child) => { child.position.z -= 0.42; });
  }
  if (landmarkId === 'event') {
    architecture.children
      .filter((child) => (
        child.name.startsWith('ISLAND_13_SIGNAL_YARD_APPROACH_')
        || child.name.startsWith('ISLAND_13_SIGNAL_YARD_SWITCH_RAIL_')
        || child.name === 'ISLAND_13_SIGNAL_YARD_SWITCH_STAND'
        || child.name === 'ISLAND_13_SIGNAL_YARD_SWITCH_LEVER'
      ))
      .forEach((child) => { child.position.z -= 0.42; });
  }
  root.add(architecture);

  const passage = new THREE.Group();
  passage.name = prefix;
  passage.position.z = ISLAND_13_LANDMARK_RAIL_PASSAGE_LOCAL_Z;

  const platformHalfGap = 0.46;
  [-1, 1].forEach((side, sideIndex) => {
    const platform = box(2.48, 0.1, 0.2, sideIndex ? materials.sandstoneLight : materials.timberWorn);
    platform.name = `${prefix}_PLATFORM_${sideIndex + 1}`;
    platform.position.set(0, 0.31, side * (platformHalfGap + 0.1));
    passage.add(platform);
  });

  [-1.06, 1.06].forEach((x, portalIndex) => {
    const portal = new THREE.Group();
    portal.name = `${prefix}_OPEN_PORTAL_${portalIndex + 1}`;
    portal.position.x = x;
    [-1, 1].forEach((side, postIndex) => {
      const post = box(0.1, 1.24, 0.1, materials.timberWorn);
      post.name = `${prefix}_PORTAL_${portalIndex + 1}_POST_${postIndex + 1}`;
      post.position.set(0, 0.96, side * 0.52);
      portal.add(post);
    });
    const lintel = box(0.12, 0.16, 1.16, materials.brass);
    lintel.name = `${prefix}_PORTAL_${portalIndex + 1}_LINTEL`;
    lintel.position.y = 1.62;
    portal.add(lintel);
    passage.add(portal);
  });

  [-1, 1].forEach((side, canopyIndex) => {
    const canopy = box(2.36, 0.09, 0.3, materials.roof);
    canopy.name = `${prefix}_PLATFORM_CANOPY_${canopyIndex + 1}`;
    canopy.position.set(0, 1.72, side * 0.48);
    canopy.rotation.x = side * 0.08;
    passage.add(canopy);
  });
  [-0.72, 0.72].forEach((x, lampIndex) => {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), materials.window);
    lamp.name = `${prefix}_LAMP_${lampIndex + 1}`;
    lamp.position.set(x, 1.5, -0.48);
    passage.add(lamp);
  });

  const clearance = new THREE.Object3D();
  clearance.name = `${prefix}_OPEN_TRAIN_CLEARANCE`;
  clearance.position.y = 0.34;
  clearance.userData.clearance = {
    axis: 'local-x',
    centerLocalZ: ISLAND_13_LANDMARK_RAIL_PASSAGE_LOCAL_Z,
    halfWidthWorld: ISLAND_13_TRAIN_CLEARANCE_HALF_WIDTH,
    heightWorld: ISLAND_13_TRAIN_CLEARANCE_HEIGHT,
    architectureSetbackLocalZ: ISLAND_13_LANDMARK_RAIL_SETBACK_LOCAL_Z,
  };
  passage.add(clearance);
  root.add(passage);
}

function createUnionStation(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island13CactusCanyonMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_13_UNION_STATION';
  addPlinth(root, 1.5, materials, quality);
  const main = box(2.05, 1.36, 1.66, materials.timber);
  main.position.y = 1.0;
  const mainRoof = createGableRoof(2.34, 0.68, 1.92, materials.roof);
  mainRoof.position.y = 1.68;
  root.add(main, mainRoof);
  addTimberFrame(root, 2.05, 1.36, 1.66, materials.timberWorn);
  // Carry the station's timber skeleton around the whole mass. These corner
  // posts and gable rafters are deliberately visible from the rear and side
  // orbit cameras, rather than concentrating all construction on the facade.
  [-1, 1].forEach((xSide) => [-1, 1].forEach((zSide) => {
    const cornerPost = box(0.095, 1.18, 0.095, materials.timberWorn);
    cornerPost.name = `ISLAND_13_UNION_MAIN_CORNER_POST_${xSide < 0 ? 'WEST' : 'EAST'}_${zSide < 0 ? 'REAR' : 'FRONT'}`;
    cornerPost.position.set(xSide * 0.94, 1.0, zSide * 0.75);
    root.add(cornerPost);
  }));
  [-1, 1].forEach((zSide) => {
    const facade = zSide < 0 ? 'REAR' : 'FRONT';
    root.add(
      timberBeamBetween(
        new THREE.Vector3(-0.98, 1.71, zSide * 0.97),
        new THREE.Vector3(0, 2.32, zSide * 0.97),
        0.075,
        materials.timberWorn,
        `ISLAND_13_UNION_MAIN_${facade}_GABLE_RAFTER_1`,
      ),
      timberBeamBetween(
        new THREE.Vector3(0, 2.32, zSide * 0.97),
        new THREE.Vector3(0.98, 1.71, zSide * 0.97),
        0.075,
        materials.timberWorn,
        `ISLAND_13_UNION_MAIN_${facade}_GABLE_RAFTER_2`,
      ),
    );
  });
  addFourSideWindowSet(root, 'ISLAND_13_UNION_MAIN', 1.035, 0.84, 1.08, materials, 0.25, 0.4);
  addWraparoundTimberBand(root, 'ISLAND_13_UNION_MAIN', 1.025, 0.83, 1.42, materials.timberWorn);
  addFourSideSidingCourses(root, 'ISLAND_13_UNION_MAIN', 1.025, 0.83, 0.54, 0.78, 5, materials.timberWorn);
  addWindow(root, -0.52, 1.08, 0.85, 0.28, 0.44, materials);
  addWindow(root, 0.52, 1.08, 0.85, 0.28, 0.44, materials);
  const doorway = box(0.34, 0.68, 0.1, materials.iron);
  doorway.position.set(0, 0.7, 0.88);
  root.add(doorway);
  const porch = box(2.2, 0.12, 0.72, materials.timberWorn);
  porch.position.set(0, 0.42, 1.08);
  const awning = box(2.14, 0.09, 0.68, materials.roof);
  awning.position.set(0, 1.46, 1.08);
  awning.rotation.x = -0.12;
  root.add(porch, awning);
  [-0.77, 0.77].forEach((x) => {
    const porchPost = box(0.08, 0.96, 0.08, materials.timberWorn);
    porchPost.position.set(x, 0.92, 1.36);
    root.add(porchPost);
  });
  const rearAnnex = box(1.42, 0.78, 0.72, materials.timber);
  rearAnnex.name = 'ISLAND_13_UNION_REAR_SERVICE_ANNEX';
  rearAnnex.position.set(0.14, 0.76, -1.08);
  const rearAnnexRoof = createGableRoof(1.62, 0.38, 0.86, materials.roof);
  rearAnnexRoof.name = 'ISLAND_13_UNION_REAR_SERVICE_ANNEX_ROOF';
  rearAnnexRoof.position.set(0.14, 1.16, -1.08);
  const rearAnnexWindow = box(0.27, 0.34, 0.055, materials.window);
  rearAnnexWindow.name = 'ISLAND_13_UNION_REAR_SERVICE_WINDOW';
  rearAnnexWindow.position.set(-0.28, 0.81, -1.45);
  root.add(rearAnnex, rearAnnexRoof, rearAnnexWindow);
  addFourSideSidingCourses(root, 'ISLAND_13_UNION_REAR_ANNEX', 0.71, 0.36, 0.5, 0.48, 3, materials.timberWorn, 0.14, -1.08);
  const rearPorch = box(1.52, 0.1, 0.5, materials.timberWorn);
  rearPorch.name = 'ISLAND_13_UNION_REAR_PORCH';
  rearPorch.position.set(0.14, 0.4, -1.55);
  const rearDoor = box(0.34, 0.64, 0.08, materials.bluePaint);
  rearDoor.name = 'ISLAND_13_UNION_REAR_DOOR';
  rearDoor.position.set(0.4, 0.67, -1.46);
  const rearAwning = box(1.48, 0.08, 0.5, materials.roof);
  rearAwning.name = 'ISLAND_13_UNION_REAR_AWNING';
  rearAwning.position.set(0.14, 1.38, -1.54);
  rearAwning.rotation.x = 0.12;
  root.add(rearPorch, rearDoor, rearAwning);
  [-0.54, 0.54].forEach((x, postIndex) => {
    const rearPost = box(0.07, 0.92, 0.07, materials.timberWorn);
    rearPost.name = `ISLAND_13_UNION_REAR_POST_${postIndex + 1}`;
    rearPost.position.set(x + 0.14, 0.87, -1.78);
    root.add(rearPost);
  });
  [-0.57, 0.57].forEach((x, crateIndex) => {
    const serviceCrate = box(0.24, 0.2 + crateIndex * 0.04, 0.22, crateIndex ? materials.timber : materials.timberWorn);
    serviceCrate.name = `ISLAND_13_UNION_REAR_SERVICE_CRATE_${crateIndex + 1}`;
    serviceCrate.position.set(x + 0.14, 0.5 + crateIndex * 0.02, -1.58);
    serviceCrate.rotation.y = crateIndex ? 0.18 : -0.14;
    root.add(serviceCrate);
  });
  [-1, 1].forEach((braceSide, braceIndex) => {
    const rearBrace = box(0.075, 0.86, 0.065, materials.timberWorn);
    rearBrace.name = `ISLAND_13_UNION_REAR_CROSS_BRACE_${braceIndex + 1}`;
    rearBrace.position.set(0.14 + braceSide * 0.33, 1.05, -1.465);
    rearBrace.rotation.z = braceSide * 0.64;
    root.add(rearBrace);
  });
  const rearServiceSign = box(0.7, 0.18, 0.065, materials.brass);
  rearServiceSign.name = 'ISLAND_13_UNION_REAR_SERVICE_SIGN';
  rearServiceSign.position.set(-0.18, 1.42, -1.47);
  const rearLanternBracket = box(0.22, 0.035, 0.035, materials.iron);
  rearLanternBracket.name = 'ISLAND_13_UNION_REAR_LANTERN_BRACKET';
  rearLanternBracket.position.set(0.76, 1.31, -1.55);
  const rearLantern = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 6), materials.window);
  rearLantern.name = 'ISLAND_13_UNION_REAR_LANTERN';
  rearLantern.position.set(0.76, 1.18, -1.58);
  root.add(rearServiceSign, rearLanternBracket, rearLantern);
  for (let step = 0; step < 4; step += 1) {
    const stair = box(0.72 + step * 0.12, 0.08, 0.18, materials.sandstoneLight);
    stair.position.set(0, 0.36 - step * 0.055, 1.1 + step * 0.14);
    root.add(stair);
  }
  const towerHeight = 1.5 + level * 0.16;
  const towerBaseY = 0.7;
  const tower = box(1.42, towerHeight, 1.42, materials.timberWorn);
  tower.name = 'ISLAND_13_UNION_STATION_BELL_TOWER_MASS';
  tower.position.y = towerBaseY + towerHeight * 0.5;
  const towerRoofBaseY = towerBaseY + towerHeight;
  const towerRoof = createGableRoof(1.78, 0.68, 1.74, materials.roof);
  towerRoof.name = 'ISLAND_13_UNION_STATION_BELL_TOWER_ROOF';
  towerRoof.position.y = towerRoofBaseY;
  root.add(tower, towerRoof);
  // These offsets must sit just outside the 1.42 x 1.42 tower shell. Earlier
  // values were inherited from the thinner prototype and buried the window,
  // siding and balcony articulation inside the enlarged L3 tower.
  addFourSideWindowSet(root, 'ISLAND_13_UNION_TOWER', 0.72, 0.72, 1.66 + level * 0.1, materials, 0.27, 0.42);
  addWraparoundTimberBand(root, 'ISLAND_13_UNION_TOWER', 0.715, 0.715, 1.98 + level * 0.12, materials.brass);
  addFourSideSidingCourses(root, 'ISLAND_13_UNION_TOWER', 0.71, 0.71, 0.94, 1.3 + level * 0.05, 6, materials.timber);
  addWindow(root, 0, 1.52 + level * 0.1, 0.72, 0.32, 0.5, materials);
  const towerBalcony = box(1.7, 0.1, 1.64, materials.timberWorn);
  towerBalcony.name = 'ISLAND_13_UNION_STATION_UPPER_BALCONY';
  towerBalcony.position.y = towerRoofBaseY - 0.12;
  root.add(towerBalcony);
  if (level >= 2) {
    [-1, 1].forEach((side) => {
      const wing = box(1.02, 0.94, 1.22, materials.timber);
      wing.position.set(side * 1.46, 0.77, -0.03);
      const wingRoof = createGableRoof(1.2, 0.48, 1.4, materials.roof);
      wingRoof.position.set(side * 1.46, 1.25, -0.03);
      const wingWindow = box(0.3, 0.37, 0.06, materials.window);
      wingWindow.position.set(side * 1.46, 0.82, 0.62);
      const wingTrim = box(1.1, 0.08, 0.07, materials.timberWorn);
      wingTrim.position.set(side * 1.46, 1.16, 0.63);
      root.add(wing, wingRoof, wingWindow, wingTrim);
      addFourSideWindowSet(root, `ISLAND_13_UNION_${side < 0 ? 'WEST' : 'EAST'}_WING`, 0.52, 0.62, 0.84, materials, 0.22, 0.32, side * 1.46, -0.03);
      addWraparoundTimberBand(root, `ISLAND_13_UNION_${side < 0 ? 'WEST' : 'EAST'}_WING`, 0.51, 0.61, 1.12, materials.timberWorn, side * 1.46, -0.03);
      addFourSideSidingCourses(root, `ISLAND_13_UNION_${side < 0 ? 'WEST' : 'EAST'}_WING`, 0.51, 0.61, 0.48, 0.54, 3, materials.timberWorn, side * 1.46, -0.03);
    });
  }
  if (level >= 3) {
    const entryPavilion = box(0.78, 0.92, 0.64, materials.timber);
    entryPavilion.name = 'ISLAND_13_UNION_FRONT_ENTRY_PAVILION';
    entryPavilion.position.set(0, 0.88, 1.08);
    const entryRoof = createGableRoof(0.98, 0.46, 0.82, materials.roof);
    entryRoof.name = 'ISLAND_13_UNION_FRONT_ENTRY_PAVILION_ROOF';
    entryRoof.position.set(0, 1.36, 1.08);
    const entryDoor = box(0.34, 0.66, 0.07, materials.bluePaint);
    entryDoor.name = 'ISLAND_13_UNION_FRONT_ENTRY_DOOR';
    entryDoor.position.set(0, 0.73, 1.42);
    const entryDeck = box(1.22, 0.1, 0.52, materials.timberWorn);
    entryDeck.name = 'ISLAND_13_UNION_FRONT_ENTRY_DECK';
    entryDeck.position.set(0, 0.42, 1.58);
    root.add(entryPavilion, entryRoof, entryDoor, entryDeck);
    [-1, 1].forEach((side) => {
      const entryPost = box(0.07, 0.82, 0.07, materials.timberWorn);
      entryPost.name = `ISLAND_13_UNION_FRONT_ENTRY_POST_${side < 0 ? 'WEST' : 'EAST'}`;
      entryPost.position.set(side * 0.46, 0.86, 1.78);
      root.add(entryPost);
    });
    [-1, 1].forEach((xSide) => [-1, 1].forEach((zSide) => {
      const dormer = box(0.42, 0.34, 0.32, materials.timberWorn);
      const facade = zSide < 0 ? 'REAR' : 'FRONT';
      const flank = xSide < 0 ? 'WEST' : 'EAST';
      dormer.name = `ISLAND_13_UNION_${facade}_${flank}_ROOF_DORMER`;
      dormer.position.set(xSide * 0.62, 1.93, zSide * 0.84);
      const dormerRoof = createGableRoof(0.52, 0.28, 0.42, materials.roof);
      dormerRoof.name = `${dormer.name}_ROOF`;
      dormerRoof.position.set(xSide * 0.62, 2.11, zSide * 0.84);
      const dormerWindow = box(0.18, 0.2, 0.045, materials.window);
      dormerWindow.name = `${dormer.name}_WINDOW`;
      dormerWindow.position.set(xSide * 0.62, 1.96, zSide * 1.02);
      root.add(dormer, dormerRoof, dormerWindow);
    }));
    [-1, 1].forEach((side, sideIndex) => {
      const sidePlatform = box(0.48, 0.11, 1.24, materials.timberWorn);
      sidePlatform.name = `ISLAND_13_UNION_SIDE_PLATFORM_${sideIndex + 1}`;
      sidePlatform.position.set(side * 2.12, 0.43, -0.03);
      const sideCanopy = box(0.5, 0.08, 1.18, materials.roof);
      sideCanopy.name = `ISLAND_13_UNION_SIDE_CANOPY_${sideIndex + 1}`;
      sideCanopy.position.set(side * 2.12, 1.35, -0.03);
      [-0.46, 0.46].forEach((z, postIndex) => {
        const sidePost = box(0.07, 0.86, 0.07, materials.timberWorn);
        sidePost.name = `ISLAND_13_UNION_SIDE_POST_${sideIndex + 1}_${postIndex + 1}`;
        sidePost.position.set(side * 2.12, 0.89, z);
        root.add(sidePost);
      });
      root.add(sidePlatform, sideCanopy);
    });
    const roofApexY = towerRoofBaseY + 0.68;
    const cupola = cylinder(0.33, 0.39, 0.5, materials.timberWorn, 8);
    cupola.name = 'ISLAND_13_UNION_STATION_CUPOLA';
    cupola.position.y = roofApexY + 0.2;
    addFourSideWindowSet(
      root,
      'ISLAND_13_UNION_CUPOLA',
      0.34,
      0.34,
      roofApexY + 0.22,
      materials,
      0.12,
      0.2,
    );
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.58, 4), materials.roof);
    crown.rotation.y = Math.PI / 4;
    crown.position.y = roofApexY + 0.7;
    const bell = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 6, 12), materials.brass);
    bell.rotation.x = Math.PI / 2;
    bell.position.set(0, roofApexY + 0.2, 0.31);
    const flagPole = cylinder(0.025, 0.025, 0.8, materials.brass, 8);
    flagPole.position.y = roofApexY + 1.34;
    const clockFace = cylinder(0.22, 0.22, 0.045, materials.sandstoneLight, 16);
    clockFace.name = 'ISLAND_13_UNION_FRONT_CLOCK';
    clockFace.rotation.x = Math.PI / 2;
    clockFace.position.set(0, 2.54, 0.735);
    const rearClockFace = cylinder(0.22, 0.22, 0.045, materials.sandstoneLight, 16);
    rearClockFace.name = 'ISLAND_13_UNION_REAR_CLOCK';
    rearClockFace.rotation.x = Math.PI / 2;
    rearClockFace.position.set(0, 2.54, -0.735);
    [-1, 1].forEach((zSide) => {
      const facade = zSide > 0 ? 'FRONT' : 'REAR';
      const clockRim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 6, 16), materials.brass);
      clockRim.name = `ISLAND_13_UNION_${facade}_CLOCK_RIM`;
      clockRim.position.set(0, 2.54, zSide * 0.77);
      const minuteHand = box(0.028, 0.15, 0.026, materials.iron);
      minuteHand.name = `ISLAND_13_UNION_${facade}_CLOCK_MINUTE_HAND`;
      minuteHand.position.set(0.025, 2.59, zSide * 0.795);
      minuteHand.rotation.z = -0.35;
      const hourHand = box(0.11, 0.028, 0.026, materials.iron);
      hourHand.name = `ISLAND_13_UNION_${facade}_CLOCK_HOUR_HAND`;
      hourHand.position.set(0.045, 2.53, zSide * 0.795);
      hourHand.rotation.z = 0.32;
      root.add(clockRim, minuteHand, hourHand);
    });
    const stationSign = box(0.86, 0.22, 0.08, materials.bluePaint);
    stationSign.position.set(0, 1.08, 0.7);
    const rearChimney = box(0.16, 0.6, 0.16, materials.iron);
    rearChimney.name = 'ISLAND_13_UNION_REAR_CHIMNEY';
    rearChimney.position.set(-0.54, 1.93, -0.42);
    root.add(cupola, crown, bell, flagPole, clockFace, rearClockFace, stationSign, rearChimney);
  }
  root.userData.sculptRuntime = { parts: [registerIsland13RuntimePart('union-station', root, 'landmark')] };
  return root;
}

function createRailNestWaterworks(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island13CactusCanyonMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_13_RAIL_NEST_WATERWORKS';
  addPlinth(root, 1.05, materials, quality);
  const legHeight = 1.0 + level * 0.15;
  [-1, 1].forEach((xSide) => [-1, 1].forEach((zSide) => {
    const leg = box(0.1, legHeight, 0.1, materials.timber);
    leg.name = `ISLAND_13_WATERWORKS_TANK_LEG_${xSide < 0 ? 'WEST' : 'EAST'}_${zSide < 0 ? 'REAR' : 'FRONT'}`;
    leg.position.set(xSide * 0.36, 0.34 + legHeight / 2, zSide * 0.34);
    leg.rotation.z = -xSide * 0.08;
    root.add(leg);
  }));
  [-1, 1].forEach((zSide) => {
    const face = zSide < 0 ? 'REAR' : 'FRONT';
    root.add(
      timberBeamBetween(new THREE.Vector3(-0.34, 0.48, zSide * 0.37), new THREE.Vector3(0.34, 1.32, zSide * 0.37), 0.055, materials.timberWorn, `ISLAND_13_WATERWORKS_${face}_BRACE_1`),
      timberBeamBetween(new THREE.Vector3(0.34, 0.48, zSide * 0.37), new THREE.Vector3(-0.34, 1.32, zSide * 0.37), 0.055, materials.timberWorn, `ISLAND_13_WATERWORKS_${face}_BRACE_2`),
    );
  });
  [-1, 1].forEach((xSide) => {
    const face = xSide < 0 ? 'WEST' : 'EAST';
    root.add(
      timberBeamBetween(new THREE.Vector3(xSide * 0.37, 0.48, -0.34), new THREE.Vector3(xSide * 0.37, 1.32, 0.34), 0.055, materials.timberWorn, `ISLAND_13_WATERWORKS_${face}_BRACE_1`),
      timberBeamBetween(new THREE.Vector3(xSide * 0.37, 0.48, 0.34), new THREE.Vector3(xSide * 0.37, 1.32, -0.34), 0.055, materials.timberWorn, `ISLAND_13_WATERWORKS_${face}_BRACE_2`),
    );
  });
  const tankCenterY = 1.46 + level * 0.15;
  const tankBottomY = tankCenterY - 0.36;
  const tank = cylinder(0.54, 0.58, 0.72, materials.timberWorn, segments(quality));
  tank.name = 'ISLAND_13_WATERWORKS_STAVE_TANK';
  tank.position.y = tankCenterY;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.48, segments(quality)), materials.roof);
  roof.name = 'ISLAND_13_WATERWORKS_TANK_CONICAL_ROOF';
  roof.position.y = 2.06 + level * 0.15;
  root.add(tank, roof);
  const staveCount = quality === 'low' ? 10 : 14;
  const tankStaves = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.11, 0.66, 0.035),
    materials.timber,
    staveCount,
  );
  tankStaves.name = 'ISLAND_13_WATERWORKS_VERTICAL_TANK_STAVES';
  const staveMatrix = new THREE.Matrix4();
  const staveQuaternion = new THREE.Quaternion();
  const stavePosition = new THREE.Vector3();
  const staveScale = new THREE.Vector3();
  for (let staveIndex = 0; staveIndex < staveCount; staveIndex += 1) {
    const angle = staveIndex / staveCount * Math.PI * 2;
    staveMatrix.compose(
      stavePosition.set(Math.cos(angle) * 0.57, tankCenterY, Math.sin(angle) * 0.57),
      staveQuaternion.setFromEuler(new THREE.Euler(0, -angle, 0)),
      staveScale.set(0.9 + (staveIndex % 3) * 0.06, 1, 1),
    );
    tankStaves.setMatrixAt(staveIndex, staveMatrix);
  }
  tankStaves.instanceMatrix.needsUpdate = true;
  tankStaves.castShadow = true;
  root.add(tankStaves);

  const tankDeck = new THREE.Mesh(new THREE.TorusGeometry(0.67, 0.075, 5, segments(quality) * 2), materials.timberWorn);
  tankDeck.name = 'ISLAND_13_WATERWORKS_TANK_SERVICE_DECK';
  tankDeck.rotation.x = Math.PI / 2;
  tankDeck.position.y = tankBottomY + 0.01;
  const tankRailLower = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.025, 5, segments(quality) * 2), materials.iron);
  tankRailLower.name = 'ISLAND_13_WATERWORKS_TANK_RAIL_LOWER';
  tankRailLower.rotation.x = Math.PI / 2;
  tankRailLower.position.y = tankBottomY + 0.19;
  const tankRailUpper = tankRailLower.clone();
  tankRailUpper.name = 'ISLAND_13_WATERWORKS_TANK_RAIL_UPPER';
  tankRailUpper.position.y = tankBottomY + 0.39;
  const tankRailPosts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.045, 0.4, 0.045), materials.iron, 8);
  tankRailPosts.name = 'ISLAND_13_WATERWORKS_TANK_RAIL_POSTS';
  for (let postIndex = 0; postIndex < 8; postIndex += 1) {
    const angle = postIndex / 8 * Math.PI * 2;
    staveMatrix.compose(
      stavePosition.set(Math.cos(angle) * 0.74, tankBottomY + 0.2, Math.sin(angle) * 0.74),
      staveQuaternion.identity(),
      staveScale.set(1, 1, 1),
    );
    tankRailPosts.setMatrixAt(postIndex, staveMatrix);
  }
  tankRailPosts.instanceMatrix.needsUpdate = true;
  root.add(tankDeck, tankRailLower, tankRailUpper, tankRailPosts);
  if (level >= 2) {
    const depot = box(0.85, 0.48, 0.72, materials.timber);
    depot.position.set(0.62, 0.48, -0.18);
    const depotRoof = createGableRoof(1.02, 0.34, 0.86, materials.roof);
    depotRoof.position.set(0.62, 0.73, -0.18);
    root.add(depot, depotRoof);
    addFourSideWindowSet(root, 'ISLAND_13_WATERWORKS_DEPOT', 0.435, 0.37, 0.56, materials, 0.18, 0.25, 0.62, -0.18);
    addFourSideSidingCourses(root, 'ISLAND_13_WATERWORKS_DEPOT', 0.425, 0.36, 0.34, 0.28, 2, materials.timberWorn, 0.62, -0.18);
    const pumpShed = box(0.62, 0.42, 0.58, materials.timberWorn);
    pumpShed.name = 'ISLAND_13_WATERWORKS_PUMP_SHED';
    pumpShed.position.set(-0.62, 0.47, -0.18);
    const pumpShedRoof = createGableRoof(0.76, 0.3, 0.7, materials.roof);
    pumpShedRoof.name = 'ISLAND_13_WATERWORKS_PUMP_SHED_ROOF';
    pumpShedRoof.position.set(-0.62, 0.7, -0.18);
    const pumpPipe = cylinder(0.06, 0.06, 0.88, materials.iron, 8);
    pumpPipe.name = 'ISLAND_13_WATERWORKS_PUMP_PIPE';
    pumpPipe.rotation.z = Math.PI / 2;
    pumpPipe.position.set(-0.2, 0.48, 0.16);
    root.add(pumpShed, pumpShedRoof, pumpPipe);
    addFourSideSidingCourses(root, 'ISLAND_13_WATERWORKS_PUMP_SHED', 0.31, 0.29, 0.35, 0.22, 2, materials.timber, -0.62, -0.18);
    const depotFrontDoor = box(0.22, 0.34, 0.055, materials.bluePaint);
    depotFrontDoor.name = 'ISLAND_13_WATERWORKS_DEPOT_FRONT_DOOR';
    depotFrontDoor.position.set(0.62, 0.49, 0.19);
    const depotRearDoor = box(0.22, 0.34, 0.055, materials.bluePaint);
    depotRearDoor.name = 'ISLAND_13_WATERWORKS_DEPOT_REAR_DOOR';
    depotRearDoor.position.set(0.62, 0.49, -0.55);
    const pressureFace = cylinder(0.12, 0.12, 0.04, materials.sandstoneLight, 12);
    pressureFace.name = 'ISLAND_13_WATERWORKS_PRESSURE_GAUGE_FACE';
    pressureFace.rotation.x = Math.PI / 2;
    pressureFace.position.set(-0.62, 0.58, 0.135);
    const pressureRim = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 5, 12), materials.brass);
    pressureRim.name = 'ISLAND_13_WATERWORKS_PRESSURE_GAUGE_RIM';
    pressureRim.position.set(-0.62, 0.58, 0.16);
    const pressureNeedle = box(0.018, 0.09, 0.018, materials.iron);
    pressureNeedle.name = 'ISLAND_13_WATERWORKS_PRESSURE_GAUGE_NEEDLE';
    pressureNeedle.position.set(-0.59, 0.6, 0.185);
    pressureNeedle.rotation.z = -0.65;
    root.add(depotFrontDoor, depotRearDoor, pressureFace, pressureRim, pressureNeedle);
  }
  if (level >= 3) {
    const egg = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8), materials.window);
    egg.scale.y = 1.3;
    egg.position.set(0.62, 0.52, 0.22);
    root.add(egg);
  }
  const tankBandGeometry = new THREE.TorusGeometry(0.58, 0.035, 5, segments(quality) * 2);
  [1.22, 1.52, 1.8].forEach((y) => {
    const band = new THREE.Mesh(tankBandGeometry, materials.iron);
    band.rotation.x = Math.PI / 2;
    band.position.y = y + level * 0.15;
    root.add(band);
  });
  const ladderRailLeft = box(0.035, 1.25, 0.035, materials.iron);
  const ladderRailRight = ladderRailLeft.clone();
  ladderRailLeft.position.set(-0.17, 1.02, 0.6);
  ladderRailRight.position.set(0.17, 1.02, 0.6);
  root.add(ladderRailLeft, ladderRailRight);
  for (let rungIndex = 0; rungIndex < 7; rungIndex += 1) {
    const rung = box(0.38, 0.03, 0.035, materials.iron);
    rung.position.set(0, 0.48 + rungIndex * 0.18, 0.61);
    root.add(rung);
  }
  const overflowPipe = cylinder(0.045, 0.045, 1.02, materials.iron, 8);
  overflowPipe.name = 'ISLAND_13_WATERWORKS_OVERFLOW_DOWNPIPE';
  overflowPipe.position.set(-0.67, tankBottomY - 0.02, 0.02);
  const overflowElbow = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), materials.iron);
  overflowElbow.name = 'ISLAND_13_WATERWORKS_OVERFLOW_ELBOW';
  overflowElbow.position.set(-0.67, tankBottomY + 0.49, 0.02);
  const overflowFeed = cylinder(0.045, 0.045, 0.32, materials.iron, 8);
  overflowFeed.name = 'ISLAND_13_WATERWORKS_OVERFLOW_FEED';
  overflowFeed.rotation.z = Math.PI / 2;
  overflowFeed.position.set(-0.54, tankBottomY + 0.49, 0.02);
  root.add(overflowPipe, overflowElbow, overflowFeed);
  root.userData.sculptRuntime = { parts: [registerIsland13RuntimePart('rail-nest-waterworks', root, 'landmark')] };
  return root;
}

function createWindmillRanch(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island13CactusCanyonMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_13_WINDMILL_RANCH';
  addPlinth(root, 1.08, materials, quality);
  const workshop = box(1.18, 0.62 + level * 0.08, 0.92, materials.timber);
  workshop.position.set(0.28, 0.56, -0.18);
  const workshopRoof = createGableRoof(1.42, 0.42, 1.08, materials.roof);
  workshopRoof.position.set(0.28, 0.92 + level * 0.08, -0.18);
  root.add(workshop, workshopRoof);
  addFourSideWindowSet(root, 'ISLAND_13_WINDMILL_WORKSHOP', 0.6, 0.47, 0.68, materials, 0.2, 0.27, 0.28, -0.18);
  addWraparoundTimberBand(root, 'ISLAND_13_WINDMILL_WORKSHOP', 0.59, 0.46, 0.86, materials.timberWorn, 0.28, -0.18);
  addFourSideSidingCourses(root, 'ISLAND_13_WINDMILL_WORKSHOP', 0.59, 0.46, 0.32, 0.5, 3, materials.timberWorn, 0.28, -0.18);
  if (level >= 2) {
    const stable = box(0.7, 0.48, 0.76, materials.timberWorn);
    stable.name = 'ISLAND_13_WINDMILL_RANCH_STABLE';
    stable.position.set(0.98, 0.49, -0.32);
    const stableRoof = createGableRoof(0.84, 0.32, 0.9, materials.roof);
    stableRoof.name = 'ISLAND_13_WINDMILL_RANCH_STABLE_ROOF';
    stableRoof.position.set(0.98, 0.75, -0.32);
    const stableDoor = box(0.3, 0.38, 0.055, materials.iron);
    stableDoor.name = 'ISLAND_13_WINDMILL_RANCH_STABLE_DOOR';
    stableDoor.position.set(0.98, 0.51, 0.08);
    const stablePorch = box(0.82, 0.08, 0.34, materials.timberWorn);
    stablePorch.name = 'ISLAND_13_WINDMILL_RANCH_STABLE_PORCH';
    stablePorch.position.set(0.98, 0.35, 0.25);
    root.add(stable, stableRoof, stableDoor, stablePorch);
    addFourSideWindowSet(root, 'ISLAND_13_WINDMILL_RANCH_STABLE', 0.36, 0.39, 0.55, materials, 0.14, 0.2, 0.98, -0.32);
    addFourSideSidingCourses(root, 'ISLAND_13_WINDMILL_RANCH_STABLE', 0.35, 0.38, 0.36, 0.24, 2, materials.timber, 0.98, -0.32);

    const trough = box(0.72, 0.18, 0.28, materials.timberWorn);
    trough.name = 'ISLAND_13_WINDMILL_RANCH_WATER_TROUGH';
    trough.position.set(-0.88, 0.42, 0.48);
    const troughWater = box(0.6, 0.025, 0.18, materials.window);
    troughWater.name = 'ISLAND_13_WINDMILL_RANCH_TROUGH_WATER';
    troughWater.position.set(-0.88, 0.52, 0.48);
    root.add(trough, troughWater);

    [0, 1, 2].forEach((propIndex) => {
      const ranchProp = propIndex === 2
        ? cylinder(0.16, 0.16, 0.28, materials.sandstoneLight, 10)
        : box(0.24, 0.2 + propIndex * 0.04, 0.22, propIndex ? materials.timber : materials.timberWorn);
      ranchProp.name = `ISLAND_13_WINDMILL_RANCH_YARD_PROP_${propIndex + 1}`;
      ranchProp.position.set(0.72 + propIndex * 0.24, 0.42 + propIndex * 0.03, 0.5 - propIndex * 0.08);
      if (propIndex === 2) ranchProp.rotation.z = Math.PI / 2;
      root.add(ranchProp);
    });
  }
  const towerHeight = 1.7 + level * 0.24;
  [-1, 1].forEach((xSide) => [-1, 1].forEach((zSide) => {
    const leg = box(0.1, towerHeight, 0.1, materials.timber);
    leg.name = `ISLAND_13_WINDMILL_TOWER_LEG_${xSide < 0 ? 'WEST' : 'EAST'}_${zSide < 0 ? 'REAR' : 'FRONT'}`;
    leg.position.set(-0.46 + xSide * 0.28, 0.28 + towerHeight / 2, -0.42 + zSide * 0.26);
    leg.rotation.z = xSide * 0.08;
    root.add(leg);
  }));
  const rotor = new THREE.Group();
  rotor.name = 'ISLAND_13_WINDMILL_ROTOR';
  rotor.position.set(-0.46, 1.94 + level * 0.24, -0.34);
  rotor.rotation.y = Math.PI / 2;
  const bladeCount = quality === 'low' ? 8 : 12;
  for (let index = 0; index < bladeCount; index += 1) {
    const blade = box(0.09, 0.82, 0.035, materials.railSteel);
    blade.name = `ISLAND_13_WINDMILL_SPOKE_${index + 1}`;
    blade.position.y = 0.42;
    const sailPanel = box(0.22, 0.38, 0.045, index % 2 ? materials.timberWorn : materials.timber);
    sailPanel.name = `ISLAND_13_WINDMILL_SAIL_PANEL_${index + 1}`;
    sailPanel.position.set(0.08, 0.62, 0);
    const pivot = new THREE.Group();
    pivot.rotation.z = index / bladeCount * Math.PI * 2;
    pivot.add(blade, sailPanel);
    rotor.add(pivot);
  }
  const rotorRim = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.025, 5, bladeCount * 2), materials.railSteel);
  rotorRim.name = 'ISLAND_13_WINDMILL_OUTER_RIM';
  rotor.add(rotorRim);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.18, 10), materials.brass);
  hub.name = 'ISLAND_13_WINDMILL_HUB';
  hub.rotation.z = Math.PI / 2;
  rotor.add(hub);
  const tail = box(0.58, 0.28, 0.035, materials.timberWorn);
  tail.position.set(-0.58, 0, -0.02);
  rotor.add(tail);
  const servicePlatform = box(0.82, 0.09, 0.72, materials.timberWorn);
  servicePlatform.name = 'ISLAND_13_WINDMILL_SERVICE_PLATFORM';
  servicePlatform.position.set(-0.46, 1.78 + level * 0.2, -0.42);
  const pumpLinkage = cylinder(0.045, 0.045, 1.18, materials.iron, 8);
  pumpLinkage.name = 'ISLAND_13_WINDMILL_PUMP_LINKAGE';
  pumpLinkage.position.set(-0.46, 1.14 + level * 0.12, -0.42);
  root.add(servicePlatform, pumpLinkage);
  [-1, 1].forEach((xSide) => [-1, 1].forEach((zSide) => {
    const platformPost = box(0.045, 0.34, 0.045, materials.iron);
    platformPost.name = `ISLAND_13_WINDMILL_SERVICE_RAIL_POST_${xSide < 0 ? 'WEST' : 'EAST'}_${zSide < 0 ? 'REAR' : 'FRONT'}`;
    platformPost.position.set(-0.46 + xSide * 0.34, 1.96 + level * 0.2, -0.42 + zSide * 0.28);
    root.add(platformPost);
  }));
  [-1, 1].forEach((zSide) => {
    const face = zSide < 0 ? 'REAR' : 'FRONT';
    root.add(
      timberBeamBetween(new THREE.Vector3(-0.72, 0.5, -0.42 + zSide * 0.27), new THREE.Vector3(-0.2, 1.65, -0.42 + zSide * 0.27), 0.055, materials.timberWorn, `ISLAND_13_WINDMILL_${face}_BRACE_1`),
      timberBeamBetween(new THREE.Vector3(-0.2, 0.5, -0.42 + zSide * 0.27), new THREE.Vector3(-0.72, 1.65, -0.42 + zSide * 0.27), 0.055, materials.timberWorn, `ISLAND_13_WINDMILL_${face}_BRACE_2`),
    );
  });
  [-1, 1].forEach((xSide) => {
    const face = xSide < 0 ? 'WEST' : 'EAST';
    root.add(
      timberBeamBetween(new THREE.Vector3(-0.46 + xSide * 0.29, 0.5, -0.68), new THREE.Vector3(-0.46 + xSide * 0.29, 1.65, -0.16), 0.055, materials.timberWorn, `ISLAND_13_WINDMILL_${face}_BRACE_1`),
      timberBeamBetween(new THREE.Vector3(-0.46 + xSide * 0.29, 0.5, -0.16), new THREE.Vector3(-0.46 + xSide * 0.29, 1.65, -0.68), 0.055, materials.timberWorn, `ISLAND_13_WINDMILL_${face}_BRACE_2`),
    );
  });
  root.add(rotor);
  root.userData.sculptRuntime = { parts: [registerIsland13RuntimePart('windmill-ranch', root, 'landmark')] };
  return root;
}

function createSignalYard(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island13CactusCanyonMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_13_SHOWDOWN_SIGNAL_YARD';
  addPlinth(root, 1.08, materials, quality);
  const challengeDeck = cylinder(0.6, 0.64, 0.1, materials.timber, segments(quality) * 2);
  challengeDeck.name = 'ISLAND_13_SIGNAL_YARD_CHALLENGE_DECK';
  challengeDeck.position.y = 0.4;
  const corral = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.055, 6, segments(quality) * 2), materials.timberWorn);
  corral.name = 'ISLAND_13_SIGNAL_YARD_CORRAL_LOWER_RAIL';
  corral.rotation.x = Math.PI / 2;
  corral.position.y = 0.5;
  const corralUpper = corral.clone();
  corralUpper.name = 'ISLAND_13_SIGNAL_YARD_CORRAL_UPPER_RAIL';
  corralUpper.position.y = 0.71;
  const corralPosts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.065, 0.4, 0.065), materials.timberWorn, 12);
  corralPosts.name = 'ISLAND_13_SIGNAL_YARD_CORRAL_POSTS';
  const corralMatrix = new THREE.Matrix4();
  const corralPosition = new THREE.Vector3();
  const corralQuaternion = new THREE.Quaternion();
  const corralScale = new THREE.Vector3(1, 1, 1);
  for (let postIndex = 0; postIndex < 12; postIndex += 1) {
    const angle = postIndex / 12 * Math.PI * 2;
    corralMatrix.compose(
      corralPosition.set(Math.cos(angle) * 0.72, 0.55, Math.sin(angle) * 0.72),
      corralQuaternion.identity(),
      corralScale,
    );
    corralPosts.setMatrixAt(postIndex, corralMatrix);
  }
  corralPosts.instanceMatrix.needsUpdate = true;
  corralPosts.castShadow = true;
  root.add(challengeDeck, corral, corralUpper, corralPosts);
  const showdownCompass = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.025, 5, 16), materials.brass);
  showdownCompass.name = 'ISLAND_13_SIGNAL_YARD_SHOWDOWN_COMPASS';
  showdownCompass.rotation.x = Math.PI / 2;
  showdownCompass.position.y = 0.47;
  root.add(showdownCompass);
  for (let spokeIndex = 0; spokeIndex < 6; spokeIndex += 1) {
    const compassSpoke = box(0.48, 0.025, 0.03, materials.brass);
    compassSpoke.name = `ISLAND_13_SIGNAL_YARD_SHOWDOWN_COMPASS_SPOKE_${spokeIndex + 1}`;
    compassSpoke.position.y = 0.47;
    compassSpoke.rotation.y = spokeIndex / 6 * Math.PI;
    root.add(compassSpoke);
  }
  const mast = box(0.12, 1.0 + level * 0.18, 0.12, materials.iron);
  mast.name = 'ISLAND_13_SIGNAL_YARD_MAIN_MAST';
  mast.position.set(-0.46, 0.82 + level * 0.09, -0.12);
  const mastBase = cylinder(0.18, 0.24, 0.16, materials.brass, 10);
  mastBase.name = 'ISLAND_13_SIGNAL_YARD_MAST_BASE';
  mastBase.position.set(-0.46, 0.42, -0.12);
  root.add(mast, mastBase);
  for (let index = 0; index < level + 1; index += 1) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), index % 2 ? materials.window : materials.brass);
    lamp.name = `ISLAND_13_SIGNAL_YARD_LAMP_${index + 1}`;
    lamp.position.set(-0.46, 1.08 + level * 0.18 + index * 0.25, -0.06);
    root.add(lamp);
  }
  if (level >= 2) {
    const switchHouse = box(0.68, 0.5, 0.62, materials.timber);
    switchHouse.name = 'ISLAND_13_SIGNAL_SWITCH_HOUSE';
    switchHouse.position.set(0.52, 0.52, -0.2);
    const roof = createGableRoof(0.82, 0.3, 0.74, materials.roof);
    roof.name = 'ISLAND_13_SIGNAL_SWITCH_HOUSE_ROOF';
    roof.position.set(0.52, 0.8, -0.2);
    root.add(switchHouse, roof);
    addFourSideWindowSet(root, 'ISLAND_13_SIGNAL_SWITCH_HOUSE', 0.35, 0.32, 0.58, materials, 0.16, 0.22, 0.52, -0.2);
    addFourSideSidingCourses(root, 'ISLAND_13_SIGNAL_SWITCH_HOUSE', 0.34, 0.31, 0.36, 0.28, 2, materials.timberWorn, 0.52, -0.2);
    const switchHouseFrontDoor = box(0.19, 0.34, 0.055, materials.bluePaint);
    switchHouseFrontDoor.name = 'ISLAND_13_SIGNAL_SWITCH_HOUSE_FRONT_DOOR';
    switchHouseFrontDoor.position.set(0.52, 0.51, 0.125);
    const switchHouseRearDoor = switchHouseFrontDoor.clone();
    switchHouseRearDoor.name = 'ISLAND_13_SIGNAL_SWITCH_HOUSE_REAR_DOOR';
    switchHouseRearDoor.position.z = -0.525;
    root.add(switchHouseFrontDoor, switchHouseRearDoor);
  }
  const crossArm = box(0.78, 0.07, 0.08, materials.iron);
  crossArm.name = 'ISLAND_13_SIGNAL_YARD_CROSS_ARM';
  crossArm.position.set(-0.46, 1.44 + level * 0.18, -0.12);
  root.add(crossArm);
  [-0.3, 0.3].forEach((offset) => {
    const signalDisc = cylinder(0.12, 0.12, 0.05, offset < 0 ? materials.brass : materials.window, 12);
    signalDisc.name = `ISLAND_13_SIGNAL_YARD_DISC_${offset < 0 ? 'WEST' : 'EAST'}`;
    signalDisc.rotation.x = Math.PI / 2;
    signalDisc.position.set(-0.46 + offset, 1.44 + level * 0.18, -0.06);
    root.add(signalDisc);
  });
  const semaphoreArm = box(0.58, 0.09, 0.075, materials.brass);
  semaphoreArm.name = 'ISLAND_13_SIGNAL_YARD_SEMAPHORE_ARM';
  semaphoreArm.position.set(-0.2, 1.72 + level * 0.18, -0.1);
  semaphoreArm.rotation.z = -0.28;
  const semaphoreTip = cylinder(0.11, 0.11, 0.055, materials.window, 10);
  semaphoreTip.name = 'ISLAND_13_SIGNAL_YARD_SEMAPHORE_TIP';
  semaphoreTip.rotation.x = Math.PI / 2;
  semaphoreTip.position.set(0.06, 1.65 + level * 0.18, -0.055);
  root.add(semaphoreArm, semaphoreTip);
  if (level >= 3) {
    [-1, 1].forEach((side) => {
      const gantryPost = box(0.09, 1.18, 0.09, materials.timberWorn);
      gantryPost.name = `ISLAND_13_SIGNAL_YARD_GANTRY_POST_${side < 0 ? 'WEST' : 'EAST'}`;
      gantryPost.position.set(side * 0.62, 1.02, 0.3);
      root.add(gantryPost);
    });
    const gantryBeam = box(1.36, 0.09, 0.1, materials.brass);
    gantryBeam.name = 'ISLAND_13_SIGNAL_YARD_GANTRY_BEAM';
    gantryBeam.position.set(0, 1.62, 0.3);
    root.add(
      gantryBeam,
      timberBeamBetween(new THREE.Vector3(-0.62, 0.78, 0.3), new THREE.Vector3(0, 1.62, 0.3), 0.045, materials.brass, 'ISLAND_13_SIGNAL_YARD_GANTRY_BRACE_WEST'),
      timberBeamBetween(new THREE.Vector3(0.62, 0.78, 0.3), new THREE.Vector3(0, 1.62, 0.3), 0.045, materials.brass, 'ISLAND_13_SIGNAL_YARD_GANTRY_BRACE_EAST'),
    );
    [-0.38, 0, 0.38].forEach((x, lampIndex) => {
      const gantryLampHousing = cylinder(0.13, 0.13, 0.09, materials.iron, 10);
      gantryLampHousing.name = `ISLAND_13_SIGNAL_YARD_GANTRY_LAMP_HOUSING_${lampIndex + 1}`;
      gantryLampHousing.rotation.x = Math.PI / 2;
      gantryLampHousing.position.set(x, 1.5, 0.36);
      const gantryLamp = cylinder(0.085, 0.085, 0.095, lampIndex === 1 ? materials.window : materials.brass, 10);
      gantryLamp.name = `ISLAND_13_SIGNAL_YARD_GANTRY_LAMP_${lampIndex + 1}`;
      gantryLamp.rotation.x = Math.PI / 2;
      gantryLamp.position.set(x, 1.5, 0.415);
      root.add(gantryLampHousing, gantryLamp);
    });
  }

  const approachRailA = box(1.52, 0.04, 0.045, materials.railSteel);
  approachRailA.name = 'ISLAND_13_SIGNAL_YARD_APPROACH_RAIL_A';
  approachRailA.position.set(0, 0.48, 0.59);
  const approachRailB = approachRailA.clone();
  approachRailB.name = 'ISLAND_13_SIGNAL_YARD_APPROACH_RAIL_B';
  approachRailB.position.z = 0.78;
  root.add(approachRailA, approachRailB);
  for (let sleeperIndex = 0; sleeperIndex < 7; sleeperIndex += 1) {
    const sleeper = box(0.1, 0.035, 0.36, materials.timberWorn);
    sleeper.name = `ISLAND_13_SIGNAL_YARD_APPROACH_SLEEPER_${sleeperIndex + 1}`;
    sleeper.position.set(-0.68 + sleeperIndex * 0.225, 0.45, 0.685);
    root.add(sleeper);
  }
  root.add(
    timberBeamBetween(new THREE.Vector3(-0.1, 0.49, 0.59), new THREE.Vector3(0.55, 0.49, 0.08), 0.04, materials.railSteel, 'ISLAND_13_SIGNAL_YARD_SWITCH_RAIL_A'),
    timberBeamBetween(new THREE.Vector3(0.08, 0.49, 0.77), new THREE.Vector3(0.68, 0.49, 0.23), 0.04, materials.railSteel, 'ISLAND_13_SIGNAL_YARD_SWITCH_RAIL_B'),
  );
  const switchStand = cylinder(0.08, 0.1, 0.38, materials.iron, 8);
  switchStand.name = 'ISLAND_13_SIGNAL_YARD_SWITCH_STAND';
  switchStand.position.set(0.78, 0.61, 0.48);
  const switchLever = box(0.05, 0.44, 0.05, materials.brass);
  switchLever.name = 'ISLAND_13_SIGNAL_YARD_SWITCH_LEVER';
  switchLever.position.set(0.67, 0.79, 0.48);
  switchLever.rotation.z = -0.55;
  root.add(switchStand, switchLever);
  for (let rungIndex = 0; rungIndex < 6; rungIndex += 1) {
    const rung = box(0.27, 0.025, 0.035, materials.brass);
    rung.name = `ISLAND_13_SIGNAL_YARD_MAST_LADDER_RUNG_${rungIndex + 1}`;
    rung.position.set(-0.46, 0.66 + rungIndex * 0.2, 0.01);
    root.add(rung);
  }
  root.userData.sculptRuntime = { parts: [registerIsland13RuntimePart('showdown-signal-yard', root, 'landmark')] };
  return root;
}

function createSheriffArchive(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island13CactusCanyonMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_13_SHERIFF_ARCHIVE';
  addPlinth(root, 1.02, materials, quality);
  const office = box(1.12, 0.9 + level * 0.12, 0.88, materials.timber);
  office.name = 'ISLAND_13_SHERIFF_OFFICE';
  office.position.y = 0.74 + level * 0.06;
  const roof = createGableRoof(1.34, 0.4, 1.04, materials.roof);
  roof.name = 'ISLAND_13_SHERIFF_OFFICE_ROOF';
  roof.position.y = 1.2 + level * 0.12;
  root.add(office, roof);
  addFourSideWindowSet(root, 'ISLAND_13_SHERIFF_OFFICE', 0.57, 0.45, 0.9, materials, 0.22, 0.31);
  addWraparoundTimberBand(root, 'ISLAND_13_SHERIFF_OFFICE', 0.56, 0.44, 1.08, materials.timberWorn);
  addFourSideSidingCourses(root, 'ISLAND_13_SHERIFF_OFFICE', 0.56, 0.44, 0.42, 0.64, 4, materials.timberWorn);
  const porch = box(1.28, 0.09, 0.44, materials.timberWorn);
  porch.name = 'ISLAND_13_SHERIFF_FRONT_PORCH';
  porch.position.set(0, 0.42, 0.62);
  root.add(porch);
  const frontDoor = box(0.28, 0.6, 0.07, materials.bluePaint);
  frontDoor.name = 'ISLAND_13_SHERIFF_FRONT_DOOR';
  frontDoor.position.set(0, 0.72, 0.475);
  const frontAwning = createGableRoof(0.88, 0.24, 0.48, materials.roof);
  frontAwning.name = 'ISLAND_13_SHERIFF_FRONT_AWNING';
  frontAwning.position.set(0, 1.16, 0.58);
  root.add(frontDoor, frontAwning);
  for (let stepIndex = 0; stepIndex < 3; stepIndex += 1) {
    const step = box(0.66 + stepIndex * 0.12, 0.07, 0.16, materials.sandstoneLight);
    step.name = `ISLAND_13_SHERIFF_FRONT_STEP_${stepIndex + 1}`;
    step.position.set(0, 0.36 - stepIndex * 0.045, 0.78 + stepIndex * 0.13);
    root.add(step);
  }
  const rearPorch = box(0.92, 0.08, 0.36, materials.timberWorn);
  rearPorch.name = 'ISLAND_13_SHERIFF_REAR_PORCH';
  rearPorch.position.set(0, 0.4, -0.58);
  const rearDoor = box(0.27, 0.58, 0.065, materials.bluePaint);
  rearDoor.name = 'ISLAND_13_SHERIFF_REAR_DOOR';
  rearDoor.position.set(0, 0.67, -0.46);
  root.add(rearPorch, rearDoor);
  [-0.48, 0.48].forEach((x) => {
    const post = box(0.08, 0.72, 0.08, materials.timberWorn);
    post.position.set(x, 0.77, 0.68);
    root.add(post);
  });
  addWindow(root, -0.32, 0.88, 0.46, 0.25, 0.36, materials);
  addWindow(root, 0.32, 0.88, 0.46, 0.25, 0.36, materials);
  if (level >= 2) {
    const mapRoom = box(0.48, 0.62, 0.72, materials.timberWorn);
    mapRoom.name = 'ISLAND_13_SHERIFF_MAP_ROOM';
    mapRoom.position.set(-0.72, 0.61, -0.08);
    const mapRoomRoof = createGableRoof(0.62, 0.3, 0.84, materials.roof);
    mapRoomRoof.name = 'ISLAND_13_SHERIFF_MAP_ROOM_ROOF';
    mapRoomRoof.position.set(-0.72, 0.94, -0.08);
    root.add(mapRoom, mapRoomRoof);
    addFourSideWindowSet(root, 'ISLAND_13_SHERIFF_MAP_ROOM', 0.25, 0.37, 0.68, materials, 0.14, 0.21, -0.72, -0.08);
    addFourSideSidingCourses(root, 'ISLAND_13_SHERIFF_MAP_ROOM', 0.24, 0.36, 0.4, 0.34, 2, materials.timber, -0.72, -0.08);
    const lantern = box(0.5, 0.52, 0.5, materials.timberWorn);
    lantern.name = 'ISLAND_13_SHERIFF_LOOKOUT_LANTERN';
    lantern.position.y = 1.62 + level * 0.1;
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.38, 4), materials.roof);
    crown.name = 'ISLAND_13_SHERIFF_LOOKOUT_CROWN';
    crown.rotation.y = Math.PI / 4;
    crown.position.y = 2.02 + level * 0.1;
    root.add(lantern, crown);
    addFourSideWindowSet(root, 'ISLAND_13_SHERIFF_LOOKOUT', 0.26, 0.26, 1.62 + level * 0.1, materials, 0.18, 0.24);
  }
  if (level >= 3) {
    const safeRecess = box(0.5, 0.62, 0.11, materials.iron);
    safeRecess.name = 'ISLAND_13_SHERIFF_RECORDS_SAFE_RECESS';
    safeRecess.position.set(0.36, 0.75, 0.49);
    const safeDoor = box(0.4, 0.52, 0.08, materials.bluePaint);
    safeDoor.name = 'ISLAND_13_SHERIFF_RECORDS_SAFE_DOOR';
    safeDoor.position.set(0.36, 0.75, 0.575);
    const safeWheel = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 5, 12), materials.brass);
    safeWheel.name = 'ISLAND_13_SHERIFF_RECORDS_SAFE_WHEEL';
    safeWheel.position.set(0.36, 0.75, 0.625);
    const safeWheelHub = cylinder(0.04, 0.04, 0.06, materials.brass, 10);
    safeWheelHub.name = 'ISLAND_13_SHERIFF_RECORDS_SAFE_WHEEL_HUB';
    safeWheelHub.rotation.x = Math.PI / 2;
    safeWheelHub.position.set(0.36, 0.75, 0.625);
    root.add(safeRecess, safeDoor, safeWheel, safeWheelHub);
    [-1, 1].forEach((xSide) => [-1, 1].forEach((ySide) => {
      const safeBolt = new THREE.Mesh(new THREE.SphereGeometry(0.025, 7, 5), materials.brass);
      safeBolt.name = `ISLAND_13_SHERIFF_RECORDS_SAFE_BOLT_${xSide < 0 ? 'WEST' : 'EAST'}_${ySide < 0 ? 'LOW' : 'HIGH'}`;
      safeBolt.position.set(0.36 + xSide * 0.15, 0.75 + ySide * 0.21, 0.625);
      root.add(safeBolt);
    }));

    const rearMapChest = box(0.48, 0.24, 0.3, materials.timberWorn);
    rearMapChest.name = 'ISLAND_13_SHERIFF_REAR_MAP_CHEST';
    rearMapChest.position.set(0.34, 0.5, -0.68);
    const mapRoll = cylinder(0.055, 0.055, 0.42, materials.sandstoneLight, 8);
    mapRoll.name = 'ISLAND_13_SHERIFF_REAR_MAP_ROLL';
    mapRoll.rotation.z = Math.PI / 2;
    mapRoll.position.set(0.34, 0.66, -0.68);
    const rearRecordsHatch = box(0.34, 0.42, 0.075, materials.bluePaint);
    rearRecordsHatch.name = 'ISLAND_13_SHERIFF_REAR_RECORDS_HATCH';
    rearRecordsHatch.position.set(0.34, 0.78, -0.495);
    const rearRecordsWheel = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 5, 10), materials.brass);
    rearRecordsWheel.name = 'ISLAND_13_SHERIFF_REAR_RECORDS_WHEEL';
    rearRecordsWheel.rotation.y = Math.PI;
    rearRecordsWheel.position.set(0.34, 0.78, -0.54);
    root.add(rearMapChest, mapRoll, rearRecordsHatch, rearRecordsWheel);
  }
  const badgeShape = new THREE.Shape();
  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 === 0 ? 0.2 : 0.09;
    const angle = -Math.PI / 2 + index / 10 * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) badgeShape.moveTo(x, y);
    else badgeShape.lineTo(x, y);
  }
  badgeShape.closePath();
  const badge = new THREE.Mesh(new THREE.ExtrudeGeometry(badgeShape, { depth: 0.035, bevelEnabled: false }), materials.brass);
  badge.name = 'ISLAND_13_SHERIFF_FRONT_BADGE';
  badge.position.set(0, 1.2, 0.51);
  const rearBadge = badge.clone();
  rearBadge.name = 'ISLAND_13_SHERIFF_REAR_BADGE';
  rearBadge.rotation.y = Math.PI;
  rearBadge.position.set(-0.28, 1.13, -0.49);
  root.add(badge, rearBadge);
  [[-0.82, 0.56], [0.82, 0.56], [-0.78, -0.62], [0.78, -0.62]].forEach(([x, z], markerIndex) => {
    const marker = box(0.055, 0.54, 0.055, materials.timberWorn);
    marker.name = `ISLAND_13_SHERIFF_CLAIM_MARKER_${markerIndex + 1}`;
    marker.position.set(x, 0.58, z);
    const markerCap = cylinder(0.07, 0.07, 0.035, markerIndex % 2 ? materials.brass : materials.bluePaint, 8);
    markerCap.name = `ISLAND_13_SHERIFF_CLAIM_MARKER_CAP_${markerIndex + 1}`;
    markerCap.rotation.x = Math.PI / 2;
    markerCap.position.set(x, 0.82, z + 0.035);
    root.add(marker, markerCap);
  });
  root.userData.sculptRuntime = { parts: [registerIsland13RuntimePart('sheriff-archive', root, 'landmark')] };
  return root;
}

export function buildIsland13CactusCanyonLandmark(
  definition: Island5LandmarkDefinition,
  level: BuildLevel,
  quality: Island3DQuality,
  materials: Island13CactusCanyonMaterials,
) {
  const resolvedLevel = Math.max(1, level) as 1 | 2 | 3;
  const architecture = definition.id === 'hatchery'
    ? createRailNestWaterworks(resolvedLevel, quality, materials)
    : definition.id === 'habit'
      ? createWindmillRanch(resolvedLevel, quality, materials)
      : definition.id === 'wisdom'
        ? createSheriffArchive(resolvedLevel, quality, materials)
        : definition.id === 'event'
          ? createSignalYard(resolvedLevel, quality, materials)
          : createUnionStation(resolvedLevel, quality, materials);
  if (definition.id !== 'boss') {
    addIsland13LandmarkRailPassage(architecture, definition.id, materials);
  }
  architecture.position.set(...definition.position);
  if (definition.id === 'boss') architecture.scale.set(1.42, 1.7, 1.68);
  else architecture.scale.set(1.22, 1.22, 1.3);
  if (definition.id !== 'boss') architecture.rotation.y = Math.atan2(-definition.position[0], -definition.position[2]);
  architecture.userData.landmarkId = definition.id;
  architecture.userData.buildLevel = level;
  architecture.userData.sculptRuntime = {
    ...(architecture.userData.sculptRuntime ?? {}),
    clickable: true,
    explodable: true,
    sockets: { focus: `ISLAND_13_${definition.id.toUpperCase()}_FOCUS_SOCKET` },
    colliders: [{ id: `island-013-${definition.id}`, type: 'cylinder', isTrigger: true }],
  };
  if (level === 0) architecture.visible = false;
  return architecture;
}

export function collectIsland13LandmarkTrainClearanceViolations(landmark: THREE.Object3D): string[] {
  const id = String(landmark.userData.landmarkId ?? '').toUpperCase();
  const architecture = landmark.getObjectByName(`ISLAND_13_${id}_RAIL_PASSAGE_ARCHITECTURE_SETBACK`);
  if (!architecture) return id === 'BOSS' ? [] : [`${id || 'UNKNOWN'}:missing-architecture-setback`];
  landmark.updateMatrixWorld(true);
  const innerRadius = ISLAND_13_SUMMIT_RAIL_RADIUS - ISLAND_13_TRAIN_CLEARANCE_HALF_WIDTH;
  const outerRadius = ISLAND_13_SUMMIT_RAIL_RADIUS + ISLAND_13_TRAIN_CLEARANCE_HALF_WIDTH;
  const trainBottom = 0.42;
  const trainTop = ISLAND_13_TRAIN_CLEARANCE_HEIGHT;
  const violations = new Set<string>();
  const worldPoint = new THREE.Vector3();
  const instanceMatrix = new THREE.Matrix4();
  const instanceWorldMatrix = new THREE.Matrix4();

  architecture.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh)) return;
    const positions = object.geometry.getAttribute('position');
    if (!positions) return;
    const instanceCount = object instanceof THREE.InstancedMesh ? object.count : 1;
    for (let instanceIndex = 0; instanceIndex < instanceCount; instanceIndex += 1) {
      if (object instanceof THREE.InstancedMesh) {
        object.getMatrixAt(instanceIndex, instanceMatrix);
        instanceWorldMatrix.multiplyMatrices(object.matrixWorld, instanceMatrix);
      } else {
        instanceWorldMatrix.copy(object.matrixWorld);
      }
      let minRadius = Number.POSITIVE_INFINITY;
      let maxRadius = 0;
      let minY = Number.POSITIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      for (let vertexIndex = 0; vertexIndex < positions.count; vertexIndex += 1) {
        worldPoint.fromBufferAttribute(positions, vertexIndex).applyMatrix4(instanceWorldMatrix);
        const radius = Math.hypot(worldPoint.x, worldPoint.z);
        minRadius = Math.min(minRadius, radius);
        maxRadius = Math.max(maxRadius, radius);
        minY = Math.min(minY, worldPoint.y);
        maxY = Math.max(maxY, worldPoint.y);
      }
      const overlapsRail = maxRadius >= innerRadius && minRadius <= outerRadius;
      const overlapsTrainHeight = maxY >= trainBottom && minY <= trainTop;
      if (overlapsRail && overlapsTrainHeight) {
        violations.add(`${object.name || object.geometry.type}${instanceCount > 1 ? `#${instanceIndex + 1}` : ''}`);
      }
    }
  });
  return [...violations];
}

function createButteField(materials: Island13CactusCanyonMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_13_BACKGROUND_CANYON';
  const placements = [
    [-25, -43, 4.4, 6.4], [-19, -48, 3.25, 4.7], [-13, -42, 3.85, 5.8], [-7, -51, 3.1, 4.5],
    [-1, -46, 4.65, 6.9], [5.5, -52, 3.0, 4.3], [11, -44, 3.8, 5.6], [17, -49, 3.2, 4.6],
    [24, -42, 4.35, 6.2], [-21, -34, 3.25, 4.4], [-10, -37, 2.85, 4.0], [9, -37, 3.0, 4.1], [21, -34, 3.35, 4.6],
  ] as const;
  const farRock = materials.sandstone.clone();
  farRock.color.setHex(0xa85d4c);
  farRock.roughness = 0.92;
  const farLight = materials.sandstoneLight.clone();
  farLight.color.setHex(0xc87d61);
  farLight.roughness = 0.9;
  const count = Math.max(5, Math.round(placements.length * detailScale(quality)));
  const baseTerraces = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.82, 1, 1, 10),
    farRock,
    count,
  );
  const middleTerraces = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.74, 0.92, 1, 9),
    farRock,
    count,
  );
  const crownTerraces = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.82, 1, 1, 9),
    farLight,
    count,
  );
  const spireCount = count * 2;
  const attachedSpires = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.76, 1, 1, 8),
    farRock,
    spireCount,
  );
  const spireCaps = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.72, 0),
    farLight,
    spireCount,
  );
  const canyonShelf = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.8, 0),
    farRock,
    count,
  );
  baseTerraces.name = 'ISLAND_13_BACKGROUND_MESA_BASE_TERRACES';
  middleTerraces.name = 'ISLAND_13_BACKGROUND_MESA_STEM_FIELD';
  crownTerraces.name = 'ISLAND_13_BACKGROUND_MESA_CROWNS';
  attachedSpires.name = 'ISLAND_13_BACKGROUND_ATTACHED_SPIRES';
  spireCaps.name = 'ISLAND_13_BACKGROUND_SPIRE_CAPS';
  canyonShelf.name = 'ISLAND_13_BACKGROUND_CONTINENTAL_SHELF';
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  for (let index = 0; index < count; index += 1) {
    const [x, z, radius, height] = placements[index];
    // Keep the continental skyline below the summit. Earlier background buttes
    // were isolated towers; the first connected-shelf pass over-corrected into
    // a rock ceiling because its dodecahedra were scaled far beyond their bays.
    // The overview camera looks steeply down the canyon. A constant world-Y
    // background floats higher and higher on screen as Z recedes, so anchor
    // every formation to the camera's descending horizon plane instead.
    const groundY = 12 + z * 0.716 - (index % 3) * 0.28;
    const yaw = index * 0.47;
    const depthScale = 0.66 + (index % 3) * 0.07;
    const baseHeight = height * 0.26;
    const middleHeight = height * (0.3 + (index % 2) * 0.035);
    const crownHeight = height * 0.2;
    quaternion.setFromEuler(new THREE.Euler(0, yaw, (index % 3 - 1) * 0.025));
    matrix.compose(
      position.set(x, groundY + baseHeight * 0.5, z),
      quaternion,
      scale.set(radius, baseHeight, radius * depthScale),
    );
    baseTerraces.setMatrixAt(index, matrix);
    matrix.compose(
      position.set(x + Math.sin(index * 1.4) * radius * 0.08, groundY + baseHeight + middleHeight * 0.5, z),
      quaternion,
      scale.set(radius * 0.82, middleHeight, radius * depthScale * 0.84),
    );
    middleTerraces.setMatrixAt(index, matrix);
    const crownY = groundY + baseHeight + middleHeight + crownHeight * 0.5;
    matrix.compose(
      position.set(x - Math.cos(index * 1.1) * radius * 0.07, crownY, z),
      quaternion,
      scale.set(radius * 0.68, crownHeight, radius * depthScale * 0.72),
    );
    crownTerraces.setMatrixAt(index, matrix);
    matrix.compose(
      // A low, overlapping cliff shelf hangs down from each mesa base so the
      // distant formations read as the rim of one canyon country. It is deep
      // vertically, but kept modest in plan so it cannot become a sky ceiling.
      position.set(x, groundY - 1.78, z + 0.35),
      quaternion,
      scale.set(radius * 1.52, 2.9, radius * depthScale * 1.22),
    );
    canyonShelf.setMatrixAt(index, matrix);

    for (let spireIndex = 0; spireIndex < 2; spireIndex += 1) {
      const instanceIndex = index * 2 + spireIndex;
      const spireEnabled = spireIndex === 0 || index % 3 === 0;
      const side = spireIndex === 0 ? -1 : 1;
      const spireHeight = spireEnabled ? height * (0.42 + ((index + spireIndex) % 3) * 0.055) : 0.001;
      const spireWidth = spireEnabled ? radius * (spireIndex === 0 ? 0.28 : 0.2) : 0.001;
      const spireX = x + side * radius * (spireIndex === 0 ? 0.18 : 0.34);
      const spireZ = z + side * radius * depthScale * 0.08;
      const crownTop = crownY + crownHeight * 0.5;
      matrix.compose(
        position.set(spireX, crownTop + spireHeight * 0.5, spireZ),
        quaternion.setFromEuler(new THREE.Euler(0, yaw + side * 0.1, side * 0.025)),
        scale.set(spireWidth, spireHeight, spireWidth * depthScale),
      );
      attachedSpires.setMatrixAt(instanceIndex, matrix);
      matrix.compose(
        position.set(spireX, crownTop + spireHeight, spireZ),
        quaternion,
        scale.set(spireWidth * 0.92, spireWidth * 0.36, spireWidth * depthScale),
      );
      spireCaps.setMatrixAt(instanceIndex, matrix);
    }
  }
  [baseTerraces, middleTerraces, crownTerraces, attachedSpires, spireCaps, canyonShelf].forEach((mesh) => {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.userData.explodeWithParent = true;
    root.add(mesh);
  });

  // A second, lower ring closes the canyon country in every orbit direction.
  // These are broad eroded mesas—not needle pillars—and they remain well
  // below the playable summit so the hero column keeps its monumental height.
  const horizonCount = quality === 'high' ? 26 : quality === 'medium' ? 20 : 14;
  const horizonBases = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.78, 1, 1, 10),
    farRock,
    horizonCount,
  );
  const horizonCaps = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.9, 1, 1, 9),
    farLight,
    horizonCount,
  );
  horizonBases.name = 'ISLAND_13_360_CANYON_HORIZON_BASES';
  horizonCaps.name = 'ISLAND_13_360_CANYON_HORIZON_CAPS';
  for (let index = 0; index < horizonCount; index += 1) {
    const angle = index / horizonCount * Math.PI * 2 + 0.16;
    const radius = 35 + (index % 5) * 3.8;
    const width = 3.6 + (index % 4) * 0.9;
    const height = 4.2 + (index % 6) * 0.72;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const groundY = -17.2 - (index % 3) * 0.55;
    quaternion.setFromEuler(new THREE.Euler(0, -angle + (index % 3 - 1) * 0.12, (index % 2 ? 1 : -1) * 0.025));
    matrix.compose(
      position.set(x, groundY + height * 0.46, z),
      quaternion,
      scale.set(width * 1.25, height * 0.92, width * (0.72 + (index % 3) * 0.08)),
    );
    horizonBases.setMatrixAt(index, matrix);
    matrix.compose(
      position.set(x + Math.sin(index * 1.7) * 0.42, groundY + height * 0.91, z),
      quaternion,
      scale.set(width, height * 0.16, width * (0.64 + (index % 3) * 0.07)),
    );
    horizonCaps.setMatrixAt(index, matrix);
  }
  [horizonBases, horizonCaps].forEach((mesh) => {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    root.add(mesh);
  });
  root.userData.sculptRuntime = { parts: [registerIsland13RuntimePart('background-canyon', root, 'background')] };
  return root;
}

function createLocomotive(materials: Island13CactusCanyonMaterials, quality: Island3DQuality) {
  const orbit = new THREE.Group();
  orbit.name = 'ISLAND_13_LOCOMOTIVE_ORBIT';
  const units: Island13TrainUnit[] = [];
  const createWheelPair = (owner: THREE.Group, wheelPivots: THREE.Group[], x: number, wheelRadius = 0.16) => {
    [-1, 1].forEach((side) => {
      const pivot = new THREE.Group();
      pivot.name = `${owner.name}_WHEEL_PIVOT_${wheelPivots.length + 1}`;
      // Rail centre lines sit at +/-0.20 from the route centre. Keep the wheel
      // tread centred at 0.21 so its 0.085-wide axle intersects the steel rail
      // instead of merely hovering outside the gauge.
      pivot.position.set(x, 0.16, side * 0.21);
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.085, 10),
        materials.railSteel,
      );
      wheel.rotation.x = Math.PI / 2;
      pivot.add(wheel);
      wheelPivots.push(pivot);
      owner.add(pivot);
    });
  };

  const train = new THREE.Group();
  train.name = 'ISLAND_13_CANYON_LOOP_LOCOMOTIVE';
  const engineWheels: THREE.Group[] = [];
  const boiler = cylinder(0.28, 0.28, 0.82, materials.bluePaint, segments(quality));
  boiler.rotation.z = Math.PI / 2;
  boiler.position.set(0.08, 0.46, 0);
  const cab = box(0.54, 0.7, 0.58, materials.bluePaint);
  cab.position.set(-0.5, 0.48, 0);
  const chimney = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 10), materials.iron);
  chimney.position.set(0.31, 0.94, 0);
  const cowcatcher = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.62, 4, 1, true), materials.brass);
  cowcatcher.rotation.z = -Math.PI / 2;
  cowcatcher.rotation.y = Math.PI / 4;
  cowcatcher.position.set(0.78, 0.22, 0);
  const headlamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), materials.window);
  headlamp.position.set(0.5, 0.68, 0);
  train.add(boiler, cab, chimney, cowcatcher, headlamp);
  [-1, 1].forEach((side) => {
    const cabWindow = box(0.24, 0.28, 0.055, materials.window);
    cabWindow.name = `ISLAND_13_LOCOMOTIVE_CAB_${side < 0 ? 'PORT' : 'STARBOARD'}_WINDOW`;
    cabWindow.position.set(-0.48, 0.62, side * 0.305);
    train.add(cabWindow);
  });
  [0.0, -0.28, -0.56].forEach((x) => {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 6, 12), materials.brass);
    band.rotation.z = Math.PI / 2;
    band.position.set(x + 0.08, 0.46, 0);
    train.add(band);
  });
  [-0.48, -0.06, 0.38].forEach((x) => createWheelPair(train, engineWheels, x, 0.17));
  const steamPuffs: THREE.Mesh[] = [];
  for (let index = 0; index < 4; index += 1) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.14 + index * 0.045, 8, 6), materials.steam);
    puff.position.set(0.31 - index * 0.06, 1.14 + index * 0.22, 0);
    train.add(puff);
    steamPuffs.push(puff);
  }
  train.userData.steamPuffs = steamPuffs;
  train.userData.consistRole = 'engine';
  units.push({ node: train, offset: 0, wheelPivots: engineWheels });

  const tender = new THREE.Group();
  tender.name = 'ISLAND_13_TRAIN_TENDER';
  const tenderWheels: THREE.Group[] = [];
  const tenderBody = box(0.72, 0.5, 0.58, materials.bluePaint);
  tenderBody.position.y = 0.42;
  const coal = box(0.54, 0.12, 0.46, materials.iron);
  coal.position.y = 0.73;
  const tenderCouplerFront = box(0.2, 0.07, 0.09, materials.iron);
  tenderCouplerFront.position.set(0.45, 0.24, 0);
  const tenderCouplerRear = tenderCouplerFront.clone();
  tenderCouplerRear.position.x = -0.45;
  tender.add(tenderBody, coal, tenderCouplerFront, tenderCouplerRear);
  [-0.22, 0.22].forEach((x) => createWheelPair(tender, tenderWheels, x));
  tender.userData.consistRole = 'tender';
  units.push({ node: tender, offset: 1.02, wheelPivots: tenderWheels });

  const createCoach = (coachIndex: number, offset: number) => {
    const coach = new THREE.Group();
    coach.name = `ISLAND_13_TRAIN_PASSENGER_CARRIAGE_${coachIndex}`;
    const coachWheels: THREE.Group[] = [];
    const body = box(0.92, 0.62, 0.64, coachIndex === 1 ? materials.timber : materials.bluePaint);
    body.position.y = 0.49;
    const roof = createGableRoof(1.04, 0.25, 0.74, materials.roof);
    roof.position.y = 0.83;
    coach.add(body, roof);
    [-1, 1].forEach((side) => {
      [-0.26, 0, 0.26].forEach((windowOffset, windowIndex) => {
        const window = box(0.18, 0.24, 0.05, materials.window);
        window.name = coachIndex === 1
          ? `ISLAND_13_COACH_${side < 0 ? 'PORT' : 'STARBOARD'}_WINDOW_${windowIndex + 1}`
          : `ISLAND_13_COACH_${coachIndex}_${side < 0 ? 'PORT' : 'STARBOARD'}_WINDOW_${windowIndex + 1}`;
        window.position.set(windowOffset, 0.56, side * 0.345);
        coach.add(window);
      });
    });
    const rearDoor = box(0.055, 0.44, 0.26, materials.bluePaint);
    rearDoor.name = coachIndex === 1 ? 'ISLAND_13_COACH_REAR_DOOR' : `ISLAND_13_COACH_${coachIndex}_REAR_DOOR`;
    rearDoor.position.set(-0.49, 0.45, 0);
    const frontCoupler = box(0.2, 0.07, 0.09, materials.iron);
    frontCoupler.position.set(0.56, 0.24, 0);
    const rearCoupler = frontCoupler.clone();
    rearCoupler.position.x = -0.56;
    coach.add(rearDoor, frontCoupler, rearCoupler);
    [-0.3, 0.3].forEach((x) => createWheelPair(coach, coachWheels, x));
    coach.userData.consistRole = 'passenger-carriage';
    units.push({ node: coach, offset, wheelPivots: coachWheels });
    return coach;
  };
  const firstCoach = createCoach(1, 2.08);
  const secondCoach = createCoach(2, 3.2);

  orbit.add(train, tender, firstCoach, secondCoach);
  orbit.userData.trainUnits = units;
  orbit.userData.consistLength = 3.2;
  const summitAngle = ISLAND_13_SPIRAL_START_ANGLE + ISLAND_13_SPIRAL_TURNS * Math.PI * 2;
  units.forEach((unit) => {
    const unitAngle = summitAngle + unit.offset / ISLAND_13_SUMMIT_RAIL_RADIUS;
    setIsland13TrainUnitPose(unit, sampleIsland13SummitRail(unitAngle, true));
  });
  orbit.userData.sculptRuntime = { parts: [registerIsland13RuntimePart('locomotive', orbit, 'ambience')] };
  return orbit;
}

function createRailway(materials: Island13CactusCanyonMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_13_RAILWAY_SYSTEM';
  [5.08, 5.48].forEach((radius) => {
    const rail = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.055, 6, segments(quality) * 6), materials.railSteel);
    rail.rotation.x = Math.PI / 2;
    rail.position.y = 0.4;
    root.add(rail);
  });
  const sleeperCount = quality === 'high' ? 84 : quality === 'medium' ? 64 : 44;
  const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.75, 0.08, 0.15), materials.timber, sleeperCount);
  sleepers.name = 'ISLAND_13_RAIL_SLEEPERS';
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  for (let index = 0; index < sleeperCount; index += 1) {
    const angle = index / sleeperCount * Math.PI * 2;
    quaternion.setFromEuler(new THREE.Euler(0, -angle, 0));
    matrix.compose(
      position.set(
        Math.cos(angle) * ISLAND_13_SUMMIT_RAIL_RADIUS,
        0.34,
        Math.sin(angle) * ISLAND_13_SUMMIT_RAIL_RADIUS,
      ),
      quaternion,
      new THREE.Vector3(1, 1, 1),
    );
    sleepers.setMatrixAt(index, matrix);
  }
  sleepers.instanceMatrix.needsUpdate = true;
  sleepers.receiveShadow = true;
  root.add(sleepers);
  const ballastCount = quality === 'high' ? 120 : quality === 'medium' ? 84 : 52;
  const ballast = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.09, 0), materials.sandstoneShadow, ballastCount);
  const ballastScale = new THREE.Vector3();
  for (let index = 0; index < ballastCount; index += 1) {
    const angle = index / ballastCount * Math.PI * 2;
    const radius = 4.92 + (index % 4) * 0.2;
    const size = 0.62 + (index % 5) * 0.09;
    quaternion.setFromEuler(new THREE.Euler(index * 0.1, -angle, index * 0.17));
    matrix.compose(
      position.set(Math.cos(angle) * radius, 0.32, Math.sin(angle) * radius),
      quaternion,
      ballastScale.set(size, size * 0.58, size * 1.3),
    );
    ballast.setMatrixAt(index, matrix);
  }
  ballast.instanceMatrix.needsUpdate = true;
  root.add(ballast);
  root.userData.sculptRuntime = { parts: [registerIsland13RuntimePart('railway-system', root, 'railway')] };
  return root;
}

function createCactusCanyonSpiralRail(
  materials: Island13CactusCanyonMaterials,
  quality: Island3DQuality,
) {
  const root = new THREE.Group();
  root.name = 'ISLAND_13_SPIRAL_RAIL_MISSION';
  root.userData.signatureMissionId = 'cactus-canyon-spiral-rail';
  const segmentCount = 16;
  const turns = ISLAND_13_SPIRAL_TURNS;
  const spiralStartAngle = ISLAND_13_SPIRAL_START_ANGLE;
  const spiralBottomRadius = ISLAND_13_SPIRAL_BOTTOM_RADIUS;
  const spiralTopRadius = ISLAND_13_SPIRAL_TOP_RADIUS;
  const spiralBottomY = ISLAND_13_SPIRAL_BOTTOM_Y;
  const spiralTopY = ISLAND_13_SPIRAL_TOP_Y;
  const galleryCutMaterial = materials.iron.clone();
  galleryCutMaterial.color.setHex(0x4b241a);
  galleryCutMaterial.roughness = 0.92;
  galleryCutMaterial.metalness = 0.05;
  galleryCutMaterial.side = THREE.DoubleSide;
  const galleryFloorMaterial = materials.sandstone.clone();
  galleryFloorMaterial.side = THREE.DoubleSide;
  // Keep the railway readable on the sunset-shadowed rear face without
  // making the rock itself glow. This is a very small warm bounce value,
  // comparable to light reflected from the canyon floor.
  galleryFloorMaterial.emissive.setHex(0x361106);
  galleryFloorMaterial.emissiveIntensity = 0.055;
  const galleryRoofRockGeometry = new THREE.DodecahedronGeometry(0.38, 0);
  const galleryPierGeometry = new THREE.BoxGeometry(0.28, 1, 0.36);
  const galleryPierCapGeometry = new THREE.BoxGeometry(0.72, 0.14, 0.46);
  const portalStoneGeometry = beveledBlockGeometry(0.34, 0.3, 0.28, 0.045);
  const galleryBallastGeometry = new THREE.DodecahedronGeometry(0.075, 0);
  const spiralElevation = island13SpiralElevation;
  const railSegments: THREE.Group[] = [];
  const blastAnchors: THREE.Vector3[] = [];
  for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
    const segmentRoot = new THREE.Group();
    segmentRoot.name = `ISLAND_13_SPIRAL_RAIL_SEGMENT_${segmentIndex + 1}`;
    const startProgress = segmentIndex / segmentCount;
    const endProgress = (segmentIndex + 1) / segmentCount;
    const midpointProgress = (startProgress + endProgress) / 2;
    const midpointAngle = spiralStartAngle + midpointProgress * turns * Math.PI * 2;
    const midpointRadius = THREE.MathUtils.lerp(spiralBottomRadius, spiralTopRadius, midpointProgress);
    blastAnchors.push(new THREE.Vector3(
      Math.cos(midpointAngle) * midpointRadius,
      spiralElevation(midpointProgress) + 0.35,
      Math.sin(midpointAngle) * midpointRadius,
    ));
    const buildCurve = (radialOffset: number, verticalOffset = 0) => {
      const points: THREE.Vector3[] = [];
      const pointCount = quality === 'low' ? 5 : 8;
      for (let pointIndex = 0; pointIndex <= pointCount; pointIndex += 1) {
        const progress = THREE.MathUtils.lerp(startProgress, endProgress, pointIndex / pointCount);
        const angle = spiralStartAngle + progress * turns * Math.PI * 2;
        const radius = THREE.MathUtils.lerp(spiralBottomRadius, spiralTopRadius, progress) + radialOffset;
        const y = spiralElevation(progress) + verticalOffset;
        points.push(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
      }
      return new THREE.CatmullRomCurve3(points);
    };
    const ribbonPositions: number[] = [];
    const ribbonIndices: number[] = [];
    const floorPositions: number[] = [];
    const floorIndices: number[] = [];
    const fasciaPositions: number[] = [];
    const fasciaIndices: number[] = [];
    const ribbonSteps = quality === 'low' ? 7 : 11;
    for (let pointIndex = 0; pointIndex <= ribbonSteps; pointIndex += 1) {
      const progress = THREE.MathUtils.lerp(startProgress, endProgress, pointIndex / ribbonSteps);
      const angle = spiralStartAngle + progress * turns * Math.PI * 2;
      const trackRadius = THREE.MathUtils.lerp(spiralBottomRadius, spiralTopRadius, progress);
      const radius = trackRadius + 0.08;
      const centerY = spiralElevation(progress);
      const lowerGalleryWeight = 1 - THREE.MathUtils.smoothstep(progress, 0.68, 0.9);
      const innerShelfOffset = THREE.MathUtils.lerp(0.46, 0.58, lowerGalleryWeight);
      const outerShelfOffset = THREE.MathUtils.lerp(0.72, 0.92, lowerGalleryWeight);
      const fasciaDrop = THREE.MathUtils.lerp(0.46, 0.74, lowerGalleryWeight);
      const summitOpeningBlend = THREE.MathUtils.smoothstep(progress, 0.9, 1);
      const cutRoofHeight = THREE.MathUtils.lerp(0.62, 0.18, summitOpeningBlend);
      ribbonPositions.push(
        Math.cos(angle) * radius, centerY + cutRoofHeight, Math.sin(angle) * radius,
        Math.cos(angle) * radius, centerY - 0.36, Math.sin(angle) * radius,
      );
      const floorY = spiralElevation(progress) - 0.11;
      floorPositions.push(
        Math.cos(angle) * (trackRadius - innerShelfOffset), floorY, Math.sin(angle) * (trackRadius - innerShelfOffset),
        Math.cos(angle) * (trackRadius + outerShelfOffset), floorY, Math.sin(angle) * (trackRadius + outerShelfOffset),
      );
      fasciaPositions.push(
        Math.cos(angle) * (trackRadius + outerShelfOffset), floorY, Math.sin(angle) * (trackRadius + outerShelfOffset),
        Math.cos(angle) * (trackRadius + outerShelfOffset + lowerGalleryWeight * 0.055), floorY - fasciaDrop, Math.sin(angle) * (trackRadius + outerShelfOffset + lowerGalleryWeight * 0.055),
      );
      if (pointIndex < ribbonSteps) {
        const offset = pointIndex * 2;
        ribbonIndices.push(offset, offset + 1, offset + 2, offset + 1, offset + 3, offset + 2);
        floorIndices.push(offset, offset + 2, offset + 1, offset + 1, offset + 2, offset + 3);
        fasciaIndices.push(offset, offset + 1, offset + 2, offset + 1, offset + 3, offset + 2);
      }
    }
    const ribbonGeometry = new THREE.BufferGeometry();
    ribbonGeometry.setAttribute('position', new THREE.Float32BufferAttribute(ribbonPositions, 3));
    ribbonGeometry.setIndex(ribbonIndices);
    ribbonGeometry.computeVertexNormals();
    const excavatedGallery = new THREE.Mesh(ribbonGeometry, galleryCutMaterial);
    excavatedGallery.name = `ISLAND_13_SPIRAL_CUT_GALLERY_${segmentIndex + 1}`;
    const floorGeometry = new THREE.BufferGeometry();
    floorGeometry.setAttribute('position', new THREE.Float32BufferAttribute(floorPositions, 3));
    floorGeometry.setIndex(floorIndices);
    floorGeometry.computeVertexNormals();
    const galleryFloor = new THREE.Mesh(floorGeometry, galleryFloorMaterial);
    galleryFloor.name = `ISLAND_13_SPIRAL_GALLERY_FLOOR_${segmentIndex + 1}`;
    const fasciaGeometry = new THREE.BufferGeometry();
    fasciaGeometry.setAttribute('position', new THREE.Float32BufferAttribute(fasciaPositions, 3));
    fasciaGeometry.setIndex(fasciaIndices);
    fasciaGeometry.computeVertexNormals();
    const galleryFascia = new THREE.Mesh(fasciaGeometry, materials.sandstone);
    galleryFascia.name = `ISLAND_13_SPIRAL_GALLERY_FASCIA_${segmentIndex + 1}`;
    const innerRail = new THREE.Mesh(
      new THREE.TubeGeometry(buildCurve(-0.2), quality === 'low' ? 7 : 11, 0.068, 6, false),
      materials.railSteel,
    );
    const outerRail = new THREE.Mesh(
      new THREE.TubeGeometry(buildCurve(0.2), quality === 'low' ? 7 : 11, 0.068, 6, false),
      materials.railSteel,
    );
    innerRail.name = `ISLAND_13_SPIRAL_INNER_RAIL_${segmentIndex + 1}`;
    outerRail.name = `ISLAND_13_SPIRAL_OUTER_RAIL_${segmentIndex + 1}`;
    segmentRoot.add(excavatedGallery, galleryFloor, galleryFascia, innerRail, outerRail);
    const sleeperCount = quality === 'low' ? 2 : 4;
    for (let sleeperIndex = 0; sleeperIndex < sleeperCount; sleeperIndex += 1) {
      const progress = THREE.MathUtils.lerp(startProgress, endProgress, (sleeperIndex + 0.5) / sleeperCount);
      const angle = spiralStartAngle + progress * turns * Math.PI * 2;
      const radius = THREE.MathUtils.lerp(spiralBottomRadius, spiralTopRadius, progress);
      const sleeper = box(0.78, 0.075, 0.14, materials.timberWorn);
      sleeper.name = `ISLAND_13_SPIRAL_SLEEPER_${segmentIndex + 1}_${sleeperIndex + 1}`;
      sleeper.position.set(
        Math.cos(angle) * radius,
        spiralElevation(progress),
        Math.sin(angle) * radius,
      );
      sleeper.rotation.y = -angle;
      segmentRoot.add(sleeper);
    }
    if (segmentIndex >= segmentCount - 4) {
      // The upper approach is the most frequently inspected part of the
      // mission. Ballast shoulders, drainage and a wall conduit make it read
      // as a maintained mountain railway rather than two tubes on a ledge.
      const engineeringDetailCount = quality === 'high' ? 14 : quality === 'medium' ? 10 : 6;
      const galleryBallast = new THREE.InstancedMesh(
        galleryBallastGeometry,
        materials.sandstoneShadow,
        engineeringDetailCount,
      );
      galleryBallast.name = `ISLAND_13_UPPER_GALLERY_BALLAST_${segmentIndex + 1}`;
      const ballastMatrix = new THREE.Matrix4();
      const ballastQuaternion = new THREE.Quaternion();
      const ballastPosition = new THREE.Vector3();
      const ballastScale = new THREE.Vector3();
      for (let detailIndex = 0; detailIndex < engineeringDetailCount; detailIndex += 1) {
        const progress = THREE.MathUtils.lerp(
          startProgress,
          endProgress,
          (detailIndex + 0.5) / engineeringDetailCount,
        );
        const angle = spiralStartAngle + progress * turns * Math.PI * 2;
        const centerRadius = THREE.MathUtils.lerp(spiralBottomRadius, spiralTopRadius, progress);
        const shoulderSide = detailIndex % 2 ? 1 : -1;
        const radius = centerRadius + shoulderSide * (0.31 + (detailIndex % 3) * 0.035);
        const size = 0.72 + (detailIndex % 4) * 0.09;
        ballastMatrix.compose(
          ballastPosition.set(
            Math.cos(angle) * radius,
            spiralElevation(progress) - 0.035,
            Math.sin(angle) * radius,
          ),
          ballastQuaternion.setFromEuler(new THREE.Euler(detailIndex * 0.23, -angle, detailIndex * 0.17)),
          ballastScale.set(size * 1.15, size * 0.62, size),
        );
        galleryBallast.setMatrixAt(detailIndex, ballastMatrix);
      }
      galleryBallast.instanceMatrix.needsUpdate = true;
      galleryBallast.castShadow = true;
      galleryBallast.receiveShadow = true;
      const drainageChannel = new THREE.Mesh(
        new THREE.TubeGeometry(buildCurve(-0.49, -0.12), quality === 'low' ? 7 : 11, 0.034, 5, false),
        materials.iron,
      );
      drainageChannel.name = `ISLAND_13_UPPER_GALLERY_DRAIN_${segmentIndex + 1}`;
      const wallConduit = new THREE.Mesh(
        new THREE.TubeGeometry(buildCurve(-0.46, 0.38), quality === 'low' ? 7 : 11, 0.025, 5, false),
        materials.brass,
      );
      wallConduit.name = `ISLAND_13_UPPER_GALLERY_SIGNAL_CONDUIT_${segmentIndex + 1}`;
      segmentRoot.add(galleryBallast, drainageChannel, wallConduit);
    }
    if (segmentIndex < segmentCount - 4 && segmentIndex % 2 === 0) {
      // Lower/rear engineering is concentrated at alternate tunnel sectors to
      // retain mobile headroom. Ballast and parapet stones share one instanced
      // draw, while the drain follows the same authored curve as the rails.
      const ballastCount = quality === 'high' ? 10 : quality === 'medium' ? 7 : 5;
      const parapetCount = quality === 'low' ? 2 : 3;
      const lowerStonework = new THREE.InstancedMesh(
        portalStoneGeometry,
        materials.sandstone,
        ballastCount + parapetCount,
      );
      lowerStonework.name = `ISLAND_13_LOWER_GALLERY_STONEWORK_${segmentIndex + 1}`;
      const lowerMatrix = new THREE.Matrix4();
      const lowerQuaternion = new THREE.Quaternion();
      const lowerPosition = new THREE.Vector3();
      const lowerScale = new THREE.Vector3();
      for (let ballastIndex = 0; ballastIndex < ballastCount; ballastIndex += 1) {
        const progress = THREE.MathUtils.lerp(
          startProgress,
          endProgress,
          (ballastIndex + 0.5) / ballastCount,
        );
        const angle = spiralStartAngle + progress * turns * Math.PI * 2;
        const centerRadius = THREE.MathUtils.lerp(spiralBottomRadius, spiralTopRadius, progress);
        const shoulderSide = ballastIndex % 2 ? 1 : -1;
        const radius = centerRadius + shoulderSide * (0.32 + (ballastIndex % 3) * 0.035);
        lowerMatrix.compose(
          lowerPosition.set(
            Math.cos(angle) * radius,
            spiralElevation(progress) - 0.04,
            Math.sin(angle) * radius,
          ),
          lowerQuaternion.setFromEuler(new THREE.Euler(
            ballastIndex * 0.19,
            -angle,
            ballastIndex * 0.13,
          )),
          lowerScale.set(0.31 + (ballastIndex % 3) * 0.035, 0.24, 0.32),
        );
        lowerStonework.setMatrixAt(ballastIndex, lowerMatrix);
      }
      for (let parapetIndex = 0; parapetIndex < parapetCount; parapetIndex += 1) {
        const progress = THREE.MathUtils.lerp(
          startProgress,
          endProgress,
          (parapetIndex + 0.5) / parapetCount,
        );
        const angle = spiralStartAngle + progress * turns * Math.PI * 2;
        const centerRadius = THREE.MathUtils.lerp(spiralBottomRadius, spiralTopRadius, progress);
        lowerMatrix.compose(
          lowerPosition.set(
            Math.cos(angle) * (centerRadius + 0.82),
            spiralElevation(progress) + 0.05,
            Math.sin(angle) * (centerRadius + 0.82),
          ),
          lowerQuaternion.setFromEuler(new THREE.Euler(0, -angle, (parapetIndex - 1) * 0.035)),
          lowerScale.set(1.35, 0.72, 1.05),
        );
        lowerStonework.setMatrixAt(ballastCount + parapetIndex, lowerMatrix);
      }
      lowerStonework.instanceMatrix.needsUpdate = true;
      lowerStonework.castShadow = true;
      lowerStonework.receiveShadow = true;
      const lowerDrainageChannel = new THREE.Mesh(
        new THREE.TubeGeometry(buildCurve(-0.53, -0.13), quality === 'low' ? 7 : 11, 0.04, 5, false),
        materials.iron,
      );
      lowerDrainageChannel.name = `ISLAND_13_LOWER_GALLERY_DRAIN_${segmentIndex + 1}`;
      segmentRoot.add(lowerStonework, lowerDrainageChannel);

      if (segmentIndex % 4 === 2) {
        const progress = (startProgress + endProgress) / 2;
        const angle = spiralStartAngle + progress * turns * Math.PI * 2;
        const centerRadius = THREE.MathUtils.lerp(spiralBottomRadius, spiralTopRadius, progress);
        const maintenanceAlcove = new THREE.Group();
        maintenanceAlcove.name = `ISLAND_13_LOWER_MAINTENANCE_ALCOVE_${segmentIndex + 1}`;
        maintenanceAlcove.position.set(
          Math.cos(angle) * (centerRadius - 0.54),
          spiralElevation(progress) + 0.44,
          Math.sin(angle) * (centerRadius - 0.54),
        );
        maintenanceAlcove.rotation.y = Math.PI / 2 - angle;
        const alcoveVoid = new THREE.Mesh(new THREE.CircleGeometry(0.43, 12), galleryCutMaterial);
        alcoveVoid.name = `ISLAND_13_LOWER_MAINTENANCE_ALCOVE_VOID_${segmentIndex + 1}`;
        alcoveVoid.scale.y = 1.18;
        const alcoveRim = new THREE.Mesh(
          new THREE.TorusGeometry(0.47, 0.09, 6, 14),
          materials.sandstoneLight,
        );
        const alcoveAwning = box(0.92, 0.12, 0.34, materials.timberWorn);
        alcoveAwning.position.set(0, 0.55, 0.12);
        const alcoveBench = box(0.58, 0.1, 0.24, materials.timber);
        alcoveBench.position.set(0, -0.34, 0.2);
        const alcoveLamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), materials.window);
        alcoveLamp.position.set(0, 0.22, 0.16);
        maintenanceAlcove.add(alcoveVoid, alcoveRim, alcoveAwning, alcoveBench, alcoveLamp);
        segmentRoot.add(maintenanceAlcove);
      }
    }
    // The route is excavated public transport, not an exposed coaster. These
    // retaining piers and cap stones visually lock each gallery shelf into the
    // cliff, while remaining children of the progressive excavation segment.
    const retainingPierCount = quality === 'high' ? 3 : quality === 'medium' ? 2 : 1;
    const retainingPiers = new THREE.InstancedMesh(
      galleryPierGeometry,
      materials.sandstoneShadow,
      retainingPierCount,
    );
    const retainingCaps = new THREE.InstancedMesh(
      galleryPierCapGeometry,
      materials.sandstoneLight,
      retainingPierCount,
    );
    retainingPiers.name = `ISLAND_13_SPIRAL_RETAINING_PIERS_${segmentIndex + 1}`;
    retainingCaps.name = `ISLAND_13_SPIRAL_RETAINING_CAPS_${segmentIndex + 1}`;
    const retainingMatrix = new THREE.Matrix4();
    const retainingQuaternion = new THREE.Quaternion();
    const retainingPosition = new THREE.Vector3();
    const retainingScale = new THREE.Vector3();
    for (let supportIndex = 0; supportIndex < retainingPierCount; supportIndex += 1) {
      const progress = THREE.MathUtils.lerp(
        startProgress,
        endProgress,
        (supportIndex + 0.5) / retainingPierCount,
      );
      const angle = spiralStartAngle + progress * turns * Math.PI * 2;
      const radius = THREE.MathUtils.lerp(spiralBottomRadius, spiralTopRadius, progress) + 0.68;
      const floorY = spiralElevation(progress) - 0.11;
      const pierHeight = 0.72 + ((segmentIndex + supportIndex) % 3) * 0.13;
      retainingQuaternion.setFromEuler(new THREE.Euler(0, -angle, 0));
      retainingMatrix.compose(
        retainingPosition.set(
          Math.cos(angle) * radius,
          floorY - pierHeight * 0.5 - 0.12,
          Math.sin(angle) * radius,
        ),
        retainingQuaternion,
        retainingScale.set(1, pierHeight, 1),
      );
      retainingPiers.setMatrixAt(supportIndex, retainingMatrix);
      retainingMatrix.compose(
        retainingPosition.set(
          Math.cos(angle) * radius,
          floorY - 0.07,
          Math.sin(angle) * radius,
        ),
        retainingQuaternion,
        retainingScale.set(1, 1, 1),
      );
      retainingCaps.setMatrixAt(supportIndex, retainingMatrix);
    }
    [retainingPiers, retainingCaps].forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      segmentRoot.add(mesh);
    });
    // A four-part rock shell makes the route read as a shelf quarried into the
    // mountain: overhead crown, recessed back wall, under-shelf support and a
    // staggered flanking buttress. Keeping all four parts in this one instanced
    // draw preserves the progressive excavation without widening the mobile
    // draw-call budget. The buttress also closes the oversized diagonal void
    // left by the route-clear cliff-block corridor without entering the train
    // clearance envelope.
    const galleryShellBayCount = quality === 'high' ? 4 : quality === 'medium' ? 3 : 2;
    const galleryRockShell = new THREE.InstancedMesh(
      galleryRoofRockGeometry,
      materials.sandstone,
      galleryShellBayCount * 4,
    );
    galleryRockShell.name = `ISLAND_13_SPIRAL_CAVE_ROCK_SHELL_${segmentIndex + 1}`;
    const shellMatrix = new THREE.Matrix4();
    const shellQuaternion = new THREE.Quaternion();
    const shellPosition = new THREE.Vector3();
    const shellScale = new THREE.Vector3();
    for (let bayIndex = 0; bayIndex < galleryShellBayCount; bayIndex += 1) {
      const progress = THREE.MathUtils.lerp(
        startProgress,
        endProgress,
        (bayIndex + 0.5) / galleryShellBayCount,
      );
      if (progress > 0.91) {
        shellMatrix.makeScale(0.001, 0.001, 0.001);
        galleryRockShell.setMatrixAt(bayIndex, shellMatrix);
        galleryRockShell.setMatrixAt(galleryShellBayCount + bayIndex, shellMatrix);
        galleryRockShell.setMatrixAt(galleryShellBayCount * 2 + bayIndex, shellMatrix);
        galleryRockShell.setMatrixAt(galleryShellBayCount * 3 + bayIndex, shellMatrix);
        continue;
      }
      const angle = spiralStartAngle + progress * turns * Math.PI * 2;
      const trackRadius = THREE.MathUtils.lerp(spiralBottomRadius, spiralTopRadius, progress);
      shellQuaternion.setFromEuler(new THREE.Euler(
        (bayIndex % 2 ? 1 : -1) * 0.08,
        -angle,
        ((segmentIndex + bayIndex) % 3 - 1) * 0.1,
      ));
      shellMatrix.compose(
        shellPosition.set(
          Math.cos(angle) * (trackRadius + 0.38),
          spiralElevation(progress) + 1.15,
          Math.sin(angle) * (trackRadius + 0.38),
        ),
        shellQuaternion,
        shellScale.set(1.7, 0.78, 1.08),
      );
      galleryRockShell.setMatrixAt(bayIndex, shellMatrix);
      shellMatrix.compose(
        shellPosition.set(
          Math.cos(angle) * (trackRadius - 0.7),
          spiralElevation(progress) + 0.31,
          Math.sin(angle) * (trackRadius - 0.7),
        ),
        shellQuaternion,
        shellScale.set(0.72, 1.52, 1.05),
      );
      galleryRockShell.setMatrixAt(galleryShellBayCount + bayIndex, shellMatrix);

      shellMatrix.compose(
        shellPosition.set(
          Math.cos(angle) * (trackRadius + 0.12),
          spiralElevation(progress) - 0.43,
          Math.sin(angle) * (trackRadius + 0.12),
        ),
        shellQuaternion,
        shellScale.set(1.48, 0.42, 1.32),
      );
      galleryRockShell.setMatrixAt(galleryShellBayCount * 2 + bayIndex, shellMatrix);

      const flankDirection = (segmentIndex + bayIndex) % 2 ? 1 : -1;
      const flankAngle = angle + flankDirection * (0.31 + (bayIndex % 2) * 0.035);
      shellMatrix.compose(
        shellPosition.set(
          Math.cos(flankAngle) * (trackRadius + 0.08),
          spiralElevation(progress) + 0.12,
          Math.sin(flankAngle) * (trackRadius + 0.08),
        ),
        shellQuaternion.setFromEuler(new THREE.Euler(
          flankDirection * 0.07,
          -flankAngle,
          flankDirection * 0.1,
        )),
        shellScale.set(0.88, 1.08 + (bayIndex % 2) * 0.16, 0.82),
      );
      galleryRockShell.setMatrixAt(galleryShellBayCount * 3 + bayIndex, shellMatrix);
    }
    galleryRockShell.instanceMatrix.needsUpdate = true;
    galleryRockShell.castShadow = true;
    galleryRockShell.receiveShadow = true;
    segmentRoot.add(galleryRockShell);
    if (segmentIndex % 2 === 0) {
      const progress = (startProgress + endProgress) / 2;
      const angle = spiralStartAngle + progress * turns * Math.PI * 2;
      const portal = new THREE.Group();
      portal.name = `ISLAND_13_SPIRAL_ROCK_CUT_PORTAL_${segmentIndex / 2 + 1}`;
      const portalRadius = THREE.MathUtils.lerp(spiralBottomRadius, spiralTopRadius, progress);
      portal.position.set(
        Math.cos(angle) * portalRadius,
        spiralElevation(progress) + 0.58,
        Math.sin(angle) * portalRadius,
      );
      // The mouth cuts across the track, so its face normal follows the
      // azimuthal track tangent. Using +angle turned several portals sideways
      // and made their masonry look like freestanding coaster scenery.
      portal.rotation.y = -angle;
      const portalVoid = new THREE.Mesh(new THREE.CircleGeometry(0.94, 16), galleryCutMaterial);
      portalVoid.scale.y = 1.18;
      portalVoid.position.y = -0.1;
      portalVoid.position.z = -0.035;
      const portalArch = new THREE.Mesh(new THREE.TorusGeometry(0.99, 0.18, 6, 18, Math.PI), materials.sandstoneLight);
      const leftPier = box(0.27, 1.34, 0.3, materials.sandstoneLight);
      leftPier.position.set(-0.99, -0.67, 0);
      const rightPier = leftPier.clone();
      rightPier.position.x = 0.99;
      const portalLamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), materials.window);
      portalLamp.position.set(0, 0.92, 0.06);
      const voussoirCount = quality === 'low' ? 7 : 9;
      const voussoirs = new THREE.InstancedMesh(
        portalStoneGeometry,
        materials.sandstone,
        voussoirCount,
      );
      voussoirs.name = `ISLAND_13_SPIRAL_PORTAL_VOUSSOIRS_${segmentIndex / 2 + 1}`;
      const portalMatrix = new THREE.Matrix4();
      const portalQuaternion = new THREE.Quaternion();
      const portalPosition = new THREE.Vector3();
      const portalScale = new THREE.Vector3();
      for (let stoneIndex = 0; stoneIndex < voussoirCount; stoneIndex += 1) {
        const stoneAngle = Math.PI - stoneIndex / Math.max(1, voussoirCount - 1) * Math.PI;
        portalMatrix.compose(
          portalPosition.set(Math.cos(stoneAngle) * 0.99, Math.sin(stoneAngle) * 1.02 - 0.1, 0.055),
          portalQuaternion.setFromEuler(new THREE.Euler(0, 0, stoneAngle - Math.PI / 2)),
          portalScale.set(0.92 + (stoneIndex % 2) * 0.1, 1, 1),
        );
        voussoirs.setMatrixAt(stoneIndex, portalMatrix);
      }
      voussoirs.instanceMatrix.needsUpdate = true;
      const portalWings = new THREE.InstancedMesh(
        new THREE.BoxGeometry(0.42, 1.36, 0.52),
        materials.sandstoneShadow,
        2,
      );
      portalWings.name = `ISLAND_13_SPIRAL_PORTAL_WING_WALLS_${segmentIndex / 2 + 1}`;
      [-1, 1].forEach((side, wingIndex) => {
        portalMatrix.compose(
          portalPosition.set(side * 1.28, -0.68, -0.08),
          portalQuaternion.setFromEuler(new THREE.Euler(0, side * 0.22, side * 0.06)),
          portalScale.set(1, 1, 1),
        );
        portalWings.setMatrixAt(wingIndex, portalMatrix);
      });
      portalWings.instanceMatrix.needsUpdate = true;
      portal.add(portalVoid, portalArch, leftPier, rightPier, portalLamp, voussoirs, portalWings);
      segmentRoot.add(portal);
    }
    segmentRoot.visible = false;
    segmentRoot.userData.excavationOrder = segmentCount - segmentIndex;
    railSegments.push(segmentRoot);
    root.add(segmentRoot);
  }

  const blastEffect = new THREE.Group();
  blastEffect.name = 'ISLAND_13_SPIRAL_CONTROLLED_BLAST_EFFECT';
  blastEffect.visible = false;
  const dynamiteMaterial = new THREE.MeshStandardMaterial({
    color: 0xb92d21,
    roughness: 0.58,
    emissive: 0x4b0804,
    emissiveIntensity: 0.24,
  });
  const fuseGlowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd36e,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const charge = new THREE.Group();
  charge.name = 'ISLAND_13_SPIRAL_ACTIVE_DYNAMITE_CHARGE';
  for (let index = 0; index < 3; index += 1) {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.52, 8), dynamiteMaterial);
    stick.rotation.z = Math.PI / 2;
    stick.position.set(0, (index - 1) * 0.13, (index % 2 - 0.5) * 0.08);
    charge.add(stick);
  }
  const fuseGlow = new THREE.Mesh(new THREE.SphereGeometry(0.105, 8, 6), fuseGlowMaterial);
  fuseGlow.name = 'ISLAND_13_SPIRAL_DYNAMITE_FUSE_GLOW';
  fuseGlow.position.set(0.32, 0.12, 0.02);
  charge.add(fuseGlow);
  blastEffect.add(charge);
  const blastFlash = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 8), fuseGlowMaterial);
  blastFlash.name = 'ISLAND_13_SPIRAL_BLAST_FLASH';
  blastEffect.add(blastFlash);
  const debris: THREE.Mesh[] = [];
  for (let index = 0; index < 18; index += 1) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.09 + (index % 4) * 0.025, 0),
      index % 3 ? materials.sandstone : materials.sandstoneShadow,
    );
    rock.name = `ISLAND_13_SPIRAL_BLAST_DEBRIS_${index + 1}`;
    rock.userData.blastDirection = new THREE.Vector3(
      Math.cos(index * 2.399963) * (0.75 + (index % 5) * 0.12),
      0.3 + (index % 4) * 0.18,
      Math.sin(index * 2.399963) * (0.75 + ((index + 2) % 5) * 0.12),
    );
    debris.push(rock);
    blastEffect.add(rock);
  }
  const dustMaterial = new THREE.MeshBasicMaterial({
    color: 0xd88a47,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });
  const dustClouds: THREE.Mesh[] = [];
  for (let index = 0; index < 6; index += 1) {
    const dust = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), dustMaterial.clone());
    dust.name = `ISLAND_13_SPIRAL_BLAST_DUST_${index + 1}`;
    dust.userData.blastDirection = new THREE.Vector3(
      Math.cos(index / 6 * Math.PI * 2) * 0.7,
      0.18 + (index % 3) * 0.12,
      Math.sin(index / 6 * Math.PI * 2) * 0.7,
    );
    dustClouds.push(dust);
    blastEffect.add(dust);
  }
  root.add(blastEffect);
  const summitJunction = new THREE.Group();
  summitJunction.name = 'ISLAND_13_SPIRAL_SUMMIT_JUNCTION';
  const summitAngle = spiralStartAngle + turns * Math.PI * 2;
  summitJunction.position.set(
    Math.cos(summitAngle) * spiralTopRadius,
    spiralTopY,
    Math.sin(summitAngle) * spiralTopRadius,
  );
  summitJunction.rotation.y = summitAngle;
  const junctionPost = box(0.09, 0.82, 0.09, materials.iron);
  junctionPost.position.set(1.12, 0.44, 0.12);
  const junctionLamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), materials.window);
  junctionLamp.position.set(1.12, 0.9, 0.12);
  const junctionSign = box(0.58, 0.18, 0.08, materials.brass);
  junctionSign.position.set(1.12, 0.66, 0.12);
  const switchStand = box(0.22, 0.18, 0.18, materials.iron);
  switchStand.name = 'ISLAND_13_SUMMIT_SWITCH_STAND';
  switchStand.position.set(-1.02, 0.18, 0.08);
  const switchLever = box(0.05, 0.48, 0.05, materials.brass);
  switchLever.name = 'ISLAND_13_SUMMIT_SWITCH_LEVER';
  switchLever.position.set(-1.02, 0.48, 0.08);
  switchLever.rotation.z = -0.42;
  summitJunction.add(junctionPost, junctionLamp, junctionSign, switchStand, switchLever);
  summitJunction.visible = false;
  root.add(summitJunction);

  // The spiral rail meets the summit ring at the same gauge and elevation.
  // Short raised blades and a frog make that mathematical join legible as a
  // real turnout instead of a train teleporting off the circular route.
  const summitTurnout = new THREE.Group();
  summitTurnout.name = 'ISLAND_13_SUMMIT_RAIL_TURNOUT';
  const buildSwitchBladeCurve = (radialOffset: number) => {
    const points: THREE.Vector3[] = [];
    for (let pointIndex = 0; pointIndex <= 8; pointIndex += 1) {
      const progress = THREE.MathUtils.lerp(0.972, 1, pointIndex / 8);
      const angle = spiralStartAngle + progress * turns * Math.PI * 2;
      const radius = THREE.MathUtils.lerp(spiralBottomRadius, spiralTopRadius, progress) + radialOffset;
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        spiralElevation(progress) + 0.035,
        Math.sin(angle) * radius,
      ));
    }
    return new THREE.CatmullRomCurve3(points);
  };
  [-0.2, 0.2].forEach((radialOffset, bladeIndex) => {
    const blade = new THREE.Mesh(
      new THREE.TubeGeometry(buildSwitchBladeCurve(radialOffset), 12, 0.038, 5, false),
      materials.railSteel,
    );
    blade.name = `ISLAND_13_SUMMIT_SWITCH_BLADE_${bladeIndex + 1}`;
    summitTurnout.add(blade);
  });
  const switchFrog = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.46, 3), materials.railSteel);
  switchFrog.name = 'ISLAND_13_SUMMIT_SWITCH_FROG';
  switchFrog.position.set(
    Math.cos(summitAngle) * spiralTopRadius,
    spiralTopY + 0.055,
    Math.sin(summitAngle) * spiralTopRadius,
  );
  switchFrog.rotation.set(Math.PI / 2, -summitAngle, 0);
  switchFrog.scale.z = 0.32;
  const switchTiePlates = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.16, 0.045, 0.12),
    materials.iron,
    8,
  );
  switchTiePlates.name = 'ISLAND_13_SUMMIT_SWITCH_TIE_PLATES';
  const switchPlateMatrix = new THREE.Matrix4();
  const switchPlateQuaternion = new THREE.Quaternion();
  const switchPlatePosition = new THREE.Vector3();
  const switchPlateScale = new THREE.Vector3(1, 1, 1);
  for (let tieIndex = 0; tieIndex < 4; tieIndex += 1) {
    const progress = THREE.MathUtils.lerp(0.978, 0.998, tieIndex / 3);
    const angle = spiralStartAngle + progress * turns * Math.PI * 2;
    const centerRadius = THREE.MathUtils.lerp(spiralBottomRadius, spiralTopRadius, progress);
    [-0.2, 0.2].forEach((radialOffset, railIndex) => {
      switchPlateMatrix.compose(
        switchPlatePosition.set(
          Math.cos(angle) * (centerRadius + radialOffset),
          spiralElevation(progress) + 0.006,
          Math.sin(angle) * (centerRadius + radialOffset),
        ),
        switchPlateQuaternion.setFromEuler(new THREE.Euler(0, -angle, 0)),
        switchPlateScale,
      );
      switchTiePlates.setMatrixAt(tieIndex * 2 + railIndex, switchPlateMatrix);
    });
  }
  switchTiePlates.instanceMatrix.needsUpdate = true;
  const switchRod = box(0.82, 0.055, 0.055, materials.brass);
  switchRod.name = 'ISLAND_13_SUMMIT_SWITCH_CONNECTING_ROD';
  switchRod.position.set(
    Math.cos(summitAngle) * spiralTopRadius,
    spiralTopY + 0.075,
    Math.sin(summitAngle) * spiralTopRadius,
  );
  switchRod.rotation.y = -summitAngle;
  summitTurnout.add(switchFrog, switchTiePlates, switchRod);
  summitTurnout.visible = false;
  root.add(summitTurnout);

  const descentPortalProgress = 0.965;
  const descentPortalAngle = spiralStartAngle + descentPortalProgress * turns * Math.PI * 2;
  const descentPortalRadius = THREE.MathUtils.lerp(
    spiralBottomRadius,
    spiralTopRadius,
    descentPortalProgress,
  );
  const descentPortal = new THREE.Group();
  descentPortal.name = 'ISLAND_13_SUMMIT_NATURAL_DESCENT_PORTAL';
  descentPortal.position.set(
    Math.cos(descentPortalAngle) * descentPortalRadius,
    spiralElevation(descentPortalProgress) + 0.74,
    Math.sin(descentPortalAngle) * descentPortalRadius,
  );
  descentPortal.rotation.y = descentPortalAngle;
  const descentVoid = new THREE.Mesh(new THREE.CircleGeometry(1.08, 18), galleryCutMaterial);
  descentVoid.name = 'ISLAND_13_SUMMIT_DESCENT_OPEN_CLEARANCE';
  descentVoid.scale.y = 1.18;
  descentVoid.position.set(0, -0.15, -0.09);
  const descentArch = new THREE.Mesh(
    new THREE.TorusGeometry(1.12, 0.23, 7, 20, Math.PI),
    materials.sandstoneLight,
  );
  descentArch.position.y = -0.08;
  const descentInnerRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.94, 0.075, 6, 18, Math.PI),
    materials.iron,
  );
  descentInnerRim.name = 'ISLAND_13_SUMMIT_DESCENT_INNER_ARCH_RIM';
  descentInnerRim.position.set(0, -0.13, 0.035);
  const descentLeftPier = box(0.4, 1.48, 0.7, materials.sandstone);
  descentLeftPier.position.set(-1.12, -0.74, 0);
  descentLeftPier.rotation.z = -0.1;
  const descentRightPier = descentLeftPier.clone();
  descentRightPier.position.x = 1.12;
  descentRightPier.rotation.z = 0.1;
  const descentHood = new THREE.Mesh(new THREE.DodecahedronGeometry(1.05, 0), materials.sandstone);
  descentHood.name = 'ISLAND_13_SUMMIT_DESCENT_ROCK_HOOD';
  descentHood.position.set(0, 0.98, -0.18);
  descentHood.scale.set(1.04, 0.36, 0.56);
  const descentShoulders = new THREE.Group();
  descentShoulders.name = 'ISLAND_13_SUMMIT_DESCENT_ROCK_SHOULDERS';
  [-1, 1].forEach((side) => {
    const shoulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.72, 0), materials.sandstoneShadow);
    shoulder.position.set(side * 1.17, 0.06, -0.18);
    shoulder.scale.set(0.72, 1.18 + (side > 0 ? 0.12 : 0), 0.84);
    shoulder.rotation.set(side * 0.08, side * 0.24, side * 0.12);
    descentShoulders.add(shoulder);
  });
  const descentKeystones = new THREE.InstancedMesh(
    portalStoneGeometry,
    materials.sandstone,
    7,
  );
  descentKeystones.name = 'ISLAND_13_SUMMIT_DESCENT_KEYSTONES';
  const descentStoneMatrix = new THREE.Matrix4();
  const descentStoneQuaternion = new THREE.Quaternion();
  const descentStonePosition = new THREE.Vector3();
  const descentStoneScale = new THREE.Vector3();
  for (let stoneIndex = 0; stoneIndex < 7; stoneIndex += 1) {
    const stoneAngle = Math.PI - stoneIndex / 6 * Math.PI;
    descentStoneMatrix.compose(
      descentStonePosition.set(Math.cos(stoneAngle) * 1.12, Math.sin(stoneAngle) * 1.14 - 0.08, 0.08),
      descentStoneQuaternion.setFromEuler(new THREE.Euler(0, 0, stoneAngle - Math.PI / 2)),
      descentStoneScale.set(0.9, 1, 1),
    );
    descentKeystones.setMatrixAt(stoneIndex, descentStoneMatrix);
  }
  descentKeystones.instanceMatrix.needsUpdate = true;
  const descentRamp = box(1.25, 0.13, 1.7, materials.timberWorn);
  descentRamp.name = 'ISLAND_13_SUMMIT_DESCENT_RAMP_DECK';
  descentRamp.position.set(0, -0.79, 0.05);
  descentRamp.rotation.x = -0.075;
  const portalLanterns = new THREE.Group();
  portalLanterns.name = 'ISLAND_13_SUMMIT_DESCENT_PORTAL_LANTERNS';
  [-1, 1].forEach((side) => {
    const bracket = box(0.08, 0.08, 0.28, materials.iron);
    bracket.position.set(side * 0.78, 0.28, 0.13);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), materials.window);
    lamp.position.set(side * 0.78, 0.23, 0.31);
    portalLanterns.add(bracket, lamp);
  });
  const rampDrainGrate = new THREE.Group();
  rampDrainGrate.name = 'ISLAND_13_SUMMIT_DESCENT_RAMP_DRAIN_GRATE';
  for (let grateIndex = 0; grateIndex < 5; grateIndex += 1) {
    const grateBar = box(0.045, 0.025, 0.68, materials.iron);
    grateBar.position.set(-0.24 + grateIndex * 0.12, -0.715, 0.18);
    rampDrainGrate.add(grateBar);
  }
  descentPortal.add(
    descentVoid,
    descentArch,
    descentInnerRim,
    descentLeftPier,
    descentRightPier,
    descentHood,
    descentShoulders,
    descentKeystones,
    descentRamp,
    portalLanterns,
    rampDrainGrate,
  );
  descentPortal.visible = false;
  root.add(descentPortal);
  const lowerTurnaround = new THREE.Mesh(
    new THREE.TorusGeometry(spiralBottomRadius, 0.055, 6, segments(quality) * 5),
    materials.railSteel,
  );
  lowerTurnaround.name = 'ISLAND_13_SPIRAL_LOWER_TURNAROUND';
  lowerTurnaround.rotation.x = Math.PI / 2;
  lowerTurnaround.position.y = spiralBottomY;
  lowerTurnaround.visible = false;
  root.add(lowerTurnaround);
  const canyonFloorStation = new THREE.Group();
  canyonFloorStation.name = 'ISLAND_13_SPIRAL_CANYON_FLOOR_STATION';
  canyonFloorStation.position.set(
    Math.cos(spiralStartAngle) * (spiralBottomRadius + 0.5),
    spiralBottomY + 0.18,
    Math.sin(spiralStartAngle) * (spiralBottomRadius + 0.5),
  );
  canyonFloorStation.rotation.y = -spiralStartAngle;
  const floorPlatform = box(1.9, 0.22, 0.62, materials.sandstoneLight);
  const floorShelter = box(1.0, 0.08, 0.72, materials.roof);
  floorShelter.position.set(0, 0.96, 0);
  [-0.42, 0.42].forEach((x) => {
    const post = box(0.08, 0.88, 0.08, materials.timber);
    post.position.set(x, 0.5, 0);
    canyonFloorStation.add(post);
  });
  const floorLamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), materials.window);
  floorLamp.position.set(0, 0.82, 0.05);
  canyonFloorStation.add(floorPlatform, floorShelter, floorLamp);
  canyonFloorStation.visible = false;
  root.add(canyonFloorStation);
  const hitTarget = new THREE.Mesh(
    new THREE.CylinderGeometry(5.8, 4.0, 13.2, 12),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  hitTarget.name = 'ISLAND_13_SPIRAL_RAIL_MISSION_HIT_TARGET';
  hitTarget.position.y = -7.15;
  hitTarget.userData.signatureMissionId = 'cactus-canyon-spiral-rail';
  root.add(hitTarget);
  root.userData.sculptRuntime = {
    parts: [registerIsland13RuntimePart('spiral-rail-mission', root, 'signature-mission')],
    clickable: true,
    sockets: { focus: 'ISLAND_13_SPIRAL_RAIL_FOCUS_SOCKET' },
    colliders: [{ id: 'island-013-spiral-mission', type: 'cylinder', isTrigger: true }],
  };
  return {
    root,
    setProgress(presentation: Island13CactusCanyonSpiralPresentation) {
      const visibleCount = Math.max(0, Math.min(segmentCount, Math.floor(presentation.segmentsExcavated)));
      const blastProgress = presentation.blastProgress;
      const isBlasting = typeof blastProgress === 'number' && blastProgress >= 0 && blastProgress < 1 && visibleCount > 0;
      const revealedCount = isBlasting && blastProgress < 0.58 ? Math.max(0, visibleCount - 1) : visibleCount;
      railSegments.forEach((segment, index) => { segment.visible = index >= segmentCount - revealedCount; });
      if (isBlasting) {
        const activeSegmentIndex = segmentCount - visibleCount;
        blastEffect.position.copy(blastAnchors[activeSegmentIndex]);
        blastEffect.visible = true;
        charge.visible = blastProgress < 0.36;
        fuseGlow.visible = blastProgress < 0.34;
        fuseGlow.scale.setScalar(0.7 + Math.sin(blastProgress * 92) * 0.22 + blastProgress * 0.7);
        blastFlash.visible = blastProgress >= 0.34 && blastProgress < 0.52;
        blastFlash.scale.setScalar(0.2 + THREE.MathUtils.smoothstep(blastProgress, 0.34, 0.52) * 1.25);
        const debrisProgress = THREE.MathUtils.clamp((blastProgress - 0.35) / 0.55, 0, 1);
        debris.forEach((rock, index) => {
          const direction = rock.userData.blastDirection as THREE.Vector3;
          rock.visible = blastProgress >= 0.34 && blastProgress < 0.92;
          rock.position.copy(direction).multiplyScalar(debrisProgress * 1.55);
          rock.position.y -= debrisProgress * debrisProgress * 1.15;
          rock.rotation.set(debrisProgress * (index + 2), debrisProgress * (index + 1.3), debrisProgress * 2.2);
        });
        dustClouds.forEach((dust, index) => {
          const direction = dust.userData.blastDirection as THREE.Vector3;
          const dustProgress = THREE.MathUtils.clamp((blastProgress - 0.36) / 0.58, 0, 1);
          dust.visible = blastProgress >= 0.35;
          dust.position.copy(direction).multiplyScalar(dustProgress * 1.1);
          dust.scale.setScalar(0.35 + dustProgress * (1.3 + index * 0.08));
          (dust.material as THREE.MeshBasicMaterial).opacity = (1 - dustProgress) * 0.34;
        });
      } else {
        blastEffect.visible = false;
      }
      summitJunction.visible = visibleCount > 0;
      summitTurnout.visible = visibleCount > 0;
      descentPortal.visible = visibleCount > 0;
      lowerTurnaround.visible = presentation.completed || visibleCount >= segmentCount;
      canyonFloorStation.visible = presentation.completed || visibleCount >= segmentCount;
    },
  };
}

function createCactusField(materials: Island13CactusCanyonMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_13_CACTUS_SYSTEM';
  const placements = [
    [-2.1, -1.2], [2.2, -1.1], [-2.35, 1.2], [2.2, 1.4], [-4.7, -1.7], [4.7, 1.8], [-4.5, 1.9], [4.4, -2.0],
    [-5.8, 0.4], [5.75, -0.6], [-1.1, 5.3], [1.35, -5.4], [-3.8, 4.2], [3.9, -4.0],
    [-1.6, 1.85], [1.55, 1.95], [-1.4, -2.0], [1.35, -1.9], [-5.2, 2.8], [5.1, -2.9],
  ] as const;
  const admitted = placements.filter(([x, z]) => isIsland13RouteCorridorClear(x, z, 0.18));
  const count = Math.max(7, Math.round(admitted.length * detailScale(quality)));
  const armCount = Array.from({ length: count }, (_, index) => index % 3 === 1 ? 1 : 2)
    .reduce((sum, value) => sum + value, 0);
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.13, 1, 8), materials.cactus, count);
  const trunkCaps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.105, 8, 6), materials.cactus, count);
  const arms = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.065, 0.08, 0.42, 7), materials.cactusLight, armCount);
  const upperArms = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.075, 0.34, 7), materials.cactusLight, armCount);
  const armElbows = new THREE.InstancedMesh(new THREE.SphereGeometry(0.076, 7, 5), materials.cactusLight, armCount);
  const armCaps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.066, 7, 5), materials.cactusLight, armCount);
  trunks.name = 'ISLAND_13_CACTUS_TRUNKS';
  trunkCaps.name = 'ISLAND_13_CACTUS_ROUNDED_TRUNK_CAPS';
  arms.name = 'ISLAND_13_CACTUS_ASYMMETRIC_ARMS';
  upperArms.name = 'ISLAND_13_CACTUS_UPPER_ARMS';
  armElbows.name = 'ISLAND_13_CACTUS_ROUNDED_ARM_ELBOWS';
  armCaps.name = 'ISLAND_13_CACTUS_ROUNDED_ARM_CAPS';
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  const armDirection = new THREE.Vector3();
  const upDirection = new THREE.Vector3(0, 1, 0);
  const cactusTint = new THREE.Color();
  let armIndex = 0;
  for (let index = 0; index < count; index += 1) {
    const [x, z] = admitted[index];
    const height = 0.82 + (index % 5) * 0.2;
    const girth = 0.88 + (index % 3) * 0.12;
    const yaw = index * 2.399963 + 0.31;
    matrix.compose(position.set(x, 0.35 + height / 2, z), quaternion.identity(), scale.set(girth, height, girth));
    trunks.setMatrixAt(index, matrix);
    matrix.compose(
      position.set(x, 0.35 + height, z),
      quaternion.identity(),
      scale.set(girth, 0.82 + (index % 2) * 0.08, girth),
    );
    trunkCaps.setMatrixAt(index, matrix);
    const trunkValue = 0.88 + (index % 4) * 0.035;
    cactusTint.setRGB(trunkValue * 0.86, trunkValue, trunkValue * 0.72);
    trunks.setColorAt(index, cactusTint);
    trunkCaps.setColorAt(index, cactusTint);
    const armSides = index % 3 === 1 ? [index % 2 ? 1 : -1] : [-1, 1];
    armSides.forEach((side, sideIndex) => {
      const armLength = 0.34 + ((index + sideIndex) % 3) * 0.055;
      const riseHeight = 0.24 + ((index * 2 + sideIndex) % 3) * 0.055;
      const armY = 0.6 + (index % 4) * 0.1 + sideIndex * 0.08;
      const armYaw = yaw + sideIndex * 0.18 - (index % 2) * 0.09;
      armDirection.set(Math.cos(armYaw) * side, 0, Math.sin(armYaw) * side).normalize();
      quaternion.setFromUnitVectors(upDirection, armDirection);
      matrix.compose(
        position.set(x + armDirection.x * armLength * 0.5, armY, z + armDirection.z * armLength * 0.5),
        quaternion,
        scale.set(1, armLength / 0.42, 1),
      );
      arms.setMatrixAt(armIndex, matrix);
      const elbowX = x + armDirection.x * armLength;
      const elbowZ = z + armDirection.z * armLength;
      quaternion.identity();
      matrix.compose(
        position.set(elbowX, armY + riseHeight * 0.5, elbowZ),
        quaternion,
        scale.set(1, riseHeight / 0.34, 1),
      );
      upperArms.setMatrixAt(armIndex, matrix);
      matrix.compose(position.set(elbowX, armY, elbowZ), quaternion, scale.set(1, 0.9, 1));
      armElbows.setMatrixAt(armIndex, matrix);
      matrix.compose(position.set(elbowX, armY + riseHeight, elbowZ), quaternion, scale.set(1, 0.82, 1));
      armCaps.setMatrixAt(armIndex, matrix);
      const armValue = 0.9 + ((index + sideIndex) % 4) * 0.03;
      cactusTint.setRGB(armValue * 0.88, armValue, armValue * 0.74);
      arms.setColorAt(armIndex, cactusTint);
      upperArms.setColorAt(armIndex, cactusTint);
      armElbows.setColorAt(armIndex, cactusTint);
      armCaps.setColorAt(armIndex, cactusTint);
      armIndex += 1;
    });
  }
  [trunks, trunkCaps, arms, upperArms, armElbows, armCaps].forEach((mesh) => {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  });
  root.userData.cactusVariation = { count, armCount, bilateralEveryCactus: false, roundedJoints: true };
  root.userData.sculptRuntime = { parts: [registerIsland13RuntimePart('cactus-system', root, 'ambience')] };
  return root;
}

function createFrontierGroundDetails(materials: Island13CactusCanyonMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_13_FRONTIER_GROUND_DETAILS';
  const pebbleCount = quality === 'high' ? 72 : quality === 'medium' ? 48 : 28;
  const pebbles = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.08, 0), materials.sandstoneLight, pebbleCount);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  for (let index = 0; index < pebbleCount; index += 1) {
    const angle = index * 2.399963;
    const radius = 1.72 + ((index * 29) % 81) / 81 * 0.84;
    const size = 0.7 + (index % 5) * 0.13;
    matrix.compose(
      position.set(Math.cos(angle) * radius, 0.48, Math.sin(angle) * radius),
      quaternion.setFromEuler(new THREE.Euler(index * 0.31, angle, index * 0.17)),
      scale.set(size * 1.35, size * 0.58, size),
    );
    pebbles.setMatrixAt(index, matrix);
  }
  pebbles.instanceMatrix.needsUpdate = true;
  root.add(pebbles);

  // Quiet, irregular flagstone paths enrich the town floor without drawing a
  // second route. They remain well inside the live tile corridor and use two
  // warm stone values so the ground reads as laid frontier paving at phone
  // scale instead of one smooth sand cap.
  const flagstoneCount = quality === 'high' ? 44 : quality === 'medium' ? 30 : 18;
  const lightFlagstoneCount = Math.ceil(flagstoneCount * 0.42);
  const mainFlagstones = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.46, 0.035, 0.3),
    materials.sandstone,
    flagstoneCount - lightFlagstoneCount,
  );
  const lightFlagstones = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.42, 0.04, 0.28),
    materials.sandstoneLight,
    lightFlagstoneCount,
  );
  mainFlagstones.name = 'ISLAND_13_FRONTIER_MAIN_FLAGSTONES';
  lightFlagstones.name = 'ISLAND_13_FRONTIER_SUNLIT_FLAGSTONES';
  let mainFlagstoneIndex = 0;
  let lightFlagstoneIndex = 0;
  for (let index = 0; index < flagstoneCount; index += 1) {
    const angle = index * 2.399963 + (index % 3) * 0.08;
    const radius = 1.58 + ((index * 31) % 79) / 79 * 1.08;
    const isLight = index % 5 === 1 || index % 7 === 3;
    matrix.compose(
      position.set(Math.cos(angle) * radius, 0.455 + (index % 3) * 0.004, Math.sin(angle) * radius),
      quaternion.setFromEuler(new THREE.Euler(0, -angle + (index % 4 - 1.5) * 0.11, 0)),
      scale.set(0.82 + (index % 4) * 0.08, 1, 0.78 + (index % 3) * 0.1),
    );
    if (isLight && lightFlagstoneIndex < lightFlagstoneCount) {
      lightFlagstones.setMatrixAt(lightFlagstoneIndex, matrix);
      lightFlagstoneIndex += 1;
    } else if (mainFlagstoneIndex < flagstoneCount - lightFlagstoneCount) {
      mainFlagstones.setMatrixAt(mainFlagstoneIndex, matrix);
      mainFlagstoneIndex += 1;
    } else {
      lightFlagstones.setMatrixAt(lightFlagstoneIndex, matrix);
      lightFlagstoneIndex += 1;
    }
  }
  mainFlagstones.count = mainFlagstoneIndex;
  lightFlagstones.count = lightFlagstoneIndex;
  mainFlagstones.instanceMatrix.needsUpdate = true;
  lightFlagstones.instanceMatrix.needsUpdate = true;
  root.add(mainFlagstones, lightFlagstones);

  const fenceCount = quality === 'low' ? 8 : 14;
  for (let index = 0; index < fenceCount; index += 1) {
    const angle = index / fenceCount * Math.PI * 2 + 0.13;
    const fence = new THREE.Group();
    fence.position.set(Math.cos(angle) * 4.55, 0.5, Math.sin(angle) * 4.55);
    fence.rotation.y = -angle;
    [-0.28, 0.28].forEach((x) => {
      const post = box(0.06, 0.48, 0.06, materials.timberWorn);
      post.position.set(x, 0.22, 0);
      fence.add(post);
    });
    [0.15, 0.34].forEach((y) => {
      const rail = box(0.62, 0.045, 0.055, materials.timber);
      rail.position.y = y;
      fence.add(rail);
    });
    root.add(fence);
  }
  const propPlacements = [
    [-2.35, -0.8], [2.25, -0.75], [-2.25, 0.95], [2.35, 0.9], [-4.55, -2.2], [4.45, 2.15], [-4.4, 2.25], [4.5, -2.2],
  ] as const;
  propPlacements.slice(0, quality === 'low' ? 5 : propPlacements.length).forEach(([x, z], index) => {
    const cluster = new THREE.Group();
    cluster.position.set(x, 0.5, z);
    cluster.rotation.y = index * 0.67;
    const crate = box(0.22 + (index % 2) * 0.08, 0.2, 0.22, materials.timberWorn);
    const barrel = cylinder(0.11, 0.13, 0.3, materials.timber, 10);
    barrel.position.set(0.22, 0.06, -0.05);
    const ironBand = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 5, 10), materials.iron);
    ironBand.rotation.x = Math.PI / 2;
    ironBand.position.set(0.22, 0.06, -0.05);
    cluster.add(crate, barrel, ironBand);
    root.add(cluster);
  });
  const scrubCount = quality === 'high' ? 42 : quality === 'medium' ? 28 : 16;
  const scrub = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.12, 0), materials.cactusLight, scrubCount);
  for (let index = 0; index < scrubCount; index += 1) {
    const angle = index * 2.399963;
    const radius = index % 2 === 0 ? 2.28 : 4.58;
    const size = 0.62 + (index % 4) * 0.13;
    matrix.compose(
      position.set(Math.cos(angle) * radius, 0.5, Math.sin(angle) * radius),
      quaternion.setFromEuler(new THREE.Euler(0, angle, 0)),
      scale.set(size * 1.4, size * 0.7, size),
    );
    scrub.setMatrixAt(index, matrix);
  }
  scrub.instanceMatrix.needsUpdate = true;
  root.add(scrub);

  // Thin dry-grass blades break the remaining empty sand patches. They are
  // distributed through all azimuths, kept out of the live tile corridor,
  // and batched into one draw-call so the summit gains life without a phone
  // performance penalty.
  const grassTargetCount = quality === 'high' ? 56 : quality === 'medium' ? 38 : 22;
  const dryGrass = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.035, 0.28, 5),
    materials.timberWorn,
    grassTargetCount,
  );
  dryGrass.name = 'ISLAND_13_ROUTE_CLEAR_DRY_GRASS_BLADES';
  let grassCount = 0;
  for (let index = 0; index < grassTargetCount * 2 && grassCount < grassTargetCount; index += 1) {
    const angle = index * 2.399963 + 0.21;
    const radius = index % 3 === 0 ? 3.05 : 4.82 + (index % 4) * 0.12;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (!isIsland13RouteCorridorClear(x, z, 0.08)) continue;
    const bladeHeight = 0.7 + (index % 5) * 0.11;
    matrix.compose(
      position.set(x, 0.53 + bladeHeight * 0.12, z),
      quaternion.setFromEuler(new THREE.Euler((index % 3 - 1) * 0.14, angle, (index % 5 - 2) * 0.08)),
      scale.set(0.72 + (index % 3) * 0.13, bladeHeight, 0.8),
    );
    dryGrass.setMatrixAt(grassCount, matrix);
    grassCount += 1;
  }
  dryGrass.count = grassCount;
  dryGrass.instanceMatrix.needsUpdate = true;
  root.add(dryGrass);

  // Hand-built frontier wayfinding repeats around the settlement so every
  // orbit reads as a western rail town. The planks sit inside the board ring,
  // clear of both the player route and the summit passenger railway.
  const signLabels = [
    ['UNION STATION', 'CANYON FLOOR'],
    ['WATERWORKS', 'WINDMILL RANCH'],
    ['SIGNAL YARD', 'HATCHERY'],
    ['FREIGHT DEPOT', 'SPIRAL WORKS'],
  ] as const;
  signLabels.forEach((labels, signIndex) => {
    const angle = signIndex / signLabels.length * Math.PI * 2 + 0.48;
    const sign = new THREE.Group();
    sign.name = `ISLAND_13_WESTERN_WAYFINDING_${signIndex + 1}`;
    sign.userData.labels = labels;
    sign.position.set(Math.cos(angle) * 2.85, 0.48, Math.sin(angle) * 2.85);
    sign.rotation.y = -angle + Math.PI / 2;
    const post = box(0.1, 1.35, 0.1, materials.timberWorn);
    post.position.y = 0.66;
    sign.add(post);
    labels.forEach((label, plankIndex) => {
      const direction = (signIndex + plankIndex) % 2 ? -1 : 1;
      const plank = box(0.92, 0.22, 0.1, plankIndex ? materials.timber : materials.timberWorn);
      plank.name = `ISLAND_13_WESTERN_SIGN_${label.replace(/ /g, '_')}`;
      plank.userData.label = label;
      plank.position.set(direction * 0.34, 1.12 - plankIndex * 0.3, 0);
      plank.rotation.z = direction * (0.035 + signIndex * 0.008);
      const arrowTip = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.28, 3), plankIndex ? materials.timber : materials.timberWorn);
      arrowTip.position.set(direction * 0.83, 1.12 - plankIndex * 0.3, 0);
      arrowTip.rotation.z = direction > 0 ? -Math.PI / 2 : Math.PI / 2;
      const nail = new THREE.Mesh(new THREE.SphereGeometry(0.035, 7, 5), materials.iron);
      nail.position.set(0, 1.12 - plankIndex * 0.3, 0.07);
      sign.add(plank, arrowTip, nail);
    });
    const horseshoe = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 5, 12, Math.PI * 1.55), materials.iron);
    horseshoe.position.set(0, 0.45, 0.075);
    horseshoe.rotation.z = Math.PI * 0.22;
    sign.add(horseshoe);
    root.add(sign);
  });
  root.userData.sculptRuntime = { parts: [registerIsland13RuntimePart('frontier-props', root, 'ambience')] };
  return root;
}

export function createIsland13CactusCanyonLivingAmbience(
  scene: THREE.Scene,
  qualityProfile: Island3DQualityProfile,
  materials: Island13CactusCanyonMaterials,
): Island13CactusCanyonAmbienceRuntime {
  const quality = qualityProfile.id;
  const root = new THREE.Group();
  root.name = 'ISLAND_13_CACTUS_CANYON_WORLD_ROOT';

  // The sun is geometry in world space, aligned with the Canyon key light.
  // It therefore stays over the same horizon landmark while the camera orbits
  // instead of behaving like a screen-space sticker that follows the player.
  const fixedSun = new THREE.Group();
  fixedSun.name = 'ISLAND_13_FIXED_WORLD_SUN';
  // The production camera looks steeply down into the canyon; its apparent
  // horizon descends in world Y as Z recedes. This position keeps the sun high
  // in the rendered sky while remaining a fixed, distant world object.
  fixedSun.position.set(7, -7, -32);
  fixedSun.userData.worldLocked = true;
  fixedSun.userData.lightDirection = [8, 18, -14];
  const sunCore = new THREE.Mesh(
    new THREE.SphereGeometry(2.4, quality === 'low' ? 12 : 20, quality === 'low' ? 8 : 14),
    new THREE.MeshBasicMaterial({ color: 0xffe3a0, fog: false }),
  );
  sunCore.name = 'ISLAND_13_FIXED_WORLD_SUN_CORE';
  const sunCorona = new THREE.Mesh(
    new THREE.SphereGeometry(3.5, quality === 'low' ? 12 : 20, quality === 'low' ? 8 : 14),
    new THREE.MeshBasicMaterial({
      color: 0xff8f3f,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      fog: false,
      side: THREE.BackSide,
    }),
  );
  sunCorona.name = 'ISLAND_13_FIXED_WORLD_SUN_CORONA';
  fixedSun.add(sunCore, sunCorona);
  root.add(fixedSun);

  const heatVeils = new THREE.Group();
  heatVeils.name = 'ISLAND_13_CANYON_HEAT_SHIMMER';
  const heatSheets: THREE.Mesh[] = [];
  const heatSheetCount = quality === 'high' ? 12 : quality === 'medium' ? 8 : 5;
  for (let index = 0; index < heatSheetCount; index += 1) {
    const angle = index / heatSheetCount * Math.PI * 2 + 0.18;
    const radius = 17 + (index % 4) * 5.2;
    const material = new THREE.MeshBasicMaterial({
      color: index % 2 ? 0xffc079 : 0xf28b55,
      transparent: true,
      opacity: 0.028,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    const veil = new THREE.Mesh(new THREE.PlaneGeometry(8 + (index % 3) * 2.4, 2.4), material);
    veil.name = `ISLAND_13_HEAT_VEIL_${index + 1}`;
    veil.position.set(Math.cos(angle) * radius, -10.5 - (index % 3) * 1.8, Math.sin(angle) * radius);
    veil.rotation.y = -angle + Math.PI / 2;
    veil.userData.baseY = veil.position.y;
    veil.userData.phase = index * 0.73;
    heatSheets.push(veil);
    heatVeils.add(veil);
  }
  root.add(heatVeils);

  const mesaCliff = cylinder(6.0, 6.65, 1.55, materials.sandstone, segments(quality));
  mesaCliff.name = 'ISLAND_13_FRACTURED_MESA_CLIFF';
  mesaCliff.position.y = -0.63;
  mesaCliff.scale.z = 0.9;
  const mesaBand = cylinder(6.2, 6.3, 0.32, materials.sandstone, segments(quality));
  mesaBand.position.y = 0.1;
  mesaBand.scale.z = 0.9;
  const mesaCap = cylinder(6.05, 6.15, 0.22, materials.sand, segments(quality));
  mesaCap.position.y = 0.32;
  mesaCap.scale.z = 0.9;
  const pillarCore = new THREE.Mesh(
    createFracturedPillarGeometry(
      5.4,
      4.8,
      13.75,
      quality === 'high' ? 22 : quality === 'medium' ? 18 : 14,
      quality === 'high' ? 13 : quality === 'medium' ? 10 : 8,
    ),
    materials.sandstone,
  );
  pillarCore.name = 'ISLAND_13_CANYON_PILLAR_CONTINUOUS_CORE';
  pillarCore.position.y = transformIsland13PillarY(-8.2);
  pillarCore.scale.y = ISLAND_13_PILLAR_VERTICAL_SCALE;
  pillarCore.scale.z = 0.87;
  // Stable named anchors preserve structural diagnostics while the visible
  // geology is now one continuous volume with no artificial mid-height seam.
  const upperPillarAnchor = new THREE.Object3D();
  upperPillarAnchor.name = 'ISLAND_13_CANYON_PILLAR_UPPER';
  upperPillarAnchor.position.y = transformIsland13PillarY(-5.15);
  const lowerPillarAnchor = new THREE.Object3D();
  lowerPillarAnchor.name = 'ISLAND_13_CANYON_PILLAR_LOWER';
  lowerPillarAnchor.position.y = transformIsland13PillarY(-12.0);
  root.add(mesaCliff, mesaBand, mesaCap, pillarCore, upperPillarAnchor, lowerPillarAnchor);
  const angularDistance = (a: number, b: number) => Math.acos(Math.cos(a - b));
  const moveAngleOutsideRailCorridor = (angle: number, railAngle: number, clearance: number) => {
    const signedDistance = Math.atan2(Math.sin(angle - railAngle), Math.cos(angle - railAngle));
    if (Math.abs(signedDistance) >= clearance) return angle;
    const direction = signedDistance >= 0 ? 1 : -1;
    return angle + direction * (clearance - Math.abs(signedDistance) + 0.12);
  };
  const pillarRibCount = quality === 'high' ? 24 : quality === 'medium' ? 18 : 12;
  const pillarRibs = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.48, 0), materials.sandstone, pillarRibCount);
  pillarRibs.name = 'ISLAND_13_CANYON_PILLAR_ROCK_RIBS';
  const pillarMatrix = new THREE.Matrix4();
  const pillarQuaternion = new THREE.Quaternion();
  const pillarPosition = new THREE.Vector3();
  const pillarScale = new THREE.Vector3();
  for (let index = 0; index < pillarRibCount; index += 1) {
    const progress = index / Math.max(1, pillarRibCount - 1);
    const y = THREE.MathUtils.lerp(-1.72, -14.45, progress);
    const railProgress = THREE.MathUtils.clamp((y + 13.2) / 13.6, 0, 1);
    const railAngle = Math.PI * 0.2 + railProgress * 3.15 * Math.PI * 2;
    const angle = moveAngleOutsideRailCorridor(index * 2.39, railAngle, 0.62);
    const radius = THREE.MathUtils.lerp(5.12, 4.55, progress) * (0.9 + (index % 4) * 0.035);
    const size = THREE.MathUtils.lerp(1.15, 0.5, progress) * (0.84 + (index % 3) * 0.11);
    pillarMatrix.compose(
      pillarPosition.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius * 0.86),
      pillarQuaternion.setFromEuler(new THREE.Euler(index * 0.13, -angle, (index % 5 - 2) * 0.08)),
      pillarScale.set(size * 1.08, size * 0.68, size),
    );
    pillarRibs.setMatrixAt(index, pillarMatrix);
  }
  pillarRibs.instanceMatrix.needsUpdate = true;
  pillarRibs.scale.y = ISLAND_13_PILLAR_VERTICAL_SCALE;
  pillarRibs.position.y = ISLAND_13_PILLAR_VERTICAL_OFFSET;
  root.add(pillarRibs);

  const canyonSystem = new THREE.Group();
  canyonSystem.name = 'ISLAND_13_360_CANYON_SYSTEM';
  const canyonVoidMaterial = materials.sandstoneShadow.clone();
  canyonVoidMaterial.name = 'ISLAND_13_CANYON_VOID_MATERIAL';
  canyonVoidMaterial.color.setHex(0x54251a);
  canyonVoidMaterial.roughness = 1;
  canyonVoidMaterial.metalness = 0;
  canyonVoidMaterial.side = THREE.DoubleSide;
  canyonVoidMaterial.polygonOffset = true;
  canyonVoidMaterial.polygonOffsetFactor = -2;
  canyonVoidMaterial.polygonOffsetUnits = -2;
  const minorCanyonMaterial = canyonVoidMaterial.clone();
  minorCanyonMaterial.name = 'ISLAND_13_MINOR_CANYON_MATERIAL';
  minorCanyonMaterial.color.setHex(0x87402b);
  const canyonRimGeometry = new THREE.DodecahedronGeometry(0.42, 0);
  const canyonInnerLedgeGeometry = new THREE.DodecahedronGeometry(0.5, 0);
  const pillarRadiusAtY = (y: number) => {
    const progress = THREE.MathUtils.clamp((-1.325 - y) / 13.75, 0, 1);
    return THREE.MathUtils.lerp(5.4, 4.8, progress);
  };
  const addCanyonScar = (options: {
    id: string;
    angle: number;
    topY: number;
    bottomY: number;
    width: number;
    monumental?: boolean;
    angleDrift?: number;
  }) => {
    const sampleCount = options.monumental ? (quality === 'low' ? 15 : 22) : (quality === 'low' ? 7 : 11);
    const positions: number[] = [];
    const indices: number[] = [];
    const edgeSamples: { leftAngle: number; rightAngle: number; radius: number; y: number }[] = [];
    for (let index = 0; index <= sampleCount; index += 1) {
      const progress = index / sampleCount;
      const y = THREE.MathUtils.lerp(options.topY, options.bottomY, progress);
      const radius = pillarRadiusAtY(y) + (options.monumental ? 0.09 : 0.065);
      const widthPulse = options.monumental
        ? 0.64 + Math.sin(progress * Math.PI) * 0.62 + (index % 3) * 0.06
        : 0.78 + Math.sin(progress * Math.PI) * 0.48 + (index % 2) * 0.07;
      const worldWidth = options.width * widthPulse;
      const centerAngle = options.angle + (options.angleDrift ?? 0) * progress
        + Math.sin(progress * Math.PI * (options.monumental ? 3.2 : 2.2) + options.angle * 1.7)
          * (options.monumental ? 0.065 : 0.035);
      const halfAngle = worldWidth / Math.max(1, radius * 2);
      const leftAngle = centerAngle - halfAngle;
      const rightAngle = centerAngle + halfAngle;
      positions.push(
        Math.cos(leftAngle) * radius, y, Math.sin(leftAngle) * radius,
        Math.cos(rightAngle) * radius, y, Math.sin(rightAngle) * radius,
      );
      edgeSamples.push({ leftAngle, rightAngle, radius, y });
      if (index < sampleCount) {
        const offset = index * 2;
        indices.push(offset, offset + 1, offset + 2, offset + 1, offset + 3, offset + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const scar = new THREE.Mesh(geometry, options.monumental ? canyonVoidMaterial : minorCanyonMaterial);
    scar.name = `ISLAND_13_CANYON_SCAR_${options.id}`;
    scar.userData.canyonDepthClass = options.monumental ? 'monumental' : 'minor';
    canyonSystem.add(scar);

    // Continuous irregular lips make every fissure read from a distance;
    // isolated boulders alone disappear at the intended mobile camera scale.
    [
      { key: 'LEFT', edge: 'leftAngle' as const, direction: -1 },
      { key: 'RIGHT', edge: 'rightAngle' as const, direction: 1 },
    ].forEach(({ key, edge, direction }, sideIndex) => {
      const wallPositions: number[] = [];
      const wallIndices: number[] = [];
      edgeSamples.forEach((sample, index) => {
        const innerAngle = sample[edge];
        const wallWidth = options.monumental ? 0.3 : 0.23;
        const outerAngle = innerAngle + direction * wallWidth / sample.radius;
        const wallRadius = sample.radius + 0.105;
        wallPositions.push(
          Math.cos(innerAngle) * wallRadius, sample.y, Math.sin(innerAngle) * wallRadius,
          Math.cos(outerAngle) * wallRadius, sample.y, Math.sin(outerAngle) * wallRadius,
        );
        if (index < edgeSamples.length - 1) {
          const offset = index * 2;
          wallIndices.push(offset, offset + 1, offset + 2, offset + 1, offset + 3, offset + 2);
        }
      });
      const wallGeometry = new THREE.BufferGeometry();
      wallGeometry.setAttribute('position', new THREE.Float32BufferAttribute(wallPositions, 3));
      wallGeometry.setIndex(wallIndices);
      wallGeometry.computeVertexNormals();
      const wall = new THREE.Mesh(
        wallGeometry,
        sideIndex === 0 ? materials.sandstoneLight : materials.sandstone,
      );
      wall.name = `ISLAND_13_CANYON_WALL_${options.id}_${key}`;
      canyonSystem.add(wall);
    });

    // Monumental does not mean a featureless black hole. Alternating rock
    // shelves catch the late-day light inside the cut and make its depth
    // legible as eroded geology from every orbit angle.
    if (options.monumental) {
      edgeSamples.forEach((sample, index) => {
        if (index < 2 || index > edgeSamples.length - 3 || index % 2 !== 1) return;
        const centerAngle = (sample.leftAngle + sample.rightAngle) * 0.5;
        const angularWidth = sample.rightAngle - sample.leftAngle;
        const ledge = new THREE.Mesh(
          canyonInnerLedgeGeometry,
          index % 2 ? materials.sandstoneShadow : materials.sandstone,
        );
        ledge.name = `ISLAND_13_MONUMENTAL_INNER_LEDGE_${index}`;
        const ledgeAngle = centerAngle + (index % 2 ? -1 : 1) * angularWidth * 0.18;
        const ledgeRadius = sample.radius + 0.16;
        ledge.position.set(Math.cos(ledgeAngle) * ledgeRadius, sample.y, Math.sin(ledgeAngle) * ledgeRadius);
        ledge.rotation.set(index * 0.11, -ledgeAngle, (index % 2 ? -1 : 1) * 0.12);
        ledge.scale.set(0.42, 0.28 + (index % 3) * 0.06, 1.04 + (index % 4) * 0.14);
        canyonSystem.add(ledge);
      });
    }

    const rimStride = options.monumental ? 2 : 3;
    edgeSamples.forEach((sample, index) => {
      if (index % rimStride !== 0 || index === 0 || index === edgeSamples.length - 1) return;
      [sample.leftAngle, sample.rightAngle].forEach((edgeAngle, sideIndex) => {
        const rimRock = new THREE.Mesh(
          canyonRimGeometry,
          (index + sideIndex) % 3 === 0 ? materials.sandstoneLight : materials.sandstone,
        );
        rimRock.name = `ISLAND_13_CANYON_RIM_${options.id}_${index}_${sideIndex + 1}`;
        const rimRadius = sample.radius + (options.monumental ? 0.14 : 0.1);
        rimRock.position.set(Math.cos(edgeAngle) * rimRadius, sample.y, Math.sin(edgeAngle) * rimRadius);
        const size = (options.monumental ? 0.85 : 0.48) * (0.82 + (index % 4) * 0.1);
        rimRock.scale.set(size * 0.72, size * 1.25, size * 0.52);
        rimRock.rotation.set(index * 0.19, -edgeAngle, (sideIndex ? -1 : 1) * 0.22);
        canyonSystem.add(rimRock);
      });
    });
  };

  const monumentalCanyonAngle = 0.95;
  addCanyonScar({
    id: 'MONUMENTAL_RAVINE',
    angle: monumentalCanyonAngle,
    topY: -1.85,
    bottomY: -14.55,
    width: 1.55,
    monumental: true,
  });
  const minorCanyons = [
    { angle: -2.85, angleDrift: -0.15, topY: -2.7, bottomY: -7.4, width: 1.28 },
    { angle: -2.15, angleDrift: 0.18, topY: -6.1, bottomY: -13.6, width: 1.16 },
    { angle: -1.45, angleDrift: -0.2, topY: -3.8, bottomY: -9.7, width: 1.38 },
    { angle: -0.72, angleDrift: 0.17, topY: -8.0, bottomY: -14.25, width: 1.2 },
    { angle: 0.0, angleDrift: -0.16, topY: -3.4, bottomY: -8.1, width: 1.3 },
    { angle: 1.72, angleDrift: 0.19, topY: -5.2, bottomY: -12.3, width: 1.22 },
    { angle: 2.38, angleDrift: -0.18, topY: -2.8, bottomY: -8.9, width: 1.36 },
    { angle: 2.9, angleDrift: 0.15, topY: -8.4, bottomY: -14.1, width: 1.18 },
  ] as const;
  minorCanyons.forEach((canyon, index) => addCanyonScar({ id: `MINOR_${index + 1}`, ...canyon }));

  // Short Y-shaped tributaries keep the secondary ravines geological instead
  // of reading as evenly spaced painted stripes. Each begins inside its parent
  // scar, then walks sideways down the cliff face.
  minorCanyons.forEach((canyon, index) => {
    const tributaryStartY = THREE.MathUtils.lerp(canyon.topY, canyon.bottomY, 0.3);
    const tributaryEndY = THREE.MathUtils.lerp(canyon.topY, canyon.bottomY, 0.7);
    addCanyonScar({
      id: `TRIBUTARY_${index + 1}`,
      angle: canyon.angle,
      angleDrift: (index % 2 === 0 ? 1 : -1) * (0.12 + (index % 3) * 0.035),
      topY: tributaryStartY,
      bottomY: tributaryEndY,
      width: canyon.width * 0.48,
    });
  });

  // A staggered skin of large fractured blocks gives the pillar the chunky
  // vertical construction seen in the approved goal. Gaps are intentionally
  // reserved for the live spiral railway and every authored ravine, allowing
  // the dark core to read only as genuine depth between sunlit rock masses.
  const cliffBlockSlots = quality === 'high' ? 28 : quality === 'medium' ? 22 : 18;
  const cliffBlockRows = quality === 'high' ? 15 : quality === 'medium' ? 13 : 10;
  const cliffBlockConfigs: Array<{
    angle: number;
    y: number;
    width: number;
    height: number;
    depth: number;
    roll: number;
    sunlit: boolean;
  }> = [];
  for (let row = 0; row < cliffBlockRows; row += 1) {
    const y = -2.15 - row * (12.2 / Math.max(1, cliffBlockRows - 1))
      + Math.sin(row * 1.71 + 0.4) * 0.16;
    for (let slot = 0; slot < cliffBlockSlots; slot += 1) {
      const rowStagger = ((row % 3) / 3) * (Math.PI * 2 / cliffBlockSlots);
      const columnAngle = slot / cliffBlockSlots * Math.PI * 2 + rowStagger
        + Math.sin((slot + 2) * 1.73) * 0.038;
      const jointStagger = (row % 2 ? 1 : -1) * 0.018;
      const angle = columnAngle + jointStagger + Math.sin(row * 0.83 + slot * 1.17) * 0.024;
      const railProgress = THREE.MathUtils.clamp((y + 13.2) / 13.6, 0, 1);
      const railAngle = Math.PI * 0.2 + railProgress * 3.15 * Math.PI * 2;
      if (angularDistance(angle, railAngle) < 0.44) continue;
      const intersectsMonumental = y <= -1.85 && y >= -14.55
        && angularDistance(angle, monumentalCanyonAngle) < 0.22;
      const intersectsMinor = minorCanyons.some((canyon) => (
        y <= canyon.topY && y >= canyon.bottomY
        && angularDistance(angle, canyon.angle + canyon.angleDrift * 0.5) < Math.max(
          0.16,
          canyon.width / Math.max(6.4, pillarRadiusAtY(y) * 1.8),
        )
      ));
      if (intersectsMonumental || intersectsMinor) continue;
      cliffBlockConfigs.push({
        angle,
        y: y + Math.sin(slot * 2.11 + row) * 0.2,
        width: 0.88 + (slot % 4) * 0.06 + (row % 3) * 0.03,
        height: 0.78 + ((slot * 3 + row) % 4) * 0.07,
        depth: 0.82 + (slot % 4) * 0.07 + (row % 2) * 0.04,
        roll: (slot % 5 - 2) * 0.038 + Math.sin(row * 1.37 + slot) * 0.026,
        sunlit: slot % 5 === 1 && row % 4 !== 2,
      });
    }
  }
  // Local X is radial after the -angle rotation and local Z is tangential.
  // The previous base geometry reversed those proportions (0.95 radial by
  // 1.8 tangential), which made every orbit collapse the blocks into hanging
  // sheets. These deeper, narrower, strongly bevelled units overlap into the
  // rounded vertical rock stacks visible in the approved pillar goal.
  const cliffBlockGeometry = erodedBlockGeometry(
    1.3,
    1.05,
    0.96,
    quality === 'low' ? 0.1 : 0.19,
  );
  const roundedCliffBlockGeometry = new THREE.DodecahedronGeometry(0.72, 0);
  const mainCliffBlockConfigs = cliffBlockConfigs.filter((block) => !block.sunlit);
  const sunlitCliffBlockConfigs = cliffBlockConfigs.filter((block) => block.sunlit);
  const addCliffBlockFamily = (
    blocks: typeof cliffBlockConfigs,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    name: string,
  ) => {
    const skin = new THREE.InstancedMesh(geometry, material, blocks.length);
    skin.name = name;
    const instanceTint = new THREE.Color();
    blocks.forEach((block, index) => {
      const radius = pillarRadiusAtY(block.y) + 0.3 + Math.sin(index * 1.91) * 0.055;
      pillarMatrix.compose(
        pillarPosition.set(
          Math.cos(block.angle) * radius,
          block.y,
          Math.sin(block.angle) * radius * 0.87,
        ),
        pillarQuaternion.setFromEuler(new THREE.Euler(
          (index % 3 - 1) * 0.065,
          -block.angle,
          block.roll,
        )),
        pillarScale.set(block.depth, block.height, block.width),
      );
      skin.setMatrixAt(index, pillarMatrix);
      const band = Math.sin(block.y * 1.27 + block.angle * 1.9) * 0.035;
      const sunBias = block.sunlit ? 0.035 : 0;
      instanceTint.setRGB(
        1.01 + band + sunBias,
        0.98 + band * 0.72 + sunBias * 0.74,
        0.94 + band * 0.48 + sunBias * 0.48,
      );
      skin.setColorAt(index, instanceTint);
    });
    skin.instanceMatrix.needsUpdate = true;
    if (skin.instanceColor) skin.instanceColor.needsUpdate = true;
    skin.castShadow = true;
    skin.receiveShadow = true;
    skin.userData.explodeWithParent = true;
    canyonSystem.add(skin);
  };
  addCliffBlockFamily(
    mainCliffBlockConfigs,
    cliffBlockGeometry,
    materials.sandstone,
    'ISLAND_13_CANYON_FRACTURED_BLOCK_SKIN',
  );
  addCliffBlockFamily(
    sunlitCliffBlockConfigs,
    roundedCliffBlockGeometry,
    materials.sandstoneLight,
    'ISLAND_13_CANYON_FRACTURED_BLOCK_SUNLIT_SKIN',
  );

  // Sparse cliff-shelf life links the monumental support back to the source's
  // cactus biome. These sit on their own natural ledges, away from the train
  // corridor, and remain batched as three inexpensive instanced systems.
  const shelfCactusCount = quality === 'high' ? 14 : quality === 'medium' ? 10 : 6;
  const shelfCactusLedges = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.42, 0),
    materials.sandstoneLight,
    shelfCactusCount,
  );
  const shelfCactusTrunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.075, 0.095, 1, 7),
    materials.cactus,
    shelfCactusCount,
  );
  const shelfCactusArms = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.045, 0.055, 0.34, 7),
    materials.cactusLight,
    shelfCactusCount,
  );
  shelfCactusLedges.name = 'ISLAND_13_CANYON_SHELF_PLANT_LEDGES';
  shelfCactusTrunks.name = 'ISLAND_13_CANYON_SHELF_CACTUS_TRUNKS';
  shelfCactusArms.name = 'ISLAND_13_CANYON_SHELF_CACTUS_ARMS';
  for (let index = 0; index < shelfCactusCount; index += 1) {
    const y = -3.15 - (index % 6) * 1.94 - Math.floor(index / 6) * 0.34;
    let angle = index * 2.399963 + 0.52;
    const railProgress = THREE.MathUtils.clamp((y + 13.2) / 13.6, 0, 1);
    const railAngle = Math.PI * 0.2 + railProgress * 3.15 * Math.PI * 2;
    if (angularDistance(angle, railAngle) < 0.42) angle += 0.76;
    const radius = pillarRadiusAtY(y) + 0.36;
    const height = 0.52 + (index % 4) * 0.105;
    pillarMatrix.compose(
      pillarPosition.set(Math.cos(angle) * radius, y - 0.13, Math.sin(angle) * radius * 0.87),
      pillarQuaternion.setFromEuler(new THREE.Euler(index * 0.17, -angle, (index % 3 - 1) * 0.08)),
      pillarScale.set(0.82 + (index % 3) * 0.1, 0.24, 1.05 + (index % 4) * 0.09),
    );
    shelfCactusLedges.setMatrixAt(index, pillarMatrix);
    pillarMatrix.compose(
      pillarPosition.set(
        Math.cos(angle) * (radius + 0.08),
        y + height * 0.5,
        Math.sin(angle) * (radius + 0.08) * 0.87,
      ),
      pillarQuaternion.identity(),
      pillarScale.set(0.86 + (index % 3) * 0.09, height, 0.86 + (index % 3) * 0.09),
    );
    shelfCactusTrunks.setMatrixAt(index, pillarMatrix);
    const side = index % 2 ? 1 : -1;
    pillarMatrix.compose(
      pillarPosition.set(
        Math.cos(angle) * (radius + 0.09) + Math.cos(angle + Math.PI / 2) * side * 0.13,
        y + height * 0.58,
        Math.sin(angle) * (radius + 0.09) * 0.87 + Math.sin(angle + Math.PI / 2) * side * 0.13,
      ),
      pillarQuaternion.setFromEuler(new THREE.Euler(0, -angle, Math.PI / 2)),
      pillarScale.set(1, 0.78 + (index % 3) * 0.13, 1),
    );
    shelfCactusArms.setMatrixAt(index, pillarMatrix);
  }
  [shelfCactusLedges, shelfCactusTrunks, shelfCactusArms].forEach((mesh) => {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.explodeWithParent = true;
    canyonSystem.add(mesh);
  });

  // Larger attached shoulder masses break the two-cylinder silhouette while
  // remaining behind the railway shelf. Instancing keeps the richer 360-degree
  // geology inexpensive on mobile.
  const shoulderCount = quality === 'high' ? 26 : quality === 'medium' ? 20 : 14;
  const rockShoulders = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.72, 0),
    materials.sandstone,
    shoulderCount,
  );
  rockShoulders.name = 'ISLAND_13_CANYON_ROCK_SHOULDERS';
  const shoulderTint = new THREE.Color();
  for (let index = 0; index < shoulderCount; index += 1) {
    let angle = index * 2.399963 + 0.31;
    const band = index % 7;
    const y = -2.25 - band * 1.82 - Math.floor(index / 7) * 0.24;
    const shoulderRailProgress = THREE.MathUtils.clamp((y + 13.2) / 13.6, 0, 1);
    const shoulderRailAngle = Math.PI * 0.2 + shoulderRailProgress * 3.15 * Math.PI * 2;
    angle = moveAngleOutsideRailCorridor(angle, shoulderRailAngle, 0.64);
    const radius = pillarRadiusAtY(y) + 0.08 + (index % 3) * 0.045;
    const size = 0.72 + (index % 5) * 0.1;
    pillarMatrix.compose(
      pillarPosition.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius),
      pillarQuaternion.setFromEuler(new THREE.Euler((index % 3 - 1) * 0.08, -angle, (index % 4 - 1.5) * 0.08)),
      pillarScale.set(size * 0.64, size * (0.9 + (index % 4) * 0.18), size * 0.82),
    );
    rockShoulders.setMatrixAt(index, pillarMatrix);
    const valueShift = Math.sin(y * 1.13 + angle * 1.7) * 0.045;
    shoulderTint.setRGB(1 + valueShift, 0.965 + valueShift * 0.7, 0.92 + valueShift * 0.45);
    rockShoulders.setColorAt(index, shoulderTint);
  }
  rockShoulders.instanceMatrix.needsUpdate = true;
  if (rockShoulders.instanceColor) rockShoulders.instanceColor.needsUpdate = true;
  rockShoulders.castShadow = true;
  rockShoulders.userData.explodeWithParent = true;
  canyonSystem.add(rockShoulders);

  // Long, attached cliff columns cross the old upper/lower core seam and
  // convert the support from stacked horizontal drums into one eroded mass.
  // Their angles step away from the railway at the matching elevation, so the
  // public shelf stays readable as a cut through geology rather than a rail
  // pasted over decorative rocks.
  const pillarRailBottomY = -13.2;
  const pillarRailTopY = 0.4;
  const pillarRailStartAngle = Math.PI * 0.2;
  const pillarRailTurns = 3.15;
  const cliffColumnCount = quality === 'high' ? 38 : quality === 'medium' ? 28 : 18;
  const lightCliffColumnCount = Math.max(3, Math.floor(cliffColumnCount * 0.32));
  const mainCliffColumnCount = cliffColumnCount - lightCliffColumnCount;
  const cliffColumnGeometry = new THREE.DodecahedronGeometry(0.72, 0);
  const mainCliffColumns = new THREE.InstancedMesh(
    cliffColumnGeometry,
    materials.sandstone,
    mainCliffColumnCount,
  );
  const lightCliffColumns = new THREE.InstancedMesh(
    cliffColumnGeometry,
    materials.sandstoneLight,
    lightCliffColumnCount,
  );
  mainCliffColumns.name = 'ISLAND_13_CANYON_MAIN_CLIFF_COLUMNS';
  lightCliffColumns.name = 'ISLAND_13_CANYON_SUNLIT_CLIFF_COLUMNS';
  const placeCliffColumns = (mesh: THREE.InstancedMesh, count: number, offset: number) => {
    const columnTint = new THREE.Color();
    for (let index = 0; index < count; index += 1) {
      const sequence = index + offset;
      const verticalProgress = (sequence * 0.61803398875 + 0.17) % 1;
      const y = THREE.MathUtils.lerp(-2.35, -14.35, verticalProgress)
        + Math.sin(sequence * 1.73) * 0.14;
      let angle = sequence * 2.399963 + 0.18;
      const approximateRailProgress = THREE.MathUtils.clamp(
        (y - pillarRailBottomY) / (pillarRailTopY - pillarRailBottomY),
        0,
        1,
      );
      const railwayAngle = pillarRailStartAngle + approximateRailProgress * pillarRailTurns * Math.PI * 2;
      angle = moveAngleOutsideRailCorridor(angle, railwayAngle, 0.64);
      const radius = pillarRadiusAtY(y) + 0.015;
      const size = 0.76 + (sequence % 5) * 0.07;
      pillarMatrix.compose(
        pillarPosition.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius * 0.87),
        pillarQuaternion.setFromEuler(new THREE.Euler(
          (sequence % 3 - 1) * 0.05,
          -angle,
          (sequence % 5 - 2) * 0.055,
        )),
        pillarScale.set(
          size * (0.76 + (sequence % 2) * 0.08),
          size * (0.98 + (sequence % 4) * 0.13),
          size * (0.88 + (sequence % 3) * 0.08),
        ),
      );
      mesh.setMatrixAt(index, pillarMatrix);
      const band = Math.sin(y * 1.42 + sequence * 0.73) * 0.04;
      columnTint.setRGB(1.015 + band, 0.975 + band * 0.7, 0.925 + band * 0.45);
      mesh.setColorAt(index, columnTint);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.explodeWithParent = true;
    canyonSystem.add(mesh);
  };
  placeCliffColumns(mainCliffColumns, mainCliffColumnCount, 0);
  placeCliffColumns(lightCliffColumns, lightCliffColumnCount, mainCliffColumnCount + 3);

  const talusCount = quality === 'high' ? 24 : quality === 'medium' ? 18 : 12;
  const baseTalus = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.58, 0),
    materials.sandstoneShadow,
    talusCount,
  );
  baseTalus.name = 'ISLAND_13_CANYON_BASE_TALUS';
  for (let index = 0; index < talusCount; index += 1) {
    const angleJitter = Math.sin((index + 1) * 91.73) * 0.17;
    const angle = index / talusCount * Math.PI * 2 + angleJitter;
    const radius = 4.42 + (index % 5) * 0.14 + Math.cos(index * 1.91) * 0.08;
    const size = 0.68 + (index % 5) * 0.09;
    pillarMatrix.compose(
      pillarPosition.set(
        Math.cos(angle) * radius,
        -14.98 + (index % 4) * 0.085 + Math.sin(index * 1.37) * 0.04,
        Math.sin(angle) * radius * 0.9,
      ),
      pillarQuaternion.setFromEuler(new THREE.Euler(index * 0.13, -angle, (index % 3 - 1) * 0.16)),
      pillarScale.set(
        size * (0.72 + (index % 3) * 0.1),
        size * (0.58 + (index % 4) * 0.1),
        size * (0.86 + (index % 5) * 0.09),
      ),
    );
    baseTalus.setMatrixAt(index, pillarMatrix);
  }
  baseTalus.instanceMatrix.needsUpdate = true;
  baseTalus.castShadow = true;
  baseTalus.userData.explodeWithParent = true;
  canyonSystem.add(baseTalus);

  // The completed spiral shelf becomes a short trestle wherever it crosses
  // the monumental natural ravine. The same rail geometry continues across;
  // these supports explain how public transport spans the void.
  const spiralStartAngleForBridges = Math.PI * 0.2;
  const spiralTurnsForBridges = 3.15;
  for (let crossing = 0; crossing < 4; crossing += 1) {
    const unwrappedAngle = monumentalCanyonAngle + crossing * Math.PI * 2;
    const progress = (unwrappedAngle - spiralStartAngleForBridges) / (spiralTurnsForBridges * Math.PI * 2);
    if (progress <= 0.04 || progress >= 0.9) continue;
    const easedProgress = THREE.MathUtils.smoothstep(progress, 0, 1);
    const y = THREE.MathUtils.lerp(-13.2, 0.4, easedProgress) - 0.34;
    const radius = THREE.MathUtils.lerp(4.92, 5.28, progress);
    const bridge = new THREE.Group();
    bridge.name = `ISLAND_13_MONUMENTAL_CANYON_RAIL_BRIDGE_${crossing + 1}`;
    bridge.position.set(Math.cos(monumentalCanyonAngle) * radius, y, Math.sin(monumentalCanyonAngle) * radius);
    bridge.rotation.y = -monumentalCanyonAngle;
    const crossBeam = box(0.68, 0.13, 2.2, materials.timberWorn);
    bridge.add(crossBeam);
    [-0.72, 0.72].forEach((z, supportIndex) => {
      const support = box(0.11, 0.88, 0.11, supportIndex ? materials.iron : materials.timber);
      support.position.set(0, -0.48, z);
      const brace = box(0.09, 0.96, 0.09, materials.brass);
      brace.position.set(0.04, -0.46, z * 0.5);
      brace.rotation.x = supportIndex ? -0.62 : 0.62;
      bridge.add(support, brace);
    });
    canyonSystem.add(bridge);
  }
  canyonSystem.userData.sculptRuntime = {
    parts: [registerIsland13RuntimePart('canyon-system', canyonSystem, 'terrain-detail')],
    canyonCount: minorCanyons.length + 1,
    monumentalCanyonAngle,
  };
  canyonSystem.scale.y = ISLAND_13_PILLAR_VERTICAL_SCALE;
  canyonSystem.position.y = ISLAND_13_PILLAR_VERTICAL_OFFSET;
  root.add(canyonSystem);
  const terrainProxy = new THREE.Object3D();
  terrainProxy.name = 'ISLAND_13_TERRAIN_RUNTIME_PROXY';
  terrainProxy.visible = false;
  terrainProxy.userData.sculptRuntime = { parts: [
    registerIsland13RuntimePart('terrain-network', terrainProxy, 'terrain'),
    registerIsland13RuntimePart('mesa-cliff', mesaCliff, 'terrain'),
    registerIsland13RuntimePart('mesa-ground', mesaCap, 'terrain'),
  ] };
  root.add(terrainProxy);

  const strataCount = quality === 'high' ? 34 : quality === 'medium' ? 24 : 16;
  const strata = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.24, 0.38, 1, 6), materials.sandstone, strataCount);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  for (let index = 0; index < strataCount; index += 1) {
    const angle = index / strataCount * Math.PI * 2;
    const height = 0.62 + ((index * 17) % 7) * 0.08;
    matrix.compose(
      position.set(Math.cos(angle) * 6.0, -0.55 - height * 0.22, Math.sin(angle) * 5.4),
      quaternion.setFromEuler(new THREE.Euler(0, -angle, (index % 3 - 1) * 0.04)),
      scale.set(0.8 + (index % 4) * 0.08, height, 0.72),
    );
    strata.setMatrixAt(index, matrix);
  }
  strata.instanceMatrix.needsUpdate = true;
  root.add(strata);

  const edgeRockCount = quality === 'high' ? 64 : quality === 'medium' ? 42 : 28;
  const edgeRocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.42, 0), materials.sandstone, edgeRockCount);
  for (let index = 0; index < edgeRockCount; index += 1) {
    const angle = index / edgeRockCount * Math.PI * 2 + Math.sin(index * 1.7) * 0.04;
    const radius = 5.85 + (index % 3) * 0.18;
    const size = 0.72 + (index % 5) * 0.12;
    matrix.compose(
      position.set(Math.cos(angle) * radius, 0.0 + (index % 3) * 0.08, Math.sin(angle) * radius * 0.9),
      quaternion.setFromEuler(new THREE.Euler(index * 0.21, -angle, index * 0.13)),
      scale.set(size * 1.15, size * 0.82, size),
    );
    edgeRocks.setMatrixAt(index, matrix);
  }
  edgeRocks.instanceMatrix.needsUpdate = true;
  root.add(edgeRocks);

  const hangingCount = quality === 'high' ? 22 : quality === 'medium' ? 16 : 10;
  const hangingRocks = new THREE.InstancedMesh(new THREE.ConeGeometry(0.28, 1.5, 6), materials.sandstoneShadow, hangingCount);
  for (let index = 0; index < hangingCount; index += 1) {
    const angle = index / hangingCount * Math.PI * 2 + 0.22;
    const length = 0.72 + (index % 5) * 0.18;
    matrix.compose(
      position.set(Math.cos(angle) * 5.35, -1.4 - length * 0.3, Math.sin(angle) * 4.72),
      quaternion.setFromEuler(new THREE.Euler(Math.PI, angle, (index % 3 - 1) * 0.08)),
      scale.set(0.82 + (index % 3) * 0.12, length, 0.82),
    );
    hangingRocks.setMatrixAt(index, matrix);
  }
  hangingRocks.instanceMatrix.needsUpdate = true;
  root.add(hangingRocks);

  const railway = createRailway(materials, quality);
  const locomotive = createLocomotive(materials, quality);
  const cacti = createCactusField(materials, quality);
  const buttes = createButteField(materials, quality);
  const groundDetails = createFrontierGroundDetails(materials, quality);
  const spiralRail = createCactusCanyonSpiralRail(materials, quality);
  spiralRail.root.scale.y = ISLAND_13_PILLAR_VERTICAL_SCALE;
  spiralRail.root.position.y = ISLAND_13_SPIRAL_VERTICAL_OFFSET;
  let spiralPresentation: Island13CactusCanyonSpiralPresentation = {
    segmentsExcavated: 0,
    maxSegments: 16,
    completed: false,
  };
  spiralRail.setProgress(spiralPresentation);
  root.add(railway, locomotive, cacti, buttes, groundDetails, spiralRail.root);

  const tunnelRoot = new THREE.Group();
  tunnelRoot.name = 'ISLAND_13_RAIL_TUNNEL';
  // The right-hand rail sector sits between the Habit and Event landmarks, so
  // the portal remains visible from the canonical camera and cannot disappear
  // inside another building while the locomotive crosses it.
  const tunnelAngle = 0.32;
  tunnelRoot.position.set(Math.cos(tunnelAngle) * 5.45, 0.34, Math.sin(tunnelAngle) * 5.45);
  tunnelRoot.rotation.y = -tunnelAngle + Math.PI / 2;
  [-1, 1].forEach((radialSide, sideIndex) => {
    const pier = box(1.95, 1.9, 0.42, sideIndex ? materials.sandstone : materials.sandstoneLight);
    pier.name = `ISLAND_13_RAIL_TUNNEL_PIER_${sideIndex + 1}`;
    pier.position.set(0, 0.95, radialSide * 0.82);
    tunnelRoot.add(pier);
  });
  const tunnelLintel = box(2.05, 0.44, 2.04, materials.sandstoneShadow);
  tunnelLintel.name = 'ISLAND_13_RAIL_TUNNEL_LINTEL';
  tunnelLintel.position.y = 2.1;
  tunnelRoot.add(tunnelLintel);
  [-1, 1].forEach((tangentSide, portalIndex) => {
    const portal = new THREE.Group();
    portal.name = `ISLAND_13_RAIL_TUNNEL_PORTAL_${portalIndex + 1}`;
    portal.position.x = tangentSide * 1.04;
    for (let stoneIndex = 0; stoneIndex < 7; stoneIndex += 1) {
      const angle = Math.PI * (stoneIndex / 6);
      const portalStone = box(0.18, 0.23, 0.3, stoneIndex % 2 ? materials.sandstoneLight : materials.sandstone);
      portalStone.position.set(0, 1.35 + Math.sin(angle) * 0.62, Math.cos(angle) * 0.66);
      portalStone.rotation.x = angle - Math.PI / 2;
      portal.add(portalStone);
    }
    tunnelRoot.add(portal);
  });
  const tunnelClearance = new THREE.Object3D();
  tunnelClearance.name = 'ISLAND_13_RAIL_TUNNEL_OPEN_CLEARANCE';
  tunnelClearance.userData.clearance = { width: 1.22, height: 1.88, axis: 'local-x' };
  tunnelRoot.add(tunnelClearance);
  tunnelRoot.userData.sculptRuntime = { parts: [registerIsland13RuntimePart('rail-tunnel', tunnelRoot, 'railway')] };
  root.add(tunnelRoot);

  root.userData.sculptRuntime = {
    model: 'island-013-cactus-canyon',
    explodable: true,
    parts: [
      registerIsland13RuntimePart('terrain-network', root, 'world'),
      registerIsland13RuntimePart('railway-system', railway, 'world'),
      registerIsland13RuntimePart('locomotive', locomotive, 'ambience'),
      registerIsland13RuntimePart('background-canyon', buttes, 'background'),
      registerIsland13RuntimePart('cactus-system', cacti, 'ambience'),
      registerIsland13RuntimePart('frontier-props', groundDetails, 'ambience'),
      registerIsland13RuntimePart('spiral-rail-mission', spiralRail.root, 'signature-mission'),
      registerIsland13RuntimePart('fixed-sun', fixedSun, 'world-locked-sun'),
      registerIsland13RuntimePart('heat-atmosphere', heatVeils, 'heat-atmosphere'),
    ],
    sockets: { route: 'ISLAND_13_ROUTE_SOCKET', landmarks: 'ISLAND_13_LANDMARK_NETWORK_SOCKET' },
    colliders: [{ id: 'island-013-terrain', type: 'cylinder', isTrigger: false }],
    destructionGroups: [{ id: 'world', breakable: false, partIds: ISLAND_13_RUNTIME_PART_IDS }],
  };
  scene.add(root);

  const steamPuffs = (locomotive.getObjectByName('ISLAND_13_CANYON_LOOP_LOCOMOTIVE')?.userData.steamPuffs ?? []) as THREE.Mesh[];
  const locomotiveTrain = locomotive.getObjectByName('ISLAND_13_CANYON_LOOP_LOCOMOTIVE');
  const trainUnits = (locomotive.userData.trainUnits ?? []) as Island13TrainUnit[];
  const summitSwitchAngle = ISLAND_13_SPIRAL_START_ANGLE + ISLAND_13_SPIRAL_TURNS * Math.PI * 2;
  const consistLength = Number(locomotive.userData.consistLength ?? 3.2);
  const summitHomeDistance = -consistLength - 0.8;
  const summitHomeAngle = summitSwitchAngle - summitHomeDistance / ISLAND_13_SUMMIT_RAIL_RADIUS;
  const poseTrainOnSummit = (engineAngle: number, clockwise: boolean) => {
    trainUnits.forEach((unit) => {
      const trailingSign = clockwise ? 1 : -1;
      const unitAngle = engineAngle + trailingSign * unit.offset / ISLAND_13_SUMMIT_RAIL_RADIUS;
      setIsland13TrainUnitPose(unit, sampleIsland13SummitRail(unitAngle, clockwise));
    });
  };
  const poseTrainOnCompositeRoute = (engineDistance: number, travelDirection: 1 | -1) => {
    trainUnits.forEach((unit) => {
      const unitDistance = engineDistance - travelDirection * unit.offset;
      setIsland13TrainUnitPose(unit, sampleIsland13CompositeRail(unitDistance, travelDirection));
    });
  };
  const requestedServiceTimeRaw = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('island13ServiceTime')
    : null;
  const requestedServiceTime = requestedServiceTimeRaw === null
    ? Number.NaN
    : Number(requestedServiceTimeRaw);
  const serviceTimeOverride = Number.isFinite(requestedServiceTime)
    ? THREE.MathUtils.clamp(requestedServiceTime, 0, 89.999)
    : null;
  return {
    root,
    updateSpiralRail: (presentation) => {
      spiralPresentation = {
        ...presentation,
        maxSegments: Math.max(1, Math.floor(presentation.maxSegments)),
      };
      spiralRail.setProgress(spiralPresentation);
    },
    animate: (elapsed) => {
      sunCorona.scale.setScalar(1 + Math.sin(elapsed * 0.32) * 0.025);
      heatSheets.forEach((veil, index) => {
        const phase = elapsed * (0.19 + (index % 3) * 0.025) + Number(veil.userData.phase ?? 0);
        veil.position.y = Number(veil.userData.baseY ?? -12) + Math.sin(phase) * 0.32;
        veil.scale.x = 1 + Math.sin(phase * 1.7) * 0.055;
        (veil.material as THREE.MeshBasicMaterial).opacity = 0.018 + (Math.sin(phase * 1.3) * 0.5 + 0.5) * 0.022;
      });
      // Start on the foreground arc so the source-defining train is visible
      // in deterministic review captures, then keep the world-space journey
      // slow enough to read its detail during ordinary play.
      if (spiralPresentation.completed) {
        const serviceTime = serviceTimeOverride ?? elapsed % 90;
        let servicePhase = 'summit-loops';
        let wheelTravel = 0;
        if (serviceTime < 30) {
          // Three complete public-transport laps serve every summit landmark.
          const railAngle = summitHomeAngle - serviceTime / 30 * Math.PI * 6;
          poseTrainOnSummit(railAngle, true);
          wheelTravel = serviceTime / 30 * Math.PI * 6 * ISLAND_13_SUMMIT_RAIL_RADIUS;
        } else if (serviceTime < 35) {
          servicePhase = 'summit-station-stop';
          // The first three seconds are a slow platform approach to the actual
          // turnout; the final two seconds are a full stop before the points.
          const approachProgress = THREE.MathUtils.smoothstep(serviceTime, 30, 33);
          const railAngle = THREE.MathUtils.lerp(summitHomeAngle, summitSwitchAngle, approachProgress);
          poseTrainOnSummit(railAngle, true);
          wheelTravel = Math.PI * 6 * ISLAND_13_SUMMIT_RAIL_RADIUS
            + approachProgress * -summitHomeDistance;
        } else if (serviceTime < 57) {
          servicePhase = 'descending';
          const progress = (serviceTime - 35) / 22;
          const engineDistance = progress * (ISLAND_13_SPIRAL_ROUTE_LENGTH + consistLength + 0.8);
          poseTrainOnCompositeRoute(engineDistance, 1);
          wheelTravel = Math.PI * 6 * ISLAND_13_SUMMIT_RAIL_RADIUS
            - summitHomeDistance
            + engineDistance;
        } else if (serviceTime < 63) {
          servicePhase = 'canyon-floor-stop';
          const engineDistance = ISLAND_13_SPIRAL_ROUTE_LENGTH + consistLength + 0.8;
          poseTrainOnCompositeRoute(engineDistance, 1);
          wheelTravel = Math.PI * 6 * ISLAND_13_SUMMIT_RAIL_RADIUS
            - summitHomeDistance
            + engineDistance;
        } else if (serviceTime < 85) {
          servicePhase = 'ascending';
          const progress = (serviceTime - 63) / 22;
          const engineDistance = THREE.MathUtils.lerp(
            ISLAND_13_SPIRAL_ROUTE_LENGTH,
            summitHomeDistance,
            progress,
          );
          poseTrainOnCompositeRoute(engineDistance, -1);
          wheelTravel = Math.PI * 6 * ISLAND_13_SUMMIT_RAIL_RADIUS
            - summitHomeDistance
            + ISLAND_13_SPIRAL_ROUTE_LENGTH
            + progress * (ISLAND_13_SPIRAL_ROUTE_LENGTH - summitHomeDistance);
        } else {
          servicePhase = 'summit-arrival-stop';
          poseTrainOnCompositeRoute(summitHomeDistance, -1);
          wheelTravel = Math.PI * 6 * ISLAND_13_SUMMIT_RAIL_RADIUS
            - summitHomeDistance
            + ISLAND_13_SPIRAL_ROUTE_LENGTH * 2
            - summitHomeDistance;
        }
        locomotive.userData.servicePhase = servicePhase;
        locomotive.userData.serviceSchedule = '3 summit loops → turnout stop → rock-cut descent → canyon stop → ascent → summit stop';
        locomotive.userData.routeContinuity = 'summit-ring → switch-blades → natural descent portal → spiral gallery → lower turnaround';
        trainUnits.forEach((unit) => {
          unit.node.userData.servicePhase = servicePhase;
          unit.wheelPivots.forEach((wheelPivot) => {
            wheelPivot.rotation.z = -wheelTravel / 0.16;
          });
        });
        if (locomotiveTrain) {
          locomotiveTrain.userData.servicePhase = servicePhase;
        }
      } else {
        const railAngle = -Math.PI / 2 - elapsed * 0.055;
        poseTrainOnSummit(railAngle, true);
        locomotive.userData.servicePhase = 'summit-loop-before-spiral-completion';
        trainUnits.forEach((unit) => {
          unit.node.userData.servicePhase = 'summit-loop-before-spiral-completion';
          unit.wheelPivots.forEach((wheelPivot) => {
            wheelPivot.rotation.z = -elapsed * 1.8;
          });
        });
      }
      const rotor = scene.getObjectByName('ISLAND_13_WINDMILL_ROTOR');
      if (rotor) rotor.rotation.z = elapsed * 0.42;
      steamPuffs.forEach((puff, index) => {
        const phase = (elapsed * 0.3 + index * 0.22) % 1;
        puff.position.y = 0.98 + phase * 0.84;
        puff.position.x = 0.28 - phase * 0.22;
        puff.scale.setScalar(0.72 + phase * 0.7);
        (puff.material as THREE.MeshBasicMaterial).opacity = 0.3 * (1 - phase);
      });
    },
  };
}
