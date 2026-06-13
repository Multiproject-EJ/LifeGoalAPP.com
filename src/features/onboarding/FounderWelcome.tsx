import { useState } from 'react';

export type FounderWelcomeSlide = {
  id: string;
  title: string;
  body: string[];
  cta: string;
};

// Final founder-note copy. Keep three slides: why I'm building it /
// what it's for / where it's headed. The top label, sequence title, and
// "— EJ" signature are constant chrome shown on every panel.
const FOUNDER_SLIDES: FounderWelcomeSlide[] = [
  {
    id: 'why',
    title: 'Why I’m building HabitGame',
    body: [
      'Most habit apps track progress, but don’t make growth feel meaningful.',
      'I wanted to build something more alive, motivating, and personal.',
    ],
    cta: 'Continue',
  },
  {
    id: 'point',
    title: 'The point of HabitGame',
    body: [
      'Your habits, goals, and reflections should feel connected.',
      'HabitGame turns small real-life actions into visible momentum and rewards.',
    ],
    cta: 'Next',
  },
  {
    id: 'public',
    title: 'Built in public. Shaped by users.',
    body: [
      'HabitGame is still in demo mode. Some features are live, some are previews, and more are being built.',
      'Your feedback will help shape where HabitGame goes next.',
    ],
    cta: 'Start exploring',
  },
];

const SEQUENCE_LABEL = 'From the creator';
const SEQUENCE_TITLE = 'A note from the creator';

type FounderWelcomeProps = {
  onComplete: () => void;
  /** Signature shown subtly on each panel. Defaults to the creator's initials. */
  founderName?: string;
};

/**
 * Decorative, icon/CSS-based hero for each panel. These are intentionally
 * lightweight placeholders — see FounderWelcome notes for where future
 * image/Lottie assets could drop in without changing the layout.
 */
function FounderHero({ slideId }: { slideId: string }) {
  return (
    <div className={`founder-welcome__hero founder-welcome__hero--${slideId}`} aria-hidden="true">
      <span className="founder-welcome__hero-glow" />
      {slideId === 'why' ? (
        <div className="founder-welcome__hero-path">
          <span className="founder-welcome__hero-check" />
          <span className="founder-welcome__hero-check" />
          <span className="founder-welcome__hero-check" />
          <span className="founder-welcome__hero-dot" />
          <span className="founder-welcome__hero-dot" />
          <span className="founder-welcome__hero-dot" />
        </div>
      ) : null}
      {slideId === 'point' ? (
        <div className="founder-welcome__hero-chain">
          <span className="founder-welcome__hero-node">✓</span>
          <span className="founder-welcome__hero-link" />
          <span className="founder-welcome__hero-node">◎</span>
          <span className="founder-welcome__hero-link" />
          <span className="founder-welcome__hero-node">⛰</span>
          <span className="founder-welcome__hero-link" />
          <span className="founder-welcome__hero-node">★</span>
        </div>
      ) : null}
      {slideId === 'public' ? (
        <div className="founder-welcome__hero-cards">
          <span className="founder-welcome__hero-tag">Live</span>
          <span className="founder-welcome__hero-tag">Demo</span>
          <span className="founder-welcome__hero-tag">Building</span>
          <span className="founder-welcome__hero-tag founder-welcome__hero-tag--spark">Feedback</span>
        </div>
      ) : null}
    </div>
  );
}

export function FounderWelcome({ onComplete, founderName = 'EJ' }: FounderWelcomeProps) {
  const [slideIndex, setSlideIndex] = useState(0);
  const slide = FOUNDER_SLIDES[slideIndex];
  const isLastSlide = slideIndex >= FOUNDER_SLIDES.length - 1;

  const goNext = () => {
    if (isLastSlide) {
      onComplete();
      return;
    }
    setSlideIndex((current) => Math.min(current + 1, FOUNDER_SLIDES.length - 1));
  };

  const goBack = () => {
    setSlideIndex((current) => Math.max(current - 1, 0));
  };

  return (
    <div
      className="founder-welcome"
      role="dialog"
      aria-modal="true"
      aria-label={SEQUENCE_TITLE}
    >
      <div className="founder-welcome__backdrop" aria-hidden="true" />
      <section className="founder-welcome__card">
        <header className="founder-welcome__head">
          <p className="founder-welcome__eyebrow">{SEQUENCE_LABEL}</p>
          <h2 className="founder-welcome__sequence-title">{SEQUENCE_TITLE}</h2>
          <div
            className="founder-welcome__dots"
            role="img"
            aria-label={`Step ${slideIndex + 1} of ${FOUNDER_SLIDES.length}`}
          >
            {FOUNDER_SLIDES.map((item, index) => (
              <span
                key={item.id}
                className={`founder-welcome__dot${index === slideIndex ? ' is-active' : ''}`}
              />
            ))}
          </div>
        </header>

        {/* key forces the panel to re-mount per slide so entrance animations replay */}
        <div className="founder-welcome__panel" key={slide.id}>
          <FounderHero slideId={slide.id} />
          <h3 className="founder-welcome__title">{slide.title}</h3>
          {slide.body.map((paragraph, index) => (
            <p className="founder-welcome__body" key={index}>
              {paragraph}
            </p>
          ))}
          <p className="founder-welcome__signature">— {founderName}</p>
        </div>

        <div className="founder-welcome__actions">
          <button type="button" className="founder-welcome__primary" onClick={goNext}>
            {slide.cta}
          </button>
        </div>

        <div className="founder-welcome__footer">
          {slideIndex > 0 ? (
            <button
              type="button"
              className="founder-welcome__text-action"
              onClick={goBack}
            >
              Back
            </button>
          ) : (
            <span />
          )}
          {!isLastSlide ? (
            <button
              type="button"
              className="founder-welcome__text-action"
              onClick={onComplete}
            >
              Explore now
            </button>
          ) : (
            <span />
          )}
        </div>
      </section>
    </div>
  );
}
