// Hook to check if daily spin is available for the user

import { useState, useEffect, useCallback } from 'react';
import { checkSpinAvailable } from '../services/dailySpins';
import type { SpinAvailability } from '../features/spin-wheel/types';

interface UseDailySpinStatusResult {
  spinAvailable: boolean;
  loading: boolean;
  lastSpinDate: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to check if user can spin today
 * Automatically refreshes at midnight
 * Listens for spin completion events
 */
export function useDailySpinStatus(userId: string | undefined): UseDailySpinStatusResult {
  const [availability, setAvailability] = useState<SpinAvailability | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAvailability = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await checkSpinAvailable(userId);

    if (error) {
      console.error('Failed to check spin availability:', error);
      setLoading(false);
      return;
    }

    setAvailability(data);
    setLoading(false);
  }, [userId]);

  // Initial load
  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  // Listen for spin completion events
  useEffect(() => {
    const handleSpinComplete = () => {
      checkAvailability();
    };

    window.addEventListener('dailySpinComplete', handleSpinComplete);

    return () => {
      window.removeEventListener('dailySpinComplete', handleSpinComplete);
    };
  }, [checkAvailability]);

  // Auto-refresh at midnight
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    const timeoutId = setTimeout(() => {
      checkAvailability();

      // Set up daily interval after first midnight refresh
      const intervalId = setInterval(() => {
        checkAvailability();
      }, 24 * 60 * 60 * 1000); // 24 hours

      // Clean up interval when component unmounts
      return () => clearInterval(intervalId);
    }, msUntilMidnight);

    return () => clearTimeout(timeoutId);
  }, [checkAvailability]);

  return {
    spinAvailable: availability?.available ?? false,
    loading,
    lastSpinDate: availability?.lastSpinDate ?? null,
    refresh: checkAvailability,
  };
}
