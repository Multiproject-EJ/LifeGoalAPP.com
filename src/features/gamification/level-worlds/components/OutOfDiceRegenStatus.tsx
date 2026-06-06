import { useEffect, useRef, useState } from 'react';

import {
  DICE_REGEN_NEXT_DICE_LABEL,
  resolveNextRollEtaMs,
  type DiceRegenState,
} from '../services/islandRunDiceRegeneration';

/**
 * OutOfDiceRegenStatus — live-updating regen feedback for the out-of-dice
 * modal (and any other "empty dice" empty-state UI).
 *
 * Renders:
 *   - A progress bar showing `dicePool / maxDice`
 *   - "Next dice in MM:SS" countdown (clamps to 0 once reached)
 *   - No full-refill ETA line (countdown contract keeps only next-die timing)
 *
 * Uses the pure `resolveNextRollEtaMs` helper so the math stays testable.
 * A 1s interval re-renders the countdown while this
 * component is mounted — callers should only mount it while their modal is
 * open to keep the interval scope tight.
 */
export interface OutOfDiceRegenStatusProps {
  /** Current dice pool (post-regen). */
  dicePool: number;
  /** Dice consumed by a single roll (with any active multiplier applied). */
  diceCostPerRoll: number;
  /** Current regen state, or null if regen is not active. */
  regenState: DiceRegenState | null;
}

function formatShortCountdown(ms: number): string {
  if (!Number.isFinite(ms)) return '—';
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function OutOfDiceRegenStatus(props: OutOfDiceRegenStatusProps) {
  const { dicePool, diceCostPerRoll, regenState } = props;
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [restoredPulseId, setRestoredPulseId] = useState(0);
  const [lastRestoredAtMs, setLastRestoredAtMs] = useState<number | null>(null);
  const previousDicePoolRef = useRef(dicePool);

  useEffect(() => {
    // Only tick while we have a regen state and haven't fully refilled — the
    // interval is cheap but unnecessary in the terminal states.
    if (!regenState) return;
    if (dicePool >= regenState.maxDice) return;
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [regenState, dicePool]);

  useEffect(() => {
    if (dicePool > previousDicePoolRef.current) {
      setRestoredPulseId((current) => current + 1);
      const restoredAtMs = Date.now();
      setLastRestoredAtMs(restoredAtMs);
      setNowMs(restoredAtMs);
    }
    previousDicePoolRef.current = dicePool;
  }, [dicePool]);

  useEffect(() => {
    if (lastRestoredAtMs === null) return;
    const timeoutId = window.setTimeout(() => setNowMs(Date.now()), 2_400);
    return () => window.clearTimeout(timeoutId);
  }, [lastRestoredAtMs]);

  const safeCost = Math.max(1, Math.floor(diceCostPerRoll) || 1);
  const nextRollEtaMs = resolveNextRollEtaMs({
    dicePool,
    target: safeCost,
    regenState,
    nowMs,
  });
  const maxDice = regenState?.maxDice ?? 0;
  const nextTickPool = maxDice > 0 ? Math.min(maxDice, dicePool + 1) : dicePool;
  const progressPct = maxDice > 0
    ? Math.min(100, Math.max(0, (dicePool / maxDice) * 100))
    : 0;
  const hasRegen = Boolean(regenState) && Number.isFinite(nextRollEtaMs);
  const isAtCap = Boolean(regenState) && dicePool >= maxDice;
  const isWaitingForStoreRefresh = hasRegen && nextRollEtaMs <= 0 && dicePool < safeCost;
  const isFinalCountdown = hasRegen && nextRollEtaMs > 0 && nextRollEtaMs <= 3_000;
  const countdownLabel = hasRegen ? formatShortCountdown(nextRollEtaMs) : '—';
  const isRecentlyRestored = lastRestoredAtMs !== null && nowMs - lastRestoredAtMs < 2_400;
  const heroClassName = [
    'island-run-prototype__out-of-dice-regen-hero',
    isFinalCountdown ? 'island-run-prototype__out-of-dice-regen-hero--charging' : '',
    isRecentlyRestored ? 'island-run-prototype__out-of-dice-regen-hero--restored' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="island-run-prototype__out-of-dice-regen" aria-live="polite">
      {regenState ? (
        <>
          <div className={heroClassName} key={restoredPulseId}>
            <span className="island-run-prototype__out-of-dice-regen-die" aria-hidden="true">🎲</span>
            <div className="island-run-prototype__out-of-dice-regen-hero-copy">
              <p className="island-run-prototype__out-of-dice-regen-kicker">
                {isRecentlyRestored ? 'Dice restored!' : isFinalCountdown ? 'Almost recharged…' : 'Recharging rolls'}
              </p>
              <p className="island-run-prototype__out-of-dice-regen-line island-run-prototype__out-of-dice-regen-line--hero">
                {isWaitingForStoreRefresh ? (
                  <>
                    Refreshing your dice… <strong>+1</strong> is landing now.
                  </>
                ) : hasRegen ? (
                  <>
                    {DICE_REGEN_NEXT_DICE_LABEL} <strong>{countdownLabel}</strong>
                  </>
                ) : isAtCap ? (
                  <>Dice pool is full.</>
                ) : (
                  <>Regen is checking your next roll.</>
                )}
              </p>
            </div>
          </div>
          <div
            className="island-run-prototype__out-of-dice-regen-bar"
            role="progressbar"
            aria-valuenow={Math.floor(progressPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Dice pool ${dicePool} of ${maxDice}`}
          >
            <span
              className="island-run-prototype__out-of-dice-regen-bar-fill"
              style={{ width: `${progressPct}%` }}
            />
            <span className="island-run-prototype__out-of-dice-regen-bar-label">
              {dicePool} / {maxDice}
            </span>
          </div>
          {isAtCap ? (
            <p className="island-run-prototype__out-of-dice-regen-line island-run-prototype__out-of-dice-regen-line--muted">
              Dice pool is full — but you still need <strong>{safeCost}</strong> dice for this multiplier.
            </p>
          ) : hasRegen ? (
            <p className="island-run-prototype__out-of-dice-regen-line island-run-prototype__out-of-dice-regen-line--muted">
              Next pulse adds <strong>+1</strong> die: <strong>{nextTickPool}</strong> / <strong>{maxDice}</strong>. Roll cost: <strong>{safeCost}</strong>.
            </p>
          ) : (
            <p className="island-run-prototype__out-of-dice-regen-line">
              Regen can't reach one roll — buy more or lower the multiplier.
            </p>
          )}
        </>
      ) : (
        <p className="island-run-prototype__out-of-dice-regen-line">
          Regeneration will start once your regen state is ready.
        </p>
      )}
    </div>
  );
}
