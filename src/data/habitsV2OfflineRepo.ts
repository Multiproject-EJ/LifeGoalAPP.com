import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Database } from '../lib/database.types';

export type HabitV2Row = Database['public']['Tables']['habits_v2']['Row'];
export type HabitV2Insert = Database['public']['Tables']['habits_v2']['Insert'];
export type HabitV2Update = Database['public']['Tables']['habits_v2']['Update'];

export type HabitV2LocalRecord = {
  id: string;
  user_id: string;
  server_id: string | null;
  row: HabitV2Row;
  sync_state: 'pending_create' | 'pending_update' | 'pending_archive' | 'failed';
  updated_at_ms: number;
  last_error: string | null;
};

export type HabitV2MutationRecord = {
  id: string;
  user_id: string;
  habit_id: string;
  server_id: string | null;
  operation: 'create' | 'update' | 'archive' | 'pause' | 'resume' | 'deactivate';
  payload: HabitV2Insert | HabitV2Update | null;
  status: 'pending' | 'processing' | 'failed';
  attempt_count: number;
  created_at_ms: number;
  updated_at_ms: number;
  last_error: string | null;
};

interface HabitsV2OfflineDB extends DBSchema {
  habits_v2_local: {
    key: string;
    value: HabitV2LocalRecord;
    indexes: {
      'by-user': string;
    };
  };
  habits_v2_mutations: {
    key: string;
    value: HabitV2MutationRecord;
    indexes: {
      'by-user': string;
    };
  };
}

const DB_NAME = 'lifegoalapp-habits-v2-offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<HabitsV2OfflineDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<HabitsV2OfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('habits_v2_local')) {
          const store = db.createObjectStore('habits_v2_local', { keyPath: 'id' });
          store.createIndex('by-user', 'user_id');
        }
        if (!db.objectStoreNames.contains('habits_v2_mutations')) {
          const store = db.createObjectStore('habits_v2_mutations', { keyPath: 'id' });
          store.createIndex('by-user', 'user_id');
        }
      },
    });
  }
  return dbPromise;
}

export function buildLocalHabitV2Id(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `local-habit-v2-${crypto.randomUUID()}`;
  return `local-habit-v2-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function upsertLocalHabitV2Record(record: HabitV2LocalRecord): Promise<void> {
  const db = await getDb();
  await db.put('habits_v2_local', record);
}

export async function getLocalHabitV2Record(id: string): Promise<HabitV2LocalRecord | null> {
  const db = await getDb();
  return (await db.get('habits_v2_local', id)) ?? null;
}

export async function removeLocalHabitV2Record(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('habits_v2_local', id);
}

export async function listLocalHabitsV2ForUser(userId: string): Promise<HabitV2LocalRecord[]> {
  const db = await getDb();
  return db.getAllFromIndex('habits_v2_local', 'by-user', IDBKeyRange.only(userId));
}

export async function enqueueHabitV2Mutation(record: HabitV2MutationRecord): Promise<void> {
  const db = await getDb();
  await db.put('habits_v2_mutations', record);
}

export async function updateHabitV2Mutation(id: string, patch: Partial<HabitV2MutationRecord>): Promise<void> {
  const db = await getDb();
  const current = await db.get('habits_v2_mutations', id);
  if (!current) return;
  await db.put('habits_v2_mutations', { ...current, ...patch });
}

export async function removeHabitV2Mutation(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('habits_v2_mutations', id);
}

export async function listPendingHabitV2Mutations(userId: string): Promise<HabitV2MutationRecord[]> {
  const db = await getDb();
  const records = await db.getAllFromIndex('habits_v2_mutations', 'by-user', IDBKeyRange.only(userId));
  return records
    .filter((record) => record.status === 'pending' || record.status === 'failed')
    .sort((a, b) => a.created_at_ms - b.created_at_ms);
}

export async function getHabitV2MutationCounts(userId: string): Promise<{ pending: number; failed: number }> {
  const db = await getDb();
  const records = await db.getAllFromIndex('habits_v2_mutations', 'by-user', IDBKeyRange.only(userId));
  let pending = 0;
  let failed = 0;
  for (const record of records) {
    if (record.status === 'pending' || record.status === 'processing') pending += 1;
    if (record.status === 'failed') failed += 1;
  }
  return { pending, failed };
}
