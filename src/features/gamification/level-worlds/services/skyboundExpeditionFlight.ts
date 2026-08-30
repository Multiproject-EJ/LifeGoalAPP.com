import type { SkyboundAircraftId } from './skyboundPilotAcademy';

export type SkyboundLevelId = 'meadow' | 'coast' | 'canyon' | 'storm' | 'stratosphere';
export type SkyboundFlightStatus = 'flying' | 'landed' | 'crashed' | 'finished';
export type SkyboundTerminalReason = 'goal' | 'touchdown' | 'hard_impact' | 'integrity_failure' | null;
export type SkyboundUpgradeKind = 'launcher' | 'airframe' | 'engine';
export type SkyboundCourseObjectKind = 'salvage' | 'wind_ring' | 'hazard';
export type SkyboundCourseProfile = 'standard' | 'landing' | 'storm_corridor' | 'gold_formation';
export type SkyboundTouchdownGrade = 'gold' | 'silver' | 'bronze';
export type SkyboundStuntKind = 'near_miss' | 'terrain_skim' | 'barrel_roll' | 'crash_finale' | null;

export interface SkyboundTouchdownResult {
  grade: SkyboundTouchdownGrade;
  mark: 'A+' | 'A' | 'B';
  label: string;
  detail: string;
  score: number;
  speedKmh: number;
  sinkRateMps: number;
  pitchDeg: number;
  offsetM: number;
}

export interface SkyboundUpgrades {
  launcher: number;
  airframe: number;
  engine: number;
}

export interface SkyboundLevelDefinition {
  id: SkyboundLevelId;
  name: string;
  subtitle: string;
  trainingStage: string;
  trainingFocus: string;
  goalDistance: number;
  launchSpeedScale: number;
  startClearance: number;
  targetAltitudeMin: number;
  targetAltitudeMax: number;
  finishAltitude: number;
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
  assemblyLevel?: number;
  courseProfile?: SkyboundCourseProfile;
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
  assemblyLevel: number;
  courseProfile: SkyboundCourseProfile;
  x: number;
  y: number;
  lateralX: number;
  vx: number;
  vy: number;
  lateralVelocity: number;
  pitchRad: number;
  bankRad: number;
  rollAngleRad: number;
  rollRateRadPerSecond: number;
  rollProgressRad: number;
  rollDirection: -1 | 0 | 1;
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
  flipsCompleted: number;
  closeFlyingMs: number;
  closeFlyingWindowMs: number;
  closeFlyingBonuses: number;
  stuntScore: number;
  stuntSerial: number;
  lastStuntKind: SkyboundStuntKind;
  lastStuntBonus: number;
  crashStyleBonus: number;
  integrity: number;
  detachedPartIds: readonly string[];
  impactSerial: number;
  bestStreak: number;
  currentStreak: number;
  smoothFlightMs: number;
  flowCharge: number;
  stallMs: number;
  terrainImpacts: number;
  terminalReason: SkyboundTerminalReason;
  touchdownSpeedKmh: number | null;
  touchdownSinkRateMps: number | null;
  touchdownPitchDeg: number | null;
  touchdownOffsetM: number | null;
}

export interface SkyboundFlightControl {
  pitch: number;
  steer?: number;
  boost: boolean;
  stabilize?: boolean;
}

export const SKYBOUND_MAX_UPGRADE_LEVEL = 5;
export const SKYBOUND_MAX_STEP_MS = 64;
export const SKYBOUND_CLOSE_FLYING_MILESTONE_MS = 1_100;
const SKYBOUND_FULL_ROLL_RAD = Math.PI * 2;

