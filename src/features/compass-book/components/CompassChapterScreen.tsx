import type { CompassBookChapterId } from '../types';
import { getChapterDefinition, getChapterActivities } from '../content/compassBookCurriculum';
import { computeChapterProgress } from '../logic/progress';

export type CompassChapterScreenProps = {
  chapterId: CompassBookChapterId;
  currentIslandNumber: number;
  onBack: () => void;
  onClose: () => void;
};

/**
 * Chapter detail (PR 2 shell): chapter framing + the 20 island-linked fragments
 * with their locked/available state. The guided answer flow and the evolving
 * one-page graphic arrive in PR 3 / PR 4.
 */
export function CompassChapterScreen({
  chapterId,
  currentIslandNumber,
  onBack,
  onClose,
}: CompassChapterScreenProps) {
  const chapter = getChapterDefinition(chapterId);
  const activities = getChapterActivities(chapterId);
  const progress = computeChapterProgress(chapterId, null, { currentIslandNumber });
  const statusByActivityId = new Map(progress.activities.map((a) => [a.activityId, a.status]));

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

        <p className="compass-book__note">
          {chapter.activities.every((a) => a.authored)
            ? 'Each island you reach unlocks the next fragment of this chapter. Guided answering and the evolving chapter graphic arrive in the next update.'
            : 'This chapter is being written. Its fragments unlock as you travel, and full guided content arrives in a later update.'}
        </p>

        <ul className="compass-book__activity-list">
          {activities.map((activity) => {
            const status = statusByActivityId.get(activity.id) ?? 'locked';
            const locked = status === 'locked';
            return (
              <li
                key={activity.id}
                className={`compass-book__activity ${locked ? 'compass-book__activity--locked' : ''}`}
              >
                <span className="compass-book__activity-order" aria-hidden="true">
                  {locked ? '🔒' : activity.order}
                </span>
                <span>
                  <p className="compass-book__activity-title">{activity.title}</p>
                  <span className="compass-book__activity-island">Island {activity.islandNumber}</span>
                </span>
                <span className={`compass-book__badge compass-book__badge--${status === 'locked' ? 'locked' : status === 'complete' ? 'complete' : 'unlocked'}`}>
                  {locked ? 'Locked' : status === 'complete' ? 'Done' : 'Available'}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
