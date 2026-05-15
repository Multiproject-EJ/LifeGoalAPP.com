import { buildInitialDiceRegenState } from '../islandRunDiceRegeneration';
import { readIslandRunGameStateRecord, type IslandRunGameStateRecord } from '../islandRunGameStateStore';
import {
  resolveIslandRunBestNextAction,
  type IslandRunBestNextActionKind,
  type IslandRunBestNextActionResult,
} from '../islandRunBestNextActionAdvisor';
import { assert, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const NOW_MS = 1_800_000;
const ISLAND_KEY = '1';
const STOP_IDS = ['hatchery', 'habit', 'mystery', 'wisdom', 'boss'];

function makeSession() {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: 'best-next-action-user',
      user_metadata: {},
    },
  } as unknown as import('@supabase/supabase-js').Session;
}

function makeRecord(overrides: Partial<IslandRunGameStateRecord> = {}): IslandRunGameStateRecord {
  installWindowWithStorage(createMemoryStorage());
  const base = readIslandRunGameStateRecord(makeSession());
  return {
    ...base,
    firstSessionTutorialState: 'complete',
    dicePool: 0,
    completedStopsByIsland: { [ISLAND_KEY]: ['hatchery'] },
    stopStatesByIndex: base.stopStatesByIndex.map((stopState, index) => ({
      ...stopState,
      objectiveComplete: index === 0,
    })),
    stopBuildStateByIndex: base.stopBuildStateByIndex.map((buildState) => ({
      ...buildState,
      requiredEssence: 100,
      spentEssence: 0,
      buildLevel: 0,
    })),
    ...overrides,
  };
}

function resolveAction(record: IslandRunGameStateRecord) {
  return resolveIslandRunBestNextAction({ record, nowMs: NOW_MS, playerLevel: 1 });
}

function requireResult(record: IslandRunGameStateRecord, message: string): IslandRunBestNextActionResult {
  const result = resolveAction(record);
  if (result === null) throw new Error(message);
  return result;
}

function expectAction(record: IslandRunGameStateRecord, expected: IslandRunBestNextActionKind): void {
  const result = requireResult(record, `expected ${expected}, received null`);
  assertEqual(result.action, expected, `expected best next action ${expected}`);
}

