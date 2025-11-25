import { useState, useEffect, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import { listHabitsV2, listTodayHabitLogsV2, createHabitV2, logHabitCompletionV2, listHabitStreaksV2, type HabitV2Row, type HabitLogV2Row, type HabitStreakRow } from '../../services/habitsV2';
import { HabitWizard, type HabitWizardDraft } from './HabitWizard';
import { loadHabitTemplates, type HabitTemplate } from './habitTemplates';
import { HabitsInsights } from './HabitsInsights';
import { isHabitScheduledToday } from './scheduleInterpreter';
import type { Database } from '../../lib/database.types';

type HabitsModuleProps = {
  session: Session;
};

export function HabitsModule({ session }: HabitsModuleProps) {
  const [showDevNotes, setShowDevNotes] = useState(false);
  const [habits, setHabits] = useState<HabitV2Row[]>([]);
  const [todayLogs, setTodayLogs] = useState<HabitLogV2Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Streaks state
  const [streaks, setStreaks] = useState<HabitStreakRow[]>([]);
  const [streaksLoading, setStreaksLoading] = useState(false);
  const [streaksError, setStreaksError] = useState<string | null>(null);
  
  // Wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [pendingHabitDraft, setPendingHabitDraft] = useState<HabitWizardDraft | null>(null);
  const [wizardInitialDraft, setWizardInitialDraft] = useState<HabitWizardDraft | undefined>(undefined);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Templates state
  const [templates, setTemplates] = useState<HabitTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  
  // Logging state for tracking in-flight habit logging
  const [loggingHabitIds, setLoggingHabitIds] = useState<Set<string>>(new Set());
  
  // Input values for quantity/duration habits
  const [habitInputValues, setHabitInputValues] = useState<Record<string, string>>({});

  // Compute habits scheduled for today using the schedule interpreter
  const todaysHabits = useMemo(() => {
    const today = new Date();
    return habits.filter((habit) => isHabitScheduledToday(habit, today));
  }, [habits]);

  // Load habits and today's logs on mount
  useEffect(() => {
    if (!session) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      setStreaksLoading(true);
      setStreaksError(null);

      try {
        // Load habits
        const { data: habitsData, error: habitsError } = await listHabitsV2();
        if (habitsError) {
          throw new Error(habitsError.message);
        }

        // Load today's logs
        const { data: logsData, error: logsError } = await listTodayHabitLogsV2(session.user.id);
        if (logsError) {
          throw new Error(logsError.message);
        }

        // Load streaks
        const { data: streaksData, error: streaksApiError } = await listHabitStreaksV2(session.user.id);
        if (streaksApiError) {
          console.error('Error loading streaks:', streaksApiError);
          setStreaksError(streaksApiError.message);
        } else {
          setStreaks(streaksData ?? []);
        }

        setHabits(habitsData ?? []);
        setTodayLogs(logsData ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load habits right now.');
      } finally {
        setLoading(false);
        setStreaksLoading(false);
      }
    };

    loadData();
  }, [session]);

  // Load templates on mount
  useEffect(() => {
    const loadTemplatesData = async () => {
      setTemplatesLoading(true);
      setTemplatesError(null);

      try {
        const templatesData = await loadHabitTemplates();
        setTemplates(templatesData);
      } catch (err) {
        setTemplatesError(err instanceof Error ? err.message : 'Failed to load templates');
        console.error('Error loading habit templates:', err);
      } finally {
        setTemplatesLoading(false);
      }
    };

    loadTemplatesData();
  }, []);

  // Helper to reload today's logs
  const reloadTodayLogs = async () => {
    if (!session) return;
    
    try {
      const { data: logsData, error: logsError } = await listTodayHabitLogsV2(session.user.id);
      if (logsError) {
        throw new Error(logsError.message);
      }
      setTodayLogs(logsData ?? []);
    } catch (err) {
      console.error('Error reloading today\'s logs:', err);
    }
  };

  // Handler for marking a habit as done
  const handleMarkHabitDone = async (habitId: string, type: HabitV2Row['type']) => {
    // Only handle boolean habits for now
    if (type !== 'boolean') {
      return;
    }

    if (!session) {
      setError('Session expired. Please refresh the page.');
      return;
    }

    // Mark habit as logging
    setLoggingHabitIds(prev => new Set(prev).add(habitId));
    setError(null);

    try {
      // Create log entry for boolean habit
      const { data: newLog, error: logError } = await logHabitCompletionV2(
        {
          habit_id: habitId,
          done: true,
          value: null, // For boolean habits, value is null
        },
        session.user.id
      );

      if (logError) {
        throw new Error(logError.message);
      }

      if (!newLog) {
        throw new Error('Failed to log habit - no data returned');
      }

      // Reload today's logs to update the UI
      await reloadTodayLogs();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log habit');
      console.error('Error logging habit:', err);
    } finally {
      // Remove habit from logging state
      setLoggingHabitIds(prev => {
        const next = new Set(prev);
        next.delete(habitId);
        return next;
      });
    }
  };

  // Handler for logging habit with a numeric value (quantity or duration)
  const handleLogHabitValue = async (habit: HabitV2Row, value: number) => {
    if (!session) {
      setError('Session expired. Please refresh the page.');
      return;
    }

    // Mark habit as logging
    setLoggingHabitIds(prev => new Set(prev).add(habit.id));
    setError(null);

    try {
      // Create log entry with the value
      const { data: newLog, error: logError } = await logHabitCompletionV2(
        {
          habit_id: habit.id,
          done: true,
          value: value,
        },
        session.user.id
      );

      if (logError) {
        throw new Error(logError.message);
      }

      if (!newLog) {
        throw new Error('Failed to log habit - no data returned');
      }

      // Reload today's logs to update the UI
      await reloadTodayLogs();
      
      // Clear the input value after successful log
      setHabitInputValues(prev => {
        const next = { ...prev };
        delete next[habit.id];
        return next;
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log habit');
      console.error('Error logging habit:', err);
    } finally {
      // Remove habit from logging state
      setLoggingHabitIds(prev => {
        const next = new Set(prev);
        next.delete(habit.id);
        return next;
      });
    }
  };

  // Handler for wizard completion
  const handleCompleteDraft = async (draft: HabitWizardDraft) => {
    console.log('Habit draft', draft);
    setPendingHabitDraft(draft);
    
    // Clear any previous messages
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Map HabitWizardDraft to habits_v2.Insert
      const insertPayload: Omit<Database['public']['Tables']['habits_v2']['Insert'], 'user_id'> = {
        title: draft.title,
        emoji: draft.emoji,
        type: draft.type,
        target_num: draft.targetValue ?? null,
        target_unit: draft.targetUnit ?? null,
        schedule: draft.schedule as unknown as Database['public']['Tables']['habits_v2']['Insert']['schedule'],
        archived: false,
      };
      
      // Call createHabitV2
      const { data: newHabit, error: createError } = await createHabitV2(insertPayload, session.user.id);
      
      if (createError) {
        throw new Error(createError.message);
      }
      
      if (!newHabit) {
        throw new Error('Failed to create habit - no data returned');
      }
      
      // Success: hide wizard, clear draft, refresh list
      setShowWizard(false);
      setPendingHabitDraft(null);
      setSuccessMessage(`Habit "${draft.title}" created successfully!`);
      
      // Prepend new habit to local state for immediate feedback
      setHabits([newHabit, ...habits]);
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (err) {
      // Show error but keep wizard open
      setError(err instanceof Error ? err.message : 'Failed to create habit');
      console.error('Error creating habit:', err);
    }
  };

  // Handler for wizard cancel
  const handleCancelWizard = () => {
    setShowWizard(false);
    setWizardInitialDraft(undefined);
  };

  // Helper to map template schedule to ScheduleDraft choice
  const mapTemplateScheduleToChoice = (schedule: HabitTemplate['schedule']): 'every_day' | 'specific_days' | 'x_per_week' => {
    switch (schedule.mode) {
      case 'daily':
        return 'every_day';
      case 'specific_days':
        return 'specific_days';
      case 'times_per_week':
        return 'x_per_week';
      case 'every_n_days':
        // Map every_n_days to every_day for now (simplified)
        return 'every_day';
      default:
        return 'every_day';
    }
  };

  // Handler for template click
  const handleTemplateClick = (template: HabitTemplate) => {
    // Map template to HabitWizardDraft
    const draft: HabitWizardDraft = {
      title: template.title,
      emoji: template.emoji ? template.emoji : null,
      type: template.type,
      targetValue: template.target_num ?? null,
      targetUnit: template.target_unit ?? null,
      schedule: {
        choice: mapTemplateScheduleToChoice(template.schedule)
      },
      remindersEnabled: (template.reminders && template.reminders.length > 0) || false,
      reminderTimes: template.reminders || []
    };

    // Set the initial draft and open wizard
    setWizardInitialDraft(draft);
    setShowWizard(true);
  };

  return (
    <div className="habits-module-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        color: 'white',
        padding: '3rem 2rem',
        borderRadius: '16px',
        marginBottom: '2rem',
        boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
      }}>
        <h1 style={{ margin: '0 0 1rem 0', fontSize: '2.5rem', fontWeight: '800' }}>
          Habits
        </h1>
        <p style={{ margin: 0, fontSize: '1.125rem', opacity: 0.95 }}>
          Create and track habits that support your goals.
        </p>
      </div>

      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '2rem'
      }}>
        <button
          onClick={() => setShowDevNotes(!showDevNotes)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            color: '#64748b',
            padding: 0,
            fontWeight: 500
          }}
        >
          <span>{showDevNotes ? '▼' : '▶'}</span>
          Developer setup notes (Supabase & Edge functions)
        </button>
        
        {showDevNotes && (
          <div style={{ fontSize: '0.875rem', lineHeight: '1.6', marginTop: '1rem', color: '#475569' }}>
            <ul style={{ marginLeft: '1.5rem', marginBottom: 0 }}>
              <li>SQL migrations for <code>habits_v2</code>, <code>habit_logs_v2</code>, <code>habit_reminders</code>, and related tables exist under <code>/supabase/migrations/</code></li>
              <li>Edge Functions live under <code>/supabase/functions/</code></li>
              <li>More details are in <code>/HABITS_SETUP_GUIDE.md</code></li>
            </ul>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '2rem',
          color: '#991b1b'
        }}>
          {error}
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div style={{
          background: '#d1fae5',
          border: '1px solid #6ee7b7',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '2rem',
          color: '#065f46'
        }}>
          {successMessage}
        </div>
      )}

      {/* Templates Gallery */}
      {!showWizard && (
        <div style={{
          background: 'white',
          border: '2px solid #e2e8f0',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Templates</h2>
            <button
              onClick={() => {
                setWizardInitialDraft(undefined);
                setShowWizard(true);
              }}
              style={{
                padding: '0.5rem 1rem',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span style={{ fontSize: '1.125rem' }}>+</span>
              New habit
            </button>
          </div>

          {templatesLoading && (
            <p style={{ color: '#64748b', margin: 0 }}>Loading templates…</p>
          )}

          {templatesError && (
            <p style={{ color: '#dc2626', fontSize: '0.875rem', margin: 0 }}>
              {templatesError}
            </p>
          )}

          {!templatesLoading && !templatesError && templates.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '1rem'
            }}>
              {templates.map((template) => {
                // Generate a short schedule description
                let scheduleDesc = '';
                if (template.schedule.mode === 'daily') {
                  scheduleDesc = 'Daily';
                } else if (template.schedule.mode === 'specific_days') {
                  scheduleDesc = `${template.schedule.days?.length || 0} days/week`;
                } else if (template.schedule.mode === 'times_per_week') {
                  scheduleDesc = `${template.schedule.value || 0}x/week`;
                } else if (template.schedule.mode === 'every_n_days') {
                  scheduleDesc = `Every ${template.schedule.value || 0} days`;
                }

                // Use a unique key combining title and emoji
                const templateKey = `${template.emoji}-${template.title}`;

                return (
                  <button
                    key={templateKey}
                    onClick={() => handleTemplateClick(template)}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '1rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#667eea';
                      e.currentTarget.style.background = '#f1f5f9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                  >
                    <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>
                      {template.emoji}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>
                      {template.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {template.type} • {scheduleDesc}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!templatesLoading && !templatesError && templates.length === 0 && (
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
              No templates available.
            </p>
          )}
        </div>
      )}

      {/* Habit Wizard */}
      {showWizard && (
        <HabitWizard 
          onCancel={handleCancelWizard}
          onCompleteDraft={handleCompleteDraft}
          initialDraft={wizardInitialDraft}
        />
      )}

      {/* Debug: Show pending draft */}
      {pendingHabitDraft && !showWizard && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #6ee7b7',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '2rem',
          fontSize: '0.875rem'
        }}>
          <strong>Draft created:</strong> {pendingHabitDraft.title} ({pendingHabitDraft.type})
        </div>
      )}

      {/* Two-column layout: Your habits | Today's checklist */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '2rem',
        marginBottom: '2rem'
      }}>
        {/* Left column: Your habits */}
        <div style={{
          background: 'white',
          border: '2px solid #e2e8f0',
          borderRadius: '12px',
          padding: '2rem'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Your habits</h2>
          </div>

          {loading ? (
            <p style={{ color: '#64748b', margin: 0 }}>Loading habits…</p>
          ) : habits.length === 0 ? (
            <p style={{ color: '#64748b', margin: 0 }}>
              No habits yet. Create your first habit to get started!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {habits.map((habit) => (
                <div
                  key={habit.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {habit.emoji && (
                        <span style={{ fontSize: '1.5rem' }}>{habit.emoji}</span>
                      )}
                      <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
                        {habit.title}
                      </h3>
                    </div>
                    {/* Archive button - only visible if habit is not archived */}
                    {!habit.archived && (
                      <button
                        type="button"
                        onClick={() => {
                          // TODO: wire archive functionality
                          console.log('Archive habit:', habit.id);
                        }}
                        style={{
                          background: 'transparent',
                          border: '1px solid #e2e8f0',
                          borderRadius: '4px',
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          color: '#64748b',
                          cursor: 'pointer',
                        }}
                        title="Archive this habit"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div>
                      <strong>Type:</strong> {habit.type}
                      {habit.type !== 'boolean' && habit.target_num && (
                        <span> ({habit.target_num} {habit.target_unit || 'units'})</span>
                      )}
                    </div>
                    <div>
                      <strong>Schedule:</strong> Custom schedule
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column: Today's checklist */}
        <div style={{
          background: 'white',
          border: '2px solid #e2e8f0',
          borderRadius: '12px',
          padding: '2rem'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem' }}>Today's checklist</h2>

          {loading ? (
            <p style={{ color: '#64748b', margin: 0 }}>Loading today's status…</p>
          ) : todaysHabits.length === 0 ? (
            <p style={{ color: '#64748b', margin: 0 }}>
              No habits to check today.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {todaysHabits.map((habit) => {
                // Find log for this habit
                const log = todayLogs.find((l) => l.habit_id === habit.id);
                const isDone = log?.done ?? false;
                const logValue = log?.value;
                const isLogging = loggingHabitIds.has(habit.id);
                const inputValue = habitInputValues[habit.id] || '';

                return (
                  <div
                    key={habit.id}
                    style={{
                      background: isDone ? '#f0fdf4' : '#f8fafc',
                      border: `1px solid ${isDone ? '#bbf7d0' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                      {habit.emoji && (
                        <span style={{ fontSize: '1.25rem' }}>{habit.emoji}</span>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500 }}>{habit.title}</div>
                        {!isDone && habit.type !== 'boolean' && habit.target_num && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                            Target: {habit.target_num} {habit.target_unit || 'units'}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {isDone ? (
                        <div style={{ 
                          fontSize: '0.875rem',
                          color: '#15803d',
                          fontWeight: 600,
                          whiteSpace: 'nowrap'
                        }}>
                          Done
                          {logValue !== null && logValue !== undefined && habit.type !== 'boolean' && (
                            <span> – {logValue} {habit.target_unit || 'units'}</span>
                          )}
                        </div>
                      ) : (
                        <>
                          {habit.type === 'boolean' ? (
                            <button
                              onClick={() => handleMarkHabitDone(habit.id, habit.type)}
                              disabled={isLogging}
                              style={{
                                padding: '0.5rem 1rem',
                                background: isLogging ? '#94a3b8' : '#667eea',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: isLogging ? 'not-allowed' : 'pointer',
                                opacity: isLogging ? 0.7 : 1,
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {isLogging ? 'Saving…' : 'Mark done'}
                            </button>
                          ) : habit.type === 'quantity' ? (
                            <>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={inputValue}
                                onChange={(e) => setHabitInputValues(prev => ({ ...prev, [habit.id]: e.target.value }))}
                                placeholder="0"
                                disabled={isLogging}
                                style={{
                                  width: '70px',
                                  padding: '0.5rem',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '6px',
                                  fontSize: '0.875rem',
                                  textAlign: 'center'
                                }}
                              />
                              <button
                                onClick={() => {
                                  const value = parseFloat(inputValue);
                                  if (!isNaN(value) && value > 0) {
                                    handleLogHabitValue(habit, value);
                                  }
                                }}
                                disabled={isLogging || !inputValue || parseFloat(inputValue) <= 0}
                                style={{
                                  padding: '0.5rem 1rem',
                                  background: isLogging || !inputValue || parseFloat(inputValue) <= 0 ? '#94a3b8' : '#667eea',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.875rem',
                                  fontWeight: 600,
                                  cursor: isLogging || !inputValue || parseFloat(inputValue) <= 0 ? 'not-allowed' : 'pointer',
                                  opacity: isLogging || !inputValue || parseFloat(inputValue) <= 0 ? 0.7 : 1,
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {isLogging ? 'Saving…' : 'Log'}
                              </button>
                            </>
                          ) : habit.type === 'duration' ? (
                            <>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={inputValue}
                                onChange={(e) => setHabitInputValues(prev => ({ ...prev, [habit.id]: e.target.value }))}
                                placeholder="0"
                                disabled={isLogging}
                                style={{
                                  width: '70px',
                                  padding: '0.5rem',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '6px',
                                  fontSize: '0.875rem',
                                  textAlign: 'center'
                                }}
                              />
                              <button
                                onClick={() => {
                                  const value = parseFloat(inputValue);
                                  if (!isNaN(value) && value > 0) {
                                    handleLogHabitValue(habit, value);
                                  }
                                }}
                                disabled={isLogging || !inputValue || parseFloat(inputValue) <= 0}
                                style={{
                                  padding: '0.5rem 0.75rem',
                                  background: isLogging || !inputValue || parseFloat(inputValue) <= 0 ? '#94a3b8' : '#667eea',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.875rem',
                                  fontWeight: 600,
                                  cursor: isLogging || !inputValue || parseFloat(inputValue) <= 0 ? 'not-allowed' : 'pointer',
                                  opacity: isLogging || !inputValue || parseFloat(inputValue) <= 0 ? 0.7 : 1,
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {isLogging ? 'Saving…' : 'Log min'}
                              </button>
                            </>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Streaks Section */}
      <div style={{
        background: 'white',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        padding: '2rem',
        marginBottom: '2rem'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem' }}>Streaks</h2>

        {streaksLoading ? (
          <p style={{ color: '#64748b', margin: 0 }}>Loading streaks…</p>
        ) : streaksError ? (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            padding: '0.75rem',
            fontSize: '0.875rem',
            color: '#991b1b'
          }}>
            {streaksError}
          </div>
        ) : streaks.length === 0 ? (
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>
            Start logging habits to see streaks here.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {streaks.map((streak) => {
              // Find the corresponding habit
              const habit = habits.find(h => h.id === streak.habit_id);
              if (!habit) return null;

              return (
                <div
                  key={streak.habit_id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {habit.emoji && (
                      <span style={{ fontSize: '1.25rem' }}>{habit.emoji}</span>
                    )}
                    <div style={{ fontWeight: 500 }}>{habit.title}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span>🔥</span>
                      <span style={{ color: '#64748b' }}>Current:</span>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{streak.current_streak} days</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span>⭐</span>
                      <span style={{ color: '#64748b' }}>Best:</span>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{streak.best_streak} days</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Insights Section */}
      <HabitsInsights session={session} habits={habits} />
    </div>
  );
}
