import { isJourneyDiscArenaIsland } from './journeyDiscArmory';
import type { ArenaGameId } from './islandRunArenaCatalog';
import type { IslandRunContractV2StopStatus } from './islandRunContractV2StopResolver';

export type JourneyDiscCenterLandmarkOwner = 'canonical_boss' | 'journey_disc_arena';

export interface JourneyDiscCenterLandmarkPresentation {
  owner: JourneyDiscCenterLandmarkOwner;
  active: boolean;
  canEnter: boolean;
  reason:
    | 'feature_disabled'
    | 'ineligible_island'
    | 'no_timed_event'
    | 'right_rail_only'
    | 'boss_finale_priority'
    | 'tickets_required'
    | 'event_ready';
}

export const ISLAND_EVENT_GRID_SLOT_COUNT = 12;

export interface IslandEventGridTemplate {
  eventId: string;
  displayName: string;
  icon: string;
}

export interface IslandEventGridExhibition {
  gameId: ArenaGameId;
  displayName: string;
  icon: string;
}

export type IslandEventGridSlot =
  | {
      kind: 'event';
      id: string;
      orderId: string;
      eventId: string;
      displayName: string;
      icon: string;
      active: boolean;
    }
  | {
      kind: 'journey_disc';
      id: 'journey_disc_arena';
      orderId: string;
      displayName: 'Journey Disc Arena';
      icon: '◉';
      active: true;
    }
  | {
      kind: 'exhibition';
      id: string;
      orderId: string;
      gameId: ArenaGameId;
      displayName: string;
      icon: string;
      active: false;
    }
  | {
      kind: 'empty';
      id: string;
    };

type PopulatedIslandEventGridSlot = Exclude<IslandEventGridSlot, { kind: 'empty' }>;

/**
 * Keeps a user-authored presentation order safe as the catalogue grows. Stale
 * ids are discarded, duplicates collapse to their first occurrence, and every
 * newly registered game is appended so it can never disappear from the grid.
 */
export function resolveIslandEventGridOrder(options: {
  availableIds: readonly string[];
  preferredIds?: readonly string[];
}): string[] {
  const availableIds = [...new Set(options.availableIds.filter((id) => id.length > 0))];
  const available = new Set(availableIds);
  const resolved: string[] = [];
  const seen = new Set<string>();

  (options.preferredIds ?? []).forEach((id) => {
    if (!available.has(id) || seen.has(id)) return;
    seen.add(id);
    resolved.push(id);
  });
  availableIds.forEach((id) => {
    if (seen.has(id)) return;
    seen.add(id);
    resolved.push(id);
  });
  return resolved;
}

