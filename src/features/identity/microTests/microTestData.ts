import type { AnswerValue } from '../personalityTestData';

export type MicroTestTarget =
  | 'hexaco_dimension' // Measures HEXACO dimensions
  | 'card_confirmation' // Confirms/levels up a specific archetype card
  | 'suit_depth' // Explores deeper within a suit
  | 'shadow_exploration'; // Explores shadow card

export type MicroTestQuestion = {
  id: string;
  text: string;
  dimensionKey: string; // What dimension this question measures
  reverseScored: boolean;
};

export type MicroTestDefinition = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  target: MicroTestTarget;
  estimatedSeconds: number;
  questions: MicroTestQuestion[];
};

/**
 * HEXACO Intro Micro-Test
 * Measures Honesty-Humility and Emotionality dimensions (6 questions)
 */
export const MICRO_TEST_HEXACO_INTRO: MicroTestDefinition = {
  id: 'micro_hexaco_intro',
  title: 'HEXACO Dimensions',
  subtitle: 'Unlock deeper personality insights',
  icon: '🔍',
  target: 'hexaco_dimension',
  estimatedSeconds: 60,
  questions: [
    {
      id: 'hexaco_hh_01',
      text: 'I would be tempted to use counterfeit money, if I were sure I could get away with it.',
      dimensionKey: 'honesty_humility',
      reverseScored: true,
    },
    {
      id: 'hexaco_hh_02',
      text: 'I would never accept a bribe, even if it were very large.',
      dimensionKey: 'honesty_humility',
      reverseScored: false,
    },
    {
      id: 'hexaco_hh_03',
      text: 'I would be tempted to buy stolen property if I were financially tight.',
      dimensionKey: 'honesty_humility',
      reverseScored: true,
    },
    {
      id: 'hexaco_em_01',
      text: 'I sometimes cannot help worrying about little things.',
      dimensionKey: 'emotionality',
      reverseScored: false,
    },
    {
      id: 'hexaco_em_02',
      text: 'I rarely feel fearful or anxious.',
      dimensionKey: 'emotionality',
      reverseScored: true,
    },
    {
      id: 'hexaco_em_03',
      text: 'I feel strong emotions when someone close to me is going through a difficult time.',
      dimensionKey: 'emotionality',
      reverseScored: false,
    },
  ],
};

/**
 * Dominant Card Confirmation Micro-Test
 * Confirms the dominant archetype card (4 questions)
 */
export const MICRO_TEST_CONFIRM_DOMINANT: MicroTestDefinition = {
  id: 'micro_confirm_dominant',
  title: 'Confirm Your Dominant Card',
  subtitle: 'Validate your primary archetype',
  icon: '🎯',
  target: 'card_confirmation',
  estimatedSeconds: 45,
  questions: [
    {
      id: 'confirm_dom_01',
      text: 'In group settings, I naturally take charge and organize people toward a goal.',
      dimensionKey: 'extraversion',
      reverseScored: false,
    },
    {
      id: 'confirm_dom_02',
      text: 'I prefer to lead rather than follow when working on projects.',
      dimensionKey: 'extraversion',
      reverseScored: false,
    },
    {
      id: 'confirm_dom_03',
      text: 'I feel energized when directing others and making decisions.',
      dimensionKey: 'extraversion',
      reverseScored: false,
    },
    {
      id: 'confirm_dom_04',
      text: 'I am comfortable being the person others look to for guidance.',
      dimensionKey: 'extraversion',
      reverseScored: false,
    },
  ],
};

/**
 * Registry of all available micro-tests
 */
export const MICRO_TEST_REGISTRY: Record<string, MicroTestDefinition> = {
  [MICRO_TEST_HEXACO_INTRO.id]: MICRO_TEST_HEXACO_INTRO,
  [MICRO_TEST_CONFIRM_DOMINANT.id]: MICRO_TEST_CONFIRM_DOMINANT,
};

/**
 * Score a micro-test (similar to personality test scoring)
 */
export function scoreMicroTest(
  answers: Record<string, AnswerValue>,
  definition: MicroTestDefinition,
): Record<string, number> {
  const dimensionTotals: Record<string, { sum: number; count: number }> = {};

  definition.questions.forEach((question) => {
    const answer = answers[question.id];
    if (answer === undefined) {
      return; // Skip unanswered questions
    }

    const scored = question.reverseScored ? 6 - answer : answer;
    const key = question.dimensionKey;

    if (!dimensionTotals[key]) {
      dimensionTotals[key] = { sum: 0, count: 0 };
    }

    dimensionTotals[key].sum += scored;
    dimensionTotals[key].count += 1;
  });

  // Convert to 0-100 scale
  const result: Record<string, number> = {};
  Object.entries(dimensionTotals).forEach(([key, { sum, count }]) => {
    if (count > 0) {
      const average = sum / count;
      result[key] = Math.round(((average - 1) / 4) * 100);
    }
  });

  return result;
}
