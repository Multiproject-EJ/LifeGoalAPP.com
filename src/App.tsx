import {
  FormEvent,
  PointerEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import bioDayChartIcon from './assets/theme-icons/bio-day-chart.svg';
import bioDayCheckIcon from './assets/theme-icons/bio-day-check.svg';
import lifeSpinIcon from './assets/Lifespinicon.webp';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from './features/auth/SupabaseAuthProvider';
import { GoalWorkspace, LifeGoalsSection } from './features/goals';
import { BodyHaircutWidget, DailyHabitTracker, HabitsModule, MobileHabitHome } from './features/habits';
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
import PersonalityTest from './features/identity/PersonalityTest';
import { ActionsTab } from './features/actions';
import { TimerTab } from './features/timer';
import { ProjectsManager } from './features/projects';
import { ScoreTab } from './features/gamification/ScoreTab';
import { ZenGarden } from './features/zen-garden/ZenGarden';
import { DEMO_USER_EMAIL, DEMO_USER_NAME, getDemoProfile, updateDemoProfile } from './services/demoData';
import { createDemoSession, isDemoSession } from './services/demoSession';
import { ThemeToggle } from './components/ThemeToggle';
import { MobileFooterNav } from './components/MobileFooterNav';
import { QuickActionsFAB } from './components/QuickActionsFAB';
import { XPToast } from './components/XPToast';
import { useMediaQuery, WORKSPACE_MOBILE_MEDIA_QUERY } from './hooks/useMediaQuery';
import { useTheme } from './contexts/ThemeContext';
import { useGamification } from './hooks/useGamification';
import { NewDailySpinWheel } from './features/spin-wheel/NewDailySpinWheel';
import {
  fetchWorkspaceProfile,
  upsertWorkspaceProfile,
  type WorkspaceProfileRow,
} from './services/workspaceProfile';
import { fetchWorkspaceStats, type WorkspaceStats } from './services/workspaceStats';
import { getSupabaseClient } from './lib/supabaseClient';
import { useContinuousSave } from './hooks/useContinuousSave';
import { generateInitials } from './utils/initials';
import { GameOfLifeOnboarding } from './features/onboarding/GameOfLifeOnboarding';
import {
  getProfileStrengthDebugSnapshot,
  isProfileStrengthDebugEnabled,
  logProfileStrengthDebugSnapshot,
} from './features/profile-strength/debugProfileStrength';
import { loadProfileStrengthSignals } from './features/profile-strength/profileStrengthData';
import { scoreProfileStrength } from './features/profile-strength/scoreProfileStrength';
import type { AreaKey, NextTask, ProfileStrengthResult } from './features/profile-strength/profileStrengthTypes';
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

const PROFILE_STRENGTH_AREA_LABELS: Record<AreaKey, string> = {
  goals: 'Goals',
  habits: 'Habits',
  journal: 'Journal',
  vision_board: 'Vision Board',
  life_wheel: 'Life Wheel',
  identity: 'Identity',
};

const PROFILE_STRENGTH_MENU_AREAS: Partial<Record<MobileMenuNavItem['id'], AreaKey>> = {
  support: 'goals',
  habits: 'habits',
  journal: 'journal',
  insights: 'vision_board',
  rituals: 'life_wheel',
  identity: 'identity',
};

const PROFILE_STRENGTH_HOLD_DURATION_MS = 520;
const PROFILE_STRENGTH_HOLD_SLOP_PX = 8;

const BASE_WORKSPACE_NAV_ITEMS: WorkspaceNavItem[] = [
  {
    id: 'goals',
    label: 'Dashboard',
    summary: '',
    icon: '📊',
    shortLabel: 'DASHBOARD',
  },
  {
    id: 'planning',
    label: "Today's Habits & Routines",
    summary: 'Check in on the rituals that keep today on track.',
    icon: '✅',
    shortLabel: 'TODAY',
  },
  {
    id: 'actions',
    label: 'Actions',
    summary: 'Jump into quick actions and focus modes.',
    icon: '⚡️',
    shortLabel: 'ACTIONS',
  },
  {
    id: 'score',
    label: 'Score',
    summary: 'Track your points, rewards, and upcoming boosts.',
    icon: '🏆',
    shortLabel: 'SCORE',
  },
  {
    id: 'projects',
    label: 'Projects',
    summary: 'Manage multi-step initiatives and track progress.',
    icon: '📋',
    shortLabel: 'PROJECTS',
  },
  {
    id: 'body',
    label: 'Body',
    summary: 'Tune your body routines and personal care rituals.',
    icon: '💪',
    shortLabel: 'BODY',
  },
  {
    id: 'habits',
    label: 'Habits',
    summary: 'Review habits, streaks, and routines that power your weeks.',
    icon: '🔄',
    shortLabel: 'HABITS',
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
    id: 'game',
    label: 'Game of Life',
    summary: 'View achievements, power-ups, and open your AI coach.',
    icon: '🎮',
    shortLabel: 'GAME',
  },
  {
    id: 'placeholder',
    label: 'Placeholder',
    summary: 'A new section is taking shape. Stay tuned!',
    icon: '🧩',
    shortLabel: 'SOON',
  },
];

const MOBILE_FOOTER_WORKSPACE_IDS = [
  'planning',
  'actions',
  'score',
  'goals',
  'body',
  'habits',
  'support',
  'game',
  'journal',
  'breathing-space',
  'insights',
  'rituals',
  'account',
  'identity',
  'placeholder',
] as const;

// IDs to exclude from the mobile popup menu
// - 'breathing-space': shown in main footer nav
// - 'planning': replaced by ID button (Today is in main footer nav)
// - 'actions': replaced by Settings button (Actions is in main footer nav)
// - 'goals': dashboard removed from popup menu
// - 'score': shop removed from popup menu
// - 'game': Game of Life lives in main menu only
// - 'placeholder': Soon lives in main menu only
const MOBILE_POPUP_EXCLUDED_IDS = [
  'breathing-space',
  'planning',
  'actions',
  'goals',
  'score',
  'game',
  'placeholder',
] as const;

const MOBILE_FOOTER_AUTO_COLLAPSE_IDS = new Set(['identity', 'score', 'breathing-space']);
const MOBILE_FOOTER_AUTO_COLLAPSE_DELAY_MS = 3800;
const MOBILE_FOOTER_SNAP_RESET_MS = 160;

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
  const { theme } = useTheme();

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
  const isMobileViewport = useMediaQuery(WORKSPACE_MOBILE_MEDIA_QUERY);
  const [showMobileHome, setShowMobileHome] = useState(false);
  const [workspaceProfile, setWorkspaceProfile] = useState<WorkspaceProfileRow | null>(null);
  const [workspaceStats, setWorkspaceStats] = useState<WorkspaceStats | null>(null);
  const [workspaceProfileLoading, setWorkspaceProfileLoading] = useState(false);
  const [showWorkspaceSetup, setShowWorkspaceSetup] = useState(false);
  const [workspaceSetupDismissed, setWorkspaceSetupDismissed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBreatheSubmenuOpen, setIsBreatheSubmenuOpen] = useState(false);
  const [breathingSpaceMobileTab, setBreathingSpaceMobileTab] = useState<'breathing' | 'meditation'>('breathing');
  const [showMobileGamification, setShowMobileGamification] = useState(false);
  const [isMobileMenuImageActive, setIsMobileMenuImageActive] = useState(true);
  const [showAiCoachModal, setShowAiCoachModal] = useState(false);
  const [showDailySpinWheel, setShowDailySpinWheel] = useState(false);
  const [isMobileFooterCollapsed, setIsMobileFooterCollapsed] = useState(false);
  const [isMobileFooterSnapActive, setIsMobileFooterSnapActive] = useState(false);
  const mobileFooterCollapseTimeoutRef = useRef<number | null>(null);
  const mobileFooterSnapTimeoutRef = useRef<number | null>(null);
  const lastMobileScrollYRef = useRef(0);
  const [isProfileStrengthOpen, setIsProfileStrengthOpen] = useState(false);
  const [activeProfileStrengthHold, setActiveProfileStrengthHold] = useState<{
    area: AreaKey;
    task: NextTask | null;
  } | null>(null);
  const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(true);
  const [isDesktopMenuPinned, setIsDesktopMenuPinned] = useState(false);
  const desktopMenuAutoHideTimeoutRef = useRef<number | null>(null);
  const [isMobileMenuFlashActive, setIsMobileMenuFlashActive] = useState(false);
  const mobileMenuFlashTimeoutRef = useRef<number | null>(null);
  const profileStrengthHoldTimeoutRef = useRef<number | null>(null);
  const profileStrengthHoldTriggeredRef = useRef(false);
  const profileStrengthHoldStartRef = useRef<{ x: number; y: number } | null>(null);

  const {
    xpToasts,
    dismissXPToast,
    levelInfo,
    profile: gamificationProfile,
    enabled: gamificationEnabled,
    loading: gamificationLoading,
  } = useGamification(supabaseSession);

  const pointsBalance = gamificationProfile?.total_points ?? 0;
  const zenTokenBalance = gamificationProfile?.zen_tokens ?? 0;
  const streakMomentum = gamificationProfile?.current_streak ?? 0;
  const currentLevel = levelInfo?.currentLevel ?? 1;
  const isProfileStrengthDebugActive = useMemo(() => isProfileStrengthDebugEnabled(), []);

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
          label: 'Settings',
          ariaLabel: 'Settings and profile',
          icon: '⚙️',
          summary: 'Manage your profile, workspace, and preferences.',
        } satisfies MobileMenuNavItem;
      }

      if (navId === 'identity') {
        return {
          id: navId,
          label: 'ID',
          ariaLabel: 'Your identity and preferences',
          icon: '🪪',
          summary: 'Explore your personality and preferences.',
        } satisfies MobileMenuNavItem;
      }

      if (navId === 'body') {
        return {
          id: navId,
          label: 'Body',
          ariaLabel: 'Body routines and care',
          icon: '💪',
          summary: 'Refresh your body-focused routines and personal care rituals.',
        } satisfies MobileMenuNavItem;
      }

      if (navId === 'habits') {
        return {
          id: navId,
          label: 'Habits',
          ariaLabel: 'Habits and routines',
          icon: '🔄',
          summary: 'Review weekly habits, streaks, and routines in progress.',
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

  useEffect(() => {
    if (!isMobileMenuOpen) {
      setIsBreatheSubmenuOpen(false);
    }
  }, [isMobileMenuOpen]);

  useEffect(() => {
    return () => {
      if (mobileMenuFlashTimeoutRef.current !== null) {
        window.clearTimeout(mobileMenuFlashTimeoutRef.current);
      }
      if (mobileFooterCollapseTimeoutRef.current !== null) {
        window.clearTimeout(mobileFooterCollapseTimeoutRef.current);
      }
      if (mobileFooterSnapTimeoutRef.current !== null) {
        window.clearTimeout(mobileFooterSnapTimeoutRef.current);
      }
    };
  }, []);

  const mobileFooterNavItems = useMemo(() => {
    const footerIds: MobileMenuNavItem['id'][] = [
      'planning',
      'breathing-space',
      'score',
      'actions',
    ];
    return footerIds
      .map((id) => mobileMenuNavItems.find((item) => item.id === id))
      .filter((item): item is MobileMenuNavItem => Boolean(item));
  }, [mobileMenuNavItems]);

  const triggerMobileMenuFlash = () => {
    if (mobileMenuFlashTimeoutRef.current !== null) {
      window.clearTimeout(mobileMenuFlashTimeoutRef.current);
    }
    setIsMobileMenuFlashActive(true);
    mobileMenuFlashTimeoutRef.current = window.setTimeout(() => {
      setIsMobileMenuFlashActive(false);
      mobileMenuFlashTimeoutRef.current = null;
    }, 700);
  };

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
    const xpProgress = levelInfo?.xpProgress ?? 0;
    const xpNeeded = Math.max(0, (levelInfo?.xpForNextLevel ?? 0) - (levelInfo?.xpForCurrentLevel ?? 0));
    const xpProgressLabel = `${xpProgress.toLocaleString()}/${xpNeeded.toLocaleString()} XP`;

    return {
      label: 'Game',
      levelLabel: `Level ${levelNumber}`,
      description:
        progressPercent > 0
          ? `${progressPercent}% to L${levelNumber + 1} • ${xpProgressLabel}`
          : `Keep building your streak • ${xpProgressLabel}`,
      icon: '🎮',
      progress: progressPercent,
    } as const;
  }, [levelInfo]);

  const isGameNearNextLevel = Math.round(levelInfo?.progressPercentage ?? 0) >= 95;

  const mobileActiveNavId = showMobileHome ? 'planning' : activeWorkspaceNav;
  const shouldAutoCollapseMobileFooter =
    isMobileViewport &&
    (isMobileMenuImageActive ||
      (mobileActiveNavId !== null && MOBILE_FOOTER_AUTO_COLLAPSE_IDS.has(mobileActiveNavId)));

  const scheduleMobileFooterCollapse = useCallback(() => {
    if (!shouldAutoCollapseMobileFooter) {
      return;
    }
    if (mobileFooterCollapseTimeoutRef.current !== null) {
      window.clearTimeout(mobileFooterCollapseTimeoutRef.current);
    }
    mobileFooterCollapseTimeoutRef.current = window.setTimeout(() => {
      setIsMobileFooterCollapsed(true);
      mobileFooterCollapseTimeoutRef.current = null;
    }, MOBILE_FOOTER_AUTO_COLLAPSE_DELAY_MS);
  }, [shouldAutoCollapseMobileFooter]);

  const handleMobileFooterExpand = useCallback(
    (shouldSnap: boolean) => {
      if (!shouldAutoCollapseMobileFooter) {
        return;
      }
      if (shouldSnap) {
        if (mobileFooterSnapTimeoutRef.current !== null) {
          window.clearTimeout(mobileFooterSnapTimeoutRef.current);
        }
        setIsMobileFooterSnapActive(true);
        mobileFooterSnapTimeoutRef.current = window.setTimeout(() => {
          setIsMobileFooterSnapActive(false);
          mobileFooterSnapTimeoutRef.current = null;
        }, MOBILE_FOOTER_SNAP_RESET_MS);
      }
      setIsMobileFooterCollapsed(false);
      scheduleMobileFooterCollapse();
    },
    [scheduleMobileFooterCollapse, shouldAutoCollapseMobileFooter],
  );

  useEffect(() => {
    if (!shouldAutoCollapseMobileFooter) {
      setIsMobileFooterCollapsed(false);
      if (mobileFooterCollapseTimeoutRef.current !== null) {
        window.clearTimeout(mobileFooterCollapseTimeoutRef.current);
        mobileFooterCollapseTimeoutRef.current = null;
      }
      return;
    }
    setIsMobileFooterCollapsed(true);
    scheduleMobileFooterCollapse();
  }, [scheduleMobileFooterCollapse, shouldAutoCollapseMobileFooter]);

  useEffect(() => {
    if (!isMobileViewport || !isMobileMenuImageActive || typeof window === 'undefined') {
      return;
    }

    lastMobileScrollYRef.current = window.scrollY;
    const threshold = 8;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastMobileScrollYRef.current;

      if (delta > threshold) {
        setIsMobileFooterCollapsed(true);
      } else if (delta < -threshold) {
        handleMobileFooterExpand(false);
      }

      lastMobileScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleMobileFooterExpand, isMobileMenuImageActive, isMobileViewport]);

  const isDemoMode = mode === 'demo';
  const [demoProfile, setDemoProfile] = useState(() => getDemoProfile());

  const activeSession = useMemo(() => {
    if (supabaseSession) {
      return supabaseSession;
    }
    return createDemoSession();
  }, [supabaseSession, demoProfile]);

  const [profileStrengthDebugSnapshot, setProfileStrengthDebugSnapshot] =
    useState<ProfileStrengthResult | null>(null);
  const [profileStrengthSnapshot, setProfileStrengthSnapshot] =
    useState<ProfileStrengthResult | null>(null);
  const [isProfileStrengthLoading, setIsProfileStrengthLoading] = useState(false);

  useEffect(() => {
    if (!isProfileStrengthDebugActive) {
      setProfileStrengthDebugSnapshot(null);
      return;
    }

    let isMounted = true;

    getProfileStrengthDebugSnapshot(activeSession?.user?.id ?? null).then((snapshot) => {
      if (isMounted) {
        setProfileStrengthDebugSnapshot(snapshot);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [activeSession?.user?.id, isProfileStrengthDebugActive]);

  useEffect(() => {
    if (!isProfileStrengthDebugActive || !profileStrengthDebugSnapshot) {
      return;
    }

    logProfileStrengthDebugSnapshot(profileStrengthDebugSnapshot);
  }, [isProfileStrengthDebugActive, profileStrengthDebugSnapshot]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    let isMounted = true;
    setIsProfileStrengthLoading(true);

    loadProfileStrengthSignals(activeSession?.user?.id ?? null)
      .then((signals) => {
        if (!isMounted) {
          return;
        }
        const snapshot = scoreProfileStrength(signals);
        setProfileStrengthSnapshot(snapshot);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setProfileStrengthSnapshot((previous) => previous ?? scoreProfileStrength());
      })
      .finally(() => {
        if (isMounted) {
          setIsProfileStrengthLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeSession?.user?.id, isMobileMenuOpen]);

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

  useEffect(() => () => {
    if (desktopMenuAutoHideTimeoutRef.current !== null) {
      window.clearTimeout(desktopMenuAutoHideTimeoutRef.current);
      desktopMenuAutoHideTimeoutRef.current = null;
    }
  }, []);

  const isOnboardingComplete = useMemo(() => {
    return Boolean(activeSession.user.user_metadata?.onboarding_complete);
  }, [activeSession]);

  const handleDemoProfileSave = useCallback(
    (payload: { displayName: string; onboardingComplete: boolean }) => {
      updateDemoProfile(payload);
      setDemoProfile(getDemoProfile());
    },
    [],
  );

  const scheduleDesktopMenuAutoHide = useCallback(() => {
    if (isMobileViewport || !isDesktopMenuOpen || isDesktopMenuPinned) return;
    if (desktopMenuAutoHideTimeoutRef.current !== null) {
      window.clearTimeout(desktopMenuAutoHideTimeoutRef.current);
    }
    desktopMenuAutoHideTimeoutRef.current = window.setTimeout(() => {
      setIsDesktopMenuOpen(false);
      desktopMenuAutoHideTimeoutRef.current = null;
    }, 3000);
  }, [isDesktopMenuOpen, isMobileViewport, isDesktopMenuPinned]);

  const handleDesktopMenuPinToggle = () => {
    setIsDesktopMenuPinned((current) => {
      const nextValue = !current;
      if (nextValue) {
        setIsDesktopMenuOpen(true);
        if (desktopMenuAutoHideTimeoutRef.current !== null) {
          window.clearTimeout(desktopMenuAutoHideTimeoutRef.current);
          desktopMenuAutoHideTimeoutRef.current = null;
        }
      }
      return nextValue;
    });
  };

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

    if (navId === 'game' && isMobileViewport) {
      setShowMobileGamification(true);
      return;
    }

    if (navId === 'account' && !isAuthenticated) {
      handleAccountClick();
      return;
    }

    if (navId === 'planning' && isMobileViewport) {
      openTodayHome();
      return;
    }

    setActiveWorkspaceNav(navId);
    setShowMobileHome(false);
  };

  const handleProfileStrengthTaskClick = () => {
    if (profileStrengthTask?.action.type === 'navigate') {
      handleMobileNavSelect(profileStrengthTask.action.target);
      return;
    }
    handleMobileNavSelect('planning');
  };

  const clearProfileStrengthHoldTimer = useCallback(() => {
    if (profileStrengthHoldTimeoutRef.current !== null) {
      window.clearTimeout(profileStrengthHoldTimeoutRef.current);
      profileStrengthHoldTimeoutRef.current = null;
    }
  }, []);

  const openProfileStrengthHold = useCallback(
    (area: AreaKey) => {
      const task = profileStrengthSnapshot?.nextTasksByArea[area]?.[0] ?? null;
      setActiveProfileStrengthHold({ area, task });
    },
    [profileStrengthSnapshot],
  );

  const handleProfileStrengthHoldStart = useCallback(
    (event: PointerEvent<HTMLButtonElement>, area: AreaKey | null) => {
      if (!isMobileViewport || !area || event.pointerType === 'mouse') {
        return;
      }
      profileStrengthHoldTriggeredRef.current = false;
      profileStrengthHoldStartRef.current = { x: event.clientX, y: event.clientY };
      clearProfileStrengthHoldTimer();
      profileStrengthHoldTimeoutRef.current = window.setTimeout(() => {
        profileStrengthHoldTriggeredRef.current = true;
        openProfileStrengthHold(area);
      }, PROFILE_STRENGTH_HOLD_DURATION_MS);
    },
    [clearProfileStrengthHoldTimer, isMobileViewport, openProfileStrengthHold],
  );

  const handleProfileStrengthHoldMove = useCallback(
    (event: PointerEvent<HTMLButtonElement>, area: AreaKey | null) => {
      if (!isMobileViewport || !area || !profileStrengthHoldStartRef.current) {
        return;
      }
      const deltaX = event.clientX - profileStrengthHoldStartRef.current.x;
      const deltaY = event.clientY - profileStrengthHoldStartRef.current.y;
      if (Math.hypot(deltaX, deltaY) > PROFILE_STRENGTH_HOLD_SLOP_PX) {
        clearProfileStrengthHoldTimer();
      }
    },
    [clearProfileStrengthHoldTimer, isMobileViewport],
  );

  const handleProfileStrengthHoldEnd = useCallback(() => {
    clearProfileStrengthHoldTimer();
    profileStrengthHoldStartRef.current = null;
  }, [clearProfileStrengthHoldTimer]);

  const handleProfileStrengthHoldAction = useCallback(() => {
    if (!activeProfileStrengthHold) {
      return;
    }
    const { task } = activeProfileStrengthHold;
    if (task?.action.type === 'navigate') {
      handleMobileNavSelect(task.action.target);
      setActiveProfileStrengthHold(null);
      return;
    }
    if (task?.action.target) {
      handleMobileNavSelect(task.action.target);
      setActiveProfileStrengthHold(null);
      return;
    }
    if (task) {
      handleMobileNavSelect('planning');
      setActiveProfileStrengthHold(null);
      return;
    }
    setActiveProfileStrengthHold(null);
  }, [activeProfileStrengthHold, handleMobileNavSelect]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      setActiveProfileStrengthHold(null);
    }
  }, [isMobileMenuOpen]);

  useEffect(() => {
    return () => {
      clearProfileStrengthHoldTimer();
    };
  }, [clearProfileStrengthHoldTimer]);

  const handleMobileGameOverlayCardClick = () => {
    setActiveWorkspaceNav('game');
    setShowMobileHome(false);
  };

  const handleMobileGameStatusClick = () => {
    setShowMobileGamification(true);
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

  const profileStrengthPercent = profileStrengthSnapshot?.overallPercent;
  const profileStrengthPercentLabel =
    profileStrengthPercent !== null && profileStrengthPercent !== undefined
      ? `${profileStrengthPercent}%`
      : '—';
  const profileStrengthTitle =
    profileStrengthPercent !== null && profileStrengthPercent !== undefined
      ? `${profileStrengthPercent}% charged`
      : 'Profile strength';
  const profileStrengthTask = profileStrengthSnapshot?.globalNextTask ?? null;
  const profileStrengthSubtitle = profileStrengthTask
    ? `Next: ${profileStrengthTask.title}`
    : profileStrengthPercent !== null && profileStrengthPercent !== undefined
      ? 'Keep improving your profile for stronger guidance.'
      : isProfileStrengthLoading
        ? 'Checking your profile data…'
        : 'Add more details to unlock your strength score.';
  const profileStrengthDetailSubtitle =
    profileStrengthPercent !== null && profileStrengthPercent !== undefined
      ? 'Based on coverage, quality, and recency across your profile.'
      : 'We will calculate this once enough profile data is available.';

  const profileStrengthTopGaps = useMemo(() => {
    if (!profileStrengthSnapshot) {
      return [];
    }
    const entries = Object.entries(profileStrengthSnapshot.areaScores)
      .filter(([, score]) => typeof score === 'number')
      .map(([area, score]) => ({
        area: area as AreaKey,
        score: score as number,
      }))
      .sort((a, b) => a.score - b.score);
    return entries.slice(0, 2).map(({ area, score }) => ({
      label: PROFILE_STRENGTH_AREA_LABELS[area],
      score,
    }));
  }, [profileStrengthSnapshot]);
  
  const activeWorkspaceItem =
    workspaceNavItems.find((item) => item.id === activeWorkspaceNav) ??
    workspaceNavItems[workspaceNavItems.length - 1];

  const isDemoExperience = isDemoMode && isDemoSession(activeSession);
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

      const currentAuthName =
        ((supabaseSession.user.user_metadata?.full_name as string | undefined) ?? '').trim();
      const currentProfileName = (workspaceProfile?.full_name ?? '').trim();
      const isOnboardingComplete = Boolean(supabaseSession.user.user_metadata?.onboarding_complete);

      const shouldUpdateAuth = currentAuthName !== trimmed || !isOnboardingComplete;
      const shouldUpdateProfile = !workspaceProfile || currentProfileName !== trimmed;

      if (!shouldUpdateAuth && !shouldUpdateProfile) {
        return;
      }

      const supabaseClient = client ?? getSupabaseClient();

      const [authResult, profileResult] = await Promise.all([
        shouldUpdateAuth
          ? supabaseClient.auth.updateUser({
              data: {
                full_name: trimmed,
                onboarding_complete: true,
              },
            })
          : Promise.resolve({ error: null }),
        shouldUpdateProfile
          ? upsertWorkspaceProfile({
              ...workspaceProfile,
              user_id: supabaseSession.user.id,
              full_name: trimmed,
              initials: generateInitials(trimmed),
            })
          : Promise.resolve({ data: workspaceProfile ?? null, error: null }),
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
  const isOnboardingGateActive = true;
  const canAccessWorkspace = !isOnboardingGateActive || isOnboardingComplete;

  const shouldRequireAuthentication = !isAuthenticated && !isDemoMode;

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
            <GameOfLifeOnboarding
              session={activeSession}
              displayName={displayName}
              setDisplayName={setDisplayName}
              profileSaving={profileSaving}
              setProfileSaving={setManualProfileSaving}
              setAuthMessage={setAuthMessage}
              setAuthError={setAuthError}
              isDemoExperience={isDemoExperience}
              onSaveDemoProfile={handleDemoProfileSave}
              onNavigateDashboard={() => setActiveWorkspaceNav('goals')}
              onOpenCoach={() => setShowAiCoachModal(true)}
            />
          )}

          {canAccessWorkspace ? (
            <div className="workspace-content">
              <ProgressDashboard session={activeSession} stats={workspaceStats} />
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
      case 'actions':
        return (
          <div className="workspace-content">
            <ActionsTab
              session={activeSession}
              onNavigateToProjects={() => setActiveWorkspaceNav('projects')}
              onNavigateToTimer={() => setActiveWorkspaceNav('timer')}
            />
          </div>
        );
      case 'timer':
        return (
          <div className="workspace-content">
            <TimerTab onNavigateToActions={() => setActiveWorkspaceNav('actions')} />
          </div>
        );
      case 'score':
        return (
          <div className="workspace-content">
            <ScoreTab
              session={activeSession}
              profile={gamificationProfile}
              levelInfo={levelInfo}
              enabled={gamificationEnabled}
              loading={gamificationLoading}
              onNavigateToAchievements={() => {
                setActiveWorkspaceNav('game');
                setShowMobileHome(false);
              }}
            />
          </div>
        );
      case 'projects':
        return (
          <div className="workspace-content">
            <ProjectsManager
              session={activeSession}
              onNavigateToActions={() => setActiveWorkspaceNav('actions')}
            />
          </div>
        );
      case 'rituals':
        return (
          <div className="workspace-content">
            <LifeWheelCheckins session={activeSession} />
          </div>
        );
      case 'body':
        return (
          <div className="workspace-content">
            <BodyHaircutWidget />
          </div>
        );
      case 'habits':
        return (
          <div className="workspace-content">
            <HabitsModule session={activeSession} />
          </div>
        );
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
            <BreathingSpace
              session={activeSession}
              initialMobileTab={breathingSpaceMobileTab}
              onMobileTabChange={setBreathingSpaceMobileTab}
            />
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
      case 'game':
        return (
          <div className="workspace-content">
            <section className="game-hub">
              <div className="game-hub__sections">
                <AchievementsPage session={activeSession} />
                <PowerUpsStore session={activeSession} />
                <ZenGarden session={activeSession} />
              </div>
            </section>
          </div>
        );
      case 'identity':
        return (
          <div className="workspace-content">
            <PersonalityTest />
          </div>
        );
      case 'placeholder':
        return (
          <div className="workspace-content">
            <section className="workspace-stage__placeholder">
              <div className="workspace-stage__placeholder-content">
                <h2>Placeholder</h2>
                <p>A new space is on the way. Check back soon for updates.</p>
              </div>
            </section>
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
        className={`mobile-menu-overlay${isMobileMenuImageActive ? ' mobile-menu-overlay--diode-on' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Open full LifeGoalApp menu"
      >
        <div
          className="mobile-menu-overlay__backdrop"
          onClick={() => {
            setIsMobileMenuOpen(false);
          }}
          role="presentation"
        />
        <div
          className={`mobile-menu-overlay__panel${
            isMobileMenuImageActive ? ' mobile-menu-overlay__panel--image' : ''
          }`}
        >
          <>
            <div className="mobile-menu-overlay__header">
              <h2 className="mobile-menu-overlay__title">Profile</h2>
              <div className="mobile-menu-overlay__meta" aria-label="Profile summary">
                <div className="mobile-menu-overlay__meta-row">
                  <span className="mobile-menu-overlay__meta-label">Name</span>
                  <span className="mobile-menu-overlay__meta-value">
                    {normalizedDisplayName || userDisplay || 'Guest'}
                  </span>
                </div>
                <div className="mobile-menu-overlay__meta-row">
                  <span className="mobile-menu-overlay__meta-label">Type</span>
                  <span className="mobile-menu-overlay__meta-value">Personality test</span>
                </div>
              </div>
              <div className="mobile-menu-overlay__controls">
                <button
                  type="button"
                  className={`mobile-footer-nav__diode-toggle ${
                    isMobileMenuImageActive
                      ? 'mobile-footer-nav__diode-toggle--on'
                      : 'mobile-footer-nav__diode-toggle--off'
                  }`}
                  aria-pressed={isMobileMenuImageActive}
                  aria-label="Toggle diode indicator"
                  onClick={() => {
                    const nextIsActive = !isMobileMenuImageActive;
                    setIsMobileMenuImageActive(nextIsActive);
                    triggerMobileMenuFlash();
                  }}
                />
                <button
                  type="button"
                  className="mobile-menu-overlay__close"
                  aria-label="Close menu"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  ×
                </button>
              </div>
            </div>
            <div className="mobile-menu-overlay__content">
              <ul className="mobile-menu-overlay__list">
                {mobileMenuNavItems
                  .filter((item) => !MOBILE_POPUP_EXCLUDED_IDS.includes(item.id as typeof MOBILE_POPUP_EXCLUDED_IDS[number]))
                  .map((item) => {
                    const isBreathingItem = item.id === 'breathing-space';
                    const isSubmenuOpen = isBreathingItem && isBreatheSubmenuOpen;
                    const submenuId = 'mobile-breathe-submenu';
                    const profileStrengthArea = PROFILE_STRENGTH_MENU_AREAS[item.id];
                    const profileStrengthScore =
                      profileStrengthArea ? profileStrengthSnapshot?.areaScores[profileStrengthArea] ?? null : null;
                    const profileStrengthBadgeValue =
                      profileStrengthScore === null || profileStrengthScore === undefined
                        ? '–'
                        : String(profileStrengthScore);
                    const profileStrengthBadgeClassName =
                      profileStrengthScore === null || profileStrengthScore === undefined
                        ? 'mobile-menu-overlay__icon-badge mobile-menu-overlay__icon-badge--neutral'
                        : 'mobile-menu-overlay__icon-badge';
                    const handleItemClick = () => {
                      if (profileStrengthArea && profileStrengthHoldTriggeredRef.current) {
                        profileStrengthHoldTriggeredRef.current = false;
                        return;
                      }
                      if (isBreathingItem) {
                        setIsBreatheSubmenuOpen((prev) => !prev);
                        return;
                      }
                      handleMobileNavSelect(item.id);
                    };

                    return (
                      <li key={item.id} className="mobile-menu-overlay__item">
                        <button
                          type="button"
                          onClick={handleItemClick}
                          aria-label={item.ariaLabel}
                          aria-expanded={isBreathingItem ? isSubmenuOpen : undefined}
                          aria-controls={isBreathingItem ? submenuId : undefined}
                          onPointerDown={(event) => handleProfileStrengthHoldStart(event, profileStrengthArea ?? null)}
                          onPointerMove={(event) => handleProfileStrengthHoldMove(event, profileStrengthArea ?? null)}
                          onPointerUp={handleProfileStrengthHoldEnd}
                          onPointerCancel={handleProfileStrengthHoldEnd}
                          onPointerLeave={handleProfileStrengthHoldEnd}
                          onContextMenu={(event) => {
                            if (profileStrengthArea && isMobileViewport) {
                              event.preventDefault();
                            }
                          }}
                          className={
                            item.id === 'game' && isGameNearNextLevel
                              ? 'mobile-menu-overlay__game-button mobile-menu-overlay__game-button--charged'
                              : undefined
                          }
                        >
                          <span aria-hidden="true" className="mobile-menu-overlay__icon">
                            {item.icon}
                            {profileStrengthArea ? (
                              <span className={profileStrengthBadgeClassName}>{profileStrengthBadgeValue}</span>
                            ) : null}
                          </span>
                          <span className="mobile-menu-overlay__texts">
                            <span
                              className={`mobile-menu-overlay__label${
                                item.id === 'game' && isGameNearNextLevel ? ' mobile-menu-overlay__label--charged' : ''
                              }`}
                            >
                              {item.label}
                            </span>
                            <span className="mobile-menu-overlay__summary">{item.summary}</span>
                          </span>
                          {isBreathingItem ? (
                            <span
                              aria-hidden="true"
                              className={`mobile-menu-overlay__caret${
                                isSubmenuOpen ? ' mobile-menu-overlay__caret--open' : ''
                              }`}
                            >
                              ▾
                            </span>
                          ) : null}
                        </button>
                        {isBreathingItem ? (
                          <div
                            id={submenuId}
                            className={`mobile-menu-overlay__submenu${
                              isSubmenuOpen ? ' mobile-menu-overlay__submenu--open' : ''
                            }`}
                          >
                            <button
                              type="button"
                              className="mobile-menu-overlay__submenu-button"
                              onClick={() => {
                                setBreathingSpaceMobileTab('breathing');
                                handleMobileNavSelect('breathing-space');
                              }}
                            >
                              <span aria-hidden="true" className="mobile-menu-overlay__submenu-icon">🌬️</span>
                              Focus breathing
                            </button>
                            <button
                              type="button"
                              className="mobile-menu-overlay__submenu-button"
                              onClick={() => {
                                setBreathingSpaceMobileTab('meditation');
                                handleMobileNavSelect('breathing-space');
                              }}
                            >
                              <span aria-hidden="true" className="mobile-menu-overlay__submenu-icon">🧘</span>
                              Meditation
                            </button>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                <li className="mobile-menu-overlay__item mobile-menu-overlay__item--coach">
                  <button
                    type="button"
                    className="mobile-menu-overlay__coach-button"
                    onClick={() => setShowAiCoachModal(true)}
                  >
                    <span aria-hidden="true" className="mobile-menu-overlay__coach-icon">🧑‍🏫</span>
                    <span className="mobile-menu-overlay__coach-texts">
                      <span className="mobile-menu-overlay__coach-title">Coach</span>
                      <span className="mobile-menu-overlay__coach-subtitle">Get a guided next step</span>
                    </span>
                  </button>
                </li>
              </ul>
            </div>
            <div className="mobile-menu-overlay__settings">
              <button
                type="button"
                className="mobile-menu-overlay__profile-summary"
                onClick={() => setIsProfileStrengthOpen(true)}
              >
                <div>
                  <span className="mobile-menu-overlay__profile-eyebrow">Profile strength</span>
                  <p className="mobile-menu-overlay__profile-title">{profileStrengthTitle}</p>
                  <p className="mobile-menu-overlay__profile-subtitle">{profileStrengthSubtitle}</p>
                </div>
                <div className="mobile-menu-overlay__profile-ring" aria-hidden="true">
                  <span className="mobile-menu-overlay__profile-ring-value">{profileStrengthPercentLabel}</span>
                  <span className="mobile-menu-overlay__profile-ring-label">Power</span>
                </div>
              </button>
            </div>
            {isProfileStrengthOpen ? (
              <div className="mobile-menu-overlay__strength-modal" role="dialog" aria-modal="true">
                <div
                  className="mobile-menu-overlay__strength-backdrop"
                  role="presentation"
                  onClick={() => setIsProfileStrengthOpen(false)}
                />
                <div className="mobile-menu-overlay__strength-panel">
                  <div className="mobile-menu-overlay__strength-header">
                    <div>
                      <p className="mobile-menu-overlay__strength-eyebrow">Profile strength</p>
                      <h3 className="mobile-menu-overlay__strength-title">How we calculate your charge</h3>
                    </div>
                    <button
                      type="button"
                      className="mobile-menu-overlay__strength-close"
                      aria-label="Close profile strength details"
                      onClick={() => setIsProfileStrengthOpen(false)}
                    >
                      ×
                    </button>
                  </div>
                  <div className="mobile-menu-overlay__profile-dashboard" role="status" aria-live="polite">
                    <div className="mobile-menu-overlay__profile-header">
                      <div>
                        <p className="mobile-menu-overlay__profile-title">{profileStrengthTitle}</p>
                        <p className="mobile-menu-overlay__profile-subtitle">{profileStrengthDetailSubtitle}</p>
                      </div>
                      <div className="mobile-menu-overlay__profile-ring" aria-hidden="true">
                        <span className="mobile-menu-overlay__profile-ring-value">{profileStrengthPercentLabel}</span>
                        <span className="mobile-menu-overlay__profile-ring-label">Power</span>
                      </div>
                    </div>
                    <div className="mobile-menu-overlay__profile-metrics">
                      <div className="mobile-menu-overlay__profile-metric">
                        <span className="mobile-menu-overlay__profile-metric-label">Top gaps</span>
                        <span className="mobile-menu-overlay__profile-metric-value">
                          {profileStrengthTopGaps.length > 0
                            ? profileStrengthTopGaps
                                .map((gap) => `${gap.label} (${gap.score}/10)`)
                                .join(', ')
                            : 'Awaiting data'}
                        </span>
                        <span className="mobile-menu-overlay__profile-metric-note">
                          {profileStrengthTopGaps.length > 0
                            ? 'Lowest-scoring areas right now.'
                            : 'Add more profile data to reveal your gaps.'}
                        </span>
                      </div>
                      <div className="mobile-menu-overlay__profile-metric">
                        <span className="mobile-menu-overlay__profile-metric-label">Recommended next step</span>
                        <span className="mobile-menu-overlay__profile-metric-value">
                          {profileStrengthTask ? profileStrengthTask.title : 'No task yet'}
                        </span>
                        <span className="mobile-menu-overlay__profile-metric-note">
                          {profileStrengthTask
                            ? `~${profileStrengthTask.etaMinutes} min • ${profileStrengthTask.xpReward} XP`
                            : 'Complete one area to unlock guidance.'}
                        </span>
                      </div>
                    </div>
                    <div className="mobile-menu-overlay__profile-track">
                      <div className="mobile-menu-overlay__profile-track-labels">
                        <span>Strength boost</span>
                        <span>
                          {profileStrengthPercent !== null && profileStrengthPercent !== undefined
                            ? `${profileStrengthPercent} / 100`
                            : '— / 100'}
                        </span>
                      </div>
                      <div className="mobile-menu-overlay__profile-track-bar" aria-hidden="true">
                        <span
                          className="mobile-menu-overlay__profile-track-fill"
                          style={{
                            width:
                              profileStrengthPercent !== null && profileStrengthPercent !== undefined
                                ? `${profileStrengthPercent}%`
                                : '0%',
                          }}
                        />
                      </div>
                    </div>
                    <div className="mobile-menu-overlay__profile-highlights">
                      <span className="mobile-menu-overlay__profile-highlight">
                        {profileStrengthSnapshot?.meta.usedFallbackData
                          ? '⚠️ Some profile data is unavailable.'
                          : '✅ Profile data synced.'}
                      </span>
                      <span className="mobile-menu-overlay__profile-highlight">
                        {profileStrengthTask
                          ? `🎯 Next up: ${profileStrengthTask.title}`
                          : '🧭 Add more details to unlock next steps.'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="mobile-menu-overlay__profile-button"
                      onClick={handleProfileStrengthTaskClick}
                    >
                      Take next step
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            {activeProfileStrengthHold ? (
              <div className="mobile-menu-overlay__hold-modal" role="dialog" aria-modal="true">
                <div
                  className="mobile-menu-overlay__hold-backdrop"
                  role="presentation"
                  onClick={() => {
                    profileStrengthHoldTriggeredRef.current = false;
                    setActiveProfileStrengthHold(null);
                  }}
                />
                <div className="mobile-menu-overlay__hold-panel">
                  <div className="mobile-menu-overlay__hold-header">
                    <div>
                      <p className="mobile-menu-overlay__hold-eyebrow">Improve this area</p>
                      <h3 className="mobile-menu-overlay__hold-title">
                        {PROFILE_STRENGTH_AREA_LABELS[activeProfileStrengthHold.area]}
                      </h3>
                    </div>
                    <button
                      type="button"
                      className="mobile-menu-overlay__hold-close"
                      aria-label="Close improve area prompt"
                      onClick={() => {
                        profileStrengthHoldTriggeredRef.current = false;
                        setActiveProfileStrengthHold(null);
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <div className="mobile-menu-overlay__hold-body">
                    <p className="mobile-menu-overlay__hold-task">
                      {activeProfileStrengthHold.task
                        ? activeProfileStrengthHold.task.title
                        : 'Add a bit more data here to unlock a suggestion.'}
                    </p>
                    <p className="mobile-menu-overlay__hold-note">
                      {activeProfileStrengthHold.task
                        ? activeProfileStrengthHold.task.description
                        : 'We will surface a fast, focused improvement once this area has activity.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="mobile-menu-overlay__hold-action"
                    onClick={handleProfileStrengthHoldAction}
                    disabled={!activeProfileStrengthHold.task}
                  >
                    {activeProfileStrengthHold.task ? 'Start this improvement' : 'Suggestion locked'}
                  </button>
                </div>
              </div>
            ) : null}
          </>
        </div>
      </div>
    ) : null;

  const mobileGamificationOverlay =
    isMobileViewport && showMobileGamification ? (
      <div
        className="mobile-gamification-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Game of Life insights"
      >
        <div
          className="mobile-gamification-overlay__backdrop"
          onClick={() => setShowMobileGamification(false)}
          role="presentation"
        />
        <div className="mobile-gamification-overlay__panel">
          <header className="mobile-gamification-overlay__header">
            <div>
              <p className="mobile-gamification-overlay__eyebrow">Game Menu</p>
              <h2 className="mobile-gamification-overlay__title">Keep building your streak</h2>
              <p className="mobile-gamification-overlay__subtitle">{todayLabel}</p>
            </div>
            <div className="mobile-gamification-overlay__controls">
              <button
                type="button"
                className={`mobile-footer-nav__diode-toggle mobile-gamification-overlay__diode-toggle ${
                  isMobileMenuImageActive
                    ? 'mobile-footer-nav__diode-toggle--on'
                    : 'mobile-footer-nav__diode-toggle--off'
                }`}
                aria-pressed={isMobileMenuImageActive}
                aria-label="Toggle diode indicator"
                onClick={() => {
                  const nextIsActive = !isMobileMenuImageActive;
                  setIsMobileMenuImageActive(nextIsActive);
                  setShowMobileGamification(false);
                  triggerMobileMenuFlash();
                }}
              />
              <button
                type="button"
                className="mobile-gamification-overlay__close"
                aria-label="Close Game of Life insights"
                onClick={() => setShowMobileGamification(false)}
              >
                ×
              </button>
            </div>
          </header>

          <section className="mobile-gamification-overlay__level-chart" aria-label="Level progress">
            <div className="mobile-gamification-overlay__level-chart-header">
              <p className="mobile-gamification-overlay__level-chart-title">Level progress</p>
              <p className="mobile-gamification-overlay__level-chart-range">Level 1–100</p>
            </div>
            <div className="mobile-gamification-overlay__level-chart-bars" aria-hidden="true">
              {Array.from({ length: 100 }, (_, index) => {
                const level = index + 1;
                const completedLevel = (levelInfo?.currentLevel ?? 1) >= level;
                return (
                  <span
                    key={`level-bar-${level}`}
                    className={`mobile-gamification-overlay__level-chart-bar${
                      completedLevel ? ' mobile-gamification-overlay__level-chart-bar--complete' : ''
                    }`}
                  />
                );
              })}
            </div>
          </section>

          <button
            type="button"
            className="mobile-gamification-overlay__status mobile-gamification-overlay__status-button"
            onClick={handleMobileGameOverlayCardClick}
            aria-label="Open Game of Life achievements"
          >
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
          </button>

          <div className="mobile-gamification-overlay__cta-row" role="list">
            <button
              type="button"
              className="mobile-gamification-overlay__stat mobile-gamification-overlay__stat--cta mobile-gamification-overlay__stat--quick-gains mobile-gamification-overlay__stat-button"
              onClick={() => setShowAiCoachModal(true)}
              role="listitem"
            >
              <div className="mobile-gamification-overlay__stat-content">
                <p className="mobile-gamification-overlay__stat-label">Quick Gains</p>
                <p className="mobile-gamification-overlay__stat-hint">Ask for a quick nudge or focus reset.</p>
              </div>
            </button>
            <button
              type="button"
              className="mobile-gamification-overlay__stat mobile-gamification-overlay__stat--cta mobile-gamification-overlay__stat--life-spin mobile-gamification-overlay__stat-button"
              onClick={() => setShowDailySpinWheel(true)}
              role="listitem"
            >
              <img
                className="mobile-gamification-overlay__stat-icon mobile-gamification-overlay__stat-icon--life-spin"
                src={lifeSpinIcon}
                alt=""
                aria-hidden="true"
              />
              <div className="mobile-gamification-overlay__stat-content">
                <p className="mobile-gamification-overlay__stat-label">Life Spin</p>
                <p className="mobile-gamification-overlay__stat-hint">Spin once per day for a surprise boost.</p>
              </div>
            </button>
          </div>

          <div className="mobile-gamification-overlay__grid" role="list">
            <div className="mobile-gamification-overlay__stat" role="listitem">
              <p className="mobile-gamification-overlay__stat-label">All Time</p>
              <div className="mobile-gamification-overlay__stat-quad">
                <div className="mobile-gamification-overlay__stat-mini">
                  <p className="mobile-gamification-overlay__stat-mini-label">Goals</p>
                  <p className="mobile-gamification-overlay__stat-mini-value">{workspaceStats?.goalCount ?? 0}</p>
                </div>
                <div className="mobile-gamification-overlay__stat-mini">
                  <p className="mobile-gamification-overlay__stat-mini-label">Habits</p>
                  <p className="mobile-gamification-overlay__stat-mini-value">{workspaceStats?.habitCount ?? 0}</p>
                </div>
                <div className="mobile-gamification-overlay__stat-mini">
                  <p className="mobile-gamification-overlay__stat-mini-label">Check-ins</p>
                  <p className="mobile-gamification-overlay__stat-mini-value">{workspaceStats?.checkinCount ?? 0}</p>
                </div>
                <div className="mobile-gamification-overlay__stat-mini">
                  <p className="mobile-gamification-overlay__stat-mini-label">Journals</p>
                  <p className="mobile-gamification-overlay__stat-mini-value">{workspaceStats?.journalCount ?? 0}</p>
                </div>
              </div>
            </div>
            <div className="mobile-gamification-overlay__stat mobile-gamification-overlay__stat--mini-grid" role="listitem">
              <div className="mobile-gamification-overlay__mini-grid">
                <div className="mobile-gamification-overlay__mini-card">
                  <p className="mobile-gamification-overlay__mini-label">Points wallet</p>
                  <p className="mobile-gamification-overlay__mini-value">💎 {pointsBalance.toLocaleString()}</p>
                </div>
                <div className="mobile-gamification-overlay__mini-card">
                  <p className="mobile-gamification-overlay__mini-label">Zen Tokens</p>
                  <p className="mobile-gamification-overlay__mini-value">🪷 {zenTokenBalance.toLocaleString()}</p>
                </div>
                <div className="mobile-gamification-overlay__mini-card">
                  <p className="mobile-gamification-overlay__mini-label">Streak momentum</p>
                  <p className="mobile-gamification-overlay__mini-value">🔥 {streakMomentum.toLocaleString()}</p>
                </div>
                <div className="mobile-gamification-overlay__mini-card">
                  <p className="mobile-gamification-overlay__mini-label">Current level</p>
                  <p className="mobile-gamification-overlay__mini-value">🏆 L{currentLevel}</p>
                </div>
              </div>
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
          onStatusClick={handleMobileGameStatusClick}
          onOpenMenu={() => setIsMobileMenuOpen(true)}
          isDiodeActive={isMobileMenuImageActive}
          isFlashActive={isMobileMenuFlashActive}
          isCollapsed={isMobileFooterCollapsed}
          isSnapActive={isMobileFooterSnapActive}
          onExpand={() => handleMobileFooterExpand(false)}
          onSnapExpand={() => handleMobileFooterExpand(true)}
          pointsBalance={pointsBalance}
        />
        {mobileMenuOverlay}
        {mobileGamificationOverlay}
        {showAiCoachModal && (
          <AiCoach session={activeSession} onClose={() => setShowAiCoachModal(false)} />
        )}
        {showDailySpinWheel && (
          <NewDailySpinWheel session={activeSession} onClose={() => setShowDailySpinWheel(false)} />
        )}
      </>
    );
  }

  const appClassName = `app app--workspace ${isAnyModalVisible ? 'app--auth-overlay' : ''}`;
  const workspaceShellClassName = `workspace-shell ${
    isAnyModalVisible ? 'workspace-shell--blurred' : ''
  }${!isMobileViewport && !isDesktopMenuOpen ? ' workspace-shell--menu-collapsed' : ''}`;

  const canDismissOverlay = isAuthOverlayVisible && !shouldForceAuthOverlay;

  return (
    <div className={appClassName}>
      <div className={workspaceShellClassName}>
        {!isMobileViewport && !isDesktopMenuOpen && (
          <button
            type="button"
            className="workspace-shell__menu-edge"
            aria-label="Open workspace menu"
            onClick={() => setIsDesktopMenuOpen(true)}
          />
        )}
        {!isMobileViewport && (
          <aside
            className="workspace-sidebar"
            aria-label="Workspace navigation"
            aria-hidden={!isDesktopMenuOpen}
          >
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
                    scheduleDesktopMenuAutoHide();
                    if (item.id === 'account' && !isAuthenticated) {
                      handleAccountClick();
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
              <div className="workspace-sidebar__pin-toggle">
                <span className="workspace-sidebar__pin-label">Pin main menu</span>
                <button
                  type="button"
                  className="toggle workspace-sidebar__pin-switch"
                  data-on={isDesktopMenuPinned}
                  onClick={handleDesktopMenuPinToggle}
                  aria-pressed={isDesktopMenuPinned}
                  aria-label="Pin main menu"
                >
                  <span className="toggle__thumb" />
                </button>
              </div>
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
          onStatusClick={handleMobileGameStatusClick}
          onOpenMenu={() => setIsMobileMenuOpen(true)}
          isDiodeActive={isMobileMenuImageActive}
          isFlashActive={isMobileMenuFlashActive}
          isCollapsed={isMobileFooterCollapsed}
          isSnapActive={isMobileFooterSnapActive}
          onExpand={() => handleMobileFooterExpand(false)}
          onSnapExpand={() => handleMobileFooterExpand(true)}
          pointsBalance={pointsBalance}
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
      {showDailySpinWheel && (
        <NewDailySpinWheel session={activeSession} onClose={() => setShowDailySpinWheel(false)} />
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

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};
