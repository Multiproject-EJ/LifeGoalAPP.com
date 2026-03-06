import type { CommitmentContract, ContractEvaluation } from '../../types/gamification';
import type {
  GentleRecoveryEligibility,
  ReduceStakeEligibility,
  ResetContractEligibility,
} from '../../services/commitmentContracts';
import { FutureMessageReveal } from './FutureMessageReveal';
import './ContractResultModal.css';

interface ContractResultModalProps {
  contract: CommitmentContract;
  evaluation: ContractEvaluation;
  resetEligibility: ResetContractEligibility | null;
  reduceStakeEligibility: ReduceStakeEligibility | null;
  gentleRecoveryEligibility: GentleRecoveryEligibility | null;
  onClose: () => void;
  onResetContract: () => void;
  onReduceStake: () => void;
  onActivateGentleRecovery: () => void;
  onPauseWeek: () => void;
  onCancelContract: () => void;
}

function formatRecoveryAvailability(nextEligibleAt?: string): string | null {
  if (!nextEligibleAt) return null;

  const nextEligibleTime = new Date(nextEligibleAt).getTime();
  if (Number.isNaN(nextEligibleTime)) return null;

  const remainingMs = nextEligibleTime - Date.now();
  if (remainingMs <= 0) return 'Available now';

  const totalHours = Math.ceil(remainingMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0 && hours > 0) {
    return `Available in ${days}d ${hours}h`;
  }

  if (days > 0) {
    return `Available in ${days}d`;
  }

  return `Available in ${Math.max(hours, 1)}h`;
}

export function ContractResultModal({
  contract,
  evaluation,
  resetEligibility,
  reduceStakeEligibility,
  gentleRecoveryEligibility,
  onClose,
  onResetContract,
  onReduceStake,
  onActivateGentleRecovery,
  onPauseWeek,
  onCancelContract,
}: ContractResultModalProps) {
  const isSuccess = evaluation.result === 'success';
  const canResetContract = Boolean(resetEligibility?.eligible);
  const canReduceStake = Boolean(reduceStakeEligibility?.eligible);
  const canActivateGentleRecovery = Boolean(gentleRecoveryEligibility?.eligible);
  const resetAvailability = formatRecoveryAvailability(resetEligibility?.nextEligibleAt);
  const reduceStakeAvailability = formatRecoveryAvailability(reduceStakeEligibility?.nextEligibleAt);
  const shouldSuggestSupportOnly = contract.missCount >= 2;
  const baseBonus = Math.max(1, Math.floor(contract.stakeAmount * 0.1));
  const rewardMultiplier = baseBonus > 0 ? evaluation.bonusAwarded / baseBonus : 1;
  const isContractCompleted = contract.status === 'completed';

  if (isSuccess) {
    return (
      <div className="contract-result-modal" role="dialog" aria-modal="true">
        <div className="contract-result-modal__backdrop" onClick={onClose} />
        <div className="contract-result-modal__content">
          {isContractCompleted ? (
            <>
              <div className="contract-result-modal__completed-celebration">
                <span className="contract-result-modal__completed-emoji">🎉</span>
                <span className="contract-result-modal__completed-label">Contract Completed!</span>
              </div>
              <h3 className="contract-result-modal__title contract-result-modal__title--completed">
                You did it!
              </h3>
              <p className="contract-result-modal__body">
                You fulfilled every commitment for "{contract.title}". This contract is now complete.
              </p>
            </>
          ) : (
            <h3 className="contract-result-modal__title contract-result-modal__title--success">
              ✨ Contract Kept!
            </h3>
          )}
          <p className="contract-result-modal__body">
            You completed {evaluation.actualCount} of {evaluation.targetCount} this {contract.cadence}.
          </p>
          {contract.futureMessage && (
            <FutureMessageReveal
              message={contract.futureMessage}
              isRevealed={!!contract.futureMessageUnlockedAt}
              revealedAt={contract.futureMessageUnlockedAt ?? null}
            />
          )}
          {evaluation.bonusAwarded > 0 && (
            <div className="contract-result-modal__bonus">
              <span className="contract-result-modal__bonus-icon">🎁</span>
              <span className="contract-result-modal__bonus-text">
                +{evaluation.bonusAwarded} {contract.stakeType === 'gold' ? 'Gold' : 'Tokens'} earned
                {rewardMultiplier > 1 ? ` (x${rewardMultiplier.toFixed(2)} streak boost)` : ''}
              </span>
            </div>
          )}
          <div className="contract-result-modal__actions">
            <button
              type="button"
              className="contract-result-modal__button contract-result-modal__button--primary"
              onClick={onClose}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="contract-result-modal" role="dialog" aria-modal="true">
      <div className="contract-result-modal__backdrop" onClick={onClose} />
      <div className="contract-result-modal__content">
        <h3 className="contract-result-modal__title contract-result-modal__title--miss">
          You didn't meet this one
        </h3>
        <p className="contract-result-modal__body">
          That doesn't erase your progress. What would you like to do?
        </p>
        {evaluation.stakeForfeited > 0 && (
          <div className="contract-result-modal__stake-forfeited">
            <span className="contract-result-modal__stake-icon">💸</span>
            <span className="contract-result-modal__stake-text">
              {evaluation.stakeForfeited} {contract.stakeType === 'gold' ? 'Gold' : 'Tokens'} sent to commitment pool
            </span>
          </div>
        )}
        <div className="contract-result-modal__options">
          <button
            type="button"
            className="contract-result-modal__option-button"
            onClick={onResetContract}
            disabled={!canResetContract}
          >
            Reset contract (same settings)
            {!canResetContract && resetAvailability && (
              <span className="contract-result-modal__availability-chip">{resetAvailability}</span>
            )}
          </button>
          {!canResetContract && resetEligibility?.reason && (
            <p className="contract-result-modal__option-hint">{resetEligibility.reason}</p>
          )}
          <button
            type="button"
            className="contract-result-modal__option-button"
            onClick={onReduceStake}
            disabled={!canReduceStake}
          >
            Reduce stake
            {!canReduceStake && reduceStakeAvailability && (
              <span className="contract-result-modal__availability-chip">{reduceStakeAvailability}</span>
            )}
          </button>
          {!canReduceStake && reduceStakeEligibility?.reason && (
            <p className="contract-result-modal__option-hint">{reduceStakeEligibility.reason}</p>
          )}
          <button
            type="button"
            className="contract-result-modal__option-button"
            onClick={onActivateGentleRecovery}
            disabled={!canActivateGentleRecovery}
          >
            Start gentle ramp week
          </button>
          {!canActivateGentleRecovery && gentleRecoveryEligibility?.reason && (
            <p className="contract-result-modal__option-hint">{gentleRecoveryEligibility.reason}</p>
          )}
          <button
            type="button"
            className="contract-result-modal__option-button"
            onClick={onPauseWeek}
          >
            Pause for a week
          </button>
        </div>
        {shouldSuggestSupportOnly && (
          <p className="contract-result-modal__support-hint">
            💛 You&apos;ve hit a few tough windows lately. Consider switching to support-only accountability
            with someone you trust while you rebuild momentum.
          </p>
        )}
        <button
          type="button"
          className="contract-result-modal__cancel-button"
          onClick={onCancelContract}
        >
          Cancel contract
        </button>
      </div>
    </div>
  );
}
