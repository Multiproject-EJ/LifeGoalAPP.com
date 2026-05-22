const enabledKey = (userId: string) => `lifegoal.daily-life-upgrade.enabled:${userId}`;

export function getDailyLifeUpgradeEnabled(userId: string): boolean {
  if (typeof window === 'undefined') return true;
  const stored = window.localStorage.getItem(enabledKey(userId));
  if (stored === null) return true;
  try {
    return Boolean(JSON.parse(stored));
  } catch {
    return true;
  }
}

export function setDailyLifeUpgradeEnabled(userId: string, enabled: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(enabledKey(userId), JSON.stringify(enabled));
}
