/**
 * Sync issues sheet — lists saved changes that could not reach the cloud and
 * lets the player retry them all or discard ones they no longer need.
 * Opened from the floating sync indicator.
 */

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { describeErrorCode, getServiceHealthManager } from '../../services/service-health';
import { getMutationQueue, getSyncEngine, type PendingMutation } from '../../services/offline-queue';
import { lockPageScroll } from '../../utils/scrollLock';
import './serviceStatus.css';

const FEATURE_LABELS: Record<string, string> = {
  journal: 'Journal entry',
  vision_board: 'Vision board',
  goals: 'Goal',
  life_goals: 'Life goal',
  personality_test: 'Personality test',
  habits: 'Habit',
  habit_completions: 'Habit check-in',
  habit_reminders: 'Habit reminder',
  todos: 'To-do',
  purchases: 'Purchase',
  subscriptions: 'Subscription',
  quests: 'Quest',
  checkins: 'Check-in',
};

const ACTION_LABELS: Record<string, string> = {
  insert: 'added',
  create: 'created',
  create_url: 'added',
  create_file: 'added',
  upsert: 'saved',
  write: 'saved',
  save: 'saved',
  set: 'saved',
  update: 'edited',
  delete: 'deleted',
  pause: 'paused',
};

function describeMutation(mutation: PendingMutation): string {
  const feature = FEATURE_LABELS[mutation.feature]
    ?? mutation.feature.replace(/_/g, ' ').replace(/^./, (first) => first.toUpperCase());
  const action = mutation.operation.split('.').pop() ?? mutation.operation;
  return `${feature} ${ACTION_LABELS[action] ?? action.replace(/_/g, ' ')}`;
}

export function SyncIssuesSheet({ onClose }: { onClose: () => void }) {
  const [issues, setIssues] = useState<PendingMutation[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const all = await getMutationQueue().list();
    setIssues(all.filter((mutation) => mutation.status === 'failed' || mutation.status === 'blocked'));
  }, []);

  useEffect(() => {
    void refresh();
    const unsubscribe = getMutationQueue().subscribe(() => { void refresh(); });
    const unlockScroll = lockPageScroll();
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      unsubscribe();
      unlockScroll();
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, refresh]);

  const handleRetryAll = useCallback(async () => {
    setBusy(true);
    try {
      await getMutationQueue().retryFailed();
      await getServiceHealthManager().runRecoveryProbes();
      await getSyncEngine().syncNow();
    } finally {
      setBusy(false);
      void refresh();
    }
  }, [refresh]);

  const handleDiscard = useCallback(async (mutation: PendingMutation) => {
    const label = describeMutation(mutation);
    if (!window.confirm(`Discard "${label}"? This change will not be saved to your account.`)) return;
    await getMutationQueue().discard(mutation.id);
    void refresh();
  }, [refresh]);

  return createPortal(
    <div className="sync-issues-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="sync-issues" role="dialog" aria-modal="true" aria-labelledby="sync-issues-title">
        <header className="sync-issues__header">
          <h2 id="sync-issues-title">Changes waiting to sync</h2>
          <button type="button" className="sync-issues__close" aria-label="Close" onClick={onClose}>×</button>
        </header>
        <p className="sync-issues__intro">
          These were saved on this device but could not reach your account. Retry them, or discard any you no longer need.
        </p>
        {issues.length === 0 ? (
          <p className="sync-issues__empty">Everything is synced.</p>
        ) : (
          <ul className="sync-issues__list">
            {issues.map((mutation) => {
              const reason = describeErrorCode(mutation.lastErrorCode);
              return (
                <li key={mutation.id} className="sync-issues__item">
                  <div>
                    <strong>{describeMutation(mutation)}</strong>
                    <small>
                      {new Date(mutation.createdAt).toLocaleString()} · {mutation.attempts} {mutation.attempts === 1 ? 'try' : 'tries'}
                      {mutation.status === 'blocked' ? ' · needs review' : ''}
                    </small>
                    <span>{reason?.title ?? 'The cloud did not accept this change'}</span>
                  </div>
                  <button type="button" className="sync-issues__discard" onClick={() => void handleDiscard(mutation)}>
                    Discard
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="sync-issues__actions">
          <button type="button" className="service-status-modal__button" onClick={() => void handleRetryAll()} disabled={busy || issues.length === 0}>
            {busy ? 'Retrying…' : 'Retry all'}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
