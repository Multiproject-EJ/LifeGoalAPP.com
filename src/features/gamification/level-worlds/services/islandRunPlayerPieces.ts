/**
 * Player piece registry (visual-only cosmetic contract).
 *
 * The player piece is the token that travels the Island Run board. Pieces are
 * cosmetic identity: they never change movement rules, tile effects, rewards,
 * or stop progression. Selecting a piece only swaps art + idle motion.
 *
 * Art follows `docs/gameplay/ISLAND_VISUAL_PRODUCTION_CONTRACT.md`: stylized 3D
 * renders in the board's final camera (orthographic three-quarter view on the
 * 47deg board plane), upper-left key light, transparent background, readable at
 * ~32px on a phone. Runtime assets live under `public/assets/player-pieces/`.
 */

/** Idle motion personality applied to the piece while it rests on a tile. */
export type PlayerPieceIdleMotion =
  | 'hover'
  | 'pulse'
  | 'rotate'
  | 'flicker'
  | 'flutter'
  | 'grow'
  | 'shimmer'
  | 'twinkle'
  | 'sway'
  | 'settle';

export type PlayerPieceId =
  | 'explorer_ship'
  | 'ancient_egg'
  | 'living_compass'
  | 'keepers_lantern'
  | 'quest_journal'
  | 'world_seed'
  | 'ancient_key'
  | 'fallen_star'
  | 'oris_shell'
  | 'guardian_idol';

export interface PlayerPieceDefinition {
  id: PlayerPieceId;
  /** Player-facing name shown in the picker. */
  name: string;
  /** One-line flavour shown under the name. */
  description: string;
  /** Runtime art path; falls back to the CSS token when the asset is missing. */
  artSrc: string;
  /** Idle animation personality for this piece. */
  idleMotion: PlayerPieceIdleMotion;
  /** Accent colour used for glow/trail FX so each piece reads distinctly. */
  accentColor: string;
}

export const DEFAULT_PLAYER_PIECE_ID: PlayerPieceId = 'explorer_ship';

const ART_ROOT = '/assets/player-pieces';

export const PLAYER_PIECES: readonly PlayerPieceDefinition[] = [
  {
    id: 'explorer_ship',
    name: 'Explorer Ship',
    description: 'Your flagship. The journey between the islands begins here.',
    artSrc: `${ART_ROOT}/explorer-ship.webp`,
    idleMotion: 'hover',
    accentColor: '#7dd8ff',
  },
  {
    id: 'ancient_egg',
    name: 'Ancient Egg',
    description: 'Potential waiting to wake. Tied to the hatchery and beginnings.',
    artSrc: `${ART_ROOT}/ancient-egg.webp`,
    idleMotion: 'pulse',
    accentColor: '#f6e3ae',
  },
  {
    id: 'living_compass',
    name: 'Living Compass',
    description: 'Turns gently toward what matters next.',
    artSrc: `${ART_ROOT}/living-compass.webp`,
    idleMotion: 'rotate',
    accentColor: '#e0b64f',
  },
  {
    id: 'keepers_lantern',
    name: "Keeper's Lantern",
    description: 'Warm light carried from Elow. Wisdom that travels with you.',
    artSrc: `${ART_ROOT}/keepers-lantern.webp`,
    idleMotion: 'flicker',
    accentColor: '#ffb43a',
  },
  {
    id: 'quest_journal',
    name: 'The Quest Journal',
    description: 'Learning and reflection, bound in leather. Its pages stir.',
    artSrc: `${ART_ROOT}/quest-journal.webp`,
    idleMotion: 'flutter',
    accentColor: '#b79ade',
  },
  {
    id: 'world_seed',
    name: 'World Seed',
    description: 'A carved seed with roots just beginning to reach.',
    artSrc: `${ART_ROOT}/world-seed.webp`,
    idleMotion: 'grow',
    accentColor: '#7db38f',
  },
  {
    id: 'ancient_key',
    name: 'Ancient Key',
    description: 'Ornate and patient. It opens what comes next.',
    artSrc: `${ART_ROOT}/ancient-key.webp`,
    idleMotion: 'shimmer',
    accentColor: '#d9a94e',
  },
  {
    id: 'fallen_star',
    name: 'Fallen Star',
    description: 'A celestial fragment that leaves faint stardust as it moves.',
    artSrc: `${ART_ROOT}/fallen-star.webp`,
    idleMotion: 'twinkle',
    accentColor: '#fff3b0',
  },
  {
    id: 'oris_shell',
    name: "Ori's Shell",
    description: 'A sacred pearlescent spiral from the first shore.',
    artSrc: `${ART_ROOT}/oris-shell.webp`,
    idleMotion: 'sway',
    accentColor: '#8fd2da',
  },
  {
    id: 'guardian_idol',
    name: 'Guardian Idol',
    description: 'Carved island stone. Its rune eyes glow when it lands.',
    artSrc: `${ART_ROOT}/guardian-idol.webp`,
    idleMotion: 'settle',
    accentColor: '#a98fd4',
  },
] as const;

const PLAYER_PIECES_BY_ID = new Map<PlayerPieceId, PlayerPieceDefinition>(
  PLAYER_PIECES.map((piece) => [piece.id, piece]),
);

/** True when the value is a known piece id. */
export function isPlayerPieceId(value: unknown): value is PlayerPieceId {
  return typeof value === 'string' && PLAYER_PIECES_BY_ID.has(value as PlayerPieceId);
}

/**
 * Resolve a stored piece id to its definition. Unknown, legacy, or corrupted
 * values fall back to the default piece so the board always renders a token.
 */
export function resolvePlayerPiece(pieceId: unknown): PlayerPieceDefinition {
  if (isPlayerPieceId(pieceId)) {
    return PLAYER_PIECES_BY_ID.get(pieceId) as PlayerPieceDefinition;
  }
  return PLAYER_PIECES_BY_ID.get(DEFAULT_PLAYER_PIECE_ID) as PlayerPieceDefinition;
}

/** Normalize any stored value into a safe, persistable piece id. */
export function normalizePlayerPieceId(pieceId: unknown): PlayerPieceId {
  return isPlayerPieceId(pieceId) ? pieceId : DEFAULT_PLAYER_PIECE_ID;
}
