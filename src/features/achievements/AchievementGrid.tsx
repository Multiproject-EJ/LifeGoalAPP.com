import type { AchievementWithProgress } from '../../services/achievements';
import { AchievementCard } from './AchievementCard';

type Props = {
  achievements: AchievementWithProgress[];
  onAchievementClick: (achievement: AchievementWithProgress) => void;
};

export function AchievementGrid({ achievements, onAchievementClick }: Props) {
  if (achievements.length === 0) {
    return (
      <div className="achievement-grid__empty">
        <p>🔍 No achievements found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="achievement-grid">
      {achievements.map(achievement => (
        <AchievementCard
          key={achievement.id}
          achievement={achievement}
          onClick={() => onAchievementClick(achievement)}
        />
      ))}
    </div>
  );
}
