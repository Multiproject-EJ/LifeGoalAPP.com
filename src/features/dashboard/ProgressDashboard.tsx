import { FormEvent, useCallback, useEffect, useId, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { fetchGoals } from '../../services/goals';
import {
  buildSchedulePayload,
  fetchHabitLogsForRange,
  fetchHabitsForUser,
  type HabitWithGoal,
  upsertHabit,
} from '../../services/habits';
import type { Database, Json } from '../../lib/database.types';
import {
  GOAL_STATUS_META,
  GOAL_STATUS_ORDER,
  type GoalStatusTag,
  normalizeGoalStatus,
} from '../goals/goalStatus';
import { LIFE_WHEEL_CATEGORIES } from '../checkins/LifeWheelCheckins';
import { DeveloperIdeasPage } from '../ideas/DeveloperIdeasPage';

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

type GoalStatusExample = {
  title: string;
  note: string | null;
};

type GoalStatusSummary = {
  counts: Record<GoalStatusTag, number>;
  total: number;
  activeTotal: number;
  flagged: number;
  examples: Partial<Record<GoalStatusTag, GoalStatusExample>>;
};

const FOCUS_TONE_META = {
  stabilize: {
    label: 'Stabilize',
  },
  boost: {
    label: 'Boost',
  },
  celebrate: {
    label: 'Celebrate',
  },
} as const;

type FocusTone = keyof typeof FOCUS_TONE_META;

type FocusAction = {
  id: string;
  tone: FocusTone;
  status: GoalStatusTag;
  title: string;
  summary: string;
  note?: string;
};

type WeeklyFocusDigest = {
  intro: string;
  headline: string;
  actions: FocusAction[];
  emptyMessage: string;
};

type UrgentTaskNote = {
  id: string;
  title: string;
  detail: string;
  dueLabel: string;
  accent: 'sunrise' | 'ocean';
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
  const { isConfigured, mode, isAuthenticated } = useSupabaseAuth();
  const isDemoExperience = mode === 'demo' || !isAuthenticated;
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [habits, setHabits] = useState<HabitWithGoal[]>([]);
  const [logs, setLogs] = useState<HabitLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [newHabitName, setNewHabitName] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [selectedDomainKey, setSelectedDomainKey] = useState<string>(
    LIFE_WHEEL_CATEGORIES[0]?.key ?? '',
  );
  const [habitFormMessage, setHabitFormMessage] = useState<string | null>(null);
  const [habitFormError, setHabitFormError] = useState<string | null>(null);
  const [creatingHabit, setCreatingHabit] = useState(false);
  const [showIdeasPage, setShowIdeasPage] = useState(false);

  const today = useMemo(() => new Date(), []);
  const { start: monthStart, end: monthEnd } = useMemo(() => getMonthBoundaries(today), [today]);
  const nameFieldId = useId();
  const domainFieldId = useId();
  const goalFieldId = useId();
  const canCreateHabits = isConfigured || isDemoExperience;
  const hasGoals = goals.length > 0;

  const refreshDashboard = useCallback(async () => {
    if (!session || (!isConfigured && !isDemoExperience)) {
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
  }, [session, isConfigured, isDemoExperience, monthStart, monthEnd]);

  useEffect(() => {
    if (!isConfigured) {
      return;
    }
    void refreshDashboard();
  }, [session?.user?.id, isConfigured, isDemoExperience, refreshDashboard]);

  useEffect(() => {
    if (!isConfigured && !isDemoExperience) {
      setGoals([]);
      setHabits([]);
      setLogs([]);
    }
  }, [isConfigured, isDemoExperience]);

  useEffect(() => {
    if (selectedGoalId || goals.length === 0) {
      return;
    }
    setSelectedGoalId(goals[0]?.id ?? '');
  }, [goals, selectedGoalId]);

  const handleHabitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHabitFormMessage(null);
    setHabitFormError(null);

    if (!canCreateHabits) {
      setHabitFormError('Connect Supabase to create new habits from the dashboard.');
      return;
    }

    const trimmedName = newHabitName.trim();
    if (!trimmedName) {
      setHabitFormError('Name your habit to save it.');
      return;
    }

    if (!selectedGoalId) {
      setHabitFormError('Choose a goal so we can attach this habit to your life wheel focus.');
      return;
    }

    setCreatingHabit(true);

    try {
      const domain = LIFE_WHEEL_CATEGORIES.find((entry) => entry.key === selectedDomainKey) ?? null;
      const scheduleRecord: Record<string, Json> = { type: 'daily' };
      if (domain) {
        scheduleRecord.life_wheel_domain = { key: domain.key, label: domain.label } as Json;
      } else if (selectedDomainKey) {
        scheduleRecord.life_wheel_domain = { key: selectedDomainKey } as Json;
      }

      const { error } = await upsertHabit({
        goal_id: selectedGoalId,
        name: trimmedName,
        frequency: 'daily',
        schedule: buildSchedulePayload(scheduleRecord),
      });

      if (error) throw error;

      setHabitFormMessage('Habit added to your daily checklist.');
      setNewHabitName('');
      setSelectedGoalId('');
      setSelectedDomainKey(LIFE_WHEEL_CATEGORIES[0]?.key ?? '');
      await refreshDashboard();
    } catch (error) {
      setHabitFormError(
        error instanceof Error ? error.message : 'Unable to save the habit. Please try again shortly.',
      );
    } finally {
      setCreatingHabit(false);
    }
  };

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

  const goalStatusSummary = useMemo<GoalStatusSummary>(() => {
    const counts: Record<GoalStatusTag, number> = {
      on_track: 0,
      at_risk: 0,
      off_track: 0,
      achieved: 0,
    };
    const examples: GoalStatusSummary['examples'] = {};

    for (const goal of goals) {
      const status = normalizeGoalStatus(goal.status_tag);
      counts[status] += 1;

      const title = goal.title?.trim() || 'Untitled goal';
      const trimmedNote = goal.progress_notes?.trim() ?? '';
      const note = trimmedNote ? trimmedNote : null;
      const existing = examples[status];

      if (!existing || (note && !existing.note)) {
        examples[status] = { title, note };
      }
    }

    const total = GOAL_STATUS_ORDER.reduce((sum, status) => sum + counts[status], 0);
    const activeTotal = total - counts.achieved;
    const flagged = counts.at_risk + counts.off_track;

    return { counts, total, activeTotal, flagged, examples };
  }, [goals]);

  const goalStatusMessage = useMemo(() => {
    const { total, flagged, counts } = goalStatusSummary;

    if (total === 0) {
      return 'Add your first goal to start tracking progress health.';
    }

    if (flagged > 0) {
      if (counts.off_track > 0) {
        const count = counts.off_track;
        return `${count} goal${count === 1 ? ' is' : 's are'} off track. Use the latest notes to plan a reset.`;
      }

      const count = counts.at_risk;
      return `${count} goal${count === 1 ? ' needs' : 's need'} a boost this week to stay on track.`;
    }

    if (counts.achieved > 0 && counts.achieved === total) {
      return 'All of your goals here are achieved—time to dream up the next milestone!';
    }

    if (counts.achieved > 0) {
      const count = counts.achieved;
      return `Celebrate ${count} recent ${count === 1 ? 'win' : 'wins'} while keeping the rest in motion.`;
    }

    return 'Everything is trending smoothly—keep showing up for your rituals.';
  }, [goalStatusSummary]);

  const focusDigest = useMemo(
    () => createWeeklyFocusDigest(goals, today),
    [goals, today],
  );

  const urgentTasks = useMemo<UrgentTaskNote[]>(
    () => [
      {
        id: 'client-sync',
        title: 'Client strategy sync',
        detail: 'Finalize the talking points and share the deck before the call.',
        dueLabel: 'Today · 2:30 PM',
        accent: 'sunrise',
      },
      {
        id: 'habit-journal',
        title: 'Evening reflection',
        detail: 'Log your top three wins and note one improvement for tomorrow.',
        dueLabel: 'Tonight · 9:00 PM',
        accent: 'ocean',
      },
    ],
    [],
  );

  return (
    <section className="progress-dashboard">
      {showIdeasPage ? <DeveloperIdeasPage onClose={() => setShowIdeasPage(false)} /> : null}
      <header className="progress-dashboard__header">
        <div>
          <h2>Progress dashboard</h2>
          <p>
            Visualize your month at a glance, track streaks, and keep upcoming goal milestones on your radar.
          </p>
        </div>
        <div className="progress-dashboard__actions">
          <button
            type="button"
            className="progress-dashboard__ideas"
            onClick={() => setShowIdeasPage(true)}
          >
            Developer ideas
          </button>
          <button
            type="button"
            className="progress-dashboard__refresh"
            onClick={() => void refreshDashboard()}
            disabled={loading || (!isConfigured && !isDemoExperience)}
          >
            {loading ? 'Refreshing…' : 'Refresh insights'}
          </button>
        </div>
      </header>

      <section className="urgent-tasks" aria-label="Urgent tasks">
        <div className="urgent-tasks__header">
          <h3>Urgent tasks</h3>
          <p>Pin a couple of sticky notes to spotlight what needs your focus first.</p>
        </div>
        <div className="urgent-tasks__board">
          {urgentTasks.map((task) => (
            <article key={task.id} className={`sticky-note sticky-note--${task.accent}`}>
              <span className="sticky-note__pin" aria-hidden="true" />
              <h4>{task.title}</h4>
              <p>{task.detail}</p>
              <p className="sticky-note__due">
                <strong>Due</strong> {task.dueLabel}
              </p>
            </article>
          ))}
        </div>
      </section>

      {isDemoExperience ? (
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
          <article className="progress-card progress-card--habit-create">
            <header>
              <h3>Capture a new daily habit</h3>
              <p>Align a fresh ritual with your life wheel so it appears on today&apos;s checklist.</p>
            </header>
            <form className="habit-create-form" onSubmit={handleHabitCreate}>
              <label className="habit-create-form__field" htmlFor={nameFieldId}>
                <span>Habit name</span>
                <input
                  id={nameFieldId}
                  type="text"
                  value={newHabitName}
                  onChange={(event) => setNewHabitName(event.target.value)}
                  placeholder="Evening wind-down ritual"
                  autoComplete="off"
                  disabled={!canCreateHabits}
                />
              </label>

              <div className="habit-create-form__row">
                <label className="habit-create-form__field" htmlFor={domainFieldId}>
                  <span>Life wheel focus</span>
                  <select
                    id={domainFieldId}
                    value={selectedDomainKey}
                    onChange={(event) => setSelectedDomainKey(event.target.value)}
                    disabled={!canCreateHabits}
                  >
                    {LIFE_WHEEL_CATEGORIES.map((category) => (
                      <option key={category.key} value={category.key}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="habit-create-form__field" htmlFor={goalFieldId}>
                  <span>Attach to goal</span>
                  <select
                    id={goalFieldId}
                    value={selectedGoalId}
                    onChange={(event) => setSelectedGoalId(event.target.value)}
                    disabled={!canCreateHabits || !hasGoals}
                  >
                    <option value="" disabled>
                      {hasGoals ? 'Choose a goal' : 'No goals yet'}
                    </option>
                    {goals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.title ?? 'Untitled goal'}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {habitFormMessage ? (
                <p className="habit-create-form__status habit-create-form__status--success">
                  {habitFormMessage}
                </p>
              ) : null}
              {habitFormError ? (
                <p className="habit-create-form__status habit-create-form__status--error">{habitFormError}</p>
              ) : null}

              <button
                type="submit"
                className="habit-create-form__submit"
                disabled={creatingHabit || !canCreateHabits || !hasGoals}
              >
                {creatingHabit ? 'Saving…' : 'Add daily habit'}
              </button>
            </form>

            {!canCreateHabits ? (
              <p className="habit-create-form__hint">
                Connect Supabase or explore demo mode to create habits from the dashboard.
              </p>
            ) : null}
            {canCreateHabits && !hasGoals ? (
              <p className="habit-create-form__hint">
                Create a goal first to anchor your new habit to your life wheel.
              </p>
            ) : null}
          </article>

          <article className="progress-card progress-card--digest">
            <header>
              <h3>Weekly focus digest</h3>
              <p>{focusDigest.intro}</p>
              {focusDigest.headline ? (
                <p className="focus-digest__headline">{focusDigest.headline}</p>
              ) : null}
            </header>
            {focusDigest.actions.length === 0 ? (
              <p className="progress-card__empty">{focusDigest.emptyMessage}</p>
            ) : (
              <ul className="focus-digest__actions">
                {focusDigest.actions.map((action) => (
                  <li
                    key={action.id}
                    className={`focus-digest__action focus-digest__action--${action.tone}`}
                  >
                    <div className="focus-digest__meta">
                      <span className={`goal-status goal-status--${action.status}`}>
                        {GOAL_STATUS_META[action.status].label}
                      </span>
                      <span className={`focus-digest__tone focus-digest__tone--${action.tone}`}>
                        {FOCUS_TONE_META[action.tone].label}
                      </span>
                    </div>
                    <p className="focus-digest__action-title">{action.title}</p>
                    <p className="focus-digest__action-summary">{action.summary}</p>
                    {action.note ? (
                      <p className="focus-digest__action-note">{action.note}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </article>

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

          <article className="progress-card progress-card--statuses">
            <header>
              <h3>Goal health snapshot</h3>
              <p>{goalStatusMessage}</p>
            </header>
            {goalStatusSummary.total === 0 ? (
              <p className="progress-card__empty">Add at least one goal to see the health breakdown.</p>
            ) : (
              <ul className="progress-status-list">
                {GOAL_STATUS_ORDER.map((status) => {
                  const count = goalStatusSummary.counts[status];
                  const percent =
                    goalStatusSummary.total > 0
                      ? Math.round((count / goalStatusSummary.total) * 100)
                      : 0;
                  const meta = GOAL_STATUS_META[status];
                  const example = goalStatusSummary.examples[status];
                  const noteSnippet = example?.note ? summarizeNote(example.note) : '';
                  const hasNote = Boolean(noteSnippet);

                  return (
                    <li key={status} className={`progress-status progress-status--${status}`}>
                      <div className="progress-status__label">
                        <span className={`goal-status goal-status--${status}`}>{meta.label}</span>
                        <span className="progress-status__count">
                          {count} {count === 1 ? 'goal' : 'goals'}
                          <span className="progress-status__percent">({percent}%)</span>
                        </span>
                      </div>
                      <div
                        className="progress-status__bar"
                        role="progressbar"
                        aria-valuenow={percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <span
                          className={`progress-status__bar-fill progress-status__bar-fill--${status}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      {hasNote ? (
                        <div className="progress-status__note">
                          <span className="progress-status__note-title">
                            {example?.title ?? meta.label}
                          </span>
                          <span className="progress-status__note-text">{noteSnippet}</span>
                        </div>
                      ) : (
                        <p className="progress-status__description">
                          {count === 0 ? meta.empty : meta.description}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
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

function summarizeNote(note: string, maxLength = 160): string {
  const condensed = note.replace(/\s+/g, ' ').trim();
  if (!condensed) {
    return '';
  }
  if (condensed.length <= maxLength) {
    return condensed;
  }
  return `${condensed.slice(0, Math.max(0, maxLength - 1))}…`;
}

function formatReadableDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

type RelativeUnit = 'day' | 'week' | 'month';

type TargetContext = {
  relative: string;
  readable: string;
  isPast: boolean;
};

function getGoalTargetContext(goal: GoalRow, reference: Date): TargetContext | null {
  if (!goal.target_date) {
    return null;
  }

  const target = new Date(goal.target_date);
  if (Number.isNaN(target.getTime())) {
    return null;
  }

  const startOfDay = (date: Date) => {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };

  const today = startOfDay(reference).getTime();
  const targetTime = startOfDay(target).getTime();
  const diffMs = targetTime - today;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const absDays = Math.abs(diffDays);

  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  let unit: RelativeUnit = 'day';
  let value = diffDays;

  if (absDays >= 60) {
    unit = 'month';
    value = Math.round(diffDays / 30);
  } else if (absDays >= 14) {
    unit = 'week';
    value = Math.round(diffDays / 7);
  }

  return {
    relative: formatter.format(value, unit),
    readable: formatReadableDate(goal.target_date),
    isPast: diffDays < 0,
  };
}

function resolveGoalTimestamp(goal: GoalRow): number {
  if (goal.target_date) {
    const target = new Date(goal.target_date).getTime();
    if (!Number.isNaN(target)) {
      return target;
    }
  }

  if (goal.created_at) {
    const created = new Date(goal.created_at).getTime();
    if (!Number.isNaN(created)) {
      return created;
    }
  }

  return Number.POSITIVE_INFINITY;
}

function compareGoalsByUrgency(a: GoalRow, b: GoalRow): number {
  const aTime = resolveGoalTimestamp(a);
  const bTime = resolveGoalTimestamp(b);

  if (!Number.isFinite(aTime) && !Number.isFinite(bTime)) {
    return 0;
  }

  if (!Number.isFinite(aTime)) {
    return 1;
  }

  if (!Number.isFinite(bTime)) {
    return -1;
  }

  return aTime - bTime;
}

function pickMostRecentGoal(goals: GoalRow[]): GoalRow | null {
  if (goals.length === 0) {
    return null;
  }

  return goals
    .slice()
    .sort((a, b) => {
      const aTime = resolveGoalTimestamp(a);
      const bTime = resolveGoalTimestamp(b);

      if (Number.isFinite(bTime) && Number.isFinite(aTime)) {
        return bTime - aTime;
      }

      if (Number.isFinite(bTime)) {
        return -1;
      }

      if (Number.isFinite(aTime)) {
        return 1;
      }

      return 0;
    })[0];
}

function buildFocusAction(
  goal: GoalRow,
  status: GoalStatusTag,
  tone: FocusTone,
  reference: Date,
): FocusAction {
  const title = goal.title?.trim() || 'Untitled goal';
  const noteSnippet = summarizeNote(goal.progress_notes ?? '');
  const context = getGoalTargetContext(goal, reference);

  let summary: string;

  if (status === 'off_track') {
    if (context) {
      summary = context.isPast
        ? `Target date was ${context.relative} (${context.readable}). Plan a reset and log next steps.`
        : `Target date is ${context.relative} (${context.readable}). Rebuild the plan and confirm support.`;
    } else {
      summary = 'Define a new checkpoint and list the blockers so you can tackle them head-on.';
    }
  } else if (status === 'at_risk') {
    if (context) {
      summary = `Protect momentum before ${context.relative} (${context.readable}) by booking time for the next milestone.`;
    } else {
      summary = 'Schedule a working session and capture the next milestone to keep things moving.';
    }
  } else if (status === 'achieved') {
    if (context) {
      summary = `Celebrate the win and share highlights from ${context.readable}.`;
    } else {
      summary = 'Celebrate the win and document what made it successful for future projects.';
    }
  } else {
    if (context) {
      summary = `Lock in your next micro-win ${context.relative} (${context.readable}) so progress stays steady.`;
    } else {
      summary = 'Capture the very next action and set a target date to keep momentum focused.';
    }
  }

  return {
    id: goal.id,
    tone,
    status,
    title,
    summary,
    note: noteSnippet ? `Latest note: ${noteSnippet}` : undefined,
  };
}

function createWeeklyFocusDigest(goals: GoalRow[], reference: Date): WeeklyFocusDigest {
  if (goals.length === 0) {
    return {
      intro: 'Use this digest to plan your weekly sprint once goals are in place.',
      headline: '',
      actions: [],
      emptyMessage: 'Add your first goal to unlock personalized focus prompts.',
    } satisfies WeeklyFocusDigest;
  }

  const normalized = goals.map((goal) => ({
    goal,
    status: normalizeGoalStatus(goal.status_tag),
  }));

  const offTrack = normalized.filter((entry) => entry.status === 'off_track').map((entry) => entry.goal);
  const atRisk = normalized.filter((entry) => entry.status === 'at_risk').map((entry) => entry.goal);
  const onTrack = normalized.filter((entry) => entry.status === 'on_track').map((entry) => entry.goal);
  const achieved = normalized.filter((entry) => entry.status === 'achieved').map((entry) => entry.goal);

  const flaggedCount = offTrack.length + atRisk.length;
  const totalGoals = normalized.length;

  let intro: string;
  let headline: string;

  if (flaggedCount > 0) {
    intro = `You have ${flaggedCount} goal${flaggedCount === 1 ? '' : 's'} that need attention this week.`;
    headline =
      offTrack.length > 0
        ? 'Stabilize off-track goals first, then boost the ones losing momentum.'
        : 'Give at-risk goals a boost so they stay out of the danger zone.';
  } else if (onTrack.length > 0) {
    intro = `All ${totalGoals === 1 ? 'goal is' : 'goals are'} currently on track.`;
    headline = 'Lock in the next milestone while energy is high.';
  } else {
    intro = 'Wins are rolling in—capture what worked and plan the next adventure.';
    headline = 'Celebrate progress and choose the next big focus.';
  }

  const actions: FocusAction[] = [];

  const urgentOffTrack = offTrack
    .slice()
    .sort((a, b) => compareGoalsByUrgency(a, b));
  for (const goal of urgentOffTrack.slice(0, 2)) {
    actions.push(buildFocusAction(goal, 'off_track', 'stabilize', reference));
  }

  if (actions.length < 3) {
    const urgentAtRisk = atRisk
      .slice()
      .sort((a, b) => compareGoalsByUrgency(a, b));
    for (const goal of urgentAtRisk.slice(0, 3 - actions.length)) {
      actions.push(buildFocusAction(goal, 'at_risk', 'boost', reference));
    }
  }

  if (actions.length < 3 && onTrack.length > 0) {
    const focused = onTrack
      .slice()
      .sort((a, b) => compareGoalsByUrgency(a, b))[0];
    if (focused) {
      actions.push(buildFocusAction(focused, 'on_track', 'boost', reference));
    }
  }

  if (actions.length < 3 && achieved.length > 0) {
    const recentWin = pickMostRecentGoal(achieved);
    if (recentWin) {
      actions.push(buildFocusAction(recentWin, 'achieved', 'celebrate', reference));
    }
  }

  const emptyMessage = flaggedCount > 0
    ? 'Once these goals are stabilized we will suggest the next set of focus moves here.'
    : 'Capture new goals or progress notes to unlock personalized focus ideas.';

  return {
    intro,
    headline,
    actions,
    emptyMessage,
  } satisfies WeeklyFocusDigest;
}
