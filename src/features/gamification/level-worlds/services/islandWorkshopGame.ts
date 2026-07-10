/**
 * islandWorkshopGame.ts — pure rules engine for the Island Workshop timed-event
 * mini-game (strategic block-placement puzzle, Blocks-Boutique-inspired but
 * fully original rules/branding).
 *
 * Everything here is deterministic and side-effect free so it can be unit
 * tested by the Island Run service test runner. Rendering, dragging, storage
 * I/O and ticket spends live in
 * `features/gamification/games/island-workshop/IslandWorkshopMinigame.tsx`.
 *
 * Core loop:
 *   - Each placed block shape costs 1 event ticket/material block.
 *   - Each set offers 3 shapes; all 3 must be placed before the next set.
 *   - Completing a full row/column clears it and yields crafting materials.
 *   - Multi-line clears and consecutive-turn clear streaks pay combo bonuses.
 *   - Pure-colour lines (every cell the same tint) super-flash and add bonus
 *     blocks to the placeable pool: +1 per pure line, +4 when two pure lines
 *     of the same colour clear together.
 *   - One Creature Assist per run clears the densest 3×3 pocket of the board.
 *   - The run ends when none of the remaining shapes fits anywhere.
 *   - Final score + materials convert into construction progress toward the
 *     event's magical island object (the Tidelight Beacon).
 *
 * Bench levels: filling the score reward bar unlocks the next bench level for
 * subsequent runs. Level 2 seeds the bench with keystone blocks (solid,
 * single-colour: a full mixed line clears around them; only a full line of
 * their own colour releases them, paying bonus blocks) and gem blocks that
 * unleash a dice reward when cleared.
 */

export const ISLAND_WORKSHOP_GRID_SIZE = 8;
export const ISLAND_WORKSHOP_CELL_COUNT = ISLAND_WORKSHOP_GRID_SIZE * ISLAND_WORKSHOP_GRID_SIZE;
export const ISLAND_WORKSHOP_SHAPES_PER_SET = 3;
export const ISLAND_WORKSHOP_BLOCK_TICKET_COST = 1;
export const ISLAND_WORKSHOP_ASSIST_SIZE = 3;

/** Materials needed to finish constructing the Tidelight Beacon (per event). */
export const ISLAND_WORKSHOP_CONSTRUCTION_TARGET = 60;

/** Score points that convert into 1 construction material at run end. */
export const ISLAND_WORKSHOP_SCORE_PER_MATERIAL = 50;

/** Line-clear base score (per line, squared for simultaneous clears). */
export const ISLAND_WORKSHOP_LINE_BASE_SCORE = 10;

/** Consecutive-clear-turn streak multiplier cap. */
export const ISLAND_WORKSHOP_MAX_STREAK_MULTIPLIER = 3;

/** Highest bench level (level 2 unlocks keystone + gem blocks). */
export const ISLAND_WORKSHOP_MAX_LEVEL = 2;

/** Bit flag: cell is a solid keystone block (only a pure-colour line clears it). */
export const ISLAND_WORKSHOP_SOLID_FLAG = 8;

/** Bit flag: cell hides a gem that unleashes a dice reward when cleared. */
export const ISLAND_WORKSHOP_GEM_FLAG = 16;

/** Bonus blocks added to the pool for a single pure-colour line clear. */
export const ISLAND_WORKSHOP_MONO_LINE_BONUS_BLOCKS = 1;

/** Bonus blocks when 2+ pure lines of the SAME colour clear simultaneously. */
export const ISLAND_WORKSHOP_MONO_PAIR_BONUS_BLOCKS = 4;

/** Blocks released into the pool when a keystone block is cleared. */
export const ISLAND_WORKSHOP_SOLID_RELEASE_BLOCKS = 7;

/** Dice unleashed per gem block cleared. */
export const ISLAND_WORKSHOP_GEM_REWARD_DICE = 25;

/** Keystone blocks seeded onto a fresh level-2 bench. */
export const ISLAND_WORKSHOP_LEVEL2_SOLID_SEEDS = 2;

/** Gem blocks seeded onto a fresh level-2 bench. */
export const ISLAND_WORKSHOP_LEVEL2_GEM_SEEDS = 3;

/**
 * Board is a flat row-major array of ISLAND_WORKSHOP_CELL_COUNT cells.
 * 0 = empty. Bits 0..2 carry the material tint index (1..4, visual only);
 * ISLAND_WORKSHOP_SOLID_FLAG marks keystone blocks and
 * ISLAND_WORKSHOP_GEM_FLAG marks gem-bearing blocks.
 */
export type IslandWorkshopBoard = readonly number[];

/** Material tint index (1..4) of a cell, ignoring solid/gem flags. */
export function getIslandWorkshopCellTint(cell: number): number {
  return cell & 7;
}

export function isIslandWorkshopSolidCell(cell: number): boolean {
  return cell > 0 && (cell & ISLAND_WORKSHOP_SOLID_FLAG) !== 0;
}

