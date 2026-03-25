import { useCallback, useEffect, useMemo, useState } from 'react';
import { getGoalQueueStatus } from '../services/goals';
import { getHabitCompletionQueueStatus } from '../services/habitMonthlyQueries';
import { getHabitReminderQueueStatus } from '../services/habitReminderPrefs';
import { getHabitsV2QueueStatus, getHabitLogV2QueueStatus } from '../services/habitsV2';
import { getJournalQueueStatus } from '../services/journal';
import { getLifeGoalQueueStatus } from '../services/lifeGoals';
import { getPersonalityTestQueueStatus } from '../services/personalityTest';
import {
  clearOfflineSyncTelemetry,
  getOfflineSyncTelemetry,
  getOfflineSyncTelemetrySummary,
  type OfflineSyncTelemetryEvent,
  type OfflineSyncTelemetrySummary,
} from '../services/offlineSyncTelemetry';
import { getVisionImageQueueStatus } from '../services/visionBoard';

type Props = {
  userId: string | null;
};

type QueueSnapshot = {
  goals: { pending: number; failed: number };
  lifeGoals: { pending: number; failed: number };
  journal: { pending: number; failed: number };
  habits: { pending: number; failed: number };
  habitLogs: { pending: number; failed: number };
  habitCompletions: { pending: number; failed: number };
  habitReminders: { pending: number; failed: number };
  personality: { pending: number; failed: number };
  visionBoard: { pending: number; failed: number };
};

const EMPTY_QUEUE: QueueSnapshot = {
  goals: { pending: 0, failed: 0 },
  lifeGoals: { pending: 0, failed: 0 },
  journal: { pending: 0, failed: 0 },
  habits: { pending: 0, failed: 0 },
  habitLogs: { pending: 0, failed: 0 },
  habitCompletions: { pending: 0, failed: 0 },
  habitReminders: { pending: 0, failed: 0 },
  personality: { pending: 0, failed: 0 },
  visionBoard: { pending: 0, failed: 0 },
};

export function OfflineSyncDevPanel({ userId }: Props) {
  const [open, setOpen] = useState(false);
  const [queue, setQueue] = useState<QueueSnapshot>(EMPTY_QUEUE);
  const [events, setEvents] = useState<OfflineSyncTelemetryEvent[]>([]);
  const [summary, setSummary] = useState<OfflineSyncTelemetrySummary[]>([]);

  const refresh = useCallback(async () => {
    if (!userId) {
      setQueue(EMPTY_QUEUE);
      setEvents(getOfflineSyncTelemetry(25));
      setSummary(getOfflineSyncTelemetrySummary(200));
      return;
    }
    const [
      goals,
      lifeGoals,
      journal,
      habits,
      habitLogs,
      habitCompletions,
      habitReminders,
      personality,
      visionBoard,
    ] = await Promise.all([
      getGoalQueueStatus(),
      getLifeGoalQueueStatus(),
      getJournalQueueStatus(),
      getHabitsV2QueueStatus(userId),
      getHabitLogV2QueueStatus(userId),
      getHabitCompletionQueueStatus(userId),
      getHabitReminderQueueStatus(userId),
      getPersonalityTestQueueStatus(userId),
      getVisionImageQueueStatus(userId),
    ]);
    setQueue({
      goals,
      lifeGoals,
      journal,
      habits,
      habitLogs,
      habitCompletions,
      habitReminders,
      personality,
      visionBoard,
    });
    setEvents(getOfflineSyncTelemetry(25));
    setSummary(getOfflineSyncTelemetrySummary(200));
  }, [userId]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    void refresh();
    const intervalId = window.setInterval(() => void refresh(), 10000);
    return () => window.clearInterval(intervalId);
  }, [refresh]);

  const totalPending = useMemo(() => Object.values(queue).reduce((acc, item) => acc + item.pending, 0), [queue]);
  const totalFailed = useMemo(() => Object.values(queue).reduce((acc, item) => acc + item.failed, 0), [queue]);

  if (!import.meta.env.DEV) return null;

  return (
    <aside
      style={{
        position: 'fixed',
        right: 12,
        bottom: 12,
        zIndex: 4000,
        width: open ? 420 : 210,
        maxHeight: open ? '70vh' : 'auto',
        overflow: 'auto',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.2)',
        background: 'rgba(20,20,20,0.92)',
        color: 'white',
        padding: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        fontSize: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <strong>Offline Sync Debug</strong>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" onClick={() => void refresh()}>
            Refresh
          </button>
          <button type="button" onClick={() => setOpen((value) => !value)}>
            {open ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      <div style={{ marginTop: 6 }}>
        Pending: <strong>{totalPending}</strong> · Failed: <strong>{totalFailed}</strong>
      </div>
      {open && (
        <>
          <hr />
          <div style={{ display: 'grid', gap: 4 }}>
            {Object.entries(queue).map(([key, value]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{key}</span>
                <span>
                  {value.pending} pending / {value.failed} failed
                </span>
              </div>
            ))}
          </div>
          <hr />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Telemetry summary</strong>
            <button
              type="button"
              onClick={() => {
                clearOfflineSyncTelemetry();
                void refresh();
              }}
            >
              Clear telemetry
            </button>
          </div>
          <ul style={{ margin: '6px 0 10px', paddingLeft: 18 }}>
            {summary.slice(0, 8).map((item) => (
              <li key={item.feature}>
                {item.feature}: {item.failed} fail / {item.succeeded} ok / {item.queued} queued
              </li>
            ))}
          </ul>
          <strong>Recent events</strong>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {events.slice().reverse().map((event) => (
              <li key={event.id}>
                {new Date(event.at).toLocaleTimeString()} · {event.feature} · {event.event}
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}
