import { useEffect, useMemo, useState } from 'react';
import {
  COMPASS_CURRICULUM_VERSION,
  type CompassAnswerRecord,
  type CompassAnswerValue,
  type CompassBookActivityDefinition,
  type CompassBookChapterId,
  type CompassChapterState,
} from '../types';
import { getChapterActivities, getChapterDefinition } from '../content/compassBookCurriculum';
import { getUnlockedActivityCount } from '../logic/unlock';
import { areRequiredBlocksAnswered } from '../logic/progress';
import { CompassActivityRenderer } from './CompassActivityRenderer';
import { CompassAIHelper } from './CompassAIHelper';
import { CompassPlayerPicker } from './CompassPlayerPicker';
import { CompassChapterGraphic } from './chapter-graphics/CompassChapterGraphic';
import { isCompassAiAvailable } from '../services/compassAi';
import { loadCompassPlayerData } from '../services/compassPlayerData';
import {
  EMPTY_COMPASS_PLAYER_DATA,
  optionsForPickSource,
  pickSourceNoun,
  type CompassPlayerData,
} from '../logic/playerOptions';
import type { CompassAnswerEntry } from '../hooks/useCompassBook';

/** Block types the "Help me think" affordance can assist with. */
const AI_HELP_BLOCK_TYPES = new Set([
  'single_choice',
  'multi_choice',
  'emotion_choice',
  'short_text',
  'reflection',
  'sentence_completion',
]);

/** Merge saved chapter answers with the in-progress draft so the seal-step
 * graphic previews live edits (the projector reads questionId → value). */
function buildPreviewAnswers(
  state: CompassChapterState | null,
  activity: CompassBookActivityDefinition,
  draft: Record<string, CompassAnswerValue | undefined>,
): CompassAnswerRecord[] {
  const now = new Date(0).toISOString();
  const draftAnswers: CompassAnswerRecord[] = [];
  for (const block of activity.blocks) {
    const value = draft[block.questionId];
    if (value) {
      draftAnswers.push({
        activityId: activity.id,
        questionId: block.questionId,
        value,
        sourceMode: 'fixed_guided',
        curriculumVersion: COMPASS_CURRICULUM_VERSION,
        answeredAt: now,
        updatedAt: now,
        confirmed: false,
      });
    }
  }
  return [...(state?.answers ?? []), ...draftAnswers];
}

export type CompassGuidedFlowProps = {
  chapterId: CompassBookChapterId;
  currentIslandNumber: number;
  /** Signed-in user id, used to load the player's real goals/habits for pickers. */
  userId?: string | null;
  startActivityId?: string;
  getChapterState: (chapterId: CompassBookChapterId) => CompassChapterState | null;
  onSaveActivity: (
    chapterId: CompassBookChapterId,
    activityId: string,
    entries: CompassAnswerEntry[],
  ) => Promise<void>;
  saving: boolean;
  onExit: () => void;
};

type DraftValues = Record<string, CompassAnswerValue | undefined>;

function savedValuesFor(
  state: CompassChapterState | null,
  activityId: string,
): DraftValues {
  const draft: DraftValues = {};
  if (!state) return draft;
  for (const answer of state.answers) {
    if (answer.activityId === activityId) draft[answer.questionId] = answer.value;
  }
  return draft;
}

