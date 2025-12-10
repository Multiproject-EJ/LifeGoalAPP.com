import { useEffect, useState } from 'react';
import {
  listMeditationReminders,
  upsertMeditationReminder,
  deleteMeditationReminder,
  getCurrentUserId,
  type MeditationReminder,
} from '../../../services/meditationReminders';
import { DEFAULT_BREATHING_REMINDER_TIME } from '../constants';

export function ReminderCard() {
  const [reminder, setReminder] = useState<MeditationReminder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Form state
  const [enabled, setEnabled] = useState(true);
  const [timeOfDay, setTimeOfDay] = useState(DEFAULT_BREATHING_REMINDER_TIME);

  useEffect(() => {
    loadReminder();
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const loadReminder = async () => {
    setLoading(true);
    setError(null);

    const userId = getCurrentUserId();
    if (!userId) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    try {
      const result = await listMeditationReminders(userId);
      if (result.error) {
        setError('Failed to load reminder settings');
        console.error('Failed to load reminder:', result.error);
      } else if (result.data && result.data.length > 0) {
        const firstReminder = result.data[0];
        setReminder(firstReminder);
        setEnabled(firstReminder.enabled);
        setTimeOfDay(firstReminder.time_of_day);
      }
    } catch (err) {
      setError('Failed to load reminder settings');
      console.error('Failed to load reminder:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      setError('Not authenticated');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await upsertMeditationReminder({
        user_id: userId,
        enabled,
        time_of_day: timeOfDay,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      if (result.error) {
        setError('Failed to save reminder');
        console.error('Failed to save reminder:', result.error);
      } else if (result.data) {
        setReminder(result.data);
        setSuccessMessage('Reminder saved successfully!');
        // TODO: Integrate with existing reminder worker/cron to schedule server-side push notifications
      }
    } catch (err) {
      setError('Failed to save reminder');
      console.error('Failed to save reminder:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!reminder) return;

    if (!confirm('Are you sure you want to delete this reminder?')) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await deleteMeditationReminder(reminder.id);

      if (result.error) {
        setError('Failed to delete reminder');
        console.error('Failed to delete reminder:', result.error);
      } else {
        setReminder(null);
        setEnabled(true);
        setTimeOfDay(DEFAULT_BREATHING_REMINDER_TIME);
        setSuccessMessage('Reminder deleted successfully!');
      }
    } catch (err) {
      setError('Failed to delete reminder');
      console.error('Failed to delete reminder:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="breathing-space__card breathing-space__reminder">
      <div className="breathing-space__card-header">
        <span className="breathing-space__card-icon">🔔</span>
        <h3 className="breathing-space__card-title">Daily Reminder</h3>
      </div>

      {loading ? (
        <p className="breathing-space__loading">Loading reminder settings...</p>
      ) : (
        <>
          <p className="breathing-space__card-description">
            Set a daily reminder to practice mindful breathing.
          </p>

          {error && (
            <div className="breathing-space__alert breathing-space__alert--error">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="breathing-space__alert breathing-space__alert--success">
              {successMessage}
            </div>
          )}

          <div className="breathing-space__reminder-form">
            <label className="breathing-space__reminder-toggle">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                disabled={saving}
              />
              <span>Enable daily reminder</span>
            </label>

            <label className="breathing-space__reminder-time">
              <span>Time of day:</span>
              <input
                type="time"
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
                disabled={saving || !enabled}
              />
            </label>

            <div className="breathing-space__reminder-actions">
              <button
                className="btn btn--primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Reminder'}
              </button>

              {reminder && (
                <button
                  className="btn btn--secondary"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        .breathing-space__reminder {
          background: linear-gradient(135deg, #fef3c722 0%, #fbbf2422 100%);
          border: 1px solid #fbbf2444;
        }

        .breathing-space__reminder-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .breathing-space__reminder-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-size: 1rem;
        }

        .breathing-space__reminder-toggle input[type="checkbox"] {
          width: 1.25rem;
          height: 1.25rem;
          cursor: pointer;
        }

        .breathing-space__reminder-time {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .breathing-space__reminder-time span {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-text-primary, #000);
        }

        .breathing-space__reminder-time input[type="time"] {
          padding: 0.5rem;
          font-size: 1rem;
          border: 1px solid var(--color-border, #ddd);
          border-radius: 6px;
          background: var(--color-bg, #fff);
          color: var(--color-text-primary, #000);
        }

        .breathing-space__reminder-time input[type="time"]:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .breathing-space__reminder-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .breathing-space__reminder-actions .btn {
          flex: 1;
        }

        .breathing-space__alert {
          padding: 0.75rem;
          border-radius: 6px;
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }

        .breathing-space__alert--error {
          background: #fee;
          color: #c33;
          border: 1px solid #fcc;
        }

        .breathing-space__alert--success {
          background: #efe;
          color: #3c3;
          border: 1px solid #cfc;
        }
      `}</style>
    </div>
  );
}
