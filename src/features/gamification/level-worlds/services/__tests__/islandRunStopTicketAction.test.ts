import {
  __resetIslandRunActionMutexesForTests,
} from '../islandRunActionMutex';
import { resetIslandRunRuntimeCommitCoordinatorForTests } from '../islandRunGameStateStore';
import {
  __resetIslandRunStateStoreForTests,
  getIslandRunStateSnapshot,
  resetIslandRunStateSnapshot,
} from '../islandRunStateStore';
import { purchaseIslandRunStopTicket } from '../islandRunStopTicketAction';
import {
  assertEqual,
  createMemoryStorage,
  installWindowWithStorage,
  type TestCase,
} from './testHarness';

const USER_ID = 'stop-ticket-action-user';

function makeSession() {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: { id: USER_ID, user_metadata: {} },
  } as unknown as import('@supabase/supabase-js').Session;
}

function resetAll(): void {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunActionMutexesForTests();
  __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
}

export const islandRunStopTicketActionTests: TestCase[] = [
  {
    name: 'stale concurrent pass requests cannot charge money or create a ticket',
    run: async () => {
      resetAll();
      const session = makeSession();
      const initial = getIslandRunStateSnapshot(session);
      resetIslandRunStateSnapshot(session, {
        ...initial,
        currentIslandNumber: 1,
        cycleIndex: 0,
        essence: 100,
        essenceLifetimeSpent: 5,
        stopTicketsPaidByIsland: {},
        stopStatesByIndex: initial.stopStatesByIndex.map((state, index) => ({
          ...state,
          objectiveComplete: index === 0,
        })),
      });

      const [first, second] = await Promise.all([
        purchaseIslandRunStopTicket({ session, client: null, stopIndex: 1 }),
        purchaseIslandRunStopTicket({ session, client: null, stopIndex: 1 }),
      ]);
      const snapshot = getIslandRunStateSnapshot(session);

      assertEqual(first.status, 'already_free', 'Landmarks no longer sell passes');
      assertEqual(second.status, 'already_free', 'A duplicate remains free');
      assertEqual(snapshot.essence, 100, 'Wallet is unchanged');
      assertEqual(snapshot.essenceLifetimeSpent, 5, 'Lifetime spend is unchanged');
      assertEqual(snapshot.stopTicketsPaidByIsland['1'], undefined, 'No obsolete pass is written');
    },
  },
  {
    name: 'insufficient balance leaves canonical state unchanged',
    run: async () => {
      resetAll();
      const session = makeSession();
      const initial = getIslandRunStateSnapshot(session);
      resetIslandRunStateSnapshot(session, {
        ...initial,
        currentIslandNumber: 1,
        essence: 29,
        essenceLifetimeSpent: 0,
        stopTicketsPaidByIsland: {},
        stopStatesByIndex: initial.stopStatesByIndex.map((state, index) => ({
          ...state,
          objectiveComplete: index === 0,
        })),
      });

      const result = await purchaseIslandRunStopTicket({ session, client: null, stopIndex: 1 });
      const snapshot = getIslandRunStateSnapshot(session);

      assertEqual(result.status, 'already_free', 'No balance is required for entry');
      assertEqual(snapshot.essence, 29, 'Rejected purchase must not change wallet');
      assertEqual(snapshot.stopTicketsPaidByIsland['1'], undefined, 'Rejected purchase must not add a pass');
    },
  },
];
