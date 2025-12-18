import type { AchievementWithProgress } from '../../services/achievements';
import { TIER_COLORS } from '../../types/gamification';
import { AchievementProgress } from './AchievementProgress';

type Props = {
  achievement: AchievementWithProgress;
  onClick: () => void;
};

export function AchievementCard({ achievement, onClick }: Props) {
  const tierColor = TIER_COLORS[achievement.tier as keyof typeof TIER_COLORS]?.border || '#667EEA';
  const isLocked = !achievement.isUnlocked;

  return (
    <button
      type="button"
      className={`achievement-card ${isLocked ? 'achievement-card--locked' : 'achievement-card--unlocked'}`}
      onClick={onClick}
      style={{ borderColor: tierColor }}
    >
      <div className="achievement-card__status">
        {isLocked ? '🔒 LOCKED' : '✅ UNLOCKED'}
      </div>

      <div className="achievement-card__icon" style={{ opacity: isLocked ? 0.4 : 1 }}>
        {achievement.icon}
      </div>

      <h3 className="achievement-card__name">{achievement.name}</h3>

      <p className="achievement-card__description">{achievement.description}</p>

      {isLocked && (
        <AchievementProgress
          current={achievement.currentProgress}
          required={achievement.requirement_value}
          percent={achievement.progressPercent}
        />
      )}

      <div className="achievement-card__rewards">
        <span>+{achievement.xp_reward} XP</span>
        <span>•</span>
        <span>+{achievement.xp_reward} Points</span>
      </div>

      {achievement.unlockedAt && (
        <div className="achievement-card__unlocked-date">
          Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
        </div>
      )}
    </button>
  );
}
