import type { Session } from '@supabase/supabase-js';
import {
  readIslandRunGameStateRecord,
  resetIslandRunRuntimeCommitCoordinatorForTests,
  writeIslandRunGameStateRecord,
  type IslandRunGameStateRecord,
} from '../islandRunGameStateStore';
import { __resetIslandRunStateStoreForTests, refreshIslandRunStateFromLocal } from '../islandRunStateStore';
import { __resetIslandRunRollActionMutexesForTests, executeIslandRunRollAction } from '../islandRunRollAction';
import { applyPassiveDiceRegenTick, applyTimedEventTicketSpend, applyTokenHopRewards } from '../islandRunStateActions';
import {
  formatIslandRunEconomyTelemetryReport,
  formatIslandRunEconomyTelemetrySnapshot,
  getIslandRunEconomyTelemetryReport,
  getIslandRunEconomyTelemetrySnapshot,
  ISLAND_RUN_ECONOMY_COUNTERS,
  ISLAND_RUN_ECONOMY_SINKS,
  ISLAND_RUN_ECONOMY_SOURCES,
  recordIslandRunDiceInflow,
  recordIslandRunDiceOutflow,
  recordIslandRunEconomyCounter,
  recordIslandRunMultiplierUsed,
  recordIslandRunRewardBarTierReached,
  resetIslandRunEconomyTelemetry,
} from '../islandRunEconomyTelemetry';
import { assert, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const USER_ID = 'economy-telemetry-test-user';

function makeSession(): Session {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: USER_ID,
      user_metadata: {},
    },
  } as unknown as Session;
}

