import { evaluateHabitDesign } from '../habitDesignEngine';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)} but received ${String(actual)}`);
  }
}

export function runHabitDesignEngineTests(): void {
  const frequentMisses = evaluateHabitDesign({
    completionRate: 0.22,
    streakConsistency: 0.3,
    missesLast14: 10,
    skipsLast14: 2,
    logsLast14: 5,
  });
  assertEqual(
    frequentMisses.recommendation.recommendation,
    'shrink_to_tiny',
    'Frequent misses should recommend shrinking the habit',
  );

  const highConsistency = evaluateHabitDesign({
    completionRate: 0.98,
    streakConsistency: 0.92,
    missesLast14: 0,
    skipsLast14: 0,
    logsLast14: 12,
  });
  assertEqual(
    highConsistency.recommendation.recommendation,
    'upgrade_to_stretch',
    'High consistency should recommend leveling up',
  );

  const stale = evaluateHabitDesign({
    completionRate: 0.1,
    streakConsistency: 0.1,
    missesLast14: 0,
    skipsLast14: 0,
    logsLast14: 0,
  });
  assertEqual(stale.recommendation.recommendation, 'restart_gently', 'No logs should recommend gentle restart');

  const environmentRisk = evaluateHabitDesign({
    completionRate: 0.45,
    streakConsistency: 0.55,
    missesLast14: 3,
    skipsLast14: 2,
    logsLast14: 7,
    environmentRiskTags: ['noise', 'commute', 'device_distraction'],
  });
  assertEqual(
    environmentRisk.recommendation.recommendation,
    'add_environment_cue',
    'Environment risk tags should recommend cue improvements',
  );

  const healthy = evaluateHabitDesign({
    completionRate: 0.82,
    streakConsistency: 0.74,
    missesLast14: 1,
    skipsLast14: 1,
    logsLast14: 8,
  });
  const healthyReco = healthy.recommendation.recommendation;
  if (healthyReco !== 'celebrate_consistency' && healthyReco !== 'no_change') {
    throw new Error(`Healthy consistency should be stable; got ${healthyReco}`);
  }
}
