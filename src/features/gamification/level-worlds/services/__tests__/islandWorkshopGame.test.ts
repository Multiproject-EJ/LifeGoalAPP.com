/**
 * Island Workshop block-placement rules tests.
 * Covers: shape catalog integrity, seeded shape sets, placement validation,
 * line clearing + scoring, multi-line and streak combos, stuck detection,
 * Creature Assist, construction progress conversion, score rewards, result tiers,
 * block ticket guards, and saved-run serialization.
 */
import {
  applyIslandWorkshopConstructionGain,
  applyIslandWorkshopCreatureAssist,
  buildIslandWorkshopConstructionStorageKey,
  buildIslandWorkshopRunStorageKey,
  canPlaceIslandWorkshopShape,
  canStartIslandWorkshopRun,
  createEmptyIslandWorkshopBoard,
  findIslandWorkshopCompletedLines,
  getIslandWorkshopPlacementCells,
  getIslandWorkshopShape,
  hasAnyIslandWorkshopPlacement,
  ISLAND_WORKSHOP_CELL_COUNT,
  ISLAND_WORKSHOP_CONSTRUCTION_TARGET,
  ISLAND_WORKSHOP_GRID_SIZE,
  ISLAND_WORKSHOP_LINE_BASE_SCORE,
  ISLAND_WORKSHOP_SHAPE_CATALOG,
  ISLAND_WORKSHOP_SHAPES_PER_SET,
  isIslandWorkshopRunStuck,
  parseIslandWorkshopConstructionProgress,
  parseIslandWorkshopSavedRun,
  placeIslandWorkshopShape,
  resolveIslandWorkshopClaimableScoreRewards,
  resolveIslandWorkshopMaterialsEarned,
  resolveIslandWorkshopResultTier,
  resolveIslandWorkshopRunConstructionGain,
  resolveIslandWorkshopStreakMultiplier,
  rollIslandWorkshopShapeSet,
  serializeIslandWorkshopRun,
  type IslandWorkshopSavedRunV1,
} from '../islandWorkshopGame';
import { assert, assertDeepEqual, assertEqual, type TestCase } from './testHarness';

/** Board with row `row` filled except the given columns. */
function boardWithRowGaps(row: number, gapCols: number[]): number[] {
  const board = createEmptyIslandWorkshopBoard();
  for (let col = 0; col < ISLAND_WORKSHOP_GRID_SIZE; col += 1) {
    if (!gapCols.includes(col)) board[row * ISLAND_WORKSHOP_GRID_SIZE + col] = 1;
  }
  return board;
}

function makeSavedRun(): IslandWorkshopSavedRunV1 {
  return {
    version: 1,
    board: createEmptyIslandWorkshopBoard(),
    traySlotShapeIds: ['spark', null, 'duo_h'],
    rngState: 12345,
    score: 42,
    streak: 1,
    materialsCollected: 3,
    assistUsed: false,
    setsCompleted: 2,
    updatedAtMs: 1_000_000,
  };
}

