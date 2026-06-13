import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
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
  overlayOnly?: boolean;
  onOpenProfile?: () => void;
  overlayVariant?: 'default' | 'fullscreen';
};

export function PlayersHandSparkPreview({
  hand,
  title = 'Players Hand SPARK Preview (Dev-only)',
  compact = false,
  openOnMount = false,
  onOverlayClose,
  overlayOnly = false,
  onOpenProfile,
  overlayVariant = 'default',
}: PlayersHandSparkPreviewProps) {
  const cards = useMemo(
    () => (hand ? adaptArchetypeHandToSparkPreview(hand) : buildDevOnlyFallbackSparkPreviewCards()),
    [hand],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'hand' | 'grid' | 'story'>('hand');
  const [isFocusedCardFlipped, setIsFocusedCardFlipped] = useState(false);
  const [cardAnnouncement, setCardAnnouncement] = useState('');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const swipeGestureRef = useRef<{ startX: number; startY: number; isTracking: boolean } | null>(null);

  const dominantCard = cards.find((card) => card.role === 'dominant') ?? cards[0];
  const secondaryCard = cards.find((card) => card.role === 'secondary') ?? null;
  const supportCards = cards.filter((card) => card.role === 'support');
  const shadowCard = cards.find((card) => card.role === 'shadow') ?? null;
  const activeCard = cards[activeIndex] ?? dominantCard;
  const activeActivationCopy = activeCard?.activationCopy ?? null;
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

  useEffect(() => {
    if (!expanded || typeof window === 'undefined' || typeof document === 'undefined') return;

    const { body, documentElement } = document;
    const previous = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      bodyTouchAction: body.style.touchAction,
      docOverflow: documentElement.style.overflow,
      docOverscrollBehavior: documentElement.style.overscrollBehavior,
    };
    const scrollY = window.scrollY;

    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.touchAction = 'none';
    documentElement.style.overflow = 'hidden';
    documentElement.style.overscrollBehavior = 'none';

    return () => {
      body.style.overflow = previous.bodyOverflow;
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.width = previous.bodyWidth;
      body.style.touchAction = previous.bodyTouchAction;
      documentElement.style.overflow = previous.docOverflow;
      documentElement.style.overscrollBehavior = previous.docOverscrollBehavior;
      window.scrollTo(0, scrollY);
    };
  }, [expanded]);

  const closeOverlay = () => {
    setExpanded(false);
    onOverlayClose?.();
  };

  const renderActivationSection = () => {
    if (!activeCard || !activeActivationCopy) {
      return (
        <article className="players-hand-spark-overlay__story-panel players-hand-spark-overlay__activation">
          <h5>Activation & Shadow</h5>
          <p>Activation & Shadow details are available for select cards first. This card keeps its existing role, level, and identity details.</p>
          <p className="players-hand-spark-overlay__activation-context">
            Every card has a gift and a shadow. Your Shadow Card is the part of your hand that may be asking for growth next.
          </p>
        </article>
      );
    }

    const fields = [
      ['Core Gift', activeActivationCopy.coreGift],
      ['Shadow Pattern', activeActivationCopy.shadowPattern],
      ['Activation Trigger', activeActivationCopy.activationTrigger],
      ['Growth Lesson', activeActivationCopy.growthLesson],
      ['Quest Prompt', activeActivationCopy.questPrompt],
    ] as const;

    return (
      <article
        className="players-hand-spark-overlay__story-panel players-hand-spark-overlay__activation"
        style={{ '--card-color': activeCard.color } as CSSProperties}
      >
        <div className="players-hand-spark-overlay__activation-header">
          <div>
            <h5>Activation & Shadow</h5>
            <p className="players-hand-spark-overlay__activation-subtitle">
              {activeActivationCopy.elementIcon ? `${activeActivationCopy.elementIcon} ` : ''}{activeCard.title}
            </p>
          </div>
          {activeActivationCopy.element ? (
            <span className="players-hand-spark-overlay__activation-element">
              {activeActivationCopy.elementIcon ? <span aria-hidden="true">{activeActivationCopy.elementIcon}</span> : null}
              {activeActivationCopy.element}
            </span>
          ) : null}
        </div>
        <p className="players-hand-spark-overlay__activation-context">
          No emotion is bad. Every emotion is a messenger. But not every impulse should be obeyed.
        </p>
        <dl className="players-hand-spark-overlay__activation-list">
          {fields.map(([label, value]) => (
            <div key={label} className="players-hand-spark-overlay__activation-item">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {activeActivationCopy.note ? (
          <p className="players-hand-spark-overlay__activation-note">{activeActivationCopy.note}</p>
        ) : null}
        <p className="players-hand-spark-overlay__activation-context">
          Every card has a gift and a shadow. Your Shadow Card is the part of your hand that may be asking for growth next.
        </p>
      </article>
    );
  };

  const swipeThresholdPx = 42;
  const startSwipeGesture = (x: number, y: number) => {
    swipeGestureRef.current = { startX: x, startY: y, isTracking: true };
  };
  const finishSwipeGesture = (x: number, y: number) => {
    const gesture = swipeGestureRef.current;
    swipeGestureRef.current = null;
    if (!gesture?.isTracking || cards.length < 2) return;
    const deltaX = x - gesture.startX;
    const deltaY = y - gesture.startY;
    const isHorizontalIntent = Math.abs(deltaX) > Math.abs(deltaY) * 1.2;
    if (!isHorizontalIntent || Math.abs(deltaX) < swipeThresholdPx) return;

    if (deltaX < 0 && activeIndex < cards.length - 1) {
      setActiveIndex(activeIndex + 1);
      setIsFocusedCardFlipped(false);
      return;
    }
    if (deltaX > 0 && activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
      setIsFocusedCardFlipped(false);
    }
  };

  return (
    <section
      className={`players-hand-spark-preview${compact ? ' players-hand-spark-preview--compact' : ''}${overlayOnly ? ' players-hand-spark-preview--overlay-only' : ''}`}
      aria-label="Players hand SPARK preview"
    >
      {!overlayOnly && (
        <>
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
        </>
      )}

      {expanded && (
        <div
          className={`players-hand-spark-overlay${
            overlayVariant === 'fullscreen' ? ' players-hand-spark-overlay--fullscreen' : ''
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Players hand details"
        >
          <button className="players-hand-spark-overlay__backdrop" aria-label="Close hand preview" onClick={closeOverlay} />
          <div className="players-hand-spark-overlay__panel">
            <header className="players-hand-spark-overlay__header">
              <h4>{title}</h4>
              <div className="players-hand-spark-overlay__header-actions">
                {onOpenProfile ? (
                  <button
                    type="button"
                    className="players-hand-spark-overlay__profile"
                    aria-label="Open profile"
                    onClick={() => {
                      closeOverlay();
                      onOpenProfile();
                    }}
                  >
                    Profile
                  </button>
                ) : null}
                <button type="button" className="players-hand-spark-overlay__close" onClick={closeOverlay} aria-label="Close hand preview">✕</button>
              </div>
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
            <div
              className="players-hand-spark-overlay__fan"
              aria-label="Select a card from your hand"
              onTouchStart={(event) => {
                const touch = event.touches[0];
                if (!touch) return;
                startSwipeGesture(touch.clientX, touch.clientY);
              }}
              onTouchEnd={(event) => {
                const touch = event.changedTouches[0];
                if (!touch) return;
                finishSwipeGesture(touch.clientX, touch.clientY);
              }}
              onPointerDown={(event) => {
                if (event.pointerType === 'mouse') return;
                startSwipeGesture(event.clientX, event.clientY);
              }}
              onPointerUp={(event) => {
                if (event.pointerType === 'mouse') return;
                finishSwipeGesture(event.clientX, event.clientY);
              }}
            >
              {cards.map((card, index) => {
                const relative = index - activeIndex;
                const selected = relative === 0;
                return (
                  <button
                    key={card.id}
                    type="button"
                    className={`players-hand-spark-preview__card${selected ? ' is-selected' : ''}`}
                    aria-label={
                      selected
                        ? isFocusedCardFlipped
                          ? `Show front of ${card.title}`
                          : `Show details for ${card.title}`
                        : `Focus ${card.title}`
                    }
                    style={{
                      '--card-color': card.color,
                      zIndex: cards.length - Math.abs(relative),
                      transform: `translate(${relative * 62}px, ${Math.abs(relative) * 18}px) rotate(${relative * 9}deg) scale(${selected ? 1.06 : 0.9})`,
                    } as CSSProperties}
                    onClick={() => {
                      if (selected) {
                        const nextIsFlipped = !isFocusedCardFlipped;
                        setIsFocusedCardFlipped(nextIsFlipped);
                        setCardAnnouncement(
                          nextIsFlipped ? `Showing details for ${card.title}` : `Showing front of ${card.title}`,
                        );
                        return;
                      }
                      setActiveIndex(index);
                      setIsFocusedCardFlipped(false);
                      setCardAnnouncement(`Focused ${card.title}. Select to flip for details.`);
                    }}
                  >
                    <div
                      className={`players-hand-spark-preview__card-inner${
                        selected && isFocusedCardFlipped ? ' is-flipped' : ''
                      }${prefersReducedMotion ? ' reduced-motion' : ''}`}
                    >
                      <div className="players-hand-spark-preview__card-face players-hand-spark-preview__card-face--front">
                        <span className="players-hand-spark-preview__meta">
                          <span className="players-hand-spark-preview__badge">{card.role}</span>
                          <span className="players-hand-spark-preview__badge">Lv {card.level}</span>
                        </span>
                        <span className="players-hand-spark-preview__title">
                          <span aria-hidden="true">{card.icon}</span> {card.title}
                        </span>
                        <span className="players-hand-spark-preview__rarity">{card.rarity}</span>
                        {selected ? (
                          <span className="players-hand-spark-preview__card-prompt">Select to flip for details</span>
                        ) : null}
                      </div>
                      <div className="players-hand-spark-preview__card-face players-hand-spark-preview__card-face--back">
                        <span className="players-hand-spark-preview__meta">
                          <span className="players-hand-spark-preview__badge">{card.rarity}</span>
                          <span className="players-hand-spark-preview__badge">{card.role}</span>
                        </span>
                        <span className="players-hand-spark-preview__title">
                          <span aria-hidden="true">{card.icon}</span> {card.title}
                        </span>
                        <span className="players-hand-spark-preview__description">{card.description}</span>
                        {card.activationCopy ? (
                          <span className="players-hand-spark-preview__activation-tease">
                            {card.activationCopy.elementIcon ? <span aria-hidden="true">{card.activationCopy.elementIcon}</span> : null}
                            Activation & Shadow available in Identity tab
                          </span>
                        ) : null}
                        <span className="players-hand-spark-preview__card-prompt">Select to show front</span>
                      </div>
                    </div>
                  </button>
                );
              })}
              <p className="players-hand-spark-overlay__swipe-hint">Swipe or tap cards</p>
              <span className="sr-only" aria-live="polite">{cardAnnouncement}</span>
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

                {renderActivationSection()}

                <article className="players-hand-spark-overlay__story-panel">
                  <h5>Identity summary</h5>
                  <p>{identitySummary ? `Your hand blends ${identitySummary}.` : 'Your hand is forming your identity style.'}</p>
                  <p>
                    Your hand is made of {cards.length} cards across {Array.from(new Set(cards.map((card) => card.role))).join(', ')} roles.
                  </p>
                </article>
              </section>
            )}

          </div>
        </div>
      )}
    </section>
  );
}
