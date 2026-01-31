import type { Database, Json } from '../lib/database.types';
import { getSupabaseClient } from '../lib/supabaseClient';

export type HolidayPreferences = Record<string, boolean>;

export type HolidayPreferencesRow = {
  user_id: string;
  holidays: HolidayPreferences;
  created_at?: string;
  updated_at?: string;
};

type HolidayPreferencesRecord = Database['public']['Tables']['holiday_preferences']['Row'];

function normalizeHolidayPreferences(holidays: Json | null | undefined): HolidayPreferences {
  if (!holidays || typeof holidays !== 'object' || Array.isArray(holidays)) {
    return {};
  }

  return Object.entries(holidays).reduce<HolidayPreferences>((acc, [key, value]) => {
    if (typeof value === 'boolean') {
      acc[key] = value;
    }
    return acc;
  }, {});
}

function normalizeHolidayPreferencesRow(record: HolidayPreferencesRecord): HolidayPreferencesRow {
  return {
    user_id: record.user_id,
    holidays: normalizeHolidayPreferences(record.holidays),
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

export async function fetchHolidayPreferences(userId: string): Promise<{
  data: HolidayPreferencesRow | null;
  error: Error | null;
}> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('holiday_preferences')
      .select('user_id, holidays, created_at, updated_at')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: null };
      }
      throw error;
    }

    return { data: data ? normalizeHolidayPreferencesRow(data) : null, error: null };
  } catch (error) {
    console.error('Failed to fetch holiday preferences:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error fetching holiday preferences'),
    };
  }
}

export async function upsertHolidayPreferences(
  userId: string,
  holidays: HolidayPreferences,
): Promise<{
  data: HolidayPreferencesRow | null;
  error: Error | null;
}> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('holiday_preferences')
      .upsert(
        {
          user_id: userId,
          holidays,
        },
        {
          onConflict: 'user_id',
        },
      )
      .select('user_id, holidays, created_at, updated_at')
      .single();

    if (error) throw error;

    return { data: data ? normalizeHolidayPreferencesRow(data) : null, error: null };
  } catch (error) {
    console.error('Failed to upsert holiday preferences:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error upserting holiday preferences'),
    };
  }
}
