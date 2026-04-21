"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ESSENCE_DRIFT_MAX_SESSION_LOSS_RATIO = exports.ESSENCE_DRIFT_RATE_PER_HOUR = exports.ESSENCE_DRIFT_THRESHOLD_RATIO = exports.STOP_UPGRADE_BASE_COSTS = exports.ISLAND_RUN_CONTRACT_V2_ESSENCE_EARN_BY_TILE = exports.MAX_BUILD_LEVEL = void 0;
exports.getEffectiveIslandNumber = getEffectiveIslandNumber;
exports.isStopBuildFullyComplete = isStopBuildFullyComplete;
exports.initStopBuildStatesForIsland = initStopBuildStatesForIsland;
exports.getIslandEssenceMultiplier = getIslandEssenceMultiplier;
exports.resolveIslandRunContractV2EssenceEarnForTile = resolveIslandRunContractV2EssenceEarnForTile;
exports.deductIslandRunContractV2Essence = deductIslandRunContractV2Essence;
exports.getStopUpgradeCost = getStopUpgradeCost;
exports.getIslandTotalEssenceCost = getIslandTotalEssenceCost;
exports.getRemainingIslandBuildCost = getRemainingIslandBuildCost;
exports.applyEssenceDrift = applyEssenceDrift;
exports.awardIslandRunContractV2Essence = awardIslandRunContractV2Essence;
exports.spendIslandRunContractV2EssenceOnStopBuild = spendIslandRunContractV2EssenceOnStopBuild;
/**
 * Maximum build level per stop (number of cost tiers = number of building levels).
 * A stop's build is fully complete when buildLevel === MAX_BUILD_LEVEL.
 */
exports.MAX_BUILD_LEVEL = 3; // L1, L2, L3 (matches STOP_UPGRADE_BASE_COSTS.length)
/**
 * Compute the effective island number for scaling purposes.
 * After completing all 120 islands (cycle increments), costs and rewards
 * continue to scale upward by treating island 1 on cycle 2 as island 121, etc.
 * effectiveIslandNumber = cycleIndex × 120 + islandNumber
 */
function getEffectiveIslandNumber(islandNumber, cycleIndex) {
    const safeIsland = Math.max(1, Math.floor(islandNumber));
    const safeCycle = Math.max(0, Math.floor(cycleIndex));
    return safeCycle * 120 + safeIsland;
}
/**
 * Returns true when the stop's build is fully complete (all levels funded).
 */
function isStopBuildFullyComplete(buildState) {
    return buildState.buildLevel >= exports.MAX_BUILD_LEVEL;
}
/**
 * Initialize the build state array for all 5 stops on a new island visit.
 * Uses the effective island number (cycleIndex × 120 + islandNumber) for scaling.
 */
function initStopBuildStatesForIsland(effectiveIslandNumber) {
    return Array.from({ length: 5 }, (_, stopIndex) => ({
        requiredEssence: getStopUpgradeCost({ islandNumber: effectiveIslandNumber, stopIndex, currentBuildLevel: 0 }),
        spentEssence: 0,
        buildLevel: 0,
    }));
}
// ─── Monopoly GO–style Essence Economy ────────────────────────────────
// Base earnings per tile type.  These are the *floor* values for island 1.
// Actual earn = base × islandMultiplier, where multiplier grows ~1.5× every 10 islands.
// Hazard tiles have NEGATIVE ranges — landing on a hazard DEDUCTS essence from
// the player's wallet (clamped to zero so it can never go below 0). This keeps
// hazards a real risk rather than just "a micro tile with different copy".
exports.ISLAND_RUN_CONTRACT_V2_ESSENCE_EARN_BY_TILE = {
    currency: { min: 5, max: 15 },
    chest: { min: 20, max: 40 },
    hazard: { min: -10, max: -3 },
    micro: { min: 3, max: 10 },
};
/**
 * Island-based cost/earn multiplier.
 * Every 10 islands the multiplier grows by 1.5×.
 * Island 1 = 1.0, island 10 = 1.5, island 20 = 2.25, etc.
 */
