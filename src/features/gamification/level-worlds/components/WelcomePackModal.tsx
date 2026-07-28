import React from 'react';
import { CREATURE_CATALOG } from '../services/creatureCatalog';
import { CreatureCard } from './CreatureCard';
import { CelebrationFireworks } from '../../../../components/CelebrationFireworks';
import {
  CreaturePackOpeningAnimation,
  preloadCreaturePackOpeningAnimation,
} from '../../../../components/CreaturePackOpeningAnimation';
import type { ClaimFullWelcomePackResult } from '../services/islandRunWelcomePackFullClaimAction';
import type { ClaimWelcomePackRewardBundleResult } from '../services/islandRunWelcomePackRewardBundleAction';
import { buildWelcomePackStarterCacheBody } from '../services/islandRunWelcomePackCopy';

import { lockPageScroll } from '../../../../utils/scrollLock';
export interface WelcomePackModalProps {
  open: boolean;
  onClose: () => void;
  onClaim?: () => Promise<void>;
  claimPending?: boolean;
  claimError?: string | null;
  claimResult?: ClaimFullWelcomePackResult | null;
  bundleOnlyClaimResult?: ClaimWelcomePackRewardBundleResult | null;
  deferCreaturePack?: boolean;
  isDevPreview?: boolean;
  displayName?: string | null;
}

type Phase = 'economy' | 'cards-intro' | 'pack-opening' | 'card-reveal';
type WelcomePackPhase = Phase | 'deferred';

