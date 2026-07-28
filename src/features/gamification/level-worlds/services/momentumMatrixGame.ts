export const MOMENTUM_MATRIX_GRID_SIZE = 8;
export const MOMENTUM_MATRIX_CELL_COUNT = MOMENTUM_MATRIX_GRID_SIZE * MOMENTUM_MATRIX_GRID_SIZE;
export const MOMENTUM_MATRIX_RUN_TICKET_COST = 1;

export type MomentumMatrixRouteKind = 'focus' | 'growth' | 'care' | 'beacon';
export type MomentumMatrixCell = MomentumMatrixRouteKind | null;
export type MomentumMatrixRunStatus = 'active' | 'game_over';

export interface MomentumMatrixShape {
  id: string;
  label: string;
  cells: ReadonlyArray<readonly [number, number]>;
}

export interface MomentumMatrixTrayPiece {
  pieceId: string;
  shapeId: string;
  routeKind: MomentumMatrixRouteKind;
}

export interface MomentumMatrixSavedRun {
  version: 1;
  runId: string;
  board: MomentumMatrixCell[];
  tray: Array<MomentumMatrixTrayPiece | null>;
  rngState: number;
  score: number;
  combo: number;
  bestCombo: number;
  corridorsStabilized: number;
  beaconsAligned: number;
  beaconIndex: number;
  missionDirection: MomentumMatrixMissionDirection;
  status: MomentumMatrixRunStatus;
  startedAtMs: number;
  updatedAtMs: number;
}

export type MomentumMatrixMissionDirection = 'focus' | 'energy' | 'reset';

export interface MomentumMatrixProgressEntry {
  activeRun: MomentumMatrixSavedRun | null;
  bestScore: number;
  totalScore: number;
  corridorsStabilized: number;
  beaconsAligned: number;
  runsStarted: number;
  runsCompleted: number;
  updatedAtMs: number;
}

export interface MomentumMatrixPlacementResult {
  ok: boolean;
  run: MomentumMatrixSavedRun;
  placedCellIndexes: number[];
  clearedCellIndexes: number[];
  completedRows: number[];
  completedColumns: number[];
  scoreGained: number;
  beaconAligned: boolean;
  trayRefreshed: boolean;
  gameOver: boolean;
  failureReason?: 'run_complete' | 'piece_missing' | 'shape_missing' | 'out_of_bounds' | 'occupied';
}

