import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Database } from '../lib/database.types';

type PersonalityTestInsert = Database['public']['Tables']['personality_tests']['Insert'];

export type PersonalityTestMutationRecord = {
  id: string;
  user_id: string;
  test_id: string;
  operation: 'upsert_test';
  payload: PersonalityTestInsert;
  status: 'pending' | 'processing' | 'failed';
  attempt_count: number;
  created_at_ms: number;
  updated_at_ms: number;
  last_error: string | null;
};

interface PersonalityTestOfflineDB extends DBSchema {
  personality_test_mutations: {
    key: string;
    value: PersonalityTestMutationRecord;
    indexes: {
      'by-user': string;
      'by-test': string;
    };
  };
}

const DB_NAME = 'lifegoalapp-personality-offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<PersonalityTestOfflineDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<PersonalityTestOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('personality_test_mutations')) {
          const store = db.createObjectStore('personality_test_mutations', { keyPath: 'id' });
          store.createIndex('by-user', 'user_id');
          store.createIndex('by-test', 'test_id');
        }
      },
    });
  }
  return dbPromise;
}

export async function enqueuePersonalityTestMutation(record: PersonalityTestMutationRecord): Promise<void> {
  const db = await getDb();
  await db.put('personality_test_mutations', record);
}

export async function updatePersonalityTestMutation(
  id: string,
  patch: Partial<PersonalityTestMutationRecord>,
): Promise<void> {
  const db = await getDb();
  const current = await db.get('personality_test_mutations', id);
  if (!current) return;
  await db.put('personality_test_mutations', { ...current, ...patch });
}

export async function removePersonalityTestMutation(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('personality_test_mutations', id);
}

export async function listPendingPersonalityTestMutations(userId: string): Promise<PersonalityTestMutationRecord[]> {
  const db = await getDb();
  const records = await db.getAllFromIndex('personality_test_mutations', 'by-user', IDBKeyRange.only(userId));
  return records
    .filter((record) => record.status === 'pending' || record.status === 'failed')
    .sort((a, b) => a.created_at_ms - b.created_at_ms);
}

export async function getPersonalityTestMutationCounts(
  userId: string,
): Promise<{ pending: number; failed: number }> {
  const db = await getDb();
  const records = await db.getAllFromIndex('personality_test_mutations', 'by-user', IDBKeyRange.only(userId));
  let pending = 0;
  let failed = 0;
  for (const record of records) {
    if (record.status === 'pending' || record.status === 'processing') pending += 1;
    if (record.status === 'failed') failed += 1;
  }
  return { pending, failed };
}
