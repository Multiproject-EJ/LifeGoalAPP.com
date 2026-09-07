import * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';
import {
  ISLAND_19_CASTLE_PORTAL,
  ISLAND_19_REPRESENTATIVE_SLICE_PART_IDS,
  ISLAND_19_ROUTE_CLEARANCE_INNER_RADIUS,
  ISLAND_19_TRAIN_SWEPT_ENVELOPE,
  collectIsland19RepresentativeSliceRuntimePartManifest,
  createIsland19CoasterCarnivalMaterials,
  validateIsland19CanonicalRouteClearance,
  validateIsland19RepresentativeSliceRuntimePartManifest,
  type Island19CoasterCarnivalMaterials,
  type Island19CoasterFrame,
  type Island19PortalClearanceValidation,
  type Island19RepresentativeSliceOptions,
  type Island19RepresentativeSlicePartId,
  type Island19RepresentativeSlicePartManifest,
  type Island19RepresentativeSliceRuntimePart,
  type Island19RouteClearanceProbe,
  type Island19RouteClearanceValidation,
  type Island19RuntimeManifestValidation,
  type Island19TrainPose,
} from './Island19CoasterCarnivalRepresentativeSlice';

export const ISLAND_19_CIRCUIT_B_NAME = 'Coaster Carnival Circuit B source-return slice';
export const ISLAND_19_CIRCUIT_B_PATH_OWNER = 'island19-coaster-circuit-b';

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const FRAME_EPSILON_U = 1 / 4096;
const OUTER_RAIL_HALF_SPAN = 0.34;
const INNER_RAIL_HALF_SPAN = 0.225;

const wrapUnit = (value: number) => THREE.MathUtils.euclideanModulo(value, 1);
const qualitySegments = (quality: Island3DQuality) => (
  quality === 'high' ? 260 : quality === 'medium' ? 176 : 112
);
const radialSegments = (quality: Island3DQuality) => (
  quality === 'high' ? 8 : quality === 'medium' ? 7 : 6
);

/**
 * An explicit piecewise-Bezier family, independent from the retired Catmull-Rom
 * experiment. The segment order is the ride order: portal approach, left lift,
 * offset crest, right descent, bilateral foreground oval, rear return.
 */
export function createIsland19CircuitBPath() {
  const path = new THREE.CurvePath<THREE.Vector3>();
  const add = (
    start: THREE.Vector3,
    control1: THREE.Vector3,
    control2: THREE.Vector3,
    end: THREE.Vector3,
  ) => path.add(new THREE.CubicBezierCurve3(start, control1, control2, end));

  const rearPortal = new THREE.Vector3(0, 0.86, -3.6);
  const frontPortal = new THREE.Vector3(0, 0.96, 2.25);
  const leftHigh = new THREE.Vector3(-3.05, 7.55, 0.85);
  const crestExit = new THREE.Vector3(-0.7, 8.9, -0.2);
  const rightLow = new THREE.Vector3(3.25, 1.55, 1.65);
  const rightFront = new THREE.Vector3(3.75, 0.86, 3.75);
  const leftFront = new THREE.Vector3(-3.6, 0.82, 4.0);
  const leftRear = new THREE.Vector3(-3.65, 0.84, 0.2);

  add(
    rearPortal,
    new THREE.Vector3(0, 0.88, -1.6),
    new THREE.Vector3(0, 0.92, 1.55),
    frontPortal,
  );
  add(
    frontPortal,
    new THREE.Vector3(0, 1.08, 2.92),
    new THREE.Vector3(-3.15, 6.8, 1.2),
    leftHigh,
  );
  add(
    leftHigh,
    new THREE.Vector3(-2.95, 8.28, 0.48),
    new THREE.Vector3(-1.4, 9.2, -0.35),
    crestExit,
  );
  add(
    crestExit,
    new THREE.Vector3(0.2, 8.5, 0),
    new THREE.Vector3(2.9, 2.8, 0.8),
    rightLow,
  );
  add(
    rightLow,
    new THREE.Vector3(3.5, 0.86, 2.25),
    new THREE.Vector3(3.85, 0.86, 3.2),
    rightFront,
  );
  add(
    rightFront,
    new THREE.Vector3(3.65, 0.86, 4.3),
    new THREE.Vector3(-3.2, 0.8, 4.45),
    leftFront,
  );
  add(
    leftFront,
    new THREE.Vector3(-4.05, 0.82, 3.5),
    new THREE.Vector3(-4.0, 0.84, 0.8),
    leftRear,
  );
  add(
    leftRear,
    new THREE.Vector3(-3.1, 0.84, -0.7),
    new THREE.Vector3(0, 0.86, -4.3),
    rearPortal.clone(),
  );
  path.arcLengthDivisions = 2048;
  path.updateArcLengths();
  return path;
}

