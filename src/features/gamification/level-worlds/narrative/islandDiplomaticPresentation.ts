export type DiplomaticRewardChannelVisibilityInput = {
  currentIslandNumber: number;
  cycleIndex: number;
  hatcheryBuildLevel: number | null | undefined;
};

/**
 * The reward system remains canonical and may accumulate progress while hidden.
 * This helper controls presentation only: a brand-new Island 1 expedition sees
 * the channel after its first visible act of reconstruction.
 */
export function isDiplomaticRewardChannelVisible({
  currentIslandNumber,
  cycleIndex,
  hatcheryBuildLevel,
}: DiplomaticRewardChannelVisibilityInput): boolean {
  if (currentIslandNumber !== 1 || cycleIndex !== 0) return true;
  return typeof hatcheryBuildLevel === 'number' && hatcheryBuildLevel >= 1;
}