export const islandRunBestNextActionAdvisorTests: TestCase[] = [
  {
    name: 'claim island clear outranks all other actions',
    run: () => {
      const record = makeRecord({
        completedStopsByIsland: { [ISLAND_KEY]: STOP_IDS },
        stopStatesByIndex: Array.from({ length: 5 }, () => ({ objectiveComplete: true, buildComplete: true })),
        stopBuildStateByIndex: Array.from({ length: 5 }, () => ({
          requiredEssence: 100,
          spentEssence: 100,
          buildLevel: 3,
        })),
        rewardBarProgress: 999,
        dicePool: 5,
        activeEggTier: 'common',
        activeEggSetAtMs: NOW_MS - 10_000,
        activeEggHatchDurationMs: 1,
        perIslandEggs: {
          [ISLAND_KEY]: {
            tier: 'common',
            setAtMs: NOW_MS - 10_000,
            hatchAtMs: NOW_MS - 1,
            status: 'ready',
          },
        },
      });

      expectAction(record, 'claim_island_clear');
    },
  },
  {
    name: 'reward bar claimable outranks roll',
    run: () => {
      expectAction(makeRecord({ rewardBarProgress: 999, dicePool: 5 }), 'claim_reward_bar');
    },
  },
  {
    name: 'ready egg returns collect_egg',
    run: () => {
      expectAction(
        makeRecord({
          activeEggTier: 'rare',
          activeEggSetAtMs: NOW_MS - 10_000,
          activeEggHatchDurationMs: 1,
          perIslandEggs: {
            [ISLAND_KEY]: {
              tier: 'rare',
              setAtMs: NOW_MS - 10_000,
              hatchAtMs: NOW_MS - 1,
              status: 'ready',
            },
          },
        }),
        'collect_egg',
      );
    },
  },
  {
    name: 'hatchery not set returns set_egg_hatchery',
    run: () => {
      expectAction(
        makeRecord({
          completedStopsByIsland: {},
          stopStatesByIndex: Array.from({ length: 5 }, () => ({ objectiveComplete: false, buildComplete: false })),
          dicePool: 5,
        }),
        'set_egg_hatchery',
      );
    },
  },
  {
    name: 'affordable next stop ticket returns pay_stop_ticket',
    run: () => {
      const record = makeRecord({ essence: 30, dicePool: 5 });

      const result = requireResult(record, 'expected pay_stop_ticket result');
      assertEqual(result.action, 'pay_stop_ticket', 'affordable ticket should win');
      assertEqual(result.meta?.stopIndex, 1, 'habit stop ticket should be next');
    },
  },
  {
    name: 'boss challenge available returns challenge_boss',
    run: () => {
      expectAction(
        makeRecord({
          completedStopsByIsland: { [ISLAND_KEY]: ['hatchery', 'habit', 'mystery', 'wisdom'] },
          stopTicketsPaidByIsland: { [ISLAND_KEY]: [1, 2, 3, 4] },
          stopStatesByIndex: Array.from({ length: 5 }, (_, index) => ({
            objectiveComplete: index < 4,
            buildComplete: index === 4,
          })),
          stopBuildStateByIndex: Array.from({ length: 5 }, (_, index) => ({
            requiredEssence: 100,
            spentEssence: index === 4 ? 100 : 0,
            buildLevel: index === 4 ? 3 : 0,
          })),
        }),
        'challenge_boss',
      );
    },
  },
  {
    name: 'open incomplete stop returns complete_active_stop',
    run: () => {
      const record = makeRecord({
        stopTicketsPaidByIsland: { [ISLAND_KEY]: [1] },
        stopStatesByIndex: Array.from({ length: 5 }, (_, index) => ({
          objectiveComplete: index === 0,
          buildComplete: false,
        })),
      });

      const result = requireResult(record, 'expected complete_active_stop result');
      assertEqual(result.action, 'complete_active_stop', 'paid incomplete stop should win');
      assertEqual(result.meta?.stopIndex, 1, 'habit stop should be active incomplete stop');
    },
  },
  {
    name: 'affordable build returns fund_building',
    run: () => {
      const record = makeRecord({
        essence: 50,
        completedStopsByIsland: { [ISLAND_KEY]: ['hatchery', 'habit'] },
        stopTicketsPaidByIsland: { [ISLAND_KEY]: [1] },
        stopStatesByIndex: Array.from({ length: 5 }, (_, index) => ({
          objectiveComplete: index <= 1,
          buildComplete: false,
        })),
        stopBuildStateByIndex: Array.from({ length: 5 }, (_, index) => ({
          requiredEssence: index === 0 ? 50 : 100,
          spentEssence: 0,
          buildLevel: 0,
        })),
      });

      const result = requireResult(record, 'expected fund_building result');
      assertEqual(result.action, 'fund_building', 'affordable build should win');
      assertEqual(result.meta?.stopIndex, 0, 'first affordable build in priority order should be selected');
    },
  },
  {
    name: 'dice available returns roll',
    run: () => {
      expectAction(makeRecord({ dicePool: 1 }), 'roll');
    },
  },
  {
    name: 'event tickets available returns play_event_minigame only after core progression actions',
    run: () => {
      const activeTimedEvent = {
        eventId: `space_excavator:${NOW_MS}`,
        eventType: 'space_excavator',
        startedAtMs: NOW_MS - 10_000,
        expiresAtMs: NOW_MS + 10_000,
        version: 1,
      };
      // Ticket authority is keyed by getActiveEvent's canonical template id, not the timestamped record id.

      expectAction(
        makeRecord({
          dicePool: 3,
          activeTimedEvent,
          minigameTicketsByEvent: { space_excavator: 2 },
        }),
        'roll',
      );
      expectAction(
        makeRecord({
          dicePool: 0,
          activeTimedEvent,
          minigameTicketsByEvent: { space_excavator: 2 },
        }),
        'play_event_minigame',
      );
    },
  },
  {
    name: 'out of dice with regen ETA returns wait_for_dice_regen',
    run: () => {
      const record = makeRecord({
        dicePool: 0,
        diceRegenState: buildInitialDiceRegenState(1, NOW_MS),
      });

      const result = requireResult(record, 'expected wait_for_dice_regen result');
      assertEqual(result.action, 'wait_for_dice_regen', 'finite regen ETA should win');
      assertEqual(typeof result.meta?.regenEtaMs, 'number', 'regen ETA should be included');
    },
  },
  {
    name: 'impossible incomplete state returns resolve_stuck',
    run: () => {
      expectAction(makeRecord({ dicePool: 0, diceRegenState: null }), 'resolve_stuck');
    },
  },
  {
    name: 'known active tutorial state returns null',
    run: () => {
      const result = resolveAction(makeRecord({ firstSessionTutorialState: 'awaiting_first_roll', dicePool: 5 }));
      assertEqual(result, null, 'tutorial state should suppress advisor output');
    },
  },
  {
    name: 'non-active tutorial fallback states do not suppress normal actions',
    run: () => {
      const cases = [
        { label: 'complete', firstSessionTutorialState: 'complete' },
        { label: 'not_started default', firstSessionTutorialState: 'not_started' },
        { label: 'null', firstSessionTutorialState: null },
        { label: 'undefined', firstSessionTutorialState: undefined },
        { label: 'unknown', firstSessionTutorialState: 'unknown_state' },
      ] as const;

      for (const testCase of cases) {
        expectAction(
          makeRecord({
            firstSessionTutorialState: testCase.firstSessionTutorialState,
            dicePool: 5,
          } as Partial<IslandRunGameStateRecord>),
          'roll',
        );
      }
    },
  },
];
