import type { IslandRunGuestFunnelStateV1 } from './islandRunGuestFunnelState';

export type IslandRunFirstPlayerPromptId =
  | 'critical_auth_or_claim_error'
  | 'active_minigame_or_boss_overlay'
  | 'story_reader_major_narrative'
  | 'first_session_tutorial_hatchery_guidance'
  | 'reward_claim_welcome_pack_reveal'
  | 'active_stop_or_landmark_modal'
  | 'strong_save_prompt_before_travel'
  | 'first_progress_recap_after_arena'
  | 'soft_save_prompt_after_arena'
  | 'guest_name_ship_customization'
  | 'guest_play_timeline_explainer'
  | 'ambient_narrative_dialogue'
  | 'optional_promotional_modal';

export interface IslandRunFirstPlayerModalSchedulerInput {
  featureEnabled?: boolean;
  guestFunnelState?: IslandRunGuestFunnelStateV1 | null;
  hasCriticalAuthSessionOrClaimError?: boolean;
  hasActiveMinigameOrBossOverlay?: boolean;
  hasStoryReaderMajorNarrative?: boolean;
  needsFirstSessionTutorialHatcheryGuidance?: boolean;
  hasRewardClaimOrWelcomePackReveal?: boolean;
  hasActiveStopOrLandmarkModal?: boolean;
  isGuestNameShipCustomizationEligible?: boolean;
  isGuestTimelineExplainerEligible?: boolean;
  hasAmbientNarrativeDialogue?: boolean;
  hasOptionalPromotionalModal?: boolean;
  arenaCompletedForSoftSavePrompt?: boolean;
  isAnonymousGuest?: boolean;
  islandNumber?: number;
  cycleIndex?: number;
  beforeMajorTravelForStrongSavePrompt?: boolean;
}

export interface IslandRunFirstPlayerModalDecision {
  promptId: IslandRunFirstPlayerPromptId | null;
  reason: string;
}

function isClaimed(state: IslandRunGuestFunnelStateV1 | null | undefined): boolean {
  return !state || state.claimStatus === 'claimed' || Boolean(state.claimedUserId);
}

export function resolveIslandRunFirstPlayerModalPrompt(
  input: IslandRunFirstPlayerModalSchedulerInput,
): IslandRunFirstPlayerModalDecision {
  if (!input.featureEnabled) return { promptId: null, reason: 'first-player funnel scaffolding flag disabled' };

  const orderedBlockers: Array<[boolean | undefined, IslandRunFirstPlayerPromptId, string]> = [
    [input.hasCriticalAuthSessionOrClaimError, 'critical_auth_or_claim_error', 'critical auth/session/claim error has priority'],
    [input.hasActiveMinigameOrBossOverlay, 'active_minigame_or_boss_overlay', 'active minigame or boss overlay has priority'],
    [input.hasStoryReaderMajorNarrative, 'story_reader_major_narrative', 'major story reader has priority'],
    [input.needsFirstSessionTutorialHatcheryGuidance, 'first_session_tutorial_hatchery_guidance', 'first-session Hatchery guidance has priority'],
    [input.hasRewardClaimOrWelcomePackReveal, 'reward_claim_welcome_pack_reveal', 'reward claim or Welcome Pack reveal has priority'],
    [input.hasActiveStopOrLandmarkModal, 'active_stop_or_landmark_modal', 'active stop or landmark modal has priority'],
  ];

  for (const [active, promptId, reason] of orderedBlockers) {
    if (active) return { promptId, reason };
  }

  const guestState = input.guestFunnelState;
  const claimed = isClaimed(guestState);
  const isAnonymousIslandOneCycleZeroGuest = input.isAnonymousGuest === true
    && (input.islandNumber ?? 1) === 1
    && (input.cycleIndex ?? 0) === 0;
  if (!claimed && input.isAnonymousGuest === true && input.beforeMajorTravelForStrongSavePrompt && !guestState?.hasSeenStrongSavePromptBeforeTravel) {
    return { promptId: 'strong_save_prompt_before_travel', reason: 'guest is before major travel and has not seen the strong save prompt' };
  }
  if (!claimed && isAnonymousIslandOneCycleZeroGuest && input.arenaCompletedForSoftSavePrompt && !guestState?.hasSeenFirstProgressRecapAfterArena) {
    return { promptId: 'first_progress_recap_after_arena', reason: 'guest completed Arena condition and has not seen the first progress recap' };
  }
  if (!claimed && isAnonymousIslandOneCycleZeroGuest && input.arenaCompletedForSoftSavePrompt && guestState?.hasSeenFirstProgressRecapAfterArena && !guestState?.hasSeenSoftSavePromptAfterArena) {
    return { promptId: 'soft_save_prompt_after_arena', reason: 'guest saw first progress recap and has not seen the soft save prompt' };
  }
  if (!claimed && input.isGuestNameShipCustomizationEligible && (!guestState?.displayName || !guestState?.shipName || !guestState?.shipStyleId)) {
    return { promptId: 'guest_name_ship_customization', reason: 'guest customization is eligible and incomplete' };
  }
  if (!claimed && input.isGuestTimelineExplainerEligible && !guestState?.hasSeenGuestTimeline) {
    return { promptId: 'guest_play_timeline_explainer', reason: 'guest timeline explainer is eligible and unseen' };
  }
  if (input.hasAmbientNarrativeDialogue) return { promptId: 'ambient_narrative_dialogue', reason: 'ambient narrative is available' };
  if (input.hasOptionalPromotionalModal) return { promptId: 'optional_promotional_modal', reason: 'optional promotional modal is available' };
  return { promptId: null, reason: 'no first-player funnel prompt eligible' };
}
