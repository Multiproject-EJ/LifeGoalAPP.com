import { getSupabaseClient } from '../lib/supabaseClient';

export type TelemetryDailyRollupRow = {
  day: string;
  event_type: string;
  event_count: number;
  unique_users: number;
  updated_at: string;
};

export type RecentTelemetryEventRow = {
  id: string;
  user_id: string;
  event_type: string;
  metadata: Record<string, unknown> | null;
  occurred_at: string;
};

function getUntypedSupabase() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getSupabaseClient() as any;
}

export async function listTelemetryDailyRollups(options: {
  sinceISODate: string;
}): Promise<{ data: TelemetryDailyRollupRow[]; error: Error | null }> {
  try {
    const { data, error } = await getUntypedSupabase()
      .from('telemetry_daily_rollups')
      .select('*')
      .gte('day', options.sinceISODate)
      .order('day', { ascending: true });

    if (error) throw error;
    return { data: (data as TelemetryDailyRollupRow[]) ?? [], error: null };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error : new Error('Failed to load telemetry rollups.'),
    };
  }
}

export async function listRecentTelemetryEventsForAdmin(options?: {
  limit?: number;
}): Promise<{ data: RecentTelemetryEventRow[]; error: Error | null }> {
  try {
    const { data, error } = await getUntypedSupabase()
      .from('telemetry_events')
      .select('id, user_id, event_type, metadata, occurred_at')
      .order('occurred_at', { ascending: false })
      .limit(options?.limit ?? 20);

    if (error) throw error;
    return { data: (data as RecentTelemetryEventRow[]) ?? [], error: null };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error : new Error('Failed to load recent telemetry events.'),
    };
  }
}
