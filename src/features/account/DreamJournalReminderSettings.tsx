import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  getDreamJournalReminderEnabled,
  getDreamJournalReminderWindow,
  setDreamJournalReminderEnabled,
  setDreamJournalReminderWindow,
} from '../../services/dreamJournalReminderPrefs';
import '../habits/HabitRecapPrompt.css';

type DreamJournalReminderSettingsProps = {
  session: Session;
};

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => hour);

const formatHourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

export function DreamJournalReminderSettings({ session }: DreamJournalReminderSettingsProps) {
  const userId = session.user.id;
  const [enabled, setEnabled] = useState(false);
  const [startHour, setStartHour] = useState(4);
  const [endHour, setEndHour] = useState(12);
  const [saving, setSaving] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    setEnabled(getDreamJournalReminderEnabled(userId));
    const reminderWindow = getDreamJournalReminderWindow(userId);
    setStartHour(reminderWindow.startHour);
    setEndHour(reminderWindow.endHour);
  }, [userId]);

  const handleToggle = (nextEnabled: boolean) => {
    setSaving(true);
    setEnabled(nextEnabled);
    setDreamJournalReminderEnabled(userId, nextEnabled);
    window.setTimeout(() => setSaving(false), 250);
  };

  const handleWindowChange = (nextStartHour: number, nextEndHour: number) => {
    setSaving(true);
    setStartHour(nextStartHour);
    setEndHour(nextEndHour);
    setDreamJournalReminderWindow(userId, {
      startHour: nextStartHour,
      endHour: nextEndHour,
    });
    window.setTimeout(() => setSaving(false), 250);
  };

  const handleLaunchDreamJournal = () => {
    setShowPreviewModal(true);
  };

  return (
    <section className="account-panel__card" aria-labelledby="dream-journal-reminder">
      <p className="account-panel__eyebrow">Dream Journal</p>
      <h3 id="dream-journal-reminder">Daily dream journal reminder</h3>
      <p className="account-panel__hint">
        Show an in-app morning prompt once per reminder window. No background timer is used.
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
          <span className="account-panel__toggle-text">Enable Daily Dream Journal Reminder</span>
        </label>
      </div>
      <div className="account-panel__actions-row" style={{ marginTop: '0.5rem' }}>
        <label className="account-panel__hint" style={{ display: 'grid', gap: '0.25rem' }}>
          Window start
          <select
            value={startHour}
            onChange={(event) => handleWindowChange(Number(event.target.value), endHour)}
            disabled={!enabled || saving}
            className="account-panel__select"
          >
            {HOUR_OPTIONS.map((hour) => (
              <option key={`dream-start-${hour}`} value={hour}>
                {formatHourLabel(hour)}
              </option>
            ))}
          </select>
        </label>
        <label className="account-panel__hint" style={{ display: 'grid', gap: '0.25rem' }}>
          Window end
          <select
            value={endHour}
            onChange={(event) => handleWindowChange(startHour, Number(event.target.value))}
            disabled={!enabled || saving}
            className="account-panel__select"
          >
            {HOUR_OPTIONS.map((hour) => (
              <option key={`dream-end-${hour}`} value={hour}>
                {formatHourLabel(hour)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="account-panel__hint" style={{ marginTop: '0.5rem' }}>
        Current window: {formatHourLabel(startHour)} → {formatHourLabel(endHour)}
      </p>
      <div className="account-panel__actions-row" style={{ marginTop: '0.5rem' }}>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={handleLaunchDreamJournal}
        >
          Launch Dream Journal Modal
        </button>
      </div>

      {showPreviewModal && (
        <div className="dream-journal-reminder-overlay" onClick={() => setShowPreviewModal(false)}>
          <div className="dream-journal-reminder-modal" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="dream-journal-reminder-modal__close"
              onClick={() => setShowPreviewModal(false)}
              aria-label="Close dream journal reminder preview"
            >
              ×
            </button>
            <div className="dream-journal-reminder-modal__content">
              <p className="dream-journal-reminder-modal__eyebrow">Dream Journal Reminder</p>
              <h3>Had an interesting Dream last night?</h3>
              <button
                type="button"
                className="btn btn--primary dream-journal-reminder-modal__cta"
                onClick={() => setShowPreviewModal(false)}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