function getIslandEssenceMultiplier(islandNumber) {
    const safe = Math.max(1, Math.floor(islandNumber));
    const tier = Math.floor((safe - 1) / 10);
    return Math.pow(1.5, tier);
}
/**
 * Resolve the essence earned for a specific tile type on a given island.
 * Returns a deterministic amount based on tile type, island number, and an
 * optional seed (defaults to Date.now()) for variance within the min–max range.
 */
function resolveIslandRunContractV2EssenceEarnForTile(tileType, options) {
    const range = exports.ISLAND_RUN_CONTRACT_V2_ESSENCE_EARN_BY_TILE[tileType];
    if (!range)
        return 0;
    const island = options?.islandNumber ?? 1;
    const seed = options?.seed ?? Date.now();
    const mult = getIslandEssenceMultiplier(island);
    // Deterministic pick within range using LCG (Linear Congruential Generator)
    const t = ((seed * 9301 + 49297) % 233280) / 233280; // 0–1
    const base = Math.floor(range.min + t * (range.max - range.min + 1));
    const scaled = Math.floor(base * mult);
    // Negative ranges (hazard) → pass through a negative value (caller clamps wallet).
    if (range.max < 0)
        return Math.min(-1, scaled);
    // Positive ranges → clamp to at least 1 so feeding tiles never silently no-op.
    return Math.max(1, scaled);
}
/**
 * Deduct essence from the wallet (for hazard tiles or ticket purchases).
 * The wallet is clamped at 0 — players can never owe essence.
 * `essenceLifetimeSpent` grows by the amount actually deducted (not the
 * requested amount if the wallet was short). When `essenceLifetimeEarned`
 * is provided it is LEFT UNCHANGED — drift/hazard losses are not lifetime
 * unearnings, they're just withdrawals.
 */
function deductIslandRunContractV2Essence(options) {
    if (!options.islandRunContractV2Enabled) {
        return {
            essence: options.essence,
            essenceLifetimeSpent: options.essenceLifetimeSpent,
            spent: 0,
        };
    }
    const requested = Math.max(0, Math.floor(options.amount));
    if (requested < 1) {
        return {
            essence: options.essence,
            essenceLifetimeSpent: options.essenceLifetimeSpent,
            spent: 0,
        };
    }
    const wallet = Math.max(0, Math.floor(options.essence));
    const actual = Math.min(wallet, requested);
    return {
        essence: wallet - actual,
        essenceLifetimeSpent: Math.max(0, Math.floor(options.essenceLifetimeSpent)) + actual,
        spent: actual,
    };
}
// ─── Stop upgrade cost curves (Monopoly GO–style scaling) ─────────────
// Within a stop: L1 cheap → L2 medium → L3 expensive spike.
// Between islands: total cost scales ~1.5×–2× per island.
exports.STOP_UPGRADE_BASE_COSTS = [50, 120, 300]; // L1, L2, L3 for island 1 Stop 1
/**
 * Get the required essence to reach the next build level of a stop.
 * stopIndex 0–4 (hatchery=0 … boss=4). Each stop costs slightly more than the previous.
 * Boss stop (4) costs 4× base; other stops scale by 1 + 0.4 × stopIndex.
 */
function getStopUpgradeCost(options) {
    const { islandNumber, stopIndex, currentBuildLevel } = options;
    const baseCost = exports.STOP_UPGRADE_BASE_COSTS[Math.min(currentBuildLevel, exports.STOP_UPGRADE_BASE_COSTS.length - 1)] ?? 300;
    const stopScale = stopIndex === 4 ? 4 : 1 + 0.4 * Math.max(0, stopIndex);
    const islandScale = getIslandEssenceMultiplier(islandNumber);
    return Math.max(1, Math.floor(baseCost * stopScale * islandScale));
}
/**
 * Total essence required to fully complete all stops on an island.
 * Useful for UI display and drift threshold calculation.
 */
