import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { ArchetypeHand } from '../../identity/archetypes/archetypeHandBuilder';
import { adaptArchetypeHandToSparkPreview } from './playersHandSparkAdapter';
import './PlayersHandRevealCeremony.css';

type PlayersHandRevealCeremonyProps = {
  hand: ArchetypeHand;
  onComplete: () => void;
};

export function PlayersHandRevealCeremony({ hand, onComplete }: PlayersHandRevealCeremonyProps) {
  const cards = useMemo(() => adaptArchetypeHandToSparkPreview(hand), [hand]);
  const [revealCount, setRevealCount] = useState(1);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setRevealCount(cards.length);
      return;
    }
    if (revealCount >= cards.length) return;
    const id = window.setTimeout(() => setRevealCount((current) => Math.min(current + 1, cards.length)), 220);
    return () => window.clearTimeout(id);
  }, [cards.length, revealCount]);

  return (
    <section className="players-hand-reveal" aria-label="Players hand reveal ceremony">
      <h4 className="players-hand-reveal__title">Your Identity Hand is Revealed</h4>
      <p className="players-hand-reveal__subtitle">A first look at your current archetype constellation.</p>

      <div className="players-hand-reveal__row">
        {cards.slice(0, revealCount).map((card, index) => (
          <div
            key={card.id}
            className="players-hand-reveal__card"
            style={{
              '--card-color': card.color,
              transform: `translateY(${index % 2 === 0 ? 0 : 8}px)`,
              animationDelay: `${index * 80}ms`,
            } as CSSProperties}
          >
            <span className="players-hand-reveal__icon">{card.icon}</span>
            <span className="players-hand-reveal__name">{card.title}</span>
          </div>
        ))}
      </div>

      <div className="players-hand-reveal__actions">
        <button type="button" className="players-hand-reveal__btn players-hand-reveal__btn--ghost" onClick={onComplete}>
          Skip
        </button>
        <button type="button" className="players-hand-reveal__btn" onClick={onComplete}>
          Continue
        </button>
      </div>
    </section>
  );
}
