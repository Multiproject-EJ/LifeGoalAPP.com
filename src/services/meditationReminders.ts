import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient, getActiveSupabaseSession } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import { v4 as uuidv4 } from 'uuid';

type MeditationReminderRow = Database['public']['Tables']['meditation_reminders']['Row'];
type MeditationReminderInsert = Database['public']['Tables']['meditation_reminders']['Insert'];
type MeditationReminderUpdate = Database['public']['Tables']['meditation_reminders']['Update'];

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | Error | null;
};

// Demo data storage
const demoMeditationReminders: Map<string, MeditationReminderRow> = new Map();

/**
 * Get demo meditation reminder for a user
 */
function getDemoMeditationReminder(userId: string): MeditationReminderRow | null {
  return demoMeditationReminders.get(userId) ?? null;
}

/**
 * Set demo meditation reminder for a user
 */
function setDemoMeditationReminder(userId: string, reminder: MeditationReminderRow): void {
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
 * List meditation reminders for a user (typically only one per user)
 */
export async function listMeditationReminders(
  userId: string
): Promise<ServiceResponse<MeditationReminderRow[]>> {
  if (!canUseSupabaseData()) {
    const reminder = getDemoMeditationReminder(userId);
    return { data: reminder ? [reminder] : [], error: null };
  }

  const supabase = getSupabaseClient();
  const response = await supabase
    .from('meditation_reminders')
    .select('*')
    .eq('user_id', userId)
    .returns<MeditationReminderRow[]>();

  return { data: response.data ?? null, error: response.error };
}

/**
 * Create or update a meditation reminder
 */
export async function upsertMeditationReminder(
  payload: MeditationReminderInsert | MeditationReminderUpdate
): Promise<ServiceResponse<MeditationReminderRow>> {
  if (!canUseSupabaseData()) {
    const userId = payload.user_id;
    if (!userId) {
      return { data: null, error: new Error('user_id is required') };
    }

    const existingReminder = getDemoMeditationReminder(userId);
    const reminder: MeditationReminderRow = {
      id: existingReminder?.id ?? payload.id ?? uuidv4(),
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
    .returns<MeditationReminderRow>()
    .single();

  return { data: response.data ?? null, error: response.error };
}

/**
 * Delete a meditation reminder by ID
 */
export async function deleteMeditationReminder(id: string): Promise<ServiceResponse<MeditationReminderRow>> {
  if (!canUseSupabaseData()) {
    // Find the reminder by ID in demo data
    let userIdToDelete: string | null = null;
    for (const [userId, reminder] of demoMeditationReminders.entries()) {
      if (reminder.id === id) {
        userIdToDelete = userId;
        break;
      }
    }

    if (userIdToDelete) {
      const reminder = getDemoMeditationReminder(userIdToDelete);
      deleteDemoMeditationReminder(userIdToDelete);
      return { data: reminder, error: null };
    }

    return { data: null, error: new Error('Reminder not found') };
  }

  const supabase = getSupabaseClient();
  const response = await supabase
    .from('meditation_reminders')
    .delete()
    .eq('id', id)
    .select()
    .returns<MeditationReminderRow>()
    .single();

  return { data: response.data ?? null, error: response.error };
}
