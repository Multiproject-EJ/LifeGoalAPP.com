export type IslandRunDiceThrowStrength = 'normal' | 'hard';
export type IslandRunDiceHoldIntent = IslandRunDiceThrowStrength | 'auto';

/** A short deliberate hold charges one emphatic single throw. */
export const ISLAND_RUN_HARD_THROW_HOLD_MS = 360;
/** Continuing past the hard-throw detent hands control to canonical auto-roll. */
export const ISLAND_RUN_AUTO_ROLL_HOLD_MS = 1_400;

export function resolveIslandRunDiceHoldIntent(input: {
  heldForMs: number;
  autoRollActivated: boolean;
}): IslandRunDiceHoldIntent {
  if (input.autoRollActivated || input.heldForMs >= ISLAND_RUN_AUTO_ROLL_HOLD_MS) return 'auto';
  if (input.heldForMs >= ISLAND_RUN_HARD_THROW_HOLD_MS) return 'hard';
  return 'normal';
}
