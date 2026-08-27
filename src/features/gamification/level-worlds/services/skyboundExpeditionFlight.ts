import type { SkyboundAircraftId } from './skyboundPilotAcademy';

export type SkyboundLevelId = 'meadow' | 'coast' | 'canyon' | 'storm' | 'stratosphere';
export type SkyboundFlightStatus = 'flying' | 'landed' | 'crashed' | 'finished';
export type SkyboundTerminalReason = 'goal' | 'touchdown' | 'hard_impact' | 'integrity_failure' | null;
export type SkyboundUpgradeKind = 'launcher' | 'airframe' | 'engine';
export type SkyboundCourseObjectKind = 'salvage' | 'wind_ring' | 'hazard';

export interface SkyboundUpgrades {
  launcher: number;
  airframe: number;
  engine: number;
}

export interface SkyboundLevelDefinition {
  id: SkyboundLevelId;
  name: string;
  subtitle: string;
  goalDistance: number;
  gravity: number;
  drag: number;
  liftScale: number;
  windStrength: number;
  skyTop: string;
  skyBottom: string;
  ground: string;
  accent: string;
}

export interface SkyboundLaunchInput {
  power: number;
  angleDeg: number;
  upgrades: SkyboundUpgrades;
  levelId: SkyboundLevelId;
  goalDistance?: number;
  aircraftId?: SkyboundAircraftId;
}

export interface SkyboundCourseObject {
  id: string;
  kind: SkyboundCourseObjectKind;
  x: number;
  y: number;
  lateralX?: number;
  radius: number;
}

export interface SkyboundFlightState {
  status: SkyboundFlightStatus;
  levelId: SkyboundLevelId;
  aircraftId: SkyboundAircraftId;
  x: number;
  y: number;
  lateralX: number;
  vx: number;
  vy: number;
  lateralVelocity: number;
  pitchRad: number;
  bankRad: number;
  fuel: number;
  stabilizer: number;
  elapsedMs: number;
  airborneMs: number;
  groundContactMs: number;
  maxAltitude: number;
  boostUsed: number;
  stabilizerUsed: number;
  goalDistance: number;
  resolvedObjectIds: readonly string[];
  resolvedNearMissObjectIds: readonly string[];
  salvageCollected: number;
  ringsCleared: number;
  hazardHits: number;
  nearMisses: number;
  integrity: number;
  detachedPartIds: readonly string[];
  impactSerial: number;
  bestStreak: number;
  currentStreak: number;
  smoothFlightMs: number;
  stallMs: number;
  terrainSkims: number;
  terminalReason: SkyboundTerminalReason;
}

export interface SkyboundFlightControl {
  pitch: number;
  steer?: number;
  boost: boolean;
  stabilize?: boolean;
}

export const SKYBOUND_MAX_UPGRADE_LEVEL = 5;
export const SKYBOUND_MAX_STEP_MS = 64;

export const SKYBOUND_LEVELS: readonly SkyboundLevelDefinition[] = [
  {
    id: 'meadow',
    name: 'Meadow Run',
    subtitle: 'Learn the wind',
    goalDistance: 360,
    gravity: 11.4,
    drag: 0.014,
    liftScale: 1,
    windStrength: 1.8,
    skyTop: '#287ad5',
    skyBottom: '#b9efff',
    ground: '#4f9b49',
    accent: '#ffe27a',
  },
  {
    id: 'coast', name: 'Coastal Airfield', subtitle: 'Build flight energy', goalDistance: 650,
    gravity: 11.7, drag: 0.015, liftScale: 0.98, windStrength: 3.2,
    skyTop: '#1765a4', skyBottom: '#c6f4ff', ground: '#467c5a', accent: '#ffe07a',
  },
  {
    id: 'canyon',
    name: 'Canyon Lift',
    subtitle: 'Ride the rising air',
    goalDistance: 880,
    gravity: 11.8,
    drag: 0.016,
    liftScale: 0.95,
    windStrength: 4.2,
    skyTop: '#6849bd',
    skyBottom: '#f4b26c',
    ground: '#9a5335',
    accent: '#8df5e6',
  },
  {
    id: 'storm',
    name: 'Storm Passage',
    subtitle: 'Master the gusts',
    goalDistance: 1260,
    gravity: 12.1,
    drag: 0.018,
    liftScale: 0.9,
    windStrength: 7,
    skyTop: '#17274d',
    skyBottom: '#7587ae',
    ground: '#293d4d',
    accent: '#f9df63',
  },
  {
    id: 'stratosphere', name: 'Goldwing Stratosphere', subtitle: 'Earn the final wings', goalDistance: 1660,
    gravity: 10.8, drag: 0.012, liftScale: 1.04, windStrength: 6.2,
    skyTop: '#07162f', skyBottom: '#5f8fd2', ground: '#3d536d', accent: '#ffe36d',
  },
] as const;

