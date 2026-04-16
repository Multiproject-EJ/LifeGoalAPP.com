export type IslandRunRollButtonMode = 'rolling' | 'roll' | 'no_dice';

export function resolveIslandRunRollButtonMode(params: {
  isRolling: boolean;
  dicePool: number;
  dicePerRoll: number;
}): IslandRunRollButtonMode {
  const { isRolling, dicePool, dicePerRoll } = params;

  if (isRolling) return 'rolling';
  if (dicePool >= dicePerRoll) return 'roll';
  return 'no_dice';
}

export function isIslandRunRollEnergyDepleted(params: {
  dicePool: number;
  dicePerRoll: number;
}): boolean {
  return params.dicePool < params.dicePerRoll;
}

export function canRetryBossTrial(): boolean {
  return true;
}

export function resolveIslandRunTimerLabel(): string {
  return 'Timer:';
}
