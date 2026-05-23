import {
  claimWelcomePackStarterCards,
  WELCOME_PACK_CARD_COUNT,
  WELCOME_PACK_RESOLVER_VERSION,
} from '../islandRunWelcomePackClaimAction';
import { claimFirstSessionCreaturePackReward, FIRST_SESSION_CREATURE_PACK_CARD_COUNT } from '../islandRunFirstSessionCreaturePackAction';
import { __resetIslandRunActionMutexesForTests } from '../islandRunActionMutex';
import {
  readIslandRunGameStateRecord,
  resetIslandRunRuntimeCommitCoordinatorForTests,
  writeIslandRunGameStateRecord,
  type IslandRunGameStateRecord,
} from '../islandRunGameStateStore';
import {
  __resetIslandRunStateStoreForTests,
  refreshIslandRunStateFromLocal,
} from '../islandRunStateStore';
import { assert, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const USER_ID = 'welcome-pack-claim-action-test-user';

function makeSession() {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: { id: USER_ID, user_metadata: {} },
  } as unknown as import('@supabase/supabase-js').Session;
}

function resetEnvironment(): void {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunActionMutexesForTests();
  __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
}

async function seedState(overrides: Partial<IslandRunGameStateRecord>): Promise<void> {
  const session = makeSession();
  const base = readIslandRunGameStateRecord(session);
  await writeIslandRunGameStateRecord({ session, client: null, record: { ...base, ...overrides } });
  refreshIslandRunStateFromLocal(session);
}

function totalCreatureCopies(record: Pick<IslandRunGameStateRecord, 'creatureCollection'>): number {
  return record.creatureCollection.reduce((sum, entry) => sum + entry.copies, 0);
}

export const islandRunWelcomePackClaimActionTests: TestCase[] = [
  {
    name: 'claimWelcomePackStarterCards grants exactly five cards and marks welcomePackClaimed',
    run: async () => {
      resetEnvironment();
      await seedState({ runtimeVersion: 3, welcomePackClaimed: false, creatureCollection: [], dicePool: 12, essence: 34, spinTokens: 8 });

      const result = await claimWelcomePackStarterCards({ session: makeSession(), client: null, nowMs: 1234 });
      const persisted = readIslandRunGameStateRecord(makeSession());

      assertEqual(result.status, 'claimed', 'fresh user should claim welcome pack');
      assert(result.revealPayload, 'claim should return reveal payload');
      assertEqual(result.revealPayload?.resolverVersion, WELCOME_PACK_RESOLVER_VERSION, 'resolver version should be included');
      assertEqual(result.revealPayload?.cardCount, WELCOME_PACK_CARD_COUNT, 'payload should report five cards');
      assertEqual(result.revealPayload?.cards.length, WELCOME_PACK_CARD_COUNT, 'exactly five cards should be returned');
      assertEqual(persisted.welcomePackClaimed, true, 'welcome pack claim marker should be set');
      assertEqual(totalCreatureCopies(persisted), WELCOME_PACK_CARD_COUNT, 'collection should gain exactly five cards');
      assertEqual(persisted.dicePool, 12, 'welcome pack slice D should not grant dice');
      assertEqual(persisted.essence, 34, 'welcome pack slice D should not grant essence');
      assertEqual(persisted.spinTokens, 8, 'welcome pack slice D should not grant tickets/spin tokens');
    },
  },
  {
    name: 'claimWelcomePackStarterCards is idempotent after claim',
    run: async () => {
      resetEnvironment();
      await seedState({ runtimeVersion: 0, welcomePackClaimed: false, creatureCollection: [] });

      const first = await claimWelcomePackStarterCards({ session: makeSession(), client: null, nowMs: 2000 });
      const second = await claimWelcomePackStarterCards({ session: makeSession(), client: null, nowMs: 3000 });
      const persisted = readIslandRunGameStateRecord(makeSession());

      assertEqual(first.status, 'claimed', 'first claim should succeed');
      assertEqual(second.status, 'already_claimed', 'second claim should be idempotent');
      assertEqual(second.revealPayload, null, 'second claim should not re-reveal cards');
      assertEqual(totalCreatureCopies(persisted), WELCOME_PACK_CARD_COUNT, 'repeated claims should not duplicate cards');
      assertEqual(persisted.runtimeVersion, 1, 'repeated claim should not create extra commits');
    },
  },
  {
    name: 'claimWelcomePackStarterCards handles legacy/default seeded state',
    run: async () => {
      resetEnvironment();
      await seedState({ welcomePackClaimed: false, creatureCollection: [] });
      const result = await claimWelcomePackStarterCards({ session: makeSession(), client: null });
      assertEqual(result.status, 'claimed', 'legacy/default rows with welcomePackClaimed=false should be eligible');
    },
  },
  {
    name: 'first-session creature pack behavior remains unchanged',
    run: async () => {
      resetEnvironment();
      await seedState({
        runtimeVersion: 0,
        currentIslandNumber: 1,
        cycleIndex: 0,
        dicePool: 4,
        firstSessionTutorialState: 'first_creature_pack_available',
        creatureCollection: [],
        welcomePackClaimed: false,
      });

      const result = await claimFirstSessionCreaturePackReward({ session: makeSession(), client: null, nowMs: 7777 });
      const persisted = readIslandRunGameStateRecord(makeSession());

      assertEqual(result.status, 'claimed', 'first-session creature pack should still claim successfully');
      assertEqual(result.revealPayload?.cards.length, FIRST_SESSION_CREATURE_PACK_CARD_COUNT, 'first-session pack should still return five cards');
      assertEqual(persisted.dicePool, 104, 'first-session pack should still grant +100 dice');
    },
  },
];
