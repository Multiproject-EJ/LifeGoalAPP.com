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
import type { TimeBoundOfferId } from './features/habits/TimeBoundOfferRow';
import { ProgressDashboard } from './features/dashboard';
import { VisionBoard } from './features/vision-board';
import { LifeWheelCheckins } from './features/checkins';
import { NotificationPreferences } from './features/notifications';
import { MyAccountPanel } from './features/account/MyAccountPanel';
import { PlayerAvatarPanel } from './features/avatar/PlayerAvatarPanel';
import { WorkspaceSetupDialog } from './features/account/WorkspaceSetupDialog';
import { AiCoach } from './features/ai-coach';
import { Journal, type JournalType } from './features/journal';
import { BreathingSpace } from './features/meditation';
import { AchievementsPage } from './features/achievements/AchievementsPage';
import PersonalityTest from './features/identity/PersonalityTest';
import { ActionsTab } from './features/actions';
import { TimerTab } from './features/timer';
import {
  DEFAULT_TIMER_SESSION,
  deriveRunningRemainingSeconds,
  deriveTimerLauncherState,
  normalizeTimerSession,
  readTimerSession,
  writeTimerSession,
  type TimerLaunchContext,
  type TimerSessionState,
} from './features/timer/timerSession';
import { ProjectsManager } from './features/projects';
import { RoutinesTab } from './features/routines';
import { ScoreTab } from './features/gamification/ScoreTab';
import { ContractsTab } from './features/gamification/ContractsTab';
import { ZenGarden } from './features/zen-garden/ZenGarden';
import { DEMO_USER_EMAIL, DEMO_USER_NAME, getDemoProfile, updateDemoProfile } from './services/demoData';
import { createDemoSession, isDemoSession } from './services/demoSession';
import { ThemeToggle } from './components/ThemeToggle';
import { MobileFooterNav } from './components/MobileFooterNav';
import { GameBoardOverlay } from './components/GameBoardOverlay';
import { HolidaySeasonDialog } from './components/HolidaySeasonDialog';
import { QuickActionsFAB } from './components/QuickActionsFAB';
import { XPToast } from './components/XPToast';
import { CaseSubmissionModal } from './features/cases/CaseSubmissionModal';
import { RecoverableErrorBoundary } from './components/RecoverableErrorBoundary';
import { PointsBadge } from './components/PointsBadge';
import { OfflineSyncDevPanel } from './components/OfflineSyncDevPanel';
import { useMediaQuery, WORKSPACE_MOBILE_MEDIA_QUERY } from './hooks/useMediaQuery';
import { useTheme } from './contexts/ThemeContext';
import { useGamification } from './hooks/useGamification';
import { updateGamificationEnabled } from './services/gamificationPrefs';
import { NewDailySpinWheel } from './features/spin-wheel/NewDailySpinWheel';
import { CountdownCalendarModal } from './features/gamification/daily-treats/CountdownCalendarModal';
import { LuckyRollBoard } from './features/gamification/daily-treats/LuckyRollBoard';
import { LevelWorldsHub } from './features/gamification/level-worlds/LevelWorldsHub';
import { getIslandBackgroundImageSrc } from './features/gamification/level-worlds/services/islandBackgrounds';
import { fetchHolidayPreferences } from './services/holidayPreferences';
import { buildPreviewAdventMeta, getActiveAdventMeta, type ActiveAdventMetaResult, type HolidayKey } from './services/treatCalendarService';
import { HOLIDAY_PREVIEW_LAUNCH_EVENT, type HolidayPreviewLaunchDetail } from './services/holidayPreviewEvents';
import {
  isIslandRunEntryDebugEnabled,
  logIslandRunEntryDebug,
} from './features/gamification/level-worlds/services/islandRunEntryDebug';
import { SPIN_PRIZES } from './types/gamification';
import { splitGoldBalance } from './constants/economy';
import { collectDailyHearts, hasCollectedDailyHeartsToday } from './services/dailyTreats';
import {
  fetchWorkspaceProfile,
  upsertWorkspaceProfile,
  type WorkspaceProfileRow,
} from './services/workspaceProfile';
import { fetchWorkspaceStats, type WorkspaceStats } from './services/workspaceStats';
import { getSupabaseClient } from './lib/supabaseClient';
import { useContinuousSave } from './hooks/useContinuousSave';
import { isStandaloneMode } from './routes/detectStandalone';
import { useDailySpinStatus } from './hooks/useDailySpinStatus';
import { useLuckyRollStatus } from './hooks/useLuckyRollStatus';
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
import {
  fetchCreatureCollection,
  getUnclaimedBondMilestones,
} from './features/gamification/level-worlds/services/creatureCollectionService';
import type { AreaKey, NextTask, ProfileStrengthResult } from './features/profile-strength/profileStrengthTypes';
import {
  applyProfileStrengthXpEvent,
  buildProfileStrengthXpEvents,
  loadProfileStrengthXpState,
  saveProfileStrengthXpState,
} from './features/profile-strength/profileStrengthXp';
import { buildTopTraitSummary } from './features/identity/personalitySummary';
import type { PersonalityScores } from './features/identity/personalityScoring';
import { scoreArchetypes, rankArchetypes } from './features/identity/archetypes/archetypeScoring';
import { buildHand, type ArchetypeHand } from './features/identity/archetypes/archetypeHandBuilder';
import { ARCHETYPE_DECK, SUIT_LABELS } from './features/identity/archetypes/archetypeDeck';
import { useMicroTestBadge } from './features/identity/microTests/useMicroTestBadge';
import type { PlayerState } from './features/identity/microTests/microTestTriggers';
import {
  EXPERIMENTAL_FEATURES_UPDATED_EVENT,
  getExperimentalFeatures,
} from './services/experimentalFeatures';
import { ConflictResolverEntry } from './features/conflict-resolver/ConflictResolverEntry';
import { PeaceBetweenShell } from './surfaces/peacebetween/PeaceBetweenShell';
import { PeaceBetweenLanding } from './surfaces/peacebetween/PeaceBetweenLanding';
import { isConflictRoute, resolveSurface } from './surfaces/surfaceContext';
import './styles/workspace.css';
import './styles/settings-folders.css';
import './styles/gamification.css';
import './features/ai-coach/AiCoach.css';

/**
 * Guard rail: App-level rendering of routines lane caused duplicate Today cards.
 * The real lane must live inside DailyHabitTracker (between habits and contracts).
 */
const RoutinesTodayLane = (_props: {
  session: Session;
  onHideStandaloneHabitsChange?: (habitIds: string[]) => void;
}): null => null;

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
  modalKey?: 'feedback' | 'support'; // present = opens a modal instead of navigating
};

type LauncherSubmenuAction = {
  id: string;
  label: string;
  icon: string;
  onSelect: () => void;
};

type BillingReturnBanner = {
  kind: 'processing' | 'success' | 'canceled';
  message: string;
} | null;

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

