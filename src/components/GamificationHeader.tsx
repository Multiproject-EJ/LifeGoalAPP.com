// Gamification Header - Displays level, XP, streak, lives, and points

import type { GamificationProfile, LevelInfo } from '../types/gamification';
import { XPBar } from './XPBar';

interface GamificationHeaderProps {
  profile: GamificationProfile;
  levelInfo: LevelInfo;
}

export function GamificationHeader({ profile, levelInfo }: GamificationHeaderProps) {
  return (
    <div className="gamification-header">
      <div className="gamification-header__content">
        {/* Level Badge */}
        <div className="gamification-badge gamification-badge--level">
          <div className="gamification-badge__icon">🆙</div>
          <div className="gamification-badge__info">
            <div className="gamification-badge__label">Level</div>
            <div className="gamification-badge__value">{profile.current_level}</div>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="gamification-header__xp">
          <XPBar levelInfo={levelInfo} />
        </div>

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
  );
}
