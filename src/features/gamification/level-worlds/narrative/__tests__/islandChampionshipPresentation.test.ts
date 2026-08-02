// @ts-expect-error Node types are intentionally absent from the lightweight Island Run test tsconfig.
import { readFileSync } from 'node:fs';
import { assert, assertEqual, type TestCase } from '../../services/__tests__/testHarness';
import {
  getChampionshipOpeningSeenStorageKey,
  getIslandChampionshipPresentation,
  ISLAND_CHAMPIONSHIP_NUMBERS,
  listIslandChampionshipPresentations,
} from '../islandChampionshipPresentation';

const openingModalSource = readFileSync('src/features/gamification/level-worlds/components/IslandChampionshipOpeningModal.tsx', 'utf8');
const openingModalCss = readFileSync('src/features/gamification/level-worlds/components/IslandChampionshipOpeningModal.css', 'utf8');
const boardSource = readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');

export const islandChampionshipPresentationTests: TestCase[] = [
  {
    name: 'championship presentation maps recurring Cups and preserves the three authored super levels',
    run: () => {
      assertEqual(ISLAND_CHAMPIONSHIP_NUMBERS.join(','), '10,20,30,40,50,60,70,72,80,90,100,110,117', 'Expected ten Cups and three super levels');
      assertEqual(getIslandChampionshipPresentation(10)?.championshipId, 'lagoon-lantern', 'Island 10 should open the first host Cup');
      assertEqual(getIslandChampionshipPresentation(30)?.championshipId, 'first-circuit', 'Island 30 should be First Circuit');
      assertEqual(getIslandChampionshipPresentation(72)?.championshipId, '120-worlds', 'Island 72 should be 120 Worlds');
      assertEqual(getIslandChampionshipPresentation(117)?.championshipId, 'universal-117', 'Island 117 should be Universal');
      assertEqual(getIslandChampionshipPresentation(71), null, 'Ordinary islands should not receive a championship banner');
      assertEqual(getIslandChampionshipPresentation(120), null, 'Final Horizon should remain free for the story capstone');
    },
  },
  {
    name: 'each championship presentation points to optimized portrait artwork while Majors retain Story Mode manifests',
    run: () => {
      for (const championship of listIslandChampionshipPresentations()) {
        assertEqual(championship.artSrc.endsWith('.webp'), true, `Island ${championship.islandNumber} should use optimized WebP art`);
        assertEqual(championship.portraitArtSrc.endsWith('.webp'), true, `Island ${championship.islandNumber} should use optimized portrait art`);
        assertEqual(championship.stages.length, 4, `Island ${championship.islandNumber} should show a four-stage competition path`);
      }
      for (const islandNumber of [30, 72, 117]) {
        assertEqual(getIslandChampionshipPresentation(islandNumber)?.manifestPath?.endsWith('/manifest.json'), true, `Major Island ${islandNumber} should keep its story manifest`);
      }
    },
  },
  {
    name: 'opening-seen keys are scoped per user cycle and championship',
    run: () => {
      assertEqual(
        getChampionshipOpeningSeenStorageKey('user-1', 2, 'data-stream'),
        'island_run_championship_opening_v1_user-1_2_data-stream',
        'Expected a stable presentation-only key',
      );
    },
  },
  {
    name: 'championship opening is a viewport portal with focus and scroll ownership',
    run: () => {
      ['createPortal(modal, document.body)', 'lockPageScroll', 'dialogRef.current?.focus()', 'role="dialog"', 'aria-modal="true"'].forEach((needle) => {
        assert(openingModalSource.includes(needle), `Opening modal should include ${needle}`);
      });
      ['position: fixed;', 'min-height: 100dvh;', 'overflow: auto;', '@media (prefers-reduced-motion: reduce)'].forEach((needle) => {
        assert(openingModalCss.includes(needle), `Opening modal CSS should include ${needle}`);
      });
    },
  },
  {
    name: 'championship modal stays presentation-only and is queued from canonical island state',
    run: () => {
      ['islandRunStateActions', 'persistIslandRunRuntimeStatePatch', 'islandRunRollAction', 'islandRunTileRewardAction', 'runtimeState'].forEach((needle) => {
        assert(!openingModalSource.includes(needle), `Opening modal must not include gameplay authority ${needle}`);
      });
      assert(boardSource.includes('getIslandChampionshipPresentation(islandNumber)'), 'Board should derive the presentation from its current island');
      assert(boardSource.includes('showChampionshipOpeningModal'), 'Board should queue the opening modal');
      assert(boardSource.includes('getChampionshipOpeningSeenStorageKey'), 'Board should suppress already-viewed presentation per cycle');
    },
  },
];
