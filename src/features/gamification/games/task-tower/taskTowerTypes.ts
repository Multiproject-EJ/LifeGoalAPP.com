import type { Action, ActionCategory } from '../../../../types/actions';

/** Block size mapped to action category */
export type BlockSize = 'large' | 'medium' | 'small';

/** A task block in the tower */
export interface TowerBlock {
  id: string;                    // matches Action.id
  actionId: string;              // the real Action's id
  title: string;                 // action title (truncated to 40 chars for display)
  category: ActionCategory;      // must_do | nice_to_do | project
  size: BlockSize;               // large=must_do, medium=nice_to_do, small=project
  row: number;                   // grid row position
  col: number;                   // grid column position
  width: number;                 // block width in grid units (large=3, medium=2, small=1)
  completed: boolean;            // has this block been cleared?
  animating: boolean;            // currently playing removal animation?
}

/** Tower grid dimensions */
export const TOWER_GRID = {
  COLS: 4,                       // 4 columns wide
  MAX_ROWS: 8,                   // max 8 rows visible
  BLOCK_WIDTHS: {
    large: 3,                    // must_do spans 3 of 4 columns
    medium: 2,                   // nice_to_do spans 2 of 4 columns
    small: 1,                    // project spans 1 of 4 columns
  } as const,
};

/** Game session state */
export interface TaskTowerSession {
  blocks: TowerBlock[];
  blocksCleared: number;
  linesCleared: number;
  coinsEarned: number;
  diceEarned: number;
  tokensEarned: number;
  sessionStartTime: string;      // ISO
  isComplete: boolean;           // all blocks cleared or player exited
}

/** Reward tiers for clearing blocks */
export const TASK_TOWER_REWARDS = {
  CLEAR_BLOCK_COINS: { must_do: 30, nice_to_do: 15, project: 20 },
  CLEAR_BLOCK_DICE: { must_do: 1, nice_to_do: 0, project: 0 },
  LINE_CLEAR_BONUS_COINS: 50,   // bonus for clearing an entire row
  LINE_CLEAR_BONUS_DICE: 1,
  ALL_CLEAR_BONUS_COINS: 200,   // bonus for clearing ALL blocks
  ALL_CLEAR_BONUS_DICE: 3,
  ALL_CLEAR_BONUS_TOKENS: 5,
} as const;
