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

/** Starting dice pool for a brand-new game state or island reset. */
export const ISLAND_RUN_DEFAULT_STARTING_DICE = 30;

/** Dice cost per roll — always flat, regardless of island or level. */
export const ISLAND_RUN_DICE_PER_ROLL = 2;
