/**
 * Offline mutation queue — shared types (Part 6).
 *
 * Every local modification made while the cloud is unavailable becomes a
 * durable PendingMutation. Environment-agnostic: storage is behind an
 * adapter so the web build persists to localStorage/IndexedDB and the
 * Capacitor build can persist to SQLite without touching this layer.
 */

export type MutationStatus = 'pending' | 'syncing' | 'failed' | 'blocked' | 'completed';

export interface PendingMutation<TPayload = unknown> {
  /** Unique id (uuid). */
  id: string;
  /** Feature that produced the change, e.g. 'habit_completion', 'journal'. */
  feature: string;
  /** Operation name the executor understands, e.g. 'habit_log.insert'. */
  operation: string;
  payload: TPayload;
  /** ISO timestamp of local creation — used for conflict resolution. */
  createdAt: string;
  attempts: number;
  status: MutationStatus;
  /**
   * Idempotency key. Executors must make server writes with this key so a
   * retry after an ambiguous failure never applies twice.
   */
  idempotencyKey: string;
  /** Translated error code from the last failed attempt, if any. */
  lastErrorCode: string | null;
  /** ISO timestamp before which the mutation must not be retried. */
  nextAttemptAt: string | null;
}

/** Runtime guard for entries restored from durable storage. */
export function isPendingMutation(value: unknown): value is PendingMutation {
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

export interface EnqueueInput<TPayload = unknown> {
  feature: string;
  operation: string;
  payload: TPayload;
  /**
   * Optional stable key for deduplication: enqueueing the same key again
   * replaces the earlier pending mutation (last write wins locally).
   */
  dedupeKey?: string;
}

/** Durable storage behind the queue. Implementations must never throw. */
export interface QueueStorageAdapter {
  load(): Promise<PendingMutation[]>;
  save(mutations: PendingMutation[]): Promise<void>;
}

export interface QueueChange {
  pending: number;
  failed: number;
  blocked: number;
  syncing: number;
}

export type QueueListener = (change: QueueChange) => void;
