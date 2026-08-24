/**
 * Ikigai Map projector (Chapter 4). Pure, deterministic, AI-free.
 * Proposes the constellation the player confirms at activity 80.
 */

import type { Json } from '../../../../lib/database.types';
import type { CompassAnswerRecord, CompassAnswerValue } from '../../types';

export type IkigaiMapOutput = {
  /** Broad v2 curiosity inventory and the two distinct rankings behind it. */
  interestIds: string[];
  preferenceRankIds: string[];
  timeRankIds: string[];
  priorityInterestIds: string[];
  sparkId: string | null;
  giftId: string | null;
  needId: string | null;
  viabilityId: string | null;
  horizonFitId: string | null;
  toleranceId: string | null;
  beginnerId: string | null;
  /** Candidate path labels the player wrote (1–3). */
  paths: string[];
  /** Which path was chosen for the Trial (path_a|path_b|path_c). */
  trialChoiceId: string | null;
  /** The chosen path's text, resolved from trialChoiceId. */
  trialPath: string | null;
  trialExperiment: string | null;
  pathTypeId: string | null;
  /** Proposed, not declared: low willingness suggests chasing identity, not the work. */
  mirageWarning: boolean;
  ikigaiStatement: string | null;
  evidenceCount: number;
  confidenceId: string | null;
  counterevidence: string | null;
  reviewTriggerId: string | null;
  readingStatus: 'provisional' | 'evidence_backed' | 'trial_ready';
};

const EVIDENCE_QUESTION_IDS = [
  'attention_problem_evidence',
  'explored_freely_evidence',
  'spark_reason',
  'demonstrated_strength_evidence',
  'emerging_strength_evidence',
  'underused_strength_evidence',
  'gift_counterevidence',
  'people_understood_evidence',
  'problem_cared_evidence',
  'transformation_evidence',
  'need_counterevidence',
  'income_evidence',
  'access_evidence',
  'horizon_fit_evidence',
  'process_evidence',
  'beginner_cost_evidence',
  'trial_failure_signal',
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
  const value = map.get(questionId);
  return value?.kind === 'multi_choice' ? value.optionIds : [];
}

function rankingOf(map: Map<string, CompassAnswerValue>, questionId: string): string[] {
  const value = map.get(questionId);
  return value?.kind === 'ranking' ? value.orderedOptionIds : [];
}

function textOf(map: Map<string, CompassAnswerValue>, questionId: string): string | null {
  const v = map.get(questionId);
  return v && v.kind === 'text' && v.text.trim() ? v.text.trim() : null;
}

export function projectIkigaiMap(answers: readonly CompassAnswerRecord[]): IkigaiMapOutput {
  const map = valueMap(answers);
  const legacyRepeatedInterest = optionOf(map, 'repeated_interest');
  const interestIds = optionsOf(map, 'repeated_interest');
  const preferenceRankIds = rankingOf(map, 'interest_preference_ranking');
  const timeRankIds = rankingOf(map, 'interest_time_ranking');
  const priorityInterestIds = optionsOf(map, 'interest_priorities');

  const pathA = textOf(map, 'path_a');
  const pathB = textOf(map, 'path_b');
  const pathC = textOf(map, 'path_c');
  const paths = [pathA, pathB, pathC].filter((p): p is string => p !== null);

  const trialChoiceId = optionOf(map, 'trial_choice');
  const pathByChoice: Record<string, string | null> = { path_a: pathA, path_b: pathB, path_c: pathC };
  const trialPath = trialChoiceId ? pathByChoice[trialChoiceId] ?? null : null;

  const toleranceId = optionOf(map, 'process_tolerance');
  const beginnerId = optionOf(map, 'beginner_willingness');
  const mirageWarning = toleranceId === 'dislike' || beginnerId === 'reluctant';
  const evidenceCount = EVIDENCE_QUESTION_IDS.reduce(
    (count, questionId) => count + (textOf(map, questionId) ? 1 : 0),
    0,
  );
  const trialExperiment = textOf(map, 'trial_experiment');

  return {
    interestIds: interestIds.length > 0
      ? interestIds
      : legacyRepeatedInterest
        ? [legacyRepeatedInterest]
        : [],
    preferenceRankIds,
    timeRankIds,
    priorityInterestIds,
    sparkId:
      optionOf(map, 'spark_pick') ??
      priorityInterestIds[0] ??
      legacyRepeatedInterest ??
      interestIds[0] ??
      null,
    giftId: optionOf(map, 'gift_pick') ?? optionOf(map, 'demonstrated_strength'),
    needId: optionOf(map, 'need_pick') ?? optionOf(map, 'problem_cared'),
    viabilityId: optionOf(map, 'income_potential'),
    horizonFitId: optionOf(map, 'horizon_fit'),
    toleranceId,
    beginnerId,
    paths,
    trialChoiceId,
    trialPath,
    trialExperiment,
    pathTypeId: optionOf(map, 'path_type'),
    mirageWarning,
    ikigaiStatement: textOf(map, 'ikigai_statement'),
    evidenceCount,
    confidenceId: optionOf(map, 'ikigai_confidence'),
    counterevidence: textOf(map, 'ikigai_counterevidence'),
    reviewTriggerId: optionOf(map, 'ikigai_review_trigger'),
    readingStatus: trialExperiment
      ? 'trial_ready'
      : evidenceCount >= 5
        ? 'evidence_backed'
        : 'provisional',
  };
}

export function ikigaiMapOutputToJson(output: IkigaiMapOutput): Json {
  return output as unknown as Json;
}
