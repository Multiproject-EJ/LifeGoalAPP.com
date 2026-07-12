import assert from 'node:assert/strict';
import { PERSONALITY_QUESTION_BANK, AnswerValue } from '../src/features/identity/personalityTestData';
import {
  isDimensionMeasured,
  scorePersonality,
} from '../src/features/identity/personalityScoring';
import {
  ORDERED_QUIZ_QUESTIONS,
  QUIZ_SECTIONS,
  getQuizPosition,
} from '../src/features/identity/personalityTestSections';

function buildAnswers({ preferHigh }: { preferHigh: boolean }) {
  return PERSONALITY_QUESTION_BANK.reduce<Record<string, AnswerValue>>((acc, question) => {
    const value: AnswerValue = preferHigh
      ? question.reverseScored
        ? 1
        : 5
      : question.reverseScored
        ? 5
        : 1;
    acc[question.id] = value;
    return acc;
  }, {});
}

const maxAnswers = buildAnswers({ preferHigh: true });
const minAnswers = buildAnswers({ preferHigh: false });

const maxScores = scorePersonality(maxAnswers);
const minScores = scorePersonality(minAnswers);

Object.values(maxScores.traits).forEach((score) => assert.equal(score, 100));
Object.values(minScores.traits).forEach((score) => assert.equal(score, 0));

// Measured axes span the full range; unmeasured axes (HEXACO micro-test
// dimensions) must stay pinned at the neutral 50 placeholder.
(Object.keys(maxScores.axes) as (keyof typeof maxScores.axes)[]).forEach((key) => {
  if (isDimensionMeasured(key)) {
    assert.equal(maxScores.axes[key], 100, `${key} should hit 100 with max answers`);
    assert.equal(minScores.axes[key], 0, `${key} should hit 0 with min answers`);
  } else {
    assert.equal(maxScores.axes[key], 50, `${key} is unmeasured and should stay neutral`);
    assert.equal(minScores.axes[key], 50, `${key} is unmeasured and should stay neutral`);
  }
});

assert.equal(isDimensionMeasured('honesty_humility'), false);
assert.equal(isDimensionMeasured('emotionality'), false);

// cognitive_entry direction: high = understand-first / plan-first.
// A consistent plan-first person (disagrees with dive-in, agrees with
// big-picture-first) must land at the top of the axis.
const planFirstAnswers = {
  ...buildAnswers({ preferHigh: true }),
  custom_cognitive_entry_01: 1 as AnswerValue, // "dive in and learn by doing" — disagree
  custom_cognitive_entry_02: 5 as AnswerValue, // "big picture and a plan first" — agree
};
assert.equal(scorePersonality(planFirstAnswers).axes.cognitive_entry, 100);

const diveInAnswers = {
  ...buildAnswers({ preferHigh: true }),
  custom_cognitive_entry_01: 5 as AnswerValue,
  custom_cognitive_entry_02: 1 as AnswerValue,
};
assert.equal(scorePersonality(diveInAnswers).axes.cognitive_entry, 0);

// Quiz sections must cover the entire question bank exactly once — the quiz
// iterates ORDERED_QUIZ_QUESTIONS while scoring asserts every bank question
// is answered, so any drift here would strand users mid-test.
const orderedIds = ORDERED_QUIZ_QUESTIONS.map((question) => question.id);
assert.equal(orderedIds.length, PERSONALITY_QUESTION_BANK.length);
assert.equal(new Set(orderedIds).size, orderedIds.length, 'duplicate question in sections');
PERSONALITY_QUESTION_BANK.forEach((question) => {
  assert.ok(orderedIds.includes(question.id), `question ${question.id} missing from quiz sections`);
});

// Position helper must agree with the section layout at every boundary.
let flatIndex = 0;
QUIZ_SECTIONS.forEach((section, sectionIndex) => {
  section.questionIds.forEach((_, questionIndex) => {
    const position = getQuizPosition(flatIndex);
    assert.equal(position.sectionIndex, sectionIndex);
    assert.equal(position.questionInSection, questionIndex + 1);
    assert.equal(position.sectionSize, section.questionIds.length);
    flatIndex += 1;
  });
});

console.log('Personality scoring checks passed.');
