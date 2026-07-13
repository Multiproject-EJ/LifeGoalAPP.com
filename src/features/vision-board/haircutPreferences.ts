export type HaircutPreferences = {
  intervalDays: number;
  lastHaircutDate: string; // ISO date (yyyy-mm-dd)
  styleKey: string;
  bestLength: string;
  needsHaircut: boolean;
};

const STORAGE_PREFIX = 'lifegoal:vision-board:haircut:';

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

/**
 * Load persisted haircut widget preferences for a user. Returns a partial so
 * callers can merge over their defaults; missing/corrupt data yields null.
 */
export function loadHaircutPreferences(userId: string): Partial<HaircutPreferences> | null {
  if (typeof window === 'undefined' || !userId) return null;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') {
      return parsed as Partial<HaircutPreferences>;
    }
    return null;
  } catch {
    return null;
  }
}

/** Persist haircut widget preferences. Write failures are swallowed. */
export function saveHaircutPreferences(userId: string, prefs: HaircutPreferences): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
  } catch {
    // Ignore quota / private-mode write errors.
  }
}