export function isIslandWorkshopGemCell(cell: number): boolean {
  return cell > 0 && (cell & ISLAND_WORKSHOP_GEM_FLAG) !== 0;
}

export interface IslandWorkshopShapeDef {
  id: string;
  name: string;
  /** [row, col] offsets from the shape's top-left anchor. */
  cells: readonly (readonly [number, number])[];
  /** Relative pick weight in the shape bag. */
  weight: number;
  /** Material tint index (1..4) used for board cells placed by this shape. */
  tint: number;
}

/**
 * Original shape bag. Weights favour small/medium pieces so runs feel
 * strategic rather than instantly fatal; large pieces are rare tension spikes.
 */
export const ISLAND_WORKSHOP_SHAPE_CATALOG: readonly IslandWorkshopShapeDef[] = [
  { id: 'spark', name: 'Spark Stone', cells: [[0, 0]], weight: 5, tint: 1 },
  { id: 'duo_h', name: 'Plank Pair', cells: [[0, 0], [0, 1]], weight: 7, tint: 2 },
  { id: 'duo_v', name: 'Post Pair', cells: [[0, 0], [1, 0]], weight: 7, tint: 2 },
  { id: 'tri_h', name: 'Beam Row', cells: [[0, 0], [0, 1], [0, 2]], weight: 7, tint: 3 },
  { id: 'tri_v', name: 'Beam Column', cells: [[0, 0], [1, 0], [2, 0]], weight: 7, tint: 3 },
  { id: 'corner_tl', name: 'Hook Brace', cells: [[0, 0], [0, 1], [1, 0]], weight: 6, tint: 4 },
  { id: 'corner_br', name: 'Anchor Brace', cells: [[1, 1], [0, 1], [1, 0]], weight: 6, tint: 4 },
  { id: 'square_2', name: 'Tile Block', cells: [[0, 0], [0, 1], [1, 0], [1, 1]], weight: 7, tint: 1 },
  { id: 'line4_h', name: 'Long Beam', cells: [[0, 0], [0, 1], [0, 2], [0, 3]], weight: 4, tint: 2 },
  { id: 'line4_v', name: 'Tall Mast', cells: [[0, 0], [1, 0], [2, 0], [3, 0]], weight: 4, tint: 2 },
  { id: 'tee', name: 'Truss Tee', cells: [[0, 0], [0, 1], [0, 2], [1, 1]], weight: 4, tint: 3 },
  { id: 'ell', name: 'Gantry Ell', cells: [[0, 0], [1, 0], [2, 0], [2, 1]], weight: 4, tint: 4 },
  { id: 'jay', name: 'Crane Jay', cells: [[0, 1], [1, 1], [2, 1], [2, 0]], weight: 4, tint: 4 },
  { id: 'rect_2x3', name: 'Deck Slab', cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]], weight: 3, tint: 1 },
  { id: 'rect_3x2', name: 'Wall Slab', cells: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]], weight: 3, tint: 1 },
  { id: 'line5_h', name: 'Grand Beam', cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], weight: 2, tint: 2 },
  { id: 'plus', name: 'Star Joint', cells: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]], weight: 2, tint: 3 },
  { id: 'square_3', name: 'Keystone Block', cells: [
    [0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2],
  ], weight: 1, tint: 4 },
] as const;

const SHAPE_BY_ID: ReadonlyMap<string, IslandWorkshopShapeDef> = new Map(
  ISLAND_WORKSHOP_SHAPE_CATALOG.map((shape) => [shape.id, shape]),
);

const TOTAL_SHAPE_WEIGHT = ISLAND_WORKSHOP_SHAPE_CATALOG.reduce((sum, shape) => sum + shape.weight, 0);

/** Safe accessor; falls back to the 1-cell Spark Stone for unknown ids. */
export function getIslandWorkshopShape(id: string): IslandWorkshopShapeDef {
  return SHAPE_BY_ID.get(id) ?? ISLAND_WORKSHOP_SHAPE_CATALOG[0];
}

export function createEmptyIslandWorkshopBoard(): number[] {
  return new Array<number>(ISLAND_WORKSHOP_CELL_COUNT).fill(0);
}

// ── Seeded RNG (Lehmer LCG, same family as companionFeastGame) ──────────────

export function nextIslandWorkshopRngState(state: number): number {
  const normalized = Number.isFinite(state) ? Math.floor(Math.abs(state)) % 2147483647 : 1;
  const seeded = normalized === 0 ? 1 : normalized;
  return (seeded * 48271) % 2147483647;
}

/** Roll one shape id from the weighted bag. Returns [shapeId, nextRngState]. */
export function rollIslandWorkshopShape(state: number): [string, number] {
  const nextState = nextIslandWorkshopRngState(state);
  const pick = nextState % TOTAL_SHAPE_WEIGHT;
  let cursor = 0;
  for (const shape of ISLAND_WORKSHOP_SHAPE_CATALOG) {
    cursor += shape.weight;
    if (pick < cursor) return [shape.id, nextState];
  }
  return [ISLAND_WORKSHOP_SHAPE_CATALOG[0].id, nextState];
}

