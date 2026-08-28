import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { IslandRunGameStateRecord } from './islandRunGameStateStore';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { getEffectiveIslandNumber, initStopBuildStatesForIsland } from './islandRunContractV2EssenceBuild';
import { getIslandMissionBriefingBeatId } from './islandRunMissionBriefing';
import { getIslandRunSignatureMissionKey } from './islandRunSignatureMissions';
import { TOKEN_START_TILE_INDEX } from './islandBoardLayout';
import { isIslandRunFragmentOnlyBoardPhase } from './islandRunFirstSessionTutorialUi';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';

export interface ResetCurrentIslandMissionForDevResult {
  status: 'reset';
  islandNumber: number;
  cycleIndex: number;
  record: IslandRunGameStateRecord;
}

/**
 * Builds a fresh mission attempt for the currently loaded island while
 * preserving the player's wallet, dice, egg, timer, collections, and account
 * progression. The pawn returns to the route start; an Island 1 developer
 * replay also releases any fragment-only intro gate so its signature pickups
 * are active immediately. This is intentionally broader than deleting
 * signature mission progress: standard island missions derive their progress
 * from the canonical stop/build ledgers, so those current-island fields must
 * be reset together.
 */
export function buildCurrentIslandMissionResetRecord(
  current: IslandRunGameStateRecord,
): IslandRunGameStateRecord {
  const islandNumber = current.currentIslandNumber;
  const cycleIndex = current.cycleIndex;
  const islandKey = String(islandNumber);
  const signatureMissionKey = getIslandRunSignatureMissionKey(cycleIndex, islandNumber);
  const briefingBeatId = getIslandMissionBriefingBeatId(cycleIndex, islandNumber);
  const signatureMissionProgressByIsland = { ...current.signatureMissionProgressByIsland };
  const narrativeBeats = { ...current.narrativeSeenState.beats };

  delete signatureMissionProgressByIsland[signatureMissionKey];
  delete narrativeBeats[briefingBeatId];
  const shouldReleaseIslandOneIntroGate = islandNumber === 1
    && cycleIndex === 0
    && isIslandRunFragmentOnlyBoardPhase(current.firstSessionTutorialState);

  return {
    ...current,
    runtimeVersion: current.runtimeVersion + 1,
    tokenIndex: TOKEN_START_TILE_INDEX,
    firstSessionTutorialState: shouldReleaseIslandOneIntroGate
      ? 'first_roll_consumed'
      : current.firstSessionTutorialState,
    activeStopIndex: 0,
    activeStopType: 'hatchery',
    bossTrialResolvedIslandNumber: current.bossTrialResolvedIslandNumber === islandNumber
      ? null
      : current.bossTrialResolvedIslandNumber,
    bossState: {
      unlocked: false,
      objectiveComplete: false,
      buildComplete: false,
      arenaBattle: null,
    },
    stopStatesByIndex: Array.from({ length: 5 }, () => ({
      objectiveComplete: false,
      buildComplete: false,
    })),
    stopBuildStateByIndex: initStopBuildStatesForIsland(
      getEffectiveIslandNumber(islandNumber, cycleIndex),
    ),
    completedStopsByIsland: {
      ...current.completedStopsByIsland,
      [islandKey]: [],
    },
    vaultRushClaimsByIsland: {
      ...current.vaultRushClaimsByIsland,
      [String(getEffectiveIslandNumber(islandNumber, cycleIndex))]: 0,
    },
    stopTicketsPaidByIsland: {
      ...current.stopTicketsPaidByIsland,
      [islandKey]: [],
    },
    narrativeSeenState: {
      episodes: { ...current.narrativeSeenState.episodes },
      beats: narrativeBeats,
    },
    signatureMissionProgressByIsland,
  };
}

/**
 * Canonical developer action for replaying the current island mission.
 * `replace` conflict mode is required because mission/briefing ledgers merge
 * monotonically during ordinary gameplay; a deliberate reset tombstone would
 * otherwise be resurrected by a stale remote record.
 */
export function resetCurrentIslandMissionForDev(options: {
  session: Session;
  client: SupabaseClient | null;
}): Promise<ResetCurrentIslandMissionForDevResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const current = getIslandRunStateSnapshot(options.session);
    const record = buildCurrentIslandMissionResetRecord(current);
    const result = await commitIslandRunState({
      session: options.session,
      client: options.client,
      record,
      triggerSource: 'dev_reset_current_island_mission',
      conflictMode: 'replace',
    });
    if (!result.ok) {
      throw new Error(result.errorMessage);
    }
    return {
      status: 'reset',
      islandNumber: current.currentIslandNumber,
      cycleIndex: current.cycleIndex,
      record,
    };
  });
}
