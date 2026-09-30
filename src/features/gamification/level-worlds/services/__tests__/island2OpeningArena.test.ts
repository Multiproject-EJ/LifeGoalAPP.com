import type { Session } from '@supabase/supabase-js';
import { readIslandRunGameStateRecord, resetIslandRunRuntimeCommitCoordinatorForTests, writeIslandRunGameStateRecord, type IslandRunGameStateRecord } from '../islandRunGameStateStore';
import { __resetIslandRunStateStoreForTests, getIslandRunStateSnapshot, resetIslandRunStateSnapshot } from '../islandRunStateStore';
import { __resetIslandRunActionMutexesForTests } from '../islandRunActionMutex';
import { createOpeningGamesCampaignLedger, sanitizeIslandRunSignatureMissionProgress } from '../islandRunSignatureMissions';
import { resolveIslandRunCompletion } from '../islandRunCompletion';
import {
  OPENING_ARENA_DELIVERY_ROLLS,
  OPENING_ARENA_KEY_PATTERN,
  applyOpeningArenaAnchor,
  applyOpeningArenaFundStep,
  applyOpeningArenaOrder,
  applyOpeningArenaRoll,
  createOpeningArenaProgress,
  getOpeningArenaKey,
  getOpeningArenaLevelCost,
  mergeOpeningArenaProgress,
  resolveOpeningArenaCompletionValue,
  resolveOpeningArenaProgress,
  resolveOpeningArenaStage,
  sanitizeOpeningArenaProgress,
} from '../island2OpeningArena';
import { anchorOpeningArenaHoverBase, fundOpeningArena, orderOpeningArenaHoverBase } from '../island2OpeningArenaActions';
import { assert, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const session = { user: { id: 'island2-opening-arena-test', user_metadata: {} } } as Session;
async function seed(overrides: Partial<IslandRunGameStateRecord> = {}) {
  resetIslandRunRuntimeCommitCoordinatorForTests(); __resetIslandRunStateStoreForTests(); __resetIslandRunActionMutexesForTests();
  installWindowWithStorage(createMemoryStorage());
  const state = { ...readIslandRunGameStateRecord(session), currentIslandNumber: 2, cycleIndex: 0,
    signatureMissionProgressByIsland: createOpeningGamesCampaignLedger(), ...overrides };
  await writeIslandRunGameStateRecord({ session, client: null, record: state });
  resetIslandRunStateSnapshot(session, state);
  return state;
}

export const island2OpeningArenaTests: TestCase[] = [
  {
    name: 'opening arena: order → delivered after 3 rolls → anchored → built to Level 3, in that order only',
    run: () => {
      let progress = createOpeningArenaProgress();
      assertEqual(resolveOpeningArenaStage(progress), 'order', 'starts unordered');
      progress = applyOpeningArenaOrder(progress, 10);
      assertEqual(progress.rollsUntilDelivery, OPENING_ARENA_DELIVERY_ROLLS, 'delivery countdown starts');
      let ledger: Record<string, unknown> = { [getOpeningArenaKey(0)]: progress };
      assertEqual(applyOpeningArenaRoll(ledger, 0, 3, 11), ledger, 'rolls elsewhere do nothing');
      for (let roll = 0; roll < OPENING_ARENA_DELIVERY_ROLLS - 1; roll += 1) ledger = applyOpeningArenaRoll(ledger, 0, 2, 20 + roll);
      assertEqual(resolveOpeningArenaStage(resolveOpeningArenaProgress(ledger, 0)), 'in_transit', 'still on its way');
      ledger = applyOpeningArenaRoll(ledger, 0, 2, 30);
      progress = resolveOpeningArenaProgress(ledger, 0);
      assertEqual(resolveOpeningArenaStage(progress), 'arriving', 'arrives after the third roll');
      assertEqual(applyOpeningArenaFundStep({ progress, islandNumber: 2, cycleIndex: 0, money: 999, nowMs: 31 }).status, 'not_anchored', 'no building before it is anchored');
      progress = applyOpeningArenaAnchor(progress, 40);
      assertEqual(resolveOpeningArenaStage(progress), 'building', 'anchored: build time');
      let money = 1_000_000; let spent = 0;
      for (let step = 0; step < 300 && resolveOpeningArenaStage(progress) !== 'complete'; step += 1) {
        const result = applyOpeningArenaFundStep({ progress, islandNumber: 2, cycleIndex: 0, money, nowMs: 50 + step });
        assertEqual(result.status, 'ok', 'funding proceeds');
        progress = result.progress; money = result.money; spent += result.spent;
      }
      const expected = [0, 1, 2].reduce((sum, level) => sum + getOpeningArenaLevelCost({ currentLevel: level, islandNumber: 2, cycleIndex: 0 }), 0);
      assertEqual(spent, expected, 'exact costs, three levels');
      assert(progress.completedAtMs !== null, 'complete');
      assertEqual(JSON.stringify(resolveOpeningArenaCompletionValue(progress)), JSON.stringify({ value: 5, target: 5 }), 'full requirement');
      assertEqual(applyOpeningArenaFundStep({ progress, islandNumber: 2, cycleIndex: 0, money, nowMs: 999 }).status, 'already_complete', 'no funding past L3');
    },
  },
  {
    name: 'opening arena: sanitize and merge keep saves honest',
    run: () => {
      assert(OPENING_ARENA_KEY_PATTERN.test(getOpeningArenaKey(0)) && !OPENING_ARENA_KEY_PATTERN.test('0:2'), 'own key');
      const forged = sanitizeOpeningArenaProgress({ arenaLevel: 3, anchoredAtMs: 1, completedAtMs: 1 });
      assertEqual(resolveOpeningArenaStage(forged), 'order', 'nothing counts before the order');
      const notAnchored = sanitizeOpeningArenaProgress({ orderedAtMs: 1, rollsUntilDelivery: 0, arenaLevel: 2 });
      assertEqual(notAnchored.arenaLevel, 0, 'no arena before anchoring');
      const a = { ...createOpeningArenaProgress(), orderedAtMs: 5, rollsUntilDelivery: 2 };
      const b = { ...createOpeningArenaProgress(), orderedAtMs: 3, rollsUntilDelivery: 1 };
      const merged = mergeOpeningArenaProgress(a, b);
      assertEqual(merged.orderedAtMs, 3, 'earliest order');
      assertEqual(merged.rollsUntilDelivery, 1, 'furthest delivery');
      assertEqual(resolveOpeningArenaProgress(sanitizeIslandRunSignatureMissionProgress({ [getOpeningArenaKey(0)]: b }), 0).rollsUntilDelivery, 1, 'the ledger keeps it');
    },
  },
  {
    name: 'opening arena: canonical actions order, anchor and fund on new-campaign Island 002, and gate departure',
    run: async () => {
      await seed({ essence: 1_000_000 });
      assertEqual(resolveIslandRunCompletion(getIslandRunStateSnapshot(session)).requirements.find((item) => item.id === 'opening_arena')?.value, 0, 'required on Island 002');
      assertEqual((await orderOpeningArenaHoverBase({ session, client: null, nowMs: 1 })).status, 'ok', 'ordered from the phone');
      assertEqual((await orderOpeningArenaHoverBase({ session, client: null, nowMs: 2 })).status, 'already_ordered', 'once');
      assertEqual((await anchorOpeningArenaHoverBase({ session, client: null, nowMs: 3 })).status, 'not_arriving', 'cannot anchor before delivery');
      const state = getIslandRunStateSnapshot(session);
      let ledger = state.signatureMissionProgressByIsland as Record<string, unknown>;
      for (let roll = 0; roll < OPENING_ARENA_DELIVERY_ROLLS; roll += 1) ledger = applyOpeningArenaRoll(ledger, 0, 2, 10 + roll);
      resetIslandRunStateSnapshot(session, { ...state, signatureMissionProgressByIsland: ledger as typeof state.signatureMissionProgressByIsland });
      assertEqual((await anchorOpeningArenaHoverBase({ session, client: null, nowMs: 20 })).status, 'ok', 'anchored after arrival');
      const before = getIslandRunStateSnapshot(session).essence;
      const step = await fundOpeningArena({ session, client: null, nowMs: 30 });
      assertEqual(step.status, 'ok', 'funded');
      assertEqual(getIslandRunStateSnapshot(session).essence, before - step.spent, 'money spent canonically');
      await seed({ currentIslandNumber: 2, signatureMissionProgressByIsland: {} });
      assertEqual((await orderOpeningArenaHoverBase({ session, client: null })).status, 'unavailable', 'existing saves keep their Island 002');
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const roll = fsMod.readFileSync('src/features/gamification/level-worlds/services/islandRunRollAction.ts', 'utf8');
      assert(roll.includes('applyOpeningArenaRoll('), 'rolls bring the hover base closer');
    },
  },
  {
    name: 'opening arena: the board shows the hover base in transit, plays its arrival, anchors canonically and opens the arena build modal',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(board.includes('void anchorOpeningArenaHoverBase({ session, client })'), 'anchoring is canonical, after the arrival');
      assert(board.includes('void orderOpeningArenaHoverBase({ session, client })'), 'ordered from the Mission Phone');
      assert(board.includes('onFundStep={() => fundOpeningArena({ session, client })}'), 'the arena build modal funds canonically');
      assert(board.includes('addOnMission={showMissionPhoneBriefing ? openingArenaAddOnMission ?? stormfrontAddOnMission : undefined}'), 'the arena comes before the storm on the phone');
      assert(board.includes("case 'arriving': return openingArenaArrivalBusy"), 'the arrival waits until nothing else is on screen');
      const base = fsMod.readFileSync('src/features/gamification/level-worlds/dev/OpeningArenaHoverBase.ts', 'utf8');
      assert(base.includes('construction.visible = anchored && arenaLevel < 3;') && base.includes('crowd.visible = arenaLevel >= 3;'), 'steel construction first, a full crowd at Level 3');
      const modal = fsMod.readFileSync('src/features/gamification/level-worlds/components/OpeningArenaBuildModal.tsx', 'utf8');
      assert(modal.includes('useControllerShopScrollLock()') && modal.includes('document.body'), 'portal + scroll lock');
    },
  },
];
