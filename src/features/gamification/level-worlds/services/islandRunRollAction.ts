/**
 * islandRunRollAction — PWA-authority roll execution service.
 *
 * This module is the **single authoritative bookkeeping path** for dice deduction
 * and roll execution. The renderer (IslandRunBoardPrototype) mirrors the dice pool
 * change into React state for UI display, but this service is the sole source of
 * truth that persists dice changes to the game state store.
 *
 * Canonical dice rules (see CANONICAL_GAMEPLAY_CONTRACT §2A, §2E, §3 Dice):
 *  - Each roll costs `DICE_PER_ROLL × N` dice, where `N` is the player-selected
 *    dice multiplier (default `N = 1`, tier ladder `×1/×2/×3/×5/×10/×20/×50/×100/×200`).
 *  - `DICE_PER_ROLL` is **1** (softened from 2 on 2026-04-19 playtest feedback so
 *    ×1 rolls burn the pool at half the rate and low-multiplier play stays
 *    accessible). Higher multipliers still scale linearly (×3 → 3, ×10 → 10, …).
 *  - Each die rolls 1–6 (standard dice), producing total movement of 2–12 tiles.
 *    The multiplier affects cost and reward amplification only, never distance.
 *  - Tiles never award dice. Dice come from reward bar, stops, boss, events, regen, shop.
 *
 * This module encapsulates the gameplay truth for a single Island Run roll:
 *  1. Validates preconditions (dice pool availability at the effective cost).
 *  2. Generates dice outcomes — **random numbers originate here in the PWA,
 *     never in the renderer**.
 *  3. Moves the token via canonical topology rules (resolveWrappedTokenIndex).
 *  4. Resolves landing type for board-tile movement.
 *  5. Publishes and persists the state through the canonical Island Run store.
 *
 * Authority contract:
 *  - Only the PWA may call this function.
 *  - Renderer components emit a `roll_requested` intent; the host then calls
 *    executeIslandRunRollAction.  The renderer never touches this module directly.
 *  - Roll result and all resulting state transitions remain solely in the PWA.
 *  - **There is exactly one dice deduction path** — this service. The board component
 *    syncs its local React state to match but does NOT write dice changes to the store.
 *  - **Concurrency.** This module delegates serialisation to the shared
 *    Island Run action mutex (`withIslandRunActionLock` from
 *    `islandRunActionMutex.ts`). Two rolls fired in parallel for the same
 *    session serialise through that mutex, so the second roll's read always
 *    observes the first roll's commit. The mutex is shared with every other
 *    gameplay action (tile reward, encounter, stop ticket, …) so a tile-
 *    reward write can't interleave with an in-flight roll either. This is
 *    defence-in-depth on top of the renderer's busy flag — without it, two
 *    writes from the same user on the same `runtimeVersion` could race and
 *    the Supabase row could drift from the client's truth.
 *  - **Synchronous publish.** The canonical store mirror and localStorage are
 *    updated before the remote write is awaited inside the mutex. This keeps
 *    later actions on the exact roll result even when a background write is
 *    already in flight.
 *
 * Intentionally NOT in scope for this service (handled elsewhere or future slices):
 *  - Tile reward application (essence, reward-bar progress, hazard deduction,
 *    encounter payouts). The traffic-light pass counter is the exception: it
 *    is traversal state, so it is committed atomically with the roll.
 *  - Encounter/event logic
 *  - Sound / haptic effects
 *  - Animation state
 *  - Claim / spend-essence / open-stop actions
 */

