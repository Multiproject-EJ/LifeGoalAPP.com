import type { ArchetypeCard, SuitKey } from './archetypeDeck';
import type { ArchetypeScore } from './archetypeScoring';

export type HandRole = 'dominant' | 'secondary' | 'support' | 'shadow';

export type HandCard = {
  card: ArchetypeCard;
  score: number;
  role: HandRole;
  level: number; // 0-5, starts at 1 from foundation test
};

export type ArchetypeHand = {
  dominant: HandCard;
  secondary: HandCard;
  supports: [HandCard, HandCard];
  shadow: HandCard;
};

/**
 * Builds a 5-card hand from ranked archetype scores.
 * - Dominant: Top scoring card (your primary playstyle)
 * - Secondary: 2nd highest (your supporting mode)
 * - Supports: 3rd & 4th (tools in your kit)
 * - Shadow: Lowest scoring card (growth opportunity)
 */
export function buildHand(rankedScores: ArchetypeScore[]): ArchetypeHand {
  if (rankedScores.length < 5) {
    throw new Error(
      `Need at least 5 archetype cards to build a hand, but received ${rankedScores.length} cards`,
    );
  }

  // Sort by score descending (highest first)
  const sorted = [...rankedScores].sort((a, b) => b.score - a.score);

  // Pick top 4 and bottom 1
  const dominant = createHandCard(sorted[0], 'dominant', 1);
  const secondary = createHandCard(sorted[1], 'secondary', 1);
  const support1 = createHandCard(sorted[2], 'support', 1);
  const support2 = createHandCard(sorted[3], 'support', 1);
  const shadow = createHandCard(sorted[sorted.length - 1], 'shadow', 0); // Shadow starts at level 0

  return {
    dominant,
    secondary,
    supports: [support1, support2],
    shadow,
  };
}

function createHandCard(
  archetypeScore: ArchetypeScore,
  role: HandRole,
  level: number,
): HandCard {
  return {
    card: archetypeScore.card,
    score: archetypeScore.score,
    role,
    level,
  };
}

/**
 * Extracts all 5 cards from a hand as a flat array.
 */
export function handToArray(hand: ArchetypeHand): HandCard[] {
  return [
    hand.dominant,
    hand.secondary,
    ...hand.supports,
    hand.shadow,
  ];
}

/**
 * Gets a summary of the hand for display purposes.
 */
export type HandSummary = {
  dominantSuit: SuitKey;
  deckStrength: number; // 0-100 percentage
  cardCount: number;
};

export function getHandSummary(hand: ArchetypeHand): HandSummary {
  const cards = handToArray(hand);
  const dominantSuit = hand.dominant.card.suit;
  
  // Calculate deck strength as average score of top 4 cards (exclude shadow)
  const topFour = [hand.dominant, hand.secondary, ...hand.supports];
  const avgScore = topFour.reduce((sum, card) => sum + card.score, 0) / topFour.length;

  return {
    dominantSuit,
    deckStrength: Math.round(avgScore),
    cardCount: cards.length,
  };
}
