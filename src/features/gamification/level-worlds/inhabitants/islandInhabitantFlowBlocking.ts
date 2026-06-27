export type IslandInhabitantFlowBlockers = {
  isStoryReaderOpen?: boolean;
  isNarrativeDialogueOpen?: boolean;
  isActiveStopOpen?: boolean;
  isBuildOpen?: boolean;
  isShopOpen?: boolean;
  isMarketOpen?: boolean;
  isSanctuaryOpen?: boolean;
  isMinigameOpen?: boolean;
  isBossOpen?: boolean;
  isTravelOpen?: boolean;
  isClearCelebrationOpen?: boolean;
  isClaimOpen?: boolean;
  isHatchRevealOpen?: boolean;
  isPurchasePromptOpen?: boolean;
  isOutOfDicePromptOpen?: boolean;
  isRewardDetailsOpen?: boolean;
  isPlaceholderOpen?: boolean;
  isBoardMoving?: boolean;
  isInhabitantFlowOpen?: boolean;
  isOtherModalOpen?: boolean;
};

export type IslandInhabitantFlowPresentationState = {
  isHostTopbarMenuOpen?: boolean;
  isOverviewCameraMode?: boolean;
  isHudExpanded?: boolean;
  areCameraControlsVisible?: boolean;
  isDebugPanelOpen?: boolean;
  isAudioMenuOpen?: boolean;
};

export type IslandInhabitantFlowSurfaceState = IslandInhabitantFlowBlockers & IslandInhabitantFlowPresentationState;

export function mapIslandInhabitantFlowBlockers(state: IslandInhabitantFlowSurfaceState): IslandInhabitantFlowBlockers {
  return {
    isStoryReaderOpen: state.isStoryReaderOpen,
    isNarrativeDialogueOpen: state.isNarrativeDialogueOpen,
    isActiveStopOpen: state.isActiveStopOpen,
    isBuildOpen: state.isBuildOpen,
    isShopOpen: state.isShopOpen,
    isMarketOpen: state.isMarketOpen,
    isSanctuaryOpen: state.isSanctuaryOpen,
    isMinigameOpen: state.isMinigameOpen,
    isBossOpen: state.isBossOpen,
    isTravelOpen: state.isTravelOpen,
    isClearCelebrationOpen: state.isClearCelebrationOpen,
    isClaimOpen: state.isClaimOpen,
    isHatchRevealOpen: state.isHatchRevealOpen,
    isPurchasePromptOpen: state.isPurchasePromptOpen,
    isOutOfDicePromptOpen: state.isOutOfDicePromptOpen,
    isRewardDetailsOpen: state.isRewardDetailsOpen,
    isPlaceholderOpen: state.isPlaceholderOpen,
    isBoardMoving: state.isBoardMoving,
    isInhabitantFlowOpen: state.isInhabitantFlowOpen,
    isOtherModalOpen: state.isOtherModalOpen,
  };
}

export type IslandInhabitantFlowOpeningState = {
  isBlocked: boolean;
  shouldCloseHostMenu: boolean;
  shouldQueueFlowOpen: boolean;
};

export function resolveIslandInhabitantFlowOpeningState(state: IslandInhabitantFlowSurfaceState): IslandInhabitantFlowOpeningState {
  const isBlocked = isIslandInhabitantFlowBlocked(mapIslandInhabitantFlowBlockers(state));
  return {
    isBlocked,
    shouldCloseHostMenu: !isBlocked && Boolean(state.isHostTopbarMenuOpen),
    shouldQueueFlowOpen: !isBlocked,
  };
}

export function isIslandInhabitantFlowBlocked(blockers: IslandInhabitantFlowBlockers): boolean {
  return Object.values(blockers).some(Boolean);
}
