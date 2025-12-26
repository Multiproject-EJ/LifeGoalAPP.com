import {
  Dispatch,
  FormEvent,
  ReactNode,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import bioDayChartIcon from './assets/theme-icons/bio-day-chart.svg';
import bioDayCheckIcon from './assets/theme-icons/bio-day-check.svg';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from './features/auth/SupabaseAuthProvider';
import { GoalReflectionJournal, GoalWorkspace, LifeGoalsSection } from './features/goals';
import { DailyHabitTracker, HabitsModule, MobileHabitHome } from './features/habits';
import { ProgressDashboard } from './features/dashboard';
import { VisionBoard } from './features/vision-board';
import { LifeWheelCheckins } from './features/checkins';
import { NotificationPreferences } from './features/notifications';
import { MyAccountPanel } from './features/account/MyAccountPanel';
import { WorkspaceSetupDialog } from './features/account/WorkspaceSetupDialog';
import { AiCoach } from './features/ai-coach';
import { Journal } from './features/journal';
import { BreathingSpace } from './features/meditation';
import { AchievementsPage } from './features/achievements/AchievementsPage';
import { PowerUpsStore } from './features/power-ups/PowerUpsStore';
import { DEMO_USER_EMAIL, DEMO_USER_NAME } from './services/demoData';
import { createDemoSession, isDemoSession } from './services/demoSession';
import { ThemeToggle } from './components/ThemeToggle';
import { MobileFooterNav } from './components/MobileFooterNav';
import { MobileThemeSelector } from './components/MobileThemeSelector';
import { QuickActionsFAB } from './components/QuickActionsFAB';
import { XPToast } from './components/XPToast';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useTheme, AVAILABLE_THEMES } from './contexts/ThemeContext';
import { useGamification } from './hooks/useGamification';
import {
  fetchWorkspaceProfile,
  upsertWorkspaceProfile,
  type WorkspaceProfileRow,
} from './services/workspaceProfile';
import { fetchWorkspaceStats, type WorkspaceStats } from './services/workspaceStats';
import { getSupabaseClient } from './lib/supabaseClient';
import { useContinuousSave } from './hooks/useContinuousSave';
import { generateInitials } from './utils/initials';
import './styles/workspace.css';
import './styles/settings-folders.css';
import './styles/gamification.css';
import './features/ai-coach/AiCoach.css';

type AuthMode = 'password' | 'signup';

type AuthTab = 'login' | 'signup' | 'demo';

type WorkspaceNavItem = {
  id: string;
  label: string;
  summary: string;
  icon: ReactNode;
  shortLabel: string;
};

type MobileMenuNavItem = {
  id: string;
  label: string;
  ariaLabel: string;
  icon: ReactNode;
  summary: string;
};

const BASE_WORKSPACE_NAV_ITEMS: WorkspaceNavItem[] = [
  {
    id: 'goals',
    label: 'Dashboard',
    summary: '',
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
    id: 'habits',
    label: 'Habits & Routines',
    summary: 'Keep your weekly rhythms aligned with the goals you care about most.',
    icon: '🧍',
    shortLabel: 'ROUTINES',
  },
  {
    id: 'rituals',
    label: 'Wellbeing Wheel Check-in',
    summary: '',
    icon: '🧭',
    shortLabel: 'CHECK-IN',
  },
  {
    id: 'journal',
    label: 'Journal',
    summary: '',
    icon: '📔',
    shortLabel: 'JOURNAL',
  },
  {
    id: 'breathing-space',
    label: 'Breathing Space',
    summary: 'Practice mindful breathing and meditation to center yourself.',
    icon: '🌬️',
    shortLabel: 'BREATHE',
  },
  {
    id: 'insights',
    label: 'Vision Board',
    summary: '',
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
    id: 'ai-coach',
    label: 'AI Life Coach',
    summary: 'Chat with your personal AI coach for motivation, advice, and guidance.',
    icon: '💬',
    shortLabel: 'COACH',
  },
  {
    id: 'achievements',
    label: 'Achievements',
    summary: 'View your unlocked achievements and track progress',
    icon: '🏆',
    shortLabel: 'ACHIEVEMENTS',
  },
  {
    id: 'power-ups',
    label: 'Power-ups Store',
    summary: 'Spend points on XP boosts, streak shields, and special items',
    icon: '💎',
    shortLabel: 'STORE',
  },
];

