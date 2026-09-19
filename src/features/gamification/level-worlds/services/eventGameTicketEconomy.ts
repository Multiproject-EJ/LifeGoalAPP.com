import type { ArenaGameId } from './islandRunArenaCatalog';

/** Event tickets are a shared funding budget, never independently cloned into every game.
 * Earned and server-credited purchased tickets use the same conversion. Already-funded
 * plays remain in that game's save, so later tuning never devalues a converted balance. */
export const EVENT_GAME_PLAYS_PER_TICKET: Readonly<Record<ArenaGameId, number>> = Object.freeze({
  feeding_frenzy: 1, lucky_spin: 1, space_excavator: 1, companion_feast: 1,
  skybound_expedition: 1, journey_disc_arena: 1, momentum_matrix: 1,
  concord_categories: 1, lexicon_relay: 1, signal_path: 1, twin_sigils: 1,
  crystal_miners: 3,
});
const quantity = (n:number) => Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
export function eventGamePlaysAvailable(gameId:ArenaGameId, eventTickets:number, savedPlays=0):number {
  return quantity(eventTickets)*EVENT_GAME_PLAYS_PER_TICKET[gameId]+quantity(savedPlays);
}
export function spendEventGamePlay(gameId:ArenaGameId,eventTickets:number,savedPlays=0) {
  if(quantity(savedPlays)>0)return {ticketsSpent:0,savedPlays:quantity(savedPlays)-1};
  if(quantity(eventTickets)<1)return null;
  return {ticketsSpent:1,savedPlays:EVENT_GAME_PLAYS_PER_TICKET[gameId]-1};
}
export function eventGamePackPlays(gameId:ArenaGameId,serverPackTickets:number):number {
  return eventGamePlaysAvailable(gameId,serverPackTickets);
}
