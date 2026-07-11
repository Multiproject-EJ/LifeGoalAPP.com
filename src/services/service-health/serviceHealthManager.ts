/**
 * ServiceHealthManager (Part 1) — the single source of truth for cloud health.
 *
 * Features report successes/failures here (directly or via guardedCloudCall)
 * and consume the resulting snapshot/capabilities. No feature decides
 * "Supabase failed, therefore …" on its own.
 *
 * Environment-agnostic: no DOM access. Browser event wiring lives in
 * browserWiring.ts; probes are injected so the Capacitor build can supply
 * its own.
 */

import { CircuitBreaker } from './circuitBreaker';
import { BoundedLog } from './boundedLog';
import { translateProviderError, isAppError } from './errorTranslation';
import {
  ALL_SERVICES,
  systemClock,
  type AppError,
  type Clock,
  type OperatingMode,
  type ServiceHealthListener,
  type ServiceHealthSnapshot,
  type ServiceKind,
  type ServiceState,
} from './types';

/** A probe resolves true when the service answered a lightweight request. */
export type ServiceProbe = () => Promise<boolean>;

interface ServiceRecord {
  state: ServiceState;
  lastError: AppError | null;
  lastChangeAt: number | null;
}

export interface ServiceHealthManagerOptions {
  clock?: Clock;
  /** Consecutive failures before a service circuit opens. */
  failureThreshold?: number;
  /** Circuit cooldown before recovery probes are allowed (ms). */
  cooldownMs?: number;
  /** How often the recovery monitor probes unhealthy services (ms). */
  recoveryProbeIntervalMs?: number;
}

const DEGRADED_AFTER_FAILURES = 1;

export class ServiceHealthManager {
  private readonly clock: Clock;
  private readonly recoveryProbeIntervalMs: number;
  private readonly services = new Map<ServiceKind, ServiceRecord>();
  private readonly breakers = new Map<ServiceKind, CircuitBreaker>();
  private readonly probes = new Map<ServiceKind, ServiceProbe>();
  private readonly listeners = new Set<ServiceHealthListener>();
  readonly eventLog = new BoundedLog<{ service?: ServiceKind; detail: string }>({
    maxEntries: 150,
  });

  private networkOnline = true;
  private accountActionRequired = false;
  private localPersistenceFailed = false;
  private lastSuccessAt: number | null = null;
  private lastCheckAt: number | null = null;
  private incidentMessage: string | null = null;
  private recoveryTimer: ReturnType<typeof setTimeout> | null = null;
  private recoveryProbeRunning = false;

  constructor(options: ServiceHealthManagerOptions = {}) {
    this.clock = options.clock ?? systemClock;
    this.recoveryProbeIntervalMs = options.recoveryProbeIntervalMs ?? 45_000;
    for (const service of ALL_SERVICES) {
      this.services.set(service, { state: 'unknown', lastError: null, lastChangeAt: null });
      this.breakers.set(
        service,
        new CircuitBreaker({
          failureThreshold: options.failureThreshold ?? 5,
          cooldownMs: options.cooldownMs ?? 30_000,
          clock: this.clock,
        }),
      );
    }
  }

  // ── Reporting ────────────────────────────────────────────────────────────

  reportSuccess(service: ServiceKind): void {
    const record = this.record(service);
    this.breaker(service).recordSuccess();
    this.lastSuccessAt = this.clock();
    this.lastCheckAt = this.lastSuccessAt;
    if (record.state !== 'healthy' || record.lastError) {
      record.state = 'healthy';
      record.lastError = null;
      record.lastChangeAt = this.clock();
      this.eventLog.push(`recovered:${service}`, { service, detail: 'service recovered' });
      this.notify();
    }
  }

  /**
   * Report a provider failure. Returns the translated AppError so callers can
   * surface it (never the raw error) to their own flows.
   */
  reportFailure(service: ServiceKind, error: unknown): AppError {
    const appError = isAppError(error)
      ? error
      : translateProviderError(error, { service, networkOnline: this.networkOnline });
    const record = this.record(service);
    const breaker = this.breaker(service);
    this.lastCheckAt = this.clock();

    // Credential mistakes and permission checks are normal application flow,
    // not service degradation — they must not trip the circuit breaker
    // (wrong passwords should never lock the sign-in form).
    const countsAgainstHealth =
      appError.category !== 'invalid_credentials' && appError.category !== 'permission_denied' &&
      appError.category !== 'conflict';

    if (countsAgainstHealth) {
      breaker.recordFailure();
      const nextState: ServiceState =
        breaker.state !== 'closed' || !appError.retryable
          ? 'unavailable'
          : breaker.failureCount >= DEGRADED_AFTER_FAILURES
            ? 'degraded'
            : record.state;
      if (record.state !== nextState || record.lastError?.code !== appError.code) {
        record.state = nextState;
        record.lastError = appError;
        record.lastChangeAt = this.clock();
        this.eventLog.push(`failure:${service}:${appError.code}`, {
          service,
          detail: appError.technicalDetail ?? appError.code,
        });
        this.notify();
      } else {
        record.lastError = appError;
      }
    }

    if (appError.category === 'auth_expired') {
      this.setAccountActionRequired(true);
    }

    return appError;
  }

  /** Gate a request through the service's circuit breaker (Part 11). */
  canRequest(service: ServiceKind): boolean {
    if (!this.networkOnline) return false;
    return this.breaker(service).canRequest();
  }

  // ── External signals ─────────────────────────────────────────────────────

