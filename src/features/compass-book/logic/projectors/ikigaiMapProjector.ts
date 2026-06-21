/**
 * Ikigai Map projector (Chapter 4). Pure, deterministic, AI-free.
 * Proposes the constellation the player confirms at activity 80.
 */

import type { Json } from '../../../../lib/database.types';
import type { CompassAnswerRecord, CompassAnswerValue } from '../../types';

export type IkigaiMapOutput = {
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

function textOf(map: Map<string, CompassAnswerValue>, questionId: string): string | null {
  const v = map.get(questionId);
  return v && v.kind === 'text' && v.text.trim() ? v.text.trim() : null;
}

export function projectIkigaiMap(answers: readonly CompassAnswerRecord[]): IkigaiMapOutput {
  const map = valueMap(answers);

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

  return {
    sparkId: optionOf(map, 'spark_pick') ?? optionOf(map, 'repeated_interest'),
    giftId: optionOf(map, 'gift_pick') ?? optionOf(map, 'demonstrated_strength'),
    needId: optionOf(map, 'need_pick') ?? optionOf(map, 'problem_cared'),
    viabilityId: optionOf(map, 'income_potential'),
    horizonFitId: optionOf(map, 'horizon_fit'),
    toleranceId,
    beginnerId,
    paths,
    trialChoiceId,
    trialPath,
    trialExperiment: textOf(map, 'trial_experiment'),
    pathTypeId: optionOf(map, 'path_type'),
    mirageWarning,
    ikigaiStatement: textOf(map, 'ikigai_statement'),
  };
}

export function ikigaiMapOutputToJson(output: IkigaiMapOutput): Json {
  return output as unknown as Json;
}
