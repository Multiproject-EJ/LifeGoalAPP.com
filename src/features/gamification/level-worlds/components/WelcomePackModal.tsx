import React from 'react';
import { CREATURE_CATALOG } from '../services/creatureCatalog';
import type { ClaimFullWelcomePackResult } from '../services/islandRunWelcomePackFullClaimAction';

export interface WelcomePackModalProps {
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

const VISUAL_GIFT_SLOTS = [
  { icon: '🃏', label: 'Starter cards', value: '5' },
  { icon: '🎲', label: 'Dice', value: '150' },
  { icon: '⚡', label: 'Essence', value: '2000' },
  { icon: '🎟️', label: 'Event tickets', value: '20' },
  { icon: '🎁', label: 'Bonus gift', value: 'Soon' },
  { icon: '🎁', label: 'Bonus gift', value: 'Soon' },
  { icon: '🎁', label: 'Bonus gift', value: 'Soon' },
] as const;

export function WelcomePackModal({
  open,
  onClose,
  onClaim,
  claimPending = false,
  claimError = null,
  claimResult = null,
  isDevPreview = false,
}: WelcomePackModalProps): React.JSX.Element | null {
  if (!open) return null;
  const resolvedCards = claimResult?.cards.revealPayload?.cards ?? [];
  const isAlreadyClaimed = claimResult?.cards.status === 'already_claimed' && claimResult?.bundle.status === 'already_claimed';
  const hasClaimedCards = claimResult?.cards.status === 'claimed' && resolvedCards.length > 0;
  const noActiveEventFallback = claimResult?.bundle.status === 'claimed_without_active_event';
  const isPartialClaim = claimResult?.status === 'partially_claimed';
  const ctaLabel = claimPending
    ? 'Claiming…'
    : isAlreadyClaimed
      ? 'Already claimed'
      : isPartialClaim
        ? 'Collect remaining rewards'
        : 'Collect Welcome Pack';

  return (
    <div className="welcome-pack-modal" role="dialog" aria-modal="true" aria-labelledby="welcome-pack-modal-title">
      <section className="welcome-pack-modal__shell island-stop-modal island-stop-modal--onboarding">
        <header className="welcome-pack-modal__header">
          <p className="welcome-pack-modal__eyebrow">🎉 Congratulations{isDevPreview ? ' · dev preview enabled' : ''}</p>
          <h2 id="welcome-pack-modal-title">Welcome Pack</h2>
          <p>A one-time starter reward for new Island Run players. Opening this modal does not grant rewards until you press Collect.</p>
        </header>

        <div className="welcome-pack-modal__gift-grid" aria-label="Welcome Pack gift preview">
          {VISUAL_GIFT_SLOTS.map((gift, index) => (
            <article key={`${gift.label}-${index}`} className="welcome-pack-modal__gift-item">
              <span className="welcome-pack-modal__gift-icon" aria-hidden="true">{gift.icon}</span>
              <strong>{gift.value}</strong>
              <small>{gift.label}</small>
            </article>
          ))}
        </div>

        {hasClaimedCards ? (
          <div className="welcome-pack-modal__cards" aria-label="Welcome Pack revealed cards">
            {resolvedCards.map((card, index) => {
              const creature = CREATURE_CATALOG.find((entry) => entry.id === card.creatureId);
              const creatureName = creature?.name ?? card.creatureId;
              return (
                <article key={`${card.slotIndex}:${card.creatureId}:${index}`} className="welcome-pack-modal__card-slot" aria-label={`Card ${index + 1}: ${creatureName}`}>
                  <span>✦</span>
                  <strong>{creatureName}</strong>
                  <small>{card.tier} · card {index + 1}</small>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="welcome-pack-modal__cards" aria-label="Welcome Pack placeholder card slots">
            {PLACEHOLDER_CARDS.map((card) => (
              <article key={card.id} className="welcome-pack-modal__card-slot" aria-label={card.title}>
                <span>✦</span>
                <strong>{card.title}</strong>
                <small>Random card slot</small>
              </article>
            ))}
          </div>
        )}

        <div className="welcome-pack-modal__reward-grid" aria-label="Welcome Pack included rewards">
          <p><strong>5</strong> creature cards</p>
          <p><strong>150</strong> dice</p>
          {noActiveEventFallback ? null : <p><strong>20</strong> event tickets (only if an event is active at claim time)</p>}
          <p><strong>2000</strong> essence</p>
        </div>
        {isAlreadyClaimed ? (
          <p className="welcome-pack-modal__status" role="status" aria-live="polite">Already claimed. This pack can only be collected once.</p>
        ) : null}
        {hasClaimedCards ? (
          <p className="welcome-pack-modal__status" role="status" aria-live="polite">Welcome Pack collected successfully.</p>
        ) : null}
        {noActiveEventFallback ? (
          <p className="welcome-pack-modal__status" role="status" aria-live="polite">No active event was running, so event tickets were not granted on this claim.</p>
        ) : null}
        {isPartialClaim ? (
          <p className="welcome-pack-modal__status" role="status" aria-live="polite">Partial claim completed: already-claimed items were skipped, and remaining rewards were granted exactly once.</p>
        ) : null}
        {claimError ? (
          <p className="welcome-pack-modal__status welcome-pack-modal__status--error" role="alert">{claimError}</p>
        ) : null}

        <div className="welcome-pack-modal__actions island-stop-modal__actions island-stop-modal__actions--balanced island-stop-modal__actions--aligned island-stop-modal__actions--anchored">
          <button
            type="button"
            className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
            onClick={() => { void onClaim?.(); }}
            disabled={claimPending || isAlreadyClaimed || !onClaim}
          >
            {ctaLabel}
          </button>
          <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary" onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    </div>
  );
}
