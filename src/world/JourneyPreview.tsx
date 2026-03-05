import React from 'react';

interface JourneyNode {
  id: string;
  icon: string;
  label: string;
  sublabel: string;
  state: 'completed' | 'active' | 'locked';
}

const JOURNEY_NODES: JourneyNode[] = [
  { id: 'start',   icon: '🌱', label: 'Level 1: Start',     sublabel: 'Your quest begins',     state: 'completed' },
  { id: 'streak',  icon: '🔥', label: 'Streak ×3',          sublabel: '3 days in a row',        state: 'completed' },
  { id: 'quest',   icon: '⚔️',  label: 'Quest Complete',     sublabel: 'First habit mastered',   state: 'active'    },
  { id: 'reward',  icon: '💎', label: 'Reward Unlocked',    sublabel: 'XP milestone reached',   state: 'locked'    },
  { id: 'levelup', icon: '⭐', label: 'Level Up',           sublabel: 'New powers await',       state: 'locked'    },
  { id: 'champion',icon: '🏆', label: 'Champion',           sublabel: 'Top 10% of players',    state: 'locked'    },
  { id: 'legend',  icon: '🌟', label: 'Legend',             sublabel: 'Your legacy lives on',   state: 'locked'    },
];

export function JourneyPreview() {
  return (
    <section
      className="journey-preview"
      aria-label="Journey progression preview"
    >
      <div className="journey-preview__header">
        <p className="journey-preview__eyebrow" aria-hidden="true">YOUR PATH</p>
        <h2 className="journey-preview__title">Every day moves you forward</h2>
        <p className="journey-preview__subtitle">See where your journey takes you</p>
      </div>

      <ol className="journey-preview__track" aria-label="Milestone progression">
        {JOURNEY_NODES.map((node, index) => (
          <li
            key={node.id}
            className={`journey-preview__node journey-preview__node--${node.state}`}
            aria-current={node.state === 'active' ? 'step' : undefined}
          >
            {/* Connector line above (skip for first node) */}
            {index > 0 && (
              <div className="journey-preview__connector" aria-hidden="true" />
            )}

            <div className="journey-preview__node-inner">
              <div className="journey-preview__node-icon" aria-hidden="true">
                {node.state === 'locked' ? '🔒' : node.icon}
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
        Start your first habit to unlock the path ✦
      </p>
    </section>
  );
}
