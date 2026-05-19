import React from 'react';

export function SocialProof() {
  return (
    <section
      className="social-proof social-proof--mission"
      aria-labelledby="social-proof-heading"
    >
      <div className="social-proof__header">
        <p className="social-proof__eyebrow" aria-hidden="true">FOUNDER MISSION</p>
        <h2 className="social-proof__title" id="social-proof-heading">
          A different kind of game loop.
        </h2>
        <p className="social-proof__subtitle">
          One designed to pull you back toward your life, not away from it.
        </p>
      </div>

      <div className="social-proof__mission-card">
        <span className="social-proof__mission-orb" aria-hidden="true">✦</span>
        <p className="social-proof__mission-copy">
          HabitGame is for cozy progress: play when it feels good, pause when life needs
          attention, and come back to gentle prompts that help your next small step feel possible.
        </p>
      </div>
    </section>
  );
}
