/**
 * islandRunStateActions — pure action functions that mutate Island Run
 * gameplay state through the store ({@link islandRunStateStore}).
 *
 * Stage C1 introduced:
 * - {@link applyRollResult} — absorbs the result of
 *   `executeIslandRunRollAction` and syncs the store mirror with the
 *   roll-service's authoritative localStorage write.
 * - {@link applyTokenHopRewards} — applies per-hop dice/spinToken/essence
 *   deltas (reward-bar claims, minigame payouts) through the store's
 *   commit path.
 *
 * Stage C2 adds (tile/encounter reward + reward-bar + drift):
 * - {@link applyEssenceAward} — credit essence to the wallet.
 * - {@link applyEssenceDeduct} — withdraw essence (hazard / ticket / build).
 * - {@link applyRewardBarState} — commit the full reward-bar + timed-event +
 *   sticker snapshot.
 * - {@link applyEssenceDriftTick} — 5-minute essence drift interval.
 *
 * These functions replace the renderer-side `useEffect` + inlined
 * `persistIslandRunRuntimeStatePatch` calls that raced with the roll
 * service and with each other (the multi-writer drift vectors documented
 * in `STAGE_C_STATE_ARCHITECTURE_MIGRATION.md`).
 *
 * Lifecycle:
 * - All Stage-C actions update the in-memory store mirror synchronously
 *   (via {@link commitIslandRunState}'s `publish`), so the next
 *   `useSyncExternalStore` render cycle sees the new state.
 * - `applyRollResult` does NOT issue a remote write — the roll service
 *   already committed to localStorage + Supabase. Every other action
 *   commits the full record (mirror + localStorage + Supabase) via
 *   {@link commitIslandRunState}.
 */

import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { IslandRunGameStateRecord } from './islandRunGameStateStore';
import {
  commitIslandRunState,
  getIslandRunStateSnapshot,
  refreshIslandRunStateFromLocal,
} from './islandRunStateStore';
import {
  applyEssenceDrift,
  awardIslandRunContractV2Essence,
  deductIslandRunContractV2Essence,
  getRemainingIslandBuildCost,
} from './islandRunContractV2EssenceBuild';
import { isIslandRunFullyClearedV2 } from './islandRunContractV2StopResolver';

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

// ── C2: Essence award / spend / reward-bar / drift ───────────────────────────

export interface ApplyEssenceAwardOptions {
  session: Session;
  client: SupabaseClient | null;
  /** Contract-V2 feature flag; forwarded to `awardIslandRunContractV2Essence`. */
  islandRunContractV2Enabled: boolean;
  /** Raw award amount requested (pre-clamp). Negative / non-integer values are ignored. */
  amount: number;
  /** Tag for telemetry / writer `triggerSource`. */
  triggerSource?: string;
}

export interface ApplyEssenceAwardResult {
  /** The committed record (mirror + localStorage; Supabase fire-and-forget). */
  record: IslandRunGameStateRecord;
  /** Amount actually credited after contract-v2 clamping. Zero when the flag is off or the amount rounds below 1. */
  earned: number;
}

/**
 * Awards essence to the wallet through the store commit path.
 *
 * Replaces the renderer-side `persistIslandRunRuntimeStatePatch({ essence, essenceLifetimeEarned })` +
 * paired `setRuntimeState` that used to race the roll service's commit. The
 * previous read-modify-write happened through `runtimeStateRef.current`; the
 * store snapshot is now the authoritative source so concurrent awards on
 * disjoint fields no longer silently drop data.
 *
 * No-op (returns the current snapshot and `earned: 0`) when the contract-v2
 * flag is off or the requested amount rounds below 1.
 */
export function applyEssenceAward(options: ApplyEssenceAwardOptions): ApplyEssenceAwardResult {
  const { session, client, islandRunContractV2Enabled, amount, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  const result = awardIslandRunContractV2Essence({
    islandRunContractV2Enabled,
    essence: current.essence,
    essenceLifetimeEarned: current.essenceLifetimeEarned,
    amount,
  });
  if (result.earned < 1) {
    return { record: current, earned: 0 };
  }
  const next: IslandRunGameStateRecord = {
    ...current,
    essence: result.essence,
    essenceLifetimeEarned: result.essenceLifetimeEarned,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_essence_award',
  });
  return { record: next, earned: result.earned };
}

export interface ApplyEssenceDeductOptions {
  session: Session;
  client: SupabaseClient | null;
  islandRunContractV2Enabled: boolean;
  /** Amount to withdraw (pre-clamp). Wallet is clamped at 0 — callers may deduct less than requested. */
  amount: number;
  triggerSource?: string;
}

export interface ApplyEssenceDeductResult {
  record: IslandRunGameStateRecord;
  /** Amount actually debited (may be less than requested when the wallet was short). */
  spent: number;
}

/**
 * Withdraws essence from the wallet through the store commit path.
 *
 * Replaces the renderer-side patch+setRuntimeState pair used by hazard-tile
 * penalties, stop-ticket purchases, and any other essence spend — same
 * rationale as {@link applyEssenceAward} but in the spend direction.
 * `essenceLifetimeEarned` is left unchanged (drift / hazard losses are not
 * lifetime unearnings).
 */
