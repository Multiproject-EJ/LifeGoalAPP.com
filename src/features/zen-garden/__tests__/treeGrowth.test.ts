import { resolveWisdomTreeProgress } from '../treeGrowth';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)} but received ${String(actual)}`);
  }
}

export function runAllWisdomTreeGrowthTests(): void {
  assertEqual(
    resolveWisdomTreeProgress({
      treeScore: 3,
      stageMinScore: 0,
      nextMilestoneMinScore: 4,
      lotusFlowers: 0,
    }),
    75,
    'watering-only progress should stop at 75%',
  );

  assertEqual(
    resolveWisdomTreeProgress({
      treeScore: 3,
      stageMinScore: 0,
      nextMilestoneMinScore: 4,
      lotusFlowers: 4,
    }),
    100,
    'lotus flowers should unlock the final 25%',
  );

  assertEqual(
    resolveWisdomTreeProgress({
      treeScore: 22,
      stageMinScore: 22,
      nextMilestoneMinScore: null,
      lotusFlowers: 0,
    }),
    100,
    'fully grown tree should stay complete',
  );
}
