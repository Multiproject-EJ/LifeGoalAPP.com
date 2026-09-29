import React, { useEffect, useRef, useState } from 'react';
import './world.css';
import './landing.css';
import type { BeforeInstallPromptEvent } from './useInstallState.ts';
import { AwakeningExperience } from './AwakeningExperience.tsx';
import { WorldHowItWorksModal } from './WorldHowItWorksModal.tsx';
import { IOSInstallGuide } from './IOSInstallGuide.tsx';
import { useInstallState } from './useInstallState.ts';
import { useWorldAnalytics } from './useWorldAnalytics.ts';
import { joinPublicLaunchWaitlist } from '../services/publicLaunchWaitlist.ts';

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

// Real in-game footage: slow orbits of three islands, rendered from the
// Island Run 3D scenes (see public/landing-page-assets/islands/README.md).
const ISLAND_REELS = [
  {
    island: 2,
    name: 'Celestial Sky Kingdom',
    desc: 'Build castles above the clouds.',
    video: '/landing-page-assets/islands/island-002.mp4',
    videoWebm: '/landing-page-assets/islands/island-002.webm',
    poster: '/landing-page-assets/islands/island-002.webp',
  },
  {
    island: 7,
    name: 'Abyssal Pearl Kingdom',
    desc: 'Explore a kingdom under the sea.',
    video: '/landing-page-assets/islands/island-007.mp4',
    videoWebm: '/landing-page-assets/islands/island-007.webm',
    poster: '/landing-page-assets/islands/island-007.webp',
  },
  {
    island: 19,
    name: 'Circuit F Wonder Express',
    desc: 'Ride the rails around a theme-park island.',
    video: '/landing-page-assets/islands/island-019.mp4',
    videoWebm: '/landing-page-assets/islands/island-019.webm',
    poster: '/landing-page-assets/islands/island-019.webp',
  },
] as const;

const PROMISES = [
  {
    src: '/assets/island_caretakers/001/IMG_caretaker_3d_blue.webp',
    contain: true,
    title: 'No guilt for missed days',
    desc: 'Miss a day and your caretaker simply welcomes you back. No punishment, no starting over.',
  },
  {
    src: '/assets/island_caretakers/001/first-light-caretaker.webp',
    contain: true,
    title: 'Always a next step',
    desc: 'The compass light shows you one clear thing to do next, so you never have to plan your day inside a game.',
  },
  {
    src: '/landing-page-assets/characters/builder-robot-family-preview-v1.jpg',
    contain: false,
    title: 'Progress you can see',
    desc: 'The builder robots turn your effort into landmarks, so a good week looks like one.',
  },
] as const;

const PUBLIC_GAME_LOGIN_ENABLED = import.meta.env.VITE_PUBLIC_GAME_LOGIN_ENABLED === 'true';

