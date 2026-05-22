const DAILY_LIFE_UPGRADE_SHOWN_PREFIX = 'lifegoal.daily-life-upgrade.shown:';

function getTodayLocalDateKey(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shownKey(userId: string): string {
  return `${DAILY_LIFE_UPGRADE_SHOWN_PREFIX}${userId}`;
}

export function hasShownDailyLifeUpgradeToday(userId: string, now: Date = new Date()): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(shownKey(userId)) === getTodayLocalDateKey(now);
}

export function markDailyLifeUpgradeShownToday(userId: string, now: Date = new Date()): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(shownKey(userId), getTodayLocalDateKey(now));
}

