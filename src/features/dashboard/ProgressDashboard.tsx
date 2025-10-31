import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { fetchGoals } from '../../services/goals';
import {
  fetchHabitLogsForRange,
  fetchHabitsForUser,
  type HabitWithGoal,
} from '../../services/habits';
import type { Database } from '../../lib/database.types';

type GoalRow = Database['public']['Tables']['goals']['Row'];
type HabitLogRow = Database['public']['Tables']['habit_logs']['Row'];

type ProgressDashboardProps = {
  session: Session;
};

type CalendarDay = {
  date: string;
  label: string;
  completions: number;
  isToday: boolean;
};

type WeeklySnapshot = {
  date: string;
  label: string;
  completions: number;
};

function formatISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getMonthBoundaries(reference: Date) {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
  return {
    start,
    end,
  };
}

function buildCalendarDays(reference: Date, completions: Record<string, number>): CalendarDay[] {
  const { start, end } = getMonthBoundaries(reference);
  const totalDays = end.getDate();
  const todayISO = formatISODate(reference);

  return Array.from({ length: totalDays }, (_, index) => {
    const day = new Date(reference.getFullYear(), reference.getMonth(), index + 1);
    const isoDate = formatISODate(day);
    return {
      date: isoDate,
      label: day.getDate().toString(),
      completions: completions[isoDate] ?? 0,
      isToday: isoDate === todayISO,
    } satisfies CalendarDay;
  });
}

function buildWeeklySnapshot(reference: Date, completions: Record<string, number>): WeeklySnapshot[] {
  const formatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(reference);
    day.setDate(reference.getDate() - (6 - index));
    const isoDate = formatISODate(day);
    return {
      date: isoDate,
      label: formatter.format(day),
      completions: completions[isoDate] ?? 0,
    } satisfies WeeklySnapshot;
  });
}

