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

/**
 * How a piece is obtained.
 *
 * - `starter`  — owned by everyone from the first run.
 * - `earned`   — unlocked through play (island/collection milestones).
 * - `premium`  — purchased with real money via Stripe. Rare luxury pieces.
 *
 * Ownership for `earned` and `premium` pieces is recorded durably in
 * `public.user_cosmetic_entitlements` with `cosmetic_type = 'player_piece'`,
 * reusing the same entitlement path as paid creature themes.
 */
export type PlayerPieceTier = 'starter' | 'earned' | 'premium';

/** Entitlement discriminator used in `user_cosmetic_entitlements.cosmetic_type`. */
export const PLAYER_PIECE_COSMETIC_TYPE = 'player_piece';

/**
 * The Journey Disc — the shared pedestal every relic stands on.
 *
 * This is a SECOND, independent axis from the relic itself: the relic is who
 * you are, the disc is how far you have come. The same relic renders on a
 * bronze, silver, or gold disc as the player's journey advances, so the disc
 * is earned progression and is never purchased.
 *
 * Keeping one shared pedestal is also a rendering contract: the disc's contact
 * face is the token anchor, so a single board calibration works for every
 * relic and any relic added later.
 */
export type JourneyDiscTier = 'bronze' | 'silver' | 'gold';

export const JOURNEY_DISC_TIERS: readonly JourneyDiscTier[] = ['bronze', 'silver', 'gold'];

export const DEFAULT_JOURNEY_DISC_TIER: JourneyDiscTier = 'bronze';

export interface JourneyDiscDefinition {
  tier: JourneyDiscTier;
  /** Player-facing tier name. */
  name: string;
  /** Level number shown in the picker (1-3). */
  level: number;
  /** One-line flavour. */
  description: string;
}

export const JOURNEY_DISCS: readonly JourneyDiscDefinition[] = [
  { tier: 'bronze', name: 'Bronze', level: 1, description: 'Humble beginnings. Worn by time and adventure.' },
  { tier: 'silver', name: 'Silver', level: 2, description: 'Proven path. Stronger, brighter, more refined.' },
  { tier: 'gold', name: 'Gold', level: 3, description: 'Legendary status. Majestic and unwavering.' },
] as const;

/** True when the value is a known disc tier. */
export function isJourneyDiscTier(value: unknown): value is JourneyDiscTier {
  return value === 'bronze' || value === 'silver' || value === 'gold';
}

/** Normalize any stored value into a safe, persistable disc tier. */
export function normalizeJourneyDiscTier(tier: unknown): JourneyDiscTier {
  return isJourneyDiscTier(tier) ? tier : DEFAULT_JOURNEY_DISC_TIER;
}

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
  /** Asset file stem; combined with the disc tier to build the art path. */
  artSlug: string;
  /** Idle animation personality for this piece. */
  idleMotion: PlayerPieceIdleMotion;
  /** Accent colour used for glow/trail FX so each piece reads distinctly. */
  accentColor: string;
  /** How the piece is obtained. */
  tier: PlayerPieceTier;
  /** Player-facing unlock copy shown on locked pieces in the picker. */
  unlockHint?: string;
}

export const DEFAULT_PLAYER_PIECE_ID: PlayerPieceId = 'explorer_ship';

const ART_ROOT = '/assets/player-pieces';