export function applyEssenceDeduct(options: ApplyEssenceDeductOptions): ApplyEssenceDeductResult {
  const { session, client, islandRunContractV2Enabled, amount, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  const result = deductIslandRunContractV2Essence({
    islandRunContractV2Enabled,
    essence: current.essence,
    essenceLifetimeSpent: current.essenceLifetimeSpent,
    amount,
  });
  if (result.spent < 1) {
    return { record: current, spent: 0 };
  }
  const next: IslandRunGameStateRecord = {
    ...current,
    essence: result.essence,
    essenceLifetimeSpent: result.essenceLifetimeSpent,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_essence_deduct',
  });
  return { record: next, spent: result.spent };
}

export interface RewardBarRuntimeState {
  rewardBarProgress: number;
  rewardBarThreshold: number;
  rewardBarClaimCountInEvent: number;
  rewardBarEscalationTier: number;
  rewardBarLastClaimAtMs: number | null;
  rewardBarBoundEventId: string | null;
  rewardBarLadderId: string | null;
  activeTimedEvent: IslandRunGameStateRecord['activeTimedEvent'];
  activeTimedEventProgress: IslandRunGameStateRecord['activeTimedEventProgress'];
  stickerProgress: IslandRunGameStateRecord['stickerProgress'];
  stickerInventory: IslandRunGameStateRecord['stickerInventory'];
}

export interface ApplyRewardBarStateOptions {
  session: Session;
  client: SupabaseClient | null;
  nextState: RewardBarRuntimeState;
  triggerSource?: string;
}

/**
 * Commits a full reward-bar / timed-event / sticker snapshot through the
 * store.
 *
 * Replaces the renderer's `applyContractV2RewardBarRuntimeState` inlined
 * `persistIslandRunRuntimeStatePatch` + paired `setRuntimeState`. The
 * reward-bar cascade is the highest-contention non-roll write (fires on
 * every reward-earning tile landing + every claim), so routing it through
 * the commit coordinator removes a class of overlap bugs where a tile
 * landing's bar progress could race an auto-claim's bar reset.
 */
export function applyRewardBarState(options: ApplyRewardBarStateOptions): IslandRunGameStateRecord {
  const { session, client, nextState, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  const next: IslandRunGameStateRecord = {
    ...current,
    rewardBarProgress: nextState.rewardBarProgress,
    rewardBarThreshold: nextState.rewardBarThreshold,
    rewardBarClaimCountInEvent: nextState.rewardBarClaimCountInEvent,
    rewardBarEscalationTier: nextState.rewardBarEscalationTier,
    rewardBarLastClaimAtMs: nextState.rewardBarLastClaimAtMs,
    rewardBarBoundEventId: nextState.rewardBarBoundEventId,
    rewardBarLadderId: nextState.rewardBarLadderId,
    activeTimedEvent: nextState.activeTimedEvent,
    activeTimedEventProgress: nextState.activeTimedEventProgress,
    stickerProgress: nextState.stickerProgress,
    stickerInventory: nextState.stickerInventory,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_reward_bar_state',
  });
  return next;
}

export interface ApplyEssenceDriftTickOptions {
  session: Session;
  client: SupabaseClient | null;
  /** Effective island number to price drift against (usually = currentIslandNumber). */
  effectiveIslandNumber: number;
  /** ms since the previous drift tick (may be larger than the 5-minute interval after sleep/suspend). */
  elapsedMs: number;
  triggerSource?: string;
}

export interface ApplyEssenceDriftTickResult {
  record: IslandRunGameStateRecord;
  /** Essence lost to drift on this tick. Zero when the island is built-out or the wallet is below threshold. */
  driftLost: number;
}

/**
 * Applies the 5-minute essence-drift interval tick through the store.
 *
 * Reads the live store snapshot for the wallet, stop states, and egg
 * ledger; computes drift via the pure {@link applyEssenceDrift} helper;
 * commits `{ essence, lastEssenceDriftLost }` only when drift actually
 * fires. When no essence was lost this is a cheap no-op — no commit, no
 * subscriber notification.
 *
 * Replaces the renderer's drift `useEffect` inlined `setRuntimeState` +
 * `persistIslandRunRuntimeStatePatch`. The `runtimeStateRef.current` reads
 * are replaced by a single store snapshot read so the drift computation
 * always sees a consistent view.
 */
export function applyEssenceDriftTick(options: ApplyEssenceDriftTickOptions): ApplyEssenceDriftTickResult {
  const { session, client, effectiveIslandNumber, elapsedMs, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  if (current.essence <= 0 || elapsedMs <= 0) {
    return { record: current, driftLost: 0 };
  }
  const islandKey = String(current.currentIslandNumber);
  const eggEntry = current.perIslandEggs?.[islandKey];
  const eggResolved = eggEntry?.status === 'collected' || eggEntry?.status === 'sold';
  const islandComplete = isIslandRunFullyClearedV2({
    stopStatesByIndex: current.stopStatesByIndex,
    stopBuildStateByIndex: current.stopBuildStateByIndex,
    hatcheryEggResolved: eggResolved,
  });
  const driftResult = applyEssenceDrift({
    essence: current.essence,
    islandNumber: effectiveIslandNumber,
    elapsedMs,
    isIslandComplete: islandComplete,
    remainingIslandCost: getRemainingIslandBuildCost({
      effectiveIslandNumber,
      stopBuildStateByIndex: current.stopBuildStateByIndex,
    }),
  });
  if (driftResult.driftLost <= 0) {
    return { record: current, driftLost: 0 };
  }
  const next: IslandRunGameStateRecord = {
    ...current,
    essence: driftResult.essence,
    lastEssenceDriftLost: driftResult.driftLost,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_essence_drift_tick',
  });
  return { record: next, driftLost: driftResult.driftLost };
}
