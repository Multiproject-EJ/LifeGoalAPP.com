import {
  getIsland20ArrivalSeenKey,
  ISLAND_20_ARRIVAL_BEATS,
  ISLAND_20_ARRIVAL_DURATION_S,
  ISLAND_20_FLYOVER_END_S,
  ISLAND_20_FLYOVER_START_S,
  ISLAND_20_TURRET_SCREEN,
  markIsland20ArrivalSeen,
  nextIsland20ArrivalBeatStart,
  readIsland20ArrivalSeen,
  resolveIsland20ArrivalBeat,
  resolveIsland20RobotPose,
  shouldPlayIsland20ArrivalStory,
} from '../island20ArrivalStory';
import { getIslandMissionBriefingPresentation } from '../islandRunMissionBriefing';
import { assert, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const baseGate = {
  islandNumber: 20,
  hydrated: true,
  alreadySeen: false,
  anyLandmarkBuilt: false,
  escapeStarted: false,
  screenBusy: false,
};

export const island20ArrivalStoryTests: TestCase[] = [
  {
    name: 'the story runs: orders, the empty gate, the turret flyover, then the crew decides to build',
    run: () => {
      const phases = ISLAND_20_ARRIVAL_BEATS.map((beat) => beat.phase);
      assertEqual([...new Set(phases)].join(','), 'recap,landing,empty,flyover,report', 'beats in story order');
      assert(/build the Lava Labyrinth/i.test(ISLAND_20_ARRIVAL_BEATS[0].text), 'told to build the labyrinth');
      assert(/meet you/i.test(ISLAND_20_ARRIVAL_BEATS[0].text), 'promised a welcome');
      assert(ISLAND_20_ARRIVAL_BEATS.some((beat) => beat.phase === 'empty' && /no one/i.test(beat.text)), 'nobody meets the crew');
      assertEqual(resolveIsland20ArrivalBeat(ISLAND_20_FLYOVER_START_S + 0.1).speaker, 'Pixel', 'the little robot flies');
      ISLAND_20_ARRIVAL_BEATS.forEach((beat, index) => {
        if (index > 0) assert(beat.startS > ISLAND_20_ARRIVAL_BEATS[index - 1].startS, 'beats are ordered');
      });
      assertEqual(nextIsland20ArrivalBeatStart(0), ISLAND_20_ARRIVAL_BEATS[1].startS, 'tap goes to the next beat');
      assertEqual(nextIsland20ArrivalBeatStart(ISLAND_20_ARRIVAL_BEATS[ISLAND_20_ARRIVAL_BEATS.length - 1].startS), ISLAND_20_ARRIVAL_DURATION_S, 'last tap ends it');
    },
  },
  {
    name: 'the little robot flies over the turret with the other two flanking it',
    run: () => {
      const samples = 60;
      let highestLeader = 1;
      let overTurret = false;
      for (let i = 0; i <= samples; i += 1) {
        const t = ISLAND_20_FLYOVER_START_S + (ISLAND_20_FLYOVER_END_S - ISLAND_20_FLYOVER_START_S) * (i / samples);
        const mini = resolveIsland20RobotPose('mini-artist', t);
        const heavy = resolveIsland20RobotPose('heavy-worker', t);
        const manager = resolveIsland20RobotPose('project-manager', t);
        highestLeader = Math.min(highestLeader, mini.y);
        if (Math.abs(mini.x - ISLAND_20_TURRET_SCREEN.x) < 0.04 && mini.y < ISLAND_20_TURRET_SCREEN.y) overTurret = true;
        if (i > samples * 0.35 && i < samples * 0.75) {
          assert(heavy.x < mini.x && manager.x > mini.x, `flankers either side at ${t.toFixed(2)}s`);
          assert(heavy.scale < mini.scale && manager.scale < mini.scale, 'flankers sit behind the leader');
        }
      }
      assert(overTurret, 'the leader passes above the turret');
      assert(highestLeader < ISLAND_20_TURRET_SCREEN.y, 'the flight rises above the turret');
      const grounded = resolveIsland20RobotPose('mini-artist', 8);
      assert(!grounded.flying && grounded.emotion === 'concerned', 'before the flight the crew stands at the empty gate, concerned');
      assert(!resolveIsland20RobotPose('mini-artist', 1).visible, 'the crew is off screen while the orders play');
      const still = resolveIsland20RobotPose('mini-artist', ISLAND_20_FLYOVER_START_S + 2, true);
      assert(!still.flying, 'reduced motion settles the crew instead of flying');
    },
  },
  {
    name: 'plays once per visit, on a fresh Island 020 arrival, when nothing else holds the screen',
    run: () => {
      assert(shouldPlayIsland20ArrivalStory(baseGate), 'fresh arrival plays');
      assert(!shouldPlayIsland20ArrivalStory({ ...baseGate, islandNumber: 19 }), 'Island 020 only');
      assert(!shouldPlayIsland20ArrivalStory({ ...baseGate, hydrated: false }), 'waits for hydration');
      assert(!shouldPlayIsland20ArrivalStory({ ...baseGate, alreadySeen: true }), 'once per visit');
      assert(!shouldPlayIsland20ArrivalStory({ ...baseGate, anyLandmarkBuilt: true }), 'not after building started');
      assert(!shouldPlayIsland20ArrivalStory({ ...baseGate, escapeStarted: true }), 'not during the escape');
      assert(!shouldPlayIsland20ArrivalStory({ ...baseGate, screenBusy: true }), 'waits for other modals');
      installWindowWithStorage(createMemoryStorage());
      const key = getIsland20ArrivalSeenKey('user-1', 3);
      assert(!readIsland20ArrivalSeen(key), 'unseen at first');
      markIsland20ArrivalSeen(key);
      assert(readIsland20ArrivalSeen(key), 'remembered');
      assert(!readIsland20ArrivalSeen(getIsland20ArrivalSeenKey('user-1', 4)), 'a new cycle plays it again');
    },
  },
  {
    name: 'the travel briefing promises the welcome, and the story is a viewport modal wired on Island 020 only',
    run: async () => {
      const briefing = getIslandMissionBriefingPresentation(20);
      assert(/build the Lava Labyrinth/.test(briefing.missionStatement), 'the orders say to build the labyrinth');
      assert(/Forge Keepers will meet you/.test(briefing.missionStatement), 'the orders promise a welcome');
      // @ts-ignore Node test runner provides fs.
      const fs = await import('fs');
      const component = fs.readFileSync('src/features/gamification/level-worlds/components/Island20ArrivalStory.tsx', 'utf8');
      assert(component.includes('createPortal('), 'portal');
      assert(component.includes('lockPageScroll()'), 'scroll lock');
      assert(component.includes("event.key === 'Escape'"), 'Escape skips');
      assert(!component.includes('persistIslandRunRuntimeStatePatch'), 'no gameplay writes');
      const css = fs.readFileSync('src/features/gamification/level-worlds/components/island20-arrival-story.css', 'utf8');
      assert(/\.i20-arrival \{\s*position: fixed;\s*inset: 0;/.test(css), 'viewport-anchored');
      const board = fs.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(board.includes('{showIsland20Arrival && islandNumber === 20 ? ('), 'rendered on Island 020 only');
      assert(board.includes('      showIsland20Arrival ||\n'), 'counts as a modal that owns attention');
    },
  },
];