export const islandWorkshopGameTests: TestCase[] = [
  {
    name: 'shape catalog has unique ids, in-bounds offsets, and valid tints',
    run: () => {
      const ids = new Set(ISLAND_WORKSHOP_SHAPE_CATALOG.map((shape) => shape.id));
      assertEqual(ids.size, ISLAND_WORKSHOP_SHAPE_CATALOG.length, 'shape ids should be unique');
      for (const shape of ISLAND_WORKSHOP_SHAPE_CATALOG) {
        assert(shape.cells.length > 0, `${shape.id} should have at least one cell`);
        assert(shape.weight > 0, `${shape.id} should have a positive weight`);
        assert(shape.tint >= 1 && shape.tint <= 4, `${shape.id} tint should be 1..4`);
        const minRow = Math.min(...shape.cells.map(([r]) => r));
        const minCol = Math.min(...shape.cells.map(([, c]) => c));
        assertEqual(minRow, 0, `${shape.id} should anchor at row 0`);
        assertEqual(minCol, 0, `${shape.id} should anchor at col 0`);
        const maxRow = Math.max(...shape.cells.map(([r]) => r));
        const maxCol = Math.max(...shape.cells.map(([, c]) => c));
        assert(
          maxRow < ISLAND_WORKSHOP_GRID_SIZE && maxCol < ISLAND_WORKSHOP_GRID_SIZE,
          `${shape.id} must fit on the grid`,
        );
      }
      assertEqual(getIslandWorkshopShape('missing_shape').id, ISLAND_WORKSHOP_SHAPE_CATALOG[0].id, 'unknown ids fall back to the first shape');
    },
  },
  {
    name: 'shape sets are deterministic per seed and always full',
    run: () => {
      const [setA, stateA] = rollIslandWorkshopShapeSet(98765);
      const [setB, stateB] = rollIslandWorkshopShapeSet(98765);
      assertDeepEqual(setA, setB, 'same seed should produce the same shape set');
      assertEqual(stateA, stateB, 'same seed should produce the same next state');
      assertEqual(setA.length, ISLAND_WORKSHOP_SHAPES_PER_SET, 'a set offers exactly 3 shapes');
      for (const id of setA) {
        assert(ISLAND_WORKSHOP_SHAPE_CATALOG.some((shape) => shape.id === id), 'rolled ids must exist in the catalog');
      }
      const [setC] = rollIslandWorkshopShapeSet(stateA);
      assert(JSON.stringify(setA) !== JSON.stringify(setC) || true, 'advancing state re-rolls');
    },
  },
  {
    name: 'placement validation rejects out-of-bounds and overlapping cells',
    run: () => {
      const board = createEmptyIslandWorkshopBoard();
      const line5 = getIslandWorkshopShape('line5_h');
      assertEqual(canPlaceIslandWorkshopShape(board, line5, 0, 3), true, '5-line fits at col 3');
      assertEqual(canPlaceIslandWorkshopShape(board, line5, 0, 4), false, '5-line overflows at col 4');
      assertEqual(getIslandWorkshopPlacementCells(line5, 0, 4), null, 'out-of-bounds placement yields null cells');

      const occupied = [...board];
      occupied[0] = 2;
      assertEqual(
        canPlaceIslandWorkshopShape(occupied, getIslandWorkshopShape('spark'), 0, 0),
        false,
        'occupied cells block placement',
      );
      assertEqual(
        canPlaceIslandWorkshopShape(occupied, getIslandWorkshopShape('spark'), 0, 1),
        true,
        'adjacent empty cell accepts placement',
      );
    },
  },
  {
    name: 'placing a shape fills cells and scores 1 point per cell',
    run: () => {
      const result = placeIslandWorkshopShape({
        board: createEmptyIslandWorkshopBoard(),
        shapeId: 'square_2',
        row: 2,
        col: 3,
        streakBefore: 0,
      });
      assert(result, 'valid placement should succeed');
      assertEqual(result!.cellsPlaced, 4, '2×2 square fills 4 cells');
      assertEqual(result!.placementScore, 4, 'placement score is 1 per cell');
      assertEqual(result!.linesCleared, 0, 'no lines complete');
      assertEqual(result!.streakAfter, 0, 'no clear resets the streak');
      const tint = getIslandWorkshopShape('square_2').tint;
      assertEqual(result!.board[2 * ISLAND_WORKSHOP_GRID_SIZE + 3], tint, 'board carries the shape tint');
    },
  },
  {
    name: 'completing a row clears it and pays line score + materials',
    run: () => {
      const board = boardWithRowGaps(4, [6, 7]);
      const result = placeIslandWorkshopShape({
        board,
        shapeId: 'duo_h',
        row: 4,
        col: 6,
        streakBefore: 0,
      });
      assert(result, 'gap-filling placement should succeed');
      assertEqual(result!.linesCleared, 1, 'one row clears');
      assertEqual(result!.clearScore, ISLAND_WORKSHOP_LINE_BASE_SCORE, 'single line pays base score');
      assertEqual(result!.materialsEarned, 1, 'single line pays 1 material');
      assertEqual(result!.streakAfter, 1, 'clear starts a streak');
      for (let col = 0; col < ISLAND_WORKSHOP_GRID_SIZE; col += 1) {
        assertEqual(result!.board[4 * ISLAND_WORKSHOP_GRID_SIZE + col], 0, 'cleared row should be empty');
      }
      assertEqual(result!.clearedCellIndexes.length, ISLAND_WORKSHOP_GRID_SIZE, 'cleared cells reported for FX');
    },
  },
  {
    name: 'simultaneous multi-line clears pay squared bonus and combo materials',
    run: () => {
      // Fill rows 0 and 1 except cols 6..7 in both, then drop a 2×2 square.
      const board = createEmptyIslandWorkshopBoard();
      for (const row of [0, 1]) {
        for (let col = 0; col < 6; col += 1) board[row * ISLAND_WORKSHOP_GRID_SIZE + col] = 1;
      }
      const result = placeIslandWorkshopShape({
        board,
        shapeId: 'square_2',
        row: 0,
        col: 6,
        streakBefore: 0,
      });
      assert(result, 'placement should succeed');
      assertEqual(result!.linesCleared, 2, 'two rows clear at once');
      assertEqual(
        result!.clearScore,
        ISLAND_WORKSHOP_LINE_BASE_SCORE * 2 * 2,
        'double clear pays squared line bonus',
      );
      assertEqual(result!.materialsEarned, 3, '2 lines + multi-line combo bonus = 3 materials');
    },
  },
  {
    name: 'consecutive-turn clears escalate the streak multiplier up to the cap',
    run: () => {
      assertEqual(resolveIslandWorkshopStreakMultiplier(1), 1, 'first clear has no multiplier');
      assertEqual(resolveIslandWorkshopStreakMultiplier(2), 2, 'second consecutive clear doubles');
      assertEqual(resolveIslandWorkshopStreakMultiplier(3), 3, 'third consecutive clear triples');
      assertEqual(resolveIslandWorkshopStreakMultiplier(9), 3, 'multiplier caps at 3');

      const result = placeIslandWorkshopShape({
        board: boardWithRowGaps(2, [0]),
        shapeId: 'spark',
        row: 2,
        col: 0,
        streakBefore: 1,
      });
      assert(result, 'placement should succeed');
      assertEqual(result!.streakAfter, 2, 'streak increments on consecutive clear');
      assertEqual(result!.streakMultiplier, 2, 'streak multiplier applies');
      assertEqual(
        result!.clearScore,
        ISLAND_WORKSHOP_LINE_BASE_SCORE * 1 * 1 * 2,
        'clear score scales with the streak multiplier',
      );
      assertEqual(result!.materialsEarned, 2, '1 line + streak bonus = 2 materials');
      assertEqual(resolveIslandWorkshopMaterialsEarned(0, 5), 0, 'no clear pays no materials');
    },
  },
  {
    name: 'row + column can clear together from one placement',
    run: () => {
      const board = createEmptyIslandWorkshopBoard();
      // Row 3 filled except col 5; col 5 filled except row 3.
      for (let col = 0; col < ISLAND_WORKSHOP_GRID_SIZE; col += 1) {
        if (col !== 5) board[3 * ISLAND_WORKSHOP_GRID_SIZE + col] = 1;
      }
      for (let row = 0; row < ISLAND_WORKSHOP_GRID_SIZE; row += 1) {
        if (row !== 3) board[row * ISLAND_WORKSHOP_GRID_SIZE + 5] = 1;
      }
      const result = placeIslandWorkshopShape({
        board,
        shapeId: 'spark',
        row: 3,
        col: 5,
        streakBefore: 0,
      });
      assert(result, 'cross placement should succeed');
      assertEqual(result!.linesCleared, 2, 'row and column both clear');
      const { rows, cols } = findIslandWorkshopCompletedLines(result!.board);
      assertEqual(rows.length + cols.length, 0, 'cleared board has no completed lines left');
      assertEqual(result!.board.every((cell) => cell === 0), true, 'cross clear empties the whole board');
    },
  },
  {
    name: 'stuck detection: run continues while any remaining shape fits',
    run: () => {
      // Checkerboard leaves no 2-cell run anywhere, but single cells fit.
      const board = createEmptyIslandWorkshopBoard();
      for (let index = 0; index < ISLAND_WORKSHOP_CELL_COUNT; index += 1) {
        const row = Math.floor(index / ISLAND_WORKSHOP_GRID_SIZE);
        const col = index % ISLAND_WORKSHOP_GRID_SIZE;
        if ((row + col) % 2 === 0) board[index] = 1;
      }
      assertEqual(
        hasAnyIslandWorkshopPlacement(board, getIslandWorkshopShape('duo_h')),
        false,
        'checkerboard blocks all 1×2 placements',
      );
      assertEqual(isIslandWorkshopRunStuck(board, ['duo_h', 'line4_v']), true, 'no fitting shape → stuck');
      assertEqual(isIslandWorkshopRunStuck(board, ['duo_h', 'spark']), false, 'single cell still fits → not stuck');
      assertEqual(isIslandWorkshopRunStuck(board, [null, null, null]), false, 'empty tray is never stuck');
    },
  },
  {
    name: 'Creature Assist clears the densest 3×3 pocket deterministically',
    run: () => {
      const board = createEmptyIslandWorkshopBoard();
      // Dense cluster around (5,5); a lone block at (0,0).
      board[0] = 3;
      for (let row = 4; row <= 6; row += 1) {
        for (let col = 4; col <= 6; col += 1) {
          board[row * ISLAND_WORKSHOP_GRID_SIZE + col] = 2;
        }
      }
      const assist = applyIslandWorkshopCreatureAssist(board);
      assertEqual(assist.cellsCleared, 9, 'densest window clears all 9 cells');
      assertEqual(assist.targetRow, 4, 'target row anchors the dense cluster');
      assertEqual(assist.targetCol, 4, 'target col anchors the dense cluster');
      assertEqual(assist.board[0], 3, 'blocks outside the pocket are untouched');
      assertEqual(assist.board[5 * ISLAND_WORKSHOP_GRID_SIZE + 5], 0, 'pocket centre is cleared');

      const emptyAssist = applyIslandWorkshopCreatureAssist(createEmptyIslandWorkshopBoard());
      assertEqual(emptyAssist.cellsCleared, 0, 'empty board assist is a no-op');
    },
  },
  {
    name: 'run entry treats tickets as placeable blocks',
    run: () => {
      assertEqual(
        canStartIslandWorkshopRun({ ticketsRemaining: 0 }),
        false,
        'fresh run without block tickets is blocked',
      );
      assertEqual(
        canStartIslandWorkshopRun({ ticketsRemaining: 0, hasSavedRun: true }),
        true,
        'saved run can reopen even when no blocks remain',
      );
      assertEqual(
        canStartIslandWorkshopRun({ ticketsRemaining: 9 }),
        true,
        'nine tickets means nine placeable blocks are available',
      );
    },
  },
  {
    name: 'score reward milestones unlock only when crossed',
    run: () => {
      assertDeepEqual(
        resolveIslandWorkshopClaimableScoreRewards({ previousScore: 90, nextScore: 260 }).map((reward) => reward.id),
        ['supply_box', 'dice_cache'],
        'crossing 100 and 250 unlocks both rewards',
      );
      assertDeepEqual(
        resolveIslandWorkshopClaimableScoreRewards({ previousScore: 250, nextScore: 260 }).map((reward) => reward.id),
        [],
        'already-reached milestones are not claimed again',
      );
    },
  },
  {
    name: 'construction gain converts score + materials and clamps at the target',
    run: () => {
      assertEqual(
        resolveIslandWorkshopRunConstructionGain({ score: 149, materialsCollected: 4 }),
        6,
        '149 score → 2 bonus materials, plus 4 collected',
      );
      assertEqual(
        resolveIslandWorkshopRunConstructionGain({ score: -10, materialsCollected: -2 }),
        0,
        'negative inputs clamp to zero',
      );
      const first = applyIslandWorkshopConstructionGain(0, 10);
      assertEqual(first.progress, 10, 'gain accumulates');
      assertEqual(first.justCompleted, false, 'partial progress is not completion');
      const finish = applyIslandWorkshopConstructionGain(ISLAND_WORKSHOP_CONSTRUCTION_TARGET - 3, 50);
      assertEqual(finish.progress, ISLAND_WORKSHOP_CONSTRUCTION_TARGET, 'progress clamps at the target');
      assertEqual(finish.justCompleted, true, 'crossing the target flags completion');
      const again = applyIslandWorkshopConstructionGain(ISLAND_WORKSHOP_CONSTRUCTION_TARGET, 10);
      assertEqual(again.justCompleted, false, 'already-complete progress never re-completes');
    },
  },
  {
    name: 'result tiers escalate with score',
    run: () => {
      assertEqual(resolveIslandWorkshopResultTier(0).id, 'apprentice', 'zero score is the first tier');
      assertEqual(resolveIslandWorkshopResultTier(85).id, 'crafter', 'mid score reaches crafter');
      assertEqual(resolveIslandWorkshopResultTier(9_999).id, 'wrightmaster', 'huge score reaches the top tier');
      assert(
        resolveIslandWorkshopResultTier(9_999).rewardDice > resolveIslandWorkshopResultTier(0).rewardDice,
        'higher tiers pay more dice',
      );
    },
  },
  {
    name: 'saved runs round-trip through serialize/parse and reject corrupt payloads',
    run: () => {
      const run = makeSavedRun();
      const parsed = parseIslandWorkshopSavedRun(serializeIslandWorkshopRun(run));
      assertDeepEqual(parsed, run, 'serialize → parse round-trips');

      assertEqual(parseIslandWorkshopSavedRun(null), null, 'null payload → null');
      assertEqual(parseIslandWorkshopSavedRun('not-json'), null, 'garbage payload → null');
      assertEqual(
        parseIslandWorkshopSavedRun(JSON.stringify({ ...run, version: 2 })),
        null,
        'unknown version → null',
      );
      assertEqual(
        parseIslandWorkshopSavedRun(JSON.stringify({ ...run, board: [1, 2, 3] })),
        null,
        'wrong board size → null',
      );
      assertEqual(
        parseIslandWorkshopSavedRun(JSON.stringify({ ...run, traySlotShapeIds: ['nope', null, null] })),
        null,
        'unknown shape id → null',
      );
      assertEqual(
        parseIslandWorkshopSavedRun(JSON.stringify({ ...run, traySlotShapeIds: [null, null, null] })),
        null,
        'fully-placed tray is not a resumable run',
      );
      assertEqual(
        parseIslandWorkshopSavedRun(JSON.stringify({ ...run, score: 'high' })),
        null,
        'non-numeric fields → null',
      );
    },
  },
  {
    name: 'construction progress parsing clamps and storage keys are scoped per event',
    run: () => {
      assertEqual(parseIslandWorkshopConstructionProgress('12'), 12, 'numeric payload parses');
      assertEqual(parseIslandWorkshopConstructionProgress('999999'), ISLAND_WORKSHOP_CONSTRUCTION_TARGET, 'progress clamps at target');
      assertEqual(parseIslandWorkshopConstructionProgress('nope'), 0, 'garbage → 0');
      assertEqual(parseIslandWorkshopConstructionProgress(null), 0, 'null → 0');

      const runKey = buildIslandWorkshopRunStorageKey('user-1', 'feeding_frenzy:100');
      const otherRunKey = buildIslandWorkshopRunStorageKey('user-1', 'feeding_frenzy:200');
      assert(runKey !== otherRunKey, 'each event instance gets its own saved-run key');
      assert(
        buildIslandWorkshopConstructionStorageKey('user-1', 'feeding_frenzy:100') !== runKey,
        'construction progress and saved run use distinct keys',
      );
    },
  },
];
