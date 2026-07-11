/**
 * Bounded logging utilities (Part 14).
 *
 * A previous incident saw unbounded client logging grow the database until
 * quota was exhausted. Every resilience log/telemetry sink in this framework
 * goes through a BoundedLog: hard entry caps, optional sampling, and
 * aggregation of repeated entries instead of raw append-forever.
 */

import { systemClock, type Clock } from './types';

export interface BoundedLogEntry<T> {
  at: string;
  key: string;
  /** How many identical events were aggregated into this entry. */
  count: number;
  data: T;
}

export interface BoundedLogOptions {
  /** Hard cap on retained entries; oldest entries rotate out. */
  maxEntries?: number;
  /** Keep 1-in-N entries for high-volume keys (1 = keep all). */
  sampleRate?: number;
  /** Aggregate consecutive entries with the same key within this window (ms). */
  aggregationWindowMs?: number;
  clock?: Clock;
}

export class BoundedLog<T = unknown> {
  private readonly maxEntries: number;
  private readonly sampleRate: number;
  private readonly aggregationWindowMs: number;
  private readonly clock: Clock;
  private entries: BoundedLogEntry<T>[] = [];
  private sampleCounters = new Map<string, number>();
  private droppedBySampling = 0;

  constructor(options: BoundedLogOptions = {}) {
    this.maxEntries = Math.max(1, options.maxEntries ?? 200);
    this.sampleRate = Math.max(1, options.sampleRate ?? 1);
    this.aggregationWindowMs = options.aggregationWindowMs ?? 5_000;
    this.clock = options.clock ?? systemClock;
  }

  push(key: string, data: T): void {
    const now = this.clock();

    const last = this.entries[this.entries.length - 1];
    if (last && last.key === key && now - Date.parse(last.at) <= this.aggregationWindowMs) {
      last.count += 1;
      last.data = data;
      return;
    }

    if (this.sampleRate > 1) {
      const seen = (this.sampleCounters.get(key) ?? 0) + 1;
      this.sampleCounters.set(key, seen);
      if (seen % this.sampleRate !== 1) {
        this.droppedBySampling += 1;
        return;
      }
    }

    this.entries.push({ at: new Date(now).toISOString(), key, count: 1, data });
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
  }

  list(limit = this.maxEntries): BoundedLogEntry<T>[] {
    return this.entries.slice(-Math.max(1, limit));
  }

  get size(): number {
    return this.entries.length;
  }

  get sampledOutCount(): number {
    return this.droppedBySampling;
  }

  clear(): void {
    this.entries = [];
    this.sampleCounters.clear();
    this.droppedBySampling = 0;
  }
}
