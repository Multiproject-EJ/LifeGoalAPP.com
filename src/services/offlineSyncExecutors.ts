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
import type { LifeGoalWritePayload } from './lifeGoals';
import { removeLocalJournalRecord } from '../data/journalOfflineRepo';
import { removeLocalGoalRecord } from '../data/goalsOfflineRepo';
import { removeLocalHabitV2Record } from '../data/habitsV2OfflineRepo';
import { buildHabitLogKey, removeLocalHabitLogRecord } from '../data/habitLogsOfflineRepo';
import {
  buildLocalCompletionKey,
  removeLocalHabitCompletionRecord,
} from '../data/habitCompletionsOfflineRepo';
import {
  buildReminderPrefKey,
  removeLocalReminderPrefRecord,
} from '../data/habitReminderPrefsOfflineRepo';
import { putPersonalityTest } from '../data/localDb';
import { buildTopTraitSummary } from '../features/identity/personalitySummary';
import { upsertPersonalityProfile } from './personalityTest';

type TodayTodoInsert = Database['public']['Tables']['today_todos']['Insert'];
type TodayTodoUpdate = Database['public']['Tables']['today_todos']['Update'];
type CheckinInsert = Database['public']['Tables']['checkins']['Insert'];
type CheckinUpdate = Database['public']['Tables']['checkins']['Update'];
type JournalEntryInsert = Database['public']['Tables']['journal_entries']['Insert'];
type JournalEntryUpdate = Database['public']['Tables']['journal_entries']['Update'];
type GoalInsert = Database['public']['Tables']['goals']['Insert'];
type GoalUpdate = Database['public']['Tables']['goals']['Update'];
type HabitV2Insert = Database['public']['Tables']['habits_v2']['Insert'];
type HabitV2Update = Database['public']['Tables']['habits_v2']['Update'];
type HabitLogV2Insert = Database['public']['Tables']['habit_logs_v2']['Insert'];
type PersonalityTestInsert = Database['public']['Tables']['personality_tests']['Insert'];

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

  // ── Journal ───────────────────────────────────────────────────────────────
  // Entries created offline carry a client uuid, so replaying a create is an
  // idempotent upsert; the local overlay record is cleared once synced.

  engine.registerExecutor('journal.create', async (mutation) => {
    const payload = payloadOf<JournalEntryInsert & { id: string }>(mutation);
    const { error } = await getSupabaseClient()
      .from('journal_entries')
      .upsert(payload, { onConflict: 'id' });
    if (error) throw error;
    await removeLocalJournalRecord(payload.id);
    return { outcome: 'success' as const };
  });

  engine.registerExecutor('journal.update', async (mutation) => {
    const { id, patch } = payloadOf<{ id: string; patch: JournalEntryUpdate }>(mutation);
    const { error } = await getSupabaseClient().from('journal_entries').update(patch).eq('id', id);
    if (error) throw error;
    await removeLocalJournalRecord(id);
    return { outcome: 'success' as const };
  });

  engine.registerExecutor('journal.delete', async (mutation) => {
    const { id } = payloadOf<{ id: string }>(mutation);
    const { error } = await getSupabaseClient().from('journal_entries').delete().eq('id', id);
    if (error) throw error;
    await removeLocalJournalRecord(id);
    return { outcome: 'success' as const };
  });

  // ── Goals ─────────────────────────────────────────────────────────────────

  engine.registerExecutor('goal.create', async (mutation) => {
    const payload = payloadOf<GoalInsert & { id: string }>(mutation);
    const { error } = await getSupabaseClient().from('goals').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
    await removeLocalGoalRecord(payload.id);
    return { outcome: 'success' as const };
  });

  engine.registerExecutor('goal.update', async (mutation) => {
    const { id, patch } = payloadOf<{ id: string; patch: GoalUpdate }>(mutation);
    const { error } = await getSupabaseClient().from('goals').update(patch).eq('id', id);
    if (error) throw error;
    await removeLocalGoalRecord(id);
    return { outcome: 'success' as const };
  });

  engine.registerExecutor('goal.delete', async (mutation) => {
    const { id } = payloadOf<{ id: string }>(mutation);
    const { error } = await getSupabaseClient().from('goals').delete().eq('id', id);
    if (error) throw error;
    await removeLocalGoalRecord(id);
    return { outcome: 'success' as const };
  });

  // ── Habits v2 ─────────────────────────────────────────────────────────────

  engine.registerExecutor('habit_v2.create', async (mutation) => {
    const payload = payloadOf<HabitV2Insert & { id: string }>(mutation);
    const { error } = await getSupabaseClient().from('habits_v2').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
    await removeLocalHabitV2Record(payload.id);
    return { outcome: 'success' as const };
  });

  engine.registerExecutor('habit_v2.update', async (mutation) => {
    const { id, patch } = payloadOf<{ id: string; patch: HabitV2Update }>(mutation);
    const { error } = await getSupabaseClient().from('habits_v2').update(patch).eq('id', id);
    if (error) throw error;
    await removeLocalHabitV2Record(id);
    return { outcome: 'success' as const };
  });

  // ── Habit logs v2 ─────────────────────────────────────────────────────────
  // (user_id, habit_id, date) is the natural idempotency key: replays upsert.

  engine.registerExecutor('habit_log_v2.upsert', async (mutation) => {
    const payload = payloadOf<HabitLogV2Insert & { date: string }>(mutation);
    const { error } = await getSupabaseClient()
      .from('habit_logs_v2')
      .upsert(payload, { onConflict: 'user_id,habit_id,date' });
    if (error) throw error;
    await removeLocalHabitLogRecord(buildHabitLogKey(payload.user_id, payload.habit_id, payload.date));
    return { outcome: 'success' as const };
  });

  engine.registerExecutor('habit_log_v2.delete', async (mutation) => {
    const { userId, habitId, date } = payloadOf<{ userId: string; habitId: string; date: string }>(mutation);
    const { error } = await getSupabaseClient()
      .from('habit_logs_v2')
      .delete()
      .eq('user_id', userId)
      .eq('habit_id', habitId)
      .eq('date', date);
    if (error) throw error;
    await removeLocalHabitLogRecord(buildHabitLogKey(userId, habitId, date));
    return { outcome: 'success' as const };
  });

  // ── Habit completions (monthly grid) ──────────────────────────────────────
  // The payload carries the absolute desired state, so replays converge.

  engine.registerExecutor('habit_completion.set', async (mutation) => {
    const { userId, habitId, date, completed } = payloadOf<{
      userId: string;
      habitId: string;
      date: string;
      completed: boolean;
    }>(mutation);
    const supabase = getSupabaseClient();

    const { data: existing, error: fetchError } = await supabase
      .from('habit_completions')
      .select('id')
      .eq('user_id', userId)
      .eq('habit_id', habitId)
      .eq('completed_date', date)
      .maybeSingle<{ id: string }>();
    if (fetchError) throw fetchError;

    if (existing) {
      const { error } = await supabase
        .from('habit_completions')
        .update({ completed })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('habit_completions').insert({
        user_id: userId,
        habit_id: habitId,
        completed_date: date,
        completed,
      });
      if (error) throw error;
    }

    await removeLocalHabitCompletionRecord(buildLocalCompletionKey(userId, habitId, date));
    return { outcome: 'success' as const };
  });

  // ── Life goals (steps / substeps / alerts) ────────────────────────────────
  // One executor switching on the payload kind. Inserts with client ids
  // upsert (idempotent); legacy migrated inserts without ids fall back to
  // plain insert.

  engine.registerExecutor('life_goal.write', async (mutation) => {
    const payload = payloadOf<LifeGoalWritePayload>(mutation);
    const supabase = getSupabaseClient();

    const run = async (): Promise<{ error: unknown }> => {
      switch (payload.kind) {
        case 'insert_step':
          return payload.insert.id
            ? supabase.from('life_goal_steps').upsert(payload.insert, { onConflict: 'id' })
            : supabase.from('life_goal_steps').insert(payload.insert);
        case 'update_step':
          return supabase.from('life_goal_steps').update(payload.patch).eq('id', payload.id);
        case 'delete_step':
          return supabase.from('life_goal_steps').delete().eq('id', payload.id);
        case 'insert_substep':
          return payload.insert.id
            ? supabase.from('life_goal_substeps').upsert(payload.insert, { onConflict: 'id' })
            : supabase.from('life_goal_substeps').insert(payload.insert);
        case 'update_substep':
          return supabase.from('life_goal_substeps').update(payload.patch).eq('id', payload.id);
        case 'delete_substep':
          return supabase.from('life_goal_substeps').delete().eq('id', payload.id);
        case 'insert_alert':
          return payload.insert.id
            ? supabase.from('life_goal_alerts').upsert(payload.insert, { onConflict: 'id' })
            : supabase.from('life_goal_alerts').insert(payload.insert);
        case 'update_alert':
          return supabase.from('life_goal_alerts').update(payload.patch).eq('id', payload.id);
        case 'delete_alert':
          return supabase.from('life_goal_alerts').delete().eq('id', payload.id);
      }
    };

    const { error } = await run();
    if (error) throw error;
    return { outcome: 'success' as const };
  });

  // ── Habit reminder preferences (edge function) ────────────────────────────
  // Payloads carry the merged full state per habit, so replays converge.

  engine.registerExecutor(
    'habit_reminder_pref.update',
    async (mutation) => {
      const { userId, habitId, updates } = payloadOf<{
        userId: string;
        habitId: string;
        updates: { enabled?: boolean; preferred_time?: string | null };
      }>(mutation);
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw { status: 401, message: 'No active session for reminder pref sync' };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-reminders/habit-prefs`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ habit_id: habitId, ...updates }),
        },
      );
      if (!response.ok) {
        throw { status: response.status, message: `Reminder preference sync failed (${response.status})` };
      }
      await removeLocalReminderPrefRecord(buildReminderPrefKey(userId, habitId));
      return { outcome: 'success' as const };
    },
    'edgeFunctions',
  );

  // ── Personality tests ─────────────────────────────────────────────────────
  // Results carry client uuids; replays upsert. After sync the local copy is
  // marked clean and the profile summary refreshed (matches the legacy loop).

  engine.registerExecutor('personality_test.upsert', async (mutation) => {
    const payload = payloadOf<PersonalityTestInsert & { id: string; user_id: string }>(mutation);
    const { error } = await getSupabaseClient()
      .from('personality_tests')
      .upsert(payload, { onConflict: 'id' });
    if (error) throw error;

    const traits = (payload.traits ?? {}) as Record<string, number>;
    const axes = (payload.axes ?? {}) as Record<string, number>;
    const takenAt = payload.taken_at ?? new Date().toISOString();

    await putPersonalityTest({
      id: payload.id,
      user_id: payload.user_id,
      taken_at: takenAt,
      traits,
      axes,
      answers: (payload.answers ?? {}) as Record<string, number>,
      version: payload.version ?? 'v1',
      archetype_hand: payload.archetype_hand ?? undefined,
      _dirty: false,
    });
    await upsertPersonalityProfile({
      user_id: payload.user_id,
      personality_traits: traits,
      personality_axes: axes,
      personality_summary: buildTopTraitSummary(traits),
      personality_last_tested_at: takenAt,
    });
    return { outcome: 'success' as const };
  });
}
