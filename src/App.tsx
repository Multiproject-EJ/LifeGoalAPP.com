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
import lifespinIcon from './assets/Lifespinicon.webp';
import dailyTreatsContainerMain from './assets/Daily_treat_containermain.webp';
import dailyTreatsSpinWheel from './assets/Daily_treats_spinnwheel.webp';
import dailyTreatsHearts from './assets/Daily_treats_hearts.webp';
import dailyTreatsCalendarOpen from './assets/daily_treats_calendaropen.webp';
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
import { PointsBadge } from './components/PointsBadge';
import { useMediaQuery, WORKSPACE_MOBILE_MEDIA_QUERY } from './hooks/useMediaQuery';
import { useTheme } from './contexts/ThemeContext';
import { useGamification } from './hooks/useGamification';
import { NewDailySpinWheel } from './features/spin-wheel/NewDailySpinWheel';
import { CountdownCalendarModal } from './features/gamification/daily-treats/CountdownCalendarModal';
import { LuckyRollBoard } from './features/gamification/daily-treats/LuckyRollBoard';
import { SPIN_PRIZES } from './types/gamification';
import { splitGoldBalance } from './constants/economy';
import {
  fetchWorkspaceProfile,
  upsertWorkspaceProfile,
  type WorkspaceProfileRow,
} from './services/workspaceProfile';
import { fetchWorkspaceStats, type WorkspaceStats } from './services/workspaceStats';
import { getSupabaseClient } from './lib/supabaseClient';
import { useContinuousSave } from './hooks/useContinuousSave';
import { generateInitials } from './utils/initials';
import { DayZeroOnboarding } from './features/onboarding/DayZeroOnboarding';
import { GameOfLifeOnboarding } from './features/onboarding/GameOfLifeOnboarding';
import {
  getProfileStrengthDebugSnapshot,
  isProfileStrengthDebugEnabled,
  logProfileStrengthDebugSnapshot,
} from './features/profile-strength/debugProfileStrength';
import {
  loadProfileStrengthSignals,
  type ProfileStrengthSignalSnapshot,
} from './features/profile-strength/profileStrengthData';
import {
  fetchPersonalityProfile,
  loadPersonalityTestHistoryWithSupabase,
  upsertPersonalityProfile,
} from './services/personalityTest';
import { scoreProfileStrength } from './features/profile-strength/scoreProfileStrength';
import type { AreaKey, NextTask, ProfileStrengthResult } from './features/profile-strength/profileStrengthTypes';
import {
  applyProfileStrengthXpEvent,
  buildProfileStrengthXpEvents,
  loadProfileStrengthXpState,
  saveProfileStrengthXpState,
} from './features/profile-strength/profileStrengthXp';
import { buildTopTraitSummary } from './features/identity/personalitySummary';
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
const DAILY_TREATS_SEEN_KEY = 'lifegoal_daily_treats_seen';
const DAILY_TREATS_DAILY_VISIT_KEY = 'lifegoal_daily_treats_daily_visit';

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
    summary: 'Track your gold, rewards, and upcoming boosts.',
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
  'identity', // Moved to quick actions section
] as const;

const MOBILE_FOOTER_AUTO_COLLAPSE_IDS = new Set(['identity', 'account']);
const MOBILE_FOOTER_AUTO_COLLAPSE_DELAY_MS = 3800;
const MOBILE_FOOTER_SNAP_RESET_MS = 160;
const ONBOARDING_NUDGE_KEY = 'gol_onboarding_nudge_at';
const ONBOARDING_NUDGE_INTERVAL_MS = 1000 * 60 * 60 * 6;

