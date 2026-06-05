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

type QuestCompassCheckinInput = {
  date: string | null;
  scores: unknown;
};

export type QuestCompassForceScore = {
  key: QuestCompassForceKey;
  name: string;
  icon: string;
  summary: string;
  prompt: string;
  score: number | null;
  scoreLabel: string;
  trend: QuestCompassTrend;
  trendLabel: string;
  contributingCategories: string[];
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
      scoreLabel: score === null ? 'No signal' : `${score}/10`,
      trend,
      trendLabel:
        trend === 'rising' ? 'Rising' : trend === 'falling' ? 'Falling' : 'Steady',
      contributingCategories: FORCE_CATEGORY_MAP[force.key].map(
        (categoryKey) => LIFE_WHEEL_CATEGORY_LABELS[categoryKey],
      ),
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
