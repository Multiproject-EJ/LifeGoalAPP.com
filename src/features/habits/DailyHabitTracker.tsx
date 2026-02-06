import { useCallback, useEffect, useMemo, useRef, useState, useId } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { LIFE_WHEEL_CATEGORIES, type LifeWheelCategoryKey } from '../checkins/LifeWheelCheckins';
import type { ProfileStrengthSignalSnapshot } from '../profile-strength/profileStrengthData';
import type { ProfileStrengthResult } from '../profile-strength/profileStrengthTypes';
import {
  clearHabitCompletion,
  fetchHabitLogsForRange,
  fetchHabitsForUser,
  logHabitCompletion,
  type LegacyHabitWithGoal as HabitWithGoal,
} from '../../compat/legacyHabitsAdapter';
import { useGamification } from '../../hooks/useGamification';
import { XP_REWARDS } from '../../types/gamification';
import { XP_TO_GOLD_RATIO, convertXpToGold } from '../../constants/economy';
import { PointsBadge } from '../../components/PointsBadge';
import {
  getHabitCompletionsByMonth,
  getMonthlyCompletionGrid,
  toggleHabitCompletionForDate,
  type MonthlyHabitCompletions,
} from '../../services/habitMonthlyQueries';
import type { Database, Json } from '../../lib/database.types';
import { isDemoSession } from '../../services/demoSession';
import { fetchVisionImages, getVisionImagePublicUrl } from '../../services/visionBoard';
import { HabitAlertConfig } from './HabitAlertConfig';
import {
  createJournalEntry,
  listJournalEntries,
  updateJournalEntry,
  type JournalEntry,
} from '../../services/journal';
import { fetchCompletedActionsForDate } from '../../services/actions';
import { updateSpinsAvailable } from '../../services/dailySpin';
import { fetchGoals, insertGoal } from '../../services/goals';
import { updateHabitFullV2 } from '../../services/habitsV2';
import {
  getYesterdayRecapEnabled,
  getYesterdayRecapLastCollected,
  getYesterdayRecapLastShown,
  setYesterdayRecapLastCollected,
  setYesterdayRecapLastShown,
} from '../../services/yesterdayRecapPrefs';
import { CelebrationAnimation } from '../../components/CelebrationAnimation';
import { DEFAULT_GOAL_STATUS } from '../goals/goalStatus';
import visionStarButtonLarge from '../../assets/VisionStarBig.webp';
import './HabitAlertConfig.css';
import './HabitRecapPrompt.css';

type DailyHabitTrackerVariant = 'full' | 'compact';

type DailyHabitTrackerProps = {
  session: Session;
  variant?: DailyHabitTrackerVariant;
  showPointsBadges?: boolean;
  onVisionRewardOpenChange?: (isOpen: boolean) => void;
  profileStrengthSnapshot?: ProfileStrengthResult | null;
  profileStrengthSignals?: ProfileStrengthSignalSnapshot | null;
  personalitySummary?: string | null;
};

type HabitCompletionState = {
  logId: string | null;
  completed: boolean;
};

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
  id?: string;
};

