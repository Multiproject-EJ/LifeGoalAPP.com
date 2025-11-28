import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  fetchReminderActionLogs,
  formatActionLabel,
  type ReminderActionLogWithHabit,
} from '../../services/habitReminderPrefs';
import { isDemoSession } from '../../services/demoSession';

type Props = {
  session: Session;
};

type StatusState = { kind: 'success' | 'error'; message: string } | null;

function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return 'Unknown';
  try {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return timestamp;
  }
}

export function ReminderActionDebugPanel({ session }: Props) {
  const isDemoExperience = isDemoSession(session);

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ReminderActionLogWithHabit[]>([]);
  const [status, setStatus] = useState<StatusState>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Load action logs when expanded
  useEffect(() => {
    if (!isExpanded) return;

    let active = true;
    setLoading(true);

    fetchReminderActionLogs(50)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error('Failed to load reminder action logs:', error);
          setStatus({ kind: 'error', message: 'Unable to load action logs.' });
          return;
        }
        if (data) {
          setLogs(data);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session.user.id, isExpanded]);

  const handleRefresh = async () => {
    setLoading(true);
    setStatus(null);

    const { data, error } = await fetchReminderActionLogs(50);
    
    setLoading(false);

    if (error) {
      setStatus({ kind: 'error', message: 'Failed to refresh logs.' });
      return;
    }

    if (data) {
      setLogs(data);
      setStatus({ kind: 'success', message: 'Logs refreshed!' });
    }
  };

  return (
    <section className="account-panel__card" aria-labelledby="reminder-action-debug">
      <p className="account-panel__eyebrow">Debugging</p>
      <h3 id="reminder-action-debug">Reminder Action Logs</h3>
      <p className="account-panel__hint">
        View recent notification actions (Done/Snooze/Dismiss) for debugging purposes.
      </p>

      <button
        type="button"
        className="notification-preferences__action notification-preferences__action--secondary"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        {isExpanded ? 'Hide Action Logs' : 'Show Action Logs'}
      </button>

      {isExpanded && (
        <div className="notification-preferences__card reminder-action-debug__panel">
          {isDemoExperience && (
            <p className="notification-preferences__message notification-preferences__message--info">
              Demo mode - no real action logs available.
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

          <div className="reminder-action-debug__header">
            <span className="reminder-action-debug__count">
              {logs.length} recent action{logs.length !== 1 ? 's' : ''}
            </span>
            <button
              type="button"
              className="notification-preferences__action notification-preferences__action--small"
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          {loading && logs.length === 0 ? (
            <p className="notification-preferences__loading">Loading logs…</p>
          ) : logs.length === 0 ? (
            <p className="notification-preferences__message notification-preferences__message--info">
              No action logs found. Actions will appear here when you interact with notification buttons.
            </p>
          ) : (
            <ul className="reminder-action-debug__list">
              {logs.map((log) => (
                <li key={log.id} className="reminder-action-debug__item">
                  <div className="reminder-action-debug__habit">
                    <span className="reminder-action-debug__emoji">
                      {log.habits_v2?.emoji || '📋'}
                    </span>
                    <span className="reminder-action-debug__title">
                      {log.habits_v2?.title || 'Unknown Habit'}
                    </span>
                  </div>
                  <div className="reminder-action-debug__details">
                    <span className={`reminder-action-debug__action reminder-action-debug__action--${log.action}`}>
                      {formatActionLabel(log.action)}
                    </span>
                    <span className="reminder-action-debug__time">
                      {formatTimestamp(log.created_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
