import { Dispatch, FormEvent, MouseEvent, SetStateAction, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from './features/auth/SupabaseAuthProvider';
import { GoalReflectionJournal, GoalWorkspace } from './features/goals';
import { DailyHabitTracker } from './features/habits';
import { ProgressDashboard } from './features/dashboard';
import { VisionBoard } from './features/vision-board';
import { LifeWheelCheckins } from './features/checkins';
import { NotificationPreferences } from './features/notifications';
import { DEMO_USER_EMAIL, DEMO_USER_NAME } from './services/demoData';

type AuthMode = 'password' | 'magic' | 'signup' | 'reset';

const CONSTRUCTION_STORAGE_KEY = 'lifeGoalApp:constructionDismissed';

const phaseChecklist = [
  {
    title: 'Phase 1: App Shell Setup',
    description:
      'Bootstrap React + Vite project, add PWA manifest, and register a service worker for offline caching.',
  },
  {
    title: 'Phase 2: Supabase Integration',
    description:
      'Configure Supabase project credentials, initialize client, and scaffold database interactions.',
  },
  {
    title: 'Phase 3: Core Features',
    description:
      'Implement goal management, daily habit tracker, dashboard analytics, vision board, and check-ins.',
  },
  {
    title: 'Phase 4: Offline & Push Enhancements',
    description:
      'Finalize background sync, offline caching strategies, and push notification workflows.',
  }
];

export default function App() {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const {
    session,
    initializing,
    isConfigured,
    mode,
    signInWithOtp,
    signInWithPassword,
    signUpWithPassword,
    sendPasswordReset,
    signOut,
  } = useSupabaseAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('password');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [showUnderConstruction, setShowUnderConstruction] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasDismissed = window.localStorage.getItem(CONSTRUCTION_STORAGE_KEY);
    if (hasDismissed) {
      setShowUnderConstruction(false);
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const { body } = document;
    if (!body) return;
    if (showUnderConstruction) {
      body.classList.add('under-construction-open');
    } else {
      body.classList.remove('under-construction-open');
    }
    return () => {
      body.classList.remove('under-construction-open');
    };
  }, [showUnderConstruction]);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    await installPromptEvent.userChoice;
    setInstallPromptEvent(null);
  };

  const handleConstructionContinue = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setShowUnderConstruction(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CONSTRUCTION_STORAGE_KEY, '1');
    }
  };

  useEffect(() => {
    if (!session) {
      setDisplayName('');
      setProfileSaving(false);
      return;
    }
    setDisplayName((session.user.user_metadata?.full_name as string | undefined) ?? '');
  }, [session]);

  const isOnboardingComplete = useMemo(() => {
    if (!session) return false;
    return Boolean(session.user.user_metadata?.onboarding_complete);
  }, [session]);

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthMessage(null);
    setAuthError(null);

    if (!email) {
      setAuthError('Enter an email address to continue.');
      return;
    }

    setSubmitting(true);

    try {
      if (authMode === 'password') {
        if (!password) {
          setAuthError('Enter a password to continue.');
          return;
        }
        await signInWithPassword({ email, password });
        setAuthMessage('Signed in successfully.');
      } else if (authMode === 'magic') {
        await signInWithOtp(email);
        setAuthMessage('Check your inbox for the magic link.');
      } else if (authMode === 'signup') {
        if (!password) {
          setAuthError('Create a password to finish signing up.');
          return;
        }
        if (!fullName.trim()) {
          setAuthError('Share your name so we can personalize your workspace.');
          return;
        }
        await signUpWithPassword({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              onboarding_complete: false,
            },
          },
        });
        setAuthMessage('Check your email to confirm your account, then sign in to continue.');
      } else {
        await sendPasswordReset(email);
        setAuthMessage('Password reset instructions are on their way to your inbox.');
      }
      } catch (error) {
        setAuthError(error instanceof Error ? error.message : 'Unable to complete the request.');
      } finally {
        setSubmitting(false);
      }
    };

  const handleSignOut = async () => {
    setAuthError(null);
    setAuthMessage(null);
    try {
      await signOut();
      setAuthMessage('Signed out.');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign out.');
    }
  };

  const isDemoMode = mode === 'demo';

  return (
    <>
      <main className={`app-shell ${showUnderConstruction ? 'app-shell--obscured' : ''}`} aria-hidden={showUnderConstruction}>
      <header className="app-shell__header">
        <h1>LifeGoalApp</h1>
        <p className="tagline">Design a smoother path to your goals.</p>
        {installPromptEvent && (
          <button className="install-button" onClick={handleInstallClick}>
            Install App
          </button>
        )}
      </header>

      <section className="phase-list">
        <h2>Development Roadmap</h2>
        <p className="phase-list__intro">
          We&apos;re building the LifeGoalApp in iterative phases to make sure every feature feels polished and purposeful.
        </p>
        <ol>
          {phaseChecklist.map((item) => (
            <li key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="supabase-auth">
        <div className="supabase-auth__header">
          <h2>Supabase Authentication</h2>
          <p>Connect your Supabase project to start persisting goals and habits.</p>
        </div>

        <div className="supabase-auth__content">
          {isDemoMode ? (
            <DemoModePanel />
          ) : initializing ? (
            <p className="supabase-auth__status">Loading session…</p>
          ) : !isConfigured ? (
            <p className="supabase-auth__status supabase-auth__status--error">
              Supabase credentials are not configured. Update your environment variables to enable authentication.
            </p>
          ) : session ? (
            <SignedInPanel session={session} onSignOut={handleSignOut} />
          ) : (
            <form className="supabase-auth__form" onSubmit={handleAuthSubmit}>
              <div className="supabase-auth__modes" role="tablist" aria-label="Authentication mode">
                <button
                  type="button"
                  className={`supabase-auth__mode ${authMode === 'password' ? 'supabase-auth__mode--active' : ''}`}
                  onClick={() => setAuthMode('password')}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={`supabase-auth__mode ${authMode === 'signup' ? 'supabase-auth__mode--active' : ''}`}
                  onClick={() => setAuthMode('signup')}
                >
                  Create account
                </button>
                <button
                  type="button"
                  className={`supabase-auth__mode ${authMode === 'magic' ? 'supabase-auth__mode--active' : ''}`}
                  onClick={() => setAuthMode('magic')}
                >
                  Magic link
                </button>
                <button
                  type="button"
                  className={`supabase-auth__mode ${authMode === 'reset' ? 'supabase-auth__mode--active' : ''}`}
                  onClick={() => setAuthMode('reset')}
                >
                  Reset password
                </button>
              </div>
              <label className="supabase-auth__field">
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </label>

              {(authMode === 'password' || authMode === 'signup') && (
                <label className="supabase-auth__field">
                  <span>Password</span>
                  <input
                    type="password"
                    name="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                    required={authMode === 'signup'}
                  />
                </label>
              )}

              {authMode === 'signup' && (
                <label className="supabase-auth__field">
                  <span>Your name</span>
                  <input
                    type="text"
                    name="fullName"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Jordan Goalsetter"
                    autoComplete="name"
                    required
                  />
                </label>
              )}

              <div className="supabase-auth__actions">
                <button type="submit" className="supabase-auth__action" disabled={submitting}>
                  {submitting
                    ? 'Sending…'
                    : authMode === 'password'
                      ? 'Sign in'
                      : authMode === 'signup'
                        ? 'Create account'
                        : authMode === 'magic'
                          ? 'Send magic link'
                          : 'Send reset link'}
                </button>
              </div>
            </form>
          )}

          {authMessage && <p className="supabase-auth__status supabase-auth__status--success">{authMessage}</p>}
          {authError && <p className="supabase-auth__status supabase-auth__status--error">{authError}</p>}
        </div>

        {session && !isDemoMode && (
          <OnboardingCard
            session={session}
            displayName={displayName}
            setDisplayName={setDisplayName}
            profileSaving={profileSaving}
            setProfileSaving={setProfileSaving}
            setAuthMessage={setAuthMessage}
            setAuthError={setAuthError}
            isOnboardingComplete={isOnboardingComplete}
          />
        )}

        <p className="supabase-auth__hint">
          {isDemoMode ? (
            <>
              You&apos;re exploring the LifeGoal workspace with demo Supabase data stored locally. Connect your own Supabase
              project in <code>.env.local</code> whenever you&apos;re ready to sync real accounts.
            </>
          ) : (
            <>
              Update your <code>.env.local</code> with Supabase credentials to enable authentication and database helpers.
            </>
          )}
        </p>
      </section>

      {session && isOnboardingComplete ? (
        <>
          <NotificationPreferences session={session} />
          <GoalWorkspace session={session} />
          <GoalReflectionJournal session={session} />
          <DailyHabitTracker session={session} />
          <ProgressDashboard session={session} />
          <VisionBoard session={session} />
          <LifeWheelCheckins session={session} />
        </>
      ) : null}
      </main>
      {showUnderConstruction && (
        <div
          className="under-construction-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="under-construction-title"
          aria-describedby="under-construction-message"
        >
          <div className="under-construction__dialog">
            <svg className="under-construction__icon" aria-hidden="true" viewBox="0 0 120 120">
              <defs>
                <linearGradient id="coneGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#facc15" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
                <linearGradient id="stripeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fde68a" />
                  <stop offset="100%" stopColor="#facc15" />
                </linearGradient>
              </defs>
              <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path
                  d="M18 98h84l-30-78a6 6 0 0 0-5.6-3.9H53.6a6 6 0 0 0-5.6 3.9z"
                  fill="url(#coneGradient)"
                  stroke="#7c2d12"
                  strokeWidth="4"
                />
                <path
                  d="M42 72h36"
                  stroke="#f8fafc"
                  strokeWidth="8"
                  strokeLinecap="square"
                  opacity="0.85"
                />
                <path
                  d="M36 90h48"
                  stroke="#f8fafc"
                  strokeWidth="6"
                  strokeLinecap="square"
                  opacity="0.7"
                />
                <rect
                  x="32"
                  y="30"
                  width="56"
                  height="24"
                  rx="4"
                  fill="url(#stripeGradient)"
                  stroke="#f97316"
                  strokeWidth="3"
                  transform="rotate(-10 60 42)"
                  opacity="0.6"
                />
              </g>
            </svg>
            <h2 id="under-construction-title" className="under-construction__title">
              Site under construction
            </h2>
            <p id="under-construction-message" className="under-construction__message">
              We&apos;re still wiring up the experience. Take a moment to explore the roadmap below while we finish the build.
            </p>
            <a href="#" className="under-construction__continue" onClick={handleConstructionContinue}>
              Continue to site
            </a>
          </div>
        </div>
      )}
    </>
  );
}

function SignedInPanel({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  return (
    <div className="supabase-auth__session">
      <div>
        <span className="supabase-auth__label">Signed in as</span>
        <strong>{session.user.email}</strong>
      </div>
      <button type="button" className="supabase-auth__action" onClick={onSignOut}>
        Sign out
      </button>
    </div>
  );
}

function DemoModePanel() {
  return (
    <div className="supabase-auth__demo">
      <div className="supabase-auth__session">
        <div>
          <span className="supabase-auth__label">Demo mode active</span>
          <strong>{DEMO_USER_NAME}</strong>
          <span className="supabase-auth__demo-email">{DEMO_USER_EMAIL}</span>
        </div>
      </div>
      <p className="supabase-auth__status supabase-auth__status--info">
        Changes are stored locally using demo Supabase-like data structures. Connect your Supabase project to sync with the
        cloud.
      </p>
    </div>
  );
}

type OnboardingCardProps = {
  session: Session;
  displayName: string;
  setDisplayName: Dispatch<SetStateAction<string>>;
  profileSaving: boolean;
  setProfileSaving: Dispatch<SetStateAction<boolean>>;
  setAuthMessage: Dispatch<SetStateAction<string | null>>;
  setAuthError: Dispatch<SetStateAction<string | null>>;
  isOnboardingComplete: boolean;
};

function OnboardingCard({
  session,
  displayName,
  setDisplayName,
  profileSaving,
  setProfileSaving,
  setAuthMessage,
  setAuthError,
  isOnboardingComplete,
}: OnboardingCardProps) {
  const { client } = useSupabaseAuth();

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client) {
      setAuthError('Supabase client is not ready.');
      return;
    }

    setProfileSaving(true);
    setAuthMessage(null);
    setAuthError(null);

    try {
      const nextName = displayName.trim();
      const { error } = await client.auth.updateUser({
        data: {
          full_name: nextName || null,
          onboarding_complete: true,
        },
      });
      if (error) throw error;

      setAuthMessage('Profile saved! Let’s capture your first goal next.');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to save your profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className="supabase-onboarding">
      <header className="supabase-onboarding__header">
        <h3>{isOnboardingComplete ? 'You’re all set 🎉' : 'Finish onboarding'}</h3>
        <p>
          {isOnboardingComplete
            ? 'Jump into the goals workspace to start charting your milestones.'
            : 'Add a display name so teammates know who is shaping these goals. We will mark onboarding as complete for you.'}
        </p>
      </header>

      <form className="supabase-onboarding__form" onSubmit={handleProfileSubmit}>
        <label className="supabase-auth__field">
          <span>Display name</span>
          <input
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder={session.user.email ?? 'you@example.com'}
          />
        </label>

        <button type="submit" className="supabase-auth__action" disabled={profileSaving}>
          {profileSaving ? 'Saving…' : isOnboardingComplete ? 'Update name' : 'Save & complete onboarding'}
        </button>
      </form>
    </div>
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};
