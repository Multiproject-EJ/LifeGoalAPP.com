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
  personality_tests: {
    key: string;
    value: {
      id: string;
      user_id: string;
      taken_at: string;
      traits: Record<string, number>;
      axes: Record<string, number>;
      answers: Record<string, number>;
      version: string;
      _dirty?: boolean;
    };
    indexes: {
      'by-user_id': string;
      'by-taken_at': string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<LifeGoalAppDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<LifeGoalAppDB>('lifegoalapp-db', 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('goals')) {
          const goals = db.createObjectStore('goals', { keyPath: 'id' });
          goals.createIndex('by-user_id', 'user_id');
          goals.createIndex('by-updated_at', 'updated_at');
        }
        if (!db.objectStoreNames.contains('personality_tests')) {
          const tests = db.createObjectStore('personality_tests', { keyPath: 'id' });
          tests.createIndex('by-user_id', 'user_id');
          tests.createIndex('by-taken_at', 'taken_at');
        }
      },
    });
  }
  return dbPromise;
}

export type GoalValue = LifeGoalAppDB['goals']['value'];
export type PersonalityTestValue = LifeGoalAppDB['personality_tests']['value'];

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

// ---------- Personality tests basic operations ----------

export async function getPersonalityTestsForUser(
  userId: string,
): Promise<PersonalityTestValue[]> {
  const db = await getDb();
  return db.getAllFromIndex('personality_tests', 'by-user_id', IDBKeyRange.only(userId));
}

export async function putPersonalityTest(test: PersonalityTestValue): Promise<void> {
  const db = await getDb();
  await db.put('personality_tests', test);
}

export async function getDirtyPersonalityTests(): Promise<PersonalityTestValue[]> {
  const db = await getDb();
  const tx = db.transaction('personality_tests');
  const store = tx.store;
  const allTests = await store.getAll();
  return allTests.filter((test) => test._dirty);
}
