import React from 'react';

export interface WelcomePackPrototypeModalProps {
  open: boolean;
  onClose: () => void;
  ctaLabel?: string;
}

const PLACEHOLDER_CARDS = Array.from({ length: 5 }, (_, index) => ({
  id: index,
  title: `Starter Card ${index + 1}`,
}));

export function WelcomePackPrototypeModal({
  open,
  onClose,
  ctaLabel = 'Collect Welcome Pack',
}: WelcomePackPrototypeModalProps): React.JSX.Element | null {
  if (!open) return null;

  return (
    <div className="welcome-pack-prototype" role="dialog" aria-modal="true" aria-labelledby="welcome-pack-prototype-title">
      <section className="welcome-pack-prototype__shell island-stop-modal island-stop-modal--onboarding">
        <header className="welcome-pack-prototype__header">
          <p className="welcome-pack-prototype__eyebrow">Island Run starter reward · UI prototype only</p>
          <h2 id="welcome-pack-prototype-title">Welcome Pack</h2>
          <p>Your island adventure starts with a premium boost. No rewards are granted in this preview.</p>
        </header>

        <div className="welcome-pack-prototype__cards" aria-label="Welcome Pack placeholder card slots">
          {PLACEHOLDER_CARDS.map((card) => (
            <article key={card.id} className="welcome-pack-prototype__card-slot" aria-label={card.title}>
              <span>✦</span>
              <strong>{card.title}</strong>
              <small>Random card slot</small>
            </article>
          ))}
        </div>

        <div className="welcome-pack-prototype__reward-grid" aria-label="Welcome Pack included rewards">
          <p><strong>5</strong> random starter cards</p>
          <p><strong>150</strong> dice</p>
          <p><strong>20</strong> event tickets</p>
          <p><strong>2000</strong> essence</p>
        </div>

        <div className="welcome-pack-prototype__actions island-stop-modal__actions island-stop-modal__actions--balanced island-stop-modal__actions--aligned island-stop-modal__actions--anchored">
          <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary" onClick={onClose}>
            {ctaLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
