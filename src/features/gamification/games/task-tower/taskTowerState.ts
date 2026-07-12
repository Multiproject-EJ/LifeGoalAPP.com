import type { Action, ActionCategory } from '../../../../types/actions';
import { TOWER_GRID, TASK_TOWER_REWARDS, TASK_TOWER_COMBO, type TowerBlock, type BlockSize } from './taskTowerTypes';

/**
 * Map action category to block size
 */
function getBlockSize(category: ActionCategory): BlockSize {
  switch (category) {
    case 'must_do':
      return 'large';
    case 'nice_to_do':
      return 'medium';
    case 'project':
      return 'small';
  }
}

/**
 * Get block width based on size
 */
function getBlockWidth(size: BlockSize): number {
  return TOWER_GRID.BLOCK_WIDTHS[size];
}

/**
 * Sort actions the way the packer consumes them: must_do first (urgent),
 * then nice_to_do, then project.
 */
function sortActionsForPacking(actions: Action[]): Action[] {
  const order = { must_do: 1, nice_to_do: 2, project: 3 };
  return [...actions].sort((a, b) => order[a.category] - order[b.category]);
}

function truncateTitle(title: string): string {
  return title.length > 40 ? title.substring(0, 40) + '...' : title;
}

function makeBlock(action: Action, row: number, col: number): TowerBlock {
  const size = getBlockSize(action.category);
  return {
    id: action.id,
    actionId: action.id,
    title: truncateTitle(action.title),
    category: action.category,
    size,
    row,
    col,
    width: getBlockWidth(size),
    completed: false,
    animating: false,
  };
}

/**
 * Build tower from actions
 * Arranges actions into a grid using a simple left-to-right, bottom-to-top packing algorithm
 */
export function buildTower(actions: Action[]): TowerBlock[] {
  const sortedActions = sortActionsForPacking(actions);

  const blocks: TowerBlock[] = [];
  let currentRow = 0;
  let currentCol = 0;

  for (const action of sortedActions) {
    // Cap at MAX_ROWS * COLS worth of blocks
    if (currentRow >= TOWER_GRID.MAX_ROWS) {
      break;
    }

    const width = getBlockWidth(getBlockSize(action.category));

    // If block doesn't fit in current row, move to next row
    if (currentCol + width > TOWER_GRID.COLS) {
      currentRow++;
      currentCol = 0;

      // Check if we've exceeded max rows
      if (currentRow >= TOWER_GRID.MAX_ROWS) {
        break;
      }
    }

    blocks.push(makeBlock(action, currentRow, currentCol));
    currentCol += width;
  }

  // Settle the packed tower so no block floats above a gap the row-by-row
  // packer left beneath it (e.g. a 1-wide block placed beside a 3-wide one).
  return settleBlocks(blocks);
}

/**
 * Build the tower and split off the actions that didn't fit under the row
 * cap. Overflow actions wait in the supply line and crane-drop in as space
 * frees, instead of being silently dropped.
 */
export function buildTowerAndQueue(actions: Action[]): { blocks: TowerBlock[]; queued: Action[] } {
  const blocks = buildTower(actions);
  const placedIds = new Set(blocks.map(b => b.id));
  const queued = sortActionsForPacking(actions).filter(action => !placedIds.has(action.id));
  return { blocks, queued };
}

/**
 * Do two blocks overlap horizontally (share at least one column)?
 */
function overlapsHorizontally(a: TowerBlock, b: TowerBlock): boolean {
  return !(a.col >= b.col + b.width || b.col >= a.col + a.width);
}

function spanOverlaps(col: number, width: number, block: TowerBlock): boolean {
  return !(col >= block.col + block.width || block.col >= col + width);
}

/**
 * Settle all blocks under gravity. Pure: returns new block objects.
 *
 * Blocks are processed bottom-up (ascending row); each lands one row above
 * the highest already-settled block it shares a column with, so no two
 * settled blocks can overlap and every block above row 0 rests on another.
 */
