import type { AchievementWithProgress } from '../../types/gamification';
import { TIER_COLORS } from '../../types/gamification';
import { AchievementProgress } from './AchievementProgress';

type Props = {
  achievement: AchievementWithProgress;
  onClick: () => void;
};

export function AchievementCard({ achievement, onClick }: Props) {
  const tierColor = TIER_COLORS[achievement.tier as keyof typeof TIER_COLORS]?.border || '#667EEA';
  const isLocked = !achievement.unlocked;

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
          current={achievement.progress}
          required={achievement.requirement_value}
          percent={achievement.progressPercent || 0}
        />
      )}

      <div className="achievement-card__rewards">
        <span>+{achievement.xp_reward} XP</span>
      </div>

      {achievement.unlocked_at && (
        <div className="achievement-card__unlocked-date">
          Unlocked {new Date(achievement.unlocked_at).toLocaleDateString()}
        </div>
      )}
    </button>
  );
}