export function WorldHome({ beforeInstallPromptEvent, onLogin }: WorldHomeProps) {
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistStatus, setWaitlistStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [waitlistMessage, setWaitlistMessage] = useState('');
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const loopRef = useRef<HTMLOListElement>(null);
  const reelSectionRef = useRef<HTMLElement>(null);
  const reelVideoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const [reelsInView, setReelsInView] = useState(false);
  const finalRef = useRef<HTMLElement>(null);
  const installState = useInstallState(beforeInstallPromptEvent ?? null);

  // Show the sticky waitlist bar once the hero form has scrolled away, and
  // hide it again when the closing waitlist form is on screen.
  useEffect(() => {
    const heroForm = document.getElementById('world-home-waitlist');
    const finalSection = finalRef.current;
    if (!heroForm || !finalSection || typeof IntersectionObserver === 'undefined') return undefined;

    let pastHero = false;
    let atFinal = false;
    const sync = () => setShowStickyCta(pastHero && !atFinal);
    const heroObserver = new IntersectionObserver(([entry]) => {
      pastHero = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      sync();
    });
    const finalObserver = new IntersectionObserver(([entry]) => {
      atFinal = entry.isIntersecting || entry.boundingClientRect.top < 0;
      sync();
    });
    heroObserver.observe(heroForm);
    finalObserver.observe(finalSection);
    return () => {
      heroObserver.disconnect();
      finalObserver.disconnect();
    };
  }, [waitlistStatus]);

  useEffect(() => {
    const section = reelSectionRef.current;
    if (!section || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => setReelsInView(entry.isIntersecting), {
      threshold: 0.35,
    });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // Play only the island reel in view: the centred card on phones, all three
  // side by side on desktop. Reduced-motion users keep the still poster.
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const showsAllReels = typeof window !== 'undefined' && window.matchMedia?.('(min-width: 900px)').matches;
    reelVideoRefs.current.forEach((video, index) => {
      if (!video) return;
      const shouldPlay = reelsInView && !prefersReducedMotion && (showsAllReels || index === activeStep);
      if (shouldPlay) {
        if (video.preload === 'none') video.preload = 'auto';
        void video.play().catch(() => undefined);
      } else if (!video.paused) {
        video.pause();
      }
    });
  }, [activeStep, reelsInView]);

  const handleLoopScroll = () => {
    const loop = loopRef.current;
    if (!loop || loop.children.length === 0) return;
    const stepWidth = (loop.children[0] as HTMLElement).offsetWidth;
    if (!stepWidth) return;
    const index = Math.round(loop.scrollLeft / stepWidth);
    setActiveStep(Math.max(0, Math.min(ISLAND_REELS.length - 1, index)));
  };

  const handleStickyCta = () => {
    trackEvent('waitlist_sticky_click');
    const heroForm = document.getElementById('world-home-waitlist');
    heroForm?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => {
      document.getElementById('world-home-waitlist-email-hero')?.focus({ preventScroll: true });
    }, 450);
  };
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

  const handlePublicGameLogin = () => {
    trackEvent('login_click');

    if (PUBLIC_GAME_LOGIN_ENABLED) {
      onLogin();
      return;
    }

    document.getElementById('world-home-waitlist')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  const handleDeveloperLogin = () => {
    trackEvent('developer_login_click');
    onLogin();
  };

  const renderWaitlist = (idSuffix: 'hero' | 'final', buttonLabel: string) =>
    waitlistStatus === 'success' ? (
      <div className="lp-waitlist-success" role="status">
        <span aria-hidden="true">✦</span>
        <strong>You're on the guest list.</strong>
        <p>{waitlistMessage}</p>
      </div>
    ) : (
      <form
        className="lp-form"
        id={idSuffix === 'hero' ? 'world-home-waitlist' : undefined}
        onSubmit={handleWaitlistSubmit}
      >
        <label className="lp-visually-hidden" htmlFor={`world-home-waitlist-email-${idSuffix}`}>
          Email address
        </label>
        <input
          id={`world-home-waitlist-email-${idSuffix}`}
          className="lp-input"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Your email"
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
          className="lp-btn-gold"
          type="submit"
          disabled={waitlistStatus === 'loading'}
          aria-busy={waitlistStatus === 'loading'}
        >
          {waitlistStatus === 'loading' ? 'Adding your name…' : buttonLabel}
        </button>
        {waitlistStatus === 'error' && (
          <p className="lp-form-error" role="alert">{waitlistMessage}</p>
        )}
      </form>
    );

  return (
    <div className="world-home lp">
      <header className="lp-hero">
        <div className="lp-topbar">
          <a className="lp-brand" href="/" aria-label="HabitGame home">
            <img src="/assets/brand/habitgame-compass-crest-rankless.webp" alt="" width="30" height="30" />
            <span>HabitGame</span>
          </a>
          {PUBLIC_GAME_LOGIN_ENABLED ? (
            <button className="lp-signin" type="button" onClick={handlePublicGameLogin}>
              Sign in
            </button>
          ) : null}
        </div>

        <div className="lp-hero-inner">
          <div className="lp-hero-art" aria-hidden="true">
            <img
              className="lp-hero-compass"
              src="/assets/island_caretakers/001/first-light-caretaker.webp"
              alt=""
              decoding="async"
            />
            <img
              className="lp-hero-caretaker"
              src="/assets/island_caretakers/001/IMG_caretaker_3d_blue.webp"
              alt=""
              fetchPriority="high"
              decoding="async"
            />
          </div>

          <div className="lp-hero-copy">
            <p className="lp-eyebrow"><span aria-hidden="true">✦</span> Early access is open</p>
            <h1 className="lp-h1">
              The cozy RPG powered by <em>your real life.</em>
            </h1>
            <p className="lp-lede">
              Do your real habits. Earn rewards. Watch a magical island grow a little every day, and pick
              up where you left off if you miss one.
            </p>
            {renderWaitlist('hero', "Join the waitlist — it's free")}
            <p className="lp-fineprint">One launch email. No spam. Leave anytime.</p>
            <div className="lp-platforms">
              <span>Coming to <b>iPhone</b>, <b>Android</b> and the <b>web</b></span>
              <button
                className="lp-install"
                type="button"
                onClick={handleWebAppInstall}
                disabled={installState.platform === 'installed'}
              >
                {installState.platform === 'installed' ? 'Web app installed' : 'Install web app'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="lp-main">
        <section className="lp-section" ref={reelSectionRef} aria-labelledby="lp-how-title">
          <p className="lp-kicker">Your voyage</p>
          <h2 className="lp-h2" id="lp-how-title">Every habit builds a new world.</h2>
          <p className="lp-sub">Finish real-life habits, earn rewards, and build your way across the islands.</p>
          <ol className="lp-loop" ref={loopRef} onScroll={handleLoopScroll}>
            {ISLAND_REELS.map((reel, index) => (
              <li className="lp-step" key={reel.island}>
                <div className="lp-phone">
                  <video
                    ref={(element) => { reelVideoRefs.current[index] = element; }}
                    poster={reel.poster}
                    width="390"
                    height="700"
                    muted
                    loop
                    playsInline
                    preload="none"
                    aria-label={`Island ${reel.island}, ${reel.name}: in-game footage`}
                  >
                    <source src={reel.video} type="video/mp4" />
                    <source src={reel.videoWebm} type="video/webm" />
                  </video>
                </div>
                <div className="lp-step-label">
                  <span className="lp-step-num lp-step-num--island" aria-hidden="true">{reel.island}</span>
                  <div>
                    <strong>Island {reel.island} · {reel.name}</strong>
                    <span>{reel.desc}</span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <div className="lp-dots" aria-hidden="true">
            {ISLAND_REELS.map((reel, index) => (
              <i key={reel.island} className={index === activeStep ? 'is-active' : undefined} />
            ))}
          </div>
        </section>

        <section className="lp-section" aria-labelledby="lp-why-title">
          <p className="lp-kicker">Why it feels different</p>
          <h2 className="lp-h2" id="lp-why-title">A habit app that's kind to you.</h2>
          <div className="lp-promises">
            {PROMISES.map((promise) => (
              <article className="lp-promise" key={promise.title}>
                <div className={`lp-promise-art${promise.contain ? ' lp-promise-art--contain' : ''}`}>
                  <img src={promise.src} alt="" loading="lazy" decoding="async" />
                </div>
                <div>
                  <h3>{promise.title}</h3>
                  <p>{promise.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-final" ref={finalRef} aria-labelledby="lp-final-title">
          <img
            className="lp-final-crest"
            src="/assets/brand/habitgame-shield-compass.webp"
            alt=""
            width="64"
            height="64"
            loading="lazy"
            decoding="async"
          />
          <h2 className="lp-final-title" id="lp-final-title">Join the first voyage</h2>
          <p className="lp-sub">Founding guests get in first.</p>
          <ul className="lp-perks" aria-label="Waitlist benefits">
            <li><span aria-hidden="true">✦</span> First-wave invite</li>
            <li><span aria-hidden="true">◇</span> Founder updates</li>
            <li><span aria-hidden="true">✓</span> No spam</li>
          </ul>
          {renderWaitlist('final', 'Save my spot')}
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

                <section
                  className="world-home__field-notes"
                  id="world-home-field-notes"
                  aria-labelledby="world-home-field-notes-title"
                >
                  <header className="world-home__field-notes-heading">
                    <div>
                      <p><span aria-hidden="true">✦</span> FROM THE WORLD · FIELD NOTES</p>
                      <h2 id="world-home-field-notes-title">Stories, guides and signals from the islands.</h2>
                    </div>
                    <span className="world-home__field-notes-status">
                      Guides · world notes · art development · coming soon
                    </span>
                  </header>

                  <div className="world-home__field-notes-grid">
                    <article className="world-home__field-note world-home__field-note--featured">
                      <div className="world-home__field-note-art">
                        <img
                          src="/landing-page-assets/showcase/island-run.webp"
                          alt="HabitGame Island Run board floating among clouds"
                          loading="lazy"
                          decoding="async"
                        />
                        <span>FIRST VOYAGE</span>
                      </div>
                      <div className="world-home__field-note-copy">
                        <p>BEGINNER'S GUIDE · 6 MIN</p>
                        <h3>Your first voyage: how Island Run begins.</h3>
                        <span>
                          Follow the compass, spend your first dice and discover how small choices bring
                          a quiet island to life.
                        </span>
                        <strong>Guide arriving before launch <i aria-hidden="true">→</i></strong>
                      </div>
                    </article>

                    <div className="world-home__field-note-stack">
                      <article className="world-home__field-note world-home__field-note--compact">
                        <img
                          src="/landing-page-assets/characters/builder-robot-family-preview-v1.jpg"
                          alt="HabitGame builder robots gathered together"
                          loading="lazy"
                          decoding="async"
                        />
                        <div>
                          <p>ART &amp; WORLD NOTES · 4 MIN</p>
                          <h3>Meet the builders behind the compass.</h3>
                          <span>Characters, clues and the hands quietly shaping your island.</span>
                        </div>
                      </article>

                      <article className="world-home__field-note world-home__field-note--compact">
                        <img
                          src="/landing-page-assets/showcase/daily-momentum.webp"
                          alt="HabitGame Daily Momentum reward journey"
                          loading="lazy"
                          decoding="async"
                        />
                        <div>
                          <p>DESIGN NOTE · 3 MIN</p>
                          <h3>Why tomorrow should feel inviting.</h3>
                          <span>A gentler look at rewards, returns and beginning again.</span>
                        </div>
                      </article>
                    </div>
                  </div>
                </section>

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

      </main>

      <footer className="lp-footer">
        <nav className="lp-footer-links" aria-label="Legal">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/support">Support</a>
          <a href="mailto:hello@habitgame.app?subject=HabitGame%20investment%20or%20partnership">
            Investors &amp; partnerships
          </a>
        </nav>
        <p className="lp-copyright">HabitGame &copy; {new Date().getFullYear()}</p>
        <button className="lp-dev-login" type="button" onClick={handleDeveloperLogin}>
          Developer login
        </button>
      </footer>

      {waitlistStatus !== 'success' ? (
        <div className={`lp-sticky${showStickyCta ? ' is-visible' : ''}`} aria-hidden={!showStickyCta}>
          <p><b>Launching soon</b>Get your first-wave invite</p>
          <button
            className="lp-btn-gold"
            type="button"
            tabIndex={showStickyCta ? 0 : -1}
            onClick={handleStickyCta}
          >
            Join free
          </button>
        </div>
      ) : null}

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
