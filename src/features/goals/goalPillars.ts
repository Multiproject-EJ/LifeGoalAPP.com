/**
 * Goal pillars — a single, explainable "goal strength" model.
 *
 * Every goal is scored 0–100 on three pillars the player already thinks in:
 *   1. Insight   — do I understand this goal? (why, life area, target, plan quality)
 *   2. Momentum  — am I actually marching? (steps, completion, recent effort)
 *   3. Support   — do my habits & environment carry it? (linked habits, env audit)
 *
 * Pure data/logic only — no React, no Supabase, no browser APIs — so it can be
 * unit-tested under a plain CommonJS tsc compile (see tsconfig.goal-pillar-tests.json).
 * It aggregates signals that already exist on the goal row and its relations;
 * it never invents new persisted state.
 */

import { goalStatusToCompletionPct, normalizeGoalStatus } from './goalStatus';

export type GoalPillarKey = 'insight' | 'momentum' | 'support';

export const GOAL_PILLAR_ORDER: GoalPillarKey[] = ['insight', 'momentum', 'support'];

export type GoalPillarMeta = {
  key: GoalPillarKey;
  label: string;
  icon: string;
  /** One-line question the pillar answers, in the player's language. */
  question: string;
};

export const GOAL_PILLAR_META: Record<GoalPillarKey, GoalPillarMeta> = {
  insight: {
    key: 'insight',
    label: 'Insight',
    icon: '🔮',
    question: 'Do you understand this goal?',
  },
  momentum: {
    key: 'momentum',
    label: 'Momentum',
    icon: '⚡',
    question: 'Are you marching toward it?',
  },
  support: {
    key: 'support',
    label: 'Support',
    icon: '🌿',
    question: 'Do habits & environment carry it?',
  },
};

// ---------------------------------------------------------------------------
// Inputs (structural, so the module stays dependency-light and testable)
// ---------------------------------------------------------------------------

export type GoalPillarGoalInput = {
  id: string;
  title: string;
  description: string | null;
  why_it_matters?: string | null;
  life_wheel_category: string | null;
  target_date: string | null;
  status_tag: string | null;
  progress_notes?: string | null;
  plan_quality_score?: number | null;
  environment_score?: number | null;
  environment_last_audited_at?: string | null;
};

export type GoalPillarStepInput = {
  completed: boolean;
};

export type GoalPillarHabitInput = {
  goal_id: string | null;
  domain_key: string | null;
  archived?: boolean | null;
  status?: string | null;
};

/** Matches GoalHealthResult.healthState from goalHealth.ts (kept structural). */
export type GoalPillarHealthState = 'on_track' | 'caution' | 'at_risk';

export type GoalPillarComputeInput = {
  goal: GoalPillarGoalInput;
  steps?: GoalPillarStepInput[];
  /** All of the player's habits; linked/domain matching happens here. */
  habits?: GoalPillarHabitInput[];
  /** Optional execution-health verdict (evaluateGoalHealthFromSignals). */
  healthState?: GoalPillarHealthState | null;
  /** Injectable clock for deterministic tests. */
  now?: Date;
};

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

export type GoalPillarLevel = 'low' | 'building' | 'strong';

export type GoalPillarScore = {
  key: GoalPillarKey;
  /** 0–100. */
  score: number;
  level: GoalPillarLevel;
  /** The single highest-impact action to raise this pillar, or null when full. */
  boost: string | null;
};

export type GoalPillarSet = {
  goalId: string;
  insight: GoalPillarScore;
  momentum: GoalPillarScore;
  support: GoalPillarScore;
  /** 0–100 mean of the three pillars. */
  overall: number;
  /** The pillar most worth attention right now. */
  weakest: GoalPillarKey;
};

export type GoalPillarTotals = {
  /** Number of goals aggregated (active, non-achieved). */
  goalCount: number;
  /** 0–100 averages; 0 when goalCount is 0. */
  insight: number;
  momentum: number;
  support: number;
  overall: number;
  weakest: GoalPillarKey;
};

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

const ENVIRONMENT_AUDIT_FRESH_DAYS = 45;

