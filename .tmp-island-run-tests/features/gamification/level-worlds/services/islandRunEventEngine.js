"use strict";
/**
 * Island Run Event Engine (Phase 3 of the Minigame & Events Consolidation Plan
 * — see `docs/gameplay/MINIGAME_EVENTS_CONSOLIDATION_PLAN.md` §3.1).
 *
 * Formalizes ownership of the 4-event rotation clock that currently lives
 * inside `islandRunContractV2RewardBar.ts`. This module is a thin, pure wrapper
 * over the existing canonical functions — while the `islandRunEventEngineEnabled`
 * flag is off, consumers calling engine functions get behavior that is
 * bit-for-bit identical to calling the underlying reward-bar functions
 * directly. The flag only gates telemetry emission on event transitions; it
 * does NOT gate the wrapper logic itself (so call-sites can migrate
 * progressively without a visible runtime change).
 *
 * The engine:
 *   - Defines the canonical `EventId` union (matches `templateId` in
 *     `TIMED_EVENT_SEQUENCE`).
 *   - Exposes `getActiveEvent(state, nowMs)` as a pure read.
 *   - Exposes `advanceEventIfExpired(state, nowMs)` as the canonical way to
 *     rotate/hydrate the active event (wraps
 *     `ensureIslandRunContractV2ActiveTimedEvent` and reports the transition).
 *   - Exposes `recordEventProgress(...)` as the canonical progress hook
 *     (wraps `applyIslandRunContractV2RewardBarProgress`).
 *   - Exposes `getActiveEventStickerId(eventId)` for sticker-fragment routing.
 *   - Emits a `[IslandRunEventEngine] event_transition` telemetry line when
 *     the active event id changes, gated by the feature flag.
 *
 * Invariant (from plan §3.1): exactly one active event at a time.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENT_IDS = void 0;
exports.parseEventId = parseEventId;
exports.getActiveEvent = getActiveEvent;
exports.advanceEventIfExpired = advanceEventIfExpired;
exports.recordEventProgress = recordEventProgress;
exports.getActiveEventStickerId = getActiveEventStickerId;
exports.getEventMilestoneLadder = getEventMilestoneLadder;
exports.emitEventTransitionTelemetry = emitEventTransitionTelemetry;
const islandRunFeatureFlags_1 = require("../../../../config/islandRunFeatureFlags");
const islandRunContractV2RewardBar_1 = require("./islandRunContractV2RewardBar");
/**
 * Ordered list of every canonical event id. Matches `TIMED_EVENT_SEQUENCE`
 * ordering (rotation: 1 → 2 → 3 → 4 → 1 …).
 */
exports.EVENT_IDS = [
    'feeding_frenzy',
    'lucky_spin',
    'space_excavator',
    'companion_feast',
];
/**
 * Parse the canonical templateId from a record-level `eventId` (e.g.
 * `'feeding_frenzy:1700000000000'` → `'feeding_frenzy'`). Returns `null`
 * for unknown or malformed ids so callers can defensively handle legacy
 * records.
 */
function parseEventId(recordEventId) {
    if (!recordEventId)
        return null;
    const templateId = recordEventId.split(':')[0];
    if (!templateId)
        return null;
    if (exports.EVENT_IDS.includes(templateId)) {
        return templateId;
    }
    return null;
}
function buildDescriptor(event, nowMs) {
    const eventId = parseEventId(event.eventId);
    if (!eventId)
        return null;
    const template = islandRunContractV2RewardBar_1.TIMED_EVENT_SEQUENCE.find((t) => t.templateId === eventId);
    if (!template)
        return null;
    const meta = islandRunContractV2RewardBar_1.EVENT_BANNER_META[eventId] ?? { icon: template.icon, displayName: eventId };
    return {
        eventId,
        recordEventId: event.eventId,
        eventType: event.eventType,
        icon: meta.icon,
        displayName: meta.displayName,
        ladderId: template.ladderId,
        stickerId: template.stickerId,
        startedAtMs: event.startedAtMs,
        expiresAtMs: event.expiresAtMs,
        remainingMs: Math.max(0, event.expiresAtMs - Math.floor(nowMs)),
        version: event.version,
    };
}
/**
 * Pure read: returns the descriptor for the active event if one is present
 * AND not yet expired at `nowMs`. Returns `null` when the slot is empty or
 * the current event has expired — callers that need to rotate must use
 * {@link advanceEventIfExpired}.
 */
