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

// ─── Monopoly GO–style Essence Economy ────────────────────────────────
// Base earnings per tile type.  These are the *floor* values for island 1.
// Actual earn = base × islandMultiplier, where multiplier grows ~1.5× every 10 islands.
export const ISLAND_RUN_CONTRACT_V2_ESSENCE_EARN_BY_TILE: Readonly<Record<string, { min: number; max: number }>> = {
  currency: { min: 5, max: 15 },
  chest:    { min: 20, max: 40 },
  egg_shard: { min: 3, max: 8 },
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
 * Returns the new essence value and amount lost.
 */
export function applyEssenceDrift(options: {
  essence: number;
  islandNumber: number;
  elapsedMs: number;
}): { essence: number; driftLost: number } {
  const { essence, islandNumber, elapsedMs } = options;
  if (essence <= 0 || elapsedMs <= 0) return { essence, driftLost: 0 };

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

export function isIslandRunContractV2BuildPanelVisibleForStop(options: {
  islandRunContractV2Enabled: boolean;
  openedStopIndex: number;
  activeStopIndex: number;
}): boolean {
  if (!options.islandRunContractV2Enabled) return false;
  return options.openedStopIndex === options.activeStopIndex;
}

export function canIslandRunContractV2CompleteStop(options: {
  islandRunContractV2Enabled: boolean;
  stopStatesByIndex: IslandRunContractV2StopState[];
  stopIndex: number;
}): boolean {
  if (!options.islandRunContractV2Enabled) return true;
  const normalizedIndex = Math.max(0, Math.floor(options.stopIndex));
  const entry = options.stopStatesByIndex[normalizedIndex];
  return entry?.objectiveComplete === true && entry?.buildComplete === true;
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

export function spendIslandRunContractV2EssenceOnStopBuild(options: {
  islandRunContractV2Enabled: boolean;
  stopIndex: number;
  spendAmount: number;
  essence: number;
  essenceLifetimeSpent: number;
  stopBuildStateByIndex: IslandRunContractV2BuildState[];
  stopStatesByIndex: IslandRunContractV2StopState[];
}): {
  essence: number;
  essenceLifetimeSpent: number;
  stopBuildStateByIndex: IslandRunContractV2BuildState[];
  stopStatesByIndex: IslandRunContractV2StopState[];
  spent: number;
} {
  if (!options.islandRunContractV2Enabled) {
    return {
      essence: options.essence,
      essenceLifetimeSpent: options.essenceLifetimeSpent,
      stopBuildStateByIndex: options.stopBuildStateByIndex,
      stopStatesByIndex: options.stopStatesByIndex,
      spent: 0,
    };
  }

  const normalizedStopIndex = Math.max(0, Math.floor(options.stopIndex));
  const currentBuildState = options.stopBuildStateByIndex[normalizedStopIndex];
  const currentStopState = options.stopStatesByIndex[normalizedStopIndex] ?? { objectiveComplete: false, buildComplete: false };

  if (!currentBuildState) {
    return {
      essence: options.essence,
      essenceLifetimeSpent: options.essenceLifetimeSpent,
      stopBuildStateByIndex: options.stopBuildStateByIndex,
      stopStatesByIndex: options.stopStatesByIndex,
      spent: 0,
    };
  }

  const budget = Math.max(0, Math.floor(options.essence));
  const request = Math.max(0, Math.floor(options.spendAmount));
  const requiredEssence = Math.max(0, Math.floor(currentBuildState.requiredEssence));
  const alreadySpent = Math.max(0, Math.floor(currentBuildState.spentEssence));
  const remaining = Math.max(0, requiredEssence - alreadySpent);
  const spent = Math.max(0, Math.min(request, budget, remaining));

  if (spent < 1) {
    return {
      essence: budget,
      essenceLifetimeSpent: Math.max(0, Math.floor(options.essenceLifetimeSpent)),
      stopBuildStateByIndex: options.stopBuildStateByIndex,
      stopStatesByIndex: options.stopStatesByIndex,
      spent: 0,
    };
  }

  const nextSpentEssence = alreadySpent + spent;
  const nextBuildComplete = nextSpentEssence >= requiredEssence;

  const nextStopBuildStateByIndex = options.stopBuildStateByIndex.map((entry, index) => {
    if (index !== normalizedStopIndex) return entry;
    return {
      requiredEssence,
      spentEssence: nextSpentEssence,
      buildLevel: nextBuildComplete ? Math.max(1, entry.buildLevel) : entry.buildLevel,
    };
  });

  const nextStopStatesByIndex = options.stopStatesByIndex.map((entry, index) => {
    if (index !== normalizedStopIndex) return entry;
    return {
      ...currentStopState,
      buildComplete: nextBuildComplete,
      ...(nextBuildComplete && currentStopState.objectiveComplete ? { completedAtMs: Date.now() } : {}),
    };
  });

  return {
    essence: budget - spent,
    essenceLifetimeSpent: Math.max(0, Math.floor(options.essenceLifetimeSpent)) + spent,
    stopBuildStateByIndex: nextStopBuildStateByIndex,
    stopStatesByIndex: nextStopStatesByIndex,
    spent,
  };
}
