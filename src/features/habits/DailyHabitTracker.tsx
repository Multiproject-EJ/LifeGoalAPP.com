import { useCallback, useEffect, useMemo, useRef, useState, useId, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { LIFE_WHEEL_CATEGORIES, type LifeWheelCategoryKey } from '../checkins/LifeWheelCheckins';
import type { ProfileStrengthSignalSnapshot } from '../profile-strength/profileStrengthData';
import type { ProfileStrengthResult } from '../profile-strength/profileStrengthTypes';
import { lockPageScroll } from '../../utils/scrollLock';
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
import type { ActiveAdventMetaResult } from '../../services/treatCalendarService';
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
import { fetchCompletedActionsForDate, insertAction } from '../../services/actions';
import { createTodayTodo, deleteTodayTodo, fetchTodayTodos, updateTodayTodo, type TodayTodo } from '../../services/todayTodos';
import {
  claimDailySpinHabitBonusOncePerDay,
  hasClaimedDailySpinHabitBonus,
  updateSpinsAvailable,
} from '../../services/dailySpin';
import { useDailySpinStatus } from '../../hooks/useDailySpinStatus';
import { isIslandRunFeatureEnabled } from '../../config/islandRunFeatureFlags';
import { fetchGoals, insertGoal } from '../../services/goals';
import { getHabitReminderQueueStatus, syncQueuedHabitReminderPrefs } from '../../services/habitReminderPrefs';
import {
  createHabitV2,
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
  buildDefaultAutoProgressState,
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
import { buildHabitCoachCard } from './habitCoach';
import {
  getDefaultHabitRewardGold,
  isEligibleTimeLimitedOfferHabit,
  rankHabitsForTimeLimitedOffer,
} from './timeLimitedOffer';
import {
  DEFAULT_HABIT_RHYTHM_DAYPART,
  buildScheduleWithHabitRhythm,
  extractHabitRhythm,
  getHabitRhythmBonusGold,
  getHabitRhythmEmoji,
  getHabitRhythmLabel,
  getHabitRhythmMultiplier,
  rankHabitsByRhythm,
} from './habitRhythm';
import { HabitImprovementAnalysisModal } from './HabitImprovementAnalysisModal';
import { HabitChainAnalysisModal } from './HabitChainAnalysisModal';
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
  getYesterdayRecapLastCollected,
  setYesterdayRecapLastCollected,
} from '../../services/yesterdayRecapPrefs';
import {
  getDreamJournalReminderEnabled,
  getDreamJournalReminderLastShownCycle,
  getDreamJournalReminderWindow,
  getDreamReminderCycleKey,
  isHourInDreamReminderWindow,
  setDreamJournalReminderLastShownCycle,
} from '../../services/dreamJournalReminderPrefs';
import {
  getTodaysWinsReminderCycleKey,
  getTodaysWinsReminderEnabled,
  getTodaysWinsReminderLastShownCycle,
  getTodaysWinsReminderWindow,
  isTimeInTodaysWinsReminderWindow,
  setTodaysWinsReminderLastShownCycle,
} from '../../services/todaysWinsReminderPrefs';
import { CelebrationAnimation } from '../../components/CelebrationAnimation';
import { fetchXPTransactions } from '../../services/gamification';
import { fetchZenTokenTransactions } from '../../services/zenGarden';
import { getRewardHistory } from '../../services/gameRewards';
import { awardDailyTreatDice } from '../../services/dailyTreats';
import { awardDailyWisdomTreeWatering } from '../../services/dailyTreeWatering';
import { createDicePackCheckoutSession } from '../../services/billing';
import {
  initiateMinigameTicketCheckout,
  resolveMinigameTicketSku,
} from '../../services/minigameTicketStore';
import { TimeBoundOfferRow, type EggHatchOfferId, type TimeBoundOfferItem, type TimeBoundOfferId } from './TimeBoundOfferRow';
import {
  buildDailyOfferClaimStorageKey,
  runDailyOfferClaim,
} from './dailyOfferClaim';
import { EVENT_IDS, type EventId } from '../gamification/level-worlds/services/islandRunEventEngine';
import { generateIslandStopPlan } from '../gamification/level-worlds/services/islandRunStops';
import { getUnresolvedEggSlotsForIsland } from '../gamification/level-worlds/services/islandRunEggMania';
import { useIslandRunState } from '../gamification/level-worlds/hooks/useIslandRunState';
import { refreshIslandRunStateFromLocal } from '../gamification/level-worlds/services/islandRunStateStore';
import { getPromiseVariant, isPromiseActionableToday } from '../gamification/promisePresentation';
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
  fetchActiveContracts,
  recordContractProgress,
  syncContractProgressWithTarget,
} from '../../services/commitmentContracts';
import './HabitAlertConfig.css';
import './HabitRecapPrompt.css';
import { HabitPauseDialog } from './HabitPauseDialog';
import { HabitInsightCaptureSheet } from './HabitInsightCaptureSheet';
import { recordHabitInsight, awardInsightCaptureDice } from '../../services/habitInsights';
import { RoutinesTodayLane, type RoutinesTodayLaneSummary } from '../routines';
import type { ArchetypeHand } from '../identity/archetypes/archetypeHandBuilder';
import { isPlayersHandSparkResultEnabled } from '../players_hand/playersHandFeatureFlags';
import { MyPlayerHandPanel } from '../players_hand/components/MyPlayerHandPanel';
import { TodayExpandableActionSection } from './TodayExpandableActionSection';
import {
  getQuestHabit,
  setQuestHabit,
  clearQuestHabit,
  refreshQuestHabit,
  type QuestHabit,
} from '../../services/questHabit';
import { LifeBuildTodayCard } from './LifeBuildTodayCard';
import { resolveFeatureAccess } from '../../services/featureAccess';
import { DEMO_FEATURE_LABEL, type FeatureAvailabilityId } from '../../config/featureAvailability';
import { DailyLifeUpgradeModal } from './daily-life-upgrade/DailyLifeUpgradeModal';
import { DailyLifeUpgradeAlternativeCreateModal } from './daily-life-upgrade/DailyLifeUpgradeAlternativeCreateModal';
import { useDailyLifeUpgradeFlow } from './daily-life-upgrade/useDailyLifeUpgradeFlow';
import { getTodoSwipeAction, getTodoSwipeArmedDirection, type TodoSwipeAction } from './todoSwipeHelpers';

// Constants
const DONE_ISH_DEFAULT_PERCENTAGE = 85;
const HABIT_SWIPE_MAX_PX = 132;
const HABIT_SWIPE_ARM_THRESHOLD_PX = 84;
const HABIT_SWIPE_SUPPRESS_CLICK_MS = 260;
const STALE_TODO_COACH_PILL_THRESHOLD_MS = 15 * 60 * 60 * 1000;
const STALE_TODO_COACH_CLOCK_TICK_MS = 60 * 1000;
const HABIT_SFX_ENABLED_STORAGE_KEY = 'lifegoal.habits.sfx.enabled';


function shouldShowStaleTodoCoachPill(todo: TodayTodo, nowMs: number): boolean {
  if (todo.completed || !todo.created_at) return false;
  const createdAtMs = Date.parse(todo.created_at);
  return Number.isFinite(createdAtMs) && nowMs - createdAtMs > STALE_TODO_COACH_PILL_THRESHOLD_MS;
}

function getUtcDayDifference(fromDateIso: string, toDateIso: string): number {
  const fromMs = Date.parse(`${fromDateIso}T00:00:00.000Z`);
  const toMs = Date.parse(`${toDateIso}T00:00:00.000Z`);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return 0;
  return Math.floor((toMs - fromMs) / 86400000);
}
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

function getShowBonusSpinPrompt(params: {
  isTodaysOfferSpinEntryEnabled: boolean;
  dailySpinCount: number;
  isDailySpinBonusClaimedToday: boolean;
}): boolean {
  return params.isTodaysOfferSpinEntryEnabled
    && params.dailySpinCount <= 0
    && !params.isDailySpinBonusClaimedToday;
}

function isInteractiveHabitChild(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest('button, input, textarea, select, a, [role="menu"], [data-swipe-ignore="true"]'),
  );
}

function isEggHatchOfferId(offerId: TimeBoundOfferId | EggHatchOfferId): offerId is 'egg_hatch' | EggHatchOfferId {
  return offerId === 'egg_hatch' || offerId.startsWith('egg_hatch_');
}

const DIRECT_OPEN_TIME_BOUND_OFFERS: ReadonlySet<TimeBoundOfferId> = new Set([
  'vision_star',
  'island_run',
  'daily_treats',
  'holiday_calendar',
  'zen_tree_water',
  'feed_creatures',
]);

type DailyHabitTrackerVariant = 'full' | 'compact';
type TodayExpandableSectionKey = 'routines' | 'contracts' | 'quickJournal' | 'intentions';

const TODAY_EXTRA_SECTION_TOGGLES: ReadonlyArray<{
  key: TodayExpandableSectionKey;
  label: string;
  icon: string;
}> = [
  { key: 'routines', label: 'Routines', icon: '🔁' },
  { key: 'contracts', label: 'Promises', icon: '🤝' },
  { key: 'quickJournal', label: 'Quick journal', icon: '📝' },
  { key: 'intentions', label: 'Intentions & Todos', icon: '🎯' },
];
const TODAY_EXTRA_SECTION_KEYS = new Set<TodayExpandableSectionKey>(
  TODAY_EXTRA_SECTION_TOGGLES.map((section) => section.key),
);
const TODAY_EXTRA_SECTION_STORAGE_PREFIX = 'lifegoal.habits.todayExtras.hidden';

function getTodayExtraSectionStorageKey(userId: string): string {
  return `${TODAY_EXTRA_SECTION_STORAGE_PREFIX}.${userId}`;
}

function readHiddenTodayExtraSections(userId: string): Set<TodayExpandableSectionKey> {
  if (typeof window === 'undefined') {
    return new Set();
  }

  try {
    const rawValue = window.localStorage.getItem(getTodayExtraSectionStorageKey(userId));
    if (!rawValue) {
      return new Set();
    }

    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) {
      return new Set();
    }

    return new Set(
      parsedValue.filter((value): value is TodayExpandableSectionKey => TODAY_EXTRA_SECTION_KEYS.has(value)),
    );
  } catch {
    return new Set();
  }
}

function persistHiddenTodayExtraSections(userId: string, hiddenSections: Set<TodayExpandableSectionKey>): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      getTodayExtraSectionStorageKey(userId),
      JSON.stringify(Array.from(hiddenSections)),
    );
  } catch {
  }
}

function hasQuickJournalDraftState(params: {
  isQuickJournalOpen: boolean;
  quickJournalMorning: string;
  quickJournalDay: string;
  quickJournalEvening: string;
  quickJournalInteractions: string;
  quickJournalFreeform: string;
  quickJournalPleasantMoments: string;
  quickJournalSimplePositive: string;
  quickJournalSimpleTricky: string;
  quickJournalHabitSituation: string;
  quickJournalHabitTrigger: string;
  quickJournalHabitNeed: string;
  quickJournalHabitNextExperiment: string;
  quickDreamTitle: string;
  quickDreamSymbols: string;
  quickDreamEmotions: string;
  quickDreamReflection: string;
  quickDreamTone: QuickDreamTone | null;
  quickDreamToneDetail: QuickDreamToneDetail | null;
}): boolean {
  return Boolean(
    params.isQuickJournalOpen
    || params.quickJournalMorning.trim()
    || params.quickJournalDay.trim()
    || params.quickJournalEvening.trim()
    || params.quickJournalInteractions.trim()
    || params.quickJournalFreeform.trim()
    || params.quickJournalPleasantMoments.trim()
    || params.quickJournalSimplePositive.trim()
    || params.quickJournalSimpleTricky.trim()
    || params.quickJournalHabitSituation.trim()
    || params.quickJournalHabitTrigger.trim()
    || params.quickJournalHabitNeed.trim()
    || params.quickJournalHabitNextExperiment.trim()
    || params.quickDreamTitle.trim()
    || params.quickDreamSymbols.trim()
    || params.quickDreamEmotions.trim()
    || params.quickDreamReflection.trim()
    || params.quickDreamTone
    || params.quickDreamToneDetail
  );
}

function getIntentionsSummaryLabel(
  todayEntry: JournalEntry | null,
  nextDayEntry: JournalEntry | null,
): string {
  if (todayEntry && nextDayEntry) {
    return 'Today + tomorrow saved';
  }
  if (todayEntry) {
    return 'Today saved';
  }
  if (nextDayEntry) {
    return 'Tomorrow saved';
  }
  return 'No plan yet';
}

type DailyHabitTrackerProps = {
  session: Session;
  variant?: DailyHabitTrackerVariant;
  showPointsBadges?: boolean;
  onVisionRewardOpenChange?: (isOpen: boolean) => void;
  profileStrengthSnapshot?: ProfileStrengthResult | null;
  profileStrengthSignals?: ProfileStrengthSignalSnapshot | null;
  personalitySummary?: string | null;
  onOpenDailyTreat?: () => void;
  onOpenHolidayCalendar?: () => void;
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
  onPreferredCompactViewChange?: (isCompactView: boolean) => void;
  hideTimeBoundOffers?: boolean;
  pendingOfferToOpen?: TimeBoundOfferId | null;
  onPendingOfferHandled?: () => void;
  activeHolidaySeason?: ActiveAdventMetaResult | null;
  hasOpenedDailyTreatsToday?: boolean;
  hasOpenedDailyTreatBonusToday?: boolean;
  hasDailyTreatBonusDoorToday?: boolean;
  hasOpenedHolidayCalendarToday?: boolean;
  hiddenHabitIds?: string[];
  collapseCheckboxUntilExpanded?: boolean;
  onOpenStarterQuest?: (initialDomainKey?: LifeWheelCategoryKey) => void;
  onNavigateToTimer?: (context: { sourceType: string; sourceId: string; sourceName: string }) => void;
  onOpenAiCoach?: (starterQuestion?: string) => void;
  archetypeHand?: ArchetypeHand | null;
  onNavigateToContracts?: () => void;
  onNavigateToRoutines?: () => void;
  isContractsFeatureOpen?: boolean;
  isRoutinesFeatureOpen?: boolean;
  isAdminOrCreator?: boolean;
  onOpenFeaturePreview?: (featureId: FeatureAvailabilityId, label: string) => void;
  deferDailyLifeUpgradeModal?: boolean;
  deferYesterdayTodoCleanupModal?: boolean;
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

type TodayWinsTier = 'zero_star' | 'one_star' | 'two_star' | 'three_star';

type QuickJournalDraft = {
  isOpen: boolean;
  isPrivate?: boolean;
  mode: QuickJournalMode;
  morning: string;
  day: string;
  evening: string;
  interactions: string;
  freeform: string;
  pleasantMoments?: string;
  simplePositive?: string;
  simpleTricky?: string;
  habitSituation?: string;
  habitTrigger?: string;
  habitNeed?: string;
  habitNextExperiment?: string;
  energy: number;
  mood: number;
  focus: number;
  stress: number;
  dreamTitle?: string;
  dreamSymbols?: string;
  dreamEmotions?: string;
  dreamReflection?: string;
  dreamTone?: QuickDreamTone | null;
  dreamToneDetail?: QuickDreamToneDetail | null;
  dreamToneDetailOpen?: boolean;
};

type IntentionsJournalDraft = {
  isOpen: boolean;
  type: 'today' | 'tomorrow';
  content: string;
};

type DayStatus = 'skip' | 'vacation' | 'sick';
type QuickJournalMode = 'written' | 'pulse' | 'dream' | 'simple' | 'habit_investigation';
type QuickDreamTone = 'pleasant' | 'mixed' | 'nightmare';
type QuickDreamToneDetail = 'very_uplifting' | 'pleasant' | 'mixed' | 'unsettling' | 'nightmare';

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
  /** 3–5 images for the daily non-special collage grid. Absent for special AI star. */
  imageUrls?: string[];
};

type HabitReviewAction = 'pause' | 'redesign' | 'replace' | 'archive';
type HabitReviewDiceBountySource = 'pause' | 'redesign' | 'replace' | 'archive' | 'deep_fix';

type HabitReviewAiDraft = {
  suggestion: HabitAiSuggestion;
  rationale: string;
};
type WeeklySnapshotTier = 'one_star' | 'two_star' | 'three_star';

const STREAK_LOOKBACK_DAYS = 60;
const AUTO_PROGRESS_STAGE_LABELS: Record<AutoProgressTier, string> = {
  seed: 'Easy',
  minimum: 'Medium',
  standard: 'Hard',
};

const SCALE_STAGE_ORDER: AutoProgressTier[] = ['seed', 'minimum', 'standard'];

type HabitVersionIconName = 'spark' | 'target' | 'timer' | 'shield' | 'steps';

type HabitProgressContent = {
  sectionLabel: string;
  helperText: string;
  actionLabel: string;
  ariaLabel: string;
  iconName: HabitVersionIconName;
  chipVariant: 'momentum' | 'progress' | 'session' | 'control' | 'effort';
  stageLabels: Record<AutoProgressTier, string>;
};

function isReductionLikeHabit(habit: Pick<HabitWithGoal, 'name' | 'target_unit'> & { habit_intent?: string | null }): boolean {
  if (habit.habit_intent === 'break') return true;
  const text = `${habit.name ?? ''} ${habit.target_unit ?? ''}`.toLowerCase();
  return /\b(zero|avoid|quit|stop|limit|reduce|less|under|without|caffeine|alcohol|sugar|smoking)\b/.test(text) || /(^|\s)no\s+/.test(text);
}

function getHabitProgressContent(habit: HabitWithGoal, scalePlanEnabled: boolean): HabitProgressContent {
  const habitType = habit.type ?? 'boolean';
  const isReduction = isReductionLikeHabit(habit);

  if (isReduction) {
    return {
      sectionLabel: 'Control today',
      helperText: 'Choose the result that best matches today.',
      actionLabel: "Choose today's result",
      ariaLabel: 'Habit control choices',
      iconName: 'shield',
      chipVariant: 'control',
      stageLabels: {
        seed: 'Some control',
        minimum: 'Mostly controlled',
        standard: 'Fully aligned',
      },
    };
  }

  if (habitType === 'quantity') {
    const unit = habit.target_unit?.trim() || 'units';
    return {
      sectionLabel: 'Progress today',
      helperText: habit.target_num
        ? `Pick the closest amount toward ${habit.target_num} ${unit}.`
        : 'Pick the closest amount for today.',
      actionLabel: scalePlanEnabled ? 'Choose progress level' : 'Progress',
      ariaLabel: 'Habit progress choices',
      iconName: 'target',
      chipVariant: 'progress',
      stageLabels: {
        seed: 'Some progress',
        minimum: 'Most of it',
        standard: 'Full target',
      },
    };
  }

  if (habitType === 'duration') {
    const unit = habit.target_unit?.trim() || 'minutes';
    return {
      sectionLabel: 'Session today',
      helperText: habit.target_num
        ? `Pick the closest session toward ${habit.target_num} ${unit}.`
        : 'Pick the closest session size for today.',
      actionLabel: scalePlanEnabled ? 'Choose session size' : 'Session',
      ariaLabel: 'Habit session choices',
      iconName: 'timer',
      chipVariant: 'session',
      stageLabels: {
        seed: 'Short session',
        minimum: 'Steady session',
        standard: 'Full session',
      },
    };
  }

  return {
    sectionLabel: scalePlanEnabled ? 'Today\'s version' : 'Partial credit',
    helperText: scalePlanEnabled
      ? 'Pick what you actually completed today.'
      : 'Did a meaningful piece? Log partial credit.',
    actionLabel: scalePlanEnabled ? 'Choose completed version' : 'Partial credit',
    ariaLabel: 'Habit version choices',
    iconName: 'spark',
    chipVariant: scalePlanEnabled ? 'effort' : 'momentum',
    stageLabels: {
      seed: 'Tiny win',
      minimum: 'Solid win',
      standard: 'Full win',
    },
  };
}

function isDefaultScaleStageLabel(label: string): boolean {
  const normalized = label.trim().toLowerCase();
  return normalized === 'quick fallback' || normalized === 'smaller version' || normalized === 'full version';
}

function getStageDisplayLabel(stageInfo: { label: string }, stage: AutoProgressTier, progressContent: HabitProgressContent): string {
  return isDefaultScaleStageLabel(stageInfo.label) ? progressContent.stageLabels[stage] : stageInfo.label;
}

function HabitVersionIcon({ name }: { name: HabitVersionIconName }) {
  const commonProps = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    focusable: false,
    'aria-hidden': true,
  };

  if (name === 'target') {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      </svg>
    );
  }

  if (name === 'timer') {
    return (
      <svg {...commonProps}>
        <path d="M10 2h4" />
        <path d="M12 14l3-3" />
        <circle cx="12" cy="14" r="7" />
      </svg>
    );
  }

  if (name === 'shield') {
    return (
      <svg {...commonProps}>
        <path d="M12 3l7 3v5c0 4.6-2.8 8-7 10-4.2-2-7-5.4-7-10V6l7-3z" />
        <path d="M9 12l2 2 4-5" />
      </svg>
    );
  }

  if (name === 'steps') {
    return (
      <svg {...commonProps}>
        <path d="M7 20h4" />
        <path d="M13 20h4" />
        <path d="M9 16c-1.3-1.5-2-3-2-4.5C7 9.6 8.1 8 9.5 8S12 9.6 12 11.5c0 1.5-.7 3-2 4.5" />
        <path d="M15 16c-1.3-1.5-2-3-2-4.5C13 9.6 14.1 8 15.5 8S18 9.6 18 11.5c0 1.5-.7 3-2 4.5" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
    </svg>
  );
}

const TODAY_WINS_IMAGES: Record<TodayWinsTier, string> = {
  zero_star: '/icons/todays_win/todays_win1.webp',
  one_star: '/icons/todays_win/todays_win1.webp',
  two_star: '/icons/todays_win/todays_win2.webp',
  three_star: '/icons/todays_win/todays_win3.webp',
};

const getTodayWinsTier = (score: number): TodayWinsTier => {
  if (score >= 75) return 'three_star';
  if (score >= 40) return 'two_star';
  if (score > 0) return 'one_star';
  return 'zero_star';
};
const WEEKLY_SNAPSHOT_IMAGES: Record<WeeklySnapshotTier, string> = {
  one_star: '/icons/todays_win/todays_win1.webp',
  two_star: '/icons/todays_win/todays_win2.webp',
  three_star: '/icons/todays_win/todays_win3.webp',
};
const getWeeklySnapshotTier = (completionPercent: number): WeeklySnapshotTier => {
  if (completionPercent >= 75) return 'three_star';
  if (completionPercent >= 40) return 'two_star';
  return 'one_star';
};

// Vision star slot machine animation constants
const SLOT_MACHINE_ANIMATION_DURATION_MS = 950;
const SLOT_MACHINE_LANDING_DURATION_MS = 250;
const SLOT_MACHINE_TOTAL_ITEMS = 7;
const SLOT_MACHINE_SELECTED_INDEX = 4;
const VISION_STAR_COLLAGE_MIN = 3;
const VISION_STAR_COLLAGE_MAX = 5;
const HABIT_REVIEW_DICE_BOUNTY = 25;

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
const HABITS_CREATED_EVENT = 'habitgame:habits-created';

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
const QUICK_DREAM_PRIMARY_TONE_OPTIONS: Array<{ value: QuickDreamTone; label: string; icon: string }> = [
  { value: 'pleasant', label: 'Pleasant dream', icon: '🌤️' },
  { value: 'mixed', label: 'Mixed dream', icon: '🌗' },
  { value: 'nightmare', label: 'Nightmare', icon: '🌩️' },
];
const QUICK_DREAM_DETAIL_OPTIONS: Array<{ value: QuickDreamToneDetail; label: string; icon: string }> = [
  { value: 'very_uplifting', label: 'Very uplifting', icon: '✨' },
  { value: 'pleasant', label: 'Pleasant', icon: '🌤️' },
  { value: 'mixed', label: 'Mixed', icon: '🌗' },
  { value: 'unsettling', label: 'Unsettling', icon: '🌫️' },
  { value: 'nightmare', label: 'Nightmare', icon: '🌩️' },
];
const QUICK_DREAM_PRIMARY_TO_DETAIL: Record<QuickDreamTone, QuickDreamToneDetail> = {
  pleasant: 'pleasant',
  mixed: 'mixed',
  nightmare: 'nightmare',
};
const QUICK_DREAM_DETAIL_TO_PRIMARY: Record<QuickDreamToneDetail, QuickDreamTone> = {
  very_uplifting: 'pleasant',
  pleasant: 'pleasant',
  mixed: 'mixed',
  unsettling: 'nightmare',
  nightmare: 'nightmare',
};
const QUICK_DREAM_DETAIL_META: Record<
  QuickDreamToneDetail,
  { mood: 'excited' | 'happy' | 'neutral' | 'stressed' | 'sad'; moodScore: number; tag: string; label: string }
