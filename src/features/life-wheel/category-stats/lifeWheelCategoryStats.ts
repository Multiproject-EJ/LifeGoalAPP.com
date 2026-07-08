import {
  getAreaForCheckinKey,
  getLifeWheelAreaMeta,
} from '../lifeWheelTaxonomy';
import type { LifeWheelCategoryKey } from '../../checkins/LifeWheelCheckins';

export type LifeWheelCategoryCheckin = {
  id?: string | null;
  date?: string | null;
  scores: unknown;
};

export type LifeWheelCategoryGoal = {
  id?: string | null;
  status_tag?: string | null;
  life_wheel_category?: string | null;
  secondary_life_wheel_categories?: string[] | null;
};

export type LifeWheelCategoryHabit = {
  id?: string | null;
  status?: string | null;
  archived?: boolean | null;
  domain_key?: string | null;
  goal_id?: string | null;
};

export type LifeWheelCategoryHabitLog = {
  habit_id?: string | null;
  status?: string | null;
  completed?: boolean | null;
};

export type RealmStatDimensionKey = 'depth' | 'performance' | 'coverage';

export type RealmStatDimension = {
  key: RealmStatDimensionKey;
  eyebrow: string;
  title: string;
  score: number | null;
  accent: 'violet' | 'blue' | 'green';
  summary: string;
  evidence: string[];
};

export type LifeWheelCategoryStatsViewModel = {
  categoryKey: LifeWheelCategoryKey;
  areaName: string;
  title: string;
  shortLabel: string;
  icon: string;
  description: string;
  heroTone: string;
  latestScore: number | null;
  previousScore: number | null;
  trend: number | null;
  trendLabel: string;
  hasSignal: boolean;
  activeGoalCount: number | null;
  activeHabitCount: number | null;
  dimensions: RealmStatDimension[];
  emptyState: string;
};

const MAX_SCORE = 10;
const MAX_STAT_SCORE = 100;

const DISPLAY_LABEL_OVERRIDES: Partial<Record<LifeWheelCategoryKey, string>> = {
  finance_wealth: 'Finance & Wealth',
};

const REALM_DESCRIPTIONS: Record<LifeWheelCategoryKey, string> = {
  spirituality_community: 'Tend the inner compass, meaning, awareness, and the communities that keep your spirit awake.',
  finance_wealth: 'Build stability, freedom, and choices for the life you actually want.',
  love_relations: 'Strengthen intimacy, trust, and the bonds that make love feel alive and safe.',
  fun_creativity: 'Protect play, beauty, wonder, and the creative sparks that refill your world.',
  career_development: 'Forge skill, purpose, focus, and meaningful progress in the work you choose to build.',
  health_fitness: 'Guard your energy, body, sleep, nutrition, and the daily vitality that powers every quest.',
  family_friends: 'Nurture the circles of friendship, family, and belonging that help you feel less alone.',
  living_spaces: 'Shape your home and environment into a base camp that supports the person you are becoming.',
};

const HERO_TONES: Record<LifeWheelCategoryKey, string> = {
  spirituality_community: 'Moonlit temple gardens under a field of stars',
  finance_wealth: 'Golden harbor city at sunrise, trade winds and mountain light',
  love_relations: 'Rose-lit sanctuary bridge over calm water',
  fun_creativity: 'Lantern festival of music, paint, and impossible colors',
  career_development: 'High forge tower with maps, tools, and bright horizon lines',
  health_fitness: 'Emerald spring valley with clear air and ancient stone paths',
  family_friends: 'Warm hearth village filled with connected lights',
  living_spaces: 'Cozy enchanted home base with gardens and protective walls',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizeWheelScore(value: unknown): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return clamp(value, 0, MAX_SCORE);
}

function extractCategoryScore(checkin: LifeWheelCategoryCheckin | null | undefined, categoryKey: LifeWheelCategoryKey): number | null {
  if (!checkin || !checkin.scores || typeof checkin.scores !== 'object' || Array.isArray(checkin.scores)) {
    return null;
  }
  return normalizeWheelScore((checkin.scores as Record<string, unknown>)[categoryKey]);
}

