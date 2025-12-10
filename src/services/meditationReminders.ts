import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient, getActiveSupabaseSession } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import { v4 as uuidv4 } from 'uuid';

export type MeditationReminder = Database['public']['Tables']['meditation_reminders']['Row'];
type MeditationReminderInsert = Database['public']['Tables']['meditation_reminders']['Insert'];

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | Error | null;
};

// Demo data storage
const demoMeditationReminders: Map<string, MeditationReminder[]> = new Map();

/**
 * Get current user ID from active session
 */
export function getCurrentUserId(): string | null {
  const session = getActiveSupabaseSession();
  return session?.user?.id ?? null;
}

/**
 * Get demo meditation reminders for a user
 */
function getDemoMeditationReminders(userId: string): MeditationReminder[] {
  if (!demoMeditationReminders.has(userId)) {
    demoMeditationReminders.set(userId, []);
  }
  return demoMeditationReminders.get(userId) ?? [];
}

/**
 * Set demo meditation reminders for a user
 */
function setDemoMeditationReminders(userId: string, reminders: MeditationReminder[]): void {
  demoMeditationReminders.set(userId, reminders);
}

/**
 * List meditation reminders for the current user
 */
export async function listMeditationReminders(
  userId: string,
): Promise<ServiceResponse<MeditationReminder[]>> {
  if (!canUseSupabaseData()) {
    const reminders = getDemoMeditationReminders(userId);
    return { data: reminders, error: null };
  }

  const supabase = getSupabaseClient();
  const response = await supabase
    .from('meditation_reminders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .returns<MeditationReminder[]>();

  return { data: response.data ?? null, error: response.error };
}

/**
 * Upsert a meditation reminder (create or update)
 */
export async function upsertMeditationReminder(
  payload: MeditationReminderInsert,
): Promise<ServiceResponse<MeditationReminder>> {
  if (!canUseSupabaseData()) {
    // Demo mode - create or update in memory
    const userId = payload.user_id;
    if (!userId) {
      return { data: null, error: new Error('user_id is required') };
    }

    const reminders = getDemoMeditationReminders(userId);
    const existingIndex = reminders.findIndex(r => r.user_id === userId);

    const now = new Date().toISOString();
    const reminder: MeditationReminder = {
      id: existingIndex >= 0 ? reminders[existingIndex].id : uuidv4(),
      user_id: userId,
      enabled: payload.enabled ?? true,
      time_of_day: payload.time_of_day ?? '08:00',
      timezone: payload.timezone ?? null,
      created_at: existingIndex >= 0 ? reminders[existingIndex].created_at : now,
      updated_at: now,
    };

    if (existingIndex >= 0) {
      reminders[existingIndex] = reminder;
    } else {
      reminders.push(reminder);
    }
    setDemoMeditationReminders(userId, reminders);

    return { data: reminder, error: null };
  }

  const supabase = getSupabaseClient();
  const response = await supabase
    .from('meditation_reminders')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single<MeditationReminder>();

  return { data: response.data ?? null, error: response.error };
}

/**
 * Delete a meditation reminder
 */
export async function deleteMeditationReminder(
  id: string,
  userId?: string,
): Promise<ServiceResponse<void>> {
  if (!canUseSupabaseData()) {
    // Demo mode - find and remove from user's reminders
    // If userId is provided, search only that user's reminders for better performance
    if (userId) {
      const reminders = getDemoMeditationReminders(userId);
      const filtered = reminders.filter(r => r.id !== id);
      if (filtered.length !== reminders.length) {
        setDemoMeditationReminders(userId, filtered);
        return { data: null, error: null };
      }
      return { data: null, error: new Error('Reminder not found') };
    }
    
    // Fallback: search all users (less efficient but handles edge cases)
    for (const [uid, reminders] of demoMeditationReminders.entries()) {
      const filtered = reminders.filter(r => r.id !== id);
      if (filtered.length !== reminders.length) {
        setDemoMeditationReminders(uid, filtered);
        return { data: null, error: null };
      }
    }
    return { data: null, error: new Error('Reminder not found') };
  }

  const supabase = getSupabaseClient();
  const response = await supabase
    .from('meditation_reminders')
    .delete()
    .eq('id', id);

  return { data: null, error: response.error };
}
