import type { IslandRunRuntimeState } from './islandRunRuntimeState';
import {
  resolveEscalatingThreshold,
  resolveNextRewardKind,
  resolveRewardBarClaimPayoutPreview,
  REWARD_KIND_ICON,
  type RewardBarRewardKind,
} from './islandRunContractV2RewardBar';

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
  runtimeState: Pick<IslandRunRuntimeState, 'activeTimedEvent' | 'rewardBarProgress' | 'rewardBarThreshold' | 'rewardBarEscalationTier' | 'rewardBarClaimCountInEvent'>;
  nowMs: number;
}): {
  activeTimedEvent: IslandRunRuntimeState['activeTimedEvent'];
  rewardBarProgress: number;
  rewardBarThreshold: number;
  rewardBarPercent: number;
  canClaimRewardBar: boolean;
  timedEventRemainingMs: number;
  nextRewardKind: RewardBarRewardKind;
  nextRewardIcon: string;
  nextRewardAmount: number;
} {
  const tier = Math.max(0, Math.floor(params.runtimeState.rewardBarEscalationTier));
  const rewardBarThreshold = resolveEscalatingThreshold(tier);
  const rewardBarProgress = Math.max(0, Math.floor(params.runtimeState.rewardBarProgress));
  const activeTimedEvent = params.runtimeState.activeTimedEvent;
  const timedEventRemainingMs = activeTimedEvent
    ? Math.max(0, activeTimedEvent.expiresAtMs - params.nowMs)
    : 0;
  const claimCount = Math.max(0, Math.floor(params.runtimeState.rewardBarClaimCountInEvent));
  const nextRewardKind = resolveNextRewardKind(claimCount);
  const nextRewardIcon = REWARD_KIND_ICON[nextRewardKind];
  const nextRewardPayout = resolveRewardBarClaimPayoutPreview({ state: params.runtimeState });
  const nextRewardAmount = (() => {
    switch (nextRewardPayout.rewardKind) {
      case 'dice':
        return nextRewardPayout.dice;
      case 'essence':
        return nextRewardPayout.essence;
      case 'minigame_tokens':
        return nextRewardPayout.minigameTokens;
      case 'sticker_fragments':
        return nextRewardPayout.stickerFragments;
    }
  })();

  return {
    activeTimedEvent,
    rewardBarProgress,
    rewardBarThreshold,
    rewardBarPercent: Math.min(100, (rewardBarProgress / rewardBarThreshold) * 100),
    canClaimRewardBar: params.islandRunContractV2Enabled && rewardBarProgress >= rewardBarThreshold,
    timedEventRemainingMs,
    nextRewardKind,
    nextRewardIcon,
    nextRewardAmount,
  };
}
