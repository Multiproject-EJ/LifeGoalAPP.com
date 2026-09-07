import * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';
import {
  ISLAND_3D_ROUTE_RADIUS,
  ISLAND_3D_TILE_RADIAL_DEPTH,
} from './island5ThreePilotContract';

export const ISLAND_19_REPRESENTATIVE_SLICE_NAME = 'Coaster Carnival railway and castle clearance slice';

export const ISLAND_19_REPRESENTATIVE_SLICE_PART_IDS = [
  'p08-coaster-support-foundation',
  'p09-coaster-upper-crest',
  'p10-coaster-lower-circuit',
  'p24-loopmaster-castle-portal',
] as const;

export type Island19RepresentativeSlicePartId = typeof ISLAND_19_REPRESENTATIVE_SLICE_PART_IDS[number];

export interface Island19RepresentativeSliceRuntimePart {
  id: Island19RepresentativeSlicePartId;
  name: Island19RepresentativeSlicePartId;
  kind: 'part';
  nodeName: string;
  module: 'rail-support' | 'upper-track' | 'lower-track' | 'castle-portal';
  triangles: number;
}

export interface Island19RepresentativeSlicePartManifest {
  model: 'island-019-coaster-carnival-representative-slice';
  parts: Island19RepresentativeSliceRuntimePart[];
  unnamedMeshes: number;
  integralMeshes: number;
}

export interface Island19RuntimeManifestValidation {
  valid: boolean;
  missingPartIds: Island19RepresentativeSlicePartId[];
  duplicatePartIds: Island19RepresentativeSlicePartId[];
  unexpectedPartIds: string[];
  missingNodeNames: string[];
  errors: string[];
}

export interface Island19CoasterFrame {
  u: number;
  distance: number;
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  side: THREE.Vector3;
  up: THREE.Vector3;
  bankRadians: number;
}

export interface Island19TrainPose extends Island19CoasterFrame {
  quaternion: THREE.Quaternion;
}

export interface Island19CircuitValidation {
  valid: boolean;
  totalLength: number;
  seamDistance: number;
  seamTangentDot: number;
  minimumSampleSpacing: number;
  errors: string[];
}

export interface Island19PortalClearanceValidation {
  valid: boolean;
  checkedSamples: number;
  minimumSideMargin: number;
  minimumTopMargin: number;
  minimumBottomMargin: number;
  violations: string[];
}

export interface Island19RouteClearanceProbe {
  id: string;
  x: number;
  z: number;
  footprintRadius: number;
}

export interface Island19RouteClearanceValidation {
  valid: boolean;
  checkedProbes: number;
  violations: string[];
}

export interface Island19TrainEnvelopeSample {
  u: number;
  distance: number;
  center: THREE.Vector3;
  side: THREE.Vector3;
  up: THREE.Vector3;
  halfWidth: number;
  heightAboveRail: number;
  depthBelowRail: number;
}

export interface Island19CoasterCarnivalMaterials {
  paintedRedMetal: THREE.MeshPhysicalMaterial;
  ivoryRunningRail: THREE.MeshStandardMaterial;
  antiqueGold: THREE.MeshPhysicalMaterial;
  darkSteel: THREE.MeshStandardMaterial;
  terracottaStone: THREE.MeshStandardMaterial;
  ivoryStone: THREE.MeshStandardMaterial;
  patinatedTeal: THREE.MeshPhysicalMaterial;
  warmWindow: THREE.MeshBasicMaterial;
}

export interface Island19RepresentativeSliceOptions {
  quality?: Island3DQuality;
  castShadow?: boolean;
  receiveShadow?: boolean;
  materials?: Island19CoasterCarnivalMaterials;
}

export interface Island19RepresentativeSliceRuntime {
  root: THREE.Group;
  circuit: Island19CoasterCircuit;
  materials: Island19CoasterCarnivalMaterials;
  manifest: Island19RepresentativeSlicePartManifest;
  diagnostics: {
    closedCircuit: Island19CircuitValidation;
    portalClearance: Island19PortalClearanceValidation;
    routeClearance: Island19RouteClearanceValidation;
    runtimeManifest: Island19RuntimeManifestValidation;
  };
  getTrainPose: (elapsedSeconds: number, speedWorldUnitsPerSecond?: number, distanceOffset?: number) => Island19TrainPose;
}

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const FRAME_EPSILON_U = 1 / 2048;
const TRACK_RAIL_HALF_SPAN = 0.34;
const TRACK_INNER_RAIL_HALF_SPAN = 0.225;
const TRACK_RAIL_RADIUS = 0.072;
const TRACK_INNER_RAIL_RADIUS = 0.038;
const TRACK_TIE_DROP = 0.11;

export const ISLAND_19_TRAIN_SWEPT_ENVELOPE = {
  halfWidth: 0.48,
  heightAboveRail: 0.7,
  depthBelowRail: 0.25,
  longitudinalHalfLength: 0.72,
} as const;

/**
 * p24 is built from these solids. The stated rectangle is deliberately more
 * conservative than the visible masonry opening because the front and rear
 * arch trims narrow the upper corners of the throughpass.
 */
export const ISLAND_19_CASTLE_PORTAL = {
  centerX: 0,
  centerZ: 0,
  masonryInnerHalfWidth: 0.99,
  clearHalfWidth: 0.84,
  clearBottomY: 0.2,
  clearTopY: 1.95,
  halfDepth: 1.18,
  lintelBottomY: 2.08,
  outerHalfWidth: 1.38,
  routeWindowUStart: 0.035,
  routeWindowUEnd: 0.175,
} as const;

export const ISLAND_19_ROUTE_CLEARANCE_INNER_RADIUS = (
  ISLAND_3D_ROUTE_RADIUS - ISLAND_3D_TILE_RADIAL_DEPTH / 2 - 0.25
);

export const ISLAND_19_ROUTE_CLEARANCE_OUTER_RADIUS = (
  ISLAND_3D_ROUTE_RADIUS + ISLAND_3D_TILE_RADIAL_DEPTH / 2 + 0.25
);

const wrapUnit = (value: number) => THREE.MathUtils.euclideanModulo(value, 1);

const qualitySegments = (quality: Island3DQuality) => (
  quality === 'high' ? 256 : quality === 'medium' ? 168 : 104
);

const radialSegments = (quality: Island3DQuality) => (
  quality === 'high' ? 8 : quality === 'medium' ? 7 : 6
);

