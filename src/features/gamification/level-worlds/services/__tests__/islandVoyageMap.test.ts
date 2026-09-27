import {
  VOYAGE_ERAS,
  getVoyageEra,
  getVoyageIslandArt,
  getVoyageIslandLabel,
  resolveVoyageIslandStatus,
} from '../islandVoyageMap';
import { assert, assertEqual, type TestCase } from './testHarness';

export const islandVoyageMapTests: TestCase[] = [
  {
    name: 'voyage map: six eras cover islands 1-120 without gaps',
    run: () => {
      assertEqual(VOYAGE_ERAS[0].from, 1, 'starts at island 1');
      assertEqual(VOYAGE_ERAS[VOYAGE_ERAS.length - 1].to, 120, 'ends at island 120');
      for (let i = 1; i < VOYAGE_ERAS.length; i += 1) assertEqual(VOYAGE_ERAS[i].from, VOYAGE_ERAS[i - 1].to + 1, 'eras are contiguous');
      assertEqual(getVoyageEra(26).id, 'growth', 'island 26 is in Growth');
    },
  },
  {
    name: 'voyage map: statuses, secret far-future names, and art for every island',
    run: () => {
      const completed = new Set([1, 2, 3]);
      const visited = new Set<number>();
      const status = (n: number) => resolveVoyageIslandStatus({ islandNumber: n, currentIslandNumber: 4, completed, visited });
      assertEqual([status(2), status(4), status(5), status(9)].join(','), 'completed,current,next,locked', 'status ladder');
      assertEqual(getVoyageIslandLabel(7, 4), getVoyageIslandLabel(7, 4), 'labels are stable');
      assertEqual(getVoyageIslandLabel(20, 4), 'Uncharted island', 'far islands keep their names secret');
      for (let n = 1; n <= 120; n += 1) assert(getVoyageIslandArt(n).startsWith('/assets/island-run/orbit-compass/'), `island ${n} has art`);
    },
  },
  {
    name: 'voyage map: the game menu opens it as a viewport modal with scroll lock',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      const map = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunVoyageMap.tsx', 'utf8');
      const css = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunVoyageMap.css', 'utf8');
      assert(board.includes('<IslandRunVoyageMap currentIslandNumber={islandNumber}'), 'the Island Map menu entry opens the Voyage Map');
      assert(/\.voyage-map \{\s*position: fixed; inset: 0;/.test(css), 'viewport-anchored overlay');
      assert(map.includes('useEffect(() => lockPageScroll(), []);'), 'background scroll is locked');
      assert(map.includes('createPortal('), 'renders in a top-level portal');
    },
  },
];
