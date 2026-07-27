/**
 * MinigameHudStrip.tsx — the persistent top strip every event mini-game
 * renders during its play phase.
 *
 * Layout contract (see `services/minigameHudContract.ts`): reward progress
 * and the next exact prize span the strip; the ticket count is pinned to the
 * upper-right. Same order, same corner, in all four games, so the player's
 * eyes never have to re-learn a surface.
 */
import type { MinigameHudViewModel } from '../../level-worlds/services/minigameHudContract';
import './minigameHudStrip.css';

export function MinigameHudStrip({ hud, onOpenRewards }: {
  hud: MinigameHudViewModel;
  /** Optional tap-through to the game's reward panel/claim surface. */
  onOpenRewards?: () => void;
}) {
  const { tickets, reward } = hud;
  const rewardBody = (
    <>
      <div className="minigame-hud__reward-top">
        <span className="minigame-hud__reward-next">
          {reward.nextRewardLabel !== null ? (
            <>Next: <strong>{reward.nextRewardLabel}</strong></>
          ) : (
            'All rewards earned'
          )}
        </span>
        {reward.remainingLabel !== null && (
          <span className="minigame-hud__reward-remaining">{reward.remainingLabel}</span>
        )}
      </div>
      <div className="minigame-hud__reward-track" role="presentation">
        <div
          className="minigame-hud__reward-fill"
          style={{ width: `${Math.round(reward.fillRatio * 100)}%` }}
        />
      </div>
    </>
  );

  return (
    <div className="minigame-hud" role="status" aria-label="Event progress and tickets">
      {onOpenRewards ? (
        <button
          type="button"
          className={`minigame-hud__reward minigame-hud__reward--button${reward.openableCount > 0 ? ' minigame-hud__reward--openable' : ''}`}
          onClick={onOpenRewards}
          aria-label={reward.openableCount > 0
            ? `${reward.openableCount} reward${reward.openableCount === 1 ? '' : 's'} ready to open`
            : 'View reward progress'}
        >
          {rewardBody}
          {reward.openableCount > 0 && (
            <span className="minigame-hud__reward-badge" aria-hidden="true">{reward.openableCount}</span>
          )}
        </button>
      ) : (
        <div className="minigame-hud__reward">{rewardBody}</div>
      )}
      <span
        className={`minigame-hud__tickets${tickets.low ? ' minigame-hud__tickets--low' : ''}`}
        aria-label={`${tickets.count} ${tickets.noun} remaining`}
      >
        <span aria-hidden="true">{tickets.icon}</span>
        <strong>{tickets.count}</strong>
      </span>
    </div>
  );
}
