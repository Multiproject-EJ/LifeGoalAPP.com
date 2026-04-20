/**
 * islandRunStateActions — pure action functions that mutate Island Run
 * gameplay state through the store ({@link islandRunStateStore}).
 *
 * Stage C1 introduces:
 * - {@link applyRollResult} — absorbs the result of
 *   `executeIslandRunRollAction` and syncs the store mirror with the
 *   roll-service's authoritative localStorage write.
 * - {@link applyTokenHopRewards} — applies per-hop dice/spinToken/essence
 *   deltas (reward-bar claims, minigame payouts) through the store's
 *   commit path.
 *
 * These functions replace the `useEffect` persist effect in the renderer
 * that raced with the roll service (the #1 drift vector).
 *
 * Lifecycle:
 * - Both functions update the in-memory store mirror synchronously, so the
 *   next `useSyncExternalStore` render cycle sees the new state.
 * - `applyRollResult` does NOT issue a remote write — the roll service
 *   already committed to localStorage + Supabase.
 * - `applyTokenHopRewards` commits the full record (mirror + localStorage
 *   + Supabase) via {@link commitIslandRunState}.
 */

import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { IslandRunGameStateRecord } from './islandRunGameStateStore';
import {
  commitIslandRunState,
  getIslandRunStateSnapshot,
  refreshIslandRunStateFromLocal,
} from './islandRunStateStore';

// ── applyRollResult ──────────────────────────────────────────────────────────

/**
 * Syncs the store mirror with the roll service's authoritative
 * localStorage write. Call this once after the roll + hop animation
 * sequence completes.
 *
 * Returns the refreshed record so the renderer can forward it to
 * `setRuntimeState` (the legacy in-memory mirror that other effects still
 * depend on during the Stage-C migration).
 *
 * **No remote write** — the roll service's `writeIslandRunGameStateRecord`
 * already committed to Supabase.
 */
export function applyRollResult(options: {
  session: Session;
}): IslandRunGameStateRecord {
  refreshIslandRunStateFromLocal(options.session);
  return getIslandRunStateSnapshot(options.session);
}

// ── applyTokenHopRewards ─────────────────────────────────────────────────────

export interface TokenHopRewardsDeltas {
  /** Spin / minigame tokens delta (positive = earned, negative = spent). */
  spinTokens?: number;
  /** Dice delta (positive = earned). */
  dicePool?: number;
  /** Essence delta (positive = earned). */
  essence?: number;
}

/**
 * Applies per-hop or per-claim currency deltas to the authoritative store.
 *
 * Reads the latest store snapshot, merges the deltas, commits the full
 * record (mirror + localStorage + Supabase). The mirror is updated
 * synchronously so the next render cycle sees the change.
 *
 * Returns the committed record for forwarding to `setRuntimeState`.
 */
export function applyTokenHopRewards(options: {
  session: Session;
  client: SupabaseClient | null;
  deltas: TokenHopRewardsDeltas;
  triggerSource?: string;
}): IslandRunGameStateRecord {
  const { session, client, deltas, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  const clamp0 = (v: number) => Math.max(0, v);
  const next: IslandRunGameStateRecord = {
    ...current,
    runtimeVersion: current.runtimeVersion + 1,
    spinTokens: clamp0(current.spinTokens + (deltas.spinTokens ?? 0)),
    dicePool: clamp0(current.dicePool + (deltas.dicePool ?? 0)),
    essence: clamp0(current.essence + (deltas.essence ?? 0)),
  };
  // Synchronous mirror update + async persist (fire-and-forget).
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_token_hop_rewards',
  });
  return next;
}
