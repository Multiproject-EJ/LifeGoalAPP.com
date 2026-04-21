"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveShopItemAffordability = resolveShopItemAffordability;
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
function resolveShopItemAffordability(params) {
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
