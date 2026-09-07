import * as THREE from 'three';
import {
  ISLAND_3D_ROUTE_RADIUS,
  ISLAND_3D_TILE_RADIAL_DEPTH,
  type Island3DQuality,
} from './island5ThreePilotContract';

export const ISLAND_19_COASTER_CARNIVAL_WORLD_NAME = 'Island 019 Coaster Carnival — Circuit C full-world blockout';
export const ISLAND_19_COASTER_CARNIVAL_PATH_OWNER = 'island19-circuit-c-world-track';
export const ISLAND_19_COASTER_CARNIVAL_PART_IDS = [
  'p01-island-mass',
  'p08-coaster-support-foundation',
  'p09-coaster-upper-crest',
  'p10-coaster-lower-circuit',
  'p11-momentum-station',
  'p14-ferris-hatchery',
  'p18-courage-drop',
  'p21-wisdom-carousel',
  'p24-loopmaster-castle-portal',
] as const;

export type Island19CoasterCarnivalPartId = typeof ISLAND_19_COASTER_CARNIVAL_PART_IDS[number];

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const FRAME_EPSILON = 1 / 4096;
const OUTER_RAIL_HALF_SPAN = 0.34;
const INNER_RAIL_HALF_SPAN = 0.225;
const ROUTE_INNER_RADIUS = ISLAND_3D_ROUTE_RADIUS - ISLAND_3D_TILE_RADIAL_DEPTH / 2 - 0.25;
const ROUTE_OUTER_RADIUS = ISLAND_3D_ROUTE_RADIUS + ISLAND_3D_TILE_RADIAL_DEPTH / 2 + 0.25;
const TRAIN_HALF_WIDTH = 0.48;
const TRAIN_HEIGHT_ABOVE_RAIL = 0.7;
const TRAIN_DEPTH_BELOW_RAIL = 0.25;

export const ISLAND_19_COASTER_CARNIVAL_PORTAL = {
  centerX: 0,
  centerZ: 0,
  halfDepth: 1.25,
  clearHalfWidth: 0.86,
  clearBottomY: 0.2,
  clearTopY: 2.02,
  masonryInnerHalfWidth: 1.02,
  outerHalfWidth: 1.66,
  lintelBottomY: 2.14,
} as const;

export interface Island19CoasterCarnivalWorldMaterials {
  basalt: THREE.MeshStandardMaterial;
  terrace: THREE.MeshStandardMaterial;
  routeStone: THREE.MeshStandardMaterial;
  redRail: THREE.MeshPhysicalMaterial;
  ivoryRail: THREE.MeshStandardMaterial;
  goldSupport: THREE.MeshPhysicalMaterial;
  darkSteel: THREE.MeshStandardMaterial;
  terracotta: THREE.MeshStandardMaterial;
  ivoryStone: THREE.MeshStandardMaterial;
  tealMetal: THREE.MeshPhysicalMaterial;
  carouselRed: THREE.MeshStandardMaterial;
}

export interface Island19CoasterCarnivalFrame {
  u: number;
  distance: number;
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  side: THREE.Vector3;
  up: THREE.Vector3;
  bankRadians: number;
}

export interface Island19CoasterCarnivalTrainPose extends Island19CoasterCarnivalFrame {
  quaternion: THREE.Quaternion;
}

export interface Island19CoasterCarnivalPartRecord {
  id: Island19CoasterCarnivalPartId;
  nodeName: string;
  triangles: number;
}

export interface Island19CoasterCarnivalClosureDiagnostic {
  valid: boolean;
  curveFamily: 'source-traced-quadratic-line-curve-path';
  segmentCount: number;
  totalLength: number;
  seamDistance: number;
  seamTangentDot: number;
  maximumJoinGap: number;
  minimumSampleSpacing: number;
  errors: string[];
}

export interface Island19CoasterCarnivalPortalDiagnostic {
  valid: boolean;
  checkedSamples: number;
  minimumSideMargin: number;
  minimumTopMargin: number;
  minimumBottomMargin: number;
  errors: string[];
}

export interface Island19CoasterCarnivalLandmarkDiagnostic {
  valid: boolean;
  landmarkCount: number;
  distinctProfileCount: number;
  minimumCenterSeparation: number;
  errors: string[];
}

export interface Island19CoasterCarnivalBoundsDiagnostic {
  valid: boolean;
  min: [number, number, number];
  max: [number, number, number];
  size: [number, number, number];
  errors: string[];
}

export interface Island19CoasterCarnivalRouteDiagnostic {
  valid: boolean;
  checkedProbes: number;
  violations: string[];
}

export interface Island19CoasterCarnivalWorldRuntime {
  root: THREE.Group;
  track: Island19CoasterCarnivalTrack;
  materials: Island19CoasterCarnivalWorldMaterials;
  parts: Island19CoasterCarnivalPartRecord[];
  diagnostics: {
    closure: Island19CoasterCarnivalClosureDiagnostic;
    portal: Island19CoasterCarnivalPortalDiagnostic;
    landmarks: Island19CoasterCarnivalLandmarkDiagnostic;
    bounds: Island19CoasterCarnivalBoundsDiagnostic;
    routeClearance: Island19CoasterCarnivalRouteDiagnostic;
    manifestValid: boolean;
  };
  getTrainPose: (elapsedSeconds: number, speedWorldUnitsPerSecond?: number, distanceOffset?: number) => Island19CoasterCarnivalTrainPose;
}

export interface Island19CoasterCarnivalWorldOptions {
  quality?: Island3DQuality;
  castShadow?: boolean;
  receiveShadow?: boolean;
  materials?: Island19CoasterCarnivalWorldMaterials;
}

const wrapUnit = (value: number) => THREE.MathUtils.euclideanModulo(value, 1);
const radialSegments = (quality: Island3DQuality) => quality === 'high' ? 10 : quality === 'medium' ? 8 : 6;
const pathSegments = (quality: Island3DQuality) => quality === 'high' ? 300 : quality === 'medium' ? 208 : 136;

