/**
 * Sync engine (Part 7) — drains the mutation queue when the cloud returns.
 *
 * Retries use exponential backoff with jitter; failures feed the circuit
 * breaker via the ServiceHealthManager so recovery never becomes a retry
 * storm. Executors receive the mutation's idempotency key and must use it
 * for server writes, making replays safe.
 */

import type { PendingMutation } from './types';
import type { MutationQueue } from './mutationQueue';
import type { ServiceHealthManager } from '../service-health/serviceHealthManager';
import { isAppError, translateProviderError } from '../service-health/errorTranslation';
import { systemClock, type AppError, type Clock, type ServiceKind } from '../service-health/types';

/** What an executor observed on the server. */
export type ExecutorResult =
  | { outcome: 'success' }
  /** The server holds a newer version of the same record. */
  | { outcome: 'conflict'; detail?: string };

export type MutationExecutor = (mutation: PendingMutation) => Promise<ExecutorResult>;

export type ConflictResolution = 'retry' | 'discard' | 'block';

export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  conflicts: number;
  running: boolean;
}

export type SyncProgressListener = (progress: SyncProgress) => void;

export interface SyncReport {
  attempted: number;
  succeeded: number;
  retriedLater: number;
  failed: number;
  conflicts: number;
  skipped: boolean;
}

interface ExecutorRegistration {
  executor: MutationExecutor;
  service: ServiceKind;
}

export interface SyncEngineOptions {
  queue: MutationQueue;
  healthManager: ServiceHealthManager;
  clock?: Clock;
  /** Base delay for the first retry (ms). */
  baseBackoffMs?: number;
  maxBackoffMs?: number;
  /** 0..1 — how much random jitter to add to each backoff. */
  jitterRatio?: number;
  random?: () => number;
  /**
   * Decide what happens to a conflicting mutation. Default 'block': the
   * server version wins, the local change is parked for review, nothing is
   * silently overwritten.
   */
  onConflict?: (mutation: PendingMutation, detail?: string) => ConflictResolution;
}

export class SyncEngine {
  private readonly queue: MutationQueue;
  private readonly healthManager: ServiceHealthManager;
  private readonly clock: Clock;
  private readonly baseBackoffMs: number;
  private readonly maxBackoffMs: number;
  private readonly jitterRatio: number;
  private readonly random: () => number;
  private readonly onConflict: (mutation: PendingMutation, detail?: string) => ConflictResolution;
  private readonly executors = new Map<string, ExecutorRegistration>();
  private readonly progressListeners = new Set<SyncProgressListener>();

  private syncing = false;
  private detachHealthListener: (() => void) | null = null;
  private lastOverallOffline = false;

  constructor(options: SyncEngineOptions) {
    this.queue = options.queue;
    this.healthManager = options.healthManager;
    this.clock = options.clock ?? systemClock;
    this.baseBackoffMs = options.baseBackoffMs ?? 2_000;
    this.maxBackoffMs = options.maxBackoffMs ?? 5 * 60_000;
    this.jitterRatio = options.jitterRatio ?? 0.25;
    this.random = options.random ?? Math.random;
    this.onConflict = options.onConflict ?? (() => 'block');
  }

  registerExecutor(operation: string, executor: MutationExecutor, service: ServiceKind = 'database'): void {
    this.executors.set(operation, { executor, service });
  }

  onProgress(listener: SyncProgressListener): () => void {
    this.progressListeners.add(listener);
    return () => this.progressListeners.delete(listener);
  }

  /** Auto-resync whenever health transitions back from OFFLINE/unavailable. */
  attachToHealthManager(): void {
    if (this.detachHealthListener) return;
    this.lastOverallOffline = this.healthManager.getSnapshot().overall === 'OFFLINE';
    this.detachHealthListener = this.healthManager.subscribe((snapshot) => {
      const isOffline = snapshot.overall === 'OFFLINE';
      if (this.lastOverallOffline && !isOffline) {
        void this.syncNow();
      }
      this.lastOverallOffline = isOffline;
    });
  }