/** Roll a full tray set of ISLAND_WORKSHOP_SHAPES_PER_SET shapes. */
export function rollIslandWorkshopShapeSet(state: number): [string[], number] {
  const shapeIds: string[] = [];
  let rng = state;
  for (let i = 0; i < ISLAND_WORKSHOP_SHAPES_PER_SET; i += 1) {
    const [shapeId, nextState] = rollIslandWorkshopShape(rng);
    shapeIds.push(shapeId);
    rng = nextState;
  }
  return [shapeIds, rng];
}

// ── Placement ────────────────────────────────────────────────────────────────

/**
 * Board cell indexes the shape would occupy when anchored at (row, col), or
 * `null` when any cell falls outside the grid.
 */
export function getIslandWorkshopPlacementCells(
  shape: IslandWorkshopShapeDef,
  row: number,
  col: number,
): number[] | null {
  const cells: number[] = [];
  for (const [dr, dc] of shape.cells) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || c < 0 || r >= ISLAND_WORKSHOP_GRID_SIZE || c >= ISLAND_WORKSHOP_GRID_SIZE) return null;
    cells.push(r * ISLAND_WORKSHOP_GRID_SIZE + c);
  }
  return cells;
}

export function canPlaceIslandWorkshopShape(
  board: IslandWorkshopBoard,
  shape: IslandWorkshopShapeDef,
  row: number,
  col: number,
): boolean {
  const cells = getIslandWorkshopPlacementCells(shape, row, col);
  if (!cells) return false;
  return cells.every((index) => board[index] === 0);
}

export function hasAnyIslandWorkshopPlacement(
  board: IslandWorkshopBoard,
  shape: IslandWorkshopShapeDef,
): boolean {
  for (let row = 0; row < ISLAND_WORKSHOP_GRID_SIZE; row += 1) {
    for (let col = 0; col < ISLAND_WORKSHOP_GRID_SIZE; col += 1) {
      if (canPlaceIslandWorkshopShape(board, shape, row, col)) return true;
    }
  }
  return false;
}

/** True when none of the remaining (unplaced) shapes fits anywhere. */
export function isIslandWorkshopRunStuck(
  board: IslandWorkshopBoard,
  remainingShapeIds: readonly (string | null)[],
): boolean {
  const remaining = remainingShapeIds.filter((id): id is string => typeof id === 'string');
  if (remaining.length === 0) return false;
  return remaining.every((id) => !hasAnyIslandWorkshopPlacement(board, getIslandWorkshopShape(id)));
}

/**
 * Full row/column indexes (0..7 each) that are completely filled on `board`.
 */
export function findIslandWorkshopCompletedLines(board: IslandWorkshopBoard): {
  rows: number[];
  cols: number[];
} {
  const rows: number[] = [];
  const cols: number[] = [];
  for (let row = 0; row < ISLAND_WORKSHOP_GRID_SIZE; row += 1) {
    let full = true;
    for (let col = 0; col < ISLAND_WORKSHOP_GRID_SIZE; col += 1) {
      if (board[row * ISLAND_WORKSHOP_GRID_SIZE + col] === 0) {
        full = false;
        break;
      }
    }
    if (full) rows.push(row);
  }
  for (let col = 0; col < ISLAND_WORKSHOP_GRID_SIZE; col += 1) {
    let full = true;
    for (let row = 0; row < ISLAND_WORKSHOP_GRID_SIZE; row += 1) {
      if (board[row * ISLAND_WORKSHOP_GRID_SIZE + col] === 0) {
        full = false;
        break;
      }
    }
    if (full) cols.push(col);
  }
  return { rows, cols };
}

/** A completed line whose cells all share one tint (pure-colour line). */
export interface IslandWorkshopMonochromeLine {
  kind: 'row' | 'col';
  index: number;
  tint: number;
  cellIndexes: number[];
}

export interface IslandWorkshopPlacementResult {
  board: number[];
  cellsPlaced: number;
  /** Total simultaneous lines cleared (rows + columns). */
  linesCleared: number;
  clearedCellIndexes: number[];
  /** +1 point per placed cell. */
  placementScore: number;
  /** Line score after multi-line and streak multipliers. */
  clearScore: number;
  /** Streak multiplier that was applied to `clearScore` (1 when no streak). */
  streakMultiplier: number;
  /** Crafting materials earned by this placement's clears. */
  materialsEarned: number;
  /** Consecutive-clear-turn streak after this placement. */
  streakAfter: number;
  /** Cleared lines whose cells were all one colour (super-flash FX). */
  monochromeLines: IslandWorkshopMonochromeLine[];
  /** Bonus blocks added to the pool by pure-colour lines (+1 / +4 same-colour pair). */
  bonusBlocksEarned: number;
  /** Keystone cells released by pure-colour lines of their own tint. */
  solidCellsReleased: number[];
  /** Blocks added to the pool by released keystones (7 each). */
  releaseBlocksEarned: number;
  /** Gem cells cleared by this placement. */
  gemCellsUnleashed: number[];
  /** Dice unleashed by cleared gems (25 each). */
  gemRewardDice: number;
}

