import { useEffect, useState, type CSSProperties } from 'react';
import { CelebrationFireworks, scheduleRapidFireworksPreload } from '../components/CelebrationFireworks';
import './landingHeroShow.css';

/**
 * The landing hero's once-through story, played with CSS keyframes on
 * pre-rendered sprites (public/landing-page-assets/hero/README.md):
 * the caretaker's compass rises, he vanishes in a poof of fairy dust, the
 * game controller flies in and rolls a die, fireworks burst, it flies off,
 * and the robot trio arrives carrying the three egg tiers, sets them down
 * and builds the HABIT GAME title. The base styles are the final scene, so
 * reduced motion shows it statically.
 */

// A little ahead of the die landing (5.85s): video start-up takes a beat.
const FIREWORKS_AT_MS = 5200;
const TITLE = 'HABIT GAME';
// Deterministic fairy-dust scatter: end offset (cq units), start delay and size.
const DUST = Array.from({ length: 14 }, (_, index) => ({
  x: Math.round(Math.cos(index * 2.4) * (14 + ((index * 7) % 13))),
  y: Math.round(-12 - ((index * 11) % 30)),
  d: ((index * 37) % 50) / 100,
  s: 0.7 + ((index * 3) % 5) / 8,
}));
const PUFFS = Array.from({ length: 7 }, (_, index) => index);
const DIE_FACES = [6, 1, 2, 5, 3, 4];
const PIP_CELLS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function saveData(): boolean {
  return typeof navigator !== 'undefined'
    && Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
}

export function LandingHeroShow() {
  const [run, setRun] = useState(0);
  const [fireworks, setFireworks] = useState(false);

  useEffect(() => {
    setFireworks(false);
    if (prefersReducedMotion() || saveData()) return undefined;
    // Warm the video into the HTTP cache so the burst lands on the die roll
    // rather than whenever the download finishes.
    const cancelPreload = scheduleRapidFireworksPreload();
    const timer = window.setTimeout(() => setFireworks(true), FIREWORKS_AT_MS);
    return () => {
      cancelPreload();
      window.clearTimeout(timer);
    };
  }, [run]);

  return (
    <div className="lp-hero-art lp-show-wrap">
      <div key={run} className="lp-show" aria-hidden="true">
        <div className="lp-show-caretaker">
          <img
            className="lp-show-caretaker__img"
            src="/assets/island_caretakers/001/IMG_caretaker_3d_blue.webp"
            alt=""
            fetchPriority="high"
            decoding="async"
          />
          <img
            className="lp-show-compass"
            src="/assets/island_caretakers/001/first-light-caretaker.webp"
            alt=""
            decoding="async"
          />
        </div>

        <div className="lp-show-poof">
          {PUFFS.map((index) => <i key={index} className="lp-show-puff" style={{ '--i': index } as CSSProperties} />)}
          {DUST.map((dust, index) => (
            <i
              key={index}
              className="lp-show-dust"
              style={{ '--x': `${dust.x}cqh`, '--y': `${dust.y}cqh`, '--d': `${dust.d}s`, '--s': dust.s } as CSSProperties}
            />
          ))}
        </div>

        {fireworks ? (
          <CelebrationFireworks variant="rapid" className="lp-show-fireworks" onComplete={() => setFireworks(false)} />
        ) : null}

        <div className="lp-show-controller">
          <div className="lp-show-die">
            <div className="lp-show-die__cube">
              {DIE_FACES.map((face, index) => (
                <span key={face} className={`lp-show-die__face lp-show-die__face--${index}`}>
                  {Array.from({ length: 9 }, (_, cell) => (
                    <i key={cell} className={PIP_CELLS[face].includes(cell) ? 'is-pip' : undefined} />
                  ))}
                </span>
              ))}
            </div>
          </div>
          <img className="lp-show-controller__img" src="/landing-page-assets/hero/living-controller.webp" alt="" decoding="async" />
        </div>

        <div className="lp-show-robot lp-show-robot--heavy">
          <div className="lp-show-robot__bob">
            <img src="/landing-page-assets/hero/robot-heavy-worker.webp" alt="" decoding="async" />
          </div>
        </div>
        <div className="lp-show-robot lp-show-robot--manager">
          <div className="lp-show-robot__bob">
            <img src="/landing-page-assets/hero/robot-project-manager.webp" alt="" decoding="async" />
          </div>
        </div>
        <div className="lp-show-robot lp-show-robot--mini">
          <div className="lp-show-robot__bob">
            <img src="/landing-page-assets/hero/robot-mini-artist.webp" alt="" decoding="async" />
          </div>
        </div>

        <img className="lp-show-egg lp-show-egg--white" src="/assets/Eggs/Egg_common_lv1.webp" alt="" decoding="async" />
        <img className="lp-show-egg lp-show-egg--gold" src="/assets/Eggs/Egg_rare_lv1.webp" alt="" decoding="async" />
        <img className="lp-show-egg lp-show-egg--purple" src="/assets/Eggs/Egg_mystery_lv1.webp" alt="" decoding="async" />

        <div className="lp-show-title">
          {TITLE.split('').map((letter, index) => (
            letter === ' '
              ? <span key={index} className="lp-show-title__gap" />
              : <span key={index} className="lp-show-title__tile" style={{ '--i': index } as CSSProperties}>{letter}</span>
          ))}
        </div>
      </div>
      <button key={run} className="lp-show-replay" type="button" aria-label="Replay the intro animation" onClick={() => setRun((value) => value + 1)}>
        Replay
      </button>
    </div>
  );
}
