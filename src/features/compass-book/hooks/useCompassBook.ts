/**
 * useCompassBook — loads and persists Compass Book chapter state.
 *
 * Strategy:
 *  - read the canonical Supabase tables when a real session is available,
 *  - always mirror to a localStorage cache for instant resume / demo mode,
 *  - keep chapter states in React state and recompute progress on demand.
 *
 * The hook never reads or writes Island Run state, goals, habits, or the legacy
 * Compass. Island position is passed in as a plain number.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  COMPASS_CURRICULUM_VERSION,
  type CompassAnswerValue,
  type CompassBookChapterId,
  type CompassChapterProgress,
  type CompassChapterState,
} from '../types';
import { getChapterActivities } from '../content/compassBookCurriculum';
import { computeChapterProgress, isActivityComplete } from '../logic/progress';
import {
  emptyChapterState,
  upsertAnswer,
} from '../services/compassBookSerialization';
import {
  ensureCompassBook,
  fetchChapterStates,
  saveChapterState,
} from '../services/compassBookService';
import {
  loadLocalChapterStates,
  saveLocalChapterState,
} from '../services/compassBookLocalStore';

export type CompassAnswerEntry = {
  questionId: string;
  value: CompassAnswerValue;
  confirmed?: boolean;
};

type ChapterStates = Partial<Record<CompassBookChapterId, CompassChapterState>>;

export type UseCompassBook = {
  ready: boolean;
  saving: boolean;
  getChapterState: (chapterId: CompassBookChapterId) => CompassChapterState | null;
  getProgress: (chapterId: CompassBookChapterId, currentIslandNumber: number) => CompassChapterProgress;
  saveActivityAnswers: (
    chapterId: CompassBookChapterId,
    activityId: string,
    entries: CompassAnswerEntry[],
  ) => Promise<void>;
};

export function useCompassBook(session: Session | null): UseCompassBook {
  const userId = session?.user?.id ?? 'local';
  const [states, setStates] = useState<ChapterStates>(() => loadLocalChapterStates(userId));
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const bookIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Seed immediately from the local cache so the UI is never blank.
    setStates(loadLocalChapterStates(userId));
    setReady(false);

    void (async () => {
      const book = await ensureCompassBook(userId);
      if (cancelled) return;
      bookIdRef.current = book?.id ?? null;
      if (book) {
        const remote = await fetchChapterStates(userId, book.id);
        if (cancelled) return;
        if (Object.keys(remote).length > 0) {
          setStates((local) => ({ ...local, ...remote }));
        }
      }
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const getChapterState = useCallback(
    (chapterId: CompassBookChapterId) => states[chapterId] ?? null,
    [states],
  );

  const getProgress = useCallback(
    (chapterId: CompassBookChapterId, currentIslandNumber: number) =>
      computeChapterProgress(chapterId, states[chapterId] ?? null, { currentIslandNumber }),
    [states],
  );

  const saveActivityAnswers = useCallback(
    async (chapterId: CompassBookChapterId, activityId: string, entries: CompassAnswerEntry[]) => {
      const now = new Date().toISOString();
      const base = states[chapterId] ?? emptyChapterState(chapterId);

      let answers = base.answers;
      for (const entry of entries) {
        answers = upsertAnswer(answers, {
          activityId,
          questionId: entry.questionId,
          value: entry.value,
          sourceMode: 'fixed_guided',
          curriculumVersion: COMPASS_CURRICULUM_VERSION,
          answeredAt: now,
          updatedAt: now,
          confirmed: entry.confirmed ?? true,
        });
      }

      const completedActivityIds = getChapterActivities(chapterId)
        .filter((activity) => isActivityComplete(activity, answers))
        .map((activity) => activity.id);

      const next: CompassChapterState = {
        ...base,
        status: base.status === 'complete' ? 'complete' : 'in_progress',
        answers,
        completedActivityIds,
      };

      setStates((prev) => ({ ...prev, [chapterId]: next }));
      saveLocalChapterState(userId, next);

      const bookId = bookIdRef.current;
      if (bookId) {
        setSaving(true);
        try {
          await saveChapterState(userId, bookId, next);
        } finally {
          setSaving(false);
        }
      }
    },
    [states, userId],
  );

  return { ready, saving, getChapterState, getProgress, saveActivityAnswers };
}
