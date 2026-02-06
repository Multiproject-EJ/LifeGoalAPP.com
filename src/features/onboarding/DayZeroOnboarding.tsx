import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { recordTelemetryEvent } from '../../services/telemetry';

type OnboardingFieldState = {
  lifeArea: string;
  habit: string;
  reminder: string;
  reward: string;
};

type OnboardingStep = {
  id: string;
  title: string;
  prompt: string;
};

const LIFE_AREAS = ['Health', 'Mind', 'Relationships', 'Work', 'Home', 'Growth'];
const HABIT_EXAMPLES = ['Drink water', '2-minute stretch', 'Write 1 sentence'];
const REMINDER_OPTIONS = ['Morning', 'Afternoon', 'Evening', 'No reminder'];
const REWARD_SUGGESTIONS = ['10 min YouTube', 'Coffee break', 'Walk outside', 'Music + chill'];

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Let’s make one tiny win.',
    prompt: 'Pick a life area, add a small habit, and claim a reward today.',
  },
  {
    id: 'area',
    title: 'Where do you want a tiny win?',
    prompt: 'Just one. You can add more later.',
  },
  {
    id: 'habit',
    title: 'What’s the smallest version you can do today?',
    prompt: 'If it takes longer than 2 minutes, shrink it.',
  },
  {
    id: 'time',
    title: 'When should we remind you?',
    prompt: 'You can change this anytime.',
  },
  {
    id: 'reward',
    title: 'Pick a reward you actually want.',
    prompt: 'Short rewards work best at first.',
  },
  {
    id: 'contract',
    title: 'Ready for your first win?',
    prompt: 'Review your tiny loop and start now.',
  },
  {
    id: 'complete',
    title: 'Nice. That’s a real win.',
    prompt: 'Claim your reward now or bank it for later.',
  },
];

type DayZeroOnboardingProps = {
  session: Session;
  profileSaving: boolean;
  setProfileSaving: (value: boolean) => void;
  setAuthMessage: (value: string | null) => void;
  setAuthError: (value: string | null) => void;
  isDemoExperience: boolean;
  onSaveDemoProfile: (payload: { displayName: string; onboardingComplete: boolean }) => void;
  onClose: () => void;
};

