import type { IslandRunGameStateRecord } from './islandRunGameStateStore';
import { getIslandTechnologyAccess, resolveIslandTechnologyBuildEligibility } from './islandRunTechnologyUnlocks';

export type IslandRunConcordHubPrimaryAction = 'open-story-reader' | 'open-concord-hub';

export interface IslandRunConcordHubEntryState {
  label: string;
  icon: string;
  ariaLabel: string;
  primaryAction: IslandRunConcordHubPrimaryAction;
  isConcordActive: boolean;
  collectedFragmentCount: number;
  requiredFragmentCount: number;
}

const REQUIRED_CONCORD_FRAGMENT_COUNT = 9;

/**
 * Resolves the Story/Concord controller affordance without mutating gameplay.
 * The button may only become The Concord after the canonical technology unlock
 * is active, which itself requires all Island 1 tech fragments to be collected.
 */
export function resolveIslandRunConcordHubEntryState(
  record: Pick<IslandRunGameStateRecord, 'techCollectionByIsland' | 'technologyUnlocksById'>,
): IslandRunConcordHubEntryState {
  const concordAccess = getIslandTechnologyAccess(record, 'the-concord');
  const eligibility = resolveIslandTechnologyBuildEligibility(record, 'the-concord');
  const collectedFragmentCount = REQUIRED_CONCORD_FRAGMENT_COUNT - eligibility.missingSlots.length;

  if (concordAccess.active) {
    return {
      label: 'Concord',
      icon: '📡',
      ariaLabel: 'Open The Concord hub',
      primaryAction: 'open-concord-hub',
      isConcordActive: true,
      collectedFragmentCount: REQUIRED_CONCORD_FRAGMENT_COUNT,
      requiredFragmentCount: REQUIRED_CONCORD_FRAGMENT_COUNT,
    };
  }

  return {
    label: 'Story',
    icon: '📖',
    ariaLabel: collectedFragmentCount > 0
      ? `Open story reader. The Concord is restoring: ${collectedFragmentCount} of ${REQUIRED_CONCORD_FRAGMENT_COUNT} fragments collected.`
      : 'Open story reader',
    primaryAction: 'open-story-reader',
    isConcordActive: false,
    collectedFragmentCount,
    requiredFragmentCount: REQUIRED_CONCORD_FRAGMENT_COUNT,
  };
}
