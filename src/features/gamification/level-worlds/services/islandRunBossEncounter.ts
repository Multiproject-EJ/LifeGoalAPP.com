import { isStopBuildFullyComplete, type IslandRunContractV2BuildState } from './islandRunContractV2EssenceBuild';

export const BOSS_STOP_INDEX = 4;
export const BOSS_ARENA_NOT_BUILT_REASON = 'Build the Boss Arena to Level 3 to awaken the boss.';
export const BOSS_ALREADY_DEFEATED_REASON = 'Boss already defeated for this island.';

export type BossCreatureArtState = 'hidden' | 'alive' | 'defeated';

type BossBuildStateInput = {
  stopBuildStateByIndex: Array<IslandRunContractV2BuildState | null | undefined>;
  bossStopIndex?: number;
};

export function isBossArenaFullyBuilt(input: BossBuildStateInput): boolean {
  const bossStopIndex = Math.max(0, Math.floor(input.bossStopIndex ?? BOSS_STOP_INDEX));
  const bossBuildState = input.stopBuildStateByIndex[bossStopIndex];
  return bossBuildState != null && isStopBuildFullyComplete(bossBuildState);
}

export function resolveBossCreatureArtState(input: BossBuildStateInput & {
  isBossDefeated: boolean;
}): BossCreatureArtState {
  if (!isBossArenaFullyBuilt(input)) return 'hidden';
  return input.isBossDefeated ? 'defeated' : 'alive';
}

export function canChallengeBoss(input: BossBuildStateInput & {
  isBossDefeated: boolean;
}): boolean {
  return isBossArenaFullyBuilt(input) && !input.isBossDefeated;
}

export function getBossChallengeLockReason(input: BossBuildStateInput & {
  isBossDefeated: boolean;
}): string | null {
  if (input.isBossDefeated) return BOSS_ALREADY_DEFEATED_REASON;
  if (!isBossArenaFullyBuilt(input)) return BOSS_ARENA_NOT_BUILT_REASON;
  return null;
}
