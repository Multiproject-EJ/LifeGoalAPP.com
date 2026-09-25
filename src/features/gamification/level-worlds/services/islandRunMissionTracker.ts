import { getBossDifficulty, type BossDifficulty } from './bossService';
import { resolveIslandRunCompletion } from './islandRunCompletion';
import { getEggSlotsForIsland } from './islandRunEggMania';
import type { PerIslandEggEntry } from './islandRunGameStateStore';
import { getIslandStance, type IslandStance } from './islandRunIslandStance';
import { resolveIslandMissionObjectives, type IslandMissionObjectivesPresentation } from './islandRunMissionObjectives';
export { ISLAND_MISSION_TRACKER_REGISTRY_VERSION, type IslandMissionTrackerObjective } from './islandRunMissionObjectives';

export type IslandMissionEggStat =
  | { state: 'none' }
  | { state: 'incubating' | 'ready' | 'resolved'; tier: PerIslandEggEntry['tier'] };

/** At-a-glance island facts for the mission phone's stat strip. */
export interface IslandMissionStats {
  completionPercent: number;
  complete: boolean;
  difficulty: BossDifficulty;
  stance: IslandStance;
  egg: IslandMissionEggStat;
}

export interface IslandMissionTrackerPresentation extends IslandMissionObjectivesPresentation {
  islandCompletion: ReturnType<typeof resolveIslandRunCompletion> | null;
  stats: IslandMissionStats;
}

const EGG_TIER_RANK: Record<PerIslandEggEntry['tier'], number> = { common: 0, rare: 1, mythic: 2 };

/** Reports the island's rarest egg; collected and sold eggs count as resolved. */
function resolveIslandEggStat(
  perIslandEggs: Parameters<typeof getEggSlotsForIsland>[0],
  islandNumber: number,
): IslandMissionEggStat {
  const rarest = getEggSlotsForIsland(perIslandEggs, islandNumber)
    .map(({ entry }) => entry)
    .reduce<PerIslandEggEntry | null>((best, entry) => (
      !best || EGG_TIER_RANK[entry.tier] > EGG_TIER_RANK[best.tier] ? entry : best
    ), null);
  if (!rarest) return { state: 'none' };
  const state = rarest.status === 'collected' || rarest.status === 'sold' ? 'resolved' : rarest.status;
  return { state, tier: rarest.tier };
}

/** The phone and departure use the same activity evidence and completion gate. */
export function resolveIslandMissionTrackerPresentation(
  options: Parameters<typeof resolveIslandMissionObjectives>[0],
): IslandMissionTrackerPresentation {
  const islandCompletion = options.state.currentIslandNumber === options.islandNumber
    ? resolveIslandRunCompletion(options.state) : null;
  const presentation = resolveIslandMissionObjectives({ ...options, landmarkCount: islandCompletion?.landmarkCount });
  const complete = islandCompletion?.complete ?? presentation.complete;
  const overallProgressPercent = islandCompletion?.percent ?? presentation.overallProgressPercent;
  return {
    ...presentation,
    complete,
    overallProgressPercent,
    islandCompletion,
    stats: {
      completionPercent: overallProgressPercent,
      complete,
      difficulty: getBossDifficulty(options.islandNumber),
      stance: getIslandStance(options.islandNumber),
      egg: resolveIslandEggStat(options.state.perIslandEggs, options.islandNumber),
    },
  };
}
