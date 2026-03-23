import {
  ensureStopCompleted,
  getEffectiveCompletedStops,
  getStopCompletionBlockReason,
  getCompletedStopsForIsland,
  isIslandStopEffectivelyCompleted,
  isStopCompleted,
  shouldAutoOpenIslandStopOnLoad,
} from '../islandRunStopCompletion';
import { assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const islandRunStopCompletionTests: TestCase[] = [
  {
    name: 'ensureStopCompleted appends missing stop ids only once',
    run: () => {
      const first = ensureStopCompleted(['minigame'], 'hatchery');
      const second = ensureStopCompleted(first, 'hatchery');
      assertDeepEqual(first, ['minigame', 'hatchery'], 'Expected missing stop id to be appended');
      assertDeepEqual(second, ['minigame', 'hatchery'], 'Expected duplicate stop ids to be avoided');
    },
  },
  {
    name: 'isStopCompleted detects whether a stop id is already in the island ledger',
    run: () => {
      assertEqual(isStopCompleted(['hatchery', 'utility'], 'hatchery'), true, 'Expected hatchery to be marked complete');
      assertEqual(isStopCompleted(['hatchery', 'utility'], 'boss'), false, 'Expected boss to remain incomplete');
    },
  },
  {
    name: 'isIslandStopEffectivelyCompleted falls back to hatchery egg state when stop ledger is stale',
    run: () => {
      assertEqual(
        isIslandStopEffectivelyCompleted({
          stopId: 'hatchery',
          completedStops: [],
          hasActiveEgg: false,
          islandEggSlotUsed: true,
        }),
        true,
        'Expected used hatchery egg slot to satisfy step 1 even when completedStops is stale',
      );
      assertEqual(
        isIslandStopEffectivelyCompleted({
          stopId: 'hatchery',
          completedStops: [],
          hasActiveEgg: true,
          islandEggSlotUsed: false,
        }),
        true,
        'Expected active hatchery egg to satisfy step 1 even before persistence catches up',
      );
      assertEqual(
        isIslandStopEffectivelyCompleted({
          stopId: 'dynamic',
          completedStops: [],
          hasActiveEgg: true,
          islandEggSlotUsed: true,
        }),
        false,
        'Expected fallback completion to remain hatchery-specific',
      );
    },
  },
  {
    name: 'getEffectiveCompletedStops backfills hatchery into the ledger when egg state proves completion',
    run: () => {
      assertDeepEqual(
        getEffectiveCompletedStops({
          completedStops: ['utility'],
          hasActiveEgg: false,
          islandEggSlotUsed: true,
        }),
        ['utility', 'hatchery'],
        'Expected hatchery to be backfilled when the egg slot is already used',
      );
      assertDeepEqual(
        getEffectiveCompletedStops({
          completedStops: ['hatchery', 'utility'],
          hasActiveEgg: false,
          islandEggSlotUsed: true,
        }),
        ['hatchery', 'utility'],
        'Expected existing hatchery completion to remain stable',
      );
      assertDeepEqual(
        getEffectiveCompletedStops({
          completedStops: ['utility'],
          hasActiveEgg: false,
          islandEggSlotUsed: false,
        }),
        ['utility'],
        'Expected unrelated stop ledgers to remain untouched',
      );
    },
  },
  {
    name: 'getCompletedStopsForIsland returns the island-specific persisted stops',
    run: () => {
      const stops = getCompletedStopsForIsland({ '3': ['hatchery', 'utility'] }, 3);
      assertDeepEqual(stops, ['hatchery', 'utility'], 'Expected island-specific completed stops');
    },
  },
  {
    name: 'getStopCompletionBlockReason centralizes hatchery and boss completion blockers',
    run: () => {
      assertEqual(
        getStopCompletionBlockReason({
          stopId: 'hatchery',
          completedStops: [],
          hasActiveEgg: false,
          islandEggSlotUsed: false,
          bossTrialResolved: false,
        }),
        'Set an egg in Hatchery before completing Stop 1.',
        'Expected hatchery completion to be blocked until an egg is set',
      );
      assertEqual(
        getStopCompletionBlockReason({
          stopId: 'boss',
          completedStops: ['hatchery', 'minigame', 'utility', 'dynamic'],
          hasActiveEgg: true,
          islandEggSlotUsed: true,
          bossTrialResolved: false,
        }),
        'Boss challenge is still pending. Resolve the boss trial before clearing the island.',
        'Expected unresolved boss trial to block island clear',
      );
      assertEqual(
        getStopCompletionBlockReason({
          stopId: 'boss',
          completedStops: ['hatchery', 'minigame', 'utility', 'dynamic'],
          hasActiveEgg: true,
          islandEggSlotUsed: true,
          bossTrialResolved: true,
        }),
        null,
        'Expected resolved boss trial to allow completion',
      );
    },
  },
  {
    name: 'shouldAutoOpenIslandStopOnLoad blocks completed requested stop re-open',
    run: () => {
      assertEqual(
        shouldAutoOpenIslandStopOnLoad({
          requestedStopId: 'hatchery',
          islandNumber: 8,
          completedStopsByIsland: { '8': ['hatchery'] },
          islandEggSlotUsed: true,
        }),
        false,
        'Expected completed hatchery stop to stay closed on load',
      );
      assertEqual(
        shouldAutoOpenIslandStopOnLoad({
          requestedStopId: 'hatchery',
          islandNumber: 8,
          completedStopsByIsland: { '8': ['minigame'] },
          islandEggSlotUsed: false,
        }),
        true,
        'Expected incomplete hatchery stop to still auto-open when requested',
      );
      assertEqual(
        shouldAutoOpenIslandStopOnLoad({
          requestedStopId: 'hatchery',
          islandNumber: 8,
          completedStopsByIsland: { '8': ['minigame'] },
          islandEggSlotUsed: true,
        }),
        false,
        'Expected a sold or collected hatchery egg slot to suppress auto-open even if the stop ledger is stale',
      );
      assertEqual(
        shouldAutoOpenIslandStopOnLoad({
          requestedStopId: 'boss',
          islandNumber: 8,
          completedStopsByIsland: { '8': ['boss'] },
        }),
        false,
        'Expected completed boss stop to stay closed on load',
      );
      assertEqual(
        shouldAutoOpenIslandStopOnLoad({
          requestedStopId: 'dynamic',
          islandNumber: 8,
          completedStopsByIsland: { '8': ['hatchery'] },
        }),
        true,
        'Expected incomplete dynamic stop to still auto-open when requested',
      );
    },
  },
];
