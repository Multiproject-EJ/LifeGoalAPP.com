/**
 * Diagnostics panel (Part 13) — embeddable in Settings.
 *
 * Shows cloud status, pending changes, last sync, current mode, and offers a
 * diagnostics export (JSON download) containing the bounded event log and
 * queue summary. Raw provider errors appear only inside the export, never in
 * the rendered UI.
 */

import { useCallback, useState } from 'react';
import { useServiceHealth } from '../../hooks/useServiceHealth';
import { getServiceHealthManager } from '../../services/service-health';
import { getMutationQueue, getSyncEngine } from '../../services/offline-queue';
import './serviceStatus.css';

declare const __APP_VERSION__: string | undefined;

function formatTimestamp(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : '—';
}

export function ServiceDiagnosticsPanel() {
  const { snapshot, queueCounts } = useServiceHealth();
  const [busy, setBusy] = useState(false);

  const handleRetrySync = useCallback(async () => {
    setBusy(true);
    try {
      await getMutationQueue().retryFailed();
      await getServiceHealthManager().runRecoveryProbes();
      await getSyncEngine().syncNow();
    } finally {
      setBusy(false);
    }
  }, []);

  const handleExport = useCallback(async () => {
    const manager = getServiceHealthManager();
    const queue = getMutationQueue();
    const mutations = await queue.list();
    const payload = {
      exportedAt: new Date().toISOString(),
      appVersion: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      health: manager.getSnapshot(),
      events: manager.eventLog.list(),
      queue: mutations.map((mutation) => ({
        id: mutation.id,
        feature: mutation.feature,
        operation: mutation.operation,
        status: mutation.status,
        attempts: mutation.attempts,
        createdAt: mutation.createdAt,
        lastErrorCode: mutation.lastErrorCode,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `habitgame-diagnostics-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, []);

  const pendingLabel =
    queueCounts.pending + queueCounts.syncing + queueCounts.failed === 0
      ? 'All changes synced'
      : `${queueCounts.pending + queueCounts.syncing} waiting · ${queueCounts.failed} failed · ${queueCounts.blocked} need review`;

  return (
    <section className="service-diagnostics" aria-label="Cloud service diagnostics">
      <dl className="service-diagnostics__grid">
        <dt>Cloud status</dt>
        <dd>{snapshot.overall}</dd>
        <dt>Network</dt>
        <dd>{snapshot.networkOnline ? 'Connected' : 'Offline'}</dd>
        <dt>Pending changes</dt>
        <dd>{pendingLabel}</dd>
        <dt>Last sync</dt>
        <dd>{formatTimestamp(snapshot.lastSuccessAt)}</dd>
        <dt>Last check</dt>
        <dd>{formatTimestamp(snapshot.lastCheckAt)}</dd>
        <dt>Incident</dt>
        <dd>{snapshot.incidentCode ?? 'None'}</dd>
      </dl>
      <div className="service-diagnostics__actions">
        <button
          type="button"
          className="service-status-modal__button"
          onClick={() => void handleRetrySync()}
          disabled={busy}
        >
          {busy ? 'Checking…' : 'Check & retry sync'}
        </button>
        <button type="button" className="service-status-modal__button" onClick={() => void handleExport()}>
          Export diagnostics
        </button>
      </div>
    </section>
  );
}
