/** Presentation eligibility only. Completion uses applyStoryPrologueSeenMarker. */
export function shouldPlayIsland001FirstArrival(state: {
  currentIslandNumber: number; cycleIndex: number; storyPrologueSeen: boolean;
  welcomePackRewardBundleClaimed: boolean; tokenIndex: number;
}, hydrated: boolean, preview = false): boolean {
  return hydrated && !preview && state.currentIslandNumber === 1
    && state.cycleIndex === 0 && !state.storyPrologueSeen
    && state.tokenIndex === 0;
}
export const FIRST_ARRIVAL_DURATION = 29;
export const FIRST_ARRIVAL_WELCOME_TIME = 19.8;
export function arrivalBeat(t: number) {
  if (t < 5) return 'FAST TRAVEL';
  if (t < 11) return 'ISLAND 001 · APPROACH';
  if (t < 14) return 'OCEAN LANDING';
  if (t < 20) return 'WELCOME HOME';
  if (t < 26) return 'CREW · DISEMBARK';
  return 'YOUR JOURNEY BEGINS';
}

/** Presentation clock: supplies must be acknowledged before anybody leaves the ship. */
export function advanceFirstArrivalTime(time:number, delta:number, options:{hidden:boolean;skip:boolean;reducedMotion:boolean;waitForWelcome:boolean;welcomeComplete:boolean}):number {
  let next=time+(options.hidden?0:Math.min(Math.max(delta,0),.25)*1.25);
  if(options.skip||options.reducedMotion) next=Math.max(next,FIRST_ARRIVAL_DURATION);
  if(options.waitForWelcome&&!options.welcomeComplete) next=Math.min(next,FIRST_ARRIVAL_WELCOME_TIME);
  return next;
}
