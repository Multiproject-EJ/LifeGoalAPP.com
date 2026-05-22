import { selectDailyLifeUpgradeCandidate } from '../dailyLifeUpgradeCandidate';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)} but received ${String(actual)}`);
  }
}

export function runDailyLifeUpgradeCandidateTests(): void {
  const hardestFirst = selectDailyLifeUpgradeCandidate({
    habits: [
      { id: 'h1', title: 'Run 5k daily' },
      { id: 'h2', title: 'Read one page' },
    ],
    recentLogs: [
      { habit_id: 'h1', completed: true },
      { habit_id: 'h1', skipped: true },
      { habit_id: 'h2', completed: true },
      { habit_id: 'h2', completed: true },
      { habit_id: 'h2', completed: true },
      { habit_id: 'h2', completed: true },
      { habit_id: 'h2', completed: true },
      { habit_id: 'h2', completed: true },
      { habit_id: 'h2', completed: true },
      { habit_id: 'h2', completed: true },
    ],
  });
  assertEqual(hardestFirst?.habitId, 'h1', 'Should pick the hardest habit first');
  assertEqual(hardestFirst?.recommendationType, 'shrink_to_tiny', 'Hardest candidate should be shrink recommendation');

  const skipsArchivedPaused = selectDailyLifeUpgradeCandidate({
    habits: [
      { id: 'archived', title: 'Old habit', status: 'archived' },
      { id: 'paused', title: 'Paused habit', paused_at: '2026-05-01T00:00:00Z' },
      { id: 'active', title: 'Active habit' },
    ],
    recentLogs: [{ habit_id: 'active', completed: true }],
  });
  assertEqual(skipsArchivedPaused?.habitId, 'active', 'Should skip archived and paused habits');

  const noneActive = selectDailyLifeUpgradeCandidate({
    habits: [
      { id: 'a', title: 'A', status: 'archived' },
      { id: 'b', title: 'B', status: 'paused' },
    ],
    recentLogs: [],
  });
  assertEqual(noneActive, null, 'Should return null when no active habits exist');

  const stableTie = selectDailyLifeUpgradeCandidate({
    habits: [
      { id: 'b-id', title: 'Same Title' },
      { id: 'a-id', title: 'Same Title' },
    ],
    recentLogs: [
      { habit_id: 'b-id', completed: true },
      { habit_id: 'a-id', completed: true },
    ],
  });
  assertEqual(stableTie?.habitId, 'a-id', 'Tie should break deterministically by habit id');

  const highConsistency = selectDailyLifeUpgradeCandidate({
    habits: [{ id: 'consistency', title: 'Practice piano' }],
    recentLogs: Array.from({ length: 14 }, () => ({ habit_id: 'consistency', completed: true })),
  });
  assertEqual(
    highConsistency?.recommendationType,
    'upgrade_to_stretch',
    'High consistency should produce upgrade recommendation',
  );
}
