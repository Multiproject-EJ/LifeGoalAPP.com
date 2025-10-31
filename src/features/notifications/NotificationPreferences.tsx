import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  disableNotificationPreferences,
  fetchNotificationPreferences,
  upsertNotificationPreferences,
  type NotificationPreferencesRow,
} from '../../services/notifications';
import {
  getExistingSubscription,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from '../../services/pushNotifications';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';

const DEFAULT_REMINDER_TIME = '08:00';

type PreferenceState = {
  habitRemindersEnabled: boolean;
  checkinNudgesEnabled: boolean;
  reminderTime: string;
  timezone: string;
};

type StatusState = { kind: 'success' | 'error'; message: string } | null;

type Props = {
  session: Session;
};

function mapRowToState(row: NotificationPreferencesRow | null, fallbackTimezone: string): {
  state: PreferenceState;
  subscription: PushSubscriptionJSON | null;
} {
  if (!row) {
    return {
      state: {
        habitRemindersEnabled: true,
        checkinNudgesEnabled: true,
        reminderTime: DEFAULT_REMINDER_TIME,
        timezone: fallbackTimezone,
      },
      subscription: null,
    };
  }

  return {
    state: {
      habitRemindersEnabled: row.habit_reminders_enabled,
      checkinNudgesEnabled: row.checkin_nudges_enabled,
      reminderTime: row.habit_reminder_time ?? DEFAULT_REMINDER_TIME,
      timezone: row.timezone ?? fallbackTimezone,
    },
    subscription: (row.subscription as PushSubscriptionJSON | null) ?? null,
  };
}

export function NotificationPreferences({ session }: Props) {
  const { mode } = useSupabaseAuth();
  const isDemoMode = mode === 'demo';
  const fallbackTimezone = useMemo(() => {
    if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
      return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
    }
    return 'UTC';
  }, []);

  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [supportChecked, setSupportChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<PreferenceState>({
    habitRemindersEnabled: true,
    checkinNudgesEnabled: true,
    reminderTime: DEFAULT_REMINDER_TIME,
    timezone: fallbackTimezone,
  });
  const [subscription, setSubscription] = useState<PushSubscriptionJSON | null>(null);
  const [status, setStatus] = useState<StatusState>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [timezoneDraft, setTimezoneDraft] = useState<string>(fallbackTimezone);

  useEffect(() => {
    const supported = isPushSupported();
    setIsSupported(supported);
    setSupportChecked(true);
    if (supported && typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    } else {
      setPermission('denied');
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    fetchNotificationPreferences(session.user.id)
      .then(async ({ data, error }) => {
        if (!isActive) return;
        if (error) {
          console.error('Failed to load notification preferences:', error);
          setStatus({ kind: 'error', message: 'Unable to load your notification preferences right now.' });
          const existing = await getExistingSubscription();
          if (!isActive) return;
          setSubscription(existing ? existing.toJSON() : null);
          return;
        }

        const { state, subscription: storedSubscription } = mapRowToState(data, fallbackTimezone);
        setPreferences(state);
        setTimezoneDraft(state.timezone);
        if (storedSubscription) {
          setSubscription(storedSubscription);
        } else {
          const existing = await getExistingSubscription();
          if (!isActive) return;
          setSubscription(existing ? existing.toJSON() : null);
        }
      })
      .finally(() => {
        if (isActive) {
          setLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [session.user.id, fallbackTimezone]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_SUBSCRIPTION_EXPIRED') {
        setSubscription(null);
        setStatus({ kind: 'error', message: 'Push subscription expired. Enable notifications again to resume reminders.' });
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    setTimezoneDraft(preferences.timezone);
  }, [preferences.timezone]);

  const isReady = permission === 'granted' && Boolean(subscription);

  const persistPreferences = async (
    nextState: PreferenceState,
    nextSubscription: PushSubscriptionJSON | null,
    successMessage = 'Notification preferences updated.',
  ) => {
    setSaving(true);
    setStatus(null);
    const previousState = preferences;
    const previousSubscription = subscription;
    setPreferences(nextState);
    setSubscription(nextSubscription);
    try {
      const { error } = await upsertNotificationPreferences(session.user.id, {
        habitRemindersEnabled: nextState.habitRemindersEnabled,
        checkinNudgesEnabled: nextState.checkinNudgesEnabled,
        reminderTime: nextState.reminderTime || null,
        timezone: nextState.timezone,
        subscription: nextSubscription,
      });
      if (error) throw error;
      setStatus({ kind: 'success', message: successMessage });
      return true;
    } catch (error) {
      setPreferences(previousState);
      setSubscription(previousSubscription);
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Unable to save notification preferences.',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleEnableNotifications = async () => {
    if (!isSupported) {
      setStatus({ kind: 'error', message: 'Push notifications are not supported in this browser.' });
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      const subscriptionResult = await subscribeToPush();
      setPermission('granted');
      const subscriptionJson = subscriptionResult.toJSON();
      const nextState = {
        ...preferences,
        habitRemindersEnabled: true,
        checkinNudgesEnabled: true,
      };
      await persistPreferences(nextState, subscriptionJson, 'Notifications enabled for habit reminders and check-ins.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to enable notifications.';
      setStatus({ kind: 'error', message });
      if (typeof Notification !== 'undefined') {
        setPermission(Notification.permission);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDisableNotifications = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await unsubscribeFromPush();
      const { error } = await disableNotificationPreferences(session.user.id);
      if (error) throw error;
      setSubscription(null);
      setPreferences((prev) => ({
        ...prev,
        habitRemindersEnabled: false,
        checkinNudgesEnabled: false,
      }));
      setStatus({ kind: 'success', message: 'Push notifications disabled.' });
      if (typeof Notification !== 'undefined') {
        setPermission(Notification.permission);
      }
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Unable to disable notifications.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleChange = async (
    field: 'habitRemindersEnabled' | 'checkinNudgesEnabled',
    value: boolean,
  ) => {
    if (preferences[field] === value) return;
    const nextState = { ...preferences, [field]: value };
    await persistPreferences(nextState, subscription);
  };

  const handleReminderTimeChange = async (value: string) => {
    if (value === preferences.reminderTime) return;
    const nextState = { ...preferences, reminderTime: value };
    await persistPreferences(nextState, subscription);
  };

  const handleTimezoneCommit = async () => {
    const sanitized = timezoneDraft.trim() || fallbackTimezone;
    if (sanitized === preferences.timezone) return;
    const nextState = { ...preferences, timezone: sanitized };
    await persistPreferences(nextState, subscription);
  };

  return (
    <section className="notification-preferences">
      <header className="notification-preferences__header">
        <h2>Habit &amp; Check-in Notifications</h2>
        <p>
          Configure push reminders so LifeGoalApp can nudge you when it&apos;s time to complete habits or capture a life wheel
          check-in.
        </p>
      </header>

      {isDemoMode && (
        <p className="notification-preferences__message notification-preferences__message--info">
          Demo mode stores notification preferences locally. Connect Supabase and configure web push credentials to deliver
          reminders across your devices.
        </p>
      )}

      {!supportChecked || loading ? (
        <p className="notification-preferences__loading">Checking notification settings…</p>
      ) : !isSupported ? (
        <p className="notification-preferences__unsupported">
          Push notifications are not supported in this browser. Try using a Chromium-based or Safari browser on desktop or
          mobile.
        </p>
      ) : (
        <div className="notification-preferences__card">
          <div className="notification-preferences__status-row">
            <span className="notification-preferences__label">Permission</span>
            <span className={`notification-preferences__permission notification-preferences__permission--${permission}`}>
              {permission}
            </span>
          </div>

          {status && (
            <p
              className={`notification-preferences__message notification-preferences__message--${status.kind}`}
              role={status.kind === 'error' ? 'alert' : 'status'}
            >
              {status.message}
            </p>
          )}

          {!isReady ? (
            <button
              type="button"
              className="notification-preferences__action"
              onClick={handleEnableNotifications}
              disabled={saving}
            >
              {saving ? 'Enabling…' : 'Enable notifications'}
            </button>
          ) : (
            <>
              <div className="notification-preferences__control">
                <label>
                  <input
                    type="checkbox"
                    checked={preferences.habitRemindersEnabled}
                    onChange={(event) => handleToggleChange('habitRemindersEnabled', event.target.checked)}
                    disabled={saving}
                  />
                  Habit reminders
                </label>
                <p>Receive a nudge when a habit is due on today&apos;s checklist.</p>
              </div>

              <div className="notification-preferences__control">
                <label>
                  <input
                    type="checkbox"
                    checked={preferences.checkinNudgesEnabled}
                    onChange={(event) => handleToggleChange('checkinNudgesEnabled', event.target.checked)}
                    disabled={saving}
                  />
                  Life wheel check-in nudges
                </label>
                <p>Get prompted to log a new check-in so your radar chart stays fresh.</p>
              </div>

              <div className="notification-preferences__control notification-preferences__control--inline">
                <label className="notification-preferences__inline">
                  Reminder time
                  <input
                    type="time"
                    value={preferences.reminderTime}
                    onChange={(event) => handleReminderTimeChange(event.target.value)}
                    disabled={saving}
                  />
                </label>
                <p>We&apos;ll queue reminders around this local time.</p>
              </div>

              <div className="notification-preferences__control notification-preferences__control--inline">
                <label className="notification-preferences__inline">
                  Time zone
                  <input
                    type="text"
                    value={timezoneDraft}
                    onChange={(event) => setTimezoneDraft(event.target.value)}
                    onBlur={handleTimezoneCommit}
                    placeholder="America/New_York"
                    disabled={saving}
                  />
                </label>
                <p>Detected from your device. Adjust if you prefer reminders in another time zone.</p>
              </div>

              <button
                type="button"
                className="notification-preferences__action notification-preferences__action--secondary"
                onClick={handleDisableNotifications}
                disabled={saving}
              >
                {saving ? 'Disabling…' : 'Disable notifications'}
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
