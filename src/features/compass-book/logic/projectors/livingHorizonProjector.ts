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
  evidenceCount: number;
  confidenceId: string | null;
  counterevidence: string | null;
  reviewTriggerId: string | null;
  readingStatus: 'provisional' | 'evidence_backed';
};

const EVIDENCE_QUESTION_IDS = [
  'morning_evidence',
  'essential_scene_evidence',
  'rhythm_evidence',
  'evening_evidence',
  'environment_evidence',
  'rooted_tradeoff',
  'social_intensity_evidence',
  'relationships_evidence',
  'work_problems_evidence',
  'work_mode_evidence',
  'depth_variety_evidence',
  'work_enables_tradeoff',
  'responsibility_evidence',
  'challenge_evidence',
  'scale_mastery_tradeoff',
  'financial_enough_evidence',
  'time_proving_tradeoff',
  'anti_vision_evidence',
  'price_boundary_evidence',
] as const;

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
  const evidenceCount = EVIDENCE_QUESTION_IDS.reduce(
    (count, questionId) => count + (textOf(map, questionId) ? 1 : 0),
    0,
  );
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
    evidenceCount,
    confidenceId: optionOf(map, 'horizon_confidence'),
    counterevidence: textOf(map, 'horizon_counterevidence'),
    reviewTriggerId: optionOf(map, 'horizon_review_trigger'),
    readingStatus: evidenceCount >= 5 ? 'evidence_backed' : 'provisional',
  };
}

export function livingHorizonOutputToJson(output: LivingHorizonOutput): Json {
  return output as unknown as Json;
}
