import {
  getAllSuggestedHabits,
  type SuggestedHabit,
  type SuggestedHabitDefaultTiming,
  type SuggestedHabitLifeWheelArea,
} from '../features/habits/suggestedHabitLibrary';

export type HabitAlternativeReasonTag =
  | 'habit_too_hard'
  | 'friction_too_high'
  | 'environment_mismatch'
  | 'timing_mismatch'
  | 'habit_stale'
  | 'motivation_unclear'
  | 'restart_relapse_pattern';

export type HabitAlternativeInput = {
  id: string;
  title: string;
  domain_key?: string | null;
  lifeWheelArea?: string | null;
  habit_intent?: string[] | string | null;
  goal_id?: string | null;
  environment_risk_tags?: string[] | null;
  defaultTiming?: SuggestedHabitDefaultTiming | string | null;
};

export type HabitAlternativeSuggestion = {
  suggestedHabitId: string;
  title: string;
  lifeWheelArea: SuggestedHabitLifeWheelArea;
  tinyVersion: string;
  normalVersion: string;
  stretchVersion: string;
  cueSuggestion: string;
  environmentHack: string;
  reasonTag: HabitAlternativeReasonTag;
  supportiveCopy: string;
  rankScore: number;
};

const EASY_TIERS = new Set(['tiny', 'easy']);

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractLifeWheelArea(input: HabitAlternativeInput): SuggestedHabitLifeWheelArea | null {
  const value = (input.lifeWheelArea ?? input.domain_key ?? '').trim().toLowerCase();
  if (!value) return null;
  const match = getAllSuggestedHabits().find((habit) => habit.lifeWheelArea.toLowerCase() === value);
  return match?.lifeWheelArea ?? null;
}

function toIntentSet(input: HabitAlternativeInput): Set<string> {
  const raw = input.habit_intent;
  if (!raw) return new Set();
  const arr = Array.isArray(raw) ? raw : [raw];
  return new Set(arr.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean));
}

function isNearIdenticalTitle(currentTitle: string, candidateTitle: string): boolean {
  const a = normalizeText(currentTitle);
  const b = normalizeText(candidateTitle);
  if (!a || !b) return false;
  if (a === b) return true;
  return a.includes(b) || b.includes(a);
}

function chooseAngle(list: string[], avoid: Set<string>): string {
  if (list.length === 0) return '';
  for (const item of list) {
    if (!avoid.has(item.toLowerCase())) return item;
  }
  return list[0];
}

function buildSupportiveCopy(reasonTag: HabitAlternativeReasonTag): string {
  const byReason: Record<HabitAlternativeReasonTag, string> = {
    habit_too_hard: 'This quest may not fit your life right now. Your goal still matters. Want a smaller path?',
    friction_too_high: 'Let’s keep the desire, but test a lighter method. Your goal still matters. Want a smaller path?',
    environment_mismatch: 'This quest may not fit your life right now. Let’s keep the desire, but test a lighter method.',
    timing_mismatch: 'This quest may not fit your life right now. Want a smaller path that fits this part of your day?',
    habit_stale: 'Your goal still matters. Let’s keep the desire, but test a lighter method.',
    motivation_unclear: 'Your goal still matters. Want a smaller path? Let’s keep the desire, but test a lighter method.',
    restart_relapse_pattern: 'This quest may not fit your life right now. Your goal still matters. Want a smaller path?',
  };
  return byReason[reasonTag];
}

function computeRankScore(
  habit: SuggestedHabit,
  intents: Set<string>,
  reasonTag: HabitAlternativeReasonTag,
  input: HabitAlternativeInput,
): number {
  let score = 0;

  for (const tag of habit.goalIntentTags) {
    if (intents.has(tag.toLowerCase())) score += 40;
  }

  if (reasonTag === 'friction_too_high' || reasonTag === 'habit_too_hard' || reasonTag === 'restart_relapse_pattern') {
    score += EASY_TIERS.has(habit.difficultyTier) ? 25 : -10;
    if (habit.difficultyTier === 'tiny') score += 5;
  }

  if (reasonTag === 'timing_mismatch' && input.defaultTiming && habit.defaultTiming === input.defaultTiming) {
    score -= 8;
  }

  if (reasonTag === 'habit_stale') {
    score += habit.difficultyTier === 'easy' ? 6 : 0;
  }

  return score;
}

export function resolveHabitAlternatives(
  input: HabitAlternativeInput,
  reasonTag: HabitAlternativeReasonTag,
): HabitAlternativeSuggestion[] {
  const area = extractLifeWheelArea(input);
  if (!area) return [];

  const intents = toIntentSet(input);
  const riskTags = new Set((input.environment_risk_tags ?? []).map((tag) => tag.toLowerCase()));
  const normalizedCurrentTitle = input.title || '';

  const ranked = getAllSuggestedHabits()
    .filter((habit) => habit.lifeWheelArea === area)
    .filter((habit) => !isNearIdenticalTitle(normalizedCurrentTitle, habit.title))
    .map((habit) => {
      const rankScore = computeRankScore(habit, intents, reasonTag, input);
      const cueSuggestion = chooseAngle(habit.cueSuggestions, reasonTag === 'environment_mismatch' ? riskTags : new Set());
      const environmentHack = chooseAngle(habit.environmentHacks, reasonTag === 'environment_mismatch' ? riskTags : new Set());
      return {
        suggestedHabitId: habit.suggestedHabitId,
        title: habit.title,
        lifeWheelArea: habit.lifeWheelArea,
        tinyVersion: habit.tinyVersion,
        normalVersion: habit.normalVersion,
        stretchVersion: habit.stretchVersion,
        cueSuggestion,
        environmentHack,
        reasonTag,
        supportiveCopy: buildSupportiveCopy(reasonTag),
        rankScore,
      };
    })
    .sort((a, b) => {
      if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore;
      const titleCmp = a.title.localeCompare(b.title);
      if (titleCmp !== 0) return titleCmp;
      return a.suggestedHabitId.localeCompare(b.suggestedHabitId);
    });

  return ranked.slice(0, 3);
}
