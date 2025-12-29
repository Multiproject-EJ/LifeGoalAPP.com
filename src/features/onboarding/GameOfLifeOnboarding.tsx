import {
  Dispatch,
  FormEvent,
  SetStateAction,
  useMemo,
  useState,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { recordTelemetryEvent } from '../../services/telemetry';

const AXES = [
  {
    title: 'Agency',
    description: 'Make clear choices and follow through on what matters most.',
    icon: '🧭',
  },
  {
    title: 'Awareness',
    description: 'Notice patterns, emotions, and signals in your day-to-day rhythm.',
    icon: '🌤️',
  },
  {
    title: 'Rationality',
    description: 'Challenge assumptions and capture what you might be wrong about.',
    icon: '🧠',
  },
  {
    title: 'Vitality',
    description: 'Build energy with habits that keep your body and mind strong.',
    icon: '⚡️',
  },
];

const STEPS = [
  {
    title: 'Welcome to Game of Life',
    lead:
      'Game of Life turns your daily rituals into a living strategy board, so you can see progress across every part of your life.',
  },
  {
    title: 'Balance the four axes',
    lead:
      'Your dashboard tracks balance across Agency, Awareness, Rationality, and Vitality. The goal is harmony, not perfection.',
  },
  {
    title: 'Set your profile',
    lead: 'Share a display name so your Game of Life journey feels personal and trackable.',
  },
];

type GameOfLifeOnboardingProps = {
  session: Session;
  displayName: string;
  setDisplayName: Dispatch<SetStateAction<string>>;
  profileSaving: boolean;
  setProfileSaving: Dispatch<SetStateAction<boolean>>;
  setAuthMessage: Dispatch<SetStateAction<string | null>>;
  setAuthError: Dispatch<SetStateAction<string | null>>;
  isDemoExperience: boolean;
  onSaveDemoProfile: (payload: { displayName: string; onboardingComplete: boolean }) => void;
  onNavigateDashboard: () => void;
  onOpenCoach: () => void;
};

export function GameOfLifeOnboarding({
  session,
  displayName,
  setDisplayName,
  profileSaving,
  setProfileSaving,
  setAuthMessage,
  setAuthError,
  isDemoExperience,
  onSaveDemoProfile,
  onNavigateDashboard,
  onOpenCoach,
}: GameOfLifeOnboardingProps) {
  const { client } = useSupabaseAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [pendingDestination, setPendingDestination] = useState<'dashboard' | 'coach' | null>(null);

  const step = STEPS[Math.min(stepIndex, STEPS.length - 1)];
  const isFinalStep = stepIndex >= STEPS.length - 1;

  const progressLabel = useMemo(() => {
    const current = Math.min(stepIndex + 1, STEPS.length);
    return `Step ${current} of ${STEPS.length}`;
  }, [stepIndex]);

  const handleNext = () => {
    setStepIndex((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileSaving(true);
    setAuthMessage(null);
    setAuthError(null);

    const nextName = displayName.trim() || session.user.email || 'Game of Life Player';

    try {
      if (isDemoExperience) {
        onSaveDemoProfile({
          displayName: nextName,
          onboardingComplete: true,
        });
      } else {
        if (!client) {
          throw new Error('Supabase client is not ready.');
        }
        const { error } = await client.auth.updateUser({
          data: {
            full_name: nextName,
            onboarding_complete: true,
          },
        });
        if (error) throw error;
      }

      setAuthMessage('Profile saved! Welcome to Game of Life.');
      void recordTelemetryEvent({
        userId: session.user.id,
        eventType: 'onboarding_completed',
      });

      if ((pendingDestination ?? 'dashboard') === 'coach') {
        onOpenCoach();
      } else {
        onNavigateDashboard();
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to save your profile.');
    } finally {
      setProfileSaving(false);
      setPendingDestination(null);
    }
  };

  return (
    <section className="gol-onboarding" aria-label="Game of Life onboarding">
      <header className="gol-onboarding__header">
        <span className="gol-onboarding__step" aria-live="polite" aria-atomic="true">
          {progressLabel}
        </span>
        <h3>{step.title}</h3>
        <p>{step.lead}</p>
      </header>

      {stepIndex === 0 ? (
        <div className="gol-onboarding__panel">
          <p>
            Start with a 60-second tour so you know how to earn balance points, build streaks, and keep your
            Game of Life story moving forward.
          </p>
          <div className="gol-onboarding__actions">
            <button type="button" className="supabase-auth__action" onClick={handleNext}>
              Start the tour
            </button>
          </div>
        </div>
      ) : null}

      {stepIndex === 1 ? (
        <div className="gol-onboarding__panel">
          <ul className="gol-onboarding__axes">
            {AXES.map((axis) => (
              <li key={axis.title}>
                <span aria-hidden="true">{axis.icon}</span>
                <div>
                  <strong>{axis.title}</strong>
                  <p>{axis.description}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="gol-onboarding__actions">
            <button type="button" className="supabase-auth__secondary" onClick={handleBack}>
              Back
            </button>
            <button type="button" className="supabase-auth__action" onClick={handleNext}>
              Continue
            </button>
          </div>
        </div>
      ) : null}

      {isFinalStep ? (
        <form className="gol-onboarding__panel" onSubmit={handleProfileSubmit} aria-busy={profileSaving}>
          <label className="supabase-auth__field">
            <span>Display name</span>
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={session.user.email ?? 'you@example.com'}
              autoFocus
            />
          </label>
          <div className="gol-onboarding__actions gol-onboarding__actions--stack">
            <button
              type="submit"
              className="supabase-auth__action"
              disabled={profileSaving}
              onClick={() => setPendingDestination('dashboard')}
            >
              {profileSaving ? 'Saving…' : 'Save & open the dashboard'}
            </button>
            <button
              type="submit"
              className="supabase-auth__secondary"
              disabled={profileSaving}
              onClick={() => setPendingDestination('coach')}
            >
              {profileSaving ? 'Saving…' : 'Save & meet your Game of Life Coach'}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
