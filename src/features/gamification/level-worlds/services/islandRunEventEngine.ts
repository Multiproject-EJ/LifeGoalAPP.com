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

import { isIslandRunFeatureEnabled } from '../../../../config/islandRunFeatureFlags';
import {
  EVENT_BANNER_META,
  TIMED_EVENT_SEQUENCE,
  applyIslandRunContractV2RewardBarProgress,
  ensureIslandRunContractV2ActiveTimedEvent,
  resolveEscalatingThreshold,
  type IslandRunRewardBarRuntimeSlice,
  type IslandRunTimedEvent,
  type RewardBarProgressSource,
} from './islandRunContractV2RewardBar';

/** Canonical event ids — one per entry in `TIMED_EVENT_SEQUENCE`. */
export type EventId = 'feeding_frenzy' | 'lucky_spin' | 'space_excavator' | 'companion_feast';

/**
 * Ordered list of every canonical event id. Matches `TIMED_EVENT_SEQUENCE`
 * ordering (rotation: 1 → 2 → 3 → 4 → 1 …).
 */
export const EVENT_IDS: readonly EventId[] = [
  'feeding_frenzy',
  'lucky_spin',
  'space_excavator',
  'companion_feast',
] as const;

/** Full descriptor for the currently-active event. */
export interface ActiveEventDescriptor {
  /** Canonical event template id (matches `EventId` union). */
  eventId: EventId;
  /**
   * Record-level `eventId` (templateId + ':' + startedAtMs). Preserved so
   * callers that need to persist or match against
   * `rewardBarBoundEventId` have access to the exact identifier used on
   * the state record.
   */
  recordEventId: string;
  /** Record-level `eventType` (matches `EventId` for canonical events). */
  eventType: string;
  icon: string;
  displayName: string;
  ladderId: string;
  stickerId: string;
  startedAtMs: number;
  expiresAtMs: number;
  /** `max(0, expiresAtMs - nowMs)`. */
  remainingMs: number;
  version: number;
}

/**
 * Parse the canonical templateId from a record-level `eventId` (e.g.
 * `'feeding_frenzy:1700000000000'` → `'feeding_frenzy'`). Returns `null`
 * for unknown or malformed ids so callers can defensively handle legacy
 * records.
 */
export function parseEventId(recordEventId: string | null | undefined): EventId | null {
  if (!recordEventId) return null;
  const templateId = recordEventId.split(':')[0];
  if (!templateId) return null;
  if ((EVENT_IDS as readonly string[]).includes(templateId)) {
    return templateId as EventId;
  }
  return null;
}

