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
import { mergeMicroTestScores } from '../src/features/identity/microTests/microTestApply';
import type { MicroTestResult } from '../src/features/identity/microTests/microTestScoring';
import { evaluateAvailableMicroTests } from '../src/features/identity/microTests/microTestTriggers';

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

// ── Micro-test wiring ───────────────────────────────────────────────────────

const foundation = scorePersonality(buildAnswers({ preferHigh: false }));
// Sanity: foundation leaves the unmeasured HEXACO axes at neutral 50.
assert.equal(foundation.axes.honesty_humility, 50);
assert.equal(foundation.axes.emotionality, 50);

const now = new Date('2026-07-12T00:00:00Z');

// A HEXACO micro-test reveals the two deeper axes and writes their values
// directly (no foundation anchor to blend against).
const hexacoResult: MicroTestResult = {
  microTestId: 'micro_hexaco_intro',
  takenAt: now,
  dimensionScores: { honesty_humility: 80, emotionality: 30 },
};
const mergedHexaco = mergeMicroTestScores(foundation, [hexacoResult], now);
assert.ok(mergedHexaco.measured.has('honesty_humility'), 'honesty_humility now measured');
assert.ok(mergedHexaco.measured.has('emotionality'), 'emotionality now measured');
assert.equal(mergedHexaco.scores.axes.honesty_humility, 80);
assert.equal(mergedHexaco.scores.axes.emotionality, 30);

// A foundation-measured dimension (extraversion via confirm-dominant) blends
// with the foundation value and is clamped to the ±15 guardrail.
const extravertFoundation = scorePersonality(buildAnswers({ preferHigh: true }));
const neutralExtra = { ...extravertFoundation, traits: { ...extravertFoundation.traits, extraversion: 50 } };
const confirmResult: MicroTestResult = {
  microTestId: 'micro_confirm_dominant',
  takenAt: now,
  dimensionScores: { extraversion: 90 },
};
const mergedConfirm = mergeMicroTestScores(neutralExtra, [confirmResult], now);
assert.equal(mergedConfirm.scores.traits.extraversion, 65, 'extraversion blends, clamped to +15');

// No micro-tests → scores and measured set are unchanged from foundation.
const mergedNone = mergeMicroTestScores(foundation, [], now);
assert.equal(mergedNone.measured.has('honesty_humility'), false);
assert.deepEqual(mergedNone.scores.axes, foundation.axes);

// Triggers: nothing is available until a foundation test exists; once it does,
// HEXACO is reachable without a high level.
const noFoundation = {
  level: 1,
  currentStreakDays: 0,
  daysSinceFoundationTest: 0,
  completedMicroTests: [],
  foundationTestTaken: false,
};
assert.equal(evaluateAvailableMicroTests(noFoundation).length, 0, 'no tests without foundation');
const withFoundation = { ...noFoundation, foundationTestTaken: true };
assert.ok(
  evaluateAvailableMicroTests(withFoundation).some((t) => t.microTestId === 'micro_hexaco_intro'),
  'HEXACO available right after foundation, not gated behind level 5',
);
const hexacoDone = { ...withFoundation, completedMicroTests: ['micro_hexaco_intro'] };
assert.ok(
  !evaluateAvailableMicroTests(hexacoDone).some((t) => t.microTestId === 'micro_hexaco_intro'),
  'HEXACO no longer offered once completed',
);

console.log('Personality scoring checks passed.');
