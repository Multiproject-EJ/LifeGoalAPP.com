import {
  readIslandRunGameStateRecord,
  resetIslandRunRuntimeCommitCoordinatorForTests,
  writeIslandRunGameStateRecord,
  type IslandRunGameStateRecord,
} from '../islandRunGameStateStore';
import { __resetIslandRunStateStoreForTests, refreshIslandRunStateFromLocal } from '../islandRunStateStore';
import { __resetIslandRunActionMutexesForTests } from '../islandRunActionMutex';
import {
  settleSkyboundSortie,
  startSkyboundSortie,
  upgradeSkyboundFleetPart,
} from '../islandRunSkyboundAcademyActions';
import { createSkyboundAcademyEventProgress } from '../skyboundAcademyStorage';
import { SKYBOUND_STARTER_UPGRADES, createSkyboundFlight } from '../skyboundExpeditionFlight';
import { assert, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const USER_ID = 'skybound-actions-user';
const EVENT_ID = 'skybound_expedition:academy-test';
const OTHER_EVENT_ID = 'feeding_frenzy:other-test';
const session = () => ({ user: { id: USER_ID, user_metadata: {} } }) as unknown as import('@supabase/supabase-js').Session;

function reset(overrides: Partial<IslandRunGameStateRecord>): void {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunActionMutexesForTests();
  __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
  const base = readIslandRunGameStateRecord(session());
  void writeIslandRunGameStateRecord({ session: session(), client: null, record: { ...base, ...overrides } });
  refreshIslandRunStateFromLocal(session());
}

function academyEventOverrides(): Partial<IslandRunGameStateRecord> {
  return {
    activeTimedEvent: {
      eventId: EVENT_ID,
      eventType: 'skybound_expedition',
      startedAtMs: 1_000,
      expiresAtMs: 9_999_999_999_999,
      version: 5,
    },
    rewardBarBoundEventId: EVENT_ID,
    rewardBarLadderId: 'skybound_expedition_ladder_v1',
  };
}

function flightResult(options: { distance: number; salvage: number; rings: number; hazards: number }) {
  return {
    ...createSkyboundFlight({
      power: 1,
      angleDeg: 40,
      upgrades: SKYBOUND_STARTER_UPGRADES,
      levelId: 'meadow',
    }),
    status: 'landed' as const,
    x: options.distance,
    maxAltitude: 70,
    salvageCollected: options.salvage,
    ringsCleared: options.rings,
    hazardHits: options.hazards,
  };
}

export const islandRunSkyboundAcademyActionsTests: TestCase[] = [
  {
    name: 'a valid launch spends exactly one shared event ticket and starts one canonical sortie',
    run: async () => {
      reset({
        ...academyEventOverrides(),
        minigameTicketsByEvent: { [EVENT_ID]: 2, [OTHER_EVENT_ID]: 7 },
      });
      const launched = await startSkyboundSortie({
        session: session(),
        client: null,
        eventId: EVENT_ID,
        attemptId: 'sortie-1',
        lessonId: 'cadet_launch',
      });
      assertEqual(launched.ok, true, 'valid sortie should launch');
      assertEqual(launched.ticketsRemaining, 1, 'one launch should spend one ticket');
      assertEqual(launched.progress.progress.sorties, 1, 'sortie count should increment once');
      assertEqual(launched.progress.activeAttemptId, 'sortie-1', 'active attempt should persist');
      assertEqual(launched.record.minigameTicketsByEvent[OTHER_EVENT_ID], 7, 'unrelated ticket wallets must remain unchanged');
      assertEqual(launched.record.skyboundAcademyProgressByEvent[EVENT_ID]?.salvage, 0, 'production event should begin with no free salvage');
    },
  },
  {
    name: 'a ticketless launch is rejected without creating progress or spending another wallet',
    run: async () => {
      reset({
        ...academyEventOverrides(),
        minigameTicketsByEvent: { [EVENT_ID]: 0, [OTHER_EVENT_ID]: 5 },
      });
      const blocked = await startSkyboundSortie({
        session: session(),
        client: null,
        eventId: EVENT_ID,
        attemptId: 'blocked-sortie',
        lessonId: 'cadet_launch',
      });
      assertEqual(blocked.ok, false, 'ticketless sortie should not launch');
      assertEqual(blocked.failureReason, 'insufficient_tickets', 'failure should explain the wallet gate');
      assertEqual(blocked.record.skyboundAcademyProgressByEvent[EVENT_ID], undefined, 'failed launch should not persist Academy state');
      assertEqual(blocked.record.minigameTicketsByEvent[OTHER_EVENT_ID], 5, 'other event wallet must remain untouched');
    },
  },
  {
    name: 'two simultaneous launches serialize so the final shared ticket can only start one flight',
    run: async () => {
      reset({
        ...academyEventOverrides(),
        minigameTicketsByEvent: { [EVENT_ID]: 1 },
      });
      const results = await Promise.all([
        startSkyboundSortie({ session: session(), client: null, eventId: EVENT_ID, attemptId: 'race-a', lessonId: 'cadet_launch' }),
        startSkyboundSortie({ session: session(), client: null, eventId: EVENT_ID, attemptId: 'race-b', lessonId: 'cadet_launch' }),
      ]);
      assertEqual(results.filter((result) => result.ok).length, 1, 'only one concurrent launch should succeed');
      assertEqual(results.filter((result) => result.failureReason === 'insufficient_tickets').length, 1, 'the queued launch should observe the spent wallet');
      assertEqual(results[1]!.record.minigameTicketsByEvent[EVENT_ID], 0, 'the shared wallet must never become negative');
      assertEqual(results[1]!.record.skyboundAcademyProgressByEvent[EVENT_ID]?.progress.sorties, 1, 'only one sortie should persist');
    },
  },
  {
    name: 'an Ace flight credits the reward bar once and duplicate settlement is idempotent',
    run: async () => {
      reset({
        ...academyEventOverrides(),
        rewardBarProgress: 0,
        minigameTicketsByEvent: { [EVENT_ID]: 1 },
      });
      await startSkyboundSortie({
        session: session(),
        client: null,
        eventId: EVENT_ID,
        attemptId: 'ace-sortie',
        lessonId: 'cadet_launch',
      });
      const flight = flightResult({ distance: 200, salvage: 6, rings: 2, hazards: 0 });
      const settled = await settleSkyboundSortie({ session: session(), client: null, eventId: EVENT_ID, attemptId: 'ace-sortie', flight });
      assertEqual(settled.ok, true, 'active sortie should settle');
      assertEqual(settled.evaluation.ace, true, 'all three standards should earn Ace');
      assertEqual(settled.rewardBarProgressAdded, 8, 'Ace should double the normal four-point event completion');
      assert(settled.salvageAwarded > 0, 'flight score should become earned upgrade salvage');
      const duplicate = await settleSkyboundSortie({ session: session(), client: null, eventId: EVENT_ID, attemptId: 'ace-sortie', flight });
      assertEqual(duplicate.alreadySettled, true, 'same attempt should be recognized as settled');
      assertEqual(duplicate.rewardBarProgressAdded, 0, 'duplicate must not credit the reward bar twice');
      assertEqual(duplicate.salvageAwarded, 0, 'duplicate must not award salvage twice');
      assertEqual(duplicate.record.rewardBarProgress, 8, 'canonical reward bar should retain exactly one Ace payout');
    },
  },
  {
    name: 'a first exam pass refills shared tickets once and earned salvage buys a persistent upgrade',
    run: async () => {
      const progress = createSkyboundAcademyEventProgress(10);
      progress.progress.completedLessonIds = ['cadet_launch', 'cadet_gates', 'cadet_weather'];
      progress.salvage = 200;
      reset({
        ...academyEventOverrides(),
        minigameTicketsByEvent: { [EVENT_ID]: 1 },
        skyboundAcademyProgressByEvent: { [EVENT_ID]: progress },
      });
      const upgrade = await upgradeSkyboundFleetPart({ session: session(), client: null, eventId: EVENT_ID, kind: 'launcher' });
      assertEqual(upgrade.ok, true, 'earned salvage should buy a launcher upgrade');
      assertEqual(upgrade.progress.upgrades.launcher, 1, 'upgrade level should persist canonically');
      assertEqual(upgrade.progress.salvage, 90, 'level-zero launcher upgrade should cost 110 salvage');
      await startSkyboundSortie({
        session: session(),
        client: null,
        eventId: EVENT_ID,
        attemptId: 'cadet-exam-pass',
        lessonId: 'cadet_exam',
      });
      const flight = flightResult({ distance: 400, salvage: 8, rings: 3, hazards: 0 });
      const settled = await settleSkyboundSortie({ session: session(), client: null, eventId: EVENT_ID, attemptId: 'cadet-exam-pass', flight });
      assertEqual(settled.ticketsAwarded, 3, 'Cadet exam should award its three-ticket refill');
      assertEqual(settled.ticketsRemaining, 3, 'launch spends the last ticket before the three-ticket refill');
      assert(settled.progress.progress.promotedRankIds.includes('trainee'), 'exam should unlock the Prop Trainer rank');
      const duplicate = await settleSkyboundSortie({ session: session(), client: null, eventId: EVENT_ID, attemptId: 'cadet-exam-pass', flight });
      assertEqual(duplicate.ticketsAwarded, 0, 'duplicate exam callback should not refill tickets again');
      assertEqual(duplicate.ticketsRemaining, 3, 'shared wallet should remain unchanged after duplicate callback');
    },
  },
];
