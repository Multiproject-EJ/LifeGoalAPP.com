import { fetchHabitReminderPrefs } from './habitReminderPrefs';
import { formatTime, formatDateKey, parseTimeToDate } from './habitAlertUtils';

type HabitAlertRow = {
  habit_id: string;
  alert_time: string;
  enabled: boolean;
};

/**
 * Represents an upcoming scheduled push notification.
 * Mirrors the shape the send-reminders edge function consumes/produces.
 */
export type ScheduledReminder = {
  id: string;
  user_id: string;
  habit_id: string | null;
  habit_title: string | null;
  notification_type: 'habit_reminder' | 'coach_nudge' | 'checkin_nudge' | 'streak_warning';
  scheduled_at: string; // ISO 8601 timestamp
  status: 'pending' | 'sent' | 'cancelled';
  created_at: string;
  updated_at: string;
};

// Demo mode storage key for scheduled reminders
const DEMO_SCHEDULED_REMINDERS_KEY = 'demo_scheduled_reminders';

function generateReminderId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `reminder-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function getDemoStoredReminders(): ScheduledReminder[] {
  try {
    const stored = localStorage.getItem(DEMO_SCHEDULED_REMINDERS_KEY);
    if (stored) return JSON.parse(stored) as ScheduledReminder[];
  } catch {
    // Ignore parse errors
  }
  return [];
}

function setDemoStoredReminders(reminders: ScheduledReminder[]): void {
  try {
    localStorage.setItem(DEMO_SCHEDULED_REMINDERS_KEY, JSON.stringify(reminders));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Calculate the next Date occurrence of a time string (HH:MM or HH:MM:SS).
 * If the time has already passed today, returns tomorrow's occurrence.
 * Returns null if the time string is not in a recognisable format.
 */
function nextOccurrenceOf(timeStr: string): Date | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours > 23 || minutes > 59) return null;
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

/**
 * Service for integrating habit alerts with the PWA notification system.
 * This handles the scheduling logic and data model for habit notifications.
 */

/**
 * Get all habit alerts that should fire on a specific date
 * @param habitId - The habit ID
 * @param date - The date to check (JavaScript Date object)
 * @returns Array of alerts that should fire on this date
 */
export async function getHabitAlertsForDate(
  habitId: string,
  _date: Date
): Promise<HabitAlertRow[]> {
  const { data: prefs, error } = await fetchHabitReminderPrefs();
  if (error || !prefs) {
    return [];
  }

  const pref = prefs.find((entry) => entry.habit_id === habitId);
  if (!pref || !pref.enabled || !pref.preferred_time) {
    return [];
  }

  return [
    {
      habit_id: pref.habit_id,
      alert_time: pref.preferred_time,
      enabled: pref.enabled,
    },
  ];
}

/**
 * Check if a habit has any alerts scheduled for today
 * @param habitId - The habit ID
 * @returns True if there are alerts scheduled for today
 */
export async function hasAlertsForToday(habitId: string): Promise<boolean> {
  const alerts = await getHabitAlertsForDate(habitId, new Date());
  return alerts.length > 0;
}

/**
 * Get the next scheduled alert time for a habit
 * @param habitId - The habit ID
 * @returns The next alert time as a Date object, or null if no alerts scheduled
 */
export async function getNextAlertTime(habitId: string): Promise<Date | null> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Get alerts for today and tomorrow
  const todayAlerts = await getHabitAlertsForDate(habitId, today);
  const tomorrowAlerts = await getHabitAlertsForDate(habitId, tomorrow);
  
  // Combine and sort by time
  const allUpcoming: Date[] = [];
  
  // Add today's alerts that haven't passed yet
  for (const alert of todayAlerts) {
    const alertTime = parseTimeToDate(alert.alert_time, today);
    if (alertTime > now) {
      allUpcoming.push(alertTime);
    }
  }
  
  // Add tomorrow's alerts
  for (const alert of tomorrowAlerts) {
    const alertTime = parseTimeToDate(alert.alert_time, tomorrow);
    allUpcoming.push(alertTime);
  }
  
  if (allUpcoming.length === 0) {
    return null;
  }
  
  // Sort and return earliest
  allUpcoming.sort((a, b) => a.getTime() - b.getTime());
  return allUpcoming[0];
}

/**
 * Schedule local notifications for a habit's alerts.
 *
 * Delegates to the server-side scheduling pipeline via scheduleHabitReminders().
 * In demo mode the upcoming schedule is computed client-side and stored in
 * localStorage so the UI can render a preview without a real push subscription.
 *
 * See: /supabase/functions/send-reminders for server-side dispatch.
 */
export async function scheduleHabitNotifications(habitId: string, userId?: string): Promise<void> {
  const { data: prefs } = await fetchHabitReminderPrefs();
  if (!prefs) return;
  const pref = prefs.find((p) => p.habit_id === habitId);
  if (!pref?.enabled || !pref.preferred_time) return;

  const scheduledAt = nextOccurrenceOf(pref.preferred_time);
  if (!scheduledAt) return;

  const now = new Date();
  const stored = getDemoStoredReminders();
  // Replace any existing pending reminder for this habit
  const filtered = stored.filter(
    (r) => !(r.habit_id === habitId && r.status === 'pending'),
  );
  filtered.push({
    id: generateReminderId(),
    user_id: userId ?? '',
    habit_id: habitId,
    habit_title: pref.title,
    notification_type: 'habit_reminder',
    scheduled_at: scheduledAt.toISOString(),
    status: 'pending',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  });
  setDemoStoredReminders(filtered);
}

/**
 * Cancel all scheduled notifications for a habit.
 *
 * Marks every pending reminder for the given habit as cancelled.
 */
export async function cancelHabitNotifications(habitId: string): Promise<void> {
  const stored = getDemoStoredReminders();
  const updated = stored.map((r) =>
    r.habit_id === habitId && r.status === 'pending'
      ? { ...r, status: 'cancelled' as const, updated_at: new Date().toISOString() }
      : r,
  );
  setDemoStoredReminders(updated);
}

/**
 * Build a complete upcoming reminder schedule for a user based on their
 * per-habit preferences.
 *
 * Scheduling rules:
 * - Skips habits where reminders are disabled or have no preferred_time.
 * - Adds a nightly Game of Life Coach nudge at 20:30.
 * - Adds a life wheel check-in nudge at 18:00.
 * - Returns reminders sorted by scheduled_at ascending.
 *
 * In production the send-reminders edge function handles actual dispatch via
 * a cron trigger every 15 minutes.  This function produces the same logical
 * schedule for client-side preview and demo-mode parity.
 *
 * @param userId - User ID to stamp on generated reminder records
 * @returns Sorted list of pending ScheduledReminder items
 */
export async function scheduleHabitReminders(userId: string): Promise<ScheduledReminder[]> {
  const { data: prefs, error } = await fetchHabitReminderPrefs();
  if (error || !prefs) return [];

  const now = new Date();
  const reminders: ScheduledReminder[] = [];

  for (const pref of prefs) {
    if (!pref.enabled || !pref.preferred_time) continue;

    const scheduledAt = nextOccurrenceOf(pref.preferred_time);
    if (!scheduledAt) continue;
    reminders.push({
      id: generateReminderId(),
      user_id: userId,
      habit_id: pref.habit_id,
      habit_title: pref.title,
      notification_type: 'habit_reminder',
      scheduled_at: scheduledAt.toISOString(),
      status: 'pending',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });
  }

  // Nightly Game of Life Coach nudge
  const coachAt = nextOccurrenceOf('20:30');
  if (coachAt) {
    reminders.push({
      id: generateReminderId(),
      user_id: userId,
      habit_id: null,
      habit_title: null,
      notification_type: 'coach_nudge',
      scheduled_at: coachAt.toISOString(),
      status: 'pending',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });
  }

  // Evening life wheel check-in nudge
  const checkinAt = nextOccurrenceOf('18:00');
  if (checkinAt) {
    reminders.push({
      id: generateReminderId(),
      user_id: userId,
      habit_id: null,
      habit_title: null,
      notification_type: 'checkin_nudge',
      scheduled_at: checkinAt.toISOString(),
      status: 'pending',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });
  }

  reminders.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  setDemoStoredReminders(reminders);
  return reminders;
}

/**
 * Return the list of upcoming (pending) scheduled reminders for a user.
 *
 * If a cached schedule exists in demo-mode storage it is returned directly;
 * otherwise the schedule is computed fresh from habit preferences.
 *
 * @param userId - User ID whose reminders to retrieve
 * @returns Sorted list of pending ScheduledReminder items
 */
export async function getScheduledReminders(userId: string): Promise<ScheduledReminder[]> {
  const stored = getDemoStoredReminders();
  const pending = stored.filter((r) => r.user_id === userId && r.status === 'pending');
  if (pending.length > 0) {
    return pending.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  }
  // Nothing cached — compute from preferences
  return scheduleHabitReminders(userId);
}

/**
 * Cancel a specific scheduled reminder by ID.
 *
 * In demo mode the reminder is marked 'cancelled' in localStorage.
 * In production this would call the send-reminders edge function or update
 * the relevant habit_reminder_prefs row.
 *
 * @param reminderId - ID of the reminder to cancel
 */
export async function cancelReminder(reminderId: string): Promise<void> {
  const stored = getDemoStoredReminders();
  const updated = stored.map((r) =>
    r.id === reminderId
      ? { ...r, status: 'cancelled' as const, updated_at: new Date().toISOString() }
      : r,
  );
  setDemoStoredReminders(updated);
}

/**
 * Format an alert time for display in the monthly view
 * @param alerts - Array of alerts for a habit on a given day
 * @returns Formatted string showing alert times
 */
export function formatAlertTimesForDay(alerts: HabitAlertRow[]): string {
  if (alerts.length === 0) {
    return '';
  }
  
  if (alerts.length === 1) {
    return formatTime(alerts[0].alert_time);
  }
  
  // Multiple alerts: show first and count
  const firstTime = formatTime(alerts[0].alert_time);
  return `${firstTime} +${alerts.length - 1} more`;
}

/**
 * Get a summary of alerts for a habit across a date range
 * Useful for the monthly view to show which days have alerts
 * 
 * @param habitId - The habit ID
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @returns Map of date strings (YYYY-MM-DD) to alert arrays
 */
export async function getHabitAlertSummary(
  habitId: string,
  startDate: Date,
  endDate: Date
): Promise<Map<string, HabitAlertRow[]>> {
  const { data: prefs, error } = await fetchHabitReminderPrefs();
  if (error || !prefs) {
    return new Map();
  }

  const pref = prefs.find((entry) => entry.habit_id === habitId);
  if (!pref || !pref.enabled || !pref.preferred_time) {
    return new Map();
  }

  const alertRow: HabitAlertRow = {
    habit_id: pref.habit_id,
    alert_time: pref.preferred_time,
    enabled: pref.enabled,
  };

  const summary = new Map<string, HabitAlertRow[]>();
  
  // Create a new date for each iteration to avoid mutation issues
  let current = new Date(startDate);
  
  while (current <= endDate) {
    const dateKey = formatDateKey(current);
    
    summary.set(dateKey, [alertRow]);
    
    // Create new Date object for next iteration
    current = new Date(current);
    current.setDate(current.getDate() + 1);
  }
  
  return summary;
}
