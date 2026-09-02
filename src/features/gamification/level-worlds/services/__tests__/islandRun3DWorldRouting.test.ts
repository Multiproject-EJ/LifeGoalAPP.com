import {
  ISLAND_RUN_3D_WORLD_ROUTES,
  resolveIslandRun3DWorldRoute,
} from '../islandRun3DWorldRouting';
import { assertEqual, type TestCase } from './testHarness';

export const islandRun3DWorldRoutingTests: TestCase[] = [
  {
    name: 'keeps runtime identity separate from the authored visual-world source',
    run: () => {
      assertEqual(resolveIslandRun3DWorldRoute(1)?.worldSourceNumber, 1, 'Island 001 keeps First Light Kingdom');
      assertEqual(resolveIslandRun3DWorldRoute(2)?.worldSourceNumber, 2, 'Island 002 keeps Celestial Sky Kingdom');
      assertEqual(resolveIslandRun3DWorldRoute(3)?.worldSourceNumber, 3, 'Island 003 keeps Frostmoon Haven');
      assertEqual(resolveIslandRun3DWorldRoute(4)?.worldSourceNumber, 4, 'Island 004 keeps Crown Citadel');
      assertEqual(resolveIslandRun3DWorldRoute(5)?.worldSourceNumber, 5, 'Island 005 keeps the tropical Sunwheel Arena');
      assertEqual(resolveIslandRun3DWorldRoute(5)?.role, 'arena', 'runtime Island 005 owns the arena role');
      assertEqual(resolveIslandRun3DWorldRoute(6)?.worldSourceNumber, 6, 'Island 006 owns the Moonveil Nexus world');
      assertEqual(resolveIslandRun3DWorldRoute(6)?.role, 'ordinary', 'Island 006 keeps the ordinary-island role');
      assertEqual(resolveIslandRun3DWorldRoute(7)?.worldSourceNumber, 7, 'Island 007 owns the Abyssal Pearl Kingdom world');
      assertEqual(resolveIslandRun3DWorldRoute(7)?.role, 'ordinary', 'Island 007 keeps the ordinary-island role');
      assertEqual(resolveIslandRun3DWorldRoute(8)?.worldSourceNumber, 8, 'Island 008 owns the Everblossom Kingdom world');
      assertEqual(resolveIslandRun3DWorldRoute(8)?.role, 'ordinary', 'Island 008 keeps the ordinary-island role');
      assertEqual(resolveIslandRun3DWorldRoute(9)?.worldSourceNumber, 9, 'Island 009 owns the Heartshaft Crucible world');
      assertEqual(resolveIslandRun3DWorldRoute(9)?.role, 'ordinary', 'Island 009 keeps the ordinary-island role');
      assertEqual(resolveIslandRun3DWorldRoute(10)?.worldSourceNumber, 10, 'Island 010 owns the Rootheart Canopy City world');
      assertEqual(resolveIslandRun3DWorldRoute(10)?.role, 'arena', 'runtime Island 010 owns the arena role');
      assertEqual(resolveIslandRun3DWorldRoute(11)?.worldSourceNumber, 11, 'Island 011 preserves the pre-crater First Light world');
      assertEqual(resolveIslandRun3DWorldRoute(11)?.role, 'ordinary', 'runtime Island 011 remains an ordinary island');
      assertEqual(resolveIslandRun3DWorldRoute(12)?.worldSourceNumber, 12, 'Island 012 owns the Sunken Sands world');
      assertEqual(resolveIslandRun3DWorldRoute(12)?.role, 'ordinary', 'Island 012 keeps the ordinary-island role');
      assertEqual(resolveIslandRun3DWorldRoute(13)?.worldSourceNumber, 13, 'Island 013 owns the Cactus Canyon world');
      assertEqual(resolveIslandRun3DWorldRoute(13)?.role, 'ordinary', 'Island 013 keeps the ordinary-island role');
      assertEqual(resolveIslandRun3DWorldRoute(14)?.worldSourceNumber, 14, 'Island 014 owns the Honeycomb Kingdom world');
      assertEqual(resolveIslandRun3DWorldRoute(14)?.role, 'ordinary', 'Island 014 keeps the ordinary-island role');
      assertEqual(resolveIslandRun3DWorldRoute(18)?.worldSourceNumber, 18, 'Island 018 owns the Jungle Expedition world');
      assertEqual(resolveIslandRun3DWorldRoute(18)?.role, 'ordinary', 'Island 018 keeps the ordinary-island role');
      assertEqual(resolveIslandRun3DWorldRoute(16)?.worldSourceNumber, 22, 'runtime Island 016 owns the Fisherman\'s Village world');
      assertEqual(resolveIslandRun3DWorldRoute(16)?.role, 'ordinary', 'Island 016 remains an ordinary mission island');
      assertEqual(resolveIslandRun3DWorldRoute(22), null, 'runtime Island 022 stays free after the explicit reassignment to 016');
    },
  },
  {
    name: 'keeps every runtime island on an explicit authored source identity',
    run: () => {
      assertEqual(ISLAND_RUN_3D_WORLD_ROUTES.length, 16, 'sixteen authored world packs are currently routed');
      assertEqual(new Set(ISLAND_RUN_3D_WORLD_ROUTES.map((route) => route.runtimeIslandNumber)).size, 16, 'runtime islands are unique');
      assertEqual(new Set(ISLAND_RUN_3D_WORLD_ROUTES.map((route) => route.worldSourceNumber)).size, 16, 'visual source packs are unique');
    },
  },
];
