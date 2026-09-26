import { normalizeJourneyXp } from './combinedJourneyLevel';

// Display/progression checkpoint only, never an authorization ledger for grants.
// Contains one number per owner; no goals, answers or habit text are stored here.
const prefix = 'habitgame:journey:earned-xp:v1:';
const memory = new Map<string, number>();
const listeners = new Map<string, Set<() => void>>();

export function readEarnedJourneyXp(userId: string | null | undefined): number {
  if (!userId) return 0;
  let stored = 0;
  try { stored = normalizeJourneyXp(Number(window.localStorage.getItem(prefix + userId))); } catch { /* offline/private storage */ }
  return Math.max(stored, memory.get(userId) ?? 0);
}

export function recordEarnedJourneyXp(userId: string | null | undefined, xp: number): number {
  if (!userId) return 0;
  const previous = readEarnedJourneyXp(userId);
  const next = Math.max(previous, normalizeJourneyXp(xp));
  memory.set(userId, next);
  try { window.localStorage.setItem(prefix + userId, String(next)); } catch { /* retain in memory */ }
  if (next > previous) listeners.get(userId)?.forEach(listener => listener());
  return next;
}

export function subscribeEarnedJourneyXp(userId: string | null | undefined, listener: () => void): () => void {
  if (!userId) return () => {};
  const ownerListeners = listeners.get(userId) ?? new Set<() => void>();
  listeners.set(userId, ownerListeners);
  ownerListeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== prefix + userId) return;
    const next = readEarnedJourneyXp(userId);
    memory.set(userId, next);
    listener();
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    ownerListeners.delete(listener);
    if (ownerListeners.size === 0) listeners.delete(userId);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}
