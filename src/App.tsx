import { Dispatch, FormEvent, ReactNode, SetStateAction, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from './features/auth/SupabaseAuthProvider';
import { GoalReflectionJournal, GoalWorkspace } from './features/goals';
import { DailyHabitTracker, HabitsModule, MobileHabitHome } from './features/habits';
import { ProgressDashboard } from './features/dashboard';
import { VisionBoard } from './features/vision-board';
import { LifeWheelCheckins } from './features/checkins';
import { NotificationPreferences } from './features/notifications';
import { DEMO_USER_EMAIL, DEMO_USER_NAME } from './services/demoData';
import { createDemoSession } from './services/demoSession';
import { ThemeToggle } from './components/ThemeToggle';
import { useMediaQuery } from './hooks/useMediaQuery';

type AuthMode = 'password' | 'magic' | 'signup' | 'reset';

type WorkspaceNavItem = {
  id: string;
  label: string;
  summary: string;
  icon: ReactNode;
};

const WORKSPACE_NAV_ITEMS: WorkspaceNavItem[] = [
  {
    id: 'goals',
    label: 'Dashboard',
    summary: 'Review upcoming milestones and daily focus from a unified dashboard.',
    icon: '📊',
  },
  {
    id: 'planning',
    label: "Today's Habits & Routines",
    summary: 'Check in on the rituals that keep today on track.',
    icon: '✅',
  },
  {
    id: 'rituals',
    label: 'Wellbeing Wheel Check-in',
    summary: 'Reflect on your wellbeing balance with a quick wheel check-in.',
    icon: '🧭',
  },
  {
    id: 'insights',
    label: 'Vision Board',
    summary: 'Stay inspired with highlights from your evolving vision board.',
    icon: '🖼️',
  },
  {
    id: 'support',
    label: 'Life Goals',
    summary: 'Review your long-term goals and celebrate progress milestones.',
    icon: '🎯',
  },
  {
    id: 'setup-habits',
    label: 'Set Up Habits',
    summary: 'Create or refine the habits that support your life goals.',
    icon: '🔁',
  },
  {
    id: 'setup-goals',
    label: 'Set Up Goals',
    summary: 'Define clear, motivating goals to guide your next steps.',
    icon: '🛠️',
  },
  {
    id: 'settings',
    label: 'Settings',
    summary: 'Adjust preferences and configure your workspace experience.',
    icon: '⚙️',
  },
];

export default function App() {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const {
    session: supabaseSession,
    initializing,
    isConfigured,
    isAuthenticated,
    mode,
    signInWithOtp,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
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
  const [authEntry, setAuthEntry] = useState<'options' | 'email'>('options');
  const [profileSaving, setProfileSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [activeWorkspaceNav, setActiveWorkspaceNav] = useState<string>(
    WORKSPACE_NAV_ITEMS[WORKSPACE_NAV_ITEMS.length - 1].id,
  );
  const [showAuthPanel, setShowAuthPanel] = useState(false);
  const isMobileViewport = useMediaQuery('(max-width: 720px)');
  const [showMobileHome, setShowMobileHome] = useState(false);

  const isDemoMode = mode === 'demo';

  const activeSession = useMemo(() => supabaseSession ?? createDemoSession(), [supabaseSession]);

  useEffect(() => {
    if (!supabaseSession) {
      setDisplayName((activeSession.user.user_metadata?.full_name as string | undefined) ?? '');
      setProfileSaving(false);
      return;
    }
    setDisplayName((supabaseSession.user.user_metadata?.full_name as string | undefined) ?? '');
  }, [supabaseSession, activeSession]);

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

  useEffect(() => {
    if (!isMobileViewport) {
      setShowMobileHome(false);
      return;
    }
    setShowMobileHome((current) => (current ? current : true));
  }, [isMobileViewport]);

  const isOnboardingComplete = useMemo(() => {
    return Boolean(activeSession.user.user_metadata?.onboarding_complete);
  }, [activeSession]);

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

  const handleAccountClick = () => {
    if (isAuthenticated) {
      setActiveWorkspaceNav('settings');
      setShowAuthPanel(false);
      setAuthEntry('options');
      return;
    }
    setShowAuthPanel(true);
    setAuthEntry('options');
  };

  const handleDemoSignIn = async () => {
    setAuthMessage(null);
    setAuthError(null);
    setSubmitting(true);
    setShowAuthPanel(false);
    setAuthEntry('options');
    try {
      await signInWithPassword({ email: DEMO_USER_EMAIL, password: 'demo-password' });
      setAuthMessage('Signed in to the demo workspace.');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign in right now.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthMessage(null);
    setAuthError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      setAuthMessage('Redirecting to Google…');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to open Google sign-in.');
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

  const handleMobileNavSelect = (navId: string) => {
    setActiveWorkspaceNav(navId);
    setShowMobileHome(false);
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
        ) : (
          <>
            <div className="auth-card__options" role="list">
              <button
                type="button"
                role="listitem"
                className="auth-option auth-option--demo"
                onClick={handleDemoSignIn}
                disabled={submitting}
              >
                <span className="auth-option__eyebrow">Instant tour</span>
                <span className="auth-option__title">Explore the demo workspace</span>
                <span className="auth-option__subtitle">
                  Sign in as <strong>{DEMO_USER_NAME}</strong> and keep your changes on this device.
                </span>
              </button>

              <button
                type="button"
                role="listitem"
                className="auth-option auth-option--google"
                onClick={handleGoogleSignIn}
                disabled={submitting || !isConfigured}
              >
                <span className="auth-option__eyebrow">Fastest sync</span>
                <span className="auth-option__title">Continue with Google</span>
                <span className="auth-option__subtitle">Connect your Supabase project using Google OAuth.</span>
              </button>

              <button
                type="button"
                role="listitem"
                className={`auth-option auth-option--email ${authEntry === 'email' ? 'auth-option--active' : ''}`}
                onClick={() => setAuthEntry('email')}
                disabled={submitting || !isConfigured}
              >
                <span className="auth-option__eyebrow">Flexible access</span>
                <span className="auth-option__title">Use email + password or magic link</span>
                <span className="auth-option__subtitle">
                  Prefer classic credentials? Continue with email-based sign-in or sign-up.
                </span>
              </button>
            </div>

            {authEntry === 'email' ? (
              <div className="auth-card__email">
                <div className="auth-card__email-header">
                  <h3>Email sign-in</h3>
                  <button
                    type="button"
                    className="supabase-auth__toggle"
                    onClick={() => setAuthEntry('options')}
                  >
                    Choose a different option
                  </button>
                </div>

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
              </div>
            ) : (
              <p className="auth-card__hint auth-card__hint--muted">
                Prefer email access? Choose the third option to reveal the full sign-in and sign-up form.
              </p>
            )}
          </>
        )}

        {!isConfigured ? (
          <p className="supabase-auth__status supabase-auth__status--error">
            Supabase credentials are not configured. Update your environment variables to enable live authentication.
          </p>
        ) : null}

        {statusElements}
      </div>
    </div>
  );

  const userDisplay =
    displayName ||
    (activeSession.user.user_metadata?.full_name as string | undefined) ||
    activeSession.user.email;
  const userInitial = (userDisplay || '').trim().charAt(0).toUpperCase() || 'U';
  const activeWorkspaceItem =
    WORKSPACE_NAV_ITEMS.find((item) => item.id === activeWorkspaceNav) ??
    WORKSPACE_NAV_ITEMS[WORKSPACE_NAV_ITEMS.length - 1];

  const isDemoExperience = isDemoMode || !isAuthenticated;
  const isOnboardingGateActive = !isDemoExperience;
  const canAccessWorkspace = !isOnboardingGateActive || isOnboardingComplete;

  const renderWorkspaceSection = () => {
    if (activeWorkspaceNav === 'goals') {
      return (
        <>
          {isOnboardingGateActive && (
            <OnboardingCard
              session={activeSession}
              displayName={displayName}
              setDisplayName={setDisplayName}
              profileSaving={profileSaving}
              setProfileSaving={setProfileSaving}
              setAuthMessage={setAuthMessage}
              setAuthError={setAuthError}
              isOnboardingComplete={isOnboardingComplete}
            />
          )}

          {canAccessWorkspace ? (
            <div className="workspace-content">
              <ProgressDashboard session={activeSession} />
              <GoalWorkspace session={activeSession} />
              <GoalReflectionJournal session={activeSession} />
              <DailyHabitTracker session={activeSession} />
              <VisionBoard session={activeSession} />
              <LifeWheelCheckins session={activeSession} />
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
          <NotificationPreferences session={activeSession} />
        </div>
      );
    }

    if (!canAccessWorkspace) {
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
            <DailyHabitTracker session={activeSession} />
          </div>
        );
      case 'rituals':
        return (
          <div className="workspace-content">
            <LifeWheelCheckins session={activeSession} />
            <GoalReflectionJournal session={activeSession} />
            <VisionBoard session={activeSession} />
          </div>
        );
      case 'insights':
        return (
          <div className="workspace-content">
            <VisionBoard session={activeSession} />
          </div>
        );
      case 'support':
        return (
          <div className="workspace-content">
            <GoalWorkspace session={activeSession} />
          </div>
        );
      case 'setup-habits':
        return (
          <div className="workspace-content">
            <HabitsModule session={activeSession} />
          </div>
        );
      case 'setup-goals':
        return (
          <div className="workspace-content">
            <GoalWorkspace session={activeSession} />
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

  if (isMobileViewport && showMobileHome) {
    return (
      <MobileHabitHome
        session={activeSession}
        navItems={WORKSPACE_NAV_ITEMS}
        onSelectNav={handleMobileNavSelect}
      />
    );
  }

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
                {isDemoExperience ? 'Demo creator' : 'Welcome back'}
              </span>
              <span className="workspace-sidebar__name">{userDisplay}</span>
            </div>
          </div>

          <nav className="workspace-sidebar__nav">
            <div className="workspace-sidebar__nav-list">
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
                    aria-label={item.label}
                    title={`${item.label} • ${item.summary}`}
                  >
                    <span className="workspace-sidebar__nav-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="sr-only workspace-sidebar__nav-label">{item.label}</span>
                    <span className="sr-only workspace-sidebar__nav-summary">{item.summary}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="workspace-sidebar__actions">
            <ThemeToggle />
            {installPromptEvent && (
              <button type="button" className="workspace-sidebar__install" onClick={handleInstallClick}>
                Install app
              </button>
            )}
            {isAuthenticated ? (
              <button type="button" className="workspace-sidebar__signout" onClick={handleSignOut}>
                Sign out
              </button>
            ) : (
              <button
                type="button"
                className="workspace-sidebar__signout"
                onClick={() => setShowAuthPanel((value) => !value)}
              >
                {showAuthPanel ? 'Hide sign-in' : 'Sign in'}
              </button>
            )}
            <div className="workspace-sidebar__actions-divider" role="presentation" />
            <button
              type="button"
              className={`workspace-sidebar__account-button ${
                isAuthenticated && activeWorkspaceNav === 'settings'
                  ? 'workspace-sidebar__account-button--active'
                  : ''
              }`}
              onClick={handleAccountClick}
              aria-pressed={isAuthenticated && activeWorkspaceNav === 'settings'}
              aria-label={isAuthenticated ? 'Open my account' : 'Sign in to your account'}
              title={isAuthenticated ? 'Open my account' : 'Sign in to your account'}
            >
              <span aria-hidden="true" className="workspace-sidebar__nav-icon">
                👤
              </span>
              <span className="sr-only">
                {isAuthenticated ? 'Open my account settings' : 'Open the sign-in dialog'}
              </span>
            </button>
          </div>
        </aside>

        <main className="workspace-main">
          {(!isAuthenticated || authMessage || authError) && (
            <div className="workspace-status">
              {!isAuthenticated && (
                <p className="workspace-status__message">
                  You’re exploring demo data. Sign in to sync with your Supabase project.
                </p>
              )}
              {statusElements}
              {!isAuthenticated && (
                <button
                  type="button"
                  className="supabase-auth__action workspace-status__cta"
                  onClick={() => setShowAuthPanel(true)}
                >
                  Connect Supabase
                </button>
              )}
            </div>
          )}

          {showAuthPanel && (
            <div className="workspace-auth-panel">{renderAuthPanel()}</div>
          )}

          {isMobileViewport ? (
            <button
              type="button"
              className="workspace-main__mobile-cta"
              onClick={() => setShowMobileHome(true)}
            >
              Back to daily checklist
            </button>
          ) : null}

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
