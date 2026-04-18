export type IslandRunContractV2StopState = {
  objectiveComplete: boolean;
  buildComplete: boolean;
  completedAtMs?: number;
};

export type IslandRunContractV2BuildState = {
  requiredEssence: number;
  spentEssence: number;
  buildLevel: number;
};

/**
 * Maximum build level per stop (number of cost tiers = number of building levels).
 * A stop's build is fully complete when buildLevel === MAX_BUILD_LEVEL.
 */
export const MAX_BUILD_LEVEL = 3; // L1, L2, L3 (matches STOP_UPGRADE_BASE_COSTS.length)

/**
 * Compute the effective island number for scaling purposes.
 * After completing all 120 islands (cycle increments), costs and rewards
 * continue to scale upward by treating island 1 on cycle 2 as island 121, etc.
 * effectiveIslandNumber = cycleIndex × 120 + islandNumber
 */
export function getEffectiveIslandNumber(islandNumber: number, cycleIndex: number): number {
  const safeIsland = Math.max(1, Math.floor(islandNumber));
  const safeCycle = Math.max(0, Math.floor(cycleIndex));
  return safeCycle * 120 + safeIsland;
}

/**
 * Returns true when the stop's build is fully complete (all levels funded).
 */
export function isStopBuildFullyComplete(buildState: IslandRunContractV2BuildState): boolean {
  return buildState.buildLevel >= MAX_BUILD_LEVEL;
}

/**
 * Initialize the build state array for all 5 stops on a new island visit.
 * Uses the effective island number (cycleIndex × 120 + islandNumber) for scaling.
 */
export function initStopBuildStatesForIsland(effectiveIslandNumber: number): IslandRunContractV2BuildState[] {
  return Array.from({ length: 5 }, (_, stopIndex) => ({
    requiredEssence: getStopUpgradeCost({ islandNumber: effectiveIslandNumber, stopIndex, currentBuildLevel: 0 }),
    spentEssence: 0,
    buildLevel: 0,
  }));
}

// ─── Monopoly GO–style Essence Economy ────────────────────────────────
// Base earnings per tile type.  These are the *floor* values for island 1.
// Actual earn = base × islandMultiplier, where multiplier grows ~1.5× every 10 islands.
export const ISLAND_RUN_CONTRACT_V2_ESSENCE_EARN_BY_TILE: Readonly<Record<string, { min: number; max: number }>> = {
  currency: { min: 5, max: 15 },
  chest:    { min: 20, max: 40 },
  event:    { min: 8, max: 20 },
  hazard:   { min: 1, max: 3 },
  micro:    { min: 3, max: 10 },
};

/**
 * Island-based cost/earn multiplier.
 * Every 10 islands the multiplier grows by 1.5×.
 * Island 1 = 1.0, island 10 = 1.5, island 20 = 2.25, etc.
 */
export function getIslandEssenceMultiplier(islandNumber: number): number {
  const safe = Math.max(1, Math.floor(islandNumber));
  const tier = Math.floor((safe - 1) / 10);
  return Math.pow(1.5, tier);
}

/**
 * Resolve the essence earned for a specific tile type on a given island.
 * Returns a deterministic amount based on tile type, island number, and an
 * optional seed (defaults to Date.now()) for variance within the min–max range.
 */
export function resolveIslandRunContractV2EssenceEarnForTile(
  tileType: string,
  options?: { islandNumber?: number; seed?: number },
): number {
  const range = ISLAND_RUN_CONTRACT_V2_ESSENCE_EARN_BY_TILE[tileType];
  if (!range) return 0;
  const island = options?.islandNumber ?? 1;
  const seed = options?.seed ?? Date.now();
  const mult = getIslandEssenceMultiplier(island);
  // Deterministic pick within range using LCG (Linear Congruential Generator)
  const t = ((seed * 9301 + 49297) % 233280) / 233280; // 0–1
  const base = Math.floor(range.min + t * (range.max - range.min + 1));
  return Math.max(1, Math.floor(base * mult));
}

// ─── Stop upgrade cost curves (Monopoly GO–style scaling) ─────────────
// Within a stop: L1 cheap → L2 medium → L3 expensive spike.
// Between islands: total cost scales ~1.5×–2× per island.
export const STOP_UPGRADE_BASE_COSTS: readonly number[] = [50, 120, 300]; // L1, L2, L3 for island 1 Stop 1

/**
 * Get the required essence to reach the next build level of a stop.
 * stopIndex 0–4 (hatchery=0 … boss=4). Each stop costs slightly more than the previous.
 * Boss stop (4) costs 4× base; other stops scale by 1 + 0.4 × stopIndex.
 */
export function getStopUpgradeCost(options: {
  islandNumber: number;
  stopIndex: number;
  currentBuildLevel: number;
}): number {
  const { islandNumber, stopIndex, currentBuildLevel } = options;
  const baseCost = STOP_UPGRADE_BASE_COSTS[Math.min(currentBuildLevel, STOP_UPGRADE_BASE_COSTS.length - 1)] ?? 300;
  const stopScale = stopIndex === 4 ? 4 : 1 + 0.4 * Math.max(0, stopIndex);
  const islandScale = getIslandEssenceMultiplier(islandNumber);
  return Math.max(1, Math.floor(baseCost * stopScale * islandScale));
}