export class Island19CoasterCircuitB {
  readonly path: THREE.CurvePath<THREE.Vector3>;
  readonly curve: THREE.CurvePath<THREE.Vector3>;
  readonly totalLength: number;
  readonly arcLengths: readonly number[];
  readonly frameDivisions: number;

  constructor(path = createIsland19CircuitBPath(), frameDivisions = 768) {
    this.path = path;
    this.curve = path;
    this.frameDivisions = Math.max(128, Math.floor(frameDivisions));
    this.path.arcLengthDivisions = Math.max(1024, this.frameDivisions * 2);
    this.path.updateArcLengths();
    this.totalLength = this.path.getLength();
    this.arcLengths = [...this.path.getLengths(this.path.arcLengthDivisions)];
  }

  distanceToU(distance: number) {
    if (!Number.isFinite(distance) || this.totalLength <= 0) return 0;
    return wrapUnit(distance / this.totalLength);
  }

  uToDistance(u: number) {
    return wrapUnit(u) * this.totalLength;
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

  getFrameAtU(u: number): Island19CoasterFrame {
    const resolvedU = wrapUnit(u);
    const position = this.getPointAtU(resolvedU);
    const tangent = this.getTangentAtU(resolvedU);
    const side = tangent.clone().cross(WORLD_UP);
    if (side.lengthSq() < 0.00001) side.copy(tangent).cross(new THREE.Vector3(0, 0, 1));
    side.normalize();
    const up = side.clone().cross(tangent).normalize();
    const before = this.getTangentAtU(resolvedU - FRAME_EPSILON_U);
    const after = this.getTangentAtU(resolvedU + FRAME_EPSILON_U);
    const signedTurn = before.clone().cross(after).dot(WORLD_UP);
    const bankRadians = THREE.MathUtils.clamp(-signedTurn * 7, -0.24, 0.24);
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

class Island19CircuitBOffsetSection extends THREE.Curve<THREE.Vector3> {
  constructor(
    readonly circuit: Island19CoasterCircuitB,
    readonly startU: number,
    readonly endU: number,
    readonly lateralOffset: number,
    readonly verticalOffset = 0,
  ) {
    super();
  }

  getPoint(t: number, target = new THREE.Vector3()) {
    const u = wrapUnit(THREE.MathUtils.lerp(this.startU, this.endU, THREE.MathUtils.clamp(t, 0, 1)));
    const frame = this.circuit.getFrameAtU(u);
    return target.copy(frame.position)
      .addScaledVector(frame.side, this.lateralOffset)
      .addScaledVector(frame.up, this.verticalOffset);
  }
}

export interface Island19CircuitBValidation {
  valid: boolean;
  curveFamily: 'closed-cubic-bezier-curve-path';
  segmentCount: number;
  totalLength: number;
  seamDistance: number;
  seamTangentDot: number;
  minimumSampleSpacing: number;
  errors: string[];
}

export interface Island19CircuitBRuntime {
  root: THREE.Group;
  circuit: Island19CoasterCircuitB;
  materials: Island19CoasterCarnivalMaterials;
  manifest: Island19RepresentativeSlicePartManifest;
  diagnostics: {
    closedCircuit: Island19CircuitBValidation;
    portalClearance: Island19PortalClearanceValidation;
    routeClearance: Island19RouteClearanceValidation;
    runtimeManifest: Island19RuntimeManifestValidation;
  };
  getTrainPose: (elapsedSeconds: number, speedWorldUnitsPerSecond?: number, distanceOffset?: number) => Island19TrainPose;
}

export function validateIsland19CircuitBClosed(circuit: Island19CoasterCircuitB): Island19CircuitBValidation {
  const start = circuit.path.getPointAt(0);
  const end = circuit.path.getPointAt(1);
  const startTangent = circuit.path.getTangentAt(0).normalize();
  const endTangent = circuit.path.getTangentAt(1).normalize();
  let minimumSampleSpacing = Number.POSITIVE_INFINITY;
  let previous = start;
  for (let index = 1; index <= 768; index += 1) {
    const next = circuit.path.getPointAt(index / 768);
    minimumSampleSpacing = Math.min(minimumSampleSpacing, previous.distanceTo(next));
    previous = next;
  }
  const seamDistance = start.distanceTo(end);
  const seamTangentDot = startTangent.dot(endTangent);
  const errors: string[] = [];
  if (circuit.path.curves.length < 6) errors.push('Circuit B requires a genuinely piecewise CurvePath');
  if (seamDistance > 0.001) errors.push(`seam distance ${seamDistance.toFixed(5)} exceeds 0.001`);
  if (seamTangentDot < 0.999) errors.push(`seam tangent dot ${seamTangentDot.toFixed(5)} is below 0.999`);
  if (circuit.totalLength <= 20) errors.push('circuit length is invalid');
  if (!Number.isFinite(minimumSampleSpacing) || minimumSampleSpacing <= 0.0001) errors.push('circuit contains a collapsed span');
  return {
    valid: errors.length === 0,
    curveFamily: 'closed-cubic-bezier-curve-path',
    segmentCount: circuit.path.curves.length,
    totalLength: circuit.totalLength,
    seamDistance,
    seamTangentDot,
    minimumSampleSpacing,
    errors,
  };
}

export function validateIsland19CircuitBPortalClearance(
  circuit: Island19CoasterCircuitB,
): Island19PortalClearanceValidation {
  let minimumSideMargin = Number.POSITIVE_INFINITY;
  let minimumTopMargin = Number.POSITIVE_INFINITY;
  let minimumBottomMargin = Number.POSITIVE_INFINITY;
  const violations: string[] = [];
  let checkedSamples = 0;
  for (let index = 0; index <= 160; index += 1) {
    const u = THREE.MathUtils.lerp(0, 0.16, index / 160);
    const frame = circuit.getFrameAtU(u);
    if (Math.abs(frame.position.z - ISLAND_19_CASTLE_PORTAL.centerZ) > ISLAND_19_CASTLE_PORTAL.halfDepth) continue;
    checkedSamples += 1;
    const sideMargin = ISLAND_19_CASTLE_PORTAL.clearHalfWidth
      - Math.abs(frame.position.x - ISLAND_19_CASTLE_PORTAL.centerX)
      - ISLAND_19_TRAIN_SWEPT_ENVELOPE.halfWidth;
    const topMargin = ISLAND_19_CASTLE_PORTAL.clearTopY
      - frame.position.y
      - ISLAND_19_TRAIN_SWEPT_ENVELOPE.heightAboveRail;
    const bottomMargin = frame.position.y
      - ISLAND_19_TRAIN_SWEPT_ENVELOPE.depthBelowRail
      - ISLAND_19_CASTLE_PORTAL.clearBottomY;
    minimumSideMargin = Math.min(minimumSideMargin, sideMargin);
    minimumTopMargin = Math.min(minimumTopMargin, topMargin);
    minimumBottomMargin = Math.min(minimumBottomMargin, bottomMargin);
  }
  if (checkedSamples === 0) violations.push('no approach samples crossed the portal depth');
  if (minimumSideMargin <= 0) violations.push(`train exceeds side clearance by ${(-minimumSideMargin).toFixed(4)}`);
  if (minimumTopMargin <= 0) violations.push(`train exceeds top clearance by ${(-minimumTopMargin).toFixed(4)}`);
  if (minimumBottomMargin <= 0) violations.push(`train exceeds bottom clearance by ${(-minimumBottomMargin).toFixed(4)}`);
  return { valid: violations.length === 0, checkedSamples, minimumSideMargin, minimumTopMargin, minimumBottomMargin, violations };
}

export function resolveIsland19CircuitBTrainPoseAtElapsed(
  circuit: Island19CoasterCircuitB,
  elapsedSeconds: number,
  speedWorldUnitsPerSecond = 1.18,
  distanceOffset = 0,
): Island19TrainPose {
  const elapsed = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
  const speed = Number.isFinite(speedWorldUnitsPerSecond) ? Math.max(0, speedWorldUnitsPerSecond) : 0;
  const frame = circuit.getFrameAtDistance(elapsed * speed + distanceOffset);
  const basis = new THREE.Matrix4().makeBasis(frame.side, frame.up, frame.tangent);
  return { ...frame, quaternion: new THREE.Quaternion().setFromRotationMatrix(basis).normalize() };
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
    new THREE.CylinderGeometry(radius * 0.8, radius, delta.length(), segments),
    material,
  );
  mesh.name = name;
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return mesh;
}

function markPartGeometry(root: THREE.Object3D, ownerId: Island19RepresentativeSlicePartId) {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh || node instanceof THREE.InstancedMesh)) return;
    node.userData.partOwnerId = ownerId;
    node.userData.explodeWithParent = true;
  });
}

