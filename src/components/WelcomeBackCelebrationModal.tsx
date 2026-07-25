import { useEffect, useState } from 'react';
import { CelebrationFireworks } from './CelebrationFireworks';
import { GiftBoxOpeningAnimation, type GiftBoxRewardItem } from './GiftBoxOpeningAnimation';
import { getEggStageArtSrc } from '../features/gamification/level-worlds/services/eggService';
import type { ComebackCelebration, ComebackEggTier } from '../services/comebackCelebration';
import './WelcomeBackCelebrationModal.css';

/**
 * Closing is the only exit. A button into the island run would clear this
 * celebration and un-gate the modals queued behind it — daily treats,
 * tip-of-day, the task rollover — leaving them to fire underneath the game
 * overlay. The eggs keep until the user goes there on their own.
 */
export interface WelcomeBackCelebrationModalProps {
  celebration: ComebackCelebration;
  onClose: () => void;
}

const EGG_TIER_LABELS: Record<ComebackEggTier, string> = {
  common: 'Common egg',
  rare: 'Rare egg',
  mythic: 'Mythic egg',
};

/** Gift box first, then the reward summary once the lid animation lands. */
type Phase = 'opening' | 'summary';

function describeAbsence(daysAway: number): string {
  if (daysAway < 7) return `${daysAway} days`;
  const weeks = Math.floor(daysAway / 7);
  if (weeks < 5) return weeks === 1 ? 'a week' : `${weeks} weeks`;
  const months = Math.floor(daysAway / 30);
  return months <= 1 ? 'a month' : `${months} months`;
}

export function WelcomeBackCelebrationModal({ celebration, onClose }: WelcomeBackCelebrationModalProps) {
  const [phase, setPhase] = useState<Phase>('opening');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const { dice, gameTokens } = celebration.reward;
  const absence = describeAbsence(celebration.daysAway);
  const { hatchedEggs } = celebration;
  const eggCount = hatchedEggs.length;

  const giftRewards: GiftBoxRewardItem[] = [
    { id: 'dice', icon: '🎲', amount: `${dice}`, accessibleLabel: `${dice} Dice` },
    { id: 'game-tokens', icon: '🎟️', amount: `${gameTokens}`, accessibleLabel: `${gameTokens} Event game tokens` },
  ];

  return (
    <div
      className="welcome-back-celebration"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-back-celebration-title"
    >
      <CelebrationFireworks variant="hero" backdrop="hero" placement="viewport" />

      <div className="welcome-back-celebration__shell">
        <p className="welcome-back-celebration__eyebrow">Away for {absence}</p>
        <h2 id="welcome-back-celebration-title" className="welcome-back-celebration__title">
          Nice to see you back!
        </h2>
        <p className="welcome-back-celebration__subtitle">
          Here's what's been added to your account since your last visit.
        </p>

        {phase === 'opening' ? (
          <div className="welcome-back-celebration__gift">
            <GiftBoxOpeningAnimation rewards={giftRewards} onComplete={() => setPhase('summary')} />
          </div>
        ) : (
          <>
            <ul className="welcome-back-celebration__rewards">
              <li className="welcome-back-celebration__reward">
                <span className="welcome-back-celebration__reward-icon" aria-hidden="true">🎲</span>
                <strong className="welcome-back-celebration__reward-amount">{dice}</strong>
                <span className="welcome-back-celebration__reward-label">Dice</span>
              </li>
              <li className="welcome-back-celebration__reward">
                <span className="welcome-back-celebration__reward-icon" aria-hidden="true">🎟️</span>
                <strong className="welcome-back-celebration__reward-amount">{gameTokens}</strong>
                <span className="welcome-back-celebration__reward-label">
                  Event game token{gameTokens === 1 ? '' : 's'}
                </span>
              </li>
            </ul>
            {eggCount > 0 ? (
              <section className="welcome-back-celebration__eggs" aria-labelledby="welcome-back-eggs-title">
                <h3 id="welcome-back-eggs-title" className="welcome-back-celebration__eggs-title">
                  {eggCount === 1 ? 'An egg hatched while you were away' : `${eggCount} eggs hatched while you were away`}
                </h3>
                <ul className="welcome-back-celebration__egg-list">
                  {hatchedEggs.slice(0, 4).map((egg) => (
                    <li key={egg.ledgerKey} className={`welcome-back-celebration__egg welcome-back-celebration__egg--${egg.tier}`}>
                      <img
                        className="welcome-back-celebration__egg-art"
                        src={getEggStageArtSrc(egg.tier, 4)}
                        alt={EGG_TIER_LABELS[egg.tier]}
                      />
                      <span className="welcome-back-celebration__egg-tier">{EGG_TIER_LABELS[egg.tier]}</span>
                    </li>
                  ))}
                </ul>
                <p className="welcome-back-celebration__eggs-note">
                  {eggCount > 4 ? `Showing 4 of ${eggCount}. ` : ''}
                  Visit the game to collect {eggCount === 1 ? 'it' : 'them'}.
                </p>
              </section>
            ) : null}

            <button type="button" className="welcome-back-celebration__cta" onClick={onClose} autoFocus>
              Let's go
            </button>
          </>
        )}
      </div>
    </div>
  );
}
