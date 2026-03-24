import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Database } from '../lib/database.types';

export type HabitLogV2Row = Database['public']['Tables']['habit_logs_v2']['Row'];
export type HabitLogV2Insert = Database['public']['Tables']['habit_logs_v2']['Insert'];

export type HabitLogLocalRecord = {
  id: string;
  user_id: string;
  habit_id: string;
  date: string;
  row: HabitLogV2Row | null;
  sync_state: 'pending_upsert' | 'pending_delete' | 'failed';
  updated_at_ms: number;
  last_error: string | null;
};

export type HabitLogMutationRecord = {
  id: string;
  user_id: string;
  habit_id: string;
  date: string;
  operation: 'upsert' | 'delete';
  payload: HabitLogV2Insert | null;
  status: 'pending' | 'processing' | 'failed';
  attempt_count: number;
  created_at_ms: number;
  updated_at_ms: number;
  last_error: string | null;
};

interface HabitLogsOfflineDB extends DBSchema {
  habit_logs_local: {
    key: string;
    value: HabitLogLocalRecord;
    indexes: {
      'by-user': string;
    };
  };
  habit_log_mutations: {
    key: string;
    value: HabitLogMutationRecord;
    indexes: {
      'by-user': string;
    };
  };
}

const DB_NAME = 'lifegoalapp-habit-logs-offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<HabitLogsOfflineDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<HabitLogsOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('habit_logs_local')) {
          const store = db.createObjectStore('habit_logs_local', { keyPath: 'id' });
          store.createIndex('by-user', 'user_id');
        }
        if (!db.objectStoreNames.contains('habit_log_mutations')) {
          const store = db.createObjectStore('habit_log_mutations', { keyPath: 'id' });
          store.createIndex('by-user', 'user_id');
        }
      },
    });
  }
  return dbPromise;
}

export function buildHabitLogKey(userId: string, habitId: string, date: string): string {
  return `${userId}:${habitId}:${date}`;
}

export async function upsertLocalHabitLogRecord(record: HabitLogLocalRecord): Promise<void> {
  const db = await getDb();
  await db.put('habit_logs_local', record);
}

export async function removeLocalHabitLogRecord(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('habit_logs_local', id);
}

export async function getLocalHabitLogRecord(id: string): Promise<HabitLogLocalRecord | null> {
  const db = await getDb();
  return (await db.get('habit_logs_local', id)) ?? null;
}

export async function listLocalHabitLogRecordsForUser(userId: string): Promise<HabitLogLocalRecord[]> {
  const db = await getDb();
  return db.getAllFromIndex('habit_logs_local', 'by-user', IDBKeyRange.only(userId));
}

export async function enqueueHabitLogMutation(record: HabitLogMutationRecord): Promise<void> {
  const db = await getDb();
  await db.put('habit_log_mutations', record);
}

export async function updateHabitLogMutation(id: string, patch: Partial<HabitLogMutationRecord>): Promise<void> {
  const db = await getDb();
  const current = await db.get('habit_log_mutations', id);
  if (!current) return;
  await db.put('habit_log_mutations', { ...current, ...patch });
}

export async function removeHabitLogMutation(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('habit_log_mutations', id);
}

export async function listPendingHabitLogMutations(userId: string): Promise<HabitLogMutationRecord[]> {
  const db = await getDb();
  const records = await db.getAllFromIndex('habit_log_mutations', 'by-user', IDBKeyRange.only(userId));
  return records
    .filter((record) => record.status === 'pending' || record.status === 'failed')
    .sort((a, b) => a.created_at_ms - b.created_at_ms);
}

export async function getHabitLogMutationCounts(userId: string): Promise<{ pending: number; failed: number }> {
  const db = await getDb();
  const records = await db.getAllFromIndex('habit_log_mutations', 'by-user', IDBKeyRange.only(userId));
  let pending = 0;
  let failed = 0;
  for (const record of records) {
    if (record.status === 'pending' || record.status === 'processing') pending += 1;
    if (record.status === 'failed') failed += 1;
  }
  return { pending, failed };
}
