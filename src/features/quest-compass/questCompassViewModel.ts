import { QUEST_COMPASS_FORCES, type QuestCompassForceKey } from './questCompassForces';

export type QuestCompassTrend = 'rising' | 'steady' | 'falling';

type LifeWheelCategoryKey =
  | 'spirituality_community'
  | 'finance_wealth'
  | 'love_relations'
  | 'fun_creativity'
  | 'career_development'
  | 'health_fitness'
  | 'family_friends'
  | 'living_spaces';

type QuestCompassGoalInput = {
  id: string;
  title: string;
  status_tag: string | null;
  life_wheel_category: string | null;
  progress_notes?: string | null;
};

type QuestCompassHabitInput = {
  id: string;
  title: string;
  emoji?: string | null;
  domain_key: string | null;
  goal_id: string | null;
};

type QuestCompassHabitLogInput = {
  habit_id: string;
  done: boolean;
  progress_state?: string | null;
  completion_percentage?: number | null;
};

type QuestCompassGoalStepInput = {
  goal_id: string;
  title: string;
  completed: boolean;
  step_order: number;
};

type QuestCompassQuestHabitInput = {
  habitId: string;
  title: string;
  emoji: string | null;
};

type QuestCompassCheckinInput = {
  date: string | null;
  scores: unknown;
};

export type QuestCompassForceScore = {
  key: QuestCompassForceKey;
  name: string;
  icon: string;
  summary: string;
  description: string[];
  prompt: string;
  score: number | null;
  scoreLabel: string;
  trend: QuestCompassTrend;
  trendLabel: string;
  healthStatus: QuestCompassHealthStatus;
  healthLabel: string;
  contributingCategories: QuestCompassContributingCategory[];
};

export type QuestCompassContributingCategory = {
  key: LifeWheelCategoryKey;
  label: string;
  score: number | null;
  scoreLabel: string;
};

export type QuestCompassHealthStatus =
  | 'thriving'
  | 'healthy'
  | 'needs_attention'
  | 'needs_care'
  | 'no_signal';

export type QuestCompassRelatedGoal = {
  id: string;
  title: string;
  statusLabel: string;
  progressLabel: string | null;
};

export type QuestCompassSupportingHabit = {
  id: string;
  title: string;
  emoji: string | null;
  completionLabel: string;
};

export type QuestCompassRecommendedActionType =
  | 'goal_step'
  | 'quest_habit'
  | 'starter_quest'
  | 'refresh_alignment';

export type QuestCompassRecommendedAction = {
  type: QuestCompassRecommendedActionType;
  label: string;
  title: string;
  description: string;
  categoryKey: LifeWheelCategoryKey | null;
};

export type QuestCompassForceDetail = {
  force: QuestCompassForceScore;
  relatedGoals: QuestCompassRelatedGoal[];
  supportingHabits: QuestCompassSupportingHabit[];
  recommendedAction: QuestCompassRecommendedAction;
};

export type QuestCompassViewModel = {
  hasCheckinData: boolean;
  latestCheckinDate: string | null;
  latestCheckinDateLabel: string | null;
  strongestForce: QuestCompassForceScore | null;
  focusForce: QuestCompassForceScore | null;
  forces: QuestCompassForceScore[];
  summary: string;
};

const LIFE_WHEEL_CATEGORY_LABELS: Record<LifeWheelCategoryKey, string> = {
  spirituality_community: 'Mind & Meaning',
  finance_wealth: 'Money',
  love_relations: 'Love',
  fun_creativity: 'Joy & Play',
  career_development: 'Work & Growth',
  health_fitness: 'Body & Energy',
  family_friends: 'Connections',
  living_spaces: 'Home',
};

const FORCE_CATEGORY_MAP: Record<QuestCompassForceKey, LifeWheelCategoryKey[]> = {
  fire: ['fun_creativity'],
  strength: ['health_fitness', 'living_spaces'],
  connection: ['love_relations', 'family_friends'],
  wealth: ['finance_wealth'],
  growth: ['career_development'],
  direction: ['spirituality_community'],
};

const STARTER_RECOMMENDATIONS: Record<LifeWheelCategoryKey, string> = {
  spirituality_community: 'Night journal check-in',
  finance_wealth: 'Clear one admin pebble',
  love_relations: 'Send one warm message',
  fun_creativity: 'Add one moment of creative play',
  career_development: 'Choose one must-win task',
  health_fitness: 'Walk in the sunshine before breakfast',
  family_friends: 'Reach out to one person',
  living_spaces: 'Clear one visible surface',
};

const TREND_THRESHOLD = 0.5;

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(10, Math.max(0, value));
}

function roundScore(value: number): number {
  return Number(value.toFixed(1));
}

