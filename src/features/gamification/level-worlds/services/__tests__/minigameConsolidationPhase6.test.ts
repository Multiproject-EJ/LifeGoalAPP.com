/**
 * Phase 6 consolidation-plan tests — Event mini-game launch mapping/ticket gate.
 */
import { openEventMinigame } from '../islandRunEventEngine';
import {
  resolveFeedingFrenzyEventMinigame,
  resolveLuckySpinEventMinigame,
  resolveSpaceExcavatorEventMinigame,
} from '../islandRunMinigameLauncherService';
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
  {
    name: 'resolveLuckySpinEventMinigame routes lucky_spin event and distinguishes free_daily vs ticket_extra mode',
    run: () => {
      const freeDailyDescriptor = resolveLuckySpinEventMinigame({
        kind: 'timed_event',
        eventId: 'lucky_spin',
        ticketsAvailable: 3,
        freeDailySpinRemaining: 1,
      });
      assertEqual(freeDailyDescriptor?.minigameId, 'lucky_spin', 'lucky_spin event routes to lucky_spin minigame');
      assertEqual(freeDailyDescriptor?.config.mode, 'lucky_spin', 'resolver should tag lucky_spin event mode');
      assertEqual(
        freeDailyDescriptor?.config.mode === 'lucky_spin' ? freeDailyDescriptor.config.spinMode : null,
        'free_daily',
        'remaining free daily spin should tag free_daily mode',
      );

      const ticketDescriptor = resolveLuckySpinEventMinigame({
        kind: 'timed_event',
        eventId: 'lucky_spin',
        ticketsAvailable: 3,
        freeDailySpinRemaining: 0,
      });
      assertEqual(
        ticketDescriptor?.config.mode === 'lucky_spin' ? ticketDescriptor.config.spinMode : null,
        'ticket_extra',
        'no free daily spin should tag ticket_extra mode',
      );
    },
  },
  {
    name: 'resolveLuckySpinEventMinigame is non-launching for non-lucky events or insufficient tickets',
    run: () => {
      assertEqual(
        resolveLuckySpinEventMinigame({
          kind: 'timed_event',
          eventId: 'feeding_frenzy',
          ticketsAvailable: 3,
          freeDailySpinRemaining: 1,
        }),
        null,
        'resolver should be scoped to lucky_spin only',
      );
      assertEqual(
        resolveLuckySpinEventMinigame({
          kind: 'timed_event',
          eventId: 'lucky_spin',
          ticketsAvailable: 0,
          freeDailySpinRemaining: 1,
        }),
        null,
        'insufficient tickets should block lucky_spin event launch',
      );
    },
  },
  {
    name: 'resolveSpaceExcavatorEventMinigame routes to Shooter Blitz event mode with preserved ticket spend metadata',
    run: () => {
      const descriptor = resolveSpaceExcavatorEventMinigame({
        kind: 'timed_event',
        eventId: 'space_excavator',
        ticketsAvailable: 4,
        ticketsToSpend: 2,
      });
      assertEqual(
        descriptor?.minigameId,
        'shooter_blitz',
        'space_excavator should route to shooter_blitz event surface',
      );
      assertEqual(descriptor?.ticketsSpent, 2, 'resolver should preserve explicit ticket spend request');
      assertEqual(
        descriptor?.config.mode,
        'space_excavator',
        'resolver should tag shooter blitz event mode as space_excavator',
      );
    },
  },
  {
    name: 'resolveSpaceExcavatorEventMinigame is non-launching for non-space events and insufficient tickets',
    run: () => {
      assertEqual(
        resolveSpaceExcavatorEventMinigame({
          kind: 'timed_event',
          eventId: 'feeding_frenzy',
          ticketsAvailable: 3,
        }),
        null,
        'resolver should be scoped to space_excavator only',
      );
      assertEqual(
        resolveSpaceExcavatorEventMinigame({
          kind: 'timed_event',
          eventId: 'space_excavator',
          ticketsAvailable: 0,
        }),
        null,
        'insufficient tickets should block space_excavator event launch',
      );
    },
  },
];