export function createIsland19CoasterCarnivalWorldMaterials(): Island19CoasterCarnivalWorldMaterials {
  return {
    basalt: new THREE.MeshStandardMaterial({ color: 0x3f4545, roughness: 0.91, metalness: 0.01 }),
    terrace: new THREE.MeshStandardMaterial({ color: 0x547441, roughness: 0.86, metalness: 0.01 }),
    routeStone: new THREE.MeshStandardMaterial({ color: 0xd8c9a7, roughness: 0.76, metalness: 0.01 }),
    redRail: new THREE.MeshPhysicalMaterial({
      color: 0xb73524,
      roughness: 0.3,
      metalness: 0.72,
      clearcoat: 0.28,
      clearcoatRoughness: 0.22,
    }),
    ivoryRail: new THREE.MeshStandardMaterial({ color: 0xead5aa, roughness: 0.44, metalness: 0.42 }),
    goldSupport: new THREE.MeshPhysicalMaterial({
      color: 0xb67b2f,
      roughness: 0.38,
      metalness: 0.8,
      clearcoat: 0.12,
      clearcoatRoughness: 0.3,
    }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x29252a, roughness: 0.38, metalness: 0.82 }),
    terracotta: new THREE.MeshStandardMaterial({ color: 0xa9573c, roughness: 0.7, metalness: 0.02 }),
    ivoryStone: new THREE.MeshStandardMaterial({ color: 0xe1cfab, roughness: 0.68, metalness: 0.02 }),
    tealMetal: new THREE.MeshPhysicalMaterial({
      color: 0x287b79,
      roughness: 0.46,
      metalness: 0.58,
      clearcoat: 0.12,
      clearcoatRoughness: 0.3,
    }),
    carouselRed: new THREE.MeshStandardMaterial({ color: 0xa94736, roughness: 0.55, metalness: 0.08 }),
  };
}

/**
 * Circuit C is authored directly in the final world footprint. It deliberately
 * uses connected quadratic and line segments rather than either retired spline
 * family. The ride order starts behind the castle, passes straight through the
 * real portal, climbs the left tower, rounds a two-segment crest, folds inward
 * through the descent, then makes the full right-front-left low circuit.
 */
export function createIsland19CoasterCarnivalSourceTrackPath() {
  const path = new THREE.CurvePath<THREE.Vector3>();
  const point = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const deepRear = point(0, 0.9, -3.45);
  const frontPortal = point(0, 0.98, 2.15);
  const leftFoot = point(-3.25, 1.12, 2.5);
  const leftCrest = point(-4.15, 7.65, 0.7);
  const crown = point(-2.6, 8.9, -0.05);
  const crestExit = point(-0.4, 7.72, 0.12);
  const inwardMid = point(-0.72, 4.3, 0.62);
  const rightDescent = point(4.2, 1.68, 1.48);
  const rightFront = point(4.35, 0.94, 3.65);
  const frontCenter = point(0, 0.86, 4.65);
  const leftFront = point(-4.2, 0.92, 3.55);
  const leftRear = point(-3.65, 0.9, -2.15);

  path.add(new THREE.LineCurve3(deepRear, frontPortal));
  path.add(new THREE.QuadraticBezierCurve3(frontPortal, point(-1.6, 1.02, 2.68), leftFoot));
  path.add(new THREE.QuadraticBezierCurve3(leftFoot, point(-4.4, 4.35, 1.85), leftCrest));
  path.add(new THREE.QuadraticBezierCurve3(leftCrest, point(-4.0, 8.82, 0.2), crown));
  path.add(new THREE.QuadraticBezierCurve3(crown, point(-1.35, 9.02, -0.22), crestExit));
  path.add(new THREE.QuadraticBezierCurve3(crestExit, point(0.42, 5.9, 0.24), inwardMid));
  path.add(new THREE.QuadraticBezierCurve3(inwardMid, point(0.35, 2.8, 0.25), rightDescent));
  path.add(new THREE.QuadraticBezierCurve3(rightDescent, point(4.75, 1.22, 2.35), rightFront));
  path.add(new THREE.QuadraticBezierCurve3(rightFront, point(2.65, 0.78, 4.9), frontCenter));
  path.add(new THREE.QuadraticBezierCurve3(frontCenter, point(-2.65, 0.78, 4.9), leftFront));
  path.add(new THREE.QuadraticBezierCurve3(leftFront, point(-4.75, 0.88, 0.35), leftRear));
  path.add(new THREE.QuadraticBezierCurve3(leftRear, point(0, 0.9, -4.18), deepRear.clone()));
  path.arcLengthDivisions = 3072;
  path.updateArcLengths();
  return path;
}

export class Island19CoasterCarnivalTrack {
  readonly path: THREE.CurvePath<THREE.Vector3>;
  readonly curve: THREE.CurvePath<THREE.Vector3>;
  readonly totalLength: number;
  readonly arcLengths: readonly number[];

  constructor(path = createIsland19CoasterCarnivalSourceTrackPath(), arcLengthDivisions = 2048) {
    this.path = path;
    this.curve = path;
    this.path.arcLengthDivisions = Math.max(1024, Math.floor(arcLengthDivisions));
    this.path.updateArcLengths();
    this.totalLength = this.path.getLength();
    this.arcLengths = [...this.path.getLengths(this.path.arcLengthDivisions)];
  }

  distanceToU(distance: number) {
    if (!Number.isFinite(distance) || this.totalLength <= 0) return 0;
    return wrapUnit(distance / this.totalLength);
  }

  getPointAtU(u: number, target = new THREE.Vector3()) {
    return this.path.getPointAt(wrapUnit(u), target);
  }

  getPointAtDistance(distance: number, target = new THREE.Vector3()) {
    return this.getPointAtU(this.distanceToU(distance), target);
  }

  getTangentAtU(u: number, target = new THREE.Vector3()) {
    return this.path.getTangentAt(wrapUnit(u), target).normalize();
  }

  getFrameAtU(u: number): Island19CoasterCarnivalFrame {
    const resolvedU = wrapUnit(u);
    const position = this.getPointAtU(resolvedU);
    const tangent = this.getTangentAtU(resolvedU);
    const side = tangent.clone().cross(WORLD_UP);
    if (side.lengthSq() < 0.00001) side.copy(tangent).cross(new THREE.Vector3(0, 0, 1));
    side.normalize();
    const up = side.clone().cross(tangent).normalize();
    const before = this.getTangentAtU(resolvedU - FRAME_EPSILON);
    const after = this.getTangentAtU(resolvedU + FRAME_EPSILON);
    const signedTurn = before.clone().cross(after).dot(WORLD_UP);
    const bankRadians = THREE.MathUtils.clamp(-signedTurn * 6.5, -0.22, 0.22);
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

class Island19WorldOffsetCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    readonly track: Island19CoasterCarnivalTrack,
    readonly startU: number,
    readonly endU: number,
    readonly lateralOffset: number,
    readonly verticalOffset = 0,
  ) {
    super();
  }

