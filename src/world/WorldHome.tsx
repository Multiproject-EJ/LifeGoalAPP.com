import React, { useState } from 'react';
import './world.css';
import type { BeforeInstallPromptEvent } from './useInstallState.ts';
import { WorldHero } from './WorldHero.tsx';
import { AwakeningExperience } from './AwakeningExperience.tsx';
import { WorldGuides } from './WorldGuides.tsx';
import { WorldHowItWorksModal } from './WorldHowItWorksModal.tsx';
import { IOSInstallGuide } from './IOSInstallGuide.tsx';
import { useInstallState } from './useInstallState.ts';
import { useWorldAnalytics } from './useWorldAnalytics.ts';
import { joinPublicLaunchWaitlist } from '../services/publicLaunchWaitlist.ts';
import { CompassCrestBrand } from '../components/CompassCrestBrand.tsx';

interface WorldHomeProps {
  onContinue: () => void;
  onLogin: () => void;
  beforeInstallPromptEvent?: BeforeInstallPromptEvent | null;
}

const COMPASS_GAME_LOOP = [
  {
    number: '01',
    icon: '↻',
    title: 'Play for the joy of it',
    desc: 'Roll, explore, collect, and return because the game itself feels good.',
  },
  {
    number: '02',
    icon: '⚡',
    title: 'Catch a little energy',
    desc: 'Instead of losing every turn inside the loop, HabitGame diverts a tiny spark toward something useful.',
  },
  {
    number: '03',
    icon: '💧',
    title: 'Fill the book slowly',
    desc: 'Small questions arrive one drop at a time, gradually making your Compass Book more personal and valuable.',
  },
  {
    number: '04',
    icon: '✦',
    title: 'Choose how far it goes',
    desc: 'Stay game-first with simple starter actions, or connect real-life habits when that feels useful. Both paths count.',
  },
] as const;

