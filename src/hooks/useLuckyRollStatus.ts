import { useCallback, useEffect, useState } from 'react';
import {
  getLuckyRollAccessEventName,
  getLuckyRollAvailability,
  type LuckyRollAvailability,
} from '../services/luckyRollAccess';

interface UseLuckyRollStatusResult extends LuckyRollAvailability {
  loading: boolean;
  refresh: () => void;
}

const EMPTY_STATUS: LuckyRollAvailability = {
  available: false,
  earnedRuns: 0,
  monthlyFreeWindowActive: false,
  monthlyFreeAvailable: false,
  activeSource: null,
  monthlyWindowEndsAtMs: null,
};

export function useLuckyRollStatus(userId: string | undefined): UseLuckyRollStatusResult {
  const [status, setStatus] = useState<LuckyRollAvailability>(EMPTY_STATUS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!userId) {
      setStatus(EMPTY_STATUS);
      setLoading(false);
      return;
    }

    setStatus(getLuckyRollAvailability(userId));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId || typeof window === 'undefined') return undefined;

    const handleRefresh = () => refresh();
    const accessEventName = getLuckyRollAccessEventName();

    window.addEventListener(accessEventName, handleRefresh);
    window.addEventListener('storage', handleRefresh);

    return () => {
      window.removeEventListener(accessEventName, handleRefresh);
      window.removeEventListener('storage', handleRefresh);
    };
  }, [refresh, userId]);

  useEffect(() => {
    if (!userId || typeof window === 'undefined') return undefined;

    const now = new Date();
    const nextRefreshAtMs = status.monthlyWindowEndsAtMs;
    if (!nextRefreshAtMs || nextRefreshAtMs <= now.getTime()) return undefined;

    const timeoutId = window.setTimeout(() => refresh(), nextRefreshAtMs - now.getTime() + 1000);
    return () => window.clearTimeout(timeoutId);
  }, [refresh, status.monthlyWindowEndsAtMs, userId]);

  return {
    ...status,
    loading,
    refresh,
  };
}
