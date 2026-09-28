/**
 * Island 020 slide labyrinth: an island-only mini-game (never part of the
 * event mini-game rotation). Swipe a direction and the robot slides until it
 * hits a wall; stop on the hole to drop to the floor below. Three floors,
 * starting at the top; the lowest floor wraps the island's circular tile
 * board around its centre. After five tries on a floor the robot can scan
 * the floor (lidar, sonar, laser) and reveal the route.
 *
 * Pure presentation logic: no gameplay state, no rewards.
 */
export type LabyrinthDirection = 'up' | 'down' | 'left' | 'right';
export type LabyrinthCell = { row: number; col: number };

export interface LabyrinthFloor {
  id: 'top' | 'middle' | 'lowest';
  name: string;
  size: number;
  /** '#' wall, '.' floor. */
  rows: readonly string[];
  start: LabyrinthCell;
  exit: LabyrinthCell;
  /** Shortest solution length (verified by the solver in tests). */
  par: number;
}

/** Floors were searched with the BFS solver below and hand-picked. */
export const ISLAND_20_LABYRINTH_FLOORS: readonly LabyrinthFloor[] = Object.freeze([
  {
    id: 'top', name: 'Turret Floor', size: 5, par: 7,
    start: { row: 0, col: 0 }, exit: { row: 4, col: 4 },
    rows: [
      '..#..',
      '.#...',
      '...#.',
      '.....',
      '..#..',
    ],
  },
  {
    id: 'middle', name: 'Ember Halls', size: 7, par: 10,
    start: { row: 0, col: 3 }, exit: { row: 6, col: 1 },
    rows: [
      '.#..#..',
      '.......',
      '#.#..#.',
      '...#...',
      '.#...#.',
      '.......',
      '..#....',
    ],
  },
  {
    id: 'lowest', name: 'The Board Vault', size: 9, par: 14,
    start: { row: 0, col: 0 }, exit: { row: 4, col: 4 },
    rows: [
      '.#.#..##.',
      '.........',
      '.#..#....',
      '.#......#',
      '.....#...',
      '....#....',
      '#.......#',
      '.........',
      '..#...##.',
    ],
  },
]);

export const LABYRINTH_HELPER_TRIES = 5;
/** A floor attempt ends (and counts as a try) after this many moves over par. */
export const LABYRINTH_MOVE_BUDGET_FACTOR = 3;

const STEPS: Record<LabyrinthDirection, [number, number]> = {
  up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1],
};
const DIRECTIONS: readonly LabyrinthDirection[] = ['up', 'down', 'left', 'right'];

export function isLabyrinthWall(floor: LabyrinthFloor, cell: LabyrinthCell): boolean {
  if (cell.row < 0 || cell.col < 0 || cell.row >= floor.size || cell.col >= floor.size) return true;
  return floor.rows[cell.row][cell.col] === '#';
}

/** Slide until the next cell is a wall or the edge. Returns every cell passed through. */
export function slideOnLabyrinthFloor(
  floor: LabyrinthFloor,
  from: LabyrinthCell,
  direction: LabyrinthDirection,
): { to: LabyrinthCell; path: LabyrinthCell[] } {
  const [dr, dc] = STEPS[direction];
  const path: LabyrinthCell[] = [];
  let current = from;
  for (;;) {
    const next = { row: current.row + dr, col: current.col + dc };
    if (isLabyrinthWall(floor, next)) break;
    path.push(next);
    current = next;
  }
  return { to: current, path };
}

const sameCell = (a: LabyrinthCell, b: LabyrinthCell) => a.row === b.row && a.col === b.col;

/** Shortest slide sequence from `from` to the floor's hole, or null if unreachable. */
export function solveLabyrinthFloor(floor: LabyrinthFloor, from: LabyrinthCell = floor.start): LabyrinthDirection[] | null {
  const key = (cell: LabyrinthCell) => cell.row * floor.size + cell.col;
  const previous = new Map<number, { from: number; direction: LabyrinthDirection } | null>([[key(from), null]]);
  const queue: LabyrinthCell[] = [from];
  while (queue.length > 0) {
    const cell = queue.shift()!;
    if (sameCell(cell, floor.exit)) {
      const route: LabyrinthDirection[] = [];
      let cursor = key(cell);
      let step = previous.get(cursor);
      while (step) {
        route.unshift(step.direction);
        cursor = step.from;
        step = previous.get(cursor);
      }
      return route;
    }
    for (const direction of DIRECTIONS) {
      const { to } = slideOnLabyrinthFloor(floor, cell, direction);
      if (sameCell(to, cell) || previous.has(key(to))) continue;
      previous.set(key(to), { from: key(cell), direction });
      queue.push(to);
    }
  }
  return null;
}