  getPoint(t: number, target = new THREE.Vector3()) {
    const u = wrapUnit(THREE.MathUtils.lerp(this.startU, this.endU, THREE.MathUtils.clamp(t, 0, 1)));
    const frame = this.track.getFrameAtU(u);
    return target.copy(frame.position)
      .addScaledVector(frame.side, this.lateralOffset)
      .addScaledVector(frame.up, this.verticalOffset);
  }
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
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), segments), material);
  mesh.name = name;
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return mesh;
}

function markPart(root: THREE.Object3D, partId: Island19CoasterCarnivalPartId) {
  root.userData.partId = partId;
  root.userData.partKind = 'part';
  root.userData.clickable = true;
  root.userData.explodable = true;
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh || node instanceof THREE.InstancedMesh)) return;
    node.userData.partOwnerId = partId;
    node.userData.explodeWithParent = true;
  });
}

function countTriangles(root: THREE.Object3D) {
  let count = 0;
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh || node instanceof THREE.InstancedMesh)) return;
    const triangles = node.geometry.index
      ? node.geometry.index.count / 3
      : (node.geometry.getAttribute('position')?.count ?? 0) / 3;
    count += triangles * (node instanceof THREE.InstancedMesh ? node.count : 1);
  });
  return Math.round(count);
}

function createIslandRoot(
  quality: Island3DQuality,
  materials: Island19CoasterCarnivalWorldMaterials,
) {
  const root = new THREE.Group();
  root.name = 'ISLAND_19_P01_CONTINUOUS_ROCK_ISLAND_ROOT';
  const cliffGeometry = new THREE.CylinderGeometry(6.35, 6.9, 3.8, quality === 'high' ? 36 : quality === 'medium' ? 30 : 24, 5, false);
  const positions = cliffGeometry.getAttribute('position') as THREE.BufferAttribute;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const angle = Math.atan2(z, x);
    const irregularity = 1 + 0.035 * Math.sin(angle * 7) + 0.022 * Math.cos(angle * 11 + y * 1.7);
    positions.setXYZ(index, x * irregularity, y, z * irregularity * 0.86);
  }
  positions.needsUpdate = true;
  cliffGeometry.computeVertexNormals();
  const cliff = new THREE.Mesh(cliffGeometry, materials.basalt);
  cliff.name = 'ISLAND_19_P01_FRACTURED_CONTINUOUS_CLIFF_VOLUME';
  cliff.position.y = -1.65;
  root.add(cliff);
  const terrace = new THREE.Mesh(new THREE.CylinderGeometry(6.45, 6.55, 0.28, 32), materials.terrace);
  terrace.name = 'ISLAND_19_P01_CONTINUOUS_PARK_TERRACE';
  terrace.scale.z = 0.86;
  terrace.position.y = 0.14;
  root.add(terrace);
  const innerPlaza = new THREE.Mesh(new THREE.CylinderGeometry(2.38, 2.48, 0.18, 32), materials.routeStone);
  innerPlaza.name = 'ISLAND_19_P01_BOARD_SAFE_INNER_PLAZA_CONTEXT';
  innerPlaza.position.y = 0.34;
  root.add(innerPlaza);
  const routeContext = new THREE.Mesh(
    new THREE.TorusGeometry(ISLAND_3D_ROUTE_RADIUS, ISLAND_3D_TILE_RADIAL_DEPTH * 0.34, 8, 72),
    materials.routeStone,
  );
  routeContext.name = 'ISLAND_19_P01_CANONICAL_ROUTE_MATERIAL_CONTEXT_ONLY';
  routeContext.rotation.x = Math.PI / 2;
  routeContext.position.y = 0.35;
  routeContext.userData.presentationOnly = true;
  routeContext.userData.doesNotOwnBoardTopology = true;
  root.add(routeContext);
  const boardAnchor = new THREE.Object3D();
  boardAnchor.name = 'ISLAND_19_P01_CANONICAL_BOARD_ANCHOR_SOCKET';
  boardAnchor.position.y = 0.36;
  root.add(boardAnchor);
  root.userData.sculptRuntime = {
    sockets: { canonicalBoard: boardAnchor.name },
    colliders: [{ id: 'island-019-continuous-terrain', type: 'cylinder', center: [0, -1.65, 0], radius: 6.25, height: 3.8, isTrigger: false }],
  };
  markPart(root, 'p01-island-mass');
  return root;
}

function routeSafeFooting(x: number, z: number, footprintRadius: number) {
  const radius = Math.hypot(x, z);
  if (radius + footprintRadius <= ROUTE_INNER_RADIUS || radius - footprintRadius >= ROUTE_OUTER_RADIUS) {
    return new THREE.Vector2(x, z);
  }
  const inner = ROUTE_INNER_RADIUS - footprintRadius - 0.12;
  return new THREE.Vector2(x / Math.max(radius, 0.001) * inner, z / Math.max(radius, 0.001) * inner);
}

