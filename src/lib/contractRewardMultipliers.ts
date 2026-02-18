export type ContractRewardTier = {
  minStreak: number;
  multiplier: number;
  label: string;
};

const CONTRACT_REWARD_TIERS: ContractRewardTier[] = [
  { minStreak: 8, multiplier: 2, label: 'Momentum legend' },
  { minStreak: 5, multiplier: 1.5, label: 'Consistency streak' },
  { minStreak: 3, multiplier: 1.25, label: 'Momentum builder' },
  { minStreak: 0, multiplier: 1, label: 'Base payout' },
];

export function getContractRewardTier(successStreak: number): ContractRewardTier {
  const normalizedStreak = Math.max(0, Math.floor(successStreak));
  return CONTRACT_REWARD_TIERS.find((tier) => normalizedStreak >= tier.minStreak) ?? CONTRACT_REWARD_TIERS[CONTRACT_REWARD_TIERS.length - 1];
}

export function getContractRewardMultiplier(successStreak: number): number {
  return getContractRewardTier(successStreak).multiplier;
}

export function getNextContractRewardTier(successStreak: number): ContractRewardTier | null {
  const normalizedStreak = Math.max(0, Math.floor(successStreak));
  const orderedTiers = CONTRACT_REWARD_TIERS.slice().sort((a, b) => a.minStreak - b.minStreak);

  for (const tier of orderedTiers) {
    if (tier.minStreak > normalizedStreak) {
      return tier;
    }
  }

  return null;
}

export function getSuccessStreakFromEvaluations(
  evaluations: Array<{ result: 'success' | 'miss'; evaluatedAt: string }>,
): number {
  const sorted = evaluations
    .slice()
    .sort((a, b) => new Date(a.evaluatedAt).getTime() - new Date(b.evaluatedAt).getTime());

  let streak = 0;
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    if (sorted[index].result !== 'success') {
      break;
    }
    streak += 1;
  }

  return streak;
}
