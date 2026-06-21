/**
 * Quest Leap proposal — architecture seam only.
 *
 * Quest Leaps (short real-life experiments that generate evidence) are NOT built
 * yet. This file defines the proposal shape and a pure builder so chapters can
 * generate a proposal the player could later run. Nothing here is persisted,
 * surfaced as an automatic write, or wired to any UI in this PR. The full Quest
 * Leaps system is a later, separate PR.
 */

import type { IkigaiMapOutput } from './projectors/ikigaiMapProjector';

export type QuestLeapDurationType =
  | 'one_session'
  | 'three_days'
  | 'seven_days'
  | 'fourteen_days'
  | 'thirty_days';

export type QuestLeapProposal = {
  sourceChapterId: string;
  sourceActivityId?: string;
  hypothesis: string;
  action: string;
  durationType: QuestLeapDurationType;
  evidenceQuestions: string[];
};

/**
 * Build a (non-binding) Quest Leap proposal from the Ikigai Map output. Returns
 * null when there is no chosen Trial yet. Pure — proposes only; never writes.
 */
export function buildQuestLeapProposalFromIkigai(
  output: IkigaiMapOutput,
): QuestLeapProposal | null {
  if (!output.trialPath && !output.trialExperiment) return null;

  const subject = output.trialPath ?? 'this direction';
  return {
    sourceChapterId: 'ikigai_map',
    sourceActivityId: 'ikigai_map.a19',
    hypothesis: `Exploring "${subject}" will feel energising and worth pursuing further.`,
    action: output.trialExperiment ?? `Spend one short session testing "${subject}".`,
    durationType: 'three_days',
    evidenceQuestions: [
      'Did the work itself energise you, not just the idea of it?',
      'Did you want to keep going afterward?',
      'What did you learn about whether it fits you?',
    ],
  };
}
