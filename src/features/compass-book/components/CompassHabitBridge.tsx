import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { createHabitV2, updateHabitFullV2 } from '../../../services/habitsV2';
import type { CompassAnswerRecord } from '../types';
import { projectPersonalPlaybook } from '../logic/projectors/personalPlaybookProjector';
import {
  buildHabitProposalFromPlaybook,
  describeHabitIntent,
  type CompassHabitProposal,
} from '../logic/habitBridge';

export type CompassHabitBridgeProps = {
  answers: readonly CompassAnswerRecord[];
  session: Session | null;
};

type BridgeState = 'idle' | 'creating' | 'created' | 'error' | 'dismissed';

/**
 * Reviewable habit proposal (Chapter 6 → habits). Shows a habit designed from
 * the Personal Playbook. It NEVER creates anything automatically — the canonical
 * `createHabitV2` runs only when the player taps "Create this habit". The
 * playbook design (cue, minimum mode, recovery, provenance) is carried into the
 * habit's intent/environment.
 */
export function CompassHabitBridge({ answers, session }: CompassHabitBridgeProps) {
  const proposal = buildHabitProposalFromPlaybook(projectPersonalPlaybook(answers));
  const [state, setState] = useState<BridgeState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!proposal || state === 'dismissed') return null;

  const isUpdate = proposal.existingHabitId !== null;

  async function handleCreate(p: CompassHabitProposal) {
    const userId = session?.user?.id;
    if (!userId) {
      setErrorMessage('Sign in to save this as a habit.');
      setState('error');
      return;
    }
    setState('creating');
    setErrorMessage(null);
    const schedule = { mode: 'daily' };
    try {
      // Picked from an existing habit — enrich it in place (the Playbook design +
      // provenance) instead of creating a duplicate. Title is left untouched.
      const { data, error } = p.existingHabitId
        ? await updateHabitFullV2(p.existingHabitId, {
            habit_intent: describeHabitIntent(p),
            habit_environment: p.environmentRule ?? null,
          })
        : await createHabitV2(
            {
              title: p.normalVersion,
              type: 'boolean',
              schedule,
              autoprog: {
                tier: 'standard',
                baseSchedule: schedule,
                baseTarget: null,
                lastShiftAt: null,
                lastShiftType: null,
              },
              domain_key: p.protectedAreaId ?? null,
              habit_intent: describeHabitIntent(p),
              habit_environment: p.environmentRule ?? null,
              archived: false,
              status: 'active',
              target_num: null,
              target_unit: null,
            },
            userId,
          );
      if (error || !data) {
        setErrorMessage(
          p.existingHabitId
            ? 'Could not update the habit. Please try again.'
            : 'Could not save the habit. Please try again.',
        );
        setState('error');
        return;
      }
      setState('created');
    } catch {
      setErrorMessage(
        p.existingHabitId
          ? 'Could not update the habit. Please try again.'
          : 'Could not save the habit. Please try again.',
      );
      setState('error');
    }
  }

  return (
    <section className="compass-bridge" aria-label="Create a habit from your Playbook">
      <header className="compass-bridge__header">
        <span className="compass-bridge__eyebrow">Habit proposal</span>
        <h3 className="compass-bridge__title">
          {isUpdate ? 'Update this habit with your design?' : 'Turn your habit design into a real habit?'}
        </h3>
        <p className="compass-bridge__note">
          {isUpdate
            ? 'This is a habit you already have. Nothing changes until you approve it — this updates that habit with the design you built here. You can edit it in your habits anytime.'
            : 'Nothing is created until you approve it. This adds one daily habit using your existing habits — keep your supporting habits to about three so the quest stays light.'}
        </p>
      </header>

      <dl className="compass-bridge__fields">
        <Field label="Habit" value={proposal.normalVersion} />
        {proposal.smallVersion ? <Field label="Small version" value={proposal.smallVersion} /> : null}
        {proposal.minimumVersion ? <Field label="Minimum version" value={proposal.minimumVersion} /> : null}
        {proposal.cue ? <Field label="Cue" value={proposal.cue} /> : null}
        {proposal.environmentRule ? <Field label="Environment" value={proposal.environmentRule} /> : null}
        {proposal.completionEvidence ? <Field label="Done when" value={proposal.completionEvidence} /> : null}
        {proposal.recoveryRule ? <Field label="Recovery" value={proposal.recoveryRule} /> : null}
      </dl>

      {state === 'created' ? (
        <p className="compass-bridge__success">
          {isUpdate ? '✓ Habit updated in your habits.' : '✓ Habit added to your habits.'}
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
                  ? 'Update this habit'
                  : 'Create this habit'}
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
