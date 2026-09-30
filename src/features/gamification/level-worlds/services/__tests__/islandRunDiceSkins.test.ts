import {
  readIslandRunGameStateRecord,
  resetIslandRunRuntimeCommitCoordinatorForTests,
  writeIslandRunGameStateRecord,
  type IslandRunGameStateRecord,
} from '../islandRunGameStateStore';
import { __resetIslandRunStateStoreForTests, getIslandRunStateSnapshot, refreshIslandRunStateFromLocal } from '../islandRunStateStore';
import {
  DICE_SKINS,
  DICE_SKINS_KEY,
  applyDiceSkinPurchase,
  applyDiceSkinSelection,
  createDiceSkinProgress,
  mergeDiceSkinProgress,
  sanitizeDiceSkinProgress,
} from '../islandRunDiceSkins';
import { purchaseDiceSkin, resolveDiceSkinProgress, selectDiceSkin } from '../islandRunDiceSkinActions';
import { sanitizeIslandRunSignatureMissionProgress } from '../islandRunSignatureMissions';
import { assert, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const USER_ID = 'dice-skins-test-user';

function makeSession() {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: { id: USER_ID, user_metadata: {} },
  } as unknown as import('@supabase/supabase-js').Session;
}

function seed(overrides: Partial<IslandRunGameStateRecord>) {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
  const session = makeSession();
  const base = readIslandRunGameStateRecord(session);
  void writeIslandRunGameStateRecord({ session, client: null, record: { ...base, ...overrides } });
  refreshIslandRunStateFromLocal(session);
  return session;
}

export const islandRunDiceSkinsTests: TestCase[] = [
  {
    name: 'Dice skins: six original skins, the starter is free and owned by everyone',
    run: () => {
      assertEqual(DICE_SKINS.length, 6, 'six skins');
      assertEqual(new Set(DICE_SKINS.map((skin) => skin.id)).size, 6, 'unique ids');
      assertEqual(DICE_SKINS.filter((skin) => skin.price === 0).length, 1, 'only the starter is free');
      assert(DICE_SKINS.some((skin) => skin.id === 'gold'), 'gold is on offer');
      assertEqual(createDiceSkinProgress().selectedSkinId, 'classic', 'starter selected by default');
    },
  },
  {
    name: 'Dice skins: buying spends money once and equips; selection needs ownership',
    run: () => {
      let progress = createDiceSkinProgress();
      const poor = applyDiceSkinPurchase(progress, 'gold', 100, 10);
      assert(!poor.applied && poor.reason === 'insufficient_money', 'cannot buy without money');
      const bought = applyDiceSkinPurchase(progress, 'jade', 1_000, 10);
      assert(bought.applied, 'jade bought');
      assertEqual(bought.money, 600, 'price deducted');
      progress = bought.progress;
      assertEqual(progress.selectedSkinId, 'jade', 'purchase equips');
      const again = applyDiceSkinPurchase(progress, 'jade', 1_000, 11);
      assert(!again.applied && again.reason === 'already_owned', 'no double charge');
      const locked = applyDiceSkinSelection(progress, 'gold', 12);
      assert(!locked.applied && locked.reason === 'not_owned', 'cannot equip unowned skin');
      const back = applyDiceSkinSelection(progress, 'classic', 12);
      assert(back.applied && back.progress.selectedSkinId === 'classic', 'starter always selectable');
    },
  },
  {
    name: 'Dice skins: sanitize drops junk and unowned selections; merge unions owned, newest selection wins',
    run: () => {
      const dirty = sanitizeDiceSkinProgress({ ownedSkinIds: ['gold', 'nope', 'gold', 'classic'], selectedSkinId: 'ember', selectedAtMs: 5 });
      assertEqual(dirty.ownedSkinIds.join(','), 'gold', 'unknown, duplicate and starter ids removed');
      assertEqual(dirty.selectedSkinId, 'classic', 'unowned selection falls back');
      const a = sanitizeDiceSkinProgress({ ownedSkinIds: ['jade'], selectedSkinId: 'jade', selectedAtMs: 10, updatedAtMs: 10 });
      const b = sanitizeDiceSkinProgress({ ownedSkinIds: ['gold'], selectedSkinId: 'gold', selectedAtMs: 20, updatedAtMs: 20 });
      const merged = mergeDiceSkinProgress(a, b);
      assertEqual(merged.ownedSkinIds.join(','), 'jade,gold', 'owned skins union in catalogue order');
      assertEqual(merged.selectedSkinId, 'gold', 'newest selection wins');
      assertEqual(mergeDiceSkinProgress(b, a).selectedSkinId, 'gold', 'merge is order independent');
      const ledger = sanitizeIslandRunSignatureMissionProgress({ [DICE_SKINS_KEY]: { ...b }, 'wrong-key': { ...b } });
      assert(Boolean(ledger[DICE_SKINS_KEY]), 'ledger keeps dice skins under its key');
      assert(!ledger['wrong-key'], 'ledger drops dice skins under other keys');
    },
  },
  {
    name: 'Dice skins: canonical purchase spends essence money and persists; select switches back',
    run: async () => {
      const session = seed({ essence: 1_500, essenceLifetimeSpent: 10, runtimeVersion: 3 });
      const bought = await purchaseDiceSkin({ session, client: null, skinId: 'moonstone', nowMs: 50 });
      assert(bought.applied, 'moonstone bought');
      let state = getIslandRunStateSnapshot(session);
      assertEqual(state.essence, 700, 'money spent');
      assertEqual(state.essenceLifetimeSpent, 810, 'lifetime spend tracked');
      assertEqual(resolveDiceSkinProgress(state).selectedSkinId, 'moonstone', 'equipped');
      const denied = await purchaseDiceSkin({ session, client: null, skinId: 'gold', nowMs: 60 });
      assert(!denied.applied, 'gold too expensive');
      assertEqual(getIslandRunStateSnapshot(session).essence, 700, 'failed purchase costs nothing');
      await selectDiceSkin({ session, client: null, skinId: 'classic', nowMs: 70 });
      state = getIslandRunStateSnapshot(session);
      assertEqual(resolveDiceSkinProgress(state).selectedSkinId, 'classic', 'switched back');
      assertEqual(resolveDiceSkinProgress(state).ownedSkinIds.join(','), 'moonstone', 'still owned');
    },
  },
];
