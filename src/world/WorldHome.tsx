import React, { useState, useEffect } from 'react';
import './world.css';
import { useInstallState } from './useInstallState.ts';
import type { BeforeInstallPromptEvent } from './useInstallState.ts';
import { IOSInstallGuide } from './IOSInstallGuide.tsx';
import { WorldHero } from './WorldHero.tsx';
import { JourneyPreview } from './JourneyPreview.tsx';
import { SocialProof } from './SocialProof.tsx';
import { useWorldAnalytics } from './useWorldAnalytics.ts';
import { joinPublicLaunchWaitlist } from '../services/publicLaunchWaitlist.ts';

interface WorldHomeProps {
  onContinue: () => void;
  onLogin: () => void;
  beforeInstallPromptEvent?: BeforeInstallPromptEvent | null;
}

const HERO_FEATURES = [
  {
    icon: '🏰',
    title: 'Play a cozy RPG',
    desc: 'Enjoy a magical world designed to be easy to return to.',
  },
  {
    icon: '🌿',
    title: 'Gentle life nudges',
    desc: 'Small prompts keep your habits, goals, and wellbeing in view — without pressure.',
  },
  {
    icon: '✨',
    title: 'Supercharge progress',
    desc: 'Complete real-life actions to earn extra rewards, momentum, and progression.',
  },
];

