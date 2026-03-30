import { useEffect, useMemo, useState } from 'react';

type SummaryCard = {
  id: string;
  title: string;
  text: string;
  toneSoftened?: boolean;
  moderationNotes?: string[];
};

type CollectPileScreenProps = {
  summaryCards: readonly SummaryCard[];
  aiMode?: 'premium' | 'free_quota' | 'fallback' | null;
  onContinue: () => void;
};

const STATUS_STEPS = ['Collecting perspectives…', 'Balancing language…', 'Preparing shared summary…'] as const;

function renderModeLabel(mode: 'premium' | 'free_quota' | 'fallback'): string {
  if (mode === 'premium') return 'Premium AI';
  if (mode === 'free_quota') return 'Free AI';
  return 'Fallback';
}

export function CollectPileScreen({ summaryCards, aiMode, onContinue }: CollectPileScreenProps) {
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    if (statusIndex >= STATUS_STEPS.length - 1) return;
    const timer = window.setTimeout(() => setStatusIndex((prev) => prev + 1), 850);
    return () => window.clearTimeout(timer);
  }, [statusIndex]);

  const isReady = statusIndex >= STATUS_STEPS.length - 1;
  const visibleCards = useMemo(() => summaryCards.slice(0, statusIndex + 1), [summaryCards, statusIndex]);

  return (
    <section className="conflict-resolver__screen" aria-labelledby="collect-pile-title">
      <header className="conflict-resolver__header">
        <h3 id="collect-pile-title" className="conflict-resolver__title">Let’s gather what matters</h3>
        <p className="conflict-resolver__subtitle">{STATUS_STEPS[statusIndex]}</p>
        {aiMode ? (
          <p className="conflict-resolver__ai-mode-pill">
            Shared summary source: {renderModeLabel(aiMode)}
          </p>
        ) : null}
      </header>

      <div className="conflict-resolver__pile-stack" aria-live="polite">
        {visibleCards.map((card, index) => (
          <article
            key={card.id}
            className="conflict-resolver__pile-card"
            style={{ transform: `translateY(${index * 4}px) scale(${1 - index * 0.01})` }}
          >
            <h4>{card.title}</h4>
            <p>{card.text}</p>
            {card.toneSoftened ? (
              <div className="conflict-resolver__softened-note">
                <p>Tone softened for shared clarity.</p>
                {card.moderationNotes?.length ? (
                  <ul>
                    {card.moderationNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <button
        type="button"
        className="btn btn--primary conflict-resolver__primary-cta"
        disabled={!isReady}
        onClick={onContinue}
      >
        Continue to Parallel Read
      </button>
    </section>
  );
}