function createSupportNetwork(
  track: Island19CoasterCarnivalTrack,
  quality: Island3DQuality,
  materials: Island19CoasterCarnivalWorldMaterials,
) {
  const root = new THREE.Group();
  root.name = 'ISLAND_19_P08_WORLD_AUTHORED_SUPPORT_NETWORK';
  const supportUs = quality === 'high'
    ? [0.16, 0.205, 0.25, 0.295, 0.34, 0.385, 0.43, 0.475, 0.52, 0.565, 0.61, 0.67, 0.74, 0.81, 0.88, 0.95]
    : quality === 'medium'
      ? [0.17, 0.23, 0.29, 0.35, 0.41, 0.47, 0.53, 0.59, 0.67, 0.76, 0.85, 0.94]
      : [0.18, 0.27, 0.36, 0.45, 0.54, 0.63, 0.74, 0.85, 0.94];
  const probes: { id: string; x: number; z: number; footprintRadius: number }[] = [];
  supportUs.forEach((u, index) => {
    const frame = track.getFrameAtU(u);
    [-1, 1].forEach((side, sideIndex) => {
      const bearing = frame.position.clone().addScaledVector(frame.side, side * OUTER_RAIL_HALF_SPAN).addScaledVector(frame.up, -0.15);
      const safe = routeSafeFooting(bearing.x, bearing.z, 0.16);
      const footing = new THREE.Vector3(safe.x, 0.44, safe.y);
      probes.push({ id: `p08-support-${index + 1}-${sideIndex + 1}`, x: footing.x, z: footing.z, footprintRadius: 0.16 });
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.21, 0.18, radialSegments(quality)), materials.goldSupport);
      pad.name = `ISLAND_19_P08_FOOTING_${index + 1}_${sideIndex + 1}`;
      pad.position.copy(footing);
      root.add(pad);
      root.add(createMemberBetween(
        `ISLAND_19_P08_LOAD_COLUMN_${index + 1}_${sideIndex + 1}`,
        footing,
        bearing,
        frame.position.y > 5 ? 0.085 : 0.065,
        materials.goldSupport,
        radialSegments(quality),
      ));
    });
  });
  const upperSocket = new THREE.Object3D();
  upperSocket.name = 'ISLAND_19_P08_UPPER_TRACK_SPINE_SOCKET';
  upperSocket.position.copy(track.getPointAtU(0.35));
  const lowerSocket = new THREE.Object3D();
  lowerSocket.name = 'ISLAND_19_P08_LOWER_TRACK_SPINE_SOCKET';
  lowerSocket.position.copy(track.getPointAtU(0.78));
  root.add(upperSocket, lowerSocket);
  root.userData.routeClearanceProbes = probes;
  root.userData.sculptRuntime = {
    sockets: { upperTrack: upperSocket.name, lowerTrack: lowerSocket.name },
    colliders: probes.map((probe) => ({ id: probe.id, type: 'cylinder', radius: probe.footprintRadius, isTrigger: false })),
  };
  markPart(root, 'p08-coaster-support-foundation');
  return { root, probes };
}

function createTrackSection(
  partId: 'p09-coaster-upper-crest' | 'p10-coaster-lower-circuit',
  track: Island19CoasterCarnivalTrack,
  startU: number,
  endU: number,
  quality: Island3DQuality,
  materials: Island19CoasterCarnivalWorldMaterials,
) {
  const root = new THREE.Group();
  const isUpper = partId === 'p09-coaster-upper-crest';
  root.name = isUpper
    ? 'ISLAND_19_P09_LEFT_LOADED_ROUNDED_CREST_AND_S_DESCENT'
    : 'ISLAND_19_P10_LOW_BILATERAL_FOREGROUND_CASTLE_CIRCUIT';
  const railSpecs = [
    [-OUTER_RAIL_HALF_SPAN, 0.07, materials.redRail, 'RED_OUTER_LEFT'],
    [OUTER_RAIL_HALF_SPAN, 0.07, materials.redRail, 'RED_OUTER_RIGHT'],
    [-INNER_RAIL_HALF_SPAN, 0.037, materials.ivoryRail, 'IVORY_INNER_LEFT'],
    [INNER_RAIL_HALF_SPAN, 0.037, materials.ivoryRail, 'IVORY_INNER_RIGHT'],
  ] as const;
  const fraction = endU - startU;
  railSpecs.forEach(([offset, radius, material, label]) => {
    const offsetCurve = new Island19WorldOffsetCurve(track, startU, endU, offset);
    const rail = new THREE.Mesh(
      new THREE.TubeGeometry(offsetCurve, Math.max(60, Math.round(pathSegments(quality) * fraction)), radius, radialSegments(quality), false),
      material,
    );
    rail.name = `ISLAND_19_${isUpper ? 'P09' : 'P10'}_${label}_RUNNER`;
    root.add(rail);
  });
  const tieCount = Math.max(18, Math.floor(track.totalLength * fraction / (quality === 'high' ? 0.3 : quality === 'medium' ? 0.4 : 0.52)));
  const ties = new THREE.InstancedMesh(new THREE.BoxGeometry(0.82, 0.05, 0.13), materials.darkSteel, tieCount);
  ties.name = `ISLAND_19_${isUpper ? 'P09' : 'P10'}_STRUCTURAL_CROSS_TIES`;
  const matrix = new THREE.Matrix4();
  for (let index = 0; index < tieCount; index += 1) {
    const u = wrapUnit(THREE.MathUtils.lerp(startU, endU, (index + 0.5) / tieCount));
    const frame = track.getFrameAtU(u);
    const orientation = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(frame.side, frame.up, frame.tangent)).normalize();
    matrix.compose(frame.position.clone().addScaledVector(frame.up, -0.1), orientation, new THREE.Vector3(1, 1, 1));
    ties.setMatrixAt(index, matrix);
  }
  ties.instanceMatrix.needsUpdate = true;
  root.add(ties);
  const startSocket = new THREE.Object3D();
  startSocket.name = `ISLAND_19_${isUpper ? 'P09' : 'P10'}_START_PATH_SOCKET`;
  startSocket.position.copy(track.getPointAtU(startU));
  const endSocket = new THREE.Object3D();
  endSocket.name = `ISLAND_19_${isUpper ? 'P09' : 'P10'}_END_PATH_SOCKET`;
  endSocket.position.copy(track.getPointAtU(endU));
  root.add(startSocket, endSocket);
  root.userData.sculptRuntime = {
    sockets: { start: startSocket.name, end: endSocket.name },
    colliders: [{ id: `${partId}-curve-envelope`, type: 'curve-envelope', pathOwner: ISLAND_19_COASTER_CARNIVAL_PATH_OWNER, isTrigger: false }],
  };
  markPart(root, partId);
  return root;
}

function createMomentumStation(materials: Island19CoasterCarnivalWorldMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_19_P11_MOMENTUM_STATION_LOWER_LEFT';
  root.position.set(-4.65, 0.46, 3.05);
  const platform = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.22, 1.25), materials.ivoryStone);
  platform.name = 'ISLAND_19_P11_STATION_PLATFORM_MASS';
  platform.position.y = 0.11;
  const hall = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.9, 0.85), materials.terracotta);
  hall.name = 'ISLAND_19_P11_STATION_HALL_MASS';
  hall.position.y = 0.67;
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.58, 4), materials.tealMetal);
  canopy.name = 'ISLAND_19_P11_STATION_CANOPY_BLOCKOUT';
  canopy.position.y = 1.4;
  canopy.rotation.y = Math.PI / 4;
  root.add(platform, hall, canopy);
  const trackSocket = new THREE.Object3D();
  trackSocket.name = 'ISLAND_19_P11_STATION_TRACK_SOCKET';
  trackSocket.position.set(0.8, 0.7, -0.2);
  root.add(trackSocket);
  root.userData.landmarkProfile = { role: 'habit', silhouette: 'low-station', footprintRadius: 1.05, height: 1.7 };
  root.userData.sculptRuntime = { sockets: { stationTrack: trackSocket.name }, colliders: [{ id: 'p11-station-mass', type: 'box', size: [1.75, 1.7, 1.25] }] };
  markPart(root, 'p11-momentum-station');
  return root;
}

