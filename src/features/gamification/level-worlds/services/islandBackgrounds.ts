import { getIslandArtFolderName, normalizeIslandArtIslandNumber } from './islandArtManifest';
import { resolveIslandRun3DWorldRoute } from './islandRun3DWorldRouting';

const ISLANDS_WITH_WEBP_AMBIENT_BACKGROUNDS = new Set([1, 2, 3, 4, 5]);

export function getIslandBackgroundImageSrc(islandNumber: number): string {
  const normalizedIslandNumber = normalizeIslandArtIslandNumber(islandNumber);
  const sourceIslandNumber = resolveIslandRun3DWorldRoute(normalizedIslandNumber)?.worldSourceNumber
    ?? normalizedIslandNumber;
  if (sourceIslandNumber === 18) {
    return '/assets/islands/island-018/background/jungle-sky-depth-backdrop-v1.jpg';
  }
  const backgroundFileName = ISLANDS_WITH_WEBP_AMBIENT_BACKGROUNDS.has(sourceIslandNumber)
    ? 'ambient-background.webp'
    : 'PLACEHOLDER__ambient-background.svg';

  return `/assets/islands/${getIslandArtFolderName(sourceIslandNumber)}/background/${backgroundFileName}`;
}
