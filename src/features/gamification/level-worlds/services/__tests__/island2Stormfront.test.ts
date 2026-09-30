import type { Session } from '@supabase/supabase-js';
import { readIslandRunGameStateRecord, resetIslandRunRuntimeCommitCoordinatorForTests, writeIslandRunGameStateRecord, type IslandRunGameStateRecord } from '../islandRunGameStateStore';
import { __resetIslandRunStateStoreForTests, getIslandRunStateSnapshot, resetIslandRunStateSnapshot } from '../islandRunStateStore';
import { __resetIslandRunActionMutexesForTests } from '../islandRunActionMutex';
import { createOpeningGamesCampaignLedger, sanitizeIslandRunSignatureMissionProgress } from '../islandRunSignatureMissions';
import { getStopUpgradeCost } from '../islandRunContractV2EssenceBuild';
import { resolveIslandRunCompletion } from '../islandRunCompletion';
import {
  STORMFRONT_KEY_PATTERN,
  applyStormfrontFundStep,
  applyStormfrontStrike,
  createStormfrontProgress,
  getStormfrontKey,
  getStormfrontLevelCost,
  mergeStormfrontProgress,
  resolveStormfrontCompletionValue,
  resolveStormfrontProgress,
  sanitizeStormfrontProgress,
  shouldStrikeStormfront,
  type StormfrontProgress,
} from '../island2Stormfront';
import { fundIsland2StormfrontStructure, markIsland2StormfrontSeen, strikeIsland2Stormfront } from '../island2StormfrontActions';
import { assert, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const session = { user: { id: 'island2-stormfront-test', user_metadata: {} } } as Session;
const allL3 = () => Array.from({ length: 5 }, () => ({ buildLevel: 3, requiredEssence: 100, spentEssence: 100 }));
const allBuilt = () => Array.from({ length: 5 }, () => ({ objectiveComplete: true, buildComplete: true }));
const struck = (overrides: Partial<StormfrontProgress> = {}): StormfrontProgress => ({ ...createStormfrontProgress(), struckAtMs: 10, updatedAtMs: 10, ...overrides });

async function seed(overrides: Partial<IslandRunGameStateRecord> = {}) {
  resetIslandRunRuntimeCommitCoordinatorForTests(); __resetIslandRunStateStoreForTests(); __resetIslandRunActionMutexesForTests();
  installWindowWithStorage(createMemoryStorage());
  const state = { ...readIslandRunGameStateRecord(session), currentIslandNumber: 2, cycleIndex: 0,
    signatureMissionProgressByIsland: createOpeningGamesCampaignLedger(),
    stopBuildStateByIndex: allL3(), stopStatesByIndex: allBuilt(), ...overrides };
  await writeIslandRunGameStateRecord({ session, client: null, record: state });
  resetIslandRunStateSnapshot(session, state);
  return state;
}

export const island2StormfrontTests: TestCase[] = [
  {
    name: 'island2 stormfront: strikes once, only on new-campaign Island 002 with every landmark at Level 3',
    run: () => {
      const ledger = createOpeningGamesCampaignLedger();
      const base = { currentIslandNumber: 2, stopBuildStateByIndex: allL3(), signatureMissionProgressByIsland: ledger };
      assert(shouldStrikeStormfront(base, createStormfrontProgress()), 'all L3 on 002 triggers the storm');
      const oneL2 = allL3(); oneL2[4] = { ...oneL2[4], buildLevel: 2 };
      assert(!shouldStrikeStormfront({ ...base, stopBuildStateByIndex: oneL2 }, createStormfrontProgress()), 'every landmark must be L3, the centre included');
      assert(!shouldStrikeStormfront(base, struck()), 'never strikes twice');
      assert(!shouldStrikeStormfront({ ...base, currentIslandNumber: 3 }, createStormfrontProgress()), 'only Island 002');
      assert(!shouldStrikeStormfront({ ...base, signatureMissionProgressByIsland: {} }, createStormfrontProgress()), 'existing saves never get struck');
    },
  },
  {
    name: 'island2 stormfront: the strike drops the four outer landmarks to Level 2 with fresh Level-3 funding',
    run: () => {
      const result = applyStormfrontStrike({
        state: { currentIslandNumber: 2, cycleIndex: 0, stopBuildStateByIndex: allL3(), stopStatesByIndex: allBuilt() },
        progress: createStormfrontProgress(),
        nowMs: 50,
      });
      for (const index of [0, 1, 2, 3]) {
        assertEqual(result.stopBuildStateByIndex[index].buildLevel, 2, `landmark ${index} loses a level`);
        assertEqual(result.stopBuildStateByIndex[index].spentEssence, 0, `landmark ${index} funding restarts`);
        assertEqual(result.stopBuildStateByIndex[index].requiredEssence,
          getStopUpgradeCost({ islandNumber: 2, stopIndex: index, currentBuildLevel: 2 }), `landmark ${index} needs the Level-3 cost`);
        assertEqual(result.stopStatesByIndex[index].buildComplete, false, `landmark ${index} is no longer built`);
      }
      assertEqual(result.stopBuildStateByIndex[4].buildLevel, 3, 'the central landmark is spared');
      assertEqual(result.stopStatesByIndex[4].buildComplete, true, 'the central landmark stays built');
      assertEqual(result.progress.struckAtMs, 50, 'the strike is stamped');
    },
  },
  {
    name: 'island2 stormfront: structures fund like landmarks, three levels each, never beyond money held',
    run: () => {
      assertEqual(applyStormfrontFundStep({ progress: createStormfrontProgress(), structureId: 'sky-hangar', islandNumber: 2, cycleIndex: 0, money: 999, nowMs: 1 }).status, 'not_struck', 'nothing to build before the storm');
      assertEqual(applyStormfrontFundStep({ progress: struck(), structureId: 'bunker', islandNumber: 2, cycleIndex: 0, money: 999, nowMs: 1 }).status, 'unknown_structure', 'unknown ids rejected');
      assertEqual(applyStormfrontFundStep({ progress: struck(), structureId: 'sky-hangar', islandNumber: 3, cycleIndex: 0, money: 999, nowMs: 1 }).status, 'wrong_island', 'only on Island 002');
      assertEqual(applyStormfrontFundStep({ progress: struck(), structureId: 'sky-hangar', islandNumber: 2, cycleIndex: 0, money: 0, nowMs: 1 }).status, 'insufficient_money', 'no money, no step');
      const partial = applyStormfrontFundStep({ progress: struck(), structureId: 'lightning-grid', islandNumber: 2, cycleIndex: 0, money: 3, nowMs: 1 });
      assertEqual(partial.status, 'ok', 'a small step is accepted');
      assertEqual(partial.spent, 3, 'never spends more than held');
      assertEqual(partial.money, 0, 'money is deducted');
      let progress = struck();
      let money = 1_000_000;
      let spentTotal = 0;
      for (let steps = 0; steps < 200 && progress.completedAtMs === null; steps += 1) {
        const id = progress.levels['lightning-grid'] < 3 ? 'lightning-grid' : 'sky-hangar';
        const step = applyStormfrontFundStep({ progress, structureId: id, islandNumber: 2, cycleIndex: 0, money, nowMs: 100 + steps });
        assertEqual(step.status, 'ok', 'funding proceeds');
        progress = step.progress; money = step.money; spentTotal += step.spent;
      }
      assertEqual(progress.levels['lightning-grid'], 3, 'grid reaches Level 3');
      assertEqual(progress.levels['sky-hangar'], 3, 'hangar reaches Level 3');
      assert(progress.completedAtMs !== null, 'completion stamped once both are Level 3');
      const expected = [0, 1, 2].reduce((sum, level) => sum
        + getStormfrontLevelCost({ structureId: 'lightning-grid', currentLevel: level, islandNumber: 2, cycleIndex: 0 })
        + getStormfrontLevelCost({ structureId: 'sky-hangar', currentLevel: level, islandNumber: 2, cycleIndex: 0 }), 0);
      assertEqual(spentTotal, expected, 'exact level costs, no overspend');
      assertEqual(progress.essenceSpent, expected, 'spend is tracked');
      assertEqual(applyStormfrontFundStep({ progress, structureId: 'sky-hangar', islandNumber: 2, cycleIndex: 0, money, nowMs: 999 }).status, 'already_complete', 'no funding past Level 3');
      assertEqual(JSON.stringify(resolveStormfrontCompletionValue(progress)), JSON.stringify({ value: 7, target: 7 }), 'completion full');
      assertEqual(resolveStormfrontCompletionValue(createStormfrontProgress()).value, 0, 'no credit before the strike');
      assertEqual(resolveStormfrontCompletionValue(struck()).value, 1, 'the strike itself is the first step');
    },
  },
  {
    name: 'island2 stormfront: sanitize and merge keep saves honest across devices',
    run: () => {
      assert(STORMFRONT_KEY_PATTERN.test(getStormfrontKey(0)) && STORMFRONT_KEY_PATTERN.test(getStormfrontKey(3)), 'own per-cycle key');
      assert(!STORMFRONT_KEY_PATTERN.test('0:2') && !STORMFRONT_KEY_PATTERN.test('01:2:stormfront'), 'never collides with the Island 002 mission key');
      const forged = sanitizeStormfrontProgress({ levels: { 'lightning-grid': 3, 'sky-hangar': 3 }, completedAtMs: 5 });
      assertEqual(forged.levels['sky-hangar'], 0, 'no structure progress before the strike');
      assertEqual(forged.completedAtMs, null, 'no completion before the strike');
      const clamped = sanitizeStormfrontProgress({ struckAtMs: 1, levels: { 'lightning-grid': 9, 'sky-hangar': 1 }, completedAtMs: 5 });
      assertEqual(clamped.levels['lightning-grid'], 3, 'levels clamp to 3');
      assertEqual(clamped.completedAtMs, null, 'completion needs both structures');
      const a = struck({ struckAtMs: 20, levels: { 'lightning-grid': 2, 'sky-hangar': 0 }, spentTowardLevel: { 'lightning-grid': 0, 'sky-hangar': 40 } });
      const b = struck({ struckAtMs: 10, levels: { 'lightning-grid': 1, 'sky-hangar': 1 }, spentTowardLevel: { 'lightning-grid': 80, 'sky-hangar': 0 } });
      const merged = mergeStormfrontProgress(a, b);
      assertEqual(merged.levels['lightning-grid'], 2, 'furthest grid wins');
      assertEqual(merged.spentTowardLevel['lightning-grid'], 0, 'with its own funding');
      assertEqual(merged.levels['sky-hangar'], 1, 'furthest hangar wins');
      assertEqual(merged.struckAtMs, 10, 'earliest strike kept');
      const ledger = sanitizeIslandRunSignatureMissionProgress({ [getStormfrontKey(0)]: a });
      assertEqual(resolveStormfrontProgress(ledger, 0).levels['lightning-grid'], 2, 'the ledger keeps the storm entry');
    },
  },
  {
    name: 'island2 stormfront: canonical actions strike once, fund with money and gate departure',
    run: async () => {
      await seed({ essence: 1_000_000 });
      assertEqual(resolveIslandRunCompletion(getIslandRunStateSnapshot(session)).requirements.find((item) => item.id === 'stormfront')?.complete, false, 'storm pending before the strike');
      const first = await strikeIsland2Stormfront({ session, client: null, nowMs: 100 });
      assertEqual(first.status, 'ok', 'strike commits');
      const afterStrike = getIslandRunStateSnapshot(session);
      assertEqual(afterStrike.stopBuildStateByIndex.slice(0, 4).map((entry) => entry.buildLevel).join(','), '2,2,2,2', 'outer landmarks fell');
      assertEqual((await strikeIsland2Stormfront({ session, client: null, nowMs: 200 })).status, 'not_ready', 'never strikes twice');
      assertEqual((await markIsland2StormfrontSeen({ session, client: null, nowMs: 300 })).status, 'ok', 'storm shown once');
      assertEqual((await markIsland2StormfrontSeen({ session, client: null, nowMs: 400 })).status, 'noop', 'and not replayed');
      const moneyBefore = getIslandRunStateSnapshot(session).essence;
      const step = await fundIsland2StormfrontStructure({ session, client: null, structureId: 'sky-hangar', nowMs: 500 });
      assertEqual(step.status, 'ok', 'hold step commits');
      const after = getIslandRunStateSnapshot(session);
      assertEqual(after.essence, moneyBefore - step.spent, 'money is spent canonically');
      assert(resolveStormfrontProgress(after.signatureMissionProgressByIsland, 0).spentTowardLevel['sky-hangar'] > 0, 'the hangar remembers its funding');
      assertEqual(resolveStormfrontProgress(after.signatureMissionProgressByIsland, 0).cinematicSeenAtMs, 300, 'seen stamp preserved');
      assert(!resolveIslandRunCompletion(after).complete, 'the island is not clear mid-add-on');
    },
  },
  {
    name: 'island2 stormfront: existing saves are never struck',
    run: async () => {
      await seed({ signatureMissionProgressByIsland: {} });
      assertEqual((await strikeIsland2Stormfront({ session, client: null, nowMs: 100 })).status, 'not_ready', 'legacy save untouched');
      assertEqual(getIslandRunStateSnapshot(session).stopBuildStateByIndex[0].buildLevel, 3, 'landmarks keep their level');
    },
  },
];
