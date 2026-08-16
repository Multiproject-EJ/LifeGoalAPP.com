import type { IslandNarrativeSeenState } from '../narrative/islandNarrativeSeenState';

export const ISLAND_RUN_LIVING_TICKET_REGROW_MS = 2 * 60 * 1000;

export interface IslandRunLivingTicketStatus {
  ready: boolean;
  collectedAtMs: number | null;
  regrowsAtMs: number | null;
  growthProgress: number;
}

export interface IslandRunLivingTicketPickup {
  eventId: string;
  applied: number;
  collectedAtMs: number;
  regrowsAtMs: number;
}

export function getIslandRunLivingTicketBeatId(cycleIndex: number, islandNumber: number): string {
  return `LIVING-TICKET-C${Math.max(0, Math.floor(cycleIndex))}-I${String(Math.max(1, Math.floor(islandNumber))).padStart(3, '0')}`;
}

export function resolveIslandRunLivingTicketStatus(options: {
  narrativeSeenState: IslandNarrativeSeenState;
  cycleIndex: number;
  islandNumber: number;
  nowMs: number;
}): IslandRunLivingTicketStatus {
  const beatId = getIslandRunLivingTicketBeatId(options.cycleIndex, options.islandNumber);
  const rawCollectedAtMs = options.narrativeSeenState?.beats?.[beatId];
  const collectedAtMs = typeof rawCollectedAtMs === 'number' && Number.isFinite(rawCollectedAtMs)
    ? Math.max(0, Math.floor(rawCollectedAtMs))
    : null;
  if (collectedAtMs === null) {
    return { ready: true, collectedAtMs: null, regrowsAtMs: null, growthProgress: 1 };
  }
  const regrowsAtMs = collectedAtMs + ISLAND_RUN_LIVING_TICKET_REGROW_MS;
  const elapsedMs = Math.max(0, Math.floor(options.nowMs) - collectedAtMs);
  const growthProgress = Math.min(1, elapsedMs / ISLAND_RUN_LIVING_TICKET_REGROW_MS);
  return { ready: growthProgress >= 1, collectedAtMs, regrowsAtMs, growthProgress };
}

export function collectIslandRunLivingTicket(options: {
  narrativeSeenState: IslandNarrativeSeenState;
  minigameTicketsByEvent: Record<string, number>;
  cycleIndex: number;
  islandNumber: number;
  activeEventId?: string | null;
  nowMs: number;
  randomValue: number;
}): {
  narrativeSeenState: IslandNarrativeSeenState;
  minigameTicketsByEvent: Record<string, number>;
  pickup: IslandRunLivingTicketPickup | null;
} {
  const eventId = typeof options.activeEventId === 'string' ? options.activeEventId.trim() : '';
  const status = resolveIslandRunLivingTicketStatus(options);
  if (!eventId || !status.ready) {
    return {
      narrativeSeenState: options.narrativeSeenState,
      minigameTicketsByEvent: options.minigameTicketsByEvent,
      pickup: null,
    };
  }

  const currentTickets = Math.max(0, Math.floor(options.minigameTicketsByEvent[eventId] ?? 0));
  const maxGrant = currentTickets <= 0 ? 3 : currentTickets <= 2 ? 2 : 1;
  const boundedRandom = Number.isFinite(options.randomValue)
    ? Math.min(0.999999, Math.max(0, options.randomValue))
    : 0;
  const applied = 1 + Math.floor(boundedRandom * maxGrant);
  const collectedAtMs = Math.max(0, Math.floor(options.nowMs));
  const beatId = getIslandRunLivingTicketBeatId(options.cycleIndex, options.islandNumber);
  return {
    narrativeSeenState: {
      episodes: { ...options.narrativeSeenState.episodes },
      beats: { ...options.narrativeSeenState.beats, [beatId]: collectedAtMs },
    },
    minigameTicketsByEvent: {
      ...options.minigameTicketsByEvent,
      [eventId]: currentTickets + applied,
    },
    pickup: {
      eventId,
      applied,
      collectedAtMs,
      regrowsAtMs: collectedAtMs + ISLAND_RUN_LIVING_TICKET_REGROW_MS,
    },
  };
}
