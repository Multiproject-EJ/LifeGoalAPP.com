/**
 * Offline mutation queue — public API and app-wide singletons.
 */

export * from './types';
export { MutationQueue, type MutationQueueOptions } from './mutationQueue';
export {
  MemoryQueueStorage,
  LocalStorageQueueStorage,
  createDefaultQueueStorage,
  selectQueueStorage,
  type QueueStorageEnvironment,
} from './storageAdapters';
export {
  IndexedDBQueueStorage,
  type IndexedDBQueueStorageOptions,
  type QueueDatabaseLike,
} from './indexedDbStorage';
export {
  SyncEngine,
  type SyncEngineOptions,
  type ExecutorResult,
  type MutationExecutor,
  type ConflictResolution,
  type SyncProgress,
  type SyncReport,
} from './syncEngine';

import { MutationQueue } from './mutationQueue';
import { createDefaultQueueStorage } from './storageAdapters';
import { SyncEngine } from './syncEngine';
import { getServiceHealthManager } from '../service-health/serviceHealthManager';

let sharedQueue: MutationQueue | null = null;
let sharedEngine: SyncEngine | null = null;

/** App-wide durable queue. Tests construct their own instances instead. */
export function getMutationQueue(): MutationQueue {
  if (!sharedQueue) {
    const manager = getServiceHealthManager();
    sharedQueue = new MutationQueue({
      storage: createDefaultQueueStorage(() => manager.setLocalPersistenceFailed(true)),
    });
  }
  return sharedQueue;
}

/** App-wide sync engine, auto-resyncing on cloud recovery. */
export function getSyncEngine(): SyncEngine {
  if (!sharedEngine) {
    sharedEngine = new SyncEngine({
      queue: getMutationQueue(),
      healthManager: getServiceHealthManager(),
    });
    sharedEngine.attachToHealthManager();
  }
  return sharedEngine;
}
