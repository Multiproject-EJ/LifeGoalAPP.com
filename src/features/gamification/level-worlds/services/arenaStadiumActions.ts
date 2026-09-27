import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { ArenaGameId } from './islandRunArenaCatalog';
import type { IslandRunGameStateRecord } from './islandRunGameStateStore';
import { ARENA_JOURNEY_KEY, introducedArenaGames, nextArenaComparison, pendingArenaIntroductions } from './arenaJourney';
import { resolveArenaJourney } from './arenaJourneyActions';
import { arenaSettledRoundCount, arenaStadiumEnterable, arenaStadiumNeedsRoundSettlement, arenaStadiumVisitKey } from './arenaStadium';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';
import { resolveIslandRunContractV2Stops } from './islandRunContractV2StopResolver';
import { applyLandmarkCompletionReward } from './islandRunLandmarkReward';
import { SHARD_EARN } from './shardMilestoneEngine';

/** The stadium owns activity credit. Launch/close/comparison alone never completes it. */
export function applyArenaStadiumAction(options: {
  session: Session; client: SupabaseClient | null; expectedVisitKey: string;
  command: { kind: 'enter' | 'refresh' } | { kind: 'play'; gameId: ArenaGameId; eventId: string };
}) {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session), key = arenaStadiumVisitKey(state);
    if (key !== options.expectedVisitKey || !arenaStadiumEnterable(state)) return null;
    const progress = resolveArenaJourney(state), now = Date.now();
    if (progress.stadium?.key !== key) {
      if (options.command.kind === 'refresh') return null;
      progress.stadium = { key, startedAtMs: now, playedAtMs: null, completedAtMs: null, attempt: null };
    }
    const visit = progress.stadium;
    if (arenaStadiumNeedsRoundSettlement(state)) visit.playedAtMs ??= now;
    const command = options.command;
    if (command.kind === 'play') {
      if (visit.playedAtMs || !introducedArenaGames(state.currentIslandNumber, progress).includes(command.gameId)
        || state.activeTimedEvent?.eventId !== command.eventId) return null;
      // Reopening an unfinished workshop retains its pre-play baseline across reload.
      if (visit.attempt?.gameId !== command.gameId || visit.attempt.eventId !== command.eventId) {
        visit.attempt = { gameId: command.gameId, eventId: command.eventId,
          baseline: arenaSettledRoundCount(state, command.gameId, command.eventId) };
      }
    }
    const complete = !!visit.playedAtMs && !pendingArenaIntroductions(state.currentIslandNumber, progress).length
      && !nextArenaComparison(state.currentIslandNumber, progress, true);
    if (complete) visit.completedAtMs = now;
    progress.updatedAtMs = now;
    let next: IslandRunGameStateRecord = { ...state, runtimeVersion: state.runtimeVersion + 1,
      signatureMissionProgressByIsland: { ...state.signatureMissionProgressByIsland, [ARENA_JOURNEY_KEY]: progress } };
    if (complete) {
      const stopStates = state.stopStatesByIndex.map((entry, index) => index === 2
        ? { ...entry, objectiveComplete: true, accessUnlocked: true, postponedAtMs: null, completedAtMs: now }
        : index === 3 ? { ...entry, accessUnlocked: true } : entry);
      const resolution = resolveIslandRunContractV2Stops({ stopStatesByIndex: stopStates,
        stopBuildStateByIndex: state.stopBuildStateByIndex, islandNumber: state.currentIslandNumber });
      next = applyLandmarkCompletionReward(state, { ...next, stopStatesByIndex: stopStates,
        activeStopIndex: resolution.activeStopIndex, activeStopType: resolution.activeStopType,
        completedStopsByIsland: { ...state.completedStopsByIsland,
          [String(state.currentIslandNumber)]: [...new Set([...(state.completedStopsByIsland[String(state.currentIslandNumber)] ?? []), 'mystery'])] },
        shards: state.shards + 1, islandShards: state.islandShards + SHARD_EARN.stop_complete }, options.session.user.id);
    }
    await commitIslandRunState({ session: options.session, client: options.client, record: next, triggerSource: `arena_stadium_${command.kind}` });
    return { complete, progress };
  });
}
