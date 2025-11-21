import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import {
  getDemoHabitAlerts,
  upsertDemoHabitAlert,
  deleteDemoHabitAlert,
} from './demoData';
import { formatTime } from './habitAlertUtils';

type HabitAlertRow = Database['public']['Tables']['habit_alerts']['Row'];
type HabitAlertInsert = Database['public']['Tables']['habit_alerts']['Insert'];
type HabitAlertUpdate = Database['public']['Tables']['habit_alerts']['Update'];

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
};

/**
 * Fetch all alerts for a specific habit
 */
export async function fetchHabitAlerts(habitId: string): Promise<ServiceResponse<HabitAlertRow[]>> {
  if (!canUseSupabaseData()) {
    return { data: getDemoHabitAlerts(habitId), error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('habit_alerts')
    .select('*')
    .eq('habit_id', habitId)
    .order('alert_time')
    .returns<HabitAlertRow[]>();
}

/**
 * Fetch all alerts for a user (across all their habits)
 */
export async function fetchUserHabitAlerts(userId: string): Promise<ServiceResponse<HabitAlertRow[]>> {
  if (!canUseSupabaseData()) {
    return { data: getDemoHabitAlerts(), error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('habit_alerts')
    .select('*, habits!inner(*, goals!inner(user_id))')
    .eq('habits.goals.user_id', userId)
    .order('alert_time')
    .returns<HabitAlertRow[]>();
}

/**
 * Create or update a habit alert
 */
export async function upsertHabitAlert(
  payload: HabitAlertInsert | HabitAlertUpdate
): Promise<ServiceResponse<HabitAlertRow>> {
  if (!canUseSupabaseData()) {
    return { data: upsertDemoHabitAlert(payload), error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('habit_alerts')
    .upsert(payload as HabitAlertInsert, { onConflict: 'id' })
    .select()
    .returns<HabitAlertRow>()
    .single();
}

/**
 * Delete a habit alert
 */
export async function deleteHabitAlert(id: string): Promise<ServiceResponse<HabitAlertRow>> {
  if (!canUseSupabaseData()) {
    return { data: deleteDemoHabitAlert(id), error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('habit_alerts')
    .delete()
    .eq('id', id)
    .select()
    .returns<HabitAlertRow>()
    .single();
}

/**
 * Toggle alert enabled status
 */
export async function toggleHabitAlert(
  id: string,
  enabled: boolean
): Promise<ServiceResponse<HabitAlertRow>> {
  if (!canUseSupabaseData()) {
    return { data: upsertDemoHabitAlert({ id, enabled }), error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('habit_alerts')
    .update({ enabled })
    .eq('id', id)
    .select()
    .returns<HabitAlertRow>()
    .single();
}

/**
 * Helper: Check if a habit should alert on a given day of week
 * @param alert - The habit alert configuration
 * @param dayOfWeek - Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
 * @returns true if the alert should trigger on this day
 */
export function shouldAlertOnDay(alert: HabitAlertRow, dayOfWeek: number): boolean {
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
 */
export function getAlertScheduleDescription(alert: HabitAlertRow): string {
  if (!alert.days_of_week || alert.days_of_week.length === 0) {
    return `Daily at ${formatTime(alert.alert_time)}`;
  }
  
  if (alert.days_of_week.length === 7) {
    return `Daily at ${formatTime(alert.alert_time)}`;
  }
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = alert.days_of_week
    .sort((a, b) => a - b)
    .map(d => dayNames[d])
    .join(', ');
  
  return `${days} at ${formatTime(alert.alert_time)}`;
}
