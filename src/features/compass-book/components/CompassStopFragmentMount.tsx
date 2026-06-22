/**
 * Self-contained mount for answering a Compass fragment at an Island Run stop.
 *
 * Owns its own persistence via `useCompassBook`, so the board only needs to drop
 * in `<CompassStopFragmentMount session islandNumber slot />`. Answering here is
 * OPTIONAL — this panel never gates stop completion; the host stop completes
 * through its own flow regardless of whether the fragment is answered. Writes
 * only to `compass_chapter_states` (+ local mirror); reads `islandNumber` only.
 */

import type { Session } from '@supabase/supabase-js';
import type { CompassAnswerValue } from '../types';
import { useCompassBook } from '../hooks/useCompassBook';
import { getIslandFragment, type IslandFragmentSlot } from '../logic/islandFragment';
import { CompassStopFragment } from './CompassStopFragment';

export type CompassStopFragmentMountProps = {
  session: Session | null;
  islandNumber: number;
  /** Which slice to present (Wisdom stop vs Habit overflow). Defaults to Wisdom. */
  slot?: IslandFragmentSlot;
};

export function CompassStopFragmentMount({
  session,
  islandNumber,
  slot = 'wisdom',
}: CompassStopFragmentMountProps) {
  const book = useCompassBook(session);
  const fragment = getIslandFragment(islandNumber);
  if (!fragment) return null;

  const state = book.getChapterState(fragment.chapterId);
  const savedValues: Record<string, CompassAnswerValue | undefined> = {};
  if (state) {
    for (const answer of state.answers) {
      if (answer.activityId === fragment.activityId) {
        savedValues[answer.questionId] = answer.value;
      }
    }
  }

  return (
    <CompassStopFragment
      islandNumber={islandNumber}
      slot={slot}
      userId={session?.user?.id ?? null}
      savedValues={savedValues}
      saving={book.saving}
      onSave={(activityId, entries) =>
        book.saveActivityAnswers(fragment.chapterId, activityId, entries)
      }
    />
  );
}
