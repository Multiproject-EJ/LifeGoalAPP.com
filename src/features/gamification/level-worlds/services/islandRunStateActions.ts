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
 * Stage C3 adds (stop progress + island travel):
 * - {@link travelToNextIsland} — single atomic commit that replaces the four
 *   separate `persistIslandRunRuntimeStatePatch` calls that `performIslandTravel`
 *   used to make (old-island clears, egg save/restore, contract-v2 stop/build
 *   reset, island-number + timer update). This is the "atomic-travel refactor"
 *   risk called out in the Stage C spec.
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
import type {
  IslandRunGameStateRecord,
  PerIslandEggEntry,
} from './islandRunGameStateStore';
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
  initStopBuildStatesForIsland,
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

// ── C3: Island travel ────────────────────────────────────────────────────────

/** Maximum island number before the cycle wraps back to 1. Mirrors the
 *  constant inlined in `performIslandTravel` in the renderer. Update here if
 *  the game ever ships more islands. */
export const ISLAND_RUN_MAX_ISLAND = 120;

/** Effective island number = resolvedIsland + cycleIndex * 120. Mirrors the
 *  renderer helper; kept private to the action so callers don't have to
 *  thread it through. */
function effectiveIslandNumber(resolvedIsland: number, cycleIndex: number): number {
  return resolvedIsland + cycleIndex * ISLAND_RUN_MAX_ISLAND;
}

export interface TravelToNextIslandOptions {
  session: Session;
  client: SupabaseClient | null;
  /** The raw requested island number. May exceed {@link ISLAND_RUN_MAX_ISLAND};
   *  the action wraps it to `[1, 120]` and bumps `cycleIndex` on wrap. */
  nextIsland: number;
  /** When true (the normal case) the per-island timer starts immediately; when
   *  false the timer is left pending (`islandStartedAtMs/Expires = 0`) so the
   *  UI can start it on an explicit "Begin" tap. Matches the legacy
   *  `performIslandTravel({ startTimer })` option. */
  startTimer: boolean;
  /** Current wall-clock ms. Injected rather than read inside the action so
   *  tests can drive deterministic timing. */
  nowMs: number;
  /** Per-island timer duration in ms. Kept as a caller-supplied function so
   *  the renderer can own the duration curve without importing it into the
   *  service layer. */
  getIslandDurationMs: (islandNumber: number) => number;
  /** Contract-V2 feature flag. When enabled, the action resets `stopStatesByIndex`,
   *  `stopBuildStateByIndex`, `activeStopIndex`, and `activeStopType` for the
   *  new island. When false these fields are left untouched. */
  islandRunContractV2Enabled: boolean;
  triggerSource?: string;
}

export interface TravelToNextIslandResult {
  /** The committed record. */
  record: IslandRunGameStateRecord;
  /** Island number the player arrived on after cycle-wrap resolution (1…120). */
  resolvedIsland: number;
  /** Cycle index after possible 120→1 wrap. */
  nextCycleIndex: number;
  /** The egg to show as "active" on the new island, or `null` when the slot
   *  should be empty. `null` is returned in three cases: (a) no egg was ever
   *  placed on the new island, (b) the previously-placed egg on the new
   *  island has since been collected / sold / converted to a ready animal
   *  (i.e. `perIslandEggs[newKey].status ∉ {'incubating','ready'}`), or (c)
   *  no `perIslandEggs[newKey]` entry exists at all. The renderer feeds
   *  this into its `setActiveEgg` React state. */
  restoredActiveEgg:
    | { tier: 'common' | 'rare' | 'mythic'; setAtMs: number; hatchAtMs: number; isDormant: boolean }
    | null;
}

