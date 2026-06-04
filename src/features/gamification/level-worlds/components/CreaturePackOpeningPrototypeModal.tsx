import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import type { CreatureDefinition } from '../services/creatureCatalog';
import { getCreatureCardMetadata } from '../services/creatureCardCatalog';
import { playIslandRunSound, triggerIslandRunHaptic, type IslandRunHapticEvent } from '../services/islandRunAudio';
import { CreatureCard } from './CreatureCard';

const SWIPE_REVEAL_THRESHOLD_PX = 36;
const RARITY_ORDER: CreatureDefinition['tier'][] = ['common', 'rare', 'mythic'];

type CreaturePackOpeningPrototypePhase = 'intro' | 'revealing' | 'summary';

export interface CreaturePackOpeningPrototypeCard {
  slotIndex: number;
  creature: CreatureDefinition;
  copiesBefore: number;
  copiesAfter: number;
}

export interface CreaturePackOpeningPrototypeModalProps {
  open: boolean;
  cards: CreaturePackOpeningPrototypeCard[];
  grantStatus: 'granted' | 'already_granted';
  grantId: string;
  onClose: () => void;
  onViewSanctuary?: () => void;
  bonusCopy?: string;
}

function rarityTone(tier: CreatureDefinition['tier']): string {
  if (tier === 'mythic') return 'Mythic shimmer';
  if (tier === 'rare') return 'Rare glow';
  return 'Cozy common';
}

function revealHapticForTier(tier: CreatureDefinition['tier']): IslandRunHapticEvent {
  switch (tier) {
    case 'rare':
    case 'mythic':
      return 'egg_open';
    case 'common':
    default:
      return 'reward_claim';
  }
}

