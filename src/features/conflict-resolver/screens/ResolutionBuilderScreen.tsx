type ResolutionOption = {
  id: string;
  title: string;
  description: string;
};

type ResolutionBuilderScreenProps = {
  options: readonly ResolutionOption[];
  selectedOptionId: string | null;
  onSelectOption: (id: string) => void;
  whiteFlagOffer: string;
  onWhiteFlagOfferChange: (value: string) => void;
  onContinue: () => void;
};

export function ResolutionBuilderScreen({
  options,
  selectedOptionId,
  onSelectOption,
  whiteFlagOffer,
  onWhiteFlagOfferChange,
  onContinue,
}: ResolutionBuilderScreenProps) {
  return (
    <section className="conflict-resolver__screen" aria-labelledby="resolution-builder-title">
      <header className="conflict-resolver__header">
        <h3 id="resolution-builder-title" className="conflict-resolver__title">Let’s move forward</h3>
        <p className="conflict-resolver__subtitle">Pick a constructive option or draft a white-flag offer.</p>
      </header>

      <div className="conflict-resolver__options-grid">
        {options.map((option) => (
          <article
            key={option.id}
            className={`conflict-resolver__option-card ${
              selectedOptionId === option.id ? 'conflict-resolver__option-card--selected' : ''
            }`}
          >
            <h4>{option.title}</h4>
            <p>{option.description}</p>
            <button type="button" className="btn" onClick={() => onSelectOption(option.id)}>
              {selectedOptionId === option.id ? 'Selected' : 'Select option'}
            </button>
          </article>
        ))}
      </div>

      <div className="conflict-resolver__white-flag">
        <label htmlFor="white-flag-input" className="conflict-resolver__prompt-label">🕊 White Flag offer</label>
        <textarea
          id="white-flag-input"
          className="conflict-resolver__prompt-input"
          placeholder="Offer a constructive move..."
          value={whiteFlagOffer}
          onChange={(event) => onWhiteFlagOfferChange(event.target.value)}
          rows={4}
        />
      </div>

      <button
        type="button"
        className="btn btn--primary conflict-resolver__primary-cta"
        disabled={!selectedOptionId && whiteFlagOffer.trim().length === 0}
        onClick={onContinue}
      >
        Continue to apology alignment
      </button>
    </section>
  );
}
