import type { GoalHealthState, GoalRecommendedAction, GoalRiskReason } from './executionTypes';

export type GoalHealthInput = {
  effortEventsLast14Days: number;
  outcomeUpdatesLast14Days: number;
  frictionTagsLast14Days?: string[] | null;
  planQualityScore: number | null | undefined;
  targetDate?: string | null;
};

export type GoalHealthResult = {
  healthState: GoalHealthState;
  primaryRiskReason: GoalRiskReason;
  recommendedNextAction: GoalRecommendedAction;
  explainSignals: string[];
};

const HIGH_EFFORT_THRESHOLD = 6;
const LOW_EFFORT_THRESHOLD = 2;

function normalizeFrictionTags(tags: string[] | null | undefined): string[] {
  if (!tags) {
    return [];
  }

  return tags
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0);
}

function hasHeavyFriction(tags: string[]): boolean {
  const heavy = new Set(['stuck', 'unclear', 'overwhelmed']);
  return tags.some((tag) => heavy.has(tag));
}

function getDaysUntilTarget(targetDate: string | null | undefined): number | null {
  if (!targetDate) {
    return null;
  }

  const targetTime = new Date(targetDate).valueOf();
  if (!Number.isFinite(targetTime)) {
    return null;
  }

  const msUntilTarget = targetTime - Date.now();
  return Math.ceil(msUntilTarget / (1000 * 60 * 60 * 24));
}

/**
 * Lightweight deterministic execution-health evaluator.
 * Ordering is intentionally explicit so the top-priority risk wins.
 */
export function computeGoalHealth(input: GoalHealthInput): GoalHealthResult {
  const effortEvents = Math.max(0, Math.floor(input.effortEventsLast14Days));
  const outcomeUpdates = Math.max(0, Math.floor(input.outcomeUpdatesLast14Days));
  const planQualityScore = typeof input.planQualityScore === 'number' ? input.planQualityScore : null;
  const frictionTags = normalizeFrictionTags(input.frictionTagsLast14Days);
  const frictionHeavy = hasHeavyFriction(frictionTags);
  const daysUntilTarget = getDaysUntilTarget(input.targetDate);

  const explainSignals: string[] = [
    `effort_14d:${effortEvents}`,
    `outcomes_14d:${outcomeUpdates}`,
    `plan_quality:${planQualityScore ?? 'unknown'}`,
    `days_until_target:${daysUntilTarget ?? 'unknown'}`,
  ];

  if (frictionTags.length > 0) {
    explainSignals.push(`friction_tags:${frictionTags.join(',')}`);
  }

  if (effortEvents === 0) {
    explainSignals.push('rule:no_effort_events_after_goal_creation');
    return {
      healthState: 'at_risk',
      primaryRiskReason: 'activation_risk',
      recommendedNextAction: 'switch_to_planning_habit',
      explainSignals,
    };
  }

  if (planQualityScore !== null && planQualityScore <= 2) {
    explainSignals.push('rule:plan_quality_low');
    return {
      healthState: effortEvents <= LOW_EFFORT_THRESHOLD ? 'at_risk' : 'caution',
      primaryRiskReason: 'under_defined_goal',
      recommendedNextAction: 'clarify_success_metric',
      explainSignals,
    };
  }

  if (daysUntilTarget !== null && daysUntilTarget <= 2 && outcomeUpdates === 0) {
    explainSignals.push('rule:near_deadline_without_outcome');
    return {
      healthState: 'at_risk',
      primaryRiskReason: 'strategy_mismatch',
      recommendedNextAction: 'scale_scope',
      explainSignals,
    };
  }

  if (effortEvents >= HIGH_EFFORT_THRESHOLD && outcomeUpdates === 0) {
    explainSignals.push('rule:high_effort_flat_outcome');
    return {
      healthState: frictionHeavy ? 'at_risk' : 'caution',
      primaryRiskReason: 'strategy_mismatch',
      recommendedNextAction: 'scale_scope',
      explainSignals,
    };
  }

  if (effortEvents <= LOW_EFFORT_THRESHOLD && outcomeUpdates === 0) {
    const isLongHorizon = daysUntilTarget !== null && daysUntilTarget >= 180;
    explainSignals.push(isLongHorizon ? 'rule:low_effort_flat_outcome_long_horizon' : 'rule:low_effort_flat_outcome');

    if (isLongHorizon) {
      return {
        healthState: frictionHeavy ? 'at_risk' : 'caution',
        primaryRiskReason: 'overload_or_low_priority',
        recommendedNextAction: 'defer_priority',
        explainSignals,
      };
    }

    return {
      healthState: 'at_risk',
      primaryRiskReason: 'overload_or_low_priority',
      recommendedNextAction: frictionHeavy ? 'defer_priority' : 'reduce_workload',
      explainSignals,
    };
  }

  if (frictionHeavy) {
    explainSignals.push('rule:friction_tag_nudge');
    return {
      healthState: 'caution',
      primaryRiskReason: 'overload_or_low_priority',
      recommendedNextAction: 'reduce_workload',
      explainSignals,
    };
  }

  explainSignals.push('rule:on_track');
  return {
    healthState: 'on_track',
    primaryRiskReason: 'none',
    recommendedNextAction: 'keep_plan',
    explainSignals,
  };
}
