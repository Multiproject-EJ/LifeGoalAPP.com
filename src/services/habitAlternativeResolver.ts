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

export type HabitAlternativeResolverInput = {
  id: string;
  title: string;
  domain_key?: string | null;
  lifeWheelArea?: string | null;
  habit_intent?: string[] | null;
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

const SHAME_WORD_PATTERN = /\b(fail|failed|failure)\b/i;

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function resolveArea(input: HabitAlternativeResolverInput): SuggestedHabitLifeWheelArea | null {
  const value = input.lifeWheelArea ?? input.domain_key;
  if (!value) return null;
  const normalized = normalizeText(value).replace(/\s+/g, '');

  const map: Record<string, SuggestedHabitLifeWheelArea> = {
    health: 'Health',
    mind: 'Mind',
    work: 'Work',
    money: 'Money',
    relationships: 'Relationships',
    relationship: 'Relationships',
    home: 'Home',
    growth: 'Growth',
    fun: 'Fun',
  };

  return map[normalized] ?? null;
}

function isNearIdenticalTitle(currentTitle: string, candidateTitle: string): boolean {
  const left = normalizeText(currentTitle);
  const right = normalizeText(candidateTitle);
  if (left === right) return true;
  return left.includes(right) || right.includes(left);
}

function scoreCandidate(
  candidate: SuggestedHabit,
  current: HabitAlternativeResolverInput,
  reasonTag: HabitAlternativeReasonTag,
): number {
  const currentIntents = new Set((current.habit_intent ?? []).map((intent) => normalizeText(intent)));
  const intentOverlap = candidate.goalIntentTags.filter((intent) => currentIntents.has(normalizeText(intent))).length;

  let score = intentOverlap * 100;

  if (reasonTag === 'friction_too_high' || reasonTag === 'habit_too_hard' || reasonTag === 'restart_relapse_pattern') {
    if (candidate.difficultyTier === 'tiny') score += 40;
    if (candidate.difficultyTier === 'easy') score += 20;
  }

  if (reasonTag === 'environment_mismatch') {
    const riskTags = (current.environment_risk_tags ?? []).map((tag) => normalizeText(tag));
    const blockerMatches = candidate.blockerTags.filter((tag) => riskTags.includes(normalizeText(tag))).length;
    score += blockerMatches * 15;
  }

  if (reasonTag === 'timing_mismatch' && current.defaultTiming && candidate.defaultTiming !== current.defaultTiming) {
    score += 12;
  }

  if (reasonTag === 'habit_stale' || reasonTag === 'motivation_unclear') {
    if (candidate.difficultyTier === 'tiny') score += 8;
    if (candidate.difficultyTier === 'easy') score += 6;
  }

  return score;
}

function buildSupportiveCopy(reasonTag: HabitAlternativeReasonTag): string {
  const lines: Record<HabitAlternativeReasonTag, string> = {
    habit_too_hard: 'This quest may not fit your life right now. Your goal still matters. Want a smaller path?',
    friction_too_high: 'Let’s keep the desire, but test a lighter method. Your goal still matters. Want a smaller path?',
    environment_mismatch: 'This quest may not fit your life right now. Let’s keep the desire, but test a lighter method.',
    timing_mismatch: 'This quest may not fit your life right now. Want a smaller path that fits your day better?',
    habit_stale: 'Your goal still matters. Let’s keep the desire, but test a lighter method.',
    motivation_unclear: 'This quest may not fit your life right now. Your goal still matters. Want a smaller path?',
    restart_relapse_pattern: 'Your goal still matters. Let’s keep the desire, but test a lighter method.',
  };
  const copy = lines[reasonTag];
  if (SHAME_WORD_PATTERN.test(copy)) {
    throw new Error('supportive copy must not contain shame language');
  }
  return copy;
}

export function resolveHabitAlternatives(
  currentHabit: HabitAlternativeResolverInput,
  reasonTag: HabitAlternativeReasonTag,
): HabitAlternativeSuggestion[] {
  const area = resolveArea(currentHabit);
  if (!area) return [];

  const supportiveCopy = buildSupportiveCopy(reasonTag);
  const currentTitle = currentHabit.title;

  return getAllSuggestedHabits()
    .filter((candidate) => candidate.lifeWheelArea === area)
    .filter((candidate) => !isNearIdenticalTitle(currentTitle, candidate.title))
    .map((candidate) => {
      const rankScore = scoreCandidate(candidate, currentHabit, reasonTag);
      const cueSuggestion = candidate.cueSuggestions[0] ?? '';
      const environmentHack = candidate.environmentHacks[0] ?? '';
      return {
        suggestedHabitId: candidate.suggestedHabitId,
        title: candidate.title,
        lifeWheelArea: candidate.lifeWheelArea,
        tinyVersion: candidate.tinyVersion,
        normalVersion: candidate.normalVersion,
        stretchVersion: candidate.stretchVersion,
        cueSuggestion,
        environmentHack,
        reasonTag,
        supportiveCopy,
        rankScore,
      };
    })
    .sort((a, b) => {
      if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore;
      if (a.title !== b.title) return a.title.localeCompare(b.title);
      return a.suggestedHabitId.localeCompare(b.suggestedHabitId);
    })
    .slice(0, 3);
}
