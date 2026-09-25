import type { IslandRunGameStateRecord } from './islandRunGameStateStore';
import { ISLAND_RUN_ECONOMY_SOURCES, recordIslandRunDiceInflow } from './islandRunEconomyTelemetry';

export const LANDMARK_COMPLETION_DICE = 5;
const STOP_IDS = ['hatchery', 'habit', 'mystery', 'wisdom', 'boss'] as const;
type RewardRecord = Pick<IslandRunGameStateRecord, 'currentIslandNumber' | 'cycleIndex' | 'islandStartedAtMs' | 'stopStatesByIndex' | 'stopBuildStateByIndex' | 'completedStopsByIsland' | 'dicePool'>;
export type LandmarkRewardStatus = 'locked' | 'earned' | 'legacy-complete';

export function isSameLandmarkVisit(a: RewardRecord, b: RewardRecord): boolean {
  return a.currentIslandNumber === b.currentIslandNumber && a.cycleIndex === b.cycleIndex
    && a.islandStartedAtMs === b.islandStartedAtMs;
}

function bothComplete(record: RewardRecord, index: number): boolean {
  return (record.stopBuildStateByIndex[index]?.buildLevel ?? 0) >= 3
    && (record.stopStatesByIndex[index]?.objectiveComplete === true
      || (record.completedStopsByIsland[String(record.currentIslandNumber)] ?? []).includes(STOP_IDS[index]));
}

export function getLandmarkRewardStatus(record: RewardRecord, index: number): LandmarkRewardStatus {
  if (record.stopStatesByIndex[index]?.completionDiceAwarded === true) return 'earned';
  return bothComplete(record, index) ? 'legacy-complete' : 'locked';
}

/** Pure settlement, called only by completion/build actions, never hydration or UI.
 * Reward and receipt enter the same wallet commit. Do not back-pay old completed
 * landmarks, pay on travel, or treat Island001's synthetic Assembly slot as a building.
 */
export function settleLandmarkCompletionDice<T extends RewardRecord>(previous: T, proposed: T): { record: T; diceAwarded: number } {
  if (!isSameLandmarkVisit(previous, proposed)) return { record: proposed, diceAwarded: 0 };
  let diceAwarded = 0;
  let changed = false;
  const stopStatesByIndex = proposed.stopStatesByIndex.map((entry, index) => {
    const alreadyAwarded = previous.stopStatesByIndex[index]?.completionDiceAwarded === true;
    const eligible = index < STOP_IDS.length && !(proposed.currentIslandNumber === 1 && index === 4);
    const newlyEarned = eligible && !alreadyAwarded && entry.completionDiceAwarded !== true
      && !bothComplete(previous, index) && bothComplete(proposed, index);
    if (newlyEarned) diceAwarded += LANDMARK_COMPLETION_DICE;
    if ((alreadyAwarded || newlyEarned) && entry.completionDiceAwarded !== true) {
      changed = true;
      return { ...entry, completionDiceAwarded: true };
    }
    return entry;
  });
  return { record: changed ? { ...proposed, stopStatesByIndex, dicePool: proposed.dicePool + diceAwarded } : proposed, diceAwarded };
}

/** Action-only adapter; persistence stays with the caller's single commit. */
export function applyLandmarkCompletionReward(previous: IslandRunGameStateRecord, proposed: IslandRunGameStateRecord, sessionId: string): IslandRunGameStateRecord {
  const result = settleLandmarkCompletionDice(previous, proposed);
  if (result.diceAwarded > 0) recordIslandRunDiceInflow({
    source: ISLAND_RUN_ECONOMY_SOURCES.landmarkCompletionDice, amount: result.diceAwarded,
    sessionId, metadata: { island: proposed.currentIslandNumber, cycleIndex: proposed.cycleIndex },
  });
  return result.record;
}
