import type {
  Island5CameraPresetId,
  IslandCameraTourStep,
} from '../island5ThreePilotContract';
import type { Island15CrystalPalaceRendererLandmarkId } from './Island15CrystalPalaceRuntime';

export type Island15CameraPoint = readonly [number, number, number];
export type Island15PalaceRoomPreset = Island15CrystalPalaceRendererLandmarkId;
export type Island15CameraOrbitMode = 'exterior' | 'authored-interior';
export type Island15CameraIntent =
  | 'hero-exterior'
  | 'playable-overview'
  | 'high-survey'
  | 'true-profile'
  | 'rear-chevet'
  | 'soothing-vista'
  | 'boss-wonder'
  | 'boss-playable'
  | 'room-work'
  | 'room-reveal'
  | 'room-navigation'
  | 'portal-approach'
  | 'portal-stair'
  | 'portal-threshold'
  | 'portal-crossing'
  | 'portal-exit'
  | 'quiet-drift';

export interface Island15CameraEnvelope {
  /** Half of the occupied R17 south/north span. */
  palaceRadius: number;
  /** Height above the palace floor in world units. */
  palaceHeight: number;
}

export interface Island15PalaceFramingBounds {
  minimum: Island15CameraPoint;
  maximum: Island15CameraPoint;
}

/** Fit the mounted palace, including stairs and crown, to the actual viewport.
 * The authored direction and lens remain intact; absent future geometry can
 * no longer force the current palace into a tiny distant composition. */
export function fitIsland15ExteriorCameraPose(
  pose: Island15CameraPose,
  bounds: Island15PalaceFramingBounds,
  aspect: number,
  surfacePoints?: readonly Island15CameraPoint[],
): Island15CameraPose {
  if (pose.orbitMode !== 'exterior' || !Number.isFinite(aspect) || aspect <= 0) return pose;
  if (!bounds.minimum.every(Number.isFinite) || !bounds.maximum.every(Number.isFinite)
    || bounds.maximum.some((value, axis) => value <= bounds.minimum[axis])) return pose;
  const target = bounds.minimum.map((value, axis) => (value + bounds.maximum[axis]) / 2) as unknown as Island15CameraPoint;
  const delta = pose.position.map((value, axis) => value - pose.target[axis]);
  const length = Math.hypot(...delta);
  if (length < 0.001 || pose.fov <= 1 || pose.fov >= 175) return pose;
  const backward = delta.map((value) => value / length);
  const horizontal = Math.hypot(backward[0], backward[2]);
  if (horizontal < 0.001) return pose;
  const right = [backward[2] / horizontal, 0, -backward[0] / horizontal];
  const up = [
    backward[1] * right[2],
    backward[2] * right[0] - backward[0] * right[2],
    -backward[1] * right[0],
  ];
  const dot = (a: number[], b: number[]) => a.reduce((sum, value, axis) => sum + value * b[axis], 0);
  const scenic = pose.intent === 'soothing-vista' || pose.intent === 'high-survey';
  const safeWidth = scenic ? 0.84 : 0.92;
  const safeHeight = scenic ? 0.72 : 0.84;
  const tanVertical = Math.tan(pose.fov * Math.PI / 360);
  let distance = 1;
  const corners = Array.from({ length: 8 }, (_, mask) => bounds.minimum.map((value, axis) => (
    mask & (1 << axis) ? bounds.maximum[axis] : value
  ))) as unknown as Island15CameraPoint[];
  // Surface support avoids reserving empty upper corners around a narrow
  // cathedral spire. Bounds remain a conservative fallback before mesh capture.
  for (const point of surfacePoints?.length ? surfacePoints : corners) {
    const corner = point.map((value, axis) => value - target[axis]);
    const nearOffset = dot(corner, backward);
    distance = Math.max(distance, nearOffset + Math.max(
      Math.abs(dot(corner, right)) / (tanVertical * aspect * safeWidth),
      Math.abs(dot(corner, up)) / (tanVertical * safeHeight),
    ));
  }
  return {
    ...pose,
    position: target.map((value, axis) => value + backward[axis] * (distance + 0.15)) as unknown as Island15CameraPoint,
    target,
  };
}

