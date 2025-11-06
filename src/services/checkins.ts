import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import { DEMO_USER_ID, addDemoCheckin, getDemoCheckins, updateDemoCheckin } from './demoData';

type CheckinRow = Database['public']['Tables']['checkins']['Row'];
type CheckinInsert = Database['public']['Tables']['checkins']['Insert'];
type CheckinUpdate = Database['public']['Tables']['checkins']['Update'];

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
};

export async function fetchCheckinsForUser(
  userId: string,
  limit = 12,
): Promise<ServiceResponse<CheckinRow[]>> {
  if (!canUseSupabaseData()) {
    return { data: getDemoCheckins(userId || DEMO_USER_ID, limit), error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('checkins')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit)
    .returns<CheckinRow[]>();
}

export async function insertCheckin(payload: CheckinInsert): Promise<ServiceResponse<CheckinRow>> {
  if (!canUseSupabaseData()) {
    return { data: addDemoCheckin(payload), error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('checkins')
    .insert(payload)
    .select()
    .returns<CheckinRow>()
    .single();
}

export async function updateCheckin(id: string, payload: CheckinUpdate): Promise<ServiceResponse<CheckinRow>> {
  if (!canUseSupabaseData()) {
    return { data: updateDemoCheckin(id, payload), error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('checkins')
    .update(payload)
    .eq('id', id)
    .select()
    .returns<CheckinRow>()
    .single();
}
