import { useState } from 'react';

export type FounderWelcomeSlide = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
};

// PLACEHOLDER COPY — replace `body` with the founder's real words.
// Keep three slides (why I built it / what it's for / where it's headed).
const FOUNDER_SLIDES: FounderWelcomeSlide[] = [
  {
    id: 'why',
    eyebrow: 'A note from the founder',
    title: 'Hey — I’m really glad you’re here.',
    body:
      'I built LifeGoalApp because I was tired of goal apps that felt like spreadsheets. I wanted something that made showing up for your own life feel like a game worth playing. This is that attempt. [Replace with your real story.]',
  },
  {
    id: 'what',
    eyebrow: 'What this is for',
    title: 'Turn your real life into the main quest.',
    body:
      'The goal is simple: help you take small, honest steps every day — on your health, your work, your relationships — and actually feel the progress. Your habits power a game; the game pulls you back to your habits. [Replace with your real framing.]',
  },
  {
    id: 'where',
    eyebrow: 'Where we’re headed',
    title: 'This is early — and you’re early with me.',
    body:
      'I’m building this in the open and shipping constantly. Things will change fast, and your play helps shape what comes next. Thank you for being one of the first to take the leap. [Replace with your real invitation.]',
  },
];

type FounderWelcomeProps = {
  onComplete: () => void;
  founderName?: string;
};

export function FounderWelcome({ onComplete, founderName }: FounderWelcomeProps) {
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
    <div className="founder-welcome" role="dialog" aria-modal="true" aria-label="Welcome from the founder">
      <div className="founder-welcome__backdrop" aria-hidden="true" />
      <section className="founder-welcome__card">
        <p className="founder-welcome__eyebrow">{slide.eyebrow}</p>
        <h2 className="founder-welcome__title">{slide.title}</h2>
        <p className="founder-welcome__body">{slide.body}</p>
        {isLastSlide && founderName ? (
          <p className="founder-welcome__signature">— {founderName}</p>
        ) : null}

        <div className="founder-welcome__dots" aria-hidden="true">
          {FOUNDER_SLIDES.map((item, index) => (
            <span
              key={item.id}
              className={`founder-welcome__dot${index === slideIndex ? ' is-active' : ''}`}
            />
          ))}
        </div>

        <div className="founder-welcome__actions">
          {slideIndex > 0 ? (
            <button type="button" className="founder-welcome__secondary" onClick={goBack}>
              Back
            </button>
          ) : (
            <span className="founder-welcome__step-label">
              {slideIndex + 1} of {FOUNDER_SLIDES.length}
            </span>
          )}
          <button type="button" className="founder-welcome__primary" onClick={goNext}>
            {isLastSlide ? 'Enter the app' : 'Next'}
          </button>
        </div>
      </section>
    </div>
  );
}