export function CreaturePackOpeningPrototypeModal(props: CreaturePackOpeningPrototypeModalProps): JSX.Element | null {
  const [activeIndex, setActiveIndex] = useState(0);
  const [phase, setPhase] = useState<CreaturePackOpeningPrototypePhase>('intro');
  const touchStartXRef = useRef<number | null>(null);
  const activeCard = props.cards[activeIndex] ?? null;
  const hasCards = props.cards.length > 0;
  const isIntro = phase === 'intro';
  const showSummary = phase === 'summary';
  const revealedCount = showSummary ? props.cards.length : Math.min(props.cards.length, activeIndex + 1);
  const newCardCount = useMemo(
    () => props.grantStatus === 'already_granted'
      ? 0
      : props.cards.filter((card) => card.copiesBefore < 1 && card.copiesAfter > 0).length,
    [props.cards, props.grantStatus],
  );
  const replayCount = props.grantStatus === 'already_granted' ? props.cards.length : 0;
  const grantedDuplicateCount = props.grantStatus === 'granted' ? Math.max(0, props.cards.length - newCardCount) : 0;
  const rarityBreakdown = useMemo(() => RARITY_ORDER
    .map((tier) => ({
      tier,
      count: props.cards.filter((card) => card.creature.tier === tier).length,
    }))
    .filter((entry) => entry.count > 0), [props.cards]);

  useEffect(() => {
    if (!props.open) return;
    setActiveIndex(0);
    setPhase('intro');
  }, [props.open, props.grantId]);

  useEffect(() => {
    if (!props.open || phase !== 'revealing' || !activeCard) return;
    playIslandRunSound('egg_open');
    triggerIslandRunHaptic(revealHapticForTier(activeCard.creature.tier));
  }, [activeCard, phase, props.open]);

  const advance = useCallback(() => {
    if (!hasCards) return;
    if (showSummary) {
      props.onClose();
      return;
    }
    if (isIntro) {
      setPhase('revealing');
      triggerIslandRunHaptic('egg_set');
      return;
    }
    if (activeIndex >= props.cards.length - 1) {
      setPhase('summary');
      triggerIslandRunHaptic('reward_bar_cascade');
      return;
    }
    setActiveIndex((current) => Math.min(props.cards.length - 1, current + 1));
  }, [activeIndex, hasCards, isIntro, props.cards.length, props.onClose, showSummary]);

  useEffect(() => {
    if (!props.open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        props.onClose();
        return;
      }
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowRight') {
        event.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [advance, props.open, props.onClose]);

  useEffect(() => {
    if (!props.open || typeof document === 'undefined') return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [props.open]);

  if (!props.open) return null;

  return (
    <div className="creature-pack-opening-prototype" role="dialog" aria-modal="true" aria-labelledby="creature-pack-opening-title">
      <section
        className={`creature-pack-opening-prototype__shell creature-pack-opening-prototype__shell--${phase} ${activeCard ? `creature-pack-opening-prototype__shell--${activeCard.creature.tier}` : ''}`}
        onTouchStart={(event) => {
          touchStartXRef.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const startX = touchStartXRef.current;
          touchStartXRef.current = null;
          const endX = event.changedTouches[0]?.clientX ?? null;
          if (startX === null || endX === null) return;
          if (Math.abs(endX - startX) > SWIPE_REVEAL_THRESHOLD_PX) advance();
        }}
      >
        <header className="creature-pack-opening-prototype__header">
          <p className="creature-pack-opening-prototype__eyebrow">Dev-only visual prototype · no public purchase</p>
          <h2 id="creature-pack-opening-title">Creature Pack Opening</h2>
          <p>
            Canonical grant state: {props.grantStatus.replace('_', ' ')} · {isIntro ? 'ready to open' : `${revealedCount}/${props.cards.length} revealed`}
          </p>
        </header>

        {isIntro ? (
          <button type="button" className="creature-pack-opening-prototype__stage creature-pack-opening-prototype__stage--intro" onClick={advance} aria-label="Open dev creature pack">
            <div className="creature-pack-opening-prototype__pack" aria-hidden="true">
              <span className="creature-pack-opening-prototype__pack-glow" />
              <span className="creature-pack-opening-prototype__pack-face">✦</span>
            </div>
            <p className="creature-pack-opening-prototype__anticipation">Tap to open · swipe or press Enter/Space</p>
            <p className="creature-pack-opening-prototype__copy-note">
              Five weighted demo cards are already resolved; this screen previews the reveal ceremony, duplicate copy changes, and new-to-you results.
            </p>
          </button>
        ) : showSummary ? (
          <div className="creature-pack-opening-prototype__summary" role="status" aria-live="polite">
            <p className="creature-pack-opening-prototype__summary-kicker">Pack complete</p>
            <div className="creature-pack-opening-prototype__summary-stats" aria-label="Creature pack result totals">
              <span>{newCardCount} new</span>
              <span>{grantedDuplicateCount} duplicates</span>
              {replayCount > 0 ? <span>{replayCount} replayed</span> : null}
            </div>
            <div className="creature-pack-opening-prototype__rarity-breakdown" aria-label="Rarity breakdown">
              {rarityBreakdown.map((entry) => (
                <span key={entry.tier} className={`creature-pack-opening-prototype__rarity-chip creature-pack-opening-prototype__rarity-chip--${entry.tier}`}>
                  {entry.count} {entry.tier}
                </span>
              ))}
            </div>
            <div className="creature-pack-opening-prototype__summary-grid" aria-label="Creature pack summary">
              {props.cards.map((card) => {
                const metadata = getCreatureCardMetadata(card.creature);
                const resultClass = props.grantStatus === 'already_granted'
                  ? 'replay'
                  : card.copiesBefore > 0 ? 'duplicate' : 'new';
                return (
                  <div key={`${card.slotIndex}:${card.creature.id}`} className={`creature-pack-opening-prototype__summary-card creature-pack-opening-prototype__summary-card--${card.creature.tier} creature-pack-opening-prototype__summary-card--${resultClass}`}>
                    <span>{metadata.displayName}</span>
                    <strong>
                      {props.grantStatus === 'already_granted'
                        ? `Replay · ${card.copiesAfter} held`
                        : card.copiesBefore > 0
                          ? `Duplicate · ${card.copiesBefore}→${card.copiesAfter}`
                          : 'New companion'}
                    </strong>
                  </div>
                );
              })}
            </div>
            <p className="creature-pack-opening-prototype__summary-note">
              {props.grantStatus === 'already_granted'
                ? `${replayCount} replayed from current canonical collection state`
                : `${newCardCount} new · ${grantedDuplicateCount} duplicate`}
              {' '}· foil, seasonal, and mythic cinematic hooks can layer onto this reveal queue later.
            </p>
            {props.bonusCopy ? (
              <p className="creature-pack-opening-prototype__summary-note">{props.bonusCopy}</p>
            ) : null}
          </div>
        ) : activeCard ? (
          <button type="button" className={`creature-pack-opening-prototype__stage creature-pack-opening-prototype__stage--${activeCard.creature.tier}`} onClick={advance} aria-label="Reveal next creature card">
            <p className="creature-pack-opening-prototype__anticipation">
              Card {activeIndex + 1} · {rarityTone(activeCard.creature.tier)}
            </p>
            <div className="creature-pack-opening-prototype__progress" aria-label={`${revealedCount} of ${props.cards.length} cards revealed`}>
              {props.cards.map((card, index) => (
                <span
                  key={`${card.slotIndex}:${card.creature.id}:pip`}
                  className={`creature-pack-opening-prototype__progress-pip ${index <= activeIndex ? 'creature-pack-opening-prototype__progress-pip--revealed' : ''}`}
                />
              ))}
            </div>
            <CreatureCard
              creature={activeCard.creature}
              metadata={getCreatureCardMetadata(activeCard.creature)}
              owned
              shiny={activeCard.creature.tier === 'mythic'}
              foil={activeCard.creature.tier === 'mythic' ? 'premium' : activeCard.creature.tier === 'rare' ? 'soft' : 'none'}
              className="creature-pack-opening-prototype__card"
            />
            <p className="creature-pack-opening-prototype__copy-note">
              {activeCard.copiesBefore > 0
                ? props.grantStatus === 'already_granted'
                  ? `Replay view: ${activeCard.copiesAfter} copies currently held in canonical collection state`
                  : `Duplicate converted into collection copy ${activeCard.copiesBefore} → ${activeCard.copiesAfter}`
                : 'New creature added to your Sanctuary collection'}
            </p>
          </button>
        ) : (
          <p className="creature-pack-opening-prototype__copy-note">No cards available for this demo pack.</p>
        )}

        <div className="creature-pack-opening-prototype__actions">
          <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary" onClick={props.onClose}>
            Close prototype
          </button>
          {showSummary && props.onViewSanctuary ? (
            <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary" onClick={props.onViewSanctuary}>
              View in Sanctuary
            </button>
          ) : null}
          <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary" onClick={advance}>
            {showSummary ? 'Done' : isIntro ? 'Open pack' : activeIndex >= props.cards.length - 1 ? 'Show summary' : 'Reveal next'}
          </button>
        </div>
      </section>
    </div>
  );
}
