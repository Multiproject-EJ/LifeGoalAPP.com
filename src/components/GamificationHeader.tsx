// Gamification Header - Displays level, XP, streak, lives, and points

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { GamificationProfile, LevelInfo, ActiveBoost } from '../types/gamification';
import { XPBar } from './XPBar';
import { NotificationBadge } from './NotificationBadge';
import { useDailySpinStatus } from '../hooks/useDailySpinStatus';
import { getActivePowerUps } from '../services/powerUps';
import { Leaderboards } from '../features/gamification/Leaderboards';

interface GamificationHeaderProps {
  profile: GamificationProfile;
  levelInfo: LevelInfo;
  session?: Session;
  onLevelClick?: () => void;
}

export function GamificationHeader({ profile, levelInfo, session, onLevelClick }: GamificationHeaderProps) {
  const { spinAvailable, loading } = useDailySpinStatus(session?.user?.id);
  const [activePowerUps, setActivePowerUps] = useState<ActiveBoost[]>([]);
  const [showLeaderboards, setShowLeaderboards] = useState(false);

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
    <>
      <div className="gamification-header">
        <div className="gamification-header__content">
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
            {/* Level Badge */}
            <button
              type="button"
              className={`gamification-badge gamification-badge--level ${
                onLevelClick ? 'gamification-badge--clickable' : ''
              }`}
              onClick={onLevelClick}
              disabled={!onLevelClick}
              style={{ position: 'relative', marginBottom: 0 }}
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

            {/* Leaderboards Button */}
            <button
              type="button"
              className="gamification-badge gamification-badge--clickable"
              onClick={() => setShowLeaderboards(true)}
              style={{ marginBottom: 0 }}
              aria-label="View leaderboards"
            >
              <div className="gamification-badge__icon">🏆</div>
              <div className="gamification-badge__info">
                <div className="gamification-badge__label">Leaderboards</div>
                <div className="gamification-badge__value">Compete</div>
              </div>
            </button>
          </div>

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

            {/* Points */}
            <div className="gamification-stat">
              <span className="gamification-stat__icon">💎</span>
              <span className="gamification-stat__value">{profile.total_points}</span>
              <span className="gamification-stat__label">Points</span>
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
      
      {/* Leaderboards Modal */}
      {showLeaderboards && (
        <div 
          className="gamification-scorecard-overlay" 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowLeaderboards(false);
            }
          }}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <Leaderboards session={session} onClose={() => setShowLeaderboards(false)} />
          </div>
        </div>
      )}
    </>
  );
}
