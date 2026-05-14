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
 *  5. Persists the state patch via the existing PWA write path
 *     (writeIslandRunGameStateRecord — the same authority used by IslandRunBoardPrototype).
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
 *  - **Synchronous persist.** The remote write is awaited inside the mutex before
 *    the service returns. `writeIslandRunGameStateRecord` already updates
 *    localStorage synchronously at the top of its body, so the client remains
 *    authoritative even if the remote write later fails; awaiting only serialises
 *    the remote queue so two rolls can't land at Supabase in the wrong order.
 *
 * Intentionally NOT in scope for this service (handled elsewhere or future slices):
 *  - Tile reward application (essence, reward-bar progress, hazard deduction,
 *    bonus-tile charge, encounter payouts)
 *  - Encounter/event logic
 *  - Sound / haptic effects
 *  - Animation state
 *  - Claim / spend-essence / open-stop actions
 */

import type { Session, SupabaseClient } from '@supabase/supabase-js';
import {
  readIslandRunGameStateRecord,
  writeIslandRunGameStateRecord,
} from './islandRunGameStateStore';
import { resolveWrappedTokenIndex } from './islandBoardTopology';
import { resolveIslandBoardProfile, type IslandBoardProfileId } from './islandBoardProfiles';
import { getIslandBoardThemeForIslandNumber } from './islandBoardThemes';
import { generateTileMap, getIslandRarity, type IslandTileType } from './islandBoardTileMap';
import { resolveIslandRunContractV2EssenceEarnForTile } from './islandRunContractV2EssenceBuild';
import {
  __resetIslandRunActionMutexesForTests,
  withIslandRunActionLock,
} from './islandRunActionMutex';

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
  const dieOne = Math.min(ROLL_MAX, Math.max(ROLL_MIN, safeTotal - ROLL_MAX));
  const dieTwo = Math.min(ROLL_MAX, Math.max(ROLL_MIN, safeTotal - dieOne));
  return { dieOne, dieTwo };
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
  firstSessionTutorialState: string;
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

  const boardProfile = resolveIslandBoardProfile(options.boardProfileId ?? 'spark40_ring');
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
  /** Board profile to use for tile-count and stop-tile resolution. Defaults to 'spark40_ring'. */
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

  // 1. Read current state from the canonical PWA localStorage store.
  const state = readIslandRunGameStateRecord(session);

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
  const boardProfile = resolveIslandBoardProfile(options.boardProfileId ?? 'spark40_ring');
  let newTokenIndex = state.tokenIndex;
  const hopSequence: number[] = [];
  for (let step = 0; step < total; step += 1) {
    newTokenIndex = resolveWrappedTokenIndex(newTokenIndex, 1, boardProfile.tileCount);
    hopSequence.push(newTokenIndex);
  }

  // 6. Canonical contract: movement is tile-based and stops are external progression
  //    structures. Rolling should not force stop progression from tile indices.
  const landingKind: 'tile' = 'tile';

  // 7. Persist the roll state patch via the same write path used by
  //    IslandRunBoardPrototype (writeIslandRunGameStateRecord).
  //    Dice deduction uses the full multiplied cost (DICE_PER_ROLL × multiplier).
  //    `writeIslandRunGameStateRecord` updates localStorage synchronously at the
  //    top of its body, so the client remains authoritative even if the remote
  //    write later fails or is skipped (demo session / no client).
  const newDicePool = state.dicePool - diceCost;
  const newRuntimeVersion = state.runtimeVersion + 1;
  const nextState = {
    ...state,
    runtimeVersion: newRuntimeVersion,
    tokenIndex: newTokenIndex,
    dicePool: newDicePool,
    firstSessionTutorialState: tutorialRollTotal === null
      ? state.firstSessionTutorialState
      : 'first_roll_consumed',
  };

  // Await the write inside the mutex. Local-storage persistence is synchronous;
  // awaiting only serialises the remote queue so two rolls can never land at
  // Supabase in the wrong order (the earlier call's mutex tail resolves only
  // after its remote round-trip completes).
  try {
    await writeIslandRunGameStateRecord({ session, client, record: nextState });
  } catch (err) {
    // Local storage already reflects the new state (see note above). Log and
    // let the next hydration reconcile the remote row.
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
  };
}
