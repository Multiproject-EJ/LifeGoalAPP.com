import React, { useState } from 'react';
import './world.css';
import { useInstallState } from './useInstallState.ts';
import type { BeforeInstallPromptEvent } from './useInstallState.ts';
import { IOSInstallGuide } from './IOSInstallGuide.tsx';
import { WorldHero } from './WorldHero.tsx';
import { JourneyPreview } from './JourneyPreview.tsx';

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

  const handleInstallClick = () => {
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
    setShowIOSGuide(false);
    installState.dismiss();
  };

  const showInstallButton =
    (installState.platform === 'android' || installState.platform === 'ios') &&
    !installState.isDismissed;

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

      {/* CTA zone */}
      <div className="world-home__cta-zone">
        <div className="world-home__cta-group">
          <button
            className="world-home__btn world-home__btn--primary"
            onClick={onContinue}
            type="button"
          >
            Start Your Game
          </button>
          <button
            className="world-home__btn world-home__btn--secondary"
            onClick={onLogin}
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
      <p className="world-home__footer">
        HabitGame &copy; {new Date().getFullYear()}
        <span className="world-home__version" aria-hidden="true"> · v1.0</span>
      </p>
      </WorldHero>

      {/* iOS install coachmark — rendered last so it layers on top */}
      {showIOSGuide && <IOSInstallGuide onDismiss={handleIOSDismiss} />}
    </div>
  );
}
