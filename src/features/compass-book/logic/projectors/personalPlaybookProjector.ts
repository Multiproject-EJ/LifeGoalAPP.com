/**
 * Personal Playbook projector (Chapter 6). Pure, deterministic, AI-free.
 * Proposes the operating system the player confirms at activity 120.
 */

import type { Json } from '../../../../lib/database.types';
import type { CompassAnswerRecord, CompassAnswerValue } from '../../types';

export type PersonalPlaybookOutput = {
  startEngineId: string | null;
  firstStep: string | null;
  cueId: string | null;
  momentumLoopId: string | null;
  habitNormal: string | null;
  habitSmall: string | null;
  habitMinimum: string | null;
  completionEvidence: string | null;
  returnTriggerId: string | null;
  warningLightId: string | null;
  warningResponseId: string | null;
  envRuleId: string | null;
  envDetail: string | null;
  recoveryRouteId: string | null;
  protectedAreaId: string | null;
  weeklyCheckId: string | null;
  operatingPrinciple: string | null;
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

export function projectPersonalPlaybook(
  answers: readonly CompassAnswerRecord[],
): PersonalPlaybookOutput {
  const map = valueMap(answers);
  return {
    startEngineId: optionOf(map, 'start_style'),
    firstStep: textOf(map, 'first_step'),
    cueId: optionOf(map, 'start_cue'),
    momentumLoopId: optionOf(map, 'momentum_signal'),
    habitNormal: textOf(map, 'the_habit'),
    habitSmall: textOf(map, 'small_version'),
    habitMinimum: textOf(map, 'minimum_version'),
    completionEvidence: textOf(map, 'completion_evidence'),
    returnTriggerId: optionOf(map, 'return_trigger'),
    warningLightId: optionOf(map, 'warning_light'),
    warningResponseId: optionOf(map, 'warning_response'),
    envRuleId: optionOf(map, 'env_rule'),
    envDetail: textOf(map, 'env_detail'),
    recoveryRouteId: optionOf(map, 'recovery_route'),
    protectedAreaId: optionOf(map, 'protected_area'),
    weeklyCheckId: optionOf(map, 'weekly_check'),
    operatingPrinciple: textOf(map, 'operating_principle'),
  };
}

export function personalPlaybookOutputToJson(output: PersonalPlaybookOutput): Json {
  return output as unknown as Json;
}