function parseScores(scores: unknown): Partial<Record<LifeWheelCategoryKey, number>> | null {
  if (!scores || typeof scores !== 'object' || Array.isArray(scores)) {
    return null;
  }

  const record = scores as Record<string, unknown>;
  const parsed: Partial<Record<LifeWheelCategoryKey, number>> = {};
  let hasScore = false;

  for (const key of Object.keys(LIFE_WHEEL_CATEGORY_LABELS) as LifeWheelCategoryKey[]) {
    const value = record[key];
    if (typeof value !== 'number' || Number.isNaN(value)) continue;
    parsed[key] = clampScore(value);
    hasScore = true;
  }

  return hasScore ? parsed : null;
}

function scoreForce(
  forceKey: QuestCompassForceKey,
  scores: Partial<Record<LifeWheelCategoryKey, number>>,
): number | null {
  const values = FORCE_CATEGORY_MAP[forceKey]
    .map((categoryKey) => scores[categoryKey])
    .filter((value): value is number => typeof value === 'number');

  if (values.length === 0) return null;
  return roundScore(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function formatScoreLabel(value: number | null): string {
  return value === null ? 'No signal' : `${value}/10`;
}

function getHealthStatus(score: number | null): QuestCompassHealthStatus {
  if (score === null) return 'no_signal';
  if (score >= 8) return 'thriving';
  if (score >= 6) return 'healthy';
  if (score >= 4) return 'needs_attention';
  return 'needs_care';
}

function getHealthLabel(status: QuestCompassHealthStatus): string {
  switch (status) {
    case 'thriving':
      return 'Thriving';
    case 'healthy':
      return 'Healthy';
    case 'needs_attention':
      return 'Needs Attention';
    case 'needs_care':
      return 'Needs Care';
    case 'no_signal':
      return 'No Signal';
  }
}

function compareTrend(latest: number | null, previous: number | null): QuestCompassTrend {
  if (latest === null || previous === null) return 'steady';
  const delta = latest - previous;
  if (delta >= TREND_THRESHOLD) return 'rising';
  if (delta <= -TREND_THRESHOLD) return 'falling';
  return 'steady';
}

function formatDateLabel(dateIso: string | null): string | null {
  if (!dateIso) return null;
  const parsed = new Date(dateIso);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function findStrongest(forces: QuestCompassForceScore[]): QuestCompassForceScore | null {
  return forces.reduce<QuestCompassForceScore | null>((best, force) => {
    if (force.score === null) return best;
    if (!best || best.score === null || force.score > best.score) return force;
    return best;
  }, null);
}

function findFocus(forces: QuestCompassForceScore[]): QuestCompassForceScore | null {
  return forces.reduce<QuestCompassForceScore | null>((best, force) => {
    if (force.score === null) return best;
    if (!best || best.score === null || force.score < best.score) return force;
    return best;
  }, null);
}

export function buildQuestCompassViewModel(
  checkins: QuestCompassCheckinInput[],
): QuestCompassViewModel {
  const sortedCheckins = [...checkins].sort((a, b) => {
    const dateA = a.date ? Date.parse(a.date) : 0;
    const dateB = b.date ? Date.parse(b.date) : 0;
    return dateB - dateA;
  });
  const latestCheckin = sortedCheckins.find((checkin) => parseScores(checkin.scores)) ?? null;
  const latestScores = latestCheckin ? parseScores(latestCheckin.scores) : null;
  const previousCheckin = latestCheckin
    ? sortedCheckins.find((checkin) => checkin !== latestCheckin && parseScores(checkin.scores))
    : null;
  const previousScores = previousCheckin ? parseScores(previousCheckin.scores) : null;

  const forces = QUEST_COMPASS_FORCES.map<QuestCompassForceScore>((force) => {
    const score = latestScores ? scoreForce(force.key, latestScores) : null;
    const previousScore = previousScores ? scoreForce(force.key, previousScores) : null;
    const trend = compareTrend(score, previousScore);
    return {
      ...force,
      score,
      scoreLabel: formatScoreLabel(score),
      trend,
      trendLabel:
        trend === 'rising' ? 'Rising' : trend === 'falling' ? 'Falling' : 'Steady',
      healthStatus: getHealthStatus(score),
      healthLabel: getHealthLabel(getHealthStatus(score)),
      contributingCategories: FORCE_CATEGORY_MAP[force.key].map((categoryKey) => {
        const categoryScore =
          latestScores && typeof latestScores[categoryKey] === 'number'
            ? latestScores[categoryKey]
            : null;
        return {
          key: categoryKey,
          label: LIFE_WHEEL_CATEGORY_LABELS[categoryKey],
          score: categoryScore,
          scoreLabel: formatScoreLabel(categoryScore),
        };
      }),
    };
  });

  const strongestForce = latestScores ? findStrongest(forces) : null;
  const focusForce = latestScores ? findFocus(forces) : null;

  return {
    hasCheckinData: Boolean(latestScores),
    latestCheckinDate: latestCheckin?.date ?? null,
    latestCheckinDateLabel: formatDateLabel(latestCheckin?.date ?? null),
    strongestForce,
    focusForce,
    forces,
    summary:
      strongestForce && focusForce
        ? `${strongestForce.name} is your strongest force right now. ${focusForce.name} is asking for care.`
        : 'Refresh alignment to reveal your current life-force signal.',
  };
}

function isForceCategory(forceKey: QuestCompassForceKey, categoryKey: string | null): boolean {
  if (!categoryKey) return false;
  return FORCE_CATEGORY_MAP[forceKey].includes(categoryKey as LifeWheelCategoryKey);
}

function isActiveGoal(goal: QuestCompassGoalInput): boolean {
  const status = (goal.status_tag ?? '').toLowerCase();
  return !['done', 'complete', 'completed', 'archived', 'inactive'].includes(status);
}

function formatStatus(status: string | null): string {
  if (!status) return 'Active';
  return status
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatHabitCompletion(
  habit: QuestCompassHabitInput,
  todayLogs: QuestCompassHabitLogInput[],
): string {
  const log = todayLogs.find((entry) => entry.habit_id === habit.id);
  if (!log) return 'Not logged today';
  if (log.done) return 'Completed today';
  if (typeof log.completion_percentage === 'number') {
    return `${Math.round(log.completion_percentage)}% today`;
  }
  if (log.progress_state) return formatStatus(log.progress_state);
  return 'In progress today';
}

export function getPrimaryCategoryForForce(
  forceKey: QuestCompassForceKey,
): LifeWheelCategoryKey {
  return FORCE_CATEGORY_MAP[forceKey][0];
}

export function buildQuestCompassForceDetail(params: {
  force: QuestCompassForceScore;
  goals?: QuestCompassGoalInput[];
  habits?: QuestCompassHabitInput[];
  todayHabitLogs?: QuestCompassHabitLogInput[];
  goalSteps?: QuestCompassGoalStepInput[];
  questHabit?: QuestCompassQuestHabitInput | null;
}): QuestCompassForceDetail {
  const goals = params.goals ?? [];
  const habits = params.habits ?? [];
  const todayHabitLogs = params.todayHabitLogs ?? [];
  const goalSteps = params.goalSteps ?? [];
  const relatedGoalInputs = goals.filter(
    (goal) => isActiveGoal(goal) && isForceCategory(params.force.key, goal.life_wheel_category),
  );
  const relatedGoalIds = new Set(relatedGoalInputs.map((goal) => goal.id));
  const relatedGoals = relatedGoalInputs.map<QuestCompassRelatedGoal>((goal) => ({
    id: goal.id,
    title: goal.title,
    statusLabel: formatStatus(goal.status_tag),
    progressLabel: goal.progress_notes?.trim() ? goal.progress_notes.trim() : null,
  }));
  const supportingHabitInputs = habits.filter(
    (habit) =>
      isForceCategory(params.force.key, habit.domain_key) ||
      (habit.goal_id ? relatedGoalIds.has(habit.goal_id) : false),
  );
  const supportingHabits = supportingHabitInputs.map<QuestCompassSupportingHabit>((habit) => ({
    id: habit.id,
    title: habit.title,
    emoji: habit.emoji ?? null,
    completionLabel: formatHabitCompletion(habit, todayHabitLogs),
  }));
  const nextGoalStep = goalSteps
    .filter((step) => relatedGoalIds.has(step.goal_id) && !step.completed)
    .sort((a, b) => a.step_order - b.step_order)[0];
  const questHabit =
    params.questHabit && supportingHabitInputs.some((habit) => habit.id === params.questHabit?.habitId)
      ? params.questHabit
      : null;
  const categoryKey = getPrimaryCategoryForForce(params.force.key);

  let recommendedAction: QuestCompassRecommendedAction;
  if (nextGoalStep) {
    recommendedAction = {
      type: 'goal_step',
      label: 'Continue Goal',
      title: nextGoalStep.title,
      description: 'Take the next active step from a goal supporting this force.',
      categoryKey,
    };
  } else if (questHabit) {
    recommendedAction = {
      type: 'quest_habit',
      label: 'Recommended Next Quest',
      title: `${questHabit.emoji ? `${questHabit.emoji} ` : ''}${questHabit.title}`,
      description: `Start your ${params.force.name} habit today.`,
      categoryKey,
    };
  } else if (params.force.score !== null) {
    recommendedAction = {
      type: 'starter_quest',
      label: 'Starter Quest',
      title: STARTER_RECOMMENDATIONS[categoryKey],
      description: `Try a small action that supports ${params.force.name}.`,
      categoryKey,
    };
  } else {
    recommendedAction = {
      type: 'refresh_alignment',
      label: 'Refresh Alignment',
      title: 'Complete a Life Wheel check-in',
      description: 'Refresh your Compass so this force can recommend a clearer next quest.',
      categoryKey: null,
    };
  }

  return {
    force: params.force,
    relatedGoals,
    supportingHabits,
    recommendedAction,
  };
}
