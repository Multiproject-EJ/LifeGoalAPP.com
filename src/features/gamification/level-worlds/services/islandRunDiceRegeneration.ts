/**
 * islandRunDiceRegeneration — Level-based dice regeneration system.
 *
 * Dice regeneration is a minimum-roll system inspired by Monopoly GO:
 * - The player's PWA user level determines regeneration capacity.
 * - Regeneration fills up to a level-dependent minimum threshold.
 * - If the player already has dice above the minimum, no regeneration occurs.
 * - Regeneration is passive and computed on-demand (not tick-based).
 * - The regeneration period is always 2 hours for a full fill from 0 to the minimum.
 * - Higher levels increase the minimum threshold (more dice regenerated).
 *
 * The system uses a continuous logarithmic formula instead of a capped tier table,
 * so it works for any player level (1 to infinity). The formula is:
 *   minDice = 30 + floor(20 × ln(level))
 * This gives:
 *   Level 1:   30 dice
 *   Level 5:   62 dice
 *   Level 10:  76 dice
 *   Level 20:  90 dice
 *   Level 50:  108 dice
 *   Level 100: 122 dice
 *   Level 500: 154 dice
 *   Level 1000: 168 dice
 *
 * No hard cap — the curve flattens naturally via logarithm.
 */

// ── Continuous formula ──────────────────────────────────────────────────

/** Base minimum dice for level 1 players. */
const DICE_REGEN_BASE = 30;

/** Logarithmic scaling coefficient for dice regen. */
const DICE_REGEN_LOG_COEFFICIENT = 20;

/** Full regeneration window in milliseconds (2 hours). */
export const DICE_REGEN_FULL_WINDOW_MS = 2 * 60 * 60 * 1000;

// ── Tier resolution (continuous — no cap) ─────────────────────────────

/**
 * Resolves the minimum-dice threshold for the given player level.
 * Uses a continuous logarithmic formula: 30 + floor(20 × ln(level)).
 * Works for any level from 1 to infinity with no hard cap.
 */
export function resolveDiceRegenMinDice(playerLevel: number): number {
  const safeLevel = Number.isFinite(playerLevel) ? Math.max(1, Math.floor(playerLevel)) : 1;
  if (safeLevel <= 1) return DICE_REGEN_BASE;
  return DICE_REGEN_BASE + Math.floor(DICE_REGEN_LOG_COEFFICIENT * Math.log(safeLevel));
}

/**
 * Computes the regeneration rate in dice per hour for the given player level.
 * Rate = minDice / 2 (since the full window is 2 hours).
 */
export function resolveDiceRegenRatePerHour(playerLevel: number): number {
  return resolveDiceRegenMinDice(playerLevel) / 2;
}

// ── Regeneration state ──────────────────────────────────────────────────

export interface DiceRegenState {
  /** Minimum dice threshold — regen fills up to this. */
  maxDice: number;
  /** Dice regenerated per hour. */
  regenRatePerHour: number;
  /** Timestamp of the last regeneration computation. */
  lastRegenAtMs: number;
}

/**
 * Builds an initial DiceRegenState for the given player level.
 */
export function buildInitialDiceRegenState(playerLevel: number, nowMs: number): DiceRegenState {
  return {
    maxDice: resolveDiceRegenMinDice(playerLevel),
    regenRatePerHour: resolveDiceRegenRatePerHour(playerLevel),
    lastRegenAtMs: Math.floor(nowMs),
  };
}

/**
 * Applies passive dice regeneration.
 *
 * This is a **minimum-roll** system:
 * - If `currentDicePool >= minDice`, no dice are added and timestamp is updated.
 * - If `currentDicePool < minDice`, dice are added based on elapsed time,
 *   but never exceeding the minDice threshold.
 *
 * Returns the updated dice pool and the updated regen state.
 */
