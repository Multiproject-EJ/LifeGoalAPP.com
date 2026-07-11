/**
 * Circuit breaker (Part 11) — prevents retry storms against a failing service.
 *
 * closed     → requests flow normally
 * open       → requests are skipped locally until the cooldown elapses
 * half-open  → one probe request is allowed through to test recovery
 */

import { systemClock, type Clock } from './types';

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  /** Consecutive failures before the circuit opens. */
  failureThreshold?: number;
  /** How long the circuit stays open before allowing a probe (ms). */
  cooldownMs?: number;
  /** Cooldown growth factor for repeated open cycles (bounded). */
  cooldownBackoffFactor?: number;
  /** Upper bound on the cooldown (ms). */
  maxCooldownMs?: number;
  clock?: Clock;
}

export class CircuitBreaker {
  private readonly failureThreshold: number;
  private readonly baseCooldownMs: number;
  private readonly cooldownBackoffFactor: number;
  private readonly maxCooldownMs: number;
  private readonly clock: Clock;

  private consecutiveFailures = 0;
  private openedAt: number | null = null;
  private openCycles = 0;
  private probeInFlight = false;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.baseCooldownMs = options.cooldownMs ?? 30_000;
    this.cooldownBackoffFactor = options.cooldownBackoffFactor ?? 2;
    this.maxCooldownMs = options.maxCooldownMs ?? 5 * 60_000;
    this.clock = options.clock ?? systemClock;
  }

  get state(): CircuitState {
    if (this.openedAt === null) return 'closed';
    return this.clock() - this.openedAt >= this.currentCooldownMs() ? 'half-open' : 'open';
  }

  get failureCount(): number {
    return this.consecutiveFailures;
  }

  private currentCooldownMs(): number {
    const scaled =
      this.baseCooldownMs * Math.pow(this.cooldownBackoffFactor, Math.max(0, this.openCycles - 1));
    return Math.min(scaled, this.maxCooldownMs);
  }

  /**
   * Whether a request should be attempted right now. In half-open state only
   * a single probe is admitted at a time.
   */
  canRequest(): boolean {
    const state = this.state;
    if (state === 'closed') return true;
    if (state === 'open') return false;
    if (this.probeInFlight) return false;
    this.probeInFlight = true;
    return true;
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.openedAt = null;
    this.openCycles = 0;
    this.probeInFlight = false;
  }

  recordFailure(): void {
    this.probeInFlight = false;
    this.consecutiveFailures += 1;
    if (this.openedAt !== null) {
      // Failed probe while half-open: re-open with a longer cooldown.
      this.openedAt = this.clock();
      this.openCycles += 1;
      return;
    }
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.openedAt = this.clock();
      this.openCycles = 1;
    }
  }

  /** Force-close (e.g. network came back and a probe confirmed recovery). */
  reset(): void {
    this.recordSuccess();
  }
}
