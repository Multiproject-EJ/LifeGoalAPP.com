import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import {
  clearHabitCompletion,
  fetchHabitLogsForRange,
  fetchHabitsForUser,
  logHabitCompletion,
  type HabitWithGoal,
} from '../../services/habits';
import type { Database, Json } from '../../lib/database.types';

type DailyHabitTrackerProps = {
  session: Session;
};

type HabitCompletionState = {
  logId: string | null;
  completed: boolean;
};

type HabitLogInsert = Database['public']['Tables']['habit_logs']['Insert'];

type HabitLogRow = Database['public']['Tables']['habit_logs']['Row'];

type HabitInsights = {
  scheduledToday: boolean;
  currentStreak: number;
  longestStreak: number;
  lastCompletedOn: string | null;
};

const STREAK_LOOKBACK_DAYS = 60;

const OFFLINE_SYNC_MESSAGE = 'You\u2019re offline. Updates will sync automatically once you reconnect.';
const QUEUE_RETRY_MESSAGE = 'Offline updates are still queued and will retry shortly.';

export function DailyHabitTracker({ session }: DailyHabitTrackerProps) {
  const { isConfigured, mode, isAuthenticated } = useSupabaseAuth();
  const isDemoExperience = mode === 'demo' || !isAuthenticated;
  const [habits, setHabits] = useState<HabitWithGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completions, setCompletions] = useState<Record<string, HabitCompletionState>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [today, setToday] = useState(() => formatISODate(new Date()));
  const [habitInsights, setHabitInsights] = useState<Record<string, HabitInsights>>({});
  const [historicalLogs, setHistoricalLogs] = useState<HabitLogRow[]>([]);

  const refreshHabits = useCallback(async () => {
    if (!isConfigured) {
      setHabits([]);
      setCompletions({});
      setHabitInsights({});
      setHistoricalLogs([]);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const currentDate = new Date();
    const todayISO = formatISODate(currentDate);
    setToday(todayISO);

    try {
      const { data: habitData, error: habitError } = await fetchHabitsForUser(session.user.id);
      if (habitError) throw habitError;

      const nextHabits = habitData ?? [];
      setHabits(nextHabits);

      if (nextHabits.length === 0) {
        setCompletions({});
        setHabitInsights({});
        setHistoricalLogs([]);
        return;
      }

      const habitIds = nextHabits.map((habit) => habit.id);
      const lookbackStart = subtractDays(currentDate, STREAK_LOOKBACK_DAYS - 1);
      const { data: logs, error: logsError } = await fetchHabitLogsForRange(
        habitIds,
        formatISODate(lookbackStart),
        todayISO,
      );
      if (logsError) throw logsError;

      const logRows = logs ?? [];

      const baseState = habitIds.reduce<Record<string, HabitCompletionState>>((acc, habitId) => {
        acc[habitId] = { logId: null, completed: false };
        return acc;
      }, {});

      for (const log of logRows) {
        if (log.date === todayISO) {
          baseState[log.habit_id] = { logId: log.id, completed: Boolean(log.completed) };
        }
      }

      setCompletions(baseState);
      setHistoricalLogs(logRows);
      setHabitInsights(calculateHabitInsights(nextHabits, logRows, todayISO));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to load habits right now. Try refreshing shortly.',
      );
    } finally {
      setLoading(false);
    }
  }, [session, isConfigured, isDemoExperience]);

  useEffect(() => {
    if (!isConfigured) {
      return;
    }
    void refreshHabits();
  }, [session?.user?.id, isConfigured, isDemoExperience, refreshHabits]);

  useEffect(() => {
    if (!isConfigured && !isDemoExperience) {
      setHabits([]);
      setCompletions({});
      setHabitInsights({});
      setHistoricalLogs([]);
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

  const toggleHabit = async (habit: HabitWithGoal) => {
    if (!isConfigured && !isDemoExperience) {
      setErrorMessage('Supabase credentials are not configured yet.');
      return;
    }

    setSaving((current) => ({ ...current, [habit.id]: true }));
    setErrorMessage(null);

    const existing = completions[habit.id];

    try {
      if (existing?.completed) {
        const { error } = await clearHabitCompletion(habit.id, today);
        if (error) throw error;
        setCompletions((current) => ({ ...current, [habit.id]: { logId: null, completed: false } }));
        setHistoricalLogs((current) => {
          const nextLogs = current.filter((log) => !(log.habit_id === habit.id && log.date === today));
          setHabitInsights(calculateHabitInsights(habits, nextLogs, today));
          return nextLogs;
        });
      } else {
        const payload: HabitLogInsert = {
          habit_id: habit.id,
          date: today,
          completed: true,
        };
        const { data, error } = await logHabitCompletion(payload);
        if (error) throw error;
        const logRow: HabitLogRow =
          data ?? ({
            id: existing?.logId ?? `temp-${habit.id}-${today}`,
            habit_id: habit.id,
            date: today,
            completed: true,
          } satisfies HabitLogRow);
        setCompletions((current) => ({
          ...current,
          [habit.id]: { logId: logRow.id, completed: true },
        }));
        setHistoricalLogs((current) => {
          const nextLogs = current.filter((log) => !(log.habit_id === habit.id && log.date === today));
          nextLogs.push(logRow);
          setHabitInsights(calculateHabitInsights(habits, nextLogs, today));
          return nextLogs;
        });
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update the habit.');
    } finally {
      setSaving((current) => ({ ...current, [habit.id]: false }));
    }
  };

  return (
    <section className="habit-tracker">
      <header className="habit-tracker__header">
        <div>
          <h2>Today&apos;s habit tracker</h2>
          <p>Log your progress for {formatDateLabel(today)} so nothing slips through the cracks.</p>
        </div>
        <button
          type="button"
          className="habit-tracker__refresh"
          onClick={() => void refreshHabits()}
          disabled={loading || (!isConfigured && !isDemoExperience)}
        >
          {loading ? 'Refreshing…' : 'Refresh habits'}
        </button>
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
          <h3>No habits scheduled for today</h3>
          <p>
            Once you add habits to your goals, they will appear here so you can check in daily and keep your streak alive.
          </p>
        </div>
      ) : (
        <ul className="habit-tracker__list">
          {habits.map((habit) => {
            const state = completions[habit.id];
            const isCompleted = Boolean(state?.completed);
            const isSaving = Boolean(saving[habit.id]);
            const insight = habitInsights[habit.id];
            const scheduledToday = insight?.scheduledToday ?? isHabitScheduledOnDate(habit, today);
            const currentStreak = insight?.currentStreak ?? (isCompleted ? 1 : 0);
            const longestStreak = insight?.longestStreak ?? Math.max(currentStreak, 0);
            const lastCompletedOn = insight?.lastCompletedOn ?? (isCompleted ? today : null);
            const statusText = scheduledToday
              ? isCompleted
                ? 'Completed for today. Keep the streak going!'
                : 'Tap the toggle when you finish this habit.'
              : 'Today is a rest day for this habit.';
            const lastCompletedText = formatLastCompleted(lastCompletedOn, today);
            return (
              <li key={habit.id} className={`habit-card ${isCompleted ? 'habit-card--completed' : ''}`}>
                <div className="habit-card__content">
                  <div>
                    <h3>{habit.name}</h3>
                    <p className="habit-card__goal">
                      Goal: <span>{habit.goal?.title ?? 'Unassigned goal'}</span>
                    </p>
                    <p className="habit-card__meta">{formatHabitMeta(habit.frequency, habit.schedule)}</p>
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
                  <div className="habit-card__streaks">
                    <div className="habit-card__streak habit-card__streak--current">
                      <span className="habit-card__streak-label">Current streak</span>
                      <span className="habit-card__streak-value">{formatStreakValue(currentStreak)}</span>
                    </div>
                    <div className="habit-card__streak habit-card__streak--longest">
                      <span className="habit-card__streak-label">Longest streak</span>
                      <span className="habit-card__streak-value">{formatStreakValue(longestStreak)}</span>
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
      )}
    </section>
  );
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
  todayISO: string,
): Record<string, HabitInsights> {
  if (habits.length === 0) {
    return {};
  }

  const todayDate = parseISODate(todayISO);
  const lookbackStartDate = subtractDays(todayDate, STREAK_LOOKBACK_DAYS - 1);
  const lookbackStartISO = formatISODate(lookbackStartDate);

  const completionSets = new Map<string, Set<string>>();
  const lastCompletedMap = new Map<string, string>();

  for (const log of logs) {
    if (!log.completed) continue;
    if (log.date < lookbackStartISO || log.date > todayISO) continue;
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

function formatLastCompleted(lastCompletedOn: string | null, todayISO: string): string | null {
  if (!lastCompletedOn) {
    return null;
  }

  if (lastCompletedOn === todayISO) {
    return 'Last completed today.';
  }

  const diff = differenceInDays(todayISO, lastCompletedOn);
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
    year: date.getFullYear() !== parseISODate(todayISO).getFullYear() ? 'numeric' : undefined,
  })}.`;
}
