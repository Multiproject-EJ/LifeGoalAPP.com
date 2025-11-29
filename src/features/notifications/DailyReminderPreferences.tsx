import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  fetchReminderPrefs,
  updateReminderPrefs,
  formatTimeForDisplay,
  getDetectedTimezone,
  isValidTimezone,
  validateQuietHours,
  COMMON_TIMEZONES,
  type UserReminderPrefsRow,
} from '../../services/reminderPrefs';
import { isDemoSession } from '../../services/demoSession';

type Props = {
  session: Session;
};

type StatusState = { kind: 'success' | 'error'; message: string } | null;

export function DailyReminderPreferences({ session }: Props) {
  const isDemoExperience = isDemoSession(session);
  const detectedTimezone = useMemo(() => getDetectedTimezone(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<UserReminderPrefsRow | null>(null);
  const [status, setStatus] = useState<StatusState>(null);

  // Form state
  const [timezone, setTimezone] = useState(detectedTimezone);
  const [windowStart, setWindowStart] = useState('08:00');
  const [windowEnd, setWindowEnd] = useState('10:00');
  const [quietHoursStart, setQuietHoursStart] = useState('');
  const [quietHoursEnd, setQuietHoursEnd] = useState('');
  const [skipWeekends, setSkipWeekends] = useState(false);

  // Load preferences
  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchReminderPrefs(session.user.id)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error('Failed to load reminder preferences:', error);
          setStatus({ kind: 'error', message: 'Unable to load reminder preferences.' });
          return;
        }
        if (data) {
          setPrefs(data);
          setTimezone(data.timezone || detectedTimezone);
          setWindowStart(formatTimeForDisplay(data.window_start));
          setWindowEnd(formatTimeForDisplay(data.window_end));
          setQuietHoursStart(data.quiet_hours_start ? formatTimeForDisplay(data.quiet_hours_start) : '');
          setQuietHoursEnd(data.quiet_hours_end ? formatTimeForDisplay(data.quiet_hours_end) : '');
          setSkipWeekends(data.skip_weekends ?? false);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session.user.id, detectedTimezone]);

  const handleSave = async () => {
    // Validate timezone
    if (!isValidTimezone(timezone)) {
      setStatus({ kind: 'error', message: 'Invalid timezone. Please select a valid timezone.' });
      return;
    }

    // Validate time window
    if (!windowStart || !windowEnd) {
      setStatus({ kind: 'error', message: 'Please specify both start and end times.' });
      return;
    }

    // Validate quiet hours
    const quietHoursValidation = validateQuietHours(quietHoursStart, quietHoursEnd);
    if (!quietHoursValidation.valid) {
      setStatus({ kind: 'error', message: quietHoursValidation.error! });
      return;
    }

    setSaving(true);
    setStatus(null);

    const { data, error } = await updateReminderPrefs(session.user.id, {
      timezone,
      windowStart,
      windowEnd,
      quietHoursStart: quietHoursStart.trim() || null,
      quietHoursEnd: quietHoursEnd.trim() || null,
      skipWeekends,
    });

    setSaving(false);

    if (error) {
      setStatus({ kind: 'error', message: 'Failed to save preferences. Please try again.' });
      return;
    }

    if (data) {
      setPrefs(data);
    }
    setStatus({ kind: 'success', message: 'Daily reminder preferences saved!' });
  };

  const handleTimezoneChange = (value: string) => {
    setTimezone(value);
    setStatus(null);
  };

  const handleDetectTimezone = () => {
    setTimezone(detectedTimezone);
    setStatus(null);
  };

  if (loading) {
    return (
      <section className="account-panel__card" aria-labelledby="daily-reminder-prefs">
        <p className="account-panel__eyebrow">Daily Reminders</p>
        <h3 id="daily-reminder-prefs">Daily Reminder Window</h3>
        <p className="notification-preferences__loading">Loading preferences…</p>
      </section>
    );
  }

  return (
    <section className="account-panel__card" aria-labelledby="daily-reminder-prefs">
      <p className="account-panel__eyebrow">Daily Reminders</p>
      <h3 id="daily-reminder-prefs">Daily Reminder Window</h3>
      <p className="account-panel__hint">
        Set your preferred time window for receiving daily habit reminders. Reminders will be sent once per habit
        within this window, respecting your local timezone.
      </p>

      {isDemoExperience && (
        <p className="notification-preferences__message notification-preferences__message--info">
          Demo mode stores preferences locally. Connect to Supabase for persistent settings across devices.
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
            <select
              value={timezone}
              onChange={(e) => handleTimezoneChange(e.target.value)}
              disabled={saving}
              className="notification-preferences__select"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
              {/* Include current timezone if not in list */}
              {!COMMON_TIMEZONES.some((tz) => tz.value === timezone) && (
                <option value={timezone}>{timezone}</option>
              )}
            </select>
          </label>
          <button
            type="button"
            className="notification-preferences__detect-btn"
            onClick={handleDetectTimezone}
            disabled={saving}
            title="Detect timezone from browser"
          >
            Detect
          </button>
          <p>Your current timezone. Reminders will be scheduled based on your local time.</p>
        </div>

        <div className="notification-preferences__control notification-preferences__control--inline">
          <label className="notification-preferences__inline">
            Window Start
            <input
              type="time"
              value={windowStart}
              onChange={(e) => {
                setWindowStart(e.target.value);
                setStatus(null);
              }}
              disabled={saving}
            />
          </label>
          <p>Earliest time to receive daily reminders.</p>
        </div>

        <div className="notification-preferences__control notification-preferences__control--inline">
          <label className="notification-preferences__inline">
            Window End
            <input
              type="time"
              value={windowEnd}
              onChange={(e) => {
                setWindowEnd(e.target.value);
                setStatus(null);
              }}
              disabled={saving}
            />
          </label>
          <p>Latest time to receive daily reminders.</p>
        </div>

        <hr className="notification-preferences__divider" />

        <p className="account-panel__hint">
          <strong>Quiet Hours & Weekend Skip</strong>: Reminders are sent only within your window and outside quiet hours.
          Overnight quiet hours (e.g., 22:00–06:00) are supported.
        </p>

        <div className="notification-preferences__control notification-preferences__control--inline">
          <label className="notification-preferences__inline">
            Quiet Hours Start
            <input
              type="time"
              value={quietHoursStart}
              onChange={(e) => {
                setQuietHoursStart(e.target.value);
                setStatus(null);
              }}
              disabled={saving}
              aria-describedby="quiet-hours-start-desc"
            />
          </label>
          <p id="quiet-hours-start-desc">Start of quiet period when no reminders are sent (optional).</p>
        </div>

        <div className="notification-preferences__control notification-preferences__control--inline">
          <label className="notification-preferences__inline">
            Quiet Hours End
            <input
              type="time"
              value={quietHoursEnd}
              onChange={(e) => {
                setQuietHoursEnd(e.target.value);
                setStatus(null);
              }}
              disabled={saving}
              aria-describedby="quiet-hours-end-desc"
            />
          </label>
          <p id="quiet-hours-end-desc">End of quiet period when no reminders are sent (optional).</p>
        </div>

        <div className="notification-preferences__control notification-preferences__control--inline">
          <label className="notification-preferences__inline notification-preferences__checkbox-label">
            <input
              type="checkbox"
              checked={skipWeekends}
              onChange={(e) => {
                setSkipWeekends(e.target.checked);
                setStatus(null);
              }}
              disabled={saving}
            />
            Skip weekends
          </label>
          <p>When enabled, reminders will not be sent on Saturday or Sunday.</p>
        </div>

        <button
          type="button"
          className="notification-preferences__action"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save Preferences'}
        </button>
      </div>
    </section>
  );
}
