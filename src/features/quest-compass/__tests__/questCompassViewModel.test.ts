import {
  buildQuestCompassForceDetail,
  buildQuestCompassViewModel,
} from '../questCompassViewModel';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

export function runAllQuestCompassViewModelTests(): void {
  const emptyModel = buildQuestCompassViewModel([]);
  assert(!emptyModel.hasCheckinData, 'empty check-ins should return no-score state');
  assert(emptyModel.focusForce === null, 'empty state should not pick a focus force');
  assert(emptyModel.strongestForce === null, 'empty state should not pick a strongest force');

  const model = buildQuestCompassViewModel([
    {
      date: '2026-05-29',
      scores: {
        spirituality_community: 8,
        finance_wealth: 4,
        love_relations: 5,
        fun_creativity: 5,
        career_development: 6,
        health_fitness: 8,
        family_friends: 5,
        living_spaces: 6,
      },
    },
    {
      date: '2026-06-05',
      scores: {
        spirituality_community: 7,
        finance_wealth: 3,
        love_relations: 8,
        fun_creativity: 6,
        career_development: 9,
        health_fitness: 4,
        family_friends: 6,
        living_spaces: 6,
      },
    },
  ]);

  assert(model.hasCheckinData, 'latest valid check-in should create a scored model');
  assert(model.latestCheckinDate === '2026-06-05', 'latest check-in date should be surfaced');
  assert(model.strongestForce?.key === 'growth', 'career score should map to Growth strongest force');
  assert(model.focusForce?.key === 'wealth', 'finance score should map to Wealth focus force');

  const strength = model.forces.find((force) => force.key === 'strength');
  assert(strength?.score === 5, 'Strength should average Body & Energy and Home scores');
  assert(strength?.trend === 'falling', 'Strength should fall versus previous average');

  const connection = model.forces.find((force) => force.key === 'connection');
  assert(connection?.score === 7, 'Connection should average Love and Connections scores');
  assert(connection?.trend === 'rising', 'Connection should rise versus previous average');

  const fire = model.forces.find((force) => force.key === 'fire');
  assert(fire?.trend === 'rising', 'Fire should rise from previous Joy & Play score');
  assert(fire?.healthStatus === 'healthy', 'Fire score of 6 should be Healthy');
  assert(
    fire?.contributingCategories[0]?.score === 6,
    'Fire detail should expose the actual contributing category score',
  );

  const wealth = model.forces.find((force) => force.key === 'wealth');
  assert(wealth?.healthStatus === 'needs_care', 'Wealth score below 4 should need care');

  const connectionDetail = buildQuestCompassForceDetail({
    force: connection!,
    goals: [
      {
        id: 'goal-1',
        title: 'Reconnect weekly',
        status_tag: 'on_track',
        life_wheel_category: 'love_relations',
        progress_notes: '2 of 4 calls planned',
      },
      {
        id: 'goal-2',
        title: 'Old finished goal',
        status_tag: 'completed',
        life_wheel_category: 'family_friends',
      },
    ],
    habits: [
      {
        id: 'habit-1',
        title: 'Send a warm note',
        emoji: '💌',
        domain_key: 'family_friends',
        goal_id: null,
      },
    ],
    todayHabitLogs: [
      {
        habit_id: 'habit-1',
        done: true,
      },
    ],
    goalSteps: [
      {
        goal_id: 'goal-1',
        title: 'Text Alex today',
        completed: false,
        step_order: 1,
      },
    ],
  });

  assert(connectionDetail.relatedGoals.length === 1, 'detail should show active related goals only');
  assert(
    connectionDetail.supportingHabits[0]?.completionLabel === 'Completed today',
    'detail should show habit completion state when available',
  );
  assert(
    connectionDetail.recommendedAction.type === 'goal_step',
    'existing incomplete goal step should be the top recommendation',
  );

  const emptyDetail = buildQuestCompassForceDetail({
    force: fire!,
    goals: [],
    habits: [],
    todayHabitLogs: [],
    goalSteps: [],
  });
  assert(emptyDetail.relatedGoals.length === 0, 'missing goals should produce an empty related goals list');
  assert(emptyDetail.supportingHabits.length === 0, 'missing habits should produce an empty supporting habits list');
  assert(
    emptyDetail.recommendedAction.type === 'starter_quest',
    'scored force without goals or habits should recommend a starter quest',
  );

  const emptyForce = emptyModel.forces.find((force) => force.key === 'fire');
  const noSignalDetail = buildQuestCompassForceDetail({ force: emptyForce! });
  assert(
    noSignalDetail.recommendedAction.type === 'refresh_alignment',
    'unscored force should recommend refreshing alignment',
  );
}
