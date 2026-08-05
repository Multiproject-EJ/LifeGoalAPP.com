import { COMPASS_BOOK_CHAPTERS } from '../content/compassBookCurriculum';
import type { CompassBookChapterId, CompassChapterProgress } from '../types';
import { chapterNumeral, type CompassBookPageId } from '../logic/reading';

export type CompassBookTabsProps = {
  activePageId: CompassBookPageId;
  currentIslandNumber: number;
  getProgress: (chapterId: CompassBookChapterId, currentIslandNumber: number) => CompassChapterProgress;
  onSelect: (pageId: CompassBookPageId) => void;
  /** Show the Quest Ledger tab below the chapters (only when the host wires it). */
  showQuestLedger?: boolean;
};

/**
 * The fore-edge tab rail: the Reading (✦) followed by chapters I–VI, and — when
 * the host app provides it — the Quest Ledger (⚑) at the bottom of the rail.
 *
 * Every tab is always reachable — turning to a page the player has not reached
 * in the game is allowed and shows that chapter's preview. Reaching an island is
 * what unlocks *answering*, never looking. Tabs carry a state dot so the rail
 * doubles as an at-a-glance progress spine.
 */
export function CompassBookTabs({
  activePageId,
  currentIslandNumber,
  getProgress,
  onSelect,
  showQuestLedger = false,
}: CompassBookTabsProps) {
  return (
    <nav className="compass-book__tabs" aria-label="Compass Book pages">
      <button
        type="button"
        className={`compass-book__tab compass-book__tab--reading ${
          activePageId === 'reading' ? 'compass-book__tab--active' : ''
        }`}
        onClick={() => onSelect('reading')}
        aria-current={activePageId === 'reading' ? 'page' : undefined}
        aria-label="The Reading — where you stand"
      >
        <span className="compass-book__tab-mark" aria-hidden="true">
          ✦
        </span>
      </button>

      {COMPASS_BOOK_CHAPTERS.map((chapter) => {
        const progress = getProgress(chapter.id, currentIslandNumber);
        const active = activePageId === chapter.id;
        const ahead = progress.unlockedCount === 0;
        const sealed = progress.status === 'complete';
        const className = [
          'compass-book__tab',
          `compass-book__tab--ch${chapter.order}`,
          active ? 'compass-book__tab--active' : '',
          ahead ? 'compass-book__tab--ahead' : '',
          sealed ? 'compass-book__tab--sealed' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <button
            key={chapter.id}
            type="button"
            className={className}
            onClick={() => onSelect(chapter.id)}
            aria-current={active ? 'page' : undefined}
            aria-label={`Chapter ${chapter.order} — ${chapter.title}${ahead ? ' (not reached yet)' : ''}`}
          >
            <span className="compass-book__tab-mark" aria-hidden="true">
              {chapterNumeral(chapter.order)}
            </span>
            {sealed ? (
              <span className="compass-book__tab-seal" aria-hidden="true">
                ✦
              </span>
            ) : null}
            {/* The ribbon marks the page you are on, the way a real bookmark
                hangs out of the chapter you left off in. */}
            {active ? <span className="compass-book__tab-ribbon" aria-hidden="true" /> : null}
          </button>
        );
      })}

      {showQuestLedger ? (
        <button
          type="button"
          className={`compass-book__tab compass-book__tab--ledger ${
            activePageId === 'quest_ledger' ? 'compass-book__tab--active' : ''
          }`}
          onClick={() => onSelect('quest_ledger')}
          aria-current={activePageId === 'quest_ledger' ? 'page' : undefined}
          aria-label="Quest Ledger — your quests, habits, and tools"
        >
          <span className="compass-book__tab-mark" aria-hidden="true">
            ⚑
          </span>
          {activePageId === 'quest_ledger' ? (
            <span className="compass-book__tab-ribbon" aria-hidden="true" />
          ) : null}
        </button>
      ) : null}
    </nav>
  );
}
