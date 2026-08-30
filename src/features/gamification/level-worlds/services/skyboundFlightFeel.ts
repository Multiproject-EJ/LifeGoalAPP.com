import {
  getSkyboundFlowTargetSpeedKmh,
  getSkyboundGroundHeight,
  type SkyboundFlightState,
  type SkyboundUpgrades,
} from './skyboundExpeditionFlight';

export type SkyboundFlightCondition =
  | 'smooth'
  | 'climb'
  | 'dive'
  | 'ground-effect'
  | 'stall'
  | 'damaged';

export interface SkyboundFlightTelemetry {
  condition: SkyboundFlightCondition;
  label: string;
  instruction: string;
  speed: number;
  altitude: number;
  clearance: number;
  energy: number;
  warning: boolean;
}

export interface SkyboundFlightStickControl {
  pitch: number;
  steer: number;
  magnitude: number;
  displayX: number;
  displayY: number;
}

export type SkyboundFlightDirectorMode =
  | 'flow'
  | 'tracking'
  | 'slow'
  | 'fast'
  | 'nose-high'
  | 'banked'
  | 'terrain';

export interface SkyboundFlightDirector {
  mode: SkyboundFlightDirectorMode;
  cue: string;
  detail: string;
  targetSpeedKmh: number;
  speedDeltaKmh: number;
  alignment: number;
  velocityAngleRad: number;
}

const clamp = (value:number, minimum:number, maximum:number) => Math.max(minimum, Math.min(maximum, value));

function applyDeadZone(value:number, deadZone:number) {
  const magnitude = Math.abs(value);
  if (magnitude <= deadZone) return 0;
  return Math.sign(value) * clamp((magnitude - deadZone) / (1 - deadZone), 0, 1);
}

export function getSkyboundFlightStickControl(
  anchor:{x:number;y:number},
  current:{x:number;y:number},
  radius = 82,
  deadZone = 0.08,
):SkyboundFlightStickControl {
  const safeRadius = Math.max(24, radius);
  const rawX = (current.x - anchor.x) / safeRadius;
  const rawY = (current.y - anchor.y) / safeRadius;
  const rawMagnitude = Math.hypot(rawX, rawY);
  const scale = rawMagnitude > 1 ? 1 / rawMagnitude : 1;
  const boundedX = rawX * scale;
  const boundedY = rawY * scale;
  return {
    steer: applyDeadZone(boundedX, deadZone),
    pitch: applyDeadZone(-boundedY, deadZone),
    magnitude: clamp((rawMagnitude - deadZone) / (1 - deadZone), 0, 1),
    displayX: boundedX * safeRadius,
    displayY: boundedY * safeRadius,
  };
}

export function getSkyboundFlightTelemetry(state:SkyboundFlightState):SkyboundFlightTelemetry {
  const speed = Math.hypot(state.vx, state.vy);
  const ground = getSkyboundGroundHeight(state.levelId, state.x);
  const clearance = Math.max(0, state.y - ground);
  const capacity = Math.max(1, state.integrity + state.hazardHits);
  const integrityRatio = state.integrity / capacity;
  const energy = clamp((speed - 12) / 54, 0, 1);

  if (state.assemblyLevel < 3) {
    return { condition:'damaged',label:'INCOMPLETE AIRFRAME',instruction:state.assemblyLevel===0?'The fuselage can only coast — earn the first wing':'Counter the imbalance and protect speed',speed,altitude:state.y,clearance,energy,warning:true };
  }

  if (speed < 18 && state.pitchRad > 0.18) {
    return { condition:'stall',label:'STALL · DROP NOSE',instruction:'Push forward to rebuild airspeed',speed,altitude:state.y,clearance,energy,warning:true };
  }
  if (clearance < 5.5 && state.vy < 4) {
    return { condition:'ground-effect',label:'TERRAIN · LIFT',instruction:'Ease back and climb clear',speed,altitude:state.y,clearance,energy,warning:true };
  }
  if (integrityRatio < 0.68) {
    return { condition:'damaged',label:'AIRFRAME STRAIN',instruction:'Level the wings or stabilize',speed,altitude:state.y,clearance,energy,warning:true };
  }
  if (state.pitchRad > 0.32 || state.vy > 7) {
    return { condition:'climb',label:'CLIMB',instruction:'Trade speed for altitude',speed,altitude:state.y,clearance,energy,warning:false };
  }
  if (state.pitchRad < -0.24 || state.vy < -8) {
    return { condition:'dive',label:'DIVE · BUILD SPEED',instruction:'Recover before the terrain',speed,altitude:state.y,clearance,energy,warning:clearance < 14 };
  }
  return state.flowCharge>=.62
    ? { condition:'smooth',label:'FLOW LOCK',instruction:'Hold this pitch and bank',speed,altitude:state.y,clearance,energy,warning:false }
    : { condition:'smooth',label:'SEEK FLOW',instruction:'Level near 200 km/h; use small inputs',speed,altitude:state.y,clearance,energy,warning:false };
}

export function getSkyboundFlightDirector(state:SkyboundFlightState, upgrades:SkyboundUpgrades):SkyboundFlightDirector {
  const speed = Math.hypot(state.vx, state.vy);
  const speedKmh = speed * 3.6;
  const targetSpeedKmh = getSkyboundFlowTargetSpeedKmh(state.aircraftId, upgrades);
  const speedRatio = speedKmh / Math.max(1, targetSpeedKmh);
  const velocityAngleRad = Math.atan2(state.vy, Math.max(0.001, state.vx));
  const ground = getSkyboundGroundHeight(state.levelId, state.x);
  const clearance = state.y - ground;
  const speedAlignment = 1 - clamp(Math.abs(1 - speedRatio) / 0.28, 0, 1);
  const pitchAlignment = 1 - clamp(Math.abs(state.pitchRad) / 0.32, 0, 1);
  const bankAlignment = 1 - clamp(Math.abs(state.bankRad) / 0.44, 0, 1);
  const alignment = clamp((speedAlignment * 0.48) + (pitchAlignment * 0.3) + (bankAlignment * 0.22), 0, 1);
  const base = { targetSpeedKmh, speedDeltaKmh:Math.round(speedKmh-targetSpeedKmh), alignment, velocityAngleRad };

  if (state.flowCharge >= 0.62) return { ...base, mode:'flow', cue:'HOLD THE LINE', detail:'Flow locked · use fingertip corrections' };
  if (clearance < 7 && state.vy < 2) return { ...base, mode:'terrain', cue:'CLIMB NOW', detail:'Terrain is inside the recovery margin' };
  if (Math.abs(state.bankRad) > 0.42) return { ...base, mode:'banked', cue:'LEVEL WINGS', detail:'Bank is spilling lift and blocking Flow' };
  if (speedRatio < 0.82) return { ...base, mode:'slow', cue:'LOWER THE NOSE', detail:'Trade a little altitude for airspeed' };
  if (state.pitchRad > 0.34) return { ...base, mode:'nose-high', cue:'EASE FORWARD', detail:'The nose is above the efficient corridor' };
  if (speedRatio > 1.16) return { ...base, mode:'fast', cue:'CLIMB 5° · THEN LEVEL', detail:'Convert excess speed without over-pitching' };
  return { ...base, mode:'tracking', cue:'CENTER THE MARKER', detail:`Flow alignment ${Math.round(alignment*100)}%` };
}