function getActiveEvent(state, nowMs) {
    const active = state.activeTimedEvent;
    if (!active)
        return null;
    if (active.expiresAtMs <= Math.floor(nowMs))
        return null;
    return buildDescriptor(active, nowMs);
}
/**
 * Canonical entry point for rotating the active timed event. Wraps
 * `ensureIslandRunContractV2ActiveTimedEvent` and additionally:
 *   - Parses the previous and next `EventId`s for the caller.
 *   - Emits the event-transition telemetry line (when the engine flag is on
 *     and the canonical event id actually changes).
 */
function advanceEventIfExpired(state, nowMs) {
    const previousEventId = parseEventId(state.activeTimedEvent?.eventId ?? null);
    const ensured = (0, islandRunContractV2RewardBar_1.ensureIslandRunContractV2ActiveTimedEvent)({ state, nowMs });
    const nextEventId = parseEventId(ensured.state.activeTimedEvent?.eventId ?? null);
    const canonicalChanged = ensured.eventChanged && previousEventId !== nextEventId;
    if (canonicalChanged) {
        emitEventTransitionTelemetry({
            previousEventId,
            nextEventId,
            nowMs: Math.floor(nowMs),
        });
    }
    return {
        state: ensured.state,
        eventChanged: ensured.eventChanged,
        previousEventId,
        nextEventId,
    };
}
/**
 * Canonical progress hook. Wraps
 * `applyIslandRunContractV2RewardBarProgress` so callers can route through
 * the engine. Behavior is identical to calling the underlying function
 * directly; no extra side effects.
 */
function recordEventProgress(options) {
    return (0, islandRunContractV2RewardBar_1.applyIslandRunContractV2RewardBarProgress)(options);
}
/**
 * Sticker-fragment routing: returns the sticker id that fragments should be
 * credited to for the given event. Sticker fragments granted by the reward
 * bar always belong to the currently-active event's sticker (plan §3.1).
 */
function getActiveEventStickerId(eventId) {
    if (!eventId)
        return null;
    const template = islandRunContractV2RewardBar_1.TIMED_EVENT_SEQUENCE.find((t) => t.templateId === eventId);
    return template?.stickerId ?? null;
}
/**
 * Read-only milestone ladder for the given event. Thresholds are pulled from
 * `resolveEscalatingThreshold`; `count` bounds how many tier entries are
 * returned (default 10 — the current ladder length).
 */
function getEventMilestoneLadder(eventId, count = 10) {
    const safeCount = Math.max(0, Math.floor(count));
    // Guard: eventId must be a recognised template so the ladderId is stable.
    const template = islandRunContractV2RewardBar_1.TIMED_EVENT_SEQUENCE.find((t) => t.templateId === eventId);
    if (!template)
        return [];
    const ladder = [];
    for (let tier = 0; tier < safeCount; tier += 1) {
        ladder.push({ tier, threshold: (0, islandRunContractV2RewardBar_1.resolveEscalatingThreshold)(tier) });
    }
    return ladder;
}
/**
 * Emit a structured log line on event rotation. No-op unless the
 * `islandRunEventEngineEnabled` flag is on — this keeps Phase 3 inert by
 * default per plan §10. Uses `console.info` to match the existing
 * `islandRunEntryDebug.ts` telemetry style.
 */
function emitEventTransitionTelemetry(payload) {
    if (!(0, islandRunFeatureFlags_1.isIslandRunFeatureEnabled)('islandRunEventEngineEnabled'))
        return;
    // eslint-disable-next-line no-console -- structured telemetry line (see islandRunEntryDebug.ts)
    console.info('[IslandRunEventEngine] event_transition', {
        previousEventId: payload.previousEventId,
        nextEventId: payload.nextEventId,
        nowMs: payload.nowMs,
    });
}
