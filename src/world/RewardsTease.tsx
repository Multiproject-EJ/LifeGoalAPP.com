import React from 'react';

interface RewardItem {
  id: string;
  icon: string;
  label: string;
  tagline: string;
}

const REWARDS: RewardItem[] = [
  { id: 'xp',           icon: '⚡', label: 'XP Orbs',       tagline: 'Power every win'     },
  { id: 'trait-packs',  icon: '🎴', label: 'Trait Packs',   tagline: 'Reveal strengths'    },
  { id: 'zen-seeds',    icon: '🌱', label: 'Zen Seeds',     tagline: 'Grow calm rituals'   },
  { id: 'achievements', icon: '🏆', label: 'Relics',        tagline: 'Mark milestones'     },
  { id: 'coins',        icon: '🪙', label: 'Gold',          tagline: 'Build your treasury' },
];

export function RewardsTease() {
  return (
    <section
      className="rewards-tease"
      aria-labelledby="rewards-tease-heading"
    >
      <div className="rewards-tease__header">
        <p className="rewards-tease__eyebrow" aria-hidden="true">REWARDS</p>
        <h2 className="rewards-tease__title" id="rewards-tease-heading">
          Treasure for real progress
        </h2>
      </div>

      <ul className="rewards-tease__list" aria-label="Reward types">
        {REWARDS.map((reward) => (
          <li key={reward.id} className="rewards-tease__item">
            <span className="rewards-tease__icon" aria-hidden="true">
              {reward.icon}
            </span>
            <strong className="rewards-tease__label">{reward.label}</strong>
            <span className="rewards-tease__tagline">{reward.tagline}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
