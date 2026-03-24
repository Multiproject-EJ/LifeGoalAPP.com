import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Database } from '../lib/database.types';

export type JournalEntryRow = Database['public']['Tables']['journal_entries']['Row'];
export type JournalEntryInsert = Database['public']['Tables']['journal_entries']['Insert'];
export type JournalEntryUpdate = Database['public']['Tables']['journal_entries']['Update'];

export type JournalSyncState =
  | 'pending_create'
  | 'pending_update'
  | 'pending_delete'
  | 'failed';

export type JournalMutationOperation = 'create' | 'update' | 'delete';

type JournalLocalRecord = {
  id: string;
  user_id: string;
  server_id: string | null;
  row: JournalEntryRow;
  sync_state: JournalSyncState;
  updated_at_ms: number;
  last_error: string | null;
};

type JournalMutationRecord = {
  id: string;
  user_id: string;
  entry_id: string;
  server_id: string | null;
  operation: JournalMutationOperation;
  payload: JournalEntryInsert | JournalEntryUpdate | null;
  status: 'pending' | 'processing' | 'failed';
  attempt_count: number;
  created_at_ms: number;
  updated_at_ms: number;
  last_error: string | null;
};

interface JournalOfflineDB extends DBSchema {
  journal_local: {
    key: string;
    value: JournalLocalRecord;
    indexes: {
      'by-user': string;
      'by-sync-state': string;
      'by-updated': number;
    };
  };
  journal_mutations: {
    key: string;
    value: JournalMutationRecord;
    indexes: {
      'by-user': string;
      'by-status': string;
      'by-created': number;
    };
  };
}

const DB_NAME = 'lifegoalapp-journal-offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<JournalOfflineDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<JournalOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('journal_local')) {
          const store = db.createObjectStore('journal_local', { keyPath: 'id' });
          store.createIndex('by-user', 'user_id');
          store.createIndex('by-sync-state', 'sync_state');
          store.createIndex('by-updated', 'updated_at_ms');
        }

        if (!db.objectStoreNames.contains('journal_mutations')) {
          const store = db.createObjectStore('journal_mutations', { keyPath: 'id' });
          store.createIndex('by-user', 'user_id');
          store.createIndex('by-status', 'status');
          store.createIndex('by-created', 'created_at_ms');
        }
      },
    });
  }
  return dbPromise;
}

export function buildLocalJournalId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `local-${crypto.randomUUID()}`;
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function upsertLocalJournalRecord(record: JournalLocalRecord): Promise<void> {
  const db = await getDb();
  await db.put('journal_local', record);
}

export async function removeLocalJournalRecord(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('journal_local', id);
}

export async function getLocalJournalRecord(id: string): Promise<JournalLocalRecord | null> {
  const db = await getDb();
  return (await db.get('journal_local', id)) ?? null;
}

export async function listLocalJournalRecordsForUser(userId: string): Promise<JournalLocalRecord[]> {
  const db = await getDb();
  return db.getAllFromIndex('journal_local', 'by-user', IDBKeyRange.only(userId));
}

export async function enqueueJournalMutation(record: JournalMutationRecord): Promise<void> {
  const db = await getDb();
  await db.put('journal_mutations', record);
}

export async function removeJournalMutation(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('journal_mutations', id);
}

export async function updateJournalMutation(
  id: string,
  patch: Partial<JournalMutationRecord>,
): Promise<void> {
  const db = await getDb();
  const current = await db.get('journal_mutations', id);
  if (!current) return;
  await db.put('journal_mutations', { ...current, ...patch });
}

export async function listPendingJournalMutations(userId: string): Promise<JournalMutationRecord[]> {
  const db = await getDb();
  const records = await db.getAllFromIndex('journal_mutations', 'by-user', IDBKeyRange.only(userId));
  return records
    .filter((record) => record.status === 'pending' || record.status === 'failed')
    .sort((a, b) => a.created_at_ms - b.created_at_ms);
}

export async function getJournalMutationCounts(userId: string): Promise<{ pending: number; failed: number }> {
  const db = await getDb();
  const records = await db.getAllFromIndex('journal_mutations', 'by-user', IDBKeyRange.only(userId));
  let pending = 0;
  let failed = 0;
  for (const record of records) {
    if (record.status === 'pending' || record.status === 'processing') pending += 1;
    if (record.status === 'failed') failed += 1;
  }
  return { pending, failed };
}
