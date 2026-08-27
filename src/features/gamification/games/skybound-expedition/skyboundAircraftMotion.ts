import * as THREE from 'three';
import type { CadetGliderRuntime } from './cadetToyGliderModel';

export interface SkyboundLaunchPose {
  lateral: number;
  height: number;
  forward: number;
  pitchJolt: number;
  tension: number;
  vibration: number;
}

export interface SkyboundAircraftMotionInput {
  phase: 'aiming' | 'flying' | 'result';
  timeSeconds: number;
  dtSeconds: number;
  aimPower: number;
  aimDragging: boolean;
  pitchRad: number;
  bankRad: number;
  speed: number;
  integrityRatio: number;
  boosting: boolean;
  stabilizing: boolean;
}

export interface SkyboundAircraftMotionPose {
  mode: 'launch-tension' | 'smooth' | 'struggling' | 'parked';
  aileron: number;
  elevator: number;
  rudder: number;
  wingFlex: number;
  shudder: number;
  propellerRate: number;
}

const clamp = (value:number, minimum:number, maximum:number) => Math.max(minimum, Math.min(maximum, value));
const easeOutCubic = (value:number) => 1 - ((1 - value) ** 3);

export function getSkyboundLaunchPose(power:number, pullX = 0, dragging = false):SkyboundLaunchPose {
  const tension = easeOutCubic(clamp(power, 0, 1));
  const vibration = dragging ? tension * tension : 0;
  return {
    lateral: clamp(pullX / 110, -1, 1) * 0.7,
    height: 5.35 - (tension * 1.2),
    forward: 1.4 - (tension * 5.1),
    pitchJolt: tension * 0.055,
    tension,
    vibration,
  };
}

export function getSkyboundAircraftMotionPose(input:SkyboundAircraftMotionInput):SkyboundAircraftMotionPose {
  if (input.phase === 'aiming' && input.aimDragging) {
    const tension = clamp(input.aimPower, 0, 1);
    const pulse = Math.sin(input.timeSeconds * (18 + tension * 18));
    return {
      mode: 'launch-tension',
      aileron: pulse * tension * 0.035,
      elevator: -0.08 - (tension * 0.18),
      rudder: pulse * tension * 0.025,
      wingFlex: 0.025 + (tension * 0.055),
      shudder: pulse * tension * tension * 0.035,
      propellerRate: 5 + (tension * 12),
    };
  }

  if (input.phase !== 'flying') {
    return { mode:'parked', aileron:0, elevator:0, rudder:0, wingFlex:0.018, shudder:0, propellerRate:4 };
  }

  const strain = Math.max(
    clamp((20 - input.speed) / 12, 0, 1),
    clamp((Math.abs(input.pitchRad) - 0.62) / 0.38, 0, 1),
    clamp((Math.abs(input.bankRad) - 0.5) / 0.28, 0, 1),
    clamp((0.62 - input.integrityRatio) / 0.52, 0, 1),
  );
  const struggling = strain > 0.18 && !input.stabilizing;
  const flutter = struggling ? Math.sin(input.timeSeconds * (22 + strain * 19)) * strain : 0;
  const boostFlex = input.boosting ? 0.035 : 0;
  return {
    mode: struggling ? 'struggling' : 'smooth',
    aileron: clamp((-input.bankRad * 0.54) + (flutter * 0.12), -0.42, 0.42),
    elevator: clamp((-input.pitchRad * 0.28) + (flutter * 0.08), -0.34, 0.34),
    rudder: clamp((-input.bankRad * 0.32) + (flutter * 0.1), -0.3, 0.3),
    wingFlex: 0.025 + clamp(input.speed / 90, 0, 1) * 0.055 + boostFlex + (flutter * 0.025),
    shudder: flutter * 0.055,
    propellerRate: (input.boosting ? 48 : 23) * (struggling ? 0.72 + Math.sin(input.timeSeconds * 15) * 0.18 : 1),
  };
}

function restRotation(node:THREE.Object3D, axis:'x'|'y'|'z') {
  const key = `skyboundRest${axis.toUpperCase()}`;
  if (typeof node.userData[key] !== 'number') node.userData[key] = node.rotation[axis];
  return node.userData[key] as number;
}

export function applySkyboundAircraftMotion(runtime:CadetGliderRuntime,input:SkyboundAircraftMotionInput) {
  const pose = getSkyboundAircraftMotionPose(input);
  const rotate = (id:string, axis:'x'|'y'|'z', offset:number) => {
    const node = runtime.nodes[id];
    if (node) node.rotation[axis] = restRotation(node, axis) + offset;
  };
  rotate('left-aileron', 'x', pose.aileron);
  rotate('right-aileron', 'x', -pose.aileron);
  rotate('left-elevator', 'x', pose.elevator);
  rotate('right-elevator', 'x', pose.elevator);
  rotate('rudder', 'y', pose.rudder);
  rotate('left-wing', 'z', -pose.wingFlex);
  rotate('right-wing', 'z', pose.wingFlex);
  rotate('tail-fin', 'z', pose.shudder * 0.45);
  const propeller = runtime.nodes.propeller;
  if (propeller) propeller.rotation.z += Math.max(0, input.dtSeconds) * pose.propellerRate;
  return pose;
}
