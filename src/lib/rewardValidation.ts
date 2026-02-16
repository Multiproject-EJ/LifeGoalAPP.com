import type { RewardCategory, RewardCooldownType } from '../types/gamification';

export type RewardRiskBand = 'green' | 'yellow' | 'red';

export interface RewardGuardrailOption {
  id: 'add_cooldown' | 'raise_cost' | 'habit_pairing';
  label: string;
  helper: string;
}

export interface RewardValidationResult {
  score: number;
  band: RewardRiskBand;
  summary: string;
  reasons: string[];
  guardrails: RewardGuardrailOption[];
}

const HIGH_DOPAMINE_CATEGORIES: RewardCategory[] = ['Treat', 'Fun'];

export function evaluateRewardRisk(input: {
  title: string;
  description: string;
  costGold: number;
  category: RewardCategory;
  cooldownType: RewardCooldownType;
}): RewardValidationResult {
  let score = 0;
  const reasons: string[] = [];

  if (HIGH_DOPAMINE_CATEGORIES.includes(input.category) && input.costGold > 0 && input.costGold < 30) {
    score += 3;
    reasons.push('Low cost for a high-dopamine reward can lead to overuse.');
  }

  if (input.cooldownType === 'none') {
    score += 2;
    reasons.push('No cooldown means this can be redeemed repeatedly without friction.');
  }

  const combinedCopy = `${input.title} ${input.description}`.toLowerCase();
  if (input.category === 'Growth' && /(quick|instant|scroll|youtube|tiktok|snack)/.test(combinedCopy)) {
    score += 2;
    reasons.push('Growth rewards usually work better with a little structure and intention.');
  }

  if (score === 0) {
    reasons.push('Looks balanced for now. Keep it meaningful and motivating.');
  }

  const band: RewardRiskBand = score >= 6 ? 'red' : score >= 3 ? 'yellow' : 'green';

  const summary =
    band === 'red'
      ? 'High risk: add at least one guardrail before saving this reward.'
      : band === 'yellow'
        ? 'Medium risk: a small guardrail will keep this reward powerful.'
        : 'Low risk: this reward is ready.';

  const guardrails: RewardGuardrailOption[] = [];
  if (input.cooldownType === 'none') {
    guardrails.push({
      id: 'add_cooldown',
      label: 'Add 24h cooldown',
      helper: 'Keeps this reward special and prevents rapid repeats.',
    });
  }

  if (input.costGold > 0 && input.costGold < 50) {
    guardrails.push({
      id: 'raise_cost',
      label: 'Raise cost by 25%',
      helper: 'Improves effort-to-reward balance.',
    });
  }

  guardrails.push({
    id: 'habit_pairing',
    label: 'Pair with one completed habit',
    helper: 'Use this as a personal rule for stronger momentum.',
  });

  return {
    score,
    band,
    summary,
    reasons,
    guardrails,
  };
}