function isActiveGoal(goal: LifeWheelCategoryGoal): boolean {
  const status = goal.status_tag?.toLowerCase() ?? '';
  return status !== 'completed' && status !== 'archived';
}

function goalMatchesCategory(goal: LifeWheelCategoryGoal, categoryKey: LifeWheelCategoryKey): boolean {
  return goal.life_wheel_category === categoryKey || goal.secondary_life_wheel_categories?.includes(categoryKey) === true;
}

function isActiveHabit(habit: LifeWheelCategoryHabit): boolean {
  const status = habit.status?.toLowerCase() ?? 'active';
  return habit.archived !== true && status !== 'paused' && status !== 'deactivated' && status !== 'archived';
}

function habitMatchesCategory(
  habit: LifeWheelCategoryHabit,
  categoryKey: LifeWheelCategoryKey,
  relatedGoalIds: Set<string>,
): boolean {
  return habit.domain_key === categoryKey || (typeof habit.goal_id === 'string' && relatedGoalIds.has(habit.goal_id));
}

function scoreToStat(score: number | null): number | null {
  return score === null ? null : clamp(score * 10, 0, MAX_STAT_SCORE);
}

function formatTrend(trend: number | null): string {
  if (trend === null) return 'No previous reading';
  if (trend > 0) return `+${trend} since last reading`;
  if (trend < 0) return `${trend} since last reading`;
  return 'Steady since last reading';
}

function describeScore(score: number | null, fallback = 'Not enough signal yet.'): string {
  if (score === null) return fallback;
  if (score >= 80) return 'Strong signal';
  if (score >= 60) return 'Good foundation';
  if (score >= 40) return 'Forming signal';
  return 'Needs attention';
}

function buildDepthScore(latestScore: number | null, previousScore: number | null): number | null {
  const base = scoreToStat(latestScore);
  if (base === null) return null;
  return clamp(base + (previousScore === null ? 0 : 6), 0, MAX_STAT_SCORE);
}

function buildPerformanceScore(latestScore: number | null, trend: number | null): number | null {
  const base = scoreToStat(latestScore);
  if (base === null) return null;
  const adjustment = trend === null ? 0 : trend > 0 ? 6 : trend < 0 ? -6 : 0;
  return clamp(base + adjustment, 0, MAX_STAT_SCORE);
}

function buildCoverageScore(
  latestScore: number | null,
  previousScore: number | null,
  activeGoalCount: number | null,
  activeHabitCount: number | null,
): number | null {
  if (activeGoalCount !== null || activeHabitCount !== null) {
    const goalPoints = Math.min(activeGoalCount ?? 0, 2) * 22;
    const habitPoints = Math.min(activeHabitCount ?? 0, 3) * 14;
    const reflectionPoints = previousScore === null ? 0 : 10;
    const baseline = latestScore === null ? 8 : Math.min(18, latestScore * 2);
    return clamp(goalPoints + habitPoints + reflectionPoints + baseline, 0, MAX_STAT_SCORE);
  }

  if (latestScore === null) return null;
  return clamp(latestScore * 8 + (previousScore === null ? 0 : 12), 0, MAX_STAT_SCORE);
}