/**
 * Bonus blocks from pure-colour lines: +1 per lone pure line; a same-colour
 * pair (2+ pure lines of one tint clearing together) pays +4 for that colour.
 */
export function resolveIslandWorkshopMonoLineBonusBlocks(
  lines: readonly { tint: number }[],
): number {
  if (lines.length === 0) return 0;
  const countByTint = new Map<number, number>();
  for (const line of lines) countByTint.set(line.tint, (countByTint.get(line.tint) ?? 0) + 1);
  let total = 0;
  for (const count of countByTint.values()) {
    total += count >= 2 ? ISLAND_WORKSHOP_MONO_PAIR_BONUS_BLOCKS : ISLAND_WORKSHOP_MONO_LINE_BONUS_BLOCKS;
  }
  return total;
}

/**
 * Streak multiplier for a placement that cleared at least one line, given the
 * streak value AFTER incrementing (1 = first clear, 2 = second in a row, …).
 */
export function resolveIslandWorkshopStreakMultiplier(streakAfter: number): number {
  const safe = Math.max(1, Math.floor(streakAfter));
  return Math.min(ISLAND_WORKSHOP_MAX_STREAK_MULTIPLIER, safe);
}

/**
 * Materials from a clearing placement: 1 per line, +1 multi-line combo bonus,
 * +1 streak bonus when the clear extends a consecutive-turn streak.
 */
export function resolveIslandWorkshopMaterialsEarned(linesCleared: number, streakAfter: number): number {
  if (linesCleared <= 0) return 0;
  const multiLineBonus = linesCleared >= 2 ? 1 : 0;
  const streakBonus = streakAfter >= 2 ? 1 : 0;
  return linesCleared + multiLineBonus + streakBonus;
}

/**
 * Apply one shape placement. Returns `null` when the placement is invalid
 * (out of bounds or overlapping); otherwise the new board with any completed
 * rows/columns cleared plus the score/material/combo breakdown.
 *
 * `streakBefore` is the count of consecutive prior placements that each
 * cleared at least one line (0 when the previous placement cleared nothing).
 */
export function placeIslandWorkshopShape(options: {
  board: IslandWorkshopBoard;
  shapeId: string;
  row: number;
  col: number;
  streakBefore: number;
}): IslandWorkshopPlacementResult | null {
  const shape = getIslandWorkshopShape(options.shapeId);
  const cells = getIslandWorkshopPlacementCells(shape, options.row, options.col);
  if (!cells) return null;
  if (!cells.every((index) => options.board[index] === 0)) return null;

  const placed = [...options.board];
  for (const index of cells) placed[index] = shape.tint;

  const { rows, cols } = findIslandWorkshopCompletedLines(placed);
  const linesCleared = rows.length + cols.length;

  const clearedCellIndexes: number[] = [];
  const monochromeLines: IslandWorkshopMonochromeLine[] = [];
  const solidCellsReleased: number[] = [];
  const gemCellsUnleashed: number[] = [];
  if (linesCleared > 0) {
    const completedLines: { kind: 'row' | 'col'; index: number; cellIndexes: number[] }[] = [];
    for (const row of rows) {
      const cellIndexes: number[] = [];
      for (let col = 0; col < ISLAND_WORKSHOP_GRID_SIZE; col += 1) {
        cellIndexes.push(row * ISLAND_WORKSHOP_GRID_SIZE + col);
      }
      completedLines.push({ kind: 'row', index: row, cellIndexes });
    }
    for (const col of cols) {
      const cellIndexes: number[] = [];
      for (let row = 0; row < ISLAND_WORKSHOP_GRID_SIZE; row += 1) {
        cellIndexes.push(row * ISLAND_WORKSHOP_GRID_SIZE + col);
      }
      completedLines.push({ kind: 'col', index: col, cellIndexes });
    }

    // Keystone (solid) cells survive mixed-colour clears: they only leave the
    // bench inside a pure line of their own colour. A pure line is one whose
    // cells (keystones included) all share a single tint.
    const clearedSet = new Set<number>();
    const releasedSolidSet = new Set<number>();
    for (const line of completedLines) {
      const firstTint = getIslandWorkshopCellTint(placed[line.cellIndexes[0]]);
      const isMonochrome = line.cellIndexes.every(
        (index) => getIslandWorkshopCellTint(placed[index]) === firstTint,
      );
      if (isMonochrome) {
        monochromeLines.push({ kind: line.kind, index: line.index, tint: firstTint, cellIndexes: line.cellIndexes });
      }
      for (const index of line.cellIndexes) {
        if (isIslandWorkshopSolidCell(placed[index])) {
          if (!isMonochrome) continue;
          releasedSolidSet.add(index);
        }
        clearedSet.add(index);
      }
    }
    for (const index of clearedSet) {
      if (isIslandWorkshopGemCell(placed[index])) gemCellsUnleashed.push(index);
      placed[index] = 0;
      clearedCellIndexes.push(index);
    }
    solidCellsReleased.push(...releasedSolidSet);
    clearedCellIndexes.sort((a, b) => a - b);
    solidCellsReleased.sort((a, b) => a - b);
    gemCellsUnleashed.sort((a, b) => a - b);
  }

  const streakBefore = Math.max(0, Math.floor(options.streakBefore));
  const streakAfter = linesCleared > 0 ? streakBefore + 1 : 0;
  const streakMultiplier = linesCleared > 0 ? resolveIslandWorkshopStreakMultiplier(streakAfter) : 1;
  const placementScore = cells.length;
  const clearScore = linesCleared > 0
    ? ISLAND_WORKSHOP_LINE_BASE_SCORE * linesCleared * linesCleared * streakMultiplier
    : 0;

  return {
    board: placed,
    cellsPlaced: cells.length,
    linesCleared,
    clearedCellIndexes,
    placementScore,
    clearScore,
    streakMultiplier,
    materialsEarned: resolveIslandWorkshopMaterialsEarned(linesCleared, streakAfter),
    streakAfter,
    monochromeLines,
    bonusBlocksEarned: resolveIslandWorkshopMonoLineBonusBlocks(monochromeLines),
    solidCellsReleased,
    releaseBlocksEarned: solidCellsReleased.length * ISLAND_WORKSHOP_SOLID_RELEASE_BLOCKS,
    gemCellsUnleashed,
    gemRewardDice: gemCellsUnleashed.length * ISLAND_WORKSHOP_GEM_REWARD_DICE,
  };
}

