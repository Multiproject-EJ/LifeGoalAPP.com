import type { PersonalityScores } from '../personalityScoring';
import type { ArchetypeCard, TraitWeights } from './archetypeDeck';
import type { TraitKey, AxisKey } from '../personalityTestData';

const NEUTRAL_SCORE = 50;

export type ArchetypeScore = {
  card: ArchetypeCard;
  score: number;
};

/**
 * Computes archetype card scores from existing personality trait/axis scores.
 * Each archetype has trait weights that map to personality dimensions.
 * The score is a weighted average of trait alignments.
 */
export function scoreArchetypes(
  scores: PersonalityScores & { hexaco?: Partial<Record<string, number>> },
  deck: ArchetypeCard[],
): ArchetypeScore[] {
  return deck.map((card) => ({
    card,
    score: scoreArchetype(card, scores),
  }));
}

function scoreArchetype(
  card: ArchetypeCard,
  scores: PersonalityScores & { hexaco?: Partial<Record<string, number>> },
): number {
  const weights = card.traitWeights;
  const entries = Object.entries(weights) as [TraitKey | AxisKey, number][];

  if (entries.length === 0) {
    return NEUTRAL_SCORE;
  }

  let weightedSum = 0;
  let totalWeight = 0;

  for (const [dimension, weight] of entries) {
    const score = getDimensionScore(dimension, scores);
    const absWeight = Math.abs(weight);

    // If weight is negative, flip the score (inverse correlation)
    const alignedScore = weight < 0 ? 100 - score : score;

    weightedSum += alignedScore * absWeight;
    totalWeight += absWeight;
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : NEUTRAL_SCORE;
}

function getDimensionScore(
  dimension: TraitKey | AxisKey,
  scores: PersonalityScores & { hexaco?: Partial<Record<string, number>> },
): number {
  // Check Big Five traits
  if (dimension in scores.traits) {
    return scores.traits[dimension as TraitKey];
  }

  // Check custom axes
  if (dimension in scores.axes) {
    return scores.axes[dimension as AxisKey];
  }

  // Check HEXACO (if available)
  if (scores.hexaco && dimension in scores.hexaco) {
    return scores.hexaco[dimension] ?? NEUTRAL_SCORE;
  }

  // Default to neutral if dimension not found
  return NEUTRAL_SCORE;
}

/**
 * Sorts archetype scores in descending order (highest score first).
 */
export function rankArchetypes(archetypeScores: ArchetypeScore[]): ArchetypeScore[] {
  return [...archetypeScores].sort((a, b) => b.score - a.score);
}
