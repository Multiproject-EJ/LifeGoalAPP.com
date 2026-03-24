import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Database } from '../lib/database.types';

export type HabitCompletionRow = Database['public']['Tables']['habit_completions']['Row'];

export type HabitCompletionLocalRecord = {
  id: string;
  user_id: string;
  habit_id: string;
  completed_date: string;
  row: HabitCompletionRow;
  sync_state: 'pending_upsert' | 'failed';
  updated_at_ms: number;
  last_error: string | null;
};

export type HabitCompletionMutationRecord = {
  id: string;
  user_id: string;
  habit_id: string;
  completed_date: string;
  desired_completed: boolean;
  status: 'pending' | 'processing' | 'failed';
  attempt_count: number;
  created_at_ms: number;
  updated_at_ms: number;
  last_error: string | null;
};

interface HabitCompletionsOfflineDB extends DBSchema {
  habit_completions_local: {
    key: string;
    value: HabitCompletionLocalRecord;
    indexes: {
      'by-user': string;
      'by-date': string;
    };
  };
  habit_completion_mutations: {
    key: string;
    value: HabitCompletionMutationRecord;
    indexes: {
      'by-user': string;
      'by-status': string;
      'by-created': number;
    };
  };
}

const DB_NAME = 'lifegoalapp-habit-completions-offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<HabitCompletionsOfflineDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<HabitCompletionsOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('habit_completions_local')) {
          const store = db.createObjectStore('habit_completions_local', { keyPath: 'id' });
          store.createIndex('by-user', 'user_id');
          store.createIndex('by-date', 'completed_date');
        }
        if (!db.objectStoreNames.contains('habit_completion_mutations')) {
          const store = db.createObjectStore('habit_completion_mutations', { keyPath: 'id' });
          store.createIndex('by-user', 'user_id');
          store.createIndex('by-status', 'status');
          store.createIndex('by-created', 'created_at_ms');
        }
      },
    });
  }
  return dbPromise;
}

export function buildLocalCompletionKey(userId: string, habitId: string, date: string): string {
  return `${userId}:${habitId}:${date}`;
}

export function buildLocalCompletionRowId(userId: string, habitId: string, date: string): string {
  return `local-habit-completion-${buildLocalCompletionKey(userId, habitId, date)}`;
}

export async function upsertLocalHabitCompletionRecord(record: HabitCompletionLocalRecord): Promise<void> {
  const db = await getDb();
  await db.put('habit_completions_local', record);
}

export async function getLocalHabitCompletionRecord(id: string): Promise<HabitCompletionLocalRecord | null> {
  const db = await getDb();
  return (await db.get('habit_completions_local', id)) ?? null;
}

export async function removeLocalHabitCompletionRecord(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('habit_completions_local', id);
}

export async function listLocalHabitCompletionsForUserInRange(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<HabitCompletionLocalRecord[]> {
  const db = await getDb();
  const records = await db.getAllFromIndex('habit_completions_local', 'by-user', IDBKeyRange.only(userId));
  return records.filter((record) => record.completed_date >= startDate && record.completed_date <= endDate);
}

export async function enqueueHabitCompletionMutation(record: HabitCompletionMutationRecord): Promise<void> {
  const db = await getDb();
  await db.put('habit_completion_mutations', record);
}

export async function updateHabitCompletionMutation(
  id: string,
  patch: Partial<HabitCompletionMutationRecord>,
): Promise<void> {
  const db = await getDb();
  const current = await db.get('habit_completion_mutations', id);
  if (!current) return;
  await db.put('habit_completion_mutations', { ...current, ...patch });
}

export async function removeHabitCompletionMutation(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('habit_completion_mutations', id);
}

export async function listPendingHabitCompletionMutations(
  userId: string,
): Promise<HabitCompletionMutationRecord[]> {
  const db = await getDb();
  const records = await db.getAllFromIndex('habit_completion_mutations', 'by-user', IDBKeyRange.only(userId));
  return records
    .filter((record) => record.status === 'pending' || record.status === 'failed')
    .sort((a, b) => a.created_at_ms - b.created_at_ms);
}

export async function getHabitCompletionMutationCounts(
  userId: string,
): Promise<{ pending: number; failed: number }> {
  const db = await getDb();
  const records = await db.getAllFromIndex('habit_completion_mutations', 'by-user', IDBKeyRange.only(userId));
  let pending = 0;
  let failed = 0;

  for (const record of records) {
    if (record.status === 'pending' || record.status === 'processing') pending += 1;
    if (record.status === 'failed') failed += 1;
  }

  return { pending, failed };
}
