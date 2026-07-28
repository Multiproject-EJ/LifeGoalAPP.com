import {
  MOMENTUM_MATRIX_CELL_COUNT,
  MOMENTUM_MATRIX_GRID_SIZE,
  canPlaceMomentumMatrixShapeAnywhere,
  createEmptyMomentumMatrixBoard,
  createEmptyMomentumMatrixProgress,
  createMomentumMatrixRun,
  getMomentumMatrixShape,
  placeMomentumMatrixPiece,
  settleMomentumMatrixRun,
} from '../momentumMatrixGame';

type TestCase = { name: string; run: () => void };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export const momentumMatrixGameTests: TestCase[] = [
  {
    name: 'creates a deterministic 8x8 resumable run',
    run: () => {
      const first = createMomentumMatrixRun({
        seed: 42,
        runId: 'run-1',
        missionDirection: 'focus',
        nowMs: 100,
      });
      const second = createMomentumMatrixRun({
        seed: 42,
        runId: 'run-1',
        missionDirection: 'focus',
        nowMs: 100,
      });
      assert(first.board.length === MOMENTUM_MATRIX_CELL_COUNT, 'board should contain 64 cells');
      assert(MOMENTUM_MATRIX_GRID_SIZE === 8, 'grid should remain 8x8');
      assert(JSON.stringify(first) === JSON.stringify(second), 'same seed should produce the same run');
      assert(first.tray.length === 3 && first.tray.every(Boolean), 'new run should offer three pieces');
    },
  },
  {
    name: 'rejects occupied and out-of-bounds placements without mutating the run',
    run: () => {
      const run = createMomentumMatrixRun({
        seed: 7,
        runId: 'run-2',
        missionDirection: 'energy',
        nowMs: 100,
      });
      run.tray[0] = { pieceId: 'beam', shapeId: 'beam_4', routeKind: 'focus' };
      const out = placeMomentumMatrixPiece({ run, trayIndex: 0, row: 0, column: 6, nowMs: 200 });
      assert(!out.ok && out.failureReason === 'out_of_bounds', 'beam should not overflow the grid');
      const occupiedRun = { ...run, board: [...run.board] };
      occupiedRun.board[0] = 'care';
      const occupied = placeMomentumMatrixPiece({ run: occupiedRun, trayIndex: 0, row: 0, column: 0, nowMs: 200 });
      assert(!occupied.ok && occupied.failureReason === 'occupied', 'occupied cell should reject placement');
      assert(run.board[0] === null, 'original run must remain immutable');
    },
  },
  {
    name: 'stabilizes a full corridor, clears it, and awards combo score',
    run: () => {
      const run = createMomentumMatrixRun({
        seed: 9,
        runId: 'run-3',
        missionDirection: 'reset',
        nowMs: 100,
      });
      const board = [...run.board];
      for (let column = 0; column < 7; column += 1) board[column] = 'growth';
      const prepared = {
        ...run,
        board,
        beaconIndex: 7,
        tray: [
          { pieceId: 'spark', shapeId: 'spark', routeKind: 'beacon' as const },
          run.tray[1],
          run.tray[2],
        ],
      };
      const result = placeMomentumMatrixPiece({
        run: prepared,
        trayIndex: 0,
        row: 0,
        column: 7,
        nowMs: 200,
      });
      assert(result.ok, 'placement should succeed');
      assert(result.completedRows.join(',') === '0', 'first row should stabilize');
      assert(result.clearedCellIndexes.length === 8, 'all row cells should clear');
      assert(result.beaconAligned, 'corridor through the mission beacon should align it');
      assert(result.run.score >= 400, 'corridor and beacon should pay a meaningful score');
      assert(result.run.board.slice(0, 8).every((cell) => cell === null), 'stabilized row should be empty');
    },
  },
  {
    name: 'detects whether a route fragment can fit anywhere',
    run: () => {
      const board = createEmptyMomentumMatrixBoard();
      const beam = getMomentumMatrixShape('beam_4');
      assert(beam, 'beam shape should exist');
      assert(canPlaceMomentumMatrixShapeAnywhere(board, beam), 'beam should fit on an empty board');
      const blocked = board.map(() => 'focus' as const);
      assert(!canPlaceMomentumMatrixShapeAnywhere(blocked, beam), 'beam should not fit on a full board');
    },
  },
  {
    name: 'settles a completed run exactly once',
    run: () => {
      const progress = createEmptyMomentumMatrixProgress(0);
      const run = {
        ...createMomentumMatrixRun({
          seed: 12,
          runId: 'run-4',
          missionDirection: 'focus',
          nowMs: 100,
        }),
        score: 900,
        corridorsStabilized: 4,
        beaconsAligned: 2,
        status: 'game_over' as const,
      };
      const first = settleMomentumMatrixRun(progress, run, 200);
      const second = settleMomentumMatrixRun(first, run, 300);
      assert(first.runsCompleted === 1, 'first settlement should count the run');
      assert(second.runsCompleted === 1, 'repeat settlement must be idempotent');
      assert(second.totalScore === 900, 'repeat settlement must not duplicate score');
    },
  },
];
