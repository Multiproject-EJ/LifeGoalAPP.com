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
  openOnMount?: boolean;
  onOverlayClose?: () => void;
};

export function PlayersHandSparkPreview({
  hand,
  title = 'Players Hand SPARK Preview (Dev-only)',
  compact = false,
  openOnMount = false,
  onOverlayClose,
}: PlayersHandSparkPreviewProps) {
  const cards = useMemo(
    () => (hand ? adaptArchetypeHandToSparkPreview(hand) : buildDevOnlyFallbackSparkPreviewCards()),
    [hand],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'hand' | 'grid' | 'story'>('hand');
  const [isFocusedCardFlipped, setIsFocusedCardFlipped] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const activeCard = cards[activeIndex] ?? cards[0];
  const dominantCard = cards.find((card) => card.role === 'dominant') ?? cards[0];
  const secondaryCard = cards.find((card) => card.role === 'secondary') ?? null;
  const supportCards = cards.filter((card) => card.role === 'support');
  const shadowCard = cards.find((card) => card.role === 'shadow') ?? null;
  const identitySummary = [dominantCard?.title, secondaryCard?.title, supportCards[0]?.title]
    .filter(Boolean)
    .join(' • ');

  useEffect(() => {
    if (!expanded) return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [expanded]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setPrefersReducedMotion(media.matches);
    updateMotionPreference();
    media.addEventListener('change', updateMotionPreference);
    return () => media.removeEventListener('change', updateMotionPreference);
  }, []);

  useEffect(() => {
    if (!openOnMount) return;
    setExpanded(true);
    setViewMode('hand');
  }, [openOnMount]);

  const closeOverlay = () => {
    setExpanded(false);
    onOverlayClose?.();
  };

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
        onClick={() => {
          setExpanded(true);
          setViewMode('hand');
        }}
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
          <button className="players-hand-spark-overlay__backdrop" aria-label="Close hand preview" onClick={closeOverlay} />
          <div className="players-hand-spark-overlay__panel">
            <header className="players-hand-spark-overlay__header">
              <h4>{title}</h4>
              <button type="button" className="players-hand-spark-overlay__close" onClick={closeOverlay} aria-label="Close hand preview">✕</button>
            </header>

            <div className="players-hand-spark-overlay__view-mode" role="tablist" aria-label="Hand display mode">
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'hand'}
                className={`players-hand-spark-overlay__view-tab${viewMode === 'hand' ? ' is-active' : ''}`}
                onClick={() => setViewMode('hand')}
              >
                Hand
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'grid'}
                className={`players-hand-spark-overlay__view-tab${viewMode === 'grid' ? ' is-active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                All Cards
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'story'}
                className={`players-hand-spark-overlay__view-tab${viewMode === 'story' ? ' is-active' : ''}`}
                onClick={() => setViewMode('story')}
              >
                Identity
              </button>
            </div>

            {viewMode === 'hand' ? (
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
                    onClick={() => {
                      setActiveIndex(index);
                      setIsFocusedCardFlipped(false);
                    }}
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
            ) : viewMode === 'grid' ? (
              <div className="players-hand-spark-overlay__grid" aria-label="Browse all cards in your hand">
                {cards.map((card, index) => {
                  const selected = index === activeIndex;
                  return (
                    <button
                      key={`grid-${card.id}`}
                      type="button"
                      className={`players-hand-spark-overlay__grid-card${selected ? ' is-selected' : ''}`}
                      aria-label={`View ${card.title} in hand mode`}
                      style={{ '--card-color': card.color } as CSSProperties}
                      onClick={() => {
                        setActiveIndex(index);
                        setIsFocusedCardFlipped(false);
                        setViewMode('hand');
                      }}
                    >
                      <span className="players-hand-spark-overlay__grid-meta">
                        <span className="players-hand-spark-preview__badge">{card.role}</span>
                        <span className="players-hand-spark-preview__badge">Lv {card.level}</span>
                      </span>
                      <span className="players-hand-spark-overlay__grid-title">{card.icon} {card.title}</span>
                      <span className="players-hand-spark-preview__rarity">{card.rarity}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <section className="players-hand-spark-overlay__story" aria-label="Identity story summary">
                {dominantCard && (
                  <button
                    type="button"
                    className="players-hand-spark-overlay__story-core"
                    style={{ '--card-color': dominantCard.color } as CSSProperties}
                    aria-label={`Focus core identity card ${dominantCard.title}`}
                    onClick={() => {
                      setActiveIndex(cards.findIndex((card) => card.id === dominantCard.id));
                      setIsFocusedCardFlipped(false);
                      setViewMode('hand');
                    }}
                  >
                    <span className="players-hand-spark-overlay__story-label">Core Identity</span>
                    <span className="players-hand-spark-overlay__story-title">{dominantCard.icon} {dominantCard.title}</span>
                    <span className="players-hand-spark-overlay__story-copy">{dominantCard.description}</span>
                  </button>
                )}

                <article className="players-hand-spark-overlay__story-panel">
                  <h5>Your strengths</h5>
                  <div className="players-hand-spark-overlay__story-list">
                    {[secondaryCard, ...supportCards].filter(Boolean).map((card) => (
                      <button
                        key={`story-strength-${card!.id}`}
                        type="button"
                        className="players-hand-spark-overlay__story-chip"
                        style={{ '--card-color': card!.color } as CSSProperties}
                        aria-label={`Focus strength card ${card!.title}`}
                        onClick={() => {
                          setActiveIndex(cards.findIndex((entry) => entry.id === card!.id));
                          setIsFocusedCardFlipped(false);
                          setViewMode('hand');
                        }}
                      >
                        {card!.icon} {card!.title}
                      </button>
                    ))}
                  </div>
                </article>

                {shadowCard && (
                  <article className="players-hand-spark-overlay__story-panel" style={{ '--card-color': shadowCard.color } as CSSProperties}>
                    <h5>Growth edge</h5>
                    <button
                      type="button"
                      className="players-hand-spark-overlay__story-chip"
                      aria-label={`Focus growth edge card ${shadowCard.title}`}
                      onClick={() => {
                        setActiveIndex(cards.findIndex((entry) => entry.id === shadowCard.id));
                        setIsFocusedCardFlipped(false);
                        setViewMode('hand');
                      }}
                    >
                      {shadowCard.icon} {shadowCard.title}
                    </button>
                    <p>{shadowCard.description}</p>
                  </article>
                )}

                <article className="players-hand-spark-overlay__story-panel">
                  <h5>Identity summary</h5>
                  <p>{identitySummary ? `Your hand blends ${identitySummary}.` : 'Your hand is forming your identity style.'}</p>
                  <p>
                    Your hand is made of {cards.length} cards across {Array.from(new Set(cards.map((card) => card.role))).join(', ')} roles.
                  </p>
                </article>
              </section>
            )}

            {activeCard && viewMode === 'hand' && (
              <article className="players-hand-spark-overlay__detail" style={{ '--card-color': activeCard.color } as CSSProperties}>
                <div className="players-hand-spark-overlay__detail-controls">
                  <span className="players-hand-spark-overlay__detail-affordance">Tap card for details</span>
                  <button
                    type="button"
                    className="players-hand-spark-overlay__flip-button"
                    aria-label={isFocusedCardFlipped ? `Show front of ${activeCard.title}` : `Show details for ${activeCard.title}`}
                    onClick={() => setIsFocusedCardFlipped((prev) => !prev)}
                  >
                    {isFocusedCardFlipped ? 'Show front' : 'Flip for details'}
                  </button>
                </div>

                <button
                  type="button"
                  className={`players-hand-spark-overlay__focus-card${isFocusedCardFlipped ? ' is-flipped' : ''}${prefersReducedMotion ? ' reduced-motion' : ''}`}
                  style={{ '--card-color': activeCard.color } as CSSProperties}
                  aria-label={isFocusedCardFlipped ? `Card back for ${activeCard.title}` : `Card front for ${activeCard.title}`}
                  onClick={() => setIsFocusedCardFlipped((prev) => !prev)}
                >
                  <span className="players-hand-spark-overlay__focus-face players-hand-spark-overlay__focus-face--front">
                    <span className="players-hand-spark-overlay__focus-row">
                      <span className="players-hand-spark-overlay__rarity-chip">{activeCard.rarity}</span>
                      <span className="players-hand-spark-overlay__role-chip">{activeCard.role}</span>
                    </span>
                    <span className="players-hand-spark-overlay__focus-title">{activeCard.icon} {activeCard.title}</span>
                    <span className="players-hand-spark-overlay__focus-level">Level {activeCard.level}</span>
                  </span>

                  <span className="players-hand-spark-overlay__focus-face players-hand-spark-overlay__focus-face--back">
                    <span className="players-hand-spark-overlay__focus-row">
                      <span className="players-hand-spark-overlay__rarity-chip">{activeCard.rarity}</span>
                      <span className="players-hand-spark-overlay__role-chip">{activeCard.role}</span>
                    </span>
                    <span className="players-hand-spark-overlay__focus-title">{activeCard.title}</span>
                    <span className="players-hand-spark-overlay__focus-description">{activeCard.description}</span>
                  </span>
                </button>
              </article>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
