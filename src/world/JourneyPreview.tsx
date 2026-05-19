import React from 'react';

interface JourneyNode {
  id: string;
  icon: string;
  label: string;
  sublabel: string;
  state: 'completed' | 'active' | 'locked';
}

const JOURNEY_NODES: JourneyNode[] = [
  { id: 'choose', icon: '✨', label: 'Choose a quest', sublabel: 'Pick one real habit you want to grow.', state: 'completed' },
  { id: 'play',   icon: '🌱', label: 'Complete tiny wins', sublabel: 'Check in daily and watch the world brighten.', state: 'active' },
  { id: 'earn',   icon: '🏆', label: 'Earn rewards', sublabel: 'Collect XP, coins, and new milestones.', state: 'locked' },
];

export function JourneyPreview() {
  return (
    <section
      className="journey-preview"
      aria-labelledby="journey-preview-heading"
    >
      <div className="journey-preview__header">
        <p className="journey-preview__eyebrow" aria-hidden="true">HOW IT WORKS</p>
        <h2 className="journey-preview__title" id="journey-preview-heading">
          Small steps become a magical journey
        </h2>
        <p className="journey-preview__subtitle">
          HabitGame keeps progress simple, visual, and rewarding from the first tap.
        </p>
      </div>

      <ol className="journey-preview__track" aria-label="How HabitGame works">
        {JOURNEY_NODES.map((node, index) => (
          <li
            key={node.id}
            className={`journey-preview__node journey-preview__node--${node.state}`}
            aria-current={node.state === 'active' ? 'step' : undefined}
          >
            {index > 0 && (
              <div className="journey-preview__connector" aria-hidden="true" />
            )}

            <div className="journey-preview__node-inner">
              <div className="journey-preview__node-icon" aria-hidden="true">
                {node.icon}
              </div>
              <div className="journey-preview__node-content">
                <strong className="journey-preview__node-label">{node.label}</strong>
                <span className="journey-preview__node-sublabel">{node.sublabel}</span>
              </div>
              {node.state === 'active' && (
                <div className="journey-preview__node-pulse" aria-hidden="true" />
              )}
            </div>
          </li>
        ))}
      </ol>

      <p className="journey-preview__cta-hint">
        Designed for fast starts, soft motivation, and steady momentum.
      </p>
    </section>
  );
}
