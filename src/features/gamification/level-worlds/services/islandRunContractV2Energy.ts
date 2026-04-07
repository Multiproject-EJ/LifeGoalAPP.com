export type IslandRunRollButtonMode = 'rolling' | 'step1' | 'roll' | 'convert' | 'no_dice';

export function resolveIslandRunRollButtonMode(params: {
  islandRunContractV2Enabled: boolean;
  isRolling: boolean;
  step1Complete: boolean;
  dicePool: number;
  dicePerRoll: number;
}): IslandRunRollButtonMode {
  const {
    islandRunContractV2Enabled,
    isRolling,
    step1Complete,
    dicePool,
    dicePerRoll,
  } = params;

  if (isRolling) return 'rolling';
  if (!step1Complete) return 'step1';
  if (dicePool >= dicePerRoll) return 'roll';
  return islandRunContractV2Enabled ? 'no_dice' : 'convert';
}

export function isIslandRunRollEnergyDepleted(params: {
  islandRunContractV2Enabled: boolean;
  dicePool: number;
  hearts: number;
  dicePerRoll: number;
}): boolean {
  const {
    islandRunContractV2Enabled,
    dicePool,
    hearts,
    dicePerRoll,
  } = params;

  if (islandRunContractV2Enabled) {
    return dicePool < dicePerRoll;
  }

  return dicePool < dicePerRoll && hearts < 1;
}

export function shouldConsumeHeartOnBossFailure(islandRunContractV2Enabled: boolean): boolean {
  return !islandRunContractV2Enabled;
}

export function canRetryBossTrial(params: {
  islandRunContractV2Enabled: boolean;
  hearts: number;
}): boolean {
  if (params.islandRunContractV2Enabled) return true;
  return params.hearts > 0;
}

export function resolveIslandRunTimerLabel(params: {
  islandRunContractV2Enabled: boolean;
  isIslandTimerPendingStart: boolean;
}): string {
  if (params.islandRunContractV2Enabled) return 'Timer:';
  return params.isIslandTimerPendingStart ? 'Ready:' : 'Ends in:';
}

export function canUseSpinForMovement(islandRunContractV2Enabled: boolean): boolean {
  return !islandRunContractV2Enabled;
}
