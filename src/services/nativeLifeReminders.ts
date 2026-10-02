import { listHabitsV2, listHabitLogsForRangeMultiV2, isHabitLifecycleActive } from './habitsV2';
import { fetchHabitReminderPrefs } from './habitReminderPrefs';
import { fetchReminderPrefs } from './reminderPrefs';
import { fetchGoals } from './goals';
import { fetchTodayTodos } from './todayTodos';
import { getAutoProgressState } from '../features/habits/autoProgression';
import { getISOWeekBounds, isHabitScheduledToday, parseSchedule } from '../features/habits/scheduleInterpreter';
import { habitAlertHealth, habitAlertsAllowed, limitLifeAlerts, type NativeAlert } from './nativeNotificationPolicy';
import { formatDateKey } from './habitAlertUtils';
import { readNativeTodoReminderPreferences } from './quickItemReminders';

export type NativeLifeReminderGroups = {
  /** User-chosen habit/todo times. These have their own native slot budget. */
  selected: NativeAlert[];
  /** Opportunistic goals/todos admitted through the existing daily budget. */
  ambient: NativeAlert[];
};

/**
 * Todo reminder intent is device-local, so it must remain buildable even when
 * the network-backed habit preference or completion-log reads are offline.
 */
export function buildNativeTodoReminderAlerts(userId: string, now = new Date()): NativeAlert[] {
  return Object.values(readNativeTodoReminderPreferences(userId))
    .filter((preference) => preference.at > now.getTime())
    .map((preference) => ({
      key: `todo:${preference.todoId}`,
      todoId: preference.todoId,
      at: preference.at,
      title: 'Your todo is ready',
      body: 'Open HabitGame to see the todo you chose.',
    }))
    .sort((first, second) => first.at - second.at);
}

