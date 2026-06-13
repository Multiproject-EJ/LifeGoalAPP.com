import { getIslandArtFolderName } from './islandArtManifest';

export function getIslandBackgroundImageSrc(islandNumber: number): string {
  return `/assets/islands/${getIslandArtFolderName(islandNumber)}/background/PLACEHOLDER__ambient-background.svg`;
}
