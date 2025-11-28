import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  fetchReminderPrefsFromDB,
  upsertReminderPrefsInDB,
  triggerReminderCron,
  type UserReminderPrefsRow,
} from '../../services/reminderPrefs';
import { isDemoSession } from '../../services/demoSession';
import { hasSupabaseCredentials } from '../../lib/supabaseClient';

type StatusState = { kind: 'success' | 'error' | 'info'; message: string } | null;

type Props = {
  session: Session;
};

/**
 * ReminderScheduleSettings component allows users to configure their daily
 * reminder window (timezone, start time, end time) for habit notifications.
 */
export function ReminderScheduleSettings({ session }: Props) {
  const isDemoExperience = isDemoSession(session);
  const fallbackTimezone = useMemo(() => {
    if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
      return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
    }
    return 'UTC';
  }, []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<StatusState>(null);
  const [cronResult, setCronResult] = useState<string | null>(null);
  const [triggeringCron, setTriggeringCron] = useState(false);

  // Form state
  const [timezone, setTimezone] = useState(fallbackTimezone);
  const [windowStart, setWindowStart] = useState('08:00');
  const [windowEnd, setWindowEnd] = useState('10:00');

  // Load existing preferences
  useEffect(() => {
    let isActive = true;
    setLoading(true);

    fetchReminderPrefsFromDB(session.user.id)
      .then(({ data, error }) => {
        if (!isActive) return;
        
        if (error) {
          console.error('Failed to load reminder preferences:', error);
          // Use defaults on error
          return;
        }

        if (data) {
          setTimezone(data.timezone || fallbackTimezone);
          // Convert HH:MM:SS to HH:MM for time inputs
          setWindowStart(data.window_start?.substring(0, 5) || '08:00');
          setWindowEnd(data.window_end?.substring(0, 5) || '10:00');
        }
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [session.user.id, fallbackTimezone]);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);

    try {
      const { error } = await upsertReminderPrefsInDB(session.user.id, {
        timezone,
        windowStart: `${windowStart}:00`,
        windowEnd: `${windowEnd}:00`,
      });

      if (error) throw error;

      setStatus({ kind: 'success', message: 'Reminder schedule saved successfully.' });
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to save reminder schedule.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestCron = async () => {
    setTriggeringCron(true);
    setCronResult(null);
    setStatus(null);

    try {
      if (!hasSupabaseCredentials()) {
        setCronResult('⚠️ Supabase not configured. Cannot test CRON in demo mode.');
        return;
      }

      const result = await triggerReminderCron(session.access_token);
      
      if (result.success) {
        setCronResult(`✓ ${result.message || 'CRON executed successfully'}`);
        if (result.sent !== undefined) {
          setCronResult(prev => `${prev} (${result.sent} notifications sent)`);
        }
      } else {
        setCronResult(`✗ ${result.error || 'CRON failed'}`);
      }
    } catch (error) {
      setCronResult(`✗ ${error instanceof Error ? error.message : 'Failed to trigger CRON'}`);
    } finally {
      setTriggeringCron(false);
    }
  };

  const handleResetToDetected = () => {
    setTimezone(fallbackTimezone);
    // Clear any existing error states to avoid showing stale messages
    setStatus({ kind: 'info', message: `Timezone reset to detected: ${fallbackTimezone}` });
    setCronResult(null);
  };

  // Helper function to determine CSS class for cron result
  const getCronResultClass = (result: string): string => {
    if (result.startsWith('✓')) return 'push-test-panel__health--success';
    if (result.startsWith('⚠️')) return 'push-test-panel__health--warning';
    return 'push-test-panel__health--error';
  };

  if (loading) {
    return (
      <section className="account-panel__card" aria-labelledby="reminder-schedule">
        <p className="account-panel__eyebrow">Reminder Schedule</p>
        <h3 id="reminder-schedule">Daily Reminder Window</h3>
        <p className="notification-preferences__loading">Loading reminder settings…</p>
      </section>
    );
  }

  return (
    <section className="account-panel__card" aria-labelledby="reminder-schedule">
      <p className="account-panel__eyebrow">Reminder Schedule</p>
      <h3 id="reminder-schedule">Daily Reminder Window</h3>
      <p className="account-panel__hint">
        Configure when you want to receive habit reminders each day. Notifications will only be sent 
        within this time window in your local timezone.
      </p>

      {isDemoExperience && (
        <p className="notification-preferences__message notification-preferences__message--info">
          Demo mode stores preferences locally. Connect Supabase for persistent settings.
        </p>
      )}

      {status && (
        <p
          className={`notification-preferences__message notification-preferences__message--${status.kind}`}
          role={status.kind === 'error' ? 'alert' : 'status'}
        >
          {status.message}
        </p>
      )}

      <div className="notification-preferences__card">
        <div className="notification-preferences__control notification-preferences__control--inline">
          <label className="notification-preferences__inline">
            Timezone
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="America/New_York"
                disabled={saving}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn--secondary btn--small"
                onClick={handleResetToDetected}
                disabled={saving}
                title="Reset to detected timezone"
              >
                Detect
              </button>
            </div>
          </label>
          <p>IANA timezone identifier (e.g., America/New_York, Europe/London, Asia/Tokyo).</p>
        </div>

        <div className="notification-preferences__control notification-preferences__control--inline">
          <label className="notification-preferences__inline">
            Window Start
            <input
              type="time"
              value={windowStart}
              onChange={(e) => setWindowStart(e.target.value)}
              disabled={saving}
            />
          </label>
          <p>Earliest time to receive reminders each day.</p>
        </div>

        <div className="notification-preferences__control notification-preferences__control--inline">
          <label className="notification-preferences__inline">
            Window End
            <input
              type="time"
              value={windowEnd}
              onChange={(e) => setWindowEnd(e.target.value)}
              disabled={saving}
            />
          </label>
          <p>Latest time to receive reminders each day.</p>
        </div>

        <div className="push-test-panel__actions" style={{ marginTop: '1rem' }}>
          <button
            type="button"
            className="notification-preferences__action"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Schedule'}
          </button>
        </div>
      </div>

      {/* Developer: Test CRON */}
      <div className="push-test-panel__section" style={{ marginTop: '1.5rem' }}>
        <h4>Test Scheduler</h4>
        <p className="account-panel__hint">
          Manually trigger the reminder scheduler to test your configuration.
          This will send any due reminders immediately.
        </p>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={handleTestCron}
          disabled={triggeringCron}
        >
          {triggeringCron ? 'Running…' : 'Test Reminder Scheduler'}
        </button>
        {cronResult && (
          <p className={`push-test-panel__health ${getCronResultClass(cronResult)}`}>
            {cronResult}
          </p>
        )}
      </div>
    </section>
  );
}
