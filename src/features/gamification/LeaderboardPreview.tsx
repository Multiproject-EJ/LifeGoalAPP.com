// LeaderboardPreview Component - Mini widget for dashboard
// Shows top 5 leaderboard entries

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { LeaderboardEntry, LeaderboardCategory } from '../../types/gamification';
import { getLeaderboard } from '../../services/leaderboards';

interface LeaderboardPreviewProps {
  session?: Session;
  category?: LeaderboardCategory;
  onViewAll?: () => void;
}

export function LeaderboardPreview({ 
  session, 
  category = 'xp',
  onViewAll 
}: LeaderboardPreviewProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  const userId = session?.user?.id || 'demo_user';
  
  useEffect(() => {
    loadPreview();
  }, [category]);
  
  async function loadPreview() {
    setLoading(true);
    try {
      const { data, error } = await getLeaderboard('all_time', category, 5);
      if (error) {
        console.error('Error loading leaderboard preview:', error);
        setEntries([]);
      } else {
        setEntries(data || []);
      }
    } finally {
      setLoading(false);
    }
  }
  
  if (loading) {
    return (
      <div className="leaderboard-preview">
        <div className="leaderboard-preview__loading">Loading...</div>
      </div>
    );
  }
  
  return (
    <div className="leaderboard-preview">
      <div className="leaderboard-preview__list">
        {entries.map((entry, index) => {
          const isCurrentUser = entry.user_id === userId || entry.isCurrentUser;
          const badge = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
          
          return (
            <div
              key={entry.id || entry.user_id}
              className={`leaderboard-preview__item ${isCurrentUser ? 'leaderboard-preview__item--current' : ''}`}
            >
              <span className="leaderboard-preview__rank">
                {badge || `#${entry.rank}`}
              </span>
              <span className="leaderboard-preview__username">
                {entry.username}
                {isCurrentUser && ' (You)'}
              </span>
              <span className="leaderboard-preview__score">
                {entry.score.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
      
      {onViewAll && (
        <button className="leaderboard-preview__view-all" onClick={onViewAll}>
          View Full Leaderboard
        </button>
      )}
    </div>
  );
}
