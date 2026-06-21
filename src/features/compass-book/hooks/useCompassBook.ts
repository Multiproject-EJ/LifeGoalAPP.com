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
import { getChapterConfirmedOutput } from '../logic/projectors';
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
  /** Seal a chapter: run its projector, snapshot confirmed output, mark complete. */
  sealChapter: (chapterId: CompassBookChapterId) => Promise<void>;
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

  const persist = useCallback(
    async (next: CompassChapterState) => {
      setStates((prev) => ({ ...prev, [next.chapterId]: next }));
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
    [userId],
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

      const activitiesDef = getChapterActivities(chapterId);
      const completedActivityIds = activitiesDef
        .filter((activity) => isActivityComplete(activity, answers))
        .map((activity) => activity.id);

      let next: CompassChapterState = {
        ...base,
        status: base.status === 'complete' ? 'complete' : 'in_progress',
        answers,
        completedActivityIds,
      };

      // Explicit seal: when the player confirms the chapter's confirmation
      // activity, run the projector and snapshot the confirmed output. This is
      // the only path that completes a chapter — answering everything else does not.
      const sealActivity = activitiesDef.find((activity) =>
        activity.blocks.some((block) => block.type === 'confirmation'),
      );
      if (
        next.confirmedOutput == null &&
        sealActivity &&
        completedActivityIds.includes(sealActivity.id)
      ) {
        const output = getChapterConfirmedOutput(chapterId, answers);
        if (output != null) {
          next = {
            ...next,
            status: 'complete',
            confirmedOutput: output,
            confirmedAt: now,
          };
        }
      }

      await persist(next);
    },
    [states, userId, persist],
  );

  const sealChapter = useCallback(
    async (chapterId: CompassBookChapterId) => {
      const base = states[chapterId];
      if (!base) return;
      const output = getChapterConfirmedOutput(chapterId, base.answers);
      const next: CompassChapterState = {
        ...base,
        status: 'complete',
        confirmedOutput: output ?? base.confirmedOutput ?? {},
        confirmedAt: new Date().toISOString(),
      };
      await persist(next);
    },
    [states, persist],
  );

  return { ready, saving, getChapterState, getProgress, saveActivityAnswers, sealChapter };
}