export function DayZeroOnboarding({
  session,
  profileSaving,
  setProfileSaving,
  setAuthMessage,
  setAuthError,
  isDemoExperience,
  onSaveDemoProfile,
  onClose,
}: DayZeroOnboardingProps) {
  const { client } = useSupabaseAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [fields, setFields] = useState<OnboardingFieldState>({
    lifeArea: '',
    habit: '',
    reminder: '',
    reward: '',
  });
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);

  const storageKey = useMemo(() => `day_zero_onboarding_${session.user.id}`, [session.user.id]);
  const step = ONBOARDING_STEPS[stepIndex];
  const progressLabel = `Step ${stepIndex + 1} of ${ONBOARDING_STEPS.length}`;

  useEffect(() => {
    if (typeof window === 'undefined' || hasLoadedStorage) return;
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      setHasLoadedStorage(true);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as {
        stepIndex: number;
        fields: OnboardingFieldState;
      };
      if (typeof parsed.stepIndex === 'number') {
        setStepIndex(Math.min(parsed.stepIndex, ONBOARDING_STEPS.length - 1));
      }
      if (parsed.fields) {
        setFields(parsed.fields);
      }
    } catch (error) {
      console.warn('Unable to restore day zero onboarding state.', error);
    } finally {
      setHasLoadedStorage(true);
    }
  }, [hasLoadedStorage, storageKey]);

  useEffect(() => {
    if (!hasLoadedStorage || typeof window === 'undefined') return;
    const payload = JSON.stringify({ stepIndex, fields });
    window.localStorage.setItem(storageKey, payload);
  }, [fields, hasLoadedStorage, stepIndex, storageKey]);

  const updateField = (key: keyof OnboardingFieldState, value: string) => {
    setFields((current) => ({ ...current, [key]: value }));
  };

  const canContinue = () => {
    if (step.id === 'area') return Boolean(fields.lifeArea);
    if (step.id === 'habit') return Boolean(fields.habit.trim());
    if (step.id === 'time') return Boolean(fields.reminder);
    if (step.id === 'reward') return Boolean(fields.reward.trim());
    return true;
  };

  const goNext = () => {
    setStepIndex((current) => Math.min(current + 1, ONBOARDING_STEPS.length - 1));
  };

  const goBack = () => {
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  const handleCompleteOnboarding = async () => {
    setProfileSaving(true);
    setAuthMessage(null);
    setAuthError(null);

    try {
      if (isDemoExperience) {
        onSaveDemoProfile({
          displayName: session.user.user_metadata?.full_name ?? session.user.email ?? 'Player',
          onboardingComplete: true,
        });
      } else {
        if (!client) {
          throw new Error('Supabase client is not ready.');
        }
        const { error } = await client.auth.updateUser({
          data: {
            onboarding_complete: true,
          },
        });
        if (error) throw error;
      }

      void recordTelemetryEvent({
        userId: session.user.id,
        eventType: 'onboarding_completed',
        metadata: {
          life_area: fields.lifeArea,
          habit: fields.habit,
          reminder: fields.reminder,
          reward: fields.reward,
        },
      });

      setAuthMessage('Quick-start complete! Welcome to LifeGoalApp.');
      window.localStorage.removeItem(storageKey);
      onClose();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to complete onboarding.');
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <section className="day-zero-onboarding" aria-label="Day zero onboarding">
      <header className="day-zero-onboarding__header">
        <div>
          <p className="day-zero-onboarding__eyebrow">Quick start</p>
          <h3>{step.title}</h3>
          <p>{step.prompt}</p>
        </div>
        <div className="day-zero-onboarding__header-actions">
          <span className="day-zero-onboarding__progress">{progressLabel}</span>
          <button type="button" className="day-zero-onboarding__close" onClick={onClose}>
            Close
          </button>
        </div>
      </header>

      <div className="day-zero-onboarding__body">
        {step.id === 'welcome' && (
          <div className="day-zero-onboarding__panel">
            <div className="day-zero-onboarding__welcome">
              <div className="day-zero-onboarding__welcome-art" aria-hidden="true">
                ✨
              </div>
              <p>Start in 60 seconds with one tiny habit and a reward you want today.</p>
            </div>
            <button type="button" className="day-zero-onboarding__primary" onClick={goNext}>
              Start in 60 seconds
            </button>
            <button type="button" className="day-zero-onboarding__secondary" onClick={goNext}>
              See how it works
            </button>
          </div>
        )}

        {step.id === 'area' && (
          <div className="day-zero-onboarding__panel">
            <div className="day-zero-onboarding__choice-grid">
              {LIFE_AREAS.map((area) => (
                <button
                  key={area}
                  type="button"
                  className={`day-zero-onboarding__choice${
                    fields.lifeArea === area ? ' is-selected' : ''
                  }`}
                  onClick={() => updateField('lifeArea', area)}
                >
                  {area}
                </button>
              ))}
            </div>
            <div className="day-zero-onboarding__actions">
              <button type="button" className="day-zero-onboarding__secondary" onClick={goBack}>
                Back
              </button>
              <button
                type="button"
                className="day-zero-onboarding__primary"
                onClick={goNext}
                disabled={!canContinue()}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step.id === 'habit' && (
          <div className="day-zero-onboarding__panel">
            <label className="day-zero-onboarding__label" htmlFor="day-zero-habit">
              Tiny habit
            </label>
            <input
              id="day-zero-habit"
              type="text"
              className="day-zero-onboarding__input"
              placeholder="Type your tiny habit"
              value={fields.habit}
              onChange={(event) => updateField('habit', event.target.value)}
            />
            <div className="day-zero-onboarding__pill-row">
              {HABIT_EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  className="day-zero-onboarding__pill"
                  onClick={() => updateField('habit', example)}
                >
                  {example}
                </button>
              ))}
            </div>
            <div className="day-zero-onboarding__actions">
              <button type="button" className="day-zero-onboarding__secondary" onClick={goBack}>
                Back
              </button>
              <button
                type="button"
                className="day-zero-onboarding__primary"
                onClick={goNext}
                disabled={!canContinue()}
              >
                Looks good
              </button>
            </div>
          </div>
        )}

        {step.id === 'time' && (
          <div className="day-zero-onboarding__panel">
            <div className="day-zero-onboarding__choice-row">
              {REMINDER_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`day-zero-onboarding__choice${
                    fields.reminder === option ? ' is-selected' : ''
                  }`}
                  onClick={() => updateField('reminder', option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="day-zero-onboarding__actions">
              <button type="button" className="day-zero-onboarding__secondary" onClick={goBack}>
                Back
              </button>
              <button
                type="button"
                className="day-zero-onboarding__primary"
                onClick={goNext}
                disabled={!canContinue()}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step.id === 'reward' && (
          <div className="day-zero-onboarding__panel">
            <label className="day-zero-onboarding__label" htmlFor="day-zero-reward">
              Reward
            </label>
            <input
              id="day-zero-reward"
              type="text"
              className="day-zero-onboarding__input"
              placeholder="Type your reward"
              value={fields.reward}
              onChange={(event) => updateField('reward', event.target.value)}
            />
            <div className="day-zero-onboarding__pill-row">
              {REWARD_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="day-zero-onboarding__pill"
                  onClick={() => updateField('reward', suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <div className="day-zero-onboarding__actions">
              <button type="button" className="day-zero-onboarding__secondary" onClick={goBack}>
                Back
              </button>
              <button
                type="button"
                className="day-zero-onboarding__primary"
                onClick={goNext}
                disabled={!canContinue()}
              >
                Set reward
              </button>
            </div>
          </div>
        )}

        {step.id === 'contract' && (
          <div className="day-zero-onboarding__panel">
            <div className="day-zero-onboarding__summary-card">
              <p>
                <strong>Habit:</strong> {fields.habit || '—'}
              </p>
              <p>
                <strong>Reward:</strong> {fields.reward || '—'}
              </p>
              <p>
                <strong>Time:</strong> {fields.reminder || '—'}
              </p>
            </div>
            <div className="day-zero-onboarding__actions day-zero-onboarding__actions--stack">
              <button type="button" className="day-zero-onboarding__primary" onClick={goNext}>
                Do it now
              </button>
              <button type="button" className="day-zero-onboarding__secondary" onClick={onClose}>
                I’ll do it later
              </button>
            </div>
          </div>
        )}

        {step.id === 'complete' && (
          <div className="day-zero-onboarding__panel">
            <div className="day-zero-onboarding__celebration" aria-live="polite">
              <span role="img" aria-label="celebration">
                🎉
              </span>
              <p>Nice. That’s a real win.</p>
            </div>
            <div className="day-zero-onboarding__actions day-zero-onboarding__actions--stack">
              <button
                type="button"
                className="day-zero-onboarding__primary"
                onClick={() => void handleCompleteOnboarding()}
                disabled={profileSaving}
              >
                {profileSaving ? 'Saving...' : 'Redeem now'}
              </button>
              <button
                type="button"
                className="day-zero-onboarding__secondary"
                onClick={() => void handleCompleteOnboarding()}
                disabled={profileSaving}
              >
                Bank it
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