/**
 * Atomic island travel — THE named "atomic-travel refactor" risk from the Stage C spec.
 *
 * The legacy `performIslandTravel` in `IslandRunBoardPrototype.tsx` issued
 * four separate `persistIslandRunRuntimeStatePatch` calls in sequence:
 *   1. clear old-island maps (`completedStopsByIsland`, `stopTicketsPaidByIsland`,
 *      `bonusTileChargeByIsland`)
 *   2. save the old island's egg + restore the new island's egg (`perIslandEggs`,
 *      `activeEgg*`)
 *   3. [contract-v2] reset stop + build states (`stopStatesByIndex`,
 *      `stopBuildStateByIndex`, `activeStopIndex`, `activeStopType`)
 *   4. bump island bookkeeping (`currentIslandNumber`, `cycleIndex`,
 *      `bossTrialResolvedIslandNumber`, timer)
 *
 * Each patch went through `persistIslandRunRuntimeStatePatch`, which shallow-
 * merges against a fresh read of the record. If any of the four failed, or if
 * another writer (e.g. the roll service, reward bar) landed between two of
 * them, the travel ended up in a half-applied state: an old-island's
 * completedStops cleared but the new island's timer not started, or a new
 * cycle's egg ledger partially restored.
 *
 * This action collects every field that travel needs to mutate, applies them
 * to a single snapshot, and commits ONCE through {@link commitIslandRunState}.
 * The result: travel is either fully visible or not visible at all to
 * subscribers. `runtimeVersion` bumps exactly once.
 *
 * The action does NOT manage UI-only React state (e.g. `setRollValue(null)`,
 * timer ticker, feedback toasts) — the renderer still owns those and should
 * call them immediately after `travelToNextIsland`.
 */
