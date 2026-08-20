export const COMPASS_BOOK_PRESENTATION_MODES = ['auto', '2d', '3d'] as const;

export type CompassBookPresentationMode = (typeof COMPASS_BOOK_PRESENTATION_MODES)[number];
export type CompassBookPresentationContext = 'pwa' | 'island_run';
export type CompassBookPresentationSurface = 'page' | 'flow';
export type CompassBookResolvedPresentation = '2d' | '3d';

export const COMPASS_BOOK_PRESENTATION_STORAGE_KEY =
  'habitgame.compass-book.presentation-mode.v1';

export function parseCompassBookPresentationMode(
  value: string | null | undefined,
): CompassBookPresentationMode {
  return COMPASS_BOOK_PRESENTATION_MODES.includes(value as CompassBookPresentationMode)
    ? value as CompassBookPresentationMode
    : 'auto';
}

export function resolveCompassBookPresentation({
  preference,
  context,
  surface,
  reducedMotion,
  threeAvailable,
}: {
  preference: CompassBookPresentationMode;
  context: CompassBookPresentationContext;
  surface: CompassBookPresentationSurface;
  reducedMotion: boolean;
  threeAvailable: boolean;
}): CompassBookResolvedPresentation {
  if (preference === '2d' || !threeAvailable) return '2d';
  if (preference === '3d') return '3d';
  if (reducedMotion) return '2d';
  return context === 'island_run' && surface === 'page' ? '3d' : '2d';
}
