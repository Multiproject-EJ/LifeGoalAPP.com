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
  resolveTimedEventLaunchTicketDelta,
  type EventMinigameLaunchDescriptor,
} from '../islandRunMinigameLauncherService';
import { resolveChainedRewardBarClaims } from '../islandRunContractV2RewardBar';
import { assertEqual, type TestCase } from './testHarness';

function runTimedEventCompletionIntegration(options: {
  descriptor: EventMinigameLaunchDescriptor | null;
  expectedMinigameId: 'lucky_spin' | 'space_excavator' | 'partner_wheel';
}) {
  assertEqual(options.descriptor?.minigameId, options.expectedMinigameId, 'event resolver should return the canonical minigame id');
  const completionId = resolveEventMinigameCompletionId({
    launchSource: 'timed_event',
    minigameId: options.descriptor?.minigameId,
    completed: true,
  });
  assertEqual(completionId, options.expectedMinigameId, 'completed timed_event launch should resolve a completion minigame id');

  const nowMs = Date.now();
  const seeded = buildFreshIslandRunRecord({
    audioEnabled: true,
    onboardingDisplayNameLoopCompleted: false,
  });
  const completionApplied = recordEventMinigameCompletion({
    state: {
      ...seeded,
      rewardBarProgress: 10,
      rewardBarThreshold: 12,
    },
    minigameId: completionId!,
    nowMs,
  });
  assertEqual(completionApplied.rewardBarProgress >= completionApplied.rewardBarThreshold, true, 'completion should make reward bar claimable');

  const claimResult = resolveChainedRewardBarClaims({
    state: completionApplied,
    nowMs: nowMs + 1,
  });
  assertEqual(claimResult.payouts.length > 0, true, 'completion claim handoff should emit at least one payout');
  assertEqual(claimResult.state.rewardBarClaimCountInEvent > completionApplied.rewardBarClaimCountInEvent, true, 'claim handoff should advance reward-bar claim count');
  assertEqual(typeof claimResult.state.stickerProgress.fragments, 'number', 'sticker progress should remain available after claim handoff');
  assertEqual(typeof claimResult.state.stickerInventory, 'object', 'sticker inventory should remain available after claim handoff');
}

