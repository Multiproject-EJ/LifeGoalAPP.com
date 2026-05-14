import type { IslandRunFirstSessionTutorialState } from './islandRunGameStateStore';

export type IslandRunBuildPromptControl = 'build' | 'gameplay';

export const ISLAND_RUN_TUTORIAL_HATCHERY_STOP_INDEX = 0;
export const ISLAND_RUN_FIRST_CREATURE_PACK_LOW_DICE_THRESHOLD = 5;
export const ISLAND_RUN_FIRST_CREATURE_PACK_BONUS_DICE = 100;

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

export function getIslandRunFirstCreaturePackLowDiceTriggerTarget(options: {
  firstSessionTutorialState: IslandRunFirstSessionTutorialState;
  currentIslandNumber: number;
  cycleIndex: number;
  dicePool: number;
}): IslandRunFirstSessionTutorialState | null {
  const isEligibleTutorialState = options.firstSessionTutorialState === 'hatchery_l1_celebrated'
    || options.firstSessionTutorialState === 'normal_play_until_low_dice';
  return isEligibleTutorialState
    && options.currentIslandNumber === 1
    && options.cycleIndex === 0
    && options.dicePool <= ISLAND_RUN_FIRST_CREATURE_PACK_LOW_DICE_THRESHOLD
    ? 'first_creature_pack_available'
    : null;
}

export function isIslandRunFirstCreaturePackModalActive(
  firstSessionTutorialState: IslandRunFirstSessionTutorialState,
): boolean {
  return firstSessionTutorialState === 'first_creature_pack_available';
}

export function resolveIslandRunFirstCreaturePackOpenAttempt(options: {
  firstSessionTutorialState: IslandRunFirstSessionTutorialState;
  isClaimInFlight: boolean;
}): {
  shouldCallClaim: boolean;
  nextClaimInFlight: boolean;
} {
  if (options.isClaimInFlight || !isIslandRunFirstCreaturePackModalActive(options.firstSessionTutorialState)) {
    return {
      shouldCallClaim: false,
      nextClaimInFlight: options.isClaimInFlight,
    };
  }
  return {
    shouldCallClaim: true,
    nextClaimInFlight: true,
  };
}

export function formatIslandRunFirstCreaturePackBonusCopy(
  diceGranted: number | null | undefined,
): string {
  const safeDiceGranted = typeof diceGranted === 'number' && Number.isFinite(diceGranted)
    ? Math.max(0, Math.floor(diceGranted))
    : ISLAND_RUN_FIRST_CREATURE_PACK_BONUS_DICE;
  return `+${safeDiceGranted} dice added`;
}

export function getIslandRunFirstCreaturePackContinueTarget(
  firstSessionTutorialState: IslandRunFirstSessionTutorialState,
): IslandRunFirstSessionTutorialState | null {
  return firstSessionTutorialState === 'first_creature_pack_claimed'
    ? 'complete'
    : null;
}