export function WorldHome({ beforeInstallPromptEvent }: WorldHomeProps) {
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistStatus, setWaitlistStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [waitlistMessage, setWaitlistMessage] = useState('');
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const installState = useInstallState(beforeInstallPromptEvent ?? null);
  const { trackEvent } = useWorldAnalytics();

  const handleWebAppInstall = async () => {
    trackEvent('install_click');

    if (installState.platform === 'installed') return;

    if (installState.promptInstall) {
      await installState.promptInstall();
      return;
    }

    setShowInstallGuide(true);
  };

  const handleWaitlistSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (waitlistStatus === 'loading') return;

    setWaitlistStatus('loading');
    setWaitlistMessage('');
    trackEvent('waitlist_submit');

    const result = await joinPublicLaunchWaitlist(waitlistEmail);
    if (result.ok) {
      setWaitlistStatus('success');
      setWaitlistMessage(
        result.alreadyJoined
          ? 'You are already on the list — your place is safe.'
          : 'Your place is saved. We will meet you at the gates.',
      );
      trackEvent('waitlist_success');
      return;
    }

    setWaitlistStatus('error');
    setWaitlistMessage(result.error ?? 'We could not save your spot. Please try again.');
    trackEvent('waitlist_error');
  };

  return (
    <div className="world-home world-home--sales-split">
      <WorldHero>
        <div className="world-home__shell">
          <section className="world-home__hero-panel" aria-labelledby="world-home-title">
            <div className="world-home__message-column">
              <div className="world-home__brand">
                <CompassCrestBrand
                  className="world-home__crest-brand"
                  headingId="world-home-title"
                  asHeading
                  animated
                  variant="shield"
                />
                <div className="world-home__availability" aria-label="HabitGame availability">
                  <span className="world-home__store-badge world-home__store-badge--soon">
                    <i className="world-home__store-icon world-home__store-icon--apple" aria-hidden="true">●</i>
                    <span><small>Coming soon to the</small><strong>App Store</strong></span>
                  </span>
                  <span className="world-home__store-badge world-home__store-badge--soon">
                    <i className="world-home__store-icon world-home__store-icon--play" aria-hidden="true" />
                    <span><small>Coming soon on</small><strong>Google Play</strong></span>
                  </span>
                  <button
                    className="world-home__store-badge world-home__store-badge--web"
                    type="button"
                    onClick={handleWebAppInstall}
                    disabled={installState.platform === 'installed'}
                  >
                    <i className="world-home__store-icon world-home__store-icon--web" aria-hidden="true">◇</i>
                    <span>
                      <small>{installState.platform === 'installed' ? 'Installed as a' : 'Add to Home Screen'}</small>
                      <strong>Web App</strong>
                    </span>
                  </button>
                </div>
                <p className="world-home__kicker">The cozy RPG powered by your real life</p>
                <p className="world-home__tagline">Turn real progress into a world that grows.</p>
                <p className="world-home__hero-copy">
                  Care for your habits, explore enchanted islands, and watch the life you are building
                  become the world you play.
                </p>
                <div className="world-home__story-promise" aria-label="HabitGame story mode preview">
                  <span className="world-home__story-promise-mark" aria-hidden="true">✦</span>
                  <div>
                    <small>DISCOVER THE GAME UNIVERSE</small>
                    <strong>Unlock the mystery. Earn rewards as you discover.</strong>
                    <p>
                      Play the adventure your way. <b>HabitGame Crew</b> is planned to unlock the
                      full story mode for players who want to go deeper.
                    </p>
                  </div>
                </div>
                <div className="world-home__theme-pills" aria-label="Included visual themes">
                  <span className="world-home__theme-pill world-home__theme-pill--light">
                    <span aria-hidden="true">☀</span> First Light
                  </span>
                  <span className="world-home__theme-pill world-home__theme-pill--dark">
                    <span aria-hidden="true">☾</span> Midnight Blue
                  </span>
                </div>
                <a className="world-home__mobile-waitlist-jump" href="#world-home-waitlist">
                  Join early access <span aria-hidden="true">↓</span>
                </a>
              </div>

            </div>

            <div className="world-home__showcase" aria-label="HabitGame gameplay preview">
              <div className="world-home__showcase-orbit" aria-hidden="true" />
              <p className="world-home__showcase-kicker">Your life becomes the game</p>
              <div className="world-home__showcase-guide">
                <img
                  className="world-home__showcase-caretaker"
                  src="/assets/island_caretakers/001/IMG_caretaker_3d_blue.webp"
                  alt="The HabitGame caretaker welcoming you to the island"
                />
                <div>
                  <small>MEET YOUR GUIDE</small>
                  <strong>Follow the light.</strong>
                </div>
                <img
                  className="world-home__showcase-compass"
                  src="/assets/island_caretakers/001/first-light-caretaker.webp"
                  alt=""
                  aria-hidden="true"
                />
              </div>
              <figure className="world-home__phone world-home__phone--today">
                <img
                  src="/landing-page-assets/showcase/today-current.png"
                  alt="Current HabitGame Today screen with habits, events, rewards, and daily activities"
                  width="390"
                  height="844"
                />
                <figcaption>
                  <small>01 · DO</small>
                  <strong>Live your day</strong>
                  <span>Your habits and events, together in Today</span>
                </figcaption>
              </figure>
              <figure className="world-home__phone world-home__phone--island">
                <img
                  src="/landing-page-assets/showcase/island-build-current.png"
                  alt="Current HabitGame Hatchery build screen with a growing construction cloud"
                  width="390"
                  height="844"
                />
                <figcaption>
                  <small>02 · BUILD</small>
                  <strong>Grow your island</strong>
                  <span>Every build brings the landmark into view</span>
                </figcaption>
              </figure>
              <figure className="world-home__phone world-home__phone--momentum">
                <img
                  src="/landing-page-assets/showcase/daily-momentum.webp"
                  alt="HabitGame Daily Momentum seven-day reward journey"
                  width="390"
                  height="844"
                />
                <figcaption>
                  <small>03 · RETURN</small>
                  <strong>Keep momentum</strong>
                  <span>A new reward waits tomorrow</span>
                </figcaption>
              </figure>
            </div>
          </section>

          <WorldGuides />

          <section
            className="world-home__guest-list"
            id="world-home-waitlist"
            aria-labelledby="world-home-waitlist-title"
            data-awaken
          >
            <div className="world-home__guest-list-copy">
              <p className="world-home__guest-list-eyebrow">
                <span aria-hidden="true">✦</span> EARLY ACCESS
              </p>
              <h2 id="world-home-waitlist-title">Your invitation to the first voyage.</h2>
              <p>
                Step onto the founding guest list for quiet behind-the-scenes updates and the
                first invitation into the full HabitGame world.
              </p>

              <div className="world-home__guest-list-promises" aria-label="Waitlist benefits">
                <span><i aria-hidden="true">✦</i> First-wave invitation</span>
                <span><i aria-hidden="true">◇</i> Founder updates</span>
                <span><i aria-hidden="true">✓</i> No noisy marketing</span>
              </div>

              {waitlistStatus === 'success' ? (
                <div className="world-home__waitlist-success world-home__guest-list-success" role="status">
                  <span aria-hidden="true">✦</span>
                  <strong>You are on the guest list.</strong>
                  <p>{waitlistMessage}</p>
                </div>
              ) : (
                <form className="world-home__waitlist-form" onSubmit={handleWaitlistSubmit}>
                  <label className="world-home__waitlist-label" htmlFor="world-home-waitlist-email">
                    Email address
                  </label>
                  <div className="world-home__waitlist-row">
                    <input
                      id="world-home-waitlist-email"
                      className="world-home__waitlist-input"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={waitlistEmail}
                      onChange={(event) => {
                        setWaitlistEmail(event.target.value);
                        if (waitlistStatus === 'error') {
                          setWaitlistStatus('idle');
                          setWaitlistMessage('');
                        }
                      }}
                      required
                      maxLength={320}
                    />
                    <button
                      className="world-home__golden-invite"
                      type="submit"
                      disabled={waitlistStatus === 'loading'}
                      aria-busy={waitlistStatus === 'loading'}
                    >
                      <span aria-hidden="true">✦</span>
                      {waitlistStatus === 'loading' ? 'Adding your name…' : 'Join the waitlist'}
                    </button>
                  </div>
                  {waitlistStatus === 'error' && (
                    <p className="world-home__waitlist-error" role="alert">{waitlistMessage}</p>
                  )}
                </form>
              )}

              <small className="world-home__guest-list-note">
                One email is enough. We never share the list, and you can leave whenever you like.
              </small>
            </div>

            <div className="world-home__guest-scroll" aria-hidden="true">
              <div className="world-home__guest-scroll-roll world-home__guest-scroll-roll--top" />
              <div className="world-home__guest-scroll-paper">
                <span className="world-home__guest-scroll-crest">H</span>
                <p>HABITGAME · FIRST VOYAGE</p>
                <strong>Founding Guests</strong>
                <i><span>01</span><b>Adventure awaits</b></i>
                <i><span>02</span><b>A new world stirs</b></i>
                <i><span>03</span><b>Your name goes here</b></i>
                <small>SEALED BY THE COMPASS</small>
              </div>
              <div className="world-home__guest-scroll-roll world-home__guest-scroll-roll--bottom" />
              <span className="world-home__guest-scroll-spark world-home__guest-scroll-spark--one">✦</span>
              <span className="world-home__guest-scroll-spark world-home__guest-scroll-spark--two">✧</span>
            </div>
          </section>

          <section className="world-home__more" aria-label="More HabitGame previews">
            <button
              className="world-home__more-toggle"
              type="button"
              aria-expanded={showMore}
              aria-controls="world-home-more-content"
              onClick={() => setShowMore((current) => !current)}
            >
              More <span aria-hidden="true">{showMore ? '−' : '+'}</span>
            </button>

            {showMore && (
              <div className="world-home__more-content" id="world-home-more-content">
                <p className="world-home__more-label">EXPLORATIONS IN PROGRESS</p>

                <AwakeningExperience />

                <section
                  className="world-home__compass-loop"
                  id="compass-game-loop"
                  aria-labelledby="world-home-compass-loop-title"
                  data-awaken
                >
                  <div className="world-home__compass-loop-heading">
                    <p>THE COMPASS BOOK · BORROWING THE GAME LOOP</p>
                    <h2 id="world-home-compass-loop-title">Let the fun power something useful.</h2>
                    <span>
                      Most game loops keep you running in circles. HabitGame redirects a small part of that
                      momentum — spark by spark, drop by drop — into a Compass Book that becomes more useful
                      while the game stays joyful.
                    </span>
                  </div>

                  <div
                    className="world-home__compass-energy"
                    aria-label="Play turns small sparks into pages that fill gradually"
                    role="img"
                  >
                    <div className="world-home__energy-wheel" aria-hidden="true">
                      <span className="world-home__energy-runner">●</span>
                      <small>PLAY</small>
                    </div>
                    <div className="world-home__energy-flow" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                      <span>⚡</span>
                    </div>
                    <div className="world-home__energy-book" aria-hidden="true">
                      <span className="world-home__energy-book-page world-home__energy-book-page--left" />
                      <span className="world-home__energy-book-page world-home__energy-book-page--right" />
                      <b>🧭</b>
                      <small>FILLS OVER TIME</small>
                    </div>
                  </div>

                  <div className="world-home__compass-loop-steps" role="list">
                    {COMPASS_GAME_LOOP.map((step) => (
                      <article className="world-home__compass-loop-step" role="listitem" key={step.number}>
                        <small>{step.number}</small>
                        <span aria-hidden="true">{step.icon}</span>
                        <h3>{step.title}</h3>
                        <p>{step.desc}</p>
                      </article>
                    ))}
                  </div>

                  <div className="world-home__compass-paths">
                    <div>
                      <small>GAME-FIRST PATH</small>
                      <strong>Starter actions, not fake habits.</strong>
                      <p>Play one round. Open the Compass Book. Claim a daily gift. Begin without life tracking.</p>
                    </div>
                    <span aria-hidden="true">OR</span>
                    <div>
                      <small>LIFE-LINKED PATH</small>
                      <strong>Add real habits when you choose.</strong>
                      <p>Connect one useful action and let progress in life give the island an extra boost.</p>
                    </div>
                  </div>

                  <div className="world-home__compass-loop-promise">
                    <span aria-hidden="true">🌿</span>
                    <p>
                      <strong>Positive and low-pressure by design.</strong>
                      No perfect streaks, no punishment loops, and no requirement to track your life.
                      Play can stand on its own; reflection and real-world actions add value only when you want them.
                    </p>
                  </div>
                </section>

                <section className="world-home__how-invite" data-awaken aria-label="Learn how HabitGame works">
                  <span className="world-home__how-invite-orb" aria-hidden="true">✦</span>
                  <div>
                    <p>CURIOUS ABOUT THE PHILOSOPHY?</p>
                    <h2>See the kinder game loop.</h2>
                  </div>
                  <button type="button" onClick={() => setShowHowItWorks(true)}>
                    How does it work? <span aria-hidden="true">→</span>
                  </button>
                </section>
              </div>
            )}
          </section>

          <footer className="world-home__footer">
            <p className="world-home__copyright">
              HabitGame &copy; {new Date().getFullYear()}
              <span className="world-home__version" aria-hidden="true"> · v1.0</span>
            </p>
            <nav className="world-home__footer-links" aria-label="Legal">
              <a href="/privacy" className="world-home__footer-link">Privacy</a>
              <a href="/terms" className="world-home__footer-link">Terms</a>
              <a href="/support" className="world-home__footer-link">Support</a>
              <a
                href="mailto:hello@habitgame.app?subject=HabitGame%20investment%20or%20partnership"
                className="world-home__footer-link world-home__footer-link--partners"
              >
                Investors &amp; partnerships
              </a>
            </nav>
          </footer>
        </div>
      </WorldHero>

      <WorldHowItWorksModal open={showHowItWorks} onClose={() => setShowHowItWorks(false)} />
      {showInstallGuide ? (
        <IOSInstallGuide
          platform={installState.platform}
          onDismiss={() => setShowInstallGuide(false)}
        />
      ) : null}
    </div>
  );
}
