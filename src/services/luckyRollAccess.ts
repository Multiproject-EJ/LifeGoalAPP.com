export interface LuckyRollAccessState {
  earnedRuns: number;
  monthlyFreeClaimedMonthKey: string | null;
  updatedAt: string;
}

export interface LuckyRollAvailability {
  available: boolean;
  earnedRuns: number;
  monthlyFreeWindowActive: boolean;
  monthlyFreeAvailable: boolean;
  activeSource: 'earned' | 'monthly_free' | null;
  monthlyWindowEndsAtMs: number | null;
}

const STORAGE_KEY = 'gol_lucky_roll_access';
const ACCESS_EVENT = 'luckyRollAccessChanged';
const MONTHLY_FREE_WINDOW_DAYS = 3;

const safeLocalStorage =
  typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;

function getStorageKey(userId: string): string {
  return `${STORAGE_KEY}_${userId}`;
}

function getCurrentUtcMonthKey(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function getMonthlyWindowEndsAtMs(now = new Date()): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), MONTHLY_FREE_WINDOW_DAYS + 1, 0, 0, 0, 0);
}

function getDefaultState(): LuckyRollAccessState {
  return {
    earnedRuns: 0,
    monthlyFreeClaimedMonthKey: null,
    updatedAt: new Date().toISOString(),
  };
}

function dispatchLuckyRollAccessChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(ACCESS_EVENT));
}

export function loadLuckyRollAccessState(userId: string): LuckyRollAccessState {
  if (!safeLocalStorage) return getDefaultState();

  try {
    const raw = safeLocalStorage.getItem(getStorageKey(userId));
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw) as Partial<LuckyRollAccessState>;
    return {
      earnedRuns: Math.max(0, Math.floor(parsed.earnedRuns ?? 0)),
      monthlyFreeClaimedMonthKey:
        typeof parsed.monthlyFreeClaimedMonthKey === 'string' ? parsed.monthlyFreeClaimedMonthKey : null,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch (error) {
    console.warn('Failed to load Lucky Roll access state:', error);
    return getDefaultState();
  }
}

export function saveLuckyRollAccessState(userId: string, state: LuckyRollAccessState): LuckyRollAccessState {
  const normalized: LuckyRollAccessState = {
    earnedRuns: Math.max(0, Math.floor(state.earnedRuns)),
    monthlyFreeClaimedMonthKey: state.monthlyFreeClaimedMonthKey ?? null,
    updatedAt: state.updatedAt ?? new Date().toISOString(),
  };

  if (!safeLocalStorage) return normalized;

  try {
    safeLocalStorage.setItem(getStorageKey(userId), JSON.stringify(normalized));
  } catch (error) {
    console.warn('Failed to save Lucky Roll access state:', error);
  }

  return normalized;
}

export function getLuckyRollAvailability(userId: string, now = new Date()): LuckyRollAvailability {
  const state = loadLuckyRollAccessState(userId);
  const monthKey = getCurrentUtcMonthKey(now);
  const monthlyFreeWindowActive = now.getUTCDate() <= MONTHLY_FREE_WINDOW_DAYS;
  const monthlyFreeAvailable =
    monthlyFreeWindowActive && state.monthlyFreeClaimedMonthKey !== monthKey;
  const earnedRuns = state.earnedRuns;
  const activeSource: LuckyRollAvailability['activeSource'] = monthlyFreeAvailable
    ? 'monthly_free'
    : earnedRuns > 0
      ? 'earned'
      : null;

  return {
    available: activeSource !== null,
    earnedRuns,
    monthlyFreeWindowActive,
    monthlyFreeAvailable,
    activeSource,
    monthlyWindowEndsAtMs: monthlyFreeWindowActive ? getMonthlyWindowEndsAtMs(now) : null,
  };
}

export function awardLuckyRollRuns(userId: string, earnedRuns = 1): LuckyRollAccessState {
  const current = loadLuckyRollAccessState(userId);
  const next = saveLuckyRollAccessState(userId, {
    ...current,
    earnedRuns: current.earnedRuns + Math.max(0, Math.floor(earnedRuns)),
    updatedAt: new Date().toISOString(),
  });
  dispatchLuckyRollAccessChanged();
  return next;
}

export function consumeLuckyRollAccess(userId: string, now = new Date()): { success: boolean; source: LuckyRollAvailability['activeSource'] } {
  const availability = getLuckyRollAvailability(userId, now);
  if (!availability.available || !availability.activeSource) {
    return { success: false, source: null };
  }

  const current = loadLuckyRollAccessState(userId);
  if (availability.activeSource === 'monthly_free') {
    saveLuckyRollAccessState(userId, {
      ...current,
      monthlyFreeClaimedMonthKey: getCurrentUtcMonthKey(now),
      updatedAt: now.toISOString(),
    });
  } else {
    saveLuckyRollAccessState(userId, {
      ...current,
      earnedRuns: Math.max(0, current.earnedRuns - 1),
      updatedAt: now.toISOString(),
    });
  }

  dispatchLuckyRollAccessChanged();
  return { success: true, source: availability.activeSource };
}

export function getLuckyRollAccessEventName(): string {
  return ACCESS_EVENT;
}
