/**
 * Reward shape returned from any Island Run minigame on completion.
 * All fields are optional — a game may award only some reward types.
 */
export interface IslandRunMinigameReward {
  dice?: number;
  spinTokens?: number;
  diamonds?: number;
  xp?: number;
}

/**
 * The completion callback contract for all Island Run minigames.
 * Called when the player finishes or exits a minigame.
 */
export interface IslandRunMinigameResult {
  completed: boolean;       // true = player finished/won; false = abandoned/lost
  reward?: IslandRunMinigameReward;
}

/**
 * Props contract every Island Run minigame component must implement.
 */
export interface IslandRunMinigameProps {
  /** Called when the minigame closes, with the outcome */
  onComplete: (result: IslandRunMinigameResult) => void;
  /** Island number — used to scale difficulty */
  islandNumber: number;
  /** Optional: cap on how many tickets/lives the player can spend */
  ticketBudget?: number;
}
