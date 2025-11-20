import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface LifeGoalAppDB extends DBSchema {
  goals: {
    key: string; // goal id (Supabase UUID or temp offline ID)
    value: {
      id: string;
      user_id: string;
      title: string;
      description?: string | null;
      status?: string | null;
      target_date?: string | null;
      created_at: string;
      updated_at: string;
      // sync metadata
      _dirty?: boolean;   // unsynced local changes
      _deleted?: boolean; // marked for deletion before sync
    };
    indexes: {
      'by-user_id': string;
      'by-updated_at': string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<LifeGoalAppDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<LifeGoalAppDB>('lifegoalapp-db', 1, {
      upgrade(db) {
        const goals = db.createObjectStore('goals', { keyPath: 'id' });
        goals.createIndex('by-user_id', 'user_id');
        goals.createIndex('by-updated_at', 'updated_at');
      },
    });
  }
  return dbPromise;
}

export type GoalValue = LifeGoalAppDB['goals']['value'];

// ---------- Goals basic operations ----------

export async function getGoalsForUser(userId: string): Promise<GoalValue[]> {
  const db = await getDb();
  return db.getAllFromIndex('goals', 'by-user_id', IDBKeyRange.only(userId));
}

export async function putGoal(goal: GoalValue): Promise<void> {
  const db = await getDb();
  await db.put('goals', goal);
}

export async function markGoalDeletedLocally(id: string): Promise<void> {
  const db = await getDb();
  const existing = await db.get('goals', id);
  if (!existing) return;

  await db.put('goals', {
    ...existing,
    _deleted: true,
    _dirty: true,
    updated_at: new Date().toISOString(),
  });
}

export async function hardDeleteGoalLocally(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('goals', id);
}

export async function getDirtyGoals(): Promise<GoalValue[]> {
  const db = await getDb();
  const tx = db.transaction('goals');
  const store = tx.store;
  const allGoals = await store.getAll();
  return allGoals.filter((g) => g._dirty);
}
