/** Presentation-only helpers. No progression, rewards or camera ownership here. */
export type PawnPoint = readonly [number, number, number];
export interface PawnObstacle { min: PawnPoint; max: PawnPoint }
export const shortestPawnAngle = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

export function pawnSightBlocked(from: PawnPoint, to: PawnPoint, box: PawnObstacle): boolean {
  let near = 0.02, far = 0.98;
  for (let axis = 0; axis < 3; axis++) {
    const direction = to[axis] - from[axis];
    if (Math.abs(direction) < 1e-8) {
      if (from[axis] < box.min[axis] || from[axis] > box.max[axis]) return false;
    } else {
      const a = (box.min[axis] - from[axis]) / direction;
      const b = (box.max[axis] - from[axis]) / direction;
      near = Math.max(near, Math.min(a, b));
      far = Math.min(far, Math.max(a, b));
      if (near > far) return false;
    }
  }
  return true;
}

/** Keep the existing heading when clear; find a nearby clear shoulder when not.
 * Caller evaluates once per hop, avoiding frame-by-frame direction hunting. */
export function choosePawnCamera(target: PawnPoint, heading: number, obstacles: readonly PawnObstacle[], exactBlocked?: (eye: PawnPoint, target: PawnPoint) => number) {
  let best = { heading, height: 8.4, blocked: obstacles.length, score: Infinity };
  const candidates: {height:number;turn:number;cost:number}[] = [];
  for (const height of [8.4, 11.5, 15]) {
    for (const turn of [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6]) {
      candidates.push({height,turn,cost:Math.abs(turn)*0.65+(height-8.4)*0.3});
    }
  }
  for (const {height,turn,cost} of candidates.sort((a,b)=>a.cost-b.cost)) {
      const angle = heading + turn * Math.PI / 6;
      const eye: PawnPoint = [target[0] + Math.sin(angle) * 10.8, target[1] + height, target[2] + Math.cos(angle) * 10.8];
      const broadBlocked = obstacles.filter(box => pawnSightBlocked(eye, target, box)).length;
      const blocked = broadBlocked && exactBlocked ? exactBlocked(eye,target) : broadBlocked;
      const score = blocked * 100 + cost;
      if (score < best.score) best = { heading: angle, height, blocked, score };
      if (!blocked) break;
  }
  return best;
}

export function tileTrailOpacity(ageMs: number, landing: boolean, reducedMotion = false) {
  const duration = reducedMotion ? 650 : landing ? 2200 : 1250;
  const fade = Math.max(0, 1 - Math.max(0, ageMs) / duration);
  return (landing ? 0.9 : 0.28) * fade * fade;
}

export function completedPawnHops(durations: readonly number[], elapsed: number, last: number) {
  let at=0;
  const completed:{index:number;at:number}[]=[];
  for(let index=0;index<durations.length;index++){
    at+=durations[index];if(at>elapsed)break;
    if(index>last)completed.push({index,at});
  }
  return completed;
}