const createDefaultCircuitPoints = () => [
  // Low front approach: p10 stays visually separate from the high crest and
  // enters the p24 throughpass on a deliberately straight depth tangent.
  new THREE.Vector3(0, 0.88, -2.8),
  new THREE.Vector3(0, 0.9, -1.5),
  new THREE.Vector3(0, 0.94, 0),
  new THREE.Vector3(0, 1.0, 2.05),
  // p09 starts at the source's left load-bearing foot instead of beginning a
  // centered oval. Its lift stays steep and left-loaded through the crest.
  new THREE.Vector3(-2.95, 1.35, 2.65),
  new THREE.Vector3(-3.15, 4.5, 1.65),
  new THREE.Vector3(-2.95, 7.4, 0.7),
  new THREE.Vector3(-2.25, 8.85, 0.1),
  new THREE.Vector3(-1.15, 9.3, -0.35),
  // The rounded crown falls inward first, then opens into the long, broad
  // right-hand descent visible over the castle in the immutable source.
  new THREE.Vector3(-0.25, 8.25, -0.15),
  new THREE.Vector3(-0.15, 5.55, 0.15),
  new THREE.Vector3(1.35, 3.65, 0.4),
  new THREE.Vector3(3.15, 2.1, 1.4),
  // p10 returns as a broad, low foreground circuit around the portal mass.
  // Its last point eases toward the straight throughpass without stealing the
  // source-defining silhouette from p09's established right-hand descent.
  new THREE.Vector3(3.65, 1.05, 3.15),
  new THREE.Vector3(2.45, 0.8, 3.75),
  new THREE.Vector3(0.18, 0.74, -4.05),
];

/**
 * One closed, centripetal Catmull-Rom centerline owns all coaster consumers.
 * Geometry may be grouped into p09/p10 at two seamless hand-off parameters,
 * but no consumer receives a separately-authored replacement path.
 */
export class Island19CoasterCircuit {
  readonly curve: THREE.CatmullRomCurve3;
  readonly totalLength: number;
  readonly arcLengths: readonly number[];
  readonly frameDivisions: number;

  constructor(points = createDefaultCircuitPoints(), frameDivisions = 768) {
    this.curve = new THREE.CatmullRomCurve3(
      points.map((point) => point.clone()),
      true,
      'centripetal',
      0.5,
    );
    this.curve.arcLengthDivisions = Math.max(512, frameDivisions * 2);
    this.curve.updateArcLengths();
    this.totalLength = this.curve.getLength();
    this.arcLengths = [...this.curve.getLengths(this.curve.arcLengthDivisions)];
    this.frameDivisions = Math.max(128, Math.floor(frameDivisions));
  }

  distanceToU(distance: number) {
    if (!Number.isFinite(distance) || this.totalLength <= 0) return 0;
    return wrapUnit(distance / this.totalLength);
  }

  uToDistance(u: number) {
    return wrapUnit(u) * this.totalLength;
  }

  getPointAtU(u: number, target = new THREE.Vector3()) {
    return this.curve.getPointAt(wrapUnit(u), target);
  }

  getPointAtDistance(distance: number, target = new THREE.Vector3()) {
    return this.getPointAtU(this.distanceToU(distance), target);
  }

  getTangentAtU(u: number, target = new THREE.Vector3()) {
    return this.curve.getTangentAt(wrapUnit(u), target).normalize();
  }

  getTangentAtDistance(distance: number, target = new THREE.Vector3()) {
    return this.getTangentAtU(this.distanceToU(distance), target);
  }

  getFrameAtU(u: number): Island19CoasterFrame {
    const resolvedU = wrapUnit(u);
    const position = this.getPointAtU(resolvedU);
    const tangent = this.getTangentAtU(resolvedU);
    const side = tangent.clone().cross(WORLD_UP);
    if (side.lengthSq() < 0.00001) {
      const fallback = Math.abs(tangent.x) < 0.8
        ? new THREE.Vector3(1, 0, 0)
        : new THREE.Vector3(0, 0, 1);
      side.copy(tangent).cross(fallback);
    }
    side.normalize();
    const up = side.clone().cross(tangent).normalize();
    const tangentBefore = this.getTangentAtU(resolvedU - FRAME_EPSILON_U);
    const tangentAfter = this.getTangentAtU(resolvedU + FRAME_EPSILON_U);
    const signedTurn = tangentBefore.clone().cross(tangentAfter).dot(WORLD_UP);
    const bankRadians = THREE.MathUtils.clamp(-signedTurn * 6.5, -0.24, 0.24);
    if (Math.abs(bankRadians) > 0.00001) {
      const bank = new THREE.Quaternion().setFromAxisAngle(tangent, bankRadians);
      side.applyQuaternion(bank).normalize();
      up.applyQuaternion(bank).normalize();
    }
    return {
      u: resolvedU,
      distance: resolvedU * this.totalLength,
      position,
      tangent,
      side,
      up,
      bankRadians,
    };
  }

  getFrameAtDistance(distance: number) {
    return this.getFrameAtU(this.distanceToU(distance));
  }
}

class Island19OffsetCircuitSection extends THREE.Curve<THREE.Vector3> {
  constructor(
    readonly circuit: Island19CoasterCircuit,
    readonly startU: number,
    readonly endU: number,
    readonly lateralOffset: number,
    readonly verticalOffset = 0,
  ) {
    super();
  }

  getGlobalU(localT: number) {
    return wrapUnit(THREE.MathUtils.lerp(this.startU, this.endU, THREE.MathUtils.clamp(localT, 0, 1)));
  }

  getPoint(localT: number, target = new THREE.Vector3()) {
    const frame = this.circuit.getFrameAtU(this.getGlobalU(localT));
    return target.copy(frame.position)
      .addScaledVector(frame.side, this.lateralOffset)
      .addScaledVector(frame.up, this.verticalOffset);
  }
}

