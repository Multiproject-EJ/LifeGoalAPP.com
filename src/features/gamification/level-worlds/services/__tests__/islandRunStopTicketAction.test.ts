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
    name: 'concurrent pass requests deduct once and persist one ticket',
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

      assertEqual(first.status, 'paid', 'First request should buy the pass');
      assertEqual(second.status, 'rejected', 'Queued duplicate should observe the paid ledger');
      if (second.status === 'rejected') {
        assertEqual(second.reason, 'already_paid', 'Duplicate should be rejected as already paid');
      }
      assertEqual(snapshot.essence, 70, 'Wallet should be charged exactly once');
      assertEqual(snapshot.essenceLifetimeSpent, 35, 'Lifetime spend should increase exactly once');
      assertEqual(snapshot.stopTicketsPaidByIsland['1']?.join(','), '1', 'Pass ledger should contain one stop entry');
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

      assertEqual(result.status, 'rejected', 'Short wallet should be rejected');
      if (result.status === 'rejected') {
        assertEqual(result.reason, 'insufficient_essence', 'Rejection should explain the shortfall');
      }
      assertEqual(snapshot.essence, 29, 'Rejected purchase must not change wallet');
      assertEqual(snapshot.stopTicketsPaidByIsland['1'], undefined, 'Rejected purchase must not add a pass');
    },
  },
];