function countTriangles(root: THREE.Object3D) {
  let triangles = 0;
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh || node instanceof THREE.InstancedMesh)) return;
    const geometryTriangles = node.geometry.index
      ? node.geometry.index.count / 3
      : (node.geometry.getAttribute('position')?.count ?? 0) / 3;
    triangles += geometryTriangles * (node instanceof THREE.InstancedMesh ? node.count : 1);
  });
  return Math.round(triangles);
}

function registerPart(
  id: Island19RepresentativeSlicePartId,
  node: THREE.Object3D,
  module: Island19RepresentativeSliceRuntimePart['module'],
): Island19RepresentativeSliceRuntimePart {
  node.userData.partId = id;
  node.userData.partKind = 'part';
  node.userData.partModule = module;
  return { id, name: id, kind: 'part', nodeName: node.name, module, triangles: countTriangles(node) };
}

function routeSafeFooting(x: number, z: number, radius: number) {
  const distance = Math.hypot(x, z);
  const safeRadius = ISLAND_19_ROUTE_CLEARANCE_INNER_RADIUS - radius - 0.12;
  if (distance + radius <= ISLAND_19_ROUTE_CLEARANCE_INNER_RADIUS) return new THREE.Vector2(x, z);
  return new THREE.Vector2(x / Math.max(distance, 0.001) * safeRadius, z / Math.max(distance, 0.001) * safeRadius);
}

