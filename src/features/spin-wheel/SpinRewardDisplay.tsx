import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { SpinPrize } from '../../types/gamification';

type Props = {
  prize: SpinPrize;
  spinsRemaining: number;
  onClose: () => void;
};

export function SpinRewardDisplay({ prize, spinsRemaining, onClose }: Props) {
  useEffect(() => {
    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  }, []);

  const wasMystery = prize.details?.wasMystery as boolean | undefined;

  return (
    <div className="spin-reward-display" role="dialog" aria-modal="true">
      <div className="spin-reward-display__backdrop" onClick={onClose} />
      <div className="spin-reward-display__content">
        {wasMystery && (
          <div className="spin-reward-display__mystery-badge">
            🎁 MYSTERY BOX!
          </div>
        )}
        
        <div className="spin-reward-display__icon">{prize.icon}</div>
        
        <h2 className="spin-reward-display__title">You Won!</h2>
        
        <p className="spin-reward-display__prize">{prize.label}</p>
        
        {spinsRemaining > 0 && (
          <p className="spin-reward-display__remaining">
            {spinsRemaining} {spinsRemaining === 1 ? 'spin' : 'spins'} remaining
          </p>
        )}
        
        <button
          type="button"
          className="spin-reward-display__close-button"
          onClick={onClose}
        >
          Awesome! 🎉
        </button>
      </div>
    </div>
  );
}