function createFerrisHatchery(
  quality: Island3DQuality,
  materials: Island19CoasterCarnivalWorldMaterials,
) {
  const root = new THREE.Group();
  root.name = 'ISLAND_19_P14_FERRIS_HATCHERY_LEFT';
  root.position.set(-4.7, 2.35, -2.65);
  [-0.16, 0.16].forEach((z, index) => {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.09, radialSegments(quality), quality === 'high' ? 48 : 36), materials.tealMetal);
    rim.name = `ISLAND_19_P14_FERRIS_RIM_${index + 1}`;
    rim.position.z = z;
    root.add(rim);
  });
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.55, radialSegments(quality)), materials.goldSupport);
  hub.name = 'ISLAND_19_P14_FERRIS_HUB';
  hub.rotation.x = Math.PI / 2;
  root.add(hub);
  const spokeCount = quality === 'high' ? 16 : quality === 'medium' ? 12 : 10;
  for (let index = 0; index < spokeCount; index += 1) {
    const angle = index / spokeCount * Math.PI * 2;
    root.add(createMemberBetween(
      `ISLAND_19_P14_FERRIS_SPOKE_${index + 1}`,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(Math.cos(angle) * 1.86, Math.sin(angle) * 1.86, 0),
      0.025,
      materials.ivoryRail,
      5,
    ));
  }
  root.add(
    createMemberBetween('ISLAND_19_P14_LEFT_A_FRAME', new THREE.Vector3(-1.25, -2.15, 0), new THREE.Vector3(0, 0, 0), 0.1, materials.goldSupport, radialSegments(quality)),
    createMemberBetween('ISLAND_19_P14_RIGHT_A_FRAME', new THREE.Vector3(1.25, -2.15, 0), new THREE.Vector3(0, 0, 0), 0.1, materials.goldSupport, radialSegments(quality)),
  );
  const axisSocket = new THREE.Object3D();
  axisSocket.name = 'ISLAND_19_P14_FERRIS_AXLE_SOCKET';
  root.add(axisSocket);
  root.userData.landmarkProfile = { role: 'hatchery', silhouette: 'radial-wheel', footprintRadius: 1.25, height: 4.5 };
  root.userData.sculptRuntime = { sockets: { axle: axisSocket.name }, colliders: [{ id: 'p14-wheel-envelope', type: 'cylinder', radius: 2.1, depth: 0.6 }] };
  markPart(root, 'p14-ferris-hatchery');
  return root;
}

function createCourageDrop(
  quality: Island3DQuality,
  materials: Island19CoasterCarnivalWorldMaterials,
) {
  const root = new THREE.Group();
  root.name = 'ISLAND_19_P18_COURAGE_DROP_RIGHT_REAR';
  root.position.set(4.75, 0.46, -1.85);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.82, 0.42, radialSegments(quality)), materials.tealMetal);
  base.name = 'ISLAND_19_P18_DROP_FOUNDATION_MASS';
  base.position.y = 0.21;
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.55, 5.4, 0.55), materials.tealMetal);
  shaft.name = 'ISLAND_19_P18_DROP_SHAFT_MASS';
  shaft.position.y = 2.92;
  const guide = new THREE.Mesh(new THREE.BoxGeometry(0.14, 4.9, 0.66), materials.goldSupport);
  guide.name = 'ISLAND_19_P18_DROP_GUIDE_RAIL_MASS';
  guide.position.set(0, 2.85, 0);
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.85, radialSegments(quality)), materials.tealMetal);
  crown.name = 'ISLAND_19_P18_CROWN_SILHOUETTE';
  crown.position.y = 6.05;
  root.add(base, shaft, guide, crown);
  const carriageSocket = new THREE.Object3D();
  carriageSocket.name = 'ISLAND_19_P18_CARRIAGE_GUIDE_SOCKET';
  carriageSocket.position.y = 3.4;
  root.add(carriageSocket);
  root.userData.landmarkProfile = { role: 'mystery', silhouette: 'slender-drop-spire', footprintRadius: 0.82, height: 6.5 };
  root.userData.sculptRuntime = { sockets: { carriageGuide: carriageSocket.name }, colliders: [{ id: 'p18-drop-envelope', type: 'box', size: [1.45, 6.5, 1.45] }] };
  markPart(root, 'p18-courage-drop');
  return root;
}

function createWisdomCarousel(
  quality: Island3DQuality,
  materials: Island19CoasterCarnivalWorldMaterials,
) {
  const root = new THREE.Group();
  root.name = 'ISLAND_19_P21_WISDOM_CAROUSEL_RIGHT_FRONT';
  root.position.set(4.9, 0.48, 2.75);
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.35, 0.36, quality === 'high' ? 28 : 20), materials.darkSteel);
  platform.name = 'ISLAND_19_P21_CAROUSEL_PLATFORM_MASS';
  platform.position.y = 0.18;
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 2.1, radialSegments(quality)), materials.goldSupport);
  column.name = 'ISLAND_19_P21_CAROUSEL_CENTRAL_COLUMN';
  column.position.y = 1.4;
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.48, 0.98, quality === 'high' ? 24 : 16), materials.carouselRed);
  canopy.name = 'ISLAND_19_P21_STRIPED_CANOPY_MACRO_SILHOUETTE';
  canopy.position.y = 2.4;
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.62, radialSegments(quality)), materials.goldSupport);
  crown.name = 'ISLAND_19_P21_GOLD_CROWN_MASS';
  crown.position.y = 3.2;
  root.add(platform, column, canopy, crown);
  const axisSocket = new THREE.Object3D();
  axisSocket.name = 'ISLAND_19_P21_TURNTABLE_AXIS_SOCKET';
  axisSocket.position.y = 0.45;
  root.add(axisSocket);
  root.userData.landmarkProfile = { role: 'wisdom', silhouette: 'wide-canopy-pavilion', footprintRadius: 1.35, height: 3.5 };
  root.userData.sculptRuntime = { sockets: { turntableAxis: axisSocket.name }, colliders: [{ id: 'p21-carousel-envelope', type: 'cylinder', radius: 1.4, height: 3.5 }] };
  markPart(root, 'p21-wisdom-carousel');
  return root;
}