export const SKYBOUND_STARTER_UPGRADES: SkyboundUpgrades = {
  launcher: 0,
  airframe: 0,
  engine: 0,
};

const SKYBOUND_COURSE_OBJECTS: Record<SkyboundLevelId, readonly SkyboundCourseObject[]> = {
  meadow: [
    { id: 'meadow-salvage-1', kind: 'salvage', x: 54, y: 38, radius: 7 },
    { id: 'meadow-salvage-2', kind: 'salvage', x: 69, y: 47, lateralX: -4, radius: 7 },
    { id: 'meadow-salvage-3', kind: 'salvage', x: 84, y: 54, lateralX: 4, radius: 7 },
    { id: 'meadow-ring-1', kind: 'wind_ring', x: 120, y: 61, radius: 17 },
    { id: 'meadow-salvage-4', kind: 'salvage', x: 151, y: 62, lateralX: 6, radius: 7 },
    { id: 'meadow-salvage-5', kind: 'salvage', x: 166, y: 59, lateralX: 1, radius: 7 },
    { id: 'meadow-salvage-6', kind: 'salvage', x: 181, y: 54, lateralX: -5, radius: 7 },
    { id: 'meadow-hazard-1', kind: 'hazard', x: 214, y: 35, radius: 15 },
    { id: 'meadow-ring-2', kind: 'wind_ring', x: 260, y: 36, lateralX: -5, radius: 17 },
    { id: 'meadow-hazard-2', kind: 'hazard', x: 292, y: 18, lateralX: 6, radius: 12 },
  ],
  coast: [
    { id:'coast-salvage-1',kind:'salvage',x:62,y:37,lateralX:-3,radius:7 },
    { id:'coast-salvage-2',kind:'salvage',x:78,y:43,lateralX:1,radius:7 },
    { id:'coast-ring-1',kind:'wind_ring',x:126,y:54,lateralX:5,radius:17 },
    { id:'coast-hazard-1',kind:'hazard',x:184,y:34,lateralX:-7,radius:16 },
    { id:'coast-salvage-3',kind:'salvage',x:226,y:60,lateralX:4,radius:7 },
    { id:'coast-ring-2',kind:'wind_ring',x:286,y:67,lateralX:-4,radius:17 },
    { id:'coast-hazard-2',kind:'hazard',x:346,y:48,lateralX:7,radius:17 },
    { id:'coast-salvage-4',kind:'salvage',x:398,y:72,lateralX:-5,radius:7 },
    { id:'coast-ring-3',kind:'wind_ring',x:466,y:64,lateralX:3,radius:17 },
    { id:'coast-salvage-5',kind:'salvage',x:520,y:55,lateralX:0,radius:7 },
    { id:'coast-ring-4',kind:'wind_ring',x:590,y:43,lateralX:-6,radius:17 },
  ],
  canyon: [
    { id: 'canyon-salvage-1', kind: 'salvage', x: 58, y: 44, radius: 7 },
    { id: 'canyon-salvage-2', kind: 'salvage', x: 73, y: 53, lateralX: -5, radius: 7 },
    { id: 'canyon-ring-1', kind: 'wind_ring', x: 112, y: 67, lateralX: -4, radius: 17 },
    { id: 'canyon-hazard-1', kind: 'hazard', x: 165, y: 49, radius: 17 },
    { id: 'canyon-salvage-3', kind: 'salvage', x: 203, y: 78, lateralX: 7, radius: 7 },
    { id: 'canyon-salvage-4', kind: 'salvage', x: 219, y: 82, lateralX: 2, radius: 7 },
    { id: 'canyon-salvage-5', kind: 'salvage', x: 235, y: 79, lateralX: -4, radius: 7 },
    { id: 'canyon-ring-2', kind: 'wind_ring', x: 284, y: 67, lateralX: 5, radius: 17 },
    { id: 'canyon-hazard-2', kind: 'hazard', x: 348, y: 43, radius: 18 },
    { id: 'canyon-salvage-6', kind: 'salvage', x: 392, y: 69, radius: 7 },
    { id: 'canyon-salvage-7', kind: 'salvage', x: 408, y: 62, radius: 7 },
    { id: 'canyon-ring-3', kind: 'wind_ring', x: 455, y: 48, lateralX: -6, radius: 17 },
  ],
  storm: [
    { id: 'storm-ring-1', kind: 'wind_ring', x: 92, y: 57, radius: 16 },
    { id: 'storm-salvage-1', kind: 'salvage', x: 124, y: 68, radius: 7 },
    { id: 'storm-salvage-2', kind: 'salvage', x: 140, y: 73, radius: 7 },
    { id: 'storm-hazard-1', kind: 'hazard', x: 184, y: 55, radius: 18 },
    { id: 'storm-ring-2', kind: 'wind_ring', x: 245, y: 86, radius: 16 },
    { id: 'storm-salvage-3', kind: 'salvage', x: 281, y: 92, radius: 7 },
    { id: 'storm-salvage-4', kind: 'salvage', x: 298, y: 86, radius: 7 },
    { id: 'storm-hazard-2', kind: 'hazard', x: 351, y: 62, radius: 19 },
    { id: 'storm-ring-3', kind: 'wind_ring', x: 425, y: 73, radius: 16 },
    { id: 'storm-salvage-5', kind: 'salvage', x: 466, y: 78, radius: 7 },
    { id: 'storm-salvage-6', kind: 'salvage', x: 483, y: 70, radius: 7 },
    { id: 'storm-hazard-3', kind: 'hazard', x: 548, y: 48, radius: 18 },
    { id: 'storm-ring-4', kind: 'wind_ring', x: 620, y: 58, radius: 16 },
  ],
  stratosphere: [
    { id:'strato-ring-1',kind:'wind_ring',x:100,y:74,lateralX:0,radius:17 },
    { id:'strato-salvage-1',kind:'salvage',x:138,y:82,lateralX:-4,radius:7 },
    { id:'strato-salvage-2',kind:'salvage',x:154,y:86,lateralX:2,radius:7 },
    { id:'strato-hazard-1',kind:'hazard',x:206,y:65,lateralX:8,radius:17 },
    { id:'strato-ring-2',kind:'wind_ring',x:268,y:90,lateralX:-6,radius:17 },
    { id:'strato-salvage-3',kind:'salvage',x:306,y:97,lateralX:-2,radius:7 },
    { id:'strato-ring-3',kind:'wind_ring',x:370,y:84,lateralX:6,radius:17 },
    { id:'strato-hazard-2',kind:'hazard',x:430,y:70,lateralX:-8,radius:17 },
    { id:'strato-salvage-4',kind:'salvage',x:474,y:91,lateralX:3,radius:7 },
    { id:'strato-ring-4',kind:'wind_ring',x:536,y:80,lateralX:0,radius:17 },
  ],
};

