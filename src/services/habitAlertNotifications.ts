import { fetchHabitReminderPrefs } from './habitReminderPrefs';
import { formatTime, formatDateKey, parseTimeToDate } from './habitAlertUtils';

type HabitAlertRow = {
  habit_id: string;
  alert_time: string;
  enabled: boolean;
};

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
 * Schedule local notifications for a habit's alerts
 * 
 * TODO: Platform-specific implementation needed
 * This is a placeholder for the actual notification scheduling logic.
 * 
 * For a full PWA implementation, you would:
 * 1. Use the Push API to send notifications from a server/edge function
 * 2. Schedule notifications using a backend cron job or scheduler
 * 3. Store alert schedules in the database for server-side processing
 * 
 * Example implementation flow:
 * - Server-side: Edge function runs periodically (e.g., every minute)
 * - Query habit_reminder_prefs for reminders due in the next minute
 * - For each alert, send a push notification to subscribed users
 * - Use the subscription data stored in notification_preferences table
 * 
 * See: /supabase/functions/send-reminders for reference implementation
 */
export async function scheduleHabitNotifications(habitId: string): Promise<void> {
  // TODO: Implement server-side notification scheduling
  // This would typically be handled by an edge function or backend service
  // that queries reminder preferences and sends push notifications
  
  console.log('scheduleHabitNotifications called for habit:', habitId);
  console.log('Platform-specific notification scheduling not yet implemented.');
  console.log('Notifications will be handled by the server-side edge function.');
}

/**
 * Cancel all scheduled notifications for a habit
 * 
 * TODO: Platform-specific implementation needed
 * This would cancel any pending local notifications or remove the habit
 * from the server-side notification queue.
 */
export async function cancelHabitNotifications(habitId: string): Promise<void> {
  // TODO: Implement notification cancellation
  // For server-side push, this might involve:
  // 1. Disabling all alerts for this habit in the database
  // 2. Removing from any notification queues
  
  console.log('cancelHabitNotifications called for habit:', habitId);
  console.log('Platform-specific notification cancellation not yet implemented.');
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
