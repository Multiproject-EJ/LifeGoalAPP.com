import { MINER_HEIGHT, type MinerBody, type MinerFrame, type MinerHit } from './crystalMinersGame';

/** Follow the deepest live tool every frame, including overtakes. Completed
 * tools cannot pin the camera below survivors still making their descent. */
export function createMinerReplayCamera(frames: MinerFrame[],height=MINER_HEIGHT): Array<{ y: number; toolId: number | null; returning: boolean }> {
  let y = 0;
  return frames.map(frame => {
    const survivors = frame.bodies.filter(body => body.active);
    const focus = survivors.reduce<MinerBody | undefined>((leader,body)=>!leader || body.y > leader.y ? body : leader,undefined);
    const toolId = focus?.id ?? null;
    const target = focus ? Math.max(0,Math.min(height-386,focus.y-210)) : y;
    const returning = target < y - 60;
    y += (target-y)*.19;
    // Smooth following must never let a fast leader leave the lower frame.
    if (focus) y = Math.max(y, Math.min(height-386, focus.y-300));
    return { y, toolId, returning };
  });
}

export interface MinerVisualEvent { hit:MinerHit; at:number; duration:number; priority:number }
/** Build once per replay. A time-based window survives dropped rendering frames;
 * reward effects cannot be crowded out by a shower of ordinary nonbreaking hits. */
export function createMinerVisualEvents(frames:MinerFrame[],times:number[]):MinerVisualEvent[] {
  return frames.flatMap((frame,i)=>Array.from(new Map(frame.hits.map(hit=>[`${hit.step}-${hit.blockId}`,hit])).values()).map(hit=>({hit,at:times[i]??0,duration:hit.broken?700:220,
    priority:hit.broken&&['ticket','gift','balloon','spawner','charger','key','gate','boss','treasure'].includes(hit.kind)?3:hit.broken?2:1})));
}
export function minerVisibleEffects(events:MinerVisualEvent[],elapsed:number,cameraY:number,limit=32):MinerHit[] {
  return events.filter(e=>e.at<=elapsed&&elapsed-e.at<e.duration&&e.hit.y>=cameraY-70&&e.hit.y<=cameraY+456)
    .sort((a,b)=>b.priority-a.priority||b.at-a.at).slice(0,Math.max(0,Math.min(32,limit)))
    .sort((a,b)=>a.at-b.at).map(e=>e.hit);
}

/** Presentation only: preserve suspense until the final chest that can be reached
 * has opened, give its reveal 700 ms, then compress a long unproductive tail. */
export function createMinerReplayTiming(frames: MinerFrame[]) {
  if(frames.length<2)return {times:[0],duration:0,travelDuration:0,celebrationMs:0,fastFrom:-1};
  const baseDuration=Math.min(26000,Math.max(5000,frames[frames.length-1].step/60*650));
  const interval=baseDuration/(frames.length-1);
  let lastChest=-1;
  frames.forEach((frame,index)=>{if(frame.hits.some(h=>h.kind==='treasure'&&h.broken))lastChest=index;});
  const candidate=lastChest+Math.ceil(700/interval);
  const fastFrom=lastChest>=0 && (frames.length-1-candidate)*interval>1800 ? candidate : -1;
  const times=[0];
  for(let i=1;i<frames.length;i++)times.push(times[i-1]+interval/(fastFrom>=0&&i>=fastFrom?2.25:1));
  // Hold a terminal blast so losing the last tool does not hide the weapon hit.
  const finalBlastHold=frames[frames.length-1].bossAttack?.phase==='fire'?600:0;
  const travelDuration=times[times.length-1]+finalBlastHold;
  const celebrationMs=lastChest>=0?1100:0;
  return {times,travelDuration,celebrationMs,duration:travelDuration+celebrationMs,fastFrom};
}
export function minerReplayFrameAt(times:number[],elapsedMs:number):number {
  let low=0,high=times.length-1;
  while(low<high){const mid=Math.ceil((low+high)/2);if(times[mid]<=elapsedMs)low=mid;else high=mid-1;}
  return Math.max(0,low);
}
