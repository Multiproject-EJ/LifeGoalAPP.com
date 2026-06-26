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

export function isIslandInhabitantFlowBlocked(blockers: IslandInhabitantFlowBlockers): boolean {
  return Object.values(blockers).some(Boolean);
}