export function applyDiceRegeneration(params: {
  currentDicePool: number;
  regenState: DiceRegenState | null;
  playerLevel: number;
  nowMs: number;
}): {
  dicePool: number;
  regenState: DiceRegenState;
  diceAdded: number;
} {
  const { currentDicePool, playerLevel, nowMs } = params;
  const safePool = Math.max(0, Math.floor(currentDicePool));
  const safeNow = Math.floor(nowMs);

  // Resolve for current level (may differ from stored state if level changed).
  const minDice = resolveDiceRegenMinDice(playerLevel);
  const ratePerHour = resolveDiceRegenRatePerHour(playerLevel);

  // If no regen state exists yet, initialize it now.
  if (!params.regenState) {
    return {
      dicePool: safePool,
      regenState: buildInitialDiceRegenState(playerLevel, safeNow),
      diceAdded: 0,
    };
  }

  const { lastRegenAtMs } = params.regenState;
  const elapsedMs = Math.max(0, safeNow - lastRegenAtMs);

  // Minimum-roll gate: if player already has enough dice, no regen occurs.
  if (safePool >= minDice) {
    return {
      dicePool: safePool,
      regenState: {
        maxDice: minDice,
        regenRatePerHour: ratePerHour,
        lastRegenAtMs: safeNow,
      },
      diceAdded: 0,
    };
  }

  // Compute how many dice should have regenerated in the elapsed time.
  const elapsedHours = elapsedMs / (60 * 60 * 1000);
  const rawRegen = Math.floor(ratePerHour * elapsedHours);

  // Cap regen at the deficit (never exceed minDice).
  const deficit = Math.max(0, minDice - safePool);
  const diceAdded = Math.min(rawRegen, deficit);

  // Only advance lastRegenAtMs by the time that produced the whole dice we
  // actually granted. The sub-die fractional remainder of elapsedMs carries
  // forward to the next call, so short sessions don't silently lose regen.
  // msPerDie = (60×60×1000) / ratePerHour.
  const msPerDie = ratePerHour > 0 ? (60 * 60 * 1000) / ratePerHour : Number.POSITIVE_INFINITY;
  const consumedMs = Number.isFinite(msPerDie) ? Math.floor(diceAdded * msPerDie) : elapsedMs;
  const nextLastRegenAtMs = lastRegenAtMs + consumedMs;

  return {
    dicePool: safePool + diceAdded,
    regenState: {
      maxDice: minDice,
      regenRatePerHour: ratePerHour,
      lastRegenAtMs: nextLastRegenAtMs,
    },
    diceAdded,
  };
}

// ── ETA helpers (pure, for UI countdowns) ────────────────────────────────
//
// The runtime dice-regen timer in IslandRunBoardPrototype.tsx uses its own
// tick() closure for live updates, but out-of-dice modals and similar
// empty-state UI benefit from a pure, testable computation for:
//   - ms until the pool reaches a target threshold (e.g. one roll)
//   - ms until the pool is fully refilled to maxDice
// Both functions respect the same rules as `applyDiceRegeneration`:
//   - Regen only happens while `dicePool < maxDice`.
//   - Rate is `regenRatePerHour` dice per hour.
//   - `lastRegenAtMs` is the anchor; callers pass `nowMs` explicitly so the
//     functions remain deterministic and testable.

/**
 * Milliseconds until the dice pool reaches the given target threshold.
 *
 * Returns:
 *   - `0` if `dicePool >= target` already.
 *   - `Number.POSITIVE_INFINITY` if `target > maxDice` (regen caps at maxDice
 *     so the threshold is unreachable via passive regen alone).
 *   - A finite ms value otherwise, computed from the fractional elapsed time
 *     since `lastRegenAtMs` so the countdown matches what `applyDiceRegeneration`
 *     would actually grant.
 *
 * When `regenState` is `null`/undefined the pool can't regen, so the answer is
 * `POSITIVE_INFINITY` unless the pool already meets the target.
 */
export function resolveNextRollEtaMs(params: {
  dicePool: number;
  target: number;
  regenState: DiceRegenState | null | undefined;
  nowMs: number;
}): number {
  const { dicePool, target, regenState, nowMs } = params;
  const safePool = Math.max(0, Math.floor(dicePool));
  const safeTarget = Math.max(0, Math.floor(target));
  const safeNow = Math.floor(nowMs);

  if (safePool >= safeTarget) return 0;
  if (!regenState) return Number.POSITIVE_INFINITY;

  const { maxDice, regenRatePerHour, lastRegenAtMs } = regenState;
  // Passive regen never exceeds maxDice; any target above the cap is
  // unreachable from regen alone.
  if (safeTarget > maxDice) return Number.POSITIVE_INFINITY;
  if (regenRatePerHour <= 0) return Number.POSITIVE_INFINITY;

  const msPerDie = (60 * 60 * 1000) / regenRatePerHour;
  const needed = safeTarget - safePool;
  // Total time for `needed` dice from the anchor (lastRegenAtMs).
  const totalMsFromAnchor = needed * msPerDie;
  const elapsedMs = Math.max(0, safeNow - lastRegenAtMs);
  const remainingMs = Math.max(0, Math.ceil(totalMsFromAnchor - elapsedMs));
  return remainingMs;
}

/**
 * Milliseconds until the dice pool is fully refilled to `maxDice`.
 * Thin wrapper around `resolveNextRollEtaMs` with `target = maxDice`.
 */
export function resolveFullRefillEtaMs(params: {
  dicePool: number;
  regenState: DiceRegenState | null | undefined;
  nowMs: number;
}): number {
  const { dicePool, regenState, nowMs } = params;
  if (!regenState) {
    // No regen state means no regen — already full if pool covers maxDice
    // (impossible without a maxDice anchor) or unreachable otherwise.
    return Number.POSITIVE_INFINITY;
  }
  return resolveNextRollEtaMs({
    dicePool,
    target: regenState.maxDice,
    regenState,
    nowMs,
  });
}