import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { IslandRunFirstSessionTutorialState } from './islandRunGameStateStore';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';
import { resolveWrappedTokenIndex } from './islandBoardTopology';
import { resolveIslandBoardProfile, type IslandBoardProfileId } from './islandBoardProfiles';
import { getIslandBoardThemeForIslandNumber } from './islandBoardThemes';
import { generateTileMap, getIslandRarity, type IslandTileType } from './islandBoardTileMap';
import { resolveIslandRunContractV2EssenceEarnForTile } from './islandRunContractV2EssenceBuild';
import {
  __resetIslandRunActionMutexesForTests,
  withIslandRunActionLock,
} from './islandRunActionMutex';
import {
  getIslandRunFirstCreaturePackLowDiceTriggerTarget,
  isIslandRunFragmentOnlyBoardPhase,
} from './islandRunFirstSessionTutorialUi';
import {
  ISLAND_RUN_ECONOMY_SINKS,
  recordIslandRunDiceOutflow,
  recordIslandRunMultiplierUsed,
} from './islandRunEconomyTelemetry';
import {
  resolveConcordRollProtection,
  type ConcordFragmentPickup,
} from './islandRunConcordRollProtection';
import {
  applyTrafficLightPass,
  TRAFFIC_LIGHT_TILE_INDEX,
  type TrafficLightPassResult,
} from './islandRunTrafficLightTile';
import { listIslandTechnologyFragmentPlacements } from './islandTechnologyFragmentPlacements';
import { grantFrostwellDrillSpinForLanding } from './islandRunSignatureMissions';

// ── roll constants (must match IslandRunBoardPrototype) ───────────────────────

const ROLL_MIN = 1;
const ROLL_MAX = 6;
/** Number of dice drawn from the pool per roll at ×1 (softened from 2 → 1 on
 *  2026-04-19 so low-multiplier rolls burn the pool at half the rate).
 *  The `BASE_DICE_PER_ROLL` constant in `islandRunContractV2RewardBar.ts` mirrors
 *  this value and is the source of truth for `resolveDiceCostForMultiplier`. */
const DICE_PER_ROLL = 1;

/** Returns a single die face in [ROLL_MIN, ROLL_MAX]. Random source stays in PWA. */
function rollDie(): number {
  return Math.floor(Math.random() * (ROLL_MAX - ROLL_MIN + 1)) + ROLL_MIN;
}

function resolveDiceFacesForTotal(total: number): { dieOne: number; dieTwo: number } {
  const safeTotal = Math.min(ROLL_MAX * 2, Math.max(ROLL_MIN * 2, Math.floor(total)));
  for (let dieOne = ROLL_MIN; dieOne <= ROLL_MAX; dieOne += 1) {
    const dieTwo = safeTotal - dieOne;
    if (dieTwo >= ROLL_MIN && dieTwo <= ROLL_MAX) {
      return { dieOne, dieTwo };
    }
  }
  return { dieOne: ROLL_MIN, dieTwo: ROLL_MIN };
}

function isPositiveEssenceTile(tileType: IslandTileType, islandNumber: number): boolean {
  return resolveIslandRunContractV2EssenceEarnForTile(tileType, {
    islandNumber,
    seed: islandNumber,
  }) > 0;
}

function resolveFirstSessionTutorialRollTotal(options: {
  currentIslandNumber: number;
  cycleIndex: number;
  firstSessionTutorialState: IslandRunFirstSessionTutorialState;
  tokenIndex: number;
  boardProfileId?: IslandBoardProfileId;
}): number | null {
  if (
    options.firstSessionTutorialState !== 'awaiting_first_roll'
    || options.currentIslandNumber !== 1
    || options.cycleIndex !== 0
  ) {
    return null;
  }

  const boardProfile = resolveIslandBoardProfile(options.boardProfileId ?? 'spark36_ring');
  const reachableFragment = listIslandTechnologyFragmentPlacements(1)
    .map((placement) => ({
      placement,
      distance: (placement.tileIndex - options.tokenIndex + boardProfile.tileCount) % boardProfile.tileCount,
    }))
    .filter(({ distance }) => distance >= ROLL_MIN * 2 && distance <= ROLL_MAX * 2)
    .sort((a, b) => a.distance - b.distance)[0];
  if (reachableFragment) return reachableFragment.distance;

  // A future topology may put every fragment outside the immediate 2–12
  // movement window. Fall back to the former positive-essence tutorial roll;
  // the Concord roll-protection schedule still guarantees a fragment by roll 3.
  const islandOneTheme = getIslandBoardThemeForIslandNumber(1);
  const tileMap = generateTileMap(1, getIslandRarity(1), islandOneTheme.tileThemeId, 0, { profileId: boardProfile.id });
  for (let total = ROLL_MIN * 2; total <= ROLL_MAX * 2; total += 1) {
    const targetIndex = resolveWrappedTokenIndex(options.tokenIndex, total, boardProfile.tileCount);
    const targetTile = tileMap[targetIndex];
    if (targetTile && isPositiveEssenceTile(targetTile.tileType, 1)) {
      return total;
    }
  }

  // Edge-case safety: if a future Island 1 tile-map profile has no reachable
  // positive essence tile in 2–12, preserve normal roll behavior instead of
  // blocking gameplay or forcing a hazard/neutral landing.
  return null;
}

