import type { Session } from '@supabase/supabase-js';
import type {
  CompassBookChapterId,
  CompassChapterState,
  CompassGetProgress,
} from '../types';
import { getChapterDefinition, getChapterActivities } from '../content/compassBookCurriculum';
import { chapterNumeral } from '../logic/reading';
import { CompassChapterGraphic } from './chapter-graphics/CompassChapterGraphic';
import { CompassGoalBridge } from './CompassGoalBridge';
import { CompassHabitBridge } from './CompassHabitBridge';

export type CompassChapterScreenProps = {
  chapterId: CompassBookChapterId;
  currentIslandNumber: number;
  session: Session | null;
  getProgress: CompassGetProgress;
  getChapterState: (chapterId: CompassBookChapterId) => CompassChapterState | null;
  onStartFlow: (activityId: string | undefined, returnFocusKey: string) => void;
  onBack: () => void;
  onClose: () => void;
};

/**
 * A chapter page: framing, the evolving graphic, a Begin/Continue button, and
 * the 20 island-linked fragments.
 *
 * A chapter the player has not sailed to yet is still fully browsable — it shows
 * what the chapter will give them and which island opens it. Reaching an island
 * gates *answering*, never looking, so this screen has no dead end.
 */
export function CompassChapterScreen({
  chapterId,
  currentIslandNumber,
  session,
  getProgress,
  getChapterState,
  onStartFlow,
  onBack,
  onClose,
}: CompassChapterScreenProps) {
  const chapter = getChapterDefinition(chapterId);
  const activities = getChapterActivities(chapterId);
  const progress = getProgress(chapterId, currentIslandNumber);
  const statusByActivityId = new Map(progress.activities.map((a) => [a.activityId, a.status]));
  const chapterState = getChapterState(chapterId);

  const hasUnlocked = progress.unlockedCount > 0;
  const hasProgress = progress.completedCount > 0;
  const islandsAway = Math.max(0, chapter.islandRange[0] - currentIslandNumber);

  return (
    <>
      <header className="compass-book__topbar">
        <button
          type="button"
          className="compass-book__back"
          onClick={onBack}
          aria-label="Back to the Reading"
        >
          <span aria-hidden="true">←</span> The Reading
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
          <p className="compass-book__chapter-eyebrow">
            <span className="compass-book__chapter-numeral">{chapterNumeral(chapter.order)}</span>
            {' · '}
            Islands {chapter.islandRange[0]}–{chapter.islandRange[1]}
          </p>
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

        {/* The graphic is shown even before the chapter opens — an empty plate
            the player can see waiting to be filled is the whole invitation. */}
        <div className={hasUnlocked ? undefined : 'compass-book__graphic--ahead'}>
          <CompassChapterGraphic
            chapterId={chapterId}
            answers={chapterState?.answers ?? []}
            mode="full"
          />
        </div>

        {progress.status === 'complete' ? (
          <p className="compass-book__note">
            ✓ This chapter is sealed. You can revisit any fragment to revise it.
          </p>
        ) : null}

        {chapterId === 'quest_forge' ? (
          <CompassGoalBridge answers={chapterState?.answers ?? []} session={session} />
        ) : null}

        {chapterId === 'personal_playbook' ? (
          <CompassHabitBridge answers={chapterState?.answers ?? []} session={session} />
        ) : null}

        {hasUnlocked ? (
          <button
            type="button"
            className="compass-book__primary compass-book__primary--block"
            data-compass-flow-trigger="chapter-primary"
            onClick={() => onStartFlow(progress.nextActivityId ?? undefined, 'chapter-primary')}
          >
            {hasProgress
              ? `Continue · ${progress.completedCount}/${progress.totalCount}`
              : 'Begin chapter'}
          </button>
        ) : (
          <section className="compass-book__ahead" aria-label="Not reached yet">
            <p className="compass-book__ahead-title">
              {islandsAway === 1 ? '1 island away' : `${islandsAway} islands away`}
            </p>
            <p className="compass-book__ahead-note">
              Reach Island {chapter.islandRange[0]} and this chapter starts filling in. Until then
              you can read what it holds — you just can’t write in it yet.
            </p>
          </section>
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
                  data-compass-flow-trigger={activity.id}
                  onClick={() => onStartFlow(activity.id, activity.id)}
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
