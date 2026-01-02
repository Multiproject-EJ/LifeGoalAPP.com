import { FormEvent, useState } from 'react';
import './GoalSetup.css';

interface GoalSetupProps {
  onCreateGoal: (targetDays: number, reminderTime?: string) => void;
  onCancel?: () => void;
}

const PRESET_DAYS = [5, 7, 14, 30];

export function GoalSetup({ onCreateGoal, onCancel }: GoalSetupProps) {
  const [selectedDays, setSelectedDays] = useState(5);
  const [customDays, setCustomDays] = useState('');
  const [reminderTime, setReminderTime] = useState('09:00');
  const [enableReminder, setEnableReminder] = useState(false);
  // Note: selectedTypes is used for UI state but not yet passed to backend
  // Future enhancement: extend onCreateGoal to accept activity types
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['meditation', 'breathing', 'body']);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const targetDays = customDays ? parseInt(customDays, 10) : selectedDays;
    const reminder = enableReminder ? reminderTime : undefined;
    onCreateGoal(targetDays, reminder);
  };

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  return (
    <div className="goal-setup">
      <div className="goal-setup__header">
        <h2 className="goal-setup__title">Create Meditation Goal</h2>
        <p className="goal-setup__description">
          Set a daily meditation goal and track your progress
        </p>
      </div>

      <form onSubmit={handleSubmit} className="goal-setup__form">
        <div className="goal-setup__section">
          <label className="goal-setup__label">Target Days</label>
          <div className="goal-setup__days-grid">
            {PRESET_DAYS.map((days) => (
              <button
                key={days}
                type="button"
                className={`goal-setup__days-button ${
                  !customDays && selectedDays === days ? 'goal-setup__days-button--active' : ''
                }`}
                onClick={() => {
                  setSelectedDays(days);
                  setCustomDays('');
                }}
              >
                <span className="goal-setup__days-number">{days}</span>
                <span className="goal-setup__days-label">days</span>
              </button>
            ))}
          </div>

          <div className="goal-setup__custom">
            <label htmlFor="custom-days" className="goal-setup__custom-label">
              Custom days:
            </label>
            <input
              id="custom-days"
              type="number"
              min="1"
              max="365"
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
              placeholder="Enter custom days"
              className="goal-setup__custom-input"
            />
          </div>
        </div>

        <div className="goal-setup__section">
          <label className="goal-setup__label">Include Activities</label>
          <div className="goal-setup__types">
            <button
              type="button"
              className={`goal-setup__type ${
                selectedTypes.includes('meditation') ? 'goal-setup__type--active' : ''
              }`}
              onClick={() => toggleType('meditation')}
            >
              <span className="goal-setup__type-icon">🧘</span>
              <span className="goal-setup__type-label">Meditation</span>
            </button>
            <button
              type="button"
              className={`goal-setup__type ${
                selectedTypes.includes('breathing') ? 'goal-setup__type--active' : ''
              }`}
              onClick={() => toggleType('breathing')}
            >
              <span className="goal-setup__type-icon">🌬️</span>
              <span className="goal-setup__type-label">Breathing</span>
            </button>
            <button
              type="button"
              className={`goal-setup__type ${
                selectedTypes.includes('body') ? 'goal-setup__type--active' : ''
              }`}
              onClick={() => toggleType('body')}
            >
              <span className="goal-setup__type-icon">💪</span>
              <span className="goal-setup__type-label">Body</span>
            </button>
          </div>
        </div>

        <div className="goal-setup__section">
          <div className="goal-setup__reminder-toggle">
            <label htmlFor="enable-reminder" className="goal-setup__label">
              Daily Reminder
            </label>
            <input
              id="enable-reminder"
              type="checkbox"
              checked={enableReminder}
              onChange={(e) => setEnableReminder(e.target.checked)}
              className="goal-setup__checkbox"
            />
          </div>

          {enableReminder && (
            <div className="goal-setup__reminder-time">
              <label htmlFor="reminder-time" className="goal-setup__time-label">
                Reminder Time:
              </label>
              <input
                id="reminder-time"
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="goal-setup__time-input"
              />
            </div>
          )}
        </div>

        <div className="goal-setup__actions">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="goal-setup__button goal-setup__button--secondary"
            >
              Cancel
            </button>
          )}
          <button type="submit" className="goal-setup__button goal-setup__button--primary">
            Start Goal
          </button>
        </div>
      </form>
    </div>
  );
}
