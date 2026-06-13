import { useState } from 'react';

export type FounderWelcomeSlide = {
  id: string;
  title: string;
  body: string[];
  cta: string;
};

// Final founder-note copy. Keep three slides: why it exists / falling off
// isn't failure / this is the beginning. The top label, sequence title, and
// "— EJ" signature are constant chrome shown on every panel.
const FOUNDER_SLIDES: FounderWelcomeSlide[] = [
  {
    id: 'why',
    title: 'Why HabitGame exists',
    body: [
      'Most habit apps are easy to stop using.',
      'HabitGame pairs self-improvement with a cozy game, so coming back feels natural — and each return can gently pull you back into habits, goals, and small real-life progress.',
    ],
    cta: 'Continue',
  },
  {
    id: 'forgiving',
    title: 'Falling off shouldn’t feel like failure',
    body: [
      'Too often, habit apps start with excitement, then slowly become reminders that you fell off.',
      'Life changes. Motivation drops. Goals shift. Sometimes you need a break, a reset, or a better path.',
      'HabitGame is meant to make growth feel more forgiving, adaptive, and easier to return to.',
    ],
    cta: 'Next',
  },
  {
    id: 'beginning',
    title: 'This is only the beginning',
    body: [
      'I want the journey itself to feel alive — not just planned on a static page.',
      'HabitGame is still in demo mode, and it does not solve all of this yet — but that is the goal.',
      'Your feedback will help shape what gets built next.',
    ],
    cta: 'Start exploring',
  },
];

const SEQUENCE_LABEL = 'From the creator';
const SEQUENCE_TITLE = 'A note from the creator';

// Long-form creator note, opened from panel 3's secondary link.
// Stanza lines are separated with "\n" and rendered with white-space: pre-line.
export const FULL_CREATOR_NOTE = {
  title: 'A note from the creator',
  body: [
    'I’m building HabitGame because I think self-improvement apps often miss the emotional part.',
    'Most habit apps start with hope. You feel motivated, you set up your goals, you add new habits, and for a while it feels like you are finally changing your life.',
    'But then life happens.',
    'You miss a few days. Your motivation drops. The habits you chose may not fit your real routine. You may have tried to change too much at once. Your environment may be making progress harder, not easier. Your goals may shift. Or maybe you simply needed a break.',
    'And suddenly, the app that was supposed to help you can start to feel like a reminder that you failed.',
    'I don’t think it has to work that way.',
    'HabitGame is my attempt to build something more forgiving, more playful, and easier to return to. The idea is to pair real-life progress with a cozy game world, so there is always a gentle reason to come back. And when you come back, the game can help pull you back toward your habits, goals, reflections, and small improvements.',
    'The bigger idea is that growth should feel alive.',
    'Instead of only filling out long templates, static plans, and endless checklists, I want HabitGame to become a journey that adapts with you. A place where your daily actions matter, but where falling off does not mean the story is over. A place where you can reset, adjust, simplify, and continue.',
    'Sometimes progress is about consistency.\nSometimes it is about rest.\nSometimes it is about changing direction when your life changes.\nAnd sometimes inspiration hits, and you need to leap forward into a new version of your quest.',
    'HabitGame is still in demo mode. Some features are live, some are previews, and many are still being shaped. It does not solve all of this yet.',
    'But that is the goal.',
    'I want early users to help shape what this becomes. Your feedback can influence which features get built, what needs to feel better, what should be simpler, and what actually helps in real life.',
    'Thank you for being here early.',
  ],
  signOff: '— EJ',
};

type FounderWelcomeProps = {
  onComplete: () => void;
  /** Signature shown subtly on each panel. Defaults to the creator's initials. */
  founderName?: string;
};

/**
 * Decorative, icon/CSS-based hero for each panel. These are intentionally
 * lightweight cozy placeholders — see FounderWelcome notes for where future
 * image/Lottie assets could drop in without changing the layout.
 *
 * why        → stepping stones leading to a warm glowing doorway
 * forgiving  → a paused path that gently reconnects past a checkpoint
 * beginning  → a small living roadmap of feature states
 */
function FounderHero({ slideId }: { slideId: string }) {
  return (
    <div className={`founder-welcome__hero founder-welcome__hero--${slideId}`} aria-hidden="true">
      <span className="founder-welcome__hero-glow" />
      {slideId === 'why' ? (
        <div className="founder-welcome__hero-path">
          <span className="founder-welcome__hero-stone" />
          <span className="founder-welcome__hero-stone" />
          <span className="founder-welcome__hero-stone" />
          <span className="founder-welcome__hero-door" />
        </div>
      ) : null}
      {slideId === 'forgiving' ? (
        <div className="founder-welcome__hero-reset">
          <span className="founder-welcome__hero-trail" />
          <span className="founder-welcome__hero-gap" />
          <span className="founder-welcome__hero-checkpoint">⚑</span>
          <span className="founder-welcome__hero-trail" />
        </div>
      ) : null}
      {slideId === 'beginning' ? (
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

function FullCreatorNote({ onClose, founderName }: { onClose: () => void; founderName: string }) {
  return (
    <div
      className="creator-note"
      role="dialog"
      aria-modal="true"
      aria-label={FULL_CREATOR_NOTE.title}
    >
      <div className="creator-note__backdrop" aria-hidden="true" onClick={onClose} />
      <section className="creator-note__card">
        <header className="creator-note__head">
          <p className="founder-welcome__eyebrow">{SEQUENCE_LABEL}</p>
          <h2 className="creator-note__title">{FULL_CREATOR_NOTE.title}</h2>
          <button
            type="button"
            className="creator-note__close"
            onClick={onClose}
            aria-label="Close the full creator note"
          >
            ✕
          </button>
        </header>
        <div className="creator-note__body">
          {FULL_CREATOR_NOTE.body.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
          <p className="creator-note__signature">— {founderName}</p>
        </div>
        <div className="creator-note__actions">
          <button type="button" className="founder-welcome__primary" onClick={onClose}>
            Back
          </button>
        </div>
      </section>
    </div>
  );
}

export function FounderWelcome({ onComplete, founderName = 'EJ' }: FounderWelcomeProps) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [showFullNote, setShowFullNote] = useState(false);
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
          {isLastSlide ? (
            <button
              type="button"
              className="founder-welcome__text-action founder-welcome__text-action--quiet"
              onClick={() => setShowFullNote(true)}
            >
              Read the full creator note
            </button>
          ) : (
            <span />
          )}
        </div>
      </section>

      {showFullNote ? (
        <FullCreatorNote onClose={() => setShowFullNote(false)} founderName={founderName} />
      ) : null}
    </div>
  );
}