export const PLAYER_PIECES: readonly PlayerPieceDefinition[] = [
  {
    id: 'explorer_ship',
    name: 'Explorer Ship',
    description: 'Your flagship. The journey between the islands begins here.',
    artSlug: 'explorer-ship',
    idleMotion: 'hover',
    accentColor: '#7dd8ff',
    tier: 'starter',
  },
  {
    id: 'ancient_egg',
    name: 'Ancient Egg',
    description: 'Potential waiting to wake. Tied to the hatchery and beginnings.',
    artSlug: 'ancient-egg',
    idleMotion: 'pulse',
    accentColor: '#f6e3ae',
    tier: 'starter',
  },
  {
    id: 'living_compass',
    name: 'Living Compass',
    description: 'Turns gently toward what matters next.',
    artSlug: 'living-compass',
    idleMotion: 'rotate',
    accentColor: '#e0b64f',
    tier: 'earned',
    unlockHint: 'Unlocked by completing your first island.',
  },
  {
    id: 'keepers_lantern',
    name: "Keeper's Lantern",
    description: 'Warm light carried from Elow. Wisdom that travels with you.',
    artSlug: 'keepers-lantern',
    idleMotion: 'flicker',
    accentColor: '#ffb43a',
    tier: 'premium',
    unlockHint: 'A luxury piece from the Keeper collection.',
  },
  {
    id: 'quest_journal',
    name: 'The Quest Journal',
    description: 'Learning and reflection, bound in leather. Its pages stir.',
    artSlug: 'quest-journal',
    idleMotion: 'flutter',
    accentColor: '#b79ade',
    tier: 'earned',
    unlockHint: 'Unlocked by completing a Compass Book chapter.',
  },
  {
    id: 'world_seed',
    name: 'World Seed',
    description: 'A carved seed with roots just beginning to reach.',
    artSlug: 'world-seed',
    idleMotion: 'grow',
    accentColor: '#7db38f',
    tier: 'starter',
  },
  {
    id: 'ancient_key',
    name: 'Ancient Key',
    description: 'Ornate and patient. It opens what comes next.',
    artSlug: 'ancient-key',
    idleMotion: 'shimmer',
    accentColor: '#d9a94e',
    tier: 'earned',
    unlockHint: 'Unlocked by defeating your first boss.',
  },
  {
    id: 'fallen_star',
    name: 'Fallen Star',
    description: 'A celestial fragment that leaves faint stardust as it moves.',
    artSlug: 'fallen-star',
    idleMotion: 'twinkle',
    accentColor: '#fff3b0',
    tier: 'premium',
    unlockHint: 'A luxury piece from the Keeper collection.',
  },
  {
    id: 'oris_shell',
    name: "Ori's Shell",
    description: 'A sacred pearlescent spiral from the first shore.',
    artSlug: 'oris-shell',
    idleMotion: 'sway',
    accentColor: '#8fd2da',
    tier: 'premium',
    unlockHint: 'A luxury piece from the Keeper collection.',
  },
  {
    id: 'guardian_idol',
    name: 'Guardian Idol',
    description: 'Carved island stone. Its rune eyes glow when it lands.',
    artSlug: 'guardian-idol',
    idleMotion: 'settle',
    accentColor: '#a98fd4',
    tier: 'premium',
    unlockHint: 'A luxury piece from the Keeper collection.',
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

/** Pieces every player owns without any entitlement row. */
export const STARTER_PLAYER_PIECE_IDS: readonly PlayerPieceId[] = PLAYER_PIECES
  .filter((piece) => piece.tier === 'starter')
  .map((piece) => piece.id);

/**
 * True when the player owns this piece. Starter pieces are always owned;
 * earned and premium pieces require an entitlement row
 * (`user_cosmetic_entitlements`, `cosmetic_type = 'player_piece'`).
 */
export function isPlayerPieceOwned(
  pieceId: PlayerPieceId,
  entitledPieceIds: Iterable<string>,
): boolean {
  const piece = PLAYER_PIECES_BY_ID.get(pieceId);
  if (!piece) return false;
  if (piece.tier === 'starter') return true;
  for (const entitledId of entitledPieceIds) {
    if (entitledId === pieceId) return true;
  }
  return false;
}

/**
 * Resolve the piece that should actually render. If the stored selection is no
 * longer owned (e.g. entitlement revoked or a refunded purchase), fall back to
 * the default starter piece rather than showing a piece the player can't use.
 */
export function resolveOwnedPlayerPiece(
  pieceId: unknown,
  entitledPieceIds: Iterable<string>,
): PlayerPieceDefinition {
  const normalized = normalizePlayerPieceId(pieceId);
  if (isPlayerPieceOwned(normalized, entitledPieceIds)) {
    return resolvePlayerPiece(normalized);
  }
  return resolvePlayerPiece(DEFAULT_PLAYER_PIECE_ID);
}

/**
 * Runtime art path for a relic standing on a given Journey Disc tier.
 * Assets are exported per relic x disc tier, e.g. `explorer-ship-gold.webp`.
 */
export function resolvePlayerPieceArtSrc(
  piece: PlayerPieceDefinition,
  discTier: JourneyDiscTier,
): string {
  return `${ART_ROOT}/${piece.artSlug}-${discTier}.webp`;
}

/** Art path for the bare Journey Disc, used for locked/undiscovered relics. */
export function resolveJourneyDiscArtSrc(discTier: JourneyDiscTier): string {
  return `${ART_ROOT}/journey-disc-${discTier}.webp`;
}
