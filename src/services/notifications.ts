import type { PostgrestError } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabaseClient';
import type { Database, Json } from '../lib/database.types';

export type NotificationPreferencesRow = Database['public']['Tables']['notification_preferences']['Row'];
export type NotificationPreferencesInsert = Database['public']['Tables']['notification_preferences']['Insert'];
export type NotificationPreferencesUpdate = Database['public']['Tables']['notification_preferences']['Update'];

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
};

export type NotificationPreferencePayload = {
  habitRemindersEnabled: boolean;
  checkinNudgesEnabled: boolean;
  reminderTime: string | null;
  timezone: string | null;
  subscription: PushSubscriptionJSON | null;
};

function serializeSubscription(subscription: PushSubscriptionJSON | null): Json | null {
  if (!subscription) return null;
  return subscription as unknown as Json;
}

export async function fetchNotificationPreferences(userId: string): Promise<ServiceResponse<NotificationPreferencesRow>> {
  const supabase = getSupabaseClient();
  return supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle<NotificationPreferencesRow>();
}

export async function upsertNotificationPreferences(
  userId: string,
  payload: NotificationPreferencePayload,
): Promise<ServiceResponse<NotificationPreferencesRow>> {
  const supabase = getSupabaseClient();
  const record: NotificationPreferencesInsert = {
    user_id: userId,
    habit_reminders_enabled: payload.habitRemindersEnabled,
    habit_reminder_time: payload.reminderTime,
    checkin_nudges_enabled: payload.checkinNudgesEnabled,
    timezone: payload.timezone,
    subscription: serializeSubscription(payload.subscription),
  };

  return supabase
    .from('notification_preferences')
    .upsert(record, { onConflict: 'user_id' })
    .select()
    .single<NotificationPreferencesRow>();
}

export async function disableNotificationPreferences(
  userId: string,
): Promise<ServiceResponse<NotificationPreferencesRow>> {
  const supabase = getSupabaseClient();
  const record: NotificationPreferencesUpdate = {
    habit_reminders_enabled: false,
    checkin_nudges_enabled: false,
    habit_reminder_time: null,
    subscription: null,
  };

  return supabase
    .from('notification_preferences')
    .update(record)
    .eq('user_id', userId)
    .select()
    .maybeSingle<NotificationPreferencesRow>();
}
