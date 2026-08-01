import React, { useEffect, useRef, useState } from 'react';

const REEL_POSTER = '/landing-page-assets/video/habitgame-awakening-poster.jpg';

const GAMEPLAY_MOMENTS = [
  {
    number: '01',
    eyebrow: 'ARRIVE',
    title: 'Watch the island wake',
    copy: 'Your first voyage turns a quiet board into a place that is ready to grow.',
    icon: '✦',
    video: '/landing-page-assets/video/island-awakening.mp4',
    poster: REEL_POSTER,
  },
  {
    number: '02',
    eyebrow: 'ROLL',
    title: 'Move the world forward',
    copy: 'Spend dice, follow the route, and let every landing reveal the next useful choice.',
    icon: '🎲',
    video: '/landing-page-assets/video/island-roll.mp4',
    poster: REEL_POSTER,
  },
  {
    number: '03',
    eyebrow: 'BUILD',
    title: 'Make progress visible',
    copy: 'Fund the Hatchery piece by piece and watch effort become part of your island.',
    icon: '🏰',
    video: '/landing-page-assets/video/hatchery-build.mp4',
    poster: '/landing-page-assets/showcase/island-build-current.png',
  },
] as const;

const WHEEL_REWARDS = [
  '25 demo dice',
  '40 demo dice',
  'A starlight badge',
  '60 demo dice',
  'A captain glow',
  '75 demo dice',
  'A lucky compass',
  '100 demo dice',
] as const;

const DICE_PACKS = [
  {
    name: 'Trail Pouch',
    amount: 'A small dice top-up',
    note: 'For one more gentle run',
    icon: '🎒',
    featured: false,
  },
  {
    name: 'Island Cache',
    amount: 'A medium dice reserve',
    note: 'For builders and explorers',
    icon: '🧰',
    featured: true,
  },
  {
    name: "Captain's Chest",
    amount: 'A larger dice reserve',
    note: 'For longer island sessions',
    icon: '⚓',
    featured: false,
  },
] as const;

function useLandingAwakening() {
  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>('.world-home [data-awaken]'),
    );
    if (sections.length === 0) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const setSectionPlayback = (section: HTMLElement, shouldPlay: boolean) => {
      section.querySelectorAll<HTMLVideoElement>('video[data-scroll-video]').forEach((video) => {
        if (prefersReducedMotion || !shouldPlay) {
          video.pause();
          return;
        }

        video.play().catch(() => {
          // Autoplay can be blocked by a browser preference. The poster remains a complete fallback.
        });
      });
    };

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      sections.forEach((section) => section.classList.add('is-awake'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const section = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            section.classList.add('is-awake');
            setSectionPlayback(section, true);
          } else {
            setSectionPlayback(section, false);
          }
        });
      },
      { rootMargin: '-10% 0px -12%', threshold: 0.18 },
    );

    sections.forEach((section) => observer.observe(section));

    return () => {
      observer.disconnect();
      sections.forEach((section) => setSectionPlayback(section, false));
    };
  }, []);
}