function hasText(value: string | null | undefined, minLength = 1): boolean {
  return Boolean(value && value.trim().length >= minLength);
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function levelOf(score: number): GoalPillarLevel {
  if (score >= 67) return 'strong';
  if (score >= 34) return 'building';
  return 'low';
}

function makeScore(key: GoalPillarKey, rawScore: number, boost: string | null): GoalPillarScore {
  const score = clampScore(rawScore);
  return { key, score, level: levelOf(score), boost: score >= 100 ? null : boost };
}

/**
 * Insight (0–100): why captured (35) + life area (20) + target date (20)
 * + plan quality (25, partial credit).
 */
function computeInsight(goal: GoalPillarGoalInput): GoalPillarScore {
  const whyCaptured = hasText(goal.why_it_matters, 12) || hasText(goal.description, 12);
  const hasLifeArea = hasText(goal.life_wheel_category);
  const hasTargetDate = hasText(goal.target_date) && !Number.isNaN(new Date(goal.target_date as string).valueOf());

  const planQuality = typeof goal.plan_quality_score === 'number' ? goal.plan_quality_score : 0;
  const planPoints = planQuality >= 4 ? 25 : planQuality === 3 ? 18 : planQuality >= 1 ? 8 : 0;

  const score = (whyCaptured ? 35 : 0) + (hasLifeArea ? 20 : 0) + (hasTargetDate ? 20 : 0) + planPoints;

  const boost = !whyCaptured
    ? 'Write one line on why this goal matters.'
    : !hasLifeArea
      ? 'Pick the life area this goal belongs to.'
      : !hasTargetDate
        ? 'Set a target or review date.'
        : 'Sharpen the outcome and how you will measure it.';

  return makeScore('insight', score, boost);
}

/**
 * Momentum (0–100): a step plan exists (20) + completion progress (0–40)
 * + recent effort (0–40, from execution health or progress notes).
 */
function computeMomentum(
  goal: GoalPillarGoalInput,
  steps: GoalPillarStepInput[],
  healthState: GoalPillarHealthState | null,
): GoalPillarScore {
  const hasPlan = steps.length > 0;

  const completionPct = hasPlan
    ? (steps.filter((step) => step.completed).length / steps.length) * 100
    : goalStatusToCompletionPct(goal.status_tag);
  const progressPoints = (completionPct / 100) * 40;

  let effortPoints = 0;
  if (healthState === 'on_track') effortPoints = 40;
  else if (healthState === 'caution') effortPoints = 22;
  else if (healthState === 'at_risk') effortPoints = 8;
  else if (hasText(goal.progress_notes)) effortPoints = 20;

  const score = (hasPlan ? 20 : 0) + progressPoints + effortPoints;

  const boost = !hasPlan
    ? 'Break the goal into two or three first steps.'
    : effortPoints < 22
      ? 'Log one small effort this week.'
      : 'Complete the next step on your plan.';

  return makeScore('momentum', score, boost);
}

/**
 * Support (0–100): linked habits (0–40, partial credit for same-life-area
 * habits) + environment score (0–40) + audit freshness (0–20).
 */
function computeSupport(
  goal: GoalPillarGoalInput,
  habits: GoalPillarHabitInput[],
  now: Date,
): GoalPillarScore {
  const activeHabits = habits.filter(
    (habit) => habit.archived !== true && habit.status !== 'archived' && habit.status !== 'deactivated',
  );
  const linkedCount = activeHabits.filter((habit) => habit.goal_id === goal.id).length;
  const domainCount = goal.life_wheel_category
    ? activeHabits.filter(
        (habit) => habit.goal_id !== goal.id && habit.domain_key === goal.life_wheel_category,
      ).length
    : 0;

  const habitPoints =
    linkedCount >= 3 ? 40 : linkedCount === 2 ? 33 : linkedCount === 1 ? 25 : domainCount > 0 ? 12 : 0;

  const environmentScore = typeof goal.environment_score === 'number' ? goal.environment_score : null;
  const environmentPoints = environmentScore === null ? 0 : (Math.max(0, Math.min(5, environmentScore)) / 5) * 40;

  let freshnessPoints = 0;
  if (goal.environment_last_audited_at) {
    const auditedAt = new Date(goal.environment_last_audited_at).valueOf();
    if (!Number.isNaN(auditedAt)) {
      const ageDays = (now.valueOf() - auditedAt) / (1000 * 60 * 60 * 24);
      freshnessPoints = ageDays <= ENVIRONMENT_AUDIT_FRESH_DAYS ? 20 : 10;
    }
  }

  const score = habitPoints + environmentPoints + freshnessPoints;

  const boost =
    linkedCount === 0
      ? 'Link one small supporting habit to this goal.'
      : environmentScore === null
        ? 'Run the environment audit for this goal.'
        : freshnessPoints < 20
          ? 'Refresh the environment audit — it has gone stale.'
          : 'Add one more supporting habit or tighten a cue.';

  return makeScore('support', score, boost);
}

function weakestOf(insight: GoalPillarScore, momentum: GoalPillarScore, support: GoalPillarScore): GoalPillarKey {
  // Priority order on ties: insight → momentum → support (clarity comes first).
  let weakest: GoalPillarScore = insight;
  if (momentum.score < weakest.score) weakest = momentum;
  if (support.score < weakest.score) weakest = support;
  return weakest.key;
}

/** Score one goal across the three pillars. */
export function computeGoalPillars(input: GoalPillarComputeInput): GoalPillarSet {
  const now = input.now ?? new Date();
  const insight = computeInsight(input.goal);
  const momentum = computeMomentum(input.goal, input.steps ?? [], input.healthState ?? null);
  const support = computeSupport(input.goal, input.habits ?? [], now);

  return {
    goalId: input.goal.id,
    insight,
    momentum,
    support,
    overall: clampScore((insight.score + momentum.score + support.score) / 3),
    weakest: weakestOf(insight, momentum, support),
  };
}

/**
 * Aggregate pillar totals across goals. Achieved goals are excluded — totals
 * describe the quests the player is still carrying.
 */
export function computeGoalPillarTotals(
  inputs: GoalPillarComputeInput[],
): GoalPillarTotals {
  const active = inputs.filter((input) => normalizeGoalStatus(input.goal.status_tag) !== 'achieved');
  if (active.length === 0) {
    return { goalCount: 0, insight: 0, momentum: 0, support: 0, overall: 0, weakest: 'insight' };
  }

  const sets = active.map((input) => computeGoalPillars(input));
  const average = (select: (set: GoalPillarSet) => number) =>
    clampScore(sets.reduce((sum, set) => sum + select(set), 0) / sets.length);

  const insight = average((set) => set.insight.score);
  const momentum = average((set) => set.momentum.score);
  const support = average((set) => set.support.score);

  const weakest: GoalPillarKey =
    momentum < insight && momentum <= support ? 'momentum' : support < insight ? 'support' : 'insight';

  return {
    goalCount: active.length,
    insight,
    momentum,
    support,
    overall: clampScore((insight + momentum + support) / 3),
    weakest,
  };
}