export function createIsland19CoasterCarnivalMaterials(): Island19CoasterCarnivalMaterials {
  return {
    paintedRedMetal: new THREE.MeshPhysicalMaterial({
      color: 0xb32f23,
      roughness: 0.29,
      metalness: 0.74,
      clearcoat: 0.32,
      clearcoatRoughness: 0.2,
    }),
    ivoryRunningRail: new THREE.MeshStandardMaterial({
      color: 0xf1d8b1,
      roughness: 0.42,
      metalness: 0.48,
    }),
    antiqueGold: new THREE.MeshPhysicalMaterial({
      color: 0xb77a2e,
      roughness: 0.36,
      metalness: 0.78,
      clearcoat: 0.18,
      clearcoatRoughness: 0.28,
    }),
    darkSteel: new THREE.MeshStandardMaterial({
      color: 0x281c20,
      roughness: 0.34,
      metalness: 0.86,
    }),
    terracottaStone: new THREE.MeshStandardMaterial({
      color: 0xa95337,
      roughness: 0.68,
      metalness: 0.02,
    }),
    ivoryStone: new THREE.MeshStandardMaterial({
      color: 0xe2cda7,
      roughness: 0.63,
      metalness: 0.03,
    }),
    patinatedTeal: new THREE.MeshPhysicalMaterial({
      color: 0x2d807e,
      roughness: 0.45,
      metalness: 0.6,
      clearcoat: 0.14,
      clearcoatRoughness: 0.32,
    }),
    warmWindow: new THREE.MeshBasicMaterial({ color: 0xffc76d, toneMapped: false }),
  };
}

export function isIsland19CanonicalRouteCorridorClear(
  x: number,
  z: number,
  footprintRadius = 0,
) {
  const radius = Math.hypot(x, z);
  const footprint = Math.max(0, footprintRadius);
  return radius + footprint <= ISLAND_19_ROUTE_CLEARANCE_INNER_RADIUS
    || radius - footprint >= ISLAND_19_ROUTE_CLEARANCE_OUTER_RADIUS;
}

export function validateIsland19CanonicalRouteClearance(
  probes: readonly Island19RouteClearanceProbe[],
): Island19RouteClearanceValidation {
  const violations = probes
    .filter((probe) => !isIsland19CanonicalRouteCorridorClear(
      probe.x,
      probe.z,
      probe.footprintRadius,
    ))
    .map((probe) => probe.id);
  return {
    valid: violations.length === 0,
    checkedProbes: probes.length,
    violations,
  };
}

export function validateIsland19ClosedCircuit(
  circuit: Island19CoasterCircuit,
  tolerance = 0.035,
): Island19CircuitValidation {
  const start = circuit.curve.getPointAt(0);
  const end = circuit.curve.getPointAt(1);
  const startTangent = circuit.curve.getTangentAt(0).normalize();
  const endTangent = circuit.curve.getTangentAt(1).normalize();
  const seamDistance = start.distanceTo(end);
  const seamTangentDot = startTangent.dot(endTangent);
  let minimumSampleSpacing = Number.POSITIVE_INFINITY;
  let previous = circuit.curve.getPointAt(0);
  for (let index = 1; index <= 512; index += 1) {
    const next = circuit.curve.getPointAt(index / 512);
    minimumSampleSpacing = Math.min(minimumSampleSpacing, previous.distanceTo(next));
    previous = next;
  }
  const errors: string[] = [];
  if (!circuit.curve.closed) errors.push('centerline is not declared closed');
  if (!Number.isFinite(circuit.totalLength) || circuit.totalLength <= 10) errors.push('circuit length is invalid');
  if (seamDistance > tolerance) errors.push(`seam distance ${seamDistance.toFixed(5)} exceeds ${tolerance}`);
  if (seamTangentDot < 0.995) errors.push(`seam tangent dot ${seamTangentDot.toFixed(5)} is below 0.995`);
  if (!Number.isFinite(minimumSampleSpacing) || minimumSampleSpacing <= 0.0001) errors.push('circuit contains a collapsed sampled span');
  return {
    valid: errors.length === 0,
    totalLength: circuit.totalLength,
    seamDistance,
    seamTangentDot,
    minimumSampleSpacing,
    errors,
  };
}

export function sampleIsland19TrainSweptEnvelope(
  circuit: Island19CoasterCircuit,
  sampleCount = 320,
): Island19TrainEnvelopeSample[] {
  const count = Math.max(32, Math.floor(sampleCount));
  return Array.from({ length: count }, (_, index) => {
    const frame = circuit.getFrameAtU(index / count);
    return {
      u: frame.u,
      distance: frame.distance,
      center: frame.position,
      side: frame.side,
      up: frame.up,
      halfWidth: ISLAND_19_TRAIN_SWEPT_ENVELOPE.halfWidth,
      heightAboveRail: ISLAND_19_TRAIN_SWEPT_ENVELOPE.heightAboveRail,
      depthBelowRail: ISLAND_19_TRAIN_SWEPT_ENVELOPE.depthBelowRail,
    };
  });
}

export function validateIsland19CastlePortalClearance(
  circuit: Island19CoasterCircuit,
  sampleCount = 96,
): Island19PortalClearanceValidation {
  const count = Math.max(24, Math.floor(sampleCount));
  let minimumSideMargin = Number.POSITIVE_INFINITY;
  let minimumTopMargin = Number.POSITIVE_INFINITY;
  let minimumBottomMargin = Number.POSITIVE_INFINITY;
  const violations: string[] = [];
  for (let index = 0; index <= count; index += 1) {
    const local = index / count;
    const u = THREE.MathUtils.lerp(
      ISLAND_19_CASTLE_PORTAL.routeWindowUStart,
      ISLAND_19_CASTLE_PORTAL.routeWindowUEnd,
      local,
    );
    const frame = circuit.getFrameAtU(u);
    if (Math.abs(frame.position.z - ISLAND_19_CASTLE_PORTAL.centerZ) > ISLAND_19_CASTLE_PORTAL.halfDepth) continue;
    const horizontalSideReach = (
      Math.abs(frame.side.x) * ISLAND_19_TRAIN_SWEPT_ENVELOPE.halfWidth
      + Math.abs(frame.tangent.x) * ISLAND_19_TRAIN_SWEPT_ENVELOPE.longitudinalHalfLength
    );
    const sideMargin = ISLAND_19_CASTLE_PORTAL.clearHalfWidth
      - Math.abs(frame.position.x - ISLAND_19_CASTLE_PORTAL.centerX)
      - horizontalSideReach;
    const topMargin = ISLAND_19_CASTLE_PORTAL.clearTopY
      - frame.position.y
      - ISLAND_19_TRAIN_SWEPT_ENVELOPE.heightAboveRail;
    const bottomMargin = frame.position.y
      - ISLAND_19_TRAIN_SWEPT_ENVELOPE.depthBelowRail
      - ISLAND_19_CASTLE_PORTAL.clearBottomY;
    minimumSideMargin = Math.min(minimumSideMargin, sideMargin);
    minimumTopMargin = Math.min(minimumTopMargin, topMargin);
    minimumBottomMargin = Math.min(minimumBottomMargin, bottomMargin);
    if (sideMargin < 0 || topMargin < 0 || bottomMargin < 0) {
      violations.push(
        `u=${u.toFixed(4)} side=${sideMargin.toFixed(3)} top=${topMargin.toFixed(3)} bottom=${bottomMargin.toFixed(3)}`,
      );
    }
  }
  if (!Number.isFinite(minimumSideMargin)) {
    violations.push('no route samples crossed the authored portal depth');
  }
  return {
    valid: violations.length === 0,
    checkedSamples: count + 1,
    minimumSideMargin,
    minimumTopMargin,
    minimumBottomMargin,
    violations,
  };
}

