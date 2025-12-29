import { canUseSupabaseData } from '../lib/supabaseClient';

const recapEnabledKey = (userId: string) => `lifegoal.yesterday-recap.enabled:${userId}`;
const recapLastShownKey = (userId: string) => `lifegoal.yesterday-recap.last-shown:${userId}`;
const recapLastCollectedKey = (userId: string) => `lifegoal.yesterday-recap.last-collected:${userId}`;

const readBoolean = (value: string | null, fallback: boolean) => {
  if (value === null) return fallback;
  try {
    return JSON.parse(value) as boolean;
  } catch {
    return fallback;
  }
};

export function getYesterdayRecapEnabled(userId: string): boolean {
  if (typeof window === 'undefined') return true;

  const stored = window.localStorage.getItem(recapEnabledKey(userId));
  const fallback = true;

  // Demo or Supabase mode both use localStorage for now.
  if (!canUseSupabaseData()) {
    return readBoolean(stored, fallback);
  }

  return readBoolean(stored, fallback);
}

export function setYesterdayRecapEnabled(userId: string, enabled: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(recapEnabledKey(userId), JSON.stringify(enabled));
}

export function getYesterdayRecapLastShown(userId: string): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(recapLastShownKey(userId));
}

export function setYesterdayRecapLastShown(userId: string, dateISO: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(recapLastShownKey(userId), dateISO);
}

export function getYesterdayRecapLastCollected(userId: string): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(recapLastCollectedKey(userId));
}

export function setYesterdayRecapLastCollected(userId: string, dateISO: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(recapLastCollectedKey(userId), dateISO);
}
