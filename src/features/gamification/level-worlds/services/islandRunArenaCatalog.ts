import type { EventId } from './islandRunEventEngine';
import { isIslandRunFeatureEnabled } from '../../../../config/islandRunFeatureFlags';
import { isJourneyDiscArenaIsland } from './journeyDiscArmory';

export type ArenaGameId =
  | EventId
  | 'momentum_matrix'
  | 'journey_disc_arena'
  | 'concord_categories'
  | 'lexicon_relay'
  | 'signal_path'
  | 'twin_sigils';

export type ArenaGameFamily = 'word' | 'logic' | 'spatial' | 'planning' | 'reaction';
export type ArenaGameAvailability = 'active_event' | 'exhibition';

export interface ArenaGameDefinition {
  id: ArenaGameId;
  displayName: string;
  shortName: string;
  icon: string;
  family: ArenaGameFamily;
  familyLabel: string;
  description: string;
  availability: ArenaGameAvailability;
  estimatedSeconds: readonly [number, number];
  artSrc: string | null;
  accent: string;
  isNew?: boolean;
}

export const ARENA_GAME_CATALOG: readonly ArenaGameDefinition[] = Object.freeze([
  {
    id: 'journey_disc_arena',
    displayName: 'Journey Disc Arena',
    shortName: 'Disc Arena',
    icon: '◉',
    family: 'reaction',
    familyLabel: '3D battle',
    description: 'Deploy energized relic discs, trigger Surges and knock rivals beyond the ring.',
    availability: 'exhibition',
    estimatedSeconds: [20, 45],
    artSrc: null,
    accent: '#5af4ff',
    isNew: true,
  },
  {
    id: 'feeding_frenzy',
    displayName: 'Island Workshop',
    shortName: 'Workshop',
    icon: '🛠️',
    family: 'planning',
    familyLabel: 'Planning',
    description: 'Fit route materials together and build valuable structures.',
    availability: 'active_event',
    estimatedSeconds: [60, 180],
    artSrc: null,
    accent: '#f6b84a',
  },
  {
    id: 'lucky_spin',
    displayName: 'Fortune Engine',
    shortName: 'Fortune',
    icon: '✦',
    family: 'reaction',
    familyLabel: 'Timing',
    description: 'Read the engine, react quickly and chase a matching signal.',
    availability: 'active_event',
    estimatedSeconds: [45, 120],
    artSrc: null,
    accent: '#d28cff',
  },
  {
    id: 'space_excavator',
    displayName: 'Space Excavator',
    shortName: 'Excavator',
    icon: '◇',
    family: 'logic',
    familyLabel: 'Deduction',
    description: 'Use clues to uncover relics without wasting your dig sites.',
    availability: 'active_event',
    estimatedSeconds: [60, 180],
    artSrc: null,
    accent: '#59c9ff',
  },
  {
    id: 'companion_feast',
    displayName: 'Companion Feast',
    shortName: 'Feast',
    icon: '❈',
    family: 'planning',
    familyLabel: 'Merge',
    description: 'Plan a chain of merges and build the island’s grand feast.',
    availability: 'active_event',
    estimatedSeconds: [60, 180],
    artSrc: null,
    accent: '#ff8d7b',
  },
  {
    id: 'skybound_expedition',
    displayName: 'Skybound Academy',
    shortName: 'Skybound',
    icon: '✈️',
    family: 'reaction',
    familyLabel: '3D flight',
    description: 'Launch, steer and upgrade five aircraft through Pilot Academy checkrides.',
    availability: 'active_event',
    estimatedSeconds: [45, 180],
    artSrc: null,
    accent: '#65ddff',
    isNew: true,
  },
  {
    id: 'momentum_matrix',
    displayName: 'Momentum Matrix',
    shortName: 'Matrix',
    icon: '✦',
    family: 'spatial',
    familyLabel: 'Spatial',
    description: 'Place route fragments and stabilize complete corridors.',
    availability: 'exhibition',
    estimatedSeconds: [90, 240],
    artSrc: '/assets/event-games/momentum-matrix/momentum-matrix-hero.webp',
    accent: '#6fe8ff',
  },
  {
    id: 'concord_categories',
    displayName: 'Concord Categories',
    shortName: 'Categories',
    icon: '◈',
    family: 'word',
    familyLabel: 'Word links',
    description: 'Find three hidden connections among twelve incoming signals.',
    availability: 'exhibition',
    estimatedSeconds: [60, 120],
    artSrc: null,
    accent: '#f3c969',
    isNew: true,
  },
  {
    id: 'lexicon_relay',
    displayName: 'Lexicon Relay',
    shortName: 'Relay',
    icon: 'A↗',
    family: 'word',
    familyLabel: 'Word ladder',
    description: 'Change one letter at a time to carry meaning across the relay.',
    availability: 'exhibition',
    estimatedSeconds: [45, 100],
    artSrc: null,
    accent: '#9fddff',
    isNew: true,
  },
  {
    id: 'signal_path',
    displayName: 'Signal Path',
    shortName: 'Path',
    icon: '⌁',
    family: 'spatial',
    familyLabel: 'Route',
    description: 'Trace every cell while reaching the numbered beacons in order.',
    availability: 'exhibition',
    estimatedSeconds: [45, 90],
    artSrc: null,
    accent: '#76f0d0',
    isNew: true,
  },
  {
    id: 'twin_sigils',
    displayName: 'Twin Sigils',
    shortName: 'Sigils',
    icon: '◐',
    family: 'logic',
    familyLabel: 'Logic',
    description: 'Balance light and shadow without making a run of three.',
    availability: 'exhibition',
    estimatedSeconds: [90, 180],
    artSrc: null,
    accent: '#c1a6ff',
    isNew: true,
  },
]);

