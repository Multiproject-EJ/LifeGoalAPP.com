/**
 * Phase 6 consolidation-plan tests — Event mini-game launch mapping/ticket gate.
 */
import { openEventMinigame, recordEventMinigameCompletion } from '../islandRunEventEngine';
import { buildFreshIslandRunRecord } from '../islandRunProgressReset';
import {
  resolveEventMinigameCompletionId,
  resolveFeedingFrenzyEventMinigame,
  resolveLuckySpinEventMinigame,
  resolveSpaceExcavatorEventMinigame,
  resolveCompanionFeastEventMinigame,
} from '../islandRunMinigameLauncherService';
import { resolveChainedRewardBarClaims } from '../islandRunContractV2RewardBar';
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
    name: 'resolveEventMinigameCompletionId only accepts completed timed_event launches for canonical event minigames',
    run: () => {
      assertEqual(
        resolveEventMinigameCompletionId({
          launchSource: 'timed_event',
          minigameId: 'task_tower',
          completed: true,
        }),
        'task_tower',
        'timed_event completion should accept task_tower',
      );
      assertEqual(
        resolveEventMinigameCompletionId({
          launchSource: 'timed_event',
          minigameId: 'lucky_spin',
          completed: true,
        }),
        'lucky_spin',
        'timed_event completion should accept lucky_spin',
      );
      assertEqual(
        resolveEventMinigameCompletionId({
          launchSource: 'timed_event',
          minigameId: 'shooter_blitz',
          completed: true,
        }),
        'shooter_blitz',
        'timed_event completion should accept shooter_blitz',
      );
      assertEqual(
        resolveEventMinigameCompletionId({
          launchSource: 'timed_event',
          minigameId: 'partner_wheel',
          completed: true,
        }),
        'partner_wheel',
        'timed_event completion should accept partner_wheel',
      );
      assertEqual(
        resolveEventMinigameCompletionId({
          launchSource: 'mystery_stop',
          minigameId: 'task_tower',
          completed: true,
        }),
        null,
        'non-event launch sources should not trigger event completion progress',
      );
      assertEqual(
        resolveEventMinigameCompletionId({
          launchSource: 'timed_event',
          minigameId: 'task_tower',
          completed: false,
        }),
        null,
        'abandoned/failed runs should not trigger completion progress',
      );
      assertEqual(
        resolveEventMinigameCompletionId({
          launchSource: 'timed_event',
          minigameId: 'vision_quest',
          completed: true,
        }),
        null,
        'non-event minigames should never route into event completion progress',
      );
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
  {
    name: 'resolveCompanionFeastEventMinigame routes to Partner Wheel placeholder with default team config',
    run: () => {
      const descriptor = resolveCompanionFeastEventMinigame({
        kind: 'timed_event',
        eventId: 'companion_feast',
        ticketsAvailable: 3,
        ticketsToSpend: 2,
      });
      assertEqual(descriptor?.minigameId, 'partner_wheel', 'companion_feast should route to partner_wheel');
      assertEqual(descriptor?.ticketsSpent, 2, 'resolver should preserve explicit ticket spend request');
      assertEqual(
        descriptor?.config.mode,
        'companion_feast',
        'resolver should tag companion_feast event mode',
      );
      assertEqual(
        descriptor?.config.mode === 'companion_feast' ? descriptor.config.teamSize : null,
        4,
        'partner placeholder teamSize should default to 4',
      );
      assertEqual(
        descriptor?.config.mode === 'companion_feast' ? descriptor.config.aiPartnerCount : null,
        3,
        'partner placeholder aiPartnerCount should default to 3',
      );
    },
  },
  {
    name: 'resolveCompanionFeastEventMinigame is non-launching for non-companion events and insufficient tickets',
    run: () => {
      assertEqual(
        resolveCompanionFeastEventMinigame({
          kind: 'timed_event',
          eventId: 'feeding_frenzy',
          ticketsAvailable: 3,
        }),
        null,
        'resolver should be scoped to companion_feast only',
      );
      assertEqual(
        resolveCompanionFeastEventMinigame({
          kind: 'timed_event',
          eventId: 'companion_feast',
          ticketsAvailable: 0,
        }),
        null,
        'insufficient tickets should block companion_feast event launch',
      );
    },
  },
  {
    name: 'recordEventMinigameCompletion routes progress through engine with event_minigame_complete source',
    run: () => {
      const seeded = buildFreshIslandRunRecord({
        audioEnabled: true,
        onboardingDisplayNameLoopCompleted: false,
      });
      const next = recordEventMinigameCompletion({
        state: seeded,
        minigameId: 'task_tower',
        nowMs: 1_000_000,
      });
      assertEqual(next.rewardBarProgress, 4, 'event minigame completion should add canonical progress delta');
      assertEqual(next.activeTimedEventProgress.feedingActions, 1, 'completion should increment event feeding-action tally');
      assertEqual(
        next.rewardBarBoundEventId,
        next.activeTimedEvent?.eventId ?? null,
        'reward bar should stay bound to the active event id',
      );
    },
  },
  {
    name: 'recordEventMinigameCompletion honors multiplier for event-mode bonus windows',
    run: () => {
      const seeded = buildFreshIslandRunRecord({
        audioEnabled: true,
        onboardingDisplayNameLoopCompleted: false,
      });
      const next = recordEventMinigameCompletion({
        state: seeded,
        minigameId: 'shooter_blitz',
        nowMs: 2_000_000,
        multiplier: 2,
      });
      assertEqual(next.rewardBarProgress, 8, 'multiplier should scale event minigame completion progress');
    },
  },
  {
    name: 'event minigame completion can immediately chain into reward-bar claim payouts',
    run: () => {
      const nowMs = Date.now();
      const seeded = buildFreshIslandRunRecord({
        audioEnabled: true,
        onboardingDisplayNameLoopCompleted: false,
      });
      const completionApplied = recordEventMinigameCompletion({
        state: seeded,
        minigameId: 'task_tower',
        nowMs,
        multiplier: 3,
      });
      assertEqual(completionApplied.rewardBarProgress >= completionApplied.rewardBarThreshold, true, 'completion should push reward bar over claim threshold');
      const claimResult = resolveChainedRewardBarClaims({
        state: completionApplied,
        nowMs: nowMs + 1,
      });
      assertEqual(claimResult.payouts.length > 0, true, 'completion-overflow state should produce at least one payout');
      assertEqual(claimResult.state.rewardBarProgress < completionApplied.rewardBarProgress, true, 'claim should consume filled reward-bar progress');
    },
  },
];
