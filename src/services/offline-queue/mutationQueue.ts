/**
 * Durable offline mutation queue (Part 6).
 *
 * Local changes made while the cloud is unavailable are recorded here and
 * drained by the SyncEngine when services recover. The queue is bounded
 * (Part 14): completed work is pruned immediately and the total size is
 * capped so it can never reproduce the runaway-growth incident.
 */

import type {
  EnqueueInput,
  MutationStatus,
  PendingMutation,
  QueueChange,
  QueueListener,
  QueueStorageAdapter,
} from './types';
import { MemoryQueueStorage } from './storageAdapters';
import { systemClock, type Clock } from '../service-health/types';

export interface MutationQueueOptions {
  storage?: QueueStorageAdapter;
  /** Hard cap on stored mutations (oldest terminal entries pruned first). */
  maxEntries?: number;
  /** Attempts before a mutation is parked as 'failed' (still retryable manually). */
  maxAttempts?: number;
  clock?: Clock;
  idGenerator?: () => string;
}

function defaultIdGenerator(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `mut-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export class MutationQueue {
  private readonly storage: QueueStorageAdapter;
  private readonly maxEntries: number;
  readonly maxAttempts: number;
  private readonly clock: Clock;
  private readonly idGenerator: () => string;
  private readonly listeners = new Set<QueueListener>();

  private mutations: PendingMutation[] = [];
  private loaded = false;
  private loadPromise: Promise<void> | null = null;

  constructor(options: MutationQueueOptions = {}) {
    this.storage = options.storage ?? new MemoryQueueStorage();
    this.maxEntries = Math.max(10, options.maxEntries ?? 1_000);
    this.maxAttempts = Math.max(1, options.maxAttempts ?? 8);
    this.clock = options.clock ?? systemClock;
    this.idGenerator = options.idGenerator ?? defaultIdGenerator;
  }

  /** Restore persisted mutations (survives restarts mid-outage). */
  async initialize(): Promise<void> {
    if (this.loaded) return;
    if (!this.loadPromise) {
      this.loadPromise = this.storage.load().then((stored) => {
        // Anything interrupted mid-sync goes back to pending.
        this.mutations = stored.map((mutation) =>
          mutation.status === 'syncing' ? { ...mutation, status: 'pending' as const } : mutation,
        );
        this.loaded = true;
      });
    }
    await this.loadPromise;
  }

  async enqueue<TPayload>(input: EnqueueInput<TPayload>): Promise<PendingMutation<TPayload>> {
    await this.initialize();

    const idempotencyKey = input.dedupeKey
      ? `${input.feature}:${input.operation}:${input.dedupeKey}`
      : this.idGenerator();

    // Deduplicate: a newer local edit of the same logical record replaces the
    // queued one — one server write instead of a replayed history.
    if (input.dedupeKey) {
      this.mutations = this.mutations.filter(
        (existing) =>
          !(existing.idempotencyKey === idempotencyKey &&
            (existing.status === 'pending' || existing.status === 'failed')),
      );
    }

    const mutation: PendingMutation<TPayload> = {
      id: this.idGenerator(),
      feature: input.feature,
      operation: input.operation,
      payload: input.payload,
      createdAt: new Date(this.clock()).toISOString(),
      attempts: 0,
      status: 'pending',
      idempotencyKey,
      lastErrorCode: null,
      nextAttemptAt: null,
    };
    this.mutations.push(mutation as PendingMutation);
    this.enforceBounds();
    await this.persist();
    this.notify();
    return mutation;
  }

  /** Mutations eligible for a sync attempt right now. */
  async takeDue(limit = 25): Promise<PendingMutation[]> {
    await this.initialize();
    const now = this.clock();
    return this.mutations
      .filter(
        (mutation) =>
          mutation.status === 'pending' &&
          (mutation.nextAttemptAt === null || Date.parse(mutation.nextAttemptAt) <= now),
      )
      .slice(0, limit);
  }

  async markStatus(
    id: string,
    status: MutationStatus,
    update: { errorCode?: string | null; nextAttemptAt?: string | null; incrementAttempts?: boolean } = {},
  ): Promise<void> {
    await this.initialize();
    const mutation = this.mutations.find((entry) => entry.id === id);
    if (!mutation) return;
    mutation.status = status;
    if (update.incrementAttempts) mutation.attempts += 1;
    if (update.errorCode !== undefined) mutation.lastErrorCode = update.errorCode;
    if (update.nextAttemptAt !== undefined) mutation.nextAttemptAt = update.nextAttemptAt;
    if (status === 'completed') {
      this.mutations = this.mutations.filter((entry) => entry.id !== id);
    }
    await this.persist();
    this.notify();
  }

  /** Re-arm failed mutations (user pressed "Retry"). */
  async retryFailed(): Promise<number> {
    await this.initialize();
    let count = 0;
    for (const mutation of this.mutations) {
      if (mutation.status === 'failed') {
        mutation.status = 'pending';
        mutation.attempts = 0;
        mutation.nextAttemptAt = null;
        count += 1;
      }
    }
    if (count > 0) {
      await this.persist();
      this.notify();
    }
    return count;
  }

  async list(): Promise<PendingMutation[]> {
    await this.initialize();
    return this.mutations.map((mutation) => ({ ...mutation }));
  }

  async counts(): Promise<QueueChange> {
    await this.initialize();
    const counts: QueueChange = { pending: 0, failed: 0, blocked: 0, syncing: 0 };
    for (const mutation of this.mutations) {
      if (mutation.status === 'pending') counts.pending += 1;
      else if (mutation.status === 'failed') counts.failed += 1;
      else if (mutation.status === 'blocked') counts.blocked += 1;
      else if (mutation.status === 'syncing') counts.syncing += 1;
    }
    return counts;
  }

  subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private enforceBounds(): void {
    if (this.mutations.length <= this.maxEntries) return;
    // Prune terminal entries first, then the oldest entries — bounded growth
    // beats a perfect history (Part 14).
    const terminal = new Set<MutationStatus>(['completed', 'blocked']);
    const keep = this.mutations.filter((mutation) => !terminal.has(mutation.status));
    this.mutations =
      keep.length > this.maxEntries ? keep.slice(keep.length - this.maxEntries) : keep;
  }

  private async persist(): Promise<void> {
    await this.storage.save(this.mutations);
  }

  private notify(): void {
    void this.counts().then((change) => {
      for (const listener of this.listeners) {
        try {
          listener(change);
        } catch {
          // Listeners must not break the queue.
        }
      }
    });
  }
}
