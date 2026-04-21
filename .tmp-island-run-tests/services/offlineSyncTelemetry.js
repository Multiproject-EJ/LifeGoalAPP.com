"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordOfflineSyncEvent = recordOfflineSyncEvent;
exports.getOfflineSyncTelemetry = getOfflineSyncTelemetry;
exports.getOfflineSyncTelemetrySummary = getOfflineSyncTelemetrySummary;
exports.clearOfflineSyncTelemetry = clearOfflineSyncTelemetry;
const STORAGE_KEY = 'lifegoal_offline_sync_telemetry_v1';
const MAX_EVENTS = 400;
function canUseLocalStorage() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}
function readTelemetryEvents() {
    if (!canUseLocalStorage())
        return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
function writeTelemetryEvents(events) {
    if (!canUseLocalStorage())
        return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
    }
    catch {
        // Ignore storage quota failures.
    }
}
function recordOfflineSyncEvent(event) {
    const next = {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `telemetry-${Date.now()}`,
        at: new Date().toISOString(),
        ...event,
    };
    const events = readTelemetryEvents();
    events.push(next);
    writeTelemetryEvents(events);
    if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.info('[offline-sync]', next.feature, next.event, {
            userId: next.userId,
            pending: next.pending,
            failed: next.failed,
            attemptCount: next.attemptCount,
            error: next.error,
        });
    }
}
function getOfflineSyncTelemetry(limit = 100) {
    return readTelemetryEvents().slice(-Math.max(1, limit));
}
function getOfflineSyncTelemetrySummary(limit = 400) {
    const events = getOfflineSyncTelemetry(limit);
    const byFeature = new Map();
    for (const event of events) {
        const current = byFeature.get(event.feature) ??
            {
                feature: event.feature,
                total: 0,
                failed: 0,
                succeeded: 0,
                queued: 0,
                lastError: null,
                lastAt: null,
            };
        current.total += 1;
        if (event.event === 'sync_failed') {
            current.failed += 1;
            current.lastError = event.error ?? current.lastError;
        }
        if (event.event === 'sync_succeeded')
            current.succeeded += 1;
        if (event.event === 'queue_enqueued')
            current.queued += 1;
        current.lastAt = event.at;
        byFeature.set(event.feature, current);
    }
    return Array.from(byFeature.values()).sort((a, b) => (b.lastAt ?? '').localeCompare(a.lastAt ?? ''));
}
function clearOfflineSyncTelemetry() {
    if (!canUseLocalStorage())
        return;
    window.localStorage.removeItem(STORAGE_KEY);
}