export function resolveIsland19TrainPoseAtElapsed(
  circuit: Island19CoasterCircuit,
  elapsedSeconds: number,
  speedWorldUnitsPerSecond = 1.18,
  distanceOffset = 0,
): Island19TrainPose {
  const elapsed = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
  const speed = Number.isFinite(speedWorldUnitsPerSecond) ? Math.max(0, speedWorldUnitsPerSecond) : 0;
  const frame = circuit.getFrameAtDistance(elapsed * speed + distanceOffset);
  const basis = new THREE.Matrix4().makeBasis(frame.side, frame.up, frame.tangent);
  return {
    ...frame,
    quaternion: new THREE.Quaternion().setFromRotationMatrix(basis).normalize(),
  };
}

function countTriangles(root: THREE.Object3D) {
  let triangles = 0;
  const visit = (node: THREE.Object3D, isRoot: boolean) => {
    if (!isRoot && node.userData.partKind === 'part') return;
    if (node instanceof THREE.Mesh || node instanceof THREE.InstancedMesh) {
      const geometry = node.geometry;
      const triangleCount = geometry.index
        ? geometry.index.count / 3
        : (geometry.getAttribute('position')?.count ?? 0) / 3;
      triangles += triangleCount * (node instanceof THREE.InstancedMesh ? node.count : 1);
    }
    node.children.forEach((child) => visit(child, false));
  };
  visit(root, true);
  return Math.round(triangles);
}

function registerRuntimePart(
  id: Island19RepresentativeSlicePartId,
  node: THREE.Object3D,
  module: Island19RepresentativeSliceRuntimePart['module'],
): Island19RepresentativeSliceRuntimePart {
  node.userData.partId = id;
  node.userData.partKind = 'part';
  node.userData.partModule = module;
  return {
    id,
    name: id,
    kind: 'part',
    nodeName: node.name,
    module,
    triangles: countTriangles(node),
  };
}

export function collectIsland19RepresentativeSliceRuntimePartManifest(
  roots: readonly THREE.Object3D[],
): Island19RepresentativeSlicePartManifest {
  const parts: Island19RepresentativeSliceRuntimePart[] = [];
  const seenRecords = new Set<string>();
  let integralMeshes = 0;
  let unnamedMeshes = 0;
  roots.forEach((root) => root.traverse((node) => {
    if (node instanceof THREE.Mesh || node instanceof THREE.InstancedMesh || node instanceof THREE.LineSegments) {
      integralMeshes += 1;
      if (!node.name) unnamedMeshes += 1;
    }
    const runtimeParts = node.userData.sculptRuntime?.parts;
    if (!Array.isArray(runtimeParts)) return;
    runtimeParts.forEach((candidate: Island19RepresentativeSliceRuntimePart) => {
      if (!candidate?.name) return;
      const key = `${candidate.name}:${candidate.nodeName}`;
      if (seenRecords.has(key)) return;
      seenRecords.add(key);
      parts.push({ ...candidate });
    });
  }));
  return {
    model: 'island-019-coaster-carnival-representative-slice',
    parts,
    unnamedMeshes,
    integralMeshes,
  };
}

export function validateIsland19RepresentativeSliceRuntimePartManifest(
  manifest: Island19RepresentativeSlicePartManifest,
  availableNodeNames: readonly string[] = [],
): Island19RuntimeManifestValidation {
  const expected = new Set<string>(ISLAND_19_REPRESENTATIVE_SLICE_PART_IDS);
  const seen = new Map<string, number>();
  manifest.parts.forEach((part) => seen.set(part.id, (seen.get(part.id) ?? 0) + 1));
  const missingPartIds = ISLAND_19_REPRESENTATIVE_SLICE_PART_IDS
    .filter((id) => !seen.has(id));
  const duplicatePartIds = ISLAND_19_REPRESENTATIVE_SLICE_PART_IDS
    .filter((id) => (seen.get(id) ?? 0) > 1);
  const unexpectedPartIds = [...seen.keys()].filter((id) => !expected.has(id));
  const nodeNames = new Set(availableNodeNames);
  const missingNodeNames = nodeNames.size === 0
    ? []
    : manifest.parts.filter((part) => !nodeNames.has(part.nodeName)).map((part) => part.nodeName);
  const errors: string[] = [];
  if (manifest.model !== 'island-019-coaster-carnival-representative-slice') errors.push('unexpected model id');
  if (manifest.unnamedMeshes > 0) errors.push(`${manifest.unnamedMeshes} integral meshes are unnamed`);
  if (missingPartIds.length) errors.push(`missing parts: ${missingPartIds.join(', ')}`);
  if (duplicatePartIds.length) errors.push(`duplicate parts: ${duplicatePartIds.join(', ')}`);
  if (unexpectedPartIds.length) errors.push(`unexpected parts: ${unexpectedPartIds.join(', ')}`);
  if (missingNodeNames.length) errors.push(`missing nodes: ${missingNodeNames.join(', ')}`);
  if (manifest.parts.some((part) => part.triangles <= 0)) errors.push('one or more runtime parts contain no triangles');
  return {
    valid: errors.length === 0,
    missingPartIds,
    duplicatePartIds,
    unexpectedPartIds,
    missingNodeNames,
    errors,
  };
}

