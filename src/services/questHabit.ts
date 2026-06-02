/**
 * Quest Habit Service
 *
 * The Quest Habit is the single specific habit whose completion unlocks
 * the bonus door in the Daily Momentum Personal Quest calendar.
 *
 * Source of truth for authenticated users: `public.user_quest_habits`.
 * LocalStorage remains a per-device cache/offline fallback.
 *
 * Cache key: `lifegoal:quest_habit:{userId}`
 */

import { canUseSupabaseDataAsync, getSupabaseClient } from '../lib/supabaseClient';

const STORAGE_KEY_PREFIX = 'lifegoal:quest_habit:';

export type QuestHabit = {
  habitId: string;
  title: string;
  emoji: string | null;
  updatedAt?: string;
};

type QuestHabitCacheRecord = {
  habitId: string | null;
  title: string;
  emoji: string | null;
  updatedAt: string;
  cleared?: boolean;
};

type QuestHabitRow = {
  user_id: string;
  habit_id: string | null;
  title: string;
  emoji: string | null;
  cleared_at: string | null;
  created_at: string | null;
  updated_at: string;
};

function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeLocalRecord(parsed: unknown): QuestHabitCacheRecord | null {
  if (parsed === null || typeof parsed !== 'object' || !('habitId' in parsed)) {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  const habitId = typeof record.habitId === 'string' ? record.habitId : null;
  const cleared = record.cleared === true || habitId === null;
  const updatedAt = typeof record.updatedAt === 'string' ? record.updatedAt : '';

  if (!habitId && !cleared) {
    return null;
  }

  return {
    habitId,
    title: typeof record.title === 'string' ? record.title : '',
    emoji: typeof record.emoji === 'string' ? record.emoji : null,
    updatedAt,
    cleared,
  };
}

function readCachedQuestHabitRecord(userId: string): QuestHabitCacheRecord | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    return normalizeLocalRecord(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeCachedQuestHabitRecord(userId: string, record: QuestHabitCacheRecord): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(record));
  } catch {
    // localStorage may be unavailable in private browsing — fail silently
  }
}

function cacheHabitFromRow(userId: string, row: QuestHabitRow): QuestHabit | null {
  const record: QuestHabitCacheRecord = {
    habitId: row.habit_id,
    title: row.title ?? '',
    emoji: row.emoji ?? null,
    updatedAt: row.updated_at,
    cleared: !row.habit_id || Boolean(row.cleared_at),
  };
  writeCachedQuestHabitRecord(userId, record);
  return recordToQuestHabit(record);
}

function recordToQuestHabit(record: QuestHabitCacheRecord | null): QuestHabit | null {
  if (!record || record.cleared || !record.habitId) return null;
  return {
    habitId: record.habitId,
    title: record.title,
    emoji: record.emoji,
    updatedAt: record.updatedAt || undefined,
  };
}

function isLocalNewer(local: QuestHabitCacheRecord, remote: QuestHabitRow | null): boolean {
  if (!local.updatedAt) return false;
  if (!remote?.updated_at) return true;
  return Date.parse(local.updatedAt) > Date.parse(remote.updated_at);
}

async function fetchRemoteQuestHabitRow(userId: string): Promise<QuestHabitRow | null> {
  if (!await canUseSupabaseDataAsync()) return null;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('user_quest_habits')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('Failed to fetch quest habit:', error);
    return null;
  }

  return data ?? null;
}

async function persistRemoteRecord(userId: string, record: QuestHabitCacheRecord): Promise<QuestHabitRow | null> {
  if (!await canUseSupabaseDataAsync()) return null;

  const timestamp = record.updatedAt || nowIso();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('user_quest_habits')
    .upsert({
      user_id: userId,
      habit_id: record.cleared ? null : record.habitId,
      title: record.cleared ? '' : record.title,
      emoji: record.cleared ? null : record.emoji,
      cleared_at: record.cleared ? timestamp : null,
      updated_at: timestamp,
    }, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) {
    console.warn('Failed to save quest habit:', error);
    return null;
  }

  return data;
}

/**
 * Returns the cached quest habit for instant UI rendering, or null if none is set.
 * Call refreshQuestHabit() to reconcile with the account-level server value.
 */
export function getQuestHabit(userId: string): QuestHabit | null {
  return recordToQuestHabit(readCachedQuestHabitRecord(userId));
}

/**
 * Reconciles the local cache with the account-level quest habit.
 *
 * Conflict policy: last-write-wins using updatedAt. Legacy local records without
 * updatedAt are only uploaded when the account has no remote quest habit yet.
 */
export async function refreshQuestHabit(userId: string): Promise<QuestHabit | null> {
  const local = readCachedQuestHabitRecord(userId);
  const remote = await fetchRemoteQuestHabitRow(userId);

  if (!remote && local) {
    const localWithTimestamp = local.updatedAt ? local : { ...local, updatedAt: nowIso() };
    writeCachedQuestHabitRecord(userId, localWithTimestamp);
    const persisted = await persistRemoteRecord(userId, localWithTimestamp);
    return persisted ? cacheHabitFromRow(userId, persisted) : recordToQuestHabit(localWithTimestamp);
  }

  if (remote && local && isLocalNewer(local, remote)) {
    const persisted = await persistRemoteRecord(userId, local);
    return persisted ? cacheHabitFromRow(userId, persisted) : recordToQuestHabit(local);
  }

  if (remote) {
    return cacheHabitFromRow(userId, remote);
  }

  return recordToQuestHabit(local);
}

/**
 * Designates a habit as the account-level Quest Habit.
 * Optimistically updates the local cache before attempting remote persistence.
 */
export async function setQuestHabit(userId: string, habit: QuestHabit): Promise<QuestHabit | null> {
  const record: QuestHabitCacheRecord = {
    habitId: habit.habitId,
    title: habit.title,
    emoji: habit.emoji,
    updatedAt: habit.updatedAt ?? nowIso(),
    cleared: false,
  };
  writeCachedQuestHabitRecord(userId, record);
  const persisted = await persistRemoteRecord(userId, record);
  return persisted ? cacheHabitFromRow(userId, persisted) : recordToQuestHabit(record);
}

/**
 * Clears the account-level Quest Habit.
 * A local tombstone is cached so an offline clear can later win over older remote state.
 */
export async function clearQuestHabit(userId: string): Promise<void> {
  const record: QuestHabitCacheRecord = {
    habitId: null,
    title: '',
    emoji: null,
    updatedAt: nowIso(),
    cleared: true,
  };
  writeCachedQuestHabitRecord(userId, record);
  const persisted = await persistRemoteRecord(userId, record);
  if (persisted) {
    cacheHabitFromRow(userId, persisted);
  }
}
