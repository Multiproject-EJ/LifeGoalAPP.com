import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';

type HabitsModuleProps = {
  session: Session;
};

export function HabitsModule({ session }: HabitsModuleProps) {
  const [showDevNotes, setShowDevNotes] = useState(false);

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

      <div style={{
        background: 'white',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        padding: '2rem',
        marginBottom: '2rem'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.5rem' }}>Habits coming soon</h2>
        <p style={{ margin: '0 0 1.5rem 0', color: '#64748b', lineHeight: '1.6' }}>
          You'll be able to create habits, log completions, and view streaks here.
        </p>
        
        <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#475569', fontWeight: 600 }}>Planned features:</h3>
        <ul style={{ marginLeft: '1.5rem', lineHeight: '1.75', color: '#64748b' }}>
          <li>3-step habit wizard</li>
          <li>Templates for common habits</li>
          <li>Smart tracking (boolean/quantity/duration)</li>
          <li>Streaks & insights</li>
          <li>Reminders & challenges (future)</li>
        </ul>
      </div>
    </div>
  );
}