/** Moves one visible game before another without dropping catalogue entries. */
export function moveIslandEventGridItem(options: {
  orderedIds: readonly string[];
  sourceId: string;
  targetId: string;
}): string[] {
  const orderedIds = [...options.orderedIds];
  const sourceIndex = orderedIds.indexOf(options.sourceId);
  const targetIndex = orderedIds.indexOf(options.targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return orderedIds;
  const [sourceId] = orderedIds.splice(sourceIndex, 1);
  if (!sourceId) return orderedIds;
  const insertionIndex = orderedIds.indexOf(options.targetId);
  orderedIds.splice(insertionIndex < 0 ? orderedIds.length : insertionIndex, 0, sourceId);
  return orderedIds;
}

/**
 * Journey Disc borrows the one canonical timed-event channel on its chapter
 * islands. This is deliberately presentation-only: the event timer, ticket
 * wallet and reward bar continue unchanged and resume their ordinary game on
 * the next island.
 */
export function shouldJourneyDiscReplaceTimedEventSurface(options: {
  featureEnabled: boolean;
  islandNumber: number;
  hasActiveTimedEvent: boolean;
}): boolean {
  return options.featureEnabled
    && options.hasActiveTimedEvent
    && isJourneyDiscArenaIsland(options.islandNumber);
}

/** Builds the three-row event launcher grid without introducing event state. */
export function resolveIslandEventGridSlots(options: {
  templates: readonly IslandEventGridTemplate[];
  exhibitions?: readonly IslandEventGridExhibition[];
  activeEventType: string | null;
  journeyDiscReplacesTimedEvent: boolean;
  orderedIds?: readonly string[];
  slotCount?: number;
}): IslandEventGridSlot[] {
  const visibleExhibitions = (options.exhibitions ?? []).filter((exhibition) => (
    !options.journeyDiscReplacesTimedEvent || exhibition.gameId !== 'journey_disc_arena'
  ));
  const requestedSlotCount = Math.max(
    options.templates.length + visibleExhibitions.length,
    Math.floor(options.slotCount ?? ISLAND_EVENT_GRID_SLOT_COUNT),
  );
  const slots: PopulatedIslandEventGridSlot[] = options.templates.map((template) => {
    const isActiveTemplate = template.eventId === options.activeEventType;
    if (options.journeyDiscReplacesTimedEvent && isActiveTemplate) {
      return {
        kind: 'journey_disc',
        id: 'journey_disc_arena',
        orderId: template.eventId,
        displayName: 'Journey Disc Arena',
        icon: '◉',
        active: true,
      };
    }
    return {
      kind: 'event',
      id: template.eventId,
      orderId: template.eventId,
      eventId: template.eventId,
      displayName: template.displayName,
      icon: template.icon,
      active: !options.journeyDiscReplacesTimedEvent && isActiveTemplate,
    };
  });

  visibleExhibitions.forEach((exhibition) => {
    slots.push({
      kind: 'exhibition',
      id: `exhibition-${exhibition.gameId}`,
      orderId: exhibition.gameId,
      gameId: exhibition.gameId,
      displayName: exhibition.displayName,
      icon: exhibition.icon,
      active: false,
    });
  });

  const orderedIds = resolveIslandEventGridOrder({
    availableIds: slots.map((slot) => slot.orderId),
    preferredIds: options.orderedIds,
  });
  const rankById = new Map(orderedIds.map((id, index) => [id, index]));
  slots.sort((left, right) => (
    (rankById.get(left.orderId) ?? Number.MAX_SAFE_INTEGER)
      - (rankById.get(right.orderId) ?? Number.MAX_SAFE_INTEGER)
  ));

  const completedSlots: IslandEventGridSlot[] = [...slots];
  while (completedSlots.length < requestedSlotCount) {
    completedSlots.push({ kind: 'empty', id: `empty-${completedSlots.length}` });
  }
  return completedSlots;
}

/**
 * Legacy compatibility resolver. Journey Disc now lives exclusively in the
 * normal timed-event launcher on the right rail; it never transforms or adds
 * an icon to the island centre.
 */
export function resolveJourneyDiscCenterLandmarkPresentation(options: {
  featureEnabled: boolean;
  islandNumber: number;
  hasActiveTimedEvent: boolean;
  eventTickets: number;
  bossStopStatus: IslandRunContractV2StopStatus | null | undefined;
  bossTrialActive?: boolean;
  bossDefeated?: boolean;
}): JourneyDiscCenterLandmarkPresentation {
  if (!options.featureEnabled) {
    return { owner: 'canonical_boss', active: false, canEnter: false, reason: 'feature_disabled' };
  }
  if (!isJourneyDiscArenaIsland(options.islandNumber)) {
    return { owner: 'canonical_boss', active: false, canEnter: false, reason: 'ineligible_island' };
  }
  if (!options.hasActiveTimedEvent) {
    return { owner: 'canonical_boss', active: false, canEnter: false, reason: 'no_timed_event' };
  }
  if (
    options.bossTrialActive === true
    || options.bossDefeated === true
    || options.bossStopStatus !== 'locked'
  ) {
    return { owner: 'canonical_boss', active: false, canEnter: false, reason: 'boss_finale_priority' };
  }

  return { owner: 'canonical_boss', active: false, canEnter: false, reason: 'right_rail_only' };
}
