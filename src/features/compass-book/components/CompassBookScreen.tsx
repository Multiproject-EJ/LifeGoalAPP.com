import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import './compassBook.css';
import type { CompassBookChapterId } from '../types';
import { useCompassBook } from '../hooks/useCompassBook';
import { CompassBookContents } from './CompassBookContents';
import { CompassChapterScreen } from './CompassChapterScreen';
import { CompassGuidedFlow } from './CompassGuidedFlow';

export type CompassBookScreenProps = {
  /** Current Island Run island (read-only); drives which fragments are unlocked. */
  currentIslandNumber: number;
  /** Active Supabase session (may be null in demo/local mode). */
  session: Session | null;
  /** Optional deep-link: open straight into a chapter (and a fragment). */
  initialChapterId?: CompassBookChapterId;
  initialActivityId?: string;
  onClose: () => void;
};

type CompassBookView =
  | { kind: 'contents' }
  | { kind: 'chapter'; chapterId: CompassBookChapterId }
  | { kind: 'flow'; chapterId: CompassBookChapterId; startActivityId?: string };

/**
 * Full-screen Player Menu entry point for the Compass Book.
 *
 * Owns navigation between the table of contents, a chapter detail, and the
 * fixed-guided answering flow. Reads Island position (number only) and persists
 * answers via {@link useCompassBook}. Entirely separate from Quest Pulse and the
 * legacy Compass; never mutates Island Run state.
 */
export function CompassBookScreen({
  currentIslandNumber,
  session,
  initialChapterId,
  initialActivityId,
  onClose,
}: CompassBookScreenProps) {
  const [view, setView] = useState<CompassBookView>(() => {
    if (initialChapterId && initialActivityId) {
      return { kind: 'flow', chapterId: initialChapterId, startActivityId: initialActivityId };
    }
    if (initialChapterId) return { kind: 'chapter', chapterId: initialChapterId };
    return { kind: 'contents' };
  });
  const book = useCompassBook(session);

  const backToContents = useCallback(() => setView({ kind: 'contents' }), []);
  const openChapter = useCallback(
    (chapterId: CompassBookChapterId) => setView({ kind: 'chapter', chapterId }),
    [],
  );
  const startFlow = useCallback(
    (chapterId: CompassBookChapterId, startActivityId?: string) =>
      setView({ kind: 'flow', chapterId, startActivityId }),
    [],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setView((current) => {
        if (current.kind === 'flow') return { kind: 'chapter', chapterId: current.chapterId };
        if (current.kind === 'chapter') return { kind: 'contents' };
        onClose();
        return current;
      });
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="compass-book" role="dialog" aria-modal="true" aria-label="Compass Book">
      <div className="compass-book__backdrop" aria-hidden="true" onClick={onClose} />
      <div className="compass-book__sheet">
        {view.kind === 'contents' ? (
          <CompassBookContents
            currentIslandNumber={currentIslandNumber}
            getProgress={book.getProgress}
            onClose={onClose}
            onOpenChapter={openChapter}
            userId={session?.user?.id ?? 'local'}
          />
        ) : null}
        {view.kind === 'chapter' ? (
          <CompassChapterScreen
            chapterId={view.chapterId}
            currentIslandNumber={currentIslandNumber}
            session={session}
            getProgress={book.getProgress}
            getChapterState={book.getChapterState}
            onStartFlow={(activityId) => startFlow(view.chapterId, activityId)}
            onBack={backToContents}
            onClose={onClose}
          />
        ) : null}
        {view.kind === 'flow' ? (
          <CompassGuidedFlow
            chapterId={view.chapterId}
            currentIslandNumber={currentIslandNumber}
            userId={session?.user?.id ?? null}
            startActivityId={view.startActivityId}
            getChapterState={book.getChapterState}
            onSaveActivity={book.saveActivityAnswers}
            saving={book.saving}
            onExit={() => setView({ kind: 'chapter', chapterId: view.chapterId })}
          />
        ) : null}
      </div>
    </div>
  );
}
