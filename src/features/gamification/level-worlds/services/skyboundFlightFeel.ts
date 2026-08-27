import {
  getSkyboundGroundHeight,
  type SkyboundFlightState,
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
  return { condition:'smooth',label:'SMOOTH FLOW',instruction:'Hold the energy line',speed,altitude:state.y,clearance,energy,warning:false };
}
