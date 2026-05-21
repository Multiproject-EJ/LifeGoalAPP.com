export const WATERING_TREE_PROGRESS_CAP_PERCENT = 75;
export const LOTUS_TREE_PROGRESS_CAP_PERCENT = 25;

export function resolveWisdomTreeProgress(options: {
  treeScore: number;
  stageMinScore: number;
  nextMilestoneMinScore: number | null;
  lotusFlowers: number;
}): number {
  const { treeScore, stageMinScore, nextMilestoneMinScore, lotusFlowers } = options;
  if (nextMilestoneMinScore === null) return 100;

  const span = nextMilestoneMinScore - stageMinScore;
  if (span <= 0) return 100;

  const wateringProgress = Math.min(
    WATERING_TREE_PROGRESS_CAP_PERCENT,
    Math.max(0, Math.round(((treeScore - stageMinScore) / span) * 100)),
  );
  const lotusProgress = Math.min(
    LOTUS_TREE_PROGRESS_CAP_PERCENT,
    Math.max(0, Math.round((lotusFlowers / span) * 100)),
  );

  return Math.min(100, wateringProgress + lotusProgress);
}
