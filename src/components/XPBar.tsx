// XP Bar component - Shows progress to next level with animated fill

import type { LevelInfo } from '../types/gamification';

interface XPBarProps {
  levelInfo: LevelInfo;
}

export function XPBar({ levelInfo }: XPBarProps) {
  const { currentLevel, xpProgress, xpForNextLevel, xpForCurrentLevel, progressPercentage } = levelInfo;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;

  return (
    <div className="xp-bar-container" role="progressbar" aria-valuenow={progressPercentage} aria-valuemin={0} aria-valuemax={100} aria-label={`Level ${currentLevel} progress`}>
      <div className="xp-bar-header">
        <span className="xp-bar-label">Level {currentLevel}</span>
        <span className="xp-bar-stats">
          {xpProgress} / {xpNeeded} XP
        </span>
      </div>
      <div className="xp-bar-track">
        <div 
          className="xp-bar-fill" 
          style={{ width: `${progressPercentage}%` }}
        >
          <div className="xp-bar-glow"></div>
        </div>
      </div>
      <div className="xp-bar-next">
        Level {currentLevel + 1} at {xpForNextLevel} XP
      </div>
    </div>
  );
}
