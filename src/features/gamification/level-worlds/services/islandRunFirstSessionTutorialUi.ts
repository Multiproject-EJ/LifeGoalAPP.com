import type { IslandRunFirstSessionTutorialState } from './islandRunGameStateStore';

export type IslandRunBuildPromptControl = 'build' | 'gameplay';

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
