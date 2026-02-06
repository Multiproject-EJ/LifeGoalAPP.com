// Gamification Header - Displays level, XP, streak, lives, and gold

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { GamificationProfile, LevelInfo, ActiveBoost } from '../types/gamification';
import { XPBar } from './XPBar';
import { NotificationBadge } from './NotificationBadge';
import { useDailySpinStatus } from '../hooks/useDailySpinStatus';
import { getActivePowerUps } from '../services/powerUps';
import { splitGoldBalance } from '../constants/economy';

interface GamificationHeaderProps {
  profile: GamificationProfile;
  levelInfo: LevelInfo;
  session?: Session;
  onLevelClick?: () => void;
}

export function GamificationHeader({ profile, levelInfo, session, onLevelClick }: GamificationHeaderProps) {
  const { spinAvailable, loading } = useDailySpinStatus(session?.user?.id);
  const [activePowerUps, setActivePowerUps] = useState<ActiveBoost[]>([]);
  const zenTokens = profile.zen_tokens ?? 0;
  const { diamonds, goldRemainder } = splitGoldBalance(profile.total_points);
  const goldValueLabel =
    diamonds > 0 ? `💎 ${diamonds.toLocaleString()} · 🪙 ${goldRemainder.toLocaleString()}` : goldRemainder.toLocaleString();

  useEffect(() => {
    const userId = session?.user?.id || 'demo_user';
    const loadActivePowerUps = async () => {
      const { data } = await getActivePowerUps(userId);
      if (data) {
        setActivePowerUps(data);
      }
    };

    loadActivePowerUps();
    // Refresh every minute to update timers
    const interval = setInterval(loadActivePowerUps, 60000);
    return () => clearInterval(interval);
  }, [session?.user?.id]);

  return (
    <div className="gamification-header">
      <div className="gamification-header__content">
        {/* Level Badge */}
        <button
          type="button"
          className={`gamification-badge gamification-badge--level ${
            onLevelClick ? 'gamification-badge--clickable' : ''
          }`}
          onClick={onLevelClick}
          disabled={!onLevelClick}
          style={{ position: 'relative' }}
          aria-label={spinAvailable ? 'Level (Daily spin available!)' : 'Level'}
        >
          <div className="gamification-badge__icon">🆙</div>
          <div className="gamification-badge__info">
            <div className="gamification-badge__label">Level</div>
            <div className="gamification-badge__value">{profile.current_level}</div>
          </div>
          {!loading && spinAvailable && (
            <NotificationBadge
              show={true}
              position="top-right"
              pulse={true}
              ariaLabel="Daily spin available"
            />
          )}
        </button>

        {/* XP Progress Bar */}
        <div className="gamification-header__xp">
          <XPBar levelInfo={levelInfo} />
        </div>

        {/* Active Power-ups Indicator */}
        {activePowerUps.length > 0 && (
          <div className="gamification-header__active-powerups">
            {activePowerUps.map((powerUp) => (
              <div key={powerUp.id} className="active-powerup-indicator" title={powerUp.name}>
                <span className="active-powerup-indicator__icon">{powerUp.icon}</span>
                {powerUp.effectType === 'xp_multiplier' && (
                  <span className="active-powerup-indicator__text">{powerUp.effectValue}x XP</span>
                )}
                {powerUp.minutesRemaining !== null && (
                  <span className="active-powerup-indicator__timer">
                    {Math.floor(powerUp.minutesRemaining / 60)}:{String(powerUp.minutesRemaining % 60).padStart(2, '0')}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Stats Row */}
        <div className="gamification-stats">
          {/* Streak */}
          <div className="gamification-stat">
            <span className="gamification-stat__icon">🔥</span>
            <span className="gamification-stat__value">{profile.current_streak}</span>
            <span className="gamification-stat__label">Streak</span>
          </div>

          {/* Lives */}
          <div className="gamification-stat">
            <span className="gamification-stat__icon">❤️</span>
            <span className="gamification-stat__value">{profile.lives}/{profile.max_lives}</span>
            <span className="gamification-stat__label">Lives</span>
          </div>

          {/* Gold */}
          <div className="gamification-stat">
            <span className="gamification-stat__icon">🪙</span>
            <span className="gamification-stat__value">{goldValueLabel}</span>
            <span className="gamification-stat__label">Gold</span>
          </div>

          {/* Zen Tokens */}
          <div className="gamification-stat">
            <span className="gamification-stat__icon">🪷</span>
            <span className="gamification-stat__value">{zenTokens}</span>
            <span className="gamification-stat__label">Zen</span>
          </div>

          {/* Streak Freezes */}
          {profile.streak_freezes > 0 && (
            <div className="gamification-stat">
              <span className="gamification-stat__icon">❄️</span>
              <span className="gamification-stat__value">{profile.streak_freezes}</span>
              <span className="gamification-stat__label">Freezes</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
