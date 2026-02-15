export type HabitHealthState = 'active' | 'at_risk' | 'stalled' | 'in_review';

export type HabitHealthAssessment = {
  state: HabitHealthState;
  daysSinceCompletion: number | null;
  reviewDueAt: string | null;
  rationale: string;
};

export const HABIT_HEALTH_THRESHOLDS = {
  atRiskAdherence7: 40,
  stalledDaysWithoutCompletion: 14,
  inReviewDaysWithoutCompletion: 30,
} as const;

function differenceInDays(referenceISO: string, earlierISO: string): number {
  const reference = new Date(`${referenceISO}T12:00:00.000Z`);
  const earlier = new Date(`${earlierISO}T12:00:00.000Z`);
  const deltaMs = reference.getTime() - earlier.getTime();

  if (Number.isNaN(deltaMs)) {
    return 0;
  }

  return Math.max(0, Math.floor(deltaMs / (24 * 60 * 60 * 1000)));
}

function addDays(isoDate: string, days: number): string {
  const start = new Date(`${isoDate}T12:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() + days);
  return start.toISOString().slice(0, 10);
}

export function assessHabitHealth(params: {
  adherence7: { scheduledCount: number; percentage: number } | null;
  lastCompletedOn: string | null;
  referenceDateISO: string;
}): HabitHealthAssessment {
  const { adherence7, lastCompletedOn, referenceDateISO } = params;
  const daysSinceCompletion = lastCompletedOn
    ? differenceInDays(referenceDateISO, lastCompletedOn)
    : null;

  if (daysSinceCompletion !== null && daysSinceCompletion >= HABIT_HEALTH_THRESHOLDS.inReviewDaysWithoutCompletion) {
    return {
      state: 'in_review',
      daysSinceCompletion,
      reviewDueAt: lastCompletedOn
        ? addDays(lastCompletedOn, HABIT_HEALTH_THRESHOLDS.inReviewDaysWithoutCompletion)
        : null,
      rationale: `No completion for ${daysSinceCompletion} days. Habit needs a review decision.`,
    };
  }

  if (daysSinceCompletion !== null && daysSinceCompletion >= HABIT_HEALTH_THRESHOLDS.stalledDaysWithoutCompletion) {
    return {
      state: 'stalled',
      daysSinceCompletion,
      reviewDueAt: null,
      rationale: `No completion for ${daysSinceCompletion} days. Habit momentum has stalled.`,
    };
  }

  if (
    adherence7 &&
    adherence7.scheduledCount > 0 &&
    adherence7.percentage < HABIT_HEALTH_THRESHOLDS.atRiskAdherence7
  ) {
    return {
      state: 'at_risk',
      daysSinceCompletion,
      reviewDueAt: null,
      rationale: `7-day adherence is ${adherence7.percentage}% (below ${HABIT_HEALTH_THRESHOLDS.atRiskAdherence7}%).`,
    };
  }

  return {
    state: 'active',
    daysSinceCompletion,
    reviewDueAt: null,
    rationale: 'Habit is currently active and not in a risk bucket.',
  };
}

export function getHabitHealthBadgeLabel(state: HabitHealthState): string {
  switch (state) {
    case 'at_risk':
      return 'At risk';
    case 'stalled':
      return 'Stalled';
    case 'in_review':
      return 'Needs review';
    case 'active':
    default:
      return 'Active';
  }
}
