// Strategy Detail - Detailed view of a strategy with edit/delete options
import { useMemo } from 'react';
import type { TrainingStrategy, StrategyProgress, ExerciseLog } from './types';
import { STRATEGY_TYPES } from './constants';

interface StrategyDetailProps {
  strategy: TrainingStrategy;
  progress: StrategyProgress;
  logs: ExerciseLog[];
  onClose: () => void;
  onEdit: (updates: Partial<TrainingStrategy>) => Promise<void>;
  onDelete: () => Promise<void>;
  onToggle: (isActive: boolean) => Promise<void>;
}

export function StrategyDetail({
  strategy,
  progress,
  logs,
  onClose,
  onDelete,
  onToggle,
}: StrategyDetailProps) {
  const strategyType = STRATEGY_TYPES.find((t) => t.value === strategy.strategy_type);
  const icon = strategyType?.icon || '🎯';

  // Helper function to calculate start date based on strategy type
  const getStrategyStartDate = (strategyType: string, timeWindowDays: number): Date => {
    const now = new Date();
    
    switch (strategyType) {
      case 'weekly_target':
      case 'streak':
      case 'variety':
      case 'recovery':
      case 'duration': {
        // Current week (Monday to Sunday)
        const dayOfWeek = now.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const startDate = new Date(now);
        startDate.setDate(now.getDate() + diff);
        startDate.setHours(0, 0, 0, 0);
        return startDate;
      }
      case 'monthly_target':
      case 'focus_muscle': {
        // Current month
        return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      }
      case 'rolling_window': {
        // Rolling window based on time_window_days
        const startDate = new Date(now);
        startDate.setDate(now.getDate() - timeWindowDays);
        startDate.setHours(0, 0, 0, 0);
        return startDate;
      }
      case 'micro_goal': {
        // Today only
        const startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        return startDate;
      }
      default: {
        // Progressive load and other types - last 2 weeks
        const startDate = new Date(now);
        startDate.setDate(now.getDate() - 14);
        startDate.setHours(0, 0, 0, 0);
        return startDate;
      }
    }
  };

  // Filter relevant logs based on strategy
  const relevantLogs = useMemo(() => {
    const now = new Date();
    const startDate = getStrategyStartDate(strategy.strategy_type, strategy.time_window_days);

    const filtered = logs.filter((log) => {
      const logDate = new Date(log.logged_at);
      if (logDate < startDate) return false;

      // Filter by exercise name if specified
      if (strategy.exercise_name) {
        if (!log.exercise_name.toLowerCase().includes(strategy.exercise_name.toLowerCase())) {
          return false;
        }
      }

      // Filter by focus muscles if specified
      if (strategy.focus_muscles.length > 0) {
        if (!log.muscle_groups.some((m) => strategy.focus_muscles.includes(m))) {
          return false;
        }
      }

      return true;
    });

    return filtered.slice(0, 10); // Show last 10 relevant logs
  }, [logs, strategy]);

  // Calculate daily breakdown for current period
  const dailyBreakdown = useMemo(() => {
    const breakdown = new Map<string, number>();
    relevantLogs.forEach((log) => {
      const date = new Date(log.logged_at).toLocaleDateString();
      const current = breakdown.get(date) || 0;
      if (strategy.strategy_type === 'duration') {
        breakdown.set(date, current + (log.duration_minutes || 0));
      } else {
        breakdown.set(date, current + (log.reps || 0) * (log.sets || 1));
      }
    });
    return Array.from(breakdown.entries()).sort((a, b) => {
      return new Date(b[0]).getTime() - new Date(a[0]).getTime();
    });
  }, [relevantLogs, strategy.strategy_type]);

  const badgeClass =
    progress.status === 'on_track'
      ? 'badge--success'
      : progress.status === 'at_risk'
      ? 'badge--warn'
      : 'badge--error';

  return (
    <div className="modal" style={{ display: 'flex' }}>
      <div className="modal-backdrop" onClick={onClose} />
      <section className="modal__panel card glass" style={{ maxWidth: '700px' }}>
        {/* Header */}
        <div className="row" style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ flex: 1 }}>
            <h2 className="card__title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span>{icon}</span>
              {strategy.name}
            </h2>
            <p className="muted" style={{ marginTop: 'var(--space-1)' }}>
              {strategyType?.description}
            </p>
          </div>
          <span className={`badge ${badgeClass}`}>
            {progress.status === 'on_track' && 'On Track'}
            {progress.status === 'at_risk' && 'At Risk'}
            {progress.status === 'unreachable' && 'Unreachable'}
          </span>
        </div>

        {/* Progress */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div className="training-progress">
            <div
              className={`training-progress__fill ${
                progress.status === 'on_track'
                  ? 'training-progress__fill--success'
                  : progress.status === 'at_risk'
                  ? 'training-progress__fill--warn'
                  : 'training-progress__fill--error'
              }`}
              style={{ width: `${Math.min(progress.percentage, 100)}%` }}
            />
          </div>
          <div className="row" style={{ marginTop: 'var(--space-2)' }}>
            <div>
              <span style={{ fontSize: 'var(--fs-xl)', fontWeight: '700', color: 'var(--accent)' }}>
                {Math.round(progress.current)}
              </span>
              <span style={{ fontSize: 'var(--fs-md)', color: 'var(--text-muted)' }}>
                {' '}/ {Math.round(progress.target)} {strategy.target_unit}
              </span>
            </div>
            <span className="muted">{Math.round(progress.percentage)}%</span>
          </div>
          <div
            style={{
              marginTop: 'var(--space-3)',
              padding: 'var(--space-3)',
              background: 'var(--surface)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {progress.forecastMessage}
          </div>
        </div>

        {/* Strategy Details */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: '600', marginBottom: 'var(--space-2)' }}>
            Strategy Details
          </h3>
          <div style={{ display: 'grid', gap: 'var(--space-2)', fontSize: 'var(--fs-sm)' }}>
            {strategy.exercise_name && (
              <div className="row">
                <span className="muted">Exercise:</span>
                <strong>{strategy.exercise_name}</strong>
              </div>
            )}
            {strategy.focus_muscles.length > 0 && (
              <div className="row">
                <span className="muted">Focus Muscles:</span>
                <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                  {strategy.focus_muscles.map((muscle) => (
                    <span key={muscle} className="badge badge--accent">
                      {muscle}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="row">
              <span className="muted">Time Window:</span>
              <strong>{strategy.time_window_days} days</strong>
            </div>
          </div>
        </div>

        {/* Daily Breakdown */}
        {dailyBreakdown.length > 0 && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: '600', marginBottom: 'var(--space-2)' }}>
              Daily Breakdown
            </h3>
            <div style={{ display: 'grid', gap: 'var(--space-2)', fontSize: 'var(--fs-sm)' }}>
              {dailyBreakdown.map(([date, value]) => (
                <div key={date} className="row">
                  <span className="muted">{date}</span>
                  <strong>
                    {Math.round(value)} {strategy.target_unit}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {relevantLogs.length > 0 && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: '600', marginBottom: 'var(--space-2)' }}>
              Recent Activity
            </h3>
            <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
              {relevantLogs.map((log) => (
                <div key={log.id} style={{ padding: 'var(--space-2)', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--fs-sm)' }}>
                  <div className="row">
                    <strong>{log.exercise_name}</strong>
                    <span className="muted">{new Date(log.logged_at).toLocaleDateString()}</span>
                  </div>
                  {(log.reps || log.sets || log.weight_kg || log.duration_minutes) && (
                    <div className="muted" style={{ marginTop: 'var(--space-1)' }}>
                      {log.reps && log.sets && `${log.sets} × ${log.reps} reps`}
                      {log.weight_kg && ` @ ${log.weight_kg}kg`}
                      {log.duration_minutes && ` • ${log.duration_minutes} min`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="modal__actions">
          <button
            className="btn btn--ghost"
            onClick={() => onToggle(!strategy.is_active)}
          >
            {strategy.is_active ? 'Pause' : 'Activate'}
          </button>
          <button
            className="btn btn--ghost"
            onClick={onDelete}
            style={{ color: 'var(--error)' }}
          >
            Delete
          </button>
          <button className="btn btn--primary" onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    </div>
  );
}
