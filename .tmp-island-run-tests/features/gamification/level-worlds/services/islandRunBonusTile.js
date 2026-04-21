"use strict";
/**
 * islandRunBonusTile — 9-hit accumulator service for the glowing "bonus" ring tile.
 *
 * **Mechanic.**
 *   Every time the token lands on a bonus tile, a per-(island, tileIndex) counter
 *   increments by 1. The UI lights one more dot per landing (1/8, 2/8, …, 8/8).
 *   At 8/8 the tile enters its "primed" state. The **next** (9th) landing releases
 *   the accumulated bonus payload and resets the counter to 0.
 *
 * **State shape (persisted shape).**
 *   Record<islandNumberString, Record<tileIndex, charge>>
 *   - outer key: island number as string (matches the rest of the per-island maps).
 *   - inner key: tile index (0 .. tileCount-1 on the active board profile).
 *   - value: charge count in [0, BONUS_CHARGE_TARGET]. 0 after a release.
 *
 * **Persistence note.** The `bonusTileChargeByIsland` field lives on
 * `IslandRunGameStateRecord` (see `islandRunGameStateStore.ts`) and is
 * persisted to localStorage and the `island_run_runtime_state.bonus_tile_charge_by_island`
 * column (migration 0230). This service layer stays purely functional so
 * the game-logic contract can be unit-tested independently of storage
 * plumbing — callers read the ledger from the store/patch and pass it in.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BONUS_BASE_RELEASE_PAYOUT = exports.BONUS_CYCLE_LENGTH = exports.BONUS_CHARGE_TARGET = void 0;
exports.clampBonusCharge = clampBonusCharge;
exports.getBonusTileCharge = getBonusTileCharge;
exports.applyBonusTileCharge = applyBonusTileCharge;
exports.resetBonusTileChargeForIsland = resetBonusTileChargeForIsland;
exports.sanitizeBonusTileChargeByIsland = sanitizeBonusTileChargeByIsland;
/** Charges required before the bonus is primed and the next landing releases. */
exports.BONUS_CHARGE_TARGET = 8;
/** Total landings for a full charge-and-release cycle: 8 charges + 1 release = 9. */
exports.BONUS_CYCLE_LENGTH = exports.BONUS_CHARGE_TARGET + 1;
/**
 * Clamp a raw charge value to the valid range `[0, BONUS_CHARGE_TARGET]`. Used
 * everywhere the ledger is sanitised (local read, remote merge, patch overlay)
 * so the invariant lives in exactly one place.
 */
function clampBonusCharge(value) {
    if (typeof value !== 'number' || !Number.isFinite(value))
        return 0;
    return Math.max(0, Math.min(exports.BONUS_CHARGE_TARGET, Math.floor(value)));
}
/**
 * Baseline payout for a single bonus release. These numbers are the island-1
 * floor; callers should multiply by `getIslandEssenceMultiplier(effectiveIslandNumber)`
 * (see `islandRunContractV2EssenceBuild`) before awarding so late-game releases
 * scale with the rest of the economy. We keep the raw numbers tiny here so
 * renaming/retuning is a one-line change.
 */
exports.BONUS_BASE_RELEASE_PAYOUT = {
    essence: 80,
    dice: 4,
    rewardBarProgress: 5,
};
/**
 * Read the current charge (0..8) for a bonus tile on a given island. Returns 0
 * when the map or entry is missing, when the value is not a finite integer,
 * when the tile index is negative, or when a malformed value has crept in.
 */
function getBonusTileCharge(bonusTileChargeByIsland, islandNumber, tileIndex) {
    if (!bonusTileChargeByIsland || typeof bonusTileChargeByIsland !== 'object')
        return 0;
    const perIsland = bonusTileChargeByIsland[String(islandNumber)];
    if (!perIsland || typeof perIsland !== 'object')
        return 0;
    const raw = perIsland[tileIndex];
    if (typeof raw !== 'number' || !Number.isFinite(raw))
        return 0;
    const normalized = Math.floor(raw);
    if (normalized < 0)
        return 0;
    if (normalized > exports.BONUS_CHARGE_TARGET)
        return exports.BONUS_CHARGE_TARGET;
    return normalized;
}
/**
 * Apply a single bonus-tile landing and return the next ledger state.
 *
 * - If the tile was at 0..7 charges, increments by 1. No release.
 * - If the tile was at 8 (primed), this landing releases the payout and the
 *   counter resets to 0.
 * - Invalid tile indices or non-integer island numbers leave state unchanged
 *   (still returns a fresh map so callers can treat the result uniformly).
 *
 * The function never mutates its inputs — it returns a new top-level map and
 * a new inner map on the affected island key.
 */
