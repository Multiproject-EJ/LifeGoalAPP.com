import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import type { CreatureDefinition } from '../services/creatureCatalog';
import { getCreatureCardMetadata } from '../services/creatureCardCatalog';
import { playIslandRunSound, triggerIslandRunHaptic } from '../services/islandRunAudio';
import { CreatureCard } from './CreatureCard';

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
}

function rarityTone(tier: CreatureDefinition['tier']): string {
  if (tier === 'mythic') return 'Mythic shimmer';
  if (tier === 'rare') return 'Rare glow';
  return 'Cozy common';
}

export function CreaturePackOpeningPrototypeModal(props: CreaturePackOpeningPrototypeModalProps): JSX.Element | null {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const activeCard = props.cards[activeIndex] ?? null;
  const hasCards = props.cards.length > 0;
  const revealedCount = showSummary ? props.cards.length : Math.min(props.cards.length, activeIndex + 1);
  const newCardCount = useMemo(
    () => props.grantStatus === 'already_granted'
      ? 0
      : props.cards.filter((card) => card.copiesBefore < 1 && card.copiesAfter > 0).length,
    [props.cards, props.grantStatus],
  );
  const replayCount = props.grantStatus === 'already_granted' ? props.cards.length : 0;
  const grantedDuplicateCount = props.grantStatus === 'granted' ? Math.max(0, props.cards.length - newCardCount) : 0;

  useEffect(() => {
    if (!props.open) return;
    setActiveIndex(0);
    setShowSummary(false);
  }, [props.open, props.grantId]);

  useEffect(() => {
    if (!props.open || showSummary || !activeCard) return;
    playIslandRunSound('egg_open');
    triggerIslandRunHaptic(activeCard.creature.tier === 'common' ? 'reward_claim' : 'egg_open');
  }, [activeCard, props.open, showSummary]);

  const advance = useCallback(() => {
    if (!hasCards) return;
    if (showSummary) {
      props.onClose();
      return;
    }
    if (activeIndex >= props.cards.length - 1) {
      setShowSummary(true);
      triggerIslandRunHaptic('reward_bar_cascade');
      return;
    }
    setActiveIndex((current) => Math.min(props.cards.length - 1, current + 1));
  }, [activeIndex, hasCards, props.cards.length, props.onClose, showSummary]);

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

  if (!props.open) return null;

  return (
    <div className="creature-pack-opening-prototype" role="dialog" aria-modal="true" aria-labelledby="creature-pack-opening-title">
      <section
        className={`creature-pack-opening-prototype__shell ${activeCard ? `creature-pack-opening-prototype__shell--${activeCard.creature.tier}` : ''}`}
        onTouchStart={(event) => {
          touchStartXRef.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const startX = touchStartXRef.current;
          touchStartXRef.current = null;
          const endX = event.changedTouches[0]?.clientX ?? null;
          if (startX === null || endX === null) return;
          if (Math.abs(endX - startX) > 36) advance();
        }}
      >
        <header className="creature-pack-opening-prototype__header">
          <p className="creature-pack-opening-prototype__eyebrow">Dev-only visual prototype · no public purchase</p>
          <h2 id="creature-pack-opening-title">Creature Pack Opening</h2>
          <p>
            Canonical grant state: {props.grantStatus.replace('_', ' ')} · {revealedCount}/{props.cards.length} revealed
          </p>
        </header>

        {showSummary ? (
          <div className="creature-pack-opening-prototype__summary" role="status" aria-live="polite">
            <p className="creature-pack-opening-prototype__summary-kicker">Pack complete</p>
            <div className="creature-pack-opening-prototype__summary-grid" aria-label="Creature pack summary">
              {props.cards.map((card) => {
                const metadata = getCreatureCardMetadata(card.creature);
                return (
                  <div key={`${card.slotIndex}:${card.creature.id}`} className={`creature-pack-opening-prototype__summary-card creature-pack-opening-prototype__summary-card--${card.creature.tier}`}>
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
          </div>
        ) : activeCard ? (
          <button type="button" className="creature-pack-opening-prototype__stage" onClick={advance} aria-label="Reveal next creature card">
            <p className="creature-pack-opening-prototype__anticipation">
              Card {activeIndex + 1} · {rarityTone(activeCard.creature.tier)}
            </p>
            <CreatureCard
              creature={activeCard.creature}
              metadata={getCreatureCardMetadata(activeCard.creature)}
              owned
              shiny={activeCard.creature.tier === 'mythic'}
              foil={activeCard.creature.tier === 'common' ? 'none' : 'soft'}
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
          <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary" onClick={advance}>
            {showSummary ? 'Done' : activeIndex >= props.cards.length - 1 ? 'Show summary' : 'Reveal next'}
          </button>
        </div>
      </section>
    </div>
  );
}
