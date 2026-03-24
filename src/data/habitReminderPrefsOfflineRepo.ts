import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export type HabitReminderPrefLocalRecord = {
  id: string;
  user_id: string;
  habit_id: string;
  pref: {
    habit_id: string;
    title: string;
    emoji: string | null;
    enabled: boolean;
    preferred_time: string | null;
  };
  sync_state: 'pending_upsert' | 'failed';
  updated_at_ms: number;
  last_error: string | null;
};

export type HabitReminderPrefMutationRecord = {
  id: string;
  user_id: string;
  habit_id: string;
  updates: {
    enabled?: boolean;
    preferred_time?: string | null;
  };
  status: 'pending' | 'processing' | 'failed';
  attempt_count: number;
  created_at_ms: number;
  updated_at_ms: number;
  last_error: string | null;
};

interface HabitReminderPrefsOfflineDB extends DBSchema {
  reminder_prefs_local: {
    key: string;
    value: HabitReminderPrefLocalRecord;
    indexes: {
      'by-user': string;
    };
  };
  reminder_prefs_mutations: {
    key: string;
    value: HabitReminderPrefMutationRecord;
    indexes: {
      'by-user': string;
    };
  };
}

const DB_NAME = 'lifegoalapp-reminder-prefs-offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<HabitReminderPrefsOfflineDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<HabitReminderPrefsOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('reminder_prefs_local')) {
          const store = db.createObjectStore('reminder_prefs_local', { keyPath: 'id' });
          store.createIndex('by-user', 'user_id');
        }
        if (!db.objectStoreNames.contains('reminder_prefs_mutations')) {
          const store = db.createObjectStore('reminder_prefs_mutations', { keyPath: 'id' });
          store.createIndex('by-user', 'user_id');
        }
      },
    });
  }
  return dbPromise;
}

export function buildReminderPrefKey(userId: string, habitId: string): string {
  return `${userId}:${habitId}`;
}

export async function upsertLocalReminderPrefRecord(record: HabitReminderPrefLocalRecord): Promise<void> {
  const db = await getDb();
  await db.put('reminder_prefs_local', record);
}

export async function getLocalReminderPrefRecord(id: string): Promise<HabitReminderPrefLocalRecord | null> {
  const db = await getDb();
  return (await db.get('reminder_prefs_local', id)) ?? null;
}

export async function removeLocalReminderPrefRecord(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('reminder_prefs_local', id);
}

export async function listLocalReminderPrefRecordsForUser(userId: string): Promise<HabitReminderPrefLocalRecord[]> {
  const db = await getDb();
  return db.getAllFromIndex('reminder_prefs_local', 'by-user', IDBKeyRange.only(userId));
}

export async function enqueueReminderPrefMutation(record: HabitReminderPrefMutationRecord): Promise<void> {
  const db = await getDb();
  await db.put('reminder_prefs_mutations', record);
}

export async function updateReminderPrefMutation(id: string, patch: Partial<HabitReminderPrefMutationRecord>): Promise<void> {
  const db = await getDb();
  const current = await db.get('reminder_prefs_mutations', id);
  if (!current) return;
  await db.put('reminder_prefs_mutations', { ...current, ...patch });
}

export async function removeReminderPrefMutation(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('reminder_prefs_mutations', id);
}

export async function listPendingReminderPrefMutations(userId: string): Promise<HabitReminderPrefMutationRecord[]> {
  const db = await getDb();
  const records = await db.getAllFromIndex('reminder_prefs_mutations', 'by-user', IDBKeyRange.only(userId));
  return records
    .filter((record) => record.status === 'pending' || record.status === 'failed')
    .sort((a, b) => a.created_at_ms - b.created_at_ms);
}

export async function getReminderPrefMutationCounts(userId: string): Promise<{ pending: number; failed: number }> {
  const db = await getDb();
  const records = await db.getAllFromIndex('reminder_prefs_mutations', 'by-user', IDBKeyRange.only(userId));
  let pending = 0;
  let failed = 0;
  for (const record of records) {
    if (record.status === 'pending' || record.status === 'processing') pending += 1;
    if (record.status === 'failed') failed += 1;
  }
  return { pending, failed };
}