export interface Island15CameraPose {
  id: string;
  intent: Island15CameraIntent;
  orbitMode: Island15CameraOrbitMode;
  position: Island15CameraPoint;
  target: Island15CameraPoint;
  fov: number;
  durationMs: number;
}

export interface Island15CameraPoseOptions {
  portrait?: boolean;
  envelope?: Partial<Island15CameraEnvelope>;
  /** Retained for loader compatibility. R17 room sockets, not hit anchors, own cameras. */
  anchor?: Island15CameraPoint;
  intent?: 'inspect' | 'build-work' | 'build-reveal';
  /** Camera identity is invariant across L1/L2/L3; only room geometry changes. */
  buildLevel?: 0 | 1 | 2 | 3;
}

export type Island15PortalEntryPhase =
  | 'approach'
  | 'stair-crest'
  | 'threshold'
  | 'crossing'
  | 'boss-wonder'
  | 'boss-settle';

export type Island15PortalExitPhase =
  | 'boss-exit-align'
  | 'narthex-return'
  | 'threshold-return'
  | 'exterior-settle';

export interface Island15PortalEntryStage extends Island15CameraPose {
  focusMode: 'overview' | 'boss';
  phase: Island15PortalEntryPhase;
  cameraInsideOuterThreshold: boolean;
}

export interface Island15PortalExitStage extends Island15CameraPose {
  focusMode: 'overview' | 'boss';
  phase: Island15PortalExitPhase;
  cameraOutsideOuterThreshold: boolean;
}

export interface Island15RoomNavigationStage extends Island15CameraPose {
  controlPosition: Island15CameraPoint;
}

export interface Island15OrbitControlLimits {
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
}

export interface Island15CameraSafetyResult {
  authority: 'r17-semantic-topology-v2';
  cameraSphereRadius: number;
  minimumSurfaceClearance: number;
  nearPlane: number;
  targetDistance: number;
  nearPlanePass: boolean;
  volumeId: string | null;
  boundaryClearance: number | null;
  authoredVolumePass: boolean | null;
  geometryAcceptance: 'pending-r17-palace';
}

type R17RoomCameraGrammar = {
  roomName: string;
  quadrant: 'NW' | 'NE' | 'SW' | 'SE';
  center: Island15CameraPoint;
  minimum: Island15CameraPoint;
  maximum: Island15CameraPoint;
  outward: Island15CameraPoint;
  tangentialWidth: number;
  radialDepth: number;
  clearHeight: number;
  side: 1 | -1;
  workFov: number;
  innerThreshold: Island15CameraPoint;
};

const SQRT_HALF = Math.SQRT1_2;

/** Stable camera/socket coordinates copied from frozen R17 V2 topology. */
export const ISLAND_15_R17_CAMERA_AUTHORITY = Object.freeze({
  id: 'island15-r17-camera-authority-v1',
  source: 'semantic-topology.r17.v2.json',
  coordinateSystem: Object.freeze({ x: '+east', y: '+up', z: '+south/front' }),
  floorY: 0,
  foundationBottomY: -0.3,
  envelope: Object.freeze({ palaceRadius: 13, palaceHeight: 15 }),
  outerBounds: Object.freeze({
    minimum: Object.freeze([-11, -0.3, -12] as const),
    maximum: Object.freeze([11, 15, 14] as const),
  }),
  southPortal: Object.freeze({
    center: Object.freeze([0, 0, 14] as const),
    inward: Object.freeze([0, 0, -1] as const),
    clearHalfWidth: 1.3,
    clearHeight: 4,
  }),
  bossHall: Object.freeze({
    center: Object.freeze([0, 0, 0] as const),
    clearRadius: 3.94,
    clearHeight: 5.8,
    protectedRouteRadii: Object.freeze([3.18, 3.62] as const),
  }),
  cameraSphereRadius: 0.18,
  minimumSurfaceClearance: 0.12,
  nearPlane: 0.1,
} as const);

