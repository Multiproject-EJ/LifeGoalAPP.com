import { isJourneyDiscArenaIsland } from './journeyDiscArmory';
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
    | 'boss_finale_priority'
    | 'tickets_required'
    | 'event_ready';
}

/**
 * Pure presentation resolver for the chapter-opening Journey Disc exhibition.
 *
 * The arena may temporarily transform the centre landmark only while the
 * canonical Boss stop is still locked. As soon as the Boss stop becomes an
 * actual objective, the canonical Moon Gate regains priority so an event can
 * never deadlock Island Run progression.
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

  const canEnter = Math.max(0, Math.floor(options.eventTickets)) > 0;
  return {
    owner: 'journey_disc_arena',
    active: true,
    canEnter,
    reason: canEnter ? 'event_ready' : 'tickets_required',
  };
}
