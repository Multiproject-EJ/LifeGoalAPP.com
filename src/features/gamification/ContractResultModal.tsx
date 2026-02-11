import type { CommitmentContract, ContractEvaluation } from '../../types/gamification';

interface ContractResultModalProps {
  contract: CommitmentContract;
  evaluation: ContractEvaluation;
  onClose: () => void;
  onResetContract: () => void;
  onReduceStake: () => void;
  onPauseWeek: () => void;
  onCancelContract: () => void;
}

export function ContractResultModal({
  contract,
  evaluation,
  onClose,
  onResetContract,
  onReduceStake,
  onPauseWeek,
  onCancelContract,
}: ContractResultModalProps) {
  const isSuccess = evaluation.result === 'success';

  // Check if user can reduce stake (2+ misses in 30 days)
  const canReduceStake = contract.missCount >= 2;

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

  // Miss modal
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
          {canReduceStake && (
            <button
              type="button"
              className="contract-result-modal__option-button"
              onClick={onReduceStake}
            >
              Reduce stake (one-time option)
            </button>
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
