export type IslandRunMinigameReward = {
  coins?: number;
  dice?: number;
  hearts?: number;
  spinTokens?: number;
};

export type IslandRunMinigameResult = {
  completed: boolean;       // true = player finished the minigame
  reward: IslandRunMinigameReward;
  durationMs: number;       // how long the session ran
};

export type IslandRunMinigameId =
  | 'shooter_blitz'
  | 'stub_placeholder';     // expand in M11B+

/** Resolve which minigame to launch for a given island/stop context */
export function resolveMinigameForStop(_islandNumber: number): IslandRunMinigameId {
  // M11B will make this data-driven; for now always return shooter_blitz
  return 'shooter_blitz';
}
