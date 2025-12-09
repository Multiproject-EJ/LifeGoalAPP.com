import { useState, useEffect } from 'react';
import type { Database } from '../../lib/database.types';
import {
  fetchHabitReminderPrefs,
  updateHabitReminderPref,
  formatTimeForDisplay,
  type HabitWithReminderPref,
} from '../../services/habitReminderPrefs';

// Type for displaying the single habit reminder pref as an "alert" in the UI
type HabitAlertRow = {
  id: string;
  habit_id: string;
  alert_time: string;
  days_of_week: number[] | null;
  enabled: boolean;
  created_at: string | null;
  updated_at: string | null;
};

type HabitAlertConfigProps = {
  habitId: string;
  habitName: string;
  onClose?: () => void;
};

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export function HabitAlertConfig({ habitId, habitName, onClose }: HabitAlertConfigProps) {
  // V2 uses a single reminder pref per habit, but we display it like the legacy "alert" UI
  const [reminderPref, setReminderPref] = useState<HabitWithReminderPref | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  
  // Form state for editing reminder
  const [editTime, setEditTime] = useState('08:00');
  const [editEnabled, setEditEnabled] = useState(true);

  useEffect(() => {
    loadReminderPref();
  }, [habitId]);

  const loadReminderPref = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await fetchHabitReminderPrefs();
      if (fetchError) throw fetchError;
      
      // Find the pref for this habit
      const pref = (data || []).find(p => p.habit_id === habitId);
      setReminderPref(pref || null);
      
      if (pref) {
        setEditEnabled(pref.enabled);
        setEditTime(formatTimeForDisplay(pref.preferred_time) || '08:00');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reminder preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReminder = async () => {
    setSaving(true);
    setError(null);
    try {
      const { data, error: saveError } = await updateHabitReminderPref(habitId, {
        enabled: editEnabled,
        preferred_time: editTime,
      });
      
      if (saveError) throw saveError;
      
      // Reload to get the updated pref
      await loadReminderPref();
      setShowEditForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update reminder');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async () => {
    if (!reminderPref) return;
    
    setSaving(true);
    setError(null);
    try {
      const { error: toggleError } = await updateHabitReminderPref(habitId, {
        enabled: !reminderPref.enabled,
      });
      if (toggleError) throw toggleError;
      await loadReminderPref();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle reminder');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="habit-alert-config">
      <div className="habit-alert-config__header">
        <h3>Reminders for &quot;{habitName}&quot;</h3>
        {onClose && (
          <button
            type="button"
            className="habit-alert-config__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        )}
      </div>

      {error && (
        <div className="habit-alert-config__error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="habit-alert-config__loading">Loading reminder preferences...</div>
      ) : (
        <>
          {!reminderPref && !showEditForm ? (
            <div className="habit-alert-config__empty">
              <p>No reminder configured for this habit yet.</p>
              <p className="habit-alert-config__hint">
                Set a preferred time to receive notifications for this habit.
              </p>
              <button
                type="button"
                className="habit-alert-config__add-btn"
                onClick={() => setShowEditForm(true)}
                disabled={saving}
              >
                + Set Reminder Time
              </button>
            </div>
          ) : reminderPref && !showEditForm ? (
            <div className="habit-alert-config__list">
              <div className="habit-alert-config__item">
                <div className="habit-alert-config__item-info">
                  <div className="habit-alert-config__item-time">
                    Daily at {formatTimeForDisplay(reminderPref.preferred_time) || 'Not set'}
                  </div>
                  <div className="habit-alert-config__item-status">
                    {reminderPref.enabled ? (
                      <span className="habit-alert-config__badge habit-alert-config__badge--enabled">
                        Enabled
                      </span>
                    ) : (
                      <span className="habit-alert-config__badge habit-alert-config__badge--disabled">
                        Disabled
                      </span>
                    )}
                  </div>
                </div>
                <div className="habit-alert-config__item-actions">
                  <button
                    type="button"
                    className="habit-alert-config__btn habit-alert-config__btn--toggle"
                    onClick={handleToggleEnabled}
                    disabled={saving}
                  >
                    {reminderPref.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    type="button"
                    className="habit-alert-config__btn habit-alert-config__btn--secondary"
                    onClick={() => setShowEditForm(true)}
                    disabled={saving}
                  >
                    Edit Time
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {showEditForm ? (
            <div className="habit-alert-config__form">
              <h4>{reminderPref ? 'Edit Reminder' : 'Set Reminder'}</h4>

              <div className="habit-alert-config__form-group">
                <label htmlFor="reminder-time">Preferred Time</label>
                <input
                  id="reminder-time"
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="habit-alert-config__input"
                />
              </div>

              <div className="habit-alert-config__form-group">
                <label className="habit-alert-config__checkbox">
                  <input
                    type="checkbox"
                    checked={editEnabled}
                    onChange={(e) => setEditEnabled(e.target.checked)}
                  />
                  <span>Enable reminder</span>
                </label>
              </div>

              <div className="habit-alert-config__form-actions">
                <button
                  type="button"
                  className="habit-alert-config__btn habit-alert-config__btn--primary"
                  onClick={handleSaveReminder}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Reminder'}
                </button>
                <button
                  type="button"
                  className="habit-alert-config__btn habit-alert-config__btn--secondary"
                  onClick={() => {
                    setShowEditForm(false);
                    if (reminderPref) {
                      setEditEnabled(reminderPref.enabled);
                      setEditTime(formatTimeForDisplay(reminderPref.preferred_time) || '08:00');
                    }
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
