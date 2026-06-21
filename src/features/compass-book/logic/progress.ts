/**
 * Compass Book progress logic — pure derivation of activity/chapter progress
 * from curriculum definitions, persisted answers, and Island Run unlock state.
 *
 * Completion rules:
 *  - an activity is complete when every REQUIRED block has a confirmed answer
 *  - a chapter is complete only when its confirmedOutput snapshot exists
 *    (i.e. the player sealed it at activity 20) — completing all activities
 *    without confirmation leaves the chapter "in_progress"
 */

import {
  COMPASS_CHAPTER_STAGES,
  type CompassActivityProgress,
  type CompassActivityProgressStatus,
  type CompassAnswerRecord,
  type CompassAnswerValue,
  type CompassBookActivityDefinition,
  type CompassBookChapterId,
  type CompassChapterProgress,
  type CompassChapterState,
  type CompassChapterStatus,
} from '../types';
import { getChapterActivities } from '../content/compassBookCurriculum';
import { getUnlockedActivityCount, type IslandUnlockInput } from './unlock';

function answersByQuestion(
  activityId: string,
  answers: readonly CompassAnswerRecord[],
): Map<string, CompassAnswerRecord> {
  const map = new Map<string, CompassAnswerRecord>();
  for (const answer of answers) {
    if (answer.activityId === activityId) map.set(answer.questionId, answer);
  }
  return map;
}

/** True when every required block of the activity has a confirmed answer. */
export function isActivityComplete(
  activity: CompassBookActivityDefinition,
  answers: readonly CompassAnswerRecord[],
): boolean {
  const byQuestion = answersByQuestion(activity.id, answers);
  const requiredBlocks = activity.blocks.filter((block) => block.required);

  // An activity with no required blocks (only optional ones) is complete only
  // once the player has saved at least one confirmed answer — never vacuously.
  if (requiredBlocks.length === 0) {
    return answers.some(
      (answer) => answer.activityId === activity.id && answer.confirmed && hasValue(answer),
    );
  }

  return requiredBlocks.every((block) => {
    const answer = byQuestion.get(block.questionId);
    return Boolean(answer && answer.confirmed && hasValue(answer));
  });
}

/** True when the activity has at least one saved answer (confirmed or not). */
export function isActivityStarted(
  activityId: string,
  answers: readonly CompassAnswerRecord[],
): boolean {
  return answers.some((answer) => answer.activityId === activityId);
}

/** True when a raw answer value carries a usable response. */
export function isAnswerValuePresent(value: CompassAnswerValue | undefined): boolean {
  if (!value) return false;
  switch (value.kind) {
    case 'choice':
    case 'emotion':
      return Boolean(value.optionId);
    case 'multi_choice':
      return value.optionIds.length > 0;
    case 'ranking':
      return value.orderedOptionIds.length > 0;
    case 'scale':
      return Number.isFinite(value.value);
    case 'text':
      return value.text.trim().length > 0;
    case 'confirmation':
      return value.confirmed === true;
    default:
      return false;
  }
}

/**
 * True when every required block of an activity has a usable value. Used by the
 * guided flow to gate "Save & continue" — kept here so UI and tests share logic.
 */
export function areRequiredBlocksAnswered(
  activity: CompassBookActivityDefinition,
  valueByQuestionId: Record<string, CompassAnswerValue | undefined>,
): boolean {
  return activity.blocks
    .filter((block) => block.required)
    .every((block) => isAnswerValuePresent(valueByQuestionId[block.questionId]));
}

function hasValue(answer: CompassAnswerRecord): boolean {
  return isAnswerValuePresent(answer.value);
}

function activityStatus(
  activity: CompassBookActivityDefinition,
  state: CompassChapterState | null,
  unlockedCount: number,
): CompassActivityProgressStatus {
  const answers = state?.answers ?? [];
  if (state?.completedActivityIds.includes(activity.id) || isActivityComplete(activity, answers)) {
    return 'complete';
  }
  if (activity.islandNumber > unlockedCount) return 'locked';
  if (!isActivityStarted(activity.id, answers)) return 'unlocked';
  // Started but not complete: distinguish "answered" (all required have a value
  // but not yet confirmed) from "started".
  const byQuestion = answersByQuestion(activity.id, answers);
  const allRequiredHaveValue = activity.blocks
    .filter((block) => block.required)
    .every((block) => {
      const answer = byQuestion.get(block.questionId);
      return Boolean(answer && hasValue(answer));
    });
  return allRequiredHaveValue ? 'answered' : 'started';
}

function stageForOrder(order: number): number {
  const stage = COMPASS_CHAPTER_STAGES.find(
    (s) => order >= s.orderRange[0] && order <= s.orderRange[1],
  );
  return stage?.index ?? 1;
}

export function computeChapterProgress(
  chapterId: CompassBookChapterId,
  state: CompassChapterState | null,
  unlock: IslandUnlockInput,
): CompassChapterProgress {
  const activities = getChapterActivities(chapterId);
  const unlockedCount = getUnlockedActivityCount(unlock);

  const activityProgress: CompassActivityProgress[] = activities.map((activity) => ({
    activityId: activity.id,
    islandNumber: activity.islandNumber,
    order: activity.order,
    status: activityStatus(activity, state, unlockedCount),
  }));

  const unlockedInChapter = activityProgress.filter((a) => a.status !== 'locked').length;
  const completedInChapter = activityProgress.filter((a) => a.status === 'complete').length;
  const totalCount = activities.length;

  const stageReached = activityProgress
    .filter((a) => a.status === 'complete')
    .reduce((max, a) => Math.max(max, stageForOrder(a.order)), 0);

  const next = activityProgress.find(
    (a) => a.status !== 'locked' && a.status !== 'complete',
  );

  const status = deriveChapterStatus(state, unlockedInChapter, completedInChapter);

  return {
    chapterId,
    status,
    totalCount,
    unlockedCount: unlockedInChapter,
    completedCount: completedInChapter,
    completionRate: totalCount === 0 ? 0 : completedInChapter / totalCount,
    stageReached,
    nextActivityId: next?.activityId ?? null,
    activities: activityProgress,
  };
}

function deriveChapterStatus(
  state: CompassChapterState | null,
  unlockedInChapter: number,
  completedInChapter: number,
): CompassChapterStatus {
  // A chapter is complete ONLY when its confirmed output snapshot exists.
  if (state?.confirmedOutput != null) return 'complete';
  if (completedInChapter > 0 || (state?.answers.length ?? 0) > 0) return 'in_progress';
  if (unlockedInChapter > 0) return 'unlocked';
  return 'locked';
}
