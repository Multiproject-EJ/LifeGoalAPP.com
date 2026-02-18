import type { CommitmentContract, ContractEvaluation } from '../../types/gamification';
import type { GentleRecoveryEligibility, ReduceStakeEligibility } from '../../services/commitmentContracts';

interface ContractResultModalProps {
  contract: CommitmentContract;
  evaluation: ContractEvaluation;
  reduceStakeEligibility: ReduceStakeEligibility | null;
  gentleRecoveryEligibility: GentleRecoveryEligibility | null;
  onClose: () => void;
  onResetContract: () => void;
  onReduceStake: () => void;
  onActivateGentleRecovery: () => void;
  onPauseWeek: () => void;
  onCancelContract: () => void;
}

export function ContractResultModal({
  contract,
  evaluation,
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
  const canReduceStake = Boolean(reduceStakeEligibility?.eligible);
  const canActivateGentleRecovery = Boolean(gentleRecoveryEligibility?.eligible);
  const baseBonus = Math.max(1, Math.floor(contract.stakeAmount * 0.1));
  const rewardMultiplier = baseBonus > 0 ? evaluation.bonusAwarded / baseBonus : 1;

  if (isSuccess) {
    return (
      <div className="contract-result-modal" role="dialog" aria-modal="true">
        <div className="contract-result-modal__backdrop" onClick={onClose} />
        <div className="contract-result-modal__content">
          <h3 className="contract-result-modal__title contract-result-modal__title--success">
            ✨ Contract Kept!
          </h3>
          <p className="contract-result-modal__body">
            You completed {evaluation.actualCount} of {evaluation.targetCount} this {contract.cadence}.
          </p>
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
          >
            Reset contract (same settings)
          </button>
          <button
            type="button"
            className="contract-result-modal__option-button"
            onClick={onReduceStake}
            disabled={!canReduceStake}
          >
            Reduce stake (one-time option)
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
