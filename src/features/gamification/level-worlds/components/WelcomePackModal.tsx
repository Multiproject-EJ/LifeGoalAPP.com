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
import { IslandMoneyNote } from './IslandMoney';
import './WelcomePackModal.css';

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
  autoCollect?: boolean;
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

const WELCOME_DICE_ART = '/assets/onboarding/welcome-issue/dice-150-number-only.webp';
const WELCOME_DECKHAND_CLOSED_ART = '/assets/onboarding/welcome-issue/deckhand-box-closed.webp';
const WELCOME_DECKHAND_OPEN_ART = '/assets/onboarding/welcome-issue/deckhand-box-open.webp';
const WELCOME_DECKHAND_MEDALLION_ART = '/assets/onboarding/welcome-issue/deckhand-rank-medallion.webp';

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
  autoCollect = false,
}: WelcomePackModalProps): React.JSX.Element | null {
  const [phase, setPhase] = React.useState<WelcomePackPhase>('economy');
  const [collectAnimating, setCollectAnimating] = React.useState(false);
  const [celebrationStep, setCelebrationStep] = React.useState<WelcomeCelebrationStep>('idle');
  const [revealIndex, setRevealIndex] = React.useState(0);
  const celebrationRunRef = React.useRef(0);
  const autoCollectStartedRef = React.useRef(false);
  React.useEffect(() => () => { celebrationRunRef.current += 1; }, []);

  React.useEffect(() => {
    if (!open) {
      autoCollectStartedRef.current = false;
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
    if (!claimSucceeded) {
      setCollectAnimating(false);
      return;
    }

    const runId = celebrationRunRef.current + 1;
    celebrationRunRef.current = runId;
    const reducedMotion = typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    setPhase('celebration');
    setCelebrationStep('rank-focus');
    if (!reducedMotion) await waitForWelcomeBeat(220);
    if (celebrationRunRef.current !== runId) return;
    setCelebrationStep('rank-open');
    playIslandRunSound('egg_open');
    if (!reducedMotion) await waitForWelcomeBeat(320);
    if (celebrationRunRef.current !== runId) return;
    setCelebrationStep('rank-reveal');
    playIslandRunSound('boss_island_clear');
    triggerIslandRunHaptic('reward_claim');
    if (!reducedMotion) await waitForWelcomeBeat(650);
    if (celebrationRunRef.current !== runId) return;
    setCelebrationStep('rank-return');
    if (!reducedMotion) await waitForWelcomeBeat(200);
    if (celebrationRunRef.current !== runId) return;
    setCelebrationStep('dice-focus');
    if (!reducedMotion) await waitForWelcomeBeat(220);
    if (celebrationRunRef.current !== runId) return;
    setCelebrationStep('dice-award');
    playIslandRunSound('reward_bar_claim_burst');
    triggerIslandRunHaptic('reward_claim');
    if (!reducedMotion) await waitForWelcomeBeat(420);
    if (celebrationRunRef.current !== runId) return;
    setCelebrationStep('usct-focus');
    if (!reducedMotion) await waitForWelcomeBeat(220);
    if (celebrationRunRef.current !== runId) return;
    setCelebrationStep('usct-award');
    playIslandRunSound('reward_bar_claim_burst');
    triggerIslandRunHaptic('reward_claim');
    // The large flock staggers 20 tokens across roughly 1.73 seconds. Keep the
    // award surface mounted until the final token reaches the wallet target.
    if (!reducedMotion) await waitForWelcomeBeat(650);
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

  React.useEffect(() => {
    if (!open || !autoCollect || autoCollectStartedRef.current || !onClaim) return;
    autoCollectStartedRef.current = true;
    void handleCollectEconomy();
  }, [open, autoCollect, onClaim]);

  if (!open) return null;
  if (phase === 'economy' || phase === 'celebration') {
    const rankFocused=celebrationStep.startsWith('rank-') && celebrationStep !== 'rank-return';
    const diceFocused=celebrationStep.startsWith('dice-');
    const moneyFocused=celebrationStep.startsWith('usct-');
    const rankRevealed=['rank-reveal','rank-return','dice-focus','dice-award','usct-focus','usct-award','complete'].includes(celebrationStep);
    const ready=celebrationStep==='complete';
    const status=ready ? 'Your crew and supplies are ready.' : rankFocused ? 'Deckhand rank confirmed' : diceFocused ? '+150 Dice' : moneyFocused ? '+600 Money' : 'Preparing your expedition supplies';
    return renderWelcomePackPortal(
      <div className="island-run-overlay-root wpm-issue-overlay" role="presentation">
        <section className="wpm-issue" role="dialog" aria-modal="true" aria-labelledby="wpm-issue-title">
          <header><small>COMPASS EXPEDITION · ISLAND 001</small><h2 id="wpm-issue-title">Welcome aboard.</h2><p>{berthReadyBody}</p></header>
          <div className={`wpm-issue-gifts${rankFocused||diceFocused||moneyFocused?' is-highlighting':''}`}>
            <figure className={`wpm-issue-gift wpm-issue-gift--rank${rankFocused?' is-focused':''}`}>
              <img src={rankRevealed ? WELCOME_DECKHAND_MEDALLION_ART : celebrationStep==='rank-open' ? WELCOME_DECKHAND_OPEN_ART : WELCOME_DECKHAND_CLOSED_ART} alt="Deckhand rank" />
              <figcaption><strong>Deckhand</strong><span>Your first rank</span></figcaption>
            </figure>
            <figure className={`wpm-issue-gift wpm-issue-gift--dice${diceFocused?' is-focused':''}`}>
              <img src={WELCOME_DICE_ART} alt="150 Dice" />
              <figcaption><strong>150 Dice</strong><span>Explore the island</span></figcaption>
            </figure>
            <figure className={`wpm-issue-gift wpm-issue-gift--money${moneyFocused?' is-focused':''}`}>
              <div className="wpm-issue-money"><IslandMoneyNote islandNumber={1} /></div>
              <figcaption><strong>600 Money</strong><span>Build your first home</span></figcaption>
            </figure>
          </div>
          <footer>
            <p className="wpm-issue-status" role="status" aria-live="polite">{claimError ?? status}</p>
            <button type="button" className="wpm-issue-play" disabled={claimPending || collectAnimating}
              onClick={()=>{
                if(ready || isAlreadyClaimed) { if(deferCreaturePack)onClose();else setPhase('cards-intro'); }
                else void handleCollectEconomy();
              }}>
              {claimPending || collectAnimating ? 'Preparing…' : ready || isAlreadyClaimed ? 'PLAY' : claimError ? 'Retry' : 'Collect gifts'}
            </button>
          </footer>
          {isDevPreview ? <span className="wpm-issue-preview">Preview</span> : null}
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