  setNetworkOnline(online: boolean): void {
    if (this.networkOnline === online) return;
    this.networkOnline = online;
    this.eventLog.push(`network:${online ? 'online' : 'offline'}`, {
      detail: online ? 'network restored' : 'network lost',
    });
    if (online) {
      // Give services a fresh chance instead of waiting out cooldowns.
      for (const breaker of this.breakers.values()) breaker.reset();
      void this.runRecoveryProbes();
    }
    this.notify();
  }

  /** Session must be re-established (expired/blocked). Never bypassed locally. */
  setAccountActionRequired(required: boolean): void {
    if (this.accountActionRequired === required) return;
    this.accountActionRequired = required;
    this.notify();
  }

  /** Local persistence itself failed — the one state we cannot paper over. */
  setLocalPersistenceFailed(failed: boolean): void {
    if (this.localPersistenceFailed === failed) return;
    this.localPersistenceFailed = failed;
    this.notify();
  }

  /** Externally published incident message (Part 12). */
  setIncidentMessage(message: string | null): void {
    if (this.incidentMessage === message) return;
    this.incidentMessage = message;
    this.notify();
  }

  // ── Probes / recovery (Part 10) ──────────────────────────────────────────

  registerProbe(service: ServiceKind, probe: ServiceProbe): void {
    this.probes.set(service, probe);
  }

  /** Probe currently unhealthy services (circuit-gated; never a storm). */
  async runRecoveryProbes(): Promise<void> {
    if (this.recoveryProbeRunning || !this.networkOnline) return;
    this.recoveryProbeRunning = true;
    try {
      for (const [service, probe] of this.probes) {
        const record = this.record(service);
        if (record.state === 'healthy') continue;
        if (!this.breaker(service).canRequest()) continue;
        try {
          const healthy = await probe();
          if (healthy) {
            this.reportSuccess(service);
          } else {
            this.breaker(service).recordFailure();
          }
        } catch (error) {
          this.reportFailure(service, error);
        }
      }
      this.lastCheckAt = this.clock();
    } finally {
      this.recoveryProbeRunning = false;
    }
  }

  /** Periodically probe for recovery while anything is unhealthy. */
  startRecoveryMonitor(): void {
    if (this.recoveryTimer !== null) return;
    const tick = () => {
      this.recoveryTimer = setTimeout(async () => {
        const anyUnhealthy = Array.from(this.services.values()).some(
          (record) => record.state === 'degraded' || record.state === 'unavailable',
        );
        if (anyUnhealthy) {
          await this.runRecoveryProbes();
        }
        this.recoveryTimer = null;
        tick();
      }, this.recoveryProbeIntervalMs);
    };
    tick();
  }

  stopRecoveryMonitor(): void {
    if (this.recoveryTimer !== null) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
  }

  // ── Snapshot / subscription ──────────────────────────────────────────────

  getSnapshot(): ServiceHealthSnapshot {
    const services = {} as Record<ServiceKind, ServiceState>;
    for (const service of ALL_SERVICES) {
      services[service] = this.record(service).state;
    }
    return {
      overall: this.computeMode(),
      services,
      lastSuccessAt: this.lastSuccessAt ? new Date(this.lastSuccessAt).toISOString() : null,
      lastCheckAt: this.lastCheckAt ? new Date(this.lastCheckAt).toISOString() : null,
      incidentCode: this.currentIncidentCode(),
      networkOnline: this.networkOnline,
      incidentMessage: this.incidentMessage,
    };
  }

  getLastError(service: ServiceKind): AppError | null {
    return this.record(service).lastError;
  }

  subscribe(listener: ServiceHealthListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ── Internals ────────────────────────────────────────────────────────────

  private computeMode(): OperatingMode {
    if (this.localPersistenceFailed) return 'UNSAFE';
    if (!this.networkOnline) return 'OFFLINE';
    if (this.accountActionRequired) return 'ACCOUNT_ACTION_REQUIRED';

    const records = Array.from(this.services.values());
    const errors = records
      .map((record) => record.lastError)
      .filter((error): error is AppError => Boolean(error));
    if (errors.some((error) => error.category === 'maintenance')) return 'MAINTENANCE';

    const core = [this.record('auth'), this.record('database')];
    if (core.every((record) => record.state === 'unavailable')) return 'OFFLINE';
    if (records.some((record) => record.state === 'degraded' || record.state === 'unavailable')) {
      return 'DEGRADED';
    }
    return 'ONLINE';
  }

  private currentIncidentCode(): string | null {
    const severityRank = { critical: 3, error: 2, warning: 1, info: 0 } as const;
    let dominant: AppError | null = null;
    for (const record of this.services.values()) {
      if (record.state === 'healthy' || !record.lastError) continue;
      if (!dominant || severityRank[record.lastError.severity] > severityRank[dominant.severity]) {
        dominant = record.lastError;
      }
    }
    return dominant?.code ?? null;
  }

  private record(service: ServiceKind): ServiceRecord {
    const record = this.services.get(service);
    if (!record) throw new Error(`Unknown service: ${service}`);
    return record;
  }

  private breaker(service: ServiceKind): CircuitBreaker {
    const breaker = this.breakers.get(service);
    if (!breaker) throw new Error(`Unknown service: ${service}`);
    return breaker;
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch {
        // A faulty listener must never take down health reporting.
      }
    }
  }
}

let sharedManager: ServiceHealthManager | null = null;

/** App-wide singleton. Tests construct their own instances instead. */
export function getServiceHealthManager(): ServiceHealthManager {
  if (!sharedManager) {
    sharedManager = new ServiceHealthManager();
  }
  return sharedManager;
}
