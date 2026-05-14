import {
  claimFirstSessionCreaturePackReward,
  FIRST_SESSION_CREATURE_PACK_CARD_COUNT,
  FIRST_SESSION_CREATURE_PACK_DICE_REWARD,
  FIRST_SESSION_CREATURE_PACK_RESOLVER_VERSION,
} from '../islandRunFirstSessionCreaturePackAction';
import { __resetIslandRunActionMutexesForTests } from '../islandRunActionMutex';
import {
  readIslandRunGameStateRecord,
  resetIslandRunRuntimeCommitCoordinatorForTests,
  writeIslandRunGameStateRecord,
  type IslandRunFirstSessionTutorialState,
  type IslandRunGameStateRecord,
} from '../islandRunGameStateStore';
import {
  __resetIslandRunStateStoreForTests,
  refreshIslandRunStateFromLocal,
} from '../islandRunStateStore';
import { assert, assertDeepEqual, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

declare const process: { cwd: () => string };

const USER_ID = 'first-session-creature-pack-action-test-user';

function makeSession() {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: USER_ID,
      user_metadata: {},
    },
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
  await writeIslandRunGameStateRecord({
    session,
    client: null,
    record: { ...base, ...overrides },
  });
  refreshIslandRunStateFromLocal(session);
}

function totalCreatureCopies(record: Pick<IslandRunGameStateRecord, 'creatureCollection'>): number {
  return record.creatureCollection.reduce((sum, entry) => sum + entry.copies, 0);
}

