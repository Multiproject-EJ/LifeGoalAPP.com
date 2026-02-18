import type { CommitmentContract, ContractEvaluation } from '../../types/gamification';
import { summarizeContractHistory } from '../../lib/contractHistoryAnalytics';
import { getContractRewardTier, getNextContractRewardTier } from '../../lib/contractRewardMultipliers';

interface ContractHistoryCardProps {
  contract: CommitmentContract;
  evaluations: ContractEvaluation[];
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function ContractHistoryCard({ contract, evaluations }: ContractHistoryCardProps) {
  const summary = summarizeContractHistory(evaluations);
  const currentRewardTier = getContractRewardTier(summary.currentStreak);
  const nextRewardTier = getNextContractRewardTier(summary.currentStreak);

  const witnessSuccessCount =
    contract.accountabilityMode === 'witness'
      ? evaluations.filter((evaluation) => evaluation.result === 'success').length
      : 0;

  if (summary.totalWindows === 0) {
    return (
      <section className="contract-history-card" aria-live="polite">
        <header className="contract-history-card__header">
          <h3 className="contract-history-card__title">Contract History</h3>
          <p className="contract-history-card__subtitle">No completed windows yet.</p>
        </header>
      </section>
    );
  }

  const trendLabel =
    summary.trend === 'improving'
      ? '📈 Improving'
      : summary.trend === 'needs_attention'
        ? '🛟 Needs support'
        : '➖ Steady';

  return (
    <section className="contract-history-card" aria-live="polite">
      <header className="contract-history-card__header">
        <h3 className="contract-history-card__title">Contract History</h3>
        <p className="contract-history-card__subtitle">{contract.title}</p>
      </header>

      <div className="contract-history-card__stats-grid">
        <div className="contract-history-card__stat">
          <span className="contract-history-card__stat-label">Success rate</span>
          <strong className="contract-history-card__stat-value">{formatPercent(summary.successRate)}</strong>
        </div>
        <div className="contract-history-card__stat">
          <span className="contract-history-card__stat-label">Current streak</span>
          <strong className="contract-history-card__stat-value">{summary.currentStreak}</strong>
        </div>
        <div className="contract-history-card__stat">
          <span className="contract-history-card__stat-label">Best streak</span>
          <strong className="contract-history-card__stat-value">{summary.bestStreak}</strong>
        </div>
        <div className="contract-history-card__stat">
          <span className="contract-history-card__stat-label">Trend</span>
          <strong className="contract-history-card__stat-value">{trendLabel}</strong>
        </div>
      </div>

      <div className="contract-history-card__economy">
        <span>Bonuses earned: +{summary.totalBonusAwarded}</span>
        <span>Stake forfeited: -{summary.totalStakeForfeited}</span>
      </div>

      {contract.accountabilityMode === 'witness' && contract.witnessLabel && (
        <div className="contract-history-card__social-proof" aria-live="polite">
          <span className="contract-history-card__social-chip">🤝 Witness: {contract.witnessLabel}</span>
          <span className="contract-history-card__social-chip">✅ Kept with witness: {witnessSuccessCount}/{summary.totalWindows}</span>
        </div>
      )}

      <div className="contract-history-card__reward-tier" aria-live="polite">
        <span>Current reward boost: x{currentRewardTier.multiplier.toFixed(2)} · {currentRewardTier.label}</span>
        {nextRewardTier ? (
          <span>Next at {nextRewardTier.minStreak} streak: x{nextRewardTier.multiplier.toFixed(2)}</span>
        ) : (
          <span>Top tier unlocked — keep the streak alive.</span>
        )}
      </div>

      <ul className="contract-history-card__recent-list">
        {summary.recentEvaluations.map((evaluation) => (
          <li key={evaluation.id} className="contract-history-card__recent-item">
            <span>{formatDate(evaluation.evaluatedAt)}</span>
            <span>
              {evaluation.result === 'success' ? '✅ Kept' : '❌ Missed'} · {evaluation.actualCount}/
              {evaluation.targetCount}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
