import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';
import { resolveIslandRunFeatureAccess } from './islandRunFeatureAccess';
import { reconcileIslandRunStopObjectivesFromCompletionLedger, resolveIslandRunContractV2Stops } from './islandRunContractV2StopResolver';
import { applyLandmarkCompletionReward } from './islandRunLandmarkReward';

/** An explicit free arrival activity, not construction credit or an egg grant.
 * Keep the existing internal stop ID and derive the next stop with the shared
 * resolver. The visit key rejects callbacks from a modal left open on travel. */
export function completeIslandRunWelcomeCheckIn(options: {
  session: Session; client: SupabaseClient | null; visitKey: string;
}) {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    if (!resolveIslandRunFeatureAccess(state).welcomeCheckIn
      || options.visitKey !== `${state.cycleIndex}:${state.currentIslandNumber}`) {
      return { status: 'ineligible' as const };
    }
    const islandKey = String(state.currentIslandNumber);
    const completedStops = state.completedStopsByIsland[islandKey] ?? [];
    if (state.stopStatesByIndex[0]?.objectiveComplete || completedStops.includes('hatchery')) {
      return { status: 'already-complete' as const };
    }
    const stopStatesByIndex = reconcileIslandRunStopObjectivesFromCompletionLedger({
      stopStatesByIndex: state.stopStatesByIndex,
      completedStops,
    }).map((entry, index) => index === 0 ? {
      ...entry, objectiveComplete: true, accessUnlocked: true,
      postponedAtMs: null, completedAtMs: Date.now(),
    } : entry);
    const stops = resolveIslandRunContractV2Stops({ stopStatesByIndex,
      stopTicketsPaidByIsland: state.stopTicketsPaidByIsland, islandNumber: state.currentIslandNumber });
    const record = applyLandmarkCompletionReward(state, {
        ...state, runtimeVersion: state.runtimeVersion + 1, stopStatesByIndex,
        activeStopIndex: stops.activeStopIndex, activeStopType: stops.activeStopType,
        completedStopsByIsland: { ...state.completedStopsByIsland, [islandKey]: [...completedStops, 'hatchery'] },
      }, options.session.user.id);
    await commitIslandRunState({ session: options.session, client: options.client,
      triggerSource: 'complete_welcome_check_in', record,
    });
    return { status: 'completed' as const };
  });
}
