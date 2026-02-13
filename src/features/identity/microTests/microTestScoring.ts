import type { PersonalityScores } from '../personalityScoring';

/**
 * Micro-test result that gets applied to existing personality scores
 */
export type MicroTestResult = {
  microTestId: string;
  takenAt: Date;
  dimensionScores: Record<string, number>; // dimension key -> score (0-100)
};

/**
 * Hand change types for tracking what evolved in the deck
 */
export type HandChangeType =
  | 'confirmed' // Card was confirmed (same card, higher confidence)
  | 'leveled_up' // Card leveled up
  | 'shifted' // Card position changed in hand
  | 'discovered' // New card entered the hand
  | 'shadow_growth' // Shadow card improved
  | 'no_change'; // No significant change

export type HandChange = {
  type: HandChangeType;
  cardId: string;
  cardName: string;
  message: string;
};

/**
 * Configuration for blending algorithm
 */
const BLENDING_CONFIG = {
  FOUNDATION_MIN_WEIGHT: 0.5, // Foundation test always has at least 50% weight
  DECAY_HALF_LIFE_DAYS: 60, // Micro-test influence fades over 60 days
  MIN_SCORE_CHANGE: 2, // Ignore changes smaller than 2 points
  MAX_SCORE_SHIFT: 15, // Max change from a single micro-test
};

/**
 * Calculates decay factor for a micro-test result based on age
 */
function calculateDecayFactor(daysSinceTaken: number): number {
  const { DECAY_HALF_LIFE_DAYS } = BLENDING_CONFIG;
  // Exponential decay: factor = 0.5^(days / half_life)
  return Math.pow(0.5, daysSinceTaken / DECAY_HALF_LIFE_DAYS);
}

/**
 * Blends scores from foundation test and micro-tests with decay
 */
export function blendScores(
  foundationScore: number,
  microTestResults: MicroTestResult[],
  dimension: string,
  now: Date,
): number {
  const { FOUNDATION_MIN_WEIGHT, MIN_SCORE_CHANGE, MAX_SCORE_SHIFT } = BLENDING_CONFIG;

  // Filter results that have this dimension
  const relevantResults = microTestResults.filter(
    (result) => dimension in result.dimensionScores,
  );

  if (relevantResults.length === 0) {
    return foundationScore;
  }

  // Calculate weighted average
  let totalWeight = FOUNDATION_MIN_WEIGHT;
  let weightedSum = foundationScore * FOUNDATION_MIN_WEIGHT;

  relevantResults.forEach((result) => {
    const daysSince = Math.floor(
      (now.getTime() - result.takenAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    const decayFactor = calculateDecayFactor(daysSince);
    const weight = (1 - FOUNDATION_MIN_WEIGHT) * decayFactor;
    const score = result.dimensionScores[dimension];

    weightedSum += score * weight;
    totalWeight += weight;
  });

  const blendedScore = weightedSum / totalWeight;

  // Apply guardrails
  const delta = blendedScore - foundationScore;
  const clampedDelta = Math.max(
    -MAX_SCORE_SHIFT,
    Math.min(MAX_SCORE_SHIFT, delta),
  );

  if (Math.abs(clampedDelta) < MIN_SCORE_CHANGE) {
    return foundationScore; // Ignore noise
  }

  return Math.round(foundationScore + clampedDelta);
}

/**
 * Applies a micro-test result to existing personality scores
 */
export function applyMicroTestResult(
  currentScores: PersonalityScores,
  microTestResult: MicroTestResult,
  microTestHistory: MicroTestResult[],
  now: Date = new Date(),
): PersonalityScores {
  // Add the new result to history
  const allResults = [...microTestHistory, microTestResult];

  // Update HEXACO scores if the micro-test measured HEXACO dimensions
  const hexaco = currentScores.hexaco || {};
  const updatedHexaco: Record<string, number> = { ...hexaco };

  Object.entries(microTestResult.dimensionScores).forEach(([dimension, score]) => {
    // Check if this is a HEXACO dimension (not in traits or axes)
    const isHexaco =
      !(dimension in currentScores.traits) &&
      !(dimension in currentScores.axes);

    if (isHexaco) {
      // For HEXACO, use the micro-test score directly (there's no foundation test score)
      updatedHexaco[dimension] = score;
    }
  });

  return {
    ...currentScores,
    hexaco: updatedHexaco,
  };
}

/**
 * Analyzes what changed in the archetype hand after a micro-test
 */
export function analyzeHandChanges(
  oldHand: any, // ArchetypeHand from before
  newHand: any, // ArchetypeHand from after
): HandChange[] {
  const changes: HandChange[] = [];

  // Check if dominant card changed
  if (oldHand.dominant.card.id !== newHand.dominant.card.id) {
    changes.push({
      type: 'shifted',
      cardId: newHand.dominant.card.id,
      cardName: newHand.dominant.card.name,
      message: `${newHand.dominant.card.name} is now your dominant archetype!`,
    });
  } else if (newHand.dominant.level > oldHand.dominant.level) {
    changes.push({
      type: 'leveled_up',
      cardId: newHand.dominant.card.id,
      cardName: newHand.dominant.card.name,
      message: `${newHand.dominant.card.name} leveled up to Lv ${newHand.dominant.level}!`,
    });
  } else if (Math.abs(newHand.dominant.score - oldHand.dominant.score) < 5) {
    changes.push({
      type: 'confirmed',
      cardId: newHand.dominant.card.id,
      cardName: newHand.dominant.card.name,
      message: `${newHand.dominant.card.name} confirmed as your dominant archetype.`,
    });
  }

  // Check shadow card improvement
  if (newHand.shadow.score > oldHand.shadow.score + 5) {
    changes.push({
      type: 'shadow_growth',
      cardId: newHand.shadow.card.id,
      cardName: newHand.shadow.card.name,
      message: `Your shadow card ${newHand.shadow.card.name} is growing!`,
    });
  }

  // If no changes detected
  if (changes.length === 0) {
    changes.push({
      type: 'no_change',
      cardId: oldHand.dominant.card.id,
      cardName: oldHand.dominant.card.name,
      message: 'Your deck remains stable — no significant changes.',
    });
  }

  return changes;
}
