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
      assertEqual(resolveIslandRun3DWorldRoute(7), null, 'unauthored islands retain the established fallback path');
    },
  },
  {
    name: 'uses each completed visual world once during the reassignment',
    run: () => {
      assertEqual(ISLAND_RUN_3D_WORLD_ROUTES.length, 6, 'six completed world packs are currently routed');
      assertEqual(new Set(ISLAND_RUN_3D_WORLD_ROUTES.map((route) => route.runtimeIslandNumber)).size, 6, 'runtime islands are unique');
      assertEqual(new Set(ISLAND_RUN_3D_WORLD_ROUTES.map((route) => route.worldSourceNumber)).size, 6, 'visual source packs are unique');
    },
  },
];
