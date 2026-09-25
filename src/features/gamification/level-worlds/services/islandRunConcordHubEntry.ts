import type { IslandRunGameStateRecord } from './islandRunGameStateStore';
import { getIslandTechnologyAccess, resolveIslandTechnologyBuildEligibility } from './islandRunTechnologyUnlocks';

export type IslandRunConcordHubPrimaryAction = 'open-story' | 'open-concord-progress' | 'open-concord-hub';

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
  options: { hasUnreadStory?: boolean } = {},
): IslandRunConcordHubEntryState {
  const concordAccess = getIslandTechnologyAccess(record, 'the-concord');
  const eligibility = resolveIslandTechnologyBuildEligibility(record, 'the-concord');
  const collectedFragmentCount = REQUIRED_CONCORD_FRAGMENT_COUNT - eligibility.missingSlots.length;

  if (options.hasUnreadStory) {
    return {
      label: 'Story',
      icon: '📖',
      ariaLabel: 'Open the story that needs your attention',
      primaryAction: 'open-story',
      isConcordActive: concordAccess.active,
      collectedFragmentCount,
      requiredFragmentCount: REQUIRED_CONCORD_FRAGMENT_COUNT,
    };
  }

  if (concordAccess.active) {
    return {
      label: 'Concord & Story',
      icon: '📡',
      ariaLabel: 'Open Concord & Story: stories, videos and translation',
      primaryAction: 'open-concord-hub',
      isConcordActive: true,
      collectedFragmentCount: REQUIRED_CONCORD_FRAGMENT_COUNT,
      requiredFragmentCount: REQUIRED_CONCORD_FRAGMENT_COUNT,
    };
  }

  return {
    label: 'Story',
    icon: '📖',
    // The Concord is introduced on Island 005; before its first fragment the
    // button is simply Story.
    ariaLabel: collectedFragmentCount > 0
      ? `Open Story. Concord restoration: ${collectedFragmentCount} of ${REQUIRED_CONCORD_FRAGMENT_COUNT} fragments recovered.`
      : 'Open Story',
    primaryAction: 'open-story',
    isConcordActive: false,
    collectedFragmentCount,
    requiredFragmentCount: REQUIRED_CONCORD_FRAGMENT_COUNT,
  };
}
