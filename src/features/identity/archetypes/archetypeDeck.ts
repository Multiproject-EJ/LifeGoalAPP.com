import type { TraitKey, AxisKey } from '../personalityTestData';

/**
 * Archetype Suit Keys
 * Four suits representing different life orientations:
 * - power: Agency and action-oriented
 * - heart: Empathy and connection-oriented
 * - mind: Reason and analysis-oriented
 * - spirit: Vision and exploration-oriented
 */
export type SuitKey = 'power' | 'heart' | 'mind' | 'spirit';

export type Orientation = 'inward' | 'outward';
export type TimeFocus = 'past' | 'present' | 'future';
export type RiskTolerance = 'low' | 'moderate' | 'high' | 'very_high';

/**
 * Trait Weights Map
 * Maps personality trait/axis keys to numeric weights.
 * Positive weights = high correlation with this archetype
 * Negative weights = inverse correlation (low trait value increases archetype score)
 * Example: { extraversion: 1.0, agreeableness: -0.4 } means high extraversion
 * and low agreeableness both increase the archetype score.
 */
export type TraitWeights = Partial<Record<TraitKey | AxisKey, number>>;

/**
 * Archetype Card
 * Represents a personality archetype in the 4-suit deck system.
 * Each archetype is defined by:
 * - Trait weights: How personality traits correlate with this archetype
 * - Behavioral characteristics: Drive, orientation, time focus, risk tolerance
 * - Narrative elements: Strengths, weaknesses, stress behavior, growth strategy
 * 
 * Cards are scored against a player's personality profile to determine their
 * 5-card hand (dominant, secondary, 2 supports, shadow).
 */
export type ArchetypeCard = {
  id: string;
  name: string;
  suit: SuitKey;
  icon: string;
  color: string;
  traitWeights: TraitWeights;
  drive: string;
  orientation: Orientation;
  timeFocus: TimeFocus;
  riskTolerance: RiskTolerance;
  strengths: string[];
  weaknesses: string[];
  stressBehavior: string;
  growthStrategy: string;
};

/**
 * Suit color palette
 * Visual identity for each suit in the deck.
 */
export const SUIT_COLORS: Record<SuitKey, string> = {
  power: '#ef4444', // red
  heart: '#ec4899', // pink
  mind: '#3b82f6', // blue
  spirit: '#8b5cf6', // purple
};

/**
 * Suit labels with semantic meaning
 */
export const SUIT_LABELS: Record<SuitKey, string> = {
  power: 'Power (Agency)',
  heart: 'Heart (Empathy)',
  mind: 'Mind (Reason)',
  spirit: 'Spirit (Vision)',
};

/**
 * The Archetype Deck (16-card MVP)
 * 4 archetypes per suit, derived from personality research.
 * This is the foundation of the "Player's Deck" system.
 * 
 * Design principle: Archetypes are NOT rigid categories. They're lenses for
 * understanding your playstyle in the Game of Life. Your deck evolves as you grow.
 */
