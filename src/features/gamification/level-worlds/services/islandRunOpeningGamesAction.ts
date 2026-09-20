import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';
import {
  advanceOpeningGamesPreparation,
  beginOpeningGamesInauguralRound,
  resolveOpeningGamesCeremony,
  settleOpeningGamesInauguralRound,
  OPENING_GAMES_CEREMONY_KEY,
  OPENING_GAMES_INAUGURAL_GAME_ID,
  OPENING_GAMES_STARTER_TICKETS,
  type OpeningGamesPreparationAction,
} from './islandRunOpeningGames';
import { ensureIslandRunContractV2ActiveTimedEvent } from './islandRunContractV2RewardBar';
import type { IslandRunMinigameResult } from './islandRunMinigameTypes';

export function beginIslandRunOpeningGame(options: { session: Session; client: SupabaseClient | null }) {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    const current = resolveOpeningGamesCeremony(state.signatureMissionProgressByIsland);
    const attemptId = current.activeAttemptId ?? crypto.randomUUID();
    const progress = beginOpeningGamesInauguralRound(state.signatureMissionProgressByIsland, state.currentIslandNumber, attemptId, Date.now());
    if (!progress) return null;
    if (!current.activeAttemptId) await commitIslandRunState({ ...options,
      triggerSource: 'begin_opening_games_inaugural_round',
      record: { ...state, runtimeVersion: state.runtimeVersion + 1,
        signatureMissionProgressByIsland: { ...state.signatureMissionProgressByIsland, [OPENING_GAMES_CEREMONY_KEY]: progress } },
    });
    return { attemptId, minigameId: OPENING_GAMES_INAUGURAL_GAME_ID,
      config: { openingCeremony: true, arenaSessionSeconds: 60, arenaTimerManagedByGame: true } };
  });
}

/** Settle the exact persisted tutorial attempt. The game's reward payload is
 * deliberately ignored: this introduction grants only the one starter bundle
 * in the existing active-event ticket ledger, never a parallel event wallet. */
export function settleIslandRunOpeningGame(options: {
  session: Session; client: SupabaseClient | null; attemptId: string; result: IslandRunMinigameResult;
}) {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    const performance = options.result.arenaPerformance;
    if (options.result.completed && (!performance || performance.gameId !== OPENING_GAMES_INAUGURAL_GAME_ID
      || ![performance.rawScore, performance.mastery, performance.durationMs, performance.mistakes, performance.hintsUsed].every(Number.isFinite)
      || performance.durationMs < 0)) return { status: 'invalid-result' as const, ticketsGranted: 0 };
    const nowMs = Date.now();
    const progress = settleOpeningGamesInauguralRound({
      ledger: state.signatureMissionProgressByIsland, islandNumber: state.currentIslandNumber,
      attemptId: options.attemptId, gameId: OPENING_GAMES_INAUGURAL_GAME_ID,
      outcome: options.result.completed ? 'won' : 'cancelled', nowMs,
    });
    if (!progress) return { status: 'ineligible' as const, ticketsGranted: 0 };
    const eventState = options.result.completed
      ? ensureIslandRunContractV2ActiveTimedEvent({ state, nowMs }).state : state;
    const eventId = eventState.activeTimedEvent?.eventId;
    const ticketsGranted = options.result.completed && eventId && progress.firstTicketBoostEventId === null
      ? OPENING_GAMES_STARTER_TICKETS : 0;
    await commitIslandRunState({ session: options.session, client: options.client,
      triggerSource: 'settle_opening_games_inaugural_round',
      record: { ...state, ...eventState, runtimeVersion: state.runtimeVersion + 1,
        signatureMissionProgressByIsland: { ...state.signatureMissionProgressByIsland,
          [OPENING_GAMES_CEREMONY_KEY]: { ...progress, firstTicketBoostEventId: ticketsGranted ? eventId! : progress.firstTicketBoostEventId } },
        minigameTicketsByEvent: ticketsGranted && eventId
          ? { ...state.minigameTicketsByEvent, [eventId]: (state.minigameTicketsByEvent[eventId] ?? 0) + ticketsGranted }
          : state.minigameTicketsByEvent,
      },
    });
    return { status: options.result.completed ? 'completed' as const : 'cancelled' as const, ticketsGranted };
  });
}

/** Reads funded construction from the canonical store, never from UI claims.
 * Repeated taps serialize with rolls/builds and cannot repeat a milestone. */
export function prepareIslandRunOpeningGames(options: {
  session: Session;
  client: SupabaseClient | null;
  action: OpeningGamesPreparationAction;
}) {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    const result = advanceOpeningGamesPreparation({
      ledger: state.signatureMissionProgressByIsland,
      islandNumber: state.currentIslandNumber,
      action: options.action,
      buildLevels: state.stopBuildStateByIndex.map(stop => stop.buildLevel),
      nowMs: Date.now(),
    });
    if (result.status !== 'ok') return result;
    // Ensure the ordinary shared clock exists before revealing its launcher,
    // even if no earlier tile/UI lifecycle ever initialised it. This does not
    // create a parallel ceremony event, wallet, egg or ticket grant.
    const eventState = options.action === 'light-beacon'
      ? ensureIslandRunContractV2ActiveTimedEvent({ state, nowMs: Date.now() }).state : state;
    await commitIslandRunState({
      session: options.session,
      client: options.client,
      triggerSource: `opening_games_${options.action.replace(/-/g, '_')}`,
      record: {
        ...state,
        ...eventState,
        runtimeVersion: state.runtimeVersion + 1,
        signatureMissionProgressByIsland: {
          ...state.signatureMissionProgressByIsland,
          [OPENING_GAMES_CEREMONY_KEY]: result.progress,
        },
      },
    });
    return result;
  });
}
