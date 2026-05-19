import React, { useState, useEffect } from 'react';
import './world.css';
import { useInstallState } from './useInstallState.ts';
import type { BeforeInstallPromptEvent } from './useInstallState.ts';
import { IOSInstallGuide } from './IOSInstallGuide.tsx';
import { WorldHero } from './WorldHero.tsx';
import { JourneyPreview } from './JourneyPreview.tsx';
import { ArchetypePicker } from './ArchetypePicker.tsx';
import { RewardsTease } from './RewardsTease.tsx';
import { SocialProof } from './SocialProof.tsx';
import { useWorldAnalytics } from './useWorldAnalytics.ts';

interface WorldHomeProps {
  onContinue: () => void;
  onLogin: () => void;
  beforeInstallPromptEvent?: BeforeInstallPromptEvent | null;
}

const HERO_FEATURES = [
  {
    icon: '🗺️',
    title: 'Quest Board',
    desc: 'Turn goals into daily missions with streaks, XP, and gentle momentum.',
  },
  {
    icon: '⚔️',
    title: 'Character Growth',
    desc: 'Level up the real you through tiny wins, reflections, and class perks.',
  },
  {
    icon: '💎',
    title: 'Reward Loop',
    desc: 'Collect coins, achievements, and milestones that make progress visible.',
  },
];

const HERO_METRICS = [
  { label: 'Start', value: 'Lv. 1' },
  { label: 'Daily XP', value: '+25' },
  { label: 'Next reward', value: '3 wins' },
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
              <div className="world-home__logo" aria-hidden="true">🎮</div>
              <div className="world-home__level-badge" aria-hidden="true">LEVEL 1 · NEW ADVENTURE</div>
              <p className="world-home__kicker">Premium fantasy habit RPG</p>
              <h1 className="world-home__app-name" id="world-home-title">HABITGAME</h1>
              <p className="world-home__tagline">Level Up Your Life</p>
              <p className="world-home__hero-copy">
                Build habits like quests, grow your hero through everyday wins, and make self-improvement feel like stepping into a luminous RPG world.
              </p>
            </div>

            <div className="world-home__metrics" aria-label="Game preview highlights">
              {HERO_METRICS.map((metric) => (
                <div className="world-home__metric" key={metric.label}>
                  <span className="world-home__metric-value">{metric.value}</span>
                  <span className="world-home__metric-label">{metric.label}</span>
                </div>
              ))}
            </div>

            <div className="world-home__cta-zone">
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
                Free to begin · Mobile-first · No boss fight required
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

          <div className="world-home__journey-path" aria-hidden="true" />

          <JourneyPreview />
          <ArchetypePicker />
          <RewardsTease />
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
