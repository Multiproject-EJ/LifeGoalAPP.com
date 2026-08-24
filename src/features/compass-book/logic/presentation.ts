export const COMPASS_BOOK_PRESENTATION_MODES = ['auto', '2d', '3d'] as const;

export type CompassBookPresentationMode = (typeof COMPASS_BOOK_PRESENTATION_MODES)[number];
export type CompassBookPresentationContext = 'pwa' | 'island_run';
export type CompassBookPresentationSurface = 'page' | 'flow';
export type CompassBookResolvedPresentation = '2d' | '3d';

export const COMPASS_BOOK_PRESENTATION_STORAGE_KEY =
  'habitgame.compass-book.presentation-mode.v1';

/**
 * The Island Run hand-off is intentionally short: long enough for the physical
 * book to rise and open, but not long enough to delay reflective work.
 */
export const COMPASS_BOOK_ISLAND_ENTRANCE_MS = 1750;

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

/**
 * Decide whether an Island Run deep-link should reveal the world artifact
 * before entering its activity. This is presentation policy only: it neither
 * reads nor mutates gameplay state.
 */
export function shouldStageCompassBookIslandEntrance({
  context,
  initialActivityId,
  preference,
  reducedMotion,
}: {
  context: CompassBookPresentationContext;
  initialActivityId?: string;
  preference: CompassBookPresentationMode;
  reducedMotion: boolean;
}): boolean {
  return context === 'island_run'
    && Boolean(initialActivityId)
    && preference !== '2d'
    && !reducedMotion;
}
