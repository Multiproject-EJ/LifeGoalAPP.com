/**
 * Compact sync indicator (Part 4) — for headers/settings rows that want to
 * show pending-change state without the full banner. When changes are stuck
 * it becomes a button that opens the list of what needs attention.
 */

import { useState } from 'react';
import { useServiceHealth } from '../../hooks/useServiceHealth';
import { SyncIssuesSheet } from './SyncIssuesSheet';
import './serviceStatus.css';

export function SyncIndicator() {
  const { snapshot, queueCounts } = useServiceHealth();
  const [showIssues, setShowIssues] = useState(false);
  const waiting = queueCounts.pending + queueCounts.syncing;
  const stuck = queueCounts.failed + queueCounts.blocked;

  if (stuck > 0 || showIssues) {
    return (
      <>
        {stuck > 0 ? (
          <button
            type="button"
            className="sync-indicator sync-indicator--failed sync-indicator--button"
            onClick={() => setShowIssues(true)}
            aria-haspopup="dialog"
          >
            ⚠ {stuck} change{stuck === 1 ? '' : 's'} need retry
          </button>
        ) : null}
        {showIssues ? <SyncIssuesSheet onClose={() => setShowIssues(false)} /> : null}
      </>
    );
  }
  if (waiting > 0) {
    return (
      <span className="sync-indicator">
        ⟳ {snapshot.overall === 'ONLINE' ? 'Syncing' : 'Will sync later'} ({waiting})
      </span>
    );
  }
  return null;
}
