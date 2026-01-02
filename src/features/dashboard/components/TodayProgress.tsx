import './TodayProgress.css';

interface DailyStats {
  minutesMeditated: number;
  xpEarned: number;
  goalsCompleted: number;
  totalGoals: number;
}

interface TodayProgressProps {
  stats: DailyStats;
}

export function TodayProgress({ stats }: TodayProgressProps) {
  const completionPercent =
    stats.totalGoals > 0 ? (stats.goalsCompleted / stats.totalGoals) * 100 : 0;

  return (
    <div className="today-progress">
      <div className="today-progress__header">
        <h3 className="today-progress__title">Today's Progress</h3>
        <div className="today-progress__date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
      </div>

      <div className="today-progress__stats">
        <div className="today-progress__stat">
          <div className="today-progress__stat-icon">🧘</div>
          <div className="today-progress__stat-content">
            <div className="today-progress__stat-value">{stats.minutesMeditated}</div>
            <div className="today-progress__stat-label">Minutes</div>
          </div>
        </div>

        <div className="today-progress__stat">
          <div className="today-progress__stat-icon">💰</div>
          <div className="today-progress__stat-content">
            <div className="today-progress__stat-value">+{stats.xpEarned}</div>
            <div className="today-progress__stat-label">XP Earned</div>
          </div>
        </div>

        <div className="today-progress__stat">
          <div className="today-progress__stat-icon">🎯</div>
          <div className="today-progress__stat-content">
            <div className="today-progress__stat-value">
              {stats.goalsCompleted}/{stats.totalGoals}
            </div>
            <div className="today-progress__stat-label">Goals</div>
          </div>
        </div>
      </div>

      {stats.totalGoals > 0 && (
        <div className="today-progress__completion">
          <div className="today-progress__completion-bar">
            <div
              className="today-progress__completion-fill"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <div className="today-progress__completion-text">
            {Math.round(completionPercent)}% of daily goals completed
          </div>
        </div>
      )}
    </div>
  );
}
