/**
 * Island fragment model — the pure logic for answering a Compass activity
 * *in-game* at an Island Run stop, rather than only in the Player-Menu book.
 *
 * Each island maps to exactly one Compass activity. For in-game answering we
 * present only the activity's *answerable inputs* (review/confirmation blocks are
 * book-only sealing affordances), split into a small Wisdom-stop slice and a
 * Habit-stop "overflow" slice so no single stop gets heavy. Pure — no I/O, no
 * React.
 */

import type {
  CompassAnswerValue,
  CompassBlockDefinition,
  CompassBlockType,
  CompassBookActivityDefinition,
  CompassBookChapterId,
} from '../types';
import { getActivityForIsland } from '../content/compassBookCurriculum';
import { isAnswerValuePresent } from './progress';

/** Keep each Wisdom stop quick; the Habit stop absorbs any overflow. */
export const WISDOM_STOP_MAX_INPUTS = 2;

/**
 * Block types the player actually answers (and the renderer can render). Excludes
 * `review` and `confirmation` (book-only sealing) and any non-input type.
 */
const ANSWERABLE_BLOCK_TYPES: ReadonlySet<CompassBlockType> = new Set([
  'single_choice',
  'multi_choice',
  'scale',
  'emotion_choice',
  'short_text',
  'reflection',
  'sentence_completion',
]);

export type IslandFragmentSlot = 'wisdom' | 'habit_overflow';

export type IslandFragment = {
  islandNumber: number;
  activityId: string;
  chapterId: CompassBookChapterId;
  title: string;
  shortTitle: string;
  description?: string;
  /** All answerable inputs for the island, in authored order. */
  inputs: CompassBlockDefinition[];
  /** First ≤ {@link WISDOM_STOP_MAX_INPUTS} inputs — shown at the Wisdom stop. */
  wisdom: CompassBlockDefinition[];
  /** Remaining inputs — shown at the Habit stop when present. */
  habitOverflow: CompassBlockDefinition[];
};

/** Split an activity's blocks into the answerable Wisdom / Habit-overflow slices. */
export function splitIslandInputs(activity: CompassBookActivityDefinition): {
  inputs: CompassBlockDefinition[];
  wisdom: CompassBlockDefinition[];
  habitOverflow: CompassBlockDefinition[];
} {
  const inputs = activity.blocks.filter((block) => ANSWERABLE_BLOCK_TYPES.has(block.type));
  return {
    inputs,
    wisdom: inputs.slice(0, WISDOM_STOP_MAX_INPUTS),
    habitOverflow: inputs.slice(WISDOM_STOP_MAX_INPUTS),
  };
}

/** The fragment for an island, or null if the island has no authored activity. */
export function getIslandFragment(islandNumber: number): IslandFragment | null {
  const activity = getActivityForIsland(islandNumber);
  if (!activity) return null;
  const { inputs, wisdom, habitOverflow } = splitIslandInputs(activity);
  return {
    islandNumber,
    activityId: activity.id,
    chapterId: activity.chapterId,
    title: activity.title,
    shortTitle: activity.shortTitle,
    description: activity.description,
    inputs,
    wisdom,
    habitOverflow,
  };
}

/** The blocks shown at a given stop slot. */
export function fragmentSlotBlocks(
  fragment: IslandFragment,
  slot: IslandFragmentSlot,
): CompassBlockDefinition[] {
  return slot === 'wisdom' ? fragment.wisdom : fragment.habitOverflow;
}

/** True when every required block in a set of blocks has a usable value. */
export function areBlocksAnswered(
  blocks: readonly CompassBlockDefinition[],
  valueByQuestionId: Record<string, CompassAnswerValue | undefined>,
): boolean {
  return blocks
    .filter((block) => block.required)
    .every((block) => isAnswerValuePresent(valueByQuestionId[block.questionId]));
}

/** True when a specific stop slot's required inputs are all answered. */
export function isFragmentSlotComplete(
  fragment: IslandFragment,
  slot: IslandFragmentSlot,
  valueByQuestionId: Record<string, CompassAnswerValue | undefined>,
): boolean {
  return areBlocksAnswered(fragmentSlotBlocks(fragment, slot), valueByQuestionId);
}

/**
 * True when the whole island fragment is satisfied (all required inputs across
 * both slices answered). Gating predicate for "this stop's Compass fragment is
 * done". An island with no required inputs is trivially complete.
 */
export function isIslandFragmentComplete(
  islandNumber: number,
  valueByQuestionId: Record<string, CompassAnswerValue | undefined>,
): boolean {
  const fragment = getIslandFragment(islandNumber);
  if (!fragment) return true;
  return areBlocksAnswered(fragment.inputs, valueByQuestionId);
}