function createMemberBetween(
  name: string,
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  segments: number,
) {
  const delta = end.clone().sub(start);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.78, radius, delta.length(), segments, 1, false),
    material,
  );
  mesh.name = name;
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function markPartGeometry(root: THREE.Object3D, ownerId: Island19RepresentativeSlicePartId) {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh || node instanceof THREE.InstancedMesh || node instanceof THREE.LineSegments)) return;
    node.userData.partOwnerId = ownerId;
    node.userData.explodeWithParent = true;
  });
}

function routeSafeFooting(x: number, z: number, footprintRadius: number) {
  if (isIsland19CanonicalRouteCorridorClear(x, z, footprintRadius)) return new THREE.Vector2(x, z);
  const radius = Math.max(0.001, Math.hypot(x, z));
  const safeRadius = ISLAND_19_ROUTE_CLEARANCE_INNER_RADIUS - footprintRadius - 0.12;
  return new THREE.Vector2(x / radius * safeRadius, z / radius * safeRadius);
}

function createSupportNetwork(
  circuit: Island19CoasterCircuit,
  quality: Island3DQuality,
  materials: Island19CoasterCarnivalMaterials,
) {
  const root = new THREE.Group();
  root.name = 'ISLAND_19_P08_COASTER_SUPPORT_FOUNDATION_PIVOT';
  const segments = radialSegments(quality);
  const supportUs = quality === 'high'
    ? [0.255, 0.315, 0.375, 0.435, 0.495, 0.555, 0.615, 0.675, 0.735, 0.79, 0.875]
    : quality === 'medium'
      ? [0.27, 0.35, 0.43, 0.51, 0.59, 0.67, 0.75, 0.86]
      : [0.29, 0.41, 0.53, 0.65, 0.77, 0.88];
  const probes: Island19RouteClearanceProbe[] = [];
  const bearingSockets: Record<string, string> = {};
  supportUs.forEach((u, supportIndex) => {
    const frame = circuit.getFrameAtU(u);
    const pairTargets = [-1, 1].map((sideSign) => frame.position.clone()
      .addScaledVector(frame.side, sideSign * TRACK_RAIL_HALF_SPAN)
      .addScaledVector(frame.up, -0.16));
    const footings = pairTargets.map((target, sideIndex) => {
      const safe = routeSafeFooting(target.x, target.z, 0.17);
      const footing = new THREE.Vector3(safe.x, 0.1, safe.y);
      const id = `p08-footing-${String(supportIndex + 1).padStart(2, '0')}-${sideIndex === 0 ? 'left' : 'right'}`;
      probes.push({ id, x: footing.x, z: footing.z, footprintRadius: 0.17 });
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.17, 0.22, 0.2, segments, 1),
        materials.antiqueGold,
      );
      pad.name = `ISLAND_19_P08_FOOTING_${String(supportIndex + 1).padStart(2, '0')}_${sideIndex + 1}`;
      pad.position.copy(footing);
      pad.position.y = 0.1;
      root.add(pad);
      return footing;
    });
    pairTargets.forEach((target, sideIndex) => {
      root.add(createMemberBetween(
        `ISLAND_19_P08_GOLD_COLUMN_${String(supportIndex + 1).padStart(2, '0')}_${sideIndex + 1}`,
        footings[sideIndex],
        target,
        frame.position.y > 6 ? 0.085 : 0.072,
        materials.antiqueGold,
        segments,
      ));
      const socket = new THREE.Object3D();
      socket.name = `ISLAND_19_P08_${u < 0.75 ? 'CREST' : 'LOWER'}_BEARING_SOCKET_${String(supportIndex + 1).padStart(2, '0')}_${sideIndex + 1}`;
      socket.position.copy(target);
      socket.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(frame.side, frame.up, frame.tangent));
      root.add(socket);
      bearingSockets[`bearing-${supportIndex + 1}-${sideIndex + 1}`] = socket.name;
      const bearing = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.12, 0.3), materials.darkSteel);
      bearing.name = `ISLAND_19_P08_BEARING_SEAT_${String(supportIndex + 1).padStart(2, '0')}_${sideIndex + 1}`;
      bearing.position.copy(target);
      bearing.quaternion.copy(socket.quaternion);
      root.add(bearing);
    });
    if (frame.position.y > 2.1) {
      root.add(
        createMemberBetween(
          `ISLAND_19_P08_RED_CROSS_BRACE_${String(supportIndex + 1).padStart(2, '0')}_A`,
          footings[0],
          pairTargets[1],
          0.035,
          materials.paintedRedMetal,
          6,
        ),
        createMemberBetween(
          `ISLAND_19_P08_RED_CROSS_BRACE_${String(supportIndex + 1).padStart(2, '0')}_B`,
          footings[1],
          pairTargets[0],
          0.035,
          materials.paintedRedMetal,
          6,
        ),
      );
    }
  });

  const terrainSocket = new THREE.Object3D();
  terrainSocket.name = 'ISLAND_19_P08_TERRAIN_CONTACT_SOCKET';
  terrainSocket.position.y = 0.08;
  const crestSocket = new THREE.Object3D();
  crestSocket.name = 'ISLAND_19_P08_UPPER_TRACK_SPINE_SOCKET';
  crestSocket.position.copy(circuit.getPointAtU(0.49));
  const lowerSocket = new THREE.Object3D();
  lowerSocket.name = 'ISLAND_19_P08_LOWER_TRACK_SPINE_SOCKET';
  lowerSocket.position.copy(circuit.getPointAtU(0.88));
  root.add(terrainSocket, crestSocket, lowerSocket);
  root.userData.routeClearanceProbes = probes;
  root.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    qualityTier: quality,
    sockets: {
      terrainContact: terrainSocket.name,
      upperTrackSpine: crestSocket.name,
      lowerTrackSpine: lowerSocket.name,
      ...bearingSockets,
    },
    colliders: probes.map((probe) => ({
      id: `island-019-${probe.id}`,
      type: 'cylinder',
      isTrigger: false,
      radius: probe.footprintRadius,
      center: [probe.x, 0.6, probe.z],
    })),
    attachment: {
      parentId: 'root',
      parentSocket: 'terrain-top',
      localStart: [0, 0, 0],
      localEnd: [0, 0.08, 0],
      contactType: 'embedded',
      embedDepth: 0.08,
      gapTolerance: 0.01,
    },
  };
  markPartGeometry(root, 'p08-coaster-support-foundation');
  return { root, probes };
}

