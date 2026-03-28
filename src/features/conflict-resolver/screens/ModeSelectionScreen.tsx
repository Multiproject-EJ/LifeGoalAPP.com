import type { ConflictType } from '../types/conflictSession';

type ModeSelectionScreenProps = {
  selectedType: ConflictType | null;
  onSelectType: (type: ConflictType) => void;
  onContinue: () => void;
};

export function ModeSelectionScreen({ selectedType, onSelectType, onContinue }: ModeSelectionScreenProps) {
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

      <button
        type="button"
        className="btn btn--primary conflict-resolver__primary-cta"
        disabled={!selectedType}
        onClick={onContinue}
      >
        Continue
      </button>
    </section>
  );
}
