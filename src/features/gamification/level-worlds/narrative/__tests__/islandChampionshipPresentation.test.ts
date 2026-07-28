import { assertEqual, type TestCase } from '../../services/__tests__/testHarness';
import { getIslandChampionshipPresentation } from '../islandChampionshipPresentation';

export const islandChampionshipPresentationTests: TestCase[] = [
  {
    name: 'championship presentation maps only the three authored super levels',
    run: () => {
      assertEqual(getIslandChampionshipPresentation(30)?.championshipId, 'first-circuit', 'Island 30 should be First Circuit');
      assertEqual(getIslandChampionshipPresentation(72)?.championshipId, '120-worlds', 'Island 72 should be 120 Worlds');
      assertEqual(getIslandChampionshipPresentation(117)?.championshipId, 'universal-117', 'Island 117 should be Universal');
      assertEqual(getIslandChampionshipPresentation(71), null, 'Ordinary islands should not receive a championship banner');
    },
  },
  {
    name: 'each championship presentation points to its Story Mode manifest and optimized artwork',
    run: () => {
      for (const islandNumber of [30, 72, 117]) {
        const championship = getIslandChampionshipPresentation(islandNumber);
        assertEqual(championship?.manifestPath.endsWith('/manifest.json'), true, `Island ${islandNumber} should have a story manifest`);
        assertEqual(championship?.artSrc.endsWith('.webp'), true, `Island ${islandNumber} should use optimized WebP art`);
      }
    },
  },
];
