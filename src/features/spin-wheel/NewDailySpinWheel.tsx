// New Daily Spin Wheel Modal - One spin per day (resets at midnight)

import { useState, useEffect, useMemo, type CSSProperties } from 'react';
import type { Session } from '@supabase/supabase-js';
import confetti from 'canvas-confetti';
import {
  executeSpin,
  getDailySpinState,
  getSpinHistory,
} from '../../services/dailySpin';
import type { SpinHistoryEntry, SpinPrize } from '../../types/gamification';
import { SPIN_PRIZES } from '../../types/gamification';
import { buildWheelSegments } from './spinWheelUtils';
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
  const [wonPrize, setWonPrize] = useState<SpinPrize | null>(null);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showReward, setShowReward] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const wheelSegments = useMemo(() => buildWheelSegments(SPIN_PRIZES), []);
  const highestPrizeValue = wheelSegments.reduce((maxValue, prize) => Math.max(maxValue, prize.value), 0);

  const getSpinStatusErrorMessage = (err: unknown, offline: boolean) => {
    if (offline) {
      return 'You appear to be offline. Check your connection and try again.';
    }

    if (err && typeof err === 'object') {
      const maybeError = err as { code?: string; message?: string };
      if (
        maybeError.code === '42P01' ||
        maybeError.message?.toLowerCase().includes('daily_spin_state') ||
        maybeError.message?.toLowerCase().includes('spin_history')
      ) {
        return 'Daily spins are not configured yet. Run the daily spin migration to enable the wheel.';
      }
    }

    return 'We could not reach the spin wheel. Please try again.';
  };

  useEffect(() => {
    loadSpinStatus();
  }, [session.user.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadSpinStatus = async () => {
    setLoading(true);
    setError(null);
    setWonPrize(null);

    try {
      const { data: spinState, error: spinError } = await getDailySpinState(session.user.id);

      if (spinError) {
        throw spinError;
      }

      if (spinState) {
        setCanSpin(spinState.spinsAvailable > 0);

        const today = new Date().toISOString().split('T')[0];
        const lastSpinDate = spinState.lastSpinDate;

        if (lastSpinDate === today) {
          const { data: history, error: historyError } = await getSpinHistory(session.user.id, 1);

          if (historyError) {
            throw historyError;
          }

          const lastSpin = (history?.[0] as SpinHistoryEntry | Record<string, unknown> | undefined) ?? null;
          if (lastSpin) {
            const spunAt = (lastSpin as SpinHistoryEntry).spunAt ?? (lastSpin as { spun_at?: string }).spun_at;
            const prizeType =
              (lastSpin as SpinHistoryEntry).prizeType ??
              (lastSpin as { prize_type?: SpinPrize['type'] }).prize_type;
            const prizeValue =
              (lastSpin as SpinHistoryEntry).prizeValue ??
              (lastSpin as { prize_value?: number }).prize_value;

            if (!spunAt || !prizeType || typeof prizeValue !== 'number') {
              return;
            }

            const spunDate = new Date(spunAt).toISOString().split('T')[0];
            if (spunDate === today) {
              const matchedPrize = SPIN_PRIZES.find(
                (prize) =>
                  prize.type === prizeType && prize.value === prizeValue
              );
              if (matchedPrize) {
                setWonPrize(matchedPrize);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load spin status:', err);
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      setIsOffline(offline);
      setCanSpin(false);
      setError(getSpinStatusErrorMessage(err, offline));
    } finally {
      setLoading(false);
    }
  };

  const handleSpin = async () => {
    if (!canSpin || spinning) return;

    setSpinning(true);
    setError(null);

    try {
      const { data, error: spinError } = await executeSpin(session.user.id);

      if (spinError || !data) {
        throw spinError || new Error('Failed to spin');
      }

      const { prize, spinsRemaining } = data;

      // Calculate rotation for animation
      const segment = wheelSegments.find(
        (candidate) =>
          candidate.type === prize.type &&
          candidate.value === prize.value &&
          candidate.label === prize.label
      );
      const targetAngle = segment ? segment.centerAngle : 0;
      const finalRotation = 360 * 5 + targetAngle; // 5 full rotations + target

      setRotation(finalRotation);

      // Wait for animation to complete
      setTimeout(() => {
        setWonPrize(prize);
        setCanSpin(spinsRemaining > 0);
        setSpinning(false);
        setShowReward(true);

        confetti({
          particleCount: prize.type === 'treasure_chest' ? 180 : 140,
          spread: prize.type === 'treasure_chest' ? 90 : 80,
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
          <button
            type="button"
            className="new-daily-spin-modal__close"
            onClick={onClose}
            aria-label="Close spin wheel"
          >
            ✕
          </button>
          <div className="new-daily-spin-modal__loading">
            <div className="spinner">🎡</div>
            <p>Loading spin wheel...</p>
          </div>
        </div>
      </div>
    );
  }

  const wheelBackground = `conic-gradient(${wheelSegments
    .map((prize) => `${prize.color} ${prize.startAngle}deg ${prize.endAngle}deg`)
    .join(', ')})`;

  const rewardSubtitle = wonPrize
    ? wonPrize.type === 'treasure_chest'
      ? `Chest opened! +${wonPrize.value} gold added.`
      : 'Gold added to your account!'
    : '';
  const isChestPrize = wonPrize?.type === 'treasure_chest';

  const headerSubtitle = error
    ? 'We could not load today’s spin. Check your connection and retry.'
    : canSpin
    ? 'Spin when you have a token for amazing rewards!'
    : 'No spins left. Earn more by completing habits today.';

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
            {headerSubtitle}
          </p>
        </header>

        {error && (
          <div className="new-daily-spin-modal__error" role="alert">
            <p className="new-daily-spin-modal__error-title">Spin wheel unavailable</p>
            <p className="new-daily-spin-modal__error-detail">{error}</p>
            <div className="new-daily-spin-modal__error-actions">
              <button
                type="button"
                className="new-daily-spin-modal__retry-btn"
                onClick={loadSpinStatus}
                disabled={loading}
              >
                Try again
              </button>
              <button
                type="button"
                className="new-daily-spin-modal__secondary-btn"
                onClick={onClose}
              >
                Close
              </button>
            </div>
            {isOffline && (
              <p className="new-daily-spin-modal__error-footnote">
                Offline mode keeps your place. Reconnect to spin.
              </p>
            )}
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
            {wheelSegments.map((prize) => {
              const angle = prize.centerAngle;
              return (
                <div
                  key={`${prize.type}-${prize.value}-${prize.label}`}
                  className={`new-daily-spin-wheel__label new-daily-spin-wheel__label--${prize.wheelSize}${
                    prize.type === 'treasure_chest' ? ' new-daily-spin-wheel__label--chest' : ''
                  }`}
                  style={{ '--label-angle': `${angle}deg` } as CSSProperties}
                >
                  <div className="new-daily-spin-wheel__label-content">
                    <span className="new-daily-spin-wheel__label-icon">{prize.icon}</span>
                    <span className="new-daily-spin-wheel__label-text">
                      {prize.label}
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
          {error ? (
            <div className="new-daily-spin-modal__fallback">
              <p className="new-daily-spin-modal__fallback-title">We saved your spot.</p>
              <p className="new-daily-spin-modal__fallback-text">
                Stay here and retry once your connection is back.
              </p>
              <div className="new-daily-spin-modal__fallback-actions">
                <button
                  type="button"
                  className="new-daily-spin-modal__retry-btn"
                  onClick={loadSpinStatus}
                  disabled={loading}
                >
                  Retry
                </button>
                <button
                  type="button"
                  className="new-daily-spin-modal__secondary-btn"
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
            </div>
          ) : canSpin ? (
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
              <div
                className={`new-daily-spin-modal__result-icon${
                  isChestPrize ? ' new-daily-spin-modal__result-icon--chest' : ''
                }`}
              >
                {wonPrize.icon}
              </div>
              <h3 className="new-daily-spin-modal__result-title">You won!</h3>
              <p className="new-daily-spin-modal__result-prize">{wonPrize.label}</p>
              <p className="new-daily-spin-modal__result-subtitle">{rewardSubtitle}</p>
            </div>
          ) : (
            <div className="new-daily-spin-modal__locked">
              <p className="new-daily-spin-modal__locked-icon">🔒</p>
              <p className="new-daily-spin-modal__locked-text">
                Earn spins by finishing habits:
              </p>
              <ul className="new-daily-spin-modal__locked-list">
                <li>Complete 1+ habits today → 1 spin</li>
                <li>Complete all of today’s habits → 2 spins</li>
                <li>Keep a 7+ day streak → +1 bonus spin at reset</li>
              </ul>
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
              className={`new-daily-spin-modal__reward-card${
                isChestPrize ? ' new-daily-spin-modal__reward-card--chest' : ''
              }`}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="new-daily-spin-modal__reward-burst">
                {isChestPrize ? '🗝️' : '🎉'}
              </div>
              <h3 className="new-daily-spin-modal__reward-title">Lilly Reward!</h3>
              <div
                className={`new-daily-spin-modal__reward-icon${
                  isChestPrize ? ' new-daily-spin-modal__reward-icon--chest' : ''
                }`}
              >
                {wonPrize.icon}
              </div>
              <p className="new-daily-spin-modal__reward-name">{wonPrize.label}</p>
              <p className="new-daily-spin-modal__reward-subtitle">{rewardSubtitle}</p>
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
            {wheelSegments.map((prize) => (
              <div
                key={`${prize.type}-${prize.value}-${prize.label}`}
                className={`new-daily-spin-modal__legend-item${
                  prize.type === 'treasure_chest'
                    ? ' new-daily-spin-modal__legend-item--chest'
                    : ''
                }${prize.value === highestPrizeValue ? ' new-daily-spin-modal__legend-item--highlight' : ''}`}
              >
                <span className="new-daily-spin-modal__legend-icon">{prize.icon}</span>
                <span className="new-daily-spin-modal__legend-name">{prize.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
