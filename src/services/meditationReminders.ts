import type { PostgrestError } from '@supabase/supabase-js';
import {
  canUseSupabaseData,
  getSupabaseClient,
  getActiveSupabaseSession,
} from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import { v4 as uuidv4 } from 'uuid';

export type MeditationReminder = Database['public']['Tables']['meditation_reminders']['Row'];
type MeditationReminderInsert = Database['public']['Tables']['meditation_reminders']['Insert'];
type MeditationReminderUpdate = Database['public']['Tables']['meditation_reminders']['Update'];

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | Error | null;
};

// Demo data storage
const demoMeditationReminders: Map<string, MeditationReminder> = new Map();

/**
 * Get demo meditation reminder for a user
 */
function getDemoMeditationReminder(userId: string): MeditationReminder | null {
  return demoMeditationReminders.get(userId) ?? null;
}

/**
 * Set demo meditation reminder for a user
 */
function setDemoMeditationReminder(userId: string, reminder: MeditationReminder): void {
  demoMeditationReminders.set(userId, reminder);
}

/**
 * Delete demo meditation reminder for a user
 */
function deleteDemoMeditationReminder(userId: string): void {
  demoMeditationReminders.delete(userId);
}

/**
 * Get the current user ID from the active session
 */
export function getCurrentUserId(): string | null {
  const session = getActiveSupabaseSession();
  return session?.user?.id ?? null;
}

/**
 * List meditation reminders for a user (typically just one)
 */
export async function listMeditationReminders(
  userId: string,
): Promise<ServiceResponse<MeditationReminder[]>> {
  if (!canUseSupabaseData()) {
    const reminder = getDemoMeditationReminder(userId);
    return { data: reminder ? [reminder] : [], error: null };
  }

  const supabase = getSupabaseClient();
  const response = await supabase
    .from('meditation_reminders')
    .select('*')
    .eq('user_id', userId)
    .returns<MeditationReminder[]>();

  return { data: response.data ?? null, error: response.error };
}

/**
 * Create or update a meditation reminder
 */
export async function upsertMeditationReminder(
  payload: MeditationReminderInsert | MeditationReminderUpdate,
): Promise<ServiceResponse<MeditationReminder>> {
  if (!canUseSupabaseData()) {
    const userId = payload.user_id ?? getCurrentUserId();
    if (!userId) {
      return {
        data: null,
        error: new Error('User ID is required for upsert'),
      };
    }

    const existingReminder = getDemoMeditationReminder(userId);
    const reminder: MeditationReminder = {
      id: (payload as any).id ?? existingReminder?.id ?? uuidv4(),
      user_id: userId,
      enabled: payload.enabled ?? existingReminder?.enabled ?? true,
      time_of_day: payload.time_of_day ?? existingReminder?.time_of_day ?? '08:00',
      timezone: payload.timezone ?? existingReminder?.timezone ?? null,
      created_at: existingReminder?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setDemoMeditationReminder(userId, reminder);
    return { data: reminder, error: null };
  }

  const supabase = getSupabaseClient();
  const response = await supabase
    .from('meditation_reminders')
    .upsert(payload as MeditationReminderInsert, { onConflict: 'user_id' })
    .select()
    .returns<MeditationReminder>()
    .single();

  return { data: response.data ?? null, error: response.error };
}

/**
 * Delete a meditation reminder by ID
 */
export async function deleteMeditationReminder(
  id: string,
): Promise<ServiceResponse<MeditationReminder>> {
  if (!canUseSupabaseData()) {
    // Find and delete the reminder with this ID
    for (const [userId, reminder] of demoMeditationReminders.entries()) {
      if (reminder.id === id) {
        deleteDemoMeditationReminder(userId);
        return { data: reminder, error: null };
      }
    }
    return {
      data: null,
      error: new Error('Reminder not found'),
    };
  }

  const supabase = getSupabaseClient();
  const response = await supabase
    .from('meditation_reminders')
    .delete()
    .eq('id', id)
    .select()
    .returns<MeditationReminder>()
    .single();

  return { data: response.data ?? null, error: response.error };
}
