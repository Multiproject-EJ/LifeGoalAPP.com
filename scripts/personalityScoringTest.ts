import assert from 'node:assert/strict';
import { PERSONALITY_QUESTION_BANK, AnswerValue } from '../src/features/identity/personalityTestData';
import { scorePersonality } from '../src/features/identity/personalityScoring';

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
Object.values(maxScores.axes).forEach((score) => assert.equal(score, 100));
Object.values(minScores.traits).forEach((score) => assert.equal(score, 0));
Object.values(minScores.axes).forEach((score) => assert.equal(score, 0));

console.log('Personality scoring checks passed.');
