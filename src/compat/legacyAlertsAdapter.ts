/**
 * Legacy Alerts Adapter
 * 
 * This adapter provides backward compatibility for code that still uses
 * the legacy habitAlerts.ts service signatures. Internally, it redirects calls
 * to the v2 habit_reminder_prefs system.
 * 
 * @deprecated This adapter is temporary during the migration period.
 * New code should use habitReminderPrefs.ts directly.
 */

import type { PostgrestError } from '@supabase/supabase-js';
import type { Database } from '../lib/database.types';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import {
  fetchHabitReminderPrefs,
  updateHabitReminderPref,
  type HabitReminderPrefsRow,
} from '../services/habitReminderPrefs';

// Legacy alert types for compatibility
type LegacyHabitAlertRow = Database['public']['Tables']['habit_alerts']['Row'];
type LegacyHabitAlertInsert = Database['public']['Tables']['habit_alerts']['Insert'];
type LegacyHabitAlertUpdate = Database['public']['Tables']['habit_alerts']['Update'];

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | Error | null;
};

/**
 * Log deprecation warning (only in development mode)
 */
function logDeprecationWarning(functionName: string): void {
  if (import.meta.env.DEV) {
    console.warn(
      `[DEPRECATED] ${functionName} from legacyAlertsAdapter.ts is deprecated. ` +
      'Please migrate to habitReminderPrefs.ts functions. This adapter will be removed in a future release.'
    );
  }
}

/**
 * Convert v2 reminder pref to legacy alert format (best-effort)
 */
function toLegacyAlert(
  pref: HabitReminderPrefsRow, 
  alertId?: string
): LegacyHabitAlertRow {
  return {
    id: alertId || `migrated-${pref.habit_id}`,
    habit_id: pref.habit_id,
    alert_time: pref.preferred_time || '09:00:00',
    days_of_week: null, // V2 doesn't store days_of_week in reminder prefs
    enabled: pref.enabled,
    created_at: pref.created_at || new Date().toISOString(),
    updated_at: pref.updated_at || new Date().toISOString(),
  };
}

/**
 * Fetch all alerts for a specific habit
 * @deprecated Use fetchHabitReminderPrefs() from habitReminderPrefs.ts instead
 */
export async function fetchHabitAlerts(habitId: string): Promise<ServiceResponse<LegacyHabitAlertRow[]>> {
  logDeprecationWarning('fetchHabitAlerts');
  
  if (!canUseSupabaseData()) {
    // Demo mode - return empty array
    return { data: [], error: null };
  }
  
  const supabase = getSupabaseClient();
  
  // Query v2 reminder prefs for this habit
  const { data, error } = await supabase
    .from('habit_reminder_prefs')
    .select('*')
    .eq('habit_id', habitId);
  
  if (error) {
    return { data: null, error };
  }
  
  // Convert to legacy format (one pref becomes one "alert")
  const alerts = (data || []).map((pref) => toLegacyAlert(pref as HabitReminderPrefsRow));
  
  return { data: alerts, error: null };
}

/**
 * Fetch all alerts for a user (across all their habits)
 * @deprecated Use fetchHabitReminderPrefs() from habitReminderPrefs.ts instead
 */