// ── result types ──────────────────────────────────────────────────────────────

/** Discriminant for the roll action outcome. */
export type IslandRunRollActionStatus =
  | 'ok'
  | 'tutorial_order_required'
  | 'insufficient_dice';

export interface IslandRunRollActionResult {
  status: IslandRunRollActionStatus;
  /** Individual die face (set when status is 'ok'). */
  dieOne?: number;
  dieTwo?: number;
  /** Combined roll total (set when status is 'ok'). */
  total?: number;
  /** New token position after movement (set when status is 'ok'). */
  newTokenIndex?: number;
  /**
   * Ordered list of tile indices the token traverses for this roll, in visit
   * order. The last entry equals `newTokenIndex`. Used by the renderer to drive
   * the hop-by-hop animation without re-walking the board locally (single
   * source of truth — matches the service's authoritative movement).
   */
  hopSequence?: number[];
  /** Total dice actually deducted for this roll (= DICE_PER_ROLL × multiplier). */
  diceCost?: number;
  /**
   * Authoritative dice pool value **after** this roll's deduction has been
   * persisted. The renderer should sync its React state from this field (via a
   * functional updater) rather than re-deriving the subtraction from a
   * possibly-stale closure. Set when status is 'ok'.
   */
  newDicePool?: number;
  /**
   * Runtime-version counter stamped on the persisted state after this roll.
   * Useful for debugging / telemetry; the renderer does not need to track it
   * directly. Set when status is 'ok'.
   */
  newRuntimeVersion?: number;
  /** Landing kind in canonical movement loop (tile traversal). */
  landingKind?: 'tile';
  /**
   * Optional Island 1 Concord pickup selected by canonical roll pacing. The
   * renderer presents it through the existing collection animation/action;
   * dice movement is never changed to manufacture the outcome.
   */
  concordFragmentPickup?: ConcordFragmentPickup | null;
  /**
   * Canonical tutorial routing flag. False while Island 1 is intentionally in
   * its fragment-only introduction, so the renderer presents movement and a
   * possible fragment pickup but does not dispatch ordinary/special tile play.
   */
  ordinaryTileGameplayActive?: boolean;
  /**
   * Authoritative traffic-light transition for this traversal. Kept inside
   * the roll transaction so a later full-record write cannot lose the pass.
   */
  trafficLightPass?: TrafficLightPassResult | null;
  /** True when this landing granted one canonical Frostwell drill-wheel spin. */
  frostwellSpinGranted?: boolean;
}

// ── per-user async mutex (defence-in-depth against concurrent rolls) ──────────
//
// As of P1-9 (session 11), the roll mutex is shared with every other Island
// Run action via `islandRunActionMutex.ts`. This lets tile-reward / encounter /
// stop-ticket commits chain through the same queue so none of them can
// interleave with an in-flight roll commit and silently clobber each other's
// fields at the storage layer.

/** @internal Test hook — resets the shared action-mutex map. Kept as a
 *  pass-through so the existing `islandRunRollAction.test.ts` reset calls
 *  continue to work without churn. */
export function __resetIslandRunRollActionMutexesForTests(): void {
  __resetIslandRunActionMutexesForTests();
}

// ── action ────────────────────────────────────────────────────────────────────

/**
 * Executes a single roll on behalf of the player via the PWA gameplay authority.
 *
 * Concurrent calls for the same `session.user.id` are serialised through the
 * shared Island Run action mutex (`withIslandRunActionLock`). Callers may
 * additionally guard with a UI busy flag to avoid queueing up intents; the
 * mutex guarantees state correctness regardless.
 *
 * @param options.session - Active Supabase session (used for state key + write auth).
 * @param options.client  - Supabase client for remote persistence; null = local/demo mode.
 * @returns Typed result indicating success or the specific precondition failure.
 */
