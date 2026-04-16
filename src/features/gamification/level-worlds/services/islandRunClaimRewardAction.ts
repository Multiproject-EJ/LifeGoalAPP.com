/**
 * islandRunClaimRewardAction — PWA-authority reward-bar claim execution service.
 *
 * This module encapsulates the gameplay truth for a single Island Run reward-bar
 * claim:
 *  1. Validates the precondition (reward bar is full / claimable).
 *  2. Computes the payout via canonical logic (claimIslandRunContractV2RewardBar).
 *  3. Applies the reward payout to the resource pool (spinTokens, dicePool).
 *  4. Persists the full state patch via the existing PWA write path
 *     (writeIslandRunGameStateRecord — the same authority used by IslandRunBoardPrototype).
 *
 * Authority contract:
 *  - Only the PWA may call this function.
 *  - Renderer components emit a `claim_reward_requested` intent; the host then
 *    calls executeIslandRunClaimRewardAction. The renderer never touches this module.
 *  - Payout computation and all resulting state transitions remain solely in the PWA.
 *
 * Intentionally NOT in scope for this service (handled elsewhere or future slices):
 *  - Stop opening / essence spend
 *  - Sound / haptic effects
 *  - Animation state
 *  - Roll actions
 */

import type { Session, SupabaseClient } from '@supabase/supabase-js';
import {
  readIslandRunGameStateRecord,
  writeIslandRunGameStateRecord,
} from './islandRunGameStateStore';
import {
  canClaimIslandRunContractV2RewardBar,
  claimIslandRunContractV2RewardBar,
  type RewardBarClaimPayout,
} from './islandRunContractV2RewardBar';

// ── result types ──────────────────────────────────────────────────────────────

/** Discriminant for the claim action outcome. */
export type IslandRunClaimRewardActionStatus =
  | 'ok'
  | 'not_claimable';

export interface IslandRunClaimRewardActionResult {
  status: IslandRunClaimRewardActionStatus;
  /** Payout detail when status is 'ok'. */
  payout?: RewardBarClaimPayout;
}

// ── action ────────────────────────────────────────────────────────────────────

/**
 * Executes a single reward-bar claim on behalf of the player via the PWA
 * gameplay authority.
 *
 * Callers must guard against concurrent calls (e.g. with a busy/loading flag)
 * because this function does not hold its own mutex.
 *
 * @param options.session - Active Supabase session (used for state key + write auth).
 * @param options.client  - Supabase client for remote persistence; null = local/demo mode.
 * @returns Typed result indicating success or the specific precondition failure.
 */
export async function executeIslandRunClaimRewardAction(options: {
  session: Session;
  client: SupabaseClient | null;
}): Promise<IslandRunClaimRewardActionResult> {
  const { session, client } = options;

  // 1. Read current state from the canonical PWA localStorage store.
  const state = readIslandRunGameStateRecord(session);

  // 2. Guard: reward bar must be full before the player may claim.
  if (!canClaimIslandRunContractV2RewardBar(state)) {
    return { status: 'not_claimable' };
  }

  // 3. Compute payout and derive the updated reward-bar runtime slice.
  //    All payout math originates here in the PWA; the renderer is never
  //    involved in determining what is awarded.
  const nowMs = Date.now();
  const { state: nextRewardBarSlice, payout } = claimIslandRunContractV2RewardBar({
    state,
    nowMs,
  });

  if (!payout) {
    // Defensive: canClaim returned true but payout is null — treat as not_claimable.
    return { status: 'not_claimable' };
  }

  // 4. Merge the updated reward-bar slice and resource adjustments back into
  //    the full record, then persist via the same write path used by
  //    IslandRunBoardPrototype.
  const nextState = {
    ...state,
    runtimeVersion: state.runtimeVersion + 1,
    // Reward-bar fields from the claim result:
    rewardBarProgress: nextRewardBarSlice.rewardBarProgress,
    rewardBarThreshold: nextRewardBarSlice.rewardBarThreshold,
    rewardBarClaimCountInEvent: nextRewardBarSlice.rewardBarClaimCountInEvent,
    rewardBarEscalationTier: nextRewardBarSlice.rewardBarEscalationTier,
    rewardBarLastClaimAtMs: nextRewardBarSlice.rewardBarLastClaimAtMs,
    rewardBarBoundEventId: nextRewardBarSlice.rewardBarBoundEventId,
    rewardBarLadderId: nextRewardBarSlice.rewardBarLadderId,
    activeTimedEvent: nextRewardBarSlice.activeTimedEvent,
    activeTimedEventProgress: nextRewardBarSlice.activeTimedEventProgress,
    stickerProgress: nextRewardBarSlice.stickerProgress,
    stickerInventory: nextRewardBarSlice.stickerInventory,
    // Resource pool adjustments:
    spinTokens: state.spinTokens + payout.minigameTokens,
    dicePool: state.dicePool + payout.dice,
    essence: state.essence + payout.essence,
  };

  await writeIslandRunGameStateRecord({ session, client, record: nextState });

  return { status: 'ok', payout };
}
