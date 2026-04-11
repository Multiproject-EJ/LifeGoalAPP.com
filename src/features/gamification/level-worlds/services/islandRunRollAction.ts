/**
 * islandRunRollAction — PWA-authority roll execution service.
 *
 * This module encapsulates the gameplay truth for a single Island Run roll:
 *  1. Validates preconditions (step-1 completion, dice pool availability).
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
 *
 * Intentionally NOT in scope for this service (handled elsewhere or future slices):
 *  - Tile reward application (coins, essence, shards, etc.)
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
import { isIslandRunContractV2StopCompleteAtIndex } from './islandRunContractV2StopResolver';

// ── roll constants (must match IslandRunBoardPrototype) ───────────────────────

const ROLL_MIN = 1;
const ROLL_MAX = 3;
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
  | 'insufficient_dice'
  | 'step1_required';

export interface IslandRunRollActionResult {
  status: IslandRunRollActionStatus;
  /** Individual die face (set when status is 'ok'). */
  dieOne?: number;
  dieTwo?: number;
  /** Combined roll total (set when status is 'ok'). */
  total?: number;
  /** New token position after movement (set when status is 'ok'). */
  newTokenIndex?: number;
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
  /** Board profile to use for tile-count and stop-tile resolution. Defaults to 'spark60_preview'. */
  boardProfileId?: IslandBoardProfileId;
}): Promise<IslandRunRollActionResult> {
  const { session, client } = options;

  // 1. Read current state from the canonical PWA localStorage store.
  const state = readIslandRunGameStateRecord(session);

  // 2. Guard: step 1 (first stop, hatchery at index 0) must be completed before
  //    the player may roll.  Mirrors the M11C enforcement in IslandRunBoardPrototype.
  const step1Complete = isIslandRunContractV2StopCompleteAtIndex({
    stopStatesByIndex: state.stopStatesByIndex,
    index: 0,
  });
  if (!step1Complete) {
    return { status: 'step1_required' };
  }

  // 3. Guard: player needs at least DICE_PER_ROLL dice in the pool.
  if (state.dicePool < DICE_PER_ROLL) {
    return { status: 'insufficient_dice' };
  }

  // 4. Generate dice outcomes — randomness stays here in the PWA.
  //    The renderer only emits the intent; it never generates the values.
  const dieOne = rollDie();
  const dieTwo = rollDie();
  const total = dieOne + dieTwo;

  // 5. Move the token step-by-step using the canonical topology helper so that
  //    board wrap-around (lap completion) is handled correctly.
  const boardProfile = resolveIslandBoardProfile(options.boardProfileId ?? 'spark60_preview');
  let newTokenIndex = state.tokenIndex;
  for (let step = 0; step < total; step += 1) {
    newTokenIndex = resolveWrappedTokenIndex(newTokenIndex, 1, boardProfile.tileCount);
  }

  // 6. Canonical contract: movement is tile-based and stops are external progression
  //    structures. Rolling should not force stop progression from tile indices.
  const landingKind: 'tile' = 'tile';

  // 7. Persist the roll state patch via the same write path used by
  //    IslandRunBoardPrototype (writeIslandRunGameStateRecord).
  //    Only the minimal roll-relevant fields are updated; all other gameplay
  //    fields (rewards, encounters, essence, etc.) are left unchanged — they
  //    remain the responsibility of future wiring slices.
  const nextState = {
    ...state,
    runtimeVersion: state.runtimeVersion + 1,
    tokenIndex: newTokenIndex,
    dicePool: state.dicePool - DICE_PER_ROLL,
  };

  await writeIslandRunGameStateRecord({ session, client, record: nextState });

  return {
    status: 'ok',
    dieOne,
    dieTwo,
    total,
    newTokenIndex,
    landingKind,
  };
}
