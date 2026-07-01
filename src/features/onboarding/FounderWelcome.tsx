import { useEffect, useState } from 'react';

export type FounderWelcomeSlide = {
  id: string;
  title: string;
  body: string[];
  cta: string;
};

// First-start founder sequence copy. The top label, sequence title, and
// "— EJ" signature are constant chrome shown on every panel.
const FOUNDER_SLIDES: FounderWelcomeSlide[] = [
  { id: 'panel-0', title: 'So…', body: ['Ask yourself:'], cta: 'Continue' },
  {
    id: 'panel-1',
    title: 'What are you naturally good at?',
    body: [
      'What do you care about?',
      'And what would you genuinely like to do in a world of endless possibilities?',
    ],
    cta: 'Next',
  },
  {
    id: 'panel-2',
    title: 'Understanding yourself is valuable.',
    body: ['Turning that insight into meaningful goals is even better.'],
    cta: 'Next',
  },
  {
    id: 'panel-3',
    title: 'But setting goals is rarely the hardest part.',
    body: ['The real challenge is staying connected to them when life gets busy.'],
    cta: 'Next',
  },
  {
    id: 'panel-4',
    title: 'Missed days should not become symbols of failure.',
    body: ['This app helps you return without guilt, pressure, or judgement.'],
    cta: 'Next',
  },
  {
    id: 'panel-5',
    title: 'When something has been ignored for too long, it can reappear inside the game in a creative, low-resistance way.',
    body: ['Not as punishment.', 'As another path back.'],
    cta: 'Next',
  },
  {
    id: 'panel-6',
    title: 'Progress does not have to mean a perfect streak.',
    body: ['What matters is how often you showed up over time—and whether you kept moving forward.'],
    cta: 'Next',
  },
  {
    id: 'panel-7',
    title: 'Then we pair it with a game designed to bring you back.',
    body: [
      'What will the next island be like?',
      'Which creature will hatch next?',
      'Will it be the perfect companion for you?',
    ],
    cta: 'Next',
  },
  {
    id: 'panel-8',
    title: 'Rare rewards.',
    body: ['Short, engaging stories.', 'New surprises.', 'What will happen next?'],
    cta: 'Next',
  },
  {
    id: 'panel-9',
    title: 'Choose the themes you enjoy.',
    body: [
      'Shape how your journey feels.',
      'Connect your real-life progress to a world that grows with you.',
    ],
    cta: 'Next',
  },
  {
    id: 'panel-10',
    title: 'You can also suggest ideas and vote on what should be built next.',
    body: [
      'Support the features you believe in, receive special perks, and help keep the app growing.',
    ],
    cta: 'Next',
  },
  {
    id: 'final',
    title: 'A game that helps you notice your progress.',
    body: [
      'A game that makes returning feel rewarding.',
      'A game that brings you back.',
      'Click Play.',
    ],
    cta: 'Play',
  },
];

const SEQUENCE_LABEL = 'From the creator';
const SEQUENCE_TITLE = 'A note from the creator';

// Long-form founder philosophy note, opened from panel 3's secondary link and
// from the "About HabitGame" entry in the Feedback & Support menu.
// Each array entry is its own paragraph, so the short standalone lines are
// given room to breathe. Multi-line stanzas (the "Sometimes…" block) are
// separated with "\n" and rendered with white-space: pre-line.
export const FULL_CREATOR_NOTE = {
  title: 'A note from the creator',
  body: [
    'I’m building HabitGame because I believe growth should feel more alive.',
    'Most habit apps begin with a familiar kind of hope. You open the app, set goals, create habits, and imagine a better version of your life. For a while, it feels exciting.',
    'Then real life enters the picture.',
    'You miss a few days. Your energy changes. Your goals stop fitting. You realize you added too much at once. Your environment works against you. Something unexpected happens. Or maybe you simply need to rest.',
    'And when that happens, many habit apps start to feel like proof that you failed.',
    'I want HabitGame to feel different.',
    'The idea is to pair self-improvement with a cozy game world, so there is always a gentle reason to return. Not just to collect rewards, but to be pulled back toward your habits, goals, reflections, and the small real-life actions that move your story forward.',
    'Your habits, goals, and reflections should feel connected.',
    'Not like separate checklists. Not like disconnected tools. Not like a flat template you fill out once and forget.',
    'They should feel like one personal quest.',
    'A quest that helps you notice what matters. A quest that gives you momentum when you are ready to move. A quest that lets you reset when life gets messy. A quest that can evolve as you evolve.',
    'HabitGame is also built around the idea of balance.',
    'Because a better life is not about maximizing one thing at the cost of everything else. Productivity without health can become burnout. Ambition without relationships can become lonely. Discipline without joy can become heavy. Rest without direction can become drifting.',
    'The goal is not perfection.',
    'The goal is a Life Wheel that becomes more balanced over time — with health, purpose, relationships, growth, money, energy, joy, and direction supporting each other instead of competing against each other.',
    'Sometimes the next step is a habit.\nSometimes it is a reflection.\nSometimes it is a reset.\nSometimes it is a small win.\nSometimes it is changing the quest itself.',
    'That is what I want HabitGame to become: a living system where your real-life progress grows the game, and the game helps guide you back toward a more aligned life.',
    'HabitGame is still in demo mode. Some features are live, some are previews, and many are still being built. It does not solve all of this yet.',
    'But that is the mission.',
    'I want early users to help shape what gets built next. Your feedback can influence what becomes simpler, what becomes deeper, what becomes more useful, and what actually helps people keep returning to their own life.',
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

type CreatorNoteModalProps = {
  onClose: () => void;
  /** Signature shown under the note. Defaults to the creator's initials. */
  founderName?: string;
  /** Label for the bottom dismiss button. */
  closeLabel?: string;
};

/**
 * The long-form founder philosophy note as a standalone, scrollable dark
 * modal. Reused from panel 3 of the founder welcome and from the
 * "About HabitGame" entry in the app menu. The body scrolls within a fixed
 * max-height card so it stays usable on small iPhone screens.
 */
export function CreatorNoteModal({
  onClose,
  founderName = 'EJ',
  closeLabel = 'Back',
}: CreatorNoteModalProps) {
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
            {closeLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export function FounderWelcome({ onComplete, founderName = 'EJ' }: FounderWelcomeProps) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [showFullNote, setShowFullNote] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => setIntroComplete(true), 2600);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
    };
  }, []);
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
      {!introComplete ? (
        <section className="founder-welcome__intro" aria-live="polite">
          <div className="founder-welcome__intro-orb" aria-hidden="true" />
          <p className="founder-welcome__eyebrow">First launch</p>
          <h2>One small spark can become a world.</h2>
          <p>Preparing your first island…</p>
        </section>
      ) : (
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
      )}

      {showFullNote ? (
        <CreatorNoteModal onClose={() => setShowFullNote(false)} founderName={founderName} />
      ) : null}
    </div>
  );
}
