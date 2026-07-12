/**
 * Loads the player's latest personality test from local storage (offline-first,
 * no network) and derives the Chapter-2 shadow hint data. Read-only and fully
 * defensive: any failure — no user, no test taken, malformed record — resolves
 * to null and the shadow activities simply render without the hint.
 */

import { loadPersonalityTestHistory } from '../../../data/personalityTestRepo';
import {
  buildShadowBridgeData,
  coercePersonalityScores,
  type CompassShadowBridgeData,
} from '../logic/shadowBridge';

export async function loadCompassShadowBridge(
  userId: string | null | undefined,
): Promise<CompassShadowBridgeData | null> {
  if (!userId) return null;
  try {
    const history = await loadPersonalityTestHistory(userId);
    const latest = history[0];
    if (!latest) return null;
    const scores = coercePersonalityScores(latest.traits, latest.axes);
    return buildShadowBridgeData(scores);
  } catch {
    return null;
  }
}
