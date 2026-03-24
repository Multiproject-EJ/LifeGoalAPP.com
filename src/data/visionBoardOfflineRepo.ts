import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Database } from '../lib/database.types';

export type VisionImageRow = Database['public']['Tables']['vision_images']['Row'];
export type VisionImageInsert = Database['public']['Tables']['vision_images']['Insert'];

export type VisionImageLocalRecord = {
  id: string;
  user_id: string;
  server_id: string | null;
  row: VisionImageRow;
  sync_state: 'pending_create' | 'failed';
  updated_at_ms: number;
  last_error: string | null;
};

export type VisionImageMutationRecord = {
  id: string;
  user_id: string;
  image_id: string;
  server_id: string | null;
  operation: 'create_url' | 'create_file';
  payload: VisionImageInsert & {
    staged_file_data_url?: string | null;
    staged_file_name?: string | null;
    staged_content_type?: string | null;
  };
  status: 'pending' | 'processing' | 'failed';
  attempt_count: number;
  created_at_ms: number;
  updated_at_ms: number;
  last_error: string | null;
};

interface VisionBoardOfflineDB extends DBSchema {
  vision_images_local: {
    key: string;
    value: VisionImageLocalRecord;
    indexes: {
      'by-user': string;
    };
  };
  vision_images_mutations: {
    key: string;
    value: VisionImageMutationRecord;
    indexes: {
      'by-user': string;
    };
  };
}

const DB_NAME = 'lifegoalapp-vision-board-offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<VisionBoardOfflineDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<VisionBoardOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('vision_images_local')) {
          const store = db.createObjectStore('vision_images_local', { keyPath: 'id' });
          store.createIndex('by-user', 'user_id');
        }
        if (!db.objectStoreNames.contains('vision_images_mutations')) {
          const store = db.createObjectStore('vision_images_mutations', { keyPath: 'id' });
          store.createIndex('by-user', 'user_id');
        }
      },
    });
  }
  return dbPromise;
}

export function buildLocalVisionImageId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `local-vision-${crypto.randomUUID()}`;
  return `local-vision-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function upsertLocalVisionImageRecord(record: VisionImageLocalRecord): Promise<void> {
  const db = await getDb();
  await db.put('vision_images_local', record);
}

export async function removeLocalVisionImageRecord(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('vision_images_local', id);
}

export async function listLocalVisionImageRecordsForUser(userId: string): Promise<VisionImageLocalRecord[]> {
  const db = await getDb();
  return db.getAllFromIndex('vision_images_local', 'by-user', IDBKeyRange.only(userId));
}

export async function enqueueVisionImageMutation(record: VisionImageMutationRecord): Promise<void> {
  const db = await getDb();
  await db.put('vision_images_mutations', record);
}

export async function updateVisionImageMutation(id: string, patch: Partial<VisionImageMutationRecord>): Promise<void> {
  const db = await getDb();
  const current = await db.get('vision_images_mutations', id);
  if (!current) return;
  await db.put('vision_images_mutations', { ...current, ...patch });
}

export async function removeVisionImageMutation(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('vision_images_mutations', id);
}

export async function listPendingVisionImageMutations(userId: string): Promise<VisionImageMutationRecord[]> {
  const db = await getDb();
  const records = await db.getAllFromIndex('vision_images_mutations', 'by-user', IDBKeyRange.only(userId));
  return records
    .filter((record) => record.status === 'pending' || record.status === 'failed')
    .sort((a, b) => a.created_at_ms - b.created_at_ms);
}

export async function getVisionImageMutationCounts(userId: string): Promise<{ pending: number; failed: number }> {
  const db = await getDb();
  const records = await db.getAllFromIndex('vision_images_mutations', 'by-user', IDBKeyRange.only(userId));
  let pending = 0;
  let failed = 0;
  for (const record of records) {
    if (record.status === 'pending' || record.status === 'processing') pending += 1;
    if (record.status === 'failed') failed += 1;
  }
  return { pending, failed };
}
