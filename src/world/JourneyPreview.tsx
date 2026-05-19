import React from 'react';

interface JourneyNode {
  id: string;
  icon: string;
  label: string;
  sublabel: string;
  state: 'completed' | 'active' | 'locked';
}

const JOURNEY_NODES: JourneyNode[] = [
  { id: 'start',   icon: '🌱', label: 'Awaken',            sublabel: 'Choose one tiny quest',   state: 'completed' },
  { id: 'streak',  icon: '🔥', label: 'Kindle a streak',    sublabel: 'Return for 3 days',       state: 'completed' },
  { id: 'quest',   icon: '⚔️',  label: 'First quest clear',  sublabel: 'A habit becomes real',    state: 'active'    },
  { id: 'reward',  icon: '💎', label: 'Open the vault',     sublabel: 'Claim XP and treasure',   state: 'locked'    },
  { id: 'levelup', icon: '⭐', label: 'Level up',           sublabel: 'Unlock new powers',       state: 'locked'    },
  { id: 'champion',icon: '🏆', label: 'Join the guild',     sublabel: 'Share your momentum',    state: 'locked'    },
  { id: 'legend',  icon: '🌟', label: 'Become legend',      sublabel: 'Your identity evolves',   state: 'locked'    },
];

export function JourneyPreview() {
  return (
    <section
      className="journey-preview"
      aria-label="Journey progression preview"
    >
      <div className="journey-preview__header">
        <p className="journey-preview__eyebrow" aria-hidden="true">YOUR PATH</p>
        <h2 className="journey-preview__title">Your first questline is already waiting</h2>
        <p className="journey-preview__subtitle">A premium RPG path for habits, goals, and identity growth.</p>
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
        Complete one real-life action to light the next node ✦
      </p>
    </section>
  );
}