function createCircuitBSupportNetwork(
  circuit: Island19CoasterCircuitB,
  quality: Island3DQuality,
  materials: Island19CoasterCarnivalMaterials,
) {
  const root = new THREE.Group();
  root.name = 'ISLAND_19_CIRCUIT_B_P08_SUPPORT_FOUNDATION_PIVOT';
  const supportUs = quality === 'high'
    ? [0.18, 0.235, 0.29, 0.35, 0.41, 0.47, 0.53, 0.59, 0.65, 0.72, 0.8, 0.88, 0.95]
    : quality === 'medium'
      ? [0.19, 0.26, 0.33, 0.4, 0.47, 0.54, 0.61, 0.7, 0.8, 0.9]
      : [0.2, 0.3, 0.4, 0.5, 0.6, 0.72, 0.84, 0.94];
  const probes: Island19RouteClearanceProbe[] = [];
  supportUs.forEach((u, index) => {
    const frame = circuit.getFrameAtU(u);
    [-1, 1].forEach((side, sideIndex) => {
      const bearing = frame.position.clone().addScaledVector(frame.side, side * OUTER_RAIL_HALF_SPAN).addScaledVector(frame.up, -0.16);
      const safe = routeSafeFooting(bearing.x, bearing.z, 0.17);
      const foot = new THREE.Vector3(safe.x, 0.1, safe.y);
      const probeId = `circuit-b-footing-${index + 1}-${sideIndex + 1}`;
      probes.push({ id: probeId, x: foot.x, z: foot.z, footprintRadius: 0.17 });
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.2, radialSegments(quality)), materials.antiqueGold);
      pad.name = `ISLAND_19_CIRCUIT_B_P08_FOOTING_${index + 1}_${sideIndex + 1}`;
      pad.position.copy(foot);
      root.add(pad);
      root.add(createMemberBetween(
        `ISLAND_19_CIRCUIT_B_P08_GOLD_COLUMN_${index + 1}_${sideIndex + 1}`,
        foot,
        bearing,
        frame.position.y > 5 ? 0.085 : 0.07,
        materials.antiqueGold,
        radialSegments(quality),
      ));
    });
    if (frame.position.y > 2.2) {
      const left = routeSafeFooting(frame.position.x - 0.28, frame.position.z, 0.12);
      const right = routeSafeFooting(frame.position.x + 0.28, frame.position.z, 0.12);
      root.add(createMemberBetween(
        `ISLAND_19_CIRCUIT_B_P08_RED_DIAGONAL_${index + 1}`,
        new THREE.Vector3(left.x, 0.15, left.y),
        frame.position.clone().addScaledVector(frame.side, 0.34).addScaledVector(frame.up, -0.16),
        0.035,
        materials.paintedRedMetal,
        6,
      ));
      root.add(createMemberBetween(
        `ISLAND_19_CIRCUIT_B_P08_GOLD_DIAGONAL_${index + 1}`,
        new THREE.Vector3(right.x, 0.15, right.y),
        frame.position.clone().addScaledVector(frame.side, -0.34).addScaledVector(frame.up, -0.16),
        0.035,
        materials.antiqueGold,
        6,
      ));
    }
  });
  const upperSocket = new THREE.Object3D();
  upperSocket.name = 'ISLAND_19_CIRCUIT_B_P08_UPPER_TRACK_SPINE_SOCKET';
  upperSocket.position.copy(circuit.getPointAtU(0.4));
  const lowerSocket = new THREE.Object3D();
  lowerSocket.name = 'ISLAND_19_CIRCUIT_B_P08_LOWER_TRACK_SPINE_SOCKET';
  lowerSocket.position.copy(circuit.getPointAtU(0.8));
  root.add(upperSocket, lowerSocket);
  root.userData.routeClearanceProbes = probes;
  root.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    qualityTier: quality,
    sockets: { upperTrackSpine: upperSocket.name, lowerTrackSpine: lowerSocket.name },
    colliders: probes.map((probe) => ({ id: probe.id, type: 'cylinder', radius: probe.footprintRadius, isTrigger: false })),
  };
  markPartGeometry(root, 'p08-coaster-support-foundation');
  return { root, probes };
}

