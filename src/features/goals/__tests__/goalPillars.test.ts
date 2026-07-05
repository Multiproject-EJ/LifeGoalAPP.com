import {
  computeGoalPillars,
  computeGoalPillarTotals,
  type GoalPillarComputeInput,
  type GoalPillarGoalInput,
} from '../goalPillars';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const NOW = new Date('2026-07-05T12:00:00Z');

function makeGoal(overrides: Partial<GoalPillarGoalInput> = {}): GoalPillarGoalInput {
  return {
    id: 'goal-1',
    title: 'Run a 10k',
    description: null,
    why_it_matters: null,
    life_wheel_category: null,
    target_date: null,
    status_tag: 'on_track',
    progress_notes: null,
    plan_quality_score: null,
    environment_score: null,
    environment_last_audited_at: null,
    ...overrides,
  };
}

export function runAllGoalPillarTests(): void {
  // --- Bare goal: everything low, boosts point at the first missing signal.
  const bare = computeGoalPillars({ goal: makeGoal(), now: NOW });
  assert(bare.insight.score === 0, `bare goal insight should be 0, got ${bare.insight.score}`);
  assert(bare.insight.level === 'low', 'bare goal insight level should be low');
  assert(
    bare.insight.boost === 'Write one line on why this goal matters.',
    'bare goal insight boost should ask for the why',
  );
  assert(bare.support.score === 0, 'bare goal support should be 0');
  assert(
    bare.support.boost === 'Link one small supporting habit to this goal.',
    'bare goal support boost should suggest a habit',
  );
  // Status on_track with no steps → 50% status completion → 20 momentum points.
  assert(bare.momentum.score === 20, `bare goal momentum should be 20, got ${bare.momentum.score}`);
  assert(bare.weakest === 'insight', 'ties should resolve to insight first');

  // --- Fully specified goal scores high on insight.
  const rich = computeGoalPillars({
    goal: makeGoal({
      why_it_matters: 'Because my health carries everything else I care about.',
      life_wheel_category: 'health_fitness',
      target_date: '2026-10-01',
      plan_quality_score: 5,
    }),
    now: NOW,
  });
  assert(rich.insight.score === 100, `full insight should be 100, got ${rich.insight.score}`);
  assert(rich.insight.boost === null, 'a full pillar should have no boost');
  assert(rich.insight.level === 'strong', 'full insight should be strong');

  // --- Momentum: plan + completed steps + healthy execution.
  const marching = computeGoalPillars({
    goal: makeGoal(),
    steps: [{ completed: true }, { completed: true }, { completed: false }, { completed: false }],
    healthState: 'on_track',
    now: NOW,
  });
  // 20 (plan) + 20 (50% of 40) + 40 (on_track) = 80
  assert(marching.momentum.score === 80, `marching momentum should be 80, got ${marching.momentum.score}`);
  assert(marching.momentum.level === 'strong', 'marching momentum should be strong');
  assert(
    marching.momentum.boost === 'Complete the next step on your plan.',
    'healthy momentum boost should point at the next step',
  );

  // --- Momentum: at-risk execution drags the score down.
  const stalled = computeGoalPillars({
    goal: makeGoal(),
    steps: [{ completed: false }],
    healthState: 'at_risk',
    now: NOW,
  });
  // 20 (plan) + 0 (0% steps) + 8 (at_risk) = 28
  assert(stalled.momentum.score === 28, `stalled momentum should be 28, got ${stalled.momentum.score}`);
  assert(
    stalled.momentum.boost === 'Log one small effort this week.',
    'stalled momentum boost should ask for one effort',
  );

  // --- Support: linked habits + fresh environment audit.
  const supported = computeGoalPillars({
    goal: makeGoal({
      life_wheel_category: 'health_fitness',
      environment_score: 4,
      environment_last_audited_at: '2026-06-20T00:00:00Z',
    }),
    habits: [
      { goal_id: 'goal-1', domain_key: 'health_fitness' },
      { goal_id: 'goal-1', domain_key: null },
      { goal_id: null, domain_key: 'health_fitness' },
    ],
    now: NOW,
  });
  // 33 (2 linked) + 32 (4/5 of 40) + 20 (fresh audit) = 85
  assert(supported.support.score === 85, `supported support should be 85, got ${supported.support.score}`);
  assert(supported.support.level === 'strong', 'supported support should be strong');

  // --- Support: archived habits never count; domain match gives partial credit.
  const partial = computeGoalPillars({
    goal: makeGoal({ life_wheel_category: 'health_fitness' }),
    habits: [
      { goal_id: 'goal-1', domain_key: null, archived: true },
      { goal_id: null, domain_key: 'health_fitness' },
    ],
    now: NOW,
  });
  assert(partial.support.score === 12, `partial support should be 12, got ${partial.support.score}`);
  assert(
    partial.support.boost === 'Link one small supporting habit to this goal.',
    'partial support boost should still suggest linking a habit',
  );

  // --- Stale audit gives half freshness credit and a refresh boost.
  const stale = computeGoalPillars({
    goal: makeGoal({
      environment_score: 5,
      environment_last_audited_at: '2026-01-01T00:00:00Z',
    }),
    habits: [{ goal_id: 'goal-1', domain_key: null }],
    now: NOW,
  });
  // 25 (1 linked) + 40 (5/5) + 10 (stale) = 75
  assert(stale.support.score === 75, `stale support should be 75, got ${stale.support.score}`);
  assert(
    stale.support.boost === 'Refresh the environment audit — it has gone stale.',
    'stale audit should ask for a refresh',
  );

  // --- Totals: achieved goals are excluded, averages are per-pillar.
  const inputs: GoalPillarComputeInput[] = [
    { goal: makeGoal({ id: 'a' }), now: NOW },
    {
      goal: makeGoal({
        id: 'b',
        why_it_matters: 'It matters because it changes my mornings.',
        life_wheel_category: 'health_fitness',
        target_date: '2026-10-01',
        plan_quality_score: 5,
      }),
      now: NOW,
    },
    { goal: makeGoal({ id: 'c', status_tag: 'achieved' }), now: NOW },
  ];
  const totals = computeGoalPillarTotals(inputs);
  assert(totals.goalCount === 2, `totals should count 2 active goals, got ${totals.goalCount}`);
  assert(totals.insight === 50, `totals insight should be 50, got ${totals.insight}`);
  assert(totals.support === 0, 'totals support should be 0');
  assert(totals.weakest === 'support', `weakest total should be support, got ${totals.weakest}`);

  const empty = computeGoalPillarTotals([]);
  assert(empty.goalCount === 0, 'empty totals should count 0 goals');
  assert(empty.overall === 0, 'empty totals overall should be 0');
}