  detach(): void {
    this.detachHealthListener?.();
    this.detachHealthListener = null;
  }

  /**
   * Attempt to drain everything currently due. Returns a report; safe to call
   * repeatedly (concurrent calls collapse into one run).
   */
  async syncNow(): Promise<SyncReport> {
    const empty: SyncReport = {
      attempted: 0,
      succeeded: 0,
      retriedLater: 0,
      failed: 0,
      conflicts: 0,
      skipped: true,
    };
    if (this.syncing) return empty;
    this.syncing = true;

    const report: SyncReport = { ...empty, skipped: false };
    try {
      // Batches until no more mutations are due (bounded by queue size).
      for (;;) {
        const due = await this.queue.takeDue();
        if (due.length === 0) break;
        let progressed = false;
        for (const mutation of due) {
          const handled = await this.syncOne(mutation, report);
          if (handled) progressed = true;
          this.emitProgress(report, true);
        }
        if (!progressed) break; // Everything due got pushed to a later retry.
      }
    } finally {
      this.syncing = false;
      this.emitProgress(report, false);
    }
    return report;
  }

  private async syncOne(mutation: PendingMutation, report: SyncReport): Promise<boolean> {
    const registration = this.executors.get(mutation.operation);
    if (!registration) {
      // No executor registered (feature not migrated/loaded): leave pending.
      return false;
    }
    if (!this.healthManager.canRequest(registration.service)) {
      report.retriedLater += 1;
      return false;
    }

    report.attempted += 1;
    await this.queue.markStatus(mutation.id, 'syncing');

    try {
      const result = await registration.executor(mutation);
      if (result.outcome === 'conflict') {
        report.conflicts += 1;
        const resolution = this.onConflict(mutation, result.detail);
        if (resolution === 'retry') {
          await this.scheduleRetry(mutation, {
            code: 'SYNC_CONFLICT',
            category: 'conflict',
          } as AppError);
        } else if (resolution === 'discard') {
          await this.queue.markStatus(mutation.id, 'completed');
        } else {
          await this.queue.markStatus(mutation.id, 'blocked', { errorCode: 'SYNC_CONFLICT' });
        }
        this.healthManager.reportSuccess(registration.service);
        return true;
      }
      await this.queue.markStatus(mutation.id, 'completed');
      this.healthManager.reportSuccess(registration.service);
      report.succeeded += 1;
      return true;
    } catch (error) {
      const appError = isAppError(error)
        ? error
        : this.healthManager.reportFailure(registration.service, error);
      if (!appError.retryable || mutation.attempts + 1 >= this.queue.maxAttempts) {
        await this.queue.markStatus(mutation.id, 'failed', {
          errorCode: appError.code,
          incrementAttempts: true,
        });
        report.failed += 1;
      } else {
        await this.scheduleRetry(mutation, appError);
        report.retriedLater += 1;
      }
      return true;
    }
  }

  private async scheduleRetry(mutation: PendingMutation, appError: AppError): Promise<void> {
    const attempt = mutation.attempts + 1;
    const exponential = this.baseBackoffMs * Math.pow(2, attempt - 1);
    const jitter = 1 + this.jitterRatio * this.random();
    const delay = Math.min(exponential * jitter, this.maxBackoffMs);
    await this.queue.markStatus(mutation.id, 'pending', {
      errorCode: appError.code,
      incrementAttempts: true,
      nextAttemptAt: new Date(this.clock() + delay).toISOString(),
    });
  }

  private emitProgress(report: SyncReport, running: boolean): void {
    const progress: SyncProgress = {
      total: report.attempted,
      completed: report.succeeded,
      failed: report.failed,
      conflicts: report.conflicts,
      running,
    };
    for (const listener of this.progressListeners) {
      try {
        listener(progress);
      } catch {
        // Progress display must never break syncing.
      }
    }
  }
}