// ── Creature Assist ──────────────────────────────────────────────────────────

export interface IslandWorkshopAssistResult {
  board: number[];
  cellsCleared: number;
  /** Top-left anchor of the cleared 3×3 pocket (for the reveal animation). */
  targetRow: number;
  targetCol: number;
}

/**
 * Creature Assist: the workshop creature sweeps away the densest 3×3 pocket of
 * placed blocks, freeing space for awkward pieces. Deterministic — scans all
 * 3×3 windows and clears the one with the most filled cells (ties resolve to
 * the earliest window in row-major order). No-op on an empty board.
 */
export function applyIslandWorkshopCreatureAssist(board: IslandWorkshopBoard): IslandWorkshopAssistResult {
  let bestRow = 0;
  let bestCol = 0;
  let bestFilled = -1;
  const maxAnchor = ISLAND_WORKSHOP_GRID_SIZE - ISLAND_WORKSHOP_ASSIST_SIZE;
  for (let row = 0; row <= maxAnchor; row += 1) {
    for (let col = 0; col <= maxAnchor; col += 1) {
      let filled = 0;
      for (let dr = 0; dr < ISLAND_WORKSHOP_ASSIST_SIZE; dr += 1) {
        for (let dc = 0; dc < ISLAND_WORKSHOP_ASSIST_SIZE; dc += 1) {
          if (board[(row + dr) * ISLAND_WORKSHOP_GRID_SIZE + (col + dc)] !== 0) filled += 1;
        }
      }
      if (filled > bestFilled) {
        bestFilled = filled;
        bestRow = row;
        bestCol = col;
      }
    }
  }

  if (bestFilled <= 0) {
    return { board: [...board], cellsCleared: 0, targetRow: bestRow, targetCol: bestCol };
  }

  const next = [...board];
  for (let dr = 0; dr < ISLAND_WORKSHOP_ASSIST_SIZE; dr += 1) {
    for (let dc = 0; dc < ISLAND_WORKSHOP_ASSIST_SIZE; dc += 1) {
      next[(bestRow + dr) * ISLAND_WORKSHOP_GRID_SIZE + (bestCol + dc)] = 0;
    }
  }
  return { board: next, cellsCleared: bestFilled, targetRow: bestRow, targetCol: bestCol };
}

// ── Run entry / block tickets ────────────────────────────────────────────────

/**
 * Island Workshop event tickets are spendable material blocks, not run lives:
 * opening the bench is free, and each successful shape placement spends one.
 */
export function canStartIslandWorkshopRun(options: {
  ticketsRemaining: number;
  hasSavedRun?: boolean;
}): boolean {
  if (options.hasSavedRun) return true;
  return Math.max(0, Math.floor(options.ticketsRemaining)) >= ISLAND_WORKSHOP_BLOCK_TICKET_COST;
}

