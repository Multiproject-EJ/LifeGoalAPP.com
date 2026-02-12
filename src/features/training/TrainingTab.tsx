// Main Training Tab Component
import { useState, useRef, useCallback } from 'react';
import { useTraining } from './useTraining';
import { QuickLogModal } from './QuickLogModal';
import { StrategyCard } from './StrategyCard';
import { StrategySetupWizard } from './StrategySetupWizard';
import { StrategyDetail } from './StrategyDetail';
import { WeeklyCalendar } from './WeeklyCalendar';
import { PersonalRecordBanner } from './PersonalRecordBanner';
import { detectPersonalRecord } from './personalRecords';
import type { TrainingStrategy, ExerciseLog, PersonalRecord } from './types';
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

// Swipeable Log Card Component for mobile swipe-to-delete
interface SwipeableLogCardProps {
  log: ExerciseLog;
  onDelete: () => void;
  children: React.ReactNode;
}

function SwipeableLogCard({ log, onDelete, children }: SwipeableLogCardProps) {
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const startX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = startX.current - currentX;
    // Only allow left swipe (positive diff), max 100px
    if (diff > 0) {
      setSwipeX(Math.min(diff, 100));
    }
  }, [isSwiping]);

  const handleTouchEnd = useCallback(() => {
    setIsSwiping(false);
    if (swipeX > 80) {
      // Swipe threshold reached - show confirm
      setSwipeX(100);
      setShowConfirm(true);
    } else {
      // Reset swipe
      setSwipeX(0);
      setShowConfirm(false);
    }
  }, [swipeX]);

  const handleDelete = useCallback(() => {
    onDelete();
  }, [onDelete]);

  const handleCancel = useCallback(() => {
    setSwipeX(0);
    setShowConfirm(false);
  }, []);

  // On desktop, show as regular card
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div className="swipeable-card" ref={cardRef}>
      <div
        className="swipeable-card__content"
        style={{ transform: `translateX(-${swipeX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
      <div className="swipeable-card__action">
        {showConfirm ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', alignItems: 'center' }}>
            <button
              onClick={handleDelete}
              style={{
                background: 'white',
                color: 'var(--error)',
                border: 'none',
                padding: 'var(--space-1) var(--space-2)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--fs-xs)',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
            <button
              onClick={handleCancel}
              style={{
                background: 'transparent',
                color: 'white',
                border: '1px solid white',
                padding: 'var(--space-1) var(--space-2)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--fs-xs)',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          'Delete'
        )}
      </div>
    </div>
  );
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
  const [personalRecord, setPersonalRecord] = useState<PersonalRecord | null>(null);

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
      {/* Personal Record Banner */}
      {personalRecord && (
        <PersonalRecordBanner
          record={personalRecord}
          onDismiss={() => setPersonalRecord(null)}
        />
      )}

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

      {/* Weekly Calendar Strip */}
      <WeeklyCalendar logs={logs} />

      {/* Today's Summary */}
      <section className="today-summary">
        <div className="summary-stat">
          <span className="summary-stat__value">{todaySummary.totalExercises}</span>
          <span className="summary-stat__label">Exercises</span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat__value">{todaySummary.totalSets}</span>
          <span className="summary-stat__label">Sets</span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat__value">{todaySummary.totalReps}</span>
          <span className="summary-stat__label">Total Reps</span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat__value">
            {Math.round(todaySummary.totalVolume)}
          </span>
          <span className="summary-stat__label">Volume (kg)</span>
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
              <SwipeableLogCard key={log.id} log={log} onDelete={() => removeLog(log.id)}>
                <div className="card glass">
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
                      className="btn btn--ghost delete-btn-desktop"
                      onClick={() => removeLog(log.id)}
                      style={{ padding: 'var(--space-2)' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </SwipeableLogCard>
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
            
            // Detect personal record
            const newLog: ExerciseLog = {
              id: 'temp-id',
              user_id: 'temp-user',
              ...logData,
              logged_at: new Date().toISOString(),
            };
            const pr = detectPersonalRecord(newLog, logs);
            if (pr) {
              setPersonalRecord(pr);
            }
            
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
