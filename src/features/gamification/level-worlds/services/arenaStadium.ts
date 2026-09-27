import type { IslandRunGameStateRecord } from './islandRunGameStateStore';
import type { ArenaGameId } from './islandRunArenaCatalog';
import { arenaJourney } from './arenaJourney';
import { resolveIslandRunFeatureAccess } from './islandRunFeatureAccess';
import { resolveIslandRunContractV2Stops } from './islandRunContractV2StopResolver';
import { getCrystalMinersCareer } from './crystalMinersGame';

export function arenaStadiumVisitKey(state: IslandRunGameStateRecord) {
  return `${state.cycleIndex}:${state.currentIslandNumber}:${state.islandStartedAtMs}`;
}
export function arenaStadiumComplete(state: IslandRunGameStateRecord) {
  return state.stopStatesByIndex[2]?.objectiveComplete === true
    || (state.completedStopsByIsland[String(state.currentIslandNumber)] ?? []).includes('mystery');
}
export function arenaStadiumEnterable(state: IslandRunGameStateRecord) {
  if (!resolveIslandRunFeatureAccess(state).ordinaryEvents || arenaStadiumComplete(state)) return false;
  const stops = resolveIslandRunContractV2Stops({ stopStatesByIndex: state.stopStatesByIndex,
    stopBuildStateByIndex: state.stopBuildStateByIndex, islandNumber: state.currentIslandNumber });
  return ['active', 'accessible', 'postponed'].includes(stops.statusesByIndex[2]!);
}
export function currentArenaStadium(state: IslandRunGameStateRecord) {
  const visit = arenaJourney(state.signatureMissionProgressByIsland).stadium;
  return visit?.key === arenaStadiumVisitKey(state) ? visit : null;
}
export function arenaSettledRoundCount(state: IslandRunGameStateRecord, gameId: ArenaGameId, eventId: string) {
  // Miners copies its permanent career into a new event on ordinary workshop
  // actions. An event-local zero baseline would falsely count opening a gift.
  if (gameId === 'crystal_miners') return getCrystalMinersCareer(state.crystalMinersProgressByEvent)?.digs ?? 0;
  if (gameId === 'journey_disc_arena') return state.journeyDiscArenaProgressByEvent[eventId]?.roundsCompleted ?? 0;
  return 0; // Signal Path uses its funded attempt receipt, never a UI score counter.
}
export function arenaStadiumNeedsRoundSettlement(state: IslandRunGameStateRecord) {
  const visit = currentArenaStadium(state), attempt = visit?.attempt;
  return !!attempt && !visit?.playedAtMs && arenaSettledRoundCount(state, attempt.gameId, attempt.eventId) > attempt.baseline;
}
export function arenaStadiumBlocksRoll(state: IslandRunGameStateRecord) {
  const visit = currentArenaStadium(state);
  if (!visit || visit.completedAtMs || !arenaStadiumEnterable(state)) return false;
  // Ticket recovery is not postponement: the saved objective still blocks clear.
  return !!visit.playedAtMs || arenaStadiumNeedsRoundSettlement(state)
    || !!(state.activeTimedEvent && (state.minigameTicketsByEvent[state.activeTimedEvent.eventId] ?? 0) > 0);
}
