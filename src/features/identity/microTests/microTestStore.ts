/**
 * Local persistence for completed micro-test results, per user. Mirrors the
 * Day-Zero / Shadow-Quest localStorage pattern: offline-first, no schema, no
 * network. A future PR can sync these to Supabase alongside personality_tests.
 *
 * MicroTestResult.takenAt is a Date; it is stored as an ISO string and revived
 * on load so the decay maths in microTestScoring keeps working.
 */

import type { MicroTestResult } from './microTestScoring';

const STORAGE_PREFIX = 'lifegoal.micro_tests.v1.';

type StoredResult = {
  microTestId: string;
  takenAt: string;
  dimensionScores: Record<string, number>;
};

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function reviveResult(stored: StoredResult): MicroTestResult | null {
  const takenAt = new Date(stored.takenAt);
  if (Number.isNaN(takenAt.getTime())) return null;
  if (!stored.microTestId || typeof stored.dimensionScores !== 'object') return null;
  return {
    microTestId: stored.microTestId,
    takenAt,
    dimensionScores: stored.dimensionScores,
  };
}

export function loadMicroTestResults(userId: string | null): MicroTestResult[] {
  if (!userId || typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { results?: StoredResult[] };
    if (!Array.isArray(parsed.results)) return [];
    return parsed.results
      .map(reviveResult)
      .filter((result): result is MicroTestResult => result !== null);
  } catch {
    return [];
  }
}

function persist(userId: string, results: MicroTestResult[]): void {
  try {
    const serializable: StoredResult[] = results.map((result) => ({
      microTestId: result.microTestId,
      takenAt: result.takenAt.toISOString(),
      dimensionScores: result.dimensionScores,
    }));
    window.localStorage.setItem(storageKey(userId), JSON.stringify({ results: serializable }));
  } catch {
    // Storage full/blocked — the result simply won't persist across reloads.
  }
}

/**
 * Appends a completed micro-test result. Non-repeatable tests are de-duplicated
 * by keeping only the latest result per microTestId; the confirm-dominant and
 * recheck tests can accumulate, so callers pass `repeatable: true` for those.
 */
export function saveMicroTestResult(
  userId: string,
  result: MicroTestResult,
  options: { repeatable?: boolean } = {},
): MicroTestResult[] {
  const existing = loadMicroTestResults(userId);
  const next = options.repeatable
    ? [...existing, result]
    : [...existing.filter((entry) => entry.microTestId !== result.microTestId), result];
  persist(userId, next);
  return next;
}

export function getCompletedMicroTestIds(results: MicroTestResult[]): string[] {
  return Array.from(new Set(results.map((result) => result.microTestId)));
}