function createLoopmasterCastle(
  quality: Island3DQuality,
  materials: Island19CoasterCarnivalWorldMaterials,
) {
  const root = new THREE.Group();
  root.name = 'ISLAND_19_P24_LOOPMASTER_CASTLE_CENTRAL_OPEN_PORTAL';
  root.position.y = 0.43;
  const portalDepth = ISLAND_19_COASTER_CARNIVAL_PORTAL.halfDepth * 2;
  const jambWidth = ISLAND_19_COASTER_CARNIVAL_PORTAL.outerHalfWidth - ISLAND_19_COASTER_CARNIVAL_PORTAL.masonryInnerHalfWidth;
  const jambCenter = ISLAND_19_COASTER_CARNIVAL_PORTAL.masonryInnerHalfWidth + jambWidth / 2;
  [-1, 1].forEach((side) => {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(jambWidth, ISLAND_19_COASTER_CARNIVAL_PORTAL.lintelBottomY, portalDepth), materials.terracotta);
    jamb.name = `ISLAND_19_P24_${side < 0 ? 'LEFT' : 'RIGHT'}_PORTAL_JAMB_SOLID`;
    jamb.position.set(side * jambCenter, ISLAND_19_COASTER_CARNIVAL_PORTAL.lintelBottomY / 2, 0);
    root.add(jamb);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.66, 3.25, radialSegments(quality)), materials.ivoryStone);
    tower.name = `ISLAND_19_P24_${side < 0 ? 'LEFT' : 'RIGHT'}_CASTLE_TOWER_MASS`;
    tower.position.set(side * 1.38, 1.62, 0.18);
    root.add(tower);
    const dome = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.0, radialSegments(quality)), materials.tealMetal);
    dome.name = `ISLAND_19_P24_${side < 0 ? 'LEFT' : 'RIGHT'}_TEAL_DOME_BLOCKOUT`;
    dome.position.set(side * 1.38, 3.62, 0.18);
    root.add(dome);
  });
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(ISLAND_19_COASTER_CARNIVAL_PORTAL.outerHalfWidth * 2, 0.62, portalDepth), materials.terracotta);
  lintel.name = 'ISLAND_19_P24_LOAD_BEARING_LINTEL_SOLID';
  lintel.position.y = ISLAND_19_COASTER_CARNIVAL_PORTAL.lintelBottomY + 0.31;
  const upperKeep = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.25, 1.55), materials.ivoryStone);
  upperKeep.name = 'ISLAND_19_P24_UPPER_KEEP_MACRO_MASS';
  upperKeep.position.set(0, 3.0, 0.25);
  const keepDome = new THREE.Mesh(new THREE.ConeGeometry(0.88, 1.2, radialSegments(quality)), materials.tealMetal);
  keepDome.name = 'ISLAND_19_P24_CENTRAL_TEAL_DOME_BLOCKOUT';
  keepDome.position.set(0, 4.2, 0.25);
  root.add(lintel, upperKeep, keepDome);
  const portalSocket = new THREE.Object3D();
  portalSocket.name = 'ISLAND_19_P24_PHYSICALLY_EMPTY_FRONT_TO_REAR_PORTAL_SOCKET';
  portalSocket.position.set(0, 0.96, 0);
  portalSocket.userData.clearance = {
    axis: 'local-z',
    width: ISLAND_19_COASTER_CARNIVAL_PORTAL.clearHalfWidth * 2,
    height: ISLAND_19_COASTER_CARNIVAL_PORTAL.clearTopY - ISLAND_19_COASTER_CARNIVAL_PORTAL.clearBottomY,
    depth: portalDepth,
  };
  root.add(portalSocket);
  root.userData.landmarkProfile = { role: 'boss', silhouette: 'central-domed-castle', footprintRadius: 1.7, height: 4.85 };
  root.userData.sculptRuntime = {
    sockets: { portalClearance: portalSocket.name },
    colliders: [
      { id: 'p24-left-jamb', type: 'box', center: [-jambCenter, ISLAND_19_COASTER_CARNIVAL_PORTAL.lintelBottomY / 2, 0], size: [jambWidth, ISLAND_19_COASTER_CARNIVAL_PORTAL.lintelBottomY, portalDepth] },
      { id: 'p24-right-jamb', type: 'box', center: [jambCenter, ISLAND_19_COASTER_CARNIVAL_PORTAL.lintelBottomY / 2, 0], size: [jambWidth, ISLAND_19_COASTER_CARNIVAL_PORTAL.lintelBottomY, portalDepth] },
      { id: 'p24-lintel', type: 'box', center: [0, ISLAND_19_COASTER_CARNIVAL_PORTAL.lintelBottomY + 0.31, 0], size: [ISLAND_19_COASTER_CARNIVAL_PORTAL.outerHalfWidth * 2, 0.62, portalDepth] },
      { id: 'p24-empty-throughpass', type: 'box', isTrigger: true, center: [0, 1.11, 0], size: [ISLAND_19_COASTER_CARNIVAL_PORTAL.clearHalfWidth * 2, ISLAND_19_COASTER_CARNIVAL_PORTAL.clearTopY - ISLAND_19_COASTER_CARNIVAL_PORTAL.clearBottomY, portalDepth] },
    ],
  };
  markPart(root, 'p24-loopmaster-castle-portal');
  return root;
}

export function resolveIsland19CoasterCarnivalTrainPose(
  track: Island19CoasterCarnivalTrack,
  elapsedSeconds: number,
  speedWorldUnitsPerSecond = 1.16,
  distanceOffset = 0,
): Island19CoasterCarnivalTrainPose {
  const elapsed = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
  const speed = Number.isFinite(speedWorldUnitsPerSecond) ? Math.max(0, speedWorldUnitsPerSecond) : 0;
  const frame = track.getFrameAtDistance(elapsed * speed + distanceOffset);
  const quaternion = new THREE.Quaternion()
    .setFromRotationMatrix(new THREE.Matrix4().makeBasis(frame.side, frame.up, frame.tangent))
    .normalize();
  return { ...frame, quaternion };
}

