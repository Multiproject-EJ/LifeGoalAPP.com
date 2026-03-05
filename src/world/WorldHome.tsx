import React from 'react';
import './world.css';

interface WorldHomeProps {
  onContinue: () => void;
}

export function WorldHome({ onContinue }: WorldHomeProps) {
  return (
    <div className="world-home">
      <div className="world-home__brand">
        <div className="world-home__logo" aria-hidden="true">🎯</div>
        <h1 className="world-home__app-name">LifeGoal</h1>
        <p className="world-home__tagline">Track goals. Build habits. Level up your life.</p>
      </div>

      <div className="world-home__card">
        <h2 className="world-home__card-title">Your journey awaits</h2>
        <p className="world-home__card-subtitle">Pick up where you left off or start fresh.</p>

        <div className="world-home__cta-group">
          <button
            className="world-home__btn world-home__btn--primary"
            onClick={onContinue}
            type="button"
          >
            Continue Journey
          </button>
          <button
            className="world-home__btn world-home__btn--secondary"
            onClick={onContinue}
            type="button"
          >
            Log in
          </button>
        </div>
      </div>

      <p className="world-home__footer">LifeGoalApp &copy; {new Date().getFullYear()}</p>
    </div>
  );
}
