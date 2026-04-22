/**
 * Phase 6 consolidation-plan tests — Event mini-game launch mapping/ticket gate.
 */
import { openEventMinigame } from '../islandRunEventEngine';
import { assertEqual, type TestCase } from './testHarness';

export const minigameConsolidationPhase6Tests: TestCase[] = [
  {
    name: 'openEventMinigame maps each canonical event to the expected minigame surface',
    run: () => {
      assertEqual(
        openEventMinigame({ eventId: 'feeding_frenzy', ticketsAvailable: 5 })?.minigameId,
        'task_tower',
        'feeding_frenzy should launch task_tower',
      );
      assertEqual(
        openEventMinigame({ eventId: 'lucky_spin', ticketsAvailable: 5 })?.minigameId,
        'lucky_spin',
        'lucky_spin should launch lucky_spin',
      );
      assertEqual(
        openEventMinigame({ eventId: 'space_excavator', ticketsAvailable: 5 })?.minigameId,
        'shooter_blitz',
        'space_excavator should launch shooter_blitz',
      );
      assertEqual(
        openEventMinigame({ eventId: 'companion_feast', ticketsAvailable: 5 })?.minigameId,
        'partner_wheel',
        'companion_feast should launch partner_wheel',
      );
    },
  },
  {
    name: 'openEventMinigame rejects insufficient tickets and invalid spend requests',
    run: () => {
      assertEqual(
        openEventMinigame({ eventId: 'feeding_frenzy', ticketsAvailable: 0 }),
        null,
        'no tickets available should block launch',
      );
      assertEqual(
        openEventMinigame({ eventId: 'feeding_frenzy', ticketsAvailable: 2, ticketsToSpend: 0 }),
        null,
        'spend requests below ticket cost should be rejected',
      );
      assertEqual(
        openEventMinigame({ eventId: 'feeding_frenzy', ticketsAvailable: 2, ticketsToSpend: 3 }),
        null,
        'spend requests above balance should be rejected',
      );
    },
  },
  {
    name: 'openEventMinigame uses explicit spend amount when affordable',
    run: () => {
      const descriptor = openEventMinigame({
        eventId: 'space_excavator',
        ticketsAvailable: 4,
        ticketsToSpend: 2,
      });
      assertEqual(descriptor?.ticketsSpent, 2, 'caller-provided spend amount should be preserved');
      assertEqual(descriptor?.ticketCost, 1, 'ticketCost remains canonical per-run base cost');
    },
  },
];
