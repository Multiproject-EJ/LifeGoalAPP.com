import { useCallback, useEffect, useMemo, useRef, useState, useId, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { LIFE_WHEEL_CATEGORIES, type LifeWheelCategoryKey } from '../checkins/LifeWheelCheckins';
import type { ProfileStrengthSignalSnapshot } from '../profile-strength/profileStrengthData';
import type { ProfileStrengthResult } from '../profile-strength/profileStrengthTypes';
import {
  clearHabitCompletion,
  fetchHabitLogsForRange,
  fetchHabitsForUser,
  getHabitLogQueueStatus,
  logHabitCompletion,
  syncQueuedHabitLogs,
  type LegacyHabitWithGoal as HabitWithGoal,
} from '../../compat/legacyHabitsAdapter';
import { useGamification } from '../../hooks/useGamification';
import { XP_REWARDS } from '../../types/gamification';
import { recordChallengeActivity } from '../../services/challenges';
import { recordTelemetryEvent } from '../../services/telemetry';
import { fetchCurrentSeason, getActiveAdventMeta, getPersonalQuestSeason } from '../../services/treatCalendarService';
import { XP_TO_GOLD_RATIO, convertXpToGold } from '../../constants/economy';
import { PointsBadge } from '../../components/PointsBadge';
import {
  getHabitCompletionsByMonth,
  getHabitCompletionQueueStatus,
  getMonthlyCompletionGrid,
  syncQueuedHabitCompletions,
  toggleHabitCompletionForDate,
  type HabitCompletionQueueStatus,
  type MonthlyHabitCompletions,
} from '../../services/habitMonthlyQueries';
import type { Database, Json } from '../../lib/database.types';
import { isDemoSession } from '../../services/demoSession';
import { fetchVisionImages, getVisionImagePublicUrl } from '../../services/visionBoard';
import { generateSpecialVisionStar, persistSpecialVisionStarImage } from '../../services/visionStarSpecial';
import { HabitAlertConfig } from './HabitAlertConfig';
import {
  createJournalEntry,
  listJournalEntries,
  updateJournalEntry,
  type JournalEntry,
} from '../../services/journal';
import { fetchCompletedActionsForDate } from '../../services/actions';
import { updateSpinsAvailable } from '../../services/dailySpin';
import { useDailySpinStatus } from '../../hooks/useDailySpinStatus';
import { isIslandRunFeatureEnabled } from '../../config/islandRunFeatureFlags';
import { fetchGoals, insertGoal } from '../../services/goals';
import { getHabitReminderQueueStatus, syncQueuedHabitReminderPrefs } from '../../services/habitReminderPrefs';
import {
  archiveHabitV2,
  getHabitsV2QueueStatus,
  pauseHabitV2,
  deactivateHabitV2,
  syncQueuedHabitsV2Mutations,
  updateHabitFullV2,
  type HabitV2Row,
} from '../../services/habitsV2';
import { autoResumeDueHabits } from '../../services/habitLifecycleAutoResume';
import { cancelHabitNotifications } from '../../services/habitAlertNotifications';
import {
  AUTO_PROGRESS_TIERS,
  AUTO_PROGRESS_UPGRADE_RULES,
  buildAutoProgressPlan,
  getHabitScalePlan,
  getStageCreditMultiplier,
  getAutoProgressState,
  getNextDownshiftTier,
  getNextUpgradeTier,
  type AutoProgressShift,
  type AutoProgressTier,
} from './autoProgression';
import {
  assessHabitHealth,
  getHabitHealthBadgeLabel,
  shouldAutoArchiveHabitFromReview,
  type HabitHealthState,
} from './habitHealth';
import {
  getDefaultHabitRewardGold,
  isEligibleTimeLimitedOfferHabit,
  rankHabitsForTimeLimitedOffer,
} from './timeLimitedOffer';
import { HabitImprovementAnalysisModal } from './HabitImprovementAnalysisModal';
import { buildEnhancedRationale } from './aiRationale';
import { generateHabitSuggestion, type HabitAiSuggestion } from '../../services/habitAiSuggestions';
import {
  getProgressStateIcon,
  getProgressStateLabel,
  getProgressStateColorClass,
  PROGRESS_STATE_EFFECTS,
  type ProgressState,
} from './progressGrading';
import './progressGrading.css';
import {
  getYesterdayRecapEnabled,
  getYesterdayRecapLastCollected,
  getYesterdayRecapLastShown,
  setYesterdayRecapLastCollected,
  setYesterdayRecapLastShown,
} from '../../services/yesterdayRecapPrefs';
import { CelebrationAnimation } from '../../components/CelebrationAnimation';
import { fetchXPTransactions } from '../../services/gamification';
import { fetchZenTokenTransactions } from '../../services/zenGarden';
import { awardDice, getRewardHistory } from '../../services/gameRewards';
import { createDicePackCheckoutSession } from '../../services/billing';
import {
  initiateMinigameTicketCheckout,
  resolveMinigameTicketSku,
} from '../../services/minigameTicketStore';
import { TimeBoundOfferRow, type TimeBoundOfferItem, type TimeBoundOfferId } from './TimeBoundOfferRow';
import { readIslandRunRuntimeState } from '../gamification/level-worlds/services/islandRunRuntimeState';
import { EVENT_IDS, type EventId } from '../gamification/level-worlds/services/islandRunEventEngine';
import { generateIslandStopPlan } from '../gamification/level-worlds/services/islandRunStops';
import { DEFAULT_GOAL_STATUS } from '../goals/goalStatus';
import { triggerCompletionHaptic } from '../../utils/completionHaptics';
import {
  getHabitFeedbackClassName,
  getHabitFeedbackType,
  triggerHabitHapticFeedback,
  type HabitFeedbackType,
} from '../../utils/habitFeedback';
import { playChime } from '../../utils/audioUtils';
import type { CommitmentContract } from '../../types/gamification';
import {
  cancelContract,
  fetchActiveContracts,
  pauseContract,
  recordContractProgress,
  recordWitnessPing,
  resumeContract,
  syncContractProgressWithTarget,
} from '../../services/commitmentContracts';
import './HabitAlertConfig.css';
import './HabitRecapPrompt.css';
import { HabitPauseDialog } from './HabitPauseDialog';
import { RoutinesTodayLane } from '../routines';
import {
  getQuestHabit,
  setQuestHabit,
  clearQuestHabit,
  type QuestHabit,
} from '../../services/questHabit';

// Constants
const DONE_ISH_DEFAULT_PERCENTAGE = 85;
const HABIT_SWIPE_MAX_PX = 132;
const HABIT_SWIPE_ARM_THRESHOLD_PX = 84;
const HABIT_SWIPE_SUPPRESS_CLICK_MS = 260;
const HABIT_SFX_ENABLED_STORAGE_KEY = 'lifegoal.habits.sfx.enabled';

function isHabitSfxEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const rawPreference = window.localStorage.getItem(HABIT_SFX_ENABLED_STORAGE_KEY);
  return rawPreference !== 'false';
}

function playHabitCompleteSfx(): void {
  if (!isHabitSfxEnabled()) {
    return;
  }

  playChime([880, 1320, 1760], 65, 0.13, 0.12);
}

function playHabitSkipSfx(): void {
  if (!isHabitSfxEnabled()) {
    return;
  }

  const AudioContextCtor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) {
    return;
  }

  const context = new AudioContextCtor();
  const duration = 0.22;
  const frameCount = Math.max(1, Math.floor(context.sampleRate * duration));
  const noiseBuffer = context.createBuffer(1, frameCount, context.sampleRate);
  const data = noiseBuffer.getChannelData(0);

  for (let index = 0; index < frameCount; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / frameCount);
  }

  const source = context.createBufferSource();
  source.buffer = noiseBuffer;

  const filter = context.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1300, context.currentTime);
  filter.frequency.exponentialRampToValueAtTime(420, context.currentTime + duration);
  filter.Q.setValueAtTime(0.9, context.currentTime);

  const gainNode = context.createGain();
  gainNode.gain.setValueAtTime(0.0001, context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.06, context.currentTime + 0.035);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);

  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(context.destination);

  source.start(context.currentTime);
  source.stop(context.currentTime + duration);
}

function getNextUtcMidnightMs(): number {
  const now = new Date();
  const next = new Date(now);
  next.setUTCDate(now.getUTCDate() + 1);
  next.setUTCHours(0, 0, 0, 0);
  return next.getTime();
}

function getTodayUtcDateKey(): string {
  return new Date().toISOString().split('T')[0];
}

function isCanonicalEventId(value: string | null | undefined): value is EventId {
  return Boolean(value) && EVENT_IDS.includes(value as EventId);
}

function isInteractiveHabitChild(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest('button, input, textarea, select, a, [role="menu"], [data-swipe-ignore="true"]'),
  );
}

type DailyHabitTrackerVariant = 'full' | 'compact';

type DailyHabitTrackerProps = {
  session: Session;
  variant?: DailyHabitTrackerVariant;
  showPointsBadges?: boolean;
  onVisionRewardOpenChange?: (isOpen: boolean) => void;
  profileStrengthSnapshot?: ProfileStrengthResult | null;
  profileStrengthSignals?: ProfileStrengthSignalSnapshot | null;
  personalitySummary?: string | null;
  onOpenDailyTreat?: () => void;
  onOpenIslandRunStop?: (stopId: 'boss' | 'hatchery' | 'dynamic') => void;
  /**
   * Phase 2 (Minigame & Events Consolidation Plan §2.4): when provided, the
   * Today's Offer modal renders a "Daily Spin Wheel" launch button at the
   * bottom that invokes this callback. Only has an effect while the
   * `todaysOfferSpinEntryEnabled` feature flag is on.
   */
  onOpenDailySpinWheel?: () => void;
  forceCompactView?: boolean;
  preferredCompactView?: boolean;
  hideTimeBoundOffers?: boolean;
  pendingOfferToOpen?: TimeBoundOfferId | null;
  onPendingOfferHandled?: () => void;
  hiddenHabitIds?: string[];
};

type HabitCompletionState = {
  logId: string | null;
  completed: boolean;
  progressState?: ProgressState;
  completionPercentage?: number;
  loggedStage?: AutoProgressTier | null;
};

type HabitSwipeDirection = 'left' | 'right';
type HabitSwipeAction = 'complete' | 'undo-complete' | 'skip' | 'undo-skip';

/**
 * Monthly completion state for a single habit across all days in the selected month.
 * Maps date strings (YYYY-MM-DD) to completion state for each day.
 * 
 * Example:
 * {
 *   "2024-01-01": { logId: "abc123", completed: true },
 *   "2024-01-02": { logId: null, completed: false },
 *   // ... rest of month
 * }
 */
type HabitMonthlyCompletionState = Record<string, HabitCompletionState>;

type HabitLogInsert = {
  habit_id: string;
  date: string;
  completed: boolean;
  progress_state?: string;
  completion_percentage?: number;
  logged_stage?: AutoProgressTier;
  id?: string;
};

type HabitLogRow = {
  id: string;
  habit_id: string;
  date: string;
  completed: boolean;
  progress_state?: string | null;
  completion_percentage?: number | null;
  logged_stage?: string | null;
};

type HabitInsights = {
  scheduledToday: boolean;
  currentStreak: number;
  longestStreak: number;
  lastCompletedOn: string | null;
};

type HabitEditDraft = {
  id: string;
  name: string;
  schedule: Json | null;
  goalId: string | null;
};

type TodayWinsSummary = {
  journalCount: number;
  lotusEarned: number;
  xpEarned: number;
  gameRewardsTotal: number;
  gameGoldEarned: number;
  gameDiceEarned: number;
  gameTokensEarned: number;
  gameHeartsEarned: number;
};

type TodayWinsTier = 'one_star' | 'two_star' | 'three_star';

type QuickJournalDraft = {
  isOpen: boolean;
  mode: QuickJournalMode;
  morning: string;
  day: string;
  evening: string;
  interactions: string;
  freeform: string;
  energy: number;
  mood: number;
  focus: number;
  stress: number;
  dreamTitle?: string;
  dreamSymbols?: string;
  dreamEmotions?: string;
  dreamReflection?: string;
};

type IntentionsJournalDraft = {
  isOpen: boolean;
  type: 'today' | 'tomorrow';
  content: string;
};

type DayStatus = 'skip' | 'vacation' | 'sick';
type QuickJournalMode = 'written' | 'pulse' | 'dream';

type VisionImageRow = Database['public']['Tables']['vision_images']['Row'];

type VisionImage = VisionImageRow & { publicUrl: string };

type VisionReward = {
  imageUrl: string;
  caption: string | null;
  xpAwarded: number;
  diceAwarded: number;
  isSuperBoost: boolean;
  isSpecial?: boolean;
  specialStoryPanels?: string[];
};

type HabitReviewAction = 'pause' | 'redesign' | 'replace' | 'archive';

type HabitReviewAiDraft = {
  suggestion: HabitAiSuggestion;
  rationale: string;
};

const STREAK_LOOKBACK_DAYS = 60;
const AUTO_PROGRESS_STAGE_LABELS: Record<AutoProgressTier, string> = {
  seed: 'Easy',
  minimum: 'Medium',
  standard: 'Hard',
};

const SCALE_STAGE_ORDER: AutoProgressTier[] = ['seed', 'minimum', 'standard'];

const TODAY_WINS_IMAGES: Record<TodayWinsTier, string> = {
  one_star: '/icons/todays_win/todays_win1.webp',
  two_star: '/icons/todays_win/todays_win2.webp',
  three_star: '/icons/todays_win/todays_win3.webp',
};

const getTodayWinsTier = (score: number): TodayWinsTier => {
  if (score >= 75) return 'three_star';
  if (score >= 40) return 'two_star';
  return 'one_star';
};

// Vision star slot machine animation constants
const SLOT_MACHINE_ANIMATION_DURATION_MS = 2500;
const SLOT_MACHINE_LANDING_DURATION_MS = 500;
const SLOT_MACHINE_TOTAL_ITEMS = 15;
const SLOT_MACHINE_SELECTED_INDEX = 12;

const LIFE_WHEEL_COLORS: Record<string, string> = {
  health: '#22c55e',
  relationships: '#fb7185',
  career: '#60a5fa',
  personal_growth: '#a855f7',
  fun: '#f97316',
  finances: '#facc15',
  giving_back: '#14b8a6',
  environment: '#38bdf8',
  spirituality: '#7c3aed',
  creativity: '#f472b6',
  community: '#0ea5e9',
  mindset: '#8b5cf6',
  wellness: '#34d399',
  rest: '#60a5fa',
};

const OFFLINE_SYNC_MESSAGE = 'You\u2019re offline. Updates will sync automatically once you reconnect.';
const QUEUE_RETRY_MESSAGE = 'Offline updates are still queued and will retry shortly.';

type HabitOfflineQueueStatus = {
  pending: number;
  failed: number;
};
const LIFE_WHEEL_UNASSIGNED = 'unassigned';
const GOAL_UNASSIGNED = 'unassigned';
const QUICK_JOURNAL_PULSE_DEFAULTS = {
  energy: 6,
  mood: 6,
  focus: 6,
  stress: 4,
};
const QUICK_JOURNAL_DREAM_DEFAULTS = {
  title: '',
  symbols: '',
  emotions: '',
  reflection: '',
};

const quickJournalDraftKey = (userId: string, dateISO: string) =>
  `lifegoal.quick-journal:${userId}:${dateISO}`;
const legacyIntentionsJournalDraftKey = (userId: string, dateISO: string) =>
  `lifegoal.intentions-journal:${userId}:${dateISO}`;
const intentionsJournalDraftKey = (userId: string, dateISO: string, type: 'today' | 'tomorrow') =>
  `lifegoal.intentions-journal:${userId}:${dateISO}:${type}`;
const intentionsNoticeStorageKey = (userId: string, dateISO: string) =>
  `lifegoal.intentions-notice:${userId}:${dateISO}`;
const intentionsMeetStorageKey = (userId: string, dateISO: string) =>
  `lifegoal.intentions-meet:${userId}:${dateISO}`;
const dayStatusStorageKey = (userId: string) => `lifegoal.day-status:${userId}`;
const visionStarStorageKey = (userId: string, dateISO: string) =>
  `lifegoal.vision-star:${userId}:${dateISO}`;
const visionStarRewardKey = (userId: string, dateISO: string) =>
  `lifegoal.vision-star-reward:${userId}:${dateISO}`;
const visionStarCountKey = (userId: string) => `lifegoal.vision-star-count:${userId}`;
const weeklySpecialVisionStarKey = (userId: string, weekStartISO: string) =>
  `lifegoal.special-vision-star-week:${userId}:${weekStartISO}`;
const weeklyHabitReviewShownKey = (userId: string, weekStartISO: string) =>
  `lifegoal.weekly-habit-review-shown:${userId}:${weekStartISO}`;
const weeklyHabitReviewLaunchKey = (userId: string) =>
  `lifegoal.weekly-habit-review-launch:${userId}`;
const dailyCatchUpLaunchKey = (userId: string) =>
  `lifegoal.daily-catchup-launch:${userId}`;
const timeLimitedOfferScheduleKey = (userId: string, dateISO: string) =>
  `lifegoal.time-limited-offer-schedule:${userId}:${dateISO}`;

type HabitPromptWindow = {
  windowStart: number | null;
  windowEnd: number | null;
};
const habitRecoveryRewardKey = (userId: string, habitId: string, rewardKey: string) =>
  `lifegoal.habit-recovery-reward:${userId}:${habitId}:${rewardKey}`;

const loadDraft = <T,>(key: string): T | null => {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(key);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as T;
  } catch {
    return null;
  }
};

const saveDraft = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const removeDraft = (key: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(key);
};

const getWeekStartISO = (dateISO: string) => {
  const date = parseISODate(dateISO);
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  const weekStart = addDays(date, offset);
  return formatISODate(weekStart);
};

const buildSpecialVisionStoryPanels = (params: {
  habitNames: string[];
  goalTitles: string[];
  userDisplayName: string;
  isAvatarPOV: boolean;
}): string[] => {
  const hero = params.userDisplayName || 'You';
  const focusHabit = params.habitNames[0] ?? 'your keystone habit';
  const supportHabit = params.habitNames[1] ?? 'a steady ritual';
  const focusGoal = params.goalTitles[0] ?? 'your biggest goal';
  const povLine = params.isAvatarPOV
    ? `From ${hero}'s eyes, the day starts with a calm breath and clear intent.`
    : `From your own point of view, the world feels aligned with your next step.`;

  return [
    `Panel 1: ${povLine}`,
    `Panel 2: You choose ${focusHabit}, even while everything else is noisy.`,
    `Panel 3: Momentum grows as ${supportHabit} stacks on top of that first win.`,
    `Panel 4: A future snapshot appears—${focusGoal} is no longer distant; it's unfolding now.`,
    `Panel 5: Night closes with gratitude. ${hero} ends the day with proof: this identity is real.`,
  ];
};

const loadIntentionsDraft = (userId: string, dateISO: string, type: 'today' | 'tomorrow') => {
  const draft = loadDraft<IntentionsJournalDraft>(intentionsJournalDraftKey(userId, dateISO, type));
  if (draft) return draft;
  const legacyDraft = loadDraft<IntentionsJournalDraft>(legacyIntentionsJournalDraftKey(userId, dateISO));
  if (legacyDraft?.type === type) return legacyDraft;
  return null;
};

export function DailyHabitTracker({
  session,
  variant = 'full',
  showPointsBadges = false,
  onVisionRewardOpenChange,
  profileStrengthSnapshot,
  profileStrengthSignals,
  personalitySummary,
  onOpenDailyTreat,
  onOpenIslandRunStop,
  onOpenDailySpinWheel,
  forceCompactView = false,
  preferredCompactView,
  hideTimeBoundOffers = false,
  pendingOfferToOpen,
  onPendingOfferHandled,
  hiddenHabitIds = [],
}: DailyHabitTrackerProps) {
  const { isConfigured } = useSupabaseAuth();
  const isDemoExperience = isDemoSession(session);
  const isCompact = variant === 'compact';
  const [activeOfferTeaser, setActiveOfferTeaser] = useState<TimeBoundOfferId | null>(null);
  const [isTodaysOfferModalOpen, setIsTodaysOfferModalOpen] = useState(false);
  // Phase 2: in-dialog Daily Spin Wheel entry. The badge/button is rendered
  // inside the Today's Offer modal and only when the feature flag is on.
  const isTodaysOfferSpinEntryEnabled = isIslandRunFeatureEnabled('todaysOfferSpinEntryEnabled');
  const { spinAvailable: dailySpinAvailable } = useDailySpinStatus(
    isTodaysOfferSpinEntryEnabled ? session?.user?.id : undefined,
  );
  const todaysOfferSpinBadgeActive = isTodaysOfferSpinEntryEnabled && dailySpinAvailable;
  const [routineHiddenHabitIds, setRoutineHiddenHabitIds] = useState<string[]>([]);
  const [seenOfferTeasers, setSeenOfferTeasers] = useState<Record<string, boolean>>({});
  const progressGradientId = useId();
  const [habits, setHabits] = useState<HabitWithGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState<HabitOfflineQueueStatus>({ pending: 0, failed: 0 });
  const [reviewActionHabitIds, setReviewActionHabitIds] = useState<Set<string>>(new Set());
  const [lifecycleActionHabitIds, setLifecycleActionHabitIds] = useState<Set<string>>(new Set());
  const [todayPauseDialogHabit, setTodayPauseDialogHabit] = useState<HabitWithGoal | null>(null);
  const [reviewAiLoadingHabitIds, setReviewAiLoadingHabitIds] = useState<Set<string>>(new Set());
  const [reviewAiDraftByHabitId, setReviewAiDraftByHabitId] = useState<Record<string, HabitReviewAiDraft>>({});
  const [analysisHabitId, setAnalysisHabitId] = useState<string | null>(null);
  const [pendingReviewAiApply, setPendingReviewAiApply] = useState<{ habitId: string; title: string; rationale: string } | null>(null);
  const [completions, setCompletions] = useState<Record<string, HabitCompletionState>>({});
  const [monthlyCompletions, setMonthlyCompletions] = useState<
    Record<string, HabitMonthlyCompletionState>
  >({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [monthlySaving, setMonthlySaving] = useState<Record<string, boolean>>({});
  const [autoProgressHabitIds, setAutoProgressHabitIds] = useState<Set<string>>(new Set());
  const [today, setToday] = useState(() => formatISODate(new Date()));
  const [activeDate, setActiveDate] = useState(() => formatISODate(new Date()));
  const [completedActionsCount, setCompletedActionsCount] = useState(0);
  const [isTodayWinsOpen, setIsTodayWinsOpen] = useState(false);
  const [todayWinsSummary, setTodayWinsSummary] = useState<TodayWinsSummary>({
    journalCount: 0,
    lotusEarned: 0,
    xpEarned: 0,
    gameRewardsTotal: 0,
    gameGoldEarned: 0,
    gameDiceEarned: 0,
    gameTokensEarned: 0,
    gameHeartsEarned: 0,
  });
  const isViewingToday = activeDate === today;
  const [monthDays, setMonthDays] = useState<string[]>([]);
  const [habitInsights, setHabitInsights] = useState<Record<string, HabitInsights>>({});
  const [expandedHabits, setExpandedHabits] = useState<Record<string, boolean>>({});
  const [historicalLogs, setHistoricalLogs] = useState<HabitLogRow[]>([]);
  // State for selected month/year: allows user to navigate between different months
  // selectedMonth: 0-11, where 0 = January
  // selectedYear: full year number (e.g., 2025)
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  // State for storing monthly statistics from our helper function
  const [monthlyStats, setMonthlyStats] = useState<MonthlyHabitCompletions | null>(null);
  // State for per-day completion data from habit_completions table
  const [monthlyCompletionsV2, setMonthlyCompletionsV2] = useState<
    Record<string, Record<string, boolean>>
  >({});
  // State for alert configuration modal
  const [alertConfigHabit, setAlertConfigHabit] = useState<{ id: string; name: string } | null>(null);
  const [autoProgressPanels, setAutoProgressPanels] = useState<Record<string, boolean>>({});
  const [editHabit, setEditHabit] = useState<HabitEditDraft | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLifeWheelKey, setEditLifeWheelKey] = useState<string>(LIFE_WHEEL_UNASSIGNED);
  const [editGoalId, setEditGoalId] = useState<string>(GOAL_UNASSIGNED);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [goals, setGoals] = useState<Database['public']['Tables']['goals']['Row'][]>([]);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [creatingGoal, setCreatingGoal] = useState(false);
  const [showLegacyHabitAssets, setShowLegacyHabitAssets] = useState(false);
  const [isQuickJournalOpen, setIsQuickJournalOpen] = useState(false);
  const [quickJournalMorning, setQuickJournalMorning] = useState('');
  const [quickJournalDay, setQuickJournalDay] = useState('');
  const [quickJournalEvening, setQuickJournalEvening] = useState('');
  const [quickJournalInteractions, setQuickJournalInteractions] = useState('');
  const [quickJournalFreeform, setQuickJournalFreeform] = useState('');
  const [quickJournalMode, setQuickJournalMode] = useState<QuickJournalMode>('written');
  const [quickJournalEnergy, setQuickJournalEnergy] = useState(QUICK_JOURNAL_PULSE_DEFAULTS.energy);
  const [quickJournalMood, setQuickJournalMood] = useState(QUICK_JOURNAL_PULSE_DEFAULTS.mood);
  const [quickJournalFocus, setQuickJournalFocus] = useState(QUICK_JOURNAL_PULSE_DEFAULTS.focus);
  const [quickJournalStress, setQuickJournalStress] = useState(QUICK_JOURNAL_PULSE_DEFAULTS.stress);
  const [quickDreamTitle, setQuickDreamTitle] = useState(QUICK_JOURNAL_DREAM_DEFAULTS.title);
  const [quickDreamSymbols, setQuickDreamSymbols] = useState(QUICK_JOURNAL_DREAM_DEFAULTS.symbols);
  const [quickDreamEmotions, setQuickDreamEmotions] = useState(QUICK_JOURNAL_DREAM_DEFAULTS.emotions);
  const [quickDreamReflection, setQuickDreamReflection] = useState(QUICK_JOURNAL_DREAM_DEFAULTS.reflection);
  const [quickJournalSaving, setQuickJournalSaving] = useState(false);
  const [quickJournalError, setQuickJournalError] = useState<string | null>(null);
  const [showCompletedHabits, setShowCompletedHabits] = useState(false);
  const [quickJournalStatus, setQuickJournalStatus] = useState<string | null>(null);
  const [skipMenuHabitId, setSkipMenuHabitId] = useState<string | null>(null);
  const [skipReasonHabitId, setSkipReasonHabitId] = useState<string | null>(null);
  const [skipReason, setSkipReason] = useState('');
  const [skipSaving, setSkipSaving] = useState(false);
  const [skipError, setSkipError] = useState<string | null>(null);
  const [swipeOffsetByHabitId, setSwipeOffsetByHabitId] = useState<Record<string, number>>({});
  const [swipeArmedByHabitId, setSwipeArmedByHabitId] = useState<Record<string, HabitSwipeDirection | null>>({});
  const skipMenuRef = useRef<HTMLDivElement | null>(null);
  const swipeGestureRef = useRef<{
    habitId: string;
    pointerId: number;
    startX: number;
    startY: number;
    isHorizontal: boolean;
    hasSwiped: boolean;
    armedDirection: HabitSwipeDirection | null;
  } | null>(null);
  const swipeSuppressClickUntilByHabitIdRef = useRef<Record<string, number>>({});
  const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null);
  const [isCompactView, setIsCompactView] = useState(preferredCompactView ?? forceCompactView);

  // Quest Habit — the single habit designated to unlock the bonus door in the Personal Quest calendar
  const [questHabit, setQuestHabitState] = useState<QuestHabit | null>(() =>
    getQuestHabit(session.user.id),
  );

  const handleSetQuestHabit = useCallback((habit: QuestHabit) => {
    setQuestHabit(session.user.id, habit);
    setQuestHabitState(habit);
  }, [session.user.id]);

  const handleClearQuestHabit = useCallback(() => {
    clearQuestHabit(session.user.id);
    setQuestHabitState(null);
  }, [session.user.id]);

  useEffect(() => {
    if (typeof preferredCompactView === 'boolean') {
      setIsCompactView(preferredCompactView);
      return;
    }
    if (forceCompactView) {
      setIsCompactView(true);
    }
  }, [forceCompactView, preferredCompactView]);
  const [isCompactToggleLabelVisible, setIsCompactToggleLabelVisible] = useState(false);
  const compactToggleLabelTimeoutRef = useRef<number | null>(null);
  const reviewAutoArchivingHabitIdsRef = useRef<Set<string>>(new Set());
  const [isIdentitySignalsOpen, setIsIdentitySignalsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  // State for intentions journal
  const [isIntentionsJournalOpen, setIsIntentionsJournalOpen] = useState(false);
  const [intentionsJournalType, setIntentionsJournalType] = useState<'today' | 'tomorrow'>('today');
  const [intentionsJournalContent, setIntentionsJournalContent] = useState('');
  const [intentionsJournalSaving, setIntentionsJournalSaving] = useState(false);
  const [intentionsJournalError, setIntentionsJournalError] = useState<string | null>(null);
  const [intentionsJournalStatus, setIntentionsJournalStatus] = useState<string | null>(null);
  const [todayIntentionsEntry, setTodayIntentionsEntry] = useState<JournalEntry | null>(null);
  const [nextDayIntentionsEntry, setNextDayIntentionsEntry] = useState<JournalEntry | null>(null);
  const [yesterdayIntentionsEntry, setYesterdayIntentionsEntry] = useState<JournalEntry | null>(null);
  const [isIntentionsNoticeOpen, setIsIntentionsNoticeOpen] = useState(false);
  const [isIntentionsNoticeViewed, setIsIntentionsNoticeViewed] = useState(false);
  const [isIntentionsMet, setIsIntentionsMet] = useState(false);
  const [intentionsMeetSaving, setIntentionsMeetSaving] = useState(false);
  const [intentionsMeetError, setIntentionsMeetError] = useState<string | null>(null);
  const [activeContracts, setActiveContracts] = useState<CommitmentContract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [contractsError, setContractsError] = useState<string | null>(null);
  const [contractActionId, setContractActionId] = useState<string | null>(null);
  const [visionImages, setVisionImages] = useState<VisionImage[]>([]);
  const [visionReward, setVisionReward] = useState<VisionReward | null>(null);
  const [visionRewardDate, setVisionRewardDate] = useState<string | null>(null);
  const [visionRewardError, setVisionRewardError] = useState<string | null>(null);
  const [visionImagesLoading, setVisionImagesLoading] = useState(false);
  const [visionRewarding, setVisionRewarding] = useState(false);
  const [visionPreviewImage, setVisionPreviewImage] = useState<VisionImage | null>(null);
  const [isVisionRewardOpen, setIsVisionRewardOpen] = useState(false);
  const [isVisionRewardSelecting, setIsVisionRewardSelecting] = useState(false);
  const [isSlotLanding, setIsSlotLanding] = useState(false);
  const [isStarBursting, setIsStarBursting] = useState(false);
  const [isVisionImageLoaded, setIsVisionImageLoaded] = useState(false);
  const [hasClaimedVisionStar, setHasClaimedVisionStar] = useState(false);
  const [hasOpenedTreatCalendarToday, setHasOpenedTreatCalendarToday] = useState(false);
  const [visionStarCount, setVisionStarCount] = useState(0);
  const [isVisionVisualizationOpen, setIsVisionVisualizationOpen] = useState(false);
  const [visionVisualizationStep, setVisionVisualizationStep] = useState<1 | 2 | 3>(1);
  const [visionNowImagePreview, setVisionNowImagePreview] = useState<string | null>(null);
  const [visionNowImageName, setVisionNowImageName] = useState('');
  const [visionGoalImagePreview, setVisionGoalImagePreview] = useState<string | null>(null);
  const [visionGoalImageName, setVisionGoalImageName] = useState('');
  const [visionGoalImageCaption, setVisionGoalImageCaption] = useState<string | null>(null);
  const [visionQuickNowFeeling, setVisionQuickNowFeeling] = useState('');
  const [visionQuickMicroAction, setVisionQuickMicroAction] = useState('');
  const [visionVisualizationSeconds, setVisionVisualizationSeconds] = useState(120);
  const [isVisionVisualizationRunning, setIsVisionVisualizationRunning] = useState(false);
  const [showYesterdayRecap, setShowYesterdayRecap] = useState(false);
  const [dayStatusMap, setDayStatusMap] = useState<Record<string, DayStatus>>({});
  const [yesterdayHabits, setYesterdayHabits] = useState<HabitWithGoal[]>([]);
  const [yesterdaySelections, setYesterdaySelections] = useState<Record<string, boolean>>({});
  const [yesterdayActionStatus, setYesterdayActionStatus] = useState<string | null>(null);
  const [yesterdaySaving, setYesterdaySaving] = useState(false);
  const [yesterdayCollecting, setYesterdayCollecting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationXP, setCelebrationXP] = useState(0);
  const [celebrationType, setCelebrationType] = useState<'habit' | 'journal' | 'action' | 'breathing' | 'levelup' | 'vision'>('habit');
  const [celebrationOrigin, setCelebrationOrigin] = useState<{ x: number; y: number } | null>(null);
  const [justCompletedHabitId, setJustCompletedHabitId] = useState<string | null>(null);
  const [habitFeedbackById, setHabitFeedbackById] = useState<Record<string, HabitFeedbackType>>({});
  const [isWeeklyHabitReviewOpen, setIsWeeklyHabitReviewOpen] = useState(false);
  const [shouldFadeTrackingMeta, setShouldFadeTrackingMeta] = useState(false);
  const trackingMetaFadeTimeoutRef = useRef<number | null>(null);
  const [timeLimitedOffer, setTimeLimitedOffer] = useState<{
    date: string;
    nextHabitId: string | null;
    badHabitId: string | null;
    windowStart: number | null;
    windowEnd: number | null;
  }>({
    date: '',
    nextHabitId: null,
    badHabitId: null,
    windowStart: null,
    windowEnd: null,
  });
  const [timeLimitedCountdown, setTimeLimitedCountdown] = useState(0);
  const [habitReviewWindow, setHabitReviewWindow] = useState<HabitPromptWindow>({
    windowStart: null,
    windowEnd: null,
  });
  const lastTimeLimitedOfferTelemetryKeyRef = useRef<string | null>(null);
  const lastTimeLimitedOfferExpiryTelemetryKeyRef = useRef<string | null>(null);
  const visionButtonRef = useRef<HTMLButtonElement | null>(null);
  const visionClaimButtonRef = useRef<HTMLButtonElement | null>(null);
  const { earnXP, recordActivity, enabled: gamificationEnabled, levelUpEvent, dismissLevelUpEvent } = useGamification(session);
  const shouldShowHabitPoints = showPointsBadges && gamificationEnabled;

  const awardHabitRecoveryXp = useCallback(async (params: {
    habitId: string;
    rewardKey: string;
    xp: number;
    sourceType: string;
    description: string;
  }) => {
    if (!session?.user?.id || !gamificationEnabled || params.xp <= 0) {
      return;
    }

    const storageKey = habitRecoveryRewardKey(session.user.id, params.habitId, params.rewardKey);
    if (loadDraft<boolean>(storageKey)) {
      return;
    }

    await earnXP(params.xp, params.sourceType, params.habitId, params.description);
    saveDraft(storageKey, true);
  }, [earnXP, gamificationEnabled, session?.user?.id]);
  const visionImagesByHabit = useMemo(() => {
    const map = new Map<string, VisionImage>();
    visionImages.forEach((image) => {
      image.linked_habit_ids?.forEach((habitId) => {
        if (!map.has(habitId)) {
          map.set(habitId, image);
        }
      });
    });
    return map;
  }, [visionImages]);
  const adherenceByHabit = useMemo(
    () => calculateAdherenceSnapshots(habits, historicalLogs, today),
    [habits, historicalLogs, today],
  );
  const weightedSuccessByHabit = useMemo(
    () => calculateWeightedSuccessSnapshots(habits, historicalLogs, today),
    [habits, historicalLogs, today],
  );
  const stageMixSnapshot = useMemo(
    () => calculateStageMixSnapshot(historicalLogs, today),
    [historicalLogs, today],
  );
  const habitHealthAssessmentsByHabitId = useMemo(() => {
    const next = {} as Record<string, ReturnType<typeof assessHabitHealth>>;
    for (const habit of habits) {
      const insight = habitInsights[habit.id];
      next[habit.id] = assessHabitHealth({
        adherence7: adherenceByHabit[habit.id] ?? null,
        lastCompletedOn: insight?.lastCompletedOn ?? null,
        referenceDateISO: today,
      });
    }
    return next;
  }, [adherenceByHabit, habitInsights, habits, today]);
  const habitHealthByHabitId = useMemo(() => {
    const next: Record<string, HabitHealthState> = {};
    for (const habit of habits) {
      next[habit.id] = habitHealthAssessmentsByHabitId[habit.id]?.state ?? 'active';
    }
    return next;
  }, [habitHealthAssessmentsByHabitId, habits]);
  const reviewQueueHabits = useMemo(
    () =>
      habits.filter((habit) => {
        const state = habitHealthByHabitId[habit.id] ?? 'active';
        return state === 'in_review';
      }),
    [habitHealthByHabitId, habits],
  );
  const weeklyReviewSnapshot = useMemo(() => {
    const stalled: HabitWithGoal[] = [];
    const onTrack: HabitWithGoal[] = [];

    for (const habit of habits) {
      const healthState = habitHealthByHabitId[habit.id] ?? 'active';
      const adherence = adherenceByHabit[habit.id]?.percentage ?? 0;
      const lastCompletedOn = habitInsights[habit.id]?.lastCompletedOn;
      const daysSinceLastCompleted = lastCompletedOn
        ? Math.floor((parseISODate(today).getTime() - parseISODate(lastCompletedOn).getTime()) / (24 * 60 * 60 * 1000))
        : Number.POSITIVE_INFINITY;

      if (healthState === 'in_review' || adherence < 40 || daysSinceLastCompleted >= 10) {
        stalled.push(habit);
        continue;
      }

      if (healthState === 'active' && adherence >= 70) {
        onTrack.push(habit);
      }
    }

    return {
      stalled,
      onTrack,
      totalHabits: habits.length,
    };
  }, [adherenceByHabit, habitHealthByHabitId, habitInsights, habits, today]);
  const weekStartISO = useMemo(() => getWeekStartISO(activeDate), [activeDate]);

  // Compute how many times each habit was marked completed in the current week.
  // Used to show "X/Y this week" badge for times_per_week habits.
  const weekCompletionsByHabit = useMemo(() => {
    const result: Record<string, number> = {};
    for (const log of historicalLogs) {
      if (log.date >= weekStartISO && log.date <= activeDate && log.completed) {
        result[log.habit_id] = (result[log.habit_id] ?? 0) + 1;
      }
    }
    return result;
  }, [historicalLogs, weekStartISO, activeDate]);
  const weeklySnapshotCompletionPercent = useMemo(() => {
    if (weeklyReviewSnapshot.totalHabits <= 0) return 0;
    return Math.round((weeklyReviewSnapshot.onTrack.length / weeklyReviewSnapshot.totalHabits) * 100);
  }, [weeklyReviewSnapshot.onTrack.length, weeklyReviewSnapshot.totalHabits]);
  const topPositiveHabits = useMemo(
    () => weeklyReviewSnapshot.onTrack.slice(0, 2).map((habit) => habit.name),
    [weeklyReviewSnapshot.onTrack],
  );
  const strongestStreakHabit = useMemo(() => {
    let bestHabit: HabitWithGoal | null = null;
    let bestStreak = 0;
    for (const habit of habits) {
      const streak = habitInsights[habit.id]?.currentStreak ?? 0;
      if (streak > bestStreak) {
        bestStreak = streak;
        bestHabit = habit;
      }
    }
    return bestHabit ? { name: bestHabit.name, streak: bestStreak } : null;
  }, [habitInsights, habits]);
  const weeklySnapshotVariant = useMemo(() => {
    const weekSeed = parseInt(weekStartISO.split('-').join(''), 10);
    const variants = [
      {
        title: 'Consistency sparkle',
        detail: `You kept ${weeklyReviewSnapshot.onTrack.length} habits flowing this week.`,
      },
      {
        title: 'Momentum unlocked',
        detail: `${weeklySnapshotCompletionPercent}% completion is building your rhythm.`,
      },
      {
        title: 'Streak spotlight',
        detail: strongestStreakHabit
          ? `${strongestStreakHabit.name} is on a ${strongestStreakHabit.streak}-day streak.`
          : 'Your streak board is warming up this week.',
      },
    ] as const;
    return variants[Math.abs(Number.isNaN(weekSeed) ? 0 : weekSeed) % variants.length];
  }, [strongestStreakHabit, weekStartISO, weeklyReviewSnapshot.onTrack.length, weeklySnapshotCompletionPercent]);
  const defaultPriceByHabitId = useCallback((habitId: string) => {
    return getDefaultHabitRewardGold({
      healthState: habitHealthByHabitId[habitId],
      adherencePercentage: adherenceByHabit[habitId]?.percentage,
      currentStreak: habitInsights[habitId]?.currentStreak,
    });
  }, [adherenceByHabit, habitHealthByHabitId, habitInsights]);
  const habitGoldLabel = useMemo(() => {
    const prices = habits.map((habit) => defaultPriceByHabitId(habit.id));
    if (!prices.length) {
      const baseGold = convertXpToGold(XP_REWARDS.HABIT_COMPLETE);
      const earlyGold = convertXpToGold(XP_REWARDS.HABIT_COMPLETE_EARLY);
      const minGold = Math.min(baseGold, earlyGold);
      const maxGold = Math.max(baseGold, earlyGold);
      return minGold === maxGold ? `${minGold}` : `${minGold}-${maxGold}`;
    }
    const minGold = Math.min(...prices);
    const maxGold = Math.max(...prices);
    return minGold === maxGold ? `${minGold}` : `${minGold}-${maxGold}`;
  }, [defaultPriceByHabitId, habits]);

  const isBadHabit = useCallback((habit: HabitWithGoal) => {
    const name = habit.name.toLowerCase();
    return (
      name.startsWith('bad:') ||
      name.includes('bad habit') ||
      name.includes('[bad]') ||
      habit.name.includes('😈')
    );
  }, []);

  const sortedHabits = useMemo(() => {
    const combinedHiddenHabitIds = new Set<string>([...hiddenHabitIds, ...routineHiddenHabitIds]);
    const visibleHabits = combinedHiddenHabitIds.size
      ? habits.filter((habit) => !combinedHiddenHabitIds.has(habit.id))
      : habits;

    if (!visibleHabits.length) {
      return visibleHabits;
    }

    return [...visibleHabits].sort((a, b) => {
      const aCompleted = Boolean(completions[a.id]?.completed);
      const bCompleted = Boolean(completions[b.id]?.completed);
      if (aCompleted !== bCompleted) {
        return aCompleted ? 1 : -1;
      }

      const aInsight = habitInsights[a.id];
      const bInsight = habitInsights[b.id];
      const aCurrent = aInsight?.currentStreak ?? 0;
      const bCurrent = bInsight?.currentStreak ?? 0;
      if (aCurrent !== bCurrent) {
        return bCurrent - aCurrent;
      }
      const aLongest = aInsight?.longestStreak ?? 0;
      const bLongest = bInsight?.longestStreak ?? 0;
      if (aLongest !== bLongest) {
        return bLongest - aLongest;
      }
      return a.name.localeCompare(b.name);
    });
  }, [habits, hiddenHabitIds, routineHiddenHabitIds, habitInsights, completions]);

  const riskRankedOfferHabits = useMemo(() => {
    return rankHabitsForTimeLimitedOffer({
      habits: sortedHabits,
      completionsByHabitId: completions,
      healthStateByHabitId: habitHealthByHabitId,
      adherenceByHabitId: adherenceByHabit,
    });
  }, [adherenceByHabit, completions, habitHealthByHabitId, sortedHabits]);

  const nowTimestamp = Date.now();
  const isSpecialVisionStarDay = useMemo(() => {
    const weekStartISO = getWeekStartISO(activeDate);
    const specialDayOffset = loadDraft<number>(weeklySpecialVisionStarKey(session.user.id, weekStartISO));
    if (typeof specialDayOffset !== 'number' || specialDayOffset < 0 || specialDayOffset > 6) {
      return false;
    }
    const parsedDay = parseISODate(activeDate).getDay();
    const mondayBasedIndex = parsedDay === 0 ? 6 : parsedDay - 1;
    return mondayBasedIndex === specialDayOffset;
  }, [activeDate, session.user.id]);
  const activeVisionStarWindow = useMemo(
    () => ({
      id: `${activeDate}-daily`,
      windowStart: nowTimestamp,
      windowEnd: getNextUtcMidnightMs(),
      isSpecial: isSpecialVisionStarDay,
    }),
    [activeDate, isSpecialVisionStarDay, nowTimestamp],
  );
  const isTimeLimitedOfferActive =
    isViewingToday &&
    timeLimitedOffer.windowStart !== null &&
    timeLimitedOffer.windowEnd !== null &&
    nowTimestamp >= timeLimitedOffer.windowStart &&
    nowTimestamp <= timeLimitedOffer.windowEnd;
  const isHabitReviewPromptActive =
    isViewingToday &&
    reviewQueueHabits.length > 0 &&
    habitReviewWindow.windowStart !== null &&
    habitReviewWindow.windowEnd !== null &&
    nowTimestamp >= habitReviewWindow.windowStart &&
    nowTimestamp <= habitReviewWindow.windowEnd &&
    !isTimeLimitedOfferActive;
  const offerHabitIds = useMemo(
    () => new Set([timeLimitedOffer.nextHabitId, timeLimitedOffer.badHabitId].filter(Boolean) as string[]),
    [timeLimitedOffer.badHabitId, timeLimitedOffer.nextHabitId],
  );
  const offerPriceByHabitId = useCallback(
    (habitId: string) => {
      if (habitId === timeLimitedOffer.nextHabitId) {
        return 85;
      }
      if (habitId === timeLimitedOffer.badHabitId) {
        return 250;
      }
      return null;
    },
    [timeLimitedOffer.badHabitId, timeLimitedOffer.nextHabitId],
  );
  const {
    orderedHabits: timeLimitedOrderedHabits,
  } = useMemo(() => {
    if (!isTimeLimitedOfferActive || offerHabitIds.size === 0) {
      return {
        orderedHabits: sortedHabits,
      };
    }

    return {
      orderedHabits: [
        ...[
          timeLimitedOffer.nextHabitId,
          timeLimitedOffer.badHabitId,
        ]
          .map((habitId) => sortedHabits.find((habit) => habit.id === habitId))
          .filter((habit): habit is HabitWithGoal => Boolean(habit)),
        ...sortedHabits.filter((habit) => !offerHabitIds.has(habit.id)),
      ],
    };
  }, [
    isTimeLimitedOfferActive,
    offerHabitIds,
    sortedHabits,
    timeLimitedOffer.badHabitId,
    timeLimitedOffer.nextHabitId,
  ]);

  // Watch for level-up events
  useEffect(() => {
    if (levelUpEvent) {
      setCelebrationOrigin(null);
      setCelebrationType('levelup');
      setCelebrationXP(levelUpEvent.xp);
      setShowCelebration(true);
    }
  }, [levelUpEvent]);

  useEffect(() => {
    return () => {
      if (compactToggleLabelTimeoutRef.current) {
        window.clearTimeout(compactToggleLabelTimeoutRef.current);
      }
      if (trackingMetaFadeTimeoutRef.current) {
        window.clearTimeout(trackingMetaFadeTimeoutRef.current);
      }
    };
  }, []);

  const recordTimeLimitedOfferTelemetry = useCallback((params: {
    offerDate: string;
    source: 'stored' | 'recalculated';
    nextHabitId: string | null;
    badHabitId: string | null;
    windowStart: number | null;
    windowEnd: number | null;
  }) => {
    if (!session?.user?.id || !isConfigured || isDemoExperience) {
      return;
    }

    const telemetryKey = [
      params.offerDate,
      params.source,
      params.nextHabitId ?? 'none',
      params.badHabitId ?? 'none',
      String(params.windowStart ?? 'none'),
      String(params.windowEnd ?? 'none'),
    ].join(':');

    if (lastTimeLimitedOfferTelemetryKeyRef.current === telemetryKey) {
      return;
    }

    lastTimeLimitedOfferTelemetryKeyRef.current = telemetryKey;

    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'habit_time_limited_offer_scheduled',
      metadata: {
        nextHabitHealthState: params.nextHabitId
          ? (habitHealthByHabitId[params.nextHabitId] ?? 'active')
          : null,
        nextHabitAdherencePct: params.nextHabitId
          ? Math.round(
              ((adherenceByHabit[params.nextHabitId]?.percentage ?? 100) + Number.EPSILON) *
                100,
            ) / 100
          : null,
        badHabitHealthState: params.badHabitId
          ? (habitHealthByHabitId[params.badHabitId] ?? 'active')
          : null,
        badHabitAdherencePct: params.badHabitId
          ? Math.round(
              ((adherenceByHabit[params.badHabitId]?.percentage ?? 100) + Number.EPSILON) *
                100,
            ) / 100
          : null,
        offerDate: params.offerDate,
        source: params.source,
        nextHabitId: params.nextHabitId,
        badHabitId: params.badHabitId,
        hasWindow: Boolean(params.windowStart && params.windowEnd),
        prioritizedSelection: riskRankedOfferHabits[0]?.id === params.nextHabitId,
      },
    });
  }, [
    adherenceByHabit,
    habitHealthByHabitId,
    isConfigured,
    isDemoExperience,
    riskRankedOfferHabits,
    session?.user?.id,
  ]);

  const buildPromptWindow = useCallback((params: {
    dateISO: string;
    probability: number;
    durationMinutesMin: number;
    durationMinutesMax: number;
    avoidWindows?: HabitPromptWindow[];
  }): HabitPromptWindow => {
    if (Math.random() >= params.probability) {
      return { windowStart: null, windowEnd: null };
    }

    const baseDate = parseISODate(params.dateISO);
    baseDate.setHours(0, 0, 0, 0);

    const awakeHourMin = 9;
    const awakeHourMax = 23;
    const startMinuteMin = awakeHourMin * 60;
    const startMinuteMax = awakeHourMax * 60;

    const attempts = 24;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const startMinute =
        startMinuteMin + Math.floor(Math.random() * Math.max(1, startMinuteMax - startMinuteMin));
      const durationMinutes =
        params.durationMinutesMin +
        Math.floor(Math.random() * Math.max(1, params.durationMinutesMax - params.durationMinutesMin + 1));

      const startDate = new Date(baseDate.getTime() + startMinute * 60 * 1000);
      const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

      if (endDate.getHours() > awakeHourMax || (endDate.getHours() === awakeHourMax && endDate.getMinutes() > 0)) {
        continue;
      }

      const overlapsOtherWindow = (params.avoidWindows ?? []).some((window) => {
        if (!window.windowStart || !window.windowEnd) {
          return false;
        }
        return startDate.getTime() < window.windowEnd && endDate.getTime() > window.windowStart;
      });

      if (overlapsOtherWindow) {
        continue;
      }

      return { windowStart: startDate.getTime(), windowEnd: endDate.getTime() };
    }

    return { windowStart: null, windowEnd: null };
  }, []);

  const buildTimeLimitedOfferWindow = useCallback((dateISO: string) => {
    return buildPromptWindow({
      dateISO,
      probability: 0.22,
      durationMinutesMin: 18,
      durationMinutesMax: 40,
    });
  }, [buildPromptWindow]);

  const buildHabitReviewWindow = useCallback((dateISO: string, offerWindow: HabitPromptWindow) => {
    return buildPromptWindow({
      dateISO,
      probability: 0.22,
      durationMinutesMin: 20,
      durationMinutesMax: 45,
      avoidWindows: [offerWindow],
    });
  }, [buildPromptWindow]);

  useEffect(() => {
    if (!isViewingToday || habits.length === 0) {
      return;
    }

    const habitIds = new Set(habits.map((habit) => habit.id));

    const storedOffer = loadDraft<{
      date: string;
      nextHabitId: string | null;
      badHabitId: string | null;
      windowStart: number | null;
      windowEnd: number | null;
      reviewWindowStart?: number | null;
      reviewWindowEnd?: number | null;
    }>(timeLimitedOfferScheduleKey(session.user.id, activeDate));

    const hasValidStoredOffer =
      storedOffer?.date === activeDate &&
      isEligibleTimeLimitedOfferHabit({
        habitId: storedOffer.nextHabitId,
        completionsByHabitId: completions,
        healthStateByHabitId: habitHealthByHabitId,
        habitIds,
      }) &&
      (storedOffer.badHabitId == null ||
        isEligibleTimeLimitedOfferHabit({
          habitId: storedOffer.badHabitId,
          completionsByHabitId: completions,
          healthStateByHabitId: habitHealthByHabitId,
          habitIds,
        }));

    if (hasValidStoredOffer) {
      setTimeLimitedOffer(storedOffer);
      setHabitReviewWindow({
        windowStart: storedOffer.reviewWindowStart ?? null,
        windowEnd: storedOffer.reviewWindowEnd ?? null,
      });
      recordTimeLimitedOfferTelemetry({
        offerDate: activeDate,
        source: 'stored',
        nextHabitId: storedOffer.nextHabitId,
        badHabitId: storedOffer.badHabitId,
        windowStart: storedOffer.windowStart,
        windowEnd: storedOffer.windowEnd,
      });
      return;
    }

    const nextHabit = riskRankedOfferHabits[0] ?? sortedHabits.find((habit) => !completions[habit.id]?.completed) ?? sortedHabits[0] ?? null;
    const badHabit =
      riskRankedOfferHabits.find((habit) => isBadHabit(habit) && habit.id !== nextHabit?.id) ??
      riskRankedOfferHabits.find((habit) => habit.id !== nextHabit?.id) ??
      sortedHabits.find((habit) => isBadHabit(habit) && habit.id !== nextHabit?.id) ??
      sortedHabits.find((habit) => habit.id !== nextHabit?.id) ??
      null;
    const offerWindow = buildTimeLimitedOfferWindow(activeDate);
    const reviewWindow = buildHabitReviewWindow(activeDate, offerWindow);

    const nextOffer = {
      date: activeDate,
      nextHabitId: nextHabit?.id ?? null,
      badHabitId: badHabit?.id ?? null,
      windowStart: offerWindow.windowStart,
      windowEnd: offerWindow.windowEnd,
      reviewWindowStart: reviewWindow.windowStart,
      reviewWindowEnd: reviewWindow.windowEnd,
    };

    setTimeLimitedOffer(nextOffer);
    setHabitReviewWindow(reviewWindow);
    saveDraft(timeLimitedOfferScheduleKey(session.user.id, activeDate), nextOffer);
    recordTimeLimitedOfferTelemetry({
      offerDate: activeDate,
      source: 'recalculated',
      nextHabitId: nextOffer.nextHabitId,
      badHabitId: nextOffer.badHabitId,
      windowStart: nextOffer.windowStart,
      windowEnd: nextOffer.windowEnd,
    });
  }, [
    activeDate,
    buildTimeLimitedOfferWindow,
    buildHabitReviewWindow,
    completions,
    habits.length,
    isBadHabit,
    isViewingToday,
    riskRankedOfferHabits,
    habitHealthByHabitId,
    recordTimeLimitedOfferTelemetry,
    session.user.id,
    sortedHabits,
  ]);

  useEffect(() => {
    if (!timeLimitedOffer.date) {
      return;
    }

    saveDraft(timeLimitedOfferScheduleKey(session.user.id, timeLimitedOffer.date), timeLimitedOffer);
  }, [session.user.id, timeLimitedOffer]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const launchKey = weeklyHabitReviewLaunchKey(session.user.id);
    if (loadDraft<boolean>(launchKey)) {
      removeDraft(launchKey);
      setIsWeeklyHabitReviewOpen(true);
    }

    const launchHandler = () => setIsWeeklyHabitReviewOpen(true);
    window.addEventListener('lifegoal:launch-weekly-habit-review', launchHandler);
    return () => window.removeEventListener('lifegoal:launch-weekly-habit-review', launchHandler);
  }, [session.user.id]);

  useEffect(() => {
    if (!isViewingToday || typeof window === 'undefined') {
      return;
    }

    const now = new Date();
    if (now.getDay() !== 0 || now.getHours() < 8) {
      return;
    }

    if (!habits.length && stageMixSnapshot.totalLogged === 0) {
      return;
    }

    const weekStartISO = getWeekStartISO(activeDate);
    const reviewShownKey = weeklyHabitReviewShownKey(session.user.id, weekStartISO);
    if (loadDraft<boolean>(reviewShownKey)) {
      return;
    }

    saveDraft(reviewShownKey, true);
    setIsWeeklyHabitReviewOpen(true);
  }, [activeDate, habits.length, isViewingToday, session.user.id, stageMixSnapshot.totalLogged]);

  useEffect(() => {
    if (typeof window === 'undefined' || !session?.user?.id) {
      return;
    }

    const launchKey = dailyCatchUpLaunchKey(session.user.id);
    const tryOpenDailyCatchUp = () => {
      if (loading || habits.length === 0) {
        return false;
      }

      const previousDayISO = formatISODate(addDays(parseISODate(activeDate), -1));
      const scheduledYesterday = habits.filter((habit) => isHabitScheduledOnDate(habit, previousDayISO));
      const promptHabits = scheduledYesterday.length > 0 ? scheduledYesterday : habits.slice(0, 5);
      if (promptHabits.length === 0) {
        return false;
      }

      setYesterdayHabits(promptHabits);
      setYesterdaySelections(
        promptHabits.reduce<Record<string, boolean>>((acc, habit) => {
          acc[habit.id] = false;
          return acc;
        }, {}),
      );
      setYesterdayActionStatus(null);
      setShowYesterdayRecap(true);
      return true;
    };

    if (loadDraft<boolean>(launchKey) && tryOpenDailyCatchUp()) {
      removeDraft(launchKey);
    }

    const launchHandler = () => {
      if (tryOpenDailyCatchUp()) {
        removeDraft(launchKey);
      } else {
        saveDraft(launchKey, true);
      }
    };

    window.addEventListener('lifegoal:launch-daily-catchup', launchHandler);
    return () => window.removeEventListener('lifegoal:launch-daily-catchup', launchHandler);
  }, [activeDate, habits, loading, session?.user?.id]);

  useEffect(() => {
    const windowStart = timeLimitedOffer.windowStart;
    const windowEnd = timeLimitedOffer.windowEnd;
    if (!windowStart || !windowEnd) {
      setTimeLimitedCountdown(0);
      return undefined;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((windowEnd - now) / 1000));
      setTimeLimitedCountdown(remaining);
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(interval);
  }, [timeLimitedOffer.windowEnd, timeLimitedOffer.windowStart]);

  useEffect(() => {
    if (!session?.user?.id || !isConfigured || isDemoExperience) {
      return;
    }

    const { date, windowStart, windowEnd, nextHabitId, badHabitId } = timeLimitedOffer;
    if (!date || !windowStart || !windowEnd || Date.now() <= windowEnd) {
      return;
    }

    const offeredHabitIds = [nextHabitId, badHabitId].filter(Boolean) as string[];
    if (offeredHabitIds.length === 0) {
      return;
    }

    const expiryTelemetryKey = `${date}:${windowEnd}:${offeredHabitIds.join(',')}`;
    if (lastTimeLimitedOfferExpiryTelemetryKeyRef.current === expiryTelemetryKey) {
      return;
    }

    lastTimeLimitedOfferExpiryTelemetryKeyRef.current = expiryTelemetryKey;

    const claimedHabitIds = offeredHabitIds.filter((habitId) => completions[habitId]?.completed);

    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'habit_time_limited_offer_expired',
      metadata: {
        offerDate: date,
        windowStart,
        windowEnd,
        nextHabitId,
        badHabitId,
        offeredHabitIds,
        claimedHabitIds,
        wasClaimed: claimedHabitIds.length > 0,
        unclaimedHabitIds: offeredHabitIds.filter((habitId) => !claimedHabitIds.includes(habitId)),
      },
    });
  }, [completions, isConfigured, isDemoExperience, session?.user?.id, timeLimitedOffer]);

  useEffect(() => {
    if (!isVisionVisualizationRunning) return;
    const interval = window.setInterval(() => {
      setVisionVisualizationSeconds((prev) => {
        if (prev <= 1) {
          setIsVisionVisualizationRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isVisionVisualizationRunning]);

  useEffect(() => {
    let isActive = true;

    const loadCompletedActions = async () => {
      const { data, error } = await fetchCompletedActionsForDate(activeDate);
      if (!isActive) return;
      if (error) {
        setCompletedActionsCount(0);
        return;
      }
      setCompletedActionsCount(data?.length ?? 0);
    };

    void loadCompletedActions();

    return () => {
      isActive = false;
    };
  }, [activeDate]);

  useEffect(() => {
    let isActive = true;

    const loadTodayWinsSummary = async () => {
      const userId = session.user.id;

      const [journalResult, zenResult, xpResult] = await Promise.all([
        listJournalEntries({
          fromDate: activeDate,
          toDate: activeDate,
          limit: 300,
        }),
        fetchZenTokenTransactions(userId, 400),
        fetchXPTransactions(userId, 500),
      ]);

      if (!isActive) return;

      const journalCount = journalResult.data?.length ?? 0;

      const lotusEarned = (zenResult.data ?? []).reduce((sum, transaction) => {
        const isSameDay = getLocalDateKeyFromISO(transaction.created_at) === activeDate;
        if (!isSameDay || transaction.action !== 'earn' || transaction.token_amount <= 0) {
          return sum;
        }
        return sum + transaction.token_amount;
      }, 0);

      const xpEarned = (xpResult.data ?? []).reduce((sum, transaction) => {
        const isSameDay = getLocalDateKeyFromISO(transaction.created_at) === activeDate;
        if (!isSameDay || transaction.xp_amount <= 0) {
          return sum;
        }
        return sum + transaction.xp_amount;
      }, 0);

      const gameRewards = getRewardHistory(userId).filter((event) => (
        event.amount > 0
        && getLocalDateKeyFromISO(event.timestamp) === activeDate
      ));

      const gameGoldEarned = gameRewards
        .filter((event) => event.currency === 'gold')
        .reduce((sum, event) => sum + event.amount, 0);
      const gameDiceEarned = gameRewards
        .filter((event) => event.currency === 'dice')
        .reduce((sum, event) => sum + event.amount, 0);
      const gameTokensEarned = gameRewards
        .filter((event) => event.currency === 'game_tokens')
        .reduce((sum, event) => sum + event.amount, 0);
      const gameHeartsEarned = gameRewards
        .filter((event) => event.currency === 'hearts')
        .reduce((sum, event) => sum + event.amount, 0);
      const gameRewardsTotal = gameGoldEarned + gameDiceEarned + gameTokensEarned + gameHeartsEarned;

      setTodayWinsSummary({
        journalCount,
        lotusEarned,
        xpEarned,
        gameRewardsTotal,
        gameGoldEarned,
        gameDiceEarned,
        gameTokensEarned,
        gameHeartsEarned,
      });
    };

    void loadTodayWinsSummary();

    return () => {
      isActive = false;
    };
  }, [activeDate, session.user.id]);

  useEffect(() => {
    const storedDayStatus = loadDraft<Record<string, DayStatus>>(dayStatusStorageKey(session.user.id));
    setDayStatusMap(storedDayStatus ?? {});
  }, [session.user.id]);

  useEffect(() => {
    const storedCount = loadDraft<number>(visionStarCountKey(session.user.id));
    setVisionStarCount(storedCount ?? 0);
  }, [session.user.id]);

  useEffect(() => {
    saveDraft(dayStatusStorageKey(session.user.id), dayStatusMap);
  }, [dayStatusMap, session.user.id]);

  useEffect(() => {
    const parsedDate = parseISODate(activeDate);
    if (parsedDate.getMonth() !== selectedMonth || parsedDate.getFullYear() !== selectedYear) {
      setSelectedMonth(parsedDate.getMonth());
      setSelectedYear(parsedDate.getFullYear());
    }
  }, [activeDate, selectedMonth, selectedYear]);

  const yesterdayISO = useMemo(
    () => formatISODate(addDays(parseISODate(today), -1)),
    [today],
  );

  useEffect(() => {
    const draftKey = quickJournalDraftKey(session.user.id, activeDate);
    const draft = loadDraft<QuickJournalDraft>(draftKey);
    if (draft) {
      setQuickJournalMode(draft.mode ?? 'written');
      setQuickJournalMorning(draft.morning ?? '');
      setQuickJournalDay(draft.day ?? '');
      setQuickJournalEvening(draft.evening ?? '');
      setQuickJournalInteractions(draft.interactions ?? '');
      setQuickJournalFreeform(draft.freeform ?? '');
      setQuickJournalEnergy(draft.energy ?? QUICK_JOURNAL_PULSE_DEFAULTS.energy);
      setQuickJournalMood(draft.mood ?? QUICK_JOURNAL_PULSE_DEFAULTS.mood);
      setQuickJournalFocus(draft.focus ?? QUICK_JOURNAL_PULSE_DEFAULTS.focus);
      setQuickJournalStress(draft.stress ?? QUICK_JOURNAL_PULSE_DEFAULTS.stress);
      setQuickDreamTitle(draft.dreamTitle ?? QUICK_JOURNAL_DREAM_DEFAULTS.title);
      setQuickDreamSymbols(draft.dreamSymbols ?? QUICK_JOURNAL_DREAM_DEFAULTS.symbols);
      setQuickDreamEmotions(draft.dreamEmotions ?? QUICK_JOURNAL_DREAM_DEFAULTS.emotions);
      setQuickDreamReflection(draft.dreamReflection ?? QUICK_JOURNAL_DREAM_DEFAULTS.reflection);
      const hasContent = Boolean(
        draft.mode === 'pulse' ||
          draft.morning ||
          draft.day ||
          draft.evening ||
          draft.interactions ||
          draft.freeform ||
          draft.dreamTitle ||
          draft.dreamSymbols ||
          draft.dreamEmotions ||
          draft.dreamReflection
      );
      setIsQuickJournalOpen(draft.isOpen || hasContent);
    } else {
      setQuickJournalMode('written');
      setQuickJournalMorning('');
      setQuickJournalDay('');
      setQuickJournalEvening('');
      setQuickJournalInteractions('');
      setQuickJournalFreeform('');
      setQuickJournalEnergy(QUICK_JOURNAL_PULSE_DEFAULTS.energy);
      setQuickJournalMood(QUICK_JOURNAL_PULSE_DEFAULTS.mood);
      setQuickJournalFocus(QUICK_JOURNAL_PULSE_DEFAULTS.focus);
      setQuickJournalStress(QUICK_JOURNAL_PULSE_DEFAULTS.stress);
      setQuickDreamTitle(QUICK_JOURNAL_DREAM_DEFAULTS.title);
      setQuickDreamSymbols(QUICK_JOURNAL_DREAM_DEFAULTS.symbols);
      setQuickDreamEmotions(QUICK_JOURNAL_DREAM_DEFAULTS.emotions);
      setQuickDreamReflection(QUICK_JOURNAL_DREAM_DEFAULTS.reflection);
      setIsQuickJournalOpen(false);
    }
    setQuickJournalError(null);
    setQuickJournalStatus(null);
  }, [activeDate, session.user.id]);

  useEffect(() => {
    let isActive = true;

    if (!isConfigured && !isDemoExperience) {
      setVisionImages([]);
      setVisionImagesLoading(false);
      return () => {
        isActive = false;
      };
    }

    const loadVisionImages = async () => {
      setVisionImagesLoading(true);
      try {
        const { data, error } = await fetchVisionImages(session.user.id);
        if (!isActive) return;
        if (error) {
          throw error;
        }
        const mapped = (data ?? [])
          .map((record) => ({
            ...record,
            publicUrl: getVisionImagePublicUrl(record),
          }))
          .filter((record) => record.publicUrl);
        setVisionImages(mapped);
      } catch (error) {
        console.error('Failed to load vision board images:', error);
        if (isActive) {
          setVisionImages([]);
        }
      } finally {
        if (isActive) {
          setVisionImagesLoading(false);
        }
      }
    };

    loadVisionImages();

    return () => {
      isActive = false;
    };
  }, [isConfigured, isDemoExperience, session.user.id]);

  const handleVisionReward = useCallback(async () => {
    setVisionRewardError(null);
    setIsVisionRewardSelecting(true);

    if (!isConfigured && !isDemoExperience) {
      setVisionRewardError('Connect Supabase to unlock vision board boosts.');
      setIsVisionRewardSelecting(false);
      return;
    }

    if (visionImages.length === 0) {
      setVisionReward(null);
      setVisionRewardError('Add images to your vision board to unlock a star boost.');
      setIsVisionRewardSelecting(false);
      return;
    }

    if (hasClaimedVisionStar || !isViewingToday) {
      setVisionRewardError('Vision star already collected for today. Come back tomorrow for a new one.');
      setIsVisionRewardSelecting(false);
      return;
    }

    const selection = visionImages[Math.floor(Math.random() * visionImages.length)];
    const nextCount = visionStarCount + 1;
    const isSpecial = activeVisionStarWindow.isSpecial;
    const isSuperBoost = !isSpecial && nextCount % 20 === 0;
    const xpAmount = isSpecial ? 320 : isSuperBoost ? 250 : XP_REWARDS.VISION_BOARD_STAR;
    const diceAmount = 25;

    // Wait for slot machine spin animation to complete, then fade out
    await new Promise(resolve => setTimeout(resolve, SLOT_MACHINE_ANIMATION_DURATION_MS));
    setIsSlotLanding(true);
    await new Promise(resolve => setTimeout(resolve, SLOT_MACHINE_LANDING_DURATION_MS));
    setIsVisionRewardSelecting(false);
    setIsSlotLanding(false);

    setVisionRewarding(true);
    try {
      const result = await earnXP(
        xpAmount,
        isSpecial ? 'vision_board_star_special' : 'vision_board_star',
        selection.id,
        isSpecial ? 'Special weekly vision star story' : 'Vision board star boost'
      );
      awardDice(session.user.id, diceAmount, 'daily_treats', 'Vision Star reward');
      await recordActivity();
      const fallbackStoryPanels = buildSpecialVisionStoryPanels({
        habitNames: sortedHabits.map((habit) => habit.name),
        goalTitles: goals.map((goal) => goal.title),
        userDisplayName: session.user.email?.split('@')[0] ?? 'You',
        isAvatarPOV: Boolean(profileStrengthSnapshot),
      });

      const specialAiResult = isSpecial
        ? await generateSpecialVisionStar({
            habitNames: sortedHabits.map((habit) => habit.name),
            goalTitles: goals.map((goal) => goal.title),
            userDisplayName: session.user.email?.split('@')[0] ?? 'You',
            isAvatarPOV: Boolean(profileStrengthSnapshot),
          })
        : null;

      if (isSpecial && specialAiResult?.error) {
        console.warn('Special vision star AI generation failed, using fallback story/image:', specialAiResult.error);
      }

      let selectedImageUrl =
        isSpecial && specialAiResult?.data?.imageDataUrl
          ? specialAiResult.data.imageDataUrl
          : selection.publicUrl;
      const selectedCaption = isSpecial
        ? specialAiResult?.data?.caption ?? '✨ Special vision star unlocked: your AI-crafted weekly comic just dropped.'
        : selection.caption ?? null;
      const specialStoryPanels = isSpecial
        ? specialAiResult?.data?.panels ?? fallbackStoryPanels
        : undefined;

      if (isSpecial && selectedImageUrl.startsWith('data:image/')) {
        const persisted = await persistSpecialVisionStarImage(session.user.id, selectedImageUrl);
        if (persisted.publicUrl) {
          selectedImageUrl = persisted.publicUrl;
        } else if (persisted.error) {
          console.warn('Unable to persist special vision star image to storage:', persisted.error);
        }
      }

      setVisionReward({
        imageUrl: selectedImageUrl,
        caption: selectedCaption,
        xpAwarded: result?.xpAwarded ?? xpAmount,
        diceAwarded: diceAmount,
        isSuperBoost,
        isSpecial,
        specialStoryPanels,
      });
      setVisionRewardDate(activeDate);
      setHasClaimedVisionStar(true);
      saveDraft(visionStarStorageKey(session.user.id, activeDate), true);

      const persistImageUrl =
        selectedImageUrl.startsWith('data:image/') && selectedImageUrl.length > 200_000
          ? selection.publicUrl
          : selectedImageUrl;

      saveDraft(visionStarRewardKey(session.user.id, activeDate), {
        imageUrl: persistImageUrl,
        caption: selectedCaption,
        xpAwarded: result?.xpAwarded ?? xpAmount,
        diceAwarded: diceAmount,
        isSuperBoost,
        isSpecial,
        specialStoryPanels,
      } satisfies VisionReward);
      saveDraft(visionStarCountKey(session.user.id), nextCount);
      setVisionStarCount(nextCount);
      setIsVisionRewardOpen(true);
    } finally {
      setVisionRewarding(false);
      setIsVisionRewardSelecting(false);
    }
  }, [
    activeDate,
    activeVisionStarWindow,
    earnXP,
    goals,
    hasClaimedVisionStar,
    isConfigured,
    isDemoExperience,
    isViewingToday,
    profileStrengthSnapshot,
    recordActivity,
    session.user.email,
    session.user.id,
    sortedHabits,
    visionImages,
    visionStarCount,
    persistSpecialVisionStarImage,
    generateSpecialVisionStar,
  ]);

  const triggerStarBurst = useCallback(() => {
    setIsStarBursting(true);
    window.setTimeout(() => setIsStarBursting(false), 900);
  }, []);

  const triggerVisionClaimFlight = useCallback(() => {
    if (typeof document === 'undefined') return;

    const startRect = visionClaimButtonRef.current?.getBoundingClientRect();
    const target = document.querySelector('[data-game-tab-icon="true"]') as HTMLElement | null;
    const targetRect = target?.getBoundingClientRect();

    if (!startRect || !targetRect) return;

    const startX = startRect.left + startRect.width / 2;
    const startY = startRect.top + startRect.height / 2;
    const endX = targetRect.left + targetRect.width / 2;
    const endY = targetRect.top + targetRect.height / 2;

    const flight = document.createElement('div');
    flight.className = 'vision-claim-flight';
    flight.setAttribute('aria-hidden', 'true');
    flight.textContent = '✅';
    flight.style.setProperty('--flight-start-x', `${startX}px`);
    flight.style.setProperty('--flight-start-y', `${startY}px`);
    flight.style.setProperty('--flight-translate-x', `${endX - startX}px`);
    flight.style.setProperty('--flight-translate-y', `${endY - startY}px`);

    document.body.appendChild(flight);

    flight.addEventListener(
      'animationend',
      () => {
        flight.remove();
      },
      { once: true }
    );
  }, []);

  const handleVisionRewardClick = () => {
    if (visionButtonRef.current) {
      const rect = visionButtonRef.current.getBoundingClientRect();
      setCelebrationOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    } else {
      setCelebrationOrigin(null);
    }
    setVisionReward(null);
    setVisionRewardError(null);
    setIsVisionImageLoaded(false);
    setIsVisionRewardOpen(true);
    setIsVisionRewardSelecting(true);
    triggerStarBurst();
    void handleVisionReward();
  };

  const handleVisionRewardClaim = () => {
    if (visionClaimButtonRef.current) {
      const rect = visionClaimButtonRef.current.getBoundingClientRect();
      setCelebrationOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    } else {
      setCelebrationOrigin(null);
    }

    triggerVisionClaimFlight();
    triggerCompletionHaptic('medium', { channel: 'habit', minIntervalMs: 2200 });
    setCelebrationType('vision');
    setCelebrationXP(visionReward?.xpAwarded ?? 0);
    setShowCelebration(true);
    closeVisionReward();
  };

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60_000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const closeVisionReward = () => {
    setIsVisionRewardOpen(false);
    setIsVisionRewardSelecting(false);
    setIsSlotLanding(false);
  };

  const revokeObjectUrl = (url: string | null) => {
    if (url?.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  };

  const handleVisionNowImageChange = (file: File | null) => {
    revokeObjectUrl(visionNowImagePreview);
    if (file) {
      setVisionNowImagePreview(URL.createObjectURL(file));
      setVisionNowImageName(file.name);
      return;
    }
    setVisionNowImagePreview(null);
    setVisionNowImageName('');
  };

  const handleVisionGoalImageChange = (file: File | null) => {
    revokeObjectUrl(visionGoalImagePreview);
    if (file) {
      setVisionGoalImagePreview(URL.createObjectURL(file));
      setVisionGoalImageName(file.name);
      setVisionGoalImageCaption(null);
      return;
    }
    setVisionGoalImagePreview(null);
    setVisionGoalImageName('');
    setVisionGoalImageCaption(null);
  };

  const handleVisionGoalImageSelect = (image: VisionImage) => {
    revokeObjectUrl(visionGoalImagePreview);
    setVisionGoalImagePreview(image.publicUrl);
    setVisionGoalImageCaption(image.caption ?? null);
    setVisionGoalImageName(image.caption ?? 'Vision board image');
  };

  const openVisionVisualization = () => {
    setIsVisionVisualizationOpen(true);
    setVisionVisualizationStep(1);
    setVisionVisualizationSeconds(120);
    setIsVisionVisualizationRunning(false);
    if (visionReward?.imageUrl && !visionGoalImagePreview) {
      setVisionGoalImagePreview(visionReward.imageUrl);
      setVisionGoalImageCaption(visionReward.caption ?? null);
      setVisionGoalImageName(visionReward.caption ?? 'Vision board image');
    }
  };

  const closeVisionVisualization = () => {
    setIsVisionVisualizationOpen(false);
    setIsVisionVisualizationRunning(false);
  };

  useEffect(() => {
    if (visionReward?.imageUrl) {
      setIsVisionImageLoaded(false);
    }
  }, [visionReward?.imageUrl, isVisionRewardOpen]);

  useEffect(() => {
    return () => {
      revokeObjectUrl(visionNowImagePreview);
      revokeObjectUrl(visionGoalImagePreview);
    };
  }, [visionNowImagePreview, visionGoalImagePreview]);

  const isVisionRewardReady = Boolean(visionReward);
  const visionRewardClaimLabel = visionReward
    ? `Claim ${visionReward.xpAwarded} XP + ${visionReward.diceAwarded} Dice`
    : 'Preparing reward';
  const shouldShowVisionLoading =
    isVisionRewardSelecting || (visionReward?.imageUrl && !isVisionImageLoaded);
  const visionVisualizationTimeLabel = `${Math.floor(visionVisualizationSeconds / 60)}:${String(
    visionVisualizationSeconds % 60,
  ).padStart(2, '0')}`;
  const timeLimitedCountdownLabel = useMemo(() => {
    if (!isTimeLimitedOfferActive || !timeLimitedOffer.windowEnd) {
      return null;
    }
    const minutes = Math.floor(timeLimitedCountdown / 60);
    const seconds = timeLimitedCountdown % 60;
    return `${minutes}m:${String(seconds).padStart(2, '0')}s`;
  }, [isTimeLimitedOfferActive, timeLimitedCountdown, timeLimitedOffer.windowEnd]);
  const timeLimitedOfferCopy = useMemo(
    () => {
      const nextHabit = habits.find((habit) => habit.id === timeLimitedOffer.nextHabitId);
      const badHabit = habits.find((habit) => habit.id === timeLimitedOffer.badHabitId);
      const nextPrice = timeLimitedOffer.nextHabitId ? offerPriceByHabitId(timeLimitedOffer.nextHabitId) : null;
      const badPrice = timeLimitedOffer.badHabitId ? offerPriceByHabitId(timeLimitedOffer.badHabitId) : null;

      return {
        eyebrow: '⏳ Time-limited offer',
        nextUp:
          nextHabit && nextPrice
            ? `Next up: ${nextHabit.name} for 💎 ${nextPrice}`
            : 'Next up offer is ready when your next focus habit is selected.',
        badBoost:
          badHabit && badPrice
            ? `Struggle boost: ${badHabit.name} for 💎 ${badPrice}`
            : 'Higher-risk habits get stronger temporary boosts when available.',
        limited: 'Limited time',
      };
    },
    [habits, offerPriceByHabitId, timeLimitedOffer.badHabitId, timeLimitedOffer.nextHabitId],
  );
  const shouldShowOfferBonus = hasClaimedVisionStar && isTimeLimitedOfferActive;
  const bonusPlaceholderText = hasClaimedVisionStar && !shouldFadeTrackingMeta
    ? 'Vision star claimed today.'
    : '';
  const [islandRunRuntime, setIslandRunRuntime] = useState(() => readIslandRunRuntimeState(session));
  const [eggReadinessNowMs, setEggReadinessNowMs] = useState(() => Date.now());

  useEffect(() => {
    const syncIslandRunRuntime = () => {
      setIslandRunRuntime(readIslandRunRuntimeState(session));
    };

    syncIslandRunRuntime();
    const intervalId = window.setInterval(syncIslandRunRuntime, 1000);
    window.addEventListener('storage', syncIslandRunRuntime);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('storage', syncIslandRunRuntime);
    };
  }, [session]);

  const activeIsland = islandRunRuntime.currentIslandNumber;
  const completedStopsOnActiveIsland = islandRunRuntime.completedStopsByIsland?.[String(activeIsland)] ?? [];
  const stopPlanForActiveIsland = useMemo(() => generateIslandStopPlan(activeIsland), [activeIsland]);

  const activeIslandEgg = islandRunRuntime.perIslandEggs?.[String(activeIsland)];
  const activeIslandEggReadyAtMs = useMemo(() => {
    if (activeIslandEgg && activeIslandEgg.status === 'incubating') {
      return activeIslandEgg.hatchAtMs;
    }

    if (!activeIslandEgg && islandRunRuntime.activeEggTier && islandRunRuntime.activeEggSetAtMs && islandRunRuntime.activeEggHatchDurationMs) {
      return islandRunRuntime.activeEggSetAtMs + islandRunRuntime.activeEggHatchDurationMs;
    }

    return null;
  }, [
    activeIslandEgg,
    islandRunRuntime.activeEggHatchDurationMs,
    islandRunRuntime.activeEggSetAtMs,
    islandRunRuntime.activeEggTier,
  ]);

  useEffect(() => {
    if (!activeIslandEggReadyAtMs || activeIslandEggReadyAtMs <= eggReadinessNowMs) {
      return;
    }

    const timeoutMs = Math.max(0, activeIslandEggReadyAtMs - Date.now());
    const timeoutId = window.setTimeout(() => {
      setEggReadinessNowMs(Date.now());
    }, timeoutMs);

    return () => window.clearTimeout(timeoutId);
  }, [activeIslandEggReadyAtMs, eggReadinessNowMs]);

  const isEggReadyToCollectOnActiveIsland = useMemo(() => {
    if (activeIslandEgg) {
      return activeIslandEgg.status === 'ready'
        || (activeIslandEgg.status === 'incubating' && eggReadinessNowMs >= activeIslandEgg.hatchAtMs);
    }

    if (islandRunRuntime.activeEggTier && islandRunRuntime.activeEggSetAtMs && islandRunRuntime.activeEggHatchDurationMs) {
      return eggReadinessNowMs >= islandRunRuntime.activeEggSetAtMs + islandRunRuntime.activeEggHatchDurationMs;
    }

    return false;
  }, [
    activeIslandEgg,
    eggReadinessNowMs,
    islandRunRuntime.activeEggHatchDurationMs,
    islandRunRuntime.activeEggSetAtMs,
    islandRunRuntime.activeEggTier,
  ]);


  // Track whether the player has already opened the egg hatch circle today for this island.
  // Key: per-user, per-day, per-island so it resets naturally when egg moves to a new island
  // or the day rolls over. This controls the red notification dot and sort priority.
  const eggHatchViewedStorageKey = useMemo(
    () => `lifegoal:egg_hatch_viewed:${session.user.id}:${getTodayUtcDateKey()}:${activeIsland}`,
    [session.user.id, activeIsland],
  );
  const hasSeenEggHatch = typeof window !== 'undefined'
    ? localStorage.getItem(eggHatchViewedStorageKey) === '1'
    : false;

  const islandRunCountdownExpiresAtMs = islandRunRuntime.islandExpiresAtMs > Date.now()
    ? islandRunRuntime.islandExpiresAtMs
    : null;
  const isIslandRunReadyToStart = islandRunRuntime.islandStartedAtMs <= 0 && islandRunRuntime.islandExpiresAtMs <= 0;
  const isIslandRunOfferVisible = Boolean(islandRunCountdownExpiresAtMs) || isIslandRunReadyToStart;
  const islandRunOfferLabel = isIslandRunReadyToStart ? `Island ${activeIsland}` : `Island ${activeIsland}`;
  const islandRunOfferBadge = isIslandRunReadyToStart ? 'Open' : undefined;

  const refreshTreatCalendarCollectedState = useCallback(async () => {
    if (!session?.user?.id || !isViewingToday) {
      setHasOpenedTreatCalendarToday(false);
      return;
    }

    const adventMeta = getActiveAdventMeta();
    const seasonResult = adventMeta
      ? await fetchCurrentSeason(session.user.id, adventMeta.meta.holiday_key)
      : await getPersonalQuestSeason(session.user.id);
    const season = seasonResult.data;

    if (!season) {
      setHasOpenedTreatCalendarToday(false);
      return;
    }

    const todayIndex = season.today_day_index;
    const freeOpened = season.progress?.opened_days.includes(todayIndex) ?? false;
    const bonusOpened = season.progress?.opened_bonus_days?.includes(todayIndex) ?? false;
    setHasOpenedTreatCalendarToday(freeOpened || bonusOpened);
  }, [isViewingToday, session?.user?.id]);

  useEffect(() => {
    void refreshTreatCalendarCollectedState();
  }, [refreshTreatCalendarCollectedState]);

  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      void refreshTreatCalendarCollectedState();
    };
    // Also refresh when a calendar door is opened inside the CountdownCalendarModal
    // so the Today-tab "daily_treat" circle flips to ✓ Done immediately, rather
    // than waiting for the user to blur and refocus the window.
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('lifegoal:treat-calendar-opened', handleVisibilityOrFocus);
    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('lifegoal:treat-calendar-opened', handleVisibilityOrFocus);
    };
  }, [refreshTreatCalendarCollectedState]);

  const timeBoundOffers = useMemo<TimeBoundOfferItem[]>(() => {
    const nextUtcMidnight = getNextUtcMidnightMs();
    const adventMeta = getActiveAdventMeta();
    const calendarLabel = adventMeta ? `${adventMeta.meta.displayName} Calendar` : 'Treat Calendar';
    const hasCollectedDailyTreat = hasOpenedTreatCalendarToday;

    return [
      {
        id: 'island_run',
        label: islandRunOfferLabel,
        icon: isIslandRunReadyToStart ? '🗺️' : '🏝️',
        expiresAtMs: islandRunCountdownExpiresAtMs,
        badgeLabelOverride: islandRunOfferBadge,
        isCollected: false,
        isVisible: isIslandRunOfferVisible,
        isActionable: isIslandRunOfferVisible,
        sortPriority: 0,
      },
      {
        id: 'vision_star',
        label: 'Vision Star',
        icon: isSpecialVisionStarDay ? '🌌' : '🌟',
        expiresAtMs: nextUtcMidnight,
        badgeLabelOverride: hasClaimedVisionStar ? '✓ Done' : 'Open',
        isCollected: hasClaimedVisionStar,
        isVisible: true,
        isActionable: !hasClaimedVisionStar,
        sortPriority: 1,
      },
      {
        id: 'daily_treat',
        label: calendarLabel,
        icon: '🎁',
        expiresAtMs: nextUtcMidnight,
        isCollected: hasCollectedDailyTreat,
        isVisible: true,
        isActionable: !hasCollectedDailyTreat,
        sortPriority: 2,
      },
      {
        id: 'todays_offer',
        label: "Today's Offer",
        icon: '🛍️',
        expiresAtMs: null,
        badgeLabelOverride: todaysOfferSpinBadgeActive ? '1' : 'Open',
        isCollected: false,
        isVisible: true,
        // Phase 2 second-pass: unify red badge logic with in-dialog Daily Spin CTA.
        // Notification appears only when a daily spin is available; the circle stays
        // tappable either way so users can still access the offer modal.
        isActionable: isTodaysOfferSpinEntryEnabled ? todaysOfferSpinBadgeActive : true,
        sortPriority: 3,
      },
      {
        id: 'egg_hatch',
        label: 'Egg Ready',
        icon: '🥚',
        expiresAtMs: null,
        // Once the player opens the egg hatch circle today, remove the red badge and lower
        // priority so other unchecked circles take precedence.
        isCollected: false,
        isVisible: isEggReadyToCollectOnActiveIsland,
        isActionable: isEggReadyToCollectOnActiveIsland && !hasSeenEggHatch,
        sortPriority: hasSeenEggHatch ? 5 : 2.5,
      },
    ];
  }, [
    activeIsland,
    hasClaimedVisionStar,
    hasSeenEggHatch,
    islandRunCountdownExpiresAtMs,
    islandRunOfferBadge,
    islandRunOfferLabel,
    isIslandRunOfferVisible,
    isIslandRunReadyToStart,
    isEggReadyToCollectOnActiveIsland,
    isSpecialVisionStarDay,
    hasOpenedTreatCalendarToday,
    todaysOfferSpinBadgeActive,
    isTodaysOfferSpinEntryEnabled,
  ]);


  const offerTeaserKey = useCallback((offerId: TimeBoundOfferId) => `${getTodayUtcDateKey()}:${offerId}`, []);

  const startTodaysOfferCheckout = useCallback(async () => {
    if (isDemoExperience) {
      setVisionRewardError('Checkout is unavailable in demo mode.');
      return;
    }

    const activeEventType = islandRunRuntime.activeTimedEvent?.eventType;
    const eventId = isCanonicalEventId(activeEventType) ? activeEventType : null;
    const result = await initiateMinigameTicketCheckout({
      skuId: resolveMinigameTicketSku(eventId),
      eventId,
    });
    if (!result.url) {
      setVisionRewardError(result.error?.message ?? 'Unable to start ticket checkout right now.');
      return;
    }

    window.location.assign(result.url);
  }, [isDemoExperience, islandRunRuntime.activeTimedEvent?.eventType]);

  const openOfferContent = useCallback((offerId: TimeBoundOfferId) => {
    if (offerId === 'island_run') {
      if (onOpenIslandRunStop) {
        onOpenIslandRunStop('hatchery');
      } else {
        setVisionRewardError('Island Run launcher is unavailable in this view.');
      }
      return;
    }

    if (offerId === 'vision_star') {
      void handleVisionRewardClick();
      return;
    }

    if (offerId === 'daily_treat') {
      if (onOpenDailyTreat) {
        onOpenDailyTreat();
      } else {
        setVisionRewardError('Treat Calendar launcher is unavailable in this view.');
      }
      return;
    }

    if (offerId === 'todays_offer') {
      void startTodaysOfferCheckout();
      return;
    }

    if (offerId === 'egg_hatch') {
      // Mark as viewed for today on this island so the red badge is cleared
      if (typeof window !== 'undefined') {
        localStorage.setItem(eggHatchViewedStorageKey, '1');
      }
      if (onOpenIslandRunStop) {
        onOpenIslandRunStop('hatchery');
      } else {
        setVisionRewardError('Egg hatch launcher is unavailable in this view.');
      }
    }
  }, [eggHatchViewedStorageKey, handleVisionRewardClick, onOpenDailyTreat, onOpenIslandRunStop, startTodaysOfferCheckout]);

  const handleTimeBoundOfferClick = useCallback((offerId: TimeBoundOfferId) => {
    // UX: some offers should open directly (no intermediate teaser modal)
    if (offerId === 'egg_hatch' || offerId === 'vision_star' || offerId === 'island_run' || offerId === 'daily_treat') {
      openOfferContent(offerId);
      return;
    }

    if (offerId === 'todays_offer') {
      setIsTodaysOfferModalOpen(true);
      return;
    }

    const key = offerTeaserKey(offerId);
    const hasSeenTeaser = seenOfferTeasers[key] === true;

    if (hasSeenTeaser) {
      openOfferContent(offerId);
      return;
    }

    setActiveOfferTeaser(offerId);
  }, [offerTeaserKey, openOfferContent, seenOfferTeasers]);

  useEffect(() => {
    if (!pendingOfferToOpen) return;

    if (!isViewingToday) {
      setActiveDate(today);
      return;
    }

    handleTimeBoundOfferClick(pendingOfferToOpen);
    onPendingOfferHandled?.();
  }, [handleTimeBoundOfferClick, isViewingToday, onPendingOfferHandled, pendingOfferToOpen, today]);


  const offerTeaserModal = null;

  const todaysOfferModal = isTodaysOfferModalOpen ? (
    <div
      className="habit-day-nav__vision-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Today's offer"
      onClick={() => setIsTodaysOfferModalOpen(false)}
    >
      <div
        className={`habit-day-nav__vision-modal habit-day-nav__todays-offer-modal${
          isTodaysOfferSpinEntryEnabled ? ' habit-day-nav__todays-offer-modal--scrollable' : ''
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="habit-day-nav__vision-modal-close habit-day-nav__todays-offer-close"
          onClick={() => setIsTodaysOfferModalOpen(false)}
          aria-label="Close today's offer"
        >
          ×
        </button>
        <div className="habit-day-nav__todays-offer-body">
          <button
            type="button"
            className="habit-day-nav__todays-offer-buy"
            onClick={() => {
              void startTodaysOfferCheckout();
            }}
          >
            Buy
          </button>
          {isTodaysOfferSpinEntryEnabled && onOpenDailySpinWheel ? (
            <div className="habit-day-nav__todays-offer-spin">
              <button
                type="button"
                className="habit-day-nav__todays-offer-spin-button"
                onClick={() => {
                  setIsTodaysOfferModalOpen(false);
                  onOpenDailySpinWheel();
                }}
                aria-label={
                  dailySpinAvailable
                    ? 'Spin the Daily Spin Wheel (available)'
                    : 'Daily Spin Wheel (already used today)'
                }
              >
                <span className="habit-day-nav__todays-offer-spin-icon" aria-hidden="true">🎡</span>
                <span className="habit-day-nav__todays-offer-spin-label">Daily Spin Wheel</span>
                {dailySpinAvailable ? (
                  <span
                    className="habit-day-nav__todays-offer-spin-badge"
                    aria-hidden="true"
                  >
                    1
                  </span>
                ) : null}
              </button>
              <p className="habit-day-nav__todays-offer-spin-caption">
                {dailySpinAvailable ? 'Your daily spin is ready!' : 'Come back tomorrow for your next spin.'}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  ) : null;

  const weeklyHabitReviewModal = isWeeklyHabitReviewOpen ? (
    <div
      className="habit-day-nav__vision-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Weekly habit review"
      onClick={() => setIsWeeklyHabitReviewOpen(false)}
    >
      <div className="habit-day-nav__vision-modal habit-day-nav__weekly-snapshot-modal" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="habit-day-nav__vision-modal-close"
          onClick={() => setIsWeeklyHabitReviewOpen(false)}
          aria-label="Close weekly habit review"
        >
          ✕
        </button>
        <div className="habit-day-nav__weekly-snapshot-content">
          <header className="habit-day-nav__weekly-snapshot-header">
            <span className="habit-day-nav__vision-modal-eyebrow">Weekly habit snapshot</span>
            <h3 className="habit-day-nav__vision-modal-title">✨ Momentum this week</h3>
            <p className="habit-day-nav__vision-modal-caption">A celebration of your progress.</p>
          </header>

          <section className="habit-day-nav__weekly-snapshot-hero" aria-label="Completion score">
            <div
              className="habit-day-nav__weekly-snapshot-ring"
              style={{ '--weekly-percent': `${weeklySnapshotCompletionPercent}%` } as CSSProperties}
            >
              <strong>{weeklySnapshotCompletionPercent}%</strong>
              <span>completed</span>
            </div>
            <p className="habit-day-nav__weekly-snapshot-hero-copy">
              {weeklyReviewSnapshot.onTrack.length} habits were on track this week.
            </p>
          </section>

          <section className="habit-day-nav__weekly-snapshot-reward" aria-label="Weekly reward">
            <p className="habit-day-nav__weekly-snapshot-reward-title">🎉 Weekly reward unlocked</p>
            <p className="habit-day-nav__weekly-snapshot-reward-values">+50 XP • +25 Dice</p>
          </section>

          <section className="habit-day-nav__weekly-snapshot-mix" aria-label="Stage mix">
            <p className="habit-day-nav__weekly-snapshot-label">Stage mix</p>
            <div className="habit-day-nav__weekly-snapshot-mix-bar" role="img" aria-label={`Easy ${stageMixSnapshot.seedPercent} percent, medium ${stageMixSnapshot.minimumPercent} percent, hard ${stageMixSnapshot.standardPercent} percent`}>
              <span style={{ width: `${stageMixSnapshot.seedPercent}%` }} />
              <span style={{ width: `${stageMixSnapshot.minimumPercent}%` }} />
              <span style={{ width: `${stageMixSnapshot.standardPercent}%` }} />
            </div>
            <p className="habit-day-nav__weekly-snapshot-mix-caption">
              Easy {stageMixSnapshot.seedPercent}% • Medium {stageMixSnapshot.minimumPercent}% • Hard {stageMixSnapshot.standardPercent}%
            </p>
          </section>

          <section className="habit-day-nav__weekly-snapshot-highlight" aria-label="Weekly highlight">
            <p className="habit-day-nav__weekly-snapshot-label">{weeklySnapshotVariant.title}</p>
            <p className="habit-day-nav__weekly-snapshot-highlight-copy">{weeklySnapshotVariant.detail}</p>
          </section>

          <details className="habit-day-nav__weekly-snapshot-details">
            <summary>Optional details</summary>
            <ul>
              {topPositiveHabits.length > 0 ? (
                <li>Top habits: {topPositiveHabits.join(' • ')}</li>
              ) : (
                <li>You showed up this week — that consistency matters.</li>
              )}
              {strongestStreakHabit ? (
                <li>{strongestStreakHabit.name} streak: {strongestStreakHabit.streak} days.</li>
              ) : null}
            </ul>
          </details>

          <footer className="habit-day-nav__weekly-snapshot-actions">
            <button type="button" className="habit-day-nav__weekly-snapshot-button habit-day-nav__weekly-snapshot-button--primary" onClick={() => setIsWeeklyHabitReviewOpen(false)}>
              Explore next week ideas
            </button>
            <button type="button" className="habit-day-nav__weekly-snapshot-button habit-day-nav__weekly-snapshot-button--ghost" onClick={() => setIsWeeklyHabitReviewOpen(false)}>
              Maybe later
            </button>
          </footer>
        </div>
      </div>
    </div>
  ) : null;

  const visionRewardModal =
    isVisionRewardOpen ? (
      <div
        className="habit-day-nav__vision-modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="Vision star reward"
        onClick={closeVisionReward}
      >
        <div
          className="habit-day-nav__vision-modal"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="habit-day-nav__vision-modal-close"
            onClick={closeVisionReward}
            aria-label="Close reward dialog"
          >
            ✕
          </button>
          <span className="habit-day-nav__vision-modal-eyebrow">
            {visionReward?.isSpecial ? 'Weekly special vision star' : 'Vision board magic'}
          </span>
          <h3 className="habit-day-nav__vision-modal-title">
            {visionReward?.isSpecial ? '🌌 AI Story Star' : '✨ Your vision star ✨'}
          </h3>
          <div className="habit-day-nav__vision-modal-intro" aria-hidden="true">
            📸 🖼️ 🎯 ✨ 🚀
          </div>
          <div className="habit-day-nav__vision-modal-frame">
            {isVisionRewardSelecting && visionImages.length > 0 && (
              <div className={`habit-day-nav__vision-modal-slot-container${isSlotLanding ? ' habit-day-nav__vision-modal-slot-container--landing' : ''}`} aria-hidden="true">
                <div className="habit-day-nav__vision-modal-slot-reel">
                  {/* Create a repeating list of images for the slot machine effect */}
                  {Array.from({ length: SLOT_MACHINE_TOTAL_ITEMS }).map((_, idx) => {
                    const image = visionImages[idx % visionImages.length];
                    const isSelectedPosition = idx === SLOT_MACHINE_SELECTED_INDEX;
                    return (
                      <img
                        key={`slot-${idx}`}
                        className={`habit-day-nav__vision-modal-slot-item ${
                          isSelectedPosition ? 'habit-day-nav__vision-modal-slot-item--selected' : ''
                        }`}
                        src={image.publicUrl}
                        alt=""
                      />
                    );
                  })}
                </div>
              </div>
            )}
            {!isVisionRewardSelecting && shouldShowVisionLoading && (
              <div className="habit-day-nav__vision-modal-loading" aria-hidden="true">
                <span className="habit-day-nav__vision-modal-bloom" />
                <span className="habit-day-nav__vision-modal-loading-text">
                  Selecting today&apos;s image
                  <span className="habit-day-nav__vision-modal-loading-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                </span>
              </div>
            )}
            {visionReward?.imageUrl ? (
              <img
                className={`habit-day-nav__vision-modal-image ${
                  isVisionImageLoaded ? 'habit-day-nav__vision-modal-image--loaded' : ''
                }`}
                src={visionReward.imageUrl}
                alt={visionReward.caption ? `Vision board: ${visionReward.caption}` : 'Vision board inspiration'}
                onLoad={() => setIsVisionImageLoaded(true)}
                onError={() => setIsVisionImageLoaded(true)}
                onClick={() => setVisionPreviewImage({ id: 'vision-star-reward', publicUrl: visionReward.imageUrl, caption: visionReward.caption } as VisionImage)}
              />
            ) : null}
          </div>
          <div className="habit-day-nav__vision-modal-claim">
            <p className="habit-day-nav__vision-modal-caption">
              {visionRewardError
                ? visionRewardError
                : visionReward?.caption ?? 'A spark for your next win.'}
            </p>
            {visionReward?.isSpecial && visionReward.specialStoryPanels?.length ? (
              <ol className="habit-day-nav__vision-special-story">
                {visionReward.specialStoryPanels.slice(0, 5).map((panel) => (
                  <li key={panel}>{panel}</li>
                ))}
              </ol>
            ) : null}
            <button
              type="button"
              className="habit-day-nav__vision-modal-button habit-day-nav__vision-modal-button--claim"
              onClick={handleVisionRewardClaim}
              ref={visionClaimButtonRef}
              disabled={!isVisionRewardReady}
            >
              {visionRewardClaimLabel}
            </button>
            <button
              type="button"
              className={`habit-day-nav__vision-modal-button habit-day-nav__vision-modal-button--visualize ${
                visionReward?.isSuperBoost ? 'habit-day-nav__vision-modal-button--super-boost' : ''
              }`}
              onClick={() => {
                closeVisionReward();
                openVisionVisualization();
              }}
            >
              {visionReward?.isSuperBoost ? 'Visualization super boost' : 'Visualization +50 XP'}
            </button>
          </div>
        </div>
      </div>
    ) : null;
  const visionVisualizationModal = isVisionVisualizationOpen ? (
    <div
      className="habit-day-nav__vision-visualize-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Guided vision visualization"
      onClick={closeVisionVisualization}
    >
      <div
        className="habit-day-nav__vision-visualize-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="habit-day-nav__vision-visualize-close"
          onClick={closeVisionVisualization}
          aria-label="Close visualization"
        >
          ✕
        </button>
        <span className="habit-day-nav__vision-visualize-eyebrow">Vision star journey</span>
        <h3 className="habit-day-nav__vision-visualize-title">2-minute guided visualization</h3>
        <p className="habit-day-nav__vision-visualize-subtitle">
          Step {visionVisualizationStep} of 3 · Bring the now and the end goal together.
        </p>
        {visionVisualizationStep === 1 && (
          <div className="habit-day-nav__vision-visualize-step">
            <h4>Step 1: Capture your “Now”</h4>
            <p>Upload a quick snapshot of your current reality (physique, workspace, car, or apartment).</p>
            <label className="habit-day-nav__vision-visualize-upload">
              <input
                type="file"
                accept="image/*"
                onChange={(event) => handleVisionNowImageChange(event.target.files?.[0] ?? null)}
              />
              <span>{visionNowImageName || 'Upload Now image'}</span>
            </label>
            {visionNowImagePreview && (
              <img
                className="habit-day-nav__vision-visualize-preview"
                src={visionNowImagePreview}
                alt="Now image preview"
              />
            )}
          </div>
        )}
        {visionVisualizationStep === 2 && (
          <div className="habit-day-nav__vision-visualize-step">
            <h4>Step 2: Choose your end goal photo</h4>
            <p>Select an existing vision board image or upload a new one.</p>
            {visionImages.length > 0 && (
              <div className="habit-day-nav__vision-visualize-grid">
                {visionImages.slice(0, 6).map((image) => (
                  <button
                    key={image.id}
                    type="button"
                    className={`habit-day-nav__vision-visualize-thumb ${
                      visionGoalImagePreview === image.publicUrl
                        ? 'habit-day-nav__vision-visualize-thumb--active'
                        : ''
                    }`}
                    onClick={() => handleVisionGoalImageSelect(image)}
                  >
                    <img src={image.publicUrl} alt={image.caption ?? 'Vision board image'} />
                  </button>
                ))}
              </div>
            )}
            <label className="habit-day-nav__vision-visualize-upload">
              <input
                type="file"
                accept="image/*"
                onChange={(event) => handleVisionGoalImageChange(event.target.files?.[0] ?? null)}
              />
              <span>{visionGoalImageName || 'Upload end-goal image'}</span>
            </label>
            {visionGoalImagePreview && (
              <img
                className="habit-day-nav__vision-visualize-preview"
                src={visionGoalImagePreview}
                alt="End goal preview"
              />
            )}
          </div>
        )}
        {visionVisualizationStep === 3 && (
          <div className="habit-day-nav__vision-visualize-step">
            <h4>Step 3: Guided visualization</h4>
            <div className="habit-day-nav__vision-visualize-images">
              {visionNowImagePreview && (
                <div>
                  <p className="habit-day-nav__vision-visualize-label">Now</p>
                  <img src={visionNowImagePreview} alt="Now state" />
                </div>
              )}
              {visionGoalImagePreview && (
                <div>
                  <p className="habit-day-nav__vision-visualize-label">End goal</p>
                  <img src={visionGoalImagePreview} alt="End goal vision" />
                </div>
              )}
            </div>
            <div className="habit-day-nav__vision-visualize-questions">
              <label>
                Quick question 1: What is the loudest feeling in your “now” image?
                <input
                  type="text"
                  value={visionQuickNowFeeling}
                  onChange={(event) => setVisionQuickNowFeeling(event.target.value)}
                  placeholder="One word or short phrase"
                />
              </label>
              <label>
                Quick question 2: What is one tiny action that moves you toward the end goal today?
                <input
                  type="text"
                  value={visionQuickMicroAction}
                  onChange={(event) => setVisionQuickMicroAction(event.target.value)}
                  placeholder="Keep it simple"
                />
              </label>
            </div>
            <div className="habit-day-nav__vision-visualize-guidance">
              <p>
                Take a deep breath. For the next two minutes, imagine the bridge between your current
                reality and your end goal. Feel the progress, the habits, and the momentum.
              </p>
              <div className="habit-day-nav__vision-visualize-timer">
                <span>{visionVisualizationTimeLabel}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (visionVisualizationSeconds === 0) {
                      setVisionVisualizationSeconds(120);
                    }
                    setIsVisionVisualizationRunning((prev) => !prev);
                  }}
                >
                  {isVisionVisualizationRunning ? 'Pause timer' : 'Start 2-minute visualization'}
                </button>
              </div>
              {visionGoalImageCaption && (
                <p className="habit-day-nav__vision-visualize-caption">
                  End-goal focus: {visionGoalImageCaption}
                </p>
              )}
            </div>
          </div>
        )}
        <div className="habit-day-nav__vision-visualize-actions">
          {visionVisualizationStep > 1 && (
            <button
              type="button"
              className="habit-day-nav__vision-visualize-button habit-day-nav__vision-visualize-button--ghost"
              onClick={() => setVisionVisualizationStep((prev) => (prev - 1) as 1 | 2 | 3)}
            >
              Back
            </button>
          )}
          {visionVisualizationStep < 3 && (
            <button
              type="button"
              className="habit-day-nav__vision-visualize-button"
              onClick={() => setVisionVisualizationStep((prev) => (prev + 1) as 1 | 2 | 3)}
              disabled={
                (visionVisualizationStep === 1 && !visionNowImagePreview) ||
                (visionVisualizationStep === 2 && !visionGoalImagePreview)
              }
            >
              Next
            </button>
          )}
          {visionVisualizationStep === 3 && (
            <button
              type="button"
              className="habit-day-nav__vision-visualize-button"
              onClick={closeVisionVisualization}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  ) : null;
  const habitVisionPreviewModalContent = visionPreviewImage ? (
    <div className="habit-vision-modal" onClick={() => setVisionPreviewImage(null)}>
      <div className="habit-vision-modal__content" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="habit-vision-modal__close"
          onClick={() => setVisionPreviewImage(null)}
          aria-label="Close vision image"
        >
          ×
        </button>
        <div className="habit-vision-modal__image-frame">
          <img
            className="habit-vision-modal__image"
            src={visionPreviewImage.publicUrl}
            alt={visionPreviewImage.caption ? `Vision board: ${visionPreviewImage.caption}` : 'Vision board inspiration'}
          />
        </div>
        {visionPreviewImage.caption ? (
          <p className="habit-vision-modal__caption">{visionPreviewImage.caption}</p>
        ) : null}
        <p className="habit-vision-modal__hint">Tap outside the card or press × to close.</p>
      </div>
    </div>
  ) : null;
  const habitVisionPreviewModal = habitVisionPreviewModalContent
    ? modalRoot
      ? createPortal(habitVisionPreviewModalContent, modalRoot)
      : habitVisionPreviewModalContent
    : null;

  useEffect(() => {
    onVisionRewardOpenChange?.(isVisionRewardOpen);
  }, [isVisionRewardOpen, onVisionRewardOpenChange]);

  useEffect(() => {
    if (!visionPreviewImage) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visionPreviewImage]);

  useEffect(() => {
    setIsVisionRewardOpen(false);
    setVisionRewardError(null);
    setIsStarBursting(false);
    setIsVisionRewardSelecting(false);
    setIsSlotLanding(false);
  }, [activeDate]);

  useEffect(() => {
    const stored = loadDraft<boolean>(visionStarStorageKey(session.user.id, activeDate));
    setHasClaimedVisionStar(Boolean(stored));
  }, [activeDate, session.user.id]);

  useEffect(() => {
    const storedReward = loadDraft<VisionReward>(visionStarRewardKey(session.user.id, activeDate));
    if (storedReward) {
      setVisionReward({
        ...storedReward,
        diceAwarded: storedReward.diceAwarded ?? 25,
      });
      setVisionRewardDate(activeDate);
      return;
    }
    setVisionReward(null);
    setVisionRewardDate(null);
  }, [activeDate, session.user.id]);

  useEffect(() => {
    if (trackingMetaFadeTimeoutRef.current) {
      window.clearTimeout(trackingMetaFadeTimeoutRef.current);
    }

    if (hasClaimedVisionStar && isViewingToday) {
      trackingMetaFadeTimeoutRef.current = window.setTimeout(() => {
        setShouldFadeTrackingMeta(true);
      }, 1000);
    } else {
      setShouldFadeTrackingMeta(false);
    }

    return () => {
      if (trackingMetaFadeTimeoutRef.current) {
        window.clearTimeout(trackingMetaFadeTimeoutRef.current);
      }
    };
  }, [hasClaimedVisionStar, isViewingToday]);

  useEffect(() => {
    const draftKey = quickJournalDraftKey(session.user.id, activeDate);
    const hasContent = Boolean(
      quickJournalMode === 'pulse' ||
      quickJournalMorning ||
        quickJournalDay ||
        quickJournalEvening ||
        quickJournalInteractions ||
        quickJournalFreeform ||
        quickDreamTitle ||
        quickDreamSymbols ||
        quickDreamEmotions ||
        quickDreamReflection
    );

    if (!hasContent && !isQuickJournalOpen) {
      removeDraft(draftKey);
      return;
    }

    saveDraft(draftKey, {
      isOpen: isQuickJournalOpen,
      mode: quickJournalMode,
      morning: quickJournalMorning,
      day: quickJournalDay,
      evening: quickJournalEvening,
      interactions: quickJournalInteractions,
      freeform: quickJournalFreeform,
      energy: quickJournalEnergy,
      mood: quickJournalMood,
      focus: quickJournalFocus,
      stress: quickJournalStress,
      dreamTitle: quickDreamTitle,
      dreamSymbols: quickDreamSymbols,
      dreamEmotions: quickDreamEmotions,
      dreamReflection: quickDreamReflection,
    } satisfies QuickJournalDraft);
  }, [
    activeDate,
    session.user.id,
    isQuickJournalOpen,
    quickJournalMode,
    quickJournalMorning,
    quickJournalDay,
    quickJournalEvening,
    quickJournalInteractions,
    quickJournalFreeform,
    quickJournalEnergy,
    quickJournalMood,
    quickJournalFocus,
    quickJournalStress,
    quickDreamTitle,
    quickDreamSymbols,
    quickDreamEmotions,
    quickDreamReflection,
  ]);

  useEffect(() => {
    if (!skipMenuHabitId) return undefined;

    const handleDocumentClick = (event: MouseEvent) => {
      if (!skipMenuRef.current) return;
      if (skipMenuRef.current.contains(event.target as Node)) {
        return;
      }
      setSkipMenuHabitId(null);
      setSkipReasonHabitId(null);
      setSkipReason('');
      setSkipError(null);
    };

    document.addEventListener('click', handleDocumentClick);

    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [skipMenuHabitId]);

  useEffect(() => {
    const todayDraft = loadIntentionsDraft(session.user.id, activeDate, 'today');
    const tomorrowDraft = loadIntentionsDraft(session.user.id, activeDate, 'tomorrow');
    const draft = todayDraft ?? tomorrowDraft;
    if (draft) {
      setIntentionsJournalContent(draft.content ?? '');
      setIntentionsJournalType(draft.type ?? 'today');
      const hasContent = Boolean(draft.content);
      setIsIntentionsJournalOpen(draft.isOpen || hasContent);
    } else {
      setIntentionsJournalContent('');
      setIntentionsJournalType('today');
      setIsIntentionsJournalOpen(false);
    }
    setIntentionsJournalError(null);
    setIntentionsJournalStatus(null);
  }, [activeDate, session.user.id]);

  useEffect(() => {
    let isActive = true;
    const nextDate = formatISODate(addDays(parseISODate(activeDate), 1));

    const loadIntentionsEntries = async () => {
      const { data, error } = await listJournalEntries({
        fromDate: activeDate,
        toDate: nextDate,
        tag: 'intentions',
        limit: 25,
      });

      if (!isActive) return;

      if (error) {
        setTodayIntentionsEntry(null);
        setNextDayIntentionsEntry(null);
        return;
      }

      const entries = data ?? [];
      const todayEntry =
        entries.find(
          (entry) => entry.entry_date === activeDate && entry.title === "Today's Intentions",
        ) ?? null;
      const tomorrowEntry =
        entries.find(
          (entry) => entry.entry_date === nextDate && entry.title === "Tomorrow's Intentions",
        ) ?? null;

      setTodayIntentionsEntry(todayEntry);
      setNextDayIntentionsEntry(tomorrowEntry);
    };

    void loadIntentionsEntries();

    if (activeDate !== today) {
      setYesterdayIntentionsEntry(null);
      setIsIntentionsNoticeViewed(false);
      setIsIntentionsMet(false);
      return () => {
        isActive = false;
      };
    }

    const loadIntentionsNotice = async () => {
      const { data, error } = await listJournalEntries({
        fromDate: today,
        toDate: today,
        tag: 'intentions',
        limit: 25,
      });

      if (!isActive) return;

      if (error) {
        setYesterdayIntentionsEntry(null);
        setIsIntentionsNoticeViewed(false);
        return;
      }

      const match = data?.find((entry) => entry.title === "Tomorrow's Intentions") ?? null;
      setYesterdayIntentionsEntry(match);
      if (match) {
        const viewed = loadDraft<boolean>(intentionsNoticeStorageKey(session.user.id, today));
        setIsIntentionsNoticeViewed(Boolean(viewed));
        const met = loadDraft<boolean>(intentionsMeetStorageKey(session.user.id, today));
        setIsIntentionsMet(Boolean(met));
      } else {
        setIsIntentionsNoticeViewed(false);
        setIsIntentionsMet(false);
      }
    };

    void loadIntentionsNotice();

    return () => {
      isActive = false;
    };
  }, [activeDate, session.user.id, today]);

  useEffect(() => {
    const draftKey = intentionsJournalDraftKey(session.user.id, activeDate, intentionsJournalType);
    if (!intentionsJournalContent && !isIntentionsJournalOpen) {
      removeDraft(draftKey);
      removeDraft(legacyIntentionsJournalDraftKey(session.user.id, activeDate));
      return;
    }

    saveDraft(draftKey, {
      isOpen: isIntentionsJournalOpen,
      type: intentionsJournalType,
      content: intentionsJournalContent,
    } satisfies IntentionsJournalDraft);
    removeDraft(legacyIntentionsJournalDraftKey(session.user.id, activeDate));
  }, [
    activeDate,
    session.user.id,
    intentionsJournalContent,
    intentionsJournalType,
    isIntentionsJournalOpen,
  ]);

  const monthlySummary = useMemo(() => {
    if (!habits.length || !monthDays.length) {
      return { scheduledTotal: 0, scheduledComplete: 0 } as const;
    }

    let scheduledTotal = 0;
    let scheduledComplete = 0;

    for (const habit of habits) {
      for (const dateISO of monthDays) {
        if (!isHabitScheduledOnDate(habit, dateISO)) {
          continue;
        }

        scheduledTotal += 1;
        const isCompleted = Boolean(monthlyCompletions[habit.id]?.[dateISO]?.completed);
        if (isCompleted) {
          scheduledComplete += 1;
        }
      }
    }

    return { scheduledTotal, scheduledComplete } as const;
  }, [habits, monthDays, monthlyCompletions]);

  const sortedMonthlyHabits = useMemo(() => {
    if (!monthlyStats?.habits?.length) {
      return [];
    }

    return [...monthlyStats.habits].sort((a, b) => {
      const aInsight = habitInsights[a.habitId];
      const bInsight = habitInsights[b.habitId];
      const aCurrent = aInsight?.currentStreak ?? 0;
      const bCurrent = bInsight?.currentStreak ?? 0;
      if (aCurrent !== bCurrent) {
        return bCurrent - aCurrent;
      }
      const aLongest = aInsight?.longestStreak ?? 0;
      const bLongest = bInsight?.longestStreak ?? 0;
      if (aLongest !== bLongest) {
        return bLongest - aLongest;
      }
      return a.habitName.localeCompare(b.habitName);
    });
  }, [monthlyStats, habitInsights]);

  const refreshHabits = useCallback(async () => {
    if (!isConfigured) {
      setHabits([]);
      setCompletions({});
      setMonthlyCompletions({});
      setHabitInsights({});
      setHistoricalLogs([]);
      setMonthDays([]);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const currentDate = new Date();
    const todayISO = formatISODate(currentDate);
    const trackingDateISO = activeDate > todayISO
      ? todayISO
      : activeDate;
    // Use selected month/year instead of current month for monthly grid
    const monthStartDate = new Date(selectedYear, selectedMonth, 1);
    const monthEndDate = new Date(selectedYear, selectedMonth + 1, 0);
    const monthStartISO = formatISODate(monthStartDate);
    const monthEndISO = formatISODate(monthEndDate);
    const monthDayList = generateDateRange(monthStartDate, monthEndDate);
    setToday(todayISO);
    if (trackingDateISO !== activeDate) {
      setActiveDate(trackingDateISO);
    }
    setMonthDays(monthDayList);

    // TODO: Backend optimization - Consider adding Supabase query optimization for monthly aggregation:
    // 1. Create a materialized view or function to aggregate habit completion by month
    // 2. Add indexes on habit_logs(date) and habit_logs(habit_id, date) for faster range queries
    // 3. Consider caching monthly statistics to reduce database load
    // 4. Add RLS policies to ensure users can only access their own monthly data

    try {
      if (!isDemoExperience) {
        await autoResumeDueHabits(session.user.id);
      }

      const { data: habitData, error: habitError } = await fetchHabitsForUser(session.user.id);
      if (habitError) throw habitError;

      const nextHabits = habitData ?? [];
      setHabits(nextHabits);

      if (nextHabits.length === 0) {
        setCompletions({});
        setMonthlyCompletions({});
        setHabitInsights({});
        setHistoricalLogs([]);
        return;
      }

      const habitIds = nextHabits.map((habit) => habit.id);
      const lookbackStartCandidate = subtractDays(currentDate, STREAK_LOOKBACK_DAYS - 1);
      const lookbackStart = monthStartDate < lookbackStartCandidate ? monthStartDate : lookbackStartCandidate;
      const { data: logs, error: logsError } = await fetchHabitLogsForRange(
        habitIds,
        formatISODate(lookbackStart),
        monthEndISO,
      );
      if (logsError) throw logsError;

      const logRows = logs ?? [];

      const baseState = habitIds.reduce<Record<string, HabitCompletionState>>((acc, habitId) => {
        acc[habitId] = { logId: null, completed: false };
        return acc;
      }, {});

      const baseMonthlyState = nextHabits.reduce<Record<string, HabitMonthlyCompletionState>>(
        (acc, habit) => {
          const matrix = monthDayList.reduce<HabitMonthlyCompletionState>((dayAcc, dateIso) => {
            dayAcc[dateIso] = { logId: null, completed: false };
            return dayAcc;
          }, {} as HabitMonthlyCompletionState);
          acc[habit.id] = matrix;
          return acc;
        },
        {},
      );

      for (const log of logRows) {
        const completedState: HabitCompletionState = {
          logId: log.id,
          completed: Boolean(log.completed),
          progressState: (log.progress_state as ProgressState) ?? 'done',
          completionPercentage: log.completion_percentage ?? 100,
          loggedStage: (log.logged_stage as AutoProgressTier | null) ?? null,
        };

        if (log.date === trackingDateISO) {
          baseState[log.habit_id] = completedState;
        }

        if (log.date >= monthStartISO && log.date <= monthEndISO) {
          const habitMatrix = baseMonthlyState[log.habit_id];
          if (habitMatrix) {
            habitMatrix[log.date] = completedState;
          }
        }
      }

      setCompletions(baseState);
      setMonthlyCompletions(baseMonthlyState);
      setHistoricalLogs(logRows);
      setHabitInsights(calculateHabitInsights(nextHabits, logRows, trackingDateISO));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to load habits right now. Try refreshing shortly.',
      );
    } finally {
      setLoading(false);
    }
  }, [session, isConfigured, isDemoExperience, selectedMonth, selectedYear, activeDate, variant]);

  useEffect(() => {
    if (!isConfigured) {
      return;
    }
    void refreshHabits();
  }, [session?.user?.id, isConfigured, isDemoExperience, refreshHabits]);

  useEffect(() => {
    if (loading || showYesterdayRecap) return;
    if (!session?.user?.id) return;
    if (!habits.length) return;
    if (!getYesterdayRecapEnabled(session.user.id)) return;

    const todayISO = formatISODate(new Date());
    const lastShown = getYesterdayRecapLastShown(session.user.id);
    if (lastShown === todayISO) return;

    const scheduledYesterday = habits.filter((habit) => isHabitScheduledOnDate(habit, yesterdayISO));
    if (scheduledYesterday.length === 0) return;

    const completedYesterday = historicalLogs.some(
      (log) => log.date === yesterdayISO && log.completed,
    );
    if (completedYesterday) return;

    setYesterdayHabits(scheduledYesterday);
    setYesterdaySelections(
      scheduledYesterday.reduce<Record<string, boolean>>((acc, habit) => {
        acc[habit.id] = false;
        return acc;
      }, {}),
    );
    setYesterdayActionStatus(null);
    setShowYesterdayRecap(true);
    setYesterdayRecapLastShown(session.user.id, todayISO);
  }, [loading, showYesterdayRecap, session?.user?.id, habits, historicalLogs, yesterdayISO]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    setModalRoot(document.body);
  }, []);

  useEffect(() => {
    if (!editHabit) {
      setEditLifeWheelKey(LIFE_WHEEL_UNASSIGNED);
      setEditGoalId(GOAL_UNASSIGNED);
      setEditTitle('');
      setEditNotes('');
      setEditError(null);
      return;
    }

    const domainMeta = extractLifeWheelDomain(editHabit.schedule);
    setEditLifeWheelKey(domainMeta?.key ?? LIFE_WHEEL_UNASSIGNED);
    setEditGoalId(editHabit.goalId ?? GOAL_UNASSIGNED);
    const baseNotes = extractHabitNotes(editHabit.schedule);
    if (pendingReviewAiApply?.habitId === editHabit.id) {
      setEditTitle(pendingReviewAiApply.title || editHabit.name);
      setEditNotes(baseNotes ? `${baseNotes}\n\nAI redesign draft: ${pendingReviewAiApply.rationale}` : `AI redesign draft: ${pendingReviewAiApply.rationale}`);
      setPendingReviewAiApply(null);
    } else {
      setEditTitle(editHabit.name);
      setEditNotes(baseNotes);
    }
    setEditError(null);
  }, [editHabit, pendingReviewAiApply]);

  useEffect(() => {
    if (!editHabit) return;
    setGoalsLoading(true);
    void (async () => {
      try {
        const { data, error } = await fetchGoals();
        if (error) throw error;
        setGoals(data ?? []);
      } catch (error) {
        setGoals([]);
        setEditError(
          error instanceof Error ? error.message : 'Unable to load goals right now.',
        );
      } finally {
        setGoalsLoading(false);
      }
    })();
  }, [editHabit]);

  // Extracted function to load monthly statistics (reused in useEffect and handleMonthChange)
  const loadMonthlyStats = useCallback(async (year: number, month: number) => {
    if (!isConfigured || !session?.user?.id) {
      return;
    }
    
    const result = await getHabitCompletionsByMonth(
      session.user.id,
      year,
      month + 1, // Convert from 0-11 to 1-12
    );
    
    if (result.data) {
      setMonthlyStats(result.data);
    } else if (result.error) {
      console.error('Error loading monthly statistics:', result.error);
    }
    
    // Also fetch per-day completion grid for the monthly table
    const gridResult = await getMonthlyCompletionGrid(
      session.user.id,
      year,
      month + 1, // Convert from 0-11 to 1-12
    );
    
    if (gridResult.data) {
      setMonthlyCompletionsV2(gridResult.data);
    } else if (gridResult.error) {
      console.error('Error loading monthly completion grid:', gridResult.error);
    }
  }, [session?.user?.id, isConfigured]);

  const refreshQueueStatus = useCallback(async () => {
    if (!isConfigured || !session?.user?.id) {
      setQueueStatus({ pending: 0, failed: 0 });
      return;
    }
    const [completionStatus, logStatus, reminderStatus, habitsStatus] = await Promise.all([
      getHabitCompletionQueueStatus(session.user.id),
      getHabitLogQueueStatus(session.user.id),
      getHabitReminderQueueStatus(session.user.id),
      getHabitsV2QueueStatus(session.user.id),
    ]);
    setQueueStatus({
      pending: completionStatus.pending + logStatus.pending + reminderStatus.pending + habitsStatus.pending,
      failed: completionStatus.failed + logStatus.failed + reminderStatus.failed + habitsStatus.failed,
    });
  }, [isConfigured, session?.user?.id]);

  // Load monthly statistics when month changes
  useEffect(() => {
    void loadMonthlyStats(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, loadMonthlyStats]);

  useEffect(() => {
    void refreshQueueStatus();
    const interval = window.setInterval(() => {
      void refreshQueueStatus();
    }, 15000);
    return () => window.clearInterval(interval);
  }, [refreshQueueStatus]);

  useEffect(() => {
    if (!isConfigured && !isDemoExperience) {
      setHabits([]);
      setCompletions({});
      setMonthlyCompletions({});
      setHabitInsights({});
      setHistoricalLogs([]);
      setMonthDays([]);
    }
  }, [isConfigured, isDemoExperience]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') {
        return;
      }

      const { type, detail } = data as { type?: string; detail?: { pending?: number } };
      if (type === 'SUPABASE_WRITE_QUEUED') {
        setErrorMessage(OFFLINE_SYNC_MESSAGE);
      } else if (type === 'SUPABASE_QUEUE_FLUSHED') {
        setErrorMessage((current) => {
          if (!current) return null;
          return current === OFFLINE_SYNC_MESSAGE || current === QUEUE_RETRY_MESSAGE ? null : current;
        });
        if (detail?.pending === 0) {
          void refreshHabits();
        }
      } else if (type === 'SUPABASE_QUEUE_REPLAY_FAILED') {
        setErrorMessage(QUEUE_RETRY_MESSAGE);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [refreshHabits]);

  useEffect(() => {
    if (!isConfigured || !session?.user?.id) {
      return;
    }

    const runSync = () => {
      Promise.all([
        syncQueuedHabitCompletions(session.user.id),
        syncQueuedHabitLogs(session.user.id),
        syncQueuedHabitReminderPrefs(session.user.id),
        syncQueuedHabitsV2Mutations(session.user.id),
      ])
        .then(() => Promise.all([loadMonthlyStats(selectedYear, selectedMonth), refreshHabits(), refreshQueueStatus()]))
        .catch(() => undefined);
    };

    runSync();
    window.addEventListener('online', runSync);

    return () => {
      window.removeEventListener('online', runSync);
    };
  }, [isConfigured, loadMonthlyStats, refreshHabits, refreshQueueStatus, selectedMonth, selectedYear, session?.user?.id]);

  useEffect(() => {
    if (queueStatus.pending === 0 && queueStatus.failed === 0) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue =
        'You have unsynced habit completion changes on this device. Leaving now may discard unsynced updates.';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [queueStatus.pending, queueStatus.failed]);

  const toggleHabitForDate = async (habit: HabitWithGoal, dateISO: string) => {
    if (!isConfigured && !isDemoExperience) {
      setErrorMessage('Supabase credentials are not configured yet.');
      return;
    }

    const isActiveDay = dateISO === activeDate;
    const isToday = dateISO === today;
    const cellKey = `${habit.id}:${dateISO}`;

    if (isActiveDay) {
      setSaving((current) => ({ ...current, [habit.id]: true }));
    }
    setMonthlySaving((current) => ({ ...current, [cellKey]: true }));
    setErrorMessage(null);

    const existingToday = completions[habit.id];
    const existingMonthly = monthlyCompletions[habit.id]?.[dateISO];
    const wasCompleted = Boolean(existingMonthly?.completed || (isActiveDay && existingToday?.completed));

    try {
      if (wasCompleted) {
        const { error } = await clearHabitCompletion(habit.id, dateISO);
        if (error) throw error;

        if (isActiveDay) {
          setCompletions((current) => ({ ...current, [habit.id]: { logId: null, completed: false } }));
        }

        setMonthlyCompletions((current) => {
          const next = { ...current };
          const habitMatrix = { ...(next[habit.id] ?? {}) };
          habitMatrix[dateISO] = { logId: null, completed: false };
          next[habit.id] = habitMatrix;
          return next;
        });

        setHistoricalLogs((current) => {
          const nextLogs = current.filter((log) => !(log.habit_id === habit.id && log.date === dateISO));
          setHabitInsights(calculateHabitInsights(habits, nextLogs, activeDate));
          return nextLogs;
        });
      } else {
        const payload: HabitLogInsert = {
          habit_id: habit.id,
          date: dateISO,
          completed: true,
        };
        const { data, error } = await logHabitCompletion(payload);
        if (error) throw error;
        const logRow: HabitLogRow =
          data ?? ({
            id: existingMonthly?.logId ?? `temp-${habit.id}-${dateISO}`,
            habit_id: habit.id,
            date: dateISO,
            completed: true,
          } satisfies HabitLogRow);

        if (isActiveDay) {
          setCompletions((current) => ({
            ...current,
            [habit.id]: { logId: logRow.id, completed: true },
          }));
        }

        setMonthlyCompletions((current) => {
          const next = { ...current };
          const habitMatrix = { ...(next[habit.id] ?? {}) };
          habitMatrix[dateISO] = { logId: logRow.id, completed: true };
          next[habit.id] = habitMatrix;
          return next;
        });

        setHistoricalLogs((current) => {
          const nextLogs = current.filter((log) => !(log.habit_id === habit.id && log.date === dateISO));
          nextLogs.push(logRow);
          setHabitInsights(calculateHabitInsights(habits, nextLogs, activeDate));
          return nextLogs;
        });

        // 🎮 Award XP for completing today's habits
        if (isActiveDay) {
          playHabitCompleteSfx();

          const now = new Date();
          const xpAmount = now.getHours() < 9
            ? XP_REWARDS.HABIT_COMPLETE_EARLY
            : XP_REWARDS.HABIT_COMPLETE;
          const offerPrice = offerPriceByHabitId(habit.id);
          const defaultPrice = defaultPriceByHabitId(habit.id);
          const effectivePrice = offerPrice ?? defaultPrice;
          const effectivePriceXpAmount =
            effectivePrice && XP_TO_GOLD_RATIO > 0
              ? Math.round(effectivePrice / XP_TO_GOLD_RATIO)
              : null;
          const projectedStreak = (habitInsights[habit.id]?.currentStreak ?? 0) + 1;
          const feedbackType = getHabitFeedbackType(projectedStreak);

          // 1. Immediately add instant feedback (pop/glow + typed visual style)
          setJustCompletedHabitId(habit.id);
          setHabitFeedbackById((current) => ({ ...current, [habit.id]: feedbackType }));
          triggerHabitHapticFeedback(feedbackType);

          // 2. After pop animation completes, trigger celebration
          setTimeout(() => {
            setCelebrationType('habit');
            setCelebrationXP(xpAmount);
            setShowCelebration(true);
          }, 300);

          // 3. Clean up instant feedback class
          setTimeout(() => {
            setJustCompletedHabitId(null);
            setHabitFeedbackById((current) => {
              const next = { ...current };
              delete next[habit.id];
              return next;
            });
          }, 500);

          await earnXP(xpAmount, 'habit_complete', habit.id);
          if (effectivePriceXpAmount) {
            await earnXP(
              effectivePriceXpAmount,
              offerPrice ? 'habit_offer' : 'habit_dynamic_reward',
              habit.id,
              offerPrice ? 'Time-limited habit offer' : 'Dynamic default habit reward',
            );

            if (offerPrice && session?.user?.id && isConfigured && !isDemoExperience) {
              void recordTelemetryEvent({
                userId: session.user.id,
                eventType: 'habit_time_limited_offer_claimed',
                metadata: {
                  offerDate: dateISO,
                  habitId: habit.id,
                  habitName: habit.name,
                  offerPrice,
                  offerXpAmount: effectivePriceXpAmount,
                  healthState: habitHealthByHabitId[habit.id] ?? 'active',
                  adherencePct: Math.round(
                    ((adherenceByHabit[habit.id]?.percentage ?? 100) + Number.EPSILON) * 100,
                  ) / 100,
                  isPrimaryOfferHabit: habit.id === timeLimitedOffer.nextHabitId,
                  isBadHabitOffer: habit.id === timeLimitedOffer.badHabitId,
                },
              });
            }
          }

          const currentState = getAutoProgressState({
            autoprog: habit.autoprog ?? null,
            schedule: (habit.schedule ?? { mode: 'daily' }) as Json,
            target_num: habit.target_num ?? null,
          } as unknown as HabitV2Row);
          if (
            projectedStreak >= 7 &&
            (currentState.review_reason === 'redesign' || currentState.review_reason === 'replace')
          ) {
            await awardHabitRecoveryXp({
              habitId: habit.id,
              rewardKey: `relaunch-7day-success:${currentState.review_due_at ?? 'none'}`,
              xp: XP_REWARDS.HABIT_RELAUNCH_7DAY_SUCCESS,
              sourceType: 'habit_relaunch_7day_success',
              description: 'Reached a 7-day relaunch streak',
            });
          }

          await recordActivity();
          recordChallengeActivity(session.user.id, 'habit_complete');
        }
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update the habit.');
    } finally {
      if (isActiveDay) {
        setSaving((current) => ({ ...current, [habit.id]: false }));
      }
      setMonthlySaving((current) => {
        const next = { ...current };
        delete next[cellKey];
        return next;
      });
    }
  };

  const handleDoneIshCompletion = async (habit: HabitWithGoal, originElement?: HTMLElement | null) => {
    if (!isConfigured && !isDemoExperience) {
      setErrorMessage('Supabase credentials are not configured yet.');
      return;
    }

    const dateISO = activeDate;
    const isActiveDay = dateISO === activeDate;
    const isToday = dateISO === today;

    if (originElement) {
      const rect = originElement.getBoundingClientRect();
      setCelebrationOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    } else {
      setCelebrationOrigin(null);
    }

    setSaving((current) => ({ ...current, [habit.id]: true }));
    setErrorMessage(null);

    try {
      // For boolean habits with done-ish enabled, mark as 85% complete
      const completionPercentage = DONE_ISH_DEFAULT_PERCENTAGE;
      const payload: HabitLogInsert = {
        habit_id: habit.id,
        date: dateISO,
        completed: false, // done-ish means not fully done
        progress_state: 'doneIsh',
        completion_percentage: completionPercentage,
      };

      const { data, error } = await logHabitCompletion(payload);
      if (error) throw error;

      const logRow: HabitLogRow =
        data ?? ({
          id: `temp-${habit.id}-${dateISO}`,
          habit_id: habit.id,
          date: dateISO,
          completed: false,
          progress_state: 'doneIsh',
          completion_percentage: completionPercentage,
        } satisfies HabitLogRow);

      setCompletions((current) => ({
        ...current,
        [habit.id]: {
          logId: logRow.id,
          completed: false,
          progressState: 'doneIsh',
          completionPercentage,
          loggedStage: null,
        },
      }));

      setMonthlyCompletions((current) => {
        const next = { ...current };
        const habitMatrix = { ...(next[habit.id] ?? {}) };
        habitMatrix[dateISO] = {
          logId: logRow.id,
          completed: false,
          progressState: 'doneIsh',
          completionPercentage,
          loggedStage: null,
        };
        next[habit.id] = habitMatrix;
        return next;
      });

      setHistoricalLogs((current) => {
        const nextLogs = current.filter((log) => !(log.habit_id === habit.id && log.date === dateISO));
        nextLogs.push(logRow);
        setHabitInsights(calculateHabitInsights(habits, nextLogs, activeDate));
        return nextLogs;
      });

      // Fire telemetry event for done-ish completion
      if (session?.user?.id) {
        void recordTelemetryEvent({
          userId: session.user.id,
          eventType: 'habit_done_ish_completed',
          metadata: {
            habitId: habit.id,
            habitName: habit.name,
            completionPercentage,
            progressState: 'doneIsh',
          },
        });
      }

      // Award reduced XP for done-ish completion (70% of full XP)
      if (isActiveDay) {
        playHabitCompleteSfx();

        const now = new Date();
        const baseXP = now.getHours() < 9 ? XP_REWARDS.HABIT_COMPLETE_EARLY : XP_REWARDS.HABIT_COMPLETE;
        const xpAmount = Math.round(baseXP * 0.7);
        const projectedStreak = (habitInsights[habit.id]?.currentStreak ?? 0) + 1;
        const feedbackType = getHabitFeedbackType(projectedStreak);

        setJustCompletedHabitId(habit.id);
        setHabitFeedbackById((current) => ({ ...current, [habit.id]: feedbackType }));
        triggerHabitHapticFeedback(feedbackType);

        setTimeout(() => {
          setCelebrationType('habit');
          setCelebrationXP(xpAmount);
          setShowCelebration(true);
        }, 300);

        setTimeout(() => {
          setJustCompletedHabitId(null);
          setHabitFeedbackById((current) => {
            const next = { ...current };
            delete next[habit.id];
            return next;
          });
        }, 500);

        await earnXP(xpAmount, 'habit_complete', habit.id);
        await recordActivity();
        recordChallengeActivity(session.user.id, 'habit_complete');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to mark habit as done-ish.');
    } finally {
      setSaving((current) => ({ ...current, [habit.id]: false }));
    }
  };

  const handleLogHabitAtStage = async (
    habit: HabitWithGoal,
    stage: AutoProgressTier,
    originElement?: HTMLElement | null,
  ) => {
    if (!isConfigured && !isDemoExperience) {
      setErrorMessage('Supabase credentials are not configured yet.');
      return;
    }

    const dateISO = activeDate;
    const isActiveDay = dateISO === activeDate;
    const isToday = dateISO === today;
    const autoProgressHabit = buildAutoProgressHabit(habit);
    const scalePlan = getHabitScalePlan(autoProgressHabit);
    const stageConfig = scalePlan.stages[stage];
    const completionPercentage = stageConfig.completionPercent;
    const isFullCompletion = completionPercentage >= 100;
    const progressState: ProgressState = isFullCompletion ? 'done' : 'doneIsh';

    if (originElement) {
      const rect = originElement.getBoundingClientRect();
      setCelebrationOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    } else {
      setCelebrationOrigin(null);
    }

    setSaving((current) => ({ ...current, [habit.id]: true }));
    setErrorMessage(null);

    try {
      const payload: HabitLogInsert = {
        habit_id: habit.id,
        date: dateISO,
        completed: isFullCompletion,
        progress_state: progressState,
        completion_percentage: completionPercentage,
        logged_stage: stage,
      };

      const { data, error } = await logHabitCompletion(payload);
      if (error) throw error;

      const logRow: HabitLogRow =
        data ?? ({
          id: `temp-${habit.id}-${dateISO}`,
          habit_id: habit.id,
          date: dateISO,
          completed: isFullCompletion,
          progress_state: progressState,
          completion_percentage: completionPercentage,
          logged_stage: stage,
        } satisfies HabitLogRow);

      setCompletions((current) => ({
        ...current,
        [habit.id]: {
          logId: logRow.id,
          completed: isFullCompletion,
          progressState,
          completionPercentage,
          loggedStage: stage,
        },
      }));

      setMonthlyCompletions((current) => {
        const next = { ...current };
        const habitMatrix = { ...(next[habit.id] ?? {}) };
        habitMatrix[dateISO] = {
          logId: logRow.id,
          completed: isFullCompletion,
          progressState,
          completionPercentage,
          loggedStage: stage,
        };
        next[habit.id] = habitMatrix;
        return next;
      });

      setHistoricalLogs((current) => {
        const nextLogs = current.filter((log) => !(log.habit_id === habit.id && log.date === dateISO));
        nextLogs.push(logRow);
        setHabitInsights(calculateHabitInsights(habits, nextLogs, activeDate));
        return nextLogs;
      });

      if (session?.user?.id) {
        const stageMultiplier = getStageCreditMultiplier(stage);
        void recordTelemetryEvent({
          userId: session.user.id,
          eventType: 'habit_stage_logged',
          metadata: {
            habitId: habit.id,
            habitName: habit.name,
            stage,
            stageMultiplier,
            completionPercentage,
            progressState,
          },
        });
      }

      if (isActiveDay) {
        playHabitCompleteSfx();

        const now = new Date();
        const baseXP = now.getHours() < 9 ? XP_REWARDS.HABIT_COMPLETE_EARLY : XP_REWARDS.HABIT_COMPLETE;
        const stageMultiplier = getStageCreditMultiplier(stage);
        const xpAmount = Math.max(
          1,
          Math.round(baseXP * PROGRESS_STATE_EFFECTS[progressState].xpMultiplier * stageMultiplier),
        );

        const projectedStreak = (habitInsights[habit.id]?.currentStreak ?? 0) + 1;
        const feedbackType = getHabitFeedbackType(projectedStreak);

        setJustCompletedHabitId(habit.id);
        setHabitFeedbackById((current) => ({ ...current, [habit.id]: feedbackType }));
        triggerHabitHapticFeedback(feedbackType);
        setTimeout(() => {
          setCelebrationType('habit');
          setCelebrationXP(xpAmount);
          setShowCelebration(true);
        }, 300);

        setTimeout(() => {
          setJustCompletedHabitId(null);
          setHabitFeedbackById((current) => {
            const next = { ...current };
            delete next[habit.id];
            return next;
          });
        }, 500);

        await earnXP(xpAmount, 'habit_complete', habit.id);
        await recordActivity();
        recordChallengeActivity(session.user.id, 'habit_complete');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to log this habit stage.');
    } finally {
      setSaving((current) => ({ ...current, [habit.id]: false }));
    }
  };

  const toggleHabit = async (habit: HabitWithGoal, originElement?: HTMLElement | null) => {
    if (originElement) {
      const rect = originElement.getBoundingClientRect();
      setCelebrationOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    } else {
      setCelebrationOrigin(null);
    }
    await toggleHabitForDate(habit, activeDate);
  };

  const changeActiveDateBy = useCallback(
    (offsetDays: number) => {
      setActiveDate((current) => {
        const baseDate = parseISODate(current);
        const safeDate = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
        const nextDate = addDays(safeDate, offsetDays);
        const nextISO = formatISODate(nextDate);
        return nextISO > today ? today : nextISO;
      });
    },
    [today],
  );

  const handleDateInputChange = useCallback(
    (value: string) => {
      if (!value) return;
      const parsed = parseISODate(value);
      if (Number.isNaN(parsed.getTime())) return;
      const normalized = formatISODate(parsed);
      setActiveDate(normalized > today ? today : normalized);
    },
    [today],
  );

  const resetToToday = useCallback(() => setActiveDate(today), [today]);

  const loadActiveContracts = useCallback(async () => {
    setContractsLoading(true);
    setContractsError(null);

    const { data, error } = await fetchActiveContracts(session.user.id);

    if (error) {
      setContractsError(error.message);
      setActiveContracts([]);
      setContractsLoading(false);
      return;
    }

    const syncedContracts = await Promise.all(
      (data ?? []).map(async (contract) => {
        if (contract.status !== 'active') {
          return contract;
        }

        const { data: syncedContract } = await syncContractProgressWithTarget(session.user.id, contract.id);
        return syncedContract ?? contract;
      }),
    );

    setActiveContracts(syncedContracts);
    setContractsLoading(false);
  }, [session.user.id]);

  useEffect(() => {
    void loadActiveContracts();
  }, [loadActiveContracts]);

  const handleContractAction = useCallback(
    async (
      contractId: string,
      action: (userId: string, contractId: string) => Promise<{ error: Error | null }>,
      fallbackMessage: string,
    ) => {
      setContractActionId(contractId);
      setContractsError(null);

      try {
        const { error } = await action(session.user.id, contractId);
        if (error) {
          setContractsError(error.message);
          return;
        }
        await loadActiveContracts();
      } catch (error) {
        setContractsError(error instanceof Error ? error.message : fallbackMessage);
      } finally {
        setContractActionId(null);
      }
    },
    [loadActiveContracts, session.user.id],
  );

  const handlePingWitness = useCallback(async (contract: CommitmentContract) => {
    const message = `Hey ${contract.witnessLabel ?? 'my accountability witness'} — quick contract check-in: I'm committing to ${contract.targetCount} ${contract.targetType.toLowerCase()} completions ${contract.cadence === 'daily' ? 'today' : 'this week'} for "${contract.title}". A quick encouragement message from you would help me stay on track 💛`;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
      }
      await recordWitnessPing(session.user.id, contract, 'clipboard');
    } catch (error) {
      setContractsError(error instanceof Error ? error.message : 'Unable to copy witness ping message.');
    }
  }, [session.user.id]);

  /**
   * Toggle habit completion for the monthly grid using the new habit_completions table.
   * This function is specifically for monthly view interactions with habits_v2.
   */
  const toggleMonthlyHabitForDate = async (habitId: string, habitName: string, dateISO: string) => {
    if (!isConfigured && !isDemoExperience) {
      setErrorMessage('Supabase credentials are not configured yet.');
      return;
    }

    const cellKey = `${habitId}:${dateISO}`;
    setMonthlySaving((current) => ({ ...current, [cellKey]: true }));
    setErrorMessage(null);

    try {
      // Use the new toggleHabitCompletionForDate function for habits_v2 + habit_completions
      const { data, error } = await toggleHabitCompletionForDate(
        session.user.id,
        habitId,
        dateISO
      );
      
      if (error) throw error;

      // Refresh monthly stats to get updated completion data
      await loadMonthlyStats(selectedYear, selectedMonth);
      await refreshQueueStatus();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update the habit.');
    } finally {
      setMonthlySaving((current) => {
        const next = { ...current };
        delete next[cellKey];
        return next;
      });
    }
  };

  const handleYesterdayToggle = (habitId: string) => {
    setYesterdaySelections((current) => ({
      ...current,
      [habitId]: !current[habitId],
    }));
  };

  const closeYesterdayRecap = () => {
    setShowYesterdayRecap(false);
    setYesterdayActionStatus(null);
  };

  const handleApplyYesterday = async () => {
    if (!yesterdayHabits.length) return;

    const selectedHabits = yesterdayHabits.filter((habit) => yesterdaySelections[habit.id]);
    if (selectedHabits.length === 0) {
      setYesterdayActionStatus('Select at least one habit to mark as done.');
      return;
    }

    setYesterdaySaving(true);
    setYesterdayActionStatus(null);

    try {
      await Promise.all(selectedHabits.map((habit) => toggleHabitForDate(habit, yesterdayISO)));
      closeYesterdayRecap();
    } catch (error) {
      setYesterdayActionStatus(
        error instanceof Error ? error.message : 'Unable to update yesterday right now.',
      );
    } finally {
      setYesterdaySaving(false);
    }
  };

  const handleCollectBonus = async () => {
    if (!session?.user?.id) return;
    if (!gamificationEnabled) {
      setYesterdayActionStatus('Enable Game of Life to collect bonuses.');
      return;
    }

    const todayISO = formatISODate(new Date());
    const lastCollected = getYesterdayRecapLastCollected(session.user.id);
    if (lastCollected === todayISO) {
      setYesterdayActionStatus('Bonus already collected today.');
      return;
    }

    setYesterdayCollecting(true);
    setYesterdayActionStatus(null);

    try {
      await updateSpinsAvailable(session.user.id, 1);
      await earnXP(XP_REWARDS.YESTERDAY_RECAP_COLLECT, 'yesterday_recap_collect', yesterdayISO);
      setYesterdayRecapLastCollected(session.user.id, todayISO);
      closeYesterdayRecap();
    } catch (error) {
      setYesterdayActionStatus(
        error instanceof Error ? error.message : 'Unable to collect bonus right now.',
      );
    } finally {
      setYesterdayCollecting(false);
    }
  };

  const compactStats = useMemo(() => {
    if (habits.length === 0) {
      return { total: 0, scheduled: 0, completed: 0 } as const;
    }

    const scoringHabits = habits.filter((habit) => (habitHealthByHabitId[habit.id] ?? 'active') !== 'in_review');

    let scheduled = 0;
    let completed = 0;

    for (const habit of scoringHabits) {
      const insight = habitInsights[habit.id];
      const scheduledToday = insight?.scheduledToday ?? isHabitScheduledOnDate(habit, activeDate);
      if (scheduledToday) {
        scheduled += 1;
      }
      if (completions[habit.id]?.completed) {
        completed += 1;
      }
    }

    return { total: scoringHabits.length, scheduled, completed } as const;
  }, [habits, completions, habitHealthByHabitId, habitInsights, activeDate]);

  const generateReviewRedesignDraft = useCallback(async (habit: HabitWithGoal, action: Extract<HabitReviewAction, 'redesign' | 'replace'>) => {
    if (reviewAiLoadingHabitIds.has(habit.id)) {
      return;
    }

    const adherence7 = Math.round(adherenceByHabit[habit.id]?.percentage ?? 0);
    const adherence30 = adherence7;
    const streak = habitInsights[habit.id]?.currentStreak ?? 0;
    const healthState = habitHealthByHabitId[habit.id] ?? 'in_review';
    const modeLabel = action === 'replace' ? 'replace' : 'redesign';

    const prompt = [
      `${modeLabel.toUpperCase()} this habit for a fresh start.`,
      `Current habit: ${habit.name}.`,
      `Health state: ${healthState}.`,
      `7-day adherence: ${adherence7}%.`,
      `30-day adherence: ${adherence30}%.`,
      `Current streak: ${streak} days.`,
      'Keep the scope small and sustainable.',
    ].join(' ');

    setReviewAiLoadingHabitIds((prev) => new Set(prev).add(habit.id));

    try {
      const [suggestionResult, rationaleResult] = await Promise.all([
        generateHabitSuggestion({ prompt }),
        buildEnhancedRationale({
          classification: 'underperforming',
          adherence7,
          adherence30,
          streak,
          baselineRationale:
            action === 'replace'
              ? 'This habit has been stale for a while. Replacing it with a simpler behavior can help rebuild consistency quickly.'
              : 'This habit is signaling friction. A smaller or better-timed version can make it easier to relaunch momentum.',
        }),
      ]);

      const suggestion = suggestionResult.suggestion;
      if (!suggestion) {
        throw new Error(suggestionResult.error ?? 'Unable to generate a redesign suggestion right now.');
      }

      setReviewAiDraftByHabitId((prev) => ({
        ...prev,
        [habit.id]: {
          suggestion,
          rationale: rationaleResult.rationale,
        },
      }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to generate a redesign suggestion right now.');
    } finally {
      setReviewAiLoadingHabitIds((prev) => {
        const next = new Set(prev);
        next.delete(habit.id);
        return next;
      });
    }
  }, [adherenceByHabit, habitHealthByHabitId, habitInsights, reviewAiLoadingHabitIds]);

  const handleApplyReviewAiDraftToEdit = useCallback((habit: HabitWithGoal) => {
    const draft = reviewAiDraftByHabitId[habit.id];
    if (!draft) {
      return;
    }

    setEditHabit({
      id: habit.id,
      name: draft.suggestion.title || habit.name,
      schedule: habit.schedule ?? null,
      goalId: habit.goal?.id ?? null,
    });
    setPendingReviewAiApply({
      habitId: habit.id,
      title: draft.suggestion.title || habit.name,
      rationale: draft.rationale,
    });
    setErrorMessage(`Loaded AI redesign draft for "${habit.name}". Review and save your changes.`);
  }, [reviewAiDraftByHabitId]);

  const handleHabitReviewAction = useCallback(async (habit: HabitWithGoal, action: HabitReviewAction) => {
    if (!isConfigured || isDemoExperience) {
      setErrorMessage('Connect Supabase to review and update habits.');
      return;
    }
    if (reviewActionHabitIds.has(habit.id)) {
      return;
    }

    setReviewActionHabitIds((prev) => new Set(prev).add(habit.id));
    setErrorMessage(null);

    const currentState = getAutoProgressState({
      autoprog: habit.autoprog ?? null,
      schedule: (habit.schedule ?? { mode: 'daily' }) as Json,
      target_num: habit.target_num ?? null,
    } as unknown as HabitV2Row);
    const reviewCycleKey = currentState.review_due_at ?? 'none';

    try {
      if (action === 'archive') {
        const { error } = await archiveHabitV2(habit.id);
        if (error) {
          throw new Error(error.message);
        }
        await cancelHabitNotifications(habit.id);

        await awardHabitRecoveryXp({
          habitId: habit.id,
          rewardKey: `review-completed:${reviewCycleKey}`,
          xp: XP_REWARDS.HABIT_REVIEW_COMPLETED,
          sourceType: 'habit_review_completed',
          description: 'Completed a Habit Review decision',
        });

        setHabits((prev) => prev.filter((entry) => entry.id !== habit.id));
        setCompletions((prev) => {
          const next = { ...prev };
          delete next[habit.id];
          return next;
        });
        setErrorMessage(`Archived "${habit.name}".`);
        return;
      }

      if (action === 'pause') {
        const { error } = await pauseHabitV2(habit.id, { reason: 'review_pause' });
        if (error) {
          throw new Error(error.message);
        }
        await cancelHabitNotifications(habit.id);

        await awardHabitRecoveryXp({
          habitId: habit.id,
          rewardKey: `review-completed:${reviewCycleKey}`,
          xp: XP_REWARDS.HABIT_REVIEW_COMPLETED,
          sourceType: 'habit_review_completed',
          description: 'Completed a Habit Review decision',
        });

        setHabits((prev) => prev.filter((entry) => entry.id !== habit.id));
        setCompletions((prev) => {
          const next = { ...prev };
          delete next[habit.id];
          return next;
        });
        setErrorMessage(`Paused "${habit.name}" and removed it from today until you resume it.`);
        return;
      }

      if (action === 'replace') {
        const { error } = await deactivateHabitV2(habit.id, { reason: 'review_replace' });
        if (error) {
          throw new Error(error.message);
        }
        await cancelHabitNotifications(habit.id);

        await awardHabitRecoveryXp({
          habitId: habit.id,
          rewardKey: `review-completed:${reviewCycleKey}`,
          xp: XP_REWARDS.HABIT_REVIEW_COMPLETED,
          sourceType: 'habit_review_completed',
          description: 'Completed a Habit Review decision',
        });

        setHabits((prev) => prev.filter((entry) => entry.id !== habit.id));
        setCompletions((prev) => {
          const next = { ...prev };
          delete next[habit.id];
          return next;
        });
        setErrorMessage(`Deactivated "${habit.name}" so you can replace it with a better fit.`);
        return;
      }

      const nextReviewReason = action;
      const { data, error } = await updateHabitFullV2(habit.id, {
        autoprog: {
          ...currentState,
          review_reason: nextReviewReason,
        } as Database['public']['Tables']['habits_v2']['Row']['autoprog'],
      });

      if (error) {
        throw new Error(error.message);
      }

      await awardHabitRecoveryXp({
        habitId: habit.id,
        rewardKey: `review-completed:${reviewCycleKey}`,
        xp: XP_REWARDS.HABIT_REVIEW_COMPLETED,
        sourceType: 'habit_review_completed',
        description: 'Completed a Habit Review decision',
      });

      if (data) {
        setHabits((prev) =>
          prev.map((entry) => (entry.id === habit.id ? { ...entry, autoprog: data.autoprog ?? entry.autoprog } : entry)),
        );
      }

      if (action === 'redesign') {
        setExpandedHabits((prev) => ({ ...prev, [habit.id]: true }));
        await generateReviewRedesignDraft(habit, action);
      }

      setErrorMessage(`Marked "${habit.name}" for redesign.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update this habit right now.');
    } finally {
      setReviewActionHabitIds((prev) => {
        const next = new Set(prev);
        next.delete(habit.id);
        return next;
      });
    }
  }, [isConfigured, isDemoExperience, reviewActionHabitIds, generateReviewRedesignDraft, awardHabitRecoveryXp]);

  const identitySignalDayCount = useMemo(() => {
    const completionDates = new Set<string>();
    Object.values(monthlyCompletionsV2).forEach((grid) => {
      Object.entries(grid).forEach(([date, completed]) => {
        if (completed && date <= activeDate) {
          completionDates.add(date);
        }
      });
    });
    return completionDates.size;
  }, [monthlyCompletionsV2, activeDate]);

  const yesterdaySelectedCount = useMemo(
    () => yesterdayHabits.filter((habit) => Boolean(yesterdaySelections[habit.id])).length,
    [yesterdayHabits, yesterdaySelections],
  );

  const allYesterdaySelected =
    yesterdayHabits.length > 0 && yesterdaySelectedCount === yesterdayHabits.length;

  const yesterdayMarkLabel =
    yesterdaySelectedCount > 0 ? `Mark ${yesterdaySelectedCount} done` : 'Mark done';

  const toggleExpanded = (habitId: string) => {
    setExpandedHabits((current) => ({
      ...current,
      [habitId]: !current[habitId],
    }));
  };

  const handleOpenEdit = (habit: HabitWithGoal) => {
    setEditHabit({
      id: habit.id,
      name: habit.name,
      schedule: habit.schedule ?? null,
      goalId: habit.goal?.id ?? null,
    });
  };

  const handleCloseEdit = () => {
    setEditHabit(null);
    setEditSaving(false);
    setEditError(null);
    setCreatingGoal(false);
  };

  const handleTodayLifecycleAction = useCallback(
    async (habit: HabitWithGoal, action: 'pause' | 'deactivate', options?: { reason?: string; resumeOn?: string | null }) => {
      if (!isConfigured || isDemoExperience) {
        setErrorMessage('Connect Supabase to update habit lifecycle.');
        return;
      }
      if (lifecycleActionHabitIds.has(habit.id)) {
        return;
      }

      if (action === 'pause' && !options) {
        setTodayPauseDialogHabit(habit);
        return;
      }

      const confirmed =
        action === 'pause'
          ? true
          : window.confirm(`Deactivate "${habit.name}" and move it out of your active habits while keeping its history?`);
      if (!confirmed) {
        return;
      }

      setLifecycleActionHabitIds((prev) => new Set(prev).add(habit.id));
      setErrorMessage(null);

      try {
        const result =
          action === 'pause'
            ? await pauseHabitV2(habit.id, {
                reason: options?.reason ?? 'today_screen_pause',
                resumeOn: options?.resumeOn ?? null,
              })
            : await deactivateHabitV2(habit.id, { reason: 'today_screen_deactivate' });
        if (result.error) {
          throw new Error(result.error.message);
        }

        await cancelHabitNotifications(habit.id);

        setHabits((prev) => prev.filter((entry) => entry.id !== habit.id));
        setCompletions((prev) => {
          const next = { ...prev };
          delete next[habit.id];
          return next;
        });
        setExpandedHabits((prev) => {
          const next = { ...prev };
          delete next[habit.id];
          return next;
        });
        setTodayPauseDialogHabit((current) => (current?.id === habit.id ? null : current));
        setErrorMessage(
          action === 'pause'
            ? options?.resumeOn
              ? `Paused "${habit.name}" until ${new Date(`${options.resumeOn}T00:00:00`).toLocaleDateString()}. It will return automatically on that date.`
              : `Paused "${habit.name}" until you resume it from the Habits tab.`
            : `Deactivated "${habit.name}" and removed it from today's active habits.`,
        );
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to update the habit lifecycle.');
      } finally {
        setLifecycleActionHabitIds((prev) => {
          const next = new Set(prev);
          next.delete(habit.id);
          return next;
        });
      }
    },
    [isConfigured, isDemoExperience, lifecycleActionHabitIds],
  );

  const handleCreateGoalFromHabit = async () => {
    if (!editHabit) return;
    if (!isConfigured && !isDemoExperience) {
      setEditError('Supabase credentials are not configured. Add them to continue.');
      return;
    }

    setCreatingGoal(true);
    setEditError(null);

    try {
      const lifeWheelCategory =
        editLifeWheelKey !== LIFE_WHEEL_UNASSIGNED
          ? (editLifeWheelKey as LifeWheelCategoryKey)
          : null;
      const goalTitle = editTitle.trim() || editHabit.name;
      const { data, error } = await insertGoal({
        user_id: session.user.id,
        title: goalTitle,
        description: null,
        life_wheel_category: lifeWheelCategory,
        start_date: null,
        target_date: null,
        estimated_duration_days: null,
        timing_notes: null,
        status_tag: DEFAULT_GOAL_STATUS,
      });
      if (error) {
        throw error;
      }
      if (!data) {
        throw new Error('Failed to create goal.');
      }
      setGoals((current) => [data, ...current]);
      setEditGoalId(data.id);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Unable to create the goal right now.');
    } finally {
      setCreatingGoal(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editHabit) return;
    if (!isConfigured && !isDemoExperience) {
      setEditError('Supabase credentials are not configured. Add them to continue.');
      return;
    }

    const nextTitle = editTitle.trim();
    if (!nextTitle) {
      setEditError('Please enter a habit title.');
      return;
    }

    setEditSaving(true);
    setEditError(null);

    const lifeWheelKey =
      editLifeWheelKey !== LIFE_WHEEL_UNASSIGNED ? editLifeWheelKey : null;
    const scheduleWithLifeWheel = buildScheduleWithLifeWheel(editHabit.schedule, lifeWheelKey);
    const nextSchedule = buildScheduleWithNotes(scheduleWithLifeWheel, editNotes);
    const nextGoalId = editGoalId !== GOAL_UNASSIGNED ? editGoalId : null;

    try {
      const habitBeforeEdit = habits.find((entry) => entry.id === editHabit.id) ?? null;
      const currentState = habitBeforeEdit
        ? getAutoProgressState({
            autoprog: habitBeforeEdit.autoprog ?? null,
            schedule: (habitBeforeEdit.schedule ?? { mode: 'daily' }) as Json,
            target_num: habitBeforeEdit.target_num ?? null,
          } as unknown as HabitV2Row)
        : null;
      const { error } = await updateHabitFullV2(editHabit.id, {
        title: nextTitle,
        schedule: nextSchedule,
        goal_id: nextGoalId,
      });
      if (error) {
        throw error;
      }

      if (currentState?.review_reason === 'redesign' || currentState?.review_reason === 'replace') {
        await awardHabitRecoveryXp({
          habitId: editHabit.id,
          rewardKey: `relaunch-started:${currentState.review_due_at ?? 'none'}`,
          xp: XP_REWARDS.HABIT_RELAUNCH_STARTED,
          sourceType: 'habit_relaunch_started',
          description: 'Started a relaunched habit after review',
        });
      }

      handleCloseEdit();
      await refreshHabits();
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Unable to update habit details.');
    } finally {
      setEditSaving(false);
    }
  };

  const renderDayNavigation = (variant: 'compact' | 'full', showDetails = true, showNavigationControls = true) => {
    const displayLabel = formatDateLabel(activeDate);
    const canGoForward = activeDate < today;
    const isViewingToday = activeDate === today;
    const isCompactVariant = variant === 'compact';
    const navClasses = ['habit-day-nav', `habit-day-nav--${variant}`];
    const visionRewardForDay = visionRewardDate === activeDate ? visionReward : null;
    const isNextVisionSuperBoost = !hasClaimedVisionStar && (visionStarCount + 1) % 20 === 0;
    const visionBoostLabel = isNextVisionSuperBoost
      ? '+250 XP +25 Dice claim · Super boost'
      : `+${XP_REWARDS.VISION_BOARD_STAR} XP +25 Dice boost`;
    const shouldGlowBonus = Boolean(
      visionRewardForDay?.isSuperBoost || (isViewingToday && isNextVisionSuperBoost)
    );
    const shouldHideBonus = !shouldShowOfferBonus;
    const hasVisibleCompactNavContent = showNavigationControls || !shouldHideBonus || Boolean(visionRewardError);
    const bonusClasses = ['habit-day-nav__bonus'];

    if (shouldGlowBonus && !shouldHideBonus) {
      bonusClasses.push('habit-day-nav__bonus--super-boost');
    }

    if (shouldHideBonus) {
      bonusClasses.push('habit-day-nav__bonus--hidden');
    }

    if (isCompactVariant && !hasVisibleCompactNavContent) {
      return null;
    }

    return (
      <div className={navClasses.join(' ')} role="group" aria-label="Choose day to track habits">
        {showNavigationControls ? (
          <button
            type="button"
            className="habit-day-nav__button habit-day-nav__button--prev"
            onClick={() => changeActiveDateBy(-1)}
            aria-label="Previous day"
          >
            {isCompactVariant ? '←' : '← Previous day'}
          </button>
        ) : null}

        {showDetails ? (
          <div className="habit-day-nav__info">
            {isCompactVariant ? (
              showNavigationControls ? (
                <div className="habit-day-nav__actions habit-day-nav__actions--compact">
                  <span className="sr-only">Tracking day {displayLabel}</span>
                  {isViewingToday ? (
                    <span className="habit-day-nav__chip habit-day-nav__chip--current">Today</span>
                  ) : (
                    <button type="button" className="habit-day-nav__chip" onClick={resetToToday}>
                      Today
                    </button>
                  )}
                  <label className="habit-day-nav__picker habit-day-nav__picker--icon-only" aria-label="Select a date to track">
                    <span className="sr-only">Select a date to track</span>
                    <span className="habit-day-nav__picker-pill habit-day-nav__picker-pill--icon-only">
                      <span className="habit-day-nav__picker-icon" aria-hidden="true">
                        📅
                      </span>
                      <input
                        className="habit-day-nav__picker-input--icon-only"
                        type="date"
                        value={activeDate}
                        max={today}
                        onChange={(event) => handleDateInputChange(event.target.value)}
                      />
                    </span>
                  </label>
                </div>
              ) : null
            ) : (
              <>
                <p className={`habit-day-nav__label ${shouldFadeTrackingMeta ? 'habit-day-nav__fade' : ''}`}>
                  Tracking day
                </p>
                <p className={`habit-day-nav__value ${shouldFadeTrackingMeta ? 'habit-day-nav__fade' : ''}`}>
                  {displayLabel}
                </p>
                <div className="habit-day-nav__actions">
                  {isViewingToday ? (
                    <span className="habit-day-nav__chip habit-day-nav__chip--current">Today</span>
                  ) : (
                    <button type="button" className="habit-day-nav__chip" onClick={resetToToday}>
                      Jump to today
                    </button>
                  )}
                  <label className="habit-day-nav__picker" aria-label="Select a date to track">
                    <span className="sr-only">Select a date to track</span>
                    <span className="habit-day-nav__picker-pill">
                      <span className="habit-day-nav__picker-icon" aria-hidden="true">
                        📅
                      </span>
                      <input
                        type="date"
                        value={activeDate}
                        max={today}
                        onChange={(event) => handleDateInputChange(event.target.value)}
                      />
                    </span>
                  </label>
                </div>
              </>
            )}
            <div className={bonusClasses.join(' ')}>
              {shouldShowOfferBonus ? (
                <div className="habit-day-nav__bonus-offer">
                  <span className="habit-day-nav__bonus-offer-title">{timeLimitedOfferCopy.eyebrow}</span>
                  <span className="habit-day-nav__bonus-offer-line">{timeLimitedOfferCopy.nextUp}</span>
                  <span className="habit-day-nav__bonus-offer-line">{timeLimitedOfferCopy.badBoost}</span>
                  {timeLimitedCountdownLabel ? (
                    <span className="habit-day-nav__bonus-offer-timer">
                      Ends in {timeLimitedCountdownLabel}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
            {visionRewardError && <p className="habit-day-nav__bonus-error">{visionRewardError}</p>}
          </div>
        ) : null}

        {showNavigationControls ? (
          <button
            type="button"
            className="habit-day-nav__button habit-day-nav__button--next"
            onClick={() => changeActiveDateBy(1)}
            disabled={!canGoForward}
            aria-label="Next day"
          >
            {isCompactVariant ? '→' : 'Next day →'}
          </button>
        ) : null}
      </div>
    );
  };

  const handleToggleSkipMenu = (habitId: string) => {
    setSkipMenuHabitId((current) => (current === habitId ? null : habitId));
    setSkipReasonHabitId(null);
    setSkipReason('');
    setSkipError(null);
  };

  const handleUndoHabitSkip = async (habit: HabitWithGoal) => {
    if (!isConfigured && !isDemoExperience) {
      setErrorMessage('Supabase credentials are not configured yet.');
      return;
    }

    setSaving((current) => ({ ...current, [habit.id]: true }));
    setErrorMessage(null);

    try {
      const dateISO = activeDate;
      const { error } = await clearHabitCompletion(habit.id, dateISO);
      if (error) {
        throw error;
      }

      setCompletions((current) => ({ ...current, [habit.id]: { logId: null, completed: false } }));
      setMonthlyCompletions((current) => {
        const next = { ...current };
        const habitMatrix = { ...(next[habit.id] ?? {}) };
        habitMatrix[dateISO] = { logId: null, completed: false };
        next[habit.id] = habitMatrix;
        return next;
      });
      setHistoricalLogs((current) => {
        const nextLogs = current.filter((log) => !(log.habit_id === habit.id && log.date === dateISO));
        setHabitInsights(calculateHabitInsights(habits, nextLogs, activeDate));
        return nextLogs;
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to clear habit skip.');
    } finally {
      setSaving((current) => ({ ...current, [habit.id]: false }));
    }
  };

  const getSwipeActionForHabit = useCallback(
    (
      habit: HabitWithGoal,
      state: HabitCompletionState | undefined,
      direction: HabitSwipeDirection,
      options: { scheduledToday: boolean; isExpanded: boolean; isSkipDisabled: boolean; isSaving: boolean },
    ): HabitSwipeAction | null => {
      if (options.isExpanded || options.isSaving || skipSaving) {
        return null;
      }

      if (state?.progressState === 'missed') {
        return null;
      }

      if (direction === 'right') {
        if (state?.progressState === 'skipped') {
          return null;
        }
        if (state?.completed) {
          return 'undo-complete';
        }
        if (!options.scheduledToday) {
          return null;
        }
        return 'complete';
      }

      if (options.isSkipDisabled || state?.completed || !options.scheduledToday) {
        return null;
      }
      if (state?.progressState === 'skipped') {
        return 'undo-skip';
      }
      return 'skip';
    },
    [skipSaving],
  );

  const handleLogHabitSkip = async (
    habit: HabitWithGoal,
    options?: {
      reason?: string;
      createJournalEntry?: boolean;
    },
  ) => {
    if (!isConfigured && !isDemoExperience) {
      setSkipError('Connect Supabase to log skip reasons.');
      return;
    }

    const dateISO = activeDate;
    const trimmedReason = options?.reason?.trim();
    const content = trimmedReason
      ? `Reason:\n${trimmedReason}`
      : `Skipped ${habit.name} today.`;
    const shouldCreateJournalEntry = options?.createJournalEntry ?? false;

    setSkipSaving(true);
    setSkipError(null);

    try {
      if (shouldCreateJournalEntry) {
        await createJournalEntry({
          user_id: session.user.id,
          entry_date: activeDate,
          title: `Skipped habit: ${habit.name}`,
          content,
          mood: null,
          tags: ['habit_skip'],
          linked_goal_ids: habit.goal?.id ? [habit.goal.id] : null,
          linked_habit_ids: [habit.id],
          is_private: true,
          type: 'quick',
          mood_score: null,
          category: null,
          unlock_date: null,
          goal_id: habit.goal?.id ?? null,
        });
      }

      const skipPayload: HabitLogInsert = {
        habit_id: habit.id,
        date: dateISO,
        completed: false,
        progress_state: 'skipped',
        completion_percentage: 0,
      };
      const { data: skipLogData, error: skipLogError } = await logHabitCompletion(skipPayload);
      if (skipLogError) throw skipLogError;
      const skipLogRow: HabitLogRow = skipLogData ?? ({
        id: `temp-${habit.id}-${dateISO}`,
        habit_id: habit.id,
        date: dateISO,
        completed: false,
        progress_state: 'skipped',
        completion_percentage: 0,
      } satisfies HabitLogRow);

      setCompletions((current) => ({
        ...current,
        [habit.id]: { logId: skipLogRow.id, completed: false, progressState: 'skipped', completionPercentage: 0, loggedStage: null },
      }));
      setMonthlyCompletions((current) => {
        const next = { ...current };
        const habitMatrix = { ...(next[habit.id] ?? {}) };
        habitMatrix[dateISO] = { logId: skipLogRow.id, completed: false, progressState: 'skipped', completionPercentage: 0, loggedStage: null };
        next[habit.id] = habitMatrix;
        return next;
      });
      setHistoricalLogs((current) => {
        const nextLogs = current.filter((log) => !(log.habit_id === habit.id && log.date === dateISO));
        nextLogs.push(skipLogRow);
        setHabitInsights(calculateHabitInsights(habits, nextLogs, activeDate));
        return nextLogs;
      });

      if (session?.user?.id) {
        void recordTelemetryEvent({
          userId: session.user.id,
          eventType: 'habit_skipped',
          metadata: { habitId: habit.id, habitName: habit.name, progressState: 'skipped' },
        });
      }

      if (dateISO === activeDate) {
        playHabitSkipSfx();
      }

      setSkipMenuHabitId(null);
      setSkipReasonHabitId(null);
      setSkipReason('');
    } catch (error) {
      setSkipError(error instanceof Error ? error.message : 'Unable to log the skip right now.');
    } finally {
      setSkipSaving(false);
    }
  };

  const handleLogHabitMissed = async (habit: HabitWithGoal) => {
    if (!isConfigured && !isDemoExperience) {
      setSkipError('Connect Supabase to log missed habits.');
      return;
    }

    const dateISO = activeDate;
    setSkipSaving(true);
    setSkipError(null);

    try {
      const missedPayload: HabitLogInsert = {
        habit_id: habit.id,
        date: dateISO,
        completed: false,
        progress_state: 'missed',
        completion_percentage: 0,
      };
      const { data: missedLogData, error: missedLogError } = await logHabitCompletion(missedPayload);
      if (missedLogError) throw missedLogError;
      const missedLogRow: HabitLogRow = missedLogData ?? ({
        id: `temp-missed-${habit.id}-${dateISO}`,
        habit_id: habit.id,
        date: dateISO,
        completed: false,
        progress_state: 'missed',
        completion_percentage: 0,
      } satisfies HabitLogRow);

      setCompletions((current) => ({
        ...current,
        [habit.id]: { logId: missedLogRow.id, completed: false, progressState: 'missed', completionPercentage: 0, loggedStage: null },
      }));
      setMonthlyCompletions((current) => {
        const next = { ...current };
        const habitMatrix = { ...(next[habit.id] ?? {}) };
        habitMatrix[dateISO] = { logId: missedLogRow.id, completed: false, progressState: 'missed', completionPercentage: 0, loggedStage: null };
        next[habit.id] = habitMatrix;
        return next;
      });
      setHistoricalLogs((current) => {
        const nextLogs = current.filter((log) => !(log.habit_id === habit.id && log.date === dateISO));
        nextLogs.push(missedLogRow);
        setHabitInsights(calculateHabitInsights(habits, nextLogs, activeDate));
        return nextLogs;
      });

      if (session?.user?.id) {
        void recordTelemetryEvent({
          userId: session.user.id,
          eventType: 'habit_missed',
          metadata: { habitId: habit.id, habitName: habit.name, progressState: 'missed' },
        });
      }

      setSkipMenuHabitId(null);
      setSkipReasonHabitId(null);
      setSkipReason('');
    } catch (error) {
      setSkipError(error instanceof Error ? error.message : 'Unable to log the missed habit right now.');
    } finally {
      setSkipSaving(false);
    }
  };

  const triggerSwipeAction = useCallback(
    (habit: HabitWithGoal, action: HabitSwipeAction) => {
      if (action === 'complete' || action === 'undo-complete') {
        void toggleHabitForDate(habit, activeDate);
        return;
      }
      if (action === 'skip') {
        void handleLogHabitSkip(habit);
        return;
      }
      void handleUndoHabitSkip(habit);
    },
    [activeDate, handleLogHabitSkip, handleUndoHabitSkip, toggleHabitForDate],
  );

  const buildAutoProgressHabit = useCallback(
    (habit: HabitWithGoal): HabitV2Row => ({
      id: habit.id,
      user_id: session.user.id,
      title: habit.name,
      emoji: habit.emoji ?? null,
      type: habit.type ?? 'boolean',
      status: 'active',
      target_num: habit.target_num ?? null,
      target_unit: habit.target_unit ?? null,
      schedule: (habit.schedule ?? { mode: 'daily' }) as Json,
      allow_skip: null,
      start_date: null,
      archived: null,
      created_at: null,
      paused_at: null,
      paused_reason: null,
      resume_on: null,
      deactivated_at: null,
      deactivated_reason: null,
      autoprog: habit.autoprog ?? null,
      domain_key: null,
      goal_id: habit.goal?.id ?? null,
      habit_environment: null,
      done_ish_config: { booleanPartialEnabled: true, quantityThresholdPercent: 80, durationThresholdPercent: 80 },
      environment_context: null,
      environment_score: null,
      environment_risk_tags: [],
      environment_last_audited_at: null,
      habit_intent: 'build',
      duration_mode: 'none',
      duration_value: null,
      duration_unit: null,
      duration_start_at: null,
      duration_end_at: null,
      on_duration_end: null,
    }),
    [session.user.id],
  );

  useEffect(() => {
    if (!isConfigured || isDemoExperience || loading) {
      return;
    }
    if (!habits.length) {
      return;
    }

    let cancelled = false;

    const persistHabitHealthMetadata = async () => {
      const updates = habits
        .map((habit) => {
          const assessment = habitHealthAssessmentsByHabitId[habit.id];
          if (!assessment) {
            return null;
          }

          const currentState = getAutoProgressState(buildAutoProgressHabit(habit));
          const nextLastCompletedAt = habitInsights[habit.id]?.lastCompletedOn ?? null;

          const hasHealthStateChanged = (currentState.health_state ?? 'active') !== assessment.state;
          const hasLastCompletedChanged = (currentState.last_completed_at ?? null) !== nextLastCompletedAt;
          const hasReviewDueAtChanged = (currentState.review_due_at ?? null) !== assessment.reviewDueAt;

          if (!hasHealthStateChanged && !hasLastCompletedChanged && !hasReviewDueAtChanged) {
            return null;
          }

          return {
            habitId: habit.id,
            autoprog: {
              ...currentState,
              health_state: assessment.state,
              last_completed_at: nextLastCompletedAt,
              review_due_at: assessment.reviewDueAt,
            } as Database['public']['Tables']['habits_v2']['Row']['autoprog'],
          };
        })
        .filter((value): value is { habitId: string; autoprog: Database['public']['Tables']['habits_v2']['Row']['autoprog'] } =>
          Boolean(value),
        );

      if (!updates.length) {
        return;
      }

      const persistedAutoprogByHabitId = new Map<string, Database['public']['Tables']['habits_v2']['Row']['autoprog']>();

      for (const update of updates) {
        const { data, error } = await updateHabitFullV2(update.habitId, {
          autoprog: update.autoprog,
        });

        if (cancelled) {
          return;
        }

        if (error) {
          console.error('Unable to persist habit health metadata:', {
            habitId: update.habitId,
            message: error.message,
          });
          continue;
        }

        if (data) {
          persistedAutoprogByHabitId.set(update.habitId, data.autoprog ?? update.autoprog);
        }
      }

      if (!persistedAutoprogByHabitId.size || cancelled) {
        return;
      }

      setHabits((prev) =>
        prev.map((habit) => {
          const persistedAutoprog = persistedAutoprogByHabitId.get(habit.id);
          if (!persistedAutoprog) {
            return habit;
          }

          return {
            ...habit,
            autoprog: persistedAutoprog,
          };
        }),
      );
    };

    void persistHabitHealthMetadata();

    return () => {
      cancelled = true;
    };
  }, [
    buildAutoProgressHabit,
    habitHealthAssessmentsByHabitId,
    habitInsights,
    habits,
    isConfigured,
    isDemoExperience,
    loading,
  ]);

  useEffect(() => {
    if (!isConfigured || isDemoExperience || loading) {
      return;
    }
    if (!habits.length) {
      return;
    }

    let cancelled = false;

    const archiveExpiredReviewHabits = async () => {
      const referenceDateISO = formatISODate(new Date());
      const candidates = habits.filter((habit) => {
        if (reviewAutoArchivingHabitIdsRef.current.has(habit.id)) {
          return false;
        }

        const currentState = getAutoProgressState(buildAutoProgressHabit(habit));
        const healthState = habitHealthByHabitId[habit.id] ?? currentState.health_state ?? 'active';

        return shouldAutoArchiveHabitFromReview({
          state: healthState,
          reviewDueAt: currentState.review_due_at ?? null,
          reviewReason: currentState.review_reason ?? null,
          referenceDateISO,
        });
      });

      if (!candidates.length) {
        return;
      }

      const archivedHabitIds = new Set<string>();

      for (const habit of candidates) {
        reviewAutoArchivingHabitIdsRef.current.add(habit.id);
        const { error } = await archiveHabitV2(habit.id);

        if (cancelled) {
          return;
        }

        if (error) {
          console.error('Unable to auto-archive review habit:', {
            habitId: habit.id,
            message: error.message,
          });
          reviewAutoArchivingHabitIdsRef.current.delete(habit.id);
          continue;
        }

        archivedHabitIds.add(habit.id);
        reviewAutoArchivingHabitIdsRef.current.delete(habit.id);
      }

      if (!archivedHabitIds.size || cancelled) {
        return;
      }

      setHabits((prev) => prev.filter((habit) => !archivedHabitIds.has(habit.id)));
      setCompletions((prev) => {
        const next = { ...prev };
        archivedHabitIds.forEach((habitId) => {
          delete next[habitId];
        });
        return next;
      });
      setErrorMessage(
        `Auto-archived ${archivedHabitIds.size} stale review habit${archivedHabitIds.size === 1 ? '' : 's'} after the grace period.`,
      );
    };

    void archiveExpiredReviewHabits();

    return () => {
      cancelled = true;
    };
  }, [
    buildAutoProgressHabit,
    habitHealthByHabitId,
    habits,
    isConfigured,
    isDemoExperience,
    loading,
  ]);

  const handleAutoProgressShift = async (
    habit: HabitWithGoal,
    targetTier: AutoProgressTier,
    shiftType: AutoProgressShift,
  ) => {
    if (!isConfigured || isDemoExperience) {
      setErrorMessage('Connect Supabase to update habit difficulty.');
      return;
    }
    if (autoProgressHabitIds.has(habit.id)) {
      return;
    }

  const habitSnapshot = buildAutoProgressHabit(habit);
  const currentState = getAutoProgressState(habitSnapshot);
  if (currentState.lastShiftAt && formatISODate(new Date(currentState.lastShiftAt)) === today) {
    setErrorMessage('You can change a habit stage once per day. Try again tomorrow.');
    return;
  }
  if (currentState.tier === targetTier) {
      setErrorMessage(`"${habit.name}" is already on the ${AUTO_PROGRESS_STAGE_LABELS[targetTier]} stage.`);
      return;
    }

    setAutoProgressHabitIds((prev) => new Set(prev).add(habit.id));
    setErrorMessage(null);

    try {
      const plan = buildAutoProgressPlan({ habit: habitSnapshot, targetTier, shiftType });
      const scheduleChanged = JSON.stringify(plan.schedule) !== JSON.stringify(habitSnapshot.schedule);
      const targetChanged = plan.target !== habitSnapshot.target_num;

      if (!scheduleChanged && !targetChanged) {
        throw new Error('This stage matches your current habit settings.');
      }

      const { data: updatedHabit, error: updateError } = await updateHabitFullV2(habit.id, {
        schedule: plan.schedule ?? habitSnapshot.schedule,
        target_num: plan.target,
        autoprog: plan.state as Database['public']['Tables']['habits_v2']['Row']['autoprog'],
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      if (!updatedHabit) {
        throw new Error('Unable to update the habit stage.');
      }

      // Fire telemetry event for tier change
      if (session?.user?.id) {
        void recordTelemetryEvent({
          userId: session.user.id,
          eventType: 'habit_tier_changed',
          metadata: {
            habitId: habit.id,
            fromTier: currentState.tier,
            toTier: targetTier,
            shiftType,
          },
        });
      }

      setHabits((prev) => {
        const next = prev.map((entry) =>
          entry.id === habit.id
            ? {
                ...entry,
                name: updatedHabit.title,
                emoji: updatedHabit.emoji ?? entry.emoji,
                type: updatedHabit.type,
                schedule: updatedHabit.schedule as Json,
                frequency: deriveFrequencyFromSchedule(updatedHabit.schedule as Json),
                target_num: updatedHabit.target_num ?? null,
                target_unit: updatedHabit.target_unit ?? null,
                autoprog: updatedHabit.autoprog ?? null,
              }
            : entry,
        );
        setHabitInsights(calculateHabitInsights(next, historicalLogs, activeDate));
        return next;
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update the habit stage.');
    } finally {
      setAutoProgressHabitIds((prev) => {
        const next = new Set(prev);
        next.delete(habit.id);
        return next;
      });
    }
  };

  const renderCompactList = () => {
    const nonReviewHabits = (isTimeLimitedOfferActive ? timeLimitedOrderedHabits : sortedHabits).filter(
      (habit) => (habitHealthByHabitId[habit.id] ?? 'active') !== 'in_review',
    );
    const baseHabits = nonReviewHabits;
    const isArchivedFromActiveList = (habitId: string) => {
      const completion = completions[habitId];
      return Boolean(completion?.completed) || completion?.progressState === 'skipped';
    };
    const completedHabits = baseHabits.filter((habit) => isArchivedFromActiveList(habit.id));
    const activeHabits = baseHabits.filter((habit) => !isArchivedFromActiveList(habit.id));
    const visibleHabits = showCompletedHabits
      ? [...activeHabits, ...completedHabits]
      : activeHabits;

    return (
      <div className="habit-checklist__group">
        {isHabitReviewPromptActive ? (
          <section className="habit-review-queue" aria-label="Habit review queue">
            <p className="habit-review-queue__eyebrow">Habit Review</p>
            <h3 className="habit-review-queue__title">
              {reviewQueueHabits.length} habit{reviewQueueHabits.length === 1 ? '' : 's'} need attention
            </h3>
            <p className="habit-review-queue__subtitle">
              Habits in review are removed from today&apos;s score until you decide what to do next.
            </p>
            <ul className="habit-review-queue__list" role="list">
              {reviewQueueHabits.map((habit) => {
                const isActionInFlight = reviewActionHabitIds.has(habit.id);
                const isAiDraftLoading = reviewAiLoadingHabitIds.has(habit.id);
                const aiDraft = reviewAiDraftByHabitId[habit.id];
                return (
                  <li key={habit.id} className="habit-review-queue__item">
                    <span className="habit-review-queue__name">{habit.name}</span>
                    <div className="habit-review-queue__actions">
                      <button type="button" disabled={isActionInFlight} onClick={() => setAnalysisHabitId(habit.id)}>
                        Deep Fix
                      </button>
                      <button type="button" disabled={isActionInFlight} onClick={() => void handleHabitReviewAction(habit, 'pause')}>
                        Pause
                      </button>
                      <button type="button" disabled={isActionInFlight} onClick={() => void handleHabitReviewAction(habit, 'redesign')}>
                        Redesign
                      </button>
                      <button type="button" disabled={isActionInFlight} onClick={() => void handleHabitReviewAction(habit, 'replace')}>
                        Replace
                      </button>
                      <button
                        type="button"
                        className="habit-review-queue__archive"
                        disabled={isActionInFlight}
                        onClick={() => void handleHabitReviewAction(habit, 'archive')}
                      >
                        Archive
                      </button>
                    </div>
                    {isAiDraftLoading ? <p className="habit-review-queue__draft-status">Generating AI redesign draft…</p> : null}
                    {aiDraft ? (
                      <div className="habit-review-queue__draft" role="status" aria-live="polite">
                        <p className="habit-review-queue__draft-title">
                          Suggested relaunch: {aiDraft.suggestion.emoji ? `${aiDraft.suggestion.emoji} ` : ''}
                          {aiDraft.suggestion.title}
                        </p>
                        <p className="habit-review-queue__draft-rationale">{aiDraft.rationale}</p>
                        <button
                          type="button"
                          className="habit-review-queue__draft-apply"
                          onClick={() => handleApplyReviewAiDraftToEdit(habit)}
                        >
                          Open in edit flow
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
        {!hideTimeBoundOffers ? (
          <TimeBoundOfferRow offers={timeBoundOffers} onOfferClick={handleTimeBoundOfferClick} />
        ) : null}
        {isTimeLimitedOfferActive && offerHabitIds.size > 0 ? (
          <div className="habit-checklist__offer">
            <div>
              <p className="habit-checklist__offer-eyebrow">{timeLimitedOfferCopy.eyebrow}</p>
              <h3 className="habit-checklist__offer-title">{timeLimitedOfferCopy.nextUp}</h3>
              <p className="habit-checklist__offer-subtitle">{timeLimitedOfferCopy.badBoost}</p>
            </div>
            <span className="habit-checklist__offer-pill">
              {timeLimitedOfferCopy.limited}
              {timeLimitedCountdownLabel ? ` • ${timeLimitedCountdownLabel}` : ''}
            </span>
          </div>
        ) : null}
        <div className="habit-checklist-card__title">
          <h2>My Habits</h2>
        </div>
        {visibleHabits.length === 0 && completedHabits.length > 0 ? (
          <p className="habit-checklist__empty">All habits checked off for today.</p>
        ) : null}
        <ul className="habit-checklist" role="list">
          {visibleHabits.map((habit) => {
            const state = completions[habit.id];
            const isCompleted = Boolean(state?.completed);
            const isSaving = Boolean(saving[habit.id]);
            const insight = habitInsights[habit.id];
            const scheduledToday = insight?.scheduledToday ?? isHabitScheduledOnDate(habit, activeDate);
            const lastCompletedOn = insight?.lastCompletedOn ?? (isCompleted ? activeDate : null);
            const lastCompletedText = formatLastCompleted(lastCompletedOn, activeDate);
            const domainMeta = extractLifeWheelDomain(habit.schedule);
            const domainLabel = domainMeta ? formatLifeWheelDomainLabel(domainMeta) : null;
            const goalLabel = habit.goal?.title ?? 'Unassigned goal';
            const checkboxId = `habit-checkbox-${habit.id}`;
            const detailPanelId = `habit-details-${habit.id}`;
            const isExpanded = Boolean(expandedHabits[habit.id]);
            const isJustCompleted = justCompletedHabitId === habit.id;
            const feedbackClassName = isJustCompleted ? getHabitFeedbackClassName(habitFeedbackById[habit.id] ?? 'quick-win') : '';
            const linkedVisionImage = visionImagesByHabit.get(habit.id);
            const isOfferHabit = isTimeLimitedOfferActive && offerHabitIds.has(habit.id);
            const offerPrice = offerPriceByHabitId(habit.id);
            const defaultPrice = defaultPriceByHabitId(habit.id);
            const isSkipDisabled = isOfferHabit;
            const autoProgressHabit = buildAutoProgressHabit(habit);
            const autoProgressState = getAutoProgressState(autoProgressHabit);
            const scalePlan = getHabitScalePlan(autoProgressHabit);
            const downshiftTier = getNextDownshiftTier(autoProgressState.tier);
            const upgradeTier = getNextUpgradeTier(autoProgressState.tier);
            const adherenceSnapshot = adherenceByHabit[habit.id];
            const habitHealthState = habitHealthByHabitId[habit.id] ?? 'active';
            const streakDays = habitInsights[habit.id]?.currentStreak ?? 0;
            const adherencePercent = adherenceSnapshot?.percentage ?? 0;
            const canUpgrade =
              Boolean(upgradeTier) &&
              streakDays >= AUTO_PROGRESS_UPGRADE_RULES.minStreakDays &&
              adherencePercent >= AUTO_PROGRESS_UPGRADE_RULES.minAdherence30;
            const isUpdatingAutoProgress = autoProgressHabitIds.has(habit.id);
            const suggestedDownshiftStage = downshiftTier && adherencePercent < 50 ? downshiftTier : null;
            const swipeOffset = swipeOffsetByHabitId[habit.id] ?? 0;
            const swipeProgress = Math.min(1, Math.abs(swipeOffset) / HABIT_SWIPE_MAX_PX);
            const rightSwipeProgress = swipeOffset > 0 ? swipeProgress : 0;
            const leftSwipeProgress = swipeOffset < 0 ? swipeProgress : 0;
            const swipeArmedDirection = swipeArmedByHabitId[habit.id] ?? null;
            const rightSwipeAction = getSwipeActionForHabit(habit, state, 'right', {
              scheduledToday,
              isExpanded,
              isSkipDisabled,
              isSaving,
            });
            const leftSwipeAction = getSwipeActionForHabit(habit, state, 'left', {
              scheduledToday,
              isExpanded,
              isSkipDisabled,
              isSaving,
            });
            const getSwipeActionIcon = (action: HabitSwipeAction | null) => {
              if (action === 'complete') return '✅';
              if (action === 'undo-complete') return '↩️';
              if (action === 'skip') return '⏭️';
              if (action === 'undo-skip') return '↩️';
              return '•';
            };
            const getSwipeActionLabel = (action: HabitSwipeAction | null) => {
              if (action === 'complete') return 'Complete';
              if (action === 'undo-complete') return 'Undo complete';
              if (action === 'skip') return 'Skip';
              if (action === 'undo-skip') return 'Undo skip';
              return 'No action';
            };

            const isQuestHabit = questHabit?.habitId === habit.id;

            return (
              <li
                key={habit.id}
                className={`habit-checklist__item ${!scheduledToday ? 'habit-checklist__item--rest' : ''} ${
                  isCompleted ? 'habit-checklist__item--completed' : ''
                } ${isJustCompleted ? `habit-item--just-completed ${feedbackClassName}` : ''} ${
                  isOfferHabit ? 'habit-checklist__item--offer' : ''
                } ${isQuestHabit ? 'habit-checklist__item--quest' : ''}`}
              >
                {(shouldShowHabitPoints || isOfferHabit) ? (
                  <PointsBadge
                    value={isOfferHabit && offerPrice !== null ? offerPrice : defaultPrice}
                    className={`points-badge--corner habit-points-badge${
                      isOfferHabit ? ' habit-points-badge--offer' : ''
                    }`}
                    size="mini"
                    ariaLabel={
                      isOfferHabit && offerPrice !== null
                        ? `Limited offer: ${offerPrice} diamonds`
                        : `Dynamic habit reward: ${defaultPrice} diamonds`
                    }
                  />
                ) : null}
                <div
                  className="habit-checklist__swipe-frame"
                  aria-hidden={isExpanded ? 'true' : undefined}
                  style={
                    {
                      '--habit-swipe-right-progress': rightSwipeProgress,
                      '--habit-swipe-left-progress': leftSwipeProgress,
                    } as CSSProperties
                  }
                >
                  <div
                    className={`habit-checklist__swipe-lane habit-checklist__swipe-lane--right ${
                      swipeArmedDirection === 'right' ? 'habit-checklist__swipe-lane--armed' : ''
                    } ${rightSwipeAction ? '' : 'habit-checklist__swipe-lane--disabled'}`}
                    aria-hidden="true"
                  >
                    <span className="habit-checklist__swipe-icon">{getSwipeActionIcon(rightSwipeAction)}</span>
                    <span className="habit-checklist__swipe-label">{getSwipeActionLabel(rightSwipeAction)}</span>
                  </div>
                  <div
                    className={`habit-checklist__swipe-lane habit-checklist__swipe-lane--left ${
                      swipeArmedDirection === 'left' ? 'habit-checklist__swipe-lane--armed' : ''
                    } ${leftSwipeAction ? '' : 'habit-checklist__swipe-lane--disabled'}`}
                    aria-hidden="true"
                  >
                    <span className="habit-checklist__swipe-icon">{getSwipeActionIcon(leftSwipeAction)}</span>
                    <span className="habit-checklist__swipe-label">{getSwipeActionLabel(leftSwipeAction)}</span>
                  </div>
                  <div
                    className={`habit-checklist__swipe-row ${swipeOffset !== 0 ? 'habit-checklist__swipe-row--dragging' : ''}`}
                    style={{ transform: `translateX(${swipeOffset}px)` }}
                    onPointerDown={(event) => {
                      if (
                        swipeGestureRef.current ||
                        isExpanded ||
                        isInteractiveHabitChild(event.target) ||
                        (event.pointerType === 'mouse' && event.button !== 0)
                      ) {
                        return;
                      }
                      swipeGestureRef.current = {
                        habitId: habit.id,
                        pointerId: event.pointerId,
                        startX: event.clientX,
                        startY: event.clientY,
                        isHorizontal: false,
                        hasSwiped: false,
                        armedDirection: swipeArmedDirection,
                      };
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerMove={(event) => {
                      const gesture = swipeGestureRef.current;
                      if (!gesture || gesture.habitId !== habit.id || gesture.pointerId !== event.pointerId || isExpanded) {
                        return;
                      }
                      const deltaX = event.clientX - gesture.startX;
                      const deltaY = event.clientY - gesture.startY;
                      if (!gesture.isHorizontal) {
                        if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) {
                          return;
                        }
                        if (Math.abs(deltaY) > Math.abs(deltaX)) {
                          swipeGestureRef.current = null;
                          return;
                        }
                        gesture.isHorizontal = true;
                      }
                      event.preventDefault();
                      const clamped = Math.max(-HABIT_SWIPE_MAX_PX, Math.min(HABIT_SWIPE_MAX_PX, deltaX));
                      if (Math.abs(clamped) > 6) {
                        gesture.hasSwiped = true;
                      }
                      setSwipeOffsetByHabitId((current) => ({ ...current, [habit.id]: clamped }));
                      const direction: HabitSwipeDirection = clamped >= 0 ? 'right' : 'left';
                      const nextAction = direction === 'right' ? rightSwipeAction : leftSwipeAction;
                      const armedDirection =
                        Math.abs(clamped) >= HABIT_SWIPE_ARM_THRESHOLD_PX && nextAction ? direction : null;
                      if (gesture.armedDirection !== armedDirection) {
                        triggerCompletionHaptic('light', { channel: 'navigation', minIntervalMs: 120 });
                        gesture.armedDirection = armedDirection;
                      }
                      setSwipeArmedByHabitId((current) => ({ ...current, [habit.id]: armedDirection }));
                    }}
                    onPointerUp={(event) => {
                      const gesture = swipeGestureRef.current;
                      if (!gesture || gesture.habitId !== habit.id || gesture.pointerId !== event.pointerId) {
                        return;
                      }
                      event.currentTarget.releasePointerCapture(event.pointerId);
                      swipeGestureRef.current = null;

                      if (gesture.hasSwiped) {
                        swipeSuppressClickUntilByHabitIdRef.current[habit.id] = Date.now() + HABIT_SWIPE_SUPPRESS_CLICK_MS;
                      }

                      const armedDirection = gesture.armedDirection;
                      const nextAction =
                        armedDirection === 'right'
                          ? rightSwipeAction
                          : armedDirection === 'left'
                            ? leftSwipeAction
                            : null;
                      setSwipeOffsetByHabitId((current) => ({ ...current, [habit.id]: 0 }));
                      setSwipeArmedByHabitId((current) => ({ ...current, [habit.id]: null }));

                      if (!nextAction) {
                        return;
                      }
                      triggerCompletionHaptic('medium', { channel: 'habit', minIntervalMs: 120 });
                      triggerSwipeAction(habit, nextAction);
                    }}
                    onPointerCancel={() => {
                      swipeGestureRef.current = null;
                      setSwipeOffsetByHabitId((current) => ({ ...current, [habit.id]: 0 }));
                      setSwipeArmedByHabitId((current) => ({ ...current, [habit.id]: null }));
                    }}
                    onTouchStart={(event) => {
                      if (swipeGestureRef.current || isExpanded || isInteractiveHabitChild(event.target)) {
                        return;
                      }
                      const touch = event.changedTouches[0];
                      if (!touch) {
                        return;
                      }
                      swipeGestureRef.current = {
                        habitId: habit.id,
                        pointerId: touch.identifier,
                        startX: touch.clientX,
                        startY: touch.clientY,
                        isHorizontal: false,
                        hasSwiped: false,
                        armedDirection: swipeArmedDirection,
                      };
                    }}
                    onTouchMove={(event) => {
                      const gesture = swipeGestureRef.current;
                      if (!gesture || gesture.habitId !== habit.id || isExpanded) {
                        return;
                      }
                      const touch = Array.from(event.touches).find((entry) => entry.identifier === gesture.pointerId);
                      if (!touch) {
                        return;
                      }
                      const deltaX = touch.clientX - gesture.startX;
                      const deltaY = touch.clientY - gesture.startY;
                      if (!gesture.isHorizontal) {
                        if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) {
                          return;
                        }
                        if (Math.abs(deltaY) > Math.abs(deltaX)) {
                          swipeGestureRef.current = null;
                          return;
                        }
                        gesture.isHorizontal = true;
                      }
                      event.preventDefault();
                      const clamped = Math.max(-HABIT_SWIPE_MAX_PX, Math.min(HABIT_SWIPE_MAX_PX, deltaX));
                      if (Math.abs(clamped) > 6) {
                        gesture.hasSwiped = true;
                      }
                      setSwipeOffsetByHabitId((current) => ({ ...current, [habit.id]: clamped }));
                      const direction: HabitSwipeDirection = clamped >= 0 ? 'right' : 'left';
                      const nextAction = direction === 'right' ? rightSwipeAction : leftSwipeAction;
                      const armedDirection =
                        Math.abs(clamped) >= HABIT_SWIPE_ARM_THRESHOLD_PX && nextAction ? direction : null;
                      if (gesture.armedDirection !== armedDirection) {
                        triggerCompletionHaptic('light', { channel: 'navigation', minIntervalMs: 120 });
                        gesture.armedDirection = armedDirection;
                      }
                      setSwipeArmedByHabitId((current) => ({ ...current, [habit.id]: armedDirection }));
                    }}
                    onTouchEnd={(event) => {
                      const gesture = swipeGestureRef.current;
                      if (!gesture || gesture.habitId !== habit.id) {
                        return;
                      }
                      const touch = Array.from(event.changedTouches).find((entry) => entry.identifier === gesture.pointerId);
                      if (!touch) {
                        return;
                      }
                      swipeGestureRef.current = null;

                      if (gesture.hasSwiped) {
                        swipeSuppressClickUntilByHabitIdRef.current[habit.id] = Date.now() + HABIT_SWIPE_SUPPRESS_CLICK_MS;
                      }

                      const armedDirection = gesture.armedDirection;
                      const nextAction =
                        armedDirection === 'right'
                          ? rightSwipeAction
                          : armedDirection === 'left'
                            ? leftSwipeAction
                            : null;
                      setSwipeOffsetByHabitId((current) => ({ ...current, [habit.id]: 0 }));
                      setSwipeArmedByHabitId((current) => ({ ...current, [habit.id]: null }));

                      if (!nextAction) {
                        return;
                      }
                      triggerCompletionHaptic('medium', { channel: 'habit', minIntervalMs: 120 });
                      triggerSwipeAction(habit, nextAction);
                    }}
                    onTouchCancel={() => {
                      swipeGestureRef.current = null;
                      setSwipeOffsetByHabitId((current) => ({ ...current, [habit.id]: 0 }));
                      setSwipeArmedByHabitId((current) => ({ ...current, [habit.id]: null }));
                    }}
                  >
                    <div
                      className={`habit-checklist__row ${isExpanded ? 'habit-checklist__row--expanded' : ''}`}
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      aria-controls={detailPanelId}
                      onClick={() => {
                        const suppressUntil = swipeSuppressClickUntilByHabitIdRef.current[habit.id] ?? 0;
                        if (Date.now() < suppressUntil) {
                          return;
                        }
                        toggleExpanded(habit.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.currentTarget !== event.target) {
                          return;
                        }
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          toggleExpanded(habit.id);
                        }
                      }}
                    >
                      <input
                        id={checkboxId}
                        type="checkbox"
                        className="habit-checklist__checkbox"
                        checked={isCompleted}
                        aria-label={`Mark ${habit.name} as ${isCompleted ? 'incomplete' : 'complete'}`}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => {
                          event.stopPropagation();
                          void toggleHabit(habit, event.currentTarget);
                        }}
                        disabled={isSaving || (!scheduledToday && !isCompleted)}
                      />
                      <div className="habit-checklist__main">
                        <span className="habit-checklist__name">
                          {!isCompactView && habit.emoji ? (
                            <span className="habit-checklist__icon" aria-hidden="true">
                              {habit.emoji}
                            </span>
                          ) : null}
                          {habit.name}
                        </span>
                        <div className="habit-checklist__badges">
                          {(isCompleted || state?.progressState === 'skipped' || state?.progressState === 'missed') && state?.progressState && (
                            <span
                              className={`progress-state-badge ${getProgressStateColorClass(state.progressState)}`}
                              aria-label={getProgressStateLabel(state.progressState)}
                            >
                              {getProgressStateIcon(state.progressState)} {getProgressStateLabel(state.progressState)}
                            </span>
                          )}
                          {habitHealthState !== 'active' ? (
                            <span
                              className={`habit-health-badge habit-health-badge--${habitHealthState}`}
                              aria-label={`Habit health status: ${getHabitHealthBadgeLabel(habitHealthState)}`}
                            >
                              {getHabitHealthBadgeLabel(habitHealthState)}
                            </span>
                          ) : null}
                          {(() => {
                            const scheduleObj = habit.schedule as Record<string, unknown> | null;
                            if (
                              scheduleObj?.mode === 'times_per_week' &&
                              typeof scheduleObj.timesPerWeek === 'number'
                            ) {
                              const completed = weekCompletionsByHabit[habit.id] ?? 0;
                              const target = scheduleObj.timesPerWeek;
                              return (
                                <span
                                  className="habit-weekly-progress-badge"
                                  aria-label={`${completed} of ${target} times completed this week`}
                                >
                                  {completed}/{target} this week
                                </span>
                              );
                            }
                            return null;
                          })()}
                          {isOfferHabit && timeLimitedCountdownLabel ? (
                            <span className="habit-checklist__offer-timer" aria-label="Offer time remaining">
                              ⏳ {timeLimitedCountdownLabel}
                            </span>
                          ) : null}
                          {/* Quest habit badge — visible on the active quest habit */}
                          {isQuestHabit ? (
                            <span className="habit-checklist__quest-badge" aria-label="Quest Habit — unlocks your bonus door">
                              ⭐ Quest Habit
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {/* Quest habit toggle button — tap to designate/remove this habit as the Quest Habit */}
                      <button
                        type="button"
                        className={`habit-checklist__quest-btn${isQuestHabit ? ' habit-checklist__quest-btn--active' : ''}`}
                        aria-label={isQuestHabit ? 'Remove Quest Habit designation' : 'Set as Quest Habit'}
                        title={isQuestHabit ? 'Remove Quest Habit' : 'Set as Quest Habit (unlocks bonus door)'}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (isQuestHabit) {
                            handleClearQuestHabit();
                          } else {
                            handleSetQuestHabit({
                              habitId: habit.id,
                              title: habit.name,
                              emoji: habit.emoji ?? null,
                            });
                          }
                        }}
                      >
                        {isQuestHabit ? '⭐' : '☆'}
                      </button>
                    </div>
                  </div>
                </div>
                <div
                  className={`habit-checklist__details-panel ${
                    isExpanded ? 'habit-checklist__details-panel--open' : ''
                  }`}
                  id={detailPanelId}
                >
                  <section className="habit-checklist__detail-block habit-checklist__detail-block--info" aria-label="Habit info">
                    <div className="habit-checklist__detail-block-header">
                      <span className="habit-checklist__detail-block-label">Info</span>
                      {linkedVisionImage ? (
                        <button
                          type="button"
                          className="habit-checklist__vision-preview"
                          onClick={(event) => {
                            event.stopPropagation();
                            setVisionPreviewImage(linkedVisionImage);
                          }}
                          aria-label={`View vision board image for ${habit.name}`}
                        >
                          <img src={linkedVisionImage.publicUrl} alt="" aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                    <div className="habit-checklist__meta-group">
                      <p className="habit-checklist__meta">
                        Life wheel • {domainLabel ?? 'Unassigned'}
                      </p>
                      <p className="habit-checklist__meta habit-checklist__meta--secondary">
                        Goal • {goalLabel}
                      </p>
                      {lastCompletedText ? (
                        <p className="habit-checklist__note">{lastCompletedText}</p>
                      ) : null}
                    </div>
                    {habit.habit_environment ? (
                      <div className="habit-checklist__environment">
                        <p className="habit-checklist__environment-label">📍 Where &amp; How</p>
                        <p className="habit-checklist__environment-text">{habit.habit_environment}</p>
                      </div>
                    ) : null}
                  </section>
                  <section className="habit-checklist__detail-block habit-checklist__detail-block--progress" aria-label="Habit progress">
                    <div className="habit-checklist__detail-block-header">
                      <span className="habit-checklist__detail-block-label">Progress</span>
                    </div>
                    {state?.progressState === 'doneIsh' && state?.completionPercentage && (
                      <div className="habit-checklist__progress">
                        <div className="progress-bar-container">
                          <div
                            className="progress-bar-fill doneish"
                            style={{ width: `${state.completionPercentage}%` }}
                          />
                        </div>
                        <p className="habit-checklist__progress-text">
                          {state.completionPercentage}% complete
                        </p>
                      </div>
                    )}
                    {state?.loggedStage ? (
                      <p className="habit-checklist__note" style={{ marginTop: 0 }}>
                        Logged stage: <strong>{AUTO_PROGRESS_STAGE_LABELS[state.loggedStage]}</strong>
                      </p>
                    ) : null}
                    {scalePlan.enabled ? (
                      <div className="habit-checklist__stage-group">
                        <span className="habit-checklist__stage-group-label">Log as</span>
                        <div className="habit-checklist__stage-actions">
                          {SCALE_STAGE_ORDER.map((stage) => {
                            const stageInfo = scalePlan.stages[stage];
                            return (
                              <button
                                key={`${habit.id}-${stage}`}
                                type="button"
                                className={`habit-checklist__stage-chip ${
                                  stage === autoProgressState.tier ? 'habit-checklist__stage-chip--active' : ''
                                }`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleLogHabitAtStage(habit, stage);
                                }}
                                disabled={isSaving}
                                title={`Log as ${AUTO_PROGRESS_STAGE_LABELS[stage]}: ${stageInfo.label}`}
                              >
                                {AUTO_PROGRESS_STAGE_LABELS[stage]} · {stageInfo.completionPercent}%
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                    {autoProgressPanels[habit.id] ? (
                      <div className="habit-checklist__autoprog">
                        <div className="habit-checklist__autoprog-header">
                          <div>
                            <p className="habit-checklist__autoprog-label">Difficulty stage</p>
                            <p className="habit-checklist__autoprog-tier">
                              {AUTO_PROGRESS_STAGE_LABELS[autoProgressState.tier]}
                            </p>
                            <p className="habit-checklist__autoprog-description">
                              {AUTO_PROGRESS_TIERS[autoProgressState.tier].description}
                            </p>
                          </div>
                          {autoProgressState.lastShiftAt ? (
                            <span className="habit-checklist__autoprog-meta">
                              Last shift: {new Date(autoProgressState.lastShiftAt).toLocaleDateString()}
                            </span>
                          ) : null}
                        </div>
                        <div className="habit-checklist__autoprog-stats">
                          <span>Streak: {formatStreakValue(streakDays)}</span>
                          <span>
                            30-day adherence: {adherenceSnapshot ? `${adherencePercent}%` : '—'}
                          </span>
                        </div>
                        {suggestedDownshiftStage ? (
                          <div
                            className="habit-checklist__autoprog-locked"
                            style={{ color: '#92400e', background: '#fef3c7', borderColor: '#fcd34d', display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}
                          >
                            <span>
                              Low adherence detected. Consider a temporary reset to {AUTO_PROGRESS_STAGE_LABELS[suggestedDownshiftStage]} to protect momentum.
                            </span>
                            <button
                              type="button"
                              className="habit-checklist__autoprog-button"
                              disabled={isUpdatingAutoProgress}
                              onClick={() => {
                                void handleAutoProgressShift(habit, suggestedDownshiftStage, 'downshift');
                                if (session?.user?.id) {
                                  void recordTelemetryEvent({
                                    userId: session.user.id,
                                    eventType: 'habit_stage_recommendation_applied',
                                    metadata: {
                                      habitId: habit.id,
                                      toStage: suggestedDownshiftStage,
                                      adherencePercent,
                                    },
                                  });
                                }
                              }}
                            >
                              Apply now
                            </button>
                          </div>
                        ) : null}
                        <div className="habit-checklist__autoprog-actions">
                          <button
                            type="button"
                            className="habit-checklist__autoprog-button"
                            disabled={!downshiftTier || isUpdatingAutoProgress}
                            onClick={() => {
                              if (!downshiftTier) return;
                              void handleAutoProgressShift(habit, downshiftTier, 'downshift');
                            }}
                          >
                            {downshiftTier
                              ? `Reset to ${AUTO_PROGRESS_STAGE_LABELS[downshiftTier]}`
                              : 'At easiest stage'}
                          </button>
                          <button
                            type="button"
                            className="habit-checklist__autoprog-button habit-checklist__autoprog-button--primary"
                            disabled={!upgradeTier || !canUpgrade || isUpdatingAutoProgress}
                            onClick={() => {
                              if (!upgradeTier) return;
                              void handleAutoProgressShift(habit, upgradeTier, 'upgrade');
                            }}
                          >
                            {upgradeTier
                              ? `Progress to ${AUTO_PROGRESS_STAGE_LABELS[upgradeTier]}`
                              : 'At hardest stage'}
                          </button>
                        </div>
                        <p className="habit-checklist__autoprog-rules">
                          Upgrade rule: {AUTO_PROGRESS_UPGRADE_RULES.minStreakDays}-day streak and{' '}
                          {AUTO_PROGRESS_UPGRADE_RULES.minAdherence30}% 30-day adherence.
                        </p>
                        {upgradeTier && !canUpgrade ? (
                          <p className="habit-checklist__autoprog-locked">
                            Keep logging to unlock the next stage.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </section>
                  <section className="habit-checklist__detail-block habit-checklist__detail-block--manage" aria-label="Habit actions">
                    <div className="habit-checklist__detail-block-header">
                      <span className="habit-checklist__detail-block-label">Manage</span>
                    </div>
                    <div className="habit-checklist__detail-actions">
                      {!isCompleted && scheduledToday && habit.type === 'boolean' && (
                        <div className="habit-checklist__doneish-wrap">
                          <span className="habit-checklist__doneish-label">Done-ish</span>
                          <button
                            type="button"
                            className="habit-checklist__doneish-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleDoneIshCompletion(habit, null);
                            }}
                            disabled={isSaving}
                            aria-label={`Mark ${habit.name} as done-ish (partial completion)`}
                          >
                            ✨
                          </button>
                        </div>
                      )}
                      {!scheduledToday ? <span className="habit-checklist__pill">Rest day</span> : null}
                      {isSaving ? <span className="habit-checklist__saving">Updating…</span> : null}
                      {isUpdatingAutoProgress ? (
                        <span className="habit-checklist__saving">Updating stage…</span>
                      ) : null}
                      <button
                        type="button"
                        className="habit-checklist__alert-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAlertConfigHabit({ id: habit.id, name: habit.name });
                        }}
                      >
                        🔔 Alerts
                      </button>
                      <button
                        type="button"
                        className="habit-checklist__edit-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(habit);
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        className="habit-checklist__edit-btn"
                        disabled={lifecycleActionHabitIds.has(habit.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleTodayLifecycleAction(habit, 'pause');
                        }}
                      >
                        {lifecycleActionHabitIds.has(habit.id) ? 'Updating…' : '⏸️ Pause'}
                      </button>
                      <button
                        type="button"
                        className="habit-checklist__edit-btn"
                        disabled={lifecycleActionHabitIds.has(habit.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleTodayLifecycleAction(habit, 'deactivate');
                        }}
                      >
                        {lifecycleActionHabitIds.has(habit.id) ? 'Updating…' : '🛑 Deactivate'}
                      </button>
                      <div className="habit-checklist__skip-wrap">
                        <button
                          type="button"
                          className="habit-checklist__skip-btn"
                          aria-expanded={skipMenuHabitId === habit.id}
                          aria-haspopup="true"
                          disabled={isSkipDisabled}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isSkipDisabled) {
                              return;
                            }
                            handleToggleSkipMenu(habit.id);
                          }}
                        >
                          {isSkipDisabled ? '⏳ Offer active' : '⏭️ Skip'}
                        </button>
                        {skipMenuHabitId === habit.id ? (
                          <div
                            className="habit-checklist__skip-menu"
                            ref={skipMenuRef}
                            role="menu"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="habit-checklist__skip-option"
                              onClick={() => void handleLogHabitSkip(habit)}
                              disabled={skipSaving}
                            >
                              ⏭️ Skip — intentional
                            </button>
                            <button
                              type="button"
                              className="habit-checklist__skip-option"
                              onClick={() => setSkipReasonHabitId(habit.id)}
                              disabled={skipSaving}
                            >
                              ⏭️ Skip — add reason
                            </button>
                            <button
                              type="button"
                              className="habit-checklist__skip-option habit-checklist__skip-option--missed"
                              onClick={() => void handleLogHabitMissed(habit)}
                              disabled={skipSaving}
                            >
                              ❌ Missed — unintentional
                            </button>
                            {skipReasonHabitId === habit.id ? (
                              <div className="habit-checklist__skip-reason">
                                <label>
                                  <span className="sr-only">Reason for skipping</span>
                                  <textarea
                                    rows={3}
                                    value={skipReason}
                                    placeholder="Why are you skipping this habit?"
                                    onChange={(event) => setSkipReason(event.target.value)}
                                    disabled={skipSaving}
                                  />
                                </label>
                                <div className="habit-checklist__skip-reason-actions">
                                  <button
                                    type="button"
                                    className="habit-checklist__skip-confirm"
                                    onClick={() => {
                                      if (!skipReason.trim()) {
                                        setSkipError('Add a reason to log this skip.');
                                        return;
                                      }
                                      void handleLogHabitSkip(habit, {
                                        reason: skipReason,
                                        createJournalEntry: true,
                                      });
                                    }}
                                    disabled={skipSaving}
                                  >
                                    {skipSaving ? 'Saving…' : 'Log skip'}
                                  </button>
                                  <button
                                    type="button"
                                    className="habit-checklist__skip-cancel"
                                    onClick={() => {
                                      setSkipReasonHabitId(null);
                                      setSkipReason('');
                                      setSkipError(null);
                                    }}
                                    disabled={skipSaving}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : null}
                            {skipError ? (
                              <p className="habit-checklist__skip-error">{skipError}</p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className={`habit-checklist__autoprog-toggle ${
                          autoProgressPanels[habit.id] ? 'habit-checklist__autoprog-toggle--active' : ''
                        }`}
                        aria-pressed={autoProgressPanels[habit.id] ?? false}
                        aria-label="Toggle difficulty stage card"
                        onClick={(event) => {
                          event.stopPropagation();
                          setAutoProgressPanels((prev) => ({
                            ...prev,
                            [habit.id]: !prev[habit.id],
                          }));
                        }}
                      >
                        <span className="habit-checklist__autoprog-toggle-dot" aria-hidden="true" />
                      </button>
                    </div>
                  </section>
                </div>
              </li>
            );
          })}
        </ul>
        {completedHabits.length > 0 ? (
          <button
            type="button"
            className="habit-checklist__toggle"
            onClick={() => setShowCompletedHabits((prev) => !prev)}
            aria-expanded={showCompletedHabits}
          >
            <span className="habit-checklist__toggle-text">
              {showCompletedHabits
                ? 'Hide completed / skipped habits'
                : `Show completed / skipped habits (${completedHabits.length})`}
            </span>
            <span
              className={`habit-checklist__toggle-icon ${
                showCompletedHabits ? 'habit-checklist__toggle-icon--open' : ''
              }`}
              aria-hidden="true"
            />
          </button>
        ) : null}
      </div>
    );
  };

  const renderCompactExperience = () => {
    const dateLabel = formatCompactDateLabel(activeDate);
    const yearLabel = parseISODate(activeDate).getFullYear();
    const scheduledTarget = compactStats.scheduled || compactStats.total;
    const completedCount = Math.min(compactStats.completed, scheduledTarget);
    const progressLabel = scheduledTarget
      ? `${completedCount}/${scheduledTarget} habits done`
      : 'No habits scheduled';
    const progressRatio = scheduledTarget ? completedCount / scheduledTarget : 0;
    const progressPercent = Math.round(progressRatio * 100);
    const progressStage =
      progressPercent >= 95
        ? 'celebrate'
        : progressPercent >= 75
          ? 'strong'
          : progressPercent >= 50
            ? 'mid'
            : progressPercent >= 25
              ? 'faint'
              : 'none';
    const progressIcon =
      progressStage === 'celebrate' ? '⭐' : progressStage === 'strong' ? '✦' : null;
    const isViewingToday = activeDate === today;
    const canGoForward = activeDate < today;
    const actionsBadgeAria = `${completedActionsCount} actions completed ${
      isViewingToday ? 'today' : 'for this day'
    }`;
    const showActionsBadge = completedActionsCount > 0;
    const circadianEmoji = isViewingToday ? getCircadianEmoji(currentTime) : null;
    const circadianLabel = isViewingToday ? getCircadianLabel(currentTime) : null;
    const clockEmoji = isViewingToday ? getClockEmoji(currentTime) : null;
    const timeLabel = isViewingToday ? formatTimeLabel(currentTime) : null;
    const identitySignalsUnlocked = identitySignalDayCount >= 3 && isViewingToday;
    const identitySignalStatus = profileStrengthSignals?.areas?.identity?.status ?? 'unavailable';
    const identitySignalScore = profileStrengthSnapshot?.areaScores.identity;
    const identitySignalScoreLabel =
      identitySignalScore === null || identitySignalScore === undefined ? '—' : `${identitySignalScore}/10`;
    const identitySignalSummary =
      personalitySummary ??
      (identitySignalStatus === 'no_data'
        ? 'Complete your identity snapshot to personalize these signals.'
        : 'Signals refresh as you log habits and reflections.');
    const identitySignalSupport =
      identitySignalStatus === 'ok'
        ? 'We wait until you have a few days logged so signals reflect real momentum.'
        : 'Signals unlock after a few days of check-ins and stay private by default.';

    const statusText = errorMessage
      ? errorMessage
      : isDemoExperience
        ? 'Habit progress is stored locally in demo mode. Connect Supabase to sync across devices.'
        : !isConfigured
          ? 'Connect Supabase to sync your rituals and keep streaks backed up.'
          : 'Tap refresh if you updated habits elsewhere to pull in the latest list.';

    const statusVariant = errorMessage
      ? 'error'
      : isDemoExperience
        ? 'info'
        : !isConfigured
          ? 'warning'
          : 'muted';

    const todayWinsTiles = [
      { id: 'habits', icon: '✅', label: 'Habits', value: completedCount },
      { id: 'journal', icon: '📓', label: 'Journal', value: todayWinsSummary.journalCount },
      { id: 'actions', icon: '⚡', label: 'Actions', value: completedActionsCount },
      { id: 'lotus', icon: '🪷', label: 'Lotus', value: todayWinsSummary.lotusEarned },
      { id: 'xp', icon: '⭐', label: 'XP', value: todayWinsSummary.xpEarned },
      { id: 'game-total', icon: '🎮', label: 'Game', value: todayWinsSummary.gameRewardsTotal },
      { id: 'game-gold', icon: '🪙', label: 'Gold', value: todayWinsSummary.gameGoldEarned },
      { id: 'game-dice', icon: '🎲', label: 'Dice', value: todayWinsSummary.gameDiceEarned },
      { id: 'game-token', icon: '🎟️', label: 'Tokens', value: todayWinsSummary.gameTokensEarned },
      { id: 'game-hearts', icon: '❤️', label: 'Hearts', value: todayWinsSummary.gameHeartsEarned },
    ].filter((tile) => tile.value > 0);
    const habitCompletionPercent = scheduledTarget ? Math.round((completedCount / scheduledTarget) * 100) : 0;
    const otherWinsCount = [
      todayWinsSummary.journalCount > 0,
      completedActionsCount > 0,
      todayWinsSummary.lotusEarned > 0,
      todayWinsSummary.xpEarned > 0,
      todayWinsSummary.gameRewardsTotal > 0,
    ].filter(Boolean).length;
    const todayWinsScore = Math.round((habitCompletionPercent * 0.75) + ((Math.min(otherWinsCount, 5) / 5) * 25));
    const todayWinsTier = getTodayWinsTier(todayWinsScore);
    const todayWinsImageSrc = TODAY_WINS_IMAGES[todayWinsTier];
    const todayWinsStarsLabel =
      todayWinsTier === 'three_star' ? '3 Stars' : todayWinsTier === 'two_star' ? '2 Stars' : '1 Star';
    const todayWinsTierCaption =
      todayWinsTier === 'three_star'
        ? 'Outstanding momentum today.'
        : todayWinsTier === 'two_star'
          ? 'Solid progress logged today.'
          : 'A meaningful start for today.';
    const todayWinsTileCount = todayWinsTiles.length;
    const orbState = todayWinsTileCount === 0
      ? 'empty'
      : todayWinsTier === 'three_star'
        ? 'charged'
        : todayWinsTier === 'two_star'
          ? 'strong'
          : 'active';
    const orbIcon = orbState === 'empty'
      ? '◌'
      : orbState === 'active'
        ? '✨'
        : orbState === 'strong'
          ? '💫'
          : '🏆';

    const progressNode = (
      <button
        type="button"
        className={`habit-checklist-card__progress habit-checklist-card__progress--${orbState}${
          progressStage !== 'none' ? ` habit-checklist-card__progress--${progressStage}` : ''
        }`}
        onClick={() => setIsTodayWinsOpen(true)}
        aria-label={`Open Today's Wins (${todayWinsTileCount} categories)`}
      >
        <svg className="habit-checklist-card__progress-ring" viewBox="0 0 36 36" aria-hidden="true">
          <defs>
            <linearGradient id={progressGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          <circle className="habit-checklist-card__progress-track" cx="18" cy="18" r="16" />
          <circle
            className="habit-checklist-card__progress-value"
            cx="18"
            cy="18"
            r="16"
            strokeDasharray={`${progressPercent} 100`}
            stroke={`url(#${progressGradientId})`}
          />
        </svg>
        <span className="habit-checklist-card__progress-count" aria-hidden="true">
          {todayWinsTileCount}
        </span>
        <span className="habit-checklist-card__progress-symbol" aria-hidden="true">
          {orbIcon}
        </span>
      </button>
    );

    const ariaLabel = `Habit checklist for ${formatDateLabel(activeDate)}`;

    const handleOpenQuickJournal = () => {
      setIsQuickJournalOpen(true);
      setQuickJournalError(null);
      setQuickJournalStatus(null);
    };

    const handleSaveQuickJournalDraft = () => {
      if (quickJournalMode === 'written') {
        const hasContent = Boolean(
          quickJournalMorning.trim() ||
            quickJournalDay.trim() ||
            quickJournalEvening.trim() ||
            quickJournalInteractions.trim() ||
            quickJournalFreeform.trim()
        );

        if (!hasContent) {
          setQuickJournalError('Add at least one entry before saving.');
          return;
        }
      } else if (quickJournalMode === 'dream') {
        const hasDreamContent = Boolean(
          quickDreamTitle.trim() ||
            quickDreamSymbols.trim() ||
            quickDreamEmotions.trim() ||
            quickDreamReflection.trim(),
        );
        if (!hasDreamContent) {
          setQuickJournalError('Add at least one dream detail before saving.');
          return;
        }
      }

      setQuickJournalError(null);
      setQuickJournalStatus('Draft saved for later.');
      saveDraft(quickJournalDraftKey(session.user.id, activeDate), {
        isOpen: true,
        mode: quickJournalMode,
        morning: quickJournalMorning,
        day: quickJournalDay,
        evening: quickJournalEvening,
        interactions: quickJournalInteractions,
        freeform: quickJournalFreeform,
        energy: quickJournalEnergy,
        mood: quickJournalMood,
        focus: quickJournalFocus,
        stress: quickJournalStress,
        dreamTitle: quickDreamTitle,
        dreamSymbols: quickDreamSymbols,
        dreamEmotions: quickDreamEmotions,
        dreamReflection: quickDreamReflection,
      } satisfies QuickJournalDraft);
    };

    const handleSubmitQuickJournal = async () => {
      const parts: string[] = [];

      if (quickJournalMode === 'pulse') {
        parts.push('Pulse check-in');
        parts.push(`⚡️ Energy: ${quickJournalEnergy}/10`);
        parts.push(`😊 Mood: ${quickJournalMood}/10`);
        parts.push(`🎯 Focus: ${quickJournalFocus}/10`);
        parts.push(`🧘 Stress: ${quickJournalStress}/10`);
      } else if (quickJournalMode === 'written') {
        if (quickJournalMorning.trim()) {
          parts.push(`🌅 Morning:\n${quickJournalMorning.trim()}`);
        }
        if (quickJournalDay.trim()) {
          parts.push(`☀️ Day:\n${quickJournalDay.trim()}`);
        }
        if (quickJournalEvening.trim()) {
          parts.push(`🌙 Evening:\n${quickJournalEvening.trim()}`);
        }
        if (quickJournalInteractions.trim()) {
          parts.push(`👥 Interactions:\n${quickJournalInteractions.trim()}`);
        }
        if (quickJournalFreeform.trim()) {
          parts.push(`📝 Notes:\n${quickJournalFreeform.trim()}`);
        }
      } else {
        parts.push('Dream journal');
        if (quickDreamTitle.trim()) {
          parts.push(`🌙 Dream title:\n${quickDreamTitle.trim()}`);
        }
        if (quickDreamSymbols.trim()) {
          parts.push(`🔮 Symbols or scenes:\n${quickDreamSymbols.trim()}`);
        }
        if (quickDreamEmotions.trim()) {
          parts.push(`💭 Emotions:\n${quickDreamEmotions.trim()}`);
        }
        if (quickDreamReflection.trim()) {
          parts.push(`🧠 Meaning or reflection:\n${quickDreamReflection.trim()}`);
        }
      }

      const content = parts.join('\n\n');
      
      if (!content) {
        setQuickJournalError('Add at least one entry before submitting.');
        return;
      }

      setQuickJournalSaving(true);
      setQuickJournalError(null);
      setQuickJournalStatus(null);

      try {
        const payload: Database['public']['Tables']['journal_entries']['Insert'] = {
          user_id: session.user.id,
          entry_date: activeDate,
          title: null,
          content,
          mood: null,
          linked_goal_ids: null,
          linked_habit_ids: null,
          is_private: true,
          type: quickJournalMode === 'dream' ? 'dream' : 'quick',
          mood_score: null,
          category: quickJournalMode === 'pulse' ? 'nonverbal' : null,
          unlock_date: null,
          goal_id: null,
          tags: quickJournalMode === 'pulse'
            ? ['nonverbal', 'pulse-check-in']
            : quickJournalMode === 'dream'
              ? ['dream', 'sleep', 'quick-entry']
              : null,
        };

        const { data, error } = await createJournalEntry(payload);
        if (error) {
          throw new Error(error.message);
        }

        // 🎮 Award XP for quick journal entry
        if (data) {
          await earnXP(XP_REWARDS.JOURNAL_ENTRY, 'journal_entry', data.id);
          await recordActivity();
          recordChallengeActivity(session.user.id, 'journal_entry');
        }

        removeDraft(quickJournalDraftKey(session.user.id, activeDate));
        setIsQuickJournalOpen(false);
        setQuickJournalMode('written');
        setQuickJournalMorning('');
        setQuickJournalDay('');
        setQuickJournalEvening('');
        setQuickJournalInteractions('');
        setQuickJournalFreeform('');
        setQuickJournalEnergy(QUICK_JOURNAL_PULSE_DEFAULTS.energy);
        setQuickJournalMood(QUICK_JOURNAL_PULSE_DEFAULTS.mood);
        setQuickJournalFocus(QUICK_JOURNAL_PULSE_DEFAULTS.focus);
        setQuickJournalStress(QUICK_JOURNAL_PULSE_DEFAULTS.stress);
        setQuickDreamTitle(QUICK_JOURNAL_DREAM_DEFAULTS.title);
        setQuickDreamSymbols(QUICK_JOURNAL_DREAM_DEFAULTS.symbols);
        setQuickDreamEmotions(QUICK_JOURNAL_DREAM_DEFAULTS.emotions);
        setQuickDreamReflection(QUICK_JOURNAL_DREAM_DEFAULTS.reflection);
        setQuickJournalStatus('Submitted to your journal.');
      } catch (err) {
        setQuickJournalError(err instanceof Error ? err.message : 'Unable to save your journal entry.');
      } finally {
        setQuickJournalSaving(false);
      }
    };

    const quickJournalDateLabel = formatDateLabel(activeDate);
    const dayStatus = dayStatusMap[activeDate] ?? null;
    const previousDateISO = formatISODate(addDays(parseISODate(activeDate), -1));
    const skipStreakBefore = getSkipStreak(previousDateISO, dayStatusMap);
    const skipStreakCount = dayStatus === 'skip' ? skipStreakBefore + 1 : skipStreakBefore;
    const skipLimitReached = skipStreakBefore >= 3 && dayStatus !== 'skip';

    const handleOpenIntentionsJournal = (type: 'today' | 'tomorrow') => {
      const draft = loadIntentionsDraft(session.user.id, activeDate, type);
      const existingEntry = type === 'tomorrow' ? nextDayIntentionsEntry : todayIntentionsEntry;
      const draftContent = draft?.content ?? '';
      const content = draftContent || existingEntry?.content || '';
      setIsIntentionsJournalOpen(true);
      setIntentionsJournalType(type);
      setIntentionsJournalContent(content);
      setIntentionsJournalError(null);
      setIntentionsJournalStatus(null);
    };

    const handleSaveIntentionsJournal = async () => {
      const content = intentionsJournalContent.trim();
      if (!content) {
        setIntentionsJournalError('Add your intentions or todos before saving.');
        return;
      }

      setIntentionsJournalSaving(true);
      setIntentionsJournalError(null);
      setIntentionsJournalStatus(null);

      try {
        // Calculate the target date based on the type
        const targetDate = intentionsJournalType === 'tomorrow' 
          ? formatISODate(addDays(parseISODate(activeDate), 1))
          : activeDate;
        
        const title = intentionsJournalType === 'tomorrow' 
          ? "Tomorrow's Intentions" 
          : "Today's Intentions";

        const existingEntry =
          intentionsJournalType === 'tomorrow' ? nextDayIntentionsEntry : todayIntentionsEntry;
        const { data, error } = existingEntry
          ? await updateJournalEntry(existingEntry.id, {
              entry_date: targetDate,
              title,
              content,
              tags: ['intentions', 'todos'],
            })
          : await createJournalEntry({
              user_id: session.user.id,
              entry_date: targetDate,
              title,
              content,
              mood: null,
              tags: ['intentions', 'todos'],
              linked_goal_ids: null,
              linked_habit_ids: null,
              is_private: true,
              type: 'quick',
              mood_score: null,
              category: null,
              unlock_date: null,
              goal_id: null,
            });
        if (error) {
          throw new Error(error.message);
        }

        // 🎮 Award XP for intentions journal entry
        if (data) {
          await earnXP(XP_REWARDS.JOURNAL_ENTRY, 'journal_entry', data.id);
          await recordActivity();
          recordChallengeActivity(session.user.id, 'journal_entry');
        }

        if (data) {
          if (intentionsJournalType === 'tomorrow') {
            setNextDayIntentionsEntry(data);
          } else {
            setTodayIntentionsEntry(data);
          }
        }

        removeDraft(intentionsJournalDraftKey(session.user.id, activeDate, intentionsJournalType));
        removeDraft(legacyIntentionsJournalDraftKey(session.user.id, activeDate));
        setIsIntentionsJournalOpen(false);
        setIntentionsJournalContent('');
        setIntentionsJournalStatus('Saved to your journal.');
      } catch (err) {
        setIntentionsJournalError(err instanceof Error ? err.message : 'Unable to save your journal entry.');
      } finally {
        setIntentionsJournalSaving(false);
      }
    };

    const checklistCardClassName = `habit-checklist-card${isCompactView ? '' : ' habit-checklist-card--glass'}`;
  const intentionsNoticeKey = intentionsNoticeStorageKey(session.user.id, today);
  const handleOpenIntentionsNotice = () => {
    setIsIntentionsNoticeOpen(true);
    setIsIntentionsNoticeViewed(true);
    setIntentionsMeetError(null);
    saveDraft(intentionsNoticeKey, true);
  };
  const handleCloseIntentionsNotice = () => {
    setIsIntentionsNoticeOpen(false);
  };
  const intentionsMeetKey = intentionsMeetStorageKey(session.user.id, today);
  const handleMeetIntentions = async () => {
    if (intentionsMeetSaving || isIntentionsMet) return;
    if (!isConfigured && !isDemoExperience) {
      setIntentionsMeetError('Connect Supabase to earn XP.');
      return;
    }

    setIntentionsMeetSaving(true);
    setIntentionsMeetError(null);

    try {
      await earnXP(
        XP_REWARDS.INTENTIONS_MET,
        'intentions_met',
        today,
        "Met today's intention",
      );
      setIsIntentionsMet(true);
      saveDraft(intentionsMeetKey, true);
    } catch (error) {
      setIntentionsMeetError(
        error instanceof Error ? error.message : 'Unable to record intention progress right now.',
      );
    } finally {
      setIntentionsMeetSaving(false);
    }
  };
    const handleDayStatusUpdate = async (status: DayStatus) => {
      const isCurrentlySet = dayStatusMap[activeDate] === status;
      
      setDayStatusMap((previous) => {
        const next = { ...previous };
        if (isCurrentlySet) {
          delete next[activeDate];
        } else {
          next[activeDate] = status;
        }
        return next;
      });

      // Create journal entry when status is set (not when unsetting)
      if (!isCurrentlySet) {
        let journalMessage = '';
        let journalTitle = '';
        
        switch (status) {
          case 'skip':
            journalMessage = 'Skipped today for any reason (lazy, busy, tired)';
            journalTitle = 'Day Status: Skipped';
            break;
          case 'vacation':
            journalMessage = 'Vacation';
            journalTitle = 'Day Status: Vacation';
            break;
          case 'sick':
            journalMessage = 'Sick';
            journalTitle = 'Day Status: Sick';
            break;
        }

        try {
          await createJournalEntry({
            user_id: session.user.id,
            entry_date: activeDate,
            title: journalTitle,
            content: journalMessage,
            mood: null,
            tags: ['day_status', status],
            linked_goal_ids: null,
            linked_habit_ids: null,
            is_private: true,
            type: 'quick',
            mood_score: null,
            category: null,
            unlock_date: null,
            goal_id: null,
          });
        } catch (error) {
          console.error('Failed to create journal entry for day status:', error);
        }
      }
    };

    const handleCompactToggle = () => {
      if (forceCompactView) {
        setIsCompactView(true);
        setIsCompactToggleLabelVisible(true);
        if (compactToggleLabelTimeoutRef.current) {
          window.clearTimeout(compactToggleLabelTimeoutRef.current);
        }
        compactToggleLabelTimeoutRef.current = window.setTimeout(() => {
          setIsCompactToggleLabelVisible(false);
        }, 2200);
        return;
      }
      setIsCompactView((previous) => !previous);
      setIsCompactToggleLabelVisible(true);
      if (compactToggleLabelTimeoutRef.current) {
        window.clearTimeout(compactToggleLabelTimeoutRef.current);
      }
      compactToggleLabelTimeoutRef.current = window.setTimeout(() => {
        setIsCompactToggleLabelVisible(false);
      }, 2200);
    };

    const showIntentionsOnlyRow = Boolean(yesterdayIntentionsEntry && !isIntentionsNoticeViewed && !isCompactView);
    const showIntentionsButton = Boolean(yesterdayIntentionsEntry);
    const intentionsButtonClassName = `habit-checklist-card__intentions-button ${
      isIntentionsNoticeViewed ? 'habit-checklist-card__intentions-button--seen habit-checklist-card__intentions-button--compact' : ''
    }`;
    const todayWinsModalContent = isTodayWinsOpen ? (
      <div className="today-wins-modal" role="dialog" aria-modal="true" aria-label="Today's Wins">
        <button
          type="button"
          className="today-wins-modal__backdrop"
          onClick={() => setIsTodayWinsOpen(false)}
          aria-label="Close Today's Wins"
        />
        <div className="today-wins-modal__card" role="document">
          <div className="today-wins-modal__header">
            <div className={`today-wins-modal__hero today-wins-modal__hero--${todayWinsTier}`}>
              <img
                src={todayWinsImageSrc}
                alt={`${todayWinsStarsLabel} Today's Wins`}
                className="today-wins-modal__hero-image"
              />
              {todayWinsTier === 'three_star' ? (
                <>
                  <span className="today-wins-modal__flare today-wins-modal__flare--1" aria-hidden="true">✦</span>
                  <span className="today-wins-modal__flare today-wins-modal__flare--2" aria-hidden="true">✧</span>
                  <span className="today-wins-modal__flare today-wins-modal__flare--3" aria-hidden="true">✦</span>
                  <span className="today-wins-modal__flare today-wins-modal__flare--4" aria-hidden="true">✧</span>
                </>
              ) : null}
            </div>
            <div className="today-wins-modal__title-wrap">
              <h3>Today's Wins · {todayWinsStarsLabel}</h3>
              <p className="today-wins-modal__tier-copy">
                {todayWinsTierCaption} · Score {todayWinsScore}
              </p>
            </div>
          </div>
          {todayWinsTiles.length > 0 ? (
            <div className="today-wins-modal__grid" role="list" aria-label="Today's completed categories">
              {todayWinsTiles.map((tile) => (
                <div key={tile.id} className="today-wins-modal__tile" role="listitem">
                  <span className="today-wins-modal__tile-icon" aria-hidden="true">{tile.icon}</span>
                  <span className="today-wins-modal__tile-value">{tile.value.toLocaleString()}</span>
                  <span className="today-wins-modal__tile-label">{tile.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="today-wins-modal__empty">No wins logged yet for this day.</p>
          )}
          <div className="today-wins-modal__footer">
            <button
              type="button"
              className="today-wins-modal__close today-wins-modal__close--gold"
              onClick={() => setIsTodayWinsOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    ) : null;
    const todayWinsModal = todayWinsModalContent
      ? modalRoot
        ? createPortal(todayWinsModalContent, modalRoot)
        : todayWinsModalContent
      : null;

    return (
      <div className={checklistCardClassName} role="region" aria-label={ariaLabel}>
        {yesterdayIntentionsEntry && isIntentionsNoticeOpen ? (
          <div className="habit-intentions-modal" role="dialog" aria-modal="true">
            <button
              type="button"
              className="habit-intentions-modal__backdrop"
              onClick={handleCloseIntentionsNotice}
              aria-label="Close intentions"
            />
            <div className="habit-intentions-modal__card" role="document">
              <div className="habit-intentions-modal__header">
                <div>
                  <p className="habit-intentions-modal__eyebrow">Yesterday's note for today</p>
                  <h3 className="habit-intentions-modal__title">Intentions</h3>
                </div>
                <button
                  type="button"
                  className="habit-intentions-modal__close"
                  onClick={handleCloseIntentionsNotice}
                >
                  Close
                </button>
              </div>
              <div className="habit-intentions-modal__body">
                <p>{yesterdayIntentionsEntry.content}</p>
              </div>
              <div className="habit-intentions-modal__action">
                <button
                  type="button"
                  className="habit-intentions-modal__action-button"
                  onClick={() => void handleMeetIntentions()}
                  disabled={intentionsMeetSaving || isIntentionsMet}
                >
                  <span
                    className={`habit-intentions-modal__action-check ${isIntentionsMet ? 'is-complete' : ''}`}
                    aria-hidden="true"
                  >
                    {isIntentionsMet ? '✓' : ''}
                  </span>
                  <span className="habit-intentions-modal__action-label">
                    {isIntentionsMet ? "Today's intention met" : "Meet today's intention"}
                  </span>
                  <span className="habit-intentions-modal__action-reward">
                    +{XP_REWARDS.INTENTIONS_MET} XP
                  </span>
                </button>
                {intentionsMeetError ? (
                  <p className="habit-intentions-modal__error" role="status">
                    {intentionsMeetError}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
        {todayWinsModal}
        <div className="habit-checklist-card__board">
          <div className="habit-checklist-card__board-head">
            <div className="habit-checklist-card__date-wrap">
              <div className="habit-checklist-card__date-group">
                {!isCompactView ? progressNode : null}
                <p className="habit-checklist-card__date">
                  <span className="habit-checklist-card__date-year">{yearLabel}</span>
                  <span className="habit-checklist-card__date-text">{dateLabel}</span>
                </p>
              </div>
              <button
                type="button"
                className={`habit-checklist-card__glass-toggle ${
                  isCompactView ? 'habit-checklist-card__glass-toggle--active' : ''
                } ${!isCompactToggleLabelVisible ? 'habit-checklist-card__glass-toggle--label-hidden' : ''}`}
                onClick={handleCompactToggle}
                aria-pressed={isCompactView}
              >
                <span className="habit-checklist-card__glass-toggle-indicator" aria-hidden="true">
                  <span className="habit-checklist-card__glass-toggle-thumb" />
                </span>
                <span className="habit-checklist-card__glass-toggle-label">
                  {isCompactView ? 'Compact' : 'Detailed'}
                </span>
              </button>
            </div>
            {!isCompactView ? (
              <div className="habit-checklist-card__head-actions">
                {showIntentionsOnlyRow ? (
                  <div className="habit-checklist-card__nav-row habit-checklist-card__nav-row--intentions-only">
                    <button
                      type="button"
                      className={intentionsButtonClassName}
                      onClick={handleOpenIntentionsNotice}
                    >
                      Intentions
                    </button>
                  </div>
                ) : (
                  <div className="habit-checklist-card__nav-row">
                    <button
                      type="button"
                      className="habit-day-nav__button habit-day-nav__button--prev"
                      onClick={() => changeActiveDateBy(-1)}
                      aria-label="Previous day"
                    >
                      ←
                    </button>
                    <div className="habit-checklist-card__nav-center">
                      <div className="habit-checklist-card__nav-pills" role="group" aria-label="Today and calendar controls">
                        {isViewingToday ? (
                          <span className="habit-checklist-card__nav-pill habit-checklist-card__nav-pill--current">
                            Today
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="habit-checklist-card__nav-pill"
                            onClick={resetToToday}
                          >
                            Today
                          </button>
                        )}
                        <label
                          className="habit-checklist-card__nav-pill habit-checklist-card__nav-pill--calendar"
                          aria-label="Select a date to track"
                        >
                          <span className="habit-checklist-card__nav-pill-icon" aria-hidden="true">
                            📅
                          </span>
                          <input
                            className="habit-checklist-card__nav-pill-input"
                            type="date"
                            value={activeDate}
                            max={today}
                            onChange={(event) => handleDateInputChange(event.target.value)}
                          />
                        </label>
                      </div>
                      <div className="habit-checklist-card__nav-meta">
                        {showActionsBadge ? (
                          <span className="habit-checklist-card__actions-badge" aria-label={actionsBadgeAria}>
                            <span className="habit-checklist-card__actions-label">Actions</span>
                            <span className="habit-checklist-card__actions-count">{completedActionsCount}</span>
                          </span>
                        ) : null}
                        {showIntentionsButton ? (
                          <button
                            type="button"
                            className={intentionsButtonClassName}
                            onClick={handleOpenIntentionsNotice}
                          >
                            {isIntentionsNoticeViewed ? (
                              <>
                                <span className="habit-checklist-card__intentions-icon" aria-hidden="true">
                                  🎯
                                </span>
                                <span className="sr-only">Intentions</span>
                              </>
                            ) : (
                              'Intentions'
                            )}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="habit-day-nav__button habit-day-nav__button--next"
                      onClick={() => changeActiveDateBy(1)}
                      disabled={!canGoForward}
                      aria-label="Next day"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="habit-checklist-card__board-body">
            {renderDayNavigation('compact', true, isCompactView)}
            {habits.length === 0 ? (
              <div className="habit-checklist-card__empty">
                <p>No habits scheduled for this day.</p>
                <p>Add a ritual to any goal and it will show up here for quick check-ins.</p>
              </div>
            ) : (
              renderCompactList()
            )}

            {analysisHabitId ? (
              <HabitImprovementAnalysisModal
                isOpen={Boolean(analysisHabitId)}
                userId={session.user.id}
                habitId={analysisHabitId}
                habitName={habits.find((habit) => habit.id === analysisHabitId)?.name ?? 'Habit'}
                onClose={() => setAnalysisHabitId(null)}
              />
            ) : null}

            {identitySignalsUnlocked ? (
              <div className="identity-signals-card" aria-live="polite">
                <div className="identity-signals-card__header">
                  <div>
                    <p className="identity-signals-card__eyebrow">Identity Signals</p>
                    <h3 className="identity-signals-card__title">Your identity is taking shape</h3>
                  </div>
                  <span className="identity-signals-card__score" aria-label={`Identity signal score ${identitySignalScoreLabel}`}>
                    {identitySignalScoreLabel}
                  </span>
                </div>
                <p className="identity-signals-card__summary">{identitySignalSummary}</p>
                <p className="identity-signals-card__support">{identitySignalSupport}</p>
                <div className="identity-signals-card__actions">
                  <button
                    type="button"
                    className="identity-signals-card__button"
                    onClick={() => setIsIdentitySignalsOpen(true)}
                  >
                    Why this?
                  </button>
                </div>
              </div>
            ) : null}

            <RoutinesTodayLane
              session={session}
              onHideStandaloneHabitsChange={(habitIds) => setRoutineHiddenHabitIds(habitIds)}
            />

            <div className="habit-contracts-card" aria-live="polite">
              <div className="habit-contracts-card__header">
                <div>
                  <p className="habit-contracts-card__eyebrow">Keep commitments visible</p>
                  <h3 className="habit-contracts-card__title">Active contracts</h3>
                </div>
                <button
                  type="button"
                  className="habit-contracts-card__refresh"
                  onClick={() => void loadActiveContracts()}
                  disabled={contractsLoading || contractActionId !== null}
                >
                  {contractsLoading ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>

              {contractsLoading && activeContracts.length === 0 ? (
                <p className="habit-contracts-card__hint">Loading your active contracts…</p>
              ) : activeContracts.length === 0 ? (
                <p className="habit-contracts-card__hint">
                  No active contracts right now. Start one from the Contracts tab and it will appear here.
                </p>
              ) : (
                <div className="habit-contracts-card__list">
                  {activeContracts.map((contract) => {
                    const progressPercent = Math.min(100, (contract.currentProgress / contract.targetCount) * 100);
                    const isBusy = contractActionId === contract.id;
                    const stakeLabel = `${contract.stakeAmount} ${contract.stakeType === 'gold' ? 'Gold' : 'Tokens'} staked`;
                    const contractEndDate = contract.endAt ? new Date(contract.endAt) : null;
                    const contractStartMs = new Date(contract.startAt).getTime();
                    const contractEndMs = contractEndDate?.getTime() ?? null;
                    const hasTimeline =
                      contractEndMs !== null
                      && !Number.isNaN(contractStartMs)
                      && !Number.isNaN(contractEndMs)
                      && contractEndMs > contractStartMs;
                    const timelinePercent = hasTimeline
                      ? Math.max(0, Math.min(100, ((Date.now() - contractStartMs) / (contractEndMs - contractStartMs)) * 100))
                      : null;

                    return (
                      <article key={contract.id} className="habit-contracts-card__item">
                        <div className="habit-contracts-card__item-head">
                          <h4 className="habit-contracts-card__item-title">{contract.isSacred ? `🔱 ${contract.title}` : contract.title}</h4>
                          <span className={`habit-contracts-card__status habit-contracts-card__status--${contract.status}`}>
                            {contract.status}
                          </span>
                        </div>
                        <p className="habit-contracts-card__item-copy">
                          {contract.currentProgress} / {contract.targetCount} this {contract.cadence}
                        </p>
                        <p className="habit-contracts-card__stake">{stakeLabel}</p>
                        <div className="habit-contracts-card__meter" role="presentation">
                          <span className="habit-contracts-card__meter-fill" style={{ width: `${progressPercent}%` }} />
                        </div>
                        {hasTimeline && timelinePercent !== null && contractEndDate ? (
                          <div className="habit-contracts-card__timeline" role="status" aria-live="polite">
                            <div className="habit-contracts-card__timeline-head">
                              <span>Timeline</span>
                              <span>{Math.round(timelinePercent)}%</span>
                            </div>
                            <div className="habit-contracts-card__meter" role="presentation">
                              <span className="habit-contracts-card__meter-fill habit-contracts-card__meter-fill--timeline" style={{ width: `${timelinePercent}%` }} />
                            </div>
                            <p className="habit-contracts-card__timeline-copy">
                              Ends {contractEndDate.toLocaleDateString()}
                            </p>
                          </div>
                        ) : null}
                        <div className="habit-contracts-card__actions">
                          <button
                            type="button"
                            className="habit-contracts-card__button habit-contracts-card__button--primary"
                            onClick={() =>
                              void handleContractAction(
                                contract.id,
                                contract.status === 'paused' ? resumeContract : recordContractProgress,
                                'Unable to update contract progress.',
                              )
                            }
                            disabled={isBusy}
                          >
                            {contract.status === 'paused' ? 'Resume' : 'Mark progress'}
                          </button>
                          {contract.status === 'active' ? (
                            <button
                              type="button"
                              className="habit-contracts-card__button"
                              onClick={() => void handleContractAction(contract.id, pauseContract, 'Unable to pause contract.')}
                              disabled={isBusy}
                            >
                              Pause
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="habit-contracts-card__button"
                            onClick={() => void handleContractAction(contract.id, cancelContract, 'Unable to cancel contract.')}
                            disabled={isBusy}
                          >
                            Cancel
                          </button>
                          {contract.accountabilityMode === 'witness' && contract.witnessLabel ? (
                            <button
                              type="button"
                              className="habit-contracts-card__button"
                              onClick={() => void handlePingWitness(contract)}
                              disabled={isBusy}
                            >
                              Ping witness
                            </button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {contractsError ? <p className="habit-contracts-card__error">{contractsError}</p> : null}
            </div>

            <div className="habit-quick-journal" aria-live="polite">
              <div className="habit-quick-journal__header">
                <div>
                  <p className="habit-quick-journal__eyebrow">Reflect for this day</p>
                  <h3 className="habit-quick-journal__title">Quick journal</h3>
                </div>
                <div className="habit-quick-journal__meta">
                  <span className="habit-quick-journal__badge">{quickJournalDateLabel}</span>
                  {isViewingToday && circadianEmoji ? (
                    <span className="habit-quick-journal__icon" aria-hidden="true">
                      {circadianEmoji}
                    </span>
                  ) : null}
                  {isViewingToday && circadianLabel ? (
                    <span className="sr-only">{circadianLabel}</span>
                  ) : null}
                </div>
              </div>
              <p className="habit-quick-journal__hint">
                {quickJournalMode === 'pulse'
                  ? 'Tap the sliders to capture your day without writing.'
                  : quickJournalMode === 'dream'
                    ? 'Capture your dream while it is still fresh.'
                    : 'Capture a few thoughts tied to the same date you are tracking above.'}
              </p>
              <div className="habit-quick-journal__type-toggle" role="tablist" aria-label="Journal type">
                <button
                  type="button"
                  role="tab"
                  aria-selected={quickJournalMode === 'written'}
                  className={`habit-quick-journal__type-button ${
                    quickJournalMode === 'written' ? 'habit-quick-journal__type-button--active' : ''
                  }`}
                  onClick={() => setQuickJournalMode('written')}
                >
                  ✍️ Written
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={quickJournalMode === 'pulse'}
                  className={`habit-quick-journal__type-button ${
                    quickJournalMode === 'pulse' ? 'habit-quick-journal__type-button--active' : ''
                  }`}
                  onClick={() => setQuickJournalMode('pulse')}
                >
                  🎛️ Pulse check-in
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={quickJournalMode === 'dream'}
                  className={`habit-quick-journal__type-button ${
                    quickJournalMode === 'dream' ? 'habit-quick-journal__type-button--active' : ''
                  }`}
                  onClick={() => setQuickJournalMode('dream')}
                >
                  🌙 Dream journal
                </button>
              </div>
              {!isQuickJournalOpen ? (
                <button
                  type="button"
                  className="habit-quick-journal__button"
                  onClick={handleOpenQuickJournal}
                >
                  + Add journal entry
                </button>
              ) : (
                <div className="habit-quick-journal__sheet">
                  {quickJournalMode === 'pulse' ? (
                    <div className="habit-quick-journal__pulse">
                      <label className="habit-quick-journal__pulse-field">
                        <span className="habit-quick-journal__field-label">⚡️ Energy</span>
                        <div className="habit-quick-journal__pulse-row">
                          <input
                            type="range"
                            min={1}
                            max={10}
                            value={quickJournalEnergy}
                            onChange={(event) => setQuickJournalEnergy(Number(event.target.value))}
                          />
                          <span className="habit-quick-journal__pulse-value">{quickJournalEnergy}/10</span>
                        </div>
                      </label>
                      <label className="habit-quick-journal__pulse-field">
                        <span className="habit-quick-journal__field-label">😊 Mood</span>
                        <div className="habit-quick-journal__pulse-row">
                          <input
                            type="range"
                            min={1}
                            max={10}
                            value={quickJournalMood}
                            onChange={(event) => setQuickJournalMood(Number(event.target.value))}
                          />
                          <span className="habit-quick-journal__pulse-value">{quickJournalMood}/10</span>
                        </div>
                      </label>
                      <label className="habit-quick-journal__pulse-field">
                        <span className="habit-quick-journal__field-label">🎯 Focus</span>
                        <div className="habit-quick-journal__pulse-row">
                          <input
                            type="range"
                            min={1}
                            max={10}
                            value={quickJournalFocus}
                            onChange={(event) => setQuickJournalFocus(Number(event.target.value))}
                          />
                          <span className="habit-quick-journal__pulse-value">{quickJournalFocus}/10</span>
                        </div>
                      </label>
                      <label className="habit-quick-journal__pulse-field">
                        <span className="habit-quick-journal__field-label">🧘 Stress</span>
                        <div className="habit-quick-journal__pulse-row">
                          <input
                            type="range"
                            min={1}
                            max={10}
                            value={quickJournalStress}
                            onChange={(event) => setQuickJournalStress(Number(event.target.value))}
                          />
                          <span className="habit-quick-journal__pulse-value">{quickJournalStress}/10</span>
                        </div>
                      </label>
                    </div>
                  ) : quickJournalMode === 'written' ? (
                    <>
                      <label className="habit-quick-journal__field habit-quick-journal__field--morning">
                        <span className="habit-quick-journal__field-label">🌅 Morning</span>
                        <textarea
                          rows={3}
                          value={quickJournalMorning}
                          onChange={(event) => setQuickJournalMorning(event.target.value)}
                          placeholder="How did you start your day?"
                        />
                      </label>

                      <label className="habit-quick-journal__field habit-quick-journal__field--day">
                        <span className="habit-quick-journal__field-label">☀️ Day</span>
                        <textarea
                          rows={3}
                          value={quickJournalDay}
                          onChange={(event) => setQuickJournalDay(event.target.value)}
                          placeholder="What happened during the day?"
                        />
                      </label>

                      <label className="habit-quick-journal__field habit-quick-journal__field--evening">
                        <span className="habit-quick-journal__field-label">🌙 Evening</span>
                        <textarea
                          rows={3}
                          value={quickJournalEvening}
                          onChange={(event) => setQuickJournalEvening(event.target.value)}
                          placeholder="How did you wind down?"
                        />
                      </label>

                      <label className="habit-quick-journal__field">
                        <span className="habit-quick-journal__field-label">👥 Who did I interact with?</span>
                        <textarea
                          rows={2}
                          value={quickJournalInteractions}
                          onChange={(event) => setQuickJournalInteractions(event.target.value)}
                          placeholder="People you spent time with or talked to..."
                        />
                      </label>

                      <label className="habit-quick-journal__field">
                        <span className="habit-quick-journal__field-label">📝 Additional notes</span>
                        <textarea
                          rows={3}
                          value={quickJournalFreeform}
                          onChange={(event) => setQuickJournalFreeform(event.target.value)}
                          placeholder="What stood out about this day?"
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <label className="habit-quick-journal__field">
                        <span className="habit-quick-journal__field-label">🌙 Dream title</span>
                        <textarea
                          rows={2}
                          value={quickDreamTitle}
                          onChange={(event) => setQuickDreamTitle(event.target.value)}
                          placeholder="Give this dream a short title..."
                        />
                      </label>

                      <label className="habit-quick-journal__field">
                        <span className="habit-quick-journal__field-label">🔮 Symbols or scenes</span>
                        <textarea
                          rows={3}
                          value={quickDreamSymbols}
                          onChange={(event) => setQuickDreamSymbols(event.target.value)}
                          placeholder="What images, places, or moments stood out?"
                        />
                      </label>

                      <label className="habit-quick-journal__field">
                        <span className="habit-quick-journal__field-label">💭 Emotions</span>
                        <textarea
                          rows={2}
                          value={quickDreamEmotions}
                          onChange={(event) => setQuickDreamEmotions(event.target.value)}
                          placeholder="How did the dream feel?"
                        />
                      </label>

                      <label className="habit-quick-journal__field">
                        <span className="habit-quick-journal__field-label">🧠 Reflection</span>
                        <textarea
                          rows={3}
                          value={quickDreamReflection}
                          onChange={(event) => setQuickDreamReflection(event.target.value)}
                          placeholder="Any meaning, patterns, or insights to remember?"
                        />
                      </label>
                    </>
                  )}
                  
                  {quickJournalError ? (
                    <p className="habit-quick-journal__status habit-quick-journal__status--error">
                      {quickJournalError}
                    </p>
                  ) : null}
                  <div className="habit-quick-journal__actions">
                    <button
                      type="button"
                      className="habit-quick-journal__save"
                      onClick={handleSaveQuickJournalDraft}
                      disabled={quickJournalSaving}
                    >
                      Save draft
                    </button>
                    <button
                      type="button"
                      className="habit-quick-journal__save"
                      onClick={() => void handleSubmitQuickJournal()}
                      disabled={quickJournalSaving}
                    >
                      {quickJournalSaving ? 'Submitting…' : 'Submit journal'}
                    </button>
                    <button
                      type="button"
                      className="habit-quick-journal__cancel"
                      onClick={() => {
                        removeDraft(quickJournalDraftKey(session.user.id, activeDate));
                        setIsQuickJournalOpen(false);
                        setQuickJournalMode('written');
                        setQuickJournalMorning('');
                        setQuickJournalDay('');
                        setQuickJournalEvening('');
                        setQuickJournalInteractions('');
                        setQuickJournalFreeform('');
                        setQuickJournalEnergy(QUICK_JOURNAL_PULSE_DEFAULTS.energy);
                        setQuickJournalMood(QUICK_JOURNAL_PULSE_DEFAULTS.mood);
                        setQuickJournalFocus(QUICK_JOURNAL_PULSE_DEFAULTS.focus);
                        setQuickJournalStress(QUICK_JOURNAL_PULSE_DEFAULTS.stress);
                        setQuickDreamTitle(QUICK_JOURNAL_DREAM_DEFAULTS.title);
                        setQuickDreamSymbols(QUICK_JOURNAL_DREAM_DEFAULTS.symbols);
                        setQuickDreamEmotions(QUICK_JOURNAL_DREAM_DEFAULTS.emotions);
                        setQuickDreamReflection(QUICK_JOURNAL_DREAM_DEFAULTS.reflection);
                        setQuickJournalError(null);
                      }}
                      disabled={quickJournalSaving}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {quickJournalStatus ? (
                <p className="habit-quick-journal__status habit-quick-journal__status--success">
                  {quickJournalStatus}
                </p>
              ) : null}
            </div>

            {!isCompactView ? (
              <>
                <div className="habit-quick-journal habit-quick-journal--intentions" aria-live="polite">
                  <div className="habit-quick-journal__header">
                    <div>
                      <p className="habit-quick-journal__eyebrow">Plan for this day</p>
                      <h3 className="habit-quick-journal__title">Intentions & Todos</h3>
                    </div>
                    <div className="habit-quick-journal__meta">
                      <span className="habit-quick-journal__badge">{quickJournalDateLabel}</span>
                      {isViewingToday && clockEmoji ? (
                        <span className="habit-quick-journal__icon" aria-hidden="true">
                          {clockEmoji}
                        </span>
                      ) : null}
                      {isViewingToday && timeLabel ? (
                        <span className="sr-only">{timeLabel}</span>
                      ) : null}
                    </div>
                  </div>
                  <p className="habit-quick-journal__hint">
                    Set your intentions and list your key todos for the day ahead.
                  </p>
                  {!isIntentionsJournalOpen ? (
                    <div className="habit-quick-journal__button-group">
                      <button
                        type="button"
                        className="habit-quick-journal__button habit-quick-journal__button--half"
                        onClick={() => handleOpenIntentionsJournal('today')}
                      >
                        + Today's intentions
                      </button>
                      <button
                        type="button"
                        className="habit-quick-journal__button habit-quick-journal__button--half"
                        onClick={() => handleOpenIntentionsJournal('tomorrow')}
                      >
                        + Tomorrow's intentions
                      </button>
                    </div>
                  ) : (
                    <div className="habit-quick-journal__sheet">
                      <label className="habit-quick-journal__field">
                        <span className="habit-quick-journal__field-label">
                          {intentionsJournalType === 'tomorrow' ? "Tomorrow's Intentions" : "Today's Intentions"} ({intentionsJournalType === 'tomorrow' ? formatDateLabel(formatISODate(addDays(parseISODate(activeDate), 1))) : quickJournalDateLabel})
                        </span>
                        <textarea
                          rows={4}
                          value={intentionsJournalContent}
                          onChange={(event) => setIntentionsJournalContent(event.target.value)}
                          placeholder={intentionsJournalType === 'tomorrow' ? "What do you intend to accomplish tomorrow? What's most important?" : "What do you intend to accomplish today? What's most important?"}
                        />
                      </label>
                      {intentionsJournalError ? (
                        <p className="habit-quick-journal__status habit-quick-journal__status--error">
                          {intentionsJournalError}
                        </p>
                      ) : null}
                      <div className="habit-quick-journal__actions">
                        <button
                          type="button"
                          className="habit-quick-journal__save"
                          onClick={() => void handleSaveIntentionsJournal()}
                          disabled={intentionsJournalSaving}
                        >
                          {intentionsJournalSaving ? 'Saving…' : 'Save entry'}
                        </button>
                        <button
                          type="button"
                      className="habit-quick-journal__cancel"
                      onClick={() => {
                        removeDraft(
                          intentionsJournalDraftKey(session.user.id, activeDate, intentionsJournalType),
                        );
                        removeDraft(legacyIntentionsJournalDraftKey(session.user.id, activeDate));
                        setIsIntentionsJournalOpen(false);
                        setIntentionsJournalContent('');
                        setIntentionsJournalError(null);
                          }}
                          disabled={intentionsJournalSaving}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {intentionsJournalStatus ? (
                    <p className="habit-quick-journal__status habit-quick-journal__status--success">
                      {intentionsJournalStatus}
                    </p>
                  ) : null}
                </div>

                <div className="habit-day-status" aria-live="polite">
                  <div className="habit-day-status__header">
                    <div>
                      <p className="habit-day-status__eyebrow">Busy day?</p>
                      <h3 className="habit-day-status__title">Log a skip, vacation, or sick day</h3>
                    </div>
                    <span className="habit-day-status__badge">
                      {skipStreakCount}/3 skips
                    </span>
                  </div>
                  <p className="habit-day-status__hint">
                    Use this when today is for travel or rest and you’re skipping habits and journals.
                  </p>
                  <div className="habit-day-status__actions">
                    <button
                      type="button"
                      className={`habit-day-status__button ${dayStatus === 'skip' ? 'habit-day-status__button--active' : ''}`}
                      onClick={() => handleDayStatusUpdate('skip')}
                      disabled={skipLimitReached}
                    >
                      {dayStatus === 'skip' ? 'Skipped today' : 'Skip today'}
                    </button>
                    <button
                      type="button"
                      className={`habit-day-status__button habit-day-status__button--sick ${
                        dayStatus === 'sick' ? 'habit-day-status__button--active' : ''
                      }`}
                      onClick={() => handleDayStatusUpdate('sick')}
                    >
                      {dayStatus === 'sick' ? 'Sick day' : 'Sick'}
                    </button>
                    <button
                      type="button"
                      className={`habit-day-status__button habit-day-status__button--secondary ${
                        dayStatus === 'vacation' ? 'habit-day-status__button--active' : ''
                      }`}
                      onClick={() => handleDayStatusUpdate('vacation')}
                    >
                      {dayStatus === 'vacation' ? 'Vacation day' : 'Vacation'}
                    </button>
                  </div>
                  {skipLimitReached ? (
                    <p className="habit-day-status__note">Max 3 skips in a row reached.</p>
                  ) : dayStatus ? (
                    <p className="habit-day-status__note">Logged: {dayStatus === 'skip' ? 'Skipped' : dayStatus === 'sick' ? 'Sick' : 'Vacation'}.</p>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className={`habit-checklist-card__status habit-checklist-card__status--${statusVariant}`}>
          <span className="habit-checklist-card__status-text">{statusText}</span>
          <button
            type="button"
            className="habit-checklist-card__refresh-inline"
            onClick={() => void refreshHabits()}
            disabled={loading || (!isConfigured && !isDemoExperience)}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {identitySignalsUnlocked && isIdentitySignalsOpen ? (
          <div className="identity-signals-sheet" role="dialog" aria-modal="true" aria-label="Identity signals details">
            <div
              className="identity-signals-sheet__backdrop"
              role="presentation"
              onClick={() => setIsIdentitySignalsOpen(false)}
            />
            <div className="identity-signals-sheet__card" role="document">
              <div className="identity-signals-sheet__header">
                <div>
                  <p className="identity-signals-sheet__eyebrow">Why these signals?</p>
                  <h3 className="identity-signals-sheet__title">Identity Signals keep your growth warm</h3>
                </div>
                <button
                  type="button"
                  className="identity-signals-sheet__close"
                  onClick={() => setIsIdentitySignalsOpen(false)}
                  aria-label="Close identity signals details"
                >
                  ×
                </button>
              </div>
              <div className="identity-signals-sheet__body">
                <p>
                  We wait until you log at least three days so the signals reflect real behavior, not a single burst.
                </p>
                <ul>
                  <li>Signals are built from habit completions, reflections, and quick check-ins.</li>
                  <li>They stay private unless you choose to share them.</li>
                  <li>We highlight only the most consistent patterns, not every blip.</li>
                </ul>
              </div>
              <div className="identity-signals-sheet__footer">
                <button
                  type="button"
                  className="identity-signals-sheet__button"
                  onClick={() => setIsIdentitySignalsOpen(false)}
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  // Helper function to extract and format life wheel domain info
  const getHabitDomainInfo = (habitSchedule: Json | null) => {
    const domainMeta = extractLifeWheelDomain(habitSchedule);
    const domainLabel = domainMeta ? formatLifeWheelDomainLabel(domainMeta) : null;
    const domainColor = getLifeWheelColor(domainMeta?.key ?? null);
    const displayLabel = domainLabel || 'Habit';
    
    return { domainMeta, domainLabel, domainColor, displayLabel };
  };

  // Helper function to create a minimal habit object for schedule checking
  const createHabitForSchedule = (habitId: string, habitName: string, habitSchedule: Json | null): HabitWithGoal => {
    return {
      id: habitId,
      name: habitName,
      frequency: 'daily', // Default, will be overridden by schedule
      schedule: habitSchedule,
    } as HabitWithGoal;
  };

  const renderMonthlyGrid = () => {
    if (monthDays.length === 0) {
      return null;
    }

    const completionPercent = monthlySummary.scheduledTotal
      ? Math.round((monthlySummary.scheduledComplete / monthlySummary.scheduledTotal) * 100)
      : 0;

    // Month switcher tabs
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const handleMonthChange = (monthIndex: number) => {
      setSelectedMonth(monthIndex);
      // Monthly stats will be loaded automatically by the useEffect that depends on selectedMonth
    };

    return (
      <div className="habit-monthly" aria-label="Monthly habit dashboard">
        {/* Month Switcher */}
        <div className="habit-monthly__month-switcher">
          <div className="habit-monthly__month-tabs" role="tablist" aria-label="Select month">
            {monthNames.map((monthName, index) => {
              const isActive = index === selectedMonth;
              const currentMonth = new Date().getMonth();
              const currentYear = new Date().getFullYear();
              const isCurrentMonth = index === currentMonth && selectedYear === currentYear;
              
              return (
                <button
                  key={monthName}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls="habit-monthly-grid"
                  className={`habit-monthly__month-tab ${isActive ? 'habit-monthly__month-tab--active' : ''} ${isCurrentMonth ? 'habit-monthly__month-tab--current' : ''}`}
                  onClick={() => handleMonthChange(index)}
                  disabled={loading}
                >
                  {monthName}
                </button>
              );
            })}
          </div>
        </div>

        <div id="habit-monthly-grid" role="tabpanel" aria-label={`Habit data for ${monthNames[selectedMonth]} ${selectedYear}`}>
          <div className="habit-monthly__summary">
            <div className="habit-monthly__summary-meter" role="img" aria-label={`Monthly completion ${completionPercent}%`}>
              <div
                className="habit-monthly__summary-meter-bar"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>

          {/* Monthly Statistics Section - showing per-habit completion percentages */}
          {sortedMonthlyHabits.length > 0 && (
            <div className="habit-monthly__stats" style={{ 
              margin: '1rem 0', 
              padding: '1rem', 
              background: '#f8f9fa', 
              borderRadius: '8px' 
            }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', fontWeight: 600 }}>
                Per-Habit Completion for {monthNames[selectedMonth]} {selectedYear}
              </h4>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {sortedMonthlyHabits.map((habitStat) => (
                  <div 
                    key={habitStat.habitId} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      fontSize: '0.8125rem',
                      padding: '0.5rem',
                      background: 'white',
                      borderRadius: '4px'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, marginBottom: '0.125rem' }}>
                        {habitStat.habitName}
                      </div>
                      {habitStat.goalTitle && (
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          Goal: {habitStat.goalTitle}
                        </div>
                      )}
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem',
                      marginLeft: '1rem'
                    }}>
                      <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                        {habitStat.completedDays}/{habitStat.totalDays} days
                      </span>
                      <span style={{ 
                        fontWeight: 600, 
                        minWidth: '3rem',
                        textAlign: 'right',
                        color: habitStat.completionPercentage >= 80 ? '#10b981' : 
                               habitStat.completionPercentage >= 50 ? '#f59e0b' : '#ef4444'
                      }}>
                        {habitStat.completionPercentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ 
                marginTop: '0.75rem', 
                paddingTop: '0.75rem', 
                borderTop: '1px solid #e5e7eb',
                fontSize: '0.8125rem',
                fontWeight: 600
              }}>
                Overall: {monthlyStats?.overallCompletionPercentage ?? 0}% completion rate
              </div>
            </div>
          )}

        <div className="habit-monthly__table-wrapper">
          <table className="habit-monthly__table">
            <thead>
              <tr>
                <th className="habit-monthly__habit-column" scope="col">
                  Life wheel habit
                </th>
                {monthDays.map((dateIso) => (
                  <th key={dateIso} scope="col" className="habit-monthly__day-column">
                    <span className="habit-monthly__day-number">{formatDayOfMonth(dateIso)}</span>
                    <span className="habit-monthly__day-name">{formatDayOfWeekShort(dateIso)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Use monthlyStats.habits for the monthly grid if available (from habits_v2) */}
              {sortedMonthlyHabits.map((habitStat) => {
                const habitCompletionGrid = monthlyCompletionsV2[habitStat.habitId] ?? {};
                
                // Extract scheduling info if available
                const habitSchedule = habitStat.schedule ?? null;
                const { domainColor, displayLabel } = getHabitDomainInfo(habitSchedule);

                return (
                  <tr key={habitStat.habitId} className="habit-monthly__row" style={{ borderLeftColor: domainColor }}>
                    <th scope="row" className="habit-monthly__habit-cell">
                      <div className="habit-monthly__habit">
                        <span className="habit-monthly__domain" style={{ backgroundColor: domainColor }}>
                          {displayLabel}
                        </span>
                        <div className="habit-monthly__habit-details">
                          <span className="habit-monthly__habit-name">
                            {habitStat.emoji ? `${habitStat.emoji} ` : ''}{habitStat.habitName}
                          </span>
                          <span className="habit-monthly__habit-goal">
                            {habitStat.goalTitle ? `Goal: ${habitStat.goalTitle}` : 'No goal assigned'}
                          </span>
                        </div>
                      </div>
                    </th>
                    {monthDays.map((dateIso) => {
                      const cellKey = `${habitStat.habitId}:${dateIso}`;
                      const isCompleted = Boolean(habitCompletionGrid[dateIso]);
                      const isToday = dateIso === activeDate;
                      const isSavingCell = Boolean(monthlySaving[cellKey]);
                      const dayLabel = formatDateLabel(dateIso);
                      
                      // Check if habit is scheduled for this date
                      const habitForSchedule = createHabitForSchedule(habitStat.habitId, habitStat.habitName, habitSchedule);
                      const scheduled = isHabitScheduledOnDate(habitForSchedule, dateIso);

                      const cellClassNames = ['habit-monthly__cell'];
                      if (scheduled) {
                        cellClassNames.push('habit-monthly__cell--scheduled');
                      } else {
                        cellClassNames.push('habit-monthly__cell--rest');
                      }
                      if (isCompleted) {
                        cellClassNames.push('habit-monthly__cell--completed');
                      }
                      if (isToday) {
                        cellClassNames.push('habit-monthly__cell--today');
                      }
                      if (isSavingCell) {
                        cellClassNames.push('habit-monthly__cell--saving');
                      }

                      return (
                        <td key={cellKey} className={cellClassNames.join(' ')}>
                          <button
                            type="button"
                            className={`habit-monthly__toggle ${isCompleted ? 'habit-monthly__toggle--checked' : ''}`}
                            aria-pressed={isCompleted}
                            aria-label={`${isCompleted ? 'Uncheck' : 'Check'} ${habitStat.habitName} for ${dayLabel}`}
                            onClick={() => void toggleMonthlyHabitForDate(habitStat.habitId, habitStat.habitName, dateIso)}
                            disabled={(!scheduled && !isCompleted) || isSavingCell}
                            title={scheduled ? dayLabel : `${dayLabel} (rest day)`}
                          >
                            {isSavingCell ? '…' : isCompleted ? '✓' : ''}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile-optimized card view - shown only on mobile */}
        <div className="habit-monthly__mobile-view">
          {sortedMonthlyHabits.length === 0 ? (
            <div className="habit-monthly__mobile-empty">
              <h3>No habits scheduled</h3>
              <p>Add habits to your goals to see them tracked here month by month.</p>
            </div>
          ) : (
            sortedMonthlyHabits.map((habitStat) => {
              const habitCompletionGrid = monthlyCompletionsV2[habitStat.habitId] ?? {};
              const habitSchedule = habitStat.schedule ?? null;
              const { domainColor, displayLabel } = getHabitDomainInfo(habitSchedule);

              // Calculate completion percentage
              const completedDays = Object.values(habitCompletionGrid).filter(Boolean).length;
              const totalDays = monthDays.length;
              const completionPercent = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

              return (
                <div 
                  key={habitStat.habitId} 
                  className="habit-monthly__mobile-card"
                  style={{ borderLeftColor: domainColor }}
                >
                  <div className="habit-monthly__mobile-header">
                    <span className="habit-monthly__mobile-domain" style={{ backgroundColor: domainColor }}>
                      {displayLabel}
                    </span>
                    <div className="habit-monthly__mobile-info">
                      <h3 className="habit-monthly__mobile-name">
                        {habitStat.emoji ? `${habitStat.emoji} ` : ''}{habitStat.habitName}
                      </h3>
                      <p className="habit-monthly__mobile-goal">
                        {habitStat.goalTitle ? `Goal: ${habitStat.goalTitle}` : 'No goal assigned'}
                      </p>
                    </div>
                  </div>

                  <div className="habit-monthly__mobile-days">
                    {monthDays.map((dateIso) => {
                      const cellKey = `${habitStat.habitId}:${dateIso}`;
                      const isCompleted = Boolean(habitCompletionGrid[dateIso]);
                      const isToday = dateIso === activeDate;
                      const isSavingCell = Boolean(monthlySaving[cellKey]);
                      const dayLabel = formatDateLabel(dateIso);
                      
                      const habitForSchedule = createHabitForSchedule(habitStat.habitId, habitStat.habitName, habitSchedule);
                      const scheduled = isHabitScheduledOnDate(habitForSchedule, dateIso);

                      const dayClassNames = ['habit-monthly__mobile-day'];
                      if (scheduled) {
                        dayClassNames.push('habit-monthly__mobile-day--scheduled');
                      } else {
                        dayClassNames.push('habit-monthly__mobile-day--rest');
                      }
                      if (isCompleted) {
                        dayClassNames.push('habit-monthly__mobile-day--completed');
                      }
                      if (isToday) {
                        dayClassNames.push('habit-monthly__mobile-day--today');
                      }

                      return (
                        <div key={dateIso} className={dayClassNames.join(' ')}>
                          <span className="habit-monthly__mobile-day-num">{formatDayOfMonth(dateIso)}</span>
                          <span className="habit-monthly__mobile-day-name">{formatDayOfWeekShort(dateIso)}</span>
                          <button
                            type="button"
                            className={`habit-monthly__mobile-toggle ${isCompleted ? 'habit-monthly__mobile-toggle--checked' : ''}`}
                            aria-pressed={isCompleted}
                            aria-label={`${isCompleted ? 'Uncheck' : 'Check'} ${habitStat.habitName} for ${dayLabel}`}
                            onClick={() => void toggleMonthlyHabitForDate(habitStat.habitId, habitStat.habitName, dateIso)}
                            disabled={(!scheduled && !isCompleted) || isSavingCell}
                          >
                            {isSavingCell ? '…' : isCompleted ? '✓' : ''}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="habit-monthly__mobile-summary">
                    <div className="habit-monthly__mobile-completion">
                      <span>{completedDays} of {totalDays} days</span>
                    </div>
                    <span 
                      className={`habit-monthly__mobile-percentage ${
                        completionPercent >= 80 ? 'habit-monthly__mobile-percentage--high' : 
                        completionPercent >= 50 ? 'habit-monthly__mobile-percentage--medium' : 
                        'habit-monthly__mobile-percentage--low'
                      }`}
                    >
                      {completionPercent}%
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
        </div>
      </div>
    );
  };

  const alertConfigModal = alertConfigHabit ? (
    <div className="habit-alert-modal-overlay" onClick={() => setAlertConfigHabit(null)}>
      <div className="habit-alert-modal-content" onClick={(e) => e.stopPropagation()}>
        <HabitAlertConfig
          habitId={alertConfigHabit.id}
          habitName={alertConfigHabit.name}
          onClose={() => setAlertConfigHabit(null)}
        />
      </div>
    </div>
  ) : null;

  const editHabitModalContent = editHabit ? (
    <div className="habit-edit-modal-overlay" onClick={handleCloseEdit}>
      <div className="habit-edit-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="habit-edit-modal__header">
          <div>
            <p className="habit-edit-modal__eyebrow">Edit habit focus</p>
            <h3>{editTitle.trim() || editHabit.name}</h3>
          </div>
          <button
            type="button"
            className="habit-edit-modal__close"
            onClick={handleCloseEdit}
            aria-label="Close habit edit"
          >
            ×
          </button>
        </div>

        <div className="habit-edit-modal__body">
          <label className="habit-edit-modal__label" htmlFor="habit-title-input">
            Habit title
          </label>
          <input
            id="habit-title-input"
            className="habit-edit-modal__input"
            type="text"
            value={editTitle}
            onChange={(event) => setEditTitle(event.target.value)}
            placeholder="Name your habit"
          />

          <label className="habit-edit-modal__label" htmlFor="habit-notes-input">
            Notes
          </label>
          <textarea
            id="habit-notes-input"
            className="habit-edit-modal__textarea"
            value={editNotes}
            onChange={(event) => setEditNotes(event.target.value)}
            placeholder="Add details, motivation, or reminders"
            rows={4}
          />

          <label className="habit-edit-modal__label" htmlFor="habit-life-wheel-select">
            Life wheel area
          </label>
          <select
            id="habit-life-wheel-select"
            className="habit-edit-modal__select"
            value={editLifeWheelKey}
            onChange={(event) => setEditLifeWheelKey(event.target.value)}
          >
            <option value={LIFE_WHEEL_UNASSIGNED}>Unassigned</option>
            {LIFE_WHEEL_CATEGORIES.map((category) => (
              <option key={category.key} value={category.key}>
                {category.label}
              </option>
            ))}
          </select>

          <div className="habit-edit-modal__section">
            <label className="habit-edit-modal__label" htmlFor="habit-goal-select">
              Attach to a goal
            </label>
            {goalsLoading ? (
              <p className="habit-edit-modal__hint">Loading goals…</p>
            ) : (
              <>
                <select
                  id="habit-goal-select"
                  className="habit-edit-modal__select"
                  value={editGoalId}
                  onChange={(event) => setEditGoalId(event.target.value)}
                >
                  <option value={GOAL_UNASSIGNED}>No goal</option>
                  {goals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.title || 'Untitled goal'}
                    </option>
                  ))}
                </select>
                {goals.length === 0 ? (
                  <p className="habit-edit-modal__hint">
                    No goals yet. Create one to link this habit.
                  </p>
                ) : null}
              </>
            )}
            <button
              type="button"
              className="habit-edit-modal__btn habit-edit-modal__btn--secondary"
              onClick={handleCreateGoalFromHabit}
              disabled={creatingGoal}
            >
              {creatingGoal ? 'Creating…' : '➕ Start a new goal from this habit'}
            </button>
          </div>

          {editError ? <p className="habit-edit-modal__error">{editError}</p> : null}
        </div>

        <div className="habit-edit-modal__footer">
          <button
            type="button"
            className="habit-edit-modal__btn habit-edit-modal__btn--ghost"
            onClick={handleCloseEdit}
          >
            Cancel
          </button>
          <button
            type="button"
            className="habit-edit-modal__btn habit-edit-modal__btn--primary"
            onClick={() => void handleSaveEdit()}
            disabled={editSaving}
          >
            {editSaving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const editHabitModal = editHabitModalContent
    ? modalRoot
      ? createPortal(editHabitModalContent, modalRoot)
      : editHabitModalContent
    : null;

  const offerTeaserPortal = offerTeaserModal
    ? modalRoot
      ? createPortal(offerTeaserModal, modalRoot)
      : offerTeaserModal
    : null;

  const todaysOfferPortal = todaysOfferModal
    ? modalRoot
      ? createPortal(todaysOfferModal, modalRoot)
      : todaysOfferModal
    : null;

  if (isCompact) {
    return (
      <section className="habit-tracker habit-tracker--compact">
        {renderCompactExperience()}
        {offerTeaserPortal}
        {todaysOfferPortal}
        {weeklyHabitReviewModal}
        {visionRewardModal}
        {visionVisualizationModal}
        {habitVisionPreviewModal}
        {alertConfigModal}
        {editHabitModal}
        {todayPauseDialogHabit ? (
          <HabitPauseDialog
            open
            habitTitle={todayPauseDialogHabit.name}
            saving={lifecycleActionHabitIds.has(todayPauseDialogHabit.id)}
            onClose={() => {
              if (lifecycleActionHabitIds.has(todayPauseDialogHabit.id)) {
                return;
              }
              setTodayPauseDialogHabit(null);
            }}
            onConfirm={async ({ reason, resumeOn }) => {
              await handleTodayLifecycleAction(todayPauseDialogHabit, 'pause', {
                reason: reason ?? 'today_screen_pause',
                resumeOn: resumeOn ?? null,
              });
            }}
          />
        ) : null}
        {/* Celebration animation for habit completion */}
        {showCelebration && (
          <CelebrationAnimation
            type={celebrationType}
            xpAmount={celebrationXP}
            targetElement="game-icon"
            origin={celebrationOrigin}
            onComplete={() => {
              setShowCelebration(false);
              setCelebrationOrigin(null);
              if (celebrationType === 'levelup') {
                dismissLevelUpEvent?.();
              }
            }}
          />
        )}
      </section>
    );
  }

  return (
    <section className="habit-tracker">
      <header className="habit-tracker__header">
        <div className="habit-tracker__actions">
          <button
            type="button"
            className="habit-tracker__refresh"
            onClick={() => void refreshHabits()}
            disabled={loading || (!isConfigured && !isDemoExperience)}
          >
            {loading ? 'Refreshing…' : 'Refresh habits'}
          </button>
          <button
            type="button"
            className="habit-tracker__legacy-toggle"
            onClick={() => setShowLegacyHabitAssets(true)}
          >
            Legacy habit assets
          </button>
        </div>
      </header>

      {isDemoExperience ? (
        <p className="habit-tracker__status habit-tracker__status--info">
          Habit progress updates are stored locally in demo mode. Connect Supabase to sync completions across devices.
        </p>
      ) : !isConfigured ? (
        <p className="habit-tracker__status habit-tracker__status--warning">
          Connect your Supabase credentials to sync habits and log completions across devices.
        </p>
      ) : null}

      {isConfigured && queueStatus.pending > 0 ? (
        <p className={`habit-tracker__status ${queueStatus.failed > 0 ? 'habit-tracker__status--warning' : 'habit-tracker__status--info'}`}>
          {queueStatus.failed > 0
            ? `${QUEUE_RETRY_MESSAGE} ${queueStatus.pending} update${queueStatus.pending === 1 ? '' : 's'} pending.`
            : `${OFFLINE_SYNC_MESSAGE} ${queueStatus.pending} update${queueStatus.pending === 1 ? '' : 's'} pending.`}
        </p>
      ) : null}

      {errorMessage ? <p className="habit-tracker__status habit-tracker__status--error">{errorMessage}</p> : null}

      {habits.length === 0 ? (
        <div className="habit-tracker__empty">
          <h3>No habits scheduled for this day</h3>
          <p>
            Once you add habits to your goals, they will appear here so you can check in daily and keep your streak alive.
          </p>
        </div>
      ) : (
        <>
          {renderDayNavigation('full')}
          <ul className="habit-tracker__list">
            {sortedHabits.map((habit) => {
              const state = completions[habit.id];
              const isCompleted = Boolean(state?.completed);
              const isSaving = Boolean(saving[habit.id]);
              const insight = habitInsights[habit.id];
              const scheduledToday = insight?.scheduledToday ?? isHabitScheduledOnDate(habit, activeDate);
              const currentStreak = insight?.currentStreak ?? (isCompleted ? 1 : 0);
              const longestStreak = insight?.longestStreak ?? Math.max(currentStreak, 0);
              const lastCompletedOn = insight?.lastCompletedOn ?? (isCompleted ? activeDate : null);
              const statusText = scheduledToday
                ? isCompleted
                  ? 'Completed for this day. Keep the streak going!'
                  : 'Tap the toggle when you finish this habit for the selected day.'
                : 'This is a rest day for this habit.';
              const lastCompletedText = formatLastCompleted(lastCompletedOn, activeDate);
              const streakSquares = Array.from({ length: 8 }, (_, index) => index < currentStreak);
              const successSnapshot = weightedSuccessByHabit[habit.id];
              const weightedSuccessPercent = successSnapshot?.weightedPercentage ?? 0;
              const doneIshDays = successSnapshot?.doneIshCount ?? 0;
              const scheduledDays = successSnapshot?.scheduledCount ?? 0;
              const isJustCompleted = justCompletedHabitId === habit.id;
              const feedbackClassName = isJustCompleted ? getHabitFeedbackClassName(habitFeedbackById[habit.id] ?? 'quick-win') : '';
              return (
                <li key={habit.id} className={`habit-card ${isCompleted ? 'habit-card--completed' : ''} ${isJustCompleted ? `habit-item--just-completed ${feedbackClassName}` : ''}`}>
                  {shouldShowHabitPoints ? (
                    <PointsBadge
                      value={habitGoldLabel}
                      className="points-badge--corner habit-points-badge"
                      size="mini"
                    />
                  ) : null}
                  <div className="habit-card__content">
                    <div className="habit-card__details">
                      <h3>{habit.name}</h3>
                      <p className="habit-card__meta-line">
                        <span className="habit-card__goal">
                          Goal: <span>{habit.goal?.title ?? 'Unassigned goal'}</span>
                        </span>
                        <span className="habit-card__meta-divider">•</span>
                        <span className="habit-card__meta">{formatHabitMeta(habit.frequency, habit.schedule)}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      className={`habit-card__toggle ${isCompleted ? 'habit-card__toggle--active' : ''}`}
                      onClick={(event) => void toggleHabit(habit, event.currentTarget)}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving…' : isCompleted ? 'Mark incomplete' : 'Mark complete'}
                    </button>
                  </div>
                  <footer className="habit-card__footer">
                    <div className="habit-card__stats-row">
                      <div className="habit-card__streaks">
                        <div className="habit-card__streak habit-card__streak--current">
                          <span className="habit-card__streak-label">Current</span>
                          <span className="habit-card__streak-value">{formatStreakValue(currentStreak)}</span>
                        </div>
                        <div className="habit-card__streak habit-card__streak--longest">
                          <span className="habit-card__streak-label">Longest</span>
                          <span className="habit-card__streak-value">{formatStreakValue(longestStreak)}</span>
                        </div>
                      </div>
                      <div className="habit-card__chain" aria-label={`Current streak ${formatStreakValue(currentStreak)}`}>
                        <span className="habit-card__chain-label">Streak</span>
                        <div className="habit-card__chain-squares" aria-hidden="true">
                          {streakSquares.map((filled, index) => (
                            <span
                              key={`${habit.id}-streak-${index}`}
                              className={`habit-card__chain-square ${
                                filled ? 'habit-card__chain-square--filled' : ''
                              }`}
                            />
                          ))}
                        </div>
                        <span className="habit-card__chain-count">{currentStreak}d</span>
                      </div>
                    </div>
                    <p className={`habit-card__status ${scheduledToday ? '' : 'habit-card__status--rest'}`}>
                      {statusText}
                      {lastCompletedText ? ` ${lastCompletedText}` : ''}
                    </p>
                    <p className="habit-card__success-rate">
                      30-day weighted success: <strong>{weightedSuccessPercent}%</strong>
                      {' '}
                      <span>
                        ({successSnapshot ? `${doneIshDays} done-ish day${doneIshDays === 1 ? '' : 's'} out of ${scheduledDays} scheduled` : 'no schedule data'})
                      </span>
                    </p>
                  </footer>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {offerTeaserPortal}
      {todaysOfferPortal}
      {weeklyHabitReviewModal}
      {visionRewardModal}
      {visionVisualizationModal}
      {habitVisionPreviewModal}

      {showYesterdayRecap && (
        <div className="habit-recap-overlay" onClick={closeYesterdayRecap}>
          <div className="habit-recap-modal" onClick={(event) => event.stopPropagation()}>
            <header className="habit-recap-modal__header">
              <div>
                <p className="habit-recap-modal__eyebrow">Morning catch-up</p>
                <h3>Yesterday slipped by</h3>
                <p className="habit-recap-modal__subtitle">
                  Quickly mark {formatDateLabel(yesterdayISO)} habits or collect a recovery bonus.
                </p>
              </div>
              <button
                type="button"
                className="habit-recap-modal__close"
                onClick={closeYesterdayRecap}
                aria-label="Close yesterday recap prompt"
              >
                ×
              </button>
            </header>

            <div className="habit-recap-modal__content">
              <div className="habit-recap-modal__list-header">
                <h4>Habits scheduled yesterday</h4>
                <button
                  type="button"
                  className="habit-recap-modal__select-all"
                  onClick={() => {
                    setYesterdaySelections(
                      yesterdayHabits.reduce<Record<string, boolean>>((acc, habit) => {
                        acc[habit.id] = !allYesterdaySelected;
                        return acc;
                      }, {}),
                    );
                  }}
                >
                  {allYesterdaySelected ? 'Clear all' : 'Select all'}
                </button>
              </div>

              <ul className="habit-recap-modal__list">
                {yesterdayHabits.map((habit) => (
                  <li key={habit.id} className="habit-recap-modal__item">
                    <label className="habit-recap-modal__item-label">
                      <input
                        type="checkbox"
                        checked={Boolean(yesterdaySelections[habit.id])}
                        onChange={() => handleYesterdayToggle(habit.id)}
                      />
                      <span className="habit-recap-modal__item-title">{habit.name}</span>
                      <span className="habit-recap-modal__item-meta">
                        {formatHabitMeta(habit.frequency, habit.schedule)}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>

              {yesterdayActionStatus && (
                <p className="habit-recap-modal__status" role="status">
                  {yesterdayActionStatus}
                </p>
              )}
            </div>

            <footer className="habit-recap-modal__footer">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={closeYesterdayRecap}
              >
                Not now
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={handleCollectBonus}
                disabled={yesterdayCollecting || !gamificationEnabled}
              >
                {yesterdayCollecting ? 'Collecting…' : 'Collect +50 XP & 1 spin'}
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleApplyYesterday}
                disabled={yesterdaySaving || yesterdaySelectedCount === 0}
              >
                {yesterdaySaving ? 'Saving…' : yesterdayMarkLabel}
              </button>
            </footer>
          </div>
        </div>
      )}

      {alertConfigModal}
      {editHabitModal}

      {showLegacyHabitAssets && (
        <div className="habit-legacy-modal-overlay" onClick={() => setShowLegacyHabitAssets(false)}>
          <div className="habit-legacy-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="habit-legacy-modal-header">
              <h3>Legacy habit assets</h3>
              <button
                type="button"
                className="habit-legacy-modal-close"
                onClick={() => setShowLegacyHabitAssets(false)}
                aria-label="Close legacy habit assets"
              >
                ×
              </button>
            </div>
            {renderMonthlyGrid()}
          </div>
        </div>
      )}

      {todayPauseDialogHabit ? (
        <HabitPauseDialog
          open
          habitTitle={todayPauseDialogHabit.name}
          saving={lifecycleActionHabitIds.has(todayPauseDialogHabit.id)}
          onClose={() => {
            if (lifecycleActionHabitIds.has(todayPauseDialogHabit.id)) {
              return;
            }
            setTodayPauseDialogHabit(null);
          }}
          onConfirm={async ({ reason, resumeOn }) => {
            await handleTodayLifecycleAction(todayPauseDialogHabit, 'pause', {
              reason: reason ?? 'today_screen_pause',
              resumeOn: resumeOn ?? null,
            });
          }}
        />
      ) : null}

      {/* Celebration animation for habit completion */}
      {showCelebration && (
        <CelebrationAnimation
          type={celebrationType}
          xpAmount={celebrationXP}
          targetElement="game-icon"
          origin={celebrationOrigin}
          onComplete={() => {
            setShowCelebration(false);
            setCelebrationOrigin(null);
            if (celebrationType === 'levelup') {
              dismissLevelUpEvent?.();
            }
          }}
        />
      )}
    </section>
  );
}

type LifeWheelDomainMeta = { key: string | null; label: string | null };

function extractLifeWheelDomain(schedule: Json | null): LifeWheelDomainMeta | null {
  if (!schedule || typeof schedule !== 'object') {
    return null;
  }

  const value = schedule as Record<string, Json>;
  const domain = value.life_wheel_domain;

  if (!domain) {
    return null;
  }

  if (typeof domain === 'string') {
    return { key: domain, label: null };
  }

  if (typeof domain === 'object' && domain !== null) {
    const domainValue = domain as Record<string, Json>;
    const key = typeof domainValue.key === 'string' ? (domainValue.key as string) : null;
    const label = typeof domainValue.label === 'string' ? (domainValue.label as string) : null;
    if (key || label) {
      return { key, label };
    }
  }

  return null;
}

function normalizeLifeWheelKey(domainKey: string | null): string | null {
  if (!domainKey) {
    return null;
  }

  return domainKey
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function getLifeWheelColor(domainKey: string | null): string {
  const normalized = normalizeLifeWheelKey(domainKey);
  if (!normalized) {
    return '#94a3b8';
  }
  return LIFE_WHEEL_COLORS[normalized] ?? '#94a3b8';
}

function formatLifeWheelDomainLabel(domain: LifeWheelDomainMeta): string | null {
  if (domain.label) {
    return domain.label;
  }

  if (domain.key) {
    return domain.key
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  return null;
}

function extractHabitNotes(schedule: Json | null): string {
  if (!schedule || typeof schedule !== 'object' || Array.isArray(schedule)) {
    return '';
  }

  const value = schedule as Record<string, Json>;
  return typeof value.notes === 'string' ? value.notes : '';
}

function buildScheduleWithLifeWheel(schedule: Json | null, lifeWheelKey: string | null): Json | null {
  if (!lifeWheelKey && (!schedule || typeof schedule !== 'object' || Array.isArray(schedule))) {
    return schedule;
  }

  const nextSchedule: Record<string, Json> =
    schedule && typeof schedule === 'object' && !Array.isArray(schedule)
      ? { ...(schedule as Record<string, Json>) }
      : {};

  if (lifeWheelKey) {
    const match = LIFE_WHEEL_CATEGORIES.find((category) => category.key === lifeWheelKey);
    nextSchedule.life_wheel_domain = {
      key: lifeWheelKey,
      label: match?.label ?? formatLifeWheelDomainLabel({ key: lifeWheelKey, label: null }),
    };
  } else {
    delete nextSchedule.life_wheel_domain;
  }

  if (Object.keys(nextSchedule).length === 0) {
    return null;
  }

  return nextSchedule;
}

function buildScheduleWithNotes(schedule: Json | null, notes: string): Json | null {
  const trimmedNotes = notes.trim();
  if (!trimmedNotes && (!schedule || typeof schedule !== 'object' || Array.isArray(schedule))) {
    return schedule;
  }

  const nextSchedule: Record<string, Json> =
    schedule && typeof schedule === 'object' && !Array.isArray(schedule)
      ? { ...(schedule as Record<string, Json>) }
      : {};

  if (trimmedNotes) {
    nextSchedule.notes = trimmedNotes;
  } else {
    delete nextSchedule.notes;
  }

  if (Object.keys(nextSchedule).length === 0) {
    return null;
  }

  return nextSchedule;
}

function formatHabitMeta(frequency: string, schedule: Json | null) {
  const details = deriveScheduleText(schedule);
  if (!details) {
    return frequency;
  }
  return `${frequency} • ${details}`;
}

function deriveScheduleText(schedule: Json | null): string | null {
  if (!schedule) return null;

  if (Array.isArray(schedule)) {
    return schedule.join(', ');
  }

  if (typeof schedule === 'object') {
    const value = schedule as Record<string, Json>;
    if (Array.isArray(value.days)) {
      return (value.days as Json[])
        .filter((item): item is string => typeof item === 'string')
        .map(capitalize)
        .join(', ');
    }

    if (typeof value.time === 'string') {
      return `at ${value.time}`;
    }
  }

  return null;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const DAY_NUMBER_FORMATTER = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
});

const DAY_SHORT_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
});

const COMPACT_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
});


function formatDayOfMonth(value: string) {
  return DAY_NUMBER_FORMATTER.format(parseISODate(value));
}

function formatDayOfWeekShort(value: string) {
  return DAY_SHORT_FORMATTER.format(parseISODate(value));
}

function getCircadianEmoji(date: Date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 10) return '🌅';
  if (hour >= 10 && hour < 16) return '☀️';
  if (hour >= 16 && hour < 20) return '🌇';
  return '🌙';
}

function getCircadianLabel(date: Date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 10) return 'Morning rhythm';
  if (hour >= 10 && hour < 16) return 'Daytime rhythm';
  if (hour >= 16 && hour < 20) return 'Evening rhythm';
  return 'Night rhythm';
}

function getClockEmoji(date: Date) {
  const hour = date.getHours() % 12;
  const icons = ['🕛', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚'];
  return icons[hour];
}

function formatTimeLabel(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatCompactDateLabel(value: string) {
  return COMPACT_DATE_FORMATTER.format(parseISODate(value));
}

function formatDateLabel(value: string) {
  const date = parseISODate(value);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getLocalDateKeyFromISO(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  return formatISODate(parsed);
}

function getSkipStreak(dateISO: string, statusMap: Record<string, DayStatus>) {
  let streak = 0;
  let cursor = parseISODate(dateISO);
  while (true) {
    const key = formatISODate(cursor);
    if (statusMap[key] !== 'skip') {
      break;
    }
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function generateDateRange(start: Date, end: Date): string[] {
  const days: string[] = [];
  const cursor = new Date(start.getTime());
  while (cursor <= end) {
    days.push(formatISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function addDays(date: Date, amount: number) {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function subtractDays(date: Date, amount: number) {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() - amount);
  return copy;
}

type ScheduleChecker = (date: Date) => boolean;

const WEEKDAY_TO_INDEX: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

function deriveFrequencyFromSchedule(schedule: Json | null): string {
  if (!schedule || typeof schedule !== 'object') {
    return 'daily';
  }

  const scheduleObj = schedule as Record<string, Json>;
  const mode = scheduleObj.mode;

  if (mode === 'daily') return 'daily';
  if (mode === 'specific_days') return 'weekly';
  if (mode === 'times_per_week') return 'weekly';
  if (mode === 'every_n_days') return 'custom';

  return 'daily';
}

function createScheduleChecker(frequency: string, schedule: Json | null): ScheduleChecker {
  if (schedule && Array.isArray(schedule)) {
    const indexes = schedule
      .map((item) => (typeof item === 'string' ? WEEKDAY_TO_INDEX[item.toLowerCase()] : undefined))
      .filter((value): value is number => typeof value === 'number');
    if (indexes.length > 0) {
      return (date) => indexes.includes(date.getDay());
    }
  }

  if (schedule && typeof schedule === 'object' && schedule !== null) {
    const value = schedule as Record<string, Json>;
    const type = typeof value.type === 'string' ? (value.type as string).toLowerCase() : '';
    if (type === 'weekly' && Array.isArray(value.days)) {
      const indexes = (value.days as Json[])
        .map((item) => (typeof item === 'string' ? WEEKDAY_TO_INDEX[item.toLowerCase()] : undefined))
        .filter((entry): entry is number => typeof entry === 'number');
      if (indexes.length > 0) {
        return (date) => indexes.includes(date.getDay());
      }
    }
    if (type === 'daily') {
      return () => true;
    }
  }

  if (typeof frequency === 'string' && frequency.toLowerCase().includes('weekly')) {
    return () => true;
  }

  return () => true;
}

function parseISODate(value: string): Date {
  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if ([year, month, day].some((part) => Number.isNaN(part))) {
    return new Date(value);
  }
  return new Date(year, month - 1, day);
}

function isHabitScheduledOnDate(habit: HabitWithGoal, dateISO: string): boolean {
  const date = parseISODate(dateISO);
  const scheduleChecker = createScheduleChecker(habit.frequency, habit.schedule);
  return scheduleChecker(date);
}

type HabitAdherenceSnapshot = {
  scheduledCount: number;
  completedCount: number;
  percentage: number;
};

type HabitSuccessSnapshot = {
  scheduledCount: number;
  weightedCredit: number;
  weightedPercentage: number;
  doneCount: number;
  doneIshCount: number;
  skippedCount: number;
  missedCount: number;
};

type StageMixSnapshot = {
  seedCount: number;
  minimumCount: number;
  standardCount: number;
  totalLogged: number;
  seedPercent: number;
  minimumPercent: number;
  standardPercent: number;
};

function calculateAdherenceSnapshots(
  habits: HabitWithGoal[],
  logs: HabitLogRow[],
  endDateISO: string,
  windowDays = 30,
): Record<string, HabitAdherenceSnapshot> {
  if (!habits.length || !endDateISO) {
    return {};
  }

  const endDate = parseISODate(endDateISO);
  const startDate = subtractDays(endDate, windowDays - 1);
  const startISO = formatISODate(startDate);

  const completionSets = new Map<string, Set<string>>();
  for (const log of logs) {
    if (!log.completed) continue;
    if (log.date < startISO || log.date > endDateISO) continue;
    let set = completionSets.get(log.habit_id);
    if (!set) {
      set = new Set<string>();
      completionSets.set(log.habit_id, set);
    }
    set.add(log.date);
  }

  const snapshots: Record<string, HabitAdherenceSnapshot> = {};
  for (const habit of habits) {
    const scheduleChecker = createScheduleChecker(habit.frequency, habit.schedule);
    let scheduledCount = 0;
    let completedCount = 0;
    for (let offset = 0; offset < windowDays; offset += 1) {
      const day = addDays(startDate, offset);
      if (day > endDate) {
        break;
      }
      if (!scheduleChecker(day)) {
        continue;
      }
      scheduledCount += 1;
      const isoDate = formatISODate(day);
      if (completionSets.get(habit.id)?.has(isoDate)) {
        completedCount += 1;
      }
    }

    const percentage = scheduledCount
      ? Math.round((completedCount / scheduledCount) * 100)
      : 0;
    snapshots[habit.id] = { scheduledCount, completedCount, percentage };
  }

  return snapshots;
}

function calculateWeightedSuccessSnapshots(
  habits: HabitWithGoal[],
  logs: HabitLogRow[],
  endDateISO: string,
  windowDays = 30,
): Record<string, HabitSuccessSnapshot> {
  if (!habits.length || !endDateISO) {
    return {};
  }

  const endDate = parseISODate(endDateISO);
  const startDate = subtractDays(endDate, windowDays - 1);
  const startISO = formatISODate(startDate);

  const stateByHabitDate = new Map<string, Map<string, { state: ProgressState; stageMultiplier: number }>>();
  for (const log of logs) {
    if (log.date < startISO || log.date > endDateISO) continue;

    const progressState = (log.progress_state as ProgressState | null) ?? (log.completed ? 'done' : 'missed');
    const loggedStage = (log.logged_stage as AutoProgressTier | null) ?? null;
    const stageMultiplier = getStageCreditMultiplier(loggedStage);
    let dayMap = stateByHabitDate.get(log.habit_id);
    if (!dayMap) {
      dayMap = new Map<string, { state: ProgressState; stageMultiplier: number }>();
      stateByHabitDate.set(log.habit_id, dayMap);
    }

    const existing = dayMap.get(log.date);
    const newCredit = PROGRESS_STATE_EFFECTS[progressState].streakCredit * stageMultiplier;
    const existingCredit = existing
      ? PROGRESS_STATE_EFFECTS[existing.state].streakCredit * existing.stageMultiplier
      : -1;
    if (!existing || newCredit > existingCredit) {
      dayMap.set(log.date, { state: progressState, stageMultiplier });
    }
  }

  const snapshots: Record<string, HabitSuccessSnapshot> = {};

  for (const habit of habits) {
    const scheduleChecker = createScheduleChecker(habit.frequency, habit.schedule);
    const dayMap = stateByHabitDate.get(habit.id) ?? new Map<string, { state: ProgressState; stageMultiplier: number }>();
    let scheduledCount = 0;
    let weightedCredit = 0;
    let doneCount = 0;
    let doneIshCount = 0;
    let skippedCount = 0;
    let missedCount = 0;

    for (let offset = 0; offset < windowDays; offset += 1) {
      const day = addDays(startDate, offset);
      if (day > endDate) {
        break;
      }
      if (!scheduleChecker(day)) {
        continue;
      }

      scheduledCount += 1;
      const isoDate = formatISODate(day);
      const record = dayMap.get(isoDate) ?? { state: 'missed' as ProgressState, stageMultiplier: 1 };
      const state = record.state;

      if (state === 'done') doneCount += 1;
      if (state === 'doneIsh') doneIshCount += 1;
      if (state === 'skipped') skippedCount += 1;
      if (state === 'missed') missedCount += 1;

      weightedCredit += PROGRESS_STATE_EFFECTS[state].streakCredit * record.stageMultiplier;
    }

    const weightedPercentage = scheduledCount
      ? Math.round((weightedCredit / scheduledCount) * 100)
      : 0;

    snapshots[habit.id] = {
      scheduledCount,
      weightedCredit,
      weightedPercentage,
      doneCount,
      doneIshCount,
      skippedCount,
      missedCount,
    };
  }

  return snapshots;
}

function calculateStageMixSnapshot(
  logs: HabitLogRow[],
  endDateISO: string,
  windowDays = 30,
): StageMixSnapshot {
  if (!logs.length || !endDateISO) {
    return {
      seedCount: 0,
      minimumCount: 0,
      standardCount: 0,
      totalLogged: 0,
      seedPercent: 0,
      minimumPercent: 0,
      standardPercent: 0,
    };
  }

  const endDate = parseISODate(endDateISO);
  const startDate = subtractDays(endDate, windowDays - 1);
  const startISO = formatISODate(startDate);

  let seedCount = 0;
  let minimumCount = 0;
  let standardCount = 0;

  for (const log of logs) {
    if (log.date < startISO || log.date > endDateISO) continue;
    const stage = (log.logged_stage as AutoProgressTier | null) ?? null;
    if (!stage) continue;
    if (stage === 'seed') seedCount += 1;
    if (stage === 'minimum') minimumCount += 1;
    if (stage === 'standard') standardCount += 1;
  }

  const totalLogged = seedCount + minimumCount + standardCount;
  return {
    seedCount,
    minimumCount,
    standardCount,
    totalLogged,
    seedPercent: totalLogged ? Math.round((seedCount / totalLogged) * 100) : 0,
    minimumPercent: totalLogged ? Math.round((minimumCount / totalLogged) * 100) : 0,
    standardPercent: totalLogged ? Math.round((standardCount / totalLogged) * 100) : 0,
  };
}

function calculateHabitInsights(
  habits: HabitWithGoal[],
  logs: HabitLogRow[],
  trackingDateISO: string,
): Record<string, HabitInsights> {
  if (habits.length === 0) {
    return {};
  }

  const todayDate = parseISODate(trackingDateISO);
  const lookbackStartDate = subtractDays(todayDate, STREAK_LOOKBACK_DAYS - 1);
  const lookbackStartISO = formatISODate(lookbackStartDate);

  const completionMaps = new Map<string, Map<string, ProgressState>>();
  const lastCompletedMap = new Map<string, string>();

  for (const log of logs) {
    if (log.date < lookbackStartISO || log.date > trackingDateISO) continue;

    const progressState = (log.progress_state as ProgressState | null) ?? (log.completed ? 'done' : 'missed');
    let dayMap = completionMaps.get(log.habit_id);
    if (!dayMap) {
      dayMap = new Map<string, ProgressState>();
      completionMaps.set(log.habit_id, dayMap);
    }

    const existing = dayMap.get(log.date);
    if (!existing || PROGRESS_STATE_EFFECTS[progressState].streakCredit > PROGRESS_STATE_EFFECTS[existing].streakCredit) {
      dayMap.set(log.date, progressState);
    }

    if (progressState === 'done' || progressState === 'doneIsh') {
      const currentLast = lastCompletedMap.get(log.habit_id);
      if (!currentLast || log.date > currentLast) {
        lastCompletedMap.set(log.habit_id, log.date);
      }
    }
  }

  const insights: Record<string, HabitInsights> = {};

  for (const habit of habits) {
    const scheduleChecker = createScheduleChecker(habit.frequency, habit.schedule);
    const scheduledToday = scheduleChecker(todayDate);
    const completionDates = completionMaps.get(habit.id) ?? new Map<string, ProgressState>();
    let currentStreak = 0;
    let longestStreak = 0;
    let runningStreak = 0;
    let withinCurrent = true;

    for (let offset = 0; offset < STREAK_LOOKBACK_DAYS; offset += 1) {
      const checkDate = subtractDays(todayDate, offset);
      if (checkDate < lookbackStartDate) {
        break;
      }
      if (!scheduleChecker(checkDate)) {
        continue;
      }

      const isoDate = formatISODate(checkDate);
      const progressState = completionDates.get(isoDate);
      if (!progressState || PROGRESS_STATE_EFFECTS[progressState].breaksStreak) {
        if (withinCurrent) {
          withinCurrent = false;
        }
        runningStreak = 0;
        continue;
      }

      runningStreak += PROGRESS_STATE_EFFECTS[progressState].streakCredit;
      if (withinCurrent) {
        currentStreak += PROGRESS_STATE_EFFECTS[progressState].streakCredit;
      }
      if (runningStreak > longestStreak) {
        longestStreak = runningStreak;
      }
    }

    insights[habit.id] = {
      scheduledToday,
      currentStreak: Math.floor(currentStreak),
      longestStreak: Math.floor(Math.max(longestStreak, currentStreak)),
      lastCompletedOn: lastCompletedMap.get(habit.id) ?? null,
    } satisfies HabitInsights;
  }

  return insights;
}

function formatStreakValue(value: number): string {
  const safeValue = Math.max(0, Math.round(value));
  const unit = safeValue === 1 ? 'day' : 'days';
  return `${safeValue} ${unit}`;
}

function differenceInDays(laterISO: string, earlierISO: string): number {
  const later = parseISODate(laterISO);
  const earlier = parseISODate(earlierISO);
  const diffMs = later.getTime() - earlier.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function formatLastCompleted(lastCompletedOn: string | null, referenceISO: string): string | null {
  if (!lastCompletedOn) {
    return null;
  }

  if (lastCompletedOn === referenceISO) {
    return 'Last completed today.';
  }

  const diff = differenceInDays(referenceISO, lastCompletedOn);
  if (diff === 1) {
    return 'Last completed yesterday.';
  }
  if (diff > 1 && diff <= 7) {
    return `Last completed ${diff} days ago.`;
  }

  const date = parseISODate(lastCompletedOn);
  return `Last completed on ${date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== parseISODate(referenceISO).getFullYear() ? 'numeric' : undefined,
  })}.`;
}
