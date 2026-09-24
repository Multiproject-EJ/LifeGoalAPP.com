import { resolveIslandRunOrbitProgress } from '../islandRunOrbitProgress';
import { assertEqual, type TestCase } from './testHarness';

export const islandRunOrbitProgressTests: TestCase[] = [
  {
    name: 'derives completed islands from sequential first-cycle progress',
    run: () => {
      const progress = resolveIslandRunOrbitProgress({
        currentIslandNumber: 20,
        cycleIndex: 0,
        maxIslandCount: 120,
      });

      assertEqual(progress.completedCount, 19, 'Islands before the current island should be complete');
      assertEqual(progress.completedIslandNumbers[0], 1, 'Journey history should begin at Island 1');
      assertEqual(
        progress.completedIslandNumbers[progress.completedIslandNumbers.length - 1],
        19,
        'Current island must not be marked complete',
      );
    },
  },
  {
    name: 'keeps the current island active after a completed cycle',
    run: () => {
      const progress = resolveIslandRunOrbitProgress({
        currentIslandNumber: 1,
        cycleIndex: 1,
        maxIslandCount: 120,
      });

      assertEqual(progress.completedCount, 119, 'Previous-cycle islands should remain in history');
      assertEqual(progress.completedIslandNumbers.includes(1), false, 'Current island should remain active');
      assertEqual(progress.completedIslandNumbers.includes(120), true, 'Cycle capstone should remain completed');
    },
  },
  {
    name: 'reports 119 completed islands at the campaign capstone',
    run: () => {
      const progress = resolveIslandRunOrbitProgress({
        currentIslandNumber: 120,
        cycleIndex: 0,
        maxIslandCount: 120,
      });

      assertEqual(progress.completedCount, 119, 'Every island before Final Horizon should be completed');
      assertEqual(progress.completedIslandNumbers.includes(120), false, 'Final Horizon should remain current');
    },
  },
  {
    name: 'uses meaningful canonical ledgers as visited hints without granting completion',
    run: () => {
      const progress = resolveIslandRunOrbitProgress({
        currentIslandNumber: 4,
        cycleIndex: 0,
        maxIslandCount: 120,
        completedStopsByIsland: { '4': ['hatchery'], '7': ['wisdom-tree'], '8': [], invalid: ['market'] },
        perIslandEggs: { '7': { status: 'dormant' }, '9': { status: 'hatched' }, '121': { status: 'hatched' } },
      });

      assertEqual(progress.visitedIslandNumbers.join(','), '7,9', 'Only valid non-current ledger islands should be visited');
      assertEqual(progress.completedIslandNumbers.includes(7), false, 'Visited hints must not imply completion');
    },
  },
];
