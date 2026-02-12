// Main Training Tab Component
import { useState } from 'react';
import { useTraining } from './useTraining';
import { QuickLogModal } from './QuickLogModal';
import { StrategyCard } from './StrategyCard';
import { StrategySetupWizard } from './StrategySetupWizard';
import { StrategyDetail } from './StrategyDetail';
import type { TrainingStrategy, ExerciseLog } from './types';
import './training.css';

// Helper function to map log data to initial form data
function mapLogToInitialData(log: ExerciseLog | null) {
  if (!log) return null;
  return {
    exercise_name: log.exercise_name,
    muscle_groups: log.muscle_groups,
    reps: log.reps,
    sets: log.sets,
    weight_kg: log.weight_kg,
    duration_minutes: log.duration_minutes,
    notes: log.notes,
  };
}

export function TrainingTab() {
  const {
    logs,
    strategies,
    strategyProgress,
    todaySummary,
    loading,
    addLog,
    removeLog,
    addStrategy,
    editStrategy,
    removeStrategy,
    toggleStrategy,
  } = useTraining();

  const [showQuickLog, setShowQuickLog] = useState(false);
  const [showStrategyWizard, setShowStrategyWizard] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<TrainingStrategy | null>(null);
  const [repeatLastWorkout, setRepeatLastWorkout] = useState(false);

  const activeStrategies = strategies.filter((s) => s.is_active);
  const lastLog = logs.length > 0 ? logs[0] : null;

  if (loading) {
    return (
      <div className="container">
        {/* Skeleton for Quick Action Button */}
        <div className="quick-action-btn">
          <div className="training-skeleton" style={{ height: '56px', width: '100%' }} />
        </div>

        {/* Skeleton for Today's Summary */}
        <div className="today-summary">
          <div className="summary-stat">
            <div className="training-skeleton" style={{ height: '32px', width: '60px', margin: '0 auto' }} />
            <div className="training-skeleton" style={{ height: '14px', width: '80px', margin: '8px auto 0' }} />
          </div>
          <div className="summary-stat">
            <div className="training-skeleton" style={{ height: '32px', width: '60px', margin: '0 auto' }} />
            <div className="training-skeleton" style={{ height: '14px', width: '80px', margin: '8px auto 0' }} />
          </div>
          <div className="summary-stat">
            <div className="training-skeleton" style={{ height: '32px', width: '60px', margin: '0 auto' }} />
            <div className="training-skeleton" style={{ height: '14px', width: '80px', margin: '8px auto 0' }} />
          </div>
        </div>

        {/* Skeleton for Strategy Cards */}
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <div className="training-skeleton" style={{ height: '32px', width: '200px', marginBottom: 'var(--space-3)' }} />
        </div>
        <div className="strategy-grid">
          <div className="card glass">
            <div className="training-skeleton" style={{ height: '120px', width: '100%' }} />
          </div>
          <div className="card glass">
            <div className="training-skeleton" style={{ height: '120px', width: '100%' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Quick Action Buttons */}
      <div className="quick-action-btn">
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            className="btn btn--primary"
            onClick={() => {
              setRepeatLastWorkout(false);
              setShowQuickLog(true);
            }}
            style={{ flex: 1, fontSize: 'var(--fs-lg)', padding: 'var(--space-4)' }}
          >
            ⚡ Quick Log
          </button>
          {lastLog && (
            <button
              className="btn btn--secondary"
              onClick={() => {
                setRepeatLastWorkout(true);
                setShowQuickLog(true);
              }}
              style={{ fontSize: 'var(--fs-lg)', padding: 'var(--space-4)' }}
              title="Repeat last workout"
            >
              🔄
            </button>
          )}
        </div>
      </div>

      {/* Today's Summary */}
      <section className="today-summary">
        <div className="summary-stat">
          <span className="summary-stat__value">{todaySummary.totalExercises}</span>
          <span className="summary-stat__label">Exercises</span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat__value">{todaySummary.totalReps}</span>
          <span className="summary-stat__label">Total Reps</span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat__value">
            {Math.round(todaySummary.totalDuration)}
          </span>
          <span className="summary-stat__label">Minutes</span>
        </div>
      </section>

      {/* Active Strategies */}
      <div className="row" style={{ marginBottom: 'var(--space-3)' }}>
        <h2 style={{ flex: 1, fontSize: 'var(--fs-xl)', fontWeight: '700' }}>
          Active Strategies
        </h2>
        <button
          className="btn btn--ghost"
          onClick={() => setShowStrategyWizard(true)}
        >
          + Add Strategy
        </button>
      </div>

      {activeStrategies.length === 0 ? (
        <div className="empty-state card glass">
          <div className="empty-state__icon">🎯</div>
          <h3 className="empty-state__title">No Active Strategies</h3>
          <p className="empty-state__description">
            Set up a training strategy to track your progress and stay motivated!
          </p>
          <button
            className="btn btn--primary"
            onClick={() => setShowStrategyWizard(true)}
          >
            Create Your First Strategy
          </button>
        </div>
      ) : (
        <div className="strategy-grid">
          {activeStrategies.map((strategy) => {
            const progress = strategyProgress.get(strategy.id);
            if (!progress) return null;
            return (
              <StrategyCard
                key={strategy.id}
                strategy={strategy}
                progress={progress}
                onClick={() => setSelectedStrategy(strategy)}
              />
            );
          })}
        </div>
      )}

      {/* Recent Logs Section */}
      {logs.length > 0 && (
        <section style={{ marginTop: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--fs-xl)', fontWeight: '700', marginBottom: 'var(--space-3)' }}>
            Recent Workouts
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {logs.slice(0, 5).map((log) => (
              <div key={log.id} className="card glass">
                <div className="row">
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: 'var(--fs-md)' }}>
                      {log.exercise_name}
                    </strong>
                    <div className="muted" style={{ fontSize: 'var(--fs-sm)', marginTop: 'var(--space-1)' }}>
                      {log.reps && log.sets && `${log.sets} × ${log.reps} reps`}
                      {log.weight_kg && ` @ ${log.weight_kg}kg`}
                      {log.duration_minutes && ` • ${log.duration_minutes} min`}
                    </div>
                    {log.muscle_groups.length > 0 && (
                      <div style={{ marginTop: 'var(--space-2)' }}>
                        {log.muscle_groups.map((muscle) => (
                          <span key={muscle} className="badge badge--accent" style={{ marginRight: 'var(--space-1)' }}>
                            {muscle}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    className="btn btn--ghost"
                    onClick={() => removeLog(log.id)}
                    style={{ padding: 'var(--space-2)' }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Modals */}
      {showQuickLog && (
        <QuickLogModal
          onClose={() => {
            setShowQuickLog(false);
            setRepeatLastWorkout(false);
          }}
          onSave={async (logData) => {
            await addLog(logData);
            setShowQuickLog(false);
            setRepeatLastWorkout(false);
          }}
          initialData={repeatLastWorkout ? mapLogToInitialData(lastLog) : null}
        />
      )}

      {showStrategyWizard && (
        <StrategySetupWizard
          onClose={() => setShowStrategyWizard(false)}
          onSave={async (strategyData) => {
            await addStrategy(strategyData);
            setShowStrategyWizard(false);
          }}
        />
      )}

      {selectedStrategy && (
        <StrategyDetail
          strategy={selectedStrategy}
          progress={strategyProgress.get(selectedStrategy.id)!}
          logs={logs}
          onClose={() => setSelectedStrategy(null)}
          onEdit={async (updates) => {
            await editStrategy(selectedStrategy.id, updates);
            setSelectedStrategy(null);
          }}
          onDelete={async () => {
            await removeStrategy(selectedStrategy.id);
            setSelectedStrategy(null);
          }}
          onToggle={async (isActive) => {
            await toggleStrategy(selectedStrategy.id, isActive);
            setSelectedStrategy(null);
          }}
        />
      )}
    </div>
  );
}

export default TrainingTab;
