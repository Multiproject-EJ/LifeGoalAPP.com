import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { fetchDailySpinState, executeSpin } from '../../services/dailySpin';
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

  useEffect(() => {
    loadSpinState();
  }, [session.user.id]);

  const loadSpinState = async () => {
    setLoading(true);
    const { data, error: fetchError } = await fetchDailySpinState(session.user.id);

    if (fetchError) {
      setError('Failed to load spin state');
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

  if (loading) {
    return (
      <div className="daily-spin-wheel">
        <div className="daily-spin-wheel__loading">Loading spin wheel...</div>
      </div>
    );
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

      {error && (
        <p className="daily-spin-wheel__error" role="alert">
          {error}
        </p>
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
