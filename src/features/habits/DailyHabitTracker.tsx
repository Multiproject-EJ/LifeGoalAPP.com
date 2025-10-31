import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import {
  clearHabitCompletion,
  fetchHabitLogsForDate,
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

export function DailyHabitTracker({ session }: DailyHabitTrackerProps) {
  const { isConfigured } = useSupabaseAuth();
  const [habits, setHabits] = useState<HabitWithGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completions, setCompletions] = useState<Record<string, HabitCompletionState>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const refreshHabits = useCallback(async () => {
    if (!session || !isConfigured) {
      setHabits([]);
      setCompletions({});
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const { data: habitData, error: habitError } = await fetchHabitsForUser(session.user.id);
      if (habitError) throw habitError;

      const nextHabits = habitData ?? [];
      setHabits(nextHabits);

      if (nextHabits.length === 0) {
        setCompletions({});
        return;
      }

      const habitIds = nextHabits.map((habit) => habit.id);
      const { data: logs, error: logsError } = await fetchHabitLogsForDate(today, habitIds);
      if (logsError) throw logsError;

      const baseState = habitIds.reduce<Record<string, HabitCompletionState>>((acc, habitId) => {
        acc[habitId] = { logId: null, completed: false };
        return acc;
      }, {});

      for (const log of logs ?? []) {
        baseState[log.habit_id] = { logId: log.id, completed: Boolean(log.completed) };
      }

      setCompletions(baseState);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to load habits right now. Try refreshing shortly.',
      );
    } finally {
      setLoading(false);
    }
  }, [session, isConfigured, today]);

  useEffect(() => {
    if (!session || !isConfigured) {
      return;
    }
    void refreshHabits();
  }, [session?.user?.id, isConfigured, refreshHabits]);

  useEffect(() => {
    if (!isConfigured) {
      setHabits([]);
      setCompletions({});
    }
  }, [isConfigured]);

  const toggleHabit = async (habit: HabitWithGoal) => {
    if (!session) {
      setErrorMessage('You need to be signed in to update habits.');
      return;
    }
    if (!isConfigured) {
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
      } else {
        const payload: HabitLogInsert = {
          habit_id: habit.id,
          date: today,
          completed: true,
        };
        const { data, error } = await logHabitCompletion(payload);
        if (error) throw error;
        const logRow: HabitLogRow | null = data;
        setCompletions((current) => ({
          ...current,
          [habit.id]: { logId: logRow?.id ?? null, completed: true },
        }));
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
          disabled={loading || !isConfigured}
        >
          {loading ? 'Refreshing…' : 'Refresh habits'}
        </button>
      </header>

      {!isConfigured ? (
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
                  {isCompleted ? 'Completed for today' : 'Tap the toggle when you finish this habit.'}
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
  const date = new Date(value);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}
