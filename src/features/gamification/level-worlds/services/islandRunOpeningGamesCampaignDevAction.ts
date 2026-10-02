import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';
import {
  OPENING_GAMES_CAMPAIGN_KEY,
  createOpeningGamesCampaignMarker,
  usesOpeningGamesCampaign,
} from './islandRunOpeningGames';

export type DevEnrollOpeningGamesCampaignResult = { status: 'ok' | 'already_enrolled' };

/**
 * DEV ONLY: enrol the current save in the new-journey ("opening games")
 * campaign cohort so QA can play its gated content (Island 002 Opening Arena,
 * Stormfront, …). Production enrolment is deliberately not wired yet (see
 * docs/gauntlets/2026-09-19-gradual-island-feature-introductions.md); the UI
 * must gate this on dev mode. Only the cohort marker changes; earned
 * progress is untouched.
 */
export function devEnrollOpeningGamesCampaign(options: {
  session: Session;
  client: SupabaseClient | null;
  nowMs?: number;
}): Promise<DevEnrollOpeningGamesCampaignResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    if (usesOpeningGamesCampaign(state.signatureMissionProgressByIsland ?? {})) return { status: 'already_enrolled' };
    await commitIslandRunState({
      session: options.session,
      client: options.client,
      record: {
        ...state,
        runtimeVersion: state.runtimeVersion + 1,
        signatureMissionProgressByIsland: {
          ...state.signatureMissionProgressByIsland,
          [OPENING_GAMES_CAMPAIGN_KEY]: { ...createOpeningGamesCampaignMarker('opening-games-v1'), updatedAtMs: options.nowMs ?? Date.now() },
        },
      },
      triggerSource: 'opening_games_campaign_dev_enrol',
    });
    return { status: 'ok' };
  });
}
