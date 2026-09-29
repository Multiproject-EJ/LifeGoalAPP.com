/**
 * Admin hub reads — headline numbers and the waitlist (with emails).
 * Both RPCs are gated to active admin_users rows server-side.
 */
import { getSupabaseClient } from '../lib/supabaseClient';

export type AdminWaitlistEntry = {
  id?: number;
  email: string;
  source: string;
  channel?: string;
  created_at: string;
};

export type AdminOverview = {
  generated_at: string;
  waitlist_total: number;
  waitlist_7d: number;
  accounts_total: number;
  accounts_7d: number;
  active_players_7d: number | null;
  unread_alerts: number;
  latest_waitlist: AdminWaitlistEntry[];
};

function client() { return getSupabaseClient() as any; } // eslint-disable-line @typescript-eslint/no-explicit-any

export async function fetchAdminOverview(): Promise<{ data: AdminOverview | null; error: Error | null }> {
  try {
    const { data, error } = await client().rpc('get_admin_overview');
    if (error) throw error;
    return { data: (data as AdminOverview) ?? null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error('Failed to load the admin overview.') };
  }
}

export async function fetchAdminWaitlist(
  limit: number,
  offset: number,
): Promise<{ data: AdminWaitlistEntry[]; total: number; error: Error | null }> {
  try {
    const { data, error } = await client().rpc('get_admin_waitlist', { p_limit: limit, p_offset: offset });
    if (error) throw error;
    const rows = (data as Array<AdminWaitlistEntry & { total_count: number }>) ?? [];
    return { data: rows, total: rows[0]?.total_count ?? 0, error: null };
  } catch (error) {
    return {
      data: [],
      total: 0,
      error: error instanceof Error ? error : new Error('Failed to load the waitlist.'),
    };
  }
}

/** Save this device's push subscription for the signed-in admin (RLS: own rows only). */
export async function saveAdminPushDevice(userId: string, subscription: PushSubscription): Promise<Error | null> {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return new Error('This browser returned an incomplete push subscription.');
  }
  try {
    const { error } = await client()
      .from('push_subscriptions')
      .upsert(
        { user_id: userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
        { onConflict: 'endpoint' },
      );
    if (error) throw error;
    return null;
  } catch (error) {
    return error instanceof Error ? error : new Error('Could not save this device for alerts.');
  }
}
