import type { ReactNode } from 'react';
import { ModeSelectionScreen } from './screens/ModeSelectionScreen';
import { GroundingScreen } from './screens/GroundingScreen';
import { PrivateCaptureScreen } from './screens/PrivateCaptureScreen';
import { CollectPileScreen } from './screens/CollectPileScreen';
import { ParallelReadScreen } from './screens/ParallelReadScreen';
import { ResolutionBuilderScreen } from './screens/ResolutionBuilderScreen';
import { ApologyAlignmentScreen } from './screens/ApologyAlignmentScreen';
import { InnerNextStepScreen } from './screens/InnerNextStepScreen';
import { AgreementCloseCard } from './components/AgreementCloseCard';
import { StageProgress } from './components/StageProgress';
import { useConflictSession } from './hooks/useConflictSession';
import './conflictResolver.css';

export function ConflictResolverExperience() {
  const session = useConflictSession();

  const withProgress = (content: ReactNode) => (
    <>
      <StageProgress stage={session.stage} />
      {content}
    </>
  );

  if (session.stage === 'mode_selection') {
    return withProgress(
      <ModeSelectionScreen
        selectedType={session.selectedType}
        onSelectType={session.setSelectedType}
        onContinue={session.goToGrounding}
        sharedSessionId={session.sharedSessionId}
        sharedSessionCodeInput={session.sharedSessionCodeInput}
        onSharedSessionCodeInputChange={session.setSharedSessionCodeInput}
        sharedParticipantCount={session.sharedParticipantCount}
        sharedSessionLastSyncedAt={session.sharedSessionLastSyncedAt}
        onCreateSharedSession={session.createSharedSession}
        onJoinSharedSession={session.joinSharedSession}
        onRefreshSharedSession={() => session.sharedSessionId
          ? Promise.all([
            session.refreshSharedParticipantCount(session.sharedSessionId),
            session.resyncSharedSession(session.sharedSessionId),
          ]).then(() => undefined)
          : undefined}
        sharedSessionNotice={session.inviteJoinMessage}
        sharedSessionError={session.sharedSessionError}
        sharedSessionBusy={session.sharedSessionBusy}
        recoverableDraft={session.recoverableDraft}
        onResumeDraft={session.resumeRecoveredDraft}
        onStartFresh={session.discardRecoveredDraft}
      />
    );
  }

  if (session.stage === 'grounding') {
    return withProgress(
      <GroundingScreen
        statementIndex={session.groundingIndex}
        statements={session.groundingStatements}
        onNextStatement={session.nextGroundingStatement}
        onReady={session.startPrivateCapture}
      />
    );
  }

  if (session.stage === 'private_capture') {
    return withProgress(
      <PrivateCaptureScreen
        prompts={session.prompts}
        promptIndex={session.promptIndex}
        value={session.currentAnswer}
        onChangeValue={session.setCurrentAnswer}
        onNext={session.nextPrompt}
        onBack={session.previousPrompt}
        onSkip={session.skipPrompt}
        onFinish={session.finishPrivateCapture}
      />
    );
  }

  if (session.stage === 'collect_pile') {
    return withProgress(<CollectPileScreen summaryCards={session.summaryCards} onContinue={session.enterParallelRead} />);
  }

  if (session.stage === 'inner_next_step') {
    return withProgress(
      <InnerNextStepScreen
        recommendations={session.innerRecommendations}
        guidanceMeta={session.innerGuidanceMeta}
        onContinue={session.completeInnerNextStep}
      />,
    );
  }

  if (session.stage === 'parallel_read') {
    return withProgress(
      <ParallelReadScreen
        summaryCards={session.summaryCards}
        alignmentReached={session.alignmentReached}
        onAlignmentReached={session.markAlignmentReached}
        onComplete={session.completeParallelRead}
      />
    );
  }

  if (session.stage === 'resolution_builder') {
    return withProgress(
      <ResolutionBuilderScreen
        options={session.resolutionOptions}
        selectedOptionId={session.selectedResolution}
        onSelectOption={session.setSelectedResolution}
        whiteFlagOffer={session.whiteFlagOffer}
        onWhiteFlagOfferChange={session.setWhiteFlagOffer}
        proposalQueue={session.proposalQueue}
        activeProposalId={session.activeProposalId}
        onQueueWhiteFlagOffer={session.queueWhiteFlagOffer}
        onPromoteProposal={session.promoteProposal}
        onRemoveProposal={session.removeProposal}
        parallelAnnotationItems={session.parallelAnnotationItems}
        onContinue={session.moveToApologyAlignment}
      />
    );
  }

  if (session.stage === 'apology_alignment') {
    return withProgress(
      <ApologyAlignmentScreen
        selectedType={session.selectedApologyType}
        onSelectType={session.setSelectedApologyType}
        timingMode={session.apologyTiming}
        onTimingModeChange={session.setApologyTiming}
        sequencedLead={session.sequencedLead}
        onSequencedLeadChange={session.setSequencedLead}
        onContinue={session.completeApologyAlignment}
      />
    );
  }

  if (session.stage === 'agreement_preview') {
    return withProgress(
      <AgreementCloseCard
        summaryItems={session.agreementSummaryItems}
        followUpDate={session.followUpDate}
        onFollowUpDateChange={session.setFollowUpDate}
        inviteeEmailDraft={session.inviteeEmailDraft}
        onInviteeEmailDraftChange={session.setInviteeEmailDraft}
        inviteeEmailError={session.inviteeEmailError}
        lightweightParticipants={session.lightweightParticipants}
        onAddLightweightParticipant={session.addLightweightParticipant}
        onRemoveLightweightParticipant={session.removeLightweightParticipant}
        canFinalize={session.canFinalizeAgreement}
        finalizeHint={session.canFinalizeAgreement ? undefined : 'Select apology sequencing and a structured resolution before finalizing.'}
        onFinalize={session.finalizeAgreement}
      />
    );
  }

  if (session.stage === 'agreement_finalized') {
    return withProgress(
      <section className="conflict-resolver__screen conflict-resolver__screen--finalized" aria-labelledby="conflict-finalized-title">
        <header className="conflict-resolver__header">
          <h3 id="conflict-finalized-title" className="conflict-resolver__title">Agreement finalized</h3>
          <p className="conflict-resolver__subtitle">Great progress. You can now schedule follow-through and close calmly.</p>
        </header>
        <div className="conflict-resolver__completion-burst" role="status" aria-live="polite">
          ✨ Repair milestone reached
        </div>
        {session.generatedInviteLinks.length > 0 ? (
          <article className="conflict-resolver__finalized-card" aria-label="Lightweight participant invite links">
            <h4>Invite links ready</h4>
            <p>Share these one-click links with email-only participants so they can join without a full profile.</p>
            <ul className="conflict-resolver__finalized-list">
              {session.generatedInviteLinks.map((link) => (
                <li key={link}>
                  <a href={link} target="_blank" rel="noreferrer">{link}</a>
                </li>
              ))}
            </ul>
          </article>
        ) : null}
        {session.inviteGenerationError ? (
          <p className="conflict-resolver__input-error" role="alert">{session.inviteGenerationError}</p>
        ) : null}
        <article className="conflict-resolver__finalized-card" aria-label="Post-session onboarding">
          <h4>Suggested next moves</h4>
          <p>Based on this session, jump straight into the most useful next step.</p>
          <div className="conflict-resolver__proposal-actions">
            {session.innerRecommendations.map((item) => (
              <a key={item.id} href={item.href} className="btn">
                {item.ctaLabel}
              </a>
            ))}
          </div>
        </article>
        <button type="button" className="btn btn--primary conflict-resolver__primary-cta" onClick={session.resetFlow}>
          Start new session
        </button>
      </section>
    );
  }

  return withProgress(
    <section className="conflict-resolver__screen" aria-labelledby="conflict-ready-title">
      <header className="conflict-resolver__header">
        <h3 id="conflict-ready-title" className="conflict-resolver__title">Agreement Preview</h3>
        <p className="conflict-resolver__subtitle">
          Parallel read decision: {session.parallelDecision ?? 'pending'} • Timing: {session.apologyTiming}.
        </p>
      </header>

      <ul className="conflict-resolver__response-list">
        {Object.entries(session.answers).map(([key, value]) => (
          <li key={key} className="conflict-resolver__response-item">
            <strong>{key.replace(/_/g, ' ')}</strong>
            <p>{value || '—'}</p>
          </li>
        ))}
      </ul>

      <div className="conflict-resolver__footer-actions">
        <button type="button" className="btn" onClick={session.enterParallelRead}>
          Re-open Parallel Read
        </button>
        <button type="button" className="btn" onClick={session.moveToApologyAlignment}>
          Re-open Apology Alignment
        </button>
        <button type="button" className="btn" onClick={session.resetFlow}>
          Start over
        </button>
        <button type="button" className="btn btn--primary" disabled>
          Continue (Agreement finalization next PR)
        </button>
      </div>
    </section>
  );
}