/**
 * Total essence required to fully complete all stops on an island.
 * Useful for UI display and drift threshold calculation.
 */
export function getIslandTotalEssenceCost(islandNumber: number): number {
  let total = 0;
  for (let stop = 0; stop < 5; stop++) {
    for (let level = 0; level < STOP_UPGRADE_BASE_COSTS.length; level++) {
      total += getStopUpgradeCost({ islandNumber, stopIndex: stop, currentBuildLevel: level });
    }
  }
  return total;
}

// ─── Essence Drift (soft pressure) ───────────────────────────────────
// When player holds essence above 80% of the island's total cost,
// a small % decays every hour. This is the non-toxic replacement for
// Monopoly GO's "heists" — it creates urgency to spend without punishing.
export const ESSENCE_DRIFT_THRESHOLD_RATIO = 0.8; // decay starts above 80% of island cost
export const ESSENCE_DRIFT_RATE_PER_HOUR = 0.05;  // lose 5% of excess per hour

/**
 * Calculate essence after applying drift/decay for elapsed time.
 * Drift is suspended when the island is already fully cleared (all objectives,
 * all builds at max level, hatchery egg resolved) — there is nothing left to spend on.
 * Returns the new essence value and amount lost.
 */
export function applyEssenceDrift(options: {
  essence: number;
  islandNumber: number;
  elapsedMs: number;
  /** Pass true to suppress drift when the island is fully cleared. */
  isIslandComplete?: boolean;
}): { essence: number; driftLost: number } {
  const { essence, islandNumber, elapsedMs, isIslandComplete } = options;
  if (essence <= 0 || elapsedMs <= 0) return { essence, driftLost: 0 };
  // No decay once the island is done — there is nothing to spend essence on.
  if (isIslandComplete) return { essence, driftLost: 0 };

  const islandCost = getIslandTotalEssenceCost(islandNumber);
  const threshold = Math.floor(islandCost * ESSENCE_DRIFT_THRESHOLD_RATIO);

  if (essence <= threshold) return { essence, driftLost: 0 };

  const excess = essence - threshold;
  const hoursElapsed = elapsedMs / (60 * 60 * 1000);
  // Compound decay: remaining = excess × (1 - rate)^hours
  const remaining = Math.floor(excess * Math.pow(1 - ESSENCE_DRIFT_RATE_PER_HOUR, hoursElapsed));
  const lost = excess - remaining;

  if (lost <= 0) return { essence, driftLost: 0 };

  return {
    essence: threshold + remaining,
    driftLost: lost,
  };
}

export function awardIslandRunContractV2Essence(options: {
  islandRunContractV2Enabled: boolean;
  essence: number;
  essenceLifetimeEarned: number;
  amount: number;
}): { essence: number; essenceLifetimeEarned: number; earned: number } {
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
export function spendIslandRunContractV2EssenceOnStopBuild(options: {
  islandRunContractV2Enabled: boolean;
  stopIndex: number;
  spendAmount: number;
  essence: number;
  essenceLifetimeSpent: number;
  stopBuildStateByIndex: IslandRunContractV2BuildState[];
  stopStatesByIndex: IslandRunContractV2StopState[];
  /** Effective island number (cycleIndex × 120 + islandNumber) for next-level cost lookup. */
  effectiveIslandNumber: number;
}): {
  essence: number;
  essenceLifetimeSpent: number;
  stopBuildStateByIndex: IslandRunContractV2BuildState[];
  stopStatesByIndex: IslandRunContractV2StopState[];
  spent: number;
  leveledUp: boolean;
} {
  const noChange = {
    essence: options.essence,
    essenceLifetimeSpent: options.essenceLifetimeSpent,
    stopBuildStateByIndex: options.stopBuildStateByIndex,
    stopStatesByIndex: options.stopStatesByIndex,
    spent: 0,
    leveledUp: false,
  };

  if (!options.islandRunContractV2Enabled) return noChange;

  const normalizedStopIndex = Math.max(0, Math.floor(options.stopIndex));
  const currentBuildState = options.stopBuildStateByIndex[normalizedStopIndex];
  const currentStopState = options.stopStatesByIndex[normalizedStopIndex] ?? { objectiveComplete: false, buildComplete: false };

  if (!currentBuildState) return noChange;

  // Already fully built — nothing to do.
  if (isStopBuildFullyComplete(currentBuildState)) return noChange;

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
  const buildFullyComplete = nextBuildLevel >= MAX_BUILD_LEVEL;

  let nextBuildState: IslandRunContractV2BuildState;
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
  } else if (buildFullyComplete) {
    nextBuildState = {
      requiredEssence,
      spentEssence: requiredEssence, // fully spent
      buildLevel: MAX_BUILD_LEVEL,
    };
  } else {
    nextBuildState = {
      requiredEssence,
      spentEssence: nextSpentEssence,
      buildLevel: currentBuildState.buildLevel,
    };
  }

  const nextStopBuildStateByIndex = options.stopBuildStateByIndex.map((entry, index) =>
    index !== normalizedStopIndex ? entry : nextBuildState,
  );

  const nextStopStatesByIndex = options.stopStatesByIndex.map((entry, index) => {
    if (index !== normalizedStopIndex) return entry;
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
