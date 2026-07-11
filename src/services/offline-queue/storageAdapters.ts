/**
 * Queue storage adapters.
 *
 * The queue only speaks QueueStorageAdapter, matching the planned storage
 * abstraction: localStorage today, IndexedDB (web) / SQLite (Capacitor)
 * adapters implement the same two methods later. Adapters swallow their own
 * failures — losing durability must degrade, not crash.
 */

import { isPendingMutation, type PendingMutation, type QueueStorageAdapter } from './types';
import { IndexedDBQueueStorage } from './indexedDbStorage';

/** Non-durable adapter for tests and as a last-resort fallback. */
export class MemoryQueueStorage implements QueueStorageAdapter {
  private mutations: PendingMutation[] = [];

  async load(): Promise<PendingMutation[]> {
    return this.mutations.map((mutation) => ({ ...mutation }));
  }

  async save(mutations: PendingMutation[]): Promise<void> {
    this.mutations = mutations.map((mutation) => ({ ...mutation }));
  }
}

const DEFAULT_STORAGE_KEY = 'lifegoal_offline_mutation_queue_v1';

interface WebStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * localStorage-backed adapter (works in every browser the PWA supports).
 * Storage failures surface through onPersistenceError so the health manager
 * can enter UNSAFE mode instead of silently dropping work.
 */
export class LocalStorageQueueStorage implements QueueStorageAdapter {
  constructor(
    private readonly storage: WebStorageLike,
    private readonly storageKey: string = DEFAULT_STORAGE_KEY,
    private readonly onPersistenceError?: (error: unknown) => void,
  ) {}

  async load(): Promise<PendingMutation[]> {
    try {
      const raw = this.storage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isPendingMutation);
    } catch (error) {
      this.onPersistenceError?.(error);
      return [];
    }
  }

  async save(mutations: PendingMutation[]): Promise<void> {
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(mutations));
    } catch (error) {
      this.onPersistenceError?.(error);
    }
  }
}

function probeLocalStorage(
  onPersistenceError?: (error: unknown) => void,
): LocalStorageQueueStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    const probeKey = `${DEFAULT_STORAGE_KEY}__probe`;
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    return new LocalStorageQueueStorage(window.localStorage, DEFAULT_STORAGE_KEY, onPersistenceError);
  } catch {
    return null;
  }
}

/** Test-injectable capabilities of the current environment. */
export interface QueueStorageEnvironment {
  indexedDBAvailable: boolean;
  localStorageAdapter: QueueStorageAdapter | null;
}

/**
 * Selection logic, separated from environment detection so it can be tested:
 * IndexedDB (with localStorage as migration source + fallback) → localStorage
 * → memory as the last resort.
 */
export function selectQueueStorage(
  environment: QueueStorageEnvironment,
  onPersistenceError?: (error: unknown) => void,
): QueueStorageAdapter {
  if (environment.indexedDBAvailable) {
    return new IndexedDBQueueStorage({
      onPersistenceError,
      legacy: environment.localStorageAdapter ?? undefined,
    });
  }
  return environment.localStorageAdapter ?? new MemoryQueueStorage();
}

/** Pick the best adapter available in the current environment. */
export function createDefaultQueueStorage(
  onPersistenceError?: (error: unknown) => void,
): QueueStorageAdapter {
  return selectQueueStorage(
    {
      indexedDBAvailable: IndexedDBQueueStorage.isSupported(),
      localStorageAdapter: probeLocalStorage(onPersistenceError),
    },
    onPersistenceError,
  );
}
