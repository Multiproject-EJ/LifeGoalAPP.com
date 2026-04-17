// BoardCompleteOverlay Component
// Celebration overlay when all nodes on a board are completed

import type { WorldBoard } from '../types/levelWorlds';

interface BoardCompleteOverlayProps {
  board: WorldBoard;
  onContinue: () => void;
}

export function BoardCompleteOverlay({ board, onContinue }: BoardCompleteOverlayProps) {
  return (
    <div className="board-complete-overlay">
      <div className="board-complete-content">
        <div className="board-complete-animation">
          <span className="board-complete-icon">🏆</span>
          <div className="board-complete-sparkles">✨</div>
        </div>

        <h2 className="board-complete-title">
          {board.title} Complete!
        </h2>

        <p className="board-complete-message">
          Congratulations! You've completed Level {board.level}
        </p>

        <div className="board-complete-rewards">
          <h3>Rewards Earned</h3>
          <div className="board-complete-reward-grid">
            <div className="reward-item reward-item--large">
              <span className="reward-icon">🎲</span>
              <span className="reward-amount">{board.completionReward.dice}</span>
            </div>
            {board.completionReward.essence ? (
              <div className="reward-item reward-item--large">
                <span className="reward-icon">🟣</span>
                <span className="reward-amount">{board.completionReward.essence}</span>
              </div>
            ) : null}
            {board.completionReward.shards ? (
              <div className="reward-item reward-item--large">
                <span className="reward-icon">🔮</span>
                <span className="reward-amount">{board.completionReward.shards}</span>
              </div>
            ) : null}
            <div className="reward-item reward-item--large">
              <span className="reward-icon">⭐</span>
              <span className="reward-amount">{board.completionReward.xp} XP</span>
            </div>
          </div>

          {board.completionReward.title && (
            <div className="board-complete-title-unlock">
              <span>🎖️ Title Unlocked: {board.completionReward.title}</span>
            </div>
          )}

          {board.completionReward.cosmetic && (
            <div className="board-complete-cosmetic-unlock">
              <span>✨ Cosmetic Unlocked!</span>
            </div>
          )}
        </div>

        <button
          className="board-complete-button"
          onClick={onContinue}
        >
          Continue to Next World
        </button>
      </div>
    </div>
  );
}
