import { ModeSelectionScreen } from './screens/ModeSelectionScreen';
import { GroundingScreen } from './screens/GroundingScreen';
import { PrivateCaptureScreen } from './screens/PrivateCaptureScreen';
import { CollectPileScreen } from './screens/CollectPileScreen';
import { ParallelReadScreen } from './screens/ParallelReadScreen';
import { ResolutionBuilderScreen } from './screens/ResolutionBuilderScreen';
import { ApologyAlignmentScreen } from './screens/ApologyAlignmentScreen';
import { useConflictSession } from './hooks/useConflictSession';
import './conflictResolver.css';

export function ConflictResolverExperience() {
  const session = useConflictSession();

  if (session.stage === 'mode_selection') {
    return (
      <ModeSelectionScreen
        selectedType={session.selectedType}
        onSelectType={session.setSelectedType}
        onContinue={session.goToGrounding}
      />
    );
  }

  if (session.stage === 'grounding') {
    return (
      <GroundingScreen
        statementIndex={session.groundingIndex}
        statements={session.groundingStatements}
        onNextStatement={session.nextGroundingStatement}
        onReady={session.startPrivateCapture}
      />
    );
  }

  if (session.stage === 'private_capture') {
    return (
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
    return <CollectPileScreen summaryCards={session.summaryCards} onContinue={session.enterParallelRead} />;
  }

  if (session.stage === 'parallel_read') {
    return <ParallelReadScreen summaryCards={session.summaryCards} onComplete={session.completeParallelRead} />;
  }

  if (session.stage === 'resolution_builder') {
    return (
      <ResolutionBuilderScreen
        options={session.resolutionOptions}
        selectedOptionId={session.selectedResolution}
        onSelectOption={session.setSelectedResolution}
        whiteFlagOffer={session.whiteFlagOffer}
        onWhiteFlagOfferChange={session.setWhiteFlagOffer}
        onContinue={session.moveToApologyAlignment}
      />
    );
  }

  if (session.stage === 'apology_alignment') {
    return (
      <ApologyAlignmentScreen
        selectedType={session.selectedApologyType}
        onSelectType={session.setSelectedApologyType}
        timingMode={session.apologyTiming}
        onTimingModeChange={session.setApologyTiming}
        onContinue={session.completeApologyAlignment}
      />
    );
  }

  return (
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
