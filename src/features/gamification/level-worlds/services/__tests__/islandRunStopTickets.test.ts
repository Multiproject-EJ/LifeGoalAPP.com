import {
  getStopTicketCost,
  getStopTicketsPaidForIsland,
  isStopTicketPaid,
  payStopTicket,
  sanitizeStopTicketsPaidByIsland,
  STOP_TICKET_BASE_COSTS,
} from '../islandRunStopTickets';
import { assert, assertEqual, type TestCase } from './testHarness';

const OBJECTIVE_DONE = (count: number) =>
  Array.from({ length: 5 }, (_, i) => ({ objectiveComplete: i < count }));

export const islandRunStopTicketsTests: TestCase[] = [
  {
    name: 'hatchery (stop 0) ticket cost is always 0',
    run: () => {
      assertEqual(getStopTicketCost({ effectiveIslandNumber: 1, stopIndex: 0 }), 0, 'Hatchery free on island 1');
      assertEqual(getStopTicketCost({ effectiveIslandNumber: 50, stopIndex: 0 }), 0, 'Hatchery free on island 50');
      assertEqual(getStopTicketCost({ effectiveIslandNumber: 120, stopIndex: 0 }), 0, 'Hatchery free on island 120');
    },
  },
  {
    name: 'ticket costs match base table on island 1',
    run: () => {
      assertEqual(getStopTicketCost({ effectiveIslandNumber: 1, stopIndex: 1 }), STOP_TICKET_BASE_COSTS[1], 'Stop 1 base cost on island 1');
      assertEqual(getStopTicketCost({ effectiveIslandNumber: 1, stopIndex: 2 }), STOP_TICKET_BASE_COSTS[2], 'Stop 2 base cost on island 1');
      assertEqual(getStopTicketCost({ effectiveIslandNumber: 1, stopIndex: 3 }), STOP_TICKET_BASE_COSTS[3], 'Stop 3 base cost on island 1');
      assertEqual(getStopTicketCost({ effectiveIslandNumber: 1, stopIndex: 4 }), STOP_TICKET_BASE_COSTS[4], 'Stop 4 base cost on island 1');
    },
  },
  {
    name: 'ticket costs scale by the same 1.5x / 10 islands essence multiplier',
    run: () => {
      // island 11 → 1.5×
      assertEqual(getStopTicketCost({ effectiveIslandNumber: 11, stopIndex: 1 }), Math.floor(STOP_TICKET_BASE_COSTS[1] * 1.5), 'Stop 1 on island 11 = base × 1.5');
      // island 21 → 2.25×
      assertEqual(getStopTicketCost({ effectiveIslandNumber: 21, stopIndex: 4 }), Math.floor(STOP_TICKET_BASE_COSTS[4] * 1.5 * 1.5), 'Stop 4 on island 21 = base × 2.25');
    },
  },
  {
    name: 'out-of-range stop indices are clamped (never crash)',
    run: () => {
      assertEqual(getStopTicketCost({ effectiveIslandNumber: 1, stopIndex: -5 }), 0, 'Negative index → clamped to hatchery (free)');
      assertEqual(getStopTicketCost({ effectiveIslandNumber: 1, stopIndex: 99 }), STOP_TICKET_BASE_COSTS[4], 'Huge index → clamped to boss');
    },
  },
  {
    name: 'getStopTicketsPaidForIsland defensive against null / unknown key / bad values',
    run: () => {
      assertEqual(getStopTicketsPaidForIsland(undefined, 1).length, 0, 'undefined map → []');
      assertEqual(getStopTicketsPaidForIsland(null, 1).length, 0, 'null map → []');
      assertEqual(getStopTicketsPaidForIsland({}, 7).length, 0, 'Unknown key → []');
      const paid = getStopTicketsPaidForIsland({ '3': [2, 2, -1, 99, 3.7, NaN, 4] as unknown as number[] }, 3);
      assertEqual(paid.includes(2), true, 'Preserves valid index');
      assertEqual(paid.includes(4), true, 'Preserves valid index 4');
      assertEqual(paid.includes(3), true, 'Preserves floored 3.7 as 3');
      assertEqual(paid.length, 3, 'De-dupes and drops invalid entries');
    },
  },
  {
    name: 'isStopTicketPaid: hatchery is always paid',
    run: () => {
      assertEqual(isStopTicketPaid({ ticketsPaid: [], stopIndex: 0 }), true, 'Hatchery paid with empty list');
      assertEqual(isStopTicketPaid({ ticketsPaid: [1, 2], stopIndex: 0 }), true, 'Hatchery paid regardless of list');
    },
  },
  {
    name: 'isStopTicketPaid: returns true only when index is in list',
    run: () => {
      assertEqual(isStopTicketPaid({ ticketsPaid: [1, 2], stopIndex: 1 }), true, 'Stop 1 paid');
      assertEqual(isStopTicketPaid({ ticketsPaid: [1, 2], stopIndex: 3 }), false, 'Stop 3 not paid');
      assertEqual(isStopTicketPaid({ ticketsPaid: [], stopIndex: 4 }), false, 'Stop 4 not paid on empty list');
    },
  },
  {
    name: 'payStopTicket rejects hatchery (free, can never be paid)',
    run: () => {
      const result = payStopTicket({
        effectiveIslandNumber: 1,
        islandNumber: 1,
        stopIndex: 0,
        essence: 1000,
        essenceLifetimeSpent: 0,
        stopTicketsPaidByIsland: {},
        stopStatesByIndex: OBJECTIVE_DONE(0),
      });
      assertEqual(result.ok, false, 'Hatchery payment should be rejected');
      if (!result.ok) assertEqual(result.reason, 'hatchery_free', 'Reason = hatchery_free');
    },
  },
  {
    name: 'payStopTicket rejects when previous stop objective incomplete',
    run: () => {
      const result = payStopTicket({
        effectiveIslandNumber: 1,
        islandNumber: 1,
        stopIndex: 2, // mystery — needs habit done
        essence: 1000,
        essenceLifetimeSpent: 0,
        stopTicketsPaidByIsland: {},
        stopStatesByIndex: OBJECTIVE_DONE(1), // only hatchery done
      });
      assertEqual(result.ok, false, 'Rejects unlocking stop 2 without stop 1 done');
      if (!result.ok) assertEqual(result.reason, 'previous_stop_not_complete', 'Reason = previous_stop_not_complete');
    },
  },
  {
    name: 'payStopTicket rejects when wallet is short of cost',
    run: () => {
      const cost = getStopTicketCost({ effectiveIslandNumber: 1, stopIndex: 1 });
      const result = payStopTicket({
        effectiveIslandNumber: 1,
        islandNumber: 1,
        stopIndex: 1,
        essence: cost - 1,
        essenceLifetimeSpent: 0,
        stopTicketsPaidByIsland: {},
        stopStatesByIndex: OBJECTIVE_DONE(1), // hatchery done
      });
      assertEqual(result.ok, false, 'Rejects insufficient essence');
      if (!result.ok) assertEqual(result.reason, 'insufficient_essence', 'Reason = insufficient_essence');
    },
  },
  {
    name: 'payStopTicket succeeds when all preconditions are met and updates map + wallet',
    run: () => {
      const cost = getStopTicketCost({ effectiveIslandNumber: 1, stopIndex: 1 });
      const result = payStopTicket({
        effectiveIslandNumber: 1,
        islandNumber: 1,
        stopIndex: 1,
        essence: cost + 50,
        essenceLifetimeSpent: 10,
        stopTicketsPaidByIsland: {},
        stopStatesByIndex: OBJECTIVE_DONE(1),
      });
      assertEqual(result.ok, true, 'Happy path: payment should succeed');
      if (!result.ok) return;
      assertEqual(result.essence, 50, 'Wallet deducted by exactly the cost');
      assertEqual(result.essenceLifetimeSpent, 10 + cost, 'Lifetime spent incremented by cost');
      assertEqual(result.cost, cost, 'Cost surfaced in result');
      assertEqual(result.stopTicketsPaidByIsland['1']?.[0], 1, 'Stop 1 marked paid for island 1');
    },
  },
  {
    name: 'payStopTicket rejects duplicate payment for same stop',
    run: () => {
      const cost = getStopTicketCost({ effectiveIslandNumber: 1, stopIndex: 1 });
      const result = payStopTicket({
        effectiveIslandNumber: 1,
        islandNumber: 1,
        stopIndex: 1,
        essence: cost * 5,
        essenceLifetimeSpent: 0,
        stopTicketsPaidByIsland: { '1': [1] },
        stopStatesByIndex: OBJECTIVE_DONE(1),
      });
      assertEqual(result.ok, false, 'Rejects duplicate pay');
      if (!result.ok) assertEqual(result.reason, 'already_paid', 'Reason = already_paid');
    },
  },
  {
    name: 'payStopTicket correctly advances through all 4 ticket stops in sequence',
    run: () => {
      let map: Record<string, number[]> = {};
      let essence = 10_000;
      let lifetimeSpent = 0;
      for (let stop = 1; stop <= 4; stop++) {
        const result = payStopTicket({
          effectiveIslandNumber: 1,
          islandNumber: 1,
          stopIndex: stop,
          essence,
          essenceLifetimeSpent: lifetimeSpent,
          stopTicketsPaidByIsland: map,
          stopStatesByIndex: OBJECTIVE_DONE(stop), // previous stops all done
        });
        assert(result.ok, `Stop ${stop} ticket should pay successfully`);
        if (!result.ok) return;
        map = result.stopTicketsPaidByIsland;
        essence = result.essence;
        lifetimeSpent = result.essenceLifetimeSpent;
      }
      const paid = getStopTicketsPaidForIsland(map, 1);
      assertEqual(paid.length, 4, 'All 4 tickets recorded for island 1');
      assertEqual(paid[0], 1, 'Stop 1 first in list');
      assertEqual(paid[3], 4, 'Stop 4 last in list');
    },
  },
  {
    name: 'sanitizeStopTicketsPaidByIsland removes hatchery / invalid entries and preserves valid keys',
    run: () => {
      const cleaned = sanitizeStopTicketsPaidByIsland({
        '1': [0, 1, 2, 3, 4, -1, 99, NaN] as unknown as number[],
        '2': [0, 0, 0],
        '5': [2, 3],
      });
      assertEqual(cleaned['1']?.length, 4, 'Stop 0 and out-of-range dropped, 1/2/3/4 preserved');
      assertEqual(cleaned['2'], undefined, 'Island-2 entry fully invalid (only hatchery) → dropped');
      assertEqual(cleaned['5']?.length, 2, 'Island-5 valid entries preserved');
    },
  },
];
