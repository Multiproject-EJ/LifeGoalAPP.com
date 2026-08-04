import type { IslandRunFirstSessionTutorialState } from '../services/islandRunGameStateStore';
import { isIslandRunFragmentOnlyBoardPhase } from '../services/islandRunFirstSessionTutorialUi';

export type DiplomaticRewardChannelVisibilityInput = {
  currentIslandNumber: number;
  cycleIndex: number;
  firstSessionTutorialState: IslandRunFirstSessionTutorialState;
};

/**
 * The reward system remains canonical and may accumulate progress while hidden.
 * Presentation wakes only after Central Command's DIPLOMATIC EFFORT order is
 * accepted. That acknowledgement also activates ordinary tile functions, so
 * the route and reward bar reveal as one atomic visual event.
 */
export function isDiplomaticRewardChannelVisible({
  currentIslandNumber,
  cycleIndex,
  firstSessionTutorialState,
}: DiplomaticRewardChannelVisibilityInput): boolean {
  if (currentIslandNumber !== 1 || cycleIndex !== 0) return true;
  return !isIslandRunFragmentOnlyBoardPhase(firstSessionTutorialState);
}
