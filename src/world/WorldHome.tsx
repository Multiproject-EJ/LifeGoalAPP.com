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
      {/* Brand zone */}
      <div className="world-home__brand">
        <div className="world-home__logo" aria-hidden="true">🎮</div>
        <div className="world-home__level-badge" aria-hidden="true">LEVEL 1</div>
        <h1 className="world-home__app-name">HABITGAME</h1>
        <p className="world-home__tagline">Level Up Your Life</p>
      </div>

      {/* Feature showcase zone */}
      <div className="world-home__features" role="list" aria-label="App features">
        <div className="world-home__feature-card" role="listitem">
          <span className="world-home__feature-icon" aria-hidden="true">🎮</span>
          <strong className="world-home__feature-title">Your Life, Gamified</strong>
          <p className="world-home__feature-desc">Every habit earns XP. Every day builds momentum.</p>
        </div>
        <div className="world-home__feature-card" role="listitem">
          <span className="world-home__feature-icon" aria-hidden="true">⚡</span>
          <strong className="world-home__feature-title">Build Momentum</strong>
          <p className="world-home__feature-desc">Small actions compound into transformation.</p>
        </div>
        <div className="world-home__feature-card" role="listitem">
          <span className="world-home__feature-icon" aria-hidden="true">🏆</span>
          <strong className="world-home__feature-title">Earn Rewards</strong>
          <p className="world-home__feature-desc">Achievements, coins, and milestones celebrate progress.</p>
        </div>
      </div>

      {/* Journey path connector — visual bridge between cards and CTA */}
      <div className="world-home__journey-path" aria-hidden="true" />

      {/* Journey Preview — Slice 5: milestone path */}
      <JourneyPreview />

      {/* Archetype Picker — Slice 6: identity hook */}
      <ArchetypePicker />

      {/* Rewards Tease Strip — Slice 7: reward loop signal */}
      <RewardsTease />

      {/* Social Proof — Slice 9: trust signal */}
      <SocialProof />

      {/* CTA zone */}
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

        {/* Install section — always below primary CTAs, never blocks them */}
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
          Build habits • Earn rewards • Unlock your future
        </p>
      </div>

      {/* Footer */}
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
      </WorldHero>

      {/* iOS install coachmark — rendered last so it layers on top */}
      {showIOSGuide && <IOSInstallGuide onDismiss={handleIOSDismiss} />}
    </div>
  );
}
