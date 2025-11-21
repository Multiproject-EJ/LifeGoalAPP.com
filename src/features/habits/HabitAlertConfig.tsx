import { useState, useEffect } from 'react';
import type { Database } from '../../lib/database.types';
import {
  fetchHabitAlerts,
  upsertHabitAlert,
  deleteHabitAlert,
  toggleHabitAlert,
  getAlertScheduleDescription,
} from '../../services/habitAlerts';

type HabitAlertRow = Database['public']['Tables']['habit_alerts']['Row'];

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
  const [alerts, setAlerts] = useState<HabitAlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form state for adding new alert
  const [newAlertTime, setNewAlertTime] = useState('08:00');
  const [newAlertDays, setNewAlertDays] = useState<number[]>([]);
  const [frequencyMode, setFrequencyMode] = useState<'daily' | 'custom'>('daily');

  useEffect(() => {
    loadAlerts();
  }, [habitId]);

  const loadAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await fetchHabitAlerts(habitId);
      if (fetchError) throw fetchError;
      setAlerts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAlert = async () => {
    if (!newAlertTime) {
      setError('Please select a time');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { data, error: saveError } = await upsertHabitAlert({
        habit_id: habitId,
        alert_time: newAlertTime,
        days_of_week: frequencyMode === 'daily' ? null : newAlertDays.length > 0 ? newAlertDays : null,
        enabled: true,
      });
      
      if (saveError) throw saveError;
      if (data) {
        setAlerts((prev) => [...prev, data]);
        setShowAddForm(false);
        setNewAlertTime('08:00');
        setNewAlertDays([]);
        setFrequencyMode('daily');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add alert');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAlert = async (alertId: string, currentEnabled: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const { data, error: toggleError } = await toggleHabitAlert(alertId, !currentEnabled);
      if (toggleError) throw toggleError;
      if (data) {
        setAlerts((prev) =>
          prev.map((alert) => (alert.id === alertId ? data : alert))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle alert');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { error: deleteError } = await deleteHabitAlert(alertId);
      if (deleteError) throw deleteError;
      setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete alert');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: number) => {
    setNewAlertDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  return (
    <div className="habit-alert-config">
      <div className="habit-alert-config__header">
        <h3>Alerts for &quot;{habitName}&quot;</h3>
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
        <div className="habit-alert-config__loading">Loading alerts...</div>
      ) : (
        <>
          {alerts.length === 0 && !showAddForm ? (
            <div className="habit-alert-config__empty">
              <p>No alerts configured for this habit yet.</p>
              <p className="habit-alert-config__hint">
                Add alerts to receive notifications when it&apos;s time to work on this habit.
              </p>
            </div>
          ) : (
            <div className="habit-alert-config__list">
              {alerts.map((alert) => (
                <div key={alert.id} className="habit-alert-config__item">
                  <div className="habit-alert-config__item-info">
                    <div className="habit-alert-config__item-time">
                      {getAlertScheduleDescription(alert)}
                    </div>
                    <div className="habit-alert-config__item-status">
                      {alert.enabled ? (
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
                      onClick={() => handleToggleAlert(alert.id, alert.enabled)}
                      disabled={saving}
                    >
                      {alert.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      className="habit-alert-config__btn habit-alert-config__btn--delete"
                      onClick={() => handleDeleteAlert(alert.id)}
                      disabled={saving}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!showAddForm ? (
            <button
              type="button"
              className="habit-alert-config__add-btn"
              onClick={() => setShowAddForm(true)}
              disabled={saving}
            >
              + Add Alert
            </button>
          ) : (
            <div className="habit-alert-config__form">
              <h4>Add New Alert</h4>

              <div className="habit-alert-config__form-group">
                <label htmlFor="alert-time">Alert Time</label>
                <input
                  id="alert-time"
                  type="time"
                  value={newAlertTime}
                  onChange={(e) => setNewAlertTime(e.target.value)}
                  className="habit-alert-config__input"
                />
              </div>

              <div className="habit-alert-config__form-group">
                <label>Frequency</label>
                <div className="habit-alert-config__radio-group">
                  <label className="habit-alert-config__radio">
                    <input
                      type="radio"
                      name="frequency"
                      value="daily"
                      checked={frequencyMode === 'daily'}
                      onChange={() => {
                        setFrequencyMode('daily');
                        setNewAlertDays([]);
                      }}
                    />
                    <span>Daily</span>
                  </label>
                  <label className="habit-alert-config__radio">
                    <input
                      type="radio"
                      name="frequency"
                      value="custom"
                      checked={frequencyMode === 'custom'}
                      onChange={() => setFrequencyMode('custom')}
                    />
                    <span>Custom days</span>
                  </label>
                </div>
              </div>

              {frequencyMode === 'custom' && (
                <div className="habit-alert-config__form-group">
                  <label>Select Days</label>
                  <div className="habit-alert-config__days">
                    {DAYS_OF_WEEK.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        className={`habit-alert-config__day ${
                          newAlertDays.includes(day.value) ? 'habit-alert-config__day--selected' : ''
                        }`}
                        onClick={() => toggleDay(day.value)}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="habit-alert-config__form-actions">
                <button
                  type="button"
                  className="habit-alert-config__btn habit-alert-config__btn--primary"
                  onClick={handleAddAlert}
                  disabled={saving || (frequencyMode === 'custom' && newAlertDays.length === 0)}
                >
                  {saving ? 'Adding...' : 'Add Alert'}
                </button>
                <button
                  type="button"
                  className="habit-alert-config__btn habit-alert-config__btn--secondary"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewAlertTime('08:00');
                    setNewAlertDays([]);
                    setFrequencyMode('daily');
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
