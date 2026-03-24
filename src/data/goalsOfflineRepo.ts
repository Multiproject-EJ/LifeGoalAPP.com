import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Database } from '../lib/database.types';

export type GoalRow = Database['public']['Tables']['goals']['Row'];
export type GoalInsert = Database['public']['Tables']['goals']['Insert'];
export type GoalUpdate = Database['public']['Tables']['goals']['Update'];

type GoalLocalRecord = {
  id: string;
  user_id: string;
  server_id: string | null;
  row: GoalRow;
  sync_state: 'pending_create' | 'pending_update' | 'pending_delete' | 'failed';
  updated_at_ms: number;
  last_error: string | null;
};

type GoalMutationRecord = {
  id: string;
  user_id: string;
  goal_id: string;
  server_id: string | null;
  operation: 'create' | 'update' | 'delete';
  payload: GoalInsert | GoalUpdate | null;
  status: 'pending' | 'processing' | 'failed';
  attempt_count: number;
  created_at_ms: number;
  updated_at_ms: number;
  last_error: string | null;
};

interface GoalsOfflineDB extends DBSchema {
  goals_local: {
    key: string;
    value: GoalLocalRecord;
    indexes: {
      'by-user': string;
    };
  };
  goals_mutations: {
    key: string;
    value: GoalMutationRecord;
    indexes: {
      'by-user': string;
    };
  };
}

const DB_NAME = 'lifegoalapp-goals-offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<GoalsOfflineDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<GoalsOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('goals_local')) {
          const store = db.createObjectStore('goals_local', { keyPath: 'id' });
          store.createIndex('by-user', 'user_id');
        }
        if (!db.objectStoreNames.contains('goals_mutations')) {
          const store = db.createObjectStore('goals_mutations', { keyPath: 'id' });
          store.createIndex('by-user', 'user_id');
        }
      },
    });
  }
  return dbPromise;
}

export function buildLocalGoalId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `local-goal-${crypto.randomUUID()}`;
  return `local-goal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function upsertLocalGoalRecord(record: GoalLocalRecord): Promise<void> {
  const db = await getDb();
  await db.put('goals_local', record);
}

export async function getLocalGoalRecord(id: string): Promise<GoalLocalRecord | null> {
  const db = await getDb();
  return (await db.get('goals_local', id)) ?? null;
}

export async function removeLocalGoalRecord(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('goals_local', id);
}

export async function listLocalGoalsForUser(userId: string): Promise<GoalLocalRecord[]> {
  const db = await getDb();
  return db.getAllFromIndex('goals_local', 'by-user', IDBKeyRange.only(userId));
}

export async function enqueueGoalMutation(record: GoalMutationRecord): Promise<void> {
  const db = await getDb();
  await db.put('goals_mutations', record);
}

export async function updateGoalMutation(id: string, patch: Partial<GoalMutationRecord>): Promise<void> {
  const db = await getDb();
  const current = await db.get('goals_mutations', id);
  if (!current) return;
  await db.put('goals_mutations', { ...current, ...patch });
}

export async function removeGoalMutation(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('goals_mutations', id);
}

export async function listPendingGoalMutations(userId: string): Promise<GoalMutationRecord[]> {
  const db = await getDb();
  const records = await db.getAllFromIndex('goals_mutations', 'by-user', IDBKeyRange.only(userId));
  return records
    .filter((record) => record.status === 'pending' || record.status === 'failed')
    .sort((a, b) => a.created_at_ms - b.created_at_ms);
}

export async function getGoalMutationCounts(userId: string): Promise<{ pending: number; failed: number }> {
  const pending = await listPendingGoalMutations(userId);
  return {
    pending: pending.filter((item) => item.status === 'pending' || item.status === 'processing').length,
    failed: pending.filter((item) => item.status === 'failed').length,
  };
}
