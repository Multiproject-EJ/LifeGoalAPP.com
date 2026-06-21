import type { CompassBookChapterId } from '../types';
import { getChapterDefinition, getChapterActivities } from '../content/compassBookCurriculum';
import type { CompassGetProgress } from './CompassBookContents';

export type CompassChapterScreenProps = {
  chapterId: CompassBookChapterId;
  currentIslandNumber: number;
  getProgress: CompassGetProgress;
  onStartFlow: (activityId?: string) => void;
  onBack: () => void;
  onClose: () => void;
};

/**
 * Chapter detail: chapter framing, a Begin/Continue button, and the 20
 * island-linked fragments with their locked/available/done state. Tapping an
 * available fragment opens the guided flow at that fragment.
 */
export function CompassChapterScreen({
  chapterId,
  currentIslandNumber,
  getProgress,
  onStartFlow,
  onBack,
  onClose,
}: CompassChapterScreenProps) {
  const chapter = getChapterDefinition(chapterId);
  const activities = getChapterActivities(chapterId);
  const progress = getProgress(chapterId, currentIslandNumber);
  const statusByActivityId = new Map(progress.activities.map((a) => [a.activityId, a.status]));

  const hasUnlocked = progress.unlockedCount > 0;
  const hasProgress = progress.completedCount > 0;

  return (
    <>
      <header className="compass-book__topbar">
        <button type="button" className="compass-book__back" onClick={onBack} aria-label="Back to contents">
          <span aria-hidden="true">←</span> Contents
        </button>
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
        <section className="compass-book__chapter-hero">
          <p className="compass-book__chapter-eyebrow">Chapter {chapter.order}</p>
          <h1 className="compass-book__chapter-title">{chapter.title}</h1>
          {chapter.subtitle ? (
            <p className="compass-book__card-subtitle">{chapter.subtitle}</p>
          ) : null}
          <p className="compass-book__chapter-question">{chapter.coreQuestion}</p>
          <div className="compass-book__chips">
            {chapter.outputFields.map((field) => (
              <span key={field} className="compass-book__chip">
                {field}
              </span>
            ))}
          </div>
        </section>

        {hasUnlocked ? (
          <button
            type="button"
            className="compass-book__primary compass-book__primary--block"
            onClick={() => onStartFlow(progress.nextActivityId ?? undefined)}
          >
            {hasProgress
              ? `Continue · ${progress.completedCount}/${progress.totalCount}`
              : 'Begin chapter'}
          </button>
        ) : (
          <p className="compass-book__note">
            Reach Island {chapter.islandRange[0]} to unlock the first fragment of this chapter.
          </p>
        )}

        <ul className="compass-book__activity-list">
          {activities.map((activity) => {
            const status = statusByActivityId.get(activity.id) ?? 'locked';
            const locked = status === 'locked';
            const done = status === 'complete';
            return (
              <li key={activity.id}>
                <button
                  type="button"
                  className={`compass-book__activity ${locked ? 'compass-book__activity--locked' : ''}`}
                  disabled={locked}
                  onClick={() => onStartFlow(activity.id)}
                  aria-label={`${activity.title} — ${locked ? 'locked' : done ? 'done' : 'available'}`}
                >
                  <span className="compass-book__activity-order" aria-hidden="true">
                    {locked ? '🔒' : done ? '✓' : activity.order}
                  </span>
                  <span>
                    <span className="compass-book__activity-title">{activity.title}</span>
                    <span className="compass-book__activity-island">Island {activity.islandNumber}</span>
                  </span>
                  <span
                    className={`compass-book__badge compass-book__badge--${
                      locked ? 'locked' : done ? 'complete' : 'unlocked'
                    }`}
                  >
                    {locked ? 'Locked' : done ? 'Done' : 'Open'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