export function buildLifeWheelCategoryStatsViewModel(params: {
  categoryKey: LifeWheelCategoryKey;
  checkins: LifeWheelCategoryCheckin[];
  goals?: LifeWheelCategoryGoal[];
  habits?: LifeWheelCategoryHabit[];
  habitLogs?: LifeWheelCategoryHabitLog[];
}): LifeWheelCategoryStatsViewModel {
  const area = getLifeWheelAreaMeta(getAreaForCheckinKey(params.categoryKey));
  const title = DISPLAY_LABEL_OVERRIDES[params.categoryKey] ?? area.label;
  const sortedCheckins = [...params.checkins].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
  const scoredReadings = sortedCheckins
    .map((checkin) => extractCategoryScore(checkin, params.categoryKey))
    .filter((score): score is number => score !== null);
  const latestScore = scoredReadings[0] ?? null;
  const previousScore = scoredReadings[1] ?? null;
  const trend = latestScore === null || previousScore === null ? null : latestScore - previousScore;
  const relatedGoals = params.goals?.filter((goal) => isActiveGoal(goal) && goalMatchesCategory(goal, params.categoryKey));
  const relatedGoalIds = new Set(relatedGoals?.map((goal) => goal.id).filter((id): id is string => typeof id === 'string') ?? []);
  const relatedHabits = params.habits?.filter(
    (habit) => isActiveHabit(habit) && habitMatchesCategory(habit, params.categoryKey, relatedGoalIds),
  );
  const activeGoalCount = params.goals ? relatedGoals?.length ?? 0 : null;
  const activeHabitCount = params.habits ? relatedHabits?.length ?? 0 : null;
  const depthScore = buildDepthScore(latestScore, previousScore);
  const performanceScore = buildPerformanceScore(latestScore, trend);
  const coverageScore = buildCoverageScore(latestScore, previousScore, activeGoalCount, activeHabitCount);
  const emptyState = 'Not enough signal yet. Complete a check-in or add a goal in this realm to sharpen the readout.';

  const depthEvidence = latestScore === null
    ? [emptyState]
    : [
        `Latest realm reading is ${latestScore}/10.`,
        previousScore === null ? 'One reading recorded so far.' : 'Multiple readings give this realm more clarity.',
        'Area notes and goals can deepen this readout later.',
      ];

  const performanceEvidence = latestScore === null
    ? ['No current score yet for this realm.']
    : [
        `Current Life Wheel signal: ${latestScore}/10.`,
        trend === null ? 'No previous score to compare yet.' : `Trend: ${formatTrend(trend)}.`,
        trend !== null && trend > 0 ? 'Momentum is rising.' : 'Use your next check-in to verify momentum.',
      ];

  const coverageEvidence = latestScore === null && activeGoalCount === null && activeHabitCount === null
    ? ['Coverage is unknown until this realm has more signal.']
    : [
        activeGoalCount === null ? 'Goal coverage not loaded in this MVP view.' : `${activeGoalCount} active goal${activeGoalCount === 1 ? '' : 's'} in this realm.`,
        activeHabitCount === null ? 'Habit coverage not loaded in this MVP view.' : `${activeHabitCount} active habit${activeHabitCount === 1 ? '' : 's'} protecting this realm.`,
        previousScore === null ? 'Repeated check-ins will sharpen system coverage.' : 'Repeated check-ins suggest this realm is being watched.',
      ];

  return {
    categoryKey: params.categoryKey,
    areaName: area.area,
    title,
    shortLabel: area.shortLabel,
    icon: area.emoji,
    description: REALM_DESCRIPTIONS[params.categoryKey],
    heroTone: HERO_TONES[params.categoryKey],
    latestScore,
    previousScore,
    trend,
    trendLabel: formatTrend(trend),
    hasSignal: latestScore !== null,
    activeGoalCount,
    activeHabitCount,
    emptyState,
    dimensions: [
      {
        key: 'depth',
        eyebrow: 'Realm Clarity',
        title: 'Depth of Understanding',
        score: depthScore,
        accent: 'violet',
        summary: depthScore === null
          ? 'Your clarity in this realm is still hidden.'
          : `${describeScore(depthScore)} — how well you understand what matters, what is blocking you, and why.`,
        evidence: depthEvidence,
      },
      {
        key: 'performance',
        eyebrow: 'Momentum',
        title: 'Performance',
        score: performanceScore,
        accent: 'blue',
        summary: performanceScore === null
          ? 'Not enough signal yet to read momentum.'
          : `${describeScore(performanceScore)} — whether habits, goals, and follow-through are moving this realm forward.`,
        evidence: performanceEvidence,
      },
      {
        key: 'coverage',
        eyebrow: 'Systems Coverage',
        title: 'Coverage',
        score: coverageScore,
        accent: 'green',
        summary: coverageScore === null
          ? 'Your support systems in this realm are not visible yet.'
          : `${describeScore(coverageScore)} — whether enough of the right habits, goals, and routines protect this realm.`,
        evidence: coverageEvidence,
      },
    ],
  };
}
