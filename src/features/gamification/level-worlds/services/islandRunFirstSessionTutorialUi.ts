import type { IslandRunFirstSessionTutorialState } from './islandRunGameStateStore';

export type IslandRunBuildPromptControl = 'build' | 'gameplay';

export const ISLAND_RUN_TUTORIAL_HATCHERY_STOP_INDEX = 0;

export function isIslandRunBuildPromptOverlayActive(
  firstSessionTutorialState: IslandRunFirstSessionTutorialState,
): boolean {
  return firstSessionTutorialState === 'first_essence_reward_claimed'
    || firstSessionTutorialState === 'build_prompt_visible';
}

export function shouldIslandRunBuildPromptBlockControl(
  firstSessionTutorialState: IslandRunFirstSessionTutorialState,
  control: IslandRunBuildPromptControl,
): boolean {
  return isIslandRunBuildPromptOverlayActive(firstSessionTutorialState) && control !== 'build';
}

export function getIslandRunBuildPromptInitialTransitionTarget(
  firstSessionTutorialState: IslandRunFirstSessionTutorialState,
): IslandRunFirstSessionTutorialState | null {
  return firstSessionTutorialState === 'first_essence_reward_claimed'
    ? 'build_prompt_visible'
    : null;
}

export function resolveIslandRunBuildPromptClickTransitionTargets(
  firstSessionTutorialState: IslandRunFirstSessionTutorialState,
): IslandRunFirstSessionTutorialState[] {
  if (firstSessionTutorialState === 'first_essence_reward_claimed') {
    return ['build_prompt_visible', 'build_modal_opened'];
  }
  if (firstSessionTutorialState === 'build_prompt_visible') {
    return ['build_modal_opened'];
  }
  return [];
}

export function isIslandRunHatcheryBuildGuidanceActive(
  firstSessionTutorialState: IslandRunFirstSessionTutorialState,
): boolean {
  return firstSessionTutorialState === 'build_modal_opened';
}

export function resolveIslandRunBuildModalTutorialRowState(options: {
  firstSessionTutorialState: IslandRunFirstSessionTutorialState;
  stopIndex: number;
}): {
  guidanceActive: boolean;
  isHighlighted: boolean;
  isUnavailable: boolean;
} {
  const guidanceActive = isIslandRunHatcheryBuildGuidanceActive(options.firstSessionTutorialState);
  const isHatcheryRow = options.stopIndex === ISLAND_RUN_TUTORIAL_HATCHERY_STOP_INDEX;
  return {
    guidanceActive,
    isHighlighted: guidanceActive && isHatcheryRow,
    isUnavailable: guidanceActive && !isHatcheryRow,
  };
}

export function shouldAdvanceFirstSessionTutorialAfterHatcheryBuild(options: {
  firstSessionTutorialState: IslandRunFirstSessionTutorialState;
  stopIndex: number;
  previousBuildLevel: number;
  nextBuildLevel: number;
}): boolean {
  return options.firstSessionTutorialState === 'build_modal_opened'
    && options.stopIndex === ISLAND_RUN_TUTORIAL_HATCHERY_STOP_INDEX
    && options.previousBuildLevel === 0
    && options.nextBuildLevel >= 1;
}

export function isIslandRunHatcheryL1CelebrationActive(
  firstSessionTutorialState: IslandRunFirstSessionTutorialState,
): boolean {
  return firstSessionTutorialState === 'hatchery_l1_built';
}

export function getIslandRunHatcheryL1CelebrationContinueTarget(
  firstSessionTutorialState: IslandRunFirstSessionTutorialState,
): IslandRunFirstSessionTutorialState | null {
  return isIslandRunHatcheryL1CelebrationActive(firstSessionTutorialState)
    ? 'hatchery_l1_celebrated'
    : null;
}
