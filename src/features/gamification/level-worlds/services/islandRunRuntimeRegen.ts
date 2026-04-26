import {
  applyDiceRegeneration,
  type DiceRegenState,
} from './islandRunDiceRegeneration';

export interface RuntimeDiceSnapshot {
  dicePool: number;
  diceRegenState: DiceRegenState | null;
}

export interface RuntimeDiceRegenUpdate {
  dicePool: number;
  diceRegenState: DiceRegenState;
  diceAdded: number;
}

/**
 * Computes a deterministic runtime regen update for Island Run.
 *
 * Returns `null` when there is nothing to write (no dice delta and no
 * regen-state delta), so callers can skip unnecessary persistence writes.
 */
export function resolveRuntimeDiceRegenUpdate(params: {
  snapshot: RuntimeDiceSnapshot;
  playerLevel: number;
  nowMs: number;
}): RuntimeDiceRegenUpdate | null {
  const { snapshot, playerLevel, nowMs } = params;
  const safeLevel = Number.isFinite(playerLevel) ? Math.max(1, Math.floor(playerLevel)) : 1;
  const regenResult = applyDiceRegeneration({
    currentDicePool: snapshot.dicePool,
    regenState: snapshot.diceRegenState,
    playerLevel: safeLevel,
    nowMs,
  });

  const prevRegen = snapshot.diceRegenState;
  const nextRegen = regenResult.regenState;
  const regenShapeChanged = (
    prevRegen === null
    || prevRegen.maxDice !== nextRegen.maxDice
    || prevRegen.regenRatePerHour !== nextRegen.regenRatePerHour
  );
  const regenAnchorChanged = prevRegen !== null && prevRegen.lastRegenAtMs !== nextRegen.lastRegenAtMs;
  const diceChanged = regenResult.dicePool !== snapshot.dicePool;
  if (!diceChanged) {
    if (!regenShapeChanged && !regenAnchorChanged) return null;

    const atOrAboveCap = snapshot.dicePool >= nextRegen.maxDice;
    if (!regenShapeChanged && regenAnchorChanged && regenResult.diceAdded <= 0 && atOrAboveCap) {
      // No-op guard: when the wallet is already full/overflowing and only the
      // regen anchor advanced, skip persistence to avoid 1s runtimeVersion churn.
      return null;
    }
  }

  return {
    dicePool: regenResult.dicePool,
    diceRegenState: nextRegen,
    diceAdded: regenResult.diceAdded,
  };
}
