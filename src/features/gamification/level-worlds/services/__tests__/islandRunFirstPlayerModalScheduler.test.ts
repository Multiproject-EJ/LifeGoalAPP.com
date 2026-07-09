import { createIslandRunGuestFunnelState } from '../islandRunGuestFunnelState';
import { resolveIslandRunFirstPlayerModalPrompt } from '../islandRunFirstPlayerModalScheduler';
import { assertEqual, type TestCase } from './testHarness';

const guest = () => createIslandRunGuestFunnelState({ guestId: 'guest_modal', now: 1000 });

export const islandRunFirstPlayerModalSchedulerTests: TestCase[] = [
  {
    name: 'disabled feature flag produces no visible prompt',
    run: () => {
      const decision = resolveIslandRunFirstPlayerModalPrompt({ featureEnabled: false, guestFunnelState: guest(), arenaCompletedForSoftSavePrompt: true });
      assertEqual(decision.promptId, null, 'Expected no prompt when scaffolding is disabled');
    },
  },
  {
    name: 'minigame story tutorial and reward modals suppress save prompts by priority',
    run: () => {
      const cases = [
        ['active_minigame_or_boss_overlay', { hasActiveMinigameOrBossOverlay: true }],
        ['story_reader_major_narrative', { hasStoryReaderMajorNarrative: true }],
        ['first_session_tutorial_hatchery_guidance', { needsFirstSessionTutorialHatcheryGuidance: true }],
        ['reward_claim_welcome_pack_reveal', { hasRewardClaimOrWelcomePackReveal: true }],
      ] as const;
      for (const [expected, overlay] of cases) {
        const decision = resolveIslandRunFirstPlayerModalPrompt({ featureEnabled: true, guestFunnelState: guest(), arenaCompletedForSoftSavePrompt: true, ...overlay });
        assertEqual(decision.promptId, expected, `Expected ${expected} to outrank save prompts`);
      }
    },
  },
  {
    name: 'soft save prompt is eligible only after Arena condition and only once',
    run: () => {
      const unseen = guest();
      assertEqual(resolveIslandRunFirstPlayerModalPrompt({ featureEnabled: true, guestFunnelState: unseen }).promptId, null, 'Expected no soft prompt before Arena condition');
      assertEqual(resolveIslandRunFirstPlayerModalPrompt({ featureEnabled: true, guestFunnelState: unseen, isAnonymousGuest: true, islandNumber: 1, cycleIndex: 0, arenaCompletedForSoftSavePrompt: true }).promptId, 'first_progress_recap_after_arena', 'Expected progress recap before save prompt after Arena condition');
      assertEqual(resolveIslandRunFirstPlayerModalPrompt({ featureEnabled: true, guestFunnelState: { ...unseen, hasSeenFirstProgressRecapAfterArena: true }, isAnonymousGuest: true, islandNumber: 1, cycleIndex: 0, arenaCompletedForSoftSavePrompt: true }).promptId, 'soft_save_prompt_after_arena', 'Expected soft prompt after recap is dismissed');
      assertEqual(resolveIslandRunFirstPlayerModalPrompt({ featureEnabled: true, guestFunnelState: { ...unseen, hasSeenFirstProgressRecapAfterArena: true, hasSeenSoftSavePromptAfterArena: true }, isAnonymousGuest: true, islandNumber: 1, cycleIndex: 0, arenaCompletedForSoftSavePrompt: true }).promptId, null, 'Expected no repeated soft prompt');
    },
  },

  {
    name: 'soft save prompt is limited to anonymous Island 1 cycle 0 guests',
    run: () => {
      const base = { featureEnabled: true, guestFunnelState: guest(), arenaCompletedForSoftSavePrompt: true };
      assertEqual(resolveIslandRunFirstPlayerModalPrompt({ ...base, isAnonymousGuest: false, islandNumber: 1, cycleIndex: 0 }).promptId, null, 'Expected permanent users to skip soft save prompt');
      assertEqual(resolveIslandRunFirstPlayerModalPrompt({ ...base, isAnonymousGuest: true, islandNumber: 2, cycleIndex: 0 }).promptId, null, 'Expected non-Island 1 runs to skip soft save prompt');
      assertEqual(resolveIslandRunFirstPlayerModalPrompt({ ...base, isAnonymousGuest: true, islandNumber: 1, cycleIndex: 1 }).promptId, null, 'Expected non-cycle-0 runs to skip soft save prompt');
    },
  },
  {
    name: 'strong save prompt outranks soft save prompt',
    run: () => {
      const decision = resolveIslandRunFirstPlayerModalPrompt({ featureEnabled: true, guestFunnelState: guest(), isAnonymousGuest: true, islandNumber: 1, cycleIndex: 0, arenaCompletedForSoftSavePrompt: true, beforeMajorTravelForStrongSavePrompt: true });
      assertEqual(decision.promptId, 'strong_save_prompt_before_travel', 'Expected strong prompt priority');
    },
  },
  {
    name: 'claimed users do not see guest save prompts',
    run: () => {
      const decision = resolveIslandRunFirstPlayerModalPrompt({ featureEnabled: true, guestFunnelState: { ...guest(), claimStatus: 'claimed', claimedUserId: 'user_1' }, isAnonymousGuest: true, islandNumber: 1, cycleIndex: 0, arenaCompletedForSoftSavePrompt: true, beforeMajorTravelForStrongSavePrompt: true });
      assertEqual(decision.promptId, null, 'Expected claimed users to skip guest save prompts');
    },
  },
  {
    name: 'timeline and customization prompts do not show over higher-priority gameplay modals',
    run: () => {
      const decision = resolveIslandRunFirstPlayerModalPrompt({ featureEnabled: true, guestFunnelState: guest(), hasActiveStopOrLandmarkModal: true, isGuestNameShipCustomizationEligible: true, isGuestTimelineExplainerEligible: true });
      assertEqual(decision.promptId, 'active_stop_or_landmark_modal', 'Expected active stop modal to outrank funnel prompts');
    },
  },
  {
    name: 'customization outranks timeline when no higher-priority modal exists',
    run: () => {
      const decision = resolveIslandRunFirstPlayerModalPrompt({ featureEnabled: true, guestFunnelState: guest(), isGuestNameShipCustomizationEligible: true, isGuestTimelineExplainerEligible: true });
      assertEqual(decision.promptId, 'guest_name_ship_customization', 'Expected customization before timeline explainer');
    },
  },
];