export function WelcomePackModal({
  open,
  onClose,
  onClaim,
  claimPending = false,
  claimError = null,
  claimResult = null,
  bundleOnlyClaimResult = null,
  deferCreaturePack = false,
  isDevPreview = false,
  displayName = null,
}: WelcomePackModalProps): React.JSX.Element | null {
  const [phase, setPhase] = React.useState<WelcomePackPhase>('economy');
  const [collectAnimating, setCollectAnimating] = React.useState(false);
  const [revealIndex, setRevealIndex] = React.useState(0);

  React.useEffect(() => {
    if (!open) {
      setPhase('economy');
      setCollectAnimating(false);
      setRevealIndex(0);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;
    return lockPageScroll();
  }, [open]);

  React.useEffect(() => {
    if (open && !deferCreaturePack) preloadCreaturePackOpeningAnimation();
  }, [deferCreaturePack, open]);

  if (!open) return null;

  const resolvedCards = claimResult?.cards.revealPayload?.cards ?? [];
  const starterCacheBody = buildWelcomePackStarterCacheBody({ displayName });
  const isAlreadyClaimed = deferCreaturePack
    ? bundleOnlyClaimResult?.status === 'already_claimed'
    : claimResult?.cards.status === 'already_claimed'
      && claimResult?.bundle.status === 'already_claimed';

  const handleCollectEconomy = async () => {
    if (claimPending || collectAnimating) return;
    setCollectAnimating(true);
    if (!isAlreadyClaimed && onClaim) {
      await onClaim();
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 700));
    setCollectAnimating(false);
    setPhase(deferCreaturePack ? 'deferred' : 'cards-intro');
  };

  const handleAdvanceCard = () => {
    if (revealIndex < resolvedCards.length - 1) {
      setRevealIndex((i) => i + 1);
    } else {
      onClose();
    }
  };

  if (phase === 'economy') {
    return (
      <div className="island-run-overlay-root wpm-overlay" role="dialog" aria-modal="true" aria-labelledby="wpm-title">
        <div className={`wpm-shell wpm-shell--economy${collectAnimating ? ' wpm-shell--pulse' : ''}`}>
          <p className="wpm-eyebrow">
            {isDevPreview ? '✦ Dev Preview' : 'Compass Expedition'}
          </p>
          <h2 id="wpm-title" className="wpm-title">Compass Expedition Starter Cache</h2>

          <p className="wpm-body">{starterCacheBody}</p>

          <div className="wpm-economy-tiles">
            <div className="wpm-economy-tile">
              <span className="wpm-economy-tile__icon">🎲</span>
              <strong className="wpm-economy-tile__value">150</strong>
              <span className="wpm-economy-tile__label">Dice</span>
            </div>
            <div className="wpm-economy-tile">
              <span className="wpm-economy-tile__icon">💰</span>
              <strong className="wpm-economy-tile__value">2000</strong>
              <span className="wpm-economy-tile__label">Money</span>
            </div>
          </div>

          {claimError ? (
            <p className="wpm-error" role="alert">{claimError}</p>
          ) : null}

          {isAlreadyClaimed ? (
            <p className="wpm-already-claimed" role="status">
              {deferCreaturePack ? 'Starter supplies already secured.' : 'Already claimed — opening card reveal.'}
            </p>
          ) : null}

          <button
            type="button"
            className="wpm-collect-btn"
            onClick={() => { void handleCollectEconomy(); }}
            disabled={claimPending || collectAnimating || (!isAlreadyClaimed && !onClaim)}
          >
            {collectAnimating ? (
              <span className="wpm-collect-btn__spinner" aria-hidden="true" />
            ) : null}
            {collectAnimating
              ? 'Collecting…'
              : isAlreadyClaimed
                ? deferCreaturePack ? 'Continue' : 'View Cards'
                : 'Collect Starter Cache'}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'deferred') {
    return (
      <div className="island-run-overlay-root wpm-overlay" role="dialog" aria-modal="true" aria-labelledby="wpm-title-deferred">
        <div className="wpm-shell wpm-shell--cards-intro wpm-shell--enter">
          <p className="wpm-eyebrow">Supplies secured</p>
          <h2 id="wpm-title-deferred" className="wpm-title">The creature signal remains sealed</h2>
          <div className="wpm-big-card-icon" aria-hidden="true">🥚</div>
          <p className="wpm-body">
            Your resources are ready. The creature pack will answer from Island 2.
          </p>
          <button type="button" className="wpm-collect-btn" onClick={onClose}>
            Begin the mission
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'cards-intro') {
    return (
      <div className="island-run-overlay-root wpm-overlay" role="dialog" aria-modal="true" aria-labelledby="wpm-title-cards">
        <CelebrationFireworks variant="hero" />
        <div className="wpm-shell wpm-shell--cards-intro wpm-shell--enter">
          <p className="wpm-eyebrow">First Light Shore</p>
          <h2 id="wpm-title-cards" className="wpm-title">Your 5 Cards</h2>

          <div className="wpm-big-card-icon" aria-hidden="true">🃏</div>

          <button
            type="button"
            className="wpm-collect-btn"
            onClick={() => {
              setRevealIndex(0);
              setPhase('pack-opening');
            }}
          >
            Open Creature Pack
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'pack-opening') {
    return (
      <div className="island-run-overlay-root wpm-overlay" role="dialog" aria-modal="true" aria-label="Opening your Welcome Pack creature cards">
        <div className="wpm-shell wpm-shell--pack-opening wpm-shell--enter">
          <p className="wpm-eyebrow">First Light Shore</p>
          <CreaturePackOpeningAnimation
            onComplete={() => {
              setRevealIndex(0);
              setPhase('card-reveal');
            }}
          />
        </div>
      </div>
    );
  }

  // card-reveal phase
  const card = resolvedCards[revealIndex];
  const creature = card ? CREATURE_CATALOG.find((e) => e.id === card.creatureId) : null;
  const creatureName = creature?.name ?? card?.creatureId ?? `Card ${revealIndex + 1}`;
  const cardTier = card?.tier ?? 'common';
  const isLastCard = revealIndex === resolvedCards.length - 1;

  return (
    <div
      className="island-run-overlay-root wpm-overlay wpm-overlay--card-reveal"
      role="dialog"
      aria-modal="true"
      aria-label={`Card ${revealIndex + 1} of ${resolvedCards.length}: ${creatureName}`}
      onClick={handleAdvanceCard}
    >
      {cardTier !== 'common' ? (
        <CelebrationFireworks
          key={`${cardTier}-${revealIndex}`}
          variant={cardTier === 'mythic' ? 'hero' : 'rapid'}
        />
      ) : null}
      <div key={revealIndex} className="wpm-card-reveal">
        <p className="wpm-card-reveal__counter">{revealIndex + 1} / {resolvedCards.length}</p>
        {creature ? (
          <CreatureCard
            creature={creature}
            owned
            shiny={cardTier === 'mythic'}
            foil={cardTier === 'mythic' ? 'premium' : cardTier === 'rare' ? 'soft' : 'none'}
            className="wpm-card-reveal__creature-card"
          />
        ) : (
          <div className="wpm-card-reveal__art" aria-hidden="true">✦</div>
        )}
        <h3 className="wpm-card-reveal__name">{creatureName}</h3>
        <p className="wpm-card-reveal__tier">{cardTier}</p>
        <p className="wpm-card-reveal__hint">
          {isLastCard ? 'Tap to finish' : 'Tap anywhere for next card'}
        </p>
      </div>
    </div>
  );
}
