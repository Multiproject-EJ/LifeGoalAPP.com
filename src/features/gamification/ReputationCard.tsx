import { useEffect, useState } from 'react';
import type { ReputationScore, ReputationTier } from '../../types/gamification';
import { fetchReputationScore } from '../../services/commitmentContracts';
import './ReputationCard.css';

interface ReputationCardProps {
  userId: string;
}

const TIER_CONFIG: Record<ReputationTier, { icon: string; label: string; color: string }> = {
  untested:    { icon: '🔘', label: 'Untested',    color: '#9ca3af' },
  apprentice:  { icon: '⚪', label: 'Apprentice',  color: '#6b7280' },
  dependable:  { icon: '🔵', label: 'Dependable',  color: '#3b82f6' },
  reliable:    { icon: '🟢', label: 'Reliable',    color: '#22c55e' },
  steadfast:   { icon: '🟡', label: 'Steadfast',   color: '#f59e0b' },
  unbreakable: { icon: '🔴', label: 'Unbreakable', color: '#dc2626' },
};

export function ReputationCard({ userId }: ReputationCardProps) {
  const [reputation, setReputation] = useState<ReputationScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      setLoading(true);
      const { data } = await fetchReputationScore(userId);
      setReputation(data);
      setLoading(false);
    };

    void load();
  }, [userId]);

  if (loading) {
    return <div className="reputation-card reputation-card--loading">Loading reputation…</div>;
  }

  if (!reputation || reputation.contractsStarted < 1) {
    return (
      <div className="reputation-card reputation-card--empty">
        <span className="reputation-card__icon">🔘</span>
        <div>
          <p className="reputation-card__tier-label">No reputation yet</p>
          <p className="reputation-card__subtitle">Complete your first contract to build your reliability score.</p>
        </div>
      </div>
    );
  }

  const tier = reputation.reliabilityTier;
  const config = TIER_CONFIG[tier];
  const reliabilityPercent = Math.round(reputation.reliabilityRating * 100);

  return (
    <div className="reputation-card" style={{ '--tier-color': config.color } as React.CSSProperties}>
      <div className="reputation-card__header">
        <span className="reputation-card__icon">{config.icon}</span>
        <div>
          <p className="reputation-card__tier-label">{config.label}</p>
          <p className="reputation-card__reliability">{reliabilityPercent}% Reliability</p>
        </div>
      </div>

      <div className="reputation-card__bar-wrap">
        <div
          className="reputation-card__bar-fill"
          style={{ width: `${reliabilityPercent}%` }}
          role="progressbar"
          aria-valuenow={reliabilityPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      <div className="reputation-card__stats">
        <div className="reputation-card__stat">
          <span className="reputation-card__stat-value">{reputation.contractsCompleted}</span>
          <span className="reputation-card__stat-label">Kept</span>
        </div>
        <div className="reputation-card__stat">
          <span className="reputation-card__stat-value">{reputation.contractsFailed}</span>
          <span className="reputation-card__stat-label">Missed</span>
        </div>
        <div className="reputation-card__stat">
          <span className="reputation-card__stat-value">{reputation.sacredContractsKept}</span>
          <span className="reputation-card__stat-label">Sacred Kept</span>
        </div>
        <div className="reputation-card__stat">
          <span className="reputation-card__stat-value">{reputation.longestContractStreak}</span>
          <span className="reputation-card__stat-label">Longest Streak</span>
        </div>
      </div>

      {reputation.sacredContractsUsedThisYear > 0 && (
        <p className="reputation-card__sacred-note">
          🔱 {reputation.sacredContractsUsedThisYear}/{2} sacred contracts used this year
        </p>
      )}
    </div>
  );
}
