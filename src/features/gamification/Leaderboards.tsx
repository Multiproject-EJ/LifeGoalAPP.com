// Leaderboards Component - Phase 2 Gamification
// Displays competitive rankings across different categories and time periods

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { LeaderboardEntry, LeaderboardScope, LeaderboardCategory } from '../../types/gamification';
import { getLeaderboard, getUserRank, refreshLeaderboard, checkPrizeDistribution } from '../../services/leaderboards';
import { LeaderboardRow } from './LeaderboardRow';

interface LeaderboardsProps {
  session?: Session;
  onClose?: () => void;
}

const CATEGORY_OPTIONS = [
  { value: 'level' as LeaderboardCategory, label: '🆙 Highest Level', icon: '🆙' },
  { value: 'xp' as LeaderboardCategory, label: '💰 Most XP', icon: '💰' },
  { value: 'streak' as LeaderboardCategory, label: '🔥 Longest Streak', icon: '🔥' },
  { value: 'achievements' as LeaderboardCategory, label: '🏆 Most Achievements', icon: '🏆' },
  { value: 'points' as LeaderboardCategory, label: '💎 Most Points', icon: '💎' },
];

export function Leaderboards({ session, onClose }: LeaderboardsProps) {
  const [scope, setScope] = useState<LeaderboardScope>('all_time');
  const [category, setCategory] = useState<LeaderboardCategory>('xp');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [limit, setLimit] = useState(50);
  
  const userId = session?.user?.id || 'demo_user';
  
  // Check for prize distribution on mount
  useEffect(() => {
    checkPrizeDistribution().catch(console.error);
  }, []);
  
  // Load leaderboard data
  useEffect(() => {
    loadLeaderboard();
  }, [scope, category, limit]);
  
  async function loadLeaderboard() {
    setLoading(true);
    try {
      // Fetch leaderboard entries
      const { data, error } = await getLeaderboard(scope, category, limit);
      if (error) {
        console.error('Error loading leaderboard:', error);
        setEntries([]);
      } else {
        setEntries(data || []);
      }
      
      // Fetch user's rank
      const { data: rank, error: rankError } = await getUserRank(userId, scope, category);
      if (rankError) {
        console.error('Error loading user rank:', rankError);
      } else {
        setUserRank(rank);
      }
    } finally {
      setLoading(false);
    }
  }
  
  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshLeaderboard(scope);
      await loadLeaderboard();
    } finally {
      setRefreshing(false);
    }
  }
  
  function handleLoadMore() {
    setLimit(prev => prev + 50);
  }
  
  const selectedCategory = CATEGORY_OPTIONS.find(opt => opt.value === category);
  const userInTopResults = entries.some(e => e.user_id === userId || e.isCurrentUser);
  const showUserRankCard = userRank && !userInTopResults && userRank.rank !== null && userRank.rank > limit;
  
  return (
    <div className="leaderboards-container">
      {/* Header */}
      <div className="leaderboards-header">
        <div className="leaderboards-header__title">
          <h2>🏆 Leaderboards</h2>
          {onClose && (
            <button 
              className="leaderboards-close-btn"
              onClick={onClose}
              aria-label="Close leaderboards"
            >
              ✕
            </button>
          )}
        </div>
        
        <button
          className="leaderboards-refresh-btn"
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Refresh leaderboard"
        >
          {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
        </button>
      </div>
      
      {/* Scope Tabs */}
      <div className="leaderboards-tabs">
        <button
          className={`leaderboards-tab ${scope === 'all_time' ? 'leaderboards-tab--active' : ''}`}
          onClick={() => setScope('all_time')}
        >
          All-Time
        </button>
        <button
          className={`leaderboards-tab ${scope === 'weekly' ? 'leaderboards-tab--active' : ''}`}
          onClick={() => setScope('weekly')}
        >
          Weekly
        </button>
        <button
          className={`leaderboards-tab ${scope === 'monthly' ? 'leaderboards-tab--active' : ''}`}
          onClick={() => setScope('monthly')}
        >
          Monthly
        </button>
      </div>
      
      {/* Category Selector */}
      <div className="leaderboards-category">
        <label htmlFor="category-select" className="leaderboards-category__label">
          Category:
        </label>
        <select
          id="category-select"
          className="leaderboards-category__select"
          value={category}
          onChange={(e) => setCategory(e.target.value as LeaderboardCategory)}
        >
          {CATEGORY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      
      {/* Leaderboard Table */}
      <div className="leaderboards-table">
        {loading ? (
          <div className="leaderboards-loading">
            <div className="spinner"></div>
            <p>Loading leaderboard...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="leaderboards-empty">
            <p>No entries yet. Be the first to compete!</p>
          </div>
        ) : (
          <>
            <div className="leaderboards-table__header">
              <div className="leaderboards-col leaderboards-col--rank">Rank</div>
              <div className="leaderboards-col leaderboards-col--user">User</div>
              <div className="leaderboards-col leaderboards-col--score">
                {selectedCategory?.icon} Score
              </div>
            </div>
            
            <div className="leaderboards-table__body">
              {entries.map(entry => (
                <LeaderboardRow
                  key={entry.id || entry.user_id}
                  entry={entry}
                  isCurrentUser={entry.user_id === userId || !!entry.isCurrentUser}
                />
              ))}
            </div>
            
            {entries.length >= limit && entries.length % 50 === 0 && (
              <div className="leaderboards-load-more">
                <button
                  className="leaderboards-load-more-btn"
                  onClick={handleLoadMore}
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* User Rank Card (sticky at bottom if outside top results) */}
      {showUserRankCard && (
        <div className="leaderboards-user-rank-card">
          <div className="leaderboards-user-rank-card__content">
            <span className="leaderboards-user-rank-card__label">Your Rank:</span>
            <span className="leaderboards-user-rank-card__rank">#{userRank.rank}</span>
            <span className="leaderboards-user-rank-card__divider">|</span>
            <span className="leaderboards-user-rank-card__score">
              {selectedCategory?.icon} {userRank.score.toLocaleString()}
            </span>
          </div>
        </div>
      )}
      
      {/* Friend Leaderboard Placeholder */}
      <div className="leaderboard-friends-placeholder">
        <p>👥 Friend Leaderboards coming soon!</p>
        <p>Add friends to compete with people you know.</p>
      </div>
    </div>
  );
}
