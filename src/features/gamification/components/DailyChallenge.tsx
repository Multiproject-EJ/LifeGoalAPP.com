import type { DailyChallenge } from '../../../types/meditation';
import './DailyChallenge.css';

interface DailyChallengeProps {
  challenge: DailyChallenge;
}

export function DailyChallengeCard({ challenge }: DailyChallengeProps) {
  const progressPercent = (challenge.current_progress / challenge.target_value) * 100;
  const isCompleted = challenge.is_completed;

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case 'duration':
        return '⏱️';
      case 'frequency':
        return '🔄';
      case 'variety':
        return '🌈';
      default:
        return '⭐';
    }
  };

  return (
    <div className={`daily-challenge ${isCompleted ? 'daily-challenge--completed' : ''}`}>
      <div className="daily-challenge__header">
        <div className="daily-challenge__icon">{getChallengeIcon(challenge.challenge_type)}</div>
        <div className="daily-challenge__title-section">
          <h3 className="daily-challenge__title">Daily Challenge</h3>
          <p className="daily-challenge__description">{challenge.description}</p>
        </div>
        {isCompleted && (
          <div className="daily-challenge__completed-badge">
            <span className="daily-challenge__completed-icon">✓</span>
          </div>
        )}
      </div>

      <div className="daily-challenge__progress-section">
        <div className="daily-challenge__progress-bar">
          <div
            className="daily-challenge__progress-fill"
            style={{ width: `${Math.min(100, progressPercent)}%` }}
          />
        </div>
        <div className="daily-challenge__progress-text">
          {challenge.current_progress} / {challenge.target_value}
        </div>
      </div>

      <div className="daily-challenge__reward">
        <span className="daily-challenge__reward-icon">💰</span>
        <span className="daily-challenge__reward-text">
          {isCompleted ? 'Earned' : 'Earn'} {challenge.bonus_xp} XP
        </span>
      </div>
    </div>
  );
}
