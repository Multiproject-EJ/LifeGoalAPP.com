import React from 'react';
import { CREATURE_CATALOG } from '../services/creatureCatalog';
import type { ClaimWelcomePackStarterCardsResult } from '../services/islandRunWelcomePackClaimAction';

export interface WelcomePackPrototypeModalProps {
  open: boolean;
  onClose: () => void;
  onClaim?: () => Promise<void>;
  claimPending?: boolean;
  claimError?: string | null;
  claimResult?: ClaimWelcomePackStarterCardsResult | null;
}

const PLACEHOLDER_CARDS = Array.from({ length: 5 }, (_, index) => ({
  id: index,
  title: `Starter Card ${index + 1}`,
}));

export function WelcomePackPrototypeModal({
  open,
  onClose,
  onClaim,
  claimPending = false,
  claimError = null,
  claimResult = null,
}: WelcomePackPrototypeModalProps): React.JSX.Element | null {
  if (!open) return null;
  const resolvedCards = claimResult?.revealPayload?.cards ?? [];
  const isAlreadyClaimed = claimResult?.status === 'already_claimed';
  const hasClaimedCards = claimResult?.status === 'claimed' && resolvedCards.length > 0;

  return (
    <div className="welcome-pack-prototype" role="dialog" aria-modal="true" aria-labelledby="welcome-pack-prototype-title">
      <section className="welcome-pack-prototype__shell island-stop-modal island-stop-modal--onboarding">
        <header className="welcome-pack-prototype__header">
          <p className="welcome-pack-prototype__eyebrow">Island Run starter reward · dev prototype</p>
          <h2 id="welcome-pack-prototype-title">Welcome Pack</h2>
          <p>Dev-only preview using canonical claim action. No dice, essence, or tickets are included.</p>
        </header>

        {hasClaimedCards ? (
          <div className="welcome-pack-prototype__cards" aria-label="Welcome Pack revealed cards">
            {resolvedCards.map((card, index) => {
              const creature = CREATURE_CATALOG.find((entry) => entry.id === card.creatureId);
              const creatureName = creature?.name ?? card.creatureId;
              return (
                <article key={`${card.slotIndex}:${card.creatureId}:${index}`} className="welcome-pack-prototype__card-slot" aria-label={`Card ${index + 1}: ${creatureName}`}>
                  <span>✦</span>
                  <strong>{creatureName}</strong>
                  <small>{card.tier} · card {index + 1}</small>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="welcome-pack-prototype__cards" aria-label="Welcome Pack placeholder card slots">
            {PLACEHOLDER_CARDS.map((card) => (
              <article key={card.id} className="welcome-pack-prototype__card-slot" aria-label={card.title}>
                <span>✦</span>
                <strong>{card.title}</strong>
                <small>Random card slot</small>
              </article>
            ))}
          </div>
        )}

        <div className="welcome-pack-prototype__reward-grid" aria-label="Welcome Pack included rewards">
          <p><strong>5</strong> random starter cards</p>
          <p><strong>0</strong> dice</p>
          <p><strong>0</strong> event tickets</p>
          <p><strong>0</strong> essence</p>
        </div>
        {isAlreadyClaimed ? (
          <p className="welcome-pack-prototype__status" role="status" aria-live="polite">Already claimed in canonical state. No additional cards were granted.</p>
        ) : null}
        {hasClaimedCards ? (
          <p className="welcome-pack-prototype__status" role="status" aria-live="polite">Claimed! Showing canonical 5-card payload from this run.</p>
        ) : null}
        {claimError ? (
          <p className="welcome-pack-prototype__status welcome-pack-prototype__status--error" role="alert">{claimError}</p>
        ) : null}

        <div className="welcome-pack-prototype__actions island-stop-modal__actions island-stop-modal__actions--balanced island-stop-modal__actions--aligned island-stop-modal__actions--anchored">
          <button
            type="button"
            className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
            onClick={() => { void onClaim?.(); }}
            disabled={claimPending || isAlreadyClaimed || !onClaim}
          >
            {claimPending ? 'Claiming…' : isAlreadyClaimed ? 'Already claimed' : 'Claim real 5-card pack'}
          </button>
          <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary" onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    </div>
  );
}