function getIslandTotalEssenceCost(islandNumber) {
    let total = 0;
    for (let stop = 0; stop < 5; stop++) {
        for (let level = 0; level < exports.STOP_UPGRADE_BASE_COSTS.length; level++) {
            total += getStopUpgradeCost({ islandNumber, stopIndex: stop, currentBuildLevel: level });
        }
    }
    return total;
}
/**
 * Essence still owed to fully fund every building on the island given the
 * current live build state. This is what drift's "remaining cost" threshold
 * is measured against so that a player who has already funded most of the
 * island can't sit on a huge hoard without drift nudging them to spend.
 *
 * For each stop the remaining cost is:
 *   - for the current in-progress level: (requiredEssence - spentEssence)
 *   - plus the full cost of every level above the current one, computed from
 *     `getStopUpgradeCost` at the supplied `effectiveIslandNumber`.
 */
function getRemainingIslandBuildCost(options) {
    const { effectiveIslandNumber, stopBuildStateByIndex } = options;
    let total = 0;
    for (let stop = 0; stop < 5; stop++) {
        const build = stopBuildStateByIndex[stop];
        const currentLevel = Math.max(0, Math.floor(build?.buildLevel ?? 0));
        if (currentLevel >= exports.MAX_BUILD_LEVEL)
            continue;
        // In-progress level: whatever is still owed for this tier.
        if (build) {
            const required = Math.max(0, Math.floor(build.requiredEssence));
            const spent = Math.max(0, Math.floor(build.spentEssence));
            total += Math.max(0, required - spent);
        }
        else {
            total += getStopUpgradeCost({
                islandNumber: effectiveIslandNumber,
                stopIndex: stop,
                currentBuildLevel: currentLevel,
            });
        }
        // Remaining levels above the current one — full tier cost each.
        for (let level = currentLevel + 1; level < exports.MAX_BUILD_LEVEL; level++) {
            total += getStopUpgradeCost({
                islandNumber: effectiveIslandNumber,
                stopIndex: stop,
                currentBuildLevel: level,
            });
        }
    }
    return total;
}
// ─── Essence Drift (soft pressure) ───────────────────────────────────
// When a player hoards essence far above what the current island actually
// needs, a small % of the EXCESS decays per hour. This replaces the toxic
// "heists" pattern with a gentle nudge to spend.
//
// Threshold is set to 1.5× the **remaining** island build cost (not total) —
// once most of an island is already built, hoarding becomes visible sooner,
// which pushes the player to either fund the last stops or start saving for
// the next island. A player can still safely hold enough essence for what's
// left of this island plus roughly half of the next one before drift kicks in.
//
// The rate was tuned down substantially (5%/h → 0.5%/h) based on playtest
// feedback — the previous rate punished weekend-away players by erasing
// ~97% of their excess after 72h.  At 0.5%/h linear, a raw 72h session
// would want to erase 36% of excess, but the 20% per-session cap below
// clamps any single reconnection loss to that ceiling — so players who
// disappear for days still retain at least 80% of their excess on return.
exports.ESSENCE_DRIFT_THRESHOLD_RATIO = 1.5; // decay starts above 1.5× remaining island cost
exports.ESSENCE_DRIFT_RATE_PER_HOUR = 0.005; // lose 0.5% of excess per hour (linear)
/** Maximum fraction of the player's excess that a single drift application can remove. */
exports.ESSENCE_DRIFT_MAX_SESSION_LOSS_RATIO = 0.2; // cap at 20% of excess per call
/**
 * Calculate essence after applying drift/decay for elapsed time.
 * Drift is suspended when the island is already fully cleared (all objectives,
 * all builds at max level, hatchery egg resolved) — there is nothing left to spend on.
 * Returns the new essence value and amount lost.
 *
 * Drift uses **linear** decay (contract §4B): `lost = excess × rate × hours`,
 * clamped to the excess and to the per-session cap. This deliberately avoids
 * compound decay so the player can reason about "how much will I lose if I'm
 * away for N hours" without a surprise exponential.
 *
 * The threshold is based on **remaining** island build cost (not total) so
 * that late-island hoarding still triggers drift. `remainingIslandCost` must
 * be supplied by the caller from the live build state; when omitted, we
 * fall back to the full island cost (legacy behaviour) to stay safe.
 */