const MOBILE_FOOTER_WORKSPACE_IDS = [
  'planning',
  'goals',
  'habits',
  'support',
  'ai-coach',
  'journal',
  'breathing-space',
  'insights',
  'rituals',
  'account',
] as const;

export default function App() {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const {
    session: supabaseSession,
    initializing,
    isConfigured,
    isAuthenticated,
    mode,
    client,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    signOut,
  } = useSupabaseAuth();
  const { theme, themeMode } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('password');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authMessageVisible, setAuthMessageVisible] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeAuthTab, setActiveAuthTab] = useState<AuthTab>('login');
  const [manualProfileSaving, setManualProfileSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [activeWorkspaceNav, setActiveWorkspaceNav] = useState<string>('goals');
  const [initialSearch] = useState(() =>
    typeof window !== 'undefined' ? window.location.search : '',
  );
  const [showAuthPanel, setShowAuthPanel] = useState(false);
  const isMobileViewport = useMediaQuery('(max-width: 720px)');
  const [showMobileHome, setShowMobileHome] = useState(false);
  const [workspaceProfile, setWorkspaceProfile] = useState<WorkspaceProfileRow | null>(null);
  const [workspaceStats, setWorkspaceStats] = useState<WorkspaceStats | null>(null);
  const [workspaceProfileLoading, setWorkspaceProfileLoading] = useState(false);
  const [showWorkspaceSetup, setShowWorkspaceSetup] = useState(false);
  const [workspaceSetupDismissed, setWorkspaceSetupDismissed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMobileGamification, setShowMobileGamification] = useState(false);
  const [isMobileThemeSelectorOpen, setIsMobileThemeSelectorOpen] = useState(false);
  const [showAiCoachModal, setShowAiCoachModal] = useState(false);

  const { xpToasts, dismissXPToast, levelInfo } = useGamification(supabaseSession);

  const workspaceNavItems = useMemo(() => {
    if (theme === 'bio-day') {
      const createNavImage = (src: string) => (
        <img src={src} alt="" className="workspace-sidebar__nav-image" />
      );

      return BASE_WORKSPACE_NAV_ITEMS.map((item) => {
        if (item.id === 'goals') {
          return { ...item, icon: createNavImage(bioDayChartIcon) } satisfies WorkspaceNavItem;
        }
        if (item.id === 'planning') {
          return { ...item, icon: createNavImage(bioDayCheckIcon) } satisfies WorkspaceNavItem;
        }
        return item;
      });
    }

    return BASE_WORKSPACE_NAV_ITEMS;
  }, [theme]);

  const mobileMenuNavItems: MobileMenuNavItem[] = useMemo(() => {
    const findWorkspaceItem = (navId: string) =>
      workspaceNavItems.find((item) => item.id === navId);

    return MOBILE_FOOTER_WORKSPACE_IDS.map((navId) => {
      const item = findWorkspaceItem(navId);
      const shortLabel = item?.shortLabel ?? item?.label ?? navId;
      const formattedLabel =
        shortLabel.length > 0
          ? `${shortLabel.charAt(0)}${shortLabel.slice(1).toLowerCase()}`
          : shortLabel;

      if (navId === 'account') {
        return {
          id: navId,
          label: 'Account',
          ariaLabel: 'Account and profile',
          icon: '👤',
          summary: 'Manage your profile, workspace, and sign-in preferences.',
        } satisfies MobileMenuNavItem;
      }

      return {
        id: navId,
        label: formattedLabel,
        ariaLabel: item?.label ?? formattedLabel,
        icon: item?.icon ?? '•',
        summary: item?.summary ?? 'Open this section.',
      } satisfies MobileMenuNavItem;
    });
  }, [workspaceNavItems]);

  const mobileFooterNavItems = useMemo(
    () => mobileMenuNavItems.filter((item) => item.id === 'planning' || item.id === 'ai-coach'),
    [mobileMenuNavItems],
  );

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }).format(new Date()),
    [],
  );

  const mobileFooterStatus = useMemo(() => {
    const levelNumber = levelInfo?.currentLevel ?? 1;
    const progressPercent = Math.round(levelInfo?.progressPercentage ?? 0);

    return {
      label: `Level ${levelNumber}`,
      description: progressPercent > 0 ? `${progressPercent}% to L${levelNumber + 1}` : 'Keep building your streak',
      icon: '⚡️',
      progress: progressPercent,
    } as const;
  }, [levelInfo]);

  const mobileActiveNavId = showMobileHome ? 'planning' : activeWorkspaceNav;

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
      setManualProfileSaving(false);
      return;
    }
    setDisplayName(
      workspaceProfile?.full_name ||
        (supabaseSession.user.user_metadata?.full_name as string | undefined) ||
        '',
    );
  }, [supabaseSession, activeSession, workspaceProfile]);

  useEffect(() => {
    if (!supabaseSession || !isConfigured) {
      setWorkspaceProfile(null);
      setWorkspaceStats(null);
      setWorkspaceProfileLoading(false);
      setShowWorkspaceSetup(false);
      setWorkspaceSetupDismissed(false);
      return;
    }

    let isMounted = true;
    setWorkspaceProfileLoading(true);

    // Note: Workspace setup dialog is not auto-opened here.
    // Users can manually open it via "Edit Account Details" if needed.
    fetchWorkspaceProfile(supabaseSession.user.id)
      .then(({ data }) => {
        if (!isMounted) return;
        setWorkspaceProfile(data);
      })
      .finally(() => {
        if (isMounted) {
          setWorkspaceProfileLoading(false);
        }
      });

    fetchWorkspaceStats(supabaseSession.user.id).then(({ data }) => {
      if (!isMounted) return;
      setWorkspaceStats(data);
    });

    return () => {
      isMounted = false;
    };
  }, [supabaseSession, isConfigured, workspaceSetupDismissed]);

  useEffect(() => {
    if (!supabaseSession?.user?.id) {
      setWorkspaceSetupDismissed(false);
    }
  }, [supabaseSession?.user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.pathname === '/journal') {
      setActiveWorkspaceNav('journal');
    } else if (window.location.pathname === '/breathing-space') {
      setActiveWorkspaceNav('breathing-space');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchSuffix = initialSearch ?? '';
    let nextPath = '/';
    if (activeWorkspaceNav === 'journal') {
      nextPath = '/journal';
    } else if (activeWorkspaceNav === 'breathing-space') {
      nextPath = '/breathing-space';
    }
    const nextUrl = `${nextPath}${searchSuffix}`;
    if (window.location.pathname !== nextPath) {
      window.history.replaceState({}, '', nextUrl);
    }
  }, [activeWorkspaceNav, initialSearch]);

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
    if (!authMessage) {
      setAuthMessageVisible(false);
      return;
    }

    setAuthMessageVisible(true);

    const fadeTimer = window.setTimeout(() => setAuthMessageVisible(false), 1500);
    const clearTimer = window.setTimeout(() => setAuthMessage(null), 2100);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(clearTimer);
    };
  }, [authMessage]);

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

    // Read values directly from the form to handle browser autofill
    const formData = new FormData(event.currentTarget);
    const formEmail = (formData.get('email') as string)?.trim() || '';
    const formPassword = (formData.get('password') as string)?.trim() || '';
    const formFullName = (formData.get('fullName') as string)?.trim() || '';

    // Update state to sync with actual form values
    setEmail(formEmail);
    setPassword(formPassword);
    setFullName(formFullName);

    if (!formEmail) {
      setAuthError('Enter an email address to continue.');
      return;
    }

    setSubmitting(true);

    try {
      if (authMode === 'password') {
        if (!formPassword) {
          setAuthError('Enter a password to continue.');
          return;
        }
        await signInWithPassword({ email: formEmail, password: formPassword });
        setAuthMessage('Signed in successfully.');
        setShowAuthPanel(false);
        setActiveWorkspaceNav('planning');
        if (isMobileViewport) {
          setShowMobileHome(true);
        }
      } else if (authMode === 'signup') {
        if (!formPassword) {
          setAuthError('Create a password to finish signing up.');
          return;
        }
        if (!formFullName) {
          setAuthError('Share your name so we can personalize your workspace.');
          return;
        }
        await signUpWithPassword({
          email: formEmail,
          password: formPassword,
          options: {
            data: {
              full_name: formFullName,
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

  const handleEditAccountDetails = () => {
    if (!isAuthenticated) {
      handleAccountClick();
      return;
    }
    setWorkspaceSetupDismissed(false);
    setShowWorkspaceSetup(true);
  };

  const handleDemoSignIn = async () => {
    setAuthMessage(null);
    setAuthError(null);
    setSubmitting(true);
    try {
      await signInWithPassword({ email: DEMO_USER_EMAIL, password: 'demo-password' });
      setAuthMessage('Signed in to the demo workspace.');
      setShowAuthPanel(false);
      setActiveWorkspaceNav('planning');
      if (isMobileViewport) {
        setShowMobileHome(true);
      }
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
      await flushProfileAutosave().catch((error) => {
        console.warn('Unable to flush profile autosave before signing out.', error);
      });
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

  const openHabitsWorkspaceSection = () => {
    setActiveWorkspaceNav('planning');
    setShowMobileHome(false);
  };

  const openTodayHome = () => {
    setActiveWorkspaceNav('planning');
    setShowMobileHome(true);
  };

  const handleMobileNavSelect = (navId: string) => {
    setIsMobileMenuOpen(false);

    if (navId === 'account' && !isAuthenticated) {
      handleAccountClick();
      return;
    }

    if (navId === 'ai-coach') {
      setShowAiCoachModal(true);
      return;
    }

    if (navId === 'planning' && isMobileViewport) {
      openTodayHome();
      return;
    }

    setActiveWorkspaceNav(navId);
    setShowMobileHome(false);
  };

  const handleJournalNavigation = useCallback((navId: string) => {
    setActiveWorkspaceNav(navId);
    setShowMobileHome(false);
  }, []);

  // Quick Actions FAB handlers
  const handleQuickCheckHabit = useCallback(() => {
    setActiveWorkspaceNav('planning');
    setShowMobileHome(false);
  }, []);

  const handleQuickJournalNow = useCallback((type: string) => {
    setActiveWorkspaceNav('journal');
    setShowMobileHome(false);
    // Note: Journal type selection could be passed via context in future enhancement
  }, []);

  const handleOpenLifeCoach = useCallback(() => {
    // Life Coach modal is handled within the FAB component
  }, []);

  const statusElements = (
    <>
      {authMessage && (
        <p
          className={`supabase-auth__status supabase-auth__status--success ${
            authMessageVisible ? '' : 'supabase-auth__status--hidden'
          }`}
        >
          {authMessage}
        </p>
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
        <li>Preview Today's Habits and goal dashboards.</li>
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

  const profileInitials =
    workspaceProfile?.initials || generateInitials(workspaceProfile?.full_name || '');
  // Use initials from profile if enabled, otherwise use first letter
  const shouldShowInitials = isAuthenticated && workspaceProfile?.show_initials_in_menu && profileInitials;
  const menuIconContent = shouldShowInitials ? profileInitials : '🌿';
  
  const activeWorkspaceItem =
    workspaceNavItems.find((item) => item.id === activeWorkspaceNav) ??
    workspaceNavItems[workspaceNavItems.length - 1];

  const isDemoExperience = isDemoSession(activeSession);
  const normalizedDisplayName =
    displayName.trim() ||
    workspaceProfile?.full_name ||
    ((supabaseSession?.user.user_metadata?.full_name as string | undefined) ?? '') ||
    '';

  const profileAutoSaveResetKey = supabaseSession
    ? `${
        supabaseSession.user.id
      }:${
        workspaceProfile?.full_name ||
        ((supabaseSession.user.user_metadata?.full_name as string | undefined) ?? '') ||
        ''
      }`
    : 'demo';

  const persistProfileName = useCallback(
    async (nextName: string) => {
      if (!supabaseSession) return;
      const trimmed = nextName.trim();
      if (!trimmed) return;

      const supabaseClient = client ?? getSupabaseClient();

      const [authResult, profileResult] = await Promise.all([
        supabaseClient.auth.updateUser({
          data: {
            full_name: trimmed,
            onboarding_complete: true,
          },
        }),
        upsertWorkspaceProfile({
          ...workspaceProfile,
          user_id: supabaseSession.user.id,
          full_name: trimmed,
          initials: generateInitials(trimmed),
        }),
      ]);

      if (authResult.error) throw authResult.error;
      if (profileResult.error) throw profileResult.error;

      if (profileResult.data) {
        setWorkspaceProfile(profileResult.data);
      } else {
        setWorkspaceProfile((current) => {
          if (!current) return current;
          return { ...current, full_name: trimmed };
        });
      }
    },
    [client, supabaseSession, workspaceProfile?.workspace_name],
  );

  const {
    isSaving: isProfileAutosaving,
    flush: flushProfileAutosave,
    error: profileAutosaveError,
  } = useContinuousSave({
    value: normalizedDisplayName,
    enabled: Boolean(supabaseSession && client),
    resetKey: profileAutoSaveResetKey,
    save: persistProfileName,
    debounceMs: 1800,
  });

  const profileSaving = manualProfileSaving || isProfileAutosaving;
  const isOnboardingGateActive = !isDemoExperience;
  const canAccessWorkspace = !isOnboardingGateActive || isOnboardingComplete;

  const shouldRequireAuthentication = !isDemoExperience && !isAuthenticated && !isDemoMode;

  useEffect(() => {
    if (profileAutosaveError) {
      setAuthError(profileAutosaveError);
    }
  }, [profileAutosaveError]);
  const shouldShowWorkspaceSetup =
    showWorkspaceSetup && !shouldRequireAuthentication && isConfigured && Boolean(supabaseSession);

  const handleCloseWorkspaceSetup = () => {
    setShowWorkspaceSetup(false);
    setWorkspaceSetupDismissed(true);
  };

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
                <p>Review Today's Habits once you're signed in to your workspace.</p>
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
  const isAuthOverlayVisible = shouldForceAuthOverlay || showAuthPanel;
  const isAnyModalVisible = isAuthOverlayVisible;

  const renderWorkspaceSection = () => {
    if (activeWorkspaceNav === 'goals') {
      return (
        <>
          {isOnboardingGateActive && !isOnboardingComplete && (
            <OnboardingCard
              session={activeSession}
              displayName={displayName}
              setDisplayName={setDisplayName}
              profileSaving={profileSaving}
              setProfileSaving={setManualProfileSaving}
              setAuthMessage={setAuthMessage}
              setAuthError={setAuthError}
              isOnboardingComplete={isOnboardingComplete}
            />
          )}

          {canAccessWorkspace ? (
            <div className="workspace-content">
              <ProgressDashboard session={activeSession} stats={workspaceStats} />
              <GoalWorkspace session={activeSession} />
            </div>
          ) : (
            <p className="workspace-onboarding-hint">
              Finish onboarding to unlock the goal workspace and habit trackers.
            </p>
          )}
        </>
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
            onEditProfile={handleEditAccountDetails}
            profile={workspaceProfile}
            stats={workspaceStats}
            profileLoading={workspaceProfileLoading}
            onProfileUpdate={setWorkspaceProfile}
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
            {isMobileViewport ? (
              <div className="workspace-link-callout">
                <p className="workspace-link-callout__text">Prefer the simplified Today home?</p>
                <button
                  type="button"
                  className="workspace-link-callout__button"
                  onClick={openTodayHome}
                >
                  Open Today screen
                </button>
              </div>
            ) : null}
            <DailyHabitTracker session={activeSession} />
            <HabitsModule session={activeSession} />
          </div>
        );
      case 'rituals':
        return (
          <div className="workspace-content">
            <LifeWheelCheckins session={activeSession} />
          </div>
        );
      case 'habits':
        return <div className="workspace-content" />;
      case 'journal':
        return (
          <div className="workspace-content">
            <Journal
              session={activeSession}
              onNavigateToGoals={() => handleJournalNavigation('support')}
              onNavigateToHabits={() => handleJournalNavigation('planning')}
            />
          </div>
        );
      case 'breathing-space':
        return (
          <div className="workspace-content">
            <BreathingSpace session={activeSession} />
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
            <GoalReflectionJournal session={activeSession} />
          </div>
        );
      case 'achievements':
        return (
          <div className="workspace-content">
            <AchievementsPage session={activeSession} />
          </div>
        );
      case 'power-ups':
        return (
          <div className="workspace-content">
            <PowerUpsStore session={activeSession} />
          </div>
        );
      default:
        return (
          <div className="workspace-stage__placeholder">
            <div className="workspace-stage__placeholder-content">
              <h2>{activeWorkspaceItem.label}</h2>
              <p>{activeWorkspaceItem.summary}</p>
              <p className="workspace-stage__placeholder-hint">
                Select "Goals & Habits" to access the full workspace preview.
              </p>
            </div>
          </div>
        );
    }
  };

  const mobileMenuOverlay =
    isMobileViewport && isMobileMenuOpen ? (
      <div
        className="mobile-menu-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Open full LifeGoalApp menu"
      >
        <div
          className="mobile-menu-overlay__backdrop"
          onClick={() => {
            setIsMobileMenuOpen(false);
            setIsMobileThemeSelectorOpen(false);
          }}
          role="presentation"
        />
        <div className="mobile-menu-overlay__panel">
          {isMobileThemeSelectorOpen ? (
            <MobileThemeSelector onClose={() => setIsMobileThemeSelectorOpen(false)} />
          ) : (
            <>
              <div className="mobile-menu-overlay__header">
                <h2 className="mobile-menu-overlay__title">Quick menu</h2>
                <button
                  type="button"
                  className="mobile-menu-overlay__close"
                  aria-label="Close menu"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  ×
                </button>
              </div>
              <div className="mobile-menu-overlay__content">
                <ul className="mobile-menu-overlay__list">
                  {mobileMenuNavItems
                    .filter((item) => item.id !== 'account')
                    .map((item) => (
                      <li key={item.id} className="mobile-menu-overlay__item">
                        <button type="button" onClick={() => handleMobileNavSelect(item.id)} aria-label={item.ariaLabel}>
                          <span aria-hidden="true" className="mobile-menu-overlay__icon">
                            {item.icon}
                          </span>
                          <span className="mobile-menu-overlay__texts">
                            <span className="mobile-menu-overlay__label">{item.label}</span>
                            <span className="mobile-menu-overlay__summary">{item.summary}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
              <div className="mobile-menu-overlay__settings">
                <h3 className="mobile-menu-overlay__settings-title">Settings</h3>
                <button
                  type="button"
                  className="mobile-menu-overlay__theme-selector-button"
                  onClick={() => setIsMobileThemeSelectorOpen(true)}
                  aria-label="Open theme selector"
                >
                  <span className="mobile-menu-overlay__theme-selector-label">
                    <span className="mobile-menu-overlay__theme-selector-title">Theme</span>
                    <span className="mobile-menu-overlay__theme-selector-current">
                      {AVAILABLE_THEMES.find(t => t.id === theme)?.name || 'Theme'} 
                      {' • '}
                      {themeMode === 'system' ? '💻 System' : themeMode === 'dark' ? '🌙 Dark' : '☀️ Light'}
                    </span>
                  </span>
                  <span className="mobile-menu-overlay__theme-selector-icon" aria-hidden="true">
                    {AVAILABLE_THEMES.find(t => t.id === theme)?.icon || '🎨'}
                  </span>
                </button>
                <button
                  type="button"
                  className="mobile-menu-overlay__account-button"
                  onClick={() => handleMobileNavSelect('account')}
                  aria-label="Open account settings"
                >
                  <span className="mobile-menu-overlay__account-icon" aria-hidden="true">
                    👤
                  </span>
                  <span>My Account</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    ) : null;

  const mobileGamificationOverlay =
    isMobileViewport && showMobileGamification ? (
      <div
        className="mobile-gamification-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Gamification insights"
      >
        <div
          className="mobile-gamification-overlay__backdrop"
          onClick={() => setShowMobileGamification(false)}
          role="presentation"
        />
        <div className="mobile-gamification-overlay__panel">
          <header className="mobile-gamification-overlay__header">
            <div>
              <p className="mobile-gamification-overlay__eyebrow">Today</p>
              <h2 className="mobile-gamification-overlay__title">Keep building your streak</h2>
              <p className="mobile-gamification-overlay__subtitle">{todayLabel}</p>
            </div>
            <button
              type="button"
              className="mobile-gamification-overlay__close"
              aria-label="Close gamification insights"
              onClick={() => setShowMobileGamification(false)}
            >
              ×
            </button>
          </header>

          <div className="mobile-gamification-overlay__status">
            <div className="mobile-gamification-overlay__status-icon" aria-hidden="true">
              {mobileFooterStatus?.icon ?? '⚡️'}
            </div>
            <div className="mobile-gamification-overlay__status-content">
              <p className="mobile-gamification-overlay__status-label">{mobileFooterStatus?.label ?? 'Level 1'}</p>
              <p className="mobile-gamification-overlay__status-desc">
                {mobileFooterStatus?.description ?? 'Power through your daily checklist to rank up.'}
              </p>
              {mobileFooterStatus?.progress !== undefined ? (
                <div className="mobile-gamification-overlay__status-progress" aria-hidden="true">
                  <span style={{ width: `${Math.min(Math.max(mobileFooterStatus.progress, 0), 100)}%` }} />
                </div>
              ) : null}
            </div>
          </div>

          <div className="mobile-gamification-overlay__grid" role="list">
            <div className="mobile-gamification-overlay__stat" role="listitem">
              <p className="mobile-gamification-overlay__stat-label">Goals</p>
              <p className="mobile-gamification-overlay__stat-value">{workspaceStats?.goalCount ?? 0}</p>
              <p className="mobile-gamification-overlay__stat-hint">Tracked in your workspace</p>
            </div>
            <div className="mobile-gamification-overlay__stat" role="listitem">
              <p className="mobile-gamification-overlay__stat-label">Habits</p>
              <p className="mobile-gamification-overlay__stat-value">{workspaceStats?.habitCount ?? 0}</p>
              <p className="mobile-gamification-overlay__stat-hint">Active routines to keep you steady</p>
            </div>
            <div className="mobile-gamification-overlay__stat" role="listitem">
              <p className="mobile-gamification-overlay__stat-label">Check-ins</p>
              <p className="mobile-gamification-overlay__stat-value">{workspaceStats?.checkinCount ?? 0}</p>
              <p className="mobile-gamification-overlay__stat-hint">Moments you showed up</p>
            </div>
            <div className="mobile-gamification-overlay__stat mobile-gamification-overlay__stat--cta" role="listitem">
              <div className="mobile-gamification-overlay__stat-icon" aria-hidden="true">💬</div>
              <div>
                <p className="mobile-gamification-overlay__stat-label">Coach</p>
                <p className="mobile-gamification-overlay__stat-hint">Ask for quick strategies or encouragement</p>
              </div>
              <button
                type="button"
                className="mobile-gamification-overlay__coach-button"
                onClick={() => {
                  setShowMobileGamification(false);
                  handleMobileNavSelect('ai-coach');
                }}
              >
                Open coach
              </button>
            </div>
          </div>
        </div>
      </div>
    ) : null;

  if (isMobileViewport && showMobileHome) {
    return (
      <>
        <MobileHabitHome session={activeSession} />
        <MobileFooterNav
          items={mobileFooterNavItems}
          status={mobileFooterStatus}
          activeId={null}
          onSelect={handleMobileNavSelect}
          onStatusClick={() => setShowMobileGamification(true)}
          onOpenMenu={() => setIsMobileMenuOpen(true)}
        />
        {mobileMenuOverlay}
        {mobileGamificationOverlay}
      </>
    );
  }

  const appClassName = `app app--workspace ${isAnyModalVisible ? 'app--auth-overlay' : ''}`;
  const workspaceShellClassName = `workspace-shell ${
    isAnyModalVisible ? 'workspace-shell--blurred' : ''
  }`;

  const canDismissOverlay = isAuthOverlayVisible && !shouldForceAuthOverlay;

  return (
    <div className={appClassName}>
      <div className={workspaceShellClassName}>
        {!isMobileViewport && (
          <aside className="workspace-sidebar" aria-label="Workspace navigation">
            <div className="workspace-sidebar__masthead">
              <a className="workspace-sidebar__brand" href="/" aria-label="LifeGoalApp home">
                <span aria-hidden="true">{menuIconContent}</span>
                <span className="sr-only">LifeGoalApp</span>
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
                {workspaceNavItems.map((item) => {
                  const isActive = activeWorkspaceNav === item.id;
                  const handleNavButtonClick = () => {
                    if (item.id === 'account' && !isAuthenticated) {
                      handleAccountClick();
                      return;
                    }
                    if (item.id === 'ai-coach') {
                      setShowAiCoachModal(true);
                      return;
                    }
                    setActiveWorkspaceNav(item.id);
                  };
                  const navButtonTitle = item.summary ? `${item.label} • ${item.summary}` : item.label;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`workspace-sidebar__nav-button ${
                        isActive ? 'workspace-sidebar__nav-button--active' : ''
                      }`}
                      onClick={handleNavButtonClick}
                      aria-pressed={isActive}
                      aria-label={item.label}
                      title={navButtonTitle}
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
          {(authMessage || authError) && <div className="workspace-status">{statusElements}</div>}

          <section
            className={`workspace-stage ${
              activeWorkspaceNav === 'goals' ? 'workspace-stage--detail' : 'workspace-stage--placeholder'
            }${activeWorkspaceNav === 'account' ? ' workspace-stage--account' : ''}`}
            aria-live="polite"
          >
            <div className="workspace-stage__body">{renderWorkspaceSection()}</div>
          </section>
        </main>
      </div>
      {isMobileViewport ? (
        <MobileFooterNav
          items={mobileFooterNavItems}
          status={mobileFooterStatus}
          activeId={mobileActiveNavId}
          onSelect={handleMobileNavSelect}
          onStatusClick={() => setShowMobileGamification(true)}
          onOpenMenu={() => setIsMobileMenuOpen(true)}
        />
      ) : null}

      {mobileMenuOverlay}
      {mobileGamificationOverlay}

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
      {shouldShowWorkspaceSetup ? (
        <WorkspaceSetupDialog
          isOpen={shouldShowWorkspaceSetup}
          session={supabaseSession}
          profile={workspaceProfile}
          onClose={handleCloseWorkspaceSetup}
          onSaved={(profile) => {
            setWorkspaceProfile(profile);
            setDisplayName(profile.full_name ?? displayName);
            setShowWorkspaceSetup(false);
            setWorkspaceSetupDismissed(false);
            setAuthMessage('Profile saved!');
          }}
        />
      ) : null}

      {/* AI Coach Modal from Main Menu */}
      {showAiCoachModal && (
        <AiCoach session={activeSession} onClose={() => setShowAiCoachModal(false)} />
      )}

      {/* Quick Actions FAB - visible app-wide */}
      {!shouldRequireAuthentication && (
        <QuickActionsFAB
          session={activeSession}
          onCheckHabit={handleQuickCheckHabit}
          onJournalNow={handleQuickJournalNow}
          onOpenLifeCoach={handleOpenLifeCoach}
        />
      )}

      {/* XP Toast Notifications */}
      {xpToasts.map(toast => (
        <XPToast
          key={toast.id}
          amount={toast.amount}
          source={toast.source}
          celebration={toast.celebration}
          onComplete={() => dismissXPToast(toast.id)}
        />
      ))}
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
