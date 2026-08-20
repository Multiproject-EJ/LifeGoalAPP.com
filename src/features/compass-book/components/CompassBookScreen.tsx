import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import type { Session } from '@supabase/supabase-js';
import './compassBook.css';
import { lockPageScroll } from '../../../utils/scrollLock';
import type { CompassBookChapterId } from '../types';
import { isChapterPage, type CompassBookPageId } from '../logic/reading';
import { CompassQuestLedger, type CompassQuestLedgerEntry } from './CompassQuestLedger';
import {
  turnClassName,
  turnDirection,
  turnDistance,
  turnDurationMs,
} from '../logic/pageTurn';
import { useCompassBook } from '../hooks/useCompassBook';
import { CompassBookTabs } from './CompassBookTabs';
import { CompassBookCoverPlate } from './CompassBookCoverPlate';
import { CompassReading } from './CompassReading';
import { CompassChapterScreen } from './CompassChapterScreen';
import { CompassGuidedFlow } from './CompassGuidedFlow';

const CompassBookThreeShell = lazy(() =>
  import('./CompassBookThreeShell').then((module) => ({ default: module.CompassBookThreeShell })),
);

/** True when the player has asked the OS for less motion. */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export type CompassBookScreenProps = {
  /** Current Island Run island (read-only); drives which fragments are answerable. */
  currentIslandNumber: number;
  /** Active Supabase session (may be null in demo/local mode). */
  session: Session | null;
  /** Optional deep-link: open straight into a chapter (and a fragment). */
  initialChapterId?: CompassBookChapterId;
  initialActivityId?: string;
  /** Optional deep-link to any page, including the Quest Ledger. Wins over initialChapterId. */
  initialPageId?: CompassBookPageId;
  /**
   * Wires the Quest Ledger page (the old My Quest menu, re-inked). When absent
   * the ledger tab is hidden entirely — e.g. in previews that have no app
   * handlers to hand it.
   */
  questLedger?: {
    entries: CompassQuestLedgerEntry[];
    /** Write a habit or goal without leaving the book; omit to hide the action. */
    onInscribe?: () => void;
    hub?: ReactNode;
  };
  /**
   * True while something is stacked above the book (e.g. the Ledger's quick-add
   * sheet). Both layers listen for Escape on `window`, so without this one press
   * would dismiss the overlay *and* turn the book's page behind it. Escape
   * belongs to the topmost layer.
   */
  hasBlockingOverlay?: boolean;
  /**
   * Show the admin/dev demo toggle. Demo mode swaps in a fully written
   * in-memory book so the feature can be evaluated without answering 120
   * fragments. It never reads or writes real data — see `useCompassBook`.
   */
  allowDemo?: boolean;
  /** Start already in demo mode (used by the dev preview harness). */
  initialDemo?: boolean;
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
  initialPageId,
  questLedger,
  hasBlockingOverlay = false,
  allowDemo = false,
  initialDemo = false,
  onClose,
}: CompassBookScreenProps) {
  const [view, setView] = useState<CompassBookView>(() => {
    if (initialChapterId && initialActivityId) {
      return { kind: 'flow', chapterId: initialChapterId, startActivityId: initialActivityId };
    }
    if (initialPageId) return { kind: 'page', pageId: initialPageId };
    if (initialChapterId) return { kind: 'page', pageId: initialChapterId };
    return { kind: 'page', pageId: 'reading' };
  });
  const [demo, setDemo] = useState(allowDemo && initialDemo);
  const book = useCompassBook(session, { demo });
  const userId = session?.user?.id ?? 'local';

  // The cover only swings when the book is actually being opened. A deep link
  // straight to a fragment or a specific page skips it — the player asked for
  // that destination, not to browse.
  const [coverOpen, setCoverOpen] = useState(
    () => !initialActivityId && !initialPageId && !prefersReducedMotion(),
  );

  // Page-turn state. `turnKey` restarts the CSS animation on every turn, even
  // when the direction repeats.
  const [turn, setTurn] = useState<{ className: string | null; ms: number; key: number }>({
    className: null,
    ms: 0,
    key: 0,
  });
  const turnSeqRef = useRef(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    lastFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const releaseScroll = lockPageScroll(['body', 'documentElement']);
    const focusFrame = window.requestAnimationFrame(() => {
      const closeButton = dialogRef.current?.querySelector<HTMLElement>(
        '[aria-label="Close Compass Book"]',
      );
      (closeButton ?? dialogRef.current)?.focus();
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      releaseScroll();
      lastFocusedRef.current?.focus?.();
    };
  }, []);

  const openPage = useCallback((pageId: CompassBookPageId) => {
    setView((current) => {
      const from = current.kind === 'page' ? current.pageId : current.chapterId;
      const direction = turnDirection(from, pageId);
      if (direction !== 'none' && !prefersReducedMotion()) {
        turnSeqRef.current += 1;
        setTurn({
          className: turnClassName(direction),
          ms: turnDurationMs(turnDistance(from, pageId)),
          key: turnSeqRef.current,
        });
      }
      return { kind: 'page', pageId };
    });
  }, []);
  // A host that asks for a page while the book is *already* open must still be
  // obeyed — the mount-time initial state alone would silently ignore it (e.g.
  // opening the Quest Ledger from a screen behind an open book).
  const lastRequestedPageRef = useRef(initialPageId);
  useEffect(() => {
    if (!initialPageId || initialPageId === lastRequestedPageRef.current) {
      lastRequestedPageRef.current = initialPageId;
      return;
    }
    lastRequestedPageRef.current = initialPageId;
    openPage(initialPageId);
  }, [initialPageId, openPage]);

  const startFlow = useCallback(
    (chapterId: CompassBookChapterId, startActivityId?: string) =>
      setView({ kind: 'flow', chapterId, startActivityId }),
    [],
  );

  useEffect(() => {
    // Escape belongs to whatever is on top. While an overlay covers the book,
    // that overlay dismisses itself and the page underneath must not move.
    if (hasBlockingOverlay) return;
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
  }, [hasBlockingOverlay, onClose]);

  // The rail highlights the chapter a flow belongs to, so answering a fragment
  // never looks like it left the book.
  const activePageId: CompassBookPageId = view.kind === 'flow' ? view.chapterId : view.pageId;

  return createPortal(
    <div
      ref={dialogRef}
      className="compass-book"
      role="dialog"
      aria-modal="true"
      aria-label="Compass Book"
      tabIndex={-1}
    >
      <div className="compass-book__backdrop" aria-hidden="true" onClick={onClose} />
      <Suspense fallback={null}>
        <CompassBookThreeShell
          activePageId={activePageId}
          open={!coverOpen}
          turnKey={turn.key}
          turnMs={turn.ms}
          showQuestLedger={Boolean(questLedger)}
          onSelectPage={openPage}
          onBackgroundClick={onClose}
        />
      </Suspense>
      <div className="compass-book__sheet">
        {coverOpen ? <CompassBookCoverPlate onOpened={() => setCoverOpen(false)} /> : null}
        <div className="compass-book__spread">
          <div
            key={turn.key}
            className={`compass-book__page ${turn.className ?? ''}`}
            style={turn.ms ? ({ '--cbk-turn-ms': `${turn.ms}ms` } as CSSProperties) : undefined}
            // Animation events bubble: a child finishing its own animation must
            // not cut the page turn short, so only the page's own end counts.
            onAnimationEnd={(event) => {
              if (event.target !== event.currentTarget) return;
              setTurn((t) => ({ ...t, className: null, ms: 0 }));
            }}
          >
            {view.kind === 'page' && view.pageId === 'reading' ? (
              <>
                <header className="compass-book__topbar">
                  <span className="compass-book__topbar-title">
                    <span aria-hidden="true">🧭</span> Compass Book
                  </span>
                  <span className="compass-book__topbar-spacer" />
                  {allowDemo ? (
                    <button
                      type="button"
                      className={`compass-book__demo-toggle ${
                        demo ? 'compass-book__demo-toggle--on' : ''
                      }`}
                      onClick={() => setDemo((on) => !on)}
                      aria-pressed={demo}
                      title="Admin preview: fill the book with sample answers. Nothing is saved."
                    >
                      {demo ? 'Demo on' : 'Demo'}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="compass-book__close"
                    onClick={onClose}
                    aria-label="Close Compass Book"
                  >
                    ✕
                  </button>
                </header>
                {demo ? (
                  <p className="compass-book__demo-banner" role="status">
                    Demo data — sample answers for preview. Nothing here is saved to your account.
                  </p>
                ) : null}
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

            {view.kind === 'page' && view.pageId === 'quest_ledger' && questLedger ? (
              <CompassQuestLedger
                entries={questLedger.entries}
                onInscribe={questLedger.onInscribe}
                hub={questLedger.hub}
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
            showQuestLedger={Boolean(questLedger)}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
