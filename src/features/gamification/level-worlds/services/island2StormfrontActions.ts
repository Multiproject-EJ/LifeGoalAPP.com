import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';
import {
  applyStormfrontFundStep,
  applyStormfrontStrike,
  getStormfrontKey,
  resolveStormfrontProgress,
  shouldStrikeStormfront,
  type StormfrontStructureId,
} from './island2Stormfront';

/**
 * Canonical Island 002 Stormfront writes (mutex-protected). The strike is
 * committed before the storm is shown, so a reload never skips or repeats it.
 */
export function strikeIsland2Stormfront(options: { session: Session; client: SupabaseClient | null; nowMs?: number }) {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    const progress = resolveStormfrontProgress(state.signatureMissionProgressByIsland, state.cycleIndex);
    if (!shouldStrikeStormfront(state, progress)) return { status: 'not_ready' as const };
    const nowMs = options.nowMs ?? Date.now();
    const strike = applyStormfrontStrike({ state, progress, nowMs });
    await commitIslandRunState({
      session: options.session,
      client: options.client,
      triggerSource: 'island2_stormfront_strike',
      record: {
        ...state,
        runtimeVersion: state.runtimeVersion + 1,
        stopBuildStateByIndex: strike.stopBuildStateByIndex,
        stopStatesByIndex: strike.stopStatesByIndex,
        signatureMissionProgressByIsland: {
          ...state.signatureMissionProgressByIsland,
          [getStormfrontKey(state.cycleIndex)]: strike.progress,
        },
      },
    });
    return { status: 'ok' as const, progress: strike.progress };
  });
}

/** One hold step of money on a storm-safe structure. */
export function fundIsland2StormfrontStructure(options: {
  session: Session;
  client: SupabaseClient | null;
  structureId: StormfrontStructureId;
  nowMs?: number;
}) {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    const progress = resolveStormfrontProgress(state.signatureMissionProgressByIsland, state.cycleIndex);
    const result = applyStormfrontFundStep({
      progress,
      structureId: options.structureId,
      islandNumber: state.currentIslandNumber,
      cycleIndex: state.cycleIndex,
      money: state.essence,
      nowMs: options.nowMs ?? Date.now(),
    });
    if (result.status !== 'ok') return result;
    await commitIslandRunState({
      session: options.session,
      client: options.client,
      triggerSource: 'island2_stormfront_fund',
      record: {
        ...state,
        runtimeVersion: state.runtimeVersion + 1,
        essence: result.money,
        essenceLifetimeSpent: Math.max(0, Math.floor(state.essenceLifetimeSpent)) + result.spent,
        signatureMissionProgressByIsland: {
          ...state.signatureMissionProgressByIsland,
          [getStormfrontKey(state.cycleIndex)]: result.progress,
        },
      },
    });
    return result;
  });
}

/** Presentation bookkeeping: the storm was shown once and is not replayed. */
export function markIsland2StormfrontSeen(options: { session: Session; client: SupabaseClient | null; nowMs?: number }) {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    const progress = resolveStormfrontProgress(state.signatureMissionProgressByIsland, state.cycleIndex);
    if (progress.struckAtMs === null || progress.cinematicSeenAtMs !== null) return { status: 'noop' as const };
    const nowMs = options.nowMs ?? Date.now();
    await commitIslandRunState({
      session: options.session,
      client: options.client,
      triggerSource: 'island2_stormfront_seen',
      record: {
        ...state,
        runtimeVersion: state.runtimeVersion + 1,
        signatureMissionProgressByIsland: {
          ...state.signatureMissionProgressByIsland,
          [getStormfrontKey(state.cycleIndex)]: { ...progress, cinematicSeenAtMs: nowMs, updatedAtMs: nowMs },
        },
      },
    });
    return { status: 'ok' as const };
  });
}
