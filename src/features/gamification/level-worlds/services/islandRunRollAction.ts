/**
 * islandRunRollAction — PWA-authority roll execution service.
 *
 * This module is the **single authoritative bookkeeping path** for dice deduction
 * and roll execution. The renderer (IslandRunBoardPrototype) mirrors the dice pool
 * change into React state for UI display, but this service is the sole source of
 * truth that persists dice changes to the game state store.
 *
 * Canonical dice rules:
 *  - Each roll costs exactly 2 dice (flat, never varies).
 *  - Each die rolls 1–6 (standard dice), producing total movement of 2–12 tiles.
 *  - Tiles never award dice. Dice come from reward bar, stops, boss, events, regen, shop.
 *
 * This module encapsulates the gameplay truth for a single Island Run roll:
 *  1. Validates preconditions (dice pool availability).
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
 *
 * Intentionally NOT in scope for this service (handled elsewhere or future slices):
 *  - Tile reward application (essence, shards, dice kickers, bonus-tile charge)
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

// ── roll constants (must match IslandRunBoardPrototype) ───────────────────────

const ROLL_MIN = 1;
const ROLL_MAX = 6;
/** Number of dice drawn from the pool per roll. */
const DICE_PER_ROLL = 2;

/** Returns a single die face in [ROLL_MIN, ROLL_MAX]. Random source stays in PWA. */
function rollDie(): number {
  return Math.floor(Math.random() * (ROLL_MAX - ROLL_MIN + 1)) + ROLL_MIN;
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
  /** Landing kind in canonical movement loop (tile traversal). */
  landingKind?: 'tile';
}

// ── action ────────────────────────────────────────────────────────────────────

/**
 * Executes a single roll on behalf of the player via the PWA gameplay authority.
 *
 * Callers must guard against concurrent calls (e.g. with a busy/loading flag)
 * because this function does not hold its own mutex.
 *
 * @param options.session - Active Supabase session (used for state key + write auth).
 * @param options.client  - Supabase client for remote persistence; null = local/demo mode.
 * @returns Typed result indicating success or the specific precondition failure.
 */
export async function executeIslandRunRollAction(options: {
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
  const dieOne = rollDie();
  const dieTwo = rollDie();
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
  //    Persistence is fire-and-forget so the dice animation + token movement can
  //    start immediately without waiting for the Supabase RPC round-trip.
  //    Local state (localStorage) is updated synchronously inside the write call,
  //    so the PWA remains authoritative even if the remote write is slow or fails.
  const nextState = {
    ...state,
    runtimeVersion: state.runtimeVersion + 1,
    tokenIndex: newTokenIndex,
    dicePool: state.dicePool - diceCost,
  };

  // Fire-and-forget: don't block the UI on the remote persist.
  writeIslandRunGameStateRecord({ session, client, record: nextState }).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn('[IslandRun] Background dice roll persist failed:', err);
  });

  return {
    status: 'ok',
    dieOne,
    dieTwo,
    total,
    newTokenIndex,
    hopSequence,
    diceCost,
    landingKind,
  };
}
