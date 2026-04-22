/**
 * Phase 6 consolidation-plan tests — Event mini-game launch mapping/ticket gate.
 */
import { openEventMinigame } from '../islandRunEventEngine';
import { resolveFeedingFrenzyEventMinigame } from '../islandRunMinigameLauncherService';
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
  {
    name: 'resolveFeedingFrenzyEventMinigame returns a Task Tower event config and preserved spend metadata',
    run: () => {
      const descriptor = resolveFeedingFrenzyEventMinigame({
        kind: 'timed_event',
        eventId: 'feeding_frenzy',
        ticketsAvailable: 3,
        ticketsToSpend: 2,
      });
      assertEqual(descriptor?.minigameId, 'task_tower', 'feeding_frenzy event routes to task_tower');
      assertEqual(descriptor?.ticketsSpent, 2, 'resolver should preserve caller spend request');
      assertEqual(
        descriptor?.config.mode,
        'feeding_frenzy',
        'resolver should tag task_tower with feeding_frenzy event mode',
      );
    },
  },
  {
    name: 'resolveFeedingFrenzyEventMinigame is non-launching for non-feeding events and insufficient tickets',
    run: () => {
      assertEqual(
        resolveFeedingFrenzyEventMinigame({
          kind: 'timed_event',
          eventId: 'lucky_spin',
          ticketsAvailable: 5,
        }),
        null,
        'phase-6 step-1 resolver should be scoped to feeding_frenzy only',
      );

      assertEqual(
        resolveFeedingFrenzyEventMinigame({
          kind: 'timed_event',
          eventId: 'feeding_frenzy',
          ticketsAvailable: 0,
        }),
        null,
        'insufficient tickets should block feeding_frenzy event launch',
      );
    },
  },
];
