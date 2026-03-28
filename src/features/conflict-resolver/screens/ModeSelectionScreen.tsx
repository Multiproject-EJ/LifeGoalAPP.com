import type { ConflictType } from '../types/conflictSession';

type ModeSelectionScreenProps = {
  selectedType: ConflictType | null;
  onSelectType: (type: ConflictType) => void;
  onContinue: () => void | Promise<void>;
  sharedSessionId: string | null;
  sharedSessionCodeInput: string;
  onSharedSessionCodeInputChange: (value: string) => void;
  sharedParticipantCount: number;
  sharedSessionLastSyncedAt: string | null;
  onCreateSharedSession: () => void | Promise<void>;
  onJoinSharedSession: () => void | Promise<void>;
  onRefreshSharedSession: () => void | Promise<void>;
  sharedSessionError: string | null;
  sharedSessionBusy: boolean;
};

export function ModeSelectionScreen({
  selectedType,
  onSelectType,
  onContinue,
  sharedSessionId,
  sharedSessionCodeInput,
  onSharedSessionCodeInputChange,
  sharedParticipantCount,
  sharedSessionLastSyncedAt,
  onCreateSharedSession,
  onJoinSharedSession,
  onRefreshSharedSession,
  sharedSessionError,
  sharedSessionBusy,
}: ModeSelectionScreenProps) {
  return (
    <section className="conflict-resolver__screen" aria-labelledby="conflict-mode-title">
      <header className="conflict-resolver__header">
        <h3 id="conflict-mode-title" className="conflict-resolver__title">Let’s clear something up</h3>
        <p className="conflict-resolver__subtitle">No blame. Just clarity.</p>
      </header>

      <div className="conflict-resolver__mode-grid" role="radiogroup" aria-label="Conflict type">
        <button
          type="button"
          role="radio"
          aria-checked={selectedType === 'inner_tension'}
          className={`conflict-resolver__mode-card ${
            selectedType === 'inner_tension' ? 'conflict-resolver__mode-card--selected' : ''
          }`}
          onClick={() => onSelectType('inner_tension')}
        >
          <span className="conflict-resolver__mode-icon" aria-hidden="true">🧠</span>
          <span className="conflict-resolver__mode-title">Inner Tension</span>
          <span className="conflict-resolver__mode-subtitle">You vs yourself</span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={selectedType === 'shared_conflict'}
          className={`conflict-resolver__mode-card ${
            selectedType === 'shared_conflict' ? 'conflict-resolver__mode-card--selected' : ''
          }`}
          onClick={() => onSelectType('shared_conflict')}
        >
          <span className="conflict-resolver__mode-icon" aria-hidden="true">🤝</span>
          <span className="conflict-resolver__mode-title">Shared Conflict</span>
          <span className="conflict-resolver__mode-subtitle">You + others</span>
        </button>
      </div>

      {selectedType === 'shared_conflict' ? (
        <section className="conflict-resolver__shared-session-card" aria-label="Shared conflict session setup">
          <h4>Shared session setup</h4>
          <p>Create a session code and share it with another app user, or join theirs.</p>

          {sharedSessionId ? (
            <div className="conflict-resolver__shared-session-status">
              <p><strong>Session code:</strong> {sharedSessionId}</p>
              <p><strong>Participants joined:</strong> {sharedParticipantCount}</p>
              <p>
                <strong>Last sync:</strong>{' '}
                {sharedSessionLastSyncedAt ? new Date(sharedSessionLastSyncedAt).toLocaleTimeString() : 'Pending'}
              </p>
              <button type="button" className="btn" onClick={onRefreshSharedSession} disabled={sharedSessionBusy}>
                Refresh participants
              </button>
            </div>
          ) : (
            <>
              <div className="conflict-resolver__shared-session-actions">
                <button type="button" className="btn" onClick={onCreateSharedSession} disabled={sharedSessionBusy}>
                  Create shared session
                </button>
              </div>

              <label htmlFor="shared-session-code" className="conflict-resolver__prompt-label">Join by session code</label>
              <div className="conflict-resolver__shared-session-actions">
                <input
                  id="shared-session-code"
                  className="conflict-resolver__text-input"
                  placeholder="Paste session code"
                  value={sharedSessionCodeInput}
                  onChange={(event) => onSharedSessionCodeInputChange(event.target.value)}
                />
                <button type="button" className="btn" onClick={onJoinSharedSession} disabled={sharedSessionBusy}>
                  Join
                </button>
              </div>
            </>
          )}

          {sharedSessionError ? <p className="conflict-resolver__input-error">{sharedSessionError}</p> : null}
        </section>
      ) : null}

      <button
        type="button"
        className="btn btn--primary conflict-resolver__primary-cta"
        disabled={!selectedType || (selectedType === 'shared_conflict' && !sharedSessionId)}
        onClick={onContinue}
      >
        Continue
      </button>
    </section>
  );
}
