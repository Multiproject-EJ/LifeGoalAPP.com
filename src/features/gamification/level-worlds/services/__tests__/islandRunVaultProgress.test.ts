import type { Session } from '@supabase/supabase-js';
import {
  __resetIslandRunStateStoreForTests,
  refreshIslandRunStateFromLocal,
} from '../islandRunStateStore';
import {
  readIslandRunGameStateRecord,
  resetIslandRunRuntimeCommitCoordinatorForTests,
  writeIslandRunGameStateRecord,
  type IslandRunGameStateRecord,
} from '../islandRunGameStateStore';
import { purchaseVaultIslandUpgrade } from '../islandRunVaultProgressAction';
import {
  getVaultIslandTotalInvested,
  mergeVaultIslandProgress,
  resolveVaultIslandExteriorFill,
  sanitizeVaultIslandProgress,
} from '../islandRunVaultProgress';
import {
  assertDeepEqual,
  assertEqual,
  createMemoryStorage,
  installWindowWithStorage,
  type TestCase,
} from './testHarness';

const session = {
  access_token: 'vault-progress-token',
  refresh_token: 'vault-progress-refresh',
  expires_in: 3600,
  token_type: 'bearer',
  user: { id: 'vault-progress-user', user_metadata: {} },
} as unknown as Session;

function completedVaultMission() {
  return {
    '0:4': {
      missionId: 'broken-causeway' as const,
      version: 1 as const,
      claimedPickupTileIndices: [1, 8, 11, 20, 26, 35],
      chargesEarned: 6,
      chargesSpent: 6,
      activatedStages: 3,
      lastActivatedStage: 3,
      completedAtMs: 400,
      updatedAtMs: 400,
    },
  };
}

function resetAndSeed(overrides: Partial<IslandRunGameStateRecord>) {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
  const base = readIslandRunGameStateRecord(session);
  void writeIslandRunGameStateRecord({ session, client: null, record: { ...base, ...overrides } });
  refreshIslandRunStateFromLocal(session);
}

export const islandRunVaultProgressTests: TestCase[] = [
  {
    name: 'sanitizes and conflict-merges the unique Vault upgrade ledger by ordered union',
    run: () => {
      assertDeepEqual(
        sanitizeVaultIslandProgress({ purchasedUpgradeIds: ['laser-grid', 'bad-id', 'limestone-works', 'laser-grid'] }),
        { purchasedUpgradeIds: ['limestone-works', 'laser-grid'] },
        'malformed and duplicate upgrade ids should be removed in canonical order',
      );
      assertDeepEqual(
        mergeVaultIslandProgress(
          { purchasedUpgradeIds: ['grand-palace', 'limestone-works'] },
          { purchasedUpgradeIds: ['shark-patrol', 'limestone-works'] },
        ),
        { purchasedUpgradeIds: ['limestone-works', 'grand-palace', 'shark-patrol'] },
        'cross-device merge should retain every unique purchase',
      );
    },
  },
  {
    name: 'derives visual construction and invested value from owned upgrade ids',
    run: () => {
      assertEqual(resolveVaultIslandExteriorFill(undefined), 30, 'the Island 004 gift includes the base structure');
      assertEqual(resolveVaultIslandExteriorFill({ purchasedUpgradeIds: ['limestone-works'] }), 54, 'limestone opens the garden construction stage');
      assertEqual(resolveVaultIslandExteriorFill({ purchasedUpgradeIds: ['limestone-works', 'grand-palace'] }), 82, 'the palace raises the full second storey');
      assertEqual(getVaultIslandTotalInvested({ purchasedUpgradeIds: ['limestone-works', 'shark-patrol'] }), 1_000, 'invested value is derived from fixed upgrade prices');
    },
  },
  {
    name: 'keeps Vault development locked before the Island 004 gift mission',
    run: () => {
      resetAndSeed({ essence: 10_000 });
      const result = purchaseVaultIslandUpgrade({ session, client: null, upgradeId: 'limestone-works' });
      assertEqual(result.status, 'vault_locked', 'construction cannot begin before the gift unlock');
      assertEqual(result.record.essence, 10_000, 'a locked purchase cannot spend Essence');
    },
  },
  {
    name: 'purchases one upgrade atomically with spend, lifetime spend, and milestone rewards',
    run: () => {
      resetAndSeed({
        runtimeVersion: 4,
        essence: 1_000,
        essenceLifetimeSpent: 90,
        dicePool: 12,
        signatureMissionProgressByIsland: completedVaultMission(),
      });
      const result = purchaseVaultIslandUpgrade({ session, client: null, upgradeId: 'limestone-works' });
      assertEqual(result.status, 'purchased', 'the first estate work should purchase after unlock');
      assertEqual(result.record.essence, 700, 'purchase price should leave the canonical wallet once');
      assertEqual(result.record.essenceLifetimeSpent, 390, 'Vault investment counts as normal lifetime spend');
      assertEqual(result.record.dicePool, 62, 'the authored milestone dice reward is paid atomically');
      assertDeepEqual(result.record.vaultIslandProgress.purchasedUpgradeIds, ['limestone-works'], 'the upgrade ledger commits with the spend');
      assertEqual(result.record.runtimeVersion, 5, 'purchase creates exactly one new runtime version');

      const repeated = purchaseVaultIslandUpgrade({ session, client: null, upgradeId: 'limestone-works' });
      assertEqual(repeated.status, 'already_owned', 'rapid repeat purchase is idempotent');
      assertEqual(repeated.record.essence, 700, 'repeat tap cannot spend twice');
      assertEqual(repeated.record.dicePool, 62, 'repeat tap cannot duplicate the reward');
    },
  },
  {
    name: 'enforces prerequisites and affordability for later palace and security works',
    run: () => {
      resetAndSeed({
        essence: 800,
        signatureMissionProgressByIsland: completedVaultMission(),
      });
      const prematurePalace = purchaseVaultIslandUpgrade({ session, client: null, upgradeId: 'grand-palace' });
      assertEqual(prematurePalace.status, 'prerequisite_locked', 'the palace requires limestone works');
      const limestone = purchaseVaultIslandUpgrade({ session, client: null, upgradeId: 'limestone-works' });
      assertEqual(limestone.status, 'purchased', 'the prerequisite can be built');
      const unaffordablePalace = purchaseVaultIslandUpgrade({ session, client: null, upgradeId: 'grand-palace' });
      assertEqual(unaffordablePalace.status, 'insufficient_essence', 'the later palace still competes for normal Essence');
      const frigate = purchaseVaultIslandUpgrade({ session, client: null, upgradeId: 'guardian-frigate' });
      assertEqual(frigate.status, 'prerequisite_locked', 'the frigate also requires palace and shark security');
    },
  },
];
