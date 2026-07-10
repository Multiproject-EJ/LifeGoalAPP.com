/**
 * Phase 6 consolidation-plan tests — Event mini-game launch mapping/ticket gate.
 */
import { openEventMinigame, recordEventMinigameCompletion } from '../islandRunEventEngine';
import { buildFreshIslandRunRecord } from '../islandRunProgressReset';
import {
  resolveEventMinigameCompletionId,
  resolveIslandWorkshopEventMinigame,
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
  expectedMinigameId: 'island_workshop' | 'lucky_spin' | 'space_excavator' | 'companion_feast';
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
    multiplier: 2,
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
        openEventMinigame({ eventId: 'feeding_frenzy', ticketsAvailable: 5 })?.minigameId,
        'island_workshop',
        'feeding_frenzy slot should launch island_workshop',
      );
      assertEqual(
        openEventMinigame({ eventId: 'lucky_spin', ticketsAvailable: 0 })?.minigameId,
        'lucky_spin',
        'lucky_spin should launch lucky_spin even with zero tickets because Fortune Engine launches spend per action',
      );
      assertEqual(
        openEventMinigame({ eventId: 'space_excavator', ticketsAvailable: 0 })?.minigameId,
        'space_excavator',
        'space_excavator should launch space_excavator even with zero tickets because digs spend per action',
      );
      assertEqual(
        openEventMinigame({ eventId: 'companion_feast', ticketsAvailable: 5 })?.minigameId,
        'companion_feast',
        'companion_feast should launch companion_feast',
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
        eventId: 'feeding_frenzy',
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
          minigameId: 'island_workshop',
          ticketCost: 1,
          ticketsSpent: 0,
          spendMode: 'entry',
          config: {
            source: 'timed_event',
            eventId: 'feeding_frenzy',
            mode: 'island_workshop',
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
          minigameId: 'companion_feast',
          completed: true,
        }),
        'companion_feast',
        'timed_event completion should accept companion_feast',
      );
      assertEqual(
        resolveEventMinigameCompletionId({
          launchSource: 'timed_event',
          minigameId: 'island_workshop',
          completed: true,
        }),
        'island_workshop',
        'timed_event completion should accept island_workshop',
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
    name: 'resolveIslandWorkshopEventMinigame routes the feeding_frenzy slot to Island Workshop',
    run: () => {
      const descriptor = resolveIslandWorkshopEventMinigame({
        kind: 'timed_event',
        eventId: 'feeding_frenzy',
        ticketsAvailable: 3,
        ticketsToSpend: 2,
      });
      assertEqual(descriptor?.minigameId, 'island_workshop', 'feeding_frenzy slot should route to island_workshop');
      assertEqual(descriptor?.ticketsSpent, 2, 'resolver should preserve explicit ticket spend request');
      assertEqual(descriptor?.spendMode, 'per_action', 'island_workshop should spend tickets per block placement');
      assertEqual(
        descriptor?.config.mode,
        'island_workshop',
        'resolver should tag island_workshop event mode',
      );
    },
  },
  {
    name: 'resolveIslandWorkshopEventMinigame is non-launching for other events and insufficient tickets',
    run: () => {
      assertEqual(
        resolveIslandWorkshopEventMinigame({
          kind: 'timed_event',
          eventId: 'lucky_spin',
          ticketsAvailable: 5,
        }),
        null,
        'resolver should be scoped to the feeding_frenzy slot only',
      );

      assertEqual(
        resolveIslandWorkshopEventMinigame({
          kind: 'timed_event',
          eventId: 'feeding_frenzy',
          ticketsAvailable: 0,
        }),
        null,
        'insufficient tickets should block island_workshop event launch',
      );
    },
  },
  {
    name: 'resolveLuckySpinEventMinigame routes the lucky_spin slot to the Fortune Engine with per-action spend',
    run: () => {
      const descriptor = resolveLuckySpinEventMinigame({
        kind: 'timed_event',
        eventId: 'lucky_spin',
        ticketsAvailable: 3,
      });
      assertEqual(descriptor?.minigameId, 'lucky_spin', 'lucky_spin event routes to the canonical lucky_spin minigame id');
      assertEqual(descriptor?.spendMode, 'per_action', 'Fortune Engine should spend tickets per launch inside the game');
      assertEqual(descriptor?.ticketsSpent, 0, 'opening the Fortune Engine surface should spend no tickets');
      assertEqual(
        descriptor?.config.mode,
        'fortune_engine',
        'resolver should tag the Fortune Engine event mode',
      );
    },
  },
  {
    name: 'resolveLuckySpinEventMinigame is non-launching for non-lucky events but opens with zero tickets',
    run: () => {
      assertEqual(
        resolveLuckySpinEventMinigame({
          kind: 'timed_event',
          eventId: 'feeding_frenzy',
          ticketsAvailable: 3,
        }),
        null,
        'resolver should be scoped to lucky_spin only',
      );
      assertEqual(
        resolveLuckySpinEventMinigame({
          kind: 'timed_event',
          eventId: 'lucky_spin',
          ticketsAvailable: 0,
        })?.minigameId,
        'lucky_spin',
        'zero tickets should not block the Fortune Engine surface (the daily Golden Launch is free)',
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
    name: 'resolveCompanionFeastEventMinigame routes to the Companion Feast fruit-drop game with per-action spend',
    run: () => {
      const descriptor = resolveCompanionFeastEventMinigame({
        kind: 'timed_event',
        eventId: 'companion_feast',
        ticketsAvailable: 3,
      });
      assertEqual(descriptor?.minigameId, 'companion_feast', 'companion_feast should route to companion_feast');
      assertEqual(descriptor?.ticketsSpent, 0, 'per-action launch should spend no tickets at entry');
      assertEqual(descriptor?.spendMode, 'per_action', 'companion_feast should spend tickets per fruit drop');
      assertEqual(
        descriptor?.config.mode,
        'companion_feast',
        'resolver should tag companion_feast event mode',
      );
    },
  },
  {
    name: 'resolveCompanionFeastEventMinigame is non-launching for non-companion events and opens with zero tickets',
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
        })?.minigameId,
        'companion_feast',
        'zero tickets should not block companion_feast launch (drops are gated in-game)',
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
    name: 'integration: Island Workshop launcher path resolves completion and claim handoff end-to-end',
    run: () => {
      runTimedEventCompletionIntegration({
        descriptor: resolveIslandWorkshopEventMinigame({
          kind: 'timed_event',
          eventId: 'feeding_frenzy',
          ticketsAvailable: 3,
        }),
        expectedMinigameId: 'island_workshop',
      });
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
        expectedMinigameId: 'companion_feast',
      });
    },
  },
];
