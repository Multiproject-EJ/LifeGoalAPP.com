import { resolveIslandRunStopTapOutcome } from '../islandRunStopTapRouting';
import { assertEqual, type TestCase } from './testHarness';

export const islandRunStopTapRoutingTests: TestCase[] = [
  {
    name: 'locked status always resolves to locked',
    run: () => {
      assertEqual(
        resolveIslandRunStopTapOutcome({ stopStatus: 'locked', requiresTicket: true }),
        'locked',
        'Locked status should take precedence over ticket requirement',
      );
    },
  },
  {
    name: 'ticket_required status resolves to ticket_required',
    run: () => {
      assertEqual(
        resolveIslandRunStopTapOutcome({ stopStatus: 'ticket_required', requiresTicket: false }),
        'ticket_required',
        'Explicit ticket_required status should surface ticket flow',
      );
    },
  },
  {
    name: 'active status opens even when the stop type normally requires tickets',
    run: () => {
      assertEqual(
        resolveIslandRunStopTapOutcome({ stopStatus: 'active', requiresTicket: true }),
        'open',
        'Canonical active status should mean the ticket has already been paid',
      );
    },
  },
  {
    name: 'missing status still uses legacy derived ticket requirement',
    run: () => {
      assertEqual(
        resolveIslandRunStopTapOutcome({ stopStatus: null, requiresTicket: true }),
        'ticket_required',
        'Legacy callers without canonical status should still surface ticket flow',
      );
    },
  },
  {
    name: 'active/completed status with no ticket requirement resolves to open',
    run: () => {
      assertEqual(
        resolveIslandRunStopTapOutcome({ stopStatus: 'active', requiresTicket: false }),
        'open',
        'Active stop should open directly',
      );
      assertEqual(
        resolveIslandRunStopTapOutcome({ stopStatus: 'completed', requiresTicket: false }),
        'open',
        'Completed stop should still open for review',
      );
    },
  },
];
