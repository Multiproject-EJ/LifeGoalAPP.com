import { buildQuestCompassViewModel } from '../questCompassViewModel';

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
}
