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

export const ISLAND_RUN_CONTRACT_V2_ESSENCE_EARN_BY_TILE: Readonly<Record<string, number>> = {
  currency: 2,
  chest: 4,
  egg_shard: 3,
  event: 3,
  hazard: 1,
  micro: 2,
};

export function resolveIslandRunContractV2EssenceEarnForTile(tileType: string): number {
  return ISLAND_RUN_CONTRACT_V2_ESSENCE_EARN_BY_TILE[tileType] ?? 0;
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
