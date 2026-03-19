export function getIslandBackgroundImageSrc(islandNumber: number): string {
  const safeIsland = Number.isFinite(islandNumber) ? Math.max(1, Math.floor(islandNumber)) : 1;
  return `/assets/islands/backgrounds/level-bg-${String(safeIsland).padStart(2, '0')}.webp`;
}