function createTrackSection(
  partId: 'p09-coaster-upper-crest' | 'p10-coaster-lower-circuit',
  circuit: Island19CoasterCircuit,
  startU: number,
  endU: number,
  quality: Island3DQuality,
  materials: Island19CoasterCarnivalMaterials,
) {
  const root = new THREE.Group();
  const isUpper = partId === 'p09-coaster-upper-crest';
  root.name = isUpper
    ? 'ISLAND_19_P09_UPPER_COASTER_CREST_PIVOT'
    : 'ISLAND_19_P10_LOWER_CONTINUOUS_CIRCUIT_PIVOT';
  const tubularSegments = Math.max(48, Math.round(qualitySegments(quality) * (endU - startU)));
  const tubeRadialSegments = radialSegments(quality);
  const railSpecs = [
    { offset: -TRACK_RAIL_HALF_SPAN, radius: TRACK_RAIL_RADIUS, material: materials.paintedRedMetal, label: 'RED_OUTER_LEFT' },
    { offset: TRACK_RAIL_HALF_SPAN, radius: TRACK_RAIL_RADIUS, material: materials.paintedRedMetal, label: 'RED_OUTER_RIGHT' },
    { offset: -TRACK_INNER_RAIL_HALF_SPAN, radius: TRACK_INNER_RAIL_RADIUS, material: materials.ivoryRunningRail, label: 'PALE_INNER_LEFT' },
    { offset: TRACK_INNER_RAIL_HALF_SPAN, radius: TRACK_INNER_RAIL_RADIUS, material: materials.ivoryRunningRail, label: 'PALE_INNER_RIGHT' },
  ] as const;
  railSpecs.forEach((spec) => {
    const section = new Island19OffsetCircuitSection(circuit, startU, endU, spec.offset);
    const rail = new THREE.Mesh(
      new THREE.TubeGeometry(section, tubularSegments, spec.radius, tubeRadialSegments, false),
      spec.material,
    );
    rail.name = `ISLAND_19_${isUpper ? 'P09' : 'P10'}_${spec.label}_RUNNER`;
    rail.castShadow = true;
    rail.receiveShadow = true;
    root.add(rail);
  });

  const sectionLength = circuit.totalLength * (endU - startU);
  const tieSpacing = quality === 'high' ? 0.31 : quality === 'medium' ? 0.4 : 0.52;
  const tieCount = Math.max(14, Math.floor(sectionLength / tieSpacing));
  const ties = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.84, 0.055, 0.13),
    materials.ivoryRunningRail,
    tieCount,
  );
  ties.name = `ISLAND_19_${isUpper ? 'P09' : 'P10'}_PALE_CROSS_TIE_ARRAY`;
  const matrix = new THREE.Matrix4();
  const basis = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  for (let index = 0; index < tieCount; index += 1) {
    const localT = (index + 0.5) / tieCount;
    const u = wrapUnit(THREE.MathUtils.lerp(startU, endU, localT));
    const frame = circuit.getFrameAtU(u);
    basis.makeBasis(frame.side, frame.up, frame.tangent);
    quaternion.setFromRotationMatrix(basis);
    const position = frame.position.clone().addScaledVector(frame.up, -TRACK_TIE_DROP);
    matrix.compose(position, quaternion, scale);
    ties.setMatrixAt(index, matrix);
  }
  ties.instanceMatrix.needsUpdate = true;
  ties.castShadow = true;
  ties.receiveShadow = true;
  root.add(ties);

  const startSocket = new THREE.Object3D();
  startSocket.name = `ISLAND_19_${isUpper ? 'P09' : 'P10'}_START_TANGENT_SOCKET`;
  const endSocket = new THREE.Object3D();
  endSocket.name = `ISLAND_19_${isUpper ? 'P09' : 'P10'}_END_TANGENT_SOCKET`;
  [
    { socket: startSocket, u: startU },
    { socket: endSocket, u: endU },
  ].forEach(({ socket, u }) => {
    const frame = circuit.getFrameAtU(u);
    socket.position.copy(frame.position);
    socket.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(frame.side, frame.up, frame.tangent));
    root.add(socket);
  });
  const routeSocket = new THREE.Object3D();
  routeSocket.name = `ISLAND_19_${isUpper ? 'P09_TRAIN_PATH' : 'P10_CASTLE_PORTAL'}_SOCKET`;
  routeSocket.position.copy(circuit.getPointAtU(isUpper ? 0.49 : 0.105));
  root.add(routeSocket);
  root.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    qualityTier: quality,
    sockets: {
      startTangent: startSocket.name,
      endTangent: endSocket.name,
      trainPath: routeSocket.name,
    },
    colliders: [{
      id: `island-019-${partId}-curve-envelope`,
      type: 'curve-envelope',
      isTrigger: false,
      pathOwner: 'island19-coaster-circuit',
      halfWidth: TRACK_RAIL_HALF_SPAN + TRACK_RAIL_RADIUS,
    }],
    attachment: {
      parentId: 'p08-coaster-support-foundation',
      parentSocket: isUpper ? 'upper-track-spine' : 'lower-track-spine',
      localStart: circuit.getPointAtU(startU).toArray(),
      localEnd: circuit.getPointAtU(endU).toArray(),
      contactType: 'bolted',
      overlap: 0.035,
      gapTolerance: 0.01,
    },
  };
  markPartGeometry(root, partId);
  return root;
}

