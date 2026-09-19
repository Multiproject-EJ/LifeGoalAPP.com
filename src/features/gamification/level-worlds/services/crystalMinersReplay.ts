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

/** Presentation only: preserve suspense until the final chest that can be reached
 * has opened, give its reveal 700 ms, then compress a long unproductive tail. */
export function createMinerReplayTiming(frames: MinerFrame[]) {
  if(frames.length<2)return {times:[0],duration:0,fastFrom:-1};
  const baseDuration=Math.min(26000,Math.max(5000,frames[frames.length-1].step/60*650));
  const interval=baseDuration/(frames.length-1);
  let lastChest=-1;
  frames.forEach((frame,index)=>{if(frame.hits.some(h=>h.kind==='treasure'&&h.broken))lastChest=index;});
  const candidate=lastChest+Math.ceil(700/interval);
  const fastFrom=lastChest>=0 && (frames.length-1-candidate)*interval>1800 ? candidate : -1;
  const times=[0];
  for(let i=1;i<frames.length;i++)times.push(times[i-1]+interval/(fastFrom>=0&&i>=fastFrom?2.25:1));
  return {times,duration:times[times.length-1],fastFrom};
}
export function minerReplayFrameAt(times:number[],elapsedMs:number):number {
  let low=0,high=times.length-1;
  while(low<high){const mid=Math.ceil((low+high)/2);if(times[mid]<=elapsedMs)low=mid;else high=mid-1;}
  return Math.max(0,low);
}
