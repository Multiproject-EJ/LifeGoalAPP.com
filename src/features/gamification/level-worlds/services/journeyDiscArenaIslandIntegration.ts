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
      eventId: string;
      displayName: string;
      icon: string;
      active: boolean;
    }
  | {
      kind: 'journey_disc';
      id: 'journey_disc_arena';
      displayName: 'Journey Disc Arena';
      icon: '◉';
      active: true;
    }
  | {
      kind: 'exhibition';
      id: string;
      gameId: ArenaGameId;
      displayName: string;
      icon: string;
      active: false;
    }
  | {
      kind: 'empty';
      id: string;
    };

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
  slotCount?: number;
}): IslandEventGridSlot[] {
  const visibleExhibitions = (options.exhibitions ?? []).filter((exhibition) => (
    !options.journeyDiscReplacesTimedEvent || exhibition.gameId !== 'journey_disc_arena'
  ));
  const requestedSlotCount = Math.max(
    options.templates.length + visibleExhibitions.length,
    Math.floor(options.slotCount ?? ISLAND_EVENT_GRID_SLOT_COUNT),
  );
  const slots: IslandEventGridSlot[] = options.templates.map((template) => {
    const isActiveTemplate = template.eventId === options.activeEventType;
    if (options.journeyDiscReplacesTimedEvent && isActiveTemplate) {
      return {
        kind: 'journey_disc',
        id: 'journey_disc_arena',
        displayName: 'Journey Disc Arena',
        icon: '◉',
        active: true,
      };
    }
    return {
      kind: 'event',
      id: template.eventId,
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
      gameId: exhibition.gameId,
      displayName: exhibition.displayName,
      icon: exhibition.icon,
      active: false,
    });
  });

  while (slots.length < requestedSlotCount) {
    slots.push({ kind: 'empty', id: `empty-${slots.length}` });
  }
  return slots;
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
