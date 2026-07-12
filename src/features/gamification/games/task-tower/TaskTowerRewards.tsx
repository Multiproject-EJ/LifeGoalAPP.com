import { useEffect, useState } from 'react';

interface TaskTowerRewardsProps {
  blocksCleared: number;
  linesCleared: number;
  coins: number;
  dice: number;
  tokens: number;
  allClear: boolean;
  onClose: () => void;
}

/**
 * Count a stat up from 0 to its final value with an ease-out curve.
 * Jumps straight to the final value under prefers-reduced-motion.
 */
function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target <= 0) {
      setValue(target);
      return;
    }
    if (typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

export function TaskTowerRewards({
  blocksCleared,
  linesCleared,
  coins,
  dice,
  tokens,
  allClear,
  onClose,
}: TaskTowerRewardsProps) {
  const shownBlocks = useCountUp(blocksCleared);
  const shownStoreys = useCountUp(linesCleared);
  const shownCoins = useCountUp(coins, 1100);
  const shownDice = useCountUp(dice);
  const shownTokens = useCountUp(tokens);

  return (
    <div className="task-tower-rewards">
      <div className="task-tower-rewards__backdrop" onClick={onClose} role="presentation" />

      <div className="task-tower-rewards__container">
        {allClear ? (
          <div className="task-tower-rewards__header task-tower-rewards__header--all-clear">
            <span className="task-tower-rewards__emoji">🗼</span>
            <h2 className="task-tower-rewards__title">TOWER CLEARED!</h2>
            <p className="task-tower-rewards__subtitle">All tasks complete!</p>
          </div>
        ) : (
          <div className="task-tower-rewards__header">
            <span className="task-tower-rewards__emoji">🗼</span>
            <h2 className="task-tower-rewards__title">Session Complete</h2>
          </div>
        )}

        <div className="task-tower-rewards__content">
          <div className="task-tower-rewards__stats">
            <div className="task-tower-rewards__stat" style={{ animationDelay: '0ms' }}>
              <span className="task-tower-rewards__stat-label">Blocks Cleared</span>
              <span className="task-tower-rewards__stat-value">{shownBlocks}</span>
            </div>

            {linesCleared > 0 && (
              <div className="task-tower-rewards__stat" style={{ animationDelay: '200ms' }}>
                <span className="task-tower-rewards__stat-label">Storeys Cleared</span>
                <span className="task-tower-rewards__stat-value">{shownStoreys}</span>
              </div>
            )}

            {coins > 0 && (
              <div className="task-tower-rewards__stat" style={{ animationDelay: '400ms' }}>
                <span className="task-tower-rewards__stat-label">Coins Earned</span>
                <span className="task-tower-rewards__stat-value">{shownCoins} 🪙</span>
              </div>
            )}

            {dice > 0 && (
              <div className="task-tower-rewards__stat" style={{ animationDelay: '600ms' }}>
                <span className="task-tower-rewards__stat-label">Game Dice Earned</span>
                <span className="task-tower-rewards__stat-value">{shownDice} 🎲</span>
              </div>
            )}

            {tokens > 0 && (
              <div className="task-tower-rewards__stat" style={{ animationDelay: '800ms' }}>
                <span className="task-tower-rewards__stat-label">Tokens Earned</span>
                <span className="task-tower-rewards__stat-value">{shownTokens} 🎟️</span>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          className="task-tower-rewards__button"
          onClick={onClose}
        >
          Back to Board
        </button>
      </div>
    </div>
  );
}
