import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';
import type { IslandRunGameStateRecord } from './islandRunGameStateStore';
import {
  DICE_SKINS_KEY,
  applyDiceSkinPurchase,
  applyDiceSkinSelection,
  sanitizeDiceSkinProgress,
  type DiceSkinProgress,
} from './islandRunDiceSkins';

/** Read the player's dice skins from canonical state. */
export function resolveDiceSkinProgress(state: Pick<IslandRunGameStateRecord, 'signatureMissionProgressByIsland'>): DiceSkinProgress {
  return sanitizeDiceSkinProgress(state.signatureMissionProgressByIsland[DICE_SKINS_KEY]);
}

/**
 * Canonical dice-skin purchase: spends Island Run money (`essence`) and equips
 * the skin in one mutex-protected commit. UI never patches money or skins.
 */
export function purchaseDiceSkin(options: { session: Session; client: SupabaseClient | null; skinId: string; nowMs?: number }) {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    const nowMs = options.nowMs ?? Date.now();
    const result = applyDiceSkinPurchase(resolveDiceSkinProgress(state), options.skinId, state.essence, nowMs);
    if (!result.applied) return result;
    await commitIslandRunState({
      session: options.session,
      client: options.client,
      triggerSource: 'dice_skin_purchase',
      record: {
        ...state,
        runtimeVersion: state.runtimeVersion + 1,
        essence: result.money,
        essenceLifetimeSpent: Math.max(0, Math.floor(state.essenceLifetimeSpent)) + result.spent,
        signatureMissionProgressByIsland: { ...state.signatureMissionProgressByIsland, [DICE_SKINS_KEY]: result.progress },
      },
    });
    return result;
  });
}

/** Canonical dice-skin selection (owned skins only). */
export function selectDiceSkin(options: { session: Session; client: SupabaseClient | null; skinId: string; nowMs?: number }) {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    const result = applyDiceSkinSelection(resolveDiceSkinProgress(state), options.skinId, options.nowMs ?? Date.now());
    if (!result.applied) return result;
    await commitIslandRunState({
      session: options.session,
      client: options.client,
      triggerSource: 'dice_skin_select',
      record: {
        ...state,
        runtimeVersion: state.runtimeVersion + 1,
        signatureMissionProgressByIsland: { ...state.signatureMissionProgressByIsland, [DICE_SKINS_KEY]: result.progress },
      },
    });
    return result;
  });
}
