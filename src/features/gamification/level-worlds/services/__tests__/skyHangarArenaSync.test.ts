import { assert, assertEqual, type TestCase } from './testHarness';
import { ARENA_GAME_CATALOG } from '../islandRunArenaCatalog';
import { resolveSkyHangarFlight, resolveSkyHangarTap, SKY_HANGAR_LAUNCH_DELAY_MS, SKY_HANGAR_LAUNCH_DELAY_REDUCED_MS } from '../skyHangarArenaSync';

export const skyHangarArenaSyncTests: TestCase[] = [
  {
    name: 'sky hangar: flies the current Event Arena game once built to Level 3, following the event rotation',
    run: () => {
      for (const level of [0, 1, 2]) {
        assertEqual(resolveSkyHangarFlight({ hangarLevel: level, activeEventType: 'space_excavator' }), null, `Level ${level}: not an airfield yet`);
      }
      const excavator = resolveSkyHangarFlight({ hangarLevel: 3, activeEventType: 'space_excavator' })!;
      const catalog = ARENA_GAME_CATALOG.find((game) => game.id === 'space_excavator')!;
      assertEqual(excavator.gameId, 'space_excavator', 'the current event game');
      assertEqual(excavator.displayName, catalog.displayName, 'named like the arena card');
      assert(excavator.bannerText.includes(catalog.shortName) && excavator.bannerText.includes(catalog.icon), 'banner shows icon and short name');
      assertEqual(resolveSkyHangarFlight({ hangarLevel: 3, activeEventType: 'companion_feast' })!.gameId, 'companion_feast', 'the banner changes with the rotation');
      assertEqual(resolveSkyHangarFlight({ hangarLevel: 3, activeEventType: 'space_excavator', journeyDiscReplacesEvent: true })!.gameId, 'journey_disc_arena', 'Journey Disc takes over like on the arena surface');
      assertEqual(resolveSkyHangarFlight({ hangarLevel: 3, activeEventType: null }), null, 'no event, no banner');
      assertEqual(resolveSkyHangarFlight({ hangarLevel: 3, activeEventType: 'unknown_event' }), null, 'unknown events fly nothing');
    },
  },
  {
    name: 'sky hangar: taps build until Level 3, then fly to the Event Arena after a short takeoff',
    run: () => {
      const flight = resolveSkyHangarFlight({ hangarLevel: 3, activeEventType: 'lucky_spin' });
      assertEqual(resolveSkyHangarTap({ hangarLevel: 2, flight: null }), 'build', 'unfinished hangar opens the build panel');
      assertEqual(resolveSkyHangarTap({ hangarLevel: 3, flight: null }), 'build', 'no current game: build panel');
      assertEqual(resolveSkyHangarTap({ hangarLevel: 3, flight }), 'fly', 'ready hangar flies to the arena');
      assert(SKY_HANGAR_LAUNCH_DELAY_REDUCED_MS < SKY_HANGAR_LAUNCH_DELAY_MS && SKY_HANGAR_LAUNCH_DELAY_MS <= 2500, 'takeoff is brief, shorter with reduced motion');
    },
  },
  {
    name: 'sky hangar: the board opens the real Event Arena (its own choice, tickets and gating) and the phone shows the flight',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(board.includes("handleLandmarkOpenRequest('mystery');"), 'the hangar opens the Event Arena landmark flow');
      assert(board.includes('activeEventType: effectiveActiveTimedEvent?.eventType'), 'synced with the arena event the board shows');
      assert(board.includes("actionLabel: skyHangarFlight ? '✈ Fly to the Event Arena'"), 'Mission Phone flies there too');
      assert(board.includes('skyHangarBanner={skyHangarFlight ? { text: skyHangarFlight.bannerText, accent: skyHangarFlight.accent } : null}'), 'the plane tows the game banner');
      const structures = fsMod.readFileSync('src/features/gamification/level-worlds/dev/StormfrontStructures.ts', 'utf8');
      assert(structures.includes('function launch()') && structures.includes('function setBanner('), 'the 3D hangar launches and tows a banner');
    },
  },
];