function formatTimerSeconds(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const ISLAND_DURATION_SEC_PROD = 72 * 60 * 60;
const ISLAND_RUN_RUNTIME_STATE_KEY = 'lifegoal_island_run_runtime_state';

function formatCompactDuration(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  if (safe <= 0) return '0s';

  const days = Math.floor(safe / 86400);
  const hours = Math.floor((safe % 86400) / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function setIslandRunOpenStopParam(stopId: 'boss' | 'hatchery' | 'dynamic') {
  const url = new URL(window.location.href);
  if (stopId === 'hatchery') {
    url.searchParams.set('openHatchery', '1');
    url.searchParams.delete('openIslandStop');
  } else {
    url.searchParams.delete('openHatchery');
    url.searchParams.set('openIslandStop', stopId);
  }
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}


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
    id: 'routines',
    label: 'Routines',
    summary: 'Design routine flows and keep your sequence polished.',
    icon: '🎬',
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
  'routines',
  'support',
  'game',
  'journal',
  'breathing-space',
  'insights',
  'rituals',
  'account',
  'player-avatar',
  'identity',
  'placeholder',
] as const;

const MOBILE_FOOTER_AUTO_COLLAPSE_IDS = new Set(['identity', 'account', 'projects', 'timer', 'journal']);
const MOBILE_FOOTER_AUTO_COLLAPSE_DELAY_MS = 3800;
const MOBILE_FOOTER_SNAP_RESET_MS = 160;
const ONBOARDING_NUDGE_KEY = 'gol_onboarding_nudge_at';
const ONBOARDING_NUDGE_INTERVAL_MS = 1000 * 60 * 60 * 6;

const formatGoldRange = (min: number, max: number) => {
  const normalizedMin = Math.min(min, max);
  const normalizedMax = Math.max(min, max);
  return normalizedMin === normalizedMax ? `${normalizedMin}` : `${normalizedMin}-${normalizedMax}`;
};

interface AppProps {
  forceAuthOnMount?: boolean;
}

export default function App({ forceAuthOnMount }: AppProps) {
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
  const [activeWorkspaceNav, setActiveWorkspaceNav] = useState<string>(() => {
    if (typeof window === 'undefined') return 'goals';
    const host = window.location.hostname.toLowerCase();
    if (host === 'peacebetween.com' || host === 'www.peacebetween.com') {
      return 'breathing-space';
    }
    return 'goals';
  });
  const [initialSearch, setInitialSearch] = useState(() =>
    typeof window !== 'undefined' ? window.location.search : '',
  );
  const [billingReturnBanner, setBillingReturnBanner] = useState<BillingReturnBanner>(null);
  const [showAuthPanel, setShowAuthPanel] = useState(false);
  const isMobileViewport = useMediaQuery(WORKSPACE_MOBILE_MEDIA_QUERY);
  const [isDesktopUiResearchPreviewEnabled, setIsDesktopUiResearchPreviewEnabled] = useState(false);
  const isDesktopExperience = !isMobileViewport && isDesktopUiResearchPreviewEnabled;
  const isMobileExperience = !isDesktopExperience;
  const [showMobileHome, setShowMobileHome] = useState(false);
  const [actionsLauncherResetSignal, setActionsLauncherResetSignal] = useState(0);
  const [actionsTabView, setActionsTabView] = useState<'launcher' | 'tasks'>(isMobileExperience ? 'launcher' : 'tasks');
  const [workspaceProfile, setWorkspaceProfile] = useState<WorkspaceProfileRow | null>(null);
  const [workspaceStats, setWorkspaceStats] = useState<WorkspaceStats | null>(null);
  const [workspaceProfileLoading, setWorkspaceProfileLoading] = useState(false);
  const [showWorkspaceSetup, setShowWorkspaceSetup] = useState(false);
  const [workspaceSetupDismissed, setWorkspaceSetupDismissed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileProfileDialogOpen, setIsMobileProfileDialogOpen] = useState(false);
  const [breathingSpaceMobileTab, setBreathingSpaceMobileTab] = useState<
    'breathing' | 'meditation' | 'conflict' | 'yoga' | 'food' | 'exercise' | null
  >(null);
  const [breathingSpaceMobileCategory, setBreathingSpaceMobileCategory] = useState<'mind' | 'body'>('mind');
  const isConflictResolverFullscreen =
    isMobileExperience && activeWorkspaceNav === 'breathing-space' && breathingSpaceMobileTab === 'conflict';
  const [timerLaunchContext, setTimerLaunchContext] = useState<TimerLaunchContext | null>(null);
  const [footerTimerSession, setFooterTimerSession] = useState<TimerSessionState>(() =>
    normalizeTimerSession(readTimerSession()),
  );
  const [scoreTabActiveTab, setScoreTabActiveTab] = useState<'home' | 'bank' | 'shop' | 'zen' | 'garage' | 'leaderboard' | 'collections'>('home');
  const [isEnergyMenuOpen, setIsEnergyMenuOpen] = useState(false);
  const [showMobileGamification, setShowMobileGamification] = useState(false);
  const [showGameBoardOverlay, setShowGameBoardOverlay] = useState(false);
  const [islandTimeLabelForOverlay, setIslandTimeLabelForOverlay] = useState('—');
  const [overlayEssenceBalance, setOverlayEssenceBalance] = useState(0);
  const [overlayRewardBarProgress, setOverlayRewardBarProgress] = useState(0);
  const [overlayRewardBarThreshold, setOverlayRewardBarThreshold] = useState(10);
  const [overlayActiveTimedEventType, setOverlayActiveTimedEventType] = useState<string | null>(null);
  const [overlayActiveTimedEventExpiresAtMs, setOverlayActiveTimedEventExpiresAtMs] = useState<number | null>(null);
  const [overlayIslandNumber, setOverlayIslandNumber] = useState(1);
  const [overlayIslandDisplayName, setOverlayIslandDisplayName] = useState('Island 1');
  const [, setHeartsResetAtMs] = useState<number | undefined>(undefined);
  const [, setEggHatchResetAtMs] = useState<number | undefined>(undefined);
  const [currentIslandBackgroundSrc, setCurrentIslandBackgroundSrc] = useState(() => getIslandBackgroundImageSrc(1));
  const spinWinResetAtMs = useMemo(() => {
    const now = new Date();
    const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    return tomorrow.getTime();
  }, []);

  useEffect(() => {
    function computeLabel() {
      try {
        const raw = localStorage.getItem(ISLAND_RUN_RUNTIME_STATE_KEY);
        if (!raw) {
          setIslandTimeLabelForOverlay('—');
          setOverlayEssenceBalance(0);
          setOverlayRewardBarProgress(0);
          setOverlayRewardBarThreshold(10);
          setOverlayActiveTimedEventType(null);
          setOverlayActiveTimedEventExpiresAtMs(null);
          setOverlayIslandNumber(1);
          setOverlayIslandDisplayName('Island 1');
          setHeartsResetAtMs(undefined);
          setEggHatchResetAtMs(undefined);
          setCurrentIslandBackgroundSrc(getIslandBackgroundImageSrc(1));
          return;
        }
        const state = JSON.parse(raw) as {
          islandStartedAtMs?: number;
          islandExpiresAtMs?: number;
          activeEggSetAtMs?: number;
          activeEggHatchDurationMs?: number;
          currentIslandNumber?: number;
          islandDisplayName?: string;
          isIslandTimerPendingStart?: boolean;
          essence?: number;
          rewardBarProgress?: number;
          rewardBarThreshold?: number;
          activeTimedEvent?: {
            eventType?: string;
            expiresAtMs?: number;
          } | null;
        };
        setOverlayEssenceBalance(Math.max(0, Math.floor(state?.essence ?? 0)));
        setOverlayRewardBarProgress(Math.max(0, Math.floor(state?.rewardBarProgress ?? 0)));
        setOverlayRewardBarThreshold(Math.max(1, Math.floor(state?.rewardBarThreshold ?? 10)));
        setOverlayActiveTimedEventType(state?.activeTimedEvent?.eventType ?? null);
        setOverlayActiveTimedEventExpiresAtMs(state?.activeTimedEvent?.expiresAtMs ?? null);
        const safeIslandNumber = Math.max(1, Math.floor(state?.currentIslandNumber ?? 1));
        setOverlayIslandNumber(safeIslandNumber);
        setOverlayIslandDisplayName(state?.islandDisplayName ?? `Island ${safeIslandNumber}`);
        setCurrentIslandBackgroundSrc(getIslandBackgroundImageSrc(state?.currentIslandNumber ?? 1));
        const expiresAtMs = state?.islandExpiresAtMs;
        if (state?.isIslandTimerPendingStart) {
          setIslandTimeLabelForOverlay('Open');
          setHeartsResetAtMs(undefined);
        } else if (expiresAtMs) {
          const remaining = Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000));
          setIslandTimeLabelForOverlay(formatCompactDuration(remaining));
          setHeartsResetAtMs(expiresAtMs);
        } else if (state?.islandStartedAtMs) {
          // legacy fallback: re-derive from start time
          const startMs = state.islandStartedAtMs;
          const elapsedSec = Math.floor((Date.now() - startMs) / 1000);
          const remaining = Math.max(0, ISLAND_DURATION_SEC_PROD - elapsedSec);
          setIslandTimeLabelForOverlay(formatCompactDuration(remaining));
          setHeartsResetAtMs(startMs + ISLAND_DURATION_SEC_PROD * 1000);
        } else {
          setIslandTimeLabelForOverlay('—');
          setHeartsResetAtMs(undefined);
        }
        const { activeEggSetAtMs, activeEggHatchDurationMs } = state;
        if (activeEggSetAtMs && activeEggHatchDurationMs) {
          setEggHatchResetAtMs(activeEggSetAtMs + activeEggHatchDurationMs);
        } else {
          setEggHatchResetAtMs(undefined);
        }
      } catch {
        setIslandTimeLabelForOverlay('—');
        setOverlayEssenceBalance(0);
        setOverlayRewardBarProgress(0);
        setOverlayRewardBarThreshold(10);
        setOverlayActiveTimedEventType(null);
        setOverlayActiveTimedEventExpiresAtMs(null);
        setOverlayIslandNumber(1);
        setOverlayIslandDisplayName('Island 1');
        setHeartsResetAtMs(undefined);
        setEggHatchResetAtMs(undefined);
        setCurrentIslandBackgroundSrc(getIslandBackgroundImageSrc(1));
      }
    }
    computeLabel();
    const id = window.setInterval(computeLabel, 1000);
    return () => window.clearInterval(id);
  }, []);
  const [isMobileMenuImageActive, setIsMobileMenuImageActive] = useState(true);
  const [showAiCoachModal, setShowAiCoachModal] = useState(false);
  const [aiCoachStarterQuestion, setAiCoachStarterQuestion] = useState<string | undefined>(undefined);
  const [journalLaunchRequest, setJournalLaunchRequest] = useState<{ type: JournalType; openComposer?: boolean; requestId: number } | null>(null);
  const [showDailySpinWheel, setShowDailySpinWheel] = useState(false);
  const [showDailyTreatsMenu, setShowDailyTreatsMenu] = useState(false);
  const [showDailyTreatsCongrats, setShowDailyTreatsCongrats] = useState(false);
  const [showQuickGainsMenu, setShowQuickGainsMenu] = useState(false);
  const [quickGainsHabitText, setQuickGainsHabitText] = useState('');
  const [pendingDailyTreatsOpen, setPendingDailyTreatsOpen] = useState(false);
  const [showLuckyRoll, setShowLuckyRoll] = useState(false);
  const [showLevelWorldsFromEntry, setShowLevelWorldsFromEntry] = useState(false);
  const [levelWorldsEntryPanel, setLevelWorldsEntryPanel] = useState<'default' | 'sanctuary'>('default');
  const [reopenGameBoardOverlayOnLevelWorldsClose, setReopenGameBoardOverlayOnLevelWorldsClose] = useState(false);
  const [shouldAutoOpenIslandRun, setShouldAutoOpenIslandRun] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return (
      window.location.pathname === '/' &&
      params.get('openIslandRun') === '1' &&
      params.get('openIslandRunSource') === 'level-worlds'
    );
  });
  const [showCalendarPlaceholder, setShowCalendarPlaceholder] = useState(false);
  const [pendingTodayOfferOpen, setPendingTodayOfferOpen] = useState<TimeBoundOfferId | null>(null);
  const [routineHiddenHabitIds, setRoutineHiddenHabitIds] = useState<string[]>([]);
  const [activeHolidaySeason, setActiveHolidaySeason] = useState<ActiveAdventMetaResult | null>(null);
  const [showHolidaySeasonDialog, setShowHolidaySeasonDialog] = useState(false);
  const [holidayPreviewKey, setHolidayPreviewKey] = useState<HolidayKey | null>(null);
  const [isHolidaySeasonDialogPreview, setIsHolidaySeasonDialogPreview] = useState(false);
  const [reopenGameOverlayOnRewardClose, setReopenGameOverlayOnRewardClose] = useState(false);
  const [hasSeenDailyTreats, setHasSeenDailyTreats] = useState(false);
  const [dailyTreatsFirstVisitDate, setDailyTreatsFirstVisitDate] = useState<string | null>(null);
  const [isMobileFooterCollapsed, setIsMobileFooterCollapsed] = useState(false);
  const [isMobileFooterSnapActive, setIsMobileFooterSnapActive] = useState(false);
  const [isVisionRewardOpen, setIsVisionRewardOpen] = useState(false);
  const mobileFooterCollapseTimeoutRef = useRef<number | null>(null);
  const mobileFooterSnapTimeoutRef = useRef<number | null>(null);
  const lastMobileScrollYRef = useRef(0);
  const [isProfileStrengthOpen, setIsProfileStrengthOpen] = useState(false);
  const [showMobileFeedbackModal, setShowMobileFeedbackModal] = useState(false);
  const [showMobileSupportModal, setShowMobileSupportModal] = useState(false);
  const [isMyQuestSubmenuOpen, setIsMyQuestSubmenuOpen] = useState(false);
  const [isFeedbackSupportSubmenuOpen, setIsFeedbackSupportSubmenuOpen] = useState(false);
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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const syncTimerSession = () => {
      const storedSession = readTimerSession();
      const normalizedSession = normalizeTimerSession(storedSession);
      if (normalizedSession !== storedSession) {
        writeTimerSession(normalizedSession);
      }
      setFooterTimerSession(normalizedSession);
    };

    syncTimerSession();
    const intervalId = window.setInterval(syncTimerSession, 1000);
    window.addEventListener('storage', syncTimerSession);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('storage', syncTimerSession);
    };
  }, []);

  const getTodayDateKey = useCallback(() => new Date().toISOString().split('T')[0], []);

  const markDailyTreatsSeen = useCallback(() => {
    setHasSeenDailyTreats(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DAILY_TREATS_SEEN_KEY, 'true');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const checkoutState = (url.searchParams.get('checkout') || url.searchParams.get('billing') || '').toLowerCase();
    if (!checkoutState) return;

    if (checkoutState === 'success' || checkoutState === 'completed') {
      setBillingReturnBanner({
        kind: 'processing',
        message: 'Stripe checkout completed. We are syncing your billing status now.',
      });
      setActiveWorkspaceNav('account');
    } else if (checkoutState === 'canceled' || checkoutState === 'cancel') {
      setBillingReturnBanner({
        kind: 'canceled',
        message: 'Checkout was canceled. No billing changes were applied.',
      });
      setActiveWorkspaceNav('account');
    } else if (checkoutState === 'processing') {
      setBillingReturnBanner({
        kind: 'processing',
        message: 'Billing update is still processing. Please refresh shortly.',
      });
      setActiveWorkspaceNav('account');
    }

    url.searchParams.delete('checkout');
    url.searchParams.delete('billing');
    const nextSearch = url.search;
    setInitialSearch(nextSearch);
    window.history.replaceState(window.history.state, '', `${url.pathname}${nextSearch}${url.hash}`);
  }, []);

  const markDailyTreatsDailyVisit = useCallback(() => {
    const todayKey = getTodayDateKey();
    setDailyTreatsFirstVisitDate(todayKey);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DAILY_TREATS_DAILY_VISIT_KEY, todayKey);
    }
  }, [getTodayDateKey]);

  const handleDailyTreatsCongratsClose = useCallback(() => {
    // Collect daily hearts when claiming treats
    // Note: We use supabaseSession directly here instead of activeSession to avoid dependency issues
    const userId = supabaseSession?.user?.id ?? createDemoSession().user.id;
    if (userId) {
      const result = collectDailyHearts(userId);
      if (result) {
        console.log(`Collected ${result.heartsAwarded} hearts. New balance: ${result.newBalance}`);
      }
    }
    
    setShowDailyTreatsCongrats(false);
    if (pendingDailyTreatsOpen) {
      setShowDailyTreatsMenu(true);
      setPendingDailyTreatsOpen(false);
    }
  }, [pendingDailyTreatsOpen, supabaseSession?.user?.id]);

  const {
    earnXP,
    xpToasts,
    dismissXPToast,
    levelInfo,
    profile: gamificationProfile,
    enabled: gamificationEnabled,
    loading: gamificationLoading,
    refreshProfile: refreshGamificationProfile,
  } = useGamification(supabaseSession);

  const goldBalance = gamificationProfile?.total_points ?? 0;
  const goldBreakdown = splitGoldBalance(goldBalance);
  const { spinAvailable } = useDailySpinStatus(supabaseSession?.user?.id);
  const luckyRollStatus = useLuckyRollStatus(supabaseSession?.user?.id);
  const creatureCollectionSummary = useMemo(() => {
    if (!supabaseSession?.user?.id) {
      return { total: 0, rewardsReady: 0 };
    }

    const collection = fetchCreatureCollection(supabaseSession.user.id);
    return {
      total: collection.length,
      rewardsReady: collection.filter((entry) => getUnclaimedBondMilestones(entry).length > 0).length,
    };
  }, [showGameBoardOverlay, showLevelWorldsFromEntry, supabaseSession?.user?.id]);
  const goldValueLabel =
    goldBreakdown.diamonds > 0
      ? `💎 ${goldBreakdown.diamonds.toLocaleString()} · 🪙 ${goldBreakdown.goldRemainder.toLocaleString()}`
      : `🪙 ${goldBreakdown.goldRemainder.toLocaleString()}`;
  const zenTokenBalance = gamificationProfile?.zen_tokens ?? 0;
  const streakMomentum = gamificationProfile?.current_streak ?? 0;
  const currentLevel = levelInfo?.currentLevel ?? 1;
  const profileAvatarUrl =
    (supabaseSession?.user?.user_metadata?.avatar_url as string | undefined)
    ?? (supabaseSession?.user?.user_metadata?.picture as string | undefined)
    ?? undefined;
  const isGameModeActive = gamificationEnabled && isMobileMenuImageActive;
  const shouldShowPointsBadges = isGameModeActive && isMobileExperience;
  
  // Micro-test badge state for identity tab
  const microTestPlayerState: PlayerState = useMemo(() => {
    // TODO: Calculate days since foundation test from personality profile
    // For now, use a placeholder until personality profile is added to component state
    const daysSinceFoundation = 0;
    
    return {
      level: currentLevel,
      currentStreakDays: streakMomentum,
      daysSinceFoundationTest: daysSinceFoundation,
      completedMicroTests: [], // TODO: Load from storage/Supabase when micro-test tracking is added
    };
  }, [currentLevel, streakMomentum]);
  
  const microTestBadge = useMicroTestBadge(microTestPlayerState);
  

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
  
  // Dynamic daily treats inventory based on collection status
  const dailyTreatsInventory = useMemo(() => {
    // Note: We use supabaseSession directly here instead of activeSession to avoid dependency issues
    const userId = supabaseSession?.user?.id ?? createDemoSession().user.id;
    
    // Check if hearts have been collected today
    const heartsCollectedToday = hasCollectedDailyHeartsToday(userId);
    
    return {
      spinsRemaining: spinAvailable ? 1 : 0,
      heartsRemaining: heartsCollectedToday ? 0 : 5,
      hatchesRemaining: 1,
    };
  }, [spinAvailable, supabaseSession?.user?.id]);
  
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

    const baseItems = MOBILE_FOOTER_WORKSPACE_IDS.map((navId) => {
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

      // Transform 'identity' slot into 'contracts' button for mobile menu grid
      // (ID button moved to top section in sibling PR)
      if (navId === 'identity') {
        return {
          id: 'contracts',
          label: 'Contracts',
          ariaLabel: 'View and manage your contracts',
          icon: '🤝',
          summary: 'Create and track commitment contracts.',
        } satisfies MobileMenuNavItem;
      }

      if (navId === 'body') {
        return {
          id: navId,
          label: 'Health Goals',
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
    });
    const extraItems: MobileMenuNavItem[] = [
      {
        id: 'my-quest',
        label: 'My Quest',
        ariaLabel: 'Open my quest categories',
        icon: '🧭',
        summary: 'Open health goals, habits, routines, goals, check-ins, and contracts.',
      },
      {
        id: 'coach',
        label: 'Coach',
        ariaLabel: 'AI Coach - Get a guided next step',
        icon: <img src="/icons/ai_coach/aicoach_small.webp" alt="" loading="lazy" decoding="async" />,
        summary: 'Get a guided next step from your AI coach.',
      },
      {
        id: 'feedback-support',
        label: 'Feedback & Support',
        ariaLabel: 'Open feedback and support options',
        icon: '🫶',
        summary: 'Send feedback or request support.',
      },
    ];
    return [...baseItems, ...extraItems];
  }, [workspaceNavItems]);

  const popupLauncherItems = useMemo(() => {
    const orderedIds: MobileMenuNavItem['id'][] = ['my-quest', 'coach', 'account', 'feedback-support'];
    return orderedIds
      .map((id) => mobileMenuNavItems.find((item) => item.id === id))
      .filter((item): item is MobileMenuNavItem => Boolean(item));
  }, [mobileMenuNavItems]);

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

  const timerLauncherState = useMemo(() => deriveTimerLauncherState(footerTimerSession), [footerTimerSession]);
  const timerLauncherSeconds = useMemo(
    () => deriveRunningRemainingSeconds(footerTimerSession),
    [footerTimerSession],
  );

  const mobileFooterNavItems = useMemo(() => {
    const footerIds: MobileMenuNavItem['id'][] = [
      'planning',
      'breathing-space',
      'score',
      'actions',
    ];
    return footerIds
      .map((id) => mobileMenuNavItems.find((item) => item.id === id))
      .filter((item): item is MobileMenuNavItem => Boolean(item))
      .map((item) => {
        if (item.id !== 'actions') {
          return item;
        }

        if (timerLauncherState === 'active') {
          return {
            ...item,
            label: formatTimerSeconds(timerLauncherSeconds),
            ariaLabel: `Open timer with ${formatTimerSeconds(timerLauncherSeconds)} remaining`,
            icon: '⏱️',
            summary: 'Return to your active timer.',
          };
        }

        if (timerLauncherState === 'alert') {
          return {
            ...item,
            label: 'Done!',
            ariaLabel: 'Open timer completion alert',
            icon: '🔔',
            summary: 'Timer complete. Open to acknowledge.',
          };
        }

        return item;
      });
  }, [mobileMenuNavItems, timerLauncherSeconds, timerLauncherState]);
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
      levelLabel: `Island ${overlayIslandNumber}`,
      description:
        progressPercent > 0
          ? `${overlayIslandDisplayName} • ${progressPercent}% to L${levelNumber + 1}`
          : `${overlayIslandDisplayName} • ${xpProgressLabel}`,
      icon: '🎮',
      progress: progressPercent,
    } as const;
  }, [levelInfo, overlayIslandDisplayName, overlayIslandNumber]);

  const isGameNearNextLevel = Math.round(levelInfo?.progressPercentage ?? 0) >= 95;
  const mobileActiveNavId = showMobileHome ? 'planning' : activeWorkspaceNav;
  const shouldAutoCollapseOnIdle =
    isMobileExperience &&
    mobileActiveNavId !== null &&
    (MOBILE_FOOTER_AUTO_COLLAPSE_IDS.has(mobileActiveNavId) ||
      (mobileActiveNavId === 'actions' && actionsTabView === 'tasks'));
  const shouldAllowFooterCollapse = isMobileExperience && (isMobileMenuImageActive || shouldAutoCollapseOnIdle);
  const shouldHideFooterInJournal =
    isMobileExperience && isMobileMenuImageActive && activeWorkspaceNav === 'journal';

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

  const handleMobileFooterCollapse = useCallback(() => {
    if (!shouldAllowFooterCollapse) {
      return;
    }
    setIsMobileFooterCollapsed(true);
    if (mobileFooterCollapseTimeoutRef.current !== null) {
      window.clearTimeout(mobileFooterCollapseTimeoutRef.current);
      mobileFooterCollapseTimeoutRef.current = null;
    }
  }, [shouldAllowFooterCollapse]);

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
    if (!shouldHideFooterInJournal) {
      return;
    }
    setIsMobileFooterCollapsed(true);
    setIsMobileFooterSnapActive(false);
  }, [shouldHideFooterInJournal]);

  useEffect(() => {
    if (!isMobileExperience || !isMobileMenuImageActive || typeof window === 'undefined') {
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
  }, [handleMobileFooterExpand, isMobileMenuImageActive, isMobileExperience]);

  useEffect(() => {
    if (!isVisionRewardOpen || !isMobileExperience || !isMobileMenuImageActive) {
      return;
    }
    if (mobileFooterCollapseTimeoutRef.current !== null) {
      window.clearTimeout(mobileFooterCollapseTimeoutRef.current);
      mobileFooterCollapseTimeoutRef.current = null;
    }
    setIsMobileFooterCollapsed(true);
  }, [isVisionRewardOpen, isMobileMenuImageActive, isMobileExperience]);

  useEffect(() => {
    if (!isMobileExperience) {
      setActionsTabView('tasks');
      return;
    }

    if (activeWorkspaceNav !== 'actions') {
      return;
    }

    setActionsTabView((current) => (current === 'tasks' ? current : 'launcher'));
  }, [activeWorkspaceNav, isMobileExperience]);

  const isDemoMode = mode === 'demo';
  const [demoProfile, setDemoProfile] = useState(() => getDemoProfile());

  useEffect(() => {
    if (forceAuthOnMount && !isAuthenticated && !isDemoMode) {
      setShowAuthPanel(true);
      setActiveAuthTab('login');
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeSession = useMemo(() => {
    if (supabaseSession) {
      return supabaseSession;
    }
    return createDemoSession();
  }, [supabaseSession, demoProfile]);

  const handleGameModePreferenceChange = useCallback(async (nextIsActive: boolean) => {
    setIsMobileMenuImageActive(nextIsActive);
    triggerMobileMenuFlash();

    setActiveWorkspaceNav('planning');
    setShowMobileHome(true);
    setIsMobileMenuOpen(false);
    setShowGameBoardOverlay(false);
    setShowMobileGamification(false);

    const userId = activeSession?.user?.id;
    if (!userId) {
      return;
    }

    const { error } = await updateGamificationEnabled(userId, nextIsActive);
    if (error) {
      console.error('Failed to sync Game of Life mode:', error);
    }
    await refreshGamificationProfile();
  }, [activeSession?.user?.id, refreshGamificationProfile]);

  useEffect(() => {
    setIsMobileMenuImageActive(gamificationEnabled);
  }, [gamificationEnabled]);

  useEffect(() => {
    let isMounted = true;

    const loadHolidaySeason = async () => {
      const userId = activeSession?.user?.id;
      if (!userId) {
        if (!isMounted) return;
        setActiveHolidaySeason(null);
        setShowHolidaySeasonDialog(false);
        return;
      }

      const { data, error } = await fetchHolidayPreferences(userId);
      if (!isMounted || error || !data?.holidays) {
        if (isMounted) {
          setActiveHolidaySeason(null);
          setShowHolidaySeasonDialog(false);
        }
        return;
      }

      const enabledHolidays = new Set(
        Object.entries(data.holidays)
          .filter(([, isEnabled]) => isEnabled)
          .map(([holidayKey]) => holidayKey),
      );

      const activeHoliday = getActiveAdventMeta(enabledHolidays);
      setActiveHolidaySeason(activeHoliday);

      if (!activeHoliday) {
        setShowHolidaySeasonDialog(false);
        return;
      }

      const introStorageKey = `lifegoal:holiday-season-dialog-seen:${activeHoliday.cycleKey}`;
      const hasSeenDialog = window.localStorage.getItem(introStorageKey) === '1';
      if (hasSeenDialog) {
        setShowHolidaySeasonDialog(false);
        return;
      }

      window.localStorage.setItem(introStorageKey, '1');
      // Bug #8: Bypass HolidaySeasonDialog — open calendar directly
      setShowCalendarPlaceholder(true);
    };

    void loadHolidaySeason();

    return () => {
      isMounted = false;
    };
  }, [activeSession?.user?.id]);

  useEffect(() => {
    const handleHolidayPreviewLaunch = (event: Event) => {
      const customEvent = event as CustomEvent<HolidayPreviewLaunchDetail>;
      const { holidayKey, mode } = customEvent.detail ?? {};
      if (!holidayKey || !mode) return;

      const previewHoliday = buildPreviewAdventMeta(holidayKey);
      if (!previewHoliday) return;

      setActiveHolidaySeason(previewHoliday);

      if (mode === 'intro') {
        // Bug #8: Bypass HolidaySeasonDialog — open calendar directly for preview too
        setHolidayPreviewKey(previewHoliday.meta.holiday_key);
        setIsHolidaySeasonDialogPreview(false);
        setShowHolidaySeasonDialog(false);
        setShowCalendarPlaceholder(true);
        return;
      }

      setIsHolidaySeasonDialogPreview(false);
      setShowHolidaySeasonDialog(false);
      setHolidayPreviewKey(holidayKey);
      setShowCalendarPlaceholder(true);
    };

    window.addEventListener(HOLIDAY_PREVIEW_LAUNCH_EVENT, handleHolidayPreviewLaunch as EventListener);
    return () => {
      window.removeEventListener(HOLIDAY_PREVIEW_LAUNCH_EVENT, handleHolidayPreviewLaunch as EventListener);
    };
  }, []);

  useEffect(() => {
    const userId = activeSession?.user?.id;
    if (!userId) {
      setIsDesktopUiResearchPreviewEnabled(false);
      return;
    }

    const syncExperimentalFeatures = () => {
      const experimentalFeatures = getExperimentalFeatures(userId);
      setIsDesktopUiResearchPreviewEnabled(experimentalFeatures.desktopUiResearchPreview === true);
    };

    syncExperimentalFeatures();

    const handleExperimentalFeaturesUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ userId?: string }>;
      if (customEvent.detail?.userId && customEvent.detail.userId !== userId) {
        return;
      }
      syncExperimentalFeatures();
    };

    window.addEventListener(EXPERIMENTAL_FEATURES_UPDATED_EVENT, handleExperimentalFeaturesUpdate as EventListener);
    return () => {
      window.removeEventListener(
        EXPERIMENTAL_FEATURES_UPDATED_EVENT,
        handleExperimentalFeaturesUpdate as EventListener,
      );
    };
  }, [activeSession?.user?.id]);

  const [profileStrengthDebugSnapshot, setProfileStrengthDebugSnapshot] =
    useState<ProfileStrengthResult | null>(null);
  const [profileStrengthSnapshot, setProfileStrengthSnapshot] =
    useState<ProfileStrengthResult | null>(null);
  const [profileStrengthSignals, setProfileStrengthSignals] =
    useState<ProfileStrengthSignalSnapshot | null>(null);
  const [isProfileStrengthLoading, setIsProfileStrengthLoading] = useState(false);
  const [personalitySummary, setPersonalitySummary] = useState<string | null>(null);
  const [personalityScores, setPersonalityScores] = useState<PersonalityScores | null>(null);
  const [archetypeHand, setArchetypeHand] = useState<ArchetypeHand | null>(null);


  const dominantPlaystyleCard = archetypeHand?.dominant.card ?? null;
  const playstyleIcon = dominantPlaystyleCard?.icon ?? null;
  const playstyleLabel = dominantPlaystyleCard
    ? `${dominantPlaystyleCard.name} (${SUIT_LABELS[dominantPlaystyleCard.suit]})`
    : null;

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
      setPersonalityScores(null);
      setArchetypeHand(null);
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
        }

        // Load personality scores and compute archetype hand
        const traits = profile?.personality_traits as Record<string, number> | null;
        const axes = profile?.personality_axes as Record<string, number> | null;
        if (profile && traits && axes && Object.keys(traits).length > 0) {
          // Build PersonalityScores object with proper type mapping
          const scores: PersonalityScores = {
            traits: {
              openness: traits.openness ?? 50,
              conscientiousness: traits.conscientiousness ?? 50,
              extraversion: traits.extraversion ?? 50,
              agreeableness: traits.agreeableness ?? 50,
              emotional_stability: traits.emotional_stability ?? 50,
            },
            axes: {
              regulation_style: axes.regulation_style ?? 50,
              stress_response: axes.stress_response ?? 50,
              identity_sensitivity: axes.identity_sensitivity ?? 50,
              cognitive_entry: axes.cognitive_entry ?? 50,
              honesty_humility: axes.honesty_humility ?? 50,
              emotionality: axes.emotionality ?? 50,
            },
          };
          setPersonalityScores(scores);

          // Compute archetype hand
          const archetypeScores = scoreArchetypes(scores, ARCHETYPE_DECK);
          const rankedScores = rankArchetypes(archetypeScores);
          const hand = buildHand(rankedScores);
          setArchetypeHand(hand);

          // Backward compatibility: regenerate summary if it doesn't exist
          if (!profile.personality_summary) {
            const regeneratedSummary = buildTopTraitSummary(traits);
            setPersonalitySummary(regeneratedSummary);
            
            // Persist the regenerated summary to Supabase
            try {
              await upsertPersonalityProfile({
                user_id: userId,
                personality_traits: profile.personality_traits,
                personality_axes: profile.personality_axes,
                personality_summary: regeneratedSummary,
                personality_last_tested_at: profile.personality_last_tested_at,
              });
            } catch (error) {
              console.error('Failed to persist regenerated personality summary:', error);
            }
          }
          return;
        }

        if (records.length === 0) {
          setPersonalitySummary(null);
          setPersonalityScores(null);
          setArchetypeHand(null);
          return;
        }

        // Fallback to records data
        const record = records[0];
        if (record.traits) {
          const recordTraits = record.traits as Record<string, number>;
          const recordAxes = record.axes as Record<string, number>;
          const scores: PersonalityScores = {
            traits: {
              openness: recordTraits.openness ?? 50,
              conscientiousness: recordTraits.conscientiousness ?? 50,
              extraversion: recordTraits.extraversion ?? 50,
              agreeableness: recordTraits.agreeableness ?? 50,
              emotional_stability: recordTraits.emotional_stability ?? 50,
            },
            axes: {
              regulation_style: recordAxes.regulation_style ?? 50,
              stress_response: recordAxes.stress_response ?? 50,
              identity_sensitivity: recordAxes.identity_sensitivity ?? 50,
              cognitive_entry: recordAxes.cognitive_entry ?? 50,
              honesty_humility: recordAxes.honesty_humility ?? 50,
              emotionality: recordAxes.emotionality ?? 50,
            },
          };
          setPersonalityScores(scores);

          // Compute archetype hand
          const archetypeScores = scoreArchetypes(scores, ARCHETYPE_DECK);
          const rankedScores = rankArchetypes(archetypeScores);
          const hand = buildHand(rankedScores);
          setArchetypeHand(hand);

          setPersonalitySummary(buildTopTraitSummary(record.traits));
        }
      } catch {
        if (isMounted) {
          setPersonalitySummary(null);
          setPersonalityScores(null);
          setArchetypeHand(null);
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

  // Reset stale feedback/support modal flags whenever mobile menu opens.
  // Prevents flags from surviving menu reopen cycles.
  useEffect(() => {
    if (isMobileMenuOpen) {
      setShowMobileFeedbackModal(false);
      setShowMobileSupportModal(false);
      setIsMyQuestSubmenuOpen(false);
      setIsFeedbackSupportSubmenuOpen(false);
    }
  }, [isMobileMenuOpen]);

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
    const host = window.location.hostname.toLowerCase();
    const isPeacebetweenHost = host === 'peacebetween.com' || host === 'www.peacebetween.com';
    if (window.location.pathname === '/journal') {
      setActiveWorkspaceNav('journal');
    } else if (window.location.pathname === '/breathing-space') {
      setActiveWorkspaceNav('breathing-space');
    } else if (window.location.pathname.startsWith('/conflict/join') || isPeacebetweenHost) {
      setActiveWorkspaceNav('breathing-space');
      setBreathingSpaceMobileTab('conflict');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const activeSurface = resolveSurface(window.location.hostname);
    const isPeaceBetweenRootRoute = activeSurface === 'peacebetween' && window.location.pathname === '/';
    if (isConflictRoute(window.location.pathname) || isPeaceBetweenRootRoute) return;
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
    if (!isMobileExperience) {
      setShowMobileHome(false);
      return;
    }
    setShowMobileHome((current) => (current ? current : true));
  }, [isMobileExperience]);

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
    if (isMobileExperience || !isDesktopMenuOpen || isDesktopMenuPinned) return;
    if (desktopMenuAutoHideTimeoutRef.current !== null) {
      window.clearTimeout(desktopMenuAutoHideTimeoutRef.current);
    }
    desktopMenuAutoHideTimeoutRef.current = window.setTimeout(() => {
      setIsDesktopMenuOpen(false);
      desktopMenuAutoHideTimeoutRef.current = null;
    }, 3000);
  }, [isDesktopMenuOpen, isMobileExperience, isDesktopMenuPinned]);

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
        if (isMobileExperience) {
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
      if (isMobileExperience) {
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

  const closeGameBoardOverlayIfOpen = () => {
    if (showGameBoardOverlay) {
      setShowGameBoardOverlay(false);
    }
  };

  const handleMobileNavSelect = (navId: string, options?: { preserveBreatheTab?: boolean }) => {
    setIsMobileProfileDialogOpen(false);
    setIsMobileMenuOpen(false);
    setIsEnergyMenuOpen(false);
    setIsMyQuestSubmenuOpen(false);
    setIsFeedbackSupportSubmenuOpen(false);
    closeGameBoardOverlayIfOpen();
    
    const preserveBreatheTab = options?.preserveBreatheTab ?? false;

    if (navId === 'breathing-space' && !preserveBreatheTab) {
      setBreathingSpaceMobileTab(null);
    }

    if (navId === 'contracts') {
      setActiveWorkspaceNav('contracts');
      setShowMobileHome(false);
      return;
    }

    if (navId === 'game' && isMobileExperience) {
      setShowGameBoardOverlay(true);
      return;
    }

    if (navId === 'coach') {
      setAiCoachStarterQuestion(undefined);
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

    if (navId === 'planning' && isMobileExperience) {
      openTodayHome();
      return;
    }

    if (navId === 'score') {
      setScoreTabActiveTab('home');
      setShowMobileGamification(false);
    }

    if (navId === 'actions' && timerLauncherState !== 'idle') {
      setActiveWorkspaceNav('timer');
      setShowMobileHome(false);
      return;
    }

    if (navId === 'actions') {
      setActionsLauncherResetSignal((prev) => prev + 1);
    }

    setActiveWorkspaceNav(navId);
    setShowMobileHome(false);
  };

  const openFeedbackSupportFromMobileMenu = (mode: 'feedback' | 'support') => {
    setIsMobileProfileDialogOpen(false);
    setIsMobileMenuOpen(false);
    setIsEnergyMenuOpen(false);
    setIsMyQuestSubmenuOpen(false);
    setIsFeedbackSupportSubmenuOpen(false);
    closeGameBoardOverlayIfOpen();

    if (mode === 'feedback') {
      setShowMobileFeedbackModal(true);
    } else {
      setShowMobileSupportModal(true);
    }
  };

  const myQuestSubmenuActions: LauncherSubmenuAction[] = useMemo(
    () => [
      { id: 'body', label: 'Health Goals', icon: '💪', onSelect: () => handleMobileNavSelect('body') },
      { id: 'habits', label: 'Habits', icon: '🔄', onSelect: () => handleMobileNavSelect('habits') },
      { id: 'routines', label: 'Routines', icon: '🧩', onSelect: () => handleMobileNavSelect('routines') },
      { id: 'support', label: 'Goals', icon: '🎯', onSelect: () => handleMobileNavSelect('support') },
      { id: 'planning', label: 'Check-ins', icon: '✅', onSelect: () => handleMobileNavSelect('planning') },
      { id: 'contracts', label: 'Contracts', icon: '🤝', onSelect: () => handleMobileNavSelect('contracts') },
    ],
    [handleMobileNavSelect],
  );

  const feedbackSupportSubmenuActions: LauncherSubmenuAction[] = useMemo(
    () => [
      { id: 'feedback', label: 'Feedback', icon: '💬', onSelect: () => openFeedbackSupportFromMobileMenu('feedback') },
      { id: 'support', label: 'Support', icon: '🛟', onSelect: () => openFeedbackSupportFromMobileMenu('support') },
    ],
    [openFeedbackSupportFromMobileMenu],
  );

  const handleEnergySelect = (category: 'mind' | 'body') => {
    closeGameBoardOverlayIfOpen();
    
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
      if (!isMobileExperience || !area || event.pointerType === 'mouse') {
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
    [clearProfileStrengthHoldTimer, isMobileExperience, openProfileStrengthHold],
  );

  const handleMenuHelperHoldStart = useCallback(
    (event: PointerEvent<HTMLButtonElement>, item: MobileMenuNavItem | null) => {
      if (!isMobileExperience || !item || event.pointerType === 'mouse') {
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
    [clearMenuHelperHoldTimer, isMobileExperience],
  );

  const handleProfileStrengthHoldMove = useCallback(
    (event: PointerEvent<HTMLButtonElement>, area: AreaKey | null) => {
      if (!isMobileExperience || !area || !profileStrengthHoldStartRef.current) {
        return;
      }
      const deltaX = event.clientX - profileStrengthHoldStartRef.current.x;
      const deltaY = event.clientY - profileStrengthHoldStartRef.current.y;
      if (Math.hypot(deltaX, deltaY) > PROFILE_STRENGTH_HOLD_SLOP_PX) {
        clearProfileStrengthHoldTimer();
      }
    },
    [clearProfileStrengthHoldTimer, isMobileExperience],
  );

  const handleMenuHelperHoldMove = useCallback(
    (event: PointerEvent<HTMLButtonElement>, item: MobileMenuNavItem | null) => {
      if (!isMobileExperience || !item || !menuHelperHoldStartRef.current) {
        return;
      }
      const deltaX = event.clientX - menuHelperHoldStartRef.current.x;
      const deltaY = event.clientY - menuHelperHoldStartRef.current.y;
      if (Math.hypot(deltaX, deltaY) > PROFILE_STRENGTH_HOLD_SLOP_PX) {
        clearMenuHelperHoldTimer();
      }
    },
    [clearMenuHelperHoldTimer, isMobileExperience],
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
    setIsMobileMenuOpen(false);
    setIsEnergyMenuOpen(false);
    setIsMobileFooterCollapsed(false);
    setIsMobileFooterSnapActive(false);

    if (!isMobileMenuImageActive) {
      setShowGameBoardOverlay(false);
      setShowMobileGamification(true);
      return;
    }

    setShowMobileGamification(false);
    setShowGameBoardOverlay((previous) => !previous);
  };

  const handleMobileGameStatusHoldToggle = () => {
    const nextIsActive = !isMobileMenuImageActive;
    void handleGameModePreferenceChange(nextIsActive);
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

  const handleQuickJournalNow = useCallback((type: JournalType) => {
    setJournalLaunchRequest({
      type,
      openComposer: true,
      requestId: Date.now(),
    });
    setActiveWorkspaceNav('journal');
    setShowMobileHome(false);
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
  const accountDisplayName = normalizedDisplayName || userDisplay || 'Guest';
  const accountInitials = profileInitials || generateInitials(accountDisplayName);
  const accountEmail = activeSession.user.email || 'No email on file';
  const accountWorkspaceName = workspaceProfile?.workspace_name || 'Personal rituals workspace';
  const accountWorkspaceMode = isDemoExperience ? 'Demo (local device only)' : 'Connected to Supabase';
  const accountBirthday = workspaceProfile?.birthday || 'Not set';
  const accountGender = workspaceProfile?.gender || 'Not set';
  const accountOnboardingStatus = activeSession.user.user_metadata?.onboarding_complete ? 'Complete' : 'In progress';

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

  useEffect(() => {
    if (!isIslandRunEntryDebugEnabled()) return;

    logIslandRunEntryDebug('first_paint_snapshot', {
      hasOpenIslandRun: new URLSearchParams(window.location.search).has('openIslandRun'),
      hasOpenIslandRunSource: new URLSearchParams(window.location.search).has('openIslandRunSource'),
      shouldAutoOpenIslandRun,
    });
  }, [logIslandRunEntryDebug, shouldAutoOpenIslandRun]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('openIslandRun') && !params.has('openIslandRunSource')) return;

    logIslandRunEntryDebug('consume_bootstrap_params_start', {
      openIslandRun: params.get('openIslandRun'),
      openIslandRunSource: params.get('openIslandRunSource'),
    });

    params.delete('openIslandRun');
    params.delete('openIslandRunSource');
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', nextUrl);
    logIslandRunEntryDebug('consume_bootstrap_params_done', {
      nextUrl,
    });
  }, [logIslandRunEntryDebug]);

  useEffect(() => {
    logIslandRunEntryDebug('auto_open_effect_check', {
      shouldAutoOpenIslandRun,
      hasActiveSession: Boolean(activeSession),
    });

    if (!shouldAutoOpenIslandRun || !activeSession) return;

    setLevelWorldsEntryPanel('default');
    setShowLevelWorldsFromEntry(true);
    setShouldAutoOpenIslandRun(false);
    logIslandRunEntryDebug('auto_open_triggered');
  }, [activeSession, logIslandRunEntryDebug, shouldAutoOpenIslandRun]);

  useEffect(() => {
    logIslandRunEntryDebug('entry_modal_state_changed', {
      showLevelWorldsFromEntry,
      hasActiveSession: Boolean(activeSession),
    });
  }, [activeSession, logIslandRunEntryDebug, showLevelWorldsFromEntry]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleOpenScoreGarage = () => {
      setShowLevelWorldsFromEntry(false);
      setLevelWorldsEntryPanel('default');
      setScoreTabActiveTab('garage');
      setShowMobileHome(false);
      setActiveWorkspaceNav('score');
    };
    window.addEventListener('openScoreGarageFromSanctuary', handleOpenScoreGarage as EventListener);
    return () => {
      window.removeEventListener('openScoreGarageFromSanctuary', handleOpenScoreGarage as EventListener);
    };
  }, []);

  const shouldLockAppScroll = showGameBoardOverlay || showLuckyRoll || showDailySpinWheel || showCalendarPlaceholder || showLevelWorldsFromEntry;
  const isStandalonePwa = useMemo(
    () => (typeof window !== 'undefined' ? isStandaloneMode() : false),
    [],
  );

  useEffect(() => {
    if (!isStandalonePwa) {
      return undefined;
    }

    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverscrollBehaviorY = html.style.overscrollBehaviorY;
    const previousBodyOverscrollBehaviorY = body.style.overscrollBehaviorY;

    html.style.overscrollBehaviorY = 'none';
    body.style.overscrollBehaviorY = 'none';

    return () => {
      html.style.overscrollBehaviorY = previousHtmlOverscrollBehaviorY;
      body.style.overscrollBehaviorY = previousBodyOverscrollBehaviorY;
    };
  }, [isStandalonePwa]);

  useEffect(() => {
    if (!shouldLockAppScroll) {
      return undefined;
    }

    const body = document.body;
    const html = document.documentElement;
    const root = document.getElementById('root');
    const scrollY = window.scrollY;

    const previousBodyOverflow = body.style.overflow;
    const previousBodyPosition = body.style.position;
    const previousBodyTop = body.style.top;
    const previousBodyBottom = body.style.bottom;
    const previousBodyWidth = body.style.width;
    const previousBodyTouchAction = body.style.touchAction;
    const previousHtmlOverflow = html.style.overflow;
    const previousHtmlOverscrollBehaviorY = html.style.overscrollBehaviorY;
    const previousHtmlBg = html.style.backgroundColor;
    const previousBodyOverscrollBehaviorY = body.style.overscrollBehaviorY;
    const previousRootOverflow = root?.style.overflow ?? '';
    const previousRootHeight = root?.style.height ?? '';

    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.bottom = 'calc(-1 * env(safe-area-inset-bottom, 0px))';
    body.style.width = '100%';
    body.style.touchAction = 'none';
    html.style.overflow = 'hidden';
    html.style.overscrollBehaviorY = 'none';
    html.style.backgroundColor = '#000';
    body.style.overscrollBehaviorY = 'none';

    if (root) {
      root.style.overflow = 'hidden';
      root.style.height = '100%';
    }

    return () => {
      body.style.overflow = previousBodyOverflow;
      body.style.position = previousBodyPosition;
      body.style.top = previousBodyTop;
      body.style.bottom = previousBodyBottom;
      body.style.width = previousBodyWidth;
      body.style.touchAction = previousBodyTouchAction;
      body.style.overscrollBehaviorY = previousBodyOverscrollBehaviorY;
      html.style.overflow = previousHtmlOverflow;
      html.style.overscrollBehaviorY = previousHtmlOverscrollBehaviorY;
      html.style.backgroundColor = previousHtmlBg;

      if (root) {
        root.style.overflow = previousRootOverflow;
        root.style.height = previousRootHeight;
      }

      window.scrollTo(0, scrollY);
    };
  }, [shouldLockAppScroll]);

  const handleCloseWorkspaceSetup = () => {
    setShowWorkspaceSetup(false);
    setWorkspaceSetupDismissed(true);
  };

  const activeSurface = resolveSurface(typeof window !== 'undefined' ? window.location.hostname : null);
  const shouldRenderPeaceBetweenConflictShell =
    activeSurface === 'peacebetween' &&
    typeof window !== 'undefined' &&
    isConflictRoute(window.location.pathname);
  const shouldRenderPeaceBetweenLanding =
    activeSurface === 'peacebetween' &&
    typeof window !== 'undefined' &&
    window.location.pathname === '/';

  if (shouldRenderPeaceBetweenConflictShell) {
    return (
      <PeaceBetweenShell>
        <ConflictResolverEntry surface="peacebetween" />
      </PeaceBetweenShell>
    );
  }

  if (shouldRenderPeaceBetweenLanding) {
    return <PeaceBetweenLanding />;
  }

  if (shouldRequireAuthentication && isMobileExperience) {
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

  const shouldForceAuthOverlay = shouldRequireAuthentication && !isMobileExperience;
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
                setAiCoachStarterQuestion(undefined);
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
            onLaunchWeeklyHabitReview={() => setActiveWorkspaceNav('planning')}
            onLaunchDailyCatchUpPrompt={() => setActiveWorkspaceNav('planning')}
            billingReturnBanner={billingReturnBanner}
          />
        </div>
      );
    }

    if (activeWorkspaceNav === 'player-avatar') {
      return (
        <div className="workspace-content">
          <PlayerAvatarPanel
            session={activeSession}
            personalityScores={personalityScores}
            archetypeHand={archetypeHand}
            personalitySummary={personalitySummary}
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
            {isMobileExperience ? (
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
            <RoutinesTodayLane
              session={activeSession}
              onHideStandaloneHabitsChange={(habitIds) => setRoutineHiddenHabitIds(habitIds)}
            />
            <DailyHabitTracker
              session={activeSession}
              showPointsBadges={shouldShowPointsBadges}
              onVisionRewardOpenChange={setIsVisionRewardOpen}
              profileStrengthSnapshot={profileStrengthSnapshot}
              profileStrengthSignals={profileStrengthSignals}
              personalitySummary={personalitySummary}
              onOpenSpinWheel={() => setShowDailySpinWheel(true)}
              onOpenLuckyRoll={() => setShowLuckyRoll(true)}
              onOpenDailyTreat={() => setShowCalendarPlaceholder(true)}
              onOpenIslandRunStop={(stopId) => {
                setIslandRunOpenStopParam(stopId);
                setShowMobileHome(false);
                setLevelWorldsEntryPanel('default');
                setShowLevelWorldsFromEntry(true);
              }}
              pendingOfferToOpen={pendingTodayOfferOpen}
              onPendingOfferHandled={() => setPendingTodayOfferOpen(null)}
              hiddenHabitIds={[]}
            />
            <HabitsModule
              session={activeSession}
              onNavigateToTimer={(context) => {
                if (context) {
                  setTimerLaunchContext(context);
                }
                setActiveWorkspaceNav('timer');
              }}
            />
          </div>
        );
      case 'actions':
        return (
          <div className="workspace-content">
            <ActionsTab
              session={activeSession}
              showPointsBadges={shouldShowPointsBadges}
              onNavigateToProjects={() => setActiveWorkspaceNav('projects')}
              onNavigateToTimer={(context) => {
                if (context) {
                  setTimerLaunchContext(context);
                }
                setActiveWorkspaceNav('timer');
              }}
              onNavigateToJournal={() => setActiveWorkspaceNav('journal')}
              onNavigateToVisionBoard={() => setActiveWorkspaceNav('insights')}
              isMobileView={isMobileExperience}
              resetToLauncherSignal={actionsLauncherResetSignal}
              onViewChange={setActionsTabView}
            />
          </div>
        );
      case 'timer':
        return (
          <div className="workspace-content">
            <TimerTab
              onNavigateToActions={() => setActiveWorkspaceNav('actions')}
              userId={activeSession?.user?.id ?? null}
              launchContext={timerLaunchContext}
              onLaunchContextHandled={() => setTimerLaunchContext(null)}
            />
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
              onNavigateToGarage={() => {
                setScoreTabActiveTab('garage');
              }}
              onNavigateToShipCompanions={() => {
                setLevelWorldsEntryPanel('sanctuary');
                setShowLevelWorldsFromEntry(true);
              }}
              initialActiveTab={scoreTabActiveTab}
              onActiveTabChange={(tab) => setScoreTabActiveTab(tab)}
            />
          </div>
        );
      case 'contracts':
        return (
          <div className="workspace-content">
            <ContractsTab
              session={activeSession}
              profile={gamificationProfile}
              enabled={gamificationEnabled}
              loading={gamificationLoading}
            />
          </div>
        );
      case 'projects':
        return (
          <div className="workspace-content">
            <ProjectsManager
              session={activeSession}
              onNavigateToActions={() => setActiveWorkspaceNav('actions')}
              onNavigateToTimer={(context) => {
                if (context) {
                  setTimerLaunchContext(context);
                }
                setActiveWorkspaceNav('timer');
              }}
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
            <HabitsModule
              session={activeSession}
              onNavigateToTimer={(context) => {
                if (context) {
                  setTimerLaunchContext(context);
                }
                setActiveWorkspaceNav('timer');
              }}
            />
          </div>
        );
      case 'routines':
        return (
          <div className="workspace-content">
            <RoutinesTab
              session={activeSession}
              onOpenToday={() => {
                if (isMobileExperience) {
                  setShowMobileHome(true);
                  return;
                }
                setActiveWorkspaceNav('planning');
              }}
            />
          </div>
        );
      case 'journal':
        return (
          <div className="workspace-content">
            <Journal
              session={activeSession}
              onNavigateToGoals={() => handleJournalNavigation('support')}
              onNavigateToHabits={() => handleJournalNavigation('planning')}
              onOpenAiCoach={(starterQuestion) => {
                setAiCoachStarterQuestion(starterQuestion);
                setShowAiCoachModal(true);
              }}
              launchRequest={journalLaunchRequest}
              onNavigateToTimer={(context) => {
                if (context) {
                  setTimerLaunchContext(context);
                }
                setActiveWorkspaceNav('timer');
              }}
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
              onNavigateToTimer={(context) => {
                if (context) {
                  setTimerLaunchContext(context);
                }
                setActiveWorkspaceNav('timer');
              }}
            />
          </div>
        );
      case 'insights':
        return (
          <div className="workspace-content">
            <VisionBoard
              session={activeSession}
              onNavigateToTimer={(context) => {
                if (context) {
                  setTimerLaunchContext(context);
                }
                setActiveWorkspaceNav('timer');
              }}
            />
          </div>
        );
      case 'support':
        return (
          <div className="workspace-content">
            <LifeGoalsSection session={activeSession} />
            <GoalWorkspace
              session={activeSession}
              onNavigateToTimer={(context) => {
                if (context) {
                  setTimerLaunchContext(context);
                }
                setActiveWorkspaceNav('timer');
              }}
              onNavigateToAiCoach={(starterQuestion) => {
                setAiCoachStarterQuestion(starterQuestion);
                setShowAiCoachModal(true);
              }}
            />
          </div>
        );
      case 'game':
        return (
          <div className="workspace-content">
            <section className="game-hub">
              <div className="game-hub__sections">
                <AchievementsPage session={activeSession} />
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
    isMobileExperience && isMobileMenuOpen ? (
      <div
        className={`mobile-menu-overlay${isMobileMenuImageActive ? ' mobile-menu-overlay--diode-on' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Open full LifeGoalApp menu"
      >
        <div
          className="mobile-menu-overlay__backdrop"
          onClick={() => {
            setIsMobileProfileDialogOpen(false);
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
                <div className="mobile-menu-overlay__top-controls">
                  <div className="mobile-menu-overlay__game-mode">
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
                        void handleGameModePreferenceChange(nextIsActive);
                      }}
                    />
                    <span
                      className={`mobile-menu-overlay__game-mode-label ${
                        isMobileMenuImageActive
                          ? 'mobile-menu-overlay__game-mode-label--on'
                          : 'mobile-menu-overlay__game-mode-label--off'
                      }`}
                    >
                      GAME MODE ({isMobileMenuImageActive ? 'ON' : 'OFF'})
                    </span>
                  </div>
                  <button
                    type="button"
                    className="mobile-menu-overlay__close mobile-menu-overlay__close--enlarged"
                    aria-label="Close menu"
                    onClick={() => {
                      setIsMobileProfileDialogOpen(false);
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    ×
                  </button>
                </div>
                <button
                  type="button"
                  className="mobile-menu-overlay__profile-launch"
                  onClick={() => setIsMobileProfileDialogOpen(true)}
                  aria-label="Open player profile details"
                >
                  <div
                    className="mobile-menu-overlay__profile-picture mobile-menu-overlay__profile-picture--large"
                    aria-hidden="true"
                  >
                    {playstyleIcon ? (
                      <span className="mobile-menu-overlay__profile-playstyle" role="img" aria-hidden="true">
                        {playstyleIcon}
                      </span>
                    ) : (
                      <span className="mobile-menu-overlay__profile-initials">
                        {(normalizedDisplayName || userDisplay || 'Guest').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="mobile-menu-overlay__profile-launch-spacer" aria-hidden="true" />
                  <div className="mobile-menu-overlay__profile-hand" aria-hidden="true">
                    <span className="mobile-menu-overlay__profile-hand-icon">🪪</span>
                    <span className="mobile-menu-overlay__profile-hand-label">Player's Hand</span>
                    {microTestBadge.showBadge && (
                      <span
                        className="mobile-menu-overlay__profile-hand-alert"
                        aria-label={`${microTestBadge.count} micro-tests available`}
                      />
                    )}
                  </div>
                </button>
              </div>
            </div>
            {isMobileProfileDialogOpen ? (
              <div className="mobile-menu-overlay__profile-dialog" role="dialog" aria-modal="true" aria-label="Player profile details">
                <div
                  className="mobile-menu-overlay__profile-dialog-backdrop"
                  onClick={() => setIsMobileProfileDialogOpen(false)}
                  role="presentation"
                />
                <div className="mobile-menu-overlay__profile-dialog-panel">
                  <div className="mobile-menu-overlay__profile-dialog-header">
                    <div>
                      <p className="mobile-menu-overlay__profile-dialog-eyebrow">Player Profile</p>
                      <h3 className="mobile-menu-overlay__profile-dialog-title">My account</h3>
                      <p className="mobile-menu-overlay__profile-dialog-lead">
                        Review your identity details and workspace access.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="mobile-menu-overlay__close"
                      aria-label="Close profile details"
                      onClick={() => setIsMobileProfileDialogOpen(false)}
                    >
                      ×
                    </button>
                  </div>
                  <div className="mobile-menu-overlay__profile-dialog-meta" aria-label="Profile summary">
                    <div className="mobile-menu-overlay__profile-dialog-meta-row">
                      <span className="mobile-menu-overlay__profile-dialog-meta-label">Name</span>
                      <span className="mobile-menu-overlay__profile-dialog-meta-value">{accountDisplayName}</span>
                    </div>
                    <div className="mobile-menu-overlay__profile-dialog-meta-row">
                      <span className="mobile-menu-overlay__profile-dialog-meta-label">Type</span>
                      <span className="mobile-menu-overlay__profile-dialog-meta-value">
                        {playstyleLabel ?? personalitySummary ?? 'Personality test'}
                      </span>
                    </div>
                  </div>
                  <dl className="mobile-menu-overlay__profile-dialog-details">
                    <div><dt>Initials</dt><dd>{accountInitials || 'Not set'}</dd></div>
                    <div><dt>Email</dt><dd>{accountEmail}</dd></div>
                    <div><dt>Workspace Name</dt><dd>{accountWorkspaceName}</dd></div>
                    <div><dt>Workspace Mode</dt><dd>{accountWorkspaceMode}</dd></div>
                    <div><dt>Birthday</dt><dd>{accountBirthday}</dd></div>
                    <div><dt>Gender</dt><dd>{accountGender}</dd></div>
                    <div><dt>Onboarding</dt><dd>{accountOnboardingStatus}</dd></div>
                  </dl>
                  <div className="mobile-menu-overlay__profile-dialog-actions">
                    <button
                      type="button"
                      className="mobile-menu-overlay__quick-action-btn"
                      onClick={() => handleMobileNavSelect('identity')}
                      aria-label="Open player's hand"
                    >
                      <span className="mobile-menu-overlay__quick-action-icon">🪪</span>
                      <span className="mobile-menu-overlay__quick-action-label">Player's Hand</span>
                    </button>
                    <button
                      type="button"
                      className="mobile-menu-overlay__quick-action-btn"
                      onClick={() => handleMobileNavSelect('player-avatar')}
                      aria-label="Open avatar settings"
                    >
                      <span className="mobile-menu-overlay__quick-action-icon">👤</span>
                      <span className="mobile-menu-overlay__quick-action-label">Avatar</span>
                    </button>
                  </div>
                  <div className="mobile-menu-overlay__profile-dialog-footer">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        setIsMobileProfileDialogOpen(false);
                        setIsMobileMenuOpen(false);
                        handleEditAccountDetails();
                      }}
                    >
                      Edit account details
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="mobile-menu-overlay__content">
              <ul className="mobile-menu-overlay__list">
                {popupLauncherItems.map((item) => {
                    const isBreathingItem = item.id === 'breathing-space';
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
                      if (item.id === 'my-quest') {
                        setIsMyQuestSubmenuOpen(true);
                        return;
                      }
                      if (item.id === 'feedback-support') {
                        setIsFeedbackSupportSubmenuOpen(true);
                        return;
                      }
                      // Modal-key items (if configured) must always open the
                      // modal regardless of hold state.
                      if (item.modalKey) {
                        menuHelperHoldTriggeredRef.current = false;
                        profileStrengthHoldTriggeredRef.current = false;
                        openFeedbackSupportFromMobileMenu(item.modalKey);
                        return;
                      }
                      if (profileStrengthArea && profileStrengthHoldTriggeredRef.current) {
                        profileStrengthHoldTriggeredRef.current = false;
                        return;
                      }
                      if (isHelperHoldTarget && menuHelperHoldTriggeredRef.current) {
                        menuHelperHoldTriggeredRef.current = false;
                        return;
                      }
                      if (isBreathingItem) {
                        handleMobileNavSelect('breathing-space');
                        return;
                      }
                      handleMobileNavSelect(item.id);
                    };

                    return (
                      <li
                        key={item.id}
                        className={`mobile-menu-overlay__item${
                          item.id === 'my-quest' ? ' mobile-menu-overlay__item--large' : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={handleItemClick}
                          aria-label={item.ariaLabel}
                          onPointerDown={(event) => {
                            // Skip hold timer for modal-key items (feedback /
                            // support) – they navigate to a modal, not a
                            // tooltip, so the hold gesture is not useful.
                            if (item.modalKey) {
                              return;
                            }
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
                            if ((profileStrengthArea || isHelperHoldTarget) && isMobileExperience) {
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
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </div>
            {isMyQuestSubmenuOpen ? (
              <div className="mobile-menu-overlay__hold-modal" role="dialog" aria-modal="true" aria-label="My Quest menu">
                <button
                  type="button"
                  className="mobile-menu-overlay__hold-backdrop"
                  aria-label="Close My Quest menu"
                  onClick={() => setIsMyQuestSubmenuOpen(false)}
                />
                <div className="mobile-menu-overlay__hold-panel mobile-menu-overlay__submenu-sheet">
                  <div className="mobile-menu-overlay__hold-header">
                    <div>
                      <p className="mobile-menu-overlay__hold-eyebrow">Quest menu</p>
                      <h3 className="mobile-menu-overlay__hold-title">My Quest</h3>
                    </div>
                    <button
                      type="button"
                      className="mobile-menu-overlay__hold-close"
                      aria-label="Close My Quest menu"
                      onClick={() => setIsMyQuestSubmenuOpen(false)}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mobile-menu-overlay__submenu mobile-menu-overlay__submenu--open">
                    {myQuestSubmenuActions.map((action) => (
                      <button key={action.id} type="button" className="mobile-menu-overlay__submenu-button" onClick={action.onSelect}>
                        <span className="mobile-menu-overlay__submenu-icon" aria-hidden="true">
                          {action.icon}
                        </span>
                        <span>{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
            {isFeedbackSupportSubmenuOpen ? (
              <div className="mobile-menu-overlay__hold-modal" role="dialog" aria-modal="true" aria-label="Feedback and support menu">
                <button
                  type="button"
                  className="mobile-menu-overlay__hold-backdrop"
                  aria-label="Close feedback and support menu"
                  onClick={() => setIsFeedbackSupportSubmenuOpen(false)}
                />
                <div className="mobile-menu-overlay__hold-panel mobile-menu-overlay__submenu-sheet">
                  <div className="mobile-menu-overlay__hold-header">
                    <div>
                      <p className="mobile-menu-overlay__hold-eyebrow">Help</p>
                      <h3 className="mobile-menu-overlay__hold-title">Feedback &amp; Support</h3>
                    </div>
                    <button
                      type="button"
                      className="mobile-menu-overlay__hold-close"
                      aria-label="Close feedback and support menu"
                      onClick={() => setIsFeedbackSupportSubmenuOpen(false)}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mobile-menu-overlay__submenu mobile-menu-overlay__submenu--open">
                    {feedbackSupportSubmenuActions.map((action) => (
                      <button key={action.id} type="button" className="mobile-menu-overlay__submenu-button" onClick={action.onSelect}>
                        <span className="mobile-menu-overlay__submenu-icon" aria-hidden="true">
                          {action.icon}
                        </span>
                        <span>{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
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
                    <button
                      type="button"
                      className="mobile-menu-overlay__profile-button"
                      onClick={() => {
                        setIsProfileStrengthOpen(false);
                        setShowMobileGamification(true);
                      }}
                    >
                      Open Quest Menu
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
    isMobileExperience && showMobileGamification ? (
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
              <p className="mobile-gamification-overlay__eyebrow">Quest Menu</p>
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
                  setShowMobileGamification(false);
                  void handleGameModePreferenceChange(nextIsActive);
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
                <p className="mobile-gamification-overlay__stat-label">{activeHolidaySeason ? `${activeHolidaySeason.meta.displayName} Calendar` : 'Treat Calendar'}</p>
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
      aria-label="Holiday calendar bonus unlock"
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
          aria-label="Close holiday calendar bonus"
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
          <p className="daily-treats-congrats__eyebrow">{activeHolidaySeason ? `${activeHolidaySeason.meta.displayName} Calendar` : 'Treat Calendar'}</p>
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
    <div className="daily-treats-modal" role="dialog" aria-modal="true" aria-label="Holiday calendar treats">
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
          aria-label="Close holiday calendar menu"
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
                  setReopenGameOverlayOnRewardClose(false);
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
                  setReopenGameOverlayOnRewardClose(false);
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
                  setReopenGameOverlayOnRewardClose(false);
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
                  setReopenGameOverlayOnRewardClose(false);
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
                  setReopenGameOverlayOnRewardClose(false);
                  setShowCalendarPlaceholder(true);
                }}
              >
                <span className="daily-treats-modal__card-image" aria-hidden="true">
                  <img src={dailyTreatsCalendarOpen} alt="" />
                </span>
                {dailyTreatsInventory.hatchesRemaining > 0 ? (
                  <span className="daily-treats-modal__card-indicator" aria-label="Today's treat ready" />
                ) : null}
              </button>
              <button
                type="button"
                className="daily-treats-modal__card-action"
                disabled={dailyTreatsInventory.hatchesRemaining === 0}
                onClick={() => {
                  setShowDailyTreatsMenu(false);
                  setReopenGameOverlayOnRewardClose(false);
                  setShowCalendarPlaceholder(true);
                }}
              >
                REVEAL
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
          title: 'Unclaimed holiday calendar',
          description: "Open the holiday calendar to reveal today's treat.",
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


  const handleRewardModalClose = (closeModal: () => void) => {
    closeModal();
    if (reopenGameOverlayOnRewardClose) {
      setShowGameBoardOverlay(true);
      setReopenGameOverlayOnRewardClose(false);
    }
  };

  const levelWorldsEntryModal = showLevelWorldsFromEntry && activeSession ? (
    <div
      className="level-worlds-entry-modal"
    >
      <RecoverableErrorBoundary
        fallback={null}
        onError={(error, errorInfo) => {
          logIslandRunEntryDebug('level_worlds_entry_boundary_error', {
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            reopenGameBoardOverlayOnLevelWorldsClose,
          });
          console.error('[LevelWorldsEntryModal] render failed; closing modal to keep app usable.', error);
          setShowLevelWorldsFromEntry(false);
          setLevelWorldsEntryPanel('default');
        }}
      >
        <LevelWorldsHub
          session={activeSession}
          initialPanel={levelWorldsEntryPanel}
          onClose={() => {
            setShowLevelWorldsFromEntry(false);
            setLevelWorldsEntryPanel('default');
            if (reopenGameBoardOverlayOnLevelWorldsClose) {
              setShowGameBoardOverlay(true);
              setReopenGameBoardOverlayOnLevelWorldsClose(false);
            }
          }}
        />
      </RecoverableErrorBoundary>
    </div>
  ) : null;

  const luckyRollModal = showLuckyRoll && activeSession ? (
    <LuckyRollBoard
      session={activeSession}
      onClose={() => handleRewardModalClose(() => setShowLuckyRoll(false))}
    />
  ) : null;

  const countdownCalendarModal = (
    <CountdownCalendarModal
      isOpen={showCalendarPlaceholder}
      onClose={() => handleRewardModalClose(() => {
        setShowCalendarPlaceholder(false);
        setHolidayPreviewKey(null);
      })}
      userId={activeSession?.user?.id}
      previewHolidayKey={holidayPreviewKey}
    />
  );

  const isIslandFullscreenActive = showGameBoardOverlay || showLevelWorldsFromEntry;
  const islandFullscreenClassName = isIslandFullscreenActive ? ' app--island-fullscreen' : '';

  if (isMobileExperience && showMobileHome) {
    const mobileHomeAppClassName = `app app--workspace app--mobile-frame app--mobile-home-frame${
      isAnyModalVisible ? ' app--auth-overlay' : ''
    }${islandFullscreenClassName}`;
    return (
      <div className={mobileHomeAppClassName}>
        <div className="workspace-shell">
          <MobileHabitHome
            session={activeSession}
            showPointsBadges={shouldShowPointsBadges}
            onVisionRewardOpenChange={setIsVisionRewardOpen}
            profileStrengthSnapshot={profileStrengthSnapshot}
            profileStrengthSignals={profileStrengthSignals}
            personalitySummary={personalitySummary}
            onOpenSpinWheel={() => setShowDailySpinWheel(true)}
            onOpenLuckyRoll={() => setShowLuckyRoll(true)}
            onOpenDailyTreat={() => setShowCalendarPlaceholder(true)}
            onOpenIslandRunStop={(stopId) => {
              setIslandRunOpenStopParam(stopId);
              setReopenGameBoardOverlayOnLevelWorldsClose(false);
              setLevelWorldsEntryPanel('default');
              setShowLevelWorldsFromEntry(true);
            }}
            forceCompactView={!isGameModeActive}
            preferredCompactView={!isGameModeActive}
            hideTimeBoundOffers={!isGameModeActive}
            hiddenHabitIds={[]}
          />
        </div>
        {!showZenGardenFullScreen && !isConflictResolverFullscreen && (
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
            isCollapsed={(isMobileFooterCollapsed || shouldHideFooterInJournal) && !showGameBoardOverlay}
            isSnapActive={isMobileFooterSnapActive}
            onExpand={() => {
              if (shouldHideFooterInJournal) return;
              handleMobileFooterExpand(false);
            }}
            onSnapExpand={() => {
              if (shouldHideFooterInJournal) return;
              handleMobileFooterExpand(true);
            }}
            onCollapse={handleMobileFooterCollapse}
            pointsBalance={goldBalance}
          />
        )}
        {mobileMenuOverlay}
        {mobileGamificationOverlay}
        {levelWorldsEntryModal}
        <GameBoardOverlay
          isOpen={showGameBoardOverlay}
          onClose={() => setShowGameBoardOverlay(false)}
          onPlayClick={() => {
            setShowGameBoardOverlay(false);
            setReopenGameBoardOverlayOnLevelWorldsClose(true);
            setLevelWorldsEntryPanel('default');
            setShowLevelWorldsFromEntry(true);
          }}
          onSpinWinClick={() => {
            setShowGameBoardOverlay(false);
            setReopenGameOverlayOnRewardClose(true);
            setShowDailySpinWheel(true);
          }}
          onLuckyRollClick={() => {
            setShowGameBoardOverlay(false);
            setReopenGameOverlayOnRewardClose(true);
            setShowLuckyRoll(true);
          }}
          onCreatureCollectionClick={() => {
            setShowGameBoardOverlay(false);
            setReopenGameBoardOverlayOnLevelWorldsClose(true);
            setLevelWorldsEntryPanel('sanctuary');
            setShowLevelWorldsFromEntry(true);
          }}
          onGarageClick={() => {
            setShowGameBoardOverlay(false);
            setReopenGameOverlayOnRewardClose(false);
            setScoreTabActiveTab('garage');
            setShowMobileHome(false);
            setActiveWorkspaceNav('score');
          }}
          profilePlaystyleIcon={playstyleIcon ?? undefined}
          profileAvatarUrl={profileAvatarUrl}
          profilePlaystyleLabel={playstyleLabel ?? undefined}
          essenceBalance={overlayEssenceBalance}
          rewardBarProgress={overlayRewardBarProgress}
          rewardBarThreshold={overlayRewardBarThreshold}
          activeTimedEventType={overlayActiveTimedEventType}
          activeTimedEventExpiresAtMs={overlayActiveTimedEventExpiresAtMs}
          islandNumber={overlayIslandNumber}
          islandDisplayName={overlayIslandDisplayName}
          spinsRemaining={dailyTreatsInventory.spinsRemaining}
          islandSceneSrc={currentIslandBackgroundSrc}
          islandTimeLabel={islandTimeLabelForOverlay}
          spinWinResetAtMs={spinWinResetAtMs}
          luckyRollResetAtMs={luckyRollStatus.monthlyWindowEndsAtMs ?? undefined}
          luckyRollRunsRemaining={luckyRollStatus.earnedRuns}
          luckyRollStatusLabel={luckyRollStatus.activeSource === 'earned' ? `${luckyRollStatus.earnedRuns} earned ${luckyRollStatus.earnedRuns === 1 ? 'run' : 'runs'}` : undefined}
          showSpinWheel={spinAvailable}
          showLuckyRoll={luckyRollStatus.available}
          creatureCollectionCount={creatureCollectionSummary.total}
          creatureRewardReadyCount={creatureCollectionSummary.rewardsReady}
        />
        {showAiCoachModal && (
          <AiCoach
            session={activeSession}
            starterQuestion={aiCoachStarterQuestion}
            onClose={() => {
              setShowAiCoachModal(false);
              setAiCoachStarterQuestion(undefined);
            }}
          />
        )}
        {showDailySpinWheel && (
          <NewDailySpinWheel session={activeSession} onClose={() => handleRewardModalClose(() => setShowDailySpinWheel(false))} />
        )}
        {quickGainsModal}
        {dailyTreatsCongratsModal}
        {dailyTreatsModal}
        {luckyRollModal}
        {countdownCalendarModal}
        {showMobileFeedbackModal ? (
          <CaseSubmissionModal
            session={activeSession}
            caseType="feedback"
            sourceSurface="mobile_menu_overlay"
            onClose={() => setShowMobileFeedbackModal(false)}
          />
        ) : null}
        {showMobileSupportModal ? (
          <CaseSubmissionModal
            session={activeSession}
            caseType="support"
            sourceSurface="mobile_menu_overlay"
            onClose={() => setShowMobileSupportModal(false)}
          />
        ) : null}
      </div>
    );
  }

  const isMobileFrameLocked = !isDesktopExperience;
  const appClassName = `app app--workspace${activeWorkspaceNav === 'insights' ? ' app--vision-board' : ''}${
    isAnyModalVisible ? ' app--auth-overlay' : ''
  }${isMobileFrameLocked ? ' app--mobile-frame' : ''}${isDesktopExperience ? ' app--desktop-preview' : ''}${
    isConflictResolverFullscreen ? ' app--conflict-resolver' : ''
  }${islandFullscreenClassName}`;
  const workspaceShellClassName = `workspace-shell ${
    isAnyModalVisible ? 'workspace-shell--blurred' : ''
  }${!isMobileExperience && !isDesktopMenuOpen ? ' workspace-shell--menu-collapsed' : ''}`;

  const canDismissOverlay = isAuthOverlayVisible && !shouldForceAuthOverlay;

  return (
    <div className={appClassName}>
      <div className={workspaceShellClassName}>
        {!isMobileExperience && !isDesktopMenuOpen && (
          <button
            type="button"
            className="workspace-shell__menu-edge"
            aria-label="Open workspace menu"
            onClick={() => setIsDesktopMenuOpen(true)}
          />
        )}
        {!isMobileExperience && (
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
      {isMobileExperience && !showZenGardenFullScreen && !isConflictResolverFullscreen ? (
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
          isCollapsed={(isMobileFooterCollapsed || shouldHideFooterInJournal) && !showGameBoardOverlay}
          isSnapActive={isMobileFooterSnapActive}
          onExpand={() => {
            if (shouldHideFooterInJournal) return;
            handleMobileFooterExpand(false);
          }}
          onSnapExpand={() => {
            if (shouldHideFooterInJournal) return;
            handleMobileFooterExpand(true);
          }}
          onCollapse={handleMobileFooterCollapse}
          pointsBalance={goldBalance}
        />
      ) : null}

      {mobileMenuOverlay}
      {mobileGamificationOverlay}
      {levelWorldsEntryModal}
      <HolidaySeasonDialog
        activeHoliday={activeHolidaySeason}
        isOpen={showHolidaySeasonDialog}
        isPreview={isHolidaySeasonDialogPreview}
        onClose={() => {
          setShowHolidaySeasonDialog(false);
          setIsHolidaySeasonDialogPreview(false);
        }}
        onOpenCalendar={() => {
          setShowHolidaySeasonDialog(false);
          setHolidayPreviewKey(isHolidaySeasonDialogPreview ? activeHolidaySeason?.meta.holiday_key ?? null : null);
          setIsHolidaySeasonDialogPreview(false);
          setShowCalendarPlaceholder(true);
        }}
      />

      {/* Game Board Overlay */}
      <GameBoardOverlay
        isOpen={showGameBoardOverlay}
        onClose={() => setShowGameBoardOverlay(false)}
        onPlayClick={() => {
          setShowGameBoardOverlay(false);
          setReopenGameBoardOverlayOnLevelWorldsClose(true);
          setLevelWorldsEntryPanel('default');
          setShowLevelWorldsFromEntry(true);
        }}
        onSpinWinClick={() => {
          setShowGameBoardOverlay(false);
          setReopenGameOverlayOnRewardClose(true);
          setShowDailySpinWheel(true);
        }}
        onLuckyRollClick={() => {
          setShowGameBoardOverlay(false);
          setReopenGameOverlayOnRewardClose(true);
          setShowLuckyRoll(true);
        }}
        onCreatureCollectionClick={() => {
          setShowGameBoardOverlay(false);
          setReopenGameBoardOverlayOnLevelWorldsClose(true);
          setLevelWorldsEntryPanel('sanctuary');
          setShowLevelWorldsFromEntry(true);
        }}
        onGarageClick={() => {
          setShowGameBoardOverlay(false);
          setScoreTabActiveTab('garage');
          setActiveWorkspaceNav('score');
        }}
        profilePlaystyleIcon={playstyleIcon ?? undefined}
        profileAvatarUrl={profileAvatarUrl}
        profilePlaystyleLabel={playstyleLabel ?? undefined}
        essenceBalance={overlayEssenceBalance}
        rewardBarProgress={overlayRewardBarProgress}
        rewardBarThreshold={overlayRewardBarThreshold}
        activeTimedEventType={overlayActiveTimedEventType}
        activeTimedEventExpiresAtMs={overlayActiveTimedEventExpiresAtMs}
        islandNumber={overlayIslandNumber}
        islandDisplayName={overlayIslandDisplayName}
        spinsRemaining={dailyTreatsInventory.spinsRemaining}
        islandSceneSrc={currentIslandBackgroundSrc}
        islandTimeLabel={islandTimeLabelForOverlay}
        spinWinResetAtMs={spinWinResetAtMs}
        luckyRollResetAtMs={luckyRollStatus.monthlyWindowEndsAtMs ?? undefined}
        luckyRollRunsRemaining={luckyRollStatus.earnedRuns}
        luckyRollStatusLabel={luckyRollStatus.activeSource === 'earned' ? `${luckyRollStatus.earnedRuns} earned ${luckyRollStatus.earnedRuns === 1 ? 'run' : 'runs'}` : undefined}
        showSpinWheel={spinAvailable}
        showLuckyRoll={luckyRollStatus.available}
        creatureCollectionCount={creatureCollectionSummary.total}
        creatureRewardReadyCount={creatureCollectionSummary.rewardsReady}
      />

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
        <AiCoach
          session={activeSession}
          starterQuestion={aiCoachStarterQuestion}
          onClose={() => {
            setShowAiCoachModal(false);
            setAiCoachStarterQuestion(undefined);
          }}
        />
      )}
      {showDailySpinWheel && (
        <NewDailySpinWheel session={activeSession} onClose={() => handleRewardModalClose(() => setShowDailySpinWheel(false))} />
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

      {showMobileFeedbackModal ? (
        <CaseSubmissionModal
          session={activeSession}
          caseType="feedback"
          sourceSurface="mobile_menu_overlay"
          onClose={() => setShowMobileFeedbackModal(false)}
        />
      ) : null}

      {showMobileSupportModal ? (
        <CaseSubmissionModal
          session={activeSession}
          caseType="support"
          sourceSurface="mobile_menu_overlay"
          onClose={() => setShowMobileSupportModal(false)}
        />
      ) : null}

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
      <OfflineSyncDevPanel userId={activeSession?.user?.id ?? null} />
    </div>
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};
