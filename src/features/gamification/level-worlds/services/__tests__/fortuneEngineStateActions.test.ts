/**
 * Fortune Engine state-action tests: launch spend (golden vs ticket),
 * run-result folding (points/fragments/essence), milestone claims (including
 * event-ticket returns), and the one-shot finale reward — all through the
 * canonical store commit path.
 */
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
  applyFortuneEngineFinaleResult,
  applyFortuneEngineLaunch,
  applyFortuneEngineRunResult,
  claimFortuneEngineMilestoneReward,
  initFortuneEngineProgressForEvent,
} from '../islandRunStateActions';
import {
  FORTUNE_ENGINE_FINALE_REWARD,
  FORTUNE_ENGINE_MILESTONES,
  getFortuneEngineDayKey,
} from '../fortuneEngineProgression';
import { __resetIslandRunFeatureFlagsForTests } from '../../../../../config/islandRunFeatureFlags';
import {
  assert,
  assertDeepEqual,
  assertEqual,
  createMemoryStorage,
  installWindowWithStorage,
  type TestCase,
} from './testHarness';

const USER_ID = 'fortune-engine-test-user';
const EVENT_ID = 'lucky_spin:1700000000000';

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

function resetAll(): void {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunStateStoreForTests();
  __resetIslandRunFeatureFlagsForTests();
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

export const fortuneEngineStateActionsTests: TestCase[] = [
  {
    name: 'first launch of the day is golden (free), the second spends a ticket',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 5,
        minigameTicketsByEvent: { [EVENT_ID]: 3, 'companion_feast:other': 4 },
      });
      const nowMs = Date.now();

      const golden = applyFortuneEngineLaunch({ session, client: null, eventId: EVENT_ID, nowMs });
      assertEqual(golden.ok, true, 'golden launch should succeed');
      assertEqual(golden.golden, true, 'first launch of the day should be golden');
      assertEqual(golden.ticketsRemaining, 3, 'golden launch should spend no tickets');
      assertEqual(golden.record.minigameTicketsByEvent[EVENT_ID], 3, 'ticket bucket should be untouched');
      assertEqual(golden.progress?.totalLaunches, 1, 'launch counter should increment');
      assertEqual(
        golden.progress?.goldenLaunchDayKey,
        getFortuneEngineDayKey(nowMs),
        'golden launch should stamp the day key',
      );

      const ticketed = applyFortuneEngineLaunch({ session, client: null, eventId: EVENT_ID, nowMs });
      assertEqual(ticketed.ok, true, 'ticket launch should succeed');
      assertEqual(ticketed.golden, false, 'second launch of the day is not golden');
      assertEqual(ticketed.ticketsRemaining, 2, 'ticket launch should spend one ticket');
      assertEqual(ticketed.record.minigameTicketsByEvent['companion_feast:other'], 4, 'unrelated buckets stay untouched');
      assertEqual(ticketed.progress?.totalLaunches, 2, 'launch counter should keep incrementing');
    },
  },
  {
    name: 'ticketless launch fails cleanly once the golden launch is used',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 5,
        minigameTicketsByEvent: {},
      });
      const nowMs = Date.now();

      const golden = applyFortuneEngineLaunch({ session, client: null, eventId: EVENT_ID, nowMs });
      assertEqual(golden.ok, true, 'the golden launch should still work with zero tickets');

      const blocked = applyFortuneEngineLaunch({ session, client: null, eventId: EVENT_ID, nowMs });
      assertEqual(blocked.ok, false, 'a second ticketless launch should be blocked');
      assertEqual(blocked.failureReason, 'insufficient_tickets', 'failure reason should be insufficient tickets');
      assertEqual(blocked.record.fortuneEngineProgressByEvent[EVENT_ID].totalLaunches, 1, 'blocked launches must not count');
    },
  },
  {
    name: 'run results accumulate points, light fragments in order, and credit essence',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 5, essence: 100, essenceLifetimeEarned: 100 });
      initFortuneEngineProgressForEvent({ session, client: null, eventId: EVENT_ID });

      const first = applyFortuneEngineRunResult({
        session,
        client: null,
        eventId: EVENT_ID,
        runScore: 80,
        eventPoints: 80,
        fragmentAwarded: true,
        essence: 12,
      });
      assertEqual(first.progress?.eventPoints, 80, 'event points should persist');
      assertEqual(first.awardedFragmentId, 0, 'first fragment lights slot 0');
      assertDeepEqual(first.progress?.fragmentIds, [0], 'fragment ledger should persist');
      assertEqual(first.record.essence, 112, 'run essence should credit the wallet');
      assertEqual(first.record.essenceLifetimeEarned, 112, 'lifetime essence should track the credit');
      assertEqual(first.coreJustCompleted, false, 'one fragment does not complete the core');

      const second = applyFortuneEngineRunResult({
        session,
        client: null,
        eventId: EVENT_ID,
        runScore: 40,
        eventPoints: 40,
        fragmentAwarded: false,
        essence: 0,
      });
      assertEqual(second.progress?.eventPoints, 120, 'points accumulate across runs');
      assertEqual(second.progress?.bestRunScore, 80, 'best score should stay at the higher run');
      assertEqual(second.awardedFragmentId, null, 'no fragment without an award');
    },
  },
  {
    name: 'milestone claims pay wallet rewards once and can return event tickets',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 5,
        dicePool: 10,
        minigameTicketsByEvent: { [EVENT_ID]: 1 },
      });
      initFortuneEngineProgressForEvent({ session, client: null, eventId: EVENT_ID });
      applyFortuneEngineRunResult({
        session,
        client: null,
        eventId: EVENT_ID,
        runScore: 250,
        eventPoints: 250,
        fragmentAwarded: false,
      });

      const diceMilestone = FORTUNE_ENGINE_MILESTONES[0];
      const diceClaim = claimFortuneEngineMilestoneReward({ session, client: null, eventId: EVENT_ID, milestoneId: diceMilestone.id });
      assertEqual(diceClaim.ok, true, 'reached milestone should claim');
      assertEqual(diceClaim.record.dicePool, 10 + (diceMilestone.reward.dicePool ?? 0), 'dice reward should credit the wallet');

      const repeatClaim = claimFortuneEngineMilestoneReward({ session, client: null, eventId: EVENT_ID, milestoneId: diceMilestone.id });
      assertEqual(repeatClaim.ok, false, 'double claims should be rejected');
      assertEqual(repeatClaim.failureReason, 'already_claimed', 'double claim reason');

      const ticketMilestone = FORTUNE_ENGINE_MILESTONES.find((milestone) => (milestone.reward.eventTickets ?? 0) > 0);
      assert(ticketMilestone, 'a ticket-returning milestone should exist');
      const ticketClaim = claimFortuneEngineMilestoneReward({ session, client: null, eventId: EVENT_ID, milestoneId: ticketMilestone!.id });
      assertEqual(ticketClaim.ok, true, 'ticket milestone should claim at 250 points');
      assertEqual(
        ticketClaim.record.minigameTicketsByEvent[EVENT_ID],
        1 + (ticketMilestone!.reward.eventTickets ?? 0),
        'ticket reward should land in the event bucket',
      );

      const unreached = claimFortuneEngineMilestoneReward({ session, client: null, eventId: EVENT_ID, milestoneId: 'fortune_7' });
      assertEqual(unreached.ok, false, 'unreached milestones should not claim');
      assertEqual(unreached.failureReason, 'not_achieved', 'unreached claim reason');
    },
  },
  {
    name: 'golden launches stamp and extend the golden streak',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 5,
        minigameTicketsByEvent: { [EVENT_ID]: 3 },
      });
      const dayMs = 24 * 60 * 60 * 1000;
      const nowMs = Date.now();

      const first = applyFortuneEngineLaunch({ session, client: null, eventId: EVENT_ID, nowMs });
      assertEqual(first.progress?.goldenStreakCount, 1, 'the first golden launch starts a streak of 1');

      const ticketed = applyFortuneEngineLaunch({ session, client: null, eventId: EVENT_ID, nowMs });
      assertEqual(ticketed.golden, false, 'the second same-day launch is ticket-funded');
      assertEqual(ticketed.progress?.goldenStreakCount, 1, 'ticket launches leave the streak untouched');

      const nextDay = applyFortuneEngineLaunch({ session, client: null, eventId: EVENT_ID, nowMs: nowMs + dayMs });
      assertEqual(nextDay.golden, true, 'the next day offers a new golden launch');
      assertEqual(nextDay.progress?.goldenStreakCount, 2, 'a consecutive-day golden launch extends the streak');

      const lapsed = applyFortuneEngineLaunch({ session, client: null, eventId: EVENT_ID, nowMs: nowMs + 4 * dayMs });
      assertEqual(lapsed.golden, true, 'a later day still offers the golden launch');
      assertEqual(lapsed.progress?.goldenStreakCount, 1, 'a missed day restarts the streak');
    },
  },
  {
    name: 'fragment milestones light Fortune Core slots when claimed',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 5 });
      initFortuneEngineProgressForEvent({ session, client: null, eventId: EVENT_ID });
      applyFortuneEngineRunResult({
        session,
        client: null,
        eventId: EVENT_ID,
        runScore: 150,
        eventPoints: 150,
        fragmentAwarded: false,
      });

      const fragmentMilestone = FORTUNE_ENGINE_MILESTONES.find((milestone) => (milestone.reward.coreFragments ?? 0) > 0);
      assert(fragmentMilestone, 'a fragment milestone should exist on the track');
      const claim = claimFortuneEngineMilestoneReward({ session, client: null, eventId: EVENT_ID, milestoneId: fragmentMilestone!.id });
      assertEqual(claim.ok, true, 'the fragment milestone should claim at 150 points');
      assertDeepEqual(claim.progress?.fragmentIds, [0], 'the claim should light the lowest missing fragment');
    },
  },
  {
    name: 'finale is gated on a complete core, pays once, and failed attempts change nothing',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 5, dicePool: 0, shards: 0, essence: 0, essenceLifetimeEarned: 0 });
      initFortuneEngineProgressForEvent({ session, client: null, eventId: EVENT_ID });

      const early = applyFortuneEngineFinaleResult({ session, client: null, eventId: EVENT_ID, success: true });
      assertEqual(early.ok, false, 'an incomplete core should block the finale');
      assertEqual(early.failureReason, 'core_incomplete', 'early finale reason');

      for (let i = 0; i < 9; i += 1) {
        applyFortuneEngineRunResult({
          session,
          client: null,
          eventId: EVENT_ID,
          runScore: 10,
          eventPoints: 10,
          fragmentAwarded: true,
        });
      }

      const failed = applyFortuneEngineFinaleResult({ session, client: null, eventId: EVENT_ID, success: false });
      assertEqual(failed.ok, false, 'a failed finale attempt should not complete');
      assertEqual(failed.failureReason, 'not_successful', 'failed finale reason');
      assertEqual(failed.record.dicePool, 0, 'failed finale should pay nothing');
      assertEqual(failed.record.fortuneEngineProgressByEvent[EVENT_ID].finaleCompleted, false, 'failed finale should stay open');

      const success = applyFortuneEngineFinaleResult({ session, client: null, eventId: EVENT_ID, success: true });
      assertEqual(success.ok, true, 'a successful finale should complete');
      assertEqual(success.record.dicePool, FORTUNE_ENGINE_FINALE_REWARD.dicePool, 'finale dice reward should credit');
      assertEqual(success.record.shards, FORTUNE_ENGINE_FINALE_REWARD.shards, 'finale shard reward should credit');
      assertEqual(success.record.essence, FORTUNE_ENGINE_FINALE_REWARD.essence, 'finale essence reward should credit');
      assertEqual(success.progress?.finaleCompleted, true, 'the trophy flag should persist');

      const repeat = applyFortuneEngineFinaleResult({ session, client: null, eventId: EVENT_ID, success: true });
      assertEqual(repeat.ok, false, 'the finale reward is one-shot');
      assertEqual(repeat.failureReason, 'already_completed', 'repeat finale reason');
      assertEqual(repeat.record.dicePool, FORTUNE_ENGINE_FINALE_REWARD.dicePool, 'repeat attempts must not double-pay');
    },
  },
  {
    name: 'fortune engine progress survives a localStorage round-trip',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 5 });
      initFortuneEngineProgressForEvent({ session, client: null, eventId: EVENT_ID });
      applyFortuneEngineRunResult({
        session,
        client: null,
        eventId: EVENT_ID,
        runScore: 55,
        eventPoints: 55,
        fragmentAwarded: true,
      });

      const reread = readIslandRunGameStateRecord(session);
      const entry = reread.fortuneEngineProgressByEvent[EVENT_ID];
      assert(entry, 'progress entry should persist to localStorage');
      assertEqual(entry.eventPoints, 55, 'event points should round-trip');
      assertDeepEqual(entry.fragmentIds, [0], 'fragment ids should round-trip');
      assertEqual(entry.finaleCompleted, false, 'finale flag should round-trip');
    },
  },
];
