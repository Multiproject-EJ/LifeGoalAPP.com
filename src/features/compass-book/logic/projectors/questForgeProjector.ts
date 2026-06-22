/**
 * Quest Forge projector (Chapter 5). Pure, deterministic, AI-free.
 * Proposes the Quest Crest the player confirms at activity 100.
 */

import type { Json } from '../../../../lib/database.types';
import type { CompassAnswerRecord, CompassAnswerValue } from '../../types';

export type QuestForgeOutput = {
  primaryQuestTitle: string | null;
  supportingQuestTitle: string | null;
  releasedQuestTitle: string | null;
  motiveId: string | null;
  valuesFitId: string | null;
  horizonFitId: string | null;
  wheelImpactAreaId: string | null;
  opportunityCostId: string | null;
  timingId: string | null;
  callingText: string | null;
  firstMilestone: string | null;
  successEvidence: string | null;
  acceptedCostId: string | null;
  protectedFlame: string | null;
  reviewPointId: string | null;
  /** Canonical goal id when the Primary Quest was picked from an existing goal. */
  primaryQuestSourceGoalId: string | null;
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

/** Resolve a quest reference (quest_a|quest_b|quest_c|none) to its written text. */
function resolveQuest(map: Map<string, CompassAnswerValue>, refQuestionId: string): string | null {
  const ref = optionOf(map, refQuestionId);
  if (!ref || ref === 'none') return null;
  return textOf(map, ref);
}

/** The canonical goal id a text answer was picked from (if any). */
function sourceGoalIdOf(map: Map<string, CompassAnswerValue>, questionId: string): string | null {
  const v = map.get(questionId);
  return v && v.kind === 'text' && v.sourceRef?.kind === 'goal' ? v.sourceRef.id : null;
}

/** Resolve the source goal id of the quest slot a reference points to. */
function resolveQuestSourceGoalId(
  map: Map<string, CompassAnswerValue>,
  refQuestionId: string,
): string | null {
  const ref = optionOf(map, refQuestionId);
  if (!ref || ref === 'none') return null;
  return sourceGoalIdOf(map, ref);
}

export function projectQuestForge(answers: readonly CompassAnswerRecord[]): QuestForgeOutput {
  const map = valueMap(answers);
  return {
    primaryQuestTitle: resolveQuest(map, 'primary_candidate') ?? textOf(map, 'quest_a'),
    supportingQuestTitle: resolveQuest(map, 'support_quest'),
    releasedQuestTitle: resolveQuest(map, 'release_quest'),
    motiveId: optionOf(map, 'motive'),
    valuesFitId: optionOf(map, 'values_fit'),
    horizonFitId: optionOf(map, 'horizon_fit'),
    wheelImpactAreaId: optionOf(map, 'wheel_impact'),
    opportunityCostId: optionOf(map, 'opportunity_cost'),
    timingId: optionOf(map, 'timing'),
    callingText: textOf(map, 'calling'),
    firstMilestone: textOf(map, 'first_milestone'),
    successEvidence: textOf(map, 'success_evidence'),
    acceptedCostId: optionOf(map, 'accepted_cost'),
    protectedFlame: textOf(map, 'protected_flame'),
    reviewPointId: optionOf(map, 'review_point'),
    primaryQuestSourceGoalId:
      resolveQuestSourceGoalId(map, 'primary_candidate') ?? sourceGoalIdOf(map, 'quest_a'),
  };
}

export function questForgeOutputToJson(output: QuestForgeOutput): Json {
  return output as unknown as Json;
}
