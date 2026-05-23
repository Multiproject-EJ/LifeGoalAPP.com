import React from 'react';
import { CREATURE_CATALOG } from '../services/creatureCatalog';
import type { ClaimFullWelcomePackResult } from '../services/islandRunWelcomePackFullClaimAction';

export interface WelcomePackPrototypeModalProps {
  open: boolean;
  onClose: () => void;
  onClaim?: () => Promise<void>;
  claimPending?: boolean;
  claimError?: string | null;
  claimResult?: ClaimFullWelcomePackResult | null;
  isDevPreview?: boolean;
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
  isDevPreview = false,
}: WelcomePackPrototypeModalProps): React.JSX.Element | null {
  if (!open) return null;
  const resolvedCards = claimResult?.cards.revealPayload?.cards ?? [];
  const isAlreadyClaimed = claimResult?.cards.status === 'already_claimed' && claimResult?.bundle.status === 'already_claimed';
  const hasClaimedCards = claimResult?.cards.status === 'claimed' && resolvedCards.length > 0;
  const noActiveEventFallback = claimResult?.bundle.status === 'claimed_without_active_event';

  return (
    <div className="welcome-pack-prototype" role="dialog" aria-modal="true" aria-labelledby="welcome-pack-prototype-title">
      <section className="welcome-pack-prototype__shell island-stop-modal island-stop-modal--onboarding">
        <header className="welcome-pack-prototype__header">
          <p className="welcome-pack-prototype__eyebrow">Island Run starter reward{isDevPreview ? ' · dev preview enabled' : ''}</p>
          <h2 id="welcome-pack-prototype-title">Welcome Pack</h2>
          <p>Claim uses canonical Welcome Pack actions; opening this modal alone grants nothing.</p>
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
          <p><strong>150</strong> dice</p>
          <p><strong>20</strong> active-event tickets (when an event is running)</p>
          <p><strong>2000</strong> essence</p>
        </div>
        {isAlreadyClaimed ? (
          <p className="welcome-pack-prototype__status" role="status" aria-live="polite">Already claimed in canonical state. No additional cards were granted.</p>
        ) : null}
        {hasClaimedCards ? (
          <p className="welcome-pack-prototype__status" role="status" aria-live="polite">Claimed! Showing canonical 5-card payload from this run.</p>
        ) : null}
        {noActiveEventFallback ? (
          <p className="welcome-pack-prototype__status" role="status" aria-live="polite">No active event was running, so event tickets were not granted on this claim.</p>
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
            {claimPending ? 'Claiming…' : isAlreadyClaimed ? 'Already claimed' : 'Collect Welcome Pack'}
          </button>
          <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary" onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    </div>
  );
}
