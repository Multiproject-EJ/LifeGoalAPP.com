import { getIslandArtFolderName, normalizeIslandArtIslandNumber } from './islandArtManifest';

const ISLANDS_WITH_WEBP_AMBIENT_BACKGROUNDS = new Set([3]);

export function getIslandBackgroundImageSrc(islandNumber: number): string {
  const normalizedIslandNumber = normalizeIslandArtIslandNumber(islandNumber);
  const backgroundFileName = ISLANDS_WITH_WEBP_AMBIENT_BACKGROUNDS.has(normalizedIslandNumber)
    ? 'ambient-background.webp'
    : 'PLACEHOLDER__ambient-background.svg';

  return `/assets/islands/${getIslandArtFolderName(normalizedIslandNumber)}/background/${backgroundFileName}`;
}
