import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  fetchReminderPrefs,
  updateReminderPrefs,
  formatTimeForDisplay,
  getDetectedTimezone,
  isValidTimezone,
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

    setSaving(true);
    setStatus(null);

    const { data, error } = await updateReminderPrefs(session.user.id, {
      timezone,
      windowStart,
      windowEnd,
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
