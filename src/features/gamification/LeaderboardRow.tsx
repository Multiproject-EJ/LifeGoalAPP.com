// LeaderboardRow Component - Individual leaderboard entry
// Shows rank, username, and score with special styling for top 3

import type { LeaderboardEntry } from '../../types/gamification';

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
}

const RANK_BADGES = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

export function LeaderboardRow({ entry, isCurrentUser }: LeaderboardRowProps) {
  const rank = entry.rank ?? 0;
  const isTopThree = rank > 0 && rank <= 3;
  const badge = isTopThree ? RANK_BADGES[rank as keyof typeof RANK_BADGES] : undefined;
  
  return (
    <div
      className={`leaderboard-row ${isCurrentUser ? 'leaderboard-row--current-user' : ''} ${
        isTopThree ? `leaderboard-row--rank-${rank}` : ''
      }`}
    >
      <div className="leaderboard-row__rank">
        {badge && <span className="leaderboard-row__badge">{badge}</span>}
        <span className="leaderboard-row__rank-number">#{rank > 0 ? rank : '-'}</span>
      </div>
      
      <div className="leaderboard-row__user">
        <span className="leaderboard-row__username">
          {entry.username}
          {isCurrentUser && <span className="leaderboard-row__you-badge">(You)</span>}
        </span>
      </div>
      
      <div className="leaderboard-row__score">
        {entry.score.toLocaleString()}
      </div>
    </div>
  );
}
