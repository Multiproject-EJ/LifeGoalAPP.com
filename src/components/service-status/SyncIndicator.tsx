/**
 * Compact sync indicator (Part 4) — for headers/settings rows that want to
 * show pending-change state without the full banner.
 */

import { useServiceHealth } from '../../hooks/useServiceHealth';
import './serviceStatus.css';

export function SyncIndicator() {
  const { snapshot, queueCounts } = useServiceHealth();
  const waiting = queueCounts.pending + queueCounts.syncing;

  if (queueCounts.failed > 0) {
    return (
      <span className="sync-indicator sync-indicator--failed">
        ⚠ {queueCounts.failed} change{queueCounts.failed === 1 ? '' : 's'} need retry
      </span>
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
