import React from 'react';
import { createPortal } from 'react-dom';
import { CREATURE_CATALOG } from '../services/creatureCatalog';
import { CreatureCard } from './CreatureCard';
import { CelebrationFireworks } from '../../../../components/CelebrationFireworks';
import {
  CreaturePackOpeningAnimation,
  preloadCreaturePackOpeningAnimation,
} from '../../../../components/CreaturePackOpeningAnimation';
import type { ClaimFullWelcomePackResult } from '../services/islandRunWelcomePackFullClaimAction';
import type { ClaimWelcomePackRewardBundleResult } from '../services/islandRunWelcomePackRewardBundleAction';
import { buildWelcomePackGiftBody } from '../services/islandRunWelcomePackCopy';
import { playIslandRunSound, triggerIslandRunHaptic } from '../services/islandRunAudio';
import { UsctCollectionAnimation } from './UsctCollectionAnimation';

import { lockPageScroll } from '../../../../utils/scrollLock';
export interface WelcomePackModalProps {
  open: boolean;
  onClose: () => void;
  onClaim?: () => Promise<boolean>;
  claimPending?: boolean;
  claimError?: string | null;
  claimResult?: ClaimFullWelcomePackResult | null;
  bundleOnlyClaimResult?: ClaimWelcomePackRewardBundleResult | null;
  deferCreaturePack?: boolean;
  isDevPreview?: boolean;
  displayName?: string | null;
}

type Phase = 'economy' | 'celebration' | 'cards-intro' | 'pack-opening' | 'card-reveal';
type WelcomePackPhase = Phase;
type WelcomeCelebrationStep =
  | 'idle'
  | 'outer-gift-focus'
  | 'outer-gift-open'
  | 'rank-focus'
  | 'rank-open'
  | 'rank-reveal'
  | 'rank-return'
  | 'dice-focus'
  | 'dice-award'
  | 'usct-focus'
  | 'usct-award'
  | 'complete';

const WELCOME_CABIN_ART = '/assets/onboarding/welcome-issue/welcome-cabin.webp';
const WELCOME_DICE_ART = '/assets/onboarding/welcome-issue/dice-150-number-only.webp';
const WELCOME_USCT_ART = '/assets/onboarding/welcome-issue/usct-600.webp';
const WELCOME_DECKHAND_CLOSED_ART = '/assets/onboarding/welcome-issue/deckhand-box-closed.webp';
const WELCOME_DECKHAND_OPEN_ART = '/assets/onboarding/welcome-issue/deckhand-box-open.webp';
const WELCOME_DECKHAND_MEDALLION_ART = '/assets/onboarding/welcome-issue/deckhand-rank-medallion.webp';
const WELCOME_OUTER_GIFT_ANIMATION = '/assets/animations/gift-box-opening.webm';

function waitForWelcomeBeat(delayMs: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, delayMs));
}

