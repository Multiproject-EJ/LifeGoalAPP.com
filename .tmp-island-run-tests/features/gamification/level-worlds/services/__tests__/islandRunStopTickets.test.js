"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.islandRunStopTicketsTests = void 0;
const islandRunStopTickets_1 = require("../islandRunStopTickets");
const testHarness_1 = require("./testHarness");
const OBJECTIVE_DONE = (count) => Array.from({ length: 5 }, (_, i) => ({ objectiveComplete: i < count }));
exports.islandRunStopTicketsTests = [
    {
        name: 'hatchery (stop 0) ticket cost is always 0',
        run: () => {
            (0, testHarness_1.assertEqual)((0, islandRunStopTickets_1.getStopTicketCost)({ effectiveIslandNumber: 1, stopIndex: 0 }), 0, 'Hatchery free on island 1');
            (0, testHarness_1.assertEqual)((0, islandRunStopTickets_1.getStopTicketCost)({ effectiveIslandNumber: 50, stopIndex: 0 }), 0, 'Hatchery free on island 50');
            (0, testHarness_1.assertEqual)((0, islandRunStopTickets_1.getStopTicketCost)({ effectiveIslandNumber: 120, stopIndex: 0 }), 0, 'Hatchery free on island 120');
        },
    },
    {
        name: 'ticket costs match base table on island 1',
        run: () => {
            (0, testHarness_1.assertEqual)((0, islandRunStopTickets_1.getStopTicketCost)({ effectiveIslandNumber: 1, stopIndex: 1 }), islandRunStopTickets_1.STOP_TICKET_BASE_COSTS[1], 'Stop 1 base cost on island 1');
            (0, testHarness_1.assertEqual)((0, islandRunStopTickets_1.getStopTicketCost)({ effectiveIslandNumber: 1, stopIndex: 2 }), islandRunStopTickets_1.STOP_TICKET_BASE_COSTS[2], 'Stop 2 base cost on island 1');
            (0, testHarness_1.assertEqual)((0, islandRunStopTickets_1.getStopTicketCost)({ effectiveIslandNumber: 1, stopIndex: 3 }), islandRunStopTickets_1.STOP_TICKET_BASE_COSTS[3], 'Stop 3 base cost on island 1');
            (0, testHarness_1.assertEqual)((0, islandRunStopTickets_1.getStopTicketCost)({ effectiveIslandNumber: 1, stopIndex: 4 }), islandRunStopTickets_1.STOP_TICKET_BASE_COSTS[4], 'Stop 4 base cost on island 1');
        },
    },
    {
        name: 'ticket costs scale by the same 1.5x / 10 islands essence multiplier',
        run: () => {
            // island 11 → 1.5×
            (0, testHarness_1.assertEqual)((0, islandRunStopTickets_1.getStopTicketCost)({ effectiveIslandNumber: 11, stopIndex: 1 }), Math.floor(islandRunStopTickets_1.STOP_TICKET_BASE_COSTS[1] * 1.5), 'Stop 1 on island 11 = base × 1.5');
            // island 21 → 2.25×
            (0, testHarness_1.assertEqual)((0, islandRunStopTickets_1.getStopTicketCost)({ effectiveIslandNumber: 21, stopIndex: 4 }), Math.floor(islandRunStopTickets_1.STOP_TICKET_BASE_COSTS[4] * 1.5 * 1.5), 'Stop 4 on island 21 = base × 2.25');
        },
    },
    {
        name: 'out-of-range stop indices are clamped (never crash)',
        run: () => {
            (0, testHarness_1.assertEqual)((0, islandRunStopTickets_1.getStopTicketCost)({ effectiveIslandNumber: 1, stopIndex: -5 }), 0, 'Negative index → clamped to hatchery (free)');
            (0, testHarness_1.assertEqual)((0, islandRunStopTickets_1.getStopTicketCost)({ effectiveIslandNumber: 1, stopIndex: 99 }), islandRunStopTickets_1.STOP_TICKET_BASE_COSTS[4], 'Huge index → clamped to boss');
        },
    },
    {
        name: 'getStopTicketsPaidForIsland defensive against null / unknown key / bad values',
        run: () => {
            (0, testHarness_1.assertEqual)((0, islandRunStopTickets_1.getStopTicketsPaidForIsland)(undefined, 1).length, 0, 'undefined map → []');
            (0, testHarness_1.assertEqual)((0, islandRunStopTickets_1.getStopTicketsPaidForIsland)(null, 1).length, 0, 'null map → []');
            (0, testHarness_1.assertEqual)((0, islandRunStopTickets_1.getStopTicketsPaidForIsland)({}, 7).length, 0, 'Unknown key → []');
            const paid = (0, islandRunStopTickets_1.getStopTicketsPaidForIsland)({ '3': [2, 2, -1, 99, 3.7, NaN, 4] }, 3);
            (0, testHarness_1.assertEqual)(paid.includes(2), true, 'Preserves valid index');
            (0, testHarness_1.assertEqual)(paid.includes(4), true, 'Preserves valid index 4');
            (0, testHarness_1.assertEqual)(paid.includes(3), true, 'Preserves floored 3.7 as 3');
            (0, testHarness_1.assertEqual)(paid.length, 3, 'De-dupes and drops invalid entries');
        },
    },
    {
        name: 'isStopTicketPaid: hatchery is always paid',
        run: () => {
            (0, testHarness_1.assertEqual)((0, islandRunStopTickets_1.isStopTicketPaid)({ ticketsPaid: [], stopIndex: 0 }), true, 'Hatchery paid with empty list');
            (0, testHarness_1.assertEqual)((0, islandRunStopTickets_1.isStopTicketPaid)({ ticketsPaid: [1, 2], stopIndex: 0 }), true, 'Hatchery paid regardless of list');
        },
    },
    {
        name: 'isStopTicketPaid: returns true only when index is in list',
        run: () => {
            (0, testHarness_1.assertEqual)((0, islandRunStopTickets_1.isStopTicketPaid)({ ticketsPaid: [1, 2], stopIndex: 1 }), true, 'Stop 1 paid');
            (0, testHarness_1.assertEqual)((0, islandRunStopTickets_1.isStopTicketPaid)({ ticketsPaid: [1, 2], stopIndex: 3 }), false, 'Stop 3 not paid');
            (0, testHarness_1.assertEqual)((0, islandRunStopTickets_1.isStopTicketPaid)({ ticketsPaid: [], stopIndex: 4 }), false, 'Stop 4 not paid on empty list');
        },
    },
    {
        name: 'payStopTicket treats hatchery (free) as a no-op success',
        run: () => {
            const result = (0, islandRunStopTickets_1.payStopTicket)({
                effectiveIslandNumber: 1,
                islandNumber: 1,
                stopIndex: 0,
                essence: 1000,
                essenceLifetimeSpent: 0,
                stopTicketsPaidByIsland: {},
                stopStatesByIndex: OBJECTIVE_DONE(0),
            });
            (0, testHarness_1.assertEqual)(result.ok, true, 'Hatchery is free — treated as a no-op success, not an error');
            if (result.ok) {
                (0, testHarness_1.assertEqual)(result.cost, 0, 'Hatchery cost is always 0');
                (0, testHarness_1.assertEqual)(result.alreadyFree === true, true, 'alreadyFree flag is set for hatchery');
                (0, testHarness_1.assertEqual)(result.essence, 1000, 'Wallet unchanged');
                (0, testHarness_1.assertEqual)(result.essenceLifetimeSpent, 0, 'Lifetime spent unchanged');
            }
        },
    },
    {
        name: 'payStopTicket rejects when previous stop objective incomplete',
        run: () => {
            const result = (0, islandRunStopTickets_1.payStopTicket)({
                effectiveIslandNumber: 1,
                islandNumber: 1,
                stopIndex: 2, // mystery — needs habit done
                essence: 1000,
                essenceLifetimeSpent: 0,
                stopTicketsPaidByIsland: {},
                stopStatesByIndex: OBJECTIVE_DONE(1), // only hatchery done
            });
            (0, testHarness_1.assertEqual)(result.ok, false, 'Rejects unlocking stop 2 without stop 1 done');
            if (!result.ok)
                (0, testHarness_1.assertEqual)(result.reason, 'previous_stop_not_complete', 'Reason = previous_stop_not_complete');
        },
    },
    {
        name: 'payStopTicket rejects when wallet is short of cost',
        run: () => {
            const cost = (0, islandRunStopTickets_1.getStopTicketCost)({ effectiveIslandNumber: 1, stopIndex: 1 });
            const result = (0, islandRunStopTickets_1.payStopTicket)({
                effectiveIslandNumber: 1,
                islandNumber: 1,
                stopIndex: 1,
                essence: cost - 1,
                essenceLifetimeSpent: 0,
                stopTicketsPaidByIsland: {},
                stopStatesByIndex: OBJECTIVE_DONE(1), // hatchery done
            });
            (0, testHarness_1.assertEqual)(result.ok, false, 'Rejects insufficient essence');
            if (!result.ok)
                (0, testHarness_1.assertEqual)(result.reason, 'insufficient_essence', 'Reason = insufficient_essence');
        },
    },
    {
        name: 'payStopTicket succeeds when all preconditions are met and updates map + wallet',
        run: () => {
            const cost = (0, islandRunStopTickets_1.getStopTicketCost)({ effectiveIslandNumber: 1, stopIndex: 1 });
            const result = (0, islandRunStopTickets_1.payStopTicket)({
                effectiveIslandNumber: 1,
                islandNumber: 1,
                stopIndex: 1,
                essence: cost + 50,
                essenceLifetimeSpent: 10,
                stopTicketsPaidByIsland: {},
                stopStatesByIndex: OBJECTIVE_DONE(1),
            });
            (0, testHarness_1.assertEqual)(result.ok, true, 'Happy path: payment should succeed');
            if (!result.ok)
                return;
            (0, testHarness_1.assertEqual)(result.essence, 50, 'Wallet deducted by exactly the cost');
            (0, testHarness_1.assertEqual)(result.essenceLifetimeSpent, 10 + cost, 'Lifetime spent incremented by cost');
            (0, testHarness_1.assertEqual)(result.cost, cost, 'Cost surfaced in result');
            (0, testHarness_1.assertEqual)(result.stopTicketsPaidByIsland['1']?.[0], 1, 'Stop 1 marked paid for island 1');
        },
    },
    {
        name: 'payStopTicket rejects duplicate payment for same stop',
        run: () => {
            const cost = (0, islandRunStopTickets_1.getStopTicketCost)({ effectiveIslandNumber: 1, stopIndex: 1 });
            const result = (0, islandRunStopTickets_1.payStopTicket)({
                effectiveIslandNumber: 1,
                islandNumber: 1,
                stopIndex: 1,
                essence: cost * 5,
                essenceLifetimeSpent: 0,
                stopTicketsPaidByIsland: { '1': [1] },
                stopStatesByIndex: OBJECTIVE_DONE(1),
            });
            (0, testHarness_1.assertEqual)(result.ok, false, 'Rejects duplicate pay');
            if (!result.ok)
                (0, testHarness_1.assertEqual)(result.reason, 'already_paid', 'Reason = already_paid');
        },
    },
    {
        name: 'payStopTicket correctly advances through all 4 ticket stops in sequence',
        run: () => {
            let map = {};
            let essence = 10000;
            let lifetimeSpent = 0;
            for (let stop = 1; stop <= 4; stop++) {
                const result = (0, islandRunStopTickets_1.payStopTicket)({
                    effectiveIslandNumber: 1,
                    islandNumber: 1,
                    stopIndex: stop,
                    essence,
                    essenceLifetimeSpent: lifetimeSpent,
                    stopTicketsPaidByIsland: map,
                    stopStatesByIndex: OBJECTIVE_DONE(stop), // previous stops all done
                });
                (0, testHarness_1.assert)(result.ok, `Stop ${stop} ticket should pay successfully`);
                if (!result.ok)
                    return;
                map = result.stopTicketsPaidByIsland;
                essence = result.essence;
                lifetimeSpent = result.essenceLifetimeSpent;
            }
            const paid = (0, islandRunStopTickets_1.getStopTicketsPaidForIsland)(map, 1);
            (0, testHarness_1.assertEqual)(paid.length, 4, 'All 4 tickets recorded for island 1');
            (0, testHarness_1.assertEqual)(paid[0], 1, 'Stop 1 first in list');
            (0, testHarness_1.assertEqual)(paid[3], 4, 'Stop 4 last in list');
        },
    },
    {
        name: 'sanitizeStopTicketsPaidByIsland removes hatchery / invalid entries and preserves valid keys',
        run: () => {
            const cleaned = (0, islandRunStopTickets_1.sanitizeStopTicketsPaidByIsland)({
                '1': [0, 1, 2, 3, 4, -1, 99, NaN],
                '2': [0, 0, 0],
                '5': [2, 3],
            });
            (0, testHarness_1.assertEqual)(cleaned['1']?.length, 4, 'Stop 0 and out-of-range dropped, 1/2/3/4 preserved');
            (0, testHarness_1.assertEqual)(cleaned['2'], undefined, 'Island-2 entry fully invalid (only hatchery) → dropped');
            (0, testHarness_1.assertEqual)(cleaned['5']?.length, 2, 'Island-5 valid entries preserved');
        },
    },
];