export function validateIsland19CoasterCarnivalTrackClosure(
  track: Island19CoasterCarnivalTrack,
): Island19CoasterCarnivalClosureDiagnostic {
  const start = track.path.getPointAt(0);
  const end = track.path.getPointAt(1);
  const seamDistance = start.distanceTo(end);
  const seamTangentDot = track.path.getTangentAt(0).normalize().dot(track.path.getTangentAt(1).normalize());
  let maximumJoinGap = 0;
  track.path.curves.forEach((curve, index) => {
    const next = track.path.curves[(index + 1) % track.path.curves.length];
    maximumJoinGap = Math.max(maximumJoinGap, curve.getPoint(1).distanceTo(next.getPoint(0)));
  });
  let minimumSampleSpacing = Number.POSITIVE_INFINITY;
  let previous = start;
  for (let index = 1; index <= 768; index += 1) {
    const next = track.path.getPointAt(index / 768);
    minimumSampleSpacing = Math.min(minimumSampleSpacing, previous.distanceTo(next));
    previous = next;
  }
  const errors: string[] = [];
  if (track.path.curves.length < 10) errors.push('source trace is not sufficiently piecewise');
  if (seamDistance > 0.001) errors.push(`seam distance ${seamDistance.toFixed(5)} exceeds 0.001`);
  if (seamTangentDot < 0.995) errors.push(`seam tangent dot ${seamTangentDot.toFixed(5)} is below 0.995`);
  if (maximumJoinGap > 0.001) errors.push(`join gap ${maximumJoinGap.toFixed(5)} exceeds 0.001`);
  if (!Number.isFinite(minimumSampleSpacing) || minimumSampleSpacing <= 0.0001) errors.push('track contains a collapsed span');
  return {
    valid: errors.length === 0,
    curveFamily: 'source-traced-quadratic-line-curve-path',
    segmentCount: track.path.curves.length,
    totalLength: track.totalLength,
    seamDistance,
    seamTangentDot,
    maximumJoinGap,
    minimumSampleSpacing,
    errors,
  };
}

export function validateIsland19CoasterCarnivalPortal(
  track: Island19CoasterCarnivalTrack,
): Island19CoasterCarnivalPortalDiagnostic {
  let minimumSideMargin = Number.POSITIVE_INFINITY;
  let minimumTopMargin = Number.POSITIVE_INFINITY;
  let minimumBottomMargin = Number.POSITIVE_INFINITY;
  let checkedSamples = 0;
  for (let index = 0; index <= 192; index += 1) {
    const u = 0.17 * index / 192;
    const frame = track.getFrameAtU(u);
    if (Math.abs(frame.position.z) > ISLAND_19_COASTER_CARNIVAL_PORTAL.halfDepth) continue;
    checkedSamples += 1;
    minimumSideMargin = Math.min(minimumSideMargin, ISLAND_19_COASTER_CARNIVAL_PORTAL.clearHalfWidth - Math.abs(frame.position.x) - TRAIN_HALF_WIDTH);
    minimumTopMargin = Math.min(minimumTopMargin, ISLAND_19_COASTER_CARNIVAL_PORTAL.clearTopY - frame.position.y - TRAIN_HEIGHT_ABOVE_RAIL);
    minimumBottomMargin = Math.min(minimumBottomMargin, frame.position.y - TRAIN_DEPTH_BELOW_RAIL - ISLAND_19_COASTER_CARNIVAL_PORTAL.clearBottomY);
  }
  const errors: string[] = [];
  if (checkedSamples === 0) errors.push('no canonical path samples crossed the portal volume');
  if (minimumSideMargin <= 0) errors.push('train swept envelope exceeds portal side clearance');
  if (minimumTopMargin <= 0) errors.push('train swept envelope exceeds portal top clearance');
  if (minimumBottomMargin <= 0) errors.push('train swept envelope exceeds portal bottom clearance');
  return { valid: errors.length === 0, checkedSamples, minimumSideMargin, minimumTopMargin, minimumBottomMargin, errors };
}

const LANDMARK_LAYOUT = [
  { id: 'p14-ferris-hatchery', role: 'hatchery', silhouette: 'radial-wheel', x: -4.7, z: -2.65, footprintRadius: 1.25 },
  { id: 'p11-momentum-station', role: 'habit', silhouette: 'low-station', x: -4.65, z: 3.05, footprintRadius: 1.05 },
  { id: 'p18-courage-drop', role: 'mystery', silhouette: 'slender-drop-spire', x: 4.75, z: -1.85, footprintRadius: 0.82 },
  { id: 'p21-wisdom-carousel', role: 'wisdom', silhouette: 'wide-canopy-pavilion', x: 4.9, z: 2.75, footprintRadius: 1.35 },
  { id: 'p24-loopmaster-castle-portal', role: 'boss', silhouette: 'central-domed-castle', x: 0, z: 0, footprintRadius: 1.7 },
] as const;

export function validateIsland19CoasterCarnivalLandmarkDistinctness(): Island19CoasterCarnivalLandmarkDiagnostic {
  const errors: string[] = [];
  const roles = new Set(LANDMARK_LAYOUT.map((entry) => entry.role));
  const silhouettes = new Set(LANDMARK_LAYOUT.map((entry) => entry.silhouette));
  let minimumCenterSeparation = Number.POSITIVE_INFINITY;
  LANDMARK_LAYOUT.forEach((entry, index) => {
    LANDMARK_LAYOUT.slice(index + 1).forEach((other) => {
      minimumCenterSeparation = Math.min(minimumCenterSeparation, Math.hypot(entry.x - other.x, entry.z - other.z));
    });
  });
  if (roles.size !== 5) errors.push('landmark roles are not unique');
  if (silhouettes.size !== 5) errors.push('landmark macro silhouettes are not distinct');
  if (!(LANDMARK_LAYOUT[0].x < -4 && LANDMARK_LAYOUT[1].x < -3 && LANDMARK_LAYOUT[1].z > 2)) errors.push('left-side landmark anchors drifted');
  if (!(LANDMARK_LAYOUT[2].x > 3 && LANDMARK_LAYOUT[2].z < 0 && LANDMARK_LAYOUT[3].x > 3 && LANDMARK_LAYOUT[3].z > 2)) errors.push('right-side landmark anchors drifted');
  if (minimumCenterSeparation < 2.5) errors.push('landmark centers are insufficiently separated');
  return {
    valid: errors.length === 0,
    landmarkCount: LANDMARK_LAYOUT.length,
    distinctProfileCount: silhouettes.size,
    minimumCenterSeparation,
    errors,
  };
}

