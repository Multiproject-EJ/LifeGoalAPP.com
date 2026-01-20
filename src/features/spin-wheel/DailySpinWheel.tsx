import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getDailySpinState, executeSpin } from '../../services/dailySpin';
import type { DailySpinState, SpinResult } from '../../types/gamification';
import { SpinWheel } from './SpinWheel';
import { SpinRewardDisplay } from './SpinRewardDisplay';
import { SpinTokenIndicator } from './SpinTokenIndicator';
import { useGamification } from '../../hooks/useGamification';
import './DailySpinWheel.css';

type Props = {
  session: Session;
};

export function DailySpinWheel({ session }: Props) {
  const { enabled: gamificationEnabled, refreshProfile } = useGamification(session);
  const [spinState, setSpinState] = useState<DailySpinState | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    loadSpinState();
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

  const loadSpinState = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await getDailySpinState(session.user.id);

    if (fetchError) {
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      setIsOffline(offline);
      setError(
        offline
          ? 'You appear to be offline. Check your connection and try again.'
          : 'We could not reach the spin wheel. Please try again.'
      );
      console.error(fetchError);
    } else {
      setSpinState(data);
    }

    setLoading(false);
  };

  const handleSpin = async () => {
    if (!spinState || spinState.spinsAvailable <= 0 || spinning) return;

    setSpinning(true);
    setError(null);
    setResult(null);

    try {
      const { data: spinResult, error: spinError } = await executeSpin(session.user.id);

      if (spinError) {
        throw new Error(spinError.message);
      }

      if (!spinResult) {
        throw new Error('No result returned');
      }

      // Wait for spin animation to complete
      setTimeout(() => {
        setResult(spinResult);
        setSpinning(false);

        // Refresh gamification profile to update points/lives/freezes
        refreshProfile();

        // Emit event for other components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('dailySpinComplete'));
        }

        // Reload spin state
        loadSpinState();
      }, 3500); // Match spin animation duration

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to spin');
      setSpinning(false);
    }
  };

  const handleCloseReward = () => {
    setResult(null);
  };

  if (!gamificationEnabled) {
    return null;
  }

  const canSpin = spinState && spinState.spinsAvailable > 0 && !spinning;

  return (
    <div className="daily-spin-wheel">
      <header className="daily-spin-wheel__header">
        <h2>🎰 Daily Spin Wheel</h2>
        <p className="daily-spin-wheel__subtitle">
          Complete habits to earn spins!
        </p>
      </header>

      {spinState && (
        <SpinTokenIndicator
          spinsAvailable={spinState.spinsAvailable}
          totalSpinsUsed={spinState.totalSpinsUsed}
        />
      )}

      <div className="daily-spin-wheel__wheel-container">
        <SpinWheel
          spinning={spinning}
          result={result?.prize}
        />
      </div>

      {loading && (
        <div className="daily-spin-wheel__loading" role="status">
          Loading spin wheel...
        </div>
      )}

      {error && (
        <div className="daily-spin-wheel__error" role="alert">
          <p className="daily-spin-wheel__error-text">{error}</p>
          <div className="daily-spin-wheel__error-actions">
            <button
              type="button"
              className="daily-spin-wheel__retry-button"
              onClick={loadSpinState}
              disabled={loading}
            >
              Try again
            </button>
            {isOffline && (
              <span className="daily-spin-wheel__error-footnote">
                Offline mode keeps your place. Reconnect to spin.
              </span>
            )}
          </div>
        </div>
      )}

      <div className="daily-spin-wheel__actions">
        {canSpin ? (
          <button
            type="button"
            className="daily-spin-wheel__spin-button"
            onClick={handleSpin}
            disabled={spinning}
          >
            {spinning ? '🎰 SPINNING...' : '🎰 SPIN NOW!'}
          </button>
        ) : (
          <div className="daily-spin-wheel__locked">
            <p>🔒 No spins available</p>
            <p className="daily-spin-wheel__hint">
              Complete at least 1 habit today to earn a spin!
            </p>
          </div>
        )}
      </div>

      {result && (
        <SpinRewardDisplay
          prize={result.prize}
          spinsRemaining={result.spinsRemaining}
          onClose={handleCloseReward}
        />
      )}
    </div>
  );
}
