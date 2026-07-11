import type { Action, ActionCategory } from '../../../../types/actions';
import { TOWER_GRID, TASK_TOWER_REWARDS, type TowerBlock, type BlockSize } from './taskTowerTypes';

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
 * Build tower from actions
 * Arranges actions into a grid using a simple left-to-right, bottom-to-top packing algorithm
 */
export function buildTower(actions: Action[]): TowerBlock[] {
  // Sort actions: must_do first (urgent), then nice_to_do, then project
  const sortedActions = [...actions].sort((a, b) => {
    const order = { must_do: 1, nice_to_do: 2, project: 3 };
    return order[a.category] - order[b.category];
  });

  const blocks: TowerBlock[] = [];
  let currentRow = 0;
  let currentCol = 0;

  for (const action of sortedActions) {
    // Cap at MAX_ROWS * COLS worth of blocks
    if (currentRow >= TOWER_GRID.MAX_ROWS) {
      break;
    }

    const size = getBlockSize(action.category);
    const width = getBlockWidth(size);

    // If block doesn't fit in current row, move to next row
    if (currentCol + width > TOWER_GRID.COLS) {
      currentRow++;
      currentCol = 0;

      // Check if we've exceeded max rows
      if (currentRow >= TOWER_GRID.MAX_ROWS) {
        break;
      }
    }

    // Truncate title to 40 chars
    const truncatedTitle = action.title.length > 40 
      ? action.title.substring(0, 40) + '...' 
      : action.title;

    blocks.push({
      id: action.id,
      actionId: action.id,
      title: truncatedTitle,
      category: action.category,
      size,
      row: currentRow,
      col: currentCol,
      width,
      completed: false,
      animating: false,
    });

    currentCol += width;
  }

  // Settle the packed tower so no block floats above a gap the row-by-row
  // packer left beneath it (e.g. a 1-wide block placed beside a 3-wide one).
  return settleBlocks(blocks);
}

/**
 * Do two blocks overlap horizontally (share at least one column)?
 */
function overlapsHorizontally(a: TowerBlock, b: TowerBlock): boolean {
  return !(a.col >= b.col + b.width || b.col >= a.col + a.width);
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
 * Check for line clears (rows that are completely empty)
 */
export function checkLineClears(blocks: TowerBlock[]): { clearedRows: number[], blocks: TowerBlock[] } {
  if (blocks.length === 0) {
    return { clearedRows: [], blocks: [] };
  }

  // Find the maximum row that has blocks
  const maxRow = Math.max(...blocks.map(b => b.row));
  
  const clearedRows: number[] = [];
  
  // Check each row from 0 to maxRow
  for (let row = 0; row <= maxRow; row++) {
    // A row is cleared if it has no blocks
    const hasBlockInRow = blocks.some(b => b.row === row);
    
    if (!hasBlockInRow) {
      clearedRows.push(row);
    }
  }

  // Compact blocks by removing empty rows
  let updatedBlocks = [...blocks];
  
  // Sort cleared rows in descending order to process from top to bottom
  const sortedClearedRows = [...clearedRows].sort((a, b) => b - a);
  
  for (const clearedRow of sortedClearedRows) {
    // Move all blocks above the cleared row down by 1
    updatedBlocks = updatedBlocks.map(b => ({
      ...b,
      row: b.row > clearedRow ? b.row - 1 : b.row,
    }));
  }

  return { clearedRows, blocks: updatedBlocks };
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
 * Calculate rewards for line clears
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
