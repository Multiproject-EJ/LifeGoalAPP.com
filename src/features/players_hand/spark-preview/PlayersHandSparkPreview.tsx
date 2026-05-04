import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { ArchetypeHand } from '../../identity/archetypes/archetypeHandBuilder';
import {
  adaptArchetypeHandToSparkPreview,
  buildDevOnlyFallbackSparkPreviewCards,
} from './playersHandSparkAdapter';
import './PlayersHandSparkPreview.css';

type PlayersHandSparkPreviewProps = {
  hand?: ArchetypeHand | null;
  title?: string;
  compact?: boolean;
};

export function PlayersHandSparkPreview({
  hand,
  title = 'Players Hand SPARK Preview (Dev-only)',
  compact = false,
}: PlayersHandSparkPreviewProps) {
  const cards = useMemo(
    () => (hand ? adaptArchetypeHandToSparkPreview(hand) : buildDevOnlyFallbackSparkPreviewCards()),
    [hand],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const activeCard = cards[activeIndex] ?? cards[0];

  useEffect(() => {
    if (!expanded) return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [expanded]);

  return (
    <section
      className={`players-hand-spark-preview${compact ? ' players-hand-spark-preview--compact' : ''}`}
      aria-label="Players hand SPARK preview"
    >
      <header className="players-hand-spark-preview__header">
        <h3>{title}</h3>
        <p>{compact ? 'Tap to open your full hand.' : 'Tap to open full-screen hand view.'}</p>
      </header>

      <button
        type="button"
        className="players-hand-spark-preview__mini"
        aria-label="Open SPARK hand preview"
        onClick={() => setExpanded(true)}
      >
        {cards.map((card, index) => {
          const center = (cards.length - 1) / 2;
          const offset = index - center;
          return (
            <span
              key={`mini-${card.id}`}
              className="players-hand-spark-preview__mini-card"
              style={{ '--card-color': card.color, transform: `translateX(${offset * 26}px) rotate(${offset * 7}deg)` } as CSSProperties}
            >
              {card.icon}
            </span>
          );
        })}
      </button>

      {expanded && (
        <div className="players-hand-spark-overlay" role="dialog" aria-modal="true" aria-label="Players hand details">
          <button className="players-hand-spark-overlay__backdrop" aria-label="Close hand preview" onClick={() => setExpanded(false)} />
          <div className="players-hand-spark-overlay__panel">
            <header className="players-hand-spark-overlay__header">
              <h4>{title}</h4>
              <button type="button" className="players-hand-spark-overlay__close" onClick={() => setExpanded(false)} aria-label="Close hand preview">✕</button>
            </header>

            <div className="players-hand-spark-overlay__fan" aria-label="Select a card from your hand">
              {cards.map((card, index) => {
                const relative = index - activeIndex;
                const selected = relative === 0;
                return (
                  <button
                    key={card.id}
                    type="button"
                    className={`players-hand-spark-preview__card${selected ? ' is-selected' : ''}`}
                    aria-label={`Focus ${card.title}`}
                    style={{
                      '--card-color': card.color,
                      zIndex: cards.length - Math.abs(relative),
                      transform: `translate(${relative * 62}px, ${Math.abs(relative) * 18}px) rotate(${relative * 9}deg) scale(${selected ? 1.06 : 0.9})`,
                    } as CSSProperties}
                    onClick={() => setActiveIndex(index)}
                  >
                    <div className="players-hand-spark-preview__meta">
                      <span className="players-hand-spark-preview__badge">{card.role}</span>
                      <span className="players-hand-spark-preview__badge">Lv {card.level}</span>
                    </div>
                    <div className="players-hand-spark-preview__title">{card.icon} {card.title}</div>
                    <div className="players-hand-spark-preview__rarity">{card.rarity}</div>
                  </button>
                );
              })}
            </div>

            {activeCard && (
              <article className="players-hand-spark-overlay__detail" style={{ '--card-color': activeCard.color } as CSSProperties}>
                <div className="players-hand-spark-overlay__detail-row">
                  <span className="players-hand-spark-overlay__rarity-chip">{activeCard.rarity}</span>
                  <span className="players-hand-spark-overlay__role-chip">{activeCard.role}</span>
                </div>
                <div className="players-hand-spark-overlay__detail-title">{activeCard.icon} {activeCard.title}</div>
                <p className="players-hand-spark-overlay__detail-meta">Level {activeCard.level}</p>
                <p className="players-hand-spark-overlay__detail-description">{activeCard.description}</p>
              </article>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
