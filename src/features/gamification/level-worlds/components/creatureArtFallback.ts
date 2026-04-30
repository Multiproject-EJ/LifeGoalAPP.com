import type React from 'react';

export function applyCreatureArtFallback(
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  options: { pngSrc?: string; silhouetteSrc?: string },
): void {
  const target = event.currentTarget;
  const fallbackStage = target.dataset.fallbackStage ?? 'webp';

  if (fallbackStage === 'webp' && options.pngSrc && target.src !== options.pngSrc) {
    target.dataset.fallbackStage = 'png';
    target.src = options.pngSrc;
    return;
  }

  if (fallbackStage !== 'silhouette' && options.silhouetteSrc && target.src !== options.silhouetteSrc) {
    target.dataset.fallbackStage = 'silhouette';
    target.src = options.silhouetteSrc;
    return;
  }

  target.style.display = 'none';
  const fallback = target.nextElementSibling as HTMLElement | null;
  if (fallback) fallback.style.display = 'grid';
}