function LivingGameplay() {
  return (
    <section
      className="world-home__living-gameplay"
      aria-labelledby="world-home-living-gameplay-title"
      data-awaken
    >
      <div className="world-home__living-heading">
        <p>SCROLL TO BRING IT TO LIFE</p>
        <h2 id="world-home-living-gameplay-title">Every chapter wakes when you reach it.</h2>
        <span>Real captured gameplay plays only while this part of the story is on screen.</span>
      </div>

      <div className="world-home__living-grid">
        {GAMEPLAY_MOMENTS.map((moment) => (
          <article className="world-home__living-card" key={moment.number}>
            <div className="world-home__living-media">
              <video
                data-scroll-video
                src={moment.video}
                poster={moment.poster}
                muted
                playsInline
                loop
                preload="metadata"
                aria-label={`${moment.title} gameplay clip`}
              />
              <span className="world-home__living-icon" aria-hidden="true">{moment.icon}</span>
              <small>{moment.number}</small>
            </div>
            <div className="world-home__living-copy">
              <p>{moment.eyebrow}</p>
              <h3>{moment.title}</h3>
              <span>{moment.copy}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ShopPreview() {
  const timeoutRef = useRef<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [reward, setReward] = useState<string | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
  }, []);

  const spinWheel = () => {
    if (isSpinning) return;

    const rewardIndex = Math.floor(Math.random() * WHEEL_REWARDS.length);
    const rewardAngle = rewardIndex * (360 / WHEEL_REWARDS.length);
    setReward(null);
    setIsSpinning(true);
    setRotation((current) => current + 1440 + (360 - rewardAngle));

    timeoutRef.current = window.setTimeout(() => {
      setReward(WHEEL_REWARDS[rewardIndex]);
      setIsSpinning(false);
    }, 3200);
  };

  return (
    <section
      id="world-home-market"
      className="world-home__shop-preview"
      aria-label="HabitGame supply dock preview"
      data-awaken
    >
      <div className="world-home__shop-current">
        <figure className="world-home__shop-current-phone">
          <img
            src="/landing-page-assets/showcase/supply-dock-current.png"
            alt="Current Luma Supply Dock showing earned dice supplies and clearly separated optional extras"
            width="390"
            height="844"
            loading="lazy"
            decoding="async"
          />
        </figure>
        <div id="world-home-market-details" className="world-home__shop-current-copy">
          <p>INSIDE THE APP</p>
          <ul>
            <li>
              <span aria-hidden="true">🎁</span>
              <span><strong>Free gifts</strong> give you a reason to return.</span>
            </li>
            <li>
              <span aria-hidden="true">🧭</span>
              <span><strong>Earned supplies</strong> use your Island Run currency.</span>
            </li>
            <li>
              <span aria-hidden="true">✨</span>
              <span><strong>Optional extras</strong> remain optional and show the price first.</span>
            </li>
          </ul>
          <a href="#world-home-waitlist">
            Join the launch waitlist <span aria-hidden="true">→</span>
          </a>
          <small>Market preview · no purchase starts from this page</small>
        </div>
      </div>

      <div className="world-home__shop-layout">
        <div className="world-home__wheel-card">
          <div className="world-home__wheel-wrap" aria-hidden="true">
            <span className="world-home__wheel-pointer">▼</span>
            <div
              className={`world-home__wheel${isSpinning ? ' is-spinning' : ''}`}
              style={{ '--wheel-rotation': `${rotation}deg` } as React.CSSProperties}
            >
              <span className="world-home__wheel-label world-home__wheel-label--one">25</span>
              <span className="world-home__wheel-label world-home__wheel-label--two">✦</span>
              <span className="world-home__wheel-label world-home__wheel-label--three">60</span>
              <span className="world-home__wheel-label world-home__wheel-label--four">100</span>
              <i>🎲</i>
            </div>
          </div>

          <div className="world-home__wheel-copy">
            <p>One cheerful spin. Nothing to stake.</p>
            <h3>{reward ? `You found ${reward}!` : 'What will the compass choose?'}</h3>
            <button type="button" onClick={spinWheel} disabled={isSpinning}>
              {isSpinning ? 'The wheel is turning…' : 'Spin the preview wheel · Free'}
            </button>
            <small>Landing-page demo only · no account credit · no cash value</small>
          </div>
        </div>

        <div className="world-home__dice-shop" aria-label="Planned dice pack previews">
          <div className="world-home__dice-shop-heading">
            <span aria-hidden="true">🎲</span>
            <div>
              <p>OPTIONAL DICE PACKS</p>
              <h3>Keep rolling when you choose.</h3>
            </div>
          </div>

          <div className="world-home__dice-pack-grid">
            {DICE_PACKS.map((pack) => (
              <article
                className={`world-home__dice-pack${pack.featured ? ' is-featured' : ''}`}
                key={pack.name}
              >
                {pack.featured && <small>POPULAR PREVIEW</small>}
                <span aria-hidden="true">{pack.icon}</span>
                <h4>{pack.name}</h4>
                <strong>{pack.amount}</strong>
                <p>{pack.note}</p>
                <em>Planned in-app purchase</em>
              </article>
            ))}
          </div>

          <p className="world-home__shop-guardrail">
            Exact pack contents and local prices will be shown by Apple or Google before any purchase.
            Free dice remain earnable through play.
          </p>
        </div>
      </div>
    </section>
  );
}

export function AwakeningExperience() {
  useLandingAwakening();

  return (
    <>
      <LivingGameplay />
      <ShopPreview />
    </>
  );
}
