import React, { useState, useMemo } from 'react';
import type { AnswerValue } from '../personalityTestData';
import type { MicroTestDefinition } from './microTestData';
import type { MicroTestResult } from './microTestScoring';

type MicroTestFlowProps = {
  microTest: MicroTestDefinition;
  onComplete: (result: MicroTestResult) => void;
  onCancel?: () => void;
};

type AnswerOption = {
  value: AnswerValue;
  label: string;
};

const ANSWER_OPTIONS: AnswerOption[] = [
  { value: 1, label: 'Strongly disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly agree' },
];

/**
 * Compact quiz UI for micro-tests.
 * Reuses Likert scale pattern from PersonalityTest with compact layout.
 */
export function MicroTestFlow({ microTest, onComplete, onCancel }: MicroTestFlowProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [startTime] = useState(Date.now());

  const currentQuestion = microTest.questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion.id];
  const progress = ((currentQuestionIndex + 1) / microTest.questions.length) * 100;
  const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
  const estimatedRemaining = Math.max(0, microTest.estimatedSeconds - elapsedSeconds);

  const handleAnswer = (value: AnswerValue) => {
    setAnswers({ ...answers, [currentQuestion.id]: value });
  };

  const handleNext = () => {
    if (currentQuestionIndex < microTest.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Quiz complete - compute scores
      const dimensionScores = computeDimensionScores(microTest, answers);
      const result: MicroTestResult = {
        microTestId: microTest.id,
        takenAt: new Date(),
        dimensionScores,
      };
      onComplete(result);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const canProceed = currentAnswer !== undefined;
  const isLastQuestion = currentQuestionIndex === microTest.questions.length - 1;

  return (
    <div className="micro-test-flow">
      {/* Header */}
      <div className="micro-test-flow__header">
        <div className="micro-test-flow__icon">{microTest.icon}</div>
        <h2 className="micro-test-flow__title">{microTest.title}</h2>
        <p className="micro-test-flow__subtitle">{microTest.subtitle}</p>
      </div>

      {/* Progress */}
      <div className="micro-test-flow__progress">
        <span className="micro-test-flow__progress-text">
          Question {currentQuestionIndex + 1} / {microTest.questions.length}
        </span>
        <div className="micro-test-flow__progress-bar">
          <div
            className="micro-test-flow__progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="micro-test-flow__progress-text">
          ~{estimatedRemaining}s
        </span>
      </div>

      {/* Question */}
      <div className="micro-test-flow__question">
        <p className="micro-test-flow__question-text">
          {currentQuestion.text}
        </p>

        {/* Answer Options */}
        <div className="micro-test-flow__options">
          {ANSWER_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`micro-test-flow__option ${
                currentAnswer === option.value ? 'micro-test-flow__option--selected' : ''
              }`}
              onClick={() => handleAnswer(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="micro-test-flow__nav">
        {currentQuestionIndex > 0 && (
          <button
            className="micro-test-flow__nav-btn micro-test-flow__nav-btn--back"
            onClick={handleBack}
          >
            ← Back
          </button>
        )}
        {onCancel && currentQuestionIndex === 0 && (
          <button
            className="micro-test-flow__nav-btn micro-test-flow__nav-btn--back"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
        <button
          className="micro-test-flow__nav-btn micro-test-flow__nav-btn--next"
          onClick={handleNext}
          disabled={!canProceed}
        >
          {isLastQuestion ? 'Complete' : 'Next →'}
        </button>
      </div>

      {/* Time estimate */}
      <div className="micro-test-flow__time">
        Estimated time: ~{microTest.estimatedSeconds}s
      </div>
    </div>
  );
}

/**
 * Compute dimension scores from micro-test answers
 */
function computeDimensionScores(
  microTest: MicroTestDefinition,
  answers: Record<string, AnswerValue>,
): Record<string, number> {
  const dimensionTotals: Record<string, { sum: number; count: number }> = {};

  microTest.questions.forEach((question) => {
    const answer = answers[question.id];
    if (answer === undefined) return;

    const score = question.reverseScored ? 6 - answer : answer;
    const dimension = question.dimensionKey;

    if (!dimensionTotals[dimension]) {
      dimensionTotals[dimension] = { sum: 0, count: 0 };
    }

    dimensionTotals[dimension].sum += score;
    dimensionTotals[dimension].count += 1;
  });

  // Convert to 0-100 scale
  const dimensionScores: Record<string, number> = {};
  Object.entries(dimensionTotals).forEach(([dimension, { sum, count }]) => {
    const average = sum / count;
    dimensionScores[dimension] = Math.round(((average - 1) / 4) * 100);
  });

  return dimensionScores;
}