const R17_ROOM_CAMERA_GRAMMAR: Readonly<Record<Exclude<Island15PalaceRoomPreset, 'boss'>, R17RoomCameraGrammar>> = {
  // Runtime ID -> R17 room identity is explicit. Never infer it from stop
  // order or from the rollback palace's hit-anchor positions.
  hatchery: {
    roomName: 'Frost Nest', quadrant: 'NW', center: [-7.75, 0, -5.4],
    minimum: [-10.45, 0, -9.45], maximum: [-5.05, 4.8, -1.35],
    outward: [-SQRT_HALF, 0, -SQRT_HALF], tangentialWidth: 5.4,
    radialDepth: 8.1, clearHeight: 4.8, side: 1, workFov: 47,
    innerThreshold: [-5.05, 1.65, -6.3],
  },
  event: {
    roomName: 'Aurora Observatory', quadrant: 'NE', center: [7.725, 0, -5.4],
    minimum: [5.1, 0, -9.35], maximum: [10.35, 5.15, -1.45],
    outward: [SQRT_HALF, 0, -SQRT_HALF], tangentialWidth: 5.25,
    radialDepth: 7.9, clearHeight: 5.15, side: -1, workFov: 48,
    innerThreshold: [5.1, 1.65, -6.05],
  },
  wisdom: {
    roomName: 'Crystal Oracle', quadrant: 'SW', center: [-7.725, 0, 6.35],
    minimum: [-10.35, 0, 1.35], maximum: [-5.1, 5.3, 11.35],
    outward: [-SQRT_HALF, 0, SQRT_HALF], tangentialWidth: 5.25,
    radialDepth: 6.5, clearHeight: 5.3, side: 1, workFov: 46,
    innerThreshold: [-5.1, 1.65, 6.65],
  },
  habit: {
    roomName: 'Ice Bastion', quadrant: 'SE', center: [7.75, 0, 6.35],
    minimum: [5.05, 0, 1.45], maximum: [10.45, 4.95, 11.25],
    outward: [SQRT_HALF, 0, SQRT_HALF], tangentialWidth: 5.4,
    radialDepth: 6.5, clearHeight: 4.95, side: -1, workFov: 48,
    innerThreshold: [5.05, 1.65, 6.95],
  },
};

export const ISLAND_15_R17_ROOM_CAMERA_DATA = Object.freeze(R17_ROOM_CAMERA_GRAMMAR);

export const ISLAND_15_PALACE_ROOM_ORDER = [
  'boss',
  'hatchery',
  'event',
  'wisdom',
  'habit',
] as const satisfies readonly Island15PalaceRoomPreset[];

export const ISLAND_15_CAMERA_PRESET_IDS = [
  'overview', 'playable-overview', 'survey', 'orbit-left', 'rear', 'orbit-right',
  ...ISLAND_15_PALACE_ROOM_ORDER,
] as const satisfies readonly Island5CameraPresetId[];

export const ISLAND_15_CAMERA_TOUR_STEPS: readonly IslandCameraTourStep[] = [
  { preset: 'overview', holdMs: 2_200 },
  { preset: 'orbit-left', holdMs: 1_350 },
  { preset: 'survey', holdMs: 1_450 },
  { preset: 'rear', holdMs: 1_350 },
  { preset: 'orbit-right', holdMs: 2_600 },
  { preset: 'boss', holdMs: 1_800 },
  { preset: 'hatchery', holdMs: 1_100 },
  { preset: 'event', holdMs: 1_100 },
  { preset: 'wisdom', holdMs: 1_100 },
  { preset: 'habit', holdMs: 1_100 },
  { preset: 'boss', holdMs: 1_500 },
  { preset: 'overview', holdMs: 1_650 },
] as const;

const DEFAULT_ENVELOPE: Island15CameraEnvelope = {
  palaceRadius: ISLAND_15_R17_CAMERA_AUTHORITY.envelope.palaceRadius,
  palaceHeight: ISLAND_15_R17_CAMERA_AUTHORITY.envelope.palaceHeight,
};