function createCastlePortal(
  quality: Island3DQuality,
  materials: Island19CoasterCarnivalMaterials,
) {
  const root = new THREE.Group();
  root.name = 'ISLAND_19_P24_LOOPMASTER_CASTLE_PORTAL_PIVOT';
  const jambWidth = ISLAND_19_CASTLE_PORTAL.outerHalfWidth - ISLAND_19_CASTLE_PORTAL.masonryInnerHalfWidth;
  const jambCenterX = ISLAND_19_CASTLE_PORTAL.masonryInnerHalfWidth + jambWidth / 2;
  const portalDepth = ISLAND_19_CASTLE_PORTAL.halfDepth * 2;
  [-1, 1].forEach((side) => {
    const jamb = new THREE.Mesh(
      new THREE.BoxGeometry(jambWidth, ISLAND_19_CASTLE_PORTAL.lintelBottomY, portalDepth),
      materials.terracottaStone,
    );
    jamb.name = `ISLAND_19_P24_${side < 0 ? 'LEFT' : 'RIGHT'}_LOAD_BEARING_JAMB`;
    jamb.position.set(side * jambCenterX, ISLAND_19_CASTLE_PORTAL.lintelBottomY / 2, 0);
    root.add(jamb);

    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.39, 2.55, quality === 'high' ? 14 : quality === 'medium' ? 12 : 9),
      materials.ivoryStone,
    );
    tower.name = `ISLAND_19_P24_${side < 0 ? 'LEFT' : 'RIGHT'}_PORTAL_TOWER_SOLID`;
    tower.position.set(side * 1.22, 1.275, 0);
    root.add(tower);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 0.78, quality === 'high' ? 14 : quality === 'medium' ? 12 : 9),
      materials.patinatedTeal,
    );
    roof.name = `ISLAND_19_P24_${side < 0 ? 'LEFT' : 'RIGHT'}_TEAL_TOWER_ROOF`;
    roof.position.set(side * 1.22, 2.92, 0);
    root.add(roof);

    [-1, 1].forEach((face) => {
      const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 0.12), materials.antiqueGold);
      pilaster.name = `ISLAND_19_P24_${side < 0 ? 'LEFT' : 'RIGHT'}_${face < 0 ? 'FRONT' : 'REAR'}_GOLD_PILASTER`;
      pilaster.position.set(
        side * (ISLAND_19_CASTLE_PORTAL.masonryInnerHalfWidth + 0.08),
        1.05,
        face * (ISLAND_19_CASTLE_PORTAL.halfDepth - 0.06),
      );
      root.add(pilaster);
      const window = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 7), materials.warmWindow);
      window.name = `ISLAND_19_P24_${side < 0 ? 'LEFT' : 'RIGHT'}_${face < 0 ? 'FRONT' : 'REAR'}_WARM_WINDOW`;
      window.scale.set(0.72, 1.22, 0.45);
      window.position.set(side * 1.22, 1.48, face * (ISLAND_19_CASTLE_PORTAL.halfDepth + 0.015));
      root.add(window);
    });
  });

  const lintelHeight = 0.58;
  const lintel = new THREE.Mesh(
    new THREE.BoxGeometry(ISLAND_19_CASTLE_PORTAL.outerHalfWidth * 2, lintelHeight, portalDepth),
    materials.terracottaStone,
  );
  lintel.name = 'ISLAND_19_P24_LOAD_BEARING_LINTEL_SOLID';
  lintel.position.y = ISLAND_19_CASTLE_PORTAL.lintelBottomY + lintelHeight / 2;
  root.add(lintel);

  [-1, 1].forEach((face) => {
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(0.9, 0.11, 8, quality === 'high' ? 32 : quality === 'medium' ? 24 : 18, Math.PI),
      materials.antiqueGold,
    );
    arch.name = `ISLAND_19_P24_${face < 0 ? 'FRONT' : 'REAR'}_OPEN_ARCH_TRIM`;
    arch.position.set(0, 1.38, face * (ISLAND_19_CASTLE_PORTAL.halfDepth + 0.02));
    root.add(arch);

    const upperBand = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.12, 0.11), materials.ivoryStone);
    upperBand.name = `ISLAND_19_P24_${face < 0 ? 'FRONT' : 'REAR'}_LINTEL_CORNICE`;
    upperBand.position.set(0, 2.18, face * (ISLAND_19_CASTLE_PORTAL.halfDepth + 0.04));
    root.add(upperBand);
  });

  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), materials.antiqueGold);
  star.name = 'ISLAND_19_P24_FRONT_STAR_MEDALLION';
  star.scale.set(1, 1, 0.34);
  star.position.set(0, 2.43, -ISLAND_19_CASTLE_PORTAL.halfDepth - 0.07);
  star.rotation.z = Math.PI / 4;
  root.add(star);
  const rearKeystone = star.clone();
  rearKeystone.name = 'ISLAND_19_P24_REAR_STAR_MEDALLION';
  rearKeystone.position.z *= -1;
  root.add(rearKeystone);

  const clearanceSocket = new THREE.Object3D();
  clearanceSocket.name = 'ISLAND_19_P24_PHYSICALLY_OPEN_THROUGHPASS_SOCKET';
  clearanceSocket.position.set(0, 0.94, 0);
  clearanceSocket.userData.clearance = {
    axis: 'local-z',
    width: ISLAND_19_CASTLE_PORTAL.clearHalfWidth * 2,
    height: ISLAND_19_CASTLE_PORTAL.clearTopY - ISLAND_19_CASTLE_PORTAL.clearBottomY,
    depth: portalDepth,
  };
  const castleBodySocket = new THREE.Object3D();
  castleBodySocket.name = 'ISLAND_19_P24_CASTLE_BODY_FOUNDATION_SOCKET';
  castleBodySocket.position.set(0, 2.66, 0);
  const constructionSocketLeft = new THREE.Object3D();
  constructionSocketLeft.name = 'ISLAND_19_P24_CONSTRUCTION_ANCHOR_LEFT';
  constructionSocketLeft.position.set(-1.55, 0.25, -1.2);
  const constructionSocketRight = new THREE.Object3D();
  constructionSocketRight.name = 'ISLAND_19_P24_CONSTRUCTION_ANCHOR_RIGHT';
  constructionSocketRight.position.set(1.55, 0.25, -1.2);
  root.add(clearanceSocket, castleBodySocket, constructionSocketLeft, constructionSocketRight);

  root.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    qualityTier: quality,
    sockets: {
      portalClearance: clearanceSocket.name,
      castleBody: castleBodySocket.name,
      constructionLeft: constructionSocketLeft.name,
      constructionRight: constructionSocketRight.name,
    },
    colliders: [
      {
        id: 'island-019-p24-left-jamb',
        type: 'box',
        isTrigger: false,
        center: [-jambCenterX, ISLAND_19_CASTLE_PORTAL.lintelBottomY / 2, 0],
        size: [jambWidth, ISLAND_19_CASTLE_PORTAL.lintelBottomY, portalDepth],
      },
      {
        id: 'island-019-p24-right-jamb',
        type: 'box',
        isTrigger: false,
        center: [jambCenterX, ISLAND_19_CASTLE_PORTAL.lintelBottomY / 2, 0],
        size: [jambWidth, ISLAND_19_CASTLE_PORTAL.lintelBottomY, portalDepth],
      },
      {
        id: 'island-019-p24-lintel',
        type: 'box',
        isTrigger: false,
        center: [0, ISLAND_19_CASTLE_PORTAL.lintelBottomY + lintelHeight / 2, 0],
        size: [ISLAND_19_CASTLE_PORTAL.outerHalfWidth * 2, lintelHeight, portalDepth],
      },
      {
        id: 'island-019-p24-open-throughpass',
        type: 'box',
        isTrigger: true,
        center: [0, (ISLAND_19_CASTLE_PORTAL.clearBottomY + ISLAND_19_CASTLE_PORTAL.clearTopY) / 2, 0],
        size: [
          ISLAND_19_CASTLE_PORTAL.clearHalfWidth * 2,
          ISLAND_19_CASTLE_PORTAL.clearTopY - ISLAND_19_CASTLE_PORTAL.clearBottomY,
          portalDepth,
        ],
      },
    ],
    attachment: {
      parentId: 'root',
      parentSocket: 'terrain-top',
      localStart: [0, 0, 0],
      localEnd: [0, 0.1, 0],
      contactType: 'embedded',
      embedDepth: 0.1,
      gapTolerance: 0.01,
    },
  };
  markPartGeometry(root, 'p24-loopmaster-castle-portal');
  return root;
}

