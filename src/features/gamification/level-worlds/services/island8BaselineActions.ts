import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';
import {
  getIslandRunSignatureMissionKey,
  getStagedRestorationMissionDescriptor,
  resolveStagedRestorationMissionProgress,
} from './islandRunSignatureMissions';
import {
  ISLAND8_BASELINE_ISLAND_NUMBER,
  applyIsland8BaselineAnswer,
  getIsland8BaselineKey,
  resolveIsland8BaselineProgress,
} from './island8BaselineCheck';

export type AnswerIsland8BaselineResult =
  | { status: 'ok'; activatedStages: number; completedAtMs: number | null; answeredCount: number }
  | { status: 'wrong_island' | 'already_complete' | 'unknown_question' | 'already_answered' | 'invalid_value' };

/**
 * Canonical Island 008 baseline answer: records the answer and lights the
 * next Living Compass seal in one commit (each answer earns and spends that
 * seal's charge, replacing the Wayfinder pickup + Mission Phone step).
 */
export function answerIsland8BaselineQuestion(options: {
  session: Session;
  client: SupabaseClient | null;
  questionId: string;
  value: number;
  nowMs?: number;
}): Promise<AnswerIsland8BaselineResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    if (state.currentIslandNumber !== ISLAND8_BASELINE_ISLAND_NUMBER) return { status: 'wrong_island' };
    const descriptor = getStagedRestorationMissionDescriptor(state.currentIslandNumber, state.signatureMissionProgressByIsland);
    const staged = resolveStagedRestorationMissionProgress({
      ledger: state.signatureMissionProgressByIsland,
      cycleIndex: state.cycleIndex,
      islandNumber: state.currentIslandNumber,
    });
    if (!descriptor || descriptor.missionId !== 'jungle-expedition-living-compass' || !staged) return { status: 'wrong_island' };
    if (staged.completedAtMs !== null || staged.activatedStages >= descriptor.stageCount) return { status: 'already_complete' };
    const nowMs = options.nowMs ?? Date.now();
    const answer = applyIsland8BaselineAnswer(
      resolveIsland8BaselineProgress(state.signatureMissionProgressByIsland, state.cycleIndex),
      options.questionId,
      options.value,
      nowMs,
    );
    if (answer.status !== 'ok') return { status: answer.status };
    const cost = descriptor.chargeCostPerStage;
    const pickupTarget = descriptor.stageCount * cost;
    const activatedStages = Math.min(descriptor.stageCount, staged.activatedStages + 1);
    const completedAtMs = activatedStages >= descriptor.stageCount ? staged.completedAtMs ?? nowMs : null;
    const nextStaged = {
      ...staged,
      chargesEarned: Math.min(pickupTarget, Math.max(staged.chargesEarned, staged.chargesSpent + cost)),
      chargesSpent: staged.chargesSpent + cost,
      activatedStages,
      lastActivatedStage: activatedStages,
      completedAtMs,
      updatedAtMs: nowMs,
    };
    await commitIslandRunState({
      session: options.session,
      client: options.client,
      record: {
        ...state,
        runtimeVersion: state.runtimeVersion + 1,
        signatureMissionProgressByIsland: {
          ...state.signatureMissionProgressByIsland,
          [getIslandRunSignatureMissionKey(state.cycleIndex, state.currentIslandNumber)]: nextStaged,
          [getIsland8BaselineKey(state.cycleIndex)]: answer.progress,
        },
      },
      triggerSource: 'answer_island8_baseline_question',
    });
    return { status: 'ok', activatedStages, completedAtMs, answeredCount: answer.progress.answers.length };
  });
}