export function executeIslandRunRollAction(options: {
  session: Session;
  client: SupabaseClient | null;
  /** Board profile to use for tile-count and stop-tile resolution. Defaults to 'spark36_ring'. */
  boardProfileId?: IslandBoardProfileId;
  /**
   * Dice multiplier (default 1). The total dice cost per roll = DICE_PER_ROLL × multiplier.
   * Higher multipliers burn more dice but amplify tile rewards + reward bar progress.
   */
  diceMultiplier?: number;
}): Promise<IslandRunRollActionResult> {
  return withIslandRunActionLock(options.session.user.id, () => performRollAction(options));
}

async function performRollAction(options: {
  session: Session;
  client: SupabaseClient | null;
  boardProfileId?: IslandBoardProfileId;
  diceMultiplier?: number;
}): Promise<IslandRunRollActionResult> {
  const { session, client } = options;
  const multiplier = Math.max(1, Math.floor(options.diceMultiplier ?? 1));
  const diceCost = DICE_PER_ROLL * multiplier;

  // 1. Read the canonical in-memory snapshot. It is published before remote
  //    persistence, so overlapping background commits cannot make a later roll
  //    start from stale localStorage.
  const state = getIslandRunStateSnapshot(session);

  if (
    state.currentIslandNumber === 1
    && state.cycleIndex === 0
    && (
      state.firstSessionTutorialState === 'awaiting_first_orders'
      || state.firstSessionTutorialState === 'first_fragment_collected'
    )
  ) {
    return { status: 'tutorial_order_required' };
  }

  // 2. Guard: player needs at least diceCost dice in the pool.
  if (state.dicePool < diceCost) {
    return { status: 'insufficient_dice' };
  }

  // 4. Generate dice outcomes — randomness stays here in the PWA.
  //    The renderer only emits the intent; it never generates the values.
  const tutorialRollTotal = resolveFirstSessionTutorialRollTotal({
    currentIslandNumber: state.currentIslandNumber,
    cycleIndex: state.cycleIndex,
    firstSessionTutorialState: state.firstSessionTutorialState,
    tokenIndex: state.tokenIndex,
    boardProfileId: options.boardProfileId,
  });
  const { dieOne, dieTwo } = tutorialRollTotal === null
    ? { dieOne: rollDie(), dieTwo: rollDie() }
    : resolveDiceFacesForTotal(tutorialRollTotal);
  const total = dieOne + dieTwo;

  // 5. Move the token step-by-step using the canonical topology helper so that
  //    board wrap-around (lap completion) is handled correctly. Also record each
  //    intermediate index so the renderer can animate hop-by-hop without having
  //    to re-walk the board locally (which could drift from the service's truth).
  const boardProfile = resolveIslandBoardProfile(options.boardProfileId ?? 'spark36_ring');
  let newTokenIndex = state.tokenIndex;
  const hopSequence: number[] = [];
  for (let step = 0; step < total; step += 1) {
    newTokenIndex = resolveWrappedTokenIndex(newTokenIndex, 1, boardProfile.tileCount);
    hopSequence.push(newTokenIndex);
  }

  // 6. Canonical contract: movement is tile-based and stops are external progression
  //    structures. Rolling should not force stop progression from tile indices.
  const landingKind: 'tile' = 'tile';
  const concordProtection = resolveConcordRollProtection({
    islandNumber: state.currentIslandNumber,
    tileCount: boardProfile.tileCount,
    landingTileIndex: newTokenIndex,
    hopSequence,
    collectedSlots: state.techCollectionByIsland[String(state.currentIslandNumber)] ?? [],
    state: state.concordRollProtectionState,
  });

  // 7. Publish + persist the roll through the canonical store.
  //    Dice deduction uses the full multiplied cost (DICE_PER_ROLL × multiplier).
  //    `writeIslandRunGameStateRecord` updates localStorage synchronously at the
  //    top of its body, so the client remains authoritative even if the remote
  //    write later fails or is skipped (demo session / no client).
  const newDicePool = state.dicePool - diceCost;
  const nowMs = Date.now();
  recordIslandRunDiceOutflow({
    sink: ISLAND_RUN_ECONOMY_SINKS.rollSpendDice,
    amount: diceCost,
    sessionId: session.user.id,
    atMs: nowMs,
    metadata: { multiplier, beforeDicePool: state.dicePool, afterDicePool: newDicePool },
  });
  recordIslandRunMultiplierUsed({
    multiplier,
    sessionId: session.user.id,
    atMs: nowMs,
    metadata: { diceCost },
  });
  const shouldResetRegenAnchorAfterSpend = Boolean(
    state.diceRegenState
    && state.dicePool >= state.diceRegenState.maxDice
    && newDicePool < state.diceRegenState.maxDice,
  );
  const lowDiceTutorialTarget = tutorialRollTotal === null
    ? getIslandRunFirstCreaturePackLowDiceTriggerTarget({
        firstSessionTutorialState: state.firstSessionTutorialState,
        currentIslandNumber: state.currentIslandNumber,
        cycleIndex: state.cycleIndex,
        dicePool: newDicePool,
      })
    : null;
  const newRuntimeVersion = state.runtimeVersion + 1;
  const ordinaryTileGameplayActive = !(
    state.currentIslandNumber === 1
    && state.cycleIndex === 0
    && isIslandRunFragmentOnlyBoardPhase(state.firstSessionTutorialState)
  );
  const nextFirstSessionTutorialState = tutorialRollTotal === null
    ? lowDiceTutorialTarget ?? state.firstSessionTutorialState
    : state.firstSessionTutorialState;
  const trafficLightPass = ordinaryTileGameplayActive && hopSequence.includes(TRAFFIC_LIGHT_TILE_INDEX)
    ? applyTrafficLightPass({
        bonusTileChargeByIsland: state.bonusTileChargeByIsland,
        islandNumber: state.currentIslandNumber,
      })
    : null;
  const frostwellLanding = ordinaryTileGameplayActive
    ? grantFrostwellDrillSpinForLanding({
        ledger: state.signatureMissionProgressByIsland,
        islandNumber: state.currentIslandNumber,
        cycleIndex: state.cycleIndex,
        tileIndex: newTokenIndex,
        nowMs,
      })
    : { ledger: state.signatureMissionProgressByIsland, granted: false };
  const nextState = {
    ...state,
    runtimeVersion: newRuntimeVersion,
    tokenIndex: newTokenIndex,
    dicePool: newDicePool,
    diceRegenState: state.diceRegenState
      ? {
          ...state.diceRegenState,
          lastRegenAtMs: shouldResetRegenAnchorAfterSpend ? nowMs : state.diceRegenState.lastRegenAtMs,
        }
      : null,
    firstSessionTutorialState: nextFirstSessionTutorialState,
    concordRollProtectionState: concordProtection.state,
    bonusTileChargeByIsland: trafficLightPass?.bonusTileChargeByIsland ?? state.bonusTileChargeByIsland,
    signatureMissionProgressByIsland: frostwellLanding.ledger,
  };

  // Publish immediately, then await persistence inside the action mutex.
  try {
    const persistResult = await commitIslandRunState({
      session,
      client,
      record: nextState,
      triggerSource: 'roll_action',
    });
    if (!persistResult.ok) {
      throw new Error(persistResult.errorMessage);
    }
  } catch (err) {
    // The canonical mirror and local storage already reflect the new state.
    // Let the pending-write queue / next hydration reconcile the remote row.
    // eslint-disable-next-line no-console
    console.warn('[IslandRun] Roll persist failed (local storage authoritative, remote will reconcile on next hydration):', err);
  }

  return {
    status: 'ok',
    dieOne,
    dieTwo,
    total,
    newTokenIndex,
    hopSequence,
    diceCost,
    newDicePool,
    newRuntimeVersion,
    landingKind,
    concordFragmentPickup: concordProtection.pickup,
    ordinaryTileGameplayActive,
    trafficLightPass,
    frostwellSpinGranted: frostwellLanding.granted,
  };
}
