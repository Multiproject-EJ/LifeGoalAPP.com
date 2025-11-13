import { Dispatch, FormEvent, ReactNode, SetStateAction, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from './features/auth/SupabaseAuthProvider';
import { GoalReflectionJournal, GoalWorkspace, LifeGoalsSection } from './features/goals';
import { DailyHabitTracker, HabitsModule, MobileHabitHome } from './features/habits';
import { ProgressDashboard } from './features/dashboard';
import { VisionBoard } from './features/vision-board';
import { LifeWheelCheckins } from './features/checkins';
import { NotificationPreferences } from './features/notifications';
import { MyAccountPanel } from './features/account/MyAccountPanel';
import { DEMO_USER_EMAIL, DEMO_USER_NAME } from './services/demoData';
import { createDemoSession } from './services/demoSession';
import { ThemeToggle } from './components/ThemeToggle';
import { MobileFooterNav } from './components/MobileFooterNav';
import { useMediaQuery } from './hooks/useMediaQuery';

type AuthMode = 'password' | 'signup';

type AuthTab = 'login' | 'signup' | 'demo';

type WorkspaceNavItem = {
  id: string;
  label: string;
  summary: string;
  icon: ReactNode;
  shortLabel: string;
};

const WORKSPACE_NAV_ITEMS: WorkspaceNavItem[] = [
  {
    id: 'goals',
    label: 'Dashboard',
    summary: 'Review upcoming milestones and daily focus from a unified dashboard.',
    icon: '📊',
    shortLabel: 'HOME',
  },
  {
    id: 'planning',
    label: "Today's Habits & Routines",
    summary: 'Check in on the rituals that keep today on track.',
    icon: '✅',
    shortLabel: 'TODAY',
  },
  {
    id: 'rituals',
    label: 'Wellbeing Wheel Check-in',
    summary: 'Reflect on your wellbeing balance with a quick wheel check-in.',
    icon: '🧭',
    shortLabel: 'CHECK-IN',
  },
  {
    id: 'insights',
    label: 'Vision Board',
    summary: 'Stay inspired with highlights from your evolving vision board.',
    icon: '🖼️',
    shortLabel: 'VISION',
  },
  {
    id: 'support',
    label: 'Life Goals',
    summary: 'Review your long-term goals and celebrate progress milestones.',
    icon: '🎯',
    shortLabel: 'GOALS',
  },
  {
    id: 'setup-habits',
    label: 'Set Up Habits',
    summary: 'Create or refine the habits that support your life goals.',
    icon: '🔁',
    shortLabel: 'HABITS',
  },
  {
    id: 'setup-goals',
    label: 'Set Up Goals',
    summary: 'Define clear, motivating goals to guide your next steps.',
    icon: '🛠️',
    shortLabel: 'PLANS',
  },
  {
    id: 'settings',
    label: 'Settings',
    summary: 'Adjust preferences and configure your workspace experience.',
    icon: '⚙️',
    shortLabel: 'PREFS',
  },
  {
    id: 'account',
    label: 'My account',
    summary: 'Review your profile, subscription status, and workspace data.',
    icon: '👤',
    shortLabel: 'ACCOUNT',
  },
];

const MOBILE_FOOTER_WORKSPACE_IDS = ['planning', 'support', 'insights', 'rituals', 'account'] as const;

export default function App() {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const {
    session: supabaseSession,
    initializing,
    isConfigured,
    isAuthenticated,
    mode,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    signOut,
  } = useSupabaseAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('password');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeAuthTab, setActiveAuthTab] = useState<AuthTab>('login');
  const [profileSaving, setProfileSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [activeWorkspaceNav, setActiveWorkspaceNav] = useState<string>('settings');
  const [showAuthPanel, setShowAuthPanel] = useState(false);
  const isMobileViewport = useMediaQuery('(max-width: 720px)');
  const [showMobileHome, setShowMobileHome] = useState(false);

  const mobileFooterNavItems = useMemo(() => {
    const findWorkspaceItem = (navId: string) =>
      WORKSPACE_NAV_ITEMS.find((item) => item.id === navId);

    return MOBILE_FOOTER_WORKSPACE_IDS.map((navId) => {
      const item = findWorkspaceItem(navId);
      const shortLabel = item?.shortLabel ?? item?.label ?? navId;
      const formattedLabel =
        shortLabel.length > 0
          ? `${shortLabel.charAt(0)}${shortLabel.slice(1).toLowerCase()}`
          : shortLabel;

      return {
        id: navId,
        label: formattedLabel,
        ariaLabel: item?.label ?? formattedLabel,
        icon: item?.icon ?? '•',
      };
    });
  }, []);

  const mobileHabitHomeNavItems = useMemo(
    () => WORKSPACE_NAV_ITEMS.filter((item) => item.id !== 'goals'),
    [],
  );

  const mobileActiveNavId = showMobileHome ? null : activeWorkspaceNav;

  const isDemoMode = mode === 'demo';

  const activeSession = useMemo(() => {
    if (supabaseSession) {
      return supabaseSession;
    }
    return createDemoSession();
  }, [supabaseSession]);

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

  useEffect(() => {
    setAuthMode(activeAuthTab === 'signup' ? 'signup' : 'password');
  }, [activeAuthTab]);

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
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to complete the request.');
    } finally {
      setSubmitting(false);
    }
  };

  const openAuthOverlay = (tab: AuthTab = 'login') => {
    setActiveAuthTab(tab);
    setShowAuthPanel(true);
  };

  const handleAccountClick = () => {
    if (isAuthenticated) {
      setActiveWorkspaceNav('account');
      setShowAuthPanel(false);
      return;
    }
    openAuthOverlay('login');
  };

  const handleDemoSignIn = async () => {
    setAuthMessage(null);
    setAuthError(null);
    setSubmitting(true);
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

  const renderAuthPanel = () => {
    const authTabs: { id: AuthTab; label: string }[] = [
    { id: 'login', label: 'Log in' },
    { id: 'signup', label: 'Sign up' },
    { id: 'demo', label: 'Demo Account' },
  ];

    const authTabCopy: Record<AuthTab, { title: string; subtitle: string }> = {
    login: {
      title: 'Welcome back',
      subtitle: 'Log in to sync your rituals, goals, and check-ins across devices.',
    },
    signup: {
      title: 'Create your LifeGoal account',
      subtitle: 'Sign up with email or Google to unlock the full workspace.',
    },
    demo: {
      title: 'Take the demo for a spin',
      subtitle: `Instantly browse the workspace as ${DEMO_USER_NAME}.`,
    },
  };

    const renderLoginPanel = () => (
    <div
      className="auth-tab-panel"
      role="tabpanel"
      id="auth-panel-login"
      aria-labelledby="auth-tab-login"
    >
      <form className="supabase-auth__form" onSubmit={handleAuthSubmit}>
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

        <label className="supabase-auth__field">
          <span>Password</span>
          <input
            type="password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </label>

        <div className="supabase-auth__actions">
          <button type="submit" className="supabase-auth__action auth-card__primary" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Log in'}
          </button>
        </div>
      </form>

      <div className="auth-card__providers">
        <button
          type="button"
          className="auth-provider auth-provider--google"
          onClick={handleGoogleSignIn}
          disabled={submitting || !isConfigured}
        >
          Continue with Google
        </button>
      </div>
    </div>
    );

    const renderSignupPanel = () => (
    <div
      className="auth-tab-panel"
      role="tabpanel"
      id="auth-panel-signup"
      aria-labelledby="auth-tab-signup"
    >
      <form className="supabase-auth__form" onSubmit={handleAuthSubmit}>
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

        <label className="supabase-auth__field">
          <span>Password</span>
          <input
            type="password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Create a secure password"
            autoComplete="new-password"
            required
          />
        </label>

        <div className="supabase-auth__actions">
          <button type="submit" className="supabase-auth__action auth-card__primary" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Sign up with email'}
          </button>
        </div>
      </form>

      <div className="auth-card__providers">
        <button
          type="button"
          className="auth-provider auth-provider--google"
          onClick={handleGoogleSignIn}
          disabled={submitting || !isConfigured}
        >
          Sign up with Google
        </button>
      </div>
    </div>
    );

    const renderDemoPanel = () => (
    <div
      className="auth-tab-panel"
      role="tabpanel"
      id="auth-panel-demo"
      aria-labelledby="auth-tab-demo"
    >
      <p className="auth-card__hint">
        Launch the fully-populated demo workspace to explore rituals, goal planning boards, and daily trackers
        without creating an account.
      </p>
      <ul className="auth-demo-list">
        <li>Preview Today&apos;s Habits and goal dashboards.</li>
        <li>Make changes locally without affecting production data.</li>
        <li>Decide later if you want to connect your own Supabase project.</li>
      </ul>
      <button
        type="button"
        className="supabase-auth__action auth-card__primary"
        onClick={handleDemoSignIn}
        disabled={submitting}
      >
        Enter the demo workspace
      </button>
    </div>
    );

    const renderTabPanel = () => {
    if (initializing) {
      return <p className="supabase-auth__status supabase-auth__status--info">Loading session…</p>;
    }
    if (activeAuthTab === 'login') {
      return renderLoginPanel();
    }
    if (activeAuthTab === 'signup') {
      return renderSignupPanel();
    }
    return renderDemoPanel();
  };

    return (
    <div className="auth-card">
      <header className="auth-card__header">
        <h2>{authTabCopy[activeAuthTab].title}</h2>
        <p>{authTabCopy[activeAuthTab].subtitle}</p>
      </header>

      <div className="auth-card__tabs" role="tablist" aria-label="Choose how to access LifeGoal">
        {authTabs.map((tab) => {
          const isActive = activeAuthTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`auth-tab-${tab.id}`}
              aria-controls={`auth-panel-${tab.id}`}
              aria-selected={isActive}
              className={`auth-tab ${isActive ? 'auth-tab--active' : ''}`}
              onClick={() => setActiveAuthTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="auth-card__body">
        {renderTabPanel()}

        {!isConfigured ? (
          <p className="supabase-auth__status supabase-auth__status--error">
            Supabase credentials are not configured. Update your environment variables to enable live authentication.
          </p>
        ) : null}

        {statusElements}
      </div>
    </div>
    );
  };

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

  const shouldRequireAuthentication = !isDemoMode && !isAuthenticated;

  if (shouldRequireAuthentication && isMobileViewport) {
    return (
      <div className="app app--auth-gate">
        <header className="auth-gate__masthead">
          <a className="auth-gate__brand" href="/" aria-label="LifeGoalApp home">
            LifeGoalApp
          </a>
          <ThemeToggle className="auth-gate__theme-toggle" />
        </header>

        <main className="auth-layout auth-gate__layout">
          <section className="auth-hero">
            <span className="auth-hero__badge">Secure workspace</span>
            <h1>Sign in to keep your rituals in sync</h1>
            <p className="auth-hero__lead">
              Access your personalized habit checklist and goal planning tools from any device.
            </p>
            <ul className="auth-hero__list">
              <li>
                <h3>Daily rituals, anywhere</h3>
                <p>Review Today&apos;s Habits once you&apos;re signed in to your workspace.</p>
              </li>
              <li>
                <h3>Private progress</h3>
                <p>Your life wheel check-ins and reflections stay linked to your secure account.</p>
              </li>
            </ul>
          </section>

          <div className="auth-panel auth-gate__panel">{renderAuthPanel()}</div>
        </main>
      </div>
    );
  }

  const shouldForceAuthOverlay = shouldRequireAuthentication && !isMobileViewport;
  const isAuthOverlayVisible = shouldForceAuthOverlay || (!isMobileViewport && showAuthPanel);

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

    if (activeWorkspaceNav === 'account') {
      return (
        <div className="workspace-content">
          <MyAccountPanel
            session={activeSession}
            isDemoExperience={isDemoExperience}
            isAuthenticated={isAuthenticated}
            onSignOut={handleSignOut}
          />
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
            <LifeGoalsSection session={activeSession} />
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
      <>
        <MobileHabitHome
          session={activeSession}
          navItems={mobileHabitHomeNavItems}
          onSelectNav={handleMobileNavSelect}
        />
        <MobileFooterNav
          items={mobileFooterNavItems}
          activeId={null}
          onSelect={handleMobileNavSelect}
        />
      </>
    );
  }

  const appClassName = `app app--workspace ${isAuthOverlayVisible ? 'app--auth-overlay' : ''}`;
  const workspaceShellClassName = `workspace-shell ${
    isAuthOverlayVisible ? 'workspace-shell--blurred' : ''
  }`;

  const canDismissOverlay = isAuthOverlayVisible && !shouldForceAuthOverlay;

  return (
    <div className={appClassName}>
      <div className={workspaceShellClassName}>
        {!isMobileViewport && (
          <aside className="workspace-sidebar" aria-label="Workspace navigation">
            <div className="workspace-sidebar__masthead">
              <a className="workspace-sidebar__brand" href="/" aria-label="LifeGoalApp home">
                LifeGoalApp
              </a>
              <div className="workspace-sidebar__masthead-actions">
                <ThemeToggle className="btn btn--ghost workspace-sidebar__masthead-toggle" />
                {isAuthenticated ? (
                  <button
                    type="button"
                    className="btn btn--primary workspace-sidebar__masthead-button"
                    onClick={handleSignOut}
                  >
                    Sign out
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn--primary workspace-sidebar__masthead-button"
                    onClick={() =>
                      showAuthPanel ? setShowAuthPanel(false) : openAuthOverlay('login')
                    }
                  >
                    {showAuthPanel ? 'Hide sign-in' : 'Sign in'}
                  </button>
                )}
              </div>
            </div>

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
                      <span className="workspace-sidebar__nav-text" aria-hidden="true">
                        {item.shortLabel}
                      </span>
                      <span className="sr-only workspace-sidebar__nav-label">{item.label}</span>
                      <span className="sr-only workspace-sidebar__nav-summary">{item.summary}</span>
                    </button>
                  );
                })}
              </div>
            </nav>

            <div className="workspace-sidebar__actions">
              {installPromptEvent && (
                <button type="button" className="workspace-sidebar__install" onClick={handleInstallClick}>
                  Install app
                </button>
              )}
              <div className="workspace-sidebar__actions-divider" role="presentation" />
              <button
                type="button"
                className={`workspace-sidebar__account-button ${
                  isAuthenticated && activeWorkspaceNav === 'account'
                    ? 'workspace-sidebar__account-button--active'
                    : ''
                }`}
                onClick={handleAccountClick}
                aria-pressed={isAuthenticated && activeWorkspaceNav === 'account'}
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
        )}

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
                  onClick={() => openAuthOverlay('login')}
                >
                  Connect Supabase
                </button>
              )}
            </div>
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
      {isMobileViewport ? (
        <MobileFooterNav
          items={mobileFooterNavItems}
          activeId={mobileActiveNavId}
          onSelect={handleMobileNavSelect}
        />
      ) : null}

      {isAuthOverlayVisible ? (
        <div className="auth-overlay" role="dialog" aria-modal="true" aria-label="Authenticate with LifeGoalApp">
          <div
            className="auth-overlay__backdrop"
            onClick={() => (canDismissOverlay ? setShowAuthPanel(false) : null)}
            role="presentation"
          />
          <div className="auth-overlay__dialog">
            {canDismissOverlay ? (
              <button type="button" className="auth-overlay__close" onClick={() => setShowAuthPanel(false)}>
                <span aria-hidden="true">×</span>
                <span className="sr-only">Close sign-in dialog</span>
              </button>
            ) : null}
            {renderAuthPanel()}
          </div>
        </div>
      ) : null}
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
