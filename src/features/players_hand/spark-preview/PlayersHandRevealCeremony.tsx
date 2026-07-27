import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { ArchetypeHand } from '../../identity/archetypes/archetypeHandBuilder';
import { adaptArchetypeHandToSparkPreview } from './playersHandSparkAdapter';
import type { SparkPreviewCard } from './playersHandSparkTypes';
import './PlayersHandRevealCeremony.css';

type PlayersHandRevealCeremonyProps = {
  hand: ArchetypeHand;
  onComplete: () => void;
};

/** Deal order for the face-up cards: least prominent first so the hand builds. */
const CRESCENDO_ORDER: Record<string, number> = {
  support: 0,
  secondary: 1,
  dominant: 2,
};

const DEAL_INTERVAL_MS = 260;
const SHADOW_BEAT_MS = 520;

function CardFace({ card }: { card: SparkPreviewCard }) {
  return (
    <>
      {card.suitGlyph ? (
        <>
          <span className="pcard-pip pcard-pip--tl" aria-hidden="true">
            <span className="pcard-pip__rank">{card.rank}</span>
            <span className="pcard-pip__glyph">{card.suitGlyph}</span>
          </span>
          <span className="pcard-pip pcard-pip--br" aria-hidden="true">
            <span className="pcard-pip__rank">{card.rank}</span>
            <span className="pcard-pip__glyph">{card.suitGlyph}</span>
          </span>
          <span className="pcard-watermark" aria-hidden="true">
            {card.suitGlyph}
          </span>
        </>
      ) : null}
      <span className="players-hand-reveal__icon">{card.icon}</span>
      <span className="players-hand-reveal__name">{card.title}</span>
    </>
  );
}

/**
 * The reveal, paced as a deal rather than a dump.
 *
 * Face-up cards land least-prominent first so the hand builds to the dominant
 * card, then — after a beat — the shadow arrives FACE DOWN and waits. Turning it
 * over is a deliberate act, which is the point: the shadow is something you
 * choose to look at, not something the app pronounces at you.
 */
export function PlayersHandRevealCeremony({ hand, onComplete }: PlayersHandRevealCeremonyProps) {
  const { faceUpCards, shadowCard } = useMemo(() => {
    const all = adaptArchetypeHandToSparkPreview(hand);
    return {
      faceUpCards: all
        .filter((card) => card.role !== 'shadow')
        .sort((a, b) => (CRESCENDO_ORDER[a.role] ?? 0) - (CRESCENDO_ORDER[b.role] ?? 0)),
      shadowCard: all.find((card) => card.role === 'shadow') ?? null,
    };
  }, [hand]);

  const [revealCount, setRevealCount] = useState(0);
  const [shadowDealt, setShadowDealt] = useState(false);
  const [shadowFlipped, setShadowFlipped] = useState(false);

  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  useEffect(() => {
    // Reduced motion still gets the face-down shadow — that is an interaction,
    // not an animation — but skips the staged deal.
    if (prefersReducedMotion) {
      setRevealCount(faceUpCards.length);
      setShadowDealt(true);
      return undefined;
    }

    if (revealCount < faceUpCards.length) {
      const id = window.setTimeout(
        () => setRevealCount((current) => Math.min(current + 1, faceUpCards.length)),
        DEAL_INTERVAL_MS,
      );
      return () => window.clearTimeout(id);
    }

    if (!shadowDealt && shadowCard) {
      const id = window.setTimeout(() => setShadowDealt(true), SHADOW_BEAT_MS);
      return () => window.clearTimeout(id);
    }

    return undefined;
  }, [faceUpCards.length, prefersReducedMotion, revealCount, shadowCard, shadowDealt]);

  return (
    <section className="players-hand-reveal" aria-label="Players hand reveal ceremony">
      <h4 className="players-hand-reveal__title">Your Identity Hand is Revealed</h4>
      <p className="players-hand-reveal__subtitle">A first look at your current archetype constellation.</p>

      <div className="players-hand-reveal__row">
        {faceUpCards.slice(0, revealCount).map((card, index) => (
          <div
            key={card.id}
            className={`players-hand-reveal__card${
              card.role === 'dominant' ? ' players-hand-reveal__card--dominant' : ''
            }`}
            style={{
              '--card-color': card.color,
              transform: `translateY(${index % 2 === 0 ? 0 : 8}px)`,
              animationDelay: `${index * 80}ms`,
            } as CSSProperties}
          >
            <CardFace card={card} />
          </div>
        ))}
      </div>

      {shadowCard && shadowDealt && (
        <div className="players-hand-reveal__shadow-slot">
          <button
            type="button"
            className={`players-hand-reveal__card players-hand-reveal__card--shadow${
              shadowFlipped ? ' is-flipped' : ''
            }`}
            style={{ '--card-color': shadowCard.color } as CSSProperties}
            onClick={() => setShadowFlipped(true)}
            aria-label={
              shadowFlipped
                ? `${shadowCard.title}, your shadow card`
                : 'One card is still face down. Turn over your shadow card.'
            }
          >
            {shadowFlipped ? (
              <CardFace card={shadowCard} />
            ) : (
              <span className="players-hand-reveal__back" aria-hidden="true">
                <span className="players-hand-reveal__back-mark">✦</span>
              </span>
            )}
          </button>
          <p className="players-hand-reveal__shadow-note">
            {shadowFlipped
              ? `${shadowCard.title} — your least-played card. An unplayed strategy, not a flaw.`
              : 'One card is still face down. Turn it when you are ready.'}
          </p>
        </div>
      )}

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
