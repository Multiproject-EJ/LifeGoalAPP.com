import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';
import { resolveIslandRunFeatureAccess } from './islandRunFeatureAccess';
import { reconcileIslandRunStopObjectivesFromCompletionLedger, resolveIslandRunContractV2Stops } from './islandRunContractV2StopResolver';

/** Island001 teaches the route before Island002 introduces live games.
 * Construction, paying a ticket or opening the dialog do not finish this activity. */
export function completeIslandRunArenaOrientation(options: {
  session: Session; client: SupabaseClient | null; visitKey: string;
  answers: readonly string[];
}) {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    if (!resolveIslandRunFeatureAccess(state).arenaOrientation
      || options.visitKey !== `${state.cycleIndex}:${state.currentIslandNumber}`) {
      return { status: 'ineligible' as const };
    }
    if (options.answers.length !== 2 || options.answers[0] !== 'build-landmarks'
      || options.answers[1] !== 'island-002') return { status: 'incomplete' as const };
    const islandKey = String(state.currentIslandNumber);
    const completedStops = state.completedStopsByIsland[islandKey] ?? [];
    const reconciled = reconcileIslandRunStopObjectivesFromCompletionLedger({
      stopStatesByIndex: state.stopStatesByIndex, completedStops,
    });
    if (reconciled[2]?.objectiveComplete) return { status: 'already-complete' as const };
    const access = resolveIslandRunContractV2Stops({ stopStatesByIndex: reconciled,
      stopTicketsPaidByIsland: state.stopTicketsPaidByIsland, islandNumber: state.currentIslandNumber });
    if (!['active', 'accessible', 'postponed'].includes(access.statusesByIndex[2] ?? 'locked')) {
      return { status: 'ineligible' as const };
    }
    const stopStatesByIndex = reconciled.map((entry, index) => index === 2 ? {
      ...entry, objectiveComplete: true, accessUnlocked: true,
      postponedAtMs: null, completedAtMs: Date.now(),
    } : entry);
    const next = resolveIslandRunContractV2Stops({ stopStatesByIndex,
      stopTicketsPaidByIsland: state.stopTicketsPaidByIsland, islandNumber: state.currentIslandNumber });
    await commitIslandRunState({ session: options.session, client: options.client,
      triggerSource: 'complete_first_island_orientation', record: {
        ...state, runtimeVersion: state.runtimeVersion + 1, stopStatesByIndex,
        activeStopIndex: next.activeStopIndex, activeStopType: next.activeStopType,
        completedStopsByIsland: { ...state.completedStopsByIsland, [islandKey]: [...completedStops, 'mystery'] },
      },
    });
    return { status: 'completed' as const };
  });
}
