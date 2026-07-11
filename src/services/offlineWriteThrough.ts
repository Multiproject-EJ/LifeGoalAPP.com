/**
 * Shared write-through adoption helper (service resilience Part 6/7).
 *
 * Feature services wrap their Supabase writes with `writeThroughWithQueue`:
 * the write is attempted through guardedCloudCall; if it fails in a way that
 * is safe to continue locally (offline, timeout, quota, maintenance, …) the
 * mutation is enqueued on the shared durable MutationQueue and the caller
 * receives an optimistic local result. Permanent failures (permission,
 * expired session) surface as a translated AppError — never raw provider
 * text.
 *
 * Executors for the queued operations are registered once at startup in
 * offlineSyncExecutors.ts; payloads carry client-generated ids so replays
 * are idempotent (upsert by id).
 */

import type { PostgrestError } from '@supabase/supabase-js';
import { guardedCloudCall, type AppError, type ServiceKind } from './service-health';
import { getMutationQueue } from './offline-queue';

/** Categories that must not be parked on the queue. */
const NEVER_QUEUE_CATEGORIES = new Set(['auth_expired', 'invalid_credentials', 'permission_denied', 'conflict']);

export function shouldQueueAfterFailure(error: AppError): boolean {
  return error.safeLocalMode && !NEVER_QUEUE_CATEGORIES.has(error.category);
}

/** Translated AppError → PostgrestError-shaped object for legacy signatures. */
export function toPostgrestError(appError: AppError): PostgrestError {
  return {
    name: 'PostgrestError',
    code: appError.code,
    details: '',
    hint: '',
    message: appError.explanation,
  } as PostgrestError;
}

export type WriteThroughOutcome<T> =
  | { data: T; error: null; queued: boolean }
  | { data: null; error: AppError; queued: false };

export async function writeThroughWithQueue<T>(options: {
  feature: string;
  operation: string;
  payload: unknown;
  /**
   * Stable key so a newer local edit replaces the queued one. Only set this
   * when the payload is a full-state snapshot — deduping partial patches
   * would drop earlier offline edits. Omit to replay every write in order.
   */
  dedupeKey?: string;
  service?: ServiceKind;
  /** The direct server write. */
  write: () => Promise<T>;
  /** Local result handed back when the write had to be queued. */
  optimistic: () => T;
}): Promise<WriteThroughOutcome<T>> {
  const result = await guardedCloudCall(options.service ?? 'database', options.write);
  if (result.ok) {
    return { data: result.data, error: null, queued: false };
  }
  if (shouldQueueAfterFailure(result.error)) {
    await getMutationQueue().enqueue({
      feature: options.feature,
      operation: options.operation,
      payload: options.payload,
      dedupeKey: options.dedupeKey,
    });
    return { data: options.optimistic(), error: null, queued: true };
  }
  return { data: null, error: result.error, queued: false };
}

export function generateClientId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}-4000-8000-${Math.random()
    .toString(16)
    .slice(2, 14)}`;
}

// ── Read fallback cache ──────────────────────────────────────────────────────
// Bounded by construction: one localStorage entry per cache key, overwritten
// on every successful read. Enough to keep features usable during an outage.

const CACHE_PREFIX = 'lifegoal_read_cache:';

export function writeReadFallbackCache(key: string, data: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify({ at: Date.now(), data }));
  } catch {
    // Cache is best-effort; quota failures must not break reads.
  }
}

export function readReadFallbackCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; data: T };
    return parsed?.data ?? null;
  } catch {
    return null;
  }
}
