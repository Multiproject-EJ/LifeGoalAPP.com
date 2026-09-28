/**
 * Egg Mania announcement pop-up (presentation only). The canonical Egg Mania
 * rules live in islandRunEggMania; this only decides when to announce it.
 */
export const EGG_MANIA_POPUP_STORAGE_PREFIX = 'lifegoal:egg-mania-popup:seen';

export function getEggManiaPopupSeenKey(userId: string, cycleIndex: number, islandNumber: number): string {
  return `${EGG_MANIA_POPUP_STORAGE_PREFIX}:${userId}:${Math.max(0, Math.floor(cycleIndex))}:${Math.max(1, Math.floor(islandNumber))}`;
}

/**
 * Pop up once per island visit while Egg Mania is active and its triple set
 * is still unused, and only when nothing else owns the screen.
 */
export function shouldAutoShowEggManiaPopup(options: {
  eggFeatureUnlocked: boolean;
  eggManiaActive: boolean;
  eggManiaConsumed: boolean;
  alreadySeen: boolean;
  screenBusy: boolean;
}): boolean {
  return options.eggFeatureUnlocked
    && options.eggManiaActive
    && !options.eggManiaConsumed
    && !options.alreadySeen
    && !options.screenBusy;
}

export function readEggManiaPopupSeen(key: string): boolean {
  try { return typeof window !== 'undefined' && window.localStorage.getItem(key) === '1'; } catch { return false; }
}

export function markEggManiaPopupSeen(key: string): void {
  try { if (typeof window !== 'undefined') window.localStorage.setItem(key, '1'); } catch { /* private mode */ }
}
