import { useEffect, useState } from 'react';
import {
  listMeditationReminders,
  upsertMeditationReminder,
  deleteMeditationReminder,
  getCurrentUserId,
} from '../../../services/meditationReminders';
import { DEFAULT_BREATHING_REMINDER_TIME } from '../constants';

type ReminderCardProps = {
  userId: string;
};

export function ReminderCard({ userId }: ReminderCardProps) {
  const [enabled, setEnabled] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState(DEFAULT_BREATHING_REMINDER_TIME);
  const [reminderId, setReminderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadReminder();
  }, [userId]);

  const loadReminder = async () => {
    setLoading(true);
    try {
      const result = await listMeditationReminders(userId);
      if (result.error) {
        console.error('Failed to load reminder:', result.error);
      } else if (result.data && result.data.length > 0) {
        const reminder = result.data[0];
        setReminderId(reminder.id);
        setEnabled(reminder.enabled);
        setTimeOfDay(reminder.time_of_day);
      }
    } catch (err) {
      console.error('Failed to load reminder:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        user_id: userId,
        enabled,
        time_of_day: timeOfDay,
      };

      const result = await upsertMeditationReminder(payload);
      if (result.error) {
        console.error('Failed to save reminder:', result.error);
        alert('Failed to save reminder. Please try again.');
      } else if (result.data) {
        setReminderId(result.data.id);
        alert('Reminder saved successfully!');
      }
    } catch (err) {
      console.error('Failed to save reminder:', err);
      alert('Failed to save reminder. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!reminderId) {
      // Nothing to clear
      setEnabled(false);
      setTimeOfDay(DEFAULT_BREATHING_REMINDER_TIME);
      return;
    }

    setSaving(true);
    try {
      const result = await deleteMeditationReminder(reminderId);
      if (result.error) {
        console.error('Failed to delete reminder:', result.error);
        alert('Failed to clear reminder. Please try again.');
      } else {
        setReminderId(null);
        setEnabled(false);
        setTimeOfDay(DEFAULT_BREATHING_REMINDER_TIME);
        alert('Reminder cleared successfully!');
      }
    } catch (err) {
      console.error('Failed to delete reminder:', err);
      alert('Failed to clear reminder. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="reminder-card">
        <div className="reminder-card__header">
          <span className="reminder-card__icon">⏰</span>
          <h3 className="reminder-card__title">Daily Reminder</h3>
        </div>
        <p className="reminder-card__loading">Loading...</p>
        <style>{cardStyles}</style>
      </div>
    );
  }

  return (
    <div className="reminder-card">
      <div className="reminder-card__header">
        <span className="reminder-card__icon">⏰</span>
        <h3 className="reminder-card__title">Daily Reminder</h3>
      </div>
      <p className="reminder-card__description">
        Get a daily reminder to practice breathing exercises.
      </p>

      <div className="reminder-card__form">
        <div className="reminder-card__field">
          <label className="reminder-card__label">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="reminder-card__checkbox"
            />
            Enable daily reminder
          </label>
        </div>

        {enabled && (
          <div className="reminder-card__field">
            <label className="reminder-card__label">
              Reminder time
              <input
                type="time"
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
                className="reminder-card__time-input"
              />
            </label>
          </div>
        )}

        <div className="reminder-card__actions">
          <button
            className="btn btn--primary reminder-card__save-button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          {reminderId && (
            <button
              className="btn btn--secondary reminder-card__clear-button"
              onClick={handleClear}
              disabled={saving}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* TODO: Integrate with reminder-worker/cron for actual push notification scheduling */}
      
      <style>{cardStyles}</style>
    </div>
  );
}

const cardStyles = `
  .reminder-card {
    background: var(--color-bg-elevated, #fff);
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
    font-size: 0.875rem;
  }

  .reminder-card__loading {
    text-align: center;
    color: var(--color-text-secondary, #666);
    padding: 1rem;
  }

  .reminder-card__form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .reminder-card__field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .reminder-card__label {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--color-text-primary, #000);
    font-weight: 500;
  }

  .reminder-card__checkbox {
    margin-right: 0.5rem;
  }

  .reminder-card__time-input {
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 1rem;
    font-family: inherit;
  }

  .reminder-card__time-input:focus {
    outline: none;
    border-color: var(--color-primary, #667eea);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .reminder-card__actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  .reminder-card__save-button,
  .reminder-card__clear-button {
    flex: 1;
    padding: 0.75rem;
    font-size: 0.875rem;
  }

  .reminder-card__save-button:disabled,
  .reminder-card__clear-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
