import {
  resolveIslandRunCrewRelayPercent,
  resolveIslandRunCrewRelaySimulation,
} from '../islandRunCrewRelaySimulation';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const tests = [
  {
    name: 'crew preview is deterministic and clearly bounded below completion',
    run: () => {
      const first = resolveIslandRunCrewRelaySimulation({
        eventId: 'lucky_spin:123',
        islandNumber: 1,
      });
      const second = resolveIslandRunCrewRelaySimulation({
        eventId: 'lucky_spin:123',
        islandNumber: 1,
      });
      assert(first.initialPercent === second.initialPercent, 'same event should keep the same simulated baseline');
      assert(first.initialPercent >= 48 && first.initialPercent <= 64, 'baseline should leave room for player contribution');
      assert(first.members.length === 3, 'preview should show a compact simulated crew');
    },
  },
  {
    name: 'player actions advance the preview and clamp at the shared goal',
    run: () => {
      const simulation = resolveIslandRunCrewRelaySimulation({
        eventId: 'space_excavator:456',
        islandNumber: 4,
      });
      const oneAction = resolveIslandRunCrewRelayPercent({ simulation, playerActions: 1 });
      const manyActions = resolveIslandRunCrewRelayPercent({ simulation, playerActions: 200 });
      assert(oneAction === simulation.initialPercent + simulation.progressPerPlayerAction, 'one action should visibly move the goal');
      assert(manyActions === 100, 'crew progress must not exceed 100%');
    },
  },
];

for (const test of tests) {
  try {
    test.run();
    console.log(`✓ ${test.name}`);
  } catch (error) {
    console.error(`✗ ${test.name}`);
    throw error;
  }
}
