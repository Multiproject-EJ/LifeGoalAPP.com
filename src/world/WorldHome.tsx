import React, { useState, useEffect } from 'react';
import './world.css';
import { useInstallState } from './useInstallState.ts';
import type { BeforeInstallPromptEvent } from './useInstallState.ts';
import { IOSInstallGuide } from './IOSInstallGuide.tsx';
import { WorldHero } from './WorldHero.tsx';
import { JourneyPreview } from './JourneyPreview.tsx';
import { SocialProof } from './SocialProof.tsx';
import { useWorldAnalytics } from './useWorldAnalytics.ts';

interface WorldHomeProps {
  onContinue: () => void;
  onLogin: () => void;
  beforeInstallPromptEvent?: BeforeInstallPromptEvent | null;
}

const HERO_FEATURES = [
  {
    icon: '🌱',
    title: 'Build Real Habits',
    desc: 'Turn tiny daily actions into streaks, confidence, and visible momentum.',
  },
  {
    icon: '🏆',
    title: 'Earn RPG Rewards',
    desc: 'Collect XP, coins, achievements, and milestones as your real life levels up.',
  },
  {
    icon: '🏝️',
    title: 'Explore Your World',
    desc: 'Follow a bright fantasy map where every habit opens the next step forward.',
  },
];

export function WorldHome({
  onContinue,
  onLogin,
  beforeInstallPromptEvent = null,
}: WorldHomeProps) {
  const installState = useInstallState(beforeInstallPromptEvent);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
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
    trackEvent('login_click');
    onLogin();
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
    <div className="world-home">
      <WorldHero>
        <div className="world-home__shell">
          <section className="world-home__hero-panel" aria-labelledby="world-home-title">
            <div className="world-home__brand">
              <div className="world-home__logo" role="img" aria-label="HabitGame logo">HG</div>
              <p className="world-home__kicker">A magical habit adventure</p>
              <h1 className="world-home__app-name" id="world-home-title">HabitGame</h1>
              <p className="world-home__tagline">Level Up Your Life</p>
              <p className="world-home__hero-copy">
                Build better days in a bright fantasy world of floating islands, gentle quests, and rewarding progress.
              </p>
            </div>

            <div className="world-home__island-stage" aria-hidden="true">
              <div className="world-home__sun" />
              <div className="world-home__cloud world-home__cloud--left" />
              <div className="world-home__cloud world-home__cloud--right" />
              <div className="world-home__floating-island world-home__floating-island--back" />
              <div className="world-home__floating-island world-home__floating-island--main">
                <div className="world-home__castle" />
                <div className="world-home__tree world-home__tree--one" />
                <div className="world-home__tree world-home__tree--two" />
              </div>
            </div>

            <div className="world-home__cta-card">
              <p className="world-home__cta-heading">Begin your first quest today</p>
              <div className="world-home__cta-group">
                <button
                  className="world-home__btn world-home__btn--primary"
                  onClick={handleContinue}
                  type="button"
                >
                  Start Your Game
                </button>
                <button
                  className="world-home__btn world-home__btn--secondary"
                  onClick={handleLogin}
                  type="button"
                >
                  Log in
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
                Free to begin · Mobile-first · Easy to start
              </p>
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
