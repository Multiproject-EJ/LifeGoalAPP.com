import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  fetchHabitReminderPrefs,
  updateHabitReminderPref,
  formatTimeForDisplay,
  type HabitWithReminderPref,
} from '../../services/habitReminderPrefs';
import { isDemoSession } from '../../services/demoSession';

type Props = {
  session: Session;
};

type StatusState = { kind: 'success' | 'error'; message: string } | null;

export function PerHabitReminderPrefs({ session }: Props) {
  const isDemoExperience = isDemoSession(session);

  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState<HabitWithReminderPref[]>([]);
  const [status, setStatus] = useState<StatusState>(null);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  // Load habits with reminder prefs
  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchHabitReminderPrefs()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error('Failed to load habit reminder preferences:', error);
          setStatus({ kind: 'error', message: 'Unable to load habit reminder preferences.' });
          return;
        }
        if (data) {
          setHabits(data);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session.user.id]);

  const handleToggleEnabled = async (habitId: string, currentEnabled: boolean) => {
    const newEnabled = !currentEnabled;
    
    setSavingIds((prev) => new Set(prev).add(habitId));
    setStatus(null);

    const { error } = await updateHabitReminderPref(habitId, { enabled: newEnabled });

    setSavingIds((prev) => {
      const next = new Set(prev);
      next.delete(habitId);
      return next;
    });

    if (error) {
      setStatus({ kind: 'error', message: 'Failed to update preference. Please try again.' });
      return;
    }

    // Update local state
    setHabits((prev) =>
      prev.map((h) =>
        h.habit_id === habitId ? { ...h, enabled: newEnabled } : h
      )
    );
    setStatus({ kind: 'success', message: 'Preference updated!' });
  };

  const handleTimeChange = async (habitId: string, newTime: string) => {
    const timeValue = newTime === '' ? null : newTime;
    
    setSavingIds((prev) => new Set(prev).add(habitId));
    setStatus(null);

    const { error } = await updateHabitReminderPref(habitId, { preferred_time: timeValue });

    setSavingIds((prev) => {
      const next = new Set(prev);
      next.delete(habitId);
      return next;
    });

    if (error) {
      setStatus({ kind: 'error', message: 'Failed to update preferred time. Please try again.' });
      return;
    }

    // Update local state
    setHabits((prev) =>
      prev.map((h) =>
        h.habit_id === habitId ? { ...h, preferred_time: timeValue } : h
      )
    );
    setStatus({ kind: 'success', message: 'Preferred time updated!' });
  };

  if (loading) {
    return (
      <section className="account-panel__card" aria-labelledby="per-habit-reminder-prefs">
        <p className="account-panel__eyebrow">Per-Habit Reminders</p>
        <h3 id="per-habit-reminder-prefs">Individual Habit Reminder Settings</h3>
        <p className="notification-preferences__loading">Loading habits…</p>
      </section>
    );
  }

  return (
    <section className="account-panel__card" aria-labelledby="per-habit-reminder-prefs">
      <p className="account-panel__eyebrow">Per-Habit Reminders</p>
      <h3 id="per-habit-reminder-prefs">Individual Habit Reminder Settings</h3>
      <p className="account-panel__hint">
        Enable or disable reminders for individual habits, and optionally set a preferred time for each habit's
        reminder within your daily window.
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

      {habits.length === 0 ? (
        <p className="notification-preferences__message notification-preferences__message--info">
          No habits found. Create habits to configure their reminder settings.
        </p>
      ) : (
        <div className="notification-preferences__card">
          <ul className="per-habit-prefs__list">
            {habits.map((habit) => {
              const isSaving = savingIds.has(habit.habit_id);
              return (
                <li key={habit.habit_id} className="per-habit-prefs__item">
                  <div className="per-habit-prefs__habit-info">
                    <span className="per-habit-prefs__emoji">{habit.emoji || '📋'}</span>
                    <span className="per-habit-prefs__title">{habit.title}</span>
                  </div>
                  <div className="per-habit-prefs__controls">
                    <label className="per-habit-prefs__toggle-label">
                      <input
                        type="checkbox"
                        checked={habit.enabled}
                        onChange={() => handleToggleEnabled(habit.habit_id, habit.enabled)}
                        disabled={isSaving}
                        className="per-habit-prefs__toggle"
                      />
                      <span className="per-habit-prefs__toggle-text">
                        {habit.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                    <label className="per-habit-prefs__time-label">
                      <span className="per-habit-prefs__time-text">Preferred time:</span>
                      <input
                        type="time"
                        value={formatTimeForDisplay(habit.preferred_time)}
                        onChange={(e) => handleTimeChange(habit.habit_id, e.target.value)}
                        disabled={isSaving || !habit.enabled}
                        className="per-habit-prefs__time-input"
                        placeholder="Any"
                      />
                    </label>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
