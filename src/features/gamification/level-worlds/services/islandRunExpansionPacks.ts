import type { IslandRunAuthored3DWorldSource } from './islandRun3DWorldRouting';

/**
 * Expansion packs (user decisions 2026-10-01): themed or feature-linked
 * side voyages of extra islands, played next to the main 120-island path
 * and switched to at any time. DEV ONLY until production ready: every
 * surface must check `isExpansionPacksEnabled` first.
 *
 * Pack islands live in a reserved runtime range (1001+) so none of the main
 * campaign's island-number keyed story, missions or rewards can fire on
 * them. Until pack art exists, each pack island borrows an existing 3D
 * world (`worldSources`, visual only) and scales its economy like the main
 * island with the same position (`resolveExpansionEconomyIslandNumber`).
 */
export type ExpansionPackId = 'beach-party' | 'christmas-feels' | 'meditation';
export type ExpansionVoyageId = 'main' | ExpansionPackId;

export interface ExpansionPackDefinition {
  id: ExpansionPackId;
  title: string;
  icon: string;
  tagline: string;
  kind: 'themed' | 'seasonal' | 'feature';
  islandCount: number;
  /** First runtime island number; islands are `base + 1 .. base + islandCount`. */
  runtimeIslandBase: number;
  /** Price in NOK; null when it comes with a feature unlock instead. */
  priceNok: number | null;
  /** Seasonal sale window as month-day strings (inclusive, may wrap the year). */
  saleWindow?: { from: string; to: string };
  /** Feature-linked packs are offered when the player unlocks this feature. */
  unlockFeature?: 'meditation';
  /** Placeholder visual worlds, cycled across the pack's islands. */
  worldSources: readonly IslandRunAuthored3DWorldSource[];
  islandNames: readonly string[];
}

export const EXPANSION_ISLAND_RANGE_START = 1001;

export const EXPANSION_PACKS: readonly ExpansionPackDefinition[] = [
  {
    id: 'beach-party',
    title: 'Beach Party',
    icon: '🏖️',
    tagline: '20 sunny islands of beach games, bonfires and boardwalk builds.',
    kind: 'themed',
    islandCount: 20,
    runtimeIslandBase: 1000,
    priceNok: 25,
    worldSources: [13, 19, 12, 9, 3],
    islandNames: [
      'Sunbather Sands', 'Volley Cove', 'Seashell Strand', 'Coconut Crossing', 'Sandcastle Point',
      'Surfboard Bay', 'Tiki Lagoon', 'Flip-Flop Pier', 'Lifeguard Lookout', 'Bonfire Beach',
      'Snorkel Shallows', 'Hammock Isle', 'Sunset Boardwalk', 'Ice-Cream Inlet', 'Kite Dunes',
      'Pearl Reef', 'Pelican Wharf', 'Lantern Shore', 'Moonlit Luau', 'Grand Beach Bash',
    ],
  },
  {
    id: 'christmas-feels',
    title: 'Christmas Feels',
    icon: '🎄',
    tagline: '15 cozy winter islands, from the first snowfall to Christmas Eve.',
    kind: 'seasonal',
    islandCount: 15,
    runtimeIslandBase: 1100,
    priceNok: 25,
    saleWindow: { from: '11-15', to: '01-06' },
    worldSources: [15, 4, 14],
    islandNames: [
      'First Snowfall', 'Gingerbread Lane', 'Candlelight Harbor', 'Pinecone Ridge', 'Sleigh Bell Hollow',
      'Cocoa Corner', 'Mitten Market', 'Snowglobe Square', 'Reindeer Ranch', 'Wreath Village',
      'Star Lantern Peak', 'Elf Workshop', 'Frosted Chapel', 'Stocking Shore', 'Christmas Eve',
    ],
  },
  {
    id: 'meditation',
    title: 'Calm Waters',
    icon: '🧘',
    tagline: '5 quiet islands that introduce Meditation, one calm breath at a time.',
    kind: 'feature',
    islandCount: 5,
    runtimeIslandBase: 1200,
    priceNok: null,
    unlockFeature: 'meditation',
    worldSources: [14, 9],
    islandNames: ['Still Pond', 'Breath Garden', 'Quiet Grove', 'Lotus Terrace', 'Calm Summit'],
  },
];

