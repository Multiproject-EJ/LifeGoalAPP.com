import { COMPASS_BOOK_CHAPTERS } from '../content/compassBookCurriculum';
import type { CompassGetProgress } from './CompassBookContents';

export type CompassBookCoverProps = {
  currentIslandNumber: number;
  getProgress: CompassGetProgress;
};

/** The book's cover panel: title, promise, and an at-a-glance progress line. */
export function CompassBookCover({ currentIslandNumber, getProgress }: CompassBookCoverProps) {
  const availableChapters = COMPASS_BOOK_CHAPTERS.filter(
    (chapter) => getProgress(chapter.id, currentIslandNumber).status !== 'locked',
  ).length;
  const sealedChapters = COMPASS_BOOK_CHAPTERS.filter(
    (chapter) => getProgress(chapter.id, currentIslandNumber).status === 'complete',
  ).length;

  return (
    <section className="compass-book__cover" aria-label="Compass Book cover">
      <span className="compass-book__cover-rose" aria-hidden="true">
        ✦
      </span>
      <h1 className="compass-book__cover-title">The Compass Book</h1>
      <p className="compass-book__cover-subtitle">
        Six chapters that grow as you play — understand where your life is now, what guides you, and
        the directions worth testing.
      </p>
      <span className="compass-book__cover-progress">
        {sealedChapters > 0 ? `${sealedChapters} sealed · ` : ''}
        {availableChapters} of {COMPASS_BOOK_CHAPTERS.length} chapters unlocked
      </span>
    </section>
  );
}
