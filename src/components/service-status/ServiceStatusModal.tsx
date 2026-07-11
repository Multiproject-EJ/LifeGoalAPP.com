/**
 * Service status modal (Part 4) — the polished replacement for raw
 * `{ "message": … }` provider payloads. Consumes only translated health
 * state from the ServiceHealthManager.
 */

import { useServiceHealth } from '../../hooks/useServiceHealth';
import { getServiceHealthManager } from '../../services/service-health';
import { getSyncEngine } from '../../services/offline-queue';
import type { OperatingMode, ServiceState } from '../../services/service-health';
import './serviceStatus.css';

const MODE_COPY: Record<OperatingMode, { title: string; body: string }> = {
  ONLINE: {
    title: 'All services are running',
    body: 'HabitGame is fully connected. Everything is syncing normally.',
  },
  DEGRADED: {
    title: 'Some cloud features are unavailable',
    body: 'Cloud services are having trouble. HabitGame still works here, your changes are safe on this device, and everything will sync automatically when services return.',
  },
  OFFLINE: {
    title: 'HabitGame is temporarily offline',
    body: 'Cloud services are temporarily unavailable. Your work on this device is safe, supported features continue to work, and everything will sync automatically when services return.',
  },
  MAINTENANCE: {
    title: 'Scheduled maintenance in progress',
    body: 'Cloud services are being upgraded. Supported features keep working here and your changes will sync once maintenance finishes.',
  },
  ACCOUNT_ACTION_REQUIRED: {
    title: 'Please sign in again',
    body: 'Your session needs to be refreshed to keep your account in sync. Work saved on this device is not lost.',
  },
  UNSAFE: {
    title: 'Saving is unavailable on this device',
    body: 'HabitGame cannot store changes safely right now, so editing is paused to protect your data. Freeing up device storage usually resolves this.',
  },
};

const SERVICE_LABELS: Array<{ key: 'database' | 'auth' | 'edgeFunctions' | 'realtime' | 'storage'; label: string }> = [
  { key: 'database', label: 'Cloud Sync' },
  { key: 'auth', label: 'Authentication' },
  { key: 'edgeFunctions', label: 'Purchases & AI' },
  { key: 'realtime', label: 'Live Updates' },
  { key: 'storage', label: 'File Storage' },
];

function stateBadge(state: ServiceState): { className: string; label: string } {
  switch (state) {
    case 'healthy':
      return { className: 'service-status-modal__state--ok', label: 'Available' };
    case 'degraded':
      return { className: 'service-status-modal__state--degraded', label: 'Delayed' };
    case 'unavailable':
      return { className: 'service-status-modal__state--down', label: 'Unavailable' };
    default:
      return { className: 'service-status-modal__state--unknown', label: 'Standby' };
  }
}

export function ServiceStatusModal({ onClose }: { onClose: () => void }) {
  const { snapshot, queueCounts } = useServiceHealth();
  const copy = MODE_COPY[snapshot.overall];
  const localSaveOk = snapshot.overall !== 'UNSAFE';
  const pendingTotal = queueCounts.pending + queueCounts.failed + queueCounts.syncing;

  const handleRetry = () => {
    const manager = getServiceHealthManager();
    manager.setNetworkOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    void manager.runRecoveryProbes();
    void getSyncEngine().syncNow();
  };

  return (
    <div className="service-status-modal__backdrop" role="presentation" onClick={onClose}>
      <section
        className="service-status-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="service-status-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="service-status-modal__title" id="service-status-modal-title">
          {copy.title}
        </h2>
        <p className="service-status-modal__body">{snapshot.incidentMessage ?? copy.body}</p>

        <ul className="service-status-modal__list">
          {SERVICE_LABELS.map(({ key, label }) => {
            const badge = stateBadge(snapshot.services[key]);
            return (
              <li className="service-status-modal__row" key={key}>
                <span>{label}</span>
                <span className={`service-status-modal__state ${badge.className}`}>
                  <span className="service-status-modal__state-dot" />
                  {badge.label}
                </span>
              </li>
            );
          })}
          <li className="service-status-modal__row">
            <span>Local Save</span>
            <span
              className={`service-status-modal__state ${
                localSaveOk ? 'service-status-modal__state--ok' : 'service-status-modal__state--down'
              }`}
            >
              <span className="service-status-modal__state-dot" />
              {localSaveOk ? 'Protected' : 'Unavailable'}
            </span>
          </li>
        </ul>

        <div className="service-status-modal__actions">
          <button type="button" className="service-status-modal__button" onClick={handleRetry}>
            Retry
          </button>
          <button
            type="button"
            className="service-status-modal__button service-status-modal__button--primary"
            onClick={onClose}
          >
            Continue
          </button>
        </div>

        <p className="service-status-modal__meta">
          {pendingTotal > 0
            ? `${pendingTotal} change${pendingTotal === 1 ? '' : 's'} waiting to sync. `
            : ''}
          {snapshot.lastSuccessAt
            ? `Last successful sync ${new Date(snapshot.lastSuccessAt).toLocaleString()}.`
            : 'No cloud sync completed yet this session.'}
          {snapshot.incidentCode ? ` Ref: ${snapshot.incidentCode}` : ''}
        </p>
      </section>
    </div>
  );
}
