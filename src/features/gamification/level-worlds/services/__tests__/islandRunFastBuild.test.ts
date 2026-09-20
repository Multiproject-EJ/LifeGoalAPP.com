import { assert, assertEqual, type TestCase } from './testHarness';
import { readIslandRunGameStateRecord, type IslandRunGameStateRecord } from '../islandRunGameStateStore';
import type { Session } from '@supabase/supabase-js';
import { getEffectiveIslandNumber, getStopUpgradeCost, initStopBuildStatesForIsland } from '../islandRunContractV2EssenceBuild';
import { quoteIslandRunFastBuild, resolveIslandRunFastBuild } from '../islandRunFastBuild';

function record(island = 2, level = 0, cycle = 0): IslandRunGameStateRecord {
  const effective = getEffectiveIslandNumber(island, cycle);
  const session = { user: { id: 'fast-build-unit-fixture' } } as unknown as Session;
  return { ...readIslandRunGameStateRecord(session), currentIslandNumber: island, cycleIndex: cycle, islandStartedAtMs: 1234,
    firstSessionTutorialState: 'complete', essence: 1e12, essenceLifetimeSpent: 3, dicePool: 10, runtimeVersion: 5,
    stopBuildStateByIndex: initStopBuildStatesForIsland(effective).map((build, index) => ({ ...build, buildLevel: level,
      requiredEssence: getStopUpgradeCost({ islandNumber: effective, stopIndex: index, currentBuildLevel: level }) })),
    stopStatesByIndex: Array.from({ length: 5 }, () => ({ objectiveComplete: false, buildComplete: false })),
    activeStopIndex: 0, activeEggTier: 'rare', bossTrialResolvedIslandNumber: null,
  };
}
export const islandRunFastBuildTests: TestCase[] = [
  { name: 'fast building supports every island and all starting levels at the exact remaining price', run: () => {
    for (let island = 1; island <= 120; island++) for (let level = 0; level < 3; level++) {
      const before = record(island, level, island % 2);
      before.stopBuildStateByIndex[0].spentEssence = 7;
      const quote = quoteIslandRunFastBuild(before, 'island', 0)!;
      assert(quote, `quote island ${island} level ${level}`);
      let expected = -7;
      for (let stop = 0; stop < (island === 1 ? 4 : 5); stop++) for (let l = level; l < 3; l++) expected += getStopUpgradeCost({ islandNumber: getEffectiveIslandNumber(island, island % 2), stopIndex: stop, currentBuildLevel: l });
      assertEqual(quote.cost, expected, 'remaining cost');
      const result = resolveIslandRunFastBuild(before, quote);
      assert(result.applied, 'accepted');
      assertEqual(result.record.essence, before.essence - expected, 'exact spend');
      assertEqual(result.record.dicePool, 10 + (3 - level) * (island === 1 ? 4 : 5), 'dice per new level');
      assert(result.record.stopStatesByIndex.every(stop => !stop.objectiveComplete), 'activities remain');
      assertEqual(result.record.activeStopIndex, 0, 'no unlock');
      assertEqual(result.record.activeEggTier, 'rare', 'egg preserved');
      assertEqual(result.record.bossTrialResolvedIslandNumber, null, 'boss preserved');
      if (island === 1) assertEqual(result.record.stopBuildStateByIndex[4].buildLevel, level, 'Assembly excluded');
      assert(!resolveIslandRunFastBuild(result.record, quote).applied, 'replay cannot award/spend twice');
      assertEqual(before.stopBuildStateByIndex[0].buildLevel, level, 'input unmodified');
    }
  } },
  { name: 'landmark build preserves other buildings and funds only its remaining levels', run: () => {
    const before = record(39, 1); const quote = quoteIslandRunFastBuild(before, 'landmark', 2)!;
    const result = resolveIslandRunFastBuild(before, quote);
    assertEqual(result.record.stopBuildStateByIndex[2].buildLevel, 3, 'chosen landmark');
    assertEqual(result.record.stopBuildStateByIndex[0].buildLevel, 1, 'other landmark');
    assertEqual(result.diceAward, 2, 'only two levels');
  } },
  { name: 'fast build rejects insufficient money, stale progress, expired discount and another visit atomically', run: () => {
    const before = record(); const quote = quoteIslandRunFastBuild(before, 'island', 0)!;
    const poor = { ...before, essence: quote.cost - 1 };
    assertEqual(resolveIslandRunFastBuild(poor, quote).record, poor, 'no partial charge');
    assert(!resolveIslandRunFastBuild({ ...before, islandStartedAtMs: 4321 }, quote).applied, 'visit mismatch');
    const stale = { ...before, stopBuildStateByIndex: before.stopBuildStateByIndex.map((b,i) => i ? b : { ...b, spentEssence: 1 }) };
    assert(!resolveIslandRunFastBuild(stale, quote).applied, 'stale progress');
    const sale = quoteIslandRunFastBuild(before, 'island', 0, .25, 2000, 1000)!;
    assert(sale.cost < quote.cost, 'sale');
    assert(!resolveIslandRunFastBuild(before, sale, 2001).applied, 'expired sale');
    const exact = { ...before, essence: sale.cost };
    assertEqual(resolveIslandRunFastBuild(exact, sale, 1500).record.essence, 0, 'discount exact affordability');
  } },
  { name: 'guided tutorial and complete buildings cannot use fast mode', run: () => {
    const intro = { ...record(1), firstSessionTutorialState: 'build_modal_opened' as const };
    assertEqual(quoteIslandRunFastBuild(intro, 'island', 0), null, 'intro protected');
    assertEqual(quoteIslandRunFastBuild(record(2, 3), 'island', 0), null, 'complete protected');
    assertEqual(quoteIslandRunFastBuild(record(), 'landmark', -1), null, 'invalid protected');
  } },
];