export async function fetchUserHabitAlerts(userId: string): Promise<ServiceResponse<LegacyHabitAlertRow[]>> {
  logDeprecationWarning('fetchUserHabitAlerts');
  
  // Use the v2 service
  const { data, error } = await fetchHabitReminderPrefs();
  
  if (error) {
    return { data: null, error };
  }
  
  // Convert each habit's pref to a legacy alert format
  const alerts = (data || []).map((pref) => ({
    id: `migrated-${pref.habit_id}`,
    habit_id: pref.habit_id,
    alert_time: pref.preferred_time || '09:00:00',
    days_of_week: null,
    enabled: pref.enabled,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
  
  return { data: alerts, error: null };
}

/**
 * Create or update a habit alert
 * @deprecated Use updateHabitReminderPref() from habitReminderPrefs.ts instead
 */
export async function upsertHabitAlert(
  payload: LegacyHabitAlertInsert | LegacyHabitAlertUpdate
): Promise<ServiceResponse<LegacyHabitAlertRow>> {
  logDeprecationWarning('upsertHabitAlert');
  
  const habitId = payload.habit_id;
  if (!habitId) {
    return { 
      data: null, 
      error: new Error('habit_id is required for upsertHabitAlert') 
    };
  }
  
  // Convert to v2 format and upsert
  const updates: { enabled?: boolean; preferred_time?: string | null } = {};
  
  if (payload.enabled !== undefined) {
    updates.enabled = payload.enabled;
  }
  
  if (payload.alert_time !== undefined) {
    updates.preferred_time = payload.alert_time;
  }
  
  const { data, error } = await updateHabitReminderPref(habitId, updates);
  
  if (error) {
    return { data: null, error };
  }
  
  if (!data) {
    return { data: null, error: null };
  }
  
  // Convert result back to legacy format
  return { 
    data: toLegacyAlert(data as HabitReminderPrefsRow, payload.id), 
    error: null 
  };
}

/**
 * Delete a habit alert
 * @deprecated In v2, disable the reminder instead of deleting
 */
export async function deleteHabitAlert(id: string): Promise<ServiceResponse<LegacyHabitAlertRow>> {
  logDeprecationWarning('deleteHabitAlert');
  
  // In the legacy system, id was the alert's own ID
  // In v2, we use habit_id. For migrated alerts, id might be "migrated-{habit_id}"
  let habitId = id;
  if (id.startsWith('migrated-')) {
    habitId = id.replace('migrated-', '');
  }
  
  // Instead of deleting, disable the reminder
  const { data, error } = await updateHabitReminderPref(habitId, { enabled: false });
  
  if (error) {
    return { data: null, error };
  }
  
  // Return placeholder
  return { 
    data: {
      id,
      habit_id: habitId,
      alert_time: data?.preferred_time || '09:00:00',
      days_of_week: null,
      enabled: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, 
    error: null 
  };
}

/**
 * Toggle alert enabled status
 * @deprecated Use updateHabitReminderPref() from habitReminderPrefs.ts instead
 */
export async function toggleHabitAlert(
  id: string,
  enabled: boolean
): Promise<ServiceResponse<LegacyHabitAlertRow>> {
  logDeprecationWarning('toggleHabitAlert');
  
  // Extract habit_id from migrated ID format
  let habitId = id;
  if (id.startsWith('migrated-')) {
    habitId = id.replace('migrated-', '');
  }
  
  const { data, error } = await updateHabitReminderPref(habitId, { enabled });
  
  if (error) {
    return { data: null, error };
  }
  
  if (!data) {
    return { data: null, error: null };
  }
  
  return { 
    data: toLegacyAlert(data as HabitReminderPrefsRow, id), 
    error: null 
  };
}

/**
 * Helper: Check if a habit should alert on a given day of week
 * @deprecated This logic is now handled by the v2 scheduling system
 */
export function shouldAlertOnDay(alert: LegacyHabitAlertRow, dayOfWeek: number): boolean {
  logDeprecationWarning('shouldAlertOnDay');
  
  if (!alert.enabled) {
    return false;
  }
  
  // If days_of_week is null, alert every day
  if (alert.days_of_week === null || alert.days_of_week.length === 0) {
    return true;
  }
  
  return alert.days_of_week.includes(dayOfWeek);
}

/**
 * Helper: Get description of alert schedule
 * @deprecated Use v2 schedule display utilities instead
 */
export function getAlertScheduleDescription(alert: LegacyHabitAlertRow): string {
  logDeprecationWarning('getAlertScheduleDescription');
  
  const timeStr = formatTime(alert.alert_time);
  
  if (!alert.days_of_week || alert.days_of_week.length === 0) {
    return `Daily at ${timeStr}`;
  }
  
  if (alert.days_of_week.length === 7) {
    return `Daily at ${timeStr}`;
  }
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = alert.days_of_week
    .sort((a, b) => a - b)
    .map(d => dayNames[d])
    .join(', ');
  
  return `${days} at ${timeStr}`;
}

/**
 * Format time string for display
 */
function formatTime(timeStr: string): string {
  // Handle both HH:MM:SS and HH:MM formats
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return timeStr;
  
  const hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  
  return `${displayHours}:${minutes} ${period}`;
}

/**
 * Guidance message for users trying to use legacy alert features
 */
export const MIGRATION_GUIDANCE = `
The habit alerts system has been consolidated into the v2 reminder preferences.
To manage reminders for your habits:

1. Go to the Habits module
2. Select a habit to view its details
3. Configure reminder preferences in the habit settings

Legacy alerts have been automatically migrated to the new system.
`;
