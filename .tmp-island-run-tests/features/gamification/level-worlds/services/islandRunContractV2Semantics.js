"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveIslandRunSpinTokenWalletLabel = resolveIslandRunSpinTokenWalletLabel;
exports.formatIslandRunSpinTokenReward = formatIslandRunSpinTokenReward;
exports.resolveIslandRunContractV2RewardHudState = resolveIslandRunContractV2RewardHudState;
const islandRunContractV2RewardBar_1 = require("./islandRunContractV2RewardBar");
function resolveIslandRunSpinTokenWalletLabel(islandRunContractV2Enabled) {
    return islandRunContractV2Enabled ? 'Minigame tokens' : 'Spins';
}
function formatIslandRunSpinTokenReward(params) {
    const unit = params.islandRunContractV2Enabled ? 'token' : 'spin';
    const safeAmount = Math.max(0, Math.floor(params.amount));
    return `+${safeAmount} ${unit}${safeAmount === 1 ? '' : 's'}`;
}
function resolveIslandRunContractV2RewardHudState(params) {
    const tier = Math.max(0, Math.floor(params.runtimeState.rewardBarEscalationTier));
    const rewardBarThreshold = (0, islandRunContractV2RewardBar_1.resolveEscalatingThreshold)(tier);
    const rewardBarProgress = Math.max(0, Math.floor(params.runtimeState.rewardBarProgress));
    const activeTimedEvent = params.runtimeState.activeTimedEvent;
    const timedEventRemainingMs = activeTimedEvent
        ? Math.max(0, activeTimedEvent.expiresAtMs - params.nowMs)
        : 0;
    const claimCount = Math.max(0, Math.floor(params.runtimeState.rewardBarClaimCountInEvent));
    const nextRewardKind = (0, islandRunContractV2RewardBar_1.resolveNextRewardKind)(claimCount);
    const nextRewardIcon = islandRunContractV2RewardBar_1.REWARD_KIND_ICON[nextRewardKind];
    return {
        activeTimedEvent,
        rewardBarProgress,
        rewardBarThreshold,
        rewardBarPercent: Math.min(100, (rewardBarProgress / rewardBarThreshold) * 100),
        canClaimRewardBar: params.islandRunContractV2Enabled && rewardBarProgress >= rewardBarThreshold,
        timedEventRemainingMs,
        nextRewardKind,
        nextRewardIcon,
    };
}
