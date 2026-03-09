import { useState } from 'react';
import type { GoalHealthResult } from '../features/goals/goalHealth';
import type { GoalStrategyType } from '../features/goals/goalStrategy';
import { GOAL_STRATEGY_META } from '../features/goals/goalStrategy';
import { diagnoseAndPrescribe, buildGoalDoctorContext } from '../features/goals/goalDoctor';

type GoalDoctorCardProps = {
  goalTitle: string;
  healthResult: GoalHealthResult | null;
  currentStrategy: GoalStrategyType;
  onSwitchStrategy: (strategy: GoalStrategyType) => void;
  onAskCoach: (prompt: string) => void;
  className?: string;
};

export function GoalDoctorCard({
  goalTitle,
  healthResult,
  currentStrategy,
  onSwitchStrategy,
  onAskCoach,
  className,
}: GoalDoctorCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (healthResult === null) {
    return (
      <div
        className={`goal-doctor-card goal-doctor-card--loading${className ? ` ${className}` : ''}`}
        role="region"
        aria-label="Goal Health Check"
      >
        <span className="goal-doctor-card__header-icon" aria-hidden="true">🩺</span>
        <span className="goal-doctor-card__title">Goal Health Check</span>
        <span className="goal-doctor-card__loading-text">Analyzing…</span>
      </div>
    );
  }

  const diagnosis = diagnoseAndPrescribe(healthResult);
  const { urgency, diagnosisTitle, diagnosisDetail, prescribedStrategy, prescriptionReason } = diagnosis;
  const prescribedMeta = GOAL_STRATEGY_META[prescribedStrategy];
  const alreadyUsingStrategy = prescribedStrategy === currentStrategy;

  if (urgency === 'low') {
    return (
      <div
        className={`goal-doctor-card goal-doctor-card--low${className ? ` ${className}` : ''}`}
        role="region"
        aria-label="Goal Health Check"
      >
        <button
          type="button"
          className="goal-doctor-card__chip"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={`Goal Health Check: ${diagnosisTitle}. Click to ${expanded ? 'collapse' : 'expand'}.`}
        >
          <span aria-hidden="true">✅</span>
          <span>{diagnosisTitle}</span>
        </button>
        {expanded && (
          <div className="goal-doctor-card__body">
            <p className="goal-doctor-card__detail">{diagnosisDetail}</p>
            <div className="goal-doctor-card__prescription">
              <span className="goal-doctor-card__prescription-label">Suggested strategy:</span>
              <span className="goal-doctor-card__prescription-strategy">
                {prescribedMeta.icon} {prescribedMeta.label}
              </span>
              <p className="goal-doctor-card__prescription-reason">{prescriptionReason}</p>
            </div>
            <div className="goal-doctor-card__actions">
              {alreadyUsingStrategy ? (
                <span className="goal-doctor-card__already-using">Already using this strategy ✓</span>
              ) : (
                <button
                  type="button"
                  className="goal-doctor-card__action-btn goal-doctor-card__action-btn--switch"
                  onClick={() => onSwitchStrategy(prescribedStrategy)}
                  aria-label={`Switch goal strategy to ${prescribedMeta.label}`}
                >
                  Switch to {prescribedMeta.label}
                </button>
              )}
              <button
                type="button"
                className="goal-doctor-card__action-btn goal-doctor-card__action-btn--coach"
                onClick={() => onAskCoach(buildGoalDoctorContext(goalTitle, diagnosis))}
                aria-label={`Ask AI Coach about goal diagnosis: ${diagnosisTitle}`}
              >
                Ask Coach
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const urgencyIcon = urgency === 'high' ? '🚨' : '⚠️';

  return (
    <div
      className={`goal-doctor-card goal-doctor-card--${urgency}${className ? ` ${className}` : ''}`}
      role="region"
      aria-label="Goal Health Check"
    >
      <div className="goal-doctor-card__header">
        <span className="goal-doctor-card__header-icon" aria-hidden="true">🩺</span>
        <span className="goal-doctor-card__title">Goal Health Check</span>
        <span
          className={`goal-doctor-card__urgency-badge goal-doctor-card__urgency-badge--${urgency}`}
          aria-label={`Urgency: ${urgency}`}
        >
          {urgencyIcon}
        </span>
      </div>

      <div className="goal-doctor-card__body">
        <p className="goal-doctor-card__diagnosis-title">{diagnosisTitle}</p>
        <p className="goal-doctor-card__detail">{diagnosisDetail}</p>

        <div className="goal-doctor-card__prescription">
          <span className="goal-doctor-card__prescription-label">Suggested strategy:</span>
          <span className="goal-doctor-card__prescription-strategy">
            {prescribedMeta.icon} {prescribedMeta.label}
          </span>
          <p className="goal-doctor-card__prescription-reason">{prescriptionReason}</p>
        </div>

        <div className="goal-doctor-card__actions">
          {alreadyUsingStrategy ? (
            <span className="goal-doctor-card__already-using">Already using this strategy ✓</span>
          ) : (
            <button
              type="button"
              className="goal-doctor-card__action-btn goal-doctor-card__action-btn--switch"
              onClick={() => onSwitchStrategy(prescribedStrategy)}
              aria-label={`Switch goal strategy to ${prescribedMeta.label}`}
            >
              Switch to {prescribedMeta.label}
            </button>
          )}
          <button
            type="button"
            className="goal-doctor-card__action-btn goal-doctor-card__action-btn--coach"
            onClick={() => onAskCoach(buildGoalDoctorContext(goalTitle, diagnosis))}
            aria-label={`Ask AI Coach about goal diagnosis: ${diagnosisTitle}`}
          >
            Ask Coach
          </button>
        </div>
      </div>
    </div>
  );
}
