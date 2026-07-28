/**
 * MinigameHudStrip.tsx — the persistent top strip every event mini-game
 * renders during its play phase.
 *
 * Layout contract (see `services/minigameHudContract.ts`): ONE row, always at
 * the top — current score at the head, the reward track carrying its
 * milestone nodes across the middle, tickets pinned upper-right.
 *
 * The node-bearing track is Island Workshop's pattern generalised: showing
 * the upcoming prizes *on* the bar is what makes the incentive legible at a
 * glance, where a bare fill just says "some progress happened". Keeping it to
 * a single row is what lets it sit above every game without stealing board
 * space on a 390px phone.
 */
import type { MinigameHudViewModel } from '../../level-worlds/services/minigameHudContract';
import './minigameHudStrip.css';

export function MinigameHudStrip({ hud, onOpenRewards }: {
  hud: MinigameHudViewModel;
  /** Optional tap-through to the game's reward panel/claim surface. */
  onOpenRewards?: () => void;
}) {
  const { tickets, reward } = hud;

  const summary = reward.nextRewardLabel !== null
    ? `Next reward: ${reward.nextRewardLabel}${reward.remainingLabel ? `, ${reward.remainingLabel}` : ''}`
    : 'All rewards earned';

  const track = (
    <span className="minigame-hud__track" role="presentation">
      <span
        className="minigame-hud__fill"
        style={{ width: `${Math.round(reward.fillRatio * 100)}%` }}
      />
      {reward.nodes.map((node) => (
        <span
          key={node.id}
          className={`minigame-hud__node minigame-hud__node--${node.state}`}
          style={{ left: `${node.positionPercent}%` }}
          title={node.label}
        >
          <span aria-hidden="true">{node.icon}</span>
        </span>
      ))}
    </span>
  );

  const body = (
    <>
      <span className="minigame-hud__points" aria-hidden="true">{reward.pointsLabel}</span>
      {track}
      {reward.openableCount > 0 && (
        <span className="minigame-hud__badge" aria-hidden="true">{reward.openableCount}</span>
      )}
    </>
  );

  return (
    <div className="minigame-hud" role="status" aria-label={`${summary}. ${tickets.count} ${tickets.noun} left.`}>
      {onOpenRewards ? (
        <button
          type="button"
          className={`minigame-hud__reward minigame-hud__reward--button${reward.openableCount > 0 ? ' minigame-hud__reward--openable' : ''}`}
          onClick={onOpenRewards}
          aria-label={reward.openableCount > 0
            ? `${reward.openableCount} reward${reward.openableCount === 1 ? '' : 's'} ready to open`
            : summary}
        >
          {body}
        </button>
      ) : (
        <div className="minigame-hud__reward">{body}</div>
      )}
      <span
        className={`minigame-hud__tickets${tickets.low ? ' minigame-hud__tickets--low' : ''}`}
        aria-hidden="true"
      >
        <span>{tickets.icon}</span>
        <strong>{tickets.count}</strong>
      </span>
    </div>
  );
}
