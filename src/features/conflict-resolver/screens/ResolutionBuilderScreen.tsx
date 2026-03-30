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
  proposalQueue: { id: string; text: string }[];
  activeProposalId: string | null;
  onQueueWhiteFlagOffer: () => void;
  onPromoteProposal: (id: string) => void;
  onRemoveProposal: (id: string) => void;
  parallelAnnotationItems: { id: string; label: string; tag: 'accurate' | 'missing' | 'note' }[];
  aiMode?: 'premium' | 'free_quota' | 'fallback' | null;
  fairnessWarnings?: Array<{ code: string; message: string }>;
  onContinue: () => void;
};

export function ResolutionBuilderScreen({
  options,
  selectedOptionId,
  onSelectOption,
  whiteFlagOffer,
  onWhiteFlagOfferChange,
  proposalQueue,
  activeProposalId,
  onQueueWhiteFlagOffer,
  onPromoteProposal,
  onRemoveProposal,
  parallelAnnotationItems,
  aiMode,
  fairnessWarnings = [],
  onContinue,
}: ResolutionBuilderScreenProps) {
  const canContinue = Boolean(selectedOptionId) || Boolean(activeProposalId);

  return (
    <section className="conflict-resolver__screen" aria-labelledby="resolution-builder-title">
      <header className="conflict-resolver__header">
        <h3 id="resolution-builder-title" className="conflict-resolver__title">Let’s move forward</h3>
        <p className="conflict-resolver__subtitle">Pick a constructive option or draft a white-flag offer.</p>
        {aiMode ? (
          <p className="conflict-resolver__ai-mode-pill">Option source: {aiMode === 'premium' ? 'Premium AI' : aiMode === 'free_quota' ? 'Free AI' : 'Fallback'}</p>
        ) : null}
      </header>
      {fairnessWarnings.length > 0 ? (
        <section className="conflict-resolver__fairness-note" aria-label="Fairness checks">
          <h4>Fairness checks flagged</h4>
          <ul>
            {fairnessWarnings.map((warning) => (
              <li key={warning.code}>{warning.message}</li>
            ))}
          </ul>
        </section>
      ) : null}

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
        <button
          type="button"
          className="btn"
          disabled={whiteFlagOffer.trim().length === 0}
          onClick={onQueueWhiteFlagOffer}
        >
          Park in proposal queue
        </button>
      </div>

      {proposalQueue.length > 0 ? (
        <section className="conflict-resolver__proposal-queue" aria-label="Proposal queue">
          <h4>Proposal queue</h4>
          <p>Queue ideas first, then promote one when both sides are ready.</p>
          <ul>
            {proposalQueue.map((proposal) => (
              <li key={proposal.id}>
                <span>{proposal.text}</span>
                <div className="conflict-resolver__proposal-actions">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => onPromoteProposal(proposal.id)}
                  >
                    {proposal.id === activeProposalId ? 'Active proposal' : 'Promote'}
                  </button>
                  <button type="button" className="btn" onClick={() => onRemoveProposal(proposal.id)}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {parallelAnnotationItems.length > 0 ? (
        <section className="conflict-resolver__annotation-summary" aria-label="Parallel read highlights">
          <h4>Parallel read highlights</h4>
          <ul>
            {parallelAnnotationItems.map((item) => (
              <li key={item.id}>
                <span>{item.label}</span>
                <strong>{item.tag}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <button
        type="button"
        className="btn btn--primary conflict-resolver__primary-cta"
        disabled={!canContinue}
        onClick={onContinue}
      >
        Continue to apology alignment
      </button>
    </section>
  );
}
