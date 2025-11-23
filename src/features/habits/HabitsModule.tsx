import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { listHabitsV2, listTodayHabitLogsV2, type HabitV2Row, type HabitLogV2Row } from '../../services/habitsV2';
import { HabitWizard, type HabitWizardDraft } from './HabitWizard';

type HabitsModuleProps = {
  session: Session;
};

export function HabitsModule({ session }: HabitsModuleProps) {
  const [showDevNotes, setShowDevNotes] = useState(false);
  const [habits, setHabits] = useState<HabitV2Row[]>([]);
  const [todayLogs, setTodayLogs] = useState<HabitLogV2Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [pendingHabitDraft, setPendingHabitDraft] = useState<HabitWizardDraft | null>(null);

  // Load habits and today's logs on mount
  useEffect(() => {
    if (!session) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);

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

        setHabits(habitsData ?? []);
        setTodayLogs(logsData ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load habits right now.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [session]);

  // Handler for wizard completion
  const handleCompleteDraft = (draft: HabitWizardDraft) => {
    console.log('Habit draft', draft);
    setPendingHabitDraft(draft);
    setShowWizard(false);
  };

  // Handler for wizard cancel
  const handleCancelWizard = () => {
    setShowWizard(false);
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

      {/* Habit Wizard */}
      {showWizard && (
        <HabitWizard 
          onCancel={handleCancelWizard}
          onCompleteDraft={handleCompleteDraft}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Your habits</h2>
            <button
              onClick={() => setShowWizard(true)}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    {habit.emoji && (
                      <span style={{ fontSize: '1.5rem' }}>{habit.emoji}</span>
                    )}
                    <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
                      {habit.title}
                    </h3>
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
          ) : habits.length === 0 ? (
            <p style={{ color: '#64748b', margin: 0 }}>
              No habits to check today.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {habits.map((habit) => {
                // Find log for this habit
                const log = todayLogs.find((l) => l.habit_id === habit.id);
                const isDone = log?.done ?? false;
                const logValue = log?.value;

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
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {habit.emoji && (
                        <span style={{ fontSize: '1.25rem' }}>{habit.emoji}</span>
                      )}
                      <span style={{ fontWeight: 500 }}>{habit.title}</span>
                    </div>
                    <div style={{ 
                      fontSize: '0.875rem',
                      color: isDone ? '#15803d' : '#64748b',
                      fontWeight: isDone ? 600 : 400
                    }}>
                      {isDone ? (
                        <>
                          Done
                          {logValue !== null && logValue !== undefined && habit.type !== 'boolean' && (
                            <span> ({logValue} {habit.target_unit || 'units'})</span>
                          )}
                        </>
                      ) : (
                        'Not logged yet'
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
