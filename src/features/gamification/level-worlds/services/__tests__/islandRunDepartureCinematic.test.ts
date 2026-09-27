import {
  ISLAND_DEPARTURE_BEATS,
  ISLAND_DEPARTURE_DURATION,
  ISLAND_DEPARTURE_FALLBACK_MS,
  resolveIslandDepartureShot,
  shouldPlayIslandDepartureCinematic,
} from '../islandRunDepartureCinematic';
import { assert, assertEqual, type TestCase } from './testHarness';

export const islandRunDepartureCinematicTests: TestCase[] = [
  {
    name: 'departure runs zoom to ship, travel mode, ground takeoff, then the side flight',
    run: () => {
      assertEqual(resolveIslandDepartureShot(0.2), 'zoom-to-ship', 'opens by pushing in on the ship');
      assertEqual(resolveIslandDepartureShot(2), 'travel-mode', 'then folds into travel mode');
      assertEqual(resolveIslandDepartureShot(4), 'ground-takeoff', 'then lifts off, seen from the ground');
      assertEqual(resolveIslandDepartureShot(6.5), 'side-flight', 'and leaves in a side view');
      for (let i = 1; i < ISLAND_DEPARTURE_BEATS.length; i += 1) {
        assertEqual(ISLAND_DEPARTURE_BEATS[i].start, ISLAND_DEPARTURE_BEATS[i - 1].end, 'beats are contiguous');
      }
      assertEqual(ISLAND_DEPARTURE_BEATS[ISLAND_DEPARTURE_BEATS.length - 1].end, ISLAND_DEPARTURE_DURATION, 'beats end with the cinematic');
      assert(ISLAND_DEPARTURE_FALLBACK_MS > ISLAND_DEPARTURE_DURATION * 1000, 'the travel fallback never cuts the cinematic short');
    },
  },
  {
    name: 'reduced motion or no 3D scene goes straight to travel',
    run: () => {
      assert(shouldPlayIslandDepartureCinematic({ hasThreeScene: true, reducedMotion: false }), 'plays by default');
      assert(!shouldPlayIslandDepartureCinematic({ hasThreeScene: true, reducedMotion: true }), 'reduced motion skips it');
      assert(!shouldPlayIslandDepartureCinematic({ hasThreeScene: false, reducedMotion: false }), 'no 3D scene skips it');
    },
  },
  {
    name: 'travel always follows the departure: scene completion, Skip, or the fallback',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(board.includes('const fallback = window.setTimeout(finish, ISLAND_DEPARTURE_FALLBACK_MS);'), 'a fallback timer travels if the scene never reports back');
      assert(board.includes('onDepartureCinematicComplete={() => islandDepartureFinishRef.current?.()}'), 'the scene completion starts travel');
      assert(board.includes('<button type="button" onClick={() => islandDepartureFinishRef.current?.()}>Skip</button>'), 'Skip starts travel at once');
    },
  },
];
