import {
  type CSSProperties,
  FormEvent,
  PointerEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { lockFullscreenPageScroll } from './utils/scrollLock';
import bioDayChartIcon from './assets/theme-icons/bio-day-chart.svg';
import bioDayCheckIcon from './assets/theme-icons/bio-day-check.svg';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from './features/auth/SupabaseAuthProvider';
import { createDemoSession, isDemoSession } from './services/demoSession';
import { GoalWorkspace, LifeGoalsSection, MyQuestHub } from './features/goals';
import { BodyHaircutWidget, DailyHabitTracker, HabitsModule, MobileHabitHome, StarterHabitPicker } from './features/habits';
import type { TimeBoundOfferId } from './features/habits/TimeBoundOfferRow';
import { ProgressDashboard } from './features/dashboard';
import { VisionBoard } from './features/vision-board';
import type { LifeWheelCategoryKey } from './features/checkins/LifeWheelCheckins';
import { LifeWheelCheckins } from './features/checkins';
import { QuestCompassModal } from './features/quest-compass';
import { CompassBookScreen } from './features/compass-book/components/CompassBookScreen';
import { NotificationPreferences } from './features/notifications';
import { MyAccountPanel } from './features/account/MyAccountPanel';
import { PlayerAvatarPanel } from './features/avatar/PlayerAvatarPanel';
import { WorkspaceSetupDialog } from './features/account/WorkspaceSetupDialog';
import { AiCoach } from './features/ai-coach';
import { TipOfDayModal } from './features/tip-of-day';
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
import { ThemeToggle } from './components/ThemeToggle';
import { MobileFooterNav } from './components/MobileFooterNav';
import { MobileTopChrome } from './components/MobileTopChrome';
import { SyncIndicator } from './components/service-status';
import { LoadingReadinessScreen, type LoadingReadinessStep } from './components/LoadingReadinessScreen';
import { GameBoardOverlay } from './components/GameBoardOverlay';
import { buildJourneyLevelInputFromOverlay } from './features/gamification/level-worlds/services/dualTrackOverlayAdapter';
import { useCombinedJourneyChest } from './features/gamification/level-worlds/hooks/useCombinedJourneyChest';
import {
  deriveCombinedJourneyLevel,
  cumulativeXpForLevel,
} from './features/gamification/level-worlds/services/combinedJourneyLevel';
import {
  buildRankProgressView,
  computePendingPromotion,
  loadAcknowledgedRankId,
  saveAcknowledgedRankId,
  getRankById,
  MIN_RANK,
  RankIdentityHeader,
  RankJourneyModal,
  RankPromotionCelebration,
} from './features/rank';
import { tierFromIsPro, type MembershipTier } from './features/membership';
import { fetchBillingSnapshot } from './services/billing';
import { HabitGameAuthCard, HabitGameLandingShell, type HabitGameAuthTab } from './components/HabitGameLandingShell';
import { HolidaySeasonDialog } from './components/HolidaySeasonDialog';
import { FeaturePreviewOverlay } from './components/FeaturePreviewOverlay';
import { FeatureStatusBadge } from './components/FeatureStatusBadge';
import { QuickActionsFAB } from './components/QuickActionsFAB';
import { XPToast } from './components/XPToast';
import { scheduleRapidFireworksPreload } from './components/CelebrationFireworks';
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
import { LevelWorldsHub } from './features/gamification/level-worlds/LevelWorldsHub';
import { getIslandBackgroundImageSrc } from './features/gamification/level-worlds/services/islandBackgrounds';
import { fetchHolidayPreferences } from './services/holidayPreferences';
import { fetchSoundEffectsEnabled, updateSoundEffectsEnabled } from './services/soundPreferences';
import {
  playLauncherCloseSound,
  setSoundEffectsEnabled as setGlobalSoundEffectsEnabled,
} from './utils/audioUtils';
import { buildPreviewAdventMeta, fetchCurrentSeason, getActiveAdventMeta, getHatchesForDay, getPersonalQuestSeason, type ActiveAdventMetaResult, type HolidayKey } from './services/treatCalendarService';
import { HOLIDAY_PREVIEW_LAUNCH_EVENT, type HolidayPreviewLaunchDetail } from './services/holidayPreviewEvents';
import {
  isIslandRunEntryDebugEnabled,
  logIslandRunEntryDebug,
} from './features/gamification/level-worlds/services/islandRunEntryDebug';
import { patchIslandRunGuestFunnelState, readIslandRunGuestFunnelState } from './features/gamification/level-worlds/services/islandRunGuestFunnelState';
import { claimAnonymousIslandRunGuestInPlace } from './features/gamification/level-worlds/services/islandRunGuestClaimService';
import { SPIN_PRIZES } from './types/gamification';
import { splitGoldBalance } from './constants/economy';
import { getTopDisplayClass } from './utils/topDisplayClass';
import {
  fetchWorkspaceProfile,
  upsertWorkspaceProfile,
  type WorkspaceProfileRow,
} from './services/workspaceProfile';
import { fetchWorkspaceStats, type WorkspaceStats } from './services/workspaceStats';
import { getSupabaseClient } from './lib/supabaseClient';
import { isValidUuid } from './lib/isValidUuid';
import { useContinuousSave } from './hooks/useContinuousSave';
import { isStandaloneMode } from './routes/detectStandalone';
import { useDailySpinStatus } from './hooks/useDailySpinStatus';
import { getFutureFeatureCardClassName, useFutureFeatureCardStates } from './hooks/useFutureFeatureCardStates';
import { isIslandRunFeatureEnabled } from './config/islandRunFeatureFlags';
import { generateInitials } from './utils/initials';
import {
  getDreamJournalReminderEnabled,
  getDreamJournalReminderLastShownCycle,
  getDreamJournalReminderWindow,
  getDreamReminderCycleKey,
  isHourInDreamReminderWindow,
  setDreamJournalReminderLastShownCycle,
} from './services/dreamJournalReminderPrefs';
import {
  getTodaysWinsReminderCycleKey,
  getTodaysWinsReminderEnabled,
  getTodaysWinsReminderLastShownCycle,
  getTodaysWinsReminderWindow,
  isTimeInTodaysWinsReminderWindow,
  setTodaysWinsReminderLastShownCycle,
} from './services/todaysWinsReminderPrefs';
import { DayZeroOnboarding } from './features/onboarding/DayZeroOnboarding';
import { LeapProgress } from './features/leap-progress/LeapProgress';
import { FounderWelcome } from './features/onboarding/FounderWelcome';
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
import { buildHand, handToArray, type ArchetypeHand, type HandCard } from './features/identity/archetypes/archetypeHandBuilder';
import { ARCHETYPE_DECK, SUIT_LABELS } from './features/identity/archetypes/archetypeDeck';
import { useMicroTestBadge } from './features/identity/microTests/useMicroTestBadge';
import { useMicroTestPlayerState } from './features/identity/microTests/useMicroTestPlayerState';
import type { PlayerState } from './features/identity/microTests/microTestTriggers';
import { isPlayersHandSparkResultEnabled } from './features/players_hand/playersHandFeatureFlags';
import { PlayersHandSparkPreview } from './features/players_hand/spark-preview';
import {
  EXPERIMENTAL_FEATURES_UPDATED_EVENT,
  getExperimentalFeatures,
} from './services/experimentalFeatures';
import { ConflictResolverEntry } from './features/conflict-resolver/ConflictResolverEntry';
import { PeaceBetweenShell } from './surfaces/peacebetween/PeaceBetweenShell';
import { PeaceBetweenLanding } from './surfaces/peacebetween/PeaceBetweenLanding';
import { isConflictRoute, resolveSurface } from './surfaces/surfaceContext';
import { getFeatureAvailability, type FeatureAvailabilityId } from './config/featureAvailability';
import { resolveFeatureAccess } from './services/featureAccess';
import { isAdminUser } from './services/adminRoles';
import { loadGoalsOfflineFirst } from './data/goalsRepo';
import { listHabitsV2 } from './services/habitsV2';
import type { DualTrackRealLifeInput } from './features/gamification/level-worlds/services/dualTrackOverlayAdapter';
import './styles/workspace.css';
import './styles/settings-folders.css';
import './styles/gamification.css';
import './features/ai-coach/AiCoach.css';

type AuthMode = 'password' | 'signup';

type AuthTab = HabitGameAuthTab;

function isRenderableHandCard(handCard: HandCard | null | undefined): handCard is HandCard {
  return Boolean(handCard?.role && handCard.card?.id && handCard.card.name && handCard.card.icon);
}

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
  badgeLabel?: string;
};

type LauncherSubmenuAction = {
  id: string;
  label: string;
  icon: string;
  featureId?: FeatureAvailabilityId;
  onSelect: () => void;
};

type MobileNavSelectOptions = {
  preserveBreatheTab?: boolean;
  checkinsOrigin?: 'my-quest' | 'direct';
  launchSource?: 'mobile-menu';
};

type BillingReturnBanner = {
  kind: 'processing' | 'success' | 'canceled';
  message: string;
} | null;

// --- Footer nav icon system ---
//
// Icon resolution order (first file that actually loads wins):
//   1. holiday + app-theme  e.g. halloween/themes/dark/planning.webp
//   2. holiday only         e.g. halloween/planning.webp
//   3. app-theme only       e.g. themes/dark/planning.webp
//   4. default              e.g. default/planning.webp
//   5. hardcoded emoji/SVG fallback
//
// Fallback is per-file and happens at RUNTIME: footerIconCandidates() builds the
// ordered URL list above and <FooterNavImg> requests each in turn, advancing on
// any load error (404). So an empty/partial folder (only a _README.txt, or just
// some of the four icons) no longer shadows /default with a broken image — a
// missing file transparently falls through to the next layer, then the emoji.
//
// To add icons: drop .webp files into public/icons/footer/<folder>/ using
// the exact filenames below. Nothing else to change. Each file is optional.
//
// Tab filenames:  planning.webp | shield.webp | score.webp | actions.webp
//
// App-theme → icon-folder mapping (FOOTER_THEME_GROUP):
//   light  → bio-day, flow-day, bright-sky, cherry-blossom, forest-green,
//             ocean-breeze, lavender-dream, desert-sand, sproutling-grove,
//             aurora-sky
//   dark   → dark-glass, flow-night, bio-night, midnight-purple,
//             dreamt-horizon, nebula-drift, starhorn-celestial
//   golden → sunset-glow, autumn-harvest, ember-glow, birthday-wish
//   blue   → arctic-frost

type FooterIconGroup = 'light' | 'dark' | 'golden' | 'blue';

const FOOTER_THEME_GROUP: Partial<Record<string, FooterIconGroup>> = {
  'bio-day':            'light',
  'flow-day':           'light',
  'bright-sky':         'light',
  'cherry-blossom':     'light',
  'forest-green':       'light',
  'ocean-breeze':       'light',
  'lavender-dream':     'light',
  'desert-sand':        'light',
  'sproutling-grove':   'light',
  'aurora-sky':         'light',
  'dark-glass':         'dark',
  'flow-night':         'dark',
  'bio-night':          'dark',
  'midnight-purple':    'dark',
  'dreamt-horizon':     'dark',
  'nebula-drift':       'dark',
  'starhorn-celestial': 'dark',
  'sunset-glow':        'golden',
  'autumn-harvest':     'golden',
  'ember-glow':         'golden',
  'birthday-wish':      'golden',
  'arctic-frost':       'blue',
};

const FOOTER_ICON_BASE = '/icons/footer';

type FooterTabId = 'planning' | 'breathing-space' | 'score' | 'actions';

const FOOTER_TAB_FILES: Record<FooterTabId, string> = {
  planning: 'planning.webp',
  'breathing-space': 'shield.webp',
  score: 'score.webp',
  actions: 'actions.webp',
};

// Ordered candidate icon URLs for a tab, most-specific first. A candidate whose
// file is absent (e.g. a theme/holiday folder that doesn't ship this icon)
// simply 404s and is skipped at runtime by <FooterNavImg>, which walks the
// chain down to /default and finally the emoji/SVG fallback. This is what makes
// each layer's files genuinely optional — the presence of a folder no longer
// shadows /default with a broken image.
function footerIconCandidates(
  tabId: FooterTabId,
  holidayKey: string | null | undefined,
  themeGroup: FooterIconGroup | undefined,
): string[] {
  const file = FOOTER_TAB_FILES[tabId];
  const bases: string[] = [];
  if (holidayKey && themeGroup) bases.push(`${FOOTER_ICON_BASE}/${holidayKey}/themes/${themeGroup}`);
  if (holidayKey) bases.push(`${FOOTER_ICON_BASE}/${holidayKey}`);
  if (themeGroup) bases.push(`${FOOTER_ICON_BASE}/themes/${themeGroup}`);
  bases.push(`${FOOTER_ICON_BASE}/default`);
  return bases.map((base) => `${base}/${file}`);
}

// Renders the first candidate icon that successfully loads, advancing through
// the most-specific → default chain on each load error, then rendering the
// supplied emoji/SVG node once no webp is available. The caller passes a
// `key` derived from `srcs` so a theme/holiday change remounts this and retries
// the new candidate list from the top.
const FooterNavImg = ({
  srcs,
  fallback,
  alt = '',
}: {
  srcs: string[];
  fallback: ReactNode;
  alt?: string;
}) => {
  const [attempt, setAttempt] = useState(0);
  if (attempt >= srcs.length) return <>{fallback}</>;
  return (
    <img
      src={srcs[attempt]}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setAttempt((n) => n + 1)}
    />
  );
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
const DAILY_TREATS_AUTO_OPEN_DATE_KEY = 'lifegoal_daily_treats_auto_open_date';
const TIP_OF_DAY_AUTO_OPEN_DATE_KEY = 'lifegoal_tip_of_day_auto_open_date';
const HABITS_CREATED_EVENT = 'habitgame:habits-created';

function getDailyTreatsAutoOpenDateKey(now = new Date()): string {
  return now.toDateString();
}

function isDailyTreatAutoOpenDueForUser(userId: string | null | undefined): boolean {
  if (typeof window === 'undefined' || !userId) return false;
  return window.localStorage.getItem(DAILY_TREATS_AUTO_OPEN_DATE_KEY) !== getDailyTreatsAutoOpenDateKey();
}

function isTipOfDayAutoOpenDueForUser(userId: string | null | undefined): boolean {
  if (typeof window === 'undefined' || !userId) return false;
  return window.localStorage.getItem(TIP_OF_DAY_AUTO_OPEN_DATE_KEY) !== getDailyTreatsAutoOpenDateKey();
}

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


const DEFAULT_WORKSPACE_NAV_ID = 'goals';
const APP_WORKSPACE_FEATURE_IDS: Partial<Record<string, FeatureAvailabilityId>> = {
  body: 'app.body',
  contracts: 'app.contracts',
  routines: 'app.routines',
};

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
    id: 'contracts',
    label: 'Promises',
    summary: 'Create and track commitment promises.',
    icon: '🤝',
    shortLabel: 'PROMISES',
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
    label: 'Goals',
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

