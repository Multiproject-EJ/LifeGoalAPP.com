import type { IslandRunRuntimeState } from './islandRunRuntimeState';

export function resolveIslandRunSpinTokenWalletLabel(islandRunContractV2Enabled: boolean): string {
  return islandRunContractV2Enabled ? 'Minigame tokens' : 'Spins';
}

export function formatIslandRunSpinTokenReward(params: {
  islandRunContractV2Enabled: boolean;
  amount: number;
}): string {
  const unit = params.islandRunContractV2Enabled ? 'token' : 'spin';
  const safeAmount = Math.max(0, Math.floor(params.amount));
  return `+${safeAmount} ${unit}${safeAmount === 1 ? '' : 's'}`;
}

export function resolveIslandRunContractV2RewardHudState(params: {
  islandRunContractV2Enabled: boolean;
  runtimeState: Pick<IslandRunRuntimeState, 'activeTimedEvent' | 'rewardBarProgress' | 'rewardBarThreshold'>;
  nowMs: number;
}): {
  activeTimedEvent: IslandRunRuntimeState['activeTimedEvent'];
  rewardBarProgress: number;
  rewardBarThreshold: number;
  rewardBarPercent: number;
  canClaimRewardBar: boolean;
  timedEventRemainingMs: number;
} {
  const rewardBarThreshold = Math.max(1, Math.floor(params.runtimeState.rewardBarThreshold));
  const rewardBarProgress = Math.max(0, Math.floor(params.runtimeState.rewardBarProgress));
  const activeTimedEvent = params.runtimeState.activeTimedEvent;
  const timedEventRemainingMs = activeTimedEvent
    ? Math.max(0, activeTimedEvent.expiresAtMs - params.nowMs)
    : 0;

  return {
    activeTimedEvent,
    rewardBarProgress,
    rewardBarThreshold,
    rewardBarPercent: Math.min(100, (rewardBarProgress / rewardBarThreshold) * 100),
    canClaimRewardBar: params.islandRunContractV2Enabled && rewardBarProgress >= rewardBarThreshold,
    timedEventRemainingMs,
  };
}

