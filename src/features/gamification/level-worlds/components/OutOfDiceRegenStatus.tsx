import { useEffect, useState } from 'react';

import {
  resolveFullRefillEtaMs,
  resolveNextRollEtaMs,
  type DiceRegenState,
} from '../services/islandRunDiceRegeneration';

/**
 * OutOfDiceRegenStatus — live-updating regen feedback for the out-of-dice
 * modal (and any other "empty dice" empty-state UI).
 *
 * Renders:
 *   - A progress bar showing `dicePool / maxDice`
 *   - "Next roll in MM:SS" countdown (clamps to 0 once reached)
 *   - "Full refill in HH:MM" secondary line
 *
 * Uses the pure `resolveNextRollEtaMs` / `resolveFullRefillEtaMs` helpers so
 * the math stays testable. A 1s interval re-renders the countdown while this
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

function formatLongCountdown(ms: number): string {
  if (!Number.isFinite(ms)) return '—';
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

export function OutOfDiceRegenStatus(props: OutOfDiceRegenStatusProps) {
  const { dicePool, diceCostPerRoll, regenState } = props;
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    // Only tick while we have a regen state and haven't fully refilled — the
    // interval is cheap but unnecessary in the terminal states.
    if (!regenState) return;
    if (dicePool >= regenState.maxDice) return;
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [regenState, dicePool]);

  const safeCost = Math.max(1, Math.floor(diceCostPerRoll) || 1);
  const nextRollEtaMs = resolveNextRollEtaMs({
    dicePool,
    target: safeCost,
    regenState,
    nowMs,
  });
  const fullRefillEtaMs = resolveFullRefillEtaMs({
    dicePool,
    regenState,
    nowMs,
  });

  const maxDice = regenState?.maxDice ?? 0;
  const progressPct = maxDice > 0
    ? Math.min(100, Math.max(0, (dicePool / maxDice) * 100))
    : 0;
  const hasRegen = Boolean(regenState) && Number.isFinite(nextRollEtaMs);
  const isAtCap = Boolean(regenState) && dicePool >= maxDice;

  return (
    <div className="island-run-prototype__out-of-dice-regen" aria-live="polite">
      {regenState ? (
        <>
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
            <p className="island-run-prototype__out-of-dice-regen-line">
              Dice pool is full — but you still need <strong>{safeCost}</strong> to roll.
            </p>
          ) : hasRegen ? (
            <>
              <p className="island-run-prototype__out-of-dice-regen-line">
                Next roll ready in <strong>{formatShortCountdown(nextRollEtaMs)}</strong>
              </p>
              <p className="island-run-prototype__out-of-dice-regen-line island-run-prototype__out-of-dice-regen-line--muted">
                Full refill in {formatLongCountdown(fullRefillEtaMs)}
              </p>
            </>
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
