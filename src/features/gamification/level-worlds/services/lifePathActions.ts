import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';
import {
  LIFE_PATH_KEY,
  createLifePathProgress,
  nextOfferIslandAfterDecline,
  resolveLifePathProgress,
  type LifePathIntent,
  type LifePathProgress,
} from './lifePathProgress';

type LifePathUpdate = (current: LifePathProgress, context: { nowMs: number; currentIslandNumber: number }) => LifePathProgress | null;

function updateLifePath(options: {
  session: Session;
  client: SupabaseClient | null;
  triggerSource: string;
  update: LifePathUpdate;
}): Promise<LifePathProgress | null> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    const nowMs = Date.now();
    const current = resolveLifePathProgress(state.signatureMissionProgressByIsland) ?? createLifePathProgress(nowMs);
    const next = options.update(current, { nowMs, currentIslandNumber: state.currentIslandNumber });
    if (!next) return current;
    const stamped: LifePathProgress = { ...next, updatedAtMs: Math.max(nowMs, current.updatedAtMs + 1) };
    await commitIslandRunState({
      session: options.session,
      client: options.client,
      triggerSource: options.triggerSource,
      record: {
        ...state,
        runtimeVersion: state.runtimeVersion + 1,
        signatureMissionProgressByIsland: { ...state.signatureMissionProgressByIsland, [LIFE_PATH_KEY]: stamped },
      },
    });
    return stamped;
  });
}

/** "What brings you here?" Answered once; later answers just update it. */
export function answerLifePathIntent(options: { session: Session; client: SupabaseClient | null; intent: LifePathIntent }) {
  return updateLifePath({
    ...options,
    triggerSource: 'life_path_intent',
    update: (current, { nowMs }) => (current.intent === options.intent ? null : {
      ...current, intent: options.intent, intentAnsweredAtMs: nowMs,
    }),
  });
}

/** Opens the life app early. Permanent; replays are no-ops. */
export function acceptLifeFastTrack(options: { session: Session; client: SupabaseClient | null }) {
  return updateLifePath({
    ...options,
    triggerSource: 'life_path_fast_track_accept',
    update: (current, { nowMs }) => (current.fastTrackAcceptedAtMs ? null : { ...current, fastTrackAcceptedAtMs: nowMs }),
  });
}

/** "Not yet, keep playing": the offer comes back a few islands later. */
export function declineLifeFastTrack(options: { session: Session; client: SupabaseClient | null }) {
  return updateLifePath({
    ...options,
    triggerSource: 'life_path_fast_track_decline',
    update: (current, { currentIslandNumber }) => (current.fastTrackAcceptedAtMs ? null : {
      ...current,
      nextOfferIsland: nextOfferIslandAfterDecline(currentIslandNumber),
      declineCount: current.declineCount + 1,
    }),
  });
}

/** Compass Book "I'm ready now": show the offer on the current island. */
export function reopenLifeFastTrackOffer(options: { session: Session; client: SupabaseClient | null }) {
  return updateLifePath({
    ...options,
    triggerSource: 'life_path_fast_track_reopen',
    update: (current, { currentIslandNumber }) => (current.fastTrackAcceptedAtMs ? null : {
      ...current,
      intent: current.intent ?? 'both',
      intentAnsweredAtMs: current.intentAnsweredAtMs ?? Date.now(),
      nextOfferIsland: Math.max(1, Math.floor(currentIslandNumber)),
    }),
  });
}