const AIRCRAFT_TUNING: Record<SkyboundAircraftId, { speed:number; lift:number; control:number; fuel:number; stability:number; integrity:number }> = {
  toy_glider: { speed:1,lift:1,control:1,fuel:1,stability:1,integrity:3 },
  prop_trainer: { speed:1.16,lift:1.08,control:1.08,fuel:1.18,stability:1.18,integrity:3 },
  jet_trainer: { speed:1.34,lift:1.05,control:1.16,fuel:1.4,stability:1.22,integrity:4 },
  storm_interceptor: { speed:1.48,lift:1.12,control:1.26,fuel:1.55,stability:1.55,integrity:4 },
  goldwing_fighter: { speed:1.62,lift:1.18,control:1.36,fuel:1.75,stability:1.72,integrity:5 },
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function getSkyboundLevel(levelId: SkyboundLevelId): SkyboundLevelDefinition {
  return SKYBOUND_LEVELS.find((level) => level.id === levelId) ?? SKYBOUND_LEVELS[0];
}

export function getSkyboundCourseObjects(levelId: SkyboundLevelId, goalDistance = getSkyboundLevel(levelId).goalDistance): readonly SkyboundCourseObject[] {
  const authored = SKYBOUND_COURSE_OBJECTS[levelId].filter((object) => object.x <= goalDistance + 20);
  const objects = [...authored];
  const lastX = objects.reduce((value, object) => Math.max(value, object.x), 0);
  for (let section = 0, x = lastX + 62; x < goalDistance - 22; section += 1, x += 72) {
    const wave = Math.sin((section + levelId.length) * 1.71);
    const y = (levelId === 'stratosphere' ? 86 : levelId === 'storm' ? 70 : levelId === 'canyon' ? 61 : 52) + wave * 18;
    const lateralX = Math.round(Math.sin(section * 2.17 + levelId.length) * 8);
    const kind: SkyboundCourseObjectKind = section % 4 === 2 ? 'hazard' : section % 3 === 0 ? 'wind_ring' : 'salvage';
    objects.push({ id:`${levelId}-extended-${section}`,kind,x,y,lateralX,radius:kind==='salvage'?7:17 });
    if (kind === 'salvage') objects.push({ id:`${levelId}-extended-${section}-pair`,kind,x:x+14,y:y+4,lateralX:lateralX+2,radius:7 });
  }
  const trainingLanes = [-9, 9, -12, 12, -7, 14, -14, 7];
  return objects.map((object) => {
    const laneCenter = trainingLanes[Math.floor(object.x / 90) % trainingLanes.length];
    return {
      ...object,
      lateralX: clamp(laneCenter + ((object.lateralX ?? 0) * 0.35), -18, 18),
    };
  });
}

export function getSkyboundGroundHeight(levelId: SkyboundLevelId, x: number): number {
  const safeX = Math.max(0, x);
  if (levelId === 'meadow') {
    return Math.max(0, (Math.sin(safeX / 54) * 2.2) + (Math.sin(safeX / 127) * 1.4));
  }
  if (levelId === 'coast') return Math.max(0, 2 + Math.sin(safeX / 63) * 2 + Math.sin(safeX / 137) * 1.4);
  if (levelId === 'canyon') {
    return Math.max(0, 6 + (Math.sin(safeX / 45) * 5) + (Math.sin(safeX / 113) * 3));
  }
  if (levelId === 'storm') return Math.max(0, 3 + (Math.sin(safeX / 37) * 3.5) + (Math.sin(safeX / 89) * 2.5));
  return Math.max(0, -1 + Math.sin(safeX / 91) * 1.2);
}

export function getSkyboundUpgradeCost(kind: SkyboundUpgradeKind, currentLevel: number): number {
  const boundedLevel = clamp(Math.floor(currentLevel), 0, SKYBOUND_MAX_UPGRADE_LEVEL);
  const baseCost = kind === 'launcher' ? 110 : kind === 'airframe' ? 125 : 135;
  return baseCost + (boundedLevel * boundedLevel * 34) + (boundedLevel * 70);
}

export function upgradeSkyboundPart(
  upgrades: SkyboundUpgrades,
  kind: SkyboundUpgradeKind,
): SkyboundUpgrades {
  if (upgrades[kind] >= SKYBOUND_MAX_UPGRADE_LEVEL) return upgrades;
  return { ...upgrades, [kind]: upgrades[kind] + 1 };
}

export function createSkyboundFlight(input: SkyboundLaunchInput): SkyboundFlightState {
  const level = getSkyboundLevel(input.levelId);
  const aircraftId = input.aircraftId ?? 'toy_glider';
  const tuning = AIRCRAFT_TUNING[aircraftId];
  const power = clamp(input.power, 0, 1);
  const angleRad = (clamp(input.angleDeg, 12, 58) * Math.PI) / 180;
  const launchSpeed = (46 + (input.upgrades.launcher * 6.5)) * (0.38 + (power * 0.62)) * tuning.speed;
  const startY = getSkyboundGroundHeight(level.id, 0) + 6;

  return {
    status: 'flying',
    levelId: level.id,
    aircraftId,
    x: 0,
    y: startY,
    lateralX: 0,
    vx: Math.cos(angleRad) * launchSpeed,
    vy: Math.sin(angleRad) * launchSpeed,
    lateralVelocity: 0,
    pitchRad: angleRad,
    bankRad: 0,
    fuel: (1 + (input.upgrades.engine * 0.18)) * tuning.fuel,
    stabilizer: (1 + (input.upgrades.airframe * 0.12)) * tuning.stability,
    elapsedMs: 0,
    airborneMs: 0,
    groundContactMs: 0,
    maxAltitude: startY,
    boostUsed: 0,
    stabilizerUsed: 0,
    goalDistance: clamp(input.goalDistance ?? level.goalDistance, 80, level.goalDistance),
    resolvedObjectIds: [],
    resolvedNearMissObjectIds: [],
    salvageCollected: 0,
    ringsCleared: 0,
    hazardHits: 0,
    nearMisses: 0,
    integrity: tuning.integrity,
    detachedPartIds: [],
    impactSerial: 0,
    bestStreak: 0,
    currentStreak: 0,
    smoothFlightMs: 0,
    stallMs: 0,
    terrainSkims: 0,
    terminalReason: null,
  };
}

function getDeterministicWind(level: SkyboundLevelDefinition, x: number, elapsedMs: number) {
  const time = elapsedMs / 1000;
  return (
    Math.sin((x * 0.029) + (time * 0.73))
    + (Math.sin((x * 0.011) - (time * 1.17)) * 0.45)
  ) * level.windStrength;
}

function getCourseObjectInteractionRadius(object: SkyboundCourseObject) {
  return object.kind === 'salvage'
    ? Math.max(3.6, object.radius * 0.54)
    : object.kind === 'wind_ring'
      ? Math.max(7.5, object.radius * 0.55)
      : Math.max(8, object.radius * 0.72);
}

function getSegmentDistanceToCourseObject(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  startLateralX: number,
  endLateralX: number,
  object: SkyboundCourseObject,
) {
  const segmentX = endX - startX;
  const segmentY = endY - startY;
  const lengthSquared = (segmentX * segmentX) + (segmentY * segmentY);
  const progress = lengthSquared <= 0
    ? 0
    : clamp((((object.x - startX) * segmentX) + ((object.y - startY) * segmentY)) / lengthSquared, 0, 1);
  const nearestX = startX + (segmentX * progress);
  const nearestY = startY + (segmentY * progress);
  const nearestLateralX = startLateralX + ((endLateralX - startLateralX) * progress);
  return Math.hypot(object.x - nearestX, object.y - nearestY, (object.lateralX ?? 0) - nearestLateralX);
}

export function stepSkyboundFlight(
  state: SkyboundFlightState,
  control: SkyboundFlightControl,
  upgrades: SkyboundUpgrades,
  dtMs: number,
): SkyboundFlightState {
  if (state.status !== 'flying') return state;

  const level = getSkyboundLevel(state.levelId);
  const tuning = AIRCRAFT_TUNING[state.aircraftId];
  const safeDtMs = clamp(Number.isFinite(dtMs) ? dtMs : 0, 0, SKYBOUND_MAX_STEP_MS);
  const dt = safeDtMs / 1000;
  if (dt === 0) return state;

  const pitchInput = clamp(control.pitch, -1, 1);
  const steerInput = clamp(control.steer ?? 0, -1, 1);
  const speed = Math.max(0.001, Math.hypot(state.vx, state.vy));
  const velocityAngle = Math.atan2(state.vy, Math.max(0.001, state.vx));
  const targetPitch = clamp(velocityAngle + (pitchInput * 0.48), -0.95, 1.12);
  let pitchRad = state.pitchRad + ((targetPitch - state.pitchRad) * Math.min(1, dt * 4.8));
  const bankTarget = steerInput * 0.72;
  let bankRad = state.bankRad + ((bankTarget - state.bankRad) * Math.min(1, dt * 5.6));

  const effectiveDrag = level.drag * (1 - (Math.min(upgrades.airframe, 5) * 0.045));
  const liftAcceleration = speed * (0.13 + (upgrades.airframe * 0.019)) * level.liftScale * tuning.lift;
  const controlAcceleration = pitchInput * (7.2 + (upgrades.airframe * 0.65)) * tuning.control;
  const wind = getDeterministicWind(level, state.x, state.elapsedMs);
  const isBoosting = control.boost && state.fuel > 0;
  const isStabilizing = control.stabilize === true && state.stabilizer > 0;
  const boostAcceleration = isBoosting ? 18 + (upgrades.engine * 4.2) : 0;
  const stabilizerWindScale = isStabilizing ? 0.24 : 1;
  const stabilizerControlScale = isStabilizing ? 1.32 : 1;
  const stabilizerDamping = isStabilizing ? 1.4 : 0;

  let vx = state.vx + (
    (Math.cos(pitchRad) * boostAcceleration)
    + (wind * 0.11 * stabilizerWindScale)
    - (state.vx * effectiveDrag)
    - (isStabilizing ? state.vx * 0.052 : 0)
  ) * dt;
  let vy = state.vy + (
    (Math.sin(pitchRad) * boostAcceleration)
    + liftAcceleration
    + (controlAcceleration * stabilizerControlScale)
    - level.gravity
    - (state.vy * effectiveDrag * 0.5)
    - (state.vy * stabilizerDamping)
  ) * dt;
  let lateralVelocity = state.lateralVelocity + (
    (steerInput * (10.5 + (upgrades.airframe * 0.8)))
    - (state.lateralVelocity * (isStabilizing ? 3.2 : 1.45))
    + (wind * 0.055 * stabilizerWindScale)
  ) * dt;

  // A low-energy climb now develops into a readable, recoverable stall. The
  // aircraft gently noses over and trades altitude for speed instead of
  // continuing with invisible lift until it meets the ground.
  const stallSeverity = clamp((19 - speed) / 8, 0, 1) * clamp((pitchRad - 0.12) / 0.55, 0, 1);
  if (stallSeverity > 0) {
    pitchRad -= stallSeverity * 0.48 * dt;
    vx += stallSeverity * 3.4 * dt;
    vy -= stallSeverity * 10.5 * dt;
  }

  vx = Math.max(2, vx);
  const x = Math.max(state.x, state.x + (vx * dt));
  const y = state.y + (vy * dt);
  let lateralX = clamp(state.lateralX + (lateralVelocity * dt), -20, 20);
  if (Math.abs(lateralX) >= 19.9) lateralVelocity *= -0.2;
  const elapsedMs = state.elapsedMs + safeDtMs;
  const groundHeight = getSkyboundGroundHeight(level.id, x);
  const clearance = y - (groundHeight + 1.2);
  const airborneMs = state.airborneMs + (clearance > 2.4 ? safeDtMs : 0);
  let groundContactMs = clearance <= 0 ? state.groundContactMs + safeDtMs : 0;
  const fuelDrain = isBoosting ? dt * 0.31 : 0;
  const fuel = Math.max(0, state.fuel - fuelDrain);
  const stabilizerDrain = isStabilizing ? dt * 0.24 : 0;
  const stabilizerCapacity = (1 + (upgrades.airframe * 0.12)) * tuning.stability;
  let stabilizer = Math.max(0, state.stabilizer - stabilizerDrain);
  let status: SkyboundFlightStatus = 'flying';
  let settledY = y;
  const resolvedObjectIds = [...state.resolvedObjectIds];
  const resolvedNearMissObjectIds = [...state.resolvedNearMissObjectIds];
  let salvageCollected = state.salvageCollected;
  let ringsCleared = state.ringsCleared;
  let hazardHits = state.hazardHits;
  let nearMisses = state.nearMisses;
  let integrity = state.integrity;
  let impactSerial = state.impactSerial;
  let detachedPartIds = [...state.detachedPartIds];
  let currentStreak = state.currentStreak;
  let bestStreak = state.bestStreak;
  let terrainSkims = state.terrainSkims;
  let terminalReason: SkyboundTerminalReason = null;

  for (const object of getSkyboundCourseObjects(level.id, state.goalDistance)) {
    if (resolvedObjectIds.includes(object.id)) continue;
    const objectDistance = getSegmentDistanceToCourseObject(state.x, state.y, x, y, state.lateralX, lateralX, object);
    const collisionDistance = getCourseObjectInteractionRadius(object) + 1.2;
    const intersects = objectDistance <= collisionDistance;
    const crossedHazard = object.kind === 'hazard' && state.x <= object.x && x >= object.x;
    if (!intersects) {
      if (crossedHazard && !resolvedNearMissObjectIds.includes(object.id)) {
        resolvedNearMissObjectIds.push(object.id);
        if (objectDistance <= collisionDistance + 6.5) {
          nearMisses += 1;
          currentStreak += 1;
          bestStreak = Math.max(bestStreak, currentStreak);
        }
      }
      continue;
    }
    resolvedObjectIds.push(object.id);
    if (object.kind === 'hazard' && !resolvedNearMissObjectIds.includes(object.id)) resolvedNearMissObjectIds.push(object.id);
    if (object.kind === 'salvage') {
      salvageCollected += 1;
      currentStreak += 1;
    } else if (object.kind === 'wind_ring') {
      ringsCleared += 1;
      currentStreak += 2;
      vx += 8 + (upgrades.airframe * 0.7);
      vy += 2.5;
      stabilizer = Math.min(stabilizerCapacity, stabilizer + 0.2);
    } else {
      hazardHits += 1;
      impactSerial += 1;
      integrity = Math.max(0, integrity - 1);
      currentStreak = 0;
      vx *= 0.68;
      vy -= 6;
      lateralVelocity += (lateralX <= (object.lateralX ?? 0) ? -1 : 1) * 8;
      bankRad += lateralX <= (object.lateralX ?? 0) ? -0.45 : 0.45;
      const damageOrder = ['left-wing', 'right-tailplane', 'tail-fin', 'right-wing', 'left-tailplane'];
      const damagedPart = damageOrder[Math.min(damageOrder.length - 1, hazardHits - 1)];
      detachedPartIds = [...new Set([...detachedPartIds, damagedPart])];
      if (integrity === 0) {
        status = 'crashed';
        terminalReason = 'integrity_failure';
      }
    }
    bestStreak = Math.max(bestStreak, currentStreak);
  }

  if (status === 'crashed') {
    detachedPartIds = [...new Set([...detachedPartIds, 'right-wing', 'left-tailplane', 'canopy', 'nose-cap'])];
  } else if (x >= state.goalDistance) {
    status = 'finished';
    terminalReason = 'goal';
  } else if (clearance <= 0) {
    settledY = groundHeight + 1.2;
    const launchGraceActive = elapsedMs < 1_800 || airborneMs < 850;
    const severeImpact = vy < -21 || Math.abs(pitchRad) > 1.02;
    const hardImpact = !launchGraceActive && state.terrainSkims >= 2 && severeImpact;
    const controlledTouchdown = !launchGraceActive && vx <= 9 && vy >= -8 && Math.abs(pitchRad) <= 0.72;
    if (hardImpact) {
      status = 'crashed';
      terminalReason = 'hard_impact';
      impactSerial += 1;
      integrity = 0;
      detachedPartIds = ['left-wing', 'right-wing', 'left-tailplane', 'right-tailplane', 'tail-fin', 'canopy', 'nose-cap'];
      vx = 0;
      vy = 0;
    } else if (controlledTouchdown) {
      status = 'landed';
      terminalReason = 'touchdown';
      vx = 0;
      vy = 0;
    } else {
      // A brief runway/terrain brush should read as a recoverable skim, not an
      // abrupt end screen. Forward energy is preserved while the airframe gets
      // a small deterministic rebound and enough time for the pilot to correct.
      status = 'flying';
      vx = Math.max(7.5, vx * (launchGraceActive ? 0.98 : 0.92));
      vy = Math.max(launchGraceActive ? 5.4 : 3.2, Math.abs(vy) * 0.28);
      bankRad *= 0.82;
      groundContactMs = Math.min(groundContactMs, 240);
      if (state.groundContactMs === 0) {
        terrainSkims += 1;
        if (!launchGraceActive) impactSerial += 1;
      }
    }
  }

  const resultingSpeed = Math.hypot(vx, vy);
  const isStalled = status === 'flying' && resultingSpeed < 18 && pitchRad > 0.18;
  const isSmooth = status === 'flying'
    && clearance > 6
    && resultingSpeed >= 24
    && Math.abs(pitchRad) < 0.34
    && Math.abs(bankRad) < 0.48
    && impactSerial === state.impactSerial;

  return {
    ...state,
    status,
    x,
    y: settledY,
    lateralX,
    vx,
    vy,
    lateralVelocity,
    pitchRad,
    bankRad,
    fuel,
    stabilizer,
    elapsedMs,
    airborneMs,
    groundContactMs,
    maxAltitude: Math.max(state.maxAltitude, y),
    boostUsed: state.boostUsed + fuelDrain,
    stabilizerUsed: state.stabilizerUsed + stabilizerDrain,
    resolvedObjectIds,
    resolvedNearMissObjectIds,
    salvageCollected,
    ringsCleared,
    hazardHits,
    nearMisses,
    integrity,
    detachedPartIds,
    impactSerial,
    currentStreak,
    bestStreak,
    smoothFlightMs: state.smoothFlightMs + (isSmooth ? safeDtMs : 0),
    stallMs: state.stallMs + (isStalled ? safeDtMs : 0),
    terrainSkims,
    terminalReason,
  };
}

export function scoreSkyboundFlight(state: SkyboundFlightState): number {
  const completionBonus = state.status === 'finished' ? 170 + (state.goalDistance * 0.08) : 0;
  const landingBonus = state.status === 'landed' ? 55 : 0;
  const courseBonus = (state.salvageCollected * 18) + (state.ringsCleared * 45) + (state.nearMisses * 25) + (state.bestStreak * 4);
  const smoothFlightBonus = Math.min(120, Math.round(state.smoothFlightMs / 500));
  const hazardPenalty = state.hazardHits * 20;
  return Math.max(45, Math.round((Math.min(state.x, state.goalDistance) * 0.32) + (state.maxAltitude * 1.15) + completionBonus + landingBonus + courseBonus + smoothFlightBonus - hazardPenalty));
}
