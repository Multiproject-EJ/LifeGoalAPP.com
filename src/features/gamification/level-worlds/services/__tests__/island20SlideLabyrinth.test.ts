import {
  applyLabyrinthMove,
  createLabyrinthRun,
  getLabyrinthBoardRingCells,
  getLabyrinthMoveBudget,
  getLabyrinthProgressKey,
  isLabyrinthHelperAvailable,
  ISLAND_20_LABYRINTH_FLOORS,
  LABYRINTH_HELPER_TRIES,
  readLabyrinthProgress,
  restartLabyrinthFloor,
  scanLabyrinthRoute,
  slideOnLabyrinthFloor,
  solveLabyrinthFloor,
  writeLabyrinthProgress,
  type LabyrinthRun,
} from '../island20SlideLabyrinth';
import { assert, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

function playRoute(run: LabyrinthRun, route: readonly string[]) {
  let current = run;
  let outcome = '';
  for (const direction of route) {
    const result = applyLabyrinthMove(current, direction as never);
    current = result.run;
    outcome = result.outcome;
  }
  return { run: current, outcome };
}

export const island20SlideLabyrinthTests: TestCase[] = [
  {
    name: 'three floors, top first, each solvable in exactly its par',
    run: () => {
      assertEqual(ISLAND_20_LABYRINTH_FLOORS.map((floor) => floor.id).join(','), 'top,middle,lowest', 'top to lowest');
      ISLAND_20_LABYRINTH_FLOORS.forEach((floor) => {
        assertEqual(floor.rows.length, floor.size, `${floor.id} is square`);
        floor.rows.forEach((row) => assertEqual(row.length, floor.size, `${floor.id} row width`));
        assert(floor.rows[floor.start.row][floor.start.col] === '.', `${floor.id} start is open`);
        assert(floor.rows[floor.exit.row][floor.exit.col] === '.', `${floor.id} exit is open`);
        const route = solveLabyrinthFloor(floor);
        assert(route !== null, `${floor.id} is solvable`);
        assertEqual(route!.length, floor.par, `${floor.id} par matches the shortest route`);
        // No single move wins: the floor is a real puzzle.
        assert(floor.par >= 5, `${floor.id} needs several slides`);
      });
    },
  },
  {
    name: 'the robot slides until a wall or the edge',
    run: () => {
      const top = ISLAND_20_LABYRINTH_FLOORS[0];
      const right = slideOnLabyrinthFloor(top, { row: 0, col: 0 }, 'right');
      assertEqual(`${right.to.row},${right.to.col}`, '0,1', 'stops before the wall at column 2');
      const down = slideOnLabyrinthFloor(top, { row: 0, col: 0 }, 'down');
      assertEqual(`${down.to.row},${down.to.col}`, '4,0', 'slides to the bottom edge');
      assertEqual(down.path.length, 4, 'path lists every cell passed');
      const blocked = applyLabyrinthMove(createLabyrinthRun(0), 'up');
      assertEqual(blocked.outcome, 'blocked', 'into the edge is blocked');
      assertEqual(blocked.run.moves, 0, 'a blocked move costs nothing');
    },
  },
  {
    name: 'stopping on the hole drops to the next floor, the lowest floor finishes',
    run: () => {
      let run = createLabyrinthRun(0);
      ISLAND_20_LABYRINTH_FLOORS.forEach((floor, index) => {
        const route = solveLabyrinthFloor(floor)!;
        const played = playRoute(run, route);
        const last = index === ISLAND_20_LABYRINTH_FLOORS.length - 1;
        assertEqual(played.outcome, last ? 'finished' : 'floor-cleared', `${floor.id} outcome`);
        if (!last) {
          assertEqual(played.run.floorIndex, index + 1, 'drops one floor');
          assertEqual(played.run.moves, 0, 'fresh move count');
          assertEqual(played.run.tries, 0, 'fresh tries');
        } else {
          assert(played.run.finished, 'the run is finished');
        }
        run = played.run;
      });
      assertEqual(applyLabyrinthMove(run, 'left').outcome, 'finished', 'a finished run stays finished');
    },
  },
  {
    name: 'running out of moves and restarting count tries; the robot scan unlocks at five',
    run: () => {
      const top = ISLAND_20_LABYRINTH_FLOORS[0];
      let run = createLabyrinthRun(0);
      assert(!isLabyrinthHelperAvailable(run), 'no helper at first');
      // Bounce left/right until the budget runs out.
      let outcome = '';
      for (let i = 0; i < getLabyrinthMoveBudget(top) && outcome !== 'out-of-moves'; i += 1) {
        const result = applyLabyrinthMove(run, i % 2 === 0 ? 'down' : 'up');
        run = result.run;
        outcome = result.outcome;
      }
      assertEqual(outcome, 'out-of-moves', 'the budget ends the attempt');
      assertEqual(run.tries, 1, 'one try used');
      assertEqual(`${run.position.row},${run.position.col}`, `${top.start.row},${top.start.col}`, 'back to the start');
      assertEqual(restartLabyrinthFloor(run).tries, 1, 'restarting without moving is free');
      for (let i = 1; i < LABYRINTH_HELPER_TRIES; i += 1) {
        run = restartLabyrinthFloor(applyLabyrinthMove(run, 'down').run);
      }
      assertEqual(run.tries, LABYRINTH_HELPER_TRIES, 'five tries');
      assert(isLabyrinthHelperAvailable(run), 'the robot scan is offered');
    },
  },
  {
    name: 'the robot scan reveals a route that solves from where the robot stands',
    run: () => {
      const floor = ISLAND_20_LABYRINTH_FLOORS[1];
      let run = applyLabyrinthMove(createLabyrinthRun(1), 'down').run;
      const route = scanLabyrinthRoute(run);
      assert(route.length > 0, 'a route is found');
      const played = playRoute(run, route);
      assertEqual(played.outcome, 'floor-cleared', 'following the scan clears the floor');
      run = createLabyrinthRun(1);
      assertEqual(scanLabyrinthRoute(run).length, floor.par, 'from the start the scan is the par route');
    },
  },
  {
    name: 'the lowest floor frames the circular tile board around the vault',
    run: () => {
      assertEqual(getLabyrinthBoardRingCells(ISLAND_20_LABYRINTH_FLOORS[0]).length, 0, 'not on the top floor');
      assertEqual(getLabyrinthBoardRingCells(ISLAND_20_LABYRINTH_FLOORS[1]).length, 0, 'not on the middle floor');
      const lowest = ISLAND_20_LABYRINTH_FLOORS[2];
      const ring = getLabyrinthBoardRingCells(lowest);
      assert(ring.length >= 16, `a full ring of board tiles (${ring.length})`);
      const centre = (lowest.size - 1) / 2;
      assertEqual(`${lowest.exit.row},${lowest.exit.col}`, `${centre},${centre}`, 'the vault sits at the centre of the ring');
    },
  },
  {
    name: 'floor progress is remembered per player and island visit',
    run: () => {
      installWindowWithStorage(createMemoryStorage());
      const key = getLabyrinthProgressKey('user-1', 2);
      assertEqual(readLabyrinthProgress(key).floorIndex, 0, 'starts at the top');
      writeLabyrinthProgress(key, { floorIndex: 2, finishedAtMs: null });
      assertEqual(readLabyrinthProgress(key).floorIndex, 2, 'resumes on the lowest floor');
      assertEqual(readLabyrinthProgress(getLabyrinthProgressKey('user-1', 3)).floorIndex, 0, 'a new visit starts over');
      window.localStorage.setItem(key, '{"floorIndex":99}');
      assertEqual(readLabyrinthProgress(key).floorIndex, 2, 'clamped to the lowest floor');
      window.localStorage.setItem(key, 'not json');
      assertEqual(readLabyrinthProgress(key).floorIndex, 0, 'bad data starts at the top');
    },
  },
  {
    name: 'the labyrinth is an Island 020 mini-game only, in a viewport modal',
    run: async () => {
      // @ts-ignore Node test runner provides fs.
      const fs = await import('fs');
      const component = fs.readFileSync('src/features/gamification/level-worlds/components/Island20SlideLabyrinth.tsx', 'utf8');
      assert(component.includes('createPortal('), 'renders in a portal');
      assert(component.includes('lockPageScroll()'), 'locks background scroll');
      assert(!component.includes('persistIslandRunRuntimeStatePatch'), 'no gameplay writes');
      const css = fs.readFileSync('src/features/gamification/level-worlds/components/island20-slide-labyrinth.css', 'utf8');
      assert(/\.lava-lab \{\s*position: fixed;\s*inset: 0;/.test(css), 'viewport-anchored overlay');
      const board = fs.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(board.includes('{islandNumber === 20 && !islandDeparture && !isIslandVisualPreview ? ('), 'the entry shows on Island 020 only');
      assert(board.includes('{showSlideLabyrinth && islandNumber === 20 ? ('), 'the game opens on Island 020 only');
      for (const file of ['islandRunMinigameRegistry.ts', 'islandRunMinigameManifests.ts', 'islandRunMinigameLauncherService.ts']) {
        const source = fs.readFileSync(`src/features/gamification/level-worlds/services/${file}`, 'utf8');
        assert(!/labyrinth/i.test(source), `${file} does not list the labyrinth as an event mini-game`);
      }
    },
  },
];