function buildDescriptor(event: IslandRunTimedEvent, nowMs: number): ActiveEventDescriptor | null {
  const eventId = parseEventId(event.eventId);
  if (!eventId) return null;
  const template = TIMED_EVENT_SEQUENCE.find((t) => t.templateId === eventId);
  if (!template) return null;
  const meta = EVENT_BANNER_META[eventId] ?? { icon: template.icon, displayName: eventId };
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
export function getActiveEvent(
  state: Pick<IslandRunRewardBarRuntimeSlice, 'activeTimedEvent'>,
  nowMs: number,
): ActiveEventDescriptor | null {
  const active = state.activeTimedEvent;
  if (!active) return null;
  if (active.expiresAtMs <= Math.floor(nowMs)) return null;
  return buildDescriptor(active, nowMs);
}

/** Outcome from {@link advanceEventIfExpired}. */
export interface AdvanceEventResult {
  state: IslandRunRewardBarRuntimeSlice;
  eventChanged: boolean;
  previousEventId: EventId | null;
  nextEventId: EventId | null;
}

/**
 * Canonical entry point for rotating the active timed event. Wraps
 * `ensureIslandRunContractV2ActiveTimedEvent` and additionally:
 *   - Parses the previous and next `EventId`s for the caller.
 *   - Emits the event-transition telemetry line (when the engine flag is on
 *     and the canonical event id actually changes).
 */
export function advanceEventIfExpired(
  state: IslandRunRewardBarRuntimeSlice,
  nowMs: number,
): AdvanceEventResult {
  const previousEventId = parseEventId(state.activeTimedEvent?.eventId ?? null);
  const ensured = ensureIslandRunContractV2ActiveTimedEvent({ state, nowMs });
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
export function recordEventProgress(options: {
  state: IslandRunRewardBarRuntimeSlice;
  source: RewardBarProgressSource;
  nowMs: number;
  multiplier?: number;
}): IslandRunRewardBarRuntimeSlice {
  return applyIslandRunContractV2RewardBarProgress(options);
}

/**
 * Phase 6 reward-routing helper: event mini-game completions feed reward-bar
 * progress through the engine, so downstream sticker fragments remain bound to
 * the currently-active event.
 */
export function recordEventMinigameCompletion(options: {
  state: IslandRunRewardBarRuntimeSlice;
  minigameId: EventMinigameId;
  nowMs: number;
  multiplier?: number;
}): IslandRunRewardBarRuntimeSlice {
  return recordEventProgress({
    state: options.state,
    source: { kind: 'event_minigame_complete', minigameId: options.minigameId },
    nowMs: options.nowMs,
    multiplier: options.multiplier,
  });
}

/**
 * Sticker-fragment routing: returns the sticker id that fragments should be
 * credited to for the given event. Sticker fragments granted by the reward
 * bar always belong to the currently-active event's sticker (plan §3.1).
 */
export function getActiveEventStickerId(eventId: EventId | null | undefined): string | null {
  if (!eventId) return null;
  const template = TIMED_EVENT_SEQUENCE.find((t) => t.templateId === eventId);
  return template?.stickerId ?? null;
}

/**
 * Read-only milestone ladder for the given event. Thresholds are pulled from
 * `resolveEscalatingThreshold`; `count` bounds how many tier entries are
 * returned (default 10 — the current ladder length).
 */
export function getEventMilestoneLadder(
  eventId: EventId,
  count = 10,
): Array<{ tier: number; threshold: number }> {
  const safeCount = Math.max(0, Math.floor(count));
  // Guard: eventId must be a recognised template so the ladderId is stable.
  const template = TIMED_EVENT_SEQUENCE.find((t) => t.templateId === eventId);
  if (!template) return [];
  const ladder: Array<{ tier: number; threshold: number }> = [];
  for (let tier = 0; tier < safeCount; tier += 1) {
    ladder.push({ tier, threshold: resolveEscalatingThreshold(tier) });
  }
  return ladder;
}

/** Telemetry shape for event-transition logs. */
export interface EventTransitionTelemetryPayload {
  previousEventId: EventId | null;
  nextEventId: EventId | null;
  nowMs: number;
}

/**
 * Emit a structured log line on event rotation. No-op unless the
 * `islandRunEventEngineEnabled` flag is on — this keeps Phase 3 inert by
 * default per plan §10. Uses `console.info` to match the existing
 * `islandRunEntryDebug.ts` telemetry style.
 */
export function emitEventTransitionTelemetry(payload: EventTransitionTelemetryPayload): void {
  if (!isIslandRunFeatureEnabled('islandRunEventEngineEnabled')) return;
  // eslint-disable-next-line no-console -- structured telemetry line (see islandRunEntryDebug.ts)
  console.info('[IslandRunEventEngine] event_transition', {
    previousEventId: payload.previousEventId,
    nextEventId: payload.nextEventId,
    nowMs: payload.nowMs,
  });
}

export type EventMinigameId = 'task_tower' | 'lucky_spin' | 'shooter_blitz' | 'partner_wheel';

export interface EventMinigameLaunchDescriptor {
  eventId: EventId;
  minigameId: EventMinigameId;
  ticketCost: number;
  ticketsSpent: number;
}

function resolveEventMinigameId(eventId: EventId): EventMinigameId {
  switch (eventId) {
    case 'feeding_frenzy':
      return 'task_tower';
    case 'lucky_spin':
      return 'lucky_spin';
    case 'space_excavator':
      return 'shooter_blitz';
    case 'companion_feast':
      return 'partner_wheel';
    default:
      return 'task_tower';
  }
}

/**
 * Phase 6 foundation: maps the active timed event to its canonical mini-game
 * surface and enforces ticket spend preconditions.
 */
export function openEventMinigame(options: {
  eventId: EventId;
  ticketsAvailable: number;
  ticketsToSpend?: number;
}): EventMinigameLaunchDescriptor | null {
  const ticketCost = 1;
  const requestedSpend = Math.floor(options.ticketsToSpend ?? ticketCost);
  if (!Number.isFinite(requestedSpend) || requestedSpend < ticketCost) return null;

  const ticketsAvailable = Math.max(0, Math.floor(options.ticketsAvailable));
  if (ticketsAvailable < requestedSpend) return null;

  return {
    eventId: options.eventId,
    minigameId: resolveEventMinigameId(options.eventId),
    ticketCost,
    ticketsSpent: requestedSpend,
  };
}
