/**
 * Browser wiring for the resilience framework.
 *
 * This is the only service-health module that touches the DOM or the
 * Supabase client. It connects:
 *   - navigator.onLine + online/offline events → manager.setNetworkOnline
 *   - lightweight Supabase probes (auth/database) → recovery monitoring
 *   - the optional external incident status feed (Part 12)
 *
 * The Capacitor build will provide its own wiring with the same manager.
 */

import { getServiceHealthManager } from './serviceHealthManager';
import { fetchRemoteIncident } from './incidentStatus';
import { getSupabaseClient, getSupabaseUrl, hasSupabaseCredentials } from '../../lib/supabaseClient';

const INCIDENT_POLL_MS = 5 * 60_000;
const PROBE_TIMEOUT_MS = 8_000;

let initialized = false;

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('probe timeout')), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function registerSupabaseProbes(): void {
  const manager = getServiceHealthManager();
  if (!hasSupabaseCredentials()) return;

  manager.registerProbe('auth', async () => {
    const supabase = getSupabaseClient();
    const { error } = await withTimeout(supabase.auth.getSession(), PROBE_TIMEOUT_MS);
    return !error;
  });

  manager.registerProbe('database', async () => {
    // A REST reachability check against the project URL is enough to know the
    // database API answers; it avoids querying (and loading) real tables.
    const url = getSupabaseUrl();
    if (!url || typeof fetch === 'undefined') return false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
      const response = await fetch(`${url}/rest/v1/`, {
        method: 'HEAD',
        signal: controller.signal,
      });
      // Any HTTP answer (including 401 without a key) proves the service is up.
      return response.status < 500;
    } finally {
      clearTimeout(timer);
    }
  });
}

function readStatusUrl(): string | null {
  const env = import.meta.env as Record<string, string | undefined>;
  const value = env.VITE_SERVICE_STATUS_URL;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function startIncidentPolling(): void {
  const statusUrl = readStatusUrl();
  if (!statusUrl) return;
  const manager = getServiceHealthManager();

  const poll = async () => {
    const incident = await fetchRemoteIncident({ url: statusUrl });
    manager.setIncidentMessage(incident?.active ? `${incident.title} — ${incident.message}` : null);
  };
  void poll();
  window.setInterval(() => void poll(), INCIDENT_POLL_MS);
}

/** Idempotent app-boot hook. Safe to call before React renders. */
export function initServiceHealthForBrowser(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  const manager = getServiceHealthManager();
  manager.setNetworkOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
  window.addEventListener('online', () => manager.setNetworkOnline(true));
  window.addEventListener('offline', () => manager.setNetworkOnline(false));

  registerSupabaseProbes();
  manager.startRecoveryMonitor();
  startIncidentPolling();
}
