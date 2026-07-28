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
import {
  applyMomentumMatrixPlacement,
  startMomentumMatrixRun,
} from '../islandRunStateActions';
import {
  assertEqual,
  createMemoryStorage,
  installWindowWithStorage,
  type TestCase,
} from './testHarness';

const USER_ID = 'momentum-matrix-test-user';
const EVENT_ID = 'feeding_frenzy:momentum-test';

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
  __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
}

function seedState(overrides: Partial<IslandRunGameStateRecord>): void {
  const session = makeSession();
  const base = readIslandRunGameStateRecord(session);
  void writeIslandRunGameStateRecord({
    session,
    client: null,
    record: { ...base, ...overrides },
  });
  refreshIslandRunStateFromLocal(session);
}

export const momentumMatrixStateActionsTests: TestCase[] = [
  {
    name: 'starting spends one event ticket and a resume spends none',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 4,
        minigameTicketsByEvent: { [EVENT_ID]: 2 },
      });
      const started = startMomentumMatrixRun({
        session,
        client: null,
        eventId: EVENT_ID,
        missionDirection: 'focus',
        nowMs: 100,
      });
      assertEqual(started.ok, true, 'new course should start');
      assertEqual(started.resumed, false, 'new course is not a resume');
      assertEqual(started.ticketsRemaining, 1, 'start should spend one ticket');
      assertEqual(started.progress.runsStarted, 1, 'run counter should increment');

      const resumed = startMomentumMatrixRun({
        session,
        client: null,
        eventId: EVENT_ID,
        missionDirection: 'energy',
        nowMs: 200,
      });
      assertEqual(resumed.ok, true, 'active course should resume');
      assertEqual(resumed.resumed, true, 'active course should report resume');
      assertEqual(resumed.ticketsRemaining, 1, 'resume must not spend another ticket');
      assertEqual(resumed.progress.activeRun?.missionDirection, 'focus', 'resume keeps the original mission');
    },
  },
  {
    name: 'placements persist the exact resumable board through the canonical record',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 4,
        minigameTicketsByEvent: { [EVENT_ID]: 1 },
      });
      const started = startMomentumMatrixRun({
        session,
        client: null,
        eventId: EVENT_ID,
        missionDirection: 'reset',
        nowMs: 100,
      });
      const placed = applyMomentumMatrixPlacement({
        session,
        client: null,
        eventId: EVENT_ID,
        trayIndex: 0,
        row: 0,
        column: 0,
        nowMs: 200,
      });
      assertEqual(placed.ok, true, 'first fragment should fit at the origin');
      const stored = readIslandRunGameStateRecord(session);
      assertEqual(
        stored.momentumMatrixProgressByEvent[EVENT_ID].activeRun?.score,
        placed.progress?.activeRun?.score,
        'stored score should match the action result',
      );
      assertEqual(stored.minigameTicketsByEvent[EVENT_ID] ?? 0, 0, 'placement should not spend another ticket');
      assertEqual(
        stored.momentumMatrixProgressByEvent[EVENT_ID].activeRun?.runId,
        started.progress.activeRun?.runId,
        'placement should preserve the resumable run identity',
      );
    },
  },
  {
    name: 'ticketless new course fails without creating progress',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 4, minigameTicketsByEvent: {} });
      const blocked = startMomentumMatrixRun({
        session,
        client: null,
        eventId: EVENT_ID,
        missionDirection: 'focus',
        nowMs: 100,
      });
      assertEqual(blocked.ok, false, 'ticketless course should be blocked');
      assertEqual(blocked.failureReason, 'insufficient_tickets', 'failure should explain ticket need');
      assertEqual(blocked.progress.runsStarted, 0, 'blocked launch must not count');
    },
  },
];
