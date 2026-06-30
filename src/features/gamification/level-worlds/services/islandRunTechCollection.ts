/**
 * Island Run — 3×3 Technology Collection (pure resolver).
 *
 * Landing on an explicitly placed technology-fragment tile snaps a component
 * into a per-island 3×3 grid. This module owns the *pure* gameplay math:
 *   - whether the fixed fragment slot is newly collected or a duplicate,
 *   - which rows/columns/diagonals are newly completed by this pickup,
 *   - whether the full grid was newly completed (8→9 transition),
 *   - the dice reward totals (line rewards + full-board bonus).
 *
 * It performs no I/O and touches no React/runtime state, so it is exhaustively
 * unit-testable. The board component feeds the result into the canonical state
 * action (`applyTechCollectionState`) for persistence and into the presentation
 * components (`IslandTechCollectionModal`, `IslandTechCompletionCelebration`)
 * for animation. Reward authority stays in the canonical actions; this module
 * only computes the deltas.
 *
 * Persistence note: the resolved `nextCollectedSlots` / `nextRewardedLines`
 * arrays map directly onto the existing canonical ledgers
 * (`techCollectionByIsland` / `techCollectionRewardedLinesByIsland`), which are
 * already persisted by migration 0264. No new SQL column is required.
 */

export const TECH_COLLECTION_GRID_SIZE = 3;
export const TECH_COLLECTION_CELL_COUNT = TECH_COLLECTION_GRID_SIZE * TECH_COLLECTION_GRID_SIZE; // 9
export const TECH_COLLECTION_LINE_COUNT = 8;
export const TECH_COLLECTION_LINE_REWARD_DICE = 10;
export const TECH_COLLECTION_FULL_BOARD_REWARD_DICE = 100;

/**
 * The eight winning lines on a 3×3 grid (3 rows, 3 columns, 2 diagonals),
 * expressed as slot indices 0–8. Line index 0–7 is the ledger key persisted in
 * `techCollectionRewardedLinesByIsland` so a completed line never re-pays.
 */
export const TECH_COLLECTION_LINES: ReadonlyArray<readonly [number, number, number]> = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

export type TechCollectionTileType = 'currency' | 'chest' | 'micro' | 'card';

/**
 * Centralized technology-image asset path. The complete image is rendered into
 * every grid cell and positioned per-slot (see `techCollectionCellBackground`)
 * so the nine cells visually reassemble one coherent device. Replace this one
 * line when the final technology art lands — no other code needs to change.
 * Components must still render a graceful grid fallback if the asset fails.
 */
export const TECH_COLLECTION_IMAGE_SRC = '/assets/puzzle/island_001/tropical_island_puzzle_09_bottom_right.webp';

/** Row/column (0-based) for a slot index, used for image positioning. */
export function techCollectionRowCol(slotIndex: number): { row: number; column: number } {
  const idx = Math.max(0, Math.min(TECH_COLLECTION_CELL_COUNT - 1, Math.floor(slotIndex)));
  return {
    row: Math.floor(idx / TECH_COLLECTION_GRID_SIZE),
    column: idx % TECH_COLLECTION_GRID_SIZE,
  };
}

/**
 * CSS `background-position` (percentages) for a slot when the complete image is
 * drawn at `background-size: 300% 300%`. Slot 0 shows the top-left ninth, slot
 * 8 the bottom-right ninth, so the nine cells reassemble one image.
 */
export function techCollectionCellBackgroundPosition(slotIndex: number): { x: number; y: number } {
  const { row, column } = techCollectionRowCol(slotIndex);
  const denom = TECH_COLLECTION_GRID_SIZE - 1; // 2
  return {
    x: (column / denom) * 100,
    y: (row / denom) * 100,
  };
}

function normalizeIndexSet(values: Iterable<number>, maxExclusive: number): Set<number> {
  const out = new Set<number>();
  for (const raw of values) {
    const idx = Math.floor(raw);
    if (Number.isFinite(idx) && idx >= 0 && idx < maxExclusive) out.add(idx);
  }
  return out;
}

