import type { CommitmentContract, ContractEvaluation } from '../../types/gamification';
import type {
  GentleRecoveryEligibility,
  ReduceStakeEligibility,
  ResetContractEligibility,
} from '../../services/commitmentContracts';
import { FutureMessageReveal } from './FutureMessageReveal';
import { getPromiseVariant } from './promisePresentation';
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
  linkedRewardTitle?: string | null;
  onClaimLinkedReward?: () => void;
  claimingLinkedReward?: boolean;
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
  linkedRewardTitle = null,
  onClaimLinkedReward,
  claimingLinkedReward = false,
}: ContractResultModalProps) {
  const isSuccess = evaluation.result === 'success';
  const promiseVariant = getPromiseVariant(contract);
  const isSacredPromise = promiseVariant === 'sacred';
  const canResetContract = Boolean(resetEligibility?.eligible);
  const canReduceStake = Boolean(reduceStakeEligibility?.eligible);
  const canActivateGentleRecovery = Boolean(gentleRecoveryEligibility?.eligible);
  const resetAvailability = formatRecoveryAvailability(resetEligibility?.nextEligibleAt);
  const reduceStakeAvailability = formatRecoveryAvailability(reduceStakeEligibility?.nextEligibleAt);
  const shouldSuggestSupportOnly = contract.missCount >= 2;
  const baseBonus = Math.max(1, Math.floor(contract.stakeAmount * 0.1));
  const rewardMultiplier = baseBonus > 0 ? evaluation.bonusAwarded / baseBonus : 1;
  const isContractCompleted = contract.status === 'completed';
  const stakeLabel = contract.stakeType === 'gold' ? 'Gold' : 'Tokens';
  const successWhatHappened = evaluation.bonusAwarded > 0
    ? `What happened? Your stake stayed safe, and +${evaluation.bonusAwarded} ${stakeLabel} was applied as your success bonus.`
    : 'What happened? Your stake stayed safe for this window, and no bonus was applied this time.';
  const missWhatHappened = evaluation.stakeForfeited > 0
    ? `What happened? ${evaluation.stakeForfeited} ${stakeLabel} was forfeited for this missed window, and no bonus was applied.`
    : 'What happened? This window was marked as missed, and no bonus was applied.';
  const successTitle = isSacredPromise
    ? '🔱 Sacred Promise Kept'
    : promiseVariant === 'reverse'
      ? '🛡️ Reverse Promise Kept'
      : '✨ Promise Kept';
  const successBody = promiseVariant === 'reverse'
    ? `You stayed within your guardrail this ${contract.cadence}: ${evaluation.actualCount} of ${evaluation.targetCount}.`
    : `You completed ${evaluation.actualCount} of ${evaluation.targetCount} this ${contract.cadence}.`;
  const missTitle = isSacredPromise
    ? 'Sacred promise missed'
    : promiseVariant === 'reverse'
      ? 'Reverse promise slipped'
      : 'Promise missed this window';
  const missBody = isSacredPromise
    ? 'This sacred window was missed and the 3x sacred consequence applies. Choose a recovery action now to reset footing for your next window.'
    : 'This window was missed. Choose your next recovery step and keep momentum moving.';

  if (isSuccess) {
    return (
      <div className="contract-result-modal" role="dialog" aria-modal="true">
        <div className="contract-result-modal__backdrop" onClick={onClose} />
        <div className={`contract-result-modal__content contract-result-modal__content--${promiseVariant} contract-result-modal__content--success`}>
          {isSacredPromise && (
            <p className="contract-result-modal__ceremony-label">Ceremonial result</p>
          )}
          {isContractCompleted ? (
            <>
              <div className="contract-result-modal__completed-celebration">
                <span className="contract-result-modal__completed-emoji">{isSacredPromise ? '🔱' : '🎉'}</span>
                <span className="contract-result-modal__completed-label">{isSacredPromise ? 'Sacred Promise Fulfilled' : 'Promise Fulfilled'}</span>
              </div>
              <h3 className="contract-result-modal__title contract-result-modal__title--completed">
                {isSacredPromise ? 'Ceremony complete.' : 'You kept your promise.'}
              </h3>
              <p className="contract-result-modal__body">
                {isSacredPromise
                  ? `You fulfilled every sacred window for "${contract.title}". This vow is now complete.`
                  : `You fulfilled every promise window for "${contract.title}". This promise is now complete.`}
              </p>
            </>
          ) : (
            <h3 className="contract-result-modal__title contract-result-modal__title--success">
              {successTitle}
            </h3>
          )}
          <p className="contract-result-modal__body">
            {successBody}
          </p>
          <p className="contract-result-modal__what-happened">{successWhatHappened}</p>
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
          {linkedRewardTitle && onClaimLinkedReward && (
            <div className="contract-result-modal__bonus">
              <span className="contract-result-modal__bonus-icon">🏆</span>
              <span className="contract-result-modal__bonus-text">
                Linked reward ready: {linkedRewardTitle}
              </span>
            </div>
          )}
          <div className="contract-result-modal__actions">
            {linkedRewardTitle && onClaimLinkedReward && (
              <button
                type="button"
                className="contract-result-modal__button contract-result-modal__button--secondary"
                onClick={onClaimLinkedReward}
                disabled={claimingLinkedReward}
              >
                {claimingLinkedReward ? 'Claiming reward...' : 'Claim linked reward'}
              </button>
            )}
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
      <div className={`contract-result-modal__content contract-result-modal__content--${promiseVariant} contract-result-modal__content--miss`}>
        {isSacredPromise && (
          <p className="contract-result-modal__ceremony-label">Ceremonial result</p>
        )}
        <h3 className="contract-result-modal__title contract-result-modal__title--miss">
          {missTitle}
        </h3>
        <p className="contract-result-modal__body">
          {missBody}
        </p>
        <p className="contract-result-modal__what-happened">{missWhatHappened}</p>
        {evaluation.stakeForfeited > 0 && (
          <div className="contract-result-modal__stake-forfeited">
            <span className="contract-result-modal__stake-icon">💸</span>
            <span className="contract-result-modal__stake-text">
              {evaluation.stakeForfeited} {contract.stakeType === 'gold' ? 'Gold' : 'Tokens'} forfeited to the commitment pool
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
            Reset promise (same settings)
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
          Cancel promise
        </button>
      </div>
    </div>
  );
}