export const ARCHETYPE_DECK: ArchetypeCard[] = [
  // POWER SUIT (Agency)
  {
    id: 'commander',
    name: 'Commander',
    suit: 'power',
    icon: '⚔️',
    color: SUIT_COLORS.power,
    traitWeights: {
      extraversion: 1.0,
      conscientiousness: 1.0,
      agreeableness: 0.3,
      emotional_stability: 0.6,
      regulation_style: 0.4,
    },
    drive: 'Lead and direct others toward goals',
    orientation: 'outward',
    timeFocus: 'future',
    riskTolerance: 'high',
    strengths: [
      'Natural leadership',
      'Decisive action',
      'Strategic thinking',
      'Confidence under pressure',
    ],
    weaknesses: [
      'Can be domineering',
      'May overlook details',
      'Impatient with slow progress',
    ],
    stressBehavior: 'Becomes more controlling and directive',
    growthStrategy: 'Practice active listening and collaborative decision-making',
  },
  {
    id: 'champion',
    name: 'Champion',
    suit: 'power',
    icon: '🏆',
    color: SUIT_COLORS.power,
    traitWeights: {
      extraversion: 0.8,
      conscientiousness: 0.7,
      emotional_stability: 0.9,
      openness: 0.4,
      stress_response: 0.6,
    },
    drive: 'Achieve excellence and inspire others to win',
    orientation: 'outward',
    timeFocus: 'present',
    riskTolerance: 'high',
    strengths: [
      'Competitive drive',
      'Resilience',
      'Motivational energy',
      'Performance focus',
    ],
    weaknesses: [
      'May prioritize winning over wellbeing',
      'Difficulty relaxing',
      'Can be overly competitive',
    ],
    stressBehavior: 'Pushes harder, may burn out',
    growthStrategy: 'Celebrate process over outcomes, practice rest',
  },
  {
    id: 'strategist',
    name: 'Strategist',
    suit: 'power',
    icon: '♟️',
    color: SUIT_COLORS.power,
    traitWeights: {
      conscientiousness: 0.9,
      openness: 0.7,
      emotional_stability: 0.6,
      extraversion: 0.3,
      regulation_style: 0.8,
    },
    drive: 'Plan and execute long-term visions',
    orientation: 'inward',
    timeFocus: 'future',
    riskTolerance: 'moderate',
    strengths: [
      'Long-term planning',
      'Systems thinking',
      'Risk assessment',
      'Patience',
    ],
    weaknesses: [
      'Analysis paralysis',
      'May overthink',
      'Slow to adapt',
    ],
    stressBehavior: 'Retreats into planning, avoids action',
    growthStrategy: 'Practice rapid prototyping and iteration',
  },
  {
    id: 'challenger',
    name: 'Challenger',
    suit: 'power',
    icon: '🔥',
    color: SUIT_COLORS.power,
    traitWeights: {
      extraversion: 0.7,
      emotional_stability: 0.8,
      agreeableness: -0.4,
      openness: 0.6,
      stress_response: 0.7,
    },
    drive: 'Question norms and push boundaries',
    orientation: 'outward',
    timeFocus: 'present',
    riskTolerance: 'very_high',
    strengths: [
      'Fearless advocacy',
      'Direct communication',
      'Change catalyst',
      'High courage',
    ],
    weaknesses: [
      'Can be confrontational',
      'May alienate allies',
      'Difficulty compromising',
    ],
    stressBehavior: 'Becomes more aggressive and combative',
    growthStrategy: 'Build coalitions, choose battles wisely',
  },

  // HEART SUIT (Empathy)
  {
    id: 'caregiver',
    name: 'Caregiver',
    suit: 'heart',
    icon: '🤲',
    color: SUIT_COLORS.heart,
    traitWeights: {
      agreeableness: 1.0,
      emotional_stability: 0.5,
      extraversion: 0.5,
      conscientiousness: 0.6,
      stress_response: -0.3,
    },
    drive: 'Nurture and support others',
    orientation: 'outward',
    timeFocus: 'present',
    riskTolerance: 'low',
    strengths: [
      'Deep empathy',
      'Attentive listening',
      'Emotional support',
      'Patience',
    ],
    weaknesses: [
      'May neglect own needs',
      'Difficulty setting boundaries',
      'Can be overly protective',
    ],
    stressBehavior: 'Takes on others\' problems, becomes overwhelmed',
    growthStrategy: 'Practice self-care and healthy boundaries',
  },
  {
    id: 'mentor',
    name: 'Mentor',
    suit: 'heart',
    icon: '🌱',
    color: SUIT_COLORS.heart,
    traitWeights: {
      agreeableness: 0.8,
      openness: 0.7,
      conscientiousness: 0.6,
      extraversion: 0.5,
      identity_sensitivity: 0.5,
    },
    drive: 'Guide others toward their potential',
    orientation: 'outward',
    timeFocus: 'future',
    riskTolerance: 'moderate',
    strengths: [
      'Teaching ability',
      'Patient guidance',
      'Growth mindset',
      'Wisdom sharing',
    ],
    weaknesses: [
      'May impose own path',
      'Difficulty letting go',
      'Can be over-invested',
    ],
    stressBehavior: 'Becomes overly directive or disappointed',
    growthStrategy: 'Trust others\' journeys, let go of outcomes',
  },
  {
    id: 'peacemaker',
    name: 'Peacemaker',
    suit: 'heart',
    icon: '☮️',
    color: SUIT_COLORS.heart,
    traitWeights: {
      agreeableness: 0.9,
      emotional_stability: 0.7,
      extraversion: 0.4,
      openness: 0.5,
      stress_response: 0.6,
    },
    drive: 'Create harmony and resolve conflict',
    orientation: 'outward',
    timeFocus: 'present',
    riskTolerance: 'low',
    strengths: [
      'Conflict resolution',
      'Diplomatic communication',
      'Calm presence',
      'Bridge-building',
    ],
    weaknesses: [
      'May avoid necessary conflict',
      'Can be indecisive',
      'Difficulty with confrontation',
    ],
    stressBehavior: 'Withdraws or appeases to avoid tension',
    growthStrategy: 'Practice assertiveness and healthy disagreement',
  },
  {
    id: 'altruist',
    name: 'Altruist',
    suit: 'heart',
    icon: '❤️',
    color: SUIT_COLORS.heart,
    traitWeights: {
      agreeableness: 1.0,
      conscientiousness: 0.7,
      openness: 0.6,
      extraversion: 0.6,
      identity_sensitivity: 0.7,
    },
    drive: 'Serve a greater cause beyond self',
    orientation: 'outward',
    timeFocus: 'future',
    riskTolerance: 'moderate',
    strengths: [
      'Selfless service',
      'Strong values',
      'Community focus',
      'Dedication',
    ],
    weaknesses: [
      'May neglect personal needs',
      'Can be self-sacrificing',
      'Burnout risk',
    ],
    stressBehavior: 'Overextends, ignores own limits',
    growthStrategy: 'Balance service with self-care and sustainability',
  },

  // MIND SUIT (Reason)
  {
    id: 'sage',
    name: 'Sage',
    suit: 'mind',
    icon: '🧙',
    color: SUIT_COLORS.mind,
    traitWeights: {
      openness: 1.0,
      conscientiousness: 0.6,
      emotional_stability: 0.7,
      extraversion: 0.3,
      cognitive_entry: 0.7,
    },
    drive: 'Seek wisdom and understanding',
    orientation: 'inward',
    timeFocus: 'past',
    riskTolerance: 'low',
    strengths: [
      'Deep knowledge',
      'Reflective thinking',
      'Pattern recognition',
      'Perspective',
    ],
    weaknesses: [
      'May overthink',
      'Can be detached',
      'Slow to act',
    ],
    stressBehavior: 'Withdraws into contemplation, avoids decisions',
    growthStrategy: 'Apply knowledge through action, engage with present',
  },
  {
    id: 'analyst',
    name: 'Analyst',
    suit: 'mind',
    icon: '📊',
    color: SUIT_COLORS.mind,
    traitWeights: {
      openness: 0.7,
      conscientiousness: 0.9,
      emotional_stability: 0.6,
      extraversion: 0.2,
      regulation_style: 0.8,
    },
    drive: 'Understand through data and logic',
    orientation: 'inward',
    timeFocus: 'present',
    riskTolerance: 'low',
    strengths: [
      'Analytical precision',
      'Data-driven decisions',
      'Problem-solving',
      'Objectivity',
    ],
    weaknesses: [
      'May miss intuitive insights',
      'Can be overly critical',
      'Difficulty with ambiguity',
    ],
    stressBehavior: 'Demands more data, delays decisions',
    growthStrategy: 'Trust intuition, embrace uncertainty',
  },
  {
    id: 'architect',
    name: 'Architect',
    suit: 'mind',
    icon: '🏛️',
    color: SUIT_COLORS.mind,
    traitWeights: {
      openness: 0.8,
      conscientiousness: 1.0,
      emotional_stability: 0.7,
      extraversion: 0.3,
      regulation_style: 0.9,
    },
    drive: 'Design elegant systems and structures',
    orientation: 'inward',
    timeFocus: 'future',
    riskTolerance: 'moderate',
    strengths: [
      'Systems design',
      'Structural thinking',
      'Long-term vision',
      'Attention to detail',
    ],
    weaknesses: [
      'Perfectionism',
      'May over-engineer',
      'Slow to ship',
    ],
    stressBehavior: 'Focuses on flaws, keeps iterating',
    growthStrategy: 'Ship imperfect versions, iterate in public',
  },
  {
    id: 'inventor',
    name: 'Inventor',
    suit: 'mind',
    icon: '💡',
    color: SUIT_COLORS.mind,
    traitWeights: {
      openness: 1.0,
      conscientiousness: 0.5,
      extraversion: 0.5,
      emotional_stability: 0.6,
      cognitive_entry: 0.8,
    },
    drive: 'Create novel solutions and possibilities',
    orientation: 'outward',
    timeFocus: 'future',
    riskTolerance: 'high',
    strengths: [
      'Creative problem-solving',
      'Innovation',
      'Curiosity',
      'Experimentation',
    ],
    weaknesses: [
      'May lack follow-through',
      'Can be scattered',
      'Difficulty with routine',
    ],
    stressBehavior: 'Jumps to new ideas, abandons projects',
    growthStrategy: 'Finish what you start, build execution habits',
  },

  // SPIRIT SUIT (Vision)
  {
    id: 'explorer',
    name: 'Explorer',
    suit: 'spirit',
    icon: '🧭',
    color: SUIT_COLORS.spirit,
    traitWeights: {
      openness: 1.0,
      extraversion: 0.7,
      emotional_stability: 0.7,
      conscientiousness: 0.4,
      stress_response: 0.7,
    },
    drive: 'Discover the unknown and expand horizons',
    orientation: 'outward',
    timeFocus: 'future',
    riskTolerance: 'very_high',
    strengths: [
      'Adventurous spirit',
      'Adaptability',
      'Courage',
      'Curiosity',
    ],
    weaknesses: [
      'May lack stability',
      'Can be restless',
      'Difficulty with commitment',
    ],
    stressBehavior: 'Escapes into new adventures, avoids problems',
    growthStrategy: 'Build roots while exploring, honor commitments',
  },
  {
    id: 'creator',
    name: 'Creator',
    suit: 'spirit',
    icon: '🎨',
    color: SUIT_COLORS.spirit,
    traitWeights: {
      openness: 1.0,
      extraversion: 0.5,
      emotional_stability: 0.5,
      conscientiousness: 0.5,
      identity_sensitivity: 0.8,
    },
    drive: 'Express and bring vision into reality',
    orientation: 'inward',
    timeFocus: 'present',
    riskTolerance: 'moderate',
    strengths: [
      'Artistic expression',
      'Originality',
      'Emotional depth',
      'Vision',
    ],
    weaknesses: [
      'May struggle with criticism',
      'Can be moody',
      'Difficulty with constraints',
    ],
    stressBehavior: 'Becomes blocked or overly self-critical',
    growthStrategy: 'Embrace constraints as creative fuel, seek feedback',
  },
  {
    id: 'rebel',
    name: 'Rebel',
    suit: 'spirit',
    icon: '✊',
    color: SUIT_COLORS.spirit,
    traitWeights: {
      openness: 0.9,
      extraversion: 0.7,
      agreeableness: -0.3,
      emotional_stability: 0.6,
      identity_sensitivity: 0.9,
    },
    drive: 'Challenge status quo and forge new paths',
    orientation: 'outward',
    timeFocus: 'present',
    riskTolerance: 'very_high',
    strengths: [
      'Independent thinking',
      'Courage of conviction',
      'Change agent',
      'Authenticity',
    ],
    weaknesses: [
      'May rebel unnecessarily',
      'Can be alienating',
      'Difficulty with authority',
    ],
    stressBehavior: 'Becomes defiant or antagonistic',
    growthStrategy: 'Pick meaningful battles, build alliances',
  },
  {
    id: 'visionary',
    name: 'Visionary',
    suit: 'spirit',
    icon: '🌟',
    color: SUIT_COLORS.spirit,
    traitWeights: {
      openness: 1.0,
      extraversion: 0.6,
      conscientiousness: 0.6,
      emotional_stability: 0.6,
      cognitive_entry: 0.9,
    },
    drive: 'See and communicate transformative possibilities',
    orientation: 'outward',
    timeFocus: 'future',
    riskTolerance: 'high',
    strengths: [
      'Big-picture thinking',
      'Inspirational communication',
      'Future-orientation',
      'Imagination',
    ],
    weaknesses: [
      'May lack grounding',
      'Can be impractical',
      'Difficulty with execution',
    ],
    stressBehavior: 'Escapes into fantasy, avoids present reality',
    growthStrategy: 'Ground visions in actionable steps, partner with executors',
  },
];