function applyEssenceDrift(options) {
    const { essence, islandNumber, elapsedMs, isIslandComplete } = options;
    if (essence <= 0 || elapsedMs <= 0)
        return { essence, driftLost: 0 };
    // No decay once the island is done — there is nothing to spend essence on.
    if (isIslandComplete)
        return { essence, driftLost: 0 };
    // If the caller explicitly reports zero (or negative) remaining build cost,
    // the island is effectively built-out even if the broader `isIslandComplete`
    // flag hasn't flipped yet (that flag also requires objectives + egg state).
    // The previous `Math.max(1, …)` clamp collapsed the threshold to 1 in this
    // case, so every stored essence unit above 1 was counted as "excess" and
    // drifted away — the exact opposite of the intended "nothing left to build
    // → no drift" semantics. Short-circuit here so a fully-funded island never
    // leaks essence while the player finishes the remaining objectives or
    // hatches their egg.
    if (typeof options.remainingIslandCost === 'number' && options.remainingIslandCost <= 0) {
        return { essence, driftLost: 0 };
    }
    const fallbackCost = getIslandTotalEssenceCost(islandNumber);
    const remainingRaw = typeof options.remainingIslandCost === 'number'
        ? options.remainingIslandCost
        : fallbackCost;
    // Guard against 0/negative remaining costs from the fallback path (legacy
    // callers that don't pass `remainingIslandCost`): clamp to a positive floor
    // so the threshold remains sensible. The explicit-zero case above has
    // already short-circuited.
    const remainingIslandCost = Math.max(1, Math.floor(remainingRaw));
    const threshold = Math.floor(remainingIslandCost * exports.ESSENCE_DRIFT_THRESHOLD_RATIO);
    if (essence <= threshold)
        return { essence, driftLost: 0 };
    const excess = essence - threshold;
    const hoursElapsed = elapsedMs / (60 * 60 * 1000);
    // Linear decay (per contract): lost = excess × rate × hours, capped at excess.
    let lost = Math.floor(excess * exports.ESSENCE_DRIFT_RATE_PER_HOUR * hoursElapsed);
    if (lost <= 0)
        return { essence, driftLost: 0 };
    if (lost > excess)
        lost = excess;
    // Session cap — never remove more than 20% of excess in a single application
    // so returning after a long absence doesn't feel punitive.
    const sessionCap = Math.floor(excess * exports.ESSENCE_DRIFT_MAX_SESSION_LOSS_RATIO);
    if (lost > sessionCap)
        lost = sessionCap;
    return {
        essence: essence - lost,
        driftLost: lost,
    };
}
function awardIslandRunContractV2Essence(options) {
    if (!options.islandRunContractV2Enabled) {
        return {
            essence: options.essence,
            essenceLifetimeEarned: options.essenceLifetimeEarned,
            earned: 0,
        };
    }
    const earned = Math.max(0, Math.floor(options.amount));
    if (earned < 1) {
        return {
            essence: options.essence,
            essenceLifetimeEarned: options.essenceLifetimeEarned,
            earned: 0,
        };
    }
    return {
        essence: Math.max(0, Math.floor(options.essence)) + earned,
        essenceLifetimeEarned: Math.max(0, Math.floor(options.essenceLifetimeEarned)) + earned,
        earned,
    };
}
/**
 * Spend essence on a stop's building.
 * Build is DECOUPLED from stop objective/sequencing — any stop can be funded at any time.
 * Multi-level: when a level is fully funded the building advances to the next level
 * (spentEssence resets, requiredEssence updates to the next tier cost) until MAX_BUILD_LEVEL
 * is reached, at which point buildComplete is set on the stop state.
 */
