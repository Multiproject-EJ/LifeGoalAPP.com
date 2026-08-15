export type IslandRunDiceThrowStrength = 'normal' | 'hard';
export type IslandRunDiceHoldIntent = IslandRunDiceThrowStrength | 'auto';

/** Holding past this point hands control to canonical auto-roll. */
export const ISLAND_RUN_AUTO_ROLL_HOLD_MS = 1_400;
/** While staying at the available maximum, every tenth roll repeats the celebration throw. */
export const ISLAND_RUN_MAX_MULTIPLIER_HARD_THROW_INTERVAL = 10;

export function resolveIslandRunDiceHoldIntent(input: {
  heldForMs: number;
  autoRollActivated: boolean;
}): IslandRunDiceHoldIntent {
  if (input.autoRollActivated || input.heldForMs >= ISLAND_RUN_AUTO_ROLL_HOLD_MS) return 'auto';
  return 'normal';
}

export interface IslandRunMaxMultiplierThrowCadenceInput {
  isAtMaxAvailableMultiplier: boolean;
  firstMaxThrowPending: boolean;
  consecutiveMaxMultiplierRolls: number;
}

export interface IslandRunMaxMultiplierThrowCadenceResult {
  throwStrength: IslandRunDiceThrowStrength;
  nextFirstMaxThrowPending: boolean;
  nextConsecutiveMaxMultiplierRolls: number;
}

/**
 * Presentation-only cadence for the rare controller-to-topbar throw.
 *
 * The first successful roll after entering the currently available maximum is
 * emphatic. Continued play at that same maximum repeats the beat only on every
 * tenth roll. Leaving max immediately resets the streak; gameplay values never
 * enter this resolver.
 */
export function resolveIslandRunMaxMultiplierThrowCadence(
  input: IslandRunMaxMultiplierThrowCadenceInput,
): IslandRunMaxMultiplierThrowCadenceResult {
  if (!input.isAtMaxAvailableMultiplier) {
    return {
      throwStrength: 'normal',
      nextFirstMaxThrowPending: false,
      nextConsecutiveMaxMultiplierRolls: 0,
    };
  }

  const nextRollCount = Math.max(0, Math.floor(input.consecutiveMaxMultiplierRolls)) + 1;
  const isCelebrationThrow = input.firstMaxThrowPending
    || nextRollCount % ISLAND_RUN_MAX_MULTIPLIER_HARD_THROW_INTERVAL === 0;
  return {
    throwStrength: isCelebrationThrow ? 'hard' : 'normal',
    nextFirstMaxThrowPending: false,
    nextConsecutiveMaxMultiplierRolls: nextRollCount,
  };
}
