// New Daily Spin Wheel Modal - One spin per day (resets at midnight)

import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import confetti from 'canvas-confetti';
import { 
  checkSpinAvailable, 
  executeDailySpin
} from '../../services/dailySpins';
import type { SpinWheelPrize } from './types';
import { DAILY_SPIN_PRIZES } from './types';
import { useGamification } from '../../hooks/useGamification';
import './NewDailySpinWheel.css';

interface NewDailySpinWheelProps {
  session: Session;
  onClose: () => void;
}

export function NewDailySpinWheel({ session, onClose }: NewDailySpinWheelProps) {
  const { refreshProfile } = useGamification(session);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [canSpin, setCanSpin] = useState(false);
  const [wonPrize, setWonPrize] = useState<SpinWheelPrize | null>(null);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showReward, setShowReward] = useState(false);

  useEffect(() => {
    loadSpinStatus();
  }, [session.user.id]);

  const loadSpinStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: availability, error: availError } = await checkSpinAvailable(session.user.id);
      
      if (availError) {
        throw availError;
      }

      if (availability) {
        setCanSpin(availability.available);
        // If user already spun, get prize details
        if (availability.todaysSpin) {
          const prize = DAILY_SPIN_PRIZES.find(
            (p) => p.id === availability.todaysSpin!.prize_id
          );
          if (prize) {
            setWonPrize(prize);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load spin status:', err);
      setError('Failed to load spin wheel. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSpin = async () => {
    if (!canSpin || spinning) return;

    setSpinning(true);
    setError(null);

    try {
      const { data, error: spinError } = await executeDailySpin(session.user.id);

      if (spinError || !data) {
        throw spinError || new Error('Failed to spin');
      }

      const { prize } = data;

      // Calculate rotation for animation
      const prizeIndex = DAILY_SPIN_PRIZES.findIndex((p) => p.id === prize.id);
      const segmentAngle = 360 / DAILY_SPIN_PRIZES.length;
      const targetAngle = prizeIndex >= 0 ? prizeIndex * segmentAngle : 0;
      const finalRotation = 360 * 5 + targetAngle; // 5 full rotations + target

      setRotation(finalRotation);

      // Wait for animation to complete
      setTimeout(() => {
        setWonPrize(prize);
        setCanSpin(false);
        setSpinning(false);
        setShowReward(true);

        confetti({
          particleCount: prize.type === 'CASH' || prize.type === 'FEATURE_UNLOCK' ? 140 : 80,
          spread: prize.type === 'CASH' || prize.type === 'FEATURE_UNLOCK' ? 80 : 60,
          origin: { y: 0.6 },
        });

        // Refresh gamification profile
        refreshProfile();

        // Emit event for other components
        window.dispatchEvent(new CustomEvent('dailySpinComplete'));
      }, 3500);
    } catch (err) {
      console.error('Spin failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to spin. Please try again.');
      setSpinning(false);
    }
  };

  if (loading) {
    return (
      <div className="new-daily-spin-modal" onClick={onClose}>
        <div className="new-daily-spin-modal__content" onClick={(e) => e.stopPropagation()}>
          <div className="new-daily-spin-modal__loading">
            <div className="spinner">🎡</div>
            <p>Loading spin wheel...</p>
          </div>
        </div>
      </div>
    );
  }

  const segmentAngle = 360 / DAILY_SPIN_PRIZES.length;
  const wheelBackground = `conic-gradient(${DAILY_SPIN_PRIZES.map((prize, index) => {
    const start = segmentAngle * index;
    const end = start + segmentAngle;
    return `${prize.color} ${start}deg ${end}deg`;
  }).join(', ')})`;

  const rewardSubtitle = wonPrize
    ? wonPrize.type === 'XP'
      ? 'XP added to your profile!'
      : wonPrize.type === 'CASH'
      ? 'Virtual currency credited!'
      : wonPrize.type === 'GAME_LIVES'
      ? 'Lives added to your account!'
      : wonPrize.type === 'FEATURE_UNLOCK'
      ? 'Feature unlocked!'
      : wonPrize.type === 'TASK_BONUS'
      ? 'Special task bonus activated!'
      : 'Better luck tomorrow!'
    : '';

  return (
    <div className="new-daily-spin-modal" onClick={onClose}>
      <div className="new-daily-spin-modal__content" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="new-daily-spin-modal__close"
          onClick={onClose}
          aria-label="Close spin wheel"
        >
          ✕
        </button>

        <header className="new-daily-spin-modal__header">
          <h2>🎡 Daily Spin Wheel</h2>
          <p className="new-daily-spin-modal__subtitle">
            {canSpin ? 'Spin once per day for amazing rewards!' : 'Come back tomorrow for another spin!'}
          </p>
        </header>

        {error && (
          <div className="new-daily-spin-modal__error" role="alert">
            {error}
          </div>
        )}

        {/* Spin Wheel */}
        <div className="new-daily-spin-wheel">
          <div className="new-daily-spin-wheel__pointer">▼</div>
          <div
            className={`new-daily-spin-wheel__disc ${
              spinning ? 'new-daily-spin-wheel__disc--spinning' : ''
            }`}
            style={{
              transform: `rotate(${rotation}deg)`,
              background: wheelBackground,
            }}
          >
            {DAILY_SPIN_PRIZES.map((prize, index) => {
              const angle = segmentAngle * index + segmentAngle / 2;
              return (
                <div
                  key={prize.id}
                  className="new-daily-spin-wheel__label"
                  style={{ '--label-angle': `${angle}deg` } as React.CSSProperties}
                >
                  <div className="new-daily-spin-wheel__label-content">
                    <span className="new-daily-spin-wheel__label-icon">{prize.icon}</span>
                    <span className="new-daily-spin-wheel__label-text">
                      {prize.type === 'CASH'
                        ? `${(prize.value / 1000000).toFixed(1)}M`
                        : prize.type === 'XP'
                        ? `${prize.value} XP`
                        : prize.name}
                    </span>
                  </div>
                </div>
              );
            })}
            <div className="new-daily-spin-wheel__hub" aria-hidden="true" />
          </div>
        </div>

        {/* Actions */}
        <div className="new-daily-spin-modal__actions">
          {canSpin ? (
            <button
              type="button"
              className="new-daily-spin-modal__spin-btn"
              onClick={handleSpin}
              disabled={spinning}
            >
              {spinning ? '🎰 SPINNING...' : '🎰 SPIN NOW!'}
            </button>
          ) : wonPrize ? (
            <div className="new-daily-spin-modal__result">
              <div className="new-daily-spin-modal__result-icon">{wonPrize.icon}</div>
              <h3 className="new-daily-spin-modal__result-title">You won!</h3>
              <p className="new-daily-spin-modal__result-prize">{wonPrize.name}</p>
              {wonPrize.type !== 'EMPTY' && (
                <p className="new-daily-spin-modal__result-subtitle">
                  {rewardSubtitle}
                </p>
              )}
            </div>
          ) : (
            <div className="new-daily-spin-modal__locked">
              <p className="new-daily-spin-modal__locked-icon">🔒</p>
              <p className="new-daily-spin-modal__locked-text">
                Come back tomorrow for another spin!
              </p>
            </div>
          )}
        </div>

        {showReward && wonPrize && (
          <div
            className="new-daily-spin-modal__reward-overlay"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowReward(false)}
          >
            <div
              className="new-daily-spin-modal__reward-card"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="new-daily-spin-modal__reward-burst">🎉</div>
              <h3 className="new-daily-spin-modal__reward-title">Lilly Reward!</h3>
              <div className="new-daily-spin-modal__reward-icon">{wonPrize.icon}</div>
              <p className="new-daily-spin-modal__reward-name">{wonPrize.name}</p>
              {wonPrize.type !== 'EMPTY' && (
                <p className="new-daily-spin-modal__reward-subtitle">{rewardSubtitle}</p>
              )}
              <button
                type="button"
                className="new-daily-spin-modal__reward-close"
                onClick={() => setShowReward(false)}
              >
                Awesome!
              </button>
            </div>
          </div>
        )}

        {/* Prize Legend */}
        <div className="new-daily-spin-modal__legend">
          <h4>Today's Prizes:</h4>
          <div className="new-daily-spin-modal__legend-grid">
            {DAILY_SPIN_PRIZES.filter(p => p.type !== 'EMPTY').map((prize) => (
              <div key={prize.id} className="new-daily-spin-modal__legend-item">
                <span className="new-daily-spin-modal__legend-icon">{prize.icon}</span>
                <span className="new-daily-spin-modal__legend-name">{prize.name}</span>
                <span className="new-daily-spin-modal__legend-chance">
                  {prize.probability}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