export interface IslandWorkshopScoreRewardMilestone {
  id: string;
  score: number;
  label: string;
  emoji: string;
  rewardDice: number;
  mysteryBoxes: number;
}

export const ISLAND_WORKSHOP_SCORE_REWARD_MILESTONES: readonly IslandWorkshopScoreRewardMilestone[] = [
  { id: 'supply_box', score: 100, label: 'Supply Box', emoji: '🎁', rewardDice: 0, mysteryBoxes: 1 },
  { id: 'dice_cache', score: 250, label: 'Dice Cache', emoji: '🎲', rewardDice: 50, mysteryBoxes: 0 },
  { id: 'mystery_crate', score: 450, label: 'Mystery Crate', emoji: '🧰', rewardDice: 0, mysteryBoxes: 1 },
  { id: 'grand_toolkit', score: 700, label: 'Grand Toolkit', emoji: '🌟', rewardDice: 100, mysteryBoxes: 1 },
] as const;

/** Level-2 reward bar: higher bars, richer payouts. */
export const ISLAND_WORKSHOP_LEVEL2_SCORE_REWARD_MILESTONES: readonly IslandWorkshopScoreRewardMilestone[] = [
  { id: 'l2_supply_cache', score: 150, label: 'Supply Cache', emoji: '🎁', rewardDice: 0, mysteryBoxes: 1 },
  { id: 'l2_dice_hoard', score: 350, label: 'Dice Hoard', emoji: '🎲', rewardDice: 75, mysteryBoxes: 0 },
  { id: 'l2_prism_crate', score: 600, label: 'Prism Crate', emoji: '💎', rewardDice: 0, mysteryBoxes: 2 },
  { id: 'l2_master_vault', score: 900, label: 'Master Vault', emoji: '🌟', rewardDice: 150, mysteryBoxes: 1 },
] as const;

export function getIslandWorkshopScoreRewardMilestones(
  level: number,
): readonly IslandWorkshopScoreRewardMilestone[] {
  return Math.max(1, Math.floor(level)) >= 2
    ? ISLAND_WORKSHOP_LEVEL2_SCORE_REWARD_MILESTONES
    : ISLAND_WORKSHOP_SCORE_REWARD_MILESTONES;
}

export function resolveIslandWorkshopClaimableScoreRewards(options: {
  previousScore: number;
  nextScore: number;
  level?: number;
}): IslandWorkshopScoreRewardMilestone[] {
  const previousScore = Math.max(0, Math.floor(options.previousScore));
  const nextScore = Math.max(0, Math.floor(options.nextScore));
  return getIslandWorkshopScoreRewardMilestones(options.level ?? 1).filter(
    (milestone) => previousScore < milestone.score && nextScore >= milestone.score,
  );
}

/**
 * Bench level after a score change: filling the reward bar (crossing the final
 * milestone of the current level) promotes the bench to the next level for
 * future runs. Returns `null` when no level-up occurred.
 */
export function resolveIslandWorkshopLevelUp(options: {
  currentLevel: number;
  previousScore: number;
  nextScore: number;
}): number | null {
  const level = Math.max(1, Math.floor(options.currentLevel));
  if (level >= ISLAND_WORKSHOP_MAX_LEVEL) return null;
  const milestones = getIslandWorkshopScoreRewardMilestones(level);
  const finalScore = milestones[milestones.length - 1]?.score ?? Infinity;
  const previousScore = Math.max(0, Math.floor(options.previousScore));
  const nextScore = Math.max(0, Math.floor(options.nextScore));
  return previousScore < finalScore && nextScore >= finalScore ? level + 1 : null;
}

// ── Bench level persistence + level-2 seeding ────────────────────────────────

export function buildIslandWorkshopLevelStorageKey(scope: string, recordEventId: string): string {
  return `islandRun.islandWorkshop.level.v1.${scope}.${recordEventId}`;
}

/** Parse + clamp a persisted bench level (plain number, 1..MAX). */
export function parseIslandWorkshopLevel(raw: string | null | undefined): number {
  if (!raw) return 1;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1) return 1;
  return Math.min(ISLAND_WORKSHOP_MAX_LEVEL, Math.floor(value));
}

/**
 * Fresh level-2 bench: seeds keystone and gem blocks at deterministic RNG
 * positions with random tints. Returns [board, nextRngState].
 */
export function seedIslandWorkshopLevelTwoBoard(rngState: number): [number[], number] {
  const board = createEmptyIslandWorkshopBoard();
  let rng = rngState;
  const used = new Set<number>();
  const seedCell = (flag: number) => {
    rng = nextIslandWorkshopRngState(rng);
    let index = rng % ISLAND_WORKSHOP_CELL_COUNT;
    while (used.has(index)) index = (index + 7) % ISLAND_WORKSHOP_CELL_COUNT;
    used.add(index);
    rng = nextIslandWorkshopRngState(rng);
    const tint = 1 + (rng % 4);
    board[index] = tint | flag;
  };
  for (let i = 0; i < ISLAND_WORKSHOP_LEVEL2_SOLID_SEEDS; i += 1) seedCell(ISLAND_WORKSHOP_SOLID_FLAG);
  for (let i = 0; i < ISLAND_WORKSHOP_LEVEL2_GEM_SEEDS; i += 1) seedCell(ISLAND_WORKSHOP_GEM_FLAG);
  return [board, rng];
}

