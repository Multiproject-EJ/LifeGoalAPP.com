import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import './compassBook.css';
import type { CompassAnswerRecord, CompassBookChapterId } from '../types';
import { getActivityDefinition, getChapterDefinition } from '../content/compassBookCurriculum';
import { getCurrentChapterId } from '../logic/unlock';
import { projectLivingWheel } from '../logic/projectors/livingWheelProjector';
import { useCompassBook } from '../hooks/useCompassBook';
import { CompassChapterGraphic } from './chapter-graphics/CompassChapterGraphic';
import { CompassBookScreen } from './CompassBookScreen';

export type CompactGameCompassPanelProps = {
  /** Read-only Island Run position; never written. */
  currentIslandNumber: number;
  session: Session | null;
  onClose: () => void;
};

/**
 * In-game Compass — the compact current-chapter window opened from the Island
 * Run board's compass button. Shows the evolving chapter graphic, completion,
 * latest insight, and the next fragment, plus a door into the full book. It
 * reads Island position only and never mutates Island Run state. Distinct from
 * the legacy 11-phase Compass and from Quest Pulse.
 */
export function CompactGameCompassPanel({
  currentIslandNumber,
  session,
  onClose,
}: CompactGameCompassPanelProps) {
  const book = useCompassBook(session);
  const [fullBook, setFullBook] = useState<{
    chapterId: CompassBookChapterId;
    activityId?: string;
  } | null>(null);

  const chapterId = getCurrentChapterId({ currentIslandNumber });
  const chapter = getChapterDefinition(chapterId);
  const progress = book.getProgress(chapterId, currentIslandNumber);
  const state = book.getChapterState(chapterId);
  const answers = state?.answers ?? [];

  if (fullBook) {
    return (
      <CompassBookScreen
        currentIslandNumber={currentIslandNumber}
        session={session}
        initialChapterId={fullBook.chapterId}
        initialActivityId={fullBook.activityId}
        onClose={onClose}
      />
    );
  }

  const nextActivity = progress.nextActivityId
    ? getActivityDefinition(progress.nextActivityId)
    : null;
  const insight = deriveInsight(chapterId, answers);

  return (
    <div
      className="compass-ingame"
      role="dialog"
      aria-modal="true"
      aria-label="Compass Book — current chapter"
    >
      <div className="compass-ingame__backdrop" aria-hidden="true" onClick={onClose} />
      <div className="compass-ingame__card">
        <header className="compass-ingame__header">
          <span className="compass-ingame__eyebrow">Chapter {chapter.order}</span>
          <span className="compass-ingame__title">{chapter.title}</span>
          <button
            type="button"
            className="compass-book__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <CompassChapterGraphic chapterId={chapterId} answers={answers} mode="compact" />

        <div className="compass-ingame__progress">
          <span className="compass-book__count">
            {progress.completedCount} / {progress.totalCount} fragments
          </span>
          <span className="compass-book__stages" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((stage) => (
              <span
                key={stage}
                className={`compass-book__stage-dot ${
                  stage <= progress.stageReached ? 'compass-book__stage-dot--on' : ''
                }`}
              />
            ))}
          </span>
        </div>

        {insight ? <p className="compass-ingame__insight">✦ {insight}</p> : null}

        {nextActivity ? (
          <p className="compass-ingame__next">
            Next: <strong>{nextActivity.title}</strong>
            <span className="compass-ingame__next-island"> · Island {nextActivity.islandNumber}</span>
          </p>
        ) : (
          <p className="compass-ingame__next">
            {progress.status === 'complete' ? 'This chapter is sealed.' : 'All unlocked fragments done.'}
          </p>
        )}

        <div className="compass-ingame__actions">
          {nextActivity ? (
            <button
              type="button"
              className="compass-book__primary"
              onClick={() => setFullBook({ chapterId, activityId: nextActivity.id })}
            >
              Continue
            </button>
          ) : null}
          <button
            type="button"
            className="compass-book__secondary"
            onClick={() => setFullBook({ chapterId })}
          >
            Open full book
          </button>
        </div>
      </div>
    </div>
  );
}

/** A short, chapter-appropriate "latest insight" line, or null. */
function deriveInsight(
  chapterId: CompassBookChapterId,
  answers: readonly CompassAnswerRecord[],
): string | null {
  if (chapterId !== 'living_wheel') return null;
  const out = projectLivingWheel(answers);
  if (out.season) return `Season: ${out.season}`;
  if (out.engineAreaId) return 'Your Engine is taking shape';
  return null;
}
