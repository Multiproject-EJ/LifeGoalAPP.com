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
  const [enabled, setEnabled] = useState(true);
  const [timeOfDay, setTimeOfDay] = useState(DEFAULT_BREATHING_REMINDER_TIME);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadReminder();
  }, []);

  const loadReminder = async () => {
    setLoading(true);
    setError(null);
    const userId = getCurrentUserId();
    if (!userId) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      const result = await listMeditationReminders(userId);
      if (result.error) {
        setError('Failed to load reminder settings');
        console.error('Failed to load reminder:', result.error);
      } else if (result.data && result.data.length > 0) {
        const loadedReminder = result.data[0];
        setReminder(loadedReminder);
        setEnabled(loadedReminder.enabled);
        setTimeOfDay(loadedReminder.time_of_day);
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
      setError('User not authenticated');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        user_id: userId,
        enabled,
        time_of_day: timeOfDay,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      const result = await upsertMeditationReminder(payload);
      if (result.error) {
        setError('Failed to save reminder');
        console.error('Failed to save reminder:', result.error);
      } else if (result.data) {
        setReminder(result.data);
        setSuccessMessage('Reminder saved successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
        // TODO: Schedule server-side push notification when saving
      }
    } catch (err) {
      setError('Failed to save reminder');
      console.error('Failed to save reminder:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!reminder) {
      setError('No reminder to delete');
      return;
    }

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
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setError('Failed to delete reminder');
      console.error('Failed to delete reminder:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="reminder-card">
      <div className="reminder-card__header">
        <span className="reminder-card__icon">⏰</span>
        <h3 className="reminder-card__title">Daily Reminder</h3>
      </div>

      {loading ? (
        <p className="reminder-card__loading">Loading reminder settings...</p>
      ) : (
        <>
          <p className="reminder-card__description">
            Set a daily reminder to practice breathing and mindfulness.
          </p>

          {error && <div className="reminder-card__alert reminder-card__alert--error">{error}</div>}
          {successMessage && (
            <div className="reminder-card__alert reminder-card__alert--success">{successMessage}</div>
          )}

          <div className="reminder-card__controls">
            <div className="reminder-card__control-group">
              <label className="reminder-card__label">
                <input
                  type="checkbox"
                  className="reminder-card__checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  disabled={saving}
                />
                <span>Enable daily reminder</span>
              </label>
            </div>

            <div className="reminder-card__control-group">
              <label className="reminder-card__label">
                <span>Time of day</span>
                <input
                  type="time"
                  className="reminder-card__time-input"
                  value={timeOfDay}
                  onChange={(e) => setTimeOfDay(e.target.value)}
                  disabled={saving || !enabled}
                />
              </label>
            </div>

            <div className="reminder-card__actions">
              <button
                className="btn btn--primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
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
        .reminder-card {
          background: var(--color-bg-elevated, #fff);
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border: 1px solid #e0e0e0;
        }

        .reminder-card__header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .reminder-card__icon {
          font-size: 1.5rem;
        }

        .reminder-card__title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-text-primary, #000);
        }

        .reminder-card__description {
          margin: 0 0 1.5rem 0;
          color: var(--color-text-secondary, #666);
          font-size: 0.9rem;
        }

        .reminder-card__loading {
          text-align: center;
          padding: 1rem;
          color: var(--color-text-secondary, #666);
        }

        .reminder-card__alert {
          padding: 0.75rem;
          margin-bottom: 1rem;
          border-radius: 6px;
          font-size: 0.9rem;
        }

        .reminder-card__alert--error {
          background: #fee;
          color: #c00;
          border: 1px solid #fcc;
        }

        .reminder-card__alert--success {
          background: #efe;
          color: #060;
          border: 1px solid #cfc;
        }

        .reminder-card__controls {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .reminder-card__control-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .reminder-card__label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.95rem;
          color: var(--color-text-primary, #000);
        }

        .reminder-card__checkbox {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .reminder-card__time-input {
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 1rem;
          width: 100%;
          max-width: 200px;
        }

        .reminder-card__time-input:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }

        .reminder-card__actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .reminder-card__actions .btn {
          flex: 1;
          padding: 0.75rem 1rem;
          font-size: 0.95rem;
        }

        @media (max-width: 768px) {
          .reminder-card {
            padding: 1rem;
          }

          .reminder-card__actions {
            flex-direction: column;
          }

          .reminder-card__actions .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
