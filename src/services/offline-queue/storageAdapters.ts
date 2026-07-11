/**
 * Queue storage adapters.
 *
 * The queue only speaks QueueStorageAdapter, matching the planned storage
 * abstraction: localStorage today, IndexedDB (web) / SQLite (Capacitor)
 * adapters implement the same two methods later. Adapters swallow their own
 * failures — losing durability must degrade, not crash.
 */

import type { PendingMutation, QueueStorageAdapter } from './types';

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

function isPendingMutation(value: unknown): value is PendingMutation {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.feature === 'string' &&
    typeof record.operation === 'string' &&
    typeof record.createdAt === 'string' &&
    typeof record.idempotencyKey === 'string' &&
    typeof record.status === 'string'
  );
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

/** Pick the best adapter available in the current environment. */
export function createDefaultQueueStorage(
  onPersistenceError?: (error: unknown) => void,
): QueueStorageAdapter {
  if (typeof window !== 'undefined') {
    try {
      const probeKey = `${DEFAULT_STORAGE_KEY}__probe`;
      window.localStorage.setItem(probeKey, '1');
      window.localStorage.removeItem(probeKey);
      return new LocalStorageQueueStorage(window.localStorage, DEFAULT_STORAGE_KEY, onPersistenceError);
    } catch {
      // Fall through to memory storage.
    }
  }
  return new MemoryQueueStorage();
}
