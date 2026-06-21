import { applyJourneyRewardToRecord, journeyEggRewardId } from '../combinedJourneyRewardGrant';
import { readIslandRunGameStateRecord, type IslandRunGameStateRecord } from '../islandRunGameStateStore';
import { createMemoryStorage, installWindowWithStorage, assert, assertEqual, type TestCase } from './testHarness';

function baseRecord(overrides: Partial<IslandRunGameStateRecord> = {}): IslandRunGameStateRecord {
  installWindowWithStorage(createMemoryStorage());
  const record = readIslandRunGameStateRecord({
    user: { id: 'journey-grant-test-user', user_metadata: {} },
  } as unknown as import('@supabase/supabase-js').Session);
  return { ...record, ...overrides };
}

export const combinedJourneyRewardGrantTests: TestCase[] = [
  {
    name: 'dice reward increments the dice pool',
    run: () => {
      const record = baseRecord({ dicePool: 3, runtimeVersion: 1 });
      const next = applyJourneyRewardToRecord(record, { kind: 'dice', amount: 10 }, { thresholdLevel: 2, nowMs: 1000 });
      assertEqual(next.dicePool, 13, 'dice pool grows by the reward amount');
      assertEqual(next.runtimeVersion, 2, 'runtime version bumps on grant');
    },
  },
  {
    name: 'essence reward increments balance and lifetime earned',
    run: () => {
      const record = baseRecord({ essence: 2, essenceLifetimeEarned: 2 });
      const next = applyJourneyRewardToRecord(record, { kind: 'essence', amount: 8 }, { thresholdLevel: 5, nowMs: 1000 });
      assertEqual(next.essence, 10, 'essence grows by the reward amount');
      assertEqual(next.essenceLifetimeEarned, 10, 'lifetime essence grows by the reward amount');
    },
  },
  {
    name: 'egg reward appends one unopened inventory entry with a stable id',
    run: () => {
      const record = baseRecord({ eggRewardInventory: [], currentIslandNumber: 7 });
      const next = applyJourneyRewardToRecord(record, { kind: 'egg', amount: 1 }, { thresholdLevel: 3, nowMs: 4242 });
      assertEqual(next.eggRewardInventory.length, 1, 'one egg appended');
      const entry = next.eggRewardInventory[0];
      assertEqual(entry.eggRewardId, journeyEggRewardId(3), 'egg id is deterministic for the threshold');
      assertEqual(entry.status, 'unopened', 'granted egg is unopened');
      assertEqual(entry.targetIslandNumber, 7, 'egg targets the current island');
      assertEqual(entry.grantedAtMs, 4242, 'egg records the grant time');
    },
  },
  {
    name: 'egg reward is idempotent for the same threshold',
    run: () => {
      const record = baseRecord({ eggRewardInventory: [] });
      const once = applyJourneyRewardToRecord(record, { kind: 'egg', amount: 1 }, { thresholdLevel: 6, nowMs: 1 });
      const twice = applyJourneyRewardToRecord(once, { kind: 'egg', amount: 1 }, { thresholdLevel: 6, nowMs: 2 });
      assertEqual(twice.eggRewardInventory.length, 1, 'the same threshold egg is not duplicated');
      assert(twice === once, 'no-op grant returns the same record reference');
    },
  },
  {
    name: 'reroll_capacity raises the persistent bonus max dice',
    run: () => {
      const record = baseRecord({ bonusMaxDice: 5 });
      const next = applyJourneyRewardToRecord(record, { kind: 'reroll_capacity', amount: 5 }, { thresholdLevel: 10, nowMs: 1 });
      assertEqual(next.bonusMaxDice, 10, 'bonus max dice grows by the reward amount');
      assertEqual(next.runtimeVersion, record.runtimeVersion + 1, 'runtime version bumps on grant');
    },
  },
];
