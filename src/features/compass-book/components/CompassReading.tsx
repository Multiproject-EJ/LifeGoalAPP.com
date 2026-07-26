import type {
  CompassBookChapterId,
  CompassChapterProgress,
  CompassChapterState,
  CompassGetProgress,
} from '../types';
import { summarizeCompassReading, type CompassReadingRow } from '../logic/reading';
import { CompassLiveQuests } from './CompassLiveQuests';

const STATUS_LABEL: Record<CompassReadingRow['status'], string> = {
  ahead: 'Not reached',
  blank: 'Open',
  charting: 'Charting',
  sealed: 'Sealed',
};

export type CompassReadingProps = {
  currentIslandNumber: number;
  getProgress: CompassGetProgress;
  getChapterState: (chapterId: CompassBookChapterId) => CompassChapterState | null;
  onOpenChapter: (chapterId: CompassBookChapterId) => void;
  /** Signed-in user id (or `local`), for the live-quest evidence strip. */
  userId: string;
};

/**
 * The Reading — the book's standing page.
 *
 * One compass reading of the player across all six chapters: what they have
 * written so far in their own words, and what each chapter they have not
 * reached will eventually tell them. Always open, owns no storage, writes
 * nothing. Rows for chapters the player has not reached are shown, not hidden —
 * seeing the empty slot is the point.
 *
 * An unwritten book is the common case, so the page has two voices: with
 * writing it reports ("What you know so far"), without it invites ("What this
 * book will tell you") and leads with the one thing worth pressing.
 */
export function CompassReading({
  currentIslandNumber,
  getProgress,
  getChapterState,
  onOpenChapter,
  userId,
}: CompassReadingProps) {
  const summary = summarizeCompassReading({
    getProgress: (chapterId: CompassBookChapterId): CompassChapterProgress =>
      getProgress(chapterId, currentIslandNumber),
    getChapterState,
  });

  const { fragmentsWritten, fragmentsOpen, fragmentsTotal, sealedCount, writtenRows } = summary;
  const pct = fragmentsTotal === 0 ? 0 : Math.round((fragmentsWritten / fragmentsTotal) * 100);
  const hasWriting = fragmentsWritten > 0;

  const focusRow = summary.rows.find((row) => row.chapterId === summary.focusChapterId) ?? null;
  // A sealed focus means the whole open book is finished — nothing to press.
  const cta = focusRow && focusRow.status !== 'sealed' ? focusRow : null;

  return (
    <div className="compass-book__scroll">
      <section className="compass-reading__hero" aria-label="The Reading">
        <span className="compass-reading__rose" aria-hidden="true">
          ✦
        </span>
        <h1 className="compass-reading__title">The Reading</h1>
        <p className="compass-reading__subtitle">
          {hasWriting ? 'Where you stand right now.' : 'A book that fills in as you play.'}
        </p>
      </section>

      {hasWriting ? (
        <>
          <section className="compass-reading__meters" aria-label="Book progress">
            <div className="compass-reading__meter">
              <span className="compass-reading__meter-value">{fragmentsWritten}</span>
              <span className="compass-reading__meter-label">of {fragmentsTotal} fragments</span>
            </div>
            <div className="compass-reading__meter">
              <span className="compass-reading__meter-value">{sealedCount}</span>
              <span className="compass-reading__meter-label">of 6 chapters sealed</span>
            </div>
            <div className="compass-reading__meter">
              <span className="compass-reading__meter-value">{currentIslandNumber}</span>
              <span className="compass-reading__meter-label">islands travelled</span>
            </div>
          </section>
          {pct > 0 ? (
            <div className="compass-book__bar compass-reading__bar">
              <span className="compass-book__bar-fill" style={{ width: `${pct}%` }} />
            </div>
          ) : null}
        </>
      ) : fragmentsOpen > 0 ? (
        // No zeros at zero: the motivating number is what is already waiting.
        <p className="compass-reading__waiting">
          Your travels have already unlocked{' '}
          <strong>
            {fragmentsOpen} of {fragmentsTotal}
          </strong>{' '}
          fragments. Every answer becomes a line on this page.
        </p>
      ) : (
        <p className="compass-reading__waiting">
          Set sail — each island you reach unlocks a fragment of this book.
        </p>
      )}

      {cta ? (
        <button
          type="button"
          className="compass-book__primary compass-book__primary--block compass-reading__cta"
          onClick={() => onOpenChapter(cta.chapterId)}
        >
          {cta.status === 'charting'
            ? `Continue Chapter ${cta.numeral} · ${cta.completedCount}/${cta.totalCount}`
            : `Begin Chapter ${cta.numeral} — ${cta.title}`}
        </button>
      ) : null}

      <h2 className="compass-book__contents-heading">
        {hasWriting ? 'What you know so far' : 'What this book will tell you'}
      </h2>
      <ul className="compass-reading__rows">
        {summary.rows.map((row) => {
          const isFocus = cta !== null && row.chapterId === cta.chapterId;
          return (
            <li key={row.chapterId}>
              <button
                type="button"
                className={`compass-reading__row compass-reading__row--${row.status} ${
                  isFocus ? 'compass-reading__row--focus' : ''
                }`}
                onClick={() => onOpenChapter(row.chapterId)}
                aria-label={`${row.title} — ${isFocus ? 'up next' : STATUS_LABEL[row.status]}`}
              >
                <span className="compass-reading__row-numeral" aria-hidden="true">
                  {row.numeral}
                </span>
                <span className="compass-reading__row-body">
                  <span className="compass-reading__row-label">{row.headlineLabel}</span>
                  {row.headline ? (
                    <span className="compass-reading__row-headline">“{row.headline}”</span>
                  ) : (
                    <span className="compass-reading__row-promise">{row.promise}</span>
                  )}
                  <span className="compass-reading__row-meta">
                    <span className="compass-book__count">{row.title}</span>
                    {row.status === 'ahead' ? (
                      <span className="compass-book__count">· Island {row.unlockIsland}</span>
                    ) : (
                      <span className="compass-book__count">
                        · {row.completedCount}/{row.totalCount}
                      </span>
                    )}
                  </span>
                </span>
                {/* One badge carries the invitation; the rest stay quiet. A
                    column of identical "Open" pills said nothing. */}
                {isFocus ? (
                  <span className="compass-book__badge compass-book__badge--focus">Up next</span>
                ) : row.status !== 'blank' ? (
                  <span className={`compass-book__badge compass-book__badge--${row.status}`}>
                    {STATUS_LABEL[row.status]}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Live evidence sits below the reading: what the book led to, not what
          the player has to read before they can start. */}
      <CompassLiveQuests userId={userId} />
    </div>
  );
}
