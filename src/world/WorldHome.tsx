import React from 'react';
import './world.css';

interface WorldHomeProps {
  onContinue: () => void;
  onLogin: () => void;
  installPromptAvailable?: boolean;
  onInstallPrompt?: () => void;
}

export function WorldHome({
  onContinue,
  onLogin,
  installPromptAvailable,
  onInstallPrompt,
}: WorldHomeProps) {
  return (
    <div className="world-home">
      {/* Atmospheric background layer */}
      <div className="world-home__bg" aria-hidden="true">
        <div className="world-home__orb world-home__orb--1" />
        <div className="world-home__orb world-home__orb--2" />
        <div className="world-home__orb world-home__orb--3" />
      </div>

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
          {installPromptAvailable && onInstallPrompt && (
            <button
              className="world-home__btn world-home__btn--install"
              onClick={onInstallPrompt}
              type="button"
            >
              Add to Home Screen
            </button>
          )}
        </div>
        <p className="world-home__cta-supporting">
          Build habits • Earn rewards • Unlock your future
        </p>
      </div>

      {/* Footer */}
      <p className="world-home__footer">
        HabitGame &copy; {new Date().getFullYear()}
        <span className="world-home__version" aria-hidden="true"> · v1.0</span>
      </p>
    </div>
  );
}
