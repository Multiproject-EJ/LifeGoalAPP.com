import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import { guardedCloudCall } from './service-health';
import {
  generateClientId,
  readReadFallbackCache,
  toPostgrestError,
  writeReadFallbackCache,
  writeThroughWithQueue,
} from './offlineWriteThrough';

type CheckinRow = Database['public']['Tables']['checkins']['Row'];
type CheckinInsert = Database['public']['Tables']['checkins']['Insert'];
type CheckinUpdate = Database['public']['Tables']['checkins']['Update'];

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
};

function authRequiredError(): PostgrestError {
  return {
    name: 'PostgrestError',
    code: 'AUTH_REQUIRED',
    details: 'No active authenticated Supabase session.',
    hint: 'Sign in to manage check-ins.',
    message: 'Authentication required.',
  };
}

const CHECKINS_CACHE_MAX_ROWS = 50;

function checkinsCacheKey(userId: string): string {
  return `checkins:${userId}`;
}

function cacheCheckins(userId: string, rows: CheckinRow[]): void {
  writeReadFallbackCache(checkinsCacheKey(userId), rows.slice(0, CHECKINS_CACHE_MAX_ROWS));
}

function cacheUpsertCheckin(row: CheckinRow): void {
  const cached = readReadFallbackCache<CheckinRow[]>(checkinsCacheKey(row.user_id)) ?? [];
  const next = [row, ...cached.filter((entry) => entry.id !== row.id)];
  cacheCheckins(row.user_id, next);
}

export async function fetchCheckinsForUser(
  userId: string,
  limit = 12,
): Promise<ServiceResponse<CheckinRow[]>> {
  if (!canUseSupabaseData()) {
    return { data: [], error: null };
  }

  const supabase = getSupabaseClient();
  const result = await guardedCloudCall('database', async () => {
    const { data, error } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit)
      .returns<CheckinRow[]>();
    if (error) throw error;
    return data ?? [];
  });

  if (!result.ok) {
    // Outage: last known check-ins (including queued offline ones) keep the
    // feature usable until sync returns.
    const cached = readReadFallbackCache<CheckinRow[]>(checkinsCacheKey(userId));
    if (cached) return { data: cached.slice(0, limit), error: null };
    return { data: null, error: toPostgrestError(result.error) };
  }

  cacheCheckins(userId, result.data);
  return { data: result.data, error: null };
}

export async function insertCheckin(payload: CheckinInsert): Promise<ServiceResponse<CheckinRow>> {
  if (!canUseSupabaseData()) {
    return { data: null, error: authRequiredError() };
  }

  const supabase = getSupabaseClient();
  const id = payload.id ?? generateClientId();
  const insertPayload: CheckinInsert = { ...payload, id };

  const outcome = await writeThroughWithQueue<CheckinRow>({
    feature: 'checkins',
    operation: 'checkin.create',
    payload: insertPayload,
    dedupeKey: id,
    write: async () => {
      const { data, error } = await supabase
        .from('checkins')
        .insert(insertPayload)
        .select()
        .returns<CheckinRow>()
        .single();
      if (error) throw error;
      return data;
    },
    optimistic: () => insertPayload as CheckinRow,
  });

  if (outcome.error) return { data: null, error: toPostgrestError(outcome.error) };
  if (outcome.queued) cacheUpsertCheckin(outcome.data);
  return { data: outcome.data, error: null };
}

export async function updateCheckin(id: string, payload: CheckinUpdate): Promise<ServiceResponse<CheckinRow>> {
  if (!canUseSupabaseData()) {
    return { data: null, error: authRequiredError() };
  }

  const supabase = getSupabaseClient();
  const outcome = await writeThroughWithQueue<CheckinRow | null>({
    feature: 'checkins',
    operation: 'checkin.update',
    // No dedupeKey: patches are partial, so each queued update replays in order.
    payload: { id, patch: payload },
    write: async () => {
      const { data, error } = await supabase
        .from('checkins')
        .update(payload)
        .eq('id', id)
        .select()
        .returns<CheckinRow>()
        .single();
      if (error) throw error;
      return data;
    },
    optimistic: () => null,
  });

  if (outcome.error) return { data: null, error: toPostgrestError(outcome.error) };
  return { data: outcome.data, error: null };
}