export const minigameConsolidationPhase6Tests: TestCase[] = [
  {
    name: 'openEventMinigame maps Island Run timed events without Task Tower',
    run: () => {
      assertEqual(
        String(openEventMinigame({ eventId: 'feeding_frenzy', ticketsAvailable: 5 })?.minigameId) === 'task_tower',
        false,
        'feeding_frenzy must not map to task_tower in Island Run event engine',
      );
      assertEqual(
        openEventMinigame({ eventId: 'lucky_spin', ticketsAvailable: 5 })?.minigameId,
        'lucky_spin',
        'lucky_spin should launch lucky_spin',
      );
      assertEqual(
        openEventMinigame({ eventId: 'space_excavator', ticketsAvailable: 0 })?.minigameId,
        'space_excavator',
        'space_excavator should launch space_excavator even with zero tickets because digs spend per action',
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
    name: 'openEventMinigame uses explicit entry spend amount when affordable',
    run: () => {
      const descriptor = openEventMinigame({
        eventId: 'lucky_spin',
        ticketsAvailable: 4,
        ticketsToSpend: 2,
      });
      assertEqual(descriptor?.ticketsSpent, 2, 'caller-provided spend amount should be preserved');
      assertEqual(descriptor?.ticketCost, 1, 'ticketCost remains canonical per-run base cost');
    },
  },
  {
    name: 'resolveTimedEventLaunchTicketDelta returns negative spend and safely clamps invalid values',
    run: () => {
      const descriptor = resolveSpaceExcavatorEventMinigame({
        kind: 'timed_event',
        eventId: 'space_excavator',
        ticketsAvailable: 5,
        ticketsToSpend: 2,
      });
      assertEqual(resolveTimedEventLaunchTicketDelta(descriptor), 0, 'space_excavator uses per_action spend (no entry delta)');
      assertEqual(resolveTimedEventLaunchTicketDelta(null), 0, 'null descriptor should not produce a spend delta');
      assertEqual(
        resolveTimedEventLaunchTicketDelta({
          minigameId: 'lucky_spin',
          ticketCost: 1,
          ticketsSpent: 0,
          spendMode: 'entry',
          config: {
            source: 'timed_event',
            eventId: 'feeding_frenzy',
            mode: 'feeding_frenzy',
            sessionDurationSec: 120,
            targetRowsCleared: 10,
          },
        }),
        0,
        'non-positive spend should clamp to zero delta',
      );
    },
  },
  {
    name: 'resolveEventMinigameCompletionId only accepts completed timed_event launches for canonical event minigames',
    run: () => {
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
          minigameId: 'space_excavator',
          completed: true,
        }),
        'space_excavator',
        'timed_event completion should accept space_excavator',
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
    name: 'resolveFeedingFrenzyEventMinigame is intentionally unavailable',
    run: () => {
      assertEqual(resolveFeedingFrenzyEventMinigame({
        kind: 'timed_event',
        eventId: 'feeding_frenzy',
        ticketsAvailable: 3,
        ticketsToSpend: 2,
      }), null, 'feeding_frenzy should not launch an Island Run minigame');
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
    name: 'resolveSpaceExcavatorEventMinigame routes to Space Excavator event mode with preserved ticket spend metadata',
    run: () => {
      const descriptor = resolveSpaceExcavatorEventMinigame({
        kind: 'timed_event',
        eventId: 'space_excavator',
        ticketsAvailable: 0,
      });
      assertEqual(
        descriptor?.minigameId,
        'space_excavator',
        'space_excavator should route to space_excavator event surface',
      );
      assertEqual(descriptor?.ticketsSpent, 0, 'resolver should not spend tickets on open');
      assertEqual(
        descriptor?.config.mode,
        'space_excavator',
        'resolver should tag space excavator event mode as space_excavator',
      );
      assertEqual(
        descriptor?.config.mode === 'space_excavator' ? descriptor.config.ticketCost : null,
        1,
        'resolver should include ticketCost in space_excavator launch config',
      );
      assertEqual(
        descriptor?.config.mode === 'space_excavator' ? descriptor.config.ticketsSpent : null,
        0,
        'resolver should include zero launch ticketsSpent in space_excavator launch config',
      );
    },
  },
  {
    name: 'resolveSpaceExcavatorEventMinigame is non-launching for non-space events but opens with zero tickets',
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
        })?.minigameId,
        'space_excavator',
        'zero tickets should not block space_excavator event launch',
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
        minigameId: 'lucky_spin',
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
        minigameId: 'space_excavator',
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
        minigameId: 'lucky_spin',
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
  {
    name: 'integration: Feeding Frenzy launcher path is safely unavailable',
    run: () => {
      assertEqual(resolveFeedingFrenzyEventMinigame({
        kind: 'timed_event',
        eventId: 'feeding_frenzy',
        ticketsAvailable: 3,
      }), null, 'feeding_frenzy should surface unavailable fallback path');
    },
  },
  {
    name: 'integration: Lucky Spin launcher path resolves completion and claim handoff end-to-end',
    run: () => {
      runTimedEventCompletionIntegration({
        descriptor: resolveLuckySpinEventMinigame({
          kind: 'timed_event',
          eventId: 'lucky_spin',
          ticketsAvailable: 3,
          freeDailySpinRemaining: 1,
        }),
        expectedMinigameId: 'lucky_spin',
      });
    },
  },
  {
    name: 'integration: Space Excavator launcher path resolves completion and claim handoff end-to-end',
    run: () => {
      runTimedEventCompletionIntegration({
        descriptor: resolveSpaceExcavatorEventMinigame({
          kind: 'timed_event',
          eventId: 'space_excavator',
          ticketsAvailable: 3,
        }),
        expectedMinigameId: 'space_excavator',
      });
    },
  },
  {
    name: 'integration: Companion Feast launcher path resolves completion and claim handoff end-to-end',
    run: () => {
      runTimedEventCompletionIntegration({
        descriptor: resolveCompanionFeastEventMinigame({
          kind: 'timed_event',
          eventId: 'companion_feast',
          ticketsAvailable: 3,
        }),
        expectedMinigameId: 'partner_wheel',
      });
    },
  },
];