function spendIslandRunContractV2EssenceOnStopBuild(options) {
    const noChange = {
        essence: options.essence,
        essenceLifetimeSpent: options.essenceLifetimeSpent,
        stopBuildStateByIndex: options.stopBuildStateByIndex,
        stopStatesByIndex: options.stopStatesByIndex,
        spent: 0,
        leveledUp: false,
    };
    if (!options.islandRunContractV2Enabled)
        return noChange;
    const normalizedStopIndex = Math.max(0, Math.floor(options.stopIndex));
    const currentBuildState = options.stopBuildStateByIndex[normalizedStopIndex];
    const currentStopState = options.stopStatesByIndex[normalizedStopIndex] ?? { objectiveComplete: false, buildComplete: false };
    if (!currentBuildState)
        return noChange;
    // Already fully built — nothing to do.
    if (isStopBuildFullyComplete(currentBuildState))
        return noChange;
    const budget = Math.max(0, Math.floor(options.essence));
    const request = Math.max(0, Math.floor(options.spendAmount));
    const requiredEssence = Math.max(0, Math.floor(currentBuildState.requiredEssence));
    const alreadySpent = Math.max(0, Math.floor(currentBuildState.spentEssence));
    const remaining = Math.max(0, requiredEssence - alreadySpent);
    const spent = Math.max(0, Math.min(request, budget, remaining));
    if (spent < 1) {
        return { ...noChange, essence: budget };
    }
    const nextSpentEssence = alreadySpent + spent;
    const levelComplete = nextSpentEssence >= requiredEssence;
    const nextBuildLevel = levelComplete ? currentBuildState.buildLevel + 1 : currentBuildState.buildLevel;
    const buildFullyComplete = nextBuildLevel >= exports.MAX_BUILD_LEVEL;
    let nextBuildState;
    if (levelComplete && !buildFullyComplete) {
        // Advance to next level: reset progress and compute the new required amount.
        const nextLevelCost = getStopUpgradeCost({
            islandNumber: options.effectiveIslandNumber,
            stopIndex: normalizedStopIndex,
            currentBuildLevel: nextBuildLevel,
        });
        nextBuildState = {
            requiredEssence: nextLevelCost,
            spentEssence: 0,
            buildLevel: nextBuildLevel,
        };
    }
    else if (buildFullyComplete) {
        nextBuildState = {
            requiredEssence,
            spentEssence: requiredEssence, // fully spent
            buildLevel: exports.MAX_BUILD_LEVEL,
        };
    }
    else {
        nextBuildState = {
            requiredEssence,
            spentEssence: nextSpentEssence,
            buildLevel: currentBuildState.buildLevel,
        };
    }
    const nextStopBuildStateByIndex = options.stopBuildStateByIndex.map((entry, index) => index !== normalizedStopIndex ? entry : nextBuildState);
    const nextStopStatesByIndex = options.stopStatesByIndex.map((entry, index) => {
        if (index !== normalizedStopIndex)
            return entry;
        return {
            ...currentStopState,
            buildComplete: buildFullyComplete,
            ...(buildFullyComplete && currentStopState.objectiveComplete ? { completedAtMs: Date.now() } : {}),
        };
    });
    return {
        essence: budget - spent,
        essenceLifetimeSpent: Math.max(0, Math.floor(options.essenceLifetimeSpent)) + spent,
        stopBuildStateByIndex: nextStopBuildStateByIndex,
        stopStatesByIndex: nextStopStatesByIndex,
        spent,
        leveledUp: levelComplete,
    };
}
