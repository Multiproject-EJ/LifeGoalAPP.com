import {
  AxisKey,
  AnswerValue,
  PERSONALITY_QUESTION_BANK,
  PersonalityQuestion,
  TraitKey,
} from './personalityTestData';

type ScoreRecord<T extends string> = Record<T, number>;

type ScoreTotals<T extends string> = Record<T, { sum: number; count: number }>;

export type PersonalityScores = {
  traits: ScoreRecord<TraitKey>;
  axes: ScoreRecord<AxisKey>;
  hexaco?: Partial<Record<string, number>>; // Optional HEXACO scores from micro-tests
};

const TRAIT_KEYS: TraitKey[] = [
  'openness',
  'conscientiousness',
  'extraversion',
  'agreeableness',
  'emotional_stability',
];

const AXIS_KEYS: AxisKey[] = [
  'regulation_style',
  'stress_response',
  'identity_sensitivity',
  'cognitive_entry',
  'honesty_humility',
  'emotionality',
];

function createTotals<T extends string>(keys: T[]): ScoreTotals<T> {
  return keys.reduce((acc, key) => {
    acc[key] = { sum: 0, count: 0 };
    return acc;
  }, {} as ScoreTotals<T>);
}

function normalizeAverageToPercent(average: number): number {
  return Math.round(((average - 1) / 4) * 100);
}

function applyReverseScore(value: AnswerValue, reverseScored: boolean): number {
  return reverseScored ? 6 - value : value;
}

function assertAnswer(question: PersonalityQuestion, value: AnswerValue | undefined): AnswerValue {
  if (value === undefined) {
    throw new Error(`Missing answer for question ${question.id}`);
  }
  return value;
}

export function scorePersonality(
  answers: Record<string, AnswerValue>,
): PersonalityScores {
  const traitTotals = createTotals(TRAIT_KEYS);
  const axisTotals = createTotals(AXIS_KEYS);

  PERSONALITY_QUESTION_BANK.forEach((question) => {
    const answer = assertAnswer(question, answers[question.id]);
    const scored = applyReverseScore(answer, question.reverseScored);

    if (question.axisType === 'big5') {
      const key = question.dimensionKey as TraitKey;
      traitTotals[key].sum += scored;
      traitTotals[key].count += 1;
    } else {
      const key = question.dimensionKey as AxisKey;
      axisTotals[key].sum += scored;
      axisTotals[key].count += 1;
    }
  });

  const traits = TRAIT_KEYS.reduce((acc, key) => {
    const { sum, count } = traitTotals[key];
    const average = count > 0 ? sum / count : 1;
    acc[key] = normalizeAverageToPercent(average);
    return acc;
  }, {} as ScoreRecord<TraitKey>);

  const axes = AXIS_KEYS.reduce((acc, key) => {
    const { sum, count } = axisTotals[key];
    const average = count > 0 ? sum / count : 1;
    acc[key] = normalizeAverageToPercent(average);
    return acc;
  }, {} as ScoreRecord<AxisKey>);

  return { traits, axes };
}