/** Lowest floor: the open cells that frame the circular tile board around the centre. */
export function getLabyrinthBoardRingCells(floor: LabyrinthFloor): LabyrinthCell[] {
  if (floor.id !== 'lowest') return [];
  const centre = (floor.size - 1) / 2;
  const cells: LabyrinthCell[] = [];
  for (let row = 0; row < floor.size; row += 1) {
    for (let col = 0; col < floor.size; col += 1) {
      const distance = Math.hypot(row - centre, col - centre);
      if (distance > 1.6 && distance < 3.1 && !isLabyrinthWall(floor, { row, col })) cells.push({ row, col });
    }
  }
  return cells;
}

export interface LabyrinthRun {
  floorIndex: number;
  position: LabyrinthCell;
  moves: number;
  /** Restarts or budget-outs on the current floor. */
  tries: number;
  helperUsed: boolean;
  finished: boolean;
}

export type LabyrinthMoveOutcome = 'blocked' | 'moved' | 'out-of-moves' | 'floor-cleared' | 'finished';

export function createLabyrinthRun(floorIndex = 0): LabyrinthRun {
  const index = Math.max(0, Math.min(ISLAND_20_LABYRINTH_FLOORS.length - 1, Math.floor(floorIndex)));
  return { floorIndex: index, position: { ...ISLAND_20_LABYRINTH_FLOORS[index].start }, moves: 0, tries: 0, helperUsed: false, finished: false };
}

export function getLabyrinthMoveBudget(floor: LabyrinthFloor): number {
  return floor.par * LABYRINTH_MOVE_BUDGET_FACTOR;
}

export function applyLabyrinthMove(run: LabyrinthRun, direction: LabyrinthDirection): {
  run: LabyrinthRun;
  outcome: LabyrinthMoveOutcome;
  path: LabyrinthCell[];
} {
  if (run.finished) return { run, outcome: 'finished', path: [] };
  const floor = ISLAND_20_LABYRINTH_FLOORS[run.floorIndex];
  const { to, path } = slideOnLabyrinthFloor(floor, run.position, direction);
  if (path.length === 0) return { run, outcome: 'blocked', path };
  const moves = run.moves + 1;
  if (sameCell(to, floor.exit)) {
    const last = run.floorIndex >= ISLAND_20_LABYRINTH_FLOORS.length - 1;
    if (last) return { run: { ...run, position: to, moves, finished: true }, outcome: 'finished', path };
    return { run: { ...createLabyrinthRun(run.floorIndex + 1) }, outcome: 'floor-cleared', path };
  }
  if (moves >= getLabyrinthMoveBudget(floor)) {
    return { run: { ...run, position: { ...floor.start }, moves: 0, tries: run.tries + 1 }, outcome: 'out-of-moves', path };
  }
  return { run: { ...run, position: to, moves }, outcome: 'moved', path };
}

export function restartLabyrinthFloor(run: LabyrinthRun): LabyrinthRun {
  const floor = ISLAND_20_LABYRINTH_FLOORS[run.floorIndex];
  const counted = run.moves > 0 ? 1 : 0;
  return { ...run, position: { ...floor.start }, moves: 0, tries: run.tries + counted, finished: false };
}

export function isLabyrinthHelperAvailable(run: LabyrinthRun): boolean {
  return !run.finished && run.tries >= LABYRINTH_HELPER_TRIES;
}

/** The robot's scan: the route from where the player stands now. */
export function scanLabyrinthRoute(run: LabyrinthRun): LabyrinthDirection[] {
  return solveLabyrinthFloor(ISLAND_20_LABYRINTH_FLOORS[run.floorIndex], run.position) ?? [];
}

// ── Per-viewer progress (presentation only) ──
const PROGRESS_PREFIX = 'lifegoal:island20-labyrinth:v1';

export interface LabyrinthProgress { floorIndex: number; finishedAtMs: number | null }

export function getLabyrinthProgressKey(userId: string, cycleIndex: number): string {
  return `${PROGRESS_PREFIX}:${userId}:${Math.max(0, Math.floor(cycleIndex))}`;
}

export function readLabyrinthProgress(key: string): LabyrinthProgress {
  try {
    const raw = typeof window === 'undefined' ? null : window.localStorage.getItem(key);
    const value = raw ? JSON.parse(raw) as Partial<LabyrinthProgress> : null;
    const floorIndex = typeof value?.floorIndex === 'number' && Number.isFinite(value.floorIndex)
      ? Math.max(0, Math.min(ISLAND_20_LABYRINTH_FLOORS.length - 1, Math.floor(value.floorIndex)))
      : 0;
    const finishedAtMs = typeof value?.finishedAtMs === 'number' && Number.isFinite(value.finishedAtMs) ? value.finishedAtMs : null;
    return { floorIndex, finishedAtMs };
  } catch {
    return { floorIndex: 0, finishedAtMs: null };
  }
}

export function writeLabyrinthProgress(key: string, progress: LabyrinthProgress): void {
  try { if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(progress)); } catch { /* private mode */ }
}
