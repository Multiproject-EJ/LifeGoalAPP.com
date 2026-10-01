import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';
import { applyWisdomDeferral, getWisdomDeferralKey, resolveWisdomDeferral } from './wisdomDeferral';

/**
 * Canonical Wisdom "Come back later": the stop stays closed for a few rolls and
 * then asks a different prompt. Completion credit is untouched.
 */
export function deferWisdomStop(options: { session: Session; client: SupabaseClient | null; nowMs?: number }) {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    const nowMs = options.nowMs ?? Date.now();
    const current = resolveWisdomDeferral(state.signatureMissionProgressByIsland, state.cycleIndex, state.currentIslandNumber);
    const next = applyWisdomDeferral(current, nowMs);
    await commitIslandRunState({
      session: options.session,
      client: options.client,
      triggerSource: 'wisdom_come_back_later',
      record: {
        ...state,
        runtimeVersion: state.runtimeVersion + 1,
        signatureMissionProgressByIsland: {
          ...state.signatureMissionProgressByIsland,
          [getWisdomDeferralKey(state.cycleIndex, state.currentIslandNumber)]: next,
        },
      },
    });
    return next;
  });
}