export const ARENA_GAME_IDS: readonly ArenaGameId[] = Object.freeze(
  ARENA_GAME_CATALOG.map((game) => game.id),
);

export const ARENA_PUZZLE_GAME_IDS = [
  'concord_categories',
  'lexicon_relay',
  'signal_path',
  'twin_sigils',
] as const satisfies readonly ArenaGameId[];

export type ArenaPuzzleGameId = (typeof ARENA_PUZZLE_GAME_IDS)[number];

export function isArenaPuzzleGameId(value: unknown): value is ArenaPuzzleGameId {
  return typeof value === 'string' && (ARENA_PUZZLE_GAME_IDS as readonly string[]).includes(value);
}

const ARENA_GAME_ID_SET = new Set<string>(ARENA_GAME_IDS);

export function isArenaGameId(value: unknown): value is ArenaGameId {
  return typeof value === 'string' && ARENA_GAME_ID_SET.has(value);
}

export function getArenaGameDefinition(gameId: ArenaGameId): ArenaGameDefinition {
  return ARENA_GAME_CATALOG.find((game) => game.id === gameId)!;
}

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export interface ArenaPairSelectionInput {
  islandNumber: number;
  activeEventId: EventId | null;
  rankedGameIds: readonly ArenaGameId[];
  disabledGameIds: readonly ArenaGameId[];
  recentGameIds?: readonly ArenaGameId[];
  seed: string;
}

export interface ArenaPairSelection {
  primary: ArenaGameDefinition;
  alternative: ArenaGameDefinition;
}

/**
 * Pick one familiar challenge and one meaningfully different alternative.
 * The selector is deterministic for a given seed, keeps inactive timed-event
 * surfaces out of the pool, avoids recent games, and strongly prefers a
 * different family for the second card.
 */
export function selectArenaGamePair(input: ArenaPairSelectionInput): ArenaPairSelection {
  const disabled = new Set(input.disabledGameIds);
  const recent = new Set(input.recentGameIds ?? []);
  const rankIndex = new Map(input.rankedGameIds.map((id, index) => [id, index]));
  const journeyDiscOwnsTimedEventSurface = isIslandRunFeatureEnabled('journeyDiscArenaEnabled')
    && isJourneyDiscArenaIsland(input.islandNumber);
  const eligible = ARENA_GAME_CATALOG.filter((game) => {
    if (disabled.has(game.id)) return false;
    if (game.id === 'journey_disc_arena' && (!isIslandRunFeatureEnabled('journeyDiscArenaEnabled') || !isJourneyDiscArenaIsland(input.islandNumber))) return false;
    if (journeyDiscOwnsTimedEventSurface && game.availability === 'active_event') return false;
    return game.availability === 'exhibition' || game.id === input.activeEventId;
  });

  const fallback = ARENA_GAME_CATALOG.filter((game) => game.availability === 'exhibition' && (
    game.id !== 'journey_disc_arena' || (isIslandRunFeatureEnabled('journeyDiscArenaEnabled') && isJourneyDiscArenaIsland(input.islandNumber))
  ));
  const pool = eligible.length >= 2 ? eligible : fallback;
  const score = (game: ArenaGameDefinition, salt: string) => {
    const rank = rankIndex.get(game.id) ?? input.rankedGameIds.length;
    const preference = Math.max(0, input.rankedGameIds.length - rank) * 100;
    const novelty = recent.has(game.id) ? -700 : game.isNew ? 125 : 0;
    const jitter = hashSeed(`${input.seed}:${salt}:${game.id}`) % 97;
    return preference + novelty + jitter;
  };

  const orderedPrimary = [...pool].sort((a, b) => score(b, 'primary') - score(a, 'primary'));
  const primary = orderedPrimary[0] ?? fallback[0]!;
  const alternatives = pool.filter((game) => game.id !== primary.id);
  const differentFamily = alternatives.filter((game) => game.family !== primary.family);
  const secondPool = differentFamily.length > 0 ? differentFamily : alternatives;
  const alternative = [...secondPool].sort((a, b) => score(b, 'alternative') - score(a, 'alternative'))[0]
    ?? fallback.find((game) => game.id !== primary.id)
    ?? primary;

  return { primary, alternative };
}

const RECENT_ARENA_GAMES_PREFIX = 'lifegoal.arena-recent-games.v1';

export function loadRecentArenaGameIds(playerKey: string): ArenaGameId[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(`${RECENT_ARENA_GAMES_PREFIX}:${playerKey}`) ?? '[]');
    return Array.isArray(value) ? value.filter(isArenaGameId).slice(0, 3) : [];
  } catch {
    return [];
  }
}

export function recordRecentArenaGame(playerKey: string, gameId: ArenaGameId): ArenaGameId[] {
  const next = [gameId, ...loadRecentArenaGameIds(playerKey).filter((id) => id !== gameId)].slice(0, 3);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(`${RECENT_ARENA_GAMES_PREFIX}:${playerKey}`, JSON.stringify(next));
    } catch {
      // Pair history is a best-effort presentation preference, never reward authority.
    }
  }
  return next;
}
