/**
 * Habit bridge — pure proposal builder (Chapter 6 → a canonical habit).
 *
 * Builds a *proposal* only. It NEVER creates a habit. Canonical habit creation
 * happens exclusively through `services/habitsV2.ts` (`createHabitV2`) and only
 * after the player explicitly approves the proposal in the UI. Provenance and
 * the playbook design are carried into the created habit's intent/environment.
 */

import { PLAYBOOK_LABELS } from '../content/chapter6PersonalPlaybook';
import type { PersonalPlaybookOutput } from './projectors/personalPlaybookProjector';

export type CompassHabitProposal = {
  originChapterId: string;
  originActivityId: string;
  normalVersion: string;
  smallVersion: string | null;
  minimumVersion: string | null;
  cue: string | null;
  environmentRule: string | null;
  completionEvidence: string | null;
  recoveryRule: string | null;
  /** Canonical Life Wheel category key the habit must protect (or null). */
  protectedAreaId: string | null;
  /**
   * Canonical id of an existing habit this design was picked from. When set, the
   * bridge updates that habit instead of creating a duplicate.
   */
  existingHabitId: string | null;
};

function labelOf(id: string | null): string | null {
  if (!id) return null;
  return PLAYBOOK_LABELS[id] ?? id;
}

/**
 * Build a habit proposal from the Personal Playbook output, or null if there is
 * no habit named yet. Pure — proposes only, never writes.
 */
export function buildHabitProposalFromPlaybook(
  output: PersonalPlaybookOutput,
): CompassHabitProposal | null {
  const normalVersion = output.habitNormal?.trim();
  if (!normalVersion) return null;

  const envLabel = labelOf(output.envRuleId);
  const environmentRule = output.envDetail
    ? envLabel
      ? `${envLabel}: ${output.envDetail}`
      : output.envDetail
    : envLabel;

  return {
    originChapterId: 'personal_playbook',
    originActivityId: 'personal_playbook.a08',
    normalVersion,
    smallVersion: output.habitSmall,
    minimumVersion: output.habitMinimum,
    cue: labelOf(output.cueId),
    environmentRule,
    completionEvidence: output.completionEvidence,
    recoveryRule: labelOf(output.recoveryRouteId),
    protectedAreaId: output.protectedAreaId,
    existingHabitId: output.habitSourceId,
  };
}

/** Compose the habit intent string (cue + minimum mode + recovery + provenance). */
export function describeHabitIntent(proposal: CompassHabitProposal): string {
  const parts: string[] = [];
  if (proposal.cue) parts.push(`Cue: ${proposal.cue}.`);
  if (proposal.smallVersion) parts.push(`Small: ${proposal.smallVersion}.`);
  if (proposal.minimumVersion) parts.push(`Minimum: ${proposal.minimumVersion}.`);
  if (proposal.completionEvidence) parts.push(`Done when: ${proposal.completionEvidence}.`);
  if (proposal.recoveryRule) parts.push(`Recovery: ${proposal.recoveryRule}.`);
  parts.push('From the Compass Book · The Personal Playbook.');
  return parts.join(' ');
}
