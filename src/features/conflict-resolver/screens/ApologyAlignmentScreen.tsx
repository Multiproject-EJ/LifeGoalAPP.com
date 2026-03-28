type ApologyType = 'acknowledge_impact' | 'take_responsibility' | 'repair_action' | 'reassurance';
type ApologyTiming = 'simultaneous' | 'sequenced';

type ApologyAlignmentScreenProps = {
  selectedType: ApologyType | null;
  onSelectType: (type: ApologyType) => void;
  timingMode: ApologyTiming;
  onTimingModeChange: (mode: ApologyTiming) => void;
  onContinue: () => void;
};

const APOLOGY_OPTIONS: Array<{ id: ApologyType; label: string; description: string }> = [
  { id: 'acknowledge_impact', label: 'Acknowledge impact', description: 'Name what the other person felt.' },
  { id: 'take_responsibility', label: 'Take responsibility', description: 'Own your part without excuses.' },
  { id: 'repair_action', label: 'Repair action', description: 'Offer a concrete corrective action.' },
  { id: 'reassurance', label: 'Reassurance', description: 'State how you will prevent repeat harm.' },
];

export function ApologyAlignmentScreen({
  selectedType,
  onSelectType,
  timingMode,
  onTimingModeChange,
  onContinue,
}: ApologyAlignmentScreenProps) {
  return (
    <section className="conflict-resolver__screen" aria-labelledby="apology-alignment-title">
      <header className="conflict-resolver__header">
        <h3 id="apology-alignment-title" className="conflict-resolver__title">Apology alignment</h3>
        <p className="conflict-resolver__subtitle">Choose type and timing so repair feels fair for both sides.</p>
      </header>

      <div className="conflict-resolver__chips">
        {APOLOGY_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`conflict-resolver__chip ${selectedType === option.id ? 'conflict-resolver__chip--selected' : ''}`}
            onClick={() => onSelectType(option.id)}
          >
            <strong>{option.label}</strong>
            <span>{option.description}</span>
          </button>
        ))}
      </div>

      <div className="conflict-resolver__timing-row" role="group" aria-label="Apology timing mode">
        <button
          type="button"
          className={`btn ${timingMode === 'simultaneous' ? 'btn--primary' : ''}`}
          onClick={() => onTimingModeChange('simultaneous')}
        >
          Simultaneous
        </button>
        <button
          type="button"
          className={`btn ${timingMode === 'sequenced' ? 'btn--primary' : ''}`}
          onClick={() => onTimingModeChange('sequenced')}
        >
          Sequenced
        </button>
      </div>

      <button
        type="button"
        className="btn btn--primary conflict-resolver__primary-cta"
        disabled={!selectedType}
        onClick={onContinue}
      >
        Continue to agreement preview
      </button>
    </section>
  );
}