const MOBILE_FOOTER_AUTO_COLLAPSE_IDS = new Set(['identity', 'account', 'projects', 'timer', 'journal', 'contracts']);
const MOBILE_FOOTER_AUTO_COLLAPSE_DELAY_MS = 3800;
const MOBILE_FOOTER_SNAP_RESET_MS = 160;

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
    initializationStatus,
    isConfigured,
    isAuthenticated,
    mode,
    client,
    retryAuthInitialization,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    signOut,
  } = useSupabaseAuth();
  const { theme } = useTheme();
  const [localGuestSession, setLocalGuestSession] = useState<Session | null>(null);

  useEffect(() => scheduleRapidFireworksPreload(), []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('password');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authMessageVisible, setAuthMessageVisible] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeAuthTab, setActiveAuthTab] = useState<AuthTab>('login');
  const [isAuthGateOnline, setIsAuthGateOnline] = useState(() => (
    typeof navigator === 'undefined' ? true : navigator.onLine
  ));
  const [manualProfileSaving, setManualProfileSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [activeWorkspaceNav, setActiveWorkspaceNav] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_WORKSPACE_NAV_ID;
    const host = window.location.hostname.toLowerCase();
    if (host === 'peacebetween.com' || host === 'www.peacebetween.com') {
      return 'breathing-space';
    }
    return DEFAULT_WORKSPACE_NAV_ID;
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
  const wasMobileMenuOpenRef = useRef(false);
  const [shouldShowSettingsMenuReturn, setShouldShowSettingsMenuReturn] = useState(false);
  const settingsMenuReturnNavRef = useRef(DEFAULT_WORKSPACE_NAV_ID);
  const [isMobileProfileDialogOpen, setIsMobileProfileDialogOpen] = useState(false);
  const [isLauncherHandOverlayOpen, setIsLauncherHandOverlayOpen] = useState(false);
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
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [soundEffectsEnabled, setSoundEffectsEnabledState] = useState(true);
  const [soundPreferenceSaving, setSoundPreferenceSaving] = useState(false);
  const [soundPreferenceError, setSoundPreferenceError] = useState<string | null>(null);
  const [appPreviewFeature, setAppPreviewFeature] = useState<{
    id: FeatureAvailabilityId;
    label: string;
    variant?: 'preview' | 'notImplemented';
  } | null>(null);
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
  const [showTipOfDay, setShowTipOfDay] = useState(false);
  const [journalLaunchRequest, setJournalLaunchRequest] = useState<{ type: JournalType; openComposer?: boolean; requestId: number } | null>(null);
  const [showDailySpinWheel, setShowDailySpinWheel] = useState(false);
  const [showQuickGainsMenu, setShowQuickGainsMenu] = useState(false);
  const [quickGainsHabitText, setQuickGainsHabitText] = useState('');
  const [showLevelWorldsFromEntry, setShowLevelWorldsFromEntry] = useState(false);
  const [levelWorldsEntryPanel, setLevelWorldsEntryPanel] = useState<'default' | 'sanctuary'>('default');
  const [reopenGameBoardOverlayOnLevelWorldsClose, setReopenGameBoardOverlayOnLevelWorldsClose] = useState(false);
  const [pendingGuestIslandRunEntry, setPendingGuestIslandRunEntry] = useState(false);
  const [shouldAutoOpenIslandRun, setShouldAutoOpenIslandRun] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return (
      window.location.pathname === '/' &&
      params.get('openIslandRun') === '1' &&
      params.get('openIslandRunSource') === 'level-worlds'
    );
  });
  const [showCalendarPlaceholder, setShowCalendarPlaceholder] = useState(false);
  const [isDayChangeDailyTreatSequenceActive, setIsDayChangeDailyTreatSequenceActive] = useState(false);
  const [calendarLaunchMode, setCalendarLaunchMode] = useState<'auto' | 'holiday' | 'personal_quest'>('auto');
  const [pendingTodayOfferOpen, setPendingTodayOfferOpen] = useState<TimeBoundOfferId | null>(null);
  const [activeHolidaySeason, setActiveHolidaySeason] = useState<ActiveAdventMetaResult | null>(null);
  const [showHolidaySeasonDialog, setShowHolidaySeasonDialog] = useState(false);
  const [holidayPreviewKey, setHolidayPreviewKey] = useState<HolidayKey | null>(null);
  const [isHolidaySeasonDialogPreview, setIsHolidaySeasonDialogPreview] = useState(false);
  const [reopenGameOverlayOnRewardClose, setReopenGameOverlayOnRewardClose] = useState(false);
  const [hasSeenDailyTreats, setHasSeenDailyTreats] = useState(false);
  const [hasOpenedDailyTreatsToday, setHasOpenedDailyTreatsToday] = useState(false);
  const [hasOpenedDailyTreatBonusToday, setHasOpenedDailyTreatBonusToday] = useState(false);
  const [hasDailyTreatBonusDoorToday, setHasDailyTreatBonusDoorToday] = useState(false);
  const [hasOpenedHolidayCalendarToday, setHasOpenedHolidayCalendarToday] = useState(false);
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
  const [isStarterQuestSheetOpen, setIsStarterQuestSheetOpen] = useState(false);
  const [isContractWizardOpen, setIsContractWizardOpen] = useState(false);
  const [starterQuestSheetOrigin, setStarterQuestSheetOrigin] = useState<'my-quest' | 'today' | null>(null);
  const [starterQuestInitialDomainKey, setStarterQuestInitialDomainKey] = useState<LifeWheelCategoryKey | null>(null);
  const [checkinsEntryOrigin, setCheckinsEntryOrigin] = useState<'my-quest' | 'direct'>('direct');
  const [isQuestCompassModalOpen, setIsQuestCompassModalOpen] = useState(false);
  const [isCompassBookOpen, setIsCompassBookOpen] = useState(false);
  const [isFeedbackSupportSubmenuOpen, setIsFeedbackSupportSubmenuOpen] = useState(false);
  const [activeProfileStrengthHold, setActiveProfileStrengthHold] = useState<{
    area: AreaKey;
    task: NextTask | null;
  } | null>(null);
  const [activeMobileMenuHelper, setActiveMobileMenuHelper] = useState<MobileMenuNavItem | null>(null);
  const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(true);
  const [isDesktopMenuPinned, setIsDesktopMenuPinned] = useState(false);
  const [showLeapProgress, setShowLeapProgress] = useState(false);
  const [showDayZeroOnboarding, setShowDayZeroOnboarding] = useState(false);
  // First-run start flow: founder welcome → spotlight the Game button →
  // spotlight PLAY → hand off to the in-game welcome pack / how-to-play.
  const [firstRunStep, setFirstRunStep] = useState<
    'welcome' | 'spotlight-game' | 'spotlight-play' | null
  >(null);
  const firstRunInitializedUserRef = useRef<string | null>(null);
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

  const openPersonalQuestDailyTreatsCalendar = useCallback(() => {
    setHolidayPreviewKey(null);
    setCalendarLaunchMode('personal_quest');
    setShowCalendarPlaceholder(true);
  }, []);

  const launchDailyTreatsMenu = useCallback(() => {
    markDailyTreatsSeen();
    openPersonalQuestDailyTreatsCalendar();
  }, [markDailyTreatsSeen, openPersonalQuestDailyTreatsCalendar]);

  const isDailyTreatAutoOpenDue = isDailyTreatAutoOpenDueForUser(supabaseSession?.user?.id);
  const shouldDeferDailyLifeUpgradeModal = true;
  const shouldDeferYesterdayTodoCleanupModal = showCalendarPlaceholder || isDailyTreatAutoOpenDue || isDayChangeDailyTreatSequenceActive;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!supabaseSession?.user?.id) return;

    const todayKey = getDailyTreatsAutoOpenDateKey();
    if (!isDailyTreatAutoOpenDue) return;

    setIsDayChangeDailyTreatSequenceActive(true);
    launchDailyTreatsMenu();
    window.localStorage.setItem(DAILY_TREATS_AUTO_OPEN_DATE_KEY, todayKey);
  }, [isDailyTreatAutoOpenDue, launchDailyTreatsMenu, supabaseSession?.user?.id]);

  // Once-a-day "Tip of the Day — AI Coach". Opens after the daily-treats sequence
  // so the two never stack: only when treats aren't due and the day-change
  // sequence isn't active. Gated to once per day via localStorage (mirrors treats).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!supabaseSession?.user?.id) return;
    if (isDailyTreatAutoOpenDue || isDayChangeDailyTreatSequenceActive) return;
    if (!isTipOfDayAutoOpenDueForUser(supabaseSession.user.id)) return;

    window.localStorage.setItem(TIP_OF_DAY_AUTO_OPEN_DATE_KEY, getDailyTreatsAutoOpenDateKey());
    setShowTipOfDay(true);
  }, [isDailyTreatAutoOpenDue, isDayChangeDailyTreatSequenceActive, supabaseSession?.user?.id]);

  const launchHolidayCalendar = useCallback(() => {
    setHolidayPreviewKey(null);
    setCalendarLaunchMode('holiday');
    setShowCalendarPlaceholder(true);
  }, []);

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

  const [hasCompletedInitialAppReadiness, setHasCompletedInitialAppReadiness] = useState(false);
  const isCheckingSession = initializing && initializationStatus === 'loading' && isAuthGateOnline;
  const isAuthenticatedStartupSyncing = Boolean(supabaseSession?.user?.id) && (workspaceProfileLoading || gamificationLoading);
  const shouldShowAppReadinessScreen = !hasCompletedInitialAppReadiness && (isCheckingSession || isAuthenticatedStartupSyncing);
  const appReadinessProgress = isCheckingSession
    ? 34
    : workspaceProfileLoading && gamificationLoading
      ? 72
      : workspaceProfileLoading || gamificationLoading
        ? 86
        : 100;
  const appReadinessSteps = useMemo<LoadingReadinessStep[]>(() => [
    {
      label: 'Checking your session',
      status: isCheckingSession ? 'active' : 'complete',
    },
    {
      label: 'Loading your profile',
      status: isCheckingSession ? 'pending' : workspaceProfileLoading ? 'active' : 'complete',
    },
    {
      label: 'Syncing game progress',
      status: isCheckingSession ? 'pending' : gamificationLoading ? 'active' : 'complete',
    },
    {
      label: 'Preparing today’s dashboard',
      status: shouldShowAppReadinessScreen ? 'pending' : 'complete',
    },
  ], [gamificationLoading, isCheckingSession, shouldShowAppReadinessScreen, workspaceProfileLoading]);

  useEffect(() => {
    if (hasCompletedInitialAppReadiness) return;
    if (isCheckingSession || isAuthenticatedStartupSyncing) return;

    const readyTimer = window.setTimeout(() => {
      setHasCompletedInitialAppReadiness(true);
    }, 300);

    return () => window.clearTimeout(readyTimer);
  }, [hasCompletedInitialAppReadiness, isAuthenticatedStartupSyncing, isCheckingSession]);

  useEffect(() => {
    setHasCompletedInitialAppReadiness(false);
  }, [supabaseSession?.user?.id]);

  const goldBalance = gamificationProfile?.total_points ?? 0;
  const goldBreakdown = splitGoldBalance(goldBalance);
  const { spinAvailable, spinsAvailable } = useDailySpinStatus(supabaseSession?.user?.id);
  // The legacy-named placement flag keeps Daily Momentum out of the old game
  // overlay. Its canonical launcher now lives in the Island Run quick-action
  // column beside the hatchery and sticker album.
  // Treasure Path remains Island Run-owned and is intentionally not exposed
  // as a standalone game overlay entry.
  const overlayShowSpinWheel =
    spinAvailable && !isIslandRunFeatureEnabled('todaysOfferSpinEntryEnabled');
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

  // Read-only Real Life Journey summary for the dual-track overlay.
  // Loaded only when the overlay opens and the user is authenticated; failures
  // fall back to placeholders and never block PLAY.
  const [overlayRealLifeInput, setOverlayRealLifeInput] = useState<DualTrackRealLifeInput | undefined>(undefined);
  const overlayRealLifeUserId = supabaseSession?.user?.id ?? null;

  // Shared Combined Journey Level inputs (chest claim + player-menu rank header).
  const journeyLevelInput = buildJourneyLevelInputFromOverlay({
    islandNumber: overlayIslandNumber,
    rewardBarProgress: overlayRewardBarProgress,
    rewardBarThreshold: overlayRewardBarThreshold,
    realLife: overlayRealLifeInput,
  });

  // Combined Journey Level chest claim (R5). Flag-gated; no-op while off.
  const combinedJourneyChest = useCombinedJourneyChest({
    session: supabaseSession,
    isOpen: showGameBoardOverlay,
    milestoneInputs: journeyLevelInput,
  });
  const combinedJourneyChestProps = {
    journeyChest: combinedJourneyChest.chest,
    journeyChestPending: combinedJourneyChest.pending,
    journeyChestFeedback: combinedJourneyChest.feedback,
    onClaimJourneyChest: combinedJourneyChest.claim,
  };

  // Player-menu rank header: derive the canonical Combined Journey Level and the
  // rank-band XP progress used by the identity header + rank journey modal.
  const menuJourneySummary = deriveCombinedJourneyLevel(journeyLevelInput);
  const menuRankProgress = buildRankProgressView({
    level: menuJourneySummary.level,
    xp: menuJourneySummary.xp,
    cumulativeXpForLevel,
  });
  const [isRankJourneyOpen, setIsRankJourneyOpen] = useState(false);

  // Membership tier for the player-menu pill (single current tier). Derived from
  // the canonical Pro entitlement; defaults to free without a session.
  const [menuMembershipTier, setMenuMembershipTier] = useState<MembershipTier>('free');
  useEffect(() => {
    const userId = supabaseSession?.user?.id;
    if (!userId) {
      setMenuMembershipTier('free');
      return;
    }
    let cancelled = false;
    void fetchBillingSnapshot(userId).then(({ data }) => {
      if (cancelled) return;
      setMenuMembershipTier(tierFromIsPro(Boolean(data?.entitlement?.is_pro)));
    });
    return () => {
      cancelled = true;
    };
  }, [supabaseSession?.user?.id]);

  // Rank promotion: surfaced at the safe moment the player opens their menu.
  // Acknowledgement is persisted (v1: localStorage) so each promotion shows once.
  const [acknowledgedRankId, setAcknowledgedRankId] = useState<number>(MIN_RANK.id);
  useEffect(() => {
    setAcknowledgedRankId(loadAcknowledgedRankId(supabaseSession?.user?.id ?? null));
  }, [supabaseSession?.user?.id, isMobileMenuOpen]);
  const menuCurrentRankId = menuRankProgress.current.id;
  const pendingPromotion = computePendingPromotion(acknowledgedRankId, menuCurrentRankId);
  const acknowledgePromotion = () => {
    if (!pendingPromotion) return;
    saveAcknowledgedRankId(supabaseSession?.user?.id ?? null, pendingPromotion.toRankId);
    setAcknowledgedRankId(pendingPromotion.toRankId);
  };
  // Rank node shown on the Game Progress dual-track spine (opens the rank
  // journey modal; pulses while a promotion is unacknowledged).
  const rankSpineProps = {
    currentRank: menuRankProgress.current,
    rankProgress: menuRankProgress,
    rankLevel: menuJourneySummary.level,
    rankHasPendingPromotion: pendingPromotion !== null,
  };

  useEffect(() => {
    if (!showGameBoardOverlay || !overlayRealLifeUserId) return;
    let cancelled = false;

    void (async () => {
      try {
        const [goals, habitsResult] = await Promise.all([
          loadGoalsOfflineFirst(overlayRealLifeUserId).catch(() => []),
          listHabitsV2().catch(() => ({ data: [], error: null as unknown })),
        ]);
        if (cancelled) return;

        const goalSummaries = (goals ?? [])
          .filter((goal) => goal && !goal._deleted)
          .map((goal) => ({ id: goal.id, title: goal.title, status: goal.status ?? null }));
        const habitSummaries = (habitsResult?.data ?? [])
          .map((habit) => ({ id: habit.id, title: habit.title, emoji: habit.emoji ?? null }));

        setOverlayRealLifeInput({
          isAuthenticated: true,
          goals: goalSummaries,
          habits: habitSummaries,
        });
      } catch {
        if (!cancelled) {
          setOverlayRealLifeInput({ isAuthenticated: true, goals: [], habits: [] });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showGameBoardOverlay, overlayRealLifeUserId]);
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
  const isFooterControllerLayoutActive = isMobileMenuImageActive && showGameBoardOverlay;
  const shouldShowPointsBadges = isGameModeActive && isMobileExperience;
  
  // Micro-test badge state for identity tab — real foundation/completion state.
  const microTestUserId = isValidUuid(supabaseSession?.user?.id) ? supabaseSession.user.id : null;
  const microTestPlayerState: PlayerState = useMicroTestPlayerState(
    microTestUserId,
    currentLevel,
    streakMomentum,
  );

  const microTestBadge = useMicroTestBadge(microTestPlayerState);
  const [hasSeenMicroTestBadge, setHasSeenMicroTestBadge] = useState(false);
  const previousMicroTestBadgeRef = useRef({ count: 0, showBadge: false });

  useEffect(() => {
    const previousBadge = previousMicroTestBadgeRef.current;
    if (
      microTestBadge.showBadge &&
      (!previousBadge.showBadge || microTestBadge.count > previousBadge.count)
    ) {
      setHasSeenMicroTestBadge(false);
    }

    previousMicroTestBadgeRef.current = {
      count: microTestBadge.count,
      showBadge: microTestBadge.showBadge,
    };
  }, [microTestBadge.showBadge, microTestBadge.count]);

  const showMicroTestNotificationDot = microTestBadge.showBadge && !hasSeenMicroTestBadge;
  

  const mobileMenuPointsBadges = useMemo(() => {
    const badges: Record<string, string> = {};
    if (goldBalance > 0) {
      badges.score = goldBalance.toLocaleString();
    }
    return badges;
  }, [goldBalance]);
  const spinGoldRange = useMemo(() => {
    // With the new economy-aligned prize pool, gold-type prizes are retired.
    // Essence is the primary spin currency now.
    const essenceValues = SPIN_PRIZES.filter((prize) => prize.type === 'essence').map((prize) => prize.value);
    if (essenceValues.length === 0) {
      return null;
    }
    const minEssence = Math.min(...essenceValues);
    const maxEssence = Math.max(...essenceValues);
    return formatGoldRange(minEssence, maxEssence);
  }, []);
  
  const overlaySpinsRemaining = Math.max(0, Math.floor(spinsAvailable));

  const refreshDailyTreatsOpenedState = useCallback(async () => {
    const userId = supabaseSession?.user?.id;
    if (!userId) {
      setHasOpenedDailyTreatsToday(false);
      setHasOpenedDailyTreatBonusToday(false);
      setHasDailyTreatBonusDoorToday(false);
      return;
    }

    try {
      const { data: season } = await getPersonalQuestSeason(userId);
      if (!season || season.season.season_type !== 'personal_quest') {
        setHasOpenedDailyTreatsToday(false);
        setHasOpenedDailyTreatBonusToday(false);
        setHasDailyTreatBonusDoorToday(false);
        return;
      }

      const todayIndex = season.today_day_index;
      const openedDays = Array.isArray(season.progress?.opened_days)
        ? season.progress.opened_days
        : [];
      const openedBonusDays = Array.isArray(season.progress?.opened_bonus_days)
        ? season.progress.opened_bonus_days
        : [];
      const todayHatches = getHatchesForDay(season.hatches, todayIndex);
      setHasOpenedDailyTreatsToday(openedDays.includes(todayIndex));
      setHasOpenedDailyTreatBonusToday(openedBonusDays.includes(todayIndex));
      setHasDailyTreatBonusDoorToday(Boolean(todayHatches.bonus));
    } catch {
      setHasOpenedDailyTreatsToday(false);
      setHasOpenedDailyTreatBonusToday(false);
      setHasDailyTreatBonusDoorToday(false);
    }
  }, [supabaseSession?.user?.id]);

  const refreshHolidayCalendarOpenedState = useCallback(async () => {
    const userId = supabaseSession?.user?.id;
    const holidayKey = activeHolidaySeason?.meta.holiday_key;
    if (!userId || !holidayKey) {
      setHasOpenedHolidayCalendarToday(false);
      return;
    }

    const { data: season } = await fetchCurrentSeason(userId, holidayKey);
    if (!season) {
      setHasOpenedHolidayCalendarToday(false);
      return;
    }

    const todayIndex = season.today_day_index;
    const freeOpened = season.progress?.opened_days.includes(todayIndex) ?? false;
    const bonusOpened = season.progress?.opened_bonus_days?.includes(todayIndex) ?? false;
    setHasOpenedHolidayCalendarToday(freeOpened || bonusOpened);
  }, [activeHolidaySeason?.meta.holiday_key, supabaseSession?.user?.id]);

  useEffect(() => {
    void refreshDailyTreatsOpenedState();
    void refreshHolidayCalendarOpenedState();
  }, [refreshDailyTreatsOpenedState, refreshHolidayCalendarOpenedState]);

  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      void refreshDailyTreatsOpenedState();
      void refreshHolidayCalendarOpenedState();
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('lifegoal:treat-calendar-opened', handleVisibilityOrFocus);
    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('lifegoal:treat-calendar-opened', handleVisibilityOrFocus);
    };
  }, [refreshDailyTreatsOpenedState, refreshHolidayCalendarOpenedState]);
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

    // Per-tab default config (non-themed). Keys are MOBILE_FOOTER_WORKSPACE_IDS values.
    const FOOTER_TAB_DEFAULTS: Partial<Record<string, Omit<MobileMenuNavItem, 'id'>>> = {
      account: {
        label: 'Settings',
        ariaLabel: 'Settings and profile',
        icon: '⚙️',
        summary: 'Manage your profile, ship, and preferences.',
      },
      body: {
        label: 'Health Goals',
        ariaLabel: 'Health routines and care',
        icon: '💪',
        summary: 'Refresh your body-focused routines and personal care rituals.',
      },
      'breathing-space': {
        label: 'Compass',
        ariaLabel: 'Open Compass Book',
        icon: '📖',
        summary: 'Open your Compass Book and its six guided chapters.',
      },
      habits: {
        label: 'Habits',
        ariaLabel: 'Habits and routines',
        icon: '🔄',
        summary: 'Review weekly habits, streaks, and routines in progress.',
      },
    };

    const holidayKey = activeHolidaySeason?.meta.holiday_key ?? null;
    const themeGroup = FOOTER_THEME_GROUP[theme];

    const getIcon = (tabId: FooterTabId, fallback: ReactNode): ReactNode => {
      const srcs = footerIconCandidates(tabId, holidayKey, themeGroup);
      return <FooterNavImg key={srcs.join('|')} srcs={srcs} fallback={fallback} />;
    };

    const baseItems = MOBILE_FOOTER_WORKSPACE_IDS.map((navId) => {
      const item = findWorkspaceItem(navId);
      const shortLabel = item?.shortLabel ?? item?.label ?? navId;
      const formattedLabel =
        shortLabel.length > 0
          ? `${shortLabel.charAt(0)}${shortLabel.slice(1).toLowerCase()}`
          : shortLabel;

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

      const defaults = FOOTER_TAB_DEFAULTS[navId];
      if (defaults) {
        const isFooterTab = navId !== 'breathing-space' && navId in FOOTER_TAB_FILES;
        return {
          id: navId,
          ...defaults,
          icon: isFooterTab
            ? getIcon(navId as FooterTabId, defaults.icon)
            : defaults.icon,
        } satisfies MobileMenuNavItem;
      }

      const isFooterTab = navId in FOOTER_TAB_FILES;
      return {
        id: navId,
        label: formattedLabel,
        ariaLabel: item?.label ?? formattedLabel,
        icon: isFooterTab
          ? getIcon(navId as FooterTabId, item?.icon ?? '•')
          : (item?.icon ?? '•'),
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
  }, [workspaceNavItems, theme, activeHolidaySeason]);

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
        if (item.id === 'planning' && isAdmin === true && activeWorkspaceNav === 'planning' && !showMobileHome) {
          return {
            ...item,
            ariaLabel: `${item.ariaLabel} — admin only view`,
            badgeLabel: 'Admin only view',
          };
        }

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
  }, [activeWorkspaceNav, isAdmin, mobileMenuNavItems, showMobileHome, timerLauncherSeconds, timerLauncherState]);
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
  const shouldCollapseFooterForGoalsAndCheckins =
    isMobileExperience && (mobileActiveNavId === 'support' || mobileActiveNavId === 'rituals');
  const shouldLockFooterCollapsedForQuestFlow =
    isMobileExperience && (
      isMyQuestSubmenuOpen ||
      isStarterQuestSheetOpen ||
      isContractWizardOpen ||
      mobileActiveNavId === 'contracts' ||
      shouldCollapseFooterForGoalsAndCheckins
    );
  const shouldForceFooterCollapseForDirectionFlows = shouldLockFooterCollapsedForQuestFlow;
  const shouldAutoCollapseOnIdle =
    isMobileExperience &&
    mobileActiveNavId !== null &&
    (shouldForceFooterCollapseForDirectionFlows ||
      MOBILE_FOOTER_AUTO_COLLAPSE_IDS.has(mobileActiveNavId) ||
      (mobileActiveNavId === 'actions' && actionsTabView === 'tasks'));
  const shouldAllowFooterCollapse =
    isMobileExperience && (isMobileMenuImageActive || shouldAutoCollapseOnIdle || shouldForceFooterCollapseForDirectionFlows);
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
      if (shouldAutoCollapseOnIdle && !shouldLockFooterCollapsedForQuestFlow) {
        scheduleMobileFooterCollapse();
      }
    },
    [scheduleMobileFooterCollapse, shouldAllowFooterCollapse, shouldAutoCollapseOnIdle, shouldLockFooterCollapsedForQuestFlow],
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
      if (shouldLockFooterCollapsedForQuestFlow) {
        setIsMobileFooterCollapsed(true);
      }
      return;
    }
    setIsMobileFooterCollapsed(true);
    if (!shouldLockFooterCollapsedForQuestFlow) {
      scheduleMobileFooterCollapse();
    }
  }, [scheduleMobileFooterCollapse, shouldAllowFooterCollapse, shouldAutoCollapseOnIdle, shouldLockFooterCollapsedForQuestFlow]);

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
      } else if (delta < -threshold && !shouldLockFooterCollapsedForQuestFlow) {
        handleMobileFooterExpand(false);
      }

      lastMobileScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleMobileFooterExpand, isMobileMenuImageActive, isMobileExperience, shouldLockFooterCollapsedForQuestFlow]);

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

  useEffect(() => {
    if (forceAuthOnMount && !isAuthenticated) {
      setShowAuthPanel(true);
      setActiveAuthTab('login');
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeSession = useMemo(
    () => (supabaseSession ?? localGuestSession) as Session,
    [localGuestSession, supabaseSession],
  );

  useEffect(() => {
    if (supabaseSession) setLocalGuestSession(null);
  }, [supabaseSession]);
  const appFutureFeatureCardStates = useFutureFeatureCardStates(['app.body', 'app.contracts', 'app.routines'], {
    loadVotes: Boolean(activeSession?.user?.id),
  });

  useEffect(() => {
    if (!supabaseSession?.user?.id) {
      setIsAdmin(false);
      return;
    }

    let active = true;
    setIsAdmin(null);
    isAdminUser(supabaseSession.user.id)
      .then((value) => {
        if (!active) return;
        setIsAdmin(value);
      })
      .catch((error) => {
        if (!active) return;
        console.warn('Failed to resolve admin status for feature gating; defaulting to public access.', error);
        setIsAdmin(false);
      });

    return () => {
      active = false;
    };
  }, [supabaseSession?.user?.id]);

  useEffect(() => {
    let active = true;
    const userId = supabaseSession?.user?.id ?? 'local';

    fetchSoundEffectsEnabled(userId).then(({ data, error }) => {
      if (!active) return;
      setSoundEffectsEnabledState(data);
      setGlobalSoundEffectsEnabled(data);
      setSoundPreferenceError(error?.message ?? null);
    });

    return () => {
      active = false;
    };
  }, [supabaseSession?.user?.id]);

  const handleSoundEffectsEnabledChange = useCallback(
    async (enabled: boolean) => {
      const userId = supabaseSession?.user?.id ?? 'local';
      setSoundPreferenceSaving(true);
      setSoundPreferenceError(null);
      setSoundEffectsEnabledState(enabled);
      setGlobalSoundEffectsEnabled(enabled);

      const { data, error } = await updateSoundEffectsEnabled(userId, enabled);
      setSoundEffectsEnabledState(data);
      setGlobalSoundEffectsEnabled(data);
      setSoundPreferenceError(error?.message ?? null);
      setSoundPreferenceSaving(false);
    },
    [supabaseSession?.user?.id],
  );

  useEffect(() => {
    if (wasMobileMenuOpenRef.current && !isMobileMenuOpen) {
      playLauncherCloseSound();
    }
    wasMobileMenuOpenRef.current = isMobileMenuOpen;
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (typeof window === 'undefined' || !activeSession?.user?.id) {
      return;
    }

    const userId = activeSession.user.id;
    const runReminderChecks = () => {
      const now = new Date();

      if (getDreamJournalReminderEnabled(userId)) {
        const dreamWindow = getDreamJournalReminderWindow(userId);
        if (isHourInDreamReminderWindow(now.getHours(), dreamWindow)) {
          const cycleKey = getDreamReminderCycleKey(now, dreamWindow);
          if (getDreamJournalReminderLastShownCycle(userId) !== cycleKey) {
            setDreamJournalReminderLastShownCycle(userId, cycleKey);
            window.dispatchEvent(new CustomEvent('lifegoal:launch-dream-journal'));
          }
        }
      }

      if (getTodaysWinsReminderEnabled(userId)) {
        const winsWindow = getTodaysWinsReminderWindow(userId);
        if (isTimeInTodaysWinsReminderWindow(now, winsWindow)) {
          const cycleKey = getTodaysWinsReminderCycleKey(now, winsWindow);
          if (getTodaysWinsReminderLastShownCycle(userId) !== cycleKey) {
            setTodaysWinsReminderLastShownCycle(userId, cycleKey);
            window.dispatchEvent(new CustomEvent('lifegoal:launch-todays-wins'));
          }
        }
      }
    };

    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        runReminderChecks();
      }
    };

    runReminderChecks();
    window.addEventListener('focus', runReminderChecks);
    document.addEventListener('visibilitychange', handleVisible);
    return () => {
      window.removeEventListener('focus', runReminderChecks);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [activeSession]);

  const handleGameModePreferenceChange = useCallback(async (nextIsActive: boolean) => {
    setIsMobileMenuImageActive(nextIsActive);
    triggerMobileMenuFlash();

    setIsMobileMenuOpen(false);
    setShowMobileGamification(false);
    setIsEnergyMenuOpen(false);
    setShowGameBoardOverlay(nextIsActive);

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
      setShowHolidaySeasonDialog(true);
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
        setHolidayPreviewKey(previewHoliday.meta.holiday_key);
        setIsHolidaySeasonDialogPreview(false);
        setShowHolidaySeasonDialog(true);
        return;
      }

      setIsHolidaySeasonDialogPreview(false);
      setShowHolidaySeasonDialog(false);
      setHolidayPreviewKey(holidayKey);
      setCalendarLaunchMode('holiday');
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
  const launcherTraitCards: HandCard[] = archetypeHand
    ? handToArray(archetypeHand).filter((handCard): handCard is HandCard => isRenderableHandCard(handCard) && handCard.role !== 'dominant')
    : [];
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
    const activeUserId = activeSession?.user?.id ?? null;
    if (!isValidUuid(activeUserId)) {
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
      setDisplayName('');
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
    if (!isMobileExperience || isAdmin !== false) return;
    if (activeWorkspaceNav !== 'planning' || showMobileHome) return;
    setShowMobileHome(true);
  }, [activeWorkspaceNav, isAdmin, isMobileExperience, showMobileHome]);

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

  // Leap Progress is an optional, opt-in leveling sprint — launched on demand
  // (Account → Leap Progress), never forced on new users.
  const handleLaunchLeapProgress = useCallback(
    (options?: { reset?: boolean }) => {
      if (options?.reset && supabaseSession?.user.id) {
        window.localStorage.removeItem(`leap_progress_${supabaseSession.user.id}`);
      }
      setShowDayZeroOnboarding(false);
      setShowLeapProgress(true);
      setActiveWorkspaceNav('goals');
    },
    [supabaseSession?.user.id],
  );

  const handleLaunchDayZeroOnboarding = useCallback(
    (options?: { reset?: boolean }) => {
      if (options?.reset && supabaseSession?.user.id) {
        window.localStorage.removeItem(`day_zero_onboarding_${supabaseSession.user.id}`);
      }
      setShowDayZeroOnboarding(true);
      setShowLeapProgress(false);
      setActiveWorkspaceNav('goals');
    },
    [supabaseSession?.user.id],
  );

  const handleDemoProfileSave = useCallback(
    (_payload: { displayName: string; onboardingComplete: boolean }) => {
      // Demo profile persistence removed in real-auth-only phase.
    },
    [],
  );

  // Kick off the first-run start flow for players who haven't completed it yet.
  // Gated on a dedicated `start_flow_complete` metadata flag so it stays
  // independent of the (now optional) Leap Progress / onboarding_complete flag.
  useEffect(() => {
    if (!supabaseSession) return;
    const userId = supabaseSession.user.id;
    if (firstRunInitializedUserRef.current === userId) return;
    firstRunInitializedUserRef.current = userId;
    const startFlowComplete = Boolean(supabaseSession.user.user_metadata?.start_flow_complete);
    if (!startFlowComplete) {
      setFirstRunStep('welcome');
    }
  }, [supabaseSession]);

  const handleCompleteFounderWelcome = useCallback(() => {
    // Land the player on Today, then guide them to the glowing Game button.
    setActiveWorkspaceNav('planning');
    setShowMobileHome(true);
    if (isMobileExperience) {
      setFirstRunStep('spotlight-game');
    } else {
      // Desktop has no footer Game button — go straight to the PLAY overlay.
      setFirstRunStep('spotlight-play');
      setShowGameBoardOverlay(true);
    }
  }, [isMobileExperience]);

  const handleFirstRunGameTap = useCallback(() => {
    setShowMobileGamification(false);
    setShowGameBoardOverlay(true);
    setFirstRunStep('spotlight-play');
  }, []);

  const handleLaunchFirstRunOnboardingFromAdmin = useCallback(() => {
    if (isAdmin !== true) return;
    setShowGameBoardOverlay(false);
    setShowMobileGamification(false);
    setShowLevelWorldsFromEntry(false);
    setShowMobileHome(true);
    setActiveWorkspaceNav('planning');
    setFirstRunStep('welcome');
  }, [isAdmin]);

  const completeFirstRunStartFlow = useCallback(() => {
    setFirstRunStep(null);
    const supabaseClient = client ?? getSupabaseClient();
    void supabaseClient.auth
      .updateUser({ data: { start_flow_complete: true } })
      .catch((error) => {
        console.error('Failed to persist start_flow_complete:', error);
      });
  }, [client]);

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
        setLocalGuestSession(null);
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
          setAuthError('Share your name so we can personalize your ship.');
          return;
        }
        const pendingGuestClaim = readIslandRunGuestFunnelState().claimStatus === 'claim_pending';
        await signUpWithPassword({
          email: formEmail,
          password: formPassword,
          options: {
            data: {
              full_name: formFullName,
              onboarding_complete: false,
              start_flow_complete: false,
            },
          },
        });

        if (pendingGuestClaim && supabaseSession) {
          const claimResult = await claimAnonymousIslandRunGuestInPlace({ session: supabaseSession });
          if (claimResult.status === 'claimed') {
            setAuthMessage(claimResult.savedDisplayName || claimResult.savedShipName
              ? `Your game is saved. Your guest run is now saved to your free account. Captain ${readIslandRunGuestFunnelState().displayName ?? formFullName} and ${readIslandRunGuestFunnelState().shipName ?? 'your ship'} are ready for the next route.`
              : 'Your game is saved. Your guest run is now saved to your free account.');
            setShowAuthPanel(false);
            setLevelWorldsEntryPanel('default');
            setShowLevelWorldsFromEntry(true);
            return;
          }
        }

        setAuthMessage('Check your email to confirm your account, then sign in to continue.');
      }
    } catch (error) {
      if (readIslandRunGuestFunnelState().claimStatus === 'claim_failed') {
        setAuthError('We couldn’t finish saving yet. Your guest game is still on this device. Try again before clearing browser data.');
      } else {
        setAuthError(error instanceof Error ? error.message : 'Unable to complete the request.');
      }
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

  const handleAuthInitializationRetry = useCallback(() => {
    setAuthError(null);
    setAuthMessage(null);
    retryAuthInitialization();
  }, [retryAuthInitialization]);

  const handleSignOut = async () => {
    setAuthError(null);
    setAuthMessage(null);
    try {
      if (isDemoSession(activeSession)) {
        setLocalGuestSession(null);
        setAuthMessage('Guest preview closed.');
        setEmail('');
        setPassword('');
        setFullName('');
        return;
      }
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

  const shouldRequireAuthentication = !activeSession;

  const closeGameBoardOverlayIfOpen = () => {
    if (showGameBoardOverlay) {
      setShowGameBoardOverlay(false);
    }
  };

  const bodyWorkspaceAccess = useMemo(
    () => resolveFeatureAccess('app.body', { isAdminOrCreator: isAdmin === true }),
    [isAdmin],
  );
  const isBodyWorkspaceOpen = bodyWorkspaceAccess === 'open';
  const contractsWorkspaceAccess = useMemo(
    () => resolveFeatureAccess('app.contracts', { isAdminOrCreator: isAdmin === true }),
    [isAdmin],
  );
  const isContractsWorkspaceOpen = contractsWorkspaceAccess === 'open';
  const routinesWorkspaceAccess = useMemo(
    () => resolveFeatureAccess('app.routines', { isAdminOrCreator: isAdmin === true }),
    [isAdmin],
  );
  const isRoutinesWorkspaceOpen = routinesWorkspaceAccess === 'open';
  const logBodyGateDebug = useCallback(
    (event: string) => {
      if (!import.meta.env.DEV) {
        return;
      }

      console.debug('[body-gate]', {
        event,
        userId: supabaseSession?.user?.id ?? null,
        userEmail: supabaseSession?.user?.email ?? null,
        isAdmin,
        bodyWorkspaceAccess,
        activeWorkspaceNav,
      });
    },
    [activeWorkspaceNav, bodyWorkspaceAccess, isAdmin, supabaseSession?.user?.email, supabaseSession?.user?.id],
  );

  const openBodyPreviewOverlay = useCallback(() => {
    setAppPreviewFeature({ id: 'app.body', label: 'Body' });
  }, []);

  const openContractsPreviewOverlay = useCallback(() => {
    setAppPreviewFeature({ id: 'app.contracts', label: 'Promises' });
  }, []);

  const openRoutinesPreviewOverlay = useCallback(() => {
    setAppPreviewFeature({ id: 'app.routines', label: 'Routines' });
  }, []);
  const openFeaturePreviewOverlay = useCallback((id: FeatureAvailabilityId, label: string) => {
    setAppPreviewFeature({ id, label });
  }, []);

  const clearAppPreviewFeatureIfMatches = useCallback((featureId: FeatureAvailabilityId) => {
    setAppPreviewFeature((current) => {
      if (current?.id !== featureId) {
        return current;
      }

      return null;
    });
  }, []);

  const openBodyWorkspace = useCallback(() => {
    logBodyGateDebug('open-attempt');

    if (!isBodyWorkspaceOpen) {
      openBodyPreviewOverlay();
      return;
    }

    clearAppPreviewFeatureIfMatches('app.body');
    setActiveWorkspaceNav('body');
    setShowMobileHome(false);
  }, [clearAppPreviewFeatureIfMatches, isBodyWorkspaceOpen, logBodyGateDebug, openBodyPreviewOverlay]);

  const openContractsWorkspace = useCallback(() => {
    if (!isContractsWorkspaceOpen) {
      openContractsPreviewOverlay();
      return;
    }

    clearAppPreviewFeatureIfMatches('app.contracts');
    setActiveWorkspaceNav('contracts');
    setShowMobileHome(false);
  }, [clearAppPreviewFeatureIfMatches, isContractsWorkspaceOpen, openContractsPreviewOverlay]);

  const openRoutinesWorkspace = useCallback(() => {
    if (!isRoutinesWorkspaceOpen) {
      openRoutinesPreviewOverlay();
      return;
    }

    clearAppPreviewFeatureIfMatches('app.routines');
    setActiveWorkspaceNav('routines');
    setShowMobileHome(false);
  }, [clearAppPreviewFeatureIfMatches, isRoutinesWorkspaceOpen, openRoutinesPreviewOverlay]);

  const isAppWorkspaceFeatureOpen = useCallback(
    (featureId: FeatureAvailabilityId) => {
      switch (featureId) {
        case 'app.body':
          return isBodyWorkspaceOpen;
        case 'app.contracts':
          return isContractsWorkspaceOpen;
        case 'app.routines':
          return isRoutinesWorkspaceOpen;
        default:
          return true;
      }
    },
    [isBodyWorkspaceOpen, isContractsWorkspaceOpen, isRoutinesWorkspaceOpen],
  );

  const isBlockedBodyWorkspaceActive = activeWorkspaceNav === 'body' && !isBodyWorkspaceOpen;
  const isBlockedContractsWorkspaceActive = activeWorkspaceNav === 'contracts' && !isContractsWorkspaceOpen;
  const isBlockedRoutinesWorkspaceActive = activeWorkspaceNav === 'routines' && !isRoutinesWorkspaceOpen;

  const leaveBlockedBodyWorkspace = useCallback(() => {
    if (!isBlockedBodyWorkspaceActive) {
      return false;
    }

    logBodyGateDebug('blocked-active-nav-reset');
    setActiveWorkspaceNav(DEFAULT_WORKSPACE_NAV_ID);
    setShowMobileHome(false);
    return true;
  }, [isBlockedBodyWorkspaceActive, logBodyGateDebug]);

  const leaveBlockedContractsWorkspace = useCallback(() => {
    if (!isBlockedContractsWorkspaceActive) {
      return false;
    }

    setActiveWorkspaceNav(DEFAULT_WORKSPACE_NAV_ID);
    setShowMobileHome(false);
    return true;
  }, [isBlockedContractsWorkspaceActive]);

  const leaveBlockedRoutinesWorkspace = useCallback(() => {
    if (!isBlockedRoutinesWorkspaceActive) {
      return false;
    }

    setActiveWorkspaceNav(DEFAULT_WORKSPACE_NAV_ID);
    setShowMobileHome(false);
    return true;
  }, [isBlockedRoutinesWorkspaceActive]);

  useEffect(() => {
    if (leaveBlockedBodyWorkspace()) {
      openBodyPreviewOverlay();
    }
  }, [leaveBlockedBodyWorkspace, openBodyPreviewOverlay]);

  useEffect(() => {
    if (leaveBlockedContractsWorkspace()) {
      openContractsPreviewOverlay();
    }
  }, [leaveBlockedContractsWorkspace, openContractsPreviewOverlay]);

  useEffect(() => {
    if (leaveBlockedRoutinesWorkspace()) {
      openRoutinesPreviewOverlay();
    }
  }, [leaveBlockedRoutinesWorkspace, openRoutinesPreviewOverlay]);

  useEffect(() => {
    if (appPreviewFeature?.id === 'app.body' || activeWorkspaceNav === 'body') {
      logBodyGateDebug('state');
    }
  }, [activeWorkspaceNav, appPreviewFeature?.id, logBodyGateDebug]);

  const handleMobileNavSelect = (
    navId: string,
    options?: MobileNavSelectOptions,
  ) => {
    const shouldReturnToMobileMenu = navId === 'account' && options?.launchSource === 'mobile-menu';

    if (shouldReturnToMobileMenu && activeWorkspaceNav !== 'account') {
      settingsMenuReturnNavRef.current = activeWorkspaceNav;
    }

    setIsMobileProfileDialogOpen(false);
    setIsMobileMenuOpen(false);
    setIsEnergyMenuOpen(false);
    setIsMyQuestSubmenuOpen(false);
    setIsFeedbackSupportSubmenuOpen(false);
    setIsStarterQuestSheetOpen(false);
    closeGameBoardOverlayIfOpen();
    setShouldShowSettingsMenuReturn(shouldReturnToMobileMenu);

    if (navId === 'breathing-space') {
      setIsCompassBookOpen(true);
      return;
    }
    
    const preserveBreatheTab = options?.preserveBreatheTab ?? false;

    if (navId === 'breathing-space' && !preserveBreatheTab) {
      setBreathingSpaceMobileTab(null);
    }

    if (navId === 'contracts') {
      openContractsWorkspace();
      return;
    }

    if (navId === 'routines') {
      openRoutinesWorkspace();
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

    if (navId === 'body') {
      openBodyWorkspace();
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

    if (navId === 'rituals') {
      setCheckinsEntryOrigin(options?.checkinsOrigin ?? 'direct');
    } else {
      setCheckinsEntryOrigin('direct');
    }

    setActiveWorkspaceNav(navId);
    setShowMobileHome(false);
  };

  // Island Run habit landmark dispatches this when the player has no check-in
  // yet and taps "Do a quick check-in". Route them into the Full Check-in view.
  const launchCheckinsRef = useRef<() => void>(() => {});
  launchCheckinsRef.current = () => {
    closeGameBoardOverlayIfOpen();
    handleMobileNavSelect('rituals', { checkinsOrigin: 'direct' });
  };
  useEffect(() => {
    const handler = () => launchCheckinsRef.current();
    window.addEventListener('lifegoal:launch-checkins', handler);
    return () => window.removeEventListener('lifegoal:launch-checkins', handler);
  }, []);

  const openFeedbackSupportFromMobileMenu = (mode: 'feedback' | 'support') => {
    setIsMobileProfileDialogOpen(false);
    setIsMobileMenuOpen(false);
    setIsEnergyMenuOpen(false);
    setIsMyQuestSubmenuOpen(false);
    setIsFeedbackSupportSubmenuOpen(false);
    setIsStarterQuestSheetOpen(false);
    closeGameBoardOverlayIfOpen();

    if (mode === 'feedback') {
      setShowMobileFeedbackModal(true);
    } else {
      setShowMobileSupportModal(true);
    }
  };

  const openPlayersHandFromLauncher = useCallback(() => {
    setHasSeenMicroTestBadge(true);
    setIsMobileProfileDialogOpen(false);
    setIsMobileMenuOpen(false);
    setIsEnergyMenuOpen(false);
    setIsMyQuestSubmenuOpen(false);
    setIsFeedbackSupportSubmenuOpen(false);
    setIsStarterQuestSheetOpen(false);
    closeGameBoardOverlayIfOpen();

    const sparkHandEnabled = isPlayersHandSparkResultEnabled();
    const hasArchetypeHand = Boolean(archetypeHand);
    if (import.meta.env.DEV) {
      console.debug('[players-hand][launcher]', {
        sparkHandEnabled,
        hasArchetypeHand,
        branch: sparkHandEnabled && hasArchetypeHand ? 'direct-overlay' : 'fallback-identity',
      });
    }

    if (sparkHandEnabled && hasArchetypeHand) {
      setIsLauncherHandOverlayOpen(true);
      return;
    }

    handleMobileNavSelect('identity');
  }, [archetypeHand, handleMobileNavSelect]);

  const openFullMobileMenuFromGameOverlay = useCallback(() => {
    setIsMobileProfileDialogOpen(false);
    setIsEnergyMenuOpen(false);
    setIsMyQuestSubmenuOpen(false);
    setIsFeedbackSupportSubmenuOpen(false);
    setIsStarterQuestSheetOpen(false);
    setShowGameBoardOverlay(false);
    setIsMobileMenuOpen(true);
    handleMobileFooterExpand(true);
  }, [handleMobileFooterExpand]);

  const openQuestCompassFromMobileMenu = useCallback(() => {
    setIsMobileProfileDialogOpen(false);
    setIsMobileMenuOpen(false);
    setIsEnergyMenuOpen(false);
    setIsMyQuestSubmenuOpen(false);
    setIsFeedbackSupportSubmenuOpen(false);
    setIsStarterQuestSheetOpen(false);
    closeGameBoardOverlayIfOpen();
    setIsQuestCompassModalOpen(true);
  }, [closeGameBoardOverlayIfOpen]);

  const openMyQuestMenuFromToday = useCallback(() => {
    setIsMobileProfileDialogOpen(false);
    setIsEnergyMenuOpen(false);
    setIsFeedbackSupportSubmenuOpen(false);
    setIsStarterQuestSheetOpen(false);
    setStarterQuestSheetOrigin(null);
    setStarterQuestInitialDomainKey(null);
    closeGameBoardOverlayIfOpen();
    setIsMobileMenuOpen(true);
    setIsMyQuestSubmenuOpen(true);
    handleMobileFooterExpand(true);
  }, [closeGameBoardOverlayIfOpen, handleMobileFooterExpand]);

  const openStarterQuestSheetFromMyQuest = useCallback((initialDomainKey?: LifeWheelCategoryKey) => {
    setIsMobileProfileDialogOpen(false);
    setIsEnergyMenuOpen(false);
    setIsFeedbackSupportSubmenuOpen(false);
    closeGameBoardOverlayIfOpen();
    setStarterQuestSheetOrigin('my-quest');
    setStarterQuestInitialDomainKey(initialDomainKey ?? null);
    setIsStarterQuestSheetOpen(true);
  }, [closeGameBoardOverlayIfOpen]);

  const openCheckinsFromMyQuest = useCallback(() => {
    handleMobileNavSelect('rituals', { checkinsOrigin: 'my-quest' });
  }, [handleMobileNavSelect]);

  const handleBackToMyQuestFromCheckins = useCallback(() => {
    setIsMobileProfileDialogOpen(false);
    setIsEnergyMenuOpen(false);
    setIsFeedbackSupportSubmenuOpen(false);
    setIsStarterQuestSheetOpen(false);
    setIsMobileMenuOpen(true);
    setIsMyQuestSubmenuOpen(true);
  }, []);

  const openGoalsFromMyQuest = useCallback(() => {
    handleMobileNavSelect('support');
  }, [handleMobileNavSelect]);

  const openHealthGoalsQuestMenuFromBody = useCallback(() => {
    if (isAdmin !== true) return;
    setIsMobileProfileDialogOpen(false);
    setIsEnergyMenuOpen(false);
    setIsFeedbackSupportSubmenuOpen(false);
    setIsStarterQuestSheetOpen(false);
    closeGameBoardOverlayIfOpen();
    setIsMobileMenuOpen(true);
    setIsMyQuestSubmenuOpen(true);
  }, [closeGameBoardOverlayIfOpen, isAdmin]);

  const closeStarterQuestSheet = useCallback(() => {
    setIsStarterQuestSheetOpen(false);
    if (starterQuestSheetOrigin === 'my-quest') {
      setIsMobileMenuOpen(true);
      setIsMyQuestSubmenuOpen(true);
      setIsEnergyMenuOpen(false);
      setIsFeedbackSupportSubmenuOpen(false);
    }
    setStarterQuestSheetOrigin(null);
    setStarterQuestInitialDomainKey(null);
  }, [starterQuestSheetOrigin]);

  const handleStarterQuestCreated = useCallback(() => {
    setIsStarterQuestSheetOpen(false);
    setStarterQuestSheetOrigin(null);
    setStarterQuestInitialDomainKey(null);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(HABITS_CREATED_EVENT));
    }
  }, []);

  const openQuestCompassCoachPrompt = useCallback(() => {
    setAiCoachStarterQuestion(
      'Help me read my Quest Compass across Fire, Strength, Connection, Wealth, Growth, and Direction. Which life force needs care now, and what small real-life quest should I take next?',
    );
    setShowAiCoachModal(true);
    setIsQuestCompassModalOpen(false);
  }, []);

  const openQuestCompassJournal = useCallback(() => {
    setJournalLaunchRequest({
      type: 'goal',
      openComposer: true,
      requestId: Date.now(),
    });
    setActiveWorkspaceNav('journal');
    setShowMobileHome(false);
    setIsQuestCompassModalOpen(false);
  }, []);

  const openQuestCompassNextQuest = useCallback((initialDomainKey?: LifeWheelCategoryKey) => {
    setIsQuestCompassModalOpen(false);
    openStarterQuestSheetFromMyQuest(initialDomainKey);
  }, [openStarterQuestSheetFromMyQuest]);

  const openQuestCompassCheckins = useCallback(() => {
    setIsQuestCompassModalOpen(false);
    handleMobileNavSelect('rituals', { checkinsOrigin: 'my-quest' });
  }, [handleMobileNavSelect]);

  const openQuestCompassGoals = useCallback(() => {
    setIsQuestCompassModalOpen(false);
    openGoalsFromMyQuest();
  }, [openGoalsFromMyQuest]);

  const myQuestSubmenuActions: LauncherSubmenuAction[] = useMemo(
    () => [
      { id: 'quest-compass', label: 'Quest Pulse', icon: '💓', onSelect: openQuestCompassFromMobileMenu },
      { id: 'starter-quest', label: 'Starter Quest', icon: '🧭', onSelect: openStarterQuestSheetFromMyQuest },
      { id: 'body', label: 'Health Goals', icon: '💪', featureId: 'app.body', onSelect: () => handleMobileNavSelect('body') },
      { id: 'habits', label: 'Habits', icon: '🔄', onSelect: () => handleMobileNavSelect('habits') },
      { id: 'routines', label: 'Routines', icon: '🧩', featureId: 'app.routines', onSelect: openRoutinesWorkspace },
      { id: 'support', label: 'Goals', icon: '🎯', onSelect: () => handleMobileNavSelect('support') },
      { id: 'planning', label: 'Check-ins', icon: '✅', onSelect: openCheckinsFromMyQuest },
      { id: 'contracts', label: 'Contracts', icon: '🤝', featureId: 'app.contracts', onSelect: openContractsWorkspace },
    ],
    [handleMobileNavSelect, openCheckinsFromMyQuest, openContractsWorkspace, openQuestCompassFromMobileMenu, openRoutinesWorkspace, openStarterQuestSheetFromMyQuest],
  );

  const feedbackSupportSubmenuActions: LauncherSubmenuAction[] = useMemo(
    () => [
      { id: 'feedback', label: 'Feedback', icon: '💬', onSelect: () => openFeedbackSupportFromMobileMenu('feedback') },
      { id: 'support', label: 'Support', icon: '🛟', onSelect: () => openFeedbackSupportFromMobileMenu('support') },
    ],
    [openFeedbackSupportFromMobileMenu],
  );

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

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const updateAuthGateOnlineStatus = () => {
      setIsAuthGateOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    };
    updateAuthGateOnlineStatus();
    window.addEventListener('online', updateAuthGateOnlineStatus);
    window.addEventListener('offline', updateAuthGateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateAuthGateOnlineStatus);
      window.removeEventListener('offline', updateAuthGateOnlineStatus);
    };
  }, []);

  const handleMobileGameOverlayCardClick = () => {
    setActiveWorkspaceNav('game');
    setShowMobileHome(false);
  };

  const closeMobileMenu = useCallback(() => {
    setIsMobileProfileDialogOpen(false);
    setIsMobileMenuOpen(false);
  }, []);

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

  const userDisplay =
    displayName ||
    ((supabaseSession?.user.user_metadata?.full_name as string | undefined) ?? '') ||
    supabaseSession?.user.email ||
    '';
  const userInitial = (userDisplay || '').trim().charAt(0).toUpperCase() || 'U';

  const profileInitials = generateInitials(workspaceProfile?.full_name || '');
  // Use initials from profile if enabled, otherwise use first letter
  const shouldShowInitials = isAuthenticated && workspaceProfile?.show_initials_in_menu && profileInitials;
  const menuIconContent = shouldShowInitials ? profileInitials : '🌿';

  const profileStrengthPercent = profileStrengthSnapshot?.overallPercent;
  const profileStrengthPercentLabel =
    profileStrengthPercent !== null && profileStrengthPercent !== undefined
      ? `${profileStrengthPercent}%`
      : '—';
  const profileStrengthRingPercent = Math.max(0, Math.min(100, profileStrengthPercent ?? 73));
  const profileStrengthRingStyle = {
    '--profile-strength-percent': `${profileStrengthRingPercent}%`,
  } as CSSProperties;
  const profileStrengthTitle =
    profileStrengthPercent !== null && profileStrengthPercent !== undefined
      ? `${profileStrengthPercent}% charged`
      : 'Profile strength';
  const profileStrengthTask = profileStrengthSnapshot?.globalNextTask ?? null;
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

  const isDemoExperience = isDemoSession(activeSession);
  const normalizedDisplayName =
    displayName.trim() ||
    workspaceProfile?.full_name ||
    ((supabaseSession?.user.user_metadata?.full_name as string | undefined) ?? '') ||
    '';
  const accountDisplayName = normalizedDisplayName || userDisplay || 'Guest';
  const accountInitials = profileInitials || generateInitials(accountDisplayName);
  const accountEmail = supabaseSession?.user.email || 'No email on file';
  const accountShipName = workspaceProfile?.workspace_name || 'Personal rituals ship';
  const accountShipMode = supabaseSession ? 'Connected to Supabase' : 'Not connected';
  const accountBirthday = workspaceProfile?.birthday || 'Not set';
  const accountGender = workspaceProfile?.gender || 'Not set';
  const accountOnboardingStatus = supabaseSession?.user.user_metadata?.onboarding_complete ? 'Complete' : 'In progress';

  const profileAutoSaveResetKey = supabaseSession
    ? `${
        supabaseSession.user.id
      }:${
        workspaceProfile?.full_name ||
        ((supabaseSession.user.user_metadata?.full_name as string | undefined) ?? '') ||
        ''
      }`
    : 'logged-out';

  const handlePreferredCompactViewChange = useCallback(
    (isCompactView: boolean) => {
      if (!supabaseSession) return;

      setWorkspaceProfile((current) => {
        if (!current) return current;
        return { ...current, private_compact_view_enabled: isCompactView };
      });

      void upsertWorkspaceProfile({
        ...(workspaceProfile ?? {}),
        user_id: supabaseSession.user.id,
        private_compact_view_enabled: isCompactView,
      }).then(({ data, error }) => {
        if (error) {
          console.error('Failed to save private mode preference:', error);
          return;
        }
        if (data) {
          setWorkspaceProfile(data);
        }
      }).catch((error) => {
        console.error('Failed to save private mode preference:', error);
      });
    },
    [supabaseSession, workspaceProfile],
  );

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
  // Leap Progress no longer gates the workspace — it only renders when explicitly
  // launched. The forced new-user onboarding gate is retired here; the new
  // start-the-app flow will own first-run gating separately.
  const shouldShowLeapProgress = showLeapProgress && !showDayZeroOnboarding;
  const canAccessWorkspace = true;

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
    if (!pendingGuestIslandRunEntry || !activeSession) return;
    setPendingGuestIslandRunEntry(false);
    setLevelWorldsEntryPanel('default');
    setShowLevelWorldsFromEntry(true);
  }, [activeSession, pendingGuestIslandRunEntry]);

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

  const shouldLockAppScroll = isMobileMenuOpen || showGameBoardOverlay || showDailySpinWheel || showCalendarPlaceholder || showLevelWorldsFromEntry;
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

    const root = document.getElementById('root');
    const scrollY = window.scrollY;

    // Scroll to top before locking so body.style.top is always '0'.
    // Both fullscreen overlays (game + island) completely cover the page,
    // so the scroll jump is invisible. Without this, body.style.top = -scrollY
    // inflates the body height on iOS WebKit, pushing the footer and overlay
    // up by scrollY pixels and leaving a white strip at the bottom.
    if (scrollY > 0) {
      window.scrollTo(0, 0);
    }

    const releaseScrollLock = lockFullscreenPageScroll({ root: Boolean(root) });

    return () => {
      releaseScrollLock();
      window.scrollTo(0, scrollY);
    };
  }, [shouldLockAppScroll]);

  const handleCloseWorkspaceSetup = () => {
    setShowWorkspaceSetup(false);
    setWorkspaceSetupDismissed(true);
  };

  // These callbacks must stay above the early returns below (Peace Between
  // shells + app readiness screen): hooks rendered after a conditional return
  // change the hook count between renders and crash React (error #310).
  const handlePlayFreeIslandRun = useCallback(async (payload: { displayName: string; shipName: string }) => {
    patchIslandRunGuestFunnelState({
      entrySource: 'landing_cta',
      hasSeenGuestTimeline: true,
      displayName: payload.displayName || undefined,
      shipName: payload.shipName || undefined,
    });
    setAuthError(null);
    if (!supabaseSession) {
      setPendingGuestIslandRunEntry(true);
      setLocalGuestSession(createDemoSession());
      return;
    }
    setLevelWorldsEntryPanel('default');
    setShowLevelWorldsFromEntry(true);
  }, [supabaseSession]);

  const handleOpenSaveAccountSignup = useCallback(() => {
    setActiveAuthTab('signup');
    setAuthMode('signup');
    setAuthError(null);
    const guestState = readIslandRunGuestFunnelState();
    if (guestState.displayName) setFullName(guestState.displayName);
    setAuthMessage('Create a free account to save this guest run. No payment required.');
    setShowAuthPanel(true);
  }, []);

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

  if (shouldShowAppReadinessScreen) {
    return (
      <LoadingReadinessScreen
        title="Preparing your Game of Life"
        subtitle="Checking your session and syncing the progress you need before the app opens."
        progress={appReadinessProgress}
        steps={appReadinessSteps}
        detail="Secondary features keep loading in the background after the main app is ready."
        variant="app"
      />
    );
  }

  const handleLaunchYesterdayTodoCleanup = (options?: { force?: boolean }) => {
    setActiveWorkspaceNav('planning');
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('lifegoal:launch-yesterday-todo-cleanup', {
        detail: { force: options?.force === true },
      }));
    }, 0);
  };


  const habitGameAuthCard = (
    <HabitGameAuthCard
      activeAuthTab={activeAuthTab}
      authError={authError}
      authMessage={authMessage}
      authMessageVisible={authMessageVisible}
      email={email}
      fullName={fullName}
      initializationStatus={initializationStatus}
      initializing={initializing}
      isAuthGateOnline={isAuthGateOnline}
      isConfigured={isConfigured}
      password={password}
      submitting={submitting}
      onAuthInitializationRetry={handleAuthInitializationRetry}
      onAuthSubmit={handleAuthSubmit}
      onEmailChange={setEmail}
      onFullNameChange={setFullName}
      onGoogleSignIn={handleGoogleSignIn}
      onPasswordChange={setPassword}
      onTabChange={setActiveAuthTab}
      onPlayFree={handlePlayFreeIslandRun}
    />
  );

  if (shouldRequireAuthentication && isMobileExperience) {
    return (
      <HabitGameLandingShell
        activeAuthTab={activeAuthTab}
        authError={authError}
        authMessage={authMessage}
        authMessageVisible={authMessageVisible}
        email={email}
        fullName={fullName}
        initializationStatus={initializationStatus}
        initializing={initializing}
        isAuthGateOnline={isAuthGateOnline}
        isConfigured={isConfigured}
        password={password}
        submitting={submitting}
        themeToggle={<ThemeToggle className="auth-gate__theme-toggle" />}
        onAuthInitializationRetry={handleAuthInitializationRetry}
        onAuthSubmit={handleAuthSubmit}
        onEmailChange={setEmail}
        onFullNameChange={setFullName}
        onGoogleSignIn={handleGoogleSignIn}
        onPasswordChange={setPassword}
        onTabChange={setActiveAuthTab}
        onPlayFree={handlePlayFreeIslandRun}
      />
    );
  }

  const shouldForceAuthOverlay = shouldRequireAuthentication && !isMobileExperience;
  const isAuthOverlayVisible = shouldForceAuthOverlay || showAuthPanel;
  const isAnyModalVisible = isAuthOverlayVisible && !isMobileExperience;

  const renderWorkspaceSection = () => {
    if (activeWorkspaceNav === 'goals') {
      return (
        <>
          {shouldShowLeapProgress ? (
            <LeapProgress
              session={activeSession}
              displayName={displayName}
              setDisplayName={setDisplayName}
              profileSaving={profileSaving}
              setProfileSaving={setManualProfileSaving}
              setAuthMessage={setAuthMessage}
              setAuthError={setAuthError}
              isDemoExperience={isDemoExperience}
              onSaveDemoProfile={handleDemoProfileSave}
              onNavigateHub={() => {
                setShowLeapProgress(false);
                setActiveWorkspaceNav('goals');
                setShowMobileHome(false);
              }}
              onOpenCoach={() => {
                setShowLeapProgress(false);
                setAiCoachStarterQuestion(undefined);
                setShowAiCoachModal(true);
              }}
              onClose={() => setShowLeapProgress(false)}
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

          {canAccessWorkspace ? (
            <div className="workspace-content">
              <ProgressDashboard session={activeSession} stats={workspaceStats} />
            </div>
          ) : (
            <p className="workspace-onboarding-hint">
              Finish onboarding to unlock the goal ship and habit trackers.
            </p>
          )}
        </>
      );
    }

    if (activeWorkspaceNav === 'account') {
      return (
        <div className="workspace-content">
          {isMobileExperience && shouldShowSettingsMenuReturn ? (
            <button
              type="button"
              className="workspace-settings-menu-return"
              onClick={() => {
                setIsMobileProfileDialogOpen(false);
                setIsEnergyMenuOpen(false);
                setIsMyQuestSubmenuOpen(false);
                setIsFeedbackSupportSubmenuOpen(false);
                setIsStarterQuestSheetOpen(false);
                setShouldShowSettingsMenuReturn(false);
                setActiveWorkspaceNav(settingsMenuReturnNavRef.current);
                setIsMobileMenuOpen(true);
              }}
              aria-label="Back to menu"
            >
              <span aria-hidden="true" className="workspace-settings-menu-return__icon">‹</span>
            </button>
          ) : null}
          <MyAccountPanel
            session={activeSession}
            isDemoExperience={isDemoExperience}
            isAuthenticated={isAuthenticated}
            onSignOut={handleSignOut}
            onEditProfile={handleEditAccountDetails}
            onLaunchLeapProgress={handleLaunchLeapProgress}
            onLaunchDayZeroOnboarding={handleLaunchDayZeroOnboarding}
            onLaunchFirstRunOnboarding={isAdmin === true ? handleLaunchFirstRunOnboardingFromAdmin : undefined}
            profile={workspaceProfile}
            stats={workspaceStats}
            profileLoading={workspaceProfileLoading}
            onProfileUpdate={setWorkspaceProfile}
            onLaunchWeeklyHabitReview={() => setActiveWorkspaceNav('planning')}
            onLaunchDailyCatchUpPrompt={() => setActiveWorkspaceNav('planning')}
            onLaunchDailyTreatCalendar={() => {
              setCalendarLaunchMode('auto');
              setShowCalendarPlaceholder(true);
            }}
            onLaunchYesterdayTodoCleanup={() => handleLaunchYesterdayTodoCleanup({ force: true })}
            billingReturnBanner={billingReturnBanner}
            soundEffectsEnabled={soundEffectsEnabled}
            soundPreferenceSaving={soundPreferenceSaving}
            soundPreferenceError={soundPreferenceError}
            onSoundEffectsEnabledChange={handleSoundEffectsEnabledChange}
            isMobileMenuImageActive={isMobileMenuImageActive}
            onGameModePreferenceChange={handleGameModePreferenceChange}
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
        if (isMobileExperience && isAdmin !== true) {
          return null;
        }

        return (
          <div className="workspace-content">
            {isMobileExperience ? (
              <div className="workspace-link-callout">
                <span className="workspace-link-callout__badge">Admin only view</span>
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
              archetypeHand={archetypeHand}
              onOpenDailyTreat={launchDailyTreatsMenu}
              onOpenHolidayCalendar={launchHolidayCalendar}
              onOpenIslandRunStop={(stopId) => {
                setIslandRunOpenStopParam(stopId);
                setShowMobileHome(false);
                setLevelWorldsEntryPanel('default');
                setShowLevelWorldsFromEntry(true);
              }}
              preferredCompactView={workspaceProfile?.private_compact_view_enabled ?? false}
              onPreferredCompactViewChange={handlePreferredCompactViewChange}
              onNavigateToTimer={(context) => {
                if (context) {
                  setTimerLaunchContext(context as any);
                }
                setActiveWorkspaceNav('timer');
              }}
              onOpenAiCoach={(starterQuestion) => {
                setAiCoachStarterQuestion(starterQuestion ?? undefined);
                setShowAiCoachModal(true);
              }}
              pendingOfferToOpen={pendingTodayOfferOpen}
              onPendingOfferHandled={() => setPendingTodayOfferOpen(null)}
              activeHolidaySeason={activeHolidaySeason}
              hasOpenedDailyTreatsToday={hasOpenedDailyTreatsToday}
              hasOpenedDailyTreatBonusToday={hasOpenedDailyTreatBonusToday}
              hasDailyTreatBonusDoorToday={hasDailyTreatBonusDoorToday}
              hasOpenedHolidayCalendarToday={hasOpenedHolidayCalendarToday}
              hiddenHabitIds={[]}
              isContractsFeatureOpen={isContractsWorkspaceOpen}
              isRoutinesFeatureOpen={isRoutinesWorkspaceOpen}
              onNavigateToContracts={openContractsWorkspace}
              onNavigateToRoutines={openRoutinesWorkspace}
              isAdminOrCreator={isAdmin === true}
              onOpenFeaturePreview={openFeaturePreviewOverlay}
              deferDailyLifeUpgradeModal={shouldDeferDailyLifeUpgradeModal}
              deferYesterdayTodoCleanupModal={shouldDeferYesterdayTodoCleanupModal}
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
              isAdminOrCreator={isAdmin === true}
              onOpenFeaturePreview={openFeaturePreviewOverlay}
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
              onWizardOpen={() => setIsContractWizardOpen(true)}
              onWizardClose={() => setIsContractWizardOpen(false)}
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
            <LifeWheelCheckins
              session={activeSession}
              entryOrigin={checkinsEntryOrigin}
              onBackToMyQuest={handleBackToMyQuestFromCheckins}
            />
          </div>
        );
      case 'body':
        if (!isBodyWorkspaceOpen) {
          return (
            <section
              className="workspace-content"
              role="status"
              aria-label="Body preview status"
            >
              <p className="workspace-onboarding-hint">
                Body is in preview for this account.
              </p>
            </section>
          );
        }

        return (
          <div className="workspace-content">
            <BodyHaircutWidget onOpenHealthGoalsQuestMenu={openHealthGoalsQuestMenuFromBody} />
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
              isAdminOrCreator={isAdmin === true}
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
                Select "Goals & Habits" to access the full ship preview.
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
        aria-label="Open full HabitGame menu"
      >
        <div
          className="mobile-menu-overlay__backdrop"
          role="presentation"
        />
        <div
          className={`mobile-menu-overlay__panel${
            isMobileMenuImageActive ? ' mobile-menu-overlay__panel--image' : ''
          } mobile-menu-overlay__panel--tall`}
        >
          <>
            <div className="mobile-menu-overlay__header">
              <div className="mobile-menu-overlay__header-top">
                <div className="mobile-menu-overlay__top-controls">
                  <button
                    type="button"
                    className="mobile-menu-overlay__close mobile-menu-overlay__close--enlarged"
                    aria-label="Close menu"
                    onClick={closeMobileMenu}
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
            <div className="mobile-menu-overlay__rank-identity">
              <RankIdentityHeader
                displayName={accountDisplayName}
                avatarUrl={profileAvatarUrl}
                initials={accountInitials}
                isOnline
                level={menuJourneySummary.level}
                progress={menuRankProgress}
                tier={menuMembershipTier}
                hasPendingPromotion={pendingPromotion !== null}
                onOpenRank={() => setIsRankJourneyOpen(true)}
              />
            </div>
            {isRankJourneyOpen ? (
              <RankJourneyModal
                level={menuJourneySummary.level}
                progress={menuRankProgress}
                onClose={() => setIsRankJourneyOpen(false)}
              />
            ) : null}
            {pendingPromotion ? (
              (() => {
                const fromRank = getRankById(pendingPromotion.fromRankId);
                const toRank = getRankById(pendingPromotion.toRankId);
                if (!fromRank || !toRank) return null;
                const skippedRanks = pendingPromotion.skippedRankIds
                  .map((id) => getRankById(id))
                  .filter((rank): rank is NonNullable<typeof rank> => Boolean(rank));
                return (
                  <RankPromotionCelebration
                    fromRank={fromRank}
                    toRank={toRank}
                    skippedRanks={skippedRanks}
                    onContinue={acknowledgePromotion}
                  />
                );
              })()
            ) : null}
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
                        Review your identity details and ship access.
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
                    <div><dt>Ship Name</dt><dd>{accountShipName}</dd></div>
                    <div><dt>Ship Mode</dt><dd>{accountShipMode}</dd></div>
                    <div><dt>Birthday</dt><dd>{accountBirthday}</dd></div>
                    <div><dt>Gender</dt><dd>{accountGender}</dd></div>
                    <div><dt>Onboarding</dt><dd>{accountOnboardingStatus}</dd></div>
                  </dl>
                  <div className="mobile-menu-overlay__profile-dialog-actions">
                    <button
                      type="button"
                      className="mobile-menu-overlay__quick-action-btn"
                      onClick={openPlayersHandFromLauncher}
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
            <div className="mobile-menu-overlay__dashboard" aria-label="Game Mode dashboard menu">
              <div className="mobile-menu-overlay__hero-row">
                {isAdmin === true ? (
                  <button
                    type="button"
                    className="mobile-menu-overlay__hero-card mobile-menu-overlay__hero-card--quest mobile-menu-overlay__hero-card--quest-compact"
                    onClick={() => setIsMyQuestSubmenuOpen(true)}
                    aria-label="Open My Quest"
                  >
                    <span className="mobile-menu-overlay__quest-art" aria-hidden="true">
                      <img src="/assets/players_menu/questimg.webp" alt="" loading="lazy" decoding="async" />
                    </span>
                    <span className="mobile-menu-overlay__quest-cta" aria-hidden="true">›</span>
                  </button>
                ) : null}

                <button
                  type="button"
                  className="mobile-menu-overlay__hero-card mobile-menu-overlay__hero-card--hand mobile-menu-overlay__hero-card--hand-compact"
                  onClick={openPlayersHandFromLauncher}
                  aria-label="Open Player's Hand"
                >
                  <span className="mobile-menu-overlay__hero-copy mobile-menu-overlay__hero-copy--hand" />
                  <span className="mobile-menu-overlay__visual-slot mobile-menu-overlay__visual-slot--hand" aria-hidden="true">
                    <span
                      className="mobile-menu-overlay__card-stack"
                      style={{ '--stack-card-count': launcherTraitCards.length } as CSSProperties}
                    >
                      {launcherTraitCards.map((handCard, index) => {
                        const stackCenter = (launcherTraitCards.length - 1) / 2;
                        const stackDistance = index - stackCenter;
                        const stackSide = Math.sign(stackDistance);
                        // Pair the two closest side cards in the front lane; farther cards move into deeper lanes.
                        const stackDepth = Math.max(0, Math.floor(Math.abs(stackDistance) - 0.5));

                        return (
                          <span
                            key={`launcher-stack-${handCard.card.id}`}
                            className="mobile-menu-overlay__trait-card mobile-menu-overlay__trait-card--stacked"
                            style={{
                              '--card-color': handCard.card.color,
                              '--stack-x': `${stackSide * (56 + stackDepth * 48)}px`,
                              '--stack-y': `${6 + stackDepth * 12}px`,
                              '--stack-rotate': `${stackSide * (8 + stackDepth * 5)}deg`,
                              '--stack-perspective': `${stackSide * (18 + stackDepth * 8)}deg`,
                              '--stack-scale': `${0.92 - stackDepth * 0.05}`,
                              '--stack-z': index + 1,
                            } as CSSProperties}
                          >
                            <span className="mobile-menu-overlay__trait-card-role">{handCard.role}</span>
                            <span className="mobile-menu-overlay__trait-card-name">{handCard.card.icon} {handCard.card.name}</span>
                          </span>
                        );
                      })}
                      <span className="mobile-menu-overlay__archetype-card mobile-menu-overlay__archetype-card--stacked">
                        {playstyleIcon ? (
                          <span className="mobile-menu-overlay__hand-symbol">{playstyleIcon}</span>
                        ) : (
                          <span className="mobile-menu-overlay__hand-symbol">🪪</span>
                        )}
                        {dominantPlaystyleCard ? (
                          <span className="mobile-menu-overlay__archetype-name">{dominantPlaystyleCard.name}</span>
                        ) : null}
                      </span>
                    </span>
                  </span>
                  {microTestBadge.showBadge ? (
                    <span
                      className={`mobile-menu-overlay__micro-alert mobile-menu-overlay__micro-alert--bottom-right ${
                        showMicroTestNotificationDot ? 'mobile-menu-overlay__micro-alert--unseen' : ''
                      }`}
                      aria-label={`${microTestBadge.count} micro-tests ready`}
                      title={`${microTestBadge.count} micro-tests ready`}
                    >
                      <span className="mobile-menu-overlay__micro-alert-icon" aria-hidden="true">✦</span>
                      {showMicroTestNotificationDot ? (
                        <span className="mobile-menu-overlay__micro-alert-dot" aria-hidden="true" />
                      ) : null}
                    </span>
                  ) : null}
                </button>
              </div>

              <button
                type="button"
                className="mobile-menu-overlay__hero-card mobile-menu-overlay__hero-card--compass-placeholder"
                onClick={() => setIsCompassBookOpen(true)}
                aria-label="Open Compass Book"
              >
                <span className="mobile-menu-overlay__compass-placeholder-copy">
                  <span className="mobile-menu-overlay__compass-placeholder-title">Compass Book</span>
                  <span className="mobile-menu-overlay__compass-placeholder-subtitle">Open your six-chapter journey of self-discovery.</span>
                </span>
                <span className="mobile-menu-overlay__compass-placeholder-book" aria-hidden="true">
                  <span className="mobile-menu-overlay__compass-placeholder-page">Chapter I<br />Know Thyself</span>
                  <span className="mobile-menu-overlay__compass-placeholder-rose">✦</span>
                </span>
              </button>

              <div className="mobile-menu-overlay__quick-grid mobile-menu-overlay__quick-grid--featured">
                <button
                  type="button"
                  className="mobile-menu-overlay__mini-card mobile-menu-overlay__mini-card--coach"
                  onClick={() => handleMobileNavSelect('coach')}
                  aria-label="AI Coach - Get a guided next step"
                >
                  <span className="mobile-menu-overlay__online-pill" aria-hidden="true">ONLINE</span>
                  <span className="mobile-menu-overlay__menu-dots" aria-hidden="true">•••</span>
                  <span className="mobile-menu-overlay__mini-visual" aria-hidden="true">
                    <img src="/icons/ai_coach/Aicoach_large.webp" alt="" loading="lazy" decoding="async" />
                  </span>
                </button>

                <button
                  type="button"
                  className="mobile-menu-overlay__mini-card mobile-menu-overlay__mini-card--strength"
                  onClick={() => setIsProfileStrengthOpen(true)}
                  aria-label="Open Profile Strength"
                >
                  <span className="mobile-menu-overlay__profile-ring" style={profileStrengthRingStyle} aria-hidden="true">
                    <span className="mobile-menu-overlay__profile-ring-inner">
                      <span className="mobile-menu-overlay__profile-ring-top">PROFILE</span>
                      <span className="mobile-menu-overlay__profile-ring-value">{profileStrengthPercentLabel}</span>
                      <span className="mobile-menu-overlay__profile-ring-bottom">STRENGTH</span>
                    </span>
                  </span>
                </button>
              </div>

              <div className="mobile-menu-overlay__quick-grid mobile-menu-overlay__quick-grid--bottom">
                <button
                  type="button"
                  className="mobile-menu-overlay__mini-card mobile-menu-overlay__mini-card--utility"
                  onClick={() => handleMobileNavSelect('account', { launchSource: 'mobile-menu' })}
                  aria-label="Settings and profile"
                >
                  <span className="mobile-menu-overlay__utility-icon" aria-hidden="true">⚙️</span>
                  <span className="mobile-menu-overlay__utility-copy">
                    <span className="mobile-menu-overlay__mini-title">Settings</span>
                  </span>
                  <span className="mobile-menu-overlay__utility-chevron" aria-hidden="true">›</span>
                </button>

                <button
                  type="button"
                  className="mobile-menu-overlay__mini-card mobile-menu-overlay__mini-card--utility"
                  onClick={() => setIsFeedbackSupportSubmenuOpen(true)}
                  aria-label="Open feedback and support options"
                >
                  <span className="mobile-menu-overlay__utility-icon" aria-hidden="true">🫶</span>
                  <span className="mobile-menu-overlay__utility-copy">
                    <span className="mobile-menu-overlay__mini-title">Feedback</span>
                  </span>
                  <span className="mobile-menu-overlay__utility-chevron" aria-hidden="true">›</span>
                </button>
              </div>
            </div>
            {isMyQuestSubmenuOpen ? (
              <div
                className="mobile-menu-overlay__hold-modal mobile-menu-overlay__hold-modal--my-quest"
                role="dialog"
                aria-modal="true"
                aria-label="My Quest menu"
              >
                <button
                  type="button"
                  className="mobile-menu-overlay__hold-backdrop"
                  aria-label="Close My Quest menu"
                  onClick={() => setIsMyQuestSubmenuOpen(false)}
                />
                <div className="mobile-menu-overlay__hold-panel mobile-menu-overlay__submenu-sheet mobile-menu-overlay__submenu-sheet--my-quest">
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
                  {activeSession ? (
                    <MyQuestHub
                      session={activeSession}
                      onOpenStarterQuest={openStarterQuestSheetFromMyQuest}
                      onOpenCheckins={openCheckinsFromMyQuest}
                      onOpenGoals={openGoalsFromMyQuest}
                    />
                  ) : null}
                  <p className="mobile-menu-overlay__hold-eyebrow">More tools</p>
                  <div className="mobile-menu-overlay__submenu mobile-menu-overlay__submenu--open">
                    {myQuestSubmenuActions.map((action) => {
                      const featureId = action.featureId;
                      const availability = featureId ? getFeatureAvailability(featureId) : null;
                      const isFeatureOpen = featureId ? isAppWorkspaceFeatureOpen(featureId) : true;
                      const futureFeatureState = featureId && !isFeatureOpen
                        ? appFutureFeatureCardStates[featureId]
                        : undefined;
                      const submenuButtonClassName = getFutureFeatureCardClassName(
                        'mobile-menu-overlay__submenu-button',
                        futureFeatureState,
                        { isDemo: availability?.status === 'demo' },
                      );
                      const submenuButtonTitle = [
                        action.label,
                        availability?.status === 'demo' ? availability.publicLabel : '',
                        futureFeatureState?.voted ? 'Feedback sent' : '',
                      ].filter(Boolean).join(' • ');

                      return (
                        <button
                          key={action.id}
                          type="button"
                          className={submenuButtonClassName}
                          onClick={action.onSelect}
                          title={submenuButtonTitle}
                        >
                          <span className="mobile-menu-overlay__submenu-icon" aria-hidden="true">
                            {action.icon}
                          </span>
                          <span>{action.label}</span>
                          {availability && availability.status !== 'live' ? (
                            <FeatureStatusBadge
                              status={availability.status}
                              labelOverride={availability.publicLabel}
                              className="mobile-menu-overlay__submenu-badge"
                            />
                          ) : null}
                          {futureFeatureState?.voted ? (
                            <span className="future-feature-card__saved-dot" aria-hidden="true">✓</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
            {isQuestCompassModalOpen ? (
              <QuestCompassModal
                session={supabaseSession}
                onClose={() => setIsQuestCompassModalOpen(false)}
                onAskAiGuide={openQuestCompassCoachPrompt}
                onRefreshAlignment={openQuestCompassCheckins}
                onStartNextQuest={openQuestCompassNextQuest}
                onOpenGoals={openQuestCompassGoals}
                onOpenJournal={openQuestCompassJournal}
              />
            ) : null}
            {isCompassBookOpen ? (
              <CompassBookScreen
                currentIslandNumber={overlayIslandNumber}
                session={supabaseSession}
                onClose={() => setIsCompassBookOpen(false)}
              />
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
                      <div className="mobile-menu-overlay__profile-ring" style={profileStrengthRingStyle} aria-hidden="true">
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
                <p className="mobile-gamification-overlay__stat-hint">Ask for a quick nudge or recharge reset.</p>
              </div>
            </button>
            <button
              type="button"
              className={`mobile-gamification-overlay__stat mobile-gamification-overlay__stat--cta mobile-gamification-overlay__stat--daily-treats mobile-gamification-overlay__stat-button${
                hasSeenDailyTreats ? '' : ' mobile-gamification-overlay__stat--pulse'
              }`}
              onClick={launchDailyTreatsMenu}
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
                  Open your Personal Quest calendar for today's treat.
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
                  <p className="mobile-gamification-overlay__mini-label">Lotus Flowers</p>
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

  const quickGainsOptionalItems = [
    ...(!hasSeenDailyTreats
      ? [
          {
            id: 'daily-treats',
            title: 'Open Daily Treats',
            description: 'Open your Personal Quest calendar and claim today’s treat.',
          },
        ]
      : []),
    ...(activeHolidaySeason && !hasOpenedHolidayCalendarToday
      ? [
          {
            id: 'holiday-calendar',
            title: `Open ${activeHolidaySeason.meta.displayName} Calendar`,
            description: "Open today's holiday calendar door for a seasonal bonus.",
          },
        ]
      : []),
  ];
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

  const handleCloseLevelWorldsEntry = () => {
    setShowLevelWorldsFromEntry(false);
    setLevelWorldsEntryPanel('default');
    if (reopenGameBoardOverlayOnLevelWorldsClose) {
      setShowGameBoardOverlay(true);
      setReopenGameBoardOverlayOnLevelWorldsClose(false);
    }
  };

  const shouldShowLevelWorldsMobileExitOverlay = Boolean(
    showLevelWorldsFromEntry && activeSession && isMobileViewport,
  );


  const levelWorldsEntryModal = showLevelWorldsFromEntry && activeSession ? (
    <div
      className={`level-worlds-entry-modal${shouldShowLevelWorldsMobileExitOverlay ? ' level-worlds-entry-modal--mobile-exit' : ''}`}
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
          onClose={handleCloseLevelWorldsEntry}
          isAdmin={isAdmin === true}
          onOpenSaveAccountSignup={handleOpenSaveAccountSignup}
          onOpenDailySpinWheel={() => setShowDailySpinWheel(true)}
          dailySpinAvailable={spinAvailable}
          dailySpinCount={spinsAvailable}
        />
      </RecoverableErrorBoundary>
    </div>
  ) : null;

  const levelWorldsMobileExitOverlay = shouldShowLevelWorldsMobileExitOverlay ? (
    <div className="level-worlds-mobile-exit-overlay">
      <button
        type="button"
        className="level-worlds-mobile-exit-overlay__button"
        onClick={handleCloseLevelWorldsEntry}
        aria-label="Back to main app"
      >
        ← Back
      </button>
    </div>
  ) : null;

  const countdownCalendarModal = (
    <CountdownCalendarModal
      isOpen={showCalendarPlaceholder}
      onClose={() => handleRewardModalClose(() => {
        const shouldContinueDayChangeSequence = isDayChangeDailyTreatSequenceActive;
        setShowCalendarPlaceholder(false);
        setHolidayPreviewKey(null);
        setCalendarLaunchMode('auto');
        setIsDayChangeDailyTreatSequenceActive(false);
        void refreshDailyTreatsOpenedState();
        void refreshHolidayCalendarOpenedState();
        if (shouldContinueDayChangeSequence) {
          handleLaunchYesterdayTodoCleanup({ force: false });
        }
      })}
      userId={activeSession?.user?.id}
      islandRunSession={activeSession}
      previewHolidayKey={holidayPreviewKey}
      mode={calendarLaunchMode}
    />
  );

  const isIslandFullscreenActive = showGameBoardOverlay || showLevelWorldsFromEntry;
  const mobileTopChromeDeviceClass =
    isMobileExperience && isMobileViewport && !isIslandFullscreenActive ? getTopDisplayClass() : null;
  const shouldShowMobileTopChrome = mobileTopChromeDeviceClass !== null;
  const islandFullscreenClassName = isIslandFullscreenActive ? ' app--island-fullscreen' : '';
  const mobileTopChromeClassName = shouldShowMobileTopChrome ? ' app--mobile-top-chrome' : '';
  const launcherPlayersHandOverlay = isLauncherHandOverlayOpen && archetypeHand ? (
    <PlayersHandSparkPreview
      hand={archetypeHand}
      title="My Player Hand"
      openOnMount
      overlayOnly
      overlayVariant="fullscreen"
      onOverlayClose={() => {
        setIsLauncherHandOverlayOpen(false);
        setIsMobileMenuOpen(true);
        handleMobileFooterExpand(true);
      }}
      onOpenProfile={() => {
        setIsLauncherHandOverlayOpen(false);
        setIsMobileMenuOpen(true);
        setIsMobileProfileDialogOpen(true);
        handleMobileFooterExpand(true);
      }}
    />
  ) : null;
  const starterQuestSheet =
    isMobileExperience && isStarterQuestSheetOpen && activeSession ? (
      <div className="starter-quest-sheet" role="dialog" aria-modal="true" aria-label="Starter Quest picker">
        <button
          type="button"
          className="starter-quest-sheet__backdrop"
          aria-label="Close Starter Quest picker"
          onClick={closeStarterQuestSheet}
        />
        <div className="starter-quest-sheet__panel" role="document">
          <button
            type="button"
            className="starter-quest-sheet__close"
            aria-label="Close Starter Quest picker"
            onClick={closeStarterQuestSheet}
          >
            ✕
          </button>
          <StarterHabitPicker
            userId={activeSession.user.id}
            initialDomainKey={starterQuestInitialDomainKey ?? undefined}
            onCreated={handleStarterQuestCreated}
            onClose={closeStarterQuestSheet}
          />
        </div>
      </div>
    ) : null;
  const closeAppPreviewOverlay = () => {
    if (appPreviewFeature?.id === 'app.body' || isBlockedBodyWorkspaceActive) {
      leaveBlockedBodyWorkspace();
    }
    if (appPreviewFeature?.id === 'app.contracts' || isBlockedContractsWorkspaceActive) {
      leaveBlockedContractsWorkspace();
    }
    if (appPreviewFeature?.id === 'app.routines' || isBlockedRoutinesWorkspaceActive) {
      leaveBlockedRoutinesWorkspace();
    }
    setAppPreviewFeature(null);
  };

  const previewOverlayFeature = appPreviewFeature ?? (
    isBlockedBodyWorkspaceActive
      ? { id: 'app.body' as const, label: 'Body', variant: undefined }
      : isBlockedContractsWorkspaceActive
        ? { id: 'app.contracts' as const, label: 'Promises', variant: undefined }
        : isBlockedRoutinesWorkspaceActive
          ? { id: 'app.routines' as const, label: 'Routines', variant: undefined }
      : null
  );

  const appPreviewOverlay = previewOverlayFeature ? (
      <FeaturePreviewOverlay
        featureId={previewOverlayFeature.id}
        label={previewOverlayFeature.label}
        variant={previewOverlayFeature.variant}
        backLabel="Back"
        onClose={closeAppPreviewOverlay}
      />
  ) : null;

  const firstRunOverlay = (
    <>
      {firstRunStep === 'spotlight-game' ? (
        <div className="first-run-scrim" aria-hidden="true" />
      ) : null}
      {firstRunStep === 'welcome' ? (
        <FounderWelcome onComplete={handleCompleteFounderWelcome} />
      ) : null}
    </>
  );

  if (isMobileExperience && showMobileHome) {
    const mobileHomeAppClassName = `app app--workspace app--mobile-frame app--mobile-home-frame${
      isAnyModalVisible ? ' app--auth-overlay' : ''
    }${islandFullscreenClassName}${mobileTopChromeClassName}`;
    return (
        <div className={mobileHomeAppClassName}>
          {shouldShowMobileTopChrome ? <MobileTopChrome deviceClass={mobileTopChromeDeviceClass} /> : null}
          <div className="app-sync-indicator">
            <SyncIndicator />
          </div>
          <div className="workspace-shell">
            <MobileHabitHome
              session={activeSession}
              showPointsBadges={shouldShowPointsBadges}
              onVisionRewardOpenChange={setIsVisionRewardOpen}
              profileStrengthSnapshot={profileStrengthSnapshot}
              profileStrengthSignals={profileStrengthSignals}
              personalitySummary={personalitySummary}
              onOpenDailyTreat={launchDailyTreatsMenu}
              onOpenHolidayCalendar={launchHolidayCalendar}
              onOpenIslandRunStop={(stopId) => {
                setIslandRunOpenStopParam(stopId);
                setReopenGameBoardOverlayOnLevelWorldsClose(false);
                setLevelWorldsEntryPanel('default');
                setShowLevelWorldsFromEntry(true);
              }}
              onOpenAiCoach={(starterQuestion) => {
                setAiCoachStarterQuestion(starterQuestion ?? undefined);
                setShowAiCoachModal(true);
              }}
              forceCompactView={!isGameModeActive}
              preferredCompactView={!isGameModeActive ? true : workspaceProfile?.private_compact_view_enabled ?? false}
              onPreferredCompactViewChange={handlePreferredCompactViewChange}
              hideTimeBoundOffers={!isGameModeActive}
              activeHolidaySeason={activeHolidaySeason}
              hasOpenedDailyTreatsToday={hasOpenedDailyTreatsToday}
              hasOpenedDailyTreatBonusToday={hasOpenedDailyTreatBonusToday}
              hasDailyTreatBonusDoorToday={hasDailyTreatBonusDoorToday}
              hasOpenedHolidayCalendarToday={hasOpenedHolidayCalendarToday}
              hiddenHabitIds={[]}
              onOpenStarterQuest={openMyQuestMenuFromToday}
              isContractsFeatureOpen={isContractsWorkspaceOpen}
              isRoutinesFeatureOpen={isRoutinesWorkspaceOpen}
              onNavigateToContracts={openContractsWorkspace}
              onNavigateToRoutines={openRoutinesWorkspace}
              isAdminOrCreator={isAdmin === true}
              onOpenFeaturePreview={openFeaturePreviewOverlay}
              deferDailyLifeUpgradeModal={shouldDeferDailyLifeUpgradeModal}
              deferYesterdayTodoCleanupModal={shouldDeferYesterdayTodoCleanupModal}
            />
          </div>
        {!showGameBoardOverlay && !showZenGardenFullScreen && !isConflictResolverFullscreen && (
          <MobileFooterNav
            items={mobileFooterNavItems}
            status={mobileFooterStatus}
            activeId={null}
            onSelect={firstRunStep === 'spotlight-game' ? () => {} : handleMobileNavSelect}
            onStatusClick={
              firstRunStep === 'spotlight-game' ? handleFirstRunGameTap : handleMobileGameStatusClick
            }
            onStatusHoldToggle={handleMobileGameStatusHoldToggle}
            spotlightStatus={firstRunStep === 'spotlight-game'}
            onOpenMenu={() => {
              setIsMobileMenuOpen(true);
              setIsEnergyMenuOpen(false);
            }}
            isDiodeActive={isFooterControllerLayoutActive}
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
        {starterQuestSheet}
        {mobileMenuOverlay}
        {launcherPlayersHandOverlay}
        {mobileGamificationOverlay}
        {levelWorldsEntryModal}
        {levelWorldsMobileExitOverlay}
        {appPreviewOverlay}
        {firstRunOverlay}
        <GameBoardOverlay
          isOpen={showGameBoardOverlay}
          spotlightPlay={firstRunStep === 'spotlight-play'}
          onClose={() => setShowGameBoardOverlay(false)}
          onTopbarClick={() => handleMobileNavSelect('planning')}
          onPlayClick={() => {
            if (firstRunStep === 'spotlight-play') {
              completeFirstRunStartFlow();
            }
            setShowGameBoardOverlay(false);
            setReopenGameBoardOverlayOnLevelWorldsClose(true);
            setLevelWorldsEntryPanel('default');
            setShowLevelWorldsFromEntry(true);
          }}
          onSpinWinClick={() => handleMobileNavSelect('score')}
          onCreatureCollectionClick={() => handleMobileNavSelect('breathing-space')}
          onGarageClick={() => handleMobileNavSelect('actions')}
          onCompassClick={openFullMobileMenuFromGameOverlay}
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
          spinsRemaining={overlaySpinsRemaining}
          islandSceneSrc={currentIslandBackgroundSrc}
          islandTimeLabel={islandTimeLabelForOverlay}
          spinWinResetAtMs={spinWinResetAtMs}
          showSpinWheel={overlayShowSpinWheel}
          showLuckyRoll={false}
          creatureCollectionCount={creatureCollectionSummary.total}
          creatureRewardReadyCount={creatureCollectionSummary.rewardsReady}
          realLife={overlayRealLifeInput}
          viewerId={overlayRealLifeUserId ?? undefined}
          {...combinedJourneyChestProps}
          {...rankSpineProps}
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
  }${islandFullscreenClassName}${mobileTopChromeClassName}`;
  const workspaceShellClassName = `workspace-shell ${
    isAnyModalVisible ? 'workspace-shell--blurred' : ''
  }${!isMobileExperience && !isDesktopMenuOpen ? ' workspace-shell--menu-collapsed' : ''}`;

  const canDismissOverlay = isAuthOverlayVisible && !shouldForceAuthOverlay;

  return (
    <div className={appClassName}>
      {shouldShowMobileTopChrome ? <MobileTopChrome deviceClass={mobileTopChromeDeviceClass} /> : null}
      <div className="app-sync-indicator">
        <SyncIndicator />
      </div>
      <div className={workspaceShellClassName}>
        {!isMobileExperience && !isDesktopMenuOpen && (
            <button
              type="button"
              className="workspace-shell__menu-edge"
              aria-label="Open ship menu"
              onClick={() => setIsDesktopMenuOpen(true)}
            />
        )}
        {!isMobileExperience && (
          <aside
            className="workspace-sidebar"
            aria-label="Ship navigation"
            aria-hidden={!isDesktopMenuOpen}
          >
            <div className="workspace-sidebar__masthead">
              <a className="workspace-sidebar__brand" href="/" aria-label="HabitGame home">
                <span aria-hidden="true">{menuIconContent}</span>
                <span className="sr-only">HabitGame</span>
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
                    const appFeatureId = APP_WORKSPACE_FEATURE_IDS[item.id];
                    const isFeatureOpen = appFeatureId ? isAppWorkspaceFeatureOpen(appFeatureId) : true;
                    const futureFeatureState = appFeatureId && !isFeatureOpen
                      ? appFutureFeatureCardStates[appFeatureId]
                      : undefined;
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
                    if (item.id === 'body') {
                      openBodyWorkspace();
                      return;
                    }
                    if (item.id === 'contracts') {
                      openContractsWorkspace();
                      return;
                    }
                    if (item.id === 'routines') {
                      openRoutinesWorkspace();
                      return;
                    }
                    setActiveWorkspaceNav(item.id);
                  };
                  const navButtonTitle = [
                    item.summary ? `${item.label} • ${item.summary}` : item.label,
                    futureFeatureState?.voted ? 'Feedback sent' : '',
                  ].filter(Boolean).join(' • ');
                  const navButtonClassName = getFutureFeatureCardClassName(
                    `workspace-sidebar__nav-button ${
                      isActive ? 'workspace-sidebar__nav-button--active' : ''
                    }`,
                    futureFeatureState,
                    { isDemo: Boolean(appFeatureId && getFeatureAvailability(appFeatureId).status === 'demo') },
                  );
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={navButtonClassName}
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
                      {futureFeatureState?.voted ? (
                        <span className="future-feature-card__saved-dot" aria-hidden="true">✓</span>
                      ) : null}
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
      {isMobileExperience && !showGameBoardOverlay && !showZenGardenFullScreen && !isConflictResolverFullscreen ? (
        <MobileFooterNav
          items={mobileFooterNavItems}
          status={mobileFooterStatus}
          activeId={mobileActiveNavId}
          onSelect={firstRunStep === 'spotlight-game' ? () => {} : handleMobileNavSelect}
          onStatusClick={
            firstRunStep === 'spotlight-game' ? handleFirstRunGameTap : handleMobileGameStatusClick
          }
          onStatusHoldToggle={handleMobileGameStatusHoldToggle}
          spotlightStatus={firstRunStep === 'spotlight-game'}
          onOpenMenu={() => {
            setIsMobileMenuOpen(true);
            setIsEnergyMenuOpen(false);
          }}
          isDiodeActive={isFooterControllerLayoutActive}
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
      {launcherPlayersHandOverlay}
      {mobileGamificationOverlay}
      {levelWorldsEntryModal}
      {levelWorldsMobileExitOverlay}
      {appPreviewOverlay}
      {firstRunOverlay}
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
          setCalendarLaunchMode('holiday');
          setShowCalendarPlaceholder(true);
        }}
      />

      {/* Game Board Overlay */}
      <GameBoardOverlay
        isOpen={showGameBoardOverlay}
        spotlightPlay={firstRunStep === 'spotlight-play'}
        onClose={() => setShowGameBoardOverlay(false)}
        onTopbarClick={() => handleMobileNavSelect('planning')}
        onPlayClick={() => {
          if (firstRunStep === 'spotlight-play') {
            completeFirstRunStartFlow();
          }
          setShowGameBoardOverlay(false);
          setReopenGameBoardOverlayOnLevelWorldsClose(true);
          setLevelWorldsEntryPanel('default');
          setShowLevelWorldsFromEntry(true);
        }}
        onSpinWinClick={() => handleMobileNavSelect('score')}
        onCreatureCollectionClick={() => handleMobileNavSelect('breathing-space')}
        onGarageClick={() => handleMobileNavSelect('actions')}
        onCompassClick={openFullMobileMenuFromGameOverlay}
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
        spinsRemaining={overlaySpinsRemaining}
        islandSceneSrc={currentIslandBackgroundSrc}
        islandTimeLabel={islandTimeLabelForOverlay}
        spinWinResetAtMs={spinWinResetAtMs}
        showSpinWheel={overlayShowSpinWheel}
        showLuckyRoll={false}
        creatureCollectionCount={creatureCollectionSummary.total}
        creatureRewardReadyCount={creatureCollectionSummary.rewardsReady}
        realLife={overlayRealLifeInput}
        viewerId={overlayRealLifeUserId ?? undefined}
        {...combinedJourneyChestProps}
        {...rankSpineProps}
      />

      {isAuthOverlayVisible ? (
        <div className="auth-overlay" role="dialog" aria-modal="true" aria-label="Authenticate with HabitGame">
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
            {habitGameAuthCard}
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
      {showTipOfDay && (
        <TipOfDayModal session={activeSession} onClose={() => setShowTipOfDay(false)} />
      )}
      {showDailySpinWheel && (
        <NewDailySpinWheel session={activeSession} onClose={() => handleRewardModalClose(() => setShowDailySpinWheel(false))} />
      )}
      {quickGainsModal}
      {countdownCalendarModal}
      {starterQuestSheet}

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
