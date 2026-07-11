/**
 * Global service status banner (Part 4).
 *
 * Renders nothing while everything is ONLINE with an empty queue — the app
 * looks exactly as it does today. During an incident it shows a compact,
 * calm pill; tapping it opens the detailed ServiceStatusModal. After
 * recovery it flashes "Back online" briefly, then disappears.
 */

import { useEffect, useRef, useState } from 'react';
import { useServiceHealth } from '../../hooks/useServiceHealth';
import type { OperatingMode } from '../../services/service-health';
import { ServiceStatusModal } from './ServiceStatusModal';
import './serviceStatus.css';

const RECOVERED_FLASH_MS = 4_000;

const MODE_BANNER: Partial<Record<OperatingMode, { label: string; variant: string }>> = {
  OFFLINE: { label: 'Offline mode — changes stay safe on this device', variant: 'offline' },
  DEGRADED: { label: 'Cloud sync delayed — some features unavailable', variant: 'degraded' },
  MAINTENANCE: { label: 'Maintenance in progress — working locally', variant: 'degraded' },
  ACCOUNT_ACTION_REQUIRED: { label: 'Please sign in again to keep syncing', variant: 'degraded' },
  UNSAFE: { label: 'Saving is unavailable — editing paused', variant: 'degraded' },
};

export function ServiceStatusBanner() {
  const { snapshot, queueCounts } = useServiceHealth();
  const [showModal, setShowModal] = useState(false);
  const [showRecovered, setShowRecovered] = useState(false);
  const previousModeRef = useRef<OperatingMode>(snapshot.overall);
  const recoveredTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const previous = previousModeRef.current;
    previousModeRef.current = snapshot.overall;
    if (previous !== 'ONLINE' && snapshot.overall === 'ONLINE') {
      setShowRecovered(true);
      if (recoveredTimerRef.current !== null) window.clearTimeout(recoveredTimerRef.current);
      recoveredTimerRef.current = window.setTimeout(
        () => setShowRecovered(false),
        RECOVERED_FLASH_MS,
      );
    }
    return () => {
      if (recoveredTimerRef.current !== null) window.clearTimeout(recoveredTimerRef.current);
    };
  }, [snapshot.overall]);

  const syncingCount = queueCounts.syncing + queueCounts.pending;
  const incident = MODE_BANNER[snapshot.overall];

  let variant: string | null = null;
  let label: string | null = null;
  let detail: string | null = null;

  if (incident) {
    variant = incident.variant;
    label = incident.label;
    if (syncingCount > 0) {
      detail = `${syncingCount} change${syncingCount === 1 ? '' : 's'} saved for later`;
    }
  } else if (queueCounts.syncing > 0) {
    variant = 'syncing';
    label = 'Syncing…';
  } else if (showRecovered) {
    variant = 'recovered';
    label = 'Back online — everything synced';
  }

  if (!label) {
    return showModal ? <ServiceStatusModal onClose={() => setShowModal(false)} /> : null;
  }

  return (
    <>
      <button
        type="button"
        className={`service-status-banner service-status-banner--${variant}`}
        onClick={() => setShowModal(true)}
        aria-live="polite"
      >
        <span className="service-status-banner__dot" aria-hidden="true" />
        <span>{label}</span>
        {detail ? <span className="service-status-banner__detail">{detail}</span> : null}
      </button>
      {showModal ? <ServiceStatusModal onClose={() => setShowModal(false)} /> : null}
    </>
  );
}
