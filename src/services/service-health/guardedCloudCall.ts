/**
 * guardedCloudCall — the adoption path for feature services.
 *
 * Wrap any provider call so that:
 *   - the circuit breaker can skip it during an outage (no retry storms),
 *   - success/failure feeds the ServiceHealthManager,
 *   - callers only ever see a translated AppError.
 *
 * Existing services can migrate incrementally:
 *
 *   const result = await guardedCloudCall('database', () =>
 *     supabase.from('habits').select('*'),
 *   );
 *   if (!result.ok) return fallbackToLocal(result.error);
 */

import { translateProviderError } from './errorTranslation';
import { getServiceHealthManager, type ServiceHealthManager } from './serviceHealthManager';
import type { AppError, ServiceKind } from './types';

export type GuardedResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppError; skipped: boolean };

export interface GuardedCallOptions {
  manager?: ServiceHealthManager;
  /** Reject the call after this long even if the provider never answers. */
  timeoutMs?: number;
}

function timeoutError(timeoutMs: number): Error {
  const error = new Error(`Cloud request timed out after ${timeoutMs}ms`);
  error.name = 'TimeoutError';
  return error;
}

export async function guardedCloudCall<T>(
  service: ServiceKind,
  call: () => Promise<T>,
  options: GuardedCallOptions = {},
): Promise<GuardedResult<T>> {
  const manager = options.manager ?? getServiceHealthManager();

  if (!manager.canRequest(service)) {
    const lastError =
      manager.getLastError(service) ??
      translateProviderError(new Error('Circuit open; request skipped locally.'), { service });
    return { ok: false, error: lastError, skipped: true };
  }

  const timeoutMs = options.timeoutMs ?? 12_000;
  try {
    const data = await new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(timeoutError(timeoutMs)), timeoutMs);
      call().then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });
    manager.reportSuccess(service);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: manager.reportFailure(service, error), skipped: false };
  }
}
