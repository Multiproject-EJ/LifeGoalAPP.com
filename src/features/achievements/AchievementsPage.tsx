import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { AchievementWithProgress, TrophyItem, UserTrophy } from '../../types/gamification';
import {
  fetchAchievementsWithProgress,
  getAchievementStats,
  getNextAchievement,
  type AchievementStats,
} from '../../services/achievements';
import { fetchGamificationProfile } from '../../services/gamificationPrefs';
import { fetchTrophyCatalog, fetchUserTrophies, purchaseTrophy } from '../../services/trophies';
import { fetchZenGardenInventory, purchaseZenGardenItem } from '../../services/zenGarden';
import { ZEN_GARDEN_ITEMS, type ZenGardenItem } from '../../constants/zenGarden';
import { AchievementGrid } from './AchievementGrid';
import { AchievementFilters } from './AchievementFilters';
import { AchievementDetailModal } from './AchievementDetailModal';
import { TrophyCase } from './TrophyCase';
import { TrophyPurchaseModal } from './TrophyPurchaseModal';
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
  const [trophies, setTrophies] = useState<TrophyItem[]>([]);
  const [ownedTrophies, setOwnedTrophies] = useState<UserTrophy[]>([]);
  const [trophyLoading, setTrophyLoading] = useState(true);
  const [trophyError, setTrophyError] = useState<string | null>(null);
  const [goldBalance, setGoldBalance] = useState(0);
  const [selectedTrophy, setSelectedTrophy] = useState<TrophyItem | null>(null);
  const [trophyMessage, setTrophyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [zenBalance, setZenBalance] = useState(0);
  const [zenInventory, setZenInventory] = useState<string[]>([]);
  const [zenPurchaseError, setZenPurchaseError] = useState<string | null>(null);
  const [zenPurchaseSuccess, setZenPurchaseSuccess] = useState<string | null>(null);
  const [zenPurchasingId, setZenPurchasingId] = useState<string | null>(null);
  const [zenLoadError, setZenLoadError] = useState<string | null>(null);

  const unlockedTiers = achievements
    .filter((achievement) => achievement.unlocked)
    .map((achievement) => achievement.tier);
  const qualifiesForTier = (tier?: TrophyItem['requiredTier']) =>
    !tier || unlockedTiers.includes(tier);

  useEffect(() => {
    loadAchievements();
    loadTrophyCase();
    loadZenGardenData();
  }, [session.user.id]);

  const loadZenGardenData = async () => {
    setZenLoadError(null);
    try {
      const profileResult = await fetchGamificationProfile(session.user.id);
      if (profileResult.data) {
        setZenBalance(profileResult.data.zen_tokens ?? 0);
      }

      const inventoryResult = await fetchZenGardenInventory(session.user.id);
      if (inventoryResult.data) {
        setZenInventory(inventoryResult.data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load zen garden data';
      setZenLoadError(errorMessage);
      console.error('Failed to load zen garden data:', err);
    }
  };

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

  const loadTrophyCase = async () => {
    setTrophyLoading(true);
    setTrophyError(null);

    try {
      const [
        { data: catalogData, error: catalogError },
        { data: userTrophiesData, error: userTrophiesError },
        { data: profile, error: profileError },
      ] = await Promise.all([
        fetchTrophyCatalog(),
        fetchUserTrophies(session.user.id),
        fetchGamificationProfile(session.user.id),
      ]);

      if (catalogError) throw catalogError;
      if (userTrophiesError) throw userTrophiesError;
      if (profileError) throw profileError;

      setTrophies(catalogData || []);
      setOwnedTrophies(userTrophiesData || []);
      setGoldBalance(profile?.total_points || 0);
    } catch (err) {
      setTrophyError(err instanceof Error ? err.message : 'Failed to load trophy case');
    } finally {
      setTrophyLoading(false);
    }
  };

  const handleTrophyPurchase = (trophy: TrophyItem) => {
    if (!qualifiesForTier(trophy.requiredTier)) {
      setTrophyMessage({
        type: 'error',
        text: `Unlock a ${trophy.requiredTier ?? 'new'} achievement to buy this reward.`,
      });
      return;
    }
    setSelectedTrophy(trophy);
  };

  const confirmTrophyPurchase = async () => {
    if (!selectedTrophy) return;

    setIsPurchasing(true);
    setTrophyMessage(null);

    try {
      const { data, error } = await purchaseTrophy(
        session.user.id,
        selectedTrophy.id,
        qualifiesForTier(selectedTrophy.requiredTier)
      );

      if (error) throw error;

      setTrophyMessage({
        type: 'success',
        text: `${selectedTrophy.name} unlocked and added to your trophy case!`,
      });
      setGoldBalance(data?.newGoldBalance ?? goldBalance);
      setSelectedTrophy(null);
      await loadTrophyCase();
    } catch (err) {
      setTrophyMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to unlock this accolade',
      });
      setSelectedTrophy(null);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleZenItemPurchase = async (item: ZenGardenItem) => {
    if (zenBalance < item.cost) {
      return;
    }

    setZenPurchasingId(item.id);
    setZenPurchaseError(null);
    setZenPurchaseSuccess(null);

    try {
      const { data, error } = await purchaseZenGardenItem(
        session.user.id,
        item.id,
        item.name,
        item.cost
      );

      if (error) throw error;

      setZenBalance(data?.balance ?? 0);
      setZenInventory(data?.inventory ?? []);
      setZenPurchaseSuccess(`${item.name} unlocked!`);
      
      setTimeout(() => setZenPurchaseSuccess(null), 3000);
    } catch (err) {
      setZenPurchaseError(err instanceof Error ? err.message : 'Purchase failed');
      setTimeout(() => setZenPurchaseError(null), 3000);
    } finally {
      setZenPurchasingId(null);
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
          <p>🎮 Game of Life is disabled. Enable it in Settings to view achievements.</p>
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

      <TrophyCase
        trophies={trophies}
        ownedTrophies={ownedTrophies}
        currentGold={goldBalance}
        unlockedTiers={unlockedTiers}
        isLoading={trophyLoading}
        error={trophyError}
        message={trophyMessage}
        onRetry={loadTrophyCase}
        onPurchase={handleTrophyPurchase}
      />

      <section className="achievements-page__zen-garden">
        <div className="achievements-page__zen-header">
          <div>
            <h2 className="achievements-page__zen-title">🪷 Zen Garden Unlocks</h2>
            <p className="achievements-page__zen-subtitle">
              Meditation-only rewards • Use Zen Tokens to unlock peaceful garden elements
            </p>
          </div>
          <div className="achievements-page__zen-balance">
            <span className="achievements-page__zen-balance-value">🪷 {zenBalance}</span>
            <span className="achievements-page__zen-balance-label">Zen Tokens</span>
          </div>
        </div>

        {zenLoadError && (
          <div className="achievements-page__message achievements-page__message--error">
            {zenLoadError}
          </div>
        )}
        {zenPurchaseError && (
          <div className="achievements-page__message achievements-page__message--error">
            {zenPurchaseError}
          </div>
        )}
        {zenPurchaseSuccess && (
          <div className="achievements-page__message achievements-page__message--success">
            {zenPurchaseSuccess}
          </div>
        )}

        <div className="achievements-page__zen-grid">
          {ZEN_GARDEN_ITEMS.map((item) => {
            const owned = zenInventory.includes(item.id);
            const canAfford = zenBalance >= item.cost;
            const isPurchasing = zenPurchasingId === item.id;

            return (
              <article
                key={item.id}
                className={`achievements-page__zen-card${owned ? ' achievements-page__zen-card--owned' : ''}`}
              >
                <div className="achievements-page__zen-card-icon">{item.emoji}</div>
                <h3 className="achievements-page__zen-card-title">{item.name}</h3>
                <p className="achievements-page__zen-card-description">{item.description}</p>
                <div className="achievements-page__zen-card-footer">
                  <span className="achievements-page__zen-card-cost">🪷 {item.cost}</span>
                  <button
                    type="button"
                    className="achievements-page__zen-card-button"
                    disabled={owned || !canAfford || isPurchasing}
                    onClick={() => handleZenItemPurchase(item)}
                  >
                    {owned ? 'Unlocked' : isPurchasing ? 'Purchasing...' : 'Unlock'}
                  </button>
                </div>
                {!owned && !canAfford && (
                  <span className="achievements-page__zen-card-lock">Earn more Zen Tokens</span>
                )}
              </article>
            );
          })}
        </div>
      </section>

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

      {selectedTrophy && (
        <TrophyPurchaseModal
          trophy={selectedTrophy}
          currentGold={goldBalance}
          isProcessing={isPurchasing}
          onConfirm={confirmTrophyPurchase}
          onCancel={() => setSelectedTrophy(null)}
        />
      )}

      {selectedAchievement && (
        <AchievementDetailModal
          achievement={selectedAchievement}
          onClose={() => setSelectedAchievement(null)}
        />
      )}
    </div>
  );
}
