import type { PersonalityScores } from './personalityScoring';

export const TRAIT_LABELS: Record<keyof PersonalityScores['traits'], string> = {
  openness: 'Openness',
  conscientiousness: 'Conscientiousness',
  extraversion: 'Extraversion',
  agreeableness: 'Agreeableness',
  emotional_stability: 'Emotional Stability',
};

export const buildTopTraitList = (traits: Record<string, number>, limit: number): string[] =>
  Object.entries(traits)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => TRAIT_LABELS[key as keyof PersonalityScores['traits']] ?? key);

export const buildTopTraitSummary = (traits: Record<string, number>): string => {
  const topTraits = buildTopTraitList(traits, 2);
  return topTraits.length > 0 ? topTraits.join(' · ') : 'Trait snapshot';
};