function applyBonusTileCharge(input) {
    const { bonusTileChargeByIsland, islandNumber, tileIndex } = input;
    // Deep-clone the ledger shape we're about to mutate so callers can treat the
    // result as immutable (same pattern as the stop-ticket service).
    const nextMap = {};
    if (bonusTileChargeByIsland && typeof bonusTileChargeByIsland === 'object') {
        for (const [islandKey, innerRaw] of Object.entries(bonusTileChargeByIsland)) {
            if (!innerRaw || typeof innerRaw !== 'object')
                continue;
            const innerCopy = {};
            for (const [idxKey, chargeRaw] of Object.entries(innerRaw)) {
                const idx = Number(idxKey);
                if (!Number.isFinite(idx))
                    continue;
                if (typeof chargeRaw !== 'number' || !Number.isFinite(chargeRaw))
                    continue;
                const normalized = Math.max(0, Math.min(exports.BONUS_CHARGE_TARGET, Math.floor(chargeRaw)));
                if (normalized > 0)
                    innerCopy[idx] = normalized;
            }
            if (Object.keys(innerCopy).length > 0)
                nextMap[islandKey] = innerCopy;
        }
    }
    const safeIsland = Number.isFinite(islandNumber) ? Math.floor(islandNumber) : NaN;
    const safeTileIndex = Number.isFinite(tileIndex) ? Math.floor(tileIndex) : NaN;
    if (!Number.isFinite(safeIsland) || !Number.isFinite(safeTileIndex) || safeTileIndex < 0) {
        return {
            bonusTileChargeByIsland: nextMap,
            chargeAfter: 0,
            released: false,
            payout: null,
        };
    }
    const islandKey = String(safeIsland);
    const currentIsland = nextMap[islandKey] ?? {};
    const chargeBefore = getBonusTileCharge(nextMap, safeIsland, safeTileIndex);
    // Primed tile → this landing releases.
    if (chargeBefore >= exports.BONUS_CHARGE_TARGET) {
        const innerNext = { ...currentIsland };
        delete innerNext[safeTileIndex];
        if (Object.keys(innerNext).length > 0) {
            nextMap[islandKey] = innerNext;
        }
        else {
            delete nextMap[islandKey];
        }
        return {
            bonusTileChargeByIsland: nextMap,
            chargeAfter: 0,
            released: true,
            payout: { ...exports.BONUS_BASE_RELEASE_PAYOUT },
        };
    }
    // Otherwise increment by 1.
    const chargeAfter = chargeBefore + 1;
    nextMap[islandKey] = { ...currentIsland, [safeTileIndex]: chargeAfter };
    return {
        bonusTileChargeByIsland: nextMap,
        chargeAfter,
        released: false,
        payout: null,
    };
}
/**
 * Reset all bonus-tile charges for a given island — called on island travel
 * (new island = fresh ring, fresh charges). Mirrors the pattern used by
 * `stopTicketsPaidByIsland` at island travel.
 */
function resetBonusTileChargeForIsland(bonusTileChargeByIsland, islandNumber) {
    const nextMap = {};
    if (!bonusTileChargeByIsland || typeof bonusTileChargeByIsland !== 'object')
        return nextMap;
    const targetKey = String(Math.floor(islandNumber));
    for (const [islandKey, inner] of Object.entries(bonusTileChargeByIsland)) {
        if (islandKey === targetKey)
            continue;
        if (!inner || typeof inner !== 'object')
            continue;
        nextMap[islandKey] = { ...inner };
    }
    return nextMap;
}
/**
 * Remove malformed entries and clamp values to `[0, BONUS_CHARGE_TARGET]`. Safe
 * to call on every hydration; callers may also omit it if they trust the
 * source, since `applyBonusTileCharge` and `getBonusTileCharge` both sanitize
 * inline.
 */
function sanitizeBonusTileChargeByIsland(bonusTileChargeByIsland) {
    const nextMap = {};
    if (!bonusTileChargeByIsland || typeof bonusTileChargeByIsland !== 'object')
        return nextMap;
    for (const [islandKey, innerRaw] of Object.entries(bonusTileChargeByIsland)) {
        if (!innerRaw || typeof innerRaw !== 'object')
            continue;
        const innerCopy = {};
        for (const [idxKey, chargeRaw] of Object.entries(innerRaw)) {
            const idx = Number(idxKey);
            if (!Number.isFinite(idx) || idx < 0)
                continue;
            if (typeof chargeRaw !== 'number' || !Number.isFinite(chargeRaw))
                continue;
            const normalized = clampBonusCharge(chargeRaw);
            if (normalized > 0)
                innerCopy[Math.floor(idx)] = normalized;
        }
        if (Object.keys(innerCopy).length > 0)
            nextMap[islandKey] = innerCopy;
    }
    return nextMap;
}
