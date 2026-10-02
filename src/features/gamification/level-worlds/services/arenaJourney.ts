import { ARENA_GAME_IDS, type ArenaGameId } from './islandRunArenaCatalog';
import type { IslandRunSignatureMissionProgressByIsland } from './islandRunSignatureMissions';

/** Owner-scoped, permanent introductions. Current island still limits visibility. */
export const ARENA_JOURNEY_KEY = 'arena-journey-v1';
// Crystal Miners opens the Arena journey on Island 002, launched from its four
// corner drop ramps (user decision 2026-10-02); Signal Path follows on 003.
export const ARENA_INTRODUCTIONS: Partial<Record<ArenaGameId, number>> = {
  crystal_miners: 2, signal_path: 3, journey_disc_arena: 6,
};
export const ARENA_DEMO_IDS: readonly ArenaGameId[] = ['twin_sigils', 'concord_categories', 'lexicon_relay'];
export interface ArenaStadiumVisit {
  key: string;
  startedAtMs: number;
  playedAtMs: number | null;
  completedAtMs: number | null;
  attempt: { gameId: ArenaGameId; eventId: string; baseline: number } | null;
}
export interface ArenaJourneyProgress {
  missionId: 'arena-journey'; version: 1; updatedAtMs: number;
  introduced: Partial<Record<ArenaGameId, number>>;
  played: Partial<Record<ArenaGameId, number>>;
  signalAttempt: { id: string; island: number; eventId: string; visitKey?: string } | null;
  comparisons: Record<string, { winner: ArenaGameId; at: number }>;
  stadium: ArenaStadiumVisit | null;
}
const timestamp = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;
export function sanitizeArenaJourney(value: unknown): ArenaJourneyProgress {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<ArenaJourneyProgress>;
  const introduced: ArenaJourneyProgress['introduced'] = {}, played: ArenaJourneyProgress['played'] = {};
  for (const id of ARENA_GAME_IDS) {
    if (ARENA_INTRODUCTIONS[id] && timestamp(raw.introduced?.[id])) introduced[id] = raw.introduced![id];
    if (introduced[id] && timestamp(raw.played?.[id])) played[id] = raw.played![id];
  }
  const comparisons: ArenaJourneyProgress['comparisons'] = {};
  for (const a of ARENA_GAME_IDS) for (const b of ARENA_GAME_IDS) {
    if (a >= b) continue;
    const key = arenaComparisonKey(a, b), vote = raw.comparisons?.[key];
    if (vote && (vote.winner === a || vote.winner === b) && timestamp(vote.at)) comparisons[key] = vote;
  }
  const attempt = raw.signalAttempt;
  const stadium = raw.stadium;
  const stadiumAttempt = stadium?.attempt;
  return { missionId: 'arena-journey', version: 1, updatedAtMs: timestamp(raw.updatedAtMs) ? raw.updatedAtMs : 0,
    introduced, played, comparisons,
    stadium: stadium && /^\d+:\d+:\d+$/.test(stadium.key) && stadium.key.length < 100 && timestamp(stadium.startedAtMs)
      ? { key: stadium.key, startedAtMs: stadium.startedAtMs,
        playedAtMs: timestamp(stadium.playedAtMs) ? stadium.playedAtMs : null,
        completedAtMs: timestamp(stadium.playedAtMs) && timestamp(stadium.completedAtMs) ? stadium.completedAtMs : null,
        attempt: stadiumAttempt && !!ARENA_INTRODUCTIONS[stadiumAttempt.gameId]
          && typeof stadiumAttempt.eventId === 'string' && stadiumAttempt.eventId.length <= 160
          && Number.isFinite(stadiumAttempt.baseline) && stadiumAttempt.baseline >= 0
          ? { gameId: stadiumAttempt.gameId, eventId: stadiumAttempt.eventId, baseline: stadiumAttempt.baseline } : null } : null,
    signalAttempt: attempt && typeof attempt.id === 'string' && attempt.id.length <= 100
      && Number.isInteger(attempt.island) && attempt.island >= 2
      && typeof attempt.eventId === 'string' && attempt.eventId.length <= 160 ? attempt : null };
}
export function mergeArenaJourney(a: ArenaJourneyProgress, b: ArenaJourneyProgress): ArenaJourneyProgress {
  const newer = a.updatedAtMs >= b.updatedAtMs ? a : b;
  const next = sanitizeArenaJourney({ ...newer, introduced: { ...a.introduced, ...b.introduced }, played: { ...a.played, ...b.played } });
  for (const id of ARENA_GAME_IDS) {
    if (a.introduced[id] && b.introduced[id]) next.introduced[id] = Math.min(a.introduced[id]!, b.introduced[id]!);
    if (a.played[id] && b.played[id]) next.played[id] = Math.min(a.played[id]!, b.played[id]!);
  }
  for (const key of new Set([...Object.keys(a.comparisons), ...Object.keys(b.comparisons)])) {
    const left = a.comparisons[key], right = b.comparisons[key];
    next.comparisons[key] = !left ? right! : !right || left.at >= right.at ? left : right;
  }
  // Same-visit settlement is monotonic; an older in-flight save cannot erase it.
  if (a.stadium && b.stadium && a.stadium.key === b.stadium.key && next.stadium) {
    next.stadium.playedAtMs = a.stadium.playedAtMs ?? b.stadium.playedAtMs;
    next.stadium.completedAtMs = a.stadium.completedAtMs ?? b.stadium.completedAtMs;
  }
  return next;
}
export function arenaJourney(ledger: IslandRunSignatureMissionProgressByIsland = {}) {
  return sanitizeArenaJourney(ledger[ARENA_JOURNEY_KEY]);
}
export function arenaComparisonKey(a: ArenaGameId, b: ArenaGameId) { return [a, b].sort().join(':'); }
export function arenaIntroductionAvailable(id: ArenaGameId, island: number) {
  const start = ARENA_INTRODUCTIONS[id];
  return Number.isInteger(island) && island >= 2 && !!start && island >= start;
}
export function introducedArenaGames(island: number, progress: ArenaJourneyProgress): ArenaGameId[] {
  return ARENA_GAME_IDS.filter(id => arenaIntroductionAvailable(id, island) && !!progress.introduced[id]);
}
export function pendingArenaIntroductions(island: number, progress: ArenaJourneyProgress): ArenaGameId[] {
  return ARENA_GAME_IDS.filter(id => arenaIntroductionAvailable(id, island) && !progress.introduced[id])
    .sort((a, b) => ARENA_INTRODUCTIONS[a]! - ARENA_INTRODUCTIONS[b]!);
}
export function canPreviewArenaDemo(id: ArenaGameId, island: number, verifiedDev: boolean, enabled: readonly ArenaGameId[]) {
  // Preview lab is deliberately not an island introduction or evaluation credit.
  return Number.isInteger(island) && island >= 2 && verifiedDev && !ARENA_INTRODUCTIONS[id] && enabled.includes(id);
}
export function canCompareArenaGames(ids: readonly ArenaGameId[], island: number, progress: ArenaJourneyProgress) {
  return ids.length === 2 && ids[0] !== ids[1] && ids.every(id =>
    arenaIntroductionAvailable(id, island) && !!progress.introduced[id] && !!progress.played[id]);
}
export function nextArenaComparison(island: number, progress: ArenaJourneyProgress, unansweredOnly = false): [ArenaGameId, ArenaGameId] | null {
  const played = introducedArenaGames(island, progress).filter(id => progress.played[id]);
  const pairs: [ArenaGameId, ArenaGameId][] = [];
  for (let a = 0; a < played.length; a++) for (let b = a + 1; b < played.length; b++) pairs.push([played[a]!, played[b]!]);
  return pairs.find(pair => !progress.comparisons[arenaComparisonKey(...pair)]) ?? (unansweredOnly ? null : pairs[0] ?? null);
}
