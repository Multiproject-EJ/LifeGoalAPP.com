import { useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { GamificationProfile, LevelInfo } from '../../types/gamification';
import { GamificationHeader } from '../../components/GamificationHeader';
import { XP_TO_POINTS_RATIO } from '../../constants/economy';

interface ScoreTabProps {
  session: Session | null;
  profile: GamificationProfile | null;
  levelInfo: LevelInfo | null;
  enabled: boolean;
  loading: boolean;
}

export function ScoreTab({ session, profile, levelInfo, enabled, loading }: ScoreTabProps) {
  const formatter = useMemo(() => new Intl.NumberFormat(), []);
  const xpToNextLevel = levelInfo
    ? Math.max(levelInfo.xpForNextLevel - levelInfo.currentXP, 0)
    : 0;
  const pointsRatioLabel = `1 point per ${Math.round(1 / XP_TO_POINTS_RATIO)} XP`;

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
                <span className="score-tab__pill score-tab__pill--muted">Coming soon</span>
              </div>
              <p className="score-tab__value">🪷 0</p>
              <p className="score-tab__meta">Earn meditation-only currency for the Zen Garden.</p>
            </article>
          </div>

          <div className="score-tab__note">
            <p>
              Points are derived from XP ({pointsRatioLabel}). Spin rewards and achievements
              add bonus points on top.
            </p>
          </div>
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