export function WorldHome({
  onContinue,
  onLogin,
  beforeInstallPromptEvent = null,
}: WorldHomeProps) {
  const installState = useInstallState(beforeInstallPromptEvent);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistStatus, setWaitlistStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [waitlistMessage, setWaitlistMessage] = useState('');
  const { trackEvent } = useWorldAnalytics();

  const handleInstallClick = () => {
    trackEvent('install_click');
    if (installState.platform === 'android' && installState.promptInstall) {
      installState.promptInstall().catch((err: unknown) => {
        if (err instanceof Error && err.message) {
          console.warn('Install prompt failed:', err);
        }
      });
    } else if (installState.platform === 'ios') {
      setShowIOSGuide(true);
    }
  };

  const handleIOSDismiss = () => {
    trackEvent('install_dismiss');
    setShowIOSGuide(false);
    installState.dismiss();
  };

  const handleContinue = () => {
    trackEvent('continue_click');
    onContinue();
  };

  const handleLogin = () => {
    trackEvent('developer_login_click');
    onLogin();
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

  const showInstallButton =
    (installState.platform === 'android' || installState.platform === 'ios') &&
    !installState.isDismissed;

  // Fire install_view once per session when install module becomes eligible
  useEffect(() => {
    if (showInstallButton) {
      trackEvent('install_view');
    }
  // trackEvent is stable (useCallback), sessionStorage dedupe prevents double-firing
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInstallButton, trackEvent]);

  return (
    <div className="world-home world-home--sales-split">
      <WorldHero>
        <div className="world-home__shell">
          <section className="world-home__hero-panel" aria-labelledby="world-home-title">
            <div className="world-home__message-column">
              <div className="world-home__brand">
                <img
                  className="world-home__logo"
                  src="/icons/logo_landingpage.webp"
                  alt="HabitGame logo"
                  width="359"
                  height="490"
                  loading="eager"
                  decoding="async"
                />
                <p className="world-home__kicker">The cozy RPG powered by your real life</p>
                <h1 className="world-home__app-name" id="world-home-title">HabitGame</h1>
                <p className="world-home__tagline">Turn everyday progress into an adventure.</p>
                <p className="world-home__hero-copy">
                  Care for your habits, explore enchanted islands, and watch the life you are building
                  become the world you play.
                </p>
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

              <div className="world-home__cta-card" id="world-home-waitlist">
                <p className="world-home__cta-eyebrow">Early access</p>
                <p className="world-home__cta-heading">Begin your next chapter.</p>
                <p className="world-home__cta-copy">
                  Join the waitlist for founder updates and the first invitation into the full HabitGame world.
                </p>

                {waitlistStatus === 'success' ? (
                  <div className="world-home__waitlist-success" role="status">
                    <span aria-hidden="true">✦</span>
                    <strong>You are on the quest list.</strong>
                    <p>{waitlistMessage}</p>
                  </div>
                ) : (
                  <form
                    className="world-home__waitlist-form"
                    onSubmit={handleWaitlistSubmit}
                  >
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
                        className="world-home__btn world-home__btn--primary world-home__btn--waitlist"
                        type="submit"
                        disabled={waitlistStatus === 'loading'}
                        aria-busy={waitlistStatus === 'loading'}
                      >
                        {waitlistStatus === 'loading' ? 'Saving your place…' : 'Join the waitlist'}
                      </button>
                    </div>
                    {waitlistStatus === 'error' && (
                      <p className="world-home__waitlist-error" role="alert">{waitlistMessage}</p>
                    )}
                  </form>
                )}

                <div className="world-home__cta-group world-home__cta-group--secondary">
                  <button
                    className="world-home__btn world-home__btn--secondary"
                    onClick={handleContinue}
                    type="button"
                  >
                    Explore the free demo
                  </button>
                </div>

                {showInstallButton && (
                  <div className="world-home__install-section">
                    <button
                      className="world-home__btn world-home__btn--install"
                      onClick={handleInstallClick}
                      type="button"
                    >
                      📱 Install App
                    </button>
                  </div>
                )}

                {installState.platform === 'installed' && (
                  <p className="world-home__installed-indicator" aria-live="polite">
                    ✓ Installed
                  </p>
                )}

                <p className="world-home__cta-supporting">
                  No spam · Founder updates · Early access
                </p>
                <button
                  className="world-home__developer-login"
                  onClick={handleLogin}
                  type="button"
                >
                  Developer login <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>

            <div className="world-home__showcase" aria-label="HabitGame gameplay preview">
              <div className="world-home__showcase-orbit" aria-hidden="true" />
              <p className="world-home__showcase-kicker">Your life becomes the game</p>
              <figure className="world-home__phone world-home__phone--today">
                <img
                  src="/landing-page-assets/showcase/today.webp"
                  alt="HabitGame Today screen with habits, rewards, and daily activities"
                  width="390"
                  height="844"
                />
                <figcaption>
                  <small>01 · DO</small>
                  <strong>Live your day</strong>
                  <span>Small actions earn real momentum</span>
                </figcaption>
              </figure>
              <figure className="world-home__phone world-home__phone--island">
                <img
                  src="/landing-page-assets/showcase/island-run.webp"
                  alt="HabitGame Island 1 Hatchery building screen with levels and unlockable parts"
                  width="390"
                  height="844"
                />
                <figcaption>
                  <small>02 · BUILD</small>
                  <strong>Grow your island</strong>
                  <span>Rewards become visible world progress</span>
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
              <div className="world-home__showcase-loop" aria-hidden="true">
                <span>DO</span><i>→</i><span>EARN</span><i>→</i><span>BUILD</span><i>→</i><span>RETURN</span>
              </div>
            </div>
          </section>

          <div className="world-home__features" role="list" aria-label="App features">
            {HERO_FEATURES.map((feature) => (
              <div className="world-home__feature-card" role="listitem" key={feature.title}>
                <span className="world-home__feature-icon" aria-hidden="true">{feature.icon}</span>
                <strong className="world-home__feature-title">{feature.title}</strong>
                <p className="world-home__feature-desc">{feature.desc}</p>
              </div>
            ))}
          </div>

          <JourneyPreview />
          <section className="world-home__restart-card" aria-labelledby="world-home-restart-title">
            <p className="world-home__restart-eyebrow" aria-hidden="true">GENTLE BY DESIGN</p>
            <h2 className="world-home__restart-title" id="world-home-restart-title">
              No perfect streak required.
            </h2>
            <p className="world-home__restart-copy">
              Life has pauses, setbacks, and restarts. HabitGame is built to welcome you back,
              help you adjust what didn’t work, and continue your quest gently.
            </p>
          </section>
          <SocialProof />

          <footer className="world-home__footer">
            <p className="world-home__copyright">
              HabitGame &copy; {new Date().getFullYear()}
              <span className="world-home__version" aria-hidden="true"> · v1.0</span>
            </p>
            <nav className="world-home__footer-links" aria-label="Legal">
              <a href="/privacy" className="world-home__footer-link">Privacy</a>
              <a href="/terms" className="world-home__footer-link">Terms</a>
              <a href="/support" className="world-home__footer-link">Support</a>
            </nav>
          </footer>
        </div>
      </WorldHero>

      {showIOSGuide && <IOSInstallGuide onDismiss={handleIOSDismiss} />}
    </div>
  );
}
