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

export function clearOfflineSyncTelemetry(): void {
  if (!canUseLocalStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
