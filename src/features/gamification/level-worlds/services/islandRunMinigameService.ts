import type { Session } from '@supabase/supabase-js';

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

export interface IslandRunMinigame {
  id: IslandRunMinigameId;
  displayName: string;
  /** Launch the minigame. Resolves when the player exits. */
  launch(options: {
    session: Session;
    onComplete: (result: IslandRunMinigameResult) => void;
    onExit: () => void;
  }): void;
}

/** Registry: maps minigame IDs to their implementations */
export const ISLAND_RUN_MINIGAME_REGISTRY: Record<IslandRunMinigameId, IslandRunMinigame> = {
  shooter_blitz: {
    id: 'shooter_blitz',
    displayName: 'Shooter Blitz',
    launch({ onExit }) {
      // Stub: real wiring in M11B
      // For now just fire onExit so stop modal stays functional
      onExit();
    },
  },
  stub_placeholder: {
    id: 'stub_placeholder',
    displayName: 'Coming Soon',
    launch({ onExit }) {
      onExit();
    },
  },
};

/** Resolve which minigame to launch for a given island/stop context */
export function resolveMinigameForStop(_islandNumber: number): IslandRunMinigameId {
  // M11B will make this data-driven; for now always return shooter_blitz
  return 'shooter_blitz';
}
