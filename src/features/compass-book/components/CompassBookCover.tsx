import { COMPASS_BOOK_CHAPTERS } from '../content/compassBookCurriculum';
import { computeChapterProgress } from '../logic/progress';

export type CompassBookCoverProps = {
  currentIslandNumber: number;
};

/** The book's cover panel: title, promise, and an at-a-glance progress line. */
export function CompassBookCover({ currentIslandNumber }: CompassBookCoverProps) {
  const availableChapters = COMPASS_BOOK_CHAPTERS.filter(
    (chapter) =>
      computeChapterProgress(chapter.id, null, { currentIslandNumber }).status !== 'locked',
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
        {availableChapters} of {COMPASS_BOOK_CHAPTERS.length} chapters unlocked
      </span>
    </section>
  );
}
