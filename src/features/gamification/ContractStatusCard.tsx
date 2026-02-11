import { useMemo } from 'react';
import type { CommitmentContract } from '../../types/gamification';

interface ContractStatusCardProps {
  contract: CommitmentContract;
  onMarkProgress: () => void;
  onPause: () => void;
  onCancel: () => void;
}

export function ContractStatusCard({
  contract,
  onMarkProgress,
  onPause,
  onCancel,
}: ContractStatusCardProps) {
  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    return Math.min(100, (contract.currentProgress / contract.targetCount) * 100);
  }, [contract.currentProgress, contract.targetCount]);

  // Calculate cooling-off countdown
  const coolingOffRemaining = useMemo(() => {
    if (contract.status !== 'active') return null;
    
    const createdAt = new Date(contract.createdAt).getTime();
    const coolingOffEnd = createdAt + contract.coolingOffHours * 60 * 60 * 1000;
    const now = Date.now();
    
    if (now >= coolingOffEnd) return null;
    
    const remainingMs = coolingOffEnd - now;
    const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
    return remainingHours;
  }, [contract.createdAt, contract.coolingOffHours, contract.status]);

  // Get warm copy based on progress
  const statusMessage = useMemo(() => {
    const remaining = contract.targetCount - contract.currentProgress;
    
    if (remaining <= 0) {
      return "Amazing! You've hit your target for this window";
    }
    
    if (contract.currentProgress >= contract.targetCount / 2) {
      return `You've got this — ${remaining} more to go`;
    }
    
    if (contract.currentProgress > 0) {
      return `Strong start — ${contract.currentProgress} completions so far`;
    }
    
    if (contract.graceDays > 0) {
      return "You have grace days — one miss won't break you";
    }
    
    return `Get started — complete ${contract.targetCount} this ${contract.cadence}`;
  }, [contract.currentProgress, contract.targetCount, contract.cadence, contract.graceDays]);

  return (
    <div className="contract-status-card">
      <div className="contract-status-card__header">
        <h3 className="contract-status-card__title">{contract.title}</h3>
        <span className="contract-status-card__stake-badge">
          {contract.stakeAmount} {contract.stakeType === 'gold' ? 'Gold' : 'Tokens'} staked
        </span>
      </div>

      <div className="contract-status-card__progress-section">
        <div className="contract-status-card__progress-bar">
          <div
            className="contract-status-card__progress-fill"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="contract-status-card__progress-text">
          {contract.currentProgress} of {contract.targetCount} completions this {contract.cadence}
        </p>
      </div>

      <div className="contract-status-card__info">
        <div className="contract-status-card__info-row">
          <span className="contract-status-card__info-label">Grace days available:</span>
          <span className="contract-status-card__info-value">{contract.graceDays}</span>
        </div>
        {coolingOffRemaining !== null && (
          <div className="contract-status-card__info-row contract-status-card__info-row--highlight">
            <span className="contract-status-card__info-label">Cancel without penalty:</span>
            <span className="contract-status-card__info-value">{coolingOffRemaining}h remaining</span>
          </div>
        )}
      </div>

      <p className="contract-status-card__message">{statusMessage}</p>

      <div className="contract-status-card__actions">
        <button
          type="button"
          className="contract-status-card__primary-button"
          onClick={onMarkProgress}
        >
          Mark Progress
        </button>
        <div className="contract-status-card__secondary-actions">
          <button
            type="button"
            className="contract-status-card__secondary-button"
            onClick={onPause}
          >
            Pause
          </button>
          <button
            type="button"
            className="contract-status-card__secondary-button"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