function createCircuitBTrackSection(
  partId: 'p09-coaster-upper-crest' | 'p10-coaster-lower-circuit',
  circuit: Island19CoasterCircuitB,
  startU: number,
  endU: number,
  quality: Island3DQuality,
  materials: Island19CoasterCarnivalMaterials,
) {
  const isUpper = partId === 'p09-coaster-upper-crest';
  const root = new THREE.Group();
  root.name = isUpper
    ? 'ISLAND_19_CIRCUIT_B_P09_UPPER_CREST_PIVOT'
    : 'ISLAND_19_CIRCUIT_B_P10_BILATERAL_FOREGROUND_OVAL_PIVOT';
  const railSpecs = [
    [-OUTER_RAIL_HALF_SPAN, 0.072, materials.paintedRedMetal, 'RED_OUTER_LEFT'],
    [OUTER_RAIL_HALF_SPAN, 0.072, materials.paintedRedMetal, 'RED_OUTER_RIGHT'],
    [-INNER_RAIL_HALF_SPAN, 0.038, materials.ivoryRunningRail, 'PALE_INNER_LEFT'],
    [INNER_RAIL_HALF_SPAN, 0.038, materials.ivoryRunningRail, 'PALE_INNER_RIGHT'],
  ] as const;
  const sectionFraction = endU - startU;
  railSpecs.forEach(([offset, radius, material, label]) => {
    const railCurve = new Island19CircuitBOffsetSection(circuit, startU, endU, offset);
    const rail = new THREE.Mesh(
      new THREE.TubeGeometry(
        railCurve,
        Math.max(52, Math.round(qualitySegments(quality) * sectionFraction)),
        radius,
        radialSegments(quality),
        false,
      ),
      material,
    );
    rail.name = `ISLAND_19_CIRCUIT_B_${isUpper ? 'P09' : 'P10'}_${label}_RUNNER`;
    root.add(rail);
  });
  const tieCount = Math.max(16, Math.floor(circuit.totalLength * sectionFraction / (quality === 'high' ? 0.3 : quality === 'medium' ? 0.4 : 0.52)));
  const ties = new THREE.InstancedMesh(new THREE.BoxGeometry(0.84, 0.055, 0.13), materials.ivoryRunningRail, tieCount);
  ties.name = `ISLAND_19_CIRCUIT_B_${isUpper ? 'P09' : 'P10'}_PALE_CROSS_TIE_ARRAY`;
  const matrix = new THREE.Matrix4();
  for (let index = 0; index < tieCount; index += 1) {
    const u = wrapUnit(THREE.MathUtils.lerp(startU, endU, (index + 0.5) / tieCount));
    const frame = circuit.getFrameAtU(u);
    const position = frame.position.clone().addScaledVector(frame.up, -0.11);
    const quaternion = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(frame.side, frame.up, frame.tangent)).normalize();
    matrix.compose(position, quaternion, new THREE.Vector3(1, 1, 1));
    ties.setMatrixAt(index, matrix);
  }
  ties.instanceMatrix.needsUpdate = true;
  root.add(ties);
  const startSocket = new THREE.Object3D();
  startSocket.name = `ISLAND_19_CIRCUIT_B_${isUpper ? 'P09' : 'P10'}_START_SOCKET`;
  startSocket.position.copy(circuit.getPointAtU(startU));
  const endSocket = new THREE.Object3D();
  endSocket.name = `ISLAND_19_CIRCUIT_B_${isUpper ? 'P09' : 'P10'}_END_SOCKET`;
  endSocket.position.copy(circuit.getPointAtU(endU));
  root.add(startSocket, endSocket);
  root.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    qualityTier: quality,
    sockets: { start: startSocket.name, end: endSocket.name },
    colliders: [{ id: `${partId}-circuit-b-envelope`, type: 'curve-envelope', pathOwner: ISLAND_19_CIRCUIT_B_PATH_OWNER, isTrigger: false }],
  };
  markPartGeometry(root, partId);
  return root;
}

