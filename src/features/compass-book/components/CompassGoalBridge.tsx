import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { insertGoal, updateGoal } from '../../../services/goals';
import type { CompassAnswerRecord } from '../types';
import { projectQuestForge } from '../logic/projectors/questForgeProjector';
import {
  buildGoalProposalFromQuestForge,
  describeGoalProposal,
  type CompassGoalProposal,
} from '../logic/goalBridge';

export type CompassGoalBridgeProps = {
  answers: readonly CompassAnswerRecord[];
  session: Session | null;
};

type BridgeState = 'idle' | 'creating' | 'created' | 'error' | 'dismissed';

/**
 * Reviewable goal proposal (Chapter 5 → My Quest).
 *
 * Shows a proposed goal derived from the Quest Forge. It NEVER creates anything
 * automatically — the canonical `insertGoal` runs only when the player taps
 * "Create this goal". Provenance is carried into the goal's description.
 */
export function CompassGoalBridge({ answers, session }: CompassGoalBridgeProps) {
  const proposal = buildGoalProposalFromQuestForge(projectQuestForge(answers));
  const [state, setState] = useState<BridgeState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!proposal || state === 'dismissed') return null;

  const isUpdate = proposal.existingGoalId !== null;

  async function handleCreate(p: CompassGoalProposal) {
    const userId = session?.user?.id;
    if (!userId) {
      setErrorMessage('Sign in to save this as a goal.');
      setState('error');
      return;
    }
    setState('creating');
    setErrorMessage(null);
    try {
      // The Primary Quest was picked from an existing goal — enrich it in place
      // (provenance, why, review date, life area) instead of creating a duplicate.
      const { data, error } = p.existingGoalId
        ? await updateGoal(p.existingGoalId, {
            description: describeGoalProposal(p),
            why_it_matters: p.whyItMatters ?? undefined,
            target_date: p.reviewDate ?? undefined,
            life_wheel_category: p.lifeWheelCategory ?? undefined,
          })
        : await insertGoal({
            user_id: userId,
            title: p.title,
            description: describeGoalProposal(p),
            why_it_matters: p.whyItMatters ?? undefined,
            target_date: p.reviewDate ?? undefined,
            life_wheel_category: p.lifeWheelCategory ?? undefined,
            priority_level: 'high',
          });
      if (error || !data) {
        setErrorMessage(
          p.existingGoalId
            ? 'Could not update the goal. Please try again.'
            : 'Could not save the goal. Please try again.',
        );
        setState('error');
        return;
      }
      setState('created');
    } catch {
      setErrorMessage(
        p.existingGoalId
          ? 'Could not update the goal. Please try again.'
          : 'Could not save the goal. Please try again.',
      );
      setState('error');
    }
  }

  return (
    <section className="compass-bridge" aria-label="Save a goal from your Primary Quest">
      <header className="compass-bridge__header">
        <span className="compass-bridge__eyebrow">Goal proposal</span>
        <h3 className="compass-bridge__title">
          {isUpdate ? 'Update this goal with your Quest?' : 'Turn your Primary Quest into a goal?'}
        </h3>
        <p className="compass-bridge__note">
          {isUpdate
            ? 'Your Primary Quest is a goal you already have. Nothing changes until you approve it — this updates that goal with what you forged here. You can edit it in My Quest anytime.'
            : 'Nothing is created until you approve it. This adds one goal to My Quest using your existing goals — you can edit or delete it there anytime.'}
        </p>
      </header>

      <dl className="compass-bridge__fields">
        <Field label="Goal" value={proposal.title} />
        {proposal.whyItMatters ? <Field label="Why it matters" value={proposal.whyItMatters} /> : null}
        {proposal.firstMilestone ? <Field label="First milestone" value={proposal.firstMilestone} /> : null}
        {proposal.successEvidence ? <Field label="Success evidence" value={proposal.successEvidence} /> : null}
        {proposal.acceptedCost ? <Field label="Accepted cost" value={proposal.acceptedCost} /> : null}
        {proposal.protectedBoundary ? <Field label="Protected" value={proposal.protectedBoundary} /> : null}
        {proposal.reviewDate ? <Field label="Review on" value={proposal.reviewDate} /> : null}
      </dl>

      {state === 'created' ? (
        <p className="compass-bridge__success">
          {isUpdate ? '✓ Goal updated in My Quest.' : '✓ Goal added to My Quest.'}
        </p>
      ) : (
        <>
          {errorMessage ? <p className="compass-bridge__error">{errorMessage}</p> : null}
          <div className="compass-bridge__actions">
            <button
              type="button"
              className="compass-book__secondary"
              onClick={() => setState('dismissed')}
              disabled={state === 'creating'}
            >
              Not now
            </button>
            <button
              type="button"
              className="compass-book__primary"
              onClick={() => handleCreate(proposal)}
              disabled={state === 'creating'}
            >
              {state === 'creating'
                ? 'Saving…'
                : isUpdate
                  ? 'Update this goal'
                  : 'Create this goal'}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="compass-bridge__field">
      <dt className="compass-bridge__field-label">{label}</dt>
      <dd className="compass-bridge__field-value">{value}</dd>
    </div>
  );
}
