import type { CombinedJourneyLevelInput } from './combinedJourneyLevel';

/** Output of the canonical island-completion resolver, never a reward-bar fill. */
export type IslandJourneyProgress = {
  currentIslandNumber: number;
  cycleIndex: number;
  completion: { complete: boolean; percent: number };
};

export function buildIslandJourneyMilestones(progress: IslandJourneyProgress): Pick<
  CombinedJourneyLevelInput, 'islandsCompleted' | 'currentIslandProgressPercent'
> {
  const island = Number.isFinite(progress.currentIslandNumber)
    ? Math.min(120, Math.max(1, Math.floor(progress.currentIslandNumber))) : 1;
  const cycle = Number.isFinite(progress.cycleIndex)
    ? Math.min(100000, Math.max(0, Math.floor(progress.cycleIndex))) : 0;
  const completedBeforeVisit = cycle * 120 + island - 1;
  // Count a cleared island immediately, not only after Travel. Its progress
  // must then be zero to avoid paying the same 100 XP twice.
  return {
    islandsCompleted: completedBeforeVisit + (progress.completion.complete ? 1 : 0),
    currentIslandProgressPercent: progress.completion.complete ? 0
      : Number.isFinite(progress.completion.percent)
        ? Math.min(99, Math.max(0, Math.floor(progress.completion.percent))) : 0,
  };
}
