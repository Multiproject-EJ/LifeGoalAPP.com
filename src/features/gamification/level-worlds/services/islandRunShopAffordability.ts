/**
 * islandRunShopAffordability — Pure affordability helpers for shop / market UI.
 *
 * Separated from the React component tree so the same math can drive the
 * Market panel, the Build panel, and any future costed-item UI without
 * duplicating shortfall / progress logic.
 *
 * The caller is responsible for supplying the relevant wallet balance for
 * the currency the item is priced in (essence, shards, diamonds, etc.) —
 * this module is currency-agnostic.
 */

export interface ShopItemAffordability {
  /** True when `balance >= cost` (and `cost >= 0`). */
  canAfford: boolean;
  /** How many currency units the player still needs. Always `>= 0`. */
  shortfall: number;
  /**
   * Balance progress toward the item cost as a 0–100 percentage (inclusive),
   * suitable for a progress bar. Capped at 100 once affordable. Returns 100
   * for a zero-cost item (it is always "fully affordable").
   */
  progressPct: number;
}

export interface NextCheapestPlan {
  /** Index of the next item to fund, or null when all are complete/invalid. */
  nextCheapestIndex: number | null;
}

/**
 * Computes whether the player can afford a shop/market item and how far they
 * are from being able to buy it.
 *
 * Rules:
 *   - `cost < 0` is treated as `0` (defensive; shop items shouldn't pay the
 *     player, but if a bad config sneaks through, behave as "free").
 *   - `balance < 0` is treated as `0` (defensive; wallets can never go
 *     negative in the game, but we still clamp to be safe).
 *   - `canAfford` is strictly `balance >= cost` on the clamped values.
 *   - `shortfall` is `max(0, cost - balance)`.
 *   - `progressPct` is `min(100, floor(100 * balance / cost))` or `100` when
 *     `cost === 0`.
 */
export function resolveShopItemAffordability(params: {
  cost: number;
  balance: number;
}): ShopItemAffordability {
  const rawCost = Number.isFinite(params.cost) ? params.cost : 0;
  const rawBalance = Number.isFinite(params.balance) ? params.balance : 0;
  const cost = Math.max(0, Math.floor(rawCost));
  const balance = Math.max(0, Math.floor(rawBalance));

  if (cost === 0) {
    return { canAfford: true, shortfall: 0, progressPct: 100 };
  }

  const canAfford = balance >= cost;
  const shortfall = canAfford ? 0 : cost - balance;
  const progressPct = canAfford
    ? 100
    : Math.min(100, Math.max(0, Math.floor((balance / cost) * 100)));

  return { canAfford, shortfall, progressPct };
}

/**
 * Given a list of remaining costs (e.g. "essence left to fully finish each
 * building"), returns the cheapest unfinished index. Non-finite and negative
 * values are treated as 0 (already complete).
 */
export function resolveNextCheapestIndex(params: {
  remainingCosts: ReadonlyArray<number>;
}): NextCheapestPlan {
  let nextCheapestIndex: number | null = null;
  let nextCheapestCost = Number.POSITIVE_INFINITY;

  for (let index = 0; index < params.remainingCosts.length; index++) {
    const rawRemaining = params.remainingCosts[index];
    const remaining = Number.isFinite(rawRemaining) ? Math.max(0, Math.floor(rawRemaining)) : 0;
    if (remaining <= 0) continue;
    if (remaining < nextCheapestCost) {
      nextCheapestCost = remaining;
      nextCheapestIndex = index;
    }
  }

  return { nextCheapestIndex };
}
