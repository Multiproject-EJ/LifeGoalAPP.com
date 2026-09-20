/** Presentation eligibility only. Completion uses applyStoryPrologueSeenMarker. */
export function shouldPlayIsland001FirstArrival(state: {
  currentIslandNumber: number; cycleIndex: number; storyPrologueSeen: boolean;
  welcomePackRewardBundleClaimed: boolean; tokenIndex: number;
}, hydrated: boolean, preview = false): boolean {
  return hydrated && !preview && state.currentIslandNumber === 1
    && state.cycleIndex === 0 && !state.storyPrologueSeen
    && !state.welcomePackRewardBundleClaimed && state.tokenIndex === 0;
}
export const FIRST_ARRIVAL_DURATION = 29;
export function arrivalBeat(t: number) {
  if (t < 5) return 'FAST TRAVEL';
  if (t < 11) return 'ISLAND 001 · APPROACH';
  if (t < 14) return 'OCEAN LANDING';
  if (t < 20) return 'WELCOME HOME';
  if (t < 26) return 'CREW · DISEMBARK';
  return 'YOUR JOURNEY BEGINS';
}
