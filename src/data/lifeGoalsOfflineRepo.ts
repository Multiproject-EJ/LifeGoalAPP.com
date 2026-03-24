import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Database } from '../lib/database.types';

type StepInsert = Database['public']['Tables']['life_goal_steps']['Insert'];
type SubstepInsert = Database['public']['Tables']['life_goal_substeps']['Insert'];
type AlertInsert = Database['public']['Tables']['life_goal_alerts']['Insert'];

export type LifeGoalMutationRecord = {
  id: string;
  user_id: string;
  operation: 'insert_step' | 'insert_substep' | 'insert_alert';
  payload: StepInsert | SubstepInsert | AlertInsert;
  status: 'pending' | 'processing' | 'failed';
  attempt_count: number;
  created_at_ms: number;
  updated_at_ms: number;
  last_error: string | null;
};

interface LifeGoalsOfflineDB extends DBSchema {
  life_goals_mutations: {
    key: string;
    value: LifeGoalMutationRecord;
    indexes: {
      'by-user': string;
    };
  };
}

const DB_NAME = 'lifegoalapp-life-goals-offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<LifeGoalsOfflineDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<LifeGoalsOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('life_goals_mutations')) {
          const store = db.createObjectStore('life_goals_mutations', { keyPath: 'id' });
          store.createIndex('by-user', 'user_id');
        }
      },
    });
  }
  return dbPromise;
}

export async function enqueueLifeGoalMutation(record: LifeGoalMutationRecord): Promise<void> {
  const db = await getDb();
  await db.put('life_goals_mutations', record);
}

export async function listPendingLifeGoalMutations(userId: string): Promise<LifeGoalMutationRecord[]> {
  const db = await getDb();
  const records = await db.getAllFromIndex('life_goals_mutations', 'by-user', IDBKeyRange.only(userId));
  return records
    .filter((record) => record.status === 'pending' || record.status === 'failed')
    .sort((a, b) => a.created_at_ms - b.created_at_ms);
}

export async function updateLifeGoalMutation(
  id: string,
  patch: Partial<LifeGoalMutationRecord>,
): Promise<void> {
  const db = await getDb();
  const current = await db.get('life_goals_mutations', id);
  if (!current) return;
  await db.put('life_goals_mutations', { ...current, ...patch });
}

export async function removeLifeGoalMutation(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('life_goals_mutations', id);
}

export async function getLifeGoalMutationCounts(userId: string): Promise<{ pending: number; failed: number }> {
  const records = await listPendingLifeGoalMutations(userId);
  return {
    pending: records.filter((record) => record.status === 'pending' || record.status === 'processing').length,
    failed: records.filter((record) => record.status === 'failed').length,
  };
}
