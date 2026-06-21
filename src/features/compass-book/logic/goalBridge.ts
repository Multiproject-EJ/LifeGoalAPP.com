/**
 * Goal bridge — pure proposal builder (Chapter 5 → a canonical goal).
 *
 * This builds a *proposal* only. It NEVER creates a goal. Canonical goal
 * creation happens exclusively through `services/goals.ts` (`insertGoal`) and
 * only after the player explicitly approves the proposal in the UI. Provenance
 * (origin chapter/activity) is carried so the created goal can be traced back.
 */

import { QUEST_FORGE_LABELS, REVIEW_POINT_WEEKS } from '../content/chapter5QuestForge';
import type { QuestForgeOutput } from './projectors/questForgeProjector';

export type CompassGoalProposal = {
  originChapterId: string;
  originActivityId: string;
  title: string;
  whyItMatters: string | null;
  firstMilestone: string | null;
  successEvidence: string | null;
  acceptedCost: string | null;
  protectedBoundary: string | null;
  /** Canonical Life Wheel category key (or null). */
  lifeWheelCategory: string | null;
  reviewPointId: string | null;
  /** ISO date computed from the review point (or null). */
  reviewDate: string | null;
};

function labelOf(id: string | null): string | null {
  if (!id) return null;
  return QUEST_FORGE_LABELS[id] ?? id;
}

function computeReviewDate(reviewPointId: string | null, now: Date): string | null {
  if (!reviewPointId) return null;
  const weeks = REVIEW_POINT_WEEKS[reviewPointId];
  if (!weeks) return null;
  const d = new Date(now.getTime());
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

/**
 * Build a goal proposal from the Quest Forge output, or null if there is no
 * Primary Quest title yet. Pure; `now` is injectable for deterministic tests.
 */
export function buildGoalProposalFromQuestForge(
  output: QuestForgeOutput,
  now: Date = new Date(),
): CompassGoalProposal | null {
  const title = output.primaryQuestTitle?.trim();
  if (!title) return null;

  return {
    originChapterId: 'quest_forge',
    originActivityId: 'quest_forge.a04',
    title,
    whyItMatters: output.callingText,
    firstMilestone: output.firstMilestone,
    successEvidence: output.successEvidence,
    acceptedCost: labelOf(output.acceptedCostId),
    protectedBoundary: output.protectedFlame,
    lifeWheelCategory: output.wheelImpactAreaId,
    reviewPointId: output.reviewPointId,
    reviewDate: computeReviewDate(output.reviewPointId, now),
  };
}

/** Compose a human-readable description for the created goal (carries provenance). */
export function describeGoalProposal(proposal: CompassGoalProposal): string {
  const parts: string[] = ['From the Compass Book · The Quest Forge.'];
  if (proposal.firstMilestone) parts.push(`First milestone: ${proposal.firstMilestone}.`);
  if (proposal.successEvidence) parts.push(`Success evidence: ${proposal.successEvidence}.`);
  if (proposal.acceptedCost) parts.push(`Accepted cost: ${proposal.acceptedCost}.`);
  if (proposal.protectedBoundary) parts.push(`Protected: ${proposal.protectedBoundary}.`);
  return parts.join(' ');
}
