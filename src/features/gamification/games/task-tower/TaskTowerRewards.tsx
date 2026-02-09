interface TaskTowerRewardsProps {
  blocksCleared: number;
  linesCleared: number;
  coins: number;
  dice: number;
  tokens: number;
  allClear: boolean;
  onClose: () => void;
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
              <span className="task-tower-rewards__stat-value">{blocksCleared}</span>
            </div>
            
            {linesCleared > 0 && (
              <div className="task-tower-rewards__stat" style={{ animationDelay: '200ms' }}>
                <span className="task-tower-rewards__stat-label">Lines Cleared</span>
                <span className="task-tower-rewards__stat-value">{linesCleared}</span>
              </div>
            )}
            
            {coins > 0 && (
              <div className="task-tower-rewards__stat" style={{ animationDelay: '400ms' }}>
                <span className="task-tower-rewards__stat-label">Coins Earned</span>
                <span className="task-tower-rewards__stat-value">{coins} 🪙</span>
              </div>
            )}
            
            {dice > 0 && (
              <div className="task-tower-rewards__stat" style={{ animationDelay: '600ms' }}>
                <span className="task-tower-rewards__stat-label">Dice Earned</span>
                <span className="task-tower-rewards__stat-value">{dice} 🎲</span>
              </div>
            )}
            
            {tokens > 0 && (
              <div className="task-tower-rewards__stat" style={{ animationDelay: '800ms' }}>
                <span className="task-tower-rewards__stat-label">Tokens Earned</span>
                <span className="task-tower-rewards__stat-value">{tokens} 🎟️</span>
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
