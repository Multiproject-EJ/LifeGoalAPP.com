import { useCallback, useEffect, useState } from 'react';
import type { ChallengeInstance, ChallengeState } from '../../../types/gamification';
import { ensureChallengeState, getChallengeStats } from '../../../services/challenges';
import './GamificationChallenges.css';

interface GamificationChallengesProps {
  userId: string;
  /** Optional callback when a challenge is completed (e.g. to award XP) */
  onChallengeComplete?: (challenge: ChallengeInstance) => void;
}

function ChallengeCard({ challenge }: { challenge: ChallengeInstance }) {
  const isCompleted = challenge.status === 'completed';
  const progressPercent = Math.min(100, (challenge.currentProgress / challenge.targetValue) * 100);

  return (
    <div className={`gamification-challenges__card${isCompleted ? ' gamification-challenges__card--completed' : ''}`}>
      <div className="gamification-challenges__card-header">
        <span className="gamification-challenges__card-icon">{challenge.icon}</span>
        <div className="gamification-challenges__card-body">
          <h4 className="gamification-challenges__card-title">{challenge.title}</h4>
          <p className="gamification-challenges__card-desc">{challenge.description}</p>
        </div>
        {isCompleted && (
          <span className="gamification-challenges__badge" aria-label="Completed">✓</span>
        )}
      </div>
      <div className="gamification-challenges__progress-row">
        <div className="gamification-challenges__progress-bar" role="progressbar" aria-valuenow={challenge.currentProgress} aria-valuemin={0} aria-valuemax={challenge.targetValue}>
          <span className="gamification-challenges__progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <span className="gamification-challenges__progress-label">
          {challenge.currentProgress}/{challenge.targetValue}
        </span>
      </div>
      <span className="gamification-challenges__reward">
        ⭐ {isCompleted ? 'Earned' : '+'}{challenge.xpReward} XP
      </span>
    </div>
  );
}

export function GamificationChallenges({ userId, onChallengeComplete }: GamificationChallengesProps) {
  const [state, setState] = useState<ChallengeState | null>(null);

  const refresh = useCallback(() => {
    const nextState = ensureChallengeState(userId);
    setState(nextState);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Re-check periodically so completion updates are reflected
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key?.includes('lifegoal_demo_challenges')) {
        refresh();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refresh]);

  // Expose onChallengeComplete for parent use  
  useEffect(() => {
    if (!state || !onChallengeComplete) return;
    // Check for newly completed challenges
    const allChallenges = [...state.dailyChallenges, ...state.weeklyChallenges];
    const completed = allChallenges.filter((c) => c.status === 'completed' && c.completedAt);
    // This is a passive check — actual completion is triggered by recordChallengeActivity
    void completed;
  }, [state, onChallengeComplete]);

  if (!state) return null;

  const stats = getChallengeStats(userId);

  return (
    <div className="gamification-challenges">
      <div className="gamification-challenges__section">
        <div className="gamification-challenges__section-header">
          <h3 className="gamification-challenges__section-title">📅 Daily Challenges</h3>
          <span className="gamification-challenges__section-progress">
            {stats.dailyCompleted}/{stats.dailyTotal} done
          </span>
        </div>
        {state.dailyChallenges.length > 0 ? (
          state.dailyChallenges.map((challenge) => (
            <ChallengeCard key={challenge.id} challenge={challenge} />
          ))
        ) : (
          <p className="gamification-challenges__empty">No daily challenges available.</p>
        )}
      </div>

      <div className="gamification-challenges__section">
        <div className="gamification-challenges__section-header">
          <h3 className="gamification-challenges__section-title">📆 Weekly Challenges</h3>
          <span className="gamification-challenges__section-progress">
            {stats.weeklyCompleted}/{stats.weeklyTotal} done
          </span>
        </div>
        {state.weeklyChallenges.length > 0 ? (
          state.weeklyChallenges.map((challenge) => (
            <ChallengeCard key={challenge.id} challenge={challenge} />
          ))
        ) : (
          <p className="gamification-challenges__empty">No weekly challenges available.</p>
        )}
      </div>
    </div>
  );
}