function createCircuitBCastlePortal(
  quality: Island3DQuality,
  materials: Island19CoasterCarnivalMaterials,
) {
  const root = new THREE.Group();
  root.name = 'ISLAND_19_CIRCUIT_B_P24_OPEN_CASTLE_PORTAL_PIVOT';
  const depth = ISLAND_19_CASTLE_PORTAL.halfDepth * 2;
  const jambWidth = ISLAND_19_CASTLE_PORTAL.outerHalfWidth - ISLAND_19_CASTLE_PORTAL.masonryInnerHalfWidth;
  const jambCenter = ISLAND_19_CASTLE_PORTAL.masonryInnerHalfWidth + jambWidth / 2;
  [-1, 1].forEach((side) => {
    const jamb = new THREE.Mesh(
      new THREE.BoxGeometry(jambWidth, ISLAND_19_CASTLE_PORTAL.lintelBottomY, depth),
      materials.terracottaStone,
    );
    jamb.name = `ISLAND_19_CIRCUIT_B_P24_${side < 0 ? 'LEFT' : 'RIGHT'}_JAMB_SOLID`;
    jamb.position.set(side * jambCenter, ISLAND_19_CASTLE_PORTAL.lintelBottomY / 2, 0);
    root.add(jamb);
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.39, 2.55, quality === 'high' ? 14 : quality === 'medium' ? 12 : 9),
      materials.ivoryStone,
    );
    tower.name = `ISLAND_19_CIRCUIT_B_P24_${side < 0 ? 'LEFT' : 'RIGHT'}_IVORY_TOWER`;
    tower.position.set(side * 1.22, 1.275, 0);
    root.add(tower);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 0.78, quality === 'high' ? 14 : quality === 'medium' ? 12 : 9),
      materials.patinatedTeal,
    );
    roof.name = `ISLAND_19_CIRCUIT_B_P24_${side < 0 ? 'LEFT' : 'RIGHT'}_TEAL_ROOF`;
    roof.position.set(side * 1.22, 2.92, 0);
    root.add(roof);
  });
  const lintel = new THREE.Mesh(
    new THREE.BoxGeometry(ISLAND_19_CASTLE_PORTAL.outerHalfWidth * 2, 0.58, depth),
    materials.terracottaStone,
  );
  lintel.name = 'ISLAND_19_CIRCUIT_B_P24_LINTEL_SOLID';
  lintel.position.y = ISLAND_19_CASTLE_PORTAL.lintelBottomY + 0.29;
  root.add(lintel);
  [-1, 1].forEach((face) => {
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(0.9, 0.11, 8, quality === 'high' ? 32 : quality === 'medium' ? 24 : 18, Math.PI),
      materials.antiqueGold,
    );
    arch.name = `ISLAND_19_CIRCUIT_B_P24_${face < 0 ? 'FRONT' : 'REAR'}_OPEN_ARCH_TRIM`;
    arch.position.set(0, 1.38, face * (ISLAND_19_CASTLE_PORTAL.halfDepth + 0.02));
    root.add(arch);
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.12, 0.11), materials.ivoryStone);
    cornice.name = `ISLAND_19_CIRCUIT_B_P24_${face < 0 ? 'FRONT' : 'REAR'}_IVORY_CORNICE`;
    cornice.position.set(0, 2.18, face * (ISLAND_19_CASTLE_PORTAL.halfDepth + 0.04));
    root.add(cornice);
  });
  const portalSocket = new THREE.Object3D();
  portalSocket.name = 'ISLAND_19_CIRCUIT_B_P24_PHYSICALLY_EMPTY_THROUGHPASS_SOCKET';
  portalSocket.position.set(0, 0.94, 0);
  portalSocket.userData.clearance = {
    axis: 'local-z',
    width: ISLAND_19_CASTLE_PORTAL.clearHalfWidth * 2,
    height: ISLAND_19_CASTLE_PORTAL.clearTopY - ISLAND_19_CASTLE_PORTAL.clearBottomY,
    depth,
  };
  root.add(portalSocket);
  root.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    qualityTier: quality,
    sockets: { throughpass: portalSocket.name },
    colliders: [
      { id: 'circuit-b-left-jamb', type: 'box', center: [-jambCenter, ISLAND_19_CASTLE_PORTAL.lintelBottomY / 2, 0], size: [jambWidth, ISLAND_19_CASTLE_PORTAL.lintelBottomY, depth] },
      { id: 'circuit-b-right-jamb', type: 'box', center: [jambCenter, ISLAND_19_CASTLE_PORTAL.lintelBottomY / 2, 0], size: [jambWidth, ISLAND_19_CASTLE_PORTAL.lintelBottomY, depth] },
      { id: 'circuit-b-lintel', type: 'box', center: [0, ISLAND_19_CASTLE_PORTAL.lintelBottomY + 0.29, 0], size: [ISLAND_19_CASTLE_PORTAL.outerHalfWidth * 2, 0.58, depth] },
      { id: 'circuit-b-empty-portal', type: 'box', isTrigger: true, center: [0, 1.075, 0], size: [ISLAND_19_CASTLE_PORTAL.clearHalfWidth * 2, ISLAND_19_CASTLE_PORTAL.clearTopY - ISLAND_19_CASTLE_PORTAL.clearBottomY, depth] },
    ],
  };
  markPartGeometry(root, 'p24-loopmaster-castle-portal');
  return root;
}