// ── Construction (magical island object) ─────────────────────────────────────

export interface IslandWorkshopConstructionStage {
  /** Progress ratio [0..1) lower bound at which this stage begins. */
  minRatio: number;
  label: string;
  emoji: string;
}

/** Player-facing build stages for the Tidelight Beacon. */
export const ISLAND_WORKSHOP_CONSTRUCTION_STAGES: readonly IslandWorkshopConstructionStage[] = [
  { minRatio: 0, label: 'Tide-worn foundation', emoji: '🪨' },
  { minRatio: 0.25, label: 'Driftwood frame', emoji: '🪵' },
  { minRatio: 0.5, label: 'Crystal lantern housing', emoji: '💎' },
  { minRatio: 0.75, label: 'Beacon crown rising', emoji: '🗼' },
  { minRatio: 1, label: 'Tidelight Beacon shining', emoji: '🌟' },
] as const;

export function resolveIslandWorkshopConstructionStage(progress: number): IslandWorkshopConstructionStage {
  const ratio = Math.max(0, Math.min(1, progress / ISLAND_WORKSHOP_CONSTRUCTION_TARGET));
  let stage = ISLAND_WORKSHOP_CONSTRUCTION_STAGES[0];
  for (const candidate of ISLAND_WORKSHOP_CONSTRUCTION_STAGES) {
    if (ratio >= candidate.minRatio) stage = candidate;
  }
  return stage;
}

/**
 * Convert a finished run into construction materials: everything collected in
 * play plus 1 bonus material per ISLAND_WORKSHOP_SCORE_PER_MATERIAL score.
 */
export function resolveIslandWorkshopRunConstructionGain(options: {
  score: number;
  materialsCollected: number;
}): number {
  const score = Math.max(0, Math.floor(options.score));
  const materials = Math.max(0, Math.floor(options.materialsCollected));
  return materials + Math.floor(score / ISLAND_WORKSHOP_SCORE_PER_MATERIAL);
}

export interface IslandWorkshopConstructionApplyResult {
  progress: number;
  justCompleted: boolean;
}

/** Apply a construction gain, clamping at the target and flagging completion. */
export function applyIslandWorkshopConstructionGain(
  progressBefore: number,
  gain: number,
): IslandWorkshopConstructionApplyResult {
  const before = Math.max(0, Math.min(ISLAND_WORKSHOP_CONSTRUCTION_TARGET, Math.floor(progressBefore)));
  const safeGain = Math.max(0, Math.floor(gain));
  const progress = Math.min(ISLAND_WORKSHOP_CONSTRUCTION_TARGET, before + safeGain);
  return {
    progress,
    justCompleted: before < ISLAND_WORKSHOP_CONSTRUCTION_TARGET && progress >= ISLAND_WORKSHOP_CONSTRUCTION_TARGET,
  };
}

/** Bonus reward granted once per event when the Beacon finishes building. */
export const ISLAND_WORKSHOP_CONSTRUCTION_REWARD = Object.freeze({ dice: 250, spinTokens: 2 });

// ── Result tiers ─────────────────────────────────────────────────────────────

export interface IslandWorkshopResultTier {
  id: string;
  label: string;
  emoji: string;
  minScore: number;
  rewardDice: number;
}

export const ISLAND_WORKSHOP_RESULT_TIERS: readonly IslandWorkshopResultTier[] = [
  { id: 'apprentice', label: 'Apprentice Tinkerer', emoji: '🔩', minScore: 0, rewardDice: 50 },
  { id: 'crafter', label: 'Workshop Crafter', emoji: '🔨', minScore: 80, rewardDice: 75 },
  { id: 'builder', label: 'Master Builder', emoji: '🏗️', minScore: 200, rewardDice: 100 },
  { id: 'artificer', label: 'Isle Artificer', emoji: '✨', minScore: 400, rewardDice: 150 },
  { id: 'wrightmaster', label: 'Legendary Wrightmaster', emoji: '🌟', minScore: 700, rewardDice: 250 },
] as const;

/** Level-2 tiers: harder score bars, richer dice payouts. */
export const ISLAND_WORKSHOP_LEVEL2_RESULT_TIERS: readonly IslandWorkshopResultTier[] = [
  { id: 'l2_apprentice', label: 'Keystone Apprentice', emoji: '🔩', minScore: 0, rewardDice: 75 },
  { id: 'l2_crafter', label: 'Prism Crafter', emoji: '🔨', minScore: 100, rewardDice: 110 },
  { id: 'l2_builder', label: 'Keystone Builder', emoji: '🏗️', minScore: 250, rewardDice: 160 },
  { id: 'l2_artificer', label: 'Gemwright Artificer', emoji: '✨', minScore: 500, rewardDice: 220 },
  { id: 'l2_wrightmaster', label: 'Mythic Wrightmaster', emoji: '🌟', minScore: 900, rewardDice: 350 },
] as const;

