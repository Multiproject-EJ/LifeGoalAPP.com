import { MAX_BUILD_LEVEL } from './islandRunContractV2EssenceBuild';

export const ISLAND_RUN_FULL_RESTORATION_DICE_REWARD = 100;

type BuildLevels = readonly { buildLevel: number }[];

/** Build state persists for the visit and resets on travel, including cycle wrap. */
export function resolveIslandRunRestorationDiceReward(previous: BuildLevels, next: BuildLevels): number {
  const fullyBuilt = (builds: BuildLevels) => builds.length === 5
    && builds.every(build => build.buildLevel >= MAX_BUILD_LEVEL);
  return !fullyBuilt(previous) && fullyBuilt(next) ? ISLAND_RUN_FULL_RESTORATION_DICE_REWARD : 0;
}