const formatGoldRange = (min: number, max: number) => {
  const normalizedMin = Math.min(min, max);
  const normalizedMax = Math.max(min, max);
  return normalizedMin === normalizedMax ? `${normalizedMin}` : `${normalizedMin}-${normalizedMax}`;
};

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
  const [breathingSpaceMobileTab, setBreathingSpaceMobileTab] = useState<
    'breathing' | 'meditation' | 'yoga' | 'food' | 'exercise' | null
  >(null);
  const [breathingSpaceMobileCategory, setBreathingSpaceMobileCategory] = useState<'mind' | 'body'>('mind');
  const [isEnergyMenuOpen, setIsEnergyMenuOpen] = useState(false);
  const [showMobileGamification, setShowMobileGamification] = useState(false);
  const [isMobileMenuImageActive, setIsMobileMenuImageActive] = useState(true);
  const [showAiCoachModal, setShowAiCoachModal] = useState(false);
  const [showDailySpinWheel, setShowDailySpinWheel] = useState(false);
  const [showDailyTreatsMenu, setShowDailyTreatsMenu] = useState(false);
  const [showDailyTreatsCongrats, setShowDailyTreatsCongrats] = useState(false);
  const [showQuickGainsMenu, setShowQuickGainsMenu] = useState(false);
  const [quickGainsHabitText, setQuickGainsHabitText] = useState('');
  const [pendingDailyTreatsOpen, setPendingDailyTreatsOpen] = useState(false);
  const [showLuckyRoll, setShowLuckyRoll] = useState(false);
  const [showCalendarPlaceholder, setShowCalendarPlaceholder] = useState(false);
  const [hasSeenDailyTreats, setHasSeenDailyTreats] = useState(false);
  const [dailyTreatsFirstVisitDate, setDailyTreatsFirstVisitDate] = useState<string | null>(null);
  const [isMobileFooterCollapsed, setIsMobileFooterCollapsed] = useState(false);
  const [isMobileFooterSnapActive, setIsMobileFooterSnapActive] = useState(false);
  const [isVisionRewardOpen, setIsVisionRewardOpen] = useState(false);
  const mobileFooterCollapseTimeoutRef = useRef<number | null>(null);
  const mobileFooterSnapTimeoutRef = useRef<number | null>(null);
  const lastMobileScrollYRef = useRef(0);
  const [isProfileStrengthOpen, setIsProfileStrengthOpen] = useState(false);
  const [activeProfileStrengthHold, setActiveProfileStrengthHold] = useState<{
    area: AreaKey;
    task: NextTask | null;
  } | null>(null);
  const [activeMobileMenuHelper, setActiveMobileMenuHelper] = useState<MobileMenuNavItem | null>(null);
  const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(true);
  const [isDesktopMenuPinned, setIsDesktopMenuPinned] = useState(false);
  const [isOnboardingDismissed, setIsOnboardingDismissed] = useState(false);
  const [isOnboardingOverride, setIsOnboardingOverride] = useState(false);
  const [showOnboardingNudge, setShowOnboardingNudge] = useState(false);
  const [showDayZeroOnboarding, setShowDayZeroOnboarding] = useState(false);
  const desktopMenuAutoHideTimeoutRef = useRef<number | null>(null);
  const [isMobileMenuFlashActive, setIsMobileMenuFlashActive] = useState(false);
  const mobileMenuFlashTimeoutRef = useRef<number | null>(null);
  const profileStrengthHoldTimeoutRef = useRef<number | null>(null);
  const profileStrengthHoldTriggeredRef = useRef(false);
  const profileStrengthHoldStartRef = useRef<{ x: number; y: number } | null>(null);
  const menuHelperHoldTimeoutRef = useRef<number | null>(null);
  const menuHelperHoldTriggeredRef = useRef(false);
  const menuHelperHoldStartRef = useRef<{ x: number; y: number } | null>(null);
  const profileStrengthSnapshotRef = useRef<ProfileStrengthResult | null>(null);
  const profileStrengthSignalsRef = useRef<ProfileStrengthSignalSnapshot | null>(null);
  const [showZenGardenFullScreen, setShowZenGardenFullScreen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setHasSeenDailyTreats(window.localStorage.getItem(DAILY_TREATS_SEEN_KEY) === 'true');
    setDailyTreatsFirstVisitDate(window.localStorage.getItem(DAILY_TREATS_DAILY_VISIT_KEY));
  }, []);

  const getTodayDateKey = useCallback(() => new Date().toISOString().split('T')[0], []);

  const markDailyTreatsSeen = useCallback(() => {
    setHasSeenDailyTreats(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DAILY_TREATS_SEEN_KEY, 'true');
    }
  }, []);

  const markDailyTreatsDailyVisit = useCallback(() => {
    const todayKey = getTodayDateKey();
    setDailyTreatsFirstVisitDate(todayKey);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DAILY_TREATS_DAILY_VISIT_KEY, todayKey);
    }
  }, [getTodayDateKey]);

  const handleDailyTreatsCongratsClose = useCallback(() => {
    setShowDailyTreatsCongrats(false);
    if (pendingDailyTreatsOpen) {
      setShowDailyTreatsMenu(true);
      setPendingDailyTreatsOpen(false);
    }
  }, [pendingDailyTreatsOpen]);

  const {
    earnXP,
    xpToasts,
    dismissXPToast,
    levelInfo,
    profile: gamificationProfile,
    enabled: gamificationEnabled,
    loading: gamificationLoading,
  } = useGamification(supabaseSession);

  const goldBalance = gamificationProfile?.total_points ?? 0;
  const goldBreakdown = splitGoldBalance(goldBalance);
  const goldValueLabel =
    goldBreakdown.diamonds > 0
      ? `💎 ${goldBreakdown.diamonds.toLocaleString()} · 🪙 ${goldBreakdown.goldRemainder.toLocaleString()}`
      : `🪙 ${goldBreakdown.goldRemainder.toLocaleString()}`;
  const zenTokenBalance = gamificationProfile?.zen_tokens ?? 0;
  const streakMomentum = gamificationProfile?.current_streak ?? 0;
  const currentLevel = levelInfo?.currentLevel ?? 1;
  const isGameModeActive = gamificationEnabled && isMobileMenuImageActive;
  const shouldShowPointsBadges = isGameModeActive && isMobileViewport;
  const mobileMenuPointsBadges = useMemo(() => {
    const badges: Record<string, string> = {};
    if (goldBalance > 0) {
      badges.score = goldBalance.toLocaleString();
    }
    return badges;
  }, [goldBalance]);
  const spinGoldRange = useMemo(() => {
    const goldValues = SPIN_PRIZES.filter((prize) => prize.type === 'gold').map((prize) => prize.value);
    if (goldValues.length === 0) {
      return null;
    }
    const minGold = Math.min(...goldValues);
    const maxGold = Math.max(...goldValues);
    return formatGoldRange(minGold, maxGold);
  }, []);
  const dailyTreatsInventory = useMemo(
    () => ({
      spinsRemaining: 2,
      heartsRemaining: 5,
      hatchesRemaining: 1,
    }),
    [],
  );
  const todayDailyTreatsKey = getTodayDateKey();
  const hasOpenedDailyTreatsToday = dailyTreatsFirstVisitDate === todayDailyTreatsKey;
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
          label: 'Healht',
          ariaLabel: 'Health routines and care',
          icon: '💪',
          summary: 'Refresh your body-focused routines and personal care rituals.',
        } satisfies MobileMenuNavItem;
      }

      if (navId === 'breathing-space') {
        return {
          id: navId,
          label: 'Energy',
          ariaLabel: 'Energy routines and focus tools',
          icon: '⚡️',
          summary: 'Boost your energy with mind and body resets.',
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
    }).concat([
      {
        id: 'coach',
        label: 'Coach',
        ariaLabel: 'AI Coach - Get a guided next step',
        icon: '🪈',
        summary: 'Get a guided next step from your AI coach.',
      } satisfies MobileMenuNavItem,
    ]);
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
  const mobileFooterPointsBadges: Partial<Record<MobileMenuNavItem['id'], string>> = {};

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
  const shouldAutoCollapseOnIdle =
    isMobileViewport &&
    mobileActiveNavId !== null &&
    MOBILE_FOOTER_AUTO_COLLAPSE_IDS.has(mobileActiveNavId);
  const shouldAllowFooterCollapse = isMobileViewport && (isMobileMenuImageActive || shouldAutoCollapseOnIdle);

  const scheduleMobileFooterCollapse = useCallback(() => {
    if (!shouldAutoCollapseOnIdle) {
      return;
    }
    if (mobileFooterCollapseTimeoutRef.current !== null) {
      window.clearTimeout(mobileFooterCollapseTimeoutRef.current);
    }
    mobileFooterCollapseTimeoutRef.current = window.setTimeout(() => {
      setIsMobileFooterCollapsed(true);
      mobileFooterCollapseTimeoutRef.current = null;
    }, MOBILE_FOOTER_AUTO_COLLAPSE_DELAY_MS);
  }, [shouldAutoCollapseOnIdle]);

  const handleMobileFooterExpand = useCallback(
    (shouldSnap: boolean) => {
      if (!shouldAllowFooterCollapse) {
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
      if (shouldAutoCollapseOnIdle) {
        scheduleMobileFooterCollapse();
      }
    },
    [scheduleMobileFooterCollapse, shouldAllowFooterCollapse, shouldAutoCollapseOnIdle],
  );

  useEffect(() => {
    if (!shouldAllowFooterCollapse) {
      setIsMobileFooterCollapsed(false);
      if (mobileFooterCollapseTimeoutRef.current !== null) {
        window.clearTimeout(mobileFooterCollapseTimeoutRef.current);
        mobileFooterCollapseTimeoutRef.current = null;
      }
      return;
    }
    if (!shouldAutoCollapseOnIdle) {
      if (mobileFooterCollapseTimeoutRef.current !== null) {
        window.clearTimeout(mobileFooterCollapseTimeoutRef.current);
        mobileFooterCollapseTimeoutRef.current = null;
      }
      return;
    }
    setIsMobileFooterCollapsed(true);
    scheduleMobileFooterCollapse();
  }, [scheduleMobileFooterCollapse, shouldAllowFooterCollapse, shouldAutoCollapseOnIdle]);

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

  useEffect(() => {
    if (!isVisionRewardOpen || !isMobileViewport || !isMobileMenuImageActive) {
      return;
    }
    if (mobileFooterCollapseTimeoutRef.current !== null) {
      window.clearTimeout(mobileFooterCollapseTimeoutRef.current);
      mobileFooterCollapseTimeoutRef.current = null;
    }
    setIsMobileFooterCollapsed(true);
  }, [isVisionRewardOpen, isMobileMenuImageActive, isMobileViewport]);

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
  const [profileStrengthSignals, setProfileStrengthSignals] =
    useState<ProfileStrengthSignalSnapshot | null>(null);
  const [isProfileStrengthLoading, setIsProfileStrengthLoading] = useState(false);
  const [personalitySummary, setPersonalitySummary] = useState<string | null>(null);

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
    if (!activeSession?.user?.id) {
      setPersonalitySummary(null);
      return;
    }

    let isMounted = true;

    const loadSummary = async () => {
      try {
        const userId = activeSession.user.id;
        const [{ data: profile }, records] = await Promise.all([
          fetchPersonalityProfile(userId),
          loadPersonalityTestHistoryWithSupabase(userId),
        ]);

        if (!isMounted) {
          return;
        }

        // If personality_summary exists in profile, use it directly
        if (profile?.personality_summary) {
          setPersonalitySummary(profile.personality_summary);
          return;
        }

        // Backward compatibility: regenerate summary if traits exist but summary doesn't
        const traits = profile?.personality_traits as Record<string, number> | null;
        if (profile && traits && Object.keys(traits).length > 0) {
          const regeneratedSummary = buildTopTraitSummary(traits);
          setPersonalitySummary(regeneratedSummary);
          
          // Persist the regenerated summary to Supabase
          // Include existing personality data to avoid overwriting
          try {
            await upsertPersonalityProfile({
              user_id: userId,
              personality_traits: profile.personality_traits,
              personality_axes: profile.personality_axes,
              personality_summary: regeneratedSummary,
              personality_last_tested_at: profile.personality_last_tested_at,
            });
          } catch (error) {
            // Log error but don't fail - summary is already set in local state
            console.error('Failed to persist regenerated personality summary:', error);
          }
          return;
        }

        if (records.length === 0) {
          setPersonalitySummary(null);
          return;
        }

        setPersonalitySummary(buildTopTraitSummary(records[0].traits));
      } catch {
        if (isMounted) {
          setPersonalitySummary(null);
        }
      }
    };

    void loadSummary();

    return () => {
      isMounted = false;
    };
  }, [activeSession?.user?.id, isMobileMenuOpen]);

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
        setProfileStrengthSignals(signals);
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
    if (!profileStrengthSnapshot || !profileStrengthSignals) {
      return;
    }

    const previousSnapshot = profileStrengthSnapshotRef.current;
    const previousSignals = profileStrengthSignalsRef.current;
    profileStrengthSnapshotRef.current = profileStrengthSnapshot;
    profileStrengthSignalsRef.current = profileStrengthSignals;

    if (!previousSnapshot || !previousSignals) {
      return;
    }

    if (!gamificationEnabled || !earnXP) {
      return;
    }

    const userId = activeSession?.user?.id;
    if (!userId) {
      return;
    }

    const state = loadProfileStrengthXpState(userId);
    const events = buildProfileStrengthXpEvents({
      previousSnapshot,
      nextSnapshot: profileStrengthSnapshot,
      nextSignals: profileStrengthSignals,
      state,
    });

    if (events.length === 0) {
      return;
    }

    const awardEvents = async () => {
      let nextState = state;
      for (const event of events) {
        const result = await earnXP(event.xp, event.sourceType, event.sourceId, event.description);
        if (!result?.success) {
          continue;
        }
        nextState = applyProfileStrengthXpEvent(nextState, event);
        saveProfileStrengthXpState(userId, nextState);
      }
    };

    void awardEvents();
  }, [
    activeSession?.user?.id,
    earnXP,
    gamificationEnabled,
    profileStrengthSnapshot,
    profileStrengthSignals,
  ]);

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

  useEffect(() => {
    if (!isOnboardingComplete) return;
    setIsOnboardingDismissed(false);
    setIsOnboardingOverride(false);
    setShowOnboardingNudge(false);
    setShowDayZeroOnboarding(false);
  }, [isOnboardingComplete]);

  useEffect(() => {
    if (isOnboardingComplete || !isOnboardingDismissed) {
      setShowOnboardingNudge(false);
      return;
    }
    const lastShown = Number(window.localStorage.getItem(ONBOARDING_NUDGE_KEY) || 0);
    const now = Date.now();
    if (now - lastShown >= ONBOARDING_NUDGE_INTERVAL_MS) {
      setShowOnboardingNudge(true);
      window.localStorage.setItem(ONBOARDING_NUDGE_KEY, String(now));
    }
  }, [isOnboardingComplete, isOnboardingDismissed]);

  const handleLaunchOnboarding = useCallback(
    (options?: { reset?: boolean }) => {
      if (options?.reset) {
        window.localStorage.removeItem(`gol_onboarding_${activeSession.user.id}`);
        window.localStorage.removeItem(`day_zero_onboarding_${activeSession.user.id}`);
      }
      setShowDayZeroOnboarding(false);
      setIsOnboardingDismissed(false);
      setIsOnboardingOverride(true);
      setShowOnboardingNudge(false);
      setActiveWorkspaceNav('goals');
    },
    [activeSession.user.id],
  );

  const handleLaunchDayZeroOnboarding = useCallback(
    (options?: { reset?: boolean }) => {
      if (options?.reset) {
        window.localStorage.removeItem(`day_zero_onboarding_${activeSession.user.id}`);
      }
      setShowDayZeroOnboarding(true);
      setIsOnboardingDismissed(true);
      setIsOnboardingOverride(false);
      setShowOnboardingNudge(false);
      setActiveWorkspaceNav('goals');
    },
    [activeSession.user.id],
  );

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

  const requiresAuthenticatedAccess = (navId: string) => navId === 'insights';

  const shouldRequireAuthentication = !isAuthenticated && !isDemoMode;

  const handleMobileNavSelect = (navId: string, options?: { preserveBreatheTab?: boolean }) => {
    setIsMobileMenuOpen(false);
    setIsEnergyMenuOpen(false);
    const preserveBreatheTab = options?.preserveBreatheTab ?? false;

    if (navId === 'breathing-space' && !preserveBreatheTab) {
      setBreathingSpaceMobileTab(null);
    }

    if (navId === 'game' && isMobileViewport) {
      setShowMobileGamification(true);
      return;
    }

    if (navId === 'coach') {
      setShowAiCoachModal(true);
      return;
    }

    if (requiresAuthenticatedAccess(navId) && shouldRequireAuthentication) {
      openAuthOverlay('login');
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

  const handleEnergySelect = (category: 'mind' | 'body') => {
    setBreathingSpaceMobileCategory(category);
    setBreathingSpaceMobileTab(null);
    handleMobileNavSelect('breathing-space', { preserveBreatheTab: true });
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

  const clearMenuHelperHoldTimer = useCallback(() => {
    if (menuHelperHoldTimeoutRef.current !== null) {
      window.clearTimeout(menuHelperHoldTimeoutRef.current);
      menuHelperHoldTimeoutRef.current = null;
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

  const handleMenuHelperHoldStart = useCallback(
    (event: PointerEvent<HTMLButtonElement>, item: MobileMenuNavItem | null) => {
      if (!isMobileViewport || !item || event.pointerType === 'mouse') {
        return;
      }
      menuHelperHoldTriggeredRef.current = false;
      menuHelperHoldStartRef.current = { x: event.clientX, y: event.clientY };
      clearMenuHelperHoldTimer();
      menuHelperHoldTimeoutRef.current = window.setTimeout(() => {
        menuHelperHoldTriggeredRef.current = true;
        setActiveMobileMenuHelper(item);
      }, PROFILE_STRENGTH_HOLD_DURATION_MS);
    },
    [clearMenuHelperHoldTimer, isMobileViewport],
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

  const handleMenuHelperHoldMove = useCallback(
    (event: PointerEvent<HTMLButtonElement>, item: MobileMenuNavItem | null) => {
      if (!isMobileViewport || !item || !menuHelperHoldStartRef.current) {
        return;
      }
      const deltaX = event.clientX - menuHelperHoldStartRef.current.x;
      const deltaY = event.clientY - menuHelperHoldStartRef.current.y;
      if (Math.hypot(deltaX, deltaY) > PROFILE_STRENGTH_HOLD_SLOP_PX) {
        clearMenuHelperHoldTimer();
      }
    },
    [clearMenuHelperHoldTimer, isMobileViewport],
  );

  const handleProfileStrengthHoldEnd = useCallback(() => {
    clearProfileStrengthHoldTimer();
    profileStrengthHoldStartRef.current = null;
  }, [clearProfileStrengthHoldTimer]);

  const handleMenuHelperHoldEnd = useCallback(() => {
    clearMenuHelperHoldTimer();
    menuHelperHoldStartRef.current = null;
  }, [clearMenuHelperHoldTimer]);

  const handleMobileMenuHoldEnd = useCallback(() => {
    handleProfileStrengthHoldEnd();
    handleMenuHelperHoldEnd();
  }, [handleMenuHelperHoldEnd, handleProfileStrengthHoldEnd]);

  const closeMobileMenuHelper = useCallback(() => {
    menuHelperHoldTriggeredRef.current = false;
    setActiveMobileMenuHelper(null);
  }, []);

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
      setActiveMobileMenuHelper(null);
      menuHelperHoldTriggeredRef.current = false;
    }
  }, [isMobileMenuOpen]);

  useEffect(() => {
    return () => {
      clearProfileStrengthHoldTimer();
      clearMenuHelperHoldTimer();
    };
  }, [clearProfileStrengthHoldTimer, clearMenuHelperHoldTimer]);

  const handleMobileGameOverlayCardClick = () => {
    setActiveWorkspaceNav('game');
    setShowMobileHome(false);
  };

  const handleMobileGameStatusClick = () => {
    setShowMobileGamification(true);
  };

  const handleMobileGameStatusHoldToggle = () => {
    const nextIsActive = !isMobileMenuImageActive;
    setIsMobileMenuImageActive(nextIsActive);
    triggerMobileMenuFlash();
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
  const shouldShowOnboarding =
    isOnboardingGateActive &&
    !showDayZeroOnboarding &&
    (isOnboardingOverride || (!isOnboardingComplete && !isOnboardingDismissed));
  const canAccessWorkspace = !isOnboardingGateActive || isOnboardingComplete || isOnboardingOverride;

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
          {shouldShowOnboarding ? (
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
              onNavigateDashboard={() => {
                setActiveWorkspaceNav('goals');
                setShowMobileHome(false);
              }}
              onOpenCoach={() => {
                setShowAiCoachModal(true);
              }}
              onClose={() => {
                setIsOnboardingDismissed(true);
                setIsOnboardingOverride(false);
              }}
            />
          ) : null}

          {showDayZeroOnboarding ? (
            <DayZeroOnboarding
              session={activeSession}
              profileSaving={profileSaving}
              setProfileSaving={setManualProfileSaving}
              setAuthMessage={setAuthMessage}
              setAuthError={setAuthError}
              isDemoExperience={isDemoExperience}
              onSaveDemoProfile={handleDemoProfileSave}
              onClose={() => setShowDayZeroOnboarding(false)}
            />
          ) : null}

          {!shouldShowOnboarding && !isOnboardingComplete && !showDayZeroOnboarding ? (
            <div className="onboarding-start-card">
              <div>
                <p className="onboarding-start-card__eyebrow">Onboarding</p>
                <h3>Launch your Game of Life 2.0 setup</h3>
                <p>
                  Walk through the Agency, Awareness, Rationality, and Vitality loops to unlock the full
                  workspace.
                </p>
              </div>
              <div className="onboarding-start-card__actions">
                <button
                  type="button"
                  className="supabase-auth__action"
                  onClick={() => handleLaunchOnboarding()}
                >
                  Start Game of Life onboarding
                </button>
              </div>
            </div>
          ) : null}

          {showOnboardingNudge && !shouldShowOnboarding && !isOnboardingComplete && !showDayZeroOnboarding ? (
            <div className="onboarding-nudge">
              <div>
                <strong>Ready to rebalance your four axes?</strong>
                <p>Continue the Game of Life 2.0 onboarding to unlock your full workspace.</p>
              </div>
              <div className="onboarding-nudge__actions">
                <button
                  type="button"
                  className="supabase-auth__action"
                  onClick={() => handleLaunchOnboarding()}
                >
                  Continue Game of Life onboarding
                </button>
                <button
                  type="button"
                  className="supabase-auth__secondary"
                  onClick={() => setShowOnboardingNudge(false)}
                >
                  Not now
                </button>
              </div>
            </div>
          ) : null}

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
            onLaunchOnboarding={handleLaunchOnboarding}
            onLaunchDayZeroOnboarding={handleLaunchDayZeroOnboarding}
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
            <DailyHabitTracker
              session={activeSession}
              showPointsBadges={shouldShowPointsBadges}
              onVisionRewardOpenChange={setIsVisionRewardOpen}
              profileStrengthSnapshot={profileStrengthSnapshot}
              profileStrengthSignals={profileStrengthSignals}
              personalitySummary={personalitySummary}
            />
            <HabitsModule session={activeSession} />
          </div>
        );
      case 'actions':
        return (
          <div className="workspace-content">
            <ActionsTab
              session={activeSession}
              showPointsBadges={shouldShowPointsBadges}
              onNavigateToProjects={() => setActiveWorkspaceNav('projects')}
              onNavigateToTimer={() => setActiveWorkspaceNav('timer')}
              isMobileView={isMobileViewport}
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
              onNavigateToZenGarden={() => {
                setShowZenGardenFullScreen(true);
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
              initialMobileCategory={breathingSpaceMobileCategory}
              onMobileTabChange={(tab) => setBreathingSpaceMobileTab(tab)}
              onMobileCategoryChange={(category) => setBreathingSpaceMobileCategory(category)}
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
              <div className="mobile-menu-overlay__header-top">
                <div className="mobile-menu-overlay__profile-picture">
                  <span className="mobile-menu-overlay__profile-initials">
                    {(normalizedDisplayName || userDisplay || 'Guest').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="mobile-menu-overlay__header-info">
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
                      <span className="mobile-menu-overlay__meta-value">
                        {personalitySummary ?? 'Personality test'}
                      </span>
                    </div>
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
              <div className="mobile-menu-overlay__quick-actions">
                <button
                  type="button"
                  className="mobile-menu-overlay__quick-action-btn"
                  onClick={() => handleMobileNavSelect('identity')}
                  aria-label="Your identity and preferences"
                >
                  <span className="mobile-menu-overlay__quick-action-icon">🪪</span>
                  <span className="mobile-menu-overlay__quick-action-label">ID</span>
                </button>
                <button
                  type="button"
                  className="mobile-menu-overlay__quick-action-btn"
                  onClick={() => handleMobileNavSelect('account')}
                  aria-label="Profile picture and appearance"
                >
                  <span className="mobile-menu-overlay__quick-action-icon">👤</span>
                  <span className="mobile-menu-overlay__quick-action-label">Look</span>
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
                    const isHelperHoldTarget = !profileStrengthArea;
                    const handleItemClick = () => {
                      if (profileStrengthArea && profileStrengthHoldTriggeredRef.current) {
                        profileStrengthHoldTriggeredRef.current = false;
                        return;
                      }
                      if (isHelperHoldTarget && menuHelperHoldTriggeredRef.current) {
                        menuHelperHoldTriggeredRef.current = false;
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
                          onPointerDown={(event) => {
                            if (profileStrengthArea) {
                              handleProfileStrengthHoldStart(event, profileStrengthArea);
                              return;
                            }
                            handleMenuHelperHoldStart(event, item);
                          }}
                          onPointerMove={(event) => {
                            if (profileStrengthArea) {
                              handleProfileStrengthHoldMove(event, profileStrengthArea);
                              return;
                            }
                            handleMenuHelperHoldMove(event, item);
                          }}
                          onPointerUp={handleMobileMenuHoldEnd}
                          onPointerCancel={handleMobileMenuHoldEnd}
                          onPointerLeave={handleMobileMenuHoldEnd}
                          onContextMenu={(event) => {
                            if ((profileStrengthArea || isHelperHoldTarget) && isMobileViewport) {
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
                                handleMobileNavSelect('breathing-space', { preserveBreatheTab: true });
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
                                handleMobileNavSelect('breathing-space', { preserveBreatheTab: true });
                              }}
                            >
                              <span aria-hidden="true" className="mobile-menu-overlay__submenu-icon">🧘</span>
                              Meditation
                            </button>
                            <button
                              type="button"
                              className="mobile-menu-overlay__submenu-button"
                              onClick={() => {
                                setBreathingSpaceMobileTab('yoga');
                                handleMobileNavSelect('breathing-space', { preserveBreatheTab: true });
                              }}
                            >
                              <span aria-hidden="true" className="mobile-menu-overlay__submenu-icon">🧘‍♀️</span>
                              Yoga
                            </button>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
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
            {activeMobileMenuHelper ? (
              <div
                className="mobile-menu-overlay__helper-modal"
                role="dialog"
                aria-modal="true"
                aria-label={`${activeMobileMenuHelper.label} helper`}
              >
                <div
                  className="mobile-menu-overlay__helper-backdrop"
                  role="presentation"
                  onClick={closeMobileMenuHelper}
                />
                <div className="mobile-menu-overlay__helper-panel">
                  <button
                    type="button"
                    className="mobile-menu-overlay__helper-close"
                    aria-label="Close helper"
                    onClick={closeMobileMenuHelper}
                  >
                    ×
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
              onClick={() => setShowQuickGainsMenu(true)}
              role="listitem"
            >
              <div className="mobile-gamification-overlay__stat-content">
                <p className="mobile-gamification-overlay__stat-label">Quick Gains</p>
                <p className="mobile-gamification-overlay__stat-hint">Ask for a quick nudge or focus reset.</p>
              </div>
            </button>
            <button
              type="button"
              className={`mobile-gamification-overlay__stat mobile-gamification-overlay__stat--cta mobile-gamification-overlay__stat--daily-treats mobile-gamification-overlay__stat-button${
                hasSeenDailyTreats ? '' : ' mobile-gamification-overlay__stat--pulse'
              }`}
              onClick={() => {
                markDailyTreatsSeen();
                const todayKey = getTodayDateKey();
                const shouldShowCongrats =
                  isMobileMenuImageActive && dailyTreatsFirstVisitDate !== todayKey;
                if (shouldShowCongrats) {
                  markDailyTreatsDailyVisit();
                  setPendingDailyTreatsOpen(true);
                  setShowDailyTreatsCongrats(true);
                  return;
                }
                setPendingDailyTreatsOpen(false);
                setShowDailyTreatsMenu(true);
              }}
              role="listitem"
            >
              <div
                className="mobile-gamification-overlay__stat-icon mobile-gamification-overlay__stat-icon--daily-treats"
                aria-hidden="true"
              >
                🍬
              </div>
              <div className="mobile-gamification-overlay__stat-content">
                <p className="mobile-gamification-overlay__stat-label">Daily Treats</p>
                <p className="mobile-gamification-overlay__stat-hint">
                  Open your treats menu for spins, leagues, and countdown secrets.
                </p>
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
                  <p className="mobile-gamification-overlay__mini-label">Gold wallet</p>
                  <p className="mobile-gamification-overlay__mini-value">{goldValueLabel}</p>
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

  const dailyTreatsCongratsModal = showDailyTreatsCongrats ? (
    <div
      className="daily-treats-congrats"
      role="dialog"
      aria-modal="true"
      aria-label="Daily treats bonus unlock"
    >
      <div
        className="daily-treats-congrats__backdrop"
        onClick={handleDailyTreatsCongratsClose}
        role="presentation"
      />
      <div className="daily-treats-congrats__dialog">
        <button
          type="button"
          className="daily-treats-congrats__close"
          aria-label="Close daily treats bonus"
          onClick={handleDailyTreatsCongratsClose}
        >
          ×
        </button>
        <div className="daily-treats-congrats__content">
          <img
            className="daily-treats-congrats__hero-icon"
            src={lifespinIcon}
            alt="Life Spin icon"
          />
          <p className="daily-treats-congrats__eyebrow">Daily Treats</p>
          <h3 className="daily-treats-congrats__title">Congrats on your first visit today!</h3>
          <p className="daily-treats-congrats__subtitle">
            Your controller is powered up with fresh rewards.
          </p>
          <div className="daily-treats-congrats__rewards">
            <div className="daily-treats-congrats__reward">
              <span className="daily-treats-congrats__reward-icon" aria-hidden="true">
                🎟️
              </span>
              <div>
                <p className="daily-treats-congrats__reward-title">2 Free Spin Tickets</p>
                <p className="daily-treats-congrats__reward-detail">Jump into Life Spin with bonus turns.</p>
              </div>
            </div>
            <div className="daily-treats-congrats__reward">
              <span className="daily-treats-congrats__reward-icon" aria-hidden="true">
                ❤️
              </span>
              <div>
                <p className="daily-treats-congrats__reward-title">5 League Hearts</p>
                <p className="daily-treats-congrats__reward-detail">Fuel your daily matches and streaks.</p>
              </div>
            </div>
            <div className="daily-treats-congrats__reward">
              <span className="daily-treats-congrats__reward-icon" aria-hidden="true">
                🥚
              </span>
              <div>
                <p className="daily-treats-congrats__reward-title">New Daily Hatch</p>
                <p className="daily-treats-congrats__reward-detail">
                  Day 25 countdown stays ready for the next reveal.
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="daily-treats-congrats__button"
            onClick={handleDailyTreatsCongratsClose}
          >
            Claim today’s treats
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const dailyTreatsModal = showDailyTreatsMenu ? (
    <div className="daily-treats-modal" role="dialog" aria-modal="true" aria-label="Daily treats">
      <div
        className="daily-treats-modal__backdrop"
        onClick={() => setShowDailyTreatsMenu(false)}
        role="presentation"
      />
      <div
        className="daily-treats-modal__dialog"
        style={{ backgroundImage: `url(${dailyTreatsContainerMain})` }}
      >
        <button
          type="button"
          className="daily-treats-modal__close"
          aria-label="Close daily treats menu"
          onClick={() => setShowDailyTreatsMenu(false)}
        >
          ×
        </button>
        <div className="daily-treats-modal__content">
          <div className="daily-treats-modal__cards">
            <div className="daily-treats-modal__card-stack">
              <button
                type="button"
                className={`daily-treats-modal__card${
                  dailyTreatsInventory.spinsRemaining === 0
                    ? ' daily-treats-modal__card--spent'
                    : hasOpenedDailyTreatsToday
                      ? ' daily-treats-modal__card--opened'
                      : ' daily-treats-modal__card--active'
                }`}
                disabled={dailyTreatsInventory.spinsRemaining === 0}
                onClick={() => {
                  setShowDailyTreatsMenu(false);
                  setShowDailySpinWheel(true);
                }}
              >
                <span className="daily-treats-modal__card-image" aria-hidden="true">
                  <img src={dailyTreatsSpinWheel} alt="" />
                </span>
                {dailyTreatsInventory.spinsRemaining > 0 ? (
                  <span className="daily-treats-modal__card-indicator" aria-label="Available spins">
                    {dailyTreatsInventory.spinsRemaining}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                className="daily-treats-modal__card-action daily-treats-modal__card-action--spin"
                disabled={dailyTreatsInventory.spinsRemaining === 0}
                onClick={() => {
                  setShowDailyTreatsMenu(false);
                  setShowDailySpinWheel(true);
                }}
              >
                SPIN
              </button>
            </div>
            <div className="daily-treats-modal__card-stack">
              <button
                type="button"
                className={`daily-treats-modal__card${
                  dailyTreatsInventory.heartsRemaining === 0
                    ? ' daily-treats-modal__card--spent'
                    : hasOpenedDailyTreatsToday
                      ? ' daily-treats-modal__card--opened'
                      : ' daily-treats-modal__card--active'
                }`}
                disabled={dailyTreatsInventory.heartsRemaining === 0}
                onClick={() => {
                  setShowDailyTreatsMenu(false);
                  setShowLuckyRoll(true);
                }}
              >
                <span className="daily-treats-modal__card-image" aria-hidden="true">
                  <img src={dailyTreatsHearts} alt="" />
                </span>
                {dailyTreatsInventory.heartsRemaining > 0 ? (
                  <span className="daily-treats-modal__card-indicator" aria-label="Available hearts">
                    {dailyTreatsInventory.heartsRemaining}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                className="daily-treats-modal__card-action"
                disabled={dailyTreatsInventory.heartsRemaining === 0}
                onClick={() => {
                  setShowDailyTreatsMenu(false);
                  setShowLuckyRoll(true);
                }}
              >
                PLAY
              </button>
            </div>
            <div className="daily-treats-modal__card-stack">
              <button
                type="button"
                className={`daily-treats-modal__card${
                  dailyTreatsInventory.hatchesRemaining === 0
                    ? ' daily-treats-modal__card--spent'
                    : hasOpenedDailyTreatsToday
                      ? ' daily-treats-modal__card--opened'
                      : ' daily-treats-modal__card--active'
                }`}
                disabled={dailyTreatsInventory.hatchesRemaining === 0}
                onClick={() => {
                  setShowDailyTreatsMenu(false);
                  setShowCalendarPlaceholder(true);
                }}
              >
                <span className="daily-treats-modal__card-image" aria-hidden="true">
                  <img src={dailyTreatsCalendarOpen} alt="" />
                </span>
                {dailyTreatsInventory.hatchesRemaining > 0 ? (
                  <span className="daily-treats-modal__card-indicator" aria-label="Daily hatch ready" />
                ) : null}
              </button>
              <button
                type="button"
                className="daily-treats-modal__card-action"
                disabled={dailyTreatsInventory.hatchesRemaining === 0}
                onClick={() => {
                  setShowDailyTreatsMenu(false);
                  setShowCalendarPlaceholder(true);
                }}
              >
                OPEN
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  const quickGainsOptionalItems = !hasSeenDailyTreats
    ? [
        {
          id: 'daily-treats',
          title: 'Unclaimed daily treats',
          description: 'Open the treats menu to claim a bonus.',
        },
      ]
    : [];
  const quickGainsFallbackItem =
    quickGainsOptionalItems.length === 0
      ? {
          id: 'placeholder',
          title: 'More quick gains soon',
          description: 'We’ll drop fresh boosts here as they unlock.',
        }
      : null;
  const quickGainsItems = [
    {
      id: 'water-tree',
      title: 'Water the wisdom tree',
      description: 'Give the tree a quick burst of care and growth.',
    },
    {
      id: 'habit-checkoff',
      title: quickGainsHabitText
        ? `Check off Habit: ${quickGainsHabitText}`
        : 'Check off Habit',
      description: 'Type the habit name you want to check off.',
    },
    ...quickGainsOptionalItems,
    ...(quickGainsFallbackItem ? [quickGainsFallbackItem] : []),
  ];
  const quickGainsModal = showQuickGainsMenu ? (
    <div className="quick-gains-modal" role="dialog" aria-modal="true" aria-label="Quick gains menu">
      <div
        className="quick-gains-modal__backdrop"
        onClick={() => setShowQuickGainsMenu(false)}
        role="presentation"
      />
      <div className="quick-gains-modal__panel">
        <header className="quick-gains-modal__header">
          <div>
            <p className="quick-gains-modal__eyebrow">Quick gains</p>
            <h2 className="quick-gains-modal__title">Pick a fast boost</h2>
            <p className="quick-gains-modal__subtitle">Short actions that keep your streak moving.</p>
          </div>
          <button
            type="button"
            className="quick-gains-modal__close"
            aria-label="Close quick gains"
            onClick={() => setShowQuickGainsMenu(false)}
          >
            ×
          </button>
        </header>

        <div className="quick-gains-modal__list" role="list">
          {quickGainsItems.map((item) => (
            <div key={item.id} className="quick-gains-modal__item" role="listitem">
              <div>
                <p className="quick-gains-modal__item-title">{item.title}</p>
                <p className="quick-gains-modal__item-desc">{item.description}</p>
              </div>
              {item.id === 'habit-checkoff' ? (
                <input
                  className="quick-gains-modal__input"
                  type="text"
                  value={quickGainsHabitText}
                  onChange={(event) => setQuickGainsHabitText(event.target.value)}
                  placeholder="Add habit text"
                />
              ) : (
                <button type="button" className="quick-gains-modal__action">
                  Select
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  const luckyRollModal = showLuckyRoll && activeSession ? (
    <LuckyRollBoard
      session={activeSession}
      onClose={() => setShowLuckyRoll(false)}
    />
  ) : null;

  const countdownCalendarModal = (
    <CountdownCalendarModal
      isOpen={showCalendarPlaceholder}
      onClose={() => setShowCalendarPlaceholder(false)}
      userId={activeSession?.user?.id}
    />
  );

  if (isMobileViewport && showMobileHome) {
    return (
      <>
        <MobileHabitHome
          session={activeSession}
          showPointsBadges={shouldShowPointsBadges}
          onVisionRewardOpenChange={setIsVisionRewardOpen}
          profileStrengthSnapshot={profileStrengthSnapshot}
          profileStrengthSignals={profileStrengthSignals}
          personalitySummary={personalitySummary}
        />
        {!showZenGardenFullScreen && (
          <MobileFooterNav
            items={mobileFooterNavItems}
          status={mobileFooterStatus}
          activeId={null}
          onSelect={handleMobileNavSelect}
          onStatusClick={handleMobileGameStatusClick}
          onStatusHoldToggle={handleMobileGameStatusHoldToggle}
          onOpenMenu={() => {
            setIsMobileMenuOpen(true);
            setIsEnergyMenuOpen(false);
          }}
          isEnergyMenuOpen={isEnergyMenuOpen}
          onEnergyToggle={() => {
            setIsEnergyMenuOpen((prev) => !prev);
            handleMobileFooterExpand(true);
          }}
          onEnergySelect={handleEnergySelect}
          isDiodeActive={isMobileMenuImageActive}
          pointsBadges={mobileFooterPointsBadges}
          showPointsBadges={shouldShowPointsBadges}
          isFlashActive={isMobileMenuFlashActive}
          isCollapsed={isMobileFooterCollapsed}
          isSnapActive={isMobileFooterSnapActive}
          onExpand={() => handleMobileFooterExpand(false)}
          onSnapExpand={() => handleMobileFooterExpand(true)}
          pointsBalance={goldBalance}
        />
        )}
        {mobileMenuOverlay}
        {mobileGamificationOverlay}
        {showAiCoachModal && (
          <AiCoach session={activeSession} onClose={() => setShowAiCoachModal(false)} />
        )}
        {showDailySpinWheel && (
          <NewDailySpinWheel session={activeSession} onClose={() => setShowDailySpinWheel(false)} />
        )}
        {quickGainsModal}
        {dailyTreatsCongratsModal}
        {dailyTreatsModal}
        {luckyRollModal}
        {countdownCalendarModal}
      </>
    );
  }

  const appClassName = `app app--workspace${activeWorkspaceNav === 'insights' ? ' app--vision-board' : ''} ${
    isAnyModalVisible ? 'app--auth-overlay' : ''
  }`;
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
                    if (requiresAuthenticatedAccess(item.id) && shouldRequireAuthentication) {
                      openAuthOverlay('login');
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

        <main className={`workspace-main${activeWorkspaceNav === 'insights' ? ' workspace-main--vision-board' : ''}`}>
          {(authMessage || authError) && <div className="workspace-status">{statusElements}</div>}

          <section
            className={`workspace-stage ${
              activeWorkspaceNav === 'goals' ? 'workspace-stage--detail' : 'workspace-stage--placeholder'
            }${activeWorkspaceNav === 'account' ? ' workspace-stage--account' : ''}${
              activeWorkspaceNav === 'insights' ? ' workspace-stage--vision-board' : ''
            }`}
            aria-live="polite"
          >
            <div className="workspace-stage__body">{renderWorkspaceSection()}</div>
          </section>
        </main>
      </div>
      {isMobileViewport && !showZenGardenFullScreen ? (
        <MobileFooterNav
          items={mobileFooterNavItems}
          status={mobileFooterStatus}
          activeId={mobileActiveNavId}
          onSelect={handleMobileNavSelect}
          onStatusClick={handleMobileGameStatusClick}
          onStatusHoldToggle={handleMobileGameStatusHoldToggle}
          onOpenMenu={() => {
            setIsMobileMenuOpen(true);
            setIsEnergyMenuOpen(false);
          }}
          isEnergyMenuOpen={isEnergyMenuOpen}
          onEnergyToggle={() => {
            setIsEnergyMenuOpen((prev) => !prev);
            handleMobileFooterExpand(true);
          }}
          onEnergySelect={handleEnergySelect}
          isDiodeActive={isMobileMenuImageActive}
          pointsBadges={mobileFooterPointsBadges}
          showPointsBadges={shouldShowPointsBadges}
          isFlashActive={isMobileMenuFlashActive}
          isCollapsed={isMobileFooterCollapsed}
          isSnapActive={isMobileFooterSnapActive}
          onExpand={() => handleMobileFooterExpand(false)}
          onSnapExpand={() => handleMobileFooterExpand(true)}
          pointsBalance={goldBalance}
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
      {quickGainsModal}
      {dailyTreatsModal}
      {luckyRollModal}
      {countdownCalendarModal}

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

      {/* Zen Garden Full-Screen Overlay */}
      {showZenGardenFullScreen && (
        <ZenGarden
          session={activeSession}
          onBack={() => setShowZenGardenFullScreen(false)}
        />
      )}
    </div>
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};