export function getIslandWorkshopResultTiers(level: number): readonly IslandWorkshopResultTier[] {
  return Math.max(1, Math.floor(level)) >= 2
    ? ISLAND_WORKSHOP_LEVEL2_RESULT_TIERS
    : ISLAND_WORKSHOP_RESULT_TIERS;
}

export function resolveIslandWorkshopResultTier(score: number, level = 1): IslandWorkshopResultTier {
  const safeScore = Math.max(0, Math.floor(score));
  const tiers = getIslandWorkshopResultTiers(level);
  let tier = tiers[0];
  for (const candidate of tiers) {
    if (safeScore >= candidate.minScore) tier = candidate;
  }
  return tier;
}

// ── Saved progress (leave & Return to Island mid-run) ───────────────────────

export interface IslandWorkshopSavedRunV1 {
  version: 1;
  board: number[];
  /** 3 tray slots; `null` marks a shape already placed from the current set. */
  traySlotShapeIds: (string | null)[];
  rngState: number;
  score: number;
  streak: number;
  materialsCollected: number;
  assistUsed: boolean;
  setsCompleted: number;
  updatedAtMs: number;
  /** Bench level the run was started at (absent in pre-level saves → 1). */
  runLevel: number;
}

export function buildIslandWorkshopRunStorageKey(scope: string, recordEventId: string): string {
  return `islandRun.islandWorkshop.run.v1.${scope}.${recordEventId}`;
}

export function buildIslandWorkshopConstructionStorageKey(scope: string, recordEventId: string): string {
  return `islandRun.islandWorkshop.construction.v1.${scope}.${recordEventId}`;
}

export function serializeIslandWorkshopRun(run: IslandWorkshopSavedRunV1): string {
  return JSON.stringify(run);
}

/**
 * Parse + validate a saved run payload. Returns `null` for anything malformed
 * so a corrupt save can never wedge the entry screen.
 */
export function parseIslandWorkshopSavedRun(raw: string | null | undefined): IslandWorkshopSavedRunV1 | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const candidate = parsed as Record<string, unknown>;
    if (candidate.version !== 1) return null;
    if (!Array.isArray(candidate.board) || candidate.board.length !== ISLAND_WORKSHOP_CELL_COUNT) return null;
    if (!candidate.board.every((cell) => typeof cell === 'number' && Number.isFinite(cell) && cell >= 0)) return null;
    if (!Array.isArray(candidate.traySlotShapeIds) || candidate.traySlotShapeIds.length !== ISLAND_WORKSHOP_SHAPES_PER_SET) return null;
    const trayValid = candidate.traySlotShapeIds.every(
      (id) => id === null || (typeof id === 'string' && SHAPE_BY_ID.has(id)),
    );
    if (!trayValid) return null;
    if (!candidate.traySlotShapeIds.some((id) => typeof id === 'string')) return null;
    const numericFields = ['rngState', 'score', 'streak', 'materialsCollected', 'setsCompleted', 'updatedAtMs'] as const;
    for (const field of numericFields) {
      const value = candidate[field];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
    }
    if (typeof candidate.assistUsed !== 'boolean') return null;
    const rawRunLevel = candidate.runLevel;
    if (rawRunLevel !== undefined && (typeof rawRunLevel !== 'number' || !Number.isFinite(rawRunLevel) || rawRunLevel < 1)) return null;
    const runLevel = rawRunLevel === undefined
      ? 1
      : Math.min(ISLAND_WORKSHOP_MAX_LEVEL, Math.floor(rawRunLevel));
    return {
      version: 1,
      board: candidate.board.map((cell) => Math.max(0, Math.floor(cell as number))),
      traySlotShapeIds: candidate.traySlotShapeIds as (string | null)[],
      rngState: Math.floor(candidate.rngState as number),
      score: Math.floor(candidate.score as number),
      streak: Math.floor(candidate.streak as number),
      materialsCollected: Math.floor(candidate.materialsCollected as number),
      assistUsed: candidate.assistUsed as boolean,
      setsCompleted: Math.floor(candidate.setsCompleted as number),
      updatedAtMs: Math.floor(candidate.updatedAtMs as number),
      runLevel,
    };
  } catch {
    return null;
  }
}

/** Parse + clamp a persisted construction-progress payload (plain number). */
export function parseIslandWorkshopConstructionProgress(raw: string | null | undefined): number {
  if (!raw) return 0;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(ISLAND_WORKSHOP_CONSTRUCTION_TARGET, Math.floor(value));
}
