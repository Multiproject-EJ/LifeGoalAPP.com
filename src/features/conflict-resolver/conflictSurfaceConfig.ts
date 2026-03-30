import type { AppSurface } from '../../surfaces/surfaceContext';

export type ConflictSurfaceConfig = {
  surface: AppSurface;
  productLabel: string;
};

export const HABITGAME_CONFLICT_SURFACE: ConflictSurfaceConfig = {
  surface: 'habitgame',
  productLabel: 'HabitGame',
};

export const PEACEBETWEEN_CONFLICT_SURFACE: ConflictSurfaceConfig = {
  surface: 'peacebetween',
  productLabel: 'Peace Between',
};

export function getConflictSurfaceConfig(surface: AppSurface): ConflictSurfaceConfig {
  return surface === 'peacebetween' ? PEACEBETWEEN_CONFLICT_SURFACE : HABITGAME_CONFLICT_SURFACE;
}
