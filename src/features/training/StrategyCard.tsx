// Strategy Card - Display strategy progress with visual indicators
import type { TrainingStrategy, StrategyProgress } from './types';
import { STRATEGY_TYPES } from './constants';

interface StrategyCardProps {
  strategy: TrainingStrategy;
  progress: StrategyProgress;
  onClick: () => void;
}

export function StrategyCard({ strategy, progress, onClick }: StrategyCardProps) {
  const strategyType = STRATEGY_TYPES.find((t) => t.value === strategy.strategy_type);
  const icon = strategyType?.icon || '🎯';

  // Determine badge class based on status
  const badgeClass =
    progress.status === 'on_track'
      ? 'badge--success'
      : progress.status === 'at_risk'
      ? 'badge--warn'
      : 'badge--error';

  // Determine progress bar class
  const progressClass =
    progress.status === 'on_track'
      ? 'training-progress__fill--success'
      : progress.status === 'at_risk'
      ? 'training-progress__fill--warn'
      : 'training-progress__fill--error';

  // Cap percentage at 100 for display
  const displayPercentage = Math.min(progress.percentage, 100);

  return (
    <div className="card glass strategy-card" onClick={onClick}>
      <div className="strategy-card__header">
        <span className="strategy-card__icon">{icon}</span>
        <h3 className="strategy-card__title">{strategy.name}</h3>
        <span className={`badge ${badgeClass}`}>
          {progress.status === 'on_track' && 'On Track'}
          {progress.status === 'at_risk' && 'At Risk'}
          {progress.status === 'unreachable' && 'Unreachable'}
        </span>
      </div>

      <div className="training-progress">
        <div
          className={`training-progress__fill ${progressClass}`}
          style={{ width: `${displayPercentage}%` }}
        />
      </div>

      <div className="strategy-card__stats">
        <div>
          <span className="strategy-card__current">{Math.round(progress.current)}</span>
          <span className="strategy-card__target"> / {Math.round(progress.target)}</span>
        </div>
        <span className="muted" style={{ fontSize: 'var(--fs-sm)' }}>
          {Math.round(progress.percentage)}%
        </span>
      </div>

      <div className="strategy-card__forecast">{progress.forecastMessage}</div>
    </div>
  );
}