export function CompassGuidedFlow({
  chapterId,
  currentIslandNumber,
  userId,
  startActivityId,
  getChapterState,
  onSaveActivity,
  saving,
  onExit,
}: CompassGuidedFlowProps) {
  const chapter = getChapterDefinition(chapterId);
  const unlockedCount = getUnlockedActivityCount({ currentIslandNumber });

  const unlockedActivities = useMemo(
    () =>
      getChapterActivities(chapterId).filter(
        (activity) => activity.islandNumber <= unlockedCount,
      ),
    [chapterId, unlockedCount],
  );

  const initialIndex = useMemo(() => {
    if (startActivityId) {
      const idx = unlockedActivities.findIndex((a) => a.id === startActivityId);
      if (idx >= 0) return idx;
    }
    return 0;
  }, [startActivityId, unlockedActivities]);

  const [index, setIndex] = useState(initialIndex);
  const activity = unlockedActivities[index];
  const [draft, setDraft] = useState<DraftValues>(() =>
    savedValuesFor(getChapterState(chapterId), activity?.id ?? ''),
  );

  // Re-seed the draft from saved answers whenever the active activity changes.
  useEffect(() => {
    if (!activity) return;
    setDraft(savedValuesFor(getChapterState(chapterId), activity.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity?.id]);

  // Load the player's real goals/habits once, for the tap-to-fill pickers.
  const [playerData, setPlayerData] = useState<CompassPlayerData>(EMPTY_COMPASS_PLAYER_DATA);
  useEffect(() => {
    let cancelled = false;
    loadCompassPlayerData(userId)
      .then((data) => {
        if (!cancelled) setPlayerData(data);
      })
      .catch(() => {
        /* Pickers degrade to plain text on failure. */
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!activity) {
    return (
      <div className="compass-book__scroll">
        <p className="compass-book__note">No fragments are unlocked in this chapter yet.</p>
        <button type="button" className="compass-book__primary" onClick={onExit}>
          Back to chapter
        </button>
      </div>
    );
  }

  const requiredSatisfied = areRequiredBlocksAnswered(activity, draft);

  const isLast = index === unlockedActivities.length - 1;
  const isSealActivity = activity.blocks.some((block) => block.type === 'confirmation');

  async function handleSave() {
    const entries: CompassAnswerEntry[] = [];
    for (const block of activity.blocks) {
      const value = draft[block.questionId];
      if (value) entries.push({ questionId: block.questionId, value, confirmed: true });
    }

    await onSaveActivity(chapterId, activity.id, entries);

    if (isLast) {
      onExit();
    } else {
      setIndex((i) => Math.min(i + 1, unlockedActivities.length - 1));
    }
  }

  function handleChange(questionId: string, value: CompassAnswerValue | undefined) {
    setDraft((prev) => ({ ...prev, [questionId]: value }));
  }

  return (
    <>
      <header className="compass-book__topbar">
        <button
          type="button"
          className="compass-book__back"
          onClick={onExit}
          aria-label="Exit to chapter"
        >
          <span aria-hidden="true">←</span> Chapter
        </button>
        <span className="compass-book__topbar-spacer" />
        <span className="compass-book__count">
          {index + 1} / {unlockedActivities.length}
        </span>
      </header>
      <div className="compass-book__scroll">
        <p className="compass-book__chapter-eyebrow">
          {chapter.title} · Island {activity.islandNumber} · Stage {activity.stage}
        </p>
        <h2 className="compass-book__activity-heading">{activity.title}</h2>
        {activity.description ? (
          <p className="compass-book__card-question">{activity.description}</p>
        ) : null}

        {isSealActivity ? (
          <CompassChapterGraphic
            chapterId={chapterId}
            answers={buildPreviewAnswers(getChapterState(chapterId), activity, draft)}
            mode="full"
          />
        ) : null}

        <CompassActivityRenderer
          blocks={activity.blocks}
          values={draft}
          onChange={handleChange}
          renderPick={(block) => {
            if (!block.pickFrom) return null;
            const options = optionsForPickSource(playerData, block.pickFrom);
            if (options.length === 0) return null;
            const refKind = block.pickFrom === 'player_goals' ? 'goal' : 'habit';
            return (
              <CompassPlayerPicker
                options={options}
                sourceNoun={pickSourceNoun(block.pickFrom)}
                onPick={(option) =>
                  handleChange(block.questionId, {
                    kind: 'text',
                    text: option.label,
                    sourceRef: { kind: refKind, id: option.id },
                  })
                }
              />
            );
          }}
          renderHelp={
            isCompassAiAvailable()
              ? (block) =>
                  AI_HELP_BLOCK_TYPES.has(block.type) ? (
                    <CompassAIHelper
                      chapterId={chapterId}
                      block={block}
                      currentText={
                        draft[block.questionId]?.kind === 'text'
                          ? (draft[block.questionId] as { kind: 'text'; text: string }).text
                          : undefined
                      }
                      onApply={(value) => handleChange(block.questionId, value)}
                    />
                  ) : null
              : undefined
          }
        />

        <div className="compass-book__flow-actions">
          {index > 0 ? (
            <button
              type="button"
              className="compass-book__secondary"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
            >
              Previous
            </button>
          ) : null}
          <button
            type="button"
            className="compass-book__primary"
            disabled={!requiredSatisfied || saving}
            onClick={handleSave}
          >
            {saving ? 'Saving…' : isLast ? 'Save & finish' : 'Save & continue'}
          </button>
        </div>
      </div>
    </>
  );
}