export interface TechCollectionResolveInput {
  /** Slot index (0–8) the landed tile maps to. */
  slotIndex: number;
  /** Slots already collected for this island before this pickup. */
  collectedSlots: Iterable<number>;
  /** Line indices (0–7) that have already paid a completion reward. */
  rewardedLines: Iterable<number>;
}

export interface TechCollectionResolution {
  slotIndex: number;
  /** True when the slot was already collected — caller should show no modal. */
  isDuplicate: boolean;
  previousCollectedCount: number;
  nextCollectedCount: number;
  /** Sorted, deduped collected slots after this pickup (for persistence/UI). */
  nextCollectedSlots: number[];
  /** Line indices newly completed by this pickup (not previously rewarded). */
  newlyCompletedLines: number[];
  /** Sorted, deduped rewarded-line ledger after this pickup (for persistence). */
  nextRewardedLines: number[];
  /** True only on the 8→9 transition (previous < 9 && next === 9). */
  isFullBoardNewlyCompleted: boolean;
  lineRewardDice: number;
  fullBoardRewardDice: number;
  totalRewardDice: number;
}

/**
 * Pure resolver for a single tech-component pickup. Idempotent on duplicates and
 * on an already-full grid: a duplicate returns `isDuplicate: true` with zero
 * reward and unchanged ledgers, and the full-board bonus only fires on the exact
 * 8→9 transition, so reloads / rapid repeated calls / rerenders can never replay
 * the +100 reward.
 */
export function resolveTechCollection(input: TechCollectionResolveInput): TechCollectionResolution {
  const slotIndex = Math.floor(input.slotIndex);
  const previousCollected = normalizeIndexSet(input.collectedSlots, TECH_COLLECTION_CELL_COUNT);
  const previousRewarded = normalizeIndexSet(input.rewardedLines, TECH_COLLECTION_LINE_COUNT);
  const previousCollectedCount = previousCollected.size;

  const slotInRange = Number.isFinite(slotIndex) && slotIndex >= 0 && slotIndex < TECH_COLLECTION_CELL_COUNT;
  const isDuplicate = !slotInRange || previousCollected.has(slotIndex);

  if (isDuplicate) {
    return {
      slotIndex,
      isDuplicate: true,
      previousCollectedCount,
      nextCollectedCount: previousCollectedCount,
      nextCollectedSlots: Array.from(previousCollected).sort((a, b) => a - b),
      newlyCompletedLines: [],
      nextRewardedLines: Array.from(previousRewarded).sort((a, b) => a - b),
      isFullBoardNewlyCompleted: false,
      lineRewardDice: 0,
      fullBoardRewardDice: 0,
      totalRewardDice: 0,
    };
  }

  const nextCollected = new Set(previousCollected);
  nextCollected.add(slotIndex);
  const nextCollectedCount = nextCollected.size;

  const newlyCompletedLines: number[] = [];
  const nextRewarded = new Set(previousRewarded);
  TECH_COLLECTION_LINES.forEach((line, lineIndex) => {
    if (previousRewarded.has(lineIndex)) return;
    if (line.every((cell) => nextCollected.has(cell))) {
      newlyCompletedLines.push(lineIndex);
      nextRewarded.add(lineIndex);
    }
  });

  const isFullBoardNewlyCompleted =
    previousCollectedCount < TECH_COLLECTION_CELL_COUNT && nextCollectedCount === TECH_COLLECTION_CELL_COUNT;

  const lineRewardDice = newlyCompletedLines.length * TECH_COLLECTION_LINE_REWARD_DICE;
  const fullBoardRewardDice = isFullBoardNewlyCompleted ? TECH_COLLECTION_FULL_BOARD_REWARD_DICE : 0;

  return {
    slotIndex,
    isDuplicate: false,
    previousCollectedCount,
    nextCollectedCount,
    nextCollectedSlots: Array.from(nextCollected).sort((a, b) => a - b),
    newlyCompletedLines,
    nextRewardedLines: Array.from(nextRewarded).sort((a, b) => a - b),
    isFullBoardNewlyCompleted,
    lineRewardDice,
    fullBoardRewardDice,
    totalRewardDice: lineRewardDice + fullBoardRewardDice,
  };
}
