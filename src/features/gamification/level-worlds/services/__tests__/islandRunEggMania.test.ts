import type { TestCase } from './testHarness';
import { assert, assertDeepEqual, assertEqual } from './testHarness';
import {
  EGG_MANIA_MAX_EGGS_PER_ISLAND,
  EGG_MANIA_SCHEDULED_ISLANDS_PER_CYCLE,
  areAllEggSlotsTerminalForIsland,
  getEggSlotLedgerKey,
  getEggSlotsForIsland,
  parseEggSlotLedgerKey,
  resolveEggManiaState,
  resolveScheduledEggManiaIslands,
} from '../islandRunEggMania';

export const islandRunEggManiaTests: TestCase[] = [
  {
    name: 'scheduled Egg Mania resolves exactly four deterministic islands per cycle',
    run: () => {
      const first = resolveScheduledEggManiaIslands('mania-user', 2);
      const second = resolveScheduledEggManiaIslands('mania-user', 2);
      assertDeepEqual(first, second, 'same user/cycle should produce stable Mania islands');
      assertEqual(first.length, EGG_MANIA_SCHEDULED_ISLANDS_PER_CYCLE, 'should schedule four Mania islands');
      assert(first.every((island) => island >= 1 && island <= 120), 'scheduled islands should be within campaign bounds');
    },
  },
  {
    name: 'Egg Mania state is active on scheduled island and consumed after any island slot exists',
    run: () => {
      const scheduled = resolveScheduledEggManiaIslands('mania-state-user', 0);
      const islandNumber = scheduled[0];
      assert(islandNumber !== undefined, 'expected at least one scheduled island');
      const unused = resolveEggManiaState({
        userId: 'mania-state-user',
        islandNumber,
        cycleIndex: 0,
        perIslandEggs: {},
      });
      assertEqual(unused.active, true, 'scheduled island should be active');
      assertEqual(unused.consumed, false, 'no slots means unused');
      assertEqual(unused.maxEggs, EGG_MANIA_MAX_EGGS_PER_ISLAND, 'active Mania should allow three eggs');

      const consumed = resolveEggManiaState({
        userId: 'mania-state-user',
        islandNumber,
        cycleIndex: 0,
        perIslandEggs: {
          [getEggSlotLedgerKey(islandNumber, 0)]: { tier: 'common', setAtMs: 1, hatchAtMs: 2, status: 'incubating' },
        },
      });
      assertEqual(consumed.active, true, 'Mania remains active for the island');
      assertEqual(consumed.consumed, true, 'existing slot consumes the triple-set CTA');
    },
  },
  {
    name: 'Egg Mania slot keys group and sort multiple eggs for one island',
    run: () => {
      assertDeepEqual(parseEggSlotLedgerKey('7'), { islandNumber: 7, slotIndex: 0 }, 'base key parses as slot 0');
      assertDeepEqual(parseEggSlotLedgerKey('7#egg2'), { islandNumber: 7, slotIndex: 2 }, 'extended key parses slot index');
      const slots = getEggSlotsForIsland({
        [getEggSlotLedgerKey(7, 2)]: { tier: 'mythic', setAtMs: 3, hatchAtMs: 4, status: 'ready' },
        [getEggSlotLedgerKey(8, 0)]: { tier: 'common', setAtMs: 1, hatchAtMs: 2, status: 'ready' },
        [getEggSlotLedgerKey(7, 0)]: { tier: 'common', setAtMs: 1, hatchAtMs: 2, status: 'incubating' },
        [getEggSlotLedgerKey(7, 1)]: { tier: 'rare', setAtMs: 2, hatchAtMs: 3, status: 'sold' },
      }, 7);
      assertDeepEqual(slots.map((slot) => slot.slotIndex), [0, 1, 2], 'slots should sort by slot index');
      assertEqual(areAllEggSlotsTerminalForIsland(Object.fromEntries(slots.map((slot) => [slot.key, slot.entry])), 7), false, 'mixed unresolved slots are not terminal');
      assertEqual(areAllEggSlotsTerminalForIsland({
        [getEggSlotLedgerKey(7, 0)]: { tier: 'common', setAtMs: 1, hatchAtMs: 2, status: 'collected' },
        [getEggSlotLedgerKey(7, 1)]: { tier: 'rare', setAtMs: 2, hatchAtMs: 3, status: 'sold' },
      }, 7), true, 'all collected/sold slots are terminal');
    },
  },
];
