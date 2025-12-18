import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { AchievementWithProgress } from '../../types/gamification';
import {
  fetchAchievementsWithProgress,
  getAchievementStats,
  getNextAchievement,
  type AchievementStats,
} from '../../services/achievements';
import { AchievementGrid } from './AchievementGrid';
import { AchievementFilters } from './AchievementFilters';
import { AchievementDetailModal } from './AchievementDetailModal';
import { useGamification } from '../../hooks/useGamification';
import './AchievementsPage.css';

type Props = {
  session: Session;
};

export function AchievementsPage({ session }: Props) {
  const { enabled: gamificationEnabled } = useGamification(session);
  const [achievements, setAchievements] = useState<AchievementWithProgress[]>([]);
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementWithProgress | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [filterTier, setFilterTier] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAchievements();
  }, [session.user.id]);

  const loadAchievements = async () => {
    setLoading(true);
    setError(null);

    try {
      const [{ data: achievementsData, error: achievementsError }, { data: statsData, error: statsError }] =
        await Promise.all([
          fetchAchievementsWithProgress(session.user.id),
          getAchievementStats(session.user.id),
        ]);

      if (achievementsError) throw achievementsError;
      if (statsError) throw statsError;

      setAchievements(achievementsData || []);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  const filteredAchievements = achievements.filter(achievement => {
    // Status filter
    if (filterStatus === 'unlocked' && !achievement.unlocked) return false;
    if (filterStatus === 'locked' && achievement.unlocked) return false;

    // Tier filter
    if (filterTier && achievement.tier !== filterTier) return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = achievement.name.toLowerCase().includes(query);
      const matchesDescription = achievement.description.toLowerCase().includes(query);
      if (!matchesName && !matchesDescription) return false;
    }

    return true;
  });

  const nextAchievement = getNextAchievement(achievements);

  if (!gamificationEnabled) {
    return (
      <div className="achievements-page">
        <div className="achievements-page__disabled">
          <p>🎮 Gamification is disabled. Enable it in Settings to view achievements.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="achievements-page">
        <div className="achievements-page__loading">Loading achievements...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="achievements-page">
        <div className="achievements-page__error">
          <p>❌ {error}</p>
          <button onClick={loadAchievements}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="achievements-page">
      <header className="achievements-page__header">
        <div className="achievements-page__title">
          <h1>🏆 Your Achievements</h1>
          <p className="achievements-page__subtitle">
            {stats ? `${stats.unlocked}/${stats.total} unlocked` : ''}
          </p>
        </div>
      </header>

      {stats && (
        <div className="achievements-page__stats">
          <div className="achievements-stats">
            <div className="achievements-stats__progress">
              <div className="achievements-stats__progress-bar">
                <div
                  className="achievements-stats__progress-fill"
                  style={{ width: `${stats.percentComplete}%` }}
                />
              </div>
              <p className="achievements-stats__progress-text">{stats.percentComplete}% Complete</p>
            </div>

            <div className="achievements-stats__tiers">
              <div className="achievements-stats__tier">
                <span className="achievements-stats__tier-icon">🥉</span>
                <span className="achievements-stats__tier-count">
                  {stats.tierCounts.bronze.unlocked}/{stats.tierCounts.bronze.total}
                </span>
                <span className="achievements-stats__tier-label">Bronze</span>
              </div>
              <div className="achievements-stats__tier">
                <span className="achievements-stats__tier-icon">🥈</span>
                <span className="achievements-stats__tier-count">
                  {stats.tierCounts.silver.unlocked}/{stats.tierCounts.silver.total}
                </span>
                <span className="achievements-stats__tier-label">Silver</span>
              </div>
              <div className="achievements-stats__tier">
                <span className="achievements-stats__tier-icon">🥇</span>
                <span className="achievements-stats__tier-count">
                  {stats.tierCounts.gold.unlocked}/{stats.tierCounts.gold.total}
                </span>
                <span className="achievements-stats__tier-label">Gold</span>
              </div>
              <div className="achievements-stats__tier">
                <span className="achievements-stats__tier-icon">💎</span>
                <span className="achievements-stats__tier-count">
                  {stats.tierCounts.diamond.unlocked}/{stats.tierCounts.diamond.total}
                </span>
                <span className="achievements-stats__tier-label">Diamond</span>
              </div>
            </div>

            <div className="achievements-stats__rewards">
              <div className="achievements-stats__reward">
                <span className="achievements-stats__reward-value">{stats.totalXPEarned.toLocaleString()}</span>
                <span className="achievements-stats__reward-label">Total XP Earned</span>
              </div>
              <div className="achievements-stats__reward">
                <span className="achievements-stats__reward-value">{stats.totalPointsEarned.toLocaleString()}</span>
                <span className="achievements-stats__reward-label">Total Points Earned</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {nextAchievement && !nextAchievement.unlocked && (
        <div className="achievements-page__next">
          <div className="achievements-next">
            <p className="achievements-next__label">💡 Next Achievement</p>
            <p className="achievements-next__name">{nextAchievement.icon} {nextAchievement.name}</p>
            <p className="achievements-next__progress">
              {nextAchievement.progress}/{nextAchievement.requirement_value} •{' '}
              {nextAchievement.requirement_value - nextAchievement.progress} to go!
            </p>
          </div>
        </div>
      )}

      <AchievementFilters
        filterStatus={filterStatus}
        filterTier={filterTier}
        searchQuery={searchQuery}
        onFilterStatusChange={setFilterStatus}
        onFilterTierChange={setFilterTier}
        onSearchQueryChange={setSearchQuery}
      />

      <AchievementGrid
        achievements={filteredAchievements}
        onAchievementClick={setSelectedAchievement}
      />

      {selectedAchievement && (
        <AchievementDetailModal
          achievement={selectedAchievement}
          onClose={() => setSelectedAchievement(null)}
        />
      )}
    </div>
  );
}