export const MOMENTUM_MATRIX_SHAPES: readonly MomentumMatrixShape[] = [
  { id: 'spark', label: 'Spark', cells: [[0, 0]] },
  { id: 'vector_2', label: 'Short vector', cells: [[0, 0], [0, 1]] },
  { id: 'vector_3', label: 'Long vector', cells: [[0, 0], [0, 1], [0, 2]] },
  { id: 'drop_3', label: 'Drop vector', cells: [[0, 0], [1, 0], [2, 0]] },
  { id: 'corner_3', label: 'Corner', cells: [[0, 0], [1, 0], [1, 1]] },
  { id: 'square_4', label: 'Navigation square', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
  { id: 'turn_4', label: 'Wide turn', cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
  { id: 'zig_4', label: 'Signal zig', cells: [[0, 0], [0, 1], [1, 1], [1, 2]] },
  { id: 'tee_4', label: 'Course fork', cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
  { id: 'beam_4', label: 'Stable beam', cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
] as const;

const ROUTE_KINDS: readonly MomentumMatrixRouteKind[] = ['focus', 'growth', 'care', 'beacon'];

function normalizeSeed(seed: number): number {
  const safe = Number.isFinite(seed) ? Math.abs(Math.floor(seed)) : 1;
  return (safe % 2147483646) + 1;
}

export function stepMomentumMatrixRng(state: number): { state: number; value: number } {
  const next = (normalizeSeed(state) * 48271) % 2147483647;
  return { state: next, value: (next - 1) / 2147483646 };
}

function rollIndex(state: number, length: number): { state: number; index: number } {
  const next = stepMomentumMatrixRng(state);
  return {
    state: next.state,
    index: Math.min(Math.max(0, length - 1), Math.floor(next.value * Math.max(1, length))),
  };
}

export function getMomentumMatrixShape(shapeId: string): MomentumMatrixShape | null {
  return MOMENTUM_MATRIX_SHAPES.find((shape) => shape.id === shapeId) ?? null;
}

export function createEmptyMomentumMatrixBoard(): MomentumMatrixCell[] {
  return Array.from({ length: MOMENTUM_MATRIX_CELL_COUNT }, () => null);
}

export function getMomentumMatrixPlacementCells(
  shape: MomentumMatrixShape,
  row: number,
  column: number,
): number[] | null {
  const cells: number[] = [];
  for (const [rowOffset, columnOffset] of shape.cells) {
    const nextRow = row + rowOffset;
    const nextColumn = column + columnOffset;
    if (
      nextRow < 0
      || nextRow >= MOMENTUM_MATRIX_GRID_SIZE
      || nextColumn < 0
      || nextColumn >= MOMENTUM_MATRIX_GRID_SIZE
    ) {
      return null;
    }
    cells.push((nextRow * MOMENTUM_MATRIX_GRID_SIZE) + nextColumn);
  }
  return cells;
}

export function canPlaceMomentumMatrixShape(
  board: readonly MomentumMatrixCell[],
  shape: MomentumMatrixShape,
  row: number,
  column: number,
): boolean {
  const cells = getMomentumMatrixPlacementCells(shape, row, column);
  return Boolean(cells && cells.every((cellIndex) => board[cellIndex] == null));
}

export function canPlaceMomentumMatrixShapeAnywhere(
  board: readonly MomentumMatrixCell[],
  shape: MomentumMatrixShape,
): boolean {
  for (let row = 0; row < MOMENTUM_MATRIX_GRID_SIZE; row += 1) {
    for (let column = 0; column < MOMENTUM_MATRIX_GRID_SIZE; column += 1) {
      if (canPlaceMomentumMatrixShape(board, shape, row, column)) return true;
    }
  }
  return false;
}

export function isMomentumMatrixRunStuck(
  board: readonly MomentumMatrixCell[],
  tray: ReadonlyArray<MomentumMatrixTrayPiece | null>,
): boolean {
  const availablePieces = tray.filter((piece): piece is MomentumMatrixTrayPiece => piece !== null);
  if (availablePieces.length === 0) return false;
  return availablePieces.every((piece) => {
    const shape = getMomentumMatrixShape(piece.shapeId);
    return !shape || !canPlaceMomentumMatrixShapeAnywhere(board, shape);
  });
}

function rollMomentumMatrixTray(
  rngState: number,
  board: readonly MomentumMatrixCell[],
): { tray: MomentumMatrixTrayPiece[]; rngState: number } {
  let state = normalizeSeed(rngState);
  const tray: MomentumMatrixTrayPiece[] = [];
  const placeableShapeIds = MOMENTUM_MATRIX_SHAPES
    .filter((shape) => canPlaceMomentumMatrixShapeAnywhere(board, shape))
    .map((shape) => shape.id);

  for (let slot = 0; slot < 3; slot += 1) {
    const shapePool = slot === 0 && placeableShapeIds.length > 0
      ? placeableShapeIds
      : MOMENTUM_MATRIX_SHAPES.map((shape) => shape.id);
    const shapeRoll = rollIndex(state, shapePool.length);
    state = shapeRoll.state;
    const kindRoll = rollIndex(state, ROUTE_KINDS.length);
    state = kindRoll.state;
    tray.push({
      pieceId: `${state.toString(36)}-${slot}`,
      shapeId: shapePool[shapeRoll.index] ?? 'spark',
      routeKind: ROUTE_KINDS[kindRoll.index] ?? 'focus',
    });
  }
  return { tray, rngState: state };
}

function chooseBeaconIndex(rngState: number, board: readonly MomentumMatrixCell[]): { index: number; rngState: number } {
  const preferred = [27, 28, 35, 36, 19, 20, 43, 44].filter((index) => board[index] == null);
  const fallback = board
    .map((cell, index) => (cell == null ? index : -1))
    .filter((index) => index >= 0);
  const pool = preferred.length > 0 ? preferred : fallback;
  if (pool.length === 0) return { index: 27, rngState };
  const rolled = rollIndex(rngState, pool.length);
  return { index: pool[rolled.index] ?? 27, rngState: rolled.state };
}

export function createMomentumMatrixRun(options: {
  seed: number;
  runId: string;
  missionDirection: MomentumMatrixMissionDirection;
  nowMs: number;
}): MomentumMatrixSavedRun {
  const board = createEmptyMomentumMatrixBoard();
  const beacon = chooseBeaconIndex(options.seed, board);
  const rolled = rollMomentumMatrixTray(beacon.rngState, board);
  return {
    version: 1,
    runId: options.runId,
    board,
    tray: rolled.tray,
    rngState: rolled.rngState,
    score: 0,
    combo: 0,
    bestCombo: 0,
    corridorsStabilized: 0,
    beaconsAligned: 0,
    beaconIndex: beacon.index,
    missionDirection: options.missionDirection,
    status: 'active',
    startedAtMs: options.nowMs,
    updatedAtMs: options.nowMs,
  };
}

function findCompletedCorridors(board: readonly MomentumMatrixCell[]): { rows: number[]; columns: number[] } {
  const rows: number[] = [];
  const columns: number[] = [];
  for (let index = 0; index < MOMENTUM_MATRIX_GRID_SIZE; index += 1) {
    const rowComplete = Array.from(
      { length: MOMENTUM_MATRIX_GRID_SIZE },
      (_, column) => board[(index * MOMENTUM_MATRIX_GRID_SIZE) + column],
    ).every((cell) => cell !== null);
    if (rowComplete) rows.push(index);

    const columnComplete = Array.from(
      { length: MOMENTUM_MATRIX_GRID_SIZE },
      (_, row) => board[(row * MOMENTUM_MATRIX_GRID_SIZE) + index],
    ).every((cell) => cell !== null);
    if (columnComplete) columns.push(index);
  }
  return { rows, columns };
}

export function placeMomentumMatrixPiece(options: {
  run: MomentumMatrixSavedRun;
  trayIndex: number;
  row: number;
  column: number;
  nowMs: number;
}): MomentumMatrixPlacementResult {
  const { run } = options;
  const fail = (
    failureReason: MomentumMatrixPlacementResult['failureReason'],
  ): MomentumMatrixPlacementResult => ({
    ok: false,
    run,
    placedCellIndexes: [],
    clearedCellIndexes: [],
    completedRows: [],
    completedColumns: [],
    scoreGained: 0,
    beaconAligned: false,
    trayRefreshed: false,
    gameOver: run.status === 'game_over',
    failureReason,
  });
  if (run.status !== 'active') return fail('run_complete');
  const piece = run.tray[options.trayIndex];
  if (!piece) return fail('piece_missing');
  const shape = getMomentumMatrixShape(piece.shapeId);
  if (!shape) return fail('shape_missing');
  const placedCellIndexes = getMomentumMatrixPlacementCells(shape, options.row, options.column);
  if (!placedCellIndexes) return fail('out_of_bounds');
  if (placedCellIndexes.some((cellIndex) => run.board[cellIndex] !== null)) return fail('occupied');

  const board = [...run.board];
  placedCellIndexes.forEach((cellIndex) => {
    board[cellIndex] = piece.routeKind;
  });
  const completed = findCompletedCorridors(board);
  const clearedCellIndexes = Array.from(new Set([
    ...completed.rows.flatMap((row) => Array.from(
      { length: MOMENTUM_MATRIX_GRID_SIZE },
      (_, column) => (row * MOMENTUM_MATRIX_GRID_SIZE) + column,
    )),
    ...completed.columns.flatMap((column) => Array.from(
      { length: MOMENTUM_MATRIX_GRID_SIZE },
      (_, row) => (row * MOMENTUM_MATRIX_GRID_SIZE) + column,
    )),
  ])).sort((a, b) => a - b);
  const beaconAligned = placedCellIndexes.includes(run.beaconIndex) || clearedCellIndexes.includes(run.beaconIndex);
  clearedCellIndexes.forEach((cellIndex) => {
    board[cellIndex] = null;
  });

  const corridors = completed.rows.length + completed.columns.length;
  const combo = corridors > 0 ? run.combo + 1 : 0;
  const scoreGained = (placedCellIndexes.length * 10)
    + (corridors * corridors * 120)
    + (corridors > 0 ? combo * 30 : 0)
    + (beaconAligned ? 250 : 0);
  let rngState = run.rngState;
  let beaconIndex = run.beaconIndex;
  if (beaconAligned) {
    const nextBeacon = chooseBeaconIndex(rngState, board);
    beaconIndex = nextBeacon.index;
    rngState = nextBeacon.rngState;
  }

  let tray = run.tray.map((trayPiece, index) => (index === options.trayIndex ? null : trayPiece));
  let trayRefreshed = false;
  if (tray.every((trayPiece) => trayPiece === null)) {
    const rolled = rollMomentumMatrixTray(rngState, board);
    tray = rolled.tray;
    rngState = rolled.rngState;
    trayRefreshed = true;
  }
  const gameOver = isMomentumMatrixRunStuck(board, tray);
  const nextRun: MomentumMatrixSavedRun = {
    ...run,
    board,
    tray,
    rngState,
    score: run.score + scoreGained,
    combo,
    bestCombo: Math.max(run.bestCombo, combo),
    corridorsStabilized: run.corridorsStabilized + corridors,
    beaconsAligned: run.beaconsAligned + (beaconAligned ? 1 : 0),
    beaconIndex,
    status: gameOver ? 'game_over' : 'active',
    updatedAtMs: options.nowMs,
  };
  return {
    ok: true,
    run: nextRun,
    placedCellIndexes,
    clearedCellIndexes,
    completedRows: completed.rows,
    completedColumns: completed.columns,
    scoreGained,
    beaconAligned,
    trayRefreshed,
    gameOver,
  };
}

export function createEmptyMomentumMatrixProgress(nowMs = 0): MomentumMatrixProgressEntry {
  return {
    activeRun: null,
    bestScore: 0,
    totalScore: 0,
    corridorsStabilized: 0,
    beaconsAligned: 0,
    runsStarted: 0,
    runsCompleted: 0,
    updatedAtMs: nowMs,
  };
}

export function settleMomentumMatrixRun(
  progress: MomentumMatrixProgressEntry,
  run: MomentumMatrixSavedRun,
  nowMs: number,
): MomentumMatrixProgressEntry {
  if (run.status !== 'game_over') {
    return { ...progress, activeRun: run, updatedAtMs: nowMs };
  }
  const alreadySettled = progress.activeRun?.runId === run.runId
    && progress.activeRun.status === 'game_over';
  if (alreadySettled) return { ...progress, activeRun: run, updatedAtMs: nowMs };
  return {
    ...progress,
    activeRun: run,
    bestScore: Math.max(progress.bestScore, run.score),
    totalScore: progress.totalScore + run.score,
    corridorsStabilized: progress.corridorsStabilized + run.corridorsStabilized,
    beaconsAligned: progress.beaconsAligned + run.beaconsAligned,
    runsCompleted: progress.runsCompleted + 1,
    updatedAtMs: nowMs,
  };
}
