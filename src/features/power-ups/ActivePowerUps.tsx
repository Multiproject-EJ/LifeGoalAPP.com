import { useEffect, useState } from 'react';
import { ActiveBoost } from '../../types/gamification';

interface ActivePowerUpsProps {
  activeBoosts: ActiveBoost[];
  onUpdate?: () => void;
}

export function ActivePowerUps({ activeBoosts, onUpdate }: ActivePowerUpsProps) {
  const [, setTick] = useState(0);

  // Update timer every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
      if (onUpdate) {
        onUpdate();
      }
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [onUpdate]);

  if (activeBoosts.length === 0) {
    return null;
  }

  const formatTimeRemaining = (minutes: number | null) => {
    if (minutes === null) return 'Permanent';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  };

  const getProgressPercentage = (boost: ActiveBoost) => {
    if (!boost.expiresAt || !boost.minutesRemaining) return 100;
    
    // Calculate total duration based on effect type
    let totalMinutes = 60; // default
    if (boost.name.includes('24 hours')) totalMinutes = 1440;
    
    return Math.max(0, Math.min(100, (boost.minutesRemaining / totalMinutes) * 100));
  };

  return (
    <div className="active-power-ups">
      <h3 className="active-power-ups__title">Active Power-ups</h3>
      <div className="active-power-ups__list">
        {activeBoosts.map((boost) => (
          <div key={boost.id} className="active-boost">
            <div className="active-boost__header">
              <span className="active-boost__icon">{boost.icon}</span>
              <span className="active-boost__name">{boost.name}</span>
            </div>
            {boost.expiresAt && (
              <>
                <div className="active-boost__time">
                  ⏱️ {formatTimeRemaining(boost.minutesRemaining)}
                </div>
                <div className="active-boost__progress-bar">
                  <div
                    className="active-boost__progress-fill"
                    style={{ width: `${getProgressPercentage(boost)}%` }}
                  />
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
