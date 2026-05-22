import { evaluateHabitDesign } from '../habitDesignEngine';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)} but received ${String(actual)}`);
  }
}

export function runHabitDesignEngineTests(): void {
  const frequentMisses = evaluateHabitDesign({
    habitId: 'h1',
    habitTitle: 'Run 5 miles daily',
    lifeWheelArea: 'Health',
    habitIntent: ['fitness'],
    completionRate: 0.22,
    streakConsistency: 0.3,
    missesLast14: 10,
    skipsLast14: 2,
    logsLast14: 5,
  });
  assertEqual(frequentMisses.recommendation.recommendation, 'try_alternative_path', 'Frequent misses should suggest alternatives');
  if (!frequentMisses.recommendation.alternatives || frequentMisses.recommendation.alternatives.length === 0) {
    throw new Error('Frequent misses should include alternatives');
  }

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
    habitId: 'h2',
    habitTitle: 'Journal nightly',
    lifeWheelArea: 'Mindset',
    completionRate: 0.1,
    streakConsistency: 0.1,
    missesLast14: 0,
    skipsLast14: 0,
    logsLast14: 0,
  });
  const staleReco = stale.recommendation.recommendation;
  if (staleReco !== 'restart_gently' && staleReco !== 'try_alternative_path') {
    throw new Error(`No logs should recommend gentle restart or alternative path; got ${staleReco}`);
  }

  const environmentRisk = evaluateHabitDesign({
    habitId: 'h3',
    habitTitle: 'Cook dinner at home',
    lifeWheelArea: 'Health',
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
    habitId: 'h4',
    habitTitle: 'Read 10 pages',
    lifeWheelArea: 'Mindset',
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
  if (healthy.recommendation.alternatives && healthy.recommendation.alternatives.length > 0) {
    throw new Error('Healthy habit should not include alternatives');
  }

  const noSameTitle = evaluateHabitDesign({
    habitId: 'h5',
    habitTitle: 'Walk 10 minutes',
    lifeWheelArea: 'Health',
    completionRate: 0.2,
    streakConsistency: 0.2,
    missesLast14: 9,
    skipsLast14: 2,
    logsLast14: 4,
  });
  const duplicate = noSameTitle.recommendation.alternatives?.find((alt) => alt.title.toLowerCase() === 'walk 10 minutes');
  if (duplicate) throw new Error('Alternatives should exclude near-identical title');
}
