import React from 'react';

interface JourneyNode {
  id: string;
  icon: string;
  label: string;
  sublabel: string;
  state: 'completed' | 'active' | 'locked';
}

const JOURNEY_NODES: JourneyNode[] = [
  { id: 'play', icon: '🧭', label: 'Play your adventure', sublabel: 'Explore your world, collect rewards, and return when life allows.', state: 'completed' },
  { id: 'reflect', icon: '💭', label: 'Reflect in small moments', sublabel: 'Answer simple prompts about habits, goals, and wellbeing as you play.', state: 'active' },
  { id: 'action', icon: '⚡', label: 'Supercharge with real action', sublabel: 'Complete habits or goals in the app to boost your progress.', state: 'locked' },
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
          A game loop that stays kind to real life
        </h2>
        <p className="journey-preview__subtitle">
          Play casually, reflect lightly, and let real-life actions add extra magic when you can.
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
        Built for soft motivation, not pressure or perfection.
      </p>
    </section>
  );
}
