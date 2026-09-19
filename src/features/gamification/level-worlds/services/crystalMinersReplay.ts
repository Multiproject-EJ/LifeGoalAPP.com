import { MINER_HEIGHT, type MinerBody, type MinerFrame } from './crystalMinersGame';

/** Follow the deepest live tool every frame, including overtakes. Completed
 * tools cannot pin the camera below survivors still making their descent. */
export function createMinerReplayCamera(frames: MinerFrame[]): Array<{ y: number; toolId: number | null; returning: boolean }> {
  let y = 0;
  return frames.map(frame => {
    const survivors = frame.bodies.filter(body => body.active);
    const focus = survivors.reduce<MinerBody | undefined>((leader,body)=>!leader || body.y > leader.y ? body : leader,undefined);
    const toolId = focus?.id ?? null;
    const target = focus ? Math.max(0,Math.min(MINER_HEIGHT-386,focus.y-210)) : y;
    const returning = target < y - 60;
    y += (target-y)*.19;
    // Smooth following must never let a fast leader leave the lower frame.
    if (focus) y = Math.max(y, Math.min(MINER_HEIGHT-386, focus.y-300));
    return { y, toolId, returning };
  });
}
