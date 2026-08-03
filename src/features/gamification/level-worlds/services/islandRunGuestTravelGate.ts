export interface ShouldGateIslandOneGuestTravelOptions {
  islandNumber: number;
  isDemoSession: boolean;
  isDevModeEnabled: boolean;
  guestProgressClaimed: boolean;
}

/**
 * Production guests must save or explicitly claim their Island 1 progress
 * before travelling. Local DEV MODE playthroughs may bypass that account gate
 * so QA can inspect later islands without creating disposable accounts.
 */
export function shouldGateIslandOneGuestTravel(
  options: ShouldGateIslandOneGuestTravelOptions,
): boolean {
  return options.islandNumber === 1
    && options.isDemoSession
    && !options.isDevModeEnabled
    && !options.guestProgressClaimed;
}
