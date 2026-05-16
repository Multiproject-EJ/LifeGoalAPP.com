import { useMemo } from 'react';
import type { CommitmentContract } from '../../types/gamification';
import { getContractPaceForecast } from '../../lib/contractForecast';
import { getOutcomePrimaryActionLabel, getPromiseLabel, getPromiseVariant } from './promisePresentation';
import './ContractStatusCard.css';

interface ContractStatusCardProps {
  contract: CommitmentContract;
  onMarkProgress: () => void;
  onLogFailure: () => void;
  onFinalizeSuccess: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onWitnessPing: () => void;
}

export function ContractStatusCard({
  contract,
  onMarkProgress,
  onLogFailure,
  onFinalizeSuccess,
  onPause,
  onResume,
  onCancel,
  onWitnessPing,
}: ContractStatusCardProps) {
  const promiseVariant = getPromiseVariant(contract);
  const promiseLabel = getPromiseLabel(promiseVariant);

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    const safeTargetCount = Math.max(contract.targetCount, 1);
    return Math.min(100, (contract.currentProgress / safeTargetCount) * 100);
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
    if (promiseVariant === 'reverse') {
      if (contract.currentProgress === 0) {
        return contract.targetCount === 0
          ? 'Clean window so far — one slip would break this promise'
          : `Clean window so far — ${contract.targetCount} slip${contract.targetCount === 1 ? '' : 's'} allowed`;
      }

      const remainingSlips = Math.max(0, contract.targetCount - contract.currentProgress);
      return remainingSlips > 0
        ? `${contract.currentProgress} slip${contract.currentProgress === 1 ? '' : 's'} logged — ${remainingSlips} allowed left`
        : 'No slips left in this window';
    }

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
  }, [contract.currentProgress, contract.targetCount, contract.cadence, contract.graceDays, promiseVariant]);

  const paceForecast = useMemo(
    () => (contract.status === 'active' ? getContractPaceForecast(contract) : null),
    [contract],
  );

  const isAtRisk = paceForecast?.status === 'at_risk';
  const shouldSuggestSupportOnly = contract.missCount >= 2;
  const isCancelAllowed = contract.status !== 'active' || coolingOffRemaining !== null;
  const isOutcomeOnly = contract.trackingMode === 'outcome_only';
  const endDate = contract.endAt ? new Date(contract.endAt) : null;
  const endDateMs = endDate?.getTime() ?? null;
  const now = new Date();
  const canFinalizeOutcome = isOutcomeOnly && endDate !== null && now >= endDate;
  const timeProgressPercentage = useMemo(() => {
    if (endDateMs === null) return null;
    const started = new Date(contract.startAt).getTime();
    const ends = endDateMs;
    if (Number.isNaN(started) || Number.isNaN(ends) || ends <= started) return null;
    const ratio = ((Date.now() - started) / (ends - started)) * 100;
    return Math.max(0, Math.min(100, ratio));
  }, [contract.startAt, endDateMs]);
  const tier = contract.contractTier ?? 'common';
  const primaryActionLabel = (() => {
    if (contract.status === 'paused') return 'Resume Promise';
    if (promiseVariant === 'reverse') return 'Log Slip';
    if (isOutcomeOnly) return getOutcomePrimaryActionLabel(promiseVariant);
    return isAtRisk ? 'Rescue Progress' : 'Mark Progress';
  })();

  return (
    <div className={`contract-status-card contract-status-card--${tier} contract-status-card--promise-${promiseVariant}`}>
      <div className="contract-status-card__header">
        <div className="contract-status-card__title-wrap">
          <p className="contract-status-card__promise-label">{promiseLabel}</p>
          <h3 className="contract-status-card__title">
            {contract.isSacred && '🔱 '}{contract.title}
          </h3>
        </div>
        <span className={`contract-status-card__tier-badge contract-status-card__tier-badge--${tier}`}>
          {tier}
        </span>
        <span className="contract-status-card__stake-badge">
          {contract.stakeAmount} {contract.stakeType === 'gold' ? 'Gold' : 'Tokens'} staked
        </span>
      </div>


      {contract.recoveryMode === 'gentle_ramp' && (
        <div className="contract-status-card__recovery" role="status" aria-live="polite">
          🌱 Gentle ramp active — your target is temporarily reduced while you rebuild momentum.
        </div>
      )}

      {contract.contractType === 'escalation' && (contract.escalationLevel ?? 0) > 0 && (
        <div className="contract-status-card__escalation" role="status" aria-live="polite">
          <p className="contract-status-card__escalation-title">
            ⚡ Escalation active — x{(contract.escalationMultiplier ?? 1.0).toFixed(1)} stake multiplier
          </p>
          <div className="contract-status-card__escalation-ladder">
            {[0, 1, 2, 3, 4].map((level) => (
              <span
                key={level}
                className={`contract-status-card__escalation-step${level === (contract.escalationLevel ?? 0) ? ' contract-status-card__escalation-step--active' : ''}`}
              >
                {level === 0 ? '1x' : `${(1 + level * 0.5).toFixed(1)}x`}
              </span>
            ))}
          </div>
        </div>
      )}

      {contract.accountabilityMode === 'witness' && contract.witnessLabel && (
        <div className="contract-status-card__witness" role="status" aria-live="polite">
          <p className="contract-status-card__witness-text">🤝 Accountability buddy: {contract.witnessLabel}</p>
          <button
            type="button"
            className="contract-status-card__witness-button"
            onClick={onWitnessPing}
            title="Share or copy a reminder message only — this is not a two-way witness flow."
          >
            Share reminder
          </button>
        </div>
      )}

      <div className="contract-status-card__progress-section">
        <div className="contract-status-card__progress-bar">
          <div
            className="contract-status-card__progress-fill"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="contract-status-card__progress-text">
          {isOutcomeOnly
            ? 'Outcome-only promise: no daily check-ins required.'
            : promiseVariant === 'reverse'
              ? `${contract.currentProgress} slip${contract.currentProgress === 1 ? '' : 's'} logged this ${contract.cadence} · ${contract.targetCount} allowed`
              : `${contract.currentProgress} of ${contract.targetCount} completions kept this ${contract.cadence}`}
        </p>
      </div>

      {endDate && timeProgressPercentage !== null && (
        <div className="contract-status-card__time-progress" role="status" aria-live="polite">
          <p className="contract-status-card__time-progress-label">Promise timeline</p>
          <div className="contract-status-card__progress-bar">
            <div
              className="contract-status-card__time-progress-fill"
              style={{ width: `${timeProgressPercentage}%` }}
            />
          </div>
          <p className="contract-status-card__progress-text">
            {Math.round(timeProgressPercentage)}% elapsed · ends {endDate.toLocaleDateString()}
          </p>
        </div>
      )}

      <div className="contract-status-card__info">
        <div className="contract-status-card__info-row">
          <span className="contract-status-card__info-label">
            {promiseVariant === 'reverse' ? 'Allowed slips:' : 'Buffer days available:'}
          </span>
          <span className="contract-status-card__info-value">
            {promiseVariant === 'reverse' ? contract.targetCount : contract.graceDays}
          </span>
        </div>
        {promiseVariant === 'reverse' && contract.graceDays > 0 && (
          <div className="contract-status-card__info-row">
            <span className="contract-status-card__info-label">Legacy grace buffer:</span>
            <span className="contract-status-card__info-value">{contract.graceDays}</span>
          </div>
        )}
        {coolingOffRemaining !== null && (
          <div className="contract-status-card__info-row contract-status-card__info-row--highlight">
            <span className="contract-status-card__info-label">Cancel without penalty:</span>
            <span className="contract-status-card__info-value">{coolingOffRemaining}h remaining</span>
          </div>
        )}
      </div>

      <p className="contract-status-card__message">{statusMessage}</p>

      {paceForecast && (
        <div
          className={`contract-status-card__pace contract-status-card__pace--${paceForecast.status}`}
          role="status"
          aria-live="polite"
        >
          <p className="contract-status-card__pace-label">
            {isAtRisk ? '⚠️ At risk' : paceForecast.status === 'on_pace' ? '✅ On pace' : '🎉 Target met'}
          </p>
          <p className="contract-status-card__pace-message">{paceForecast.rescueSuggestion}</p>
        </div>
      )}

      {shouldSuggestSupportOnly && (
        <div className="contract-status-card__support-mode" role="status" aria-live="polite">
          💛 Tough windows happen. After a couple misses, support-only accountability with a trusted person
          can keep momentum gentle without extra pressure.
        </div>
      )}

      <div className="contract-status-card__actions">
        <button
          type="button"
          className="contract-status-card__primary-button"
          onClick={contract.status === 'paused' ? onResume : isOutcomeOnly ? onLogFailure : onMarkProgress}
        >
          {primaryActionLabel}
        </button>
        {isOutcomeOnly && (
          <button
            type="button"
            className="contract-status-card__secondary-button"
            onClick={onFinalizeSuccess}
            disabled={!canFinalizeOutcome}
            title={!canFinalizeOutcome ? 'Finalize on or after the contract end date.' : undefined}
          >
            Finalize Promise Kept
          </button>
        )}
        <div className="contract-status-card__secondary-actions">
          {contract.status === 'active' && (
            <button
              type="button"
              className="contract-status-card__secondary-button"
              onClick={onPause}
            >
              Pause
            </button>
          )}
          <button
            type="button"
            className="contract-status-card__secondary-button"
            onClick={onCancel}
            disabled={!isCancelAllowed}
            aria-disabled={!isCancelAllowed}
            title={!isCancelAllowed ? 'Cancellation is only available during the cancel-protection window. Pause instead.' : undefined}
          >
            Cancel
          </button>
        </div>
      </div>
      {!isCancelAllowed && (
        <p className="contract-status-card__cooling-off-note" role="status" aria-live="polite">
          Cancel protection ended. Pause to keep this promise recoverable without cancellation.
        </p>
      )}
    </div>
  );
}
