export type TimerSourceType =
  | 'general'
  | 'habit'
  | 'goal'
  | 'journal'
  | 'meditation'
  | 'project'
  | 'vision';

export type TimerSessionStatus = 'idle' | 'running' | 'paused' | 'completed';
export type TimerLauncherState = 'idle' | 'active' | 'alert';

export type TimerSessionState = {
  status: TimerSessionStatus;
  durationSeconds: number;
  remainingSeconds: number;
  startedAt: number | null;
  endsAt: number | null;
  pausedAt: number | null;
  label: string;
  sourceType: TimerSourceType;
  sourceId: string | null;
  sourceName: string | null;
  completedAt: number | null;
  rewarded: boolean;
};

export type TimerLaunchContext = {
  sourceType: TimerSourceType;
  sourceId?: string | null;
  sourceName?: string | null;
};

export type TimerSourceAnalytics = {
  sourceType: TimerSourceType;
  totalSeconds: number;
  completedSessions: number;
  updatedAt: number;
};

export type TimerTelemetryEventType =
  | 'launch_context_applied'
  | 'timer_started'
  | 'timer_paused'
  | 'timer_resumed'
  | 'timer_reset'
  | 'timer_completed'
  | 'timer_acknowledged'
  | 'preset_saved'
  | 'preset_removed'
  | 'theme_changed'
  | 'completion_profile_changed'
  | 'session_plan_started'
  | 'session_plan_paused'
  | 'session_plan_resumed'
  | 'session_plan_reset'
  | 'session_plan_completed'
  | 'session_plan_template_applied'
  | 'session_plan_custom_template_saved'
  | 'session_plan_custom_template_deleted'
  | 'session_plan_history_cleared';

export type TimerTelemetryEvent = {
  type: TimerTelemetryEventType;
  sourceType: TimerSourceType;
  durationSeconds: number;
  timestamp: number;
  metadata?: Record<string, string | number | boolean | null>;
};

const STORAGE_KEY = 'lifegoal_timer_session_v1';
const ANALYTICS_STORAGE_KEY = 'lifegoal_timer_source_analytics_v1';
const TELEMETRY_STORAGE_KEY = 'lifegoal_timer_telemetry_v1';
const TELEMETRY_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const TELEMETRY_MAX_EVENTS = 200;

export const DEFAULT_TIMER_SESSION: TimerSessionState = {
  status: 'idle',
  durationSeconds: 25 * 60,
  remainingSeconds: 25 * 60,
  startedAt: null,
  endsAt: null,
  pausedAt: null,
  label: '',
  sourceType: 'general',
  sourceId: null,
  sourceName: null,
  completedAt: null,
  rewarded: false,
};

export function readTimerSession(): TimerSessionState {
  if (typeof window === 'undefined') return DEFAULT_TIMER_SESSION;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return DEFAULT_TIMER_SESSION;

  try {
    const parsed = JSON.parse(stored) as Partial<TimerSessionState>;
    return {
      ...DEFAULT_TIMER_SESSION,
      ...parsed,
    };
  } catch {
    return DEFAULT_TIMER_SESSION;
  }
}

export function writeTimerSession(session: TimerSessionState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function deriveRunningRemainingSeconds(session: TimerSessionState, nowMs = Date.now()): number {
  if (session.status !== 'running' || !session.endsAt) {
    return session.remainingSeconds;
  }

  const seconds = Math.ceil((session.endsAt - nowMs) / 1000);
  return Math.max(seconds, 0);
}

const STALE_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function deriveTimerLauncherState(session: TimerSessionState): TimerLauncherState {
  if (session.status === 'completed') {
    return 'alert';
  }
  if (session.status === 'running' || session.status === 'paused') {
    return 'active';
  }
  return 'idle';
}

export function normalizeTimerSession(session: TimerSessionState, nowMs = Date.now()): TimerSessionState {
  const referenceTime = session.completedAt ?? session.endsAt ?? session.startedAt;
  if (!referenceTime || nowMs - referenceTime <= STALE_SESSION_MAX_AGE_MS) {
    return session;
  }
  return DEFAULT_TIMER_SESSION;
}

export function readTimerSourceAnalytics(): TimerSourceAnalytics[] {
  if (typeof window === 'undefined') return [];

  const raw = window.localStorage.getItem(ANALYTICS_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as TimerSourceAnalytics[];
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is TimerSourceAnalytics =>
        Boolean(
          item &&
            typeof item.sourceType === 'string' &&
            typeof item.totalSeconds === 'number' &&
            typeof item.completedSessions === 'number' &&
            typeof item.updatedAt === 'number',
        ),
    );
  } catch {
    return [];
  }
}

export function writeTimerSourceAnalytics(analytics: TimerSourceAnalytics[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(analytics));
}

export function recordTimerSourceAnalytics(sourceType: TimerSourceType, durationSeconds: number): TimerSourceAnalytics[] {
  const safeSeconds = Math.max(0, Math.floor(durationSeconds));
  if (safeSeconds <= 0) {
    return readTimerSourceAnalytics();
  }

  const existing = readTimerSourceAnalytics();
  const now = Date.now();
  const updated = existing.some((item) => item.sourceType === sourceType)
    ? existing.map((item) => {
        if (item.sourceType !== sourceType) return item;
        return {
          ...item,
          totalSeconds: item.totalSeconds + safeSeconds,
          completedSessions: item.completedSessions + 1,
          updatedAt: now,
        };
      })
    : [
        ...existing,
        {
          sourceType,
          totalSeconds: safeSeconds,
          completedSessions: 1,
          updatedAt: now,
        },
      ];

  writeTimerSourceAnalytics(updated);
  return updated;
}

export function readTimerTelemetryEvents(): TimerTelemetryEvent[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(TELEMETRY_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as TimerTelemetryEvent[];
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (event): event is TimerTelemetryEvent =>
        Boolean(
          event &&
            typeof event.type === 'string' &&
            typeof event.sourceType === 'string' &&
            typeof event.durationSeconds === 'number' &&
            typeof event.timestamp === 'number',
        ),
    );
  } catch {
    return [];
  }
}

export function writeTimerTelemetryEvents(events: TimerTelemetryEvent[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(events));
}

export function recordTimerTelemetryEvent(event: Omit<TimerTelemetryEvent, 'timestamp'>): TimerTelemetryEvent[] {
  const now = Date.now();
  const validAfter = now - TELEMETRY_RETENTION_MS;
  const existing = readTimerTelemetryEvents().filter((item) => item.timestamp >= validAfter);
  const nextEvent: TimerTelemetryEvent = {
    ...event,
    durationSeconds: Math.max(0, Math.floor(event.durationSeconds)),
    timestamp: now,
  };
  const updated = [...existing, nextEvent].slice(-TELEMETRY_MAX_EVENTS);
  writeTimerTelemetryEvents(updated);
  return updated;
}