export function createIsland19CoasterCarnivalCircuitB(
  options: Island19RepresentativeSliceOptions = {},
): Island19CircuitBRuntime {
  const quality = options.quality ?? 'medium';
  const materials = options.materials ?? createIsland19CoasterCarnivalMaterials();
  const circuit = new Island19CoasterCircuitB(createIsland19CircuitBPath(), qualitySegments(quality) * 3);
  const root = new THREE.Group();
  root.name = 'ISLAND_19_COASTER_CARNIVAL_CIRCUIT_B_ROOT';
  const supports = createCircuitBSupportNetwork(circuit, quality, materials);
  const upperTrack = createCircuitBTrackSection('p09-coaster-upper-crest', circuit, 0.12, 0.66, quality, materials);
  const lowerTrack = createCircuitBTrackSection('p10-coaster-lower-circuit', circuit, 0.66, 1.12, quality, materials);
  const portal = createCircuitBCastlePortal(quality, materials);
  root.add(supports.root, upperTrack, lowerTrack, portal);

  const supportPart = registerPart('p08-coaster-support-foundation', supports.root, 'rail-support');
  const upperPart = registerPart('p09-coaster-upper-crest', upperTrack, 'upper-track');
  const lowerPart = registerPart('p10-coaster-lower-circuit', lowerTrack, 'lower-track');
  const portalPart = registerPart('p24-loopmaster-castle-portal', portal, 'castle-portal');
  const routeSocket = new THREE.Object3D();
  routeSocket.name = 'ISLAND_19_CIRCUIT_B_ROUTE_ORIGIN_SOCKET';
  routeSocket.position.copy(circuit.getPointAtU(0));
  root.add(routeSocket);
  root.userData.sculptRuntime = {
    model: 'island-019-coaster-carnival-representative-slice',
    variant: 'circuit-b',
    clickable: true,
    explodable: true,
    qualityTier: quality,
    parts: [supportPart, upperPart, lowerPart, portalPart],
    sockets: {
      routeOrigin: routeSocket.name,
      castlePortal: 'ISLAND_19_CIRCUIT_B_P24_PHYSICALLY_EMPTY_THROUGHPASS_SOCKET',
      upperTrack: 'ISLAND_19_CIRCUIT_B_P08_UPPER_TRACK_SPINE_SOCKET',
      lowerTrack: 'ISLAND_19_CIRCUIT_B_P08_LOWER_TRACK_SPINE_SOCKET',
    },
    colliders: [
      { id: 'island-019-circuit-b-centerline', type: 'closed-curve-envelope', pathOwner: ISLAND_19_CIRCUIT_B_PATH_OWNER, isTrigger: false },
      { id: 'island-019-circuit-b-train-envelope', type: 'closed-curve-envelope', pathOwner: ISLAND_19_CIRCUIT_B_PATH_OWNER, isTrigger: true },
    ],
    destructionGroups: [
      { id: 'coaster', breakable: false, partIds: [supportPart.id, upperPart.id, lowerPart.id] },
      { id: 'castle-portal', breakable: false, partIds: [portalPart.id] },
    ],
    routeContract: {
      curveType: 'closed-cubic-bezier-curve-path',
      pathOwner: ISLAND_19_CIRCUIT_B_PATH_OWNER,
      segmentCount: circuit.path.curves.length,
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
    closedCircuit: validateIsland19CircuitBClosed(circuit),
    portalClearance: validateIsland19CircuitBPortalClearance(circuit),
    routeClearance: validateIsland19CanonicalRouteClearance(supports.probes),
    runtimeManifest: validateIsland19RepresentativeSliceRuntimePartManifest(manifest, nodeNames),
  };
  root.userData.representativeSliceDiagnostics = diagnostics;
  if (ISLAND_19_REPRESENTATIVE_SLICE_PART_IDS.length !== 4) {
    diagnostics.closedCircuit.errors.push('canonical representative scope changed unexpectedly');
    diagnostics.closedCircuit.valid = false;
  }
  return {
    root,
    circuit,
    materials,
    manifest,
    diagnostics,
    getTrainPose: (elapsedSeconds, speedWorldUnitsPerSecond, distanceOffset) => (
      resolveIsland19CircuitBTrainPoseAtElapsed(circuit, elapsedSeconds, speedWorldUnitsPerSecond, distanceOffset)
    ),
  };
}
