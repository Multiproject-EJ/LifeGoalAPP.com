export type TimerSourceType =
  | 'general'
  | 'habit'
  | 'goal'
  | 'journal'
  | 'meditation'
  | 'project'
  | 'vision';

export type TimerSessionStatus = 'idle' | 'running' | 'paused' | 'completed';

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

const STORAGE_KEY = 'lifegoal_timer_session_v1';

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