function renderWelcomePackPortal(content: React.ReactNode): React.JSX.Element {
  if (typeof document === 'undefined') return <>{content}</>;
  return createPortal(content, document.body);
}

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
  const [celebrationStep, setCelebrationStep] = React.useState<WelcomeCelebrationStep>('idle');
  const [revealIndex, setRevealIndex] = React.useState(0);
  const celebrationRunRef = React.useRef(0);
  const usctGiftRef = React.useRef<HTMLImageElement>(null);
  const usctWalletTargetRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) {
      setPhase('economy');
      setCollectAnimating(false);
      setCelebrationStep('idle');
      setRevealIndex(0);
      celebrationRunRef.current += 1;
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
  const berthReadyBody = buildWelcomePackGiftBody({ displayName });
  const isAlreadyClaimed = deferCreaturePack
    ? bundleOnlyClaimResult?.status === 'already_claimed'
    : claimResult?.cards.status === 'already_claimed'
      && claimResult?.bundle.status === 'already_claimed';

  const handleCollectEconomy = async () => {
    if (claimPending || collectAnimating) return;
    setCollectAnimating(true);
    const claimSucceeded = isAlreadyClaimed || (onClaim ? await onClaim() : false);
    if (!claimSucceeded || claimError) {
      setCollectAnimating(false);
      return;
    }

    const runId = celebrationRunRef.current + 1;
    celebrationRunRef.current = runId;
    const reducedMotion = typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    setPhase('celebration');
    setCelebrationStep('outer-gift-focus');
    if (!reducedMotion) await waitForWelcomeBeat(360);
    if (celebrationRunRef.current !== runId) return;
    setCelebrationStep('outer-gift-open');
    playIslandRunSound('shop_open');
    triggerIslandRunHaptic('reward_claim');
    if (!reducedMotion) await waitForWelcomeBeat(2550);
    if (celebrationRunRef.current !== runId) return;
    setCelebrationStep('rank-focus');
    if (!reducedMotion) await waitForWelcomeBeat(360);
    if (celebrationRunRef.current !== runId) return;
    setCelebrationStep('rank-open');
    playIslandRunSound('egg_open');
    if (!reducedMotion) await waitForWelcomeBeat(430);
    if (celebrationRunRef.current !== runId) return;
    setCelebrationStep('rank-reveal');
    playIslandRunSound('boss_island_clear');
    triggerIslandRunHaptic('reward_claim');
    if (!reducedMotion) await waitForWelcomeBeat(850);
    if (celebrationRunRef.current !== runId) return;
    setCelebrationStep('rank-return');
    if (!reducedMotion) await waitForWelcomeBeat(280);
    if (celebrationRunRef.current !== runId) return;
    setCelebrationStep('dice-focus');
    if (!reducedMotion) await waitForWelcomeBeat(360);
    if (celebrationRunRef.current !== runId) return;
    setCelebrationStep('dice-award');
    playIslandRunSound('reward_bar_claim_burst');
    triggerIslandRunHaptic('reward_claim');
    if (!reducedMotion) await waitForWelcomeBeat(460);
    if (celebrationRunRef.current !== runId) return;
    setCelebrationStep('usct-focus');
    if (!reducedMotion) await waitForWelcomeBeat(360);
    if (celebrationRunRef.current !== runId) return;
    setCelebrationStep('usct-award');
    playIslandRunSound('reward_bar_claim_burst');
    triggerIslandRunHaptic('reward_claim');
    // The large flock staggers 20 tokens across roughly 1.73 seconds. Keep the
    // award surface mounted until the final token reaches the wallet target.
    if (!reducedMotion) await waitForWelcomeBeat(1850);
    if (celebrationRunRef.current !== runId) return;
    setCelebrationStep('complete');
    setCollectAnimating(false);
  };

  React.useEffect(() => {
    if (!claimError) return;
    celebrationRunRef.current += 1;
    setCollectAnimating(false);
    setCelebrationStep('idle');
    setPhase('economy');
  }, [claimError]);

  const handleAdvanceCard = () => {
    if (revealIndex < resolvedCards.length - 1) {
      setRevealIndex((i) => i + 1);
    } else {
      onClose();
    }
  };

  if (phase === 'economy') {
    return renderWelcomePackPortal(
      <div className="island-run-overlay-root wpm-overlay" role="presentation">
        <section className="wpm-shell wpm-shell--welcome-scene" role="dialog" aria-modal="true" aria-labelledby="wpm-title">
          <h2 id="wpm-title" className="wpm-visually-hidden">Welcome to the Compass Expedition</h2>
          <p className="wpm-visually-hidden">{berthReadyBody}</p>
          <img className="wpm-welcome-scene__background" src={WELCOME_CABIN_ART} alt="" />

          <div className="wpm-welcome-gifts" aria-label="Your expedition issue includes Deckhand rank, 150 Dice, and 600 Universal Star Credit Tokens">
            <img className="wpm-gift wpm-gift--dice" src={WELCOME_DICE_ART} alt="150 Dice" />
            <img className="wpm-gift wpm-gift--usct" src={WELCOME_USCT_ART} alt="600 Universal Star Credit Tokens" />
            <img className="wpm-gift wpm-gift--rank" src={WELCOME_DECKHAND_CLOSED_ART} alt="Deckhand rank presentation box" />
          </div>

          {isDevPreview ? <span className="wpm-preview-badge">Preview</span> : null}
          {claimError ? <p className="wpm-scene-message wpm-error" role="alert">{claimError}</p> : null}
          {isAlreadyClaimed ? (
            <p className="wpm-scene-message wpm-already-claimed" role="status">Your expedition issue is already registered.</p>
          ) : null}

          <button
            type="button"
            className="wpm-collect-btn wpm-collect-btn--scene"
            onClick={() => { void handleCollectEconomy(); }}
            disabled={claimPending || collectAnimating || (!isAlreadyClaimed && !onClaim)}
          >
            {claimPending || collectAnimating ? <span className="wpm-collect-btn__spinner" aria-hidden="true" /> : null}
            {claimPending || collectAnimating ? 'Preparing issue…' : isAlreadyClaimed ? 'View issue' : 'Step Aboard'}
          </button>
        </section>
      </div>,
    );
  }

  if (phase === 'celebration') {
    const awardedUsctBalance = bundleOnlyClaimResult?.record.essence
      ?? claimResult?.bundle.record.essence
      ?? 600;
    const rankIsOpen = ['rank-open', 'rank-reveal', 'rank-return', 'dice-focus', 'dice-award', 'usct-focus', 'usct-award', 'complete'].includes(celebrationStep);
    const celebrationLabel = celebrationStep === 'outer-gift-focus' || celebrationStep === 'outer-gift-open'
      ? 'Your crew appointment is ready'
      : celebrationStep === 'rank-focus'
        ? 'Crew appointment 1 of 3'
        : celebrationStep === 'rank-open'
          ? 'Opening your rank presentation'
          : celebrationStep === 'rank-reveal' || celebrationStep === 'rank-return'
            ? 'Deckhand rank confirmed'
        : celebrationStep === 'dice-focus'
          ? 'Expedition issue 2 of 3'
          : celebrationStep === 'dice-award'
            ? '+150 Dice secured'
            : celebrationStep === 'usct-focus'
              ? 'Construction funds 3 of 3'
              : celebrationStep === 'usct-award'
                ? '+600 USCT secured'
                : 'Deckhand rank, 150 Dice, and 600 USCT secured';

    return renderWelcomePackPortal(
      <div className="island-run-overlay-root wpm-overlay" role="presentation">
        {celebrationStep === 'rank-open' || celebrationStep === 'rank-reveal' || celebrationStep === 'rank-return' || celebrationStep === 'dice-award' || celebrationStep === 'usct-award' ? (
          <CelebrationFireworks key={celebrationStep} variant={celebrationStep === 'rank-reveal' ? 'hero' : 'rapid'} />
        ) : null}
        <section
          className={`wpm-shell wpm-shell--welcome-scene wpm-celebration wpm-celebration--${celebrationStep}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="wpm-celebration-title"
        >
          <h2 id="wpm-celebration-title" className="wpm-visually-hidden">Receiving your expedition issue</h2>
          <img className="wpm-welcome-scene__background" src={WELCOME_CABIN_ART} alt="" />
          <div ref={usctWalletTargetRef} className="wpm-usct-wallet-target" aria-label={`${awardedUsctBalance} Universal Star Credit Tokens`}>
            <img src="/assets/currency/usct-token.webp" alt="" />
            <span><strong>{awardedUsctBalance}</strong><small>USCT</small></span>
          </div>
          {celebrationStep === 'outer-gift-focus' || celebrationStep === 'outer-gift-open' ? (
            <video
              key={celebrationStep}
              className="wpm-outer-gift-opening"
              src={WELCOME_OUTER_GIFT_ANIMATION}
              autoPlay={celebrationStep === 'outer-gift-open'}
              muted
              playsInline
              aria-hidden="true"
            />
          ) : null}
          {celebrationStep === 'rank-open' || celebrationStep === 'rank-reveal' ? (
            <div className="wpm-rank-spotlights" aria-hidden="true"><span /><span /></div>
          ) : null}
          {celebrationStep === 'rank-open' || celebrationStep === 'rank-reveal' ? (
            <div className="wpm-rank-flash" aria-hidden="true" />
          ) : null}
          <div className="wpm-welcome-gifts" aria-hidden="true">
            <img className="wpm-gift wpm-gift--dice" src={WELCOME_DICE_ART} alt="" />
            <img ref={usctGiftRef} className="wpm-gift wpm-gift--usct" src={WELCOME_USCT_ART} alt="" />
            <img
              className="wpm-gift wpm-gift--rank"
              src={rankIsOpen ? WELCOME_DECKHAND_OPEN_ART : WELCOME_DECKHAND_CLOSED_ART}
              alt=""
            />
          </div>
          {celebrationStep === 'rank-reveal' ? (
            <img className="wpm-rank-medallion" src={WELCOME_DECKHAND_MEDALLION_ART} alt="" />
          ) : null}
          {celebrationStep === 'rank-reveal' ? (
            <div className="wpm-crew-cheer" aria-hidden="true"><span>✦</span><span>✦</span><span>✦</span><span>✦</span><span>✦</span></div>
          ) : null}
          {celebrationStep === 'usct-award' ? (
            <UsctCollectionAnimation amount="large" originRef={usctGiftRef} targetRef={usctWalletTargetRef} />
          ) : null}
          <p className="wpm-celebration-status" role="status" aria-live="polite">{celebrationLabel}</p>
          <button
            type="button"
            className="wpm-collect-btn wpm-collect-btn--scene"
            disabled={celebrationStep !== 'complete'}
            onClick={() => {
              if (deferCreaturePack) {
                onClose();
              } else {
                setPhase('cards-intro');
              }
            }}
          >
            {celebrationStep === 'complete' ? (
              deferCreaturePack ? 'Begin the mission' : 'Continue'
            ) : (
              <>
                <span className="wpm-collect-btn__spinner" aria-hidden="true" />
                Preparing issue…
              </>
            )}
          </button>
        </section>
      </div>,
    );
  }

  if (phase === 'cards-intro') {
    return renderWelcomePackPortal(
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
      </div>,
    );
  }

  if (phase === 'pack-opening') {
    return renderWelcomePackPortal(
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
      </div>,
    );
  }

  // card-reveal phase
  const card = resolvedCards[revealIndex];
  const creature = card ? CREATURE_CATALOG.find((e) => e.id === card.creatureId) : null;
  const creatureName = creature?.name ?? card?.creatureId ?? `Card ${revealIndex + 1}`;
  const cardTier = card?.tier ?? 'common';
  const isLastCard = revealIndex === resolvedCards.length - 1;

  return renderWelcomePackPortal(
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
    </div>,
  );
}
