import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { isDemoSession } from '../../services/demoSession';

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

type HabitLogInsert = Database['public']['Tables']['habit_logs']['Insert'];

type HabitLogRow = Database['public']['Tables']['habit_logs']['Row'];

type HabitInsights = {
  scheduledToday: boolean;
  currentStreak: number;
  longestStreak: number;
  lastCompletedOn: string | null;
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

export function DailyHabitTracker({ session, variant = 'full' }: DailyHabitTrackerProps) {
  const { isConfigured } = useSupabaseAuth();
  const isDemoExperience = isDemoSession(session);
  const isCompact = variant === 'compact';
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
  const [monthDays, setMonthDays] = useState<string[]>([]);
  const [habitInsights, setHabitInsights] = useState<Record<string, HabitInsights>>({});
  const [expandedHabits, setExpandedHabits] = useState<Record<string, boolean>>({});
  const [historicalLogs, setHistoricalLogs] = useState<HabitLogRow[]>([]);
  // State for selected month/year: allows user to navigate between different months
  // selectedMonth: 0-11, where 0 = January
  // selectedYear: full year number (e.g., 2025)
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

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
    // Use selected month/year instead of current month for monthly grid
    const monthStartDate = new Date(selectedYear, selectedMonth, 1);
    const monthEndDate = new Date(selectedYear, selectedMonth + 1, 0);
    const monthStartISO = formatISODate(monthStartDate);
    const monthEndISO = formatISODate(monthEndDate);
    const monthDayList = generateDateRange(monthStartDate, monthEndDate);
    setToday(todayISO);
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

        if (log.date === todayISO) {
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
      setHabitInsights(calculateHabitInsights(nextHabits, logRows, todayISO));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to load habits right now. Try refreshing shortly.',
      );
    } finally {
      setLoading(false);
    }
  }, [session, isConfigured, isDemoExperience, selectedMonth, selectedYear]);

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

    const isToday = dateISO === today;
    const cellKey = `${habit.id}:${dateISO}`;

    if (isToday) {
      setSaving((current) => ({ ...current, [habit.id]: true }));
    }
    setMonthlySaving((current) => ({ ...current, [cellKey]: true }));
    setErrorMessage(null);

    const existingToday = completions[habit.id];
    const existingMonthly = monthlyCompletions[habit.id]?.[dateISO];
    const wasCompleted = Boolean(existingMonthly?.completed || (isToday && existingToday?.completed));

    try {
      if (wasCompleted) {
        const { error } = await clearHabitCompletion(habit.id, dateISO);
        if (error) throw error;

        if (isToday) {
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
          setHabitInsights(calculateHabitInsights(habits, nextLogs, today));
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

        if (isToday) {
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
          setHabitInsights(calculateHabitInsights(habits, nextLogs, today));
          return nextLogs;
        });
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update the habit.');
    } finally {
      if (isToday) {
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
    await toggleHabitForDate(habit, today);
  };

  const compactStats = useMemo(() => {
    if (habits.length === 0) {
      return { total: 0, scheduled: 0, completed: 0 } as const;
    }

    let scheduled = 0;
    let completed = 0;

    for (const habit of habits) {
      const insight = habitInsights[habit.id];
      const scheduledToday = insight?.scheduledToday ?? isHabitScheduledOnDate(habit, today);
      if (scheduledToday) {
        scheduled += 1;
      }
      if (completions[habit.id]?.completed) {
        completed += 1;
      }
    }

    return { total: habits.length, scheduled, completed } as const;
  }, [habits, completions, habitInsights, today]);

  const toggleExpanded = (habitId: string) => {
    setExpandedHabits((current) => ({
      ...current,
      [habitId]: !current[habitId],
    }));
  };

  const renderCompactList = () => (
    <ul className="habit-checklist" role="list">
      {habits.map((habit) => {
        const state = completions[habit.id];
        const isCompleted = Boolean(state?.completed);
        const isSaving = Boolean(saving[habit.id]);
        const insight = habitInsights[habit.id];
        const scheduledToday = insight?.scheduledToday ?? isHabitScheduledOnDate(habit, today);
        const lastCompletedOn = insight?.lastCompletedOn ?? (isCompleted ? today : null);
        const lastCompletedText = formatLastCompleted(lastCompletedOn, today);
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
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );

  const renderCompactExperience = () => {
    const dateLabel = formatCompactDateLabel(today);
    const timeLabel = formatCompactTimeLabel();
    const scheduledTarget = compactStats.scheduled || compactStats.total;
    const progressLabel = scheduledTarget
      ? `${Math.min(compactStats.completed, scheduledTarget)}/${scheduledTarget} done`
      : 'No habits scheduled';

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

    return (
      <div className="habit-checklist-card" role="region" aria-label="Today's habit checklist">
        <div className="habit-checklist-card__board">
          <div className="habit-checklist-card__board-head">
            <div className="habit-checklist-card__date-group">
              <p className="habit-checklist-card__date">{dateLabel}</p>
              <p className="habit-checklist-card__time">{timeLabel}</p>
            </div>
            <div className="habit-checklist-card__head-actions">
              <span className="habit-checklist-card__progress">{progressLabel}</span>
              <button
                type="button"
                className="habit-checklist-card__refresh"
                onClick={() => void refreshHabits()}
                disabled={loading || (!isConfigured && !isDemoExperience)}
              >
                {loading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>

          <div className="habit-checklist-card__board-body">
            <div className="habit-checklist-card__title">
              <h2>Things to do today</h2>
              <p>Check off the rituals that keep your life wheel balanced.</p>
            </div>

            {habits.length === 0 ? (
              <div className="habit-checklist-card__empty">
                <p>No habits scheduled for today.</p>
                <p>Add a ritual to any goal and it will show up here for quick check-ins.</p>
              </div>
            ) : (
              renderCompactList()
            )}
          </div>
        </div>

        <p className={`habit-checklist-card__status habit-checklist-card__status--${statusVariant}`}>
          {statusText}
        </p>
      </div>
    );
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
            <div>
              <h3>{formatMonthYearLabel(selectedYear, selectedMonth)}</h3>
              <p>
                {monthlySummary.scheduledTotal === 0
                  ? 'No scheduled habits this month yet. Build your rituals to see them here.'
                  : `${monthlySummary.scheduledComplete} of ${monthlySummary.scheduledTotal} scheduled check-ins complete (${completionPercent}%).`}
              </p>
            </div>
            <div className="habit-monthly__summary-meter" role="img" aria-label={`Monthly completion ${completionPercent}%`}>
              <div
                className="habit-monthly__summary-meter-bar"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>

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
              {habits.map((habit) => {
                const domainMeta = extractLifeWheelDomain(habit.schedule);
                const domainLabel = domainMeta ? formatLifeWheelDomainLabel(domainMeta) : null;
                const domainColor = getLifeWheelColor(domainMeta?.key ?? null);
                const goalLabel = habit.goal?.title ?? 'Unassigned goal';
                const habitMatrix = monthlyCompletions[habit.id] ?? {};

                return (
                  <tr key={habit.id} className="habit-monthly__row" style={{ borderLeftColor: domainColor }}>
                    <th scope="row" className="habit-monthly__habit-cell">
                      <div className="habit-monthly__habit">
                        <span className="habit-monthly__domain" style={{ backgroundColor: domainColor }}>
                          {domainLabel ?? 'Whole life'}
                        </span>
                        <div className="habit-monthly__habit-details">
                          <span className="habit-monthly__habit-name">{habit.name}</span>
                          <span className="habit-monthly__habit-goal">Goal: {goalLabel}</span>
                        </div>
                      </div>
                    </th>
                    {monthDays.map((dateIso) => {
                      const cellKey = `${habit.id}:${dateIso}`;
                      const cellState = habitMatrix[dateIso];
                      const isCompleted = Boolean(cellState?.completed);
                      const scheduled = isHabitScheduledOnDate(habit, dateIso);
                      const isToday = dateIso === today;
                      const isSavingCell = Boolean(monthlySaving[cellKey]);
                      const disableToggle = !scheduled && !isCompleted;
                      const dayLabel = formatDateLabel(dateIso);

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
                            aria-label={`${isCompleted ? 'Uncheck' : 'Check'} ${habit.name} for ${dayLabel}`}
                            onClick={() => void toggleHabitForDate(habit, dateIso)}
                            disabled={disableToggle || isSavingCell}
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
        </div>
      </div>
    );
  };

  if (isCompact) {
    return <section className="habit-tracker habit-tracker--compact">{renderCompactExperience()}</section>;
  }

  return (
    <section className="habit-tracker">
      <header className="habit-tracker__header">
        <div>
          <h2>{`Monthly habits dashboard • ${formatMonthYearLabel(selectedYear, selectedMonth)} (${monthDays.length} days)`}</h2>
          <p>Use the monthly grid to see every habit alongside the life wheel domains they support.</p>
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
        <>
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
          
          {/* Monthly Grid View with Month Switcher */}
          {renderMonthlyGrid()}
        </>
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

const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  year: 'numeric',
});

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
  year: 'numeric',
});

const COMPACT_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function formatMonthLabel(value: string) {
  return MONTH_FORMATTER.format(parseISODate(value));
}

function formatMonthYearLabel(year: number, month: number) {
  return MONTH_FORMATTER.format(new Date(year, month, 1));
}

function formatDayOfMonth(value: string) {
  return DAY_NUMBER_FORMATTER.format(parseISODate(value));
}

function formatDayOfWeekShort(value: string) {
  return DAY_SHORT_FORMATTER.format(parseISODate(value));
}

function formatCompactDateLabel(value: string) {
  return COMPACT_DATE_FORMATTER.format(parseISODate(value));
}

function formatCompactTimeLabel(date: Date = new Date()) {
  return COMPACT_TIME_FORMATTER.format(date);
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

function generateDateRange(start: Date, end: Date): string[] {
  const days: string[] = [];
  const cursor = new Date(start.getTime());
  while (cursor <= end) {
    days.push(formatISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
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
