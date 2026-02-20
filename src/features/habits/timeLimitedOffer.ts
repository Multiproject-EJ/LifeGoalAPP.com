import type { HabitHealthState } from './habitHealth';

type HabitLike = {
  id: string;
  name: string;
};

type CompletionLike = {
  completed?: boolean;
};

type AdherenceLike = {
  percentage?: number;
};

const RISK_SCORE_BY_STATE: Record<HabitHealthState, number> = {
  in_review: 0,
  stalled: 3,
  at_risk: 2,
  active: 1,
};

const DEFAULT_HABIT_REWARD_MIN = 5;
const DEFAULT_HABIT_REWARD_MAX = 85;

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Computes a dynamic default habit reward.
 * Lower adherence / weaker streaks / riskier health states produce higher rewards.
 */
export function getDefaultHabitRewardGold(params: {
  healthState: HabitHealthState | undefined;
  adherencePercentage: number | null | undefined;
  currentStreak: number | null | undefined;
}): number {
  const state = params.healthState ?? 'active';
  const adherenceRisk = 1 - clamp01((params.adherencePercentage ?? 100) / 100);
  const streakRisk = 1 - clamp01((params.currentStreak ?? 0) / 14);

  const stateRisk =
    state === 'stalled' ? 1 :
    state === 'at_risk' ? 0.75 :
    state === 'in_review' ? 0.6 :
    0.35;

  const combinedRisk = clamp01((stateRisk * 0.5) + (adherenceRisk * 0.35) + (streakRisk * 0.15));
  const scaledReward =
    DEFAULT_HABIT_REWARD_MIN +
    (DEFAULT_HABIT_REWARD_MAX - DEFAULT_HABIT_REWARD_MIN) * combinedRisk;

  return Math.round(Math.min(DEFAULT_HABIT_REWARD_MAX, Math.max(DEFAULT_HABIT_REWARD_MIN, scaledReward)));
}

export function rankHabitsForTimeLimitedOffer<T extends HabitLike>(params: {
  habits: T[];
  completionsByHabitId: Record<string, CompletionLike | undefined>;
  healthStateByHabitId: Record<string, HabitHealthState | undefined>;
  adherenceByHabitId: Record<string, AdherenceLike | undefined>;
}): T[] {
  const {
    habits,
    completionsByHabitId,
    healthStateByHabitId,
    adherenceByHabitId,
  } = params;

  return habits
    .filter((habit) => !completionsByHabitId[habit.id]?.completed)
    .filter((habit) => (healthStateByHabitId[habit.id] ?? 'active') !== 'in_review')
    .sort((a, b) => {
      const aState = healthStateByHabitId[a.id] ?? 'active';
      const bState = healthStateByHabitId[b.id] ?? 'active';
      const scoreDelta = RISK_SCORE_BY_STATE[bState] - RISK_SCORE_BY_STATE[aState];
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      const aAdherence = (adherenceByHabitId[a.id]?.percentage ?? 100) / 100;
      const bAdherence = (adherenceByHabitId[b.id]?.percentage ?? 100) / 100;
      if (aAdherence !== bAdherence) {
        return aAdherence - bAdherence;
      }

      return a.name.localeCompare(b.name);
    });
}

export function isEligibleTimeLimitedOfferHabit(params: {
  habitId: string | null | undefined;
  completionsByHabitId: Record<string, CompletionLike | undefined>;
  healthStateByHabitId: Record<string, HabitHealthState | undefined>;
  habitIds: Set<string>;
}): boolean {
  const { habitId, completionsByHabitId, healthStateByHabitId, habitIds } = params;
  if (!habitId || !habitIds.has(habitId)) {
    return false;
  }

  if (completionsByHabitId[habitId]?.completed) {
    return false;
  }

  const healthState = healthStateByHabitId[habitId] ?? 'active';
  return healthState !== 'in_review';
}
