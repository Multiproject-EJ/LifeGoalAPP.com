import { useEffect, useState } from 'react';
import type { PlayerState } from './microTestTriggers';
import { getCompletedMicroTestIds, loadMicroTestResults } from './microTestStore';
import { loadPersonalityTestHistory } from '../../../data/personalityTestRepo';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Builds the real PlayerState for micro-test triggers: whether a foundation
 * test exists, how long ago it was taken, and which micro-tests are done.
 * Offline-first and defensive — any failure degrades to "no foundation test".
 */
export function useMicroTestPlayerState(
  userId: string | null,
  level: number,
  currentStreakDays: number,
): PlayerState {
  const [foundation, setFoundation] = useState<{ taken: boolean; days: number }>({
    taken: false,
    days: 0,
  });
  const [completedMicroTests, setCompletedMicroTests] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) {
      setFoundation({ taken: false, days: 0 });
      setCompletedMicroTests([]);
      return;
    }

    let cancelled = false;

    setCompletedMicroTests(getCompletedMicroTestIds(loadMicroTestResults(userId)));

    loadPersonalityTestHistory(userId)
      .then((history) => {
        if (cancelled) return;
        const latest = history[0];
        if (!latest) {
          setFoundation({ taken: false, days: 0 });
          return;
        }
        const takenAt = new Date(latest.taken_at).getTime();
        const days = Number.isNaN(takenAt)
          ? 0
          : Math.max(0, Math.floor((Date.now() - takenAt) / MS_PER_DAY));
        setFoundation({ taken: true, days });
      })
      .catch(() => {
        if (!cancelled) setFoundation({ taken: false, days: 0 });
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return {
    level,
    currentStreakDays,
    daysSinceFoundationTest: foundation.days,
    completedMicroTests,
    foundationTestTaken: foundation.taken,
  };
}
