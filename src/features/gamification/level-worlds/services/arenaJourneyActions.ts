import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { ArenaGameId } from './islandRunArenaCatalog';
import type { IslandRunMinigameResult } from './islandRunMinigameTypes';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';
import { resolveIslandRunFeatureAccess } from './islandRunFeatureAccess';
import { resolveOpeningGamesCeremony } from './islandRunOpeningGames';
import { ARENA_JOURNEY_KEY, arenaJourney, arenaIntroductionAvailable, canCompareArenaGames, arenaComparisonKey } from './arenaJourney';
import type { IslandRunGameStateRecord } from './islandRunGameStateStore';

/** Derive genuine play from canonical settlements, never the bounded launch history. */
export function resolveArenaJourney(state: IslandRunGameStateRecord) {
  const progress = arenaJourney(state.signatureMissionProgressByIsland);
  const ceremony = resolveOpeningGamesCeremony(state.signatureMissionProgressByIsland);
  if (ceremony.completedAtMs) {
    progress.introduced.signal_path ??= ceremony.completedAtMs;
    progress.played.signal_path ??= ceremony.completedAtMs;
  }
  if (progress.introduced.crystal_miners && Object.values(state.crystalMinersProgressByEvent ?? {}).some(p => p.digs > 0)) {
    progress.played.crystal_miners ??= progress.introduced.crystal_miners;
  }
  // A banked round includes both wins and losses. Opening/starting is not enough.
  if (progress.introduced.journey_disc_arena && Object.values(state.journeyDiscArenaProgressByEvent ?? {}).some(p => p.roundsCompleted > 0)) {
    progress.played.journey_disc_arena ??= progress.introduced.journey_disc_arena;
  }
  return progress;
}
type Command = { kind: 'introduce'; gameId: ArenaGameId }
  | { kind: 'begin-signal'; eventId: string }
  | { kind: 'settle-signal'; attemptId: string; result: IslandRunMinigameResult }
  | { kind: 'compare'; pair: [ArenaGameId, ArenaGameId]; winner: ArenaGameId };
export function applyArenaJourneyAction(options: {
  session: Session; client: SupabaseClient | null; expectedIsland: number; command: Command;
}) {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session), island = state.currentIslandNumber;
    if (island !== options.expectedIsland || !resolveIslandRunFeatureAccess(state).ordinaryEvents) return null;
    const next = resolveArenaJourney(state), command = options.command, now = Date.now();
    let attemptId: string | null = null;
    let tickets = state.minigameTicketsByEvent;
    if (command.kind === 'introduce') {
      if (!arenaIntroductionAvailable(command.gameId, island)) return null;
      next.introduced[command.gameId] ??= now;
    } else if (command.kind === 'begin-signal') {
      if (!next.introduced.signal_path || !state.activeTimedEvent || state.activeTimedEvent.eventId !== command.eventId) return null;
      const resume = next.signalAttempt?.island === island && next.signalAttempt.eventId === command.eventId;
      if (!resume && (tickets[command.eventId] ?? 0) < 1) return null;
      attemptId = resume ? next.signalAttempt!.id : crypto.randomUUID();
      if (!resume) tickets = { ...tickets, [command.eventId]: tickets[command.eventId]! - 1 };
      next.signalAttempt = { id: attemptId, island, eventId: command.eventId };
    } else if (command.kind === 'settle-signal') {
      const attempt = next.signalAttempt, report = command.result.arenaPerformance;
      if (!attempt || attempt.id !== command.attemptId || attempt.island !== island) return null;
      next.signalAttempt = null;
      if (command.result.completed && report?.gameId === 'signal_path'
        && [report.durationMs, report.rawScore, report.mastery, report.mistakes, report.hintsUsed].every(Number.isFinite)
        && report.durationMs >= 0) next.played.signal_path ??= now;
    } else {
      if (!canCompareArenaGames(command.pair, island, next) || !command.pair.includes(command.winner)) return null;
      next.comparisons[arenaComparisonKey(...command.pair)] = { winner: command.winner, at: now };
    }
    next.updatedAtMs = now;
    await commitIslandRunState({ session: options.session, client: options.client, triggerSource: `arena_journey_${command.kind}`,
      record: { ...state, runtimeVersion: state.runtimeVersion + 1,
        minigameTicketsByEvent: tickets,
        signatureMissionProgressByIsland: { ...state.signatureMissionProgressByIsland, [ARENA_JOURNEY_KEY]: next } } });
    return { attemptId, progress: next };
  });
}
