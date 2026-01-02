import { useMemo } from 'react';
import { getLevelInfo } from '../../../utils/xpCalculator';
import './LevelDisplay.css';

interface LevelDisplayProps {
  totalXP: number;
  showDetails?: boolean;
}

export function LevelDisplay({ totalXP, showDetails = true }: LevelDisplayProps) {
  const levelInfo = useMemo(() => getLevelInfo(totalXP), [totalXP]);

  const xpToNext = levelInfo.xpForNextLevel - levelInfo.currentXP;

  return (
    <div className="level-display">
      <div className="level-display__header">
        <div className="level-display__level-badge">
          <span className="level-display__level-label">Level</span>
          <span className="level-display__level-number">{levelInfo.currentLevel}</span>
        </div>
        {showDetails && (
          <div className="level-display__xp-text">
            <span className="level-display__xp-current">{levelInfo.currentXP.toLocaleString()}</span>
            <span className="level-display__xp-separator"> / </span>
            <span className="level-display__xp-next">{levelInfo.xpForNextLevel.toLocaleString()} XP</span>
          </div>
        )}
      </div>

      <div className="level-display__progress-container">
        <div className="level-display__progress-bar">
          <div
            className="level-display__progress-fill"
            style={{ width: `${levelInfo.progressPercentage}%` }}
          />
        </div>
        {showDetails && (
          <div className="level-display__progress-label">
            {xpToNext.toLocaleString()} XP to level {levelInfo.currentLevel + 1}
          </div>
        )}
      </div>
    </div>
  );
}
