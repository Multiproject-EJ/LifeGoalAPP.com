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
    name: 'requiresTicket=true resolves to ticket_required even when status is active',
    run: () => {
      assertEqual(
        resolveIslandRunStopTapOutcome({ stopStatus: 'active', requiresTicket: true }),
        'ticket_required',
        'Derived ticket requirement should map to ticket_required outcome',
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
