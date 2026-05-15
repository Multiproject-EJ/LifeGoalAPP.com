export type VisionQuestRewardContext = 'default' | 'island_run_landmark';

export interface VisionQuestRewardAmounts {
  coins: number;
  dice: number;
  tokens: number;
}

export interface VisionQuestRewardRouting {
  completionRewards: VisionQuestRewardAmounts;
  legacyRewards: VisionQuestRewardAmounts;
}

export function resolveVisionQuestRewardRouting(options: {
  rewards: VisionQuestRewardAmounts;
  rewardContext: VisionQuestRewardContext;
}): VisionQuestRewardRouting {
  if (options.rewardContext === 'island_run_landmark') {
    return {
      completionRewards: {
        coins: 0,
        dice: options.rewards.dice,
        tokens: 0,
      },
      legacyRewards: {
        coins: 0,
        dice: 0,
        tokens: 0,
      },
    };
  }

  return {
    completionRewards: options.rewards,
    legacyRewards: options.rewards,
  };
}
