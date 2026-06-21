import type { CompassBookChapterDefinition, CompassChapterProgress, CompassChapterStatus } from '../types';

const STATUS_LABEL: Record<CompassChapterStatus, string> = {
  locked: 'Locked',
  unlocked: 'Available',
  in_progress: 'In progress',
  complete: 'Sealed',
};

export type CompassChapterCardProps = {
  chapter: CompassBookChapterDefinition;
  progress: CompassChapterProgress;
  isCurrent: boolean;
  onOpen: () => void;
};

export function CompassChapterCard({ chapter, progress, isCurrent, onOpen }: CompassChapterCardProps) {
  const locked = progress.status === 'locked';
  const pct = Math.round(progress.completionRate * 100);
  const cardClass = [
    'compass-book__card',
    `compass-book__card--${progress.status}`,
    isCurrent && !locked ? 'compass-book__card--current' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={cardClass}
      onClick={onOpen}
      disabled={locked}
      aria-label={`${chapter.title} — ${STATUS_LABEL[progress.status]}`}
    >
      <span className="compass-book__card-num" aria-hidden="true">
        {locked ? '🔒' : chapter.order}
      </span>
      <span className="compass-book__card-body">
        <span className="compass-book__card-title">{chapter.title}</span>
        {chapter.subtitle ? (
          <span className="compass-book__card-subtitle">{chapter.subtitle}</span>
        ) : null}
        <span className="compass-book__card-question">{chapter.coreQuestion}</span>
        <span className="compass-book__card-meta">
          {locked ? (
            <span className="compass-book__count">Unlocks at Island {chapter.islandRange[0]}</span>
          ) : (
            <>
              <span className="compass-book__bar">
                <span className="compass-book__bar-fill" style={{ width: `${pct}%` }} />
              </span>
              <span className="compass-book__count">
                {progress.completedCount}/{progress.totalCount}
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
            </>
          )}
        </span>
      </span>
      <span className={`compass-book__badge compass-book__badge--${progress.status}`}>
        {isCurrent && !locked && progress.status !== 'complete' ? 'Current' : STATUS_LABEL[progress.status]}
      </span>
    </button>
  );
}