type HabitLogRow = {
  id: string;
  habit_id: string;
  date: string;
  completed: boolean;
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

type QuickJournalDraft = {
  isOpen: boolean;
  morning: string;
  day: string;
  evening: string;
  interactions: string;
  freeform: string;
};

type IntentionsJournalDraft = {
  isOpen: boolean;
  type: 'today' | 'tomorrow';
  content: string;
};

type DayStatus = 'skip' | 'vacation' | 'sick';

type VisionImageRow = Database['public']['Tables']['vision_images']['Row'];

type VisionImage = VisionImageRow & { publicUrl: string };

type VisionReward = {
  imageUrl: string;
  caption: string | null;
  xpAwarded: number;
  isSuperBoost: boolean;
};

const STREAK_LOOKBACK_DAYS = 60;

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
const LIFE_WHEEL_UNASSIGNED = 'unassigned';
const GOAL_UNASSIGNED = 'unassigned';

const quickJournalDraftKey = (userId: string, dateISO: string) =>
  `lifegoal.quick-journal:${userId}:${dateISO}`;
const legacyIntentionsJournalDraftKey = (userId: string, dateISO: string) =>
  `lifegoal.intentions-journal:${userId}:${dateISO}`;
const intentionsJournalDraftKey = (userId: string, dateISO: string, type: 'today' | 'tomorrow') =>
  `lifegoal.intentions-journal:${userId}:${dateISO}:${type}`;
const intentionsNoticeStorageKey = (userId: string, dateISO: string) =>
  `lifegoal.intentions-notice:${userId}:${dateISO}`;
const dayStatusStorageKey = (userId: string) => `lifegoal.day-status:${userId}`;
const visionStarStorageKey = (userId: string, dateISO: string) =>
  `lifegoal.vision-star:${userId}:${dateISO}`;
const visionStarRewardKey = (userId: string, dateISO: string) =>
  `lifegoal.vision-star-reward:${userId}:${dateISO}`;
const visionStarCountKey = (userId: string) => `lifegoal.vision-star-count:${userId}`;
const timeLimitedOfferScheduleKey = (userId: string, dateISO: string) =>
  `lifegoal.time-limited-offer-schedule:${userId}:${dateISO}`;

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
}: DailyHabitTrackerProps) {
  const { isConfigured } = useSupabaseAuth();
  const isDemoExperience = isDemoSession(session);
  const isCompact = variant === 'compact';
  const progressGradientId = useId();
  const [habits, setHabits] = useState<HabitWithGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completions, setCompletions] = useState<Record<string, HabitCompletionState>>({});
  const [monthlyCompletions, setMonthlyCompletions] = useState<
    Record<string, HabitMonthlyCompletionState>
  >({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [monthlySaving, setMonthlySaving] = useState<Record<string, boolean>>({});
  const [today, setToday] = useState(() => formatISODate(new Date()));
  const [activeDate, setActiveDate] = useState(() => formatISODate(new Date()));
  const [completedActionsCount, setCompletedActionsCount] = useState(0);
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
  const [quickJournalSaving, setQuickJournalSaving] = useState(false);
  const [quickJournalError, setQuickJournalError] = useState<string | null>(null);
  const [showCompletedHabits, setShowCompletedHabits] = useState(false);
  const [quickJournalStatus, setQuickJournalStatus] = useState<string | null>(null);
  const [skipMenuHabitId, setSkipMenuHabitId] = useState<string | null>(null);
  const [skipReasonHabitId, setSkipReasonHabitId] = useState<string | null>(null);
  const [skipReason, setSkipReason] = useState('');
  const [skipSaving, setSkipSaving] = useState(false);
  const [skipError, setSkipError] = useState<string | null>(null);
  const skipMenuRef = useRef<HTMLDivElement | null>(null);
  const [isCompactView, setIsCompactView] = useState(false);
  const [isCompactToggleLabelVisible, setIsCompactToggleLabelVisible] = useState(false);
  const compactToggleLabelTimeoutRef = useRef<number | null>(null);
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
  const [visionImages, setVisionImages] = useState<VisionImage[]>([]);
  const [visionReward, setVisionReward] = useState<VisionReward | null>(null);
  const [visionRewardDate, setVisionRewardDate] = useState<string | null>(null);
  const [visionRewardError, setVisionRewardError] = useState<string | null>(null);
  const [visionImagesLoading, setVisionImagesLoading] = useState(false);
  const [visionRewarding, setVisionRewarding] = useState(false);
  const [visionPreviewImage, setVisionPreviewImage] = useState<VisionImage | null>(null);
  const [isVisionRewardOpen, setIsVisionRewardOpen] = useState(false);
  const [isVisionRewardSelecting, setIsVisionRewardSelecting] = useState(false);
  const [isStarBursting, setIsStarBursting] = useState(false);
  const [isVisionImageLoaded, setIsVisionImageLoaded] = useState(false);
  const [hasClaimedVisionStar, setHasClaimedVisionStar] = useState(false);
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
  const visionButtonRef = useRef<HTMLButtonElement | null>(null);
  const visionClaimButtonRef = useRef<HTMLButtonElement | null>(null);
  const { earnXP, recordActivity, enabled: gamificationEnabled, levelUpEvent, dismissLevelUpEvent } = useGamification(session);
  const habitGoldLabel = useMemo(() => {
    const baseGold = convertXpToGold(XP_REWARDS.HABIT_COMPLETE);
    const earlyGold = convertXpToGold(XP_REWARDS.HABIT_COMPLETE_EARLY);
    const minGold = Math.min(baseGold, earlyGold);
    const maxGold = Math.max(baseGold, earlyGold);
    return minGold === maxGold ? `${minGold}` : `${minGold}-${maxGold}`;
  }, []);
  const shouldShowHabitPoints = showPointsBadges && gamificationEnabled;
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
    if (!habits.length) {
      return habits;
    }

    return [...habits].sort((a, b) => {
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
  }, [habits, habitInsights, completions]);

  const nowTimestamp = Date.now();
  const isTimeLimitedOfferActive =
    isViewingToday &&
    timeLimitedOffer.windowStart !== null &&
    timeLimitedOffer.windowEnd !== null &&
    nowTimestamp >= timeLimitedOffer.windowStart &&
    nowTimestamp <= timeLimitedOffer.windowEnd;
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

  const buildTimeLimitedOfferWindow = useCallback((dateISO: string) => {
    const hasOffer = Math.random() < 0.22;
    if (!hasOffer) {
      return { windowStart: null, windowEnd: null };
    }

    const baseDate = parseISODate(dateISO);
    baseDate.setHours(0, 0, 0, 0);
    const isLateSlot = Math.random() < 0.35;
    const startHourMin = isLateSlot ? 20 : 9;
    const startHourMax = isLateSlot ? 23 : 20;
    const startHour =
      startHourMin + Math.floor(Math.random() * (startHourMax - startHourMin + 1));
    const startMinute = Math.floor(Math.random() * 60);
    const startDate = new Date(baseDate);
    startDate.setHours(startHour, startMinute, 0, 0);
    const durationMinutes = 18 + Math.floor(Math.random() * 22);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

    return { windowStart: startDate.getTime(), windowEnd: endDate.getTime() };
  }, []);

  useEffect(() => {
    if (!isViewingToday || habits.length === 0) {
      return;
    }

    const storedOffer = loadDraft<{
      date: string;
      nextHabitId: string | null;
      badHabitId: string | null;
      windowStart: number | null;
      windowEnd: number | null;
    }>(timeLimitedOfferScheduleKey(session.user.id, activeDate));

    if (storedOffer?.date === activeDate) {
      setTimeLimitedOffer(storedOffer);
      return;
    }

    const nextHabit =
      sortedHabits.find((habit) => !completions[habit.id]?.completed) ?? sortedHabits[0] ?? null;
    const badHabit =
      sortedHabits.find((habit) => isBadHabit(habit) && habit.id !== nextHabit?.id) ??
      sortedHabits.find((habit) => habit.id !== nextHabit?.id) ??
      null;
    const { windowStart, windowEnd } = buildTimeLimitedOfferWindow(activeDate);

    const nextOffer = {
      date: activeDate,
      nextHabitId: nextHabit?.id ?? null,
      badHabitId: badHabit?.id ?? null,
      windowStart,
      windowEnd,
    };

    setTimeLimitedOffer(nextOffer);
    saveDraft(timeLimitedOfferScheduleKey(session.user.id, activeDate), nextOffer);
  }, [
    activeDate,
    buildTimeLimitedOfferWindow,
    completions,
    habits.length,
    isBadHabit,
    isViewingToday,
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
      setQuickJournalMorning(draft.morning ?? '');
      setQuickJournalDay(draft.day ?? '');
      setQuickJournalEvening(draft.evening ?? '');
      setQuickJournalInteractions(draft.interactions ?? '');
      setQuickJournalFreeform(draft.freeform ?? '');
      const hasContent = Boolean(
        draft.morning || draft.day || draft.evening || draft.interactions || draft.freeform
      );
      setIsQuickJournalOpen(draft.isOpen || hasContent);
    } else {
      setQuickJournalMorning('');
      setQuickJournalDay('');
      setQuickJournalEvening('');
      setQuickJournalInteractions('');
      setQuickJournalFreeform('');
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

    const selection = visionImages[Math.floor(Math.random() * visionImages.length)];
    const nextCount = visionStarCount + 1;
    const isSuperBoost = nextCount % 20 === 0;
    const xpAmount = isSuperBoost ? 250 : XP_REWARDS.VISION_BOARD_STAR;

    setVisionRewarding(true);
    try {
      const result = await earnXP(
        xpAmount,
        'vision_board_star',
        selection.id,
        'Vision board star boost'
      );
      await recordActivity();
      setVisionReward({
        imageUrl: selection.publicUrl,
        caption: selection.caption ?? null,
        xpAwarded: result?.xpAwarded ?? xpAmount,
        isSuperBoost,
      });
      setVisionRewardDate(activeDate);
      setHasClaimedVisionStar(true);
      saveDraft(visionStarStorageKey(session.user.id, activeDate), true);
      saveDraft(visionStarRewardKey(session.user.id, activeDate), {
        imageUrl: selection.publicUrl,
        caption: selection.caption ?? null,
        xpAwarded: result?.xpAwarded ?? xpAmount,
        isSuperBoost,
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
    earnXP,
    isConfigured,
    isDemoExperience,
    recordActivity,
    session.user.id,
    visionImages,
    visionStarCount,
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
    ? `Claim ${visionReward.xpAwarded} XP`
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
    () => ({
      eyebrow: '⏳ Time-limited offer',
      nextUp: 'Next up: 🏁EASY START 15 Beinhev (stol) - 30 sec anytime for 💎 85',
      badBoost: 'Bad habit boost: 📸🫦Lungs(!), Teeth (acid/sugar), Hair (roller,miondxl). for 💎 250',
      limited: 'Limited time',
    }),
    [],
  );
  const shouldShowOfferBonus = hasClaimedVisionStar && isTimeLimitedOfferActive;
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
          <span className="habit-day-nav__vision-modal-eyebrow">Vision board magic</span>
          <h3 className="habit-day-nav__vision-modal-title">✨ Your vision star ✨</h3>
          <div className="habit-day-nav__vision-modal-intro" aria-hidden="true">
            📸 🖼️ 🎯 ✨ 🚀
          </div>
          <div className="habit-day-nav__vision-modal-frame">
            {shouldShowVisionLoading && (
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
              />
            ) : null}
          </div>
          <div className="habit-day-nav__vision-modal-claim">
            <p className="habit-day-nav__vision-modal-caption">
              {visionRewardError
                ? visionRewardError
                : visionReward?.caption ?? 'A spark for your next win.'}
            </p>
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
  const habitVisionPreviewModal = visionPreviewImage ? (
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
        <img
          className="habit-vision-modal__image"
          src={visionPreviewImage.publicUrl}
          alt={visionPreviewImage.caption ? `Vision board: ${visionPreviewImage.caption}` : 'Vision board inspiration'}
        />
        {visionPreviewImage.caption ? (
          <p className="habit-vision-modal__caption">{visionPreviewImage.caption}</p>
        ) : null}
      </div>
    </div>
  ) : null;

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
  }, [activeDate]);

  useEffect(() => {
    const stored = loadDraft<boolean>(visionStarStorageKey(session.user.id, activeDate));
    setHasClaimedVisionStar(Boolean(stored));
  }, [activeDate, session.user.id]);

  useEffect(() => {
    const storedReward = loadDraft<VisionReward>(visionStarRewardKey(session.user.id, activeDate));
    if (storedReward) {
      setVisionReward(storedReward);
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
      quickJournalMorning ||
        quickJournalDay ||
        quickJournalEvening ||
        quickJournalInteractions ||
        quickJournalFreeform
    );

    if (!hasContent && !isQuickJournalOpen) {
      removeDraft(draftKey);
      return;
    }

    saveDraft(draftKey, {
      isOpen: isQuickJournalOpen,
      morning: quickJournalMorning,
      day: quickJournalDay,
      evening: quickJournalEvening,
      interactions: quickJournalInteractions,
      freeform: quickJournalFreeform,
    } satisfies QuickJournalDraft);
  }, [
    activeDate,
    session.user.id,
    isQuickJournalOpen,
    quickJournalMorning,
    quickJournalDay,
    quickJournalEvening,
    quickJournalInteractions,
    quickJournalFreeform,
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
      } else {
        setIsIntentionsNoticeViewed(false);
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
    setEditTitle(editHabit.name);
    setEditNotes(extractHabitNotes(editHabit.schedule));
    setEditError(null);
  }, [editHabit]);

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

  // Load monthly statistics when month changes
  useEffect(() => {
    void loadMonthlyStats(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, loadMonthlyStats]);

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
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const handleOnline = () => {
      navigator.serviceWorker.ready
        .then((registration) => {
          registration.active?.postMessage({ type: 'PROCESS_SUPABASE_QUEUE' });
        })
        .catch(() => undefined);
    };

    window.addEventListener('online', handleOnline);
    handleOnline();

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

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
        if (isToday) {
          const now = new Date();
          const xpAmount = now.getHours() < 9
            ? XP_REWARDS.HABIT_COMPLETE_EARLY
            : XP_REWARDS.HABIT_COMPLETE;
          const offerPrice = offerPriceByHabitId(habit.id);
          const offerXpAmount =
            offerPrice && XP_TO_GOLD_RATIO > 0
              ? Math.round(offerPrice / XP_TO_GOLD_RATIO)
              : null;

          // 1. Immediately add instant feedback (pop/glow)
          setJustCompletedHabitId(habit.id);

          // 2. After pop animation completes, trigger celebration
          setTimeout(() => {
            setCelebrationType('habit');
            setCelebrationXP(xpAmount);
            setShowCelebration(true);
          }, 300);

          // 3. Clean up instant feedback class
          setTimeout(() => {
            setJustCompletedHabitId(null);
          }, 320);

          await earnXP(xpAmount, 'habit_complete', habit.id);
          if (offerXpAmount) {
            await earnXP(offerXpAmount, 'habit_offer', habit.id, 'Time-limited habit offer');
          }
          await recordActivity();
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

    let scheduled = 0;
    let completed = 0;

    for (const habit of habits) {
      const insight = habitInsights[habit.id];
      const scheduledToday = insight?.scheduledToday ?? isHabitScheduledOnDate(habit, activeDate);
      if (scheduledToday) {
        scheduled += 1;
      }
      if (completions[habit.id]?.completed) {
        completed += 1;
      }
    }

    return { total: habits.length, scheduled, completed } as const;
  }, [habits, completions, habitInsights, activeDate]);

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
      const { error } = await updateHabitFullV2(editHabit.id, {
        title: nextTitle,
        schedule: nextSchedule,
        goal_id: nextGoalId,
      });
      if (error) {
        throw error;
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
      ? '+250 XP claim · Super boost'
      : `+${XP_REWARDS.VISION_BOARD_STAR} XP boost`;
    const shouldGlowBonus = Boolean(
      visionRewardForDay?.isSuperBoost || (isViewingToday && isNextVisionSuperBoost)
    );
    const shouldHideBonus = shouldFadeTrackingMeta && hasClaimedVisionStar && !visionRewardForDay;

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
            {!hasClaimedVisionStar ? (
              <div className="habit-day-nav__vision-row">
                <button
                  type="button"
                  className={`habit-day-nav__vision-button ${
                    !hasClaimedVisionStar ? 'habit-day-nav__vision-button--glow' : ''
                  }`}
                  ref={visionButtonRef}
                  onClick={handleVisionRewardClick}
                  disabled={visionImagesLoading || visionRewarding}
                  aria-label="Reveal a vision board star boost"
                >
                  <img
                    className={`habit-day-nav__vision-button-image ${
                      isStarBursting || visionRewarding ? 'habit-day-nav__vision-button-image--burst' : ''
                    }`}
                    src={visionStarButtonLarge}
                    alt=""
                    aria-hidden="true"
                  />
                  <span className="habit-day-nav__vision-button-text">
                    <span className="habit-day-nav__vision-title">Vision star</span>
                    <span className="habit-day-nav__vision-subtitle">{visionBoostLabel}</span>
                  </span>
                </button>
              </div>
            ) : null}
            <div
              className={`habit-day-nav__bonus ${
                shouldGlowBonus ? 'habit-day-nav__bonus--super-boost' : ''
              } ${shouldHideBonus ? 'habit-day-nav__bonus--hidden' : ''}`}
            >
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
              ) : visionRewardForDay ? (
                <img
                  className="habit-day-nav__bonus-image"
                  src={visionRewardForDay.imageUrl}
                  alt={visionRewardForDay.caption ? `Vision board: ${visionRewardForDay.caption}` : 'Vision board inspiration'}
                />
              ) : (
                <span
                  className={`habit-day-nav__bonus-placeholder ${
                    hasClaimedVisionStar && shouldFadeTrackingMeta ? 'habit-day-nav__fade' : ''
                  }`}
                >
                  {hasClaimedVisionStar ? 'Vision star claimed today.' : 'Tap the star to reveal a random vision board image.'}
                </span>
              )}
              {visionRewardForDay?.caption && !shouldShowOfferBonus ? (
                <span className="habit-day-nav__bonus-caption">{visionRewardForDay.caption}</span>
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

  const handleLogHabitSkip = async (habit: HabitWithGoal, reason?: string) => {
    if (!isConfigured && !isDemoExperience) {
      setSkipError('Connect Supabase to log skip reasons.');
      return;
    }

    const trimmedReason = reason?.trim();
    const content = trimmedReason
      ? `Reason:\n${trimmedReason}`
      : `Skipped ${habit.name} today.`;

    setSkipSaving(true);
    setSkipError(null);

    try {
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

      setSkipMenuHabitId(null);
      setSkipReasonHabitId(null);
      setSkipReason('');
    } catch (error) {
      setSkipError(error instanceof Error ? error.message : 'Unable to log the skip right now.');
    } finally {
      setSkipSaving(false);
    }
  };

  const renderCompactList = () => {
    const baseHabits = isTimeLimitedOfferActive ? timeLimitedOrderedHabits : sortedHabits;
    const completedHabits = baseHabits.filter((habit) => Boolean(completions[habit.id]?.completed));
    const activeHabits = baseHabits.filter((habit) => !completions[habit.id]?.completed);
    const visibleHabits = showCompletedHabits
      ? [...activeHabits, ...completedHabits]
      : activeHabits;

    return (
      <div className="habit-checklist__group">
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
            const linkedVisionImage = visionImagesByHabit.get(habit.id);
            const isOfferHabit = isTimeLimitedOfferActive && offerHabitIds.has(habit.id);
            const offerPrice = offerPriceByHabitId(habit.id);
            const isSkipDisabled = isOfferHabit;

            return (
              <li
                key={habit.id}
                className={`habit-checklist__item ${!scheduledToday ? 'habit-checklist__item--rest' : ''} ${
                  isCompleted ? 'habit-checklist__item--completed' : ''
                } ${isJustCompleted ? 'habit-item--just-completed' : ''} ${
                  isOfferHabit ? 'habit-checklist__item--offer' : ''
                }`}
              >
                {(shouldShowHabitPoints || isOfferHabit) ? (
                  <PointsBadge
                    value={isOfferHabit && offerPrice !== null ? offerPrice : habitGoldLabel}
                    className={`points-badge--corner habit-points-badge${
                      isOfferHabit ? ' habit-points-badge--offer' : ''
                    }`}
                    size="mini"
                    ariaLabel={
                      isOfferHabit && offerPrice !== null
                        ? `Limited offer: ${offerPrice} diamonds`
                        : undefined
                    }
                  />
                ) : null}
                <div
                  className={`habit-checklist__row ${isExpanded ? 'habit-checklist__row--expanded' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  aria-controls={detailPanelId}
                  onClick={() => toggleExpanded(habit.id)}
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
                  <span className="habit-checklist__name">
                    {!isCompactView && habit.emoji ? (
                      <span className="habit-checklist__icon" aria-hidden="true">
                        {habit.emoji}
                      </span>
                    ) : null}
                    {habit.name}
                  </span>
                  {isOfferHabit && timeLimitedCountdownLabel ? (
                    <span className="habit-checklist__offer-timer" aria-label="Offer time remaining">
                      ⏳ {timeLimitedCountdownLabel}
                    </span>
                  ) : null}
                </div>
                <div
                  className={`habit-checklist__details-panel ${
                    isExpanded ? 'habit-checklist__details-panel--open' : ''
                  }`}
                  id={detailPanelId}
                >
                  <p className="habit-checklist__meta">
                    Life wheel • {domainLabel ?? 'Unassigned'}
                  </p>
                  <p className="habit-checklist__meta habit-checklist__meta--secondary">
                    Goal • {goalLabel}
                  </p>
                  {lastCompletedText ? (
                    <p className="habit-checklist__note">{lastCompletedText}</p>
                  ) : null}
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
                  <div className="habit-checklist__detail-actions">
                    {!scheduledToday ? <span className="habit-checklist__pill">Rest day</span> : null}
                    {isSaving ? <span className="habit-checklist__saving">Updating…</span> : null}
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
                            Skip
                          </button>
                          <button
                            type="button"
                            className="habit-checklist__skip-option"
                            onClick={() => setSkipReasonHabitId(habit.id)}
                            disabled={skipSaving}
                          >
                            Skip - Add reason
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
                                    void handleLogHabitSkip(habit, skipReason);
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
                  </div>
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
                ? 'Hide completed habits'
                : `Show completed habits (${completedHabits.length})`}
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
    const titleText = 'My Habits';
    const subtitleText = null;
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

    const progressNode = (
      <span
        className={`habit-checklist-card__progress${
          progressStage !== 'none' ? ` habit-checklist-card__progress--${progressStage}` : ''
        }`}
        role="img"
        aria-label={progressLabel}
      >
        <span className="sr-only">{progressLabel}</span>
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
          {completedCount}
        </span>
        {progressIcon ? (
          <span className="habit-checklist-card__progress-symbol" aria-hidden="true">
            {progressIcon}
          </span>
        ) : null}
      </span>
    );

    const ariaLabel = `Habit checklist for ${formatDateLabel(activeDate)}`;

    const handleOpenQuickJournal = () => {
      setIsQuickJournalOpen(true);
      setQuickJournalError(null);
      setQuickJournalStatus(null);
    };

    const handleSaveQuickJournalDraft = () => {
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

      setQuickJournalError(null);
      setQuickJournalStatus('Draft saved for later.');
      saveDraft(quickJournalDraftKey(session.user.id, activeDate), {
        isOpen: true,
        morning: quickJournalMorning,
        day: quickJournalDay,
        evening: quickJournalEvening,
        interactions: quickJournalInteractions,
        freeform: quickJournalFreeform,
      } satisfies QuickJournalDraft);
    };

    const handleSubmitQuickJournal = async () => {
      // Build concatenated content from all fields
      const parts: string[] = [];
      
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
          tags: null,
          linked_goal_ids: null,
          linked_habit_ids: null,
          is_private: true,
          type: 'quick',
          mood_score: null,
          category: null,
          unlock_date: null,
          goal_id: null,
        };

        const { data, error } = await createJournalEntry(payload);
        if (error) {
          throw new Error(error.message);
        }

        // 🎮 Award XP for quick journal entry
        if (data) {
          await earnXP(XP_REWARDS.JOURNAL_ENTRY, 'journal_entry', data.id);
          await recordActivity();
        }

        removeDraft(quickJournalDraftKey(session.user.id, activeDate));
        setIsQuickJournalOpen(false);
        setQuickJournalMorning('');
        setQuickJournalDay('');
        setQuickJournalEvening('');
        setQuickJournalInteractions('');
        setQuickJournalFreeform('');
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
      saveDraft(intentionsNoticeKey, true);
    };
    const handleCloseIntentionsNotice = () => {
      setIsIntentionsNoticeOpen(false);
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

    const handleToggleSkipMenu = (habitId: string) => {
      setSkipMenuHabitId((current) => (current === habitId ? null : habitId));
      setSkipReasonHabitId(null);
      setSkipReason('');
      setSkipError(null);
    };

    const handleLogHabitSkip = async (habit: HabitWithGoal, reason?: string) => {
      if (!isConfigured && !isDemoExperience) {
        setSkipError('Connect Supabase to log skip reasons.');
        return;
      }

      const trimmedReason = reason?.trim();
      const content = trimmedReason
        ? `Reason:\n${trimmedReason}`
        : `Skipped ${habit.name} today.`;

      setSkipSaving(true);
      setSkipError(null);

      try {
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

        setSkipMenuHabitId(null);
        setSkipReasonHabitId(null);
        setSkipReason('');
      } catch (error) {
        setSkipError(error instanceof Error ? error.message : 'Unable to log the skip right now.');
      } finally {
        setSkipSaving(false);
      }
    };

    const handleCompactToggle = () => {
      setIsCompactView((previous) => !previous);
      setIsCompactToggleLabelVisible(true);
      if (compactToggleLabelTimeoutRef.current) {
        window.clearTimeout(compactToggleLabelTimeoutRef.current);
      }
      compactToggleLabelTimeoutRef.current = window.setTimeout(() => {
        setIsCompactToggleLabelVisible(false);
      }, 2200);
    };

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
            </div>
          </div>
        ) : null}
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
                      {yesterdayIntentionsEntry ? (
                        <button
                          type="button"
                          className={`habit-checklist-card__intentions-button ${
                            isIntentionsNoticeViewed ? 'habit-checklist-card__intentions-button--seen' : ''
                          }`}
                          onClick={handleOpenIntentionsNotice}
                        >
                          Intentions
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
              </div>
            ) : null}
          </div>

          <div className="habit-checklist-card__board-body">
            {renderDayNavigation('compact', true, isCompactView)}
            {!isCompactView ? (
              <div className="habit-checklist-card__title">
                <h2>{titleText}</h2>
                {subtitleText ? <p>{subtitleText}</p> : null}
              </div>
            ) : null}

            {habits.length === 0 ? (
              <div className="habit-checklist-card__empty">
                <p>No habits scheduled for this day.</p>
                <p>Add a ritual to any goal and it will show up here for quick check-ins.</p>
              </div>
            ) : (
              renderCompactList()
            )}

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
                Capture a few thoughts tied to the same date you are tracking above.
              </p>
              {!isQuickJournalOpen ? (
                <button
                  type="button"
                  className="habit-quick-journal__button"
                  onClick={handleOpenQuickJournal}
                >
                  + Add quick journal
                </button>
              ) : (
                <div className="habit-quick-journal__sheet">
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
                        setQuickJournalMorning('');
                        setQuickJournalDay('');
                        setQuickJournalEvening('');
                        setQuickJournalInteractions('');
                        setQuickJournalFreeform('');
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

  if (isCompact) {
    return (
      <section className="habit-tracker habit-tracker--compact">
        {renderCompactExperience()}
        {visionRewardModal}
        {visionVisualizationModal}
        {habitVisionPreviewModal}
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
              const isJustCompleted = justCompletedHabitId === habit.id;
              return (
                <li key={habit.id} className={`habit-card ${isCompleted ? 'habit-card--completed' : ''} ${isJustCompleted ? 'habit-item--just-completed' : ''}`}>
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
                  </footer>
                </li>
              );
            })}
          </ul>
        </>
      )}
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

      {/* Alert Configuration Modal */}
      {alertConfigHabit && (
        <div className="habit-alert-modal-overlay" onClick={() => setAlertConfigHabit(null)}>
          <div className="habit-alert-modal-content" onClick={(e) => e.stopPropagation()}>
            <HabitAlertConfig
              habitId={alertConfigHabit.id}
              habitName={alertConfigHabit.name}
              onClose={() => setAlertConfigHabit(null)}
            />
          </div>
        </div>
      )}

      {editHabit && (
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
      )}

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

  const completionSets = new Map<string, Set<string>>();
  const lastCompletedMap = new Map<string, string>();

  for (const log of logs) {
    if (!log.completed) continue;
    if (log.date < lookbackStartISO || log.date > trackingDateISO) continue;
    let set = completionSets.get(log.habit_id);
    if (!set) {
      set = new Set<string>();
      completionSets.set(log.habit_id, set);
    }
    set.add(log.date);

    const currentLast = lastCompletedMap.get(log.habit_id);
    if (!currentLast || log.date > currentLast) {
      lastCompletedMap.set(log.habit_id, log.date);
    }
  }

  const insights: Record<string, HabitInsights> = {};

  for (const habit of habits) {
    const scheduleChecker = createScheduleChecker(habit.frequency, habit.schedule);
    const scheduledToday = scheduleChecker(todayDate);
    const completionDates = completionSets.get(habit.id) ?? new Set<string>();
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
      const completed = completionDates.has(isoDate);
      if (completed) {
        runningStreak += 1;
        if (withinCurrent) {
          currentStreak += 1;
        }
        if (runningStreak > longestStreak) {
          longestStreak = runningStreak;
        }
      } else {
        if (withinCurrent) {
          withinCurrent = false;
        }
        runningStreak = 0;
      }
    }

    insights[habit.id] = {
      scheduledToday,
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
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
