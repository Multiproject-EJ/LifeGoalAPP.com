/**
 * Living Horizon projector (Chapter 3). Pure, deterministic, AI-free.
 * Turns answers into the proposed Life Design Brief the player confirms at activity 60.
 */

import type { Json } from '../../../../lib/database.types';
import type { CompassAnswerRecord, CompassAnswerValue } from '../../types';

export type LivingHorizonOutput = {
  desiredRhythmId: string | null;
  essentialSceneId: string | null;
  environmentId: string | null;
  rootedMobileId: string | null;
  socialId: string | null;
  workModeId: string | null;
  challengeId: string | null;
  enoughId: string | null;
  timeFreedomId: string | null;
  antiVisionId: string | null;
  priceNotPaidId: string | null;
  relationshipIds: string[];
  horizonStatement: string | null;
};

function valueMap(answers: readonly CompassAnswerRecord[]): Map<string, CompassAnswerValue> {
  const map = new Map<string, CompassAnswerValue>();
  for (const answer of answers) map.set(answer.questionId, answer.value);
  return map;
}

function optionOf(map: Map<string, CompassAnswerValue>, questionId: string): string | null {
  const v = map.get(questionId);
  return v && (v.kind === 'choice' || v.kind === 'emotion') ? v.optionId : null;
}

function optionsOf(map: Map<string, CompassAnswerValue>, questionId: string): string[] {
  const v = map.get(questionId);
  return v && v.kind === 'multi_choice' ? v.optionIds : [];
}

function textOf(map: Map<string, CompassAnswerValue>, questionId: string): string | null {
  const v = map.get(questionId);
  return v && v.kind === 'text' && v.text.trim() ? v.text.trim() : null;
}

export function projectLivingHorizon(answers: readonly CompassAnswerRecord[]): LivingHorizonOutput {
  const map = valueMap(answers);
  return {
    desiredRhythmId: optionOf(map, 'rhythm'),
    essentialSceneId: optionOf(map, 'essential_scene'),
    environmentId: optionOf(map, 'environment'),
    rootedMobileId: optionOf(map, 'rooted_mobile'),
    socialId: optionOf(map, 'social_intensity'),
    workModeId: optionOf(map, 'work_mode'),
    challengeId: optionOf(map, 'challenge'),
    enoughId: optionOf(map, 'financial_enough'),
    timeFreedomId: optionOf(map, 'time_freedom'),
    antiVisionId: optionOf(map, 'anti_vision'),
    priceNotPaidId: optionOf(map, 'price_not_paid'),
    relationshipIds: optionsOf(map, 'relationships'),
    horizonStatement: textOf(map, 'horizon_statement'),
  };
}

export function livingHorizonOutputToJson(output: LivingHorizonOutput): Json {
  return output as unknown as Json;
}
