import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { 
  getSupabaseClient, 
  hasSupabaseCredentials, 
  canUseSupabaseData,
  hasActiveSupabaseSession 
} from '../../lib/supabaseClient';
import { getDemoState, clearDemoData } from '../../services/demoData';

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error';

type ConnectionTestResult = {
  credentialsConfigured: boolean;
  sessionActive: boolean;
  databaseConnected: boolean;
  tablesAccessible: {
    goals: boolean;
    habits: boolean;
    habit_logs: boolean;
    vision_images: boolean;
    checkins: boolean;
    notification_preferences: boolean;
    goal_reflections: boolean;
  };
  errorMessage?: string;
  testTimestamp?: string;
};

type DemoDataSummary = {
  goals: number;
  habits: number;
  habitLogs: number;
  visionImages: number;
  checkins: number;
  goalReflections: number;
  hasNotificationPreferences: boolean;
};

type SupabaseConnectionTestProps = {
  session: Session;
  isDemoExperience: boolean;
};

export function SupabaseConnectionTest({ session, isDemoExperience }: SupabaseConnectionTestProps) {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [demoDataSummary, setDemoDataSummary] = useState<DemoDataSummary | null>(null);
  const [showDemoData, setShowDemoData] = useState(false);

  const runConnectionTest = async () => {
    setStatus('testing');
    setTestResult(null);

    const result: ConnectionTestResult = {
      credentialsConfigured: hasSupabaseCredentials(),
      sessionActive: hasActiveSupabaseSession(),
      databaseConnected: false,
      tablesAccessible: {
        goals: false,
        habits: false,
        habit_logs: false,
        vision_images: false,
        checkins: false,
        notification_preferences: false,
        goal_reflections: false,
      },
      testTimestamp: new Date().toISOString(),
    };

    try {
      if (!result.credentialsConfigured) {
        result.errorMessage = 'Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
        setStatus('error');
        setTestResult(result);
        return;
      }

      if (!result.sessionActive) {
        result.errorMessage = 'No active Supabase session. Please sign in to test database connectivity.';
        setStatus('error');
        setTestResult(result);
        return;
      }

      const client = getSupabaseClient();

      // Test database connectivity by attempting to query each table
      const tableTests = [
        { name: 'goals' as const, query: client.from('goals').select('id').limit(1) },
        { name: 'habits' as const, query: client.from('habits').select('id').limit(1) },
        { name: 'habit_logs' as const, query: client.from('habit_logs').select('id').limit(1) },
        { name: 'vision_images' as const, query: client.from('vision_images').select('id').limit(1) },
        { name: 'checkins' as const, query: client.from('checkins').select('id').limit(1) },
        { name: 'notification_preferences' as const, query: client.from('notification_preferences').select('id').limit(1) },
        { name: 'goal_reflections' as const, query: client.from('goal_reflections').select('id').limit(1) },
      ];

      let allTablesAccessible = true;
      const errors: string[] = [];

      for (const test of tableTests) {
        try {
          const { error } = await test.query;
          if (error) {
            result.tablesAccessible[test.name] = false;
            allTablesAccessible = false;
            errors.push(`${test.name}: ${error.message}`);
          } else {
            result.tablesAccessible[test.name] = true;
          }
        } catch (err) {
          result.tablesAccessible[test.name] = false;
          allTablesAccessible = false;
          errors.push(`${test.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      result.databaseConnected = allTablesAccessible;

      if (errors.length > 0) {
        result.errorMessage = errors.join('\n');
        setStatus('error');
      } else {
        setStatus('success');
      }

      setTestResult(result);
    } catch (error) {
      result.errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setStatus('error');
      setTestResult(result);
    }
  };

  const loadDemoDataSummary = () => {
    const demoState = getDemoState();
    setDemoDataSummary({
      goals: demoState.goals.length,
      habits: demoState.habits.length,
      habitLogs: demoState.habitLogs.length,
      visionImages: demoState.visionImages.length,
      checkins: demoState.checkins.length,
      goalReflections: demoState.goalReflections.length,
      hasNotificationPreferences: demoState.notificationPreferences !== null,
    });
    setShowDemoData(true);
  };

  const handleClearDemoData = () => {
    if (confirm('Are you sure you want to clear all demo data? This action cannot be undone.')) {
      clearDemoData();
      setDemoDataSummary(null);
      setShowDemoData(false);
      alert('Demo data has been cleared. Refresh the page to load fresh demo data.');
    }
  };

  return (
    <section className="account-panel__card" aria-labelledby="connection-test">
      <p className="account-panel__eyebrow">Developer tools</p>
      <h3 id="connection-test">Supabase connection test</h3>
      <p className="account-panel__hint">
        Verify your Supabase configuration and database connectivity. Use this to diagnose SQL issues and RLS policies.
      </p>

      <div className="connection-test">
        <button
          type="button"
          className="btn btn--primary"
          onClick={runConnectionTest}
          disabled={status === 'testing'}
        >
          {status === 'testing' ? 'Testing connection...' : 'Run connection test'}
        </button>

        {testResult && (
          <div className={`connection-test__result connection-test__result--${status}`}>
            <h4>Test Results</h4>
            <dl className="account-panel__details">
              <div>
                <dt>Credentials configured</dt>
                <dd className={testResult.credentialsConfigured ? 'status-success' : 'status-error'}>
                  {testResult.credentialsConfigured ? '✓ Yes' : '✗ No'}
                </dd>
              </div>
              <div>
                <dt>Session active</dt>
                <dd className={testResult.sessionActive ? 'status-success' : 'status-error'}>
                  {testResult.sessionActive ? '✓ Yes' : '✗ No'}
                </dd>
              </div>
              <div>
                <dt>Database connected</dt>
                <dd className={testResult.databaseConnected ? 'status-success' : 'status-error'}>
                  {testResult.databaseConnected ? '✓ Yes' : '✗ No'}
                </dd>
              </div>
            </dl>

            <h5>Table Access (RLS Policies)</h5>
            <dl className="account-panel__details connection-test__tables">
              {Object.entries(testResult.tablesAccessible).map(([tableName, accessible]) => (
                <div key={tableName}>
                  <dt>{tableName}</dt>
                  <dd className={accessible ? 'status-success' : 'status-error'}>
                    {accessible ? '✓ Accessible' : '✗ Not accessible'}
                  </dd>
                </div>
              ))}
            </dl>

            {testResult.errorMessage && (
              <div className="connection-test__error">
                <h5>Error Details</h5>
                <pre>{testResult.errorMessage}</pre>
              </div>
            )}

            <p className="connection-test__timestamp">
              Last tested: {testResult.testTimestamp ? new Date(testResult.testTimestamp).toLocaleString() : 'Never'}
            </p>
          </div>
        )}
      </div>

      {isDemoExperience && (
        <div className="demo-data-controls">
          <h4>Demo Data Management</h4>
          <p className="account-panel__hint">
            View and manage the demo data stored locally. This helps you understand what would be synced to Supabase.
          </p>

          <div className="demo-data-controls__actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={loadDemoDataSummary}
            >
              {showDemoData ? 'Refresh demo data summary' : 'View demo data summary'}
            </button>
            
            <button
              type="button"
              className="btn btn--danger"
              onClick={handleClearDemoData}
            >
              Clear demo data
            </button>
          </div>

          {showDemoData && demoDataSummary && (
            <div className="demo-data-summary">
              <h5>Current Demo Data</h5>
              <dl className="account-panel__details">
                <div>
                  <dt>Goals</dt>
                  <dd>{demoDataSummary.goals} records</dd>
                </div>
                <div>
                  <dt>Habits</dt>
                  <dd>{demoDataSummary.habits} records</dd>
                </div>
                <div>
                  <dt>Habit logs</dt>
                  <dd>{demoDataSummary.habitLogs} records</dd>
                </div>
                <div>
                  <dt>Vision images</dt>
                  <dd>{demoDataSummary.visionImages} records</dd>
                </div>
                <div>
                  <dt>Check-ins</dt>
                  <dd>{demoDataSummary.checkins} records</dd>
                </div>
                <div>
                  <dt>Goal reflections</dt>
                  <dd>{demoDataSummary.goalReflections} records</dd>
                </div>
                <div>
                  <dt>Notification preferences</dt>
                  <dd>{demoDataSummary.hasNotificationPreferences ? 'Configured' : 'Not configured'}</dd>
                </div>
              </dl>
              <p className="connection-test__note">
                💡 This data is stored in localStorage and does not sync to Supabase in demo mode.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
