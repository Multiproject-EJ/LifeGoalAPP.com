import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  getTodaysWinsReminderEnabled,
  getTodaysWinsReminderWindow,
  setTodaysWinsReminderEnabled,
  setTodaysWinsReminderWindow,
} from '../../services/todaysWinsReminderPrefs';

type TodaysWinsReminderSettingsProps = {
  session: Session;
};

export function TodaysWinsReminderSettings({ session }: TodaysWinsReminderSettingsProps) {
  const userId = session.user.id;
  const [enabled, setEnabled] = useState(false);
  const [startTime, setStartTime] = useState('21:30');
  const [endTime, setEndTime] = useState('23:59');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEnabled(getTodaysWinsReminderEnabled(userId));
    const reminderWindow = getTodaysWinsReminderWindow(userId);
    setStartTime(reminderWindow.startTime);
    setEndTime(reminderWindow.endTime);
  }, [userId]);

  const handleToggle = (nextEnabled: boolean) => {
    setSaving(true);
    setEnabled(nextEnabled);
    setTodaysWinsReminderEnabled(userId, nextEnabled);
    window.setTimeout(() => setSaving(false), 250);
  };

  const handleWindowChange = (nextStartTime: string, nextEndTime: string) => {
    setSaving(true);
    setStartTime(nextStartTime);
    setEndTime(nextEndTime);
    setTodaysWinsReminderWindow(userId, {
      startTime: nextStartTime,
      endTime: nextEndTime,
    });
    window.setTimeout(() => setSaving(false), 250);
  };

  return (
    <section className="account-panel__card" aria-labelledby="todays-wins-reminder">
      <p className="account-panel__eyebrow">Today&apos;s Wins</p>
      <h3 id="todays-wins-reminder">Daily Today&apos;s Wins reminder</h3>
      <p className="account-panel__hint">
        Show the Today&apos;s Wins modal once in your evening reminder window, only if at least one win is logged.
      </p>
      <div className="account-panel__toggle-row">
        <label className="account-panel__toggle-label">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => handleToggle(event.target.checked)}
            disabled={saving}
            className="account-panel__toggle-input"
          />
          <span className="account-panel__toggle-text">Enable Daily Today&apos;s Wins Reminder</span>
        </label>
      </div>
      <div className="account-panel__actions-row" style={{ marginTop: '0.5rem' }}>
        <label className="account-panel__hint" style={{ display: 'grid', gap: '0.25rem' }}>
          Window start
          <input
            type="time"
            value={startTime}
            onChange={(event) => handleWindowChange(event.target.value, endTime)}
            disabled={!enabled || saving}
          />
        </label>
        <label className="account-panel__hint" style={{ display: 'grid', gap: '0.25rem' }}>
          Window end
          <input
            type="time"
            value={endTime}
            onChange={(event) => handleWindowChange(startTime, event.target.value)}
            disabled={!enabled || saving}
          />
        </label>
      </div>
      <p className="account-panel__hint" style={{ marginTop: '0.5rem' }}>
        Current window: {startTime} → {endTime}
      </p>
    </section>
  );
}