function finite(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function resolveEnvelope(input?: Partial<Island15CameraEnvelope>): Island15CameraEnvelope {
  return {
    palaceRadius: Math.max(DEFAULT_ENVELOPE.palaceRadius, finite(input?.palaceRadius, DEFAULT_ENVELOPE.palaceRadius)),
    palaceHeight: Math.max(DEFAULT_ENVELOPE.palaceHeight, finite(input?.palaceHeight, DEFAULT_ENVELOPE.palaceHeight)),
  };
}

function add(a: Island15CameraPoint, b: Island15CameraPoint): Island15CameraPoint {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function multiply(point: Island15CameraPoint, amount: number): Island15CameraPoint {
  return [point[0] * amount, point[1] * amount, point[2] * amount];
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function sphericalPosition(
  target: Island15CameraPoint,
  azimuthDegrees: number,
  elevationDegrees: number,
  distance: number,
): Island15CameraPoint {
  const azimuth = azimuthDegrees * Math.PI / 180;
  const elevation = elevationDegrees * Math.PI / 180;
  const horizontal = Math.cos(elevation) * distance;
  return [
    target[0] + Math.sin(azimuth) * horizontal,
    target[1] + Math.sin(elevation) * distance,
    target[2] + Math.cos(azimuth) * horizontal,
  ];
}

function roomPoint(grammar: R17RoomCameraGrammar, reveal: boolean): {
  position: Island15CameraPoint;
  target: Island15CameraPoint;
} {
  const u = grammar.outward;
  const v: Island15CameraPoint = [u[2], 0, -u[0]];
  const positionRadial = (reveal ? -0.5 : -0.38) * grammar.radialDepth;
  const positionTangent = (reveal ? 0.11 : 0.18) * grammar.side * grammar.tangentialWidth;
  const position = add(add(grammar.center, multiply(u, positionRadial)), multiply(v, positionTangent));
  const targetRadial = (reveal ? 0.06 : 0.16) * grammar.radialDepth;
  const targetTangent = (reveal ? 0 : -0.04) * grammar.side * grammar.tangentialWidth;
  const target = add(add(grammar.center, multiply(u, targetRadial)), multiply(v, targetTangent));
  // The R17 rooms are intentionally unequal. Preserve the room-local angle while
  // keeping the complete camera sphere (plus clearance) inside each AIR cell.
  const cameraInset = ISLAND_15_R17_CAMERA_AUTHORITY.cameraSphereRadius
    + ISLAND_15_R17_CAMERA_AUTHORITY.minimumSurfaceClearance
    + 0.02;
  return {
    position: [
      clamp(position[0], grammar.minimum[0] + cameraInset, grammar.maximum[0] - cameraInset),
      grammar.clearHeight * (reveal ? 0.54 : 0.32),
      clamp(position[2], grammar.minimum[2] + cameraInset, grammar.maximum[2] - cameraInset),
    ],
    target: [target[0], grammar.clearHeight * (reveal ? 0.37 : 0.3), target[2]],
  };
}

export function resolveIsland15OrbitControlLimits(mode: Island15CameraOrbitMode): Island15OrbitControlLimits {
  return mode === 'authored-interior'
    ? {
        minDistance: 0.42,
        maxDistance: 96,
        minPolarAngle: 5 * Math.PI / 180,
        maxPolarAngle: 175 * Math.PI / 180,
      }
    : {
        minDistance: 5.4,
        maxDistance: 72,
        minPolarAngle: 28 * Math.PI / 180,
        maxPolarAngle: 69 * Math.PI / 180,
      };
}

export function isIsland15PalaceRoomPreset(
  preset: Island5CameraPresetId | 'manual',
): preset is Island15PalaceRoomPreset {
  return ISLAND_15_PALACE_ROOM_ORDER.includes(preset as Island15PalaceRoomPreset);
}

export function isIsland15ExteriorCameraPreset(preset: Island5CameraPresetId | 'manual'): boolean {
  return preset === 'overview' || preset === 'survey' || preset === 'orbit-left'
    || preset === 'orbit-right' || preset === 'rear';
}

export function resolveIsland15CameraPose(
  preset: Island5CameraPresetId,
  options: Island15CameraPoseOptions = {},
): Island15CameraPose | null {
  const portrait = options.portrait ?? true;
  const envelope = resolveEnvelope(options.envelope);
  const architecturalTarget: Island15CameraPoint = [0, envelope.palaceHeight * 0.347, 0];

  if (preset === 'overview') {
    return {
      id: 'island15-r17-closed-hero-front-right', intent: 'hero-exterior', orbitMode: 'exterior',
      position: sphericalPosition(architecturalTarget, 30, 22, envelope.palaceRadius * (portrait ? 3.23 : 3.02)),
      target: architecturalTarget, fov: 39, durationMs: 1_800,
    };
  }
  if (preset === 'playable-overview') {
    const target: Island15CameraPoint = [0, 0.62, -0.38];
    return {
      id: 'island15-r17-high-playable-overview', intent: 'playable-overview', orbitMode: 'authored-interior',
      position: sphericalPosition(target, 35, 58, envelope.palaceRadius * 3.23),
      target, fov: 42, durationMs: 2_200,
    };
  }
  if (preset === 'survey') {
    return {
      id: 'island15-r17-closed-architectural-survey', intent: 'high-survey', orbitMode: 'exterior',
      position: sphericalPosition(architecturalTarget, 35, 54, envelope.palaceRadius * 2.86),
      target: architecturalTarget, fov: 40, durationMs: 2_200,
    };
  }
  if (preset === 'orbit-left') {
    return {
      id: 'island15-r17-exact-east-profile', intent: 'true-profile', orbitMode: 'exterior',
      position: sphericalPosition(architecturalTarget, 90, 16, envelope.palaceRadius * 3.07),
      target: architecturalTarget, fov: 38, durationMs: 2_000,
    };
  }
  if (preset === 'rear') {
    const target: Island15CameraPoint = [0, envelope.palaceHeight * 0.31, -envelope.palaceRadius * 0.1];
    return {
      id: 'island15-r17-true-north-rear-chevet', intent: 'rear-chevet', orbitMode: 'exterior',
      position: sphericalPosition(target, 180, 18, envelope.palaceRadius * 3.12),
      target, fov: 39, durationMs: 2_050,
    };
  }
  if (preset === 'orbit-right') {
    const target: Island15CameraPoint = [-envelope.palaceRadius * 0.08, envelope.palaceHeight * 0.33, -envelope.palaceRadius * 0.035];
    return {
      id: 'island15-r17-soothing-rear-vista', intent: 'soothing-vista', orbitMode: 'exterior',
      position: sphericalPosition(target, 155, 17, envelope.palaceRadius * 3.35),
      target, fov: 40, durationMs: 2_650,
    };
  }
  if (preset === 'boss') {
    return {
      id: 'island15-r17-boss-playable-settle', intent: 'boss-playable', orbitMode: 'authored-interior',
      position: [0, 7.1, 4.75], target: [0, 0.62, -0.38],
      fov: portrait ? 62 : 60, durationMs: 1_450,
    };
  }
  if (!isIsland15PalaceRoomPreset(preset)) return null;
  const grammar = R17_ROOM_CAMERA_GRAMMAR[preset];
  const reveal = (options.intent ?? 'inspect') === 'build-reveal';
  const points = roomPoint(grammar, reveal);
  return {
    id: `island15-r17-${preset}-${reveal ? 'build-reveal' : 'work-three-quarter'}`,
    intent: reveal ? 'room-reveal' : 'room-work', orbitMode: 'authored-interior',
    position: points.position, target: points.target,
    fov: grammar.workFov + (reveal ? 3 : 0), durationMs: reveal ? 1_550 : 1_150,
  };
}

export function resolveIsland15PortalEntrySequence(
  options: Pick<Island15CameraPoseOptions, 'portrait' | 'envelope'> = {},
): readonly Island15PortalEntryStage[] {
  const boss = resolveIsland15CameraPose('boss', options);
  if (!boss) return [];
  return [
    { id: 'island15-r17-facade-approach', intent: 'portal-approach', orbitMode: 'authored-interior', phase: 'approach', focusMode: 'overview', cameraInsideOuterThreshold: false, position: [-0.55, 2.2, 18.3], target: [0, 3.15, 14], fov: 45, durationMs: 1_550 },
    { id: 'island15-r17-stair-crest', intent: 'portal-stair', orbitMode: 'authored-interior', phase: 'stair-crest', focusMode: 'overview', cameraInsideOuterThreshold: false, position: [0, 1.9, 16], target: [0, 2.35, 13.3], fov: 48, durationMs: 900 },
    { id: 'island15-r17-outer-threshold', intent: 'portal-threshold', orbitMode: 'authored-interior', phase: 'threshold', focusMode: 'overview', cameraInsideOuterThreshold: false, position: [0, 2.05, 14.3], target: [0, 2.25, 12], fov: 50, durationMs: 780 },
    { id: 'island15-r17-narthex-crossing', intent: 'portal-crossing', orbitMode: 'authored-interior', phase: 'crossing', focusMode: 'overview', cameraInsideOuterThreshold: true, position: [0, 2.05, 12.45], target: [0, 2.25, 8.5], fov: 50, durationMs: 950 },
    { id: 'island15-r17-boss-low-wonder', intent: 'boss-wonder', orbitMode: 'authored-interior', phase: 'boss-wonder', focusMode: 'boss', cameraInsideOuterThreshold: true, position: [0, 2.15, 4.15], target: [0, 5.7, -0.4], fov: 52, durationMs: 1_450 },
    { ...boss, id: 'island15-r17-boss-playable-settle', phase: 'boss-settle', focusMode: 'boss', cameraInsideOuterThreshold: true },
  ] as const;
}

export function resolveIsland15PortalExitSequence(
  options: Pick<Island15CameraPoseOptions, 'portrait' | 'envelope'> = {},
): readonly Island15PortalExitStage[] {
  const hero = resolveIsland15CameraPose('overview', options);
  if (!hero) return [];
  return [
    { id: 'island15-r17-boss-exit-align', intent: 'portal-exit', orbitMode: 'authored-interior', phase: 'boss-exit-align', focusMode: 'boss', cameraOutsideOuterThreshold: false, position: [0, 2.15, 4.15], target: [0, 2.25, 9.2], fov: 52, durationMs: 900 },
    { id: 'island15-r17-narthex-return', intent: 'portal-exit', orbitMode: 'authored-interior', phase: 'narthex-return', focusMode: 'boss', cameraOutsideOuterThreshold: false, position: [0, 2.05, 12.45], target: [0, 2.25, 15.1], fov: 50, durationMs: 950 },
    { id: 'island15-r17-threshold-return', intent: 'portal-exit', orbitMode: 'authored-interior', phase: 'threshold-return', focusMode: 'boss', cameraOutsideOuterThreshold: true, position: [0, 2.05, 14.3], target: [0, 2.35, 16.2], fov: 50, durationMs: 780 },
    { ...hero, id: 'island15-r17-exterior-restored-hero', phase: 'exterior-settle', focusMode: 'overview', cameraOutsideOuterThreshold: true },
  ] as const;
}

export function resolveIsland15RoomNavigationControl(
  from: Island15PalaceRoomPreset,
  to: Island15PalaceRoomPreset,
): Island15CameraPoint | null {
  if (from === to) return null;
  if (from === 'boss' || to === 'boss') {
    const endpoint = from === 'boss' ? to : from;
    if (endpoint === 'boss') return null;
    const grammar = R17_ROOM_CAMERA_GRAMMAR[endpoint];
    return [
      grammar.quadrant.endsWith('E') ? 1.66 : -1.66,
      1.75,
      grammar.quadrant.startsWith('N') ? -1.66 : 1.66,
    ];
  }
  const fromEast = R17_ROOM_CAMERA_GRAMMAR[from].quadrant.endsWith('E');
  const toEast = R17_ROOM_CAMERA_GRAMMAR[to].quadrant.endsWith('E');
  return [fromEast === toEast ? (fromEast ? 2.35 : -2.35) : (fromEast ? 1.66 : -1.66), 1.75, 0];
}

export function resolveIsland15RoomNavigationHallPose(
  from: Island15PalaceRoomPreset,
  to: Island15PalaceRoomPreset,
): Island15RoomNavigationStage | null {
  const controlPosition = resolveIsland15RoomNavigationControl(from, to);
  if (!controlPosition) return null;
  const endpoint = from === 'boss' ? to : from;
  if (endpoint === 'boss') return null;
  return {
    id: `island15-r17-${from}-to-${to}-boss-hall-arc`, intent: 'room-navigation', orbitMode: 'authored-interior',
    position: [controlPosition[0], 1.75, controlPosition[2]], target: [0, 1.5, 0],
    controlPosition, fov: 58, durationMs: 1_050,
  };
}

export function resolveIsland15CameraPoseSafety(pose: Island15CameraPose): Island15CameraSafetyResult {
  const targetDistance = Math.hypot(
    pose.position[0] - pose.target[0], pose.position[1] - pose.target[1], pose.position[2] - pose.target[2],
  );
  const roomEntry = Object.entries(R17_ROOM_CAMERA_GRAMMAR)
    .find(([rendererId]) => pose.id.includes(`-${rendererId}-`)) as [string, R17RoomCameraGrammar] | undefined;
  const grammar = roomEntry?.[1];
  const boundaryClearance = grammar
    ? Math.min(
        pose.position[0] - grammar.minimum[0], grammar.maximum[0] - pose.position[0],
        pose.position[1] - grammar.minimum[1], grammar.maximum[1] - pose.position[1],
        pose.position[2] - grammar.minimum[2], grammar.maximum[2] - pose.position[2],
      ) - ISLAND_15_R17_CAMERA_AUTHORITY.cameraSphereRadius
    : null;
  const volumeSuffix = roomEntry?.[0] === 'event' ? 'aurora-observatory'
    : roomEntry?.[0] === 'wisdom' ? 'crystal-oracle'
      : roomEntry?.[0] === 'habit' ? 'ice-bastion'
        : roomEntry ? 'frost-nest' : null;
  return {
    authority: 'r17-semantic-topology-v2',
    cameraSphereRadius: ISLAND_15_R17_CAMERA_AUTHORITY.cameraSphereRadius,
    minimumSurfaceClearance: ISLAND_15_R17_CAMERA_AUTHORITY.minimumSurfaceClearance,
    nearPlane: ISLAND_15_R17_CAMERA_AUTHORITY.nearPlane,
    targetDistance,
    nearPlanePass: targetDistance - ISLAND_15_R17_CAMERA_AUTHORITY.nearPlane >= ISLAND_15_R17_CAMERA_AUTHORITY.minimumSurfaceClearance,
    volumeId: volumeSuffix ? `air:${volumeSuffix}` : null,
    boundaryClearance,
    authoredVolumePass: boundaryClearance === null ? null : boundaryClearance >= ISLAND_15_R17_CAMERA_AUTHORITY.minimumSurfaceClearance,
    geometryAcceptance: 'pending-r17-palace',
  };
}

export function hashIsland15CameraPose(pose: Island15CameraPose): string {
  const payload = [pose.id, pose.intent, pose.orbitMode, ...pose.position, ...pose.target, pose.fov, pose.durationMs].join('|');
  let hash = 0x811c9dc5;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function resolveIsland15QuietDriftPose(options: {
  position: Island15CameraPoint;
  target: Island15CameraPoint;
  context: 'board' | 'build-modal';
  step: number;
  orbitMode?: Island15CameraOrbitMode;
}): Island15CameraPose {
  const offsetX = options.position[0] - options.target[0];
  const offsetY = options.position[1] - options.target[1];
  const offsetZ = options.position[2] - options.target[2];
  const direction = options.step % 2 === 0 ? 1 : -1;
  const angle = direction * (options.context === 'build-modal' ? 0.045 : 0.07);
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const rotatedX = offsetX * cosine + offsetZ * sine;
  const rotatedZ = -offsetX * sine + offsetZ * cosine;
  const verticalBreath = options.context === 'build-modal' ? 0.08 : 0.16;
  return {
    id: `island15-${options.context}-quiet-drift-${options.step}`, intent: 'quiet-drift',
    orbitMode: options.orbitMode ?? (options.context === 'build-modal' ? 'authored-interior' : 'exterior'),
    position: [options.target[0] + rotatedX, options.target[1] + offsetY + Math.sin(options.step * 1.7) * verticalBreath, options.target[2] + rotatedZ],
    target: options.target, fov: Number.NaN,
    durationMs: options.context === 'build-modal' ? 4_800 : 8_600,
  };
}