export function settleBlocks(blocks: TowerBlock[]): TowerBlock[] {
  const settled: TowerBlock[] = [];

  const sorted = [...blocks].sort((a, b) => a.row - b.row || a.col - b.col);

  for (const block of sorted) {
    let targetRow = 0;
    for (const support of settled) {
      if (overlapsHorizontally(block, support)) {
        targetRow = Math.max(targetRow, support.row + 1);
      }
    }
    settled.push({ ...block, row: targetRow });
  }

  return settled;
}

/**
 * Remove a block and apply gravity
 */
export function removeBlock(blocks: TowerBlock[], blockId: string): TowerBlock[] {
  return settleBlocks(blocks.filter(b => b.id !== blockId));
}

/**
 * Place one queued action into the settled tower: lowest supported spot
 * that fits, scanning left to right. Returns null when nothing fits.
 */
export function placeQueuedBlock(blocks: TowerBlock[], action: Action): TowerBlock | null {
  const width = getBlockWidth(getBlockSize(action.category));

  for (let row = 0; row < TOWER_GRID.MAX_ROWS; row++) {
    for (let col = 0; col + width <= TOWER_GRID.COLS; col++) {
      const overlaps = blocks.some(b => b.row === row && spanOverlaps(col, width, b));
      if (overlaps) continue;

      const supported = row === 0
        || blocks.some(b => b.row === row - 1 && spanOverlaps(col, width, b));
      if (!supported) continue;

      return makeBlock(action, row, col);
    }
  }

  return null;
}

/**
 * Tower height in storeys (0 for an empty tower).
 */
export function getTowerHeight(blocks: TowerBlock[]): number {
  return blocks.length === 0 ? 0 : Math.max(...blocks.map(b => b.row)) + 1;
}

/**
 * Coin multiplier for the current combo streak length (1-based count of
 * consecutive clears inside the combo window). Capped at the last tier.
 */
export function getComboMultiplier(comboCount: number): number {
  const tiers = TASK_TOWER_COMBO.MULTIPLIERS;
  const index = Math.min(Math.max(comboCount, 1), tiers.length) - 1;
  return tiers[index];
}

/**
 * Apply the combo multiplier to a coin amount. Only block coins are ever
 * multiplied — dice and storey/all-clear bonuses stay flat.
 */
export function applyComboMultiplier(coins: number, comboCount: number): number {
  return Math.round(coins * getComboMultiplier(comboCount));
}

/**
 * Calculate rewards for clearing a single block
 */
export function calculateBlockRewards(category: ActionCategory): {
  coins: number;
  dice: number;
} {
  return {
    coins: TASK_TOWER_REWARDS.CLEAR_BLOCK_COINS[category],
    dice: TASK_TOWER_REWARDS.CLEAR_BLOCK_DICE[category],
  };
}

/**
 * Calculate rewards for the tower getting shorter. A settled tower can
 * never have an interior empty row, so "the top storey emptied out" is the
 * line-clear moment: rewarded per storey the tower shrinks by.
 */
export function calculateLineClearRewards(lineCount: number): {
  coins: number;
  dice: number;
} {
  return {
    coins: TASK_TOWER_REWARDS.LINE_CLEAR_BONUS_COINS * lineCount,
    dice: TASK_TOWER_REWARDS.LINE_CLEAR_BONUS_DICE * lineCount,
  };
}

/**
 * Calculate all clear bonus
 */
export function calculateAllClearRewards(): {
  coins: number;
  dice: number;
  tokens: number;
} {
  return {
    coins: TASK_TOWER_REWARDS.ALL_CLEAR_BONUS_COINS,
    dice: TASK_TOWER_REWARDS.ALL_CLEAR_BONUS_DICE,
    tokens: TASK_TOWER_REWARDS.ALL_CLEAR_BONUS_TOKENS,
  };
}
