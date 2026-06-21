import type { CompassBookChapterId } from '../types';
import { COMPASS_BOOK_CHAPTERS } from '../content/compassBookCurriculum';
import { computeChapterProgress } from '../logic/progress';
import { getCurrentChapterId } from '../logic/unlock';
import { CompassBookCover } from './CompassBookCover';
import { CompassChapterCard } from './CompassChapterCard';

export type CompassBookContentsProps = {
  currentIslandNumber: number;
  onClose: () => void;
  onOpenChapter: (chapterId: CompassBookChapterId) => void;
};

/** The book's table of contents: cover + six chapter cards. */
export function CompassBookContents({
  currentIslandNumber,
  onClose,
  onOpenChapter,
}: CompassBookContentsProps) {
  const currentChapterId = getCurrentChapterId({ currentIslandNumber });

  return (
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
      <div className="compass-book__scroll">
        <CompassBookCover currentIslandNumber={currentIslandNumber} />
        <h2 className="compass-book__contents-heading">Chapters</h2>
        <ul className="compass-book__chapter-list">
          {COMPASS_BOOK_CHAPTERS.map((chapter) => {
            const progress = computeChapterProgress(chapter.id, null, { currentIslandNumber });
            return (
              <li key={chapter.id}>
                <CompassChapterCard
                  chapter={chapter}
                  progress={progress}
                  isCurrent={chapter.id === currentChapterId}
                  onOpen={() => onOpenChapter(chapter.id)}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