export function createIsland19CoasterCarnivalRepresentativeSlice(
  options: Island19RepresentativeSliceOptions = {},
): Island19RepresentativeSliceRuntime {
  const quality = options.quality ?? 'high';
  const materials = options.materials ?? createIsland19CoasterCarnivalMaterials();
  const circuit = new Island19CoasterCircuit(createDefaultCircuitPoints(), qualitySegments(quality) * 3);
  const root = new THREE.Group();
  root.name = 'ISLAND_19_COASTER_CARNIVAL_REPRESENTATIVE_SLICE_ROOT';

  const supportNetwork = createSupportNetwork(circuit, quality, materials);
  const upperTrack = createTrackSection(
    'p09-coaster-upper-crest',
    circuit,
    0.22,
    0.74,
    quality,
    materials,
  );
  const lowerTrack = createTrackSection(
    'p10-coaster-lower-circuit',
    circuit,
    0.74,
    1.22,
    quality,
    materials,
  );
  supportNetwork.root.add(upperTrack, lowerTrack);
  const castlePortal = createCastlePortal(quality, materials);
  root.add(supportNetwork.root, castlePortal);

  const routeSocket = new THREE.Object3D();
  routeSocket.name = 'ISLAND_19_REPRESENTATIVE_SLICE_ROUTE_ORIGIN_SOCKET';
  routeSocket.position.copy(circuit.getPointAtU(0));
  const focusSocket = new THREE.Object3D();
  focusSocket.name = 'ISLAND_19_REPRESENTATIVE_SLICE_FOCUS_SOCKET';
  focusSocket.position.set(0, 3.7, 0);
  root.add(routeSocket, focusSocket);

  const upperPart = registerRuntimePart('p09-coaster-upper-crest', upperTrack, 'upper-track');
  const lowerPart = registerRuntimePart('p10-coaster-lower-circuit', lowerTrack, 'lower-track');
  const portalPart = registerRuntimePart('p24-loopmaster-castle-portal', castlePortal, 'castle-portal');
  const supportPart = registerRuntimePart('p08-coaster-support-foundation', supportNetwork.root, 'rail-support');
  root.userData.sculptRuntime = {
    model: 'island-019-coaster-carnival-representative-slice',
    clickable: true,
    explodable: true,
    qualityTier: quality,
    parts: [supportPart, upperPart, lowerPart, portalPart],
    sockets: {
      routeOrigin: routeSocket.name,
      focus: focusSocket.name,
      castlePortal: 'ISLAND_19_P24_PHYSICALLY_OPEN_THROUGHPASS_SOCKET',
      upperTrack: 'ISLAND_19_P08_UPPER_TRACK_SPINE_SOCKET',
      lowerTrack: 'ISLAND_19_P08_LOWER_TRACK_SPINE_SOCKET',
    },
    colliders: [
      { id: 'island-019-coaster-centerline', type: 'closed-curve-envelope', isTrigger: false },
      { id: 'island-019-train-swept-envelope', type: 'closed-curve-envelope', isTrigger: true },
      { id: 'island-019-canonical-route-clearance', type: 'compound-ring', isTrigger: true },
    ],
    destructionGroups: [
      { id: 'coaster', breakable: false, partIds: [supportPart.id, upperPart.id, lowerPart.id] },
      { id: 'castle-portal', breakable: false, partIds: [portalPart.id] },
    ],
    routeContract: {
      curveType: 'closed-centripetal-catmull-rom',
      pathOwner: 'island19-coaster-circuit',
      railHalfSpan: TRACK_RAIL_HALF_SPAN,
      totalLength: circuit.totalLength,
    },
  };

  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh || node instanceof THREE.InstancedMesh)) return;
    node.castShadow = options.castShadow ?? true;
    node.receiveShadow = options.receiveShadow ?? true;
  });
  root.updateWorldMatrix(true, true);

  const manifest = collectIsland19RepresentativeSliceRuntimePartManifest([root]);
  const nodeNames: string[] = [];
  root.traverse((node) => { if (node.name) nodeNames.push(node.name); });
  const diagnostics = {
    closedCircuit: validateIsland19ClosedCircuit(circuit),
    portalClearance: validateIsland19CastlePortalClearance(circuit),
    routeClearance: validateIsland19CanonicalRouteClearance(supportNetwork.probes),
    runtimeManifest: validateIsland19RepresentativeSliceRuntimePartManifest(manifest, nodeNames),
  };
  root.userData.representativeSliceDiagnostics = {
    closedCircuit: diagnostics.closedCircuit,
    portalClearance: diagnostics.portalClearance,
    routeClearance: diagnostics.routeClearance,
    runtimeManifest: diagnostics.runtimeManifest,
  };

  return {
    root,
    circuit,
    materials,
    manifest,
    diagnostics,
    getTrainPose: (elapsedSeconds, speedWorldUnitsPerSecond, distanceOffset) => (
      resolveIsland19TrainPoseAtElapsed(
        circuit,
        elapsedSeconds,
        speedWorldUnitsPerSecond,
        distanceOffset,
      )
    ),
  };
}
