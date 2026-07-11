/**
 * IndexedDB-backed queue storage (web).
 *
 * Preferred over localStorage: bigger quota and no single-string JSON limit.
 * The database is opened lazily on first use so constructing the adapter is
 * safe in any environment. If IndexedDB fails at runtime (private browsing,
 * quota, corrupted database) the adapter permanently falls back to the
 * legacy adapter when one is provided; only when no fallback exists does the
 * failure surface through onPersistenceError (→ UNSAFE mode).
 *
 * Pending work stored by the previous localStorage adapter is adopted on the
 * first successful IndexedDB load, so upgrading never strands queued edits.
 */

import { openDB } from 'idb';
import { isPendingMutation, type PendingMutation, type QueueStorageAdapter } from './types';

const DB_NAME = 'lifegoal_offline_queue';
const DB_VERSION = 1;
const STORE_NAME = 'mutations';

/** The minimal idb database surface the adapter uses — injectable for tests. */
export interface QueueDatabaseLike {
  getAll(storeName: string): Promise<unknown[]>;
  transaction(
    storeName: string,
    mode: 'readwrite',
  ): {
    store: { clear(): Promise<unknown>; put(value: unknown): Promise<unknown> };
    done: Promise<unknown>;
  };
}

async function openDefaultDatabase(): Promise<QueueDatabaseLike> {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(upgradeDb) {
      if (!upgradeDb.objectStoreNames.contains(STORE_NAME)) {
        upgradeDb.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
  return {
    getAll: (storeName) => db.getAll(storeName),
    transaction: (storeName, mode) => {
      const tx = db.transaction(storeName, mode);
      return {
        store: {
          clear: () => tx.store.clear(),
          put: (value) => tx.store.put(value),
        },
        done: tx.done,
      };
    },
  };
}

export interface IndexedDBQueueStorageOptions {
  onPersistenceError?: (error: unknown) => void;
  /**
   * Previous adapter (localStorage). Serves two roles: its entries are
   * migrated into IndexedDB on first load, and it becomes the fallback if
   * IndexedDB stops working mid-session.
   */
  legacy?: QueueStorageAdapter;
  /** Test seam — production opens the real IndexedDB via idb. */
  openDatabase?: () => Promise<QueueDatabaseLike>;
}

export class IndexedDBQueueStorage implements QueueStorageAdapter {
  private readonly onPersistenceError?: (error: unknown) => void;
  private readonly legacy: QueueStorageAdapter | null;
  private readonly openDatabase: () => Promise<QueueDatabaseLike>;
  private dbPromise: Promise<QueueDatabaseLike> | null = null;
  private broken = false;
  private legacyMigrated = false;

  constructor(options: IndexedDBQueueStorageOptions = {}) {
    this.onPersistenceError = options.onPersistenceError;
    this.legacy = options.legacy ?? null;
    this.openDatabase = options.openDatabase ?? openDefaultDatabase;
  }

  static isSupported(globalLike: { indexedDB?: unknown } | undefined = globalThis): boolean {
    return typeof globalLike?.indexedDB !== 'undefined' && globalLike.indexedDB !== null;
  }

  async load(): Promise<PendingMutation[]> {
    if (this.broken) return this.legacy?.load() ?? [];
    try {
      const db = await this.db();
      const stored = (await db.getAll(STORE_NAME)).filter(isPendingMutation);
      return await this.adoptLegacyEntries(db, stored);
    } catch (error) {
      return this.handleFailure(error, () => this.legacy?.load() ?? []);
    }
  }

  async save(mutations: PendingMutation[]): Promise<void> {
    if (this.broken) {
      await this.legacy?.save(mutations);
      return;
    }
    try {
      const db = await this.db();
      await this.writeAll(db, mutations);
    } catch (error) {
      await this.handleFailure(error, async () => this.legacy?.save(mutations));
    }
  }

  private db(): Promise<QueueDatabaseLike> {
    if (!this.dbPromise) this.dbPromise = this.openDatabase();
    return this.dbPromise;
  }

  private async writeAll(db: QueueDatabaseLike, mutations: PendingMutation[]): Promise<void> {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await tx.store.clear();
    for (const mutation of mutations) {
      await tx.store.put(mutation);
    }
    await tx.done;
  }

  /** One-time adoption of work queued by the previous adapter. */
  private async adoptLegacyEntries(
    db: QueueDatabaseLike,
    stored: PendingMutation[],
  ): Promise<PendingMutation[]> {
    if (this.legacyMigrated || !this.legacy) return stored;
    this.legacyMigrated = true;

    const legacyEntries = await this.legacy.load();
    if (legacyEntries.length === 0) return stored;

    const byId = new Map(legacyEntries.map((mutation) => [mutation.id, mutation]));
    for (const mutation of stored) {
      byId.set(mutation.id, mutation); // IndexedDB copy wins on overlap.
    }
    const merged = Array.from(byId.values());
    await this.writeAll(db, merged);
    await this.legacy.save([]);
    return merged;
  }

  private async handleFailure<T>(error: unknown, fallback: () => Promise<T> | T): Promise<T> {
    this.broken = true;
    if (!this.legacy) {
      this.onPersistenceError?.(error);
    }
    return fallback();
  }
}
