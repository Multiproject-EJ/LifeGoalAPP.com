import { useCallback, useEffect, useMemo, useState, useId } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import {
  clearHabitCompletion,
  fetchHabitLogsForRange,
  fetchHabitsForUser,
  logHabitCompletion,
  type LegacyHabitWithGoal as HabitWithGoal,
} from '../../compat/legacyHabitsAdapter';
import { useGamification } from '../../hooks/useGamification';
import { XP_REWARDS } from '../../types/gamification';
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
import { createJournalEntry, listJournalEntries, type JournalEntry } from '../../services/journal';
import { updateSpinsAvailable } from '../../services/dailySpin';
import {
  getYesterdayRecapEnabled,
  getYesterdayRecapLastCollected,
  getYesterdayRecapLastShown,
  setYesterdayRecapLastCollected,
  setYesterdayRecapLastShown,
} from '../../services/yesterdayRecapPrefs';
import './HabitAlertConfig.css';
import './HabitRecapPrompt.css';

type DailyHabitTrackerVariant = 'full' | 'compact';

type DailyHabitTrackerProps = {
  session: Session;
  variant?: DailyHabitTrackerVariant;
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

type DayStatus = 'skip' | 'vacation';

type VisionImageRow = Database['public']['Tables']['vision_images']['Row'];

type VisionImage = VisionImageRow & { publicUrl: string };

type VisionReward = {
  imageUrl: string;
  caption: string | null;
  xpAwarded: number;
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

const quickJournalDraftKey = (userId: string, dateISO: string) =>
  `lifegoal.quick-journal:${userId}:${dateISO}`;
const intentionsJournalDraftKey = (userId: string, dateISO: string) =>
  `lifegoal.intentions-journal:${userId}:${dateISO}`;
const intentionsNoticeStorageKey = (userId: string, dateISO: string) =>
  `lifegoal.intentions-notice:${userId}:${dateISO}`;
const dayStatusStorageKey = (userId: string) => `lifegoal.day-status:${userId}`;
const visionStarStorageKey = (userId: string, dateISO: string) =>
  `lifegoal.vision-star:${userId}:${dateISO}`;

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

export function DailyHabitTracker({ session, variant = 'full' }: DailyHabitTrackerProps) {
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
  const [showLegacyHabitAssets, setShowLegacyHabitAssets] = useState(false);
  const [isQuickJournalOpen, setIsQuickJournalOpen] = useState(false);
  const [quickJournalMorning, setQuickJournalMorning] = useState('');
  const [quickJournalDay, setQuickJournalDay] = useState('');
  const [quickJournalEvening, setQuickJournalEvening] = useState('');
  const [quickJournalInteractions, setQuickJournalInteractions] = useState('');
  const [quickJournalFreeform, setQuickJournalFreeform] = useState('');
  const [quickJournalSaving, setQuickJournalSaving] = useState(false);
  const [quickJournalError, setQuickJournalError] = useState<string | null>(null);
  const [quickJournalStatus, setQuickJournalStatus] = useState<string | null>(null);
  const [isCompactView, setIsCompactView] = useState(false);
  // State for intentions journal
  const [isIntentionsJournalOpen, setIsIntentionsJournalOpen] = useState(false);
  const [intentionsJournalType, setIntentionsJournalType] = useState<'today' | 'tomorrow'>('today');
  const [intentionsJournalContent, setIntentionsJournalContent] = useState('');
  const [intentionsJournalSaving, setIntentionsJournalSaving] = useState(false);
  const [intentionsJournalError, setIntentionsJournalError] = useState<string | null>(null);
  const [intentionsJournalStatus, setIntentionsJournalStatus] = useState<string | null>(null);
  const [tomorrowIntentionsEntry, setTomorrowIntentionsEntry] = useState<JournalEntry | null>(null);
  const [isIntentionsNoticeOpen, setIsIntentionsNoticeOpen] = useState(false);
  const [isIntentionsNoticeViewed, setIsIntentionsNoticeViewed] = useState(false);
  const [visionImages, setVisionImages] = useState<VisionImage[]>([]);
  const [visionReward, setVisionReward] = useState<VisionReward | null>(null);
  const [visionRewardDate, setVisionRewardDate] = useState<string | null>(null);
  const [visionRewardError, setVisionRewardError] = useState<string | null>(null);
  const [visionImagesLoading, setVisionImagesLoading] = useState(false);
  const [visionRewarding, setVisionRewarding] = useState(false);
  const [isVisionRewardOpen, setIsVisionRewardOpen] = useState(false);
  const [isStarBursting, setIsStarBursting] = useState(false);
  const [hasClaimedVisionStar, setHasClaimedVisionStar] = useState(false);
  const [showYesterdayRecap, setShowYesterdayRecap] = useState(false);
  const [dayStatusMap, setDayStatusMap] = useState<Record<string, DayStatus>>({});
  const [yesterdayHabits, setYesterdayHabits] = useState<HabitWithGoal[]>([]);
  const [yesterdaySelections, setYesterdaySelections] = useState<Record<string, boolean>>({});
  const [yesterdayActionStatus, setYesterdayActionStatus] = useState<string | null>(null);
  const [yesterdaySaving, setYesterdaySaving] = useState(false);
  const [yesterdayCollecting, setYesterdayCollecting] = useState(false);
  const { earnXP, recordActivity, enabled: gamificationEnabled } = useGamification(session);

  useEffect(() => {
    const storedDayStatus = loadDraft<Record<string, DayStatus>>(dayStatusStorageKey(session.user.id));
    setDayStatusMap(storedDayStatus ?? {});
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

    if (!isConfigured && !isDemoExperience) {
      setVisionRewardError('Connect Supabase to unlock vision board boosts.');
      return;
    }

    if (visionImages.length === 0) {
      setVisionReward(null);
      setVisionRewardError('Add images to your vision board to unlock a star boost.');
      return;
    }

    const selection = visionImages[Math.floor(Math.random() * visionImages.length)];
    const xpAmount = XP_REWARDS.VISION_BOARD_STAR;

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
      });
      setVisionRewardDate(activeDate);
      setHasClaimedVisionStar(true);
      saveDraft(visionStarStorageKey(session.user.id, activeDate), true);
      setIsVisionRewardOpen(true);
    } finally {
      setVisionRewarding(false);
    }
  }, [activeDate, earnXP, isConfigured, isDemoExperience, recordActivity, session.user.id, visionImages]);

  const triggerStarBurst = useCallback(() => {
    setIsStarBursting(true);
    window.setTimeout(() => setIsStarBursting(false), 900);
  }, []);

  const handleVisionRewardClick = () => {
    triggerStarBurst();
    void handleVisionReward();
  };

  const closeVisionReward = () => {
    setIsVisionRewardOpen(false);
  };

  const visionRewardModal =
    visionReward && isVisionRewardOpen ? (
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
          <img
            className="habit-day-nav__vision-modal-image"
            src={visionReward.imageUrl}
            alt={visionReward.caption ? `Vision board: ${visionReward.caption}` : 'Vision board inspiration'}
          />
          <div className="habit-day-nav__vision-modal-claim">
            <p className="habit-day-nav__vision-modal-caption">
              {visionReward.caption ?? 'A spark for your next win.'}
            </p>
            <button
              type="button"
              className="habit-day-nav__vision-modal-button"
              onClick={closeVisionReward}
            >
              Claim {visionReward.xpAwarded} XP
            </button>
          </div>
        </div>
      </div>
    ) : null;

  useEffect(() => {
    setIsVisionRewardOpen(false);
    setVisionRewardError(null);
    setIsStarBursting(false);
  }, [activeDate]);

  useEffect(() => {
    const stored = loadDraft<boolean>(visionStarStorageKey(session.user.id, activeDate));
    setHasClaimedVisionStar(Boolean(stored));
  }, [activeDate, session.user.id]);

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
    const draftKey = intentionsJournalDraftKey(session.user.id, activeDate);
    const draft = loadDraft<IntentionsJournalDraft>(draftKey);
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

    if (activeDate !== today) {
      setTomorrowIntentionsEntry(null);
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
        setTomorrowIntentionsEntry(null);
        setIsIntentionsNoticeViewed(false);
        return;
      }

      const match = data?.find((entry) => entry.title === "Tomorrow's Intentions") ?? null;
      setTomorrowIntentionsEntry(match);
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
    const draftKey = intentionsJournalDraftKey(session.user.id, activeDate);
    if (!intentionsJournalContent && !isIntentionsJournalOpen) {
      removeDraft(draftKey);
      return;
    }

    saveDraft(draftKey, {
      isOpen: isIntentionsJournalOpen,
      type: intentionsJournalType,
      content: intentionsJournalContent,
    } satisfies IntentionsJournalDraft);
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

  const sortedHabits = useMemo(() => {
    if (!habits.length) {
      return habits;
    }

    return [...habits].sort((a, b) => {
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
  }, [habits, habitInsights]);

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
    const trackingDateISO = activeDate > todayISO ? todayISO : activeDate;
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
  }, [session, isConfigured, isDemoExperience, selectedMonth, selectedYear, activeDate]);

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

          await earnXP(xpAmount, 'habit_complete', habit.id);
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

  const toggleHabit = async (habit: HabitWithGoal) => {
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

  const renderDayNavigation = (variant: 'compact' | 'full', showDetails = true) => {
    const displayLabel = formatDateLabel(activeDate);
    const canGoForward = activeDate < today;
    const isViewingToday = activeDate === today;
    const navClasses = ['habit-day-nav', `habit-day-nav--${variant}`];
    const visionRewardForDay = visionReward && visionRewardDate === activeDate;
    const visionBoostLabel = `+${XP_REWARDS.VISION_BOARD_STAR} XP boost`;

    return (
      <div className={navClasses.join(' ')} role="group" aria-label="Choose day to track habits">
        <button
          type="button"
          className="habit-day-nav__button"
          onClick={() => changeActiveDateBy(-1)}
        >
          ← Previous day
        </button>

        {showDetails ? (
          <div className="habit-day-nav__info">
            <p className="habit-day-nav__label">Tracking day</p>
            <p className="habit-day-nav__value">{displayLabel}</p>
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
                <input
                  type="date"
                  value={activeDate}
                  max={today}
                  onChange={(event) => handleDateInputChange(event.target.value)}
                />
              </label>
            </div>
            {!hasClaimedVisionStar ? (
              <div className="habit-day-nav__vision-row">
                <button
                  type="button"
                  className={`habit-day-nav__vision-button ${
                    !hasClaimedVisionStar ? 'habit-day-nav__vision-button--glow' : ''
                  }`}
                  onClick={handleVisionRewardClick}
                  disabled={visionImagesLoading || visionRewarding}
                  aria-label="Reveal a vision board star boost"
                >
                  <span
                    className={`habit-day-nav__star ${
                      isStarBursting || visionRewarding ? 'habit-day-nav__star--burst' : ''
                    }`}
                    aria-hidden="true"
                  >
                    <span className="habit-day-nav__star-icon">★</span>
                    <span className="habit-day-nav__star-sparkle habit-day-nav__star-sparkle--one">
                      ✨
                    </span>
                    <span className="habit-day-nav__star-sparkle habit-day-nav__star-sparkle--two">
                      🏆
                    </span>
                    <span className="habit-day-nav__star-sparkle habit-day-nav__star-sparkle--three">
                      📸
                    </span>
                  </span>
                  <span className="habit-day-nav__vision-text">
                    <span className="habit-day-nav__vision-title">Vision star</span>
                    <span className="habit-day-nav__vision-subtitle">{visionBoostLabel}</span>
                  </span>
                </button>
              </div>
            ) : null}
            <div className="habit-day-nav__bonus">
              {visionRewardForDay ? (
                <img
                  className="habit-day-nav__bonus-image"
                  src={visionRewardForDay.imageUrl}
                  alt={visionRewardForDay.caption ? `Vision board: ${visionRewardForDay.caption}` : 'Vision board inspiration'}
                />
              ) : (
                <span className="habit-day-nav__bonus-placeholder">
                  {hasClaimedVisionStar ? 'Vision star claimed today.' : 'Tap the star to reveal a random vision board image.'}
                </span>
              )}
              {visionRewardForDay?.caption ? (
                <span className="habit-day-nav__bonus-caption">{visionRewardForDay.caption}</span>
              ) : null}
            </div>
            {visionRewardError && <p className="habit-day-nav__bonus-error">{visionRewardError}</p>}
          </div>
        ) : null}

        <button
          type="button"
          className="habit-day-nav__button"
          onClick={() => changeActiveDateBy(1)}
          disabled={!canGoForward}
        >
          Next day →
        </button>
      </div>
    );
  };

  const renderCompactList = () => (
    <ul className="habit-checklist" role="list">
      {sortedHabits.map((habit) => {
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

        return (
          <li
            key={habit.id}
            className={`habit-checklist__item ${!scheduledToday ? 'habit-checklist__item--rest' : ''} ${
              isCompleted ? 'habit-checklist__item--completed' : ''
            }`}
          >
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
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => {
                  event.stopPropagation();
                  void toggleHabit(habit);
                }}
                disabled={isSaving || (!scheduledToday && !isCompleted)}
              />
              <label
                htmlFor={checkboxId}
                className="habit-checklist__name"
                onClick={(event) => event.stopPropagation()}
              >
                {habit.name}
              </label>
              <span
                className={`habit-checklist__chevron ${
                  isExpanded ? 'habit-checklist__chevron--open' : ''
                }`}
                aria-hidden="true"
              />
            </div>
            <div
              className={`habit-checklist__details-panel ${
                isExpanded ? 'habit-checklist__details-panel--open' : ''
              }`}
              id={detailPanelId}
            >
              <p className="habit-checklist__meta">
                {domainLabel ? `Life wheel • ${domainLabel}` : `Goal • ${goalLabel}`}
              </p>
              {domainLabel && habit.goal?.title ? (
                <p className="habit-checklist__meta habit-checklist__meta--secondary">
                  Goal • {habit.goal.title}
                </p>
              ) : null}
              {lastCompletedText ? (
                <p className="habit-checklist__note">{lastCompletedText}</p>
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
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );

  const renderCompactExperience = () => {
    const dateLabel = formatCompactDateLabel(activeDate);
    const scheduledTarget = compactStats.scheduled || compactStats.total;
    const completedCount = Math.min(compactStats.completed, scheduledTarget);
    const progressLabel = scheduledTarget
      ? `${completedCount}/${scheduledTarget} habits done`
      : 'No habits scheduled';
    const progressRatio = scheduledTarget ? completedCount / scheduledTarget : 0;
    const progressPercent = Math.round(progressRatio * 100);
    const isViewingToday = activeDate === today;
    const titleText = isViewingToday ? 'Things to do today' : 'Things to do for this day';
    const subtitleText = isViewingToday
      ? 'Check off the rituals that keep your life wheel balanced.'
      : `Logging for ${formatDateLabel(activeDate)}. Check off the rituals that keep your life wheel balanced.`;

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

    const ariaLabel = `Habit checklist for ${formatDateLabel(activeDate)}`;

    const handleOpenQuickJournal = () => {
      setIsQuickJournalOpen(true);
      setQuickJournalMorning('');
      setQuickJournalDay('');
      setQuickJournalEvening('');
      setQuickJournalInteractions('');
      setQuickJournalFreeform('');
      setQuickJournalError(null);
      setQuickJournalStatus(null);
    };

    const handleSaveQuickJournal = async () => {
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
        setQuickJournalError('Add at least one entry before saving.');
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
        setQuickJournalStatus('Saved to your journal.');
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
      setIsIntentionsJournalOpen(true);
      setIntentionsJournalType(type);
      setIntentionsJournalContent('');
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

        const payload: Database['public']['Tables']['journal_entries']['Insert'] = {
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
        };

        const { data, error } = await createJournalEntry(payload);
        if (error) {
          throw new Error(error.message);
        }

        // 🎮 Award XP for intentions journal entry
        if (data) {
          await earnXP(XP_REWARDS.JOURNAL_ENTRY, 'journal_entry', data.id);
          await recordActivity();
        }

        removeDraft(intentionsJournalDraftKey(session.user.id, activeDate));
        setIsIntentionsJournalOpen(false);
        setIntentionsJournalContent('');
        setIntentionsJournalStatus('Saved to your journal.');
      } catch (err) {
        setIntentionsJournalError(err instanceof Error ? err.message : 'Unable to save your journal entry.');
      } finally {
        setIntentionsJournalSaving(false);
      }
    };

    const checklistCardClassName = `habit-checklist-card${isCompactView ? ' habit-checklist-card--glass' : ''}`;
    const intentionsNoticeKey = intentionsNoticeStorageKey(session.user.id, today);
    const handleOpenIntentionsNotice = () => {
      setIsIntentionsNoticeOpen(true);
      setIsIntentionsNoticeViewed(true);
      saveDraft(intentionsNoticeKey, true);
    };
    const handleCloseIntentionsNotice = () => {
      setIsIntentionsNoticeOpen(false);
    };
    const handleDayStatusUpdate = (status: DayStatus) => {
      setDayStatusMap((previous) => {
        const next = { ...previous };
        if (next[activeDate] === status) {
          delete next[activeDate];
        } else {
          next[activeDate] = status;
        }
        return next;
      });
    };

    return (
      <div className={checklistCardClassName} role="region" aria-label={ariaLabel}>
        {tomorrowIntentionsEntry && isIntentionsNoticeOpen ? (
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
                <p>{tomorrowIntentionsEntry.content}</p>
              </div>
            </div>
          </div>
        ) : null}
        <div className="habit-checklist-card__board">
          <div className="habit-checklist-card__board-head">
            <div className="habit-checklist-card__date-wrap">
              <div className="habit-checklist-card__date-group">
                <p className="habit-checklist-card__date">{dateLabel}</p>
              </div>
              <button
                type="button"
                className={`habit-checklist-card__glass-toggle ${
                  isCompactView ? 'habit-checklist-card__glass-toggle--active' : ''
                }`}
                onClick={() => setIsCompactView((previous) => !previous)}
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
                <span className="habit-checklist-card__progress" role="img" aria-label={progressLabel}>
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
              </span>
                {tomorrowIntentionsEntry ? (
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
            ) : null}
          </div>

          <div className="habit-checklist-card__board-body">
            {renderDayNavigation('compact', !isCompactView)}
            {!isCompactView ? (
              <div className="habit-checklist-card__title">
                <h2>{titleText}</h2>
                <p>{subtitleText}</p>
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

            <div className="habit-quick-journal" aria-live="polite">
              <div className="habit-quick-journal__header">
                <div>
                  <p className="habit-quick-journal__eyebrow">Reflect for this day</p>
                  <h3 className="habit-quick-journal__title">Quick journal</h3>
                </div>
                <span className="habit-quick-journal__badge">{quickJournalDateLabel}</span>
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
                      onClick={() => void handleSaveQuickJournal()}
                      disabled={quickJournalSaving}
                    >
                      {quickJournalSaving ? 'Saving…' : 'Save entry'}
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
                    <span className="habit-quick-journal__badge">{quickJournalDateLabel}</span>
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
                            removeDraft(intentionsJournalDraftKey(session.user.id, activeDate));
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
                      <h3 className="habit-day-status__title">Log a skip or vacation</h3>
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
                    <p className="habit-day-status__note">Logged: {dayStatus === 'skip' ? 'Skipped' : 'Vacation'}.</p>
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
              return (
                <li key={habit.id} className={`habit-card ${isCompleted ? 'habit-card--completed' : ''}`}>
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
                      onClick={() => void toggleHabit(habit)}
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
