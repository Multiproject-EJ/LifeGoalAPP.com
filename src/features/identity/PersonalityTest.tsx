import React from 'react';

export default function PersonalityTest() {
  return (
    <section className="identity-hub">
      <div className="identity-hub__header">
        <div>
          <h2 className="identity-hub__title">🪪 Personality Test</h2>
          <p className="identity-hub__subtitle">
            Get a quick snapshot of how you think, feel, and show up each day.
          </p>
        </div>
      </div>
      <div className="identity-hub__card">
        <h3 className="identity-hub__card-title">Start your Personality Test</h3>
        <p className="identity-hub__card-text">
          Answer a few short prompts to personalize your goals, habits, and daily focus. Your
          results will live here in your ID space.
        </p>
        <button className="identity-hub__cta" type="button">
          Start
        </button>
      </div>
    </section>
  );
}