function resetEnvironment(): void {
  installWindowWithStorage(createMemoryStorage());
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunStateStoreForTests();
  __resetIslandRunRollActionMutexesForTests();
  resetIslandRunEconomyTelemetry();
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

async function withMockedRandom<T>(values: number[], run: () => Promise<T>): Promise<T> {
  const originalRandom = Math.random;
  let index = 0;
  Math.random = () => {
    const value = values[Math.min(index, values.length - 1)] ?? 0;
    index += 1;
    return value;
  };
  try {
    return await run();
  } finally {
    Math.random = originalRandom;
  }
}

export const islandRunEconomyTelemetryTests: TestCase[] = [
  {
    name: 'central ledger attributes dice inflows and outflows and reconciles totals',
    run: () => {
      resetEnvironment();

      recordIslandRunDiceInflow({
        source: ISLAND_RUN_ECONOMY_SOURCES.rewardBarDice,
        amount: 12,
        sessionId: USER_ID,
        atMs: 1000,
      });
      recordIslandRunDiceInflow({
        source: ISLAND_RUN_ECONOMY_SOURCES.stickerCompletionBonusDice,
        amount: 100,
        sessionId: USER_ID,
        atMs: 1001,
      });
      recordIslandRunDiceOutflow({
        sink: ISLAND_RUN_ECONOMY_SINKS.rollSpendDice,
        amount: 5,
        sessionId: USER_ID,
        atMs: 1002,
      });

      const report = getIslandRunEconomyTelemetryReport(USER_ID);
      assertEqual(report.diceInflowBySource.reward_bar_dice, 12, 'Reward-bar dice should be attributed');
      assertEqual(report.diceInflowBySource.sticker_completion_bonus_dice, 100, 'Sticker completion dice should be attributed');
      assertEqual(report.diceOutflowBySink.roll_spend_dice, 5, 'Roll spend should be attributed');
      assertEqual(report.totalDiceInflow, 112, 'Total inflow should sum source buckets');
      assertEqual(report.totalDiceOutflow, 5, 'Total outflow should sum sink buckets');
      assertEqual(report.netDiceDelta, 107, 'Net dice delta should reconcile inflow minus outflow');
      assert(formatIslandRunEconomyTelemetryReport(USER_ID).includes('netDiceDelta'), 'Formatted report should be inspectable JSON');
    },
  },
  {
    name: 'Generate Example Snapshot exports copy-paste friendly economy telemetry JSON',
    run: () => {
      resetEnvironment();

      recordIslandRunDiceInflow({
        source: ISLAND_RUN_ECONOMY_SOURCES.rewardBarDice,
        amount: 12,
        sessionId: USER_ID,
        atMs: 1000,
      });
      recordIslandRunDiceInflow({
        source: ISLAND_RUN_ECONOMY_SOURCES.passiveRegenDice,
        amount: 3,
        sessionId: USER_ID,
        atMs: 1001,
      });
      recordIslandRunDiceOutflow({
        sink: ISLAND_RUN_ECONOMY_SINKS.rollSpendDice,
        amount: 5,
        sessionId: USER_ID,
        atMs: 1002,
      });
      recordIslandRunEconomyCounter({
        counter: ISLAND_RUN_ECONOMY_COUNTERS.rewardBarClaims,
        amount: 2,
        sessionId: USER_ID,
        atMs: 1003,
      });
      recordIslandRunEconomyCounter({
        counter: ISLAND_RUN_ECONOMY_COUNTERS.rewardBarChainedClaims,
        amount: 1,
        sessionId: USER_ID,
        atMs: 1004,
      });
      recordIslandRunEconomyCounter({
        counter: ISLAND_RUN_ECONOMY_COUNTERS.eventTicketsEarned,
        amount: 7,
        sessionId: USER_ID,
        atMs: 1005,
      });
      recordIslandRunEconomyCounter({
        counter: ISLAND_RUN_ECONOMY_COUNTERS.eventTicketsSpent,
        amount: 4,
        sessionId: USER_ID,
        atMs: 1006,
      });
      recordIslandRunMultiplierUsed({ multiplier: 2, sessionId: USER_ID, atMs: 1007 });
      recordIslandRunMultiplierUsed({ multiplier: 10, sessionId: USER_ID, atMs: 1008 });
      recordIslandRunRewardBarTierReached({ tier: 4, sessionId: USER_ID, atMs: 1009 });

      const snapshot = getIslandRunEconomyTelemetrySnapshot(USER_ID, 1735689600000);
      const formatted = formatIslandRunEconomyTelemetrySnapshot(USER_ID, 1735689600000);
      const parsed = JSON.parse(formatted) as typeof snapshot;

      assertEqual(snapshot.timestamp, '2025-01-01T00:00:00.000Z', 'Snapshot should include an ISO timestamp');
      assertEqual(snapshot.totalInflow, 15, 'Snapshot should include total inflow');
      assertEqual(snapshot.totalOutflow, 5, 'Snapshot should include total outflow');
      assertEqual(snapshot.netDiceDelta, 10, 'Snapshot should include net dice delta');
      assertEqual(snapshot.inflowBySource.reward_bar_dice, 12, 'Snapshot should include inflow by source');
      assertEqual(snapshot.outflowBySink.roll_spend_dice, 5, 'Snapshot should include outflow by sink');
      assertEqual(snapshot.rewardBarClaims, 2, 'Snapshot should include reward-bar claims');
      assertEqual(snapshot.chainedClaims, 1, 'Snapshot should include chained claims');
      assertEqual(snapshot.rewardBarTierReached, 4, 'Snapshot should include reward-bar tier reached');
      assertEqual(snapshot.averageMultiplier, 6, 'Snapshot should include average multiplier');
      assertEqual(snapshot.highestMultiplier, 10, 'Snapshot should include highest multiplier');
      assertEqual(snapshot.ticketsEarned, 7, 'Snapshot should include tickets earned');
      assertEqual(snapshot.ticketsSpent, 4, 'Snapshot should include tickets spent');
      assertEqual(parsed.netDiceDelta, snapshot.netDiceDelta, 'Formatted snapshot should be valid copy-paste friendly JSON');
      assert(formatted.includes('"ticketsEarned": 7'), 'Formatted snapshot should expose QA ticket fields');
    },
  },
  {
    name: 'roll instrumentation records dice outflow and multiplier metrics without changing roll behavior',
    run: async () => {
      resetEnvironment();
      await seedState({ runtimeVersion: 3, dicePool: 20, tokenIndex: 0 });

      const result = await withMockedRandom([0, 0], () => executeIslandRunRollAction({
        session: makeSession(),
        client: null,
        diceMultiplier: 3,
      }));
      const persisted = readIslandRunGameStateRecord(makeSession());
      const report = getIslandRunEconomyTelemetryReport(USER_ID);

      assertEqual(result.status, 'ok', 'Roll should still succeed');
      assertEqual(result.diceCost, 3, 'Gameplay cost should remain multiplier × base cost');
      assertEqual(result.newDicePool, 17, 'Gameplay dice pool should be deducted exactly once');
      assertEqual(persisted.dicePool, 17, 'Persisted dice pool should match pre-telemetry behavior');
      assertEqual(report.diceOutflowBySink.roll_spend_dice, 3, 'Telemetry should record roll spend outflow');
      assertEqual(report.totalDiceInflow, 0, 'Roll spend should not create dice inflow');
      assertEqual(report.netDiceDelta, -3, 'Telemetry net should reflect roll outflow');
      assertEqual(report.averageMultiplierUsed, 3, 'Average multiplier should include the roll');
      assertEqual(report.highestMultiplierUsed, 3, 'Highest multiplier should include the roll');
      assertEqual(report.counters[ISLAND_RUN_ECONOMY_COUNTERS.multiplierUse], 1, 'Multiplier-use counter should increment');
    },
  },
  {
    name: 'canonical reward actions attribute passive regen, daily-treat dice, tickets, and preserve gameplay totals',
    run: async () => {
      resetEnvironment();
      await seedState({
        runtimeVersion: 1,
        dicePool: 10,
        diceRegenState: { maxDice: 30, regenRatePerHour: 7.5, lastRegenAtMs: 0 },
        minigameTicketsByEvent: { 'space_excavator:1': 2 },
      });

      const regen = applyPassiveDiceRegenTick({
        session: makeSession(),
        client: null,
        playerLevel: 1,
        nowMs: 8 * 60 * 1000,
      });
      assertEqual(regen.diceAdded, 1, 'Passive regen gameplay should still add one die at the level-1 interval');

      const dailyTreat = applyTokenHopRewards({
        session: makeSession(),
        client: null,
        deltas: { dicePool: 15 },
        telemetryDiceSource: ISLAND_RUN_ECONOMY_SOURCES.dailyTreatDice,
        triggerSource: 'daily_treats_dice_award',
      });

      const ticketSpend = applyTimedEventTicketSpend({
        session: makeSession(),
        client: null,
        eventId: 'space_excavator:1',
        ticketsToSpend: 1,
      });

      const report = getIslandRunEconomyTelemetryReport(USER_ID);
      assertEqual(dailyTreat.dicePool, 26, 'Gameplay dice pool should be 10 + 1 regen + 15 treat');
      assertEqual(ticketSpend.spent, 1, 'Ticket spend gameplay should still spend exactly one event ticket');
      assertEqual(report.diceInflowBySource.passive_regen_dice, 1, 'Passive regen dice should be attributed');
      assertEqual(report.diceInflowBySource.daily_treat_dice, 15, 'Daily treat dice should be attributed');
      assertEqual(report.totalDiceInflow, 16, 'Inflow total should reconcile attributed grants');
      assertEqual(report.totalDiceOutflow, 0, 'No dice outflow should be recorded for non-dice ticket actions');
      assertEqual(report.counters[ISLAND_RUN_ECONOMY_COUNTERS.eventTicketsSpent], 1, 'Event ticket spend counter should increment separately from dice');
    },
  },
];
