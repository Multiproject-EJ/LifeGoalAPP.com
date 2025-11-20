import { v4 as uuidv4 } from 'uuid';
import {
  getGoalsForUser,
  putGoal,
  markGoalDeletedLocally,
  hardDeleteGoalLocally,
  getDirtyGoals,
} from './localDb';
import { getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';

type GoalRow = Database['public']['Tables']['goals']['Row'];

export interface GoalRecord {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  target_date?: string | null;
  created_at: string;
  updated_at: string;
  _dirty?: boolean;
  _deleted?: boolean;
}

// ---------- READ: Offline-first ----------

/**
 * Returns local goals immediately.
 * Also (fire-and-forget) refreshes from Supabase if online.
 */
export async function loadGoalsOfflineFirst(
  userId: string,
): Promise<GoalRecord[]> {
  const local = await getGoalsForUser(userId);

  // Fire & forget refresh; don't block UI.
  refreshGoalsFromSupabase(userId).catch(() => {
    // Ignore errors (offline, etc.); UI still has local data.
  });

  return local as GoalRecord[];
}

async function refreshGoalsFromSupabase(userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId);

  if (error || !data) return;

  const now = new Date().toISOString();
  const goals = data as GoalRow[];

  for (const g of goals) {
    await putGoal({
      id: g.id,
      user_id: g.user_id,
      title: g.title,
      description: g.description ?? null,
      status: g.status_tag ?? null,
      target_date: g.target_date ?? null,
      created_at: g.created_at ?? now,
      updated_at: now, // IndexedDB-only field for tracking
      _dirty: false,
      _deleted: false,
    });
  }
}

// ---------- CREATE: Local first, then sync ----------

export interface CreateGoalInput {
  title: string;
  description?: string;
  status?: string;
  target_date?: string;
}

/**
 * Creates a goal locally (offline-safe) and marks it as dirty for sync.
 * Returns the local record (with temp ID if offline).
 */
export async function createGoalOfflineFirst(
  userId: string,
  input: CreateGoalInput,
): Promise<GoalRecord> {
  const now = new Date().toISOString();
  const tempId = `offline-${uuidv4()}`;

  const localGoal: GoalRecord = {
    id: tempId,
    user_id: userId,
    title: input.title,
    description: input.description ?? null,
    status: input.status ?? 'on_track',
    target_date: input.target_date ?? null,
    created_at: now,
    updated_at: now,
    _dirty: true,
    _deleted: false,
  };

  await putGoal(localGoal);

  // TODO: notify service worker via postMessage or similar to schedule a background sync.

  return localGoal;
}

// ---------- DELETE: Local-first soft delete, then sync ----------

/**
 * Marks a goal as deleted locally and dirty for sync.
 * UI should hide _deleted goals.
 */
export async function deleteGoalOfflineFirst(id: string): Promise<void> {
  await markGoalDeletedLocally(id);
  // TODO: notify service worker to sync.
}

// ---------- SYNC: Called by SW or in-app when reconnecting ----------

/**
 * Sync any dirty goals to Supabase.
 * This should be called by:
 * - the service worker (Background Sync), OR
 * - an in-app "Sync now" hook when connectivity returns.
 */
export async function syncGoalsWithSupabase(userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const dirty = await getDirtyGoals();

  for (const goal of dirty) {
    if (goal._deleted) {
      // Deleted locally -> delete in Supabase, then hard-delete locally
      const { error } = await supabase.from('goals').delete().eq('id', goal.id);
      if (!error) {
        await hardDeleteGoalLocally(goal.id);
      }
      continue;
    }

    const isNew = goal.id.startsWith('offline-');

    if (isNew) {
      const { data, error } = await supabase
        .from('goals')
        .insert({
          user_id: goal.user_id,
          title: goal.title,
          description: goal.description,
          status_tag: goal.status,
          target_date: goal.target_date,
        })
        .select()
        .single();

      if (!error && data) {
        const newGoal = data as GoalRow;
        // Replace temp record with real Supabase id
        await hardDeleteGoalLocally(goal.id);
        await putGoal({
          id: newGoal.id,
          user_id: newGoal.user_id,
          title: newGoal.title,
          description: newGoal.description ?? null,
          status: newGoal.status_tag ?? null,
          target_date: newGoal.target_date ?? null,
          created_at: newGoal.created_at,
          updated_at: new Date().toISOString(),
          _dirty: false,
          _deleted: false,
        });
      }
    } else {
      // Existing goal -> update in Supabase
      const { error } = await supabase
        .from('goals')
        .update({
          title: goal.title,
          description: goal.description,
          status_tag: goal.status,
          target_date: goal.target_date,
        })
        .eq('id', goal.id);

      if (!error) {
        await putGoal({
          ...goal,
          _dirty: false,
          updated_at: new Date().toISOString(),
        });
      }
    }
  }

  // After sync, refresh from Supabase to ensure we have the latest
  await refreshGoalsFromSupabase(userId);
}
