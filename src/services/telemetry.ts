import type { PostgrestError } from '@supabase/supabase-js';
import type { Json } from '../lib/database.types';
import type { Database } from '../lib/database.types';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import {
  addDemoTelemetryEvent,
  getDemoTelemetryEvents,
  getDemoTelemetryPreference,
  updateDemoTelemetryPreference,
} from './demoData';

export type TelemetryPreferenceRow = Database['public']['Tables']['telemetry_preferences']['Row'];
export type TelemetryEventRow = Database['public']['Tables']['telemetry_events']['Row'];

export type TelemetryEventType =
  | 'onboarding_completed'
  | 'balance_shift'
  | 'intervention_accepted'
  | 'micro_quest_completed'
  | 'economy_earn'
  | 'economy_spend';

export type TelemetryEventMetadata = Json;

export type TelemetryPreferenceResponse = {
  data: TelemetryPreferenceRow | null;
  error: PostgrestError | Error | null;
};

const preferenceCache = new Map<string, boolean>();

const BALANCE_SHIFT_STORAGE_KEY = 'lifegoalapp-telemetry-balance-shift';

type BalanceShiftState = {
  status: string;
  referenceDate: string;
};

function getBalanceShiftKey(userId: string) {
  return `${BALANCE_SHIFT_STORAGE_KEY}-${userId}`;
}

function readBalanceShiftState(userId: string): BalanceShiftState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(getBalanceShiftKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as BalanceShiftState;
  } catch (error) {
    console.warn('Unable to read balance shift telemetry state.', error);
    return null;
  }
}

function writeBalanceShiftState(userId: string, state: BalanceShiftState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getBalanceShiftKey(userId), JSON.stringify(state));
  } catch (error) {
    console.warn('Unable to persist balance shift telemetry state.', error);
  }
}

export async function fetchTelemetryPreference(userId: string): Promise<TelemetryPreferenceResponse> {
  if (!canUseSupabaseData()) {
    const demoPreference = getDemoTelemetryPreference(userId);
    return { data: demoPreference, error: null };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('telemetry_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle<TelemetryPreferenceRow>();

  return { data: data ?? null, error };
}

export async function upsertTelemetryPreference(
  userId: string,
  telemetryEnabled: boolean,
): Promise<TelemetryPreferenceResponse> {
  if (!canUseSupabaseData()) {
    const data = updateDemoTelemetryPreference({
      user_id: userId,
      telemetry_enabled: telemetryEnabled,
    });
    preferenceCache.set(userId, data.telemetry_enabled);
    return { data, error: null };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('telemetry_preferences')
    .upsert(
      {
        user_id: userId,
        telemetry_enabled: telemetryEnabled,
      },
      { onConflict: 'user_id' },
    )
    .select()
    .single<TelemetryPreferenceRow>();

  if (!error && data) {
    preferenceCache.set(userId, data.telemetry_enabled);
  }

  return { data: data ?? null, error };
}

export async function isTelemetryEnabled(userId: string): Promise<boolean> {
  const cached = preferenceCache.get(userId);
  if (typeof cached === 'boolean') {
    return cached;
  }

  const { data } = await fetchTelemetryPreference(userId);
  const enabled = data?.telemetry_enabled ?? false;
  preferenceCache.set(userId, enabled);
  return enabled;
}

export async function recordTelemetryEvent(options: {
  userId: string;
  eventType: TelemetryEventType;
  metadata?: TelemetryEventMetadata;
}): Promise<{ data: TelemetryEventRow | null; error: PostgrestError | Error | null }> {
  const telemetryEnabled = await isTelemetryEnabled(options.userId);
  if (!telemetryEnabled) {
    return { data: null, error: null };
  }

  if (!canUseSupabaseData()) {
    const data = addDemoTelemetryEvent({
      user_id: options.userId,
      event_type: options.eventType,
      metadata: options.metadata ?? {},
    });
    return { data, error: null };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('telemetry_events')
    .insert({
      user_id: options.userId,
      event_type: options.eventType,
      metadata: options.metadata ?? {},
    })
    .select()
    .single<TelemetryEventRow>();

  return { data: data ?? null, error };
}

export async function recordBalanceShiftEvent(options: {
  userId: string;
  harmonyStatus: string;
  referenceDate: string;
  metadata?: TelemetryEventMetadata;
}): Promise<void> {
  const lastState = readBalanceShiftState(options.userId);
  if (lastState?.status === options.harmonyStatus && lastState.referenceDate === options.referenceDate) {
    return;
  }

  await recordTelemetryEvent({
    userId: options.userId,
    eventType: 'balance_shift',
    metadata: {
      previousStatus: lastState?.status ?? null,
      harmonyStatus: options.harmonyStatus,
      referenceDate: options.referenceDate,
      ...((options.metadata ?? {}) as Record<string, unknown>),
    },
  });

  writeBalanceShiftState(options.userId, {
    status: options.harmonyStatus,
    referenceDate: options.referenceDate,
  });
}

export async function listTelemetryEvents(options: {
  userId: string;
  sinceISO?: string;
  eventTypes?: TelemetryEventType[];
  limit?: number;
}): Promise<TelemetryEventRow[]> {
  if (!canUseSupabaseData()) {
    const events = getDemoTelemetryEvents(options.userId);
    return events
      .filter((event) => (options.eventTypes ? options.eventTypes.includes(event.event_type as TelemetryEventType) : true))
      .filter((event) => (options.sinceISO ? event.occurred_at >= options.sinceISO : true))
      .slice(0, options.limit ?? events.length);
  }

  const supabase = getSupabaseClient();
  let query = supabase
    .from('telemetry_events')
    .select('*')
    .eq('user_id', options.userId)
    .order('occurred_at', { ascending: false });

  if (options.sinceISO) {
    query = query.gte('occurred_at', options.sinceISO);
  }

  if (options.eventTypes && options.eventTypes.length > 0) {
    query = query.in('event_type', options.eventTypes);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Failed to load telemetry events:', error);
    return [];
  }

  return (data ?? []) as TelemetryEventRow[];
}

export async function getTelemetryDifficultyAdjustment(userId: string): Promise<{ minProgressStreak: number }> {
  const defaultMinProgressStreak = 14;
  try {
    const telemetryEnabled = await isTelemetryEnabled(userId);
    if (!telemetryEnabled) {
      return { minProgressStreak: defaultMinProgressStreak };
    }

    const since = new Date();
    since.setDate(since.getDate() - 14);
    const events = await listTelemetryEvents({
      userId,
      sinceISO: since.toISOString(),
      eventTypes: ['intervention_accepted', 'balance_shift'],
    });

    const interventionCount = events.filter((event) => event.event_type === 'intervention_accepted').length;
    const balanceShift = events.find((event) => {
      if (event.event_type !== 'balance_shift') return false;
      const metadata = event.metadata as Record<string, unknown> | null;
      return metadata?.harmonyStatus === 'rebalancing';
    });

    if (interventionCount >= 2 || balanceShift) {
      return { minProgressStreak: 21 };
    }
  } catch (error) {
    console.warn('Unable to apply telemetry difficulty adjustment.', error);
  }

  return { minProgressStreak: defaultMinProgressStreak };
}
