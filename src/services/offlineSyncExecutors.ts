/**
 * SyncEngine executor registry (service resilience Part 7).
 *
 * Registered once at startup (main.tsx). Each executor replays a queued
 * mutation against Supabase. Payloads carry client-generated ids, so every
 * replay is an idempotent upsert/patch/delete — an ambiguous failure followed
 * by a retry never applies twice. Errors thrown here are translated and
 * backed off by the SyncEngine; nothing raw escapes.
 */

import { getSupabaseClient } from '../lib/supabaseClient';
import { getSyncEngine } from './offline-queue';
import type { PendingMutation } from './offline-queue';
import type { Database } from '../lib/database.types';

type TodayTodoInsert = Database['public']['Tables']['today_todos']['Insert'];
type TodayTodoUpdate = Database['public']['Tables']['today_todos']['Update'];
type CheckinInsert = Database['public']['Tables']['checkins']['Insert'];
type CheckinUpdate = Database['public']['Tables']['checkins']['Update'];

let registered = false;

function payloadOf<T>(mutation: PendingMutation): T {
  return mutation.payload as T;
}

export function registerOfflineSyncExecutors(): void {
  if (registered) return;
  registered = true;

  const engine = getSyncEngine();

  // ── Today's to-dos ────────────────────────────────────────────────────────

  engine.registerExecutor('today_todo.create', async (mutation) => {
    const payload = payloadOf<TodayTodoInsert>(mutation);
    // Client-generated id + upsert → replaying this mutation is a no-op.
    const { error } = await getSupabaseClient()
      .from('today_todos')
      .upsert(payload, { onConflict: 'id' });
    if (error) throw error;
    return { outcome: 'success' as const };
  });

  engine.registerExecutor('today_todo.update', async (mutation) => {
    const { id, patch } = payloadOf<{ id: string; patch: TodayTodoUpdate }>(mutation);
    const { error } = await getSupabaseClient().from('today_todos').update(patch).eq('id', id);
    if (error) throw error;
    return { outcome: 'success' as const };
  });

  engine.registerExecutor('today_todo.delete', async (mutation) => {
    const { id } = payloadOf<{ id: string }>(mutation);
    const { error } = await getSupabaseClient().from('today_todos').delete().eq('id', id);
    if (error) throw error;
    return { outcome: 'success' as const };
  });

  // ── Daily check-ins ───────────────────────────────────────────────────────

  engine.registerExecutor('checkin.create', async (mutation) => {
    const payload = payloadOf<CheckinInsert>(mutation);
    const { error } = await getSupabaseClient().from('checkins').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
    return { outcome: 'success' as const };
  });

  engine.registerExecutor('checkin.update', async (mutation) => {
    const { id, patch } = payloadOf<{ id: string; patch: CheckinUpdate }>(mutation);
    const { error } = await getSupabaseClient().from('checkins').update(patch).eq('id', id);
    if (error) throw error;
    return { outcome: 'success' as const };
  });
}
