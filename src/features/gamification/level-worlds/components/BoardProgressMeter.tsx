/**
 * BoardProgressMeter — reward-bar / progress-meter for the contract board renderer.
 *
 * Adapted from the board-repo ProgressMeter.tsx presentation target.
 * Pure presentation: receives contract rewardBar snapshot + onClaimIntent callback.
 * Emits only `claim_reward_requested` intent via the provided callback.
 * No gameplay truth — all values come from the BoardRendererContractV1 contract.
 */

import type { BoardRendererContractV1, BoardRendererContractV1Intent } from '../services/islandRunBoardRendererContractV1';

// ─── types ────────────────────────────────────────────────────────────────────

export interface BoardProgressMeterProps {
  rewardBar: BoardRendererContractV1['rewardBar'];
  event: BoardRendererContractV1['event'];
  busyClaim: boolean;
  canClaim: boolean;
  onIntent: (intent: BoardRendererContractV1Intent) => void;
}

// ─── component ───────────────────────────────────────────────────────────────

export function BoardProgressMeter({
  rewardBar,
  event,
  busyClaim,
  canClaim,
  onIntent,
}: BoardProgressMeterProps) {
  const { progress, nextThreshold, tier, isClaimable } = rewardBar;
  const pct = nextThreshold > 0 ? Math.min(100, (progress / nextThreshold) * 100) : 0;
  const isMilestone = isClaimable;

  return (
    <div
      className={`board-progress-meter${isMilestone ? ' board-progress-meter--milestone' : ''}`}
      aria-label={`Reward progress: ${progress} of ${nextThreshold}`}
    >
      {/* label row */}
      <div className="board-progress-meter__label-row">
        <span className="board-progress-meter__title" aria-hidden="true">
          {event.active ? (
            <>⏳ <span>{event.label}</span></>
          ) : (
            <>⭐ <span>Reward bar</span></>
          )}
        </span>

        <span className="board-progress-meter__tier" aria-label={`Tier ${tier}`}>
          Tier {tier}
        </span>

        <span
          className="board-progress-meter__count"
          aria-live="polite"
          aria-atomic="true"
        >
          {progress}<span className="board-progress-meter__sep">/</span>{nextThreshold}
        </span>
      </div>

      {/* progress track */}
      <div className="board-progress-meter__track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={nextThreshold}>
        <div
          className={`board-progress-meter__fill${isMilestone ? ' board-progress-meter__fill--full' : ''}`}
          style={{ width: `${pct}%` }}
        />
        {/* milestone glow overlay */}
        {isMilestone && <div className="board-progress-meter__glow" aria-hidden="true" />}
      </div>

      {/* claim button — only shown when reward is claimable */}
      {isClaimable && (
        <button
          type="button"
          className="board-progress-meter__claim-btn"
          disabled={!canClaim || busyClaim}
          aria-label="Claim reward bar"
          onClick={() => onIntent({ type: 'claim_reward_requested' })}
        >
          {busyClaim ? 'Claiming…' : '🎁 Claim Reward'}
        </button>
      )}
    </div>
  );
}
