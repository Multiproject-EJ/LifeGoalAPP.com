import { useMemo, useState, type CSSProperties } from 'react';
import type { ArchetypeHand } from '../../identity/archetypes/archetypeHandBuilder';
import {
  adaptArchetypeHandToSparkPreview,
  buildDevOnlyFallbackSparkPreviewCards,
} from './playersHandSparkAdapter';
import './PlayersHandSparkPreview.css';

type PlayersHandSparkPreviewProps = {
  hand?: ArchetypeHand | null;
  title?: string;
};

export function PlayersHandSparkPreview({
  hand,
  title = 'Players Hand SPARK Preview (Dev-only)',
}: PlayersHandSparkPreviewProps) {
  const cards = useMemo(
    () => (hand ? adaptArchetypeHandToSparkPreview(hand) : buildDevOnlyFallbackSparkPreviewCards()),
    [hand],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="players-hand-spark-preview" aria-label="Players hand SPARK preview">
      <header className="players-hand-spark-preview__header">
        <h3>{title}</h3>
        <p>Preview-only SPARK-style fan hand using canonical archetype hand mapping.</p>
      </header>

      <div className="players-hand-spark-preview__mini" aria-hidden="true" onClick={() => setExpanded(true)}>
        {cards.map((card, index) => {
          const center = (cards.length - 1) / 2;
          const offset = index - center;
          return (
            <div
              key={`mini-${card.id}`}
              className="players-hand-spark-preview__mini-card"
              style={{ '--card-color': card.color, transform: `translateX(${offset * 26}px) rotate(${offset * 7}deg)` } as CSSProperties}
            >
              {card.icon}
            </div>
          );
        })}
      </div>

      {expanded && (
        <div className="players-hand-spark-preview__fan">
          {cards.map((card, index) => {
            const relative = index - activeIndex;
            return (
              <button
                key={card.id}
                type="button"
                className="players-hand-spark-preview__card"
                style={{
                  '--card-color': card.color,
                  zIndex: cards.length - Math.abs(relative),
                  transform: `translate(${relative * 88}px, ${Math.abs(relative) * 16}px) rotate(${relative * 9}deg) scale(${relative === 0 ? 1.04 : 0.94})`,
                } as CSSProperties}
                onClick={() => setActiveIndex(index)}
              >
                <div className="players-hand-spark-preview__meta">
                  <span>{card.role}</span>
                  <span>Lv {card.level}</span>
                </div>
                <div className="players-hand-spark-preview__title">{card.icon} {card.title}</div>
                <div className="players-hand-spark-preview__desc">{card.description}</div>
                <div className="players-hand-spark-preview__desc">Rarity: {card.rarity}</div>
              </button>
            );
          })}
        </div>
      )}
      <button className="players-hand-spark-preview__toggle" type="button" onClick={() => setExpanded((v) => !v)}>
        {expanded ? 'Hide fan hand preview' : 'Open fan hand preview'}
      </button>
    </section>
  );
}
