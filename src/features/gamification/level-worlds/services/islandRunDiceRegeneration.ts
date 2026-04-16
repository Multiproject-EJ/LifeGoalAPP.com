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
 * The system is intentionally slow to preserve scarcity and monetization tension
 * as prescribed by the canonical gameplay contract.
 */

// ── Regeneration tier table ─────────────────────────────────────────────────
// Each tier defines the minimum dice the player regenerates up to within
// a 2-hour window. Regeneration rate is derived: minDice / 120 minutes.
//
// Level 1:  minDice = 30  → ~15 rolls (at 2 dice/roll) per 2h  → 1 roll every ~8 min
// Level 5:  minDice = 40  → ~20 rolls per 2h  → 1 roll every ~6 min
// Level 10: minDice = 50  → ~25 rolls per 2h  → 1 roll every ~4.8 min
// Level 15: minDice = 60  → ~30 rolls per 2h  → 1 roll every ~4 min
// Level 20: minDice = 70  → ~35 rolls per 2h  → 1 roll every ~3.4 min
// Level 30: minDice = 90  → ~45 rolls per 2h  → 1 roll every ~2.7 min
// Level 50: minDice =120  → ~60 rolls per 2h  → 1 roll every ~2 min
// Level 75: minDice =140  → ~70 rolls per 2h  → 1 roll every ~1.7 min
// Level 100:minDice =160  → ~80 rolls per 2h  → 1 roll every ~1.5 min

export interface DiceRegenTier {
  /** Minimum PWA user level for this tier. */
  minLevel: number;
  /** Minimum dice threshold — regen fills up to this value within 2 hours. */
  minDice: number;
}

export const DICE_REGEN_TIERS: readonly DiceRegenTier[] = [
  { minLevel: 1, minDice: 30 },
  { minLevel: 5, minDice: 40 },
  { minLevel: 10, minDice: 50 },
  { minLevel: 15, minDice: 60 },
  { minLevel: 20, minDice: 70 },
  { minLevel: 30, minDice: 90 },
  { minLevel: 50, minDice: 120 },
  { minLevel: 75, minDice: 140 },
  { minLevel: 100, minDice: 160 },
] as const;

/** Full regeneration window in milliseconds (2 hours). */
export const DICE_REGEN_FULL_WINDOW_MS = 2 * 60 * 60 * 1000;

// ── Tier resolution ─────────────────────────────────────────────────────────

/**
 * Resolves the minimum-dice threshold for the given player level.
 * Uses the highest tier whose minLevel ≤ playerLevel.
 */
export function resolveDiceRegenMinDice(playerLevel: number): number {
  const safeLevel = Number.isFinite(playerLevel) ? Math.max(1, Math.floor(playerLevel)) : 1;
  let result = DICE_REGEN_TIERS[0].minDice;
  for (const tier of DICE_REGEN_TIERS) {
    if (safeLevel >= tier.minLevel) {
      result = tier.minDice;
    }
  }
  return result;
}

/**
 * Computes the regeneration rate in dice per hour for the given player level.
 * Rate = minDice / 2 (since the full window is 2 hours).
 */
export function resolveDiceRegenRatePerHour(playerLevel: number): number {
  return resolveDiceRegenMinDice(playerLevel) / 2;
}

// ── Regeneration state ──────────────────────────────────────────────────────

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

  // Resolve tier for current level (may differ from stored state if level changed).
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

  return {
    dicePool: safePool + diceAdded,
    regenState: {
      maxDice: minDice,
      regenRatePerHour: ratePerHour,
      lastRegenAtMs: safeNow,
    },
    diceAdded,
  };
}
