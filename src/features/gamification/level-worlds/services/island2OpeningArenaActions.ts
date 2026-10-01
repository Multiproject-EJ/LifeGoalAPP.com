import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';
import {
  applyOpeningArenaAnchor,
  applyOpeningArenaFundStep,
  applyOpeningArenaOrder,
  getOpeningArenaKey,
  isOpeningArenaAvailable,
  resolveOpeningArenaProgress,
  resolveOpeningArenaStage,
} from './island2OpeningArena';

/** Canonical Island 002 Opening Arena writes (mutex-protected). */
export function orderOpeningArenaHoverBase(options: { session: Session; client: SupabaseClient | null; nowMs?: number }) {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    if (!isOpeningArenaAvailable(state)) return { status: 'unavailable' as const };
    const progress = resolveOpeningArenaProgress(state.signatureMissionProgressByIsland, state.cycleIndex);
    if (resolveOpeningArenaStage(progress) !== 'order') return { status: 'already_ordered' as const };
    const next = applyOpeningArenaOrder(progress, options.nowMs ?? Date.now());
    await commitIslandRunState({
      session: options.session, client: options.client, triggerSource: 'opening_arena_order',
      record: { ...state, runtimeVersion: state.runtimeVersion + 1,
        signatureMissionProgressByIsland: { ...state.signatureMissionProgressByIsland, [getOpeningArenaKey(state.cycleIndex)]: next } },
    });
    return { status: 'ok' as const, progress: next };
  });
}

/** After the arrival cinematic: the hover base is anchored to the island. */
export function anchorOpeningArenaHoverBase(options: { session: Session; client: SupabaseClient | null; nowMs?: number }) {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    if (!isOpeningArenaAvailable(state)) return { status: 'unavailable' as const };
    const progress = resolveOpeningArenaProgress(state.signatureMissionProgressByIsland, state.cycleIndex);
    if (resolveOpeningArenaStage(progress) !== 'arriving') return { status: 'not_arriving' as const };
    const next = applyOpeningArenaAnchor(progress, options.nowMs ?? Date.now());
    await commitIslandRunState({
      session: options.session, client: options.client, triggerSource: 'opening_arena_anchor',
      record: { ...state, runtimeVersion: state.runtimeVersion + 1,
        signatureMissionProgressByIsland: { ...state.signatureMissionProgressByIsland, [getOpeningArenaKey(state.cycleIndex)]: next } },
    });
    return { status: 'ok' as const, progress: next };
  });
}

/** One hold step of money on the Opening Arena. */
export function fundOpeningArena(options: { session: Session; client: SupabaseClient | null; nowMs?: number }) {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    const progress = resolveOpeningArenaProgress(state.signatureMissionProgressByIsland, state.cycleIndex);
    const result = applyOpeningArenaFundStep({
      progress, islandNumber: state.currentIslandNumber, cycleIndex: state.cycleIndex, money: state.essence, nowMs: options.nowMs ?? Date.now(),
    });
    if (result.status !== 'ok') return result;
    await commitIslandRunState({
      session: options.session, client: options.client, triggerSource: 'opening_arena_fund',
      record: { ...state, runtimeVersion: state.runtimeVersion + 1,
        essence: result.money,
        essenceLifetimeSpent: Math.max(0, Math.floor(state.essenceLifetimeSpent)) + result.spent,
        signatureMissionProgressByIsland: { ...state.signatureMissionProgressByIsland, [getOpeningArenaKey(state.cycleIndex)]: result.progress } },
    });
    return result;
  });
}