export function validateIsland19CoasterCarnivalRouteClearance(
  probes: readonly { id: string; x: number; z: number; footprintRadius: number }[],
): Island19CoasterCarnivalRouteDiagnostic {
  const violations = probes.filter((probe) => {
    const radius = Math.hypot(probe.x, probe.z);
    return !(radius + probe.footprintRadius <= ROUTE_INNER_RADIUS || radius - probe.footprintRadius >= ROUTE_OUTER_RADIUS);
  }).map((probe) => probe.id);
  return { valid: violations.length === 0, checkedProbes: probes.length, violations };
}

export function validateIsland19CoasterCarnivalBounds(root: THREE.Object3D): Island19CoasterCarnivalBoundsDiagnostic {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const values = [...box.min.toArray(), ...box.max.toArray(), ...size.toArray()];
  const errors: string[] = [];
  if (values.some((value) => !Number.isFinite(value))) errors.push('world bounds contain non-finite values');
  if (size.x > 16 || size.y > 14 || size.z > 16) errors.push('world macro exceeds the authored phone envelope');
  if (size.x < 12 || size.y < 8 || size.z < 10) errors.push('world macro is missing a source-defining extent');
  if (box.min.y > -3.2) errors.push('continuous cliff root is too shallow for the source silhouette');
  return {
    valid: errors.length === 0,
    min: box.min.toArray() as [number, number, number],
    max: box.max.toArray() as [number, number, number],
    size: size.toArray() as [number, number, number],
    errors,
  };
}

export function createIsland19CoasterCarnivalThreeWorld(
  options: Island19CoasterCarnivalWorldOptions = {},
): Island19CoasterCarnivalWorldRuntime {
  const quality = options.quality ?? 'medium';
  const materials = options.materials ?? createIsland19CoasterCarnivalWorldMaterials();
  const track = new Island19CoasterCarnivalTrack(createIsland19CoasterCarnivalSourceTrackPath(), pathSegments(quality) * 8);
  const root = new THREE.Group();
  root.name = 'ISLAND_19_COASTER_CARNIVAL_CIRCUIT_C_FULL_WORLD_ROOT';
  const island = createIslandRoot(quality, materials);
  const supports = createSupportNetwork(track, quality, materials);
  const upperTrack = createTrackSection('p09-coaster-upper-crest', track, 0.1, 0.62, quality, materials);
  const lowerTrack = createTrackSection('p10-coaster-lower-circuit', track, 0.62, 1.1, quality, materials);
  const station = createMomentumStation(materials);
  const ferris = createFerrisHatchery(quality, materials);
  const drop = createCourageDrop(quality, materials);
  const carousel = createWisdomCarousel(quality, materials);
  const castle = createLoopmasterCastle(quality, materials);
  root.add(island, supports.root, upperTrack, lowerTrack, station, ferris, drop, carousel, castle);

  const partRoots: Array<[Island19CoasterCarnivalPartId, THREE.Object3D]> = [
    ['p01-island-mass', island],
    ['p08-coaster-support-foundation', supports.root],
    ['p09-coaster-upper-crest', upperTrack],
    ['p10-coaster-lower-circuit', lowerTrack],
    ['p11-momentum-station', station],
    ['p14-ferris-hatchery', ferris],
    ['p18-courage-drop', drop],
    ['p21-wisdom-carousel', carousel],
    ['p24-loopmaster-castle-portal', castle],
  ];
  const parts = partRoots.map(([id, node]) => ({ id, nodeName: node.name, triangles: countTriangles(node) }));
  root.userData.sculptRuntime = {
    model: 'island-019-coaster-carnival-circuit-c-full-world',
    presentationOnly: true,
    clickable: true,
    explodable: true,
    qualityTier: quality,
    parts,
    pathContract: {
      owner: ISLAND_19_COASTER_CARNIVAL_PATH_OWNER,
      family: 'source-traced-quadratic-line-curve-path',
      arcLengthOwner: true,
      totalLength: track.totalLength,
      segmentCount: track.path.curves.length,
      consumers: ['rails', 'supports', 'elapsed-train-pose', 'portal-clearance'],
    },
    landmarkPlots: LANDMARK_LAYOUT,
    canonicalRouteContract: {
      presentationContextOnly: true,
      routeRadius: ISLAND_3D_ROUTE_RADIUS,
      protectedInnerRadius: ROUTE_INNER_RADIUS,
      protectedOuterRadius: ROUTE_OUTER_RADIUS,
      ownsGameplayTopology: false,
    },
    destructionGroups: partRoots.map(([id]) => ({ id, breakable: false, partIds: [id] })),
  };
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh || node instanceof THREE.InstancedMesh)) return;
    node.castShadow = options.castShadow ?? true;
    node.receiveShadow = options.receiveShadow ?? true;
  });
  root.updateWorldMatrix(true, true);

  const landmarkRouteProbes = LANDMARK_LAYOUT.map((entry) => ({
    id: entry.id,
    x: entry.x,
    z: entry.z,
    footprintRadius: entry.footprintRadius,
  }));
  const routeProbes = [...supports.probes, ...landmarkRouteProbes];
  const diagnostics = {
    closure: validateIsland19CoasterCarnivalTrackClosure(track),
    portal: validateIsland19CoasterCarnivalPortal(track),
    landmarks: validateIsland19CoasterCarnivalLandmarkDistinctness(),
    bounds: validateIsland19CoasterCarnivalBounds(root),
    routeClearance: validateIsland19CoasterCarnivalRouteClearance(routeProbes),
    manifestValid: parts.length === ISLAND_19_COASTER_CARNIVAL_PART_IDS.length
      && parts.every((part, index) => part.id === ISLAND_19_COASTER_CARNIVAL_PART_IDS[index] && part.triangles > 0),
  };
  root.userData.macroDiagnostics = diagnostics;
  return {
    root,
    track,
    materials,
    parts,
    diagnostics,
    getTrainPose: (elapsedSeconds, speedWorldUnitsPerSecond, distanceOffset) => (
      resolveIsland19CoasterCarnivalTrainPose(track, elapsedSeconds, speedWorldUnitsPerSecond, distanceOffset)
    ),
  };
}
