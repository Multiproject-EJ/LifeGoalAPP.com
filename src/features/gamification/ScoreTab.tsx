import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import type {
  GamificationProfile,
  LevelInfo,
  RewardItem,
  RewardRedemption,
  XPTransaction,
} from '../../types/gamification';
import { GamificationHeader } from '../../components/GamificationHeader';
import { XP_TO_GOLD_RATIO, splitGoldBalance } from '../../constants/economy';
import { fetchXPTransactions } from '../../services/gamification';
import { createReward, fetchRewardCatalog, fetchRewardRedemptions, redeemReward } from '../../services/rewards';
import scoreAchievements from '../../assets/Score_achievements.webp';
import scoreBank from '../../assets/score_Bank.webp';
import scoreShop from '../../assets/Score_shop.webp';
import scoreZenGarden from '../../assets/Score_zengarden.webp';

interface ScoreTabProps {
  session: Session | null;
  profile: GamificationProfile | null;
  levelInfo: LevelInfo | null;
  enabled: boolean;
  loading: boolean;
  onNavigateToAchievements: () => void;
  onNavigateToBank?: () => void;
  onNavigateToShop?: () => void;
}

export function ScoreTab({
  session,
  profile,
  levelInfo,
  enabled,
  loading,
  onNavigateToAchievements,
  onNavigateToBank,
  onNavigateToShop,
}: ScoreTabProps) {
  const formatter = useMemo(() => new Intl.NumberFormat(), []);
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }),
    []
  );
  const xpToNextLevel = levelInfo
    ? Math.max(levelInfo.xpForNextLevel - levelInfo.currentXP, 0)
    : 0;
  const goldRatioLabel = `1 gold per ${Math.round(1 / XP_TO_GOLD_RATIO)} XP`;
  const [activeTab, setActiveTab] = useState<'home' | 'bank' | 'shop' | 'zen'>('home');
  const [transactions, setTransactions] = useState<XPTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [rewardLoading, setRewardLoading] = useState(false);
  const [rewardError, setRewardError] = useState<string | null>(null);
  const [rewardMessage, setRewardMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardDescription, setRewardDescription] = useState('');
  const [rewardCost, setRewardCost] = useState('');
  const [rewardSubmitting, setRewardSubmitting] = useState(false);
  const [redemptionSubmitting, setRedemptionSubmitting] = useState<string | null>(null);
  const userId = session?.user?.id ?? profile?.user_id ?? '';
  const zenTokens = profile?.zen_tokens ?? 0;
  const [goldBalance, setGoldBalance] = useState(profile?.total_points ?? 0);

  useEffect(() => {
    setGoldBalance(profile?.total_points ?? 0);
  }, [profile?.total_points]);

  useEffect(() => {
    let isMounted = true;

    const loadTransactions = async () => {
      if (!enabled || !userId) {
        setTransactions([]);
        setTransactionsError(null);
        return;
      }

      setTransactionsLoading(true);
      const { data, error } = await fetchXPTransactions(userId, 8);
      if (!isMounted) return;
      setTransactions(data);
      setTransactionsError(error);
      setTransactionsLoading(false);
    };

    loadTransactions();

    if (typeof window === 'undefined') return () => undefined;

    const handleSpinComplete = () => {
      loadTransactions();
    };

    window.addEventListener('dailySpinComplete', handleSpinComplete);

    return () => {
      isMounted = false;
      window.removeEventListener('dailySpinComplete', handleSpinComplete);
    };
  }, [enabled, userId, profile?.total_xp]);

  const sourceChips = useMemo(() => {
    const tally = transactions.reduce<Record<string, { label: string; count: number; xp: number }>>(
      (acc, transaction) => {
        const sourceKey = transaction.source_type || 'other';
        const labelMap: Record<string, string> = {
          habit_complete: 'Habits',
          habit_complete_early: 'Habits',
          all_daily_habits: 'Habits',
          goal_milestone: 'Goals',
          goal_complete: 'Goals',
          journal_entry: 'Journal',
          meditation_session: 'Meditation',
          breathing_session: 'Breathing',
          daily_spin: 'Spin',
          daily_spin_wheel: 'Spin',
          daily_login: 'Spin',
          streak_milestone: 'Streaks',
          challenge_complete: 'Challenges',
        };
        const label = labelMap[sourceKey] ?? sourceKey.replace(/_/g, ' ');
        const bucket = acc[sourceKey] ?? { label, count: 0, xp: 0 };
        bucket.count += 1;
        bucket.xp += transaction.xp_amount;
        acc[sourceKey] = bucket;
        return acc;
      },
      {}
    );

    return Object.values(tally).sort((a, b) => b.xp - a.xp);
  }, [transactions]);

  const profileWithGold = useMemo(() => {
    if (!profile) return null;
    return { ...profile, total_points: goldBalance };
  }, [profile, goldBalance]);
  const goldBreakdown = useMemo(() => splitGoldBalance(goldBalance), [goldBalance]);
  const goldValueLabel =
    goldBreakdown.diamonds > 0
      ? `💎 ${formatter.format(goldBreakdown.diamonds)} · 🪙 ${formatter.format(goldBreakdown.goldRemainder)}`
      : `🪙 ${formatter.format(goldBreakdown.goldRemainder)}`;

  useEffect(() => {
    if (activeTab !== 'shop' || !enabled || !userId) {
      return;
    }

    let isMounted = true;
    const loadRewards = async () => {
      setRewardLoading(true);
      const [{ data: rewardData, error: rewardCatalogError }, { data: redemptionData, error: redemptionError }] =
        await Promise.all([fetchRewardCatalog(userId), fetchRewardRedemptions(userId)]);

      if (!isMounted) return;

      setRewards(rewardData ?? []);
      setRedemptions(redemptionData ?? []);
      setRewardError(rewardCatalogError?.message || redemptionError?.message || null);
      setRewardLoading(false);
    };

    loadRewards();

    return () => {
      isMounted = false;
    };
  }, [activeTab, enabled, userId]);

  const handleCreateReward = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) return;

    const cost = Number(rewardCost);
    if (!rewardTitle.trim() || !cost || cost < 1) {
      setRewardMessage({
        type: 'error',
        text: 'Add a reward title and a gold cost of at least 1.',
      });
      return;
    }

    setRewardSubmitting(true);
    const { data, error } = await createReward(userId, {
      title: rewardTitle.trim(),
      description: rewardDescription.trim(),
      costGold: cost,
    });

    if (error || !data) {
      setRewardMessage({ type: 'error', text: error?.message ?? 'Unable to create reward.' });
    } else {
      setRewards((current) => [...current, data]);
      setRewardTitle('');
      setRewardDescription('');
      setRewardCost('');
      setRewardMessage({ type: 'success', text: `"${data.title}" is ready to redeem.` });
    }

    setRewardSubmitting(false);
  };

  const handleRedeemReward = async (rewardId: string) => {
    if (!userId) return;
    setRedemptionSubmitting(rewardId);
    const { data, error } = await redeemReward(userId, rewardId);

    if (error || !data) {
      setRewardMessage({ type: 'error', text: error?.message ?? 'Unable to redeem reward.' });
    } else {
      setGoldBalance(data.newGoldBalance);
      setRewards((current) =>
        current.map((reward) => (reward.id === rewardId ? data.reward : reward))
      );
      setRedemptions((current) => [data.redemption, ...current].slice(0, 12));
      setRewardMessage({
        type: 'success',
        text: `Redeemed "${data.reward.title}". Enjoy your reward!`,
      });
    }

    setRedemptionSubmitting(null);
  };

  return (
    <section className="score-tab">
      <header className="score-tab__header">
        <div className="score-tab__title">
          <span className="score-tab__badge" aria-hidden="true">🏆</span>
          <div>
            <p className="score-tab__eyebrow">Score hub</p>
            <h2 className="score-tab__headline">Score hub</h2>
          </div>
        </div>
        <div className="score-tab__tabs" aria-label="Score shortcuts">
          <button
            type="button"
            className={`score-tab__tab${activeTab === 'home' ? ' score-tab__tab--active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            Hub
          </button>
          <button
            type="button"
            className="score-tab__tab score-tab__tab--primary"
            onClick={onNavigateToAchievements}
          >
            Achievements
          </button>
          <button
            type="button"
            className={`score-tab__tab${activeTab === 'bank' ? ' score-tab__tab--active' : ''}`}
            onClick={() => {
              setActiveTab('bank');
              onNavigateToBank?.();
            }}
          >
            <span className="score-tab__tab-icon" aria-hidden="true">🏦</span>
            Bank
          </button>
          <button
            type="button"
            className={`score-tab__tab${activeTab === 'shop' ? ' score-tab__tab--active' : ''}`}
            onClick={() => {
              setActiveTab('shop');
              onNavigateToShop?.();
            }}
          >
            <span className="score-tab__tab-icon" aria-hidden="true">🛍️</span>
            Player Shop
          </button>
          <button
            type="button"
            className={`score-tab__tab${activeTab === 'zen' ? ' score-tab__tab--active' : ''}`}
            onClick={() => setActiveTab('zen')}
          >
            <span className="score-tab__tab-icon" aria-hidden="true">🪷</span>
            Zen Garden
          </button>
        </div>
      </header>

      {activeTab === 'home' && (
        <div className="score-tab__hub">
          <button type="button" className="score-tab__hub-card" onClick={onNavigateToAchievements}>
            <span className="score-tab__hub-visual" aria-hidden="true">
              <img className="score-tab__hub-image" src={scoreAchievements} alt="" />
            </span>
            <span className="score-tab__hub-title">Achievements</span>
          </button>
          <button
            type="button"
            className="score-tab__hub-card"
            onClick={() => {
              setActiveTab('bank');
              onNavigateToBank?.();
            }}
          >
            <span className="score-tab__hub-visual" aria-hidden="true">
              <img className="score-tab__hub-image" src={scoreBank} alt="" />
            </span>
            <span className="score-tab__hub-title">Bank</span>
          </button>
          <button
            type="button"
            className="score-tab__hub-card"
            onClick={() => {
              setActiveTab('shop');
              onNavigateToShop?.();
            }}
          >
            <span className="score-tab__hub-visual" aria-hidden="true">
              <img className="score-tab__hub-image" src={scoreShop} alt="" />
            </span>
            <span className="score-tab__hub-title">Player Shop</span>
          </button>
          <button type="button" className="score-tab__hub-card" onClick={() => setActiveTab('zen')}>
            <span className="score-tab__hub-visual" aria-hidden="true">
              <img className="score-tab__hub-image" src={scoreZenGarden} alt="" />
            </span>
            <span className="score-tab__hub-title">Zen Garden</span>
          </button>
        </div>
      )}

      {loading && (
        <div className="score-tab__status" role="status">
          Loading your score details...
        </div>
      )}

      {!loading && !enabled && (
        <div className="score-tab__status">
          Gamification is currently disabled. Enable it in settings to track XP and gold.
        </div>
      )}

      {!loading && enabled && profileWithGold && levelInfo && activeTab === 'bank' && (
        <div className="score-tab__content">
          <div className="score-tab__bank-intro">
            <h2 className="score-tab__headline">Track your daily economy</h2>
            <p className="score-tab__subtitle">
              Review XP, gold, and streak momentum before you spin or visit the player shop.
            </p>
          </div>
          <GamificationHeader
            profile={profileWithGold}
            levelInfo={levelInfo}
            session={session ?? undefined}
          />

          <div className="score-tab__grid">
            <article className="score-tab__card score-tab__card--xp">
              <h3 className="score-tab__card-title">XP bank</h3>
              <p className="score-tab__value">{formatter.format(profileWithGold.total_xp)} XP</p>
              <p className="score-tab__meta">
                {formatter.format(xpToNextLevel)} XP to level {levelInfo.currentLevel + 1}
              </p>
            </article>

            <article className="score-tab__card score-tab__card--points">
              <div className="score-tab__card-row">
                <h3 className="score-tab__card-title">Gold wallet</h3>
                <span className="score-tab__pill">Spendable</span>
              </div>
              <p className="score-tab__value">{goldValueLabel}</p>
              <p className="score-tab__meta">Use gold for shop upgrades and trophies.</p>
            </article>

            <article className="score-tab__card">
              <h3 className="score-tab__card-title">Streak momentum</h3>
              <p className="score-tab__value">🔥 {formatter.format(profileWithGold.current_streak)} days</p>
              <p className="score-tab__meta">
                Longest streak: {formatter.format(profileWithGold.longest_streak)} days
              </p>
            </article>

            <article className="score-tab__card score-tab__card--zen">
              <div className="score-tab__card-row">
                <h3 className="score-tab__card-title">Zen tokens</h3>
                <span className="score-tab__pill score-tab__pill--muted">Meditation-only</span>
              </div>
              <p className="score-tab__value">🪷 {formatter.format(zenTokens)}</p>
              <p className="score-tab__meta">Earn through meditation sessions for Zen Garden unlocks.</p>
            </article>
          </div>

          <div className="score-tab__note">
            <p>
              Gold is derived from XP ({goldRatioLabel}). Spin rewards and achievements
              add bonus gold on top.
            </p>
            <button
              type="button"
              className="score-tab__link"
              onClick={onNavigateToAchievements}
            >
              View achievements
            </button>
          </div>

          <section className="score-tab__ledger">
            <div className="score-tab__ledger-header">
              <div>
                <p className="score-tab__eyebrow">Recent activity</p>
                <h3 className="score-tab__ledger-title">XP sources this week</h3>
              </div>
              <span className="score-tab__ledger-pill">Ledger</span>
            </div>

            {transactionsLoading && (
              <p className="score-tab__ledger-status">Loading your activity...</p>
            )}

            {!transactionsLoading && transactionsError && (
              <p className="score-tab__ledger-status">{transactionsError}</p>
            )}

            {!transactionsLoading && !transactionsError && sourceChips.length > 0 && (
              <div className="score-tab__ledger-chips">
                {sourceChips.map((chip) => (
                  <div key={chip.label} className="score-tab__ledger-chip">
                    <span className="score-tab__ledger-chip-label">{chip.label}</span>
                    <span className="score-tab__ledger-chip-meta">
                      +{formatter.format(chip.xp)} XP · {chip.count}x
                    </span>
                  </div>
                ))}
              </div>
            )}

            {!transactionsLoading && !transactionsError && sourceChips.length === 0 && (
              <p className="score-tab__ledger-status">
                No recent XP activity yet. Complete a habit or spin the wheel to get started.
              </p>
            )}

            {!transactionsLoading && transactions.length > 0 && (
              <div className="score-tab__ledger-list">
                {transactions.slice(0, 4).map((transaction) => (
                  <div key={transaction.id} className="score-tab__ledger-row">
                    <div>
                      <p className="score-tab__ledger-row-title">
                        {transaction.description || transaction.source_type.replace(/_/g, ' ')}
                      </p>
                      <p className="score-tab__ledger-row-meta">
                        {dateFormatter.format(new Date(transaction.created_at))}
                      </p>
                    </div>
                    <span className="score-tab__ledger-row-value">
                      +{formatter.format(transaction.xp_amount)} XP
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {!loading && enabled && activeTab === 'bank' && (!profile || !levelInfo) && (
        <div className="score-tab__status">
          No score data yet. Complete a habit or spin the wheel to start earning XP.
        </div>
      )}

      {!loading && enabled && activeTab === 'shop' && (
        <div className="score-tab__content score-tab__content--shop">
          <div className="score-tab__shop-header">
            <div>
              <h2 className="score-tab__headline">Player Shop</h2>
              <p className="score-tab__subtitle">
                Create rewards you actually want, then redeem them with your gold.
              </p>
            </div>
            <div className="score-tab__shop-balance">
              <span className="score-tab__shop-balance-label">Gold balance</span>
              <strong className="score-tab__shop-balance-value">{goldValueLabel}</strong>
            </div>
          </div>

          {rewardMessage && (
            <div className={`score-tab__shop-message score-tab__shop-message--${rewardMessage.type}`}>
              {rewardMessage.text}
            </div>
          )}

          <form className="score-tab__reward-form" onSubmit={handleCreateReward}>
            <div className="score-tab__reward-form-grid">
              <label className="score-tab__reward-field">
                <span>Reward name</span>
                <input
                  type="text"
                  value={rewardTitle}
                  onChange={(event) => setRewardTitle(event.target.value)}
                  placeholder="Coffee break, game session, chill playlist..."
                  maxLength={40}
                  required
                />
              </label>
              <label className="score-tab__reward-field">
                <span>Description (optional)</span>
                <input
                  type="text"
                  value={rewardDescription}
                  onChange={(event) => setRewardDescription(event.target.value)}
                  placeholder="Keep it short and motivating."
                  maxLength={80}
                />
              </label>
              <label className="score-tab__reward-field score-tab__reward-field--cost">
                <span>Gold cost</span>
                <input
                  type="number"
                  min={1}
                  value={rewardCost}
                  onChange={(event) => setRewardCost(event.target.value)}
                  placeholder="50"
                  required
                />
              </label>
            </div>
            <button
              type="submit"
              className="score-tab__reward-submit"
              disabled={rewardSubmitting}
            >
              {rewardSubmitting ? 'Saving...' : 'Add reward'}
            </button>
          </form>

          {rewardLoading && <p className="score-tab__shop-status">Loading your rewards...</p>}
          {!rewardLoading && rewardError && <p className="score-tab__shop-status">{rewardError}</p>}

          {!rewardLoading && !rewardError && rewards.length === 0 && (
            <p className="score-tab__shop-status">
              No custom rewards yet. Add your first treat to start redeeming.
            </p>
          )}

          {!rewardLoading && rewards.length > 0 && (
            <div className="score-tab__reward-grid">
              {rewards.map((reward) => {
                const canAfford = goldBalance >= reward.costGold;
                const isRedeeming = redemptionSubmitting === reward.id;
                return (
                  <div key={reward.id} className="score-tab__reward-card">
                    <div className="score-tab__reward-card-header">
                      <h3>{reward.title}</h3>
                      <span className="score-tab__reward-cost">🪙 {formatter.format(reward.costGold)}</span>
                    </div>
                    {reward.description && <p className="score-tab__reward-description">{reward.description}</p>}
                    <div className="score-tab__reward-meta">
                      <span>Redeemed {reward.redemptionCount}x</span>
                      {reward.lastRedeemedAt && (
                        <span>Last: {dateFormatter.format(new Date(reward.lastRedeemedAt))}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="score-tab__reward-redeem"
                      onClick={() => handleRedeemReward(reward.id)}
                      disabled={!canAfford || isRedeeming}
                    >
                      {isRedeeming ? 'Redeeming...' : canAfford ? 'Redeem' : 'Need more gold'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="score-tab__reward-history">
            <h3>Recent redemptions</h3>
            {redemptions.length === 0 ? (
              <p>Redeem a reward to see your latest wins here.</p>
            ) : (
              <ul>
                {redemptions.slice(0, 4).map((entry) => (
                  <li key={entry.id}>
                    <span>{entry.rewardTitle}</span>
                    <span>
                      -{formatter.format(entry.costGold)} gold ·{' '}
                      {dateFormatter.format(new Date(entry.redeemedAt))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {!loading && enabled && activeTab === 'zen' && (
        <div className="score-tab__status">
          Zen Garden is ready for calm upgrades. This space is open for your future build.
        </div>
      )}
    </section>
  );
}