export async function travelToNextIsland(options: TravelToNextIslandOptions): Promise<TravelToNextIslandResult> {
  const {
    session,
    client,
    nextIsland,
    startTimer,
    nowMs,
    getIslandDurationMs,
    islandRunContractV2Enabled,
    triggerSource,
  } = options;

  const current = getIslandRunStateSnapshot(session);

  // Cycle-wrap resolution (120 → 1 bumps cycleIndex).
  const wraps = nextIsland > ISLAND_RUN_MAX_ISLAND;
  const resolvedIsland = wraps
    ? ((nextIsland - 1) % ISLAND_RUN_MAX_ISLAND) + 1
    : Math.max(1, nextIsland);
  const nextCycleIndex = wraps ? current.cycleIndex + 1 : current.cycleIndex;

  const oldIslandKey = String(current.currentIslandNumber);
  const newIslandKey = String(resolvedIsland);

  // ── Egg save/restore ────────────────────────────────────────────────────
  // Save the old island's active egg (if any) into perIslandEggs, then check
  // whether the new island has a previously-placed egg to restore.
  const currentPerIslandEggs = current.perIslandEggs ?? {};
  const updatedPerIslandEggs: Record<string, PerIslandEggEntry> = { ...currentPerIslandEggs };

  const hasActiveEgg = current.activeEggTier !== null
    && current.activeEggSetAtMs !== null
    && current.activeEggHatchDurationMs !== null;

  if (hasActiveEgg) {
    const setAtMs = current.activeEggSetAtMs as number;
    const hatchAtMs = setAtMs + (current.activeEggHatchDurationMs as number);
    const isReady = nowMs >= hatchAtMs;
    updatedPerIslandEggs[oldIslandKey] = {
      tier: current.activeEggTier as 'common' | 'rare' | 'mythic',
      setAtMs,
      hatchAtMs,
      status: isReady ? 'ready' : 'incubating',
      location: isReady ? 'dormant' : 'island',
    };
  }

  // Restore the new island's egg only when it's still incubating or ready.
  // Collected/sold eggs stay in the ledger but must not repopulate the slot.
  const newIslandEntry = updatedPerIslandEggs[newIslandKey];
  let restoredActiveEgg: TravelToNextIslandResult['restoredActiveEgg'] = null;
  let nextActiveEggTier: IslandRunGameStateRecord['activeEggTier'] = null;
  let nextActiveEggSetAtMs: IslandRunGameStateRecord['activeEggSetAtMs'] = null;
  let nextActiveEggHatchDurationMs: IslandRunGameStateRecord['activeEggHatchDurationMs'] = null;
  let nextActiveEggIsDormant = false;

  if (
    newIslandEntry
    && (newIslandEntry.status === 'incubating' || newIslandEntry.status === 'ready')
  ) {
    const isNowReady = nowMs >= newIslandEntry.hatchAtMs;
    const isDormant = isNowReady || newIslandEntry.location === 'dormant';
    restoredActiveEgg = {
      tier: newIslandEntry.tier,
      setAtMs: newIslandEntry.setAtMs,
      hatchAtMs: newIslandEntry.hatchAtMs,
      isDormant,
    };
    nextActiveEggTier = newIslandEntry.tier;
    nextActiveEggSetAtMs = newIslandEntry.setAtMs;
    nextActiveEggHatchDurationMs = newIslandEntry.hatchAtMs - newIslandEntry.setAtMs;
    nextActiveEggIsDormant = isDormant;
  }

  // ── Contract-V2 stop/build reset ───────────────────────────────────────
  // Fresh stop objective + build states for the new island. When the flag is
  // off these fields are left untouched.
  let nextStopStatesByIndex = current.stopStatesByIndex;
  let nextStopBuildStateByIndex = current.stopBuildStateByIndex;
  let nextActiveStopIndex = current.activeStopIndex;
  let nextActiveStopType = current.activeStopType;

  if (islandRunContractV2Enabled) {
    nextStopStatesByIndex = Array.from({ length: 5 }, () => ({
      objectiveComplete: false,
      buildComplete: false,
    }));
    nextStopBuildStateByIndex = initStopBuildStatesForIsland(
      effectiveIslandNumber(resolvedIsland, nextCycleIndex),
    );
    nextActiveStopIndex = 0;
    nextActiveStopType = 'hatchery';
  }

  // ── Timer ─────────────────────────────────────────────────────────────
  const durationMs = getIslandDurationMs(resolvedIsland);
  const islandStartedAtMs = startTimer ? nowMs : 0;
  const islandExpiresAtMs = startTimer ? nowMs + durationMs : 0;

  // ── Single atomic commit ──────────────────────────────────────────────
  // Shallow-overlay the three per-island Record maps so the old island's
  // entries are explicitly cleared but other islands' entries are preserved.
  // This mirrors the patch-merge semantics of `persistIslandRunRuntimeStatePatch`
  // while consolidating into one commit.
  const next: IslandRunGameStateRecord = {
    ...current,
    completedStopsByIsland: {
      ...current.completedStopsByIsland,
      [oldIslandKey]: [],
    },
    stopTicketsPaidByIsland: {
      ...(current.stopTicketsPaidByIsland ?? {}),
      [oldIslandKey]: [],
    },
    bonusTileChargeByIsland: {
      ...(current.bonusTileChargeByIsland ?? {}),
      [oldIslandKey]: {},
    },
    perIslandEggs: updatedPerIslandEggs,
    activeEggTier: nextActiveEggTier,
    activeEggSetAtMs: nextActiveEggSetAtMs,
    activeEggHatchDurationMs: nextActiveEggHatchDurationMs,
    activeEggIsDormant: nextActiveEggIsDormant,
    stopStatesByIndex: nextStopStatesByIndex,
    stopBuildStateByIndex: nextStopBuildStateByIndex,
    activeStopIndex: nextActiveStopIndex,
    activeStopType: nextActiveStopType,
    currentIslandNumber: resolvedIsland,
    cycleIndex: nextCycleIndex,
    bossTrialResolvedIslandNumber: null,
    islandStartedAtMs,
    islandExpiresAtMs,
    runtimeVersion: current.runtimeVersion + 1,
  };

  await commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'travel_to_next_island',
  });

  return {
    record: next,
    resolvedIsland,
    nextCycleIndex,
    restoredActiveEgg,
  };
}