export function ProgressDashboard({ session }: ProgressDashboardProps) {
  const { isConfigured, mode } = useSupabaseAuth();
  const isDemoMode = mode === 'demo';
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [habits, setHabits] = useState<HabitWithGoal[]>([]);
  const [logs, setLogs] = useState<HabitLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);
  const { start: monthStart, end: monthEnd } = useMemo(() => getMonthBoundaries(today), [today]);

  const refreshDashboard = useCallback(async () => {
    if (!session || (!isConfigured && !isDemoMode)) {
      setGoals([]);
      setHabits([]);
      setLogs([]);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const [{ data: goalData, error: goalError }, { data: habitData, error: habitError }] = await Promise.all([
        fetchGoals(),
        fetchHabitsForUser(session.user.id),
      ]);

      if (goalError) throw goalError;
      if (habitError) throw habitError;

      const ownedGoals = (goalData ?? []).filter((goal) => goal.user_id === session.user.id);
      setGoals(ownedGoals);

      const nextHabits = habitData ?? [];
      setHabits(nextHabits);

      if (nextHabits.length === 0) {
        setLogs([]);
        return;
      }

      const habitIds = nextHabits.map((habit) => habit.id);
      const { data: logData, error: logError } = await fetchHabitLogsForRange(
        habitIds,
        formatISODate(monthStart),
        formatISODate(monthEnd),
      );
      if (logError) throw logError;
      setLogs(logData ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to load dashboard insights. Please try again shortly.',
      );
    } finally {
      setLoading(false);
    }
  }, [session, isConfigured, isDemoMode, monthStart, monthEnd]);

  useEffect(() => {
    if (!session || (!isConfigured && !isDemoMode)) {
      return;
    }
    void refreshDashboard();
  }, [session?.user?.id, isConfigured, isDemoMode, refreshDashboard]);

  useEffect(() => {
    if (!isConfigured && !isDemoMode) {
      setGoals([]);
      setHabits([]);
      setLogs([]);
    }
  }, [isConfigured, isDemoMode]);

  const completionMap = useMemo(() => {
    return logs.reduce<Record<string, number>>((acc, log) => {
      if (!log.completed) {
        return acc;
      }
      acc[log.date] = (acc[log.date] ?? 0) + 1;
      return acc;
    }, {});
  }, [logs]);

  const calendarDays = useMemo(() => buildCalendarDays(today, completionMap), [today, completionMap]);
  const weeklySnapshot = useMemo(
    () => buildWeeklySnapshot(today, completionMap),
    [today, completionMap],
  );

  const totalHabits = habits.length;
  const weeklyTotals = useMemo(() => {
    const completed = weeklySnapshot.reduce((sum, day) => sum + day.completions, 0);
    const possible = totalHabits * weeklySnapshot.length;
    const completionRate = possible > 0 ? Math.min(100, Math.round((completed / possible) * 100)) : 0;
    return { completed, possible, completionRate };
  }, [weeklySnapshot, totalHabits]);

  const upcomingGoals = useMemo(() => {
    const todayISO = formatISODate(today);
    return goals
      .filter((goal) => goal.target_date && goal.target_date >= todayISO)
      .sort((a, b) => (a.target_date ?? '').localeCompare(b.target_date ?? ''))
      .slice(0, 4);
  }, [goals, today]);

  return (
    <section className="progress-dashboard">
      <header className="progress-dashboard__header">
        <div>
          <h2>Progress dashboard</h2>
          <p>
            Visualize your month at a glance, track streaks, and keep upcoming goal milestones on your radar.
          </p>
        </div>
        <button
          type="button"
          className="progress-dashboard__refresh"
          onClick={() => void refreshDashboard()}
          disabled={loading || (!isConfigured && !isDemoMode)}
        >
          {loading ? 'Refreshing…' : 'Refresh insights'}
        </button>
      </header>

      {isDemoMode ? (
        <p className="progress-dashboard__status progress-dashboard__status--info">
          Dashboard metrics are generated from demo data stored locally. Connect Supabase to analyze real habit completions
          and goal milestones.
        </p>
      ) : !isConfigured ? (
        <p className="progress-dashboard__status progress-dashboard__status--warning">
          Add your Supabase credentials to enable analytics, calendar history, and personalized goal summaries.
        </p>
      ) : null}

      {errorMessage ? (
        <p className="progress-dashboard__status progress-dashboard__status--error">{errorMessage}</p>
      ) : null}

      {isConfigured && habits.length === 0 ? (
        <div className="progress-dashboard__empty">
          <h3>No habits to visualize yet</h3>
          <p>
            Capture habits inside the Goals &amp; Habits workspace and they&apos;ll populate the dashboard with streaks and
            completion stats.
          </p>
        </div>
      ) : (
        <div className="progress-dashboard__grid">
          <article className="progress-card progress-card--summary">
            <header>
              <h3>This week&apos;s momentum</h3>
              <p>
                {totalHabits > 0
                  ? `You checked off ${weeklyTotals.completed} of ${weeklyTotals.possible} planned habits this week.`
                  : 'Add habits to start measuring your streaks.'}
              </p>
            </header>
            <div className="progress-card__metric">
              <span className="progress-card__metric-value">{weeklyTotals.completionRate}%</span>
              <span className="progress-card__metric-label">Completion rate</span>
            </div>
            <ul className="progress-card__trend" aria-label="Daily habit completions for the past 7 days">
              {weeklySnapshot.map((day) => (
                <li key={day.date}>
                  <span className="progress-card__trend-label">{day.label}</span>
                  <span className="progress-card__trend-value">{day.completions}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="progress-card progress-card--calendar">
            <header>
              <h3>{today.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</h3>
              <p>Each dot represents habits you completed on that day.</p>
            </header>
            <div className="progress-calendar" role="grid" aria-label="Habit completion calendar">
              {calendarDays.map((day) => (
                <div
                  key={day.date}
                  role="gridcell"
                  aria-label={`${day.date}: ${day.completions} habits completed`}
                  className={`progress-calendar__day ${day.isToday ? 'progress-calendar__day--today' : ''}`}
                >
                  <span className="progress-calendar__date">{day.label}</span>
                  <span
                    className={`progress-calendar__dot progress-calendar__dot--level-${getDensityLevel(
                      day.completions,
                    )}`}
                  />
                  <span className="progress-calendar__count">{day.completions}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="progress-card progress-card--goals">
            <header>
              <h3>Upcoming goal milestones</h3>
              <p>Stay ahead of deadlines by keeping these target dates in focus.</p>
            </header>
            {upcomingGoals.length === 0 ? (
              <p className="progress-card__empty">No upcoming target dates. Set target dates when creating your goals.</p>
            ) : (
              <ul className="progress-card__goal-list">
                {upcomingGoals.map((goal) => (
                  <li key={goal.id}>
                    <span className="progress-card__goal-title">{goal.title}</span>
                    <span className="progress-card__goal-date">{formatReadableDate(goal.target_date!)}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      )}
    </section>
  );
}

function getDensityLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

function formatReadableDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}
