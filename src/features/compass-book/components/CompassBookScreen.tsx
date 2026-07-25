import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import './compassBook.css';
import type { CompassBookChapterId } from '../types';
import { isChapterPage, type CompassBookPageId } from '../logic/reading';
import { useCompassBook } from '../hooks/useCompassBook';
import { CompassBookTabs } from './CompassBookTabs';
import { CompassReading } from './CompassReading';
import { CompassChapterScreen } from './CompassChapterScreen';
import { CompassGuidedFlow } from './CompassGuidedFlow';

export type CompassBookScreenProps = {
  /** Current Island Run island (read-only); drives which fragments are answerable. */
  currentIslandNumber: number;
  /** Active Supabase session (may be null in demo/local mode). */
  session: Session | null;
  /** Optional deep-link: open straight into a chapter (and a fragment). */
  initialChapterId?: CompassBookChapterId;
  initialActivityId?: string;
  onClose: () => void;
};

type CompassBookView =
  | { kind: 'page'; pageId: CompassBookPageId }
  | { kind: 'flow'; chapterId: CompassBookChapterId; startActivityId?: string };

/**
 * Full-screen Player Menu entry point for the Compass Book.
 *
 * The book is a set of seven pages — the Reading plus chapters I–VI — reachable
 * in any order from a persistent fore-edge tab rail. Turning to a page is always
 * allowed; the island you have reached decides only what you can *answer*.
 *
 * Reads Island position (a number only) and persists answers via
 * {@link useCompassBook}. Entirely separate from Quest Pulse and the legacy
 * Compass; never mutates Island Run state.
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
    if (initialChapterId) return { kind: 'page', pageId: initialChapterId };
    return { kind: 'page', pageId: 'reading' };
  });
  const book = useCompassBook(session);
  const userId = session?.user?.id ?? 'local';

  const openPage = useCallback(
    (pageId: CompassBookPageId) => setView({ kind: 'page', pageId }),
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
        // The flow steps back to its chapter; a chapter steps back to the
        // Reading; the Reading closes the book.
        if (current.kind === 'flow') return { kind: 'page', pageId: current.chapterId };
        if (current.pageId !== 'reading') return { kind: 'page', pageId: 'reading' };
        onClose();
        return current;
      });
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // The rail highlights the chapter a flow belongs to, so answering a fragment
  // never looks like it left the book.
  const activePageId: CompassBookPageId = view.kind === 'flow' ? view.chapterId : view.pageId;

  return (
    <div className="compass-book" role="dialog" aria-modal="true" aria-label="Compass Book">
      <div className="compass-book__backdrop" aria-hidden="true" onClick={onClose} />
      <div className="compass-book__sheet">
        <div className="compass-book__spread">
          <div className="compass-book__page">
            {view.kind === 'page' && view.pageId === 'reading' ? (
              <>
                <header className="compass-book__topbar">
                  <span className="compass-book__topbar-title">
                    <span aria-hidden="true">🧭</span> Compass Book
                  </span>
                  <span className="compass-book__topbar-spacer" />
                  <button
                    type="button"
                    className="compass-book__close"
                    onClick={onClose}
                    aria-label="Close Compass Book"
                  >
                    ✕
                  </button>
                </header>
                <CompassReading
                  currentIslandNumber={currentIslandNumber}
                  getProgress={book.getProgress}
                  getChapterState={book.getChapterState}
                  onOpenChapter={openPage}
                  userId={userId}
                />
              </>
            ) : null}

            {view.kind === 'page' && isChapterPage(view.pageId) ? (
              <CompassChapterScreen
                chapterId={view.pageId}
                currentIslandNumber={currentIslandNumber}
                session={session}
                getProgress={book.getProgress}
                getChapterState={book.getChapterState}
                onStartFlow={(activityId) =>
                  startFlow(view.pageId as CompassBookChapterId, activityId)
                }
                onBack={() => openPage('reading')}
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
                onExit={() => openPage(view.chapterId)}
              />
            ) : null}
          </div>

          <CompassBookTabs
            activePageId={activePageId}
            currentIslandNumber={currentIslandNumber}
            getProgress={book.getProgress}
            onSelect={openPage}
          />
        </div>
      </div>
    </div>
  );
}
