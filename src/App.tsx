import { Dispatch, FormEvent, SetStateAction, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from './features/auth/SupabaseAuthProvider';
import { GoalWorkspace } from './features/goals';
import { DailyHabitTracker } from './features/habits';
import { ProgressDashboard } from './features/dashboard';

type AuthMode = 'password' | 'magic' | 'signup' | 'reset';

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

  return (
    <main className="app-shell">
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
          {initializing ? (
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

        {session && (
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
          Update your <code>.env.local</code> with Supabase credentials to enable authentication and database helpers.
        </p>
      </section>

      {session && isOnboardingComplete ? (
        <>
          <GoalWorkspace session={session} />
          <DailyHabitTracker session={session} />
          <ProgressDashboard session={session} />
        </>
      ) : null}
    </main>
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
