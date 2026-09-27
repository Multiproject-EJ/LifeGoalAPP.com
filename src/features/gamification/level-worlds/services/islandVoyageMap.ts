import { getIslandDisplayName } from './islandNames';
import voyagePortraits from './islandVoyagePortraits.json';

/**
 * Voyage Map data: the island-by-island journey as a winding path, split
 * into the six named eras. Pure presentation data from canonical progress.
 */
export type VoyageIslandStatus = 'completed' | 'current' | 'next' | 'visited' | 'locked';

export interface VoyageEra { id: string; title: string; subtitle: string; icon: string; from: number; to: number; tint: string }

export const VOYAGE_ERAS: readonly VoyageEra[] = [
  { id: 'awakening', title: 'Awakening', subtitle: 'Calm & Nature', icon: '🌅', from: 1, to: 24, tint: '#38bdf8' },
  { id: 'growth', title: 'Growth', subtitle: 'Jungle & Life', icon: '🌿', from: 25, to: 48, tint: '#34d399' },
  { id: 'power', title: 'Power', subtitle: 'Elements & Intensity', icon: '🔥', from: 49, to: 72, tint: '#fb7185' },
  { id: 'mastery', title: 'Mastery', subtitle: 'Fantasy & Identity', icon: '🔮', from: 73, to: 96, tint: '#a78bfa' },
  { id: 'futuristic', title: 'Futuristic', subtitle: 'Tech Shift', icon: '🛰️', from: 97, to: 110, tint: '#22d3ee' },
  { id: 'transcendence', title: 'Transcendence', subtitle: 'Cosmic Endgame', icon: '🌌', from: 111, to: 120, tint: '#f0abfc' },
];

export function getVoyageEra(islandNumber: number): VoyageEra {
  return VOYAGE_ERAS.find((era) => islandNumber >= era.from && islandNumber <= era.to) ?? VOYAGE_ERAS[0];
}

export function resolveVoyageIslandStatus(options: {
  islandNumber: number;
  currentIslandNumber: number;
  completed: ReadonlySet<number>;
  visited: ReadonlySet<number>;
}): VoyageIslandStatus {
  const { islandNumber, currentIslandNumber, completed, visited } = options;
  if (islandNumber === currentIslandNumber) return 'current';
  if (completed.has(islandNumber) || islandNumber < currentIslandNumber) return 'completed';
  if (islandNumber === currentIslandNumber + 1) return 'next';
  if (visited.has(islandNumber)) return 'visited';
  return 'locked';
}

/** Far-future islands keep their names secret until you get close. */
export function isVoyageIslandRevealed(islandNumber: number, currentIslandNumber: number): boolean {
  return islandNumber <= currentIslandNumber + 3;
}

export function getVoyageIslandLabel(islandNumber: number, currentIslandNumber: number): string {
  return isVoyageIslandRevealed(islandNumber, currentIslandNumber) ? getIslandDisplayName(islandNumber) : 'Uncharted island';
}

/** Zig-zag horizontal position (percent) so the path winds up the map. */
export function getVoyageNodeX(islandNumber: number): number {
  return 50 + Math.sin(islandNumber * 0.85) * 26;
}

type Biome = 'life' | 'water' | 'heat' | 'sky' | 'absurd';
const AUTHORED: Readonly<Partial<Record<number, string>>> = {
  13: '/assets/island-run/orbit-compass/islands/island-013-bluewater-bay-v1.png?v=1',
  14: '/assets/island-run/orbit-compass/islands/island-014-mango-isle-v1.png?v=1',
  15: '/assets/island-run/orbit-compass/islands/island-015-starfish-shore-v1.png?v=1',
  16: '/assets/island-run/orbit-compass/islands/island-016-windy-coast-v1.png?v=1',
  17: '/assets/island-run/orbit-compass/islands/island-017-hidden-lagoon-v1.png?v=1',
  18: '/assets/island-run/orbit-compass/islands/island-018-shrine-of-sands-v1.png?v=1',
  19: '/assets/island-run/orbit-compass/islands/island-019-bamboo-bay-v1.png?v=1',
  20: '/assets/island-run/orbit-compass/islands/island-020-golden-sands-v1.png?v=1',
};

function biomeForIsland(islandNumber: number): Biome {
  const name = getIslandDisplayName(islandNumber).toLowerCase();
  if (/dream|paradox|chaos|carnival|mirror|impossible|neon|cyber|quantum|data|code|hologram|pixel|digital|nano|cosmic|nebula|galaxy|lunar|infinity|astral|void|ascension|final horizon/.test(name)) return 'absurd';
  if (/lava|ember|flame|fire|magma|volcan|inferno|furnace|ash/.test(name)) return 'heat';
  if (/ice|frost|snow|winter|glacier|crystal/.test(name)) return 'water';
  if (/sky|wind|cloud|star|moon|horizon|dawn|sunset|sand|gold|shrine|crown|celestial/.test(name)) return 'sky';
  return 'life';
}

interface VoyagePortrait { path: string; worldSource: number; worldFingerprint: string; capturedAt: string }
const PORTRAITS = (voyagePortraits as { portraits: Record<string, VoyagePortrait> }).portraits;

export function getVoyageIslandPortrait(islandNumber: number): VoyagePortrait | null {
  return PORTRAITS[String(islandNumber)] ?? null;
}

/**
 * Island medallion art: a snapshot of the real 3D island when one has been
 * captured (npm run island-portraits), else its map art or biome waystation.
 */
export function getVoyageIslandArt(islandNumber: number): string {
  const portrait = getVoyageIslandPortrait(islandNumber);
  if (portrait) return `${portrait.path}?v=${portrait.worldFingerprint.slice(0, 8)}`;
  const authored = AUTHORED[islandNumber];
  if (authored) return authored;
  const biome = biomeForIsland(islandNumber);
  if (islandNumber % 10 === 0) return `/assets/island-run/orbit-compass/${biome}-landmark-v1.png`;
  const variants = biome === 'water' ? ['v1'] : ['v1', 'v2'];
  return `/assets/island-run/orbit-compass/${biome}-waystation-${variants[islandNumber % variants.length]}.png?v=1`;
}
