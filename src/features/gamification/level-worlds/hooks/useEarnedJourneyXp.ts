import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { normalizeJourneyXp } from '../services/combinedJourneyLevel';
import { readEarnedJourneyXp, recordEarnedJourneyXp, subscribeEarnedJourneyXp } from '../services/earnedJourneyXp';

export function useEarnedJourneyXp(userId: string | null, milestoneXp: number, persistedXp: number): number {
  const subscribe = useCallback((listener: () => void) => subscribeEarnedJourneyXp(userId, listener), [userId]);
  const snapshot = useCallback(() => readEarnedJourneyXp(userId), [userId]);
  const savedXp = useSyncExternalStore(subscribe, snapshot, () => 0);
  const xp = Math.max(savedXp, normalizeJourneyXp(milestoneXp), normalizeJourneyXp(persistedXp));
  useEffect(() => { recordEarnedJourneyXp(userId, xp); }, [userId, xp]);
  return userId ? xp : 0;
}
