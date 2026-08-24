import type { ExpeditionShipQuality } from '../dev/ExpeditionShipThreeModel';

export type ExpeditionShipGarageQualityPreference = 'auto' | 'performance' | 'quality';

export const EXPEDITION_SHIP_GARAGE_QUALITY_STORAGE_KEY =
  'habitgame.expeditionShipGarage.quality';

export const EXPEDITION_SHIP_GARAGE_QUALITY_OPTIONS: ReadonlyArray<{
  id: ExpeditionShipGarageQualityPreference;
  label: string;
  description: string;
}> = [
  { id: 'auto', label: 'Auto', description: 'Balances detail for this device' },
  { id: 'performance', label: 'Smooth', description: 'Prioritises stable animation' },
  { id: 'quality', label: 'Ultra', description: 'Maximum geometry and lighting detail' },
];

export function readExpeditionShipGarageQualityPreference(): ExpeditionShipGarageQualityPreference {
  if (typeof window === 'undefined') return 'auto';
  try {
    const stored = window.localStorage.getItem(EXPEDITION_SHIP_GARAGE_QUALITY_STORAGE_KEY);
    return stored === 'performance' || stored === 'quality' || stored === 'auto'
      ? stored
      : 'auto';
  } catch {
    return 'auto';
  }
}

export function writeExpeditionShipGarageQualityPreference(
  preference: ExpeditionShipGarageQualityPreference,
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(EXPEDITION_SHIP_GARAGE_QUALITY_STORAGE_KEY, preference);
  } catch {
    // A blocked storage surface should never prevent the 3D garage from opening.
  }
}

export function resolveExpeditionShipGarageQuality(
  preference: ExpeditionShipGarageQualityPreference,
): ExpeditionShipQuality {
  if (preference === 'performance') return 'low';
  if (preference === 'quality') return 'high';
  if (typeof window === 'undefined') return 'low';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const compactViewport = window.matchMedia('(max-width: 820px)').matches;
  const limitedCpu = typeof navigator !== 'undefined' && navigator.hardwareConcurrency <= 4;
  return reducedMotion || compactViewport || limitedCpu ? 'low' : 'high';
}
