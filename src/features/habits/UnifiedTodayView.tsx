/**
 * UnifiedTodayView
 * 
 * A wrapper component that presents the HabitsModule's "Today's checklist" 
 * functionality with optional compact styling to mimic the legacy Today view.
 * 
 * This component is the single entry point for the unified habit tracking
 * experience in the PWA.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  listHabitsV2,
  listTodayHabitLogsV2,
  logHabitCompletionV2,
  listHabitLogsForWeekV2,
  type HabitV2Row,
  type HabitLogV2Row,
} from '../../services/habitsV2';
import { isHabitScheduledToday, parseSchedule, getTimesPerWeekProgress } from './scheduleInterpreter';
import { updateSpinsAvailable } from '../../services/dailySpin';
import { useGamification } from '../../hooks/useGamification';
import { XP_REWARDS } from '../../types/gamification';

type ViewVariant = 'full' | 'compact' | 'minimal';

interface UnifiedTodayViewProps {
  session: Session;
  variant?: ViewVariant;
  /** Show quick journal prompt below checklist */
  showJournalPrompt?: boolean;
  /** Callback when a habit is completed */
  onHabitComplete?: (habitId: string) => void;
  /** Maximum number of habits to show in minimal variant */
  maxHabitsInMinimal?: number;
}

export function UnifiedTodayView({
  session,
  variant = 'full',
  showJournalPrompt = false,
  onHabitComplete,
  maxHabitsInMinimal = 5,
}: UnifiedTodayViewProps) {
  const [habits, setHabits] = useState<HabitV2Row[]>([]);
  const [todayLogs, setTodayLogs] = useState<HabitLogV2Row[]>([]);
  const [weekLogs, setWeekLogs] = useState<HabitLogV2Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggingHabitIds, setLoggingHabitIds] = useState<Set<string>>(new Set());
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const { earnXP, recordActivity } = useGamification(session);

  // Load habits and logs on mount
  useEffect(() => {
    if (!session) return;
    loadData();
  }, [session]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load habits
      const { data: habitsData, error: habitsError } = await listHabitsV2();
      if (habitsError) throw new Error(habitsError.message);

      const loadedHabits = habitsData ?? [];
      setHabits(loadedHabits);

      // Load today's logs
      const { data: logsData, error: logsError } = await listTodayHabitLogsV2(session.user.id);
      if (logsError) throw new Error(logsError.message);
      setTodayLogs(logsData ?? []);

      // Load week logs for times_per_week support
      if (loadedHabits.length > 0) {
        const habitIds = loadedHabits.map(h => h.id);
        const { data: weekLogsData, error: weekLogsError } = await listHabitLogsForWeekV2(
          session.user.id,
          habitIds
        );
        if (weekLogsError) {
          console.error('Error loading week logs:', weekLogsError);
        } else {
          setWeekLogs(weekLogsData ?? []);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load habits');
    } finally {
      setLoading(false);
    }
  };

  // Compute habits scheduled for today
  const todaysHabits = useMemo(() => {
    const today = new Date();
    const filtered = habits.filter((habit) => {
      const habitWeekLogs = weekLogs.filter(log => log.habit_id === habit.id);
      return isHabitScheduledToday(habit, today, habitWeekLogs);
    });

    // For minimal variant, limit the number of habits shown
    if (variant === 'minimal' && filtered.length > maxHabitsInMinimal) {
      return filtered.slice(0, maxHabitsInMinimal);
    }

    return filtered;
  }, [habits, weekLogs, variant, maxHabitsInMinimal]);

  // Compute completion stats
  const stats = useMemo(() => {
    const total = todaysHabits.length;
    const completed = todaysHabits.filter(habit => 
      todayLogs.some(log => log.habit_id === habit.id && log.done)
    ).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, percentage };
  }, [todaysHabits, todayLogs]);

  // Helper to check and award spins after habit completion
  const checkAndAwardSpins = useCallback(async (completedHabits: HabitV2Row[], logs: HabitLogV2Row[]) => {
    if (!session) return;

    try {
      const totalHabits = completedHabits.length;
      const completedCount = completedHabits.filter(habit =>
        logs.some(log => log.habit_id === habit.id && log.done)
      ).length;

      // Award spins based on completion
      // 1 spin for completing at least 1 habit
      // 2 spins for completing all habits
      let spinsToAward = 0;
      if (completedCount > 0) {
        spinsToAward = 1;
      }
      if (totalHabits > 0 && completedCount === totalHabits) {
        spinsToAward = 2;
      }

      if (spinsToAward > 0) {
        await updateSpinsAvailable(session.user.id, spinsToAward);
      }
    } catch (err) {
      // Silently fail - don't interrupt the habit completion flow
      console.error('Failed to award spins:', err);
    }
  }, [session]);

  // Handler for marking a habit as done
  const handleMarkDone = useCallback(async (habitId: string, type: HabitV2Row['type']) => {
    if (type !== 'boolean') return;
    if (!session) {
      setError('Session expired. Please refresh.');
      return;
    }

    setLoggingHabitIds(prev => new Set(prev).add(habitId));
    setError(null);

    try {
      const { error: logError } = await logHabitCompletionV2(
        { habit_id: habitId, done: true, value: null },
        session.user.id
      );

      if (logError) throw new Error(logError.message);

      // Reload logs
      const { data: logsData } = await listTodayHabitLogsV2(session.user.id);
      setTodayLogs(logsData ?? []);

      // Check and award spins
      await checkAndAwardSpins(todaysHabits, logsData ?? []);

      // 🎮 Award XP for habit completion
      const now = new Date();
      const xpAmount = now.getHours() < 9
        ? XP_REWARDS.HABIT_COMPLETE_EARLY
        : XP_REWARDS.HABIT_COMPLETE;
      await earnXP(xpAmount, 'habit_complete', habitId);
      await recordActivity();

      // Callback
      onHabitComplete?.(habitId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log habit');
    } finally {
      setLoggingHabitIds(prev => {
        const next = new Set(prev);
        next.delete(habitId);
        return next;
      });
    }
  }, [session, onHabitComplete, todaysHabits, checkAndAwardSpins]);

  // Handler for logging a value (quantity/duration)
  const handleLogValue = useCallback(async (habit: HabitV2Row, value: number) => {
    if (!session) {
      setError('Session expired. Please refresh.');
      return;
    }

    setLoggingHabitIds(prev => new Set(prev).add(habit.id));
    setError(null);

    try {
      const { error: logError } = await logHabitCompletionV2(
        { habit_id: habit.id, done: true, value },
        session.user.id
      );

      if (logError) throw new Error(logError.message);

      // Reload logs and clear input
      const { data: logsData } = await listTodayHabitLogsV2(session.user.id);
      setTodayLogs(logsData ?? []);
      setInputValues(prev => {
        const next = { ...prev };
        delete next[habit.id];
        return next;
      });

      // Check and award spins
      await checkAndAwardSpins(todaysHabits, logsData ?? []);

      // 🎮 Award XP for logged habit completion
      const now = new Date();
      const xpAmount = now.getHours() < 9
        ? XP_REWARDS.HABIT_COMPLETE_EARLY
        : XP_REWARDS.HABIT_COMPLETE;
      await earnXP(xpAmount, 'habit_complete', habit.id);
      await recordActivity();

      onHabitComplete?.(habit.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log habit');
    } finally {
      setLoggingHabitIds(prev => {
        const next = new Set(prev);
        next.delete(habit.id);
        return next;
      });
    }
  }, [session, onHabitComplete, todaysHabits, checkAndAwardSpins]);

  // Date display
  const dateLabel = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  // Styles based on variant
  const containerStyle = useMemo(() => {
    const base = {
      background: 'white',
      borderRadius: '12px',
      overflow: 'hidden',
    };

    if (variant === 'minimal') {
      return { ...base, border: '1px solid #e2e8f0' };
    }
    if (variant === 'compact') {
      return { ...base, border: '1px solid #e2e8f0' };
    }
    return { ...base, border: '2px solid #e2e8f0' };
  }, [variant]);

  const headerStyle = useMemo(() => {
    if (variant === 'minimal') {
      return { padding: '1rem', borderBottom: '1px solid #e2e8f0' };
    }
    if (variant === 'compact') {
      return { padding: '1.25rem', borderBottom: '1px solid #e2e8f0' };
    }
    return { padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0' };
  }, [variant]);

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ 
              margin: 0, 
              fontSize: variant === 'minimal' ? '1.125rem' : '1.5rem',
              fontWeight: 700,
              color: '#1e293b',
            }}>
              Today's Checklist
            </h2>
            {variant !== 'minimal' && (
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                {dateLabel}
              </p>
            )}
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <div style={{ 
              fontSize: variant === 'minimal' ? '1rem' : '1.25rem', 
              fontWeight: 700,
              color: stats.percentage === 100 ? '#16a34a' : '#667eea',
            }}>
              {stats.completed}/{stats.total}
            </div>
            {variant !== 'minimal' && (
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {stats.percentage}% complete
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {variant !== 'minimal' && stats.total > 0 && (
          <div style={{
            marginTop: '1rem',
            height: '8px',
            background: '#e2e8f0',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${stats.percentage}%`,
              height: '100%',
              background: stats.percentage === 100 
                ? 'linear-gradient(90deg, #10b981, #059669)' 
                : 'linear-gradient(90deg, #667eea, #764ba2)',
              transition: 'width 0.3s ease',
            }} />
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div style={{
          padding: '1rem',
          margin: variant === 'minimal' ? '0.5rem' : '1rem',
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          borderRadius: '8px',
          color: '#991b1b',
          fontSize: '0.875rem',
        }}>
          {error}
        </div>
      )}

      {/* Content */}
      <div style={{ padding: variant === 'minimal' ? '0.5rem' : '1rem' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
            Loading habits…
          </div>
        ) : todaysHabits.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
            <p style={{ margin: 0 }}>No habits scheduled for today.</p>
            {variant !== 'minimal' && (
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
                Create habits in the Habits module to see them here.
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {todaysHabits.map((habit) => {
              const log = todayLogs.find((l) => l.habit_id === habit.id);
              const isDone = log?.done ?? false;
              const logValue = log?.value;
              const isLogging = loggingHabitIds.has(habit.id);
              const inputValue = inputValues[habit.id] || '';
              
              // Get weekly progress for times_per_week habits
              const schedule = parseSchedule(habit.schedule);
              const habitWeekLogs = weekLogs.filter(l => l.habit_id === habit.id);
              let weekProgress: { completed: number; target: number } | null = null;
              if (schedule?.mode === 'times_per_week' && schedule.timesPerWeek) {
                const progress = getTimesPerWeekProgress(schedule, habitWeekLogs);
                weekProgress = { completed: progress.completed, target: progress.target };
              }

              return (
                <div
                  key={habit.id}
                  style={{
                    background: isDone ? '#f0fdf4' : '#f8fafc',
                    border: `1px solid ${isDone ? '#bbf7d0' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    padding: variant === 'minimal' ? '0.75rem' : '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                    {habit.emoji && variant !== 'minimal' && (
                      <span style={{ fontSize: variant === 'compact' ? '1rem' : '1.25rem' }}>
                        {habit.emoji}
                      </span>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        flexWrap: 'wrap' 
                      }}>
                        <span style={{ 
                          fontWeight: 500,
                          fontSize: variant === 'minimal' ? '0.875rem' : '1rem',
                          color: isDone ? '#166534' : '#1e293b',
                        }}>
                          {variant === 'minimal' && habit.emoji && `${habit.emoji} `}
                          {habit.title}
                        </span>
                        
                        {/* Weekly progress badge */}
                        {weekProgress && variant !== 'minimal' && (
                          <span style={{
                            fontSize: '0.625rem',
                            background: '#e0e7ff',
                            color: '#4338ca',
                            padding: '0.125rem 0.375rem',
                            borderRadius: '4px',
                            fontWeight: 600,
                          }}>
                            {weekProgress.completed}/{weekProgress.target} this week
                          </span>
                        )}
                      </div>
                      
                      {/* Target info for non-boolean habits */}
                      {!isDone && habit.type !== 'boolean' && habit.target_num && variant !== 'minimal' && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                          Target: {habit.target_num} {habit.target_unit || 'units'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action area */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isDone ? (
                      <div style={{ 
                        fontSize: '0.875rem',
                        color: '#15803d',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}>
                        ✓ Done
                        {logValue !== null && logValue !== undefined && habit.type !== 'boolean' && (
                          <span style={{ fontWeight: 400 }}> – {logValue}</span>
                        )}
                      </div>
                    ) : (
                      <>
                        {habit.type === 'boolean' ? (
                          <button
                            onClick={() => handleMarkDone(habit.id, habit.type)}
                            disabled={isLogging}
                            style={{
                              padding: variant === 'minimal' ? '0.375rem 0.75rem' : '0.5rem 1rem',
                              background: isLogging ? '#94a3b8' : '#667eea',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: variant === 'minimal' ? '0.75rem' : '0.875rem',
                              fontWeight: 600,
                              cursor: isLogging ? 'not-allowed' : 'pointer',
                              opacity: isLogging ? 0.7 : 1,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {isLogging ? '…' : 'Done'}
                          </button>
                        ) : variant !== 'minimal' ? (
                          <>
                            <input
                              type="number"
                              min="0"
                              step={habit.type === 'duration' ? '1' : '1'}
                              value={inputValue}
                              onChange={(e) => setInputValues(prev => ({ ...prev, [habit.id]: e.target.value }))}
                              placeholder="0"
                              disabled={isLogging}
                              style={{
                                width: '60px',
                                padding: '0.5rem',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                textAlign: 'center',
                              }}
                            />
                            <button
                              onClick={() => {
                                const value = parseFloat(inputValue);
                                if (!isNaN(value) && value > 0) {
                                  handleLogValue(habit, value);
                                }
                              }}
                              disabled={isLogging || !inputValue || parseFloat(inputValue) <= 0}
                              style={{
                                padding: '0.5rem 0.75rem',
                                background: isLogging || !inputValue || parseFloat(inputValue) <= 0 
                                  ? '#94a3b8' 
                                  : '#667eea',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: isLogging || !inputValue || parseFloat(inputValue) <= 0 
                                  ? 'not-allowed' 
                                  : 'pointer',
                                opacity: isLogging || !inputValue || parseFloat(inputValue) <= 0 ? 0.7 : 1,
                              }}
                            >
                              Log
                            </button>
                          </>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {habit.type}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Show more link for minimal variant */}
        {variant === 'minimal' && habits.length > maxHabitsInMinimal && (
          <div style={{ 
            marginTop: '0.75rem', 
            textAlign: 'center',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '0.75rem',
          }}>
            <span style={{ 
              fontSize: '0.75rem', 
              color: '#667eea',
              cursor: 'pointer',
            }}>
              + {habits.length - maxHabitsInMinimal} more habits
            </span>
          </div>
        )}
      </div>

      {/* Quick journal prompt */}
      {showJournalPrompt && variant !== 'minimal' && (
        <div style={{
          padding: '1rem',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
        }}>
          <p style={{ 
            margin: 0, 
            fontSize: '0.875rem', 
            color: '#64748b',
            textAlign: 'center',
          }}>
            💭 How's your day going? Reflect in your journal.
          </p>
        </div>
      )}
    </div>
  );
}

export default UnifiedTodayView;