export const islandRunFirstSessionCreaturePackActionTests: TestCase[] = [
  {
    name: 'claimFirstSessionCreaturePackReward grants five cards, +100 dice, and advances tutorial state',
    run: async () => {
      resetEnvironment();
      await seedState({
        runtimeVersion: 7,
        currentIslandNumber: 1,
        cycleIndex: 0,
        dicePool: 4,
        firstSessionTutorialState: 'first_creature_pack_available',
        creatureCollection: [],
        eggRewardInventory: [],
        diamonds: 3,
        shards: 2,
      });

      const result = await claimFirstSessionCreaturePackReward({
        session: makeSession(),
        client: null,
        nowMs: 123456,
      });

      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(result.status, 'claimed', 'Eligible first free Creature Pack claim should succeed');
      assert(result.revealPayload, 'Claim should return a reveal payload');
      assertEqual(result.revealPayload?.source, 'first_session_onboarding_creature_pack', 'Reveal payload should identify onboarding source');
      assertEqual(result.revealPayload?.resolverVersion, FIRST_SESSION_CREATURE_PACK_RESOLVER_VERSION, 'Reveal payload should include resolver version');
      assertEqual(result.revealPayload?.cardCount, FIRST_SESSION_CREATURE_PACK_CARD_COUNT, 'Reveal payload should report five cards');
      assertEqual(result.revealPayload?.diceGranted, FIRST_SESSION_CREATURE_PACK_DICE_REWARD, 'Reveal payload should report +100 dice');
      assertEqual(result.revealPayload?.cards.length, FIRST_SESSION_CREATURE_PACK_CARD_COUNT, 'Claim should return exactly five creature card results');
      assertEqual(result.revealPayload?.cards[0]?.tier, 'common', 'Slot 1 should guarantee a common starter-friendly creature');
      assertEqual(persisted.dicePool, 104, 'Claim should grant exactly +100 dice');
      assertEqual(persisted.firstSessionTutorialState, 'first_creature_pack_claimed', 'Claim should advance tutorial state to claimed');
      assertEqual(persisted.runtimeVersion, 8, 'Claim should commit one atomic runtime update');
      assertEqual(totalCreatureCopies(persisted), FIRST_SESSION_CREATURE_PACK_CARD_COUNT, 'Canonical collection should receive exactly five creature copies');
      assertDeepEqual(
        persisted.creatureCollection.map((entry) => entry.creatureId).sort(),
        (result.revealPayload?.cards ?? []).map((card) => card.creatureId).sort(),
        'Canonical collection creature ids should match reveal cards',
      );
      assertDeepEqual(persisted.eggRewardInventory, [], 'Claim should not mutate egg inventory');
      assertEqual(persisted.diamonds, 3, 'Claim should not mutate diamonds');
      assertEqual(persisted.shards, 2, 'Claim should not mutate shards');
    },
  },
  {
    name: 'claimFirstSessionCreaturePackReward repeated attempts do not duplicate dice or creature grants',
    run: async () => {
      resetEnvironment();
      await seedState({
        runtimeVersion: 0,
        currentIslandNumber: 1,
        cycleIndex: 0,
        dicePool: 1,
        firstSessionTutorialState: 'first_creature_pack_available',
        creatureCollection: [],
      });

      const first = await claimFirstSessionCreaturePackReward({
        session: makeSession(),
        client: null,
        nowMs: 2000,
      });
      const second = await claimFirstSessionCreaturePackReward({
        session: makeSession(),
        client: null,
        nowMs: 3000,
      });

      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(first.status, 'claimed', 'First claim should succeed');
      assertEqual(second.status, 'already_claimed', 'Repeated claim should be an idempotent no-op');
      assertEqual(second.revealPayload, null, 'Repeated claim should not create a new reveal payload');
      assertEqual(persisted.dicePool, 101, 'Repeated claim should not grant dice again');
      assertEqual(totalCreatureCopies(persisted), FIRST_SESSION_CREATURE_PACK_CARD_COUNT, 'Repeated claim should not grant creature copies again');
      assertEqual(persisted.runtimeVersion, 1, 'Repeated claim should not create another commit');
    },
  },
  {
    name: 'claimFirstSessionCreaturePackReward rejects non-tutorial and outside-Island-1 onboarding states',
    run: async () => {
      const cases: Array<{
        name: string;
        firstSessionTutorialState: IslandRunFirstSessionTutorialState;
        currentIslandNumber: number;
        cycleIndex: number;
        failureReason: 'invalid_tutorial_state' | 'outside_first_island_onboarding';
      }> = [
        {
          name: 'non-tutorial player',
          firstSessionTutorialState: 'not_started',
          currentIslandNumber: 1,
          cycleIndex: 0,
          failureReason: 'invalid_tutorial_state',
        },
        {
          name: 'outside Island 1',
          firstSessionTutorialState: 'first_creature_pack_available',
          currentIslandNumber: 2,
          cycleIndex: 0,
          failureReason: 'outside_first_island_onboarding',
        },
        {
          name: 'outside cycle 0',
          firstSessionTutorialState: 'first_creature_pack_available',
          currentIslandNumber: 1,
          cycleIndex: 1,
          failureReason: 'outside_first_island_onboarding',
        },
      ];

      for (const testCase of cases) {
        resetEnvironment();
        await seedState({
          runtimeVersion: 10,
          currentIslandNumber: testCase.currentIslandNumber,
          cycleIndex: testCase.cycleIndex,
          dicePool: 6,
          firstSessionTutorialState: testCase.firstSessionTutorialState,
          creatureCollection: [],
        });

        const result = await claimFirstSessionCreaturePackReward({
          session: makeSession(),
          client: null,
          nowMs: 5000,
        });
        const persisted = readIslandRunGameStateRecord(makeSession());
        assertEqual(result.status, 'not_eligible', `${testCase.name}: claim should be rejected`);
        assertEqual(result.failureReason, testCase.failureReason, `${testCase.name}: failure reason should explain gate`);
        assertEqual(result.revealPayload, null, `${testCase.name}: rejected claim should not return reveal cards`);
        assertEqual(persisted.dicePool, 6, `${testCase.name}: rejected claim should not grant dice`);
        assertEqual(totalCreatureCopies(persisted), 0, `${testCase.name}: rejected claim should not grant creatures`);
        assertEqual(persisted.firstSessionTutorialState, testCase.firstSessionTutorialState, `${testCase.name}: rejected claim should preserve tutorial state`);
        assertEqual(persisted.runtimeVersion, 10, `${testCase.name}: rejected claim should not commit`);
      }
    },
  },
  {
    name: 'claimFirstSessionCreaturePackReward uses canonical runtime collection helper, not localStorage creature grants',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      // @ts-ignore island-run test tsconfig omits node type libs
      const pathMod = await import('path');
      const source = fsMod.readFileSync(
        pathMod.resolve(process.cwd(), 'src/features/gamification/level-worlds/services/islandRunFirstSessionCreaturePackAction.ts'),
        'utf8',
      );
      assert(/addCreatureToRuntimeCollection/.test(source), 'First pack claim should use canonical runtime creature collection helper');
      assert(!/\bcollectCreatureForUser\b/.test(source), 'First pack claim should not use localStorage creature collection API');
    },
  },
];
