/**
 * Chapter projector registry. Maps a chapter id to the pure function that turns
 * its answers into the confirmed-output JSON snapshot stored on seal. Only
 * Chapter 1 (Living Wheel) is implemented; later chapters register here in their
 * own PRs. Returns null when a chapter has no projector yet.
 */

import type { Json } from '../../../../lib/database.types';
import type { CompassAnswerRecord, CompassBookChapterId } from '../../types';
import { projectLivingWheel, livingWheelOutputToJson } from './livingWheelProjector';
import { projectInnerCompass, innerCompassOutputToJson } from './innerCompassProjector';
import { projectLivingHorizon, livingHorizonOutputToJson } from './livingHorizonProjector';

export type ChapterProjector = (answers: readonly CompassAnswerRecord[]) => Json;

const PROJECTORS: Partial<Record<CompassBookChapterId, ChapterProjector>> = {
  living_wheel: (answers) => livingWheelOutputToJson(projectLivingWheel(answers)),
  inner_compass: (answers) => innerCompassOutputToJson(projectInnerCompass(answers)),
  living_horizon: (answers) => livingHorizonOutputToJson(projectLivingHorizon(answers)),
};

export function getChapterConfirmedOutput(
  chapterId: CompassBookChapterId,
  answers: readonly CompassAnswerRecord[],
): Json | null {
  const projector = PROJECTORS[chapterId];
  return projector ? projector(answers) : null;
}

export * from './livingWheelProjector';
export * from './innerCompassProjector';
export * from './livingHorizonProjector';
