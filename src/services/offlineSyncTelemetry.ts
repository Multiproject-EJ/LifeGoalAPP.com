type OfflineSyncFeature =
  | 'personality_test'
  | 'vision_board'
  | 'goals'
  | 'life_goals'
  | 'journal'
  | 'habits_v2'
  | 'habit_logs'
  | 'habit_reminders';

type OfflineSyncEventType =
  | 'queue_enqueued'
  | 'sync_started'
  | 'sync_succeeded'
  | 'sync_failed'
  | 'queue_cleared'
  | 'queue_retry_requested';

type OfflineSyncEvent = {
  id: string;
  at: string;
  feature: OfflineSyncFeature;
  event: OfflineSyncEventType;
  userId: string;
  pending?: number;
  failed?: number;
  attemptCount?: number;
  error?: string;
};

export type OfflineSyncTelemetryEvent = OfflineSyncEvent;
export type OfflineSyncTelemetrySummary = {
  feature: OfflineSyncFeature;
  total: number;
  failed: number;
  succeeded: number;
  queued: number;
  lastError: string | null;
  lastAt: string | null;
};

const STORAGE_KEY = 'lifegoal_offline_sync_telemetry_v1';
const MAX_EVENTS = 400;

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readTelemetryEvents(): OfflineSyncEvent[] {
  if (!canUseLocalStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OfflineSyncEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeTelemetryEvents(events: OfflineSyncEvent[]): void {
  if (!canUseLocalStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    // Ignore storage quota failures.
  }
}

export function recordOfflineSyncEvent(event: Omit<OfflineSyncEvent, 'id' | 'at'>): void {
  const next: OfflineSyncEvent = {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `telemetry-${Date.now()}`,
    at: new Date().toISOString(),
    ...event,
  };
  const events = readTelemetryEvents();
  events.push(next);
  writeTelemetryEvents(events);

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info('[offline-sync]', next.feature, next.event, {
      userId: next.userId,
      pending: next.pending,
      failed: next.failed,
      attemptCount: next.attemptCount,
      error: next.error,
    });
  }
}

export function getOfflineSyncTelemetry(limit = 100): OfflineSyncEvent[] {
  return readTelemetryEvents().slice(-Math.max(1, limit));
}

export function getOfflineSyncTelemetrySummary(limit = 400): OfflineSyncTelemetrySummary[] {
  const events = getOfflineSyncTelemetry(limit);
  const byFeature = new Map<OfflineSyncFeature, OfflineSyncTelemetrySummary>();
  for (const event of events) {
    const current =
      byFeature.get(event.feature) ??
      ({
        feature: event.feature,
        total: 0,
        failed: 0,
        succeeded: 0,
        queued: 0,
        lastError: null,
        lastAt: null,
      } satisfies OfflineSyncTelemetrySummary);
    current.total += 1;
    if (event.event === 'sync_failed') {
      current.failed += 1;
      current.lastError = event.error ?? current.lastError;
    }
    if (event.event === 'sync_succeeded') current.succeeded += 1;
    if (event.event === 'queue_enqueued') current.queued += 1;
    current.lastAt = event.at;
    byFeature.set(event.feature, current);
  }
  return Array.from(byFeature.values()).sort((a, b) => (b.lastAt ?? '').localeCompare(a.lastAt ?? ''));
}

export function clearOfflineSyncTelemetry(): void {
  if (!canUseLocalStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
