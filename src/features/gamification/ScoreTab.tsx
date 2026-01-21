import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { GamificationProfile, LevelInfo, XPTransaction } from '../../types/gamification';
import { GamificationHeader } from '../../components/GamificationHeader';
import { XP_TO_POINTS_RATIO } from '../../constants/economy';
import { fetchXPTransactions } from '../../services/gamification';

interface ScoreTabProps {
  session: Session | null;
  profile: GamificationProfile | null;
  levelInfo: LevelInfo | null;
  enabled: boolean;
  loading: boolean;
  onNavigateToAchievements: () => void;
}

export function ScoreTab({
  session,
  profile,
  levelInfo,
  enabled,
  loading,
  onNavigateToAchievements,
}: ScoreTabProps) {
  const formatter = useMemo(() => new Intl.NumberFormat(), []);
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }),
    []
  );
  const xpToNextLevel = levelInfo
    ? Math.max(levelInfo.xpForNextLevel - levelInfo.currentXP, 0)
    : 0;
  const pointsRatioLabel = `1 point per ${Math.round(1 / XP_TO_POINTS_RATIO)} XP`;
  const [transactions, setTransactions] = useState<XPTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const userId = session?.user?.id ?? profile?.user_id ?? '';
  const zenTokens = profile?.zen_tokens ?? 0;

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

  return (
    <section className="score-tab">
      <header className="score-tab__header">
        <div className="score-tab__title">
          <span className="score-tab__badge" aria-hidden="true">🏆</span>
          <div>
            <p className="score-tab__eyebrow">Score hub</p>
            <h2 className="score-tab__headline">Track your daily economy</h2>
          </div>
        </div>
        <p className="score-tab__subtitle">
          Review XP, points, and streak momentum before you spin or shop.
        </p>
      </header>

      {loading && (
        <div className="score-tab__status" role="status">
          Loading your score details...
        </div>
      )}

      {!loading && !enabled && (
        <div className="score-tab__status">
          Gamification is currently disabled. Enable it in settings to track XP and points.
        </div>
      )}

      {!loading && enabled && profile && levelInfo && (
        <div className="score-tab__content">
          <GamificationHeader profile={profile} levelInfo={levelInfo} session={session ?? undefined} />

          <div className="score-tab__grid">
            <article className="score-tab__card score-tab__card--xp">
              <h3 className="score-tab__card-title">XP bank</h3>
              <p className="score-tab__value">{formatter.format(profile.total_xp)} XP</p>
              <p className="score-tab__meta">
                {formatter.format(xpToNextLevel)} XP to level {levelInfo.currentLevel + 1}
              </p>
            </article>

            <article className="score-tab__card score-tab__card--points">
              <div className="score-tab__card-row">
                <h3 className="score-tab__card-title">Points wallet</h3>
                <span className="score-tab__pill">Spendable</span>
              </div>
              <p className="score-tab__value">💎 {formatter.format(profile.total_points)}</p>
              <p className="score-tab__meta">Use points for shop upgrades and trophies.</p>
            </article>

            <article className="score-tab__card">
              <h3 className="score-tab__card-title">Streak momentum</h3>
              <p className="score-tab__value">🔥 {formatter.format(profile.current_streak)} days</p>
              <p className="score-tab__meta">
                Longest streak: {formatter.format(profile.longest_streak)} days
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
              Points are derived from XP ({pointsRatioLabel}). Spin rewards and achievements
              add bonus points on top.
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

      {!loading && enabled && (!profile || !levelInfo) && (
        <div className="score-tab__status">
          No score data yet. Complete a habit or spin the wheel to start earning XP.
        </div>
      )}
    </section>
  );
}
