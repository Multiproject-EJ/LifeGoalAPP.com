import { Dispatch, FormEvent, SetStateAction, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from './features/auth/SupabaseAuthProvider';
import { GoalReflectionJournal, GoalWorkspace } from './features/goals';
import { DailyHabitTracker } from './features/habits';
import { ProgressDashboard } from './features/dashboard';
import { VisionBoard } from './features/vision-board';
import { LifeWheelCheckins } from './features/checkins';
import { NotificationPreferences } from './features/notifications';
import { DEMO_USER_EMAIL, DEMO_USER_NAME } from './services/demoData';
import { ThemeToggle } from './components/ThemeToggle';

type AuthMode = 'password' | 'magic' | 'signup' | 'reset';

type WorkspaceNavItem = {
  id: string;
  label: string;
  summary: string;
};

const WORKSPACE_NAV_ITEMS: WorkspaceNavItem[] = [
  {
    id: 'goals',
    label: 'Dashboard',
    summary: 'Review upcoming milestones and daily focus from a unified dashboard.',
  },
  {
    id: 'planning',
    label: "Today's Habits & Routines",
    summary: 'Check in on the rituals that keep today on track.',
  },
  {
    id: 'rituals',
    label: 'Wellbeing Wheel Check-in',
    summary: 'Reflect on your wellbeing balance with a quick wheel check-in.',
  },
  {
    id: 'insights',
    label: 'Vision Board',
    summary: 'Stay inspired with highlights from your evolving vision board.',
  },
  {
    id: 'support',
    label: 'Life Goals',
    summary: 'Review your long-term goals and celebrate progress milestones.',
  },
  {
    id: 'setup-habits',
    label: 'Set Up Habits',
    summary: 'Create or refine the habits that support your life goals.',
  },
  {
    id: 'setup-goals',
    label: 'Set Up Goals',
    summary: 'Define clear, motivating goals to guide your next steps.',
  },
  {
    id: 'settings',
    label: 'Settings',
    summary: 'Adjust preferences and configure your workspace experience.',
  },
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
  const [activeWorkspaceNav, setActiveWorkspaceNav] = useState<string>(
    WORKSPACE_NAV_ITEMS[WORKSPACE_NAV_ITEMS.length - 1].id,
  );
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifyMessage, setNotifyMessage] = useState<string | null>(null);
  const [notifyError, setNotifyError] = useState<string | null>(null);
  const [notifySubmitting, setNotifySubmitting] = useState(false);
  const [showAuthPanel, setShowAuthPanel] = useState(false);

  const isDemoMode = mode === 'demo';

  useEffect(() => {
    if (!session) {
      setDisplayName('');
      setProfileSaving(false);
      return;
    }
    setDisplayName((session.user.user_metadata?.full_name as string | undefined) ?? '');
  }, [session]);

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

  const handleDemoSignIn = async () => {
    setAuthMessage(null);
    setAuthError(null);
    setSubmitting(true);
    setShowAuthPanel(false);
    try {
      await signInWithPassword({ email: DEMO_USER_EMAIL, password: 'demo-password' });
      setAuthMessage('Signed in to the demo workspace.');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign in right now.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNotifySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotifyError(null);
    setNotifyMessage(null);

    if (!notifyEmail.trim()) {
      setNotifyError('Enter an email address so we can reach out.');
      return;
    }

    setNotifySubmitting(true);

    setTimeout(() => {
      setNotifySubmitting(false);
      setNotifyMessage("Thanks! We'll be in touch soon.");
      setNotifyEmail('');
    }, 600);
  };

  const handleSignOut = async () => {
    setAuthError(null);
    setAuthMessage(null);
    try {
      await signOut();
      setAuthMessage('Signed out.');
      setEmail('');
      setPassword('');
      setFullName('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign out.');
    }
  };

  const handleInstallClick = async () => {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    await installPromptEvent.userChoice;
    setInstallPromptEvent(null);
  };

  const statusElements = (
    <>
      {authMessage && (
        <p className="supabase-auth__status supabase-auth__status--success">{authMessage}</p>
      )}
      {authError && <p className="supabase-auth__status supabase-auth__status--error">{authError}</p>}
    </>
  );

  const renderAuthPanel = () => (
    <div className="auth-card">
      <header className="auth-card__header">
        <h2>{isDemoMode ? 'Peek behind the curtain' : 'Sign in to your workspace'}</h2>
        <p>
          {isDemoMode
            ? 'Use the LifeGoal demo workspace to explore the current build.'
            : 'Connect your Supabase project credentials to unlock the full workspace.'}
        </p>
      </header>

      <div className="auth-card__body">
        {initializing ? (
          <p className="supabase-auth__status supabase-auth__status--info">Loading session…</p>
        ) : isDemoMode ? (
          <>
            <button
              type="button"
              className="supabase-auth__action auth-card__primary"
              onClick={handleDemoSignIn}
              disabled={submitting}
            >
              {submitting ? 'Signing in…' : 'Continue with the demo account'}
            </button>
            <p className="auth-card__hint">
              We&apos;ll sign you in as <strong>{DEMO_USER_NAME}</strong> (<code>{DEMO_USER_EMAIL}</code>). Your
              changes stay on this device.
            </p>
          </>
        ) : !isConfigured ? (
          <p className="supabase-auth__status supabase-auth__status--error">
            Supabase credentials are not configured. Update your environment variables to enable authentication.
          </p>
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

        {statusElements}
      </div>
    </div>
  );

  if (!session) {
    return (
      <div className="app app--preview">
        <div className="preview-backdrop" aria-hidden="true">
          <div className="preview-backdrop__orb preview-backdrop__orb--one" />
          <div className="preview-backdrop__orb preview-backdrop__orb--two" />
          <div className="preview-backdrop__orb preview-backdrop__orb--three" />
        </div>

        <div className="preview-window">
          <div className="preview-window__media" aria-hidden="true">
            <div className="preview-window__image" />
          </div>

          <div className="preview-window__content">
            <span className="preview-window__badge">Under construction</span>
            <h1>LifeGoalApp is getting a glow-up</h1>
            <p>
              We&apos;re rebuilding the experience with calmer flows, guided rituals, and deeper insights. Leave your email
              to hear when the new workspace opens up.
            </p>

            <form className="preview-window__form" onSubmit={handleNotifySubmit}>
              <label className="preview-window__field">
                <span className="sr-only">Email address</span>
                <input
                  type="email"
                  name="notifyEmail"
                  value={notifyEmail}
                  onChange={(event) => {
                    setNotifyEmail(event.target.value);
                    if (notifyMessage) setNotifyMessage(null);
                    if (notifyError) setNotifyError(null);
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </label>
              <button type="submit" className="supabase-auth__action preview-window__submit" disabled={notifySubmitting}>
                {notifySubmitting ? 'Saving…' : 'Notify me'}
              </button>
            </form>

            {notifyMessage && (
              <p className="preview-window__status preview-window__status--success">{notifyMessage}</p>
            )}
            {notifyError && (
              <p className="preview-window__status preview-window__status--error">{notifyError}</p>
            )}

            <div className="preview-window__actions">
              <button
                type="button"
                className="supabase-auth__action preview-window__primary"
                onClick={handleDemoSignIn}
                disabled={submitting}
              >
                {submitting ? 'Opening…' : 'Peek at the current build'}
              </button>
              <button
                type="button"
                className="preview-window__link"
                onClick={() => setShowAuthPanel((value) => !value)}
              >
                {showAuthPanel ? 'Hide sign-in options' : 'Already collaborating? Sign in'}
              </button>
            </div>

            {!showAuthPanel && (authMessage || authError) && (
              <div className="preview-window__status-group">{statusElements}</div>
            )}

            {showAuthPanel && <div className="preview-window__drawer">{renderAuthPanel()}</div>}
          </div>
        </div>
      </div>
    );
  }

  const userDisplay =
    displayName || (session.user.user_metadata?.full_name as string | undefined) || session.user.email;
  const userInitial = (userDisplay || '').trim().charAt(0).toUpperCase() || 'U';
  const activeWorkspaceItem =
    WORKSPACE_NAV_ITEMS.find((item) => item.id === activeWorkspaceNav) ??
    WORKSPACE_NAV_ITEMS[WORKSPACE_NAV_ITEMS.length - 1];

  const renderWorkspaceSection = () => {
    if (activeWorkspaceNav === 'goals') {
      return (
        <>
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

          {isOnboardingComplete ? (
            <div className="workspace-content">
              <ProgressDashboard session={session} />
              <GoalWorkspace session={session} />
              <GoalReflectionJournal session={session} />
              <DailyHabitTracker session={session} />
              <VisionBoard session={session} />
              <LifeWheelCheckins session={session} />
            </div>
          ) : (
            <p className="workspace-onboarding-hint">
              Finish onboarding to unlock the goal workspace and habit trackers.
            </p>
          )}
        </>
      );
    }

    if (activeWorkspaceNav === 'settings') {
      return (
        <div className="workspace-content">
          <NotificationPreferences session={session} />
        </div>
      );
    }

    if (!isOnboardingComplete) {
      return (
        <p className="workspace-onboarding-hint">
          Finish onboarding to unlock this area.
        </p>
      );
    }

    switch (activeWorkspaceNav) {
      case 'planning':
        return (
          <div className="workspace-content">
            <DailyHabitTracker session={session} />
          </div>
        );
      case 'rituals':
        return (
          <div className="workspace-content">
            <LifeWheelCheckins session={session} />
            <GoalReflectionJournal session={session} />
            <VisionBoard session={session} />
          </div>
        );
      case 'setup-goals':
        return (
          <div className="workspace-content">
            <GoalWorkspace session={session} />
          </div>
        );
      default:
        return (
          <div className="workspace-stage__placeholder">
            <div className="workspace-stage__placeholder-content">
              <h2>{activeWorkspaceItem.label}</h2>
              <p>{activeWorkspaceItem.summary}</p>
              <p className="workspace-stage__placeholder-hint">
                Select "Goals &amp; Habits" to access the full workspace preview.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="app app--workspace">
      <div className="workspace-shell">
        <aside className="workspace-sidebar" aria-label="Workspace navigation">
          <div className="workspace-sidebar__profile">
            <div className="workspace-avatar" aria-hidden="true">
              {userInitial}
            </div>
            <div className="workspace-sidebar__profile-text">
              <span className="workspace-sidebar__welcome">
                {isDemoMode ? 'Demo creator' : 'Welcome back'}
              </span>
              <span className="workspace-sidebar__name">{userDisplay}</span>
            </div>
          </div>

          <nav className="workspace-sidebar__nav">
            {WORKSPACE_NAV_ITEMS.map((item) => {
              const isActive = activeWorkspaceNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`workspace-sidebar__nav-button ${
                    isActive ? 'workspace-sidebar__nav-button--active' : ''
                  }`}
                  onClick={() => setActiveWorkspaceNav(item.id)}
                  aria-pressed={isActive}
                >
                  <span className="workspace-sidebar__nav-label">{item.label}</span>
                  <span className="workspace-sidebar__nav-summary">{item.summary}</span>
                </button>
              );
            })}
          </nav>

          <div className="workspace-sidebar__actions">
            <ThemeToggle />
            {installPromptEvent && (
              <button type="button" className="workspace-sidebar__install" onClick={handleInstallClick}>
                Install app
              </button>
            )}
            <button type="button" className="workspace-sidebar__signout" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </aside>

        <main className="workspace-main">
          {(authMessage || authError) && <div className="workspace-status">{statusElements}</div>}

          <section
            className={`workspace-stage ${
              activeWorkspaceNav === 'goals' ? 'workspace-stage--detail' : 'workspace-stage--placeholder'
            }`}
            aria-live="polite"
          >
            <header className="workspace-stage__header">
              <h1>{activeWorkspaceItem.label}</h1>
              <p>{activeWorkspaceItem.summary}</p>
            </header>

            <div className="workspace-stage__body">{renderWorkspaceSection()}</div>
          </section>
        </main>
      </div>
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
