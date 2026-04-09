import type { ReactNode } from 'react';
import type { AppSurface } from '../../surfaces/surfaceContext';
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
import { ConflictKpiSnapshot } from './components/ConflictKpiSnapshot';
import { useConflictSession } from './hooks/useConflictSession';
import { getConflictSurfaceConfig, mapRecommendationForSurface } from './conflictSurfaceConfig';
import './conflictResolver.css';

type ConflictResolverExperienceProps = {
  surface?: AppSurface;
};

export function ConflictResolverExperience({ surface = 'habitgame' }: ConflictResolverExperienceProps) {
  const session = useConflictSession();
  const surfaceConfig = getConflictSurfaceConfig(surface);
  const isJoinRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/conflict/join');
  const shouldGatePeaceBetweenInvite = surface === 'peacebetween' && isJoinRoute;

  const withProgress = (content: ReactNode) => (
    <>
      <StageProgress stage={session.stage} selectedType={session.selectedType} />
      {content}
    </>
  );

  if (shouldGatePeaceBetweenInvite && session.inviteJoinState === 'validating') {
    return (
      <section className="conflict-resolver__screen" aria-labelledby="peacebetween-invite-validating-title">
        <header className="conflict-resolver__header">
          <h3 id="peacebetween-invite-validating-title" className="conflict-resolver__title">Verifying invite link…</h3>
          <p className="conflict-resolver__subtitle">
            Please wait while we securely validate your Peace Between invite.
          </p>
        </header>
      </section>
    );
  }

  if (shouldGatePeaceBetweenInvite && session.inviteJoinState === 'invalid') {
    return (
      <section className="conflict-resolver__screen" aria-labelledby="peacebetween-invalid-invite-title">
        <header className="conflict-resolver__header">
          <h3 id="peacebetween-invalid-invite-title" className="conflict-resolver__title">That invite link can’t be used</h3>
          <p className="conflict-resolver__subtitle">
            It may have expired, already been accepted, or been copied incorrectly.
          </p>
        </header>
        <p className="conflict-resolver__input-error" role="alert">
          {session.sharedSessionError ?? 'Please ask the sender for a fresh invite link.'}
        </p>
        <a className="btn btn--primary conflict-resolver__primary-cta" href="/conflict/new">
          Start a new conversation
        </a>
      </section>
    );
  }

  if (session.stage === 'mode_selection') {
    return withProgress(
      <ModeSelectionScreen
        surface={surface}
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
    return withProgress(
      <CollectPileScreen
        summaryCards={session.summaryCards}
        aiMode={session.sharedSummaryMeta?.aiMode ?? null}
        onContinue={session.enterParallelRead}
      />,
    );
  }

  if (session.stage === 'inner_next_step') {
    return withProgress(
      <InnerNextStepScreen
        surface={surface}
        recommendations={session.innerRecommendations}
        guidanceMeta={session.innerGuidanceMeta}
        onContinue={session.completeInnerNextStep}
        onUpgrade={session.trackInnerUpgradePromptClick}
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
        aiMode={session.resolutionMeta?.aiMode ?? null}
        fairnessWarnings={session.resolutionMeta?.fairnessWarnings ?? []}
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
    const completionTitle = surface === 'peacebetween' ? 'Conversation complete' : 'Agreement finalized';
    const completionSubtitle = surface === 'peacebetween'
      ? 'You have a shared repair plan. Take one calm follow-through action today.'
      : 'Great progress. You can now schedule follow-through and close calmly.';
    const completionBadge = surface === 'peacebetween'
      ? '✓ Repair plan confirmed'
      : '✨ Repair milestone reached';
    const resetLabel = surface === 'peacebetween' ? 'Start another conversation' : 'Start new session';

    return withProgress(
      <section className="conflict-resolver__screen conflict-resolver__screen--finalized" aria-labelledby="conflict-finalized-title">
        <header className="conflict-resolver__header">
          <h3 id="conflict-finalized-title" className="conflict-resolver__title">{completionTitle}</h3>
          <p className="conflict-resolver__subtitle">{completionSubtitle}</p>
        </header>
        <div className="conflict-resolver__completion-burst" role="status" aria-live="polite">
          {completionBadge}
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
          <p>{surfaceConfig.nextStepLead}</p>
          <div className="conflict-resolver__proposal-actions">
            {session.innerRecommendations.map((item) => {
              const mapped = mapRecommendationForSurface(item, surface);
              return (
                <a key={item.id} href={mapped.href} className="btn">
                  {mapped.ctaLabel}
                </a>
              );
            })}
          </div>
        </article>
        <ConflictKpiSnapshot />
        <button type="button" className="btn btn--primary conflict-resolver__primary-cta" onClick={session.resetFlow}>
          {resetLabel}
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
