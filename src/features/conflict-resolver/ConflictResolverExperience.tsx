import { ModeSelectionScreen } from './screens/ModeSelectionScreen';
import { GroundingScreen } from './screens/GroundingScreen';
import { PrivateCaptureScreen } from './screens/PrivateCaptureScreen';
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

  return (
    <section className="conflict-resolver__screen" aria-labelledby="conflict-ready-title">
      <header className="conflict-resolver__header">
        <h3 id="conflict-ready-title" className="conflict-resolver__title">Ready for Shared Step</h3>
        <p className="conflict-resolver__subtitle">
          Stage 3 (Collect &amp; Pile) is next. Your private responses are saved in-session for this prototype flow.
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
        <button type="button" className="btn" onClick={session.resetFlow}>
          Start over
        </button>
        <button type="button" className="btn btn--primary" disabled>
          Continue (Stage 3 coming next PR)
        </button>
      </div>
    </section>
  );
}
