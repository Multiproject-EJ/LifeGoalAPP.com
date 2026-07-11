/**
 * Service Resilience Framework — shared types.
 *
 * Cloud availability is treated as a capability, not an assumption. Every
 * feature consumes these application-level states instead of inspecting
 * provider (Supabase) errors directly. This module is environment-agnostic:
 * no DOM, no import.meta, no Supabase imports — it must compile for the
 * browser PWA today and the Capacitor (SQLite) build later.
 */

/** Individual cloud services monitored independently (Part 10). */
export type ServiceKind =
  | 'auth'
  | 'database'
  | 'storage'
  | 'realtime'
  | 'edgeFunctions';

export const ALL_SERVICES: readonly ServiceKind[] = [
  'auth',
  'database',
  'storage',
  'realtime',
  'edgeFunctions',
] as const;

/** Health of a single service. */
export type ServiceState = 'healthy' | 'degraded' | 'unavailable' | 'unknown';

/**
 * Application-wide operating mode. Chosen by the ServiceHealthManager from
 * per-service states; features and UI branch on this, never on raw errors.
 */
export type OperatingMode =
  | 'ONLINE'
  | 'DEGRADED'
  | 'OFFLINE'
  | 'MAINTENANCE'
  | 'ACCOUNT_ACTION_REQUIRED'
  | 'UNSAFE';

/** Categories every provider error is translated into (Part 2). */
export type AppErrorCategory =
  | 'offline'
  | 'timeout'
  | 'quota_exceeded'
  | 'project_restricted'
  | 'maintenance'
  | 'auth_expired'
  | 'invalid_credentials'
  | 'permission_denied'
  | 'storage_unavailable'
  | 'realtime_unavailable'
  | 'edge_function_unavailable'
  | 'rate_limited'
  | 'conflict'
  | 'unknown';

export type AppErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * The only error shape allowed to reach feature code and UI. Raw provider
 * payloads stay inside `technicalDetail` for diagnostics export and never
 * render directly.
 */
export interface AppError {
  /** Stable machine-readable code, e.g. `SVC_QUOTA_EXCEEDED`. */
  code: string;
  category: AppErrorCategory;
  severity: AppErrorSeverity;
  /** Whether retrying the same operation may succeed without user action. */
  retryable: boolean;
  /** Whether the app can keep operating on local data while this persists. */
  safeLocalMode: boolean;
  /** Short human title, e.g. "Cloud sync delayed". */
  title: string;
  /** Human explanation with no provider jargon. */
  explanation: string;
  /** Which service the failure was observed on, when known. */
  service?: ServiceKind;
  /** Original provider message/status, for diagnostics only — never for UI. */
  technicalDetail?: string;
}

/** Snapshot of overall cloud health exposed to features and UI (Part 1). */
export interface ServiceHealthSnapshot {
  overall: OperatingMode;
  services: Record<ServiceKind, ServiceState>;
  /** ISO timestamp of the last successful cloud interaction, if any. */
  lastSuccessAt: string | null;
  /** ISO timestamp of the last health evaluation. */
  lastCheckAt: string | null;
  /** Machine code of the current incident (from the dominant error), if any. */
  incidentCode: string | null;
  /** True when the browser/network layer reports no connectivity. */
  networkOnline: boolean;
  /** Optional externally published incident message (Part 12). */
  incidentMessage: string | null;
}

/** Capability requirements a feature declares up front (Part 5). */
export interface FeatureRequirements {
  network: boolean;
  cloud: boolean;
  auth: boolean;
  realtime: boolean;
  storage: boolean;
  edgeFunctions: boolean;
}

/** How a feature behaves when its requirements are not met (Part 8). */
export type DegradationPolicy =
  /** Fully usable on local data; changes sync later. */
  | 'local'
  /** Usable now; the resulting writes queue for later sync. */
  | 'queue'
  /** Temporarily paused with an explanation; resumes automatically. */
  | 'pause'
  /** Hard-blocked (economy/account safety); never bypassed locally. */
  | 'block';

export type FeatureAvailability =
  | { status: 'available' }
  | { status: 'local'; reason: string }
  | { status: 'queued'; reason: string }
  | { status: 'paused'; reason: string }
  | { status: 'blocked'; reason: string };

export interface FeatureCapability {
  id: string;
  label: string;
  requires: FeatureRequirements;
  whenUnavailable: DegradationPolicy;
}

/** Listener signature for health changes. */
export type ServiceHealthListener = (snapshot: ServiceHealthSnapshot) => void;

/** Injectable clock so tests and backoff logic stay deterministic. */
export type Clock = () => number;

export const systemClock: Clock = () => Date.now();