const PACKS_BY_ID = new Map(EXPANSION_PACKS.map((pack) => [pack.id, pack]));

export function getExpansionPack(id: string): ExpansionPackDefinition | null {
  return PACKS_BY_ID.get(id as ExpansionPackId) ?? null;
}

export function isExpansionPackId(value: unknown): value is ExpansionPackId {
  return typeof value === 'string' && PACKS_BY_ID.has(value as ExpansionPackId);
}

/** Dev-only gate (user decision 2026-10-01). Flip deliberately, with tests. */
export function isExpansionPacksEnabled(options: { isDevModeEnabled: boolean }): boolean {
  return options.isDevModeEnabled;
}

export function getExpansionIslandNumber(packId: ExpansionPackId, localIndex: number): number {
  const pack = PACKS_BY_ID.get(packId)!;
  const index = Math.min(pack.islandCount, Math.max(1, Math.floor(localIndex)));
  return pack.runtimeIslandBase + index;
}

export interface ExpansionIslandRef {
  pack: ExpansionPackDefinition;
  /** 1-based position inside the pack. */
  localIndex: number;
}

export function resolveExpansionIsland(islandNumber: number): ExpansionIslandRef | null {
  if (!Number.isFinite(islandNumber) || islandNumber < EXPANSION_ISLAND_RANGE_START) return null;
  const island = Math.floor(islandNumber);
  for (const pack of EXPANSION_PACKS) {
    const localIndex = island - pack.runtimeIslandBase;
    if (localIndex >= 1 && localIndex <= pack.islandCount) return { pack, localIndex };
  }
  return null;
}

export function isExpansionIslandNumber(islandNumber: number): boolean {
  return resolveExpansionIsland(islandNumber) !== null;
}

/**
 * Economy scale for an island: pack island k costs and pays like main
 * island k, so a 1001+ runtime number never inflates prices or rewards.
 */
export function resolveExpansionEconomyIslandNumber(islandNumber: number): number {
  return resolveExpansionIsland(islandNumber)?.localIndex ?? islandNumber;
}

export function getExpansionIslandName(islandNumber: number): string | null {
  const ref = resolveExpansionIsland(islandNumber);
  return ref ? ref.pack.islandNames[ref.localIndex - 1] ?? `${ref.pack.title} ${ref.localIndex}` : null;
}

export function resolveExpansionWorldSource(islandNumber: number): IslandRunAuthored3DWorldSource | null {
  const ref = resolveExpansionIsland(islandNumber);
  if (!ref) return null;
  return ref.pack.worldSources[(ref.localIndex - 1) % ref.pack.worldSources.length]!;
}

/** The island after this one inside its pack, or null at the pack's end. */
export function resolveNextExpansionIsland(islandNumber: number): number | null {
  const ref = resolveExpansionIsland(islandNumber);
  if (!ref || ref.localIndex >= ref.pack.islandCount) return null;
  return islandNumber + 1;
}

function monthDay(date: Date): string {
  return `${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

/** Seasonal packs are only sold in season; owned packs stay playable forever. */
export function isExpansionPackOnSale(pack: ExpansionPackDefinition, nowMs: number): boolean {
  if (pack.kind === 'feature') return false;
  if (!pack.saleWindow) return true;
  const today = monthDay(new Date(nowMs));
  const { from, to } = pack.saleWindow;
  return from <= to ? today >= from && today <= to : today >= from || today <= to;
}

export type ExpansionPackAvailability = 'owned' | 'buy' | 'feature_offer' | 'locked' | 'out_of_season';

export function resolveExpansionPackAvailability(options: {
  pack: ExpansionPackDefinition;
  ownedPackIds: readonly ExpansionPackId[];
  unlockedFeatures: readonly string[];
  nowMs: number;
}): ExpansionPackAvailability {
  const { pack } = options;
  if (options.ownedPackIds.includes(pack.id)) return 'owned';
  if (pack.kind === 'feature') {
    return pack.unlockFeature && options.unlockedFeatures.includes(pack.unlockFeature) ? 'feature_offer' : 'locked';
  }
  return isExpansionPackOnSale(pack, options.nowMs) ? 'buy' : 'out_of_season';
}