export const SKYBOUND_LEVELS: readonly SkyboundLevelDefinition[] = [
  {
    id: 'meadow',
    name: 'Meadow Ground School',
    subtitle: 'First hops above the practice field',
    trainingStage: 'GROUND SCHOOL',
    trainingFocus: 'Launch, stay low, and learn when to climb',
    goalDistance: 360,
    launchSpeedScale: 0.78,
    startClearance: 1.45,
    targetAltitudeMin: 5,
    targetAltitudeMax: 22,
    finishAltitude: 12,
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
    id: 'coast', name: 'Coastal Airfield', subtitle: 'Build flight energy', trainingStage: 'BASIC FLIGHT', trainingFocus: 'Take off, hold altitude, and return safely', goalDistance: 650,
    launchSpeedScale: 0.9, startClearance: 1.6, targetAltitudeMin: 16, targetAltitudeMax: 42, finishAltitude: 28,
    gravity: 11.7, drag: 0.015, liftScale: 0.98, windStrength: 3.2,
    skyTop: '#1765a4', skyBottom: '#c6f4ff', ground: '#467c5a', accent: '#ffe07a',
  },
  {
    id: 'canyon',
    name: 'Canyon Lift',
    subtitle: 'Ride the rising air',
    trainingStage: 'ENERGY SCHOOL',
    trainingFocus: 'Trade height for speed and recover before terrain',
    goalDistance: 880,
    launchSpeedScale: 1,
    startClearance: 1.8,
    targetAltitudeMin: 34,
    targetAltitudeMax: 72,
    finishAltitude: 48,
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
    trainingStage: 'COMBAT WEATHER',
    trainingFocus: 'Control damage, crosswind, and low-visibility flight',
    goalDistance: 1260,
    launchSpeedScale: 1.08,
    startClearance: 2.2,
    targetAltitudeMin: 52,
    targetAltitudeMax: 96,
    finishAltitude: 70,
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
    id: 'stratosphere', name: 'Goldwing Stratosphere', subtitle: 'Earn the final wings', trainingStage: 'ACE OPERATIONS', trainingFocus: 'Sustain high-altitude speed and precision', goalDistance: 1660,
    launchSpeedScale: 1.16, startClearance: 3, targetAltitudeMin: 78, targetAltitudeMax: 132, finishAltitude: 102,
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
    { id: 'meadow-salvage-1', kind: 'salvage', x: 42, y: 6, radius: 7 },
    { id: 'meadow-salvage-2', kind: 'salvage', x: 57, y: 8, lateralX: -4, radius: 7 },
    { id: 'meadow-salvage-3', kind: 'salvage', x: 72, y: 10, lateralX: 4, radius: 7 },
    { id: 'meadow-ring-1', kind: 'wind_ring', x: 105, y: 13, radius: 17 },
    { id: 'meadow-salvage-4', kind: 'salvage', x: 137, y: 14, lateralX: 6, radius: 7 },
    { id: 'meadow-salvage-5', kind: 'salvage', x: 152, y: 13, lateralX: 1, radius: 7 },
    { id: 'meadow-salvage-6', kind: 'salvage', x: 167, y: 11, lateralX: -5, radius: 7 },
    { id: 'meadow-hazard-1', kind: 'hazard', x: 205, y: 9, radius: 12 },
    { id: 'meadow-ring-2', kind: 'wind_ring', x: 252, y: 15, lateralX: -5, radius: 17 },
    { id: 'meadow-hazard-2', kind: 'hazard', x: 296, y: 8, lateralX: 6, radius: 10 },
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

const FLOW_SPEED_KMH:Record<SkyboundAircraftId,number>={
  toy_glider:125,
  prop_trainer:150,
  jet_trainer:175,
  storm_interceptor:195,
  goldwing_fighter:215,
};

const ASSEMBLY_TUNING = [
  {speed:.55,lift:.24,control:.16,stability:.35},
  {speed:.66,lift:.42,control:.3,stability:.46},
  {speed:.79,lift:.68,control:.58,stability:.66},
  {speed:.9,lift:.86,control:.82,stability:.86},
  {speed:1,lift:1,control:1,stability:1},
] as const;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function normalizeAngleRad(value: number) {
  return Math.atan2(Math.sin(value), Math.cos(value));
}

export function getSkyboundLevel(levelId: SkyboundLevelId): SkyboundLevelDefinition {
  return SKYBOUND_LEVELS.find((level) => level.id === levelId) ?? SKYBOUND_LEVELS[0];
}

export function getSkyboundFlowTargetSpeedKmh(aircraftId:SkyboundAircraftId,upgrades:SkyboundUpgrades) {
  return FLOW_SPEED_KMH[aircraftId]+(clamp(upgrades.launcher,0,5)*3)+(clamp(upgrades.engine,0,5)*4);
}

export function getSkyboundLandingZone(goalDistance:number) {
  const endX=Math.max(100,goalDistance);
  return{startX:Math.max(40,endX-60),endX,width:24};
}

function getSkyboundStormCorridor(goalDistance:number):readonly SkyboundCourseObject[] {
  const ringAltitudes=[62,84,57,91,70];
  const ringLanes=[-12,10,-14,13,0];
  const objects:SkyboundCourseObject[]=[];
  for(let index=0;index<5;index+=1){
    const x=138+((goalDistance-300)*(index/4));
    const y=ringAltitudes[index];
    const lateralX=ringLanes[index];
    objects.push({id:`storm-corridor-ring-${index+1}`,kind:'wind_ring',x,y,lateralX,radius:15});
    objects.push({id:`storm-corridor-crest-${index*2+1}`,kind:'salvage',x:x+24,y:y+3,lateralX,radius:7});
    objects.push({id:`storm-corridor-crest-${index*2+2}`,kind:'salvage',x:x+40,y:y-2,lateralX:lateralX*.72,radius:7});
    if(index<4){
      const nextLane=ringLanes[index+1];
      const blockingLane=nextLane>=0?-15:15;
      objects.push({id:`storm-corridor-spire-${index+1}`,kind:'hazard',x:x+76,y:(y+ringAltitudes[index+1])/2,lateralX:blockingLane,radius:16});
    }
  }
  return objects;
}

function getSkyboundGoldFormation(goalDistance:number):readonly SkyboundCourseObject[] {
  const routeStart=180;
  const routeSpan=Math.max(660,goalDistance-360);
  const lanes=[0,-5,-10,-15,-11,-6,0,6,11,15,10,5];
  const altitudeOffsets=[0,5,11,18,23,27,29,27,23,18,11,5];
  const objects:SkyboundCourseObject[]=[];
  for(let index=0;index<lanes.length;index+=1){
    const ratio=index/(lanes.length-1);
    const x=routeStart+(routeSpan*ratio);
    const y=86+altitudeOffsets[index];
    objects.push({id:`gold-formation-crest-${index+1}`,kind:'salvage',x,y,lateralX:lanes[index],radius:8});
    if(index===2||index===5||index===8||index===11){
      objects.push({id:`gold-formation-gate-${(index+1)/3}`,kind:'wind_ring',x:x+22,y:y+2,lateralX:lanes[index]*.72,radius:15});
    }
  }
  return objects;
}

export function getSkyboundCourseObjects(levelId: SkyboundLevelId, goalDistance = getSkyboundLevel(levelId).goalDistance, courseProfile:SkyboundCourseProfile='standard'): readonly SkyboundCourseObject[] {
  const level = getSkyboundLevel(levelId);
  const authored = SKYBOUND_COURSE_OBJECTS[levelId].filter((object) => object.x <= goalDistance + 20);
  const objects = [...authored];
  const lastX = objects.reduce((value, object) => Math.max(value, object.x), 0);
  for (let section = 0, x = lastX + 62; x < goalDistance - 22; section += 1, x += 72) {
    const wave = Math.sin((section + levelId.length) * 1.71);
    const altitudeSpan = level.targetAltitudeMax - level.targetAltitudeMin;
    const y = level.targetAltitudeMin + altitudeSpan * 0.52 + wave * altitudeSpan * 0.34;
    const lateralX = Math.round(Math.sin(section * 2.17 + levelId.length) * 8);
    const kind: SkyboundCourseObjectKind = section % 4 === 2 ? 'hazard' : section % 3 === 0 ? 'wind_ring' : 'salvage';
    objects.push({ id:`${levelId}-extended-${section}`,kind,x,y,lateralX,radius:kind==='salvage'?7:17 });
    if (kind === 'salvage') objects.push({ id:`${levelId}-extended-${section}-pair`,kind,x:x+14,y:y+4,lateralX:lateralX+2,radius:7 });
  }
  const profiledObjects=courseProfile==='landing'
    ? (()=>{const zone=getSkyboundLandingZone(goalDistance);const approachStart=zone.startX-92;return[
      ...objects.filter((object)=>object.x<approachStart-24),
      {id:`${levelId}-landing-approach-1`,kind:'wind_ring' as const,x:approachStart,y:getSkyboundGroundHeight(levelId,approachStart)+30,lateralX:0,radius:14},
      {id:`${levelId}-landing-approach-2`,kind:'wind_ring' as const,x:zone.startX-58,y:getSkyboundGroundHeight(levelId,zone.startX-58)+16,lateralX:0,radius:13},
      {id:`${levelId}-landing-approach-3`,kind:'wind_ring' as const,x:zone.startX-28,y:getSkyboundGroundHeight(levelId,zone.startX-28)+8,lateralX:0,radius:12},
    ];})()
    : courseProfile==='storm_corridor'
      ? getSkyboundStormCorridor(goalDistance)
      : courseProfile==='gold_formation'
        ? getSkyboundGoldFormation(goalDistance)
    : objects;
  const trainingLanes = [-9, 9, -12, 12, -7, 14, -14, 7];
  return profiledObjects.map((object) => {
    const isLandingApproach=courseProfile==='landing'&&object.id.includes('landing-approach');
    const isAdvancedFormation=courseProfile==='storm_corridor'||courseProfile==='gold_formation';
    const laneCenter = trainingLanes[Math.floor(object.x / 90) % trainingLanes.length];
    return {
      ...object,
      y:isLandingApproach?object.y:clamp(object.y,level.targetAltitudeMin,level.targetAltitudeMax),
      lateralX:isLandingApproach?0:isAdvancedFormation?clamp(object.lateralX??0,-18,18):clamp(laneCenter + ((object.lateralX ?? 0) * 0.35), -18, 18),
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
  const assemblyLevel = clamp(Math.floor(input.assemblyLevel ?? 4),0,4);
  const assembly = ASSEMBLY_TUNING[assemblyLevel];
  const power = clamp(input.power, 0, 1);
  const angleRad = (clamp(input.angleDeg, 12, 58) * Math.PI) / 180;
  const rankSpeedFactor=1+((tuning.speed-1)*.18);
  const launchSpeed = (42 + (input.upgrades.launcher * 4.3)) * (0.38 + (power * 0.62)) * rankSpeedFactor * assembly.speed * level.launchSpeedScale;
  const startY = getSkyboundGroundHeight(level.id, 0) + 1.2 + level.startClearance;

  return {
    status: 'flying',
    levelId: level.id,
    aircraftId,
    assemblyLevel,
    courseProfile:input.courseProfile??'standard',
    x: 0,
    y: startY,
    lateralX: 0,
    vx: Math.cos(angleRad) * launchSpeed,
    vy: Math.sin(angleRad) * launchSpeed,
    lateralVelocity: 0,
    pitchRad: angleRad,
    bankRad: 0,
    rollAngleRad: 0,
    rollRateRadPerSecond: 0,
    rollProgressRad: 0,
    rollDirection: 0,
    fuel: (1 + (input.upgrades.engine * 0.18)) * tuning.fuel,
    stabilizer: (1 + (input.upgrades.airframe * 0.12)) * tuning.stability * assembly.stability,
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
    flipsCompleted: 0,
    closeFlyingMs: 0,
    closeFlyingWindowMs: 0,
    closeFlyingBonuses: 0,
    stuntScore: 0,
    stuntSerial: 0,
    lastStuntKind: null,
    lastStuntBonus: 0,
    crashStyleBonus: 0,
    integrity: tuning.integrity,
    detachedPartIds: [],
    impactSerial: 0,
    bestStreak: 0,
    currentStreak: 0,
    smoothFlightMs: 0,
    flowCharge: 0,
    stallMs: 0,
    terrainImpacts: 0,
    terminalReason: null,
    touchdownSpeedKmh: null,
    touchdownSinkRateMps: null,
    touchdownPitchDeg: null,
    touchdownOffsetM: null,
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
  const assemblyLevel = clamp(Math.floor(state.assemblyLevel ?? 4),0,4);
  const assembly = ASSEMBLY_TUNING[assemblyLevel];
  const safeDtMs = clamp(Number.isFinite(dtMs) ? dtMs : 0, 0, SKYBOUND_MAX_STEP_MS);
  const dt = safeDtMs / 1000;
  if (dt === 0) return state;

  const pitchInput = clamp(control.pitch, -1, 1);
  const steerInput = clamp(control.steer ?? 0, -1, 1);
  const speed = Math.max(0.001, Math.hypot(state.vx, state.vy));
  const velocityAngle = Math.atan2(state.vy, Math.max(0.001, state.vx));
  const targetPitch = clamp(velocityAngle + (pitchInput * 0.48), -0.95, 1.12);
  let pitchRad = state.pitchRad + ((targetPitch - state.pitchRad) * Math.min(1, dt * 4.8));
  const asymmetricWingBias = assemblyLevel === 1 ? -0.24 : 0;
  const bankTarget = steerInput * 0.72 * assembly.control + asymmetricWingBias;
  let bankRad = state.bankRad + ((bankTarget - state.bankRad) * Math.min(1, dt * 5.6));

  const flowTargetSpeed = getSkyboundFlowTargetSpeedKmh(state.aircraftId,upgrades)/3.6;
  const overspeed=clamp((speed-flowTargetSpeed)/Math.max(1,flowTargetSpeed),0,1.5);
  const effectiveDrag = (level.drag * (1 - (Math.min(upgrades.airframe, 5) * 0.035))) + (overspeed*.026);
  const normalizedAirspeed=clamp(speed/Math.max(1,flowTargetSpeed),0,1.35);
  const liftAcceleration=level.gravity*(.44+normalizedAirspeed*.48)*level.liftScale*(.94+(tuning.lift-1)*.35)*assembly.lift*(1+upgrades.airframe*.015);
  const controlAcceleration = pitchInput * (7.2 + (upgrades.airframe * 0.65)) * tuning.control * assembly.control;
  const diveRecoveryAcceleration=state.courseProfile==='landing'&&pitchInput>0&&state.vy<0
    ? pitchInput*clamp(Math.abs(state.vy)/20,0,1)*13*tuning.control*assembly.control
    : 0;
  const wind = getDeterministicWind(level, state.x, state.elapsedMs);
  const isBoosting = control.boost && state.fuel > 0 && assemblyLevel >= 4;
  const isStabilizing = control.stabilize === true && state.stabilizer > 0;
  const boostAcceleration = isBoosting ? 18 + (upgrades.engine * 4.2) : 0;
  const stabilizerWindScale = isStabilizing ? 0.24 : 1;
  const stabilizerControlScale = isStabilizing ? 1.32 : 1;
  const stabilizerDamping = isStabilizing ? 1.4 : 0;
  const currentClearance = state.y - (getSkyboundGroundHeight(level.id, state.x) + 1.2);
  const commandedRollDirection: -1 | 0 | 1 = !isStabilizing
    && Math.abs(steerInput) >= 0.88
    && speed >= 22
    && currentClearance >= 7
      ? (steerInput < 0 ? -1 : 1)
      : 0;
  const targetRollRate = commandedRollDirection * (2.75 + (tuning.control * 0.72) + (upgrades.airframe * 0.09)) * Math.max(0.5, assembly.control);
  const rollRateRadPerSecond = (state.rollRateRadPerSecond ?? 0)
    + ((targetRollRate - (state.rollRateRadPerSecond ?? 0)) * Math.min(1, dt * (commandedRollDirection === 0 ? 5.8 : 7.2)));
  const rollDeltaRad = rollRateRadPerSecond * dt;
  let rollAngleRad = normalizeAngleRad((state.rollAngleRad ?? 0) + rollDeltaRad);
  if (commandedRollDirection === 0 && Math.abs(rollRateRadPerSecond) < 0.45) {
    rollAngleRad = normalizeAngleRad(rollAngleRad * Math.max(0, 1 - (dt * 3.8)));
  }
  let rollProgressRad = state.rollProgressRad ?? 0;
  if (commandedRollDirection !== 0) {
    rollProgressRad = (state.rollDirection !== 0 && state.rollDirection !== commandedRollDirection ? 0 : rollProgressRad)
      + Math.abs(rollDeltaRad);
  } else {
    rollProgressRad = Math.max(0, rollProgressRad - (dt * 1.65));
  }
  const flipsGained = Math.floor(rollProgressRad / SKYBOUND_FULL_ROLL_RAD);
  if (flipsGained > 0) rollProgressRad %= SKYBOUND_FULL_ROLL_RAD;
  const rollDirection: -1 | 0 | 1 = commandedRollDirection !== 0
    ? commandedRollDirection
    : Math.abs(rollRateRadPerSecond) >= 0.35
      ? (state.rollDirection ?? 0)
      : 0;

  let vx = state.vx + (
    (Math.cos(pitchRad) * boostAcceleration)
    - (Math.sin(velocityAngle) * liftAcceleration)
    + (wind * 0.11 * stabilizerWindScale)
    - (state.vx * effectiveDrag)
    - (isStabilizing ? state.vx * 0.052 : 0)
  ) * dt;
  let vy = state.vy + (
    (Math.sin(pitchRad) * boostAcceleration)
    + (Math.cos(velocityAngle) * liftAcceleration)
    + (controlAcceleration * stabilizerControlScale)
    + diveRecoveryAcceleration
    - level.gravity
    - (state.vy * effectiveDrag * 0.5)
    - (state.vy * stabilizerDamping)
  ) * dt;
  let lateralVelocity = state.lateralVelocity + (
    (steerInput * (10.5 + (upgrades.airframe * 0.8)) * assembly.control)
    + (assemblyLevel === 1 ? -1.8 : 0)
    - (state.lateralVelocity * (isStabilizing ? 3.2 : 1.45))
    + (wind * 0.055 * stabilizerWindScale)
  ) * dt;

  const flowEnvelope = assemblyLevel >= 3
    && speed >= flowTargetSpeed * .78
    && speed <= flowTargetSpeed * 1.24
    && Math.abs(pitchRad) < .3
    && Math.abs(bankRad) < .42;
  const flowCharge = clamp(state.flowCharge + (flowEnvelope ? dt * .72 : -dt * .58),0,1);
  const flowLocked = flowCharge >= .62;
  if(flowLocked){
    vx += (flowTargetSpeed-vx)*Math.min(1,dt*.82);
    vy += (-vy*.42)*dt;
    pitchRad *= Math.max(0,1-dt*.28);
  }

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
  let flipsCompleted = (state.flipsCompleted ?? 0) + flipsGained;
  let closeFlyingMs = state.closeFlyingMs ?? 0;
  let closeFlyingWindowMs = state.closeFlyingWindowMs ?? 0;
  let closeFlyingBonuses = state.closeFlyingBonuses ?? 0;
  let stuntScore = state.stuntScore ?? 0;
  let stuntSerial = state.stuntSerial ?? 0;
  let lastStuntKind = state.lastStuntKind ?? null;
  let lastStuntBonus = state.lastStuntBonus ?? 0;
  let crashStyleBonus = state.crashStyleBonus ?? 0;
  let terrainImpacts = state.terrainImpacts;
  let terminalReason: SkyboundTerminalReason = null;
  let touchdownSpeedKmh=state.touchdownSpeedKmh??null;
  let touchdownSinkRateMps=state.touchdownSinkRateMps??null;
  let touchdownPitchDeg=state.touchdownPitchDeg??null;
  let touchdownOffsetM=state.touchdownOffsetM??null;

  const awardStunt = (kind: Exclude<SkyboundStuntKind, null>, bonus: number) => {
    const boundedBonus = Math.max(0, Math.round(bonus));
    if (boundedBonus <= 0) return;
    stuntScore += boundedBonus;
    stuntSerial += 1;
    lastStuntKind = kind;
    lastStuntBonus = boundedBonus;
  };

  if (flipsGained > 0) {
    const flipBonus = flipsGained * (70 + Math.min(50, (flipsCompleted - flipsGained) * 10));
    awardStunt('barrel_roll', flipBonus);
    currentStreak += flipsGained * 2;
    bestStreak = Math.max(bestStreak, currentStreak);
  }

  for (const object of getSkyboundCourseObjects(level.id, state.goalDistance, state.courseProfile??'standard')) {
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
          awardStunt('near_miss', 45 + Math.min(35, nearMisses * 5));
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
      if(object.id.includes('landing-approach')){
        const approachIndex=Number(object.id.charAt(object.id.length-1));
        const approachSpeed=[25,20,15.5][Math.max(0,Math.min(2,approachIndex-1))];
        vx=Math.min(vx,approachSpeed);
        vy=Math.max(vy,approachIndex===3?-3.8:approachIndex===2?-5:-6);
        pitchRad*=approachIndex===3?.5:.72;
        bankRad*=.55;
        lateralVelocity*=.45;
      }else{
        vx += 8 + (upgrades.airframe * 0.7);
        vy += 2.5;
      }
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

  const isCloseFlying = status === 'flying'
    && airborneMs >= 600
    && clearance >= 2.4
    && clearance <= 6.4
    && Math.hypot(vx, vy) >= 22
    && impactSerial === state.impactSerial;
  if (isCloseFlying) {
    const previousMilestone = Math.floor(closeFlyingWindowMs / SKYBOUND_CLOSE_FLYING_MILESTONE_MS);
    closeFlyingMs += safeDtMs;
    closeFlyingWindowMs += safeDtMs;
    const nextMilestone = Math.floor(closeFlyingWindowMs / SKYBOUND_CLOSE_FLYING_MILESTONE_MS);
    const milestonesGained = Math.max(0, nextMilestone - previousMilestone);
    if (milestonesGained > 0) {
      const firstBonusIndex = closeFlyingBonuses;
      closeFlyingBonuses += milestonesGained;
      const skimBonus = Array.from({ length: milestonesGained }, (_, index) => 35 + Math.min(35, (firstBonusIndex + index) * 5))
        .reduce((sum, bonus) => sum + bonus, 0);
      awardStunt('terrain_skim', skimBonus);
      currentStreak += milestonesGained;
      bestStreak = Math.max(bestStreak, currentStreak);
    }
  } else {
    closeFlyingWindowMs = 0;
  }

  const terminalApproachSpeed = Math.hypot(vx, vy);
  if (status === 'crashed') {
    detachedPartIds = [...new Set([...detachedPartIds, 'right-wing', 'left-tailplane', 'canopy', 'nose-cap'])];
  } else if (clearance <= 0) {
    settledY = groundHeight + 1.2;
    const controlledTouchdown = airborneMs >= 600 && vx <= 16 && vy >= -7 && Math.abs(pitchRad) <= 0.38;
    groundContactMs = Math.max(safeDtMs, groundContactMs);
    if (controlledTouchdown) {
      status = 'landed';
      terminalReason = 'touchdown';
      touchdownSpeedKmh=Math.hypot(vx,vy)*3.6;
      touchdownSinkRateMps=Math.max(0,-vy);
      touchdownPitchDeg=Math.abs(pitchRad)*180/Math.PI;
      touchdownOffsetM=Math.abs(lateralX);
      vx = 0;
      vy = 0;
    } else {
      status = 'crashed';
      terminalReason = 'hard_impact';
      terrainImpacts += 1;
      impactSerial += 1;
      integrity = 0;
      detachedPartIds = ['left-wing', 'right-wing', 'left-tailplane', 'right-tailplane', 'tail-fin', 'canopy', 'nose-cap'];
      vx = 0;
      vy = 0;
    }
  } else if (x >= state.goalDistance) {
    status = 'finished';
    terminalReason = 'goal';
  }

  const crashHasActiveRotation = Math.abs(rollRateRadPerSecond) >= 1.35
    || rollProgressRad >= Math.PI * 0.55;
  if (status === 'crashed' && crashStyleBonus <= 0 && crashHasActiveRotation) {
    crashStyleBonus = Math.min(180, Math.round(
      35
      + Math.min(85, flipsCompleted * 25)
      + Math.min(45, (rollProgressRad / SKYBOUND_FULL_ROLL_RAD) * 70)
      + Math.min(35, terminalApproachSpeed * 0.9),
    ));
    awardStunt('crash_finale', crashStyleBonus);
  }

  const resultingSpeed = Math.hypot(vx, vy);
  const isStalled = status === 'flying' && resultingSpeed < 18 && pitchRad > 0.18;
  const isSmooth = status === 'flying'
    && clearance > 6
    && flowLocked
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
    rollAngleRad,
    rollRateRadPerSecond,
    rollProgressRad,
    rollDirection,
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
    flipsCompleted,
    closeFlyingMs,
    closeFlyingWindowMs,
    closeFlyingBonuses,
    stuntScore,
    stuntSerial,
    lastStuntKind,
    lastStuntBonus,
    crashStyleBonus,
    integrity,
    detachedPartIds,
    impactSerial,
    currentStreak,
    bestStreak,
    smoothFlightMs: state.smoothFlightMs + (isSmooth ? safeDtMs : 0),
    flowCharge,
    stallMs: state.stallMs + (isStalled ? safeDtMs : 0),
    terrainImpacts,
    terminalReason,
    touchdownSpeedKmh,
    touchdownSinkRateMps,
    touchdownPitchDeg,
    touchdownOffsetM,
  };
}

export interface SkyboundFlightScoreBreakdown { distance:number;flow:number;course:number;stunts:number;finish:number;landing:number;altitude:number;collisionPenalty:number;total:number; }
export function getSkyboundTouchdownResult(state:SkyboundFlightState):SkyboundTouchdownResult|null {
  if(state.status!=='landed'||state.touchdownSpeedKmh===null||state.touchdownSinkRateMps===null||state.touchdownPitchDeg===null||state.touchdownOffsetM===null)return null;
  const metrics={speedKmh:state.touchdownSpeedKmh,sinkRateMps:state.touchdownSinkRateMps,pitchDeg:state.touchdownPitchDeg,offsetM:state.touchdownOffsetM};
  if(metrics.speedKmh<=40&&metrics.sinkRateMps<=2.6&&metrics.pitchDeg<=7&&metrics.offsetM<=3.5)return{grade:'gold',mark:'A+',label:'GOLDEN TOUCHDOWN',detail:'Centreline, soft mains contact, and a disciplined flare.',score:120,...metrics};
  if(metrics.speedKmh<=50&&metrics.sinkRateMps<=4.5&&metrics.pitchDeg<=13&&metrics.offsetM<=8)return{grade:'silver',mark:'A',label:'PRECISION TOUCHDOWN',detail:'A stable return with only a small correction left to make.',score:90,...metrics};
  return{grade:'bronze',mark:'B',label:'CONTROLLED TOUCHDOWN',detail:'Aircraft recovered safely. Refine speed, flare, and centreline.',score:65,...metrics};
}
export function getSkyboundFlightScoreBreakdown(state:SkyboundFlightState):SkyboundFlightScoreBreakdown {
  const distance=Math.round(Math.min(state.x,state.goalDistance)*.55);
  const finish=state.status==='finished'?Math.round(140+state.goalDistance*.06):0;
  const landing=state.status==='landed'?(getSkyboundTouchdownResult(state)?.score??55):0;
  const course=(state.salvageCollected*18)+(state.ringsCleared*45)+(state.bestStreak*4);
  const stunts=Math.max(0,Math.round(state.stuntScore??0));
  const flow=Math.min(160,Math.round(state.smoothFlightMs/420));
  const altitude=Math.round(state.maxAltitude*.55);
  const collisionPenalty=(state.hazardHits+Math.min(3,state.terrainImpacts))*20;
  return{distance,flow,course,stunts,finish,landing,altitude,collisionPenalty,total:Math.max(45,distance+flow+course+stunts+finish+landing+altitude-collisionPenalty)};
}
export function scoreSkyboundFlight(state: SkyboundFlightState): number { return getSkyboundFlightScoreBreakdown(state).total; }
