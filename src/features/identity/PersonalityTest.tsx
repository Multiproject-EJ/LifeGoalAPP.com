import React, { useMemo, useState } from 'react';

import {
  AnswerValue,
  PERSONALITY_QUESTION_BANK,
  PersonalityQuestion,
} from './personalityTestData';
import { PersonalityScores, scorePersonality } from './personalityScoring';

type TestStep = 'intro' | 'quiz' | 'results';

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

const TRAIT_LABELS: Record<keyof PersonalityScores['traits'], string> = {
  openness: 'Openness',
  conscientiousness: 'Conscientiousness',
  extraversion: 'Extraversion',
  agreeableness: 'Agreeableness',
  emotional_stability: 'Emotional Stability',
};

const AXIS_LABELS: Record<keyof PersonalityScores['axes'], string> = {
  regulation_style: 'Regulation Style',
  stress_response: 'Stress Response',
  identity_sensitivity: 'Identity Sensitivity',
  cognitive_entry: 'Cognitive Entry',
};

export default function PersonalityTest() {
  const [step, setStep] = useState<TestStep>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});

  const currentQuestion: PersonalityQuestion | undefined =
    PERSONALITY_QUESTION_BANK[currentIndex];

  const scores = useMemo<PersonalityScores | null>(() => {
    if (step !== 'results') {
      return null;
    }

    return scorePersonality(answers);
  }, [answers, step]);

  const handleStart = () => {
    setStep('quiz');
    setCurrentIndex(0);
    setAnswers({});
  };

  const handleSelect = (value: AnswerValue) => {
    if (!currentQuestion) {
      return;
    }

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  };

  const handleNext = () => {
    if (!currentQuestion) {
      return;
    }

    if (!answers[currentQuestion.id]) {
      return;
    }

    if (currentIndex >= PERSONALITY_QUESTION_BANK.length - 1) {
      setStep('results');
      return;
    }

    setCurrentIndex((prev) => prev + 1);
  };

  const handleBack = () => {
    if (currentIndex === 0) {
      setStep('intro');
      return;
    }

    setCurrentIndex((prev) => prev - 1);
  };

  const handleRetake = () => {
    setStep('quiz');
    setCurrentIndex(0);
    setAnswers({});
  };

  return (
    <section className="identity-hub">
      <div className="identity-hub__header">
        <div>
          <h2 className="identity-hub__title">🪪 Personality Test</h2>
          <p className="identity-hub__subtitle">
            Get a quick snapshot of how you think, feel, and show up each day.
          </p>
        </div>
      </div>

      {step === 'intro' && (
        <div className="identity-hub__card">
          <h3 className="identity-hub__card-title">Start your Personality Test</h3>
          <p className="identity-hub__card-text">
            Answer a few short prompts to personalize your goals, habits, and daily focus. Your
            results will live here in your ID space.
          </p>
          <button className="identity-hub__cta" type="button" onClick={handleStart}>
            Start
          </button>
        </div>
      )}

      {step === 'quiz' && currentQuestion && (
        <div className="identity-hub__card">
          <div className="identity-hub__progress">
            Question {currentIndex + 1} of {PERSONALITY_QUESTION_BANK.length}
          </div>
          <h3 className="identity-hub__card-title">{currentQuestion.text}</h3>
          <div className="identity-hub__options">
            {ANSWER_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={`identity-hub__option${
                  answers[currentQuestion.id] === option.value
                    ? ' identity-hub__option--selected'
                    : ''
                }`}
                type="button"
                onClick={() => handleSelect(option.value)}
              >
                <span className="identity-hub__option-value">{option.value}</span>
                <span className="identity-hub__option-label">{option.label}</span>
              </button>
            ))}
          </div>
          <div className="identity-hub__actions">
            <button className="identity-hub__secondary" type="button" onClick={handleBack}>
              Back
            </button>
            <button
              className="identity-hub__cta"
              type="button"
              onClick={handleNext}
              disabled={!answers[currentQuestion.id]}
            >
              {currentIndex === PERSONALITY_QUESTION_BANK.length - 1
                ? 'See results'
                : 'Next'}
            </button>
          </div>
        </div>
      )}

      {step === 'results' && scores && (
        <div className="identity-hub__card">
          <h3 className="identity-hub__card-title">Your snapshot results</h3>
          <p className="identity-hub__card-text">
            Here is a quick preview based on your answers. Full insights and recommendations
            will appear in the next step.
          </p>
          <div className="identity-hub__results">
            <div>
              <h4 className="identity-hub__results-title">Big Five</h4>
              <ul className="identity-hub__results-list">
                {Object.entries(scores.traits).map(([key, value]) => (
                  <li key={key} className="identity-hub__results-item">
                    <span>{TRAIT_LABELS[key as keyof PersonalityScores['traits']]}</span>
                    <span>{value}%</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="identity-hub__results-title">Custom Axes</h4>
              <ul className="identity-hub__results-list">
                {Object.entries(scores.axes).map(([key, value]) => (
                  <li key={key} className="identity-hub__results-item">
                    <span>{AXIS_LABELS[key as keyof PersonalityScores['axes']]}</span>
                    <span>{value}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="identity-hub__actions">
            <button className="identity-hub__secondary" type="button" onClick={handleRetake}>
              Retake
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