> = {
  very_uplifting: { mood: 'excited', moodScore: 10, tag: 'dream-tone-very-uplifting', label: 'Very uplifting' },
  pleasant: { mood: 'happy', moodScore: 8, tag: 'dream-tone-pleasant', label: 'Pleasant' },
  mixed: { mood: 'neutral', moodScore: 6, tag: 'dream-tone-mixed', label: 'Mixed' },
  unsettling: { mood: 'stressed', moodScore: 4, tag: 'dream-tone-unsettling', label: 'Unsettling' },
  nightmare: { mood: 'sad', moodScore: 2, tag: 'dream-tone-nightmare', label: 'Nightmare' },
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
const visionStarAppearanceKey = (userId: string, dateISO: string) =>
  `lifegoal.vision-star-appearance:${userId}:${dateISO}`;
const VISION_STAR_APPEARANCE_DURATION_MS = 2 * 60 * 1000;
const VISION_STAR_DAYTIME_START_HOUR = 6;
const VISION_STAR_NIGHT_START_HOUR = 18;
const isVisionStarVisitEligible = (now = new Date()) => {
  const hour = now.getHours();
  const isDaytimeVisit = hour >= VISION_STAR_DAYTIME_START_HOUR && hour < VISION_STAR_NIGHT_START_HOUR;
  const isFirstNightVisit = hour >= VISION_STAR_NIGHT_START_HOUR || hour < VISION_STAR_DAYTIME_START_HOUR;
  return isDaytimeVisit || isFirstNightVisit;
};
const visionStarCountKey = (userId: string) => `lifegoal.vision-star-count:${userId}`;
const weeklySpecialVisionStarKey = (userId: string, weekStartISO: string) =>
  `lifegoal.special-vision-star-week:${userId}:${weekStartISO}`;
const weeklyHabitReviewShownKey = (userId: string, weekStartISO: string) =>
  `lifegoal.weekly-habit-review-shown:${userId}:${weekStartISO}`;
const weeklyHabitReviewLaunchKey = (userId: string) =>
  `lifegoal.weekly-habit-review-launch:${userId}`;
const dailyCatchUpLaunchKey = (userId: string) =>
  `lifegoal.daily-catchup-launch:${userId}`;
const todoCleanupDisplayCountsKey = (userId: string) =>
  `lifegoal.todo-cleanup-display-counts:${userId}`;

type TodoCleanupAction = 'tomorrow' | 'schedule' | 'finish' | 'delete';
type TodoCleanupPendingAction = { action: TodoCleanupAction; scheduledDateISO?: string };
const TODO_CLEANUP_MAX_PROMPTS = 40;
const TODO_CLEANUP_TASK_TOWER_TAG = '_todo';
const TODO_CLEANUP_LAST_PROMPT_AT = TODO_CLEANUP_MAX_PROMPTS - 1;
const dreamJournalLaunchKey = (userId: string) =>
  `lifegoal.dream-journal-launch:${userId}`;
const todaysWinsLaunchKey = (userId: string) =>
  `lifegoal.todays-wins-launch:${userId}`;
const timeLimitedOfferScheduleKey = (userId: string, dateISO: string) =>
  `lifegoal.time-limited-offer-schedule:${userId}:${dateISO}`;

type HabitPromptWindow = {
  windowStart: number | null;
  windowEnd: number | null;
};
// Per-day probability that a random time-bound bonus window (time-limited offer
// and the habit-review prompt are rolled independently) is scheduled. Raised from
// the original 0.22 so these bonus periods land on most days instead of being rare.
const TIME_BOUND_BONUS_WINDOW_PROBABILITY = 0.6;
const habitRecoveryRewardKey = (userId: string, habitId: string, rewardKey: string) =>
  `lifegoal.habit-recovery-reward:${userId}:${habitId}:${rewardKey}`;
const habitReviewDiceBountyKey = (userId: string, habitId: string, rewardKey: string) =>
  `lifegoal.habit-review-dice-bounty:${userId}:${habitId}:${rewardKey}`;

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
  onOpenHolidayCalendar,
  onOpenIslandRunStop,
  onOpenDailySpinWheel,
  forceCompactView = false,
  preferredCompactView,
  onPreferredCompactViewChange,
  hideTimeBoundOffers = false,
  pendingOfferToOpen,
  onPendingOfferHandled,
  activeHolidaySeason = null,
  hasOpenedDailyTreatsToday = false,
  hasOpenedDailyTreatBonusToday = false,
  hasDailyTreatBonusDoorToday = false,
  hasOpenedHolidayCalendarToday = false,
  hiddenHabitIds = [],
  collapseCheckboxUntilExpanded = false,
  onOpenStarterQuest,
  onNavigateToTimer,
  onOpenAiCoach,
  archetypeHand,
  onNavigateToContracts,
  onNavigateToRoutines,
  isContractsFeatureOpen = false,
  isRoutinesFeatureOpen = false,
  isAdminOrCreator = false,
  onOpenFeaturePreview,
  deferDailyLifeUpgradeModal = false,
  deferYesterdayTodoCleanupModal = false,
}: DailyHabitTrackerProps) {
  const { isConfigured } = useSupabaseAuth();
  const sparkHandEnabled = isPlayersHandSparkResultEnabled();
  const isDemoExperience = isDemoSession(session);
  const isCompact = variant === 'compact';
  const [activeOfferTeaser, setActiveOfferTeaser] = useState<TimeBoundOfferId | EggHatchOfferId | null>(null);

  const [todayTodos, setTodayTodos] = useState<TodayTodo[]>([]);
  const [todayTodoModalOpen, setTodayTodoModalOpen] = useState(false);
  const [ambianceModalOpen, setAmbianceModalOpen] = useState(false);
  const [selectedAmbiance, setSelectedAmbiance] = useState<'starlight' | null>(null);
  const [editingTodayTodo, setEditingTodayTodo] = useState<TodayTodo | null>(null);
  const [todayTodoTitle, setTodayTodoTitle] = useState('');
  const [todayTodoNotes, setTodayTodoNotes] = useState('');
  const [todayTodoDate, setTodayTodoDate] = useState(() => formatISODate(new Date()));
  const [todayTodoEstimatedMinutes, setTodayTodoEstimatedMinutes] = useState<number | ''>('');
  const [todayTodoIsFocus, setTodayTodoIsFocus] = useState(false);
  const [todayTodoError, setTodayTodoError] = useState<string | null>(null);
  const [todayTodoStatus, setTodayTodoStatus] = useState<string | null>(null);
  const [todayTodoSaving, setTodayTodoSaving] = useState(false);
  const [todayTodoLoadError, setTodayTodoLoadError] = useState<string | null>(null);
  const [justCompletedTodoId, setJustCompletedTodoId] = useState<string | null>(null);
  const [todayTodoActionPendingById, setTodayTodoActionPendingById] = useState<Record<string, boolean>>({});
  const [staleTodoCoachClockMs, setStaleTodoCoachClockMs] = useState(() => Date.now());
  const [showYesterdaySundownTodoModal, setShowYesterdaySundownTodoModal] = useState(false);
  const [yesterdaySundownTodos, setYesterdaySundownTodos] = useState<TodayTodo[]>([]);
  const [yesterdaySundownTodoStatus, setYesterdaySundownTodoStatus] = useState<string | null>(null);
  const [todoCleanupMovedToTaskTowerTitles, setTodoCleanupMovedToTaskTowerTitles] = useState<string[]>([]);
  const [yesterdaySundownTodoSaving, setYesterdaySundownTodoSaving] = useState(false);
  const [expandedYesterdaySundownTodoById, setExpandedYesterdaySundownTodoById] = useState<Record<string, boolean>>({});
  const [todoCleanupPendingActions, setTodoCleanupPendingActions] = useState<Record<string, TodoCleanupPendingAction>>({});
  const [todoCleanupDisplayCounts, setTodoCleanupDisplayCounts] = useState<Record<string, number>>({});
  const [todoCleanupBulkAction, setTodoCleanupBulkAction] = useState<TodoCleanupPendingAction | null>(null);
  const yesterdaySundownTodoPromptOpenedThisSessionRef = useRef(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStaleTodoCoachClockMs(Date.now());
    }, STALE_TODO_COACH_CLOCK_TICK_MS);
    return () => window.clearInterval(interval);
  }, []);

  const [isTodaysOfferModalOpen, setIsTodaysOfferModalOpen] = useState(false);
  const [todaysOfferCheckoutPending, setTodaysOfferCheckoutPending] = useState(false);
  const [todaysOfferModalError, setTodaysOfferModalError] = useState<string | null>(null);
  // Phase 2: in-dialog Daily Spin Wheel entry. The badge/button is rendered
  // inside the Today's Offer modal and only when the feature flag is on.
  const isTodaysOfferSpinEntryEnabled = isIslandRunFeatureEnabled('todaysOfferSpinEntryEnabled');
  const {
    spinAvailable: dailySpinAvailable,
    spinsAvailable: dailySpinCount,
    refresh: refreshDailySpinStatus,
  } = useDailySpinStatus(
    isTodaysOfferSpinEntryEnabled ? session?.user?.id : undefined,
  );
  const todaysOfferSpinBadgeActive = isTodaysOfferSpinEntryEnabled && dailySpinAvailable;
  const [isDailySpinBonusClaimedToday, setIsDailySpinBonusClaimedToday] = useState(false);
  const showBonusSpinPrompt = getShowBonusSpinPrompt({
    isTodaysOfferSpinEntryEnabled,
    dailySpinCount,
    isDailySpinBonusClaimedToday,
  });
  const [routineHiddenHabitIds, setRoutineHiddenHabitIds] = useState<string[]>([]);
  const isVisionStarPreviewOnly = resolveFeatureAccess('today.visionStar', { isAdminOrCreator }) !== 'open';
  const waterZenTreeAccess = resolveFeatureAccess('today.waterZenTree', { isAdminOrCreator });
  const feedCreaturesAccess = resolveFeatureAccess('today.feedCreatures', { isAdminOrCreator });
  const isWaterZenTreePreviewOnly = waterZenTreeAccess === 'previewOnly';
  const isFeedCreaturesPreviewOnly = feedCreaturesAccess === 'previewOnly';
  const canViewWaterZenTree = waterZenTreeAccess !== 'hidden';
  const canViewFeedCreatures = feedCreaturesAccess !== 'hidden';
  // Weekly Victory is an admin-only demo feature — only admins can see the snapshot.
  const canViewWeeklyVictory = resolveFeatureAccess('today.weeklyVictory', { isAdminOrCreator }) === 'open';
  const [routinesTodaySummary, setRoutinesTodaySummary] = useState<RoutinesTodayLaneSummary>({
    status: 'loading',
    dueCount: 0,
    error: null,
  });
  const handleRoutineHiddenHabitIdsChange = useCallback((habitIds: string[]) => {
    setRoutineHiddenHabitIds((current) => {
      if (current.length === habitIds.length && current.every((habitId, index) => habitId === habitIds[index])) {
        return current;
      }
      return habitIds;
    });
  }, []);
  const [seenOfferTeasers, setSeenOfferTeasers] = useState<Record<string, boolean>>({});
  const progressGradientId = useId();
  const [habits, setHabits] = useState<HabitWithGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState<HabitOfflineQueueStatus>({ pending: 0, failed: 0 });
  const [reviewActionHabitIds, setReviewActionHabitIds] = useState<Set<string>>(new Set());
  const [dismissedReviewHabitIds, setDismissedReviewHabitIds] = useState<Set<string>>(new Set());
  const [expandedReviewFixHabitId, setExpandedReviewFixHabitId] = useState<string | null>(null);
  const [lifecycleActionHabitIds, setLifecycleActionHabitIds] = useState<Set<string>>(new Set());
  const [todayPauseDialogHabit, setTodayPauseDialogHabit] = useState<HabitWithGoal | null>(null);
  const [reviewPauseDialogHabit, setReviewPauseDialogHabit] = useState<HabitWithGoal | null>(null);
  const [insightCaptureHabit, setInsightCaptureHabit] = useState<HabitWithGoal | null>(null);
  const [reviewAiLoadingHabitIds, setReviewAiLoadingHabitIds] = useState<Set<string>>(new Set());
  const [reviewAiDraftByHabitId, setReviewAiDraftByHabitId] = useState<Record<string, HabitReviewAiDraft>>({});
  const [analysisHabitId, setAnalysisHabitId] = useState<string | null>(null);
  const [chainHabitId, setChainHabitId] = useState<string | null>(null);
  const [pendingReviewAiApply, setPendingReviewAiApply] = useState<{ habitId: string; title: string; rationale: string } | null>(null);
  const [completions, setCompletions] = useState<Record<string, HabitCompletionState>>({});
  const [monthlyCompletions, setMonthlyCompletions] = useState<
    Record<string, HabitMonthlyCompletionState>
  >({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [monthlySaving, setMonthlySaving] = useState<Record<string, boolean>>({});
  const [autoProgressHabitIds, setAutoProgressHabitIds] = useState<Set<string>>(new Set());
  const [today, setToday] = useState(() => formatISODate(new Date()));
  const todayRef = useRef(today);
  const [activeDate, setActiveDate] = useState(() => formatISODate(new Date()));

  useEffect(() => {
    setDismissedReviewHabitIds(new Set());
    setExpandedReviewFixHabitId(null);
  }, [activeDate]);
  const loadTodayTodos = useCallback(async (dateISO: string) => {
    const { data, error } = await fetchTodayTodos(dateISO);
    if (error) {
      setTodayTodoLoadError('Could not load todos right now.');
      return;
    }
    setTodayTodoLoadError(null);
    setTodayTodos(data ?? []);
  }, []);

  useEffect(() => {
    void loadTodayTodos(activeDate);
  }, [activeDate, loadTodayTodos]);

  useEffect(() => {
    todayRef.current = today;
  }, [today]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncTodayAfterRollover = () => {
      const nextToday = formatISODate(new Date());
      const previousToday = todayRef.current;
      if (nextToday === previousToday) return;

      todayRef.current = nextToday;
      yesterdaySundownTodoPromptOpenedThisSessionRef.current = false;
      setToday(nextToday);
      setTodoCleanupPendingActions({});
      setTodoCleanupBulkAction(null);
      setExpandedYesterdaySundownTodoById({});

      setActiveDate((currentActiveDate) => (currentActiveDate === previousToday ? nextToday : currentActiveDate));
      void loadTodayTodos(nextToday);
    };

    const interval = window.setInterval(syncTodayAfterRollover, 60 * 1000);
    window.addEventListener('focus', syncTodayAfterRollover);
    document.addEventListener('visibilitychange', syncTodayAfterRollover);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', syncTodayAfterRollover);
      document.removeEventListener('visibilitychange', syncTodayAfterRollover);
    };
  }, [loadTodayTodos]);

  useEffect(() => {
    if ((!todayTodoModalOpen && !ambianceModalOpen) || typeof document === 'undefined') return;
    return lockPageScroll();
  }, [todayTodoModalOpen, ambianceModalOpen]);

  const handleOpenCreateTodayTodo = useCallback(() => {
    setEditingTodayTodo(null);
    setTodayTodoTitle('');
    setTodayTodoNotes('');
    setTodayTodoDate(activeDate);
    setTodayTodoEstimatedMinutes('');
    setTodayTodoIsFocus(false);
    setTodayTodoError(null);
    setTodayTodoStatus(null);
    setTodayTodoModalOpen(true);
  }, [activeDate]);

  const handleOpenEditTodayTodo = useCallback((todo: TodayTodo) => {
    setEditingTodayTodo(todo);
    setTodayTodoTitle(todo.title);
    setTodayTodoNotes(todo.notes ?? '');
    setTodayTodoDate(todo.todo_date);
    setTodayTodoEstimatedMinutes(todo.estimated_minutes ?? '');
    setTodayTodoIsFocus(todo.is_focus);
    setTodayTodoError(null);
    setTodayTodoStatus(null);
    setTodayTodoModalOpen(true);
  }, []);

  const handleCloseTodayTodoModal = useCallback(() => {
    setTodayTodoModalOpen(false);
    setTodayTodoError(null);
    setTodayTodoStatus(null);
    setEditingTodayTodo(null);
  }, []);

  const handleSaveTodayTodo = useCallback(async () => {
    const title = todayTodoTitle.trim();
    const scheduledDate = todayTodoDate || activeDate;
    if (scheduledDate < activeDate) {
      setTodayTodoError('Choose today or a future date.');
      return;
    }
    if (!title) {
      setTodayTodoError('Title is required.');
      return;
    }
    setTodayTodoSaving(true);
    setTodayTodoError(null);
    setTodayTodoStatus(null);

    const notes = todayTodoNotes.trim() || null;
    const estimatedMinutes = todayTodoEstimatedMinutes !== '' && todayTodoEstimatedMinutes > 0 ? todayTodoEstimatedMinutes : null;
    // If setting focus, clear it from any other active todo first
    if (todayTodoIsFocus) {
      const currentFocus = todayTodos.find((t) => t.is_focus && !t.completed && t.id !== editingTodayTodo?.id);
      if (currentFocus) await updateTodayTodo(currentFocus.id, { is_focus: false });
    }
    const { error } = editingTodayTodo
      ? await updateTodayTodo(editingTodayTodo.id, {
        title,
        notes,
        todo_date: scheduledDate,
        estimated_minutes: estimatedMinutes,
        is_focus: todayTodoIsFocus,
      })
      : await createTodayTodo(session.user.id, {
        dateISO: scheduledDate,
        title,
        notes,
        orderIndex: todayTodos.filter((todo) => !todo.completed).length,
        estimatedMinutes,
        isFocus: todayTodoIsFocus,
      });

    setTodayTodoSaving(false);
    if (error) {
      setTodayTodoError('Could not save todo right now. Please try again.');
      return;
    }
    handleCloseTodayTodoModal();
    void loadTodayTodos(activeDate);
  }, [activeDate, editingTodayTodo, handleCloseTodayTodoModal, loadTodayTodos, session.user.id, todayTodoDate, todayTodoEstimatedMinutes, todayTodoIsFocus, todayTodoNotes, todayTodoTitle, todayTodos]);

  const handleToggleTodayTodo = useCallback(async (todo: TodayTodo) => {
    const isMarkingComplete = !todo.completed;
    const { error } = await updateTodayTodo(todo.id, { completed: isMarkingComplete });
    if (!error) {
      if (isMarkingComplete) {
        setJustCompletedTodoId(todo.id);
        triggerCompletionHaptic('light', { channel: 'habit', minIntervalMs: 120 });
        window.setTimeout(() => {
          setJustCompletedTodoId((current) => (current === todo.id ? null : current));
        }, 1150);
      }
      void loadTodayTodos(activeDate);
    }
  }, [activeDate, loadTodayTodos]);

  const handleRescheduleTodayTodo = useCallback(async (todo: TodayTodo, nextDateISO: string) => {
    setTodayTodoActionPendingById((current) => ({ ...current, [todo.id]: true }));
    const { error } = await updateTodayTodo(todo.id, { todo_date: nextDateISO, completed: false });
    setTodayTodoActionPendingById((current) => {
      const next = { ...current };
      delete next[todo.id];
      return next;
    });
    if (error) {
      setTodayTodoLoadError('Could not reschedule todo right now.');
      return;
    }
    setTodayTodoLoadError(null);
    void loadTodayTodos(activeDate);
  }, [activeDate, loadTodayTodos]);

  const handleRescheduleTodayTodoTomorrow = useCallback((todo: TodayTodo) => {
    const baseDate = new Date(`${todo.todo_date || activeDate}T12:00:00`);
    const tomorrowISO = formatISODate(addDays(baseDate, 1));
    void handleRescheduleTodayTodo(todo, tomorrowISO);
  }, [activeDate, handleRescheduleTodayTodo]);

  const handleConvertTodayTodoToHabit = useCallback(async (todo: TodayTodo) => {
    setTodayTodoActionPendingById((current) => ({ ...current, [todo.id]: true }));
    const schedule = buildScheduleWithHabitRhythm({ mode: 'daily' }, {
      daypart: DEFAULT_HABIT_RHYTHM_DAYPART,
      source: 'default',
    }) as Json;
    const { error } = await createHabitV2({
      title: todo.title,
      emoji: '✅',
      type: 'boolean',
      schedule,
      start_date: today,
      habit_intent: todo.notes ?? null,
      autoprog: buildDefaultAutoProgressState({ schedule, target: null }) as Json,
      archived: false,
      status: 'active',
    }, session.user.id);
    setTodayTodoActionPendingById((current) => {
      const next = { ...current };
      delete next[todo.id];
      return next;
    });
    if (error) {
      setTodayTodoLoadError('Could not convert todo to a habit right now.');
      return;
    }
    setTodayTodoLoadError(null);
    setTodayTodoStatus(`Converted “${todo.title}” into a daily habit.`);
    await updateTodayTodo(todo.id, { completed: true });
    void loadTodayTodos(activeDate);
    const { data: habitData } = await fetchHabitsForUser(session.user.id);
    if (habitData) setHabits(habitData);
  }, [activeDate, loadTodayTodos, session.user.id, today]);

  const buildTodayTodoCoachPrompt = useCallback((todo: TodayTodo) => {
    return `I need help completing this today task:
Task: ${todo.title}
Details: ${todo.notes ?? ''}

Please give me practical, creative, doable next steps. Break it down from A to Z so I know exactly what ‘done’ means. Keep it simple enough to start in the next 5 minutes.`;
  }, []);

  const [completedActionsCount, setCompletedActionsCount] = useState(0);
  const [isTodayWinsOpen, setIsTodayWinsOpen] = useState(false);
  const [isStarFlaring, setIsStarFlaring] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsStarFlaring(true);
      setTimeout(() => setIsStarFlaring(false), 900);
    }, 4 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
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
  const grantDailySpinHabitBonusOncePerDay = useCallback(async () => {
    if (!session?.user?.id) return;
    const todayKey = formatISODate(new Date());
    const { error } = await claimDailySpinHabitBonusOncePerDay(session.user.id, todayKey);
    if (error) {
      console.error('Failed to claim daily spin habit bonus:', error);
      return;
    }
    setIsDailySpinBonusClaimedToday(true);
    await refreshDailySpinStatus();
  }, [refreshDailySpinStatus, session?.user?.id]);
  useEffect(() => {
    if (!session?.user?.id) {
      setIsDailySpinBonusClaimedToday(false);
      return;
    }
    const todayKey = formatISODate(new Date());
    let isMounted = true;
    void hasClaimedDailySpinHabitBonus(session.user.id, todayKey).then((claimed) => {
      if (isMounted) setIsDailySpinBonusClaimedToday(claimed);
    });
    return () => {
      isMounted = false;
    };
  }, [session?.user?.id, today]);
  const [monthDays, setMonthDays] = useState<string[]>([]);
  const [habitInsights, setHabitInsights] = useState<Record<string, HabitInsights>>({});
  const [expandedHabits, setExpandedHabits] = useState<Record<string, boolean>>({});
  const [expandedTodayTodoById, setExpandedTodayTodoById] = useState<Record<string, boolean>>({});
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
  const [showEmptyTodosMessage, setShowEmptyTodosMessage] = useState(true);
  const [quickJournalMorning, setQuickJournalMorning] = useState('');
  const [quickJournalDay, setQuickJournalDay] = useState('');
  const [quickJournalEvening, setQuickJournalEvening] = useState('');
  const [quickJournalInteractions, setQuickJournalInteractions] = useState('');
  const [quickJournalFreeform, setQuickJournalFreeform] = useState('');
  const [quickJournalPleasantMoments, setQuickJournalPleasantMoments] = useState('');
  const [quickJournalSimplePositive, setQuickJournalSimplePositive] = useState('');
  const [quickJournalSimpleTricky, setQuickJournalSimpleTricky] = useState('');
  const [quickJournalHabitSituation, setQuickJournalHabitSituation] = useState('');
  const [quickJournalHabitTrigger, setQuickJournalHabitTrigger] = useState('');
  const [quickJournalHabitNeed, setQuickJournalHabitNeed] = useState('');
  const [quickJournalHabitNextExperiment, setQuickJournalHabitNextExperiment] = useState('');
  const [quickJournalMode, setQuickJournalMode] = useState<QuickJournalMode>('written');
  const [quickJournalEnergy, setQuickJournalEnergy] = useState(QUICK_JOURNAL_PULSE_DEFAULTS.energy);
  const [quickJournalMood, setQuickJournalMood] = useState(QUICK_JOURNAL_PULSE_DEFAULTS.mood);
  const [quickJournalFocus, setQuickJournalFocus] = useState(QUICK_JOURNAL_PULSE_DEFAULTS.focus);
  const [quickJournalStress, setQuickJournalStress] = useState(QUICK_JOURNAL_PULSE_DEFAULTS.stress);
  const [quickJournalIsPrivate, setQuickJournalIsPrivate] = useState(true);
  const [quickDreamTitle, setQuickDreamTitle] = useState(QUICK_JOURNAL_DREAM_DEFAULTS.title);
  const [quickDreamSymbols, setQuickDreamSymbols] = useState(QUICK_JOURNAL_DREAM_DEFAULTS.symbols);
  const [quickDreamEmotions, setQuickDreamEmotions] = useState(QUICK_JOURNAL_DREAM_DEFAULTS.emotions);
  const [quickDreamReflection, setQuickDreamReflection] = useState(QUICK_JOURNAL_DREAM_DEFAULTS.reflection);
  const [quickDreamTone, setQuickDreamTone] = useState<QuickDreamTone | null>(null);
  const [quickDreamToneDetail, setQuickDreamToneDetail] = useState<QuickDreamToneDetail | null>(null);
  const [isQuickDreamToneDetailOpen, setIsQuickDreamToneDetailOpen] = useState(false);
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
  const [swipeOffsetByTodoId, setSwipeOffsetByTodoId] = useState<Record<string, number>>({});
  const [swipeArmedByTodoId, setSwipeArmedByTodoId] = useState<Record<string, HabitSwipeDirection | null>>({});
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
  const todoSwipeGestureRef = useRef<{
    todoId: string;
    pointerId: number;
    startX: number;
    startY: number;
    isHorizontal: boolean;
    hasSwiped: boolean;
    armedDirection: HabitSwipeDirection | null;
  } | null>(null);
  const swipeSuppressClickUntilByTodoIdRef = useRef<Record<string, number>>({});
  const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null);
  const [isCompactView, setIsCompactView] = useState(() =>
    Boolean(preferredCompactView ?? forceCompactView),
  );

  // Quest Habit — the single habit designated to unlock the bonus door in the Personal Quest calendar
  const [questHabit, setQuestHabitState] = useState<QuestHabit | null>(() =>
    getQuestHabit(session.user.id),
  );

  const handleSetQuestHabit = useCallback((habit: QuestHabit) => {
    setQuestHabitState(habit);
    void setQuestHabit(session.user.id, habit).then((syncedHabit) => {
      setQuestHabitState(syncedHabit);
    });
  }, [session.user.id]);

  const handleClearQuestHabit = useCallback(() => {
    setQuestHabitState(null);
    void clearQuestHabit(session.user.id).then(() => {
      setQuestHabitState(getQuestHabit(session.user.id));
    });
  }, [session.user.id]);

  const refreshQuestHabitState = useCallback(async () => {
    const syncedHabit = await refreshQuestHabit(session.user.id);
    setQuestHabitState(syncedHabit);
    return syncedHabit;
  }, [session.user.id]);

  useEffect(() => {
    void refreshQuestHabitState();
  }, [refreshQuestHabitState]);

  useEffect(() => {
    if (typeof preferredCompactView === 'boolean') {
      setIsCompactView(preferredCompactView);
      return;
    }
    if (forceCompactView) {
      setIsCompactView(true);
    }
  }, [forceCompactView, preferredCompactView]);

  const activeTodosCount = todayTodos.filter((t) => !t.completed).length;
  useEffect(() => {
    if (activeTodosCount > 0) return;
    setShowEmptyTodosMessage(true);
    const timer = setTimeout(() => setShowEmptyTodosMessage(false), 3000);
    return () => clearTimeout(timer);
  }, [activeTodosCount, activeDate]);

  const isPrivateCompactView = isCompactView;
  const [isCompactToggleLabelVisible, setIsCompactToggleLabelVisible] = useState(false);
  const compactToggleLabelTimeoutRef = useRef<number | null>(null);
  const [isAmbianceToggleLabelVisible, setIsAmbianceToggleLabelVisible] = useState(false);
  const ambianceToggleLabelTimeoutRef = useRef<number | null>(null);
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
  const [isDayStatusExpanded, setIsDayStatusExpanded] = useState(false);
  const [isIntentionsMet, setIsIntentionsMet] = useState(false);
  const [intentionsMeetSaving, setIntentionsMeetSaving] = useState(false);
  const [intentionsMeetError, setIntentionsMeetError] = useState<string | null>(null);
  const [activeContracts, setActiveContracts] = useState<CommitmentContract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [contractsError, setContractsError] = useState<string | null>(null);
  const [contractActionId, setContractActionId] = useState<string | null>(null);
  const [openTodayExpandableSection, setOpenTodayExpandableSection] = useState<TodayExpandableSectionKey | null>(null);
  const [hiddenTodayExtraSections, setHiddenTodayExtraSections] = useState<Set<TodayExpandableSectionKey>>(
    () => readHiddenTodayExtraSections(session.user.id),
  );
  const [justAddedTodaySection, setJustAddedTodaySection] = useState<TodayExpandableSectionKey | null>(null);
  const [visionImages, setVisionImages] = useState<VisionImage[]>([]);
  const [visionReward, setVisionReward] = useState<VisionReward | null>(null);
  const [visionRewardDate, setVisionRewardDate] = useState<string | null>(null);
  const [visionRewardError, setVisionRewardError] = useState<string | null>(null);
  const [visionImagesLoading, setVisionImagesLoading] = useState(false);
  const [visionRewarding, setVisionRewarding] = useState(false);
  const [visionPreviewImage, setVisionPreviewImage] = useState<VisionImage | null>(null);
  const [visionPreviewGallery, setVisionPreviewGallery] = useState<VisionImage[] | null>(null);
  const [visionPreviewIndex, setVisionPreviewIndex] = useState(0);
  const [isVisionRewardOpen, setIsVisionRewardOpen] = useState(false);
  const [isVisionAlreadyCollectedModalOpen, setIsVisionAlreadyCollectedModalOpen] = useState(false);
  const [isVisionRewardSelecting, setIsVisionRewardSelecting] = useState(false);
  const [isSlotLanding, setIsSlotLanding] = useState(false);
  const [isStarBursting, setIsStarBursting] = useState(false);
  const [isVisionImageLoaded, setIsVisionImageLoaded] = useState(false);
  const [hasClaimedVisionStar, setHasClaimedVisionStar] = useState(false);
  const [visionStarAppearanceWindow, setVisionStarAppearanceWindow] = useState<{ appearedAtMs: number; expiresAtMs: number } | null>(null);
  const [visionStarNowMs, setVisionStarNowMs] = useState(() => Date.now());
  const [hasClaimedZenTreeToday, setHasClaimedZenTreeToday] = useState(false);
  const [hasClaimedFeedCreaturesToday, setHasClaimedFeedCreaturesToday] = useState(false);
  const [isZenTreeModalOpen, setIsZenTreeModalOpen] = useState(false);
  const [isFeedCreaturesModalOpen, setIsFeedCreaturesModalOpen] = useState(false);
  // When a ready egg is tapped in Today, we play the hatch movie first; the
  // movie modal's button then launches the island game with the Hatchery open.
  const [isEggHatchMovieOpen, setIsEggHatchMovieOpen] = useState(false);
  const [hasEggHatchMoviePlayedOnce, setHasEggHatchMoviePlayedOnce] = useState(false);
  const [isZenTreeClaiming, setIsZenTreeClaiming] = useState(false);
  const [isFeedCreaturesClaiming, setIsFeedCreaturesClaiming] = useState(false);
  const [zenTreeClaimError, setZenTreeClaimError] = useState<string | null>(null);
  const [feedCreaturesClaimError, setFeedCreaturesClaimError] = useState<string | null>(null);
  const zenTreeClaimInFlightRef = useRef(false);
  const feedCreaturesClaimInFlightRef = useRef(false);
  const [visionStarCount, setVisionStarCount] = useState(0);
  const isVisionStarAppearanceActive = Boolean(
    visionStarAppearanceWindow && visionStarAppearanceWindow.expiresAtMs > visionStarNowMs,
  );
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

  useEffect(() => {
    if (!isEggHatchMovieOpen) {
      setHasEggHatchMoviePlayedOnce(false);
      return undefined;
    }

    if (typeof document === 'undefined') {
      return undefined;
    }

    return lockPageScroll(['body', 'documentElement']);
  }, [isEggHatchMovieOpen]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    let root = document.getElementById('modal-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'modal-root';
      document.body.appendChild(root);
    }

    setModalRoot(root);
    return undefined;
  }, []);
  const [showDreamJournalReminderModal, setShowDreamJournalReminderModal] = useState(false);
  const habitCardRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const dailyLifeUpgradeHighlightTimeoutRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (dailyLifeUpgradeHighlightTimeoutRef.current !== null) {
        window.clearTimeout(dailyLifeUpgradeHighlightTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined' || !showDreamJournalReminderModal) {
      return;
    }
    return lockPageScroll();
  }, [showDreamJournalReminderModal]);

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
  const [shouldOpenDailyLifeUpgradeAfterWeeklyReview, setShouldOpenDailyLifeUpgradeAfterWeeklyReview] = useState(false);
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
  const awardHabitReviewDiceBounty = useCallback((params: {
    habitId: string;
    habitName: string;
    reviewCycleKey: string;
    source: HabitReviewDiceBountySource;
  }) => {
    if (!session?.user?.id || !gamificationEnabled) {
      return false;
    }

    const storageKey = habitReviewDiceBountyKey(session.user.id, params.habitId, params.reviewCycleKey);
    if (loadDraft<boolean>(storageKey)) {
      return false;
    }

    awardDailyTreatDice({
      userId: session.user.id,
      diceAmount: HABIT_REVIEW_DICE_BOUNTY,
      sourceLabel: `Habit Review Recovery Bounty (${params.source}): ${params.habitName}`,
      islandRunSession: session,
    });
    saveDraft(storageKey, true);
    return true;
  }, [gamificationEnabled, session]);

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
  const visibleReviewQueueHabits = useMemo(
    () => reviewQueueHabits.filter((habit) => !dismissedReviewHabitIds.has(habit.id)),
    [dismissedReviewHabitIds, reviewQueueHabits],
  );
  const focusedReviewHabit = visibleReviewQueueHabits[0] ?? null;
  const hiddenReviewHabitCount = Math.max(0, reviewQueueHabits.length - (focusedReviewHabit ? 1 : 0));
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
  const topPositiveHabit = useMemo(
    () => weeklyReviewSnapshot.onTrack[0]?.name ?? null,
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
  const weeklyConsistencyDays = useMemo(() => {
    const uniqueDays = new Set<string>();
    for (const log of historicalLogs) {
      if (log.date >= weekStartISO && log.date <= activeDate && log.completed) {
        uniqueDays.add(log.date);
      }
    }
    return uniqueDays.size;
  }, [activeDate, historicalLogs, weekStartISO]);
  const weeklyLetterGrade = useMemo(() => {
    if (weeklySnapshotCompletionPercent >= 95) return 'A+';
    if (weeklySnapshotCompletionPercent >= 88) return 'A';
    if (weeklySnapshotCompletionPercent >= 80) return 'A-';
    if (weeklySnapshotCompletionPercent >= 72) return 'B';
    if (weeklySnapshotCompletionPercent >= 64) return 'C';
    return 'D';
  }, [weeklySnapshotCompletionPercent]);
  const weeklySnapshotTier = useMemo(
    () => getWeeklySnapshotTier(weeklySnapshotCompletionPercent),
    [weeklySnapshotCompletionPercent],
  );
  const weeklySnapshotStars = useMemo(
    () =>
      weeklySnapshotTier === 'three_star'
        ? '★★★'
        : weeklySnapshotTier === 'two_star'
          ? '★★☆'
          : '★☆☆',
    [weeklySnapshotTier],
  );
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

  const rhythmOrderedHabits = useMemo(() => {
    const scheduledTodayByHabitId = Object.fromEntries(
      sortedHabits.map((habit) => [
        habit.id,
        habitInsights[habit.id]?.scheduledToday ?? isHabitScheduledOnDate(habit, activeDate),
      ]),
    ) as Record<string, boolean>;

    return rankHabitsByRhythm({
      habits: sortedHabits,
      completionsByHabitId: completions,
      healthStateByHabitId: habitHealthByHabitId,
      adherenceByHabitId: adherenceByHabit,
      scheduledTodayByHabitId,
    });
  }, [activeDate, adherenceByHabit, completions, habitHealthByHabitId, habitInsights, sortedHabits]);

  const riskRankedOfferHabits = useMemo(() => {
    return rankHabitsForTimeLimitedOffer({
      habits: rhythmOrderedHabits,
      completionsByHabitId: completions,
      healthStateByHabitId: habitHealthByHabitId,
      adherenceByHabitId: adherenceByHabit,
    });
  }, [adherenceByHabit, completions, habitHealthByHabitId, rhythmOrderedHabits]);

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
    visibleReviewQueueHabits.length > 0 &&
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
        orderedHabits: rhythmOrderedHabits,
      };
    }

    return {
      orderedHabits: [
        ...[
          timeLimitedOffer.nextHabitId,
          timeLimitedOffer.badHabitId,
        ]
          .map((habitId) => rhythmOrderedHabits.find((habit) => habit.id === habitId))
          .filter((habit): habit is HabitWithGoal => Boolean(habit)),
        ...rhythmOrderedHabits.filter((habit) => !offerHabitIds.has(habit.id)),
      ],
    };
  }, [
    isTimeLimitedOfferActive,
    offerHabitIds,
    rhythmOrderedHabits,
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
      probability: TIME_BOUND_BONUS_WINDOW_PROBABILITY,
      durationMinutesMin: 18,
      durationMinutesMax: 40,
    });
  }, [buildPromptWindow]);

  const buildHabitReviewWindow = useCallback((dateISO: string, offerWindow: HabitPromptWindow) => {
    return buildPromptWindow({
      dateISO,
      probability: TIME_BOUND_BONUS_WINDOW_PROBABILITY,
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
    if (typeof window === 'undefined' || !canViewWeeklyVictory) return;
    const launchKey = weeklyHabitReviewLaunchKey(session.user.id);
    if (loadDraft<boolean>(launchKey)) {
      removeDraft(launchKey);
      setIsWeeklyHabitReviewOpen(true);
    }

    const launchHandler = () => setIsWeeklyHabitReviewOpen(true);
    window.addEventListener('lifegoal:launch-weekly-habit-review', launchHandler);
    return () => window.removeEventListener('lifegoal:launch-weekly-habit-review', launchHandler);
  }, [session.user.id, canViewWeeklyVictory]);

  useEffect(() => {
    if (!isViewingToday || typeof window === 'undefined' || !canViewWeeklyVictory) {
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
  }, [activeDate, canViewWeeklyVictory, habits.length, isViewingToday, session.user.id, stageMixSnapshot.totalLogged]);

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

  const openDreamJournalQuickEntry = useCallback(() => {
    setIsQuickJournalOpen(true);
    setQuickJournalMode('dream');
    setQuickJournalError(null);
    setQuickJournalStatus(null);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !session?.user?.id) {
      return;
    }

    const launchKey = dreamJournalLaunchKey(session.user.id);
    const tryOpenDreamJournalReminder = () => {
      setShowDreamJournalReminderModal(true);
      return true;
    };

    if (loadDraft<boolean>(launchKey) && isViewingToday && !loading && tryOpenDreamJournalReminder()) {
      removeDraft(launchKey);
    }

    const launchHandler = () => {
      if (isViewingToday && !loading) {
        tryOpenDreamJournalReminder();
        removeDraft(launchKey);
      } else {
        saveDraft(launchKey, true);
      }
    };

    window.addEventListener('lifegoal:launch-dream-journal', launchHandler);
    return () => window.removeEventListener('lifegoal:launch-dream-journal', launchHandler);
  }, [isViewingToday, loading, session?.user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined' || !session?.user?.id) {
      return;
    }

    const launchKey = todaysWinsLaunchKey(session.user.id);
    const canOpenTodayWins = () => {
      const habitWinsCount = Object.values(completions).filter((state) => state.completed).length;
      const totalWinsCount = habitWinsCount
        + completedActionsCount
        + todayWinsSummary.journalCount
        + todayWinsSummary.lotusEarned
        + todayWinsSummary.xpEarned
        + todayWinsSummary.gameRewardsTotal;
      return totalWinsCount > 0;
    };

    const tryOpenTodaysWins = () => {
      if (!canOpenTodayWins()) return false;
      setIsTodayWinsOpen(true);
      return true;
    };

    if (loadDraft<boolean>(launchKey) && isViewingToday && tryOpenTodaysWins()) {
      removeDraft(launchKey);
    }

    const launchHandler = () => {
      if (isViewingToday && tryOpenTodaysWins()) {
        removeDraft(launchKey);
      } else {
        saveDraft(launchKey, true);
      }
    };

    window.addEventListener('lifegoal:launch-todays-wins', launchHandler);
    return () => window.removeEventListener('lifegoal:launch-todays-wins', launchHandler);
  }, [
    completedActionsCount,
    completions,
    isViewingToday,
    session?.user?.id,
    todayWinsSummary.gameRewardsTotal,
    todayWinsSummary.journalCount,
    todayWinsSummary.lotusEarned,
    todayWinsSummary.xpEarned,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined' || !session?.user?.id || !isViewingToday) {
      return;
    }

    if (!getDreamJournalReminderEnabled(session.user.id)) {
      return;
    }

    const now = new Date();
    const reminderWindow = getDreamJournalReminderWindow(session.user.id);
    if (!isHourInDreamReminderWindow(now.getHours(), reminderWindow)) {
      return;
    }

    const cycleKey = getDreamReminderCycleKey(now, reminderWindow);
    if (getDreamJournalReminderLastShownCycle(session.user.id) === cycleKey) {
      return;
    }

    setDreamJournalReminderLastShownCycle(session.user.id, cycleKey);
    setShowDreamJournalReminderModal(true);
  }, [isViewingToday, session?.user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined' || !session?.user?.id || !isViewingToday) {
      return;
    }

    if (!getTodaysWinsReminderEnabled(session.user.id)) {
      return;
    }

    const habitWinsCount = Object.values(completions).filter((state) => state.completed).length;
    const totalWinsCount = habitWinsCount
      + completedActionsCount
      + todayWinsSummary.journalCount
      + todayWinsSummary.lotusEarned
      + todayWinsSummary.xpEarned
      + todayWinsSummary.gameRewardsTotal;
    if (totalWinsCount <= 0) {
      return;
    }

    const now = new Date();
    const reminderWindow = getTodaysWinsReminderWindow(session.user.id);
    if (!isTimeInTodaysWinsReminderWindow(now, reminderWindow)) {
      return;
    }

    const cycleKey = getTodaysWinsReminderCycleKey(now, reminderWindow);
    if (getTodaysWinsReminderLastShownCycle(session.user.id) === cycleKey) {
      return;
    }

    setTodaysWinsReminderLastShownCycle(session.user.id, cycleKey);
    setIsTodayWinsOpen(true);
  }, [
    completedActionsCount,
    completions,
    isViewingToday,
    session?.user?.id,
    todayWinsSummary.gameRewardsTotal,
    todayWinsSummary.journalCount,
    todayWinsSummary.lotusEarned,
    todayWinsSummary.xpEarned,
  ]);

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
      setQuickJournalPleasantMoments(draft.pleasantMoments ?? '');
      setQuickJournalSimplePositive(draft.simplePositive ?? '');
      setQuickJournalSimpleTricky(draft.simpleTricky ?? '');
      setQuickJournalHabitSituation(draft.habitSituation ?? '');
      setQuickJournalHabitTrigger(draft.habitTrigger ?? '');
      setQuickJournalHabitNeed(draft.habitNeed ?? '');
      setQuickJournalHabitNextExperiment(draft.habitNextExperiment ?? '');
      setQuickJournalEnergy(draft.energy ?? QUICK_JOURNAL_PULSE_DEFAULTS.energy);
      setQuickJournalMood(draft.mood ?? QUICK_JOURNAL_PULSE_DEFAULTS.mood);
      setQuickJournalFocus(draft.focus ?? QUICK_JOURNAL_PULSE_DEFAULTS.focus);
      setQuickJournalStress(draft.stress ?? QUICK_JOURNAL_PULSE_DEFAULTS.stress);
      setQuickJournalIsPrivate(draft.isPrivate ?? true);
      setQuickDreamTitle(draft.dreamTitle ?? QUICK_JOURNAL_DREAM_DEFAULTS.title);
      setQuickDreamSymbols(draft.dreamSymbols ?? QUICK_JOURNAL_DREAM_DEFAULTS.symbols);
      setQuickDreamEmotions(draft.dreamEmotions ?? QUICK_JOURNAL_DREAM_DEFAULTS.emotions);
      setQuickDreamReflection(draft.dreamReflection ?? QUICK_JOURNAL_DREAM_DEFAULTS.reflection);
      const restoredToneDetail = draft.dreamToneDetail ?? null;
      const restoredTone = draft.dreamTone ?? (restoredToneDetail ? QUICK_DREAM_DETAIL_TO_PRIMARY[restoredToneDetail] : null);
      setQuickDreamTone(restoredTone);
      setQuickDreamToneDetail(restoredToneDetail);
      setIsQuickDreamToneDetailOpen(Boolean(draft.dreamToneDetailOpen));
      const hasContent = Boolean(
        draft.mode === 'pulse' ||
          draft.morning ||
          draft.day ||
          draft.evening ||
          draft.interactions ||
          draft.freeform ||
          draft.pleasantMoments ||
          draft.simplePositive ||
          draft.simpleTricky ||
          draft.habitSituation ||
          draft.habitTrigger ||
          draft.habitNeed ||
          draft.habitNextExperiment ||
          draft.dreamTitle ||
          draft.dreamSymbols ||
          draft.dreamEmotions ||
          draft.dreamReflection ||
          draft.dreamTone ||
          draft.dreamToneDetail
      );
      setIsQuickJournalOpen(draft.isOpen || hasContent);
    } else {
      setQuickJournalMode('written');
      setQuickJournalMorning('');
      setQuickJournalDay('');
      setQuickJournalEvening('');
      setQuickJournalInteractions('');
      setQuickJournalFreeform('');
      setQuickJournalPleasantMoments('');
      setQuickJournalSimplePositive('');
      setQuickJournalSimpleTricky('');
      setQuickJournalHabitSituation('');
      setQuickJournalHabitTrigger('');
      setQuickJournalHabitNeed('');
      setQuickJournalHabitNextExperiment('');
      setQuickJournalEnergy(QUICK_JOURNAL_PULSE_DEFAULTS.energy);
      setQuickJournalMood(QUICK_JOURNAL_PULSE_DEFAULTS.mood);
      setQuickJournalFocus(QUICK_JOURNAL_PULSE_DEFAULTS.focus);
      setQuickJournalStress(QUICK_JOURNAL_PULSE_DEFAULTS.stress);
      setQuickJournalIsPrivate(true);
      setQuickDreamTitle(QUICK_JOURNAL_DREAM_DEFAULTS.title);
      setQuickDreamSymbols(QUICK_JOURNAL_DREAM_DEFAULTS.symbols);
      setQuickDreamEmotions(QUICK_JOURNAL_DREAM_DEFAULTS.emotions);
      setQuickDreamReflection(QUICK_JOURNAL_DREAM_DEFAULTS.reflection);
      setQuickDreamTone(null);
      setQuickDreamToneDetail(null);
      setIsQuickDreamToneDetailOpen(false);
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

    if (hasClaimedVisionStar || !isViewingToday || !isVisionStarAppearanceActive) {
      setVisionRewardError('Vision star is only available during its rare 2-minute daily appearance. Come back tomorrow for a new one.');
      setIsVisionRewardSelecting(false);
      return;
    }

    const randomCountInRange =
      VISION_STAR_COLLAGE_MIN + Math.floor(Math.random() * (VISION_STAR_COLLAGE_MAX - VISION_STAR_COLLAGE_MIN + 1));
    const collageCount = Math.min(visionImages.length, randomCountInRange);
    // Fisher-Yates shuffle for unbiased random selection
    const pool = [...visionImages];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const selections = pool.slice(0, collageCount);
    const selection = selections[0];
    const preloadSelectionImage = async (url: string) => {
      await new Promise<void>((resolve) => {
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => resolve();
        image.onerror = () => resolve();
        image.src = url;
      });
    };
    const preloadPromise = preloadSelectionImage(selection.publicUrl);
    const nextCount = visionStarCount + 1;
    const isSpecial = activeVisionStarWindow.isSpecial;
    const isSuperBoost = !isSpecial && nextCount % 20 === 0;
    const xpAmount = isSpecial ? 320 : isSuperBoost ? 250 : XP_REWARDS.VISION_BOARD_STAR;
    const diceAmount = 25;

    // Wait for slot machine spin animation to complete, then fade out
    await Promise.all([
      preloadPromise,
      new Promise(resolve => setTimeout(resolve, SLOT_MACHINE_ANIMATION_DURATION_MS)),
    ]);
    setIsSlotLanding(true);
    await new Promise(resolve => setTimeout(resolve, SLOT_MACHINE_LANDING_DURATION_MS));
    setIsVisionRewardSelecting(false);
    setIsSlotLanding(false);

    setVisionRewarding(true);
    try {
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
        xpAwarded: xpAmount,
        diceAwarded: diceAmount,
        isSuperBoost,
        isSpecial,
        specialStoryPanels,
        imageUrls: isSpecial ? undefined : selections.map((s) => s.publicUrl),
      });
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
    isVisionStarAppearanceActive,
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
    if (hasClaimedVisionStar && isViewingToday) {
      setIsVisionAlreadyCollectedModalOpen(true);
      return;
    }

    if (!isVisionStarAppearanceActive && isViewingToday) {
      setVisionRewardError('Vision star has faded for today. Watch for tomorrow’s 2-minute glow.');
      return;
    }

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

  const handleVisionRewardClaim = async () => {
    if (!visionReward || hasClaimedVisionStar || !isViewingToday || visionRewarding || !isVisionStarAppearanceActive) {
      return;
    }

    const rewardToClaim = visionReward;
    const nextCount = visionStarCount + 1;
    const persistImageUrl =
      rewardToClaim.imageUrl.startsWith('data:image/') && rewardToClaim.imageUrl.length > 200_000
        ? (rewardToClaim.imageUrls?.[0] ?? rewardToClaim.imageUrl)
        : rewardToClaim.imageUrl;

    if (visionClaimButtonRef.current) {
      const rect = visionClaimButtonRef.current.getBoundingClientRect();
      setCelebrationOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    } else {
      setCelebrationOrigin(null);
    }

    setVisionRewarding(true);
    setVisionRewardDate(activeDate);
    setHasClaimedVisionStar(true);
    saveDraft(visionStarStorageKey(session.user.id, activeDate), true);
    saveDraft(visionStarRewardKey(session.user.id, activeDate), {
      ...rewardToClaim,
      imageUrl: persistImageUrl,
    } satisfies VisionReward);
    saveDraft(visionStarCountKey(session.user.id), nextCount);
    setVisionStarCount(nextCount);

    triggerVisionClaimFlight();
    triggerCompletionHaptic('medium', { channel: 'habit', minIntervalMs: 2200 });
    setCelebrationType('vision');
    setCelebrationXP(rewardToClaim.xpAwarded);
    setShowCelebration(true);
    closeVisionReward();

    // Let the browser paint the instant collect animation before starting any
    // XP/dice persistence work that may perform synchronous setup.
    window.setTimeout(() => {
      void (async () => {
        try {
          const result = await earnXP(
            rewardToClaim.xpAwarded,
            rewardToClaim.isSpecial ? 'vision_board_star_special' : 'vision_board_star',
            undefined,
            rewardToClaim.isSpecial ? 'Special weekly vision star story' : 'Vision board star boost',
          );
          awardDailyTreatDice({
            userId: session.user.id,
            diceAmount: rewardToClaim.diceAwarded,
            sourceLabel: 'Vision Star reward',
            islandRunSession: session,
          });
          await recordActivity();

          if (result?.xpAwarded != null && result.xpAwarded !== rewardToClaim.xpAwarded) {
            saveDraft(visionStarRewardKey(session.user.id, activeDate), {
              ...rewardToClaim,
              xpAwarded: result.xpAwarded,
              imageUrl: persistImageUrl,
            } satisfies VisionReward);
          }
        } catch (error) {
          console.error('Unable to finish Vision Star reward persistence:', error);
          setVisionRewardError('Vision Star was collected, but reward sync is still catching up.');
        } finally {
          setVisionRewarding(false);
        }
      })();
    }, 0);
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
    setIsVisionAlreadyCollectedModalOpen(false);
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
    ? 'Collect prize'
    : 'Preparing reward';
  const isCollageReward = Boolean(visionReward?.imageUrls && visionReward.imageUrls.length > 1);
  const isRewardImageReady =
    !isVisionRewardSelecting &&
    Boolean(visionReward) &&
    (isCollageReward || isVisionImageLoaded);
  const shouldShowVisionLoading = !isRewardImageReady;
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
  const shouldShowTimeLimitedOfferToggle = isTimeLimitedOfferActive && offerHabitIds.size > 0;
  const [isTimeLimitedOfferDetailsOpen, setIsTimeLimitedOfferDetailsOpen] = useState(false);
  useEffect(() => {
    if (!shouldShowTimeLimitedOfferToggle) {
      setIsTimeLimitedOfferDetailsOpen(false);
    }
  }, [shouldShowTimeLimitedOfferToggle]);
  const shouldShowOfferBonus = hasClaimedVisionStar && isTimeLimitedOfferActive;
  const bonusPlaceholderText = hasClaimedVisionStar && !shouldFadeTrackingMeta
    ? 'Vision star claimed today.'
    : '';
  const { state: islandRunState } = useIslandRunState(session, null);
  const [eggReadinessNowMs, setEggReadinessNowMs] = useState(() => Date.now());
  const [islandOfferNowMs, setIslandOfferNowMs] = useState(() => Date.now());

  useEffect(() => {
    const runtimeStorageKey = `island_run_runtime_state_${session.user.id}`;
    const syncIslandRunFromStorage = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage) return;
      if (event.key !== runtimeStorageKey) return;
      refreshIslandRunStateFromLocal(session);
    };
    window.addEventListener('storage', syncIslandRunFromStorage);
    return () => {
      window.removeEventListener('storage', syncIslandRunFromStorage);
    };
  }, [session]);

  useEffect(() => {
    const expiresAtMs = islandRunState.islandExpiresAtMs;
    if (!(expiresAtMs > islandOfferNowMs)) {
      return;
    }
    const timeoutMs = Math.max(0, expiresAtMs - Date.now());
    const timeoutId = window.setTimeout(() => {
      setIslandOfferNowMs(Date.now());
    }, timeoutMs);
    return () => window.clearTimeout(timeoutId);
  }, [islandOfferNowMs, islandRunState.islandExpiresAtMs]);

  const activeIsland = islandRunState.currentIslandNumber;
  const completedStopsOnActiveIsland = islandRunState.completedStopsByIsland?.[String(activeIsland)] ?? [];
  const stopPlanForActiveIsland = useMemo(() => generateIslandStopPlan(activeIsland), [activeIsland]);

  const activeIslandEggSlots = useMemo(() => {
    const slots = getUnresolvedEggSlotsForIsland(islandRunState.perIslandEggs, activeIsland);
    if (slots.length > 0) {
      return slots;
    }

    if (islandRunState.activeEggTier && islandRunState.activeEggSetAtMs && islandRunState.activeEggHatchDurationMs) {
      const setAtMs = islandRunState.activeEggSetAtMs;
      const hatchAtMs = setAtMs + islandRunState.activeEggHatchDurationMs;
      return [{
        key: String(activeIsland),
        islandNumber: activeIsland,
        slotIndex: 0,
        entry: {
          tier: islandRunState.activeEggTier,
          setAtMs,
          hatchAtMs,
          status: eggReadinessNowMs >= hatchAtMs ? 'ready' as const : 'incubating' as const,
        },
      }];
    }

    return [];
  }, [
    activeIsland,
    eggReadinessNowMs,
    islandRunState.activeEggHatchDurationMs,
    islandRunState.activeEggSetAtMs,
    islandRunState.activeEggTier,
    islandRunState.perIslandEggs,
  ]);

  const activeIslandEggReadyAtMs = useMemo(() => {
    const nextReadyAtMs = activeIslandEggSlots
      .filter(({ entry }) => entry.status === 'incubating' && entry.hatchAtMs > eggReadinessNowMs)
      .map(({ entry }) => entry.hatchAtMs)
      .sort((first, second) => first - second)[0];

    return nextReadyAtMs ?? null;
  }, [activeIslandEggSlots, eggReadinessNowMs]);

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

  const visibleEggSlotsOnActiveIsland = activeIslandEggSlots;

  const eggHatchViewedStorageKeyForSlot = useCallback(
    (slotKey: string) => `lifegoal:egg_hatch_viewed:${session.user.id}:${getTodayUtcDateKey()}:${activeIsland}:${slotKey}`,
    [session.user.id, activeIsland],
  );
  const legacyEggHatchViewedStorageKey = useMemo(
    () => `lifegoal:egg_hatch_viewed:${session.user.id}:${getTodayUtcDateKey()}:${activeIsland}`,
    [session.user.id, activeIsland],
  );

  // Claim keys use DailyHabitTracker's shared `today` key so they reset with the Today row.
  const zenTreeClaimedStorageKey = useMemo(
    () => buildDailyOfferClaimStorageKey('zen_tree_water_claimed', session.user.id, today),
    [session.user.id, today],
  );
  const feedCreaturesClaimedStorageKey = useMemo(
    () => buildDailyOfferClaimStorageKey('feed_creatures_claimed', session.user.id, today),
    [session.user.id, today],
  );

  const islandRunCountdownExpiresAtMs = islandRunState.islandExpiresAtMs > islandOfferNowMs
    ? islandRunState.islandExpiresAtMs
    : null;
  const isIslandRunReadyToStart = islandRunState.islandStartedAtMs <= 0 && islandRunState.islandExpiresAtMs <= 0;
  const isIslandRunOfferVisible = Boolean(islandRunCountdownExpiresAtMs) || isIslandRunReadyToStart;
  const islandRunOfferLabel = isIslandRunReadyToStart ? `Island ${activeIsland}` : `Island ${activeIsland}`;
  const islandRunOfferBadge = isIslandRunReadyToStart ? 'Open' : undefined;
  const isQuestHabitCompletedToday = questHabit
    ? Boolean(completions[questHabit.habitId]?.completed)
    : Object.values(completions).some((completion) => completion.completed);
  const isDailyTreatBonusReady = hasDailyTreatBonusDoorToday
    && hasOpenedDailyTreatsToday
    && !hasOpenedDailyTreatBonusToday
    && isQuestHabitCompletedToday;
  const isDailyTreatFullyCollected = hasOpenedDailyTreatsToday
    && (!hasDailyTreatBonusDoorToday || hasOpenedDailyTreatBonusToday);

  const timeBoundOffers = useMemo<TimeBoundOfferItem[]>(() => {
    const nextUtcMidnight = getNextUtcMidnightMs();
    const holidayCalendarLabel = activeHolidaySeason
      ? `${activeHolidaySeason.meta.displayName} Calendar`
      : 'Holiday Calendar';

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
        slotRole: 'core',
      },
      {
        id: 'vision_star',
        label: 'Vision Star',
        icon: isSpecialVisionStarDay ? '🌌' : '🌟',
        expiresAtMs: visionStarAppearanceWindow?.expiresAtMs ?? nextUtcMidnight,
        badgeLabelOverride: isVisionStarPreviewOnly ? DEMO_FEATURE_LABEL : (hasClaimedVisionStar ? '✓ Done' : undefined),
        isCollected: isVisionStarPreviewOnly ? false : hasClaimedVisionStar,
        isVisible: isVisionStarPreviewOnly ? true : (!hasClaimedVisionStar && isVisionStarAppearanceActive),
        isActionable: isVisionStarPreviewOnly ? true : (!hasClaimedVisionStar && isVisionStarAppearanceActive),
        visualVariant: 'vision-star',
        sortPriority: 1,
        slotRole: 'core',
      },
      {
        id: 'daily_treats',
        label: 'Daily Treats',
        icon: '🍬',
        expiresAtMs: nextUtcMidnight,
        badgeLabelOverride: isDailyTreatBonusReady
          ? 'Bonus Ready'
          : isDailyTreatFullyCollected
            ? '✓ Done'
            : hasOpenedDailyTreatsToday && hasDailyTreatBonusDoorToday && !hasOpenedDailyTreatBonusToday
              ? 'Bonus Locked'
              : undefined,
        isCollected: isDailyTreatFullyCollected,
        isVisible: true,
        isActionable: isDailyTreatBonusReady || !hasOpenedDailyTreatsToday,
        visualVariant: isDailyTreatBonusReady ? 'bonus' : undefined,
        sortPriority: 2,
        slotRole: 'core',
      },
      {
        id: 'holiday_calendar',
        label: holidayCalendarLabel,
        icon: '🎁',
        expiresAtMs: nextUtcMidnight,
        isCollected: hasOpenedHolidayCalendarToday,
        isVisible: Boolean(activeHolidaySeason),
        isActionable: !hasOpenedHolidayCalendarToday,
        sortPriority: 4,
        slotRole: 'filler',
      },
      {
        id: 'todays_offer',
        label: "Today's Offer",
        icon: '🛍️',
        expiresAtMs: null,
        badgeLabelOverride: todaysOfferSpinBadgeActive
          ? `${Math.max(1, Math.floor(dailySpinCount))} Spin Ready`
          : showBonusSpinPrompt
            ? 'Bonus Spin'
            : 'Open',
        isCollected: false,
        isVisible: true,
        // Phase 2 second-pass: unify red badge logic with in-dialog Daily Spin CTA.
        // Notification appears only when a daily spin is available; the circle stays
        // tappable either way so users can still access the offer modal.
        isActionable: isTodaysOfferSpinEntryEnabled ? todaysOfferSpinBadgeActive : true,
        sortPriority: 3,
        slotRole: 'core',
      },
      ...visibleEggSlotsOnActiveIsland.map(({ key, slotIndex, entry }, eggIndex): TimeBoundOfferItem => {
        const offerId: TimeBoundOfferId | EggHatchOfferId = slotIndex === 0 ? 'egg_hatch' : `egg_hatch_${slotIndex}`;
        const isReadyToHatch = entry.status === 'ready' || (entry.status === 'incubating' && eggReadinessNowMs >= entry.hatchAtMs);
        const hasSeenEggHatch = typeof window !== 'undefined'
          ? localStorage.getItem(eggHatchViewedStorageKeyForSlot(key)) === '1'
            || (slotIndex === 0 && localStorage.getItem(legacyEggHatchViewedStorageKey) === '1')
          : false;
        const eggLabelPrefix = visibleEggSlotsOnActiveIsland.length > 1 ? `Egg ${eggIndex + 1}` : 'Egg';

        return {
          id: offerId,
          label: isReadyToHatch ? `${eggLabelPrefix} Ready` : `${eggLabelPrefix} Hatching`,
          icon: '🥚',
          expiresAtMs: isReadyToHatch ? null : entry.hatchAtMs,
          badgeLabelOverride: isReadyToHatch ? 'Ready' : undefined,
          // Incubating eggs stay visible with a countdown, but only ready eggs get
          // the notification dot and per-slot viewed suppression.
          isCollected: false,
          isVisible: true,
          isActionable: isReadyToHatch && !hasSeenEggHatch,
          sortPriority: isReadyToHatch
            ? (hasSeenEggHatch ? 5 + eggIndex / 10 : 2.5 + eggIndex / 100)
            : 2.75 + eggIndex / 100,
          slotRole: 'core',
        };
      }),
      {
        id: 'zen_tree_water',
        label: 'Water the Zen Tree',
        icon: '🌳',
        expiresAtMs: nextUtcMidnight,
        badgeLabelOverride: isWaterZenTreePreviewOnly ? DEMO_FEATURE_LABEL : (hasClaimedZenTreeToday ? '✓ Done' : 'Claim'),
        isCollected: isWaterZenTreePreviewOnly ? false : hasClaimedZenTreeToday,
        isVisible: canViewWaterZenTree,
        isActionable: isWaterZenTreePreviewOnly ? true : !hasClaimedZenTreeToday,
        sortPriority: 5,
        slotRole: 'core',
      },
      {
        id: 'feed_creatures',
        label: 'Feed Pet',
        icon: '🐾',
        expiresAtMs: nextUtcMidnight,
        badgeLabelOverride: isFeedCreaturesPreviewOnly ? DEMO_FEATURE_LABEL : (hasClaimedFeedCreaturesToday ? '✓ Done' : 'Claim'),
        isCollected: isFeedCreaturesPreviewOnly ? false : hasClaimedFeedCreaturesToday,
        isVisible: canViewFeedCreatures,
        isActionable: isFeedCreaturesPreviewOnly ? true : !hasClaimedFeedCreaturesToday,
        sortPriority: 6,
        slotRole: 'core',
      },
    ];
  }, [
    activeHolidaySeason,
    hasClaimedVisionStar,
    hasClaimedZenTreeToday,
    hasClaimedFeedCreaturesToday,
    hasDailyTreatBonusDoorToday,
    hasOpenedDailyTreatBonusToday,
    hasOpenedDailyTreatsToday,
    hasOpenedHolidayCalendarToday,
    isDailyTreatBonusReady,
    isDailyTreatFullyCollected,
    canViewWaterZenTree,
    canViewFeedCreatures,
    eggHatchViewedStorageKeyForSlot,
    legacyEggHatchViewedStorageKey,
    islandRunCountdownExpiresAtMs,
    islandRunOfferBadge,
    islandRunOfferLabel,
    isIslandRunOfferVisible,
    isIslandRunReadyToStart,
    visibleEggSlotsOnActiveIsland,
    isSpecialVisionStarDay,
    todaysOfferSpinBadgeActive,
    dailySpinCount,
    isDailySpinBonusClaimedToday,
    isTodaysOfferSpinEntryEnabled,
    isVisionStarAppearanceActive,
    isVisionStarPreviewOnly,
    visionStarAppearanceWindow,
  ]);


  const offerTeaserKey = useCallback((offerId: TimeBoundOfferId | EggHatchOfferId) => `${getTodayUtcDateKey()}:${offerId}`, []);

  const closeTodaysOfferModal = useCallback(() => {
    setIsTodaysOfferModalOpen(false);
    setTodaysOfferModalError(null);
    setTodaysOfferCheckoutPending(false);
  }, []);

  const handleClaimZenTree = useCallback(async () => {
    await runDailyOfferClaim({
      isClaimed: hasClaimedZenTreeToday,
      isClaiming: isZenTreeClaiming,
      inFlightRef: zenTreeClaimInFlightRef,
      award: () => {
        awardDailyWisdomTreeWatering({
          userId: session.user.id,
          islandRunSession: session,
        });
      },
      markClaimed: () => {
        if (typeof window !== 'undefined') {
          localStorage.setItem(zenTreeClaimedStorageKey, '1');
        }
        setHasClaimedZenTreeToday(true);
      },
      closeModal: () => setIsZenTreeModalOpen(false),
      setClaiming: setIsZenTreeClaiming,
      setError: setZenTreeClaimError,
      errorMessage: 'Unable to water the Wisdom Tree. Please try again.',
    });
  }, [hasClaimedZenTreeToday, isZenTreeClaiming, zenTreeClaimedStorageKey, session]);

  const handleClaimFeedCreatures = useCallback(async () => {
    await runDailyOfferClaim({
      isClaimed: hasClaimedFeedCreaturesToday,
      isClaiming: isFeedCreaturesClaiming,
      inFlightRef: feedCreaturesClaimInFlightRef,
      award: () => awardDailyTreatDice({
        userId: session.user.id,
        diceAmount: 15,
        sourceLabel: 'Feed Pet',
        islandRunSession: session,
      }),
      markClaimed: () => {
        if (typeof window !== 'undefined') {
          localStorage.setItem(feedCreaturesClaimedStorageKey, '1');
        }
        setHasClaimedFeedCreaturesToday(true);
      },
      closeModal: () => setIsFeedCreaturesModalOpen(false),
      setClaiming: setIsFeedCreaturesClaiming,
      setError: setFeedCreaturesClaimError,
      errorMessage: 'Unable to feed your pet. Please try again.',
    });
  }, [hasClaimedFeedCreaturesToday, isFeedCreaturesClaiming, feedCreaturesClaimedStorageKey, session]);

  const startTodaysOfferCheckout = useCallback(async () => {
    if (todaysOfferCheckoutPending) {
      return;
    }

    setTodaysOfferModalError(null);

    if (isDemoExperience) {
      setTodaysOfferModalError('Checkout is unavailable in demo mode.');
      return;
    }

    setTodaysOfferCheckoutPending(true);

    const activeEventType = islandRunState.activeTimedEvent?.eventType;
    const eventId = isCanonicalEventId(activeEventType) ? activeEventType : null;
    const result = await initiateMinigameTicketCheckout({
      skuId: resolveMinigameTicketSku(eventId),
      eventId,
    });
    if (!result.url) {
      setTodaysOfferModalError(result.error?.message ?? 'Unable to start ticket checkout right now.');
      setTodaysOfferCheckoutPending(false);
      return;
    }

    window.location.assign(result.url);
  }, [isDemoExperience, islandRunState.activeTimedEvent?.eventType, todaysOfferCheckoutPending]);

  const launchTodaysOfferDailySpin = useCallback(() => {
    if (!isTodaysOfferSpinEntryEnabled) {
      return;
    }

    if (!onOpenDailySpinWheel) {
      setTodaysOfferModalError('Daily Spin launcher is unavailable right now.');
      return;
    }

    setTodaysOfferModalError(null);
    setIsTodaysOfferModalOpen(false);
    onOpenDailySpinWheel();
  }, [isTodaysOfferSpinEntryEnabled, onOpenDailySpinWheel]);

  const openOfferContent = useCallback((offerId: TimeBoundOfferId | EggHatchOfferId) => {
    if (offerId === 'island_run') {
      if (onOpenIslandRunStop) {
        onOpenIslandRunStop('hatchery');
      } else {
        setVisionRewardError('Island Run launcher is unavailable in this view.');
      }
      return;
    }

    if (offerId === 'vision_star') {
      if (isVisionStarPreviewOnly) {
        onOpenFeaturePreview?.('today.visionStar', 'Vision Star');
        return;
      }
      void handleVisionRewardClick();
      return;
    }

    if (offerId === 'daily_treats') {
      if (onOpenDailyTreat) {
        onOpenDailyTreat();
      } else {
        setVisionRewardError('Daily Treats launcher is unavailable in this view.');
      }
      return;
    }

    if (offerId === 'holiday_calendar') {
      if (onOpenHolidayCalendar) {
        onOpenHolidayCalendar();
      } else {
        setVisionRewardError('Holiday Calendar launcher is unavailable in this view.');
      }
      return;
    }

    if (offerId === 'todays_offer') {
      void startTodaysOfferCheckout();
      return;
    }

    if (isEggHatchOfferId(offerId)) {
      const slotIndex = offerId === 'egg_hatch' ? 0 : Number.parseInt(offerId.replace('egg_hatch_', ''), 10);
      const selectedSlot = visibleEggSlotsOnActiveIsland.find((slot) => slot.slotIndex === slotIndex) ?? visibleEggSlotsOnActiveIsland[0];
      const isReadyToHatch = selectedSlot
        ? selectedSlot.entry.status === 'ready'
          || (selectedSlot.entry.status === 'incubating' && eggReadinessNowMs >= selectedSlot.entry.hatchAtMs)
        : false;
      // Mark ready eggs as viewed for today on this island so the red badge is cleared.
      // Incubating eggs should not be marked viewed because they still need a ready alert later.
      if (typeof window !== 'undefined' && selectedSlot && isReadyToHatch) {
        localStorage.setItem(eggHatchViewedStorageKeyForSlot(selectedSlot.key), '1');
      }
      if (!onOpenIslandRunStop) {
        setVisionRewardError('Egg hatch launcher is unavailable in this view.');
        return;
      }
      // Ready eggs get the hatch movie first; its button continues into the game.
      // Incubating eggs jump straight to the Hatchery as before.
      if (isReadyToHatch) {
        setIsEggHatchMovieOpen(true);
      } else {
        onOpenIslandRunStop('hatchery');
      }
      return;
    }

    if (offerId === 'zen_tree_water') {
      if (isWaterZenTreePreviewOnly) {
        onOpenFeaturePreview?.('today.waterZenTree', 'Water the Zen Tree');
        return;
      }
      setZenTreeClaimError(null);
      setIsZenTreeModalOpen(true);
      return;
    }

    if (offerId === 'feed_creatures') {
      if (isFeedCreaturesPreviewOnly) {
        onOpenFeaturePreview?.('today.feedCreatures', 'Feed Pet');
        return;
      }
      setFeedCreaturesClaimError(null);
      setIsFeedCreaturesModalOpen(true);
    }
  }, [eggHatchViewedStorageKeyForSlot, eggReadinessNowMs, handleVisionRewardClick, isFeedCreaturesPreviewOnly, isVisionStarPreviewOnly, isWaterZenTreePreviewOnly, onOpenDailyTreat, onOpenFeaturePreview, onOpenHolidayCalendar, onOpenIslandRunStop, startTodaysOfferCheckout, visibleEggSlotsOnActiveIsland]);

  const handleTimeBoundOfferClick = useCallback((offerId: TimeBoundOfferId | EggHatchOfferId) => {
    // UX: some offers should open directly (no intermediate teaser modal)
    if (isEggHatchOfferId(offerId) || DIRECT_OPEN_TIME_BOUND_OFFERS.has(offerId)) {
      openOfferContent(offerId);
      return;
    }

    if (offerId === 'todays_offer') {
      setTodaysOfferModalError(null);
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
      onClick={closeTodaysOfferModal}
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
          onClick={closeTodaysOfferModal}
          aria-label="Close today's offer"
        >
          ×
        </button>
        <div className="habit-day-nav__todays-offer-body">
          <button
            type="button"
            className="habit-day-nav__todays-offer-buy"
            disabled={todaysOfferCheckoutPending}
            onClick={() => {
              void startTodaysOfferCheckout();
            }}
          >
            {todaysOfferCheckoutPending ? 'Opening…' : 'Buy'}
          </button>
          {isTodaysOfferSpinEntryEnabled ? (
            <div className="habit-day-nav__todays-offer-spin">
              <button
                type="button"
                className={`habit-day-nav__todays-offer-spin-button${dailySpinAvailable ? ' habit-day-nav__todays-offer-spin-button--ready' : ''}`}
                disabled={!onOpenDailySpinWheel}
                onClick={launchTodaysOfferDailySpin}
                aria-label={
                  dailySpinAvailable
                    ? `Spin the Daily Spin Wheel (${Math.max(0, Math.floor(dailySpinCount))} available)`
                    : isDailySpinBonusClaimedToday
                      ? 'Daily Spin Wheel (already used today)'
                      : 'Daily Spin Wheel (complete one habit for bonus spin)'
                }
              >
                <span className="habit-day-nav__todays-offer-spin-icon" aria-hidden="true">🎡</span>
                <span className="habit-day-nav__todays-offer-spin-label">Daily Spin Wheel</span>
                {dailySpinAvailable ? (
                  <span
                    className="habit-day-nav__todays-offer-spin-badge"
                    aria-hidden="true"
                  >
                    {Math.max(1, Math.floor(dailySpinCount))}
                  </span>
                ) : null}
              </button>
              <p className="habit-day-nav__todays-offer-spin-caption">
                {!onOpenDailySpinWheel
                  ? 'Daily Spin launcher unavailable in this view.'
                  : dailySpinAvailable
                    ? `${Math.max(1, Math.floor(dailySpinCount))} Spin Ready`
                    : isDailySpinBonusClaimedToday
                      ? 'Come back tomorrow for your next spin.'
                      : 'Complete 1 habit to earn your bonus spin.'}
              </p>
            </div>
          ) : null}
          {todaysOfferModalError ? (
            <p className="habit-day-nav__bonus-error" role="status" aria-live="polite">
              {todaysOfferModalError}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  ) : null;

  const zenTreeModal = isZenTreeModalOpen ? (
    <div
      className="habit-day-nav__vision-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Water the Wisdom Tree"
      onClick={() => setIsZenTreeModalOpen(false)}
    >
      <div
        className="habit-day-nav__vision-modal habit-day-nav__zen-tree-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="habit-day-nav__vision-modal-close"
          onClick={() => setIsZenTreeModalOpen(false)}
          aria-label="Close wisdom tree"
        >
          ×
        </button>
        <div className="habit-day-nav__todays-offer-body">
          <p className="habit-day-nav__todays-offer-icon" aria-hidden="true">🌳</p>
              <p className="habit-day-nav__todays-offer-title">Water the Wisdom Tree</p>
              <p className="habit-day-nav__todays-offer-subtitle">A moment of care. +15 🎲 dice and +1 tree growth.</p>
          <button
            type="button"
            className="habit-day-nav__todays-offer-buy"
            disabled={isZenTreeClaiming || hasClaimedZenTreeToday}
            onClick={handleClaimZenTree}
          >
            {isZenTreeClaiming ? 'Watering…' : hasClaimedZenTreeToday ? '✓ Watered today' : 'Water Now'}
          </button>
          {zenTreeClaimError ? (
            <p className="habit-day-nav__bonus-error" role="status" aria-live="polite">
              {zenTreeClaimError}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  ) : null;

  const feedCreaturesModal = isFeedCreaturesModalOpen ? (
    <div
      className="habit-day-nav__vision-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Feed Pet"
      onClick={() => setIsFeedCreaturesModalOpen(false)}
    >
      <div
        className="habit-day-nav__vision-modal habit-day-nav__feed-creatures-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="habit-day-nav__vision-modal-close"
          onClick={() => setIsFeedCreaturesModalOpen(false)}
          aria-label="Close feed pet"
        >
          ×
        </button>
        <div className="habit-day-nav__todays-offer-body">
          <p className="habit-day-nav__todays-offer-icon" aria-hidden="true">🐾</p>
          <p className="habit-day-nav__todays-offer-title">Feed Pet</p>
          <p className="habit-day-nav__todays-offer-subtitle">Keep your sanctuary thriving. +15 🎲 dice reward.</p>
          <button
            type="button"
            className="habit-day-nav__todays-offer-buy"
            disabled={isFeedCreaturesClaiming || hasClaimedFeedCreaturesToday}
            onClick={handleClaimFeedCreatures}
          >
            {isFeedCreaturesClaiming ? 'Feeding…' : hasClaimedFeedCreaturesToday ? '✓ Fed today' : 'Feed Now'}
          </button>
          {feedCreaturesClaimError ? (
            <p className="habit-day-nav__bonus-error" role="status" aria-live="polite">
              {feedCreaturesClaimError}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  ) : null;

  const eggHatchMovieModal = isEggHatchMovieOpen ? (
    <div
      className="habit-day-nav__vision-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Egg hatching"
      onClick={() => setIsEggHatchMovieOpen(false)}
    >
      <div
        className="habit-day-nav__vision-modal habit-day-nav__egg-hatch-movie-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="habit-day-nav__vision-modal-close"
          onClick={() => setIsEggHatchMovieOpen(false)}
          aria-label="Close egg hatch movie"
        >
          ×
        </button>
        <div className="habit-day-nav__todays-offer-body habit-day-nav__egg-hatch-movie-body">
          <div className="habit-day-nav__egg-hatch-movie-stage">
            <video
              className={`habit-day-nav__egg-hatch-movie-video${hasEggHatchMoviePlayedOnce ? ' habit-day-nav__egg-hatch-movie-video--tinted' : ''}`}
              src="/assets/movies/egg-hatch-intro-v1.mp4"
              autoPlay
              muted
              playsInline
              preload="auto"
              loop={hasEggHatchMoviePlayedOnce}
              onEnded={(event) => {
                setHasEggHatchMoviePlayedOnce(true);
                event.currentTarget.currentTime = 0;
                void event.currentTarget.play();
              }}
              aria-label="Egg hatching animation"
            />
            <div className={`habit-day-nav__egg-hatch-movie-tint${hasEggHatchMoviePlayedOnce ? ' habit-day-nav__egg-hatch-movie-tint--visible' : ''}`} aria-hidden="true" />
          </div>
          <p className="habit-day-nav__todays-offer-title">Your egg is ready to hatch!</p>
          <p className="habit-day-nav__todays-offer-subtitle">Open the Hatchery to collect your creature or sell it for rewards.</p>
          <button
            type="button"
            className={`habit-day-nav__todays-offer-buy habit-day-nav__egg-hatch-movie-button${hasEggHatchMoviePlayedOnce ? ' habit-day-nav__egg-hatch-movie-button--ready' : ''}`}
            onClick={() => {
              setIsEggHatchMovieOpen(false);
              onOpenIslandRunStop?.('hatchery');
            }}
          >
            Open Hatchery →
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const weeklyHabitReviewModal = isWeeklyHabitReviewOpen && canViewWeeklyVictory ? (
    <div
      className="habit-day-nav__vision-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Weekly habit review"
      onClick={() => {
        setIsWeeklyHabitReviewOpen(false);
        setShouldOpenDailyLifeUpgradeAfterWeeklyReview(true);
      }}
    >
      <div className="habit-day-nav__vision-modal habit-day-nav__weekly-snapshot-modal" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="habit-day-nav__vision-modal-close"
          onClick={() => {
            setIsWeeklyHabitReviewOpen(false);
            setShouldOpenDailyLifeUpgradeAfterWeeklyReview(true);
          }}
          aria-label="Close weekly habit review"
        >
          ✕
        </button>
        <div className="habit-day-nav__weekly-snapshot-content">
          <header className="habit-day-nav__weekly-snapshot-header">
            <span className="habit-day-nav__vision-modal-eyebrow">Weekly habit snapshot</span>
            <h3 className="habit-day-nav__vision-modal-title">WEEKLY VICTORY</h3>
            <p className="habit-day-nav__vision-modal-caption">Simple scorecard for your momentum.</p>
          </header>
          <section className="habit-day-nav__weekly-snapshot-stars" aria-label={`${weeklySnapshotStars} weekly rating`}>
            <img src={WEEKLY_SNAPSHOT_IMAGES[weeklySnapshotTier]} alt={`${weeklySnapshotStars} weekly rating`} />
            <p>{weeklySnapshotStars}</p>
          </section>

          <section className="habit-day-nav__weekly-snapshot-scoreboard" aria-label="Weekly scoreboard">
            <div className="habit-day-nav__weekly-snapshot-scoreboard-row">
              <p>Completion</p>
              <strong>{weeklySnapshotCompletionPercent}%</strong>
            </div>
            <div className="habit-day-nav__weekly-snapshot-scoreboard-row">
              <p>Consistency</p>
              <strong>{weeklyConsistencyDays}/7 days</strong>
            </div>
            <div className="habit-day-nav__weekly-snapshot-scoreboard-row">
              <p>Top habit</p>
              <strong>{topPositiveHabit ?? 'Building'}</strong>
            </div>
            <div className="habit-day-nav__weekly-snapshot-scoreboard-row habit-day-nav__weekly-snapshot-scoreboard-row--final">
              <p>Final rating</p>
              <strong>{weeklyLetterGrade}</strong>
            </div>
          </section>

          <footer className="habit-day-nav__weekly-snapshot-actions">
            <button type="button" className="habit-day-nav__weekly-snapshot-button habit-day-nav__weekly-snapshot-button--primary" onClick={() => {
                setIsWeeklyHabitReviewOpen(false);
                setShouldOpenDailyLifeUpgradeAfterWeeklyReview(true);
              }}>
              Continue
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
          className="habit-day-nav__vision-modal habit-day-nav__vision-modal--reward"
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
            {isCollageReward && visionReward?.imageUrls ? (
              <div className="habit-day-nav__vision-modal-collage">
                {visionReward.imageUrls.map((url, idx) => (
                  <button
                    key={url}
                    type="button"
                    className="habit-day-nav__vision-modal-collage-tile"
                    onClick={() => {
                      const gallery = visionReward.imageUrls?.map(
                        (imageUrl, imageIndex) => ({ id: `vision-star-collage-${imageIndex}`, publicUrl: imageUrl, caption: null } as VisionImage),
                      ) ?? [];
                      setVisionPreviewGallery(gallery);
                      setVisionPreviewIndex(idx);
                      setVisionPreviewImage(gallery[idx] ?? null);
                    }}
                    aria-label={`Open image ${idx + 1} fullscreen`}
                  >
                    <img src={url} alt="" aria-hidden="true" />
                  </button>
                ))}
              </div>
            ) : visionReward?.imageUrl ? (
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

  const visionAlreadyCollectedModal = isVisionAlreadyCollectedModalOpen ? (
    <div
      className="habit-day-nav__vision-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Vision star already collected"
      onClick={closeVisionReward}
    >
      <div
        className="habit-day-nav__vision-modal habit-day-nav__vision-modal--reward"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="habit-day-nav__vision-modal-title">Already collected for today</h3>
        <button type="button" className="habit-day-nav__vision-modal-claim" onClick={closeVisionReward}>
          Close
        </button>
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
  const hasVisionPreviewGalleryNav = (visionPreviewGallery?.length ?? 0) > 1;
  const showPreviousVisionPreviewImage = () => {
    if (!hasVisionPreviewGalleryNav || !visionPreviewGallery) return;
    const nextIndex = (visionPreviewIndex - 1 + visionPreviewGallery.length) % visionPreviewGallery.length;
    setVisionPreviewIndex(nextIndex);
    setVisionPreviewImage(visionPreviewGallery[nextIndex] ?? null);
  };
  const showNextVisionPreviewImage = () => {
    if (!hasVisionPreviewGalleryNav || !visionPreviewGallery) return;
    const nextIndex = (visionPreviewIndex + 1) % visionPreviewGallery.length;
    setVisionPreviewIndex(nextIndex);
    setVisionPreviewImage(visionPreviewGallery[nextIndex] ?? null);
  };
  const [visionPreviewTouchStartX, setVisionPreviewTouchStartX] = useState<number | null>(null);
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
          {hasVisionPreviewGalleryNav ? (
            <button type="button" className="habit-vision-modal__nav habit-vision-modal__nav--prev" onClick={showPreviousVisionPreviewImage} aria-label="Show previous image">
              ‹
            </button>
          ) : null}
          <img
            className="habit-vision-modal__image"
            src={visionPreviewImage.publicUrl}
            alt={visionPreviewImage.caption ? `Vision board: ${visionPreviewImage.caption}` : 'Vision board inspiration'}
            onTouchStart={(event) => setVisionPreviewTouchStartX(event.changedTouches[0]?.clientX ?? null)}
            onTouchEnd={(event) => {
              if (!hasVisionPreviewGalleryNav || visionPreviewTouchStartX == null) return;
              const endX = event.changedTouches[0]?.clientX ?? visionPreviewTouchStartX;
              const deltaX = endX - visionPreviewTouchStartX;
              if (Math.abs(deltaX) < 40) return;
              if (deltaX > 0) {
                showPreviousVisionPreviewImage();
              } else {
                showNextVisionPreviewImage();
              }
              setVisionPreviewTouchStartX(null);
            }}
          />
          {hasVisionPreviewGalleryNav ? (
            <button type="button" className="habit-vision-modal__nav habit-vision-modal__nav--next" onClick={showNextVisionPreviewImage} aria-label="Show next image">
              ›
            </button>
          ) : null}
        </div>
        {visionPreviewImage.caption ? (
          <p className="habit-vision-modal__caption">{visionPreviewImage.caption}</p>
        ) : null}
        <p className="habit-vision-modal__hint">
          {hasVisionPreviewGalleryNav
            ? 'Swipe left or right to browse images. Tap outside the card or press × to close.'
            : 'Tap outside the card or press × to close.'}
        </p>
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

    return lockPageScroll();
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
    const intervalId = window.setInterval(() => setVisionStarNowMs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!isViewingToday || hasClaimedVisionStar) {
      setVisionStarAppearanceWindow(null);
      return;
    }

    const storageKey = visionStarAppearanceKey(session.user.id, activeDate);
    const stored = loadDraft<{ appearedAtMs: number; expiresAtMs: number }>(storageKey);
    const now = Date.now();

    if (stored?.appearedAtMs && stored?.expiresAtMs) {
      setVisionStarAppearanceWindow(stored);
      return;
    }

    // Create exactly one short-lived appearance when Today is opened during daytime,
    // or on the user's first Today visit if that happens at night.
    if (!isVisionStarVisitEligible(new Date(now))) {
      setVisionStarAppearanceWindow(null);
      return;
    }

    const nextWindow = {
      appearedAtMs: now,
      expiresAtMs: now + VISION_STAR_APPEARANCE_DURATION_MS,
    };
    saveDraft(storageKey, nextWindow);
    setVisionStarAppearanceWindow(nextWindow);
  }, [activeDate, hasClaimedVisionStar, isViewingToday, session.user.id]);


  useEffect(() => {
    if (typeof window === 'undefined') return;
    setHasClaimedZenTreeToday(localStorage.getItem(zenTreeClaimedStorageKey) === '1');
  }, [zenTreeClaimedStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setHasClaimedFeedCreaturesToday(localStorage.getItem(feedCreaturesClaimedStorageKey) === '1');
  }, [feedCreaturesClaimedStorageKey]);

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
        quickJournalPleasantMoments ||
        quickJournalSimplePositive ||
        quickJournalSimpleTricky ||
        quickJournalHabitSituation ||
        quickJournalHabitTrigger ||
        quickJournalHabitNeed ||
        quickJournalHabitNextExperiment ||
        quickDreamTitle ||
        quickDreamSymbols ||
        quickDreamEmotions ||
        quickDreamReflection ||
        quickDreamTone ||
        quickDreamToneDetail
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
      pleasantMoments: quickJournalPleasantMoments,
      simplePositive: quickJournalSimplePositive,
      simpleTricky: quickJournalSimpleTricky,
      habitSituation: quickJournalHabitSituation,
      habitTrigger: quickJournalHabitTrigger,
      habitNeed: quickJournalHabitNeed,
      habitNextExperiment: quickJournalHabitNextExperiment,
      energy: quickJournalEnergy,
      mood: quickJournalMood,
      focus: quickJournalFocus,
      stress: quickJournalStress,
      isPrivate: quickJournalIsPrivate,
      dreamTitle: quickDreamTitle,
      dreamSymbols: quickDreamSymbols,
      dreamEmotions: quickDreamEmotions,
      dreamReflection: quickDreamReflection,
      dreamTone: quickDreamTone,
      dreamToneDetail: quickDreamToneDetail,
      dreamToneDetailOpen: isQuickDreamToneDetailOpen,
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
    quickJournalPleasantMoments,
    quickJournalSimplePositive,
    quickJournalSimpleTricky,
    quickJournalHabitSituation,
    quickJournalHabitTrigger,
    quickJournalHabitNeed,
    quickJournalHabitNextExperiment,
    quickJournalEnergy,
    quickJournalMood,
    quickJournalFocus,
    quickJournalStress,
    quickJournalIsPrivate,
    quickDreamTitle,
    quickDreamSymbols,
    quickDreamEmotions,
    quickDreamReflection,
    quickDreamTone,
    quickDreamToneDetail,
    isQuickDreamToneDetailOpen,
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
      return false;
    }

    setLoading(true);
    setErrorMessage(null);
    let refreshSucceeded = true;

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

      const [questHabitResult, habitsResult] = await Promise.all([
        refreshQuestHabit(session.user.id),
        fetchHabitsForUser(session.user.id),
      ]);
      setQuestHabitState(questHabitResult);
      const { data: habitData, error: habitError } = habitsResult;
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
      refreshSucceeded = false;
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to load habits right now. Try refreshing shortly.',
      );
    } finally {
      setLoading(false);
    }
    return refreshSucceeded;
  }, [session, isConfigured, isDemoExperience, selectedMonth, selectedYear, activeDate, variant]);

  useEffect(() => {
    if (!isConfigured) {
      return;
    }
    void refreshHabits();
  }, [session?.user?.id, isConfigured, isDemoExperience, refreshHabits]);

  // Habits intentionally do not auto-open a yesterday cleanup prompt here: habit rows roll forward
  // through their normal schedule, while the forced next-day attention loop is reserved for todos.

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleHabitsCreated = () => {
      void refreshHabits();
    };
    window.addEventListener(HABITS_CREATED_EVENT, handleHabitsCreated);
    return () => {
      window.removeEventListener(HABITS_CREATED_EVENT, handleHabitsCreated);
    };
  }, [refreshHabits]);

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
          const rhythmBonusPrice = getHabitRhythmBonusGold({
            baseGold: defaultPrice,
            schedule: habit.schedule,
            healthState: habitHealthByHabitId[habit.id],
            completed: false,
            scheduledToday: true,
            now,
          });
          const effectivePrice = offerPrice ?? rhythmBonusPrice ?? defaultPrice;
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

          await grantDailySpinHabitBonusOncePerDay();
          await earnXP(xpAmount, 'habit_complete', habit.id);
          if (effectivePriceXpAmount) {
            await earnXP(
              effectivePriceXpAmount,
              offerPrice ? 'habit_offer' : rhythmBonusPrice ? 'habit_rhythm_bonus' : 'habit_dynamic_reward',
              habit.id,
              offerPrice
                ? 'Time-limited habit offer'
                : rhythmBonusPrice
                  ? 'Time-of-day habit rhythm bonus'
                  : 'Dynamic default habit reward',
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

            if (rhythmBonusPrice && session?.user?.id && isConfigured && !isDemoExperience) {
              void recordTelemetryEvent({
                userId: session.user.id,
                eventType: 'habit_rhythm_bonus_claimed',
                metadata: {
                  habitId: habit.id,
                  habitName: habit.name,
                  rewardGold: rhythmBonusPrice,
                  rhythm: extractHabitRhythm(habit.schedule),
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

        await grantDailySpinHabitBonusOncePerDay();
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

        await grantDailySpinHabitBonusOncePerDay();
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
    if (!isContractsFeatureOpen) {
      setContractsLoading(false);
      setContractsError(null);
      setActiveContracts([]);
      return;
    }

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
  }, [isContractsFeatureOpen, session.user.id]);

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

  const toggleTodayExpandableSection = useCallback((section: TodayExpandableSectionKey) => {
    setOpenTodayExpandableSection((current) => current === section ? null : section);
  }, []);

  useEffect(() => {
    setHiddenTodayExtraSections(readHiddenTodayExtraSections(session.user.id));
  }, [session.user.id]);

  const playBubbleBurst = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.28, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.22);
      osc.onended = () => ctx.close();
    } catch { /* audio not available */ }
  }, []);

  const toggleTodayExtraSectionVisibility = useCallback((section: TodayExpandableSectionKey) => {
    const shouldHide = !hiddenTodayExtraSections.has(section);
    const nextHiddenSections = new Set(hiddenTodayExtraSections);

    if (shouldHide) {
      nextHiddenSections.add(section);
      setOpenTodayExpandableSection((current) => current === section ? null : current);
      playBubbleBurst();
    } else {
      nextHiddenSections.delete(section);
      setJustAddedTodaySection(section);
      setTimeout(() => setJustAddedTodaySection(null), 750);
    }

    persistHiddenTodayExtraSections(session.user.id, nextHiddenSections);
    setHiddenTodayExtraSections(nextHiddenSections);
  }, [hiddenTodayExtraSections, session.user.id, playBubbleBurst]);

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

  const handleHabitReviewAction = useCallback(async (habit: HabitWithGoal, action: HabitReviewAction, options?: { reason?: string; resumeOn?: string | null }) => {
    if (!isConfigured || isDemoExperience) {
      setErrorMessage('Connect Supabase to review and update habits.');
      return;
    }
    if (reviewActionHabitIds.has(habit.id)) {
      return;
    }

    if (action === 'archive' && !window.confirm(`Archive "${habit.name}" and remove it from your active habits?`)) {
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
        const diceAwarded = awardHabitReviewDiceBounty({
          habitId: habit.id,
          habitName: habit.name,
          reviewCycleKey,
          source: 'archive',
        });
        setErrorMessage(`Archived "${habit.name}".${diceAwarded ? ` +${HABIT_REVIEW_DICE_BOUNTY} 🎲 Recovery Bounty awarded.` : ''}`);
        return;
      }

      if (action === 'pause') {
        const { error } = await pauseHabitV2(habit.id, {
          reason: options?.reason ?? 'review_pause',
          resumeOn: options?.resumeOn ?? null,
        });
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
        setReviewPauseDialogHabit((current) => (current?.id === habit.id ? null : current));
        const diceAwarded = awardHabitReviewDiceBounty({
          habitId: habit.id,
          habitName: habit.name,
          reviewCycleKey,
          source: 'pause',
        });
        const pauseUntilMessage = options?.resumeOn
          ? ` until ${new Date(`${options.resumeOn}T00:00:00`).toLocaleDateString()}`
          : ' until you resume it';
        setErrorMessage(`Paused "${habit.name}"${pauseUntilMessage}.${diceAwarded ? ` +${HABIT_REVIEW_DICE_BOUNTY} 🎲 Recovery Bounty awarded.` : ''}`);
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
        const diceAwarded = awardHabitReviewDiceBounty({
          habitId: habit.id,
          habitName: habit.name,
          reviewCycleKey,
          source: 'replace',
        });
        setErrorMessage(`Deactivated "${habit.name}" so you can replace it with a better fit.${diceAwarded ? ` +${HABIT_REVIEW_DICE_BOUNTY} 🎲 Recovery Bounty awarded.` : ''}`);
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
        setExpandedHabits({ [habit.id]: true });
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
  }, [isConfigured, isDemoExperience, reviewActionHabitIds, generateReviewRedesignDraft, awardHabitRecoveryXp, awardHabitReviewDiceBounty]);


  const handleHabitReviewDeepFixProtocolStarted = useCallback((habitId: string) => {
    const habit = habits.find((entry) => entry.id === habitId);
    if (!habit) {
      return;
    }

    const currentState = getAutoProgressState({
      autoprog: habit.autoprog ?? null,
      schedule: (habit.schedule ?? { mode: 'daily' }) as Json,
      target_num: habit.target_num ?? null,
    } as unknown as HabitV2Row);

    const diceAwarded = awardHabitReviewDiceBounty({
      habitId: habit.id,
      habitName: habit.name,
      reviewCycleKey: currentState.review_due_at ?? 'none',
      source: 'deep_fix',
    });

    if (diceAwarded) {
      setErrorMessage(`Deep Fix protocol started for "${habit.name}". +${HABIT_REVIEW_DICE_BOUNTY} 🎲 Recovery Bounty awarded.`);
    }
  }, [awardHabitReviewDiceBounty, habits]);

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

  const scrollExpandedHabitToViewportTop = useCallback((habitId: string) => {
    window.requestAnimationFrame(() => {
      const targetCard = habitCardRefs.current[habitId];
      if (!targetCard) return;

      const safeAreaTopValue = parseFloat(
        window.getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top') || '0',
      );
      const safeAreaTop = Number.isFinite(safeAreaTopValue) ? safeAreaTopValue : 0;
      const topOffset = Math.max(12, safeAreaTop + 12);
      const targetTop = targetCard.getBoundingClientRect().top + window.scrollY - topOffset;

      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: 'smooth',
      });
    });
  }, []);

  const toggleExpanded = (habitId: string) => {
    const completion = completions[habitId];
    const isArchived = Boolean(completion?.completed) || completion?.progressState === 'skipped';
    if (isArchived) {
      setExpandedHabits({});
      return;
    }

    setExpandedHabits((current) => {
      const willExpand = !current[habitId];
      if (willExpand) {
        scrollExpandedHabitToViewportTop(habitId);
      }
      return willExpand ? { [habitId]: true } : {};
    });
  };

  const toggleTodayTodoExpanded = useCallback((todoId: string) => {
    const isCompletedTodo = todayTodos.some((todo) => todo.id === todoId && todo.completed);
    if (isCompletedTodo) {
      setExpandedTodayTodoById({});
      return;
    }

    setExpandedTodayTodoById((current) => (current[todoId] ? {} : { [todoId]: true }));
  }, [todayTodos]);

  const toggleCompletedArchive = useCallback(() => {
    setShowCompletedHabits((prev) => {
      if (prev) {
        setExpandedHabits({});
        setExpandedTodayTodoById({});
      }
      return !prev;
    });
  }, []);

  const getSwipeActionIcon = useCallback((action: HabitSwipeAction | TodoSwipeAction | null) => {
    if (action === 'complete') return '✅';
    if (action === 'undo-complete') return '↩️';
    if (action === 'skip') return '⏭️';
    if (action === 'undo-skip') return '↩️';
    return '•';
  }, []);

  const getSwipeActionLabel = useCallback((action: HabitSwipeAction | TodoSwipeAction | null) => {
    if (action === 'complete') return 'Complete';
    if (action === 'undo-complete') return 'Undo complete';
    if (action === 'skip') return 'Skip';
    if (action === 'undo-skip') return 'Undo skip';
    return 'No action';
  }, []);

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
        const reviewCycleKey = currentState.review_due_at ?? 'none';
        await awardHabitRecoveryXp({
          habitId: editHabit.id,
          rewardKey: `relaunch-started:${reviewCycleKey}`,
          xp: XP_REWARDS.HABIT_RELAUNCH_STARTED,
          sourceType: 'habit_relaunch_started',
          description: 'Started a relaunched habit after review',
        });
        awardHabitReviewDiceBounty({
          habitId: editHabit.id,
          habitName: nextTitle,
          reviewCycleKey,
          source: currentState.review_reason,
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

  const revealAmbianceToggleLabel = () => {
    setIsAmbianceToggleLabelVisible(true);
    if (ambianceToggleLabelTimeoutRef.current) {
      window.clearTimeout(ambianceToggleLabelTimeoutRef.current);
    }
    ambianceToggleLabelTimeoutRef.current = window.setTimeout(() => {
      setIsAmbianceToggleLabelVisible(false);
    }, 2200);
  };

  const handleAmbianceToggle = () => {
    setSelectedAmbiance((current) => (current === 'starlight' ? null : 'starlight'));
    revealAmbianceToggleLabel();
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
    setIsCompactView((previous) => {
      const next = !previous;
      onPreferredCompactViewChange?.(next);
      return next;
    });
    setIsCompactToggleLabelVisible(true);
    if (compactToggleLabelTimeoutRef.current) {
      window.clearTimeout(compactToggleLabelTimeoutRef.current);
    }
    compactToggleLabelTimeoutRef.current = window.setTimeout(() => {
      setIsCompactToggleLabelVisible(false);
    }, 2200);
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
                      JUMP TO TODAY
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
                      JUMP TO TODAY
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
                null
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
        // Capture the cue behind a slip while it's fresh — but only for habits
        // that are actually struggling, so healthy habits stay friction-free.
        const healthState = habitHealthByHabitId[habit.id] ?? 'active';
        if (healthState !== 'active') {
          setInsightCaptureHabit(habit);
        }
        return;
      }
      void handleUndoHabitSkip(habit);
    },
    [activeDate, habitHealthByHabitId, handleLogHabitSkip, handleUndoHabitSkip, toggleHabitForDate],
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
    const nonReviewHabits = (isTimeLimitedOfferActive ? timeLimitedOrderedHabits : rhythmOrderedHabits).filter(
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
    const activeTodos = todayTodos.filter((todo) => !todo.completed);
    const completedTodos = todayTodos.filter((todo) => todo.completed);

    return (
      <div className="habit-checklist__group">
        {!hideTimeBoundOffers && isViewingToday ? (
          <TimeBoundOfferRow
            offers={timeBoundOffers}
            onOfferClick={handleTimeBoundOfferClick}
          />
        ) : null}
        {isHabitReviewPromptActive && focusedReviewHabit ? (() => {
          const habit = focusedReviewHabit;
          const isActionInFlight = reviewActionHabitIds.has(habit.id);
          const isAiDraftLoading = reviewAiLoadingHabitIds.has(habit.id);
          const aiDraft = reviewAiDraftByHabitId[habit.id];
          const isFixExpanded = expandedReviewFixHabitId === habit.id;

          return (
            <section className="habit-review-queue" aria-label="Habit review queue">
              <p className="habit-review-queue__eyebrow">{gamificationEnabled ? 'Recovery Bounty' : 'Habit Review'}</p>
              <h3 className="habit-review-queue__title">
                {reviewQueueHabits.length} habit{reviewQueueHabits.length === 1 ? '' : 's'} need attention
              </h3>
              <p className="habit-review-queue__subtitle">
                {gamificationEnabled
                  ? `These habits are paused from today's score. Follow through on a fix to earn +${HABIT_REVIEW_DICE_BOUNTY} 🎲 dice.`
                  : 'These habits are paused from today\'s score. Choose what to do with each one to keep your habit list healthy.'}
              </p>
              <ul className="habit-review-queue__list" role="list">
                <li className="habit-review-queue__item">
                  <span className="habit-review-queue__name">{habit.name}</span>
                  <div className="habit-review-queue__primary-actions">
                    <button
                      type="button"
                      className="habit-review-queue__fix"
                      aria-expanded={isFixExpanded}
                      disabled={isActionInFlight}
                      onClick={() => setExpandedReviewFixHabitId((current) => (current === habit.id ? null : habit.id))}
                    >
                      {gamificationEnabled ? `Fix +${HABIT_REVIEW_DICE_BOUNTY} 🎲` : 'Fix'}
                    </button>
                    <button
                      type="button"
                      className="habit-review-queue__not-now"
                      disabled={isActionInFlight}
                      onClick={() => {
                        setDismissedReviewHabitIds((prev) => new Set(prev).add(habit.id));
                        setExpandedReviewFixHabitId((current) => (current === habit.id ? null : current));
                      }}
                    >
                      Not now
                    </button>
                  </div>
                  {isFixExpanded ? (
                    <div className="habit-review-queue__actions" aria-label={`Fix options for ${habit.name}`}>
                      <button type="button" disabled={isActionInFlight} onClick={() => setAnalysisHabitId(habit.id)}>
                        <span>Deep Fix</span>
                        <small>Guided diagnosis</small>
                      </button>
                      <button type="button" disabled={isActionInFlight} onClick={() => setReviewPauseDialogHabit(habit)}>
                        <span>Pause</span>
                        <small>Choose duration</small>
                      </button>
                      <button type="button" disabled={isActionInFlight} onClick={() => void handleHabitReviewAction(habit, 'redesign')}>
                        <span>Redesign</span>
                        <small>Edit habit structure</small>
                      </button>
                      <button type="button" disabled={isActionInFlight} onClick={() => void handleHabitReviewAction(habit, 'replace')}>
                        <span>Replace</span>
                        <small>Create substitute</small>
                      </button>
                      <button
                        type="button"
                        className="habit-review-queue__archive"
                        disabled={isActionInFlight}
                        onClick={() => void handleHabitReviewAction(habit, 'archive')}
                      >
                        <span>Archive</span>
                        <small>Confirm archive</small>
                      </button>
                    </div>
                  ) : null}
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
              </ul>
              {hiddenReviewHabitCount > 0 ? (
                <p className="habit-review-queue__more">
                  {hiddenReviewHabitCount} more habit{hiddenReviewHabitCount === 1 ? '' : 's'} waiting after this.
                </p>
              ) : null}
            </section>
          );
        })() : null}
        <div className="habit-checklist-card__title">
          <div className="habit-checklist-card__title-actions">
            {shouldShowTimeLimitedOfferToggle ? (
              <button
                type="button"
                className="habit-checklist-card__offer-toggle"
                onClick={() => setIsTimeLimitedOfferDetailsOpen((current) => !current)}
                aria-expanded={isTimeLimitedOfferDetailsOpen}
                aria-label="Toggle time-limited offer details"
              >
                ⏳ Offer
                {timeLimitedCountdownLabel ? ` • ${timeLimitedCountdownLabel}` : ''}
              </button>
            ) : null}
            <button
              type="button"
              className="habit-checklist-card__starter-launcher habit-checklist-card__todo-launcher"
              onClick={handleOpenCreateTodayTodo}
            >
              Todo
            </button>
            {onOpenStarterQuest ? (
              <button
                type="button"
                className="habit-checklist-card__starter-launcher"
                onClick={() => onOpenStarterQuest()}
                aria-label="Open Starter Quest picker"
              >
                + My quest
              </button>
            ) : null}
            <button
              type="button"
              className={`habit-checklist-card__glass-toggle habit-checklist-card__ambiance-toggle ${
                selectedAmbiance ? 'habit-checklist-card__glass-toggle--active habit-checklist-card__ambiance-toggle--active' : ''
              } ${!isAmbianceToggleLabelVisible ? 'habit-checklist-card__glass-toggle--label-hidden' : ''}`}
              onClick={handleAmbianceToggle}
              aria-pressed={Boolean(selectedAmbiance)}
              aria-label={selectedAmbiance ? 'Turn ambiance off' : 'Turn ambiance on'}
            >
              <span className="habit-checklist-card__glass-toggle-icon" aria-hidden="true">🖌️</span>
              <span className="habit-checklist-card__glass-toggle-indicator" aria-hidden="true">
                <span className="habit-checklist-card__glass-toggle-thumb" />
              </span>
              <span className="habit-checklist-card__glass-toggle-label">Ambiance</span>
            </button>
            <button
              type="button"
              className={`habit-checklist-card__glass-toggle ${
                isCompactView ? 'habit-checklist-card__glass-toggle--active' : ''
              } ${!isCompactToggleLabelVisible ? 'habit-checklist-card__glass-toggle--label-hidden' : ''}`}
              onClick={handleCompactToggle}
              aria-pressed={isCompactView}
              aria-label={isCompactView ? 'Switch to detailed view' : 'Switch to private view'}
            >
              <span className="habit-checklist-card__glass-toggle-icon" aria-hidden="true">
                {isCompactView ? '🙈' : '👁️'}
              </span>
              <span className="habit-checklist-card__glass-toggle-indicator" aria-hidden="true">
                <span className="habit-checklist-card__glass-toggle-thumb" />
              </span>
              <span className="habit-checklist-card__glass-toggle-label">
                {isCompactView ? 'Private' : 'Detailed'}
              </span>
            </button>
          </div>
        </div>
        {shouldShowTimeLimitedOfferToggle && isTimeLimitedOfferDetailsOpen ? (
          <div className="habit-checklist-card__offer-details">
            <p className="habit-checklist-card__offer-eyebrow">{timeLimitedOfferCopy.eyebrow}</p>
            <p className="habit-checklist-card__offer-line">{timeLimitedOfferCopy.nextUp}</p>
            <p className="habit-checklist-card__offer-line">{timeLimitedOfferCopy.badBoost}</p>
          </div>
        ) : null}
        {visibleHabits.length === 0 && completedHabits.length > 0 ? (
          <p className="habit-checklist__empty">All habits checked off for today.</p>
        ) : null}
        <ul
          className={`habit-checklist ${Object.values(expandedHabits).some(Boolean) ? 'habit-checklist--has-expanded-habit' : ''}`}
          role="list"
        >
          {activeTodos.map((todo, todoIndex) => {
            const isExpanded = Boolean(expandedTodayTodoById[todo.id]);
            const isJustCompletedTodo = justCompletedTodoId === todo.id;
            const todoSwipeOffset = swipeOffsetByTodoId[todo.id] ?? 0;
            const todoSwipeProgress = Math.min(1, Math.abs(todoSwipeOffset) / HABIT_SWIPE_MAX_PX);
            const rightTodoSwipeProgress = todoSwipeOffset > 0 ? todoSwipeProgress : 0;
            const leftTodoSwipeProgress = todoSwipeOffset < 0 ? todoSwipeProgress : 0;
            const todoSwipeAction: TodoSwipeAction | null = getTodoSwipeAction(isExpanded);
            const todoSwipeArmedDirection = swipeArmedByTodoId[todo.id] ?? null;
            const todoDisplayTitle = isPrivateCompactView ? `Private todo ${todoIndex + 1}` : todo.title;
            const showCollapsedCoachPill = !isExpanded && !isPrivateCompactView && Boolean(onOpenAiCoach) && shouldShowStaleTodoCoachPill(todo, staleTodoCoachClockMs);
            return (
              <li key={todo.id} className={`habit-checklist__item habit-checklist__item--todo ${isJustCompletedTodo ? 'habit-checklist__item--todo-completing' : ''}`.trim()}>
                <div
                  className="habit-checklist__swipe-frame"
                  aria-hidden={isExpanded ? 'true' : undefined}
                  style={
                    {
                      '--habit-swipe-right-progress': rightTodoSwipeProgress,
                      '--habit-swipe-left-progress': leftTodoSwipeProgress,
                    } as CSSProperties
                  }
                >
                  <div
                    className={`habit-checklist__swipe-lane habit-checklist__swipe-lane--right ${
                      todoSwipeArmedDirection === 'right' ? 'habit-checklist__swipe-lane--armed' : ''
                    } ${todoSwipeAction ? '' : 'habit-checklist__swipe-lane--disabled'}`}
                    aria-hidden="true"
                  >
                    <span className="habit-checklist__swipe-icon">{getSwipeActionIcon(todoSwipeAction)}</span>
                    <span className="habit-checklist__swipe-label">{getSwipeActionLabel(todoSwipeAction)}</span>
                  </div>
                  <div className="habit-checklist__swipe-lane habit-checklist__swipe-lane--left habit-checklist__swipe-lane--disabled" aria-hidden="true">
                    <span className="habit-checklist__swipe-icon">•</span>
                    <span className="habit-checklist__swipe-label">No action</span>
                  </div>
                  <div
                    className={`habit-checklist__swipe-row ${todoSwipeOffset !== 0 ? 'habit-checklist__swipe-row--dragging' : ''}`}
                    style={{ transform: `translateX(${todoSwipeOffset}px)` }}
                    onPointerDown={(event) => {
                      if (todoSwipeGestureRef.current || isExpanded || isInteractiveHabitChild(event.target) || (event.pointerType === 'mouse' && event.button !== 0)) return;
                      todoSwipeGestureRef.current = { todoId: todo.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, isHorizontal: false, hasSwiped: false, armedDirection: todoSwipeArmedDirection };
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerMove={(event) => {
                      const gesture = todoSwipeGestureRef.current;
                      if (!gesture || gesture.todoId !== todo.id || gesture.pointerId !== event.pointerId || isExpanded) return;
                      const deltaX = event.clientX - gesture.startX;
                      const deltaY = event.clientY - gesture.startY;
                      if (!gesture.isHorizontal) {
                        if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
                        if (Math.abs(deltaY) > Math.abs(deltaX)) { todoSwipeGestureRef.current = null; return; }
                        gesture.isHorizontal = true;
                      }
                      event.preventDefault();
                      const clamped = Math.max(-HABIT_SWIPE_MAX_PX, Math.min(HABIT_SWIPE_MAX_PX, deltaX));
                      if (Math.abs(clamped) > 6) gesture.hasSwiped = true;
                      setSwipeOffsetByTodoId((current) => ({ ...current, [todo.id]: clamped }));
                      const armedDirection = getTodoSwipeArmedDirection({
                        clampedOffsetPx: clamped,
                        armThresholdPx: HABIT_SWIPE_ARM_THRESHOLD_PX,
                        swipeAction: todoSwipeAction,
                      });
                      gesture.armedDirection = armedDirection;
                      setSwipeArmedByTodoId((current) => ({ ...current, [todo.id]: armedDirection }));
                    }}
                    onPointerUp={(event) => {
                      const gesture = todoSwipeGestureRef.current;
                      if (!gesture || gesture.todoId !== todo.id || gesture.pointerId !== event.pointerId) return;
                      event.currentTarget.releasePointerCapture(event.pointerId);
                      todoSwipeGestureRef.current = null;
                      if (gesture.hasSwiped) swipeSuppressClickUntilByTodoIdRef.current[todo.id] = Date.now() + HABIT_SWIPE_SUPPRESS_CLICK_MS;
                      const shouldComplete = gesture.armedDirection === 'right' && todoSwipeAction === 'complete';
                      setSwipeOffsetByTodoId((current) => ({ ...current, [todo.id]: 0 }));
                      setSwipeArmedByTodoId((current) => ({ ...current, [todo.id]: null }));
                      if (shouldComplete) void handleToggleTodayTodo(todo);
                    }}
                    onPointerCancel={() => { todoSwipeGestureRef.current = null; setSwipeOffsetByTodoId((current) => ({ ...current, [todo.id]: 0 })); setSwipeArmedByTodoId((current) => ({ ...current, [todo.id]: null })); }}
                  >
                    <div
                      className={`habit-checklist__row ${isExpanded ? 'habit-checklist__row--expanded' : ''}`}
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      onClick={() => {
                        const suppressUntil = swipeSuppressClickUntilByTodoIdRef.current[todo.id] ?? 0;
                        if (Date.now() < suppressUntil) return;
                        toggleTodayTodoExpanded(todo.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.currentTarget !== event.target) return;
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          toggleTodayTodoExpanded(todo.id);
                        }
                      }}
                    >
                      {isExpanded ? (
                        <button
                          type="button"
                          className="habit-checklist__todo-check"
                          aria-label={`Mark ${todoDisplayTitle} as complete`}
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleToggleTodayTodo(todo);
                          }}
                        >
                          ⭕
                        </button>
                      ) : null}
                      <div className={`habit-checklist__main habit-checklist__main--todo${todo.is_focus ? ' habit-checklist__main--todo-focus' : ''}`}>
                        <div className="habit-checklist__todo-header">
                          <div className="habit-checklist__todo-title-row">
                            {todo.is_focus ? <span className="habit-checklist__todo-focus-star" aria-label="Focus todo">⭐</span> : null}
                            <h3 className="habit-checklist__todo-title">{todoDisplayTitle}</h3>
                          </div>
                          <div className="habit-checklist__todo-badges">
                            {todo.estimated_minutes ? (
                              <span className="habit-checklist__todo-time-badge">⏱ {todo.estimated_minutes}m</span>
                            ) : null}
                            <span className="habit-checklist__todo-badge">Todo</span>
                            {onNavigateToTimer && !isPrivateCompactView ? (
                              <button
                                type="button"
                                className="habit-checklist__todo-start-now"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onNavigateToTimer({ sourceType: 'today_todo', sourceId: todo.id, sourceName: todo.title });
                                }}
                              >
                                Start now
                              </button>
                            ) : null}
                            {showCollapsedCoachPill ? (
                              <button
                                type="button"
                                className="habit-checklist__todo-coach-pill"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onOpenAiCoach?.(buildTodayTodoCoachPrompt(todo));
                                }}
                              >
                                Help me figure out next step
                              </button>
                            ) : null}
                          </div>
                        </div>
                        {isExpanded ? (
                          <>
                            {isPrivateCompactView ? <p className="habit-checklist__todo-note-placeholder">Notes hidden in compact private view.</p> : todo.notes ? <p className="habit-checklist__note habit-checklist__todo-note">{todo.notes}</p> : <p className="habit-checklist__todo-note-placeholder">No notes yet — add context when you need it.</p>}
                            <div className="habit-checklist__todo-actions" onClick={(event) => event.stopPropagation()}>
                              <span className="habit-checklist__todo-actions-label">Quick actions</span>
                              <button type="button" className="habit-checklist__todo-action-btn" onClick={() => void handleToggleTodayTodo(todo)} disabled={Boolean(todayTodoActionPendingById[todo.id])}>Complete</button>
                              <button type="button" className="habit-checklist__todo-action-btn" onClick={() => handleRescheduleTodayTodoTomorrow(todo)} disabled={Boolean(todayTodoActionPendingById[todo.id])}>Tomorrow</button>
                              {!isPrivateCompactView ? <button type="button" className="habit-checklist__todo-action-btn" onClick={() => handleOpenEditTodayTodo(todo)} disabled={Boolean(todayTodoActionPendingById[todo.id])}>Edit / reschedule</button> : null}
                              {!isPrivateCompactView ? <button type="button" className="habit-checklist__todo-action-btn habit-checklist__todo-action-btn--habit" onClick={() => void handleConvertTodayTodoToHabit(todo)} disabled={Boolean(todayTodoActionPendingById[todo.id])}>Convert to habit</button> : null}
                              {onNavigateToTimer && !isPrivateCompactView ? <button type="button" className="habit-checklist__todo-action-btn habit-checklist__todo-action-btn--focus" onClick={() => onNavigateToTimer({ sourceType: 'today_todo', sourceId: todo.id, sourceName: todo.title })}>Start 25m focus</button> : null}
                              {onOpenAiCoach && !isPrivateCompactView ? <button type="button" className="habit-checklist__todo-action-btn habit-checklist__todo-action-btn--coach" onClick={() => onOpenAiCoach(buildTodayTodoCoachPrompt(todo))}>Help me figure out next step</button> : null}
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
          {todayTodoStatus ? <li className="habit-checklist__empty habit-checklist__empty--success">{todayTodoStatus}</li> : null}
          {todayTodoLoadError ? <li className="habit-checklist__empty">{todayTodoLoadError}</li> : null}
          {!todayTodoLoadError && activeTodos.length === 0 && showEmptyTodosMessage ? (
            <li className="habit-checklist__empty">No todos for this date yet.</li>
          ) : null}
          {showCompletedHabits && completedTodos.length > 0 ? (
            <li className="habit-checklist__item habit-checklist__item--todo habit-checklist__item--completed">
              <div className="habit-checklist__main habit-checklist__main--todo">
                <div className="habit-checklist__todo-header">
                  <div className="habit-checklist__todo-title-row">
                    <h3 className="habit-checklist__todo-title">Completed • todos</h3>
                  </div>
                  <div className="habit-checklist__todo-badges">
                    <span className="habit-checklist__todo-badge habit-checklist__todo-badge--done">{completedTodos.length} done</span>
                  </div>
                </div>
                <ul className="habit-checklist" role="list">
                  {completedTodos.map((todo, completedTodoIndex) => {
                    const isExpanded = Boolean(expandedTodayTodoById[todo.id]);
                    const todoDisplayTitle = isPrivateCompactView ? `Completed todo ${completedTodoIndex + 1}` : todo.title;
                    return (
                    <li key={todo.id} className="habit-checklist__item habit-checklist__item--todo habit-checklist__item--completed">
                      <div
                        className={`habit-checklist__row ${isExpanded ? 'habit-checklist__row--expanded' : ''}`}
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        onClick={() => toggleTodayTodoExpanded(todo.id)}
                        onKeyDown={(event) => {
                          if (event.currentTarget !== event.target) return;
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            toggleTodayTodoExpanded(todo.id);
                          }
                        }}
                      >
                        <button
                          type="button"
                          className="habit-checklist__todo-check"
                          aria-label={`Mark ${todoDisplayTitle} active again`}
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleToggleTodayTodo(todo);
                          }}
                        >
                          ✅
                        </button>
                        <div className="habit-checklist__main habit-checklist__main--todo">
                          <div className="habit-checklist__todo-header">
                            <div className="habit-checklist__todo-title-row">
                              <h3 className="habit-checklist__todo-title">{todoDisplayTitle}</h3>
                            </div>
                            <div className="habit-checklist__todo-badges">
                              <span className="habit-checklist__todo-badge habit-checklist__todo-badge--done">Done today</span>
                              {todo.updated_at ? <p className="habit-checklist__todo-completed-at">Completed {formatTimeLabel(new Date(todo.updated_at))}</p> : null}
                            </div>
                          </div>
                          {isExpanded ? (
                            <>
                              {isPrivateCompactView ? <p className="habit-checklist__todo-note-placeholder">Notes hidden in compact private view.</p> : todo.notes ? <p className="habit-checklist__note habit-checklist__todo-note">{todo.notes}</p> : <p className="habit-checklist__todo-note-placeholder">No notes were saved for this todo.</p>}
                              <div className="habit-checklist__todo-actions" onClick={(event) => event.stopPropagation()}>
                                <span className="habit-checklist__todo-actions-label">Quick actions</span>
                                <button type="button" onClick={() => void handleToggleTodayTodo(todo)} disabled={Boolean(todayTodoActionPendingById[todo.id])}>Mark active again</button>
                                {!isPrivateCompactView ? <button type="button" onClick={() => handleOpenEditTodayTodo(todo)} disabled={Boolean(todayTodoActionPendingById[todo.id])}>Edit</button> : null}
                              </div>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </li>
                    );
                  })}
                </ul>
              </div>
            </li>
          ) : null}
          {visibleHabits.map((habit, habitIndex) => {
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
            const shouldCollapseCheckbox = collapseCheckboxUntilExpanded && !isExpanded;
            const isJustCompleted = justCompletedHabitId === habit.id;
            const feedbackClassName = isJustCompleted ? getHabitFeedbackClassName(habitFeedbackById[habit.id] ?? 'quick-win') : '';
            const linkedVisionImage = visionImagesByHabit.get(habit.id);
            const isOfferHabit = isTimeLimitedOfferActive && offerHabitIds.has(habit.id);
            const offerPrice = offerPriceByHabitId(habit.id);
            const defaultPrice = defaultPriceByHabitId(habit.id);
            const rhythm = extractHabitRhythm(habit.schedule);
            const rhythmBonusPrice = getHabitRhythmBonusGold({
              baseGold: defaultPrice,
              schedule: habit.schedule,
              healthState: habitHealthByHabitId[habit.id],
              completed: isCompleted,
              scheduledToday,
            });
            const effectiveDisplayPrice = offerPrice ?? rhythmBonusPrice ?? defaultPrice;
            const isSkipDisabled = isOfferHabit;
            const autoProgressHabit = buildAutoProgressHabit(habit);
            const autoProgressState = getAutoProgressState(autoProgressHabit);
            const scalePlan = getHabitScalePlan(autoProgressHabit);
            const progressContent = getHabitProgressContent(habit, scalePlan.enabled);
            const downshiftTier = getNextDownshiftTier(autoProgressState.tier);
            const upgradeTier = getNextUpgradeTier(autoProgressState.tier);
            const adherenceSnapshot = adherenceByHabit[habit.id];
            const habitHealthState = habitHealthByHabitId[habit.id] ?? 'active';
            const habitHealthAssessment = habitHealthAssessmentsByHabitId[habit.id] ?? null;
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
            const isQuestHabit = questHabit?.habitId === habit.id;
            const habitDisplayName = isPrivateCompactView ? `Private habit ${habitIndex + 1}` : habit.name;
            // Struggling-habit coach (deterministic; shown inside the expanded card).
            // Hidden in compact private view to avoid leaking habit specifics.
            const coachCard =
              !isPrivateCompactView && habitHealthAssessment
                ? buildHabitCoachCard({
                    habitName: habit.name,
                    assessment: habitHealthAssessment,
                    adherencePercent: adherenceSnapshot ? adherencePercent : null,
                    streakDays,
                    hasDownshiftOption: Boolean(downshiftTier) || Boolean(suggestedDownshiftStage),
                    hasEnvironmentCue: Boolean(habit.habit_environment && habit.habit_environment.trim()),
                  })
                : null;

            return (
              <li
                key={habit.id}
                ref={(node) => {
                  habitCardRefs.current[habit.id] = node;
                }}
                tabIndex={-1}
                className={`habit-checklist__item ${!scheduledToday ? 'habit-checklist__item--rest' : ''} ${
                  isCompleted ? 'habit-checklist__item--completed' : ''
                } ${isJustCompleted ? `habit-item--just-completed ${feedbackClassName}` : ''} ${
                  isOfferHabit ? 'habit-checklist__item--offer' : ''
                } ${isQuestHabit ? 'habit-checklist__item--quest' : ''} ${isExpanded ? 'habit-checklist__item--expanded' : ''} ${
                  dailyLifeUpgradeHighlightedHabitId === habit.id ? 'habit-card--daily-life-upgrade-target' : ''
                }`}
              >
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
                      className={`habit-checklist__row ${isExpanded ? 'habit-checklist__row--expanded' : ''} ${collapseCheckboxUntilExpanded ? 'habit-checklist__row--collapsible-checkbox' : ''}`}
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
                      <span
                        className="habit-checklist__checkbox-shell"
                        aria-hidden={shouldCollapseCheckbox ? 'true' : undefined}
                      >
                        <input
                          id={checkboxId}
                          type="checkbox"
                          className="habit-checklist__checkbox"
                          checked={isCompleted}
                          aria-label={`Mark ${habitDisplayName} as ${isCompleted ? 'incomplete' : 'complete'}`}
                          tabIndex={shouldCollapseCheckbox ? -1 : undefined}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => {
                            event.stopPropagation();
                            void toggleHabit(habit, event.currentTarget);
                          }}
                          disabled={shouldCollapseCheckbox || isSaving || (!scheduledToday && !isCompleted)}
                        />
                      </span>
                      <div className="habit-checklist__main">
                        <span className="habit-checklist__name">
                          {!isCompactView && habit.emoji ? (
                            <span className="habit-checklist__icon" aria-hidden="true">
                              {habit.emoji}
                            </span>
                          ) : null}
                          {habitDisplayName}
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
                          {!isOfferHabit && rhythmBonusPrice ? (
                            <span className="habit-checklist__offer-timer" aria-label={`${getHabitRhythmLabel(rhythm.daypart)} rhythm bonus active`}>
                              {getHabitRhythmEmoji(rhythm.daypart)} {getHabitRhythmLabel(rhythm.daypart)} {getHabitRhythmMultiplier(habitHealthState)}x
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
                      <div className="habit-checklist__reward-rail" aria-label="Habit rewards and quest marker">
                        {(shouldShowHabitPoints || isOfferHabit || rhythmBonusPrice) ? (
                          <PointsBadge
                            value={effectiveDisplayPrice}
                            className={`habit-points-badge${
                              isOfferHabit || rhythmBonusPrice ? ' habit-points-badge--offer' : ''
                            }`}
                            size="mini"
                            ariaLabel={
                              isOfferHabit && offerPrice !== null
                                ? `Limited offer: ${offerPrice} diamonds`
                                : rhythmBonusPrice
                                  ? `${getHabitRhythmLabel(rhythm.daypart)} rhythm bonus: ${rhythmBonusPrice} diamonds`
                                : `Dynamic habit reward: ${defaultPrice} diamonds`
                            }
                          />
                        ) : null}
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
                          {isQuestHabit ? '★' : '☆'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className={`habit-checklist__details-panel ${
                    isExpanded ? 'habit-checklist__details-panel--open' : ''
                  }`}
                  id={detailPanelId}
                >
                  {coachCard ? (
                    <section
                      className={`habit-checklist__detail-block habit-checklist__coach habit-checklist__coach--${coachCard.state}`}
                      aria-label="Habit coach"
                    >
                      <div className="habit-checklist__detail-block-header">
                        <span className="habit-checklist__coach-badge">
                          {getHabitHealthBadgeLabel(coachCard.state)}
                        </span>
                        <span className="habit-checklist__detail-block-label">{coachCard.headline}</span>
                      </div>
                      <p className="habit-checklist__coach-message">{coachCard.message}</p>
                      <ul className="habit-checklist__coach-tips">
                        {coachCard.tips.map((tip) => (
                          <li key={tip.id} className="habit-checklist__coach-tip">
                            <span className="habit-checklist__coach-tip-label">{tip.label}</span>
                            <span className="habit-checklist__coach-tip-detail">{tip.detail}</span>
                          </li>
                        ))}
                      </ul>
                      {onOpenAiCoach ? (
                        <button
                          type="button"
                          className="habit-checklist__coach-ai-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpenAiCoach(coachCard.aiPrompt);
                          }}
                        >
                          Ask the coach for a plan
                        </button>
                      ) : null}
                    </section>
                  ) : null}
                  <section className="habit-checklist__detail-block habit-checklist__detail-block--info" aria-label="Habit info">
                    <div className="habit-checklist__detail-block-header">
                      <span className="habit-checklist__detail-block-label">Info</span>
                    </div>
                    {isPrivateCompactView ? (
                      <p className="habit-checklist__todo-note-placeholder">Habit details hidden in compact private view.</p>
                    ) : (
                      <>
                        <div
                          className={`habit-checklist__info-grid${
                            linkedVisionImage ? ' habit-checklist__info-grid--with-image' : ''
                          }`}
                        >
                          {linkedVisionImage ? (
                            <button
                              type="button"
                              className="habit-checklist__vision-tile"
                              onClick={(event) => {
                                event.stopPropagation();
                                setVisionPreviewImage(linkedVisionImage);
                              }}
                              aria-label={`View vision board image for ${habitDisplayName}`}
                            >
                              <img src={linkedVisionImage.publicUrl} alt="" aria-hidden="true" />
                            </button>
                          ) : null}
                          <div className="habit-checklist__info-tile habit-checklist__info-tile--domain">
                            <span className="habit-checklist__info-tile-label">Life wheel</span>
                            <span className="habit-checklist__info-tile-value">{domainLabel ?? 'Unassigned'}</span>
                          </div>
                          <div className="habit-checklist__info-tile habit-checklist__info-tile--goal">
                            <span className="habit-checklist__info-tile-label">Goal</span>
                            <span className="habit-checklist__info-tile-value">{goalLabel}</span>
                          </div>
                          {lastCompletedText ? (
                            <div className="habit-checklist__info-tile habit-checklist__info-tile--last-completed">
                              <span className="habit-checklist__info-tile-label">Last completed</span>
                              <span className="habit-checklist__info-tile-value">
                                {lastCompletedText.replace(/^Last completed\s*/i, '')}
                              </span>
                            </div>
                          ) : null}
                        </div>
                        {habit.habit_environment ? (
                          <div className="habit-checklist__environment">
                            <p className="habit-checklist__environment-label">📍 Where &amp; How</p>
                            <p className="habit-checklist__environment-text">{habit.habit_environment}</p>
                          </div>
                        ) : null}
                      </>
                    )}
                  </section>
                  <section className={`habit-checklist__detail-block habit-checklist__detail-block--progress habit-checklist__detail-block--kind-${progressContent.chipVariant}`} aria-label={progressContent.ariaLabel}>
                    <div className="habit-checklist__detail-block-header habit-checklist__progress-header">
                      <span className="habit-checklist__progress-icon">
                        <HabitVersionIcon name={progressContent.iconName} />
                      </span>
                      <div>
                        <span className="habit-checklist__detail-block-label">{progressContent.sectionLabel}</span>
                        <p className="habit-checklist__progress-helper">{progressContent.helperText}</p>
                      </div>
                    </div>
                    {state?.progressState === 'doneIsh' && state?.completionPercentage ? (
                      <div className="habit-checklist__progress">
                        <div className="progress-bar-container">
                          <div
                            className="progress-bar-fill doneish"
                            style={{ width: `${state.completionPercentage}%` }}
                          />
                        </div>
                        <p className="habit-checklist__progress-text">
                          Logged as {state.completionPercentage}% complete
                        </p>
                      </div>
                    ) : null}
                    {state?.loggedStage ? (
                      <p className="habit-checklist__note habit-checklist__logged-stage">
                        Logged today: <strong>{getStageDisplayLabel(scalePlan.stages[state.loggedStage], state.loggedStage, progressContent)}</strong>
                      </p>
                    ) : null}
                    {scalePlan.enabled ? (
                      <div className="habit-checklist__stage-group">
                        <span className="habit-checklist__stage-group-label">{progressContent.actionLabel}</span>
                        <div className="habit-checklist__stage-actions">
                          {SCALE_STAGE_ORDER.map((stage) => {
                            const stageInfo = scalePlan.stages[stage];
                            const stageLabel = getStageDisplayLabel(stageInfo, stage, progressContent);
                            return (
                              <button
                                key={`${habit.id}-${stage}`}
                                type="button"
                                className={`habit-checklist__stage-chip habit-checklist__stage-chip--${progressContent.chipVariant} ${
                                  stage === autoProgressState.tier ? 'habit-checklist__stage-chip--active' : ''
                                }`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleLogHabitAtStage(habit, stage, event.currentTarget);
                                }}
                                disabled={isSaving}
                                title={`Log ${progressContent.sectionLabel.toLowerCase()} as ${stageLabel}: ${stageInfo.completionPercent}% credit`}
                                aria-label={`Log ${habit.name} as ${stageLabel}, ${stageInfo.completionPercent} percent credit`}
                              >
                                <span className="habit-checklist__stage-chip-icon"><HabitVersionIcon name={stage === 'standard' ? progressContent.iconName : stage === 'minimum' ? 'steps' : 'spark'} /></span>
                                <span className="habit-checklist__stage-chip-copy">
                                  <span className="habit-checklist__stage-chip-title">{stageLabel}</span>
                                  <span className="habit-checklist__stage-chip-meta">{stageInfo.completionPercent}% credit</span>
                                </span>
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
                  {!isPrivateCompactView ? (
                    <section
                      className="habit-checklist__detail-block habit-checklist__detail-block--understand"
                      aria-label="Understand and improve this habit"
                    >
                      <div className="habit-checklist__detail-block-header">
                        <span className="habit-checklist__detail-block-label">Understand &amp; Improve</span>
                      </div>
                      <p className="habit-checklist__understand-hint">
                        Optional — explore what drives this habit when you’re curious.
                      </p>
                      <div className="habit-checklist__understand-actions">
                        <button
                          type="button"
                          className="habit-checklist__understand-btn"
                          disabled={isSaving}
                          onClick={(event) => {
                            event.stopPropagation();
                            setAnalysisHabitId(habit.id);
                          }}
                        >
                          <span className="habit-checklist__understand-btn-title">Cue → routine → reward</span>
                          <small>Guided deep dive into the habit loop</small>
                        </button>
                        <button
                          type="button"
                          className="habit-checklist__understand-btn"
                          disabled={isSaving}
                          onClick={(event) => {
                            event.stopPropagation();
                            setChainHabitId(habit.id);
                          }}
                        >
                          <span className="habit-checklist__understand-btn-title">Chain &amp; keystone</span>
                          <small>Map ripple effects on other habits &amp; life areas</small>
                        </button>
                      </div>
                    </section>
                  ) : null}
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
            onClick={toggleCompletedArchive}
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
          : null;

    const statusVariant = errorMessage
      ? 'error'
      : isDemoExperience
        ? 'info'
        : !isConfigured
          ? 'warning'
          : null;
    const checklistCardClassName = `habit-checklist-card${isCompactView ? '' : ' habit-checklist-card--glass'}${
      isPrivateCompactView ? ' habit-checklist-card--private-view' : ''
    }${selectedAmbiance ? ' habit-checklist-card--ambiance' : ''}`;

    const todayWinsTiles = [
      { id: 'habits', icon: '✅', label: 'Habits', value: completedCount },
      { id: 'journal', icon: '📓', label: 'Journal', value: todayWinsSummary.journalCount },
      { id: 'actions', icon: '⚡', label: 'Actions', value: completedActionsCount },
      { id: 'lotus', icon: '🪷', label: 'Lotus', value: todayWinsSummary.lotusEarned },
      { id: 'xp', icon: '⭐', label: 'XP', value: todayWinsSummary.xpEarned },
      { id: 'game-total', icon: '🎮', label: 'Game', value: todayWinsSummary.gameRewardsTotal },
      { id: 'game-gold', icon: '🪙', label: 'Gold', value: todayWinsSummary.gameGoldEarned },
      { id: 'game-dice', icon: '🎲', label: 'Dice', value: todayWinsSummary.gameDiceEarned },
      { id: 'game-token', icon: '🎟️', label: 'Game Tokens', value: todayWinsSummary.gameTokensEarned },
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
      todayWinsTier === 'three_star' ? '3 Stars' : todayWinsTier === 'two_star' ? '2 Stars' : todayWinsTier === 'one_star' ? '1 Star' : '0 Stars';
    const todayWinsStarCount =
      todayWinsTier === 'three_star' ? 3 : todayWinsTier === 'two_star' ? 2 : todayWinsTier === 'one_star' ? 1 : 0;
    const todayWinsStarItems = Array.from({ length: todayWinsStarCount }, (_, index) => index);
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
        className={`habit-checklist-card__progress habit-checklist-card__progress--top-badge habit-checklist-card__progress--${orbState}${
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
    const handleLaunchQuickJournalMode = (mode: QuickJournalMode) => {
      setQuickJournalMode(mode);
      handleOpenQuickJournal();
    };

    const handleSaveQuickJournalDraft = () => {
      if (quickJournalMode === 'written') {
        const hasContent = Boolean(
          quickJournalMorning.trim() ||
            quickJournalDay.trim() ||
            quickJournalEvening.trim() ||
            quickJournalInteractions.trim() ||
            quickJournalFreeform.trim() ||
            quickJournalPleasantMoments.trim()
        );

        if (!hasContent) {
          setQuickJournalError('Add at least one entry before saving.');
          return;
        }
      } else if (quickJournalMode === 'simple') {
        const hasSimpleContent = Boolean(
          quickJournalSimplePositive.trim() || quickJournalSimpleTricky.trim(),
        );
        if (!hasSimpleContent) {
          setQuickJournalError('Add at least one quick reflection before saving.');
          return;
        }
      } else if (quickJournalMode === 'habit_investigation') {
        const hasHabitInsightContent = Boolean(
          quickJournalHabitSituation.trim() ||
            quickJournalHabitTrigger.trim() ||
            quickJournalHabitNeed.trim() ||
            quickJournalHabitNextExperiment.trim(),
        );
        if (!hasHabitInsightContent) {
          setQuickJournalError('Add at least one habit insight before saving.');
          return;
        }
      } else if (quickJournalMode === 'dream') {
        const hasDreamContent = Boolean(
          quickDreamTitle.trim() ||
            quickDreamSymbols.trim() ||
            quickDreamEmotions.trim() ||
            quickDreamReflection.trim() ||
            quickDreamTone ||
            quickDreamToneDetail,
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
        pleasantMoments: quickJournalPleasantMoments,
        simplePositive: quickJournalSimplePositive,
        simpleTricky: quickJournalSimpleTricky,
        habitSituation: quickJournalHabitSituation,
        habitTrigger: quickJournalHabitTrigger,
        habitNeed: quickJournalHabitNeed,
        habitNextExperiment: quickJournalHabitNextExperiment,
        energy: quickJournalEnergy,
        mood: quickJournalMood,
        focus: quickJournalFocus,
        stress: quickJournalStress,
        isPrivate: quickJournalIsPrivate,
        dreamTitle: quickDreamTitle,
        dreamSymbols: quickDreamSymbols,
        dreamEmotions: quickDreamEmotions,
        dreamReflection: quickDreamReflection,
        dreamTone: quickDreamTone,
        dreamToneDetail: quickDreamToneDetail,
        dreamToneDetailOpen: isQuickDreamToneDetailOpen,
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
        if (quickJournalPleasantMoments.trim()) {
          parts.push(`🌱 Today's gratitude / pleasant moment(s):\n${quickJournalPleasantMoments.trim()}`);
        }
      } else if (quickJournalMode === 'simple') {
        if (quickJournalSimplePositive.trim()) {
          parts.push(`🌿 What felt good today?\n${quickJournalSimplePositive.trim()}`);
        }
        if (quickJournalSimpleTricky.trim()) {
          parts.push(`🫶 What felt heavy or tricky?\n${quickJournalSimpleTricky.trim()}`);
        }
      } else if (quickJournalMode === 'habit_investigation') {
        if (quickJournalHabitSituation.trim()) {
          parts.push(`🔎 What happened?\n${quickJournalHabitSituation.trim()}`);
        }
        if (quickJournalHabitTrigger.trim()) {
          parts.push(`🧭 What seemed to trigger it?\n${quickJournalHabitTrigger.trim()}`);
        }
        if (quickJournalHabitNeed.trim()) {
          parts.push(`💛 What was I needing or trying to avoid?\n${quickJournalHabitNeed.trim()}`);
        }
        if (quickJournalHabitNextExperiment.trim()) {
          parts.push(`🌱 What small experiment could I try next time?\n${quickJournalHabitNextExperiment.trim()}`);
        }
      } else {
        const selectedDreamToneDetail = quickDreamToneDetail
          ?? (quickDreamTone ? QUICK_DREAM_PRIMARY_TO_DETAIL[quickDreamTone] : null);
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
        if (quickDreamTone) {
          const primaryLabel = QUICK_DREAM_PRIMARY_TONE_OPTIONS.find((option) => option.value === quickDreamTone)?.label;
          if (primaryLabel) {
            parts.push(`🧭 Dream tone:\n${primaryLabel}`);
          }
        }
        if (selectedDreamToneDetail) {
          parts.push(`🔎 Tone detail:\n${QUICK_DREAM_DETAIL_META[selectedDreamToneDetail].label}`);
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

      const selectedDreamToneDetail = quickJournalMode === 'dream'
        ? quickDreamToneDetail ?? (quickDreamTone ? QUICK_DREAM_PRIMARY_TO_DETAIL[quickDreamTone] : null)
        : null;
      const dreamToneMeta = selectedDreamToneDetail ? QUICK_DREAM_DETAIL_META[selectedDreamToneDetail] : null;
      const payloadTags = quickJournalMode === 'pulse'
        ? ['nonverbal', 'pulse-check-in']
        : quickJournalMode === 'dream'
          ? ['dream', 'sleep', 'quick-entry', ...(dreamToneMeta ? [dreamToneMeta.tag] : [])]
          : quickJournalMode === 'simple'
            ? ['quick-simple', 'gentle-reflection']
            : quickJournalMode === 'habit_investigation'
              ? ['habit-insight', 'behavior-pattern']
              : quickJournalPleasantMoments.trim()
                ? ['gratitude-moment', 'pleasant-moments']
                : null;
      const payloadAttachments: Json | null = quickJournalMode === 'dream' && (quickDreamTone || selectedDreamToneDetail)
        ? ({
            dreamTone: {
              primary: quickDreamTone,
              detail: selectedDreamToneDetail,
            },
          } as Json)
        : null;

      try {
        const payload: Database['public']['Tables']['journal_entries']['Insert'] = {
          user_id: session.user.id,
          entry_date: activeDate,
          title: null,
          content,
          mood: quickJournalMode === 'dream' ? dreamToneMeta?.mood ?? null : null,
          linked_goal_ids: null,
          linked_habit_ids: null,
          is_private: quickJournalIsPrivate,
          attachments: payloadAttachments,
          type: quickJournalMode === 'dream'
            ? 'dream'
            : quickJournalMode === 'simple'
              ? 'quick_simple'
              : quickJournalMode === 'habit_investigation'
                ? 'habit_investigation'
                : 'quick',
          mood_score: quickJournalMode === 'dream' ? dreamToneMeta?.moodScore ?? null : null,
          category: quickJournalMode === 'pulse'
            ? 'nonverbal'
            : quickJournalMode === 'simple'
              ? 'simple_reflection'
              : quickJournalMode === 'habit_investigation'
                ? 'habit_insight'
                : null,
          unlock_date: null,
          goal_id: null,
          tags: payloadTags,
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
        setOpenTodayExpandableSection((current) => (current === 'quickJournal' ? null : current));
        setQuickJournalMode('written');
        setQuickJournalMorning('');
        setQuickJournalDay('');
        setQuickJournalEvening('');
        setQuickJournalInteractions('');
        setQuickJournalFreeform('');
        setQuickJournalPleasantMoments('');
        setQuickJournalEnergy(QUICK_JOURNAL_PULSE_DEFAULTS.energy);
        setQuickJournalMood(QUICK_JOURNAL_PULSE_DEFAULTS.mood);
        setQuickJournalFocus(QUICK_JOURNAL_PULSE_DEFAULTS.focus);
        setQuickJournalStress(QUICK_JOURNAL_PULSE_DEFAULTS.stress);
        setQuickDreamTitle(QUICK_JOURNAL_DREAM_DEFAULTS.title);
        setQuickDreamSymbols(QUICK_JOURNAL_DREAM_DEFAULTS.symbols);
        setQuickDreamEmotions(QUICK_JOURNAL_DREAM_DEFAULTS.emotions);
        setQuickDreamReflection(QUICK_JOURNAL_DREAM_DEFAULTS.reflection);
        setQuickDreamTone(null);
        setQuickDreamToneDetail(null);
        setIsQuickDreamToneDetailOpen(false);
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

    const showIntentionsOnlyRow = Boolean(yesterdayIntentionsEntry && !isIntentionsNoticeViewed && !isCompactView);
    const showIntentionsButton = Boolean(yesterdayIntentionsEntry);
    const intentionsButtonClassName = `habit-checklist-card__intentions-button ${
      isIntentionsNoticeViewed ? 'habit-checklist-card__intentions-button--seen habit-checklist-card__intentions-button--compact' : ''
    }`;
    const todayActionableContracts = activeContracts.filter((contract) => isPromiseActionableToday(contract));
    const contractsStatusChip = !isContractsFeatureOpen
      ? { label: DEMO_FEATURE_LABEL, tone: 'accent' as const }
      : contractsError
      ? { label: 'Error', tone: 'error' as const }
      : contractsLoading
        ? { label: 'Loading…', tone: 'loading' as const }
        : {
            label: todayActionableContracts.length === 1 ? '1 now' : `${todayActionableContracts.length} now`,
            tone: 'accent' as const,
          };
    const routinesStatusChip = !isRoutinesFeatureOpen
      ? { label: DEMO_FEATURE_LABEL, tone: 'accent' as const }
      : routinesTodaySummary.status === 'error'
      ? { label: 'Error', tone: 'error' as const }
      : routinesTodaySummary.status === 'loading'
        ? { label: 'Loading…', tone: 'loading' as const }
        : routinesTodaySummary.dueCount === 0
          ? { label: 'No routines', tone: 'neutral' as const }
          : {
              label: routinesTodaySummary.dueCount === 1 ? '1 due' : `${routinesTodaySummary.dueCount} due`,
              tone: 'accent' as const,
            };
    const hasQuickJournalDraft = hasQuickJournalDraftState({
      isQuickJournalOpen,
      quickJournalMorning,
      quickJournalDay,
      quickJournalEvening,
      quickJournalInteractions,
      quickJournalFreeform,
      quickJournalPleasantMoments,
      quickJournalSimplePositive,
      quickJournalSimpleTricky,
      quickJournalHabitSituation,
      quickJournalHabitTrigger,
      quickJournalHabitNeed,
      quickJournalHabitNextExperiment,
      quickDreamTitle,
      quickDreamSymbols,
      quickDreamEmotions,
      quickDreamReflection,
      quickDreamTone,
      quickDreamToneDetail,
    });
    const quickJournalStatusChip = quickJournalError
      ? { label: 'Error', tone: 'error' as const }
      : quickJournalStatus
        ? {
            label: quickJournalStatus === 'Draft saved for later.'
              ? 'Draft saved'
              : quickJournalStatus === 'Submitted to your journal.'
                ? 'Saved'
                : quickJournalStatus,
            tone: quickJournalStatus === 'Draft saved for later.' ? 'accent' as const : 'success' as const,
          }
        : hasQuickJournalDraft
          ? { label: 'Draft', tone: 'accent' as const }
          : null;
    const intentionsSummaryLabel = getIntentionsSummaryLabel(todayIntentionsEntry, nextDayIntentionsEntry);
    const intentionsStatusChip = intentionsJournalError
      ? { label: 'Error', tone: 'error' as const }
      : intentionsJournalStatus
        ? { label: 'Saved', tone: 'success' as const }
        : {
            label: intentionsSummaryLabel,
            tone: (todayIntentionsEntry || nextDayIntentionsEntry) ? 'accent' as const : 'neutral' as const,
          };
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
          <div className="today-wins-modal__progress-ring-wrap" aria-hidden="true">
            <svg className="today-wins-modal__progress-ring-svg" viewBox="0 0 36 36">
              <defs>
                <linearGradient id={`${progressGradientId}-modal`} x1="0%" y1="0%" x2="100%" y2="100%">
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
                stroke={`url(#${progressGradientId}-modal)`}
              />
            </svg>
            <span className="today-wins-modal__progress-count">{todayWinsTileCount}</span>
            <span className="today-wins-modal__progress-symbol">{orbIcon}</span>
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
    const intentionsModalContent = yesterdayIntentionsEntry && isIntentionsNoticeOpen ? (
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
    ) : null;
    const intentionsModal = intentionsModalContent
      ? modalRoot
        ? createPortal(intentionsModalContent, modalRoot)
        : intentionsModalContent
      : null;

    return (
      <div
        className={checklistCardClassName}
        role="region"
        aria-label={ariaLabel}
      >
        {selectedAmbiance === 'starlight' ? (
          <div className="habit-checklist-card__ambiance-layer habit-checklist-card__ambiance-layer--starlight" aria-hidden="true">
            <span className="habit-checklist-card__ambiance-orb habit-checklist-card__ambiance-orb--one" />
            <span className="habit-checklist-card__ambiance-orb habit-checklist-card__ambiance-orb--two" />
            <span className="habit-checklist-card__ambiance-orb habit-checklist-card__ambiance-orb--three" />
          </div>
        ) : null}
        {intentionsModal}
        {todayWinsModal}
        <div className="habit-checklist-card__board">
          {!isCompactView ? (
            todayWinsTier !== 'zero_star' ? (
              <button
                type="button"
                className={`habit-checklist-card__today-wins-stars habit-checklist-card__today-wins-stars--${todayWinsStarCount}`}
                onClick={() => setIsTodayWinsOpen(true)}
                aria-label={`Open Today's Wins: ${todayWinsStarsLabel}`}
              >
                {todayWinsStarItems.map((starIndex) => (
                  <span key={starIndex} className="habit-checklist-card__today-wins-star" aria-hidden="true">
                    ★
                  </span>
                ))}
              </button>
            ) : progressNode
          ) : null}
          <div className="habit-checklist-card__board-head">
            <div className="habit-checklist-card__date-wrap">
              <div className="habit-checklist-card__date-group">
                <p className="habit-checklist-card__date">
                  <span className="habit-checklist-card__date-year">{yearLabel}</span>
                  <span className="habit-checklist-card__date-text">{dateLabel}</span>
                </p>
              </div>
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
                            JUMP TO TODAY
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
                <button
              type="button"
              className="habit-checklist-card__starter-launcher habit-checklist-card__todo-launcher"
              onClick={handleOpenCreateTodayTodo}
            >
              Todo
            </button>
            {onOpenStarterQuest ? (
                  <button
                    type="button"
                    className="habit-checklist-card__starter-empty-launcher"
                    onClick={() => onOpenStarterQuest()}
                    aria-label="Choose a starter quest"
                  >
                    Choose starter quest
                  </button>
                ) : null}
              </div>
            ) : (
              renderCompactList()
            )}
            {ambianceModalOpen ? createPortal(
              <div className="habit-edit-modal-overlay" role="presentation" onClick={() => setAmbianceModalOpen(false)}>
                <div
                  className="habit-edit-modal-content habit-ambiance-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Ambiance picker"
                  onClick={(event) => event.stopPropagation()}
                >
                  <h3>Ambiance</h3>
                  <p className="habit-edit-modal-subcopy">
                    Placeholder picker: ambiance lives on the Today tab bottom layer, then the task surface above it blurs so higher UI stays clear.
                  </p>
                  <div className="habit-ambiance-modal__grid" role="list" aria-label="Ambiance animation options">
                    {Array.from({ length: 24 }, (_, index) => {
                      const isFirst = index === 0;
                      return (
                        <button
                          key={index}
                          type="button"
                          className={`habit-ambiance-modal__option${isFirst && selectedAmbiance === 'starlight' ? ' habit-ambiance-modal__option--active' : ''}`}
                          onClick={() => {
                            if (isFirst) {
                              setSelectedAmbiance((current) => (current === 'starlight' ? null : 'starlight'));
                            }
                          }}
                          disabled={!isFirst}
                          aria-pressed={isFirst ? selectedAmbiance === 'starlight' : undefined}
                        >
                          <span>{isFirst ? '✨' : '＋'}</span>
                          <small>{isFirst ? 'Starlight drift' : `Idea ${index + 1}`}</small>
                        </button>
                      );
                    })}
                  </div>
                  <div className="habit-ambiance-modal__ideas">
                    <strong>Brainstorm queue:</strong> fireflies, rain on glass, aurora waves, floating petals, ocean shimmer, fireplace glow, soft snow, drifting clouds.
                  </div>
                  <div className="habit-edit-modal-actions">
                    <button type="button" className="habit-edit-modal-secondary" onClick={() => setSelectedAmbiance(null)}>Clear</button>
                    <button type="button" className="habit-edit-modal-primary" onClick={() => setAmbianceModalOpen(false)}>Done</button>
                  </div>
                </div>
              </div>,
              document.body,
            ) : null}
            {todayTodoModalOpen ? createPortal(
              <div className="habit-edit-modal-overlay" role="presentation" onClick={handleCloseTodayTodoModal}>
                <div
                  className="habit-edit-modal-content"
                  role="dialog"
                  aria-modal="true"
                  aria-label={editingTodayTodo ? 'Edit today todo' : 'Add today todo'}
                  onClick={(event) => event.stopPropagation()}
                >
                  <h3>{editingTodayTodo ? 'Edit todo' : 'Add today todo'}</h3>
                  <p className="habit-edit-modal-subcopy">
                    {editingTodayTodo
                      ? 'Update the title, details, or move this task forward to another day.'
                      : 'Capture one concrete task and choose when it should show up.'}
                  </p>
                  <label>
                    Todo title
                    <input placeholder="e.g., Outline Q3 onboarding email" value={todayTodoTitle} onChange={(event) => setTodayTodoTitle(event.target.value)} maxLength={120} />
                  </label>
                  <label>
                    Details / notes (optional)
                    <textarea rows={4} placeholder="Add context, blockers, or first next step." value={todayTodoNotes} onChange={(event) => setTodayTodoNotes(event.target.value)} />
                  </label>
                  <label>
                    Estimated time (minutes, optional)
                    <input
                      type="number"
                      min={1}
                      max={480}
                      placeholder="e.g., 25"
                      value={todayTodoEstimatedMinutes}
                      onChange={(event) => {
                        const val = event.target.value;
                        setTodayTodoEstimatedMinutes(val === '' ? '' : Math.max(1, Math.min(480, parseInt(val, 10))));
                      }}
                    />
                  </label>
                  <label className="habit-edit-modal-focus-label">
                    <input
                      type="checkbox"
                      checked={todayTodoIsFocus}
                      onChange={(event) => setTodayTodoIsFocus(event.target.checked)}
                    />
                    <span>⭐ Mark as focus todo <span className="habit-edit-modal-focus-hint">(only one todo can be the focus at a time)</span></span>
                  </label>
                  <label>
                    Scheduled date
                    <input type="date" value={todayTodoDate} min={activeDate} onChange={(event) => setTodayTodoDate(event.target.value)} />
                  </label>
                  {editingTodayTodo ? (
                    <button
                      type="button"
                      className="habit-checklist__todo-action-btn"
                      onClick={() => setTodayTodoDate(formatISODate(addDays(new Date(`${editingTodayTodo.todo_date}T12:00:00`), 1)))}
                    >
                      Move to next day
                    </button>
                  ) : null}
                  {todayTodoError ? <p className="habit-checklist__skip-error">{todayTodoError}</p> : null}
                  <div className="habit-edit-modal-actions">
                    <button type="button" className="habit-edit-cancel-btn" onClick={handleCloseTodayTodoModal} disabled={todayTodoSaving}>Cancel</button>
                    <button type="button" className="habit-edit-save-btn" onClick={() => void handleSaveTodayTodo()} disabled={todayTodoSaving}>
                      {todayTodoSaving ? 'Saving…' : editingTodayTodo ? 'Save changes' : 'Save Todo'}
                    </button>
                  </div>
                </div>
              </div>, document.body
            ) : null}
            {analysisHabitId ? (
              <HabitImprovementAnalysisModal
                isOpen={Boolean(analysisHabitId)}
                userId={session.user.id}
                habitId={analysisHabitId}
                habitName={habits.find((habit) => habit.id === analysisHabitId)?.name ?? 'Habit'}
                onClose={() => setAnalysisHabitId(null)}
                onProtocolStarted={() => handleHabitReviewDeepFixProtocolStarted(analysisHabitId)}
              />
            ) : null}

            {chainHabitId ? (
              <HabitChainAnalysisModal
                isOpen={Boolean(chainHabitId)}
                userId={session.user.id}
                sourceHabitId={chainHabitId}
                sourceHabitName={habits.find((habit) => habit.id === chainHabitId)?.name ?? 'Habit'}
                otherHabits={habits
                  .filter((habit) => habit.id !== chainHabitId)
                  .map((habit) => ({ id: habit.id, name: habit.name }))}
                onClose={() => setChainHabitId(null)}
              />
            ) : null}

            {sparkHandEnabled && archetypeHand && !isPrivateCompactView ? (
              <MyPlayerHandPanel hand={archetypeHand} compact />
            ) : null}
            {identitySignalsUnlocked && !isPrivateCompactView ? (
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

            {!hiddenTodayExtraSections.has('routines') ? (
              <TodayExpandableActionSection
                id="today-routines"
                icon="🔁"
                title="Routines"
                subtitle="Run your grouped habits"
                statusChip={routinesStatusChip}
                expanded={openTodayExpandableSection === 'routines'}
                isDemo={!isRoutinesFeatureOpen}
                justAdded={justAddedTodaySection === 'routines'}
                onToggle={() => {
                  if (!isRoutinesFeatureOpen) {
                    onOpenFeaturePreview?.('app.routines', 'Routines');
                    return;
                  }
                  toggleTodayExpandableSection('routines');
                }}
                keepMounted={isRoutinesFeatureOpen}
              >
                {isRoutinesFeatureOpen ? (
                  <RoutinesTodayLane
                    session={session}
                    onHideStandaloneHabitsChange={handleRoutineHiddenHabitIdsChange}
                    onSummaryChange={setRoutinesTodaySummary}
                    variant="panel"
                  />
                ) : (
                  <p className="habit-contracts-card__hint">Routines are in demo for this account.</p>
                )}
              </TodayExpandableActionSection>
            ) : null}

            {!hiddenTodayExtraSections.has('contracts') ? (
              <TodayExpandableActionSection
                id="today-contracts"
                icon="🤝"
                title="Promises"
                subtitle="Promises needing attention now"
                statusChip={contractsStatusChip}
                expanded={openTodayExpandableSection === 'contracts'}
                isDemo={!isContractsFeatureOpen}
                justAdded={justAddedTodaySection === 'contracts'}
                onToggle={() => {
                  if (!isContractsFeatureOpen) {
                    onOpenFeaturePreview?.('app.contracts', 'Promises');
                    return;
                  }
                  toggleTodayExpandableSection('contracts');
                }}
              >
              <div className="habit-contracts-card" aria-live="polite">
                {contractsLoading && todayActionableContracts.length === 0 ? (
                  <p className="habit-contracts-card__hint">Loading promises that need attention…</p>
                ) : todayActionableContracts.length === 0 ? (
                  <p className="habit-contracts-card__hint">
                    No promises need attention right now. Start a promise from the Promises tab and it will appear here when it needs attention.
                  </p>
                ) : (
                  <div className="habit-contracts-card__list">
                    {todayActionableContracts.map((contract) => {
                      const progressPercent = Math.min(100, (contract.currentProgress / contract.targetCount) * 100);
                      const isBusy = contractActionId === contract.id;
                      const isOutcomeOnly = contract.trackingMode === 'outcome_only';
                      const promiseVariant = getPromiseVariant(contract);
                      const canShowPrimaryAction = contract.status === 'active' && !isOutcomeOnly;
                      const primaryActionLabel = promiseVariant === 'reverse' ? 'Log slip' : 'Check in';
                      const stakeLabel = `${contract.stakeAmount} ${contract.stakeType === 'gold' ? 'Gold' : 'Tokens'} staked`;
                      const contractEndDate = contract.endAt ? new Date(contract.endAt) : null;
                      const msLeft = contractEndDate ? contractEndDate.getTime() - Date.now() : null;
                      const daysLeft = msLeft !== null && msLeft > 0 ? Math.ceil(msLeft / (1000 * 60 * 60 * 24)) : 0;
                      const endDateLabel = contractEndDate
                        ? contractEndDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : null;
                      const endInfo = endDateLabel
                        ? daysLeft > 0
                          ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left · Ends ${endDateLabel}`
                          : `Ended ${endDateLabel}`
                        : null;

                      return (
                        <article
                          key={contract.id}
                          className={`habit-contracts-card__item${onNavigateToContracts ? ' habit-contracts-card__item--tappable' : ''}`}
                          onClick={onNavigateToContracts}
                          tabIndex={onNavigateToContracts ? 0 : undefined}
                          onKeyDown={onNavigateToContracts ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigateToContracts(); }
                          } : undefined}
                        >
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
                          <div className="habit-contracts-card__meter" role="presentation" aria-label="Progress">
                            <span className="habit-contracts-card__meter-fill" style={{ width: `${progressPercent}%` }} />
                          </div>
                          {endInfo !== null ? (
                            <p className="habit-contracts-card__end-info">{endInfo}</p>
                          ) : (
                            <p className="habit-contracts-card__end-info habit-contracts-card__end-info--ongoing">Ongoing promise</p>
                          )}
                          {canShowPrimaryAction ? (
                            <div className="habit-contracts-card__actions">
                              <button
                                type="button"
                                className="habit-contracts-card__button habit-contracts-card__button--primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleContractAction(
                                    contract.id,
                                    recordContractProgress,
                                    'Unable to update contract progress.',
                                  );
                                }}
                                disabled={isBusy}
                              >
                                {primaryActionLabel}
                              </button>
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                )}

                {contractsError ? <p className="habit-contracts-card__error">{contractsError}</p> : null}
              </div>
              </TodayExpandableActionSection>
            ) : null}

            {!hiddenTodayExtraSections.has('quickJournal') ? (
              <TodayExpandableActionSection
                id="today-quick-journal"
                icon="📝"
                title="Quick journal"
                subtitle={quickJournalDateLabel}
                statusChip={quickJournalStatusChip}
                expanded={openTodayExpandableSection === 'quickJournal'}
                justAdded={justAddedTodaySection === 'quickJournal'}
                onToggle={() => toggleTodayExpandableSection('quickJournal')}
              >
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
                      : quickJournalMode === 'simple'
                        ? 'A short reflection is enough: note one bright thing and one tricky thing.'
                        : quickJournalMode === 'habit_investigation'
                          ? 'No judgment — just noticing patterns around habits and choices.'
                          : 'Capture a few thoughts tied to the same date you are tracking above.'}
                </p>
                <div className="habit-quick-journal__launcher" role="group" aria-label="Quick journal launcher">
                  {[
                    {
                      mode: 'pulse' as const,
                      icon: '🎛',
                      title: "I don’t feel like journaling today",
                      description: 'Do a quick pulse check instead.',
                    },
                    {
                      mode: 'dream' as const,
                      icon: '🌙',
                      title: 'I want to record my dream',
                      description: 'Capture what you remember before it fades.',
                    },
                    {
                      mode: 'simple' as const,
                      icon: '🌿',
                      title: 'Let’s write something quick and simple',
                      description: 'Two gentle prompts: what felt good, and what felt tricky.',
                    },
                    {
                      mode: 'habit_investigation' as const,
                      icon: '🔎',
                      title: 'Investigate a habit pattern',
                      description: 'Spot triggers, needs, and one small next experiment.',
                    },
                    {
                      mode: 'written' as const,
                      icon: '✍️',
                      title: "Yes, let’s write today’s journal",
                      description: 'Open the full reflection for this day.',
                    },
                  ].map((option) => (
                    <button
                      key={option.mode}
                      type="button"
                      aria-pressed={quickJournalMode === option.mode}
                      className={`habit-quick-journal__choice ${
                        quickJournalMode === option.mode ? 'habit-quick-journal__choice--active' : ''
                      }`}
                      onClick={() => handleLaunchQuickJournalMode(option.mode)}
                    >
                      <span className="habit-quick-journal__choice-icon" aria-hidden="true">{option.icon}</span>
                      <span className="habit-quick-journal__choice-copy">
                        <span className="habit-quick-journal__choice-title">{option.title}</span>
                        <span className="habit-quick-journal__choice-description">{option.description}</span>
                      </span>
                    </button>
                  ))}
                </div>
                {isQuickJournalOpen ? (
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

                        <label className="habit-quick-journal__field">
                          <span className="habit-quick-journal__field-label">🌱 Today's gratitude / pleasant moment(s)</span>
                          <textarea
                            rows={3}
                            value={quickJournalPleasantMoments}
                            onChange={(event) => setQuickJournalPleasantMoments(event.target.value)}
                            placeholder="What felt good, meaningful, or worth appreciating today?"
                          />
                        </label>
                      </>
                    ) : quickJournalMode === 'simple' ? (
                      <>
                        <label className="habit-quick-journal__field">
                          <span className="habit-quick-journal__field-label">🌿 What felt good today?</span>
                          <textarea
                            rows={4}
                            value={quickJournalSimplePositive}
                            onChange={(event) => setQuickJournalSimplePositive(event.target.value)}
                            placeholder="A small win, kind moment, progress, beauty, relief…"
                          />
                        </label>
                        <label className="habit-quick-journal__field">
                          <span className="habit-quick-journal__field-label">🫶 What felt heavy or tricky?</span>
                          <textarea
                            rows={4}
                            value={quickJournalSimpleTricky}
                            onChange={(event) => setQuickJournalSimpleTricky(event.target.value)}
                            placeholder="Something hard, confusing, disappointing, or worth releasing…"
                          />
                        </label>
                      </>
                    ) : quickJournalMode === 'habit_investigation' ? (
                      <>
                        <p className="habit-quick-journal__microcopy">No judgment — just pattern spotting.</p>
                        <label className="habit-quick-journal__field">
                          <span className="habit-quick-journal__field-label">🔎 What happened?</span>
                          <textarea
                            rows={3}
                            value={quickJournalHabitSituation}
                            onChange={(event) => setQuickJournalHabitSituation(event.target.value)}
                            placeholder="Describe the habit, choice, or moment you noticed…"
                          />
                        </label>
                        <label className="habit-quick-journal__field">
                          <span className="habit-quick-journal__field-label">🧭 What seemed to trigger it?</span>
                          <textarea
                            rows={3}
                            value={quickJournalHabitTrigger}
                            onChange={(event) => setQuickJournalHabitTrigger(event.target.value)}
                            placeholder="Time, place, mood, energy, people, stress, environment…"
                          />
                        </label>
                        <label className="habit-quick-journal__field">
                          <span className="habit-quick-journal__field-label">💛 What was I needing or trying to avoid?</span>
                          <textarea
                            rows={3}
                            value={quickJournalHabitNeed}
                            onChange={(event) => setQuickJournalHabitNeed(event.target.value)}
                            placeholder="Rest, comfort, focus, escape, reassurance, connection…"
                          />
                        </label>
                        <label className="habit-quick-journal__field">
                          <span className="habit-quick-journal__field-label">🌱 What small experiment could I try next time?</span>
                          <textarea
                            rows={3}
                            value={quickJournalHabitNextExperiment}
                            onChange={(event) => setQuickJournalHabitNextExperiment(event.target.value)}
                            placeholder="Make it easier, change the cue, ask for support, prepare ahead…"
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

                        <div className="habit-quick-journal__field habit-quick-journal__dream-tone">
                          <span className="habit-quick-journal__field-label">🧭 Dream tone</span>
                          <div className="habit-quick-journal__type-toggle" role="group" aria-label="Dream tone">
                            {QUICK_DREAM_PRIMARY_TONE_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                className={`habit-quick-journal__type-button ${
                                  quickDreamTone === option.value ? 'habit-quick-journal__type-button--active' : ''
                                }`}
                                onClick={() => {
                                  setQuickDreamTone(option.value);
                                  if (
                                    !quickDreamToneDetail
                                    || QUICK_DREAM_DETAIL_TO_PRIMARY[quickDreamToneDetail] !== option.value
                                  ) {
                                    setQuickDreamToneDetail(QUICK_DREAM_PRIMARY_TO_DETAIL[option.value]);
                                  }
                                }}
                              >
                                {option.icon} {option.label}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            className="habit-quick-journal__tone-detail-toggle"
                            onClick={() => setIsQuickDreamToneDetailOpen((current) => !current)}
                          >
                            {isQuickDreamToneDetailOpen ? 'Hide detail options' : 'More detail (5-level scale)'}
                          </button>
                          {isQuickDreamToneDetailOpen ? (
                            <div className="habit-quick-journal__type-toggle" role="group" aria-label="Dream tone detail">
                              {QUICK_DREAM_DETAIL_OPTIONS.map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  className={`habit-quick-journal__type-button ${
                                    quickDreamToneDetail === option.value ? 'habit-quick-journal__type-button--active' : ''
                                  }`}
                                  onClick={() => {
                                    setQuickDreamToneDetail(option.value);
                                    setQuickDreamTone(QUICK_DREAM_DETAIL_TO_PRIMARY[option.value]);
                                  }}
                                >
                                  {option.icon} {option.label}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>

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
                    <div className="habit-quick-journal__privacy">
                      <label className="habit-quick-journal__privacy-toggle">
                        <input
                          type="checkbox"
                          checked={quickJournalIsPrivate}
                          onChange={(event) => setQuickJournalIsPrivate(event.target.checked)}
                        />
                        <span>Private</span>
                      </label>
                      <p className="habit-quick-journal__privacy-helper">
                        Private entries stay in your journal but are excluded from AI Coach.
                      </p>
                    </div>
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
                          setQuickJournalPleasantMoments('');
                          setQuickJournalSimplePositive('');
                          setQuickJournalSimpleTricky('');
                          setQuickJournalHabitSituation('');
                          setQuickJournalHabitTrigger('');
                          setQuickJournalHabitNeed('');
                          setQuickJournalHabitNextExperiment('');
                          setQuickJournalEnergy(QUICK_JOURNAL_PULSE_DEFAULTS.energy);
                          setQuickJournalMood(QUICK_JOURNAL_PULSE_DEFAULTS.mood);
                          setQuickJournalFocus(QUICK_JOURNAL_PULSE_DEFAULTS.focus);
                          setQuickJournalStress(QUICK_JOURNAL_PULSE_DEFAULTS.stress);
                          setQuickJournalIsPrivate(true);
                          setQuickDreamTitle(QUICK_JOURNAL_DREAM_DEFAULTS.title);
                          setQuickDreamSymbols(QUICK_JOURNAL_DREAM_DEFAULTS.symbols);
                          setQuickDreamEmotions(QUICK_JOURNAL_DREAM_DEFAULTS.emotions);
                          setQuickDreamReflection(QUICK_JOURNAL_DREAM_DEFAULTS.reflection);
                          setQuickDreamTone(null);
                          setQuickDreamToneDetail(null);
                          setIsQuickDreamToneDetailOpen(false);
                          setQuickJournalError(null);
                        }}
                        disabled={quickJournalSaving}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}

                {quickJournalStatus ? (
                  <p className="habit-quick-journal__status habit-quick-journal__status--success">
                    {quickJournalStatus}
                  </p>
                ) : null}
              </div>
            </TodayExpandableActionSection>
            ) : null}

            {!isCompactView ? (
              <>
                {!hiddenTodayExtraSections.has('intentions') ? (
                <TodayExpandableActionSection
                  id="today-intentions"
                  icon="🎯"
                  title="Intentions & Todos"
                  subtitle="Plan for this day"
                  statusChip={intentionsStatusChip}
                  expanded={openTodayExpandableSection === 'intentions'}
                  justAdded={justAddedTodaySection === 'intentions'}
                  onToggle={() => toggleTodayExpandableSection('intentions')}
                >
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
                </TodayExpandableActionSection>
                ) : null}

                <div className="habit-day-status" aria-live="polite">
                  <div className="habit-day-status__summary">
                    <button
                      type="button"
                      className="habit-day-status__toggle"
                      onClick={() => setIsDayStatusExpanded((prev) => !prev)}
                      aria-expanded={isDayStatusExpanded}
                    >
                      Skip day
                    </button>
                    <div
                      className="habit-today-extra-toggles habit-today-extra-toggles--compact"
                      aria-label="Today extra section visibility"
                    >
                      <div className="habit-today-extra-toggles__buttons">
                        {TODAY_EXTRA_SECTION_TOGGLES.map((section) => {
                          const isVisible = !hiddenTodayExtraSections.has(section.key);
                          const isJustAdded = justAddedTodaySection === section.key;
                          const isDimmed = justAddedTodaySection !== null && !isJustAdded && isVisible;

                          return (
                            <button
                              key={section.key}
                              type="button"
                              className={`habit-today-extra-toggles__button${
                                isVisible ? ' habit-today-extra-toggles__button--active' : ''
                              }${isJustAdded ? ' habit-today-extra-toggles__button--glow' : ''}${
                                isDimmed ? ' habit-today-extra-toggles__button--dimming' : ''
                              }`}
                              onClick={() => toggleTodayExtraSectionVisibility(section.key)}
                              aria-label={`${isVisible ? 'Hide' : 'Show'} ${section.label}`}
                              aria-pressed={isVisible}
                              title={section.label}
                            >
                              <span aria-hidden="true">{section.icon}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {isDayStatusExpanded ? (
                    <>
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
                    </>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        </div>

        {statusText && statusVariant ? (
          <div className={`habit-checklist-card__status habit-checklist-card__status--${statusVariant}`}>
            <span className="habit-checklist-card__status-text">{statusText}</span>
          </div>
        ) : null}
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

  const focusHabitCardById = useCallback((habitId: string) => {
    setExpandedHabits({ [habitId]: true });

    window.requestAnimationFrame(() => {
      const targetCard = habitCardRefs.current[habitId];
      if (!targetCard) return;
      targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetCard.focus({ preventScroll: true });
      setDailyLifeUpgradeHighlightedHabitId(habitId);
      if (dailyLifeUpgradeHighlightTimeoutRef.current !== null) {
        window.clearTimeout(dailyLifeUpgradeHighlightTimeoutRef.current);
      }
      dailyLifeUpgradeHighlightTimeoutRef.current = window.setTimeout(() => {
        setDailyLifeUpgradeHighlightedHabitId((current) => (current === habitId ? null : current));
        dailyLifeUpgradeHighlightTimeoutRef.current = null;
      }, 1800);
    });
  }, []);

  const {
    dailyLifeUpgradeCandidate,
    showDailyLifeUpgradeModal,
    dailyLifeUpgradeAlternativeCreateDraft,
    setDailyLifeUpgradeAlternativeCreateDraft,
    dailyLifeUpgradeAlternativeCreateSuccess,
    dailyLifeUpgradeCreateSaving,
    dailyLifeUpgradeCreateError,
    dailyLifeUpgradePauseConfirmOpen,
    setDailyLifeUpgradePauseConfirmOpen,
    dailyLifeUpgradePauseSaving,
    dailyLifeUpgradePauseStatus,
    setDailyLifeUpgradePauseStatus,
    dailyLifeUpgradeHighlightedHabitId,
    setDailyLifeUpgradeHighlightedHabitId,
    openDailyLifeUpgradeModal,
    closeDailyLifeUpgradeModal,
    handleDailyLifeUpgradePrimaryAction,
    handleDailyLifeUpgradeFullQuestAction,
    handleDailyLifeUpgradeAlternativeAction,
    handleCloseDailyLifeUpgradeCreateFlow,
    handleSaveDailyLifeUpgradeCreateFlow,
    handlePauseOriginalHabitFromDailyLifeUpgrade,
  } = useDailyLifeUpgradeFlow({
    userId: session?.user?.id,
    habits,
    historicalLogs: historicalLogs.map((log) => ({ habit_id: log.habit_id, completed: log.completed })),
    sortedHabits,
    isConfigured,
    isDemoExperience,
    lifeWheelUnassigned: LIFE_WHEEL_UNASSIGNED,
    extractLifeWheelDomain,
    buildScheduleWithLifeWheel,
    buildScheduleWithNotes,
    buildScheduleWithDefaultTiming,
    handleOpenEdit,
    focusHabitCardById,
    refreshHabits,
    deferInitialModal: deferDailyLifeUpgradeModal,
  });

  useEffect(() => {
    if (!shouldOpenDailyLifeUpgradeAfterWeeklyReview) return;
    openDailyLifeUpgradeModal();
    setShouldOpenDailyLifeUpgradeAfterWeeklyReview(false);
  }, [dailyLifeUpgradeCandidate, openDailyLifeUpgradeModal, shouldOpenDailyLifeUpgradeAfterWeeklyReview]);

  const hasNewDaySequenceModalOpen =
    isTodayWinsOpen ||
    (Boolean(yesterdayIntentionsEntry) && isIntentionsNoticeOpen) ||
    showDailyLifeUpgradeModal ||
    Boolean(dailyLifeUpgradeAlternativeCreateDraft || dailyLifeUpgradeAlternativeCreateSuccess);

  const hasViewportModalOpen = hasNewDaySequenceModalOpen || showYesterdaySundownTodoModal;

  const openYesterdaySundownTodoCleanup = useCallback(async (options?: { force?: boolean }) => {
    if (!session?.user?.id) return;
    const { data, error } = await fetchTodayTodos(yesterdayISO);
    if (error) return;
    const displayCounts = loadDraft<Record<string, number>>(todoCleanupDisplayCountsKey(session.user.id)) ?? {};
    const staleTodos = (data ?? []).filter((todo) => !todo.completed);
    const movedToTaskTowerTitles: string[] = [];
    const rolledTodos: TodayTodo[] = [];

    await Promise.all(staleTodos.map(async (todo) => {
      const displayCount = displayCounts[todo.id] ?? 0;
      if (displayCount >= TODO_CLEANUP_LAST_PROMPT_AT) {
        const { error: actionError } = await insertAction(session.user.id, {
          title: todo.title,
          category: 'nice_to_do',
          notes: [TODO_CLEANUP_TASK_TOWER_TAG, todo.notes].filter(Boolean).join('\n'),
        });
        if (!actionError) {
          const { error: deleteError } = await deleteTodayTodo(todo.id);
          if (!deleteError) {
            delete displayCounts[todo.id];
            movedToTaskTowerTitles.push(todo.title);
            return;
          }
        }
      }

      const { data: rolledTodo, error: rolloverError } = await updateTodayTodo(todo.id, { todo_date: today, completed: false });
      if (!rolloverError && rolledTodo) {
        rolledTodos.push(rolledTodo);
        return;
      }
      rolledTodos.push(todo);
    }));

    const pendingTodos = rolledTodos
      .filter((todo) => options?.force || (displayCounts[todo.id] ?? 0) < TODO_CLEANUP_MAX_PROMPTS)
      .sort((first, second) => (displayCounts[second.id] ?? 0) - (displayCounts[first.id] ?? 0));

    setYesterdaySundownTodos(pendingTodos);
    setTodoCleanupDisplayCounts(displayCounts);
    setTodoCleanupPendingActions({});
    setTodoCleanupBulkAction(null);
    setTodoCleanupMovedToTaskTowerTitles(movedToTaskTowerTitles);
    setExpandedYesterdaySundownTodoById({});

    if (pendingTodos.length === 0) {
      if (options?.force || movedToTaskTowerTitles.length > 0) {
        setYesterdaySundownTodoStatus(movedToTaskTowerTitles.length > 0 ? `${movedToTaskTowerTitles.length} long-rolled todo${movedToTaskTowerTitles.length === 1 ? '' : 's'} moved into Task Tower.` : 'No unfinished todos were found for yesterday.');
        yesterdaySundownTodoPromptOpenedThisSessionRef.current = true;
        setShowYesterdaySundownTodoModal(true);
      }
      return;
    }

    setYesterdaySundownTodoStatus(options?.force ? 'Admin manual cleanup launched.' : null);
    yesterdaySundownTodoPromptOpenedThisSessionRef.current = true;
    setShowYesterdaySundownTodoModal(true);
  }, [session?.user?.id, today, yesterdayISO]);

  useEffect(() => {
    if (loading || !session?.user?.id || !isViewingToday) return;
    if (yesterdaySundownTodoPromptOpenedThisSessionRef.current) return;
    if (showYesterdaySundownTodoModal || showYesterdayRecap || todayTodoModalOpen) return;
    if (deferDailyLifeUpgradeModal || deferYesterdayTodoCleanupModal || hasNewDaySequenceModalOpen) return;

    let isMounted = true;
    void (async () => {
      if (!isMounted) return;
      await openYesterdaySundownTodoCleanup();
    })();

    return () => {
      isMounted = false;
    };
  }, [
    deferDailyLifeUpgradeModal,
    deferYesterdayTodoCleanupModal,
    hasNewDaySequenceModalOpen,
    isViewingToday,
    loading,
    openYesterdaySundownTodoCleanup,
    session?.user?.id,
    showYesterdayRecap,
    showYesterdaySundownTodoModal,
    todayTodoModalOpen,
  ]);

  useEffect(() => {
    const handleManualLaunch = (event: Event) => {
      const customEvent = event as CustomEvent<{ force?: boolean } | undefined>;
      void openYesterdaySundownTodoCleanup({ force: customEvent.detail?.force === true });
    };
    window.addEventListener('lifegoal:launch-yesterday-todo-cleanup', handleManualLaunch);
    return () => window.removeEventListener('lifegoal:launch-yesterday-todo-cleanup', handleManualLaunch);
  }, [openYesterdaySundownTodoCleanup]);

  useEffect(() => {
    if (typeof document === 'undefined' || !hasViewportModalOpen) {
      return undefined;
    }

    return lockPageScroll(['body', 'documentElement']);
  }, [hasViewportModalOpen]);

  const applyTodoCleanupActions = useCallback(async (pendingActions: Record<string, TodoCleanupPendingAction>) => {
    const entries = Object.entries(pendingActions);
    if (entries.length === 0) return false;
    setYesterdaySundownTodoSaving(true);
    setYesterdaySundownTodoStatus(null);
    const actionResults = await Promise.all(entries.map(([todoId, pendingAction]) => {
      if (pendingAction.action === 'delete') return deleteTodayTodo(todoId);
      if (pendingAction.action === 'finish') return updateTodayTodo(todoId, { completed: true });
      const nextDateISO = pendingAction.action === 'tomorrow'
        ? formatISODate(addDays(parseISODate(today), 1))
        : pendingAction.scheduledDateISO ?? today;
      return updateTodayTodo(todoId, { todo_date: nextDateISO, completed: false });
    }));
    const failed = actionResults.some((result) => result.error);
    if (failed) {
      setYesterdaySundownTodoStatus('Some cleanup choices could not be applied. Please try again.');
      await loadTodayTodos(activeDate);
      const { data } = await fetchTodayTodos(yesterdayISO);
      setYesterdaySundownTodos((data ?? []).filter((todo) => !todo.completed));
      setYesterdaySundownTodoSaving(false);
      return false;
    }
    await loadTodayTodos(activeDate);
    setYesterdaySundownTodoSaving(false);
    return true;
  }, [activeDate, loadTodayTodos, today, yesterdayISO]);

  const recordUnresolvedTodoCleanupDisplays = useCallback((handledTodoIds: Set<string>) => {
    const nextCounts = { ...todoCleanupDisplayCounts };
    yesterdaySundownTodos.forEach((todo) => {
      if (handledTodoIds.has(todo.id)) {
        delete nextCounts[todo.id];
        return;
      }
      nextCounts[todo.id] = (nextCounts[todo.id] ?? 0) + 1;
    });
    saveDraft(todoCleanupDisplayCountsKey(session.user.id), nextCounts);
    setTodoCleanupDisplayCounts(nextCounts);
  }, [session.user.id, todoCleanupDisplayCounts, yesterdaySundownTodos]);

  const closeYesterdaySundownTodoModal = useCallback(async () => {
    const pendingActions = todoCleanupPendingActions;
    const handledTodoIds = new Set(Object.keys(pendingActions));
    const applied = await applyTodoCleanupActions(pendingActions);
    if (applied || handledTodoIds.size === 0) {
      recordUnresolvedTodoCleanupDisplays(handledTodoIds);
      setShowYesterdaySundownTodoModal(false);
      setYesterdaySundownTodoStatus(null);
      setExpandedYesterdaySundownTodoById({});
      setTodoCleanupPendingActions({});
      setTodoCleanupBulkAction(null);
    }
  }, [applyTodoCleanupActions, recordUnresolvedTodoCleanupDisplays, todoCleanupPendingActions]);

  const refreshTodosAfterYesterdaySundownAction = useCallback(async () => {
    await loadTodayTodos(activeDate);
    const { data } = await fetchTodayTodos(yesterdayISO);
    setYesterdaySundownTodos((data ?? []).filter((todo) => !todo.completed));
  }, [activeDate, loadTodayTodos, yesterdayISO]);

  const stageTodoCleanupAction = useCallback((todoId: string, pendingAction: TodoCleanupPendingAction) => {
    setTodoCleanupPendingActions((current) => ({ ...current, [todoId]: pendingAction }));
    setExpandedYesterdaySundownTodoById((current) => ({ ...current, [todoId]: false }));
  }, []);

  const clearTodoCleanupAction = useCallback((todoId: string) => {
    setTodoCleanupPendingActions((current) => {
      const next = { ...current };
      delete next[todoId];
      return next;
    });
  }, []);

  const handleApplyTodoCleanup = useCallback(async () => {
    const handledTodoIds = new Set(Object.keys(todoCleanupPendingActions));
    const applied = await applyTodoCleanupActions(todoCleanupPendingActions);
    if (!applied && handledTodoIds.size > 0) return;
    recordUnresolvedTodoCleanupDisplays(handledTodoIds);
    setShowYesterdaySundownTodoModal(false);
    setYesterdaySundownTodoStatus(null);
    setExpandedYesterdaySundownTodoById({});
    setTodoCleanupPendingActions({});
    setTodoCleanupBulkAction(null);
  }, [applyTodoCleanupActions, recordUnresolvedTodoCleanupDisplays, todoCleanupPendingActions]);

  const handleConfirmBulkTodoCleanup = useCallback(() => {
    if (!todoCleanupBulkAction) return;
    setTodoCleanupPendingActions((current) => {
      const next = { ...current };
      yesterdaySundownTodos.forEach((todo) => {
        if (!next[todo.id]) next[todo.id] = todoCleanupBulkAction;
      });
      return next;
    });
    setTodoCleanupBulkAction(null);
  }, [todoCleanupBulkAction, yesterdaySundownTodos]);

  const dailyLifeUpgradeModal = (
    <DailyLifeUpgradeModal
      candidate={dailyLifeUpgradeCandidate}
      open={showDailyLifeUpgradeModal}
      onClose={closeDailyLifeUpgradeModal}
      onPrimary={handleDailyLifeUpgradePrimaryAction}
      onFullQuest={handleDailyLifeUpgradeFullQuestAction}
      onAlternative={handleDailyLifeUpgradeAlternativeAction}
    />
  );

  const assignedTodoCleanupCount = Object.keys(todoCleanupPendingActions).length;
  const allTodoCleanupItemsAssigned = yesterdaySundownTodos.length > 0 && assignedTodoCleanupCount >= yesterdaySundownTodos.length;

  const yesterdaySundownTodoModalContent = showYesterdaySundownTodoModal ? (
    <div className="yesterday-sundown-todo-modal" role="dialog" aria-modal="true" aria-labelledby="yesterday-sundown-todo-title">
      <div className="yesterday-sundown-todo-modal__backdrop" onClick={() => void closeYesterdaySundownTodoModal()} role="presentation" />
      <div className="yesterday-sundown-todo-modal__dialog">
        <header className="yesterday-sundown-todo-modal__header">
          <span className="yesterday-sundown-todo-modal__sun" aria-hidden="true">🌅</span>
          <div className="yesterday-sundown-todo-modal__heading">
            <h3 id="yesterday-sundown-todo-title">Todo cleanup</h3>
            <p className="yesterday-sundown-todo-modal__subtitle">
              {formatDateLabel(yesterdayISO)} → today. Sort or skip — skipped stay on today.
            </p>
          </div>
          <button
            type="button"
            className="yesterday-sundown-todo-modal__close"
            onClick={() => void closeYesterdaySundownTodoModal()}
            aria-label="Close todo cleanup"
            disabled={yesterdaySundownTodoSaving}
          >
            ×
          </button>
        </header>

        {yesterdaySundownTodos.length > 0 ? (
          <div className="yesterday-sundown-todo-modal__progress" aria-hidden="true">
            <div className="yesterday-sundown-todo-modal__progress-track">
              <div
                className="yesterday-sundown-todo-modal__progress-fill"
                style={{ width: `${Math.round((assignedTodoCleanupCount / yesterdaySundownTodos.length) * 100)}%` }}
              />
            </div>
            <span className={`yesterday-sundown-todo-modal__progress-count${allTodoCleanupItemsAssigned ? ' yesterday-sundown-todo-modal__progress-count--done' : ''}`}>
              {allTodoCleanupItemsAssigned ? '🎉 All sorted!' : `${assignedTodoCleanupCount}/${yesterdaySundownTodos.length} sorted`}
            </span>
          </div>
        ) : null}

        <div className="yesterday-sundown-todo-modal__body">
          {todoCleanupMovedToTaskTowerTitles.length > 0 ? (
            <div className="yesterday-sundown-todo-modal__status" role="note">
              🏰 Moved to Task Tower ({TODO_CLEANUP_TASK_TOWER_TAG}): {todoCleanupMovedToTaskTowerTitles.join(', ')}
            </div>
          ) : null}
          {yesterdaySundownTodos.length > 0 ? (
            <ul className="yesterday-sundown-todo-modal__list">
              {yesterdaySundownTodos.map((todo, todoIndex) => {
                const isExpanded = Boolean(expandedYesterdaySundownTodoById[todo.id]);
                const pendingAction = todoCleanupPendingActions[todo.id];
                const displayCount = todoCleanupDisplayCounts[todo.id] ?? 0;
                const isLastPrompt = displayCount >= TODO_CLEANUP_LAST_PROMPT_AT;
                const tomorrowISO = formatISODate(addDays(parseISODate(today), 1));
                const itemClassName = [
                  'yesterday-sundown-todo-modal__item',
                  isExpanded ? 'yesterday-sundown-todo-modal__item--expanded' : '',
                  pendingAction ? `yesterday-sundown-todo-modal__item--assigned yesterday-sundown-todo-modal__item--${pendingAction.action}` : '',
                  isLastPrompt ? 'yesterday-sundown-todo-modal__item--expiring' : '',
                ].filter(Boolean).join(' ');
                const actionLabel = pendingAction?.action === 'tomorrow'
                  ? '☀️ Tomorrow'
                    : pendingAction?.action === 'schedule'
                      ? `📅 ${formatDateLabel(pendingAction.scheduledDateISO ?? today)}`
                      : pendingAction?.action === 'finish'
                        ? '✅ Done'
                        : pendingAction?.action === 'delete'
                          ? '🗑️ Delete'
                          : null;
                return (
                  <li key={todo.id} className={itemClassName} style={{ '--todo-i': todoIndex } as CSSProperties}>
                    <div className="yesterday-sundown-todo-modal__row">
                      <button
                        type="button"
                        className="yesterday-sundown-todo-modal__task"
                        onClick={() => setExpandedYesterdaySundownTodoById((current) => (current[todo.id] ? {} : { [todo.id]: true }))}
                        aria-expanded={isExpanded}
                      >
                        <span className="yesterday-sundown-todo-modal__task-title">{todo.title}</span>
                        {isLastPrompt && !pendingAction ? <span className="yesterday-sundown-todo-modal__expiry-badge">⏳ Last call</span> : null}
                        {todo.notes && isExpanded ? <span className="yesterday-sundown-todo-modal__task-notes">{todo.notes}</span> : null}
                      </button>
                      {pendingAction ? (
                        <div className="yesterday-sundown-todo-modal__stamp">
                          <span className="yesterday-sundown-todo-modal__selected-action">{actionLabel}</span>
                          <button
                            type="button"
                            className="yesterday-sundown-todo-modal__undo"
                            onClick={() => clearTodoCleanupAction(todo.id)}
                            disabled={yesterdaySundownTodoSaving}
                            aria-label={`Undo choice for ${todo.title}`}
                          >
                            ↩
                          </button>
                        </div>
                      ) : (
                        <div className="yesterday-sundown-todo-modal__quick-actions">
                          <button type="button" className="yesterday-sundown-todo-modal__chip yesterday-sundown-todo-modal__chip--finish" onClick={() => stageTodoCleanupAction(todo.id, { action: 'finish' })} disabled={yesterdaySundownTodoSaving} aria-label={`Mark ${todo.title} finished`}>✅</button>
                          <button type="button" className="yesterday-sundown-todo-modal__chip yesterday-sundown-todo-modal__chip--tomorrow" onClick={() => stageTodoCleanupAction(todo.id, { action: 'tomorrow' })} disabled={yesterdaySundownTodoSaving} aria-label={`Move ${todo.title} to tomorrow`}>☀️</button>
                          <button type="button" className="yesterday-sundown-todo-modal__chip yesterday-sundown-todo-modal__chip--delete" onClick={() => stageTodoCleanupAction(todo.id, { action: 'delete' })} disabled={yesterdaySundownTodoSaving} aria-label={`Delete ${todo.title}`}>🗑️</button>
                        </div>
                      )}
                    </div>
                    {isExpanded ? (
                      <div className="yesterday-sundown-todo-modal__task-actions">
                        <label className="yesterday-sundown-todo-modal__date-action">
                          <span>📅 Pick a day</span>
                          <input
                            type="date"
                            min={today}
                            defaultValue={pendingAction?.scheduledDateISO ?? tomorrowISO}
                            onChange={(event) => {
                              if (event.target.value) stageTodoCleanupAction(todo.id, { action: 'schedule', scheduledDateISO: event.target.value });
                            }}
                            disabled={yesterdaySundownTodoSaving}
                          />
                        </label>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="yesterday-sundown-todo-modal__empty">✨ All clear — yesterday can stay yesterday.</div>
          )}
          {yesterdaySundownTodoStatus ? <p className="yesterday-sundown-todo-modal__status" role="status">{yesterdaySundownTodoStatus}</p> : null}
        </div>

        <footer className="yesterday-sundown-todo-modal__footer">
          {yesterdaySundownTodos.length > 0 && !allTodoCleanupItemsAssigned ? (
            <div className="yesterday-sundown-todo-modal__bulk" aria-label="Bulk todo cleanup actions">
              <span className="yesterday-sundown-todo-modal__bulk-label">Rest:</span>
              {todoCleanupBulkAction ? (
                <div className="yesterday-sundown-todo-modal__confirm" role="alert">
                  <button type="button" className="yesterday-sundown-todo-modal__confirm-yes" onClick={handleConfirmBulkTodoCleanup}>
                    {todoCleanupBulkAction.action === 'finish' ? '✅ All done?' : todoCleanupBulkAction.action === 'delete' ? '🗑️ Delete all?' : '☀️ All tomorrow?'}
                  </button>
                  <button type="button" className="yesterday-sundown-todo-modal__confirm-no" onClick={() => setTodoCleanupBulkAction(null)} aria-label="Cancel bulk choice">✕</button>
                </div>
              ) : (
                <div className="yesterday-sundown-todo-modal__bulk-actions">
                  <button type="button" onClick={() => setTodoCleanupBulkAction({ action: 'finish' })} disabled={yesterdaySundownTodoSaving}>✅ Done</button>
                  <button type="button" onClick={() => setTodoCleanupBulkAction({ action: 'tomorrow' })} disabled={yesterdaySundownTodoSaving}>☀️ Tomorrow</button>
                  <button type="button" className="yesterday-sundown-todo-modal__bulk-delete" onClick={() => setTodoCleanupBulkAction({ action: 'delete' })} disabled={yesterdaySundownTodoSaving}>🗑️</button>
                </div>
              )}
            </div>
          ) : null}
          {allTodoCleanupItemsAssigned ? (
            <button type="button" className="btn btn--primary yesterday-sundown-todo-modal__final-action yesterday-sundown-todo-modal__final-action--ready" onClick={() => void handleApplyTodoCleanup()} disabled={yesterdaySundownTodoSaving}>
              {yesterdaySundownTodoSaving ? 'Applying…' : '✨ Apply cleanup'}
            </button>
          ) : (
            <button type="button" className="btn btn--secondary yesterday-sundown-todo-modal__final-action" onClick={() => void closeYesterdaySundownTodoModal()} disabled={yesterdaySundownTodoSaving}>
              {yesterdaySundownTodoSaving ? 'Applying…' : assignedTodoCleanupCount > 0 ? `Apply ${assignedTodoCleanupCount} & close` : 'Later'}
            </button>
          )}
        </footer>
      </div>
    </div>
  ) : null;

  const dailyLifeUpgradeCreateFlowModalContent = (
    <DailyLifeUpgradeAlternativeCreateModal
      draft={dailyLifeUpgradeAlternativeCreateDraft}
      success={dailyLifeUpgradeAlternativeCreateSuccess}
      sortedHabits={sortedHabits}
      createError={dailyLifeUpgradeCreateError}
      createSaving={dailyLifeUpgradeCreateSaving}
      pauseConfirmOpen={dailyLifeUpgradePauseConfirmOpen}
      setPauseConfirmOpen={setDailyLifeUpgradePauseConfirmOpen}
      pauseSaving={dailyLifeUpgradePauseSaving}
      pauseStatus={dailyLifeUpgradePauseStatus}
      setPauseStatus={setDailyLifeUpgradePauseStatus}
      setDraft={setDailyLifeUpgradeAlternativeCreateDraft}
      onClose={handleCloseDailyLifeUpgradeCreateFlow}
      onSave={() => void handleSaveDailyLifeUpgradeCreateFlow()}
      onPauseOriginal={() => void handlePauseOriginalHabitFromDailyLifeUpgrade()}
      onViewNewHabit={(habitId) => {
        if (habitId) {
          focusHabitCardById(habitId);
        }
        handleCloseDailyLifeUpgradeCreateFlow();
      }}
    />
  );

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

  const dailyLifeUpgradePortal = dailyLifeUpgradeModal
    ? modalRoot
      ? createPortal(dailyLifeUpgradeModal, modalRoot)
      : dailyLifeUpgradeModal
    : null;
  const dailyLifeUpgradeCreateFlowPortal = dailyLifeUpgradeCreateFlowModalContent
    ? modalRoot
      ? createPortal(dailyLifeUpgradeCreateFlowModalContent, modalRoot)
      : dailyLifeUpgradeCreateFlowModalContent
    : null;

  const yesterdaySundownTodoPortal = yesterdaySundownTodoModalContent
    ? modalRoot
      ? createPortal(yesterdaySundownTodoModalContent, modalRoot)
      : yesterdaySundownTodoModalContent
    : null;

  const zenTreePortal = zenTreeModal
    ? modalRoot
      ? createPortal(zenTreeModal, modalRoot)
      : zenTreeModal
    : null;

  const feedCreaturesPortal = feedCreaturesModal
    ? modalRoot
      ? createPortal(feedCreaturesModal, modalRoot)
      : feedCreaturesModal
    : null;

  const eggHatchMoviePortal = eggHatchMovieModal
    ? modalRoot
      ? createPortal(eggHatchMovieModal, modalRoot)
      : eggHatchMovieModal
    : null;

  if (isCompact) {
    return (
      <section className="habit-tracker habit-tracker--compact">
        {renderCompactExperience()}
        {offerTeaserPortal}
        {todaysOfferPortal}
        {dailyLifeUpgradePortal}
        {dailyLifeUpgradeCreateFlowPortal}
        {yesterdaySundownTodoPortal}
        {zenTreePortal}
        {feedCreaturesPortal}
        {eggHatchMoviePortal}
        {weeklyHabitReviewModal}
        {visionRewardModal}
        {visionAlreadyCollectedModal}
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
        {reviewPauseDialogHabit ? (
          <HabitPauseDialog
            open
            habitTitle={reviewPauseDialogHabit.name}
            confirmLabel={gamificationEnabled ? `Pause +${HABIT_REVIEW_DICE_BOUNTY} 🎲` : 'Pause habit'}
            saving={reviewActionHabitIds.has(reviewPauseDialogHabit.id)}
            onClose={() => {
              if (reviewActionHabitIds.has(reviewPauseDialogHabit.id)) {
                return;
              }
              setReviewPauseDialogHabit(null);
            }}
            onConfirm={async ({ reason, resumeOn }) => {
              await handleHabitReviewAction(reviewPauseDialogHabit, 'pause', {
                reason: reason ?? 'review_pause',
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
                <li
                  key={habit.id}
                  ref={(node) => {
                    habitCardRefs.current[habit.id] = node;
                  }}
                  tabIndex={-1}
                  className={`habit-card ${isCompleted ? 'habit-card--completed' : ''} ${isJustCompleted ? `habit-item--just-completed ${feedbackClassName}` : ''} ${dailyLifeUpgradeHighlightedHabitId === habit.id ? 'habit-card--daily-life-upgrade-target' : ''}`}
                >
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
      {dailyLifeUpgradePortal}
      {zenTreePortal}
      {feedCreaturesPortal}
      {eggHatchMoviePortal}
      {weeklyHabitReviewModal}
      {visionRewardModal}
      {visionAlreadyCollectedModal}
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

      {showDreamJournalReminderModal && (
        <div className="dream-journal-reminder-overlay">
          <div className="dream-journal-reminder-modal" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="dream-journal-reminder-modal__close"
              onClick={() => setShowDreamJournalReminderModal(false)}
              aria-label="Close dream journal reminder"
            >
              ×
            </button>
            <div className="dream-journal-reminder-modal__content">
              <p className="dream-journal-reminder-modal__eyebrow">Dream Journal Reminder</p>
              <h3>Had an interesting Dream last night?</h3>
              <button
                type="button"
                className="btn btn--primary dream-journal-reminder-modal__cta"
                onClick={() => {
                  setShowDreamJournalReminderModal(false);
                  openDreamJournalQuickEntry();
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {alertConfigModal}
      {editHabitModal}
      {dailyLifeUpgradeCreateFlowPortal}
      {yesterdaySundownTodoPortal}

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

      {reviewPauseDialogHabit ? (
        <HabitPauseDialog
          open
          habitTitle={reviewPauseDialogHabit.name}
          confirmLabel={gamificationEnabled ? `Pause +${HABIT_REVIEW_DICE_BOUNTY} 🎲` : 'Pause habit'}
          saving={reviewActionHabitIds.has(reviewPauseDialogHabit.id)}
          onClose={() => {
            if (reviewActionHabitIds.has(reviewPauseDialogHabit.id)) {
              return;
            }
            setReviewPauseDialogHabit(null);
          }}
          onConfirm={async ({ reason, resumeOn }) => {
            await handleHabitReviewAction(reviewPauseDialogHabit, 'pause', {
              reason: reason ?? 'review_pause',
              resumeOn: resumeOn ?? null,
            });
          }}
        />
      ) : null}

      {insightCaptureHabit ? (
        <HabitInsightCaptureSheet
          habitTitle={insightCaptureHabit.name}
          onClose={() => setInsightCaptureHabit(null)}
          onSubmit={async ({ cueTags, note }) => {
            const saved = await recordHabitInsight({
              userId: session.user.id,
              habitId: insightCaptureHabit.id,
              cueTags,
              note,
            });
            if (!saved) return 0;
            return gamificationEnabled ? awardInsightCaptureDice(session.user.id) : 0;
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

function buildScheduleWithDefaultTiming(schedule: Json | null, timing: string | null): Json | null {
  if (!timing && (!schedule || typeof schedule !== 'object' || Array.isArray(schedule))) {
    return schedule;
  }

  const nextSchedule: Record<string, Json> =
    schedule && typeof schedule === 'object' && !Array.isArray(schedule)
      ? { ...(schedule as Record<string, Json>) }
      : {};

  const trimmedTiming = timing?.trim() ?? '';
  if (trimmedTiming) {
    nextSchedule.default_timing = trimmedTiming;
  } else {
    delete nextSchedule.default_timing;
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

// Boundaries kept in lockstep with HABIT_RHYTHM_WINDOWS so the greeting never
// disagrees with the daypart the rhythm bonus is actually using.
function getCircadianEmoji(date: Date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return '🌅';
  if (hour >= 11 && hour < 16) return '☀️';
  if (hour >= 16 && hour < 21) return '🌇';
  return '🌙';
}

function getCircadianLabel(date: Date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'Morning rhythm';
  if (hour >= 11 && hour < 16) return 'Daytime rhythm';
  if (hour >= 16 && hour < 21) return 'Evening rhythm';
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
