/**
 * Inner Compass projector (Chapter 2). Pure, deterministic, AI-free.
 * Turns answers into proposed outputs the player confirms at activity 40.
 */

import type { Json } from '../../../../lib/database.types';
import type { CompassAnswerRecord, CompassAnswerValue } from '../../types';

export type InnerCompassOutput = {
  /** North */
  trueNorthValueId: string | null;
  coreValueIds: string[];
  /** East */
  lifeSparkId: string | null;
  /** South */
  essentialNeedId: string | null;
  neglectedNeedId: string | null;
  /** West */
  shadowPullId: string | null;
  driftCauseId: string | null;
  naturalStrengthId: string | null;
  counterbalanceId: string | null;
  guardianBoundary: string | null;
  compassStatement: string | null;
  /** Additive v2 method metadata; canonical v1 fields above stay unchanged. */
  evidenceCount: number;
  confidenceId: string | null;
  counterevidence: string | null;
  reviewTriggerId: string | null;
  readingStatus: 'provisional' | 'evidence_backed';
};

const EVIDENCE_QUESTION_IDS = [
  'alive_evidence',
  'proud_evidence',
  'unlike_trigger',
  'seeking_evidence',
  'protected_tradeoff',
  'core_values_tradeoff',
  'core_values_counterevidence',
  'behavioral_evidence',
  'functioning_evidence',
  'growth_evidence',
  'early_need_signal',
  'strength_evidence',
  'overuse_sequence',
  'shadow_loop',
  'counterbalance_evidence',
  'alignment_evidence',
  'drift_episode',
  'boundary_failure',
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

export function projectInnerCompass(answers: readonly CompassAnswerRecord[]): InnerCompassOutput {
  const map = valueMap(answers);
  const coreValueIds = optionsOf(map, 'core_values');
  const evidenceCount = EVIDENCE_QUESTION_IDS.reduce(
    (count, questionId) => count + (textOf(map, questionId) ? 1 : 0),
    0,
  );

  return {
    trueNorthValueId:
      optionOf(map, 'behavioral_value') ?? optionOf(map, 'protected_value') ?? coreValueIds[0] ?? null,
    coreValueIds,
    lifeSparkId: optionOf(map, 'alive_context'),
    essentialNeedId: optionOf(map, 'essential_need') ?? optionOf(map, 'neglected_need'),
    neglectedNeedId: optionOf(map, 'neglected_need'),
    shadowPullId: optionOf(map, 'shadow') ?? optionOf(map, 'unlike_self'),
    driftCauseId: optionOf(map, 'drift_cause'),
    naturalStrengthId: optionOf(map, 'strength'),
    counterbalanceId: optionOf(map, 'counterbalance'),
    guardianBoundary: textOf(map, 'guardian_boundary'),
    compassStatement: textOf(map, 'compass_statement'),
    evidenceCount,
    confidenceId: optionOf(map, 'compass_confidence'),
    counterevidence: textOf(map, 'compass_counterevidence'),
    reviewTriggerId: optionOf(map, 'compass_review_trigger'),
    readingStatus: evidenceCount >= 4 ? 'evidence_backed' : 'provisional',
  };
}

export function innerCompassOutputToJson(output: InnerCompassOutput): Json {
  return output as unknown as Json;
}