function parseTime(time: string): { hour: number; minute: number } | null {
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function timeOnDate(date: Date, time: { hour: number; minute: number }): Date {
  const at = new Date(date);
  at.setHours(time.hour, time.minute, 0, 0);
  return at;
}

function isCompletedLog(log: {
  done: boolean | null;
  progress_state: string | null;
}): boolean {
  return log.progress_state === 'done'
    || log.progress_state === 'doneIsh'
    || (!log.progress_state && Boolean(log.done));
}

function capacitorWeekday(day: number): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  return (day + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

/**
 * Rebuild native reminder intent from current records. Explicit choices are
 * isolated from ambient nudges so the three-alert ambient budget cannot drop a
 * bell/time the player deliberately set.
 */
export async function buildNativeLifeReminderGroups(userId: string, now = new Date()): Promise<NativeLifeReminderGroups> {
  const [habitsResult, preferencesResult, settingsResult, goalsResult, todosResult] = await Promise.all([
    listHabitsV2({ includeInactive: true }),
    fetchHabitReminderPrefs(),
    fetchReminderPrefs(userId),
    fetchGoals(),
    fetchTodayTodos(formatDateKey(now)),
  ]);

  const habits = habitsResult.error ? [] : habitsResult.data ?? [];
  if (preferencesResult.error) throw preferencesResult.error;
  const preferences = preferencesResult.data ?? [];
  const today = formatDateKey(now);
  const selected: NativeAlert[] = [];

  // Never reconcile an unavailable habit list as an intentional empty list;
  // doing so would cancel the user's last known-good native schedule.
  if (habitsResult.error && preferences.some((preference) => preference.enabled)) {
    throw habitsResult.error;
  }

  if (!habitsResult.error && habits.length > 0) {
    const start = new Date(now);
    start.setDate(start.getDate() - 59);
    const logs = await listHabitLogsForRangeMultiV2({
      userId,
      habitIds: habits.map((habit) => habit.id),
      startDate: formatDateKey(start),
      endDate: today,
    });
    if (logs.error) throw logs.error;
    const allLogs = logs.data ?? [];

    for (const habit of habits) {
      const preference = preferences.find((entry) => entry.habit_id === habit.id);
      const time = preference?.preferred_time ? parseTime(preference.preferred_time) : null;
      if (!isHabitLifecycleActive(habit) || !preference?.enabled || !time) continue;

      const habitLogs = allLogs.filter((log) => log.habit_id === habit.id);
      const completed = habitLogs.filter(isCompletedLog);
      const last = completed.map((log) => log.date).sort().slice(-1)[0]
        ?? getAutoProgressState(habit).last_completed_at
        ?? null;
      if (!habitAlertsAllowed(habitAlertHealth(last, today))) continue;

      const schedule = parseSchedule(habit.schedule);
      const intervalDays = schedule?.mode === 'every_n_days' && Number.isFinite(schedule.intervalDays)
        ? Math.max(0, Math.ceil(schedule.intervalDays ?? 0))
        : 0;
      // Two weeks covers every weekly schedule. A bounded extension covers
      // legitimate longer every-N-days cadences without allowing malformed
      // schedule data to create an unbounded scan.
      const lookAheadDays = Math.max(14, Math.min(3660, intervalDays + 1));
      let nextOccurrence: Date | null = null;
      let occurrenceDateKey: string | null = null;

      for (let offset = 0; offset <= lookAheadDays; offset += 1) {
        const candidateDate = new Date(now);
        candidateDate.setDate(candidateDate.getDate() + offset);
        candidateDate.setHours(12, 0, 0, 0);
        const candidateDateKey = formatDateKey(candidateDate);
        const candidateAt = timeOnDate(candidateDate, time);
        if (candidateAt <= now) continue;

        const { monday, sunday } = getISOWeekBounds(candidateDate);
        const weekStart = formatDateKey(monday);
        const weekEnd = formatDateKey(sunday);
        const weekLogs = habitLogs.filter((log) => log.date >= weekStart && log.date <= weekEnd);
        if (!isHabitScheduledToday(habit, candidateDate, weekLogs)) continue;
        // In particular, a habit completed before its chosen time today must
        // not produce a lock-screen reminder later the same day.
        if (habitLogs.some((log) => log.date === candidateDateKey && isCompletedLog(log))) continue;

        nextOccurrence = candidateAt;
        occurrenceDateKey = candidateDateKey;
        break;
      }

      if (!nextOccurrence || !occurrenceDateKey) continue;
      const completedToday = habitLogs.some((log) => log.date === today && isCompletedLog(log));
      let repeat: NativeAlert['repeat'];
      if (!completedToday && (!schedule?.mode || schedule.mode === 'daily')) {
        repeat = time;
      } else if (!completedToday && schedule?.mode === 'specific_days') {
        const days = Array.from(new Set((schedule?.days ?? []).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)));
        if (days.length === 1) repeat = { ...time, weekday: capacitorWeekday(days[0]) };
      }

      selected.push({
        key: `habit:${habit.id}`,
        habitId: habit.id,
        at: nextOccurrence.getTime(),
        repeat,
        title: 'A small step for you',
        body: 'Open HabitGame when you are ready for your next habit.',
      });
    }
  }

  const todos = todosResult.error ? [] : todosResult.data ?? [];
  const todoPreferences = readNativeTodoReminderPreferences(userId);
  selected.push(...buildNativeTodoReminderAlerts(userId, now));

  selected.sort((first, second) => first.at - second.at);

  // Ambient opportunities retain the old quiet-hours/weekend/daily-budget
  // policy. A todo with an explicit bell is excluded to avoid duplicate alerts.
  const ambient: NativeAlert[] = [];
  const settings = settingsResult.error ? null : settingsResult.data;
  if (settings) {
    const minutes = (time: string) => {
      const parsed = parseTime(time);
      return parsed ? parsed.hour * 60 + parsed.minute : 0;
    };
    const startQuiet = settings.quiet_hours_start ? minutes(settings.quiet_hours_start) : 0;
    const endQuiet = settings.quiet_hours_end ? minutes(settings.quiet_hours_end) : 0;
    const allowedTime = (at: Date) => {
      const minute = at.getHours() * 60 + at.getMinutes();
      if (settings.skip_weekends && [0, 6].includes(at.getDay())) return false;
      return startQuiet === endQuiet || !(startQuiet < endQuiet
        ? minute >= startQuiet && minute < endQuiet
        : minute >= startQuiet || minute < endQuiet);
    };
    const windowTime = parseTime(settings.window_start ?? '09:00') ?? { hour: 9, minute: 0 };
    const opportunity = new Date(now);
    opportunity.setHours(windowTime.hour, windowTime.minute, 0, 0);
    if (opportunity > now && allowedTime(opportunity)) {
      for (const todo of todos) {
        if (todo.completed || todo.todo_date !== today || todoPreferences[todo.id]) continue;
        ambient.push({
          key: `todo-opportunity:${todo.id}:${today}`,
          todoId: todo.id,
          at: opportunity.getTime(),
          title: 'Make room for a small win',
          body: 'Open HabitGame to choose a useful next step.',
        });
      }
      for (const goal of goalsResult.error ? [] : goalsResult.data ?? []) {
        if (!goal.target_date || goal.target_date.slice(0, 10) !== today
          || !['on_track', 'at_risk'].includes(goal.status_tag ?? 'on_track')) continue;
        ambient.push({
          key: `goal:${goal.id}:${today}`,
          at: opportunity.getTime(),
          title: 'Your goal has a moment today',
          body: 'Open HabitGame to choose one satisfying next step.',
        });
      }
    }
  }

  return { selected, ambient: limitLifeAlerts(ambient, now.getTime()) };
}

/** Backward-compatible combined view used by diagnostics/tests. */
export async function buildNativeLifeReminders(userId: string, now = new Date()): Promise<NativeAlert[]> {
  const groups = await buildNativeLifeReminderGroups(userId, now);
  return [...groups.selected, ...groups.ambient];
}
