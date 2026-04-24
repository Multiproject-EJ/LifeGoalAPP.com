/**
 * islandRunEconomy — Dice economy constants for Island Run.
 *
 * Hearts are fully retired. Dice is the only board energy and is sourced
 * from regeneration (level-based), reward bar payouts, boss/stop/island
 * completion, daily treats, lucky spin, and shop purchases.
 *
 * The starting dice pool for a new island or fresh state is a flat constant
 * so that dice scarcity is governed entirely by the regeneration system.
 */

/**
 * Starting dice pool for a brand-new game state or island reset.
 *
 * **Equals the level-1 dice-regen floor.** The regen floor is computed by
 * `resolveDiceRegenMinDice(level) = 30 + ⌊20 × ln(level)⌋`; at level 1 that
 * evaluates to exactly 30. So the starting pool is *derived* from the XP-
 * level curve, not an independent tunable: a brand-new account (before any
 * XP is earned) begins with the same floor a level-1 regen would bring
 * them back up to, so the first experience feels identical to a returning
 * level-1 player's regenerated-to-full state. Once the player levels up,
 * the regen floor takes over and the starting value is no longer
 * consulted.
 */
export const ISLAND_RUN_DEFAULT_STARTING_DICE = 30;

/** Dice cost per roll — always flat, regardless of island or level. */
export const ISLAND_RUN_DICE_PER_ROLL = 1;
