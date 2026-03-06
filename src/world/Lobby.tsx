import React from 'react';
import './world.css';

interface LobbyProps {
  /** Called when the user taps "Enter Game". */
  onEnterApp: () => void;
  /** Display name for the logged-in user; falls back to "Adventurer". */
  username?: string | null;
}

/**
 * Lobby — lightweight post-login bridge page.
 *
 * Provides a thematic transition from `/login` to `/app` by showing a
 * minimal profile summary (avatar, username, level, streak) and a single
 * "Enter Game" CTA.  No heavy data fetching; all placeholder values are
 * static until real profile data is wired in.
 */
export function Lobby({ onEnterApp, username }: LobbyProps) {
  const displayName = username ?? 'Adventurer';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="lobby" role="main">
      {/* Atmospheric background layers (reuse WorldHero palette) */}
      <div className="lobby__bg" aria-hidden="true" />
      <div className="lobby__atmosphere" aria-hidden="true" />

      <div className="lobby__panel">
        {/* Avatar */}
        <div className="lobby__avatar" aria-hidden="true">
          {initial}
        </div>

        {/* Welcome heading */}
        <h1 className="lobby__welcome">Welcome back, {displayName}</h1>

        {/* Profile stats */}
        <p className="lobby__stats" aria-label="Level 1, 0 day streak">
          Level 1&nbsp;·&nbsp;0 day streak
        </p>

        {/* Active quest placeholder */}
        <div className="lobby__quest-card" aria-label="Active quest">
          <span className="lobby__quest-icon" aria-hidden="true">⚔️</span>
          <span className="lobby__quest-label">Begin your journey</span>
        </div>

        {/* Primary CTA */}
        <button
          type="button"
          className="lobby__enter-btn"
          onClick={onEnterApp}
          autoFocus
        >
          Enter Game&nbsp;→
        </button>

        {/* Footer */}
        <p className="lobby__footer" aria-hidden="true">HabitGame © 2026</p>
      </div>
    </div>
  );
}
