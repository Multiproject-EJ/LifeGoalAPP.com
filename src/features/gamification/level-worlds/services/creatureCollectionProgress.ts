import type { CreatureSanctuaryGalleryModel } from './creatureSanctuaryAdapter';

function sanitizeCount(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

function padCount(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

export function formatCreatureCollectionProgress(discoveredCount: number, totalCount: number): string {
  const safeTotal = sanitizeCount(totalCount);
  if (safeTotal <= 0) {
    return '00/00';
  }

  const safeDiscovered = Math.min(sanitizeCount(discoveredCount), safeTotal);
  const padWidth = Math.max(2, String(safeTotal).length);

  return `${padCount(safeDiscovered, padWidth)}/${safeTotal}`;
}

export function deriveCreatureCollectionProgressFromGalleryModel(
  galleryModel: CreatureSanctuaryGalleryModel,
): string {
  return formatCreatureCollectionProgress(
    galleryModel.summary.discoveredCreatures,
    galleryModel.summary.totalCreatures,
  );
}
