import { listHabitsV2, listHabitLogsForRangeMultiV2, isHabitLifecycleActive } from './habitsV2';
import { fetchHabitReminderPrefs } from './habitReminderPrefs';
import { fetchReminderPrefs } from './reminderPrefs';
import { fetchGoals } from './goals';
import { fetchTodayTodos } from './todayTodos';
import { getAutoProgressState } from '../features/habits/autoProgression';
import { habitAlertHealth, habitAlertsAllowed, limitLifeAlerts, type NativeAlert } from './nativeNotificationPolicy';
import { formatDateKey } from './habitAlertUtils';

/** Rebuild from current records; no repeat triggers remain running behind a stalled habit. */
export async function buildNativeLifeReminders(userId: string, now = new Date()): Promise<NativeAlert[]> {
  const [habitsResult, preferencesResult, settingsResult, goalsResult, todosResult] = await Promise.all([
    listHabitsV2({ includeInactive: true }), fetchHabitReminderPrefs(), fetchReminderPrefs(userId), fetchGoals(), fetchTodayTodos(formatDateKey(now)),
  ]);
  // Fail closed: stale data must never keep a failed/completed habit notifying.
  if (habitsResult.error || preferencesResult.error || settingsResult.error) return [];
  const habits = habitsResult.data ?? [], preferences = preferencesResult.data ?? [];
  const settings = settingsResult.data;
  const today = formatDateKey(now), start = new Date(now); start.setDate(start.getDate() - 59);
  const logs = await listHabitLogsForRangeMultiV2({ userId, habitIds: habits.map(h => h.id), startDate: formatDateKey(start), endDate: today });
  if (logs.error) return [];
  const alerts: NativeAlert[] = [];
  const minutes = (time: string) => { const [h, m] = time.split(':').map(Number); return h * 60 + m; };
  const startQuiet = settings?.quiet_hours_start ? minutes(settings.quiet_hours_start) : 0;
  const endQuiet = settings?.quiet_hours_end ? minutes(settings.quiet_hours_end) : 0;
  const allowedTime = (at: Date) => {
    const minute = at.getHours() * 60 + at.getMinutes();
    if (settings?.skip_weekends && [0, 6].includes(at.getDay())) return false;
    return startQuiet === endQuiet || !(startQuiet < endQuiet ? minute >= startQuiet && minute < endQuiet : minute >= startQuiet || minute < endQuiet);
  };
  const atTime = (time: string, tomorrow = false) => {
    const at = new Date(now), [h, m] = time.split(':').map(Number);
    at.setHours(h, m, 0, 0); if (tomorrow) at.setDate(at.getDate() + 1); return at;
  };
  for (const habit of habits) {
    const pref = preferences.find(p => p.habit_id === habit.id);
    if (!isHabitLifecycleActive(habit) || !pref?.enabled || !pref.preferred_time) continue;
    const completed = (logs.data ?? []).filter(log => log.habit_id === habit.id && (log.progress_state === 'done' || log.progress_state === 'doneIsh' || (!log.progress_state && log.done)));
    const last = completed.map(log => log.date).sort().slice(-1)[0] ?? getAutoProgressState(habit).last_completed_at ?? null;
    let at = atTime(pref.preferred_time); if (at <= now) at = atTime(pref.preferred_time, true);
    const day = formatDateKey(at);
    if (!habitAlertsAllowed(habitAlertHealth(last, day)) || completed.some(log => log.date === day) || !allowedTime(at)) continue;
    // Respect weekday schedules used by Today. Flexible weekly habits remain eligible.
    const schedule = habit.schedule;
    const days = Array.isArray(schedule) ? schedule : schedule && typeof schedule === 'object' && 'days' in schedule && Array.isArray(schedule.days) ? schedule.days : null;
    if (days?.length && !days.some(d => typeof d === 'string' && d.toLowerCase().slice(0, 3) === ['sun','mon','tue','wed','thu','fri','sat'][at.getDay()])) continue;
    alerts.push({ key: `habit:${habit.id}:${day}`, habitId: habit.id, at: at.getTime(), title: 'A small step for you', body: `${pref.title} — your next small win is ready.` });
  }
  const opportunity = atTime(settings?.window_start ?? '09:00');
  // Today's opportunities expire today. Never roll an ignored todo into tomorrow.
  if (opportunity > now && allowedTime(opportunity)) {
    for (const todo of todosResult.error ? [] : todosResult.data ?? []) {
      if (todo.completed || todo.todo_date !== today) continue;
      alerts.push({ key: `todo:${todo.id}:${today}`, at: opportunity.getTime(), title: 'Make room for a small win', body: todo.title });
    }
    for (const goal of goalsResult.error ? [] : goalsResult.data ?? []) {
      if (!goal.target_date || goal.target_date.slice(0, 10) !== today || !['on_track', 'at_risk'].includes(goal.status_tag ?? 'on_track')) continue;
      alerts.push({ key: `goal:${goal.id}:${today}`, at: opportunity.getTime(), title: 'Your goal has a moment today', body: `${goal.title} — choose one satisfying next step.` });
    }
  }
  return limitLifeAlerts(alerts, now.getTime());
}
